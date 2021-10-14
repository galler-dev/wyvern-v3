/*

  << Static Market contract >>

*/

pragma solidity 0.7.5;

import "./lib/ArrayUtils.sol";
import "./registry/AuthenticatedProxy.sol";

/**
 * @title StaticMarket
 * @author Wyvern Protocol Developers
 */
contract StaticMarket {

	string public constant name = "Static Market";

	constructor ()
		public
	{}

	function anyERC1155ForERC20(bytes memory extra,
		address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
		bytes memory data, bytes memory counterdata)
		public
		pure
		returns (uint)
	{
		require(uints[0] == 0,"anyERC1155ForERC20: Zero value required");
		require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "anyERC1155ForERC20: call must be a direct call");

		(address[2] memory tokenGiveGet, uint256[3] memory tokenIdAndNumeratorDenominator) = abi.decode(extra, (address[2], uint256[3]));

		require(tokenIdAndNumeratorDenominator[1] > 0,"anyERC20ForERC1155: numerator must be larger than zero");
		require(tokenIdAndNumeratorDenominator[2] > 0,"anyERC20ForERC1155: denominator must be larger than zero");
		require(addresses[2] == tokenGiveGet[0], "anyERC1155ForERC20: call target must equal address of token to give");
		require(addresses[5] == tokenGiveGet[1], "anyERC1155ForERC20: countercall target must equal address of token to get");

		uint256[2] memory call_amounts = [
			getERC1155AmountFromCalldata(data),
			getERC20AmountFromCalldata(counterdata)
		];
		uint256 new_fill = SafeMath.add(uints[5],call_amounts[0]);
		require(new_fill <= uints[1],"anyERC1155ForERC20: new fill exceeds maximum fill");
		require(SafeMath.mul(tokenIdAndNumeratorDenominator[1], call_amounts[1]) == SafeMath.mul(tokenIdAndNumeratorDenominator[2], call_amounts[0]),"anyERC1155ForERC20: wrong ratio");
		checkERC1155Side(data,addresses[1],addresses[4],tokenIdAndNumeratorDenominator[0],call_amounts[0]);
		checkERC20Side(counterdata,addresses[4],addresses[1],call_amounts[1]);

		return new_fill;
	}

	function anyERC20ForERC1155(bytes memory extra,
		address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
		bytes memory data, bytes memory counterdata)
		public
		pure
		returns (uint)
	{
		require(uints[0] == 0,"anyERC20ForERC1155: Zero value required");
		require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "anyERC20ForERC1155: call must be a direct call");

		(address[2] memory tokenGiveGet, uint256[3] memory tokenIdAndNumeratorDenominator) = abi.decode(extra, (address[2], uint256[3]));

		require(tokenIdAndNumeratorDenominator[1] > 0,"anyERC20ForERC1155: numerator must be larger than zero");
		require(tokenIdAndNumeratorDenominator[2] > 0,"anyERC20ForERC1155: denominator must be larger than zero");
		require(addresses[2] == tokenGiveGet[0], "anyERC20ForERC1155: call target must equal address of token to get");
		require(addresses[5] == tokenGiveGet[1], "anyERC20ForERC1155: countercall target must equal address of token to give");

		uint256[2] memory call_amounts = [
			getERC1155AmountFromCalldata(counterdata),
			getERC20AmountFromCalldata(data)
		];
		uint256 new_fill = SafeMath.add(uints[5],call_amounts[1]);
		require(new_fill <= uints[1],"anyERC20ForERC1155: new fill exceeds maximum fill");
		require(SafeMath.mul(tokenIdAndNumeratorDenominator[1], call_amounts[0]) == SafeMath.mul(tokenIdAndNumeratorDenominator[2], call_amounts[1]),"anyERC20ForERC1155: wrong ratio");
		checkERC1155Side(counterdata,addresses[4],addresses[1],tokenIdAndNumeratorDenominator[0],call_amounts[0]);
		checkERC20Side(data,addresses[1],addresses[4],call_amounts[1]);

		return new_fill;
	}

    function anyERC1155ForERC20WithFee(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(uints[0] == 0,"anyERC1155ForERC20WithFee: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "anyERC1155ForERC20WithFee: call must be a direct call");

        (address[] memory tokenGiveGetRelayerRoyalty, uint256[] memory tokenIdAndNumeratorDenominatorRelayerRoyaltyFee) = abi.decode(extra, (address[], uint256[]));

        uint256 len = tokenGiveGetRelayerRoyalty.length;
        // require(len >= 2, "anyERC1155ForERC20WithFee: token addresses must be set");
        // require(tokenIdAndNumeratorDenominatorRelayerRoyaltyFee.length >= len + 1, "anyERC1155ForERC20WithFee: token amounts must be larger than token address length");

        require(tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[1] > 0,"anyERC1155ForERC20WithFee: numerator must be larger than zero");
        require(tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[2] > 0,"anyERC1155ForERC20WithFee: denominator must be larger than zero");
        require(addresses[2] == tokenGiveGetRelayerRoyalty[0], "anyERC1155ForERC20WithFee: call target must equal address of token to give");
        // addresses[5] is the address of WyvernAtomicizer. How to check it?
        // require(addresses[5] == tokenGiveGetRelayerRoyalty[1], "anyERC1155ForERC20WithFee: countercall target must equal address of token to get");

        // uint256 amount = getErc20AmountFromCalldataWithFee(counterdata, 0);
        // require(amount == 990, "amount is wrong");
        // amount = getErc20AmountFromCalldataForFee(counterdata, 1);
        // require(amount == 2, "");
        // amount = getErc20AmountFromCalldataForFee(counterdata, 2);
        // require(amount == 8, "");

        uint256[2] memory call_amounts = [
            getERC1155AmountFromCalldata(data),
            getErc20AmountFromCalldataWithFee(counterdata, 0)
            // getRelayerAmountFromCalldataWithFee(counterdata, addresses[7], addresses[8]),
            // getRoyaltyAmountFromCalldataWithFee(counterdata, addresses[7], addresses[8])
        ];
        uint256 new_fill = 0;
        {
            new_fill = SafeMath.add(uints[5],call_amounts[0]);
            require(new_fill <= uints[1],"anyERC1155ForERC20WithFee: new fill exceeds maximum fill");
            require(SafeMath.mul(tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[1], call_amounts[1]) == SafeMath.mul(tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[2], call_amounts[0]),"anyERC1155ForERC20WithFee: wrong ratio");
        }

        checkERC1155Side(data,addresses[1],addresses[4],tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[0],call_amounts[0]);
        if (len <= 2) {
            checkERC20Side(counterdata,addresses[4],addresses[1],call_amounts[1]);
        } else {
            checkERC20SideWithFee(counterdata, addresses[4], addresses[1], tokenGiveGetRelayerRoyalty, tokenIdAndNumeratorDenominatorRelayerRoyaltyFee, tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[2]);
        }

        return new_fill;
    }

    function anyERC20ForERC1155WithFee(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(uints[0] == 0,"anyERC20ForERC1155: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "anyERC20ForERC1155WithFee: call must be a delegate call");

        (address[] memory tokenGiveGetRelayerRoyalty, uint256[] memory tokenIdAndNumeratorDenominatorRelayerRoyaltyFee) = abi.decode(extra, (address[], uint256[]));

        uint256 len = tokenGiveGetRelayerRoyalty.length;
        require(len >= 2, "anyERC20ForERC1155WithFee: token addresses must be set");
        require(tokenIdAndNumeratorDenominatorRelayerRoyaltyFee.length >= len + 1, "anyERC20ForERC1155WithFee: token amounts must be larger than token address length");

        require(tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[1] > 0,"anyERC20ForERC1155WithFee: numerator must be larger than zero");
        require(tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[2] > 0,"anyERC20ForERC1155WithFee: denominator must be larger than zero");
        // addresses[2] is the address of WyvernAtomicizer. How to check it?
        // require(addresses[2] == tokenGiveGetRelayerRoyalty[0], "anyERC20ForERC1155WithFee: call target must equal address of token to get");
        require(addresses[5] == tokenGiveGetRelayerRoyalty[1], "anyERC20ForERC1155WithFee: countercall target must equal address of token to give");

        uint256[2] memory call_amounts = [
            getERC1155AmountFromCalldata(counterdata),
            getErc20AmountFromCalldataWithFee(data, 0)
            // getRelayerAmountFromCalldataWithFee(data, addresses[7], addresses[8]),
            // getRoyaltyAmountFromCalldataWithFee(data, addresses[7], addresses[8])
        ];
        uint256 new_fill = 0;
        {
            // uint256 amount = call_amounts[1] + call_amounts[2] + call_amounts[3];
            new_fill = SafeMath.add(uints[5],call_amounts[1]);
            require(new_fill <= uints[1],"anyERC20ForERC1155WithFee: new fill exceeds maximum fill");
            require(SafeMath.mul(tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[1], call_amounts[0]) == SafeMath.mul(tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[2], call_amounts[1]),"anyERC20ForERC1155WithFee: wrong ratio");
        }
        checkERC1155Side(counterdata,addresses[4],addresses[1],tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[0],call_amounts[0]);

        if (len <= 2) {
            // checkERC20Side(data,addresses[1],addresses[4],call_amounts[1]);
        } else {
            // checkERC20SideWithFee(data, addresses[1], addresses[4], tokenGiveGetRelayerRoyalty, tokenIdAndNumeratorDenominatorRelayerRoyaltyFee, tokenIdAndNumeratorDenominatorRelayerRoyaltyFee[1]);
        }

        return new_fill;
    }

	function anyERC20ForERC20(bytes memory extra,
		address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
		bytes memory data, bytes memory counterdata)
		public
		pure
		returns (uint)
	{
		require(uints[0] == 0,"anyERC20ForERC20: Zero value required");
		require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "anyERC20ForERC20: call must be a direct call");

		(address[2] memory tokenGiveGet, uint256[2] memory numeratorDenominator) = abi.decode(extra, (address[2], uint256[2]));

		require(numeratorDenominator[0] > 0,"anyERC20ForERC20: numerator must be larger than zero");
		require(numeratorDenominator[1] > 0,"anyERC20ForERC20: denominator must be larger than zero");
		require(addresses[2] == tokenGiveGet[0], "anyERC20ForERC20: call target must equal address of token to give");
		require(addresses[5] == tokenGiveGet[1], "anyERC20ForERC20: countercall target must equal address of token to get");

		uint256[2] memory call_amounts = [
			getERC20AmountFromCalldata(data),
			getERC20AmountFromCalldata(counterdata)
		];
		uint256 new_fill = SafeMath.add(uints[5],call_amounts[0]);
		require(new_fill <= uints[1],"anyERC20ForERC20: new fill exceeds maximum fill");
		require(SafeMath.mul(numeratorDenominator[0],call_amounts[0]) == SafeMath.mul(numeratorDenominator[1],call_amounts[1]),"anyERC20ForERC20: wrong ratio");
		checkERC20Side(data,addresses[1],addresses[4],call_amounts[0]);
		checkERC20Side(counterdata,addresses[4],addresses[1],call_amounts[1]);

		return new_fill;
	}

	function ERC721ForERC20(bytes memory extra,
		address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
		bytes memory data, bytes memory counterdata)
		public
		pure
		returns (uint)
	{
		require(uints[0] == 0,"ERC721ForERC20: Zero value required");
		require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721ForERC20: call must be a direct call");

		(address[2] memory tokenGiveGet, uint256[2] memory tokenIdAndPrice) = abi.decode(extra, (address[2], uint256[2]));

		require(tokenIdAndPrice[1] > 0,"ERC721ForERC20: ERC721 price must be larger than zero");
		require(addresses[2] == tokenGiveGet[0], "ERC721ForERC20: call target must equal address of token to give");
		require(addresses[5] == tokenGiveGet[1], "ERC721ForERC20: countercall target must equal address of token to get");

		checkERC721Side(data,addresses[1],addresses[4],tokenIdAndPrice[0]);
		checkERC20Side(counterdata,addresses[4],addresses[1],tokenIdAndPrice[1]);

		return 1;
	}

	function ERC20ForERC721(bytes memory extra,
		address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
		bytes memory data, bytes memory counterdata)
		public
		pure
		returns (uint)
	{
		require(uints[0] == 0,"ERC20ForERC721: Zero value required");
		require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC20ForERC721: call must be a direct call");

		(address[2] memory tokenGiveGet, uint256[2] memory tokenIdAndPrice) = abi.decode(extra, (address[2], uint256[2]));

		require(tokenIdAndPrice[1] > 0,"ERC20ForERC721: ERC721 price must be larger than zero");
		require(addresses[2] == tokenGiveGet[0], "ERC20ForERC721: call target must equal address of token to give");
		require(addresses[5] == tokenGiveGet[1], "ERC20ForERC721: countercall target must equal address of token to get");

		checkERC721Side(counterdata,addresses[4],addresses[1],tokenIdAndPrice[0]);
		checkERC20Side(data,addresses[1],addresses[4],tokenIdAndPrice[1]);

		return 1;
	}

    function ERC721ForERC20WithOneFee(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(uints[0] == 0,"ERC721ForERC20WithOneFee: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721ForERC20WithOneFee: call must be a direct call");

        (address[3] memory tokenGiveGetAndFeeRecipient, uint256[3] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[3], uint256[3]));

        require(tokenIdAndPriceAndFee[1] > 0,"ERC721ForERC20WithOneFee: ERC721 price must be larger than zero");
        require(addresses[2] == tokenGiveGetAndFeeRecipient[0], "ERC721ForERC20WithOneFee: call target must equal address of token to give");
        // require(addresses[5] == tokenGiveGetAndFeeRecipient[1], "ERC721ForERC20WithOneFee: countercall target must equal address of token to get");

        checkERC721Side(data,addresses[1],addresses[4],tokenIdAndPriceAndFee[0]);
        checkERC20SideWithOneFee(counterdata,addresses[4],addresses[1],tokenGiveGetAndFeeRecipient[2],tokenIdAndPriceAndFee[1],tokenIdAndPriceAndFee[2]);

        return 1;
    }

    function ERC721ForERC20WithTwoFees(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(uints[0] == 0,"ERC721ForERC20WithTwoFees: Zero value required");
        require(howToCalls[0] == AuthenticatedProxy.HowToCall.Call, "ERC721ForERC20WithTwoFees: call must be a direct call");

        (address[4] memory tokenGiveGetAndFeeRecipient, uint256[4] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[4], uint256[4]));

        require(tokenIdAndPriceAndFee[1] > 0,"ERC721ForERC20WithTwoFees: ERC721 price must be larger than zero");
        require(addresses[2] == tokenGiveGetAndFeeRecipient[0], "ERC721ForERC20WithTwoFees: call target must equal address of token to give");
        // require(addresses[5] == tokenGiveGetAndFeeRecipient[1], "ERC721ForERC20WithTwoFees: countercall target must equal address of token to get");

        checkERC721Side(data,addresses[1],addresses[4],tokenIdAndPriceAndFee[0]);
        checkERC20SideWithTwoFees(counterdata,addresses[4],addresses[1],tokenGiveGetAndFeeRecipient[2],tokenGiveGetAndFeeRecipient[3],tokenIdAndPriceAndFee[1],tokenIdAndPriceAndFee[2],tokenIdAndPriceAndFee[3]);

        return 1;
    }

    function ERC20ForERC721WithOneFee(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(uints[0] == 0,"ERC20ForERC721WithOneFee: Zero value required");
        require(howToCalls[1] == AuthenticatedProxy.HowToCall.Call, "ERC20ForERC721WithFee: call must be a delegate call");

        (address[3] memory tokenGiveGetAndFeeRecipient, uint256[3] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[3], uint256[3]));

        require(tokenIdAndPriceAndFee[1] > 0,"ERC20ForERC721WithOneFee: ERC721 price must be larger than zero");
        // require(addresses[2] == tokenGiveGetAndFeeRecipient[0], "ERC20ForERC721WithOneFee: call target must equal address of token to give");
        require(addresses[5] == tokenGiveGetAndFeeRecipient[1], "ERC20ForERC721WithOneFee: countercall target must equal address of token to get");

        checkERC721Side(counterdata,addresses[4],addresses[1],tokenIdAndPriceAndFee[0]);
        checkERC20SideWithOneFee(data,addresses[1],addresses[4],tokenGiveGetAndFeeRecipient[2],tokenIdAndPriceAndFee[1],tokenIdAndPriceAndFee[2]);

        return 1;
    }

    function ERC20ForERC721WithTwoFees(bytes memory extra,
        address[7] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[6] memory uints,
        bytes memory data, bytes memory counterdata)
        public
        pure
        returns (uint)
    {
        require(uints[0] == 0,"ERC20ForERC721WithOneFee: Zero value required");
        require(howToCalls[1] == AuthenticatedProxy.HowToCall.Call, "ERC20ForERC721WithFee: call must be a delegate call");

        (address[4] memory tokenGiveGetAndFeeRecipient, uint256[4] memory tokenIdAndPriceAndFee) = abi.decode(extra, (address[4], uint256[4]));

        require(tokenIdAndPriceAndFee[1] > 0,"ERC20ForERC721WithOneFee: ERC721 price must be larger than zero");
        // require(addresses[2] == tokenGiveGetAndFeeRecipient[0], "ERC20ForERC721WithOneFee: call target must equal address of token to give");
        require(addresses[5] == tokenGiveGetAndFeeRecipient[1], "ERC20ForERC721WithOneFee: countercall target must equal address of token to get");

        checkERC721Side(counterdata,addresses[4],addresses[1],tokenIdAndPriceAndFee[0]);
        checkERC20SideWithTwoFees(data,addresses[1],addresses[4],tokenGiveGetAndFeeRecipient[2],tokenGiveGetAndFeeRecipient[3],tokenIdAndPriceAndFee[1],tokenIdAndPriceAndFee[2],tokenIdAndPriceAndFee[3]);

        return 1;
    }

	function getERC1155AmountFromCalldata(bytes memory data)
		internal
		pure
		returns (uint256)
	{
		(uint256 amount) = abi.decode(ArrayUtils.arraySlice(data,100,32),(uint256));
		return amount;
	}

	function getERC20AmountFromCalldata(bytes memory data)
		internal
		pure
		returns (uint256)
	{
		(uint256 amount) = abi.decode(ArrayUtils.arraySlice(data,68,32),(uint256));
		return amount;
	}

	function getERC20AmountFromCalldataWithFee1(bytes memory data, address relayerFeeRecipient, address royaltyFeeRecipient)
		internal
		pure
		returns (uint256 amount)
	{
        if (relayerFeeRecipient == address(0)) {
            if (royaltyFeeRecipient == address(0)) {
                amount = abi.decode(ArrayUtils.arraySlice(data,424,32),(uint256));
            } else {
                amount = abi.decode(ArrayUtils.arraySlice(data,520,32),(uint256));
            }
        } else {
            if (royaltyFeeRecipient == address(0)) {
                amount = abi.decode(ArrayUtils.arraySlice(data,520,32),(uint256));
            } else {
                amount = abi.decode(ArrayUtils.arraySlice(data,616,32),(uint256));
            }
        }
		// (uint256 amount) = abi.decode(ArrayUtils.arraySlice(data,616,32),(uint256));
		// return amount;
	}

	function getRelayerAmountFromCalldataWithFee(bytes memory data, address relayerFeeRecipient, address royaltyFeeRecipient)
		internal
		pure
		returns (uint256 amount)
	{
        if (relayerFeeRecipient == address(0)) {
            amount = 0;
        } else {
            if (royaltyFeeRecipient == address(0)) {
                amount = abi.decode(ArrayUtils.arraySlice(data,620,32),(uint256));
            } else {
                amount = abi.decode(ArrayUtils.arraySlice(data,716,32),(uint256));
            }
        }
		// (uint256 amount) = abi.decode(ArrayUtils.arraySlice(data,716,32),(uint256));
		// return amount;
	}

	function getRoyaltyAmountFromCalldataWithFee(bytes memory data, address relayerFeeRecipient, address royaltyFeeRecipient)
		internal
		pure
		returns (uint256 amount)
	{
        if (royaltyFeeRecipient == address(0)) {
            amount = 0;
        } else {
            if (relayerFeeRecipient == address(0)) {
                amount = abi.decode(ArrayUtils.arraySlice(data,620,32),(uint256));
            } else {
                amount = abi.decode(ArrayUtils.arraySlice(data,816,32),(uint256));
            }
        }
	}

    function getErc20AmountFromCalldataWithFee(bytes memory data, uint256 index) internal pure returns (uint256) {
        (address[] memory addrs, uint256[] memory values, uint256[] memory calldataLengths, bytes memory calldatas) = abi.decode(ArrayUtils.arrayDrop(data, 4), (address[], uint256[], uint256[], bytes));

        require(index >= 0 && index < addrs.length, "getErc20AmountFromCalldataWithFee: Invalid index");
        require(addrs.length == values.length && addrs.length == calldataLengths.length, "getErc20AmountFromCalldataWithFee: Addresses, calldata lengths, and values must match in quantity");

        uint256 startPos = 0;
        for (uint256 i = 0; i < index; i++) {
            startPos = startPos + calldataLengths[i];
        }

        bytes memory cd = new bytes(calldataLengths[index]);
        for (uint j = 0; j < calldataLengths[index]; j++) {
            cd[j] = calldatas[startPos + j];
        }

        (address from, address to, uint256 amount) = abi.decode(ArrayUtils.arrayDrop(cd, 4), (address, address, uint256));
        return amount;
    }

    function getERC20TransferBytes(bytes memory data) internal pure returns(bytes[] memory allBytes) {
        (address[] memory addrs, uint256[] memory values, uint256[] memory calldataLengths, bytes memory calldatas) = abi.decode(ArrayUtils.arrayDrop(data, 4), (address[], uint256[], uint256[], bytes));

        require(addrs.length == values.length && addrs.length == calldataLengths.length, "getERC20TransferBytes: Addresses, calldata lengths, and values must match in quantity");

        uint j = 0;
        allBytes = new bytes[](addrs.length);
        for (uint i = 0; i < addrs.length; i++) {
            bytes memory cd = new bytes(calldataLengths[i]);
            for (uint k = 0; k < calldataLengths[i]; k++) {
                cd[k] = calldatas[j];
                j++;
            }
            allBytes[i] = cd;
        }
    }

	function checkERC1155Side(bytes memory data, address from, address to, uint256 tokenId, uint256 amount)
		internal
		pure
	{
		require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)", from, to, tokenId, amount, "")));
	}

	function checkERC721Side(bytes memory data, address from, address to, uint256 tokenId)
		internal
		pure
	{
		require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, tokenId)));
	}

	function checkERC20Side(bytes memory data, address from, address to, uint256 amount)
		internal
		pure
	{
		require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
	}

    function checkERC20SideWithFee(bytes memory data, address from, address to, address[] memory tokenRelayerRoyalty, uint[] memory uints, uint256 amount) internal pure {
        bytes[] memory allBytes = getERC20TransferBytes(data);

        // address from;
        // address to;
        // uint amount;
        // if (isCounterData) {
        //     // from = addresses[4];
        //     // to = addresses[1];
        //     amount = uints[2];
        // } else {
        //     // from = addresses[1];
        //     // to = addresses[4];
        //     amount = uints[1];
        // }
        require(ArrayUtils.arrayEq(allBytes[0], abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
        if (allBytes.length > 1) {
            for (uint i = 1; i < allBytes.length; i++) {
                require(ArrayUtils.arrayEq(allBytes[i], abi.encodeWithSignature("transferFrom(address,address,uint256)", from, tokenRelayerRoyalty[i + 1], uints[i + 2])));
            }
        }
    }

	function checkERC20SideWithFee1(bytes memory data, address from, address to, address relayerFeeRecipient, address royaltyFeeRecipient, uint256 amount, uint256 relayerFee, uint256 royaltyFee)
		internal
		pure
	{
        // amount StartPos:
        //    noRelayerFee and noRoyaltyFee: 356
        //    noRelayerFee but hasRoyaltyFee: 452
        //    hasRelayerFee and hasRoyaltyFee: 552
        // relayerFee startPos:
        //    noRoyaltyFee: 552
        //    hasRoyaltyFee: 648
        // royaltyFee startPos:
        //    noRelayerFee: 552
        //    hasRelayerFee: 748
        // uint256 amountStartPos;
        // uint256 relayerFeeStartPos;
        // uint256 royaltyFeeStartPos;
        // No relayer fee.
        if (relayerFeeRecipient == address(0)) {
            if (royaltyFeeRecipient == address(0)) {
                // amountStartPos = 356;
                // No fee for relayer and royalty.
                require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 356, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
            } else {
                // amountStartPos = 452;
                // royaltyFeeStartPos = 552;
                // No relayerFee
                require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 452, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
                require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 552, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, royaltyFeeRecipient, royaltyFee)));
            }
        } else { // Has relayer fee.
            // No royalty fee
            if (royaltyFeeRecipient == address(0)) {
                require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 452, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
                require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 552, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, relayerFeeRecipient, relayerFee)));
            } else {
                require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 548, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
                require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 648, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, relayerFeeRecipient, relayerFee)));
                require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 748, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, royaltyFeeRecipient, royaltyFee)));
            }
        }

        // if (royaltyFeeRecipient != address(0)) {

        // }
        // require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 548, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
        // require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 648, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, relayerFeeRecipient, relayerFee)));
        // if (royaltyFeeRecipient != address(0)) {
        //     require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 748, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, royaltyFeeRecipient, royaltyFee)));
        // }
		// require(ArrayUtils.arrayEq(data, abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
	}

    function checkERC20SideWithOneFee(bytes memory data, address from, address to, address feeRecipient, uint256 amount, uint256 fee)
        internal
        pure
    {
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 452, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 552, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, feeRecipient, fee)));
    }

    function checkERC20SideWithTwoFees(bytes memory data, address from, address to, address feeRecipient, address royaltyFeeRecipient, uint256 amount, uint256 fee, uint256 royaltyFee)
        internal
        pure
    {
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 548, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)));
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 648, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, feeRecipient, fee)));
        require(ArrayUtils.arrayEq(ArrayUtils.arraySlice(data, 748, 100), abi.encodeWithSignature("transferFrom(address,address,uint256)", from, royaltyFeeRecipient, royaltyFee)));
    }
}
