/*

  << Static Market contract >>

*/

import "./lib/ArrayUtils.sol";
import "./registry/AuthenticatedProxy.sol";
import "./StaticMarketBase.sol";

pragma solidity 0.7.5;

contract StaticMarketPlatform is StaticMarketBase {

    function ERC721ForETH(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721ForETH: call must be a direct call");

        (address[1] memory tokenGive, uint256[2] memory tokenIdAndPrice) = abi.decode(extra, (address[1], uint256[2]));

        require(tokenIdAndPrice[1] > 0,"ERC721ForETH: ERC721 price must be larger than zero");
        require(addresses[2] == tokenGive[0], "ERC721ForETH: call target must equal address of token to give");

        require(uints[0] == tokenIdAndPrice[1], "ERC721ForETH: Price must be same");

        checkERC721Side(data,addresses[1],addresses[4],tokenIdAndPrice[0]);

        checkETHSideWithOffset(addresses[1], uints[0], tokenIdAndPrice[1], counterdata);

        return 1;
    }

    function ETHForERC721(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC721: call must be a delegate call");

        (address[1] memory tokenGet, uint256[2] memory tokenIdAndPrice) = abi.decode(extra, (address[1], uint256[2]));

        require(tokenIdAndPrice[1] > 0,"ETHForERC721: ERC721 price must be larger than zero");
        require(addresses[5] == tokenGet[0], "ETHForERC721: call target must equal address of token to give");

        checkERC721Side(counterdata,addresses[4],addresses[1],tokenIdAndPrice[0]);

        checkETHSideWithOffset(addresses[4], uints[0], tokenIdAndPrice[1], data);

        return 1;
    }

    function ERC721ForETHWithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721ForETHWithOneFee: call must be a direct call");

        (address[2] memory tokenGiveAndFeeRecipient, uint256[3] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[2], uint256[3]));

        require(tokenIdAndPriceAndFee[1] > 0,"ERC721ForETHWithOneFee: ERC721 price must be larger than zero");
        require(addresses[2] == tokenGiveAndFeeRecipient[0], "ERC721ForETHWithOneFee: call target must equal address of token to give");

        require(uints[0] == (tokenIdAndPriceAndFee[1] + tokenIdAndPriceAndFee[2]), "ERC721ForETHWithOneFee: Price must be same");

        checkERC721Side(data, addresses[1], addresses[4], tokenIdAndPriceAndFee[0]);

        checkETHSideOneFeeWithOffset(addresses[1], tokenGiveAndFeeRecipient[1], uints[0], tokenIdAndPriceAndFee[1], tokenIdAndPriceAndFee[2], counterdata);

        return 1;
    }

    function ETHForERC721WithOneFee(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC721WithOneFee: call must be a delegate call");

        (address[2] memory tokenGetAndFeeRecipient, uint256[3] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[2], uint256[3]));

        require(tokenIdAndPriceAndFee[1] > 0,"ETHForERC721WithOneFee: ERC721 price must be larger than zero");
        require(addresses[5] == tokenGetAndFeeRecipient[0], "ETHForERC721WithOneFee: countercall target must equal address of token to get");

        checkERC721Side(counterdata, addresses[4], addresses[1], tokenIdAndPriceAndFee[0]);

        checkETHSideOneFeeWithOffset(addresses[4], tokenGetAndFeeRecipient[1], uints[0], tokenIdAndPriceAndFee[1], tokenIdAndPriceAndFee[2], data);

        return 1;
    }

    function ERC721ForETHWithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721ForETHWithTwoFees: call must be a direct call");

        (address[3] memory tokenGiveAndFeeRecipient, uint256[4] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[3], uint256[4]));

        require(tokenIdAndPriceAndFee[1] > 0,"ERC721ForETHWithTwoFees: ERC721 price must be larger than zero");
        require(addresses[2] == tokenGiveAndFeeRecipient[0], "ERC721ForETHWithTwoFees: call target must equal address of token to give");

        require(uints[0] == (tokenIdAndPriceAndFee[1] + tokenIdAndPriceAndFee[2] + tokenIdAndPriceAndFee[3]), "ERC721ForETHWithTwoFees: Price must be same");

        checkERC721Side(data, addresses[1], addresses[4], tokenIdAndPriceAndFee[0]);

        checkETHSideTwoFeesWithOffset(addresses[1], tokenGiveAndFeeRecipient[1], tokenGiveAndFeeRecipient[2], uints[0], tokenIdAndPriceAndFee[1], tokenIdAndPriceAndFee[2], tokenIdAndPriceAndFee[3], counterdata);

        return 1;
    }

    function ETHForERC721WithTwoFees(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC721WithTwoFees: call must be a delegate call");

        (address[3] memory tokenGetAndFeeRecipient, uint256[4] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[3], uint256[4]));

        require(tokenIdAndPriceAndFee[1] > 0,"ETHForERC721WithTwoFees: ERC721 price must be larger than zero");
        require(addresses[5] == tokenGetAndFeeRecipient[0], "ETHForERC721WithTwoFees: countercall target must equal address of token to get");

        checkERC721Side(counterdata, addresses[4], addresses[1], tokenIdAndPriceAndFee[0]);

        checkETHSideTwoFeesWithOffset(addresses[4], tokenGetAndFeeRecipient[1], tokenGetAndFeeRecipient[2], uints[0], tokenIdAndPriceAndFee[1], tokenIdAndPriceAndFee[2], tokenIdAndPriceAndFee[3], data);

        return 1;
    }

    function ERC1155ForETH(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC1155ForETH: call must be a direct call");

        (address[1] memory tokenGive, uint256[3] memory tokenIdAndNumeratorDenominator) = abi.decode(extra, (address[1], uint256[3]));

        require(tokenIdAndNumeratorDenominator[1] > 0, "ERC1155ForETH: numerator must be larger than zero");
        require(tokenIdAndNumeratorDenominator[2] > 0, "ERC1155ForETH: denominator must be larger than zero");

        require(addresses[2] == tokenGive[0], "ERC1155ForETH: call target must equal address of token to give");

        require(uints[0] == tokenIdAndNumeratorDenominator[2], "ERC1155ForETH: Price must be same");

        uint256 erc1155Amount = getERC1155AmountFromCalldata(data);
        uint256 new_fill = SafeMath.add(uints[5], erc1155Amount);
        require(new_fill <= uints[1],"ERC1155ForETH: new fill exceeds maximum fill");
        require(SafeMath.mul(tokenIdAndNumeratorDenominator[1], uints[0]) == SafeMath.mul(tokenIdAndNumeratorDenominator[2], erc1155Amount), "ERC1155ForETH: wrong ratio");

        checkERC1155Side(data, addresses[1], addresses[4], tokenIdAndNumeratorDenominator[0], erc1155Amount);

        checkETHSideWithOffset(addresses[1], uints[0], tokenIdAndNumeratorDenominator[2], counterdata);

        return 1;
    }

    function ETHForERC1155(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC1155: call must be a delegate call");

        (address[1] memory tokenGet, uint256[3] memory tokenIdAndNumeratorDenominator) = abi.decode(extra, (address[1], uint256[3]));

        require(tokenIdAndNumeratorDenominator[1] > 0,"ETHForERC1155: numerator must be larger than zero");
        require(tokenIdAndNumeratorDenominator[2] > 0,"ETHForERC1155: denominator must be larger than zero");

        require(addresses[5] == tokenGet[0], "ETHForERC1155: call target must equal address of token to give");

        uint256 erc1155Amount = getERC1155AmountFromCalldata(counterdata);
        uint256 new_fill = SafeMath.add(uints[5], uints[0]);
        require(new_fill <= uints[1],"ETHForERC1155: new fill exceeds maximum fill");
        require(SafeMath.mul(tokenIdAndNumeratorDenominator[1], erc1155Amount) == SafeMath.mul(tokenIdAndNumeratorDenominator[2], uints[0]), "ETHForERC1155: wrong ratio");

        checkERC1155Side(counterdata, addresses[4], addresses[1], tokenIdAndNumeratorDenominator[0], erc1155Amount);

        checkETHSideWithOffset(addresses[4], uints[0], tokenIdAndNumeratorDenominator[1], data);

        return 1;
    }

    function ERC1155ForETHWithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC1155ForETHWithOneFee: call must be a direct call");

        (address[2] memory tokenGiveAndFeeRecipient, uint256[4] memory tokenIdAndNumeratorDenominatorAndFee) = abi.decode(extra, (address[2], uint256[4]));

        require(tokenIdAndNumeratorDenominatorAndFee[1] > 0, "ERC1155ForETHWithOneFee: numerator must be larger than zero");
        require(tokenIdAndNumeratorDenominatorAndFee[2] > 0, "ERC1155ForETHWithOneFee: denominator must be larger than zero");

        // addresses[2] and addresses[5] are the address of WyvernAtomicizer. How to check it?
        // require(addresses[2] == tokenGiveAndFeeRecipient[0], "ERC1155ForETHWithOneFee: call target must equal address of token to give");

        require(uints[0] == (tokenIdAndNumeratorDenominatorAndFee[2] + tokenIdAndNumeratorDenominatorAndFee[3]), "ERC1155ForETHWithOneFee: Price must be same");

        uint256 erc1155Amount = getERC1155AmountFromCalldata(data);
        uint256 new_fill = SafeMath.add(uints[5], erc1155Amount);
        require(new_fill <= uints[1],"ERC1155ForETHWithOneFee: new fill exceeds maximum fill");
        require(SafeMath.mul(tokenIdAndNumeratorDenominatorAndFee[1], uints[0]) == SafeMath.mul(tokenIdAndNumeratorDenominatorAndFee[2] + tokenIdAndNumeratorDenominatorAndFee[3], erc1155Amount), "ERC1155ForETHWithOneFee: wrong ratio");

        checkERC1155Side(data, addresses[1], addresses[4], tokenIdAndNumeratorDenominatorAndFee[0], erc1155Amount);

        checkETHSideOneFeeWithOffset(addresses[1], tokenGiveAndFeeRecipient[1], uints[0], tokenIdAndNumeratorDenominatorAndFee[2], tokenIdAndNumeratorDenominatorAndFee[3], counterdata);

        return 1;
    }

    function ETHForERC1155WithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC1155WithOneFee: call must be a delegate call");

        (address[2] memory tokenGetAndFeeRecipient, uint256[4] memory tokenIdAndNumeratorDenominatorAndFee) = abi.decode(extra, (address[2], uint256[4]));

        require(tokenIdAndNumeratorDenominatorAndFee[1] > 0, "ETHForERC1155WithOneFee: numerator must be larger than zero");
        require(tokenIdAndNumeratorDenominatorAndFee[2] > 0, "ETHForERC1155WithOneFee: denominator must be larger than zero");

        // addresses[2] is the address of WyvernAtomicizer. How to check it?
        // require(addresses[5] == tokenGetAndFeeRecipient[0], "ETHForERC1155WithOneFee: call target must equal address of token to give");

        uint256 erc1155Amount = getERC1155AmountFromCalldata(counterdata);
        uint256 new_fill = SafeMath.add(uints[5], uints[0]);
        require(new_fill <= uints[1],"ETHForERC1155WithOneFee: new fill exceeds maximum fill");
        require(SafeMath.mul(tokenIdAndNumeratorDenominatorAndFee[1] + tokenIdAndNumeratorDenominatorAndFee[3], erc1155Amount) == SafeMath.mul(tokenIdAndNumeratorDenominatorAndFee[2], uints[0]), "ETHForERC1155WithOneFee: wrong ratio");

        checkERC1155Side(counterdata, addresses[4], addresses[1], tokenIdAndNumeratorDenominatorAndFee[0], erc1155Amount);

        checkETHSideOneFeeWithOffset(addresses[4], tokenGetAndFeeRecipient[1], uints[0], tokenIdAndNumeratorDenominatorAndFee[1], tokenIdAndNumeratorDenominatorAndFee[3], data);

        return 1;
    }

    function ERC1155ForETHWithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC1155ForETHWithTwoFees: call must be a direct call");

        (address[3] memory tokenGiveAndFeeRecipient, uint256[5] memory tokenIdAndNumeratorDenominatorAndFee) = abi.decode(extra, (address[3], uint256[5]));

        require(tokenIdAndNumeratorDenominatorAndFee[1] > 0, "ERC1155ForETHWithTwoFees: numerator must be larger than zero");
        require(tokenIdAndNumeratorDenominatorAndFee[2] > 0, "ERC1155ForETHWithTwoFees: denominator must be larger than zero");

        // addresses[2] and addresses[5] are the address of WyvernAtomicizer. How to check it?
        // require(addresses[2] == tokenGiveAndFeeRecipient[0], "ERC1155ForETHWithOneFee: call target must equal address of token to give");

        uint256 totalAmount = tokenIdAndNumeratorDenominatorAndFee[2] + tokenIdAndNumeratorDenominatorAndFee[3] + tokenIdAndNumeratorDenominatorAndFee[4];
        require(uints[0] == totalAmount, "ERC1155ForETHWithTwoFees: Price must be same");

        uint256 erc1155Amount = getERC1155AmountFromCalldata(data);
        uint256 new_fill = SafeMath.add(uints[5], erc1155Amount);
        require(new_fill <= uints[1],"ERC1155ForETHWithTwoFees: new fill exceeds maximum fill");
        require(SafeMath.mul(tokenIdAndNumeratorDenominatorAndFee[1], uints[0]) == SafeMath.mul(totalAmount, erc1155Amount), "ERC1155ForETHWithTwoFees: wrong ratio");

        checkERC1155Side(data, addresses[1], addresses[4], tokenIdAndNumeratorDenominatorAndFee[0], erc1155Amount);

        checkETHSideTwoFeesWithOffset(addresses[1], tokenGiveAndFeeRecipient[1], tokenGiveAndFeeRecipient[2], uints[0], tokenIdAndNumeratorDenominatorAndFee[2], tokenIdAndNumeratorDenominatorAndFee[3], tokenIdAndNumeratorDenominatorAndFee[4], counterdata);

        return 1;
    }

    function ETHForERC1155WithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC1155WithTwoFees: call must be a delegate call");

        (address[3] memory tokenGetAndFeeRecipient, uint256[5] memory tokenIdAndNumeratorDenominatorAndFee) = abi.decode(extra, (address[3], uint256[5]));

        require(tokenIdAndNumeratorDenominatorAndFee[1] > 0, "ETHForERC1155WithTwoFees: numerator must be larger than zero");
        require(tokenIdAndNumeratorDenominatorAndFee[2] > 0, "ETHForERC1155WithTwoFees: denominator must be larger than zero");

        // addresses[2] is the address of WyvernAtomicizer. How to check it?
        // require(addresses[5] == tokenGetAndFeeRecipient[0], "ETHForERC1155WithTwoFees: call target must equal address of token to give");

        uint256 erc1155Amount = getERC1155AmountFromCalldata(counterdata);
        uint256 new_fill = SafeMath.add(uints[5], uints[0]);
        require(new_fill <= uints[1],"ETHForERC1155WithTwoFees: new fill exceeds maximum fill");
        uint totalAmount = tokenIdAndNumeratorDenominatorAndFee[1] + tokenIdAndNumeratorDenominatorAndFee[3] + tokenIdAndNumeratorDenominatorAndFee[4];
        require(SafeMath.mul(totalAmount, erc1155Amount) == SafeMath.mul(tokenIdAndNumeratorDenominatorAndFee[2], uints[0]), "ETHForERC1155WithTwoFees: wrong ratio");

        checkERC1155Side(counterdata, addresses[4], addresses[1], tokenIdAndNumeratorDenominatorAndFee[0], erc1155Amount);

        checkETHSideTwoFeesWithOffset(addresses[4], tokenGetAndFeeRecipient[1], tokenGetAndFeeRecipient[2], uints[0], tokenIdAndNumeratorDenominatorAndFee[1], tokenIdAndNumeratorDenominatorAndFee[3], tokenIdAndNumeratorDenominatorAndFee[4], data);

        return 1;
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
