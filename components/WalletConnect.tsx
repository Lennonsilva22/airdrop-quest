
"use client";

import { useState, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { supabase } from "@/lib/supabase";
import { recordMissionOnZenith } from "@/lib/zenith-contract";

const CHAIN_ID = 936485;

const ZENITH_NETWORK = {
  chainId: `0x${CHAIN_ID.toString(16)}`,
  chainName: "Zenith EVM Testnet",
  nativeCurrency: {
    name: "ZTH",
    symbol: "ZTH",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.testnet.zenith.network/"],
  blockExplorerUrls: ["https://explorer.testnet.zenith.network/"],
};

// Tipo local para os eventos da carteira.
// Não redeclara Window.ethereum globalmente.
type EthereumWithEvents = {
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    callback: (...args: unknown[]) => void
  ) => void;
};

export default function WalletConnect() {
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const [missionMessage, setMissionMessage] = useState("");
  const [error, setError] = useState("");

  async function restoreConnection() {
    if (!window.ethereum) return;

    try {
      const provider = new BrowserProvider(
        window.ethereum as ConstructorParameters<typeof BrowserProvider>[0]
      );

      const accounts = await provider.send(
        "eth_accounts",
        []
      ) as string[];

      if (!accounts || accounts.length === 0) {
        setAddress("");
        setChainId(null);
        setAuthenticated(false);
        return;
      }

      const walletAddress = accounts[0];
      const network = await provider.getNetwork();
      const currentChain = Number(network.chainId);

      setAddress(walletAddress);
      setChainId(currentChain);

      const { data: sessionData } = await supabase.auth.getSession();
      const hasSession = Boolean(sessionData.session?.user);

      setAuthenticated(hasSession && currentChain === CHAIN_ID);

      if (hasSession && currentChain === CHAIN_ID) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_points")
          .eq("user_id", sessionData.session!.user.id)
          .single();

        if (profile) {
          setPoints(profile.total_points);
        }
      }
    } catch (err) {
      console.error("Erro ao recuperar carteira:", err);
    }
  }

  useEffect(() => {
    restoreConnection();

    const handleAccountsChanged = () => restoreConnection();
    const handleChainChanged = () => restoreConnection();

    const ethereumWithEvents = window.ethereum as
      | (NonNullable<typeof window.ethereum> & EthereumWithEvents)
      | undefined;

    ethereumWithEvents?.on?.(
      "accountsChanged",
      handleAccountsChanged
    );

    ethereumWithEvents?.on?.(
      "chainChanged",
      handleChainChanged
    );

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthenticated(Boolean(session?.user));
      }
    );

    return () => {
      ethereumWithEvents?.removeListener?.(
        "accountsChanged",
        handleAccountsChanged
      );

      ethereumWithEvents?.removeListener?.(
        "chainChanged",
        handleChainChanged
      );

      authListener.subscription.unsubscribe();
    };
  }, []);

  async function connectWallet() {
    setError("");
    setMissionMessage("");

    if (!window.ethereum) {
      setError("MetaMask não encontrada.");
      return;
    }

    try {
      setLoading(true);

      const provider = new BrowserProvider(
        window.ethereum as ConstructorParameters<typeof BrowserProvider>[0]
      );

      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      const network = await provider.getNetwork();

      setAddress(walletAddress);
      setChainId(Number(network.chainId));

      const { data: sessionData } = await supabase.auth.getSession();

      setAuthenticated(
        Boolean(sessionData.session?.user) &&
        Number(network.chainId) === CHAIN_ID
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao conectar."
      );
    } finally {
      setLoading(false);
    }
  }

  async function completeConnectWalletMission(userId: string) {
    if (!window.ethereum || !address) {
      throw new Error("Conecte sua carteira primeiro.");
    }

    if (chainId !== CHAIN_ID) {
      throw new Error("Conecte primeiro à Zenith EVM Testnet.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("total_points, wallet_address")
      .eq("user_id", userId)
      .single();

    if (profileError) throw profileError;

    if (
      !profile?.wallet_address ||
      profile.wallet_address.toLowerCase() !== address.toLowerCase()
    ) {
      throw new Error(
        "A carteira conectada não corresponde à carteira da conta."
      );
    }

    setMissionMessage("Verificando missão na Zenith...");

    const chainResult = await recordMissionOnZenith(
      window.ethereum as Parameters<
        typeof recordMissionOnZenith
      >[0],
      address,
      "connect-wallet"
    );

    setMissionMessage("Atualizando missão e pontos no Supabase...");

    const { data: result, error: missionError } =
      await supabase.rpc("complete_mission", {
        p_mission_id: "connect-wallet",
      });

    if (missionError) throw missionError;

    const { data: updatedProfile, error: updatedProfileError } =
      await supabase
        .from("profiles")
        .select("total_points")
        .eq("user_id", userId)
        .single();

    if (updatedProfileError) throw updatedProfileError;

    setPoints(updatedProfile.total_points);

    if (chainResult.transactionHash) {
      setMissionMessage(
        `Transação confirmada na Zenith! ${chainResult.transactionHash}`
      );
    } else if (chainResult.alreadyCompleted) {
      setMissionMessage(
        result?.success
          ? `Missão sincronizada! +${result.points} pontos.`
          : "Missão já registrada na Zenith. Seus pontos foram preservados."
      );
    }
  }

  async function signInWithWallet() {
    setError("");
    setMissionMessage("");

    if (!window.ethereum || !address) {
      setError("Conecte sua carteira primeiro.");
      return;
    }

    if (chainId !== CHAIN_ID) {
      setError("Conecte primeiro à Zenith EVM Testnet.");
      return;
    }

    try {
      setLoading(true);

      const { data, error: authError } =
        await supabase.auth.signInWithWeb3({
          chain: "ethereum",
          statement:
            "I confirm that I own this wallet and want to sign in to Airdrop Quest.",
        });

      if (authError) throw authError;

      if (!data.user) {
        throw new Error("Não foi possível autenticar a carteira.");
      }

      setAuthenticated(true);

      await completeConnectWalletMission(data.user.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao autenticar a carteira."
      );
    } finally {
      setLoading(false);
    }
  }

  async function retryConnectWalletMission() {
    setError("");
    setMissionMessage("");

    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;

      if (!user) {
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      await completeConnectWalletMission(user.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao registrar a missão."
      );
    } finally {
      setLoading(false);
    }
  }

  async function addZenithNetwork() {
    if (!window.ethereum) return;

    try {
      setLoading(true);
      setError("");

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [ZENITH_NETWORK],
      });

      await restoreConnection();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao adicionar rede."
      );
    } finally {
      setLoading(false);
    }
  }

  const correctNetwork = chainId === CHAIN_ID;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={connectWallet}
        disabled={loading}
        className="rounded-xl border border-violet-500/40 bg-violet-600/20 px-5 py-3 text-sm font-semibold text-violet-200 disabled:opacity-50"
      >
        {loading
          ? "Connecting..."
          : address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : "Connect MetaMask"}
      </button>

      {address && (
        <>
          <p className="text-xs text-gray-400">
            {correctNetwork ? "✓ Zenith EVM Testnet" : "⚠ Rede incorreta"}
          </p>

          {!correctNetwork && (
            <button
              onClick={addZenithNetwork}
              className="text-violet-400"
            >
              Add Zenith Network
            </button>
          )}

          {correctNetwork && !authenticated && (
            <button
              onClick={signInWithWallet}
              disabled={loading}
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading ? "Signing..." : "Sign in with MetaMask"}
            </button>
          )}

          {authenticated && (
            <>
              <p className="text-xs text-green-400">
                ✓ Login autenticado pelo Supabase
              </p>

              <button
                onClick={retryConnectWalletMission}
                disabled={loading || !correctNetwork}
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {loading
                  ? "Registrando..."
                  : "Registrar missão na Zenith"}
              </button>
            </>
          )}

          {points !== null && (
            <p className="text-sm font-bold text-violet-300">
              Your Points: {points} PTS
            </p>
          )}

          {missionMessage && (
            <p className="max-w-80 break-all text-right text-xs text-green-400">
              {missionMessage}
            </p>
          )}
        </>
      )}

      {error && (
        <p className="max-w-64 break-all text-right text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
