#!/usr/bin/env node
// The single gate every contribution must pass:  npm run check [-- --e2e] [-- --game=<id>]
//   1. registry generation   2. typecheck   3. content validation   4. unit + contract tests   5. build   6. (--e2e) browser tests
// With --game=<id> every step is scoped to that game and isolated from other contributors' work in progress.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const game = (args.find((a) => a.startsWith('--game=')) ?? '').split('=')[1] ?? '';

const steps = [
  ['registry', [process.execPath, 'tools/gen-registry.mjs']],
  ['typecheck', [process.execPath, 'tools/typecheck.mjs', ...(game ? [`--game=${game}`] : [])]],
  ...(!game && existsSync(join(root, 'tools/validate-content.ts')) ? [['content', [process.execPath, '--import', 'tsx', 'tools/validate-content.ts']]] : []),
  ['unit', [process.execPath, 'tools/test.mjs', 'unit', ...(game ? [`games/${game}/`] : [])]],
  ['contract', [process.execPath, 'tools/test.mjs', 'contract', ...(game ? [game] : [])]],
  ...(game ? [] : [['build', [process.execPath, 'tools/build.mjs']]]),
  ...(args.includes('--e2e') ? [['e2e', [process.execPath, 'tools/test.mjs', 'e2e', ...(game ? [game] : [])], { SAMSKURU_SKIP_BUILD: '1' }]] : []),
];

const results = [];
for (const [name, [cmd, ...rest], env] of steps) {
  const t0 = Date.now();
  console.log(`\n━━ ${name} ━━`);
  const r = spawnSync(cmd, rest, { cwd: root, stdio: 'inherit', env: { ...process.env, ...(env ?? {}) } });
  results.push({ name, ok: r.status === 0, ms: Date.now() - t0 });
  if (r.status !== 0) break;
}
console.log('\n━━ summary ━━');
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(10)} ${(r.ms / 1000).toFixed(1)}s`);
const failed = results.some((r) => !r.ok);
console.log(failed ? '\nCHECK FAILED' : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
