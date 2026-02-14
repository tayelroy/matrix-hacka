export interface JupiterAdapter {
    connect(): Promise<void>;
    signTransaction(transaction: any): Promise<any>;
    signAllTransactions(transactions: any[]): Promise<any[]>;
    publicKey: any; // PublicKey
}

export interface SessionConfig {
    programId: string;
    maxSpend: number; // in USDC
    ttl: number; // in seconds
}
