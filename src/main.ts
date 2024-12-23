import { Notice, Plugin, TFile } from "obsidian";
import "virtual:uno.css";
import { CloudflareAISettingsTab } from "./settings";

import { ChatModal } from "./modals/chat";
import { CloudflareAIGateway } from "./lib/cloudflare-ai-gateway";
import { SyncService } from "./services/sync";
import { CloudflareVectorize } from "./lib/cloudflare-vectorize";
import type { CloudflareAIPluginSettings } from "./types";
import { Logger } from "./lib/logger";
import { DEFAULT_SETTINGS, PLUGIN_NAME } from "./constants";
import { safeStorage } from "./lib/safeStorage";
import { PLUGIN_PREFIX } from "./constants";
import { ChatView } from "./views/chat";
import { setGlobalLoggerConfig } from "./lib/logger-config";
import { TextGenerationService } from "./services/text-generator";
import { TemplateManager } from "./services/template-manager";

export default class CloudflareAIPlugin extends Plugin {
	public settings!: CloudflareAIPluginSettings;
	private gateway!: CloudflareAIGateway;
	private vectorize!: CloudflareVectorize;
	private syncService!: SyncService;
	private syncStatusBar!: HTMLElement;
	private syncInterval?: number;
	private readonly logger: Logger = new Logger();

