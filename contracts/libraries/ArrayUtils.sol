// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

library ArrayUtils {
    /// @return Returns index and ok of the first occurrence starting from index 0
    function indexOf(address[] memory addresses, address a) internal pure returns (uint, bool) {
        for (uint i = 0; i < addresses.length; i++) {
            if (addresses[i] == a) {
                return (i, true);
            }
        }
        return (0, false);
    }
}
