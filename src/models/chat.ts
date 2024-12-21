import { SvelteComponent } from "svelte";
import { App, Modal, Notice } from "obsidian";

import { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import ChatModalComponent from "../components/ChatModal.svelte";

export class ChatModel extends Modal {
    private _messages: Record<string, any>[] = [];
    private component: ChatModalComponent | null = null;
    svelteComponents: SvelteComponent[] = [];
    prompt!: string;
    isProcessing!: boolean;
    gateway!: CloudflareAIGateway;

    constructor(app: App, gateway: CloudflareAIGateway) {
        super(app);
        this.gateway = gateway;
        this.isProcessing = false;
    }

    private updateComponent() {
        if (this.component) {
            this.component.$set({ 
                messages: [...this._messages],  // Force new array reference
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

            this._messages = [...this._messages, {
                role: "user",
                content: message
            }];
            this.updateComponent();

            this.prompt = "";

            const response = await this.gateway.generateText(
                this._messages,
                this.contentEl
            );

            if (!response) {
                throw new Error("No response from AI Gateway");
            }

            this._messages = [...this._messages, {
                role: "assistant",
                content: response
            }];
            this.updateComponent();

        } catch (error) {
            console.error("Error generating response:", error);
            new Notice("Error generating response. Please try again.");
            this._messages = this._messages.slice(0, -1);
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
                messages: this._messages,
                isProcessing: this.isProcessing,
                onSendMessage: (message: string) => this.onSendMessage(message),
                onClearMessages: () => this.onClearMessages(),
                onCopyConversation: (content: string) => this.onCopyConversation(content),
            },
        });

        this.svelteComponents.push(this.component);
    }

    async onClearMessages() {
        this._messages = [];
        this.updateComponent();
    }

    async onCopyConversation(content: string) {
        await navigator.clipboard.writeText(content);
    }

    onClose() {
        this.contentEl.empty();
    }
}
