# Coinrule Smart Contract
## Overview
Coinrule smart wallet, is a smart contract developed in solidity using hardhat framework. 
The main goal of the SC is to provide our users and coinrule with a way to execute automated trades 

## Main features
* Deposit
* Withdrawal
* view balances
* swapOn uniswap 
* Safe mode
* Fee management
* upgrade the contract

## Actors of the contract
* **Coinrule Master:** an account responsible for fees, safe mode, roles management 
* **Admin:** an account responsible for deploying the contract and triggering the swaps on uniswap
* **owner:** an customer account which can deposit and withdraw money. It MUST be the only one in control of all the funds 
## helper links
* [Diamond cut pattern used in the project](https://eips.ethereum.org/EIPS/eip-2535)
* [Hardhat framework used for our development](https://hardhat.org/docs)


### Project structure
* [contracts](contracts)
  * [facets](contracts%2Ffacets) is where all the smart contract logic resides
    * [DepositFacet.sol](contracts%2Ffacets%2FDepositFacet.sol) deposit function 
    * [DiamondCutFacet.sol](contracts%2Ffacets%2FDiamondCutFacet.sol) and [DiamondLoupeFacet.sol](contracts%2Ffacets%2FDiamondLoupeFacet.sol) 
    Utils for upgrading the contract, adding/removing facets 
    * [ExchangeAddressesFacet.sol](contracts%2Ffacets%2FExchangeAddressesFacet.sol) responsible for adding/removing and approving an exchange address
    * [FeeManagementFacet.sol](contracts%2Ffacets%2FFeeManagementFacet.sol) this is where the coinrule+gas fees are collected and withdraw
    * [OwnershipFacet.sol](contracts%2Ffacets%2FOwnershipFacet.sol) managing changes of roles Admin,Master,Owner
    * [SafeModeFacet.sol](contracts%2Ffacets%2FSafeModeFacet.sol) enabling and disabling safe mode which is used to disable most of the contract functionalities in case of security breach
    * [UniswapFacet.sol](contracts%2Ffacets%2FUniswapFacet.sol) Interaction with uniswap + the fee calculation
    * [ViewBalancesFacet.sol](contracts%2Ffacets%2FViewBalancesFacet.sol) view rule balance and contract balance
    * [WithdrawFacet.sol](contracts%2Ffacets%2FWithdrawFacet.sol) withdraw of funds from the contract
  * [init](contracts%2Finit) contract that is part of the DiamonCut pattern, responsible for deploying all the utilities to support upgradibility  
  * [interfaces](contracts%2Finterfaces) interface and types needed for the SC
  * [libraries](contracts%2Flibraries) mostly helpers and utils functions, it contains also the [LibDiamond.sol](contracts%2Flibraries%2FLibDiamond.sol) which is responsible for the contract storage 
  * [shared](contracts%2Fshared) our custom access modifers used to control permissions as well as safe mode 
  * [test](contracts%2Ftest) contract used in our tests
  * [CoinruleSmartWallet.sol](contracts%2FCoinruleSmartWallet.sol) the main contract definition
* [public](public) containing public files of the testing webapp we have 
* [scripts](scripts) mostly deployment scripts to different networks
* [src](src) the webapp used for e2e tests
* [test](test) automated tests for the project

### How to run tests
### functional test:  
All Tests are run against a local hardhat node. First any test before it runs it calls the loadFixture function which 
will deploy the smart contract and all the other services testTokens, uniswap etc .. 
```shell
yarn install
create .env file based on the .env.example
yarn compile
yarn test:coverage
```

### Test in testnet (E2E):
```shell
yarn install
export $(cat .env )
yarn dev:deploygoerli
yarn dev:testwebapp
```
A React app will run on port 3000. 