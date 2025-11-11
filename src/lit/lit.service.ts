import { AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE, LIT_ABILITY, LIT_NETWORK, LIT_RPC, LitAbility } from "@lit-protocol/constants";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
// import { createSiweMessageWithRecaps, generateAuthSig } from "@lit-protocol/auth-helpers";
import {
    LitActionResource,
    LitPKPResource,
    createSiweMessage,
    generateAuthSig,
  } from "@lit-protocol/auth-helpers";  
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { IMainController } from "src/main.ctrlr.js";
import { ethers as ethers5 } from "ethers5"; // Ethers v5
import { encryptString } from '@lit-protocol/encryption';
import { createSessionSignatures } from "./session.js";
import { delegateCapacityToken, mintCapacityToken } from "./capacity.js";

const CHAIN_ID = "CRONICLE_YELLOWSTONE";

//we cannot mint pkp's on other chains than yellowstone. And yellowstone does not have contracts to do account abstraction.
// so we can only mint as a signer. 

export class LitService {

    main: IMainController
    client: any
    signer: any
    contract!: any // do we need contract ? 
    authSig!: any
    sessionSigs!: any[]
    storage: any

    constructor(main: IMainController) {
        this.main = main;

        this.client = new LitNodeClient({
            litNetwork: LIT_NETWORK.Datil,
            debug: false 
        });
    }


    async init() { 

        await this.client.connect();
        const provider = new ethers5.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
        this.signer = new ethers5.Wallet(this.main.user.private_key, provider);
        // if (this.main.plugin.settings.lit_capacity_token == undefined || this.main.plugin.settings.lit_capacity_token == "") {
            this.main.plugin.settings.lit_capacity_token = await mintCapacityToken(this.main, this.signer, this.client, LIT_NETWORK.Datil);
            console.log("minted capacity token",this.main.plugin.settings.lit_capacity_token);
            this.main.plugin.saveSettings();
        // }

        
    }

    async wildcardAuthSig(expirationTime: string) {
        console.log('Generating fresh auth signature... xxx');
    
        const origin = window.location.origin;
    
        const toSign = await createSiweMessage({
            uri: origin,
            expiration: expirationTime,
            resources: [
                {
                    resource: new LitActionResource('*'),
                    ability: LitAbility.LitActionExecution
                },
                {
                    resource: new LitPKPResource('*'),
                    ability: LitAbility.PKPSigning
                }
            ],
            walletAddress: "0x0000000000000000000000000000000000000000", // Allow any EOA
            nonce: await this.client.getLatestBlockhash(),
            litNodeClient: this.client,
        });
    
        const authSig = await generateAuthSig({
            signer: this.signer,
            toSign: toSign,
        });
    
        return authSig;
    }

    async runAction(action_cid: string, params: any) {

        const time_1 = Date.now();
        
        if (this.client == undefined || this.client.ready == false) {
            console.log('Client not connected, initializing...');
            await this.init();
        }
        const time_2 =  Date.now();
        const sessionSignatures  = await createSessionSignatures(this.client, this.signer, this.main.plugin.settings.lit_capacity_token);

        // console.log("cid:", action_cid);
        // console.log("params:", params);

        const time_3 = Date.now();

        const response = await this.client.executeJs({
            sessionSigs: sessionSignatures,
            ipfsId: action_cid,
            jsParams: params,
        });

        const time_4 = Date.now();
        console.log("prepared action: ", ((time_3 - time_1) / 1000).toFixed(3), "seconds");
        console.log("executed action: ", ((time_4 - time_3) / 1000).toFixed(3), "seconds");
    
        return response;
    }   

    // async getInfo(pkpId: number) {

    //     if (this.contract == undefined || !this.contract.connected) {
    //         console.log('Contract not connected, initializing...');
    //         await this.init();
    //     }

    //     try {
    //         // Assuming `getPermissions` is a method in your contract to fetch permissions
    //         const permittedAddresses = await this.contract.pkpPermissionsContractUtils.read.getPermittedAddresses(pkpId);
    //         console.log("Permitted Adresses for PKP ID:", pkpId, permittedAddresses);
    //         const permittedActions = await this.contract.pkpPermissionsContractUtils.read.getPermittedActions(pkpId);
    //         console.log("Permitted actions for PKP ID:", pkpId, permittedActions);
    //         return {permittedAddresses, permittedActions};  
    //     } catch (error) {
    //         console.error("Error fetching permissions:", error);
    //         throw error;
    //     }
    
    // }

    async encryptWithUcc(content: string, unifiedAccessControlConditions: any[]) {

        // Initialize if needed
        if (this.client == undefined || this.client.ready == false) {
            console.log('Client not connected, initializing...');
            await this.init();
        }

        const { ciphertext, dataToEncryptHash } = await encryptString(
            {
              unifiedAccessControlConditions,
              dataToEncrypt: content,
            },
            this.client,
        );



        return {
            ciphertext,
            dataToEncryptHash,
        };

    }

    async encryptWithAcc(content: string, conditions: any[]) {

        // Initialize if needed
        if (this.client == undefined || this.client.ready == false) {
            console.log('Client not connected, initializing...');
            await this.init();
        }

        // we can run this with always true contitions for testing 

        console.log("encrypting with acc:", conditions);

        const { ciphertext, dataToEncryptHash } = await encryptString(
            {
              accessControlConditions: conditions,
              dataToEncrypt: content,
            },
            this.client,
        );

        return {
        ciphertext,
        dataToEncryptHash,
        };
    }
}