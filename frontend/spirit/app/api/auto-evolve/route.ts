import { NextRequest } from "next/server";

/**
 * Auto-evolve endpoint
 * Checks if spirit needs evolution and triggers it automatically
 */
export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address || !address.startsWith("0x")) {
      return Response.json({ error: "Invalid address" }, { status: 400 });
    }

    // Call the evolution endpoint
    const response = await fetch(`${req.nextUrl.origin}/api/evolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Evolution failed, but that's ok - maybe no transactions yet
      return Response.json({
        evolved: false,
        reason: data.message || "No evolution needed",
      });
    }

    return Response.json({
      evolved: true,
      ...data,
    });
  } catch (error: any) {
    console.error("Auto-evolve error:", error);
    return Response.json(
      { evolved: false, error: error.message },
      { status: 200 } // Don't fail the frontend
    );
  }
}

