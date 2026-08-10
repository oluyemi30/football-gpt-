export interface Competition {
  id: string;           // e.g. 'PL', 'CL', 'PD', 'WC', 'AFCON'
  name: string;         // e.g. 'Premier League'
  country: string;      // e.g. 'England', 'Europe', 'World'
  type: 'club' | 'international';
  season: string;       // e.g. '2025/2026'
  code: string;         // API code
  flag: string;         // Emoji flag
  active: boolean;
  category: 'Top European' | 'Americas' | 'Middle East & Asia' | 'International' | 'Other Europe';
  apiFootballId?: number;
}

export const GLOBAL_COMPETITIONS: Competition[] = [
  // Top European Leagues
  { id: 'PL', name: 'Premier League', country: 'England', type: 'club', season: '2025/2026', code: 'PL', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', active: true, category: 'Top European', apiFootballId: 39 },
  { id: 'CL', name: 'UEFA Champions League', country: 'Europe', type: 'club', season: '2025/2026', code: 'CL', flag: '🇪🇺', active: true, category: 'Top European', apiFootballId: 2 },
  { id: 'PD', name: 'La Liga', country: 'Spain', type: 'club', season: '2025/2026', code: 'PD', flag: '🇪🇸', active: true, category: 'Top European', apiFootballId: 140 },
  { id: 'SA', name: 'Serie A', country: 'Italy', type: 'club', season: '2025/2026', code: 'SA', flag: '🇮🇹', active: true, category: 'Top European', apiFootballId: 135 },
  { id: 'BL1', name: 'Bundesliga', country: 'Germany', type: 'club', season: '2025/2026', code: 'BL1', flag: '🇩🇪', active: true, category: 'Top European', apiFootballId: 78 },
  { id: 'FL1', name: 'Ligue 1', country: 'France', type: 'club', season: '2025/2026', code: 'FL1', flag: '🇫🇷', active: true, category: 'Top European', apiFootballId: 61 },
  
  // Other European Competitions
  { id: 'EL', name: 'UEFA Europa League', country: 'Europe', type: 'club', season: '2025/2026', code: 'EL', flag: '🇪🇺', active: true, category: 'Other Europe', apiFootballId: 3 },
  { id: 'ECL', name: 'UEFA Conference League', country: 'Europe', type: 'club', season: '2025/2026', code: 'ECL', flag: '🇪🇺', active: true, category: 'Other Europe', apiFootballId: 848 },
  { id: 'DED', name: 'Eredivisie', country: 'Netherlands', type: 'club', season: '2025/2026', code: 'DED', flag: '🇳🇱', active: true, category: 'Other Europe', apiFootballId: 88 },
  { id: 'PPL', name: 'Primeira Liga', country: 'Portugal', type: 'club', season: '2025/2026', code: 'PPL', flag: '🇵🇹', active: true, category: 'Other Europe', apiFootballId: 94 },
  { id: 'TSL', name: 'Süper Lig', country: 'Türkiye', type: 'club', season: '2025/2026', code: 'TSL', flag: '🇹🇷', active: true, category: 'Other Europe', apiFootballId: 203 },
  { id: 'SP', name: 'Scottish Premiership', country: 'Scotland', type: 'club', season: '2025/2026', code: 'SP', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', active: true, category: 'Other Europe', apiFootballId: 179 },

  // Americas & Rest of World
  { id: 'MLS', name: 'Major League Soccer', country: 'USA', type: 'club', season: '2025', code: 'MLS', flag: '🇺🇸', active: true, category: 'Americas', apiFootballId: 253 },
  { id: 'BSA', name: 'Brasileirão Serie A', country: 'Brazil', type: 'club', season: '2025', code: 'BSA', flag: '🇧🇷', active: true, category: 'Americas', apiFootballId: 71 },
  { id: 'SAU', name: 'Saudi Pro League', country: 'Saudi Arabia', type: 'club', season: '2025/2026', code: 'SAU', flag: '🇸🇦', active: true, category: 'Middle East & Asia', apiFootballId: 307 },

  // Major International Competitions
  { id: 'WC', name: 'FIFA World Cup', country: 'World', type: 'international', season: '2026', code: 'WC', flag: '🌍', active: true, category: 'International', apiFootballId: 1 },
  { id: 'EURO', name: 'UEFA European Championship', country: 'Europe', type: 'international', season: '2024', code: 'EURO', flag: '🇪🇺', active: true, category: 'International', apiFootballId: 4 },
  { id: 'CA', name: 'Copa América', country: 'South America', type: 'international', season: '2024', code: 'CA', flag: '🌎', active: true, category: 'International', apiFootballId: 9 },
  { id: 'AFCON', name: 'Africa Cup of Nations', country: 'Africa', type: 'international', season: '2025', code: 'AFCON', flag: '🌍', active: true, category: 'International', apiFootballId: 6 },
  { id: 'ASIAN', name: 'AFC Asian Cup', country: 'Asia', type: 'international', season: '2024', code: 'ASIAN', flag: '🌏', active: true, category: 'International', apiFootballId: 7 }
];

export function getCompetitionByCode(codeOrName: string): Competition | undefined {
  if (!codeOrName) return undefined;
  const clean = codeOrName.trim().toLowerCase();
  return GLOBAL_COMPETITIONS.find(c => 
    c.id.toLowerCase() === clean || 
    c.code.toLowerCase() === clean || 
    c.name.toLowerCase() === clean ||
    c.name.toLowerCase().includes(clean)
  );
}
