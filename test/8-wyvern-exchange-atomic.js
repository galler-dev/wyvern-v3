/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernStatic = artifacts.require('WyvernStatic')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const TestERC20 = artifacts.require('TestERC20')
const TestERC721 = artifacts.require('TestERC721')
const TestERC1271 = artifacts.require('TestERC1271')

const Web3 = require('web3')
// const provider = new Web3.providers.HttpProvider('http://localhost:8545')
// const provider = new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/55e6b251278e427f92f04f1e65d5610e")
// const provider = new Web3.providers.HttpProvider("https://data-seed-prebsc-2-s1.binance.org:8545")

const { wrap,hashOrder,ZERO_BYTES32,randomUint,NULL_SIG,assertIsRejected,TEST_NETWORK,NETWORK_INFO} = require('./aux-win')
console.log("NETWORK_INFO=" + NETWORK_INFO + ", TEST_NETWORK=" + TEST_NETWORK + ", url=" + NETWORK_INFO[TEST_NETWORK].url)
const provider = new Web3.providers.HttpProvider(NETWORK_INFO[TEST_NETWORK].url)
const web3 = new Web3(provider)

contract('WyvernExchange', (accounts) => {
  const deploy = async contracts => Promise.all(contracts.map(contract => contract.deployed()))

  console.log("contractInfo=" + NETWORK_INFO[TEST_NETWORK].contract)
  const contractInfo = NETWORK_INFO[TEST_NETWORK].contract

  const withContracts = async () =>
    {
      let exchange,statici,registry,atomicizer,erc20,erc721,erc1271
      if (TEST_NETWORK == "development") {
        [exchange,statici,registry,atomicizer,erc20,erc721,erc1271] = await deploy(
          [WyvernExchange,WyvernStatic,WyvernRegistry,WyvernAtomicizer,TestERC20,TestERC721,TestERC1271])
        console.log("exchange=" + exchange)
      } else {
        [exchange,statici,registry,atomicizer,erc20,erc721,erc1271] = [
          new WyvernExchange(contractInfo.wyvernExchange),
          new WyvernStatic(contractInfo.wyvernStatic),
          new WyvernRegistry(contractInfo.wyvernRegistry),
          new WyvernAtomicizer(contractInfo.wyvernAtomicizer),
          new TestERC20(contractInfo.testERC20),
          new TestERC721(contractInfo.testERC721),
          new TestERC1271(contractInfo.testERC1271)
        ]
      }
    // let [exchange,statici,registry,atomicizer,erc20,erc721,erc1271] = await deploy(
    //   [WyvernExchange,WyvernStatic,WyvernRegistry,WyvernAtomicizer,TestERC20,TestERC721,TestERC1271])
      // let [exchange,statici,registry,atomicizer,erc20,erc721,erc1271] = [
      //   new WyvernExchange("0x754ae3541e6c82371804710568b00C8c0243864c"),
      //   new WyvernStatic("0x26a41c3Daf11947BdEB42D8651Bac0B6d5914204"),
      //   new WyvernRegistry("0xA9b6B94946912E4CC0D981962d960eF257dd4327"),
      //   new WyvernAtomicizer("0xeFA3A9A582346E382692c8D54634f0771bdB5fF3"),
      //   new TestERC20("0x56a5f8E350BdfB022290C71F8F18daBa60e62646"),
      //   new TestERC721("0x91409B44BcCC0B3fbBF49fb16bF4b3f571b8bF06"),
      //   new TestERC1271("0xBdCdD96E4f4118D5F5660B9943903783541Eb548")
      // ]
    console.log("exchange=" + exchange.address + ", statici=" + statici.address + ", registry=" + registry.address +
     ",atomicizer=" + atomicizer.address + ", erc20=" + erc20.address + ", erc721=" + erc721.address + ", erc1271=" + erc1271.address)
    return {exchange:wrap(exchange),statici,registry,atomicizer,erc20,erc721,erc1271}
    }

  it("erc721 <> erc20 with checks", async () => {
    const seller = accounts[4];
    const buyer = accounts[1];
    const fee1Receiptor = accounts[2];
    const fee2Receiptor = accounts[3];
    var transferFeeToUniqueReceiptor = true;

    console.log("seller=" + seller + ", buyer=" + buyer + ", fee1Receiptor=" + fee1Receiptor + ", fee2Receiptor=" + fee2Receiptor)
    // const { atomicizer, exchange, registry, statici } =
    //   await deployCoreContracts();
    let {atomicizer, exchange, registry, statici, erc20, erc721} = await withContracts()
    // const [erc20, erc721] = await deploy([TestERC20, TestERC721]);

    const [
      sellerInitialErc20Balance,
      fee1ReceiptorInitialErc20Balance,
      fee2ReceiptorInitialErc20Balance,
    ] = await Promise.all([
      erc20.balanceOf(seller),
      erc20.balanceOf(fee1Receiptor),
      erc20.balanceOf(fee2Receiptor),
    ]);

    const abi = [
      {
        constant: false,
        inputs: [
          { name: "addrs", type: "address[]" },
          { name: "values", type: "uint256[]" },
          { name: "calldataLengths", type: "uint256[]" },
          { name: "calldatas", type: "bytes" },
        ],
        name: "atomicize",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
    const atomicizerc = new web3.eth.Contract(abi, atomicizer.address);

    console.log("registry=" + registry.address + ", seller=" + seller + ", buyer=" + buyer)
    var sellerProxy = await registry.proxies(seller);
    console.log("8 sellerProxy=" + sellerProxy)
    const sellerProxyLength = sellerProxy.length;
    if (sellerProxyLength == 0 || sellerProxy == '0x0000000000000000000000000000000000000000') {
      await registry.registerProxy({ from: seller });
      assert.equal(true, sellerProxy.length > 0, "No proxy address for Seller");
      sellerProxy = await registry.proxies(seller);
    }

    var buyerProxy = await registry.proxies(buyer);
    console.log("8 buyerProxy=" + buyerProxy)
    const buyerProxyLength = buyerProxy.length;
    if (buyerProxyLength == 0 || buyerProxy == '0x0000000000000000000000000000000000000000') {
      await registry.registerProxy({ from: buyer });
      assert.equal(true, buyerProxy.length > 0, "No proxy address for Buyer");
      buyerProxy = await registry.proxies(buyer);
    }

    const amount = 20;
    const fee1 = 1;
    const fee2 = 2;
    var timestamp = Date.parse(new Date());
    const tokenId = timestamp; // 1632746390000;

    // await Promise.all([
    //   erc20.mint(buyer, amount + fee1 + fee2),
    //   erc721.mint(seller, tokenId),
    // ]);
    await erc20.mint(buyer, amount + fee1 + fee2)
    await erc721.mint(seller, tokenId)

    // beforeEach(async function() {
      var totalAmount = amount + fee1 + fee2;
      var allowance = await erc20.allowance(buyer, buyerProxy)
      console.log("8 totalAmount=" + totalAmount + ", allowance=" + allowance)
      if (allowance == 0) {
        await erc20.approve(buyerProxy, totalAmount, { from: buyer })
      } else if (totalAmount > allowance) {
        await erc20.approve(buyerProxy, 0, { from: buyer })
        await erc20.approve(buyerProxy, totalAmount, { from: buyer })
      }

      var isApprovedForAll = await erc721.isApprovedForAll(seller, sellerProxy)
      console.log("8 isApprovedForAll=" + isApprovedForAll)
      if (!isApprovedForAll) {
        await erc721.setApprovalForAll(sellerProxy, true, { from: seller })
      }
    // });

    // await Promise.all([
    //   erc20.approve(buyerProxy, totalAmount, { from: buyer }),
    //   erc721.setApprovalForAll(sellerProxy, true, { from: seller }),
    // ]);

    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address);

    const splitSelector = web3.eth.abi.encodeFunctionSignature(
      "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );
    let selectorOne, extradataOne;
    {
      // Call should be an ERC721 transfer
      const callTransferErc721Selector = web3.eth.abi.encodeFunctionSignature(
        "transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCall = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc721.address, tokenId]
      );
      // Countercall should include an ERC20 transfer
      const countercallSequenceAnyAfterSelector = web3.eth.abi.encodeFunctionSignature(
        "sequenceAnyAfter(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallTransferErc20Selector = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, amount]
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address],
          [(countercallExtradata1.length - 2) / 2],
          [countercallTransferErc20Selector],
          countercallExtradata1,
        ]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [callTransferErc721Selector, countercallSequenceAnyAfterSelector],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorOne = splitSelector;
      extradataOne = params;
    }

    const order = {
      registry: registry.address,
      maker: seller,
      staticTarget: statici.address,
      staticSelector: selectorOne,
      staticExtradata: extradataOne,
      maximumFill: 1,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "11",
    };
    console.log("8 before sign order=" + order)
    const sigOrder = await exchange.sign(order, seller);
    console.log("8 after sigOrder=" + sigOrder)

    let selectorTwo, extradataTwo;
    {
      // Call should be an ERC20 transfer to recipient + fees
      const callSequenceExactSelector = web3.eth.abi.encodeFunctionSignature(
        "sequenceExact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, amount]
      );
      const callSelector2 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata2 = web3.eth.abi.encodeParameters(
        ["address", "uint256", "address"],
        [erc20.address, fee1, fee1Receiptor]
      );
      const callSelector3 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata3 = web3.eth.abi.encodeParameters(
        ["address", "uint256", "address"],
        [erc20.address, fee2, fee2Receiptor]
      );

      let extradataCall;
      if (transferFeeToUniqueReceiptor) {
        extradataCall = web3.eth.abi.encodeParameters(
          ["address[]", "uint256[]", "bytes4[]", "bytes"],
          [
            [statici.address, statici.address],
            [
              (callExtradata1.length - 2) / 2,
              (callExtradata2.length - 2) / 2
            ],
            [callSelector1, callSelector2],
            callExtradata1 +
              callExtradata2.slice("2")
          ]
        );
      } else {
        extradataCall = web3.eth.abi.encodeParameters(
          ["address[]", "uint256[]", "bytes4[]", "bytes"],
          [
            [statici.address, statici.address, statici.address],
            [
              (callExtradata1.length - 2) / 2,
              (callExtradata2.length - 2) / 2,
              (callExtradata3.length - 2) / 2,
            ],
            [callSelector1, callSelector2, callSelector3],
            callExtradata1 +
              callExtradata2.slice("2") +
              callExtradata3.slice("2"),
          ]
        );
      }

      // Countercall should be an ERC721 transfer
      const countercallTransferErc721Selector = web3.eth.abi.encodeFunctionSignature(
        "transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc721.address, tokenId]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [callSequenceExactSelector, countercallTransferErc721Selector],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorTwo = splitSelector;
      extradataTwo = params;
    }

    const counterOrder = {
      registry: registry.address,
      maker: buyer,
      staticTarget: statici.address,
      staticSelector: selectorTwo,
      staticExtradata: extradataTwo,
      maximumFill: amount,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "12",
    };
    console.log("8 sign counter order")
    const sigCounterOrder = await exchange.sign(counterOrder, buyer);

    const firstData = erc721c.methods
      .transferFrom(seller, buyer, tokenId)
      .encodeABI();

    const c1 = erc20c.methods.transferFrom(buyer, seller, amount).encodeABI();
    const c2 = erc20c.methods.transferFrom(buyer, fee1Receiptor, fee1).encodeABI();

    let secondData
    if (transferFeeToUniqueReceiptor) {
      secondData = atomicizerc.methods
      .atomicize(
        [erc20.address, erc20.address],
        [0, 0],
        [(c1.length - 2) / 2, (c2.length - 2) / 2],
        c1 + c2.slice("2")
      )
      .encodeABI();
    } else {
      const c3 = erc20c.methods.transferFrom(buyer, fee2Receiptor, fee2).encodeABI();
      secondData = atomicizerc.methods
      .atomicize(
        [erc20.address, erc20.address, erc20.address],
        [0, 0, 0],
        [(c1.length - 2) / 2, (c2.length - 2) / 2, (c3.length - 2) / 2],
        c1 + c2.slice("2") + c3.slice("2")
      )
      .encodeABI();
    }

    const firstCall = { target: erc721.address, howToCall: 0, data: firstData };
    const secondCall = {
      target: atomicizer.address,
      howToCall: 1,
      data: secondData,
    };
    console.log("firstCall=" + firstCall + ", secondCall=" + secondCall)

    await exchange.atomicMatchWith(
      order,
      sigOrder,
      firstCall,
      counterOrder,
      sigCounterOrder,
      secondCall,
      ZERO_BYTES32,
      { from: seller } // from: who paid the gas fee.
    );

    const [
      sellerErc20Balance,
      fee1ReceiptorErc20Balance,
      fee2ReceiptorErc20Balance,
      tokenIdOwner,
    ] = await Promise.all([
      erc20.balanceOf(seller),
      erc20.balanceOf(fee1Receiptor),
      erc20.balanceOf(fee2Receiptor),
      erc721.ownerOf(tokenId),
    ]);
    assert.equal(
      sellerErc20Balance.toNumber(),
      amount + sellerInitialErc20Balance.toNumber(),
      "Incorrect ERC20 balance"
    );
    assert.equal(fee1ReceiptorErc20Balance.toNumber(), fee1 + fee1ReceiptorInitialErc20Balance.toNumber(), "Incorrect ERC20 balance");
    if (!transferFeeToUniqueReceiptor) {
      assert.equal(fee2ReceiptorErc20Balance.toNumber(), fee2 + fee2ReceiptorInitialErc20Balance.toNumber(), "Incorrect ERC20 balance");
    }
    assert.equal(tokenIdOwner, buyer, "Incorrect token owner");
  });
}
)
