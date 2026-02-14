## Jup-Predict: Technical Infrastructure Overview

**Jup-Predict** is a specialized developer toolkit (SDK) designed to facilitate high-frequency prediction gaming within the **Jupiter Mobile V3** ecosystem. It abstracts the complexities of the Solana blockchain and the Jupiter Prediction API into a performant, game-ready interface.

### 1. Zero-Friction: Hybrid Session Key Implementation

Traditional Externally Owned Accounts (EOA) in self-custodial wallets like Jupiter require manual transaction signing for every on-chain state change. Jup-Predict bypasses this through a **Hybrid Session Key** architecture.

* **Session Initiation:** The SDK triggers a single **Jupiter Mobile Adapter** handshake. The user signs a transaction that delegates limited authority to an ephemeral, locally-stored **Session Key**.
* **Scoped Permissions:** The key is restricted to specific program IDs (Jupiter Prediction Program) and a predefined **Value Cap** (e.g., max 50 USDC total spend) and **Time-to-Live (TTL)**.
* **Background Execution:** Once authorized, the SDK signs transactions using the ephemeral key. This enables sub-second interaction rounds without interrupting the game loop with UI pop-ups.

### 2. Live Gameplay: Volatility-Driven State Machine

The SDK utilizes real-time market data to drive game-world variables, effectively turning market instability into a gameplay mechanic.

* **Metric Acquisition:** The SDK polls Jupiter’s `/orderbook` and `/price` endpoints to calculate the **Market-Impulse (MI)** score.
* **Formula:** The MI is a derivative of the **Bid-Ask Spread** and **24h Volume Density**.
* **Stable State (Low MI):** Standard game rewards.
* **Surge State (High MI):** Triggered when the spread exceeds a defined threshold (e.g., >2%).


* **Event Triggering:** In a Surge State, the SDK emits a `MARKET_EXPEDITION` event. This signals the game engine to activate bonus reward multipliers. This mechanism incentivizes "Maker" behavior in illiquid markets, aiding price discovery.

### 3. WebView Native: Jupiter IAB Optimization

The SDK is specifically tuned for the **Internal App Browser (IAB)** of the Jupiter Mobile application to ensure performance parity with native C++ apps.

* **Concurrency Management:** Data fetching and heavy JSON parsing of prediction markets are offloaded to **Web Workers**. This prevents "Main Thread Blocking," maintaining a consistent **60 FPS** for the Phaser or React rendering engine.
* **Adaptive Throttling:** The SDK monitors mobile device thermals. If performance degradation is detected, it automatically switches from high-frequency polling to a **WebSocket** stream or reduced-frequency updates.
* **Deep-Link Handshaking:** Utilizes the `jup-mobile-adapter` to ensure reliable communication between the WebView and the native wallet layer for session renewals.

---

## Functional API Reference

| Function | Technical Logic | Game Engine Implementation |
| --- | --- | --- |
| `initJupSession()` | Generates ephemeral key & requests scoped EOA signature. | Setup Phase: Connects user to the game session. |
| `getMarketImpulse()` | Calculates spread/liquidity ratio from Jupiter API. | Live Update: Drives environment visuals & loot rarity. |
| `executeHighFreqBet()` | Submits serialized V6 transactions via Session Key. | Action Phase: Executes "Attack" or "Bet" instantly. |
| `syncLootState()` | Aggregates P&L and Maker fees from `GET /history`. | Result Phase: Updates player XP and balance. |

---

## Track Alignment & Strategic Value

* **Infrastructure for Adoption:** Jup-Predict allows developers to build genres previously impossible on mobile (Real-time Battlers, High-Speed Traders).
* **Liquidity Incentive:** By gamifying "High Spread" events, the tool drives retail liquidity into newly launched or volatile prediction markets on Jupiter.
* **Open Source Utility:** Built as a modular TypeScript library, ensuring it can be integrated into existing Solana game templates.