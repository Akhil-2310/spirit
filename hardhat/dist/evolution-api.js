/**
 * API endpoint wrapper for evolution engine
 * Use this if you want to expose evolution as an HTTP API
 */
import express from "express";
import { evolveForAddress, getAllSpiritOwners } from "./evolution-engine.js";
const app = express();
app.use(express.json());
// Evolve a specific spirit by address
app.post("/api/evolve", async (req, res) => {
    try {
        const { address } = req.body;
        if (!address || !address.startsWith("0x")) {
            return res.status(400).json({
                error: "Invalid address",
                message: "Please provide a valid Ethereum address",
            });
        }
        console.log(`📡 API request: Evolve spirit for ${address}`);
        await evolveForAddress(address);
        res.json({
            success: true,
            message: `Evolution complete for ${address}`,
        });
    }
    catch (error) {
        console.error("Evolution API error:", error);
        res.status(500).json({
            error: "Evolution failed",
            message: error.message,
        });
    }
});
// Evolve all spirits in the system
app.post("/api/evolve/all", async (req, res) => {
    try {
        console.log("📡 API request: Evolve all spirits");
        const owners = await getAllSpiritOwners();
        const results = {
            total: owners.length,
            succeeded: 0,
            failed: 0,
            errors: [],
        };
        for (const owner of owners) {
            try {
                await evolveForAddress(owner);
                results.succeeded++;
            }
            catch (error) {
                results.failed++;
                results.errors.push(`${owner}: ${error.message}`);
            }
        }
        res.json({
            success: true,
            message: `Evolved ${results.succeeded}/${results.total} spirits`,
            results,
        });
    }
    catch (error) {
        console.error("Batch evolution API error:", error);
        res.status(500).json({
            error: "Batch evolution failed",
            message: error.message,
        });
    }
});
// Get all spirit owners
app.get("/api/spirits/owners", async (req, res) => {
    try {
        const owners = await getAllSpiritOwners();
        res.json({
            success: true,
            count: owners.length,
            owners,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to fetch owners",
            message: error.message,
        });
    }
});
// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "evolution-engine" });
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Evolution API running on http://localhost:${PORT}`);
    console.log(`   POST /api/evolve - Evolve single spirit`);
    console.log(`   POST /api/evolve/all - Evolve all spirits`);
    console.log(`   GET /api/spirits/owners - List all owners`);
});
export default app;
