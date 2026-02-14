/**
 * Jup-Predict SDK
 * High-frequency prediction gaming toolkit for Jupiter Mobile V3.
 */
// Export core modules (to be implemented)
export const version = '0.0.1';

export * from './session/SessionManager';
export * from './session/Adapter';
export * from './market/ImpulseEngine';

import { SessionManager } from './session/SessionManager';
import { ImpulseEngine } from './market/ImpulseEngine';

export class JupPredict {
    public session: SessionManager;
    public market: ImpulseEngine;

    constructor(programId: string) {
        this.session = new SessionManager({
            programId,
            maxSpend: 50, // Default 50 USDC
            ttl: 3600 // Default 1 hour
        });
        this.market = new ImpulseEngine();
    }
}
