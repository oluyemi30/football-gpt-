import { readDb, saveDb, TEAMS, getAccuracyMetrics } from './db.js';
import { calculatePrediction } from './predictor.js';
import { generateFootballGptAnalysis } from './footballGptService.js';
import { Team, SavedPrediction, MatchFixture } from './types.js';

export interface BotLog {
  timestamp: string;
  type: 'info' | 'message' | 'response' | 'error';
  text: string;
}

// Memory-based logs for our dashboard console stream
let telegramLogs: BotLog[] = [
  { timestamp: new Date().toISOString(), type: 'info', text: 'Telegram Bot Service initialized.' },
  { timestamp: new Date().toISOString(), type: 'info', text: 'Polling Standby. Enter Bot Token to connect real API.' }
];

export function addTelegramLog(type: 'info' | 'message' | 'response' | 'error', text: string) {
  telegramLogs.unshift({
    timestamp: new Date().toISOString(),
    type,
    text
  });
  if (telegramLogs.length > 50) {
    telegramLogs = telegramLogs.slice(0, 50);
  }
}

export function getTelegramLogs() {
  return telegramLogs;
}

// Config structure stored/persisted inside db.json to make it extremely easy to use
export interface TelegramConfig {
  token: string;
  enabled: boolean;
  chatId?: string;
  lastUpdateId: number;
}

const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  token: '',
  enabled: false,
  chatId: '',
  lastUpdateId: 0
};

// Gets clean bot config
export function getTelegramConfig(): TelegramConfig {
  const db: any = readDb();
  if (!db.telegram) {
    db.telegram = { ...DEFAULT_TELEGRAM_CONFIG };
    // Merge process.env variables if set
    if (process.env.TELEGRAM_BOT_TOKEN) {
      db.telegram.token = process.env.TELEGRAM_BOT_TOKEN;
      db.telegram.enabled = true;
    }
    if (process.env.TELEGRAM_CHAT_ID) {
      db.telegram.chatId = process.env.TELEGRAM_CHAT_ID;
    }
    saveDb(db);
  }
  return db.telegram;
}

export function updateTelegramConfig(config: Partial<TelegramConfig>) {
  const db: any = readDb();
  if (!db.telegram) {
    db.telegram = { ...DEFAULT_TELEGRAM_CONFIG };
  }
  db.telegram = { ...db.telegram, ...config };
  saveDb(db);
  addTelegramLog('info', `Configuration updated. Real Bot Active: ${db.telegram.enabled ? 'YES' : 'NO'}`);
}

// Robust fuzzy-matching helper to retrieve a Team entity case-insensitively
export function matchTeamByName(query: string): Team | null {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return null;

  // 1. Direct shortName match (e.g., "SUI", "QAT")
  const shortMatch = Object.values(TEAMS).find(t => t.shortName.toLowerCase() === cleanQ);
  if (shortMatch) return shortMatch;

  // 2. Exact name match
  const exactMatch = Object.values(TEAMS).find(t => t.name.toLowerCase() === cleanQ);
  if (exactMatch) return exactMatch;

  // 3. Substring match
  const subMatch = Object.values(TEAMS).find(t => t.name.toLowerCase().includes(cleanQ));
  if (subMatch) return subMatch;

  return null;
}

// Calculates PnL statistics based on resolved predictions in db.json
export function calculatePnLStats(): {
  resolvedCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracyRate: number;
  virtualPnL: number;
  streak: string[];
} {
  const db = readDb();
  const resolved = db.predictions.filter(p => p.status === 'resolved');
  const correct = resolved.filter(p => p.isAccurate);
  const incorrectCount = resolved.length - correct.length;
  const accuracyRate = resolved.length > 0 ? Number(((correct.length / resolved.length) * 100).toFixed(1)) : 0;

  // Heuristic virtual PnL units (assuming flat 1.0 unit bets on predictions with decimal odds computed from model)
  // Win outcome typically has decimal odds of 1 / (ModelProb%), we emulate a steady profit return
  let virtualPnL = 0;
  resolved.forEach(p => {
    if (p.isAccurate) {
      // simulate modest payout yield (1.85 avg odds - 1 unit stake)
      virtualPnL += 0.85;
    } else {
      virtualPnL -= 1.0;
    }
  });

  // Streaks (last 7 games) e.g., ["W", "W", "L", "W", "L", "W", "W"]
  const streak = resolved
    .slice(-7)
    .map(p => (p.isAccurate ? '🟢 W' : '🔴 L'));

  return {
    resolvedCount: resolved.length,
    correctCount: correct.length,
    incorrectCount,
    accuracyRate,
    virtualPnL: Number(virtualPnL.toFixed(2)),
    streak
  };
}

