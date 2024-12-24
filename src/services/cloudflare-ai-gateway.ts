import { Notice } from "obsidian";

import type { Message, RequestOptions, EmbeddingResponse } from "../types";
import type { Logger } from "../lib/logger";
import { ApiService } from "./api";

const BASE_AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1";

export class CloudflareAIGateway {
	private readonly email: string = "test@test.com";
	private readonly apiService: ApiService;

	constructor(
		private readonly logger: Logger,
		private readonly cloudflareAccountId: string,
		private readonly cloudflareAiGatewayId: string,
		private readonly cloudflareAiApiKey: string,
		private readonly modelId: string,
		private readonly maxTokens: number,
		private readonly temperature: number,
	) {
		this.apiService = new ApiService(logger);
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
			if (options.messages) {
				body.messages = options.messages;
			}
			if (options.prompt) {
				body.prompt = options.prompt;
			}
			if (options.shouldStream) {
				body.stream = true;
			}
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
		this.logger.error("AI Gateway error:", {
			error: errorMessage,
			stack: error instanceof Error ? error.stack : undefined,
		});
		new Notice(`AI Gateway error: ${errorMessage}`, 5000);
	}

	async makeRequest<T>({
		modelId,
		messages,
		prompt,
		shouldStream = false,
		type = "text",
		onToken,
	}: RequestOptions & {
		onToken?: (token: string, isFirst: boolean) => void;
	}): Promise<T> {
		this.validateConfig();
		if (!messages && !prompt) {
			throw new Error("Either messages or prompt is required");
		}

		const body = this.buildRequestBody({
			modelId,
			messages,
			prompt,
			shouldStream,
			type,
		});

		const response = await this.apiService.post<T>(
			this.getEndpointUrl(modelId),
			body,
			{
				Authorization: `Bearer ${this.cloudflareAiApiKey}`,
				"cf-aig-metadata": JSON.stringify({ email: this.email }),
				"Content-Type": "application/json",
			},
			{
				stream: shouldStream,
				onToken,
			},
		);

		return response;
	}

	async generateText(
		messages: Message[],
		onToken?: (token: string, isFirst: boolean) => void,
	): Promise<string> {
		try {
			this.validateConfig();

			if (!messages.length) {
				throw new Error("Messages are required");
			}

			const response = await this.makeRequest<string>({
				modelId: this.modelId,
				messages,
				shouldStream: Boolean(onToken),
				type: "text",
				onToken: onToken || undefined,
			});

			return response;
		} catch (error) {
			if (error instanceof Error) {
				this.logger.error(`Text generation failed: ${error.message}`);
			}
			this.displayError(error);
			throw error;
		}
	}

	async generateEmbedding(text: string): Promise<number[][]> {
		try {
			this.validateConfig();
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
