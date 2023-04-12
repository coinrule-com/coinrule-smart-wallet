# Coinrule Smart Contract


# Overview
Coinrule smart wallet, is a smart contract developed in solidity using hardhat framework. The main goal of the SC is to provide our users and coinrule with a way to execute automated trades



# Features:

## 1. Deposit
This feature is implemented in the `DepositFacet.sol`. The facet has one external function that has the following signature:
```
 deposit(string memory _ruleId, address _tokenAddress, uint256 _tokenAmount, bool isNative) 
 ```
The function acepts two types of deposits ECR20 tokens and etheruem native token ETH, In the native case it always wraps the received amount from ETH -> WETH in order 
to gain advantage of ECR20 features.

In the case of ECR20 deposits the user will always need to call the `approve` Of the token before calling this function, as it uses the `transferFrom` in its implementation.

After the _token transfer_ is finished the function stores the balances per rule in a map  `mapping(string => mapping(address => Wallet)) balances;` which resides in the lib diamond

## 2. Withdrawals
The contract supports multiple kind of withdrawals, most of them are implemented in the `WithdrawFacet.sol` file which has 3 external functions
* withdrawAll: This function is used to withdraw all the value of a certain token and resets the allocation to the rules using it.
* withdrawTokensFromRule: The function is used to withdraw only from a specific one, only this one is used to withdraw multiple tokens at once (in the same transaction)
## 3. Swap on uniswap 
This is the feature that allows trading on uniswp exchange after being triggred by an external event (coinrule) 
the full implementation can be found in `UniswapFacet.sol`.
The Facet has one external function which has 2 modifers  `onlyCoinrule` and `safeModeProtection` which means this function can be called only by the coinrule admin, 
and if the safe mode (discussed in 5.) is active this function will be disabled 

## 4. Fees and balance management
The contract persists two kinds of balances: rules and fees.
The rule balances are store in the map mentioned before balances `mapping(string => mapping(address => Wallet)) balances;` additionally the 
coinrule fees are stored in similar mappin `mapping(address => Wallet) feeBalances;`.

The coinrule fees are allocated each time a trade is executed, where in the `SwapOnUniswapParams` there is _`coinruleFeeRate` and  _`estimatedGasFees` 
which are calculated by coinrule, the gas estimation is based on the average amounts paid for similar transactions. 

* To the view user balances there's two ways of doing it using `viewRuleBalance` `viewContractBalance` that are implemnted in the `ViewBalancesFacet`.
**Note that looking at balances in block exploer will show both balances (fees + user)** 

* For the fee balances the full implementation is in `FeeManagementFacet.sol` where it has the `viewCollectedFees` function to see the balances and 
* a withdrawals function which can be called only by coinrule admins. 
 
## 5. Safe mode
The safe mode was implemented to serve as protection in case of leaked keys (or any sort of emergencies). 
The mode disables the following functionalities:
 * Deposits, trading, exchange approvals
And enables simple types of withdrawals
## 6. OwnerShip management
Roles are assigned at the time of contract creation in the constructor
```
constructor(address _contractOwner, address _coinruleMasterAddress, address _diamondCutFacet, address wethAddress, IDiamondCut.FacetCut[] memory _initialFacets) {
LibDiamond.disableSafeMode("initialisation of safe mode as disabled");
LibDiamond.setContractOwner(_contractOwner);
LibDiamond.setCoinruleAddress(msg.sender);
LibDiamond.setCoinruleMasterAddress(_coinruleMasterAddress);
LibDiamond.setWrappedEth(wethAddress);
```

Roles can be rotated, where admins and master can be changes only using the master account,
and same for the owner using the `transferOwnership -> OwnerShipFacet.sol` the user can be changdd to a new one
The 3 roles are set here, user (owner), admin resposible for deployments and trading, and finally the master account which is mostly for fee managements and safe moed.
## 7. Upgradibility
