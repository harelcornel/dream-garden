# Dream Garden

A small moonlit garden for Rare Friends. Plant mystery seeds, water them, discover six flower varieties, and keep a flower journal.

## Play

Public preview: https://dream-garden-rarefriends-harel.harelcornel.chatgpt.site. Open the link in a desktop wallet browser or a mobile wallet's built-in browser. FriendSDK requires ownership of a hardwired Generations NFT (generation 1 or higher) on Robinhood mainnet, chain 4663. The preview uses simulated RF only: no token funding or signing is needed.

For local play, install Node 22+ and run:

```sh
npm ci
npm run dev
```

Open http://localhost:4173. For a phone on the same local network, use the computer's LAN IP on port 4173 in a wallet browser, subject to local firewall access. An HTTPS hosted link is preferable on phones.

## How to play

1. Buy a dream seed for 1 simulated RF.
2. Choose one of six spots and plant it.
3. Water twice, wait five seconds, then reveal your flower.
4. Keep & replant frees the spot while retaining your flower in the journal.
5. Collect all six varieties, or redeem flowers for simulated RF to buy more seeds.

Touch, mouse, and Tab/Enter/Space controls are supported. Escape closes menus. Sound starts muted; reduced motion follows the system preference and can be changed in Settings. Progress and balances reset on reload. Flower discovery is random; plot choice and watering do not affect the published odds.

## Build and verify

```sh
npm run typecheck
npm run check
npx playwright install chromium
npm test
npm run build
```

The hosted static bundle is in build. It embeds the child game and artwork in the authenticated parent bundle to avoid private-host login redirects inside the opaque sandbox. The child uses sandbox="allow-scripts" and an exact SHA-256 script policy. No same-origin permission or wallet bypass is added. `npm run build:sdk` still creates the standard CLI bundle in dist for local SDK tooling. The FriendSDK v0.1.2 package archive is included in vendor for reproducible installation. See game/README.md for exact economy rules and controls, ART-CREDITS.md for asset provenance, and VALIDATION.md for tested behavior and limitations.

## Builder and submission

Builder: [harelcornel](https://github.com/harelcornel). Contact: [@Syth0x](https://x.com/Syth0x). Category: Character Spotlight.

See SUBMISSION.md for the event entry, full reward table and limitations. The game fits within a maximum 960 x 640 frame; narrow screens use internal scrolling to keep the touch controls readable.
