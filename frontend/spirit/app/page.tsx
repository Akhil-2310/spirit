"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePolkadotWallet } from "@/hooks/useKusamaWallet";
import { createPublicClient, createWalletClient, http, custom, parseAbi } from "viem";
import { polkadotHub } from "@/lib/chains";
import { SpiritCanvas } from "@/components/SpiritCanvas";
import { SpiritMusic } from "@/components/SpiritMusic";

const SOUL_ADDRESS = process.env.NEXT_PUBLIC_SOUL_CONTRACT! as `0x${string}`;

const SOUL_ABI = parseAbi([
  "function spiritOf(address owner) view returns (uint256)",
  "function getSpirit(uint256 tokenId) view returns (uint32, uint32, uint32, uint32, uint32, uint64)",
  "function mintSoul(address to) external returns (uint256)",
]);

const publicClient = createPublicClient({
  chain: polkadotHub,
  transport: http(polkadotHub.rpcUrls.default.http[0]),
});

export default function Home() {
  const router = useRouter();
  const { address, connect, checkingConnection } = usePolkadotWallet();
  const [tokenId, setTokenId] = useState<bigint | null>(null);
  const [attrs, setAttrs] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    (async () => {
      const tid = (await publicClient.readContract({
        address: SOUL_ADDRESS,
        abi: SOUL_ABI,
        functionName: "spiritOf",
        args: [address as `0x${string}`],
      })) as bigint;

      if (tid === 0n) {
        setTokenId(null);
        setAttrs(null);
        return;
      }

      setTokenId(tid);
      
      // Fetch current attributes (returns tuple: [aggression, serenity, chaos, influence, connectivity, lastUpdated])
      const res = (await publicClient.readContract({
        address: SOUL_ADDRESS,
        abi: SOUL_ABI,
        functionName: "getSpirit",
        args: [tid],
      })) as readonly [number, number, number, number, number, bigint];

      setAttrs({
        aggression: Number(res[0]),
        serenity: Number(res[1]),
        chaos: Number(res[2]),
        influence: Number(res[3]),
        connectivity: Number(res[4]),
        lastUpdated: Number(res[5]),
      });

      // Auto-evolve in background (non-blocking)
      fetch("/api/auto-evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.evolved) {
            console.log("✨ Spirit auto-evolved with new attributes");
            // Refresh attributes after evolution
            setTimeout(() => window.location.reload(), 2000);
          }
        })
        .catch((e) => console.log("Auto-evolve skipped:", e));
    })();
  }, [address]);

  async function mintSoul() {
    if (!address || !(window as any).ethereum) return;
    setLoading(true);

    try {
      const walletClient = createWalletClient({
        transport: custom((window as any).ethereum),
        chain: polkadotHub,
      });

      await walletClient.writeContract({
        address: SOUL_ADDRESS,
        abi: SOUL_ABI,
        functionName: "mintSoul",
        args: [address as `0x${string}`],
        account: address as `0x${string}`,
      });

      // re-fetch
      const tid = (await publicClient.readContract({
        address: SOUL_ADDRESS,
        abi: SOUL_ABI,
        functionName: "spiritOf",
        args: [address as `0x${string}`],
      })) as bigint;
      setTokenId(tid);

      // Auto-evolve the newly minted spirit based on existing transactions
      console.log("🧬 Auto-evolving new spirit...");
      fetch("/api/auto-evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })
        .then(() => {
          console.log("✨ Spirit evolved with your transaction history");
          setTimeout(() => window.location.reload(), 2000);
        })
        .catch((e) => console.log("Evolution will happen later:", e));
    } catch (e: any) {
      console.error("Mint error:", e);
      alert(`Failed to mint: ${e.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-cyan-900/30"></div>
        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="text-center mb-12">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              SoulScape - Polkadot Souls
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              A living, evolving digital soul that grows from your blockchain behavior - 
              expressed as <span className="text-pink-400 font-semibold">generative art</span>, 
              <span className="text-purple-400 font-semibold"> music</span>, and 
              <span className="text-cyan-400 font-semibold"> collaborative graffiti</span>.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <FeatureCard
              emoji="🎨"
              title="Evolving Art"
              description="Your Spirit visualizes itself through generative, animated art that changes with your on-chain activity"
              color="from-pink-500/20 to-pink-500/5"
            />
            <FeatureCard
              emoji="🎵"
              title="Sonic Identity"
              description="Each Spirit has its own musical theme, generated from your transaction patterns and network behavior"
              color="from-purple-500/20 to-purple-500/5"
            />
            <FeatureCard
              emoji="🧱"
              title="Graffiti Wall"
              description="Contribute to a collaborative canvas where all Spirits leave their mark on the network"
              color="from-cyan-500/20 to-cyan-500/5"
            />
          </div>

          {/* CTA */}
          <div className="flex justify-center">
            {checkingConnection ? (
              <button
                disabled
                className="px-8 py-4 bg-white/5 rounded-xl font-bold text-lg text-gray-400 cursor-wait"
              >
                Checking wallet...
              </button>
            ) : !address ? (
              <button
                onClick={connect}
                className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-pink-500/50"
              >
                Connect Wallet
              </button>
            ) : !tokenId ? (
              <button
                disabled={loading}
                onClick={mintSoul}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? "Minting..." : "✨ Mint Your Spirit"}
              </button>
            ) : (
              <button
                onClick={() => router.push(`/spirit/${tokenId.toString()}`)}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-700 hover:to-pink-700 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/50"
              >
                View Your Spirit →
              </button>
            )}
          </div>

          {address && (
            <p className="text-center mt-4 text-sm text-gray-500">
              Connected: <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Spirit Display */}
      {tokenId && attrs && (
        <div className="max-w-7xl mx-auto px-8 py-16">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Your Spirit: <span className="text-pink-400">#{tokenId.toString()}</span>
          </h2>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Visualization */}
            <div className="space-y-6">
              <div className="border border-white/10 rounded-2xl p-8 bg-gradient-to-br from-purple-900/20 to-transparent">
                <SpiritCanvas attrs={attrs} />
              </div>
              <div className="flex justify-center">
                <SpiritMusic attrs={attrs} />
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-6">
              <div className="border border-white/10 rounded-2xl p-6 bg-white/5">
                <h3 className="text-xl font-semibold mb-4">Attributes</h3>
                <div className="space-y-4">
                  <StatBar label="🔥 Aggression" value={attrs.aggression} color="from-red-500 to-orange-500" />
                  <StatBar label="🌊 Serenity" value={attrs.serenity} color="from-blue-500 to-cyan-500" />
                  <StatBar label="⚡ Chaos" value={attrs.chaos} color="from-purple-500 to-pink-500" />
                  <StatBar label="👑 Influence" value={attrs.influence} color="from-yellow-500 to-amber-500" />
                  <StatBar label="🌐 Connectivity" value={attrs.connectivity} color="from-green-500 to-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => router.push(`/spirit/${tokenId.toString()}`)}
                  className="px-6 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-all"
                >
                  📊 Full Details
                </button>
                <button
                  onClick={() => router.push("/graffiti")}
                  className="px-6 py-4 bg-pink-600 hover:bg-pink-700 rounded-xl font-semibold transition-all"
                >
                  🎨 Paint Graffiti
                </button>
              </div>

              <div className="border border-cyan-500/30 bg-cyan-500/10 rounded-xl p-6">
                <h4 className="font-semibold mb-2 text-cyan-300">How it Works</h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• Your Spirit evolves based on your Polkadot network activity</li>
                  <li>• More transactions = higher aggression</li>
                  <li>• Staking = increased serenity</li>
                  <li>• Network participation = greater influence</li>
                  <li>• Social interactions = stronger connectivity</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-white/10 bg-gradient-to-t from-purple-900/20 to-transparent">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="text-center text-gray-400">
            <p className="mb-4">Built for Polkadot • Powered by Arkiv Network</p>
            <div className="flex justify-center gap-6 text-sm">
              <a href="/" className="hover:text-white transition-colors">Home</a>
              <a href="/graffiti" className="hover:text-white transition-colors">Graffiti Wall</a>
              <a
                href="https://blockscout-passet-hub.parity-testnet.parity.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Explorer
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  emoji,
  title,
  description,
  color,
}: {
  emoji: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className={`p-6 rounded-2xl border border-white/10 bg-gradient-to-br ${color} hover:scale-105 transition-transform`}>
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-300 text-sm">{description}</p>
    </div>
  );
}

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const safeValue = Number(value) || 0;
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold">{safeValue}</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, safeValue))}%` }}
        />
      </div>
    </div>
  );
}
