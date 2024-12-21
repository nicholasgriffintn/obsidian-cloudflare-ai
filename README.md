# Obsidian Cloudflare AI Plugin

A plugin for Obsidian that adds an AI assistant with RAG functionality via Cloudflare AI.

## Features

- 🤖 Chat with AI through [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) using their provided [Models](https://developers.cloudflare.com/workers-ai/models/).
- 📝 Sync your Obsidian notes to a [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/) index.
- 🔄 Auto-sync your Obsidian notes to the Vectorize index at a set interval.

This is currently a work in progress, however, for now, here's a quick preview of the chat with a response that uses matching notes for context:

https://github.com/user-attachments/assets/cea3a90e-84ec-41ed-bd2b-c8dbfd51ce7c

## TODO

- [ ] Add a way to track what notes have been synced and when so we can avoid syncing the same note multiple times.
- [ ] Make sure that editing settings applies them immediately.
- [ ] Add the ability to send properties in the metadata.
- [ ] Add a minimum score for matches
- [ ] Make top_k configurable
- [ ] Add filtering of the RAG results.
```
curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/vectorize/v2/indexes/$INDEX_NAME/query \
    -H 'Content-Type: application/json' \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
    -d '{
      "vector": [
        0.5,
        0.5,
        0.5
      ],
      "filter": {
        "has_viewed": {
          "$ne": true
        },
        "streaming_platform": "netflix"
      },
      "topK": 5
    }'
```
- [ ] Add a way to delete notes from the Vectorize index.
- [ ] Auto delete notes from the Vectorize index if they are deleted from Obsidian.
- [ ] Add a text generation mode when you can insert the response into the current note.
- [ ] Add an image generation mode when you can insert the response into the current note.
- [ ] Add a speech to text mode.
- [ ] Look at adding other providers like Anthropic, OpenAI, etc.
- [ ] Make the UI nicer where possible.
- [ ] Figure out how to stream responses in (may be a problem with `request` from Obsidian, which we need to use to avoid CORS, maybe need an alternative).

## Requirements

- Cloudflare account
- A Cloudflare AI Gateway service, you can [find out how to get started here](https://developers.cloudflare.com/ai-gateway/get-started/)
- A Cloudflare Vectorize index, you can [find out more here](https://developers.cloudflare.com/vectorize/get-started/)
- Cloudflare API key for both Vectorize and AI Gateway, more information on how to do this can be found [here](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
    - You will need to create a token with the following permissions, you can create two tokens or one token with both permissions if you prefer.
        - `Read` and `Write` access to `Vectorize`
        - `Read` access to `AI Gateway`

## Installation

1. Clone this repository into your Obsidian plugins folder.
    ```bash
    cd path/to/vault/.obsidian/plugins
    gh repo clone nicholasgriffintn/obsidian-cloudflare-ai
    ```
2. Run `pnpm install` and then `pnpm run build` to build the plugin.
3. Open Obsidian and enable the plugin in the Obsidian settings.
4. Refresh your installed plugins list.

## Thanks

Props to the [Obsidian Svelte Plugin](https://github.com/emilio-toledo/obsidian-svelte-plugin) for the base structure!
