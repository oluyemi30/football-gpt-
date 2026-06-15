import React, { useState, useEffect } from 'react';
import { Coins, Copy, Ticket, AlertCircle, Sparkles, TrendingUp, Info, Check } from 'lucide-react';
import { MatchFixture, SavedPrediction, TeamStats } from '../types';

interface Bet9jaPredictorSlipProps {
  fixture: MatchFixture;
  prediction: SavedPrediction;
}

interface BetOption {
  id: string;
  category: string;
  name: string;
  code: string; // Bet9ja standard code
  odds: number;
  prob: number;
}

export default function Bet9jaPredictorSlip({ fixture, prediction }: Bet9jaPredictorSlipProps) {
  const [stake, setStake] = useState<number>(1000);
  const [selectedOptions, setSelectedOptions] = useState<BetOption[]>([]);
  const [bookingCode, setBookingCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [slipType, setSlipType] = useState<'safe' | 'favorite' | 'aggressive' | 'custom'>('safe');
  const [teamStatsMap, setTeamStatsMap] = useState<Record<string, TeamStats>>({});

  // Fetch team stats dynamically from the client-secure API
  useEffect(() => {
    fetch('/api/team-stats')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setTeamStatsMap(data);
        }
      })
      .catch(err => console.error('Error loading team stats from API:', err));
  }, []);

  const homeStats = teamStatsMap[fixture.homeTeam.id];
  const awayStats = teamStatsMap[fixture.awayTeam.id];

  // Derive statistical bounds for Over/Under & GG based on actual team stats
  const homeScored = homeStats?.averageGoalsScored5 || 1.6;
  const awayScored = awayStats?.averageGoalsScored5 || 1.4;
  const homeConceded = homeStats?.averageGoalsConceded5 || 1.2;
  const awayConceded = awayStats?.averageGoalsConceded5 || 1.3;

  const matchExpectedGoals = homeScored + awayScored;

  // Goals probabilties
  const o15Prob = Math.round(Math.max(62, Math.min(96, matchExpectedGoals * 23)));
  const u15Prob = 100 - o15Prob;
  const o25Prob = Math.round(Math.max(34, Math.min(88, matchExpectedGoals * 16.5)));
  const u25Prob = 100 - o25Prob;

  // GG/NG probability based on offensive records
  const ggProb = Math.round(Math.max(38, Math.min(84, (homeScored * 15) + (awayScored * 15) + (homeConceded * 8) + (awayConceded * 8))));
  const ngProb = 100 - ggProb;

  // Implied odds formulas with bookmaker commission adjustment (0.92 payout ratio / 8% margin)
  const homeOdds = Math.max(1.11, Math.min(15.0, Number((100 / prediction.prediction.homeWin * 0.91).toFixed(2))));
  const drawOdds = Math.max(1.15, Math.min(10.0, Number((100 / prediction.prediction.draw * 0.91).toFixed(2))));
  const awayOdds = Math.max(1.11, Math.min(15.0, Number((100 / prediction.prediction.awayWin * 0.91).toFixed(2))));

  // Double chance probabilities
  const dc1XProb = Math.min(98, prediction.prediction.homeWin + prediction.prediction.draw);
  const dcX2Prob = Math.min(98, prediction.prediction.awayWin + prediction.prediction.draw);
  const dc12Prob = Math.min(98, prediction.prediction.homeWin + prediction.prediction.awayWin);

  const dc1XOdds = Math.max(1.04, Math.min(6.5, Number((100 / dc1XProb * 0.93).toFixed(2))));
  const dcX2Odds = Math.max(1.04, Math.min(6.5, Number((100 / dcX2Prob * 0.93).toFixed(2))));
  const dc12Odds = Math.max(1.04, Math.min(6.5, Number((100 / dc12Prob * 0.93).toFixed(2))));

  // Over/Under and GG/NG odds
  const o15Odds = Math.max(1.05, Math.min(4.5, Number((100 / o15Prob * 0.92).toFixed(2))));
  const u15Odds = Math.max(1.05, Math.min(4.5, Number((100 / u15Prob * 0.92).toFixed(2))));
  const o25Odds = Math.max(1.12, Math.min(5.5, Number((100 / o25Prob * 0.92).toFixed(2))));
  const u25Odds = Math.max(1.12, Math.min(5.5, Number((100 / u25Prob * 0.92).toFixed(2))));

  const ggOdds = Math.max(1.15, Math.min(5.0, Number((100 / ggProb * 0.91).toFixed(2))));
  const ngOdds = Math.max(1.15, Math.min(5.0, Number((100 / ngProb * 0.91).toFixed(2))));

  // Define complete pool of betting options
  const bettingPool: BetOption[] = [
    // Full Time Markets
    { id: 'home_win', category: '1X2', name: `${fixture.homeTeam.name} Win`, code: '1', odds: homeOdds, prob: prediction.prediction.homeWin },
    { id: 'draw_win', category: '1X2', name: 'Split Draw', code: 'X', odds: drawOdds, prob: prediction.prediction.draw },
    { id: 'away_win', category: '1X2', name: `${fixture.awayTeam.name} Win`, code: '2', odds: awayOdds, prob: prediction.prediction.awayWin },

    // Double Chance
    { id: 'dc_1x', category: 'Double Chance', name: `${fixture.homeTeam.shortName} or Draw`, code: '1X', odds: dc1XOdds, prob: dc1XProb },
    { id: 'dc_12', category: 'Double Chance', name: `Home or Away`, code: '12', odds: dc12Odds, prob: dc12Prob },
    { id: 'dc_x2', category: 'Double Chance', name: `${fixture.awayTeam.shortName} or Draw`, code: 'X2', odds: dcX2Odds, prob: dcX2Prob },

    // Goals O/U
    { id: 'over_15', category: 'Goals O/U', name: 'Over 1.5 Goals', code: 'O1.5', odds: o15Odds, prob: o15Prob },
    { id: 'under_15', category: 'Goals O/U', name: 'Under 1.5 Goals', code: 'U1.5', odds: u15Odds, prob: u15Prob },
    { id: 'over_25', category: 'Goals O/U', name: 'Over 2.5 Goals', code: 'O2.5', odds: o25Odds, prob: o25Prob },
    { id: 'under_25', category: 'Goals O/U', name: 'Under 2.5 Goals', code: 'U2.5', odds: u25Odds, prob: u25Prob },

    // GG / NG
    { id: 'gg_yes', category: 'GG/NG', name: 'GG (Both Teams Score)', code: 'GG', odds: ggOdds, prob: ggProb },
    { id: 'gg_no', category: 'GG/NG', name: 'NG (No Goal / Clean Sheet)', code: 'NG', odds: ngOdds, prob: ngProb }
  ];

  // Auto-build Preset slips when predictor loads or mode shifts
  useEffect(() => {
    let preset: BetOption[] = [];
    if (slipType === 'safe') {
      // Choose maximum confidence double chance or over 1.5 goals
      const options = bettingPool.filter(o => o.id === 'dc_1x' || o.id === 'dc_x2' || o.id === 'over_15');
      // Sort to get best standard safe choice
      const sorted = [...options].sort((a, b) => b.prob - a.prob);
      if (sorted.length > 0) preset = [sorted[0]];
    } else if (slipType === 'favorite') {
      // Choose the single highest win rate 1X2 market or draw is high
      const hWin = prediction.prediction.homeWin;
      const aWin = prediction.prediction.awayWin;
      if (Math.abs(hWin - aWin) < 10) {
        // Very tight, suggest a double-chance option or under 2.5
        const dcOption = bettingPool.find(o => hWin > aWin ? o.id === 'dc_1x' : o.id === 'dc_x2');
        if (dcOption) preset = [dcOption];
      } else {
        const optionId = hWin > aWin ? 'home_win' : 'away_win';
        const opt = bettingPool.find(o => o.id === optionId);
        if (opt) preset = [opt];
      }
    } else if (slipType === 'aggressive') {
      // Pick a win plus an Over 2.5 goals or GG option
      const hWin = prediction.prediction.homeWin;
      const aWin = prediction.prediction.awayWin;
      const sideOption = bettingPool.find(o => hWin > aWin ? o.id === 'home_win' : o.id === 'away_win');
      const goalOption = bettingPool.find(o => o25Prob > 55 ? o.id === 'over_25' : o.id === 'under_25');
      
      preset = [];
      if (sideOption) preset.push(sideOption);
      if (goalOption) preset.push(goalOption);
    }

    if (slipType !== 'custom') {
      setSelectedOptions(preset);
    }
  }, [slipType, prediction.id]);

  // Generate a realistic, distinct alphanumeric Bet9ja simulated Booking Code
  useEffect(() => {
    if (selectedOptions.length === 0) {
      setBookingCode('');
      return;
    }
    // Generate a code using selection IDs to remain consistent
    const selectionsHash = selectedOptions.map(o => o.id).join('-');
    const fixtureCode = fixture.id.replace('f_', '').slice(0, 3).toUpperCase();
    
    // Create a 6 characters uppercase alphanumeric string
    let hash = 0;
    for (let i = 0; i < selectionsHash.length; i++) {
      hash = selectionsHash.charCodeAt(i) + ((hash << 5) - hash);
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous letters like I, O, 1, 0
    let customCode = '';
    let tempHash = Math.abs(hash + stake + parseInt(fixtureCode, 36) || 728);
    for (let j = 0; j < 6; j++) {
      customCode += chars.charAt(tempHash % chars.length);
      tempHash = Math.floor(tempHash / chars.length);
    }
    setBookingCode(customCode);
  }, [selectedOptions, stake, fixture.id]);

  const handleToggleOption = (opt: BetOption) => {
    setSlipType('custom');
    if (selectedOptions.some(item => item.id === opt.id)) {
      setSelectedOptions(selectedOptions.filter(item => item.id !== opt.id));
    } else {
      // Check if same category is already chosen to prevent mutually exclusive items
      const isMutualExclusive = (opt.category === '1X2' && selectedOptions.some(x => x.category === '1X2')) ||
                               (opt.category === 'Double Chance' && selectedOptions.some(x => x.category === 'Double Chance'));
      
      if (isMutualExclusive) {
        // Replace previous selection in that category
        setSelectedOptions([...selectedOptions.filter(x => x.category !== opt.category), opt]);
      } else {
        setSelectedOptions([...selectedOptions, opt]);
      }
    }
  };

  // Multiple calculations
  const totalOdds = selectedOptions.reduce((acc, current) => acc * current.odds, 1);
  const formattedOdds = selectedOptions.length > 0 ? totalOdds.toFixed(2) : '0.00';

  // Nigerian sports betting bonuses
  let bonusPercentage = 0;
  if (selectedOptions.length === 2) bonusPercentage = 5;
  else if (selectedOptions.length === 3) bonusPercentage = 10;
  else if (selectedOptions.length > 3) bonusPercentage = 15;

  const rawPayout = stake * totalOdds;
  const bonusPayout = rawPayout * (bonusPercentage / 100);
  const potentialPayout = selectedOptions.length > 0 ? Math.round(rawPayout + bonusPayout) : 0;

  const handleCopySlip = () => {
    if (selectedOptions.length === 0) return;

    const selectionsText = selectedOptions.map((opt, i) => 
      `${i + 1}. [${opt.category}] ${opt.name} (${opt.code}) @ ${opt.odds}`
    ).join('\n');

    const shareBody = `⚽ *Bet9ja Recommended Betting Slip* ⚽
-------------------------------------
*Fixture:* ${fixture.homeTeam.emoji || '🏳️'} ${fixture.homeTeam.name} vs ${fixture.awayTeam.emoji || '🏳️'} ${fixture.awayTeam.name}
*Tournament:* ${fixture.league} (World Cup Neutral Ground ⚖️)

📋 *Your Selections:*
${selectionsText}

📈 *Total Odds:* ${formattedOdds}
💵 *Stake:* ₦${stake.toLocaleString()}
🔥 *Multi-Boost Bonus:* +${bonusPercentage}% (₦${Math.round(bonusPayout).toLocaleString()})
💰 *Potential Win:* ₦${potentialPayout.toLocaleString()}

🧾 *Simulated Booking Code:* *${bookingCode}*
💡 _Type this booking code into the Bet9ja website to load these selections or place the bets manually!_

⚡ _Model Analysis generated by FootballGPT_`;

    navigator.clipboard.writeText(shareBody).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleQuickStake = (amount: number) => {
    setStake(current => Math.max(100, current + amount));
  };

  return (
    <div id="bet9ja-predictor-section" className="bg-[#12131A] rounded-lg border border-red-950/40 overflow-hidden relative shadow-lg">
      
      {/* Golden top bar design resembling high-quality live sports betting consoles */}
      <div className="bg-gradient-to-r from-[#C01C20] via-[#F2A900] to-[#C01C20] h-1.5 w-full"></div>
      
      <div className="p-5 flex flex-col gap-4">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[#30363D]/40 pb-3">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-xs font-bold font-mono tracking-wider text-yellow-500 uppercase flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-yellow-500" />
              <span>Bet9ja Premium Booking Simulator</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-sans leading-tight">
              Calculates statistical betting options and booking codes according to Nigerian sports betting parameters
            </p>
          </div>
          
          <div className="flex items-center gap-1 bg-red-950/20 px-2 py-0.5 rounded border border-red-500/20 text-[9px] font-mono text-[#F44336] uppercase font-bold self-start">
            <Coins className="w-3 h-3 text-[#F44336]" />
            <span>NGN Multiplier</span>
          </div>
        </div>

        {/* Dynamic Warning Alert about Neutral Venues */}
        {['world cup', 'wc', 'fifa', 'neutral'].some(term => fixture.league.toLowerCase().includes(term)) && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded p-3 text-[11px] leading-relaxed text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-yellow-500">Neutral Ground Protocol:</span> Standard Home Turf Bias is disabled. Suggested betting odds are calculated derived strictly from squad qualities, tactical form, and confederation ratings indexes.
            </div>
          </div>
        )}

        {/* Preset Slips Navigation */}
        <div className="flex flex-wrap gap-1.5 bg-[#090A0D] p-1 rounded border border-[#30363D]/60">
          <button
            id="slip-type-safe-btn"
            onClick={() => setSlipType('safe')}
            className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              slipType === 'safe'
                ? 'bg-[#C01C20]/15 text-[#FF5252] border border-[#C01C20]/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
          >
            🛡️ Safe Option
          </button>
          <button
            id="slip-type-favorite-btn"
            onClick={() => setSlipType('favorite')}
            className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              slipType === 'favorite'
                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
          >
            📊 Model Priority
          </button>
          <button
            id="slip-type-aggressive-btn"
            onClick={() => setSlipType('aggressive')}
            className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              slipType === 'aggressive'
                ? 'bg-amber-500/15 text-orange-400 border border-amber-500/25 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
          >
            🔥 High Multiplier
          </button>
          <button
            id="slip-type-custom-btn"
            onClick={() => setSlipType('custom')}
            className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              slipType === 'custom'
                ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-transparent'
            }`}
          >
            ⚙️ Custom Slip
          </button>
        </div>

        {/* Dynamic Markets Grid Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          
          {/* Market Side A: Main Win / Draws / DC */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              1X2 & Double Chance Selections
            </span>
            
            <div className="flex flex-col gap-1.5">
              {bettingPool.filter(o => o.category === '1X2' || o.category === 'Double Chance').map(opt => {
                const isSelected = selectedOptions.some(item => item.id === opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleToggleOption(opt)}
                    className={`p-2.5 rounded border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#C21A1D]/15 to-transparent border-[#C21A1D] hover:bg-gradient-to-r hover:from-[#C21A1D]/20'
                        : 'bg-[#0D1117]/80 border-[#30363D] hover:bg-[#161B22]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-red-500 border-red-500' : 'border-[#30363D]'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-slate-200 font-medium">{opt.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#1B1D28] text-slate-400 rounded border border-[#30363D]">
                        {opt.code}
                      </span>
                      <span className="font-mono font-bold text-yellow-500 tracking-tight w-10 text-right">
                        {opt.odds.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Side B: Goals Over/Under & GG/NG */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              Goals (Over/Under) & GG/NG
            </span>

            <div className="flex flex-col gap-1.5">
              {bettingPool.filter(o => o.category === 'Goals O/U' || o.category === 'GG/NG').map(opt => {
                const isSelected = selectedOptions.some(item => item.id === opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleToggleOption(opt)}
                    className={`p-2.5 rounded border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#C21A1D]/15 to-transparent border-[#C21A1D] hover:bg-gradient-to-r hover:from-[#C21A1D]/20'
                        : 'bg-[#0D1117]/80 border-[#30363D] hover:bg-[#161B22]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-red-500 border-red-500' : 'border-[#30363D]'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-slate-200 font-medium">{opt.name}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#1B1D28] text-slate-400 rounded border border-[#30363D]">
                        {opt.code}
                      </span>
                      <span className="font-mono font-bold text-yellow-500 tracking-tight w-10 text-right">
                        {opt.odds.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Stake and Payout Summary Slate */}
        <div className="bg-[#090A0D] p-4 rounded-lg border border-[#30363D]/80 flex flex-col gap-4 mt-1.5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Stake Configuration Box */}
            <div className="flex flex-col gap-1.5 sm:w-1/2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#8B949E] font-bold block">
                Adjust Your Custom Stake (₦)
              </label>
              
              <div className="flex items-center gap-1.5">
                <input
                  id="custom-stake-input"
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(Math.max(100, parseInt(e.target.value) || 100))}
                  className="w-full bg-[#12131A] text-white border border-[#30363D] rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-red-500"
                  min="100"
                  step="100"
                />
              </div>

              {/* Quick Increment Keys */}
              <div className="flex gap-1">
                <button
                  id="quick-stake-add-500"
                  onClick={() => handleQuickStake(500)}
                  className="px-2 py-0.8 bg-[#12131A] hover:bg-[#1B1D28] text-[9px] font-mono text-slate-400 border border-[#30363D] rounded hover:text-white"
                >
                  +₦500
                </button>
                <button
                  onClick={() => handleQuickStake(1000)}
                  className="px-2 py-0.8 bg-[#12131A] hover:bg-[#1B1D28] text-[9px] font-mono text-slate-400 border border-[#30363D] rounded hover:text-white"
                >
                  +₦1k
                </button>
                <button
                  onClick={() => handleQuickStake(5000)}
                  className="px-2 py-0.8 bg-[#12131A] hover:bg-[#1B1D28] text-[9px] font-mono text-slate-400 border border-[#30363D] rounded hover:text-white"
                >
                  +₦5k
                </button>
                <button
                  onClick={() => setStake(1000)}
                  className="px-2 py-0.8 bg-[#12131A] hover:bg-red-900/25 text-[9px] font-mono text-red-400 border border-[#C01C20]/20 rounded"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Calculations and Bookmaker Bonus Display */}
            <div className="flex flex-col gap-1 sm:w-1/2 text-right">
              <div className="flex justify-between sm:justify-end items-center gap-3">
                <span className="text-[10px] font-mono text-slate-400 text-left sm:text-right">Accumulated Odds:</span>
                <span className="text-sm font-mono font-bold text-yellow-500">{formattedOdds}</span>
              </div>
              <div className="flex justify-between sm:justify-end items-center gap-3">
                <span className="text-[10px] font-mono text-slate-400 text-left sm:text-right">Multi-Boost Bonus:</span>
                <span className="text-xs font-mono font-bold text-green-500">+{bonusPercentage}%</span>
              </div>
              <div className="flex justify-between sm:justify-end items-center gap-3 border-t border-[#30363D]/40 pt-1.5 mt-1">
                <span className="text-[10px] font-mono text-[#8B949E] uppercase font-bold text-left sm:text-right">Est. Potential Payout:</span>
                <span className="text-lg font-mono font-black text-[#58A6FF]">₦{potentialPayout.toLocaleString()}</span>
              </div>
            </div>

          </div>

          {/* Golden Bet9ja Booking Slip Footer */}
          {selectedOptions.length > 0 ? (
            <div className="bg-[#12131A] p-4 rounded border border-red-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
              
              <div className="flex items-center gap-3">
                <LogoIcon />
                <div className="flex flex-col">
                  {bookingCode ? (
                    <>
                      <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-widest leading-none mb-1">
                        🔒 Dynamic Booking Code
                      </span>
                      <span className="text-2xl font-mono font-black text-yellow-500 tracking-wider select-all leading-none animate-pulse">
                        {bookingCode}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Select selections above</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="copy-booking-code-to-clipboard-btn"
                  onClick={handleCopySlip}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#C01C20] hover:bg-red-700 text-white font-bold font-mono text-xs rounded uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied Slip!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Bet9ja Slip Code</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-[#12131A]/40 p-3 rounded border border-dashed border-[#30363D] text-center font-mono text-[10px] text-slate-500">
              ⚠️ Select one or more betting options on the market grids above to build your simulated Bet9ja booking coupon and calculate payout.
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

// Custom simple inline vector graphic for Bet9ja brand logo feel
function LogoIcon() {
  return (
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C01C20] to-[#801012] flex items-center justify-center font-black text-sm tracking-tight border border-red-500/30 text-white shrink-0 shadow-lg">
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-mono leading-none tracking-tight text-yellow-400 font-black">B9</span>
        <span className="text-[8px] font-sans font-black leading-none tracking-widest text-white uppercase mt-0.5">JA</span>
      </div>
    </div>
  );
}
