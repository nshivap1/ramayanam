/**
 * The e2e kit for Ramayana-yatra (v0.5b, WP0): everything the browser tests share — the exposed snapshot (`Snap`), the
 * `Bot` that plays through the real UI from it, saves planned from the content (`planAt`, `kathaFrom`, `shopPlan` …),
 * navigation (BFS on the snapshot grid, `followPointer`, `guidePlaythrough`), the संस्कृतम् sweeps (`latinOnScreen`,
 * `expectNoLatin`), reload / Continue helpers and the pointer checks. Moved out of e2e.spec.ts so the v0.5b packages
 * add browser tests in their own files (e2e-v05b-a … -d.spec.ts, run by e2e.spec.ts) without editing the spec.
 * Named *.spec.ts only so the layering contract lets it import node:, playwright and the harness like a spec; it is not
 * run on its own (tools/test.mjs runs only e2e.spec.ts files). Changes here are WP0's (notes/v05b-ownership.md).
 */
import assert from 'node:assert/strict';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from 'playwright';
import { type GameSession, type OpenOptions, expectNoOverflow } from '../../../tests/e2e/harness';
import { loadContent } from './content';
import { TILE_PROPS, isWalkable, loadGame, newGame, newMember, practiceContent, testFlag, tileAt, toSave, visibleNpcs, withUnlockedMoves } from './logic';
import type { GameContent, GameState } from './types';

/** The suite's `open` (harness): a new browser page with the game (e2e hooks on). */
export type Open = (opts?: OpenOptions) => Promise<GameSession>;

/**
 * One browser test of a v0.5b package (e2e-v05b-a … -d.spec.ts export a list of these; e2e.spec.ts registers each inside the
 * game suite, so it shares the suite's server and browser). `skip`: a reason, or false.
 */
export interface E2eCase {
  name: string;
  skip?: string | false;
  timeout?: number;
  run: (ctx: { open: Open }) => Promise<void>;
}

export interface Snap {
  seq: number;
  phase: 'title' | 'explore' | 'script' | 'battle' | 'ended';
  screen: 'title' | 'new' | 'game';
  /** the title screen offers Continue (a save exists) */
  canContinue?: boolean;
  pending: string | null;
  /** English text of the current say line (the dialogueSa key). */
  say: string | null;
  dialogueLang: 'en' | 'sa-en' | 'sa';
  map: string | null;
  x: number;
  y: number;
  facing: string;
  objective: string | null;
  chapter: number | null;
  challenge: {
    id: string;
    kind: string;
    /** the words the challenge asks about (v0.4.3: an artha target in संस्कृतम् is never a basic word) */
    lexIds?: string[];
    answers: string[];
    orders: number[][];
    optionIds: string[];
    tiles: number;
    context: string | null;
    step?: number | null;
    steps?: number | null;
    /** Kathā smarana (recitation): the gap (≤ 1), its three option ids and the accepted ids */
    smarana?: { gaps: number[]; options: string[]; answers: string[]; level: number; check: boolean; pada: number; shlokaId: string } | null;
  } | null;
  /** journey style of the save (null = the practice game) */
  style?: 'katha' | 'abhyasa' | null;
  /** v0.4.3: the reader level in the save (the story-text language; null = English) */
  reader?: 'sa' | 'sa-en' | null;
  autoRecite?: boolean;
  smrti?: Record<string, { level: number; streak: number }> | null;
  feedback: { correct: boolean } | null;
  /** a choice pending: how many options, and its prompt (English story text) */
  choice?: { options: number; prompt: string | null } | null;
  battle: { phase: string; allyHp: number; allyMax: number; foeHp: number; foe: string; kind: string; beats: number; canRun: boolean; moves?: string[] } | null;
  party: { id: string; hp: number; maxHp: number; level: number }[];
  items: number;
  restored: string[];
  heard: string[];
  flags: string[];
  chapterDone: number | null;
  /** v0.5a: the book-complete screen is on (the book, and the book "continue" opens: null = none) */
  bookEnd?: { kanda: number; next: number | null } | null;
  /** the start menu is open */
  menu?: boolean;
  npcs: { id: string; x: number; y: number }[];
  warps: { x: number; y: number; to: string; open?: boolean }[];
  grid: string[];
  shrines: { x: number; y: number }[];
  next: { chapter: number; map: string; action: { talk?: string; reach?: { x: number; y: number }; recite?: string }; expectFlag: string } | null;
  route: string[];
  /** the pending verse (shloka) id */
  shloka?: string | null;
  /** the last toasts shown (English) */
  toasts?: string[];
  /** Kathā: recitation lines answered this session, per verse */
  recited?: Record<string, number>;
  /** v0.4.2 "Show the way": where the map pointer points (null after the ending), whether it is drawn now, the setting */
  guide?: { kind: 'npc' | 'tile' | 'shrine' | 'exit'; map: string; x: number; y: number; to: string | null; npc: string | null; recite: string | null; step: number; goal: { map: string; x: number; y: number }; distance: number } | null;
  guideShown?: boolean;
  showWay?: boolean;
  // ── v0.5b (notes/v05b-plan.md §1) ──
  /** P4: the sprite the player walks as ('hanuman' in Kathā book 5 with katha.hanuman) */
  playerSprite?: string | null;
  /** P2: the book under review (pending 'book') */
  book?: number | null;
  /** P5: Nala's bridge (pending 'setu'): the stones, the solution, taps, Nala's hint */
  setu?: { tag: string; cols: number; turns: number; cells: number[]; solution: number[]; taps: number; hint: number | null } | null;
  // ── v0.6 (notes/v06-wp0.md) ──
  /** WP-E: the Āditya-hṛdayam cutscene on screen */
  cutscene?: { id: string; replay: boolean } | null;
  /** a told cutscene on screen (pending 'cutscene' in the story, or a replay) */
  told?: { id: string; replay: boolean } | null;
  /** the effects kit's stage while a script runs */
  stage?: { down: string[]; scale: Record<string, number>; props: Record<string, { sprite: string; x: number; y: number; carry?: string }>; tint: string | null } | null;
  /** a hidden moment waiting on the map */
  hotspot?: { x: number; y: number; ms: number } | null;
  /** the kit's timed effects fired so far (names, newest last) */
  kitLog?: string[];
}

export type Dir = 'up' | 'down' | 'left' | 'right';
export const D: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const KEY: Record<Dir, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
export const DEVA = /[\u0900-\u097F]/;
export const LATIN = /[A-Za-z]/;
export const CONTENT = loadContent();
/** v0.6: the practice game's content (the v0.5 verses, words and names: logic-journey practiceContent). */
export const PRACTICE = practiceContent(CONTENT);
export const ROOT = fileURLToPath(new URL('../../..', import.meta.url));

/** A minimal static server for a build folder (Node built-ins only: a game folder may not import tools/). */
export function serveDir(dir: string): Promise<{ url: string; close(): void }> {
  const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain' };
  const server = createServer((req, res) => {
    let p = normalize(join(dir, decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)));
    if (!p.startsWith(dir)) return void res.writeHead(403).end();
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    createReadStream(p).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => server.close() })));
}
export const POWER = new Map(CONTENT.moves.map((m) => [m.id, m.power]));

export interface BotOpts {
  /** Drive everything with the keyboard (no taps). */
  keyboard?: boolean;
  /** Answer the first challenge wrongly; called once the feedback bar is visible. */
  wrongOnce?: (s: Snap) => Promise<void>;
  /** Called when a verse card (pending shloka) is shown. */
  onVerse?: (s: Snap) => Promise<void>;
  /** In battle, use a healing item when the active hero is below 30% HP. */
  useItems?: boolean;
  /** Called before every step that has something pending (after it is on screen). */
  onStep?: (s: Snap) => Promise<void>;
  /** Kathā: how to pick a recitation gap ('key' 1–3 or 'tap'); default follows `keyboard`. */
  castInput?: (s: Snap) => 'key' | 'tap';
  /** Kathā: pick a wrong chunk on this cast (a miss: the right word shimmers in, the cast still fires). */
  castMiss?: (s: Snap) => boolean;
  /** Kathā: called when a recitation's chips are armed (before the pick). */
  onCast?: (s: Snap) => Promise<void>;
  /** Kathā: called after a cast was sent (the pending has moved on); `s` is the cast's snapshot. */
  afterCast?: (s: Snap, picked: string | null, ms: number) => Promise<void>;
  /** Kathā: never hurry the narration (let the beats advance by themselves). */
  noHurry?: boolean;
  /** Battle: which usable move to pick (a move id), else the strongest. */
  pickMove?: (s: Snap, usable: string[]) => string | undefined;
  /** Kathā one-tap moves: cast with a key (1–4) or a tap; default follows `keyboard`. */
  moveInput?: (s: Snap) => 'key' | 'tap';
  /** v0.6: find the hidden moments (a map hotspot: look closer; a told cutscene: tap its hotspot). Default: pass them by. */
  findHidden?: boolean;
  /** v0.6: the option to pick at a told cutscene's k-th question (default 0) */
  toldAnswer?: (k: number) => number;
}

