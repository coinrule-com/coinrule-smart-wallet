import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {ECR20ABI} from "./Ecr20Abi";
import {BigNumber} from "ethers";
import {deployAll} from "./fixtures";
import {UniswapFacet} from "../typechain-types/contracts/facets/UniswapFacet";
import {FeeManagementFacet} from "../typechain-types";

describe("Coinrule Smart Wallet fee management", () => {
    const ruleId = 'TestRuleId';

    describe("withdrawCollectedFees & viewCollectedFees", () => {
        it('should swap, viewCollectedFees and then withdrawCollectedFees', async () => {
            const {wallet: coinruleSmartWallet, owner, coinruleAdmin, addresses, coinruleMaster} = await loadFixture(deployAll);

            const swapContract = await ethers.getContractAt('UniswapFacet', coinruleSmartWallet.address);

            const tetherTokenAddress = addresses?.tetherAddress || "0x0165878A594ca255338adfa4d48449f69242Eb8F"; // Tether
            const usdcTokenAddress = addresses?.usdcAddress || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"; // USDC
            const swapRouter = addresses?.swapRouterAddress || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // hardhat

            const tokenInContract = new ethers.Contract(tetherTokenAddress, ECR20ABI, coinruleAdmin)
            const tokenOutContract = new ethers.Contract(usdcTokenAddress, ECR20ABI, coinruleAdmin)


            const fee = 500; // 0.05
            const tokenValue = 15;
            const tokenValueForUniSwap = BigNumber.from((tokenValue * 10 ** (await tokenInContract.decimals())).toString()); // uint amountIn = 15 * 10 ** DAI.decimals();
            const estimatedGasFeesInBaseCurrency = BigNumber.from((0.5 * 10 ** (await tokenInContract.decimals())).toString());
            const tokenValueInEther = ethers.utils.parseEther(tokenValue.toString());
            const deadline = 15 * 60;
            const orderId = "test"

            /* Deposit in the smart wallet */
            await tokenInContract.connect(owner).approve(coinruleSmartWallet.address, tokenValueInEther, {gasLimit: 2500000});
            await tokenInContract.connect(owner).approve(coinruleSmartWallet.address, tetherTokenAddress, {gasLimit: 2500000})
            const depositor = await ethers.getContractAt('DepositFacet', coinruleSmartWallet.address, owner);
            const transactionDeposit = await depositor.deposit(ruleId, tetherTokenAddress, tokenValueInEther, false, {gasLimit: 25000000})
            await transactionDeposit.wait()

            /* Swap using the smart wallet   */
            const approver = await ethers.getContractAt('ExchangeAddressesFacet', coinruleSmartWallet.address, owner);
            const approverCoinruleAdmin = await ethers.getContractAt('ExchangeAddressesFacet', coinruleSmartWallet.address, coinruleAdmin);

            await approver.addAddress(swapRouter.toString(), {gasLimit: 25000000})
            const approve = await approverCoinruleAdmin.approveExchangeAddress(tetherTokenAddress.toString(), tokenValueForUniSwap, swapRouter.toString(), {gasLimit: 25000000});
            await approve.wait()

            const swapper = await ethers.getContractAt('UniswapFacet', coinruleSmartWallet.address, coinruleAdmin);
            const coinruleFeeRate = 2 * 100 // percents
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
            await expect(swapper.swapOnUniswap(params, {gasLimit: 25000000})).to.emit(swapContract, 'SwapSucceeded');

            const walletUSDTBalance = ethers.utils.formatEther(await tokenInContract.connect(owner).balanceOf(coinruleSmartWallet.address));
            const walletUSDCBalance = ethers.utils.formatEther(await tokenOutContract.connect(owner).balanceOf(coinruleSmartWallet.address));
            const walletUSDCCalculatedBalance = tokenValue - (tokenValue * 0.02) - 0.5 // amount - coinruleFee - gasFee
            const walletUSDTCalculatedBalance = (tokenValue * 0.02) + 0.5 // 0.8

            // check contract balance on the ECR20
            expect(Number(walletUSDTBalance)).to.be.equal(walletUSDTCalculatedBalance); // coinruleFee - gasFee
            expect(parseFloat(walletUSDCBalance).toFixed(1)).to.be.equal(walletUSDCCalculatedBalance.toFixed(1));
            const viewer = await ethers.getContractAt('ViewBalancesFacet', coinruleSmartWallet.address, owner)
            // check rule balance
            const {0: ruleBalancesAfter, 1: cursor3} = await viewer.viewRuleBalance(ruleId, 0, 10);
            expect((ruleBalancesAfter as Array<any>).find((item) => item.token.toString() === tetherTokenAddress).amount.toString())
                .to.be.equal(ethers.utils.parseEther('0'))
            expect((ruleBalancesAfter as Array<any>).find((item) => item.token.toString() === usdcTokenAddress).amount.toString())
                .to.be.approximately(ethers.utils.parseEther(walletUSDCCalculatedBalance.toString()), ethers.utils.parseEther("1"))

            // check contract balance
            const {0: contractBalancesAfter, 1: cursor4} = await viewer.viewContractBalance(0, 10);
            expect(ethers.utils.formatEther((contractBalancesAfter as Array<any>).find((item) => item.token.toString() === tetherTokenAddress).amount.toString()))
                .to.be.equal('0.0')
            expect((contractBalancesAfter as Array<any>).find((item) => item.token.toString() === usdcTokenAddress).amount.toString())
                .to.be.approximately(ethers.utils.parseEther(walletUSDCCalculatedBalance.toString()), ethers.utils.parseEther("1"))

            /* View contract balance */
            const feeManager = await ethers.getContractAt('FeeManagementFacet', coinruleSmartWallet.address, coinruleAdmin) as FeeManagementFacet
            const {0: feeBalance, 1: cursor5} = await feeManager.viewCollectedFees(0, 10);
            const tokenFeeBalance = (feeBalance as Array<any>).find((item) => item.token.toString() === tetherTokenAddress).amount.toString()
            const coinruleMasterBalanceBefore = ethers.utils.formatEther(await tokenInContract.connect(coinruleMaster).balanceOf(coinruleMaster.address));
            expect(ethers.utils.formatEther(tokenFeeBalance)).to.be.equal('0.8')
            expect(coinruleMasterBalanceBefore).to.be.equal('100000.0')


            const tx = await feeManager.withdrawCollectedFees(tetherTokenAddress, tokenFeeBalance)
            await tx.wait();

            const {0: feeBalanceAfterWithdraw, 1: cursor6} = await feeManager.viewCollectedFees(0, 10);
            const tokenFeeBalanceAfterWithdraw = (feeBalanceAfterWithdraw as Array<any>).find((item) => item.token.toString() === tetherTokenAddress).amount.toString()
            expect(ethers.utils.formatEther(tokenFeeBalanceAfterWithdraw)).to.be.equal('0.0')

            const coinruleMasterBalanceAfter = ethers.utils.formatEther(await tokenInContract.connect(coinruleMaster).balanceOf(coinruleMaster.address));
            expect(coinruleMasterBalanceAfter).to.be.equal(String(Number(coinruleMasterBalanceBefore) + 0.8))

        });
    });

});
