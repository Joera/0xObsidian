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
    fixThumbnails: (markdownDir: string, imageBaseDir: string, maxFiles?: number) => Promise<void>
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

        if (activeUser != undefined && activeUser.safe != undefined) {
            this.orbis.initialize(activeUser.private_key, activeUser.safe);
        }
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

    /**
     * Fix thumbnails by uploading them to Pinata and updating frontmatter
     * @param markdownDir Directory containing markdown files
     * @param imageBaseDir Base directory for images
     * @param maxFiles Maximum number of files to process (default: 1)
     */
    /**
     * Fix thumbnails by uploading them to Pinata and updating frontmatter
     * @param markdownDir Directory containing markdown files
     * @param imageBaseDir Base directory for images
     * @param maxFiles Maximum number of files to process (default: 1)
     */
    async fixThumbnails(markdownDir: string, imageBaseDir: string, maxFiles: number = 1): Promise<void> {
        try {
            // We're in Electron environment, can use Node modules directly
            const fs = require('fs');
            const path = require('path');
            
            // Get all markdown files
            let fullMarkdownDir = markdownDir;
            if (!markdownDir.startsWith('/')) {
                fullMarkdownDir = `${this.basePath}/${markdownDir}`;
            }
            
            // Read directory and filter markdown files
            const files = fs.readdirSync(fullMarkdownDir);
            const mdFiles = files
                .filter(file => file.endsWith('.md'))
                .map(file => path.join(fullMarkdownDir, file))
                .slice(0, maxFiles);
            
            console.log(`Found ${mdFiles.length} files to process`);
            
            for (const filePath of mdFiles) {
                const filename = path.basename(filePath);
                console.log(`Processing file: ${filename}`);
                
                // Read the file content
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Extract frontmatter
                const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
                const match = content.match(frontmatterRegex);
                
                if (!match) {
                    console.log(`No frontmatter found in ${filename}`);
                    continue;
                }
                
                // Parse frontmatter lines
                const frontmatterLines = match[1].split('\n');
                const frontmatter: Record<string, any> = {};
                
                for (const line of frontmatterLines) {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex !== -1) {
                        const key = line.substring(0, colonIndex).trim();
                        const value = line.substring(colonIndex + 1).trim();
                        frontmatter[key] = value;
                    }
                }
                
                // Check if thumbnail exists in frontmatter
                if (frontmatter.thumbnail) {
                    console.log(`Found thumbnail: ${frontmatter.thumbnail}`);
                    
                    // Construct full path to the thumbnail image
                    let thumbnailPath = frontmatter.thumbnail;
                    if (!thumbnailPath.startsWith('/')) {
                        thumbnailPath = path.join(imageBaseDir, frontmatter.thumbnail);
                    }
                    console.log(`Full thumbnail path: ${thumbnailPath}`);
                    
                    // Check if the file exists
                    if (fs.existsSync(thumbnailPath)) {
                        // Upload to Pinata
                        console.log('Uploading to Pinata...');
                        const cid = await this.pinata.uploadFileFromPath(thumbnailPath, false);
                        console.log(`Uploaded to IPFS, CID: ${cid}`);
                        
                        // Update frontmatter with new CID
                        frontmatter.thumbnail = cid;
                        
                        // Reconstruct frontmatter
                        let updatedFrontmatter = '---\n';
                        for (const [key, value] of Object.entries(frontmatter)) {
                            updatedFrontmatter += `${key}: ${value}\n`;
                        }
                        updatedFrontmatter += '---';
                        
                        // Update the file content
                        const updatedContent = content.replace(frontmatterRegex, updatedFrontmatter);
                        
                        // Write back to the file
                        fs.writeFileSync(filePath, updatedContent, 'utf8');
                        console.log(`Updated thumbnail in ${filename} to CID: ${cid}`);
                    } else {
                        console.error(`Thumbnail file not found: ${thumbnailPath}`);
                    }
                } else {
                    console.log(`No thumbnail found in ${filename}`);
                }
            }
            
            console.log('Done processing files');
        } catch (error) {
            console.error('Error fixing thumbnails:', error);
            throw error;
        }
    }
}
