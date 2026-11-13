#!/usr/bin/env node
// Screenshot any route of the built app — look at your work before you call it done.
//   node tools/screenshot.mjs "#/play/my-game?e2e=1&seed=3" out.png [--desktop] [--dark] [--full] [--click=testid,testid] [--wait=ms]
// Uses dist/ (npm run build) — or pass --game=<id> to build just that game into a private
// folder first (safe while other people's games are mid-edit). Output defaults to .shots/<slug>.png
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const [hash = '#/', outArg] = args.filter((a) => !a.startsWith('--'));
const out = outArg ?? join(root, '.shots', `${hash.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}.png`);
const flag = (name) => (flags.find((f) => f.startsWith(`--${name}=`)) ?? '').split('=')[1];
const desktop = flags.includes('--desktop');

const game = flag('game');
const dist = game ? join('.e2e', `shot-${game}-${process.pid}`) : 'dist';
if (game) {
  const r = spawnSync(process.execPath, ['tools/build.mjs', `--outdir=${dist}`, `--only=${game}`, '--no-sw'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0) process.exit(1);
}
const { server, url } = await startServer(join(root, dist), 0);
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: desktop ? { width: 1280, height: 800 } : { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: flags.includes('--dark') ? 'dark' : 'light' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${url}/${hash}`);
await page.waitForSelector('[data-testid="app"]');
await page.evaluate(() => document.fonts.ready.then(() => true));
for (const id of (flag('click') ?? '').split(',').filter(Boolean)) {
  await page.locator(`[data-testid="${id}"]`).first().click();
  await page.waitForTimeout(250);
}
await page.waitForTimeout(Number(flag('wait') ?? 400));
mkdirSync(dirname(out), { recursive: true });
await page.screenshot({ path: out, fullPage: flags.includes('--full') });
console.log(`saved ${out}${errors.length ? `\nBROWSER ERRORS:\n${errors.join('\n')}` : ''}`);
await browser.close();
server.close();
if (game) rmSync(join(root, dist), { recursive: true, force: true });
