
"use client";

import { useCallback, useEffect, useState } from "react";

const RPC_URL = "https://rpc.testnet.zenith.network/";
const CHAIN_ID = 936485;

interface GatewayToken {
  id: string;
  symbol: string;
  name: string;
  address: string | null;
  decimals: number;
  native: boolean;
}

interface GatewayResponse {
  evmTokens?: GatewayToken[];
}

async function rpcCall(method: string, params: unknown[]) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error("Falha na comunicação com a rede Zenith.");
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "Erro na consulta RPC.");
  }

  return data.result as string;
}

function formatBalance(value: bigint, decimals: number) {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, 6)
    .replace(/0+$/, "");

  return fractionText
    ? `${whole.toString()}.${fractionText}`
    : whole.toString();
}

export default function Bridge() {
  const [direction, setDirection] = useState<"to-canton" | "to-zenith">(
    "to-canton"
  );
  const [tokens, setTokens] = useState<GatewayToken[]>([]);
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const from = direction === "to-canton" ? "Zenith EVM" : "Canton";
  const to = direction === "to-canton" ? "Canton" : "Zenith EVM";

  const loadBalances = useCallback(
    async (availableTokens: GatewayToken[]) => {
      try {
        setRefreshing(true);
        setError("");

        if (!window.ethereum) {
          throw new Error("MetaMask não foi encontrada no navegador.");
        }

        const accounts = (await window.ethereum.request({
          method: "eth_accounts",
        })) as string[];

        if (!accounts || accounts.length === 0) {
          setWallet("");
          setBalances({});
          throw new Error("Conecte sua MetaMask para consultar os saldos.");
        }

        const account = accounts[0];

        const chainId = (await window.ethereum.request({
          method: "eth_chainId",
        })) as string;

        if (parseInt(chainId, 16) !== CHAIN_ID) {
          setWallet(account);
          setBalances({});
          throw new Error("Altere a MetaMask para a rede Zenith Testnet.");
        }

        setWallet(account);

        const results: Record<string, string> = {};

        for (const item of availableTokens) {
          let rawBalance: string;

          if (item.native) {
            rawBalance = await rpcCall("eth_getBalance", [
              account,
              "latest",
            ]);
          } else {
            if (!item.address) continue;

            const paddedAddress = account
              .toLowerCase()
              .replace("0x", "")
              .padStart(64, "0");

            rawBalance = await rpcCall("eth_call", [
              {
                to: item.address,
                data: `0x70a08231${paddedAddress}`,
              },
              "latest",
            ]);
          }

          results[item.id] = formatBalance(
            BigInt(rawBalance),
            item.decimals
          );
        }

        setBalances(results);
      } catch (err) {
        console.error("Erro ao consultar saldos:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível consultar os saldos."
        );
      } finally {
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);

        const response = await fetch("/api/gateway/registries", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Não foi possível carregar os tokens.");
        }

        const data: GatewayResponse = await response.json();
        const availableTokens = data.evmTokens ?? [];

        setTokens(availableTokens);

        if (availableTokens.length > 0) {
          setToken(availableTokens[0].id);
          await loadBalances(availableTokens);
        } else {
          setError("Nenhum token EVM encontrado.");
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar o Gateway."
        );
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, [loadBalances]);

  function changeDirection() {
    setDirection((current) =>
      current === "to-canton" ? "to-zenith" : "to-canton"
    );
    setAmount("");
  }

  const selectedToken = tokens.find((item) => item.id === token);

  return (
    <section className="mt-14 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#101c30] via-[#111625] to-[#080b14] p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300">
            ZENITH GATEWAY
          </span>

          <h2 className="mt-5 text-3xl font-black text-white md:text-4xl">
            Cross-Chain <span className="text-cyan-400">Bridge</span>
          </h2>

          <p className="mt-3 text-sm text-gray-400">
            Move eligible assets between Zenith EVM and Canton.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0c1020] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-400">
              From
            </span>
            <span className="text-xs text-gray-500">Network</span>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#151d30] p-4">
            <span className="font-bold text-white">{from}</span>

            <span className="rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300">
              {direction === "to-canton" ? "EVM" : "CANTON"}
            </span>
          </div>

          <div className="my-4 flex justify-center">
            <button
              onClick={changeDirection}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-xl text-cyan-300 transition hover:bg-cyan-500/20"
              title="Inverter direção"
            >
              ↕
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-400">
              To
            </span>
            <span className="text-xs text-gray-500">Destination</span>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#151d30] p-4">
            <span className="font-bold text-white">{to}</span>

            <span className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-300">
              {direction === "to-canton" ? "CANTON" : "EVM"}
            </span>
          </div>

          <div className="mt-7">
            <label className="mb-2 block text-sm font-semibold text-gray-400">
              Select token
            </label>

            <select
              value={token}
              onChange={(event) => setToken(event.target.value)}
              disabled={loading || tokens.length === 0}
              className="w-full rounded-xl border border-white/10 bg-[#151d30] p-4 text-white outline-none focus:border-cyan-400 disabled:opacity-50"
            >
              {tokens.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.symbol} — {item.name}
                </option>
              ))}
            </select>

            {selectedToken && (
              <div className="mt-3 rounded-xl border border-white/10 bg-[#151d30] p-4">
                <p className="text-xs text-gray-400">
                  Saldo na sua carteira
                </p>

                <p className="mt-1 text-2xl font-black text-cyan-300">
                  {balances[selectedToken.id] ?? "—"}{" "}
                  <span className="text-sm">
                    {selectedToken.symbol}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={() => loadBalances(tokens)}
              disabled={refreshing || loading}
              className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {refreshing ? "Consultando..." : "↻ Atualizar saldos"}
            </button>
          </div>

          {wallet && (
            <p className="mt-3 break-all text-center text-xs text-gray-500">
              Carteira: {wallet}
            </p>
          )}

          {error && (
            <p className="mt-3 text-center text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-gray-400">
              Amount
            </label>

            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-xl border border-white/10 bg-[#151d30] p-4 text-white outline-none placeholder:text-gray-600 focus:border-cyan-400"
            />
          </div>

          <button
            disabled
            className="mt-7 w-full cursor-not-allowed rounded-xl bg-cyan-600/40 px-6 py-4 font-black text-white opacity-70"
          >
            BRIDGE COMING SOON
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-gray-500">
            Transfers are not enabled yet. No funds will be moved in this version.
          </p>
        </div>

        {/* Canton preparado para integração futura */}
        <div className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-white">
              Canton Network
            </span>

            <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-300">
              NÃO CONFIGURADO
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            A integração com Canton está preparada para uma etapa futura.
            Será necessário configurar um participante e um Party ID para
            consultar saldos e realizar transferências.
          </p>

          <p className="mt-3 text-xs text-violet-300">
            Status: aguardando configuração da rede Canton.
          </p>

          <div className="mt-4 rounded-xl border border-white/10 bg-[#151d30] p-4">
            <p className="text-xs text-gray-400">Canton Party ID</p>
            <p className="mt-2 text-sm text-gray-500">
              Ainda não configurado
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <p className="text-sm font-bold text-yellow-300">
            ⚠️ Important
          </p>

          <p className="mt-2 text-xs leading-5 text-gray-400">
            Balance checks are read-only on Zenith EVM. Canton balances
            and actual transfers require additional integration and
            recipient permissions.
          </p>
        </div>

        <div className="mt-6 text-center">
          <a
            href="https://docs.zenith.network/zenith-testnet"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
          >
            Read official Zenith Gateway documentation →
          </a>
        </div>
      </div>
    </section>
  );
}
