import { readDb, saveDb, TEAMS } from './db';
import { MatchFixture, Standing, Team } from './types';

// Fallback to the API credentials provided by the user
const API_KEY = process.env.API_FOOTBALL_KEY || 'bd5f685c11126607ec461332dcbc5b72';
const BASE_URL = 'https://v3.football.api-sports.io';

// Map our local UI league codes to API-Football league IDs
const LEAGUE_ID_MAP: Record<string, number> = {
  'PL': 39,   // Premier League
  'PD': 140,  // La Liga
  'SA': 135,  // Serie A
  'BL1': 78,  // Bundesliga
  'FL1': 61,  // Ligue 1
  'CL': 2,    // Champions League
  'FIFA': 1,  // FIFA World Cup
  'WC': 1     // World Cup
};

// Map league UI code to human-readable name in case search falls back
const LEAGUE_NAME_MAP: Record<string, string> = {
  'PL': 'Premier League',
  'PD': 'La Liga',
  'SA': 'Serie A',
  'BL1': 'Bundesliga',
  'FL1': 'Ligue 1',
  'CL': 'Champions League',
  'FIFA': 'FIFA World Cup',
  'WC': 'World Cup'
};

/**
 * Determine current active season based on date (leagues commencing in autumn are represented by state start year)
 */
function getSeasonYear(leagueId?: number): number {
  const now = new Date();
  const year = now.getFullYear();
  if (leagueId === 1) { // World Cup is quadrennial
    if (year >= 2026) return 2026;
    return 2022;
  }
  const month = now.getMonth(); // 0-indexed, 5 = June
  if (month >= 6) { // From July onwards, match starting season represents current year 
    return year;
  }
  return year - 1; // Before July, match starting season represents previous year
}

/**
 * Create a standardized 3-character short name from an arbitrary team name
 */
function getShortName(teamName: string): string {
  if (!teamName) return 'TBD';
  const clean = teamName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (clean.length >= 3) {
    return clean.slice(0, 3);
  }
  return teamName.slice(0, 3).toUpperCase();
}

/**
 * Helper to fetch API-Football endpoints with self-healing dynamic fallback to 2023 for Free tier limitations.
 */
async function fetchWithSeasonFallback(
  endpointPath: string,
  leagueId: number,
  initialSeason: number,
  queryParams: string = ""
): Promise<{ data: any; finalSeason: number }> {
  let season = initialSeason;
  const url = `${BASE_URL}/${endpointPath}?league=${leagueId}&season=${season}${queryParams}`;
  
  let response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-apisports-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API HTTP Error ${response.status}: ${text}`);
  }

  let data = await response.json();

  // If there's a plan error saying Free plans do not have access to this season, try 2023 fallback
  if (data.errors && data.errors.plan && data.errors.plan.includes("Free plans do not have access")) {
    console.log(`[API-Football] Free plan restriction detected on season ${season}. Falling back to season 2023...`);
    season = 2023;
    const fallbackUrl = `${BASE_URL}/${endpointPath}?league=${leagueId}&season=${season}${queryParams}`;
    response = await fetch(fallbackUrl, {
      method: 'GET',
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API HTTP Error ${response.status}: ${text}`);
    }
    data = await response.json();
  }

  return { data, finalSeason: season };
}

/**
 * Synchronize standings and teams list from api-football.com
 */
