import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const configDir = path.join(rootDir, 'client', 'shared', 'config');
const themeDir = path.join(rootDir, 'client', 'shared', 'themes');

// Startup-only sync read: the tier index is loaded once when the module is
// first imported, before the server starts accepting requests. It is never
// read again at runtime, so it is not on any request/socket hot path.
const tiers = JSON.parse(fs.readFileSync(path.join(configDir, 'tiers.json'), 'utf8'));

// Theme manifests are small static files that change only on deploy. They are
// read asynchronously and cached for the process lifetime, so each manifest
// touches the disk at most once instead of on every render/API request.
const themeCache = new Map();
async function loadThemeManifest(manifest) {
  if (themeCache.has(manifest)) return themeCache.get(manifest);
  const theme = JSON.parse(await readFile(path.join(themeDir, manifest), 'utf8'));
  themeCache.set(manifest, theme);
  return theme;
}

export function listTiers() {
  return Object.keys(tiers);
}

export async function getTierConfig(tierName = 'free') {
  // Use an own-property check so unknown names and dangerous keys such as
  // "__proto__"/"constructor" safely fall back to the free tier instead of
  // resolving to a prototype object (which previously threw on theme lookup).
  const hasTier = Object.prototype.hasOwnProperty.call(tiers, tierName);
  const tier = hasTier ? tiers[tierName] : tiers.free;
  const resolvedName = hasTier ? tierName : 'free';
  const theme = await loadThemeManifest(tier.themeManifest);
  return {
    ...tier,
    tier: resolvedName,
    theme
  };
}

export function isPremiumAllowed(req) {
  if (process.env.PAYMENTS_ENABLED !== 'true') return true;
  if (process.env.PREMIUM_OPEN_ACCESS === 'true') return true;

  const mockEntitlements = String(req.headers['x-ghostfleet-entitlements'] || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return mockEntitlements.includes('premium');
}
