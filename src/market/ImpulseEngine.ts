import EventEmitter from 'eventemitter3';

export interface MarketState {
    impulseScore: number; // 0-100
    spread: number;
    volume24h: number;
    isSurge: boolean;
}

export const MARKET_EVENTS = {
    IMPULSE_UPDATE: 'impulse_update',
    MARKET_EXPEDITION: 'market_expedition'
};

export class ImpulseEngine extends EventEmitter {
    private isRunning: boolean = false;
    private pollInterval: NodeJS.Timeout | null = null;
    private connectionUrl: string = 'https://price.jup.ag/v6/price'; // Example endpoint

    constructor() {
        super();
    }

    startPolling(intervalMs: number = 1000) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.pollInterval = setInterval(() => this.pollMarketData(), intervalMs);
    }

    stopPolling() {
        this.isRunning = false;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    private async pollMarketData() {
        try {
            // Mocking data fetch for now as we don't have full API access in this env
            // In real impl: fetch(this.connectionUrl + '?ids=SOL')

            const mockSpread = Math.random() * 0.05; // 0-5% spread
            const mockVolume = 1000000 + Math.random() * 500000;

            const impulseScore = this.calculateImpulse(mockSpread, mockVolume);
            const isSurge = impulseScore > 80;

            const state: MarketState = {
                impulseScore,
                spread: mockSpread,
                volume24h: mockVolume,
                isSurge
            };

            this.emit(MARKET_EVENTS.IMPULSE_UPDATE, state);

            if (isSurge) {
                this.emit(MARKET_EVENTS.MARKET_EXPEDITION, {
                    multiplier: 2.0, // 2x rewards during surge
                    duration: 60 // 60 seconds
                });
            }

        } catch (error) {
            console.error('Error polling market data:', error);
        }
    }

    /**
     * Calculates the Market Impulse score (0-100) based on spread and volume.
     * Higher spread + Higher volume = Higher Impulse (High Volatility)
     */
    public calculateImpulse(spread: number, volume: number): number {
        // Normalize spread (e.g., 0.02 = 2% is considered high)
        const spreadScore = Math.min((spread / 0.02) * 50, 50);

        // Normalize volume (arbitrary baseline)
        const volumeScore = Math.min((volume / 1000000) * 50, 50);

        return Math.floor(spreadScore + volumeScore);
    }
}
