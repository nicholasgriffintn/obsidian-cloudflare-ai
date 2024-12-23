import { App, Modal, Setting } from "obsidian";
import type { Template } from "../types";

export class TextGeneratorModal extends Modal {
    private variables: Record<string, string> = {};
    private onSubmitCallback?: (variables: Record<string, string>) => Promise<void>;
    private isGenerating = false;

    constructor(
        app: App,
        private template: Template
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl, titleEl } = this;
        titleEl.setText(this.template.name);
        
        if (this.template.description) {
            contentEl.createEl("p", { text: this.template.description });
        }

        if (this.isGenerating) {
            contentEl.createEl("p", { text: "Generating..." });
        }

        if (this.template.variables) {
            this.template.variables.forEach(variable => {
                new Setting(contentEl)
                    .setName(variable)
                    .addText(text => text
                        .setPlaceholder(`Enter ${variable}`)
                        .onChange(value => {
                            this.variables[variable] = value;
                        }))
                    .setDisabled(this.isGenerating)
            });
        }

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText("Generate")
                .setCta()
                .onClick(async () => {
                    this.isGenerating = true;
                    await this.onSubmitCallback?.(this.variables);
                    this.close();
                }))
            .setDisabled(this.isGenerating);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    onSubmit(callback: (variables: Record<string, string>) => Promise<void>) {
        this.onSubmitCallback = callback;
    }
}
