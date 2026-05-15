# GhostFleet

GhostFleet is a web-based strategy game inspired by tactical naval combat, with AI and room-code Human multiplayer in the main deployment.

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
- `http://localhost:3000/healthz`

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
