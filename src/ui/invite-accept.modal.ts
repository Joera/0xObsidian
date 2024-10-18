import { IUpdate } from "src/types/oxo";
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
    block_number: string
    from: string;
    contract: string;
    name: string;

    constructor(main: IMainController, block_number: string, from: string, name: string, contract: string) {
        super(main.plugin.app)
        this.main = main
        this.block_number = block_number;
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
                        if (this.main.plugin.settings.updates[this.name] != undefined) {
                            let update = this.main.plugin.settings.updates[this.name].find( (u: IUpdate) => u.block_number == this.block_number && u.contract == this.contract && u.from == this.from);
                            if (update != undefined) {
                                update.accepted = true;
                                this.main.plugin.saveSettings();
                            }
                        } else {
                            this.main.plugin.settings.updates[this.name] = [];
                        }
                        this.main.import(this.contract, this.name);
                    }));
    }



}



