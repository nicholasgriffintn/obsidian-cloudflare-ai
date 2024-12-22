export interface CloudflareAIPluginSettings {
	cloudflareAccountId: string;
	cloudflareAiGatewayId: string;
	cloudflareAiApiKey: string;
	cloudflareVectorizeApiKey: string;
	cloudflareAiApiKeySaved: boolean;
	cloudflareVectorizeApiKeySaved: boolean;
	modelId: string;
	maxTokens: number;
	temperature: number;
	textEmbeddingsModelId: string;
	vectorizeIndexName: string;
	topK: number;
	minSimilarityScore: number;
	ignoredFolders: string[];
	syncEnabled: boolean;
	autoSyncInterval: number;
	lastSyncTime?: number;
}

export interface BaseResponse {
	success: boolean;
	errors?: Array<{
		message: string;
		code?: number;
	}>;
}

export interface CloudflareResponse<T = unknown> extends BaseResponse {
	result?: T;
}

export interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface Vector {
	id: string;
	values: number[] | number[][];
	metadata?: Record<string, any>;
	namespace?: string;
}

export interface VectorMatch {
	id: string;
	score: number;
	metadata?: Record<string, any>;
}

export interface VectorSearchResult {
	matches: VectorMatch[];
}

export type FilterOperator =
	| "$eq"
	| "$ne"
	| "$in"
	| "$nin"
	| "$lt"
	| "$lte"
	| "$gt"
	| "$gte";

export type FilterValue =
	| string
	| number
	| boolean
	| null
	| (string | number | boolean | null)[];

export type FilterCondition = {
	[key in FilterOperator]?: FilterValue;
};

export type VectorizeFilter = {
	[key in VectorizeMetadataField]?: FilterValue | FilterCondition;
};

export type VectorizeMetadataField =
	| "type"
	| "createdMonth"
	| "createdYear"
	| "modifiedMonth"
	| "modifiedYear"
	| "extension";

export interface VectorQuery {
	vector: number[];
	topK?: number;
	returnValues?: boolean;
	returnMetadata?: "all" | "none" | "indexed";
	namespace?: string;
	filter?: VectorizeFilter;
}

export interface VectorizeResponse
	extends CloudflareResponse<{ uploaded: number }> {}

export interface EmbeddingResponse extends BaseResponse {
	data: number[][];
}

export interface SyncResult {
	successful: number;
	failed: number;
	errors: Array<{ file: string; error: string }>;
}

export interface RequestOptions {
	modelId: string;
	messages?: Message[];
	prompt?: string;
	shouldStream: boolean;
	type: "text" | "embedding";
}

export interface TextResponse {
	response: string;
}
