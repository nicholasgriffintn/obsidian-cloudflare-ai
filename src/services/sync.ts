import { App, TFile } from "obsidian";
import { CloudflareVectorize } from "../lib/cloudflare-vectorize";
import { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import type { SyncResult, EmbeddingResponse } from "../types";

export class SyncService {
    private readonly batchSize = 5;
    private readonly logger: Console;

    constructor(
        private readonly app: App,
        private readonly vectorize: CloudflareVectorize,
        private readonly gateway: CloudflareAIGateway,
        private readonly textEmbeddingsModelId: string,
    ) {
        this.logger = console;
    }

    async sync(): Promise<SyncResult> {
        const result: SyncResult = {
            successful: 0,
            failed: 0,
            errors: []
        };

        this.validateServices();

        const files = this.app.vault.getMarkdownFiles();
        this.logger.info(`Starting sync for ${files.length} files`);

        for (let i = 0; i < files.length; i += this.batchSize) {
            const batch = files.slice(i, i + this.batchSize);
            await Promise.allSettled(
                batch.map(file => this.syncFile(file, result))
            );
        }

        this.logger.info('Sync completed', result);
        return result;
    }

    private validateServices(): void {
        if (!this.vectorize) {
            throw new Error("Vectorize service not initialized");
        }
        if (!this.gateway) {
            throw new Error("AI Gateway service not initialized");
        }
    }

    private async syncFile(file: TFile, result: SyncResult): Promise<void> {
        try {
            this.logger.debug(`Processing file: ${file.path}`);
            
            const content = await this.app.vault.read(file);
            if (!content.trim()) {
                this.logger.warn(`Skipping empty file: ${file.path}`);
                return;
            }

            const vectors = await this.generateEmbeddings(content);
            if (!vectors) {
                this.logger.warn(`Skipping file ${file.path} due to no vectors`);
                return;
            }
            await this.upsertVectors(file, vectors);

            result.successful++;
            this.logger.debug(`Successfully processed: ${file.path}`);

        } catch (error) {
            result.failed++;
            result.errors.push({
                file: file.path,
                error: error instanceof Error ? error.message : String(error)
            });
            this.logger.error(`Failed to process ${file.path}:`, error);
        }
    }

    private async generateEmbeddings(content: string): Promise<number[][] | null> {
        const vectors = await this.gateway.makeRequest<{
            data: number[][]
        }>({
            modelId: this.textEmbeddingsModelId,
            prompt: content,
            shouldStream: false,
            type: "embedding"
        });

        if (!vectors?.data?.length) {
            throw new Error("No vectors returned from AI Gateway");
        }

        return vectors.data;
    }

    private async upsertVectors(file: TFile, vectors: number[][]): Promise<void> {
        const upsertResult = await this.vectorize.upsertVectors([{
            id: file.path,
            values: vectors,
            metadata: {
                modified: file.stat.mtime,
                fileName: file.name
            }
        }]);

        if (!upsertResult) {
            throw new Error("Failed to upsert vectors");
        }
    }
}