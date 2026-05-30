import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const configDir = path.join(rootDir, 'client', 'shared', 'config');
const themeDir = path.join(rootDir, 'client', 'shared', 'themes');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const tiers = readJson(path.join(configDir, 'tiers.json'));

export function listTiers() {
  return Object.keys(tiers);
}

export function getTierConfig(tierName = 'free') {
  // Use an own-property check so unknown names and dangerous keys such as
  // "__proto__"/"constructor" safely fall back to the free tier instead of
  // resolving to a prototype object (which previously threw on theme lookup).
  const hasTier = Object.prototype.hasOwnProperty.call(tiers, tierName);
  const tier = hasTier ? tiers[tierName] : tiers.free;
  const resolvedName = hasTier ? tierName : 'free';
  const theme = readJson(path.join(themeDir, tier.themeManifest));
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
