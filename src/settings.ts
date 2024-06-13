import { PluginSettingTab } from "obsidian";
import { App, Setting } from "obsidian";
import OxO from "./main";
import { IAuthor } from "./author/author";
import { IUpdate } from "./types/oxo";

export interface IOxOSettings {
	authors: IAuthor[],
	updates: IUpdate[],
	updatesIncludeMyOwn: boolean
}

export const DEFAULT_SETTINGS: IOxOSettings = {
	authors : [],
	updates: [],
	updatesIncludeMyOwn: false
}


export class OxOAuthorsTab extends PluginSettingTab {
	plugin: OxO;
	name: string;

	constructor(app: App, plugin: OxO) {
		super(app, plugin);
		this.plugin = plugin;
		this.name = "0xO Authors";
	}

	display(): void {
		
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
		.setName('Authors')
		.setDesc('Create a local signer and Modular Smart Account following EIP-4337 on Arbitrum Sepolia')
		.addButton( button => button
			.setButtonText("New")
			.onClick( async () => {
				await this.plugin.ctrlr.newAuthor();
			})
		);

		for (let author of this.plugin.settings.authors) {

			const authorEl = containerEl.createEl("div", { });
			authorEl.setCssStyles({"marginTop":"2rem", "paddingBottom":"1rem", "borderBottom": "1px solid #000"})

			new Setting(authorEl)
				.setName('Name')
				.setDesc('')
				.addText(text => text
					.setValue(author.name)
					.onChange(async (value) => {
						author.name = value;
						await this.plugin.saveSettings();
					})
				);

			new Setting(authorEl)
				.setName('Address')
				.setDesc('')
				.addText(text => text
					.setValue(author.msca || "")
					// .onChange(async (value) => {
					// 	this.plugin.settings.msca = value;
					// 	console.log(value);
					// 	await this.plugin.saveSettings();
					// })
				);

			new Setting(authorEl)
				.setName('Profile/Config')
				.setDesc('')
				.addText(text => text
					.setValue(author.profile || "")
					.onChange(async (value) => {
						author.profile = value;
						await this.plugin.saveSettings();
					})
				);

			new Setting(authorEl)
				.setName('Active')
				.setDesc('')
				.addToggle( button => button
					.setValue(author.active)
					.onChange( async () => {
						
						for (let a of this.plugin.settings.authors.filter( a => a.name != author.name)){
							a.active = false;
						}
						author.active = !author.active;
						await this.plugin.saveSettings();
						await this.plugin.ctrlr.toggleAuthor(author);
						this.plugin.authorsTab.display();
					})
				);

			new Setting(authorEl)
				.addButton( button => button
					.setButtonText("Remove from UI")
					.onClick( async () => {
						
						this.plugin.settings.authors = this.plugin.settings.authors.filter( a => a.name != author.name);
						await this.plugin.saveSettings();
						this.plugin.authorsTab.display();
					})
				);
		}
	}
}

export class OxOUpdatesTab extends PluginSettingTab {
	plugin: OxO;
	name: string;

	constructor(app: App, plugin: OxO) {
		super(app, plugin);
		this.plugin = plugin;
		this.name = "0xO Updates";
	}

	display(): void {
		
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
		.setName('Updates')
		.setDesc('Overview of updates on your pods');

		new Setting(containerEl)
				.setDesc("Show my own updates")
				.addToggle( button => button
					.setValue(this.plugin.settings.updatesIncludeMyOwn)
					.onChange( async () => {
						
						this.plugin.settings.updatesIncludeMyOwn = !this.plugin.settings.updatesIncludeMyOwn;
						await this.plugin.saveSettings();
						this.plugin.updatesTab.display();
					})
				);

		let updates = JSON.parse(JSON.stringify(this.plugin.settings.updates));


        updates.sort( (a: IUpdate,b: IUpdate) => {
            return parseInt(b.block_number) - parseInt(a.block_number)

        });

		console.log(this.plugin.settings.updatesIncludeMyOwn);

		if (!this.plugin.settings.updatesIncludeMyOwn) {

			console.log(this.plugin.ctrlr.author.msca)
			updates = updates.filter( (u: IUpdate ) => {
				return u.from != this.plugin.ctrlr.author.msca
	
			});
		}
	
		for (let update of updates) {

			const authorEl = containerEl.createEl("div", { });
			authorEl.setCssStyles({"display":"flex","flexDirection":"row","justifyContent": "space-between","alignItems": "center","borderBottom": "1px solid #000"})

			const nameEl = authorEl.createEl("div", { });
			nameEl.innerText = update.name;

			const fromEl = authorEl.createEl("div", { });
			fromEl.innerText = '...' + update.from.slice(-4);

			const blockEl = authorEl.createEl("div", { });
			blockEl.innerText = update.block_number;

			new Setting(authorEl)
				.addToggle( button => button
					.setValue(update.accepted)
					.onChange( async () => {
						
						//update.accepted = !update.accepted;
						await this.plugin.saveSettings();
						this.plugin.updatesTab.display();
					})
				);
		}
	}
}
