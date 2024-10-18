import { ethers, Signer, Provider, Contract, Wallet } from "ethers";

import * as sf from '../../hardhat/artifacts/contracts/safe/SafeFactory.sol/SafeFactory.json';
import * as col from '../../contracts/NftCollection.json';
import { IMainController } from "../main.ctrlr";

import Safe, { PredictedSafeProps } from "@safe-global/protocol-kit";
import SafeFactory from "@safe-global/protocol-kit";
import { getProvider, getRPC } from "./provider.factory";

export interface ISafeService {
    signer: Signer;
    provider: Provider;
    ensProvider: Provider;
    safe: Safe;
    factory: SafeFactory;
    updateSigner: (pk: string) => void;
    genericRead: (address: string, abi: string, method: string, args: string[]) => Promise<any>;
    genericTx(address: string, abi: string, method: string, args: string[]) : Promise<boolean>;
    
}
 

// on base sepolia 
const SAFE_FACTORY = "0x9da452E0e8688255CEc27AB1CF338ea0866d331D";
const BASE_SEPOLIA_CHAIN = "534351";

export class SafeService implements ISafeService {
    
    main: IMainController;
    signer: Signer;
    provider: Provider;
    ensProvider: Provider;
    baseProvider: Provider;
    baseSigner: Signer;
    safe: Safe;
    factory: SafeFactory;

    constructor(main: IMainController) {

        this.main = main;
        this.updateSigner(this.main.author.private_key);
        this.loadSafe(this.main.author.safe_address, 'BASE_SEPOLIA');
    }
    
    updateSigner(pk: string, chain: string = 'BASE_SEPOLIA') { 

        let signer = new ethers.Wallet(pk);
        this.signer = signer.connect(getProvider(chain, this.main.plugin.settings.alchemy_key));
    }


    async loadSafe(safeAddress: string, chain: string) {

        const predictedSafe: PredictedSafeProps = {
            safeAccountConfig : {
                owners: [], 
                threshold: 1,
            },
            safeDeploymentConfig: {
              //  saltNonce: concatenate name and eoa address
            }
        };

        this.factory = await SafeFactory.init({ 
            provider: getRPC(chain,this.main.plugin.settings.alchemy_key),
            signer: this.main.author.private_key,
            predictedSafe
        });
      
        this.safe = await Safe.init({ 
            provider: getRPC(chain, this.main.plugin.settings.alchemy_key),
            signer: this.main.author.private_key,
            safeAddress
        });
        
    }

    async genericRead(address: string, abi: string, method: string, args: string[]) : Promise<any> {

        const contract = new ethers.Contract(address, abi, this.signer);
        return await contract[method](...args);
    }

    async genericTx(contract_address: string, abi: string, method: string, args: string[]) : Promise<boolean> {

        return new Promise( async (resolve, reject) => {

            const contract = new ethers.Contract(contract_address, abi, this.baseSigner);
            const txData = contract.interface.encodeFunctionData(method, args);

            const txObject = {
                to: contract_address,
                value: 0, 
                data: txData, 
                operation: 0, 
                gasLimit: ethers.parseUnits('100000', 0).toString(16),
                nonce: await this.baseProvider.getTransactionCount(contract_address),
                transactions: [],
              };
             
            const safeTransaction = await this.safe.createTransaction(txObject);
            const safeTxHash = await this.safe.getTransactionHash(safeTransaction);
            const signature = await this.signer.signMessage(ethers.hexlify(safeTxHash));

            const safeSignature: any = { data: signature, signatureType: 'eth_sign' };
            safeTransaction.addSignature(safeSignature);
            const result = await this.safe.executeTransaction(safeTransaction);

            if(result) {
                resolve(true); 
            } else {
                resolve(false);
            } 
        });
    }

    async deploySafeContract() : Promise<string>  {
        
        return new Promise( async (resolve, reject) => {

            const contract = new ethers.Contract(SAFE_FACTORY, sf.abi, this.baseSigner);
            // const args = [[this.main.plugin.settings.authors],1];
            // const callData = contract.interface.encodeFunctionData("createSafe",args); 
            const tx = await contract.createSafe([this.main.plugin.settings.authors],1);

            try {
                const receipt = await tx.wait();
                console.log('Transaction confirmed:', receipt);
            } catch (error) {
                console.error('Error calling contract:', error);
            }

        });
    }
}

