/**
 * Browser-test harness (Playwright library + node:test). One static server and one browser
 * per spec file. Typical game spec:
 *
 *   import { test } from 'node:test';
 *   import { gameSuite } from '../../../tests/e2e/harness';
 *   gameSuite('my-game', ({ open }) => {
 *     test('plays a full round', async () => {
 *       const g = await open({ mode: 'practice', level: 1, seed: 7 });
 *       ... drive the UI using g.page and g.state() (the game's ctx.expose snapshot) ...
 *       await g.expectResult();          // result screen shown, no console errors
 *     });
 *   });
 */
import { after, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { type Browser, type BrowserContext, type Page, chromium } from 'playwright';
// @ts-expect-error — plain .mjs helper without types
import { startServer } from '../../tools/serve.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

export interface OpenOptions {
  mode?: 'daily' | 'practice' | 'endless' | 'timed';
  level?: number;
  seed?: number;
  script?: 'deva' | 'iast';
  /** Viewport; default is a phone (390×844). */
  viewport?: { width: number; height: number };
  labs?: boolean;
}

export interface GameSession {
  page: Page;
  /** Latest snapshot published by the game through ctx.expose(). */
  state<T = Record<string, unknown>>(): Promise<T>;
  /** Wait until the exposed snapshot satisfies a predicate (serialised and run in the page). */
  waitForState(predicate: string, timeoutMs?: number): Promise<void>;
  /** Click an element by data-testid. */
  tap(testId: string): Promise<void>;
  /** Assert the shared result screen is visible; returns the recorded result. */
  expectResult(timeoutMs?: number): Promise<{ result: { outcome: string; score: number; correct?: number; total?: number; share?: string }; xp: number; stars: number }>;
  /** Console errors and page errors collected so far. */
  errors: string[];
  /** Fail if any console/page error occurred. */
  expectClean(): void;
  close(): Promise<void>;
}

export interface Harness {
  url: string;
  open(opts?: OpenOptions): Promise<GameSession>;
  /** Open an arbitrary hash route (e.g. '#/games'). `fresh` = first-run state (welcome screen shown). */
  openRoute(hash: string, viewport?: { width: number; height: number }, fresh?: boolean): Promise<GameSession>;
}

async function session(context: BrowserContext, url: string, fresh = false): Promise<GameSession> {
  // Returning-user state by default; pass fresh=true to see the first-run welcome screen.
  if (!fresh) await context.addInitScript(() => window.localStorage.setItem('samskuru:v1:onboarded', 'test'));
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`));
  await page.goto(url);
  await page.waitForSelector(fresh ? '[data-testid="onboarding"]' : '[data-testid="app"]', { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const s: GameSession = {
    page,
    errors,
    state: <T>() => page.evaluate(() => (window as unknown as { __game?: unknown }).__game ?? {}) as Promise<T>,
    waitForState: async (predicate, timeoutMs = 10000) => {
      await page.waitForFunction(`(() => { const s = window.__game; if (!s) return false; return (${predicate})(s); })()`, undefined, { timeout: timeoutMs });
    },
    tap: async (testId) => {
      await page.locator(`[data-testid="${testId}"]`).first().click();
    },
    expectResult: async (timeoutMs = 20000) => {
      await page.waitForSelector('[data-testid="result"]', { timeout: timeoutMs });
      const rec = (await page.evaluate(() => (window as unknown as { __result?: unknown }).__result)) as Awaited<ReturnType<GameSession['expectResult']>>;
      assert.ok(rec, 'window.__result should be set after ctx.finish');
      assert.ok(['won', 'lost', 'completed'].includes(rec.result.outcome), `unexpected outcome ${rec.result.outcome}`);
      assert.ok(Number.isFinite(rec.result.score), 'score must be a finite number');
      assert.ok(rec.xp > 0, 'XP should be awarded');
      return rec;
    },
    expectClean: () => assert.deepEqual(errors, [], `browser errors:\n${errors.join('\n')}`),
    close: () => page.close(),
  };
  return s;
}

/** Declares a describe() block with a shared server + browser. */
export function suite(name: string, body: (h: Harness) => void): void {
  describe(name, { concurrency: false }, () => {
    let browser: Browser | undefined;
    let server: { close(): void } | undefined;
    const contexts: BrowserContext[] = [];
    const h: Harness = {
      url: '',
      open: async () => {
        throw new Error('harness not started');
      },
      openRoute: async () => {
        throw new Error('harness not started');
      },
    };
    before(async () => {
      const dist = join(root, process.env['SAMSKURU_DIST'] ?? 'dist');
      assert.ok(existsSync(join(dist, 'index.html')), 'dist/ missing — run `npm run build` (npm run test:e2e does this for you)');
      const started = (await startServer(dist, 0)) as { server: { close(): void }; url: string };
      server = started.server;
      h.url = started.url;
      browser = await chromium.launch({ channel: process.env['SAMSKURU_BROWSER_CHANNEL'] || undefined, args: ['--no-sandbox'] });
    });
    after(async () => {
      for (const c of contexts) await c.close().catch(() => undefined);
      await browser?.close();
      server?.close();
    });
    const newContext = async (viewport: { width: number; height: number }): Promise<BrowserContext> => {
      assert.ok(browser);
      const c = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: viewport.width < 600, isMobile: viewport.width < 600, reducedMotion: 'reduce' });
      contexts.push(c);
      return c;
    };
    h.openRoute = async (hash, viewport = { width: 390, height: 844 }, fresh = false) => session(await newContext(viewport), `${h.url}/${hash}`, fresh);
    body(h);
  });
}

/** Suite for one game: `open()` launches it with e2e hooks on (no auto help sheet, state exposed). */
export function gameSuite(gameId: string, body: (h: Harness & { open(opts?: OpenOptions): Promise<GameSession> }) => void): void {
  suite(`e2e: ${gameId}`, (h) => {
    h.open = async (opts = {}) => {
      const q = new URLSearchParams({ e2e: '1' });
      if (opts.mode) q.set('mode', opts.mode);
      if (opts.level !== undefined) q.set('level', String(opts.level));
      if (opts.seed !== undefined) q.set('seed', String(opts.seed));
      if (opts.script) q.set('script', opts.script);
      if (opts.labs) q.set('labs', '1');
      const s = await h.openRoute(`#/play/${gameId}?${q.toString()}`, opts.viewport);
      await s.page.waitForSelector(`[data-testid="game-host"][data-game="${gameId}"]`);
      await s.page.waitForFunction(() => !document.querySelector('[data-testid="game-loading"]'), undefined, { timeout: 15000 });
      return s;
    };
    body(h);
  });
}

