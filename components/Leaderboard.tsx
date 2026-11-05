
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type LeaderboardEntry = {
  wallet: string;
  points: number;
};

const podiumStyles = [
  {
    medal: "🥇",
    label: "1º LUGAR",
    color: "border-yellow-400/40 bg-yellow-400/10",
    text: "text-yellow-300",
  },
  {
    medal: "🥈",
    label: "2º LUGAR",
    color: "border-slate-300/30 bg-slate-300/10",
    text: "text-slate-200",
  },
  {
    medal: "🥉",
    label: "3º LUGAR",
    color: "border-orange-400/30 bg-orange-400/10",
    text: "text-orange-300",
  },
];

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLeaderboard() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.rpc("get_leaderboard");

    if (error) {
      console.error("Erro ao carregar ranking:", error);
      setError("Não foi possível carregar o ranking.");
      setLoading(false);
      return;
    }

    setEntries(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const podium = entries.slice(0, 3);
  const remaining = entries.slice(3);

  return (
    <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#15132b] to-[#0c1020] p-5 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold tracking-widest text-violet-400">
            AIRDROP QUEST
          </span>
          <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
            🏆 Ranking Global
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Os melhores exploradores da Zenith.
          </p>
        </div>

        <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-xs font-bold text-violet-300">
          TOP 100
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-gray-400">
          Carregando ranking...
        </p>
      ) : error ? (
        <div className="text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadLeaderboard}
            className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
          >
            Tentar novamente
          </button>
        </div>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-gray-400">
          Ainda não há participantes no ranking.
        </p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {podium.map((entry, index) => {
              const style = podiumStyles[index];

              return (
                <div
                  key={`${entry.wallet}-${index}`}
                  className={`rounded-2xl border p-5 text-center ${style.color} ${
                    index === 0 ? "sm:-translate-y-2" : ""
                  }`}
                >
                  <div className="text-4xl">{style.medal}</div>

                  <p className={`mt-3 text-xs font-black tracking-widest ${style.text}`}>
                    {style.label}
                  </p>

                  <p className="mt-3 break-all font-mono text-sm text-white">
                    {entry.wallet}
                  </p>

                  <p className={`mt-3 text-2xl font-black ${style.text}`}>
                    {entry.points.toLocaleString("pt-BR")}
                  </p>

                  <p className="text-xs text-gray-400">PONTOS</p>
                </div>
              );
            })}
          </div>

          {remaining.length > 0 && (
            <div>
              <h3 className="mb-4 text-sm font-bold text-gray-300">
                CLASSIFICAÇÃO GERAL
              </h3>

              <div className="space-y-2">
                {remaining.map((entry, index) => (
                  <div
                    key={`${entry.wallet}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-center font-bold text-gray-400">
                        {index + 4}º
                      </span>

                      <span className="font-mono text-sm text-white">
                        {entry.wallet}
                      </span>
                    </div>

                    <span className="font-bold text-violet-300">
                      {entry.points.toLocaleString("pt-BR")} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <button
        onClick={loadLeaderboard}
        disabled={loading}
        className="mt-6 w-full rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
      >
        ↻ Atualizar ranking
      </button>
    </section>
  );
}