// Format a glowing Text-based HTML mockup of a prediction card
export function formatTextPredictionCard(homeTeam: Team, awayTeam: Team, prob: { homeWin: number; draw: number; awayWin: number }, insight: string, matchId?: string): string {
  const getProgressBar = (percentage: number) => {
    const bars = Math.round(percentage / 10);
    return '🟩'.repeat(bars) + '⬜'.repeat(10 - bars);
  };

  return `🤖 *FOOTBALLGPT ANALYTICS CARD* 🤖\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `${homeTeam.emoji || '🏳️'} *${homeTeam.name}* \n` +
         `      *vs* \n` +
         `${awayTeam.emoji || '🏳️'} *${awayTeam.name}*\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
         `📊 *Forecast Probabilities:*\n` +
         `• *${homeTeam.shortName} Win:* ${prob.homeWin}% [${getProgressBar(prob.homeWin)}]\n` +
         `• *Draw:* ${prob.draw}% [${getProgressBar(prob.draw)}]\n` +
         `• *${awayTeam.shortName} Win:* ${prob.awayWin}% [${getProgressBar(prob.awayWin)}]\n\n` +
         `🔑 *AI Tactical Outlook:*\n` +
         `_"${insight}"_\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `💡 _Predict on Web App ID:_ \`${matchId || 'Custom Match'}\`\n` +
         `🔗 _Interactive PnL:_ [View Dashboard Live](https://ai.studio/build)`;
}

