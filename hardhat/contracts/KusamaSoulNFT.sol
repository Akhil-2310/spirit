// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract KusamaSoulNFT is ERC721, AccessControl {
    bytes32 public constant EVOLUTION_UPDATER_ROLE = keccak256("EVOLUTION_UPDATER_ROLE");

    struct SpiritAttributes {
        uint32 aggression;
        uint32 serenity;
        uint32 chaos;
        uint32 influence;
        uint32 connectivity;
        uint64 lastUpdated;
    }

    uint256 private _nextTokenId = 1;
    string private _baseTokenURI;

    mapping(uint256 => SpiritAttributes) private _spirits;
    mapping(address => uint256) public spiritOf;

    event SpiritMinted(address indexed owner, uint256 indexed tokenId);
    event SpiritEvolved(
        uint256 indexed tokenId,
        uint32 aggression,
        uint32 serenity,
        uint32 chaos,
        uint32 influence,
        uint32 connectivity,
        uint64 lastUpdated
    );

    constructor(string memory baseTokenURI_) ERC721("Kusama Soul", "SOUL") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EVOLUTION_UPDATER_ROLE, msg.sender);
        _baseTokenURI = baseTokenURI_;
    }

    // --- ERC165 / interface support ---

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // --- metadata / baseURI ---

    function setBaseTokenURI(string calldata uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // --- minting ---

    function mintSoul(address to) external returns (uint256) {
        require(spiritOf[to] == 0, "Soul already exists for this address");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        SpiritAttributes memory attrs = SpiritAttributes({
            aggression: 10,
            serenity: 50,
            chaos: 10,
            influence: 10,
            connectivity: 10,
            lastUpdated: uint64(block.timestamp)
        });

        _spirits[tokenId] = attrs;
        spiritOf[to] = tokenId;

        emit SpiritMinted(to, tokenId);
        emit SpiritEvolved(
            tokenId,
            attrs.aggression,
            attrs.serenity,
            attrs.chaos,
            attrs.influence,
            attrs.connectivity,
            attrs.lastUpdated
        );

        return tokenId;
    }

    // --- view ---

    function getSpirit(uint256 tokenId) external view returns (SpiritAttributes memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent soul");
        return _spirits[tokenId];
    }

    // --- evolution ---

    function evolveSpirit(
        uint256 tokenId,
        uint32 aggression,
        uint32 serenity,
        uint32 chaos,
        uint32 influence,
        uint32 connectivity
    ) external onlyRole(EVOLUTION_UPDATER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent soul");

        SpiritAttributes storage attrs = _spirits[tokenId];
        attrs.aggression = aggression;
        attrs.serenity = serenity;
        attrs.chaos = chaos;
        attrs.influence = influence;
        attrs.connectivity = connectivity;
        attrs.lastUpdated = uint64(block.timestamp);

        emit SpiritEvolved(
            tokenId,
            aggression,
            serenity,
            chaos,
            influence,
            connectivity,
            attrs.lastUpdated
        );
    }

    // --- admin ---

    function setEvolutionUpdater(address updater) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(EVOLUTION_UPDATER_ROLE, updater);
    }
}
