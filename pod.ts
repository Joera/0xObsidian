import { ENTRYPOINT_ADDRESS, PAYMASTER_ADDRESS, POD_FACTORY_ADDRESS } from "eth_contracts";
import { IEthService } from "eth_service";
import { create_init_code, eth_salt, formatUserOp, getUserOperationByHash, sendUserOperation, zeroEth } from "eth_userop";
import { ethers } from "ethers";
import { sendInvite } from "invite";
import { App, Notice } from "obsidian";


export const getPodCid = (path: string) => {

    return "bafkreig6dppfn3ehgidrbmlth6tsimsw3hxqrxqsz4uzfwmws6gfqe65ho";
}

export const createPodContract = (ethService: IEthService, cid: string) : Promise<string> => {

    return new Promise( async (resolve, reject) => {

        if (!ethService.checkPaymasterBalance()) reject();
      
        const { initCode, msca } = await create_init_code(ethService);
        ethService.loadSmartAccount(msca);

        const callData = ethService.podFactory.interface.encodeFunctionData("createPod",[msca,cid]);   
        const target = POD_FACTORY_ADDRESS;
        const userOp = await formatUserOp(ethService, msca, initCode, target, callData);

        // console.log(userOp);

        const opHash = await sendUserOperation(
            userOp,
            ENTRYPOINT_ADDRESS,
        );

        console.log("opHash:" + opHash);

        const interval = setInterval(async () => {
            
            try {
                
                const { transactionHash } = await getUserOperationByHash([opHash]);
                
                if(transactionHash != null) {
                    const txsinternalResult: any = await ethService.getInternalTransactions(transactionHash);
                    if(txsinternalResult.status == '1') {
                        const podAddress = txsinternalResult.results.map( (tx: any) => tx.contractAddress)[0]
                        if(podAddress != undefined) {
                            ethService.loadPod(podAddress);
                            resolve(podAddress);
                            clearInterval(interval);
                        } else {
                            console.log("no contract was created");
                        }
                    }
                } 
            } catch (err) {
                console.log("within interval: " + err)
            } 

        }, 2000);

    });
    
}

export const readPodContractPermissions = async (ethService: IEthService, p_addr: string) => {

    ethService.loadPod(p_addr);
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


export const insertConfig = async (app: App, path: string, cid: string) => {

    const filePath = `${path}/pod.config.md`;

    let content = ''; 
    
    try {
        const fileExists = await app.vault.adapter.exists(filePath);
        if (!fileExists) {
            await app.vault.create(filePath, content);
            new Notice(`${filePath} created successfully.`);
        } else {
            new Notice(`${filePath} already exists.`);
        }
    } catch (error) {
        console.error(`Error creating file: ${error}`);
        new Notice(`Failed to create file: ${error.message}`);
    }

    let file = app.vault.getFileByPath(filePath);

   // const file = this.app.vault.getAbstractFileByPath(filePath);

    if (file) {
        const leaf = app.workspace.getLeaf(false);
        await leaf.openFile(file);
    } else {
        new Notice('File not found!');
    }

    if (file != null) {
        await app.fileManager.processFrontMatter( file, (frontmatter) => {
            frontmatter["chain_id"] = 421614;
            frontmatter["contract"] = "";
            frontmatter["cid"] = cid;
            frontmatter["readers"] = [];
            frontmatter["authors"] = [];
            frontmatter["paymaster"] = PAYMASTER_ADDRESS;
        })
    }
}

export const updateConfig = async (app: App, path: string, addr: string, readers: string[], authors: string[]) => {

    const filePath = `${path}/pod.config.md`;
    let file = app.vault.getFileByPath(filePath);
    if (file != null) {
        await app.fileManager.processFrontMatter( file, (frontmatter) => {
            frontmatter["contract"] = addr;
            frontmatter["readers"] = readers;
            frontmatter["authors"] = authors;
        })
    }
}

export const contractExists = async (app: App, path: string) => {

    let contract = null;
    const filePath = `${path}/pod.config.md`;
    let file = app.vault.getFileByPath(filePath);
    if (file != null) {
        await app.fileManager.processFrontMatter( file, (frontmatter) => {
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


export const listenToInvites = (ethService: IEthService) => {

    let t = ethers.id("PodInvite(address, address, address)");
    // duuno why the topic hash it not the same ???????? 
    console.log(t);

    const filter = {
        topics: [
            // using the one from contract logs on etherscan 
            "0x9869203779433091b9033c50a09cb80d8b9123be346b41ff4efe82d2b2d898d7"
            //ethers.id("PodInvite(address, address, address)")
        ]
    };

    ethService.listen(filter)

}

export const createEncryptionKey = () => {

}

export const inviteToPod = async (app: App, ethService: IEthService, path: string, invitee: string, readPermissions: boolean, writePermissions: boolean) => {

    let podAddress = null;
    const filePath = `${path}/pod.config.md`;
    let file = app.vault.getFileByPath(filePath);
    if (file != null) {
        await app.fileManager.processFrontMatter( file, (frontmatter) => {
            podAddress = frontmatter["contract"]
        })
    }

    if (podAddress != null) {

        ethService.loadPod(podAddress);

        // console.log({invitee, readPermissions, writePermissions});

        if(invitee.endsWith('.eth')) {

            let i = await ethService.provider.resolveName(invitee);
            if (i != null) {
                invitee = i
            }
        }

        if(writePermissions) {

            sendInvite(ethService, "inviteAuthors", podAddress, invitee);
        }
    }
}

export const decrypt = () => {

}

export const update = () => {

}



