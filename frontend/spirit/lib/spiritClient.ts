// frontend/lib/spiritClient.ts
import { createPublicClient, http, parseAbi } from "viem";
import { polkadotHub } from "./chains";

export type SpiritAttrs = {
  aggression: number;
  serenity: number;
  chaos: number;
  influence: number;
  connectivity: number;
  lastUpdated: number;
};

const SOUL_ADDRESS = process.env.NEXT_PUBLIC_SOUL_CONTRACT as `0x${string}`;

if (!SOUL_ADDRESS) {
  console.warn("[spiritClient] NEXT_PUBLIC_SOUL_CONTRACT is not set");
}

const SOUL_ABI = parseAbi([
  "function spiritOf(address owner) view returns (uint256)",
  "function getSpirit(uint256 tokenId) view returns (uint32, uint32, uint32, uint32, uint32, uint64)",
  "function tokenURI(uint256 tokenId) view returns (string)",
]);

const publicClient = createPublicClient({
  chain: polkadotHub,
  transport: http(polkadotHub.rpcUrls.default.http[0]),
});

/**
 * Returns the Soul tokenId for an address, or null if none.
 */
export async function getSoulTokenIdForAddress(
  owner: `0x${string}`
): Promise<bigint | null> {
  if (!SOUL_ADDRESS) return null;

  const tokenId = (await publicClient.readContract({
    address: SOUL_ADDRESS,
    abi: SOUL_ABI,
    functionName: "spiritOf",
    args: [owner],
  })) as bigint;

  return tokenId === 0n ? null : tokenId;
}

/**
 * Returns Spirit attributes for a tokenId.
 */
export async function getSpiritAttrs(tokenId: bigint): Promise<SpiritAttrs> {
  if (!SOUL_ADDRESS) {
    throw new Error("NEXT_PUBLIC_SOUL_CONTRACT is not set");
  }

  const res = (await publicClient.readContract({
    address: SOUL_ADDRESS,
    abi: SOUL_ABI,
    functionName: "getSpirit",
    args: [tokenId],
  })) as readonly [number, number, number, number, number, bigint];

  return {
    aggression: Number(res[0]),
    serenity: Number(res[1]),
    chaos: Number(res[2]),
    influence: Number(res[3]),
    connectivity: Number(res[4]),
    lastUpdated: Number(res[5]),
  };
}

/**
 * Convenience: get tokenId + attrs in one go.
 */
export async function getSoulForAddress(owner: `0x${string}`) {
  const tokenId = await getSoulTokenIdForAddress(owner);
  if (!tokenId) {
    return { tokenId: null, attrs: null };
  }
  const attrs = await getSpiritAttrs(tokenId);
  return { tokenId, attrs };
}

/**
 * Optional helper: fetch tokenURI for debugging / marketplaces.
 */
export async function getTokenURI(tokenId: bigint): Promise<string> {
  if (!SOUL_ADDRESS) {
    throw new Error("NEXT_PUBLIC_SOUL_CONTRACT is not set");
  }

  const uri = (await publicClient.readContract({
    address: SOUL_ADDRESS,
    abi: SOUL_ABI,
    functionName: "tokenURI",
    args: [tokenId],
  })) as string;

  return uri;
}
