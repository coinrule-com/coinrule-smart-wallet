import WETH9 from "./WETH9.json";
import {ethers} from "hardhat";

export const artifacts = {
    UniswapV3Factory: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json"),
    SwapRouter: require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json"),
    NFTDescriptor: require("@uniswap/v3-periphery/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json"),
    NonfungibleTokenPositionDescriptor: require("@uniswap/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json"),
    NonfungiblePositionManager: require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"),
    WETH9,
    Usdt: require("../../artifacts/contracts/test/Tether.sol/Tether.json"),
    Usdc: require("../../artifacts/contracts/test/UsdCoin.sol/UsdCoin.json"),
    UniswapV3Pool: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json"),
};

export async function getPoolData(pool) {
    const convertToReadable = (number) => {
        if (number > 0) return ethers.utils.formatEther(number.toString())
        return number;
    }

    const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
        pool.tickSpacing(),
        pool.fee(),
        pool.liquidity(),
        pool.slot0(),
    ])

    return {
        tickSpacing: tickSpacing,
        fee: fee,
        liquidity: convertToReadable(liquidity),
        sqrtPriceX96: slot0[0].toString(),
        tick: slot0[1],
    }
}