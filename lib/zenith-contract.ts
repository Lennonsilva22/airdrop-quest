
import {
  BrowserProvider,
  Contract,
  type Eip1193Provider,
} from "ethers";

export const ZENITH_CHAIN_ID = 936485;

export const AIRDROP_QUEST_CONTRACT =
  "0x252E09C1CcDbA9B19cecF50E7e15Ca2779E9a4Cf";

export const AIRDROP_QUEST_ABI = [
  "function completeMission(string missionId) external",
  "function hasCompletedMission(address wallet, string missionId) external view returns (bool)",
  "function totalCompletions() external view returns (uint256)",
  "event MissionCompleted(address indexed wallet, bytes32 indexed missionId, uint256 timestamp)",
];

export async function recordMissionOnZenith(
  ethereum: Eip1193Provider,
  expectedWallet: string,
  missionId: string
) {
  const provider = new BrowserProvider(ethereum);

  const network = await provider.getNetwork();

  if (Number(network.chainId) !== ZENITH_CHAIN_ID) {
    throw new Error("Mude sua MetaMask para a rede Zenith Testnet.");
  }

  const signer = await provider.getSigner();
  const walletAddress = await signer.getAddress();

  if (
    walletAddress.toLowerCase() !== expectedWallet.toLowerCase()
  ) {
    throw new Error("A carteira conectada não corresponde ao login.");
  }

  const contract = new Contract(
    AIRDROP_QUEST_CONTRACT,
    AIRDROP_QUEST_ABI,
    signer
  );

  const alreadyCompleted = await contract.hasCompletedMission(
    walletAddress,
    missionId
  );

  if (alreadyCompleted) {
    return {
      alreadyCompleted: true,
      transactionHash: null,
    };
  }

  const transaction = await contract.completeMission(missionId);
  const receipt = await transaction.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error("A transação da missão não foi confirmada.");
  }

  return {
    alreadyCompleted: false,
    transactionHash: receipt.hash,
  };
}