export class Bot {
  /** The last bot decisions (shown when a test gets stuck). */
  readonly trace: string[] = [];
  note(t: string): void {
    this.trace.push(t);
    if (this.trace.length > 40) this.trace.shift();
  }
  private wrongDone = false;
  private recited = new Set<string>();
  /** No healing item left in this battle (or items refused, e.g. in duels): stop trying the Item menu. */
  private noHeal = false;
  private itemTries = 0;
  /** choice prompt (+ progress) → how often it was answered */
  private choiceTries = new Map<string, number>();
  constructor(
    private g: GameSession,
    private opts: BotOpts = {},
  ) {}
  get page(): Page {
    return this.g.page;
  }
  snap(): Promise<Snap> {
    return this.g.state<Snap>();
  }
  async waitSeq(prev: number, ms = 2500): Promise<boolean> {
    try {
      await this.page.waitForFunction((p) => ((window as unknown as { __game?: { seq?: number } }).__game?.seq ?? 0) > p, prev, { timeout: ms });
      return true;
    } catch {
      return false;
    }
  }
  async tap(id: string): Promise<void> {
    await this.g.tap(id);
  }
  async key(k: string): Promise<void> {
    await this.page.keyboard.press(k);
  }
  /** Press A: the Z key in keyboard mode, otherwise the given button. */
  async a(testid: string): Promise<void> {
    if (this.opts.keyboard) await this.key('z');
    else await this.tap(testid);
  }

