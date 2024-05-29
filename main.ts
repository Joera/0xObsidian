import { createSmartAccount, generatePK } from 'author';
import { EthService, IEthService } from 'eth_service';
import { InvitationModal } from 'invitation.modal';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal } from 'obsidian';
import { contractExists, createPodContract, getPodCid, insertConfig, inviteToPod, listenToInvites, readPodContractPermissions, updateConfig } from 'pod';
import { DotSpinner } from 'spinner.service';
import { info, upload } from './lighthouse.service';
import WUDSettingTab from './settings'

// Remember to rename these classes and interfaces!

interface SMACCSettings {
	author_pk: string;
	msca: string
}

const DEFAULT_SETTINGS: SMACCSettings = {
	author_pk: '',
	msca: '',
}

export default class SMACC extends Plugin {
	settings: SMACCSettings;
	settingTab: SettingTab;
	ethService: IEthService;

	async newAuthor() {
		this.settings = DEFAULT_SETTINGS;
		this.settings.author_pk = generatePK();
		console.log(this.settings.author_pk);
		this.ethService.updateSigner(this.settings.author_pk);
		this.saveSettings();
		this.settingTab.display();
		this.settings.msca = await createSmartAccount(this.ethService);
		// this.saveSettings();
	}

	async initAuthor() {
		if (this.settings.author_pk == "") {
			this.settings.author_pk = generatePK();
			this.settingTab.display();
		}

		this.ethService = new EthService(this.settings.author_pk);
		
		if (this.settings.msca == "") {
			this.settings.msca = await createSmartAccount(this.ethService);
			this.settingTab.display();
		}

		this.saveSettings();
	}

	async newPod(path: string) {
		if (await contractExists(this.app, path)) return;
		const cid = getPodCid(path);
		// check if cid differs from on chain state
		await insertConfig(this.app, path, cid);
		const spinner = new DotSpinner(this.app, path);
		const pod_addr = await createPodContract(this.ethService, cid);
		console.log(`new pod for folder ${path} created at: ${pod_addr}`);
		const { readers, authors } = await readPodContractPermissions(this.ethService, pod_addr);
		spinner.stop()
		await updateConfig(this.app, path, pod_addr, readers, authors );
	}

	async updatePod(path: string) {
		if (await contractExists(this.app, path)) return;
		// const cid = getNewCid(path);
	}


	async onload() {
		await this.loadSettings();
		this.initAuthor();
		listenToInvites(this.ethService)

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file: any) => {

				if (file.children.length > 0) {

					menu.addItem((item) => {
						item
						.setTitle("Create pod")
						.setIcon("document")
						.onClick(() => { 
							this.newPod(file.path)
						})
					});

					menu.addItem((item) => {
						item
						.setTitle("Commit pod")
						.setIcon("document")
						.onClick(() => { 
							this.updatePod(file.path)
						})
					});

					menu.addItem((item) => {
						item
						.setTitle("Invite reader")
						.setIcon("document")
						.onClick(() => { 
							new InvitationModal(this.app,this.ethService, file.path).open();
						})
					});
				}
			})
		);

		// const modal = new SuggestModal(this.app);
			
		// 	'Select an option', [
		// 	{ value: 'option1', display: 'Option 1' },
		// 	{ value: 'option2', display: 'Option 2' },
		// 	{ value: 'option3', display: 'Option 3' }
		// ]);

		

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.settingTab = new WUDSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);
		console.log('yo')
	}

	async clearSettings() {
		await this.saveData(DEFAULT_SETTINGS);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

