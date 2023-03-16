import {ethers} from "hardhat";
import {Contract} from "ethers";
import {Token} from "@uniswap/sdk-core";
import {nearestUsableTick, Pool, Position} from "@uniswap/v3-sdk";
import {artifacts, getPoolData} from "./common";

export async function deployLiquidity(addresses, poolAddress, provider) {
    const [owner, signer2] = await ethers.getSigners();

    const usdtContract = new Contract(addresses.tetherAddress, artifacts.Usdt.abi, provider)
    const usdcContract = new Contract(addresses.usdcAddress, artifacts.Usdc.abi, provider)

    await usdtContract.connect(signer2).approve(addresses.nftPosManagerAddress, ethers.utils.parseEther('1000000'))
    await usdcContract.connect(signer2).approve(addresses.nftPosManagerAddress, ethers.utils.parseEther('1000000'))

    const poolContract = new Contract(poolAddress, artifacts.UniswapV3Pool.abi, provider)

    const poolData = await getPoolData(poolContract)

    const UsdtToken = new Token(31337, addresses.tetherAddress, await usdtContract.decimals(), 'USDT', 'Tether')
    const UsdcToken = new Token(31337, addresses.usdcAddress, await usdcContract.decimals(), 'USDC', 'UsdCoin')

    const pool = new Pool(
        UsdtToken,
        UsdcToken,
        poolData.fee,
        poolData.sqrtPriceX96.toString(),
        poolData.liquidity.toString(),
        poolData.tick
    )

    const position = new Position({
        pool: pool,
        liquidity: ethers.utils.parseEther('1000000'),
        tickLower: nearestUsableTick(poolData.tick, poolData.tickSpacing) - poolData.tickSpacing * 2,
        tickUpper: nearestUsableTick(poolData.tick, poolData.tickSpacing) + poolData.tickSpacing * 2,
    })

    const {amount0: amount0Desired, amount1: amount1Desired} = position.mintAmounts

    const params = {
        token0: addresses.tetherAddress,
        token1: addresses.usdcAddress,
        fee: poolData.fee,
        tickLower: nearestUsableTick(poolData.tick, poolData.tickSpacing) - poolData.tickSpacing * 2,
        tickUpper: nearestUsableTick(poolData.tick, poolData.tickSpacing) + poolData.tickSpacing * 2,
        amount0Desired: amount0Desired.toString(),
        amount1Desired: amount1Desired.toString(),
        amount0Min: 0,
        amount1Min: 0,
        recipient: signer2.address, //TODO: should be the one swapping against the pool
        // Incorrect it's whoever is providing liquidity to the pool
        // It can be anybody. The liquidity provider collects a fee for providing liquidity
        deadline: Math.floor(Date.now() / 1000) + (60 * 10)
    }

    const nonfungiblePositionManager = new Contract(
        addresses.nftPosManagerAddress,
        artifacts.NonfungiblePositionManager.abi,
        provider
    )
    console.log('poolData before adding liquidity', poolData)

    const tx = await nonfungiblePositionManager.connect(signer2).mint(
        params,
        {gasLimit: '1000000'}
    )
    const receipt = await tx.wait()

    const poolDataAfter = await getPoolData(poolContract)
    console.log('poolData after adding liquidity', poolDataAfter)
}