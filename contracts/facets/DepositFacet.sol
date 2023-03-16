// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../shared/Modifiers.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract DepositFacet is Modifiers {
    event DepositEvent(address from, address tokenAddress, string tokenName, uint256 amountReceived);

    /// @notice The method is used to deposit ECR20/native tokens, in case of native, we convert it to
    /// Weth to be able to trade on uniswap.
    /// @param _ruleId RuleId you wanna deposit to;
    /// @param _tokenAddress The token you want to deposit
    /// @param _tokenAmount The amount of that token you want to deposit, pass Address weth for native
    function deposit(string memory _ruleId, address _tokenAddress, uint256 _tokenAmount, bool isNative) external payable onlyOwnerOrCoinrule safeModeProtection {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        IERC20 tokenReceived;
        IERC20Metadata tokenReceivedMetaData;

        if (isNative) {
            // 1 convert ethers to wrapped ethers
            ds.wrappedEth.deposit{value: msg.value}();
            tokenReceivedMetaData = IERC20Metadata(address(ds.wrappedEth));
            tokenReceived = IERC20(address(ds.wrappedEth));
        } else {
            // 1 Verify allowance
            tokenReceived = IERC20(_tokenAddress);
            tokenReceivedMetaData = IERC20Metadata(_tokenAddress);
            uint256 allowance = tokenReceived.allowance(msg.sender, address(this));
            require(allowance >= _tokenAmount, string.concat("Token  allowance too low, balanceAllowed: ", Strings.toString(allowance), " ,_tokenAmount: ", Strings.toString(_tokenAmount)));

            //2 Transfer the funds
            bool transferFinished = tokenReceived.transferFrom(msg.sender, address(this), _tokenAmount);
            require(transferFinished, "Could not transfer tokens");
        }

        //3 Update local balances
        LibDiamond.addToRuleBalance(address(tokenReceived), _ruleId, _tokenAmount, tokenReceivedMetaData.name());

        //4 Store token address
        LibDiamond.addTokenToTokensHeld(_tokenAddress);
        LibDiamond.addTokenToRuleTokens(_ruleId, _tokenAddress);

        //5 Emit success event
        emit DepositEvent(msg.sender, address(tokenReceived), tokenReceivedMetaData.name(), _tokenAmount);
    }
}
