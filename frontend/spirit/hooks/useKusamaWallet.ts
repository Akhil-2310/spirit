"use client";

import { useEffect, useState } from "react";

export function usePolkadotWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  async function hydrateExistingConnection() {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setCheckingConnection(false);
      return;
    }

    try {
      const accounts = (await ethereum.request({
        method: "eth_accounts",
      })) as string[];
      setAddress(accounts[0] ?? null);
    } catch (e) {
      console.error("Failed to read existing wallet connection", e);
    } finally {
      setCheckingConnection(false);
    }
  }

  async function connect() {
    if (!(window as any).ethereum) {
      alert("Install MetaMask");
      return;
    }

    const ethereum = (window as any).ethereum;

    // Try to switch to the network first
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x190f1b46" }], // 420420422 in hex
      });
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x190f1b46", // 420420422 in hex - Polkadot Hub TestNet
              chainName: "Polkadot Hub TestNet",
              nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
              rpcUrls: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
              blockExplorerUrls: [
                "https://blockscout-passet-hub.parity-testnet.parity.io/",
              ],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }

    const accounts = (await ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];

    setAddress(accounts[0] ?? null);
    setCheckingConnection(false);
  }

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    hydrateExistingConnection();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      setAddress(accounts[0] ?? null);
    };

    const handleChainChanged = () => {
      // chain change usually signals the account context changed; re-check accounts
      hydrateExistingConnection();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  return { address, connect, checkingConnection };
}

// Legacy export for backwards compatibility
export const useKusamaWallet = usePolkadotWallet;
