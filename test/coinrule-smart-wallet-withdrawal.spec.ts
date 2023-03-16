import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {ethers} from "hardhat";
import {deployAll} from "./fixtures";
import {expect} from "chai";
import {ECR20ABI} from "./Ecr20Abi";

describe("Coinrule Smart Wallet withdrawal", () => {
    describe("#withdrawAll()", () => {
        it("should deposit ETH and then withdraw WETH ", async () => {
            const {coinruleAdmin, owner, wallet, wEth} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())
            const wEthInContract = new ethers.Contract(wEth.address, ECR20ABI, coinruleAdmin)

            // call the deposit function
            const depositor = await ethers.getContractAt('DepositFacet', wallet.address, coinruleAdmin);

            await depositor.deposit(ruleId, wEth.address, tokenAmountInEthers, true, {
                value: tokenAmountInEthers,
                gasLimit: 25000000
            })

            const contractBalanceBefore = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(wallet.address));
            const userBalanceBefore = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(owner.address));

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, owner);

            const transaction = await withdrawer.withdrawAll(wEth.address, tokenAmountInEthers, [ruleId], {gasLimit: 25000000});
            await transaction.wait()

            const contractBalanceAfter = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(wallet.address));
            const userBalanceAfter = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(owner.address));

            expect(Number(contractBalanceAfter)).to.be.lessThan(Number(contractBalanceBefore));
            expect(Number(userBalanceAfter)).to.be.greaterThan(Number(userBalanceBefore))
        });

        it("should deposit GLD and then withdraw GLD ", async () => {
            const {coinruleAdmin, owner, wallet, goldToken: GLDContract} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            await GLDContract.mint(owner.address, tokenAmountInEthers);

            await GLDContract.connect(owner).approve(wallet.address, tokenAmountInEthers, {gasLimit: 25000000})

            // call the deposit function
            const depositor = await ethers.getContractAt('DepositFacet', wallet.address, owner);
            await depositor.deposit(ruleId, GLDContract.address, tokenAmountInEthers, false, {
                gasLimit: 25000000
            })

            const contractBalanceBefore = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(wallet.address));
            const userBalanceBefore = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(owner.address));

            const balanceViewer = await ethers.getContractAt('ViewBalancesFacet', wallet.address, owner);

            const {0: ruleBalancesBefore, 1: cursor} = await balanceViewer.viewRuleBalance(ruleId, 0, 1);
            const {0: contractBalancesBefore, 1: cursor2} = await balanceViewer.viewContractBalance(0, 1);

            expect(ruleBalancesBefore[0].amount.toString()).to.equal(tokenAmountInEthers)
            expect(ruleBalancesBefore[0].token.toString()).to.equal(GLDContract.address);

            expect(contractBalancesBefore[0].amount.toString()).to.equal(tokenAmountInEthers)
            expect(contractBalancesBefore[0].token.toString()).to.equal(GLDContract.address);

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, owner);

            const withdrawal = await withdrawer.withdrawAll(GLDContract.address, tokenAmountInEthers, [ruleId], {gasLimit: 25000000});
            await withdrawal.wait()

            const contractBalanceAfter = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(wallet.address));
            const userBalanceAfter = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(owner.address));

            const {0: ruleBalancesAfter, 1: cursor3} = await balanceViewer.viewRuleBalance(ruleId, 0, 1);
            const {0: contractBalancesAfter, 1: cursor4} = await balanceViewer.viewContractBalance(0, 1);

            expect(Number(contractBalanceAfter)).to.be.lessThan(Number(contractBalanceBefore));
            expect(Number(userBalanceAfter)).to.be.greaterThan(Number(userBalanceBefore))


            expect(ruleBalancesAfter[0].amount.toString()).to.equal('0')
            expect(ruleBalancesAfter[0].token.toString()).to.equal(GLDContract.address);

            expect(contractBalancesAfter[0].amount.toString()).to.equal('0')
            expect(contractBalancesAfter[0].token.toString()).to.equal(GLDContract.address);
        });

        it("should fail with insufficient balance to withdraw", async () => {
            const {owner, wallet, goldToken: GLDContract} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())
            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, owner);


            await expect(withdrawer.withdrawAll(GLDContract.address, tokenAmountInEthers, [ruleId], {gasLimit: 25000000}))
                .to.be.revertedWithCustomError({interface: withdrawer.interface}, "InsufficientFundsOnContractError");
        });

        it("should fail with OnlyOwner error", async () => {
            const {coinruleAdmin, owner, wallet, goldToken: GLDContract} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())
            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, coinruleAdmin);


            await expect(withdrawer.withdrawAll(GLDContract.address, tokenAmountInEthers, [ruleId], {gasLimit: 25000000}))
                .to.be.revertedWith("Must be contract owner")
        });

    });

    describe("#withdrawAllFromRule()", () => {
        it("should deposit ETH and then withdraw WETH ", async () => {
            const {coinruleAdmin, owner, wallet, wEth} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())
            const wEthInContract = new ethers.Contract(wEth.address, ECR20ABI, coinruleAdmin)

            // call the deposit function
            const depositor = await ethers.getContractAt('DepositFacet', wallet.address, coinruleAdmin);
            await depositor.deposit(ruleId, wEth.address, tokenAmountInEthers, true, {
                value: tokenAmountInEthers,
                gasLimit: 25000000
            })

            const contractBalanceBefore = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(wallet.address));
            const userBalanceBefore = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(owner.address));

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, owner);

            await withdrawer.withdrawAllFromRule(wEth.address, tokenAmountInEthers, ruleId, {gasLimit: 25000000});

            const contractBalanceAfter = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(wallet.address));
            const userBalanceAfter = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(owner.address));

            expect(Number(contractBalanceAfter)).to.be.lessThan(Number(contractBalanceBefore));
            expect(Number(userBalanceAfter)).to.be.greaterThan(Number(userBalanceBefore))
        });

        it("should deposit GLD and then withdraw GLD ", async () => {
            const {coinruleAdmin, owner, randomUser, wallet, goldToken: GLDContract} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())
            await GLDContract.mint(owner.address, tokenAmountInEthers);

            await GLDContract.connect(owner).approve(wallet.address, tokenAmountInEthers, {gasLimit: 25000000})

            // call the deposit function
            const depositor = await ethers.getContractAt('DepositFacet', wallet.address, owner);
            await depositor.deposit(ruleId, GLDContract.address, tokenAmountInEthers, false, {
                gasLimit: 25000000
            })

            const contractBalanceBefore = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(wallet.address));
            const userBalanceBefore = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(owner.address));

            const viewer = await ethers.getContractAt('ViewBalancesFacet', wallet.address, owner);

            const {0: ruleBalancesBefore, 1: cursor} = await viewer.viewRuleBalance(ruleId, 0, 1);
            const {0: contractBalancesBefore, 1: cursor2} = await viewer.viewContractBalance(0, 1);

            expect(ruleBalancesBefore[0].amount.toString()).to.equal(tokenAmountInEthers)
            expect(ruleBalancesBefore[0].token.toString()).to.equal(GLDContract.address);

            expect(contractBalancesBefore[0].amount.toString()).to.equal(tokenAmountInEthers)
            expect(contractBalancesBefore[0].token.toString()).to.equal(GLDContract.address);

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, owner);

            await withdrawer.withdrawAllFromRule(GLDContract.address, tokenAmountInEthers, ruleId, {gasLimit: 25000000});

            const contractBalanceAfter = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(wallet.address));
            const userBalanceAfter = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(owner.address));

            const {0: ruleBalancesAfter, 1: cursor3} = await viewer.viewRuleBalance(ruleId, 0, 1);
            const {0: contractBalancesAfter, 1: cursor4} = await viewer.viewContractBalance(0, 1);

            expect(Number(contractBalanceAfter)).to.be.lessThan(Number(contractBalanceBefore));
            expect(Number(userBalanceAfter)).to.be.greaterThan(Number(userBalanceBefore))


            expect(ruleBalancesAfter[0].amount.toString()).to.equal('0')
            expect(ruleBalancesAfter[0].token.toString()).to.equal(GLDContract.address);

            expect(contractBalancesAfter[0].amount.toString()).to.equal('0')
            expect(contractBalancesAfter[0].token.toString()).to.equal(GLDContract.address);

        });

        it("should fail with insufficient contract balance to withdraw", async () => {
            const {owner, wallet, goldToken: GLDContract} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, owner);

            await expect(withdrawer.withdrawAllFromRule(GLDContract.address, tokenAmountInEthers, ruleId, {gasLimit: 25000000}))
                .to.be.revertedWithCustomError({interface: withdrawer.interface}, "InsufficientFundsOnContractError");
        });

        it("should fail with insufficient rule balance to withdraw", async () => {
            const {owner, wallet, goldToken: GLDContract} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            //  deposit 
            await GLDContract.mint(owner.address, tokenAmountInEthers);
            await GLDContract.connect(owner).approve(wallet.address, tokenAmountInEthers, {gasLimit: 25000000})

            const depositor = await ethers.getContractAt('DepositFacet', wallet.address, owner);

            await depositor.deposit("random " +
                "", GLDContract.address, tokenAmountInEthers, false, {gasLimit: 25000000})

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, owner);

            await expect(withdrawer.withdrawAllFromRule(GLDContract.address, tokenAmountInEthers, ruleId, {gasLimit: 25000000}))
                .to.be.revertedWithCustomError({interface: withdrawer.interface}, "InsufficientFundsOnRuleError");
        });

        it("should fail with OnlyOwner error", async () => {
            const {coinruleAdmin, owner, wallet, goldToken: GLDContract} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, coinruleAdmin);

            await expect(withdrawer.withdrawAllFromRule(GLDContract.address, tokenAmountInEthers, ruleId, {gasLimit: 25000000}))
                .to.be.revertedWith("Must be contract owner")
        });
    });

    describe('#withdrawTokensFromRule()', () => {
        it('should fail with only owner error', async () => {
            const {coinruleAdmin, owner, wallet, goldToken: GLDContract} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            const arr = [{
                token: GLDContract.address,
                amount: tokenAmountInEthers,
            }]

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, coinruleAdmin);

            await expect(withdrawer.withdrawTokensFromRule(arr, ruleId, {gasLimit: 25000000}))
                .to.be.revertedWith("Must be contract owner")
        });

        it("should deposit ETH and then withdraw WETH ", async () => {
            const {coinruleAdmin, owner, wallet, wEth} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())
            const wEthInContract = new ethers.Contract(wEth.address, ECR20ABI, coinruleAdmin)

            // call the deposit function
            const depositor = await ethers.getContractAt('DepositFacet', wallet.address, coinruleAdmin);
            await depositor.deposit(ruleId, wEth.address, tokenAmountInEthers, true, {
                value: tokenAmountInEthers,
                gasLimit: 25000000
            })

            const contractBalanceBefore = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(wallet.address));
            const userBalanceBefore = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(owner.address));

            const arr = [{
                token: wEth.address,
                amount: tokenAmountInEthers,
            }]

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, owner);

            await withdrawer.withdrawTokensFromRule(arr, ruleId, {gasLimit: 25000000});

            const contractBalanceAfter = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(wallet.address));
            const userBalanceAfter = ethers.utils.formatEther(await wEthInContract.connect(owner).balanceOf(owner.address));

            expect(Number(contractBalanceAfter)).to.be.lessThan(Number(contractBalanceBefore));
            expect(Number(userBalanceAfter)).to.be.greaterThan(Number(userBalanceBefore))
        });

        it("should deposit GLD and then withdraw GLD ", async () => {
            const {coinruleAdmin, owner, randomUser, wallet, goldToken: GLDContract} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())
            await GLDContract.mint(owner.address, tokenAmountInEthers);

            await GLDContract.connect(owner).approve(wallet.address, tokenAmountInEthers, {gasLimit: 25000000})

            // call the deposit function
            const depositor = await ethers.getContractAt('DepositFacet', wallet.address, owner);
            await depositor.deposit(ruleId, GLDContract.address, tokenAmountInEthers, false, {
                gasLimit: 25000000
            })

            const contractBalanceBefore = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(wallet.address));
            const userBalanceBefore = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(owner.address));

            const viewer = await ethers.getContractAt('ViewBalancesFacet', wallet.address, owner);

            const {0: ruleBalancesBefore, 1: cursor} = await viewer.viewRuleBalance(ruleId, 0, 1);
            const {0: contractBalancesBefore, 1: cursor2} = await viewer.viewContractBalance(0, 1);

            expect(ruleBalancesBefore[0].amount.toString()).to.equal(tokenAmountInEthers)
            expect(ruleBalancesBefore[0].token.toString()).to.equal(GLDContract.address);

            expect(contractBalancesBefore[0].amount.toString()).to.equal(tokenAmountInEthers)
            expect(contractBalancesBefore[0].token.toString()).to.equal(GLDContract.address);

            const arr = [{
                token: GLDContract.address,
                amount: tokenAmountInEthers,
            }]

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, owner);

            await withdrawer.withdrawTokensFromRule(arr, ruleId, {gasLimit: 25000000});

            const contractBalanceAfter = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(wallet.address));
            const userBalanceAfter = ethers.utils.formatEther(await GLDContract.connect(owner).balanceOf(owner.address));

            const {0: ruleBalancesAfter, 1: cursor3} = await viewer.viewRuleBalance(ruleId, 0, 1);
            const {0: contractBalancesAfter, 1: cursor4} = await viewer.viewContractBalance(0, 1);

            expect(Number(contractBalanceAfter)).to.be.lessThan(Number(contractBalanceBefore));
            expect(Number(userBalanceAfter)).to.be.greaterThan(Number(userBalanceBefore))


            expect(ruleBalancesAfter[0].amount.toString()).to.equal('0')
            expect(ruleBalancesAfter[0].token.toString()).to.equal(GLDContract.address);

            expect(contractBalancesAfter[0].amount.toString()).to.equal('0')
            expect(contractBalancesAfter[0].token.toString()).to.equal(GLDContract.address);

        });

        it("should fail with insufficient rule balance to withdraw", async () => {
            const {owner, wallet, goldToken: GLDContract} = await loadFixture(deployAll)

            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            //  deposit
            await GLDContract.mint(owner.address, tokenAmountInEthers);
            await GLDContract.connect(owner).approve(wallet.address, tokenAmountInEthers, {gasLimit: 25000000})

            const depositor = await ethers.getContractAt('DepositFacet', wallet.address, owner);

            await depositor.deposit("random " +
                "", GLDContract.address, tokenAmountInEthers, false, {gasLimit: 25000000})

            const arr = [{
                token: GLDContract.address,
                amount: tokenAmountInEthers,
            }]

            const withdrawer = await ethers.getContractAt('WithdrawFacet', wallet.address, owner);
            const libDia = await ethers.getContractAt('LibDiamond', wallet.address, owner);

            await expect(withdrawer.withdrawTokensFromRule(arr, ruleId, {gasLimit: 25000000}))
                .to.be.revertedWithCustomError({interface: withdrawer.interface}, "InsufficientFundsOnRuleError");
        });
    });
})