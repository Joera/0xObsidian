import { ENTRYPOINT_ADDRESS, PAYMASTER_ADDRESS, POD_FACTORY_ADDRESS } from "eth_contracts";
import { IEthService } from "eth_service";
import { create_init_code, formatUserOp, getUserOperationByHash, sendUserOperation } from "eth_userop";
import { sendInvite } from "invite";
import { IMainController } from "main.ctrlr";
import { App, Notice, TFile } from "obsidian";

export interface IPod {

    main: IMainController
    path: string 
    file: TFile | null
    initFile: () => Promise<void>
    displayFile: () => Promise<void> 
    deploy: (cid: string) => Promise<string>
    update: (ethService: IEthService, pod_addr: string, cid: string) => Promise<void>
    updateFrontMatter: (key: string, value: string | string[]) => Promise<void>
    readFrontMatter: (key: string) => Promise<string>
    permissions: (ethService: IEthService, p_addr: string) => Promise<{readers: string[], authors: string[]}>
    exists() : Promise<boolean>
    invite(podAddress : string, invitee: string, readPermissions: boolean, writePermissions: boolean, token: string) : Promise<void>
}

export class Pod {

    main: IMainController
    path: string
    file: TFile | null

    constructor(main: IMainController, path: string) {

        this.main = main;
        this.path = path;
    }

    async initFile() {

        const filePath = `${this.path}/_pod.md`;
        let content = ''; 
        
        try {
            const fileExists = await this.main.plugin.app.vault.adapter.exists(filePath);
            if (!fileExists) {
                this.file =  await this.main.plugin.app.vault.create(filePath, content);

                this.displayFile();
        
                if (this.file != null) {
                    await this.main.plugin.app.fileManager.processFrontMatter( this.file, (frontmatter) => {
                        frontmatter["chain_id"] = 421614;
                        frontmatter["contract"] = "";
                        frontmatter["cid"] = "";
                        frontmatter["readers"] = [];
                        frontmatter["authors"] = [];
                        frontmatter["paymaster"] = PAYMASTER_ADDRESS;
                    })
                }
                // new Notice(`${filePath} created successfully.`);
            } else {
                this.file = await this.main.plugin.app.vault.getFileByPath(filePath);
                // new Notice(`${filePath} already exists.`);
            }
        } catch (error) {
            console.error(`Error creating file: ${error}`);
            new Notice(`Failed to create file: ${error.message}`);
        }
    }

    async displayFile()  {

        if (this.file) {
            const leaf = this.main.plugin.app.workspace.getLeaf(false);
            await leaf.openFile(this.file);
        } else {
            new Notice('File not found!');
        }
    }

    async deploy(cid: string) : Promise<string>  {

        return new Promise( async (resolve, reject) => {

            let eth = this.main.eth;

            if (!eth.checkPaymasterBalance()) reject();
        
            const { initCode, msca } = await create_init_code(eth);
            this.main.eth.loadSmartAccount(msca);

            const callData = eth.podFactory.interface.encodeFunctionData("createPod",[msca,cid]);   
            const target = POD_FACTORY_ADDRESS;
            const userOp = await formatUserOp(eth, msca, initCode, target, callData, this.main.env.SEPOLIA_API_KEY || "x");

            // console.log(userOp);

            const opHash = await sendUserOperation(
                userOp,
                ENTRYPOINT_ADDRESS,
                this.main.env.SEPOLIA_API_KEY || "x"
            );

            // console.log("opHash:" + opHash);

            const interval = setInterval(async () => {
                
                try {
                    
                    const { transactionHash } = await getUserOperationByHash([opHash],this.main.env.SEPOLIA_API_KEY || "x");
                    
                    if(transactionHash != null) {
                        const txsinternalResult: any = await eth.getInternalTransactions(transactionHash);
                        if(txsinternalResult.status == '1') {
                            clearInterval(interval);
                            const possibleContracts = txsinternalResult.result.map( (tx: any) => tx.contractAddress)
                            const pod_addr = possibleContracts.filter( (c: string) => c != "");
                            if(pod_addr[0]) {
                                resolve(pod_addr[0]);
                            } else {
                                resolve("xxx");
                            }
                        }
                    } 
                } catch (err) {
                    
                    // console.log("within interval: " + err)
                } 

            }, 2000);

        });
        
    }

