import { Safe4337Pack, UserOperationReceipt } from "@safe-global/relay-kit";
import { ethers } from "ethers";
import { IMainController } from "src/main.ctrlr.js";
import { getInternalTransactions } from "./eth_utils.js";

export const sendTx = async (main: IMainController, relay: Safe4337Pack, transactions: any[], includesDeploy: boolean) : Promise<any> => {

    return new Promise( async (resolve, reject) => {
    
        const safeOperation = await relay.createTransaction({ transactions });
        const identifier = ethers.keccak256(ethers.toUtf8Bytes(main.user.name + main.user.eoa));
        safeOperation.data.callData = ethers.concat([
            safeOperation.data.callData as `0x{string}`,
            identifier
        ]).toString()
        
        const identifiedSafeOperation = await relay.getEstimateFee({
            safeOperation
        });

        const signedSafeOperation = await relay.signSafeOperation(identifiedSafeOperation)

        const userOperationHash = await relay.executeTransaction({
            executable: signedSafeOperation
        })

        let userOperationReceipt: UserOperationReceipt | null = null;

        while (!userOperationReceipt) {
            // Wait 2 seconds before checking the status again
            await new Promise((resolve) => setTimeout(resolve, 2000))
            userOperationReceipt = await relay.getUserOperationReceipt(
                userOperationHash
            )
        }

        const userOperationPayload = await relay.getUserOperationByHash(
            userOperationHash
        );

        console.log("txHash: " + userOperationPayload.transactionHash);
        // console.log(includesDeploy);

        if (includesDeploy) {
            let attempts = 0;
            const maxAttempts = 5;
            let txs : any[] = [];
            
            while (attempts < maxAttempts) {
                txs = await getInternalTransactions("BASE_SEPOLIA", userOperationPayload.transactionHash, main.plugin.settings.basescan_key);
                console.log(`Attempt ${attempts + 1}: Found ${txs.length} internal transactions`);
                
                if (txs.length > 0 && txs.find((tx) => tx.contractAddress != "")) {
                    break;
                }
                
                // Wait for 2 seconds before next attempt
                await new Promise(r => setTimeout(r, 2000));
                attempts++;
            }

            console.log(txs);

            const tx = txs.find((tx) => tx.contractAddress != "");
            console.log(tx);
            resolve(tx ? tx.contractAddress : "No contract address found");
        } else {
            resolve(userOperationPayload);
        }
    });
}