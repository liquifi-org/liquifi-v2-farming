import { HardhatUserConfig } from "hardhat/types"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@openzeppelin/hardhat-upgrades"

import { apiKey, privateKey } from "./wallet"

import "solidity-coverage"

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.2",
        settings: {
          optimizer: { enabled: true, runs: 2000 },
          outputSelection: {
            "*": {
              "*": ["storageLayout"],
            },
          },
        },
      },
    ],
  },
  networks: {
    bsctestnet: {
      url: "https://data-seed-prebsc-2-s1.binance.org:8545/",
      // url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: [privateKey],
      chainId: 97,
      gasPrice: 20000000000,
    },
    bscmainnet: {
      url: "https://bsc-dataseed.binance.org/",
      accounts: [privateKey],
      chainId: 56,
      gasPrice: 5000000000,
    },
    // hardhat: {
    //   throwOnTransactionFailures: true,
    //   throwOnCallFailures: true,
    //   blockGasLimit: 15000000,
    //   gasMultiplier: 1.5,
    //   allowUnlimitedContractSize: true,
    // }
  },
  etherscan: {
    apiKey: apiKey,
  },
}

export default config
