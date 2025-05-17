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

// @ts-ignore
const basePath = (app.vault.adapter as any).basePath

export interface IMainController {
    user: IOXOUser,
    basePath: string,
    env: {[key: string]: string | undefined }
    msca: IMSCAService;
    evm: {[key: string]: ISafeService };
    ipfs: IpfsCtrlr,
    lit: any,
    orbis: IOrbisService;
    plugin: OxO,    
    init: () => Promise<void>
    initChains: (chains: string[]) => Promise<void>
    initChain: (chain: string) => Promise<void>
    newAuthor: () => Promise<void>
    toggleAuthor: (user: IOXOUser) => Promise<void>
}

export class MainController implements IMainController { 
    user!: IOXOUser
    basePath: string
    env!: {[key: string]: string | undefined }
    msca!: IMSCAService;;
    evm!: {[key: string]: ISafeService };
    ipfs!: IpfsCtrlr;
    lit!: any;
    pinata!: PinataService;
    orbis!: IOrbisService;
    plugin: OxO

    constructor(plugin: OxO) {
        this.basePath = basePath;
        this.ipfs = ipfsController;
        this.plugin = plugin;
    }

    async init() {

        const activeUser = this.plugin.settings.authors.find( (a: any) => a.active);

        if (activeUser == undefined) {
           this.user = new OXOUser("you can change me", true, undefined, undefined, undefined, undefined, []);
        } else {
            const { name, active, private_key, eoa, msca, safe, pkps} = activeUser;
            this.user = new OXOUser(name, active, private_key, eoa, msca, safe, pkps);
        }

        this.evm = {};
        this.pinata = new PinataService(this);
        this.orbis = new OrbisService(this);
        this.lit = new LitService(this);
        // this.lit.init();    
        this.orbis.initialize("6b985b50294ac9d06b42629931cdb5e0641fda4128ccaafe22beccce859473e3");
    }

    async initChains(chains: string[]) {

        if (!chains.includes("GNOSIS_CHAIN")) {
            chains.push("GNOSIS_CHAIN");
        }

        for (const chain of chains) {
            this.initChain(chain);
        }
    }

    async initChain(chain: string) {

        this.evm[chain] = new SafeService(this, chain);
        await this.evm[chain].setActiveRelay(chain, this.user.eoa);
        this.evm[chain].updateSigner(this.user.private_key);
    }

    async newAuthor(name: string = "you can change me") {

        const user = new OXOUser(name, false, undefined, undefined, undefined, undefined, []);

        for (const chain of Object.keys(this.evm)) {
            this.msca.updateSigner(user.private_key);
            this.evm[chain].updateSigner(user.private_key)
        }

        this.plugin.settings.authors.push(user);
        this.plugin.authorsTab.display();
        this.plugin.saveSettings();
    }

    async toggleAuthor(_user: IOXOUser) {

        this.user = new OXOUser(_user.name, _user.active, _user.private_key, _user.eoa, _user.msca, _user.safe, _user.pkps);

        for (const chain of Object.keys(this.evm)) {
            this.evm[chain].updateSigner(this.user.private_key);
            this.evm[chain].setActiveRelay(chain, this.user.eoa);
        }

        this.lit.init();
    }

    // async mintAuthorPKP(customName?: string): Promise<void> {

    //     try {
            
    //         const mintInfo = await this.lit.mintAuthorPKPFromLocalSigner();
    //         console.log('PKP minted successfully:', mintInfo);
            
    //         const pkpName = customName || `PKP-${this.user.pkps.length + 1}`;
    //         console.log('Adding PKP to user with name:', pkpName);
    //         this.user.addPKP(pkpName, mintInfo.pkp.tokenId, mintInfo.pkp.publicKey);
    //         this.plugin.settings.authors.find( (a: any) => a.name === this.user.name)?.pkps.push({ name: pkpName, tokenId: mintInfo.pkp.tokenId, publicKey: mintInfo.pkp.publicKey });
    //         this.plugin.authorsTab.display();
    //         // Save the updated user data
    //         await this.plugin.saveSettings();
            
    //     } catch (error) {
    //         console.error('Error in PKP minting process:', error);
    //         throw error;
    //     }   
    // }

    // async mintPublicationPKP(customName?: string): Promise<void> {

    //     const publicationContract = "0x1e00a4d85cb0a58b48e3007f0e1d20b6621e78ed";

    //     try {
            
    //         const resourceAbilityRequests = [
    //             {
    //                 resource: {
    //                   "baseUrl": "lit://action",
    //                   "path": "Qmdu5NQkvKLuV5Ui4QE3aGRUVbdau7Wb7caBr3Jzcapk7t"
    //                 },
    //                 ability: LIT_ABILITY.PKPSigning,
    //             },
    //         ];

    //         const mintInfo = await this.lit.mintPKPFromLocalSigner(resourceAbilityRequests);
    //         console.log('PKP minted successfully:', mintInfo);
            
    //         const pkpName = customName || `PKP-${this.user.pkps.length + 1}`;
    //         console.log('Adding PKP to user with name:', pkpName);
    //         this.user.addPKP(pkpName, mintInfo.pkp.tokenId, mintInfo.pkp.publicKey);
    //         this.plugin.settings.authors.find( (a: any) => a.name === this.user.name)?.pkps.push({ name: pkpName, tokenId: mintInfo.pkp.tokenId, publicKey: mintInfo.pkp.publicKey });
    //         this.plugin.authorsTab.display();
    //         // Save the updated user data
    //         await this.plugin.saveSettings();
            
    //     } catch (error) {
    //         console.error('Error in PKP minting process:', error);
    //         throw error;
    //     }
    // }
}
