const Web3 = require('web3')
const provider_url = 'http://localhost:8545'
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
    // { name: 'feeRecipient', type: 'address' },
    // { name: 'royaltyFeeRecipient', type: 'address' },
    { name: 'staticSelector', type: 'bytes4' },
    { name: 'staticExtradata', type: 'bytes' },
    { name: 'maximumFill', type: 'uint256' },
    { name: 'listingTime', type: 'uint256' },
    { name: 'expirationTime', type: 'uint256' },
    { name: 'salt', type: 'uint256' }
    // { name: 'relayerFee', type: 'uint256' },
    // { name: 'royaltyFee', type: 'uint256' }
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
const TEST_NETWORK = "development"
const NETWORK_INFO = {
  "bsctest": {
    "url": "https://data-seed-prebsc-2-s1.binance.org:8545",
    "chainId": 97,
    "contract": {
        "migrations": "0x09A825aAFa1aF58b19f8995dA4D973d6857BF42a",
        "wyvernAtomicizer": "0x024E9606204206Be16504bc13D7387C2b1D47f2B",
        "wyvernStatic": "0xfF9403351360420638d6deCfd998dc4d1ebF1e24",
        "staticMarket": "0xD14d3EE2D3d66b76b1711733Ec3C06559850485E",
        "testERC20": "0x6DA29C460cB0Ac1fdD7a6cA8b15eE2A8142045a9",
        "testERC721": "0xd451A411c67ba299ac72F6658bC894406C706B0A",
        "testAuthenticatedProxy": "0x518b85D73f2fc1c2AE62d22dDA080aee2D7A3907",
        "testERC1271": "0x2027F151EC981493a50aC518E391FC8E09DA570a",
        "testERC1155": "0xD9235a6AE54e0B9c2F79fE450d62a9130518621D",
        "wyvernRegistry": "0x6291dD9d1bd4e7BF2b6339E9196ffc85FFd0b8fc",
        "wyvernExchange": "0x5E8d0F88929d599Cf8A026319e8Ba352dBAcD7B8",
        "staticMarketBundle": "0xFB982AB50Ee53Fa18268B688860640cBD7412f37",
        "staticMarketPlatform": "0xFdAeE372b607781057504Fc70D100263797C6e4f",
        "transferPlatformToken": "0xBd9F76A0bD557a8503032a619eE1D34253bF4b27"
    }
  },
  "rinkeby": {
    "url": "https://rinkeby.infura.io/v3/55e6b251278e427f92f04f1e65d5610e",
    "chainId": 4,
    "contract": {
        "migrations": "0x71b11005f2Bb0D9d56BC8d5F4f9c436F70f733eE",
        "wyvernAtomicizer": "0x3897279d7e6eE5658Ee4E44288D5eab786321d84",
        "wyvernRegistry": "0x7Ec4305b350103a78287b78c2CF730d3ae07846a",
        "wyvernExchange": "0xd35D65323aaE7A886486b804bb5c2652cf307586",
        "wyvernStatic": "0x03127Ac868aD6058752C7cE4d3aFdC3275F67376",
        "testERC20": "0x84745D0DB5a09bfb4C9C3e765ddC3BAA1bC5838a",
        "testERC721": "0xfB394fb2c8e32bf7d2A7398c8aa39830c1A4D640",
        "staticMarket": "0xCaea1cb172B47408ab6B870Eb8e1e5d3633Ee592",
        "testAuthenticatedProxy": "0x0b52533F5EB6f08627359d63A7b80BCf90E9AE07",
        "testERC1271": "0xe9b8A4D4f2dEa4B9D3d6e2FF19e7ce7B4E298929",
        "testERC1155": "0x5CBaaEe5E5536c8b128afbDBF140BfBACa1dD469"
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