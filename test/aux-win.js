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
const TEST_NETWORK = "rinkeby"
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
        "migrations": "0x7953A9D98436544F36B1aFcd0Da56302DD340B2a",
        "wyvernAtomicizer": "0xC3ebE53769282C6502baBd7C376Dab45544e4544",
        "wyvernRegistry": "0xfdc73058A55934071572EefF9dD7448Ef14987BA",
        "wyvernExchange": "0x07C0b3a3F1d5794dedB4D37AE307fd30BD5b57E2",
        "wyvernStatic": "0x754A63120F771D90C749FA0659F5E78A8DA3E562",
        "testERC20": "0xF7f3943ac6DCd0b784F550E968C71d9cB6336aFF",
        "testERC721": "0x88ea10AfD23146C2eaeE62628580b45C5Eaf908D",
        "staticMarket": "0xddfdC45EaFF94e8363F00ff527223787A19a0b66",
        "testAuthenticatedProxy": "0xB4767Cb5d92812572F6A9222B5E8eF245d55380F",
        "testERC1271": "0x41b72823f444Aed20608913a65B1d8540c53fE20",
        "testERC1155": "0xa79039d3562a8A10d788aC3318683827e1B8b47e"
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
