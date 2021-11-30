const Web3 = require('web3')
const provider_url = 'http://localhost:8546'
const provider = new Web3.providers.HttpProvider(provider_url)
// const provider = new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/55e6b251278e427f92f04f1e65d5610e")
// const provider = new Web3.providers.HttpProvider("https://data-seed-prebsc-2-s1.binance.org:8545")
var web3 = new Web3(provider)
const { eip712Domain, structHash, signHash } = require('./eip712.js')


// Truffle does not expose chai so it is impossible to add chai-as-promised.
// This is a simple replacement function.
// https://github.com/trufflesuite/truffle/issues/2090
const assertIsRejected = (promise,error_match,message) =>
  {
    let passed = false
    return promise
      .then(() =>
        {
        passed = true
        return assert.fail()
        })
      .catch(error =>
        {
        if (passed)
          return assert.fail(message || 'Expected promise to be rejected')
        if (error_match)
          {
          if (typeof error_match === 'string')
            return assert.equal(error_match,error.message,message);
          if (error_match instanceof RegExp)
            return error.message.match(error_match) || assert.fail(error.message,error_match.toString(),`'${error.message}' does not match ${error_match.toString()}: ${message}`);
          return assert.instanceOf(error,error_match,message);
          }
        })
  }

const increaseTime = seconds => {
  return new Promise(resolve =>
    web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_increaseTime',
    params: [seconds],
    id: 0
    }, resolve)
    )
  }

const eip712Order = {
  name: 'Order',
  fields: [
    { name: 'registry', type: 'address' },
    { name: 'maker', type: 'address' },
    { name: 'staticTarget', type: 'address' },
    { name: 'staticSelector', type: 'bytes4' },
    { name: 'staticExtradata', type: 'bytes' },
    { name: 'maximumFill', type: 'uint256' },
    { name: 'listingTime', type: 'uint256' },
    { name: 'expirationTime', type: 'uint256' },
    { name: 'salt', type: 'uint256' }
  ]
}

web3 = web3.extend({
  methods: [{
    name: 'signTypedData',
    call: 'eth_signTypedData',
    params: 2,
    inputFormatter: [web3.extend.formatters.inputAddressFormatter, null]
  }]
})

const hashOrder = (order) => {
  return '0x' + structHash(eip712Order.name, eip712Order.fields, order).toString('hex')
}

const structToSign = (order, exchange) => {
  return {
    name: eip712Order.name,
    fields: eip712Order.fields,
    domain: {
      name: 'Wyvern Exchange',
      version: '3.1',
      chainId: NETWORK_INFO[TEST_NETWORK].chainId,
      verifyingContract: exchange
    },
    data: order
  }
}

const hashToSign = (order, exchange) => {
  return '0x' + signHash(structToSign(order, exchange)).toString('hex')
}

const parseSig = (bytes) => {
  bytes = bytes.substr(2)
  const r = '0x' + bytes.slice(0, 64)
  const s = '0x' + bytes.slice(64, 128)
  const v = parseInt('0x' + bytes.slice(128, 130), 16)
  return {v, r, s}
}

const wrap = (inst) => {
  var obj = {
    inst: inst,
    hashOrder: (order) => inst.hashOrder_.call([order.registry, order.maker, order.staticTarget, order.feeRecipient, order.royaltyFeeRecipient], order.staticSelector, order.staticExtradata, [order.maximumFill, order.listingTime, order.expirationTime, order.salt, order.relayerFee, order.royaltyFee]),
    hashToSign: (order) => {
      return inst.hashOrder_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt).then(hash => {
        return inst.hashToSign_.call(hash)
      })
    },
    validateOrderParameters: (order) => inst.validateOrderParameters_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt),
    validateOrderAuthorization: (hash, maker, sig, misc) => inst.validateOrderAuthorization_.call(hash, maker, web3.eth.abi.encodeParameters(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''), misc),
    approveOrderHash: (hash) => inst.approveOrderHash_(hash),
    approveOrder: (order, inclusion, misc) => inst.approveOrder_(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt, inclusion, misc),
    setOrderFill: (order, fill) => inst.setOrderFill_(hashOrder(order), fill),
    atomicMatch: (order, sig, call, counterorder, countersig, countercall, metadata) => inst.atomicMatch_(
      [order.registry, order.maker, order.staticTarget, order.maximumFill, order.listingTime, order.expirationTime, order.salt, call.target,
        counterorder.registry, counterorder.maker, counterorder.staticTarget, counterorder.maximumFill, counterorder.listingTime, counterorder.expirationTime,
        counterorder.salt, countercall.target],
      [order.staticSelector, counterorder.staticSelector],
      order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
      [call.howToCall, countercall.howToCall],
      metadata,
      web3.eth.abi.encodeParameters(['bytes', 'bytes'], [
        web3.eth.abi.encodeParameters(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''),
        web3.eth.abi.encodeParameters(['uint8', 'bytes32', 'bytes32'], [countersig.v, countersig.r, countersig.s]) + (countersig.suffix || '')
      ])
    ),
    atomicMatchWith: (order, sig, call, counterorder, countersig, countercall, metadata, misc) => inst.atomicMatch_(
      [order.registry, order.maker, order.staticTarget, order.maximumFill, order.listingTime, order.expirationTime,
        order.salt, call.target, counterorder.registry, counterorder.maker, counterorder.staticTarget,
        counterorder.maximumFill, counterorder.listingTime, counterorder.expirationTime, counterorder.salt,
        countercall.target],
      [order.staticSelector, counterorder.staticSelector],
      order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
      [call.howToCall, countercall.howToCall],
      metadata,
      web3.eth.abi.encodeParameters(['bytes', 'bytes'], [
        web3.eth.abi.encodeParameters(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''),
        web3.eth.abi.encodeParameters(['uint8', 'bytes32', 'bytes32'], [countersig.v, countersig.r, countersig.s]) + (countersig.suffix || '')
      ]),
      misc
    )
  }
  obj.sign = (order, account) => {
    const str = structToSign(order, inst.address)
    return web3.signTypedData(account, {
      types: {
        EIP712Domain: eip712Domain.fields,
        Order: eip712Order.fields
      },
      domain: str.domain,
      primaryType: 'Order',
      message: order
    }).then(sigBytes => {
      const sig = parseSig(sigBytes)
      return sig
    })
  }
  obj.personalSign = (order, account) => {
    const calculatedHashToSign = hashToSign(order, inst.address)
    return web3.eth.sign(calculatedHashToSign, account).then(sigBytes => {
      let sig = parseSig(sigBytes)
      sig.v += 27
      sig.suffix = '03' // EthSign suffix like 0xProtocol
      return sig
    })
  }
  return obj
}

