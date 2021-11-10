/* global artifacts:false */

const WyvernAtomicizer = artifacts.require('./WyvernAtomicizer.sol')
const WyvernStatic = artifacts.require('./WyvernStatic.sol')
const StaticMarket = artifacts.require('./StaticMarket.sol')
const StaticMarketBundle = artifacts.require('./StaticMarketBundle.sol')
const StaticMarketBundleForERC1155 = artifacts.require('./StaticMarketBundleForERC1155')
const StaticMarketPlatform = artifacts.require('./StaticMarketPlatform')
const TestERC20 = artifacts.require('./TestERC20.sol')
const TestERC721 = artifacts.require('./TestERC721.sol')
const TestERC1271 = artifacts.require('./TestERC1271.sol')
const TestERC1155 = artifacts.require('./TestERC1155.sol')
const TestAuthenticatedProxy = artifacts.require('./TestAuthenticatedProxy.sol')
const TransferPlatformToken = artifacts.require('./TransferPlatformToken')

const { setConfig } = require('./config.js')

module.exports = async (deployer, network) => {
  await deployer.deploy(WyvernAtomicizer)
  await deployer.deploy(WyvernStatic, WyvernAtomicizer.address)
  await deployer.deploy(StaticMarket)
  await deployer.deploy(StaticMarketBundle)
  await deployer.deploy(StaticMarketBundleForERC1155)
  await deployer.deploy(StaticMarketPlatform)
  await deployer.deploy(TransferPlatformToken)

  if (network !== 'development'){
    setConfig('deployed.' + network + '.WyvernAtomicizer', WyvernAtomicizer.address)
    setConfig('deployed.' + network + '.WyvernStatic', WyvernStatic.address)
    setConfig('deployed.' + network + '.StaticMarket', StaticMarket.address)
    setConfig('deployed.' + network + '.StaticMarketBundle', StaticMarketBundle.address)
    setConfig('deployed.' + network + '.StaticMarketBundleForERC1155', StaticMarketBundleForERC1155.address)
    setConfig('deployed.' + network + '.StaticMarketPlatform', StaticMarketPlatform.address)
    setConfig('deployed.' + network + '.TransferPlatformToken', TransferPlatformToken.address)
  }
  console.log("2_misc, network==========================" + network)
  if (network !== 'coverage' && network !== 'development' && network !== 'rinkeby' && network !== 'bsctest')
    return

  await deployer.deploy(TestERC20)
  await deployer.deploy(TestERC721)
  await deployer.deploy(TestAuthenticatedProxy)
  await deployer.deploy(TestERC1271)
  await deployer.deploy(TestERC1155)

  if (network !== 'development') {
    setConfig('deployed.' + network + '.TestERC20', TestERC20.address)
    setConfig('deployed.' + network + '.TestERC721', TestERC721.address)
    setConfig('deployed.' + network + '.TestAuthenticatedProxy', TestAuthenticatedProxy.address)
    setConfig('deployed.' + network + '.TestERC1271', TestERC1271.address)
    setConfig('deployed.' + network + '.TestERC1155', TestERC1155.address)
  }
}