    update = async (ethService: IEthService, pod_addr: string, cid: string) : Promise<void> => {

        return new Promise( async (resolve, reject) => {

            let eth = this.main.eth;

            if (!eth.checkPaymasterBalance()) reject();
        
            const { initCode, msca } = await create_init_code(eth);
            this.main.eth.loadSmartAccount(msca);

            const callData = eth.podContract.interface.encodeFunctionData("update",[cid]);   
            const target = pod_addr;
            const userOp = await formatUserOp(eth, msca, initCode, target, callData, this.main.env.SEPOLIA_API_KEY || "");

            // console.log(userOp);

            const opHash = await sendUserOperation(
                userOp,
                ENTRYPOINT_ADDRESS,
                this.main.env.SEPOLIA_API_KEY || ""
            );

            // console.log("opHash:" + opHash);

            const interval = setInterval(async () => {
                
                try {
                    
                    const { transactionHash } = await getUserOperationByHash([opHash],this.main.env.SEPOLIA_API_KEY || "");
                    console.log(transactionHash);
                    if(transactionHash != null) {
                        clearInterval(interval);
                        resolve();
                    } 
                } catch (err) {
                    
                    // console.log("within interval: " + err)
                } 

            }, 2000);

        });
    }

    permissions = async (ethService: IEthService, p_addr: string) => {

        const readers = [];
        const authors = [];

        for (let i = 0; i < 10; i++) {
            try {
                readers.push(await ethService.podContract.readers(i))
            } catch (error) {
                break;
            }
        } 

        for (let i = 0; i < 10; i++) {
            try {
                authors.push(await ethService.podContract.authors(i))
            } catch (error) {
                break;
            }
        } 

        return { readers, authors}
    
    }

    async readFrontMatter(key: string) : Promise<string> {

        return new Promise( async (resolve,reject) => {

            if (this.file != null) {
                await this.main.plugin.app.fileManager.processFrontMatter( this.file, (frontmatter) => {
                    if (frontmatter[key]) {
                        resolve(frontmatter[key])
                    } else {
                        reject()
                    }
                })
            } else {
                reject()
            }
        });
    }

    async updateFrontMatter(key: string, value: string | string[]) {

        if (this.file != null) {
            await this.main.plugin.app.fileManager.processFrontMatter( this.file, (frontmatter) => {
                frontmatter[key] = value;
            })
        }
    }

    // async updateConfig(app: App, path: string, addr: string, readers: string[], authors: string[]) {

    //     const filePath = `${path}/pod.config.md`;
    //     let file = app.vault.getFileByPath(filePath);
    //     if (file != null) {
    //         await app.fileManager.processFrontMatter( file, (frontmatter) => {
    //             frontmatter["contract"] = addr;
    //             frontmatter["readers"] = readers;
    //             frontmatter["authors"] = authors;
    //         })
    //     }
    // }

    async exists() : Promise<boolean> {

        let contract = null;
        if(this.file != null) {
            await this.main.plugin.app.fileManager.processFrontMatter( this.file, (frontmatter) => {
                contract = frontmatter["contract"]
            })
        }
        if (contract != null) {
            // check on chain ?? 
            console.log("a pod exists for this folder")
            return true;
        } 

        return false;

    } 

    async createEncryptionKey() {

    }

    async invite (podAddress : string, invitee: string, readPermissions: boolean, writePermissions: boolean, token: string) {

        if(invitee.endsWith('.eth')) {

            let i = await this.main.eth.ensProvider.resolveName(invitee);
            if (i != null) {
                invitee = i
            }
        }

      

        if(writePermissions) {

            await sendInvite(this.main.eth, "inviteAuthor", podAddress, invitee, token);
        
        } else if (readPermissions) {

            await sendInvite(this.main.eth, "inviteReader", podAddress, invitee, token);
        }
 
    }

    async decrypt()  {

    }
}
