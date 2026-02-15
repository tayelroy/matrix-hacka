# Jup-Predict SDK

A developer-friendly wrapper around the **[Jupiter Prediction API](https://dev.jup.ag/docs/prediction)**. Integrate prediction markets into your app in minutes, not days.

---

## Installation

```bash
npm install jup-predict
```

## Quick Start

```typescript
import { JupPredict } from 'jup-predict';

const sdk = new JupPredict({
    apiKey: 'YOUR_API_KEY',       // from https://portal.jup.ag
    rpcUrl: 'https://api.mainnet-beta.solana.com',
});
```

---

## Modules

### `sdk.market` — Discover Events & Markets

```typescript
// List trending crypto events (with embedded markets)
const events = await sdk.market.listEvents({
    category: 'crypto',
    filter: 'trending',
    includeMarkets: true,
});

// Search for specific topics
const results = await sdk.market.searchEvents('solana', 10);

// Get full market details (prices in micro-USD)
const market = await sdk.market.getMarket('market-456');
console.log(`YES: $${microUsdToUsd(market.buyYesPriceUsd)}`);

// Get live orderbook
const orderbook = await sdk.market.getOrderbook('market-456');

// Check if trading is active
const isActive = await sdk.market.isTradingActive();
```

### `sdk.predict` — Buy & Sell Contracts

```typescript
import { microUsdToUsd } from 'jup-predict';

// Set your wallet adapter
sdk.predict.setAdapter(walletAdapter);

// Buy YES contracts ($2.00)
const result = await sdk.predict.buyYes({
    marketId: 'market-456',
    depositAmount: 2.00,
});
console.log('Tx:', result.signature);

// Buy NO contracts
await sdk.predict.buyNo({ marketId: 'market-456', depositAmount: 5.00 });

// Wait for order to fill
const status = await sdk.predict.waitForFill(result.orderPubkey);

// Close a position
await sdk.predict.closePosition(result.positionPubkey);

// Close ALL positions
await sdk.predict.closeAllPositions();
```

### `sdk.stats` — Positions, Orders & History

```typescript
const pubkey = wallet.publicKey.toString();

// Get all positions
const positions = await sdk.stats.getPositions(pubkey);

// Portfolio P&L summary (values in dollars)
const summary = await sdk.stats.getPortfolioSummary(pubkey);
console.log(`Total P&L: $${summary.totalPnlUsd.toFixed(2)}`);

// Query orders & transaction history
const orders = await sdk.stats.getOrders(pubkey);
const history = await sdk.stats.getHistory(pubkey);
```

### Real-Time Market Impulse

```typescript
// Create a real-time monitor for a specific market
const engine = sdk.createImpulseEngine('market-456');

engine.on('impulse_update', (state) => {
    console.log(`MI Score: ${state.impulseScore}/100`);
    console.log(`Spread: ${(state.spread * 100).toFixed(2)}%`);
});

engine.on('market_expedition', (data) => {
    console.log(`🚀 Surge! ${data.multiplier}x for ${data.duration}s`);
});

engine.startPolling(1000);
```

---

## Architecture

| Module | Developer API | Under the Hood |
|---|---|---|
| **`sdk.market`** | `listEvents()`, `getMarket()`, `getOrderbook()` | `GET /events`, `GET /markets/{id}`, `GET /orderbook/{id}` |
| **`sdk.predict`** | `buyYes()`, `buyNo()`, `closePosition()` | `POST /orders` → sign → submit → confirm |
| **`sdk.stats`** | `getPositions()`, `getPortfolioSummary()` | `GET /positions`, aggregation math |
| **`ImpulseEngine`** | `on('impulse_update')`, `startPolling()` | Real-time orderbook polling + MI score |

---

## Session Keys (High-Frequency)

For game-like experiences with rapid trades:

```typescript
const sessionKey = await sdk.session.initJupSession(walletAdapter);
// Subsequent trades use the session key — no wallet popups
```

---

## License

ISC
