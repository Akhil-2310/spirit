import "dotenv/config";
import { createPublicClient, http, parseAbi, decodeEventLog, } from "viem";
import { arkivWallet } from "./arkiv-client.js";
import { stringToPayload } from "@arkiv-network/sdk/utils";
const POLKADOT_TESTNET_RPC = "https://testnet-passet-hub-eth-rpc.polkadot.io";
const POLKADOT_TESTNET_CHAIN_ID = 420420422;
const chain = {
    id: POLKADOT_TESTNET_CHAIN_ID,
    name: "Polkadot Hub TestNet",
    nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
    rpcUrls: { default: { http: [POLKADOT_TESTNET_RPC] } },
};
const publicClient = createPublicClient({
    transport: http(POLKADOT_TESTNET_RPC),
    chain,
});
const GRAFFITI_ADDRESS = process.env.GRAFFITI_CONTRACT;
const GRAFFITI_ABI = parseAbi([
    "event PixelPainted(uint16 indexed x, uint16 indexed y, uint256 indexed tokenId, uint32 color, uint64 timestamp)",
]);
/**
 * Store graffiti stroke to Arkiv with TTL
 * Old strokes will auto-expire after TTL
 */
async function writeGraffitiStrokeToArkiv(args) {
    const { x, y, tokenId, color, timestamp, txHash, blockNumber } = args;
    // Prepare payload
    const strokeData = {
        x,
        y,
        tokenId,
        color,
        timestamp: timestamp * 1000, // Convert to ms
        txHash,
        blockNumber: blockNumber.toString(),
    };
    const payload = stringToPayload(JSON.stringify(strokeData));
    // Store to Arkiv with TTL (30 days)
    const { entityKey } = await arkivWallet.createEntity({
        payload,
        contentType: "application/json",
        attributes: [
            { key: "type", value: "graffitiStroke" },
            { key: "x", value: String(x) },
            { key: "y", value: String(y) },
            { key: "tokenId", value: tokenId },
            { key: "color", value: `0x${color.toString(16).padStart(6, "0")}` },
            { key: "timestamp", value: String(timestamp) },
            { key: "txHash", value: txHash },
        ],
        expiresIn: 30 * 24 * 60 * 60, // 30 days TTL
    });
    console.log(`✅ Synced stroke at (${x}, ${y}) → Arkiv key: ${entityKey}`);
    return { entityKey };
}
async function syncGraffitiHistory(fromBlock, toBlock) {
    console.log(`\n🔍 Scanning blocks ${fromBlock} → ${toBlock}`);
    const logs = await publicClient.getLogs({
        address: GRAFFITI_ADDRESS,
        event: GRAFFITI_ABI[0],
        fromBlock,
        toBlock,
    });
    console.log(`   Found ${logs.length} PixelPainted events`);
    if (logs.length === 0) {
        console.log("   No new graffiti to sync");
        return;
    }
    let synced = 0;
    for (const log of logs) {
        try {
            const decoded = decodeEventLog({
                abi: GRAFFITI_ABI,
                data: log.data,
                topics: log.topics,
            });
            const { x, y, tokenId, color, timestamp } = decoded.args;
            await writeGraffitiStrokeToArkiv({
                x: Number(x),
                y: Number(y),
                tokenId: tokenId.toString(),
                color: Number(color),
                timestamp: Number(timestamp),
                txHash: log.transactionHash || "",
                blockNumber: log.blockNumber || 0n,
            });
            synced++;
        }
        catch (e) {
            console.error("   ❌ Error processing log:", e);
        }
    }
    console.log(`\n✅ Graffiti sync complete: ${synced}/${logs.length} synced to Arkiv`);
}
async function main() {
    console.log("🎨 Polkadot Spirits Graffiti Sync");
    console.log("====================================");
    console.log("   Network: Polkadot Hub TestNet");
    console.log("   Chain ID:", POLKADOT_TESTNET_CHAIN_ID);
    console.log("");
    if (!GRAFFITI_ADDRESS) {
        console.error("❌ GRAFFITI_CONTRACT environment variable is required");
        process.exit(1);
    }
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`   Current block: ${currentBlock}`);
    // Sync last 10k blocks (adjust as needed)
    const fromBlock = currentBlock - 10000n;
    await syncGraffitiHistory(fromBlock, currentBlock);
    console.log("\n💡 Tip: Run this periodically to keep Arkiv in sync");
    console.log("   Or set up a cron job / webhook for real-time syncing");
}
main().catch((error) => {
    console.error("\n❌ Sync failed:", error);
    process.exit(1);
});
