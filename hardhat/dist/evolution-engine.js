import "dotenv/config";
import fetch from "node-fetch";
import { createWalletClient, createPublicClient, http, parseAbi, formatEther, } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arkivWallet } from "./arkiv-client.js";
import { stringToPayload } from "@arkiv-network/sdk/utils";
const POLKADOT_TESTNET_RPC = "https://testnet-passet-hub-eth-rpc.polkadot.io";
const POLKADOT_TESTNET_CHAIN_ID = 420420422;
const BLOCKSCOUT_BASE = "https://blockscout-passet-hub.parity-testnet.parity.io";
const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
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
const walletClient = createWalletClient({
    account,
    transport: http(POLKADOT_TESTNET_RPC),
    chain,
});
const SOUL_ADDRESS = process.env.SOUL_CONTRACT;
const SOUL_ABI = parseAbi([
    "function spiritOf(address owner) view returns (uint256)",
    "function getSpirit(uint256 tokenId) view returns (uint32, uint32, uint32, uint32, uint32, uint64)",
    "function evolveSpirit(uint256 tokenId, uint32 aggression, uint32 serenity, uint32 chaos, uint32 influence, uint32 connectivity) external",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function totalSupply() view returns (uint256)",
]);
async function fetchTxsForAddress(address) {
    const url = `${BLOCKSCOUT_BASE}/api?module=account&action=txlist` +
        `&address=${address}&startblock=0&endblock=99999999&sort=asc`;
    const res = await fetch(url);
    const json = (await res.json());
    if (json.status !== "1")
        return [];
    return json.result;
}
function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}
function computeAttributesFromTxs(txs, address) {
    if (txs.length === 0) {
        return {
            aggression: 10,
            serenity: 60,
            chaos: 10,
            influence: 5,
            connectivity: 5,
        };
    }
    const outgoing = txs.filter((t) => t.from.toLowerCase() === address.toLowerCase());
    const incoming = txs.filter((t) => t.to?.toLowerCase() === address.toLowerCase());
    const peers = new Set();
    txs.forEach((t) => {
        if (t.from.toLowerCase() === address.toLowerCase() && t.to)
            peers.add(t.to.toLowerCase());
        if (t.to?.toLowerCase() === address.toLowerCase())
            peers.add(t.from.toLowerCase());
    });
    const outgoingVals = outgoing.map((t) => Number(formatEther(BigInt(t.value))));
    const avgValue = outgoingVals.length
        ? outgoingVals.reduce((a, b) => a + b, 0) / outgoingVals.length
        : 0;
    const contractCalls = outgoing.filter((t) => t.input && t.input !== "0x").length;
    const transfers = outgoing.length - contractCalls;
    const timestamps = txs.map((t) => Number(t.timeStamp)).sort((a, b) => a - b);
    const deltas = [];
    for (let i = 1; i < timestamps.length; i++) {
        deltas.push(timestamps[i] - timestamps[i - 1]);
    }
    const meanDelta = deltas.length
        ? deltas.reduce((a, b) => a + b, 0) / deltas.length
        : 0;
    const variance = deltas.length && meanDelta
        ? deltas.reduce((acc, d) => acc + (d - meanDelta) ** 2, 0) /
            deltas.length
        : 0;
    const txCount = txs.length;
    const uniquePeers = peers.size;
    const aggression = Math.round(100 *
        (0.5 * clamp01(outgoing.length / 50) +
            0.3 * clamp01(contractCalls / 20) +
            0.2 * clamp01(avgValue / 5)));
    const serenity = Math.round(100 *
        (0.6 * clamp01(transfers / Math.max(1, outgoing.length)) +
            0.4 * (1 - clamp01(outgoing.length / 50))));
    const chaos = Math.round(100 * clamp01(variance / (24 * 60 * 60)));
    const influence = Math.round(100 * (0.6 * clamp01(txCount / 200) + 0.4 * clamp01(uniquePeers / 100)));
    const connectivity = Math.round(100 * clamp01(uniquePeers / 100));
    return { aggression, serenity, chaos, influence, connectivity };
}
/**
 * Store spirit snapshot to Arkiv with TTL
 * Old snapshots will automatically expire after TTL
 */
