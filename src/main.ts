import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import "virtual:uno.css";
import Electron from "electron";

import { ChatModal } from "./modals/chat";
import { CloudflareAIGateway } from "./lib/cloudflare-ai-gateway";
import { SyncService } from "./services/sync";
import { CloudflareVectorize } from "./lib/cloudflare-vectorize";
import type { CloudflareAIPluginSettings } from "./types";
import { Logger } from "./lib/logger";
import { obfuscate } from "./lib/obfuscate";

const {
	remote: { safeStorage },
} = Electron;

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
	cloudflareAiApiKeySaved: false,
	cloudflareVectorizeApiKeySaved: false,
};

export default class CloudflareAIPlugin extends Plugin {
	settings!: CloudflareAIPluginSettings;
	gateway!: CloudflareAIGateway;
	vectorize!: CloudflareVectorize;
	syncService!: SyncService;
	syncStatusBar!: HTMLElement;
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

	async loadGateway() {
		const decryptedAiApiKey = this.getDecryptedApiKey(this.settings.cloudflareAiApiKey);
		
		this.gateway = new CloudflareAIGateway(
			this.settings.cloudflareAccountId,
			this.settings.cloudflareAiGatewayId,
			decryptedAiApiKey,
			this.settings.modelId,
			this.settings.maxTokens,
			this.settings.temperature,
		);
	}

