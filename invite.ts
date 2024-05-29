import { POD_FACTORY_ADDRESS, ENTRYPOINT_ADDRESS } from "eth_contracts";
import { IEthService } from "eth_service";
import { create_init_code, formatUserOp, sendUserOperation, getUserOperationByHash } from "eth_userop";

export const sendInvite = (ethService: IEthService, method: string, pod_address: string, invitee: string) : Promise<string> => {

    return new Promise( async (resolve, reject) => {

        if (!ethService.checkPaymasterBalance()) reject();
      
        const { initCode, msca } = await create_init_code(ethService);
        await ethService.loadSmartAccount(msca);
        await ethService.loadPod(pod_address)

        const callData = ethService.podContract.interface.encodeFunctionData(method,[invitee]);   
        const target = pod_address;
        const userOp = await formatUserOp(ethService, msca, initCode, target, callData);

        // console.log(userOp);

        const opHash = await sendUserOperation(
            userOp,
            ENTRYPOINT_ADDRESS,
        );

        console.log("opHash:" + opHash);

        const interval = setInterval(async () => {
            
            try {
                const { transactionHash } = await getUserOperationByHash([opHash]);
                if(transactionHash != null) {
                    console.log("tx came through: " + transactionHash);
                    clearInterval(interval);
                } 
            } catch (err) {
                console.log("within interval: " + err)
            } 

        }, 2000);

    });
    
}