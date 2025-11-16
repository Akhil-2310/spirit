import { NextRequest } from "next/server";
import { queryGraffitiStrokes } from "@/lib/arkivServer";
import { createPublicClient, http, parseAbi } from "viem";
import { polkadotHub } from "@/lib/chains";

const GRAFFITI_ADDRESS = process.env.NEXT_PUBLIC_GRAFFITI_CONTRACT as `0x${string}` | undefined;
const GRAFFITI_ABI = parseAbi([
  "event PixelPainted(uint16 indexed x, uint16 indexed y, uint256 indexed tokenId, uint32 color, uint64 timestamp)",
]);

const graffitiClient = createPublicClient({
  chain: polkadotHub,
  transport: http(polkadotHub.rpcUrls.default.http[0]),
});

async function queryOnchainGraffiti(limit: number) {
  if (!GRAFFITI_ADDRESS) return [];

  const toBlock = await graffitiClient.getBlockNumber();
  const fromBlock = toBlock > 10000n ? toBlock - 10000n : 0n;

  const logs = await graffitiClient.getLogs({
    address: GRAFFITI_ADDRESS,
    event: GRAFFITI_ABI[0],
    fromBlock,
    toBlock,
  });

  return logs
    .map((log) => {
      try {
        const args = (log as any).args;
        return {
          id: log.transactionHash ?? `${log.blockNumber}-${log.transactionIndex ?? 0}-${log.logIndex ?? 0}`,
          x: Number(args?.x ?? 0),
          y: Number(args?.y ?? 0),
          tokenId: (args?.tokenId ?? 0n).toString(),
          color: Number(args?.color ?? 0),
          timestamp: Number(args?.timestamp ?? 0) * 1000,
        };
      } catch (e) {
        console.error("Failed to parse graffiti log:", e);
        return null;
      }
    })
    .filter(Boolean)
    .slice(0, limit);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "500");

  try {
    // Query real data from Arkiv Network
    const strokes = await queryGraffitiStrokes(limit);
    if (strokes.length > 0) {
      return Response.json(strokes);
    }

    // Fallback to on-chain event scan if Arkiv hasn't ingested yet
    const onchain = await queryOnchainGraffiti(limit);
    return Response.json(onchain);

  } catch (error) {
    console.error("Error fetching graffiti history:", error);
    return Response.json(
      { error: "Failed to fetch graffiti history" },
      { status: 500 }
    );
  }
}
