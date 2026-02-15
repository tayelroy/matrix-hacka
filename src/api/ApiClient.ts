/**
 * Jup-Predict SDK — Centralized API Client
 * Wraps all HTTP calls to https://api.jup.ag/prediction/v1/
 */

import { PREDICTION_API_BASE } from '../types.js';

export class JupApiError extends Error {
    public statusCode: number;
    public body: unknown;

    constructor(message: string, statusCode: number, body?: unknown) {
        super(message);
        this.name = 'JupApiError';
        this.statusCode = statusCode;
        this.body = body;
    }
}

export class ApiClient {
    private baseUrl: string;
    private apiKey: string;

    constructor(apiKey: string, baseUrl: string = PREDICTION_API_BASE) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    /**
     * GET request with optional query parameters.
     */
    async get<T>(path: string, params?: Record<string, string>): Promise<T> {
        let url = `${this.baseUrl}${path}`;
        if (params) {
            const filtered = Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
            );
            if (Object.keys(filtered).length > 0) {
                url += '?' + new URLSearchParams(filtered).toString();
            }
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: this.headers(),
        });

        return this.handleResponse<T>(response);
    }

    /**
     * POST request with a JSON body.
     */
    async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
        const url = `${this.baseUrl}${path}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...this.headers(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        return this.handleResponse<T>(response);
    }

    /**
     * DELETE request with an optional JSON body.
     */
    async del<T>(path: string, body?: Record<string, unknown>): Promise<T> {
        const url = `${this.baseUrl}${path}`;

        const options: RequestInit = {
            method: 'DELETE',
            headers: {
                ...this.headers(),
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        return this.handleResponse<T>(response);
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private headers(): Record<string, string> {
        return {
            'x-api-key': this.apiKey,
        };
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            let body: unknown;
            try {
                body = await response.json();
            } catch {
                body = await response.text();
            }
            throw new JupApiError(
                `Jupiter API error ${response.status}: ${response.statusText}`,
                response.status,
                body,
            );
        }

        return response.json() as Promise<T>;
    }
}
