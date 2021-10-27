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

    function checkETHSide(address to, uint256 value, uint price, bytes memory data) internal pure {
        (address addr, , address[] memory addrs, uint256[] memory amounts) = extractInfoFromDataForETH(data);
        require(value >= amounts[0], "checkETHSide: msg.value must not less than price");
        require(addrs[0] == to && amounts[0] == price, "checkETHSide: Address and amount must be same");
    }

    function checkETHSideOneFee(address to, address feeRecipient, uint256 value, uint price, uint fee, bytes memory data) internal pure {
        (address addr, , address[] memory addrs, uint256[] memory amounts) = extractInfoFromDataForETH(data);
        require(value >= amounts[0] + amounts[1], "checkETHSideOneFee: msg.value must not less than price");
        require(addrs[0] == to && addrs[1] == feeRecipient, "checkETHSideOneFee: Addresses must be same");
        require(amounts[0] == price && amounts[1] == fee, "checkETHSideOneFee: Amounts must be same");
    }

    function checkETHSideTwoFees(address to, address feeRecipient, address royaltyFeeRecipient, uint256 value, uint price, uint fee, uint royaltyFee, bytes memory data) internal pure {
        (address addr, , address[] memory addrs, uint256[] memory amounts) = extractInfoFromDataForETH(data);
        require(value >= amounts[0] + amounts[1] + amounts[2], "checkETHSideTwoFees: msg.value must not less than price");
        require(addrs[0] == to && addrs[1] == feeRecipient && addrs[2] == royaltyFeeRecipient, "checkETHSideTwoFees: Addresses must be same");
        require(amounts[0] == price && amounts[1] == fee && amounts[2] == royaltyFee, "checkETHSideTwoFees: Amounts must be same");
    }

    function extractInfoFromDataForETH(bytes memory data) internal pure returns (address, uint, address[] memory, uint[] memory) {
        (address addr, uint256 value, bytes memory subData) = abi.decode(ArrayUtils.arrayDrop(data, 4), (address, uint256, bytes));

        (address[] memory addrs, uint256[] memory amounts) = abi.decode(ArrayUtils.arrayDrop(subData, 4), (address[], uint256[]));

        return (addr, value, addrs, amounts);
    }
}
