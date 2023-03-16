// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../shared/Modifiers.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract WithdrawFacet is Modifiers {
    /// @param _tokenAddress Token address you want to withdraw
    /// @param _tokenAmount Amount to withdraw
    /// @param _ruleIds for all active rules so we update their balances
    function withdrawAll(address _tokenAddress, uint256 _tokenAmount, string[] calldata _ruleIds) external onlyOwner {
        LibDiamond.enforceContractHasEnoughBalance(_tokenAddress, _tokenAmount);
        updateBalancesAfterWithdrawFromRules(_tokenAddress, _tokenAmount, _ruleIds);

        IERC20 tokenContract = IERC20(_tokenAddress);
        require(tokenContract.transfer(msg.sender, _tokenAmount), "Transfer failed");
    }

    /// @param _tokens a Wallet list of tokens and amounts to withdraw from rule
    /// @param _ruleId the rule id to withdraw from
    function withdrawTokensFromRule(LibDiamond.Wallet[] calldata _tokens, string memory _ruleId) external onlyOwner {
        for (uint i = 0; i < _tokens.length; i++) {
            address tokenAddress = _tokens[i].token;
            uint256 tokenAmount = _tokens[i].amount;
            string[] memory rules = new string[](1);
            rules[0] = _ruleId;

            LibDiamond.enforceRuleHasEnoughBalance(_ruleId, tokenAddress, tokenAmount);
            updateBalancesAfterWithdrawFromRules(tokenAddress, tokenAmount, rules);

            IERC20 tokenContract = IERC20(tokenAddress);
            require(tokenContract.transfer(msg.sender, tokenAmount), "Transfer failed");
        }
    }

    /// @param _tokenAddress Token address to withdraw pass Address Ox000000000 for native
    /// @param _tokenAmount Amount to withdraw
    /// @param _ruleId rule to withdraw from;
    function withdrawAllFromRule(address _tokenAddress, uint256 _tokenAmount, string memory _ruleId) external onlyOwner {
        LibDiamond.enforceContractHasEnoughBalance(_tokenAddress, _tokenAmount);
        LibDiamond.enforceRuleHasEnoughBalance(_ruleId, _tokenAddress, _tokenAmount);
        string[] memory rules = new string[](1);
        rules[0] = _ruleId;

        updateBalancesAfterWithdrawFromRules(_tokenAddress, _tokenAmount, rules);

        IERC20 tokenContract = IERC20(_tokenAddress);
        require(tokenContract.transfer(msg.sender, _tokenAmount), "Transfer failed");
    }

    function updateBalancesAfterWithdrawFromRules(address _tokenAddress, uint256 _tokenAmount, string[] memory _ruleIds) internal {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        for (uint i = 0; i < _ruleIds.length; i++) {
            uint256 previousBalance = ds.balances[_ruleIds[i]][_tokenAddress].amount;
            uint256 newBalance = previousBalance - _tokenAmount;
            LibDiamond.updateBalance(_tokenAddress, _ruleIds[i], _tokenAmount, previousBalance, newBalance, IERC20Metadata(_tokenAddress).name());
        }
    }
}
