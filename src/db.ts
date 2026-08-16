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
  '48': { id: '48', name: 'Türkiye', shortName: 'TUR', confederation: 'UEFA (Europe)', emoji: '🇹🇷' },

  // Top Global Clubs
  '49': { id: '49', name: 'Arsenal', shortName: 'ARS', confederation: 'UEFA (Europe)', emoji: '🔴' },
  '50': { id: '50', name: 'Real Madrid', shortName: 'RMA', confederation: 'UEFA (Europe)', emoji: '👑' },
  '51': { id: '51', name: 'Manchester City', shortName: 'MCI', confederation: 'UEFA (Europe)', emoji: '🩵' },
  '52': { id: '52', name: 'Barcelona', shortName: 'BAR', confederation: 'UEFA (Europe)', emoji: '🔵🔴' },
  '53': { id: '53', name: 'Bayern Munich', shortName: 'BAY', confederation: 'UEFA (Europe)', emoji: '🔴' },
  '54': { id: '54', name: 'Paris Saint-Germain', shortName: 'PSG', confederation: 'UEFA (Europe)', emoji: '🔵🔴' },
  '55': { id: '55', name: 'Liverpool', shortName: 'LIV', confederation: 'UEFA (Europe)', emoji: '🔴' },
  '56': { id: '56', name: 'Inter Milan', shortName: 'INT', confederation: 'UEFA (Europe)', emoji: '⚫🔵' },
  '57': { id: '57', name: 'Chelsea', shortName: 'CHE', confederation: 'UEFA (Europe)', emoji: '🔵' },
  '58': { id: '58', name: 'Juventus', shortName: 'JUV', confederation: 'UEFA (Europe)', emoji: '⚪⚫' },
  '59': { id: '59', name: 'Bayer Leverkusen', shortName: 'B04', confederation: 'UEFA (Europe)', emoji: '🔴⚫' },
  '60': { id: '60', name: 'Borussia Dortmund', shortName: 'BVB', confederation: 'UEFA (Europe)', emoji: '🟡⚫' },
  '61': { id: '61', name: 'Atletico Madrid', shortName: 'ATM', confederation: 'UEFA (Europe)', emoji: '🔴⚪' },
  '62': { id: '62', name: 'Sporting CP', shortName: 'SCP', confederation: 'UEFA (Europe)', emoji: '🟢⚪' },
  '63': { id: '63', name: 'Al Hilal', shortName: 'HIL', confederation: 'AFC (Asia)', emoji: '🔵' },
  '64': { id: '64', name: 'Inter Miami', shortName: 'MIA', confederation: 'CONCACAF (North/Central America)', emoji: '🩷' },
  '65': { id: '65', name: 'Manchester United', shortName: 'MUN', confederation: 'UEFA (Europe)', emoji: '🔴' },
  '66': { id: '66', name: 'Tottenham Hotspur', shortName: 'TOT', confederation: 'UEFA (Europe)', emoji: '⚪' },
  '67': { id: '67', name: 'Newcastle United', shortName: 'NEW', confederation: 'UEFA (Europe)', emoji: '⚫⚪' },
  '68': { id: '68', name: 'Aston Villa', shortName: 'AVL', confederation: 'UEFA (Europe)', emoji: '🟣🔵' },
  '69': { id: '69', name: 'Brighton & Hove Albion', shortName: 'BHA', confederation: 'UEFA (Europe)', emoji: '🔵⚪' },
  '70': { id: '70', name: 'West Ham United', shortName: 'WHU', confederation: 'UEFA (Europe)', emoji: '⚒️' },
  '71': { id: '71', name: 'Everton', shortName: 'EVE', confederation: 'UEFA (Europe)', emoji: '🔵' },
  '72': { id: '72', name: 'Real Sociedad', shortName: 'RSO', confederation: 'UEFA (Europe)', emoji: '🔵⚪' },
  '73': { id: '73', name: 'Athletic Bilbao', shortName: 'ATH', confederation: 'UEFA (Europe)', emoji: '🔴⚪' },
  '74': { id: '74', name: 'Real Betis', shortName: 'BET', confederation: 'UEFA (Europe)', emoji: '🟢⚪' },
  '75': { id: '75', name: 'Girona', shortName: 'GIR', confederation: 'UEFA (Europe)', emoji: '🔴⚪' },
  '76': { id: '76', name: 'Sevilla', shortName: 'SEV', confederation: 'UEFA (Europe)', emoji: '⚪🔴' },
  '77': { id: '77', name: 'AC Milan', shortName: 'MIL', confederation: 'UEFA (Europe)', emoji: '🔴⚫' },
  '78': { id: '78', name: 'Napoli', shortName: 'NAP', confederation: 'UEFA (Europe)', emoji: '🔵' },
  '79': { id: '79', name: 'AS Roma', shortName: 'ROM', confederation: 'UEFA (Europe)', emoji: '🟡🔴' },
  '80': { id: '80', name: 'Lazio', shortName: 'LAZ', confederation: 'UEFA (Europe)', emoji: '🦅' },
  '81': { id: '81', name: 'Atalanta', shortName: 'ATA', confederation: 'UEFA (Europe)', emoji: '⚫🔵' },
  '82': { id: '82', name: 'RB Leipzig', shortName: 'RBL', confederation: 'UEFA (Europe)', emoji: '⚪🔴' },
  '83': { id: '83', name: 'Eintracht Frankfurt', shortName: 'SGE', confederation: 'UEFA (Europe)', emoji: '🦅' },
  '84': { id: '84', name: 'VfB Stuttgart', shortName: 'VFB', confederation: 'UEFA (Europe)', emoji: '⚪🔴' },
  '85': { id: '85', name: 'AS Monaco', shortName: 'ASM', confederation: 'UEFA (Europe)', emoji: '⚪🔴' },
  '86': { id: '86', name: 'Olympique Marseille', shortName: 'OM', confederation: 'UEFA (Europe)', emoji: '⚪🔵' },
  '87': { id: '87', name: 'Olympique Lyon', shortName: 'OL', confederation: 'UEFA (Europe)', emoji: '🔵🔴' },
  '88': { id: '88', name: 'Al Nassr', shortName: 'NAS', confederation: 'AFC (Asia)', emoji: '🟡🔵' },
  '89': { id: '89', name: 'Al Ittihad', shortName: 'ITH', confederation: 'AFC (Asia)', emoji: '🟡⚫' },
  '90': { id: '90', name: 'Al Ahli', shortName: 'AHL', confederation: 'AFC (Asia)', emoji: '🟢⚪' },
  '91': { id: '91', name: 'Los Angeles FC', shortName: 'LAFC', confederation: 'CONCACAF (North/Central America)', emoji: '🖤💛' },
  '92': { id: '92', name: 'LA Galaxy', shortName: 'LAG', confederation: 'CONCACAF (North/Central America)', emoji: '🔵⚪' },
  '93': { id: '93', name: 'Italy', shortName: 'ITA', confederation: 'UEFA (Europe)', emoji: '🇮🇹' },
  '94': { id: '94', name: 'Nigeria', shortName: 'NGA', confederation: 'CAF (Africa)', emoji: '🇳🇬' },
  '95': { id: '95', name: 'Poland', shortName: 'POL', confederation: 'UEFA (Europe)', emoji: '🇵🇱' },
  '96': { id: '96', name: 'Denmark', shortName: 'DEN', confederation: 'UEFA (Europe)', emoji: '🇩🇰' },
  '97': { id: '97', name: 'Chile', shortName: 'CHI', confederation: 'CONMEBOL (South America)', emoji: '🇨🇱' }
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
    
    // Premier League
    { id: 'f_pl_1', date: new Date().toISOString().split('T')[0], time: '16:30', homeTeam: TEAMS['49'], awayTeam: TEAMS['57'], league: 'Premier League', status: 'scheduled' },
    { id: 'f_pl_2', date: new Date().toISOString().split('T')[0], time: '18:00', homeTeam: TEAMS['51'], awayTeam: TEAMS['55'], league: 'Premier League', status: 'scheduled' },
    { id: 'f_pl_3', date: new Date().toISOString().split('T')[0], time: '20:00', homeTeam: TEAMS['65'], awayTeam: TEAMS['66'], league: 'Premier League', status: 'scheduled' },
    { id: 'f_pl_4', date: new Date().toISOString().split('T')[0], time: '15:00', homeTeam: TEAMS['68'], awayTeam: TEAMS['67'], league: 'Premier League', status: 'scheduled' },

    // UEFA Champions League
    { id: 'f_cl_1', date: new Date().toISOString().split('T')[0], time: '20:00', homeTeam: TEAMS['50'], awayTeam: TEAMS['53'], league: 'UEFA Champions League', status: 'scheduled' },
    { id: 'f_cl_2', date: new Date().toISOString().split('T')[0], time: '20:00', homeTeam: TEAMS['54'], awayTeam: TEAMS['56'], league: 'UEFA Champions League', status: 'scheduled' },
    { id: 'f_cl_3', date: new Date().toISOString().split('T')[0], time: '20:45', homeTeam: TEAMS['52'], awayTeam: TEAMS['60'], league: 'UEFA Champions League', status: 'scheduled' },
    { id: 'f_cl_4', date: new Date().toISOString().split('T')[0], time: '21:00', homeTeam: TEAMS['49'], awayTeam: TEAMS['58'], league: 'UEFA Champions League', status: 'scheduled' },

    // La Liga
    { id: 'f_pd_1', date: new Date().toISOString().split('T')[0], time: '21:00', homeTeam: TEAMS['52'], awayTeam: TEAMS['61'], league: 'La Liga', status: 'scheduled' },
    { id: 'f_pd_2', date: new Date().toISOString().split('T')[0], time: '19:00', homeTeam: TEAMS['50'], awayTeam: TEAMS['76'], league: 'La Liga', status: 'scheduled' },
    { id: 'f_pd_3', date: new Date().toISOString().split('T')[0], time: '17:30', homeTeam: TEAMS['73'], awayTeam: TEAMS['72'], league: 'La Liga', status: 'scheduled' },

    // Serie A
    { id: 'f_sa_1', date: new Date().toISOString().split('T')[0], time: '18:00', homeTeam: TEAMS['56'], awayTeam: TEAMS['77'], league: 'Serie A', status: 'scheduled' },
    { id: 'f_sa_2', date: new Date().toISOString().split('T')[0], time: '20:45', homeTeam: TEAMS['58'], awayTeam: TEAMS['78'], league: 'Serie A', status: 'scheduled' },
    { id: 'f_sa_3', date: new Date().toISOString().split('T')[0], time: '15:00', homeTeam: TEAMS['79'], awayTeam: TEAMS['80'], league: 'Serie A', status: 'scheduled' },

    // Bundesliga
    { id: 'f_bl_1', date: new Date().toISOString().split('T')[0], time: '18:30', homeTeam: TEAMS['53'], awayTeam: TEAMS['60'], league: 'Bundesliga', status: 'scheduled' },
    { id: 'f_bl_2', date: new Date().toISOString().split('T')[0], time: '15:30', homeTeam: TEAMS['59'], awayTeam: TEAMS['82'], league: 'Bundesliga', status: 'scheduled' },

    // Ligue 1
    { id: 'f_fl_1', date: new Date().toISOString().split('T')[0], time: '21:00', homeTeam: TEAMS['54'], awayTeam: TEAMS['86'], league: 'Ligue 1', status: 'scheduled' },
    { id: 'f_fl_2', date: new Date().toISOString().split('T')[0], time: '17:00', homeTeam: TEAMS['85'], awayTeam: TEAMS['87'], league: 'Ligue 1', status: 'scheduled' },

    // Saudi Pro League
    { id: 'f_sau_1', date: new Date().toISOString().split('T')[0], time: '20:00', homeTeam: TEAMS['63'], awayTeam: TEAMS['88'], league: 'Saudi Pro League', status: 'scheduled' },
    { id: 'f_sau_2', date: new Date().toISOString().split('T')[0], time: '18:00', homeTeam: TEAMS['89'], awayTeam: TEAMS['90'], league: 'Saudi Pro League', status: 'scheduled' },

    // Major League Soccer
    { id: 'f_mls_1', date: new Date().toISOString().split('T')[0], time: '19:30', homeTeam: TEAMS['64'], awayTeam: TEAMS['92'], league: 'MLS', status: 'scheduled' },
    { id: 'f_mls_2', date: new Date().toISOString().split('T')[0], time: '22:00', homeTeam: TEAMS['91'], awayTeam: TEAMS['64'], league: 'MLS', status: 'scheduled' },
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
