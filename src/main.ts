import { Plugin, SettingTab, Notice } from "obsidian";
import { DEFAULT_SETTINGS, IOxOSettings, OxOAuthorsTab } from "./settings.js";
import { IMainController, MainController } from "./main.ctrlr.js";

// Use Node.js require to access native modules
const { Buffer } = require("buffer");
const { TextEncoder, TextDecoder } = require("util");

// Use Node.js native implementations
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
  window.TextEncoder = TextEncoder;
  window.TextDecoder = TextDecoder;
}

export default class OxO extends Plugin {
  settings!: IOxOSettings;
  authorsTab!: SettingTab;
  ctrlr!: IMainController;

  async onload() {
    await this.loadSettings();
    this.ctrlr = new MainController(this);
    await this.ctrlr.init();

    // Add command to fix thumbnails
    this.addCommand({
      id: "fix-thumbnails",
      name: "Fix Thumbnails",
      callback: async () => {
        try {
          const markdownDir = "/home/joera/vaults/unaore/niewsbrieven";
          const imageBaseDir = "/home/joera/Documents/unamore-images";
          await this.ctrlr.fixThumbnails(markdownDir, imageBaseDir, 1);
          new Notice("Successfully fixed thumbnails");
        } catch (error) {
          console.error("Error fixing thumbnails:", error);
          new Notice(
            "Error fixing thumbnails: " +
              (error instanceof Error ? error.message : String(error)),
          );
        }
      },
    });

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    // this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Ensure each author has pkps initialized
    if (this.settings.authors) {
      this.settings.authors = this.settings.authors.map((author) => {
        if (!author.pkps) {
          author.pkps = [];
        }
        return author;
      });
    }

    this.authorsTab = new OxOAuthorsTab(this.app, this);
    this.addSettingTab(this.authorsTab);
  }

  async clearSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    await this.saveData(this.settings);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
