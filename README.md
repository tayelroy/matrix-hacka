# Jup-Predict SDK

Jup-Predict is a high-performance TypeScript SDK designed for building prediction market applications on Solana via Jupiter Mobile V3. The toolkit provides streamlined session management and real-time market volatility analytics to enable high-frequency trading experiences.

---

## Core Features

* **Session Management**: Implements ephemeral session keys that allow users to pre-authorize trading limits. This enables a "one-tap" execution flow where subsequent trades do not require manual wallet approvals for every transaction.
* **Market Impulse (MI) Engine**: A specialized analytics component that monitors order book health and liquidity depth. It calculates a normalized MI Score (0-100) based on bid-ask spreads and volume density to signal market volatility.
* **Jupiter Integration**: Built to interface directly with Jupiter's liquidity oracles and Quote APIs for accurate price discovery and execution.

---

## Technical Architecture

### Impulse Engine

The engine utilizes a polling mechanism to fetch real-time market data. It evaluates market state through:

* **Spread Analysis**: Measuring the gap between bid and ask prices to determine liquidity overhead.
* **Slippage Forecasting**: Using Jupiter Quote API data to calculate the potential price impact of trades.
* **Event System**: Emits standardized events when market conditions shift from "Stable" to "Impulse" states.

### Session Manager

Designed for security and speed, the Session Manager handles:

* **Delegation Handshake**: A one-time on-chain transaction that authorizes a temporary session key.
* **Spending Limit Guardrails**: Enforces maximum spend and time-to-live (TTL) constraints defined by the developer.
* **Partial Signing**: Automatically applies session key signatures to transactions before network submission.

---

## Installation

```bash
npm install jup-predict

```

---

## Quick Start

### Initialize the SDK

Configure the SDK with a specific Program ID and your preferred RPC endpoint.

```typescript
import { JupPredict } from 'jup-predict';

const sdk = new JupPredict(
  'YOUR_PROGRAM_ID',
  'https://api.mainnet-beta.solana.com'
);

```

### Monitor Market Impulse

Listen for volatility changes to inform trading strategies.

```typescript
sdk.market.on('impulse_update', (state) => {
  console.log('Current MI Score:', state.impulseScore);
  if (state.isSurge) {
    console.log('High volatility detected.');
  }
});

sdk.market.startPolling(1000);

```

### Start a Trading Session

Initialize a session to enable high-frequency execution without repeated wallet popups.

```typescript
const sessionPublicKey = await sdk.session.initJupSession(walletAdapter);

```
