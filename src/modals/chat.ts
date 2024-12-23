import { Modal } from "obsidian";
import type { SvelteComponent } from "svelte";

import { BaseChat } from "../shared/base-chat";
import ChatModalComponent from "../components/ChatModal.svelte";

class ConcreteChat extends BaseChat {}

export class ChatModal extends Modal {
	private chat: ConcreteChat;

	constructor(...args: ConstructorParameters<typeof BaseChat>) {
		super(args[0]);
		this.chat = new ConcreteChat(...args);
		this.chat.contentEl = this.contentEl;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("chat-modal");
		this.chat.initializeComponent(
			contentEl,
			ChatModalComponent as typeof SvelteComponent,
		);
	}

	onClose(): void {
		const { contentEl } = this;
		this.chat.cleanup();
		contentEl.empty();
		contentEl.removeClass("chat-modal");
	}
}
