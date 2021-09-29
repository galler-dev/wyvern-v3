require('dotenv').config()

var HDWalletProvider = require('truffle-hdwallet-provider')
var KlaytnHDWalletProvider = require('truffle-hdwallet-provider-klaytn')
var Caver = require('caver-js')

console.log("truffle.js, rinkebyMnemonic=" + process.env.RINKEBY_MNEMONIC + ", infuraKey=" + process.env.INFURA_KEY)
var rinkebyMnemonic = JSON.parse(process.env.RINKEBY_MNEMONIC || '')
var mumbaiMnemonic = process.env.MUMBAI_MNEMONIC || ''
var mainnetMnemonic = process.env.MAINNET_MNEMONIC || ''
var klaytnPrivateKey = process.env.KLAYTN_PRIVATE_KEY || ''
var baobabPrivateKey = process.env.BAOBAB_PRIVATE_KEY || ''
var infuraKey = process.env.INFURA_KEY || '';

var kasAccessKeyId = process.env.KAS_ACCESS_KEY_ID || ''
var kasSecretAccessKey = process.env.KAS_SECRET_KEY || ''


module.exports = {
  mocha: {
    enableTimeouts: false
  },
  networks: {
    mainnet: {
      provider: function () {
        return new HDWalletProvider(mainnetMnemonic, 'https://mainnet.infura.io')
      },
      from: '',
      port: 8545,
      network_id: '1',
      gasPrice: 4310000000,
      confirmations: 2
    },
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 6700000
    },
    bsctest: {
      provider: function() {
        var url = 'https://data-seed-prebsc-2-s1.binance.org:8545'
        if (typeof rinkebyMnemonic == "object") {
          var length = rinkebyMnemonic.length
          return new HDWalletProvider(rinkebyMnemonic, url, 0, length)
        } else {
          return new HDWalletProvider(rinkebyMnemonic, url)
        }
      },
      timeoutBlocks: 200,
      from: '',
      network_id: '97',
      gasPrice: 10000000000,
      confirmations: 2,
      skipDryRun: true
    },
    coverage: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 0xfffffffffff,
      gasPrice: 0x01
    },
    rinkeby: {
      provider: function () {
        if (typeof rinkebyMnemonic == "object") {
          var length = rinkebyMnemonic.length
          return new HDWalletProvider(rinkebyMnemonic, 'https://rinkeby.infura.io/v3/' + infuraKey, 0, length)
        } else {
          return new HDWalletProvider(rinkebyMnemonic, 'https://rinkeby.infura.io/v3/' + infuraKey)
        }
      },
      from: '',
      port: 8545,
      network_id: '4',
      gas: 6700000,
      networkCheckTimeout: 100000,
      gasPrice: 1600000000,
      confirmations: 1
    },
    mumbai: {
      provider: function () {
        return new HDWalletProvider(mumbaiMnemonic, 'https://rpc-mumbai.matic.today')
      },
      from: '',
      network_id: '80001'
    },
    baobab: {
      provider: () => {
        const options = {
          headers: [
            { name: 'Authorization', value: 'Basic ' + Buffer.from(kasAccessKeyId + ':' + kasSecretAccessKey).toString('base64') },
            { name: 'x-chain-id', value: '1001' }
          ],
          keepAlive: false,
        }
        return new KlaytnHDWalletProvider(baobabPrivateKey, new Caver.providers.HttpProvider("https://node-api.klaytnapi.com/v1/klaytn", options))
      },
      from: '',
      network_id: '1001',
      networkCheckTimeout: 10000,
      gas: '8500000',
      gasPrice:'25000000000'
    },
    klaytn: {
      provider: () => {
        const options = {
          headers: [
            { name: 'Authorization', value: 'Basic ' + Buffer.from(kasAccessKeyId + ':' + kasSecretAccessKey).toString('base64') },
            { name: 'x-chain-id', value: '8217' }
          ],
          keepAlive: false,
        }
        return new KlaytnHDWalletProvider(klaytnPrivateKey, new Caver.providers.HttpProvider("https://node-api.klaytnapi.com/v1/klaytn", options))
      },
      from: '',
      network_id: '8217',
      networkCheckTimeout: 10000,
      gas: '8500000',
      gasPrice:'25000000000'
    }
  },
  compilers: {
    solc: {
      version: '0.7.5',
      settings: {
        optimizer: {
          enabled: true,
          runs: 750
        }
      }
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    etherscan: "FR65GGV173VTD9WHMK89N7VSJDJGQJA1QQ",
    bscscan: "HHHQV1FM9HVSK82JMPEEBG44PR24CM3B5U"
  }
}
