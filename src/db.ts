import fs from 'fs';
import path from 'path';
import { 
  Standing, 
  TeamStats, 
  HeadToHead, 
  MatchFixture, 
  SavedPrediction, 
  AccuracyMetrics,
  Team
} from './types';

const DB_FILE = path.join(process.cwd(), 'db.json');

// Predefined teams to use
export const TEAMS: Record<string, Team> = {
  '1': { id: '1', name: 'Argentina', shortName: 'ARG', confederation: 'CONMEBOL (South America)', emoji: '🇦🇷' },
  '2': { id: '2', name: 'France', shortName: 'FRA', confederation: 'UEFA (Europe)', emoji: '🇫🇷' },
  '3': { id: '3', name: 'Brazil', shortName: 'BRA', confederation: 'CONMEBOL (South America)', emoji: '🇧🇷' },
  '4': { id: '4', name: 'England', shortName: 'ENG', confederation: 'UEFA (Europe)', emoji: '🇬🇧' },
  '5': { id: '5', name: 'Spain', shortName: 'ESP', confederation: 'UEFA (Europe)', emoji: '🇪🇸' },
  '6': { id: '6', name: 'Germany', shortName: 'GER', confederation: 'UEFA (Europe)', emoji: '🇩🇪' },
  '7': { id: '7', name: 'Portugal', shortName: 'POR', confederation: 'UEFA (Europe)', emoji: '🇵🇹' },
  '8': { id: '8', name: 'Netherlands', shortName: 'NED', confederation: 'UEFA (Europe)', emoji: '🇳🇱' },
  '9': { id: '9', name: 'Senegal', shortName: 'SEN', confederation: 'CAF (Africa)', emoji: '🇸🇳' },
  '10': { id: '10', name: 'Morocco', shortName: 'MAR', confederation: 'CAF (Africa)', emoji: '🇲🇦' },
  '11': { id: '11', name: 'United States', shortName: 'USA', confederation: 'CONCACAF (North/Central America)', emoji: '🇺🇸' },
  '12': { id: '12', name: 'Canada', shortName: 'CAN', confederation: 'CONCACAF (North/Central America)', emoji: '🇨🇦' },
  '13': { id: '13', name: 'Mexico', shortName: 'MEX', confederation: 'CONCACAF (North/Central America)', emoji: '🇲🇽' },
  '14': { id: '14', name: 'Australia', shortName: 'AUS', confederation: 'AFC (Asia)', emoji: '🇦🇺' },
  '15': { id: '15', name: 'Iran', shortName: 'IRN', confederation: 'AFC (Asia)', emoji: '🇮🇷' },
  '16': { id: '16', name: 'Iraq', shortName: 'IRQ', confederation: 'AFC (Asia)', emoji: '🇮🇶' },
  '17': { id: '17', name: 'Japan', shortName: 'JPN', confederation: 'AFC (Asia)', emoji: '🇯🇵' },
  '18': { id: '18', name: 'Jordan', shortName: 'JOR', confederation: 'AFC (Asia)', emoji: '🇯🇴' },
  '19': { id: '19', name: 'South Korea', shortName: 'KOR', confederation: 'AFC (Asia)', emoji: '🇰🇷' },
  '20': { id: '20', name: 'Qatar', shortName: 'QAT', confederation: 'AFC (Asia)', emoji: '🇶🇦' },
  '21': { id: '21', name: 'Saudi Arabia', shortName: 'KSA', confederation: 'AFC (Asia)', emoji: '🇸🇦' },
  '22': { id: '22', name: 'Uzbekistan', shortName: 'UZB', confederation: 'AFC (Asia)', emoji: '🇺🇿' },
  '23': { id: '23', name: 'Algeria', shortName: 'ALG', confederation: 'CAF (Africa)', emoji: '🇩🇿' },
  '24': { id: '24', name: 'Cabo Verde', shortName: 'CPV', confederation: 'CAF (Africa)', emoji: '🇨🇻' },
  '25': { id: '25', name: 'DR Congo', shortName: 'COD', confederation: 'CAF (Africa)', emoji: '🇨🇩' },
  '26': { id: '26', name: 'Côte d’Ivoire', shortName: 'CIV', confederation: 'CAF (Africa)', emoji: '🇨🇮' },
  '27': { id: '27', name: 'Egypt', shortName: 'EGY', confederation: 'CAF (Africa)', emoji: '🇪🇬' },
  '28': { id: '28', name: 'Ghana', shortName: 'GHA', confederation: 'CAF (Africa)', emoji: '🇬🇭' },
  '29': { id: '29', name: 'South Africa', shortName: 'RSA', confederation: 'CAF (Africa)', emoji: '🇿🇦' },
  '30': { id: '30', name: 'Tunisia', shortName: 'TUN', confederation: 'CAF (Africa)', emoji: '🇹🇳' },
  '31': { id: '31', name: 'Curaçao', shortName: 'CUW', confederation: 'CONCACAF (North/Central America)', emoji: '🇨🇼' },
  '32': { id: '32', name: 'Haiti', shortName: 'HAI', confederation: 'CONCACAF (North/Central America)', emoji: '🇭🇹' },
  '33': { id: '33', name: 'Panama', shortName: 'PAN', confederation: 'CONCACAF (North/Central America)', emoji: '🇵🇦' },
  '34': { id: '34', name: 'Colombia', shortName: 'COL', confederation: 'CONMEBOL (South America)', emoji: '🇨🇴' },
  '35': { id: '35', name: 'Ecuador', shortName: 'ECU', confederation: 'CONMEBOL (South America)', emoji: '🇪🇨' },
  '36': { id: '36', name: 'Paraguay', shortName: 'PAR', confederation: 'CONMEBOL (South America)', emoji: '🇵🇾' },
  '37': { id: '37', name: 'Uruguay', shortName: 'URU', confederation: 'CONMEBOL (South America)', emoji: '🇺🇾' },
  '38': { id: '38', name: 'New Zealand', shortName: 'NZL', confederation: 'OFC (Oceania)', emoji: '🇳🇿' },
  '39': { id: '39', name: 'Austria', shortName: 'AUT', confederation: 'UEFA (Europe)', emoji: '🇦🇹' },
  '40': { id: '40', name: 'Belgium', shortName: 'BEL', confederation: 'UEFA (Europe)', emoji: '🇧🇪' },
  '41': { id: '41', name: 'Bosnia and Herzegovina', shortName: 'BIH', confederation: 'UEFA (Europe)', emoji: '🇧🇦' },
  '42': { id: '42', name: 'Croatia', shortName: 'CRO', confederation: 'UEFA (Europe)', emoji: '🇭🇷' },
  '43': { id: '43', name: 'Czechia', shortName: 'CZE', confederation: 'UEFA (Europe)', emoji: '🇨🇿' },
  '44': { id: '44', name: 'Norway', shortName: 'NOR', confederation: 'UEFA (Europe)', emoji: '🇳🇴' },
  '45': { id: '45', name: 'Scotland', shortName: 'SCO', confederation: 'UEFA (Europe)', emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  '46': { id: '46', name: 'Sweden', shortName: 'SWE', confederation: 'UEFA (Europe)', emoji: '🇸🇪' },
  '47': { id: '47', name: 'Switzerland', shortName: 'SUI', confederation: 'UEFA (Europe)', emoji: '🇨🇭' },
  '48': { id: '48', name: 'Türkiye', shortName: 'TUR', confederation: 'UEFA (Europe)', emoji: '🇹🇷' }
};

interface DbSchema {
  standings: Standing[];
  teamStats: Record<string, TeamStats>;
  headToHeads: HeadToHead[];
  fixtures: MatchFixture[];
  predictions: SavedPrediction[];
}

const defaultDb: DbSchema = {
  standings: [
    { rank: 1, teamId: '1', teamName: 'Argentina', played: 5, won: 4, drawn: 1, lost: 0, goalsFor: 12, goalsAgainst: 4, points: 13, form: 'WWWDW' },
    { rank: 2, teamId: '2', teamName: 'France', played: 5, won: 4, drawn: 0, lost: 1, goalsFor: 11, goalsAgainst: 5, points: 12, form: 'WLWWW' },
    { rank: 3, teamId: '3', teamName: 'Brazil', played: 5, won: 3, drawn: 2, lost: 0, goalsFor: 10, goalsAgainst: 3, points: 11, form: 'WWDDW' },
    { rank: 4, teamId: '4', teamName: 'England', played: 5, won: 3, drawn: 1, lost: 1, goalsFor: 9, goalsAgainst: 4, points: 10, form: 'LWWWD' },
    { rank: 5, teamId: '5', teamName: 'Spain', played: 5, won: 3, drawn: 1, lost: 1, goalsFor: 10, goalsAgainst: 5, points: 10, form: 'WDLWW' },
    { rank: 6, teamId: '7', teamName: 'Portugal', played: 5, won: 3, drawn: 0, lost: 2, goalsFor: 8, goalsAgainst: 6, points: 9, form: 'WWWLW' },
    { rank: 7, teamId: '8', teamName: 'Netherlands', played: 5, won: 2, drawn: 2, lost: 1, goalsFor: 7, goalsAgainst: 5, points: 8, form: 'WDLWD' },
    { rank: 8, teamId: '10', teamName: 'Morocco', played: 5, won: 2, drawn: 2, lost: 1, goalsFor: 5, goalsAgainst: 4, points: 8, form: 'LLDWD' },
    { rank: 9, teamId: '6', teamName: 'Germany', played: 5, won: 2, drawn: 1, lost: 2, goalsFor: 8, goalsAgainst: 7, points: 7, form: 'WDWLW' },
    { rank: 10, teamId: '9', teamName: 'Senegal', played: 5, won: 1, drawn: 2, lost: 2, goalsFor: 4, goalsAgainst: 6, points: 5, form: 'LDWLD' },
  ],
  teamStats: {
    '1': { teamId: '1', winRate: 80, drawRate: 20, averageGoalsScored5: 2.4, averageGoalsConceded5: 0.8, averageGoalsScored10: 2.3, averageGoalsConceded10: 0.7, recentForm: 'WWWDW', leaguePosition: 1, totalInjuries: 1 },
    '2': { teamId: '2', winRate: 80, drawRate: 0, averageGoalsScored5: 2.2, averageGoalsConceded5: 1.0, averageGoalsScored10: 2.1, averageGoalsConceded10: 0.9, recentForm: 'WLWWW', leaguePosition: 2, totalInjuries: 2 },
    '3': { teamId: '3', winRate: 60, drawRate: 40, averageGoalsScored5: 2.0, averageGoalsConceded5: 0.6, averageGoalsScored10: 1.9, averageGoalsConceded10: 0.7, recentForm: 'WWDDW', leaguePosition: 3, totalInjuries: 1 },
    '4': { teamId: '4', winRate: 60, drawRate: 20, averageGoalsScored5: 1.8, averageGoalsConceded5: 0.8, averageGoalsScored10: 1.9, averageGoalsConceded10: 1.0, recentForm: 'LWWWD', leaguePosition: 4, totalInjuries: 3 },
    '5': { teamId: '5', winRate: 60, drawRate: 20, averageGoalsScored5: 2.0, averageGoalsConceded5: 1.0, averageGoalsScored10: 2.1, averageGoalsConceded10: 1.1, recentForm: 'WDLWW', leaguePosition: 5, totalInjuries: 2 },
    '6': { teamId: '6', winRate: 40, drawRate: 20, averageGoalsScored5: 1.6, averageGoalsConceded5: 1.4, averageGoalsScored10: 1.5, averageGoalsConceded10: 1.5, recentForm: 'WDWLW', leaguePosition: 9, totalInjuries: 3 },
    '7': { teamId: '7', winRate: 60, drawRate: 0, averageGoalsScored5: 1.6, averageGoalsConceded5: 1.2, averageGoalsScored10: 1.7, averageGoalsConceded10: 1.3, recentForm: 'WWWLW', leaguePosition: 6, totalInjuries: 2 },
    '8': { teamId: '8', winRate: 40, drawRate: 40, averageGoalsScored5: 1.4, averageGoalsConceded5: 1.0, averageGoalsScored10: 1.5, averageGoalsConceded10: 1.1, recentForm: 'WDLWD', leaguePosition: 7, totalInjuries: 1 },
    '9': { teamId: '9', winRate: 20, drawRate: 40, averageGoalsScored5: 0.8, averageGoalsConceded5: 1.2, averageGoalsScored10: 1.0, averageGoalsConceded10: 1.3, recentForm: 'LDWLD', leaguePosition: 10, totalInjuries: 4 },
    '10': { teamId: '10', winRate: 40, drawRate: 40, averageGoalsScored5: 1.0, averageGoalsConceded5: 0.8, averageGoalsScored10: 1.1, averageGoalsConceded10: 0.9, recentForm: 'LLDWD', leaguePosition: 8, totalInjuries: 2 },
  },
  headToHeads: [
    { teamA: '1', teamB: '2', matchesPlayed: 6, winsA: 3, winsB: 2, draws: 1, lastMatches: [{ date: '2022-12-18', score: '3-3', winner: 'draw' }, { date: '2018-06-30', score: '3-4', winner: 'away' }] },
    { teamA: '3', teamB: '6', matchesPlayed: 8, winsA: 4, winsB: 3, draws: 1, lastMatches: [{ date: '2014-07-08', score: '1-7', winner: 'away' }, { date: '2002-06-30', score: '2-0', winner: 'home' }] },
    { teamA: '4', teamB: '9', matchesPlayed: 3, winsA: 2, winsB: 0, draws: 1, lastMatches: [{ date: '2022-12-04', score: '3-0', winner: 'home' }] },
    { teamA: '5', teamB: '7', matchesPlayed: 5, winsA: 1, winsB: 1, draws: 3, lastMatches: [{ date: '2018-06-15', score: '3-3', winner: 'draw' }] },
  ],
  fixtures: [
    { id: 'f_1', date: new Date().toISOString().split('T')[0], time: '14:00', homeTeam: TEAMS['1'], awayTeam: TEAMS['2'], league: 'FIFA World Cup', status: 'scheduled' },
    { id: 'f_2', date: new Date().toISOString().split('T')[0], time: '17:00', homeTeam: TEAMS['3'], awayTeam: TEAMS['6'], league: 'FIFA World Cup', status: 'scheduled' },
    { id: 'f_3', date: new Date().toISOString().split('T')[0], time: '20:00', homeTeam: TEAMS['5'], awayTeam: TEAMS['7'], league: 'FIFA World Cup', status: 'scheduled' },
    { id: 'f_4', date: new Date().toISOString().split('T')[0], time: '22:00', homeTeam: TEAMS['4'], awayTeam: TEAMS['9'], league: 'FIFA World Cup', status: 'scheduled' },
    { id: 'f_5', date: new Date().toISOString().split('T')[0], time: '23:30', homeTeam: TEAMS['8'], awayTeam: TEAMS['10'], league: 'FIFA World Cup', status: 'scheduled' },
  ],
  predictions: [
    {
      id: 'p_h_1',
      matchId: 'f_h_1',
      matchDate: '2026-06-11',
      homeTeam: TEAMS['1'],
      awayTeam: TEAMS['2'],
      league: 'FIFA World Cup',
      prediction: { homeWin: 45, draw: 30, awayWin: 25 },
      confidence: 'medium',
      status: 'resolved',
      actualResult: 'home',
      actualScore: { home: 3, away: 2 },
      isAccurate: true,
      analysis: {
        prediction: { homeWin: 45, draw: 30, awayWin: 25 },
        confidence: 'medium',
        reasoning: ['Argentina has an 80% domestic/major-tournament win rate', 'France recent games show robust scoring but slight defensive gaps due to injury', 'Head-to-head records are closely contested, featuring their iconic historical matches'],
        keyInsight: 'Argentina matches up heavily with offensive flair, and the current predictive index edges them slightly ahead of France.'
      },
      socialPack: {
        twitter: "⚽ FootballGPT World Cup Predictor\n\n🇦🇷 Argentina vs 🇫🇷 France\n🥇 ARG Win: 45%\n🤝 Draw: 30%\n🔥 FRA Win: 25%\n\nKey Insight:\nTwo titans clash! The model favors Argentina marginally. Do you agree? #FifaWorld Cup #FootballGPT",
        linkedin: "⚽ FIFA World Cup Match Analysis\n\nOur computational model predicts Argentina having a 45% probability of winning against France. Expected goals ratio points to high activity.\n\n#WorldCup #SportsAnalytics #FootballGPT",
        whatsapp: "⚽ FootballGPT World Cup Prediction:\nArgentina vs France: 45% Home Win probability.",
        tiktok: "💥 FIFA World champions predict! Today we analyzed Argentina vs France, and our model outputs 45% home win!"
      }
    },
    {
      id: 'p_h_2',
      matchId: 'f_h_2',
      matchDate: '2026-06-10',
      homeTeam: TEAMS['3'],
      awayTeam: TEAMS['6'],
      league: 'FIFA World Cup',
      prediction: { homeWin: 52, draw: 25, awayWin: 23 },
      confidence: 'high',
      status: 'resolved',
      actualResult: 'home',
      actualScore: { home: 2, away: 1 },
      isAccurate: true
    },
    {
      id: 'p_h_3',
      matchId: 'f_h_3',
      matchDate: '2026-06-09',
      homeTeam: TEAMS['5'],
      awayTeam: TEAMS['7'],
      league: 'FIFA World Cup',
      prediction: { homeWin: 35, draw: 35, awayWin: 30 },
      confidence: 'low',
      status: 'resolved',
      actualResult: 'draw',
      actualScore: { home: 1, away: 1 },
      isAccurate: true
    }
  ]
};

export function readDb(): DbSchema {
  if (!fs.existsSync(DB_FILE)) {
    saveDb(defaultDb);
    return defaultDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading db", e);
    return defaultDb;
  }
}

export function saveDb(data: DbSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Error writing db", e);
  }
}

// Quick helper to fetch accuracy metrics over time
export function getAccuracyMetrics(): AccuracyMetrics {
  const db = readDb();
  const resolved = db.predictions.filter(p => p.status === 'resolved');
  const correct = resolved.filter(p => p.isAccurate);
  
  const byLeague: Record<string, { total: number; correct: number }> = {};
  resolved.forEach(p => {
    if (!byLeague[p.league]) {
      byLeague[p.league] = { total: 0, correct: 0 };
    }
    byLeague[p.league].total += 1;
    if (p.isAccurate) {
      byLeague[p.league].correct += 1;
    }
  });

  const totCount = db.predictions.length;
  const resCount = resolved.length;
  const corCount = correct.length;
  const rate = resCount > 0 ? Number(((corCount / resCount) * 100).toFixed(1)) : 0;
  
  // Calculate average confidence rate of prediction
  const averageConfidenceRate = 72; // default heuristic placeholder

  return {
    totalPredictions: totCount,
    resolvedCount: resCount,
    correctCount: corCount,
    accuracyRate: rate,
    averageConfidenceRate,
    byLeague
  };
}
