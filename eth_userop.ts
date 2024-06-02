import { ACCOUNT_FACTORY_ADDRESS, ENTRYPOINT_ADDRESS, PAYMASTER_ADDRESS } from "eth_contracts";
import { IEthService } from "eth_service";
import { ethers, Signer, Provider, Contract } from "ethers";

export const eth_salt = () => {
    return ethers.toBigInt(ethers.randomBytes(32));
}

export const eth_fixed_salt = () => {
    return "82713067786997665706895799707315602316482679773042431943929829195857031311336";
}

export const zeroEth = () => {
    return ethers.parseUnits("0", "gwei");
}

export const create_init_code = async (ethService: IEthService) => {

    const eoa = await ethService.signer.getAddress();
    const salt = eth_fixed_salt();

    let initCode =  
    ACCOUNT_FACTORY_ADDRESS + 
    ethService.accountFactory.interface.encodeFunctionData("createAccount",[salt,[eoa]])
    .slice(2);

    let msca;
    try {
        msca = await ethService.entrypoint.getSenderAddress(initCode)
    } catch(ex) {
        if(ex.data == undefined) {
            console.log(ex);
        }
        msca = '0x' + ex.data.slice(-40);
    }
    const code = await ethService.provider.getCode(msca)
    if (code !== "0x") {
        initCode = "0x";
    }

    return {
        initCode,
        msca: ethers.getAddress(msca)
    }
}

export const formatUserOp = async (ethService: IEthService, msca: string, initCode: string, target: string, callData: string, token: string) : Promise<any> => {

    const callDataUserOp = ethService.smartAccount.interface.encodeFunctionData("execute",[target, zeroEth(), callData]);

    let userOp: any =  {
        sender: msca, 
        nonce: "0x" + (await ethService.entrypoint.getNonce(msca, 0)).toString(16),
        initCode,
        callData: callDataUserOp,
        paymasterAndData: PAYMASTER_ADDRESS,
        signature: "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
    }

    console.log(userOp);

    const { preVerificationGas, verificationGasLimit, callGasLimit} =  await estimateUserOpGas(userOp, ENTRYPOINT_ADDRESS, token);

    const { maxFeePerGas } = await ethService.provider.getFeeData();
    const maxPriorityFeePerGas = await rundler_maxPriorityFeePerGas(token);

    userOp.callGasLimit = callGasLimit;
    userOp.verificationGasLimit = verificationGasLimit;
    userOp.preVerificationGas = preVerificationGas;
    userOp.maxFeePerGas = maxFeePerGas != null ? "0x" + maxFeePerGas.toString(16) : "0x";
    userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

    const userOpHash = await ethService.entrypoint.getUserOpHash(userOp);
    userOp.signature = await ethService.signer.signMessage(ethers.getBytes(userOpHash));

    return userOp;

}


export const rundler_maxPriorityFeePerGas = async (token: string) : Promise<any> =>  {

    return new Promise( (resolve, reject) : any => {
    
        const options = {
            method: 'POST',
            headers: {accept: 'application/json', 'content-type': 'application/json'},
            body: JSON.stringify({
                id: 1,
                jsonrpc: '2.0',
                method: 'rundler_maxPriorityFeePerGas',
            })
        };
      
        fetch(`https://arb-sepolia.g.alchemy.com/v2/${token}`, options)
            .then(response => response.json())
            .then(response => resolve(response.result))
            .catch(err => {
                console.error(err); 
                reject()
            });

    });
}

export const estimateUserOpGas = async (userOp: any, contract_address: string, token: string) : Promise<any> =>  {

    return new Promise( (resolve, reject) : any => {
    
        const options = {
            method: 'POST',
            headers: {accept: 'application/json', 'content-type': 'application/json'},
            body: JSON.stringify({
                id: 1,
                jsonrpc: '2.0',
                method: 'eth_estimateUserOperationGas',
                params: [
                    userOp,
                    contract_address
                ]
            })
        };
      
        fetch(`https://arb-sepolia.g.alchemy.com/v2/${token}`, options)
            .then(response => response.json())
            .then(response => {
                console.log(response);
                resolve(response.result)
             })
            .catch(err => {
                console.error(err); 
                reject()
            });

    });
}

export const sendUserOperation = async (userOp: any, contract_address: string, token: string) : Promise<any> =>  {

    return new Promise( (resolve, reject) : any => {

        // console.log(userOp);
    
        const options = {
            method: 'POST',
            headers: {accept: 'application/json', 'content-type': 'application/json'},
            body: JSON.stringify({
              id: 1,
              jsonrpc: '2.0',
              method: 'eth_sendUserOperation',
              params: [
                userOp,
                contract_address
              ]
            })
        };
          
        fetch(`https://arb-sepolia.g.alchemy.com/v2/${token}`, options)
            .then(response => response.json())
            .then(response => {
               // "invalid 1st argument: userOperation invalid user operation fields"
                // console.log(response);
                resolve(response.result)
            })
            .catch(err => console.error(err));
    });
}

export const getUserOperationByHash = async (ops: string[], token: string) : Promise<any> =>  {

    return new Promise( (resolve, reject) : any => {

        const options = {
            method: 'POST',
            headers: {accept: 'application/json', 'content-type': 'application/json'},
            body: JSON.stringify({
              id: 1,
              jsonrpc: '2.0',
              method: 'eth_getUserOperationByHash',
              params: ops
            })
          };
          
        fetch(`https://arb-sepolia.g.alchemy.com/v2/${token}`, options)
            .then(response => response.json())
            .then(response => {
                // console.log(response);
                resolve(response.result)
            })
            .catch(err => console.error(err));
    
    });
}