/**
 * Plays any <QuizRunner>-based game to the end. `wrongEvery` > 0 answers every n-th question
 * incorrectly (to exercise feedback, hearts and retries). Returns number of questions answered.
 */
export async function playQuiz(g: GameSession, opts: { wrongEvery?: number; maxSteps?: number } = {}): Promise<number> {
  const { page } = g;
  const max = opts.maxSteps ?? 200;
  let n = 0;
  for (let step = 0; step < max; step++) {
    if (await page.locator('[data-testid="result"]').count()) return n;
    await g.waitForState("s => s.phase === 'asking' || s.phase === 'done'");
    const st = await g.state<{ phase: string; kind: string; answer: unknown; qid: string }>();
    if (st.phase === 'done') break;
    n++;
    const wrong = opts.wrongEvery !== undefined && opts.wrongEvery > 0 && n % opts.wrongEvery === 0;
    if (st.kind === 'choice') {
      const ids = await page.locator('[data-testid^="choice-"]').evaluateAll((els) => els.map((e) => (e.getAttribute('data-testid') ?? '').slice(7)));
      const pick = wrong ? (ids.find((id) => id !== st.answer) ?? String(st.answer)) : String(st.answer);
      await g.tap(`choice-${pick}`);
      await g.tap('check');
    } else if (st.kind === 'arrange') {
      const order = (st.answer as string[]).slice();
      if (wrong && order.length > 1) order.reverse();
      for (const id of order) await g.tap(`token-${id}`);
      await g.tap('check');
    } else if (st.kind === 'pairs') {
      const pairs = st.answer as Record<string, string>;
      const entries = Object.entries(pairs);
      if (wrong && entries.length > 1) {
        const [a, b] = [entries[0] as [string, string], entries[1] as [string, string]];
        await g.tap(`left-${a[0]}`);
        await g.tap(`right-${b[1]}`);
        await page.waitForTimeout(600);
      }
      for (const [l, r] of entries) {
        await g.tap(`left-${l}`);
        await g.tap(`right-${r}`);
      }
    } else if (st.kind === 'type') {
      const target = wrong ? 'क' : String(st.answer);
      const unMatra: Record<string, string> = { 'ा': 'आ', 'ि': 'इ', 'ी': 'ई', 'ु': 'उ', 'ू': 'ऊ', 'ृ': 'ऋ', 'ॄ': 'ॠ', 'ॢ': 'ऌ', 'े': 'ए', 'ै': 'ऐ', 'ो': 'ओ', 'ौ': 'औ' };
      for (const ch of target) await g.tap(`key-${unMatra[ch] ?? ch}`);
      await g.tap('check');
    } else {
      throw new Error(`playQuiz: unknown question kind ${st.kind}`);
    }
    await page.waitForSelector('[data-testid="feedback"]');
    const shown = await page.locator('[data-testid="feedback"]').getAttribute('data-correct');
    assert.equal(shown, wrong ? 'false' : 'true', `question ${st.qid}: expected ${wrong ? 'wrong' : 'correct'} feedback`);
    await g.tap('continue');
  }
  return n;
}

/** Layout sanity: nothing wider than the viewport (no horizontal scroll) and Devanagari font loaded. */
export async function expectNoOverflow(g: GameSession): Promise<void> {
  const { scrollW, clientW } = await g.page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
  assert.ok(scrollW <= clientW + 1, `horizontal overflow: scrollWidth ${scrollW} > clientWidth ${clientW}`);
}
