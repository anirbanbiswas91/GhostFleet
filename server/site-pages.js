const SITE_ORIGIN = 'https://ghostfleet.in';
export const ADSENSE_CLIENT_ID = 'ca-pub-8532666088459423';
const SOCIAL_IMAGE = `${SITE_ORIGIN}/assets/ghostfleet-ocean-cliff.jpg`;
const CONTACT_EMAIL = 'ghostfleet2026@gmail.com';
const KOFI_URL = 'https://ko-fi.com/ghostfleet';

const HOME_META = {
  title: 'GhostFleet \u2014 Free Online Naval Strategy Game',
  description: 'GhostFleet is a free browser-based naval strategy game. Play against AI or challenge a friend online with private room codes. No download required.',
  canonicalUrl: `${SITE_ORIGIN}/home`,
  ogTitle: 'GhostFleet \u2014 Free Online Naval Strategy Game',
  ogDescription: 'Play GhostFleet, a free online naval strategy game with AI battles, multiplayer room codes, and battle stats.',
  ogUrl: `${SITE_ORIGIN}/home`,
  ogType: 'website',
  imageUrl: SOCIAL_IMAGE,
  twitterCard: 'summary_large_image'
};

const SITE_PAGES = {
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy \u2014 GhostFleet',
    description: 'Read the GhostFleet privacy policy, including browser storage, advertising, third-party services, and contact details.',
    content: `<h1>Privacy Policy</h1>
      <h2>Overview</h2>
      <p>GhostFleet is a free browser-based naval strategy game available at <a href="https://ghostfleet.in">https://ghostfleet.in</a>.</p>
      <h2>Information We Collect</h2>
      <p>GhostFleet may store basic gameplay preferences and session information in your browser using local storage or cookies. This may include settings, game state, or other information needed to run the game.</p>
      <h2>Cookies and Local Storage</h2>
      <p>The game may use local storage or cookies to improve gameplay, remember preferences, and support site functionality.</p>
      <h2>Advertising</h2>
      <p>GhostFleet may display ads through Google AdSense or similar advertising services. Third-party vendors, including Google, may use cookies to serve ads based on a user&rsquo;s prior visits to this website or other websites. Users can manage personalized advertising through Google&rsquo;s ad settings.</p>
      <h2>Third-Party Services</h2>
      <p>GhostFleet may use third-party services for hosting, analytics, advertising, or gameplay infrastructure. These services may process limited technical information such as browser type, device information, IP address, and usage data.</p>
      <h2>Children&rsquo;s Privacy</h2>
      <p>GhostFleet is intended as a general-audience strategy game. We do not knowingly collect personal information from children.</p>
      <h2>Contact</h2>
      <p>For privacy questions, contact:<br/><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>`
  },
  contact: {
    path: '/contact',
    title: 'Contact GhostFleet',
    description: 'Contact GhostFleet for support, feedback, bug reports, privacy questions, or business inquiries.',
    content: `<h1>Contact GhostFleet</h1>
      <p>For support, feedback, bug reports, privacy questions, or business inquiries, contact GhostFleet at:</p>
      <p><strong>Email:</strong> <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><br/>
      <strong>Website:</strong> <a href="https://ghostfleet.in">https://ghostfleet.in</a></p>`
  },
  about: {
    path: '/about',
    title: 'About GhostFleet',
    description: 'Learn about GhostFleet, a free online naval strategy game with AI battles, multiplayer room codes, battle stats, and move analysis.',
    content: `<h1>About GhostFleet</h1>
      <p>GhostFleet is a free online naval strategy game built for quick tactical battles in a modern browser. You command a hidden fleet, read the grid, and use every hit or miss to narrow down where the enemy ships are waiting. It is designed to be easy to start, but rewarding for players who enjoy pattern reading, probability, and careful turn-by-turn decisions.</p>
      <p>You can play directly at <a href="https://ghostfleet.in">https://ghostfleet.in</a> with no download and no account required. Solo players can practice against AI difficulty modes, while online players can create multiplayer rooms and share private room codes with friends. The room-code flow keeps matches simple: one player creates a room, shares the link or code, and both players place fleets before taking turns.</p>
      <p>GhostFleet includes battle stats and move analysis after each match, so players can review accuracy, pressure, ship sinks, and opportunities to improve the hunt. It is built as an independent web game focused on fast browser access, mobile-friendly play, and replayable naval strategy sessions.</p>
      <section class="support-section" aria-labelledby="support-heading">
        <div>
          <h2 id="support-heading">Support the Fleet</h2>
          <p>GhostFleet is an indie browser game experiment built with AI tools, late-night testing, and a love for old-school naval battles. If you enjoy it, you can support future development here and help keep the fleet sailing.</p>
        </div>
        <a class="support-button" href="${KOFI_URL}" target="_blank" rel="noopener noreferrer">Support GhostFleet</a>
      </section>
      <h2>How to Play GhostFleet</h2>
      <p>Each player hides a fleet on their own grid. Your Fleet shows your ship positions and incoming damage, while Enemy Waters is where you fire. On desktop, both boards stay visible; on mobile, use the Enemy Waters and Your Fleet tabs to switch views.</p>
      <p>Place ships by selecting a vessel and choosing valid cells on your grid. Rotate (R) ships to change direction, drag placed ships to adjust your layout, or click a placed ship and press C to remove only that ship. Auto-place (A) can randomly fill your whole fleet before you confirm.</p>
      <p>When the battle starts, fire at unrevealed cells on Enemy Waters. Red means hit and white means miss. A ship sinks when every cell it occupies has been hit. In multiplayer, both captains must confirm their fleets before turns begin, and each player fires once per turn.</p>
      <p>After the match, View Analysis shows accuracy, pressure, ships sunk, and tips to improve your next battle.</p>`
  },
  terms: {
    path: '/terms',
    title: 'Terms of Use \u2014 GhostFleet',
    description: 'Read the GhostFleet terms of use for site access, gameplay availability, advertising, fair use, changes, and contact details.',
    content: `<h1>Terms of Use</h1>
      <h2>Use of the Site</h2>
      <p>GhostFleet is provided as a free browser-based game. By using the site, you agree to use it responsibly and only for lawful gameplay and personal entertainment.</p>
      <h2>Gameplay and Availability</h2>
      <p>The game may change, be updated, or become temporarily unavailable at any time. Multiplayer rooms, game sessions, and saved browser state may expire or reset.</p>
      <h2>Advertising</h2>
      <p>GhostFleet may display advertising after approval from ad networks.</p>
      <h2>Fair Use</h2>
      <p>Users should not abuse multiplayer features, interfere with the site, attempt to cheat, or disrupt other players.</p>
      <h2>Changes to the Game</h2>
      <p>GhostFleet may be improved, balanced, redesigned, or expanded over time. Features may be added, removed, or changed without prior notice.</p>
      <h2>Contact</h2>
      <p>For questions, contact:<br/><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>`
  }
};

