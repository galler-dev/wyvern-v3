/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernStatic = artifacts.require('WyvernStatic')
const StaticMarket = artifacts.require('StaticMarket')
const StaticMarketBundle = artifacts.require('StaticMarketBundle')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const TestERC20 = artifacts.require('TestERC20')
const TestERC721 = artifacts.require('TestERC721')
const TestERC1155 = artifacts.require('TestERC1155')
const TestERC1271 = artifacts.require('TestERC1271')

const Web3 = require('web3')

const { atomicierAbi } = require('./test-abis')
const { buildParamsForBundle, buildSecondData, buildBundleData, relayerFeeAddress, royaltyFeeAddress} = require('./test-utils')
const { wrap, ZERO_ADDRESS, ZERO_BYTES32, TEST_NETWORK, NETWORK_INFO, assertIsRejected, randomUint } = require('./aux-win')
const provider = new Web3.providers.HttpProvider(NETWORK_INFO[TEST_NETWORK].url)
const web3 = new Web3(provider)

contract('WyvernExchange', (accounts) => {

    let deploy = async contracts => Promise.all(contracts.map(contract => contract.new()))
    const CHAIN_ID = NETWORK_INFO[TEST_NETWORK].chainId
    let contractInfo = NETWORK_INFO[TEST_NETWORK].contract

    let deploy_contracts = async () => {
        let exchange, statici, registry, atomicizer, erc20, erc1155, erc721
        if (TEST_NETWORK == "development") {
            [registry, atomicizer] = await Promise.all([WyvernRegistry.new(), WyvernAtomicizer.new()]);
            [exchange, statici] = await Promise.all([WyvernExchange.new(CHAIN_ID, [registry.address], '0x'), StaticMarketBundle.new()]);
            [erc20, erc1155, erc721] = await deploy([TestERC20, TestERC1155, TestERC721])
        } else {
            [exchange, statici, registry, atomicizer, erc20, erc1155, erc721] = [
                new WyvernExchange(contractInfo.wyvernExchange),
                new StaticMarketBundle(contractInfo.staticMarketBundle),
                new WyvernRegistry(contractInfo.wyvernRegistry),
                new WyvernAtomicizer(contractInfo.wyvernAtomicizer),
                new TestERC20(contractInfo.testERC20),
                new TestERC1155(contractInfo.testERC1155),
                new TestERC721(contractInfo.testERC721)
            ]
        }

        var granted = await registry.initialAddressSet();
        console.log("deploy_contracts exchange.address granted=" + granted)
        if (!granted) {
            await registry.grantInitialAuthentication(exchange.address)
        }

        return { registry, exchange: wrap(exchange), atomicizer, statici, erc20, erc1155, erc721 }
    }

    const erc721_for_erc20_bundle_test = async (options) => {
        const {
            tokenId,
            buyTokenId,
            sellingPrice,
            buyingPrice,
            erc20MintAmount,
            account_a,
            account_b,
            sender,
            hasFee,
            hasRoyaltyFee,
            otherTokenIds
         } = options

        let { exchange, registry, atomicizer, statici, erc20, erc1155, erc721 } = await deploy_contracts()
        console.log("erc721_for_erc20_bundle_test erc721=" + erc721 + ", tokenId=" + tokenId + ", buyTokenId=" + buyTokenId)
        const atomicizerc = new web3.eth.Contract(atomicierAbi, atomicizer.address);

        const [
            account_a_initial_erc20_balance,
            account_b_initial_erc20_balance,
            relayer_initial_erc20_balance,
            royalty_initial_erc20_balance,
        ] = await Promise.all([
            erc20.balanceOf(account_a),
            erc20.balanceOf(account_b),
            erc20.balanceOf(relayerFeeAddress),
            erc20.balanceOf(royaltyFeeAddress),
        ]);

        let proxy1 = await registry.proxies(account_a);
        if (proxy1 == ZERO_ADDRESS) {
            await registry.registerProxy({ from: account_a })
            proxy1 = await registry.proxies(account_a)
        }
        assert.equal(true, proxy1.length > 0, 'erc721_for_erc20_bundle_test no proxy address for account a')

        let proxy2 = await registry.proxies(account_b)
        if (proxy2 == ZERO_ADDRESS) {
            await registry.registerProxy({ from: account_b })
            proxy2 = await registry.proxies(account_b)
        }
        assert.equal(true, proxy2.length > 0, 'erc721_for_erc20_bundle_test no proxy address for account b')

        var allowance = await erc20.allowance(account_b, proxy2)
        if (allowance == 0) {
            erc20.approve(proxy2, erc20MintAmount, { from: account_b })
        } else if (allowance < erc20MintAmount) {
            erc20.approve(proxy2, 0, { from: account_b })
            erc20.approve(proxy2, erc20MintAmount, { from: account_b })
        }

        var isApprovedForAll = await erc721.isApprovedForAll(account_a, proxy1)
        console.log("erc721_for_erc20_bundle_test isApprovedForAll=" + isApprovedForAll + ", proxy1=" + proxy1)
        if (!isApprovedForAll) {
            erc721.setApprovalForAll(proxy1, true, { from: account_a })
        }

        if (buyTokenId) {
            await erc721.mint(account_a, buyTokenId)
        }
        for (var i = 0; i < otherTokenIds.length; i++) {
            await erc721.mint(account_a, otherTokenIds[i])
        }

        await erc721.mint(account_a, tokenId)
        await erc20.mint(account_b, erc20MintAmount)

        let relayerFee = 2;
        let royaltyFee = 8;
        if (!hasFee) {
            relayerFee = 0
        }
        if (!hasRoyaltyFee) {
            royaltyFee = 0
        }

        const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
        const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)
        let selectorOne
        let selectorTwo
        if (hasFee && hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC721BundleForERC20WithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ERC20ForERC721BundleWithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else if (hasFee || hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC721BundleForERC20WithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ERC20ForERC721BundleWithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC721BundleForERC20(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ERC20ForERC721Bundle(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        }

        let addressesOne = [erc721.address, erc20.address]
        let remainSellingPrice = sellingPrice - relayerFee - royaltyFee
        let tokenIdsOne = [tokenId]
        tokenIdsOne.push(...otherTokenIds)
        tokenIdsOne.push(remainSellingPrice)
        let tokenIdsAndAmountOne = tokenIdsOne
        let paramsOne = buildParamsForBundle(addressesOne, tokenIdsAndAmountOne, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        let addressesTwo = [erc20.address, erc721.address]
        let remainBuyingPrice = buyingPrice - relayerFee - royaltyFee
        let tokenIdsTwo = [buyTokenId || tokenId]
        tokenIdsTwo.push(...otherTokenIds)
        tokenIdsTwo.push(remainBuyingPrice)
        let tokenIdAndAmountTwo = tokenIdsTwo
        let paramsTwo = buildParamsForBundle(addressesTwo, tokenIdAndAmountTwo, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        const one = { registry: registry.address, maker: account_a, staticTarget: statici.address, feeRecipient: relayerFeeAddress, royaltyFeeRecipient: royaltyFeeAddress, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: 1, listingTime: '0', expirationTime: '10000000000', salt: '11', relayerFee: relayerFee, royaltyFee: royaltyFee }
        const two = { registry: registry.address, maker: account_b, staticTarget: statici.address, feeRecipient: relayerFeeAddress, royaltyFeeRecipient: royaltyFeeAddress, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: buyingPrice, listingTime: '0', expirationTime: '10000000000', salt: '12', relayerFee: relayerFee, royaltyFee: royaltyFee }

        let dataList = [erc721c.methods.transferFrom(account_a, account_b, tokenId).encodeABI()]
        for (var i = 0; i < otherTokenIds.length; i++) {
            dataList.push(erc721c.methods.transferFrom(account_a, account_b, otherTokenIds[i]).encodeABI())
        }
        const firstData = buildBundleData(atomicizerc, dataList, erc721)
        // const secondData = erc20c.methods.transferFrom(account_b, account_a, buyingPrice).encodeABI()

        // const remainAmountAfterFee = buyingPrice - relayerFee - royaltyFee
        const secondDataTransferRemain = erc20c.methods.transferFrom(account_b, account_a, remainBuyingPrice).encodeABI()
        const secondDataTransferRelayerFee = erc20c.methods.transferFrom(account_b, relayerFeeAddress, relayerFee).encodeABI()
        const secondDataTransferRoyaltyFee = erc20c.methods.transferFrom(account_b, royaltyFeeAddress, royaltyFee).encodeABI()

        let secondData = buildSecondData(atomicizerc, erc20, erc20c, secondDataTransferRemain, secondDataTransferRelayerFee,
            secondDataTransferRoyaltyFee, hasFee, hasRoyaltyFee, account_a, account_b, remainBuyingPrice)

        const firstCall = { target: atomicizer.address, howToCall: 1, data: firstData }

        let secondCall
        if (!hasFee && !hasRoyaltyFee) {
            secondCall = { target: erc20.address, howToCall: 0, data: secondData }
        } else {
            secondCall = { target: atomicizer.address, howToCall: 1, data: secondData }
        }

        let sigOne = await exchange.sign(one, account_a)
        let sigTwo = await exchange.sign(two, account_b)
        await exchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32, { from: sender || account_a })

        let [account_a_erc20_balance,
            account_b_erc20_balance
        ] =
            await Promise.all([
                erc20.balanceOf(account_a),
                erc20.balanceOf(account_b)
            ])
        console.log("erc721_for_erc20_bundle_test account_a_erc20_balance=" + account_a_erc20_balance)
        assert.equal(account_a_erc20_balance.toNumber(), account_a_initial_erc20_balance.toNumber() + remainBuyingPrice, 'Incorrect ERC20 balance')

        if (hasFee) {
            let relayer_erc20_balance = await erc20.balanceOf(relayerFeeAddress);
            assert.equal(relayer_erc20_balance.toNumber(), relayer_initial_erc20_balance.toNumber() + relayerFee)
        }
        if (hasRoyaltyFee) {
            let royalty_erc20_balance = await erc20.balanceOf(royaltyFeeAddress);
            assert.equal(royalty_erc20_balance.toNumber(), royalty_initial_erc20_balance.toNumber() + royaltyFee)
        }
        let [token_owner] = await Promise.all([erc721.ownerOf(tokenId)])
        assert.equal(token_owner, account_b, 'Incorrect token owner')
        for (var i = 0; i < otherTokenIds.length; i++) {
            let token_owner = await erc721.ownerOf(otherTokenIds[i])
            console.log("token owner=", token_owner)
            assert.equal(token_owner, account_b, 'Incorrect token owner')
        }
    }

    it('StaticMarket: both fees: bundle: matches erc721 <> erc20 order', async () => {
        const price = 150
        const timestamp = Date.parse(new Date());

        return erc721_for_erc20_bundle_test({
            tokenId: timestamp,
            sellingPrice: price,
            buyingPrice: price,
            erc20MintAmount: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: true,
            hasRoyaltyFee: true,
            otherTokenIds: [timestamp + 1]
        })
    })

    it('StaticMarket: royalty fee: bundle: matches erc721 <> erc20 order', async () => {
        const price = 150
        const timestamp = Date.parse(new Date());

        return erc721_for_erc20_bundle_test({
            tokenId: timestamp,
            sellingPrice: price,
            buyingPrice: price,
            erc20MintAmount: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: false,
            hasRoyaltyFee: true,
            otherTokenIds: [timestamp + 1]
        })
    })

    it('StaticMarket: no fee: bundle: matches erc721 <> erc20 order', async () => {
        const price = 150
        const timestamp = Date.parse(new Date());

        return erc721_for_erc20_bundle_test({
            tokenId: timestamp,
            sellingPrice: price,
            buyingPrice: price,
            erc20MintAmount: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: false,
            hasRoyaltyFee: false,
            otherTokenIds: [timestamp + 1]
        })
    })
})
