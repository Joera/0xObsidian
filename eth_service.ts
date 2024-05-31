import { ethers, Signer, Provider, Contract, Wallet } from "ethers";
import { ACCOUNT_FACTORY_ADDRESS, ENTRYPOINT_ADDRESS, PAYMASTER_ADDRESS, POD_FACTORY_ADDRESS } from "eth_contracts";

import * as ep from './contracts/EntryPoint.json';
import * as af from './contracts/AccountFactory.json';
import * as ac from './contracts/ModularAccount.json'
import * as pf from './contracts/PodFactory.json';
import * as po from './contracts/Pod.json';
import { MessageChannel } from "worker_threads";
import { Notice } from "obsidian";
import { IMainController } from "main.ctrlr";
import { InviteAcceptModal } from "invite-accept.modal";

export interface IEthService {
    signer: Signer;
    provider: Provider;
    ensProvider: Provider;
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
    listenToInvites: () => void;
    listenToUpdates: () => void;
    logPaymasterBalance: () => void;
}
 

export class EthService implements IEthService {
    
    main: IMainController;
    signer: Signer;
    provider: Provider;
    ensProvider: Provider;
    entrypoint: Contract;
    accountFactory: Contract;
    podFactory: Contract;
    smartAccount: Contract;
    podContract: Contract;

    msca: string;

    constructor(main: IMainController) {

        this.main = main;

        console.log(this.main.env.SEPOLIA_RPC_URL);

        this.provider = ethers.getDefaultProvider(
            this.main.env.SEPOLIA_RPC_URL,
            {
                alchemy : this.main.env.SEPOLIA_API_KEY
            }
        );

        this.ensProvider = ethers.getDefaultProvider(
            this.main.env.MAINNET_RPC_URL,
            {
                alchemy : this.main.env.MAINNET_API_KEY
            }
        );

        this.updateSigner(this.main.plugin.settings.author_pk);
        this.loadContracts();
        this.listenToInvites();
        this.listenToUpdates();
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
          
            fetch(`https://api-sepolia.arbiscan.io/api?module=account&action=txlistinternal&txhash=${txHash}&apikey=${this.main.env.ARBISCAN_API_KEY}`)
                .then(response => response.json())
                .then(response => {
                    // console.log(response);
                    resolve(response)
                })
                .catch(err => console.error(err));
    
        });
    }

    async checkPaymasterBalance() : Promise<boolean> {

        let b = true;
        // console.log(`paymaster ${PAYMASTER_ADDRESS}`)
        const balance = await this.entrypoint.balanceOf(PAYMASTER_ADDRESS);
        // console.log(balance);

        if(balance < 500000) {

         
            console.log(`paymaster balance dangerously low!  ${ethers.formatEther(balance)}`)
            b = false;
        } else {
            console.log("paymaster balance = " + ethers.formatEther(balance))
        }

        return b;
    }

    async logPaymasterBalance() {
    
        const balance = await this.entrypoint.balanceOf(PAYMASTER_ADDRESS);
        console.log("paymaster balance = " + ethers.formatEther(balance))

    }

    async listenToInvites() {

        let t = ethers.id("PodInvite(address, address, address)");
        // duuno why the topic hash it not the same ???????? 
        // console.log(t);

        const filter = {
            topics: [
                // using the one from contract logs on etherscan 
                "0x9869203779433091b9033c50a09cb80d8b9123be346b41ff4efe82d2b2d898d7"
            ]
        };

        console.log("listening to invites");

        this.provider.on(filter, async (log) => {

            console.log("received event");

            const { topics, data } = log;

            const pod = ethers.getAddress('0x' + topics[1].slice(26));
            const from = ethers.getAddress('0x' + topics[2].slice(26));
            const to = ethers.getAddress('0x' + topics[3].slice(26));

            if(to == ethers.getAddress(this.main.plugin.settings.msca)){

                const ensName = await this.ensProvider.lookupAddress(to);
                const modal = new InviteAcceptModal(this.main, from, pod).open();
            }
        })
    }

    async listenToUpdates() {

        let t = ethers.id("PodUpdate(address, string)");
        // duuno why the topic hash it not the same ???????? 
        // console.log(t);

        const filter = {
            topics: [
                // using the one from contract logs on etherscan 
                "0xa7bb3677cd4aba711195e286591cc724ceb486deac3c06a53222565000091d32"
            ]
        };

        console.log("listening to updates");

        this.provider.on(filter, (log) => {

            const { topics, data } = log;

            const pod = ethers.getAddress('0x' + topics[1].slice(26));
            const from = ethers.getAddress('0x' + topics[2].slice(26));
            const cid = topics[3];

            const msg = `a pod has been updated`;
            console.log(`podcontract: ${pod}`);
            new Notice(msg,0);
              
         
        })
    }
}

