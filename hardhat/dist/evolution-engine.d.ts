import "dotenv/config";
declare function evolveForAddress(address: `0x${string}`): Promise<void>;
/**
 * Get all Spirit owners from the contract
 */
declare function getAllSpiritOwners(): Promise<`0x${string}`[]>;
export { evolveForAddress, getAllSpiritOwners };