  /** Story/feedback text must never show unrendered markup such as {w:…}, {f:…} or {player}. */
  async noRawMarkup(selector: string): Promise<void> {
    const text = (await this.page.locator(selector).first().textContent().catch(() => '')) ?? '';
    assert.ok(!/\{(w|n|b|f):|\{player\}/.test(text), `raw markup on screen: ${text}`);
  }

  /**
   * Kathā recitation: wait for the line to reach its gap (chips armed), pick the right chunk (or a wrong one), then wait
   * until the cast has completed and the game moved on. A line with no gap, or an automatic recitation, needs no input.
   */
  async cast(s: Snap): Promise<void> {
    const c = s.challenge;
    const sm = c?.smarana;
    assert.ok(c && sm, 'smarana challenge expected');
    const t0 = Date.now();
    const seq0 = s.seq;
    const auto = !!s.autoRecite && c.context === 'battle';
    await this.page.locator('[data-testid="recite-cast"]').waitFor();
    let picked: string | null = null;
    if (sm.gaps.length > 0 && !auto) {
      assert.equal(sm.gaps.length, 1, 'at most one gap per cast');
      assert.equal(sm.options.length, 3, 'three chips');
      // the chips arm, unless the cast finishes by itself first (automatic recitation switched on in the cast's help)
      await this.page.waitForFunction(
        (p) => !!document.querySelector('[data-testid="recite-chips"][data-armed="true"]') || ((window as unknown as { __game?: { seq?: number } }).__game?.seq ?? 0) > p,
        seq0,
        { timeout: 8000 },
      );
      if (!(await this.page.locator('[data-testid="recite-chips"][data-armed="true"]').count())) {
        if (this.opts.afterCast) await this.opts.afterCast(s, null, Date.now() - t0);
        return;
      }
      if (this.opts.onCast) await this.opts.onCast(s);
      const miss = this.opts.castMiss?.(s) ?? false;
      picked = (miss ? sm.options.find((o) => !sm.answers.includes(o)) : sm.answers[0]) ?? sm.answers[0] ?? null;
      assert.ok(picked, 'a chip to pick');
      const how = this.opts.castInput?.(s) ?? (this.opts.keyboard ? 'key' : 'tap');
      this.note(`cast ${sm.shlokaId}:${sm.pada} L${sm.level} ${how} ${miss ? 'miss' : 'ok'}`);
      if (how === 'key') await this.key(String(sm.options.indexOf(picked) + 1));
      else await this.tap(`recite-opt-${picked}`);
      // v0.5: a missed pick is marked with an ✗ on the chip the player chose, beside the right one in gold
      if (miss) {
        await this.page.locator(`[data-testid="recite-opt-${picked}"] [data-testid="recite-miss-mark"]`).waitFor({ timeout: 2000 });
        assert.equal(await this.page.locator('[data-testid="recite-miss-mark"]').count(), 1, 'one ✗, on the chip picked');
      }
    }
    assert.ok(await this.waitSeq(seq0, 9000), 'the cast completes and the game moves on');
    if (this.opts.afterCast) await this.opts.afterCast(s, picked, Date.now() - t0);
  }

  async answer(s: Snap, wrong: boolean): Promise<void> {
    const c = s.challenge;
    assert.ok(c, 'challenge expected');
    if (c.kind === 'smarana') return this.cast(s);
    // recital progress reads "n / m" with 1 ≤ n ≤ m
    const step = await this.page.locator('[data-testid="challenge-step"]').first().textContent({ timeout: 200 }).catch(() => null);
    const m = step ? /(\d+)\s*\/\s*(\d+)/.exec(step) : null;
    if (m) assert.ok(Number(m[1]) >= 1 && Number(m[1]) <= Number(m[2]), `recital step out of range: ${step}`);
    if (c.kind === 'krama' && c.tiles > 0) {
      let order = c.orders[0] ?? [];
      if (wrong) {
        const r = [...order].reverse();
        if (!c.orders.some((o) => o.join() === r.join())) order = r;
      }
      if (this.opts.keyboard) {
        // digits pick the n-th still-available tile
        const left = [...Array(c.tiles).keys()];
        for (const i of order) {
          const pos = left.indexOf(i);
          left.splice(pos, 1);
          await this.key(String(pos + 1));
        }
        await this.key('z');
      } else {
        for (const i of order) await this.tap(`tile-${i}`);
        await this.tap('krama-check');
      }
      return;
    }
    const pick = wrong ? (c.optionIds.find((o) => !c.answers.includes(o)) ?? c.answers[0]) : c.answers[0];
    assert.ok(pick, 'an option to pick');
    if (this.opts.keyboard) await this.key(String(c.optionIds.indexOf(pick) + 1));
    else await this.tap(`opt-${pick}`);
  }

  /** Resolve one non-explore situation. Returns false when there is nothing to do here. */
  async handle(s: Snap, recite?: string): Promise<boolean> {
    const p = s.pending;
    if (!s.battle) {
      this.noHeal = false;
      this.itemTries = 0;
    }
    if (!p) return false;
    if (this.opts.onStep) await this.opts.onStep(s);
    const seq0 = s.seq;
    switch (p) {
      case 'say':
      case 'title':
      case 'shloka':
      case 'words':
        if (p === 'shloka' && this.opts.onVerse) await this.opts.onVerse(s);
        if (p === 'say') await this.noRawMarkup('[data-testid="say-text"]');
        await this.a('advance');
        if (!(await this.waitSeq(seq0, 700))) await this.a('advance'); // first press may finish the typewriter
        break;
      case 'choice': {
        // the first option; when the same question comes back with no progress in between (a Kathā reply that
        // misreads the question gets an answer and the conversation turns back), the next one
        const key = `${s.choice?.prompt ?? ''}|${s.flags.length}`;
        const tries = this.choiceTries.get(key) ?? 0;
        this.choiceTries.set(key, tries + 1);
        const i = tries % Math.max(1, s.choice?.options ?? 1);
        if (this.opts.keyboard) await this.key(String(i + 1));
        else await this.tap(`choice-${i}`);
        break;
      }
      case 'challenge': {
        if (s.challenge?.kind === 'smarana') {
          await this.cast(s);
          return true;
        }
        const wrong = !!this.opts.wrongOnce && !this.wrongDone;
        this.wrongDone ||= wrong;
        await this.answer(s, wrong);
        if (wrong && this.opts.wrongOnce) {
          await this.page.waitForSelector('[data-testid="feedback"][data-correct="false"]');
          await this.opts.wrongOnce(s);
        }
        break;
      }
      case 'feedback':
        await this.noRawMarkup('[data-testid="feedback"]');
        await this.a('continue');
        break;
      case 'shop':
        if (this.opts.keyboard) await this.key('x');
        else await this.tap('shop-leave');
        break;
      case 'shrine':
        if (recite && !this.recited.has(recite)) {
          this.recited.add(recite);
          if (this.opts.keyboard) {
            await this.key('2');
            const idx = await this.page.locator('[data-testid^="recite-"]').evaluateAll((els, id) => els.findIndex((e) => e.getAttribute('data-testid') === `recite-${id}`), recite);
            await this.key(String(idx + 1));
          } else {
            await this.tap('shrine-recite');
            await this.tap(`recite-${recite}`);
          }
        } else if (this.opts.keyboard) await this.key(s.style === 'katha' ? '5' : '4'); // Kathā adds the study hall as 4
        else await this.tap('shrine-leave');
        break;
      case 'battle': {
        const b = s.battle;
        assert.ok(b);
        // v0.5b WP-E: the Āditya-hṛdayam cutscene plays over the battle (input waits); in e2e it is fast (≈ 1.6 s)
        if (s.cutscene) {
          this.note('cutscene: waiting');
          await this.page.waitForFunction(() => !(window as unknown as { __game?: { cutscene?: unknown } }).__game?.cutscene, null, { timeout: 60000 });
          break;
        }
        if (s.style === 'katha' && (b.beats > 0 || !['command', 'pick-move', 'pick-switch', 'pick-item'].includes(b.phase))) {
          // Kathā narration advances by itself; a tap only hurries it (the beat may already be gone)
          // (the tutorial duel never advances by itself: every beat waits for a tap, v0.4.3)
          if (this.opts.noHurry && !(await this.page.locator('[data-testid="battle-panel"][data-tutorial="true"]').count())) await this.waitSeq(seq0, 6000);
          else await this.page.locator('[data-testid="advance"]').first().click({ timeout: 700 }).catch(() => undefined);
        } else if (b.beats > 0 || !['command', 'pick-move', 'pick-switch', 'pick-item'].includes(b.phase)) await this.a('advance');
        else if (b.phase === 'command' && s.style !== 'katha') {
          const low = this.opts.useItems && !this.noHeal && b.allyMax > 0 && b.allyHp / b.allyMax < 0.3 && s.items > 0;
          const itemBtn = this.page.locator('[data-testid="cmd-item"]:not([disabled])');
          if (low && this.itemTries < 2 && s.battle?.kind !== 'duel' && (await itemBtn.count())) {
            this.itemTries += 1;
            await itemBtn.click();
          }
          else await (this.opts.keyboard ? this.key('1') : this.tap('cmd-fight'));
        } else if (b.phase === 'command') {
          // Kathā (v0.4.1): the command panel lists the moves; one tap / key casts (armed 300 ms after it appears)
          const panel = this.page.locator('[data-testid="katha-cmd"]');
          await this.page.locator('[data-testid="katha-cmd"][data-armed="true"]').waitFor({ timeout: 3000 });
          const low = this.opts.useItems && !this.noHeal && b.allyMax > 0 && b.allyHp / b.allyMax < 0.3 && s.items > 0;
          const itemBtn = panel.locator('[data-testid="cmd-item"]:not([disabled])');
          if (low && this.itemTries < 2 && s.battle?.kind !== 'duel' && (await itemBtn.count())) {
            this.itemTries += 1;
            if (this.opts.keyboard) await this.key('6');
            else await itemBtn.click();
          } else {
            const n = await this.pickMoveIndex(s, panel);
            if (this.opts.keyboard || this.opts.moveInput?.(s) === 'key') await this.key(String(n + 1));
            else await panel.locator('[data-testid^="move-"]').nth(n).click();
          }
        } else if (b.phase === 'pick-item') {
          const heal = this.page.locator('[data-testid="item-phala"], [data-testid="item-kanda_mula"], [data-testid="item-oshadhi"]').first();
          if (await heal.count()) await heal.click();
          else {
            this.noHeal = true;
            await this.tap('battle-back');
          }
        }
        else if (b.phase === 'pick-move') {
          const n = await this.pickMoveIndex(s, this.page.locator('[data-testid="battle-panel"]'));
          if (this.opts.keyboard) await this.key(String(n + 1));
          else await this.page.locator('[data-testid^="move-"]').nth(n).click();
        } else if (b.phase === 'pick-switch') {
          const btn = this.page.locator('[data-testid^="switch-"]:not([disabled])').first();
          if (await btn.count()) await btn.click();
          else await this.tap('battle-back');
        } else await this.tap('battle-back');
        break;
      }
      case 'ending':
        return false;
      case 'book': {
        // v0.5b P2: the book review — ▶ continue once it is armed
        await this.page.locator('[data-testid="book-review"][data-armed]').waitFor({ timeout: 3000 });
        await this.a('book-continue');
        break;
      }
      case 'cutscene': {
        // v0.6: a told cutscene (view-told; fast in e2e): answer its questions, tap its hotspots with findHidden, wait
        await this.page.locator('[data-testid="told"]').waitFor({ timeout: 5000 });
        let asked = 0;
        const t0 = Date.now();
        while (Date.now() - t0 < 90_000) {
          const now = await this.snap();
          if (now.pending !== 'cutscene') break;
          if (this.opts.findHidden && (await this.page.locator('[data-testid="told-hotspot"]').count())) {
            this.note('told: hotspot');
            await this.page.locator('[data-testid="told-hotspot"]').click({ timeout: 1000 }).catch(() => undefined);
          }
          if (await this.page.locator('[data-testid="told-ask"]').count()) {
            const i = this.opts.toldAnswer?.(asked) ?? 0;
            this.note(`told: answer ${asked} → ${i}`);
            asked++;
            if (this.opts.keyboard) await this.key(String(i + 1));
            else await this.page.locator(`[data-testid="told-opt-${i}"]`).click({ timeout: 2000 }).catch(() => undefined);
            await this.page.waitForFunction(() => document.querySelector('[data-testid="told"]')?.getAttribute('data-ask') !== 'true', null, { timeout: 3000 }).catch(() => undefined);
            continue;
          }
          await this.page.waitForTimeout(60);
        }
        break;
      }
      case 'hotspot': {
        // v0.6: a hidden moment — look closer (findHidden, once armed) or pass it by (▶)
        await this.page.locator('[data-testid="panel-hotspot"]').waitFor({ timeout: 3000 });
        if (this.opts.findHidden) {
          await this.page.locator('[data-testid="panel-hotspot"][data-armed="true"]').waitFor({ timeout: 3000 });
          if (this.opts.keyboard) await this.key('z');
          else await this.tap('hotspot-look');
        } else if (this.opts.keyboard) await this.key('x');
        else await this.tap('hotspot-pass');
        break;
      }
      case 'setu': {
        // v0.5b P5: Nala's bridge — turn the first stone that differs from the solution (expose.setu), else continue
        const st = s.setu;
        assert.ok(st, 'a setu pending exposes the bridge');
        const i = st.cells.findIndex((c, k) => c !== st.solution[k]);
        this.note(`setu ${st.cells.join('')} → ${st.solution.join('')}${i >= 0 ? ` turn ${i}` : ' solved'}`);
        if (i < 0) await this.a('setu-advance');
        else if (this.opts.keyboard && i < 9) await this.key(String(i + 1));
        else await this.tap(`setu-cell-${i}`);
        break;
      }
      default:
        // wait / fade / move / save play by themselves
        await this.waitSeq(seq0, 3000);
        return true;
    }
    await this.waitSeq(seq0, 2000);
    return true;
  }

  /** The move to use: `pickMove`'s choice, else the strongest usable move (by power), else the first usable one. */
  async pickMoveIndex(s: Snap, scope: ReturnType<Page['locator']>): Promise<number> {
    const ids = await scope.locator('[data-testid^="move-"]').evaluateAll((els) => els.map((e) => ((e as HTMLButtonElement).disabled ? '' : (e.getAttribute('data-testid') ?? '').slice(5))));
    // Kathā (v0.5a): a tired astra (its "tired" tag) counts as weaker, and the astra the foe card names as fitting wins
    const tired = new Set(await scope.locator('[data-testid^="tired-"]').evaluateAll((els) => els.map((e) => (e.getAttribute('data-testid') ?? '').slice(6))));
    const aff = this.page.locator('[data-testid="foe-affinity"]');
    const fit = (await aff.count()) ? await aff.first().getAttribute('data-affinity') : null;
    const power = (id: string): number => (id ? ((POWER.get(id) ?? 0) + 1) * (tired.has(id) ? 0.4 : 1) * (id === fit ? 10 : 1) : -1);
    let n = 0;
    ids.forEach((id, i) => {
      if (power(id) > power(ids[n] ?? '')) n = i;
    });
    const want = this.opts.pickMove?.(s, ids.filter(Boolean));
    if (want && ids.includes(want)) n = ids.indexOf(want);
    this.note(`moves ${ids.join(',')} → ${ids[n] ?? '?'}`);
    return n;
  }

  /** BFS over the snapshot grid ('.' = walkable) to any goal tile; `avoid` tiles are never crossed unless they are a goal. */
  bfs(grid: string[], sx: number, sy: number, goals: Set<string>, avoid?: Set<string>): { dir: Dir | null } | null {
    const H = grid.length;
    const W = grid[0]?.length ?? 0;
    const k = (x: number, y: number): string => `${x},${y}`;
    if (goals.has(k(sx, sy))) return { dir: null };
    const prev = new Map<string, { x: number; y: number; d: Dir } | null>([[k(sx, sy), null]]);
    const q: [number, number][] = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift() as [number, number];
      for (const d of Object.keys(D) as Dir[]) {
        const [dx, dy] = D[d];
        const nx = x + dx;
        const ny = y + dy;
        const nk = k(nx, ny);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(nk) || grid[ny]?.[nx] !== '.') continue;
        if (avoid?.has(nk) && !goals.has(nk)) continue;
        prev.set(nk, { x, y, d });
        if (goals.has(nk)) {
          let cur = nk;
          let first: Dir = d;
          for (;;) {
            const p = prev.get(cur);
            if (!p) break;
            first = p.d;
            const pk = k(p.x, p.y);
            if (pk === k(sx, sy)) break;
            cur = pk;
          }
          return { dir: first };
        }
        q.push([nx, ny]);
      }
    }
    return null;
  }

  async step(d: Dir): Promise<void> {
    const s = await this.snap();
    if (this.opts.keyboard) await this.key(KEY[d]);
    else await this.tap(`pad-${d}`);
    await this.waitSeq(s.seq, 1500);
  }

  /** One explore move toward a goal (default: the next walkthrough step). */
  async walk(s: Snap, goal = s.next): Promise<'moved' | 'interacted' | string> {
    if (!goal) return 'no goal';
    const goals = new Set<string>();
    let target: { x: number; y: number } | undefined;
    if (s.map !== goal.map) {
      const hops = s.warps.filter((w) => w.to === s.route[1]);
      const open = hops.filter((w) => w.open !== false);
      for (const w of open.length ? open : hops) goals.add(`${w.x},${w.y}`);
    } else if (goal.action.talk) {
      const n = s.npcs.find((x) => x.id === goal.action.talk);
      if (!n) return `npc ${goal.action.talk} is not on ${s.map}`;
      target = n;
    } else if (goal.action.reach) goals.add(`${goal.action.reach.x},${goal.action.reach.y}`);
    else if (goal.action.recite) {
      for (const sh of s.shrines) for (const [dx, dy] of Object.values(D)) goals.add(`${sh.x + dx},${sh.y + dy}`);
    }
    if (target) for (const [dx, dy] of Object.values(D)) goals.add(`${target.x + dx},${target.y + dy}`);
    const r = this.bfs(s.grid, s.x, s.y, goals);
    if (!r) return `no path on ${s.map} from ${s.x},${s.y}`;
    if (r.dir) {
      await this.step(r.dir);
      return 'moved';
    }
    if (goal.action.recite) target = s.shrines.find((sh) => Math.abs(sh.x - s.x) + Math.abs(sh.y - s.y) === 1);
    if (!target) return 'at goal';
    const d: Dir = target.x > s.x ? 'right' : target.x < s.x ? 'left' : target.y > s.y ? 'down' : 'up';
    if (s.facing !== d) await this.step(d);
    const s2 = await this.snap();
    await this.a('btn-a');
    await this.waitSeq(s2.seq, 1500);
    return 'interacted';
  }

  /** Play until `done(snap)` is true. */
  async playUntil(done: (s: Snap) => boolean, maxSteps = 900): Promise<Snap> {
    let lastErr = '';
    for (let i = 0; i < maxSteps; i++) {
      const s = await this.snap();
      if (done(s)) return s;
      this.note(`${s.map}@${s.x},${s.y} ${s.phase}/${s.pending ?? '-'}${s.battle ? `/${s.battle.phase} hp ${s.battle.allyHp}:${s.battle.foeHp}` : ''} next=${s.next ? JSON.stringify(s.next.action) : '-'}`);
      if (await this.handle(s, s.next?.action.recite)) continue;
      if (s.phase === 'explore' && !s.pending) {
        if (s.chapterDone !== null) throw new Error(`chapter ${s.chapterDone} completed before the goal`);
        const r = await this.walk(s);
        if (r !== 'moved' && r !== 'interacted') {
          if (r === lastErr) throw new Error(`bot stuck: ${r} (next: ${JSON.stringify(s.next)})\ntrace:\n${this.trace.join('\n')}`);
          lastErr = r;
        }
      } else await this.page.waitForTimeout(80);
    }
    const last = await this.snap();
    throw new Error(`goal not reached in ${maxSteps} steps at ${last.map}@${last.x},${last.y}; next ${JSON.stringify(last.next)}; npcs ${JSON.stringify(last.npcs)}\ntrace:\n${this.trace.join('\n')}`);
  }
}

