/**
 * Jup-Predict SDK — Predict Manager
 * Handles the full order lifecycle: create → sign → submit → confirm.
 */

import { Connection, VersionedTransaction } from '@solana/web3.js';
import { ApiClient } from '../api/ApiClient.js';
import type { JupiterAdapter } from '../session/Adapter.js';
import type {
    CreateOrderParams,
    CreateOrderResponse,
    OrderStatusResponse,
    PredictParams,
    PredictResult,
} from '../types.js';
import { JUPUSD_MINT, usdToMicroUsd } from '../types.js';

export class PredictManager {
    private api: ApiClient;
    private connection: Connection;
    private adapter: JupiterAdapter | null = null;

    constructor(api: ApiClient, connection: Connection) {
        this.api = api;
        this.connection = connection;
    }

    /**
     * Set the wallet adapter used for signing transactions.
     * Must be called before any buy/close operations.
     */
    setAdapter(adapter: JupiterAdapter): void {
        this.adapter = adapter;
    }

    // ── Buy ──────────────────────────────────────────────────────────────────

    /**
     * Buy YES contracts on a market.
     * @example
     * const result = await sdk.predict.buyYes({
     *     marketId: 'market-456',
     *     depositAmount: 2.00, // $2.00
     * });
     * console.log('Tx:', result.signature);
     */
    async buyYes(params: PredictParams): Promise<PredictResult> {
        return this.executeOrder(params, true);
    }

    /**
     * Buy NO contracts on a market.
     * @example
     * const result = await sdk.predict.buyNo({
     *     marketId: 'market-456',
     *     depositAmount: 5.00,
     * });
     */
    async buyNo(params: PredictParams): Promise<PredictResult> {
        return this.executeOrder(params, false);
    }

    // ── Close / Sell ─────────────────────────────────────────────────────────

    /**
     * Close an entire position (sell all contracts).
     * Returns the transaction signature.
     */
    async closePosition(positionPubkey: string): Promise<string> {
        const adapter = this.requireAdapter();

        const response = await this.api.del<CreateOrderResponse>(
            `/positions/${positionPubkey}`,
            { ownerPubkey: adapter.publicKey.toString() },
        );

        return this.signAndSubmit(response.transaction);
    }

    /**
     * Close ALL positions for the connected wallet.
     */
    async closeAllPositions(): Promise<string> {
        const adapter = this.requireAdapter();

        const response = await this.api.del<CreateOrderResponse>(
            '/positions',
            { ownerPubkey: adapter.publicKey.toString() },
        );

        return this.signAndSubmit(response.transaction);
    }

    // ── Order Status ─────────────────────────────────────────────────────────

    /**
     * Check the fill status of an order.
     * @returns 'pending' | 'filled' | 'failed'
     */
    async getOrderStatus(orderPubkey: string): Promise<OrderStatusResponse> {
        return this.api.get<OrderStatusResponse>(`/orders/status/${orderPubkey}`);
    }

    /**
     * Wait for an order to reach a terminal state (filled or failed).
     * Polls at the given interval. Rejects after maxWait ms.
     */
    async waitForFill(
        orderPubkey: string,
        intervalMs: number = 2000,
        maxWaitMs: number = 60_000,
    ): Promise<OrderStatusResponse> {
        const start = Date.now();

        while (Date.now() - start < maxWaitMs) {
            const status = await this.getOrderStatus(orderPubkey);
            if (status.status === 'filled' || status.status === 'failed') {
                return status;
            }
            await this.sleep(intervalMs);
        }

        throw new Error(`Order ${orderPubkey} did not fill within ${maxWaitMs}ms`);
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private async executeOrder(params: PredictParams, isYes: boolean): Promise<PredictResult> {
        const adapter = this.requireAdapter();

        const orderBody: CreateOrderParams = {
            ownerPubkey: adapter.publicKey.toString(),
            marketId: params.marketId,
            isYes,
            isBuy: true,
            depositAmount: usdToMicroUsd(params.depositAmount),
            depositMint: params.depositMint ?? JUPUSD_MINT,
        };

        const response = await this.api.post<CreateOrderResponse>('/orders', orderBody as unknown as Record<string, unknown>);

        const signature = await this.signAndSubmit(response.transaction);

        return {
            signature,
            orderPubkey: response.order.pubkey,
            positionPubkey: response.order.positionPubkey,
        };
    }

    private async signAndSubmit(base64Tx: string): Promise<string> {
        const adapter = this.requireAdapter();

        // Deserialize the versioned transaction from the API
        const txBuffer = Buffer.from(base64Tx, 'base64');
        const transaction = VersionedTransaction.deserialize(txBuffer);

        // Sign with the wallet adapter
        const signed = await adapter.signTransaction(transaction);

        // Submit to Solana
        const rawTx = signed.serialize();
        const blockhashInfo = await this.connection.getLatestBlockhashAndContext({
            commitment: 'confirmed',
        });

        const signature = await this.connection.sendRawTransaction(rawTx, {
            maxRetries: 0,
            skipPreflight: true,
            preflightCommitment: 'confirmed',
        });

        // Confirm
        const confirmation = await this.connection.confirmTransaction(
            {
                signature,
                blockhash: blockhashInfo.value.blockhash,
                lastValidBlockHeight: blockhashInfo.value.lastValidBlockHeight,
            },
            'confirmed',
        );

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        return signature;
    }

    private requireAdapter(): JupiterAdapter {
        if (!this.adapter) {
            throw new Error(
                'No wallet adapter set. Call sdk.predict.setAdapter(adapter) first.',
            );
        }
        return this.adapter;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
