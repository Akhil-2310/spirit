// frontend/lib/arkivClient.ts

export type SpiritSnapshot = {
  id: string;
  spiritAddress: string;
  tokenId: string;
  aggression: number;
  serenity: number;
  chaos: number;
  influence: number;
  connectivity: number;
  stage: string;
  createdAt: number; // ms timestamp
};

export type GraffitiStroke = {
  id: string;
  x: number;
  y: number;
  tokenId: string;
  color: number;
  timestamp: number; // ms timestamp
};

/**
 * Fetch evolution history for a given Soul from your API,
 * which in turn queries Arkiv.
 *
 * Backed by: GET /api/spirit-history?spiritAddress=...&tokenId=...
 */
export async function fetchSpiritSnapshots(params: {
  spiritAddress: string;
  tokenId: string;
}): Promise<SpiritSnapshot[]> {
  const url = `/api/spirit-history?spiritAddress=${encodeURIComponent(
    params.spiritAddress
  )}&tokenId=${encodeURIComponent(params.tokenId)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch spirit snapshots: ${res.statusText}`);
  }
  const data = (await res.json()) as SpiritSnapshot[];
  return data;
}

/**
 * Fetch recent graffiti strokes from your API (Arkiv-backed).
 *
 * Backed by something like:
 * GET /api/graffiti-history?limit=...
 */
export async function fetchGraffitiStrokes(limit = 500): Promise<GraffitiStroke[]> {
  const url = `/api/graffiti-history?limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch graffiti strokes: ${res.statusText}`);
  }
  const data = (await res.json()) as GraffitiStroke[];
  return data;
}
