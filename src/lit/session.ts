import { LitActionResource, LitPKPResource, createSiweMessage, generateAuthSig } from "@lit-protocol/auth-helpers";
import { LIT_ABILITY } from "@lit-protocol/constants";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { ethers, Wallet } from "ethers5"; 
import { delegateCapacityToken } from "./capacity.js";

export const createSessionSignatures = async (client: LitNodeClient, signer: Wallet, capacityTokenId: string) => {

    const capacityDelegationAuthSig = await delegateCapacityToken(signer, client, capacityTokenId)

    const resourceAbilityRequests : any = [
        {
            resource: new LitPKPResource("*"),
            ability: LIT_ABILITY.PKPSigning,
          },
          {
            resource: new LitActionResource("*"),
            ability: LIT_ABILITY.LitActionExecution,
          },
    ];

    const sigs = await client.getSessionSigs({
        chain: "ethereum",
        capabilityAuthSigs: [capacityDelegationAuthSig],
        expiration: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 10 minutes
        resourceAbilityRequests,
        authNeededCallback: async ({
            uri,
            expiration,
            resourceAbilityRequests,
        }) => {
        const toSign = await createSiweMessage({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: await signer.getAddress(),
            nonce: await client.getLatestBlockhash(),
            litNodeClient: client,
        });
        
    
        return await generateAuthSig({
            signer: signer,
            toSign,
        });
        },
    });

    return sigs;
}