
import { InvitationModal } from 'invitation.modal';
import { Plugin, SettingTab } from 'obsidian';
import WUDSettingTab from './settings'
import { IMainController, MainController } from 'main.ctrlr';
import { fetchDir } from 'remotekubo.service';

interface SMACCSettings {
	author_pk: string;
	msca: string;
	ens_name: string
}

const DEFAULT_SETTINGS: SMACCSettings = {
	author_pk: '',
	msca: '',
	ens_name: ''
}

export default class SMACC extends Plugin {
	settings: SMACCSettings;
	settingTab: SettingTab;
	ctrlr: IMainController;

	async onload() {
		await this.loadSettings();
		this.ctrlr =  new MainController(this)

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file: any) => {

				if (file.children.length > 0) {

					menu.addItem((item) => {
						item
						.setTitle("Create pod")
						.setIcon("document")
						.onClick(() => { 
							this.ctrlr.newPod(file.path)
						})
					});

					menu.addItem((item) => {
						item
						.setTitle("Commit pod")
						.setIcon("document")
						.onClick(() => { 
							this.ctrlr.updatePod(file.path)
						})
					});

					menu.addItem((item) => {
						item
						.setTitle("Invite")
						.setIcon("document")
						.onClick(() => { 
							new InvitationModal(this.app,this.ctrlr, file.path).open();
						})
					});
				}
			})
		);

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.settingTab = new WUDSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);
	}

	async clearSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		await this.saveData(this.settings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

