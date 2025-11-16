"use client";

import { useEffect, useState, useRef } from "react";
import { usePolkadotWallet } from "@/hooks/useKusamaWallet";
import { createPublicClient, createWalletClient, http, custom, parseAbi } from "viem";
import { polkadotHub } from "@/lib/chains";
import { fetchGraffitiStrokes, GraffitiStroke } from "@/lib/arkivClient";

const SOUL_ADDRESS = process.env.NEXT_PUBLIC_SOUL_CONTRACT! as `0x${string}`;
const GRAFFITI_ADDRESS = process.env.NEXT_PUBLIC_GRAFFITI_CONTRACT! as `0x${string}`;

const SOUL_ABI = parseAbi([
  "function spiritOf(address owner) view returns (uint256)",
  "function getSpirit(uint256 tokenId) view returns (uint32, uint32, uint32, uint32, uint32, uint64)",
]);

const GRAFFITI_ABI = parseAbi([
  "function paint(uint256 tokenId, uint16 x, uint16 y, uint32 color) external",
  "function getPixel(uint16 x, uint16 y) view returns (uint32, uint64, uint256)",
  "function lastPaintTimeOf(uint256 tokenId) view returns (uint64)",
  "function PAINT_COOLDOWN() view returns (uint256)",
]);

const publicClient = createPublicClient({
  chain: polkadotHub,
  transport: http(polkadotHub.rpcUrls.default.http[0]),
});

const WALL_SIZE = 256; // on-chain wall grid (Solidity)
const CANVAS_SIZE = 128; // visual grid resolution
const PIXEL_SIZE = 4; // display cell size in px

