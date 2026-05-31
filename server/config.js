if (process.env.NODE_ENV !== 'production') {
  try {
    await import('dotenv/config');
  } catch {
    console.warn('[GhostFleet config] dotenv is not available; continuing without local .env loading.');
  }
}

const VALID_NODE_ENVS = new Set(['development', 'production', 'test']);

function warnInvalid(name, value, fallback, warn) {
  warn(`[GhostFleet config] Invalid ${name}=${JSON.stringify(value)}; using ${JSON.stringify(fallback)}.`);
}

function stringEnv(env, name, fallback = '') {
  const value = env[name];
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function boolEnv(env, name, fallback = false, warn = console.warn) {
  const value = env[name];
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  warnInvalid(name, value, fallback, warn);
  return fallback;
}

function positiveIntEnv(env, name, fallback, warn = console.warn) {
  const value = env[name];
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  warnInvalid(name, value, fallback, warn);
  return fallback;
}

function portEnv(env, name, fallback, warn = console.warn) {
  const port = positiveIntEnv(env, name, fallback, warn);
  if (port <= 65535) return port;
  warnInvalid(name, env[name], fallback, warn);
  return fallback;
}

function nodeEnv(env, warn = console.warn) {
  const value = stringEnv(env, 'NODE_ENV', 'development');
  if (VALID_NODE_ENVS.has(value)) return value;
  warnInvalid('NODE_ENV', value, 'development', warn);
  return 'development';
}

function csvEnv(env, name) {
  return stringEnv(env, name)
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function publicBaseUrlEnv(env, warn = console.warn) {
  const fallback = 'http://localhost:3000';
  const value = stringEnv(env, 'PUBLIC_BASE_URL', fallback);
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString().replace(/\/$/, '');
  } catch {
    // handled by the shared warning below
  }
  warnInvalid('PUBLIC_BASE_URL', value, fallback, warn);
  return fallback;
}

function assetVersionEnv(env) {
  const version = stringEnv(env, 'GHOSTFLEET_ASSET_VERSION')
    || stringEnv(env, 'RAILWAY_GIT_COMMIT_SHA')
    || stringEnv(env, 'SOURCE_VERSION');
  return version ? version.slice(0, 16) : '';
}

export function readConfig(env = process.env, warn = console.warn) {
  const paymentsEnabled = boolEnv(env, 'PAYMENTS_ENABLED', false, warn);
  const stripeSecretKey = stringEnv(env, 'STRIPE_SECRET_KEY');
  const stripeWebhookSecret = stringEnv(env, 'STRIPE_WEBHOOK_SECRET');
  if (paymentsEnabled && (!stripeSecretKey || !stripeWebhookSecret)) {
    warn('[GhostFleet config] PAYMENTS_ENABLED=true but Stripe secrets are incomplete; billing routes remain stubbed.');
  }
  return {
    nodeEnv: nodeEnv(env, warn),
    port: portEnv(env, 'PORT', 3000, warn),
    freeOnly: boolEnv(env, 'GHOSTFLEET_FREE_ONLY', false, warn),
    paymentsEnabled,
    premiumOpenAccess: boolEnv(env, 'PREMIUM_OPEN_ACCESS', false, warn),
    publicBaseUrl: publicBaseUrlEnv(env, warn),
    socketOrigins: csvEnv(env, 'GHOSTFLEET_SOCKET_ORIGINS'),
    disconnectGraceMs: positiveIntEnv(env, 'GHOSTFLEET_DISCONNECT_GRACE_MS', 90 * 1000, warn),
    turnTimeoutMs: positiveIntEnv(env, 'GHOSTFLEET_TURN_TIMEOUT_MS', 60 * 1000, warn),
    assetVersion: assetVersionEnv(env),
    stripeSecretKey,
    stripeWebhookSecret
  };
}

export const config = readConfig();
