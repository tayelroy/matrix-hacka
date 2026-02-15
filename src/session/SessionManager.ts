import { Keypair, PublicKey, Connection, VersionedTransaction } from '@solana/web3.js';
import { JupiterAdapter, SessionConfig } from './Adapter.js';

export class SessionManager {
    private sessionKey: Keypair | null = null;
    private connection: Connection;
    private config: SessionConfig;
    private adapter!: JupiterAdapter;

    constructor(config: SessionConfig, connection: Connection) {
        this.config = config;
        this.connection = connection;
    }

    /**
     * Connects to the wallet and initializes a session.
     * @param adapter The Jupiter Mobile Adapter (or compatible wallet adapter)
     */
    async initJupSession(adapter: JupiterAdapter): Promise<PublicKey> {
        this.adapter = adapter;

        // 1. connect to wallet
        if (!this.adapter.publicKey) {
            await this.adapter.connect();
        }

        // 2. generate ephemeral keypair
        this.sessionKey = Keypair.generate();
        console.log('Session Key generated:', this.sessionKey.publicKey.toBase58());

        // 3. Request delegation (Handshake)
        // In a real implementation, this would build a transaction that delegates authority
        // to the sessionKey for the specific program and limits.
        console.log(`Requesting session delegation for Program: ${this.config.programId}`);

        return this.sessionKey.publicKey;
    }

    /**
     * Sign a VersionedTransaction using the wallet adapter.
     * Used by PredictManager for the Jupiter Prediction API flow.
     */
    async signVersionedTransaction(transaction: VersionedTransaction): Promise<VersionedTransaction> {
        if (!this.adapter) {
            throw new Error('Session not initialized — call initJupSession first');
        }
        return this.adapter.signTransaction(transaction);
    }

    /**
     * Get the wallet adapter (for PredictManager to use directly).
     */
    getAdapter(): JupiterAdapter | null {
        return this.adapter ?? null;
    }

    getSessionPublicKey(): PublicKey | null {
        return this.sessionKey ? this.sessionKey.publicKey : null;
    }

    getConnection(): Connection {
        return this.connection;
    }
}
