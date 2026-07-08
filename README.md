# ⚽ FootballGPT: AI-Powered Football Predictor & Telegram Bot Core

FootballGPT is a state-of-the-art, full-stack predictive engine and automated content distribution system that forecasts football match outcomes, generates tactical analyses using Google Gemini, and delivers results through an active Telegram Bot client.

This system is built specifically for analysts, tipsters, and fans. Users can query predictions or check real-time PnL performance directly on Telegram, immediately receiving highly polished, downloadable vector image certificates (SVG infocards) for easy saving and sharing.

---

## 🚀 Architectural Overview

FootballGPT operates as a full-stack, decoupled architecture optimized for rapid execution and containerized delivery:

1. **Analytical Frontend Console (React 19 & Tailwind CSS v4)**: A dark, responsive visual dashboard built to manage scheduled fixtures, monitor bot logs, review live virtual ledger sheets, and simulate user messages in a secure container sandbox.
2. **Robust Backend Server (Express & Node.js)**: A high-performance Express server routing public APIs for SVG asset delivery, managing simulated traffic, and executing background polling worker processes.
3. **Advanced Prediction Engine**: Uses calibrated algorithms combined with historical metrics (e.g. World Cup team strength values, goal rates, and tactical momentum coefficients) to yield fair matchup probabilities.
4. **Google Gemini LLM Integration**: Generates detailed, natural language tactical outlooks and analytical breakdowns using the `@google/genai` TypeScript SDK.
5. **Dynamic SVG Card Generator**: Generates SVG infographics for match forecasts and PnL certificates at runtime, complete with attachment disposition headers for instant client-side downloads.
6. **Active Telegram Bot poller**: An automated background polling client connected directly to the official Telegram Bot API via clean, zero-overlap long-polling intervals, equipped with conflict (409) auto-recovery mechanisms.

---

## 🤖 Telegram Bot Commands & Guide

The system includes a fully compliant, rich text Telegram interface. The bot parses slash commands and instantly returns HTML-styled messages embedding direct links to download visual forecast cards.

### Available Commands:

#### 1. `/start` or `/help`
*   **Description**: Introduces the bot, details capability profiles, and lists active commands.
*   **Example Output**:
    ```text
    🤖 FootballGPT AI Predictor Bot ⚽
    Welcome User! I am an elite machine learning simulator...
    🏁 Available Commands:
    • /predict <Team A> vs <Team B>
    • /predict <matchId>
    • /analysis <Team A> vs <Team B>
    • /pnl
    • /list
    ```

#### 2. `/list`
*   **Description**: Lists all active and scheduled fixtures for today registered in the database, complete with their quick-predict match IDs.
*   **Example Output**:
    ```text
    📅 Scheduled Matches Today (2026-06-24):
    📍 Match ID: f_1
    🏆 18:00 • 🇦🇷 Argentina vs 🇫🇷 France (FIFA World Cup)
    👉 Predict: /predict f_1
    ```

#### 3. `/predict <Team A> vs <Team B>` OR `/predict <matchId>`
*   **Description**: Runs mathematical simulations for the requested matchup, fetches an outlook, and compiles an interactive card message containing an instant download link for the SVG infocard graphic.
*   **Example Input**: `/predict Argentina vs France` or `/predict f_1`
*   **Example Response**:
    ```text
    🤖 FOOTBALLGPT ANALYTICS CARD 🤖
    ━━━━━━━━━━━━━━━━━━━━━━
    🇦🇷 Argentina vs 🇫🇷 France
    ━━━━━━━━━━━━━━━━━━━━━━
    📊 Forecast Probabilities:
    • ARG Win: 42% [🟩🟩🟩🟩⬜⬜⬜⬜⬜⬜]
    • Draw: 28% [🟩🟩🟩⬜⬜⬜⬜⬜⬜⬜]
    • FRA Win: 30% [🟩🟩🟩⬜⬜⬜⬜⬜⬜⬜]

    🔑 AI Tactical Outlook:
    "Expect a high-tempo tactical masterclass. Argentina's midfield fluidity will likely clash with France's explosive transitional speed..."
    ━━━━━━━━━━━━━━━━━━━━━━
    🖼️ Download Infocard SVG: [Download Image] (Links to secure SVG stream)
    ```

