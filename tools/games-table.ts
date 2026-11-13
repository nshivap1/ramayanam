/**
 * Regenerates the games table in README.md from the game manifests:
 *   node --import tsx tools/games-table.ts
 * The table lives between <!-- GAMES-TABLE --> and <!-- /GAMES-TABLE -->.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { GameManifest } from '../src/sdk/types';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'src/games');
const rows: string[] = [];
for (const id of readdirSync(dir).sort()) {
  const p = join(dir, id, 'manifest.ts');
  if (id.startsWith('_') || !statSync(join(dir, id)).isDirectory() || !existsSync(p)) continue;
  const { manifest: m } = (await import(pathToFileURL(p).href)) as { manifest: GameManifest };
  rows.push(`| [\`${m.id}\`](src/games/${m.id}/PRD.md) | ${m.title.sa} · ${m.title.en} | ${m.kind} | ${m.skills.join(', ')} | L${m.levels.join(' L')} | ${m.modes.join(', ')} | ${m.status} |`);
}
const table = ['| Id | Game | Kind | Skills | Levels | Modes | Status |', '|---|---|---|---|---|---|---|', ...rows].join('\n');
const readme = join(root, 'README.md');
let text = readFileSync(readme, 'utf8');
const block = `<!-- GAMES-TABLE -->\n${rows.length} games\n\n${table}\n<!-- /GAMES-TABLE -->`;
text = /<!-- GAMES-TABLE -->[\s\S]*?<!-- \/GAMES-TABLE -->/.test(text) ? text.replace(/<!-- GAMES-TABLE -->[\s\S]*?<!-- \/GAMES-TABLE -->/, block) : text.replace('<!-- GAMES-TABLE -->', block);
writeFileSync(readme, text);
console.log(`README games table: ${rows.length} games`);
