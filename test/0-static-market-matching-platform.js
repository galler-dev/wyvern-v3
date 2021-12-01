/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernStatic = artifacts.require('WyvernStatic')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const StaticMarketPlatform = artifacts.require('StaticMarketPlatform')
const TestERC721 = artifacts.require('TestERC721')
const TestERC1155 = artifacts.require('TestERC1155')
const TransferPlatformToken = artifacts.require('TransferPlatformToken')

const Web3 = require('web3')

const { atomicierAbi, transferPlatformTokenAbi } = require('./test-abis')
const { buildParamsWithFixedSize, buildSecondData, buildParamsForETHAndBundle, buildBundleData, buildSencodDataForETHAndBundle, relayerFeeAddress, royaltyFeeAddress} = require('./test-utils')
const { wrap, ZERO_ADDRESS, ZERO_BYTES32, TEST_NETWORK, NETWORK_INFO, assertIsRejected, randomUint } = require('./aux-win')
const provider = new Web3.providers.HttpProvider(NETWORK_INFO[TEST_NETWORK].url)
const web3 = new Web3(provider)

contract('WyvernExchange', (accounts) => {

    let deploy = async contracts => Promise.all(contracts.map(contract => contract.new()))
    const CHAIN_ID = NETWORK_INFO[TEST_NETWORK].chainId
    let contractInfo = NETWORK_INFO[TEST_NETWORK].contract

    let deploy_contracts = async () => {
        let exchange, statici, registry, atomicizer, erc1155, erc721, wyvernStatic, transferPlatformToken
        if (TEST_NETWORK == "development") {
            [registry, atomicizer, transferPlatformToken] = await Promise.all([WyvernRegistry.new(), WyvernAtomicizer.new(), TransferPlatformToken.new()]);
            [exchange, statici, wyvernStatic] = await Promise.all([WyvernExchange.new(CHAIN_ID, [registry.address], '0x'), StaticMarketPlatform.new(atomicizer.address), WyvernStatic.new(atomicizer.address)]);
            [erc1155, erc721] = await deploy([TestERC1155, TestERC721])
        } else {
            [exchange, statici, registry, atomicizer, erc1155, erc721, wyvernStatic, transferPlatformToken] = [
                new WyvernExchange(contractInfo.wyvernExchange),
                new StaticMarketPlatform(contractInfo.staticMarketPlatform),
                new WyvernRegistry(contractInfo.wyvernRegistry),
                new WyvernAtomicizer(contractInfo.wyvernAtomicizer),
                new TestERC1155(contractInfo.testERC1155),
                new TestERC721(contractInfo.testERC721),
                new WyvernStatic(contractInfo.wyvernStatic),
                new TransferPlatformToken(contractInfo.transferPlatformToken)
            ]
        }

        var granted = await registry.initialAddressSet();
        console.log("deploy_contracts exchange.address granted=" + granted)
        if (!granted) {
            await registry.grantInitialAuthentication(exchange.address)
        }

        return { registry, exchange: wrap(exchange), atomicizer, statici, erc1155, erc721, wyvernStatic, transferPlatformToken }
    }

    const erc721_for_platform_token_test = async (options) => {
        const {
            tokenId,
            buyTokenId,
            sellingPrice,
            buyingPrice,
            account_a,
            account_b,
            sender,
            hasFee,
            hasRoyaltyFee
         } = options

        let { exchange, registry, atomicizer, statici, erc1155, erc721, wyvernStatic, transferPlatformToken } = await deploy_contracts()
        console.log("erc721_for_platform_token_test erc721=" + erc721 + ", tokenId=" + tokenId + ", buyTokenId=" + buyTokenId)
        const atomicizerc = new web3.eth.Contract(atomicierAbi, atomicizer.address);
        const transferPlatformTokenc = new web3.eth.Contract(transferPlatformTokenAbi, transferPlatformToken.address);

        const [
            account_a_initial_eth_balance,
            account_b_initial_eth_balance,
            relayer_initial_eth_balance,
            royalty_initial_eth_balance,
        ] = await Promise.all([
            web3.eth.getBalance(account_a),
            web3.eth.getBalance(account_b),
            web3.eth.getBalance(relayerFeeAddress),
            web3.eth.getBalance(royaltyFeeAddress)
        ]);
        console.log("erc721_for_platform_token_test account_a=" + account_a + " balance=" + account_a_initial_eth_balance)
        console.log("erc721_for_platform_token_test account_b=" + account_b + " balance=" + account_b_initial_eth_balance)

        let proxy1 = await registry.proxies(account_a);
        if (proxy1 == ZERO_ADDRESS) {
            await registry.registerProxy({ from: account_a })
            proxy1 = await registry.proxies(account_a)
        }
        assert.equal(true, proxy1.length > 0, 'erc721_for_platform_token_test no proxy address for account a')

        let proxy2 = await registry.proxies(account_b)
        if (proxy2 == ZERO_ADDRESS) {
            await registry.registerProxy({ from: account_b })
            proxy2 = await registry.proxies(account_b)
        }
        assert.equal(true, proxy2.length > 0, 'erc721_for_platform_token_test no proxy address for account b')

        var isApprovedForAll = await erc721.isApprovedForAll(account_a, proxy1)
        console.log("erc721_for_platform_token_test isApprovedForAll=" + isApprovedForAll + ", proxy1=" + proxy1)
        if (!isApprovedForAll) {
            erc721.setApprovalForAll(proxy1, true, { from: account_a })
        }

        if (buyTokenId) {
            await erc721.mint(account_a, buyTokenId)
        }
        await erc721.mint(account_a, tokenId)

        let relayerFee = 2;
        let royaltyFee = 8;
        if (!hasFee) {
            relayerFee = 0
        }
        if (!hasRoyaltyFee) {
            royaltyFee = 0
        }

        const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
        let selectorOne
        let selectorTwo

        if (hasFee && hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC721ForETHWithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC721WithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else if (hasFee || hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC721ForETHWithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC721WithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC721ForETH(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC721(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        }

        let addressesOne = [erc721.address]
        let remainSellingPrice = sellingPrice - relayerFee - royaltyFee
        let tokenIdAndAmountOne = [tokenId, remainSellingPrice]
        let paramsOne = buildParamsWithFixedSize(addressesOne, tokenIdAndAmountOne, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        let addressesTwo = [erc721.address]
        let remainBuyingPrice = buyingPrice - relayerFee - royaltyFee
        let tokenIdAndAmountTwo = [buyTokenId || tokenId, remainBuyingPrice]
        let paramsTwo = buildParamsWithFixedSize(addressesTwo, tokenIdAndAmountTwo, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        const one = { registry: registry.address, maker: account_a, staticTarget: statici.address, feeRecipient: relayerFeeAddress, royaltyFeeRecipient: royaltyFeeAddress, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: 1, listingTime: '0', expirationTime: '10000000000', salt: '11', relayerFee: relayerFee, royaltyFee: royaltyFee }
        const two = { registry: registry.address, maker: account_b, staticTarget: statici.address, feeRecipient: relayerFeeAddress, royaltyFeeRecipient: royaltyFeeAddress, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: buyingPrice, listingTime: '0', expirationTime: '10000000000', salt: '12', relayerFee: relayerFee, royaltyFee: royaltyFee }

        const firstData = erc721c.methods.transferFrom(account_a, account_b, tokenId).encodeABI()

        let transferAddresses = [account_a]
        let transferAmounts = [remainBuyingPrice]
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
        let secondData = atomicizerc.methods.atomicize1(
            transferPlatformToken.address,
            0,
            transferETHData
        ).encodeABI()

        const firstCall = { target: erc721.address, howToCall: 0, data: firstData }
        const secondCall = {target: atomicizer.address, howToCall: 1, data: secondData}

        let sigOne = await exchange.sign(one, account_a)
        let sigTwo = await exchange.sign(two, account_b)
        await exchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32, { from: account_b, value: buyingPrice })

        let [account_a_eth_balance,
            account_b_eth_balance
        ] =
            await Promise.all([
                web3.eth.getBalance(account_a),
                web3.eth.getBalance(account_b)
            ])

        console.log("erc721_for_platform_token_test after atomic, account_a=" + account_a + " balance=" + account_a_eth_balance)
        console.log("erc721_for_platform_token_test after atomic, account_b=" + account_b + " balance=" + account_b_eth_balance)
        // assert.equal(account_a_eth_balance.toNumber(), account_a_initial_eth_balance.toNumber() + remainBuyingPrice, 'Incorrect ERC20 balance')

        if (hasFee) {
            let relayer_eth_balance = await web3.eth.getBalance(relayerFeeAddress);
            assert.equal(parseInt(relayer_eth_balance), parseInt(relayer_initial_eth_balance) + relayerFee)
        }
        if (hasRoyaltyFee) {
            let royalty_erc20_balance = await web3.eth.getBalance(royaltyFeeAddress);
            assert.equal(parseInt(royalty_erc20_balance), parseInt(royalty_initial_eth_balance) + royaltyFee)
        }
        let [token_owner] = await Promise.all([erc721.ownerOf(tokenId)])
        assert.equal(token_owner, account_b, 'Incorrect token owner')
    }

    it('StaticMarketPlatform: two fees: matches erc721 <> platform token order', async () => {
        const price = 150000000
        const timestamp = Date.parse(new Date());

        return erc721_for_platform_token_test({
            tokenId: timestamp,
            sellingPrice: price,
            buyingPrice: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: true,
            hasRoyaltyFee: true
        })
    })

    it('StaticMarketPlatform: one fee: matches erc721 <> platform token order', async () => {
        const price = 150000000
        const timestamp = Date.parse(new Date());

        return erc721_for_platform_token_test({
            tokenId: timestamp,
            sellingPrice: price,
            buyingPrice: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: true,
            hasRoyaltyFee: false
        })
    })

    it('StaticMarketPlatform: no fee: matches erc721 <> platform token order', async () => {
        const price = 150000000
        const timestamp = Date.parse(new Date());

        return erc721_for_platform_token_test({
            tokenId: timestamp,
            sellingPrice: price,
            buyingPrice: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: false,
            hasRoyaltyFee: false
        })
    })

    const any_erc1155_for_platform_token_test = async (options) => {
        const { tokenId,
            buyTokenId,
            sellAmount,
            sellingPrice,
            sellingNumerator,
            buyingPrice,
            buyAmount,
            buyingDenominator,
            erc1155MintAmount,
            account_a,
            account_b,
            sender,
            transactions,
            hasFee,
            hasRoyaltyFee
         } = options

        const txCount = transactions || 1

        let { exchange, registry, atomicizer, statici, erc1155, erc721, wyvernStatic, transferPlatformToken } = await deploy_contracts()

        const atomicizerc = new web3.eth.Contract(atomicierAbi, atomicizer.address);
        const transferPlatformTokenc = new web3.eth.Contract(transferPlatformTokenAbi, transferPlatformToken.address);

        const [
            account_a_initial_eth_balance,
            account_b_initial_eth_balance,
            account_b_initial_erc1155_balance,
            relayer_initial_eth_balance,
            royalty_initial_eth_balance,
        ] = await Promise.all([
            web3.eth.getBalance(account_a),
            web3.eth.getBalance(account_b),
            erc1155.balanceOf(account_b, tokenId),
            web3.eth.getBalance(relayerFeeAddress),
            web3.eth.getBalance(royaltyFeeAddress),
        ]);

        console.log("any_erc1155_for_platform_token_test account_a=" + account_a + ", account_b=" + account_b)
        let proxy1 = await registry.proxies(account_a);
        if (proxy1 == ZERO_ADDRESS) {
            await registry.registerProxy({ from: account_a })
            proxy1 = await registry.proxies(account_a)
        }
        assert.equal(true, proxy1.length > 0, 'no proxy address for account a')

        let proxy2 = await registry.proxies(account_b)
        if (proxy2 == ZERO_ADDRESS) {
            await registry.registerProxy({ from: account_b })
            proxy2 = await registry.proxies(account_b)
        }
        assert.equal(true, proxy2.length > 0, 'no proxy address for account b')

        var isApprovedForAll = await erc1155.isApprovedForAll(account_a, proxy1)
        console.log("any_erc1155_for_platform_token_test isApprovedForAll=" + isApprovedForAll + ", proxy1=" + proxy1)
        if (!isApprovedForAll) {
            erc1155.setApprovalForAll(proxy1, true, { from: account_a })
        }
        if (buyTokenId) {
            await erc1155.mint(account_a, buyTokenId, erc1155MintAmount)
        }
        // if (isBundle) {
        //     await erc1155.mint(account_a, anotherTokenId, erc1155MintAmount)
        // }
        await erc1155.mint(account_a, tokenId, erc1155MintAmount)

        const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address)
        let selectorOne
        if (hasFee && hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC1155ForETHWithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC1155WithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else if (hasFee || hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC1155ForETHWithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC1155WithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC1155ForETH(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC1155(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        }

        let relayerFee = 2;
        let royaltyFee = 8;
        if (!hasFee) {
            relayerFee = 0;
        }
        if (!hasRoyaltyFee) {
            royaltyFee = 0;
        }

        const finalSellingPrice = sellingPrice - relayerFee - royaltyFee
        let addressesOne = [erc1155.address]
        let tokenIdAndAmountOne = [tokenId, sellingNumerator || 1, finalSellingPrice]
        const paramsOne = buildParamsWithFixedSize(addressesOne, tokenIdAndAmountOne, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        const finalBuyingPrice = buyAmount * buyingPrice - relayerFee - royaltyFee
        let addressesTwo = [erc1155.address]
        let tokenIdAndAmountTwo = [buyTokenId || tokenId, finalBuyingPrice, buyingDenominator || 1]
        const paramsTwo = buildParamsWithFixedSize(addressesTwo, tokenIdAndAmountTwo, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        const one = { registry: registry.address, maker: account_a, staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: (sellingNumerator || 1) * sellAmount, listingTime: '0', expirationTime: '10000000000', salt: '11' }
        const two = { registry: registry.address, maker: account_b, staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: buyingPrice * buyAmount, listingTime: '0', expirationTime: '10000000000', salt: '12' }

        const firstData = erc1155c.methods.safeTransferFrom(account_a, account_b, tokenId, sellingNumerator || buyAmount, "0x").encodeABI() + ZERO_BYTES32.substr(2)

        let transferAddresses = [account_a]
        let transferAmounts = [finalBuyingPrice]
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
        let secondData = atomicizerc.methods.atomicize1(
            transferPlatformToken.address,
            0,
            transferETHData
        ).encodeABI()

        const firstCall = { target: erc1155.address, howToCall: 0, data: firstData }
        let secondCall = { target: atomicizer.address, howToCall: 1, data: secondData }

        let sigOne = await exchange.sign(one, account_a)

        console.log("any_erc1155_for_platform_token_test one order=" + one + ", two=" + two)
        for (var i = 0; i < txCount; ++i) {
            let sigTwo = await exchange.sign(two, account_b)
            await exchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32, { from: sender || account_a, value: buyingPrice })
            two.salt++
        }

        let [account_a_eth_balance,
            account_b_eth_balance,
            account_b_erc1155_balance
        ] =
            await Promise.all([
                web3.eth.getBalance(account_a),
                web3.eth.getBalance(account_b),
                erc1155.balanceOf(account_b, tokenId)
            ])

        console.log("account_a_eth_balance=" + account_a_eth_balance + ", account_b_erc1155_balance=" + account_b_erc1155_balance)
        // assert.equal(account_a_eth_balance.toNumber(), account_a_initial_eth_balance.toNumber() + finalBuyingPrice * txCount, 'Incorrect ERC20 balance')
        assert.equal(account_b_erc1155_balance.toNumber(), account_b_initial_erc1155_balance.toNumber() + (sellingNumerator || (buyAmount * txCount)), 'Incorrect ERC1155 balance')
        if (hasFee) {
            let relayer_eth_balance = await web3.eth.getBalance(relayerFeeAddress);
            console.log("relayer_eth_balance=" + relayer_eth_balance)
            // assert.equal(relayer_eth_balance, relayer_initial_eth_balance + relayerFee)
        }
        if (hasRoyaltyFee) {
            let royalty_erc20_balance = await web3.eth.getBalance(royaltyFeeAddress);
            console.log("royalty_erc20_balance=" + royalty_erc20_balance)
            // assert.equal(royalty_erc20_balance.toNumber(), royalty_initial_eth_balance.toNumber() + royaltyFee)
        }
    }

    it('StaticMarketPlatform: two fees, matches erc1155 <> platform token order, 1 fill', async () => {
        const price = 150
        const amount = 1

        var timestamp = Date.parse(new Date());
        return any_erc1155_for_platform_token_test({
            tokenId: timestamp,
            sellAmount: amount,
            sellingPrice: price,
            buyingPrice: price,
            buyAmount: amount,
            erc1155MintAmount: amount,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: true,
            hasRoyaltyFee: true
        })
    })

    it('StaticMarketPlatform: one fee, matches erc1155 <> platform token order, 1 fill', async () => {
        const price = 150
        const amount = 1

        var timestamp = Date.parse(new Date());
        return any_erc1155_for_platform_token_test({
            tokenId: timestamp,
            sellAmount: amount,
            sellingPrice: price,
            buyingPrice: price,
            buyAmount: amount,
            erc1155MintAmount: amount,
            erc20MintAmount: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: true,
            hasRoyaltyFee: false
        })
    })

    it('StaticMarketPlatform: no fee, matches erc1155 <> platform token order, 1 fill', async () => {
        const price = 150
        const amount = 1

        var timestamp = Date.parse(new Date());
        return any_erc1155_for_platform_token_test({
            tokenId: timestamp,
            sellAmount: amount,
            sellingPrice: price,
            buyingPrice: price,
            buyAmount: amount,
            erc1155MintAmount: amount,
            erc20MintAmount: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: false,
            hasRoyaltyFee: false
        })
    })

    it("StaticMarketPlatform: no fee, matches erc1155 <> erc20 order, 1 fill", async() => {
        const price = 1000
        const amount = 1

        var timestamp = Date.parse(new Date());
        return any_erc1155_for_platform_token_test({
            tokenId: timestamp,
            sellAmount: amount,
            sellingPrice: price,
            buyingPrice: price,
            buyAmount: amount,
            erc1155MintAmount: amount,
            erc20MintAmount: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: true,
            hasRoyaltyFee: true,
            isBundle: true,
            anotherTokenId: timestamp + 1
        })
    })
})
