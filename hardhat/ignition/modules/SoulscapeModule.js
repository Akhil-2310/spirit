// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SoulscapeModule", (m) => {
    //
    // ----- Parameters -----
    //
    const baseURI = m.getParameter(
        "baseURI",
        "https://placeholder.xyz/api/metadata/"   // You can override this at deploy time
    );

    //
    // ----- Deploy KusamaSoulNFT -----
    //
    const soul = m.contract("KusamaSoulNFT", [baseURI]);

    //
    // ----- Deploy GraffitiWall -----
    // constructor(GraffitiWall) expects the Soul NFT address
    //
    const graffiti = m.contract("GraffitiWall", [soul]);

    //
    // ----- Return deployed contracts -----
    //
    return { soul, graffiti };
});
