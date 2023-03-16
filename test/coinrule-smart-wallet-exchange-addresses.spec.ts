import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {deployAll} from "./fixtures";
import {ExchangeAddressesFacet} from "../typechain-types";
import {ECR20ABI} from "./Ecr20Abi";

describe("Coinrule Smart Wallet ExchangeAddressesFacet", () => {
    const ruleId = 'TestRuleId';

    describe("ExchangeAddressesFacet", () => {
        it('should addAddress', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                addresses,
            } = await loadFixture(deployAll);
            const swapRouter = addresses?.swapRouterAddress || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // hardhat

            const approver = await ethers.getContractAt('ExchangeAddressesFacet', coinruleSmartWallet.address, owner) as ExchangeAddressesFacet;

            const transaction = await approver.addAddress(swapRouter.toString(), {gasLimit: 25000000})
            const recipe = await transaction.wait();
            const approvedAddresses = await approver.viewApprovedAddresses({gasLimit: 25000000});

            expect(recipe.status).to.be.equal(1); // success
            expect(approvedAddresses.length).to.be.equal(1);

        });

        it('should removalTransaction', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                coinruleAdmin,
                addresses,
            } = await loadFixture(deployAll);
            const swapRouter = addresses?.swapRouterAddress || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // hardhat


            const approver = await ethers.getContractAt('ExchangeAddressesFacet', coinruleSmartWallet.address, owner) as ExchangeAddressesFacet;

            const transaction = await approver.addAddress(swapRouter.toString(), {gasLimit: 25000000})
            const recipe = await transaction.wait();
            const approvedAddresses = await approver.viewApprovedAddresses();

            expect(recipe.status).to.be.equal(1); // success
            expect(approvedAddresses.filter((item) => item === swapRouter).length).to.be.equal(1);

            const removalTransaction = await approver.removeAddress(swapRouter.toString(), {gasLimit: 25000000})
            const removalRecipe = await removalTransaction.wait();
            const approvedAddressesAfterRemoval = await approver.viewApprovedAddresses();

            expect(removalRecipe.status).to.be.equal(1); // success
            expect(approvedAddressesAfterRemoval.filter((item) => item === swapRouter).length).to.be.equal(0);


        });

        it('should approveExchangeAddress an amount for a pre approved address', async () => {
            const {
                wallet: coinruleSmartWallet,
                coinruleAdmin,
                owner,
                addresses,
            } = await loadFixture(deployAll);
            const swapRouter = addresses?.swapRouterAddress || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // hardhat
            const tetherTokenAddress = addresses?.tetherAddress || "0x0165878A594ca255338adfa4d48449f69242Eb8F"; // Tether
            const tokenInContract = new ethers.Contract(tetherTokenAddress, ECR20ABI, coinruleAdmin)
            const approvalAmount = 10
            const approver = await ethers.getContractAt('ExchangeAddressesFacet', coinruleSmartWallet.address, owner) as ExchangeAddressesFacet;
            const adminApprover = await ethers.getContractAt('ExchangeAddressesFacet', coinruleSmartWallet.address, coinruleAdmin) as ExchangeAddressesFacet;

            const transaction = await approver.addAddress(swapRouter.toString(), {gasLimit: 25000000})
            await transaction.wait();

            const approveTransaction = await adminApprover.approveExchangeAddress(tokenInContract.address, approvalAmount, swapRouter);
            await approveTransaction.wait()

            const allowance = await tokenInContract.allowance(coinruleSmartWallet.address, swapRouter)

            expect(allowance).to.be.equal(approvalAmount);
        });

        it('should reject approveExchangeAddress with ExchangeNotApprovedError error', async () => {
            const {
                wallet: coinruleSmartWallet,
                coinruleAdmin,
                owner,
                addresses,
            } = await loadFixture(deployAll);
            const swapRouter = addresses?.swapRouterAddress || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // hardhat
            const tetherTokenAddress = addresses?.tetherAddress || "0x0165878A594ca255338adfa4d48449f69242Eb8F"; // Tether
            const tokenInContract = new ethers.Contract(tetherTokenAddress, ECR20ABI, coinruleAdmin)
            const approvalAmount = 10
            const adminApprover = await ethers.getContractAt('ExchangeAddressesFacet', coinruleSmartWallet.address, coinruleAdmin) as ExchangeAddressesFacet;//

            await expect(adminApprover.approveExchangeAddress(tokenInContract.address, approvalAmount, swapRouter)).to.be.revertedWithCustomError({
                interface: adminApprover.interface
            }, 'ExchangeNotApprovedError')
        });

    });
});
