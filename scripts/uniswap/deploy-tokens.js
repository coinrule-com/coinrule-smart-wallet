import {ethers} from "hardhat";

export async function deployTokens() {
    const [owner, signer2, signer3, signer4] = await ethers.getSigners();

    const Tether = await ethers.getContractFactory('Tether', owner);
    const tether = await Tether.deploy();

    const Usdc = await ethers.getContractFactory('UsdCoin', owner);
    const usdc = await Usdc.deploy();

    const WrappedBitcoin = await ethers.getContractFactory('WrappedBitcoin', owner);
    const wrappedBitcoin = await WrappedBitcoin.deploy();

    await tether.connect(owner).mint(
        owner.address,
        ethers.utils.parseEther('100000')
    )
    await usdc.connect(owner).mint(
        owner.address,
        ethers.utils.parseEther('100000')
    )
    await wrappedBitcoin.connect(owner).mint(
        owner.address,
        ethers.utils.parseEther('100000')
    )

    await tether.connect(owner).mint(
        signer2.address,
        ethers.utils.parseEther('10000000')
    )
    await usdc.connect(owner).mint(
        signer2.address,
        ethers.utils.parseEther('10000000')
    )
    await wrappedBitcoin.connect(owner).mint(
        signer2.address,
        ethers.utils.parseEther('10000000')
    )

    await tether.connect(owner).mint(
        signer3.address,
        ethers.utils.parseEther('100000')
    )
    await usdc.connect(owner).mint(
        signer3.address,
        ethers.utils.parseEther('100000')
    )
    await wrappedBitcoin.connect(owner).mint(
        signer3.address,
        ethers.utils.parseEther('100000')
    )

    await tether.connect(owner).mint(
        signer4.address,
        ethers.utils.parseEther('100000')
    )
    await usdc.connect(owner).mint(
        signer4.address,
        ethers.utils.parseEther('100000')
    )
    await wrappedBitcoin.connect(owner).mint(
        signer4.address,
        ethers.utils.parseEther('100000')
    )

    console.log('const TETHER_ADDRESS=', `'${tether.address}'`)
    console.log('const USDC_ADDRESS=', `'${usdc.address}'`)
    console.log('const WRAPPED_BITCOIN_ADDRESS=', `'${wrappedBitcoin.address}'`)
    return {
        tetherAddress: tether.address,
        usdcAddress: usdc.address,
        wBtcAddress: wrappedBitcoin.address,
    }
}