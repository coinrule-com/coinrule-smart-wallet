import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Contract} from "ethers";
import {
    deployAll,
} from "./fixtures";
import {ethers} from "hardhat";
import {ViewBalancesFacet} from "../typechain-types";


describe("Coinrule Smart Wallet View Balances", () => {
    let admin: SignerWithAddress;
    let user: SignerWithAddress;
    let random: SignerWithAddress;
    let coinruleContract: Contract;

    let GLDContract: Contract;
    let SLVContract: Contract;
    const ruleId = 'TestRuleId';

    before(async () => {
        const { coinruleAdmin,owner: coinruleUser,randomUser,wallet, goldToken, silverToken} = await loadFixture(deployAll);

        admin = coinruleAdmin;
        user = coinruleUser;
        random = randomUser;
        coinruleContract = wallet;
        GLDContract = goldToken;
        SLVContract = silverToken;

        await GLDContract.mint(coinruleUser.address, 100);
        await SLVContract.mint(coinruleUser.address, 100);
    })

    describe("#viewContractBalance and #viewRuleBalance", () => {
        it('should return no balance when no deposits have been made', async () => {
            const adminUser = await ethers.getContractAt('ViewBalancesFacet', coinruleContract.address, admin);
            const {0: contractBalances, 1: cursor} = await adminUser.viewContractBalance(0, 15);
            expect(contractBalances).to.be.empty;
            expect(cursor.toString()).to.equal('0');
        })

        it('should return no rule balance when no deposits have been made', async () => {
            const adminUser = await ethers.getContractAt('ViewBalancesFacet', coinruleContract.address, admin);
            const {0: contractBalances, 1: cursor} = await adminUser.viewRuleBalance(ruleId, 0, 15);
            expect(contractBalances).to.be.empty;
            expect(cursor.toString()).to.equal('0');
        })

        it('should return first balance and cursor position of 1 when a single element is present', async () => {
            const adminUser = await ethers.getContractAt('ViewBalancesFacet', coinruleContract.address, admin);
            const walletUser = await ethers.getContractAt('DepositFacet', coinruleContract.address, user);

            const goldTokenForWalletUser = GLDContract.connect(user);
            const silverTokenForWalletUser = SLVContract.connect(user);

            await goldTokenForWalletUser.approve(coinruleContract.address, 15);
            await silverTokenForWalletUser.approve(coinruleContract.address, 30);

            await GLDContract.allowance(coinruleContract.address, walletUser.address);
            await SLVContract.allowance(coinruleContract.address, walletUser.address);

            await walletUser.deposit(ruleId, GLDContract.address, 15, false, {gasLimit: 1000000})

            const {0: contractBalances, 1: cursor} = await adminUser.viewContractBalance(0, 15);

            expect(contractBalances[0].amount.toString()).to.equal('15')
            expect(cursor.toString()).to.equal('1');
        });

        it('should return first rule balance and cursor position of 1 when a single element is present', async () => {
            const adminUser = await ethers.getContractAt('ViewBalancesFacet', coinruleContract.address, admin) as ViewBalancesFacet;

            const {0: contractBalances, 1: cursor} = await adminUser.viewRuleBalance(ruleId, 0, 15);

            expect(contractBalances[0].amount.toString()).to.equal('15')
            expect(cursor.toString()).to.equal('1');
        })

        it('should return first balance and position of 1 if page size is 1 when two elements are present', async () => {
            const adminUser = await ethers.getContractAt('ViewBalancesFacet', coinruleContract.address, admin);
            const walletUser = await ethers.getContractAt('DepositFacet', coinruleContract.address, user);

            const goldTokenForWalletUser = GLDContract.connect(user);
            const silverTokenForWalletUser = SLVContract.connect(user);

            await goldTokenForWalletUser.approve(coinruleContract.address, 15);
            await silverTokenForWalletUser.approve(coinruleContract.address, 30);

            await GLDContract.allowance(coinruleContract.address, walletUser.address);
            await SLVContract.allowance(coinruleContract.address, walletUser.address);

            await walletUser.deposit(ruleId, SLVContract.address, 30, false, {gasLimit: 1000000})

            const {0: contractBalances, 1: cursor} = await adminUser.viewContractBalance(0, 1);

            expect(contractBalances[0].amount.toString()).to.equal('15')
            expect(contractBalances[0].token.toString()).to.equal(GLDContract.address);
            expect(cursor.toString()).to.equal('1');

            const {0: contractBalances2, 1: cursor2} = await adminUser.viewContractBalance(1, 1);

            expect(contractBalances2[0].amount.toString()).to.equal('30')
            expect(contractBalances2[0].token.toString()).to.equal(SLVContract.address);
            expect(cursor2.toString()).to.equal('2');
        })

        it('should return first rule balance and position of 1 if page size is 1 when two elements are present', async () => {
            const adminUser = await ethers.getContractAt('ViewBalancesFacet', coinruleContract.address, admin);

            const {0: contractBalances, 1: cursor} = await adminUser.viewRuleBalance(ruleId, 0, 1);

            expect(contractBalances[0].amount.toString()).to.equal('15')
            expect(contractBalances[0].token.toString()).to.equal(GLDContract.address);
            expect(cursor.toString()).to.equal('1');

            const {0: contractBalances2, 1: cursor2} = await adminUser.viewContractBalance(1, 1);

            expect(contractBalances2[0].amount.toString()).to.equal('30')
            expect(contractBalances2[0].token.toString()).to.equal(SLVContract.address);
            expect(cursor2.toString()).to.equal('2');
        })

        it('should return all balances if the page is greater than list length', async () => {
            const adminUser = await ethers.getContractAt('ViewBalancesFacet', coinruleContract.address, admin);

            const {0: contractBalances, 1: cursor} = await adminUser.viewContractBalance(0, 10);

            expect(contractBalances.length).to.equal(2)
            expect(cursor.toString()).to.equal('2');
        });

        it('should return all rule balances if the page is greater than list length', async () => {
            const adminUser = await ethers.getContractAt('ViewBalancesFacet', coinruleContract.address, admin);

            const {0: contractBalances, 1: cursor} = await adminUser.viewRuleBalance(ruleId, 0, 10);

            expect(contractBalances.length).to.equal(2)
            expect(cursor.toString()).to.equal('2');
        });

        it('should return only one coin row after adding same coin multiple times', async () => {
            const adminUser = await ethers.getContractAt('ViewBalancesFacet', coinruleContract.address, admin);
            const walletUser = await ethers.getContractAt('DepositFacet', coinruleContract.address, user);

            const silverTokenForWalletUser = SLVContract.connect(user);

            await silverTokenForWalletUser.approve(coinruleContract.address, 30);
            await SLVContract.allowance(coinruleContract.address, walletUser.address);
            await walletUser.deposit(ruleId, SLVContract.address, 30, false, {gasLimit: 1000000})

            await silverTokenForWalletUser.approve(coinruleContract.address, 30);
            await SLVContract.allowance(coinruleContract.address, walletUser.address);
            await walletUser.deposit(ruleId, SLVContract.address, 30, false, {gasLimit: 1000000})

            const {0: contractBalances, 1: cursor} = await adminUser.viewContractBalance(0, 10);

            expect(contractBalances.length).to.equal(2);
            expect(contractBalances[1].amount.toString()).to.equal('90')
            expect(contractBalances[1].token.toString()).to.equal(SLVContract.address);
        })

        it('should return only one coin row after adding same coin multiple times in viewRuleBalance', async () => {
            const adminUser = await ethers.getContractAt('ViewBalancesFacet', coinruleContract.address, admin);

            const {0: contractBalances, 1: cursor} = await adminUser.viewRuleBalance(ruleId, 0, 10);

            expect(contractBalances.length).to.equal(2);
            expect(contractBalances[1].amount.toString()).to.equal('90')
            expect(contractBalances[1].token.toString()).to.equal(SLVContract.address);
        })
    });
});
