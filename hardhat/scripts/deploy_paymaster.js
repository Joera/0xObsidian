const hre = require("hardhat");
// const AF  = require("../ignition/modules/AccountFactory");
// const PM  = require("../ignition/modules/Paymaster");
// const EP = require("../ignition/modules/EntryPoint");


async function main() {
 
    const pub = await hre.ethers.deployContract("Paymaster");
    await pub.waitForDeployment();
    console.log(`PAYMASTER deployed to ${pub.target}`);
  
    setTimeout( async () => {
        await hre.run("verify:verify", {
          address: pub.target,
          constructorArguments: [],
        });
    },10000);
    

  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

