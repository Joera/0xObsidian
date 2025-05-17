import { ethers } from "ethers";
import { Contract } from "ethers/contract";
import { Wallet } from "ethers/wallet";
import { JsonRpcProvider } from "ethers/providers";
import type { JsonRpcSigner } from "ethers/providers";
import { IMainController } from "../main.ctrlr.js";

import { Safe4337Pack } from '@safe-global/relay-kit'

import { getProvider, getRPC } from "./provider.factory.js";
import { SAFE_IMPLEMENTATION_ABI } from "./safe_implementation.abi.js";
import { userOp } from "../paymaster/userop.factory.js";
import { sendTx } from "./tx.factory.js";
import { SAFE_FACTORY_ABI } from "./safe_factory.abi.js";

export interface ISafeService {

    main: IMainController;
    signer: JsonRpcSigner;
    relay: Safe4337Pack;
    provider: JsonRpcProvider;
    safe: any;
    factory: any;
    entrypoint: Contract;
    address: string;
    updateSigner: (pk: string) => void;
    setActiveRelay: (chain: string, eoa: string) => void;
    setRelay: (chain: string, eoa: string) => Promise<Safe4337Pack>;
    getAddress: (chain: string, eoa: string) => Promise<string>;
    genericRead: (address: string, abi: string, method: string, args: string[]) => Promise<any>;
    genericTx(address: string, abi: string, method: string, args: string[], includesDeploy: boolean) : Promise<string>;
}
 

// // on base sepolia 
// const SAFE_FACTORY = "0x4e1DCf7AD4e460CfD30791CCC4F9C8a4f820ec67";
// const SAFE_IMPLEMENTATION = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762";
// const BASE_SEPOLIA_CHAIN = "534351";

export class SafeService implements ISafeService {
    
    main: IMainController;
    signer!: JsonRpcSigner;
    relay!: Safe4337Pack;
    provider: JsonRpcProvider;
    safe: any;
    factory: any;
    entrypoint!: ethers.Contract;
    address!: string;

    constructor(main: IMainController, chain: string = 'BASE_SEPOLIA', testProvider?: JsonRpcProvider) {

        this.main = main;
        this.provider = testProvider || getProvider(chain, this.main.plugin.settings.alchemy_key);
        this.updateSigner(this.main.user.private_key);
    }
    
    async updateSigner(pk: string, chain: string = 'BASE_SEPOLIA') { 

        let signer = new ethers.Wallet(pk);
        this.signer = signer.connect(this.provider);
    }

    async setActiveRelay(chain: string, eoa: string) {

        this.relay = await this.setRelay(chain, eoa);
        this.address = await this.relay.protocolKit.getAddress();
        console.log('active safe: ' + this.address);
    }

    async setRelay(chain: string, eoa: string) {
        
        const rpc = getRPC(chain, this.main.plugin.settings.alchemy_key);
        const saltNonce = ethers.toBeHex(ethers.keccak256(ethers.toUtf8Bytes('default_safe_' + eoa)));
        let chain_id = 0;
        
        switch (chain) {
            case 'SEPOLIA':
                chain_id = 11155111;
                break;
            case 'BASE_SEPOLIA':
                chain_id = 84532;
                break;
            case 'GNOSIS_CHAIN':
                chain_id = 100;
                break;
        }

        return await Safe4337Pack.init({
            provider: rpc,
            signer: this.main.user.private_key,
            bundlerUrl: `https://api.pimlico.io/v2/${chain_id}/rpc?apikey=${this.main.plugin.settings.pimlico_key}`,
            options: {
                owners: [eoa],
                threshold: 1,
                saltNonce
            },
            paymasterOptions: { 
               isSponsored: true,
               paymasterUrl: `https://api.pimlico.io/v2/${chain_id}/rpc?apikey=${this.main.plugin.settings.pimlico_key}`,
            }
        }); 
    }

    async genericRead(address: string, abi: string, method: string, args: string[]) : Promise<any> {

        // console.log("address: " + address);
        // console.log("method: " + method);
        // console.log("args: " + args);

        const contract = new ethers.Contract(address, abi, this.signer);
        
        let retries = 3;
        while (retries > 0) {
            try {
                return await contract[method](...args);
            } catch (error: any) {
                retries--;
                if (retries === 0) throw error;
                console.log(`RPC call failed, retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    async getAddress(chain: string, eoa: string): Promise<string> {
        const relay = await this.setRelay(chain,eoa)
        return await relay.protocolKit.getAddress();
    }

    async genericTx(contract_address: string, abi: string, method: string, args: string[], includesDeploy: boolean) : Promise<string> {

        console.log("contract_address: " + contract_address);
        // console.log("abi: " + abi);
        console.log("method: " + method);
        console.log("args: " + args);
        console.log("includesDeploy: " + includesDeploy);

        const contract = new ethers.Contract(contract_address, abi, this.signer);
        const txData = contract.interface.encodeFunctionData(method, args);

        const transaction1 = { 
            to: contract_address,
            data: txData,
            value: "0"
        }

        const transactions = [transaction1];

        return await sendTx(this.main, this.relay, transactions, includesDeploy);
    }

    async addOwner(chain: string): Promise<string> {

        const proxy = ethers.getAddress("0x8D15c25E8D51e7F7142D6db2AaF96EC852126241");
        const me = ethers.getAddress("0xB6cA51CA72C689b720235aCA37E579f821FA05EE");
        console.log(me);

        const proxyContract = new ethers.Contract(proxy, SAFE_IMPLEMENTATION_ABI, this.signer);
        const createProxyData = proxyContract.interface.encodeFunctionData("addOwnerWithThreshold", [me, 1]);

        // dit is dus goed
        console.log(createProxyData);
        // succesvol!
        const scandata = "0x0d582f13000000000000000000000000b6ca51ca72c689b720235aca37e579f821fa05ee0000000000000000000000000000000000000000000000000000000000000001";
        console.log(scandata);

        const userop = await userOp(
            this, 
            proxy, 
            "0x", 
            createProxyData,
            chain
        );

        return "0x"
    }
}