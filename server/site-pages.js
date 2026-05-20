const SITE_ORIGIN = 'https://ghostfleet.in';
const ADSENSE_CLIENT_ID = 'ca-pub-8532666088459423';
const SOCIAL_IMAGE = `${SITE_ORIGIN}/assets/ghostfleet-ocean-cliff.jpg`;

export const HOME_GAME_META = {
  title: 'GhostFleet — Free Online Naval Strategy Game',
  description: 'GhostFleet is a free browser-based naval strategy game. Play against AI or challenge a friend online with private room codes. No download required.',
  canonicalUrl: `${SITE_ORIGIN}/`,
  ogTitle: 'GhostFleet — Free Online Naval Strategy Game',
  ogDescription: 'Play GhostFleet, a free online naval strategy game with AI battles, multiplayer room codes, and battle stats.',
  ogUrl: `${SITE_ORIGIN}/`,
  imageUrl: SOCIAL_IMAGE,
  twitterCard: 'summary_large_image'
};

export function roomGameMeta(roomId) {
  const safeRoomId = String(roomId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return {
    title: 'GhostFleet Room — Join a Naval Battle',
    description: 'Join a GhostFleet multiplayer naval battle using a private room code.',
    canonicalUrl: `${SITE_ORIGIN}/room/${safeRoomId}`,
    ogTitle: 'GhostFleet Room — Join a Naval Battle',
    ogDescription: 'Join a GhostFleet multiplayer naval battle using a private room code.',
    ogUrl: `${SITE_ORIGIN}/room/${safeRoomId}`,
    imageUrl: SOCIAL_IMAGE,
    twitterCard: 'summary_large_image',
    robots: 'noindex,follow'
  };
}

export function adsenseScript(enabled = true) {
  if (!enabled) return '';
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}" crossorigin="anonymous"></script>`;
}

export function renderGameMeta(meta = HOME_GAME_META) {
  return renderMetaTags(meta, false);
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
    imageUrl: SOCIAL_IMAGE,
    twitterCard: 'summary_large_image'
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"/>
<meta name="theme-color" content="#06121a"/>
${renderMetaTags(meta, true)}
${adsenseScript(true)}
<style>${SITE_PAGE_CSS}</style>
</head>
<body>
  <main class="site-page">
    <a class="back-link" href="/">← Play GhostFleet</a>
    <section class="content-card">
      ${page.content}
    </section>
  </main>
  ${SITE_FOOTER}
</body>
</html>`;
}

function renderMetaTags(meta, includeAdsenseMeta) {
  const image = meta.imageUrl || '';
  return `${includeAdsenseMeta ? `<meta name="google-adsense-account" content="${ADSENSE_CLIENT_ID}"/>` : ''}
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}"/>
<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}"/>
${meta.robots ? `<meta name="robots" content="${escapeHtml(meta.robots)}"/>` : ''}
<meta property="og:title" content="${escapeHtml(meta.ogTitle || meta.title)}"/>
<meta property="og:description" content="${escapeHtml(meta.ogDescription || meta.description)}"/>
<meta property="og:url" content="${escapeHtml(meta.ogUrl || meta.canonicalUrl)}"/>
<meta property="og:type" content="website"/>
${image ? `<meta property="og:image" content="${escapeHtml(image)}"/>` : '<!-- TODO: Add an Open Graph image when a dedicated social preview asset is available. -->'}
<meta name="twitter:card" content="${escapeHtml(meta.twitterCard || (image ? 'summary_large_image' : 'summary'))}"/>
<meta name="twitter:title" content="${escapeHtml(meta.ogTitle || meta.title)}"/>
<meta name="twitter:description" content="${escapeHtml(meta.ogDescription || meta.description)}"/>
${image ? `<meta name="twitter:image" content="${escapeHtml(image)}"/>` : '<!-- TODO: Add a Twitter image when a dedicated social preview asset is available. -->'}`;
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
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms</a>
    <a href="/contact">Contact</a>
  </nav>
  <p>© 2026 GhostFleet. Free online naval strategy game.</p>
</footer>`;

