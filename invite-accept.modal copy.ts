import { IMainController } from "main.ctrlr";
import { App, Instruction, Modal, Notice, Setting, SuggestModal } from "obsidian";

interface IUpdateAcceptModal {
    action: string
}

const options = [

    { 'action' : 'acceptUpdate'}
]   

export class UpdateAcceptModal extends Modal {

    main: IMainController
    from: string;
    contract: string;

    constructor(main: IMainController, from: string, contract: string) {
        super(main.plugin.app)
        this.main = main
        this.from = from;
        this.contract = contract;
    }

    onOpen() {
        let { contentEl } = this;
        const msg = `your pod as been updated by ${this.from}`;

        contentEl.createEl("div", { text: msg });

        new Setting(contentEl)
        .addButton((btn) =>
            btn
            .setButtonText("Accept")
            .setCta()
            .onClick(() => {
                this.close();
                this.main.import(this.contract);
            }));  
        }

    
    
}
			

		
