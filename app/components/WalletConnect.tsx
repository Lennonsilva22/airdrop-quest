
"use client";

import { useState } from "react";
import { BrowserProvider } from "ethers";

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
  }
}

const ZENITH_CHAIN_ID = "0xe4a25";

export default function WalletConnect() {
  const [address, setAddress] = useState("");
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function connectWallet() {
    setError("");

    if (!window.ethereum) {
      setError("MetaMask não encontrada. Instale a extensão.");
      return;
    }

    try {
      setLoading(true);

      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      const network = await provider.getNetwork();

      setAddress(walletAddress);

      setWrongNetwork(
        network.chainId !== BigInt(936485)
      );
    } catch (err) {
      console.error(err);
      setError("Não foi possível conectar a carteira.");
    } finally {
      setLoading(false);
    }
  }

  async function switchNetwork() {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ZENITH_CHAIN_ID }],
      });

      setWrongNetwork(false);
    } catch (err: unknown) {
      const error = err as { code?: number };

      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: ZENITH_CHAIN_ID,
              chainName: "Zenith EVM Testnet",
              nativeCurrency: {
                name: "ZTH",
                symbol: "ZTH",
                decimals: 18,
              },
              rpcUrls: [
                "https://rpc.testnet.zenith.network/",
              ],
              blockExplorerUrls: [
                "https://explorer.testnet.zenith.network/",
              ],
            }],
          });

          setWrongNetwork(false);
        } catch {
          setError("Não foi possível adicionar a Zenith.");
        }
      } else {
        setError("Não foi possível mudar de rede.");
      }
    }
  }

  function disconnectWallet() {
    setAddress("");
    setWrongNetwork(false);
    setError("");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!address ? (
        <button
          onClick={connectWallet}
          disabled={loading}
          className="rounded-xl border border-violet-500/40 bg-violet-600/20 px-5 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-600/40 disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {wrongNetwork && (
            <button
              onClick={switchNetwork}
              className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white"
            >
              Switch to Zenith
            </button>
          )}

          {!wrongNetwork && (
            <span className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-3 text-xs text-green-400">
              ● Zenith Connected
            </span>
          )}

          <button
            onClick={disconnectWallet}
            className="rounded-xl border border-violet-500/40 bg-violet-600/20 px-4 py-3 text-sm font-semibold text-violet-200"
          >
            {address.slice(0, 6)}...{address.slice(-4)}
            {" ×"}
          </button>
        </div>
      )}

      {error && (
        <p className="max-w-xs text-right text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
