import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachMultiplayer } from './multiplayer.js';
import { getTierConfig, isPremiumAllowed, listTiers } from './tier-configs.js';
import { HOME_GAME_META, adsenseScript, renderGameMeta, renderSitePage, roomGameMeta } from './site-pages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const gameTemplatePath = path.join(clientDir, 'shared', 'game.html');
const adsTxtPath = path.join(clientDir, 'ads.txt');
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

app.get('/ads.txt', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('text/plain').sendFile(adsTxtPath);
});

function renderGame(tierName, meta = HOME_GAME_META) {
  const template = fs.readFileSync(gameTemplatePath, 'utf8');
  const config = getTierConfig(tierName);
  const bootstrap = `<script>window.GHOSTFLEET_BOOTSTRAP=${JSON.stringify(config).replace(/</g, '\\u003c')};document.documentElement.dataset.tier=${JSON.stringify(config.tier)};document.documentElement.dataset.ads=${JSON.stringify(String(config.ads.enabled))};</script>`;
  const withMeta = template.replace('<title>GhostFleet</title>', renderGameMeta(meta));
  return withMeta.replace('</head>', `${adsenseScript(config.ads.enabled)}\n${bootstrap}\n</head>`);
}

function serveTier(tierName, getMeta = () => HOME_GAME_META) {
  return (req, res) => {
    if (freeOnly && tierName !== 'free') {
      return res.status(404).type('text').send('GhostFleet premium multiplayer is disabled in this deployment.');
    }
    if (tierName === 'premium' && !isPremiumAllowed(req)) {
      return res.redirect('/?premium=required');
    }
    res.set('Cache-Control', 'no-cache');
    res.type('html').send(renderGame(tierName, getMeta(req)));
  };
}

function serveSitePage(pageKey) {
  return (req, res) => {
    const html = renderSitePage(pageKey);
    if (!html) return res.status(404).type('text').send('GhostFleet route not found');
    res.set('Cache-Control', 'no-cache');
    res.type('html').send(html);
  };
}

app.get('/', serveTier('free'));
app.get('/room/:roomId', serveTier('free', (req) => roomGameMeta(req.params.roomId)));
app.get('/free', (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  res.redirect(301, `/${query ? `?${query}` : ''}`);
});
app.get('/premium', serveTier('premium'));
app.get('/privacy', serveSitePage('privacy'));
app.get('/contact', serveSitePage('contact'));
app.get('/about', serveSitePage('about'));
app.get('/terms', serveSitePage('terms'));

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