const DESKTOP_HOW_TO = [
  ['Objective', 'You and your opponent each hide a fleet of ships on your own grid. Take turns firing at each other&rsquo;s waters &mdash; hit every enemy ship before yours are sunk. Last fleet afloat wins.'],
  ['Your Grid vs Enemy Waters', 'You have two boards. Your Fleet shows where your ships are and tracks incoming hits. Enemy Waters is where you fire each turn. Both stay visible at all times.'],
  ['Place Your Ships', 'Pick a ship from the Fleet Dock, then click your grid to place it. Use Rotate (R) to change direction. Drag a placed ship to move it, or click it and press C to remove it.'],
  ['Auto-place (A)', 'In a hurry? Hit Auto-place (A) to randomly scatter your entire fleet instantly. You can auto-place as many times as you like.'],
  ['Taking a Shot', 'Click any unrevealed cell on Enemy Waters to fire. &#128308; Red = hit. &#9898; White = miss. You fire once per turn, then your opponent fires back.'],
  ['Sinking a Ship', 'A ship sinks when every cell it occupies has been hit. The game tells you when a ship goes down &mdash; yours or theirs.'],
  ['Starting the Battle', 'Once all your ships are placed, click Confirm / Start Battle. In multiplayer, both players must be ready before the battle begins.'],
  ['After the Game', 'View Analysis breaks down your accuracy, pressure, sinks, and gives tips to improve. Worth a look even if you win.']
];