// Process arbitrary message payload and returns responsive text and optional card actions
export async function processTelegramMessage(text: string, username_sender: string = 'User'): Promise<{ replyText: string; metadata?: any }> {
  const cleanText = text.trim();
  addTelegramLog('message', `[Received] <@${username_sender}>: "${cleanText}"`);

  // 1. HELP / START command
  if (cleanText === '/start' || cleanText.toLowerCase() === '/help' || cleanText === '/start@FootballGptBot') {
    const helpMsg = `🤖 *FootballGPT AI Predictor Bot* ⚽\n\n` +
                   `Welcome *${username_sender}*! I am an elite machine learning simulator calibrated with World Cup team strengths and real-time football databases.\n\n` +
                   `🏁 *Available Commands:*\n` +
                   `• \`/predict <Team A> vs <Team B>\` \n` +
                   `   _Example: /predict Switzerland vs Qatar_\n` +
                   `• \`/predict <matchId>\` \n` +
                   `   _Predict match from today's list (e.g., \`/predict f_1\` for Argentina/France)_\n` +
                   `• \`/analysis <Team A> vs <Team B>\` \n` +
                   `   _Detailed tactical breakdown powered by Gemini._\n` +
                   `• \`/pnl\` \n` +
                   `   _Live system accuracy sheets & profit metrics._ \n` +
                   `• \`/list\` \n` +
                   `   _Lists of scheduled matches for today_`;
    
    addTelegramLog('response', `[Sent Start Page to @${username_sender}]`);
    return { replyText: helpMsg };
  }

  // 2. LIST Command
  if (cleanText === '/list' || cleanText === '/list@FootballGptBot') {
    const db = readDb();
    const todayStr = new Date().toISOString().split('T')[0];
    const todayFix = db.fixtures.filter(f => f.date === todayStr);

    if (todayFix.length === 0) {
      return {
        replyText: `📅 *Scheduled Matches Today:* \n\nNo active matches scheduled in database for today (${todayStr}). You can manually create fixtures using the Web console.`
      };
    }

    let listStr = `📅 *Scheduled Matches Today (${todayStr}):*\n\n`;
    todayFix.forEach((f, idx) => {
      listStr += `📍 *Match ID:* \`${f.id}\`\n` +
                 `🏆 \`${f.time}\` • ${f.homeTeam.emoji || '🏳️'} ${f.homeTeam.name} vs ${f.awayTeam.emoji || '🏳️'} ${f.awayTeam.name} (${f.league})\n` +
                 `👉 _Predict:_ \`/predict ${f.id}\`\n\n`;
    });

    addTelegramLog('response', `[Sent active list containing ${todayFix.length} entries]`);
    return { replyText: listStr };
  }

  // 3. PNL Command
  if (cleanText === '/pnl' || cleanText === '/pnl@FootballGptBot') {
    const pnl = calculatePnLStats();
    const pnlMsg = `📈 *FOOTBALLGPT PERFORMANCE PROFILE* 📈\n` +
                   `━━━━━━━━━━━━━━━━━━━━━━\n` +
                   `📊 *Accuracy Rate:* \`${pnl.accuracyRate}%\`\n` +
                   `✅ *Correct Forecasts:* \`${pnl.correctCount}\` matches\n` +
                   `❌ *Incorrect Forecasts:* \`${pnl.incorrectCount}\` matches\n` +
                   `💎 *Virtual Net Profit:* \`${pnl.virtualPnL > 0 ? '+' : ''}${pnl.virtualPnL} Units\`\n\n` +
                   `🔥 *Recent Streak:* \n${pnl.streak.length > 0 ? pnl.streak.join(' → ') : '_No matches resolved yet!_'}\n` +
                   `━━━━━━━━━━━━━━━━━━━━━━\n` +
                   `💡 *PNL Verification Card:* \n[Open Virtual PNL Ledger](https://ai.studio/build/ledger)`;

    addTelegramLog('response', `[Sent live analytical PnL metrics]`);
    return { 
      replyText: pnlMsg,
      metadata: { type: 'pnl', stats: pnl }
    };
  }

  // 4. PREDICT & ANALYSIS commands
  const predictMatch = cleanText.match(/^\/(predict|analysis)\s+(.+)$/i);
  if (predictMatch) {
    const mode = predictMatch[1].toLowerCase() as 'predict' | 'analysis';
    const arg = predictMatch[2].trim();

    const db = readDb();
    let homeTeam: Team | null = null;
    let awayTeam: Team | null = null;
    let league = 'FIFA World Cup';
    let matchId = 'Custom Match';

    // A. Check if the arg matches an active matchId in db.json
    const directFixture = db.fixtures.find(f => f.id === arg);
    if (directFixture) {
      homeTeam = directFixture.homeTeam;
      awayTeam = directFixture.awayTeam;
      league = directFixture.league;
      matchId = directFixture.id;
    } else {
      // B. Parse as home vs away text (contains 'vs' or '-')
      const queryParts = arg.split(/\s+vs\s+|\s+-\s+/i);
      if (queryParts.length === 2) {
        homeTeam = matchTeamByName(queryParts[0]);
        awayTeam = matchTeamByName(queryParts[1]);
      }
    }

    if (!homeTeam || !awayTeam) {
      const errorMsg = `⚠️ *Could not resolve teams!* ⚠️\n\n` +
                       `I couldn't find matches or teams for: \`${arg}\`.\n\n` +
                       `• For daily scheduled games, use direct IDs: \`/predict f_1\`\n` +
                       `• Or type full unique names: \`/predict Switzerland vs Qatar\``;
      addTelegramLog('error', `Matching failed for query arg: "${arg}"`);
      return { replyText: errorMsg };
    }

    // C. Perform Model Simulation Calculation
    const prob = calculatePrediction(homeTeam.id, awayTeam.id, league);

    // D. Fetch key insight from locally calculated pipeline or call Gemini
    let insight = `The predictive model heavily weighs historical FIFA coefficient stats. ${homeTeam.name} records stronger metric densities across current cycles.`;
    let detailedAnalysisObj: any = null;

    if (mode === 'analysis') {
      try {
        addTelegramLog('info', `Calling Gemini FootballGPT to generate tactical reasoning for ${homeTeam.name} vs ${awayTeam.name}`);
        const gemResponse = await generateFootballGptAnalysis(homeTeam, awayTeam, prob, league);
        insight = gemResponse.analysis.keyInsight || insight;
        detailedAnalysisObj = gemResponse.analysis;
      } catch (err) {
        console.error("Fuzzy analysis fetch error", err);
      }
    } else {
      // Moderate key insight
      if (prob.homeWin > prob.awayWin && prob.homeWin > prob.draw) {
        insight = `${homeTeam.name} show considerable athletic advantages (${prob.homeWin}% probability) on neutral ground, capitalizing on UEFA level squad configurations.`;
      } else if (prob.awayWin > prob.homeWin && prob.awayWin > prob.draw) {
        insight = `${awayTeam.name} are expected to dominate tempo indices (${prob.awayWin}% probability) using aggressive high-defense blocks.`;
      } else {
        insight = `An extremely tight match predicted on neutral terrain. Defensive formations suggest split points (Draw: ${prob.draw}%) is highly expected.`;
      }
    }

    const cardText = formatTextPredictionCard(homeTeam, awayTeam, prob, insight, matchId);
    
    // Save to predictions array in db if matchId exists
    if (matchId !== 'Custom Match') {
      let existingIdx = db.predictions.findIndex(p => p.matchId === matchId);
      const predictionItem: SavedPrediction = {
        id: existingIdx >= 0 ? db.predictions[existingIdx].id : `p_${Date.now()}`,
        matchId,
        matchDate: directFixture ? directFixture.date : new Date().toISOString().split('T')[0],
        homeTeam,
        awayTeam,
        league,
        prediction: prob,
        status: 'pending',
        confidence: prob.homeWin > 55 || prob.awayWin > 55 ? 'high' : 'medium',
        analysis: {
          prediction: prob,
          confidence: prob.homeWin > 55 || prob.awayWin > 55 ? 'high' : 'medium',
          reasoning: detailedAnalysisObj ? detailedAnalysisObj.reasoning : ['Calibrated squad values analyzed', 'Cross-confederation factors weighed'],
          keyInsight: insight
        }
      };

      if (existingIdx >= 0) {
        db.predictions[existingIdx] = predictionItem;
      } else {
        db.predictions.push(predictionItem);
      }
      saveDb(db);
    }

    addTelegramLog('response', `[Sent ${mode.toUpperCase()} Card: ${homeTeam.shortName} vs ${awayTeam.shortName}]`);
    return {
      replyText: cardText,
      metadata: { 
        type: 'prediction', 
        homeTeam, 
        awayTeam, 
        prob, 
        insight,
        matchId
      }
    };
  }

  // 5. Unrecognized command fallback
  const fallbackMsg = `🤖 *I don't recognize that instruction!* ⚽\n\n` +
                       `If you are trying to predict a matchup, please use:\n` +
                       `• \`/predict Switzerland vs Qatar\` \n` +
                       `• \`/analysis Switzerland vs Qatar\`\n\n` +
                       `Type \`/help\` to see a full list of commands.`;
  addTelegramLog('error', `Command unrecognized: "${cleanText}"`);
  return { replyText: fallbackMsg };
}

