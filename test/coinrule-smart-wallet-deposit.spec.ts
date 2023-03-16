import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {Contract} from "ethers";
import {deployAll} from "./fixtures";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from 'hardhat';

describe("Coinrule Smart Wallet Deposit", () => {
    let admin: SignerWithAddress;
    let coinruleUser: SignerWithAddress;
    let wallet: Contract;
    let token: Contract;
    let weth: Contract;

    before(async () => {
        const {
            coinruleAdmin,
            owner,
            wallet: nextWallet, goldToken, wEth,
        } = await loadFixture(deployAll);

        admin = coinruleAdmin;
        coinruleUser = owner;
        wallet = nextWallet;
        token = goldToken;
        weth = wEth;
    });


    describe("#deposit() Ecr20 ", () => {
        it("should deposit ECR20 on the wallet and update the rule balances", async () => {
            const ruleId = 'TestRuleId';
            const userBalance = ethers.utils.parseEther("100")
            const tokenAmount = 6;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())
            const tokenApprovedAmountInEthers = ethers.utils.parseEther("11")

            await token.mint(coinruleUser.address, userBalance);

            //approve coinruleContract to spend from coinruleUser wallet (front end)
            const coinruleUserSigner = token.connect(coinruleUser);
            await coinruleUserSigner.approve(wallet.address, tokenApprovedAmountInEthers, {gasLimit: 25000000})

            // call the deposit function
            //const signerCoinrule = wallet.connect(coinruleUser);
            const signerCoinrule1 = await ethers.getContractAt('DepositFacet', wallet.address, coinruleUser);

            const transaction = await signerCoinrule1.deposit(ruleId, token.address, tokenAmountInEthers, false, {gasLimit: 25000000})

            const signerCoinrule2 = await ethers.getContractAt('ViewBalancesFacet', wallet.address, admin);

            // Test balance by rule
            const {0: balances, 1: newCursor} = await signerCoinrule2.viewRuleBalance(ruleId, 0, 15) as Array<any>
            const tokenBalance = balances.find((item: any) => item.token === token.address).amount;
            expect(tokenBalance).to.be.eq(tokenAmountInEthers)

            // Test balance for the contract
            const {0: contractBalances, 1: cursor} = await signerCoinrule2.viewContractBalance(0, 15);
            const tokenContractBalance = contractBalances.find((item: any) => item.token === token.address).amount;
            expect(tokenContractBalance).to.be.eq(tokenAmountInEthers)

        });
    });

    describe("#deposit() Native ", () => {

        it("should deposit ETH and the wallet should convert it to WETH and update the rule balances", async function () {
            const ruleId = 'TestRuleId';
            const tokenAmount = 1;
            const tokenAmountInEthers = ethers.utils.parseEther(tokenAmount.toString())

            // call the deposit function
            //const signerCoinruleAdmin = wallet.connect(admin);
            const signerCoinruleAdmin = await ethers.getContractAt('DepositFacet', wallet.address, admin);

            const transaction = await signerCoinruleAdmin.deposit(ruleId, weth.address, tokenAmountInEthers, true, {
                value: tokenAmountInEthers,
                gasLimit: 25000000
            })

            const signerCoinruleAdmin2 = await ethers.getContractAt('ViewBalancesFacet', wallet.address, admin)

            // Test balance by rule
            const {0: contractRuleBalances, 1: cursors} = await signerCoinruleAdmin2.viewRuleBalance(ruleId, 0, 15);
            const tokenBalance = contractRuleBalances.find((item: any) => item.token === weth.address).amount;
            expect(tokenBalance).to.be.eq(tokenAmountInEthers)

            // Test balance for the contract
            const {0: contractBalances, 1: cursor} = await signerCoinruleAdmin2.viewContractBalance(0, 15);
            const tokenContractBalance = contractBalances.find((item: any) => item.token === weth.address).amount;
            expect(tokenContractBalance).to.be.eq(tokenAmountInEthers)
        });
    });
});
