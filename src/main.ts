import { Notice, Plugin } from "obsidian";
import "virtual:uno.css";
import { CloudflareAISettingsTab } from "./settings";

import { ChatModal } from "./modals/chat";
import { CloudflareAIGateway } from "./lib/cloudflare-ai-gateway";
import { SyncService } from "./services/sync";
import { CloudflareVectorize } from "./lib/cloudflare-vectorize";
import type { CloudflareAIPluginSettings } from "./types";
import { Logger } from "./lib/logger";
import { DEFAULT_SETTINGS } from "./constants";
import { safeStorage } from "./lib/safeStorage";

export default class CloudflareAIPlugin extends Plugin {
    public settings!: CloudflareAIPluginSettings;
    private gateway!: CloudflareAIGateway;
    private vectorize!: CloudflareVectorize;
    private syncService!: SyncService;
    private syncStatusBar!: HTMLElement;
    private syncInterval?: number;
    private readonly logger: Logger = new Logger();

    private getDecryptedApiKey(encryptedKey: string): string {
        if (!encryptedKey) return '';
        
        try {
            if (safeStorage.isEncryptionAvailable()) {
                return safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'));
            }
        } catch (error) {
            this.logger.error("Failed to decrypt API key:", error);
        }
        return encryptedKey;
    }

    private async initializeServices(): Promise<void> {
        const decryptedAiApiKey = this.getDecryptedApiKey(this.settings.cloudflareAiApiKey);
        const decryptedVectorizeApiKey = this.getDecryptedApiKey(this.settings.cloudflareVectorizeApiKey);
        
        this.gateway = new CloudflareAIGateway(
            this.settings.cloudflareAccountId,
            this.settings.cloudflareAiGatewayId,
            decryptedAiApiKey,
            this.settings.modelId,
            this.settings.maxTokens,
            this.settings.temperature,
        );

        this.vectorize = new CloudflareVectorize(
            this.settings.cloudflareAccountId,
            decryptedVectorizeApiKey,
            this.settings.vectorizeIndexName,
        );

        this.syncService = new SyncService(
            this.app,
            this.vectorize,
            this.gateway,
            this.settings.textEmbeddingsModelId,
            this.settings.ignoredFolders,
        );
    }

    private setupSyncInterval(): void {
        if (this.syncInterval) {
            window.clearInterval(this.syncInterval);
        }

        if (this.settings.syncEnabled) {
            this.syncInterval = window.setInterval(
                () => this.syncNotes(),
                this.settings.autoSyncInterval * 60 * 1000,
            );
            this.registerInterval(this.syncInterval);
        }
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        await this.initializeServices();
        this.logger.debug("Settings loaded");
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        await this.initializeServices();
        this.setupSyncInterval();
        this.logger.debug("Settings saved");
    }

    async onload(): Promise<void> {
        this.logger.debug("CloudflareAIPlugin loaded");

        await this.loadSettings();

        this.addCommand({
            id: "start-chat",
            name: "Start Chat",
            callback: () => {
                new ChatModal(
                    this.app,
                    this.gateway,
                    this.vectorize,
                    this.settings,
                    this.syncService,
                ).open();
            },
        });

        this.syncStatusBar = this.addStatusBarItem();
        this.updateSyncStatus("Ready");

        this.addCommand({
            id: "sync-notes",
            name: "Sync Notes",
            callback: () => this.syncNotes(),
        });

        this.setupSyncInterval();
        this.addSettingTab(new CloudflareAISettingsTab(this.app, this));
    }

    onunload(): void {
        if (this.syncInterval) {
            window.clearInterval(this.syncInterval);
        }
        this.logger.debug("CloudflareAIPlugin unloaded");
    }

    private updateSyncStatus(status: string): void {
        this.syncStatusBar.setText(`AI Sync: ${status}`);
    }

    async syncNotes(): Promise<void> {
        try {
            this.logger.debug("Syncing notes");
            this.updateSyncStatus("In Progress...");

            if (!this.syncService) {
                throw new Error("Sync service not initialized");
            }

            await this.syncService.sync();

            this.settings.lastSyncTime = Date.now();
            await this.saveSettings();

            const timestamp = new Date().toLocaleTimeString();
            this.updateSyncStatus(`Complete (${timestamp})`);
            this.logger.debug("Sync complete");
        } catch (error: unknown) {
            this.logger.error("Sync failed", error);
            this.updateSyncStatus("Failed");
            new Notice(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}