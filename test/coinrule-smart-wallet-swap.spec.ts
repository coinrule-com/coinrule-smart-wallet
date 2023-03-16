import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {ECR20ABI} from "./Ecr20Abi";
import {BigNumber} from "ethers";
import {deployAll} from "./fixtures";
import {UniswapFacet} from "../typechain-types/contracts/facets/UniswapFacet";

describe("Coinrule Smart Wallet Swap on uniswap", () => {
    const ruleId = 'TestRuleId';

    describe("swapOnUniwap", () => {
        it('should swap coins on uniswap using coinrule cotract', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                coinruleAdmin,
                addresses,
            } = await loadFixture(deployAll);

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
            const prefix = '\x1b[33m%s\x1b[0m';

            await tokenInContract.connect(owner).approve(coinruleSmartWallet.address, tokenValueInEther, {gasLimit: 2500000});

            // call the deposit function ( exchange service )
            // approve the wallet
            await tokenInContract.connect(owner).approve(coinruleSmartWallet.address, tetherTokenAddress, {gasLimit: 2500000})


            // call deposit function
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
            const coinruleFeeRate = 2 * 100// percents
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
            expect(Number(walletUSDTBalance)).to.be.equal(walletUSDTCalculatedBalance); // coinruleFee + gasFee
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


        });
    });

    describe('#withdrawAllWithSwapFromRule', () => {
        it('should swap all coins in rule for the base coin', async () => {

            const {
                wallet: coinruleSmartWallet,
                owner,
                coinruleAdmin,
                addresses,
            } = await loadFixture(deployAll);

            const tetherTokenAddress = addresses?.tetherAddress || "0x0165878A594ca255338adfa4d48449f69242Eb8F"; // Tether
            const usdcTokenAddress = addresses?.usdcAddress || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"; // USDC
            const swapRouter = addresses?.swapRouterAddress || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // hardhat

            const tetherContract = new ethers.Contract(tetherTokenAddress, ECR20ABI, coinruleAdmin)
            const usdcContract = new ethers.Contract(usdcTokenAddress, ECR20ABI, coinruleAdmin)

            const fee = 500; // 0.3
            const tetherTokenValue = 15;

            const tokenValueInEther = ethers.utils.parseEther(tetherTokenValue.toString());
            const deadline = 15 * 60;


            // check wallet usdt balance
            const usdtBalance1 = await tetherContract.connect(owner).balanceOf(owner.address);
            console.log(`Wallet USDT Balance ${ethers.utils.formatEther(usdtBalance1.toString())}`);

            const usdcBalance1 = await usdcContract.connect(owner).balanceOf(owner.address);
            const originalUSDCBalance = Math.round(Number(ethers.utils.formatEther(usdcBalance1.toString())))
            console.log(`Wallet USDC Balance ${originalUSDCBalance}`)


            // deposit Tether in contract
            await tetherContract.connect(owner).approve(coinruleSmartWallet.address, tokenValueInEther, {gasLimit: 2500000});

            const depositor = await ethers.getContractAt('DepositFacet', coinruleSmartWallet.address, owner);

            const depositTx = await depositor.deposit(ruleId, tetherTokenAddress, tokenValueInEther, false, {gasLimit: 25000000})
            await depositTx.wait()

            const viewer = await ethers.getContractAt('ViewBalancesFacet', coinruleSmartWallet.address, owner);

            // check contract balance
            const {0: balance} = await viewer.viewRuleBalance(ruleId, 0, 10);
            console.log(`Tether in contract: ${ethers.utils.formatEther(balance[0].amount)}`);

            const swapper = await ethers.getContractAt('UniswapFacet', coinruleSmartWallet.address, owner);

            // swap tether for usdc and withdraw
            const params = {
                _baseToken: usdcTokenAddress,
                _tokenAddresses: [tetherTokenAddress],
                _ruleId: ruleId,
                _swapRouter: swapRouter,
                _poolFee: fee,
                _deadline: deadline,
                _amountOutMinimum: BigNumber.from("0"),
                _sqrtPriceLimitX96: BigNumber.from("0")
            }
            const swapAndWithdrawTx = await swapper.withdrawAllWithSwapFromRule(params, {gasLimit: 25000000})
            await swapAndWithdrawTx.wait();

            // check contract balance
            const {0: balance2} = await viewer.viewRuleBalance(ruleId, 0, 10);
            const contractBalance = ethers.utils.formatEther(balance2[0].amount)
            console.log(`Tether in contract: ${contractBalance}`);

            expect(contractBalance).to.equal('0.0')

            // check wallet usdt balance
            const usdtBalance2 = await tetherContract.connect(owner).balanceOf(owner.address);
            console.log(`Wallet USDT Balance ${ethers.utils.formatEther(usdtBalance2.toString())}`);

            const usdcBalance2 = await usdcContract.connect(owner).balanceOf(owner.address);
            const newUSDCBalance = ethers.utils.formatEther(usdcBalance2.toString())
            console.log(`Wallet USDC Balance ${newUSDCBalance}`);

            expect(Math.round(Number(newUSDCBalance))).to.equal(Math.round(Number(originalUSDCBalance)) + tetherTokenValue)
        });
    });

    describe('#withdrawAllWithSwap', () => {
        it('should withdraw all in the contract and update balances to 0', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                coinruleAdmin,
                addresses,
            } = await loadFixture(deployAll);
            const tetherTokenAddress = addresses?.tetherAddress || "0x0165878A594ca255338adfa4d48449f69242Eb8F"; // Tether
            const usdcTokenAddress = addresses?.usdcAddress || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"; // USDC
            const swapRouter = addresses?.swapRouterAddress || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // hardhat

            const tetherContract = new ethers.Contract(tetherTokenAddress, ECR20ABI, coinruleAdmin)
            const usdcContract = new ethers.Contract(usdcTokenAddress, ECR20ABI, coinruleAdmin)

            const fee = 500; // 0.3
            const tetherTokenValue = 15;

            const tokenValueInEther = ethers.utils.parseEther(tetherTokenValue.toString());
            const deadline = 15 * 60;

            // check wallet usdt balance
            const usdtBalance1 = await tetherContract.connect(owner).balanceOf(owner.address);
            console.log(`Wallet USDT Balance ${ethers.utils.formatEther(usdtBalance1.toString())}`);

            const usdcBalance1 = await usdcContract.connect(owner).balanceOf(owner.address);
            const originalUSDCBalance = ethers.utils.formatEther(usdcBalance1.toString())
            console.log(`Wallet USDC Balance ${originalUSDCBalance}`)


            // deposit Tether in contract
            await tetherContract.connect(owner).approve(coinruleSmartWallet.address, tokenValueInEther, {gasLimit: 2500000});

            const depositor = await ethers.getContractAt('DepositFacet', coinruleSmartWallet.address, owner);

            const depositTx = await depositor.deposit(ruleId, tetherTokenAddress, tokenValueInEther, false, {gasLimit: 25000000})
            await depositTx.wait()

            const viewer = await ethers.getContractAt('ViewBalancesFacet', coinruleSmartWallet.address, owner);

            // check contract balance
            const {0: balance} = await viewer.viewRuleBalance(ruleId, 0, 10);
            console.log(`Tether in contract: ${ethers.utils.formatEther(balance[0].amount)}`);

            const withdrawer = await ethers.getContractAt('UniswapFacet', coinruleSmartWallet.address, owner);

            const params = {
                _rules: [ruleId],
                _baseToken: usdcTokenAddress,
                _swapRouter: swapRouter,
                _poolFee: fee,
                _deadline: deadline,
                _amountOutMinimum: BigNumber.from("0"),
                _sqrtPriceLimitX96: BigNumber.from("0")
            }

            // swap tether for usdc and withdraw
            const swapAndWithdrawTx = await withdrawer.withdrawAllWithSwap(params, {gasLimit: 25000000})
            await swapAndWithdrawTx.wait();

            // check contract balance
            const {0: balance2} = await viewer.viewRuleBalance(ruleId, 0, 10);
            const contractBalance = ethers.utils.formatEther(balance2[0].amount)
            console.log(`Tether in contract: ${contractBalance}`);

            expect(contractBalance).to.equal('0.0')

            // check wallet usdt balance
            const usdtBalance2 = await tetherContract.connect(owner).balanceOf(owner.address);
            console.log(`Wallet USDT Balance ${ethers.utils.formatEther(usdtBalance2.toString())}`);

            const usdcBalance2 = await usdcContract.connect(owner).balanceOf(owner.address);
            const newUSDCBalance = ethers.utils.formatEther(usdcBalance2.toString())
            console.log(`Wallet USDC Balance ${newUSDCBalance}`);

            expect(Math.round(Number(newUSDCBalance))).to.equal(Math.round(Number(originalUSDCBalance)) + tetherTokenValue)

            // check contract balance
            const {0: balance3} = await viewer.viewRuleBalance(ruleId, 0, 10);
            const tetherBalanceContract = ethers.utils.formatEther(balance3[0].amount)
            console.log(`Tether in contract: ${tetherBalanceContract}`);
            expect(tetherBalanceContract).to.equal('0.0')
        })
    })
});
