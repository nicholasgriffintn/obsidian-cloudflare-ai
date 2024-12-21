import { SvelteComponent } from "svelte";
import { App, Modal, Notice } from "obsidian";

import { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import { CloudflareVectorize } from "../lib/cloudflare-vectorize";
import ChatModalComponent from "../components/ChatModal.svelte";

export class ChatModel extends Modal {
    private messages: Record<string, any>[] = [];
    private apiMessages: Record<string, any>[] = [];
    private component: ChatModalComponent | null = null;
    svelteComponents: SvelteComponent[] = [];
    prompt!: string;
    isProcessing!: boolean;
    gateway!: CloudflareAIGateway;
    vectorize!: CloudflareVectorize;
    textEmbeddingsModelId!: string;

    constructor(app: App, gateway: CloudflareAIGateway, vectorize: CloudflareVectorize, textEmbeddingsModelId: string) {
        super(app);
        this.gateway = gateway;
        this.vectorize = vectorize;
        this.textEmbeddingsModelId = textEmbeddingsModelId;
        this.isProcessing = false;
    }

    private updateComponent() {
        if (this.component) {
            this.component.$set({
                messages: [...this.messages],
                isProcessing: this.isProcessing
            });
        }
    }

    async onSendMessage(message: string) {
        if (!message.trim()) return;
        this.isProcessing = true;

        try {
            if (!this.gateway) {
                throw new Error("Gateway not initialized");
            }

            const hasSystemMessage = this.messages.some(message => message.role === "system");

            if (!hasSystemMessage) {
                this.messages = [...this.messages, {
                    "role": "system",
                    "content": "You are a helpful AI assistant that analyzes notes and provides insights. Consider the context carefully before answering questions."
                },];
            }

            this.messages = [...this.messages, {
                role: "user",
                content: message
            }];
            this.updateComponent();

            this.prompt = "";

            let embedding = null;
            try {
                if (!this.textEmbeddingsModelId) {
                    throw new Error("Text embeddings model ID not set");
                }
                if (!this.vectorize) {
                    throw new Error("Vectorize not initialized");
                }

                embedding = await this.gateway.makeRequest({
                    modelId: this.textEmbeddingsModelId,
                    prompt: message,
                    shouldStream: false,
                    type: "embedding"
                });

                if (!embedding.success) {
                    throw new Error(`The request failed with the following error: ${embedding.errors?.map((error: any) => error.message).join(", ")}`);
                }
            } catch (error) {
                console.error("Error getting vectors for message:", error);
            }

            let searchResults = null;
            try {
                if (embedding?.data?.length > 0) {
                    if (!this.vectorize) {
                        throw new Error("Vectorize not initialized");
                    }

                    searchResults = await this.vectorize.queryVectors({
                        vector: embedding.data[0],
                        topK: 3
                    });
                }
            } catch (error) {
                console.error("Error querying vectors:", error);
            }

            let messageWithContext = "";

            if (searchResults?.matches?.length > 0) {
                // TODO: This needs to get the content from the note. For now we just get the id.
                const context = searchResults.matches
                    .map((match: any) => match.id)
                    .join("\n\n");

                messageWithContext = `Context from my notes:\n\n${context}\n\nQuestion: ${message}`;
            } else {
                messageWithContext = message;
            }

            this.apiMessages = [...this.apiMessages, {
                role: "user",
                content: messageWithContext
            }];

            const response = await this.gateway.generateText(
                this.apiMessages,
                this.contentEl
            );

            if (!response) {
                throw new Error("No response from AI Gateway");
            }

            const assistantMessage = {
                role: "assistant",
                content: response
            };
            this.messages = [...this.messages, assistantMessage];
            this.apiMessages = [...this.apiMessages, assistantMessage];
            this.updateComponent();
        } catch (error) {
            console.error("Error generating response:", error);
            new Notice("Error generating response. Please try again.");
            this.messages = this.messages.slice(0, -1);
            this.apiMessages = this.apiMessages.slice(0, -1);
            this.updateComponent();
        } finally {
            this.isProcessing = false;
            this.updateComponent();
        }
    }

    onOpen() {
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

    async onClearMessages() {
        this.messages = [];
        this.apiMessages = [];
        this.updateComponent();
    }

    async onCopyConversation(content: string) {
        await navigator.clipboard.writeText(content);
    }

    onClose() {
        this.contentEl.empty();
    }
}
