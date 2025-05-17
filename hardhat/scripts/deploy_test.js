// import { ethers } from "hardhat";

async function main() {
  const NFTtest = await ethers.getContractFactory("NFTtest");
  const nftTest = await NFTtest.deploy();
  await nftTest.waitForDeployment();

  const deployedAddress = await nftTest.getAddress();
  console.log("NFTtest deployed to:", deployedAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });