/**
 * Jup-Predict SDK — Market Manager
 * Developer-facing module for discovering events, markets, and orderbooks.
 */

import { ApiClient } from '../api/ApiClient.js';
import type {
    JupEvent,
    JupMarket,
    JupOrderbook,
    ListEventsParams,
    SearchEventsParams,
    TradingStatusResponse,
} from '../types.js';

export class MarketManager {
    private api: ApiClient;

    constructor(api: ApiClient) {
        this.api = api;
    }

    // ── Events ───────────────────────────────────────────────────────────────

    /**
     * List prediction events with optional filters.
     * @example
     * const events = await sdk.market.listEvents({ category: 'crypto', filter: 'trending' });
     */
    async listEvents(opts?: ListEventsParams): Promise<JupEvent[]> {
        const params: Record<string, string> = {};
        if (opts?.category) params.category = opts.category;
        if (opts?.subcategory) params.subcategory = opts.subcategory;
        if (opts?.filter) params.filter = opts.filter;
        if (opts?.sortBy) params.sortBy = opts.sortBy;
        if (opts?.sortDirection) params.sortDirection = opts.sortDirection;
        if (opts?.includeMarkets !== undefined) params.includeMarkets = String(opts.includeMarkets);
        if (opts?.start !== undefined) params.start = String(opts.start);
        if (opts?.end !== undefined) params.end = String(opts.end);

        return this.api.get<JupEvent[]>('/events', params);
    }

    /**
     * Search events by keyword.
     * @example
     * const results = await sdk.market.searchEvents('nba', 10);
     */
    async searchEvents(query: string, limit?: number): Promise<JupEvent[]> {
        const params: Record<string, string> = { query };
        if (limit !== undefined) params.limit = String(limit);

        return this.api.get<JupEvent[]>('/events/search', params);
    }

    /**
     * Get full details for a single event.
     */
    async getEvent(eventId: string): Promise<JupEvent> {
        return this.api.get<JupEvent>(`/events/${eventId}`);
    }

    /**
     * Get personalized event suggestions for a wallet.
     */
    async getSuggestedEvents(pubkey: string): Promise<JupEvent[]> {
        return this.api.get<JupEvent[]>(`/events/suggested/${pubkey}`);
    }

    // ── Markets ──────────────────────────────────────────────────────────────

    /**
     * Get full details for a specific market.
     * Prices are in micro-USD — use `microUsdToUsd()` to convert.
     * @example
     * const market = await sdk.market.getMarket('market-456');
     * console.log(`YES price: $${microUsdToUsd(market.buyYesPriceUsd)}`);
     */
    async getMarket(marketId: string): Promise<JupMarket> {
        return this.api.get<JupMarket>(`/markets/${marketId}`);
    }

    /**
     * Get the live orderbook for a market.
     * Returns both cent-denominated and dollar-denominated levels.
     */
    async getOrderbook(marketId: string): Promise<JupOrderbook> {
        return this.api.get<JupOrderbook>(`/orderbook/${marketId}`);
    }

    // ── Trading Status ───────────────────────────────────────────────────────

    /**
     * Check if the Jupiter Prediction platform is currently accepting trades.
     */
    async isTradingActive(): Promise<boolean> {
        const res = await this.api.get<TradingStatusResponse>('/trading-status');
        return res.trading_active;
    }
}
