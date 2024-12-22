export interface CloudflareAIPluginSettings {
	cloudflareAccountId: string;
	cloudflareAiGatewayId: string;
	cloudflareAiApiKey: string;
	cloudflareVectorizeApiKey: string;
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
    role: 'system' | 'user' | 'assistant';
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

export interface VectorQuery {
    vector: number[];
    topK?: number;
    returnValues?: boolean;
    returnMetadata?: "all" | "none" | "indexed";
    namespace?: string;
    filter?: Record<string, any>;
}

export interface VectorizeResponse extends CloudflareResponse<{ uploaded: number }> {}

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
    type: 'text' | 'embedding';
}

export interface TextResponse {
    response: string;
}