const SITE_PAGE_CSS = `
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;min-height:100vh;font-family:'Segoe UI',Arial,sans-serif;color:#e5edf5;background:#06121a;
    background-image:linear-gradient(180deg,rgba(2,8,13,.28),rgba(2,8,13,.86)),url('/assets/ghostfleet-ocean-cliff.jpg');
    background-size:cover;background-position:center;background-attachment:fixed;display:flex;flex-direction:column;align-items:center;padding:24px 12px}
  .site-page{width:min(900px,100%);position:relative;z-index:1;flex:1}
  .back-link{display:inline-flex;margin:0 0 14px;color:#a7f3f0;text-decoration:none;font-weight:800;letter-spacing:.4px}
  .content-card{background:rgba(6,18,26,.9);border:1px solid rgba(226,185,111,.52);border-radius:14px;padding:clamp(20px,4vw,42px);
    box-shadow:0 24px 60px rgba(0,0,0,.42),inset 0 0 0 1px rgba(255,255,255,.04)}
  h1{margin:0 0 16px;color:#e2b96f;font-size:clamp(2rem,5vw,3rem);letter-spacing:1px}
  h2{margin:26px 0 10px;color:#7dd3fc;font-size:1.12rem;text-transform:uppercase;letter-spacing:1px}
  p,li{line-height:1.65;color:#d9e6ef;font-size:1rem}
  a{color:#5eead4}
  ul{padding-left:20px}
  .site-footer{width:min(900px,100%);position:relative;z-index:1;margin-top:18px;text-align:center;color:#9fb2c2;font-size:.82rem}
  .site-footer nav{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:8px}
  .site-footer a{color:#d8c48b;text-decoration:none;font-weight:800}
  .site-footer a:hover{text-decoration:underline}
  @media(max-width:560px){body{padding:14px 10px}.content-card{border-radius:12px}.site-footer nav{gap:8px 12px}}
`;

