import { NextRequest } from "next/server";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { stringToPayload } from "@arkiv-network/sdk/utils";
import { createWalletClient as createArkivWallet, http as arkivHttp } from "@arkiv-network/sdk";
import { mendoza } from "@arkiv-network/sdk/chains";

const POLKADOT_RPC = "https://testnet-passet-hub-eth-rpc.polkadot.io";
const BLOCKSCOUT_BASE = "https://blockscout-passet-hub.parity-testnet.parity.io";
const polkadotHub = {
  id: 420420422,
  name: "Polkadot Hub TestNet",
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  rpcUrls: { default: { http: [POLKADOT_RPC] } },
};

const SOUL_ABI = parseAbi([
  "function spiritOf(address owner) view returns (uint256)",
  "function getSpirit(uint256 tokenId) view returns (uint32, uint32, uint32, uint32, uint32, uint64)",
  "function evolveSpirit(uint256 tokenId, uint32 aggression, uint32 serenity, uint32 chaos, uint32 influence, uint32 connectivity) external",
]);

const publicClient = createPublicClient({
  chain: polkadotHub,
  transport: http(POLKADOT_RPC),
});

function normalizePrivateKey(value: string | undefined, name: string): `0x${string}` {
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`${name} must be a 32-byte hex string`);
  }
  return `0x${hex}` as `0x${string}`;
}

function getSoulAddress(): `0x${string}` {
  const address = process.env.NEXT_PUBLIC_SOUL_CONTRACT;
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    throw new Error("NEXT_PUBLIC_SOUL_CONTRACT is missing or invalid");
  }
  return address as `0x${string}`;
}

let evolutionAccount:
  | ReturnType<typeof privateKeyToAccount>
  | null = null;
let walletClient:
  | ReturnType<typeof createWalletClient>
  | null = null;
let arkivWallet:
  | ReturnType<typeof createArkivWallet>
  | null = null;

function getEvolutionAccount() {
  if (!evolutionAccount) {
    const key = normalizePrivateKey(process.env.EVOLUTION_PRIVATE_KEY, "EVOLUTION_PRIVATE_KEY");
    evolutionAccount = privateKeyToAccount(key);
  }
  return evolutionAccount;
}

function getWalletClient() {
  if (!walletClient) {
    walletClient = createWalletClient({
      account: getEvolutionAccount(),
      chain: polkadotHub,
      transport: http(POLKADOT_RPC),
    });
  }
  return walletClient;
}

function getArkivWallet() {
  if (!arkivWallet) {
    const key = normalizePrivateKey(process.env.ARKIV_PRIVATE_KEY, "ARKIV_PRIVATE_KEY");
    arkivWallet = createArkivWallet({
      chain: mendoza,
      transport: arkivHttp("https://mendoza.hoodi.arkiv.network/rpc"),
      account: privateKeyToAccount(key),
    });
  }
  return arkivWallet;
}

// Fetch transactions from Blockscout
async function fetchTransactions(address: string) {
  const url = `${BLOCKSCOUT_BASE}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc`;
  const res = await fetch(url);
  const json = await res.json();
  return json.status === "1" ? json.result : [];
}

// Compute attributes from transaction history
function computeAttributes(txs: any[], address: string) {
  if (txs.length === 0) {
    return { aggression: 10, serenity: 60, chaos: 10, influence: 5, connectivity: 5 };
  }

  const outgoing = txs.filter((t: any) => t.from.toLowerCase() === address.toLowerCase());
  const peers = new Set<string>();
  txs.forEach((t: any) => {
    if (t.from.toLowerCase() === address.toLowerCase() && t.to) peers.add(t.to.toLowerCase());
    if (t.to?.toLowerCase() === address.toLowerCase()) peers.add(t.from.toLowerCase());
  });

  const contractCalls = outgoing.filter((t: any) => t.input && t.input !== "0x").length;
  const timestamps = txs.map((t: any) => Number(t.timeStamp)).sort((a, b) => a - b);
  const deltas = timestamps.slice(1).map((t, i) => t - timestamps[i]);
  const meanDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const variance = deltas.length && meanDelta
    ? deltas.reduce((acc, d) => acc + (d - meanDelta) ** 2, 0) / deltas.length
    : 0;

  const clamp = (x: number) => Math.max(0, Math.min(1, x));

  const aggression = Math.round(100 * (0.5 * clamp(outgoing.length / 50) + 0.3 * clamp(contractCalls / 20)));
  const serenity = Math.round(100 * (0.6 * clamp((outgoing.length - contractCalls) / Math.max(1, outgoing.length)) + 0.4 * (1 - clamp(outgoing.length / 50))));
  const chaos = Math.round(100 * clamp(variance / (24 * 60 * 60)));
  const influence = Math.round(100 * (0.6 * clamp(txs.length / 200) + 0.4 * clamp(peers.size / 100)));
  const connectivity = Math.round(100 * clamp(peers.size / 100));

  return { aggression, serenity, chaos, influence, connectivity };
}

// Store snapshot to Arkiv with TTL
async function storeToArkiv(spiritAddress: string, tokenId: bigint, attrs: any) {
  const stage = attrs.influence > 70 && attrs.connectivity > 60 ? "ascended"
    : attrs.aggression > 50 || attrs.chaos > 50 ? "wild" : "seed";

  const payload = stringToPayload(JSON.stringify({
    spiritAddress,
    tokenId: tokenId.toString(),
    ...attrs,
    stage,
    createdAt: Date.now(),
  }));

  const arkiv = getArkivWallet();

  await arkiv.createEntity({
    payload,
    contentType: "application/json",
    attributes: [
      { key: "type", value: "spiritSnapshot" },
      { key: "spiritAddress", value: spiritAddress.toLowerCase() },
      { key: "tokenId", value: tokenId.toString() },
      { key: "stage", value: stage },
    ],
    expiresIn:  60 * 60, // 1 hour - old ones auto-expire
  });
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    const soulAddress = getSoulAddress();
    if (!address || !address.startsWith("0x")) {
      return Response.json({ error: "Invalid address" }, { status: 400 });
    }

    // 1. Check if user has a Spirit
    const tokenId = (await publicClient.readContract({
      address: soulAddress,
      abi: SOUL_ABI,
      functionName: "spiritOf",
      args: [address as `0x${string}`],
    })) as bigint;

    if (tokenId === 0n) {
      return Response.json({ error: "No spirit found for this address" }, { status: 404 });
    }

    // 2. Fetch transaction history
    const txs = await fetchTransactions(address);

    // 3. Compute new attributes
    const attrs = computeAttributes(txs, address);

    // 4. Update Spirit on-chain
    const hash = await getWalletClient().writeContract({
      address: soulAddress,
      chain: polkadotHub as any,
      abi: SOUL_ABI,
      functionName: "evolveSpirit",
      args: [tokenId, attrs.aggression, attrs.serenity, attrs.chaos, attrs.influence, attrs.connectivity],
      account: null
    }) as `0x${string}`;
  } catch (error: any) {
    console.error("Evolution error:", error);
    return Response.json(
      { error: "Evolution failed", message: error.message },
      { status: 500 }
    );
  }
}
