import { IMainController } from "main.ctrlr";
import { App, Instruction, Modal, Notice, Setting, SuggestModal } from "obsidian";

interface IInviteAcceptModal {
    action: string
}

const options = [

    { 'action' : 'accept'}
]   

export class InviteAcceptModal extends Modal {

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
        const msg = `you've been invited to a pod by ${this.from}`;

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
			

		
