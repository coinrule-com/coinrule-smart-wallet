// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
 * EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import "../libraries/ArrayUtils.sol";

error InitializationFunctionReverted(address _initializationContractAddress, bytes _calldata);
error InsufficientFundsOnContractError(string message);
error InsufficientFundsOnRuleError(string message);

library LibDiamond {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("coinrule.smart.wallet");

    struct FacetAddressAndPosition {
        address facetAddress;
        uint96 functionSelectorPosition; // position in facetFunctionSelectors.functionSelectors array
    }

    struct FacetFunctionSelectors {
        bytes4[] functionSelectors;
        uint256 facetAddressPosition; // position of facetAddress in facetAddresses array
    }

    struct TokenSet {
        address[] tokens;
        mapping(address => bool) has;
    }

    struct Wallet {
        address token;
        uint256 amount;
    }

    struct UpgradeTransaction {
        uint transactionId;
        bytes32 hash;
        bool coinruleSign;
        bool ownerSign;
        bool completed;
    }

    struct DiamondStorage {
        mapping(bytes4 => bytes32) facets; // maps function selectors to the facets that execute the functions.
        mapping(uint256 => bytes32) selectorSlots; // array of slots of function selectors.
        uint16 selectorCount; // The number of function selectors in selectorSlots
        mapping(bytes4 => bool) supportedInterfaces; // Used to query if a contract implements an interface.
        /*** Storage Variables ***/
        bool safeMode; // safe mode, gets enabled by the master admin in case of emergency
        address owner; // owner of the contract
        address coinrule; // address of coinrule wallet that will interact with this contract
        address coinruleMaster; // address to coinrule master account
        mapping(string => mapping(address => Wallet)) balances; // a map of all the balances on this wallet
        mapping(address => Wallet) feeBalances; // a map of collected coinrule fees
        TokenSet tokensHeld; // addresses of all tokens the contract is using
        mapping(string => TokenSet) ruleTokens; // a map of rules and the tokens that they hold
        address[] approvedExchangesAddresses; // addresses Exchanges the user wants to use
        IWETH wrappedEth; // address of the wrapped eth used by this wallet
        mapping(uint => UpgradeTransaction) upgrades; // upgrade transactions
        uint upgradeCount;
    }

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    event SafeModeEnabled(string message);
    event SafeModeDisabled(string message);

    function disableSafeMode(string memory message) internal {
        DiamondStorage storage ds = diamondStorage();
        ds.safeMode = false;
        emit SafeModeDisabled(message);
    }

    function enableSafeMode(string memory message) internal {
        DiamondStorage storage ds = diamondStorage();
        ds.safeMode = true;
        emit SafeModeEnabled(message);
    }

    function enforceSafeModeIsDisabled() internal view {
        require(diamondStorage().safeMode == false, "Safe mode is enabled, feature is disabled contact coinrule support");
    }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function setContractOwner(address _newOwner) internal {
        DiamondStorage storage ds = diamondStorage();
        address previousOwner = ds.owner;
        ds.owner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = diamondStorage().owner;
    }

    function contractAdmin() internal view returns (address contractAdmin_) {
        contractAdmin_ = diamondStorage().coinrule;
    }

    function contractMaster() internal view returns (address contractCoinruleMaster_) {
        contractCoinruleMaster_ = diamondStorage().coinruleMaster;
    }

    function enforceIsContractOwner() internal view {
        require(msg.sender == diamondStorage().owner, "Must be contract owner");
    }

    event DiamondCut(IDiamondCut.FacetCut[] _diamondCut, address _init, bytes _calldata);

    bytes32 constant CLEAR_ADDRESS_MASK = bytes32(uint256(0xffffffffffffffffffffffff));
    bytes32 constant CLEAR_SELECTOR_MASK = bytes32(uint256(0xffffffff << 224));

    // Internal function version of diamondCut
    function diamondCut(IDiamondCut.FacetCut[] memory _diamondCut, address _init, bytes memory _calldata) internal {
        DiamondStorage storage ds = diamondStorage();
        uint256 originalSelectorCount = ds.selectorCount;
        uint256 selectorCount = originalSelectorCount;
        bytes32 selectorSlot;

        if (selectorCount & 7 > 0) {
            selectorSlot = ds.selectorSlots[selectorCount >> 3];
        }
        for (uint256 facetIndex; facetIndex < _diamondCut.length; ) {
            (selectorCount, selectorSlot) = addReplaceRemoveFacetSelectors(
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
        initializeDiamondCut(_init, _calldata);
    }

    function addReplaceRemoveFacetSelectors(
        uint256 _selectorCount,
        bytes32 _selectorSlot,
        address _newFacetAddress,
        IDiamondCut.FacetCutAction _action,
        bytes4[] memory _selectors
    ) internal returns (uint256, bytes32) {
        DiamondStorage storage ds = diamondStorage();
        require(_selectors.length > 0, "LibDiamondCut: No selectors in facet to cut");
        if (_action == IDiamondCut.FacetCutAction.Add) {
            enforceHasContractCode(_newFacetAddress, "LibDiamondCut: Add facet has no code");
            for (uint256 selectorIndex; selectorIndex < _selectors.length; ) {
                bytes4 selector = _selectors[selectorIndex];
                bytes32 oldFacet = ds.facets[selector];
                require(address(bytes20(oldFacet)) == address(0), "LibDiamondCut: Can't add function that already exists");
                ds.facets[selector] = bytes20(_newFacetAddress) | bytes32(_selectorCount);
                uint256 selectorInSlotPosition = (_selectorCount & 7) << 5;
                _selectorSlot = (_selectorSlot & ~(CLEAR_SELECTOR_MASK >> selectorInSlotPosition)) | (bytes32(selector) >> selectorInSlotPosition);
                if (selectorInSlotPosition == 224) {
                    ds.selectorSlots[_selectorCount >> 3] = _selectorSlot;
                    _selectorSlot = 0;
                }
                _selectorCount++;

                unchecked {
                    selectorIndex++;
                }
            }
        } else if (_action == IDiamondCut.FacetCutAction.Replace) {
            enforceHasContractCode(_newFacetAddress, "LibDiamondCut: Replace facet has no code");
            for (uint256 selectorIndex; selectorIndex < _selectors.length; ) {
                bytes4 selector = _selectors[selectorIndex];
                bytes32 oldFacet = ds.facets[selector];
                address oldFacetAddress = address(bytes20(oldFacet));
                require(oldFacetAddress != address(this), "LibDiamondCut: Can't replace immutable function");
                require(oldFacetAddress != _newFacetAddress, "LibDiamondCut: Can't replace function with same function");
                require(oldFacetAddress != address(0), "LibDiamondCut: Can't replace function that doesn't exist");
                ds.facets[selector] = (oldFacet & CLEAR_ADDRESS_MASK) | bytes20(_newFacetAddress);

                unchecked {
                    selectorIndex++;
                }
            }
        } else if (_action == IDiamondCut.FacetCutAction.Remove) {
            require(_newFacetAddress == address(0), "LibDiamondCut: Remove facet address must be address(0)");
            uint256 selectorSlotCount = _selectorCount >> 3;
            uint256 selectorInSlotIndex = _selectorCount & 7;
            for (uint256 selectorIndex; selectorIndex < _selectors.length; ) {
                if (_selectorSlot == 0) {
                    selectorSlotCount--;
                    _selectorSlot = ds.selectorSlots[selectorSlotCount];
                    selectorInSlotIndex = 7;
                } else {
                    selectorInSlotIndex--;
                }
                bytes4 lastSelector;
                uint256 oldSelectorsSlotCount;
                uint256 oldSelectorInSlotPosition;
                {
                    bytes4 selector = _selectors[selectorIndex];
                    bytes32 oldFacet = ds.facets[selector];
                    require(address(bytes20(oldFacet)) != address(0), "LibDiamondCut: Can't remove function that doesn't exist");
                    require(address(bytes20(oldFacet)) != address(this), "LibDiamondCut: Can't remove immutable function");

                    lastSelector = bytes4(_selectorSlot << (selectorInSlotIndex << 5));
                    if (lastSelector != selector) {
                        ds.facets[lastSelector] = (oldFacet & CLEAR_ADDRESS_MASK) | bytes20(ds.facets[lastSelector]);
                    }
                    delete ds.facets[selector];
                    uint256 oldSelectorCount = uint16(uint256(oldFacet));
                    oldSelectorsSlotCount = oldSelectorCount >> 3;

                    oldSelectorInSlotPosition = (oldSelectorCount & 7) << 5;
                }
                if (oldSelectorsSlotCount != selectorSlotCount) {
                    bytes32 oldSelectorSlot = ds.selectorSlots[oldSelectorsSlotCount];
                    oldSelectorSlot = (oldSelectorSlot & ~(CLEAR_SELECTOR_MASK >> oldSelectorInSlotPosition)) | (bytes32(lastSelector) >> oldSelectorInSlotPosition);
                    ds.selectorSlots[oldSelectorsSlotCount] = oldSelectorSlot;
                } else {
                    _selectorSlot = (_selectorSlot & ~(CLEAR_SELECTOR_MASK >> oldSelectorInSlotPosition)) | (bytes32(lastSelector) >> oldSelectorInSlotPosition);
                }
                if (selectorInSlotIndex == 0) {
                    delete ds.selectorSlots[selectorSlotCount];
                    _selectorSlot = 0;
                }

                unchecked {
                    selectorIndex++;
                }
            }
            _selectorCount = selectorSlotCount * 8 + selectorInSlotIndex;
        } else {
            revert("LibDiamondCut: Incorrect FacetCutAction");
        }
        return (_selectorCount, _selectorSlot);
    }

    function initializeDiamondCut(address _init, bytes memory _calldata) internal {
        if (_init == address(0)) {
            return;
        }
        enforceHasContractCode(_init, "LibDiamondCut: _init address has no code");
        (bool success, bytes memory error) = _init.delegatecall(_calldata);
        if (!success) {
            if (error.length > 0) {
                /// @solidity memory-safe-assembly
                assembly {
                    let returndata_size := mload(error)
                    revert(add(32, error), returndata_size)
                }
            } else {
                revert InitializationFunctionReverted(_init, _calldata);
            }
        }
    }

    function enforceHasContractCode(address _contract, string memory _errorMessage) internal view {
        uint256 contractSize;
        assembly {
            contractSize := extcodesize(_contract)
        }
        require(contractSize > 0, _errorMessage);
    }

    /* Custom Getter and Setter Methods */

    event BalanceUpdateEvent(address from, address tokenAddress, string tokenName, int256 amount, uint256 oldBalance, uint256 newBalance);

    event FeeBalanceUpdateEvent(address tokenAddress, string tokenName, int256 amount, uint256 oldBalance, uint256 newBalance, string ruleId);

    event FeeWithdrawalEvent(address tokenAddress, string tokenName, int256 amount, uint256 oldBalance, uint256 newBalance);

    event UpgradeTransactionEvent(uint transactionId, bool newTransaction, bool completed);

    function setCoinruleAddress(address coinrule) internal {
        DiamondStorage storage ds = diamondStorage();
        ds.coinrule = coinrule;
    }

    function setCoinruleMasterAddress(address coinruleMaster) internal {
        DiamondStorage storage ds = diamondStorage();
        ds.coinruleMaster = coinruleMaster;
    }

    function getCoinruleMasterAddress() internal view returns (address) {
        DiamondStorage storage ds = diamondStorage();
        return ds.coinruleMaster;
    }

    function setWrappedEth(address weth) internal {
        DiamondStorage storage ds = diamondStorage();
        ds.wrappedEth = IWETH(weth);
    }

    function enforceIsCoinrule() internal view {
        require(msg.sender == diamondStorage().coinrule, "Must be Coinrule");
    }

    function enforceIsCoinruleMaster() internal view {
        require(msg.sender == diamondStorage().coinruleMaster, "Must be Coinrule Master account");
    }

    function enforceIsCoinruleOrMaster() internal view {
        require(msg.sender == diamondStorage().coinrule || msg.sender == diamondStorage().coinruleMaster, "Must be Coinrule or Master coinrule");
    }

    function enforceIsCoinruleOrOwner() internal view {
        require(msg.sender == diamondStorage().owner || msg.sender == diamondStorage().coinrule, "Must be Coinrule or Owner");
    }

    function addApprovedExchangeAddresses(address _spender) internal {
        DiamondStorage storage ds = diamondStorage();
        ds.approvedExchangesAddresses.push(_spender);
    }

    function removeApprovedExchangeAddresses(address _spender) internal {
        DiamondStorage storage ds = diamondStorage();

        (uint index, bool exists) = ArrayUtils.indexOf(ds.approvedExchangesAddresses, _spender);
        if (exists) delete ds.approvedExchangesAddresses[index];
    }

    function getRuleTokenBalance(string memory ruleId, address token) internal view returns (uint256) {
        DiamondStorage storage ds = diamondStorage();

        if (ds.ruleTokens[ruleId].has[token]) {
            return ds.balances[ruleId][token].amount;
        } else {
            return 0;
        }
    }

    function getFeeBalance(address token) internal view returns (uint256) {
        DiamondStorage storage ds = diamondStorage();

        if (ds.tokensHeld.has[token]) {
            return ds.feeBalances[token].amount;
        } else {
            return 0;
        }
    }

    function updateBalance(address token, string memory ruleId, uint256 amount, uint256 previousBalance, uint256 newBalance, string memory tokenName) internal {
        DiamondStorage storage ds = diamondStorage();
        ds.balances[ruleId][token] = Wallet(token, newBalance);

        emit BalanceUpdateEvent(msg.sender, token, tokenName, int(amount), previousBalance, newBalance);
    }

    struct UpdateFeeBalanceParams {
        address token;
        string ruleId;
        uint256 feeAmount;
        uint256 previousFeeBalance;
        uint256 newFeeBalance;
        string tokenName;
    }

    function updateFeeBalance(UpdateFeeBalanceParams memory params) internal {
        DiamondStorage storage ds = diamondStorage();

        ds.feeBalances[params.token] = Wallet(params.token, params.newFeeBalance);

        emit FeeBalanceUpdateEvent(params.token, params.tokenName, int(params.feeAmount), params.previousFeeBalance, params.newFeeBalance, params.ruleId);
    }

    function updateFeeBalanceAfterWithdrawal(address token, string memory tokenName, uint256 feeAmount, uint256 previousFeeBalance, uint256 newFeeBalance) internal {
        DiamondStorage storage ds = diamondStorage();

        ds.feeBalances[token] = Wallet(token, newFeeBalance);

        emit FeeBalanceUpdateEvent(token, tokenName, int(feeAmount) * -1, previousFeeBalance, newFeeBalance, "");
        emit FeeWithdrawalEvent(token, tokenName, int(feeAmount), previousFeeBalance, newFeeBalance);
    }

    function addToRuleBalance(address token, string memory ruleId, uint256 amount, string memory tokenName) internal {
        DiamondStorage storage ds = diamondStorage();

        Wallet memory previousBalance = ds.balances[ruleId][token];
        uint256 newBalance = previousBalance.amount + amount;

        updateBalance(token, ruleId, amount, previousBalance.amount, newBalance, tokenName);
    }

    function addTokenToTokensHeld(address token) internal {
        DiamondStorage storage ds = diamondStorage();

        if (!ds.tokensHeld.has[token]) {
            ds.tokensHeld.tokens.push(token);
            ds.tokensHeld.has[token] = true;
        }
    }

    function addTokenToRuleTokens(string memory _ruleId, address token) internal {
        DiamondStorage storage ds = diamondStorage();

        if (!ds.ruleTokens[_ruleId].has[token]) {
            ds.ruleTokens[_ruleId].tokens.push(token);
            ds.ruleTokens[_ruleId].has[token] = true;
        }
    }

    event InsufficientFundsOnContract(string message, address tokenAddress, uint256 amount);
    event InsufficientFundsOnRule(string message, string ruleId, address tokenAddress, uint256 amount);

    function enforceRuleHasEnoughBalance(string memory _ruleId, address _tokenAddress, uint256 _amount) internal {
        DiamondStorage storage ds = diamondStorage();
        Wallet memory wallet = ds.balances[_ruleId][_tokenAddress];
        if (_amount > wallet.amount) {
            emit InsufficientFundsOnRule("Rule does not have enough balance allocated", _ruleId, _tokenAddress, _amount);
            revert InsufficientFundsOnRuleError("Rule does not have enough balance allocated");
        }
    }

    function enforceContractHasEnoughBalance(address _tokenAddress, uint256 _amount) internal {
        IERC20 token = IERC20(_tokenAddress);
        uint256 feeAmountLocked = getFeeBalance(_tokenAddress);
        if (_amount > token.balanceOf(address(this)) - feeAmountLocked) {
            emit InsufficientFundsOnContract("Contract does not have enough balance allocated", _tokenAddress, _amount);
            revert InsufficientFundsOnContractError("Contract does not have enough balance allocated");
        }
    }

    function getUpgradeCount() internal view returns (uint) {
        DiamondStorage storage ds = diamondStorage();
        return ds.upgradeCount;
    }

    function increaseUpgradeCount() internal {
        DiamondStorage storage ds = diamondStorage();
        ds.upgradeCount += 1;
    }

    function addUpgradeTransaction(uint transactionId, UpgradeTransaction memory ts) internal {
        DiamondStorage storage ds = diamondStorage();
        ds.upgrades[transactionId] = ts;

        emit UpgradeTransactionEvent(transactionId, true, false);
    }

    function upgradeTransactionCompleted(uint transactionId) internal {
        emit UpgradeTransactionEvent(transactionId, false, true);
    }
}
