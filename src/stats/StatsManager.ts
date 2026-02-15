/**
 * Jup-Predict SDK — Stats Manager
 * Read-only queries for positions, orders, history, and portfolio aggregation.
 */

import { ApiClient } from '../api/ApiClient.js';
import type {
    GetHistoryParams,
    GetPositionsParams,
    JupOrder,
    JupPosition,
    JupTransaction,
    PortfolioSummary,
} from '../types.js';

export class StatsManager {
    private api: ApiClient;

    constructor(api: ApiClient) {
        this.api = api;
    }

    // ── Positions ────────────────────────────────────────────────────────────

    /**
     * Get all positions for a wallet, optionally filtered.
     * @example
     * const positions = await sdk.stats.getPositions(wallet.publicKey.toString());
     */
    async getPositions(ownerPubkey: string, opts?: Omit<GetPositionsParams, 'ownerPubkey'>): Promise<JupPosition[]> {
        const params: Record<string, string> = { ownerPubkey };
        if (opts?.marketPubkey) params.marketPubkey = opts.marketPubkey;
        if (opts?.marketId) params.marketId = opts.marketId;
        if (opts?.isYes !== undefined) params.isYes = String(opts.isYes);
        if (opts?.start !== undefined) params.start = String(opts.start);
        if (opts?.end !== undefined) params.end = String(opts.end);

        return this.api.get<JupPosition[]>('/positions', params);
    }

    /**
     * Get a single position by its pubkey.
     */
    async getPosition(positionPubkey: string): Promise<JupPosition> {
        return this.api.get<JupPosition>(`/positions/${positionPubkey}`);
    }

    // ── Orders ───────────────────────────────────────────────────────────────

    /**
     * Get all orders for a wallet.
     */
    async getOrders(ownerPubkey: string): Promise<JupOrder[]> {
        return this.api.get<JupOrder[]>('/orders', { ownerPubkey });
    }

    // ── History ──────────────────────────────────────────────────────────────

    /**
     * Get transaction history for a wallet.
     */
    async getHistory(ownerPubkey: string, opts?: Omit<GetHistoryParams, 'ownerPubkey'>): Promise<JupTransaction[]> {
        const params: Record<string, string> = { ownerPubkey };
        if (opts?.positionPubkey) params.positionPubkey = opts.positionPubkey;
        if (opts?.start !== undefined) params.start = String(opts.start);
        if (opts?.end !== undefined) params.end = String(opts.end);
        if (opts?.id) params.id = opts.id;

        return this.api.get<JupTransaction[]>('/history', params);
    }

    // ── Aggregation ──────────────────────────────────────────────────────────

    /**
     * Compute a portfolio summary from all positions.
     * Values are returned in **dollars** (not micro-USD).
     * @example
     * const summary = await sdk.stats.getPortfolioSummary(wallet.publicKey.toString());
     * console.log(`Total P&L: $${summary.totalPnlUsd.toFixed(2)}`);
     */
    async getPortfolioSummary(ownerPubkey: string): Promise<PortfolioSummary> {
        const positions = await this.getPositions(ownerPubkey);

        let totalValue = 0;
        let totalCost = 0;
        let totalPnl = 0;

        for (const pos of positions) {
            totalValue += parseInt(pos.valueUsd, 10) || 0;
            totalCost += parseInt(pos.totalCostUsd, 10) || 0;
            totalPnl += parseInt(pos.pnlUsd, 10) || 0;
        }

        return {
            totalValueUsd: totalValue / 1_000_000,
            totalCostUsd: totalCost / 1_000_000,
            totalPnlUsd: totalPnl / 1_000_000,
            positionCount: positions.length,
        };
    }
}
