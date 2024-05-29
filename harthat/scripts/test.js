const hre = require("hardhat");

const ACCOUNT_ADDRESS = "0xbc8229e267091ca0f410ee395bb3822a96efd253";
// const ENTRYPOINT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
// const PAYMASTER_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

async function main() {

    const account = await hre.ethers.getContractAt("Account", ACCOUNT_ADDRESS);
    const count = await account.count();
    console.log(count);

    // const ac_b = await hre.ethers.provider.getBalance(ACCOUNT_ADDRESS);
    // console.log("ac: " + ac_b);

    // const ep = await hre.ethers.getContractAt("EntryPoint", ENTRYPOINT_ADDRESS);
    // const ep_b = await ep.balanceOf(PAYMASTER_ADDRESS);
    // console.log("paymaster balance: " + ep_b);

}

main()