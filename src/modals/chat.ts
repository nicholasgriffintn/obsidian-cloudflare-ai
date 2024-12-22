import { SvelteComponent } from "svelte";
import { App, Modal, Notice, TFile } from "obsidian";

import { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import { CloudflareVectorize } from "../lib/cloudflare-vectorize";
import ChatModalComponent from "../components/ChatModal.svelte";
import type { Message, VectorSearchResult, VectorMatch, CloudflareAIPluginSettings } from "../types";

export class ChatModal extends Modal {
    private readonly DEFAULT_SYSTEM_MESSAGE: Message = {
        role: 'system',
        content: 'You are a helpful AI assistant that analyzes notes and provides insights. Consider the context carefully before answering questions.'
    };
    
    private messages: Message[] = [];
    private apiMessages: Message[] = [];
    private component: typeof ChatModalComponent | null = null;
    private readonly svelteComponents: SvelteComponent[] = [];
    
    private isProcessing = false;

    constructor(
        app: App,
        private readonly gateway: CloudflareAIGateway,
        private readonly vectorize: CloudflareVectorize,
        private readonly settings: CloudflareAIPluginSettings
    ) {
        super(app);
        this.settings = settings;
        this.validateServices();
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
                modelId: this.settings.textEmbeddingsModelId,
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
                topK: this.settings.topK
            });
        } catch (error) {
            console.error("Error searching vectors:", error);
            return null;
        }
    }

    private async enrichMessageWithContext(message: string, searchResults: VectorSearchResult | null): Promise<string> {
        if (!searchResults?.matches?.length) {
            return message;
        }

        const relevantMatches = searchResults.matches.filter(match => match.score >= this.settings.minSimilarityScore);
        
        if (!relevantMatches.length) {
            return message;
        }

        const context = (await Promise.all(relevantMatches
            .map(async (match: VectorMatch) => {
                const file = this.app.vault.getAbstractFileByPath(match.id);
                if (!file || !(file instanceof TFile)) {
                    return null;
                }
                
                try {
                    const content = await this.app.vault.cachedRead(file);
                    return `Note: ${match.id}\n${content}`;
                } catch (error) {
                    console.error(`Error reading note ${match.id}:`, error);
                    return null;
                }
            })))
            .filter(content => content !== null)
            .join("\n\n");

        if (!context) {
            return message;
        }

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

            const messageWithContext = await this.enrichMessageWithContext(message, searchResults);
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