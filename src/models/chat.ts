import { SvelteComponent } from "svelte";
import { App, Modal } from "obsidian";

import { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import ChatModalComponent from "../components/ChatModal.svelte";

export class CHatModel extends Modal {
    svelteComponents: SvelteComponent[] = [];
	prompt!: string;
	messages!: Record<string, any>[];
	isProcessing!: boolean;
	gateway!: CloudflareAIGateway;

	constructor(app: App) {
		super(app);
		this.isProcessing = false;
	}

	onOpen() {
        const { contentEl } = this;
        contentEl.addClass("chat-modal");
        contentEl.createEl("h1", { text: "Hello, how can I help you?" });

        this.svelteComponents.push(
            new ChatModalComponent({
                target: contentEl,
                props: {
                    app: this.app,
                },
            }),
        );
	}

	onClose() {
		this.contentEl.empty();
	}
}
