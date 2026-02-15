import { PublicKey, VersionedTransaction } from '@solana/web3.js';

export interface JupiterAdapter {
    connect(): Promise<void>;
    signTransaction<T extends VersionedTransaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends VersionedTransaction>(transactions: T[]): Promise<T[]>;
    publicKey: PublicKey;
}

export interface SessionConfig {
    programId: string;
    maxSpend: number; // in USDC
    ttl: number; // in seconds
}
