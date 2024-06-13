import { IMainController } from "src/main.ctrlr";
import { deploySmartAccount } from "./author_deploy";
import { ethers } from "ethers";

export interface IAuthor {
    name: string,
    active: boolean,
    private_key: string,
    msca: string | undefined,
    profile: string | undefined
    deploy: (main: IMainController) => Promise<void> 
}

export class Author {
    name: string
    active: boolean
    private_key: string
    msca: string | undefined
    profile: string | undefined

    constructor(name: string, active: boolean, private_key: string | undefined, msca: string | undefined, profile: string | undefined) {
        this.name = name;
        this.active = active;
        this.private_key = private_key || this._generatePK();
        this.msca = msca,
        this.profile = profile
    }


    async deploy(main: IMainController) {
        this.msca = await deploySmartAccount(main.eth, main.env.SEPOLIA_API_KEY || 'x');
    }

    _generatePK() {

        const w = ethers.Wallet.createRandom();
        return w.privateKey;
    } 
}