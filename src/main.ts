import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import "virtual:uno.css";

import { CHatModel } from "./models/chat";

interface CloudflareAIPluginSettings {
	cloudflareAccountId: string;
	cloudflareAiGatewayId: string;
	cloudflareAiApiKey: string;
	modelId: string;
	maxTokens: number;
	temperature: number;
}

const DEFAULT_SETTINGS: CloudflareAIPluginSettings = {
	cloudflareAccountId: "",
	cloudflareAiGatewayId: "",
	cloudflareAiApiKey: "",
	modelId: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
	maxTokens: 256,
	temperature: 0.6,
};

export default class CloudflareAIPlugin extends Plugin {
	settings!: CloudflareAIPluginSettings;

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "start-chat",
			name: "Start Chat",
			callback: () => {
				const chatModel = new CHatModel(this.app);
				chatModel.open();
			},
		});

		this.addSettingTab(new CloudflareAIPluginSettingTab(this.app, this));
	}

	onunload() {}
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

		containerEl.createEl("h3", { text: "Text Model Settings" });

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
	}
}
