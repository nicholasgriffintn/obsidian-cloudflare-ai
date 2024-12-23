<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import type { Message } from "../types";
    import { parseMarkdown } from "../utils/markdown-parser";

    export let messages: Message[] = [];
    export let onCopyConversation: (content: string) => Promise<void>;
    export let isProcessing: boolean = false;

    let messagesContainer: HTMLDivElement;

    $: if (messages && messagesContainer) {
        setTimeout(() => {
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 0);
    }
</script>

{#if messages && messages.length > 0}
    <div class="messages" bind:this={messagesContainer} role="log" aria-live="polite">
        {#each messages.filter((m) => m.role !== "system") as message (message.content)}
            <div class="message-wrapper {message.role}" role="article" 
                in:fly={{ y: 20, duration: 300 }} out:fade={{ duration: 200 }}>
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
                        <button class="copy-button" 
                            on:click={() => onCopyConversation(message.content)}
                            aria-label="Copy message">
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

<style>
    .messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem 0;
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

    /* Keep all the message content styles */
    .message-content :global(p:first-child),
    .message-content :global(h2:first-child) {
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
</style>
