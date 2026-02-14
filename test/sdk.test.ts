import { describe, it, expect, vi } from 'vitest';
import { JupPredict, MARKET_EVENTS } from '../src/index';

describe('JupPredict SDK', () => {
    it('should initialize correctly', () => {
        const sdk = new JupPredict('test_program_id');
        expect(sdk.session).toBeDefined();
        expect(sdk.market).toBeDefined();
    });

    it('should generate a session key', async () => {
        const sdk = new JupPredict('test_program_id');
        const mockAdapter = {
            connect: vi.fn(),
            signTransaction: vi.fn(),
            signAllTransactions: vi.fn(),
            publicKey: { toBase58: () => 'mock_wallet_address' }
        };

        const sessionKey = await sdk.session.initJupSession(mockAdapter as any);
        expect(sessionKey).toBeDefined();
        expect(sdk.session.getSessionPublicKey()).toEqual(sessionKey);
    });

    it('should emit market impulse events', async () => {
        const sdk = new JupPredict('test_program_id');

        return new Promise<void>((resolve) => {
            sdk.market.on(MARKET_EVENTS.IMPULSE_UPDATE, (state) => {
                expect(state.impulseScore).toBeGreaterThanOrEqual(0);
                expect(state.spread).toBeGreaterThanOrEqual(0);
                sdk.market.stopPolling();
                resolve();
            });

            sdk.market.startPolling(50); // Fast interval for testing
        });
    });
});
