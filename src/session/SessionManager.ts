import {
    Keypair,
    PublicKey,
    Connection,
    VersionedTransaction,
    Transaction,
    TransactionInstruction,
    TransactionMessage,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { JupiterAdapter, SessionConfig } from './Adapter.js';

/** On-chain session PDA layout — mirrors what the program stores. */
export interface SessionAccount {
    authority: PublicKey;       // wallet that authorized this session
    sessionSigner: PublicKey;   // ephemeral key that can sign on behalf
    maxSpendLamports: number;   // spending cap (USDC lamports)
    expiresAt: number;          // unix timestamp
    spentLamports: number;      // amount already spent
}

/**
 * Derives the session PDA deterministically.
 *
 * Seeds: `["session", walletPubkey, sessionKeyPubkey]`
 * This means each wallet + session key pair maps to exactly one on-chain record.
 */
export function deriveSessionPDA(
    programId: PublicKey,
    wallet: PublicKey,
    sessionKey: PublicKey,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('session'),
            wallet.toBuffer(),
            sessionKey.toBuffer(),
        ],
        programId,
    );
}

export class SessionManager {
    private sessionKey: Keypair | null = null;
    private sessionPDA: PublicKey | null = null;
    private sessionBump: number = 0;
    private expiresAt: number = 0;
    private connection: Connection;
    private config: SessionConfig;
    private adapter!: JupiterAdapter;

    constructor(config: SessionConfig, connection: Connection) {
        this.config = config;
        this.connection = connection;
    }

    // ── Session Lifecycle ────────────────────────────────────────────────

    /**
     * Initialize a session by:
     * 1. Connecting the wallet
     * 2. Generating an ephemeral keypair
     * 3. Deriving the session PDA
     * 4. Building + signing the delegation transaction
     * 5. Submitting it on-chain
     *
     * The user's wallet signs once (popup). After that, the session key
     * can sign transactions silently until it expires or the spend cap is hit.
     */
    async initJupSession(adapter: JupiterAdapter): Promise<PublicKey> {
        this.adapter = adapter;

        // 1. Connect wallet if needed
        if (!this.adapter.publicKey) {
            await this.adapter.connect();
        }

        // 2. Generate ephemeral session keypair
        this.sessionKey = Keypair.generate();

        // 3. Derive the session PDA
        const programId = new PublicKey(this.config.programId);
        const [pda, bump] = deriveSessionPDA(
            programId,
            this.adapter.publicKey,
            this.sessionKey.publicKey,
        );
        this.sessionPDA = pda;
        this.sessionBump = bump;

        // 4. Calculate expiry
        this.expiresAt = Math.floor(Date.now() / 1000) + this.config.ttl;

        // 5. Build the createSession instruction
        const createSessionIx = this.buildCreateSessionInstruction(
            programId,
            this.adapter.publicKey,
            this.sessionKey.publicKey,
            pda,
        );

        // 6. (Optional) Fund session key with SOL for tx fees
        const instructions: TransactionInstruction[] = [];

        if (this.config.topUpLamports && this.config.topUpLamports > 0) {
            instructions.push(
                SystemProgram.transfer({
                    fromPubkey: this.adapter.publicKey,
                    toPubkey: this.sessionKey.publicKey,
                    lamports: this.config.topUpLamports,
                }),
            );
        }

        instructions.push(createSessionIx);

        // 7. Build, sign, and submit
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

        const messageV0 = new TransactionMessage({
            payerKey: this.adapter.publicKey,
            recentBlockhash: blockhash,
            instructions,
        }).compileToV0Message();

        const tx = new VersionedTransaction(messageV0);

        // Wallet signs (one-time popup)
        const signedTx = await this.adapter.signTransaction(tx);

        const signature = await this.connection.sendTransaction(signedTx);
        await this.connection.confirmTransaction(signature, 'confirmed');

        return this.sessionKey.publicKey;
    }

    // ── Session Validation ───────────────────────────────────────────────

    /**
     * Check whether the current session is still valid.
     * A session is valid if:
     *   - A session key exists
     *   - The expiry time has not passed
     */
    isSessionValid(): boolean {
        if (!this.sessionKey || !this.sessionPDA) return false;

        const now = Math.floor(Date.now() / 1000);
        return now < this.expiresAt;
    }

    /**
     * Get remaining session time in seconds. Returns 0 if expired.
     */
    getSessionTTL(): number {
        if (!this.isSessionValid()) return 0;
        return this.expiresAt - Math.floor(Date.now() / 1000);
    }

    // ── Signing ──────────────────────────────────────────────────────────

    /**
     * Sign a VersionedTransaction using the ephemeral session key.
     * Falls back to the wallet adapter if the session is invalid.
     *
     * This is the key UX improvement: once a session is initialized,
     * no wallet popups are needed for subsequent transactions.
     */
    async signWithSession(transaction: VersionedTransaction): Promise<VersionedTransaction> {
        if (this.isSessionValid() && this.sessionKey) {
            // Sign with ephemeral key — no popup
            transaction.sign([this.sessionKey]);
            return transaction;
        }

        // Fallback: wallet adapter signs (popup)
        return this.signVersionedTransaction(transaction);
    }

    /**
     * Sign a VersionedTransaction using the wallet adapter directly.
     * Used by PredictManager for the Jupiter Prediction API flow.
     */
    async signVersionedTransaction(transaction: VersionedTransaction): Promise<VersionedTransaction> {
        if (!this.adapter) {
            throw new Error('Session not initialized — call initJupSession first');
        }
        return this.adapter.signTransaction(transaction);
    }

    // ── Accessors ────────────────────────────────────────────────────────

    getAdapter(): JupiterAdapter | null {
        return this.adapter ?? null;
    }

    getSessionPublicKey(): PublicKey | null {
        return this.sessionKey ? this.sessionKey.publicKey : null;
    }

    getSessionPDA(): PublicKey | null {
        return this.sessionPDA;
    }

    getConnection(): Connection {
        return this.connection;
    }

    // ── Internals ────────────────────────────────────────────────────────

    /**
     * Build the instruction that creates/initializes the session PDA on-chain.
     *
     * The data layout is:
     *   [0]       discriminator (u8) — 0 = createSession
     *   [1..8]    maxSpendLamports (u64 LE)
     *   [9..16]   expiresAt (i64 LE)
     *   [17]      bump (u8)
     */
    private buildCreateSessionInstruction(
        programId: PublicKey,
        wallet: PublicKey,
        sessionSigner: PublicKey,
        sessionPDA: PublicKey,
    ): TransactionInstruction {
        // Encode instruction data
        const data = Buffer.alloc(18);
        data.writeUInt8(0, 0); // discriminator: createSession

        // maxSpend in micro-USDC (config.maxSpend is in dollars)
        const maxSpendMicro = BigInt(Math.round(this.config.maxSpend * 1_000_000));
        data.writeBigUInt64LE(maxSpendMicro, 1);

        // Expiry as unix timestamp
        data.writeBigInt64LE(BigInt(this.expiresAt), 9);

        // PDA bump seed
        data.writeUInt8(this.sessionBump, 17);

        return new TransactionInstruction({
            programId,
            keys: [
                { pubkey: wallet, isSigner: true, isWritable: true },          // payer + authority
                { pubkey: sessionSigner, isSigner: false, isWritable: false },  // ephemeral key ref
                { pubkey: sessionPDA, isSigner: false, isWritable: true },      // PDA to initialize
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data,
        });
    }
}
