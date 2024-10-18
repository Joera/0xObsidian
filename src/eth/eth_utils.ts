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

export const getInternalTransactions = async (txHash: string, alchemy_key: string) : Promise<any[]> => {

    return new Promise( (resolve, reject) : any => {
      
        fetch(`https://api-sepolia.arbiscan.io/api?module=account&action=txlistinternal&txhash=${txHash}&apikey=${alchemy_key}`)
            .then(response => response.json())
            .then(response => {
                // console.log(response);
                resolve(response)
            })
            .catch(err => console.error(err));

    });
}