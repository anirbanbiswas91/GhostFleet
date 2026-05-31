import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../server/config.js';

function captureWarnings() {
  const warnings = [];
  return {
    warnings,
    warn(message) {
      warnings.push(message);
    }
  };
}

test('readConfig parses valid environment values once', () => {
  const { warnings, warn } = captureWarnings();
  const config = readConfig({
    NODE_ENV: 'production',
    PORT: '4321',
    GHOSTFLEET_FREE_ONLY: 'true',
    PAYMENTS_ENABLED: 'true',
    PREMIUM_OPEN_ACCESS: 'false',
    PUBLIC_BASE_URL: 'https://ghostfleet.in/',
    GHOSTFLEET_SOCKET_ORIGINS: 'https://preview.example, http://localhost:3000 ',
    GHOSTFLEET_DISCONNECT_GRACE_MS: '45000',
    GHOSTFLEET_TURN_TIMEOUT_MS: '60000',
    GHOSTFLEET_ASSET_VERSION: 'release-2026-05-31-extra',
    STRIPE_SECRET_KEY: 'sk_test_secret',
    STRIPE_WEBHOOK_SECRET: 'whsec_secret'
  }, warn);

  assert.equal(config.nodeEnv, 'production');
  assert.equal(config.port, 4321);
  assert.equal(config.freeOnly, true);
  assert.equal(config.paymentsEnabled, true);
  assert.equal(config.premiumOpenAccess, false);
  assert.equal(config.publicBaseUrl, 'https://ghostfleet.in');
  assert.deepEqual(config.socketOrigins, ['https://preview.example', 'http://localhost:3000']);
  assert.equal(config.disconnectGraceMs, 45000);
  assert.equal(config.turnTimeoutMs, 60000);
  assert.equal(config.assetVersion, 'release-2026-05-');
  assert.equal(warnings.length, 0);
});

test('readConfig warns and falls back on invalid non-secret values', () => {
  const { warnings, warn } = captureWarnings();
  const config = readConfig({
    NODE_ENV: 'staging',
    PORT: '70000',
    GHOSTFLEET_FREE_ONLY: 'sometimes',
    PAYMENTS_ENABLED: 'nope',
    PREMIUM_OPEN_ACCESS: 'maybe',
    PUBLIC_BASE_URL: 'not a url',
    GHOSTFLEET_DISCONNECT_GRACE_MS: '-1',
    GHOSTFLEET_TURN_TIMEOUT_MS: 'slow'
  }, warn);

  assert.equal(config.nodeEnv, 'development');
  assert.equal(config.port, 3000);
  assert.equal(config.freeOnly, false);
  assert.equal(config.paymentsEnabled, false);
  assert.equal(config.premiumOpenAccess, false);
  assert.equal(config.publicBaseUrl, 'http://localhost:3000');
  assert.equal(config.disconnectGraceMs, 90000);
  assert.equal(config.turnTimeoutMs, 60000);
  assert.ok(warnings.length >= 7);
});

test('readConfig warns about incomplete Stripe settings without logging secrets', () => {
  const { warnings, warn } = captureWarnings();
  const secretValue = 'sk_live_should_not_be_logged';
  const config = readConfig({
    PAYMENTS_ENABLED: 'true',
    STRIPE_SECRET_KEY: secretValue
  }, warn);

  assert.equal(config.paymentsEnabled, true);
  assert.equal(config.stripeSecretKey, secretValue);
  assert.equal(config.stripeWebhookSecret, '');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Stripe secrets are incomplete/);
  assert.equal(warnings[0].includes(secretValue), false);
});
