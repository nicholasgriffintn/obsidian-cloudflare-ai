import { Notice, request } from "obsidian";

import type { Vector, VectorQuery, VectorSearchResult, CloudflareResponse } from "../types";
import { Logger } from "./logger";

const BASE_CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4/accounts/";

type RequestType = "upsert" | "query";

export class CloudflareVectorize {
    private static readonly RETRY_DELAY_MS = 1000;
    private static readonly UPSTREAM_TIMEOUT_ERROR = "vectorize.upstream_timeout";
    private readonly logger: Logger;
    
    constructor(
        private readonly accountId: string,
        private readonly apiKey: string,
        private readonly indexName: string,
    ) {
        this.validateConfig();
        this.logger = new Logger();
    }

    private validateConfig(): void {
        if (!this.accountId) {
            throw new Error("Account ID is required");
        }
        if (!this.apiKey) {
            throw new Error("API key is required");
        }
        if (!this.indexName) {
            throw new Error("Index name is required");
        }
    }

    private getEndpointUrl(endpoint: string): string {
        return `${BASE_CLOUDFLARE_API_URL}${this.accountId}/vectorize/v2/${endpoint}`;
    }

    private getContentType(type: RequestType): string {
        return type === "query" ? "application/json" : "application/x-ndjson";
    }

    private formatRequestBody(body: any, type: RequestType): string {
        if (type === "query") {
            return JSON.stringify(body);
        }
        return body.map((item: any) => JSON.stringify(item)).join('\n');
    }

    private async delay(attempt: number): Promise<void> {
        await new Promise(resolve => 
            setTimeout(resolve, attempt * CloudflareVectorize.RETRY_DELAY_MS)
        );
    }

    private displayError(error: string): void {
        this.logger.error("Vectorize API error:", error);
        new Notice(`Vectorize API error: ${error}`, 5000);
    }

    private async makeRequest<T>(
        endpoint: string, 
        method: string, 
        body: any, 
        retries = 3, 
        type: RequestType
    ): Promise<T | null> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const formattedBody = this.formatRequestBody(body, type);
                const contentType = this.getContentType(type);
                
                const response = await request({
                    url: this.getEndpointUrl(endpoint),
                    method,
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': contentType,
                    },
                    body: formattedBody,
                    throw: false
                });

                let data: CloudflareResponse<T>;
                try {
                    data = JSON.parse(response);
                } catch (error) {
                    throw new Error("Invalid JSON response from Vectorize API");
                }
                
                if (!data.success) {
                    const firstError = data.errors?.[0];
                    if (firstError?.message === CloudflareVectorize.UPSTREAM_TIMEOUT_ERROR && attempt < retries) {
                        await this.delay(attempt);
                        continue;
                    }
                    throw new Error(
                        data.errors?.map(error => error.message).join(", ") ?? 
                        "Unknown error"
                    );
                }

                return (data.result as T) ?? null;
            } catch (error) {
                const isLastAttempt = attempt === retries;
                if (isLastAttempt) {
                    this.displayError(error instanceof Error ? error.message : String(error));
                    throw error;
                }
                await this.delay(attempt);
            }
        }
        return null;
    }

    async upsertVectors(vectors: Vector[]): Promise<boolean> {
        try {
            const formattedVectors = vectors.map(vector => ({
                ...vector,
                values: Array.isArray(vector.values[0]) ? vector.values[0] : vector.values
            }));

            this.logger.debug("Formatted vectors:", formattedVectors);

            const result = await this.makeRequest<{ mutationId: string }>(
                `indexes/${this.indexName}/upsert`,
                'POST',
                formattedVectors,
                3,
                "upsert"
            );

            return Boolean(result?.mutationId);
        } catch (error) {
            this.displayError(`Failed to upsert vectors: ${error}`);
            return false;
        }
    }

    async queryVectors(query: VectorQuery): Promise<VectorSearchResult | null> {
        try {
            return await this.makeRequest<VectorSearchResult>(
                `indexes/${this.indexName}/query`,
                'POST',
                query,
                1,
                "query"
            );
        } catch (error) {
            this.displayError(`Failed to query vectors: ${error}`);
            return null;
        }
    }
}