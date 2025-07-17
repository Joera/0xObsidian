import { ethers } from "ethers";
import { Contract } from "ethers/contract";
import { Wallet } from "ethers/wallet";
import { JsonRpcProvider } from "ethers/providers";
import type { JsonRpcSigner } from "ethers/providers";
import { ACCOUNT_FACTORY_ADDRESS  } from "./constants.js";

// Add type interface for contract artifacts
interface ContractArtifact {
    _format: string;
    contractName: string;
    sourceName: string;
    abi: any[];
    bytecode: string;
    deployedBytecode: string;
}

import ep from '../../contracts/EntryPoint.json' with { type: 'json' };
import af from '../../contracts/AccountFactory.json' with { type: 'json' };
import ac from '../../contracts/ModularAccount.json' with { type: 'json' }; // default from alchemy

// Type assertions for the contract artifacts
const entryPointArtifact = ep as ContractArtifact;
const accountFactoryArtifact = af as ContractArtifact;
const accountArtifact = ac as ContractArtifact;

import { IMainController } from "../main.ctrlr.js";
import { create_init_code, formatUserOp, getUserOperationByHash, sendUserOperation } from "./eth_userop.js";

import { getProvider } from "./provider.factory.js";
import { checkPaymasterBalance, paymasterAddress } from "../paymaster/paymaster.factory.js";
import { getInternalTransactions } from "./eth_utils.js";
import { ENTRYPOINT_ADDRESS } from "src/paymaster/constants.js";

export interface IMSCAService {

    main: IMainController;
    signer: Wallet;
    provider: JsonRpcProvider;
    ensProvider: JsonRpcProvider;
    accountFactory: Contract;
    entrypoint: Contract;
    smartAccount: Contract;
    updateSigner: (pk: string) => void;
    deploySmartAccount: (token: string) => Promise<string>;
    loadSmartAccount: (addr: string) => void;
    logPaymasterBalance: ()  => void;
    genericRead: (address: string, abi: string, method: string, args: string[]) => Promise<any>;
    genericTx: (address: string, abi: string, method: string, args: string[]) => Promise<boolean>;
    deployTroughFactory: (factory_address: string, abi: string, method: string, _args : any) => Promise<string>; 
}
 

export class MSCAService implements IMSCAService {
    
    main: IMainController;
    signer!: Wallet;
    provider!: JsonRpcProvider;
    ensProvider!: JsonRpcProvider;
    accountFactory!: Contract;
    entrypoint!: Contract;
    smartAccount!: Contract;
    msca!: string;

    constructor(main: IMainController) {

        this.main = main;
        this.updateSigner(this.main.user.private_key);
        this.loadContracts();
    }

    updateSigner(pk: string)  {

        this.provider = getProvider("ARB_SEPOLIA", this.main.plugin.settings.alchemy_key)
        let signer = new Wallet(pk);
        this.signer = signer.connect(this.provider)
    }

    async deploySmartAccount (token: string): Promise<string>  {


        // NEED tO TEST AGAIN 

        return new Promise( async (resolve, reject) => {
    
            if (!await checkPaymasterBalance(this.entrypoint, paymasterAddress("ARB_SEPOLIA") || "0x")) reject();
    
            const { initCode, msca } = await create_init_code(this);
            this.loadSmartAccount(msca);
    
            const callData = this.accountFactory.interface.encodeFunctionData("test",[]);
            const target = ACCOUNT_FACTORY_ADDRESS;
            const userOp = await formatUserOp(this, msca, initCode, target, callData, token);
    
            const opHash = await sendUserOperation(
                userOp,
                ENTRYPOINT_ADDRESS,
                token
            );
    
            // console.log(opHash);
    
            const interval = setInterval(async () => {
                
                try {
                    
                    const { transactionHash } = await getUserOperationByHash([opHash], token)
                    console.log(transactionHash);
                    
                    if(transactionHash != null) {
    
                        resolve(msca)
                        clearInterval(interval);
                    } 
                } catch (err) {
                    // console.log("within interval: " + err)
                } 
    
            }, 1000);
    
        });
    }

    loadContracts() {

        this.entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, entryPointArtifact.abi, this.signer);
        this.accountFactory = new ethers.Contract(ACCOUNT_FACTORY_ADDRESS, accountFactoryArtifact.abi, this.signer);
    }

    loadSmartAccount(msca: string) {
        this.msca = msca
        this.smartAccount = new ethers.Contract(msca, accountArtifact.abi, this.signer);
    }

    logPaymasterBalance = async ()  => {

        const balance = await this.entrypoint.balanceOf(paymasterAddress("ARB_SEPOLIA") || "0x");
        console.log("paymaster balance = " + ethers.formatEther(balance))
    }

    async genericRead(address: string, abi: string, method: string, args: string[]) : Promise<any> {

        const contract = new ethers.Contract(address, abi, this.signer);
        return await contract[method](...args);
    }

    async genericTx(address: string, abi: string, method: string, args: string[]) : Promise<boolean> {

        return new Promise( async (resolve, reject) => {

            if (!await checkPaymasterBalance(this.entrypoint, paymasterAddress("ARB_SEPOLIA") || "0x")) reject();
        
            const { initCode, msca } = await create_init_code(this);
            this.loadSmartAccount(msca);

            // console.log(initCode);

            const contract = new ethers.Contract(address, abi, this.signer);
            const callData = contract.interface.encodeFunctionData(method, args);   
            const userOp = await formatUserOp(this, msca, initCode, address, callData, this.main.plugin.settings.alchemy_key  || "x");

            console.log(userOp);
            
            const opHash = await sendUserOperation(
                userOp,
                ENTRYPOINT_ADDRESS,
                this.main.plugin.settings.alchemy_key  || "x"
            );

            console.log("opHash:" + opHash);

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

            // let eth = this.main.eth;

            if (!await checkPaymasterBalance(this.entrypoint, paymasterAddress("ARB_SEPOLIA") || "0x")) reject();
        
            const { initCode, msca } = await create_init_code(this);
            this.loadSmartAccount(msca);

            // add msca for other purposes (publication, pod?)

            const contract = new ethers.Contract(factory_address, abi, this.signer);
            const callData = contract.interface.encodeFunctionData(method,args);   
            const userOp = await formatUserOp(this, msca, initCode, factory_address, callData, this.main.plugin.settings.alchemy_key  || "x");

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
                        const txsinternalResult: any = await getInternalTransactions("ARB_SEPOLIA", transactionHash, this.main.plugin.settings.alchemy_key || "x");

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
