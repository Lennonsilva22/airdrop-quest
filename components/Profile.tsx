
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProfileData = {
  wallet_address: string;
  total_points: number;
  completed_count: number;
  leaderboard_position: number;
};

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProfile() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.rpc("get_my_profile");

    if (error) {
      console.error("Erro ao carregar perfil:", error);
      setError("Não foi possível carregar seu perfil.");
      setLoading(false);
      return;
    }

    setProfile(data?.[0] || null);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const points = profile?.total_points ?? 0;
  const level = Math.floor(points / 500) + 1;
  const currentLevelPoints = points % 500;
  const progress = (currentLevelPoints / 500) * 100;

  return (
    <section className="mt-10 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#171536] to-[#0c1020] p-6 md:p-8">
      <div className="mb-6">
        <span className="text-xs font-bold tracking-widest text-violet-400">
          AIRDROP QUEST
        </span>
        <h2 className="mt-2 text-2xl font-black text-white">
          👤 Meu Perfil
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Acompanhe sua jornada no ecossistema Zenith.
        </p>
      </div>

      {loading ? (
        <p className="py-6 text-center text-gray-400">
          Carregando seu perfil...
        </p>
      ) : error ? (
        <div className="text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadProfile}
            className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
          >
            Tentar novamente
          </button>
        </div>
      ) : !profile ? (
        <p className="py-6 text-center text-gray-400">
          Conecte sua carteira para visualizar seu perfil.
        </p>
      ) : (
        <>
          <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-gray-400">CARTEIRA CONECTADA</p>
            <p className="mt-2 break-all font-mono text-sm text-white">
              {profile.wallet_address}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-gray-400">Pontuação</p>
              <p className="mt-2 text-3xl font-black text-violet-300">
                {points.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-gray-500">PONTOS</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-gray-400">Posição global</p>
              <p className="mt-2 text-3xl font-black text-yellow-300">
                #{profile.leaderboard_position}
              </p>
              <p className="text-xs text-gray-500">RANKING</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-gray-400">Missões concluídas</p>
              <p className="mt-2 text-3xl font-black text-green-300">
                {profile.completed_count}
              </p>
              <p className="text-xs text-gray-500">MISSÕES</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">
                  ⭐ Nível {level}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Progresso para o próximo nível
                </p>
              </div>

              <span className="text-sm font-bold text-violet-300">
                {currentLevelPoints}/500 XP
              </span>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            onClick={loadProfile}
            disabled={loading}
            className="mt-5 w-full rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-300 transition hover:bg-violet-500/20"
          >
            ↻ Atualizar meu perfil
          </button>
        </>
      )}
    </section>
  );
}
