import { ethers, Signer, Provider, Contract } from "ethers";
import { IMainController } from "../main.ctrlr.js";

import { Safe4337Pack } from '@safe-global/relay-kit'

import { getProvider, getRPC } from "./provider.factory.js";
import { SAFE_FACTORY_ABI, SAFE_IMPLEMENTATION_ABI } from "./safe_factory.abi.js";
import { getInternalTransactions } from "./eth_utils.js";
import { userOp } from "src/paymaster/userop.factory.js";

export interface ISafeService {

    main: IMainController;
    signer: Signer;
    relay: Safe4337Pack;
    provider: Provider;
    safe: any;
    factory: any;
    entrypoint: Contract;
    address: string;
    updateSigner: (pk: string) => void;
    setActiveRelay: (chain: string, eoa: string) => void;
    getAddress: (chain: string, eoa: string) => Promise<string>;
    // deploySafe: (chain: string) => Promise<string>;
    // addOwner: (chain: string) => Promise<string>;
    genericRead: (address: string, abi: string, method: string, args: string[]) => Promise<any>;
    genericTx(address: string, abi: string, method: string, args: string[], includesDeploy: boolean) : Promise<string>;
}
 

// on base sepolia 
const SAFE_FACTORY = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";
const SAFE_IMPLEMENTATION = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762";
const BASE_SEPOLIA_CHAIN = "534351";

export class SafeService implements ISafeService {
    
    main: IMainController;
    signer!: Signer;
    relay!: Safe4337Pack;
    provider: Provider;
    safe: any;
    factory: any;
    entrypoint!: ethers.Contract;
    address!: string;

    constructor(main: IMainController) {

        this.main = main;
        this.updateSigner(this.main.user.private_key);
        // this.entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ep.abi, this.signer);
        this.provider = getProvider('BASE_SEPOLIA', this.main.plugin.settings.alchemy_key);
    }
    
    async updateSigner(pk: string, chain: string = 'BASE_SEPOLIA') { 

        let signer = new ethers.Wallet(pk);
        this.signer = signer.connect(getProvider(chain, this.main.plugin.settings.alchemy_key));
    }

    async setActiveRelay(chain: string, eoa: string) {

        this.relay = await this.setRelay(chain, eoa);
        this.address = await this.relay.protocolKit.getAddress();
        console.log('active safe: ' + this.address);
    }

    async setRelay(chain: string, eoa: string) {
        
        const rpc = getRPC(chain, this.main.plugin.settings.alchemy_key);
        const saltNonce = ethers.toBeHex(ethers.keccak256(ethers.toUtf8Bytes('default_safe_' + eoa)));

        return await Safe4337Pack.init({
            provider: rpc,
            signer: this.main.user.private_key,
            bundlerUrl: `https://api.pimlico.io/v2/84532/rpc?apikey=${this.main.plugin.settings.pimlico_key}`,
            options: {
                owners: [eoa],
                threshold: 1,
                saltNonce
            },
           paymasterOptions: { 
               isSponsored: true,
               paymasterUrl: `https://api.pimlico.io/v2/84532/rpc?apikey=${this.main.plugin.settings.pimlico_key}`,
            }
        }); 


    }


    async genericRead(address: string, abi: string, method: string, args: string[]) : Promise<any> {

        const contract = new ethers.Contract(address, abi, this.signer);
        return await contract[method](...args);
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

        return new Promise( async (resolve, reject) => {

            const contract = new ethers.Contract(contract_address, abi, this.signer);
            const txData = contract.interface.encodeFunctionData(method, args);

            const transaction1 = { 
                to: contract_address,
                data: txData,
                value: "0"
            }

            const transactions = [transaction1];

            const safeOperation = await this.relay.createTransaction({ transactions });
            const identifier = ethers.keccak256(ethers.toUtf8Bytes(this.main.user.name + this.main.user.eoa));
            console.log(identifier);
            safeOperation.data.callData = ethers.concat([
                safeOperation.data.callData as `0x{string}`,
                identifier
            ]).toString()
            
            const identifiedSafeOperation = await this.relay.getEstimateFee({
            safeOperation
            });

            const signedSafeOperation = await this.relay.signSafeOperation(identifiedSafeOperation)

            const userOperationHash = await this.relay.executeTransaction({
            executable: signedSafeOperation
            })

            let userOperationReceipt = null

            while (!userOperationReceipt) {
                // Wait 2 seconds before checking the status again
                await new Promise((resolve) => setTimeout(resolve, 2000))
                userOperationReceipt = await this.relay.getUserOperationReceipt(
                    userOperationHash
                )
            }

            const userOperationPayload = await this.relay.getUserOperationByHash(
                userOperationHash
            );

            console.log("txHash: " + userOperationPayload.transactionHash);
            // console.log(includesDeploy);

            if (includesDeploy) {
                const txs = await getInternalTransactions("BASE_SEPOLIA", userOperationPayload.transactionHash, this.main.plugin.settings.basescan_key);
                console.log(txs)
                const tx = txs.find( (tx) => tx.contractAddress != "");
                console.log(tx);
                resolve(tx.contractAddress);
            } else {
                resolve("finished");
            }
        });
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

        // const opHash = await sendUserOperation(
        //     userop,
        //     ENTRYPOINT_ADDRESS,
        //     this.main.plugin.settings.alchemy_key  || "x"
        // );

        // let reponse = await getResponse(opHash, this.main.plugin.settings.alchemy_key  || "x");



        return "0x"
    }
}