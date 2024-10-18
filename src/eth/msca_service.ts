import { ethers, Signer, Provider, Contract, Wallet } from "ethers";
import { ACCOUNT_FACTORY_ADDRESS, ENTRYPOINT_ADDRESS, PAYMASTER_ADDRESS } from "./eth_contracts";

import * as ep from '../../contracts/EntryPoint.json';
import * as af from '../../contracts/AccountFactory.json'; // default from alchemy
import * as ac from '../../contracts/ModularAccount.json'; // default from alchemy

import { IMainController } from "../main.ctrlr";
import { create_init_code, formatUserOp, getUserOperationByHash, sendUserOperation } from "./eth_userop";

import { getProvider } from "./provider.factory";
import { checkPaymasterBalance } from "./paymaster.factory";

export interface IMSCAService {

    signer: Signer;
    provider: Provider;
    ensProvider: Provider;
    accountFactory: Contract;
    entrypoint: Contract;
    smartAccount: Contract;
    updateSigner: (pk: string) => void;
    loadSmartAccount: (addr: string) => void;
    genericRead: (address: string, abi: string, method: string, args: string[]) => Promise<any>;
    genericTx: (address: string, abi: string, method: string, args: string[]) => Promise<boolean>;
    deployTroughFactory: (factory_address: string, abi: string, method: string, _args : any) => Promise<string>; 
}
 

export class MSCAService implements IMSCAService {
    
    main: IMainController;
    signer: Signer;
    provider: Provider;
    ensProvider: Provider;
    baseProvider: Provider;
    accountFactory: Contract;
    entrypoint: Contract;
    smartAccount: Contract;

    msca: string;

    constructor(main: IMainController) {

        this.main = main;
        this.updateSigner(this.main.author.private_key);
    }

    updateSigner(pk: string)  {

        let signer = new Wallet(pk);
        this.signer = signer.connect(getProvider("ARB_SEPOLIA", this.main.plugin.settings.alchemy_key))
    }

    loadContracts() {

        this.entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ep.abi, this.signer);
        this.accountFactory = new ethers.Contract(ACCOUNT_FACTORY_ADDRESS, af.abi, this.signer);
    }

    loadSmartAccount(msca: string) {
        this.msca = msca
        this.smartAccount = new ethers.Contract(msca, ac.abi, this.signer);
    }

    async genericRead(address: string, abi: string, method: string, args: string[]) : Promise<any> {

        const contract = new ethers.Contract(address, abi, this.signer);
        return await contract[method](...args);
    }

    async genericTx(address: string, abi: string, method: string, args: string[]) : Promise<boolean> {

        return new Promise( async (resolve, reject) => {

            if (!await checkPaymasterBalance(this.entrypoint, PAYMASTER_ADDRESS)) reject();
        
            const { initCode, msca } = await create_init_code(this);
            this.main.eth.loadSmartAccount(msca);

            const contract = new ethers.Contract(address, abi, this.signer);
            const callData = contract.interface.encodeFunctionData(method, args);   
            const userOp = await formatUserOp(this, msca, initCode, address, callData, this.main.plugin.settings.alchemy_key  || "x");

            const opHash = await sendUserOperation(
                userOp,
                ENTRYPOINT_ADDRESS,
                this.main.plugin.settings.alchemy_key  || "x"
            );

            // console.log("opHash:" + opHash);

            const interval = setInterval(async () => {
                
                try {
                    
                    const { transactionHash } = await getUserOperationByHash([opHash], this.main.plugin.settings.alchemy_key || "x");

                    if(transactionHash != null) {
                        clearInterval(interval);
                        console.log('tx: ' + transactionHash);
                        resolve(true);
                    } 

                } catch (err) {
                    reject()
                } 

            }, 2000);

        });
    }



    async deployTroughFactory(factory_address: string, abi: string, method: string, args : any[]) : Promise<string>  {

        return new Promise( async (resolve, reject) => {

            let eth = this.main.eth;

            if (!eth.checkPaymasterBalance()) reject();
        
            const { initCode, msca } = await create_init_code(eth);
            this.main.eth.loadSmartAccount(msca);

            // add msca for other purposes (publication, pod?)

            const contract = new ethers.Contract(factory_address, abi, this.signer);
            const callData = contract.interface.encodeFunctionData(method,args);   
            const userOp = await formatUserOp(eth, msca, initCode, factory_address, callData, this.main.plugin.settings.alchemy_key  || "x");

            // console.log(userOp);

            const opHash = await sendUserOperation(
                userOp,
                ENTRYPOINT_ADDRESS,
                this.main.plugin.settings.alchemy_key  || "x"
            );

            // console.log("opHash:" + opHash);

            const interval = setInterval(async () => {
                
                try {
                    
                    const { transactionHash } = await getUserOperationByHash([opHash], this.main.plugin.settings.alchemy_key || "x");
                    
                    if(transactionHash != null) {
                        console.log(transactionHash);
                        const txsinternalResult: any = await eth.getInternalTransactions(transactionHash);

                        console.log(txsinternalResult)
                        if(txsinternalResult.status == '1') {
                            clearInterval(interval);
                            const possibleContracts = txsinternalResult.result.map( (tx: any) => tx.contractAddress)
                            const c_addr = possibleContracts.filter( (c: string) => c != "");
                            if(c_addr[0]) {
                                console.log('dus:' + c_addr[0]);
                                resolve(c_addr[0]);
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


}

