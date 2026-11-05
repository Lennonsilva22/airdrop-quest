
"use client";

import { useEffect, useState } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import Link from "next/link";

const RPC_URL = "https://rpc.testnet.zenith.network/";
const CHAIN_ID = 936485;

const CONTRACT_ADDRESS =
  "0x252E09C1CcDbA9B19cecF50E7e15Ca2779E9a4Cf";

const WALLET_ADDRESS =
  "0x4476067eD86Ad9458194f54E0c11FECF261d65c2";

const EXPLORER_URL =
  "https://explorer.testnet.zenith.network";

const ABI = [
  "function totalCompletions() view returns (uint256)",
  "function hasCompletedMission(address wallet, string missionId) view returns (bool)",
];

const missions = [
  {
    id: "explore-zenith",
    name: "Explore Zenith",
    points: 100,
    description: "Exploração da rede Zenith EVM.",
  },
  {
    id: "connect-wallet",
    name: "Connect Wallet",
    points: 150,
    description: "Conexão da carteira à aplicação.",
  },
  {
    id: "first-transaction",
    name: "First Transaction",
    points: 250,
    description: "Verificação da primeira transação.",
  },
];

const architecture = [
  {
    number: "01",
    name: "Frontend",
    technology: "Next.js + React",
    description:
      "User interface, wallet connection, mission experience and application navigation.",
  },
  {
    number: "02",
    name: "Wallet",
    technology: "MetaMask + ethers.js",
    description:
      "Connects the user's wallet, checks the active network and signs blockchain transactions.",
  },
  {
    number: "03",
    name: "Blockchain",
    technology: "Zenith EVM + Solidity",
    description:
      "Stores mission completion records in a smart contract deployed on Zenith Testnet.",
  },
  {
    number: "04",
    name: "RPC",
    technology: "Zenith Testnet RPC",
    description:
      "Provides blockchain reads and access to the EVM network.",
  },
  {
    number: "05",
    name: "Backend",
    technology: "Supabase",
    description:
      "Manages user profiles, mission points, leaderboard and application data.",
  },
  {
    number: "06",
    name: "Verification",
    technology: "Smart contract + transaction hash",
    description:
      "Checks on-chain mission status and validates transaction information before processing rewards.",
  },
];

type MissionStatus = {
  id: string;
  completed: boolean;
};

