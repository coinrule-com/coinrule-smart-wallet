import {ethers} from "hardhat";
import {FacetCutAction, getSelectors} from "./libraries/diamond";
import * as SmartContractPackage from "../package.json"

const fs = require('fs');

async function main() {
    const defaultUserWalletAddress = "0x152f8a42519717cb91A1796000bdFaCFF9397734";
    const coinruleMasterAddress = "0x152f8a42519717cb91A1796000bdFaCFF9397734";
    const weth = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"

    console.log(`Deploying diamond components to arbitrum...`);

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
    const cuts = []
    for (const FacetName of FacetNames) {
        const Facet = await ethers.getContractFactory(FacetName)
        const facet = await Facet.deploy()
        await facet.deployed()
        console.log(`${FacetName} deployed: ${facet.address}`)
        cuts.push(
            {
                name: FacetName,
                facetAddress: facet.address,
                action: FacetCutAction.Add,
                functionSelectors: getSelectors(facet)
            })
    }

    cuts.push({
        name: 'DiamondCutFacet',
        facetAddress: diamondCutFacet.address,
        action: diamondCutFacet.Add,
        functionSelectors: getSelectors(diamondCutFacet)
    })
    console.log('Diamond Cut:', cuts)
    /*
        // 4. Deploy Wallet Diamond
        const Wallet = await ethers.getContractFactory('CoinruleSmartWallet')
        const wallet = await Wallet.deploy(defaultUserWalletAddress, coinruleMasterAddress, diamondCutFacet.address, weth, cuts)
        await wallet.deployed()
        console.log('CoinruleSmartWallet (Diamond) deployed:', wallet.address)
    */
    console.log('Completed diamond cut')

    console.log('storing facets result in facetsArbitrum.json')
    fs.writeFile('facetsArbitrum.json', JSON.stringify({
            "arbitrum": {
                id: SmartContractPackage.version,
                facets: cuts
            }
        }), 'utf8', (err: Error) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log("File has been created");
        }
    );

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
