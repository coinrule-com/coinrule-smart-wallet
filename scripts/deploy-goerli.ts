import { ethers } from "hardhat";
import {FacetCutAction, getSelectors} from "./libraries/diamond";

async function main() {
  const owner = process.env.TEST_USER_WALLET_ADDRESS;
  const weth = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"

  console.log(`Deploying diamond components...`);

  // 1. Deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
  const diamondCutFacet = await DiamondCutFacet.deploy()
  await diamondCutFacet.deployed()
  console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

  // 2. Deploy DiamondInit
  const DiamondInit = await ethers.getContractFactory('DiamondInit')
  const diamondInit = await DiamondInit.deploy()
  await diamondInit.deployed()
  console.log('DiamondInit deployed:', diamondInit.address)


  // 3. Deploy all facets
  const FacetNames = [
    'DiamondLoupeFacet',
    'DepositFacet',
    'ExchangeAddressesFacet',
    'OwnershipFacet',
    'UniswapFacet',
    'ViewBalancesFacet',
    'WithdrawFacet',
    'FeeManagementFacet',
    'SafeModeFacet'
  ]
  const cut = []
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName)
    const facet = await Facet.deploy()
    await facet.deployed()
    console.log(`${FacetName} deployed: ${facet.address}`)
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet)
    })
  }
  console.log('Diamond Cut:', cut)

  // 4. Deploy Wallet Diamond
  const Wallet = await ethers.getContractFactory('CoinruleSmartWallet')
  const wallet = await Wallet.deploy(owner, diamondCutFacet.address, weth, cut)
  await wallet.deployed()
  console.log('CoinruleSmartWallet (Diamond) deployed:', wallet.address)

  console.log('Completed diamond cut')
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
