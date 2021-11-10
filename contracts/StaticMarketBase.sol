/*

  << Static Market contract >>

*/

import "./lib/ArrayUtils.sol";

pragma solidity 0.7.5;

contract StaticMarketBase {
    function checkERC20Side(bytes memory data, address from, address to, uint256 amount)
        internal
        pure
    {
        require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
    }

    function checkERC20SideWithOneFee(bytes memory data, address from, address to, address feeRecipient, uint256 amount, uint256 fee)
        internal
        pure
    {
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 356, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 516, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, feeRecipient, fee)));
    }

    function checkERC20SideWithTwoFees(bytes memory data, address from, address to, address feeRecipient, address royaltyFeeRecipient, uint256 amount, uint256 fee, uint256 royaltyFee)
        internal
        pure
    {
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 452, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 612, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, feeRecipient, fee)));
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 772, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, royaltyFeeRecipient, royaltyFee)));
    }

    function checkERC721Side(bytes memory data, address from, address to, uint256 tokenId)
        internal
        pure
    {
        require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, tokenId)));
    }

    function getERC1155AmountFromCalldata(bytes memory data)
        internal
        pure
        returns (uint256)
    {
        (uint256 amount) = abi.decode(ArrayUtils.arraySlice(data, 100, 32), (uint256));
        return amount;
    }

    function checkERC1155Side(bytes memory data, address from, address to, uint256 tokenId, uint256 amount)
        internal
        pure
    {
        require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)", from, to, tokenId, amount, "")));
    }

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

    function checkETHSideWithOffset(address to, uint256 value, uint price, bytes memory data) internal pure {
        require(value >= price, "checkETHSideWithOffset: msg.value must not less than price");
        address[] memory addrs = new address[](1);
        addrs[0] = to;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = price;
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 132, 196), abi.encodeWithSignature("transferETH(address[],uint256[])", addrs, amounts)));
    }

    function checkETHSideOneFeeWithOffset(address to, address feeRecipient, uint256 value, uint price, uint fee, bytes memory data) internal pure {
        require(value >= price + fee, "checkETHSideOneFeeWithOffset: msg.value must not less than price");
        address[] memory addrs = new address[](2);
        addrs[0] = to;
        addrs[1] = feeRecipient;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = price;
        amounts[1] = fee;
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 132, 260), abi.encodeWithSignature("transferETH(address[],uint256[])", addrs, amounts)));
    }

    function checkETHSideTwoFeesWithOffset(address to, address feeRecipient, address royaltyFeeRecipient, uint256 value, uint price, uint fee, uint royaltyFee, bytes memory data) internal pure {
        require(value >= price + fee + royaltyFee, "checkETHSideTwoFeesWithOffset: msg.value must not less than price");
        address[] memory addrs = new address[](3);
        addrs[0] = to;
        addrs[1] = feeRecipient;
        addrs[2] = royaltyFeeRecipient;
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = price;
        amounts[1] = fee;
        amounts[2] = royaltyFee;
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 132, 324), abi.encodeWithSignature("transferETH(address[],uint256[])", addrs, amounts)));
    }
}