/**
 * Title → New journey → Begin. The practice game (अभ्यासः) is picked explicitly: with Sanskrit story text the journey
 * picker defaults to कथा (v0.4), and these tests are about the practice game. (Keyboard runs use English, whose default
 * is already अभ्यासः.)
 */
export async function startJourney(g: GameSession, keyboard = false, style: 'abhyasa' | 'katha' = 'abhyasa'): Promise<void> {
  await g.waitForState("s => s.screen === 'title'");
  if (keyboard) {
    await g.page.keyboard.press('Enter'); // "New journey" is focused
    await g.waitForState("s => s.screen === 'new'");
    await g.page.keyboard.press('Enter'); // the name field is focused: submit the form
  } else {
    await g.tap('title-new');
    await g.tap(`journey-${style}`);
    await g.tap('start-journey');
  }
  await g.waitForState("s => s.screen === 'game'");
}


export async function openWithSave(open: Open, save: unknown, seed: number, script?: 'deva' | 'iast'): Promise<GameSession> {
  const g = await open({ seed, ...(script ? { script } : {}) });
  await g.page.evaluate((sv) => localStorage.setItem('samskuru:v1:game:ramayana-yatra:save-v1', JSON.stringify(sv)), save as Record<string, unknown>);
  await g.page.reload();
  await g.page.waitForSelector('[data-testid="game-host"][data-game="ramayana-yatra"]');
  await g.page.waitForFunction(() => !document.querySelector('[data-testid="game-loading"]'));
  await g.waitForState('s => s.screen === "title" && s.canContinue');
  await g.tap('title-continue');
  await g.waitForState("s => s.screen === 'game'");
  return g;
}

export async function shot(g: GameSession, name: string): Promise<void> {
  if (process.env['RY_SHOTS']) await g.page.screenshot({ path: `${process.env['RY_SHOTS']}/${name}.png` });
}

/** Menu → Settings → the dialogue-language control → close (the game must be calm: explore, nothing pending). */
export async function setDialogueLang(g: GameSession, lang: 'en' | 'sa-en' | 'sa'): Promise<void> {
  await g.waitForState("s => s.phase === 'explore' && !s.pending");
  await g.tap('btn-menu');
  await g.page.locator('[data-testid="menu"]').waitFor();
  await g.tap('tab-settings');
  await g.tap(`dlang-${lang}`);
  assert.equal(await g.page.locator(`[data-testid="dlang-${lang}"]`).getAttribute('aria-checked'), 'true');
  await g.tap('sheet-close');
  await g.page.locator('[data-testid="menu"]').waitFor({ state: 'detached' });
  await g.waitForState(`s => s.dialogueLang === '${lang}'`);
}

/** Read the translated line and return its say-text element: face the sign and press A, or play the opening scene. */
export async function readLine(g: GameSession, en: string, newJourney?: 'en' | 'sa-en' | 'sa'): Promise<ReturnType<Page['locator']>> {
  if (newJourney) {
    await g.waitForState("s => s.screen === 'title'");
    if (await g.page.locator('[data-testid="title-continue"]').count()) {
      await g.tap('title-new');
      await g.tap('title-new-confirm');
    } else await g.tap('title-new');
    await g.page.locator('[data-testid="new-journey"]').waitFor();
    await g.tap(`dlang-${newJourney}`);
    assert.equal(await g.page.locator(`[data-testid="dlang-${newJourney}"]`).getAttribute('aria-checked'), 'true');
    await g.tap('journey-abhyasa'); // the practice game (Sanskrit story text would default to कथा)
    await g.tap('start-journey');
    await g.waitForState("s => s.screen === 'game'");
    for (let i = 0; i < 80; i++) {
      const s = await g.state<Snap>();
      if (s.pending === 'say' && s.say === en) break;
      if (s.phase === 'explore' && !s.pending) throw new Error(`the opening scene ended before the line "${en}"`);
      if (s.pending === 'say' || s.pending === 'title') await g.tap('advance').catch(() => undefined);
      await g.page.waitForTimeout(120);
    }
  } else await g.tap('btn-a');
  await g.waitForState(`s => s.pending === 'say' && s.say === ${JSON.stringify(en)}`);
  const t = g.page.locator('[data-testid="say-text"]');
  await t.waitFor();
  return t;
}

export async function closeSay(g: GameSession, en: string): Promise<void> {
  await g.tap('advance');
  await g.waitForState(`s => s.say !== ${JSON.stringify(en)}`);
}

export async function reloadToTitle(g: GameSession): Promise<void> {
  await g.page.reload();
  await g.page.waitForSelector('[data-testid="game-host"][data-game="ramayana-yatra"]');
  await g.page.waitForFunction(() => !document.querySelector('[data-testid="game-loading"]'));
  await g.waitForState("s => s.screen === 'title'");
}

export const PREFS = 'samskuru:v1:game:ramayana-yatra:prefs-v1';
export const SAVE = 'samskuru:v1:game:ramayana-yatra:save-v1';

/**
 * Visible text inside the game root that has Latin letters, skipping [data-en-ok] (the language picker's "English",
 * key caps, the English meanings of verse words) and the typed player name(s).
 */
