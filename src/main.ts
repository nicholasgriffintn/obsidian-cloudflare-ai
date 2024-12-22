import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import "virtual:uno.css";

import { ChatModal } from "./modals/chat";
import { CloudflareAIGateway } from "./lib/cloudflare-ai-gateway";
import { SyncService } from "./services/sync";
import { CloudflareVectorize } from "./lib/cloudflare-vectorize";
import type { CloudflareAIPluginSettings } from "./types";
import { Logger } from "./lib/logger";

const DEFAULT_SETTINGS: CloudflareAIPluginSettings = {
	cloudflareAccountId: "",
	cloudflareAiGatewayId: "",
	cloudflareAiApiKey: "",
	cloudflareVectorizeApiKey: "",
	modelId: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
	maxTokens: 256,
	temperature: 0.6,
	textEmbeddingsModelId: "@cf/baai/bge-base-en-v1.5",
	vectorizeIndexName: "obsidian-notes",
	topK: 3,
	minSimilarityScore: 0.7,
	ignoredFolders: [],
	syncEnabled: false,
	autoSyncInterval: 30,
};

export default class CloudflareAIPlugin extends Plugin {
	settings!: CloudflareAIPluginSettings;
	gateway!: CloudflareAIGateway;
	vectorize!: CloudflareVectorize;
	syncService!: SyncService;
	syncStatusBar!: HTMLElement;
	private readonly logger: Logger = new Logger();
	
	async loadGateway() {
		this.gateway = new CloudflareAIGateway(
			this.settings.cloudflareAccountId,
			this.settings.cloudflareAiGatewayId,
			this.settings.cloudflareAiApiKey,
			this.settings.modelId,
			this.settings.maxTokens,
			this.settings.temperature,
		);
	}

	async loadVectorize() {
		this.vectorize = new CloudflareVectorize(
			this.settings.cloudflareAccountId,
			this.settings.cloudflareVectorizeApiKey,
			this.settings.vectorizeIndexName,
		);
	}

	async loadSyncService() {
		this.syncService = new SyncService(
			this.app,
			this.vectorize,
			this.gateway,
			this.settings.textEmbeddingsModelId,
			this.settings.ignoredFolders,
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		await this.loadGateway();
		await this.loadVectorize();
		await this.loadSyncService();
		this.logger.debug("Settings loaded");
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.loadGateway();
		await this.loadVectorize();
		await this.loadSyncService();
		this.logger.debug("Settings saved");
	}

	async onload() {
		this.logger.debug("CloudflareAIPlugin loaded");

		await this.loadSettings();

		this.addCommand({
			id: "start-chat",
			name: "Start Chat",
			callback: () => {
				const chatModal = new ChatModal(
					this.app,
					this.gateway,
					this.vectorize,
					this.settings
				);
				chatModal.open();
			},
		});

		this.syncStatusBar = this.addStatusBarItem();
		this.syncStatusBar.setText('Sync: Ready');

		this.addCommand({
			id: "sync-notes",
			name: "Sync Notes",
			callback: async () => {
				await this.syncNotes();
			}
		});

		if (this.settings.syncEnabled) {
			this.registerInterval(
				window.setInterval(
					() => this.syncNotes(),
					this.settings.autoSyncInterval * 60 * 1000
				)
			);
		}

		this.addSettingTab(new CloudflareAIPluginSettingTab(this.app, this));
	}

	onunload() {
		this.logger.debug("CloudflareAIPlugin unloaded");
	}

	async syncNotes() {
		try {
			this.logger.debug("Syncing notes");

			this.syncStatusBar.setText('Sync: In Progress...');

			if (!this.syncService) {
				throw new Error("Sync service not initialized");
			}

			await this.syncService.sync();

			this.settings.lastSyncTime = Date.now();
			await this.saveSettings();

			this.syncStatusBar.setText(`Sync: Complete (${new Date().toLocaleTimeString()})`);

			this.logger.debug("Sync complete");
		} catch (error: unknown) {
			this.logger.error("Sync failed", error);
			this.syncStatusBar.setText('Sync: Failed');
			new Notice('Sync failed: ' + (error instanceof Error ? error.message : String(error)));
		}
	}
}

class CloudflareAIPluginSettingTab extends PluginSettingTab {
	plugin: CloudflareAIPlugin;

