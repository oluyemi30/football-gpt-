#!/usr/bin/env node
import 'dotenv/config'; // Safely load environment variables from .env if present
import readline from 'readline';
import { calculatePrediction } from './predictor';
import { generateFootballGptAnalysis } from './footballGptService';
import { TEAMS } from './db';
import { getTodayMatches, getTeamStats } from './dataService';

// Initialize terminal interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

// ANSI styles for professional terminal logging
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const blue = '\x1b[34m';
const magenta = '\x1b[35m';
const cyan = '\x1b[36m';
const red = '\x1b[31m';

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[0f');
}

function printHeader() {
  console.log(`\n${bold}${cyan}================================================================${reset}`);
  console.log(`${bold}${magenta}   ⚽ FOOTBALLGPT — TERMINAL ENGINE & TACTICAL PREDICTOR ⚽   ${reset}`);
  console.log(`${bold}${cyan}================================================================${reset}\n`);
}

// Generate colored ASCII bar chart for probabilities
function drawProgressBar(percentage: number, color: string): string {
  const width = 25;
  const filledLength = Math.round((percentage / 100) * width);
  const filled = '█'.repeat(filledLength);
  const empty = '░'.repeat(width - filledLength);
  return `${color}[${filled}${dim}${empty}${reset}${color}] ${percentage}%${reset}`;
}

async function listTeams() {
  clearScreen();
  printHeader();
  console.log(`${bold}${yellow}--- AVAILABLE NATIONAL TEAMS ---${reset}\n`);
  
  const teamList = Object.values(TEAMS);
  // Print in 3 columns
  let line = '';
  for (let i = 0; i < teamList.length; i++) {
    const t = teamList[i];
    const idStr = `[${t.id}]`.padEnd(5);
    const nameStr = `${t.emoji || '🏳️'} ${t.name}`.padEnd(25);
    line += `${cyan}${idStr}${reset} ${nameStr}`;
    
    if ((i + 1) % 3 === 0 || i === teamList.length - 1) {
      console.log(line);
      line = '';
    }
  }
  
  console.log(`\n${dim}Total loaded teams: ${teamList.length}${reset}`);
  await askQuestion(`\nPress ${bold}[Enter]${reset} to return to main menu...`);
}

async function listTodayMatches() {
  clearScreen();
  printHeader();
  console.log(`${bold}${yellow}--- TODAY'S SCHEDULED FIXTURES ---${reset}\n`);
  
  const matches = getTodayMatches();
  if (matches.length === 0) {
    console.log(`${red}No matches scheduled in the database for today.${reset}`);
  } else {
    matches.forEach((m, idx) => {
      console.log(`${bold}${cyan}[${idx + 1}]${reset} Match ID: ${bold}${m.id}${reset}`);
      console.log(`    🏆 ${bold}${m.homeTeam.emoji || '🏳️'} ${m.homeTeam.name}${reset} vs ${bold}${m.awayTeam.emoji || '🏳️'} ${m.awayTeam.name}${reset}`);
      console.log(`    📍 League: ${dim}${m.league}${reset} | Kick-off: ${yellow}${m.time}${reset}\n`);
    });
  }
  
  await askQuestion(`\nPress ${bold}[Enter]${reset} to return to main menu...`);
}

