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
