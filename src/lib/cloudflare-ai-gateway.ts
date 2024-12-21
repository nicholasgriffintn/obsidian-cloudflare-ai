import { Notice, request } from "obsidian";

const BASE_AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1";

export class CloudflareAIGateway {
	cloudflareAccountId: string;
	cloudflareAiGatewayId: string;
	cloudflareAiApiKey: string;
	modelId: string;
	maxTokens: number;
	temperature: number;
	apiKey!: string;

	private provider: any;

	constructor(
		cloudflareAccountId: string,
		cloudflareAiGatewayId: string,
		cloudflareAiApiKey: string,
		modelId: string,
		maxTokens: number,
		temperature: number,
	) {
		this.cloudflareAccountId = cloudflareAccountId;
		this.cloudflareAiGatewayId = cloudflareAiGatewayId;
		this.cloudflareAiApiKey = cloudflareAiApiKey;
		this.modelId = modelId;
		this.maxTokens = maxTokens;
		this.temperature = temperature;

		this.provider = async ({
			modelId,
			messages,
			prompt,
			shouldStream = false,
			type = "text",
		}: {
			modelId: string;
			messages?: any;
			prompt?: string;
			shouldStream: boolean;
			type: "text";
		}) => {
			if (!messages && !prompt) {
				throw new Error("Messages or prompt is required");
			}

			const body: Record<string, any> = {
				model: modelId,
			};

			if (messages) {
				body.messages = messages;
			}

			if (prompt) {
				body.prompt = prompt;
			}

			if (type === "text") {
				body.max_tokens = this.maxTokens;
				body.temperature = this.temperature;
			}

			const response = await request(
				{
					url:
						`${BASE_AI_GATEWAY_URL}/${this.cloudflareAccountId}/${this.cloudflareAiGatewayId}/workers-ai/${modelId}`,
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.cloudflareAiApiKey}`,
						"Content-Type": "application/json",
						"cf-aig-metadata": JSON.stringify({ email: "test@test.com" }),
					},
					body: JSON.stringify(body),
				}
			);

			let data;

			try {
				data = JSON.parse(response);
			} catch (error) {
				throw new Error("Invalid response from AI Gateway");
			}

			if (!data?.result?.response) {
				throw new Error("No response from AI Gateway");
			}

			return data.result.response;
		};
	}

	private displayError(error: string) {
		new Notice(error);
	}

	async generateText(
		messages: Record<string, any>,
		htmlElement: HTMLElement,
	): Promise<string | undefined> {
		try {
			const shouldStream = htmlElement !== undefined;

			const response = await this.provider({
				modelId: this.modelId,
				messages,
				shouldStream,
				type: "text",
			});

			return response;
		} catch (error) {
			this.displayError(error as string);
		}
	}
}
