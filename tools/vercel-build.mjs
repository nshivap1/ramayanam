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
