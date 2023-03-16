// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {LibDiamond} from "../libraries/LibDiamond.sol";

contract Modifiers {
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier onlyCoinrule() {
        LibDiamond.enforceIsCoinrule();
        _;
    }

    modifier onlyCoinruleOrMaster() {
        LibDiamond.enforceIsCoinruleOrMaster();
        _;
    }

    modifier onlyMaster() {
        LibDiamond.enforceIsCoinruleMaster();
        _;
    }

    modifier onlyOwnerOrCoinrule() {
        LibDiamond.enforceIsCoinruleOrOwner();
        _;
    }

    modifier safeModeProtection() {
        LibDiamond.enforceSafeModeIsDisabled();
        _;
    }
}
