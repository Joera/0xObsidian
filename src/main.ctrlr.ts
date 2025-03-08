import {IMSCAService, MSCAService } from "./eth/msca_service.js";
// import * as dotenv from 'dotenv'
// import { IPod, Pod } from "./pod/pod.js";

// import { ILitService, LitService } from "./lit/lit.service.js";
import OxO from "./main.js";
import { IOXOUser, OXOUser } from "./user/user.js";
import { IpfsCtrlr, ipfsController } from "./ipfs/ipfs.ctrlr.js";
import { ISafeService, SafeService } from "./eth/safe_service.js";
import { IOrbisService, OrbisService } from "./orbis/orbis.service.js";
import { PinataService } from "./ipfs/pinata.ctrlr.js";
import { LitService } from "./lit/lit.service.js"
import { AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE, LIT_ABILITY } from '@lit-protocol/constants';
import { LitActionResource } from "@lit-protocol/auth-helpers";
// import { IPodService, PodService } from "./pod/pod.service.js";

const basePath = (app.vault.adapter as any).basePath

// dotenv.config({
// 	path: `${basePath}/.obsidian/plugins/0xObsidian/.env`,
// 	debug: false
// })

export interface IMainController {
    user: IOXOUser,
    basePath: string,
    env: {[key: string]: string | undefined }
    msca: IMSCAService;
    safe: ISafeService;
    // pod: IPodService;
    ipfs: IpfsCtrlr,
    lit: any,
    orbis: IOrbisService;
    plugin: OxO,    
    // pods: {[key: string]: IPod }
    init: () => Promise<void>
    newAuthor: () => Promise<void>
    toggleAuthor: (user: IOXOUser) => Promise<void>
    mintPKP: (customName?: string) => Promise<void>
}

export class MainController implements IMainController { 
    user!: IOXOUser
    basePath: string
    env!: {[key: string]: string | undefined }
    msca!: IMSCAService;;
    safe!: ISafeService;
    ipfs!: IpfsCtrlr;
    lit!: any;
    pinata!: PinataService;
    // lit!: ILitService;
    orbis!: IOrbisService;
    plugin: OxO
    // pods: {[key: string]: IPod } = {}

    constructor(plugin: OxO) {
        this.basePath = basePath;
        this.ipfs = ipfsController;
        this.plugin = plugin;

        // this.init();
    }

    async init() {

        const activeUser = this.plugin.settings.authors.find( (a: any) => a.active);

        if (activeUser == undefined) {
           this.user = new OXOUser("you can change me", true, undefined, undefined, undefined, undefined);
        } else {
            const { name, active, private_key, eoa, msca, safe} = activeUser;
            this.user = new OXOUser(name, active, private_key, eoa, msca, safe);
        }

        this.pinata = new PinataService(this);
        this.msca = new MSCAService(this);
        this.safe = new SafeService(this);
        this.orbis = new OrbisService(this);
        this.lit = new LitService(this);
    
        await this.safe.setActiveRelay('BASE_SEPOLIA', this.user.eoa);

      //  this.lit = new LitService(this);

        this.msca.updateSigner(this.user.private_key)
        // this.msca.logPaymasterBalance();
        this.safe.updateSigner(this.user.private_key)
        // console.log(this.user); 
        this.orbis.initialize("6b985b50294ac9d06b42629931cdb5e0641fda4128ccaafe22beccce859473e3");

        // if (this.user.safe == undefined) {
        //     // this.safe.addOwner("BASE_SEPOLIA");
        //     this.user.deploySafe(this,"BASE_SEPOLIA");
        // }
    }

    async newAuthor(name: string = "you can change me") {

        const user = new OXOUser(name, false, undefined, undefined, undefined, undefined);
        this.msca.updateSigner(user.private_key);
        this.safe.updateSigner(user.private_key);

        // if (user.msca == undefined) {
        //     await user.deployMSCA(this) 
        // }

        if (user.safe == undefined) {
           
            // await user.deploySafe(this, "BASE_SEPOLIA"); 
        }

        this.plugin.settings.authors.push(user);
        this.plugin.authorsTab.display();
        this.plugin.saveSettings();
    }

    async toggleAuthor(_user: IOXOUser) {

        this.user = new OXOUser(_user.name, _user.active, _user.private_key, _user.eoa, _user.msca, _user.safe);

        // if(this.user.msca == undefined ) {
        //     this.msca.updateSigner(this.user.private_key);
        //     await this.user.deployMSCA(this) 
        // }

        if(this.user.active) {
            this.safe.updateSigner(this.user.private_key);
            this.safe.setActiveRelay('BASE_SEPOLIA', this.user.eoa);
        } 
    }

    async mintPKP(customName?: string): Promise<void> {
        try {
            console.log('Starting PKP minting process...');
            console.log('Safe address:', await this.safe.address);

            // Get auth signature without any specific abilities for minting
            console.log('Getting auth signature...');
            const mintInfo = await this.lit.mintPKP();
            console.log('PKP minted successfully:', mintInfo);
            
            // Add PKP to user with custom name or default
            const pkpName = customName || `PKP-${this.user.pkps.length + 1}`;
            console.log('Adding PKP to user with name:', pkpName);
            this.user.addPKP(pkpName, mintInfo.pkp.tokenId, mintInfo.pkp.publicKey);

            // Save the updated user data
            await this.plugin.saveSettings();
            
        } catch (error) {
            console.error('Error in PKP minting process:', error);
            throw error;
        }
    }
}
