import { ethers } from "hardhat";
import {Contract, ContractFactory} from "ethers";
import {artifacts} from "./uniswap/common";
const { getSelectors, FacetCutAction } = require('./libraries/diamond.js')

export async function deployDiamond(weth: Contract) {

  const accounts = await ethers.getSigners();
  const coinrule = accounts[0];
  const owner = accounts[1];

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
    'DepositFacet',
    'ExchangeAddressesFacet',
    'OwnershipFacet',
    'UniswapFacet',
    'ViewBalancesFacet',
    'WithdrawFacet',
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
  const wallet = await Wallet.deploy(owner.address, diamondCutFacet.address, weth.address, cut)
  await wallet.deployed()
  console.log('CoinruleSmartWallet (Diamond) deployed:', wallet.address)

  console.log('Completed diamond cut')
  return wallet.address
}

async function deployWeth() {
  const [coinrule] = await ethers.getSigners();
  const Weth = new ContractFactory(artifacts.WETH9.abi, artifacts.WETH9.bytecode, coinrule);
  return await Weth.deploy();
}

if (require.main === module) {
  deployWeth()
    .then(weth => deployDiamond(weth))
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    })
}