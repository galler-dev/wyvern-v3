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

	function anyERC1155ForERC20WithFee(bytes memory extra,
		address[11] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[10] memory uints,
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
        // addresses[5] is the address of WyvernAtomicizer. How to check it?
		// require(addresses[5] == tokenGiveGet[1], "anyERC1155ForERC20: countercall target must equal address of token to get");

        require(addresses[7] == addresses[9], "anyERC1155ForERC20: call fee recipient must equal address of countercall");
        require(addresses[8] == addresses[10], "anyERC1155ForERC20: call royalty fee recipient must equal address of countercall");

        require(uints[6] == uints[8], "anyERC1155ForERC20: call relayer fee must equal relayer fee of countercall");
        require(uints[7] == uints[9], "anyERC1155ForERC20: call royalty fee must equal royalty fee of countercall");

		uint256[4] memory call_amounts = [
			getERC1155AmountFromCalldata(data),
			getERC20AmountFromCalldataWithFee(counterdata, addresses[7], addresses[8]),
            getRelayerAmountFromCalldataWithFee(counterdata, addresses[7], addresses[8]),
            getRoyaltyAmountFromCalldataWithFee(counterdata, addresses[7], addresses[8])
		];
        uint256 new_fill = 0;
        {
            new_fill = SafeMath.add(uints[5],call_amounts[0]);
            require(new_fill <= uints[1],"anyERC1155ForERC20: new fill exceeds maximum fill");
            uint256 counterAmount = call_amounts[1] + call_amounts[2] + call_amounts[3];
            require(SafeMath.mul(tokenIdAndNumeratorDenominator[1], counterAmount) == SafeMath.mul(tokenIdAndNumeratorDenominator[2], call_amounts[0]),"anyERC1155ForERC20: wrong ratio");
        }

		checkERC1155Side(data,addresses[1],addresses[4],tokenIdAndNumeratorDenominator[0],call_amounts[0]);
		// checkERC20Side(counterdata,addresses[4],addresses[1],call_amounts[1]);
        checkERC20SideWithFee(counterdata,addresses[4],addresses[1],addresses[7],addresses[8],call_amounts[1],uints[6],uints[7]);

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

	function anyERC20ForERC1155WithFee(bytes memory extra,
		address[11] memory addresses, AuthenticatedProxy.HowToCall[2] memory howToCalls, uint[10] memory uints,
		bytes memory data, bytes memory counterdata)
		public
		pure
		returns (uint)
	{
		require(uints[0] == 0,"anyERC20ForERC1155: Zero value required");
		require(howToCalls[0] == AuthenticatedProxy.HowToCall.DelegateCall, "anyERC20ForERC1155: call must be a delegate call");

		(address[2] memory tokenGiveGet, uint256[3] memory tokenIdAndNumeratorDenominator) = abi.decode(extra, (address[2], uint256[3]));

		require(tokenIdAndNumeratorDenominator[1] > 0,"anyERC20ForERC1155: numerator must be larger than zero");
		require(tokenIdAndNumeratorDenominator[2] > 0,"anyERC20ForERC1155: denominator must be larger than zero");
        // addresses[2] is the address of WyvernAtomicizer. How to check it?
		// require(addresses[2] == tokenGiveGet[0], "anyERC20ForERC1155: call target must equal address of token to get");
		require(addresses[5] == tokenGiveGet[1], "anyERC20ForERC1155: countercall target must equal address of token to give");

        require(addresses[7] == addresses[9], "anyERC20ForERC1155: call fee recipient must equal address of countercall");
        require(addresses[8] == addresses[10], "anyERC20ForERC1155: call royalty fee recipient must equal address of countercall");

        require(uints[6] == uints[8], "anyERC20ForERC1155: call relayer fee must equal relayer fee of countercall");
        require(uints[7] == uints[9], "anyERC20ForERC1155: call royalty fee must equal royalty fee of countercall");

        // uint256 royaltyAmount = addresses[8] == address(0) ? 0 : getRoyaltyAmountFromCalldataWithFee(data);
		uint256[4] memory call_amounts = [
			getERC1155AmountFromCalldata(counterdata),
			getERC20AmountFromCalldataWithFee(data, addresses[7], addresses[8]),
            getRelayerAmountFromCalldataWithFee(data, addresses[7], addresses[8]),
            getRoyaltyAmountFromCalldataWithFee(data, addresses[7], addresses[8])
		];
        uint256 new_fill;
        {
            uint256 amount = call_amounts[1] + call_amounts[2] + call_amounts[3];
            new_fill = SafeMath.add(uints[5],amount);
            require(new_fill <= uints[1],"anyERC20ForERC1155: new fill exceeds maximum fill");
            require(SafeMath.mul(tokenIdAndNumeratorDenominator[1], call_amounts[0]) == SafeMath.mul(tokenIdAndNumeratorDenominator[2], amount),"anyERC20ForERC1155: wrong ratio");
        }
		checkERC1155Side(counterdata,addresses[4],addresses[1],tokenIdAndNumeratorDenominator[0],call_amounts[0]);
		checkERC20SideWithFee(data,addresses[1],addresses[4],addresses[7],addresses[8],call_amounts[1],uints[6],uints[7]);

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

	function getERC20AmountFromCalldataWithFee(bytes memory data, address relayerFeeRecipient, address royaltyFeeRecipient)
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

	function checkERC20SideWithFee(bytes memory data, address from, address to, address relayerFeeRecipient, address royaltyFeeRecipient, uint256 amount, uint256 relayerFee, uint256 royaltyFee)
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
}
