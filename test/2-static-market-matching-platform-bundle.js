/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const StaticMarketBundle = artifacts.require('StaticMarketBundle')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const TestERC721 = artifacts.require('TestERC721')
const TestERC1155 = artifacts.require('TestERC1155')
const TransferPlatformToken = artifacts.require('TransferPlatformToken')

const Web3 = require('web3')

const { atomicierAbi, transferPlatformTokenAbi } = require('./test-abis')
const { buildParamsForETHAndBundle, buildSencodDataForETHAndBundle, buildBundleData, relayerFeeAddress, royaltyFeeAddress} = require('./test-utils')
const { wrap, ZERO_ADDRESS, ZERO_BYTES32, TEST_NETWORK, NETWORK_INFO, assertIsRejected, randomUint } = require('./aux-win')
const provider = new Web3.providers.HttpProvider(NETWORK_INFO[TEST_NETWORK].url)
const web3 = new Web3(provider)

contract('WyvernExchange', (accounts) => {

    let deploy = async contracts => Promise.all(contracts.map(contract => contract.new()))
    const CHAIN_ID = NETWORK_INFO[TEST_NETWORK].chainId
    let contractInfo = NETWORK_INFO[TEST_NETWORK].contract

    let deploy_contracts = async () => {
        let exchange, statici, registry, atomicizer, erc1155, erc721, transferPlatformToken
        if (TEST_NETWORK == "development") {
            [registry, atomicizer, transferPlatformToken] = await Promise.all([WyvernRegistry.new(), WyvernAtomicizer.new(), TransferPlatformToken.new()]);
            [exchange, statici] = await Promise.all([WyvernExchange.new(CHAIN_ID, [registry.address], '0x'), StaticMarketBundle.new(atomicizer.address)]);
            [erc1155, erc721] = await deploy([TestERC1155, TestERC721])
        } else {
            [exchange, statici, registry, atomicizer, erc1155, erc721, transferPlatformToken] = [
                new WyvernExchange(contractInfo.wyvernExchange),
                new StaticMarketBundle(contractInfo.staticMarketBundle),
                new WyvernRegistry(contractInfo.wyvernRegistry),
                new WyvernAtomicizer(contractInfo.wyvernAtomicizer),
                new TestERC1155(contractInfo.testERC1155),
                new TestERC721(contractInfo.testERC721),
                new TransferPlatformToken(contractInfo.transferPlatformToken)
            ]
        }

        var granted = await registry.initialAddressSet();
        console.log("deploy_contracts exchange.address granted=" + granted)
        if (!granted) {
            await registry.grantInitialAuthentication(exchange.address)
        }

        return { registry, exchange: wrap(exchange), atomicizer, statici, erc1155, erc721, transferPlatformToken }
    }

    const erc721_for_platform_token_bundle_test = async (options) => {
        const {
            tokenId,
            buyTokenId,
            sellingPrice,
            buyingPrice,
            account_a,
            account_b,
            sender,
            hasFee,
            hasRoyaltyFee,
            otherTokenIds
         } = options

        let { exchange, registry, atomicizer, statici, erc1155, erc721, transferPlatformToken } = await deploy_contracts()
        console.log("erc721_for_platform_token_bundle_test erc721=" + erc721 + ", tokenId=" + tokenId + ", transferPlatformToken=" + transferPlatformToken)
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
        console.log("erc721_for_platform_token_bundle_test account_a=" + account_a + " balance=" + account_a_initial_eth_balance)
        console.log("erc721_for_platform_token_bundle_test account_b=" + account_b + " balance=" + account_b_initial_eth_balance)

        let proxy1 = await registry.proxies(account_a);
        if (proxy1 == ZERO_ADDRESS) {
            await registry.registerProxy({ from: account_a })
            proxy1 = await registry.proxies(account_a)
        }
        assert.equal(true, proxy1.length > 0, 'erc721_for_platform_token_bundle_test no proxy address for account a')

        let proxy2 = await registry.proxies(account_b)
        if (proxy2 == ZERO_ADDRESS) {
            await registry.registerProxy({ from: account_b })
            proxy2 = await registry.proxies(account_b)
        }
        assert.equal(true, proxy2.length > 0, 'erc721_for_platform_token_bundle_test no proxy address for account b')

        var isApprovedForAll = await erc721.isApprovedForAll(account_a, proxy1)
        console.log("erc721_for_platform_token_bundle_test isApprovedForAll=" + isApprovedForAll + ", proxy1=" + proxy1)
        if (!isApprovedForAll) {
            erc721.setApprovalForAll(proxy1, true, { from: account_a })
        }

        if (buyTokenId) {
            await erc721.mint(account_a, buyTokenId)
        }
        await erc721.mint(account_a, tokenId)
        for (var i = 0; i < otherTokenIds.length; i++) {
            await erc721.mint(account_a, otherTokenIds[i])
        }

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
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC721BundleForETHWithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC721BundleWithTwoFees(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else if (hasFee || hasRoyaltyFee) {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC721BundleForETHWithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC721BundleWithOneFee(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        } else {
            selectorOne = web3.eth.abi.encodeFunctionSignature('ERC721BundleForETH(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            selectorTwo = web3.eth.abi.encodeFunctionSignature('ETHForERC721Bundle(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        }

        let remainSellingPrice = sellingPrice - relayerFee - royaltyFee
        let addressesOne = [erc721.address]

        let tokenIdsOne = [tokenId]
        tokenIdsOne.push(...otherTokenIds)
        tokenIdsOne.push(remainSellingPrice)
        let tokenIdsAndAmountOne = tokenIdsOne
        let paramsOne = buildParamsForETHAndBundle(addressesOne, tokenIdsAndAmountOne, relayerFee, royaltyFee, hasFee, hasRoyaltyFee, false)

        let addressesTwo = [erc721.address]
        let remainBuyingPrice = buyingPrice - relayerFee - royaltyFee
        let tokenIdsTwo = [buyTokenId || tokenId]
        tokenIdsTwo.push(...otherTokenIds)
        tokenIdsTwo.push(remainBuyingPrice)
        let tokenIdAndAmountTwo = tokenIdsTwo
        let paramsTwo = buildParamsForETHAndBundle(addressesTwo, tokenIdAndAmountTwo, relayerFee, royaltyFee, hasFee, hasRoyaltyFee, false)

        const one = { registry: registry.address, maker: account_a, staticTarget: statici.address, feeRecipient: relayerFeeAddress, royaltyFeeRecipient: royaltyFeeAddress, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: 1, listingTime: '0', expirationTime: '10000000000', salt: '11', relayerFee: relayerFee, royaltyFee: royaltyFee }
        const two = { registry: registry.address, maker: account_b, staticTarget: statici.address, feeRecipient: relayerFeeAddress, royaltyFeeRecipient: royaltyFeeAddress, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: buyingPrice, listingTime: '0', expirationTime: '10000000000', salt: '12', relayerFee: relayerFee, royaltyFee: royaltyFee }

        let dataList = [erc721c.methods.transferFrom(account_a, account_b, tokenId).encodeABI()]
        for (var i = 0; i < otherTokenIds.length; i++) {
            dataList.push(erc721c.methods.transferFrom(account_a, account_b, otherTokenIds[i]).encodeABI())
        }
        const firstData = buildBundleData(atomicizerc, dataList, erc721)
        // const firstData = erc721c.methods.transferFrom(account_a, account_b, tokenId).encodeABI()
        // const firstData = buildFirstDataForETHAndBundle(atomicizerc, dataList)

        let transferAddresses = [account_a]
        let transferAmounts = [remainBuyingPrice]
        let secondData = buildSencodDataForETHAndBundle(atomicizerc, transferAddresses, transferAmounts, transferPlatformToken,
            transferPlatformTokenc, relayerFee, royaltyFee, hasFee, hasRoyaltyFee)

        const firstCall = { target: atomicizer.address, howToCall: 1, data: firstData }
        const secondCall = { target: atomicizer.address, howToCall: 1, data: secondData }

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

        console.log("erc721_for_platform_token_bundle_test after atomic, account_a=" + account_a + " balance=" + account_a_eth_balance)
        console.log("erc721_for_platform_token_bundle_test after atomic, account_b=" + account_b + " balance=" + account_b_eth_balance)
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

    it('StaticMarketPlatform: two fees: bundle: matches erc721 <> platform token order', async () => {
        const price = 150000000
        const timestamp = Date.parse(new Date());

        return erc721_for_platform_token_bundle_test({
            tokenId: timestamp,
            sellingPrice: price,
            buyingPrice: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: true,
            hasRoyaltyFee: true,
            otherTokenIds: [timestamp + 1]
        })
    })

    it('StaticMarketPlatform: one fee: bundle: matches erc721 <> platform token order', async () => {
        const price = 150000000
        const timestamp = Date.parse(new Date());

        return erc721_for_platform_token_bundle_test({
            tokenId: timestamp,
            sellingPrice: price,
            buyingPrice: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: true,
            hasRoyaltyFee: false,
            otherTokenIds: [timestamp + 1]
        })
    })

    it('StaticMarketPlatform: one fee: bundle: matches erc721 <> platform token order', async () => {
        const price = 150000000
        const timestamp = Date.parse(new Date());

        return erc721_for_platform_token_bundle_test({
            tokenId: timestamp,
            sellingPrice: price,
            buyingPrice: price,
            account_a: accounts[1],
            account_b: accounts[2],
            sender: accounts[1],
            hasFee: false,
            hasRoyaltyFee: false,
            otherTokenIds: [timestamp + 1]
        })
    })
})
