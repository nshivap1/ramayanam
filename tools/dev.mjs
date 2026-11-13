#!/usr/bin/env node
// Dev server with rebuild-on-change:  node tools/dev.mjs [port=5173]
// Rebuilds the bundle whenever a file under src/ or labs/ changes; refresh the browser to see it.
import { context } from 'esbuild';
import { existsSync, mkdirSync, cpSync, readdirSync, watch, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esbuildOptions, indexHtml } from './build.mjs';
import { generate } from './gen-registry.mjs';
import { startServer } from './serve.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const outdir = join(root, '.dev');
const port = Number(process.argv[2] ?? 5173);

generate();
mkdirSync(join(outdir, 'assets'), { recursive: true });
for (const n of readdirSync(join(root, 'public'))) if (n !== 'index.html' && n !== 'sw.js') cpSync(join(root, 'public', n), join(outdir, n), { recursive: true });
writeFileSync(join(outdir, 'index.html'), indexHtml('assets/app.js', 'assets/app.css'));

const ctx = await context({ ...esbuildOptions(true), outdir: join(outdir, 'assets'), logLevel: 'info' });
await ctx.watch();

// New/removed game folders change the generated registry.
let timer = null;
for (const dir of ['src/games', 'labs']) {
  if (!existsSync(join(root, dir))) continue;
  watch(join(root, dir), { recursive: true }, (_e, file) => {
    if (!file || !/(manifest\.ts|Game\.tsx|style\.css)$/.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(() => generate({ quiet: true }), 150);
  });
}

const { url } = await startServer(outdir, port);
console.log(`\n  Samskuru dev → ${url}\n  (rebuilds on save; refresh the page)\n`);
