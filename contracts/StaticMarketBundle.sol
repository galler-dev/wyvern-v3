/*

  << Static Market contract >>

*/

pragma solidity 0.7.5;

import "./lib/ArrayUtils.sol";
import "./registry/AuthenticatedProxy.sol";
import "./StaticMarketBase.sol";

/**
 * @title StaticMarketBundle
 * @author Wyvern Protocol Developers
 */
contract StaticMarketBundle is StaticMarketBase {

    string public constant name = "Static Market Bundle";

    constructor ()
        public
    {}

    function ERC721BundleForERC20(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(uints[0] == 0,"ERC721BundleForERC20: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC721BundleForERC20: call must be a delegate call");

        (address[2] memory tokenGiveGet, uint256[] memory tokenIdsAndPrice) = abi.decode(extra, (address[2], uint256[]));

        require(tokenIdsAndPrice[tokenIdsAndPrice.length - 1] > 0,"ERC721BundleForERC20: ERC721 price must be larger than zero");
        // TODO: Position 0 is the atomicizer address
        // require(addresses[2] == tokenGiveGet[0], "ERC721BundleForERC20: call target must equal address of token to give");
        require(addresses[5] == tokenGiveGet[1], "ERC721BundleForERC20: countercall target must equal address of token to get");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC721Side(allBytes, tokenAddrs, tokenIdsAndPrice, tokenGiveGet[0], addresses[1], addresses[4], 1);
        checkERC20Side(counterdata,addresses[4],addresses[1],tokenIdsAndPrice[tokenIdsAndPrice.length - 1]);

        return 1;
    }

    function ERC20ForERC721Bundle(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(uints[0] == 0,"ERC20ForERC721Bundle: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC20ForERC721Bundle: call must be a direct call");

        (address[2] memory tokenGiveGet, uint256[] memory tokenIdsAndPrice) = abi.decode(extra, (address[2], uint256[]));

        require(tokenIdsAndPrice[tokenIdsAndPrice.length - 1] > 0,"ERC20ForERC721Bundle: ERC721 price must be larger than zero");
        require(addresses[2] == tokenGiveGet[0], "ERC20ForERC721Bundle: call target must equal address of token to give");
        // TODO: Position 1 is the atomicizer address
        // require(addresses[5] == tokenGiveGet[1], "ERC20ForERC721Bundle: countercall target must equal address of token to get");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC721Side(allBytes, tokenAddrs, tokenIdsAndPrice, tokenGiveGet[1], addresses[4], addresses[1], 1);
        checkERC20Side(data, addresses[1], addresses[4], tokenIdsAndPrice[tokenIdsAndPrice.length - 1]);

        return 1;
    }

    function ERC721BundleForERC20WithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(uints[0] == 0,"ERC721BundleForERC20WithOneFee: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC721BundleForERC20WithOneFee: call must be a delegate call");

        (address[3] memory tokenGiveGetAndFeeRecipient, uint256[] memory tokenIdsAndPriceAndFee) = abi.decode(extra, (address[3], uint256[]));

        require(tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 2] > 0,"ERC721BundleForERC20WithOneFee: ERC721 price must be larger than zero");
        require(tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 1] > 0,"ERC721BundleForERC20WithOneFee: Fee must be larger than zero");
        // TODO: Position 0 and 1 in tokenGiveGetAndFeeRecipient is the atomicizer address.
        // require(addresses[2] == tokenGiveGetAndFeeRecipient[0], "ERC721BundleForERC20WithOneFee: call target must equal address of token to give");
        // require(addresses[5] == tokenGiveGetAndFeeRecipient[1], "ERC721BundleForERC20WithOneFee: countercall target must equal address of token to get");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC721Side(allBytes, tokenAddrs, tokenIdsAndPriceAndFee, tokenGiveGetAndFeeRecipient[0], addresses[1], addresses[4], 2);
        checkERC20SideWithOneFee(counterdata, addresses[4], addresses[1], tokenGiveGetAndFeeRecipient[2], tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 2], tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 1]);
        return 1;
    }

    function ERC20ForERC721BundleWithOneFee(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(uints[0] == 0,"ERC20ForERC721BundleWithOneFee: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC20ForERC721BundleWithOneFee: call must be a delegate call");

        (address[3] memory tokenGiveGetAndFeeRecipient, uint256[] memory tokenIdsAndPriceAndFee) = abi.decode(extra, (address[3], uint256[]));

        require(tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 2] > 0,"ERC20ForERC721BundleWithOneFee: ERC721 price must be larger than zero");
        require(tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 1] > 0,"ERC20ForERC721BundleWithOneFee: Fee must be larger than zero");
        // TODO: Position 0 and 1 is the atomicizer address
        // require(addresses[2] == tokenGiveGet[0], "ERC20ForERC721BundleWithOneFee: call target must equal address of token to give");
        // require(addresses[5] == tokenGiveGet[1], "ERC20ForERC721BundleWithOneFee: countercall target must equal address of token to get");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC721Side(allBytes, tokenAddrs, tokenIdsAndPriceAndFee, tokenGiveGetAndFeeRecipient[1], addresses[4], addresses[1], 2);
        checkERC20SideWithOneFee(data, addresses[1], addresses[4], tokenGiveGetAndFeeRecipient[2], tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 2], tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 1]);

        return 1;
    }

    function ERC721BundleForERC20WithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(uints[0] == 0,"ERC721BundleForERC20WithTwoFees: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC721BundleForERC20WithTwoFees: call must be a delegate call");

        (address[4] memory tokenGiveGetAndFeeRecipient, uint256[] memory tokenIdsAndPriceAndFee) = abi.decode(extra, (address[4], uint256[]));

        require(tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 3] > 0,"ERC721BundleForERC20WithTwoFees: ERC721 price must be larger than zero");
        require(tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 2] > 0,"ERC721BundleForERC20WithTwoFees: Fee must be larger than zero");
        require(tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 1] > 0,"ERC721BundleForERC20WithTwoFees: Royalty fee must be larger than zero");
        // TODO: Position 0 and 1 in tokenGiveGetAndFeeRecipient is the atomicizer address.
        // require(addresses[2] == tokenGiveGetAndFeeRecipient[0], "ERC721BundleForERC20WithTwoFees: call target must equal address of token to give");
        // require(addresses[5] == tokenGiveGetAndFeeRecipient[1], "ERC721BundleForERC20WithTwoFees: countercall target must equal address of token to get");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(data);
        checkERC721Side(allBytes, tokenAddrs, tokenIdsAndPriceAndFee, tokenGiveGetAndFeeRecipient[0], addresses[1], addresses[4], 3);
        checkERC20SideWithTwoFees(counterdata, addresses[4], addresses[1], tokenGiveGetAndFeeRecipient[2], tokenGiveGetAndFeeRecipient[3], tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 3], tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 2], tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 1]);

        return 1;
    }

    function ERC20ForERC721BundleWithTwoFees(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(uints[0] == 0,"ERC20ForERC721BundleWithTwoFees: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ERC20ForERC721BundleWithTwoFees: call must be a delegate call");

        (address[4] memory tokenGiveGetAndFeeRecipient, uint256[] memory tokenIdsAndPriceAndFee) = abi.decode(extra, (address[4], uint256[]));

        require(tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 3] > 0,"ERC20ForERC721BundleWithTwoFees: ERC721 price must be larger than zero");
        require(tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 2] > 0,"ERC20ForERC721BundleWithTwoFees: Fee must be larger than zero");
        require(tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 1] > 0,"ERC20ForERC721BundleWithTwoFees: Royalty fee must be larger than zero");
        // TODO: Position 0 and 1 is the atomicizer address
        // require(addresses[2] == tokenGiveGet[0], "ERC20ForERC721BundleWithTwoFees: call target must equal address of token to give");
        // require(addresses[5] == tokenGiveGet[1], "ERC20ForERC721BundleWithTwoFees: countercall target must equal address of token to get");

        (address[] memory tokenAddrs, bytes[] memory allBytes) = extractInfoFromData(counterdata);
        checkERC721Side(allBytes, tokenAddrs, tokenIdsAndPriceAndFee, tokenGiveGetAndFeeRecipient[1], addresses[4], addresses[1], 3);
        checkERC20SideWithTwoFees(data, addresses[1], addresses[4], tokenGiveGetAndFeeRecipient[2], tokenGiveGetAndFeeRecipient[3], tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 3], tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 2], tokenIdsAndPriceAndFee[tokenIdsAndPriceAndFee.length - 1]);

        return 1;
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
                start = calldataLengths[i - 1] + calldataLengths[i];
            }

            allBytes[i] = ArrayUtils.arraySlice(calldatas, start, calldataLengths[i]);
        }
        return (addrs, allBytes);
    }

    function checkERC721Side(bytes[] memory datas, address[] memory tokenAddrs, uint[] memory tokenIdsAndPrice, address tokenAddr, address from, address to, uint excludeSize) internal pure {
        require(datas.length == tokenIdsAndPrice.length - excludeSize && datas.length == tokenAddrs.length, "checkERC721Side: Addresses, data lengths and ids must match in quantity");

        for (uint i = 0; i < datas.length; i++) {
            require(tokenAddrs[i] == tokenAddr, "checkERC721Side: Token addres must be same");
            require(ArrayUtils.arrayEq(datas[i], abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, tokenIdsAndPrice[i])));
        }
    }

}
