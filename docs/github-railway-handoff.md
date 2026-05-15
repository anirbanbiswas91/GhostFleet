# GhostFleet GitHub and Railway Handoff

## Current Status

- GitHub account: `anirbanbiswas91`
- Existing repo: `https://github.com/anirbanbiswas91/GhostFleet`
- Repo state checked on 2026-05-15: empty, public, admin access available through the connected GitHub account
- Local Git status: Git is not installed or not available on PATH in this environment
- E2E report: `docs/end-user-testing-report.md`

## Required GitHub Steps

1. Open GitHub repo settings for `anirbanbiswas91/GhostFleet`.
2. Change repository visibility from public to private.
3. Install Git for Windows or GitHub Desktop.
4. From this directory:

```bash
cd C:\Users\anirban\Documents\Codex\GhostFleet\GhostFleetRailway
git init
git branch -M main
git add .
git commit -m "Initial GhostFleet Railway app"
git remote add origin https://github.com/anirbanbiswas91/GhostFleet.git
git push -u origin main
```

## Railway Free-Only Deployment

1. Create or open the Railway project.
2. Add a service from the private GitHub repo `anirbanbiswas91/GhostFleet`.
3. Use the existing `railway.json` configuration.
4. Add this Railway environment variable:

```bash
GHOSTFLEET_FREE_ONLY=true
```

5. Deploy and smoke test:

- `/` redirects to `/free`
- `/free` serves GhostFleet
- `/healthz` returns `freeOnly: true`
- `/premium` returns disabled/404

## Notes

- Do not push before the repo is private.
- `node_modules/` is ignored by `.gitignore`; dependencies are restored through `npm install`.
- Premium multiplayer remains available locally when `GHOSTFLEET_FREE_ONLY` is unset or false.