async function handlePredict(homeId: string, awayId: string, leagueName = 'FIFA World Cup') {
  const homeTeam = TEAMS[homeId];
  const awayTeam = TEAMS[awayId];
  
  if (!homeTeam || !awayTeam) {
    console.log(`\n${red}Error: Invalid Home/Away team IDs provided.${reset}`);
    await askQuestion(`\nPress ${bold}[Enter]${reset} to retry...`);
    return;
  }
  
  clearScreen();
  printHeader();
  
  console.log(`${bold}${yellow}--- MATHEMATICAL OUTCOME MATCH PROBABILITIES ---${reset}`);
  console.log(`🏆 MATCH: ${bold}${homeTeam.emoji || '🏳️'} ${homeTeam.name}${reset} vs ${bold}${awayTeam.emoji || '🏳️'} ${awayTeam.name}${reset}`);
  console.log(`📍 LEAGUE/COMPETITION: ${dim}${leagueName}${reset}\n`);
  
  // 1. Run core simulation engine
  const prob = calculatePrediction(homeId, awayId, leagueName);
  
  // 2. Render beautiful live charts
  console.log(`${bold}${homeTeam.name} Win:`.padEnd(22), drawProgressBar(prob.homeWin, green));
  console.log(`${bold}Draw:`.padEnd(22), drawProgressBar(prob.draw, yellow));
  console.log(`${bold}${awayTeam.name} Win:`.padEnd(22), drawProgressBar(prob.awayWin, blue));
  
  console.log(`\n${dim}------------------------------------------------------------${reset}`);
  console.log(`${bold}System Status: ${green}Calculation complete.${reset}`);
  
  // Show quick stats comparison
  const hStats = getTeamStats(homeId);
  const aStats = getTeamStats(awayId);
  if (hStats && aStats) {
    console.log(`\n${bold}${yellow}Key Metrics Comparison:${reset}`);
    console.log(` • Win Rate:        ${homeTeam.shortName} (${hStats.winRate}%) vs ${awayTeam.shortName} (${aStats.winRate}%)`);
    console.log(` • Recent Form:     ${homeTeam.shortName} [${hStats.recentForm}] vs ${awayTeam.shortName} [${aStats.recentForm}]`);
    console.log(` • Goal Rate (5g):  ${homeTeam.shortName} (${hStats.averageGoalsScored5.toFixed(1)}/g) vs ${awayTeam.shortName} (${aStats.averageGoalsScored5.toFixed(1)}/g)`);
    console.log(` • Injuries:        ${homeTeam.shortName} (${hStats.totalInjuries}) vs ${awayTeam.shortName} (${aStats.totalInjuries})`);
  }
  console.log(`${dim}------------------------------------------------------------${reset}`);
  
  // Submenu
  while (true) {
    console.log(`\n${bold}Available Options:${reset}`);
    console.log(`  ${bold}[A]${reset} Generate AI Tactical Intelligence & Social media packs (Gemini)`);
    console.log(`  ${bold}[M]${reset} Return to main menu`);
    console.log(`  ${bold}[Q]${reset} Quit FootballGPT Terminal`);
    
    const choice = (await askQuestion(`\nSelect an option: `)).trim().toUpperCase();
    
    if (choice === 'M') {
      return;
    } else if (choice === 'Q') {
      console.log(`\n${bold}Thanks for using FootballGPT! See you soon. ⚽${reset}\n`);
      process.exit(0);
    } else if (choice === 'A') {
      console.log(`\n${bold}${magenta}⏳ Querying FootballGPT Analytical Engine...${reset}`);
      if (!process.env.GEMINI_API_KEY) {
        console.log(`${yellow}Notice: GEMINI_API_KEY env key not found in terminal environment. Running high-accuracy Local Tactical Processor...${reset}`);
      }
      
      try {
        const result = await generateFootballGptAnalysis(homeTeam, awayTeam, prob, leagueName);
        console.log(`\n${bold}${green}✔ REPORT GENERATED SUCCESSFULLY${reset}\n`);
        
        console.log(`${bold}${yellow}🧠 KEY TACTICAL INSIGHT:${reset}`);
        console.log(`"${result.analysis.keyInsight}"\n`);
        
        console.log(`${bold}${yellow}📌 REASONING MATRICES:${reset}`);
        result.analysis.reasoning.forEach((reason, i) => {
          console.log(`  ${cyan}${i + 1}.${reset} ${reason}`);
        });
        
        console.log(`\n${bold}${yellow}📱 SOCIAL DISTRIBUTION PACKS:${reset}`);
        console.log(`\n${bold}[Twitter/X Post]${reset}`);
        console.log(`${dim}${result.socialPack.twitter}${reset}`);
        console.log(`\n${bold}[LinkedIn Analysis]${reset}`);
        console.log(`${dim}${result.socialPack.linkedin}${reset}`);
        console.log(`\n${bold}[WhatsApp Summary]${reset}`);
        console.log(`${dim}${result.socialPack.whatsapp}${reset}`);
        console.log(`\n${bold}[TikTok Hook Script]${reset}`);
        console.log(`${dim}${result.socialPack.tiktok}${reset}`);
        
      } catch (err: any) {
        console.log(`\n${red}Failed to compile match tactical report: ${err.message}${reset}`);
      }
      
      await askQuestion(`\nPress ${bold}[Enter]${reset} to continue...`);
      clearScreen();
      printHeader();
      console.log(`${bold}${yellow}--- MATHEMATICAL OUTCOME MATCH PROBABILITIES ---${reset}`);
      console.log(`🏆 MATCH: ${bold}${homeTeam.emoji || '🏳️'} ${homeTeam.name}${reset} vs ${bold}${awayTeam.emoji || '🏳️'} ${awayTeam.name}${reset}\n`);
      console.log(`${bold}${homeTeam.name} Win:`.padEnd(22), drawProgressBar(prob.homeWin, green));
      console.log(`${bold}Draw:`.padEnd(22), drawProgressBar(prob.draw, yellow));
      console.log(`${bold}${awayTeam.name} Win:`.padEnd(22), drawProgressBar(prob.awayWin, blue));
    } else {
      console.log(`${red}Invalid input. Please choose A, M, or Q.${reset}`);
    }
  }
}

