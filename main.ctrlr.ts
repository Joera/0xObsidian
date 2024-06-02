import { createSmartAccount, generatePK } from "author";
import { EthService, IEthService } from "eth_service";
import SMACC from "main";
import * as dotenv from 'dotenv'
import { IPod, Pod } from "pod";
import { DotSpinner } from "spinner.service";
import { Notice, TFile } from "obsidian";
import { ethers } from "ethers";
import { fetchDir, uploadDir } from "remotekubo.service";
// import tar from 'tar';
import { Tarball } from '@obsidize/tar-browserify'; 
import { importAndMerge } from "import";
import { ILitService, LitService } from "lit.service";

const basePath = (app.vault.adapter as any).basePath

dotenv.config({
	path: `${basePath}/.obsidian/plugins/whatsupdoc/.env`,
	debug: false
})

export interface IMainController {
    basePath: string,
    plugin: SMACC,
    eth: IEthService,
    env: {[key: string]: string | undefined }
    pods: {[key: string]: IPod }
    newAuthor: () => Promise<void>
    newPod: (path: string) => Promise<void>
    updatePod: (path: string) => Promise<void>
    inviteToPod: (path: string, invitee: string, read: boolean, write: boolean) => Promise<void>
    import: (contract: string) => Promise<void>
}

export class MainController implements IMainController { 
    basePath: string
    plugin: SMACC
    eth: IEthService;
    lit: ILitService;
    env: {[key: string]: string | undefined }
    pods: {[key: string]: IPod } = {}

    constructor(plugin: SMACC) {
        this.basePath = basePath;
        this.plugin = plugin;
        this.env = process.env
        this.init();
    }

    async init() {

        if (this.plugin.settings.author_pk == "") {
            this.plugin.settings.author_pk = generatePK();
            this.plugin.settingTab.display();
        }
    
        this.eth = new EthService(this);
        this.lit = new LitService(this)

        if (this.plugin.settings.msca == "") {
            this.plugin.settings.msca = await createSmartAccount(this.eth, this.env.SEPOLIA_API_KEY || 'x');
            this.plugin.settingTab.display();
        }

        // if (this.plugin.settings.msca != "") {

        //     // 0x4729d7061db66Bc8EDe9d7eB5c71c5fd0a47749c
        //     const ensName = await this.eth.ensProvider.lookupAddress(await ethers.getAddress(this.plugin.settings.msca));
        //     // console.log(ensName);
        //     if (ensName != null) {
        //         this.plugin.settings.ens_name = ensName;
        //         this.plugin.settingTab.display();
        //     }
        // }

    }

    async newAuthor() {
        this.plugin.clearSettings();
        this.plugin.settings.author_pk = generatePK();
        this.plugin.settings.msca = "";
        this.eth.updateSigner(this.plugin.settings.author_pk);
        this.plugin.saveSettings();
        this.plugin.settingTab.display();
        const msca = await createSmartAccount(this.eth, this.env.SEPOLIA_API_KEY || 'x');
        console.log(msca);
        this.plugin.settings.msca = msca;
        this.plugin.settingTab.display();
        this.plugin.saveSettings();
    }

    async newPod(path: string) {

        function generateRandomString(length: number ) {
            return [...Array(length)].map(() => Math.random().toString(36)[2]).join('');
        }

        let pod = this.pods[path] = new Pod(this, path);
        if (await pod.exists()) return;
        await pod.initFile();
        pod.displayFile()
        const spinner = new DotSpinner(this.plugin.app, path);

        const pod_addr = await pod.deploy(generateRandomString(32), path);
        spinner.stop();
        this.eth.loadPod(pod_addr);
        await pod.updateFrontMatter("contract", pod_addr);
        await this.lit.createAccessFile(path, pod_addr);
        const cid = await uploadDir(this.basePath + '/' + path);
        await pod.update(this.eth, pod_addr, cid);
        await pod.updateFrontMatter("cid", cid);
        console.log(`new pod for folder ${path} created at: ${pod_addr}`);
        const { readers, authors } = await pod.permissions(this.eth, pod_addr);
        await pod.updateFrontMatter("readers", readers);
        await pod.updateFrontMatter("authors", authors);

       
    }
    
    async updatePod(path: string) {

        let pod;
        if (this.pods[path] == undefined) {
             pod = this.pods[path] = new Pod(this, path);
             await pod.initFile();
        } else {
            pod = this.pods[path]
        }

        let pod_addr = await pod.readFrontMatter("contract")
        if(pod_addr == "") {
            new Notice("no contract address specified in your pod config file");
            return;
        }
        this.eth.loadPod(pod_addr);
        const { readers, authors } = await pod.permissions(this.eth, pod_addr);
        await pod.updateFrontMatter("readers", readers);
        await pod.updateFrontMatter("authors", authors);
   
        const newCid = await uploadDir(this.basePath + '/' + path);
        console.log(newCid);
        if (newCid != await pod.readFrontMatter("cid")) {
            await pod.update(this.eth,pod_addr, newCid);
            await pod.updateFrontMatter("cid", newCid);
        } else {
            new Notice("there are no changes to update");
        }
    }

    async inviteToPod(path: string, invitee: string, read: boolean, write: boolean) {

        let pod;
        if (this.pods[path] == undefined) {
             pod = this.pods[path] = new Pod(this, path);
             await pod.initFile();
        } else {
            pod = this.pods[path]
        }

        let pod_addr = await pod.readFrontMatter("contract")
        if(pod_addr == "") {
            new Notice("no contract address specified in your pod config file");
            return;
        }

        this.eth.loadPod(pod_addr);
        await pod.invite(pod_addr, invitee, read, write, this.env.SEPOLIA_API_KEY || "x");
        const { readers, authors } = await pod.permissions(this.eth, pod_addr);
        await pod.updateFrontMatter("readers", readers);
        await pod.updateFrontMatter("authors", authors);
    }

    async import(pod_addr: string) {

        const name = "hackfs"; // add to contract 

        this.eth.loadPod(pod_addr);
        const cid = await this.eth.podContract.cid();
        const reader_0 = await this.eth.podContract.readers(0);

        await this.lit.readAccessFile(name);

        let success = await importAndMerge(this, cid, name);

        if (success) {
            let pod = this.pods[name] = new Pod(this, name);
            if (await pod.exists()) return;
            await pod.initFile();
            await pod.updateFrontMatter("cid", cid);
            await pod.updateFrontMatter("contract", pod_addr);
            const { readers, authors } = await pod.permissions(this.eth, pod_addr);
            await pod.updateFrontMatter("readers", readers);
            await pod.updateFrontMatter("authors", authors);
        }

    }
}




