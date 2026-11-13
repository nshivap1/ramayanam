#!/usr/bin/env node
// Production build → dist/ (static, relative URLs, hash routing: host anywhere, wrap with Capacitor later).
//   node tools/build.mjs [--no-sw] [--outdir=dist]
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, registrySources } from './gen-registry.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const outdir = join(root, (args.find((a) => a.startsWith('--outdir=')) ?? '--outdir=dist').split('=')[1]);
const withSw = !args.includes('--no-sw');
const onlyArg = (args.find((a) => a.startsWith('--only=')) ?? '').split('=')[1];
const only = onlyArg ? onlyArg.split(',').filter(Boolean) : undefined;

/** Feeds the bundler the registry + stylesheet straight from the game folders (optionally restricted), so builds never depend on generated files on disk. */
export const registryPlugin = (onlyIds) => ({
  name: 'samskuru-registry',
  setup(b) {
    const src = () => registrySources({ only: onlyIds });
    b.onLoad({ filter: /src[\\/]app[\\/]registry\.gen\.ts$/ }, () => ({ contents: src().ts, loader: 'ts', resolveDir: join(root, 'src/app') }));
    b.onLoad({ filter: /src[\\/]app[\\/]styles\.gen\.css$/ }, () => ({ contents: src().css, loader: 'css', resolveDir: join(root, 'src/app') }));
  },
});

export const esbuildOptions = (dev = false, onlyIds = undefined) => ({
  plugins: [registryPlugin(onlyIds)],
  absWorkingDir: root,
  entryPoints: { app: 'src/app/main.tsx' },
  bundle: true,
  splitting: true,
  format: 'esm',
  target: ['es2020'],
  jsx: 'automatic',
  sourcemap: dev ? 'inline' : false,
  minify: !dev,
  entryNames: dev ? '[name]' : '[name]-[hash]',
  // Always hashed: every game's lazy chunk is called "Game", so un-hashed names collide as soon as there are two games.
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'assets/[name]-[hash]',
  external: ['../fonts/*'],
  define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"', __SW__: dev || !withSw ? 'false' : 'true' },
  logLevel: 'warning',
  metafile: true,
  tsconfig: 'tsconfig.json',
});

export function indexHtml(js, css) {
  const tpl = readFileSync(join(root, 'public/index.html'), 'utf8');
  return tpl.replace('<!--CSS-->', `<link rel="stylesheet" href="./${css}">`).replace('<!--JS-->', `<script type="module" src="./${js}"></script>`);
}

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

async function main() {
  const t0 = Date.now();
  generate({ quiet: true });
  const reg = registrySources({ only });
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(join(outdir, 'assets'), { recursive: true });
  const result = await build({ ...esbuildOptions(false, only), outdir: join(outdir, 'assets') });
  const outputs = Object.keys(result.metafile.outputs).map((p) => relative(outdir, join(root, p)).replaceAll('\\', '/'));
  const js = outputs.find((p) => /^assets\/app-[^/]+\.js$/.test(p));
  const css = outputs.find((p) => /^assets\/app-[^/]+\.css$/.test(p));
  if (!js || !css) throw new Error('build: entry outputs not found');

  // static files
  for (const n of readdirSync(join(root, 'public'))) {
    if (n === 'index.html' || n === 'sw.js') continue;
    cpSync(join(root, 'public', n), join(outdir, n), { recursive: true });
  }
  writeFileSync(join(outdir, 'index.html'), indexHtml(js, css));

  if (withSw) {
    const files = walk(outdir)
      .map((p) => relative(outdir, p).replaceAll('\\', '/'))
      .filter((p) => p !== 'sw.js' && !p.endsWith('.txt') && !p.endsWith('.map'));
    const version = createHash('sha256').update(files.map((f) => f + statSync(join(outdir, f)).size).join('|')).update(readFileSync(join(outdir, js))).digest('hex').slice(0, 12);
    const sw = readFileSync(join(root, 'public/sw.js'), 'utf8').replace('__VERSION__', version).replace('"__PRECACHE__"', JSON.stringify(['./', ...files.map((f) => './' + f)]));
    writeFileSync(join(outdir, 'sw.js'), sw);
  }
  const bytes = (p) => statSync(join(outdir, p)).size;
  const jsTotal = outputs.filter((p) => p.endsWith('.js')).reduce((n, p) => n + bytes(p), 0);
  console.log(`built ${reg.games.length} games (+${reg.labs.length} labs) → ${relative(root, outdir)}/  entry ${(bytes(js) / 1024).toFixed(0)} kB, css ${(bytes(css) / 1024).toFixed(0)} kB, all js ${(jsTotal / 1024).toFixed(0)} kB, ${Date.now() - t0} ms`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
