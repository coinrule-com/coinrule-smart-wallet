// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../shared/Modifiers.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract ViewBalancesFacet is Modifiers {
    /// @notice retrieve an array of balances for this contract
    /// @param cursor the starting position
    /// @param pageLength the length of the resulting array
    function viewContractBalance(uint cursor, uint pageLength) external view returns (LibDiamond.Wallet[] memory, uint newCursor) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        uint listLength = ds.tokensHeld.tokens.length;

        uint length = pageLength;
        if (length > listLength - cursor) {
            length = listLength - cursor;
        }

        LibDiamond.Wallet[] memory balanceWallet = new LibDiamond.Wallet[](length);

        for (uint i = 0; i < length; i++) {
            address heldTokenAddress = ds.tokensHeld.tokens[i + cursor];
            uint256 feeBalance = LibDiamond.getFeeBalance(heldTokenAddress);

            IERC20 token = IERC20(heldTokenAddress);
            balanceWallet[i].token = heldTokenAddress;
            balanceWallet[i].amount = token.balanceOf(address(this)) - feeBalance;
        }

        return (balanceWallet, cursor + length);
    }

    /// @notice retrieve an array of balances for a particular rule
    /// @param _ruleId the rule id
    /// @param cursor the starting position
    /// @param pageLength the length of the resulting array
    function viewRuleBalance(string calldata _ruleId, uint cursor, uint pageLength) external view returns (LibDiamond.Wallet[] memory, uint newCursor) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        uint listLength = ds.ruleTokens[_ruleId].tokens.length;

        uint length = pageLength;
        if (length > listLength - cursor) {
            length = listLength - cursor;
        }

        LibDiamond.Wallet[] memory balanceWallet = new LibDiamond.Wallet[](length);

        for (uint i = 0; i < length; i++) {
            address heldTokenAddress = ds.ruleTokens[_ruleId].tokens[i + cursor];

            balanceWallet[i].token = heldTokenAddress;
            balanceWallet[i].amount = ds.balances[_ruleId][heldTokenAddress].amount;
        }

        return (balanceWallet, cursor + length);
    }
}
