import { ethers, Signer, Provider, Contract, Wallet } from "ethers";

import * as pf from '../../hardhat/artifacts/contracts/Pod.sol/PodFactory.json';
import * as po from '../../hardhat/artifacts/contracts/Pod.sol/Pod.json';

import { IMainController } from "../main.ctrlr";
import { InviteAcceptModal } from "../ui/invite-accept.modal";
import { UpdateAcceptModal } from "../ui/update-accept.modal";
import { IUpdate } from "src/types/oxo";

import { blockTime } from "src/eth/eth_utils";
import { POD_FACTORY_ADDRESS } from "./constants";

export interface IPodService {
    signer: Signer;
    provider: Provider;
    podFactory: Contract;
    podContract: Contract;
    // loadSmartAccount: (addr: string) => void;
    loadPod: (addr: string) => void;
    listenToInvites: () => void;
    listenToUpdates: () => void;
    fetchInvites: (last_update: string) => void;
    fetchUpdates: (last_update: string) => void;

}
 

export class PodService implements IPodService {
    
    main: IMainController;
    signer: Signer;
    provider: Provider;
    ensProvider: Provider;
    baseProvider: Provider;
    baseSigner: Signer;
    entrypoint: Contract;
    accountFactory: Contract;
    podFactory: Contract;
    smartAccount: Contract;
    podContract: Contract;

    msca: string;

    constructor(main: IMainController) {

        this.main = main;

        this.loadContracts();

        const allUpdates = Object.values(this.main.plugin.settings.updates).flat(1)
        
        allUpdates.sort( (a: IUpdate,b: IUpdate) => {
            return parseInt(b.block_number) - parseInt(a.block_number)
        })

        if(allUpdates[0] != undefined) {
            this.fetchInvites(allUpdates[0].block_number);
            this.fetchUpdates(allUpdates[0].block_number);
        }
        if (this.main.plugin.settings.listening) {
            console.log('listening to updates and invites')
            this.listenToInvites();
            this.listenToUpdates();
        }
    }

    loadContracts() {
        this.podFactory = new ethers.Contract(POD_FACTORY_ADDRESS, pf.abi, this.signer);
    }

    // loadSmartAccount(msca: string) {
    //     this.msca = msca
    //     this.smartAccount = new ethers.Contract(msca, ac.abi, this.signer);
    // }

    loadPod(pod_addr: string) {

        this.podContract = new ethers.Contract(pod_addr, po.abi, this.signer);
    }

    async listenToInvites() {

        const filter = {
            topics: [
                // using the one from contract logs on etherscan 
                "0x9869203779433091b9033c50a09cb80d8b9123be346b41ff4efe82d2b2d898d7"
            ]
        };

        this.provider.on(filter, async (log) => {
            this.handleInviteEvent(log, false)
        })
    }

    async listenToUpdates() {

        const filter = {
            topics: [
                "0x1a13d7c8718d93d5b2ba41b491d2d700b627a94cfacd2ef001be42bec827bb9a"
            ]
        };

        this.provider.on(filter, async (log) => {
           this.handleUpdateEvent(log, false)
        })
    }

    async fetchUpdates(last_update: string) {

        const filter = {
            topics: [
                // using the one from contract logs on etherscan 
                "0x1a13d7c8718d93d5b2ba41b491d2d700b627a94cfacd2ef001be42bec827bb9a"
            ],
            fromBlock: parseInt(last_update) + 1
        };

        const logs = await this.provider.getLogs(filter);

        for (let log of logs) {
            this.handleUpdateEvent(log, true)
        }
        
    }

    async fetchInvites(last_update: string) {
        
        const filter = {
            topics: [
                // using the one from contract logs on etherscan 
                "0x9869203779433091b9033c50a09cb80d8b9123be346b41ff4efe82d2b2d898d7"
            ],
            fromBlock: parseInt(last_update) + 1
        };

        const logs = await this.provider.getLogs(filter);

        for (let log of logs) {
            this.handleInviteEvent(log, true)
        }
    }

    async handleUpdateEvent(log: any, quiet: boolean) {

        const { topics, blockNumber } = log;

        const pod = ethers.getAddress('0x' + topics[1].slice(26));
        const from = ethers.getAddress('0x' + topics[2].slice(26));
        const cid = topics[3];

        this.main.eth.loadPod(pod);
        const readers: string[] = await this.main.eth.podContract.getReaders();
        const myAdresses = this.main.plugin.settings.authors.map( a => ethers.getAddress(a.msca || ""));

        // or keep a list of pods locally .. so you can unsubscribe off chain ??? 
        let oneOfMyPods = false;
        for (let reader of readers) {
            if (myAdresses.indexOf(reader) > -1) {
                oneOfMyPods = true;
            }
        }

        if (oneOfMyPods) {

            const name: string = await this.main.eth.podContract.name();
            const msca = this.main.author.msca || "x";

            let exists = false;
            if (this.main.plugin.settings.updates[name]) {
                for (let update of this.main.plugin.settings.updates[name]) {
                    if (update.block_number == blockNumber && update.from == from && update.contract == pod) {
                        exists = true;
                    }
                }
            }

            if (!exists) {

                if (this.main.plugin.settings.updates[name] == undefined) {
                    this.main.plugin.settings.updates[name] = []; 
                }

                this.main.plugin.settings.updates[name].push({    
                    accepted: false,
                    block_number: blockNumber,
                    datetime: await blockTime(blockNumber, ),
                    cid,
                    contract: pod,
                    from,
                    name
                })
            }

            this.main.plugin.saveSettings();

            if (!quiet) {
                const myAuthors = this.main.plugin.settings.authors.map( a => ethers.getAddress(a.msca || "0x"));
                if(myAuthors.indexOf(from) < 0) {
                    const modal = new UpdateAcceptModal(this.main, blockNumber, name, from, pod).open();
                }
            }

        } else {
            console.log("ignored update");
        }
    }

    async handleInviteEvent(log: any, quiet: boolean) {

        const { topics, blockNumber } = log;

        const pod = ethers.getAddress('0x' + topics[1].slice(26));
        const from = ethers.getAddress('0x' + topics[2].slice(26));
        const to = ethers.getAddress('0x' + topics[3].slice(26));

        if (this.main.plugin.settings.authors.map( a => ethers.getAddress(a.msca || "")).indexOf(to) > -1) {

            this.main.eth.loadPod(pod);
            const name: string = await this.main.eth.podContract.name();
            const cid: string = await this.main.eth.podContract.cid();

            let exists = false;
            for (let invite of this.main.plugin.settings.invites) {
                if (invite.block_number == blockNumber && invite.from == from && invite.contract == pod) {
                    exists = true;
                }
            }
            
            if (!exists) {
                this.main.plugin.settings.invites.push({    
                    accepted: false,
                    block_number: blockNumber,
                    datetime: await blockTime(blockNumber),
                    cid,
                    contract: pod,
                    from,
                    name
                })
            }

            this.main.plugin.saveSettings();

            if(!quiet) {
                const modal = new InviteAcceptModal(this.main, blockNumber, from, name, pod).open();
            }
            
        } else {
            
            console.log("ignored update");
        }
    }


}

