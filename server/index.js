import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachMultiplayer } from './multiplayer.js';
import { getTierConfig, isPremiumAllowed, listTiers } from './tier-configs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const gameTemplatePath = path.join(clientDir, 'shared', 'game.html');
const port = Number(process.env.PORT || 3000);
const freeOnly = process.env.GHOSTFLEET_FREE_ONLY === 'true';

const app = express();
const server = http.createServer(app);
const multiplayer = attachMultiplayer(server);
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use('/assets', express.static(path.join(clientDir, 'assets'), {
  immutable: true,
  maxAge: '7d'
}));
app.use('/shared', express.static(path.join(clientDir, 'shared'), {
  maxAge: '1h'
}));

function renderGame(tierName) {
  const template = fs.readFileSync(gameTemplatePath, 'utf8');
  const config = getTierConfig(tierName);
  const bootstrap = `<script>window.GHOSTFLEET_BOOTSTRAP=${JSON.stringify(config).replace(/</g, '\\u003c')};document.documentElement.dataset.tier=${JSON.stringify(config.tier)};document.documentElement.dataset.ads=${JSON.stringify(String(config.ads.enabled))};</script>`;
  return template.replace('</head>', `${bootstrap}\n</head>`);
}

function serveTier(tierName) {
  return (req, res) => {
    if (freeOnly && tierName !== 'free') {
      return res.status(404).type('text').send('GhostFleet premium multiplayer is disabled in this deployment.');
    }
    if (tierName === 'premium' && !isPremiumAllowed(req)) {
      return res.redirect('/free?premium=required');
    }
    res.type('html').send(renderGame(tierName));
  };
}

app.get('/', (req, res) => res.redirect('/free'));
app.get('/free', serveTier('free'));
app.get('/premium', serveTier('premium'));

app.get('/api/tier', (req, res) => {
  res.json({ tiers: freeOnly ? ['free'] : listTiers() });
});

app.get('/api/tier/:tier', (req, res) => {
  if (freeOnly && req.params.tier !== 'free') {
    return res.status(404).json({
      error: 'tier_disabled',
      message: 'Only the free GhostFleet tier is enabled in this deployment.'
    });
  }
  res.json(getTierConfig(req.params.tier));
});

app.post('/api/billing/checkout', (req, res) => {
  if (freeOnly) return res.status(404).json({ error: 'billing_disabled' });
  res.status(501).json({
    error: 'billing_not_enabled',
    message: 'Stripe Checkout is reserved for the payment milestone.'
  });
});

app.post('/api/billing/portal', (req, res) => {
  if (freeOnly) return res.status(404).json({ error: 'billing_disabled' });
  res.status(501).json({
    error: 'billing_not_enabled',
    message: 'Stripe Customer Portal is reserved for the payment milestone.'
  });
});

app.post('/api/billing/webhook', (req, res) => {
  if (freeOnly) return res.status(404).json({ error: 'billing_disabled' });
  res.status(501).json({
    error: 'billing_not_enabled',
    message: 'Stripe webhook handling is reserved for the payment milestone.'
  });
});

app.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    service: 'ghostfleet-railway',
    freeOnly,
    tiers: freeOnly ? ['free'] : listTiers(),
    multiplayer: multiplayer.stats(),
    paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true'
  });
});

app.use((req, res) => {
  res.status(404).type('text').send('GhostFleet route not found');
});

server.listen(port, () => {
  console.log(`GhostFleet Railway app listening on port ${port}`);
});
