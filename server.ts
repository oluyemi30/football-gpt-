import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';

// Import our DB and service layers
import { readDb, saveDb, getAccuracyMetrics, TEAMS } from './src/db.js';
import { getTodayMatches, getTeamStats, getHeadToHead, createNewFixture } from './src/dataService.js';
import { calculatePrediction } from './src/predictor.js';
import { generateFootballGptAnalysis } from './src/footballGptService.js';
import { SavedPrediction } from './src/types.js';
import { syncStandingsFromApiFootball, syncFixturesFromApiFootball } from './src/apiFootballService.js';
import { 
  getTelegramConfig, 
  updateTelegramConfig, 
  getTelegramLogs, 
  processTelegramMessage, 
  startTelegramPolling, 
  stopTelegramPolling,
  calculatePnLStats,
  matchTeamByName
} from './src/telegramService.js';

dotenv.config();

// Placeholder for active WebSocket Server
let activeWss: WebSocketServer | null = null;

// Real-time broadcast helper Function
export function broadcastUpdate(type: string, data?: any) {
  if (!activeWss) {
    console.log(`[WS Broadcast] Skipped broadcasting because activeWss is not ready.`);
    return;
  }
  const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  console.log(`[WS Broadcast] Sending event "${type}" to connected clients`);
  activeWss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

const app = express();
app.use(express.json());

// API Endpoints

// 1. Get Today's Matches & All Fixtures
app.get('/api/fixtures', (req: Request, res: Response) => {
  try {
    const db = readDb();
    res.json(db.fixtures);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get All Teams (for creating custom fixtures)
app.get('/api/teams', (req: Request, res: Response) => {
  res.json(Object.values(TEAMS));
});

// 3. Get All Standings
app.get('/api/standings', (req: Request, res: Response) => {
  try {
    const db = readDb();
    res.json(db.standings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get Saved Predictions & Analyses
app.get('/api/predictions', (req: Request, res: Response) => {
  try {
    const db = readDb();
    res.json(db.predictions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get Aggregate Prediction Accuracy Stats
app.get('/api/metrics', (req: Request, res: Response) => {
  try {
    const metrics = getAccuracyMetrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Predict Match Outcome & Generate Social Content (FootballGPT Engine)
app.post('/api/predict', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.body;
    if (!matchId) {
       res.status(400).json({ error: 'matchId is required' });
       return;
    }

    const db = readDb();
    const fixture = db.fixtures.find(f => f.id === matchId);
    if (!fixture) {
       res.status(404).json({ error: 'Fixture not found' });
       return;
    }

    // A. Use ML model algorithm to output probabilities
    const predictionProbabilities = calculatePrediction(fixture.homeTeam.id, fixture.awayTeam.id, fixture.league);

    // B. Call FootballGPT Service to write reasoning + social media copy
    const analysisWrapper = await generateFootballGptAnalysis(
      fixture.homeTeam,
      fixture.awayTeam,
      predictionProbabilities,
      fixture.league
    );

    // C. Check if we already have a prediction stored for this match, update or add
    let existingIdx = db.predictions.findIndex(p => p.matchId === matchId);
    
    const savedPredict: SavedPrediction = {
      id: existingIdx >= 0 ? db.predictions[existingIdx].id : `p_${Date.now()}`,
      matchId: fixture.id,
      matchDate: fixture.date,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      league: fixture.league,
      prediction: predictionProbabilities,
      analysis: analysisWrapper.analysis,
      socialPack: analysisWrapper.socialPack,
      confidence: analysisWrapper.analysis.confidence,
      status: 'pending'
    };

    if (existingIdx >= 0) {
      db.predictions[existingIdx] = savedPredict;
    } else {
      db.predictions.push(savedPredict);
    }

    saveDb(db);
    broadcastUpdate('prediction_updated', savedPredict);
    res.json(savedPredict);
  } catch (error: any) {
    console.error("Predict endpoint error", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Manual Add Custom Fixture
app.post('/api/fixtures/add', (req: Request, res: Response) => {
  try {
    const { homeId, awayId, league, time } = req.body;
    if (!homeId || !awayId || !league || !time) {
       res.status(400).json({ error: 'homeId, awayId, league, and time are required fields.' });
       return;
    }
    if (homeId === awayId) {
       res.status(400).json({ error: 'Home team and away team must be different.' });
       return;
    }
    const newFix = createNewFixture(homeId, awayId, league, time);
    broadcastUpdate('fixtures_updated', newFix);
    res.status(201).json(newFix);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Resolve/Match Finished: Compare final outcome with predictions & record accuracy
app.post('/api/fixtures/resolve', (req: Request, res: Response) => {
  try {
    const { matchId, homeScore, awayScore } = req.body;
    if (matchId === undefined || homeScore === undefined || awayScore === undefined) {
       res.status(400).json({ error: 'matchId, homeScore, and awayScore are required.' });
       return;
    }

    const hScore = Number(homeScore);
    const aScore = Number(awayScore);

    const db = readDb();
    
    // Find the fixture
    const fixtureIndex = db.fixtures.findIndex(f => f.id === matchId);
    if (fixtureIndex === -1) {
       res.status(404).json({ error: 'Fixture not found' });
       return;
    }

    // Update fixture state
    db.fixtures[fixtureIndex].status = 'finished';
    db.fixtures[fixtureIndex].score = { home: hScore, away: aScore };

    // Determine actual winner string ('home', 'away', 'draw')
    let winner: 'home' | 'away' | 'draw' = 'draw';
    if (hScore > aScore) winner = 'home';
    else if (aScore > hScore) winner = 'away';

    // Update corresponding prediction
    const predictionIdx = db.predictions.findIndex(p => p.matchId === matchId);
    if (predictionIdx !== -1) {
      const pred = db.predictions[predictionIdx];
      pred.status = 'resolved';
      pred.actualResult = winner;
      pred.actualScore = { home: hScore, away: aScore };

      // Calculate accuracy: check if predicted high percentage matches actual outcome
      const isHomeWinPredictedMax = pred.prediction.homeWin >= pred.prediction.awayWin && pred.prediction.homeWin >= pred.prediction.draw;
      const isAwayWinPredictedMax = pred.prediction.awayWin >= pred.prediction.homeWin && pred.prediction.awayWin >= pred.prediction.draw;
      const isDrawPredictedMax = pred.prediction.draw >= pred.prediction.homeWin && pred.prediction.draw >= pred.prediction.awayWin;

      let modelDecision: 'home' | 'away' | 'draw' = 'draw';
      if (isHomeWinPredictedMax) modelDecision = 'home';
      else if (isAwayWinPredictedMax) modelDecision = 'away';

      pred.isAccurate = (modelDecision === winner);
    } else {
      // Create a prediction if it didn't exist first, then resolve it
      const predictionProbabilities = calculatePrediction(
        db.fixtures[fixtureIndex].homeTeam.id,
        db.fixtures[fixtureIndex].awayTeam.id,
        db.fixtures[fixtureIndex].league
      );
      const isHomeWinPredictedMax = predictionProbabilities.homeWin >= predictionProbabilities.awayWin && predictionProbabilities.homeWin >= predictionProbabilities.draw;
      const isAwayWinPredictedMax = predictionProbabilities.awayWin >= predictionProbabilities.homeWin && predictionProbabilities.awayWin >= predictionProbabilities.draw;

      let modelDecision: 'home' | 'away' | 'draw' = 'draw';
      if (isHomeWinPredictedMax) modelDecision = 'home';
      else if (isAwayWinPredictedMax) modelDecision = 'away';

      const newPred: SavedPrediction = {
        id: `p_${Date.now()}`,
        matchId: matchId,
        matchDate: db.fixtures[fixtureIndex].date,
        homeTeam: db.fixtures[fixtureIndex].homeTeam,
        awayTeam: db.fixtures[fixtureIndex].awayTeam,
        league: db.fixtures[fixtureIndex].league,
        prediction: predictionProbabilities,
        confidence: 'medium',
        status: 'resolved',
        actualResult: winner,
        actualScore: { home: hScore, away: aScore },
        isAccurate: (modelDecision === winner)
      };
      db.predictions.push(newPred);
    }

    saveDb(db);
    broadcastUpdate('fixture_resolved', { success: true, updatedFixture: db.fixtures[fixtureIndex] });
    res.json({ success: true, updatedFixture: db.fixtures[fixtureIndex] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Manual trigger for scheduled morning workflow (Daily Prediction Automation)
// Runs ML calculation, writes prompts, and saves accuracy over all fixtures of today
app.post('/api/automation/run', async (req: Request, res: Response) => {
  try {
    const db = readDb();
    const todayStr = new Date().toISOString().split('T')[0];
    const todayFixtures = db.fixtures.filter(f => f.date === todayStr);

    if (todayFixtures.length === 0) {
       res.json({ message: "No fixtures scheduled today to automate predictions for.", processedCount: 0 });
       return;
    }

    let processedCount = 0;
    for (const fixture of todayFixtures) {
      // Check if prediction is already analyzed and stored
      const alreadyPredicted = db.predictions.some(p => p.matchId === fixture.id && p.analysis);
      if (alreadyPredicted) continue;

      const predictionProbabilities = calculatePrediction(fixture.homeTeam.id, fixture.awayTeam.id, fixture.league);
      const analysisWrapper = await generateFootballGptAnalysis(
        fixture.homeTeam,
        fixture.awayTeam,
        predictionProbabilities,
        fixture.league
      );

      const savedPredict: SavedPrediction = {
        id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        matchId: fixture.id,
        matchDate: fixture.date,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        league: fixture.league,
        prediction: predictionProbabilities,
        analysis: analysisWrapper.analysis,
        socialPack: analysisWrapper.socialPack,
        confidence: analysisWrapper.analysis.confidence,
        status: 'pending'
      };

      // Upsert
      const existingIdx = db.predictions.findIndex(p => p.matchId === fixture.id);
      if (existingIdx >= 0) {
        db.predictions[existingIdx] = savedPredict;
      } else {
        db.predictions.push(savedPredict);
      }
      processedCount++;
    }

    saveDb(db);
    broadcastUpdate('automation_triggered', { message: "Daily Morning Automation triggered successfully.", processedCount });
    res.json({ message: "Daily Morning Automation triggered successfully.", processedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Sync Live football data from api-football.com (using API-Sports key)
app.post('/api/football-data/sync', async (req: Request, res: Response) => {
  try {
    const { league } = req.body;
    const leagueCode = (league || 'PL').toUpperCase();
    
    console.log(`[Sync Triggered] Starting live API-Football synchronization for: ${leagueCode}`);
    
    // A. Sync standings and registered teams
    const standingsSync = await syncStandingsFromApiFootball(leagueCode);
    if (!standingsSync.success) {
      res.status(500).json({ error: standingsSync.error || 'Failed to sync standings' });
      return;
    }
    
    // B. Sync active matches/fixtures
    const fixturesSync = await syncFixturesFromApiFootball(leagueCode);
    if (!fixturesSync.success) {
      res.status(500).json({ error: fixturesSync.error || 'Failed to sync fixtures' });
      return;
    }
    
    // Broadcast websocket event so connected browsers update in real-time instantly without refresh!
    broadcastUpdate('football_data_synced', {
      message: `Fresh real-world telemetry for league: ${leagueCode} synced via API-Football.`,
      teamsCount: standingsSync.count,
      fixturesCount: fixturesSync.count
    });
    
    res.json({
      success: true,
      message: `Successfully synchronized ${leagueCode} with api-football.com!`,
      teamsSynced: standingsSync.count,
      fixturesSynced: fixturesSync.count
    });
  } catch (error: any) {
    console.error("Dashboard database API-Football synchronization failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- TELEGRAM INTEGRATION SERVICES AND RENDERERS ---

// 1. Get current telegram configuration
app.get('/api/telegram/config', (req: Request, res: Response) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  let hostUrl = proto + '://' + req.get('host');
  if (hostUrl.startsWith('http://') && !hostUrl.includes('localhost') && !hostUrl.includes('127.0.0.1') && !hostUrl.includes('0.0.0.0')) {
    hostUrl = hostUrl.replace('http://', 'https://');
  }
  updateTelegramConfig({ publicUrl: hostUrl });
  res.json(getTelegramConfig());
});

// 2. Update and active toggle telegram polling
app.post('/api/telegram/config', (req: Request, res: Response) => {
  try {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    let hostUrl = proto + '://' + req.get('host');
    if (hostUrl.startsWith('http://') && !hostUrl.includes('localhost') && !hostUrl.includes('127.0.0.1') && !hostUrl.includes('0.0.0.0')) {
      hostUrl = hostUrl.replace('http://', 'https://');
    }
    const updatePayload = { ...req.body, publicUrl: hostUrl };
    updateTelegramConfig(updatePayload);
    const config = getTelegramConfig();
    if (config.enabled && config.token) {
      startTelegramPolling();
    } else {
      stopTelegramPolling();
    }
    broadcastUpdate('telegram_config_updated', config);
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Fetch log entries for real-time console streaming
app.get('/api/telegram/logs', (req: Request, res: Response) => {
  res.json(getTelegramLogs());
});

// 4. Manual client simulation for instant testing of message actions
app.post('/api/telegram/simulate', async (req: Request, res: Response) => {
  try {
    const { text, username } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }
    const result = await processTelegramMessage(text, username || 'Tester');
    broadcastUpdate('telegram_log_added', getTelegramLogs());
    res.json({ success: true, replyText: result.replyText, metadata: result.metadata });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper functions for SVG Graphics Card Generation
function generatePnLCardSvg(pnl: any): string {
  const accuracy = pnl.accuracyRate;
  const pnlText = pnl.virtualPnL > 0 ? `+${pnl.virtualPnL}` : `${pnl.virtualPnL}`;
  const winCount = pnl.correctCount;
  const loseCount = pnl.incorrectCount;
  const total = pnl.resolvedCount;
  const streakSquares = pnl.streak.map((s: string, idx: number) => {
    const color = s.includes('W') ? '#3FB950' : '#FF4F56';
    const text = s.includes('W') ? 'W' : 'L';
    const x = 160 + idx * 45;
    return `
      <g transform="translate(${x}, 305)">
        <rect width="36" height="36" rx="8" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5" />
        <text x="18" y="22" font-family="'Inter', -apple-system, sans-serif" font-size="12" font-weight="950" fill="${color}" text-anchor="middle" alignment-baseline="middle">${text}</text>
      </g>
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="400">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0D1117" />
          <stop offset="50%" stop-color="#161B22" />
          <stop offset="100%" stop-color="#0A0B0E" stop-opacity="0.95" />
        </linearGradient>
        <linearGradient id="glowGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#58A6FF" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#3FB950" stop-opacity="0.02" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#58A6FF" />
          <stop offset="100%" stop-color="#1F6FEB" />
        </linearGradient>
        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#56E39F" />
          <stop offset="100%" stop-color="#3FB950" />
        </linearGradient>
      </defs>

      <rect width="600" height="400" rx="16" fill="url(#bgGrad)" stroke="#30363D" stroke-width="2" />
      <rect width="596" height="396" x="2" y="2" rx="14" fill="none" stroke="url(#glowGrad)" stroke-width="3" />

      <circle cx="25" cy="25" r="2" fill="#58A6FF" opacity="0.4" />
      <circle cx="575" cy="25" r="2" fill="#3FB950" opacity="0.4" />

      <g transform="translate(40, 50)">
        <rect width="36" height="36" rx="10" fill="url(#accentGrad)" opacity="0.1" />
        <path d="M12 10l12 6-12 6V10z" fill="#58A6FF" transform="translate(6, 4)" />
        <text x="50" y="24" font-family="'Inter', -apple-system, sans-serif" font-size="16" font-weight="800" fill="#FFFFFF" letter-spacing="0.5">FOOTBALLGPT AI</text>
        <text x="350" y="24" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#58A6FF" letter-spacing="1" text-anchor="end">SYS_HEALTH: OPTIMAL</text>
      </g>

      <line x1="40" y1="100" x2="560" y2="100" stroke="#30363D" stroke-width="1" stroke-dasharray="4" />

      <g id="stats_row" transform="translate(40, 120)">
        <g transform="translate(0, 0)">
          <rect width="150" height="120" rx="12" fill="#161B22" stroke="#30363D" stroke-width="1.5" />
          <text x="75" y="35" font-family="'Inter', -apple-system, sans-serif" font-size="10" font-weight="700" fill="#8B949E" letter-spacing="0.5" text-anchor="middle">ACCURACY RATE</text>
          <text x="75" y="85" font-family="'JetBrains Mono', monospace" font-size="36" font-weight="900" fill="url(#greenGrad)" text-anchor="middle">${accuracy}%</text>
        </g>

        <g transform="translate(180, 0)">
          <rect width="150" height="120" rx="12" fill="#161B22" stroke="#30363D" stroke-width="1.5" />
          <text x="75" y="35" font-family="'Inter', -apple-system, sans-serif" font-size="10" font-weight="700" fill="#8B949E" letter-spacing="0.5" text-anchor="middle">NET PROFIT</text>
          <text x="75" y="85" font-family="'JetBrains Mono', monospace" font-size="34" font-weight="900" fill="${pnl.virtualPnL >= 0 ? '#3FB950' : '#FF4F56'}" text-anchor="middle">${pnlText}u</text>
        </g>

        <g transform="translate(360, 0)">
          <rect width="160" height="120" rx="12" fill="#161B22" stroke="#30363D" stroke-width="1.5" />
          <text x="80" y="35" font-family="'Inter', -apple-system, sans-serif" font-size="10" font-weight="700" fill="#8B949E" letter-spacing="0.5" text-anchor="middle">RESOLVED W/L</text>
          <text x="80" y="75" font-family="'JetBrains Mono', monospace" font-size="22" font-weight="800" fill="#FFFFFF" text-anchor="middle">${winCount}W - ${loseCount}L</text>
          <text x="80" y="100" font-family="'Inter', -apple-system, sans-serif" font-size="10" font-weight="500" fill="#8B949E" text-anchor="middle">Total Samples: ${total}</text>
        </g>
      </g>

      <g>
        <text x="40" y="328" font-family="'Inter', -apple-system, sans-serif" font-size="11" font-weight="700" fill="#8B949E">RECENT STREAK:</text>
        ${streakSquares ? streakSquares : `<text x="160" y="328" font-family="'Inter', -apple-system, sans-serif" font-size="11" font-style="italic" fill="#8B949E">Awaiting Resolved Fixtures</text>`}
      </g>

      <text x="560" y="380" font-family="'Inter', -apple-system, sans-serif" font-size="8" font-weight="600" fill="#8B949E" text-anchor="end" opacity="0.6">© WORLD CUP MODEL ENGINE • REAL-TIME TELEMETRY</text>
    </svg>
  `;
}

function generatePredictionCardSvg(homeTeam: any, awayTeam: any, prob: any): string {
  const getProgressBarWidth = (percentage: number) => {
    return Math.max(10, Math.round(percentage * 2.1));
  };

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="400">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#07090E" />
          <stop offset="50%" stop-color="#0F141C" />
          <stop offset="100%" stop-color="#040609" />
        </linearGradient>
        <linearGradient id="glowGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#58A6FF" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#8B949E" stop-opacity="0.0" />
        </linearGradient>
        <linearGradient id="probGradHome" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1F6FEB" />
          <stop offset="100%" stop-color="#58A6FF" />
        </linearGradient>
        <linearGradient id="probGradAway" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#E28743" />
          <stop offset="100%" stop-color="#FFBD59" />
        </linearGradient>
        <linearGradient id="drawGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#30363D" />
          <stop offset="100%" stop-color="#8B949E" />
        </linearGradient>
      </defs>

      <rect width="600" height="400" rx="16" fill="url(#bgGrad)" stroke="#30363D" stroke-width="2" />
      <rect width="596" height="396" x="2" y="2" rx="14" fill="none" stroke="url(#glowGrad)" stroke-width="2" />

      <g transform="translate(40, 45)">
        <text x="0" y="0" font-family="'Inter', -apple-system, sans-serif" font-size="10" font-weight="900" fill="#58A6FF" letter-spacing="2">FOOTBALLGPT AI • MATCH ESTIMATE</text>
        <text x="520" y="0" font-family="'Inter', -apple-system, sans-serif" font-size="9" font-weight="700" fill="#8B949E" text-anchor="end">XGBOOST SIM</text>
      </g>

      <line x1="40" y1="65" x2="560" y2="65" stroke="#30363D" opacity="0.5" />

      <g transform="translate(40, 110)">
        <text x="0" y="15" font-family="'Inter', -apple-system, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF">${homeTeam.emoji || '🏳️'} ${homeTeam.name}</text>
        <text x="0" y="47" font-family="'Inter', -apple-system, sans-serif" font-size="14" font-style="italic" font-weight="400" fill="#8B949E">versus</text>
        <text x="0" y="85" font-family="'Inter', -apple-system, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF">${awayTeam.emoji || '🏳️'} ${awayTeam.name}</text>
      </g>

      <g transform="translate(310, 100)">
        <rect width="250" height="190" rx="12" fill="#161B22" stroke="#30363D" stroke-width="1" />
        
        <text x="20" y="30" font-family="'Inter', -apple-system, sans-serif" font-size="10" font-weight="800" fill="#8B949E" letter-spacing="1">FORECAST PROBABILITIES</text>

        <g transform="translate(20, 42)">
          <text x="0" y="15" font-family="'Inter', -apple-system, sans-serif" font-size="11" font-weight="700" fill="#A8B4C4">${homeTeam.shortName} Win</text>
          <text x="210" y="15" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="800" fill="#58A6FF" text-anchor="end">${prob.homeWin}%</text>
          <rect y="23" width="210" height="8" rx="4" fill="#0D1117" />
          <rect y="23" width="${getProgressBarWidth(prob.homeWin)}" height="8" rx="4" fill="url(#probGradHome)" />
        </g>

        <g transform="translate(20, 84)">
          <text x="0" y="15" font-family="'Inter', -apple-system, sans-serif" font-size="11" font-weight="700" fill="#A8B4C4">Draw</text>
          <text x="210" y="15" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="800" fill="#8B949E" text-anchor="end">${prob.draw}%</text>
          <rect y="23" width="210" height="8" rx="4" fill="#0D1117" />
          <rect y="23" width="${getProgressBarWidth(prob.draw)}" height="8" rx="4" fill="url(#drawGrad)" />
        </g>

        <g transform="translate(20, 126)">
          <text x="0" y="15" font-family="'Inter', -apple-system, sans-serif" font-size="11" font-weight="700" fill="#A8B4C4">${awayTeam.shortName} Win</text>
          <text x="210" y="15" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="800" fill="#FFBD59" text-anchor="end">${prob.awayWin}%</text>
          <rect y="23" width="210" height="8" rx="4" fill="#0D1117" />
          <rect y="23" width="${getProgressBarWidth(prob.awayWin)}" height="8" rx="4" fill="url(#probGradAway)" />
        </g>
      </g>

      <g transform="translate(40, 335)">
        <rect width="520" height="34" rx="6" fill="#161B22" stroke="#30363D" stroke-width="0.5" />
        <text x="12" y="21" font-family="'Inter', -apple-system, sans-serif" font-size="9" font-weight="500" fill="#8B949E">🤖 Direct command active in chat channel: /predict ${homeTeam.shortName} vs ${awayTeam.shortName}</text>
      </g>

      <text x="40" y="310" font-family="'Inter', -apple-system, sans-serif" font-size="9" font-style="italic" fill="#8B949E" opacity="0.8">Neutral ground vectors, confederation rating factors integrated.</text>
    </svg>
  `;
}

// 5. SVG Render Route for PnL stats
app.get('/api/telegram/card/pnl', (req: Request, res: Response) => {
  try {
    const stats = calculatePnLStats();
    const svgCode = generatePnLCardSvg(stats);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', 'attachment; filename="pnl_report.svg"');
    res.send(svgCode);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. SVG Render Route for Prediction Matchups
app.get('/api/telegram/card/prediction/:homeId/:awayId', (req: Request, res: Response) => {
  try {
    const { homeId, awayId } = req.params;
    const homeTeam = TEAMS[homeId];
    const awayTeam = TEAMS[awayId];
    if (!homeTeam || !awayTeam) {
      res.status(404).send('One or both teams not found.');
      return;
    }
    const prob = calculatePrediction(homeId, awayId, 'FIFA World Cup');
    const svgCode = generatePredictionCardSvg(homeTeam, awayTeam, prob);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="prediction_${homeId}_vs_${awayId}.svg"`);
    res.send(svgCode);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Integrate Vite Dev Server middleware or Static Server
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = 3000;

  if (!isProd) {
    // Dynamically import Vite server in Development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(
          path.resolve(process.cwd(), 'index.html'),
          'utf-8'
        );

        template = await vite.transformIndexHtml(url, template);

        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    console.log(`[Development] FootballGPT server listening on port ${PORT}`);
  } else {
    // Serve static frontend files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[Production] FootballGPT server listening on port ${PORT}`);
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    if (!isProd) {
      console.log(`[Development] FootballGPT server listening on port ${PORT}`);
    } else {
      console.log(`[Production] FootballGPT server listening on port ${PORT}`);
    }
  });

  // Attach real WebSocket Server to the same Port
  activeWss = new WebSocketServer({ server: httpServer });
  
  activeWss.on('connection', (ws) => {
    console.log('[WebSocket Server] New client connected');
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Real-time Sports Analytics initialized!',
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (e) {
        // Safe ignore
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket Server] Client disconnected');
    });
  });

  // Bootstrap Telegram polling automatically if bot configuration is active and enabled
  try {
    const config = getTelegramConfig();
    if (config.enabled && config.token) {
      console.log(`[Telegram Bot Setup] Automatic trigger initializing on server boot...`);
      startTelegramPolling();
    } else {
      console.log(`[Telegram Bot Setup] Bot is inactive or token not specified. Polling standby.`);
    }
  } catch (err: any) {
    console.error("Failed to start Telegram Poller automatically on boot:", err.message);
  }
}

setupServer().catch(err => {
  console.error("Failed to bootstrap server component:", err);
});
