const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
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
    { name: 'feeRecipient', type: 'address' },
    { name: 'royaltyFeeRecipient', type: 'address' },
    { name: 'staticSelector', type: 'bytes4' },
    { name: 'staticExtradata', type: 'bytes' },
    { name: 'maximumFill', type: 'uint256' },
    { name: 'listingTime', type: 'uint256' },
    { name: 'expirationTime', type: 'uint256' },
    { name: 'salt', type: 'uint256' },
    { name: 'relayerFee', type: 'uint256' },
    { name: 'royaltyFee', type: 'uint256' }
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
        counterorder.salt, countercall.target, order.feeRecipient, order.royaltyFeeRecipient, counterorder.feeRecipient, counterorder.royaltyFeeRecipient,
        order.relayerFee, order.royaltyFee, counterorder.relayerFee, counterorder.royaltyFee],
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
        countercall.target, order.feeRecipient, order.royaltyFeeRecipient, counterorder.feeRecipient,
        counterorder.royaltyFeeRecipient, order.relayerFee, order.royaltyFee, counterorder.relayerFee,
        counterorder.royaltyFee],
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
    "url": "https://data-seed-prebsc-2-s1.binance.org:8545",
    "chainId": 97,
    "contract": {
        "wyvernAtomicizer": "0x0942bD343682beE0805Ed45B6F4a2530FBF54E16",
        "wyvernStatic": "0xefCb8a40a3F759D3DFb3a6dBB7094951902383cd",
        "staticMarket": "0xfe4De92EC360b04fc5450617eE0ba4F7F2e3Fd37",
        "testERC20": "0xD1BA58cb97791b0Fc97E7Edec63d6f2D27593D7b",
        "testERC721": "0x0a7F39B09a5882333D2f3A62e01A15780980DE54",
        "testAuthenticatedProxy": "0x170d77f62605FBa1F2ba77FF535b663b52d3cbC9",
        "testERC1271": "0x8849D62bFb15b1a0670e2F917f34c785e44C4106",
        "testERC1155": "0x27c8Ca19EdCd9DbBB281b5c1E11761E3C9e797ff",
        "wyvernRegistry": "0xA154aA2f68e7DbCd4EfE7010CE6401Bc1580Fa3b",
        "wyvernExchange": "0x175124456365c11BF6a8bA25F65a427bE169B65a"
    }
  },
  "rinkeby": {
    "url": "https://rinkeby.infura.io/v3/55e6b251278e427f92f04f1e65d5610e",
    "chainId": 4,
    "contract": {
        "migrations": "0xb79A0251166f3037e90760Cad32778A5D46e4044",
        "wyvernAtomicizer": "0xeFA3A9A582346E382692c8D54634f0771bdB5fF3",
        "wyvernRegistry": "0xA9b6B94946912E4CC0D981962d960eF257dd4327",
        "wyvernExchange": "0x754ae3541e6c82371804710568b00C8c0243864c",
        "wyvernStatic": "0x26a41c3Daf11947BdEB42D8651Bac0B6d5914204",
        "testERC20": "0x56a5f8E350BdfB022290C71F8F18daBa60e62646",
        "testERC721": "0x91409B44BcCC0B3fbBF49fb16bF4b3f571b8bF06",
        "staticMarket": "0xaDd93a4893A92fAeA5063b1f1BaabC90fC72D506",
        "testAuthenticatedProxy": "0xB930d425Dd4Caf3826A3532Dc45B8396e2Aed521",
        "testERC1271": "0xBdCdD96E4f4118D5F5660B9943903783541Eb548",
        "testERC1155": "0x6DAf046F507Ce758854f8Cf542c367Bedcc076eb"
    }
  },
  "development": {
    "url": "http://localhost:8545",
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
