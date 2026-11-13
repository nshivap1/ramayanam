#!/usr/bin/env node
// Test runner. Usage:
//   node tools/test.mjs                 → unit + contract (fast, no browser)
//   node tools/test.mjs unit [filter]   → unit tests (src/**/*.test.ts); filter is a path substring
//   node tools/test.mjs contract        → repo-wide contract tests (tests/contract/*.test.ts)
//   node tools/test.mjs e2e [gameId]    → builds, serves dist, runs browser specs (src/**/e2e.spec.ts, tests/e2e/*.spec.ts)
//   node tools/test.mjs all             → everything
import { spawn } from 'node:child_process';
import { readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const [suite = 'fast', filter = ''] = process.argv.slice(2);

function walk(dir, pred, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, pred, out);
    else if (pred(name, p)) out.push(p);
  }
  return out;
}

function run(cmd, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function nodeTest(files, extraEnv = {}, concurrency = true) {
  if (files.length === 0) {
    console.log('(no test files matched)');
    return 0;
  }
  const args = ['--import', 'tsx', '--test', `--test-reporter=${process.env.SAMSKURU_REPORTER ?? 'spec'}`, ...(concurrency ? [] : ['--test-concurrency=1']), ...files.map((f) => relative(root, f))];
  return run(process.execPath, args, extraEnv);
}

const match = (p) => !filter || relative(root, p).split(sep).join('/').includes(filter);
const unitFiles = () => [...walk(join(root, 'src'), (n) => n.endsWith('.test.ts') || n.endsWith('.test.tsx')), ...walk(join(root, 'labs'), (n) => n.endsWith('.test.ts'))].filter(match);
const contractFiles = () => walk(join(root, 'tests', 'contract'), (n) => n.endsWith('.test.ts')).filter(match);
const e2eFiles = () =>
  [...walk(join(root, 'src'), (n) => n === 'e2e.spec.ts'), ...walk(join(root, 'labs'), (n) => n === 'e2e.spec.ts'), ...walk(join(root, 'tests', 'e2e'), (n) => n.endsWith('.spec.ts'))].filter(
    (p) => {
      if (!filter) return true;
      const rel = relative(root, p).split(sep).join('/'); // never match on the checkout's own path
      return rel.startsWith(`src/games/${filter}/`) || rel.startsWith(`labs/${filter}/`) || rel.includes(filter);
    },
  );

let code = 0;
if (suite === 'unit' || suite === 'fast' || suite === 'all') code ||= await nodeTest(unitFiles());
if (suite === 'contract' || suite === 'fast' || suite === 'all') code ||= await nodeTest(suite === 'contract' ? walk(join(root, 'tests', 'contract'), (n) => n.endsWith('.test.ts')) : contractFiles(), suite === 'contract' && filter ? { SAMSKURU_GAME: filter } : {});
if (suite === 'e2e' || suite === 'all') {
  // With a game filter the build contains only that game and goes to its own folder, so
  // parallel contributors (and half-finished neighbours) cannot break each other's runs.
  const isGame = filter && (existsSync(join(root, 'src/games', filter)) || existsSync(join(root, 'labs', filter)));
  const dist = isGame ? join('.e2e', `${filter}-${process.pid}`) : 'dist';
  if (!process.env.SAMSKURU_SKIP_BUILD || isGame) code ||= await run(process.execPath, ['tools/build.mjs', `--outdir=${dist}`, ...(isGame ? [`--only=${filter}`, '--no-sw'] : [])]);
  // e2e specs share one static server + browser per file; run files serially to keep memory low.
  code ||= await nodeTest(e2eFiles(), { SAMSKURU_E2E: '1', SAMSKURU_DIST: dist }, false);
  if (isGame) rmSync(join(root, dist), { recursive: true, force: true });
}
process.exit(code);