	constructor(app: App, plugin: CloudflareAIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		new Setting(containerEl)
			.setName("Cloudflare account ID")
			.setDesc("The ID of your Cloudflare account")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Cloudflare Account ID")
					.setValue(this.plugin.settings.cloudflareAccountId)
					.onChange(async (value) => {
						this.plugin.settings.cloudflareAccountId = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Cloudflare AI Gateway ID")
			.setDesc("The ID of your Cloudflare AI Gateway")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Cloudflare AI Gateway ID")
					.setValue(this.plugin.settings.cloudflareAiGatewayId)
					.onChange(async (value) => {
						this.plugin.settings.cloudflareAiGatewayId = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Cloudflare AI API key")
			.setDesc("The API key for your Cloudflare AI Gateway")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Cloudflare AI API Key")
					.setValue(this.plugin.settings.cloudflareAiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.cloudflareAiApiKey = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Cloudflare Vectorize API key")
			.setDesc("The API key for your Cloudflare Vectorize API")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Cloudflare Vectorize API Key")
					.setValue(this.plugin.settings.cloudflareVectorizeApiKey)
					.onChange(async (value) => {
						this.plugin.settings.cloudflareVectorizeApiKey = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).setName("Text model").setHeading();

		new Setting(containerEl)
			.setName("Model ID")
			.setDesc("The ID of the text model to use")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						"@cf/meta/llama-3.3-70b-instruct-fp8-fast":
							"Meta Llama 3.3 70B Instruct FP8 Fast",
						"@cf/meta/llama-3.2-1b-instruct": "Meta Llama 3.2 1B Instruct",
						"@cf/meta/llama-3.2-3b-instruct": "Meta Llama 3.2 3B Instruct",
						"@cf/meta/llama-3.1-8b-instruct": "Meta Llama 3.1 8B Instruct",
						"@cf/meta/llama-3.1-8b-instruct-fp8":
							"Meta Llama 3.1 8B Instruct FP8",
						"@cf/meta/llama-3.1-8b-instruct-fast":
							"Meta Llama 3.1 8B Instruct Fast",
						"@cf/meta/llama-3.1-8b-instruct-awq":
							"Meta Llama 3.1 8B Instruct AWQ",
						"@cf/meta/llama-3.1-70b-instruct": "Meta Llama 3.1 70B Instruct",
					})
					.setValue(this.plugin.settings.modelId)
					.onChange(async (value) => {
						this.plugin.settings.modelId = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Max tokens")
			.setDesc("The maximum number of tokens to generate")
			.addText((text) =>
				text
					.setPlaceholder("Enter the maximum number of tokens to generate")
					.setValue(this.plugin.settings.maxTokens.toString())
					.onChange(async (value) => {
						const int_value = parseInt(value);
						if (!int_value || int_value <= 0) {
							new Notice("Error while parsing maxTokens");
						} else {
							this.plugin.settings.maxTokens = int_value;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName("Temperature")
			.setDesc("The temperature of the text model")
			.addText((text) =>
				text
					.setPlaceholder("Enter the temperature of the text model")
					.setValue(this.plugin.settings.temperature.toString())
					.onChange(async (value) => {
						const float_value = parseFloat(value);
						if (!float_value || float_value < 0 || float_value > 5) {
							new Notice("Error while parsing temperature");
						} else {
							this.plugin.settings.temperature = float_value;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl).setName("Cloudflare Vectorize").setHeading();

		new Setting(containerEl)
			.setName("Vectorize index name")
			.setDesc("The name of the index")
			.addText((text) =>
				text
					.setPlaceholder("Enter the name of the index to use")
					.setValue(this.plugin.settings.vectorizeIndexName)
					.onChange(async (value) => {
						this.plugin.settings.vectorizeIndexName = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Text embeddings model ID")
			.setDesc("The ID of the text embeddings model to use")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						"@cf/baai/bge-small-en-v1.5": "BAAI BGE Small English v1.5 (384)",
						"@cf/baai/bge-base-en-v1.5": "BAAI BGE Base English v1.5 (768)",
						"@cf/baai/bge-large-en-v1.5": "BAAI BGE Large English v1.5 (1024)",
					})
					.setValue(this.plugin.settings.textEmbeddingsModelId)
					.onChange(async (value) => {
						this.plugin.settings.textEmbeddingsModelId = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Top k")
			.setDesc("The number of results to return")
			.addText((text) =>
				text
					.setPlaceholder("Enter the number of results to return")
					.setValue(this.plugin.settings.topK.toString())
					.onChange(async (value) => {
						const int_value = parseInt(value);
						if (!int_value || int_value <= 0) {
							new Notice("Error while parsing topK");
						} else {
							this.plugin.settings.topK = int_value;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName("Min similarity score")
			.setDesc("The minimum similarity score to return")
			.addText((text) =>
				text
					.setPlaceholder("Enter the minimum similarity score")
					.setValue(this.plugin.settings.minSimilarityScore.toString())
					.onChange(async (value) => {
						const float_value = parseFloat(value);
						if (!float_value || float_value < 0 || float_value > 1) {
							new Notice("Error while parsing minSimilarityScore");
						} else {
							this.plugin.settings.minSimilarityScore = float_value;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl).setName("Sync").setHeading();

		new Setting(containerEl)
			.setName("Ignored folders")
			.setDesc("Folders to ignore when syncing notes, separated by commas")
			.addText((text) =>
				text
					.setPlaceholder("Enter the folders to ignore")
					.setValue(this.plugin.settings.ignoredFolders.join(","))
					.onChange(async (value) => {
						this.plugin.settings.ignoredFolders = value.split(",");
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Enable auto sync")
			.setDesc("Automatically sync notes at regular intervals")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.syncEnabled)
				.onChange(async (value) => {
					this.plugin.settings.syncEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Sync interval")
			.setDesc("How often to sync (in minutes)")
			.addText(text => text
				.setPlaceholder("30")
				.setValue(this.plugin.settings.autoSyncInterval.toString())
				.onChange(async (value) => {
					const interval = parseInt(value);
					if (interval > 0) {
						this.plugin.settings.autoSyncInterval = interval;
						await this.plugin.saveSettings();
					}
				}));
	}
}
