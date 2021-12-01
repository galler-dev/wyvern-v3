/*

  << Static Market contract >>

*/

import "./lib/ArrayUtils.sol";

pragma solidity 0.7.5;

contract StaticMarketBase {

    function extractInfoFromData(bytes memory data) internal pure returns (address[] memory, bytes[] memory) {
        (address[] memory addrs, uint256[] memory values, uint256[] memory calldataLengths, bytes memory calldatas) = abi.decode(ArrayUtils.arrayDrop(data, 4), (address[], uint256[], uint256[], bytes));

        require(addrs.length == values.length && addrs.length == calldataLengths.length, "extractInfoFromData: Addresses, calldata lengths, and values must match in quantity");

        bytes[] memory allBytes = new bytes[](addrs.length);

        uint start = 0;
        for (uint i = 0; i < addrs.length; i++) {
            if (i == 1) {
                start = calldataLengths[i - 1];
            } else if (i > 1) {
                start += calldataLengths[i];
            }

            allBytes[i] = ArrayUtils.arraySlice(calldatas, start, calldataLengths[i]);
        }
        return (addrs, allBytes);
    }
}
