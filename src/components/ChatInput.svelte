<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import type { VectorizeFilter, FilterOperator } from "../types";

    export let isProcessing: boolean = false;
    export let onSendMessage: (message: string, filters: VectorizeFilter) => Promise<void>;

    let inputText = "";
    let textArea: HTMLTextAreaElement;
    let filters: VectorizeFilter = {};
    let showFilters = false;

    const filterOptions = [
        { field: "createdYear", type: "number", label: "Created Year" },
        { field: "createdMonth", type: "number", label: "Created Month" },
        { field: "modifiedYear", type: "number", label: "Modified Year" },
        { field: "modifiedMonth", type: "number", label: "Modified Month" },
        { field: "extension", type: "string", label: "File Type" },
    ] as const;

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
            class="send-button submit"
            disabled={isProcessing || !inputText.trim()}
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

        <slot name="additional-actions" />
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
                            <select name={`${option.field}-op`} class="operator-select">
                                <option value="$eq">=</option>
                                <option value="$gte">{`>=`}</option>
                                <option value="$lte">{`<=`}</option>
                            </select>
                            <select name={option.field} class="value-select">
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

<style>
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
