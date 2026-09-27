# Dream Garden
A cozy, session-based garden using FriendSDK v0.1.2. Plant a mystery seed, water twice, wait five active seconds, and reveal a flower. Your verified Rare Friend appears in the garden using its original SDK artwork.

Run from the project root with `npm ci`, then `npm run dev`. Open http://localhost:4173. Node 22+ required. The SDK archive is included in vendor; no npm registry publication is assumed.

Use a wallet browser holding a hardwired Generations NFT (generation >= 1) on Robinhood mainnet (4663). Phones need an injected-wallet browser; the SDK does not provide WalletConnect. All seed purchases and rewards are simulated. No signatures, RF funding or transactions are required.

## Controls and rules
Tap/click a plot, then use the action below it. Tab and Enter/Space work with all controls; Escape closes menus. Buy one seed for 1 simulated RF, plant (consumes one seed), water twice for free, wait five seconds, reveal. Growth pauses for menus, runtime confirmations and hidden tabs. Keep & replant clears the plot and keeps its flower in inventory. The journal redeems one flower for its stated value and remembers discoveries. Redeemed flowers may remain as decorative garden displays; they no longer count as owned. Plot choice and watering do not affect odds. Six plots, six flower types, no additional currencies, upgrades or persistence.

| Flower | Chance | Simulated RF redemption |
| --- | --- | --- |
| Moon Daisy | 35% | 0.25 |
| Peach Bell | 25% | 0.5 |
| Stardrop | 20% | 1 |
| Velvet Orchid | 12% | 2 |
| Sunkeeper | 6% | 3 |
| Opal Lotus | 2% | 5 |

Weights total 10,000 basis points. Expected redemption is 0.9325 RF per seed. Each seed reserves the maximum 5 RF reward; kept rewards retain backing without expiry during the session. All economy amounts use the SDK's 18-decimal bigint base units. Outcomes come from client.settle, never from UI randomness. Pending play IDs are reused on retry. The SDK runtime owns wallet identity, confirmation and ledgers. Reloading resets the simulated session; changing Friends rebuilds the garden layout.

## Assets
Pixel garden and flower atlas: generated for this project using OpenAI's built-in image generation, 2026-09-27. Original prompts are in ../ART-CREDITS.md. The atlas is displayed through CSS sprite positions with pixelated rendering. The interface uses black, white and lime, square panels and monospace lettering. No external image service is required at runtime. Friend artwork and sound cues: FriendSDK, see vendor archive NOTICE.md, assets/provenance.json and assets/sound-provenance.json. Original character pixels are preserved with a white halo. UI icons are original simple SVG control glyphs.

## Validation
From project root: npm run typecheck; npm run check; npm run test; npm run build. Browser tests use the SDK's automated mock-wallet harness only; mocks are never included in the playable build. See ../VALIDATION.md for actual results and limitations. SDK sandbox and ownership gate remain intact. Real-wallet play must be checked by the owner.

## Hosting
`npm run build` writes the private-host compatible static bundle to build; `npm run build:sdk` retains the original SDK output in dist. The hosted adapter uses an embedded Blob child document with a SHA-256-pinned script and embedded artwork, preserving the opaque sandbox and verified wallet gate without requiring sandbox requests to carry private-site cookies. Serve every file over HTTP(S), preserving the child document CSP and relative asset paths. The dev server binds port 4173 on all interfaces for optional same-network testing. Public vibeathon submission requires a public preview, source repository, builder/contact details and a submission pull request, after the builder is happy with the game.


