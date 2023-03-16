import { ethers } from "hardhat";

async function main() {
  const defaultUserWalletAddress = process.env.TEST_USER_WALLET_ADDRESS;
  const weth = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
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
