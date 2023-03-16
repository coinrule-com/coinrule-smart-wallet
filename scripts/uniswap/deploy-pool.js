import {Contract} from "ethers";
import {artifacts} from "./common";
import {ethers} from "hardhat";

export async function deployPool(addresses, token0, token1, fee, price, provider) {

    const prefix = "'\x1b[33m%s\x1b[0m'";

    const nonfungiblePositionManager = new Contract(
        addresses.nftPosManagerAddress,
        artifacts.NonfungiblePositionManager.abi,
        provider
    )
    const factory = new Contract(
        addresses.factoryAddress,
        artifacts.UniswapV3Factory.abi,
        provider
    )
    console.log(prefix, "--- contracts created");

    const [owner] = await ethers.getSigners();
    console.log(prefix, "--- got signers");

    console.log({
        token0,
        token1,
        fee,
        price,
    })

    await nonfungiblePositionManager.connect(owner).createAndInitializePoolIfNecessary(
        token0,
        token1,
        fee,
        price,
        {gasLimit: 9000000}
    )


    console.log(prefix, "--- created pool");
    const poolAddress = await factory.connect(owner).getPool(
        token0,
        token1,
        fee,
    )
    console.log(prefix, "--- returning pool");
    return {poolAddress}
}