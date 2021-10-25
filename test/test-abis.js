const atomicierAbi = [
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
    {
        constant: false,
        inputs: [
            { name: "addrs", type: "address[]" },
            { name: "values", type: "uint256[]" },
            { name: "calldataLengths", type: "uint256[]" },
            { name: "calldatas", type: "bytes" },
        ],
        name: "atomicizeCustom",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { name: "addr", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "data", type: "bytes" }
        ],
        name: "atomicize1",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { name: "addrs", type: "address[]" },
            { name: "values", type: "uint256[]" },
            { name: "calldata0", type: "bytes" },
            { name: "calldata1", type: "bytes" },
        ],
        name: "atomicize2",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { name: "addrs", type: "address[]" },
            { name: "values", type: "uint256[]" },
            { name: "calldata0", type: "bytes" },
            { name: "calldata1", type: "bytes" },
            { name: "calldata2", type: "bytes" },
        ],
        name: "atomicize3",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        constant: false,
        inputs: [
            { name: "addrs", type: "address[]" },
            { name: "values", type: "uint256[]" },
            { name: "calldata0", type: "bytes" },
            { name: "calldata1", type: "bytes" },
            { name: "calldata2", type: "bytes" },
            { name: "calldata3", type: "bytes" },
        ],
        name: "atomicize4",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
    }
];

const transferPlatformTokenAbi = [
    {
        constant: false,
        inputs: [
            { name: "addrs", type: "address[]" },
            { name: "amounts", type: "uint256[]" }
        ],
        name: "transferETH",
        outputs: [],
        payable: true,
        stateMutability: "payable",
        type: "function",
    }
]

module.exports = {
    atomicierAbi,
    transferPlatformTokenAbi
}
