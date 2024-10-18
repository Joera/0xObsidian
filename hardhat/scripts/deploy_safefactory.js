const hre = require("hardhat");


async function main() {

  const singleton = await hre.ethers.deployContract("./contracts/safe/GnosisSafe.sol:GnosisSafe");
  await singleton.waitForDeployment();
  console.log(`GnosisSafe singleton deployed to ${singleton.target}`);

  setTimeout( async () => {
      await hre.run("verify:verify", {
        contract: "contracts/safe/GnosisSafe.sol:GnosisSafe",
        address: singleton.target,
        constructorArguments: [],
      });
  },10000);

  // const singletonAddress = "0x2B0c360f87D8Df75cEDb96bB1Dcd10bFB5Fd15da";
    
  const proxy = await hre.ethers.deployContract("./contracts/safe/GnosisSafeProxyFactory.sol:GnosisSafeProxyFactory");
  await proxy.waitForDeployment();
  console.log(`GnosisSafeProxyFactory deployed to ${proxy.target}`);

  setTimeout( async () => {
      await hre.run("verify:verify", {
        contract: "contracts/safe/GnosisSafeProxyFactory.sol:GnosisSafeProxyFactory",
        address: proxy.target,
        constructorArguments: [],
      });
  },10000);

  // const proxyFactoryAddress = "0x55C3CDE97919F8ff1051e20615bD37b5A4EDfe43";
  const factory = await hre.ethers.getContractFactory("./contracts/safe/SafeFactory.sol:SafeFactory");
  const constructorArgs = [
    proxy.target,
    singleton.target
  ];
  const contract = await factory.deploy(...constructorArgs);
  console.log(`GnosisSafeFactory deployed to ${contract.target}`);
  setTimeout( async () => {
      await hre.run("verify:verify", {
        contract: "contracts/safe/SafeFactory.sol:SafeFactory",
        address: contract.target,
        constructorArguments: [proxy.target, singleton.target],
      });
  },10000);
}
  
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

