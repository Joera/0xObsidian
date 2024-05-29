const hre = require("hardhat");
// const AF  = require("../ignition/modules/AccountFactory");
// const PM  = require("../ignition/modules/Paymaster");
// const EP = require("../ignition/modules/EntryPoint");


async function main() {
    // const af = await hre.ethers.deployContract("AccountFactory");
    // await af.waitForDeployment();
    // console.log(`AF deployed to ${af.target}`);
    const pod = await hre.ethers.deployContract("PodFactory");
    await pod.waitForDeployment();
    console.log(`POD deployed to ${pod.target}`);


    // await hre.run("verify:verify", {
    //     address: pod.target,
    //     contract: "contracts/Pod.sol:PodFactory", //Filename.sol:ClassName
    //     constructorArguments: []
    // });

  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

