import { ethers } from "hardhat";

async function main() {
  const defaultUserWalletAddress = process.env.TEST_USER_WALLET_ADDRESS

  const CoinruleSmartWallet = await ethers.getContractFactory("CoinruleSmartWallet");
  const contract = await CoinruleSmartWallet.deploy(defaultUserWalletAddress);
  await contract.deployed();

  console.log(`Contract deployed to ${contract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
