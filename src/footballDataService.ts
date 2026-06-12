import { readDb, saveDb, TEAMS } from './db';
import { MatchFixture, Standing, Team } from './types';

// Fallback to the API key provided by the user
const API_KEY = process.env.FOOTBALL_DATA_API_KEY || '77e36bd6dc4a422999a39c0aaf88eea7';
const BASE_URL = 'https://api.football-data.org/v4';

/**
 * Fetch and synchronize league standings and teams from football-data.org
 * Supported leagues: PL (English Premier League), PD (Spanish La Liga), SA (Italian Serie A), BL1 (Bundesliga), FL1 (Ligue 1), etc.
 */
export async function syncStandingsFromApi(leagueCode = 'PL'): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log(`[Football-Data API] Syncing standings for competition: ${leagueCode}...`);
    const response = await fetch(`${BASE_URL}/competitions/${leagueCode}/standings`, {
      headers: {
        'X-Auth-Token': API_KEY
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API response status ${response.status}: ${text}`);
    }

    const data = await response.json();
    if (!data.standings || data.standings.length === 0) {
      throw new Error(`No standings data returned for ${leagueCode}`);
    }

    // Find TOTAL standings type
    const mainStanding = data.standings.find((s: any) => s.type === 'TOTAL') || data.standings[0];
    if (!mainStanding || !mainStanding.table) {
      throw new Error(`Standings table not found for ${leagueCode}`);
    }

    const db = readDb();
    const updatedStandings: Standing[] = [];

    // Map each table row to our local shape
    for (const row of mainStanding.table) {
      const teamId = String(row.team.id);
      const teamName = row.team.shortName || row.team.name;
      const tla = row.team.tla || row.team.shortName?.slice(0, 3).toUpperCase() || 'TBD';

      // Registered team entity
      const teamObj: Team = {
        id: teamId,
        name: row.team.name,
        shortName: tla,
        logoUrl: row.team.crest
      };

      // Add or update to TEAMS globally inside db
      TEAMS[teamId] = teamObj;

      // Map standing details
      updatedStandings.push({
        rank: row.position,
        teamId: teamId,
        teamName: teamName,
        played: row.playedGames || 0,
        won: row.won || 0,
        drawn: row.draw || 0,
        lost: row.lost || 0,
        goalsFor: row.goalsFor || 0,
        goalsAgainst: row.goalsAgainst || 0,
        points: row.points || 0,
        form: row.form ? row.form.replace(/,/g, '').slice(0, 5) : 'DDDDD'
      });

      // Update teamStats helper fields to keep analytical model relevant
      if (!db.teamStats[teamId]) {
        db.teamStats[teamId] = {
          teamId,
          winRate: row.playedGames ? Math.round((row.won / row.playedGames) * 100) : 50,
          drawRate: row.playedGames ? Math.round((row.draw / row.playedGames) * 100) : 25,
          averageGoalsScored5: Number((row.goalsFor / (row.playedGames || 1)).toFixed(1)),
          averageGoalsConceded5: Number((row.goalsAgainst / (row.playedGames || 1)).toFixed(1)),
          averageGoalsScored10: Number((row.goalsFor / (row.playedGames || 1)).toFixed(1)),
          averageGoalsConceded10: Number((row.goalsAgainst / (row.playedGames || 1)).toFixed(1)),
          recentForm: row.form ? row.form.replace(/,/g, '').slice(0, 5) : 'DDDDD',
          leaguePosition: row.position,
          totalInjuries: Math.floor(Math.random() * 4) // synthetic helper injection
        };
      } else {
        db.teamStats[teamId].leaguePosition = row.position;
        db.teamStats[teamId].recentForm = row.form ? row.form.replace(/,/g, '').slice(0, 5) : 'DDDDD';
        db.teamStats[teamId].winRate = row.playedGames ? Math.round((row.won / row.playedGames) * 100) : 50;
        db.teamStats[teamId].drawRate = row.playedGames ? Math.round((row.draw / row.playedGames) * 100) : 25;
      }
    }

    // Merge or replace standings (override the legacy dataset with real live API data for this league)
    db.standings = updatedStandings;
    saveDb(db);

    console.log(`[Football-Data API] Standing update complete. Synced ${updatedStandings.length} teams.`);
    return { success: true, count: updatedStandings.length };
  } catch (error: any) {
    console.error(`[Football-Data API] Error syncing standings:`, error.message);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Fetch and synchronize matches/fixtures from football-data.org
 */
export async function syncFixturesFromApi(leagueCode = 'PL'): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log(`[Football-Data API] Syncing upcoming fixtures for competition: ${leagueCode}...`);
    // Fetch both active scheduling and finished match records
    const response = await fetch(`${BASE_URL}/competitions/${leagueCode}/matches?limit=100`, {
      headers: {
        'X-Auth-Token': API_KEY
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API response status ${response.status}: ${text}`);
    }

    const data = await response.json();
    if (!data.matches || data.matches.length === 0) {
      console.log(`[Football-Data API] No active matches found for ${leagueCode}`);
      return { success: true, count: 0 };
    }

    const db = readDb();
    let updatedCount = 0;

    // Filter to matches around current day (e.g. today +/- 14 days, or simply upcoming and finished matches)
    // To ensure the dashboard has rich content let's import the 15 most recent finished and next 15 scheduled matches
    const allMatches = data.matches;
    
    // Convert to our native MatchFixture structures
    const mappedFixtures: MatchFixture[] = allMatches.map((m: any) => {
      const homeId = String(m.homeTeam.id);
      const awayId = String(m.awayTeam.id);
      
      const homeTeamObj: Team = {
        id: homeId,
        name: m.homeTeam.name,
        shortName: m.homeTeam.tla || m.homeTeam.shortName || 'TBD',
        logoUrl: m.homeTeam.crest
      };

      const awayTeamObj: Team = {
        id: awayId,
        name: m.awayTeam.name,
        shortName: m.awayTeam.tla || m.awayTeam.shortName || 'TBD',
        logoUrl: m.awayTeam.crest
      };

      // Add to global Teams pool
      TEAMS[homeId] = homeTeamObj;
      TEAMS[awayId] = awayTeamObj;

      const utcDate = m.utcDate || new Date().toISOString();
      const datePart = utcDate.split('T')[0];
      const timePart = utcDate.split('T')[1]?.slice(0, 5) || '15:00';

      let statusValue: 'scheduled' | 'live' | 'finished' = 'scheduled';
      if (m.status === 'FINISHED') {
        statusValue = 'finished';
      } else if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(m.status)) {
        statusValue = 'live';
      }

      const fixture: MatchFixture = {
        id: `api_${m.id}`,
        date: datePart,
        time: timePart,
        homeTeam: homeTeamObj,
        awayTeam: awayTeamObj,
        league: m.competition?.name || 'Premier League',
        status: statusValue
      };

      if (statusValue === 'finished' || statusValue === 'live') {
        fixture.score = {
          home: m.score?.fullTime?.home ?? 0,
          away: m.score?.fullTime?.away ?? 0
        };
      }

      return fixture;
    });

    // To prevent duplicate keys, we can keep some historical mock matches or fully replace/refresh with real live matches
    // Let's merge: we keep fixtures that are not from the API (e.g. user added fixtures) and overwrite matched API ones.
    const nonApiFixtures = db.fixtures.filter(f => !f.id.startsWith('api_'));
    
    // Sort mapped fixtures so upcoming ones are highly visible
    // Let's filter mapped fixtures to only include those relevant to current dashboard context
    // (e.g. last 15 finished matches and the next 15 scheduled matches)
    const finished = mappedFixtures.filter(f => f.status === 'finished').slice(-15);
    const scheduled = mappedFixtures.filter(f => f.status === 'scheduled').slice(0, 15);
    const live = mappedFixtures.filter(f => f.status === 'live');

    db.fixtures = [...nonApiFixtures, ...live, ...scheduled, ...finished];
    saveDb(db);

    console.log(`[Football-Data API] Synced ${db.fixtures.length} total fixtures (from API: ${live.length + scheduled.length + finished.length})`);
    return { success: true, count: live.length + scheduled.length + finished.length };
  } catch (error: any) {
    console.error(`[Football-Data API] Error syncing fixtures:`, error.message);
    return { success: false, count: 0, error: error.message };
  }
}
