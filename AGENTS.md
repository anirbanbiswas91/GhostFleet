# GhostFleet Agent Guide

This file is the living handoff for coding agents working on the GhostFleet Railway app. Keep it current whenever routes, deployment behavior, multiplayer flow, test commands, or major UI architecture changes. It is documentation only; changing it does not affect the running app.

## Current Snapshot

- GhostFleet is one Node/Express Railway app with a shared browser-game shell.
- `/home` is the public landing page.
- `/` redirects to `/home`.
- `/play` serves the playable free game shell.
- `/free` is a legacy redirect to `/play`.
- `/room/:roomId` serves the same free game shell and lets players open shareable Human multiplayer room links directly.
- `/privacy`, `/contact`, `/about`, and `/terms` are lightweight public pages that do not load the game shell.
- `/premium` still exists for future premium work, but current production uses `GHOSTFLEET_FREE_ONLY=true`.
- Direct `/play` without a mode shows the compact in-game opponent picker.
- `/play?mode=ai` opens the existing AI setup flow; `/play?mode=human` opens the existing Human setup flow.
- AI setup uses user-facing labels `Easy`, `Med`, and `Hard`; internally these still map to `easy`, `hard`, and `expert`.
- AI and Human setup both support `8x8`, `10x10`, and `12x12` boards.
- Human multiplayer uses Socket.IO, fixed two-player slots, persistent `clientId` session identity, reconnect/resync, invite links, placement locking, rematch/exit flow, turn timers, and timeout surrender handling.
- Premium is currently classic/free visual parity plus dormant config. Do not reintroduce Abyssal Radar visuals unless the user explicitly starts that theme pass again.

## Project Shape

- `server/index.js` owns Express routes, static assets, health checks, billing stubs, and tier rendering.
- `server/site-pages.js` owns the `/home` landing page, public legal/support pages, shared public footer, and SEO metadata.
- `server/multiplayer.js` owns Socket.IO rooms, player slots, reconnects, turn validation, shot results, timers, room expiry, and snapshots.
- `server/tier-configs.js` loads tier and theme JSON from `client/shared`.
- `client/shared/game.html` is the single shared GhostFleet browser game shell. It contains the UI, AI flow, Human multiplayer client, analysis, achievements, sounds, effects, and responsive layout.
- `client/shared/config/tiers.json` controls tier names, routes, ads, feature flags, and entitlement metadata.
- `client/shared/themes/*.theme.json` controls theme-level presentation and asset references.
- `client/assets` contains shared images and ship/achievement assets.
- `client/assets/premium` and `abyssal-radar.theme.json` are dormant future-theme assets.
- `scripts/multiplayer-smoke.mjs` is the automated Socket.IO multiplayer smoke test.
- `node_modules` is generated dependency output. Do not edit it.

## Run And Verify

Use Node 20 or newer.

```bash
npm install
npm start
```

Default local routes:

- `http://localhost:3000/home`
- `http://localhost:3000/play`
- `http://localhost:3000/free`
- `http://localhost:3000/room/XK4BNM`
- `http://localhost:3000/privacy`
- `http://localhost:3000/contact`
- `http://localhost:3000/about`
- `http://localhost:3000/terms`
- `http://localhost:3000/premium`
- `http://localhost:3000/healthz`

Checks:

```bash
npm run check
npm run smoke:multiplayer
```

For `client/shared/game.html` JavaScript edits, also run an inline script parse check or browser smoke because the game logic lives inside HTML script blocks.

## Runtime Contract

- `/` redirects to `/home`.
- `/home` serves the public landing page.
- `/play` serves the free tier bootstrap.
- `/free` redirects to `/play`.
- `/room/:roomId` serves the free tier bootstrap so direct room links can hydrate client-side.
- `/privacy`, `/contact`, `/about`, and `/terms` serve standalone public HTML.
- `/premium` serves the premium tier unless `GHOSTFLEET_FREE_ONLY=true`.
- `/api/tier` returns available tier keys.
- `/api/tier/:tier` returns the merged tier and theme config.
- `/healthz` must stay lightweight and return JSON.
- Billing endpoints are placeholders until the payment milestone.

Production Railway currently uses:

