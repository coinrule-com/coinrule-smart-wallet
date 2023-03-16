import {deployContracts} from "./deploy-contracts";
import {deployTokens} from "./deploy-tokens";
import {deployPool} from "./deploy-pool";
import {deployLiquidity} from "./deploy-liquidity";
import {BigNumber} from "ethers";
import {ethers} from "hardhat";

const { BigNumber } = require("ethers")
const bn = require('bignumber.js')

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 })

function encodePriceSqrt(reserve1, reserve0) {
    return BigNumber.from(
        new bn(reserve1.toString())
            .div(reserve0.toString())
            .sqrt()
            .multipliedBy(new bn(2).pow(96))
            .integerValue(3)
            .toString()
    )
}

export async function deployAll(provider) {
    try {
        const prefix = "'\x1b[33m%s\x1b[0m'";
        // 1. Deploy Contracts
        const {
            wethAddress,
            factoryAddress,
            swapRouterAddress,
            nftDescriptorAddress,
            nftPosDescriptorAddress,
            nftPosManagerAddress,
        } = await deployContracts();
        console.log(prefix, "Contracts Deployed");

        // 2. Deploy tokens
        const {
            tetherAddress,
            usdcAddress,
            wBtcAddress,
        } = await deployTokens();
        console.log(prefix, "Tokens Deployed");

        const addresses = {
            wethAddress,
            factoryAddress,
            swapRouterAddress,
            nftDescriptorAddress,
            nftPosDescriptorAddress,
            nftPosManagerAddress,
            tetherAddress,
            usdcAddress,
            wBtcAddress,
        };

        // 3. Deploy Pool
        const {poolAddress} = await deployPool(addresses, tetherAddress, usdcAddress, 500, encodePriceSqrt(1, 1), provider);
        console.log(prefix, `Pool Deployed: ${poolAddress.toString()}`);

        console.log('const USDT_USDC_500=', `'${poolAddress}'`)

        // 4. Add Liquidity
        await deployLiquidity(addresses, poolAddress, provider);
        console.log(prefix, "Liquidity Provided to Pool");

        addresses['poolAddress'] = poolAddress;
        return addresses;

    } catch (error) {
        console.error(error);
    }
}

export async function deployAllViaHardhat() {
    const [coinrule] = await ethers.getSigners();
    return deployAll(coinrule.provider);
}