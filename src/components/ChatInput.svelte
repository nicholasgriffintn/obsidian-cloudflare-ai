<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";

    import Send from "./icons/send.svelte";
    import Filter from "./icons/filter.svelte";
    import type { VectorizeFilter, FilterOperator, Message } from "../types";
    import Clean from "./icons/clean.svelte";
    import Copy from "./icons/copy.svelte";

    export let isProcessing: boolean = false;
    export let messages: Message[] = [];
    export let onSendMessage: (message: string, filters: VectorizeFilter) => Promise<void>;
    export let onClearMessages: () => Promise<void>;
    export let onCopyConversation: () => Promise<void>;

    let inputText = "";
    let textArea: HTMLTextAreaElement;
    let filters: VectorizeFilter = {};
    let showFilters = false;
    let inputContainer: HTMLDivElement;

    const filterOptions = [
        { field: "createdYear", type: "number", label: "Created Year" },
        { field: "createdMonth", type: "number", label: "Created Month" },
        { field: "modifiedYear", type: "number", label: "Modified Year" },
        { field: "modifiedMonth", type: "number", label: "Modified Month" },
        { field: "extension", type: "string", label: "File Type" },
    ] as const;

    const adjustTextAreaHeight = () => {
        if (textArea) {
            textArea.style.height = "24px";
            const newHeight = Math.min(Math.max(textArea.scrollHeight, 24), 200);
            textArea.style.height = `${newHeight}px`;
            if (inputContainer) {
                inputContainer.style.height = `${newHeight + 66}px`;
            }
        }
    };

    onMount(() => {
        if (textArea) {
            textArea.style.height = "24px";
            inputContainer.style.height = "90px";
            adjustTextAreaHeight();
        }
    });

    const handleSubmit = async () => {
        if (inputText.trim() && !isProcessing) {
            const messageToSend = inputText.trim();
            inputText = "";
            textArea.style.height = "24px";
            inputContainer.style.height = "90px";
            
            try {
                await onSendMessage(messageToSend, filters);
            } catch (error) {
                console.error("Error sending message:", error);
                inputText = messageToSend;
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

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
                const op = (formData.get(`${option.field}-op`) as FilterOperator) || "$eq";
                filters[option.field] = { [op]: Number(value) };
            } else {
                filters[option.field] = { $eq: String(value) };
            }
        });
    }
</script>

<div class="input-wrapper">
    <div class="input-container" bind:this={inputContainer}>
        <textarea
            bind:this={textArea}
            bind:value={inputText}
            on:input={adjustTextAreaHeight}
            on:keydown={handleKeyDown}
            placeholder="Type your message here..."
            disabled={isProcessing}
            rows="1"
            aria-label="Message input"
        />
        
        <div class="actions-container">
            <div class="left-actions">
                <button
                    class="action-button"
                    on:click={() => (showFilters = !showFilters)}
                    aria-expanded={showFilters}
                    aria-label={showFilters ? "Hide RAG Filters" : "Show RAG Filters"}
                >
                    <Filter />
                    <span class="sr-only">
                        {showFilters ? "Hide RAG Filters" : "Show RAG Filters"}
                    </span>
                </button>
                {#if messages?.length > 0}
                    <button class="action-button" on:click={onClearMessages} aria-label="Clear Chat">
                        <Clean />
                        <span class="sr-only">Clear Chat</span>
                    </button>
                    <button
                        class="action-button"
                        on:click={onCopyConversation}
                        aria-label="Copy Conversation"
                    >
                        <Copy />
                        <span class="sr-only">Copy Conversation</span>
                    </button>
                {/if}
                <slot name="additional-actions" />
            </div>
            
            <button
                class="send-button"
                disabled={isProcessing || !inputText.trim()}
                on:click={handleSubmit}
                aria-label="Send message"
            >
                <Send />
                <span class="sr-only">Send</span>
            </button>
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
                                <select name={`${option.field}-op`} class="operator-select" aria-label="Filter operator">
                                    <option value="$eq">=</option>
                                    <option value="$gte">{`>=`}</option>
                                    <option value="$lte">{`<=`}</option>
                                </select>
                                <select name={option.field} class="value-select" aria-label="Filter value">
                                    <option value="">Any</option>
                                    {#if option.field.includes("Year")}
                                        {#each Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i) as year}
                                            <option value={year}>{year}</option>
                                        {/each}
                                    {:else}
                                        {#each Array.from({ length: 12 }, (_, i) => i + 1) as month}
                                            <option value={month}>{month}</option>
                                        {/each}
                                    {/if}
                                </select>
                            </div>
                        {:else}
                            <select name={option.field} class="full-width" aria-label="Filter value">
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
    .input-wrapper {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 1rem;
    }

    .input-container {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0.75rem;
        min-height: 56px;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    textarea {
        background: none;
        border: none;
        color: inherit;
        padding: 0;
        resize: none;
        width: 100%;
        font-family: inherit;
        font-size: inherit;
        min-height: 24px;
        padding: 0.5rem 0.75rem;
    }

    textarea:focus {
        outline: none;
    }

    .actions-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .left-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .action-button {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        font-size: 0.9em;
        border-radius: 4px;
        white-space: nowrap;
    }

    .action-button :global(svg) {
        width: 16px;
        height: 16px;
    }

    .action-button:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .send-button {
        background: rgb(99, 82, 171);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        font-size: 0.9em;
        min-width: 80px;
    }

    .send-button :global(svg) {
        width: 16px;
        height: 16px;
    }

    .send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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

        .actions-container {
            flex-direction: column;
            align-items: stretch;
        }

        .left-actions {
            justify-content: stretch;
        }

        .action-button,
        .send-button {
            width: 100%;
        }
    }
</style>
