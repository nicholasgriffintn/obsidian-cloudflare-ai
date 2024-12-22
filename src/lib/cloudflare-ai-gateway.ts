import { Notice, request } from "obsidian";
import type { Message, RequestOptions, CloudflareResponse, TextResponse, EmbeddingResponse } from "../types";
import { Logger } from "./logger";

const BASE_AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1";

export class CloudflareAIGateway {
	private readonly email: string = "test@test.com";
	private readonly logger: Logger;

    constructor(
        private readonly cloudflareAccountId: string,
        private readonly cloudflareAiGatewayId: string,
        private readonly cloudflareAiApiKey: string,
        private readonly modelId: string,
        private readonly maxTokens: number,
        private readonly temperature: number,
    ) {
        this.validateConfig();
		this.logger = new Logger();
    }

    private validateConfig(): void {
        if (!this.cloudflareAccountId) {
            throw new Error("Cloudflare Account ID is required");
        }
        if (!this.cloudflareAiGatewayId) {
            throw new Error("AI Gateway ID is required");
        }
        if (!this.cloudflareAiApiKey) {
            throw new Error("AI API Key is required");
        }
        if (!this.modelId) {
            throw new Error("Model ID is required");
        }
        if (!this.maxTokens || this.maxTokens < 1) {
            throw new Error("Invalid max tokens value");
        }
        if (this.temperature < 0 || this.temperature > 1) {
            throw new Error("Temperature must be between 0 and 1");
        }
    }

    private getEndpointUrl(modelId: string): string {
        return `${BASE_AI_GATEWAY_URL}/${this.cloudflareAccountId}/${this.cloudflareAiGatewayId}/workers-ai/${modelId}`;
    }

    private buildRequestBody(options: RequestOptions): Record<string, any> {
        const body: Record<string, any> = {
            model: options.modelId,
        };

        if (options.type === "text") {
            if (options.messages) body.messages = options.messages;
            if (options.prompt) body.prompt = options.prompt;
            body.max_tokens = this.maxTokens;
            body.temperature = this.temperature;
        } else if (options.type === "embedding") {
            if (!options.prompt) {
                throw new Error("Prompt is required for embeddings");
            }
            body.text = options.prompt;
        }

        return body;
    }

    private displayError(error: unknown): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("AI Gateway error:", errorMessage);
        new Notice(`AI Gateway error: ${errorMessage}`, 5000);
    }

    async makeRequest<T>({
        modelId,
        messages,
        prompt,
        shouldStream = false,
        type = "text",
    }: RequestOptions): Promise<T> {
        try {
            if (!messages && !prompt) {
                throw new Error("Either messages or prompt is required");
            }

            const body = this.buildRequestBody({ modelId, messages, prompt, shouldStream, type });

            const response = await request({
                url: this.getEndpointUrl(modelId),
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.cloudflareAiApiKey}`,
                    "Content-Type": "application/json",
                    "cf-aig-metadata": JSON.stringify({ email: this.email }),
                },
                body: JSON.stringify(body),
				throw: false
            });

            let data: CloudflareResponse<T>;
            try {
                data = JSON.parse(response);
            } catch (error) {
                throw new Error("Invalid JSON response from AI Gateway");
            }

            if (!data?.success) {
                throw new Error(
                    data.errors?.map(error => error.message).join(", ") ?? 
                    "Unknown error from AI Gateway"
                );
            }

            if (!data.result) {
                throw new Error("No result returned from AI Gateway");
            }

            return data.result;
        } catch (error) {
            this.displayError(error);
            throw error;
        }
    }

    async generateText(
        messages: Message[],
        htmlElement?: HTMLElement
    ): Promise<string> {
        try {
            const response = await this.makeRequest<TextResponse>({
                modelId: this.modelId,
                messages,
                shouldStream: Boolean(htmlElement),
                type: "text",
            });

            return response.response;
        } catch (error) {
            this.displayError(error);
            throw error;
        }
    }

    async generateEmbedding(text: string): Promise<number[][]> {
        try {
            const response = await this.makeRequest<EmbeddingResponse>({
                modelId: this.modelId,
                prompt: text,
                shouldStream: false,
                type: "embedding",
            });

            return response.data;
        } catch (error) {
            this.displayError(error);
            throw error;
        }
    }
}