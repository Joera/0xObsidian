import OxO from "./main.js";
import { IOXOUser, OXOUser } from "./user/user.js";
import { IpfsCtrlr, ipfsController } from "./ipfs/ipfs.ctrlr.js";;
import { PinataService } from "./ipfs/pinata.ctrlr.js";
import { LitService } from "./lit/lit.service.js";
import { LensService } from "./lens/lens.ctrlr.js";
import { IPermissionlessSafeService, PermissionlessSafeService } from "./eth/permissionless.safe.service.js";
import { Notice } from "obsidian";
import { AuthorModal } from "./user/author.modal.js";

// @ts-ignore
const basePath = (app.vault.adapter as any).basePath;

export interface IMainController {
  user: IOXOUser;
  basePath: string;
  env: { [key: string]: string | undefined };
  account: { [key: string]: IPermissionlessSafeService }; 
  safeInstance: any;
  ipfs: IpfsCtrlr;
  lit: any;
  lens: any;
  plugin: OxO;
  init: () => Promise<void>;
  initChains: (chains: string[]) => Promise<void>;
  initChain: (chain: string) => Promise<void>;
  newAuthor: (name: string, type: string) => Promise<void>;
  toggleAuthor: (user: IOXOUser) => Promise<void>;
}

export class MainController implements IMainController {
  user!: IOXOUser;
  basePath: string;
  env!: { [key: string]: string | undefined };
  account!: { [key: string]: IPermissionlessSafeService };
  ipfs!: IpfsCtrlr;
  lit!: any;
  lens: any;
  pinata!: PinataService;
  plugin: OxO;

  constructor(plugin: OxO) {
    this.basePath = basePath;
    this.ipfs = ipfsController;
    this.plugin = plugin;
  }

  async init() {

    this.account = {};
    this.pinata = new PinataService(this);
    this.lit = new LitService(this);
    this.lens = new LensService(this)

    const activeUser = this.plugin.settings.authors.find((a: any) => a.active);

    if (activeUser == undefined) {

      new Notice("no active user", 3000)

      const onSubmit = async (name: string, type: string) => {
        await this.plugin.ctrlr.newAuthor(name, type);
      }
      return new AuthorModal(this.plugin.app, this, onSubmit).open();

    } else {
      const { name, active, private_key, eoa, safe } = activeUser;
      this.user = new OXOUser(name, active, private_key, eoa, safe);

      if (!await this.user.checkLensProfile(this)) {
        console.log("hoi, nieuwe lens account")
        this.user.addLensAccount(this)
      }
    }
  }

  async initChains(chains: string[]) {
    for (const chain of chains) {
      this.initChain(chain);
    }
  }

  async initChain(chain: string) {

      const salt = "default_safe";

      this.account[chain] = new PermissionlessSafeService(this, chain);
      const signerAddress = await this.account[chain].updateSigner(this.user.private_key);
      
      const safe_address = await this.account[chain].connectToFreshSafe(salt);
      
      const deployed = await this.account[chain].isDeployed();
      // console.log("is deployed", deployed, chain, safe_address);

      if (!deployed) {
          const deploy = await this.account[chain].valueTx(safe_address, "1");
          console.log("deployed safe to:", chain, deploy);
      }

      // Use the safe_address that was just deployed/connected
      await this.account[chain].connectToExistingSafe(safe_address);
  }

  async newAuthor(name: string, type: string) {
    const user = new OXOUser(
      name,
      true,
      undefined,
      undefined,
      undefined,
    );

    for (const chain of Object.keys(this.account)) {
      this.account[chain].updateSigner(user.private_key);
    }

    user.safe = await this.account[Object.keys(this.account)[0]].connectToFreshSafe("default_safe")

    this.plugin.settings.authors.push(user);
    this.plugin.authorsTab.display();
    this.plugin.saveSettings();
  }

  async toggleAuthor(_user: IOXOUser) {
    this.user = new OXOUser(
      _user.name,
      _user.active,
      _user.private_key,
      _user.eoa,
      _user.safe,
    );

    // not checked
    for (const chain of Object.keys(this.account)) {
      this.account[chain].updateSigner(this.user.private_key);
      this.account[chain].connectToFreshSafe("default_safe");
    }

    this.lit.init();
  }

  safeInstance (chain: string) {
  
    return new PermissionlessSafeService(this, chain);
  }
}
