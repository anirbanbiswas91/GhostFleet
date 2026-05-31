# GhostFleet End-User Testing Report

Date: 2026-06-01
Environment: Windows local server, Node.js, Chrome DevTools MCP, Playwright Chromium, Playwright Microsoft Edge
Build target: stacked roadmap branch through `feature/frontend-e2e-smoke`

## Summary

Result: Pass for the automated checks, route smoke, AI browser flow, mobile-emulated layout sanity, and two-client multiplayer browser flow covered in this pass.

No blocking issues were found during this QA pass. The optional high-risk roadmap refactors, `feature/modularize-game-js` and `feature/multiplayer-stage2`, are intentionally skipped for now because they are maintenance-only changes with high regression risk and low immediate player value.

## Automated Checks

| Area | Scenario | Result |
|---|---|---|
| Lint | `npm.cmd run lint` | Pass |
| Server syntax | `npm.cmd run check` | Pass |
| Unit/integration tests | `npm.cmd test` | Pass, 38/38 |
| Multiplayer smoke | `npm.cmd run smoke:multiplayer` | Pass |
| Frontend browser smoke | `npm.cmd run test:e2e` | Pass |
| Local Chromium install | `npx.cmd playwright install chromium` | Pass, local one-time setup |

## Route Smoke

Local server: `http://127.0.0.1:4190` with `GHOSTFLEET_FREE_ONLY=true`.

| Route | Expected behavior | Result |
|---|---|---|
| `/` | Redirects to `/home` | Pass |
| `/home` | Public landing page serves | Pass |
| `/play` | Game shell serves | Pass |
| `/play?mode=ai` | Game shell serves and opens AI setup | Pass |
| `/play?mode=human` | Game shell serves and opens Friends setup | Pass |
| `/room/XK4BNM` | Direct room route serves game shell | Pass |
| `/about` | Public page serves | Pass |
| `/privacy` | Public page serves | Pass |
| `/terms` | Public page serves | Pass |
| `/contact` | Public page serves | Pass |
| `/ads.txt` | Plain text AdSense file serves | Pass |
| `/healthz` | Health JSON serves | Pass |
| `/api/tier/free` | Free tier JSON serves | Pass |

## Browser QA

| Browser / viewport | Scenario | Result |
|---|---|---|
| Chrome DevTools MCP desktop | `/home` loaded with title, GhostFleet hero, Play vs AI, Play vs Friends, How to Play, footer, and Ko-fi links | Pass |
| Chrome DevTools MCP desktop | `/home` console warnings/errors | Pass, none found |
| Chrome DevTools MCP desktop | `/home` image asset requests for crest and ocean background | Pass, 200 |
| Chrome DevTools MCP desktop | `/play?mode=ai` loaded game shell, versioned `/shared/game.css` and `/shared/game.js` | Pass, 200 |
| Chrome DevTools MCP desktop | AI setup -> Confirm -> Auto-place -> Confirm battle -> fire one shot | Pass |
| Chrome DevTools MCP desktop | AI battle log updates after player shot | Pass |
| Chrome DevTools MCP mobile emulation | `/home` mobile How to Play shows the mobile card set and no horizontal overflow | Pass |
| Microsoft Edge headless | `/home` title and Play vs AI CTA render | Pass |
| Microsoft Edge headless | AI setup -> Auto-place -> Confirm battle -> fire one shot | Pass |
| Microsoft Edge headless | Console/page errors during smoke | Pass, none found |

## Human Multiplayer Browser QA

Two isolated browser contexts were used against the same local server.

| Scenario | Expected behavior | Result |
|---|---|---|
| Host opens `/play?mode=human` | Friends setup appears with name, room size, create/join actions | Pass |
| Host creates room | URL changes to `/room/7NPAGC`, waiting lobby appears with invite link and open Player 2 slot | Pass |
| Guest opens direct room URL in isolated context | Invite name overlay appears | Pass |
| Guest enters name and joins | Both clients move from waiting lobby to arrange mode | Pass |
| Host auto-places and confirms fleet | Guest sees opponent-ready status | Pass |
| Guest auto-places and confirms fleet | Both clients enter battle mode | Pass |
| Guest fires first shot | Guest battle log records shot and stats update | Pass |
| Host receives opponent shot | Host board/log update shows the guest shot and timer state | Pass |

The full win/rematch/disconnect matrix was not manually replayed in browser during this pass. It remains covered by the existing multiplayer smoke tests and prior focused PR tests, while this pass focused on the route, layout, and two-client join/place/battle entry path.

## Assets And Requests

| Asset group | Evidence | Result |
|---|---|---|
| Shared CSS/JS | `/shared/game.css?v=...` and `/shared/game.js?v=...` returned 200 on `/play?mode=ai` | Pass |
| Core images | Crest, ocean background, ship-grid images, and achievement images returned 200 | Pass |
| Audio/static game assets | No missing media requests observed during browser smoke | Pass |
| Console health | No console errors/warnings in checked Chrome/Edge flows | Pass |

## Notes And Residual Risk

- Physical phone testing was not performed in this pass; mobile checks used Chrome DevTools viewport emulation.
- Full end-to-end multiplayer match completion, rematch, and disconnect were not replayed manually here; automated multiplayer smoke remains green.
- AdSense external requests appear during local page loads. They did not block gameplay or produce console errors during this pass.
- The optional roadmap PRs 10 and 11 are skipped intentionally. A future modularization pass should wait until broader frontend and multiplayer E2E coverage exists.
