import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {assert, expect} from "chai";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber, Contract} from "ethers";
import {
  deployAll
} from "./fixtures";
import {ethers} from "hardhat";
import { getSelectors, FacetCutAction, removeSelectors } from "../scripts/libraries/diamond";


describe("Coinrule Smart Wallet Contract Upgrades", () => {
  let admin: SignerWithAddress;
  let user: SignerWithAddress;
  let random: SignerWithAddress;
  let coinruleContract: Contract;

  let diamondCutFacetUser: Contract;
  let diamondCutFacetAdmin: Contract;
  let diamondLoupeFacet: Contract;
  let ownershipFacet: Contract;
  let depositFacet: Contract;
  let exchangeAddressesFacet: Contract;
  let uniswapFacet: Contract;
  let viewBalancesFacet: Contract;
  let withdrawFacet: Contract;

  beforeEach(async () => {
    const { coinruleAdmin,owner: coinruleUser,randomUser,wallet} = await loadFixture(deployAll);

    admin = coinruleAdmin;
    user = coinruleUser;
    random = randomUser;
    coinruleContract = wallet;

    diamondCutFacetUser = await ethers.getContractAt('DiamondCutFacet', wallet.address, coinruleUser);
    diamondCutFacetAdmin = await ethers.getContractAt('DiamondCutFacet', wallet.address, coinruleAdmin);
    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', wallet.address);
    ownershipFacet = await ethers.getContractAt('OwnershipFacet', wallet.address);
    depositFacet = await ethers.getContractAt('DepositFacet', wallet.address);
    exchangeAddressesFacet = await ethers.getContractAt('ExchangeAddressesFacet', wallet.address);
    uniswapFacet = await ethers.getContractAt('UniswapFacet', wallet.address);
    viewBalancesFacet = await ethers.getContractAt('ViewBalancesFacet', wallet.address);
    withdrawFacet = await ethers.getContractAt('WithdrawFacet', wallet.address);
  })

  describe("Contract Deployment with Facets", () => {
    it('it should have all the 8 initial facets', async () => {
      const addresses = [];

      for (const address of await diamondLoupeFacet.facetAddresses()) {
        addresses.push(address)
      }

      expect(addresses.length).to.equal(10);
    });


    it('selectors should be associated to facets correctly', async () => {
      const addresses = [];

      for (const address of await diamondLoupeFacet.facetAddresses()) {
        addresses.push(address)
      }

      const diamondCutFacet =  await diamondLoupeFacet.facetAddress('0x689b04f9');
      expect(addresses[0]).to.equal(diamondCutFacet);

      const loupeFacet = await diamondLoupeFacet.facetAddress('0xcdffacc6');
      expect(addresses[1]).to.equal(loupeFacet);

      const ownershipFacet = await diamondLoupeFacet.facetAddress('0x79ce95b6');
      expect(addresses[2]).to.equal(ownershipFacet);

      const depositFacet = await diamondLoupeFacet.facetAddress('0x38eada1c');
      expect(addresses[3]).to.equal(depositFacet);

      const exchangeAddressesFacet = await diamondLoupeFacet.facetAddress('0x8da5cb5b');
      expect(addresses[4]).to.equal(exchangeAddressesFacet);

      const uniswapFacet =  await diamondLoupeFacet.facetAddress('0x2e4f2eb5');
      expect(addresses[5]).to.equal(uniswapFacet);

      const viewBalancesFacet = await diamondLoupeFacet.facetAddress('0x7639bde5');
      expect(addresses[6]).to.equal(viewBalancesFacet);

      const withdrawFacet = await diamondLoupeFacet.facetAddress('0x59d9e711');
      expect(addresses[7]).to.equal(withdrawFacet);
    })
  });

  describe('Adding/Removing/Upgrading Facets', () => {
    it('should add test1 functions', async () => {
      const Test1Facet = await ethers.getContractFactory('Test1Facet')
      const test1Facet = await Test1Facet.deploy()
      await test1Facet.deployed()

      const addresses = [];

      for (const address of await diamondLoupeFacet.facetAddresses()) {
        addresses.push(address)
      }

      // @ts-ignore
      const selectors = getSelectors(test1Facet).remove(['supportsInterface(bytes4)']);

      const facets = [{
        facetAddress: test1Facet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }];

      let tx1 = await diamondCutFacetAdmin.addUpgradeTransaction(facets);
      await tx1.wait();

      const transactionId = await diamondCutFacetAdmin.lastTransactionId();

      let tx = await diamondCutFacetUser.diamondCut(
        facets,
        ethers.constants.AddressZero,
        '0x',
        transactionId,
        { gasLimit: 800000 })

      let receipt = await tx.wait()

      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }

      let result = await diamondLoupeFacet.facetFunctionSelectors(test1Facet.address)
      assert.sameMembers(result, selectors)
    });

    it('should test function call', async () => {
      const Test1Facet = await ethers.getContractFactory('Test1Facet')
      const test1Facet = await Test1Facet.deploy()
      await test1Facet.deployed()

      const addresses = [];

      for (const address of await diamondLoupeFacet.facetAddresses()) {
        addresses.push(address)
      }

      // @ts-ignore
      const selectors = getSelectors(test1Facet).remove(['supportsInterface(bytes4)'])

      const facets = [{
        facetAddress: test1Facet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }];

      let tx1 = await diamondCutFacetAdmin.addUpgradeTransaction(facets);
      await tx1.wait();

      const transactionId = await diamondCutFacetAdmin.lastTransactionId();

      let tx = await diamondCutFacetUser.diamondCut(
        facets,
        ethers.constants.AddressZero,
        '0x',
        transactionId,
        { gasLimit: 800000 }
      );

      let receipt = await tx.wait()

      await test1Facet.test1Func10()
    });

    it('should remove some test1 functions', async () => {
      const Test1Facet = await ethers.getContractFactory('Test1Facet')
      const test1FacetDeploy = await Test1Facet.deploy()
      await test1FacetDeploy.deployed()

      // @ts-ignore
      const selectors = getSelectors(test1FacetDeploy).remove(['supportsInterface(bytes4)'])

      const facets1 = [{
        facetAddress: test1FacetDeploy.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }];

      let tx1 = await diamondCutFacetAdmin.addUpgradeTransaction(facets1);
      await tx1.wait();

      const transactionId1 = await diamondCutFacetAdmin.lastTransactionId();
      console.log(`Transaction 1: ${transactionId1}`);

      let tx = await diamondCutFacetUser.diamondCut(
        facets1,
        ethers.constants.AddressZero, '0x', transactionId1, { gasLimit: 800000 })

      let receipt = await tx.wait()

      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }

      let result = await diamondLoupeFacet.facetFunctionSelectors(test1FacetDeploy.address)
      assert.sameMembers(result, selectors)

      const addresses = [];

      for (const address of await diamondLoupeFacet.facetAddresses()) {
        addresses.push(address)
      }

      const test1Facet = await ethers.getContractAt('Test1Facet', coinruleContract.address);
      const functionsToKeep = ['test1Func2()', 'test1Func11()', 'test1Func12()']
      // @ts-ignore
      const selectors2 = getSelectors(test1Facet).remove(functionsToKeep)

      const facets2 = [{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: selectors2
      }];
      let tx2 = await diamondCutFacetAdmin.addUpgradeTransaction(facets2);
      await tx2.wait();

      const transactionId2 = await diamondCutFacetAdmin.lastTransactionId();
      console.log(`Transaction 2: ${transactionId2}`);


      tx = await diamondCutFacetUser.diamondCut(
        facets2,
        ethers.constants.AddressZero, '0x', transactionId2, { gasLimit: 800000 })
      receipt = await tx.wait()
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }

      result = await diamondLoupeFacet.facetFunctionSelectors(addresses[addresses.length -1])
      // @ts-ignore
      assert.sameMembers(result, getSelectors(test1Facet).get(functionsToKeep))
    });

    it('should revert transaction if id is incorrect', async () => {

      const Test1Facet = await ethers.getContractFactory('Test1Facet')
      const test1Facet = await Test1Facet.deploy()
      await test1Facet.deployed()

      const addresses = [];

      for (const address of await diamondLoupeFacet.facetAddresses()) {
        addresses.push(address)
      }

      // @ts-ignore
      const selectors = getSelectors(test1Facet).remove(['supportsInterface(bytes4)']);

      const facets = [{
        facetAddress: test1Facet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }];

      let tx1 = await diamondCutFacetAdmin.addUpgradeTransaction(facets);
      await tx1.wait();

      const transactionId = await diamondCutFacetAdmin.lastTransactionId();
      const fakeTransactionId = BigNumber.from("3333");

      await expect(diamondCutFacetUser.diamondCut(
        facets,
        ethers.constants.AddressZero,
        '0x',
        fakeTransactionId,
        { gasLimit: 800000 }))
        .to.be.revertedWith("Transaction Id mismatch");
    });

    it('should revert transaction on hash mismatch', async () => {

      const Test1Facet = await ethers.getContractFactory('Test1Facet')
      const test1Facet = await Test1Facet.deploy()
      await test1Facet.deployed()

      const addresses = [];

      for (const address of await diamondLoupeFacet.facetAddresses()) {
        addresses.push(address)
      }

      // @ts-ignore
      const selectors = getSelectors(test1Facet).remove(['supportsInterface(bytes4)']);

      const facets1 = [{
        facetAddress: test1Facet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }];

      let tx1 = await diamondCutFacetAdmin.addUpgradeTransaction(facets1);
      await tx1.wait();

      const transactionId = await diamondCutFacetAdmin.lastTransactionId();

      const facets2 = [{
        facetAddress: test1Facet.address,
        action: FacetCutAction.Remove,
        functionSelectors: selectors
      }];

      await expect(diamondCutFacetUser.diamondCut(
        facets2,
        ethers.constants.AddressZero,
        '0x',
        transactionId,
        { gasLimit: 800000 }))
        .to.be.revertedWith("Transaction hash mismatch");
    });

    it('should revert transaction if upgrade has already been executed', async () => {

      const Test1Facet = await ethers.getContractFactory('Test1Facet')
      const test1Facet = await Test1Facet.deploy()
      await test1Facet.deployed()

      const addresses = [];

      for (const address of await diamondLoupeFacet.facetAddresses()) {
        addresses.push(address)
      }

      // @ts-ignore
      const selectors = getSelectors(test1Facet).remove(['supportsInterface(bytes4)']);

      const facets = [{
        facetAddress: test1Facet.address,
        action: FacetCutAction.Add,
        functionSelectors: selectors
      }];

      let tx1 = await diamondCutFacetAdmin.addUpgradeTransaction(facets);
      await tx1.wait();

      const transactionId = await diamondCutFacetAdmin.lastTransactionId();


      const tx = await diamondCutFacetUser.diamondCut(
        facets,
        ethers.constants.AddressZero, '0x', transactionId, { gasLimit: 800000 })
      await tx.wait()

      await expect(diamondCutFacetUser.diamondCut(
        facets,
        ethers.constants.AddressZero,
        '0x',
        transactionId,
        { gasLimit: 800000 }))
        .to.be.revertedWith("Upgrade already executed");
    });


    it('remove all functions and facets accept "diamondCut" and "facets"', async () => {
      const addresses = [];

      for (const address of await diamondLoupeFacet.facetAddresses()) {
        addresses.push(address)
      }

      let selectors = []
      let facets = await diamondLoupeFacet.facets()
      for (let i = 0; i < facets.length; i++) {
        selectors.push(...facets[i].functionSelectors)
      }
      selectors = removeSelectors(selectors, ['facets()', 'diamondCut(tuple(address,uint8,bytes4[])[],address,bytes,uint)'])

      const facetsForUpgrade =  [{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: selectors
      }]

      let tx1 = await diamondCutFacetAdmin.addUpgradeTransaction(facetsForUpgrade);
      await tx1.wait();

      const transactionId = await diamondCutFacetAdmin.lastTransactionId();


      const tx = await diamondCutFacetUser.diamondCut(
        facetsForUpgrade,
        ethers.constants.AddressZero, '0x', transactionId, { gasLimit: 800000 })
      const receipt = await tx.wait()
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }
      facets = await diamondLoupeFacet.facets()

      assert.equal(facets.length, 2)
      assert.equal(facets[0][0], addresses[0])
      assert.sameMembers(facets[0][1], ['0x689b04f9'])
      assert.equal(facets[1][0], addresses[1])
      assert.sameMembers(facets[1][1], ['0x7a0ed627'])
    });

    it('should return supported interfaces', async () => {
      const selector1 = getSelectors(depositFacet);
      const result1 = await diamondLoupeFacet.supportsInterface(selector1[0]);
      expect(result1).to.be.false;
    })
  });
});
