import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server/index.js';

test('GET /healthz returns ok JSON', async () => {
  const res = await request(app).get('/healthz');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.service, 'ghostfleet-railway');
  assert.ok(res.body.multiplayer, 'expected multiplayer stats in health payload');
});

test('GET /health is an alias of /healthz', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('GET /api/tier lists available tiers', async () => {
  const res = await request(app).get('/api/tier');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.tiers), 'tiers should be an array');
  assert.ok(res.body.tiers.includes('free'), 'free tier should be listed');
});

test('GET /api/tier/:tier returns the free tier config', async () => {
  const res = await request(app).get('/api/tier/free');
  assert.equal(res.status, 200);
  assert.equal(res.body.tier, 'free');
  assert.ok(res.body.ads, 'tier config should include an ads block');
});

test('GET /home serves HTML', async () => {
  const res = await request(app).get('/home');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
});

test('GET /play renders the game page (async template + tier config)', async () => {
  const res = await request(app).get('/play');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.text, /GHOSTFLEET_BOOTSTRAP/, 'bootstrap script should be injected');
  assert.match(res.text, /\/shared\/game\.css\?v=[^"]+"/, 'game CSS should include an asset version');
  assert.match(res.text, /\/shared\/game\.js\?v=[^"]+"/, 'game JS should include an asset version');
});

test('GET /play is consistent across repeated requests (template cache)', async () => {
  const first = await request(app).get('/play');
  const second = await request(app).get('/play');
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.text, second.text, 'cached template should render identically');
});

test('unknown route returns a normalized 404 error', async () => {
  const res = await request(app).get('/this-route-does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.match(res.body.error.message, /not found/i);
});
