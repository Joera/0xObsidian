import { EthService, IEthService } from "./eth/eth_service";
import * as dotenv from 'dotenv'
import { IPod, Pod } from "./pod";
import { DotSpinner } from "./ui/spinner.service";
import { Notice } from "obsidian";
import { uploadDir } from "./ipfs/remotekubo.service";
import { importAndMerge } from "./import";
import { ILitService, LitService } from "./lit/lit.service";
import OxO from "./main";
import { Author, IAuthor } from "./author/author";

const basePath = (app.vault.adapter as any).basePath

dotenv.config({
	path: `${basePath}/.obsidian/plugins/0xObsidian/.env`,
	debug: false
})

export interface IMainController {
    basePath: string,
    plugin: OxO,
    eth: IEthService,
    env: {[key: string]: string | undefined }
    pods: {[key: string]: IPod }
    author: IAuthor
    newAuthor: () => Promise<void>
    toggleAuthor: (author: IAuthor) => Promise<void>
    newPod: (path: string) => Promise<void>
    updatePod: (path: string) => Promise<void>
    inviteToPod: (path: string, invitee: string, read: boolean, write: boolean) => Promise<void>
    import: (contract: string, name: string) => Promise<void>
    upload: (sourcePath: string) => Promise<string>
}

export class MainController implements IMainController { 
    basePath: string
    plugin: OxO
    eth: IEthService;
    lit: ILitService;
    env: {[key: string]: string | undefined }
    pods: {[key: string]: IPod } = {}
    author: IAuthor

    constructor(plugin: OxO) {
        this.basePath = basePath;
        this.plugin = plugin;
        this.env = process.env

        this.init();
    }

    init() {

        const author = this.plugin.settings.authors.find( a => a.active);

        if (author == undefined) {
           this.author = new Author("you can change me", true, undefined, undefined, undefined);
        } else {
            this.author = author;
        }

        this.eth = new EthService(this);
        this.lit = new LitService(this);

        this.eth.updateSigner(this.author.private_key)
      

        this.eth.logPaymasterBalance();

    }

    async newAuthor(name: string = "you can change me") {

        const author = new Author(name, false, undefined, undefined, undefined);
        this.eth.updateSigner(author.private_key);
        if (author.msca == undefined) {
            await author.deploy(this) 
        }
        this.plugin.settings.authors.push(author);
        this.plugin.authorsTab.display();
        this.plugin.saveSettings();
    }

    async toggleAuthor(_author: IAuthor) {

        this.author = new Author(_author.name, _author.active, _author.private_key, _author.msca, _author.profile)

        if(this.author.msca == undefined ) {
            this.eth.updateSigner(this.author.private_key);
            await this.author.deploy(this) 
        }

        if(this.author.active) {
            this.eth.updateSigner(this.author.private_key);
        } 

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

    async import(pod_addr: string, name: string) {

     //   const name = "basedam"; // add to contract 

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

    async upload(sourcePath: string) {

        return await uploadDir(sourcePath);
    }
}




