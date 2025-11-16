import { NextRequest } from "next/server";
import { queryGraffitiStrokes } from "@/lib/arkivServer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "500");

  try {
    // Query real data from Arkiv Network
    const strokes = await queryGraffitiStrokes(limit);

    return Response.json(strokes);
  } catch (error) {
    console.error("Error fetching graffiti history:", error);
    return Response.json(
      { error: "Failed to fetch graffiti history" },
      { status: 500 }
    );
  }
}