const randomUint = () => {
  return Math.floor(Math.random() * 1e10)
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
const NULL_SIG = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}
const CHAIN_ID = 50
const TEST_NETWORK = "bsctest"
const NETWORK_INFO = {
  "bsctest": {
    "url": "https://data-seed-prebsc-1-s2.binance.org:8545",
    "chainId": 97,
    "contract": {
        "wyvernAtomicizer": "0x98103D21AD2622A804c90F980554F0f76039A4eE",
        "wyvernStatic": "0x268efb48a16F87295ea8e0F68b1e0da737a34A7e",
        "staticMarket": "0x85Ed60924F8D2c06c14050ff5A142a1C7faD47D1",
        "testERC20": "0xE24EBaB53Bf99C5a6966E2AD2794FFac88Bcde71",
        "testERC721": "0x824DF9203f92E408fFF8FA2006Dbf641c0B67ED2",
        "testAuthenticatedProxy": "0x452A3B6c29C4ad2931df6E075F60A1D2C8697E8a",
        "testERC1271": "0x5Ff7363Ff2958bba5215E83215f3f1F7810Db572",
        "testERC1155": "0x030D1901a6a42D4Ba296d45f2a6D04727dF4134C",
        "wyvernRegistry": "0x1E7F73f0e1987276180C6b1Fa16Aac2869c0F675",
        "wyvernExchange": "0x5Ae99D608e2f9f7eB5d7c7d4edb0DC168923Ad61",
        "staticMarketBundle": "0xCcF5747Bc84f3d08e7e6B9c8Cf24dDf98697a1ea",
        "staticMarketPlatform": "0xCB122C7ca5e6Cd7509dad8E07ae4622651Dcc5Ee",
        "transferPlatformToken": "0xA49ED75bDd2388e3A187066d78323a39b75481ED",
        "staticMarketBundleForERC1155": "0xB88dadF78d9D351CA2367dE7DEB8539Fec106820",
        "staticMarketCollection": "0xA662055777033F59F7aac53bC780F177BA5752A4"
    }
  },
  "rinkeby": {
    "url": "https://rinkeby.infura.io/v3/55e6b251278e427f92f04f1e65d5610e",
    "chainId": 4,
    "contract": {
        "wyvernAtomicizer": "0xA58163e6F244764eBE5C0c5a8F79E96740AF5187",
        "wyvernRegistry": "0xF0d483Fb0f5B7558bC7C9bBD5dDAb15aCB3eDa85",
        "wyvernExchange": "0xd7Db7f1e41DE97B04437f813AB6CDa2792B953e0",
        "wyvernStatic": "0x5101776Ac732e8f659E4424F49D7fa2343D9B858",
        "testERC20": "0xfeF3aC2fcFAa59323c649bCB6062bE24c033ef7c",
        "testERC721": "0xf5edc10be4eF9a109b43eB46b3e6a78c42EAD91A",
        "staticMarket": "0xAf0e8e78C890ab2C8EFd40C2e567eb72Fec9162c",
        "testAuthenticatedProxy": "0x29aA14A281BF2FeA3927E70E7BCa00105C1083bd",
        "testERC1271": "0x6202269c9200ECA1909B61526E5f5fad15B38bBF",
        "testERC1155": "0x4c96a10DcAD2F40E0C7CB1902BD66e43876EAd8b",
        "staticMarketBundle": "0xf47F4c8987d8736D3EE3a217B7EccaE0A6d68077",
        "staticMarketBundleForERC1155": "0x07a3d12C1c9F24A52DC564012ffB860291F43149",
        "staticMarketPlatform": "0xA1F646754F53594bd489c97878dDe10ca8cFC89a",
        "staticMarketCollection": "0x4fED1CB8D01B51A2125F458cdd27e4f3Ad4a167F",
        "transferPlatformToken": "0xbfce772334B8088eBC14638872d7cbEd155F648c"
    }
  },
  "development": {
    "url": provider_url,
    "chainId": 50
  }
}

module.exports = {
  hashOrder,
  hashToSign,
  increaseTime,
  assertIsRejected,
  wrap,
  randomUint,
  ZERO_ADDRESS,
  ZERO_BYTES32,
  NULL_SIG,
  CHAIN_ID,
  TEST_NETWORK,
  NETWORK_INFO
}
