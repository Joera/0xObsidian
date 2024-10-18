import { ethers } from "ethers";

export const getProvider = (chain: string = 'BASE_SEPOLIA', alchemy_key: string) => {

    let provider;

    switch (chain) {

        case 'ETH_MAINNET':
            provider = ethers.getDefaultProvider(
                "https://eth-mainnet.g.alchemy.com/v2/" + alchemy_key ,
                {
                    alchemy: alchemy_key 
                }
            );
            break;

        case 'ARB_SEPOLIA': 
            provider = ethers.getDefaultProvider(
                "https://arb-sepolia.g.alchemy.com/v2/" + alchemy_key ,
                {
                    alchemy: alchemy_key 
                }
            );
            break;

        case 'BASE_SEPOLIA':
            provider = ethers.getDefaultProvider(
                "https://base-sepolia.g.alchemy.com/v2/" + alchemy_key ,       
                {
                    alchemy: alchemy_key
                }
            )
            break;

        default:
            provider = ethers.getDefaultProvider(
                "https://arb-sepolia.g.alchemy.com/v2/" + alchemy_key ,
                {
                    alchemy: alchemy_key 
                }
            )
    }

    return provider;
}

export const getRPC = (chain: string, alchemy_key: string): string => {
    return `https://${chain}.g.alchemy.com/v2/${alchemy_key}`;
}
