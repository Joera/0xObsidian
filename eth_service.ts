import { ethers, Signer, Provider, Contract, Wallet } from "ethers";
import { RPC_URL, API_KEY, ARBISCAN_API_KEY } from "eth_env";
import { ACCOUNT_FACTORY_ADDRESS, ENTRYPOINT_ADDRESS, PAYMASTER_ADDRESS, POD_FACTORY_ADDRESS } from "eth_contracts";

import * as ep from './contracts/EntryPoint.json';
import * as af from './contracts/AccountFactory.json';
import * as ac from './contracts/ModularAccount.json'
import * as pf from './contracts/PodFactory.json';
import * as po from './contracts/Pod.json';
import { MessageChannel } from "worker_threads";
import { Notice } from "obsidian";

export interface IEthService {
    signer: Signer;
    provider: Provider;
    entrypoint: Contract;
    accountFactory: Contract;
    podFactory: Contract;
    smartAccount: Contract;
    podContract: Contract;
    updateSigner: (pk: string) => void;
    loadSmartAccount: (addr: string) => void;
    loadPod: (addr: string) => void;
    getInternalTransactions: (txHash: string) => Promise<any[]>;
    checkPaymasterBalance: () => Promise<boolean>;
    listen: (filter: any) => void
}
 

export class EthService implements IEthService {
    
    signer: Signer;
    provider: Provider;
    entrypoint: Contract;
    accountFactory: Contract;
    podFactory: Contract;
    smartAccount: Contract;
    podContract: Contract;

    msca: string;

    constructor(pk: string) {

        this.provider = ethers.getDefaultProvider(
            RPC_URL,
            {
                alchemy : API_KEY
            }
        );

        this.updateSigner(pk);
        this.loadContracts();
    }

    updateSigner(pk: string)  {

        let signer = new Wallet(pk);
        this.signer = signer.connect(this.provider);
        this.loadContracts(); // is this necessary ??? 
    }

    loadContracts() {

        this.entrypoint = new ethers.Contract(ENTRYPOINT_ADDRESS, ep.abi, this.signer);
        this.accountFactory = new ethers.Contract(ACCOUNT_FACTORY_ADDRESS, af.abi, this.signer);
        this.podFactory = new ethers.Contract(POD_FACTORY_ADDRESS, pf.abi, this.signer);
    }

    loadSmartAccount(msca: string) {
        this.msca = msca
        this.smartAccount = new ethers.Contract(msca, ac.abi, this.signer);
    }

    loadPod(pod_addr: string) {

        this.podContract = new ethers.Contract(pod_addr, po.abi, this.signer);
    }

    getInternalTransactions = async (txHash: string) : Promise<any[]> => {

        return new Promise( (resolve, reject) : any => {
          
            fetch(`https://api-sepolia.arbiscan.io/api?module=account&action=txlistinternal&txhash=${txHash}&apikey=${ARBISCAN_API_KEY}`)
                .then(response => response.json())
                .then(response => {
                    console.log(response);
                    resolve(response)
                })
                .catch(err => console.error(err));
    
        });
    }

    async checkPaymasterBalance() : Promise<boolean> {

        let b = true;
        const balance = await this.entrypoint.balanceOf(PAYMASTER_ADDRESS);

        if(balance < 500000) {
            console.log("paymaster balance dangerously low!")
            b = false;
        } else {
            console.log("paymaster balance = " + ethers.formatEther(balance))
        }

        return b;
    }

    async listen(filter: any) {

        console.log("listening to invites");

        this.provider.on(filter, (log) => {

            const { topics, data } = log;

            const pod = ethers.getAddress('0x' + topics[1].slice(26));
            const from = ethers.getAddress('0x' + topics[2].slice(26));
            const to = ethers.getAddress('0x' + topics[3].slice(26));

            if(to == "0xB6cA51CA72C689b720235aCA37E579f821FA05EE"){ // this.msca) {
                
                const msg = `you've been invited to a pod by ${from}`
                console.log(msg);
                console.log(`podcontract: ${pod}`);
                new Notice(msg,0);
              
            }
        })
    }
}