const SITE_PAGES = {
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy — GhostFleet',
    description: 'Read the GhostFleet privacy policy, including information about browser storage, advertising, third-party services, and contact details.',
    content: `<h1>Privacy Policy</h1>
      <p>GhostFleet is a free browser-based naval strategy game available at <a href="https://ghostfleet.in">https://ghostfleet.in</a>.</p>
      <h2>Information We Collect</h2>
      <p>GhostFleet may store basic gameplay preferences and session information in your browser using local storage, session storage, or cookies. This may include settings, game state, room session information, or other information needed to run the game.</p>
      <h2>Cookies and Local Storage</h2>
      <p>The game may use local storage, session storage, or cookies to improve gameplay, remember preferences, support multiplayer room functionality, and support site functionality.</p>
      <h2>Advertising</h2>
      <p>GhostFleet may display ads through Google AdSense or similar advertising services. Third-party vendors, including Google, may use cookies to serve ads based on a user’s prior visits to this website or other websites. Users can manage personalized advertising through Google’s ad settings.</p>
      <h2>Third-Party Services</h2>
      <p>GhostFleet may use third-party services for hosting, analytics, advertising, or gameplay infrastructure. These services may process limited technical information such as browser type, device information, IP address, and usage data.</p>
      <h2>Children’s Privacy</h2>
      <p>GhostFleet is intended as a general-audience strategy game. We do not knowingly collect personal information from children.</p>
      <h2>Contact</h2>
      <p>For privacy questions, contact: <a href="mailto:ghostfleet2026@gmail.com">ghostfleet2026@gmail.com</a>.</p>`
  },
  contact: {
    path: '/contact',
    title: 'Contact GhostFleet',
    description: 'Contact GhostFleet for support, feedback, bug reports, privacy questions, or business inquiries.',
    content: `<h1>Contact GhostFleet</h1>
      <p>For support, feedback, bug reports, privacy questions, or business inquiries, contact:</p>
      <p><strong>Email:</strong> <a href="mailto:ghostfleet2026@gmail.com">ghostfleet2026@gmail.com</a></p>
      <p><strong>Website:</strong> <a href="https://ghostfleet.in">https://ghostfleet.in</a></p>`
  },
  about: {
    path: '/about',
    title: 'About GhostFleet',
    description: 'Learn about GhostFleet, a free online naval strategy game with AI battles, multiplayer room codes, battle stats, and move analysis.',
    content: `<h1>About GhostFleet</h1>
      <p>GhostFleet is a free online naval strategy game built for quick tactical battles in the browser. The game is inspired by classic fleet combat: place your ships, read the grid, fire into enemy waters, and use every hit or miss to narrow the search. It is designed to be easy to start, but still rewarding for players who like pattern reading, probability, and careful endgame decisions.</p>
      <p>You can play GhostFleet directly at <a href="https://ghostfleet.in">https://ghostfleet.in</a> with no download and no account required. Solo players can practice against AI difficulty modes, while online players can create multiplayer rooms and share private room codes with friends. The room-code flow keeps matches simple: one player creates a room, shares the link or code, and both players place fleets before taking turns.</p>
      <p>After each match, GhostFleet shows battle stats and move analysis so players can review accuracy, pressure, ship sinks, and decisions that could have improved the hunt. GhostFleet is built as an independent web game, focused on mobile-friendly play, fast browser access, and replayable naval strategy sessions.</p>
      <h2>How to Play GhostFleet</h2>
      <p>Each player hides a fleet on their own grid. Your Fleet shows your ship positions and incoming damage, while Enemy Waters is where you fire. On desktop, both boards stay visible; on mobile, use the Enemy Waters and Your Fleet tabs to switch views.</p>
      <p>Place ships by selecting a vessel and choosing valid cells on your grid. Rotate ships to change direction, drag placed ships to adjust your layout, or select a ship and use Clear-Ship(C) to remove only that ship. Auto-Place can randomly fill your whole fleet before you confirm.</p>
      <p>When the battle starts, fire at unrevealed cells on Enemy Waters. Red means hit and white means miss. A ship sinks when every cell it occupies has been hit. In multiplayer, both captains must confirm their fleets before turns begin, and each player fires once per turn.</p>
      <p>After the match, View Analysis shows accuracy, pressure, ships sunk, and tips to improve your next battle.</p>`
  },
  terms: {
    path: '/terms',
    title: 'Terms of Use — GhostFleet',
    description: 'Read the GhostFleet terms of use for site access, gameplay availability, advertising, fair use, changes, and contact details.',
    content: `<h1>Terms of Use</h1>
      <h2>Use of the Site</h2>
      <p>GhostFleet is provided as a free browser-based game. By using the site, you agree to use it responsibly and only for lawful gameplay and personal entertainment.</p>
      <h2>Gameplay and Availability</h2>
      <p>The game may change, be updated, or become temporarily unavailable at any time. Multiplayer rooms, game sessions, and saved browser state may expire or reset.</p>
      <h2>Advertising</h2>
      <p>GhostFleet may display advertising after approval from ad networks. Ads should not be abused, manipulated, or interacted with in a way that violates advertiser or network policies.</p>
      <h2>Fair Use</h2>
      <p>Users should not abuse multiplayer features, interfere with the site, attempt to cheat, disrupt other players, overload the service, or attempt unauthorized access to game systems.</p>
      <h2>Changes to the Game</h2>
      <p>GhostFleet may be improved, balanced, redesigned, or expanded over time. Features may be added, removed, or changed without prior notice.</p>
      <h2>Contact</h2>
      <p>For questions, contact <a href="mailto:ghostfleet2026@gmail.com">ghostfleet2026@gmail.com</a>.</p>`
  }
};
