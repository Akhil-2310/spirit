"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPublicClient, http, parseAbi } from "viem";
import { polkadotHub } from "@/lib/chains";
import { SpiritCanvas } from "@/components/SpiritCanvas";
import { SpiritMusic } from "@/components/SpiritMusic";
import { fetchSpiritSnapshots, SpiritSnapshot } from "@/lib/arkivClient";

const SOUL_ADDRESS = process.env.NEXT_PUBLIC_SOUL_CONTRACT! as `0x${string}`;

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
  lastUpdated: number;
}

export default function SpiritDetail() {
  const params = useParams();
  const router = useRouter();
  const tokenId = params?.id as string;

  const [attrs, setAttrs] = useState<SpiritAttributes | null>(null);
  const [owner, setOwner] = useState<string>("");
  const [history, setHistory] = useState<SpiritSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tokenId) return;

    (async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch current state (returns tuple: [aggression, serenity, chaos, influence, connectivity, lastUpdated])
        const result = (await publicClient.readContract({
          address: SOUL_ADDRESS,
          abi: SOUL_ABI,
          functionName: "getSpirit",
          args: [BigInt(tokenId)],
        })) as readonly [number, number, number, number, number, bigint];

        const ownerAddr = (await publicClient.readContract({
          address: SOUL_ADDRESS,
          abi: SOUL_ABI,
          functionName: "ownerOf",
          args: [BigInt(tokenId)],
        })) as string;

        setAttrs({
          aggression: Number(result[0]),
          serenity: Number(result[1]),
          chaos: Number(result[2]),
          influence: Number(result[3]),
          connectivity: Number(result[4]),
          lastUpdated: Number(result[5]),
        });
        setOwner(ownerAddr);

        // Fetch evolution history
        try {
          const snapshots = await fetchSpiritSnapshots({
            spiritAddress: ownerAddr,
            tokenId: tokenId,
          });
          setHistory(snapshots.sort((a, b) => b.createdAt - a.createdAt));
        } catch (e) {
          console.warn("Could not load history:", e);
        }
      } catch (e: any) {
        console.error("Error loading spirit:", e);
        setError(e.message || "Failed to load spirit");
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Spirit...</p>
        </div>
      </main>
    );
  }

  if (error || !attrs) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-red-400">Spirit Not Found</h1>
          <p className="text-gray-400 mb-6">{error || "This spirit does not exist"}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-xl font-semibold transition-all"
          >
            Go Home
          </button>
        </div>
      </main>
    );
  }

  const stage =
    attrs.influence > 70 && attrs.connectivity > 60
      ? "Ascended"
      : attrs.aggression > 50 || attrs.chaos > 50
      ? "Wild"
      : "Seed";

  const stageColor =
    stage === "Ascended" ? "text-yellow-400" : stage === "Wild" ? "text-red-400" : "text-green-400";

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-gradient-to-b from-purple-900/20 to-transparent">
        <div className="max-w-7xl mx-auto p-8">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-white mb-4 transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
                Polkadot Spirit #{tokenId}
              </h1>
              <p className="text-gray-400 text-sm">
                Owner: <span className="font-mono">{owner.slice(0, 6)}...{owner.slice(-4)}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Evolution Stage</div>
              <div className={`text-3xl font-bold ${stageColor}`}>{stage}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid lg:grid-cols-[600px_1fr] gap-8 mb-12">
          {/* Visualization */}
          <div className="space-y-6">
            <div className="border border-white/10 rounded-2xl p-6 bg-gradient-to-br from-purple-900/20 to-transparent">
              <h2 className="text-xl font-semibold mb-4">Spirit Visualization</h2>
              <SpiritCanvas attrs={attrs} />
            </div>

            <div className="flex justify-center">
              <SpiritMusic attrs={attrs} />
            </div>
          </div>

          {/* Stats and Details */}
          <div className="space-y-6">
            <div className="border border-white/10 rounded-2xl p-6 bg-white/5">
              <h2 className="text-xl font-semibold mb-4">Attributes</h2>
              <div className="grid grid-cols-2 gap-4">
                <AttributeCard
                  label="Aggression"
                  value={attrs.aggression}
                  emoji="🔥"
                  color="from-red-500 to-orange-500"
                />
                <AttributeCard
                  label="Serenity"
                  value={attrs.serenity}
                  emoji="🌊"
                  color="from-blue-500 to-cyan-500"
                />
                <AttributeCard
                  label="Chaos"
                  value={attrs.chaos}
                  emoji="⚡"
                  color="from-purple-500 to-pink-500"
                />
                <AttributeCard
                  label="Influence"
                  value={attrs.influence}
                  emoji="👑"
                  color="from-yellow-500 to-amber-500"
                />
                <AttributeCard
                  label="Connectivity"
                  value={attrs.connectivity}
                  emoji="🌐"
                  color="from-green-500 to-emerald-500"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="text-sm text-gray-400">Last Updated</div>
                <div className="text-lg font-mono">
                  {new Date(attrs.lastUpdated * 1000).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Personality Summary */}
            <div className="border border-white/10 rounded-2xl p-6 bg-gradient-to-br from-pink-900/20 to-transparent">
              <h2 className="text-xl font-semibold mb-3">Personality Analysis</h2>
              <p className="text-gray-300 leading-relaxed">
                {generatePersonalityDescription(attrs)}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="border border-white/10 rounded-2xl p-6 bg-white/5">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/graffiti")}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-all"
                >
                  🎨 Paint on Graffiti Wall
                </button>
                <button
                  onClick={() => {
                    window.open(
                      `https://blockscout-passet-hub.parity-testnet.parity.io/token/${SOUL_ADDRESS}/instance/${tokenId}`,
                      "_blank"
                    );
                  }}
                  className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all"
                >
                  🔍 View on Explorer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Evolution History */}
        {history.length > 0 && (
          <div className="border border-white/10 rounded-2xl p-6 bg-white/5">
            <h2 className="text-2xl font-semibold mb-6">Evolution History</h2>
            <div className="space-y-4">
              {history.map((snapshot, idx) => (
                <div
                  key={`${snapshot.id || "snapshot"}-${snapshot.createdAt}-${idx}`}
                  className="border border-white/10 rounded-xl p-4 bg-black/30 hover:bg-black/50 transition-all"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-semibold">
                      Snapshot {history.length - idx}
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(snapshot.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-3 text-sm">
                    <MiniStat label="AGG" value={snapshot.aggression} />
                    <MiniStat label="SER" value={snapshot.serenity} />
                    <MiniStat label="CHA" value={snapshot.chaos} />
                    <MiniStat label="INF" value={snapshot.influence} />
                    <MiniStat label="CON" value={snapshot.connectivity} />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Stage: <span className="font-semibold">{snapshot.stage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function AttributeCard({
  label,
  value,
  emoji,
  color,
}: {
  label: string;
  value: number;
  emoji: string;
  color: string;
}) {
  return (
    <div className="border border-white/10 rounded-xl p-4 bg-black/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-2xl">{emoji}</span>
      </div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function generatePersonalityDescription(attrs: SpiritAttributes): string {
  const traits = [];

  if (attrs.aggression > 60) {
    traits.push("fiercely aggressive and dominant");
  } else if (attrs.aggression > 30) {
    traits.push("moderately assertive");
  } else {
    traits.push("gentle and passive");
  }

  if (attrs.serenity > 60) {
    traits.push("deeply serene and peaceful");
  } else if (attrs.serenity > 30) {
    traits.push("balanced in temperament");
  } else {
    traits.push("restless and turbulent");
  }

  if (attrs.chaos > 60) {
    traits.push("wildly unpredictable");
  } else if (attrs.chaos > 30) {
    traits.push("occasionally chaotic");
  } else {
    traits.push("stable and orderly");
  }

  if (attrs.influence > 60) {
    traits.push("highly influential in the network");
  } else if (attrs.influence > 30) {
    traits.push("moderately present");
  } else {
    traits.push("quietly observing");
  }

  if (attrs.connectivity > 60) {
    traits.push("deeply interconnected with others");
  } else if (attrs.connectivity > 30) {
    traits.push("socially engaged");
  } else {
    traits.push("solitary and independent");
  }

  const intro =
    attrs.influence > 70 && attrs.connectivity > 60
      ? "This is an Ascended Spirit — "
      : attrs.aggression > 50 || attrs.chaos > 50
      ? "This is a Wild Spirit — "
      : "This is a Seed Spirit — ";

  return intro + traits.join(", ") + ". Its essence reflects the unique journey through the Polkadot network.";
}
