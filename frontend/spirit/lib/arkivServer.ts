// Server-side Arkiv client for API routes
import { createPublicClient as createArkivPublic, http as arkivHttp } from "@arkiv-network/sdk";
import { mendoza } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";

// Helper to decode Arkiv payload (Uint8Array) to string
function payloadToString(payload: Uint8Array): string {
  return new TextDecoder().decode(payload);
}

// Create public client for reading from Arkiv
export const arkivPublic = createArkivPublic({
  chain: mendoza,
  transport: arkivHttp("https://mendoza.hoodi.arkiv.network/rpc"),
});

/**
 * Query spirit evolution snapshots from Arkiv
 */
export async function querySpiritSnapshots(params: {
  spiritAddress: string;
  tokenId: string;
}) {
  const { spiritAddress, tokenId } = params;

  try {
    const result = await arkivPublic
      .buildQuery()
      .where([
        eq("type", "spiritSnapshot"),
        eq("spiritAddress", spiritAddress.toLowerCase()),
        eq("tokenId", tokenId),
      ])
      .withPayload(true)
      .fetch();

    // Parse entities to snapshots
    const snapshots = result.entities.map((entity: any) => {
      try {
        const data = JSON.parse(payloadToString(entity.payload));
        return {
          id: entity.entityKey,
          ...data,
        };
      } catch (e) {
        console.error("Failed to parse entity:", e);
        return null;
      }
    }).filter(Boolean);

    return snapshots;
  } catch (error) {
    console.error("Error querying spirit snapshots from Arkiv:", error);
    // Return empty array on error - frontend will handle gracefully
    return [];
  }
}

/**
 * Query graffiti strokes from Arkiv
 */
export async function queryGraffitiStrokes(limit = 500) {
  try {
    const result = await arkivPublic
      .buildQuery()
      .where([eq("type", "graffitiStroke")])
      .withPayload(true)
      .fetch();

    // Parse entities to strokes
    const strokes = result.entities
      .map((entity: any) => {
        try {
          const data = JSON.parse(payloadToString(entity.payload));
          return {
            id: entity.entityKey,
            x: data.x,
            y: data.y,
            tokenId: data.tokenId,
            color: data.color,
            timestamp: data.timestamp,
          };
        } catch (e) {
          console.error("Failed to parse graffiti entity:", e);
          return null;
        }
      })
      .filter(Boolean)
      .slice(0, limit);

    return strokes;
  } catch (error) {
    console.error("Error querying graffiti strokes from Arkiv:", error);
    return [];
  }
}

console.log("✅ Arkiv server client initialized for API routes");
