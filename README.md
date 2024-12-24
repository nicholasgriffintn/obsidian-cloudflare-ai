# Obsidian Cloudflare AI Plugin

A plugin for Obsidian that adds an AI assistant with RAG functionality via Cloudflare AI.

## Features

- 🤖 Chat with AI through [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) using their provided [Models](https://developers.cloudflare.com/workers-ai/models/).
  - Both a modal and a view in the Obsidian sidebar is supported.
- 📝 Sync your Obsidian notes to a [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/) index.
  - You can also ignore folders if you don't want to sync them.
  - State is saved in the `.cloudflare-ai/sync` folder, this ensures that we don't sync the same note multiple times.
  - Deleting a note from Obsidian will also delete it from the Vectorize index.
  - Handles large notes by chunking them into smaller pieces.
- 🔄 Auto-sync your Obsidian notes to the Vectorize index at a set interval.
- 🔍 Filter the notes provided in the AI's context by created or modified dates as well as the type of note.
- ⚙️ Generate text from templates with some default options for summarising, rewriting, etc, as well as the ability to load in your own templates.

This is currently a work in progress, however, for now, here's a quick preview of the chat with a response that uses matching notes for context:

https://github.com/user-attachments/assets/01f17af8-3adb-4a22-9dad-86948064353c

## TODO

- [ ] We've partially implemented streaming responses, but it's not working as expected, more needs to be done to get it working with CloudFlare I think, finding it difficult to get the streaming to work.
- [ ] Add the ability to send properties in the metadata.
- [ ] Add a text generation mode where you can insert the response into the current note.
- [ ] Add an image generation mode where you can insert the response into the current note.
- [ ] Add a speech to text mode.
- [ ] Look at adding other providers like Anthropic, OpenAI, etc.

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

### Setting up Vectorize indexes

In order for the filters to work, you will need to create a number of indexes in Vectorize.

These include:

┌───────────────┬────────┐
│ propertyName  │ type   │
├───────────────┼────────┤
│ type          │ String │
├───────────────┼────────┤
│ createdMonth  │ Number │
├───────────────┼────────┤
│ createdYear   │ Number │
├───────────────┼────────┤
│ modifiedMonth │ Number │
├───────────────┼────────┤
│ modifiedYear  │ Number │
├───────────────┼────────┤
│ extension     │ String │
└───────────────┴────────┘

You can use Wrangler to do this, for example:

```bash
npx wrangler vectorize create-metadata-index obsidian-embeddings-baai --type=string --property-name=extension
```

Please not that you can only have a maximum of 10 indexes.

## Thanks

Props to the [Obsidian Svelte Plugin](https://github.com/emilio-toledo/obsidian-svelte-plugin) for the base structure!
