<script lang="ts">
	import type { Message, VectorizeFilter } from "../types";
	import MessageList from "./MessageList.svelte";
	import ChatInput from "./ChatInput.svelte";
	import Clean from "./icons/clean.svelte";
	import Copy from "./icons/copy.svelte";
	export let messages: Message[] = [];
	export let isProcessing: boolean = false;
	export let onSendMessage: (message: string, filters: VectorizeFilter) => Promise<void>;
	export let onClearMessages: () => Promise<void>;
	export let onCopyConversation: (content: string) => Promise<void>;
</script>

<div class="chat-container">
	<MessageList {isProcessing} {messages} {onCopyConversation} />

	<ChatInput {isProcessing} {onSendMessage}>
		<div slot="additional-actions">
			{#if messages?.length > 0}
				<button class="action-button" on:click={onClearMessages}>
					<Clean />
					<span class="sr-only">Clear Chat</span>
				</button>
				<button
					class="action-button"
					on:click={() => onCopyConversation(messages.map((m) => `${m.role}: ${m.content}`).join("\n\n"))}
				>
					<Copy />
					<span class="sr-only">Copy Conversation</span>
				</button>
			{/if}
		</div>
	</ChatInput>
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		color: #fff;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			"Segoe UI",
			sans-serif;
	}

	.action-button {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		padding: 0.5rem 1rem;
		cursor: pointer;
		font-size: 0.9em;
		text-align: left;
	}

.action-button :global(svg) {
	width: 16px;
	height: 16px;
}

	.action-button:hover {
		background: rgba(255, 255, 255, 0.15);
	}
</style>
