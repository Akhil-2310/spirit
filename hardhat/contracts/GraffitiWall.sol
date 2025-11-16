// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract GraffitiWall {
    IERC721 public immutable soulNft;

    uint16 public constant WIDTH = 256;
    uint16 public constant HEIGHT = 256;
    uint256 public constant PAINT_COOLDOWN = 5 minutes;

    struct Pixel {
        uint32 color;          // 0xRRGGBB
        uint64 lastPaintedAt;
        uint256 lastPainterId; // tokenId of KusamaSoulNFT
    }

    mapping(uint32 => Pixel) public pixels;
    mapping(uint256 => uint64) public lastPaintTimeOf;

    event PixelPainted(
        uint16 indexed x,
        uint16 indexed y,
        uint256 indexed tokenId,
        uint32 color,
        uint64 timestamp
    );

    constructor(address soulNftAddress) {
        require(soulNftAddress != address(0), "Invalid address");
        soulNft = IERC721(soulNftAddress);
    }

    function _pixelId(uint16 x, uint16 y) internal pure returns (uint32) {
        return uint32(y) * uint32(WIDTH) + uint32(x);
    }

    function paint(
        uint256 tokenId,
        uint16 x,
        uint16 y,
        uint32 color
    ) external {
        require(x < WIDTH && y < HEIGHT, "Out of bounds");
        require(soulNft.ownerOf(tokenId) == msg.sender, "Not your Soul");

        uint64 lastPaint = lastPaintTimeOf[tokenId];
        require(lastPaint + PAINT_COOLDOWN <= block.timestamp, "Cooldown active");

        uint32 pid = _pixelId(x, y);
        Pixel storage p = pixels[pid];

        p.color = color;
        p.lastPaintedAt = uint64(block.timestamp);
        p.lastPainterId = tokenId;
        lastPaintTimeOf[tokenId] = uint64(block.timestamp);

        emit PixelPainted(x, y, tokenId, color, p.lastPaintedAt);
    }

    function getPixel(uint16 x, uint16 y) external view returns (Pixel memory) {
        require(x < WIDTH && y < HEIGHT, "Out of bounds");
        return pixels[_pixelId(x, y)];
    }
}
