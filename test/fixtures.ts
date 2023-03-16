import {ethers} from "hardhat";
import {ContractFactory} from "ethers";
import {artifacts} from "../scripts/uniswap/common";
import {deployAllViaHardhat} from "../scripts/uniswap/deploy-all";
import {FacetCutAction, getSelectors} from "../scripts/libraries/diamond";

async function deployCoinruleSmartWalletContract() {
    // Contracts are deployed using the first signer/account by default
    const [coinrule, owner, randomUser, coinruleMaster] = await ethers.getSigners();
    const {token: weth} = await deployWEth()

    // 1. Deploy DiamondCutFacet
    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
    const diamondCutFacet = await DiamondCutFacet.deploy()
    await diamondCutFacet.deployed()

    // 2. Deploy DiamondInit
    const DiamondInit = await ethers.getContractFactory('DiamondInit')
    const diamondInit = await DiamondInit.deploy()
    await diamondInit.deployed()

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
        cut.push({
            facetAddress: facet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(facet)
        })
    }

    // 4. Deploy Wallet Diamond
    const Wallet = await ethers.getContractFactory('CoinruleSmartWallet')
    const wallet = await Wallet.deploy(owner.address, coinruleMaster.address, diamondCutFacet.address, weth.address, cut)
    await wallet.deployed()

    // transfer some eth from coinrule to owner
    return {coinruleAdmin: coinrule, coinruleMaster, owner, randomUser, wallet, wEth: weth};
}

async function deployUniswapRouterWithCoinruleWallet() {
    const addresses = await deployAllViaHardhat();

    const {coinruleAdmin, coinruleMaster, owner, randomUser, wallet, wEth} = await deployCoinruleSmartWalletContract();

    return {
        coinruleAdmin, coinruleMaster, owner, randomUser, wallet, wEth, addresses,
    }
}


async function deployTestTokenGold() {
    const TestToken = await ethers.getContractFactory("TestTokenGold");
    const testToken = await TestToken.deploy();
    const deploymentTransaction = await testToken.deployed();
    return {token: testToken, deploymentTransaction: deploymentTransaction};
}

async function deployTestTokenSilver() {
    const TestToken = await ethers.getContractFactory("TestTokenSilver");
    const testToken = await TestToken.deploy();
    const deploymentTransaction = await testToken.deployed();
    return {token: testToken, deploymentTransaction: deploymentTransaction};
}

async function deployWEth() {
    const [owner] = await ethers.getSigners();
    const Weth = new ContractFactory(artifacts.WETH9.abi, artifacts.WETH9.bytecode, owner);
    const weth = await Weth.deploy();
    await weth.deployed();

    return {token: weth}
}

async function deploySmartWalletWithTokens() {
    const {coinruleAdmin, owner, randomUser, wallet, wEth} = await deployCoinruleSmartWalletContract();

    const {token: goldToken} = await deployTestTokenGold();
    const {token: silverToken} = await deployTestTokenSilver();

    return {
        coinruleAdmin, owner, randomUser, wallet, wEth, goldToken, silverToken,
    }
}

export async function deployAll() {
    const {coinruleAdmin, coinruleMaster, owner, randomUser, wallet, wEth, addresses} = await deployUniswapRouterWithCoinruleWallet();

    const {token: goldToken} = await deployTestTokenGold();
    const {token: silverToken} = await deployTestTokenSilver();

    return {
        coinruleAdmin, coinruleMaster, owner, randomUser, wallet, wEth, addresses, goldToken, silverToken,
    }
}