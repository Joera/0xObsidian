import { Wallet, ethers } from "ethers";

import { create_init_code, estimateUserOpGas, eth_salt, formatUserOp, getUserOperationByHash, rundler_maxPriorityFeePerGas, sendUserOperation, zeroEth } from "../eth/eth_userop";
import { ENTRYPOINT_ADDRESS, POD_FACTORY_ADDRESS  } from "../eth/eth_contracts";
import { IEthService } from "../eth/msca_service";



export const deployGnosisSafe = async (ethService: IEthService, token: string): Promise<string> => {

    // ON BASE SEPOLIA (because arb sepolia does not have app interface for gnosis safe)

    return new Promise( async (resolve, reject) => {

        if (!ethService.checkPaymasterBalance()) reject();

     //    await this.ethService.deploySafeContract(SAFE_FACTORY, )

    });
}

export const deploySmartAccount = async (ethService: IEthService, token: string): Promise<string> => {

    return new Promise( async (resolve, reject) => {

        if (!ethService.checkPaymasterBalance()) reject();

        const { initCode, msca } = await create_init_code(ethService);
        ethService.loadSmartAccount(msca);

        const callData = ethService.podFactory.interface.encodeFunctionData("test",[]);
        const target = POD_FACTORY_ADDRESS;
        const userOp = await formatUserOp(ethService, msca, initCode, target, callData, token);

        const opHash = await sendUserOperation(
            userOp,
            ENTRYPOINT_ADDRESS,
            token
        );

        // console.log(opHash);

        const interval = setInterval(async () => {
            
            try {
                
                const { transactionHash } = await getUserOperationByHash([opHash], token)
                console.log(transactionHash);
                
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
