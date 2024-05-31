require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "arb",
  networks: {
    arb: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    ipc: {
      url: "http://localhost:8545",
      accounts: ["d8540985d3f8b0772ce5ac1004393e2d2ac3a902c1b6115a620aa70f27b7592c"]
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
      arbitrumSepolia: 'WIRHP12YN15QTZJAUJWPZ82VKFBPVNQB3Y'
    }
  }
};
