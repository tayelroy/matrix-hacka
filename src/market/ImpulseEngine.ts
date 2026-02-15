import { EventEmitter } from 'eventemitter3';
import type { MarketManager } from './MarketManager.js';
import type { JupMarket, JupOrderbook } from '../types.js';
import { microUsdToUsd } from '../types.js';

export interface MarketState {
    impulseScore: number; // 0-100
    spread: number;       // YES buy-sell spread as a fraction (e.g. 0.03 = 3%)
    volume24h: number;    // volume in USD
    liquidity: number;    // liquidity in USD
    isSurge: boolean;
}

export const MARKET_EVENTS = {
    IMPULSE_UPDATE: 'impulse_update',
    MARKET_EXPEDITION: 'market_expedition'
};

export class ImpulseEngine extends EventEmitter {
    private isRunning: boolean = false;
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private marketManager: MarketManager;
    private marketId: string;

    constructor(marketManager: MarketManager, marketId: string) {
        super();
        this.marketManager = marketManager;
        this.marketId = marketId;
    }

    /**
     * Start polling the orderbook at a given interval.
     * Emits `impulse_update` on every tick, and `market_expedition` during surges.
     */
    startPolling(intervalMs: number = 1000): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.pollInterval = setInterval(() => this.pollMarketData(), intervalMs);
    }

    stopPolling(): void {
        this.isRunning = false;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Change the market being monitored on the fly.
     */
    setMarketId(marketId: string): void {
        this.marketId = marketId;
    }

    private async pollMarketData(): Promise<void> {
        try {
            // Fetch real data from jupiter API
            const [market, orderbook] = await Promise.all([
                this.marketManager.getMarket(this.marketId),
                this.marketManager.getOrderbook(this.marketId),
            ]);

            const spread = this.calculateSpread(market);
            const volume = microUsdToUsd(market.volumeUsd);
            const liquidity = microUsdToUsd(market.liquidityUsd);
            const depth = this.calculateDepth(orderbook);
            const impulseScore = this.calculateImpulse(spread, volume, depth);
            const isSurge = impulseScore > 80;

            const state: MarketState = {
                impulseScore,
                spread,
                volume24h: volume,
                liquidity,
                isSurge,
            };

            this.emit(MARKET_EVENTS.IMPULSE_UPDATE, state);

            if (isSurge) {
                this.emit(MARKET_EVENTS.MARKET_EXPEDITION, {
                    multiplier: 2.0,
                    duration: 60,
                });
            }
        } catch (error) {
            console.error('ImpulseEngine: Error polling market data:', error);
        }
    }

    /**
     * Calculate the bid-ask spread from buy/sell YES prices.
     * Returns a fraction (e.g. 0.04 = 4% spread).
     */
    private calculateSpread(market: JupMarket): number {
        const buyYes = parseInt(market.buyYesPriceUsd, 10);
        const sellYes = parseInt(market.sellYesPriceUsd, 10);

        if (sellYes === 0) return 0;

        return (buyYes - sellYes) / sellYes;
    }

    /**
     * Calculate total depth from the orderbook.
     * Sums the quantity on both YES and NO sides.
     */
    private calculateDepth(orderbook: JupOrderbook): number {
        let total = 0;
        for (const [, qty] of orderbook.yes) total += qty;
        for (const [, qty] of orderbook.no) total += qty;
        return total;
    }

    /**
     * Calculates the Market Impulse score (0-100).
     * Higher spread + Higher volume + Lower depth = Higher Impulse (more volatile).
     */
    public calculateImpulse(spread: number, volume: number, depth: number = 0): number {
        // Spread component: 2% spread -> ~50 points
        const spreadScore = Math.min((spread / 0.02) * 35, 35);

        // Volume component: $1M volume -> ~35 points
        const volumeScore = Math.min((volume / 1_000_000) * 35, 35);

        // Depth component: low depth increases score (thin orderbook = volatile)
        // 50k contracts -> ~30 points of reduction; very thin (<1k) -> near 0 reduction
        const depthPenalty = depth > 0 ? Math.min((depth / 50_000) * 30, 30) : 0;
        const depthScore = 30 - depthPenalty;

        return Math.floor(spreadScore + volumeScore + depthScore);
    }
}
