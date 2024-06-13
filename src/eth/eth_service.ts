import { ethers, Signer, Provider, Contract, Wallet } from "ethers";
import { ACCOUNT_FACTORY_ADDRESS, ENTRYPOINT_ADDRESS, PAYMASTER_ADDRESS, POD_FACTORY_ADDRESS } from "./eth_contracts";

import * as ep from '../../contracts/EntryPoint.json';
import * as af from '../../contracts/AccountFactory.json'; // default from alchemy
import * as ac from '../../contracts/ModularAccount.json'; // default from alchemy
import * as pf from '../../hardhat/artifacts/contracts/Pod.sol/PodFactory.json';
import * as po from '../../hardhat/artifacts/contracts/Pod.sol/Pod.json';
import { IMainController } from "../main.ctrlr";
import { InviteAcceptModal } from "../ui/invite-accept.modal";
import { UpdateAcceptModal } from "../ui/update-accept.modal";

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

        this.updateSigner(this.main.author.private_key);
        this.loadContracts();
        this.listenToInvites();
        this.listenToUpdates();
    }

    updateSigner(pk: string)  {

        let signer = new Wallet(pk);
        this.signer = signer.connect(this.provider);
        this.loadContracts(); 
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
        const balance = await this.entrypoint.balanceOf(PAYMASTER_ADDRESS);

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

        // console.log("listening to invites");

        this.provider.on(filter, async (log) => {

            console.log("received event");

            const { topics, data } = log;

            const pod = ethers.getAddress('0x' + topics[1].slice(26));
            const from = ethers.getAddress('0x' + topics[2].slice(26));
            const to = ethers.getAddress('0x' + topics[3].slice(26));

            this.main.eth.loadPod(pod);
            const name: string = await this.main.eth.podContract.name();

            if(to == ethers.getAddress(this.main.author.msca || "X")){

            //    const ensName = await this.ensProvider.lookupAddress(to);
                const modal = new InviteAcceptModal(this.main, name, from, pod).open();
            } else {
                console.log("ignored update");
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
                "0x1a13d7c8718d93d5b2ba41b491d2d700b627a94cfacd2ef001be42bec827bb9a"
            ]
        };

        // console.log("listening to updates");

        this.provider.on(filter, async (log) => {

            const { topics, blockNumber } = log;

            const pod = ethers.getAddress('0x' + topics[1].slice(26));
            const from = ethers.getAddress('0x' + topics[2].slice(26));
            const cid = topics[3];

            this.main.eth.loadPod(pod);
            const readers: string[] = await this.main.eth.podContract.getReaders();
            const name: string = await this.main.eth.podContract.name();
            const msca = this.main.author.msca || "x";

            // console.log(readers);
            // console.log(ethers.getAddress(msca))

            this.main.plugin.settings.updates.push({    
                accepted: false,
                block_number: blockNumber,
                cid,
                contract: pod,
                from,
                name
            })

            if(
                from != ethers.getAddress(msca)
                &&
                readers.indexOf(ethers.getAddress(msca)) > -1
            
            ){
                const modal = new UpdateAcceptModal(this.main, blockNumber, name, from, pod).open();
            } else {
                console.log("ignored update");
            }
        })
    }
}
