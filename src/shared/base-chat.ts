import { App, Notice, TFile } from "obsidian";
import type { SvelteComponent } from "svelte";
import type {
	Message,
	VectorizeFilter,
	CloudflareAIPluginSettings,
	VectorSearchResult,
	VectorMatch,
} from "../types";
import { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import { CloudflareVectorize } from "../lib/cloudflare-vectorize";
import { Logger } from "../lib/logger";
import { SyncService } from "../services/sync";

export abstract class BaseChat {
	public messages: Message[] = [];
	public apiMessages: Message[] = [];
	public component: SvelteComponent | null = null;
	public readonly svelteComponents: SvelteComponent[] = [];
	public isProcessing = false;
	public readonly logger: Logger;
	public contentEl: HTMLElement;

	protected readonly DEFAULT_SYSTEM_MESSAGE: Message = {
		role: "system",
		content: `You are a helpful AI assistant that analyzes notes and provides insights. Consider the context carefully before answering questions. The current date is ${
			new Date().toISOString().split("T")[0]
		}.`,
	};

	constructor(
		protected app: App,
		protected gateway: CloudflareAIGateway,
		protected vectorize: CloudflareVectorize,
		protected settings: CloudflareAIPluginSettings,
		protected sync: SyncService,
	) {
		this.validateServices();
		this.logger = new Logger();
		this.contentEl = document.createElement("div");
	}

	private validateServices(): void {
		if (!this.gateway) {
			throw new Error("Gateway not initialized");
		}
		if (!this.vectorize) {
			throw new Error("Vectorize not initialized");
		}
		if (!this.settings?.textEmbeddingsModelId) {
			throw new Error("Text embeddings model ID not set");
		}
	}

	private async generateEmbedding(text: string): Promise<number[] | null> {
		try {
			const embedding = await this.gateway.makeRequest<{
				data: number[][];
			}>({
				modelId: this.settings.textEmbeddingsModelId,
				prompt: text,
				shouldStream: false,
				type: "embedding",
			});

			return embedding?.data?.[0] ?? null;
		} catch (error) {
			this.logger.error("Error generating embedding:", error);
			return null;
		}
	}

	private async searchSimilarNotes(
		vector: number[],
		filters: VectorizeFilter,
	): Promise<VectorSearchResult | null> {
		try {
			if (!vector) {
				return null;
			}

			return await this.vectorize.queryVectors({
				vector,
				topK: this.settings.topK,
				namespace: this.app.vault.getName(),
				filter: filters,
			});
		} catch (error) {
			this.logger.error("Error searching vectors:", error);
			return null;
		}
	}

	private async enrichMessageWithContext(
		message: string,
		searchResults: VectorSearchResult | null,
	): Promise<string> {
		if (!searchResults?.matches?.length) {
			return message;
		}

		const relevantMatches = searchResults.matches
			.filter((match) => match.score >= this.settings.minSimilarityScore)
			.sort((a, b) => b.score - a.score);

		if (!relevantMatches.length) {
			return message;
		}

		const contextPromises = relevantMatches.map(async (match: VectorMatch) => {
			try {
				const syncState = await this.sync.getSyncState(match.id);
				if (!syncState) return null;

				const file = this.app.vault.getAbstractFileByPath(syncState?.path);
				if (!file || !(file instanceof TFile)) return null;

				const content = await this.app.vault.cachedRead(file);

				return {
					content: content,
					score: match.score,
					path: file.path,
					link: `[[${file.path}]]`,
				};
			} catch (error) {
				this.logger.error(`Error reading note ${match.id}:`, error);
				return null;
			}
		});

		const contexts = (await Promise.all(contextPromises)).filter(
			(ctx): ctx is NonNullable<typeof ctx> => ctx !== null,
		);

		if (!contexts.length) {
			return message;
		}

		const formattedContext = contexts
			.map(
				(ctx) =>
					`[${Math.round(ctx.score * 100)}% relevant from ${ctx.link}]:\n${
						ctx.content
					}`,
			)
			.join("\n\n");

		const sourceLinks = contexts.map((ctx) => ctx.link).join(", ");

		return `Context from my notes:

${formattedContext}

Question: ${message}

Instructions: Please reference the source notes using their links (${sourceLinks}) when they are relevant to your response. Format your response in markdown.`;
	}

	async onSendMessage(
		message: string,
		filters: VectorizeFilter,
	): Promise<void> {
		if (!message.trim()) return;

		this.isProcessing = true;
		this.updateComponent();

		try {
			if (!this.apiMessages.some((msg) => msg.role === "system")) {
				this.apiMessages.push(this.DEFAULT_SYSTEM_MESSAGE);
			}

			const userMessage: Message = { role: "user", content: message };
			this.messages.push(userMessage);
			this.updateComponent();

			const embedding = await this.generateEmbedding(message);
			const searchResults = embedding
				? await this.searchSimilarNotes(embedding, filters)
				: null;

			const messageWithContext = await this.enrichMessageWithContext(
				message,
				searchResults,
			);
			this.apiMessages.push({ ...userMessage, content: messageWithContext });

			const response = await this.gateway.generateText(
				this.apiMessages,
				this.contentEl,
			);

			if (!response) {
				throw new Error("No response from AI Gateway");
			}

			const assistantMessage: Message = {
				role: "assistant",
				content: response,
			};
			this.messages.push(assistantMessage);
			this.apiMessages.push(assistantMessage);
		} catch (error) {
			this.logger.error("Error in message processing:", error);
			new Notice("Error generating response. Please try again.");

			this.messages = this.messages.slice(0, -1);
			this.apiMessages = this.apiMessages.slice(0, -1);
		} finally {
			this.isProcessing = false;
			this.updateComponent();
		}
	}

	protected updateComponent(): void {
		if (this.component) {
			this.component.$set({
				messages: [...this.messages],
				isProcessing: this.isProcessing,
			});
		}
	}

	async onClearMessages(): Promise<void> {
		this.messages = [];
		this.apiMessages = [];
		this.updateComponent();
	}

	async onCopyContent(content: string, type: "message" | "conversation"): Promise<void> {
		try {
			await navigator.clipboard.writeText(content);
			new Notice(`Copied ${type} to clipboard`);
		} catch (error) {
			this.logger.error("Error copying to clipboard:", error);
			new Notice(`Failed to copy ${type}`);
		}
	}

	cleanup(): void {
		this.svelteComponents.forEach((component) => {
			if (component && typeof component.$destroy === "function") {
				component.$destroy();
			}
		});
	}

	public initializeComponent(
		target: HTMLElement,
		ComponentClass: typeof SvelteComponent,
	): void {
		const component = new ComponentClass({
			target,
			props: {
				messages: this.messages,
				isProcessing: this.isProcessing,
				onSendMessage: (message: string, filters: VectorizeFilter) =>
					this.onSendMessage(message, filters),
				onClearMessages: () => this.onClearMessages(),
				onCopyConversation: () => this.onCopyContent(this.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n"), "conversation"),
				onCopyMessage: (message: string) => this.onCopyContent(message, "message"),
			},
		});

		this.component = component;
		this.svelteComponents.push(component);
	}
}
