
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const prizes = [
  { points: 10, color: "#7c3aed" },
  { points: 25, color: "#2563eb" },
  { points: 50, color: "#0891b2" },
  { points: 100, color: "#16a34a" },
  { points: 250, color: "#ca8a04" },
];

export default function LuckyWheel() {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [canSpin, setCanSpin] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [nextSpin, setNextSpin] = useState<string | null>(null);

  async function checkStatus() {
    const { data, error } = await supabase.rpc("get_wheel_status");

    if (error) {
      console.error("Erro ao verificar roleta:", error);
      setMessage("Não foi possível verificar sua rodada.");
      setCanSpin(false);
      return;
    }

    setAuthenticated(Boolean(data?.authenticated));
    setCanSpin(Boolean(data?.can_spin));
    setNextSpin(data?.next_spin_at || null);

    if (!data?.authenticated) {
      setMessage("Conecte sua carteira Zenith para participar.");
    } else if (data?.can_spin) {
      setMessage("Sua rodada diária está disponível!");
    } else {
      setMessage("Você já utilizou sua rodada diária.");
    }
  }

  useEffect(() => {
    checkStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkStatus();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function spin() {
    if (spinning || !canSpin || !authenticated) return;

    setSpinning(true);
    setResult(null);
    setMessage("Boa sorte! A roleta está girando...");

    const { data, error } = await supabase.rpc("spin_wheel");

    if (error) {
      setMessage(error.message);
      setSpinning(false);
      return;
    }

    if (!data?.success) {
      setMessage(data?.message || "Não foi possível girar.");
      setNextSpin(data?.next_spin_at || null);
      setCanSpin(false);
      setSpinning(false);
      return;
    }

    const points = Number(data.points);
    const winningIndex = prizes.findIndex(
      (prize) => prize.points === points
    );

    const segmentAngle = 360 / prizes.length;
    const targetAngle =
      360 * 6 +
      (360 - (winningIndex * segmentAngle + segmentAngle / 2));

    const wheel = document.getElementById("lucky-wheel");

    if (wheel) {
      wheel.style.transform = `rotate(${targetAngle}deg)`;
    }

    window.setTimeout(() => {
      setResult(points);
      setMessage(`Parabéns! Você ganhou ${points} pontos!`);
      setNextSpin(data.next_spin_at);
      setCanSpin(false);
      setSpinning(false);

      window.dispatchEvent(new Event("wheel-points-updated"));
    }, 4200);
  }

  const formattedNextSpin = nextSpin
    ? new Date(nextSpin).toLocaleString("pt-BR")
    : "";

  return (
    <section className="mt-10 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#171536] to-[#0c1020] p-6 text-center md:p-8">
      <span className="text-xs font-bold tracking-widest text-violet-400">
        AIRDROP QUEST
      </span>

      <h2 className="mt-2 text-3xl font-black text-white">
        🎰 Lucky Wheel
      </h2>

      <p className="mt-2 text-sm text-gray-400">
        Gire uma vez a cada 24 horas e ganhe pontos!
      </p>

      <div className="relative mx-auto my-8 h-72 w-72 max-w-full">
        <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 text-3xl">
          ▼
        </div>

        <div
          id="lucky-wheel"
          className="relative h-full w-full overflow-hidden rounded-full border-8 border-violet-400 shadow-2xl transition-transform duration-[4200ms] ease-out"
          style={{
            background: `conic-gradient(
              ${prizes[0].color} 0deg 72deg,
              ${prizes[1].color} 72deg 144deg,
              ${prizes[2].color} 144deg 216deg,
              ${prizes[3].color} 216deg 288deg,
              ${prizes[4].color} 288deg 360deg
            )`,
          }}
        >
          {prizes.map((prize, index) => (
            <div
              key={prize.points}
              className="absolute left-1/2 top-1/2 font-black text-white"
              style={{
                transform: `rotate(${index * 72 + 36}deg) translateY(-100px)`,
                transformOrigin: "0 0",
              }}
            >
              {prize.points}
            </div>
          ))}

          <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#171536] text-sm font-black text-white">
            AQ
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {prizes.map((prize) => (
          <span
            key={prize.points}
            className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white"
          >
            {prize.points} pts
          </span>
        ))}
      </div>

      <button
        onClick={spin}
        disabled={spinning || !canSpin || !authenticated}
        className="mt-8 w-full max-w-sm rounded-xl bg-violet-600 px-6 py-4 font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {spinning
          ? "GIRANDO..."
          : canSpin
            ? "🎰 GIRAR AGORA"
            : "RODADA INDISPONÍVEL"}
      </button>

      {message && (
        <p className="mt-5 font-bold text-violet-300">
          {message}
        </p>
      )}

      {result !== null && (
        <p className="mt-2 text-3xl font-black text-yellow-300">
          +{result} PTS
        </p>
      )}

      {nextSpin && !canSpin && (
        <p className="mt-3 text-xs text-gray-400">
          Próxima rodada disponível: {formattedNextSpin}
        </p>
      )}
    </section>
  );
}
