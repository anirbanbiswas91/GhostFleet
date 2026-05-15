# GhostFleet End-User Testing Report

Date: 2026-05-15
Environment: Windows, Node.js local server, Microsoft Edge headless, Socket.IO client smoke tests
Build target: `GhostFleetRailway`

## Summary

Result: Pass for the local gameplay, multiplayer, and free-only deployment checks covered in this pass.

This report was completed before GitHub push or Railway deployment, per the requested release order.

## Automated Checks

| Area | Scenario | Result |
|---|---|---|
| Static server checks | `npm.cmd run check` | Pass |
| Server syntax | `node --check server/index.js`, `server/multiplayer.js`, `server/tier-configs.js` | Pass |
| Inline game script | Parsed and compiled inline scripts from `client/shared/game.html` | Pass |
| Local dev routes | `/`, `/free` redirect, `/premium`, `/api/tier/free`, `/api/tier/premium`, `/healthz` | Pass |
| Free-only routes | `GHOSTFLEET_FREE_ONLY=true`: `/` works, `/free` redirects to `/`, `/premium` 404, premium tier API 404 | Pass |
| Multiplayer socket flow | create 10×10 room, uppercase join, auto placement, submit fleets, miss/hit/sunk, rematch, exit notice | Pass |
| Headless Edge free flow | Clear-Ship label, disabled initial state, auto-place, select ship, clear selected ship, fleet headings | Pass |
| Human multiplayer flow | Join Room, Back, Create Room, 6-letter lowercase room code | Pass |

## Free Mode User Actions

| User action | Expected behavior | Result |
|---|---|---|
| Open `/` | Classic GhostFleet loads with the AI/Human opponent selector | Pass |
| Arrange mode starts | Carrier selected by default, Clear-Ship disabled until a placed ship is selected | Pass |
| Auto-Place | Places all ships and enables Confirm | Pass |
| Tap/click placed ship | Ship enters edit mode and Clear-Ship enables | Pass |
| Clear-Ship(C) | Removes only the selected ship, keeps other ships, reselects removed ship for placement | Pass |
| Confirm after full fleet | Starts battle when all ships are placed | Pass |
| Fleet status panel | Shows `Enemy Fleet` and `Your Fleet`, not duplicate enemy headings | Pass |
| Battle visuals | Existing hit, miss, sunk, ripple, and explosion sprite paths remain active | Pass via script/smoke coverage |

## Human Multiplayer Actions

| User action | Expected behavior | Result |
|---|---|---|
| Choose Human from `/` | Multiplayer room modal appears | Pass |
| Select room size | Host can choose `8×8` or `10×10` before creating a room | Pass |
| Join Room | Shows room-code input and changes actions to `Back` / `Enter Room` | Pass |
| Back | Hides room-code input and returns to `Create Room` / `Join Room` | Pass |
| Create Room | Generates a lowercase 6-letter room code and keeps the host-selected board size | Pass |
| Join with uppercase code | Server normalizes input, joins the lowercase room, and inherits host board size | Pass |
| Two clients connected | Placement starts automatically | Pass |
| Submit fleets | Battle starts after both fleets are submitted | Pass |
| Fire shots | Server validates turns and broadcasts miss/hit/sunk results to both clients | Pass |
| New Game after result | First player waits; both players requesting rematch restarts placement in the same room and board size | Pass |
| Exit Room | Leaving player exits the room and the opponent receives a disconnected update | Pass |

## Production Free-Only Deployment Actions

| Route/action | Expected behavior with `GHOSTFLEET_FREE_ONLY=true` | Result |
|---|---|---|
| `/` | Main GhostFleet game serves normally | Pass |
| `/free` | Redirects to `/` for old links | Pass |
| `/premium` | Premium multiplayer disabled response | Pass |
| `/api/tier` | Returns only `free` | Pass |
| `/api/tier/premium` | Returns disabled/404 response | Pass |
| `/healthz` | Reports `freeOnly: true` and active multiplayer stats | Pass |

## Notes

- Browser checks used headless Microsoft Edge through the Chrome DevTools Protocol.
- Visual screenshot review was not captured in this pass; functional browser interaction and DOM state were verified.
- GitHub Desktop bundled Git is available and used for version control.