async function writeSpiritSnapshotToArkiv(args) {
    const { spiritAddress, tokenId, attrs } = args;
    // Compute stage
    const stage = attrs.influence > 70 && attrs.connectivity > 60
        ? "ascended"
        : attrs.aggression > 50 || attrs.chaos > 50
            ? "wild"
            : "seed";
    // Prepare payload
    const snapshotData = {
        spiritAddress,
        tokenId: tokenId.toString(),
        aggression: attrs.aggression,
        serenity: attrs.serenity,
        chaos: attrs.chaos,
        influence: attrs.influence,
        connectivity: attrs.connectivity,
        stage,
        createdAt: Date.now(),
    };
    const payload = stringToPayload(JSON.stringify(snapshotData));
    // Store to Arkiv with TTL
    // Expires after 30 days - old snapshots auto-delete
    const { entityKey, txHash } = await arkivWallet.createEntity({
        payload,
        contentType: "application/json",
        attributes: [
            { key: "type", value: "spiritSnapshot" },
            { key: "spiritAddress", value: spiritAddress.toLowerCase() },
            { key: "tokenId", value: tokenId.toString() },
            { key: "stage", value: stage },
            { key: "aggression", value: String(attrs.aggression) },
            { key: "serenity", value: String(attrs.serenity) },
            { key: "chaos", value: String(attrs.chaos) },
            { key: "influence", value: String(attrs.influence) },
            { key: "connectivity", value: String(attrs.connectivity) },
        ],
        expiresIn: 30 * 24 * 60 * 60, // 30 days TTL
    });
    console.log(`✅ Snapshot stored to Arkiv`);
    console.log(`   Entity Key: ${entityKey}`);
    console.log(`   Tx Hash: ${txHash}`);
    console.log(`   Stage: ${stage}`);
    console.log(`   Expires: 30 days`);
    return { entityKey, txHash };
}
async function evolveForAddress(address) {
    console.log(`\n🔍 Processing evolution for ${address}`);
    // 1. Check if this address has a Spirit
    const tokenId = (await publicClient.readContract({
        address: SOUL_ADDRESS,
        abi: SOUL_ABI,
        functionName: "spiritOf",
        args: [address],
    }));
    if (tokenId === 0n) {
        console.log("❌ No Soul minted for this address");
        return;
    }
    console.log(`   Spirit #${tokenId} found`);
    // 2. Fetch transaction history from blockchain
    console.log(`   Fetching transaction history...`);
    const txs = await fetchTxsForAddress(address);
    console.log(`   Found ${txs.length} transactions`);
    // 3. Compute new attributes from real blockchain behavior
    const attrs = computeAttributesFromTxs(txs, address);
    console.log(`   Computed attributes:`, attrs);
    // 4. Update on-chain NFT attributes
    console.log(`   Updating on-chain attributes...`);
    const hash = await walletClient.writeContract({
        address: SOUL_ADDRESS,
        abi: SOUL_ABI,
        functionName: "evolveSpirit",
        args: [
            tokenId,
            attrs.aggression,
            attrs.serenity,
            attrs.chaos,
            attrs.influence,
            attrs.connectivity,
        ],
    });
    console.log(`✅ Evolution transaction sent: ${hash}`);
    // Wait for confirmation
    console.log(`   Waiting for confirmation...`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Evolution confirmed on-chain`);
    // 5. Store snapshot to Arkiv (with TTL - old ones auto-delete)
    console.log(`   Storing snapshot to Arkiv...`);
    await writeSpiritSnapshotToArkiv({ spiritAddress: address, tokenId, attrs });
    console.log(`\n✨ Evolution complete for Spirit #${tokenId}!`);
}
/**
 * Get all Spirit owners from the contract
 */
async function getAllSpiritOwners() {
    // Get total number of minted spirits
    const totalSupply = (await publicClient.readContract({
        address: SOUL_ADDRESS,
        abi: parseAbi(["function totalSupply() view returns (uint256)"]),
        functionName: "totalSupply",
    }));
    console.log(`   Found ${totalSupply} total spirits`);
    const owners = [];
    // Fetch owner for each token ID (starting from 1)
    for (let i = 1n; i <= totalSupply; i++) {
        try {
            const owner = (await publicClient.readContract({
                address: SOUL_ADDRESS,
                abi: SOUL_ABI,
                functionName: "ownerOf",
                args: [i],
            }));
            if (owner && !owners.includes(owner)) {
                owners.push(owner);
            }
        }
        catch (e) {
            // Token might not exist or be burned
            console.log(`   ⚠️  Token ${i} not found, skipping`);
        }
    }
    return owners;
}
async function main() {
    console.log("🧬 Polkadot Spirits Evolution Engine");
    console.log("====================================");
    console.log("   Network: Polkadot Hub TestNet");
    console.log("   Chain ID:", POLKADOT_TESTNET_CHAIN_ID);
    console.log("");
    // Get target address from:
    // 1. Command line argument (highest priority)
    // 2. Environment variable
    // 3. Evolve all spirits (if neither provided)
    const cliTarget = process.argv[2]; // node script.js 0xAddress
    const envTarget = process.env.TARGET_ADDRESS;
    if (cliTarget && cliTarget.startsWith("0x")) {
        // Single address from CLI
        console.log("📍 Mode: Single address (CLI argument)");
        console.log("");
        await evolveForAddress(cliTarget);
    }
    else if (envTarget && envTarget.startsWith("0x")) {
        // Single address from env
        console.log("📍 Mode: Single address (environment variable)");
        console.log("");
        await evolveForAddress(envTarget);
    }
    else {
        // Evolve all spirits
        console.log("📍 Mode: Evolve all spirits");
        console.log("");
        const allOwners = await getAllSpiritOwners();
        if (allOwners.length === 0) {
            console.log("   No spirits found to evolve");
            return;
        }
        console.log(`   Will evolve ${allOwners.length} unique spirit owner(s)\n`);
        for (let i = 0; i < allOwners.length; i++) {
            console.log(`\n[${i + 1}/${allOwners.length}] ========================================`);
            try {
                await evolveForAddress(allOwners[i]);
            }
            catch (error) {
                console.error(`   ❌ Failed to evolve ${allOwners[i]}:`, error);
                // Continue with next owner
            }
        }
        console.log("\n✅ Batch evolution complete!");
    }
}
// Allow importing this module
export { evolveForAddress, getAllSpiritOwners };
// Only run main if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error("\n❌ Evolution failed:", error);
        process.exit(1);
    });
}