export async function latinOnScreen(g: GameSession, typed: string[] = ['Tester']): Promise<string[]> {
  return g.page.evaluate((names) => {
    const root = document.querySelector('.g-ramayana-yatra');
    if (!root) return ['(no game root)'];
    const out: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('[data-en-ok]')) continue;
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions)) continue;
      let t = n.textContent ?? '';
      for (const name of names) t = t.split(name).join('');
      if (/[A-Za-z]/.test(t)) out.push(t.trim());
    }
    return out;
  }, typed);
}

export async function expectNoLatin(g: GameSession, where: string): Promise<void> {
  await g.page.waitForTimeout(150);
  const found = await latinOnScreen(g);
  assert.deepEqual(found, [], `${where}: Latin letters on screen in संस्कृतम् mode: ${JSON.stringify(found)}`);
  await expectNoOverflow(g);
}

/** Write a save and the story-text preference, reload, and stand on the title screen (Continue available). */
export async function reloadWith(g: GameSession, save: unknown, lang: 'en' | 'sa-en' | 'sa'): Promise<void> {
  // a running game writes its own save when the page is hidden (v0.4.3: pagehide, then visibilitychange): these
  // listeners run after the game's, so the injected save is the one the reload finds (no named functions in here:
  // tsx would wrap them in __name, which the page does not have)
  await g.page.evaluate(([k, sv, p, l]) => {
    localStorage.setItem(k as string, JSON.stringify(sv));
    localStorage.setItem(p as string, JSON.stringify({ dialogueLang: l }));
    window.addEventListener('pagehide', () => localStorage.setItem(k as string, JSON.stringify(sv)));
    document.addEventListener('visibilitychange', () => localStorage.setItem(k as string, JSON.stringify(sv)));
  }, [SAVE, save, PREFS, lang] as const);
  await reloadToTitle(g);
  await g.waitForState('s => s.screen === "title" && s.canContinue');
}

export async function continueToExplore(g: GameSession): Promise<void> {
  await g.tap('title-continue');
  await g.waitForState("s => s.screen === 'game' && s.phase === 'explore' && !s.pending");
}

/** From the title screen: New journey (replacing a save if there is one). */
export async function toNewJourney(g: GameSession): Promise<void> {
  await g.waitForState("s => s.screen === 'title'");
  await g.tap('title-new');
  if (await g.page.locator('[data-testid="title-new-confirm"]').count()) await g.tap('title-new-confirm');
  await g.page.locator('[data-testid="new-journey"]').waitFor();
}

/** Start the (practice) journey and read on (▶) until the first chapter card. */
export async function toChapterCard(g: GameSession): Promise<void> {
  await g.tap('journey-abhyasa');
  await g.tap('start-journey');
  await g.waitForState("s => s.screen === 'game'");
  for (let i = 0; i < 120; i++) {
    const s = await g.state<Snap>();
    if (s.pending === 'title') break;
    if (s.pending === 'say') await g.tap('advance').catch(() => undefined);
    await g.page.waitForTimeout(120);
  }
  await g.page.locator('[data-testid="panel-title"]').waitFor();
}

/** Face the shop keeper / shrine (the save stands in front of it) and press A; read on until `pending`. */
export async function interactUntil(g: GameSession, pending: string, onSay?: () => Promise<void>): Promise<void> {
  await g.tap('btn-a');
  let said = false;
  for (let i = 0; i < 60; i++) {
    const s = await g.state<Snap>();
    if (s.pending === pending) return;
    if (s.pending === 'say') {
      if (!said && onSay) await onSay();
      said = true;
      await g.tap('advance').catch(() => undefined);
    }
    await g.page.waitForTimeout(120);
  }
  await g.waitForState(`s => s.pending === '${pending}'`);
}

/** The recitation panel's layout facts: chip heights and bottoms, line font size, wrapping, viewport height. */
export async function castLayout(g: GameSession): Promise<{ chips: { h: number; bottom: number; w: number }[]; fs: number; wrap: boolean; vh: number; vw: number; lineRight: number; lineLeft: number; rows: number }> {
  return g.page.evaluate(() => {
    const line = document.querySelector('[data-testid="recite-line"]') as HTMLElement | null;
    const chips = [...document.querySelectorAll('[data-testid^="recite-opt-"]')].map((e) => {
      const r = e.getBoundingClientRect();
      return { h: r.height, bottom: r.bottom, w: r.width };
    });
    // the line's real extent: every word box (the line itself never grows past its stage)
    const parts = [...(line?.children ?? [])].map((c) => c.getBoundingClientRect());
    const stage = line?.parentElement?.getBoundingClientRect();
    const tops = new Set(parts.map((r) => Math.round(r.top / 8)));
    const left = Math.min(...parts.map((r) => r.left));
    const right = Math.max(...parts.map((r) => r.right));
    return { chips, fs: Number(line?.getAttribute('data-fs') ?? 0), wrap: !!line?.classList.contains('is-wrap'), vh: innerHeight, vw: Math.min(innerWidth, stage?.right ?? innerWidth), lineRight: right, lineLeft: Math.max(0, stage?.left ?? 0) <= left ? left : -1, rows: tops.size };
  });
}

/** The audited layout rules for a cast with its chips showing. */
export async function expectCastLayout(g: GameSession, where: string): Promise<void> {
  const L = await castLayout(g);
  const min = L.vh <= 700 ? 46 : 52;
  assert.equal(L.chips.length, 3, `${where}: three chips`);
  for (const c of L.chips) {
    assert.ok(c.h >= min - 0.5, `${where}: chips ≥ ${min} px tall (${c.h})`);
    assert.ok(c.bottom <= L.vh + 0.5, `${where}: chips on screen (${c.bottom} > ${L.vh})`);
    assert.ok(c.w >= Math.min(L.vw, 600) * 0.7, `${where}: chips are stacked full width (${c.w} of ${L.vw})`);
  }
  assert.ok(L.fs >= 20 && L.fs <= 34, `${where}: line font 20–34 px (${L.fs})`);
  assert.ok(!L.wrap && L.rows === 1, `${where}: the line stays on one row`);
  assert.ok(L.lineLeft >= 0 && L.lineRight <= L.vw + 0.5, `${where}: the whole line fits inside its panel (${L.lineLeft}–${L.lineRight} of ${L.vw})`);
  await expectNoOverflow(g);
}

/** The Kathā version of a save: style katha (+ flag), every heard pāda at smṛti level `lvl`, `first` equipped first. */
export function kathaFrom(save: ReturnType<typeof toSave>, lvl: number, first?: string): ReturnType<typeof toSave> {
  const smrti: Record<string, { level: number; streak: number }> = {};
  for (const id of Object.keys(save.shlokas)) CONTENT.shlokas.find((x) => x.id === id)?.padas.forEach((_, p) => (smrti[`${id}:${p}`] = { level: lvl, streak: 0 }));
  const party = save.party.map((m, i) => {
    if (i !== 0 || !first) return m;
    const mv = CONTENT.moves.find((x) => x.id === first);
    return { ...m, moves: [first, ...m.moves.filter((x) => x !== first)].slice(0, 4), pp: { ...m.pp, [first]: Math.max(m.pp[first] ?? 0, mv?.pp ?? 10, 12) } };
  });
  return { ...save, style: 'katha', flags: { ...save.flags, 'style.katha': true }, smrti, party };
}

export const kathaVerse = (id: string | null | undefined): { anvaya: string[]; saralarthah: string } | undefined => CONTENT.katha?.verses.find((v) => v.shlokaId === id);

/** The canvas's data-guide ('mark:x,y' / 'edge:x,y' / ''), and the colour of that canvas pixel. */
export async function pointerOnCanvas(g: GameSession): Promise<{ mark: string; rgba: number[] | null }> {
  return g.page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid="screen"]');
    const mark = c?.dataset['guide'] ?? '';
    const m = /^(?:mark|edge):(\d+),(\d+)$/.exec(mark);
    if (!c || !m) return { mark, rgba: null };
    return { mark, rgba: [...(c.getContext('2d')?.getImageData(Number(m[1]), Number(m[2]), 1, 1).data ?? [])] };
  });
}

/** The pointer is on screen: exposed, consistent with the walkthrough, and drawn in gold on the canvas. */
export async function expectPointer(g: GameSession, where: string): Promise<Snap> {
  await g.waitForState('s => s.phase === "explore" && !s.pending && s.guideShown');
  await g.page.waitForFunction(() => /^(mark|edge):/.test(document.querySelector<HTMLCanvasElement>('[data-testid="screen"]')?.dataset['guide'] ?? ''));
  const s = await g.state<Snap>();
  const gd = s.guide;
  assert.ok(gd && s.next, `${where}: a target while a step is pending`);
  assert.equal(gd.map, s.map, `${where}: the pointer is on the player's map`);
  assert.equal(CONTENT.walkthrough[gd.step]?.expectFlag, s.next.expectFlag, `${where}: it serves the first walkthrough step not done`);
  assert.equal(gd.goal.map, s.next.map, `${where}: toward the step's map`);
  if (gd.map !== s.next.map) {
    assert.equal(gd.kind, 'exit', `${where}: another map → an exit`);
    assert.ok(s.warps.some((w) => w.x === gd.x && w.y === gd.y && w.to === gd.to && w.open !== false), `${where}: the exit is an open warp (${JSON.stringify(gd)})`);
  }
  assert.ok(gd.distance >= 0, `${where}: an open route leads there`);
  const { mark, rgba } = await pointerOnCanvas(g);
  assert.deepEqual(rgba, [255, 214, 90, 255], `${where}: the marker pixel at ${mark} is gold`);
  return s;
}

