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

export interface PredictionResult {
  homeWin: number; // percentage e.g. 52
  draw: number; // percentage e.g. 25
  awayWin: number; // percentage e.g. 23
}

export interface FootballGptAnalysis {
  prediction: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  keyInsight?: string;
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
