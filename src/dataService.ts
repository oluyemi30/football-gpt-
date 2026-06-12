import { readDb, saveDb, TEAMS } from './db';
import { MatchFixture, TeamStats, HeadToHead, Standing } from './types';

export function getTodayMatches(): MatchFixture[] {
  const db = readDb();
  const todayStr = new Date().toISOString().split('T')[0];
  return db.fixtures.filter(f => f.date === todayStr);
}

export function getTeamStats(teamId: string): TeamStats | undefined {
  const db = readDb();
  return db.teamStats[teamId];
}

export function getRecentForm(teamId: string): string {
  const stats = getTeamStats(teamId);
  return stats ? stats.recentForm : 'DDDDD';
}

export function getHeadToHead(teamA: string, teamB: string): HeadToHead {
  const db = readDb();
  // Try to find matching head to head record
  const match = db.headToHeads.find(
    h => (h.teamA === teamA && h.teamB === teamB) || (h.teamA === teamB && h.teamB === teamA)
  );

  if (match) {
    return match;
  }

  // Fallback head-to-head record
  return {
    teamA,
    teamB,
    matchesPlayed: 4,
    winsA: 1,
    winsB: 1,
    draws: 2,
    lastMatches: [
      { date: '2025-05-01', score: '1-1', winner: 'draw' },
      { date: '2024-03-12', score: '0-0', winner: 'draw' }
    ]
  };
}

export function getAllStandings(): Standing[] {
  const db = readDb();
  return db.standings;
}

export function createNewFixture(homeId: string, awayId: string, league: string, time: string): MatchFixture {
  const db = readDb();
  const todayStr = new Date().toISOString().split('T')[0];
  
  const homeTeam = TEAMS[homeId] || { id: homeId, name: `Team ${homeId}`, shortName: 'TEM' };
  const awayTeam = TEAMS[awayId] || { id: awayId, name: `Team ${awayId}`, shortName: 'TEM' };

  const id = `f_${Date.now()}`;
  const newFixture: MatchFixture = {
    id,
    date: todayStr,
    time,
    homeTeam,
    awayTeam,
    league,
    status: 'scheduled'
  };

  db.fixtures.push(newFixture);
  saveDb(db);
  return newFixture;
}
