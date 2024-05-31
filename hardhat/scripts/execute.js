const hre = require("hardhat");

// const FACTORY_NONCE = 1;
const FACTORY_ADDRESS = "0x000000e92D78D90000007F0082006FDA09BD5f11"; // 0xB45eF3727ed0C01d5Da8c91e1E1E038826464384"; // "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"; // "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const PAYMASTER_ADDRESS = "0x4Db923a131CF391f56875a9eF16422639EFA6d4b"; // "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";


async function main() {

    const ep = await hre.ethers.getContractAt("EntryPoint", ENTRYPOINT_ADDRESS);
    const af = await hre.ethers.getContractAt("AccountFactory",FACTORY_ADDRESS);
    const account = await hre.ethers.getContractFactory("Account");

    // // smart account address
    // const sender = await hre.ethers.getCreateAddress({
    //     from: FACTORY_ADDRESS,
    //     nonce: FACTORY_NONCE
    // })

    const [signer0] = await hre.ethers.getSigners();
    const address0 = await signer0.getAddress();
    let initCode =  
        FACTORY_ADDRESS + 
        af.interface.encodeFunctionData("createAccount",[address0])
        .slice(2);

    let sender;
    try {
        await ep.getSenderAddress(initCode)
    } catch(ex) {
        sender = '0x' + ex.data.slice(-40);
    }

    const code = await ethers.provider.getCode(sender)
    if (code !== "0x") {
        initCode = "0x";
    }

    console.log({sender}); 

    const callData = account.interface.encodeFunctionData("execute");

    const nonce = "0x" + (await ep.getNonce(sender, 0)).toString(16);
 
    const userOp =  {
        sender, 
        nonce,
        initCode,
        callData,
        paymasterAndData: PAYMASTER_ADDRESS,
        signature: "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
    }

    const { preVerificationGas, verificationGasLimit, callGasLimit} =  await ethers.provider.send("eth_estimateUserOperationGas",[
        userOp,
        ENTRYPOINT_ADDRESS,
        
    ]);

    const { maxFeePerGas } = await ethers.provider.getFeeData();
    const maxPriorityFeePerGas = await ethers.provider.send("rundler_maxPriorityFeePerGas");

    userOp.callGasLimit = callGasLimit;
    userOp.verificationGasLimit = verificationGasLimit;
    userOp.preVerificationGas = preVerificationGas;
    userOp.maxFeePerGas = "0x" + maxFeePerGas.toString(16);
    userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

    const userOpHash = await ep.getUserOpHash(userOp);
    userOp.signature = await signer0.signMessage(hre.ethers.getBytes(userOpHash));

    const opHash = await ethers.provider.send("eth_sendUserOperation", [
        userOp,
        ENTRYPOINT_ADDRESS,
    ]);

    setTimeout(async () => {
        const { transactionHash } = await ethers.provider.send(
        "eth_getUserOperationByHash",
        [opHash]
        );

        console.log(transactionHash);
    }, 10000);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });