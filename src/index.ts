/**
 * Jup-Predict SDK
 * A developer-friendly wrapper around the Jupiter Prediction API.
 *
 * @example
 * ```ts
 * import { JupPredict } from 'jup-predict';
 *
 * const sdk = new JupPredict({ apiKey: 'YOUR_API_KEY' });
 *
 * // Discover markets
 * const events = await sdk.market.listEvents({ category: 'crypto', filter: 'trending' });
 *
 * // Place a prediction
 * sdk.predict.setAdapter(walletAdapter);
 * const result = await sdk.predict.buyYes({ marketId: 'market-456', depositAmount: 2.00 });
 *
 * // Check your portfolio
 * const summary = await sdk.stats.getPortfolioSummary(wallet.publicKey.toString());
 * ```
 */

import { Connection } from '@solana/web3.js';

import { ApiClient } from './api/ApiClient.js';
import { MarketManager } from './market/MarketManager.js';
import { ImpulseEngine, MARKET_EVENTS, type MarketState } from './market/ImpulseEngine.js';
import { PredictManager } from './predict/PredictManager.js';
import { StatsManager } from './stats/StatsManager.js';
import { SessionManager } from './session/SessionManager.js';
import type { JupPredictConfig } from './types.js';

export const version = '0.1.0';

export class JupPredict {
    /** Discover events, markets, and orderbooks. */
    public market: MarketManager;

    /** Buy/sell prediction contracts. */
    public predict: PredictManager;

    /** Query positions, orders, history, and portfolio P&L. */
    public stats: StatsManager;

    /** Session key management for high-frequency trading. */
    public session: SessionManager;

    /** Internal connection instance. */
    private connection: Connection;

    /** Internal API client. */
    private api: ApiClient;

    constructor(config: JupPredictConfig) {
        this.api = new ApiClient(config.apiKey);
        this.connection = new Connection(
            config.rpcUrl ?? 'https://api.mainnet-beta.solana.com',
            config.commitment ?? 'confirmed',
        );

        // Wire up all modules
        this.market = new MarketManager(this.api);
        this.predict = new PredictManager(this.api, this.connection);
        this.stats = new StatsManager(this.api);
        this.session = new SessionManager(
            { programId: '', maxSpend: 50, ttl: 3600 },
            this.connection,
        );
    }

    /**
     * Create an ImpulseEngine for real-time market monitoring.
     * This is a factory because each engine tracks a specific market.
     *
     * @example
     * const engine = sdk.createImpulseEngine('market-456');
     * engine.on('impulse_update', (state) => console.log(state.impulseScore));
     * engine.startPolling(1000);
     */
    createImpulseEngine(marketId: string): ImpulseEngine {
        return new ImpulseEngine(this.market, marketId);
    }

    /**
     * Get the underlying Solana connection.
     */
    getConnection(): Connection {
        return this.connection;
    }
}

// ── Re-exports ───────────────────────────────────────────────────────────────

export { ApiClient } from './api/ApiClient.js';
export { JupApiError } from './api/ApiClient.js';
export { MarketManager } from './market/MarketManager.js';
export { ImpulseEngine, MARKET_EVENTS } from './market/ImpulseEngine.js';
export type { MarketState } from './market/ImpulseEngine.js';
export { PredictManager } from './predict/PredictManager.js';
export { StatsManager } from './stats/StatsManager.js';
export { SessionManager } from './session/SessionManager.js';
export type { JupiterAdapter, SessionConfig } from './session/Adapter.js';
export * from './types.js';
