// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import "../shared/Modifiers.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract UniswapFacet is Modifiers {
    event SwapSucceeded(string message, string amountOut, address tokenOut, string amountIn, address tokenIn, string ruleId, string orderId, uint24 poolFee);

    struct SwapOnUniswapParams {
        address _tokenAddressIn;
        address _tokenAddressOut;
        address _swapRouter;
        uint24 _poolFee;
        uint256 _amountIn;
        string _ruleId;
        string _orderId;
        uint256 _deadline;
        uint256 _amountOutMinimum;
        uint160 _sqrtPriceLimitX96;
        uint256 _coinruleFeeRate;
        uint256 _estimatedGasFees; // gas fee in base currency
    }

    /// @notice Swap on Uniswap exchange
    /// @param swapParams swap parameters
    function swapOnUniswap(SwapOnUniswapParams calldata swapParams) external onlyCoinrule safeModeProtection {
        LibDiamond.enforceContractHasEnoughBalance(swapParams._tokenAddressIn, swapParams._amountIn);
        LibDiamond.enforceRuleHasEnoughBalance(swapParams._ruleId, swapParams._tokenAddressIn, swapParams._amountIn);

        ISwapRouter swapRouter = ISwapRouter(swapParams._swapRouter);

        require((swapParams._amountIn * swapParams._coinruleFeeRate) >= 10_000);
        uint256 coinruleFeeAmount = (swapParams._amountIn * swapParams._coinruleFeeRate) / 10_000;
        uint256 totalFeeAmount = coinruleFeeAmount + swapParams._estimatedGasFees;
        uint256 amountInAfterFee = swapParams._amountIn - totalFeeAmount;

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: swapParams._tokenAddressIn,
            tokenOut: swapParams._tokenAddressOut,
            fee: swapParams._poolFee,
            recipient: address(this),
            deadline: block.timestamp + swapParams._deadline,
            amountIn: amountInAfterFee,
            amountOutMinimum: swapParams._amountOutMinimum,
            sqrtPriceLimitX96: swapParams._sqrtPriceLimitX96
        });

        uint256 amountOut = swapRouter.exactInputSingle(params);

        _afterSwap(swapParams._ruleId, swapParams._tokenAddressIn, swapParams._amountIn, swapParams._tokenAddressOut, amountOut, totalFeeAmount);

        emit SwapSucceeded(
            "Swap succeeded",
            Strings.toString(amountOut),
            swapParams._tokenAddressOut,
            Strings.toString(swapParams._amountIn),
            swapParams._tokenAddressIn,
            swapParams._ruleId,
            swapParams._orderId,
            swapParams._poolFee
        );
    }

    struct WithdrawAllWithSwapParams {
        string[] _rules;
        address _baseToken;
        address _swapRouter;
        uint24 _poolFee;
        uint256 _deadline;
        uint256 _amountOutMinimum;
        uint160 _sqrtPriceLimitX96;
    }

    /// @param params struct with swap params
    function withdrawAllWithSwap(WithdrawAllWithSwapParams calldata params) public onlyOwner {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        ISwapRouter swapRouter = ISwapRouter(params._swapRouter);

        for (uint i = 0; i < params._rules.length; i++) {
            string memory rule = params._rules[i];
            address[] memory tokens = ds.ruleTokens[rule].tokens;

            for (uint j = 0; j < tokens.length; j++) {
                address token = tokens[j];
                uint256 balance = LibDiamond.getRuleTokenBalance(rule, token);
                //ds.balances[rule][token].amount;

                if (balance > 0) {
                    IERC20 tokenContract = IERC20(token);
                    tokenContract.approve(params._swapRouter, balance);

                    // swap amount in rule with recipient being the owner of this wallet
                    ISwapRouter.ExactInputSingleParams memory inputParams = ISwapRouter.ExactInputSingleParams({
                        tokenIn: token,
                        tokenOut: params._baseToken,
                        fee: params._poolFee,
                        recipient: msg.sender,
                        deadline: block.timestamp + params._deadline,
                        amountIn: balance,
                        amountOutMinimum: params._amountOutMinimum,
                        sqrtPriceLimitX96: params._sqrtPriceLimitX96
                    });

                    swapRouter.exactInputSingle(inputParams);

                    // update balances
                    LibDiamond.updateBalance(token, rule, balance, balance, 0, IERC20Metadata(token).name());
                }
            }
        }
    }

    struct WithdrawAllWithSwapFromRuleParams {
        address _baseToken;
        address[] _tokenAddresses;
        string _ruleId;
        address _swapRouter;
        uint24 _poolFee;
        uint256 _deadline;
        uint256 _amountOutMinimum;
        uint160 _sqrtPriceLimitX96;
    }

    /// @param params struct with all the params
    function withdrawAllWithSwapFromRule(WithdrawAllWithSwapFromRuleParams calldata params) external onlyOwner {
        uint256[] memory tokenAmounts = _getTokenAmountsInRule(params._ruleId, params._tokenAddresses);
        ISwapRouter swapRouter = ISwapRouter(params._swapRouter);

        uint listLength = params._tokenAddresses.length;

        for (uint i = 0; i < listLength; i++) {
            if (tokenAmounts[i] > 0) {
                address token = params._tokenAddresses[i];
                uint256 amount = tokenAmounts[i];
                IERC20(token).approve(params._swapRouter, amount);
                ISwapRouter.ExactInputSingleParams memory inputParams = ISwapRouter.ExactInputSingleParams({
                    tokenIn: token,
                    tokenOut: params._baseToken,
                    fee: params._poolFee,
                    recipient: msg.sender,
                    deadline: block.timestamp + params._deadline,
                    amountIn: amount,
                    amountOutMinimum: params._amountOutMinimum,
                    sqrtPriceLimitX96: params._sqrtPriceLimitX96
                });

                swapRouter.exactInputSingle(inputParams);

                LibDiamond.updateBalance(token, params._ruleId, amount, amount, 0, IERC20Metadata(token).name());
            }
        }
    }

    function _getTokenAmountsInRule(string memory ruleId, address[] memory addresses) private view returns (uint256[] memory) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        uint addressLength = addresses.length;
        uint256[] memory amounts = new uint256[](addressLength);

        for (uint i = 0; i < addressLength; i++) {
            uint256 amount = ds.balances[ruleId][addresses[i]].amount;
            amounts[i] = amount;
        }

        return amounts;
    }

    function _afterSwap(string calldata _ruleId, address _tokenInAddress, uint256 _tokenInAmount, address _tokenOutAddress, uint256 _tokenOutAmount, uint256 _feeAmount) internal {
        // update token in balance
        uint256 tokenInPrev = LibDiamond.getRuleTokenBalance(_ruleId, _tokenInAddress);
        uint256 tokenInNew = tokenInPrev - _tokenInAmount;
        LibDiamond.updateBalance(_tokenInAddress, _ruleId, _tokenInAmount, tokenInPrev, tokenInNew, IERC20Metadata(_tokenInAddress).name());

        // update token out balance
        uint256 tokenOutPrev = LibDiamond.getRuleTokenBalance(_ruleId, _tokenOutAddress);
        uint256 tokenOutNew = tokenOutPrev + _tokenOutAmount;

        LibDiamond.updateBalance(_tokenOutAddress, _ruleId, _tokenOutAmount, tokenOutPrev, tokenOutNew, IERC20Metadata(_tokenOutAddress).name());

        // update fees balance
        uint256 prevBalance = LibDiamond.getFeeBalance(_tokenInAddress);
        uint256 newBalance = prevBalance + _feeAmount;
        LibDiamond.UpdateFeeBalanceParams memory params = LibDiamond.UpdateFeeBalanceParams(_tokenInAddress, _ruleId, _feeAmount, prevBalance, newBalance, IERC20Metadata(_tokenInAddress).name());
        LibDiamond.updateFeeBalance(params);

        // Store token out address
        LibDiamond.addTokenToTokensHeld(_tokenOutAddress);
        LibDiamond.addTokenToRuleTokens(_ruleId, _tokenOutAddress);
    }
}
