import { App, TFile } from "obsidian";
import { CloudflareVectorize } from "../lib/cloudflare-vectorize";
import { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import type { SyncResult } from "../types";

export class SyncService {
    private readonly batchSize = 5;
    private readonly logger: Console;

    constructor(
        private readonly app: App,
        private readonly vectorize: CloudflareVectorize,
        private readonly gateway: CloudflareAIGateway,
        private readonly textEmbeddingsModelId: string,
        private readonly ignoredFolders: string[] = [],
    ) {
        this.logger = console;
    }

    private isFileInIgnoredFolder(file: TFile): boolean {
        return this.ignoredFolders.some(folder => {
            const normalizedFolder = folder.toLowerCase().replace(/\\/g, '/');
            const normalizedFile = file.path.toLowerCase().replace(/\\/g, '/');
            return normalizedFile.startsWith(normalizedFolder + '/')
        });
    }

    async sync(): Promise<SyncResult> {
        const result: SyncResult = {
            successful: 0,
            failed: 0,
            errors: []
        };

        this.validateServices();

        const files = this.app.vault.getMarkdownFiles();
        const filteredFiles = files.filter(file => !this.isFileInIgnoredFolder(file));
        
        const filesToSync = [];
        for (const file of filteredFiles) {
            const syncState = await this.getSyncState(file);
            if (!syncState || syncState.lastModified !== file.stat.mtime) {
                filesToSync.push(file);
            } else {
                result.successful++;
            }
        }
        
        this.logger.info(`Starting sync for ${filesToSync.length} files (${filteredFiles.length - filesToSync.length} already up to date)`);

        for (let i = 0; i < filesToSync.length; i += this.batchSize) {
            const batch = filesToSync.slice(i, i + this.batchSize);
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

            const content = await this.app.vault.cachedRead(file);
            if (!content.trim()) {
                this.logger.warn(`Skipping empty file: ${file.path}`);
                return;
            }

            const syncState = await this.getSyncState(file);
            if (syncState && syncState.lastModified === file.stat.mtime) {
                this.logger.debug(`File ${file.path} hasn't changed, skipping`);
                result.successful++;
                return;
            }

            const vectors = await this.generateEmbeddings(content);
            if (!vectors) {
                this.logger.warn(`Skipping file ${file.path} due to no vectors`);
                return;
            }
            await this.upsertVectors(file, vectors);
            await this.saveSyncState(file, vectors);

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
        const metadata: Record<string, any> = {
            fileName: file.name,
            extension: file.extension
        };

        if (file.stat.ctime) {
            const createdDate = new Date(file.stat.ctime);
            metadata.created = file.stat.ctime;
            metadata.createdYear = createdDate.getFullYear();
            metadata.createdMonth = createdDate.getMonth() + 1;
        }

        if (file.stat.mtime) {
            const modifiedDate = new Date(file.stat.mtime);
            metadata.modified = file.stat.mtime;
            metadata.modifiedYear = modifiedDate.getFullYear();
            metadata.modifiedMonth = modifiedDate.getMonth() + 1;
        }

        const upsertResult = await this.vectorize.upsertVectors([{
            id: file.path,
            values: vectors,
            metadata,
            namespace: this.app.vault.getName()
        }]);

        if (!upsertResult) {
            throw new Error("Failed to upsert vectors");
        }
    }

    private async ensureSyncDirectory(): Promise<void> {
        const syncDir = '.cloudflare-ai/sync';
        if (!await this.app.vault.adapter.exists(syncDir)) {
            await this.app.vault.adapter.mkdir(syncDir);
        }
    }

    private async saveSyncState(file: TFile, vectors: number[][]): Promise<void> {
        const syncState = {
            path: file.path,
            lastSync: Date.now(),
            lastModified: file.stat.mtime,
            vectors: vectors
        };

        const syncPath = `.cloudflare-ai/sync/${file.path.replace(/\//g, '_')}.json`;
        await this.app.vault.adapter.write(
            syncPath,
            JSON.stringify(syncState, null, 2)
        );
    }

    private async getSyncState(file: TFile): Promise<{
        lastSync: number;
        lastModified: number;
        vectors: number[][];
    } | null> {
        await this.ensureSyncDirectory();
        
        const syncPath = `.cloudflare-ai/sync/${file.path.replace(/\//g, '_')}.json`;
        
        try {
            if (await this.app.vault.adapter.exists(syncPath)) {
                const content = await this.app.vault.adapter.read(syncPath);
                return JSON.parse(content);
            }
        } catch (error) {
            this.logger.warn(`Failed to read sync state for ${file.path}:`, error);
        }
        
        return null;
    }
}