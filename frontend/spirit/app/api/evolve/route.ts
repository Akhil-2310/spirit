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

function hashSeed(input: string) {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return h1 >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function generateSpiritSvg(attrs: { aggression: number; serenity: number; chaos: number; influence: number; connectivity: number }, label: string) {
  const seed = hashSeed(JSON.stringify(attrs) + label);
  const rand = mulberry32(seed);
  const size = 480;
  const center = size / 2;
  const layers = 6;

  const hueBase = Math.floor(lerp(0, 360, attrs.serenity / 100));
  const chaos = attrs.chaos / 100;
  const chaosIntensity = Math.pow(chaos, 1.2);
  const strokeBase = lerp(1, 6, attrs.influence / 100);

  const palette = Array.from({ length: layers }, (_, i) => {
    const hue = (hueBase + i * lerp(8, 60, chaosIntensity)) % 360;
    const sat = lerp(45, 85, attrs.aggression / 100);
    const light = lerp(35, 70, attrs.serenity / 100);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  });

  const nodes = Math.max(5, Math.round(lerp(5, 28, attrs.connectivity / 100) * (1 + 0.5 * chaosIntensity)));
  const radius = lerp(90, 220, attrs.influence / 100);
  const noiseScale = 12 + 60 * chaosIntensity;

  const points = Array.from({ length: nodes }, (_, i) => {
    const angle = 2 * Math.PI * (i / nodes) + rand() * chaos * 1.6;
    const r = radius * (0.6 + rand() * 0.8 * (1 + chaosIntensity));
    const baseX = center + Math.cos(angle) * r;
    const baseY = center + Math.sin(angle) * r;
    return {
      x: baseX + (rand() - 0.5) * noiseScale,
      y: baseY + (rand() - 0.5) * noiseScale,
    };
  });

  const lines = points.map((p, i) => {
    const q = points[(i + 1) % points.length];
    const weight = strokeBase * (0.6 + rand() * 0.8) * (1 + chaosIntensity * 0.5);
    const color = palette[i % palette.length];
    return `<line x1="${p.x.toFixed(2)}" y1="${p.y.toFixed(2)}" x2="${q.x.toFixed(2)}" y2="${q.y.toFixed(2)}" stroke="${color}" stroke-width="${weight.toFixed(2)}" stroke-linecap="round" />`;
  });

  const orbits = Array.from({ length: layers }, (_, i) => {
    const r = lerp(40, radius, i / (layers - 1)) * (0.8 + rand() * 0.4 * chaos);
    const color = palette[(palette.length - 1 - i) % palette.length];
    const dash = 4 + rand() * 14 * chaos;
    const opacity = lerp(0.08, 0.35, 1 - i / layers);
    return `<circle cx="${center}" cy="${center}" r="${r.toFixed(2)}" fill="none" stroke="${color}" stroke-opacity="${opacity.toFixed(2)}" stroke-width="${(strokeBase * 0.6).toFixed(2)}" stroke-dasharray="${dash.toFixed(1)},${(dash * 1.6).toFixed(1)}" />`;
  });

  const glow = `<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="white" stop-opacity="0.05"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient>`;
  const bg = `<rect width="${size}" height="${size}" fill="black"/><rect width="${size}" height="${size}" fill="url(#glow)"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:black">
    <defs>${glow}</defs>
    ${bg}
    ${orbits.join("\n")}
    ${lines.join("\n")}
    <circle cx="${center}" cy="${center}" r="${(10 + attrs.influence * 0.5).toFixed(2)}" fill="${palette[0]}" fill-opacity="0.9" />
    <text x="${center}" y="${size - 24}" text-anchor="middle" fill="white" fill-opacity="0.7" font-size="16" font-family="monospace">${label}</text>
  </svg>`;

  return svg;
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
    image: generateSpiritSvg(attrs, `Spirit ${tokenId.toString()}`),
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
      chain: polkadotHub,
      account: getEvolutionAccount(),
      abi: SOUL_ABI,
      functionName: "evolveSpirit",
      args: [tokenId, attrs.aggression, attrs.serenity, attrs.chaos, attrs.influence, attrs.connectivity],
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash });

    // 5. Store snapshot and art to Arkiv
    await storeToArkiv(address, tokenId, attrs);

    const image = generateSpiritSvg(attrs, `Spirit ${tokenId.toString()}`);

    return Response.json({
      success: true,
      tokenId: tokenId.toString(),
      attributes: attrs,
      txHash: hash,
      image,
    });
  } catch (error: any) {
    console.error("Evolution error:", error);
    return Response.json(
      { error: "Evolution failed", message: error.message },
      { status: 500 }
    );
  }
}