	private getDecryptedApiKey(encryptedKey: string): string {
		if (!encryptedKey) return "";

		try {
			if (safeStorage.isEncryptionAvailable()) {
				return safeStorage.decryptString(Buffer.from(encryptedKey, "base64"));
			}
		} catch (error) {
			this.logger.error("Failed to decrypt API key:", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
		}
		return encryptedKey;
	}

	private async initializeServices(): Promise<void> {
		const decryptedAiApiKey = this.getDecryptedApiKey(
			this.settings.cloudflareAiApiKey,
		);
		const decryptedVectorizeApiKey = this.getDecryptedApiKey(
			this.settings.cloudflareVectorizeApiKey,
		);

		this.gateway = new CloudflareAIGateway(
			this.logger,
			this.settings.cloudflareAccountId,
			this.settings.cloudflareAiGatewayId,
			decryptedAiApiKey,
			this.settings.modelId,
			this.settings.maxTokens,
			this.settings.temperature,
		);

		this.vectorize = new CloudflareVectorize(
			this.logger,
			this.settings.cloudflareAccountId,
			decryptedVectorizeApiKey,
			this.settings.vectorizeIndexName,
		);

		this.syncService = new SyncService(
			this.app,
			this.logger,
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

	private async activateView(): Promise<void> {
		const existingView = this.app.workspace.getLeavesOfType(PLUGIN_PREFIX);
		if (existingView.length === 0) {
			const leaf = this.app.workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: PLUGIN_PREFIX,
					active: true,
				});
			}
		}
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(PLUGIN_PREFIX)[0],
		);
	}

	async onload(): Promise<void> {
		await this.loadSettings();

		setGlobalLoggerConfig({
			level: this.settings.logLevel,
			serviceName: PLUGIN_NAME,
		});

		this.addSettingTab(new CloudflareAISettingsTab(this.app, this));

		this.registerView(
			PLUGIN_PREFIX,
			(leaf) =>
				new ChatView(
					leaf,
					this.app,
					this.logger,
					this.gateway,
					this.vectorize,
					this.settings,
					this.syncService,
				),
		);

		this.setupSyncInterval();

		this.registerEvent(
			this.app.metadataCache.on("deleted", async (file) => {
				try {
					if (file instanceof TFile && file.extension === "md") {
						const vectorId = this.syncService.createVectorId(file.name);
						await this.vectorize.deleteVectorsByIds([vectorId]);

						const syncPath = `.cloudflare-ai/sync/${vectorId}.json`;
						if (await this.app.vault.adapter.exists(syncPath)) {
							await this.app.vault.adapter.remove(syncPath);
						}

						new Notice(`Deleted file ${file.path} from the vector index`);
					}
				} catch (error) {
					this.logger.error(
						"Failed to remove deleted file from vector index:",
						{
							error: error instanceof Error ? error.message : String(error),
							stack: error instanceof Error ? error.stack : undefined,
						},
					);
					new Notice(
						`Failed to remove deleted file ${
							file.path
						} from the vector index: ${
							error instanceof Error ? error.message : String(error)
						}`,
					);
				}
			}),
		);

		this.app.workspace.onLayoutReady(async () => {
			try {
				this.addRibbonIcon("message-circle", "Open AI Chat", () =>
					this.activateView(),
				);

				this.syncStatusBar = this.addStatusBarItem();
				this.updateSyncStatus("Ready");

				const templateManager = new TemplateManager(this.app, this.logger);
				await templateManager.loadCustomTemplates(
					this.settings.customTemplatesFolder,
				);

				this.addCommand({
					id: "start-chat",
					name: "Start Chat",
					callback: () => {
						new ChatModal(
							this.app,
							this.logger,
							this.gateway,
							this.vectorize,
							this.settings,
							this.syncService,
						).open();
					},
				});

				this.addCommand({
					id: "sync-notes",
					name: "Sync Notes",
					callback: () => this.syncNotes(),
				});

				const textGenerator = new TextGenerationService(
					this.app,
					this.logger,
					this.gateway,
					this.settings,
					templateManager,
				);

				this.addCommand({
					id: "continue-writing",
					name: "Continue Writing",
					editorCallback: (editor) => {
						textGenerator.generateInEditor(editor, {
							templateName: "continue",
							insertAtCursor: true,
							addNewline: true,
						});
					},
				});

				this.addCommand({
					id: "summarise-selection",
					name: "Summarise Selection",
					editorCheckCallback: (checking, editor) => {
						const hasSelection = editor.somethingSelected();
						if (checking) return hasSelection;

						textGenerator.generateInEditor(editor, {
							templateName: "summarise",
							replaceSelection: true,
						});
					},
				});

				this.addCommand({
					id: "expand-selection",
					name: "Expand Selection",
					editorCheckCallback: (checking, editor) => {
						const hasSelection = editor.somethingSelected();
						if (checking) return hasSelection;

						textGenerator.generateInEditor(editor, {
							templateName: "expand",
							insertAtCursor: true,
							addNewline: true,
						});
					},
				});

				this.addCommand({
					id: "rewrite-selection",
					name: "Rewrite Selection",
					editorCheckCallback: (checking, editor) => {
						const hasSelection = editor.somethingSelected();
						if (checking) return hasSelection;

						textGenerator.generateInEditor(editor, {
							templateName: "rewrite",
							replaceSelection: true,
						});
					},
				});

				this.addCommand({
					id: "simplify-selection",
					name: "Simplify Selection",
					editorCheckCallback: (checking, editor) => {
						const hasSelection = editor.somethingSelected();
						if (checking) return hasSelection;

						textGenerator.generateInEditor(editor, {
							templateName: "simplify",
							replaceSelection: true,
						});
					},
				});

				this.addCommand({
					id: "suggest-tags",
					name: "Suggest Tags",
					editorCallback: (editor) => {
						textGenerator.generateInEditor(editor, {
							templateName: "suggest-tags",
							replaceSelection: false,
							addNewline: true,
						});
					},
				});

				this.addCommand({
					id: "generate-title",
					name: "Generate Title",
					editorCallback: async (editor) => {
						const file = this.app.workspace.getActiveFile();
						if (!file) return;

						try {
							const content = editor.getValue();

							const template = templateManager.getTemplate("generate-title");
							if (!template) {
								throw new Error("Generate title template not found");
							}

							const generatedTitleRequest = await this.gateway.makeRequest<{
								response: string;
							}>({
								modelId: this.settings.modelId,
								prompt: await templateManager.applyTemplate(template, {
									text: content,
								}),
								shouldStream: false,
								type: "text",
								maxRetries: 3,
							});

							const generatedTitle = generatedTitleRequest.response;

							if (typeof generatedTitle !== "string") {
								throw new Error("Generated title is not a string");
							}

							const sanitizedTitle = generatedTitle
								.replace(/^#\s+/, "")
								.replace(/[\/\\:*?"<>|]/g, "")
								.replace(/\s+/g, "-")
								.trim()
								.toLowerCase();

							const newPath = file.path.replace(
								file.name,
								`${sanitizedTitle}.${file.extension}`,
							);

							await this.app.fileManager.renameFile(file, newPath);
							new Notice(`File renamed to: ${sanitizedTitle}`);
						} catch (error) {
							this.logger.error("Failed to generate title and rename file:", {
								error: error instanceof Error ? error.message : String(error),
								stack: error instanceof Error ? error.stack : undefined,
							});
							new Notice("Failed to generate title and rename file");
						}
					},
				});

				this.addCommand({
					id: "generate-text-with-variables",
					name: "Generate Text With Variables",
					editorCallback: (editor) => {
						textGenerator.generateWithModal(editor, "generate-text", {
							addNewline: true,
						});
					},
				});

				this.addCommand({
					id: "brainstorm",
					name: "Brainstorm",
					editorCallback: (editor) => {
						textGenerator.generateInEditor(editor, {
							templateName: "brainstorm",
							replaceSelection: false,
							addNewline: true,
						});
					},
				});

				const nonDefaultTemplates = Array.from(
					templateManager.getTemplates(),
				).filter(([_, template]) => !template.default);

				for (const [name, template] of nonDefaultTemplates) {
					const commandId = `template-${name}`;

					this.addCommand({
						id: commandId,
						name: template.description || `Execute template: ${template.name}`,
						editorCallback: (editor) => {
							if (template.variables?.length) {
								textGenerator.generateWithModal(editor, template.name, {
									addNewline: true,
								});
							} else {
								textGenerator.generateInEditor(editor, {
									templateName: template.name,
									replaceSelection: false,
									addNewline: true,
								});
							}
						},
					});
				}

				this.logger.debug("loaded");
			} catch (error) {
				this.logger.error("Failed to load commands", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		});
	}

	onunload(): void {
		if (this.syncInterval) {
			window.clearInterval(this.syncInterval);
		}
		if (this.logger) {
			this.logger.destroy();
		}
		this.app.workspace.detachLeavesOfType(PLUGIN_PREFIX);

		this.logger.debug("unloaded");
	}

	private updateSyncStatus(status: string): void {
		this.syncStatusBar.setText(`AI Sync: ${status}`);
		this.logger.debug("Sync status updated", { status });
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

			this.logger.debug("Sync complete", { timestamp });
		} catch (error: unknown) {
			this.logger.error("Sync failed", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			this.updateSyncStatus("Failed");
			new Notice(
				`Sync failed: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}
}