	async loadVectorize() {
		const decryptedVectorizeApiKey = this.getDecryptedApiKey(this.settings.cloudflareVectorizeApiKey);
		
		this.vectorize = new CloudflareVectorize(
			this.settings.cloudflareAccountId,
			decryptedVectorizeApiKey,
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
					this.settings,
					this.syncService,
				);
				chatModal.open();
			},
		});

		this.syncStatusBar = this.addStatusBarItem();
		this.syncStatusBar.setText("Sync: Ready");

		this.addCommand({
			id: "sync-notes",
			name: "Sync Notes",
			callback: async () => {
				await this.syncNotes();
			},
		});

		if (this.settings.syncEnabled) {
			this.registerInterval(
				window.setInterval(
					() => this.syncNotes(),
					this.settings.autoSyncInterval * 60 * 1000,
				),
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

			this.syncStatusBar.setText("Sync: In Progress...");

			if (!this.syncService) {
				throw new Error("Sync service not initialized");
			}

			await this.syncService.sync();

			this.settings.lastSyncTime = Date.now();
			await this.saveSettings();

			this.syncStatusBar.setText(
				`Sync: Complete (${new Date().toLocaleTimeString()})`,
			);

			this.logger.debug("Sync complete");
		} catch (error: unknown) {
			this.logger.error("Sync failed", error);
			this.syncStatusBar.setText("Sync: Failed");
			new Notice(
				"Sync failed: " +
					(error instanceof Error ? error.message : String(error)),
			);
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
		let temporaryCloudflareAiApiKey = '';
		let temporaryVectorizeApiKey = '';

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

		if (!this.plugin.settings.cloudflareAiApiKeySaved) {
			const aiApiKeySetting = new Setting(containerEl)
				.setName("Cloudflare AI API key")
				.setDesc("The API key for your Cloudflare AI Gateway")
				.addText((text) =>
					text
						.setPlaceholder("Enter your Cloudflare AI API Key")
						.onChange(async (value) => {
							temporaryCloudflareAiApiKey = value;
						})
				);

			aiApiKeySetting.addButton((button) => {
				button
					.setButtonText("Save API Key")
					.onClick(async () => {
						if (temporaryCloudflareAiApiKey) {
							try {
								if (safeStorage.isEncryptionAvailable()) {
									const encrypted = safeStorage.encryptString(temporaryCloudflareAiApiKey);
									this.plugin.settings.cloudflareAiApiKey = Buffer.from(encrypted).toString('base64');
								} else {
									this.plugin.settings.cloudflareAiApiKey = temporaryCloudflareAiApiKey;
								}
								this.plugin.settings.cloudflareAiApiKeySaved = true;
								temporaryCloudflareAiApiKey = '';
								await this.plugin.saveSettings();
								new Notice('Cloudflare AI API key saved successfully');
								this.display();
							} catch (error) {
								new Notice('Failed to save API key');
								console.error(error);
							}
						} else {
							new Notice('Please enter an API key');
						}
					});
			});
		} else {
			const aiApiKeySetting = new Setting(containerEl)
				.setName("Cloudflare AI API key")
				.setDesc("The API key for your Cloudflare AI Gateway")
				.addText((text) => {
					try {
						let apiKey = this.plugin.settings.cloudflareAiApiKey;
						if (safeStorage.isEncryptionAvailable() && apiKey) {
							const decrypted = safeStorage.decryptString(Buffer.from(apiKey, 'base64'));
							text.setPlaceholder(obfuscate(decrypted));
						} else {
							text.setPlaceholder(obfuscate(apiKey));
						}
					} catch (error) {
						text.setPlaceholder('********');
					}
					text.setDisabled(true);
				});

			aiApiKeySetting.addButton((button) => {
				button
					.setButtonText("Remove API Key")
					.onClick(async () => {
						this.plugin.settings.cloudflareAiApiKey = '';
						this.plugin.settings.cloudflareAiApiKeySaved = false;
						await this.plugin.saveSettings();
						new Notice('Cloudflare AI API key removed');
						this.display();
					});
			});
		}

		if (!this.plugin.settings.cloudflareVectorizeApiKeySaved) {
			const vectorizeApiKeySetting = new Setting(containerEl)
				.setName("Cloudflare Vectorize API key")
				.setDesc("The API key for your Cloudflare Vectorize API")
				.addText((text) =>
					text
						.setPlaceholder("Enter your Cloudflare Vectorize API Key")
						.onChange(async (value) => {
							temporaryVectorizeApiKey = value;
						})
				);

			vectorizeApiKeySetting.addButton((button) => {
				button
					.setButtonText("Save API Key")
					.onClick(async () => {
						if (temporaryVectorizeApiKey) {
							try {
								if (safeStorage.isEncryptionAvailable()) {
									const encrypted = safeStorage.encryptString(temporaryVectorizeApiKey);
									this.plugin.settings.cloudflareVectorizeApiKey = Buffer.from(encrypted).toString('base64');
								} else {
									this.plugin.settings.cloudflareVectorizeApiKey = temporaryVectorizeApiKey;
								}
								this.plugin.settings.cloudflareVectorizeApiKeySaved = true;
								temporaryVectorizeApiKey = '';
								await this.plugin.saveSettings();
								new Notice('Cloudflare Vectorize API key saved successfully');
								this.display();
							} catch (error) {
								new Notice('Failed to save API key');
								console.error(error);
							}
						} else {
							new Notice('Please enter an API key');
						}
					});
			});
		} else {
			const vectorizeApiKeySetting = new Setting(containerEl)
				.setName("Cloudflare Vectorize API key")
				.setDesc("The API key for your Cloudflare Vectorize API")
				.addText((text) => {
					try {
						let apiKey = this.plugin.settings.cloudflareVectorizeApiKey;
						if (safeStorage.isEncryptionAvailable() && apiKey) {
							const decrypted = safeStorage.decryptString(Buffer.from(apiKey, 'base64'));
							text.setPlaceholder(obfuscate(decrypted));
						} else {
							text.setPlaceholder(obfuscate(apiKey));
						}
					} catch (error) {
						text.setPlaceholder('********');
					}
					text.setDisabled(true);
				});

			vectorizeApiKeySetting.addButton((button) => {
				button
					.setButtonText("Remove API Key")
					.onClick(async () => {
						this.plugin.settings.cloudflareVectorizeApiKey = '';
						this.plugin.settings.cloudflareVectorizeApiKeySaved = false;
						await this.plugin.saveSettings();
						new Notice('Cloudflare Vectorize API key removed');
						this.display();
					});
			});
		}

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
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.syncEnabled)
					.onChange(async (value) => {
						this.plugin.settings.syncEnabled = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Sync interval")
			.setDesc("How often to sync (in minutes)")
			.addText((text) =>
				text
					.setPlaceholder("30")
					.setValue(this.plugin.settings.autoSyncInterval.toString())
					.onChange(async (value) => {
						const interval = parseInt(value);
						if (interval > 0) {
							this.plugin.settings.autoSyncInterval = interval;
							await this.plugin.saveSettings();
						}
					}),
			);
	}
}
