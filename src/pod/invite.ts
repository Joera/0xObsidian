// import { ENTRYPOINT_ADDRESS } from "../eth/constants";
// import { IMSCAService } from "../eth/msca_service";
// import { create_init_code, formatUserOp, sendUserOperation, getUserOperationByHash } from "../eth/eth_userop";
// import { ISafeService } from "../eth/safe_service";

// export const sendInvite = (userService: IMSCAService | ISafeService, method: string, pod_address: string, invitee: string, token: string) : Promise<void> => {

//     return new Promise( async (resolve, reject) => {

//         if (!await checkPaymasterBalance()) reject();

//         // console.log(pod_address)
      
//         const { initCode, msca } = await create_init_code(mscaService);
//         await mscaService.loadSmartAccount(msca);
//         await mscaService.loadPod(pod_address)

//         const callData = mscaService.podContract.interface.encodeFunctionData(method,[msca, invitee]);   
//         const target = pod_address;
//         const userOp = await formatUserOp(mscaService, msca, initCode, target, callData, token);

//         // console.log(userOp);

//         const opHash = await sendUserOperation(
//             userOp,
//             ENTRYPOINT_ADDRESS,
//             token
//         );

//         console.log("opHash:" + opHash);

//         const interval = setInterval(async () => {
            
//             try {
//                 const { transactionHash } = await getUserOperationByHash([opHash], token);
//                 if(transactionHash != null) {
//                     console.log("tx came through: " + transactionHash);
//                     resolve()
//                     clearInterval(interval);
//                 } 
//             } catch (err) {
//                 console.log("within interval: " + err)
//             } 

//         }, 2000);

//     });
    
// }