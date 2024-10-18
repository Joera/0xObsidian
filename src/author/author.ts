import { IMainController } from "src/main.ctrlr";
import { deploySmartAccount } from "./author_deploy";
import { ethers, Wallet } from "ethers";

export interface IAuthor {
    name: string,
    active: boolean,
    eoa: string,
    private_key: string,
    msca: string | undefined,
    safe: string | undefined,
    deploy: (main: IMainController) => Promise<void> 
}

export class Author {
    name: string
    active: boolean
    eoa: string
    private_key: string
    msca: string | undefined
    safe: string | undefined


    constructor(name: string, active: boolean, private_key: string | undefined, eoa: string | undefined, msca: string | undefined) {

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
    }


    async deploy(main: IMainController) {
      //  this.msca = await deploySmartAccount(main.eth, main.plugin.settings.alchemy_key  || 'x');

      
        this.safe = await deployGnosisSafe(main.eth, main.plugin.settings.alchemy_key  || 'x');
        
    }

    _generatePK() {

        const w = ethers.Wallet.createRandom();
        return w.privateKey;
    } 

    __address(privateKey: string) {

        const wallet = new Wallet(privateKey);
        return wallet.address;
    }
}