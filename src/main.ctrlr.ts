// import { IMSCAService, MSCAService } from "./eth/msca_service.js";
// import * as dotenv from 'dotenv'
// import { IPod, Pod } from "./pod/pod.js";

// import { ILitService, LitService } from "./lit/lit.service.js";
import OxO from "./main.js";
import { IOXOUser, OXOUser } from "./user/user.js";
import { IpfsCtrlr, ipfsController } from "./ipfs/ipfs.ctrlr.js";
// import { ISafeService, SafeService } from "./eth/safe_service.js";
// import { IOrbisService, OrbisService } from "./orbis/orbis.service.js";
import { PinataService } from "./ipfs/pinata.ctrlr.js";
import { LitService } from "./lit/lit.service.js";
import { LensService } from "./lens/lens.ctrlr.js";
import { IPermissionlessSafeService, PermissionlessSafeService } from "./eth/permissionless.safe.service.js";

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
  newAuthor: () => Promise<void>;
  toggleAuthor: (user: IOXOUser) => Promise<void>;
}

export class MainController implements IMainController {
  user!: IOXOUser;
  basePath: string;
  env!: { [key: string]: string | undefined };
  // msca!: IMSCAService;
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
    const activeUser = this.plugin.settings.authors.find((a: any) => a.active);

    if (activeUser == undefined) {
      this.user = new OXOUser(
        "you can change me",
        true,
        undefined,
        undefined,
        undefined
      );
    } else {
      const { name, active, private_key, eoa, safe } = activeUser;
      this.user = new OXOUser(name, active, private_key, eoa, safe);
    }

    this.account = {};
    this.pinata = new PinataService(this);
    this.lit = new LitService(this);
    this.lens = new LensService(this)
    
    if (!await this.user.checkLensProfile(this)) {
      console.log("hoi, nieuwe lens account")
      this.user.addLensAccount(this)
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
      
      const safe_address = await this.account[chain].connectToFreshSafe([signerAddress], salt);
      
      const deployed = await this.account[chain].isDeployed();
      console.log("is deployed", deployed, chain, safe_address);

      if (!deployed) {
          const deploy = await this.account[chain].valueTx(safe_address, "1");
          console.log("deployed safe to:", chain, deploy);
      }

      // Use the safe_address that was just deployed/connected
      await this.account[chain].connectToExistingSafe(safe_address);

      
  }

  async newAuthor(name: string = "you can change me") {
    const user = new OXOUser(
      name,
      false,
      undefined,
      undefined,
      undefined,
    );

    for (const chain of Object.keys(this.account)) {
      this.account[chain].updateSigner(user.private_key);
    }

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
      this.account[chain].connectToFreshSafe(
        [this.user.eoa],
        "default_safe",
      );
    }

    this.lit.init();
  }

  safeInstance (chain: string) {
  
    return new PermissionlessSafeService(this, chain);
  }
}
