import { SvelteComponent } from "svelte";
import { App, Modal, Notice } from "obsidian";

import { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import { CloudflareVectorize } from "../lib/cloudflare-vectorize";
import ChatModalComponent from "../components/ChatModal.svelte";
import type { Message, VectorSearchResult, VectorMatch } from "../types";

export class ChatModal extends Modal {
    private readonly DEFAULT_SYSTEM_MESSAGE: Message = {
        role: 'system',
        content: 'You are a helpful AI assistant that analyzes notes and provides insights. Consider the context carefully before answering questions.'
    };

    private readonly VECTOR_SEARCH_LIMIT = 3;
    
    private messages: Message[] = [];
    private apiMessages: Message[] = [];
    private component: typeof ChatModalComponent | null = null;
    private readonly svelteComponents: SvelteComponent[] = [];
    
    private isProcessing = false;

    constructor(
        app: App,
        private readonly gateway: CloudflareAIGateway,
        private readonly vectorize: CloudflareVectorize,
        private readonly textEmbeddingsModelId: string
    ) {
        super(app);
        this.validateServices();
    }

    private validateServices(): void {
        if (!this.gateway) {
            throw new Error("Gateway not initialized");
        }
        if (!this.vectorize) {
            throw new Error("Vectorize not initialized");
        }
        if (!this.textEmbeddingsModelId) {
            throw new Error("Text embeddings model ID not set");
        }
    }

    private updateComponent(): void {
        this.component?.$set({
            messages: [...this.messages],
            isProcessing: this.isProcessing
        });
    }

    private async generateEmbedding(text: string): Promise<number[] | null> {
        try {
            const embedding = await this.gateway.makeRequest<{
                data: number[][]
            }>({
                modelId: this.textEmbeddingsModelId,
                prompt: text,
                shouldStream: false,
                type: "embedding"
            });

            return embedding?.data?.[0] ?? null;
        } catch (error) {
            console.error("Error generating embedding:", error);
            return null;
        }
    }

    private async searchSimilarNotes(vector: number[]): Promise<VectorSearchResult | null> {
        try {
            if (!vector) {
                return null;
            }

            return await this.vectorize.queryVectors({
                vector,
                topK: this.VECTOR_SEARCH_LIMIT
            });
        } catch (error) {
            console.error("Error searching vectors:", error);
            return null;
        }
    }

    private enrichMessageWithContext(message: string, searchResults: VectorSearchResult | null): string {
        if (!searchResults?.matches?.length) {
            return message;
        }

        const context = searchResults.matches
            .map((match: VectorMatch) => match.id)
            .join("\n\n");

        return `Context from my notes:\n\n${context}\n\nQuestion: ${message}`;
    }

    async onSendMessage(message: string): Promise<void> {
        if (!message.trim()) return;
        
        this.isProcessing = true;
        this.updateComponent();

        try {
            if (!this.messages.some(msg => msg.role === "system")) {
                this.messages.push(this.DEFAULT_SYSTEM_MESSAGE);
            }

            const userMessage: Message = { role: "user", content: message };
            this.messages.push(userMessage);
            this.updateComponent();

            const embedding = await this.generateEmbedding(message);
            const searchResults = embedding ? await this.searchSimilarNotes(embedding) : null;

            const messageWithContext = this.enrichMessageWithContext(message, searchResults);
            this.apiMessages.push({ ...userMessage, content: messageWithContext });

            const response = await this.gateway.generateText(
                this.apiMessages,
                this.contentEl
            );

            if (!response) {
                throw new Error("No response from AI Gateway");
            }

            const assistantMessage: Message = { role: "assistant", content: response };
            this.messages.push(assistantMessage);
            this.apiMessages.push(assistantMessage);

        } catch (error) {
            console.error("Error in message processing:", error);
            new Notice("Error generating response. Please try again.");
            
            this.messages = this.messages.slice(0, -1);
            this.apiMessages = this.apiMessages.slice(0, -1);
        } finally {
            this.isProcessing = false;
            this.updateComponent();
        }
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("chat-modal");

        this.component = new ChatModalComponent({
            target: contentEl,
            props: {
                messages: this.messages,
                isProcessing: this.isProcessing,
                onSendMessage: (message: string) => this.onSendMessage(message),
                onClearMessages: () => this.onClearMessages(),
                onCopyConversation: (content: string) => this.onCopyConversation(content),
            },
        });

        this.svelteComponents.push(this.component);
    }

    async onClearMessages(): Promise<void> {
        this.messages = [];
        this.apiMessages = [];
        this.updateComponent();
    }

    async onCopyConversation(content: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(content);
            new Notice("Conversation copied to clipboard");
        } catch (error) {
            console.error("Error copying to clipboard:", error);
            new Notice("Failed to copy conversation");
        }
    }

    onClose(): void {
        this.contentEl.empty();
        this.svelteComponents.forEach(component => {
            if (component && typeof component.$destroy === 'function') {
                component.$destroy();
            }
        });
    }
}