import { POD_FACTORY_ADDRESS, ENTRYPOINT_ADDRESS } from "./eth/eth_contracts";
import { IEthService } from "./eth/msca_service";
import { create_init_code, formatUserOp, sendUserOperation, getUserOperationByHash } from "./eth/eth_userop";

export const sendInvite = (ethService: IEthService, method: string, pod_address: string, invitee: string, token: string) : Promise<void> => {

    return new Promise( async (resolve, reject) => {

        if (!ethService.checkPaymasterBalance()) reject();

        // console.log(pod_address)
      
        const { initCode, msca } = await create_init_code(ethService);
        await ethService.loadSmartAccount(msca);
        await ethService.loadPod(pod_address)

        const callData = ethService.podContract.interface.encodeFunctionData(method,[msca, invitee]);   
        const target = pod_address;
        const userOp = await formatUserOp(ethService, msca, initCode, target, callData, token);

        // console.log(userOp);

        const opHash = await sendUserOperation(
            userOp,
            ENTRYPOINT_ADDRESS,
            token
        );

        console.log("opHash:" + opHash);

        const interval = setInterval(async () => {
            
            try {
                const { transactionHash } = await getUserOperationByHash([opHash], token);
                if(transactionHash != null) {
                    console.log("tx came through: " + transactionHash);
                    resolve()
                    clearInterval(interval);
                } 
            } catch (err) {
                console.log("within interval: " + err)
            } 

        }, 2000);

    });
    
}