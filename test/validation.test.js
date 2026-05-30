import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server/index.js';
import { isKnownTier } from '../server/validation.js';
import { getTierConfig } from '../server/tier-configs.js';

test('isKnownTier accepts known tiers only', () => {
  assert.equal(isKnownTier('free'), true);
  assert.equal(isKnownTier('premium'), true);
  assert.equal(isKnownTier('banana'), false);
  assert.equal(isKnownTier('__proto__'), false, 'dangerous key rejected');
  assert.equal(isKnownTier('constructor'), false, 'dangerous key rejected');
  assert.equal(isKnownTier(''), false);
  assert.equal(isKnownTier(null), false);
});

test('GET /api/tier/:tier rejects an unknown tier with a safe 404', async () => {
  const res = await request(app).get('/api/tier/banana');
  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'unknown_tier');
});

test('GET /api/tier/:tier does not crash on dangerous keys (no 500)', async () => {
  for (const bad of ['__proto__', 'constructor', 'prototype']) {
    const res = await request(app).get(`/api/tier/${bad}`);
    assert.equal(res.status, 404, `${bad} should be a safe 404`);
    assert.notEqual(res.status, 500, `${bad} must not crash the server`);
  }
});

test('GET /api/tier/:tier still serves a valid tier', async () => {
  const res = await request(app).get('/api/tier/free');
  assert.equal(res.status, 200);
  assert.equal(res.body.tier, 'free');
});

test('getTierConfig falls back to free for unknown/dangerous names without throwing', () => {
  assert.doesNotThrow(() => getTierConfig('__proto__'));
  assert.equal(getTierConfig('__proto__').tier, 'free');
  assert.equal(getTierConfig('banana').tier, 'free');
  assert.equal(getTierConfig('free').tier, 'free', 'valid tier unchanged');
});