export async function expectNoPointer(g: GameSession, where: string): Promise<void> {
  await g.page.waitForFunction(() => (document.querySelector<HTMLCanvasElement>('[data-testid="screen"]')?.dataset['guide'] ?? '') === '', undefined, { timeout: 3000 });
  assert.equal((await g.state<Snap>()).guideShown, false, `${where}: the pointer is hidden`);
}

// ───────────────────────── full playthrough (opt-in: RY_FULL=1) ─────────────────────────
// The bot plays like a player who follows "Show the way": in free exploration it only reads the exposed pointer
// (`guide`), walks toward it with the on-screen pad (BFS over the snapshot grid, the route the pointer itself would
// take: around repeatable triggers and, in the practice game, around kuśa grass when it can), talks / steps on /
// recites there, and handles whatever comes up (dialogue, choices, verse moments, battles, recitations, shrines,
// chapter ends) with the ordinary Bot. There is no scripted route and no walkthrough lookup.

export const tileKey = (x: number, y: number): string => `${x},${y}`;

/** Encounter (kuśa) tiles of a map, from the content + tile catalog. */
export function encounterTiles(mapId: string): { x: number; y: number }[] {
  const m = CONTENT.maps.find((x) => x.id === mapId);
  if (!m?.encounters) return [];
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++) {
      const t = tileAt(m, x, y);
      if ((t.ground && TILE_PROPS[t.ground]?.encounter) || (t.overlay && TILE_PROPS[t.overlay]?.encounter)) out.push({ x, y });
    }
  return out;
}

/** Map route over warps (open warps only), from the content. */
export function contentRoute(from: string, to: string, flags: Set<string>): string[] {
  const fl = Object.fromEntries([...flags].map((f) => [f, true as const]));
  const prev = new Map<string, string>([[from, '']]);
  const q = [from];
  while (q.length) {
    const m = q.shift() as string;
    if (m === to) {
      const path: string[] = [];
      let c = m;
      while (c) {
        path.unshift(c);
        c = prev.get(c) ?? '';
      }
      return path;
    }
    for (const w of CONTENT.maps.find((x) => x.id === m)?.warps ?? []) {
      if (prev.has(w.to) || !testFlag(fl, w.requires)) continue;
      prev.set(w.to, m);
      q.push(w.to);
    }
  }
  return [];
}

/** Tiles of repeatable (once:false) triggers whose `requires` hold: the pointer's own route never crosses them. */
export function repeatTriggerTiles(mapId: string, flags: string[]): Set<string> {
  const m = CONTENT.maps.find((x) => x.id === mapId);
  const fl = Object.fromEntries(flags.map((f) => [f, true as const]));
  const out = new Set<string>();
  for (const t of m?.triggers ?? []) {
    if (t.once !== false || !testFlag(fl, t.requires)) continue;
    for (let y = t.y; y < t.y + Math.max(1, t.h || 1); y++) for (let x = t.x; x < t.x + Math.max(1, t.w || 1); x++) out.add(tileKey(x, y));
  }
  return out;
}

/** Where pressing A talks to a person at (nx, ny): beside them, or across a market-stall counter. */
export function talkSpotsAt(mapId: string, nx: number, ny: number): Set<string> {
  const m = CONTENT.maps.find((x) => x.id === mapId);
  const out = new Set<string>();
  for (const [dx, dy] of Object.values(D)) {
    out.add(tileKey(nx + dx, ny + dy));
    const t = m ? tileAt(m, nx + dx, ny + dy) : null;
    if (t && (t.ground === 'market_stall' || t.overlay === 'market_stall')) out.add(tileKey(nx + 2 * dx, ny + 2 * dy));
  }
  return out;
}

export const dirToward = (s: { x: number; y: number }, t: { x: number; y: number }): Dir => (t.x > s.x ? 'right' : t.x < s.x ? 'left' : t.y > s.y ? 'down' : 'up');

/**
 * One move toward the map pointer: a pad step along the route, or (beside a person / shrine) turn and press A.
 * Returns 'moved' / 'interacted', or a reason when the pointer cannot be followed.
 */
export async function followPointer(bot: Bot, s: Snap): Promise<string> {
  const g = s.guide;
  if (!g) return 'no pointer';
  if (g.map !== s.map) return `the pointer is on ${g.map}, the player on ${s.map}`;
  let goals: Set<string>;
  let face: { x: number; y: number } | null = null;
  if (g.kind === 'exit' || g.kind === 'tile') goals = new Set([tileKey(g.x, g.y)]);
  else if (g.kind === 'npc') {
    const n = s.npcs.find((x) => x.id === g.npc) ?? { x: g.x, y: g.y };
    goals = talkSpotsAt(s.map, n.x, n.y);
    face = n;
  } else {
    goals = new Set(Object.values(D).map(([dx, dy]) => tileKey(g.x + dx, g.y + dy)));
    face = { x: g.x, y: g.y };
  }
  if (g.kind === 'tile' && s.x === g.x && s.y === g.y) {
    // standing on it (its trigger did not fire on arrival): step off, then back on
    const off = (Object.keys(D) as Dir[]).find((d) => s.grid[s.y + D[d][1]]?.[s.x + D[d][0]] === '.' && !s.warps.some((w) => w.x === s.x + D[d][0] && w.y === s.y + D[d][1]));
    if (!off) return `nowhere to step off the pointer tile (${g.x},${g.y})`;
    await bot.step(off);
    return 'moved';
  }
  const avoid = repeatTriggerTiles(s.map, s.flags);
  const grass = s.style === 'katha' ? null : encounterTiles(s.map).map((t) => tileKey(t.x, t.y));
  const r = (grass?.length ? bot.bfs(s.grid, s.x, s.y, goals, new Set([...avoid, ...grass])) : null) ?? bot.bfs(s.grid, s.x, s.y, goals, avoid);
  if (!r) return `no path to the pointer (${g.kind} ${g.x},${g.y}${g.npc ? ` ${g.npc}` : ''}${g.to ? ` → ${g.to}` : ''}, distance ${g.distance}) on ${s.map} from ${s.x},${s.y}`;
  if (r.dir) {
    await bot.step(r.dir);
    return 'moved';
  }
  if (!face) return `at the pointer (${g.kind} ${g.x},${g.y}) and nothing happened`;
  const d = dirToward(s, face);
  if (s.facing !== d) await bot.step(d); // a step toward a person / shrine only turns (they are solid)
  const s2 = await bot.snap();
  await bot.a('btn-a');
  await bot.waitSeq(s2.seq, 1500);
  return 'interacted';
}

export interface ChapterStats {
  chapter: number;
  ms: number;
  battles: number;
  wild: number;
  challenges: number;
  losses: number;
  grindBattles: number;
}

export interface FullRun {
  chapters: ChapterStats[];
  totalMs: number;
  sessions: number;
  /** distinct pointer targets followed (walkthrough step × kind × tile × map) */
  targets: number;
  /** pad steps taken toward the pointer, and presses of A at it */
  steps: number;
  presses: number;
  /** screens swept for Latin letters (संस्कृतम्) */
  swept: number;
  /** संस्कृतम्: screens that showed Latin letters; every journey: calm moments without the pointer drawn */
  issues: string[];
}

/**
 * Plays from the current screen (a journey just begun) to the ending and the result "won", following the pointer.
 * `latin` (संस्कृतम्): returns the Latin strings on screen; it is called whenever the screen changes.
 */
