# SoulScape

Soulscape transforms your Polkadot on-chain activity into a living digital art.

Every wallet mints a Polkadot “Soul” NFT whose traits evolve with real blockchain behavior.
These traits generate dynamic SVG art, mood-driven music, and determine how you paint on a real-time collaborative graffiti wall.

All Soul evolution, mood spikes, pixel strokes, and ephemeral states are stored, queried, and streamed using Arkiv, making Soulscape a fully reactive, living art world.

This is part social experiment, part generative art platform, part on-chain identity primitive.

## [Video Demo](https://www.loom.com/share/8ea805b1094748d49272d7966c28c6ae)

## [Live Link](https://spirit-wggn.vercel.app/)

## [Presentation](https://www.canva.com/design/DAG42Dj_sjk/-ERWU0DyyDTuAwqoEEVaCA/edit)

## [Arkiv Block Explorer Link](https://explorer.mendoza.hoodi.arkiv.network/address/0x8b916003D0C8F1f468a720BA4Ab5EA9678bc6e61?tab=txs)


## 🎭 **1. Dynamic Polkadot Soul NFTs**
Each Soul evolves using your actual on-chain behavior:

- **🔥 Aggression** — activity intensity  
- **🧘 Serenity** — stability of behavior  
- **⚡ Chaos** — randomness of interactions  
- **👥 Influence** — interactions with others  
- **🌐 Connectivity** — frequency of transactions  

These attributes drive:

- Animated SVG generative artwork  
- Dynamic color palettes  
- Ambient generative music  
- Pixel color on the graffiti wall  

---

## 🎨 **2. The Polkadot Graffiti Wall**
A **256×256 global canvas** shared by the entire network.

- Only Souls can paint  
- One pixel every 5 minutes  
- Pixel color = Soul’s mood  
- Canvas updates live via Arkiv subscriptions  
- Complete replay history stored with Arkiv  

A **collective mural** built by all Souls over time.

---

## 🧠 **3. Arkiv-Powered Living Memory**

Soulscape integrates **all four Arkiv capabilities**:

### 🟦 **CRUD**
- Save Soul evolution snapshots  
- Store all graffiti strokes  
- Log aura transitions & temporary states  

### 🟧 **TTL**
Used for ephemeral elements that fade automatically:
- Mood boosts  
- Hot streaks  
- Temporary aura glows  
- Stress indicator spikes  

### 🟩 **Queries**
- Fetch Soul timelines  
- Replay full graffiti wall history  
- Build analytics & mood scoring  

### 🟪 **Subscriptions**
- Real-time canvas updates  
- Live Soul evolution updates  
- Zero polling → instant UI reactivity  

Arkiv gives Soulscape the ability to **feel alive**.

---

## 🎶 **4. Generative Soundscapes**

Each Soul creates its own evolving soundtrack:

- Aggression → tempo  
- Serenity → reverb & calm pads  
- Chaos → random notes  
- Influence → polyphony  
- Connectivity → chord complexity  

Your Soul sounds like *you* — and changes with you.

---


## How we use Arkiv

- **Evolution history**: Each time a Soul evolves, we store a `spiritSnapshot` entity on Arkiv (Mendoza testnet) containing the wallet’s spirit address, token ID, computed attributes, stage, SVG image, and timestamp. These snapshots are queried by the app to render historical charts and evolving art.

- **Graffiti history**: A backend sync script watches `PixelPainted` events from the `GraffitiWall` contract and writes each stroke as a `graffitiStroke` entity with coordinates, color, tokenId, timestamp, and tx metadata. The frontend reads these entities from Arkiv to reconstruct the collaborative wall and its recent activity.

- **Query layer**: Server-side helpers wrap Arkiv’s query API and power `/api/spirit-history` and `/api/graffiti-history`, while the frontend uses simple `fetchSpiritSnapshots` / `fetchGraffitiStrokes` functions instead of talking to Arkiv directly.



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


## Smart Contracts

### [KusamaSoulNFT](https://blockscout-passet-hub.parity-testnet.parity.io/token/0x99466103FaC328a7596DEAF4b728e24E69d252bc) 
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
