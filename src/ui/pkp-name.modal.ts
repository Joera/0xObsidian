import { App, Modal, Setting } from "obsidian";
import { IMainController } from "../main.ctrlr.js";

export class PKPNameModal extends Modal {
    
    main: IMainController;
    onSubmit: (name: string) => void;

    constructor(app: App, main: IMainController, onSubmit: (name: string) => void) {
        super(app);
        this.main = main;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl("h2", { text: "Name your PKP" });

        new Setting(contentEl)
            .setName("PKP Name")
            .setDesc("Give your Programmable Key Pair a memorable name")
            .addText(text => text
                .setPlaceholder("e.g. My Signing Key")
                .onChange(() => {
                    submitButton.setDisabled(text.getValue().trim() === "");
                })
                .setValue("")
            );

        const submitButton = new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText("Create PKP")
                .setCta()
                .setDisabled(true)
                .onClick(async () => {
                    const name = contentEl.querySelector("input")?.value.trim();
                    if (name) {
                        this.onSubmit(name);
                        this.close();
                    }
                })
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