export default function ZenithDemoPage() {
  const [copied, setCopied] = useState(false);
  const [totalCompletions, setTotalCompletions] = useState<string | null>(null);
  const [missionStatuses, setMissionStatuses] = useState<MissionStatus[]>([]);
  const [loadingBlockchain, setLoadingBlockchain] = useState(true);
  const [blockchainError, setBlockchainError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadBlockchainData() {
      try {
        setLoadingBlockchain(true);
        setBlockchainError("");

        const provider = new JsonRpcProvider(RPC_URL);
        const network = await provider.getNetwork();

        if (Number(network.chainId) !== CHAIN_ID) {
          throw new Error("A rede RPC retornou um Chain ID diferente.");
        }

        const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

        const total = await contract.totalCompletions();
        setTotalCompletions(total.toString());

        const statuses = await Promise.all(
          missions.map(async (mission) => {
            const completed = await contract.hasCompletedMission(
              WALLET_ADDRESS,
              mission.id
            );

            return {
              id: mission.id,
              completed: Boolean(completed),
            };
          })
        );

        setMissionStatuses(statuses);
      } catch (error) {
        console.error("Erro ao consultar a Zenith:", error);
        setBlockchainError(
          "Não foi possível carregar os dados da blockchain. Tente atualizar a página."
        );
      } finally {
        setLoadingBlockchain(false);
      }
    }

    loadBlockchainData();
  }, [refreshKey]);

  async function copyContract() {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function missionIsCompleted(id: string) {
    return missionStatuses.find((mission) => mission.id === id)?.completed;
  }

  return (
    <main className="min-h-screen bg-[#070b16] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <header className="mb-16 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xl font-black tracking-wider text-cyan-400">
              AIRDROP QUEST
            </p>
            <p className="text-xs text-slate-400">
              Community blockchain project
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm transition hover:border-cyan-400 hover:text-cyan-400"
          >
            ← Back to application
          </Link>
        </header>

        <section className="mb-20 text-center">
          <div className="mb-6 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300">
            BUILT ON ZENITH EVM TESTNET
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Building on <span className="text-cyan-400">Zenith</span>
            <br />
            One mission at a time.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
            Airdrop Quest is an independent community project exploring
            blockchain interactions, on-chain mission verification and
            ecosystem participation on Zenith.
          </p>
        </section>

        <section className="mb-16">
          <SectionTitle>Network integration</SectionTitle>

          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard title="Network" value="Zenith EVM Testnet" detail="Connected to Zenith RPC" />
            <InfoCard title="Chain ID" value={CHAIN_ID.toString()} detail="EVM compatible network" />
            <InfoCard title="Native token" value="ZTH" detail="Zenith testnet gas token" />
            <InfoCard title="Wallet" value="MetaMask" detail="Wallet connection and signing" />
            <InfoCard title="Backend" value="Supabase" detail="Profiles, points and missions" />
            <InfoCard title="Smart contract" value="Solidity" detail="Deployed and tested on Zenith" />
          </div>
        </section>

        <section className="mb-16">
          <SectionTitle>Live blockchain data</SectionTitle>

          <div className="rounded-2xl border border-cyan-500/20 bg-[#0d1628] p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">
                  Zenith EVM — On-chain verification
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Data queried directly from the deployed smart contract.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-400">
                  LIVE RPC
                </span>

                <button
                  onClick={() => setRefreshKey((value) => value + 1)}
                  disabled={loadingBlockchain}
                  className="rounded-lg border border-cyan-500/40 px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/10 disabled:opacity-50"
                >
                  {loadingBlockchain ? "Consultando..." : "↻ Atualizar dados"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-[#080f1d] p-5">
                <p className="text-sm text-slate-400">
                  Total on-chain completions
                </p>
                <p className="mt-2 text-4xl font-black text-cyan-400">
                  {loadingBlockchain ? "..." : totalCompletions ?? "--"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Read from totalCompletions()
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#080f1d] p-5">
                <p className="text-sm text-slate-400">Wallet checked</p>
                <p className="mt-3 break-all text-sm font-semibold text-cyan-300">
                  {WALLET_ADDRESS}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Mission ownership verification
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="mb-4 font-bold">On-chain mission status</h4>

              <div className="space-y-3">
                {missions.map((mission) => {
                  const completed = missionIsCompleted(mission.id);

                  return (
                    <div
                      key={mission.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-[#080f1d] p-4"
                    >
                      <div>
                        <p className="font-semibold">{mission.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {mission.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">
                          {mission.points} PTS
                        </span>

                        {loadingBlockchain ? (
                          <span className="text-xs text-slate-400">
                            Checking...
                          </span>
                        ) : completed ? (
                          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                            ✓ Verified on-chain
                          </span>
                        ) : (
                          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400">
                            Not registered
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {blockchainError && (
              <p className="mt-4 text-sm text-red-400">{blockchainError}</p>
            )}

            <p className="mt-5 text-xs text-slate-500">
              Information retrieved using read-only calls to the Zenith
              EVM testnet RPC.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <SectionTitle>Smart contract deployment</SectionTitle>

          <div className="rounded-2xl border border-slate-700 bg-[#0d1628] p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Airdrop Quest contract</p>
                <p className="mt-2 break-all font-mono text-sm text-cyan-300">
                  {CONTRACT_ADDRESS}
                </p>
              </div>

              <button
                onClick={copyContract}
                className="rounded-lg border border-cyan-500/40 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/10"
              >
                {copied ? "Copied!" : "Copy address"}
              </button>
            </div>

            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-cyan-400 hover:underline"
            >
              View contract on Zenith Explorer ↗
            </a>
          </div>
        </section>

        <section className="mb-16">
          <SectionTitle>Technical architecture</SectionTitle>

          <p className="mb-6 max-w-3xl text-sm leading-7 text-slate-400">
            A modular architecture combining an EVM-compatible blockchain,
            wallet infrastructure and off-chain application services.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {architecture.map((item) => (
              <div
                key={item.number}
                className="rounded-xl border border-slate-700 bg-[#0d1628] p-5"
              >
                <p className="text-sm font-bold text-cyan-400">
                  COMPONENT {item.number}
                </p>
                <h3 className="mt-3 text-lg font-bold">{item.name}</h3>
                <p className="mt-1 text-sm font-semibold text-cyan-300">
                  {item.technology}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <h3 className="font-bold text-cyan-300">
              Integration flow
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              User → Next.js application → MetaMask → Zenith EVM →
              Smart contract. Supabase separately manages application
              profiles and points, while blockchain reads verify mission
              records on-chain.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <SectionTitle>Project features</SectionTitle>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard number="01" title="Wallet integration" description="Connects user wallets through MetaMask and checks the Zenith EVM network." />
            <FeatureCard number="02" title="On-chain missions" description="Mission completion is recorded and verified through a deployed Solidity contract." />
            <FeatureCard number="03" title="Points system" description="Supabase manages user profiles, mission points and leaderboard data." />
            <FeatureCard number="04" title="Transaction verification" description="The application validates a transaction hash before processing the mission reward." />
            <FeatureCard number="05" title="Network exploration" description="The project reads network information and token balances from Zenith." />
            <FeatureCard number="06" title="Future expansion" description="Designed to explore additional ecosystem integrations and community activities." />
          </div>
        </section>

        <section className="mb-16">
          <SectionTitle>Development roadmap</SectionTitle>

          <div className="space-y-4">
            <RoadmapItem status="COMPLETED" title="Zenith EVM integration" description="Wallet connection, network detection and RPC integration." />
            <RoadmapItem status="COMPLETED" title="Smart contract deployment" description="Airdrop Quest Solidity contract deployed on Zenith Testnet." />
            <RoadmapItem status="COMPLETED" title="On-chain mission verification" description="Mission status verified directly through the deployed contract." />
            <RoadmapItem status="IN PROGRESS" title="Expanded Zenith ecosystem exploration" description="Further experimentation with network services and community use cases." />
            <RoadmapItem status="PENDING" title="Canton Network integration" description="Pending participant and Party ID configuration." />
          </div>
        </section>

        <footer className="border-t border-slate-800 pt-8 text-center">
          <p className="text-sm font-bold text-cyan-400">AIRDROP QUEST</p>
          <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-slate-500">
            Independent community development project built for
            experimentation and ecosystem participation. This project
            does not claim to be an official Zenith product or partnership.
            Testnet assets have no guaranteed monetary value.
          </p>
        </footer>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-6 text-2xl font-black md:text-3xl">{children}</h2>
  );
}

function InfoCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#0d1628] p-5">
      <p className="text-xs uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-3 text-lg font-bold text-cyan-300">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function FeatureCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#0d1628] p-5">
      <p className="text-sm font-bold text-cyan-400">{number}</p>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function RoadmapItem({
  status,
  title,
  description,
}: {
  status: string;
  title: string;
  description: string;
}) {
  const completed = status === "COMPLETED";
  const inProgress = status === "IN PROGRESS";

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-700 bg-[#0d1628] p-5">
      <span
        className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
          completed
            ? "bg-green-400"
            : inProgress
              ? "bg-cyan-400"
              : "bg-slate-500"
        }`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-bold">{title}</h3>
          <span
            className={`text-xs font-semibold ${
              completed
                ? "text-green-400"
                : inProgress
                  ? "text-cyan-400"
                  : "text-slate-500"
            }`}
          >
            {status}
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}
