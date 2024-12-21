import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import "virtual:uno.css";

import { ChatModel } from "./models/chat";
import { CloudflareAIGateway } from "./lib/cloudflare-ai-gateway";
import { SyncService } from "./services/sync";
import { CloudflareVectorize } from "./lib/cloudflare-vectorize";

interface CloudflareAIPluginSettings {
	cloudflareAccountId: string;
	cloudflareAiGatewayId: string;
	cloudflareAiApiKey: string;
	cloudflareVectorizeApiKey: string;
	modelId: string;
	maxTokens: number;
	temperature: number;
	textEmbeddingsModelId: string;
	vectorizeIndexName: string;
	syncEnabled: boolean;
	autoSyncInterval: number;
	lastSyncTime?: number;
}

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
	syncEnabled: false,
	autoSyncInterval: 30,
};

export default class CloudflareAIPlugin extends Plugin {
	settings!: CloudflareAIPluginSettings;
	gateway!: CloudflareAIGateway;
	vectorize!: CloudflareVectorize;
	syncService!: SyncService;
	syncStatusBar!: HTMLElement;

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
			this.settings.textEmbeddingsModelId
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		await this.loadGateway();
		await this.loadVectorize();
		await this.loadSyncService();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.loadGateway();
		await this.loadVectorize();
		await this.loadSyncService();
	}

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "start-chat",
			name: "Start Chat",
			callback: () => {
				const chatModel = new ChatModel(
					this.app,
					this.gateway,
					this.vectorize,
					this.settings.textEmbeddingsModelId
				);
				chatModel.open();
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

	onunload() { }

	async syncNotes() {
		try {
			this.syncStatusBar.setText('Sync: In Progress...');

			if (!this.syncService) {
				throw new Error("Sync service not initialized");
			}

			await this.syncService.sync();

			this.settings.lastSyncTime = Date.now();
			await this.saveSettings();

			this.syncStatusBar.setText(`Sync: Complete (${new Date().toLocaleTimeString()})`);
		} catch (error: unknown) {
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

		containerEl.empty();
		containerEl.createEl("h2", { text: "Cloudflare AI Plugin" });

		containerEl.createEl("h3", { text: "Cloudflare Account Settings" });
		containerEl.createEl("p", { text: "These settings are required to interact with the Cloudflare AI services." });

		new Setting(containerEl)
			.setName("Cloudflare Account ID")
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
			.setName("Cloudflare AI API Key")
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
			.setName("Cloudflare Vectorize API Key")
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

		containerEl.createEl("h3", { text: "Text Model Settings" });
		containerEl.createEl("p", { text: "These settings are used for the parameters when talking to the AI." });

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
			.setName("Max Tokens")
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

		containerEl.createEl("h3", { text: "Cloudflare Vectorize Settings" });
		containerEl.createEl("p", { text: "These settings are used to interact with the Cloudflare Vectorize service." });

		new Setting(containerEl)
			.setName("Vectorize Index Name")
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
			.setName("Text Embeddings Model ID")
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

		containerEl.createEl("h3", { text: "Auto Sync Settings" });
		containerEl.createEl("p", { text: "Sync notes to Cloudflare Vectorize for RAG at regular intervals." });

		new Setting(containerEl)
			.setName("Enable Auto Sync")
			.setDesc("Automatically sync notes at regular intervals")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.syncEnabled)
				.onChange(async (value) => {
					this.plugin.settings.syncEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Sync Interval")
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
