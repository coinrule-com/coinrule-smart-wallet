import {ethers} from "hardhat";

async function main() {
    const [owner] = await ethers.getSigners();

    const Tether = await ethers.getContractFactory('Tether', owner);
    const tether = await Tether.deploy();

    const Usdc = await ethers.getContractFactory('UsdCoin', owner);
    const usdc = await Usdc.deploy();

    const WrappedBitcoin = await ethers.getContractFactory('WrappedBitcoin', owner);
    const wrappedBitcoin = await WrappedBitcoin.deploy();


    console.log('const TETHER_ADDRESS=', `'${tether.address}'`)
    console.log('const USDC_ADDRESS=', `'${usdc.address}'`)
    console.log('const WRAPPED_BITCOIN_ADDRESS=', `'${wrappedBitcoin.address}'`)

    const mintedAmount = '100000'
    await tether.connect(owner).mint(
        owner.address,
        ethers.utils.parseEther(mintedAmount)
    )
    await usdc.connect(owner).mint(
        owner.address,
        ethers.utils.parseEther(mintedAmount)
    )
    await wrappedBitcoin.connect(owner).mint(
        owner.address,
        ethers.utils.parseEther(mintedAmount)
    )
    console.log(`Minted token for the user ${owner.address} amount: ${mintedAmount} of all tokens`)
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
