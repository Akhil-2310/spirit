import { NextRequest } from "next/server";
import { querySpiritSnapshots } from "@/lib/arkivServer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const spiritAddress = searchParams.get("spiritAddress");
  const tokenId = searchParams.get("tokenId");

  if (!spiritAddress || !tokenId) {
    return new Response("Missing params", { status: 400 });
  }

  try {
    // Query real data from Arkiv Network
    const snapshots = await querySpiritSnapshots({
      spiritAddress,
      tokenId,
    });

    // Sort by timestamp descending (newest first)
    snapshots.sort((a: { createdAt: number; }, b: { createdAt: number; }) => b.createdAt - a.createdAt);

    return Response.json(snapshots);
  } catch (error) {
    console.error("Error fetching spirit history:", error);
    return Response.json(
      { error: "Failed to fetch spirit history" },
      { status: 500 }
    );
  }
}
