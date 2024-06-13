import { IMainController } from "../main.ctrlr";
import { App, Instruction, Modal, Notice, Setting, SuggestModal } from "obsidian";

interface IInviteAcceptModal {
    action: string
}

const options = [

    { 'action': 'accept' }
]

export class InviteAcceptModal extends Modal {

    main: IMainController
    from: string;
    contract: string;
    name: string;

    constructor(main: IMainController, from: string, name: string, contract: string) {
        super(main.plugin.app)
        this.main = main
        this.name = name
        this.from = from;
        this.contract = contract;
    }

    onOpen() {
        let { contentEl } = this;
        const msg = `${this.from} invites you to the pod ${this.name}`;

        contentEl.createEl("div", { text: msg });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Accept")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.main.import(this.contract, this.name);
                    }));
    }



}



