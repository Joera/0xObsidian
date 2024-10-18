require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "base_sepolia",
  networks: {
    arb_sepolia: {
      url: process.env.ARB_SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    base_sepolia : {
      url: process.env.BASE_SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: 'WIRHP12YN15QTZJAUJWPZ82VKFBPVNQB3Y',
      baseSepolia: 'Y9FK2UGZAIBRUSQV5ZK3A6Z9YDDS14MV8E'
    }
  }
};
