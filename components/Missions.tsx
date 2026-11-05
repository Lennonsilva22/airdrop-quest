
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { recordMissionOnZenith } from "@/lib/zenith-contract";

const CHAIN_ID = 936485;
const EXPLORER_URL = "https://explorer.testnet.zenith.network/";

type EthereumProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
};

function getEthereum(): EthereumProvider | undefined {
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

type ConnectedWallet = {
  address: string;
  chainId: number;
} | null;

const missions = [
  {
    id: "explore-zenith",
    icon: "🌐",
    title: "Explore Zenith",
    description: "Conheça o ecossistema Zenith EVM.",
    points: 100,
    category: "Ecosystem",
  },
  {
    id: "connect-wallet",
    icon: "👛",
    title: "Connect Wallet",
    description: "Conecte sua carteira ao Airdrop Quest.",
    points: 150,
    category: "Wallet",
  },
  {
    id: "first-transaction",
    icon: "⚡",
    title: "First Transaction",
    description: "Comprove sua primeira transação na Zenith EVM.",
    points: 250,
    category: "On-chain",
  },
];

export default function Missions() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [authenticated, setAuthenticated] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [correctNetwork, setCorrectNetwork] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [exploreOpened, setExploreOpened] = useState(false);

  const getConnectedWallet = useCallback(
    async (): Promise<ConnectedWallet> => {
      const ethereum = getEthereum();
      if (!ethereum) return null;

      try {
        const accounts = (await ethereum.request({
          method: "eth_accounts",
        })) as string[];

        if (!accounts || accounts.length === 0) return null;

        const chain = (await ethereum.request({
          method: "eth_chainId",
        })) as string;

        return {
          address: accounts[0].toLowerCase(),
          chainId: Number(BigInt(chain)),
        };
      } catch {
        return null;
      }
    },
    []
  );

  const loadProgress = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setAuthenticated(false);
        setCompleted([]);
        setTotalPoints(null);
        setWalletConnected(false);
        setCorrectNetwork(false);
        setWalletAddress("");
        setLoaded(true);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_address, total_points")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      const { data: completedMissions, error: missionsError } =
        await supabase
          .from("completed_missions")
          .select("mission_id")
          .eq("wallet_address", profile.wallet_address);

      if (missionsError) throw missionsError;

      setTotalPoints(profile.total_points);
      setCompleted(completedMissions?.map((item) => item.mission_id) || []);

      const wallet = await getConnectedWallet();

      const walletMatches =
        Boolean(wallet) &&
        wallet!.address === profile.wallet_address.toLowerCase() &&
        wallet!.chainId === CHAIN_ID;

      setWalletConnected(Boolean(wallet));
      setWalletAddress(wallet?.address || "");
      setCorrectNetwork(wallet?.chainId === CHAIN_ID);
      setAuthenticated(walletMatches);

      setError("");
      setLoaded(true);
    } catch (err) {
      setAuthenticated(false);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar seu progresso."
      );
      setLoaded(true);
    }
  }, [getConnectedWallet]);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (active) await loadProgress();
    };

    refresh();

    const ethereum = getEthereum();

    const handleAccountsChanged = () => refresh();
    const handleChainChanged = () => refresh();

    ethereum?.on?.("accountsChanged", handleAccountsChanged);
    ethereum?.on?.("chainChanged", handleChainChanged);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (active) {
        window.setTimeout(() => {
          if (active) refresh();
        }, 0);
      }
    });

    const interval = window.setInterval(refresh, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);

      ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum?.removeListener?.("chainChanged", handleChainChanged);

      subscription.unsubscribe();
    };
  }, [loadProgress]);

  const canVerify =
    authenticated &&
    walletConnected &&
    correctNetwork &&
    walletAddress.length > 0;

  // Sincroniza uma missão já concluída no Supabase com o contrato.
  // Não chama nenhuma função de recompensa nem altera os pontos.
  async function syncFirstTransactionOnZenith() {
    setError("");
    setMessage("");

    if (!canVerify) {
      setError("Conecte a carteira correta na rede Zenith.");
      return;
    }

    try {
      setVerifying(true);

      const ethereum = getEthereum();

      if (!ethereum) {
        throw new Error("MetaMask não encontrada.");
      }

      const wallet = await getConnectedWallet();

      if (
        !wallet ||
        wallet.chainId !== CHAIN_ID ||
        wallet.address !== walletAddress.toLowerCase()
      ) {
        throw new Error("Confira sua carteira e a rede Zenith.");
      }

      setMessage("Verificando o registro da missão na Zenith...");

      const result = await recordMissionOnZenith(
        ethereum as Parameters<typeof recordMissionOnZenith>[0],
        wallet.address,
        "first-transaction"
      );

      if (result.alreadyCompleted) {
        setMessage(
          "A missão First Transaction já estava registrada no contrato da Zenith. Seus pontos foram preservados."
        );
      } else {
        setMessage(
          "Missão registrada com sucesso no contrato da Zenith! Seus pontos não foram alterados."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível sincronizar a missão."
      );
    } finally {
      setVerifying(false);
    }
  }

  async function completeExploreMission() {
    setError("");
    setMessage("");

    if (!canVerify) {
      setError("Conecte sua carteira correta na rede Zenith.");
      return;
    }

    try {
      setVerifying(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      const wallet = await getConnectedWallet();

      if (
        !wallet ||
        wallet.chainId !== CHAIN_ID ||
        wallet.address !== walletAddress.toLowerCase()
      ) {
        throw new Error("Confira sua carteira e a rede Zenith.");
      }

      const ethereum = getEthereum();

      if (!ethereum) {
        throw new Error("MetaMask não encontrada.");
      }

      setMessage("Aguardando confirmação na MetaMask...");

      const chainResult = await recordMissionOnZenith(
        ethereum as Parameters<typeof recordMissionOnZenith>[0],
        wallet.address,
        "explore-zenith"
      );

      setMessage("Missão registrada na Zenith! Atualizando pontos...");

      const { data, error: rpcError } = await supabase.rpc(
        "complete_mission",
        { p_mission_id: "explore-zenith" }
      );

      if (rpcError) throw rpcError;

      if (!data?.success) {
        setMessage(
          chainResult.alreadyCompleted
            ? "A missão já estava registrada na Zenith. " +
                (data?.message || "Confira seu progresso no Supabase.")
            : "Registro confirmado na Zenith, mas o Supabase não confirmou os pontos: " +
                (data?.message || "tente novamente.")
        );

        await loadProgress();
        return;
      }

      setMessage(`Missão concluída na Zenith! +${data.points} pontos.`);
      setExploreOpened(false);
      await loadProgress();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir a missão."
      );
    } finally {
      setVerifying(false);
    }
  }

  async function verifyFirstTransaction() {
    setError("");
    setMessage("");

    if (!transactionHash.trim()) {
      setError("Digite o hash da transação.");
      return;
    }

    try {
      setVerifying(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setAuthenticated(false);
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Não foi possível localizar sua carteira.");
      }

      const wallet = await getConnectedWallet();

      if (!wallet) {
        setAuthenticated(false);
        setWalletConnected(false);
        throw new Error("Conecte sua MetaMask primeiro.");
      }

      setWalletConnected(true);
      setWalletAddress(wallet.address);
      setCorrectNetwork(wallet.chainId === CHAIN_ID);

      if (wallet.chainId !== CHAIN_ID) {
        setAuthenticated(false);
        throw new Error("Mude sua carteira para a rede Zenith EVM.");
      }

      if (wallet.address !== profile.wallet_address.toLowerCase()) {
        setAuthenticated(false);
        throw new Error(
          "A carteira conectada não corresponde à carteira do login."
        );
      }

      setAuthenticated(true);

      const ethereum = getEthereum();

      if (!ethereum) {
        throw new Error("MetaMask não encontrada.");
      }

      setMessage("Verificando sua transação na Zenith...");

      const { data: verification, error: verificationError } =
        await supabase.functions.invoke("dynamic-handler", {
          body: {
            transactionHash: transactionHash.trim(),
            verifyOnly: true,
          },
        });

      if (verificationError) throw verificationError;

      if (!verification?.success || !verification?.verified) {
        throw new Error(
          verification?.message || "A transação não foi validada."
        );
      }

      setMessage(
        "Transação validada! Confirme o registro na MetaMask..."
      );

      const chainResult = await recordMissionOnZenith(
        ethereum as Parameters<typeof recordMissionOnZenith>[0],
        wallet.address,
        "first-transaction"
      );

      setMessage(
        "Registro na Zenith confirmado! Atualizando seus pontos..."
      );

      const { data: award, error: awardError } =
        await supabase.functions.invoke("dynamic-handler", {
          body: {
            transactionHash: transactionHash.trim(),
          },
        });

      if (awardError) throw awardError;

      if (!award?.success) {
        throw new Error(
          award?.message ||
            "Registro realizado, mas o Supabase não confirmou os pontos."
        );
      }

      setTransactionHash("");

      setMessage(
        chainResult.transactionHash
          ? `Missão registrada na Zenith! +${award.points} pontos.`
          : `Missão já registrada na Zenith! +${award.points || 0} pontos.`
      );

      await loadProgress();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao verificar a transação."
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <section id="missoes" className="mt-14">
      <div className="mb-8 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#111625] p-6">
          <p className="text-sm text-gray-400">Your Points</p>
          <p className="mt-3 text-3xl font-black text-violet-400">
            {!loaded
              ? "..."
              : totalPoints !== null
                ? `${totalPoints} PTS`
                : "Connect wallet"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111625] p-6">
          <p className="text-sm text-gray-400">Completed Missions</p>
          <p className="mt-3 text-3xl font-black text-white">
            {loaded ? `${completed.length}/3` : "..."}
          </p>
        </div>
      </div>

      <div className="mb-7">
        <p className="text-sm font-semibold text-violet-400">
          YOUR JOURNEY
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white">
          Available Missions
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Complete quests and earn experience points.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {missions.map((mission) => {
          const isCompleted = completed.includes(mission.id);
          const isFirstTransaction =
            mission.id === "first-transaction";
          const isExplore = mission.id === "explore-zenith";

          return (
            <article
              key={mission.id}
              className="rounded-2xl border border-white/10 bg-[#111625] p-6 transition hover:-translate-y-1 hover:border-violet-500/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-4xl">{mission.icon}</span>
                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                  {mission.category}
                </span>
              </div>

              <h3 className="mt-6 text-xl font-bold text-white">
                {mission.title}
              </h3>

              <p className="mt-3 min-h-12 text-sm leading-6 text-gray-400">
                {mission.description}
              </p>

              <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
                <span className="font-bold text-violet-300">
                  +{mission.points} PTS
                </span>
              </div>

              {isCompleted ? (
                <>
                  <div className="mt-5 rounded-xl bg-green-500/10 px-4 py-3 text-center text-sm font-bold text-green-400">
                    ✓ Completed
                  </div>

                  {isFirstTransaction && (
                    canVerify ? (
                      <button
                        onClick={syncFirstTransactionOnZenith}
                        disabled={verifying || !loaded}
                        className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {verifying
                          ? "Sincronizando..."
                          : "Sincronizar com Zenith"}
                      </button>
                    ) : (
                      <div className="mt-3 rounded-xl bg-white/5 px-4 py-3 text-center text-xs text-gray-400">
                        Conecte a carteira correta na rede Zenith para sincronizar.
                      </div>
                    )
                  )}
                </>
              ) : isFirstTransaction ? (
                !canVerify ? (
                  <div className="mt-5 rounded-xl bg-white/5 px-4 py-3 text-center text-sm font-semibold text-gray-400">
                    {!walletConnected
                      ? "Connect MetaMask first"
                      : !correctNetwork
                        ? "Switch to Zenith EVM"
                        : "Sign in with the correct wallet"}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={transactionHash}
                      onChange={(event) =>
                        setTransactionHash(event.target.value)
                      }
                      placeholder="0x... Transaction Hash"
                      className="mt-5 w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-xs text-white outline-none focus:border-violet-500"
                    />

                    <button
                      onClick={verifyFirstTransaction}
                      disabled={verifying || !loaded}
                      className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {verifying ? "Verifying..." : "Verify Transaction"}
                    </button>
                  </>
                )
              ) : isExplore ? (
                !canVerify ? (
                  <div className="mt-5 rounded-xl bg-white/5 px-4 py-3 text-center text-sm font-semibold text-gray-400">
                    Connect your Zenith wallet first
                  </div>
                ) : !exploreOpened ? (
                  <button
                    onClick={() => {
                      window.open(
                        EXPLORER_URL,
                        "_blank",
                        "noopener,noreferrer"
                      );
                      setExploreOpened(true);
                    }}
                    className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white"
                  >
                    Explore Zenith ↗
                  </button>
                ) : (
                  <button
                    onClick={completeExploreMission}
                    disabled={verifying}
                    className="mt-5 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {verifying
                      ? "Confirming..."
                      : "Confirm Mission (+100)"}
                  </button>
                )
              ) : (
                <button
                  disabled
                  className="mt-5 w-full cursor-not-allowed rounded-xl bg-white/5 px-4 py-3 text-sm font-bold text-gray-500"
                >
                  Complete via wallet login
                </button>
              )}
            </article>
          );
        })}
      </div>

      {message && (
        <p className="mt-5 break-all text-sm text-green-400">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-5 break-all text-sm text-red-400">
          {error}
        </p>
      )}

      <p className="mt-3 text-xs text-gray-500">
        As transações das missões são registradas na blockchain Zenith antes da liberação dos pontos.
      </p>
    </section>
  );
}
