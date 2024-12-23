import { App, Modal, Setting } from "obsidian";
import type { Template } from "../types";

export class TextGeneratorModal extends Modal {
	private variables: Record<string, string> = {};
	private onSubmitCallback?: (
		variables: Record<string, string>,
	) => Promise<void>;
	private inputSettings: Setting[] = [];
	private generateButton?: Setting;
	private isGenerating = false;

	constructor(app: App, private template: Template) {
		super(app);
	}

	onOpen() {
		const { contentEl, titleEl } = this;
		titleEl.setText(this.template.name);

		if (this.template.description) {
			contentEl.createEl("p", { text: this.template.description });
		}

		if (this.template.variables) {
			this.template.variables.forEach((variable) => {
				const setting = new Setting(contentEl)
					.setName(variable)
					.addText((text) =>
						text.setPlaceholder(`Enter ${variable}`).onChange((value) => {
							this.variables[variable] = value;
						}),
					);
				this.inputSettings.push(setting);
			});
		}

		if (this.isGenerating) {
			contentEl.createEl("p", { text: "Generating..." });
		}

		this.generateButton = new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Generate")
				.setCta()
				.onClick(async () => {
					this.setGenerating(true);
					try {
						await this.onSubmitCallback?.(this.variables);
						this.close();
					} catch (error) {
						this.setGenerating(false);
					}
				}),
		);
	}

	private setGenerating(generating: boolean) {
		this.isGenerating = generating;
		this.inputSettings.forEach((setting) => setting.setDisabled(generating));
		this.generateButton?.setDisabled(generating);
		const btnEl = this.generateButton?.controlEl.querySelector("button");
		if (btnEl) {
			btnEl.textContent = generating ? "Generating..." : "Generate";
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	onSubmit(callback: (variables: Record<string, string>) => Promise<void>) {
		this.onSubmitCallback = callback;
	}
}
