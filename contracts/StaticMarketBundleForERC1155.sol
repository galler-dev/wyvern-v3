/*

  << Static Market contract >>

*/

pragma solidity 0.7.5;

import "./lib/ArrayUtils.sol";
import "./registry/AuthenticatedProxy.sol";
import "./StaticMarketBase.sol";

/**
 * @title StaticMarketBundleFor1155
 * @author Wyvern Protocol Developers
 */
contract StaticMarketBundleForERC1155 is StaticMarketBase {

    string public constant name = "Static Market Bundle For ERC1155";

    constructor ()
        public
    {}

    function ERC1155BundleForETH(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC1155BundleForETH: call must be a delegate call");

        (address[1] memory tokenGive, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[1], uint256[]));

        // TODO: addresses[2] is the atomicizer address, how to check it?
        // require(addresses[2] == tokenGive[0], "ERC1155BundleForETH: call target must equal address of token to give");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGive[0], addresses[1], addresses[4], 1);

        checkETHSideWithOffset(addresses[1], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], counterdata);

        return 1;
    }

    function ETHForERC1155Bundle(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC1155Bundle: call must be a delegate call");

        (address[1] memory tokenGet, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[1], uint256[]));

        // TODO: addresses[2] is the atomicizer address, how to check it?
        // require(addresses[5] == tokenGet[0], "ETHForERC1155Bundle: call target must equal address of token to give");
        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGet[0], addresses[4], addresses[1], 1);

        checkETHSideWithOffset(addresses[4], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], data);

        return 1;
    }

    function ERC1155BundleForETHWithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC1155BundleForETHWithOneFee: call must be a delegate call");

        (address[2] memory tokenGiveAndFeeRecipient, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[2], uint256[]));

        // TODO: addresses[2] is the atomicizer address, how to check it?
        // require(addresses[2] == tokenGive[0], "ERC1155BundleForETHWithOneFee: call target must equal address of token to give");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGiveAndFeeRecipient[0], addresses[1], addresses[4], 2);

        checkETHSideOneFeeWithOffset(addresses[1], tokenGiveAndFeeRecipient[1], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 2], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], counterdata);
        return 1;
    }

    function ETHForERC1155BundleWithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC1155BundleWithOneFee: call must be a delegate call");

        (address[2] memory tokenGetAndFeeRecipient, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[2], uint256[]));

        // TODO: addresses[2] is the atomicizer address, how to check it?
        // require(addresses[5] == tokenGet[0], "ETHForERC1155BundleWithOneFee: call target must equal address of token to give");
        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGetAndFeeRecipient[0], addresses[4], addresses[1], 2);

        checkETHSideOneFeeWithOffset(addresses[4], tokenGetAndFeeRecipient[1], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 2], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], data);
        return 1;
    }

    function ERC1155BundleForETHWithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC1155BundleForETHWithOneFee: call must be a delegate call");

        (address[3] memory tokenGiveAndFeeRecipient, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[3], uint256[]));

        // TODO: addresses[2] is the atomicizer address, how to check it?
        // require(addresses[2] == tokenGive[0], "ERC1155BundleForETHWithOneFee: call target must equal address of token to give");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGiveAndFeeRecipient[0], addresses[1], addresses[4], 2);

        checkETHSideTwoFeesWithOffset(addresses[1], tokenGiveAndFeeRecipient[1], tokenGiveAndFeeRecipient[2], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 3], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 2], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], counterdata);
        return 1;
    }

    function ETHForERC1155BundleWithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC1155BundleWithOneFee: call must be a delegate call");

        (address[3] memory tokenGetAndFeeRecipient, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[3], uint256[]));

        // TODO: addresses[2] is the atomicizer address, how to check it?
        // require(addresses[5] == tokenGet[0], "ETHForERC1155BundleWithOneFee: call target must equal address of token to give");
        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGetAndFeeRecipient[0], addresses[4], addresses[1], 2);

        checkETHSideTwoFeesWithOffset(addresses[4], tokenGetAndFeeRecipient[1], tokenGetAndFeeRecipient[2], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 3], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 2], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], data);
        return 1;
    }

    function checkERC1155SideForBundle(bytes[] memory datas, address[] memory tokenAddrs, uint[] memory tokenIdsAndAmounts, address tokenAddr, address from, address to, uint excludeLength) internal pure {
        uint halfLen = (tokenIdsAndAmounts.length - excludeLength) / 2;
        require(datas.length == halfLen && datas.length == tokenAddrs.length, "checkERC1155SideForBundle: Addresses, amounts, data lengths and ids must match in quantity");

        for (uint i = 0; i < datas.length; i++) {
            require(tokenAddrs[i] == tokenAddr, "checkERC1155SideForBundle: Token addres must be same");
            require(ArrayUtils.arrayEq(datas[i], abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)", from, to, tokenIdsAndAmounts[i], tokenIdsAndAmounts[i + halfLen], "")));
        }
    }
}
