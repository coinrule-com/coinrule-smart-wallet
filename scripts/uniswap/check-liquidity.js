// pool
const USDT_USDC_500= '0x1FA8DDa81477A5b6FA1b2e149e93ed9C7928992F'

const UniswapV3Pool = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json")
const { Contract } = require("ethers")
const {ethers} = require("hardhat");

async function getPoolData(poolContract) {
    const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
        poolContract.tickSpacing(),
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0(),
    ])

    return {
        tickSpacing: tickSpacing,
        fee: fee,
        liquidity: ethers.utils.formatEther(liquidity.toString()),
        sqrtPriceX96: ethers.utils.formatEther(slot0[0]),
        tick: slot0[1],
    }
}


async function main() {
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    const poolContract = new Contract(USDT_USDC_500, UniswapV3Pool.abi, provider)
    const poolData = await getPoolData(poolContract)
    console.log('poolData', poolData)
}

/*
npx hardhat run --network localhost scripts/uniswap/check-liquidity.js
*/

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });