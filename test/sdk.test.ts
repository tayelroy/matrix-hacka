import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JupPredict, MARKET_EVENTS } from '../src/index';

// ── Mock fetch globally ──────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockJsonResponse(data: unknown, status = 200) {
    return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText: 'OK',
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
    });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('JupPredict SDK', () => {
    let sdk: JupPredict;

    beforeEach(() => {
        mockFetch.mockReset();
        sdk = new JupPredict({ apiKey: 'test-key-123' });
    });

    // ── Initialization ───────────────────────────────────────────────────

    it('should initialize with all modules', () => {
        expect(sdk.market).toBeDefined();
        expect(sdk.predict).toBeDefined();
        expect(sdk.stats).toBeDefined();
        expect(sdk.session).toBeDefined();
    });

    it('should create an ImpulseEngine for a market', () => {
        const engine = sdk.createImpulseEngine('market-456');
        expect(engine).toBeDefined();
        expect(engine.startPolling).toBeTypeOf('function');
        expect(engine.stopPolling).toBeTypeOf('function');
    });

    // ── MarketManager ────────────────────────────────────────────────────

    describe('market', () => {
        it('should list events with correct API call', async () => {
            const mockEvents = [{ eventId: 'e1', title: 'Test Event' }];
            mockFetch.mockReturnValueOnce(mockJsonResponse(mockEvents));

            const events = await sdk.market.listEvents({ category: 'crypto', filter: 'trending' });

            expect(events).toEqual(mockEvents);
            expect(mockFetch).toHaveBeenCalledTimes(1);

            const [url, opts] = mockFetch.mock.calls[0];
            expect(url).toContain('/events');
            expect(url).toContain('category=crypto');
            expect(url).toContain('filter=trending');
            expect(opts.headers['x-api-key']).toBe('test-key-123');
        });

        it('should search events', async () => {
            const mockResults = [{ eventId: 'e2', title: 'NBA Finals' }];
            mockFetch.mockReturnValueOnce(mockJsonResponse(mockResults));

            const results = await sdk.market.searchEvents('nba', 5);

            expect(results).toEqual(mockResults);
            const [url] = mockFetch.mock.calls[0];
            expect(url).toContain('/events/search');
            expect(url).toContain('query=nba');
            expect(url).toContain('limit=5');
        });

        it('should get market details', async () => {
            const mockMarket = {
                marketId: 'market-456',
                buyYesPriceUsd: '650000',
                sellYesPriceUsd: '620000',
                volumeUsd: '450000',
            };
            mockFetch.mockReturnValueOnce(mockJsonResponse(mockMarket));

            const market = await sdk.market.getMarket('market-456');

            expect(market.marketId).toBe('market-456');
            const [url] = mockFetch.mock.calls[0];
            expect(url).toContain('/markets/market-456');
        });

        it('should get orderbook', async () => {
            const mockOrderbook = {
                yes: [[1, 346014], [2, 10568]],
                no: [[1, 219], [2, 14]],
                yes_dollars: [['0.01', 346014]],
                no_dollars: [['0.01', 219]],
            };
            mockFetch.mockReturnValueOnce(mockJsonResponse(mockOrderbook));

            const ob = await sdk.market.getOrderbook('market-456');

            expect(ob.yes.length).toBe(2);
            expect(ob.no.length).toBe(2);
        });

        it('should check trading status', async () => {
            mockFetch.mockReturnValueOnce(mockJsonResponse({ trading_active: true }));

            const active = await sdk.market.isTradingActive();

            expect(active).toBe(true);
        });
    });

    // ── StatsManager ─────────────────────────────────────────────────────

    describe('stats', () => {
        it('should get positions', async () => {
            const mockPositions = [
                { pubkey: 'pos1', contracts: 100, valueUsd: '950000', totalCostUsd: '700000', pnlUsd: '250000' },
            ];
            mockFetch.mockReturnValueOnce(mockJsonResponse(mockPositions));

            const positions = await sdk.stats.getPositions('wallet-abc');

            expect(positions).toHaveLength(1);
            const [url] = mockFetch.mock.calls[0];
            expect(url).toContain('ownerPubkey=wallet-abc');
        });

        it('should calculate portfolio summary', async () => {
            const mockPositions = [
                { valueUsd: '2000000', totalCostUsd: '1500000', pnlUsd: '500000' },
                { valueUsd: '1000000', totalCostUsd: '1200000', pnlUsd: '-200000' },
            ];
            mockFetch.mockReturnValueOnce(mockJsonResponse(mockPositions));

            const summary = await sdk.stats.getPortfolioSummary('wallet-abc');

            expect(summary.totalValueUsd).toBeCloseTo(3.0);
            expect(summary.totalCostUsd).toBeCloseTo(2.7);
            expect(summary.totalPnlUsd).toBeCloseTo(0.3);
            expect(summary.positionCount).toBe(2);
        });

        it('should get orders', async () => {
            const mockOrders = [{ pubkey: 'ord1', status: 'filled' }];
            mockFetch.mockReturnValueOnce(mockJsonResponse(mockOrders));

            const orders = await sdk.stats.getOrders('wallet-abc');

            expect(orders).toHaveLength(1);
        });

        it('should get history', async () => {
            const mockHistory = [{ id: 'tx1', type: 'buy' }];
            mockFetch.mockReturnValueOnce(mockJsonResponse(mockHistory));

            const history = await sdk.stats.getHistory('wallet-abc');

            expect(history).toHaveLength(1);
        });
    });

    // ── PredictManager ───────────────────────────────────────────────────

    describe('predict', () => {
        it('should throw if no adapter is set', async () => {
            await expect(
                sdk.predict.buyYes({ marketId: 'm1', depositAmount: 2.0 })
            ).rejects.toThrow('No wallet adapter set');
        });

        it('should check order status', async () => {
            mockFetch.mockReturnValueOnce(mockJsonResponse({ status: 'filled' }));

            const status = await sdk.predict.getOrderStatus('order-pub');

            expect(status.status).toBe('filled');
        });
    });

    // ── ImpulseEngine ────────────────────────────────────────────────────

    describe('impulse engine', () => {
        it('should calculate impulse score deterministically', () => {
            const engine = sdk.createImpulseEngine('m1');

            // 2% spread, $1M volume, 25k depth
            const score1 = engine.calculateImpulse(0.02, 1_000_000, 25_000);
            expect(score1).toBeGreaterThan(0);
            expect(score1).toBeLessThanOrEqual(100);

            // 0% spread, $0 volume, 0 depth => should be 30 (from depth component)
            const score2 = engine.calculateImpulse(0, 0, 0);
            expect(score2).toBe(30);
        });
    });

    // ── API Error Handling ───────────────────────────────────────────────

    describe('error handling', () => {
        it('should throw JupApiError on non-2xx responses', async () => {
            mockFetch.mockReturnValueOnce(
                Promise.resolve({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                    json: () => Promise.resolve({ error: 'Invalid API key' }),
                    text: () => Promise.resolve(''),
                })
            );

            await expect(
                sdk.market.listEvents()
            ).rejects.toThrow('Jupiter API error 401');
        });
    });
});
