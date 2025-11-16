import { NextRequest } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";

const SOUL_ADDRESS = process.env.NEXT_PUBLIC_SOUL_CONTRACT! as `0x${string}`;

const polkadotHub = {
  id: 420420422,
  name: "Polkadot Hub TestNet",
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"] } },
};

const SOUL_ABI = parseAbi([
  "function getSpirit(uint256 tokenId) view returns (uint32, uint32, uint32, uint32, uint32, uint64)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

const publicClient = createPublicClient({
  chain: polkadotHub,
  transport: http(polkadotHub.rpcUrls.default.http[0]),
});

interface SpiritAttributes {
  aggression: number;
  serenity: number;
  chaos: number;
  influence: number;
  connectivity: number;
}

function getStage(attrs: SpiritAttributes): string {
  if (attrs.influence > 70 && attrs.connectivity > 60) return "Ascended";
  if (attrs.aggression > 50 || attrs.chaos > 50) return "Wild";
  return "Seed";
}

function generateDescription(attrs: SpiritAttributes, tokenId: string): string {
  const stage = getStage(attrs);
  const traits = [];

  if (attrs.aggression > 60) traits.push("fiercely aggressive");
  else if (attrs.aggression > 30) traits.push("assertive");
  else traits.push("peaceful");

  if (attrs.serenity > 60) traits.push("serene");
  else if (attrs.serenity < 30) traits.push("restless");

  if (attrs.chaos > 60) traits.push("wildly chaotic");
  else if (attrs.chaos > 30) traits.push("unpredictable");

  if (attrs.influence > 60) traits.push("highly influential");
  if (attrs.connectivity > 60) traits.push("deeply connected");

  return `Polkadot Spirit #${tokenId} - A ${stage} stage spirit that is ${traits.join(", ")}. This living NFT evolves based on on-chain behavior, expressed through generative art, music, and collaborative graffiti.`;
}

function generateImageSVG(attrs: SpiritAttributes, tokenId: string): string {
  const stage = getStage(attrs);

  // Color based on attributes
  const hueAggression = (attrs.aggression / 100) * 30;
  const hueChaos = 240 + (attrs.chaos / 100) * 60;
  const hueSerenity = 180 + (attrs.serenity / 100) * 60;

  const dominantHue =
    attrs.aggression > 50 ? hueAggression : attrs.chaos > 40 ? hueChaos : hueSerenity;

  const bgColor = `hsl(${dominantHue}, 30%, 10%)`;
  const primaryColor = `hsl(${dominantHue}, 80%, 60%)`;
  const secondaryColor = `hsl(${(dominantHue + 60) % 360}, 70%, 50%)`;

  const size = 100 + attrs.influence;
  const points = 6 + Math.floor(attrs.connectivity / 15);

  // Generate blob points
  let pathData = "";
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const radiusVariation = 1 + (attrs.chaos / 100) * 0.5 * Math.sin(i * 2);
    const radius = size * radiusVariation;
    const x = 256 + Math.cos(angle) * radius;
    const y = 256 + Math.sin(angle) * radius;
    pathData += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  pathData += " Z";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
        <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
      </radialGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:0.8" />
        <stop offset="50%" style="stop-color:${secondaryColor};stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0" />
      </radialGradient>
    </defs>
    
    <rect width="512" height="512" fill="url(#bg)"/>
    
    <!-- Outer glow -->
    <circle cx="256" cy="256" r="${size * 1.5}" fill="url(#glow)" opacity="0.4"/>
    
    <!-- Main spirit body -->
    <path d="${pathData}" fill="${primaryColor}" opacity="0.9"/>
    <path d="${pathData}" fill="none" stroke="${secondaryColor}" stroke-width="3" opacity="0.6"/>
    
    <!-- Inner core -->
    <circle cx="256" cy="256" r="${size * 0.3}" fill="${secondaryColor}" opacity="0.8"/>
    <circle cx="256" cy="256" r="${size * 0.15}" fill="white" opacity="0.9"/>
    
    <!-- Stage badge -->
    <rect x="10" y="10" width="120" height="40" rx="20" fill="rgba(0,0,0,0.7)"/>
    <text x="70" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" 
          fill="${primaryColor}" text-anchor="middle">${stage}</text>
    
    <!-- Token ID -->
    <text x="256" y="490" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
          fill="white" text-anchor="middle" opacity="0.7">#${tokenId}</text>
  </svg>`;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tokenId } = await context.params;

    // Fetch spirit data (returns tuple: [aggression, serenity, chaos, influence, connectivity, lastUpdated])
    const result = (await publicClient.readContract({
      address: SOUL_ADDRESS,
      abi: SOUL_ABI,
      functionName: "getSpirit",
      args: [BigInt(tokenId)],
    })) as readonly [number, number, number, number, number, bigint];

    const attrs: SpiritAttributes = {
      aggression: Number(result[0]),
      serenity: Number(result[1]),
      chaos: Number(result[2]),
      influence: Number(result[3]),
      connectivity: Number(result[4]),
    };

    const stage = getStage(attrs);

    // Generate SVG image
    const svgImage = generateImageSVG(attrs, tokenId);
    const base64Image = Buffer.from(svgImage).toString("base64");
    const imageDataUri = `data:image/svg+xml;base64,${base64Image}`;

    // Build metadata
    const metadata = {
      name: `Polkadot Spirit #${tokenId}`,
      description: generateDescription(attrs, tokenId),
      image: imageDataUri,
      external_url: `${req.nextUrl.origin}/spirit/${tokenId}`,
      attributes: [
        {
          trait_type: "Stage",
          value: stage,
        },
        {
          trait_type: "Aggression",
          value: attrs.aggression,
          max_value: 100,
        },
        {
          trait_type: "Serenity",
          value: attrs.serenity,
          max_value: 100,
        },
        {
          trait_type: "Chaos",
          value: attrs.chaos,
          max_value: 100,
        },
        {
          trait_type: "Influence",
          value: attrs.influence,
          max_value: 100,
        },
        {
          trait_type: "Connectivity",
          value: attrs.connectivity,
          max_value: 100,
        },
      ],
    };

    return Response.json(metadata);
  } catch (e: any) {
    console.error("Metadata generation error:", e);
    return Response.json(
      { error: "Failed to generate metadata", details: e.message },
      { status: 500 }
    );
  }
}