#### 4. `/analysis <Team A> vs <Team B>`
*   **Description**: Connects directly with the Google Gemini model to deliver a rigorous, multi-paragraph sports analytic report detailing squad depth, weather considerations, and team formation matches.

#### 5. `/pnl`
*   **Description**: Compiles current virtual ledger statistics, including the bot's accuracy rate, win-loss ratio, total net profit units, and current streak, paired with a direct SVG certificate download link.
*   **Example Response**:
    ```text
    📈 FOOTBALLGPT PERFORMANCE PROFILE 📈
    ━━━━━━━━━━━━━━━━━━━━━━
    📊 Accuracy Rate: 68%
    ✅ Correct Forecasts: 17 matches
    ❌ Incorrect Forecasts: 8 matches
    💎 Virtual Net Profit: +42.5 Units

    🔥 Recent Streak: Win → Win → Loss → Win
    ━━━━━━━━━━━━━━━━━━━━━━
    🖼️ Download PnL Report SVG: [Download PnL Card]
    ```

---

## 🖼️ Dynamic SVG Card Streaming

To bypass typical Telegram image delivery latency, FootballGPT hosts secure runtime API routes that programmatically construct high-contrast, scalable vector graphics (SVGs) containing:
*   Fluid progress bars and color-blocked probability meters.
*   Clean, glowing dark cosmic palettes.
*   Embedded team flags, names, and precise percentage labels.
*   Cryptographic-style accuracy certs for virtual PnL profiles.

### SVG API Endpoints:
*   **Match Forecast Card**: `/api/telegram/card/prediction/:homeId/:awayId`
*   **Performance Ledger Card**: `/api/telegram/card/pnl`

These routes set clean `Content-Type: image/svg+xml` and `Content-Disposition: attachment; filename="..."` headers, meaning that clicking the link inside any Telegram client initiates an immediate download.

---

## 🛠️ Configuration & Environment Variables

To activate the background services, ensure that the following keys are provided in your environment:

```env
# Google Gemini API Key - Required for AI analysis breakdowns
GEMINI_API_KEY="your_gemini_api_key_here"

# Public Application URL - Automatically managed, used for self-referential download URLs
APP_URL="https://your-deployed-service.run.app"

# Optional Sports Data Providers (for real-time fixture feeds)
FOOTBALL_DATA_API_KEY="your_football_data_org_key"
API_FOOTBALL_KEY="your_api_football_com_key"
```

The server automatically maps the public URL of the platform via forward headers (`x-forwarded-proto`), ensuring that self-referential download links embedded in the Telegram chat are secure and correct regardless of container environment restarts.

---

## 💻 Running the Prediction Engine in Terminal (CLI)

FootballGPT includes a fully featured interactive terminal client. This allows developers, sports analysts, and content creators to simulate matches, calculate prediction probability spreads, and query Gemini-powered tactical reports directly in their terminal of choice.

### Quick Start:
To run the terminal CLI client, simply execute:
```bash
npm run cli
```
*(Alternative manual execution: `npx tsx src/cli.ts`)*

### Key CLI Features:
1.  **Interactive Selection**: Displays an elegant ANSI-colorized table of 48 national team database IDs and flag emojis.
2.  **Visual ASCII Probability Metrics**: Instantly generates progress bars showing matchup outcomes:
    *   **Home Win Probability** (Green `█` bar)
    *   **Draw Probability** (Yellow `█` bar)
    *   **Away Win Probability** (Blue `█` bar)
