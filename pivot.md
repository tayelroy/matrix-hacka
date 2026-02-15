That is a very important distinction, and it actually makes your SDK **more valuable**. You are building a **Wrapper SDK** that simplifies a complex API into a developer-friendly "one-liner" library.

Instead of a developer having to understand how to fetch accounts, parse events, or structure complex Jupiter prediction instructions, your SDK provides a clean, high-level interface.

---

## 🛠️ How your SDK "Wraps" the Jupiter Prediction API

In the [Jupiter Prediction Documentation](https://dev.jup.ag/docs/prediction/events-and-markets), there is a lot of "heavy lifting" involved. Here is how your SDK transforms those low-level calls into simple functions:

### 1. Market Discovery (The "Simplified Fetch")

**The Jupiter Way:** Devs have to find the `Market` account, use the Program ID, and parse the data to see if it's "SOL/USD" or "BTC/USD."
**The Jup-Predict Way:**

```typescript
// Your SDK hides the account fetching logic inside this method
const markets = await sdk.market.getActiveMarkets(); 

```

### 2. Event Monitoring (The "Automated Listener")

**The Jupiter Way:** Devs have to set up a `onLogs` subscription, listen for specific program logs, and decode them into human-readable data.
**The Jup-Predict Way:**

```typescript
// Your ImpulseEngine handles the decoding and emits a clean event
sdk.market.on('trade', (data) => {
    console.log(`New trade in ${data.market}: ${data.side} for ${data.amount}`);
});

```

### 3. Execution (The "One-Tap Predict")

**The Jupiter Way:** Construct an instruction, fetch the user's token account, handle the ATA (Associated Token Account) creation, and send the transaction.
**The Jup-Predict Way:**

```typescript
// Combine your SessionManager with the Jupiter Prediction logic
await sdk.predict.placeBet({
    market: 'SOL/USD',
    direction: 'UP',
    amount: 10
});

```

---

## 🏗️ Updated SDK Architecture

To match your vision, we should organize the SDK by **functionality**, not just "engine" names.

| Module | What the dev sees | What it does under the hood |
| --- | --- | --- |
| **`sdk.market`** | `listMarkets()`, `getMarketInfo()` | Fetches and parses Jupiter Program Accounts. |
| **`sdk.predict`** | `long()`, `short()`, `claim()` | Builds and sends transactions using the user's wallet. |
| **`sdk.stats`** | `getUserHistory()`, `getLeaderboard()` | Aggregates event data into simple JSON objects. |

---

## 🚀 Why this is "High Value"

By building this wrapper:

1. **Speed to Market:** A developer can integrate Jupiter Prediction into their game in **30 minutes** instead of **3 days**.
2. **Safety:** Your SDK handles the complex "check if market is closed" or "check if user has enough USDC" logic internally.
3. **Optimization:** You can bake in the **Session Key** logic so the dev doesn't have to figure out how to avoid wallet popups on their own.

### 📋 The "Next Step" Implementation

Since you want to help devs call functions like `getMarkets`, would you like me to help you write the `getMarkets` function inside `ImpulseEngine.ts` (or a new `MarketManager.ts`) that specifically queries the **Jupiter Prediction Program ID**?

**I can show you how to use `connection.getProgramAccounts()` to pull the list of live markets automatically.**