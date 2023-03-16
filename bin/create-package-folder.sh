#!/usr/bin/env bash

FOLDER=./package

mkdir -p $FOLDER
cp ./artifacts/contracts/CoinruleSmartWallet.sol/CoinruleSmartWallet.json $FOLDER
cp ./artifacts/contracts/facets/DepositFacet.sol/DepositFacet.json $FOLDER
cp ./artifacts/contracts/facets/DiamondCutFacet.sol/DiamondCutFacet.json $FOLDER
cp ./artifacts/contracts/facets/DiamondLoupeFacet.sol/DiamondLoupeFacet.json $FOLDER
cp ./artifacts/contracts/facets/ExchangeAddressesFacet.sol/ExchangeAddressesFacet.json $FOLDER
cp ./artifacts/contracts/facets/FeeManagementFacet.sol/FeeManagementFacet.json $FOLDER
cp ./artifacts/contracts/facets/OwnershipFacet.sol/OwnershipFacet.json $FOLDER
cp ./artifacts/contracts/facets/SafeModeFacet.sol/SafeModeFacet.json $FOLDER
cp ./artifacts/contracts/facets/UniswapFacet.sol/UniswapFacet.json $FOLDER
cp ./artifacts/contracts/facets/ViewBalancesFacet.sol/ViewBalancesFacet.json $FOLDER
cp ./artifacts/contracts/facets/WithdrawFacet.sol/WithdrawFacet.json $FOLDER