```bash
GHOSTFLEET_FREE_ONLY=true
PAYMENTS_ENABLED=false
PREMIUM_OPEN_ACCESS=true
```

Socket.IO must remain enabled even when `GHOSTFLEET_FREE_ONLY=true`, because Human multiplayer is available from `/play`.

## Multiplayer Contract

- Room URLs are canonical: `/room/XXXXXX`.
- Room IDs are 6 uppercase characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- The server owns room state. Clients send intents only.
- Server turns are slot indexes (`0` or `1`), never socket IDs.
- Player identity uses `sessionStorage.gf_clientId`; room context uses `sessionStorage.gf_session`.
- Player display names are capped at 8 characters and must be letters/numbers only; both client and server sanitize this.
- Reconnects must match by `clientId`, migrate the socket ID into the same slot, then emit `resync`.
- Hidden ship positions must never be sent to the opponent until sunk/reveal/endgame.
- Placement is simultaneous. A submitted fleet is locked and cannot be changed.
- Valid shots reset the shooter timeout streak. Three consecutive own-turn timeouts end the game as timeout surrender.
- If a player leaves during an active Human game, the opponent wins by surrender.
- Keep `scripts/multiplayer-smoke.mjs` updated with any Socket.IO event or payload changes.

## Editing Rules

- Prefer small, reversible PRs for visual experiments and interaction redesigns.
- Use `main` directly only when the user explicitly asks for it.
- Keep tier behavior data-driven through `client/shared/config/tiers.json` and theme JSON when possible.
- Keep route wiring and entitlement checks in `server/index.js` / `server/tier-configs.js`.
- Preserve the shared single-game-shell model unless a feature genuinely needs a separate shell.
- Do not hard-code tier-specific UI in the server; pass tier/theme/feature flags through `window.GHOSTFLEET_BOOTSTRAP`.
- Escape injected bootstrap JSON the same way `renderGame` does now so HTML injection remains safe.
- Keep assets referenced with paths that work from `/home`, `/play`, `/free`, `/room/:roomId`, and `/premium`.
- Do not edit generated files or large binary assets unless the task is specifically about assets.
- When changing multiplayer server events, add/update comments above handlers and keep every rejection as an `error:message` payload.

## Product Expectations

- GhostFleet’s core objective: guess enemy ship locations, fire one cell per turn, use hits/misses to find ships, and sink the enemy fleet before yours is destroyed.
- AI mode keeps the difficulty selector.
- Human mode uses a dedicated setup flow with player name, host-selected board size, create/share/join room flow, two-slot waiting lobby, and direct room links.
- Direct `/room/:roomId` invite links skip the public landing page and open the join/reconnect flow.
- The public landing page CTAs link to `/play?mode=ai` and `/play?mode=human`.
- Post-game screens must keep the full action contract available: View Analysis, Rematch for Human or New Game for AI, and Exit Room/Game. Analysis Back returns to the result modal.
- Forfeit, opponent-left, and timeout-surrender results must not award or display achievements.
- Ads are enabled for the free tier configuration, but production layout must stay non-interruptive.
- Premium is reserved for future work. Current premium visuals should remain classic/free parity unless a new premium design task says otherwise.
- Random matchmaking, Stripe payments, and Abyssal Radar premium theming are future milestones.

## Before Finishing

For server/config/multiplayer changes:

```bash
npm run check
npm run smoke:multiplayer
```

For route changes, smoke test:

- `/`
- `/home`
- `/play`
- `/free`
- `/room/XK4BNM`
- `/privacy`
- `/contact`
- `/about`
- `/terms`
- `/healthz`
- `/api/tier/free`

For UI changes:

- Inspect desktop and mobile widths.
- Check 8x8, 10x10, and 12x12 boards.
- Check landing, AI setup, Human setup, waiting lobby, result modal, and analysis Back flow.
- Check AI and Human paths separately.
- Verify hit, miss, sunk, turn-lock, modal, and battle-log states.
- Use browser/screenshot testing when layout or playfield visibility changes.

## Keep This Fresh

Update `AGENTS.md` whenever:

- routes or deployment environment variables change,
- multiplayer event names or payloads change,
- test commands change,
- a major feature branch is merged,
- premium/free product direction changes,
- a recurring bug or workflow rule needs to be remembered by future agents.
