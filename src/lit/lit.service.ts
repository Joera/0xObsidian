import { AUTH_METHOD_SCOPE, AUTH_METHOD_TYPE, LIT_ABILITY, LIT_NETWORK, LIT_RPC } from "@lit-protocol/constants";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
// import { createSiweMessageWithRecaps, generateAuthSig } from "@lit-protocol/auth-helpers";
import {
    LitAccessControlConditionResource,
    LitPKPResource,
    createSiweMessage,
    generateAuthSig,
  } from "@lit-protocol/auth-helpers";
import { Wallet, JsonRpcProvider, getDefaultProvider, ethers } from "ethers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { AuthSig, ILitNodeClient, LitAbility, LitResourceAbilityRequest } from '@lit-protocol/types';
import * as siwe from "siwe";
import { IMainController } from "src/main.ctrlr.js";

export class LitService {

    main: IMainController
    client: any
    signer: any
    contract!: any
    authSig!: any
    sessionSigs!: any[]
    storage: any

    constructor(main: IMainController) {
        this.main = main;

        this.client = new LitNodeClient({
            litNetwork: LIT_NETWORK.DatilTest, // Use DatilDev testnet
            debug: false // Disable debug mode
        });
    }

    async init() { 
        console.log('Connecting Lit client...');
        await this.client.connect();
        console.log('Lit client connected');
        
        console.log('Setting up provider and signer...');
        // Create a full JSON RPC provider for Base Sepolia
        const provider = new JsonRpcProvider(
            `https://base-sepolia.g.alchemy.com/v2/${this.main.plugin.settings.alchemy_key}`,
            {
                name: 'Base Sepolia',
                chainId: 84532
            }
        );
        
        // Create signer with provider
        const wallet = new Wallet(this.main.user.private_key);
        this.signer = wallet.connect(provider);
        console.log('Using signer with address:', await this.signer.getAddress());
        
        console.log('Initializing Lit contracts...');
        // Initialize contracts with network configuration
        this.contract = new LitContracts({
            network: LIT_NETWORK.DatilTest,
            debug: true
        });

        // Connect the contracts with provider and signer
        await this.contract.connect({
            provider,
            signer: this.signer
        });
        
        // Wait for initialization
        if (!this.contract.initialized) {
            console.log('Waiting for contract initialization...');
            for (let i = 0; i < 50; i++) { // Try for 5 seconds max
                if (this.contract.initialized) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log('Contract state:', {
            initialized: this.contract.initialized,
            connected: this.contract.connected,
            signer: !!this.contract.signer,
            provider: !!this.contract.provider,
            availableContracts: Object.keys(this.contract),
            network: await provider.getNetwork()
        });
        
        console.log('Contract state:', this.contract);
    }

    private async __authSig(resourceAbilityRequests: LitResourceAbilityRequest[]) {
        console.log('Generating fresh auth signature... xxx');

        const walletAddress = await this.main.safe.address;
        const origin = window.location.origin;
        const statement = `I am creating an auth signature to use Lit Protocol at origin: ${origin}`;
        const expirationTime = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

        const resources = resourceAbilityRequests.map(req => ({
            ...req,
            resource: req.resource instanceof LitPKPResource 
                ? req.resource 
                : new LitPKPResource("*")
        }));
        
        if (resources.length > 0) {
            console.log('PKP Resource:', resources[0].resource);
        }
      
        const toSign = await createSiweMessage({
            domain: window.location.hostname,
            uri: origin,
            version: '1',
            statement,
            expiration: expirationTime,
            resources,
            walletAddress,
            nonce: await this.client.getLatestBlockhash(),
            litNodeClient: this.client
        });
      
        // Use ethers v6 compatible signing
        const authSig = await generateAuthSig({
            signer: this.main.safe.signer,
            toSign
        });

        return authSig;
    }

    async sessionSignature(resourceAbilityRequests: LitResourceAbilityRequest[]) { 
        const authNeededCallback = async (params: any) => {
            const authSig = await this.__authSig(resourceAbilityRequests);
            return authSig;
        };

        try {
            // Create proper LitPKPResource instance
            const pkpResource = new LitPKPResource("*");
            console.log('Session PKP Resource:', pkpResource);
            
            this.sessionSigs = await this.client.getSessionSigs({
                chain: "ethereum",
                expiration: new Date(Date.now() + 1000 * 60 * 10 ).toISOString(), // 10 minutes
                //capabilityAuthSigs: [capacityDelegationAuthSig], // Unnecessary on datil-dev
                resourceAbilityRequests: [{
                    resource: pkpResource,
                    ability: LIT_ABILITY.PKPSigning,
                }],
                authNeededCallback
            });

            return this.sessionSigs;
        } catch (error) {
            console.log('Session signature error, attempting to renew auth...', error);
            // If session expired, generate a new auth signature and try again
            this.authSig = await this.__authSig(resourceAbilityRequests);
            
            // Create proper LitPKPResource instance for retry
            const pkpResource = new LitPKPResource("*");
            
            this.sessionSigs = await this.client.getSessionSigs({
                chain: "ethereum",
                expiration: new Date(Date.now() + 1000 * 60 * 10 ).toISOString(), // 10 minutes
                //capabilityAuthSigs: [capacityDelegationAuthSig], // Unnecessary on datil-dev
                resourceAbilityRequests: [{
                    resource: pkpResource,
                    ability: LIT_ABILITY.PKPSigning,
                }],
                authNeededCallback
            });

            return this.sessionSigs;
        }
    }

    async mintPKP() {
        try {
            console.log('Starting PKP minting in LitService...');
            
            // Initialize if needed
            if (this.contract == undefined || !this.contract.connected) {
                console.log('Contract not connected, initializing...');
                await this.init();
            }
            
            console.log('Using Safe address:', await this.main.safe.address);

            // Create user operation for PKP minting
            if (!this.contract.connected || !this.contract.pkpNftContract) {
                console.log('Attempting to reinitialize contracts...');
                await this.init();
                
                if (!this.contract.connected || !this.contract.pkpNftContract) {
                    throw new Error('Lit Contracts not properly initialized after retry');
                }
            }

            console.log('Contract state before minting:', {
                connected: this.contract.connected,
                signer: !!this.contract.signer,
                provider: !!this.contract.provider,
                availableContracts: Object.keys(this.contract),
                network: await this.signer.provider.getNetwork()
            });

            // Get the PKP NFT contract
            const pkpNftContract = this.contract.pkpNftContract;
            if (!pkpNftContract) {
                throw new Error('PKP NFT Contract not available');
            }
            
            console.log('PKP NFT Contract:', {
                contract: pkpNftContract,
                address: pkpNftContract.address,
                hasRead: !!pkpNftContract.read,
                hasWrite: !!pkpNftContract.write,
                methods: Object.keys(pkpNftContract)
            });

            // Create the mint transaction through our Safe
            const txHash = await this.main.safe.genericTx(
                pkpNftContract.address,
                JSON.stringify(pkpNftContract.abi),
                "mint",
                ["2"],
                false
            );
            
            console.log('Transaction hash:', txHash);
            return txHash;
        } catch (error) {
            console.error('Error in PKP minting process:', error);
            throw error;
        }
    }

    async getPKPsByOwner() {
        try {
            // Get all PKPs owned by the Safe address
            const pkps = await this.contract.getPKPsByOwner(await this.main.safe.address);
            console.log('PKPs owned by Safe:', pkps);
            return pkps;
        } catch (error) {
            console.error('Error getting PKPs:', error);
            throw error;
        }
    }
}