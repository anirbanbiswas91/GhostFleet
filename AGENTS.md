# GhostFleet Agent Guide

This file gives coding agents the local rules for working on the GhostFleet Railway app. It is documentation only; it does not change the running server until code/config files are edited and the app is restarted or redeployed.

## Project Shape

- This is a single Node/Express app deployed to Railway.
- `server/index.js` serves the HTTP routes, static assets, health check, and billing stubs.
- `server/tier-configs.js` loads tier and theme JSON from `client/shared`.
- `client/shared/game.html` is the shared GhostFleet browser game shell for all tiers.
- `client/shared/config/tiers.json` controls tier names, routes, ads, feature flags, and entitlement metadata.
- `client/shared/themes/*.theme.json` controls theme-level presentation and asset references.
- `client/assets` contains shared images; `client/assets/premium` contains premium-themed assets.
- `node_modules` is generated dependency output. Do not edit it.

## Run And Verify

Use Node 20 or newer.

```bash
npm install
npm start
```

Default local routes:

- `http://localhost:3000/free`
- `http://localhost:3000/premium`
- `http://localhost:3000/healthz`

Syntax check:

```bash
npm run check
```

If the app is already running, changing `AGENTS.md` alone does not require a restart. Changing server code, tier config, themes, or the shared game shell requires restarting the Node process or triggering a redeploy.

## Runtime Contract

- `/` redirects to `/free`.
- `/free` serves the shared game shell with the `free` tier bootstrap.
- `/premium` serves the shared game shell with the `premium` tier bootstrap.
- `/api/tier` returns available tier keys.
- `/api/tier/:tier` returns the merged tier and theme config.
- `/healthz` must stay lightweight and return JSON.
- Billing endpoints are placeholders until the payment milestone.

Premium access is currently permissive unless both of these are true:

- `PAYMENTS_ENABLED=true`
- `PREMIUM_OPEN_ACCESS` is not `true`

When payments are enabled, mock premium access is read from the `x-ghostfleet-entitlements` request header.

## Editing Rules

- Keep tier behavior data-driven through `client/shared/config/tiers.json` and theme JSON when possible.
- Keep route wiring and entitlement checks in `server/index.js` / `server/tier-configs.js`.
- Preserve the shared single-game-shell model unless a feature genuinely needs separate tier shells.
- Do not hard-code premium-only UI in the server; pass tier/theme/feature flags through `window.GHOSTFLEET_BOOTSTRAP`.
- Escape injected bootstrap JSON the same way `renderGame` does now so HTML injection remains safe.
- Keep assets referenced with paths that work from both `/free` and `/premium`.
- Avoid touching generated files or large binary assets unless the task is specifically about assets.

## Product Expectations

- Free GhostFleet is ad-supported and uses the Classic Storm theme.
- Premium GhostFleet is intended to be ad-free and use the Abyssal Radar theme.
- `client/premium/README.md` says Premium ads are disabled. If changing ad behavior, reconcile that README with `client/shared/config/tiers.json`.
- Multiplayer flags are reserved for a later milestone unless the user explicitly asks to implement multiplayer.
- Stripe Checkout, Customer Portal, and webhook handling are reserved for the payment milestone.

## Before Finishing

For server/config changes:

```bash
npm run check
```

For behavior changes, also smoke test:

- `/healthz`
- `/free`
- `/premium`
- `/api/tier/free`
- `/api/tier/premium`

For UI changes, inspect both desktop and mobile widths because `client/shared/game.html` contains responsive layout, board controls, and touch interactions in one file.
