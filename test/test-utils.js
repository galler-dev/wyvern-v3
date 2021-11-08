    let relayerFeeAddress = "0x2c1373b2E0B26ad28c6Cc6998fE6bBB4FC816755";
    let royaltyFeeAddress = "0x66Cf70582225b4E625f60b065f86b9951a183939";

    function buildParamsForPlatform(addresses, tokenIdAndAmount, relayerFee, royaltyFee, hasFee, hasRoyaltyFee, isErc1155) {
        if (hasFee && hasRoyaltyFee) {
            addresses.push(relayerFeeAddress)
            addresses.push(royaltyFeeAddress)
            tokenIdAndAmount.push(relayerFee)
            tokenIdAndAmount.push(royaltyFee)
        } else if (hasFee) {
            addresses.push(relayerFeeAddress)
            tokenIdAndAmount.push(relayerFee)
        } else if (hasRoyaltyFee) {
            addresses.push(royaltyFeeAddress)
            tokenIdAndAmount.push(royaltyFee)
        }

        let typeAddrs = 'address[' + addresses.length + ']'
        let typeUints = 'uint256[' + tokenIdAndAmount.length + ']'
        params = web3.eth.abi.encodeParameters(
            [typeAddrs, typeUints],
            [addresses, tokenIdAndAmount]
        )
        return params
    }

    function buildParamsForBundle(addresses, tokenIdAndAmount, relayerFee, royaltyFee, hasFee, hasRoyaltyFee, isErc1155) {
        if (hasFee && hasRoyaltyFee) {
            addresses.push(relayerFeeAddress)
            addresses.push(royaltyFeeAddress)
            tokenIdAndAmount.push(relayerFee)
            tokenIdAndAmount.push(royaltyFee)
            if (isErc1155) {
                params = web3.eth.abi.encodeParameters(
                    ['address[4]', 'uint256[]'],
                    [addresses, tokenIdAndAmount]
                )
            } else {
                params = web3.eth.abi.encodeParameters(
                    ['address[4]', 'uint256[]'],
                    [addresses, tokenIdAndAmount]
                )
            }
        } else if (hasFee) {
            addresses.push(relayerFeeAddress)
            tokenIdAndAmount.push(relayerFee)
            if (isErc1155) {
                params = web3.eth.abi.encodeParameters(
                    ['address[3]', 'uint256[]'],
                    [addresses, tokenIdAndAmount]
                )
            } else {
                params = web3.eth.abi.encodeParameters(
                    ['address[3]', 'uint256[]'],
                    [addresses, tokenIdAndAmount]
                )
            }
        } else if (hasRoyaltyFee) {
            addresses.push(royaltyFeeAddress)
            tokenIdAndAmount.push(royaltyFee)
            if (isErc1155) {
                params = web3.eth.abi.encodeParameters(
                    ['address[3]', 'uint256[]'],
                    [addresses, tokenIdAndAmount]
                )
            } else {
                params = web3.eth.abi.encodeParameters(
                    ['address[3]', 'uint256[]'],
                    [addresses, tokenIdAndAmount]
                )
            }
        } else {
            if (isErc1155) {
                params = web3.eth.abi.encodeParameters(
                    ['address[2]', 'uint256[3]'],
                    [addresses, tokenIdAndAmount]
                )
            } else {
                params = web3.eth.abi.encodeParameters(
                    ['address[2]', 'uint256[]'],
                    [addresses, tokenIdAndAmount]
                )
            }
        }
        return params
    }

    function buildParamsForETHAndBundle(addresses, tokenIdAndAmount, relayerFee, royaltyFee, hasFee, hasRoyaltyFee, isErc1155) {
        if (hasFee && hasRoyaltyFee) {
            addresses.push(relayerFeeAddress)
            addresses.push(royaltyFeeAddress)
            tokenIdAndAmount.push(relayerFee)
            tokenIdAndAmount.push(royaltyFee)
            params = web3.eth.abi.encodeParameters(
                ['address[3]', 'uint256[]'],
                [addresses, tokenIdAndAmount]
            )
        } else if (hasFee) {
            addresses.push(relayerFeeAddress)
            tokenIdAndAmount.push(relayerFee)
            params = web3.eth.abi.encodeParameters(
                ['address[2]', 'uint256[]'],
                [addresses, tokenIdAndAmount]
            )
        } else if (hasRoyaltyFee) {
            addresses.push(royaltyFeeAddress)
            tokenIdAndAmount.push(royaltyFee)
            params = web3.eth.abi.encodeParameters(
                ['address[2]', 'uint256[]'],
                [addresses, tokenIdAndAmount]
            )
        } else {
            params = web3.eth.abi.encodeParameters(
                ['address[1]', 'uint256[]'],
                [addresses, tokenIdAndAmount]
            )
        }
        return params
    }

    function buildBundleData(atomicizerc, dataList, ercToken) {
        let values = []
        let addresses = []
        let lengths = []
        let data
        for (var i = 0; i < dataList.length; i++) {
            values.push(0)
            addresses.push(ercToken.address)
            lengths.push((dataList[i].length - 2) / 2)
            if (i == 0) {
                data = dataList[i]
            } else {
                data += dataList[i].slice("2")
            }
        }
        return atomicizerc.methods.atomicizeCustom(
            addresses,
            values,
            lengths,
            data
        ).encodeABI()
    }

    function buildFirstDataForETHAndBundle(atomicizerc, dataList) {
        let values = []
        let addresses = []
        let lengths = []
        let data
        for (var i = 0; i < dataList.length; i++) {
            values.push(0)
            lengths.push((dataList[i].length - 2) / 2)
            if (i == 0) {
                data = dataList[i]
            } else {
                data += dataList[i].slice("2")
            }
        }
        return atomicizerc.methods.atomicizeCustom(
            addresses,
            values,
            lengths,
            data
        ).encodeABI()
    }

    function buildSencodDataForETHAndBundle(atomicizerc, transferAddresses, transferAmounts, transferPlatformToken,
                                            transferPlatformTokenc, relayerFee, royaltyFee, hasFee, hasRoyaltyFee) {
        if (hasFee) {
            transferAddresses.push(relayerFeeAddress)
            transferAmounts.push(relayerFee)
        }
        if (hasRoyaltyFee) {
            transferAddresses.push(royaltyFeeAddress)
            transferAmounts.push(royaltyFee)
        }
        let transferETHData = transferPlatformTokenc.methods.transferETH(
            transferAddresses,
            transferAmounts
        ).encodeABI()
        return atomicizerc.methods.atomicize1(
            transferPlatformToken.address,
            0,
            transferETHData
        ).encodeABI()
    }

    function buildSecondData(atomicizerc, erc20, erc20c, secondDataTransferRemain,
                             secondDataTransferRelayerFee, secondDataTransferRoyaltyFee,
                             hasFee, hasRoyaltyFee, account_a, account_b, buyingPrice) {
        if (hasFee && hasRoyaltyFee) {
            secondData = atomicizerc.methods.atomicize3(
                [erc20.address, erc20.address, erc20.address],
                [0, 0, 0],
                secondDataTransferRemain,
                secondDataTransferRelayerFee,
                secondDataTransferRoyaltyFee
            ).encodeABI();
        } else if (hasFee) {
            secondData = atomicizerc.methods.atomicize2(
                [erc20.address, erc20.address],
                [0, 0],
                secondDataTransferRemain,
                secondDataTransferRelayerFee
            ).encodeABI();
        } else if (hasRoyaltyFee) {
            secondData = atomicizerc.methods.atomicize2(
                [erc20.address, erc20.address],
                [0, 0],
                secondDataTransferRemain,
                secondDataTransferRoyaltyFee
            ).encodeABI();
        } else {
            secondData = erc20c.methods.transferFrom(account_b, account_a, buyingPrice).encodeABI();
        }
        return secondData
    }

    function getEthBalance(web3, address, balance) {
        web3.eth.getBalance(address).then(bal => {
            balance = bal;
            console.log(bal);
        }).catch(console.error);
    }

    module.exports = {
        buildParamsForPlatform,
        buildParamsForBundle,
        buildSecondData,
        buildBundleData,
        getEthBalance,
        buildParamsForETHAndBundle,
        buildSencodDataForETHAndBundle,
        buildFirstDataForETHAndBundle,
        relayerFeeAddress,
        royaltyFeeAddress
    }
