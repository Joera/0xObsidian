import { Wallet, ethers } from "ethers";

import { create_init_code, estimateUserOpGas, eth_salt, formatUserOp, getUserOperationByHash, rundler_maxPriorityFeePerGas, sendUserOperation, zeroEth } from "eth_userop";
import { ENTRYPOINT_ADDRESS, POD_FACTORY_ADDRESS  } from "eth_contracts";
import { IEthService } from "eth_service";

export const generatePK = () => {

    const w = ethers.Wallet.createRandom();
    return w.privateKey;
} 

// export const myAddress = (pk: string) => {
//     const w = new Wallet(pk);
//     return w.address;
// }

export const createSmartAccount = async (ethService: IEthService): Promise<string> => {

    return new Promise( async (resolve, reject) => {

        if (!ethService.checkPaymasterBalance()) reject();

        const { initCode, msca } = await create_init_code(ethService);
        ethService.loadSmartAccount(msca);

        const callData = ethService.podFactory.interface.encodeFunctionData("test",[]);
        const target = POD_FACTORY_ADDRESS;
        const userOp = await formatUserOp(ethService, msca, initCode, target, callData);

        // console.log(userOp);

        const opHash = await sendUserOperation(
            userOp,
            ENTRYPOINT_ADDRESS,
        );

        const interval = setInterval(async () => {
            
            try {
                
                const { transactionHash } = await getUserOperationByHash([opHash])
                
                if(transactionHash != null) {
                    resolve(msca)
                    clearInterval(interval);
                } 
            } catch (err) {
                // console.log("within interval: " + err)
            } 

        }, 1000);

    });
 

}

export const attachEnsName = () => {

}
