#!/usr/bin/env node
// Type-check the repo, or only one game:  node tools/typecheck.mjs [--game=<id>]
// With --game, errors outside that game's folder are ignored, so a neighbour's
// work-in-progress never blocks you (the full check still runs in CI / before merge).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { generate } from './gen-registry.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const game = (process.argv.slice(2).find((a) => a.startsWith('--game=')) ?? '').split('=')[1] ?? '';
generate({ quiet: true });
const r = spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.json', '--pretty', 'false'], { cwd: root, encoding: 'utf8' });
const lines = `${r.stdout}${r.stderr}`.split('\n').filter(Boolean);
const mine = game ? lines.filter((l) => l.startsWith(`src/games/${game}/`) || l.startsWith(`labs/${game}/`)) : lines;
if (mine.length) console.log(mine.join('\n'));
const others = lines.length - mine.length;
if (game && others > 0) console.log(`(${others} type error line(s) elsewhere in the repo were ignored for --game=${game})`);
process.exit(mine.length ? 1 : 0);
