import { IEthService } from "eth_service";
import { IMainController } from "main.ctrlr";
import { App, Modal } from "obsidian";
// import { inviteToPod } from "pod";

export class InvitationModal extends Modal {

	path;
    main;

	constructor(app: App, main: IMainController, path: string) {
		super(app);
		this.path = path;
        this.main = main;
	}

	onOpen() {

		this.setTitle("Invite for the pod on /" + this.path);

		const {contentEl} = this;

		const containerDiv = contentEl.createEl('div');
		containerDiv.setCssStyles({ "margin": "0 0 1rem 0", "width": "100%", "display": "flex", "flexDirection":"row", "justifyContent": "flex-start", "alignItems" : "center"})

		const invitee_input = containerDiv.createEl('input', { text: 'invitee' });
        invitee_input.setCssStyles({ "margin": "0rem 0.75rem 0 0", "borderRadius": "4px", "padding": "3px", "borderColor": "rgb(171, 171, 171)"}),
        containerDiv.createEl('label', { text: 'read:' });
		const readPermissions = containerDiv.createEl('input', { type: 'checkbox' });
        containerDiv.createEl('label', { text: 'write:' });
		const writePermissions = containerDiv.createEl('input', { type: 'checkbox' });

		const button = contentEl.createEl('button', { text: 'Send' });
        button.addEventListener('click', () => {
            this.main.inviteToPod(this.path, invitee_input.value, readPermissions.checked, writePermissions.checked);
			this.close()
        });
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}