export async function syncStandingsFromApiFootball(leagueCode: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const code = leagueCode.toUpperCase();
    const leagueId = LEAGUE_ID_MAP[code];
    if (!leagueId) {
      throw new Error(`Unsupported league code: ${leagueCode}`);
    }

    let season = getSeasonYear(leagueId);
    console.log(`[API-Football] Syncing standings for league ID ${leagueId} (${code}), season ${season}...`);

    let { data, finalSeason } = await fetchWithSeasonFallback('standings', leagueId, season);
    season = finalSeason;
    
    // Check for API-specific errors in response payload
    if (data.errors && Object.keys(data.errors).length > 0) {
      const errMsgs = JSON.stringify(data.errors);
      throw new Error(`API error payload: ${errMsgs}`);
    }

    // World Cup 2026 fallback check if no records are found
    if (leagueId === 1 && (!data.response || data.response.length === 0 || !data.response[0]?.league?.standings || data.response[0].league.standings.length === 0)) {
      console.log(`[API-Football] No World Cup standings found for season ${season}. Falling back to 2022 stats...`);
      season = 2022;
      const { data: fallbackData } = await fetchWithSeasonFallback('standings', leagueId, season);
      if (fallbackData.response && fallbackData.response.length > 0) {
        data = fallbackData;
      }
    }

    if (!data.response || data.response.length === 0) {
      throw new Error(`No standings data returned in response array for league ${code} in season ${season}`);
    }

    const leagueData = data.response[0].league;
    if (!leagueData || !leagueData.standings || leagueData.standings.length === 0) {
      throw new Error(`Standings table not found in response for league ${code}`);
    }

    // The standings can sometimes be nested (list of lists) for groups
    let rawTable: any[] = [];
    if (Array.isArray(leagueData.standings)) {
      rawTable = leagueData.standings.flat();
    } else {
      rawTable = [leagueData.standings];
    }

    if (!rawTable || rawTable.length === 0) {
      throw new Error(`Invalid table elements returned for league ${code}`);
    }

    const db = readDb();
    const updatedStandings: Standing[] = [];

    rawTable.forEach((row: any) => {
      const teamId = String(row.team.id);
      const teamName = row.team.name;
      const tla = getShortName(teamName);

      // Create/update team record
      const teamObj: Team = {
        id: teamId,
        name: teamName,
        shortName: tla,
        logoUrl: row.team.logo
      };

      // Add to global TEAMS registry
      TEAMS[teamId] = teamObj;

      // Extract form
      const rawForm = row.form || 'DDDDD';
      // Normalize form string to exactly 5 matches of W, D, L
      const normalizedForm = rawForm.replace(/[^WDLwdl]/g, '').toUpperCase().slice(0, 5).padEnd(5, 'D');

      // Add to updated standings array
      updatedStandings.push({
        rank: row.rank,
        teamId: teamId,
        teamName: teamName,
        played: row.all?.played || 0,
        won: row.all?.win || 0,
        drawn: row.all?.draw || 0,
        lost: row.all?.lose || 0,
        goalsFor: row.all?.goals?.for || 0,
        goalsAgainst: row.all?.goals?.against || 0,
        points: row.points || 0,
        form: normalizedForm
      });

      // Update analytics teamStats helper inside local JSON db
      const playedGames = row.all?.played || 1;
      db.teamStats[teamId] = {
        teamId,
        winRate: playedGames ? Math.round(((row.all?.win || 0) / playedGames) * 100) : 50,
        drawRate: playedGames ? Math.round(((row.all?.draw || 0) / playedGames) * 100) : 25,
        averageGoalsScored5: Number(((row.all?.goals?.for || 0) / playedGames).toFixed(1)),
        averageGoalsConceded5: Number(((row.all?.goals?.against || 0) / playedGames).toFixed(1)),
        averageGoalsScored10: Number(((row.all?.goals?.for || 0) / playedGames).toFixed(1)),
        averageGoalsConceded10: Number(((row.all?.goals?.against || 0) / playedGames).toFixed(1)),
        recentForm: normalizedForm,
        leaguePosition: row.rank,
        totalInjuries: Math.floor(Math.random() * 4) // random injection placeholder
      };
    });

    // Replace cache with fresh live data
    db.standings = updatedStandings;
    saveDb(db);

    console.log(`[API-Football] Stands synced successfully. Added ${updatedStandings.length} teams.`);
    return { success: true, count: updatedStandings.length };
  } catch (error: any) {
    console.error(`[API-Football] Standings sync error:`, error.message);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Synchronize matches and fixtures from api-football.com
 */
export async function syncFixturesFromApiFootball(leagueCode: string): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const code = leagueCode.toUpperCase();
    const leagueId = LEAGUE_ID_MAP[code];
    if (!leagueId) {
      throw new Error(`Unsupported league code: ${leagueCode}`);
    }

    let season = getSeasonYear(leagueId);
    console.log(`[API-Football] Syncing matches for competition ${leagueId} (${code}), season ${season}...`);

    // Fetch all fixtures for the season (fully supported on both Free and paid tiers with only 1 API quota point consumed)
    let { data, finalSeason } = await fetchWithSeasonFallback('fixtures', leagueId, season);
    season = finalSeason;

    if (data.errors && Object.keys(data.errors).length > 0) {
      throw new Error(`API error fetching fixtures: ${JSON.stringify(data.errors)}`);
    }

    // World Cup 2026 fallback check if no fixtures are found
    if (leagueId === 1 && (!data.response || data.response.length === 0)) {
      console.log(`[API-Football] No games found for World Cup season ${season}. Falling back to 2022 matches...`);
      season = 2022;
      const fallback = await fetchWithSeasonFallback('fixtures', leagueId, season);
      data = fallback.data;
    }

    if (!data.response || data.response.length === 0) {
      console.log(`[API-Football] No games returned from endpoint for league ${code}`);
      return { success: true, count: 0 };
    }

    // Sort all season fixtures chronologically
    const sortedMatches = [...data.response].sort((a, b) => {
      const dateA = new Date(a.fixture?.date || 0).getTime();
      const dateB = new Date(b.fixture?.date || 0).getTime();
      return dateA - dateB;
    });

    // Extract last 25 finished matches and next 25 scheduled matches to mimic premium last/next filter locally
    const finishedMatches = sortedMatches.filter(m => {
      const statusShort = m.fixture?.status?.short || '';
      return ['FT', 'AET', 'PEN'].includes(statusShort);
    });
    const upcomingMatches = sortedMatches.filter(m => {
      const statusShort = m.fixture?.status?.short || '';
      return !['FT', 'AET', 'PEN'].includes(statusShort);
    });

    const last25 = finishedMatches.slice(-25);
    const next25 = upcomingMatches.slice(0, 25);
    const apiMatches = [...last25, ...next25];

    if (apiMatches.length === 0) {
      console.log(`[API-Football] No games filtered locally for league ${code}`);
      return { success: true, count: 0 };
    }

    const db = readDb();
    const mappedFixtures: MatchFixture[] = [];

    apiMatches.forEach((m: any) => {
      const fixtureObj = m.fixture;
      const homeTeam = m.teams?.home;
      const awayTeam = m.teams?.away;
      const goalsObj = m.goals;

      if (!fixtureObj || !homeTeam || !awayTeam) return;

      const homeId = String(homeTeam.id);
      const awayId = String(awayTeam.id);

      // Create Team records
      const homeTeamObj: Team = {
        id: homeId,
        name: homeTeam.name,
        shortName: getShortName(homeTeam.name),
        logoUrl: homeTeam.logo
      };

      const awayTeamObj: Team = {
        id: awayId,
        name: awayTeam.name,
        shortName: getShortName(awayTeam.name),
        logoUrl: awayTeam.logo
      };

      // Add to global TEAMS cache
      TEAMS[homeId] = homeTeamObj;
      TEAMS[awayId] = awayTeamObj;

      // Normalize date / time from ISO response string e.g. "2026-06-12T15:00:00+00:00"
      const utcDate = fixtureObj.date || new Date().toISOString();
      const datePart = utcDate.split('T')[0];
      const timePart = utcDate.split('T')[1]?.slice(0, 5) || '15:00';

      // Map status
      const statusShort = fixtureObj.status?.short || 'NS';
      let statusValue: 'scheduled' | 'live' | 'finished' = 'scheduled';
      
      if (['FT', 'AET', 'PEN'].includes(statusShort)) {
        statusValue = 'finished';
      } else if (['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(statusShort)) {
        statusValue = 'live';
      }

      const mappedFixt: MatchFixture = {
        id: `apif_${fixtureObj.id}`, // prefix with apif_ to prevent id collisions
        date: datePart,
        time: timePart,
        homeTeam: homeTeamObj,
        awayTeam: awayTeamObj,
        league: m.league?.name || LEAGUE_NAME_MAP[code] || 'Leagues',
        round: m.league?.round || 'Regular Season',
        status: statusValue
      };

      // Attaching actual scores if the match is finished or currently in play
      if (statusValue === 'finished' || statusValue === 'live') {
        mappedFixt.score = {
          home: goalsObj?.home ?? 0,
          away: goalsObj?.away ?? 0
        };
      }

      mappedFixtures.push(mappedFixt);
    });

    // Keep locally created user fixtures (non-api ones)
    const customFixtures = db.fixtures.filter(f => !f.id.startsWith('apif_') && !f.id.startsWith('api_'));

    // Deduplicate fixtures by id
    const seen = new Set<string>();
    const unifiedFixtures: MatchFixture[] = [];

    [...customFixtures, ...mappedFixtures].forEach(f => {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        unifiedFixtures.push(f);
      }
    });

    db.fixtures = unifiedFixtures;
    saveDb(db);

    console.log(`[API-Football] Synced ${mappedFixtures.length} matches from endpoint successfully.`);
    return { success: true, count: mappedFixtures.length };
  } catch (error: any) {
    console.error(`[API-Football] Fixtures sync error:`, error.message);
    return { success: false, count: 0, error: error.message };
  }
}
