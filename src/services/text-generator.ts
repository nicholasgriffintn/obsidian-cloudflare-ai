import { Notice } from "obsidian";

import type { Editor } from "obsidian";

import type { App } from "obsidian";
import type { Logger } from "../lib/logger";
import type { CloudflareAIGateway } from "../lib/cloudflare-ai-gateway";
import type { CloudflareAIPluginSettings } from "../types";
import type { TemplateManager } from "./template-manager";
import type { Template } from "../types";

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
			addNewline?: boolean;
		} = {},
	): Promise<void> {
		const selection = editor.getSelection();
		const cursor = editor.getCursor();

		try {
			let text: string;

			new Notice(`Generating text now...`);

			if (options.templateName) {
				const template = this.templateManager.getTemplate(options.templateName);
				if (!template) {
					throw new Error(`Template ${options.templateName} not found`);
				}

				text = await this.generateFromTemplate(template, {
					text: selection,
				});

				if (options.addNewline) {
					text = "\n\n" + text;
				}
			} else {
				text = await this.generateText({
					prompt: selection,
				});
			}

			if (options.replaceSelection) {
				editor.replaceSelection(text);
			} else if (options.insertAtCursor) {
				editor.replaceRange(text, cursor);
			} else {
				editor.replaceRange(text, cursor, cursor);
			}

			new Notice("Text generated successfully");
		} catch (error: unknown) {
			this.logger.error("Text generation failed", {
				error: error instanceof Error ? error.message : String(error),
			});
			new Notice(
				"Failed to generate text: " +
					(error instanceof Error ? error.message : String(error)),
			);
		}
	}

	private async generateText(options: {
		prompt: string;
		maxTokens?: number;
		temperature?: number;
	}): Promise<string> {
		const response = await this.gateway.generateText([
			{
				role: "user",
				content: options.prompt,
			},
		]);

		return response;
	}
}
