/*

  << Static Market contract >>

*/

pragma solidity 0.7.5;

import "./registry/AuthenticatedProxy.sol";
import "./StaticMarketBase.sol";
import "./static/StaticCheckERC20.sol";
import "./static/StaticCheckETH.sol";
import "./static/StaticAtomicizerBase.sol";

/**
 * @title StaticMarketBundleFor1155
 * @author Wyvern Protocol Developers
 */
contract StaticMarketBundleForERC1155 is StaticMarketBase, StaticCheckERC20, StaticCheckETH, StaticAtomicizerBase {

    string public constant name = "Static Market Bundle For ERC1155";

    constructor (address addr)
        public
    {
        atomicizer = addr;
        owner = msg.sender;
    }

    function ERC1155BundleForETH(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC1155BundleForETH: call must be a delegate call");

        (address[1] memory tokenGive, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[1], uint256[]));

        require(addresses[2] == atomicizer, "ERC1155BundleForETH: call target must equal address of atomicizer");
        require(addresses[5] == atomicizer, "ERC1155BundleForETH: countercall target must equal address of atomicizer");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGive[0], addresses[1], addresses[4], 1);

        checkETHSideWithOffset(addresses[1], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], counterdata);

        return 1;
    }

    function ETHForERC1155Bundle(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC1155Bundle: call must be a delegate call");

        (address[1] memory tokenGet, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[1], uint256[]));

        require(addresses[2] == atomicizer, "ETHForERC1155Bundle: call target must equal address of atomicizer");
        require(addresses[5] == atomicizer, "ETHForERC1155Bundle: countercall target must equal address of atomicizer");
        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGet[0], addresses[4], addresses[1], 1);

        checkETHSideWithOffset(addresses[4], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], data);

        return tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1];
    }

    function ERC1155BundleForETHWithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC1155BundleForETHWithOneFee: call must be a delegate call");

        (address[2] memory tokenGiveAndFeeRecipient, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[2], uint256[]));

        require(addresses[2] == atomicizer, "ERC1155BundleForETHWithOneFee: call target must equal address of atomicizer");
        require(addresses[5] == atomicizer, "ERC1155BundleForETHWithOneFee: countercall target must equal address of atomicizer");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGiveAndFeeRecipient[0], addresses[1], addresses[4], 2);

        checkETHSideOneFeeWithOffset(addresses[1], tokenGiveAndFeeRecipient[1], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 2], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], counterdata);
        return 1;
    }

    function ETHForERC1155BundleWithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC1155BundleWithOneFee: call must be a delegate call");

        (address[2] memory tokenGetAndFeeRecipient, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[2], uint256[]));

        require(addresses[2] == atomicizer, "ETHForERC1155BundleWithOneFee: call target must equal address of atomicizer");
        require(addresses[5] == atomicizer, "ETHForERC1155BundleWithOneFee: countercall target must equal address of atomicizer");
        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGetAndFeeRecipient[0], addresses[4], addresses[1], 2);

        checkETHSideOneFeeWithOffset(addresses[4], tokenGetAndFeeRecipient[1], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 2], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], data);
        return tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 2] + tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1];
    }

    function ERC1155BundleForETHWithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC1155BundleForETHWithTwoFees: call must be a delegate call");

        (address[3] memory tokenGiveAndFeeRecipient, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[3], uint256[]));

        require(addresses[2] == atomicizer, "ERC1155BundleForETHWithTwoFees: call target must equal address of atomicizer");
        require(addresses[5] == atomicizer, "ERC1155BundleForETHWithTwoFees: countercall target must equal address of atomicizer");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGiveAndFeeRecipient[0], addresses[1], addresses[4], 2);

        checkETHSideTwoFeesWithOffset(addresses[1], tokenGiveAndFeeRecipient[1], tokenGiveAndFeeRecipient[2], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 3], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 2], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], counterdata);
        return 1;
    }

    function ETHForERC1155BundleWithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC1155BundleWithTwoFees: call must be a delegate call");

        (address[3] memory tokenGetAndFeeRecipient, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[3], uint256[]));

        require(addresses[2] == atomicizer, "ETHForERC1155BundleWithTwoFees: call target must equal address of atomicizer");
        require(addresses[5] == atomicizer, "ETHForERC1155BundleWithTwoFees: countercall target must equal address of atomicizer");
        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGetAndFeeRecipient[0], addresses[4], addresses[1], 3);

        checkETHSideTwoFeesWithOffset(addresses[4], tokenGetAndFeeRecipient[1], tokenGetAndFeeRecipient[2], uints[0], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 3], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 2], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1], data);
        return tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 3] + tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 2] + tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1];
    }

    function ERC1155BundleForERC20(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(uints[0] == 0,"ERC1155BundleForERC20: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC1155BundleForERC20: call must be a delegate call");

        (address[2] memory tokenGiveGet, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[2], uint256[]));

        require(addresses[2] == atomicizer, "ERC1155BundleForERC20: call target must equal address of atomicizer");
        require(addresses[5] == tokenGiveGet[1], "ERC1155BundleForERC20: countercall target must equal address of token to get");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGiveGet[0], addresses[1], addresses[4], 1);

        checkERC20Side(counterdata, addresses[4], addresses[1], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1]);

        return 1;
    }

    function ERC20ForERC1155Bundle(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(uints[0] == 0,"ERC20ForERC1155Bundle: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC20ForERC1155Bundle: call must be a direct call");

        (address[2] memory tokenGiveGet, uint256[] memory tokenIdsAndAmountsAndPrice) = abi.decode(extra, (address[2], uint256[]));

        require(addresses[2] == tokenGiveGet[0], "ERC20ForERC1155Bundle: call target must equal address of token to give");
        require(addresses[5] == atomicizer, "ERC20ForERC1155Bundle: countercall target must equal address of atomicizer");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAndAmountsAndPrice, tokenGiveGet[1], addresses[4], addresses[1], 1);

        checkERC20Side(data, addresses[1], addresses[4], tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1]);
        return tokenIdsAndAmountsAndPrice[tokenIdsAndAmountsAndPrice.length - 1];
    }

    function ERC1155BundleForERC20WithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(uints[0] == 0, "ERC1155BundleForERC20WithOneFee: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC1155BundleForERC20WithOneFee: call must be a delegate call");

        (address[3] memory tokenGiveGetAndFeeRecipient, uint256[] memory tokenIdsAmountsPriceAndFee) = abi.decode(extra, (address[3], uint256[]));

        require(addresses[2] == atomicizer, "ERC1155BundleForERC20WithOneFee: call target must equal address of atomicizer");
        require(addresses[5] == atomicizer, "ERC1155BundleForERC20WithOneFee: countercall target must equal address of atomicizer");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAmountsPriceAndFee, tokenGiveGetAndFeeRecipient[0], addresses[1], addresses[4], 2);

        checkERC20SideWithOneFee(counterdata, addresses[4], addresses[1], tokenGiveGetAndFeeRecipient[2], tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 2], tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 1]);
        return 1;
    }

    function ERC20ForERC1155BundleWithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(uints[0] == 0, "ERC20ForERC1155BundleWithOneFee: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC20ForERC1155BundleWithOneFee: call must be a delegate call");

        (address[3] memory tokenGiveGetAndFeeRecipient, uint256[] memory tokenIdsAmountsPriceAndFee) = abi.decode(extra, (address[3], uint256[]));

        require(addresses[2] == atomicizer, "ERC20ForERC1155BundleWithOneFee: countercall target must equal address of atomicizer");
        require(addresses[5] == atomicizer, "ERC20ForERC1155BundleWithOneFee: call target must equal address of atomicizer");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAmountsPriceAndFee, tokenGiveGetAndFeeRecipient[1], addresses[4], addresses[1], 2);

        checkERC20SideWithOneFee(data, addresses[1], addresses[4], tokenGiveGetAndFeeRecipient[2], tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 2], tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 1]);
        return tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 2] + tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 1];
    }

    function ERC1155BundleForERC20WithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(uints[0] == 0, "ERC1155BundleForERC20WithTwoFees: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC1155BundleForERC20WithTwoFees: call must be a delegate call");

        (address[4] memory tokenGiveGetAndFeeRecipient, uint256[] memory tokenIdsAmountsPriceAndFee) = abi.decode(extra, (address[4], uint256[]));

        require(addresses[2] == atomicizer, "ERC1155BundleForERC20WithTwoFees: call target must equal address of atomicizer");
        require(addresses[5] == atomicizer, "ERC1155BundleForERC20WithTwoFees: countercall target must equal address of atomicizer");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAmountsPriceAndFee, tokenGiveGetAndFeeRecipient[0], addresses[1], addresses[4], 3);

        checkERC20SideWithTwoFees(counterdata, addresses[4], addresses[1], tokenGiveGetAndFeeRecipient[2], tokenGiveGetAndFeeRecipient[3], tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 3], tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 2], tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 1]);
        return 1;
    }

    function ERC20ForERC1155BundleWithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public view returns (uint)
    {
        require(uints[0] == 0, "ERC20ForERC1155BundleWithTwoFees: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC20ForERC1155BundleWithTwoFees: call must be a delegate call");

        (address[4] memory tokenGiveGetAndFeeRecipient, uint256[] memory tokenIdsAmountsPriceAndFee) = abi.decode(extra, (address[4], uint256[]));

        require(addresses[2] == atomicizer, "ERC20ForERC1155BundleWithTwoFees: call target must equal address of atomicizer");
        require(addresses[5] == atomicizer, "ERC20ForERC1155BundleWithTwoFees: countercall target must equal address of atomicizer");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC1155SideForBundle(allBytes, tokenAddrs, tokenIdsAmountsPriceAndFee, tokenGiveGetAndFeeRecipient[1], addresses[4], addresses[1], 3);

        checkERC20SideWithTwoFees(data, addresses[1], addresses[4], tokenGiveGetAndFeeRecipient[2], tokenGiveGetAndFeeRecipient[3], tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 3], tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 2], tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 1]);
        return tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 3] + tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 2] + tokenIdsAmountsPriceAndFee[tokenIdsAmountsPriceAndFee.length - 1];
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
