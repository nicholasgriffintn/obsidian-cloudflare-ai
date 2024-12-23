import { Notice } from "obsidian";
import type { App, Editor, EditorPosition } from "obsidian";

import type { Logger } from "../lib/logger";
import type { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import type { CloudflareAIPluginSettings } from "../types";
import type { TemplateManager } from "./template-manager";
import type { Template } from "../types";
import { TextGeneratorModal } from "../modals/generate-text";

export class TextGenerationService {
	constructor(
		private app: App,
		private logger: Logger,
		private gateway: CloudflareAIGateway,
		private settings: CloudflareAIPluginSettings,
		private templateManager: TemplateManager,
	) {}

	async generateFromTemplate(
		template: Template,
		variables: Record<string, string>,
	): Promise<string> {
		const prompt = await this.templateManager.applyTemplate(
			template,
			variables,
		);

		return this.generateText({
			prompt,
			maxTokens: this.settings.maxTokens,
			temperature: this.settings.temperature,
		});
	}

	async generateInEditor(
		editor: Editor,
		options: {
			templateName?: string;
			insertAtCursor?: boolean;
			replaceSelection?: boolean;
			position?: { line: number; ch: number };
			prependHash?: boolean;
			replaceExisting?: boolean;
			replaceLine?: number;
			addNewline?: boolean;
			text?: string;
		} = {},
	): Promise<void> {
		const selection = editor.getSelection();
		const cursor = options.position || editor.getCursor();
		const loadingText = "🤖 Generating...";
		let loadingPosition: EditorPosition | undefined;

		try {
			if (options.replaceLine !== undefined) {
				const line = editor.getLine(options.replaceLine);
				editor.replaceRange(
					loadingText,
					{ line: options.replaceLine, ch: 0 },
					{ line: options.replaceLine, ch: line.length },
				);
				loadingPosition = { line: options.replaceLine, ch: 0 };
			} else if (options.replaceSelection && editor.somethingSelected()) {
				const from = editor.getCursor("from");
				editor.replaceSelection(loadingText);
				loadingPosition = from;
			} else {
				editor.replaceRange(loadingText, cursor);
				loadingPosition = cursor;
			}

			new Notice(`Generating ${options.templateName || "text"}...`);

			let text: string;
			if (options.templateName) {
				const template = this.templateManager.getTemplate(options.templateName);
				if (!template) {
					throw new Error(`Template ${options.templateName} not found`);
				}

				text = await this.generateFromTemplate(template, {
					text: options.text || selection || editor.getValue(),
				});

				if (options.prependHash && !text.startsWith("#")) {
					text = "# " + text;
				}

				if (options.addNewline) {
					text = `\n\n${text}`;
				}
			} else {
				text = await this.generateText({
					prompt: selection,
				});
			}

			const loadingEndPosition = {
				line: loadingPosition.line,
				ch: loadingPosition.ch + loadingText.length,
			};
			editor.replaceRange(text, loadingPosition, loadingEndPosition);

			new Notice("Generated successfully");
		} catch (error: unknown) {
			if (loadingPosition) {
				const loadingEndPosition = {
					line: loadingPosition.line,
					ch: loadingPosition.ch + loadingText.length,
				};
				editor.replaceRange("", loadingPosition, loadingEndPosition);
			}

			this.logger.error("Generation failed", {
				error: error instanceof Error ? error.message : String(error),
			});
			new Notice(
				"Failed to generate: " +
					(error instanceof Error ? error.message : String(error)),
			);
		}
	}

	private async generateText(options: {
		prompt: string;
		maxTokens?: number;
		temperature?: number;
	}): Promise<string> {
		if (!options.prompt) {
			throw new Error("Prompt is required");
		}

		const response = await this.gateway.generateText([
			{
				role: "user",
				content: options.prompt,
			},
		]);

		return response;
	}

	async generateWithModal(
		editor: Editor,
		templateName: string,
		options: {
			position?: { line: number; ch: number };
			prependHash?: boolean;
			replaceExisting?: boolean;
			replaceLine?: number;
			addNewline?: boolean;
		} = {},
	): Promise<void> {
		const template = this.templateManager.getTemplate(templateName);
		if (!template) {
			throw new Error(`Template ${templateName} not found`);
		}

		const modal = new TextGeneratorModal(this.app, template);

		modal.onSubmit(async (variables) => {
			modal.close();

			new Notice("Generating...");

			const text = await this.generateFromTemplate(template, {
				...variables,
				text: editor.getValue(),
			});

			if (options.replaceLine !== undefined) {
				const line = editor.getLine(options.replaceLine);
				editor.replaceRange(
					text,
					{ line: options.replaceLine, ch: 0 },
					{ line: options.replaceLine, ch: line.length },
				);
			} else {
				const cursor = options.position || editor.getCursor();
				editor.replaceRange(text, cursor);
			}

			new Notice("Generated successfully");
		});

		modal.open();
	}
}
