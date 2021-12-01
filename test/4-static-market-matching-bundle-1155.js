/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernStatic = artifacts.require('WyvernStatic')
const StaticMarket = artifacts.require('StaticMarket')
const StaticMarketBundleForERC1155 = artifacts.require('StaticMarketBundleForERC1155')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const TestERC20 = artifacts.require('TestERC20')
const TestERC721 = artifacts.require('TestERC721')
const TestERC1155 = artifacts.require('TestERC1155')
const TestERC1271 = artifacts.require('TestERC1271')
const TransferPlatformToken = artifacts.require('TransferPlatformToken')

const Web3 = require('web3')

const { atomicierAbi, transferPlatformTokenAbi } = require('./test-abis')
const { buildParamsForBundle, buildSecondData, buildBundleData, relayerFeeAddress, royaltyFeeAddress} = require('./test-utils')
const { wrap, ZERO_ADDRESS, ZERO_BYTES32, TEST_NETWORK, NETWORK_INFO, assertIsRejected, randomUint } = require('./aux-win')
const provider = new Web3.providers.HttpProvider(NETWORK_INFO[TEST_NETWORK].url)
const web3 = new Web3(provider)

contract('WyvernExchange', (accounts) => {
// describe("WyvernExchange", function() {
    // let accounts;

    // before(async function() {
    //   accounts = await web3.eth.getAccounts();
    // });

    let deploy = async contracts => Promise.all(contracts.map(contract => contract.new()))
    const CHAIN_ID = NETWORK_INFO[TEST_NETWORK].chainId
    let contractInfo = NETWORK_INFO[TEST_NETWORK].contract

    let deploy_contracts = async () => {
        let exchange, statici, registry, atomicizer, erc1155, transferPlatformToken, erc20
        if (TEST_NETWORK == "development") {
            [registry, atomicizer, transferPlatformToken] = await Promise.all([WyvernRegistry.new(), WyvernAtomicizer.new(), TransferPlatformToken.new()]);
            [exchange, statici] = await Promise.all([WyvernExchange.new(CHAIN_ID, [registry.address], '0x'), StaticMarketBundleForERC1155.new(atomicizer.address)]);
            [erc20, erc1155, erc721] = await deploy([TestERC20, TestERC1155, TestERC721])
        } else {
            [exchange, statici, registry, atomicizer, erc1155, transferPlatformToken, erc20] = [
                new WyvernExchange(contractInfo.wyvernExchange),
                new StaticMarketBundleForERC1155(contractInfo.staticMarketBundleForERC1155),
                new WyvernRegistry(contractInfo.wyvernRegistry),
                new WyvernAtomicizer(contractInfo.wyvernAtomicizer),
                new TestERC1155(contractInfo.testERC1155),
                new TransferPlatformToken(contractInfo.transferPlatformToken),
                new TestERC20(contractInfo.testERC20)
            ]
        }

        var granted = await registry.initialAddressSet();
        console.log("deploy_contracts exchange.address granted=" + granted)
        if (!granted) {
            await registry.grantInitialAuthentication(exchange.address)
        }

        return { registry, exchange: wrap(exchange), atomicizer, statici, erc1155, transferPlatformToken, erc20 }
    }

    const any_erc1155_bundle_for_platform_token_test = async (options) => {
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
            hasRoyaltyFee,
            otherTokenIds,
            otherTokenAmounts
         } = options

        const txCount = transactions || 1

        let { exchange, registry, atomicizer, statici, erc1155, transferPlatformToken } = await deploy_contracts()

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

        console.log("any_erc1155_bundle_for_platform_token_test account_a=" + account_a + ", account_b=" + account_b)
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
        console.log("any_erc1155_bundle_for_platform_token_test isApprovedForAll=" + isApprovedForAll + ", proxy1=" + proxy1)
        if (!isApprovedForAll) {
            erc1155.setApprovalForAll(proxy1, true, { from: account_a })
        }
        if (buyTokenId) {
            await erc1155.mint(account_a, buyTokenId, erc1155MintAmount)
        }
        for (var i = 0; i < otherTokenIds.length; i++) {
            await erc1155.mint(account_a, otherTokenIds[i], otherTokenAmounts[i])
        }
        await erc1155.mint(account_a, tokenId, erc1155MintAmount)

        const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address)
        let selectorOne
        if (hasFee && hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC1155BundleForETHWithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC1155BundleWithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else if (hasFee || hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC1155BundleForETHWithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC1155BundleWithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC1155BundleForETH(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC1155Bundle(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
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
        let tokenIdsOne = [tokenId]
        tokenIdsOne.push(...otherTokenIds)
        let tokenAmountsOne = [sellAmount]
        tokenAmountsOne.push(...otherTokenAmounts)

        let tokenIdsAndAmountsOne = []
        tokenIdsAndAmountsOne.push(...tokenIdsOne)
        tokenIdsAndAmountsOne.push(...tokenAmountsOne)
        tokenIdsAndAmountsOne.push(finalSellingPrice)
        const paramsOne = buildParamsForBundle(addressesOne, tokenIdsAndAmountsOne, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        const finalBuyingPrice = buyingPrice - relayerFee - royaltyFee
        let addressesTwo = [erc1155.address]
        let tokenIdsTwo = [tokenId]
        tokenIdsTwo.push(...otherTokenIds)
        let tokenAmountsTwo = [buyAmount]
        tokenAmountsTwo.push(...otherTokenAmounts)

        let tokenIdsAndAmountsTwo = []
        tokenIdsAndAmountsTwo.push(...tokenIdsTwo)
        tokenIdsAndAmountsTwo.push(...tokenAmountsTwo)
        tokenIdsAndAmountsTwo.push(finalBuyingPrice)
        const paramsTwo = buildParamsForBundle(addressesTwo, tokenIdsAndAmountsTwo, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        const one = { registry: registry.address, maker: account_a, staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: (sellingNumerator || 1) * sellAmount, listingTime: '0', expirationTime: '10000000000', salt: '11' }
        const two = { registry: registry.address, maker: account_b, staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: buyingPrice * buyAmount, listingTime: '0', expirationTime: '10000000000', salt: '12' }

        // const firstData = erc1155c.methods.safeTransferFrom(account_a, account_b, tokenId, sellingNumerator || buyAmount, "0x").encodeABI() + ZERO_BYTES32.substr(2)
        const firstData = buildDataForErc1155Bundle(account_a, account_b, atomicizerc, erc1155, tokenIdsOne, tokenAmountsOne, erc1155c)

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

        const firstCall = { target: atomicizer.address, howToCall: 1, data: firstData }
        let secondCall = { target: atomicizer.address, howToCall: 1, data: secondData }

        let sigOne = await exchange.sign(one, account_a)

        console.log("any_erc1155_bundle_for_platform_token_test one order=" + one + ", two=" + two)
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

    function buildDataForErc1155Bundle(account_a, account_b, atomicizerc, erc1155, tokenIds, tokenAmounts, erc1155c) {
        let size = tokenIds.length
        let dataList = []
        for (i = 0; i < size; i++) {
            let data = erc1155c.methods.safeTransferFrom(account_a, account_b, tokenIds[i], tokenAmounts[i], "0x").encodeABI() + ZERO_BYTES32.substr(2)
            dataList.push(data)
        }
        return buildBundleData(atomicizerc, dataList, erc1155)
    }

    it('StaticMarketPlatform: two fees, matches erc1155 <> platform token order', async () => {
        const price = 150
        const amount = 3

        var timestamp = Date.parse(new Date());
        return any_erc1155_bundle_for_platform_token_test({
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
            hasRoyaltyFee: true,
            otherTokenIds: [timestamp + 1],
            otherTokenAmounts: [2]
        })
    })

    it('StaticMarketPlatform: only fee, matches erc1155 <> platform token order', async () => {
        const price = 150
        const amount = 2

        var timestamp = Date.parse(new Date());
        return any_erc1155_bundle_for_platform_token_test({
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
            hasRoyaltyFee: false,
            otherTokenIds: [timestamp + 1, timestamp + 2],
            otherTokenAmounts: [2, 3]
        })
    })

    it('StaticMarketPlatform: only royalty fee, matches erc1155 <> platform token order', async () => {
        const price = 150
        const amount = 2

        var timestamp = Date.parse(new Date());
        return any_erc1155_bundle_for_platform_token_test({
            tokenId: timestamp,
            sellAmount: amount,
            sellingPrice: price,
            buyingPrice: price,
            buyAmount: amount,
            erc1155MintAmount: amount,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: false,
            hasRoyaltyFee: true,
            otherTokenIds: [timestamp + 1, timestamp + 2, timestamp + 3],
            otherTokenAmounts: [2, 3, 2]
        })
    })

    it('StaticMarketPlatform: no fee, matches erc1155 <> platform token order', async () => {
        const price = 150
        const amount = 2

        var timestamp = Date.parse(new Date());
        return any_erc1155_bundle_for_platform_token_test({
            tokenId: timestamp,
            sellAmount: amount,
            sellingPrice: price,
            buyingPrice: price,
            buyAmount: amount,
            erc1155MintAmount: amount,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: false,
            hasRoyaltyFee: false,
            otherTokenIds: [timestamp + 1, timestamp + 2, timestamp + 3, timestamp + 4],
            otherTokenAmounts: [2, 3, 4, 5]
        })
    })

    const any_erc1155_bundle_for_erc20_test = async (options) => {
        const { tokenId,
            buyTokenId,
            sellAmount,
            sellingPrice,
            sellingNumerator,
            buyingPrice,
            erc20MintAmount,
            buyAmount,
            erc1155MintAmount,
            account_a,
            account_b,
            sender,
            transactions,
            hasFee,
            hasRoyaltyFee,
            otherTokenIds,
            otherTokenAmounts
         } = options

        const txCount = transactions || 1

        let { exchange, registry, atomicizer, statici, erc1155, transferPlatformToken, erc20 } = await deploy_contracts()

        const atomicizerc = new web3.eth.Contract(atomicierAbi, atomicizer.address);
        const transferPlatformTokenc = new web3.eth.Contract(transferPlatformTokenAbi, transferPlatformToken.address);

        const [
            account_a_initial_erc20_balance,
            account_b_initial_erc20_balance,
            account_b_initial_erc1155_balance,
            relayer_initial_erc20_balance,
            royalty_initial_erc20_balance,
        ] = await Promise.all([
            erc20.balanceOf(account_a),
            erc20.balanceOf(account_b),
            erc1155.balanceOf(account_b, tokenId),
            erc20.balanceOf(relayerFeeAddress),
            erc20.balanceOf(royaltyFeeAddress),
        ]);

        console.log("any_erc1155_bundle_for_platform_token_test account_a=" + account_a + ", account_b=" + account_b)
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

        var allowance = await erc20.allowance(account_b, proxy2)
        if (allowance == 0) {
            erc20.approve(proxy2, erc20MintAmount, { from: account_b })
        } else if (allowance < erc20MintAmount) {
            erc20.approve(proxy2, 0, { from: account_b })
            erc20.approve(proxy2, erc20MintAmount, { from: account_b })
        }

        var isApprovedForAll = await erc1155.isApprovedForAll(account_a, proxy1)
        console.log("any_erc1155_bundle_for_platform_token_test isApprovedForAll=" + isApprovedForAll + ", proxy1=" + proxy1)
        if (!isApprovedForAll) {
            erc1155.setApprovalForAll(proxy1, true, { from: account_a })
        }
        if (buyTokenId) {
            await erc1155.mint(account_a, buyTokenId, erc1155MintAmount)
        }
        for (var i = 0; i < otherTokenIds.length; i++) {
            await erc1155.mint(account_a, otherTokenIds[i], otherTokenAmounts[i])
        }
        await erc1155.mint(account_a, tokenId, erc1155MintAmount)

        await erc20.mint(account_b, erc20MintAmount)

        const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address)
        const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)
        let selectorOne
        if (hasFee && hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC1155BundleForERC20WithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ERC20ForERC1155BundleWithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else if (hasFee || hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC1155BundleForERC20WithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ERC20ForERC1155BundleWithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC1155BundleForERC20(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ERC20ForERC1155Bundle(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
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
        let addressesOne = [erc1155.address, erc20.address]
        let tokenIdsOne = [tokenId]
        tokenIdsOne.push(...otherTokenIds)
        let tokenAmountsOne = [sellAmount]
        tokenAmountsOne.push(...otherTokenAmounts)

        let tokenIdsAndAmountsOne = []
        tokenIdsAndAmountsOne.push(...tokenIdsOne)
        tokenIdsAndAmountsOne.push(...tokenAmountsOne)
        tokenIdsAndAmountsOne.push(finalSellingPrice)
        const paramsOne = buildParamsForBundle(addressesOne, tokenIdsAndAmountsOne, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        const finalBuyingPrice = buyingPrice - relayerFee - royaltyFee
        let addressesTwo = [erc20.address, erc1155.address]
        let tokenIdsTwo = [tokenId]
        tokenIdsTwo.push(...otherTokenIds)
        let tokenAmountsTwo = [buyAmount]
        tokenAmountsTwo.push(...otherTokenAmounts)

        let tokenIdsAndAmountsTwo = []
        tokenIdsAndAmountsTwo.push(...tokenIdsTwo)
        tokenIdsAndAmountsTwo.push(...tokenAmountsTwo)
        tokenIdsAndAmountsTwo.push(finalBuyingPrice)
        const paramsTwo = buildParamsForBundle(addressesTwo, tokenIdsAndAmountsTwo, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        const one = { registry: registry.address, maker: account_a, staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: (sellingNumerator || 1) * sellAmount, listingTime: '0', expirationTime: '10000000000', salt: '11' }
        const two = { registry: registry.address, maker: account_b, staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: buyingPrice * buyAmount, listingTime: '0', expirationTime: '10000000000', salt: '12' }

        const firstData = buildDataForErc1155Bundle(account_a, account_b, atomicizerc, erc1155, tokenIdsOne, tokenAmountsOne, erc1155c)

        let secondData = buildSecondData(atomicizerc, erc20, erc20c, relayerFee, royaltyFee, account_a,
             account_b, finalBuyingPrice)

        const firstCall = { target: atomicizer.address, howToCall: 1, data: firstData }
        let secondCall
        if (!hasFee && !hasRoyaltyFee) {
            secondCall = { target: erc20.address, howToCall: 0, data: secondData }
        } else {
            secondCall = { target: atomicizer.address, howToCall: 1, data: secondData }
        }

        let sigOne = await exchange.sign(one, account_a)
        console.log("any_erc1155_bundle_for_platform_token_test one order=" + one + ", two=" + two)
        for (var i = 0; i < txCount; ++i) {
            let sigTwo = await exchange.sign(two, account_b)
            await exchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32, { from: sender || account_a})
            two.salt++
        }

        let [account_a_erc20_balance,
            account_b_erc20_balance,
            account_b_erc1155_balance
        ] =
            await Promise.all([
                erc20.balanceOf(account_a),
                erc20.balanceOf(account_b),
                erc1155.balanceOf(account_b, tokenId)
            ])

        console.log("erc1155_for_erc20_bundle_test account_a_erc20_balance=" + account_a_erc20_balance + ", account_b_erc1155_balance=" + account_b_erc1155_balance)
        assert.equal(account_a_erc20_balance.toNumber(), account_a_initial_erc20_balance.toNumber() + finalBuyingPrice, 'Incorrect ERC20 balance')
        assert.equal(account_b_erc1155_balance.toNumber(), account_b_initial_erc1155_balance.toNumber() + (sellingNumerator || (buyAmount * txCount)), 'Incorrect ERC1155 balance')
        if (hasFee) {
            let relayer_erc20_balance = await erc20.balanceOf(relayerFeeAddress);
            assert.equal(relayer_erc20_balance.toNumber(), relayer_initial_erc20_balance.toNumber() + relayerFee)
        }
        if (hasRoyaltyFee) {
            let royalty_erc20_balance = await erc20.balanceOf(royaltyFeeAddress);
            assert.equal(royalty_erc20_balance.toNumber(), royalty_initial_erc20_balance.toNumber() + royaltyFee)
        }

    }

    it('StaticMarketBundleForERC1155: two fees, matches erc1155 <> erc20 order', async () => {
        const price = 150
        const amount = 2

        var timestamp = Date.parse(new Date());
        return any_erc1155_bundle_for_erc20_test({
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
            hasRoyaltyFee: false,
            otherTokenIds: [timestamp + 1, timestamp + 2, timestamp + 3, timestamp + 4],
            otherTokenAmounts: [2, 3, 4, 5]
        })
    })

    it('StaticMarketBundleForERC1155: only fee, matches erc1155 <> erc20 order', async () => {
        const price = 150
        const amount = 2

        var timestamp = Date.parse(new Date());
        return any_erc1155_bundle_for_erc20_test({
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
            hasRoyaltyFee: false,
            otherTokenIds: [timestamp + 1, timestamp + 2, timestamp + 3, timestamp + 4],
            otherTokenAmounts: [2, 3, 4, 5]
        })
    })

    it('StaticMarketBundleForERC1155: only fee, matches erc1155 <> erc20 order', async () => {
        const price = 150
        const amount = 2

        var timestamp = Date.parse(new Date());
        return any_erc1155_bundle_for_erc20_test({
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
            hasRoyaltyFee: true,
            otherTokenIds: [timestamp + 1, timestamp + 2, timestamp + 3],
            otherTokenAmounts: [2, 3, 4]
        })
    })

    it('StaticMarketBundleForERC1155: no fee, matches erc1155 <> erc20 order', async () => {
        const price = 150
        const amount = 2

        var timestamp = Date.parse(new Date());
        return any_erc1155_bundle_for_erc20_test({
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
            hasRoyaltyFee: false,
            otherTokenIds: [timestamp + 1, timestamp + 2, timestamp + 3, timestamp + 4],
            otherTokenAmounts: [2, 3, 4, 5]
        })
    })
})