export default function GraffitiWall() {
  const { address, connect, checkingConnection } = usePolkadotWallet();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [tokenId, setTokenId] = useState<bigint | null>(null);
  const [selectedColor, setSelectedColor] = useState("#FF00FF");
  const [strokes, setStrokes] = useState<GraffitiStroke[]>([]);
  const [strokesLoading, setStrokesLoading] = useState(true);
  const [strokesError, setStrokesError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastPaintedPixel, setLastPaintedPixel] = useState<{ x: number; y: number; color: string } | null>(null);
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null);

  // Load user's token
  useEffect(() => {
    if (!address) {
      setTokenId(null);
      return;
    }
    
    (async () => {
      try {
        const tid = (await publicClient.readContract({
          address: SOUL_ADDRESS,
          abi: SOUL_ABI,
          functionName: "spiritOf",
          args: [address as `0x${string}`],
        })) as bigint;
        
        console.log(`🎭 Spirit check for ${address.slice(0, 6)}...${address.slice(-4)}: ${tid === 0n ? 'No Spirit' : `Spirit #${tid}`}`);
        setTokenId(tid === 0n ? null : tid);
      } catch (e) {
        console.error("Error fetching spirit:", e);
        setTokenId(null);
      }
    })();
  }, [address]);

  const mergeStrokes = (existing: GraffitiStroke[], incoming: GraffitiStroke[]) => {
    const byCoord = new Map<string, GraffitiStroke>();
    const take = (s: GraffitiStroke) => {
      const key = `${s.x}-${s.y}`;
      const current = byCoord.get(key);
      if (!current || (s.timestamp ?? 0) >= (current.timestamp ?? 0)) {
        byCoord.set(key, s);
      }
    };
    existing.forEach(take);
    incoming.forEach(take);
    return Array.from(byCoord.values());
  };

  // Load graffiti history
  useEffect(() => {
    setStrokesLoading(true);
    setStrokesError(null);
    fetchGraffitiStrokes(1000)
      .then((data) => {
        console.log(`📊 Loaded ${data.length} graffiti strokes`);
        setStrokes((prev) => mergeStrokes(prev, data));
        setStrokesLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load graffiti:", e);
        setStrokesError("Couldn't load the latest graffiti. You can still paint and it will show once refreshed.");
        setStrokesLoading(false);
      });
  }, []);

  // Check cooldown
  useEffect(() => {
    if (!tokenId) return;

    const checkCooldown = async () => {
      try {
        const lastPaint = (await publicClient.readContract({
          address: GRAFFITI_ADDRESS,
          abi: GRAFFITI_ABI,
          functionName: "lastPaintTimeOf",
          args: [tokenId],
        })) as bigint;

        const cooldown = (await publicClient.readContract({
          address: GRAFFITI_ADDRESS,
          abi: GRAFFITI_ABI,
          functionName: "PAINT_COOLDOWN",
          args: [],
        })) as bigint;

        const now = Math.floor(Date.now() / 1000);
        const canPaintAt = Number(lastPaint) + Number(cooldown);
        const remaining = Math.max(0, canPaintAt - now);
        setCooldownRemaining(remaining);
      } catch (e) {
        console.error("Error checking cooldown:", e);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [tokenId]);

  // Render canvas
  // Render canvas
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear with dark background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  // Draw grid
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1;
  for (let i = 0; i <= CANVAS_SIZE; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i * PIXEL_SIZE, 0);
    ctx.lineTo(i * PIXEL_SIZE, CANVAS_SIZE * PIXEL_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * PIXEL_SIZE);
    ctx.lineTo(CANVAS_SIZE * PIXEL_SIZE, i * PIXEL_SIZE);
    ctx.stroke();
  }

  // Helper: safely parse Arkiv color formats (number | string)
  const parseStrokeColor = (c: any): number => {
    if (typeof c === "number") return c >>> 0;
    if (typeof c === "string") {
      // handle "0xff00ff", "ff00ff", "16711935"
      if (c.startsWith("0x")) return parseInt(c.slice(2), 16) >>> 0;
      if (/^[0-9a-fA-F]+$/.test(c)) return parseInt(c, 16) >>> 0;
      const num = Number(c);
      if (Number.isFinite(num)) return num >>> 0;
    }
    return 0xffffff; // fallback white
  };

  // Draw all painted pixels from strokes[]
  strokes.forEach((stroke) => {
    const sx = Number(stroke.x);
    const sy = Number(stroke.y);
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;

    // Scale from WALL_SIZE (256) → CANVAS_SIZE (128)
    let displayX = Math.floor((sx / WALL_SIZE) * CANVAS_SIZE);
    let displayY = Math.floor((sy / WALL_SIZE) * CANVAS_SIZE);

    // clamp to [0, CANVAS_SIZE - 1]
    displayX = Math.max(0, Math.min(CANVAS_SIZE - 1, displayX));
    displayY = Math.max(0, Math.min(CANVAS_SIZE - 1, displayY));

    const numericColor = parseStrokeColor(stroke.color);
    const colorHex = `#${numericColor.toString(16).padStart(6, "0")}`;

    ctx.fillStyle = colorHex;
    ctx.fillRect(
      displayX * PIXEL_SIZE,
      displayY * PIXEL_SIZE,
      PIXEL_SIZE,
      PIXEL_SIZE
    );

    // Subtle border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      displayX * PIXEL_SIZE,
      displayY * PIXEL_SIZE,
      PIXEL_SIZE,
      PIXEL_SIZE
    );
  });

  // Draw hovered pixel with preview (already in display coordinates)
  if (hoveredPixel) {
    ctx.fillStyle = selectedColor;
    ctx.fillRect(
      hoveredPixel.x * PIXEL_SIZE,
      hoveredPixel.y * PIXEL_SIZE,
      PIXEL_SIZE,
      PIXEL_SIZE
    );

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      hoveredPixel.x * PIXEL_SIZE + 1,
      hoveredPixel.y * PIXEL_SIZE + 1,
      PIXEL_SIZE - 2,
      PIXEL_SIZE - 2
    );

    ctx.shadowColor = selectedColor;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      hoveredPixel.x * PIXEL_SIZE,
      hoveredPixel.y * PIXEL_SIZE,
      PIXEL_SIZE,
      PIXEL_SIZE
    );
    ctx.shadowBlur = 0;
  }

  // Highlight last painted pixel (also in display coordinates)
  if (lastPaintedPixel) {
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      lastPaintedPixel.x * PIXEL_SIZE - 1,
      lastPaintedPixel.y * PIXEL_SIZE - 1,
      PIXEL_SIZE + 2,
      PIXEL_SIZE + 2
    );

    ctx.shadowColor = lastPaintedPixel.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = lastPaintedPixel.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      lastPaintedPixel.x * PIXEL_SIZE - 2,
      lastPaintedPixel.y * PIXEL_SIZE - 2,
      PIXEL_SIZE + 4,
      PIXEL_SIZE + 4
    );
    ctx.shadowBlur = 0;
  }
}, [strokes, hoveredPixel, selectedColor, lastPaintedPixel]);


