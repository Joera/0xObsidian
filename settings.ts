import { PluginSettingTab } from "obsidian";
import SMACC from "./main";
import { App, Setting } from "obsidian";

export default class WUDSettingTab extends PluginSettingTab {
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
