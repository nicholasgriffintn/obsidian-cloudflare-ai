<script lang="ts">
    import type { Message, VectorizeFilter } from "../types";
    import MessageList from "./MessageList.svelte";
    import ChatInput from "./ChatInput.svelte";

    export let messages: Message[] = [];
    export let isProcessing: boolean = false;
    export let onSendMessage: (message: string, filters: VectorizeFilter) => Promise<void>;
    export let onClearMessages: () => Promise<void>;
    export let onCopyConversation: (content: string) => Promise<void>;
</script>

<div class="chat-view">
    <MessageList
        {isProcessing}
        {messages}
        {onCopyConversation}
    />
    <ChatInput 
        {isProcessing}
        {onSendMessage}
        {onClearMessages}
        {onCopyConversation} 
    />
</div>

<style>
.chat-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1rem;
}
</style>