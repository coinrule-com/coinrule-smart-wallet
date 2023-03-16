import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import {ethers} from "hardhat";
import {deployAll} from "./fixtures";
import {OwnershipFacet,} from "../typechain-types";

describe("Coinrule Smart Wallet OwnershipFacet", () => {

    describe("OwnershipFacet", () => {

        it('should set new owner by the previous owner', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                randomUser,
                coinruleAdmin,
                addresses,
                coinruleMaster
            } = await loadFixture(deployAll);
            const newOwner = randomUser
            const contractMaster = await ethers.getContractAt('OwnershipFacet', coinruleSmartWallet.address, coinruleMaster) as OwnershipFacet;
            const contractAdmin = await ethers.getContractAt('OwnershipFacet', coinruleSmartWallet.address, coinruleAdmin) as OwnershipFacet;
            const contractOwner = await ethers.getContractAt('OwnershipFacet', coinruleSmartWallet.address, owner) as OwnershipFacet;

            expect(await contractOwner.owner()).to.be.equal(owner.address)

            const tx = await contractOwner.transferOwnership(newOwner.address);

            expect(await contractOwner.owner()).to.be.equal(newOwner.address)
        });

        it('should set new admin by the the master user', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                randomUser,
                coinruleAdmin,
                addresses,
                coinruleMaster
            } = await loadFixture(deployAll);
            const newAdmin = randomUser
            const contractMaster = await ethers.getContractAt('OwnershipFacet', coinruleSmartWallet.address, coinruleMaster) as OwnershipFacet;
            const contractAdmin = await ethers.getContractAt('OwnershipFacet', coinruleSmartWallet.address, coinruleAdmin) as OwnershipFacet;
            const contractOwner = await ethers.getContractAt('OwnershipFacet', coinruleSmartWallet.address, owner) as OwnershipFacet;

            expect(await contractMaster.owner()).to.be.equal(owner.address)
            expect(await contractMaster.coinrule()).to.be.equal(coinruleAdmin.address)

            const tx = await contractMaster.transferAdminship(newAdmin.address);

            expect(await contractMaster.coinrule()).to.be.equal(newAdmin.address)
        });

        it('should set new master by the the master user', async () => {
            const {
                wallet: coinruleSmartWallet,
                owner,
                randomUser,
                coinruleAdmin,
                addresses,
                coinruleMaster
            } = await loadFixture(deployAll);
            const newMaster = randomUser
            const contractMaster = await ethers.getContractAt('OwnershipFacet', coinruleSmartWallet.address, coinruleMaster) as OwnershipFacet;
            const contractAdmin = await ethers.getContractAt('OwnershipFacet', coinruleSmartWallet.address, coinruleAdmin) as OwnershipFacet;
            const contractOwner = await ethers.getContractAt('OwnershipFacet', coinruleSmartWallet.address, owner) as OwnershipFacet;

            expect(await contractMaster.owner()).to.be.equal(owner.address)
            expect(await contractMaster.coinrule()).to.be.equal(coinruleAdmin.address)
            expect(await contractMaster.coinruleMaster()).to.be.equal(coinruleMaster.address)

            const tx = await contractMaster.transferMastership(newMaster.address);

            expect(await contractMaster.coinruleMaster()).to.be.equal(newMaster.address)
        });

    });
});
