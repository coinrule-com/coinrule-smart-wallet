// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../shared/Modifiers.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract FeeManagementFacet is Modifiers {
    /// @param _tokenAddress Token address you want to withdraw
    /// @param _tokenAmount Amount to withdraw
    function withdrawCollectedFees(address _tokenAddress, uint256 _tokenAmount) external onlyCoinruleOrMaster {
        uint256 prevBalance = LibDiamond.getFeeBalance(_tokenAddress);
        uint256 newBalance = prevBalance - _tokenAmount;
        address coinruleMaster = LibDiamond.getCoinruleMasterAddress();

        IERC20 tokenContract = IERC20(_tokenAddress);
        require(tokenContract.transfer(coinruleMaster, _tokenAmount), "Transfer failed");
        LibDiamond.updateFeeBalanceAfterWithdrawal(_tokenAddress, IERC20Metadata(_tokenAddress).name(), _tokenAmount, prevBalance, newBalance);
    }

    /// @notice retrieve an array of balances for this contract
    /// @param cursor the starting position
    /// @param pageLength the length of the resulting array
    function viewCollectedFees(uint cursor, uint pageLength) external view returns (LibDiamond.Wallet[] memory, uint newCursor) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        uint listLength = ds.tokensHeld.tokens.length;

        uint length = pageLength;
        if (length > listLength - cursor) {
            length = listLength - cursor;
        }

        LibDiamond.Wallet[] memory balanceWallet = new LibDiamond.Wallet[](length);

        for (uint i = 0; i < length; i++) {
            address heldTokenAddress = ds.tokensHeld.tokens[i + cursor];
            balanceWallet[i] = ds.feeBalances[heldTokenAddress];
        }

        return (balanceWallet, cursor + length);
    }
}
