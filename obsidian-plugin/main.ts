import { createSmartAccount, generatePK } from 'author';
import { EthService, IEthService } from 'eth_service';
import { InvitationModal } from 'invitation.modal';
import { IIpfsService, IpfsService } from 'ipfs.service';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal } from 'obsidian';
import { contractExists, createPodContract, getPodCid, insertConfig, inviteToPod, listenToInvites, readPodContractPermissions, updateConfig } from 'pod';
import { DotSpinner } from 'spinner.service';
import { info, upload } from './lighthouse.service';

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
	ipfsService: IIpfsService;

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

	async initIpfs() {

		// how to 
		await upload("/home/joera/vaults/main/pod_hackfs");

		}

	async onload() {
		await this.loadSettings();


		await this.initIpfs();
		this.initAuthor();
		listenToInvites(this.ethService)

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file: any) => {

				console.log(file);

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

		this.settingTab = new SettingTab(this.app, this);
		this.addSettingTab(this.settingTab);

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async clearSettings() {
		await this.saveData(DEFAULT_SETTINGS);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}



class SettingTab extends PluginSettingTab {
	plugin: SMACC;

	constructor(app: App, plugin: SMACC) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
		.setName('Author')
		.setDesc('Delete below, create a new local signer and on-chain smart account')
		.addButton( button => button
			.setButtonText("New")
			.onClick( async () => {
				await this.plugin.newAuthor();
			})
		);

		new Setting(containerEl)
			.setName('Signer key')
			.setDesc('Locally kept private key for an eoa')
			.addText(text => text
				.setValue(this.plugin.settings.author_pk)
				// .onChange(async (value) => {
				// 	this.plugin.settings.author_pk = value;
				// 	await this.plugin.saveSettings();
				// })
			);

		new Setting(containerEl)
		.setName('Smart Account')
		.setDesc('Modular Smart Account following EIP-4337 on Arbitrum Sepolia')
		.addText(text => text
			.setValue(this.plugin.settings.msca)
		);
	}
}
