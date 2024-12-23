import type { CloudflareAIPluginSettings, Template } from "./types";

export const PLUGIN_PREFIX = "cloudflare-ai";
export const PLUGIN_NAME = "Cloudflare AI";

export enum ModelIds {
	LLAMA_70B_FAST = "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
	LLAMA_1B = "@cf/meta/llama-3.2-1b-instruct",
	LLAMA_3B = "@cf/meta/llama-3.2-3b-instruct",
	LLAMA_8B = "@cf/meta/llama-3.1-8b-instruct",
	LLAMA_8B_FP8 = "@cf/meta/llama-3.1-8b-instruct-fp8",
	LLAMA_8B_FAST = "@cf/meta/llama-3.1-8b-instruct-fast",
	LLAMA_8B_AWQ = "@cf/meta/llama-3.1-8b-instruct-awq",
	LLAMA_70B = "@cf/meta/llama-3.1-70b-instruct",
}

export enum EmbeddingModelIds {
	BGE_SMALL = "@cf/baai/bge-small-en-v1.5",
	BGE_BASE = "@cf/baai/bge-base-en-v1.5",
	BGE_LARGE = "@cf/baai/bge-large-en-v1.5",
}

export const DEFAULT_SETTINGS: CloudflareAIPluginSettings = {
	cloudflareAccountId: "",
	cloudflareAiGatewayId: "",
	cloudflareAiApiKey: "",
	cloudflareVectorizeApiKey: "",
	modelId: ModelIds.LLAMA_70B_FAST,
	maxTokens: 256,
	temperature: 0.6,
	textEmbeddingsModelId: EmbeddingModelIds.BGE_BASE,
	vectorizeIndexName: "obsidian-notes",
	topK: 3,
	minSimilarityScore: 0.7,
	ignoredFolders: [],
	syncEnabled: false,
	autoSyncInterval: 30,
	cloudflareAiApiKeySaved: false,
	cloudflareVectorizeApiKeySaved: false,
	logLevel: "error",
};

export const DEFAULT_TEMPLATES: Record<string, Template> = {
	continue: {
		name: "continue",
		description: "Continue writing from the current text",
		prompt:
			"Continue this text naturally, maintaining the same style and tone. Only return the continuation, no explanations or other text:\n\n{{text}}",
	},
	summarise: {
		name: "summarise",
		description: "Summarise the selected text",
		prompt:
			"Provide a concise summary of this text. Return only the summary, no explanations or other text:\n\n{{text}}",
	},
	expand: {
		name: "expand",
		description: "Expand on the selected text",
		prompt:
			"Expand this text with more details and examples. Return only the expanded text, no explanations or other text:\n\n{{text}}",
	},
	rewrite: {
		name: "rewrite",
		description: "Rewrite the selected text",
		prompt:
			"Rewrite this text to improve clarity and flow. Return only the rewritten text, no explanations or other text:\n\n{{text}}",
	},
	'generate-title': {
		name: 'generate-title',
		description: 'Generate a title from the content',
		prompt: 'Generate a clear, concise title for this text. Return only the title, no quotes or extra text:\n\n{{text}}'
	},
};
