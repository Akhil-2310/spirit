export const polkadotHub = {
  id: 420420422,
  name: "Polkadot Hub TestNet",
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"] } },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout-passet-hub.parity-testnet.parity.io",
    },
  },
};

// Legacy export for backwards compatibility
export const kusamaHub = polkadotHub;
