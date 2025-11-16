import "dotenv/config";
import { createWalletClient, createPublicClient, http as arkivHttp } from "@arkiv-network/sdk";
import { mendoza } from "@arkiv-network/sdk/chains";
import { privateKeyToAccount } from "viem/accounts";
// Arkiv credentials from environment
const PRIVATE_KEY = process.env.ARKIV_PRIVATE_KEY;
if (!PRIVATE_KEY) {
    throw new Error("ARKIV_PRIVATE_KEY is required. Get one from https://arkiv.network");
}
// Create Arkiv wallet client for writes
export const arkivWallet = createWalletClient({
    chain: mendoza,
    transport: arkivHttp("https://mendoza.hoodi.arkiv.network/rpc"),
    account: privateKeyToAccount(PRIVATE_KEY),
});
// Create Arkiv public client for reads
export const arkivPublic = createPublicClient({
    chain: mendoza,
    transport: arkivHttp("https://mendoza.hoodi.arkiv.network/rpc"),
});
console.log("✅ Arkiv clients initialized");
console.log("   Account:", arkivWallet.account.address);
console.log("   Network: Mendoza Testnet");