export async function guidePlaythrough(g: GameSession, opts: { latin?: () => Promise<string[]>; label: string; until?: (s: Snap) => boolean; continueBooks?: boolean }): Promise<FullRun> {
  const bot = new Bot(g, { useItems: true });
  const t0 = Date.now();
  const chapters: ChapterStats[] = [];
  let cur: ChapterStats = { chapter: 1, ms: 0, battles: 0, wild: 0, challenges: 0, losses: 0, grindBattles: 0 };
  let chStart = Date.now();
  let lastChallenge = '';
  let inBattle = false;
  let lostSeen = false;
  let sessions = 1;
  let totalLosses = 0;
  let grind: { target: number; battles: number } | null = null;
  let lastErr = '';
  let stallKey = '';
  let stall = 0;
  const seenTargets = new Set<string>();
  let steps = 0;
  let pressCount = 0;
  let swept = 0;
  /** pointer target + flags → presses of A there (a person / shrine that never moves the story on) */
  const presses = new Map<string, number>();
  const issues = new Set<string>();
  let sweptKey = '';
  const sweep = async (where: string, key: string): Promise<void> => {
    if (!opts.latin || key === sweptKey) return;
    sweptKey = key;
    swept += 1;
    const found = await opts.latin();
    if (found.length) issues.add(`Latin on screen (${where}): ${JSON.stringify(found)}`);
  };
  const avgLevel = (s: Snap): number => s.party.reduce((a, m) => a + m.level, 0) / Math.max(1, s.party.length);
  const fail = (msg: string, s: Snap): never => {
    throw new Error(`[${opts.label}] ${msg}\nat ${s.map}@${s.x},${s.y} ${s.phase}/${s.pending ?? '-'} pointer ${JSON.stringify(s.guide)}\nflags ${s.flags.join(',')}\ntrace:\n${bot.trace.join('\n')}`);
  };
  for (let i = 0; i < 80000; i++) {
    // between sessions: chapter complete → result → Play again → Continue
    if (await g.page.locator('[data-testid="result"]').count()) {
      const outcome = await g.page.locator('[data-testid="result"]').getAttribute('data-outcome');
      if (outcome === 'won') break;
      assert.equal(outcome, 'completed', 'a book ends the session as completed');
      await g.tap('result-again');
      await g.waitForState("s => s.screen === 'title' && s.canContinue", 15000);
      await sweep('title (Continue)', `title:${sessions}`);
      await g.tap('title-continue');
      await g.waitForState("s => s.screen === 'game'");
      sessions += 1;
      continue;
    }
    const s = await bot.snap();
    if (s.screen !== 'game') {
      await g.page.waitForTimeout(100);
      continue;
    }
    if (opts.until?.(s)) break;
    const gd = s.guide;
    // stall detector: the same place, screen, battle and pointer for too long → fail with a full dump
    const key = `${s.map}@${s.x},${s.y}|${s.pending}|${s.say ?? ''}|${s.battle ? `${s.battle.phase}:${s.battle.allyHp}:${s.battle.foeHp}:${s.battle.beats}` : ''}|${gd ? `${gd.step}:${gd.kind}:${gd.x},${gd.y}` : '-'}|${s.flags.length}|${s.chapterDone}`;
    stall = key === stallKey ? stall + 1 : 0;
    stallKey = key;
    if (stall > 200) {
      if (process.env['RY_SHOT']) await g.page.screenshot({ path: process.env['RY_SHOT'] });
      fail(`stalled at ${key}`, s);
    }
    bot.note(`${s.map}@${s.x},${s.y} ${s.phase}/${s.pending ?? '-'} f${s.facing} ptr=${gd ? `${gd.kind}:${gd.x},${gd.y}${gd.npc ? `:${gd.npc}` : ''}${gd.to ? `>${gd.to}` : ''}#${gd.step}` : '-'}`);
    if (i % 500 === 0) process.stderr.write(`[${opts.label}] ${((Date.now() - t0) / 1000).toFixed(0)} s · book ${s.chapter} · ${s.map}@${s.x},${s.y} · ${s.phase}/${s.pending ?? '-'} · lv ${avgLevel(s).toFixed(1)}${s.battle ? ` · battle ${s.battle.kind} ${s.battle.phase} hp ${s.battle.allyHp}/${s.battle.allyMax}:${s.battle.foeHp}` : ''} · pointer ${gd ? `${gd.kind} (${gd.x},${gd.y}) step ${gd.step}` : '-'}${grind ? ` · grinding to ${grind.target} (${grind.battles})` : ''}\n`);
    // stats
    if ((s.chapter ?? 1) !== cur.chapter && s.chapter !== null) {
      cur.ms = Date.now() - chStart;
      chapters.push(cur);
      process.stderr.write(`[${opts.label}] book ${cur.chapter} done in ${(cur.ms / 1000).toFixed(0)} s (${cur.battles} battles, ${cur.challenges} challenges, ${cur.losses} losses)\n`);
      cur = { chapter: s.chapter, ms: 0, battles: 0, wild: 0, challenges: 0, losses: 0, grindBattles: 0 };
      chStart = Date.now();
    }
    if (s.challenge && s.challenge.id !== lastChallenge) {
      lastChallenge = s.challenge.id;
      cur.challenges += 1;
    }
    if (s.battle && !inBattle) {
      inBattle = true;
      lostSeen = false;
      cur.battles += 1;
      if (s.battle.kind === 'wild') {
        cur.wild += 1;
        if (grind) {
          grind.battles += 1;
          cur.grindBattles += 1;
        }
      }
    }
    if (s.battle?.phase === 'lost' && !lostSeen) {
      lostSeen = true;
      cur.losses += 1;
      totalLosses += 1;
      if (totalLosses > 15) fail(`lost ${totalLosses} battles; giving up`, s);
      // grinding is the practice game's way to get stronger (Kathā has no random encounters: a retry is enough)
      if (s.style !== 'katha') grind = { target: Math.floor(avgLevel(s)) + 2, battles: 0 };
      presses.clear();
    }
    if (!s.battle) inBattle = false;
    // what the screen shows now (संस्कृतम्: no Latin anywhere)
    await sweep(
      `${s.map} ${s.pending ?? 'explore'}${s.battle ? ` battle:${s.battle.phase}` : ''}${s.challenge ? ` ${s.challenge.kind}:${s.challenge.context}` : ''}${s.say ? ` "${s.say.slice(0, 60)}"` : ''}`,
      `${s.map}|${s.pending}|${s.say ?? ''}|${s.shloka ?? ''}|${s.challenge?.id ?? ''}|${s.battle ? `${s.battle.phase}:${s.battle.beats}:${s.battle.foe}` : ''}|${s.chapterDone}|${s.objective ?? ''}|${(s.toasts ?? []).length}`,
    );
    // the end
    if (s.pending === 'ending' || s.phase === 'ended') {
      await g.page.locator('[data-testid="panel-ending"]').waitFor();
      await sweep('ending', 'ending');
      await g.tap('ending-finish');
      await g.page.waitForSelector('[data-testid="result"]');
      continue;
    }
    // book complete (calm) → the book-complete screen: "continue" (the next book's opening, same session) or "stop
    // here" (the session ends; the next one continues from the save)
    if (s.chapterDone !== null && s.phase === 'explore' && !s.pending) {
      await g.page.locator('[data-testid="panel-chapter-done"][data-armed]').waitFor();
      await sweep('chapter complete', `done:${s.chapterDone}`);
      if (opts.continueBooks && s.bookEnd?.next) {
        await g.tap('chapter-next');
        await g.waitForState(`s => s.chapterDone === null && s.chapter === ${s.bookEnd.next}`, 15000);
        continue;
      }
      await g.tap('chapter-finish');
      await g.page.waitForSelector('[data-testid="result"]');
      continue;
    }
    if (await bot.handle(s, gd?.recite ?? undefined)) continue;
    if (s.phase !== 'explore' || s.pending) {
      await g.page.waitForTimeout(60);
      continue;
    }
    // free exploration: the pointer must be on screen (Show the way is on by default)
    if (!s.guideShown) issues.add(`calm moment without the pointer drawn: ${s.map}@${s.x},${s.y} (guide ${JSON.stringify(gd)})`);
    // grinding after a lost practice battle: wild battles on kuśa until the party is 2 levels stronger (capped)
    if (grind) {
      if (avgLevel(s) >= grind.target || grind.battles >= 30) grind = null;
      else {
        const here = encounterTiles(s.map as string);
        if (here.length) {
          const goals = new Set(here.map((t) => tileKey(t.x, t.y)));
          if (goals.has(tileKey(s.x, s.y))) {
            // pace between two neighbouring tiles until something attacks
            const d = (Object.keys(D) as Dir[]).find((k) => s.grid[s.y + D[k][1]]?.[s.x + D[k][0]] === '.') ?? 'up';
            await bot.step(d);
          } else {
            const r = bot.bfs(s.grid, s.x, s.y, goals);
            if (r?.dir) await bot.step(r.dir);
            else grind = null;
          }
        } else {
          // nearest map of this chapter (or any) with encounters, reachable through open warps
          const flags = new Set(s.flags);
          const best = CONTENT.maps
            .filter((m) => encounterTiles(m.id).length > 0)
            .map((m) => ({ m, r: contentRoute(s.map as string, m.id, flags) }))
            .filter((c) => c.r.length > 1)
            .sort((a, b) => Number(b.m.kanda === s.chapter) - Number(a.m.kanda === s.chapter) || a.r.length - b.r.length)[0];
          const goals = best ? new Set(s.warps.filter((w) => w.to === best.r[1] && w.open !== false).map((w) => tileKey(w.x, w.y))) : new Set<string>();
          const r = best ? bot.bfs(s.grid, s.x, s.y, goals) : null;
          if (r?.dir) await bot.step(r.dir);
          else grind = null;
        }
        continue;
      }
    }
    if (!gd) return fail('no pointer in free exploration before the ending', s);
    seenTargets.add(`${gd.step}|${gd.kind}|${gd.x},${gd.y}|${s.map}`);
    const pressKey = `${gd.step}|${gd.kind}|${gd.x},${gd.y}|${s.map}|${s.flags.length}`;
    const r = await followPointer(bot, s);
    if (r === 'moved') steps += 1;
    if (r === 'interacted') {
      pressCount += 1;
      const n = (presses.get(pressKey) ?? 0) + 1;
      presses.set(pressKey, n);
      if (n > 12) fail(`pressed A at the pointer ${n} times without the story moving on`, s);
    }
    if (r !== 'moved' && r !== 'interacted') {
      if (r === lastErr) fail(`cannot follow the pointer: ${r}`, s);
      lastErr = r;
    } else lastErr = '';
  }
  cur.ms = Date.now() - chStart;
  chapters.push(cur);
  return { chapters, totalMs: Date.now() - t0, sessions, targets: seenTargets.size, steps, presses: pressCount, swept, issues: [...issues] };
}

/**
 * Builds a save that stands at the first walkthrough step of `chapter` on `mapId`: every earlier walkthrough
 * flag set, every verse of earlier chapters heard and restored, a party at `level` with verse unlocks, and
 * the player at the entrance of that map. Returns null while that part of the story is not authored.
 * v0.5b: the flags of earlier Kathā-only steps (`style: 'katha'`) are set too, so a Kathā save made from it (kathaFrom)
 * starts after them; the practice game never reads them (Kathā content is gated by style.katha).
 */
export function planAt(content: GameContent, chapter: number, mapId: string, level: number, allies: string[]): { save: ReturnType<typeof toSave> } | null {
  const steps = content.walkthrough;
  const k = steps.findIndex((w) => w.chapter === chapter && w.map === mapId);
  const map = content.maps.find((m) => m.id === mapId);
  if (k < 0 || !map) return null;
  const arrival = content.maps.flatMap((m) => m.warps.filter((w) => w.to === map.id)).map((w) => ({ x: w.tx, y: w.ty }))[0];
  if (!arrival) return null;
  let st: GameState = newGame(9, 3, content, { name: 'Tester', avatar: 'a' });
  const flags: Record<string, true> = { ...st.save.flags };
  for (const w of steps.slice(0, k)) flags[w.expectFlag] = true;
  for (let c = 1; c < chapter; c++) flags[`ch${c}.complete`] = true;
  const shlokas: GameState['save']['shlokas'] = {};
  for (const s of content.shlokas) {
    // v0.6: a v0.6 verse (Kathā-only, heard only) is never restored: a planned save holds the v0.5 verses
    if (s.kanda > chapter || s.kathaOnly) continue;
    shlokas[s.id] = { heard: true, restored: true, best: 1 };
    flags[`heard.${s.id}`] = true;
    flags[`restored.${s.id}`] = true;
  }
  const party = allies
    .map((id) => content.allies.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => withUnlockedMoves(newMember(a, level, content), { shlokas }, content));
  const done = [1, 2, 3, 4, 5].filter((c) => c < chapter) as GameState['save']['completedChapters'];
  st = {
    ...st,
    mode: 'explore',
    script: null,
    pending: null,
    save: { ...st.save, flags, shlokas, party, chapter: chapter as GameState['save']['chapter'], mapId: map.id, x: arrival.x, y: arrival.y, respawn: { mapId: map.id, x: arrival.x, y: arrival.y }, completedChapters: done, items: { phala: 9, madhu: 5, oshadhi: 3 }, niska: 500 },
  };
  return { save: toSave(st) };
}

export function planFinale(content: GameContent): { save: ReturnType<typeof toSave> } | null {
  if (!content.events.some((e) => JSON.stringify(e.cmds).includes('"end":true'))) return null;
  return planAt(content, 6, 'lanka_palace', 40, ['player', 'rama', 'lakshmana', 'hanuman', 'jambavan', 'vibhishana']);
}

/**
 * A sign whose English text has a Sambhāṣaṇa translation (and no {player}, so the Sanskrit line is Latin-free),
 * with a save standing in front of it, facing it. The save comes from planAt for the sign's map, so the story
 * flags around it are consistent. Null while no sign is translated.
 */
export function signPlan(content: GameContent): { save: ReturnType<typeof toSave>; en: string; sa: string } | null {
  const dict = content.dialogueSa ?? {};
  for (const map of content.maps) {
    for (const sign of map.signs ?? []) {
      const sa = dict[sign.text];
      if (!sa || sign.text.includes('{player}') || sa.includes('{player}')) continue;
      const step = content.walkthrough.find((w) => w.map === map.id);
      if (!step) continue;
      const plan = planAt(content, step.chapter, map.id, 12, ['player', 'rama', 'lakshmana']);
      if (!plan) continue;
      for (const d of ['up', 'down', 'left', 'right'] as Dir[]) {
        const [dx, dy] = D[d];
        const x = sign.x - dx;
        const y = sign.y - dy;
        if (map.warps.some((w) => w.x === x && w.y === y)) continue;
        const save = { ...plan.save, x, y, facing: d, respawn: { mapId: map.id, x, y } };
        const st = loadGame(save, 9, 3, content);
        // loadGame moves a player who stands somewhere solid: keep only spots that survive loading as they are
        if (!st || st.save.mapId !== map.id || st.save.x !== x || st.save.y !== y || st.mode !== 'explore' || st.pending) continue;
        if (!isWalkable({ ...st, save: { ...st.save, x: -1, y: -1 } }, content, x, y)) continue; // no NPC on the spot
        return { save, en: sign.text, sa };
      }
    }
  }
  return null;
}

/**
 * The first translated say line of the opening scene (common.intro) that the player reaches by only pressing ▶
 * (before any verse card, challenge or battle), without {player} so the Sanskrit line is Latin-free. Null if none.
 */
export function introPlan(content: GameContent): string | null {
  const dict = content.dialogueSa ?? {};
  const ev = content.events.find((e) => e.id === 'common.intro');
  const PASSIVE = new Set(['say', 'who', 'portrait', 'fade', 'music', 'chapter', 'wait', 'face', 'set', 'move']);
  for (const c of (ev?.cmds ?? []) as Record<string, unknown>[]) {
    if (!Object.keys(c).every((k) => PASSIVE.has(k))) return null;
    const en = typeof c['say'] === 'string' ? (c['say'] as string) : null;
    if (en && dict[en] && !en.includes('{player}') && !(dict[en] ?? '').includes('{player}')) return en;
  }
  return null;
}

/** A save standing next to `target` on `mapId`, facing it (the spot must survive loadGame and be free). */
export function saveFacing(content: GameContent, save: ReturnType<typeof toSave>, mapId: string, target: { x: number; y: number }): ReturnType<typeof toSave> | null {
  const map = content.maps.find((m) => m.id === mapId);
  if (!map) return null;
  for (const d of ['up', 'down', 'left', 'right'] as Dir[]) {
    const [dx, dy] = D[d];
    const x = target.x - dx;
    const y = target.y - dy;
    if (map.warps.some((w) => w.x === x && w.y === y)) continue;
    const sv = { ...save, x, y, facing: d, respawn: { mapId, x, y } };
    const st = loadGame(sv, 9, 3, content);
    if (!st || st.save.mapId !== mapId || st.save.x !== x || st.save.y !== y || st.mode !== 'explore' || st.pending) continue;
    if (!isWalkable({ ...st, save: { ...st.save, x: -1, y: -1 } }, content, x, y)) continue;
    return sv;
  }
  return null;
}

/** A save in front of a shop keeper (an NPC whose event opens a shop), facing them. Null while there is none. */
export function shopPlan(content: GameContent): ReturnType<typeof toSave> | null {
  for (const map of content.maps) {
    const step = content.walkthrough.find((w) => w.map === map.id);
    const plan = step ? planAt(content, step.chapter, map.id, 8, ['player', 'rama', 'lakshmana']) : null;
    const st = plan ? loadGame(plan.save, 9, 3, content) : null;
    if (!plan || !st) continue;
    for (const npc of visibleNpcs(st, content)) {
      const ev = content.events.find((e) => e.id === npc.event);
      if (!ev || !JSON.stringify(ev.cmds).includes('"shop"')) continue;
      const save = saveFacing(content, plan.save, map.id, npc);
      if (save) return save;
    }
  }
  return null;
}

/** A save in front of a shrine tile, facing it. Null while there is none. */
export function shrinePlan(content: GameContent): ReturnType<typeof toSave> | null {
  for (const map of content.maps) {
    const step = content.walkthrough.find((w) => w.map === map.id);
    const plan = step ? planAt(content, step.chapter, map.id, 8, ['player', 'rama', 'lakshmana']) : null;
    if (!plan) continue;
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const t = tileAt(map, x, y);
        if (t.ground !== 'shrine' && t.overlay !== 'shrine') continue;
        const save = saveFacing(content, plan.save, map.id, { x, y });
        if (save) return save;
      }
  }
  return null;
}
