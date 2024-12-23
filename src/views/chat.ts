import { ItemView, WorkspaceLeaf } from "obsidian";
import type { SvelteComponent } from "svelte";

import { PLUGIN_PREFIX } from "../constants";
import { BaseChat } from "../shared/base-chat";
import ChatViewComponent from "../components/ChatView.svelte";
import { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import { CloudflareVectorize } from "../lib/cloudflare-vectorize";
import { SyncService } from "../services/sync";
import type { CloudflareAIPluginSettings } from "../types";

class ConcreteChat extends BaseChat {}

export class ChatView extends ItemView {
	private chat: ConcreteChat;

	constructor(
		leaf: WorkspaceLeaf,
		gateway: CloudflareAIGateway,
		vectorize: CloudflareVectorize,
		settings: CloudflareAIPluginSettings,
		syncService: SyncService,
	) {
		super(leaf);
		this.chat = new ConcreteChat(
			leaf.view.app,
			gateway,
			vectorize,
			settings,
			syncService,
		);
		this.chat.contentEl = this.containerEl.children[1] as HTMLElement;
	}

	getViewType(): string {
		return PLUGIN_PREFIX;
	}

	getDisplayText(): string {
		return "AI Chat";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		this.chat.initializeComponent(
			container,
			ChatViewComponent as typeof SvelteComponent,
		);
	}

	async onClose() {
		const container = this.containerEl.children[1];
		this.chat.cleanup();
		container.empty();
	}
}
