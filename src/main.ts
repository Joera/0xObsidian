
import { InvitationModal } from './ui/invitation.modal';
import { Plugin, SettingTab } from 'obsidian';
import { DEFAULT_SETTINGS, IOxOSettings, OxOAuthorsTab, OxOUpdatesTab, } from './settings';
import { IMainController, MainController } from './main.ctrlr';
import { IAuthor } from './author/author';


export default class OxO extends Plugin {
	settings: IOxOSettings;
	authorsTab: SettingTab;
	updatesTab: SettingTab;
	ctrlr: IMainController;

	async onload() {
		await this.loadSettings();
		this.ctrlr = new MainController(this)


		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file: any) => {

				if (file.children && file.children.length > 0) {

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
						.setTitle("Update pod")
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
		this.authorsTab = new OxOAuthorsTab(this.app, this);
		this.addSettingTab(this.authorsTab);
		this.updatesTab = new OxOUpdatesTab(this.app, this);
		this.addSettingTab(this.updatesTab);
	}

	async clearSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		await this.saveData(this.settings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

