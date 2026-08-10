export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  shortName: string;
  confederation?: string;
  emoji?: string;
}

export interface Standing {
  rank: number;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string; // e.g. "WWDLD"
}

export interface TeamStats {
  teamId: string;
  winRate: number; // percentage
  drawRate: number; // percentage
  averageGoalsScored5: number;
  averageGoalsConceded5: number;
  averageGoalsScored10: number;
  averageGoalsConceded10: number;
  recentForm: string; // last 5, e.g. "WWWLD"
  leaguePosition: number;
  totalInjuries?: number;
}

export interface HeadToHead {
  teamA: string;
  teamB: string;
  matchesPlayed: number;
  winsA: number;
  winsB: number;
  draws: number;
  lastMatches: Array<{
    date: string;
    score: string; // "2-1", etc
    winner: string; // "home", "away", "draw"
  }>;
}

export interface MatchFixture {
  id: string;
  date: string; // ISO or human-readable format
  time: string; // e.g. "15:00"
  homeTeam: Team;
  awayTeam: Team;
  league: string;
  round?: string;
  status: 'scheduled' | 'live' | 'finished';
  score?: {
    home: number;
    away: number;
  };
}

export interface CorrectScoreProb {
  score: string; // e.g. "2-1"
  probability: number; // percentage e.g. 18
}

export interface PredictionResult {
  homeWin: number; // percentage e.g. 52
  draw: number; // percentage e.g. 25
  awayWin: number; // percentage e.g. 23
  over25Goals?: number; // percentage e.g. 64
  under25Goals?: number; // percentage e.g. 36
  bttsYes?: number; // Both Teams To Score Yes % e.g. 58
  bttsNo?: number; // Both Teams To Score No % e.g. 42
  expectedGoalsHome?: number; // xG Home e.g. 1.85
  expectedGoalsAway?: number; // xG Away e.g. 1.15
  cleanSheetHome?: number; // percentage e.g. 38
  cleanSheetAway?: number; // percentage e.g. 22
  topCorrectScores?: CorrectScoreProb[];
}

export interface FootballGptAnalysis {
  prediction: PredictionResult;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  keyInsight?: string;
  tacticalStrengths?: string[];
  tacticalWeaknesses?: string[];
  importantPlayers?: string[];
  expectedTempo?: 'High' | 'Moderate' | 'Tactical/Cautious';
}

export interface SocialMediaPack {
  twitter: string;
  linkedin: string;
  whatsapp: string;
  tiktok: string;
}

export interface SavedPrediction {
  id: string; // unique prediction item id
  matchId: string;
  matchDate: string;
  homeTeam: Team;
  awayTeam: Team;
  league: string;
  prediction: PredictionResult;
  analysis?: FootballGptAnalysis;
  socialPack?: SocialMediaPack;
  confidence: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved';
  actualResult?: 'home' | 'draw' | 'away'; // actual match winner
  actualScore?: {
    home: number;
    away: number;
  };
  isAccurate?: boolean;
}

export interface AccuracyMetrics {
  totalPredictions: number;
  resolvedCount: number;
  correctCount: number;
  accuracyRate: number; // percentage e.g. 72.5
  averageConfidenceRate: number; // average for successful calls
  byLeague: Record<string, { total: number; correct: number }>;
}
