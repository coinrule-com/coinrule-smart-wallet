import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {ECR20ABI} from "./Ecr20Abi";
import {BigNumber} from "ethers";
import {deployAll} from "./fixtures";
import {UniswapFacet} from "../typechain-types/contracts/facets/UniswapFacet";
import {DepositFacet, ExchangeAddressesFacet, SafeModeFacet} from "../typechain-types";

describe("Coinrule Smart Wallet safe mode", () => {
    const ruleId = 'TestRuleId';

    describe("safe mode enabled", () => {
        it('should reject swap', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                randomUser,
                coinruleAdmin,
                addresses,
                coinruleMaster
            } = await loadFixture(deployAll);
            const swapContract = await ethers.getContractAt('UniswapFacet', coinruleSmartWallet.address);
            const tetherTokenAddress = addresses?.tetherAddress || "0x0165878A594ca255338adfa4d48449f69242Eb8F"; // Tether
            const usdcTokenAddress = addresses?.usdcAddress || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"; // USDC
            const swapRouter = addresses?.swapRouterAddress || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // hardhat
            const tokenInContract = new ethers.Contract(tetherTokenAddress, ECR20ABI, coinruleAdmin)
            const fee = 500; // 0.05
            const tokenValue = 15;
            const tokenValueForUniSwap = BigNumber.from((tokenValue * 10 ** (await tokenInContract.decimals())).toString()); // uint amountIn = 15 * 10 ** DAI.decimals();
            const estimatedGasFeesInBaseCurrency = BigNumber.from((0.5 * 10 ** (await tokenInContract.decimals())).toString());
            const deadline = 15 * 60;
            const orderId = "test"
            const swapper = await ethers.getContractAt('UniswapFacet', coinruleSmartWallet.address, coinruleAdmin);
            const coinruleFeeRate = 2 // percents
            const params: UniswapFacet.SwapOnUniswapParamsStruct = {
                _tokenAddressIn: tetherTokenAddress,
                _tokenAddressOut: usdcTokenAddress,
                _swapRouter: swapRouter,
                _poolFee: fee,
                _amountIn: tokenValueForUniSwap,
                _ruleId: ruleId,
                _orderId: orderId,
                _deadline: deadline,
                _amountOutMinimum: 0,
                _sqrtPriceLimitX96: 0,
                _coinruleFeeRate: coinruleFeeRate,
                _estimatedGasFees: estimatedGasFeesInBaseCurrency
            }

            const masterAdmin = await ethers.getContractAt('SafeModeFacet', coinruleSmartWallet.address, coinruleMaster) as SafeModeFacet;

            await masterAdmin.enableSafeMode('enable safe mode for tests')
            const safeModeStatus = await masterAdmin.viewSafeModeStatus();
            expect(safeModeStatus).to.be.true;

            await expect(swapper.swapOnUniswap(params, {gasLimit: 25000000})).to.be.revertedWith('Safe mode is enabled, feature is disabled contact coinrule support');

        });

        it('should reject deposit', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                randomUser,
                coinruleAdmin,
                addresses,
                coinruleMaster,
                wEth
            } = await loadFixture(deployAll);
            const masterAdmin = await ethers.getContractAt('SafeModeFacet', coinruleSmartWallet.address, coinruleMaster) as SafeModeFacet;

            await masterAdmin.enableSafeMode('enable safe mode for tests')
            const safeModeStatus = await masterAdmin.viewSafeModeStatus();
            expect(safeModeStatus).to.be.true;

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            const depositer = await ethers.getContractAt('DepositFacet', coinruleSmartWallet.address, owner) as DepositFacet;


            await expect(depositer.deposit(ruleId, wEth.address, tokenAmountInEthers, true, {
                value: tokenAmountInEthers,
                gasLimit: 25000000
            })).to.be.revertedWith('Safe mode is enabled, feature is disabled contact coinrule support');


        });

        it('should reject add approved address', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                randomUser,
                coinruleAdmin,
                addresses,
                coinruleMaster,
                wEth
            } = await loadFixture(deployAll);
            const masterAdmin = await ethers.getContractAt('SafeModeFacet', coinruleSmartWallet.address, coinruleMaster) as SafeModeFacet;

            await masterAdmin.enableSafeMode('enable safe mode for tests')
            const safeModeStatus = await masterAdmin.viewSafeModeStatus();
            expect(safeModeStatus).to.be.true;

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            const exchangeAddressesFacet = await ethers.getContractAt('ExchangeAddressesFacet', coinruleSmartWallet.address, owner) as ExchangeAddressesFacet;

            await expect(exchangeAddressesFacet.addAddress(owner.address)).to.be.revertedWith('Safe mode is enabled, feature is disabled contact coinrule support');


        });

        it('should reject add approved address and then accept it after disabling the safe mode', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                randomUser,
                coinruleAdmin,
                addresses,
                coinruleMaster,
                wEth
            } = await loadFixture(deployAll);
            const masterAdmin = await ethers.getContractAt('SafeModeFacet', coinruleSmartWallet.address, coinruleMaster) as SafeModeFacet;

            await masterAdmin.enableSafeMode('enable safe mode for tests')
            const safeModeStatus = await masterAdmin.viewSafeModeStatus();
            expect(safeModeStatus).to.be.true;

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            const exchangeAddressesFacet = await ethers.getContractAt('ExchangeAddressesFacet', coinruleSmartWallet.address, owner) as ExchangeAddressesFacet;

            await expect(exchangeAddressesFacet.addAddress(owner.address)).to.be.revertedWith('Safe mode is enabled, feature is disabled contact coinrule support');

            await masterAdmin.disableSafeMode('disable safe mode for tests');

            await expect(exchangeAddressesFacet.addAddress(owner.address)).to.be.not.revertedWith('Safe mode is enabled, feature is disabled contact coinrule support');

        });

        it('should reject approve exchange to swap', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                randomUser,
                coinruleAdmin,
                addresses,
                coinruleMaster,
                wEth
            } = await loadFixture(deployAll);
            const masterAdmin = await ethers.getContractAt('SafeModeFacet', coinruleSmartWallet.address, coinruleMaster) as SafeModeFacet;

            await masterAdmin.enableSafeMode('enable safe mode for tests')
            const safeModeStatus = await masterAdmin.viewSafeModeStatus();
            expect(safeModeStatus).to.be.true;

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            const exchangeAddressesFacet = await ethers.getContractAt('ExchangeAddressesFacet', coinruleSmartWallet.address, coinruleAdmin) as ExchangeAddressesFacet;


            await expect(exchangeAddressesFacet.approveExchangeAddress(wEth.address, 5, owner.address)).to.be.revertedWith('Safe mode is enabled, feature is disabled contact coinrule support');


        });

    });
});
