<script lang="ts">
	import { onMount } from "svelte";
	import { fade, fly } from "svelte/transition";
	import { parseMarkdown } from "../utils/markdown-parser";
	import type { VectorizeFilter, FilterOperator } from "../types/index";

	export let messages: Record<string, any>[] = [];
	export let isProcessing: boolean = false;
	export let onSendMessage: (
		message: string,
		filters: VectorizeFilter,
	) => void;
	export let onClearMessages: () => void;
	export let onCopyConversation: (content: string) => void;

	let inputText = "";
	let messagesContainer: HTMLDivElement;
	let textArea: HTMLTextAreaElement;
	let filters: VectorizeFilter = {};
	let showFilters = false;

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
		}
	};

	const filterOptions = [
		{ field: "createdYear", type: "number", label: "Created Year" },
		{ field: "createdMonth", type: "number", label: "Created Month" },
		{ field: "modifiedYear", type: "number", label: "Modified Year" },
		{ field: "modifiedMonth", type: "number", label: "Modified Month" },
		{ field: "extension", type: "string", label: "File Type" },
	] as const;

	function handleFormChange(e: Event) {
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form.closest("form") || form);

		filterOptions.forEach((option) => {
			const value = formData.get(option.field);
			if (!value) {
				delete filters[option.field];
				return;
			}

			if (option.type === "number") {
				const op =
					(formData.get(`${option.field}-op`) as FilterOperator) ||
					"$eq";
				filters[option.field] = { [op]: Number(value) };
			} else {
				filters[option.field] = { $eq: String(value) };
			}
		});
	}
</script>

<div class="chat-container">
	{#if messages && messages.length > 0}
		<div
			class="messages"
			bind:this={messagesContainer}
			role="log"
			aria-live="polite"
		>
			{#each messages.filter((m) => m.role !== "system") as message (message.content)}
				<div
					class="message-wrapper {message.role}"
					role="article"
					in:fly={{ y: 20, duration: 300 }}
					out:fade={{ duration: 200 }}
				>
					<div class="message">
						<div class="message-content-wrapper">
							<span class="role-indicator" aria-hidden="true">
								{message.role === "assistant" ? "🤖" : "👤"}
							</span>
							<div class="message-content">
								{@html parseMarkdown(message.content)}
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
		<div class="welcome-message" in:fade={{ duration: 300 }}>
			<h3>Welcome to the Chat! 👋</h3>
			<p>Send a message to start a conversation with your notes.</p>
		</div>
	{/if}

	{#if isProcessing}
		<div class="typing-indicator" in:fade={{ duration: 200 }}>
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
				rows="1"
				aria-label="Message input"
			/>
			<button
				disabled={isProcessing || !inputText.trim()}
				class="submit"
				on:click={handleSubmit}
			>
				Send
			</button>
		</div>
		<div class="actions">
			<button
				class="action-button"
				on:click={() => (showFilters = !showFilters)}
				aria-expanded={showFilters}
			>
				{showFilters ? "Hide RAG Filters" : "Show RAG Filters"}
			</button>

			{#if messages?.length > 0}
				<button
				class="action-button" on:click={clearMessages}>Clear Chat</button>
				<button
				class="action-button"
					on:click={() =>
						copyMessageToClipboard(
							messages.map((m) => `${m.role}: ${m.content}`).join("\n\n"),
						)}
				>
					Copy Conversation
				</button>
			{/if}
		</div>
	</div>

	{#if showFilters}
		<div class="filters" in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}>
			<form on:change={handleFormChange}>
				{#each filterOptions as option}
					<div class="filter-row">
						<label for={option.field}>{option.label}</label>
						{#if option.type === "number"}
							<div class="filter-inputs">
								<select
									name={`${option.field}-op`}
									class="operator-select"
								>
									<option value="$eq">=</option>
									<option value="$gte">{`>=`}</option>
									<option value="$lte">{`<=`}</option>
								</select>
								<select
									name={option.field}
									class="value-select"
								>
									<option value="">Any</option>
									{#if option.field.includes("Year")}
										{#each Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i) as year}
											<option value={year}>{year}</option>
										{/each}
									{:else}
										{#each Array.from({ length: 12 }, (_, i) => i + 1) as month}
											<option value={month}
												>{month}</option
											>
										{/each}
									{/if}
								</select>
							</div>
						{:else}
							<select name={option.field} class="full-width">
								<option value="">Any</option>
								<option value="md">Markdown</option>
							</select>
						{/if}
					</div>
				{/each}
			</form>
		</div>
	{/if}
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

	button.submit {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 0;
	}

	.message-wrapper {
		padding: 0.5rem 1rem;
	}

	.message-wrapper.assistant {
		background: rgba(255, 255, 255, 0.05);
	}

	.message {
		max-width: 100%;
		padding: 0px;
	}

	.message-content-wrapper {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.role-indicator {
		font-size: 1em;
		line-height: 1.4;
	}

	.message-content {
		flex: 1;
		line-height: 1.4;
		width: 100%;
		overflow: scroll;
	}

	.message-content > :global(p:first-child),
	.message-content > :global(h2:first-child) {
		margin-top: 0;
	}

	.message-content :global(ul) {
		margin-left: 0;
		padding-left: 0;
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

	.typing-indicator {
		padding: 1rem;
		display: flex;
		gap: 0.4rem;
		justify-content: center;
	}

	.typing-indicator span {
		width: 8px;
		height: 8px;
		background-color: rgba(255, 255, 255, 0.5);
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
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 1rem;
	}

	.input-controls {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	textarea {
		flex: 1;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		color: inherit;
		padding: 0.75rem;
		resize: none;
		min-height: 40px;
	}

	textarea:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.2);
	}

	.send-button {
		background: rgb(99, 82, 171);
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.75rem 1.5rem;
		cursor: pointer;
		font-size: 0.9em;
	}

	.send-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input-filters {
		margin-top: 8px;
	}

	.filters {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
		padding: 1rem;
		margin-top: 0.5rem;
	}

	.filter-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.filter-row:last-child {
		margin-bottom: 0;
	}

	.filter-inputs {
		display: flex;
		gap: 0.5rem;
	}

	select {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		color: inherit;
		padding: 0.25rem 0.5rem;
	}

	.operator-select {
		width: 50px;
	}

	.value-select {
		width: 100px;
	}

	select.full-width {
		width: 158px;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
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

	.action-button:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	@media (max-width: 600px) {
		.filter-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.filter-inputs {
			width: 100%;
		}

		.value-select,
		select.full-width {
			flex: 1;
		}
	}
</style>
