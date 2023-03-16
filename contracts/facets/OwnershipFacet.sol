// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IERC173} from "../interfaces/IERC173.sol";

contract OwnershipFacet is IERC173 {
    /// @notice Transfer ownership of the contract to a new address
    /// @param _newOwner the new address
    function transferOwnership(address _newOwner) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.setContractOwner(_newOwner);
    }

    /// @notice Transfer Admin role of the contract to a new address
    /// @param _newAdmin the new address
    function transferAdminship(address _newAdmin) external {
        LibDiamond.enforceIsCoinruleMaster();
        LibDiamond.setCoinruleAddress(_newAdmin);
    }

    /// @notice Transfer Master role of the contract to a new address
    /// @param _newMaster the new address
    function transferMastership(address _newMaster) external {
        LibDiamond.enforceIsCoinruleMaster();
        LibDiamond.setCoinruleMasterAddress(_newMaster);
    }

    /// @notice Retrieve the owner of the contract
    function owner() external view override returns (address owner_) {
        owner_ = LibDiamond.contractOwner();
    }

    /// @notice Retrieve the address of coinrule service
    function coinrule() external view returns (address coinrule_) {
        coinrule_ = LibDiamond.contractAdmin();
    }

    /// @notice Retrieve address of coinrule master wallet
    function coinruleMaster() external view returns (address coinruleMaster_) {
        coinruleMaster_ = LibDiamond.contractMaster();
    }
}
