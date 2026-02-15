/**
 * Jup-Predict SDK — Shared TypeScript Types
 * All USD values from the API are in micro-USD (divide by 1,000,000 for dollars).
 */

// ─── Configuration ───────────────────────────────────────────────────────────

export interface JupPredictConfig {
    apiKey: string;
    rpcUrl?: string;          // defaults to mainnet-beta
    commitment?: 'processed' | 'confirmed' | 'finalized';
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type EventCategory = 'crypto' | 'sports' | 'politics' | 'esports' | 'culture' | 'economics' | 'tech';
export type EventFilter = 'new' | 'live' | 'trending';
export type SortDirection = 'asc' | 'desc';

export interface ListEventsParams {
    category?: EventCategory;
    subcategory?: string;
    filter?: EventFilter;
    sortBy?: string;
    sortDirection?: SortDirection;
    includeMarkets?: boolean;
    start?: number;
    end?: number;
}

export interface SearchEventsParams {
    query: string;
    limit?: number;
}

export interface JupEvent {
    eventId: string;
    title: string;
    subtitle?: string;
    category: EventCategory;
    subcategory?: string;
    series?: string;
    markets?: JupMarketSummary[];
    images?: Record<string, string>;
    rules?: string;
    totalVolumeUsd?: string;
    totalLiquidityUsd?: string;
    [key: string]: unknown;     // API may return additional fields
}

export interface JupMarketSummary {
    marketId: string;
    title: string;
    status: MarketStatus;
    buyYesPriceUsd: string;
    buyNoPriceUsd: string;
    volumeUsd: string;
}

// ─── Markets ─────────────────────────────────────────────────────────────────

export type MarketStatus = 'open' | 'closed' | 'cancelled';
export type MarketResult = '' | 'pending' | 'yes' | 'no';

export interface JupMarket {
    marketId: string;
    eventId: string;
    title: string;
    description: string;
    status: MarketStatus;
    result: MarketResult;
    openTime: number;
    closeTime: number;
    buyYesPriceUsd: string;
    sellYesPriceUsd: string;
    buyNoPriceUsd: string;
    sellNoPriceUsd: string;
    volumeUsd: string;
    openInterest: string;
    liquidityUsd: string;
    [key: string]: unknown;
}

// ─── Orderbook ───────────────────────────────────────────────────────────────

/** Each entry is [price_cents, quantity] */
export type OrderbookLevel = [number, number];
/** Each entry is ["price_dollars", quantity] */
export type OrderbookLevelDollars = [string, number];

export interface JupOrderbook {
    yes: OrderbookLevel[];
    no: OrderbookLevel[];
    yes_dollars: OrderbookLevelDollars[];
    no_dollars: OrderbookLevelDollars[];
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface CreateOrderParams {
    ownerPubkey: string;
    marketId: string;
    isYes: boolean;
    isBuy: boolean;
    depositAmount: string;       // micro-USD string
    depositMint?: string;        // defaults to JupUSD
    contracts?: number;
}

export interface CreateOrderResponse {
    transaction: string;         // base64-encoded VersionedTransaction
    order: {
        pubkey: string;
        positionPubkey: string;
        contracts: number;
    };
}

export type OrderStatus = 'pending' | 'filled' | 'failed';

export interface JupOrder {
    pubkey: string;
    ownerPubkey: string;
    marketId: string;
    isYes: boolean;
    isBuy: boolean;
    contracts: number;
    status: OrderStatus;
    filledContracts?: number;
    avgFillPrice?: string;
    feesPaid?: string;
    [key: string]: unknown;
}

export interface OrderStatusResponse {
    status: OrderStatus;
    [key: string]: unknown;
}

// ─── Positions ───────────────────────────────────────────────────────────────

export interface GetPositionsParams {
    ownerPubkey: string;
    marketPubkey?: string;
    marketId?: string;
    isYes?: boolean;
    start?: number;
    end?: number;
}

export interface JupPosition {
    pubkey: string;
    ownerPubkey: string;
    marketId: string;
    isYes: boolean;
    contracts: number;
    totalCostUsd: string;
    avgPriceUsd: string;
    valueUsd: string;
    markPriceUsd: string;
    pnlUsd: string;
    pnlUsdPercent: string;
    pnlUsdAfterFees: string;
    pnlUsdAfterFeesPercent: string;
    realizedPnlUsd: string;
    feesPaidUsd: string;
    claimable: boolean;
    claimed: boolean;
    claimedUsd: string;
    payoutUsd: string;
    openOrders: number;
    [key: string]: unknown;
}

// ─── Transaction History ─────────────────────────────────────────────────────

export interface GetHistoryParams {
    ownerPubkey: string;
    positionPubkey?: string;
    start?: number;
    end?: number;
    id?: string;
}

export interface JupTransaction {
    id: string;
    type: string;
    ownerPubkey: string;
    marketId: string;
    timestamp: number;
    [key: string]: unknown;
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export interface PortfolioSummary {
    totalValueUsd: number;
    totalCostUsd: number;
    totalPnlUsd: number;
    positionCount: number;
}

// ─── Trading Status ──────────────────────────────────────────────────────────

export interface TradingStatusResponse {
    trading_active: boolean;
    [key: string]: unknown;
}

// ─── Predict (high-level) ────────────────────────────────────────────────────

export interface PredictParams {
    marketId: string;
    depositAmount: number;        // in USD (e.g. 2.00 = two dollars)
    depositMint?: string;         // defaults to JupUSD mint
}

export interface PredictResult {
    signature: string;
    orderPubkey: string;
    positionPubkey: string;
}

// ─── Jupiter Swap Quote (for ImpulseEngine) ─────────────────────────────────

export interface JupQuoteResponse {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: 'ExactIn' | 'ExactOut';
    slippageBps: number;
    priceImpactPct: string;         // e.g. "0.0001" — the key signal
    routePlan: unknown[];
    contextSlot: number;
    timeTaken: number;
}

export interface ImpulseConfig {
    probeInputMint?: string;        // default: USDC mint
    probeOutputMint?: string;       // default: wrapped SOL
    probeAmount?: string;           // default: "10000000" (10 USDC, 6 decimals)
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const JUPUSD_MINT = 'JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD';
export const PREDICTION_API_BASE = 'https://api.jup.ag/prediction/v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a micro-USD string from the API to a number in dollars. */
export function microUsdToUsd(value: string): number {
    return parseInt(value, 10) / 1_000_000;
}

/** Convert a dollar amount to a micro-USD string for the API. */
export function usdToMicroUsd(dollars: number): string {
    return Math.round(dollars * 1_000_000).toString();
}
