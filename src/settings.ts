import { App, Notice, PluginSettingTab, Setting } from "obsidian";

import { obfuscate } from "./lib/obfuscate";
import type { CloudflareAIPluginSettings, LogLevelType } from "./types";
import { ModelIds, EmbeddingModelIds } from "./constants";
import { safeStorage } from "./lib/safeStorage";
import CloudflareAIPlugin from "./main";
import { setGlobalLoggerConfig } from "./lib/logger-config";

export class CloudflareAISettingsTab extends PluginSettingTab {
	private temporaryAiApiKey: string = "";
	private temporaryVectorizeApiKey: string = "";
	private plugin: CloudflareAIPlugin;
	private settings: CloudflareAIPluginSettings;

	constructor(app: App, plugin: CloudflareAIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
	}

	private createAccountSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Cloudflare account ID")
			.setDesc("The ID of your Cloudflare account")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Cloudflare Account ID")
					.setValue(this.settings.cloudflareAccountId)
					.onChange(async (value) => {
						this.settings.cloudflareAccountId = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Cloudflare AI Gateway ID")
			.setDesc("The ID of your Cloudflare AI Gateway")
			.addText((text) =>
				text
					.setPlaceholder("Enter your Cloudflare AI Gateway ID")
					.setValue(this.settings.cloudflareAiGatewayId)
					.onChange(async (value) => {
						this.settings.cloudflareAiGatewayId = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private createApiKeySettings(containerEl: HTMLElement): void {
		this.createApiKeySetting(
			containerEl,
			"Cloudflare AI API key",
			"The API key for your Cloudflare AI Gateway",
			"cloudflareAiApiKey",
			"cloudflareAiApiKeySaved",
			this.temporaryAiApiKey,
			(value) => (this.temporaryAiApiKey = value),
		);

		this.createApiKeySetting(
			containerEl,
			"Cloudflare Vectorize API key",
			"The API key for your Cloudflare Vectorize API",
			"cloudflareVectorizeApiKey",
			"cloudflareVectorizeApiKeySaved",
			this.temporaryVectorizeApiKey,
			(value) => (this.temporaryVectorizeApiKey = value),
		);
	}

	private createApiKeySetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		keyField: "cloudflareAiApiKey" | "cloudflareVectorizeApiKey",
		savedField: "cloudflareAiApiKeySaved" | "cloudflareVectorizeApiKeySaved",
		temporaryKey: string,
		setTemporaryKey: (value: string) => void,
	): void {
		if (!this.plugin.settings[savedField]) {
			const setting = new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addText((text) =>
					text
						.setPlaceholder(`Enter your ${name}`)
						.onChange((value) => setTemporaryKey(value)),
				);

			setting.addButton((button) => {
				button.setButtonText("Save API Key").onClick(async () => {
					if (temporaryKey) {
						try {
							if (safeStorage.isEncryptionAvailable()) {
								const encrypted = safeStorage.encryptString(temporaryKey);
								this.plugin.settings[keyField] =
									Buffer.from(encrypted).toString("base64");
							} else {
								this.plugin.settings[keyField] = temporaryKey;
							}
							this.plugin.settings[savedField] = true;
							setTemporaryKey("");
							await this.plugin.saveSettings();
							new Notice(`${name} saved successfully`);
							this.display();
						} catch (error) {
							new Notice("Failed to save API key");
							console.error(error);
						}
					} else {
						new Notice("Please enter an API key");
					}
				});
			});
		} else {
			const setting = new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addText((text) => {
					try {
						let apiKey = this.plugin.settings[keyField];
						if (safeStorage.isEncryptionAvailable() && apiKey) {
							const decrypted = safeStorage.decryptString(
								Buffer.from(apiKey, "base64"),
							);
							text.setPlaceholder(obfuscate(decrypted));
						} else {
							text.setPlaceholder(obfuscate(apiKey));
						}
					} catch (error) {
						text.setPlaceholder("********");
					}
					text.setDisabled(true);
				});

			setting.addButton((button) => {
				button.setButtonText("Remove API Key").onClick(async () => {
					this.plugin.settings[keyField] = "";
					this.plugin.settings[savedField] = false;
					await this.plugin.saveSettings();
					new Notice(`${name} removed`);
					this.display();
				});
			});
		}
	}

	private createModelSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Text model").setHeading();

		new Setting(containerEl)
			.setName("Model ID")
			.setDesc("The ID of the text model to use")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(
						Object.fromEntries(
							Object.entries(ModelIds).map(([_, value]) => [
								value,
								value.split("/").pop()?.replace(/-/g, " ").toUpperCase() ??
									value,
							]),
						),
					)
					.setValue(this.settings.modelId)
					.onChange(async (value) => {
						this.settings.modelId = value as ModelIds;
						await this.plugin.saveSettings();
					}),
			);

		this.createNumberSetting(
			containerEl,
			"Max tokens",
			"The maximum number of tokens to generate",
			"maxTokens",
			1,
			Infinity,
		);

		this.createNumberSetting(
			containerEl,
			"Temperature",
			"The temperature of the text model",
			"temperature",
			0,
			5,
			true,
		);
	}

	private createVectorizeSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Cloudflare Vectorize").setHeading();

		new Setting(containerEl)
			.setName("Vectorize index name")
			.setDesc("The name of the index")
			.addText((text) =>
				text
					.setPlaceholder("Enter the name of the index to use")
					.setValue(this.settings.vectorizeIndexName)
					.onChange(async (value) => {
						this.settings.vectorizeIndexName = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Text embeddings model ID")
			.setDesc("The ID of the text embeddings model to use")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(
						Object.fromEntries(
							Object.entries(EmbeddingModelIds).map(([_, value]) => [
								value,
								value.split("/").pop()?.replace(/-/g, " ").toUpperCase() ??
									value,
							]),
						),
					)
					.setValue(this.settings.textEmbeddingsModelId)
					.onChange(async (value) => {
						this.settings.textEmbeddingsModelId = value as EmbeddingModelIds;
						await this.plugin.saveSettings();
					}),
			);

		this.createNumberSetting(
			containerEl,
			"Top k",
			"The number of results to return",
			"topK",
			1,
			Infinity,
		);

		this.createNumberSetting(
			containerEl,
			"Min similarity score",
			"The minimum similarity score to return",
			"minSimilarityScore",
			0,
			1,
			true,
		);
	}

	private createSyncSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Sync").setHeading();

		new Setting(containerEl)
			.setName("Ignored folders")
			.setDesc("Folders to ignore when syncing notes, separated by commas")
			.addText((text) =>
				text
					.setPlaceholder("Enter the folders to ignore")
					.setValue(this.settings.ignoredFolders.join(","))
					.onChange(async (value) => {
						this.settings.ignoredFolders = value.split(",").filter(Boolean);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Enable auto sync")
			.setDesc("Automatically sync notes at regular intervals")
			.addToggle((toggle) =>
				toggle.setValue(this.settings.syncEnabled).onChange(async (value) => {
					this.settings.syncEnabled = value;
					await this.plugin.saveSettings();
				}),
			);

		this.createNumberSetting(
			containerEl,
			"Sync interval",
			"How often to sync (in minutes)",
			"autoSyncInterval",
			1,
			Infinity,
		);
	}

	private createTextGeneratorSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Text Generator").setHeading();

		new Setting(containerEl)
			.setName("Custom templates folder")
			.setDesc("The folder to store custom templates")
			.addText((text) =>
				text
					.setPlaceholder("Enter the folder to store custom templates")
					.setValue(this.settings.customTemplatesFolder)
					.onChange(async (value) => {
						this.settings.customTemplatesFolder = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private createLoggerSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Logging").setHeading();

		new Setting(containerEl)
			.setName("Log Level")
			.setDesc("Set the logging level for the plugin")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						error: "Error",
						warn: "Warning",
						info: "Info",
						debug: "Debug",
					})
					.setValue(this.settings.logLevel || "error")
					.onChange(async (value) => {
						this.settings.logLevel = value as LogLevelType;
						setGlobalLoggerConfig({ level: value as LogLevelType });
						await this.plugin.saveSettings();
					}),
			);
	}

	private createNumberSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		field: keyof CloudflareAIPluginSettings,
		min: number,
		max: number,
		isFloat: boolean = false,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) =>
				text
					.setPlaceholder(name)
					.setValue(this.plugin.settings[field]?.toString() ?? "")
					.onChange(async (value) => {
						const parsedValue = isFloat ? parseFloat(value) : parseInt(value);
						if (
							!isNaN(parsedValue) &&
							parsedValue >= min &&
							parsedValue <= max
						) {
							(this.plugin.settings[field] as number) = parsedValue;
							await this.plugin.saveSettings();
						} else {
							new Notice(
								`Invalid value for ${name}. Must be between ${min} and ${max}`,
							);
						}
					}),
			);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.createAccountSettings(containerEl);
		this.createApiKeySettings(containerEl);
		this.createModelSettings(containerEl);
		this.createVectorizeSettings(containerEl);
		this.createSyncSettings(containerEl);
		this.createTextGeneratorSettings(containerEl);
		this.createLoggerSettings(containerEl);
	}
}
