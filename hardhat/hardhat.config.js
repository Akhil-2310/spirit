require("@nomicfoundation/hardhat-toolbox");
require("@parity/hardhat-polkadot");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      polkadot: {
        target: "evm",
      },
      nodeConfig: {
        nodeBinaryPath: "/Users/akhilnanavati/Downloads/dev-node",
        dev: true,
      },
      adapterConfig: {
        adapterBinaryPath: "/Users/akhilnanavati/Downloads/eth-rpc",
        dev: true,
      },
    },
    localNode: {
      polkadot: {
        target: "evm",
      },
      url: `http://127.0.0.1:8545`,
    },
    polkadotHubTestnet: {
      polkadot: {
        target: "evm",
      },
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: [vars.get("PRIVATE_KEY")],
    },
  },
};
