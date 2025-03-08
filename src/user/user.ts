import { IMainController } from "src/main.ctrlr.js";
import { ethers, Wallet } from "ethers";

export interface IPKPInfo {
    name: string;
    tokenId: string;
    publicKey: string;
}

export interface IOXOUser {
    name: string,
    active: boolean,
    eoa: string,
    private_key: string,
    msca: string | undefined,
    safe: string | undefined,
    pkps: IPKPInfo[],
 //   deploySafe: (main: IMainController, chain: string) => Promise<void>,
    deployMSCA: (main: IMainController) => Promise<void>,
    setSafeAddress: (address: string) => void,
    addPKP: (name: string, tokenId: string, publicKey: string) => void
}

export class OXOUser implements IOXOUser {
    name: string
    active: boolean
    eoa: string
    private_key: string
    msca: string | undefined
    safe: string | undefined
    pkps: IPKPInfo[] = []

    constructor(name: string, active: boolean, private_key: string | undefined, eoa: string | undefined, msca: string | undefined, safe: string | undefined) {

        if(private_key == undefined) {
            private_key = this._generatePK();
        }

        if (eoa == undefined) {
            eoa = this.__address(private_key);
        }

        this.name = name;
        this.active = active;
        this.eoa = eoa;
        this.private_key = private_key;
        this.msca = msca != undefined ? ethers.getAddress(msca) : undefined;   
        this.safe = safe != undefined ? ethers.getAddress(safe) : undefined;      
    }

    async deployMSCA(main: IMainController) {
        this.msca = await main.msca.deploySmartAccount(main.plugin.settings.alchemy_key  || 'x');      
    }

    _generatePK() {
        const w = ethers.Wallet.createRandom();
        return w.privateKey;
    } 

    __address(privateKey: string) {
        const wallet = new Wallet(privateKey);
        return wallet.address;
    }

    setSafeAddress(safe: string) {
        this.safe = ethers.getAddress(safe);
    }

    addPKP(name: string, tokenId: string, publicKey: string) {
        this.pkps.push({ name, tokenId, publicKey });
    }
}