async function runCustomPredictionPrompt() {
  clearScreen();
  printHeader();
  console.log(`${bold}${yellow}--- DEFINE CUSTOM MATCHUP ---${reset}\n`);
  console.log(`Type the numerical ID of the Home and Away Teams. For reference, you can list all teams from the main menu.\n`);
  
  const homeId = (await askQuestion(`Enter ${bold}Home Team ID${reset} (e.g. 1 for Argentina): `)).trim();
  const awayId = (await askQuestion(`Enter ${bold}Away Team ID${reset} (e.g. 2 for France): `)).trim();
  
  if (!TEAMS[homeId]) {
    console.log(`\n${red}Error: Team with ID '${homeId}' does not exist.${reset}`);
    await askQuestion(`\nPress ${bold}[Enter]${reset} to return...`);
    return;
  }
  if (!TEAMS[awayId]) {
    console.log(`\n${red}Error: Team with ID '${awayId}' does not exist.${reset}`);
    await askQuestion(`\nPress ${bold}[Enter]${reset} to return...`);
    return;
  }
  if (homeId === awayId) {
    console.log(`\n${red}Error: Home and Away teams must be different.${reset}`);
    await askQuestion(`\nPress ${bold}[Enter]${reset} to return...`);
    return;
  }
  
  const league = (await askQuestion(`Enter Competition / League Name [Default: FIFA World Cup]: `)).trim() || 'FIFA World Cup';
  
  await handlePredict(homeId, awayId, league);
}

async function runScheduledPredictionPrompt() {
  clearScreen();
  printHeader();
  console.log(`${bold}${yellow}--- LAUNCH SCHEDULED MATCH MATCHUP ---${reset}\n`);
  
  const matches = getTodayMatches();
  if (matches.length === 0) {
    console.log(`${red}No matches scheduled in the database for today.${reset}`);
    await askQuestion(`\nPress ${bold}[Enter]${reset} to return...`);
    return;
  }
  
  matches.forEach((m, idx) => {
    console.log(`  ${bold}[${idx + 1}]${reset} ${m.homeTeam.name} vs ${m.awayTeam.name} (${m.league})`);
  });
  
  const choiceIndex = parseInt(await askQuestion(`\nSelect fixture index number (1-${matches.length}): `)) - 1;
  if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= matches.length) {
    console.log(`\n${red}Error: Invalid index choice.${reset}`);
    await askQuestion(`\nPress ${bold}[Enter]${reset} to return...`);
    return;
  }
  
  const selectedMatch = matches[choiceIndex];
  // Convert team names to ID
  let homeId = '';
  let awayId = '';
  
  Object.values(TEAMS).forEach(t => {
    if (t.name === selectedMatch.homeTeam.name) homeId = t.id;
    if (t.name === selectedMatch.awayTeam.name) awayId = t.id;
  });
  
  if (!homeId || !awayId) {
    // Try shortName fallbacks
    Object.values(TEAMS).forEach(t => {
      if (t.shortName === selectedMatch.homeTeam.shortName) homeId = t.id;
      if (t.shortName === selectedMatch.awayTeam.shortName) awayId = t.id;
    });
  }
  
  if (homeId && awayId) {
    await handlePredict(homeId, awayId, selectedMatch.league);
  } else {
    console.log(`\n${red}Error: Could not map fixture teams to database team ids.${reset}`);
    await askQuestion(`\nPress ${bold}[Enter]${reset} to return...`);
  }
}

async function main() {
  while (true) {
    clearScreen();
    printHeader();
    console.log(`${bold}Welcome, Analyst! What would you like to run in terminal?${reset}\n`);
    console.log(`  ${bold}[1]${reset} ${cyan}List All National Teams (IDs & Names)${reset}`);
    console.log(`  ${bold}[2]${reset} ${cyan}List Today's Scheduled Fixtures${reset}`);
    console.log(`  ${bold}[3]${reset} ${green}Simulate & Predict Custom Matchup (ID vs ID)${reset}`);
    console.log(`  ${bold}[4]${reset} ${green}Predict from Today's Scheduled Fixtures${reset}`);
    console.log(`  ${bold}[5]${reset} ${red}Exit CLI${reset}\n`);
    
    const choice = (await askQuestion(`Select option (1-5): `)).trim();
    
    switch (choice) {
      case '1':
        await listTeams();
        break;
      case '2':
        await listTodayMatches();
        break;
      case '3':
        await runCustomPredictionPrompt();
        break;
      case '4':
        await runScheduledPredictionPrompt();
        break;
      case '5':
        console.log(`\n${bold}Thanks for using FootballGPT! See you soon. ⚽${reset}\n`);
        process.exit(0);
        break;
      default:
        console.log(`\n${red}Invalid option. Press enter to try again.${reset}`);
        await askQuestion('');
    }
  }
}

// Global exception handling to prevent terminal crash
process.on('uncaughtException', (err) => {
  console.error('\nAn unexpected CLI error occurred:', err);
});

main();
