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
    const predictionProbabilities = calculatePrediction(fixture.homeTeam.id, fixture.awayTeam.id);

    // B. Call FootballGPT Service to write reasoning + social media copy
    const analysisWrapper = await generateFootballGptAnalysis(
      fixture.homeTeam,
      fixture.awayTeam,
      predictionProbabilities
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
      const predictionProbabilities = calculatePrediction(db.fixtures[fixtureIndex].homeTeam.id, db.fixtures[fixtureIndex].awayTeam.id);
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

      const predictionProbabilities = calculatePrediction(fixture.homeTeam.id, fixture.awayTeam.id);
      const analysisWrapper = await generateFootballGptAnalysis(
        fixture.homeTeam,
        fixture.awayTeam,
        predictionProbabilities
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
}

setupServer().catch(err => {
  console.error("Failed to bootstrap server component:", err);
});
