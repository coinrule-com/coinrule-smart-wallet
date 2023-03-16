// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
 * EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535 */

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import "../shared/Modifiers.sol";

contract DiamondCutFacet is IDiamondCut, Modifiers {
    /// @notice Add/replace/remove any number of functions and optionally execute a function with delegatecall
    /// @param _diamondCut Contains the facet addresses and function selectors
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and arguments
    function diamondCut(FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata, uint transactionId) external override safeModeProtection {
        LibDiamond.enforceIsContractOwner();
        enforceUpgradeTransactionIsValid(transactionId, _diamondCut);

        transactionCompleted(transactionId);

        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Deploy Facet
        uint256 originalSelectorCount = ds.selectorCount;
        uint256 selectorCount = originalSelectorCount;
        bytes32 selectorSlot;

        if (selectorCount & 7 > 0) {
            selectorSlot = ds.selectorSlots[selectorCount >> 3];
        }

        for (uint256 facetIndex; facetIndex < _diamondCut.length; ) {
            (selectorCount, selectorSlot) = LibDiamond.addReplaceRemoveFacetSelectors(
                selectorCount,
                selectorSlot,
                _diamondCut[facetIndex].facetAddress,
                _diamondCut[facetIndex].action,
                _diamondCut[facetIndex].functionSelectors
            );

            unchecked {
                facetIndex++;
            }
        }
        if (selectorCount != originalSelectorCount) {
            ds.selectorCount = uint16(selectorCount);
        }
        if (selectorCount & 7 > 0) {
            ds.selectorSlots[selectorCount >> 3] = selectorSlot;
        }
        emit DiamondCut(_diamondCut, _init, _calldata);
        LibDiamond.initializeDiamondCut(_init, _calldata);
    }

    function enforceUpgradeTransactionIsValid(uint transactionId, IDiamondCut.FacetCut[] calldata _diamondCut) internal view {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        LibDiamond.UpgradeTransaction memory upgradeTransaction = ds.upgrades[transactionId];

        bytes32 hash = keccak256(abi.encode(_diamondCut));

        if (upgradeTransaction.transactionId != transactionId) revert("Transaction Id mismatch");
        if (upgradeTransaction.hash != hash) revert("Transaction hash mismatch");
        if (upgradeTransaction.coinruleSign == false) revert("Unsigned transaction");
        if (upgradeTransaction.completed == true) revert("Upgrade already executed");
    }

    function transactionCompleted(uint transactionId) internal {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.upgrades[transactionId].ownerSign = true;
        ds.upgrades[transactionId].completed = true;
        LibDiamond.upgradeTransactionCompleted(transactionId);
    }

    /// @notice Add a new transaction
    /// @param _diamondCut the list of facets
    function addUpgradeTransaction(FacetCut[] calldata _diamondCut) external override {
        LibDiamond.enforceIsCoinrule();
        bytes32 hash = keccak256(abi.encode(_diamondCut));

        uint transactionId = LibDiamond.getUpgradeCount();
        LibDiamond.increaseUpgradeCount();

        LibDiamond.addUpgradeTransaction(
            transactionId,
            LibDiamond.UpgradeTransaction(
                transactionId, // uint transactionId;
                hash, // bytes32 hash;
                true, // bool coinruleSign;
                false, // bool ownerSign;
                false // bool completed;
            )
        );
    }

    /// @notice Get the last transaction id
    function lastTransactionId() external view returns (uint) {
        return LibDiamond.getUpgradeCount() - 1;
    }
}
