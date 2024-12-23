import type { CloudflareAIPluginSettings } from "./types";

export const PLUGIN_PREFIX = "cloudflare-ai";

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
};
