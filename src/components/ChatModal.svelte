<script lang="ts">
	export let messages: Record<string, any>[];
	export let isProcessing: boolean;
	export let onSendMessage: (message: string) => void;
	export let onClearMessages: () => void;
	export let onCopyConversation: (content: string) => void;

	let inputText = "";

	$: console.log('Messages in Svelte component:', messages);

	const handleSubmit = () => {
		if (inputText.trim()) {
			onSendMessage(inputText);
			inputText = "";
		}
	};

	const clearMessages = () => {
		onClearMessages();
	};

	const copyToClipboard = async (content: string) => {
		onCopyConversation(content);
	};
</script>

<div class="container">
	{#if messages && messages.length > 0}
		<div class="messages">
			{#each messages as message (message.content)}
				<div
					class="message {message.role}"
					on:click={() => copyToClipboard(message.content)}
					on:keydown={(e) =>
						e.key === "Enter" && copyToClipboard(message.content)}
					role="button"
					tabindex="0"
				>
					<p>{message.content}</p>
				</div>
			{/each}
		</div>
	{:else}
		<div class="welcome-message">
			<h3>Welcome! 👋</h3>
			<p>Send a message to start a conversation.</p>
		</div>
	{/if}

	<div class="input-container">
		<div class="input-controls">
			<input
				type="text"
				placeholder="Ask a question here"
				bind:value={inputText}
				on:keypress={(e) => e.key === "Enter" && handleSubmit()}
				disabled={isProcessing}
			/>
			<button
				disabled={isProcessing}
				class="submit"
				on:click={handleSubmit}
			>
				Send Message
			</button>
		</div>
	</div>

	{#if messages?.length > 0}
		<div class="actions">
			<button on:click={clearMessages}>Clear</button>
			<button on:click={async () => await copyToClipboard(messages.map(m => m.content).join("\n\n"))}>Copy conversation</button>
		</div>
	{/if}
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
	}

	.message {
		padding: 0.5rem;
		margin: 0.5rem;
		cursor: pointer;
	}

	.message.assistant {
		background-color: var(--background-secondary);
	}

	.input-container {
		border-top: 1px solid var(--background-modifier-border);
		padding-top: 1rem;
	}

	.input-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.input-controls input[type="text"] {
		flex: 1;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		border-top: 1px solid var(--background-modifier-border);
		padding-top: 0.5rem;
	}

	button.submit {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.welcome-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		color: var(--text-muted);
		gap: 0.5rem;
	}

	.welcome-message h3 {
		margin: 0;
	}
</style>