const MOBILE_HOW_TO = [
  ['The Goal', 'Both players hide ships on their own grid. Take turns guessing where the enemy fleet is hiding. Sink all their ships before they sink yours &mdash; last one floating wins.'],
  ['Place Your Ships', 'Tap a ship from the dock, then tap your grid to place it. Tap a placed ship to move or rotate it. Press C to remove just that ship, or use Auto-place (A) to fill your grid randomly.'],
  ['Switch Boards', 'Use the Enemy Waters and Your Fleet tabs to switch views. Fire on Enemy Waters. Check Your Fleet to see damage you&rsquo;ve taken.'],
  ['Fire!', 'Tap any cell on Enemy Waters to shoot. &#128308; Red = hit, &#9898; White = miss. One shot per turn. A ship sinks when every part of it is hit.'],
  ['Start the Battle', 'When all ships are placed, tap the button above your board to confirm. In multiplayer, both players confirm before the game starts.'],
  ['After the Game', 'Tap View Analysis to see how you played &mdash; accuracy, ships sunk, and tips to get better next time.']
];

export function adsenseScript(enabled = true) {
  if (!enabled) return '';
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}" crossorigin="anonymous"></script>`;
}

export function renderHomePage() {
  return renderShell(HOME_META, `<main class="landing-page" id="main">
    <section class="hero-card">
      <div class="brand-row">
        <img class="brand-crest" src="/assets/ghostfleet-crest.jpg" alt="" aria-hidden="true"/>
        <div>
          <h1>GhostFleet</h1>
        </div>
      </div>
      <p class="hero-copy">Command a haunted fleet across stormy-dark waters</p>
      <div class="cta-grid" aria-label="Choose game mode">
        <a class="cta-card" href="/play?mode=ai">
          <span>Play vs AI</span>
          <small>Practice against Easy, Med, or Hard difficulty.</small>
        </a>
        <a class="cta-card cta-human" href="/play?mode=human">
          <span>Play vs Friends</span>
          <small>Create a private room and share a code or link.</small>
        </a>
      </div>
    </section>

    <section class="content-card howto-section">
      <h2>How to Play GhostFleet</h2>
      <div class="howto-grid howto-desktop">
        ${renderCards(DESKTOP_HOW_TO)}
      </div>
      <div class="howto-grid howto-mobile">
        ${renderCards(MOBILE_HOW_TO)}
      </div>
    </section>
  </main>
  <a class="kofi-floating" href="${KOFI_URL}" target="_blank" rel="noopener noreferrer" aria-label="Support GhostFleet on Ko-fi">
    <span class="kofi-desktop-label">Support GhostFleet</span>
    <span class="kofi-mobile-label">Support</span>
  </a>`);
}

export function renderSitePage(pageKey) {
  const page = SITE_PAGES[pageKey];
  if (!page) return null;
  const meta = {
    title: page.title,
    description: page.description,
    canonicalUrl: `${SITE_ORIGIN}${page.path}`,
    ogTitle: page.title,
    ogDescription: page.description,
    ogUrl: `${SITE_ORIGIN}${page.path}`,
    ogType: 'website',
    imageUrl: SOCIAL_IMAGE,
    twitterCard: 'summary_large_image'
  };
  return renderShell(meta, `<main class="site-page" id="main">
    <a class="back-link" href="/home">&larr; Back to Home</a>
    <section class="content-card text-page">
      ${page.content}
    </section>
  </main>`);
}

export function renderMetaTags(meta, includeAdsenseMeta = false) {
  const image = meta.imageUrl || '';
  return `${includeAdsenseMeta ? `<meta name="google-adsense-account" content="${ADSENSE_CLIENT_ID}"/>` : ''}
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}"/>
<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}"/>
<meta property="og:title" content="${escapeHtml(meta.ogTitle || meta.title)}"/>
<meta property="og:description" content="${escapeHtml(meta.ogDescription || meta.description)}"/>
<meta property="og:url" content="${escapeHtml(meta.ogUrl || meta.canonicalUrl)}"/>
<meta property="og:type" content="${escapeHtml(meta.ogType || 'website')}"/>
${image ? `<meta property="og:image" content="${escapeHtml(image)}"/>` : '<!-- TODO: Add an Open Graph image when a dedicated social preview asset is available. -->'}
<meta name="twitter:card" content="${escapeHtml(meta.twitterCard || (image ? 'summary_large_image' : 'summary'))}"/>
<meta name="twitter:title" content="${escapeHtml(meta.ogTitle || meta.title)}"/>
<meta name="twitter:description" content="${escapeHtml(meta.ogDescription || meta.description)}"/>
${image ? `<meta name="twitter:image" content="${escapeHtml(image)}"/>` : '<!-- TODO: Add a Twitter image when a dedicated social preview asset is available. -->'}`;
}

