# Validation — 2026-09-27

Passed on Windows with Node v24.18.0, FriendSDK v0.1.2 and Playwright Chromium:

- TypeScript typecheck.
- FriendSDK game definition, imports and sandbox boundary validation.
- Production static build.
- Automated browser gameplay at 960, 390 and 360 pixels wide.
- Purchase cancellation and confirmed purchase; planting cancellation and confirmed planting.
- Two waterings, menu-paused growth, five-second growth and SDK settlement/reveal.
- Journal discovery and inventory; redemption; discovery retained after redemption; decorative flower remains.
- Keep & replant; reduced motion; six accessible plot controls; no horizontal overflow.
- SDK automated harness assertions: fresh fixture ownership verification, sandbox=allow-scripts, inaccessible parent document, no browser errors or unexpected wallet-signing requests.
- Visual inspection of desktop initial garden and phone flower state.

Mocks are used only in automated tests. Normal development and production output retain the real wallet/ownership gate. Positive real-wallet play has not been performed by the assistant and requires the user's eligible NFT wallet. Real RPC availability, particular mobile wallet implementations and a physical phone are not established by the automated tests. Upstream calls WSL the verified Windows setup; this project was built and tested successfully in native Windows.

Session-local progress is intentional: the SDK does not provide persistent saves. There are no live contracts or transactions. The frame is at most 960x640. Narrow screens use a smaller width and internal scrolling; mobile height is capped at 640px.

## Hosted-frame regression fix
The original SDK bundle loaded game.html and its assets from inside an opaque sandbox. Hosted assets required private-site authentication, and game.html also redirected to /game. Local SDK serving did not exercise this path. The new hosted build embeds its complete child document and assets into the authenticated parent bundle, then passes an object URL to the unchanged SDK GameHost. The iframe keeps sandbox="allow-scripts" and the child executes only its SHA-256-pinned compiled script. No allow-same-origin, wallet bypass, private tokens, or new sharing permissions were added.

`npm run test:hosted` tests the production bundle behind a Strict-cookie private host at desktop and phone sizes, including simulated seed-to-flower gameplay, touch activation, fresh ownership reads, parent-document isolation, script CSP, absence of child asset requests, and no console errors. Tests are isolated automation with fixture wallets only.

## Pixel-art revision
Replaced the storybook scenery and flowers with generated pixel artwork. Restyled the game and wallet menus with a monochrome/lime palette, square borders, stepped animation and monospace lettering. Canonical Friend sprites remain unchanged. Re-ran TypeScript, SDK validation, production build, full gameplay tests at 960/390/360px and hosted sandbox tests at 960/390px; all passed. Visually inspected desktop and phone screenshots.


## Submission frame check
The phone frame now stays at or below 640px high and 960px wide, with internal scrolling. TypeScript, SDK validation, build, all 960/390/360px gameplay checks and 960/390px hosted tests passed after this adjustment, including the new frame-bound assertion.
