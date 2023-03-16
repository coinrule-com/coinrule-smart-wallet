import {ethers} from "hardhat";
import {ContractFactory, utils} from "ethers";
import {artifacts} from "./common";

const linkLibraries = ({ bytecode, linkReferences }, libraries) => {
    Object.keys(linkReferences).forEach((fileName) => {
        Object.keys(linkReferences[fileName]).forEach((contractName) => {
            if (!libraries.hasOwnProperty(contractName)) {
                throw new Error(`Missing link library name ${contractName}`)
            }
            const address = utils
                .getAddress(libraries[contractName])
                .toLowerCase()
                .slice(2)
            linkReferences[fileName][contractName].forEach(
                ({ start, length }) => {
                    const start2 = 2 + start * 2
                    const length2 = length * 2
                    bytecode = bytecode
                        .slice(0, start2)
                        .concat(address)
                        .concat(bytecode.slice(start2 + length2, bytecode.length))
                }
            )
        })
    })
    return bytecode
}

export async function deployContracts() {
    const [owner] = await ethers.getSigners();
    const Weth = new ContractFactory(artifacts.WETH9.abi, artifacts.WETH9.bytecode, owner);
    const weth = await Weth.deploy();

    const Factory = new ContractFactory(artifacts.UniswapV3Factory.abi, artifacts.UniswapV3Factory.bytecode, owner);
    const factory = await Factory.deploy();

    const SwapRouter = new ContractFactory(artifacts.SwapRouter.abi, artifacts.SwapRouter.bytecode, owner);
    const swapRouter = await SwapRouter.deploy(factory.address, weth.address);

    const NFTDescriptor = new ContractFactory(artifacts.NFTDescriptor.abi, artifacts.NFTDescriptor.bytecode, owner);
    const nftDescriptor = await NFTDescriptor.deploy();

    const linkedBytecode = linkLibraries(
        {
            bytecode: artifacts.NonfungibleTokenPositionDescriptor.bytecode,
            linkReferences: {
                "NFTDescriptor.sol": {
                    NFTDescriptor: [
                        {
                            length: 20,
                            start: 1261,
                        },
                    ],
                },
            },
        },
        {
            NFTDescriptor: nftDescriptor.address,
        }
    );

    const NonfungibleTokenPositionDescriptor = new ContractFactory(artifacts.NonfungibleTokenPositionDescriptor.abi, linkedBytecode, owner);
    const nonfungibleTokenPositionDescriptor = await NonfungibleTokenPositionDescriptor.deploy(weth.address);

    const NonfungiblePositionManager = new ContractFactory(artifacts.NonfungiblePositionManager.abi, artifacts.NonfungiblePositionManager.bytecode, owner);
    const nonfungiblePositionManager = await NonfungiblePositionManager.deploy(factory.address, weth.address, nonfungibleTokenPositionDescriptor.address);

    console.log('const WETH_ADDRESS=', `'${weth.address}'`)
    console.log('const FACTORY_ADDRESS=', `'${factory.address}'`)
    console.log('const SWAP_ROUTER_ADDRESS=', `'${swapRouter.address}'`)
    console.log('const NFT_DESCRIPTOR_ADDRESS=', `'${nftDescriptor.address}'`)
    console.log('const POSITION_DESCRIPTOR_ADDRESS=', `'${nonfungibleTokenPositionDescriptor.address}'`)
    console.log('const POSITION_MANAGER_ADDRESS=', `'${nonfungiblePositionManager.address}'`)
    return {
        wethAddress: weth.address,
        factoryAddress: factory.address,
        swapRouterAddress: swapRouter.address,
        nftDescriptorAddress: nftDescriptor.address,
        nftPosDescriptorAddress: nonfungibleTokenPositionDescriptor.address,
        nftPosManagerAddress: nonfungiblePositionManager.address,
    }
}