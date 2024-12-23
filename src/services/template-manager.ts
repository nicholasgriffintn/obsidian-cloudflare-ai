import { App } from "obsidian";
import { parseYaml } from "obsidian";

import { Logger } from "../lib/logger";
import type { Template } from "../types";
import { DEFAULT_TEMPLATES } from "../constants";

export class TemplateManager {
	private templates: Map<string, Template> = new Map();

	constructor(private app: App, private logger: Logger) {
		Object.entries(DEFAULT_TEMPLATES).forEach(([key, template]) => {
			this.templates.set(key, template);
		});
	}

	async loadCustomTemplates(): Promise<void> {
		if (!(await this.app.vault.adapter.exists(".cloudflare-ai/templates"))) {
			this.logger.debug("No custom templates folder found, creating...");

			await this.app.vault.adapter.mkdir(".cloudflare-ai/templates");

			for (const [name, template] of Object.entries(DEFAULT_TEMPLATES)) {
				const content = [
					"---",
					`name: ${template.name}`,
					`description: ${template.description}`,
					"---",
					"",
					template.prompt,
				].join("\n");

				await this.app.vault.adapter.write(
					`.cloudflare-ai/templates/${name}.md`,
					content,
				);
			}
		}

		const files = this.app.vault
			.getMarkdownFiles()
			.filter((file) => file.path.startsWith(".cloudflare-ai/templates/"));

		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const template = this.parseTemplate(content);
				this.templates.set(template.name, template);
				this.logger.debug(`Loaded custom template: ${template.name}`);
			} catch (error) {
				this.logger.error(`Failed to load template ${file.path}`, { error });
			}
		}
	}

	private parseTemplate(content: string): Template {
		const frontmatter = this.extractFrontmatter(content);
		if (!frontmatter.name) {
			throw new Error("Template must have a name");
		}

		return {
			name: frontmatter.name,
			description: frontmatter.description,
			prompt: content.replace(/^---[\s\S]*?---/, "").trim(),
			variables: frontmatter.variables,
			tags: frontmatter.tags,
		};
	}

	private extractFrontmatter(content: string): Record<string, any> {
		const match = content.match(/^---\n([\s\S]*?)\n---/);
		if (!match) return {};

		try {
			return parseYaml(match[1]);
		} catch (error) {
			this.logger.error("Failed to parse template frontmatter", { error });
			return {};
		}
	}

	async applyTemplate(
		template: Template,
		variables: Record<string, string>,
	): Promise<string> {
		let prompt = template.prompt;
		for (const [key, value] of Object.entries(variables)) {
			prompt = prompt.replace(`{{${key}}}`, value);
		}
		return prompt;
	}

	getTemplate(name: string): Template | undefined {
		return this.templates.get(name);
	}
}
