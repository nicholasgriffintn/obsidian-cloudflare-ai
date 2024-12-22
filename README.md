# Obsidian Cloudflare AI Plugin

A plugin for Obsidian that adds an AI assistant with RAG functionality via Cloudflare AI.

## Features

- 🤖 Chat with AI through [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) using their provided [Models](https://developers.cloudflare.com/workers-ai/models/).
- 📝 Sync your Obsidian notes to a [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/) index.
- 🔄 Auto-sync your Obsidian notes to the Vectorize index at a set interval.
  - You can also ignore folders if you don't want to sync them.
  - State is saved in the `.cloudflare-ai/sync` folder, this ensures that we don't sync the same note multiple times.

This is currently a work in progress, however, for now, here's a quick preview of the chat with a response that uses matching notes for context:

https://github.com/user-attachments/assets/cea3a90e-84ec-41ed-bd2b-c8dbfd51ce7c

## TODO

- [ ] Figure out how to stream responses in (may be a problem with `request` from Obsidian, which we need to use to avoid CORS, maybe need an alternative).
- [ ] Add the ability to send properties in the metadata.
- [ ] Add filtering of the RAG results.
```
# Metadata available:
metadata
: 
created
: 
1734814580918
createdMonth
: 
12
createdYear
: 
2024
extension
: 
"md"
fileName
: 
"AI Gateway Changelog.md"
modified
: 
1734832007176
modifiedMonth
: 
12
modifiedYear
: 
2024

# How to:
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
- [ ] Add a text generation mode where you can insert the response into the current note.
- [ ] Add an image generation mode where you can insert the response into the current note.
- [ ] Add a speech to text mode.
- [ ] Look at adding other providers like Anthropic, OpenAI, etc.
- [ ] Make the UI nicer where possible.

## Requirements

- Cloudflare account
- A Cloudflare AI Gateway service, you can [find out how to get started here](https://developers.cloudflare.com/ai-gateway/get-started/)
- A Cloudflare Vectorize index, you can [find out more here](https://developers.cloudflare.com/vectorize/get-started/)
- Cloudflare API key for both Vectorize and AI Gateway, more information on how to do this can be found [here](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
    - You will need to create a token with the following permissions, you can create two tokens or one token with both permissions if you prefer.
        - `Read` and `Write` access to `Vectorize`
        - `Read` access to `AI Gateway`

## Installation

1. Navigate to the [Releases](https://github.com/nicholasgriffintn/obsidian-cloudflare-ai/releases) page and download the `.zip` file from the latest release. It will be named something like `cloudflare-ai-0.0.5.zip`.
2. Navigate to your Obsidian plugins folder, such as `path/to/vault/.obsidian/plugins`.
3. Unzip the downloaded file and move the `obsidian-cloudflare-ai` folder into the plugins folder.
4. Open Obsidian and enable the plugin in the Obsidian settings.
5. Refresh your installed plugins list.

## Thanks

Props to the [Obsidian Svelte Plugin](https://github.com/emilio-toledo/obsidian-svelte-plugin) for the base structure!
