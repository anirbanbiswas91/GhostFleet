# GhostFleet

GhostFleet is a web-based strategy game inspired by tactical naval combat, with AI and room-code Human multiplayer in the main deployment. Play at ghostfleet.in

One Railway-deployable Node app serving GhostFleet game routes:

- `/` - ad-supported GhostFleet.
- `/free` - legacy redirect to `/`.
- `/premium` - local/dev open-playtest GhostFleet room-code multiplayer.

## Local Run

```bash
npm install
npm start
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/premium`
- `http://localhost:3000/healthz` — health check, returns JSON (`{"ok":true, ...}`)

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed. All variables are optional for local
development (sensible defaults apply). See `.env.example` for the full list, including:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port the server listens on |
| `GHOSTFLEET_FREE_ONLY` | `false` | Serve only the free tier (Railway production) |
| `PAYMENTS_ENABLED` | `false` | Payment milestone flag (Stripe is stubbed) |
| `PREMIUM_OPEN_ACCESS` | `true` | Allow open premium playtest access |
| `GHOSTFLEET_SOCKET_ORIGINS` | _(unset)_ | Extra comma-separated Socket.IO allowed origins |
| `GHOSTFLEET_DISCONNECT_GRACE_MS` | `90000` | Grace period before a disconnected player forfeits |
| `GHOSTFLEET_TURN_TIMEOUT_MS` | `60000` | Per-turn timeout in battle |

The app does not read a `.env` file automatically; export variables in your shell (or use
your platform's env settings, e.g. Railway) before `npm start`.

## Checks

```bash
npm run check            # syntax-check server modules
npm run smoke:multiplayer  # Socket.IO multiplayer smoke test
```

## Multiplayer

Human multiplayer uses Socket.IO on the same Express service. The server owns room state, turn validation, shot results, sunk ships, reconnect tokens, and room cleanup. Clients send intents only: create/join room, submit fleet, fire at a cell, and leave room.

Room-code play uses 6-letter lowercase room codes. Random matchmaking remains reserved for a later release.

## Railway Free-Only Deployment

For the current Railway production deployment, serve only the main game:

```bash
GHOSTFLEET_FREE_ONLY=true
```

When enabled, `/premium` and premium tier APIs return disabled responses. Socket.IO remains attached because Human multiplayer is now available from `/`.

## Payment Stub

Payments are intentionally disabled for this milestone. The server includes placeholder billing endpoints and a permissive premium gate controlled by:

```bash
PAYMENTS_ENABLED=false
PREMIUM_OPEN_ACCESS=true
```

Later, Stripe Checkout, Customer Portal, and webhook handling can replace the placeholders without changing the game routes.
