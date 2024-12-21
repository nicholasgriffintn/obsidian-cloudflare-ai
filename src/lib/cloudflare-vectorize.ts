import { Notice, request } from "obsidian";

const BASE_CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4/accounts/";

export class CloudflareVectorize {
    private accountId: string;
    private apiKey: string;
    private indexName: string;

    constructor(
        accountId: string,
        apiKey: string,
        indexName: string,
    ) {
        this.accountId = accountId;
        this.apiKey = apiKey;
        this.indexName = indexName;
    }

    private async makeRequest(endpoint: string, method: string, body?: any, retries = 3, type: "upsert" | "query" = "upsert") {
        const url = `${BASE_CLOUDFLARE_API_URL}${this.accountId}/vectorize/v2/${endpoint}`;
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                let formattedBody = undefined;
                if (type === "upsert") {
                    formattedBody = body ? body.map((item: any) => JSON.stringify(item)).join('\n') : undefined;
                } else if (type === "query") {
                    formattedBody = JSON.stringify(body);
                }

                let contentType = undefined;
                if (type === "query") {
                    contentType = "application/json";
                } else if (type === "upsert") {
                    contentType = "application/x-ndjson";
                }

                if (!contentType || !formattedBody) {
                    throw new Error("Invalid request type or body");
                }

                const response = await request({
                    url,
                    method,
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': contentType,
                    },
                    body: formattedBody,
                    throw: false
                });

                console.log("response", response);

                const data = JSON.parse(response);

                if (!data?.success) {
                    if (data.errors?.[0]?.message === "vectorize.upstream_timeout") {
                        if (attempt < retries) {
                            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                            continue;
                        }
                    }
                    throw new Error(`The request failed with the following error: ${data.errors?.map((error: any) => error.message).join(", ")}`);
                }

                return data.result;
            } catch (error) {
                if (attempt === retries) {
                    this.displayError(`Vectorize API error: ${error}`);
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            }
        }
    }

    private displayError(error: string) {
        new Notice(error);
    }

    async upsertVectors(vectors: Array<{
        id: string,
        values: number[],
        metadata?: Record<string, any>
    }>) {
        const formattedVectors = vectors.map(vector => ({
            ...vector,
            values: Array.isArray(vector.values[0]) ? vector.values[0] : vector.values
        }));

        return this.makeRequest(
            `indexes/${this.indexName}/upsert`,
            'POST',
            formattedVectors,
            3,
            "upsert"
        );
    }

    async queryVectors(query: {
        vector: number[],
        topK?: number,
        metadata?: Record<string, any>
    }) {
        return this.makeRequest(
            `indexes/${this.indexName}/query`,
            'POST',
            query,
            1,
            "query"
        );
    }
}
