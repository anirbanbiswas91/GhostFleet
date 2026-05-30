import express from 'express';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { attachMultiplayer } from './multiplayer.js';
import { getTierConfig, isPremiumAllowed, listTiers } from './tier-configs.js';
import { isKnownTier } from './validation.js';
import { AppError, NotFoundError, httpErrorBody } from './errors.js';
import { adsenseScript, renderHomePage, renderSitePage } from './site-pages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const gameTemplatePath = path.join(clientDir, 'shared', 'game.html');
const adsTxtPath = path.join(clientDir, 'ads.txt');
const faviconPath = path.join(clientDir, 'assets', 'favicon.svg');
const port = Number(process.env.PORT || 3000);
const freeOnly = process.env.GHOSTFLEET_FREE_ONLY === 'true';

const app = express();
const server = http.createServer(app);
const multiplayer = attachMultiplayer(server);

function applySecurityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()');
  next();
}

app.disable('x-powered-by');
app.use(applySecurityHeaders);
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

app.get('/favicon.ico', (req, res) => {
  res.set('Cache-Control', 'public, max-age=604800');
  res.type('image/svg+xml').sendFile(faviconPath);
});

// Wraps an async route handler so rejected promises reach Express' error
// handler (a 500) instead of becoming an unhandled rejection / hung request.
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// The game template is a static file that only changes on deploy, so it is
// read asynchronously once and cached for the process lifetime.
let gameTemplateCache = null;
async function loadGameTemplate() {
  if (gameTemplateCache === null) {
    gameTemplateCache = await readFile(gameTemplatePath, 'utf8');
  }
  return gameTemplateCache;
}

async function renderGame(tierName) {
  const [template, config] = await Promise.all([loadGameTemplate(), getTierConfig(tierName)]);
  const bootstrap = `<script>window.GHOSTFLEET_BOOTSTRAP=${JSON.stringify(config).replace(/</g, '\\u003c')};document.documentElement.dataset.tier=${JSON.stringify(config.tier)};document.documentElement.dataset.ads=${JSON.stringify(String(config.ads.enabled))};</script>`;
  return template.replace('</head>', `${adsenseScript(config.ads.enabled)}\n${bootstrap}\n</head>`);
}

function serveTier(tierName) {
  return asyncRoute(async (req, res) => {
    if (freeOnly && tierName !== 'free') {
      return res.status(404).type('text').send('GhostFleet premium multiplayer is disabled in this deployment.');
    }
    if (tierName === 'premium' && !isPremiumAllowed(req)) {
      return res.redirect('/?premium=required');
    }
    res.set('Cache-Control', 'no-cache');
    res.type('html').send(await renderGame(tierName));
  });
}

function serveSitePage(pageKey) {
  return (req, res) => {
    const html = renderSitePage(pageKey);
    if (!html) return res.status(404).type('text').send('GhostFleet route not found');
    res.set('Cache-Control', 'no-cache');
    res.type('html').send(html);
  };
}

app.get('/', (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  res.redirect(302, `/home${query ? `?${query}` : ''}`);
});
app.get('/home', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(renderHomePage());
});
app.get('/play', serveTier('free'));
app.get('/room/:roomId', serveTier('free'));
app.get('/free', (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  res.redirect(301, `/play${query ? `?${query}` : ''}`);
});
app.get('/premium', serveTier('premium'));
app.get('/privacy', serveSitePage('privacy'));
app.get('/contact', serveSitePage('contact'));
app.get('/about', serveSitePage('about'));
app.get('/terms', serveSitePage('terms'));

app.get('/api/tier', (req, res) => {
  res.json({ tiers: freeOnly ? ['free'] : listTiers() });
});

app.get('/api/tier/:tier', asyncRoute(async (req, res) => {
  const { tier } = req.params;
  if (!isKnownTier(tier)) {
    throw new NotFoundError('Unknown GhostFleet tier.', 'unknown_tier');
  }
  if (freeOnly && tier !== 'free') {
    throw new NotFoundError('Only the free GhostFleet tier is enabled in this deployment.', 'tier_disabled');
  }
  res.json(await getTierConfig(tier));
}));

function billingDisabled(feature) {
  return (req, res) => {
    if (freeOnly) throw new NotFoundError('Billing is disabled in this deployment.', 'billing_disabled');
    throw new AppError(`${feature} is reserved for the payment milestone.`, {
      code: 'billing_not_enabled',
      status: 501,
      expose: true
    });
  };
}

app.post('/api/billing/checkout', billingDisabled('Stripe Checkout'));
app.post('/api/billing/portal', billingDisabled('Stripe Customer Portal'));
app.post('/api/billing/webhook', billingDisabled('Stripe webhook handling'));

function healthCheck(req, res) {
  res.json({
    ok: true,
    service: 'ghostfleet-railway',
    freeOnly,
    tiers: freeOnly ? ['free'] : listTiers(),
    multiplayer: multiplayer.stats(),
    paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true'
  });
}

app.get('/healthz', healthCheck);
app.get('/health', healthCheck);

// Unmatched routes funnel through the centralized error handler below.
app.use((req, res, next) => {
  next(new NotFoundError('GhostFleet route not found'));
});

// Centralized error handler: logs unexpected errors server-side (with stack),
// and responds with a normalized { error: { code, message } } body. Stack
// traces are never sent to the client.
// eslint-disable-next-line no-unused-vars -- Express requires the 4-arg signature.
app.use((err, req, res, next) => {
  const { status, body } = httpErrorBody(err);
  // Log only genuinely unexpected errors (not the expected, exposable ones like
  // validation / not-found / billing stubs) to keep server logs useful.
  const expected = err instanceof AppError && err.expose;
  if (!expected) {
    console.error(`[GhostFleet] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  }
  if (res.headersSent) return next(err);
  res.status(status).json(body);
});

// Only bind the port when executed directly (e.g. `node server/index.js` / `npm start`).
// When imported by tests, the app/server are exported without listening.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(port, () => {
    console.log(`GhostFleet Railway app listening on port ${port}`);
  });
}

export { app, server, multiplayer };
