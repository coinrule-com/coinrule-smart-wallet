// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../shared/Modifiers.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import "../libraries/ArrayUtils.sol";

contract ExchangeAddressesFacet is Modifiers {
    event ApprovalSucceeded(string message, address _tokenToApprove, uint256 _amount, address _spender);

    error ExchangeNotApprovedError(string message);

    /// @notice the function is called when we add an exchange
    /// @param _spender address of the exchange (router in case of uniswap)
    function addAddress(address _spender) external onlyOwner safeModeProtection {
        LibDiamond.addApprovedExchangeAddresses(_spender);
    }

    /// @notice the function is called when we remove an exchange
    /// @param _spender address of the exchange (router in case of uniswap)
    function removeAddress(address _spender) external onlyOwnerOrCoinrule {
        LibDiamond.removeApprovedExchangeAddresses(_spender);
    }

    /// @notice retrieve an array of pre approved exchanges addresses
    function viewApprovedAddresses() external view returns (address[] memory) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.approvedExchangesAddresses;
    }

    /// @notice Approve an exchange address
    /// @param _tokenToApprove the token
    /// @param _amount the amount to approve
    /// @param _spender the address of the spender
    function approveExchangeAddress(address _tokenToApprove, uint256 _amount, address _spender) external onlyCoinrule safeModeProtection {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        (, bool exists) = ArrayUtils.indexOf(ds.approvedExchangesAddresses, _spender);
        if (!exists) revert ExchangeNotApprovedError("Exchange not approved yet!");

        IERC20(_tokenToApprove).approve(_spender, _amount);
        emit ApprovalSucceeded("Approval succeeded", _tokenToApprove, _amount, _spender);
    }
}
