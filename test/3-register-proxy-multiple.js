/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const StaticMarketBundle = artifacts.require('StaticMarketBundle')
const WyvernRegistry = artifacts.require('WyvernRegistry')

const Web3 = require('web3')

const { wrap, TEST_NETWORK, NETWORK_INFO, ZERO_ADDRESS} = require('./aux-win')
const provider = new Web3.providers.HttpProvider(NETWORK_INFO[TEST_NETWORK].url)
const web3 = new Web3(provider)

contract('ProxyRegister', (accounts) => {

    const CHAIN_ID = NETWORK_INFO[TEST_NETWORK].chainId
    let contractInfo = NETWORK_INFO[TEST_NETWORK].contract

    let deploy_contracts = async () => {
        let exchange, registry
        if (TEST_NETWORK == "development") {
            [registry] = await Promise.all([WyvernRegistry.new()]);
            [exchange] = await Promise.all([WyvernExchange.new(CHAIN_ID, [registry.address], '0x')]);
        } else {
            [exchange, registry] = [
                new WyvernExchange(contractInfo.wyvernExchange),
                new WyvernRegistry(contractInfo.wyvernRegistry)
            ]
        }

        var granted = await registry.initialAddressSet();
        console.log("deploy_contracts exchange.address granted=" + granted)
        if (!granted) {
            await registry.grantInitialAuthentication(exchange.address)
        }

        return { registry}
    }

    const proxy_register_multiple_test = async (options) => {
        const {
            addresses
         } = options

        let { registry} = await deploy_contracts()

        let unregisterAddresses = []
        for (var i = 0; i < addresses.length; i++) {
            let proxy = await registry.proxies(addresses[i])
            if (proxy == ZERO_ADDRESS) {
                unregisterAddresses.push(addresses[i])
            }
        }

        assert.equal(true, unregisterAddresses.length > 0, "proxy_register_multiple_test all of the address registered")

        let proxies = await registry.registerProxyForMultiple(addresses)
        for (var i = 0; i < addresses.length; i++) {
            let proxy = await registry.proxies(addresses[i])
            assert.equal(true, proxy.length > 0 && proxy != ZERO_ADDRESS, 'proxy_register_multiple_test no proxy address for ' + addresses[i])
        }
    }

    it('ProxyRegister: register proxy for multiple users', async () => {
        return proxy_register_multiple_test({
            addresses: [accounts[1], accounts[2]]
        })
    })

})
