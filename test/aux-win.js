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
const TEST_NETWORK = "development"
const NETWORK_INFO = {
  "bsctest": {
    "url": "https://data-seed-prebsc-1-s2.binance.org:8545",
    "chainId": 97,
    "contract": {
        "wyvernAtomicizer": "0x0409C8181152C3a0AcFE51D69b9D02E7dbf8C8b8",
        "wyvernStatic": "0x13a4244d362e9a787b06Bbf44dEE872B3587e717",
        "staticMarket": "0xA2F0FF9051EF97B80B3Bd2a8c3C782245CE0BC15",
        "testERC20": "0x9A0a5405CC3F236aD2689Cf4fe9999112C5eE2f4",
        "testERC721": "0xBD336b60d1FdB4Df5a305972be6048a97Ee8fFa4",
        "testAuthenticatedProxy": "0xa32D83F6eF9278B48d354d1486CeFE480374FE48",
        "testERC1271": "0x3d0D289C067AFE139ce81A56929d107888690d54",
        "testERC1155": "0xe577E35eeDAcA48837fd377AaB9BF0D8A3De76A3",
        "wyvernRegistry": "0x430bd1bf4fAB42178C61a4B7DE600509B7bFBAe7",
        "wyvernExchange": "0xD531f294Af631f60B9aEB76bB0f331d5cdC00294",
        "staticMarketBundle": "0x707533c949c4b3cE9a50726ADea4C5959e1d297e",
        "staticMarketPlatform": "0x07042bb8E49eF7e5451c9C43E4a1a3BE2A8A9d09",
        "transferPlatformToken": "0x2999F3a089923116Fa07fcC7d2Bfb36D489ec9E5",
        "staticMarketBundleForERC1155": "0x3d5838fb1fF5d7bD9f5BDDb0FBBadaEcadaBe595"
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
