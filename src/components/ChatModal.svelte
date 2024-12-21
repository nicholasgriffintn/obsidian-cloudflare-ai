<script lang="ts">
	import { onMount } from "svelte";
	export let messages: Record<string, any>[];
	export let isProcessing: boolean;
	export let onSendMessage: (message: string) => void;
	export let onClearMessages: () => void;
	export let onCopyConversation: (content: string) => void;

	let inputText = "";
	let messagesContainer: HTMLDivElement;
	let textArea: HTMLTextAreaElement;

	$: console.log("Messages in Svelte component:", messages);

	$: if (messages && messagesContainer) {
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 0);
	}

	const adjustTextAreaHeight = () => {
		if (textArea) {
			textArea.style.height = "auto";
			textArea.style.height = `${Math.min(textArea.scrollHeight, 200)}px`;
		}
	};

	onMount(() => {
		if (textArea) {
			adjustTextAreaHeight();
		}
	});

	const handleSubmit = async () => {
		if (inputText.trim() && !isProcessing) {
			try {
				await onSendMessage(inputText.trim());
				inputText = "";
				adjustTextAreaHeight();
			} catch (error) {
				console.error("Error sending message:", error);
				throw error;
			}
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	const clearMessages = () => {
		onClearMessages();
	};

	const copyMessageToClipboard = async (content: string) => {
		try {
			await onCopyConversation(content);
		} catch (error) {
			console.error("Error copying message:", error);
			throw error;
		}
	};
</script>

<div class="container">
	{#if messages && messages.length > 0}
		<div
			class="messages"
			bind:this={messagesContainer}
			role="log"
			aria-live="polite"
		>
			{#each messages as message (message.content)}
				<div class="message-wrapper {message.role}" role="article">
					<div
						class="message"
						on:click={() => copyMessageToClipboard(message.content)}
						on:keydown={(e) =>
							e.key === "Enter" &&
							copyMessageToClipboard(message.content)}
						role="button"
						tabindex="0"
						aria-label="Click to copy message"
					>
						<div class="message-header">
							<span class="role-indicator">
								{message.role === "assistant" ? "🤖" : "👤"}
							</span>
						</div>
						<div class="message-content">
							<p>{message.content}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="welcome-message">
			<h3>Hi there! 👋</h3>
			<p>Send a message to start a conversation with your notes.</p>
		</div>
	{/if}

	{#if isProcessing}
		<div class="typing-indicator">
			<span>●</span>
			<span>●</span>
			<span>●</span>
		</div>
	{/if}

	<div class="input-container">
		<div class="input-controls">
			<textarea
                bind:this={textArea}
                bind:value={inputText}
                on:input={adjustTextAreaHeight}
                on:keydown={handleKeyDown}
                placeholder="Type your message here... (Shift + Enter for new line)"
                disabled={isProcessing}
                rows="3"
                aria-label="Message input"
            />
			<button
				disabled={isProcessing || !inputText.trim()}
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
			<button
				on:click={async () =>
					await copyMessageToClipboard(
						messages.map((m) => m.content).join("\n\n"),
					)}>Copy conversation</button
			>
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
		align-items: start;
	}

	.input-controls textarea {
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

    .typing-indicator {
        display: flex;
        gap: 0.25rem;
        padding: 0.5rem;
        animation: fade 1s infinite;
    }

    @keyframes fade {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
    }
</style>
