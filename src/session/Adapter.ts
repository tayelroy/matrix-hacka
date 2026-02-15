import { PublicKey, VersionedTransaction, Transaction } from '@solana/web3.js';

export interface JupiterAdapter {
    connect(): Promise<void>;
    signTransaction<T extends VersionedTransaction | Transaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends VersionedTransaction | Transaction>(transactions: T[]): Promise<T[]>;
    signAndSendTransaction?(transaction: VersionedTransaction): Promise<{ signature: string }>;
    publicKey: PublicKey;
}

export interface SessionConfig {
    programId: string;
    maxSpend: number;    // in USDC (dollars)
    ttl: number;         // session duration in seconds
    topUpLamports?: number; // SOL lamports to fund the session key for tx fees
}
