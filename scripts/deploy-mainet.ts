import { ethers } from "hardhat";

async function main() {
  const defaultUserWalletAddress = process.env.TEST_USER_WALLET_ADDRESS;
  const weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  const CoinruleSmartWallet = await ethers.getContractFactory("CoinruleSmartWallet");
  console.log(`Contract getting deployed ...`);
  const contract = await CoinruleSmartWallet.deploy(defaultUserWalletAddress, weth);
  await contract.deployed();

  console.log(`Contract deployed to ${contract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
