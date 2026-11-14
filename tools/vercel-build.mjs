// Vercel build entry (vercel.json → buildCommand).
//   default:              the whole platform → dist/ (same as `npm run build`)
//   SAMSKURU_GAME=<id>:   one game only, opening straight into it (a standalone test deployment,
//                         e.g. the "ramayanam" Vercel project with SAMSKURU_GAME=ramayana-yatra).
// Set SAMSKURU_GAME in the Vercel project's environment variables; nothing else changes.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const game = (process.env.SAMSKURU_GAME ?? '').trim();
if (game && !/^[a-z0-9-]+$/.test(game)) throw new Error(`SAMSKURU_GAME must be a game id, got "${game}"`);
if (game && !existsSync(join(root, 'src', 'games', game))) throw new Error(`SAMSKURU_GAME: no game folder src/games/${game}`);

execFileSync(process.execPath, [join(root, 'tools', 'build.mjs'), ...(game ? [`--only=${game}`] : [])], { stdio: 'inherit', cwd: root });

if (game) {
  const file = join(root, 'dist', 'index.html');
  let html = readFileSync(file, 'utf8');
  // open the game itself instead of the hub when the address has no route yet
  const start = `<script>try{if(!location.hash||location.hash==="#"){history.replaceState(null,"","#/play/${game}");}}catch(e){}</script>`;
  if (!html.includes('<div id="root"></div>')) throw new Error('dist/index.html: no root element to anchor the start route');
  html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    ${start}`);
  // the page's name and description are the game's own (tab title, search result, link preview)
  const manifest = readFileSync(join(root, 'src', 'games', game, 'manifest.ts'), 'utf8');
  const field = (re) => manifest.match(re)?.[1]?.replace(/\\(['"])/g, '$1');
  const sa = field(/title:\s*\{\s*sa:\s*'([^']+)'/);
  const iast = field(/iast:\s*'([^']+)'/);
  const tagline = field(/tagline:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  if (sa && iast) {
    const title = `${sa} · ${iast} — Samskuru`;
    const desc = tagline ? `${tagline}. A Samskuru game for Sanskrit learners.` : `${iast}: a Samskuru game for Sanskrit learners.`;
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${esc(desc)}" />`)
      .replace(/<meta name="apple-mobile-web-app-title" content="[^"]*"\s*\/>/, `<meta name="apple-mobile-web-app-title" content="${esc(sa)}" />`)
      .replace('</title>', `</title>\n    <meta property="og:title" content="${esc(title)}" />\n    <meta property="og:description" content="${esc(desc)}" />\n    <meta property="og:type" content="website" />`);
  }
  writeFileSync(file, html);
  console.log(`standalone: dist/ opens #/play/${game}${sa ? ` · title "${sa} · ${iast}"` : ''}`);
}

// Vercel Web Analytics (cookieless page views), only in builds that run on Vercel (VERCEL=1), never locally or in tests.
// The project must have Web Analytics enabled (dashboard → Analytics → Enable). The script's path is the one the
// dashboard shows for the project: set it as SAMSKURU_ANALYTICS_SRC (e.g. "/abc123/script.js"); without it the
// standard "/_vercel/insights/script.js" is used. SAMSKURU_ANALYTICS=0 turns the snippet off.
if (process.env.VERCEL === '1' && process.env.SAMSKURU_ANALYTICS !== '0') {
  const src = (process.env.SAMSKURU_ANALYTICS_SRC ?? '').trim() || '/_vercel/insights/script.js';
  if (!/^\/[A-Za-z0-9._\-/]+\.js$/.test(src)) throw new Error(`SAMSKURU_ANALYTICS_SRC must be a same-origin path ending in .js, got "${src}"`);
  const file = join(root, 'dist', 'index.html');
  let html = readFileSync(file, 'utf8');
  const snippet =
    '<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>\n' +
    `    <script defer src="${src}"></script>`;
  if (!html.includes('</head>')) throw new Error('dist/index.html: no </head> for the analytics snippet');
  html = html.replace('</head>', `    ${snippet}\n  </head>`);
  writeFileSync(file, html);
  // the service worker must not cache the analytics script (it is Vercel's, not ours): requests under its folder go to
  // the network; its page-view beacons are POSTs, which the worker already leaves alone
  const swFile = join(root, 'dist', 'sw.js');
  if (existsSync(swFile)) {
    const dir = src.slice(0, src.lastIndexOf('/') + 1);
    const anchor = 'if (url.origin !== self.location.origin) return;';
    const sw = readFileSync(swFile, 'utf8');
    if (!sw.includes(anchor)) throw new Error('dist/sw.js: no origin check to anchor the analytics bypass');
    writeFileSync(swFile, sw.replace(anchor, `${anchor}\n  if (url.pathname.startsWith(${JSON.stringify(dir)})) return;`));
  }
  console.log(`analytics: Vercel Web Analytics script ${src}`);
}
