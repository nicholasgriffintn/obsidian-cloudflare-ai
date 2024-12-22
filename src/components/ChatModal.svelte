<script lang="ts">
	import { onMount } from "svelte";
	import { Logger } from "../lib/logger";
	import type {
		VectorizeFilter, FilterOperator
	} from "../types";

	export let messages: Record<string, any>[];
	export let isProcessing: boolean;
	export let onSendMessage: (message: string, filters: VectorizeFilter) => void;
	export let onClearMessages: () => void;
	export let onCopyConversation: (content: string) => void;

	let inputText = "";
	let messagesContainer: HTMLDivElement;
	let textArea: HTMLTextAreaElement;
	let filters: VectorizeFilter = {};

	const logger = new Logger();

	$: logger.debug("Messages in Svelte component:", messages);

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
				await onSendMessage(inputText.trim(), filters);
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

	function parseMarkdown(text: string): string {
		return (
			text
				// Headers
				.replace(/^### (.*$)/gm, "<h3>$1</h3>")
				.replace(/^## (.*$)/gm, "<h2>$1</h2>")
				.replace(/^# (.*$)/gm, "<h1>$1</h1>")
				// Bold
				.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
				// Italic
				.replace(/\*(.*?)\*/g, "<em>$1</em>")
				// Code blocks
				.replace(/```([^`]*?)```/g, "<pre><code>$1</code></pre>")
				// Inline code
				.replace(/`([^`]+)`/g, "<code>$1</code>")
				// Lists
				.replace(/^\d+\. (.*$)/gm, "<li>$1</li>")
				.replace(/^- (.*$)/gm, "<li>$1</li>")
				// Line breaks
				.replace(/\n/g, "<br>")
		);
	}

	const filterOptions = [
		{ field: "createdYear", type: "number", label: "Created Year" },
		{ field: "createdMonth", type: "number", label: "Created Month" },
		{ field: "modifiedYear", type: "number", label: "Modified Year" },
		{ field: "modifiedMonth", type: "number", label: "Modified Month" },
		{ field: "extension", type: "string", label: "File Type" },
	] as const;

	function handleFormChange(e: Event) {
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form.closest('form') || form);
		
		filterOptions.forEach(option => {
			const value = formData.get(option.field);
			if (!value) {
				delete filters[option.field];
				return;
			}

			if (option.type === 'number') {
				const op = formData.get(`${option.field}-op`) as FilterOperator || '$eq';
				filters[option.field] = { [op]: Number(value) };
			} else {
				filters[option.field] = { '$eq': String(value) };
			}
		});
	}
</script>

<div class="container">
	{#if messages && messages.length > 0}
		<div
			class="messages"
			bind:this={messagesContainer}
			role="log"
			aria-live="polite"
		>
			{#each messages.filter((m) => m.role !== "system") as message (message.content)}
				<div class="message-wrapper {message.role}" role="article">
					<div class="message">
						<div class="message-content-wrapper">
							<span class="role-indicator">
								{message.role === "assistant" ? "🤖" : "👤"}
							</span>
							<div class="message-content">
								<p>{@html parseMarkdown(message.content)}</p>
							</div>
						</div>
						<div class="message-actions">
							<button
								class="copy-button"
								on:click={() =>
									copyMessageToClipboard(message.content)}
								aria-label="Copy message"
							>
								Copy
							</button>
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
			<div>
				<button
					disabled={isProcessing || !inputText.trim()}
					class="submit"
					on:click={handleSubmit}
				>
					Send Message
				</button>
			</div>
		</div>
		<details class="filters">
			<summary>RAG filters</summary>
			<form on:change={handleFormChange}>
				{#each filterOptions as option}
					<div class="filter-row">
					<label for={option.field}>{option.label}:</label>
					{#if option.type === 'number'}
						<select name={`${option.field}-op`}>
							<option value="$eq">=</option>
							<option value="$gte">{`>=`}</option>
							<option value="$lte">{`<=`}</option>
						</select>
					{/if}
					<select name={option.field}>
						<option value="">Any</option>
						{#if option.field === "extension"}
							<option value="md">Markdown</option>
						{:else if option.field === "createdYear" || option.field === "modifiedYear"}
							{#each Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i) as year}
								<option value={year}>{year}</option>
							{/each}
						{:else if option.field === "createdMonth" || option.field === "modifiedMonth"}
							{#each Array.from({ length: 12 }, (_, i) => i + 1) as month}
								<option value={month}>{month}</option>
							{/each}
						{/if}
					</select>
					</div>
				{/each}
			</form>
		</details>
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

	.message-wrapper {
		padding: 0.75rem 1rem;
		transition: background-color 0.2s ease;
		position: relative;
	}

	.message-wrapper.assistant {
		background-color: var(--background-secondary);
	}

	.message {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.message-content-wrapper {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.role-indicator {
		font-size: 1em;
		line-height: 1.4;
		flex-shrink: 0;
	}

	.message-content {
		flex: 1;
		min-width: 0;
	}

	.typing-indicator {
		padding: 1rem;
		display: flex;
		gap: 0.4rem;
		justify-content: center;
	}

	.typing-indicator span {
		width: 8px;
		height: 8px;
		background-color: var(--text-muted);
		border-radius: 50%;
		animation: bounce 1.4s infinite ease-in-out;
	}

	.typing-indicator span:nth-child(1) {
		animation-delay: -0.32s;
	}
	.typing-indicator span:nth-child(2) {
		animation-delay: -0.16s;
	}

	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: scale(0);
		}
		40% {
			transform: scale(1);
		}
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

	.message-content :global(code) {
		background-color: var(--background-primary-alt);
		padding: 0.2em 0.4em;
		border-radius: 3px;
		font-family: monospace;
	}

	.message-content :global(pre) {
		background-color: var(--background-primary-alt);
		padding: 1em;
		border-radius: 4px;
		overflow-x: auto;
	}

	.message-content :global(h1),
	.message-content :global(h2),
	.message-content :global(h3) {
		margin: 0.5em 0;
	}

	.message-content :global(li) {
		margin-left: 1.5em;
	}

	.message-actions {
		opacity: 0;
		transition: opacity 0.2s ease;
		margin-top: 0;
		height: 0;
		overflow: hidden;
	}

	.message-wrapper:hover .message-actions {
		opacity: 1;
		height: auto;
		margin-top: 0.25rem;
	}

	.copy-button {
		font-size: 0.8em;
		padding: 0.2em 0.6em;
		background-color: var(--background-modifier-border);
		border-radius: 4px;
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}

	.copy-button:hover {
		opacity: 1;
	}

	.message-content > :global(p:first-child) {
		margin-top: 0;
	}

	.filters {
		padding: 0.5rem;
		border-bottom: 1px solid var(--background-modifier-border);
	}
	.filter-row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		align-items: center;
	}
	.filter-row label {
		min-width: 100px;
	}

	.filter-menu {
		position: relative;
		margin-right: 0.5rem;
	}

	.filter-menu summary {
		cursor: pointer;
		padding: 0.5rem;
		background: var(--background-modifier-border);
		border-radius: 4px;
	}

	.filter-menu .filters {
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		padding: 1rem;
		margin-bottom: 0.5rem;
		min-width: 200px;
		z-index: 100;
	}
</style>
