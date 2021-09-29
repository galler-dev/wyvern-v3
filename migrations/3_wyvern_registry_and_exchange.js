/* global artifacts:false */

const WyvernRegistry = artifacts.require('./WyvernRegistry.sol')
const WyvernExchange = artifacts.require('./WyvernExchange.sol')
const { setConfig } = require('./config.js')

const chainIds = {
  development: 50,
  coverage: 50,
  rinkeby: 4,
  mumbai: 80001,
  main: 1,
  bsctest: 97
}

const personalSignPrefixes = {
  default: "\x19Ethereum Signed Message:\n",
  klaytn: "\x19Klaytn Signed Message:\n",
  baobab: "\x19Klaytn Signed Message:\n"
}

module.exports = async (deployer, network) => {
  const personalSignPrefix = personalSignPrefixes[network] || personalSignPrefixes['default']
  await deployer.deploy(WyvernRegistry)
  await deployer.deploy(WyvernExchange, chainIds[network], [WyvernRegistry.address, '0x9219F446eEBE0336BB2ca909342FdA6d3cD8F70c'], Buffer.from(personalSignPrefix,'binary'))
  if (network !== 'development') {
    setConfig('deployed.' + network + '.WyvernRegistry', WyvernRegistry.address)
    setConfig('deployed.' + network + '.WyvernExchange', WyvernExchange.address)
  }
  console.log("3_wyvern_registry_and_exchange, network==========================" + network)
  const registry = await WyvernRegistry.deployed()
  await registry.grantInitialAuthentication(WyvernExchange.address)
}
