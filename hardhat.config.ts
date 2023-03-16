import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-solhint";
import "solidity-coverage";
import "hardhat-gas-reporter";

const ALCHEMY_KEY = process.env.ALCHEMY_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100000,
        details: {
          yul: false,
        },
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [process.env.SEPOLIA_ACCOUNT_KEY!],
      chainId: 11155111,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [process.env.ACCOUNT_KEY!!],
      chainId: 5,
      gas: 2100000,
      gasPrice: 8000000000,
      timeout: 60000,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [process.env.ACCOUNT_KEY!!],
    },
    arbitrum: {
      url: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [process.env.ACCOUNT_KEY!!],
      chainId: 42161,
    },
    arbitrumtestnet: {
      url: `https://arb-goerli.g.alchemy.com/v2/${process.env.INFURA_KEY_ARBITRUM_TEST_NET}`,
      accounts: [process.env.ACCOUNT_KEY!!],
      chainId: 421613,
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 23,
  },
};

export default config;
