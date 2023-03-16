// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../shared/Modifiers.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract SafeModeFacet is Modifiers {
    /// @notice Disable safe mode on contract
    /// @param message custom message
    function disableSafeMode(string memory message) external onlyMaster {
        LibDiamond.disableSafeMode(message);
    }

    /// @notice Enable safe mode on contract
    /// @param message custom message
    function enableSafeMode(string memory message) external onlyMaster {
        LibDiamond.enableSafeMode(message);
    }

    /// @notice View status of safe mode (enabled or disabled)
    function viewSafeModeStatus() external view returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.safeMode;
    }
}