function renderShell(meta, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"/>
<meta name="theme-color" content="#06121a"/>
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"/>
${renderMetaTags(meta, true)}
${adsenseScript(true)}
<style>${SITE_PAGE_CSS}</style>
</head>
<body>
  ${content}
  ${SITE_FOOTER}
</body>
</html>`;
}

function renderCards(cards) {
  return cards.map(([title, body]) => `<article class="howto-card"><h3>${title}</h3><p>${body}</p></article>`).join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const SITE_FOOTER = `<footer class="site-footer" aria-label="Site links">
  <nav>
    <a href="/home">Home</a>
    <a href="/play">Play</a>
    <a href="/about">About</a>
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms</a>
    <a href="/contact">Contact</a>
    <a class="support-footer-link" href="${KOFI_URL}" target="_blank" rel="noopener noreferrer">Tip the Captain</a>
  </nav>
  <p>&copy; 2026 GhostFleet. Free online naval strategy game.</p>
</footer>`;

const SITE_PAGE_CSS = `
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;min-height:100vh;font-family:'Segoe UI',Arial,sans-serif;color:#e5edf5;background:#06121a;
    background-image:linear-gradient(180deg,rgba(2,8,13,.18),rgba(2,8,13,.88)),url('/assets/ghostfleet-ocean-cliff.jpg');
    background-size:cover;background-position:center;background-attachment:fixed;display:flex;flex-direction:column;align-items:center;padding:24px 12px}
  body::before{content:'';position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 26%,rgba(1,8,12,.42) 82%);z-index:0}
  a{color:#5eead4}
  .landing-page,.site-page,.site-footer{position:relative;z-index:1;width:min(1080px,100%)}
  .hero-card,.content-card{background:linear-gradient(135deg,rgba(6,18,26,.92),rgba(18,24,39,.9));border:1px solid rgba(226,185,111,.58);border-radius:16px;
    box-shadow:0 24px 60px rgba(0,0,0,.42),inset 0 0 0 1px rgba(255,255,255,.04)}
  .hero-card{padding:clamp(24px,5vw,52px);margin-bottom:18px}
  .content-card{padding:clamp(20px,4vw,36px);margin:18px 0}
  .brand-row{display:flex;align-items:center;gap:16px;justify-content:center;text-align:left}
  .brand-crest{width:76px;height:76px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px rgba(226,185,111,.72),0 0 24px rgba(94,234,212,.25);background:#041019}
  h1{margin:0;color:#e2b96f;font-size:clamp(2.5rem,7vw,5.2rem);line-height:.95;text-shadow:0 0 28px rgba(226,185,111,.34)}
  h2{margin:0 0 16px;color:#e2b96f;font-size:clamp(1.25rem,3vw,1.8rem);text-transform:uppercase;letter-spacing:1.6px;text-align:center}
  h3{margin:0 0 8px;color:#7dd3fc;font-size:1rem;letter-spacing:.4px}
  p,li{line-height:1.58;color:#dce8f1}
  .hero-copy{max-width:660px;margin:18px auto 20px;color:#e8fbff;font-size:clamp(1rem,2vw,1.22rem);font-weight:800;text-align:center;letter-spacing:.3px;
    text-shadow:0 0 18px rgba(94,234,212,.34),0 0 28px rgba(226,185,111,.16)}
  .hero-copy::before,.hero-copy::after{content:'';display:inline-block;width:38px;height:1px;margin:0 12px 5px;
    background:linear-gradient(90deg,transparent,rgba(226,185,111,.9),rgba(94,234,212,.75))}
  .hero-copy::after{background:linear-gradient(90deg,rgba(94,234,212,.75),rgba(226,185,111,.9),transparent)}
  .cta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:760px;margin:0 auto}
  .cta-card{display:flex;flex-direction:column;gap:4px;min-height:82px;justify-content:center;text-align:center;text-decoration:none;border-radius:10px;
    background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 38%,rgba(1,12,18,.22)),
      radial-gradient(circle at 20% 0%,rgba(94,234,212,.26),transparent 42%),
      linear-gradient(135deg,rgba(8,27,35,.96),rgba(11,50,61,.9));
    border:1px solid rgba(226,185,111,.5);color:#f8fafc;font-weight:900;padding:12px 14px;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.05),0 12px 26px rgba(0,0,0,.36),0 0 22px rgba(94,234,212,.12)}
  .cta-card:hover,.cta-card:focus{outline:none;border-color:#e2b96f;transform:translateY(-1px);
    box-shadow:0 0 0 3px rgba(226,185,111,.18),0 16px 34px rgba(0,0,0,.42),0 0 28px rgba(94,234,212,.2)}
  .cta-card span{font-size:clamp(1rem,2.3vw,1.24rem);line-height:1.05;color:#fff7d6;text-shadow:0 0 14px rgba(226,185,111,.25)}
  .cta-card small{color:#cfe9ef;font-weight:800;line-height:1.25;font-size:clamp(.7rem,1.5vw,.83rem)}
  .cta-human{background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 38%,rgba(1,12,18,.22)),
      radial-gradient(circle at 20% 0%,rgba(226,185,111,.24),transparent 42%),
      linear-gradient(135deg,rgba(17,24,39,.96),rgba(28,42,72,.9))}
  .howto-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .howto-mobile{display:none}
  .howto-card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:14px;min-height:126px}
  .howto-card p{margin:0;font-size:.96rem}
  .back-link{display:inline-flex;margin:0 0 14px;color:#a7f3f0;text-decoration:none;font-weight:900;letter-spacing:.4px}
  .text-page h1{font-size:clamp(2rem,5vw,3rem);margin:0 0 18px}
  .text-page h2{text-align:left;color:#7dd3fc;font-size:1.02rem;margin:26px 0 10px}
  .support-section{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin:24px 0;
    border:1px solid rgba(94,234,212,.26);border-radius:14px;padding:18px;
    background:linear-gradient(135deg,rgba(94,234,212,.08),transparent 36%),rgba(5,12,18,.62)}
  .support-section h2{margin:0 0 8px;color:#e2b96f}
  .support-section p{margin:0}
  .support-button,.support-footer-link,.kofi-floating{display:inline-flex;align-items:center;justify-content:center;gap:8px;
    text-decoration:none;font-weight:900;letter-spacing:.25px;border:1px solid rgba(226,185,111,.64);color:#fff7d6;
    background:linear-gradient(180deg,rgba(226,185,111,.18),rgba(226,185,111,.06)),rgba(6,15,24,.92);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.06),0 0 18px rgba(226,185,111,.14)}
  .support-button:hover,.support-footer-link:hover,.kofi-floating:hover{border-color:#f7d587;text-decoration:none;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.09),0 0 24px rgba(94,234,212,.18);transform:translateY(-1px)}
  .support-button:focus-visible,.support-footer-link:focus-visible,.kofi-floating:focus-visible{outline:3px solid rgba(94,234,212,.72);outline-offset:3px}
  .support-button::before,.support-footer-link::before,.kofi-floating::before{content:'';width:8px;height:8px;border-radius:50%;
    background:#5eead4;box-shadow:0 0 12px rgba(94,234,212,.85);flex:0 0 auto}
  .support-button{min-height:42px;border-radius:999px;padding:10px 18px;white-space:nowrap}
  .support-footer-link{padding:5px 10px;border-radius:999px;color:#f8e7b6!important}
  .kofi-floating{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));
    z-index:5;border-radius:999px;padding:10px 15px;font-size:.86rem;backdrop-filter:blur(10px)}
  .kofi-mobile-label{display:none}
  .site-footer{text-align:center;color:#9fb2c2;font-size:.82rem;margin-top:10px}
  .site-footer nav{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:8px}
  .site-footer a{color:#d8c48b;text-decoration:none;font-weight:900}
  .site-footer a:hover{text-decoration:underline}
  @media(max-width:760px){
    body{padding:14px 10px;background-attachment:scroll}
    .hero-card,.content-card{border-radius:13px}
    .brand-row{justify-content:flex-start}
    .brand-crest{width:62px;height:62px}
    .hero-copy{text-align:left;margin:16px 0 18px}
    .hero-copy::before,.hero-copy::after{display:none}
    .cta-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .cta-card{min-height:74px;padding:10px 8px;border-radius:9px}
    .cta-card small{font-size:clamp(.62rem,2.65vw,.74rem);line-height:1.18}
    .cta-card span{font-size:clamp(.92rem,4.2vw,1.08rem)}
    .howto-desktop{display:none}
    .howto-mobile{display:grid;grid-template-columns:1fr}
    .howto-card{min-height:auto}
    h2{text-align:left}
    .support-section{grid-template-columns:1fr;padding:16px}
    .support-button{justify-self:start}
    .kofi-floating{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));padding:9px 12px;font-size:.78rem}
    .kofi-desktop-label{display:none}
    .kofi-mobile-label{display:inline}
    .site-footer nav{gap:8px 12px}
  }
`;
