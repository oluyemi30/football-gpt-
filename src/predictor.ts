import { getTeamStats, getHeadToHead } from './dataService';
import { PredictionResult } from './types';

// Converts form letters (e.g. "WWWLD") to numerical point averages
function parseFormPoints(form: string): number {
  if (!form) return 5; // standard middle
  let pts = 0;
  for (const char of form) {
    if (char === 'W') pts += 3;
    else if (char === 'D') pts += 1;
  }
  return pts;
}

export function calculatePrediction(homeId: string, awayId: string): PredictionResult {
  const homeStats = getTeamStats(homeId);
  const awayStats = getTeamStats(awayId);
  const h2h = getHeadToHead(homeId, awayId);

  // 1. Set default base stats if records are not found
  const h = homeStats || {
    winRate: 50,
    drawRate: 25,
    averageGoalsScored5: 1.5,
    averageGoalsConceded5: 1.2,
    averageGoalsScored10: 1.5,
    averageGoalsConceded10: 1.3,
    recentForm: 'WDLWD',
    leaguePosition: 5,
    totalInjuries: 2
  };

  const a = awayStats || {
    winRate: 50,
    drawRate: 25,
    averageGoalsScored5: 1.5,
    averageGoalsConceded5: 1.2,
    averageGoalsScored10: 1.5,
    averageGoalsConceded10: 1.3,
    recentForm: 'WDLWD',
    leaguePosition: 5,
    totalInjuries: 2
  };

  // Convert forms
  const homeFormPts = parseFormPoints(h.recentForm); // Max 15
  const awayFormPts = parseFormPoints(a.recentForm); // Max 15

  // 2. Compute Home and Away baseline attack-defense potential
  // Attack vs Defense ratios
  let homeAttackScore = (h.averageGoalsScored5 * 0.6) + (h.averageGoalsScored10 * 0.4);
  let homeDefenseScore = (h.averageGoalsConceded5 * 0.6) + (h.averageGoalsConceded10 * 0.4);

  let awayAttackScore = (a.averageGoalsScored5 * 0.6) + (a.averageGoalsScored10 * 0.4);
  let awayDefenseScore = (a.averageGoalsConceded5 * 0.6) + (a.averageGoalsConceded10 * 0.4);

  // Recent form scale (relative weights)
  let homeFormWeight = homeFormPts / 15;
  let awayFormWeight = awayFormPts / 15;

  // 3. Score components
  let homeCalculatedStrength = 
    (homeAttackScore * 4.0) - 
    (awayDefenseScore * 1.5) + 
    (h.winRate / 10) + 
    (homeFormWeight * 5.0) +
    (15 / h.leaguePosition); // standing reward

  let awayCalculatedStrength = 
    (awayAttackScore * 4.0) - 
    (homeDefenseScore * 1.5) + 
    (a.winRate / 10) + 
    (awayFormWeight * 5.0) +
    (15 / a.leaguePosition);

  // 4. Apply Home Advantage (historically +3.5 to +6.5 points bias depending on team quality)
  const HOME_ADVANTAGE_MULTIPLIER = 1.15; // 15% boost to home attack
  homeCalculatedStrength *= HOME_ADVANTAGE_MULTIPLIER;

  // 5. Account for head-to-head records
  if (h2h.matchesPlayed > 0) {
    const winsArate = h2h.winsA / h2h.matchesPlayed;
    const winsBrate = h2h.winsB / h2h.matchesPlayed;
    
    if (h2h.teamA === homeId) {
      homeCalculatedStrength += winsArate * 3.5;
      awayCalculatedStrength += winsBrate * 3.5;
    } else {
      homeCalculatedStrength += winsBrate * 3.5;
      awayCalculatedStrength += winsArate * 3.5;
    }
  }

  // 6. Handle Injury impact
  if (h.totalInjuries && h.totalInjuries > 2) {
    homeCalculatedStrength -= (h.totalInjuries * 0.25);
  }
  if (a.totalInjuries && a.totalInjuries > 2) {
    awayCalculatedStrength -= (a.totalInjuries * 0.25);
  }

  // Prevent values from going negative
  homeCalculatedStrength = Math.max(1.0, homeCalculatedStrength);
  awayCalculatedStrength = Math.max(1.0, awayCalculatedStrength);

  // 7. Establish dynamic Draw factor based on leagues/team averages
  const avgDrawRate = ((h.drawRate + a.drawRate) / 2) || 24;
  let drawBaseProbability = avgDrawRate / 100; // Let's say 24% (0.24) or so

  // If teams are mathematically very close, increase draw chance
  const strengthDiff = Math.abs(homeCalculatedStrength - awayCalculatedStrength);
  const similarityFactor = Math.exp(-strengthDiff / 4); // higher when close
  
  // Calculate final draw probability
  const drawProb = Math.max(0.15, Math.min(0.40, drawBaseProbability + (similarityFactor * 0.15)));

  // Remaining probability is split between Home and Away Win based on relative strength
  const remainingProb = 1.0 - drawProb;
  const totalRelativeStrength = homeCalculatedStrength + awayCalculatedStrength;
  
  const homeProb = (homeCalculatedStrength / totalRelativeStrength) * remainingProb;
  const awayProb = (awayCalculatedStrength / totalRelativeStrength) * remainingProb;

  // 8. Format into clean percentages sum to exactly 100
  let homeWinPct = Math.round(homeProb * 100);
  let DrawPct = Math.round(drawProb * 100);
  let awayWinPct = Math.round(awayProb * 100);

  // Adjust mathematically to sum to exactly 100%
  const difference = 100 - (homeWinPct + DrawPct + awayWinPct);
  if (difference !== 0) {
    // Apply correction to the largest probability
    if (homeWinPct >= DrawPct && homeWinPct >= awayWinPct) {
      homeWinPct += difference;
    } else if (awayWinPct >= homeWinPct && awayWinPct >= DrawPct) {
      awayWinPct += difference;
    } else {
      DrawPct += difference;
    }
  }

  return {
    homeWin: homeWinPct,
    draw: DrawPct,
    awayWin: awayWinPct,
  };
}
