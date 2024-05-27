const hre = require("hardhat");

const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const PAYMASTER_ADDRESS = "0x4Db923a131CF391f56875a9eF16422639EFA6d4b";

async function main() {
    const entryPoint = await hre.ethers.getContractAt("EntryPoint", ENTRYPOINT_ADDRESS);
  
    await entryPoint.depositTo(PAYMASTER_ADDRESS, {
      value: hre.ethers.parseEther(".01"),
    });
  
    console.log("deposit was successful!");
  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });