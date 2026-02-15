import { EventEmitter } from 'eventemitter3';
import type { MarketManager } from './MarketManager.js';
import type { JupMarket, JupOrderbook, JupQuoteResponse, ImpulseConfig } from '../types.js';
import { microUsdToUsd } from '../types.js';

// ─── Default probe constants ─────────────────────────────────────────────────

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const DEFAULT_PROBE_AMOUNT = '10000000'; // 10 USDC (6 decimals)
const QUOTE_API_BASE = 'https://api.jup.ag/swap/v1';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MarketState {
    impulseScore: number;       // 0-100
    spread: number;             // YES buy-sell spread as a fraction (e.g. 0.03 = 3%)
    volume24h: number;          // volume in USD
    liquidity: number;          // liquidity in USD
    priceImpactPct: number;     // Jupiter Quote price impact (e.g. 0.0001)
    isSurge: boolean;
}

export const MARKET_EVENTS = {
    IMPULSE_UPDATE: 'impulse_update',
    MARKET_EXPEDITION: 'market_expedition'
};

// ─── ImpulseEngine ───────────────────────────────────────────────────────────

export class ImpulseEngine extends EventEmitter {
    private isRunning: boolean = false;
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private marketManager: MarketManager;
    private marketId: string;

    // Jupiter Quote API config
    private apiKey: string;
    private probeInputMint: string;
    private probeOutputMint: string;
    private probeAmount: string;

    constructor(
        marketManager: MarketManager,
        marketId: string,
        apiKey: string,
        impulseConfig?: ImpulseConfig,
    ) {
        super();
        this.marketManager = marketManager;
        this.marketId = marketId;
        this.apiKey = apiKey;
        this.probeInputMint = impulseConfig?.probeInputMint ?? USDC_MINT;
        this.probeOutputMint = impulseConfig?.probeOutputMint ?? SOL_MINT;
        this.probeAmount = impulseConfig?.probeAmount ?? DEFAULT_PROBE_AMOUNT;
    }

    /**
     * Start polling the orderbook + Jupiter Quote API at a given interval.
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
            // Fetch all three data sources concurrently
            const [market, orderbook, priceImpact] = await Promise.all([
                this.marketManager.getMarket(this.marketId),
                this.marketManager.getOrderbook(this.marketId),
                this.fetchPriceImpact(),
            ]);

            const spread = this.calculateSpread(market);
            const volume = microUsdToUsd(market.volumeUsd);
            const liquidity = microUsdToUsd(market.liquidityUsd);
            const depth = this.calculateDepth(orderbook);
            const impulseScore = this.calculateImpulse(spread, volume, depth, priceImpact);
            const isSurge = impulseScore > 80;

            const state: MarketState = {
                impulseScore,
                spread,
                volume24h: volume,
                liquidity,
                priceImpactPct: priceImpact,
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

    // ── Jupiter Quote API ────────────────────────────────────────────────

    /**
     * Fetch a probe quote from the Jupiter Swap Quote API.
     * Returns the `priceImpactPct` as a number (e.g. 0.0001).
     *
     * This acts as a liquidity proxy — high price impact on a small trade
     * means thin liquidity, which correlates with high volatility.
     */
    private async fetchPriceImpact(): Promise<number> {
        try {
            const params = new URLSearchParams({
                inputMint: this.probeInputMint,
                outputMint: this.probeOutputMint,
                amount: this.probeAmount,
                slippageBps: '50',
            });

            const response = await fetch(`${QUOTE_API_BASE}/quote?${params}`, {
                headers: {
                    'x-api-key': this.apiKey,
                },
            });

            if (!response.ok) {
                console.warn(`ImpulseEngine: Quote API returned ${response.status}`);
                return 0;
            }

            const data = await response.json() as JupQuoteResponse;
            return parseFloat(data.priceImpactPct) || 0;
        } catch {
            // Non-fatal: quote API failure shouldn't break the polling loop
            return 0;
        }
    }

    // ── Calculations ─────────────────────────────────────────────────────

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
     *
     * 4 equally-weighted components (25 points each):
     *
     * | Component      | Signal                                | max pts |
     * |----------------|---------------------------------------|---------|
     * | Spread         | Prediction market bid-ask gap         | 25      |
     * | Volume         | 24h dollar volume                     | 25      |
     * | Depth          | Orderbook thinness (inverse penalty)  | 25      |
     * | Price Impact   | Jupiter Quote `priceImpactPct`        | 25      |
     *
     * Higher spread + higher volume + thinner orderbook + higher price impact → higher MI.
     */
    public calculateImpulse(
        spread: number,
        volume: number,
        depth: number = 0,
        priceImpactPct: number = 0,
    ): number {
        // Spread: 2% → 25 pts
        const spreadScore = Math.min((spread / 0.02) * 25, 25);

        // Volume: $1M → 25 pts
        const volumeScore = Math.min((volume / 1_000_000) * 25, 25);

        // Depth: thin orderbook → high score (inverse penalty)
        // 50k contracts → 25pt penalty (low impulse); <1k → nearly 0 penalty (high impulse)
        const depthPenalty = depth > 0 ? Math.min((depth / 50_000) * 25, 25) : 0;
        const depthScore = 25 - depthPenalty;

        // Price Impact: 1% impact → 25 pts (high slippage = volatile)
        const impactScore = Math.min((priceImpactPct / 0.01) * 25, 25);

        return Math.floor(spreadScore + volumeScore + depthScore + impactScore);
    }
}
