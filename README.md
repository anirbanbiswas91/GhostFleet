# GhostFleet Railway

GhostFleet is a web-based strategy game inspired by tactical naval combat, with a free single-player deployment and local multiplayer experiments for future premium work.

One Railway-deployable Node app serving GhostFleet game routes:

- `/free` - ad-supported GhostFleet.
- `/premium` - local/dev open-playtest GhostFleet room-code multiplayer.

## Local Run

```bash
npm install
npm start
```

Open:

- `http://localhost:3000/free`
- `http://localhost:3000/premium`
- `http://localhost:3000/healthz`

## Multiplayer

Premium multiplayer uses Socket.IO on the same Express service during local development. The server owns room state, turn validation, shot results, sunk ships, reconnect tokens, and room cleanup. Clients send intents only: create/join room, submit fleet, fire at a cell, and leave room.

Room-code play uses 6-letter lowercase room codes. Random matchmaking remains reserved for a later release.

## Railway Free-Only Deployment

For the current Railway production deployment, serve only the free version:

```bash
GHOSTFLEET_FREE_ONLY=true
```

When enabled, `/premium` and premium tier APIs return disabled responses, and Socket.IO multiplayer is not attached.

## Payment Stub

Payments are intentionally disabled for this milestone. The server includes placeholder billing endpoints and a permissive premium gate controlled by:

```bash
PAYMENTS_ENABLED=false
PREMIUM_OPEN_ACCESS=true
```

Later, Stripe Checkout, Customer Portal, and webhook handling can replace the placeholders without changing the game routes.