3.  **Metrics Breakdown**: Displays physical stats comparison like recent form strings (e.g., `[WWWDW]`), 5-game average goals scored, and current injury rates.
4.  **On-Demand AI Reports**: Option `[A]` requests a live tactical analytical evaluation from Gemini (or runs the local fallback processor if no key is configured), outputting:
    *   **Reasoning Matrices**: Concrete numbered bullet points detailing team structures.
    *   **Key Insight**: A cohesive natural language summary block.
    *   **Ready-to-Use Social Packs**: Automatically formats viral posts with hashtags for X (Twitter), LinkedIn, WhatsApp, and TikTok video hook script screenplays!

---

## 🧠 Core AI Architecture & Model Setup

The heart of FootballGPT's analytical insight is driven by **Google Gemini LLM** models, integrating the modern `@google/genai` TypeScript SDK:

### 1. Active Models
*   **Primary Model**: `gemini-3.5-flash` - Leveraged for ultra-fast, high-reasoning, low-latency tactical match breakdowns and programmatic JSON schema responses.
*   **Secondary Model**: `gemini-3.1-flash-lite` - Leveraged as an active standby fallback to handle potential rate limits or high-traffic spikes.

### 2. High-Fidelity Schema Enforcement (JSON Mode)
Instead of returning unstructured conversational text, FootballGPT communicates using Gemini's Native Structured Output (`responseSchema`). This ensures that the model returns perfectly formed JSON arrays and nested string blocks mapping to the system's TypeScript interfaces:
```typescript
interface FootballGptAnalysis {
  prediction: PredictionResult;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  keyInsight: string;
}
```

### 3. Fault-Tolerant Fallback System
If no `GEMINI_API_KEY` is present or if the network fails, the system bypasses API crashes by instantly loading a **Local Analytical Matrix Generator** (located in `src/footballGptService.ts`). This calculates highly aligned, data-derived tactical summaries, ensuring zero user-facing downtime and allowing offline developers to test features smoothly.

---

## 🔌 API Connectors & Integrations

For your video breakdown, here are the main APIs driving this codebase:

1.  **Telegram Bot API**:
    *   Uses long-polling via `/getUpdates` with a dynamic standby back-off mechanism.
    *   Features active **409 Conflict standby auto-recovery**: If multiple dev containers start up in the cloud, the poller identifies conflict codes, triggers `/deleteWebhook` to clean sessions, and staggers the polling interval smoothly to avoid token lockout.
2.  **Google Gemini Developer API**:
    *   Instantiated server-side via `@google/genai` to safeguard secret API keys from appearing in browser DevTools.
3.  **SVG Asset Distribution APIs**:
    *   `/api/telegram/card/prediction/:homeId/:awayId`
    *   `/api/telegram/card/pnl`
    *   These endpoints render customized SVG graphics containing live scoreboard visualizations. They set standard `image/svg+xml` headers combined with `Content-Disposition: attachment` files, making it simple for users to download them instantly to their mobile devices directly from Telegram.
4.  **Sports Data Connectors**:
    *   Integrates option-based API hooks for `football-data.org` and `api-football.com` inside `src/apiFootballService.ts` and `src/footballDataService.ts` to fetch official league standings and live score sheets when enabled.

---

## 🏗️ Build and Development Scripts

FootballGPT compiles the server into a bundle to ensure rapid cold starts and bypass strict relative ESM imports:

*   **Development**: Starts the Node server in hot TypeScript interpretation mode:
    ```bash
    npm run dev
    ```
*   **Production Build**: Compiles frontend assets into static files and bundles the backend server into a single, self-contained `dist/server.cjs` file using `esbuild` for ultra-fast load times:
    ```bash
    npm run build
    ```
*   **Production Start**: Launches the bundled Express distribution server:
    ```bash
    npm run start
    ```
*   **Code Linting**: Verifies TypeScript safety across the entire workspace:
    ```bash
    npm run lint
    ```

---

## 🔒 Master Bot Security

The live system configuration panel on the web app console is protected by a sealed credential lock block. This prevents guest users from overriding, altering, or tampering with your Telegram Bot credentials while still allowing you, the server administrator, to run polling processes in the background.
