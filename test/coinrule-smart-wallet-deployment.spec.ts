import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Contract} from "ethers";
import {deployAll} from "./fixtures";
import {ethers} from "hardhat";
import {OwnershipFacet} from "../typechain-types";


describe("Coinrule Smart Wallet Deployment", () => {
    let admin: SignerWithAddress;
    let master: SignerWithAddress;
    let user: SignerWithAddress;
    let random: SignerWithAddress;
    let coinruleContract: Contract;

    before(async () => {
        const {coinruleAdmin, owner: coinruleUser,randomUser,wallet, coinruleMaster} = await loadFixture(deployAll);

        admin = coinruleAdmin;
        master = coinruleMaster
        user = coinruleUser;
        random = randomUser;
        coinruleContract = wallet;

    })

    describe("Contract Deployment", () => {
        it("Should set the right coinrule address", async function () {
            const contract = await ethers.getContractAt('OwnershipFacet', coinruleContract.address, admin) as OwnershipFacet;
            expect(admin.address).to.equal(await contract.coinrule());
        });

        it("Should set the right coinrule user address", async function () {
            const contract = await ethers.getContractAt('OwnershipFacet', coinruleContract.address, admin) as OwnershipFacet;
            expect(user.address).to.equal(await contract.owner());
        });

        it("Should set the right coinrule master address", async function () {
            const contract = await ethers.getContractAt('OwnershipFacet', coinruleContract.address, admin) as OwnershipFacet;
            expect(master.address).to.equal(await contract.coinruleMaster());
        });
    });

})