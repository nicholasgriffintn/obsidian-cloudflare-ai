import { App, TFile } from "obsidian";
import { CloudflareVectorize } from "../lib/cloudflare-vectorize";
import { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";

export class SyncService {
    constructor(
        private app: App,
        private vectorize: CloudflareVectorize,
        private gateway: CloudflareAIGateway,
        private textEmbeddingsModelId: string
    ) {}

    async sync() {
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            await this.syncFile(file);
        }
    }

    private async syncFile(file: TFile) {
        if (!this.vectorize) {
            throw new Error("Vectorize service not initialized");
        }

        if (!this.gateway) {
            throw new Error("AI Gateway service not initialized");
        }

        const content = await this.app.vault.read(file);

        const vectors = await this.gateway.makeRequest({
            modelId: this.textEmbeddingsModelId,
            prompt: content,
            shouldStream: false,
            type: "embedding"
        });

		if (!vectors.success) {
			throw new Error(`The request failed with the following error: ${vectors.errors?.map((error: any) => error.message).join(", ")}`);
		}

        if (vectors.data.length === 0) {
            throw new Error("No vectors returned from AI Gateway");
        }

        const upserted = await this.vectorize.upsertVectors([{
            id: file.path,
            values: vectors.data,
            metadata: {
                modified: file.stat.mtime
            }
        }]);

        console.log(`Synced ${file.path}:`);
        console.log({
            content: content,
            modified: file.stat.mtime,
            vectors: vectors.data,
            upserted: upserted
        });
    }
}
