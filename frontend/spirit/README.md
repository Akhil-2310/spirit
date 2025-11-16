# SoulScape

Soulscape transforms your Polkadot on-chain activity into a living digital organism.

Every wallet mints a Polkadot “Soul” NFT whose traits evolve with real blockchain behavior.
These traits generate dynamic SVG art, mood-driven music, and determine how you paint on a real-time collaborative graffiti wall.

All Soul evolution, mood spikes, pixel strokes, and ephemeral states are stored, queried, and streamed using Arkiv, making Soulscape a fully reactive, living art world.

This is part social experiment, part generative art platform, part on-chain identity primitive.

[Video Demo](https://www.loom.com/share/8ea805b1094748d49272d7966c28c6ae)

[Live Link](https://spirit-wggn.vercel.app/)

[Presentation](https://www.canva.com/design/DAG42Dj_sjk/-ERWU0DyyDTuAwqoEEVaCA/edit)

## Features

- 🎨 **Generative Art Visualization** - Animated canvas that reflects spirit attributes
- 🎵 **Generative Music** - Dynamic audio based on spirit personality using Tone.js
- 🧱 **Collaborative Graffiti Wall** - 256x256 pixel canvas where spirits paint together
- 📊 **Spirit Evolution Tracking** - View historical snapshots via Arkiv Network
- 🔗 **Kusama Hub Integration** - Native support for Kusama Asset Hub

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Blockchain**: viem for Polkadot interactions
- **Styling**: Tailwind CSS 4
- **Music**: Tone.js for generative audio
- **Storage**: Arkiv Network for decentralized data

## How we use Arkiv

- **Spirit evolution snapshots**:  
  On every evolution (`/app/api/evolve/route.ts`), we compute a spirit’s attributes, generate a deterministic SVG, and write a `spiritSnapshot` entity to Arkiv (Mendoza testnet) with a short TTL. Each entity stores the spirit address, token ID, attributes, computed stage, SVG image, and timestamp so the UI can render history and art over time.

- **Graffiti strokes**:  
  A backend sync script (`hardhat/backend/graffiti-sync.ts`) follows the on-chain `PixelPainted` events from the `GraffitiWall` contract and writes each stroke as a `graffitiStroke` entity with a 30‑day TTL. These entities include pixel coordinates, color, tokenId, timestamp, and tx metadata, and are read by the app to reconstruct the collaborative wall and its recent history.

- **Query layer for the frontend**:  
  Server-side helpers in `frontend/spirit/lib/arkivServer.ts` query Arkiv using indexed attributes (e.g. `type`, `spiritAddress`, `tokenId`) and expose that data via `api/spirit-history` and `api/graffiti-history`. The client-side helpers in `frontend/spirit/lib/arkivClient.ts` call those APIs, giving React components a simple `fetchSpiritSnapshots` / `fetchGraffitiStrokes` interface over the Arkiv data.

## Getting Started

### Prerequisites

- Node.js 18+ 
- MetaMask or compatible wallet
- Access to Polkadot Asset Hub testnet


## Key Features Explained

### Generative Art

The `SpiritCanvas` component creates unique, animated visualizations based on five attributes:

- **Aggression**: Sharper shapes, more intense colors
- **Serenity**: Smoother animations, calmer palettes
- **Chaos**: Irregular patterns, glitch effects
- **Influence**: Larger aura, more presence
- **Connectivity**: Neural network patterns

### Generative Music

`SpiritMusic` uses Tone.js to create dynamic soundscapes:

- **Tempo**: Based on aggression (40-140 BPM)
- **Scale**: Changes with serenity (peaceful → dark)
- **Effects**: Reverb for serenity, delay for connectivity
- **Chaos**: Adds noise bursts and unpredictable patterns

### Graffiti Wall

A collaborative 256x256 pixel canvas where:

- Each spirit can paint one pixel every 5 minutes
- Colors are fully customizable
- All pixels are stored on-chain
- Historical data available via Arkiv

## [Arkiv Block Explorer Link](https://explorer.mendoza.hoodi.arkiv.network/address/0x8b916003D0C8F1f468a720BA4Ab5EA9678bc6e61?tab=txs)

## Smart Contracts

### KusamaSoulNFT
- **Mint**: Users can mint one soul per address
- **Evolve**: Attributes update based on on-chain activity
- **Query**: Read current attributes and history

### GraffitiWall
- **Paint**: Place one pixel with cooldown
- **View**: Query pixel data and painter info


## License

MIT License - feel free to use this project however you'd like!

## Links

- [Kusama Asset Hub Explorer](https://blockscout-kusama-asset-hub.parity-chains-scw.parity.io/)
- [Arkiv Network](https://arkiv.network)
- [Polkadot.js](https://polkadot.js.org/)

## Support

For issues or questions, please open a GitHub issue or reach out to the team.

---

Built with ❤️ for the Kusama ecosystem
