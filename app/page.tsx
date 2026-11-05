import WalletConnect from "@/components/WalletConnect";
import Missions from "@/components/Missions";
import Leaderboard from "@/components/Leaderboard";
import Profile from "@/components/Profile";
import LuckyWheel from "@/components/LuckyWheel";
import Bridge from "@/components/Bridge";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080b14] text-white">
      <header className="border-b border-white/10 bg-[#0c1020]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="#" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl font-black">
              AQ
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide">
                AIRDROP <span className="text-violet-400">QUEST</span>
              </h1>
              <p className="text-xs text-gray-500">
                Web3 Rewards Platform
              </p>
            </div>
          </a>

          <nav className="hidden gap-6 text-sm text-gray-400 md:flex">
            <a href="#inicio" className="hover:text-white">Dashboard</a>
            <a href="#missoes" className="hover:text-white">Missions</a>
            <a href="#roleta" className="hover:text-white">Lucky Wheel</a>
            <a href="#bridge" className="hover:text-white">Bridge</a>
            <a href="#ranking" className="hover:text-white">Leaderboard</a>
            <a href="#perfil" className="hover:text-white">My Profile</a>
          </nav>

          <WalletConnect />
        </div>
      </header>

      <div id="inicio" className="mx-auto max-w-7xl px-6 py-12">
        <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950 via-[#171536] to-[#101a35] p-8 md:p-12">
          <div className="relative z-10 max-w-2xl">
            <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-xs font-semibold text-violet-300">
              ✦ ZENITH EVM TESTNET
            </span>

            <h2 className="mt-7 text-4xl font-black leading-tight md:text-6xl">
              Explore Web3.
              <br />
              Complete <span className="text-violet-400">Quests.</span>
              <br />
              Earn Rewards.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-gray-300">
              Discover new opportunities in the Zenith ecosystem.
              Complete missions, collect points and climb the leaderboard.
            </p>

            <a
              href="#missoes"
              className="mt-8 inline-block rounded-xl bg-violet-600 px-7 py-4 font-bold transition hover:bg-violet-500"
            >
              Explore Missions →
            </a>
          </div>

          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        </section>

        <section className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            { label: "Available Missions", value: "03", icon: "🎯" },
            { label: "Total Rewards", value: "500 PTS", icon: "💎" },
            { label: "Network", value: "Zenith EVM", icon: "⚡" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-[#111625] p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{item.label}</span>
                <span className="text-2xl">{item.icon}</span>
              </div>
              <p className="mt-4 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </section>

        <div id="missoes">
          <Missions />
        </div>

        <div id="roleta" className="mt-14">
          <LuckyWheel />
        </div>

        <div id="bridge" className="mt-14">
          <Bridge />
        </div>

        <div id="ranking" className="mt-14">
          <Leaderboard />
        </div>

        <div id="perfil">
          <Profile />
        </div>

        <footer className="mt-16 border-t border-white/10 py-8 text-center text-xs text-gray-500">
          AIRDROP QUEST © 2026 · Built for the Zenith EVM ecosystem
        </footer>
      </div>
    </main>
  );
}