// Background poller variable
let activePollInterval: any = null;

export function stopTelegramPolling() {
  if (activePollInterval) {
    clearInterval(activePollInterval);
    activePollInterval = null;
    addTelegramLog('info', 'Telegram polling background task stopped.');
  }
}

// Full real long poll helper to establish actual link to Telegram Server Bot
export function startTelegramPolling() {
  stopTelegramPolling();
  
  const config = getTelegramConfig();
  if (!config.token || !config.enabled) {
    console.log('[Telegram Bot] Token is missing or bot disabled. Polling standby.');
    return;
  }

  addTelegramLog('info', `Active Telegram Polling initialized with Token: ${config.token.slice(0, 8)}...`);
  console.log(`[Telegram Bot] Starting polling with update offset ${config.lastUpdateId}`);

  // Poll Telegram updates periodically (every 5 seconds to remain light and responsive)
  activePollInterval = setInterval(async () => {
    try {
      const configCurrent = getTelegramConfig();
      if (!configCurrent.token || !configCurrent.enabled) {
        stopTelegramPolling();
        return;
      }

      const url = `https://api.telegram.org/bot${configCurrent.token}/getUpdates?offset=${configCurrent.lastUpdateId + 1}&timeout=3`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Telegram API responded with code: ${response.status}`);
      }

      const body = await response.json();
      if (body.ok && body.result && body.result.length > 0) {
        let maxUpdateId = configCurrent.lastUpdateId;

        for (const update of body.result) {
          maxUpdateId = Math.max(maxUpdateId, update.update_id);
          
          if (update.message && update.message.text) {
            const text = update.message.text;
            const chatId = update.message.chat.id;
            const user = update.message.from?.username || update.message.from?.first_name || 'Anonymous';

            const processResult = await processTelegramMessage(text, user);
            
            // Deliver responsive payload back to the actual Telegram client using sendMessage API
            await sendTelegramRawMessage(chatId, processResult.replyText, configCurrent.token);

            // If a PNL card or prediction graphic is requested, we can ALSO broadcast the beautiful vector card SVG URL
            if (processResult.metadata?.type === 'pnl') {
              const svgUrlPath = `https://ai.studio/build/api/telegram/card/pnl`;
              const photoCaption = `📊 Live Accuracy Verification Certificate. View vector graphic: ${svgUrlPath}`;
              await sendTelegramRawMessage(chatId, photoCaption, configCurrent.token);
            } else if (processResult.metadata?.type === 'prediction') {
              const h = processResult.metadata.homeTeam.id;
              const a = processResult.metadata.awayTeam.id;
              const svgUrlPath = `https://ai.studio/build/api/telegram/card/prediction/${h}/${a}`;
              const pPhotoCaption = `📊 SVG Prediction Asset Card. View vectors: ${svgUrlPath}`;
              await sendTelegramRawMessage(chatId, pPhotoCaption, configCurrent.token);
            }
          }
        }

        // Persist progress to avoid processing duplicate updates
        updateTelegramConfig({ lastUpdateId: maxUpdateId });
      }
    } catch (err: any) {
      console.error("[Telegram Bot Poller Error]", err.message);
      addTelegramLog('error', `Poller API Connection failed: ${err.message}`);
    }
  }, 5000);
}

// Low-level HTTP Deliverer to post message markup to Telegram Chat IDs
async function sendTelegramRawMessage(chatId: number | string, markdownText: string, botToken: string) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: markdownText,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      })
    });

    if (!response.ok) {
      console.error(`[Telegram Deliverer Error] Failed to send message to ${chatId}. Status: ${response.status}`);
    }
  } catch (err) {
    console.error("[Telegram Deliverer Failure]", err);
  }
}
