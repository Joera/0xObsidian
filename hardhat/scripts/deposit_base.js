const hre = require("hardhat");

const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const PAYMASTER_ADDRESS = "0x0973c724e3300783526c76B407a32Fa15Cf97e5b";

async function main() {
    const entryPoint = await hre.ethers.getContractAt("EntryPoint", ENTRYPOINT_ADDRESS);
  
    await entryPoint.depositTo(PAYMASTER_ADDRESS, {
      value: hre.ethers.parseEther(".1"),
    });
  
    console.log("deposit was successful!");
  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });