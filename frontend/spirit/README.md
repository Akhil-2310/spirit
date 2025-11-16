# SoulScape

Soulscape transforms your Polkadot on-chain activity into a living digital organism.

Every wallet mints a Polkadot “Soul” NFT whose traits evolve with real blockchain behavior.
These traits generate dynamic SVG art, mood-driven music, and determine how you paint on a real-time collaborative graffiti wall.

All Soul evolution, mood spikes, pixel strokes, and ephemeral states are stored, queried, and streamed using Arkiv, making Soulscape a fully reactive, living art world.

This is part social experiment, part generative art platform, part on-chain identity primitive.

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
