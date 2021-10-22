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
        require(uints[0] != 0,"ERC721ForETH: Non zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721ForETH: call must be a direct call");

        (address[1] memory tokenGive, uint256[2] memory tokenIdAndPrice) = abi.decode(extra, (address[1], uint256[2]));

        require(tokenIdAndPrice[1] > 0,"ERC721ForETH: ERC721 price must be larger than zero");
        require(addresses[2] == tokenGive[0], "ERC721ForETH: call target must equal address of token to give");

        require(uints[0] == tokenIdAndPrice[1], "ERC721ForETH: Price must be same");

        checkERC721Side(data,addresses[1],addresses[4],tokenIdAndPrice[0]);
        return 1;
    }

    function ETHForERC721(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        // TODO: the first element in uints was set to 0 in ExchangeCore, how to check it?
        // require(uints[0] == 0,"ETHForERC721: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC721: call must be a delegate call");

        (address[1] memory tokenGet, uint256[2] memory tokenIdAndPrice) = abi.decode(extra, (address[1], uint256[2]));

        require(tokenIdAndPrice[1] > 0,"ETHForERC721: ERC721 price must be larger than zero");
        require(addresses[5] == tokenGet[0], "ETHForERC721: call target must equal address of token to give");

        checkERC721Side(counterdata,addresses[4],addresses[1],tokenIdAndPrice[0]);

        return 1;
    }

    function ERC721ForETHWithOneFee(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(uints[0] != 0,"ERC721ForETHWithOneFee: Non zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721ForETHWithOneFee: call must be a direct call");

        (address[2] memory tokenGiveAndFeeRecipient, uint256[3] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[2], uint256[3]));

        require(tokenIdAndPriceAndFee[1] > 0,"ERC721ForETHWithOneFee: ERC721 price must be larger than zero");
        require(addresses[2] == tokenGiveAndFeeRecipient[0], "ERC721ForETHWithOneFee: call target must equal address of token to give");

        require(uints[0] == (tokenIdAndPriceAndFee[1] + tokenIdAndPriceAndFee[2]), "ERC721ForETHWithOneFee: Price must be same");

        checkERC721Side(data, addresses[1], addresses[4], tokenIdAndPriceAndFee[0]);
        return 1;
    }

    function ETHForERC721WithOneFee(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        // require(uints[0] == 0,"ETHForERC721WithOneFee: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC721WithOneFee: call must be a delegate call");

        (address[2] memory tokenGetAndFeeRecipient, uint256[3] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[2], uint256[3]));

        require(tokenIdAndPriceAndFee[1] > 0,"ETHForERC721WithOneFee: ERC721 price must be larger than zero");
        require(addresses[5] == tokenGetAndFeeRecipient[0], "ETHForERC721WithOneFee: countercall target must equal address of token to get");

        checkERC721Side(counterdata, addresses[4], addresses[1], tokenIdAndPriceAndFee[0]);

        return 1;
    }

    function ERC721ForETHWithTwoFees(bytes memory extra, address[7] memory addresses,
        AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata) public pure returns (uint)
    {
        require(uints[0] != 0,"ERC721ForETHWithTwoFees: Non zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721ForETHWithTwoFees: call must be a direct call");

        (address[3] memory tokenGiveAndFeeRecipient, uint256[4] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[3], uint256[4]));

        require(tokenIdAndPriceAndFee[1] > 0,"ERC721ForETHWithTwoFees: ERC721 price must be larger than zero");
        require(addresses[2] == tokenGiveAndFeeRecipient[0], "ERC721ForETHWithTwoFees: call target must equal address of token to give");

        require(uints[0] == (tokenIdAndPriceAndFee[1] + tokenIdAndPriceAndFee[2] + tokenIdAndPriceAndFee[3]), "ERC721ForETHWithTwoFees: Price must be same");

        checkERC721Side(data, addresses[1], addresses[4], tokenIdAndPriceAndFee[0]);
        return 1;
    }

    function ETHForERC721WithTwoFees(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        // require(uints[0] == 0,"ETHForERC721WithTwoFees: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "ETHForERC721WithTwoFees: call must be a delegate call");

        (address[3] memory tokenGetAndFeeRecipient, uint256[4] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[3], uint256[4]));

        require(tokenIdAndPriceAndFee[1] > 0,"ETHForERC721WithTwoFees: ERC721 price must be larger than zero");
        require(addresses[5] == tokenGetAndFeeRecipient[0], "ETHForERC721WithTwoFees: countercall target must equal address of token to get");

        checkERC721Side(counterdata, addresses[4], addresses[1], tokenIdAndPriceAndFee[0]);

        return 1;
    }
}