const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!tokenId || cooldownRemaining > 0 || !address) return;

  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();

  // --- DISPLAY COORDINATES (0–127) ---
  const displayX = Math.floor((e.clientX - rect.left) / PIXEL_SIZE);
  const displayY = Math.floor((e.clientY - rect.top) / PIXEL_SIZE);

  if (
    displayX < 0 ||
    displayX >= CANVAS_SIZE ||
    displayY < 0 ||
    displayY >= CANVAS_SIZE
  ) {
    return;
  }

  // --- MAP TO WALL COORDINATES (0–255) ---
  const wallX = Math.floor((displayX / CANVAS_SIZE) * WALL_SIZE);
  const wallY = Math.floor((displayY / CANVAS_SIZE) * WALL_SIZE);

  // convert selectedColor "#RRGGBB" → number
  const colorInt = parseInt(selectedColor.slice(1), 16);

  // optimistic update
  const optimisticStroke: GraffitiStroke = {
    id: `optimistic-${Date.now()}`,
    x: wallX,
    y: wallY,
    tokenId: tokenId.toString(),
    color: colorInt,
    timestamp: Date.now(),
  };

  setStrokes((prev) => [
    ...prev.filter((s) => !(s.x === displayX && s.y === displayY)),
    optimisticStroke,
  ]);

  setLastPaintedPixel({
    x: displayX,
    y: displayY,
    color: selectedColor,
  });

  setLoading(true);

  try {
    // ✅ FIX: walletClient defined HERE inside the handler
    const walletClient = createWalletClient({
      chain: polkadotHub,
      transport: custom((window as any).ethereum),
      account: address as `0x${string}`,
    });

    const txHash = await walletClient.writeContract({
      address: GRAFFITI_ADDRESS,
      abi: GRAFFITI_ABI,
      functionName: "paint",
      args: [tokenId, wallX, wallY, colorInt],
    });

    console.log("🎨 Stroke TX:", txHash);

    // keep the optimistic stroke
    setCooldownRemaining(300); // or read PAINT_COOLDOWN()

  } catch (err: any) {
    console.error("Paint error:", err);

    // rollback optimistic stroke
    setStrokes((prev) => prev.filter((s) => s.id !== optimisticStroke.id));

    alert("Failed to paint pixel.");
  } finally {
    setLoading(false);
  }
};



  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / PIXEL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / PIXEL_SIZE);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      setHoveredPixel({ x, y });
    } else {
      setHoveredPixel(null);
    }
  };

  const presetColors = [
    "#FF0000", "#FF00FF", "#0000FF", "#00FFFF",
    "#00FF00", "#FFFF00", "#FF8800", "#FFFFFF",
  ];

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
            🎨 Polkadot Souls Wall
          </h1>
          <p className="text-gray-400 mb-2">
            A collaborative canvas where every Spirit leaves its mark. Paint one pixel every 5 minutes.
          </p>
          {address && tokenId && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Connected with Soul #{tokenId.toString()}
            </div>
          )}
        </div>

        {/* Only show connect button if NO address AND NO tokenId */}
        {!address && !tokenId && (
          <div className="space-y-2">
            {checkingConnection ? (
              <div className="px-6 py-3 bg-white/5 rounded-xl text-gray-400 inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse"></span>
                Checking wallet…
              </div>
            ) : (
              <button
                onClick={connect}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-xl font-semibold transition-all shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50"
              >
                Connect Wallet to Paint
              </button>
            )}
          </div>
        )}

        {/* Show "need spirit" message if connected but no spirit */}
        {address && !tokenId && (
          <div className="p-6 border border-yellow-500/30 bg-yellow-500/10 rounded-xl">
            <p className="text-yellow-300">
              You need a Polkadot Spirit NFT to paint! Mint one from the{" "}
              <a href="/" className="underline">
                home page
              </a>
              .
            </p>
          </div>
        )}

        {address && tokenId && (
          <div className="grid md:grid-cols-[1fr_300px] gap-8">
            {/* Canvas */}
            <div className="flex flex-col items-center">
              <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10 w-full">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your Polkadot Soul:</span>
                    <span className="font-mono">#{tokenId.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cooldown:</span>
                    <span className={cooldownRemaining > 0 ? "text-yellow-400" : "text-green-400"}>
                      {cooldownRemaining > 0
                        ? `${Math.floor(cooldownRemaining / 60)}m ${cooldownRemaining % 60}s`
                        : "Ready!"}
                    </span>
                  </div>
                  {hoveredPixel && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hover:</span>
                      <span className="font-mono text-cyan-400">
                        ({hoveredPixel.x}, {hoveredPixel.y})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative inline-block border-4 border-purple-500/30 rounded-lg overflow-hidden shadow-2xl shadow-purple-500/20">
                {cooldownRemaining > 0 && (
                  <div className="absolute z-10 top-3 right-3 bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                    Cooldown: {Math.floor(cooldownRemaining / 60)}m {cooldownRemaining % 60}s
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE * PIXEL_SIZE}
                  height={CANVAS_SIZE * PIXEL_SIZE}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMove}
                  onMouseLeave={() => setHoveredPixel(null)}
                  className={`${cooldownRemaining > 0 || loading ? "cursor-not-allowed" : "cursor-crosshair"}`}
                  style={{ 
                    imageRendering: "pixelated",
                    backgroundColor: "#1a1a1a"
                  }}
                />
                {(loading || strokesLoading || strokesError) && (
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 text-center px-4 ${
                      loading ? "" : "pointer-events-none"
                    }`}
                  >
                    <div className="text-white text-sm space-y-1">
                      {loading && <div className="text-lg font-semibold">Painting…</div>}
                      {strokesLoading && <div>Loading the wall…</div>}
                      {strokesError && <div className="text-yellow-200">{strokesError}</div>}
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-4 text-xs text-gray-500 text-center max-w-md">
                {CANVAS_SIZE}x{CANVAS_SIZE} collaborative pixel art. Click to paint with your selected color.
              </p>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Color Palette</h3>
                <div className="grid grid-cols-4 gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${
                        selectedColor === color
                          ? "border-white scale-110"
                          : "border-white/20 hover:border-white/40"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-2">Custom Color</label>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full h-12 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 bg-purple-600/20 border border-purple-500/30 rounded-xl">
                <h4 className="font-semibold mb-2">💡 Tip</h4>
                <p className="text-sm text-gray-300">
                  Your Polkadot Soul&apos;s attributes influence where your pixel naturally wants to appear!
                  High chaos = more random placement, high influence = stronger presence.
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-sm font-semibold mb-2 text-gray-400">Stats</h4>
                <div className="text-xs space-y-1 text-gray-400">
                  <div>Total Pixels: {strokes.length}</div>
                  <div>Canvas Size: {CANVAS_SIZE}×{CANVAS_SIZE}</div>
                  <div>Cooldown: 5 minutes</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
