import { Provider } from "ethers";

export const blockTime = async (block_number: string, provider: Provider) : Promise<string> =>  {

    const block = await provider.getBlock(block_number);
    if (block != null) {
        const blockTime = new Date(block.timestamp * 1000); 
        return blockTime.toLocaleDateString('nl') + " " + blockTime.toLocaleTimeString('nl'); //   toLocaleDateTimeString('nl')
    } else {
        return '-'
    }
}

export const getInternalTransactions = async (chain: string,txHash: string, token: string) : Promise<any[]> => {

    return new Promise( (resolve, reject) : any => {

        let url = `https://api-sepolia.arbiscan.io/api?module=account&action=txlistinternal&txhash=${txHash}&apikey=${token}`

        switch (chain) {

            case 'ETH_MAINNET':
                url = `https://api.etherscan.io/api?module=account&action=txlistinternal&txhash=${txHash}&apikey=${token}`
                break;      
            case 'BASE_SEPOLIA':
                url = `https://api-sepolia.basescan.org/api?module=account&action=txlistinternal&txhash=${txHash}&apikey=${token}`
                break;
            
        }
    
        fetch(url)
            .then(response => response.json())  
            .then(response => {
                resolve(response.result)
            })
            .catch(err => console.error(err));

    });
}