/**
 * Browser tests for Ramayana-yatra (view agent). Everything is driven through the real UI;
 * the bot reads the exposed snapshot (window.__game) to choose what to tap or which key to press,
 * so the tests survive content changes (maps, dialogue, verses) as long as the walkthrough works.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from 'playwright';
import { type GameSession, expectNoOverflow, gameSuite } from '../../../tests/e2e/harness';
import { loadContent } from './content';
import { TILE_PROPS, halfVerseLines, hardWord, isWalkable, loadGame, newGame, newMember, testFlag, tileAt, toSave, visibleNpcs, withUnlockedMoves } from './logic';
import type { GameContent, GameState } from './types';
import { uiEn, uiSa } from './sa-ui';

interface Snap {
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
}

type Dir = 'up' | 'down' | 'left' | 'right';
const D: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEY: Record<Dir, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const DEVA = /[\u0900-\u097F]/;
const LATIN = /[A-Za-z]/;
const CONTENT = loadContent();
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));

/** A minimal static server for a build folder (Node built-ins only: a game folder may not import tools/). */
function serveDir(dir: string): Promise<{ url: string; close(): void }> {
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
const POWER = new Map(CONTENT.moves.map((m) => [m.id, m.power]));

interface BotOpts {
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
}

class Bot {
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
async function startJourney(g: GameSession, keyboard = false, style: 'abhyasa' | 'katha' = 'abhyasa'): Promise<void> {
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

gameSuite('ramayana-yatra', ({ open }) => {
  test('a new journey: intro, first verse card, tutorial duel, then Rest & end session', async () => {
    const g = await open({ seed: 7, viewport: { width: 390, height: 844 } });
    await startJourney(g);
    let verseSeen = false;
    const bot = new Bot(g, {
      onVerse: async () => {
        if (verseSeen) return;
        verseSeen = true;
        const card = g.page.locator('[data-testid="shloka-card"]');
        await card.waitFor();
        assert.equal(await card.locator('[data-testid^="pada-btn-"]').count(), 4, 'a verse card shows four padas');
        assert.ok(await g.page.locator('[data-testid="verse-translation"]').isVisible(), 'the translation sits under the padas');
        assert.match((await card.locator('[data-testid="pada-0"]').textContent()) ?? '', DEVA, 'padas are in Devanagari by default');
        // tapping a line shows its words; a tapped word shows its form, grammar and gloss
        await card.locator('[data-testid="pada-btn-0"]').click();
        await card.locator('[data-testid="vw-0"]').click();
        await g.page.locator('[data-testid="verse-word"]').waitFor();
        assert.ok(((await g.page.locator('[data-testid="verse-translation"]').textContent()) ?? '').length > 10, 'translation shown');
      },
    });
    // play through the intro and the walkthrough until the tutorial duel has been fought and won
    let duelSeen = false;
    await bot.playUntil((s) => {
      if (s.battle?.kind === 'duel') duelSeen = true;
      return duelSeen && s.phase === 'explore' && !s.pending;
    });
    assert.ok(verseSeen, 'the first verse card was shown');
    const s = await bot.snap();
    assert.ok(s.heard.length > 0, 'verses were heard');
    await expectNoOverflow(g);
    // menu → Rest & end session
    await g.tap('btn-menu');
    await g.page.locator('[data-testid="menu"]').waitFor();
    await g.tap('tab-words');
    await g.page.locator('[data-testid="padakosha"]').waitFor();
    await g.tap('tab-verses');
    await g.page.locator('[data-testid="shlokakosha"]').waitFor();
    await g.tap('menu-rest');
    await g.tap('menu-rest-confirm');
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'completed');
    assert.ok(rec.xp > 0);
    assert.ok((rec.result.total ?? 0) > 0, 'challenges were answered');
    // the journey was saved for the next session
    const saved = await g.page.evaluate(() => localStorage.getItem('samskuru:v1:game:ramayana-yatra:save-v1'));
    assert.ok(saved && JSON.parse(saved).flags, 'save-v1 written');
    g.expectClean();
    await g.close();
  });

  test('a wrong answer shows the feedback bar with the correct answer', async () => {
    const g = await open({ seed: 11 });
    await startJourney(g);
    let checked = false;
    const bot = new Bot(g, {
      wrongOnce: async () => {
        const fb = g.page.locator('[data-testid="feedback"]');
        assert.equal(await fb.getAttribute('data-correct'), 'false');
        const ans = (await g.page.locator('[data-testid="correct-answer"]').textContent()) ?? '';
        assert.ok(ans.trim().length > 0, 'the correct answer is shown');
        assert.ok(await g.page.locator('[data-testid="continue"]').isVisible());
        checked = true;
      },
    });
    await bot.playUntil(() => checked);
    // continue resumes the game
    await g.tap('continue');
    await g.waitForState("s => s.pending !== 'feedback'");
    g.expectClean();
    await g.close();
  });

  test('IAST script: the verse card renders Latin, not Devanagari', async () => {
    const g = await open({ seed: 5, script: 'iast' });
    await startJourney(g);
    let ok = false;
    const bot = new Bot(g, {
      onVerse: async () => {
        const pada = g.page.locator('[data-testid="shloka-card"] [data-testid="pada-0"]');
        await pada.waitFor();
        const text = (await pada.textContent()) ?? '';
        assert.ok(!DEVA.test(text), `IAST pada has no Devanagari: ${text}`);
        assert.match(text, /[a-z]/i);
        assert.ok(((await pada.getAttribute('class')) ?? '').includes('sk-sa--iast'));
        ok = true;
      },
    });
    await bot.playUntil(() => ok, 200);
    await expectNoOverflow(g);
    g.expectClean();
    await g.close();
  });

  test('360×640, keyboard only: start, read, walk and talk', async () => {
    const g = await open({ seed: 3, viewport: { width: 360, height: 640 } });
    await startJourney(g, true);
    const bot = new Bot(g, { keyboard: true });
    // read the intro with Z until the player can walk
    const s0 = await bot.playUntil((s) => s.phase === 'explore' && !s.pending, 200);
    await expectNoOverflow(g);
    // walk: arrows move the player one tile per press (find a free direction)
    let moved = false;
    for (const d of ['down', 'up', 'left', 'right'] as Dir[]) {
      const [dx, dy] = D[d];
      if (s0.grid[s0.y + dy]?.[s0.x + dx] !== '.') continue;
      await bot.step(d);
      const s1 = await bot.snap();
      if (s1.phase === 'explore' && s1.x === s0.x + dx && s1.y === s0.y + dy) {
        moved = true;
        break;
      }
      if (s1.phase !== 'explore') break; // a trigger fired: still proves movement
    }
    const s2 = await bot.playUntil((s) => s.phase === 'explore' && !s.pending, 200);
    assert.ok(moved || s2.x !== s0.x || s2.y !== s0.y || s2.map !== s0.map, 'the player moved with the arrow keys');
    // walk up to an NPC and talk with Z
    const npc = s2.npcs.find((n) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => s2.grid[n.y + (dy as number)]?.[n.x + (dx as number)] === '.'));
    assert.ok(npc, 'an NPC to talk to');
    let talked = false;
    for (let i = 0; i < 300 && !talked; i++) {
      const s = await bot.snap();
      if (s.pending === 'say') {
        talked = true;
        break;
      }
      if (s.phase !== 'explore' || s.pending) {
        await bot.handle(s);
        continue;
      }
      const target = s.npcs.find((n) => n.id === npc.id) ?? npc;
      await bot.walk(s, { chapter: 1, map: s.map as string, action: { talk: target.id }, expectFlag: '' });
    }
    assert.ok(talked, 'talking to an NPC opens a dialogue');
    await g.page.locator('[data-testid="panel-say"]').waitFor();
    await expectNoOverflow(g);
    // the start menu opens with M and closes with Escape
    await bot.playUntil((s) => s.phase === 'explore' && !s.pending, 200);
    const smallTargets = (root: string): Promise<string[]> =>
      g.page.$$eval(`${root} button`, (els) =>
        els
          .filter((e) => (e as HTMLElement).offsetParent !== null && !e.classList.contains('g-ramayana-yatra__w') && e.getBoundingClientRect().height < 43.5)
          .map((e) => `${e.getAttribute('data-testid') ?? e.className} ${Math.round(e.getBoundingClientRect().height)}px`),
      );
    assert.deepEqual(await smallTargets('[data-testid="panel"]'), [], 'explore controls are at least 44 px');
    await g.page.keyboard.press('m');
    await g.page.locator('[data-testid="menu"]').waitFor();
    assert.deepEqual(await smallTargets('[data-testid="menu"]'), [], 'menu controls are at least 44 px');
    await g.page.keyboard.press('Escape');
    await g.page.locator('[data-testid="menu"]').waitFor({ state: 'detached' });
    g.expectClean();
    await g.close();
  });

  test('QA 11 Nov: 320×640 explore controls do not overlap; the title epigraph shows the verse as printed', async () => {
    const g = await open({ seed: 21, viewport: { width: 320, height: 640 } });
    await g.waitForState("s => s.screen === 'title'");
    const mn = CONTENT.shlokas.find((x) => x.id === 's-ma-nishada');
    if (mn) {
      const text = (await g.page.locator('[data-testid="title-verse"]').innerText()).replace(/\s+/g, ' ');
      for (const line of halfVerseLines(mn)) assert.ok(text.includes(line), `title epigraph shows "${line}": ${text}`);
    }
    await startJourney(g);
    const bot = new Bot(g, {});
    await bot.playUntil((s) => s.phase === 'explore' && !s.pending, 200);
    await expectNoOverflow(g);
    const ids = ['btn-menu', 'btn-book', 'btn-a', 'btn-b', 'pad-up', 'pad-down', 'pad-left', 'pad-right'];
    const boxes = await g.page.evaluate((list) => list.map((id) => {
      const r = document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect();
      return r ? { id, l: r.left, t: r.top, r: r.right, b: r.bottom } : { id, l: 0, t: 0, r: 0, b: 0 };
    }), ids);
    for (const b of boxes) assert.ok(b.r > b.l && b.l >= 0 && b.r <= 320, `${b.id} is on screen: ${JSON.stringify(b)}`);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const c = boxes[j]!;
      const overlap = Math.min(a.r, c.r) - Math.max(a.l, c.l) > 1 && Math.min(a.b, c.b) - Math.max(a.t, c.t) > 1;
      assert.ok(!overlap, `${a.id} overlaps ${c.id}: ${JSON.stringify([a, c])}`);
    }
    g.expectClean();
    await g.close();
  });

  async function openWithSave(save: unknown, seed: number, script?: 'deva' | 'iast'): Promise<GameSession> {
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

  // ───────── the end of a book (v0.5a): the book-complete screen, then the next book in the same session or the result ─────────
  const ch1Plan = planAt(CONTENT, 1, 'siddhashrama', 14, ['player', 'rama', 'lakshmana']);
  const BOOK2 = CONTENT.chapters.find((c) => c.kanda === 2);
  const ch1Verses = CONTENT.chapters.find((c) => c.kanda === 1)?.shlokaIds ?? [];
  /** Two of book 1's verses (no astra) heard but not restored, so the screen shows both states. */
  const unrestoredIds = ch1Verses.filter((id) => !CONTENT.moves.some((m) => m.unlockShloka === id)).slice(0, 2);
  const bookEndSave = (style: 'katha' | 'abhyasa'): ReturnType<typeof toSave> | null => {
    if (!ch1Plan || !BOOK2) return null;
    const base = style === 'katha' ? kathaFrom(ch1Plan.save, 1) : ch1Plan.save;
    const shlokas = { ...base.shlokas };
    const flags = { ...base.flags };
    for (const id of unrestoredIds) {
      const p = shlokas[id];
      if (p) shlokas[id] = { ...p, restored: false, best: 0.5 };
      delete flags[`restored.${id}`];
    }
    return { ...base, shlokas, flags };
  };
  const bookName = (k: number): { en: string; sa: string; pada: string } => {
    const n = CONTENT.names.find((x) => x.id === `kanda.${k}`);
    const sa = n?.sa ?? '';
    return { en: (n?.en ?? '').split(' · ')[0] ?? '', sa, pada: sa.replace(/म्$/, 'ं') };
  };
  const squash = (t: string | null): string => (t ?? '').replace(/\s+/g, '');
  const bookSkip = ch1Plan && BOOK2 && unrestoredIds.length === 2 ? false : 'needs the chapter 1 finale (siddhashrama), book 2 and two book-1 verses without an astra';

  /** A book-1-finale save and the story-text language, then Continue from the title (seeded, at a viewport). */
  async function openAtBookEnd(save: ReturnType<typeof toSave>, lang: 'en' | 'sa-en' | 'sa', viewport: { width: number; height: number }, seed = 13): Promise<GameSession> {
    const g = await open({ seed, viewport });
    await g.page.evaluate(([sv, l]) => {
      localStorage.setItem('samskuru:v1:game:ramayana-yatra:save-v1', JSON.stringify(sv));
      localStorage.setItem('samskuru:v1:game:ramayana-yatra:prefs-v1', JSON.stringify({ dialogueLang: l }));
    }, [save, lang] as const);
    await reloadToTitle(g);
    await g.waitForState('s => s.screen === "title" && s.canContinue');
    await g.tap('title-continue');
    await g.waitForState("s => s.screen === 'game'");
    return g;
  }
  /** Play the finale until the book-complete screen is on and armed. */
  async function playToBookEnd(g: GameSession, bot: Bot): Promise<Snap> {
    await bot.playUntil((s) => !!s.bookEnd, 900).catch(async (e: unknown) => {
      if (!(await bot.snap()).bookEnd) throw e;
    });
    await g.page.locator('[data-testid="panel-chapter-done"][data-armed]').waitFor();
    return bot.snap();
  }
  /** What the book-complete screen must show (book 1 → book 2): title, story line, the three numbers explained, verses, buttons. */
  async function checkBookEnd(g: GameSession, s: Snap, lang: 'en' | 'sa-en' | 'sa', style: 'katha' | 'abhyasa'): Promise<void> {
    assert.deepEqual(s.bookEnd, { kanda: 1, next: 2 }, 'book 1 is complete and book 2 is next');
    assert.equal(await g.page.locator('[data-testid="result"]').count(), 0, 'nothing from the shell yet');
    const panel = g.page.locator('[data-testid="panel-chapter-done"]');
    const b1 = bookName(1);
    const b2 = bookName(2);
    const title = (await panel.locator('[data-testid="book-end-title"]').textContent()) ?? '';
    if (lang === 'en') assert.equal(title.trim(), `${b1.en} complete`);
    else assert.ok(title.includes(`${b1.pada} समाप्तम्`), `the title is "${b1.pada} समाप्तम्": ${title}`);
    const story = await panel.locator('[data-testid="book-end-story"]').textContent();
    assert.ok(squash(story).includes(squash(lang === 'en' ? uiEn(CONTENT, 'bookEnd.story1') : (uiSa(CONTENT, 'bookEnd.story1') ?? '?'))), `the story line: ${story}`);
    // the three numbers, each with what it means
    const rows = style === 'katha' ? ['heard', 'recited', 'restored'] : ['heard', 'answers', 'restored'];
    for (const id of rows) {
      const row = panel.locator(`[data-testid="book-end-${id}"]`);
      assert.ok(await row.isVisible() || (await row.count()) === 1, `row ${id}`);
      const why = `bookEnd.${id}Why`;
      const text = await row.textContent();
      assert.ok(squash(text).includes(squash(lang === 'en' ? uiEn(CONTENT, why) : (uiSa(CONTENT, why) ?? '?'))), `row ${id} explains itself: ${text}`);
      if (lang === 'sa-en') assert.ok(squash(text).includes(squash(uiEn(CONTENT, why))), `sa-en: row ${id} has its English gloss`);
    }
    assert.equal(await panel.locator('[data-testid="book-end-heard"]').getAttribute('data-n'), String(ch1Verses.length), 'every verse of book 1 heard');
    assert.equal(await panel.locator('[data-testid="book-end-heard"]').getAttribute('data-of'), String(ch1Verses.length));
    assert.equal(await panel.locator('[data-testid="book-end-restored"]').getAttribute('data-n'), String(ch1Verses.length - unrestoredIds.length), 'restored of book 1');
    if (style === 'katha') {
      // (the finale's fights may end without a recitation: v0.5a battle tactics let a fitting astra decide a fight)
      const lines = Object.values(s.recited ?? {}).reduce((a, b) => a + b, 0);
      assert.equal(await panel.locator('[data-testid="book-end-recited"]').getAttribute('data-n'), String(lines), 'lines recited since the session began');
    } else assert.ok(Number(await panel.locator('[data-testid="book-end-answers"]').getAttribute('data-of')) > 0, 'questions were answered in the finale');
    // the book's verses with their state
    const verses = panel.locator('[data-testid^="book-end-verse-"]');
    assert.equal(await verses.count(), ch1Verses.length, 'one row per verse of the book');
    for (const id of ch1Verses) assert.equal(await panel.locator(`[data-testid="book-end-verse-${id}"]`).getAttribute('data-state'), unrestoredIds.includes(id) ? 'heard' : 'restored', `state of ${id}`);
    // primary: on to the next book (named); secondary: stop here
    const next = (await g.page.locator('[data-testid="chapter-next"]').textContent()) ?? '';
    if (lang === 'en') assert.ok(next.includes(`On to ${b2.en}`), next);
    else assert.ok(next.includes(`${b2.pada} प्रति`), `the next book is named: ${next}`);
    if (lang === 'sa') await expectNoLatin(g, 'book complete');
    else await expectNoOverflow(g);
    // the buttons are on screen without scrolling, ≥ 44 px
    const vp = g.page.viewportSize();
    for (const id of ['chapter-next', 'chapter-finish']) {
      const box = await g.page.locator(`[data-testid="${id}"]`).boundingBox();
      assert.ok(box && vp && box.y >= 0 && box.y + box.height <= vp.height && box.height >= 44, `${id} on screen (${JSON.stringify(box)})`);
    }
  }
  /** After "continue": the next book's opening plays in this session (its title card), and nothing came from the shell. */
  async function expectNextBookOpening(g: GameSession): Promise<void> {
    await g.waitForState(`s => s.chapter === 2 && s.map === '${BOOK2?.startMap}' && !s.bookEnd && s.chapterDone === null && s.pending === 'title'`, 8000);
    await g.page.locator('[data-testid="panel-title"]').waitFor();
    assert.equal(await g.page.locator('[data-testid="result"]').count(), 0, 'no result screen: the session goes on');
    assert.equal(await g.page.evaluate(() => (window as unknown as { __result?: unknown }).__result ?? null), null, 'ctx.finish was not called');
  }
  async function shot(g: GameSession, name: string): Promise<void> {
    if (process.env['RY_SHOTS']) await g.page.screenshot({ path: `${process.env['RY_SHOTS']}/${name}.png` });
  }

  test('book complete (practice, English): the book-complete screen explains heard / right answers / restored and lists the verses; "stop here" ends the session (completed); the save resumes in the next book, whose opening plays on the first steps', { skip: bookSkip }, async () => {
    const save = bookEndSave('abhyasa');
    assert.ok(save && BOOK2);
    const g = await openAtBookEnd(save, 'en', { width: 390, height: 844 });
    const bot = new Bot(g);
    const s = await playToBookEnd(g, bot);
    await checkBookEnd(g, s, 'en', 'abhyasa');
    await shot(g, 'book-end-en-390');
    // the screen holds still: no walking or menu behind it
    await g.page.keyboard.press('ArrowUp');
    await g.page.keyboard.press('m');
    await g.page.waitForTimeout(300);
    const still = await bot.snap();
    assert.ok(still.x === s.x && still.y === s.y && !still.menu && still.bookEnd, 'no step and no menu behind the book-complete screen');
    await g.tap('chapter-finish');
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'completed');
    assert.match((rec.result as { summary?: string }).summary ?? '', /^Book 1 complete · /, 'English rows unchanged');
    const saved = JSON.parse((await g.page.evaluate(() => localStorage.getItem('samskuru:v1:game:ramayana-yatra:save-v1'))) ?? '{}') as { completedChapters?: number[]; mapId?: string; flags?: Record<string, true> };
    assert.ok(saved.completedChapters?.includes(1), 'chapter 1 recorded as completed in the save');
    // autosave waits for a calm moment, so the save is never taken mid-event (before the hand-off warp)
    assert.equal(saved.mapId, BOOK2.startMap, 'the save resumes where book 2 starts, after the chapter hand-off');
    assert.ok(!saved.flags?.['ch2.started'], 'book 2 has not started yet');
    // Play again → Continue: book 2 begins (its opening plays on the first steps)
    await g.tap('result-again');
    await g.waitForState("s => s.screen === 'title' && s.canContinue", 15000);
    await g.tap('title-continue');
    await g.waitForState(`s => s.screen === 'game' && s.map === '${BOOK2.startMap}' && !s.bookEnd`);
    await bot.playUntil((x) => x.flags.includes('ch2.started') && x.chapter === 2, 300);
    g.expectClean();
    await g.close();
  });

  test('book complete (practice, संस्कृतम् + English): Sanskrit with English glosses; "continue" goes straight into book 2\'s opening in the same session', { skip: bookSkip }, async () => {
    const save = bookEndSave('abhyasa');
    assert.ok(save);
    const g = await openAtBookEnd(save, 'sa-en', { width: 390, height: 844 }, 15);
    const s = await playToBookEnd(g, new Bot(g));
    await checkBookEnd(g, s, 'sa-en', 'abhyasa');
    await shot(g, 'book-end-sa-en-390');
    await g.tap('chapter-next');
    await expectNextBookOpening(g);
    g.expectClean();
    await g.close();
  });

  test('book complete (Kathā, संस्कृतम्, 390×844, keyboard): no Latin; the three numbers explained; Enter continues into book 2\'s opening (no shell result); a later Rest & end session reports in Sanskrit', { skip: bookSkip, timeout: 240_000 }, async () => {
    const save = bookEndSave('katha');
    assert.ok(save);
    const g = await openAtBookEnd(save, 'sa', { width: 390, height: 844 });
    const bot = new Bot(g);
    const s = await playToBookEnd(g, bot);
    await checkBookEnd(g, s, 'sa', 'katha');
    await shot(g, 'book-end-sa-390');
    if (process.env['RY_SHOTS']) {
      await g.page.evaluate(() => (document.documentElement.dataset['theme'] = 'dark'));
      await shot(g, 'book-end-sa-390-dark');
      await g.page.evaluate(() => delete document.documentElement.dataset['theme']);
    }
    await g.page.locator('[data-testid="book-end-verses"]').scrollIntoViewIfNeeded();
    await shot(g, 'book-end-sa-390-verses');
    await g.page.keyboard.press('Enter');
    await expectNextBookOpening(g);
    await expectNoLatin(g, 'book 2 title card');
    // the opening plays on; then the player rests: the session reports book 1 (and this sitting's numbers) in Sanskrit
    await bot.playUntil((x) => x.flags.includes('ch2.started') && x.phase === 'explore' && !x.pending, 400);
    await g.tap('btn-menu');
    await g.tap('menu-rest');
    await g.tap('menu-rest-confirm');
    const rec = await g.expectResult();
    const r = rec.result as { outcome: string; summary?: string; review?: { sa: string; en?: string; note?: string }[] };
    assert.equal(r.outcome, 'completed');
    assert.ok((r.summary ?? '').startsWith(`${bookName(1).pada} समाप्तम्`) && !LATIN.test(r.summary ?? ''), `Sanskrit summary: ${r.summary}`);
    g.expectClean();
    await g.close();
  });

  test('book complete (Kathā, संस्कृतम्, 360×640): the screen fits; "stop here" → the shell result (completed) with Sanskrit rows; Play again → Continue resumes in book 2', { skip: bookSkip, timeout: 240_000 }, async () => {
    const save = bookEndSave('katha');
    assert.ok(save && BOOK2);
    const g = await openAtBookEnd(save, 'sa', { width: 360, height: 640 }, 17);
    const bot = new Bot(g);
    const s = await playToBookEnd(g, bot);
    await checkBookEnd(g, s, 'sa', 'katha');
    await shot(g, 'book-end-sa-360');
    await g.tap('chapter-finish');
    const rec = await g.expectResult();
    const r = rec.result as { outcome: string; summary?: string; share?: string; review?: { sa: string; en?: string; note?: string }[] };
    assert.equal(r.outcome, 'completed');
    const lines = Object.values(s.recited ?? {}).reduce((a, b) => a + b, 0);
    const parts = (r.summary ?? '').split(' · ');
    assert.equal(parts.length, 4, `book · heard · recited · restored: ${r.summary}`);
    assert.equal(parts[0], `${bookName(1).pada} समाप्तम्`);
    assert.equal(parts[2], uiSa(CONTENT, 'bookEnd.resultRecited', { n: lines }), 'lines recited, as on the book-complete screen');
    assert.ok(!LATIN.test(r.summary ?? '') && r.share === r.summary, `the summary (and share) in Sanskrit: ${r.summary}`);
    if (lines > 0) assert.ok((r.review ?? []).length > 0, 'a verse recited this session has its row');
    for (const row of r.review ?? []) {
      assert.ok(!LATIN.test(`${row.en ?? ''} ${row.note ?? ''}`) && DEVA.test(row.en ?? ''), `a Sanskrit review row: ${JSON.stringify(row)}`);
    }
    const shown = (await g.page.locator('.app-result__summary').textContent()) ?? '';
    assert.equal(shown, r.summary, 'the shell shows the Sanskrit summary');
    await shot(g, 'result-sa-360');
    const saved = JSON.parse((await g.page.evaluate(() => localStorage.getItem('samskuru:v1:game:ramayana-yatra:save-v1'))) ?? '{}') as { completedChapters?: number[]; mapId?: string };
    assert.ok(saved.completedChapters?.includes(1) && saved.mapId === BOOK2.startMap, 'the save resumes in book 2');
    await g.tap('result-again');
    await g.waitForState("s => s.screen === 'title' && s.canContinue", 15000);
    await g.tap('title-continue');
    await g.waitForState(`s => s.screen === 'game' && s.map === '${BOOK2.startMap}' && s.phase === 'explore' && !s.bookEnd`);
    await bot.playUntil((x) => x.flags.includes('ch2.started') && x.chapter === 2, 300);
    g.expectClean();
    await g.close();
  });

  const finalPlan = planFinale(CONTENT);
  test('a late-game save: final boss, ending, result "won"', { skip: finalPlan ? false : 'chapter 6 content (final boss on lanka_palace + ending) is not in the content yet' }, async () => {
    assert.ok(finalPlan);
    const g0 = await openWithSave(finalPlan.save, 9);
    const bot = new Bot(g0);
    await bot.playUntil((s) => s.phase === 'ended' || s.pending === 'ending', 1500);
    await g0.page.locator('[data-testid="panel-ending"]').waitFor();
    assert.ok((await g0.page.locator('[data-testid="credits"] li').count()) > 0, 'the credits list restored verses');
    await g0.tap('ending-finish');
    const rec = await g0.expectResult();
    assert.equal(rec.result.outcome, 'won');
    g0.expectClean();
    await g0.close();
  });

  // ───────── full playthrough through the real UI, following the map pointer (opt-in: RY_FULL) ─────────
  // RY_FULL=1 plays both journeys (Kathā in संस्कृतम्, the owner's mode, and the practice game in English);
  // RY_FULL=katha or RY_FULL=practice plays one. RY_FULL_SEEDS="21,22" picks the seeds (default 21).
  const fullWhich = process.env['RY_FULL'] ?? '';
  const fullSeeds = (process.env['RY_FULL_SEEDS'] ?? '21').split(',').map((x) => Number(x.trim())).filter((n) => Number.isInteger(n));
  const fullRuns = [
    { journey: 'katha', lang: 'sa', title: 'Kathā in संस्कृतम्' },
    { journey: 'practice', lang: 'en', title: 'practice in English' },
  ] as const;
  for (const run of fullRuns)
    for (const seed of fullSeeds) {
      const on = fullWhich === '1' || fullWhich === 'both' || fullWhich === run.journey;
      test(
        `full playthrough through the real UI, following the map pointer: ${run.title}, seed ${seed} — New journey → all six books → ending → won (RY_FULL=1)`,
        { skip: on ? false : 'long run: set RY_FULL=1 (or katha / practice) to play the whole story through the UI', timeout: 90 * 60 * 1000 },
        async () => {
          const g = await open({ seed });
          if (run.lang === 'sa') {
            await toNewJourney(g);
            await g.tap('dlang-sa');
            await g.waitForState("s => s.dialogueLang === 'sa'");
            await g.tap('journey-katha');
            await expectNoLatin(g, 'new journey (कथा)');
            await g.tap('start-journey');
            await g.waitForState("s => s.screen === 'game' && s.style === 'katha'");
          } else await startJourney(g);
          const label = `full ${run.journey}/${run.lang} seed ${seed}`;
          // v0.5a: Kathā takes the book-complete screen's "continue" (one session); practice stops at each book end and resumes
          const stats = await guidePlaythrough(g, { label, continueBooks: run.journey === 'katha', ...(run.lang === 'sa' ? { latin: () => latinOnScreen(g) } : {}) });
          const rec = await g.expectResult(30000);
          assert.equal(rec.result.outcome, 'won');
          const total = stats.chapters.reduce((a, c) => ({ battles: a.battles + c.battles, wild: a.wild + c.wild, challenges: a.challenges + c.challenges, losses: a.losses + c.losses }), { battles: 0, wild: 0, challenges: 0, losses: 0 });
          console.log(`[${label}] ${(stats.totalMs / 60000).toFixed(1)} min wall, ${stats.sessions} sessions, ${stats.targets} pointer targets (${stats.steps} pad steps, ${stats.presses} presses of A), ${run.lang === 'sa' ? `${stats.swept} screens swept for Latin, ` : ''}${total.battles} battles (${total.wild} wild), ${total.challenges} challenges, ${total.losses} losses`);
          for (const c of stats.chapters) console.log(`[${label}] book ${c.chapter}: ${(c.ms / 1000).toFixed(0)} s, ${c.battles} battles (${c.wild} wild, ${c.grindBattles} grinding), ${c.challenges} challenges, ${c.losses} losses`);
          assert.ok(stats.chapters.some((c) => c.chapter === 6), 'reached book 6');
          if (run.journey === 'katha') assert.equal(stats.sessions, 1, 'one session: each book end → "continue" → the next book');
          else assert.equal(stats.sessions, 6, 'one session per book (each book end → "stop here" → result → Continue)');
          if (run.lang === 'sa') assert.ok(stats.swept > 200, `the screens were swept for Latin (${stats.swept})`);
          assert.deepEqual(stats.issues, [], `issues seen on the way:\n${stats.issues.join('\n')}`);
          g.expectClean();
          await g.close();
        },
      );
    }

  // ───────── dialogue language (Sambhāṣaṇa-Saṃskṛtam) ─────────
  // Uses whatever is translated when the test runs: a sign (read in place from an injected save) or, failing that,
  // a line of the opening scene (reached through New journey). Skipped only while neither has a translation.
  const signCase = signPlan(CONTENT);
  const introLine = signCase ? null : introPlan(CONTENT);
  const calmSave = planAt(CONTENT, 1, CONTENT.walkthrough[0]?.map ?? '', 5, ['player'])?.save ?? null;
  /** Menu → Settings → the dialogue-language control → close (the game must be calm: explore, nothing pending). */
  async function setDialogueLang(g: GameSession, lang: 'en' | 'sa-en' | 'sa'): Promise<void> {
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
  async function readLine(g: GameSession, en: string, newJourney?: 'en' | 'sa-en' | 'sa'): Promise<ReturnType<Page['locator']>> {
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
  async function closeSay(g: GameSession, en: string): Promise<void> {
    await g.tap('advance');
    await g.waitForState(`s => s.say !== ${JSON.stringify(en)}`);
  }
  async function reloadToTitle(g: GameSession): Promise<void> {
    await g.page.reload();
    await g.page.waitForSelector('[data-testid="game-host"][data-game="ramayana-yatra"]');
    await g.page.waitForFunction(() => !document.querySelector('[data-testid="game-loading"]'));
    await g.waitForState("s => s.screen === 'title'");
  }
  const dlSkip = signCase || (introLine && calmSave) ? false : 'no sign or opening-scene line is translated in content.dialogueSa yet (the Sambhāṣaṇa translators are still filling it)';
  test('dialogue language: Sanskrit via Settings (Devanagari only), Sanskrit + English, and IAST', { skip: dlSkip }, async () => {
    const en = signCase?.en ?? introLine ?? '';
    const viaSign = !!signCase;
    const save = signCase?.save ?? calmSave;
    assert.ok(en && save);
    const g = await openWithSave(save, 17);
    await g.waitForState("s => s.phase === 'explore' && !s.pending");
    assert.equal((await g.state<Snap>()).dialogueLang, 'en', 'English is the default');
    if (viaSign) {
      const t0 = await readLine(g, en);
      assert.equal(await t0.locator('[data-testid="story-sa"]').count(), 0, 'no Sanskrit line in English mode');
      await closeSay(g, en);
      await g.waitForState("s => s.phase === 'explore' && !s.pending");
    }

    // Sanskrit only, chosen in Settings (stored in prefs-v1, never in the save)
    await setDialogueLang(g, 'sa');
    const prefs = JSON.parse((await g.page.evaluate(() => localStorage.getItem('samskuru:v1:game:ramayana-yatra:prefs-v1'))) ?? '{}') as { dialogueLang?: string };
    assert.equal(prefs.dialogueLang, 'sa', 'the setting is stored in prefs-v1');
    if (!viaSign) await reloadToTitle(g);
    let t = await readLine(g, en, viaSign ? undefined : 'sa');
    const saText = ((await t.textContent()) ?? '').trim();
    assert.match(saText, DEVA, `the say line is in Devanagari: ${saText}`);
    assert.ok(!LATIN.test(saText), `no Latin letters in the Sanskrit dialogue text: ${saText}`);
    assert.equal(await t.locator('[data-testid="story-en"]').count(), 0, 'Sanskrit-only mode shows no English');
    assert.ok(((await t.locator('[data-testid="story-sa"] .sk-sa').first().getAttribute('class')) ?? '').includes('sk-sa--deva'));
    await expectNoOverflow(g);
    await closeSay(g, en);

    // Sanskrit + English (Settings for a sign; the New-journey picker for the opening scene)
    if (viaSign) {
      await setDialogueLang(g, 'sa-en');
      t = await readLine(g, en);
    } else {
      await reloadToTitle(g);
      t = await readLine(g, en, 'sa-en');
    }
    const sa = ((await t.locator('[data-testid="story-sa"]').textContent()) ?? '').trim();
    const enText = ((await t.locator('[data-testid="story-en"]').textContent()) ?? '').trim();
    assert.match(sa, DEVA, 'the Sanskrit line comes first');
    assert.ok(!LATIN.test(sa), `the Sanskrit line has no Latin letters: ${sa}`);
    assert.match(enText, LATIN, 'the English follows below');
    assert.ok(await t.locator('[data-testid="story-en"]').isVisible(), 'the English is visible once the line is complete');
    await closeSay(g, en);
    const saved = (await g.page.evaluate(() => localStorage.getItem('samskuru:v1:game:ramayana-yatra:save-v1'))) ?? '';
    assert.ok(!saved.includes('dialogueLang'), 'the dialogue language is never part of the save');
    g.expectClean();
    await g.close();

    // IAST script: the Sanskrit line renders in Latin
    const g2 = await openWithSave(save, 17, 'iast');
    if (viaSign) await setDialogueLang(g2, 'sa');
    else await reloadToTitle(g2);
    const t2 = await readLine(g2, en, viaSign ? undefined : 'sa');
    const iast = ((await t2.textContent()) ?? '').trim();
    assert.ok(!DEVA.test(iast), `IAST mode: no Devanagari in the Sanskrit line: ${iast}`);
    assert.match(iast, LATIN);
    assert.ok(((await t2.locator('[data-testid="story-sa"] .sk-sa').first().getAttribute('class')) ?? '').includes('sk-sa--iast'));
    g2.expectClean();
    await g2.close();
  });

  // ───────── Sanskrit interface, area A (ui-a): title, new journey, chapter card, HUD, menu, shop, shrine ─────────
  const uiCalm = planAt(CONTENT, 1, CONTENT.walkthrough[0]?.map ?? '', 5, ['player', 'rama', 'lakshmana']);
  const uiShop = shopPlan(CONTENT);
  const uiShrine = shrinePlan(CONTENT);
  const PREFS = 'samskuru:v1:game:ramayana-yatra:prefs-v1';
  const SAVE = 'samskuru:v1:game:ramayana-yatra:save-v1';
  /**
   * Visible text inside the game root that has Latin letters, skipping [data-en-ok] (the language picker's "English",
   * key caps, the English meanings of verse words) and the typed player name(s).
   */
  async function latinOnScreen(g: GameSession, typed: string[] = ['Tester']): Promise<string[]> {
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
  async function expectNoLatin(g: GameSession, where: string): Promise<void> {
    await g.page.waitForTimeout(150);
    const found = await latinOnScreen(g);
    assert.deepEqual(found, [], `${where}: Latin letters on screen in संस्कृतम् mode: ${JSON.stringify(found)}`);
    await expectNoOverflow(g);
  }
  /** Write a save and the story-text preference, reload, and stand on the title screen (Continue available). */
  async function reloadWith(g: GameSession, save: unknown, lang: 'en' | 'sa-en' | 'sa'): Promise<void> {
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
  async function continueToExplore(g: GameSession): Promise<void> {
    await g.tap('title-continue');
    await g.waitForState("s => s.screen === 'game' && s.phase === 'explore' && !s.pending");
  }
  /** From the title screen: New journey (replacing a save if there is one). */
  async function toNewJourney(g: GameSession): Promise<void> {
    await g.waitForState("s => s.screen === 'title'");
    await g.tap('title-new');
    if (await g.page.locator('[data-testid="title-new-confirm"]').count()) await g.tap('title-new-confirm');
    await g.page.locator('[data-testid="new-journey"]').waitFor();
  }
  /** Start the (practice) journey and read on (▶) until the first chapter card. */
  async function toChapterCard(g: GameSession): Promise<void> {
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
  async function interactUntil(g: GameSession, pending: string, onSay?: () => Promise<void>): Promise<void> {
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
  const uiSkip = uiCalm && uiShop && uiShrine ? false : 'needs a calm chapter-1 save, a shop keeper and a shrine in the content';
  test('संस्कृतम् mode: the screens of area A show no Latin letters', { skip: uiSkip, timeout: 240_000 }, async () => {
    assert.ok(uiCalm && uiShop && uiShrine);
    const g = await open({ seed: 19, viewport: { width: 390, height: 844 } });

    // English first: the chapter card is exactly the old English
    await toNewJourney(g);
    assert.match((await g.page.locator('[data-testid="new-journey"]').textContent()) ?? '', /Your name/);
    await toChapterCard(g);
    const card = g.page.locator('[data-testid="panel-title"]');
    const cardEn = (await card.textContent()) ?? '';
    assert.match(cardEn, /Book 1 of 6/);
    assert.match(cardEn, /Bāla Kāṇḍa · Book of Youth/);
    assert.match(cardEn, /Begin ▶/);
    assert.ok(!DEVA.test(cardEn), `English chapter card has no Devanagari: ${cardEn}`);
    assert.equal(await card.locator('[data-testid="ui-en"]').count(), 0);

    // New journey: picking संस्कृतम् turns this very screen into Sanskrit; the default name shows as शिष्यः / शिष्या
    await reloadToTitle(g);
    await toNewJourney(g);
    await g.tap('dlang-sa');
    await g.waitForState("s => s.dialogueLang === 'sa'");
    await expectNoLatin(g, 'new journey');
    const nameInput = g.page.locator('[data-testid="name-input"]');
    assert.equal(await nameInput.inputValue(), 'शिष्यः');
    await g.tap('avatar-b');
    assert.equal(await nameInput.inputValue(), 'शिष्या');
    await g.tap('avatar-a');
    // the chapter card
    await toChapterCard(g);
    await expectNoLatin(g, 'chapter card');
    const eyebrow = (await g.page.locator('[data-testid="titlecard-book"]').textContent()) ?? '';
    assert.match(eyebrow, DEVA, `the chapter eyebrow is Sanskrit: ${eyebrow}`);
    assert.match((await g.page.locator('[data-testid="titlecard-sa"]').textContent()) ?? '', /बालकाण्डम्/);

    // title screen with a saved journey, explore HUD and every menu tab
    await reloadWith(g, uiCalm.save, 'sa');
    await expectNoLatin(g, 'title screen (Continue)');
    await continueToExplore(g);
    await expectNoLatin(g, 'explore HUD');
    await g.tap('btn-menu');
    await g.page.locator('[data-testid="menu"]').waitFor();
    for (const tab of ['party', 'words', 'verses', 'items', 'settings']) {
      await g.tap(`tab-${tab}`);
      await expectNoLatin(g, `menu: ${tab}`);
      if (tab === 'party' && (await g.page.locator('[data-testid^="edit-moves-"]').count())) {
        await g.page.locator('[data-testid^="edit-moves-"]').first().click();
        await expectNoLatin(g, 'menu: party, move editor');
        await g.tap('equip-cancel');
      }
      if (tab === 'items' && (await g.page.locator('[data-testid^="use-"]').count())) {
        await g.page.locator('[data-testid^="use-"]').first().click();
        await g.page.locator('[data-testid="item-target"]').waitFor();
        await expectNoLatin(g, 'menu: items, use on whom');
        await g.tap('use-cancel');
      }
    }
    await g.tap('menu-rest');
    await expectNoLatin(g, 'menu: end session');
    await g.tap('sheet-close');
    await g.page.locator('[data-testid="menu"]').waitFor({ state: 'detached' });

    // a shop (the keeper's lines first) and a shrine with its recital list
    await reloadWith(g, uiShop, 'sa');
    await continueToExplore(g);
    await interactUntil(g, 'shop', () => expectNoLatin(g, 'dialogue box'));
    await g.page.locator('[data-testid="panel-shop"]').waitFor();
    await expectNoLatin(g, 'shop');
    await reloadWith(g, uiShrine, 'sa');
    await continueToExplore(g);
    await interactUntil(g, 'shrine');
    await expectNoLatin(g, 'shrine');
    await g.tap('shrine-recite');
    await g.page.locator('[data-testid="panel-recite"]').waitFor();
    await expectNoLatin(g, 'shrine: recite');

    // संस्कृतम् + English: the Sanskrit comes with small English glosses
    await reloadWith(g, uiShrine, 'sa-en');
    await continueToExplore(g);
    await interactUntil(g, 'shrine');
    const shrine = g.page.locator('[data-testid="panel-shrine"]');
    assert.match((await shrine.textContent()) ?? '', DEVA);
    const gloss = shrine.locator('[data-testid="ui-en"]');
    assert.ok((await gloss.count()) > 0, 'sa-en shows English glosses');
    assert.match((await gloss.first().textContent()) ?? '', /Hermitage shrine/);
    assert.ok(await gloss.first().isVisible());
    await expectNoOverflow(g);

    // English: the shop is exactly the old English
    await reloadWith(g, uiShop, 'en');
    await continueToExplore(g);
    await interactUntil(g, 'shop');
    const shop = g.page.locator('[data-testid="panel-shop"]');
    await shop.waitFor();
    const shopEn = (await shop.textContent()) ?? '';
    assert.match(shopEn, /Market stall/);
    assert.match(shopEn, /owned \d+/);
    assert.match(shopEn, /Leave/);
    assert.match((await shop.locator('[data-testid="purse"]').textContent()) ?? '', /◈ \d+/);
    assert.equal(await shop.locator('[data-testid="ui-en"]').count(), 0);
    g.expectClean();
    await g.close();
  });

  // ───────── Sanskrit interface, area B: battle, challenges, feedback, verse and word cards ─────────
  test('संस्कृतम् mode: intro, verse card, word card, tutorial duel, challenges and feedback show no Latin letters', { timeout: 240_000 }, async () => {
    const g = await open({ seed: 7, viewport: { width: 390, height: 844 } });
    await g.page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ dialogueLang: 'sa' })), PREFS);
    await reloadToTitle(g);
    await startJourney(g);
    const seen = new Set<string>();
    let verseSeen = false;
    let feedbackSeen = false;
    const bot = new Bot(g, {
      onStep: async (s) => {
        const kind = `${s.pending}${s.battle ? ':battle' : ''}`;
        if (seen.has(kind)) return;
        seen.add(kind);
        await g.page.waitForTimeout(400); // typewriter / transitions settle (Latin never appears mid-way either)
        await expectNoLatin(g, `pending ${kind}`);
      },
      onVerse: async () => {
        if (verseSeen) return;
        verseSeen = true;
        const card = g.page.locator('[data-testid="shloka-card"]');
        await card.waitFor();
        await expectNoLatin(g, 'verse card');
        await card.locator('[data-testid="pada-btn-0"]').click();
        await card.locator('[data-testid="vw-0"]').click();
        await g.page.locator('[data-testid="verse-word"]').waitFor();
        await expectNoLatin(g, 'verse card: a word of pada 1 (grammar in Sanskrit)');
      },
      wrongOnce: async () => {
        feedbackSeen = true;
        await expectNoLatin(g, 'feedback after a wrong answer');
      },
    });
    let duelSeen = false;
    await bot.playUntil((st) => {
      if (st.battle?.kind === 'duel') duelSeen = true;
      return duelSeen && st.phase === 'explore' && !st.pending;
    });
    assert.ok(verseSeen, 'a verse card was shown');
    assert.ok(feedbackSeen, 'a wrong-answer feedback was shown');
    assert.ok([...seen].some((k) => k.endsWith(':battle')), `battle screens were swept: ${[...seen].join(', ')}`);
    // the word book and verse book, and a word card from the word book
    await g.tap('btn-menu');
    await g.page.locator('[data-testid="menu"]').waitFor();
    await g.tap('tab-words');
    await g.page.locator('[data-testid="padakosha"]').waitFor();
    await expectNoLatin(g, 'word book');
    await g.tap('tab-verses');
    await g.page.locator('[data-testid="shlokakosha"]').waitFor();
    await expectNoLatin(g, 'verse book');
    g.expectClean();
    await g.close();
  });

  // ───────── Kathā (v0.4): journey picker, verse moment, recitation panel, auto narration (kc-view) ─────────
  /** The recitation panel's layout facts: chip heights and bottoms, line font size, wrapping, viewport height. */
  async function castLayout(g: GameSession): Promise<{ chips: { h: number; bottom: number; w: number }[]; fs: number; wrap: boolean; vh: number; vw: number; lineRight: number; lineLeft: number; rows: number }> {
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
  async function expectCastLayout(g: GameSession, where: string): Promise<void> {
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
  function kathaFrom(save: ReturnType<typeof toSave>, lvl: number, first?: string): ReturnType<typeof toSave> {
    const smrti: Record<string, { level: number; streak: number }> = {};
    for (const id of Object.keys(save.shlokas)) CONTENT.shlokas.find((x) => x.id === id)?.padas.forEach((_, p) => (smrti[`${id}:${p}`] = { level: lvl, streak: 0 }));
    const party = save.party.map((m, i) => {
      if (i !== 0 || !first) return m;
      const mv = CONTENT.moves.find((x) => x.id === first);
      return { ...m, moves: [first, ...m.moves.filter((x) => x !== first)].slice(0, 4), pp: { ...m.pp, [first]: Math.max(m.pp[first] ?? 0, mv?.pp ?? 10, 12) } };
    });
    return { ...save, style: 'katha', flags: { ...save.flags, 'style.katha': true }, smrti, party };
  }
  // the player alone, so the player leads the battle (non-duel battles are led by the first hero who is not the player)
  const tatakaPlan = planAt(CONTENT, 1, 'tataka_vana', 8, ['player']);
  const kathaBoss = tatakaPlan && CONTENT.moves.some((m) => m.id === 'shoka_shloka') ? kathaFrom(tatakaPlan.save, 1, 'shoka_shloka') : null;
  const kathaCalm = uiCalm ? kathaFrom(uiCalm.save, 1) : null;
  const kathaShrine = uiShrine ? kathaFrom(uiShrine, 1) : null;
  const kathaVerse = (id: string | null | undefined): { anvaya: string[]; saralarthah: string } | undefined => CONTENT.katha?.verses.find((v) => v.shlokaId === id);

  test('Kathā in संस्कृतम्: New journey picks कथा → verse moments → the tutorial duel recited → the first shrine recital; no Latin anywhere', { timeout: 300_000 }, async () => {
    const g = await open({ seed: 7, viewport: { width: 390, height: 844 } });
    await toNewJourney(g);
    // English story text defaults to the practice game; संस्कृतम् defaults to कथा (and offers automatic recitation)
    assert.equal(await g.page.locator('[data-testid="journey-abhyasa"]').getAttribute('aria-checked'), 'true', 'English: अभ्यासः by default');
    assert.equal(await g.page.locator('[data-testid="toggle-auto-recite"]').count(), 0, 'no recitation toggle for the practice game');
    await g.tap('dlang-sa');
    await g.waitForState("s => s.dialogueLang === 'sa'");
    assert.equal(await g.page.locator('[data-testid="journey-katha"]').getAttribute('aria-checked'), 'true', 'संस्कृतम्: कथा by default');
    assert.match((await g.page.locator('[data-testid="journey-note"]').textContent()) ?? '', DEVA, 'a short line says what कथा means');
    assert.ok(await g.page.locator('[data-testid="toggle-auto-recite"]').isVisible(), 'automatic recitation is offered for कथा');
    await expectNoLatin(g, 'new journey (कथा)');
    await g.tap('start-journey');
    await g.waitForState("s => s.screen === 'game' && s.style === 'katha'");
    assert.ok((await g.state<Snap>()).flags.includes('style.katha'), 'the Kathā flag is set');

    const seen = new Set<string>();
    const casts: { context: string; gap: boolean; how: string; level: number }[] = [];
    let vmChecked = false;
    let recitalChecked = false;
    // v0.4.1: a Kathā duel has no command menu and no move choice; each player turn opens the recitation directly
    const duelMenus: string[] = [];
    let duelRecitations = 0;
    const bot = new Bot(g, {
      onStep: async (s) => {
        if (s.battle?.kind === 'duel' && s.heard.length > 0 && s.battle.beats === 0 && ['command', 'pick-move'].includes(s.battle.phase)) duelMenus.push(`${s.battle.phase} (turn of ${s.battle.foe})`);
        if (s.battle?.kind === 'duel' && s.challenge?.kind === 'smarana') {
          duelRecitations += 1;
          await g.page.locator('[data-testid="recite-cast"]').waitFor();
          assert.ok(await g.page.locator('[data-testid="recite-duel"]').isVisible(), 'a duel turn names no astra: it is a recitation');
          // the screen-reader line is Sanskrit through and through: no Latin letter, not even a full stop
          const live = (await g.page.locator('[data-testid="recite-live"]').textContent()) ?? '';
          assert.ok(!/[A-Za-z.]/.test(live), `screen-reader text in संस्कृतम्: ${live}`);
          assert.equal(await g.page.locator('[data-testid="katha-cmd"], [data-testid="cmd-fight"]').count(), 0, 'no command menu in a Kathā duel');
        }
        const kind = `${s.pending}${s.battle ? `:battle:${s.battle.phase}` : ''}${s.challenge ? `:${s.challenge.kind}:${s.challenge.context}` : ''}`;
        if (seen.has(kind)) return;
        seen.add(kind);
        await g.page.waitForTimeout(300);
        await expectNoLatin(g, `pending ${kind}`);
      },
      onVerse: async (s) => {
        if (vmChecked) return;
        const vm = g.page.locator('[data-testid="panel-verse-moment"]');
        await vm.waitFor();
        assert.equal(await g.page.locator('[data-testid="shloka-card"]').count(), 0, 'Kathā shows the verse moment, not the verse card');
        await g.page.waitForSelector('[data-testid="panel-verse-moment"][data-phase="done"]');
        assert.match((await g.page.locator('[data-testid="vm-verse"]').textContent()) ?? '', DEVA, 'the printed verse');
        const sh = CONTENT.shlokas.find((x) => x.id === s.shloka);
        const kv = kathaVerse(s.shloka);
        assert.ok(sh && kv, `content/katha.json has the anvaya and सरलार्थः of ${s.shloka}`);
        // unfolded: the words in prose order, then the सरलार्थः
        const anvaya = g.page.locator('[data-testid="vm-anvaya"]');
        assert.ok(await anvaya.isVisible(), 'the anvaya is shown');
        assert.equal(await anvaya.locator('[data-testid^="vm-word-"]').count(), kv.anvaya.length, 'every anvaya word is shown');
        const sarala = (await g.page.locator('[data-testid="vm-sarala"]').textContent()) ?? '';
        assert.match(sarala, DEVA, 'the सरलार्थः is shown');
        await expectNoLatin(g, 'verse moment (अन्वयः + सरलार्थः)');
        // the tabs revisit पदच्छेदः · सरलार्थः; संस्कृतम् has no English tab
        assert.equal(await g.page.locator('[data-testid="vm-tab-en"]').count(), 0, 'no English tab in संस्कृतम्');
        await g.tap('vm-tab-pada');
        assert.equal(await g.page.locator('[data-testid="vm-pada"] [data-testid^="vm-word-"]').count(), sh.words.length, 'पदच्छेदः: every word of the verse');
        await expectNoLatin(g, 'verse moment (पदच्छेदः)');
        await g.tap('vm-tab-sarala');
        await g.page.locator('[data-testid="vm-sarala"]').waitFor();
        // a word opens its word card
        await g.tap('vm-tab-anvaya');
        await anvaya.locator('button[data-testid^="vm-word-w"]').first().click();
        await g.page.locator('[data-testid="detail-sheet"] [data-testid="word-card"]').waitFor();
        await g.tap('sheet-close');
        await g.page.locator('[data-testid="detail-sheet"]').waitFor({ state: 'detached' });
        vmChecked = true;
      },
      castInput: () => (casts.filter((c) => c.gap).length % 2 ? 'tap' : 'key'),
      onCast: async (s) => {
        const ctxName = s.challenge?.context ?? '';
        // the line never shows English; focus sits on the chip group (not on a chip); one announcement
        await expectCastLayout(g, `cast (${ctxName})`);
        assert.equal(await g.page.evaluate(() => document.activeElement?.getAttribute('data-testid')), 'recite-chips', 'focus moves to the chip group');
        assert.match((await g.page.locator('[data-testid="recite-live"]').textContent()) ?? '', DEVA, 'the polite announcement is Sanskrit');
        if (ctxName === 'recite' && !recitalChecked) {
          recitalChecked = true;
          assert.ok(await g.page.locator('[data-testid="recite-dots"]').isVisible(), 'the recital shows progress dots');
          assert.equal(await g.page.locator('[data-testid="recite-dots"] i').count(), s.challenge?.steps ?? 4, 'one dot per pāda');
        }
        if (!seen.has(`chips:${ctxName}`)) {
          seen.add(`chips:${ctxName}`);
          await expectNoLatin(g, `recitation chips (${ctxName})`);
        }
      },
      afterCast: async (s, picked) => {
        const sm = s.challenge?.smarana;
        casts.push({ context: s.challenge?.context ?? '', gap: !!picked, how: picked ? (casts.filter((c) => c.gap).length % 2 ? 'tap' : 'key') : '-', level: sm?.level ?? -1 });
      },
    });
    await bot.playUntil((s) => s.flags.includes('ch1.restored_ma_nishada') && s.phase === 'explore' && !s.pending, 1200);
    assert.ok(vmChecked, 'a verse moment was checked');
    const duel = casts.filter((c) => c.context === 'battle');
    const recital = casts.filter((c) => c.context === 'recite');
    assert.ok(duel.length > 0, `the duel was fought with recitations: ${JSON.stringify(casts)}`);
    assert.equal(recital.length, 4, `the shrine recital is four pādas: ${JSON.stringify(recital)}`);
    assert.ok(recital.every((c) => c.gap), 'every recital pāda has one gap');
    assert.ok(casts.some((c) => c.how === 'key') && casts.some((c) => c.how === 'tap'), 'gaps were picked with keys and with taps');
    assert.ok((await bot.snap()).restored.includes('s-ma-nishada'), 'the verse was restored');
    assert.ok([...seen].some((k) => k.includes(':battle:')), `battle screens were swept: ${[...seen].join(', ')}`);
    assert.deepEqual(duelMenus, [], 'every duel turn went straight to the recitation');
    assert.ok(duelRecitations > 0, 'the duel was fought with recitations only');
    // the session result reports verses heard / recited / restored, never a quiz score with ✗ (v0.5a: a reader of
    // संस्कृतम् gets these game-provided rows in Sanskrit)
    await g.tap('btn-menu');
    await g.page.locator('[data-testid="menu"]').waitFor();
    await g.tap('menu-rest');
    await g.tap('menu-rest-confirm');
    const rec = (await g.expectResult()) as Awaited<ReturnType<GameSession['expectResult']>> & { result: { summary?: string; review?: { sa: string; correct: boolean; note?: string }[] } };
    const summary = rec.result.summary ?? '';
    const saParts = summary.split(' · ');
    assert.equal(saParts.length, 4, `Kathā result summary: book · heard · recited · restored: ${summary}`);
    assert.ok(saParts[1]?.startsWith(uiSa(CONTENT, 'bookEnd.resultHeard', { n: 0 })?.replace(/\s*०$/, '') ?? '?') && saParts[2]?.startsWith(uiSa(CONTENT, 'bookEnd.resultRecited', { n: 0 })?.replace(/\s*०$/, '') ?? '?') && saParts[3]?.startsWith(uiSa(CONTENT, 'bookEnd.resultRestored', { n: 0 })?.replace(/\s*०$/, '') ?? '?'), `Kathā result summary in Sanskrit: ${summary}`);
    assert.ok(!LATIN.test(summary), `no Latin in the summary: ${summary}`);
    assert.equal(rec.result.share, summary);
    assert.ok((rec.result.review ?? []).length > 0 && (rec.result.review ?? []).every((r) => r.correct), 'the review lists the verses met, none marked wrong');
    assert.ok((rec.result.review ?? []).some((r) => (r.note ?? '').includes(uiSa(CONTENT, 'verses.restored') ?? '?')), 'the restored verse says so (पूर्णः)');
    assert.equal(await g.page.locator('.app-result__review li.is-bad').count(), 0, 'no ✗ on the result screen');
    g.expectClean();
    await g.close();
  });

  test('Kathā tutorial duel in संस्कृतम् at 390×844 (v0.4.3): learn the new verse by heart — every beat waits for a tap; Bharadvāja says each line in full; the coach and the caption show; a tap on the right chip completes the line; afterwards the goal is Vālmīki; no Latin', { timeout: 300_000 }, async () => {
    const g = await open({ seed: 7, viewport: { width: 390, height: 844 } });
    await toNewJourney(g);
    await g.tap('dlang-sa');
    await g.waitForState("s => s.dialogueLang === 'sa'");
    await g.tap('start-journey');
    await g.waitForState("s => s.screen === 'game' && s.style === 'katha'");
    // RY_SHOTS=<dir>: screenshots of the four moments the owner asked about
    const shot = async (name: string): Promise<void> => {
      if (process.env['RY_SHOTS']) await g.page.screenshot({ path: `${process.env['RY_SHOTS']}/${name}.png` });
    };
    const PRE = 'I say a line, and you say it after me. Where a word is missing, tap the right one.';
    const POST = 'Now the verse lives in two memories. Let us tell the guru.';
    const padas = CONTENT.shlokas.find((x) => x.id === 's-ma-nishada')?.padas ?? [];
    // the letters only: spaces and the recitation line's laghu / guru marks (˘ —) left out
    const bare = (t: string): string => t.replace(/[\s˘—]+/g, '');
    const swept = new Set<string>();
    const bot = new Bot(g, {
      onStep: async (s) => {
        const kind = `${s.pending}${s.battle ? `:battle:${s.battle.phase}` : ''}${s.challenge ? `:${s.challenge.kind}` : ''}`;
        if (swept.has(kind)) return;
        swept.add(kind);
        await expectNoLatin(g, `tutorial: ${kind}`);
      },
    });
    // the reason for the duel, in Bharadvāja's words (Kathā wording; the practice game keeps the debate)
    await bot.playUntil((s) => s.pending === 'say' && s.say === PRE, 600);
    await g.page.waitForTimeout(2500); // the typewriter finishes the line
    assert.match((await g.page.locator('[data-testid="say-text"]').textContent()) ?? '', /अनुवद/, 'he says it: I say a line, you say it after me');
    await expectNoLatin(g, 'the pre-duel line');
    await shot('1-pre-duel');
    const s0 = await bot.playUntil((s) => !!s.battle && s.battle.kind === 'duel' && s.battle.beats > 0, 40);
    const panel = g.page.locator('[data-testid="battle-panel"]');
    await panel.waitFor();
    assert.equal(await panel.getAttribute('data-tutorial'), 'true', 'the first story fight is the tutorial');
    assert.match((await g.page.locator('[data-testid="battle-names"]').textContent()) ?? '', /पाठः/, 'a lesson, not a debate');
    /** Nothing advances by itself: the same beat is still there after `ms`. Then one tap (two while it types) moves on. */
    const holds = async (ms: number, where: string): Promise<void> => {
      const a = await g.state<Snap>();
      const text = await g.page.locator('[data-testid="beat-text"]').textContent();
      assert.equal(await g.page.locator('[data-testid="battle-beat"]').getAttribute('data-auto'), null, `${where}: not an auto beat`);
      await g.page.waitForTimeout(ms);
      const b = await g.state<Snap>();
      assert.equal(b.seq, a.seq, `${where}: nothing advanced without a tap`);
      assert.equal(await g.page.locator('[data-testid="beat-text"]').textContent(), text, `${where}: the same beat`);
      for (let i = 0; i < 3 && (await g.state<Snap>()).seq === a.seq; i++) {
        await g.tap('advance');
        await g.page.waitForTimeout(150);
      }
      assert.ok((await g.state<Snap>()).seq > a.seq, `${where}: a tap moves on`);
    };
    assert.equal(s0.battle?.beats, 2, 'the opening line and the first model line');
    await holds(3500, 'the duel’s first beat');
    // Bharadvāja's model line: the first pāda printed in full, no gap, no input
    const model = g.page.locator('[data-testid="beat-model"]');
    await model.waitFor();
    assert.equal(bare((await g.page.locator('[data-testid="beat-model-line"]').textContent()) ?? ''), bare(padas[0] ?? '?'), 'the first pāda in full');
    assert.equal(await g.page.locator('[data-testid="recite-chips"]').count(), 0, 'nothing to pick on a model line');
    await g.page.waitForTimeout(1200);
    await expectNoLatin(g, 'Bharadvāja’s model line');
    await shot('2-model-line');
    await holds(2500, 'the model line');
    // the first recitation: the coach line and the caption, the gap and the chips pulse; one tap completes the line
    await g.waitForState("s => s.challenge && s.challenge.kind === 'smarana'");
    const s1 = await g.state<Snap>();
    const sm1 = s1.challenge?.smarana;
    assert.ok(sm1 && sm1.gaps.length === 1 && sm1.pada === 0, `the first pāda, one gap: ${JSON.stringify(sm1)}`);
    const cast = g.page.locator('[data-testid="recite-cast"]');
    await cast.waitFor();
    assert.equal(await cast.getAttribute('data-coach'), 'true');
    assert.equal(((await g.page.locator('[data-testid="recite-coach"]').textContent()) ?? '').trim(), uiSa(CONTENT, 'katha.coach'), 'the coach line');
    assert.equal(((await g.page.locator('[data-testid="recite-caption"]').textContent()) ?? '').trim(), uiSa(CONTENT, 'katha.recallCap'), 'the caption shows in संस्कृतम् too');
    await g.page.locator('[data-testid="recite-chips"][data-armed="true"]').waitFor({ timeout: 8000 });
    const pulse = await g.page.evaluate(() => ({
      chip: getComputedStyle(document.querySelector('[data-testid^="recite-opt-"]')!).animationName,
      gap: getComputedStyle(document.querySelector('[data-testid="recite-gap"] .g-ramayana-yatra__cast-box')!).animationName,
    }));
    assert.deepEqual(pulse, { chip: 'g-ramayana-yatra-chip-pulse', gap: 'g-ramayana-yatra-gap-pulse' }, 'the gap and the chips pulse until the first tap');
    await expectNoLatin(g, 'the first recitation (coach + caption)');
    await shot('3-first-recitation');
    const right = sm1.answers[0]!;
    await g.tap(`recite-opt-${right}`);
    await g.page.locator('[data-testid="recite-cast"][data-correct="true"]').waitFor();
    assert.equal(await g.page.locator('[data-testid="recite-gap"]').getAttribute('data-state'), 'filled', 'the right word fills the gap');
    assert.equal(await cast.getAttribute('class').then((c) => /is-coach/.test(c ?? '')), false, 'the pulse stops at the first tap');
    await g.page.waitForSelector('[data-testid="recite-cast"][data-phase="complete"]');
    assert.equal(bare((await g.page.locator('[data-testid="recite-line"]').textContent()) ?? ''), bare(padas[0] ?? '?'), 'the line is complete');
    await g.waitForState(`s => s.seq > ${s1.seq} && (!s.challenge || s.challenge.kind !== 'smarana')`);
    // the line is said back (one beat, with the hit); then Bharadvāja says the next line — each waits for a tap
    await g.page.locator('[data-testid="battle-beat"]').waitFor();
    await holds(2500, 'the line said back');
    await model.waitFor();
    assert.equal(await model.getAttribute('data-pada'), '1', 'Bharadvāja says the next line');
    assert.equal(bare((await g.page.locator('[data-testid="beat-model-line"]').textContent()) ?? ''), bare(padas[1] ?? '?'));
    // the rest of the lesson, then the line that ties it to the story
    const end = await bot.playUntil((s) => s.pending === 'say' && s.say === POST, 200);
    assert.equal(end.party.find((m) => m.id === 'player')?.hp, end.party.find((m) => m.id === 'player')?.maxHp, 'Bharadvāja never strikes');
    await g.page.waitForTimeout(2500);
    assert.match((await g.page.locator('[data-testid="say-text"]').textContent()) ?? '', /गुरवे वदाम/, 'let us tell the guru');
    await expectNoLatin(g, 'the post-duel line');
    await shot('4-post-duel');
    const after = await bot.playUntil((s) => s.flags.includes('ch1.duel_done') && s.phase === 'explore' && !s.pending, 80);
    assert.ok(after.flags.includes('ch1.duel_won'), 'the lesson was won');
    assert.equal(after.objective, 'Return to the hermitage and talk to Valmiki at the shrine.');
    assert.deepEqual(after.next?.action, { talk: 'valmiki' }, 'the next goal is Vālmīki');
    if (after.guide) assert.deepEqual(CONTENT.walkthrough[after.guide.step]?.action, { talk: 'valmiki' }, 'the pointer leads to Vālmīki');
    await expectNoLatin(g, 'after the duel');
    assert.ok([...swept].some((k) => k.includes(':battle:')), `battle screens were swept: ${[...swept].join(', ')}`);
    g.expectClean();
    await g.close();
  });

  test('Kathā boss (Tāṭakā) in संस्कृतम्: one-tap moves — a tap casts a plain move, a key casts the astra; switch / items / run are secondary; no Latin; taps counted', { skip: kathaBoss ? false : 'needs Tāṭakā (tataka_vana) and the astra shoka_shloka', timeout: 300_000 }, async () => {
    assert.ok(kathaBoss);
    const g = await open({ seed: 41, viewport: { width: 390, height: 844 } });
    await reloadWith(g, kathaBoss, 'sa');
    await continueToExplore(g);
    const toCommand = async (bot: Bot): Promise<Snap> => {
      const s = await bot.playUntil((x) => !!x.battle && x.battle.phase === 'command' && x.battle.beats === 0, 300);
      await g.page.locator('[data-testid="katha-cmd"][data-armed="true"]').waitFor();
      return s;
    };
    const s0 = await toCommand(new Bot(g, { noHurry: true }));
    const panel = g.page.locator('[data-testid="katha-cmd"]');
    const moves = s0.battle?.moves ?? [];
    assert.ok(moves.includes('shoka_shloka') && moves.length >= 2, `the hero's moves: ${moves.join(', ')}`);
    assert.equal(await g.page.locator('[data-testid="cmd-fight"]').count(), 0, 'no Fight button: the moves are the menu');
    assert.equal(await panel.locator('[data-testid^="move-"]').count(), moves.length, 'every equipped move is listed');
    assert.ok(await panel.locator('[data-testid="astra-shoka_shloka"]').isVisible(), 'the bound astra is tagged श्लोकः');
    for (const id of moves) assert.match((await panel.locator(`[data-testid="move-${id}"]`).textContent()) ?? '', /उत्साहः\s*[०-९]+\/[०-९]+/, `PP shown on ${id}`);
    for (const id of ['cmd-switch', 'cmd-item', 'cmd-run']) assert.equal(await panel.locator(`[data-testid="${id}"]`).count(), 1, `secondary ${id}`);
    await expectNoLatin(g, 'Kathā command panel (boss)');
    // a tap on a plain move casts it at once: no move list, no question
    const plain = moves.find((id) => id !== 'shoka_shloka' && !CONTENT.katha?.astras.some((a) => a.moveId === id) && (POWER.get(id) ?? 0) > 0);
    assert.ok(plain, 'a plain damaging move');
    await panel.locator(`[data-testid="move-${plain}"]`).click();
    await g.waitForState(`s => s.seq > ${s0.seq} && s.battle && s.battle.phase !== 'command'`);
    const s1 = await g.state<Snap>();
    assert.equal(s1.battle?.phase, 'beats', 'one tap: the turn resolves');
    assert.notEqual(s1.pending, 'challenge', 'a plain move asks nothing');
    assert.ok((s1.battle?.foeHp ?? 0) < (s0.battle?.foeHp ?? 0), 'the plain move landed');
    // the next turn: key n casts the astra (the recitation opens)
    const s2 = await toCommand(new Bot(g, { noHurry: true }));
    await g.page.keyboard.press(String((s2.battle?.moves ?? []).indexOf('shoka_shloka') + 1));
    await g.waitForState("s => s.pending === 'challenge' && s.challenge && s.challenge.kind === 'smarana' && s.challenge.context === 'battle'");
    // the rest of the fight: count every input a player makes (beats advance by themselves)
    let turns = 2;
    let chipTaps = 0;
    let menuSeen = 0;
    let n = 0;
    const bot = new Bot(g, {
      noHurry: true,
      pickMove: (_s, usable) => (n % 2 === 0 && usable.includes('shoka_shloka') ? 'shoka_shloka' : usable.find((id) => id === plain) ?? undefined),
      moveInput: () => (n % 3 === 0 ? 'key' : 'tap'),
      onStep: async (s) => {
        if (s.battle?.phase === 'command' && s.battle.beats === 0) {
          turns += 1;
          n += 1;
        }
        if (s.battle && ['pick-move'].includes(s.battle.phase)) menuSeen += 1;
      },
      afterCast: async (_s, picked) => {
        if (picked) chipTaps += 1;
      },
    });
    const end = await bot.playUntil((s) => !s.battle || ['won', 'lost'].includes(s.battle.phase), 600);
    assert.equal(menuSeen, 0, 'the practice move list never appears in Kathā');
    assert.ok(!end.battle || end.battle.phase === 'won' || end.flags.includes('ch1.tataka_defeated'), `Tāṭakā is defeated: ${JSON.stringify(end.battle)}`);
    console.log(`Kathā boss (Tāṭakā): ${turns} player turns = ${turns} move taps + ${chipTaps} recitation taps; no other menu taps`);
    assert.ok(turns <= 16, `a Kathā boss is a short fight (${turns} turns)`);
    g.expectClean();
    await g.close();
  });

  // ───────── v0.5a (fx-strat): Kathā battle tactics — affinities, a warned blow and its answer, fatigue, the fitting astra ─────────
  const yajnaPlan = planAt(CONTENT, 1, 'siddhashrama', 8, ['player', 'rama', 'lakshmana']);
  const kathaYajna = yajnaPlan ? kathaFrom(yajnaPlan.save, 1) : null;
  const tacticsSkip = kathaYajna && CONTENT.katha?.tactics?.fits.some((f) => f.foe === 'maricha') ? false : 'needs the chapter 1 finale (siddhashrama) and katha.json tactics';
  test('Kathā tactics (v0.5a) in संस्कृतम् at 390×844: Subāhu and Mārīca — each foe card shows its fitting astra; the opening warning line; Lakṣmaṇa’s cover blunts the blow; a repeated astra is tired; the fitting astras decide with their story beats; no Latin', { skip: tacticsSkip, timeout: 300_000 }, async () => {
    assert.ok(kathaYajna);
    const g = await open({ seed: 23, viewport: { width: 390, height: 844 } });
    await reloadWith(g, kathaYajna, 'sa');
    await continueToExplore(g);
    const beatOf = (tactic: string): ReturnType<Page['locator']> => g.page.locator(`[data-testid="battle-beat"][data-tactic="${tactic}"]`);
    const toCommand = async (): Promise<Snap> => {
      await g.waitForState("s => !!s.battle && s.battle.phase === 'command' && s.battle.beats === 0", 60_000);
      await g.page.locator('[data-testid="katha-cmd"][data-armed="true"]').waitFor();
      return g.state<Snap>();
    };
    // walk the story to the last night's battle (narration advances by itself in battle)
    await new Bot(g, { noHurry: true }).playUntil((s) => !!s.battle, 400);
    // 1. the opening: Subāhu readies a rain of blood on the sacrifice (Bāla 1.30.12) — one short Sanskrit line
    const warn = beatOf('warn');
    await warn.waitFor({ timeout: 20_000 });
    const warnText = (await warn.locator('[data-testid="beat-text"]').textContent()) ?? '';
    assert.ok(DEVA.test(warnText) && !LATIN.test(warnText), `the warning is Sanskrit: ${warnText}`);
    await g.page.waitForFunction(() => (document.querySelector('[data-testid="battle-beat"][data-tactic="warn"] [data-testid="beat-text"]')?.textContent ?? '').includes('करिष्यति'), undefined, { timeout: 15_000 });
    await shot(g, 'tactics-1-warning');
    await expectNoLatin(g, 'the warning beat');
    const s0 = await toCommand();
    assert.equal(s0.battle?.foe, 'subahu');
    const moves0 = s0.battle?.moves ?? [];
    assert.ok(moves0.includes('agneyastra') && moves0.includes('manavastra'), `Rāma leads with Viśvāmitra's astras: ${moves0.join(', ')}`);
    // 2. the foe card: Subāhu's fitting astra is the Āgneya (Bāla 1.30.22), in Sanskrit
    const aff = g.page.locator('[data-testid="foe-affinity"]');
    assert.equal(await aff.getAttribute('data-affinity'), 'agneyastra');
    const affText = (await aff.textContent()) ?? '';
    assert.ok(affText.includes('उचितम्') && affText.includes(CONTENT.names.find((n) => n.id === 'move.agneyastra')?.sa ?? '?'), `the card names the fitting astra: ${affText}`);
    assert.equal(await g.page.locator('[data-testid="foe-warn"]').count(), 1, 'the card marks the readied blow');
    // the answers sit above the moves while the blow is readied: the verse shield and Lakṣmaṇa's cover (one tap each)
    const cover = g.page.locator('[data-testid="cmd-cover"]');
    assert.ok(await cover.isVisible() && (await g.page.locator('[data-testid="cmd-shield"]').isVisible()), 'the answers are offered');
    assert.match((await cover.textContent()) ?? '', /लक्ष्मणः/, 'Lakṣmaṇa covers');
    await shot(g, 'tactics-2-foe-card');
    await expectNoLatin(g, 'the command panel with a readied blow');
    // 3. answer: Lakṣmaṇa steps in with रक्षा — the blow lands softly (× 0.3 of a capped strike)
    await cover.click();
    await beatOf('blunt').waitFor({ timeout: 20_000 });
    const s1 = await toCommand();
    const lost = (s0.battle?.allyHp ?? 0) - (s1.battle?.allyHp ?? 0);
    assert.ok(lost >= 0 && lost <= Math.ceil((s0.battle?.allyMax ?? 0) * 0.45 * 0.3) + 1, `the answered blow is blunted (${lost} of ${s0.battle?.allyMax})`);
    assert.equal(await g.page.locator('[data-testid="cmd-cover"]').count(), 0, 'no answers once the blow is spent');
    // 4. fatigue: the same astra twice — its button says श्रान्तम् after the first cast
    await g.page.locator('[data-testid="move-vayavyastra"]').click();
    await toCommand();
    const tired = g.page.locator('[data-testid="tired-vayavyastra"]');
    assert.ok(await tired.isVisible(), 'the repeated astra is marked tired');
    assert.equal((await tired.textContent())?.trim(), uiSa(CONTENT, 'katha.tired'));
    assert.equal(await g.page.locator('[data-testid="tired-agneyastra"]').count(), 0, 'only the astra just cast');
    await shot(g, 'tactics-3-tired');
    await expectNoLatin(g, 'a tired astra');
    // 5. the fitting astra: the Āgneya fells Subāhu (a story beat), then the Mānava hurls Mārīca into the ocean
    await g.page.locator('[data-testid="move-agneyastra"]').click();
    await beatOf('fit').waitFor({ timeout: 20_000 });
    const s2 = await toCommand();
    assert.equal(s2.battle?.foe, 'maricha', 'Subāhu is down at once; Mārīca steps forward');
    assert.equal(await g.page.locator('[data-testid="foe-affinity"]').getAttribute('data-affinity'), 'manavastra');
    await g.page.locator('[data-testid="move-manavastra"]').click();
    const fit = beatOf('fit');
    await fit.waitFor({ timeout: 20_000 });
    await g.page.waitForFunction(() => (document.querySelector('[data-testid="battle-beat"][data-tactic="fit"] [data-testid="beat-text"]')?.textContent ?? '').includes('जीवति'), undefined, { timeout: 20_000 });
    const fitText = (await fit.locator('[data-testid="beat-text"]').textContent()) ?? '';
    assert.ok(fitText.includes('सागरे') && !LATIN.test(fitText), `the Mānava beat: ${fitText}`);
    await shot(g, 'tactics-4-manava-beat');
    await expectNoLatin(g, 'the Mānava beat');
    const end = await new Bot(g, { noHurry: true }).playUntil((s) => !s.battle || s.battle.phase === 'won', 60);
    assert.ok(!end.battle || end.battle.phase === 'won', 'the sacrifice is safe');
    g.expectClean();
    await g.close();
  });

  test('Kathā tactics (v0.5a) at 360×640: with a blow readied, the answer row, every move and the secondary buttons fit on screen without scrolling; keys 8 / 9 answer', { skip: tacticsSkip, timeout: 240_000 }, async () => {
    assert.ok(kathaYajna);
    const g = await open({ seed: 29, viewport: { width: 360, height: 640 } });
    await reloadWith(g, kathaYajna, 'sa');
    await continueToExplore(g);
    await new Bot(g, { noHurry: true }).playUntil((s) => !!s.battle && s.battle.phase === 'command' && s.battle.beats === 0, 400);
    await g.page.locator('[data-testid="katha-cmd"][data-armed="true"]').waitFor();
    const vp = g.page.viewportSize();
    const ids = ['cmd-shield', 'cmd-cover', 'cmd-switch', 'cmd-item', ...((await g.state<Snap>()).battle?.moves ?? []).map((m) => `move-${m}`)];
    for (const id of ids) {
      const box = await g.page.locator(`[data-testid="${id}"]`).boundingBox();
      assert.ok(box && vp && box.y >= 0 && box.y + box.height <= vp.height + 1 && box.x >= 0 && box.x + box.width <= vp.width + 1, `${id} on screen (${JSON.stringify(box)})`);
    }
    await expectNoLatin(g, 'the answer row at 360×640');
    await shot(g, 'tactics-5-answers-360');
    const s0 = await g.state<Snap>();
    await g.page.keyboard.press('9'); // Lakṣmaṇa's cover
    await g.waitForState(`s => s.seq > ${s0.seq} && s.battle && s.battle.phase !== 'command'`);
    await g.page.locator('[data-testid="battle-beat"][data-tactic="blunt"]').waitFor({ timeout: 20_000 });
    g.expectClean();
    await g.close();
  });

  const roadPlan = planAt(CONTENT, 1, 'siddhashrama_road', 8, ['player']);
  const kathaRoad = roadPlan ? kathaFrom(roadPlan.save, 1) : null;
  test('Kathā in संस्कृतम् + English: a Sambhāṣaṇa choice shows its replies in Sanskrit only; the prompt keeps its English', { skip: kathaRoad ? false : 'needs siddhashrama_road', timeout: 180_000 }, async () => {
    assert.ok(kathaRoad);
    const g = await open({ seed: 59, viewport: { width: 390, height: 844 } });
    await reloadWith(g, kathaRoad, 'sa-en');
    await continueToExplore(g);
    const bot = new Bot(g, { noHurry: true });
    await bot.playUntil((s) => s.pending === 'choice' && !!s.choice && s.choice.options > 1, 400);
    const panel = g.page.locator('[data-testid="panel-choice"]');
    await panel.waitFor();
    if (await panel.locator('[data-testid="choice-prompt"] [data-testid="story-sa"]').count()) assert.ok((await panel.locator('[data-testid="choice-prompt"] [data-testid="story-en"]').count()) > 0, 'the prompt keeps its English gloss');
    const options = panel.locator('[data-testid^="choice-"]:not([data-testid="choice-prompt"])');
    assert.ok((await options.count()) > 1, 'a choice with replies');
    for (let i = 0; i < (await options.count()); i++) {
      const o = options.nth(i);
      assert.equal(await o.locator('[data-testid="story-en"]').count(), 0, `reply ${i + 1} has no English (it would give the answer away)`);
      assert.match((await o.textContent()) ?? '', DEVA, `reply ${i + 1} is Sanskrit`);
    }
    await expectNoOverflow(g);
    g.expectClean();
    await g.close();
  });

  for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 800 }])
    test(`Kathā command panel at ${vp.width}×${vp.height}: every move and the secondary buttons on screen without scrolling; no Latin`, { skip: kathaBoss ? false : 'needs Tāṭakā', timeout: 120_000 }, async () => {
      assert.ok(kathaBoss);
      const g = await open({ seed: 53, viewport: vp });
      await reloadWith(g, kathaBoss, 'sa');
      await continueToExplore(g);
      // a desktop has no on-screen pad: walk with the keyboard there
      await new Bot(g, { keyboard: vp.width >= 600, noHurry: true }).playUntil((s) => !!s.battle && s.battle.phase === 'command' && s.battle.beats === 0, 300);
      await g.page.locator('[data-testid="katha-cmd"][data-armed="true"]').waitFor();
      const fit = await g.page.evaluate(() => {
        const panel = document.querySelector('[data-testid="katha-cmd"]') as HTMLElement;
        const [box, ...buttons] = [panel, ...panel.querySelectorAll('button')].map((el) => {
          const b = el.getBoundingClientRect();
          return { id: el.getAttribute('data-testid'), top: b.top, bottom: b.bottom, h: b.height };
        });
        return { scroll: panel.scrollHeight - panel.clientHeight, panel: box ?? { id: null, top: 0, bottom: 0, h: 0 }, buttons, vh: innerHeight };
      });
      assert.ok(fit.scroll <= 1, `the panel does not scroll (${fit.scroll} px more)`);
      for (const b of fit.buttons) {
        assert.ok(b.top >= fit.panel.top - 0.5 && b.bottom <= Math.min(fit.panel.bottom, fit.vh) + 0.5, `${b.id} is on screen: ${JSON.stringify(b)} in ${JSON.stringify(fit.panel)}`);
        assert.ok(b.h >= 40 - 0.5, `${b.id} is a comfortable target (${b.h} px)`);
      }
      await expectNoLatin(g, `Kathā command panel at ${vp.width}×${vp.height}`);
      g.expectClean();
      await g.close();
    });

  /**
   * A Kathā shrine save where Rāma (four plain moves equipped) has heard रामो विग्रहवान्धर्मः but not restored it: restoring
   * it equips the astra dharma_vigraha in place of a plain move (v0.4.1, logic toast "… in place of …").
   */
  const armShrine = ((): ReturnType<typeof toSave> | null => {
    const sv = kathaShrine;
    const verse = 's-ramo-vigrahavan';
    const plain = ['bana', 'agneyastra', 'varunastra', 'vayavyastra'];
    if (!sv || !CONTENT.shlokas.some((x) => x.id === verse) || !sv.party.some((m) => m.id === 'rama') || !plain.every((id) => CONTENT.moves.some((m) => m.id === id))) return null;
    const party = sv.party.map((m) => (m.id === 'rama' ? { ...m, level: 10, moves: plain, pp: Object.fromEntries(plain.map((id) => [id, CONTENT.moves.find((x) => x.id === id)?.pp ?? 10])) } : m));
    const smrti = { ...(sv.smrti ?? {}) };
    CONTENT.shlokas.find((x) => x.id === verse)?.padas.forEach((_, i) => (smrti[`${verse}:${i}`] = { level: 1, streak: 0 }));
    return { ...sv, party, smrti, shlokas: { ...sv.shlokas, [verse]: { heard: true, restored: false, best: 0 } }, flags: { ...sv.flags, 'katha.armed': true } };
  })();

  test('Kathā: restoring a verse equips its astra in place of a plain move — the toast says so; the party tab shows the Kathā move text; no Latin', { skip: armShrine ? false : 'needs a shrine and Rāma', timeout: 180_000 }, async () => {
    assert.ok(armShrine);
    const g = await open({ seed: 47, viewport: { width: 390, height: 844 } });
    await reloadWith(g, armShrine, 'sa');
    await continueToExplore(g);
    await interactUntil(g, 'shrine');
    await g.tap('shrine-recite');
    await g.page.locator('[data-testid="panel-recite"]').waitFor();
    await g.tap('recite-s-ramo-vigrahavan');
    let steps = 0;
    const bot = new Bot(g, {
      onCast: async () => {
        steps += 1;
      },
    });
    await bot.playUntil((s) => steps >= 4 && s.pending !== 'challenge' && s.restored.includes('s-ramo-vigrahavan'), 200);
    // two toasts in one step (verse restored, then the astra): they queue, so the second one shows too
    await g.waitForState('s => (s.toasts || []).some((t) => /in place of/.test(t))', 8000);
    const toast = g.page.locator('[data-testid="toast"]');
    await g.page.waitForFunction(() => /त्यक्त्वा/.test(document.querySelector('[data-testid="toast"]')?.textContent ?? ''), undefined, { timeout: 8000 });
    assert.ok(!LATIN.test((await toast.textContent()) ?? ''), 'the toast is Sanskrit in संस्कृतम्');
    // leave the shrine; the party tab: Rāma now carries the astra, tagged श्लोकः, with the Kathā wording of each move
    await g.waitForState("s => s.pending === 'shrine'");
    await g.tap('shrine-leave');
    await g.waitForState("s => s.phase === 'explore' && !s.pending");
    await g.tap('btn-menu');
    await g.page.locator('[data-testid="menu"]').waitFor();
    await g.tap('tab-party');
    const rama = g.page.locator('[data-testid="member-rama"]');
    await rama.locator('[data-testid="party-move-dharma_vigraha"]').waitFor();
    assert.equal(await rama.locator('[data-testid="party-move-bana"]').count(), 0, 'the weakest plain move gave way');
    assert.equal(await rama.locator('[data-testid^="party-move-"]').count(), 4, 'still four moves');
    assert.ok(await rama.locator('[data-testid="party-move-dharma_vigraha"] .g-ramayana-yatra__astra-tag').isVisible(), 'the astra is tagged श्लोकः');
    const want = CONTENT.katha?.moveText?.['dharma_vigraha'] ?? CONTENT.moves.find((m) => m.id === 'dharma_vigraha')?.description ?? '';
    const desc = (await rama.locator('[data-testid="party-move-dharma_vigraha"] .g-ramayana-yatra__move-desc').textContent()) ?? '';
    assert.ok(desc.length > 0 && DEVA.test(desc), `the move text is shown in Sanskrit (${desc}; English: ${want})`);
    await expectNoLatin(g, 'party tab (Kathā)');
    g.expectClean();
    await g.close();
  });

  for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 800 }])
    test(`New journey at ${vp.width}×${vp.height}: Begin / Back stay on screen without scrolling (every language, both journeys)`, { timeout: 120_000 }, async () => {
      const g = await open({ seed: 43, viewport: vp });
      await toNewJourney(g);
      for (const lang of ['en', 'sa-en', 'sa'] as const)
        for (const style of ['katha', 'abhyasa'] as const) {
          await g.tap(`dlang-${lang}`);
          await g.tap(`journey-${style}`);
          // measured with the form scrolled to its top, as it first appears
          await g.page.locator('[data-testid="new-journey-body"]').evaluate((el) => el.scrollTo(0, 0));
          for (const id of ['start-journey', 'new-back']) {
            const box = await g.page.locator(`[data-testid="${id}"]`).boundingBox();
            assert.ok(box && box.y >= 0 && box.y + box.height <= vp.height + 0.5, `${lang} ${style}: ${id} on screen (${JSON.stringify(box)} in ${vp.height})`);
            const hit = await g.page.evaluate(([tid, x, y]) => !!document.elementFromPoint(x as number, y as number)?.closest(`[data-testid="${tid}"]`), [id, box.x + box.width / 2, box.y + box.height / 2] as const);
            assert.ok(hit, `${lang} ${style}: nothing covers ${id}`);
          }
          if (lang === 'sa') await expectNoLatin(g, `new journey (${style}) at ${vp.width}×${vp.height}`);
        }
      assert.equal(await g.page.evaluate(() => document.scrollingElement?.scrollTop ?? 0), 0, 'the page itself never scrolled');
      g.expectClean();
      await g.close();
    });

  test('Kathā battle at 360×640: a recited astra — keyboard pick, a deliberate miss that still fires, a tap pick; input safety; no Latin', { skip: kathaBoss ? false : 'needs Tāṭakā (tataka_vana) and the astra shoka_shloka', timeout: 240_000 }, async () => {
    assert.ok(kathaBoss);
    const g = await open({ seed: 23, viewport: { width: 360, height: 640 } });
    await reloadWith(g, kathaBoss, 'sa');
    await continueToExplore(g);
    let n = 0;
    const order: ('key' | 'miss' | 'tap')[] = ['miss', 'key', 'tap'];
    const results: { how: string; foeBefore: number; foeAfter: number; ms: number }[] = [];
    const bot = new Bot(g, {
      pickMove: (_s, usable) => (usable.includes('shoka_shloka') ? 'shoka_shloka' : undefined),
      castInput: () => (order[n] === 'key' ? 'key' : 'tap'),
      castMiss: () => order[n] === 'miss',
      onCast: async (s) => {
        await expectCastLayout(g, `astra cast ${n + 1} at 360×640`);
        if (n === 0) {
          await expectNoLatin(g, 'astra cast');
          assert.match((await g.page.locator('[data-testid="recite-astra"]').textContent()) ?? '', DEVA, 'the astra is named');
          assert.equal(await g.page.locator('[data-testid="recite-cast"] [role="timer"], [data-testid="recite-cast"] .g-ramayana-yatra__timer').count(), 0, 'no visible timer');
        }
        void s;
      },
      afterCast: async (s, _picked, ms) => {
        const before = s.battle?.foeHp ?? 0;
        // the narration holds each beat at a reading pace (v0.4.3): hurry it with taps on ▶, as a player may
        const settled = (x: Snap): boolean => !x.battle || ['command', 'won', 'lost'].includes(x.battle.phase) || x.pending !== 'battle';
        for (let i = 0; i < 120 && !settled(await bot.snap()); i++) {
          await g.page.locator('[data-testid="battle-beat"] [data-testid="advance"]').first().click({ timeout: 300 }).catch(() => undefined);
          await g.page.waitForTimeout(150);
        }
        await g.waitForState("s => !s.battle || s.battle.phase === 'command' || s.battle.phase === 'won' || s.battle.phase === 'lost' || s.pending !== 'battle'", 20000);
        const after = (await bot.snap()).battle?.foeHp ?? 0;
        results.push({ how: order[n] ?? 'ok', foeBefore: before, foeAfter: after, ms });
        n += 1;
      },
    });
    // input safety, in the page at the very moment the first gap opens (a test's own round trip can take longer than the
    // 300 ms guard): a digit before the chips are armed, B and Enter pick nothing (Enter only hurries the line)
    await g.page.evaluate(() => {
      const w = window as unknown as { __kcSafety?: unknown };
      const mo = new MutationObserver(() => {
        const el = document.querySelector('[data-testid="recite-cast"][data-phase="asking"]');
        if (!el || w.__kcSafety) return;
        w.__kcSafety = 'pressed';
        for (const key of ['1', 'x', 'Enter', ' ', 'z']) window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        setTimeout(() => {
          w.__kcSafety = { picked: el.getAttribute('data-picked'), phase: el.getAttribute('data-phase') };
          mo.disconnect();
        }, 80);
      });
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-phase'] });
    });
    await bot.playUntil((s) => n >= 3 || (!s.battle && s.flags.includes('ch1.tataka_defeated')), 400);
    assert.ok(results.length >= 2, `at least two astra casts: ${JSON.stringify(results)}\n${bot.trace.join('\n')}`);
    const miss = results.find((r) => r.how === 'miss');
    assert.ok(miss, 'a deliberate miss was cast');
    assert.ok(miss.foeAfter < miss.foeBefore, `a miss still fires (half power): ${JSON.stringify(miss)}`);
    for (const r of results) assert.ok(r.foeAfter < r.foeBefore, `every cast lands: ${JSON.stringify(r)}`);
    const safety = await g.page.evaluate(() => (window as unknown as { __kcSafety?: { picked: string; phase: string } }).__kcSafety);
    assert.deepEqual(safety, { picked: '', phase: 'asking' }, 'keys before arming, B, Enter, Space and Z picked nothing');
    g.expectClean();
    await g.close();
  });

  test('Kathā in संस्कृतम् + English: the caption, the cast help and automatic recitation; narration advances by itself', { skip: kathaBoss ? false : 'needs Tāṭakā and shoka_shloka', timeout: 240_000 }, async () => {
    assert.ok(kathaBoss);
    const g = await open({ seed: 29, viewport: { width: 390, height: 844 } });
    await reloadWith(g, kathaBoss, 'sa-en');
    await continueToExplore(g);
    let first = true;
    let autoCasts = 0;
    let beatsSeen = 0;
    const bot = new Bot(g, {
      noHurry: true,
      pickMove: (_s, usable) => (usable.includes('shoka_shloka') ? 'shoka_shloka' : undefined),
      onStep: async (s) => {
        if (s.battle && s.battle.beats > 0) beatsSeen += 1;
        if (s.challenge?.kind !== 'smarana') return;
        const cast = g.page.locator('[data-testid="recite-cast"]');
        await cast.waitFor();
        if (first) {
          first = false;
          // sa-en: "Recall the missing word" for the first casts; the line itself carries no English
          assert.match((await g.page.locator('[data-testid="recite-caption"]').textContent()) ?? '', /Recall the missing word/);
          assert.ok(!LATIN.test((await g.page.locator('[data-testid="recite-line"]').textContent()) ?? ''), 'no English in the line');
          // the cast panel's help offers automatic recitation; switching it on finishes this very cast by itself
          await g.tap('recite-help');
          await g.page.locator('[data-testid="recite-help-panel"]').waitFor();
          await g.tap('toggle-auto-recite');
          await g.waitForState('s => s.autoRecite === true');
          const prefs = JSON.parse((await g.page.evaluate((k) => localStorage.getItem(k), PREFS)) ?? '{}') as { autoRecite?: boolean };
          assert.equal(prefs.autoRecite, true, 'automatic recitation is a view preference (prefs-v1)');
          await g.page.waitForSelector('[data-testid="recite-cast"][data-auto="true"]');
          return;
        }
        assert.equal(await cast.getAttribute('data-auto'), 'true', 'later casts recite themselves');
        assert.equal(await g.page.locator('[data-testid="recite-chips"][data-armed="true"]').count(), 0, 'an automatic cast never asks');
        autoCasts += 1;
      },
    });
    const s0 = await bot.playUntil((s) => autoCasts >= 2 || (!s.battle && s.flags.includes('ch1.tataka_defeated')), 400);
    assert.ok(!first, 'a cast was shown');
    assert.ok(autoCasts >= 1 || !s0.battle, 'automatic casts followed');
    assert.ok(beatsSeen > 0, 'narration beats were shown and advanced without taps');
    g.expectClean();
    await g.close();
  });

  test('Kathā: Settings switch the journey and automatic recitation; the verse book is in story order with n / 21; the shrine adds the study hall', { skip: kathaCalm && kathaShrine ? false : 'needs a calm chapter-1 save and a shrine', timeout: 180_000 }, async () => {
    assert.ok(kathaCalm && kathaShrine);
    const g = await open({ seed: 31, viewport: { width: 390, height: 844 } });
    await reloadWith(g, kathaCalm, 'sa');
    await continueToExplore(g);
    assert.equal((await g.state<Snap>()).style, 'katha');
    await g.tap('btn-menu');
    await g.page.locator('[data-testid="menu"]').waitFor();
    await g.tap('tab-verses');
    const book = g.page.locator('[data-testid="shlokakosha"]');
    assert.equal(await book.getAttribute('data-order'), 'story', 'Kathā: the verse book follows the story');
    const heard = (await g.state<Snap>()).heard.length;
    assert.match((await g.page.locator('[data-testid="book-progress"]').textContent()) ?? '', new RegExp(`${heard.toString().replace(/\d/g, (d) => String.fromCharCode(0x0966 + Number(d)))}\\s*/\\s*${String(CONTENT.shlokas.length).replace(/\d/g, (d) => String.fromCharCode(0x0966 + Number(d)))}`), 'n / 21 progress');
    await expectNoLatin(g, 'verse book (Kathā)');
    await g.tap('tab-settings');
    assert.equal(await g.page.locator('[data-testid="journey-katha"]').getAttribute('aria-checked'), 'true');
    assert.ok(await g.page.locator('[data-testid="toggle-auto-recite"]').isVisible(), 'the recitation toggle is in Settings');
    await expectNoLatin(g, 'settings (Kathā)');
    await g.tap('toggle-auto-recite');
    await g.waitForState('s => s.autoRecite === true');
    await g.tap('journey-abhyasa');
    await g.waitForState("s => s.style === 'abhyasa' && !s.flags.includes('style.katha')");
    assert.equal(await g.page.locator('[data-testid="toggle-auto-recite"]').count(), 0, 'the practice game has no recitation toggle');
    await g.tap('tab-verses');
    assert.equal(await g.page.locator('[data-testid="shlokakosha"]').getAttribute('data-order'), null, 'the practice game keeps its verse book');
    await g.tap('tab-settings');
    await g.tap('journey-katha');
    await g.waitForState("s => s.style === 'katha' && s.flags.includes('style.katha')");
    await g.tap('sheet-close');
    await g.page.locator('[data-testid="menu"]').waitFor({ state: 'detached' });
    // the shrine: Kathā adds the study hall (a round of classic challenges)
    await reloadWith(g, kathaShrine, 'sa');
    await continueToExplore(g);
    await interactUntil(g, 'shrine');
    assert.ok(await g.page.locator('[data-testid="shrine-study"]').isVisible(), 'the study hall is offered');
    await expectNoLatin(g, 'shrine (Kathā)');
    await g.tap('shrine-study');
    await g.waitForState("s => s.pending === 'challenge' && s.challenge && s.challenge.kind !== 'smarana' && s.challenge.context === 'quiz'");
    await expectNoLatin(g, 'study hall challenge');
    g.expectClean();
    await g.close();
  });

  test('v0.4.3 reader level: a Kathā study-hall round in संस्कृतम् has no script (lipi) question and no meaning question on a basic word; Settings → story text updates the reader', { skip: kathaShrine ? false : 'needs a shrine', timeout: 180_000 }, async () => {
    assert.ok(kathaShrine);
    const LEX = new Map(CONTENT.lexicon.map((e) => [e.id, e]));
    const g = await open({ seed: 43, viewport: { width: 390, height: 844 } });
    await reloadWith(g, kathaShrine, 'sa');
    await continueToExplore(g);
    await g.waitForState("s => s.reader === 'sa'");
    await interactUntil(g, 'shrine');
    await g.tap('shrine-study');
    const bot = new Bot(g);
    const kinds: string[] = [];
    for (let i = 0; i < 60 && kinds.length < 5; i++) {
      const s = await g.state<Snap>();
      if (s.pending === 'challenge' && s.challenge && s.challenge.context === 'quiz') {
        const c = s.challenge;
        assert.notEqual(c.kind, 'lipi', 'no script question for a reader of संस्कृतम्');
        if (c.kind === 'artha') for (const id of c.lexIds ?? []) assert.ok(hardWord(LEX.get(id)), `the meaning of a basic word was asked: ${LEX.get(id)?.lemma ?? id}`);
        assert.equal(await g.page.locator('[data-testid="challenge"]').first().getAttribute('data-kind'), c.kind, 'the panel shows the drawn kind');
        kinds.push(c.kind);
        if (kinds.length === 1) await expectNoLatin(g, 'study hall (reader sa)');
        await bot.answer(s, false);
        await g.waitForState("s => s.pending === 'feedback'");
        await g.tap('continue');
      }
      await g.page.waitForTimeout(80);
    }
    assert.equal(kinds.length, 5, `a round of five (${kinds.join(', ')})`);
    assert.ok(kinds.filter((k) => ['purana', 'krama', 'viccheda', 'vibhakti'].includes(k)).length >= 3, `the harder kinds come first: ${kinds.join(', ')}`);
    await g.waitForState("s => s.pending === 'shrine'");
    await g.tap('shrine-leave');
    for (const [lang, reader] of [['sa-en', "'sa-en'"], ['en', 'null'], ['sa', "'sa'"]] as const) {
      await setDialogueLang(g, lang);
      await g.waitForState(`s => s.reader === ${reader}`);
    }
    g.expectClean();
    await g.close();
  });

  test('Kathā shrine recital at 360×640: the verse in place with progress dots, four pādas, one gap each', { skip: kathaShrine ? false : 'needs a shrine', timeout: 180_000 }, async () => {
    assert.ok(kathaShrine);
    const g = await open({ seed: 37, viewport: { width: 360, height: 640 } });
    await reloadWith(g, kathaShrine, 'sa');
    await continueToExplore(g);
    await interactUntil(g, 'shrine');
    await g.tap('shrine-recite');
    await g.page.locator('[data-testid="panel-recite"]').waitFor();
    await g.page.locator('[data-testid^="recite-s-"]').first().click();
    const steps: number[] = [];
    const bot = new Bot(g, {
      castInput: () => (steps.length % 2 ? 'tap' : 'key'),
      onCast: async (s) => {
        steps.push(s.challenge?.step ?? 0);
        await expectCastLayout(g, `recital pāda ${s.challenge?.step}`);
        assert.equal(await g.page.locator('[data-testid="recite-verse"] .g-ramayana-yatra__cast-done').count(), (s.challenge?.step ?? 1) - 1, 'the completed pādas stay in place above the live line');
        const dots = await g.page.locator('[data-testid="recite-dots"]').boundingBox();
        assert.ok(dots && dots.y > 0, 'progress dots are on screen');
        if (steps.length === 1) await expectNoLatin(g, 'shrine recital at 360×640');
      },
    });
    await bot.playUntil((s) => steps.length >= 4 && s.pending !== 'challenge', 200);
    assert.deepEqual(steps, [1, 2, 3, 4], 'four pādas in order');
    g.expectClean();
    await g.close();
  });

  // ───────── v0.4.2: "Show the way" (the map pointer) ─────────

  /** The canvas's data-guide ('mark:x,y' / 'edge:x,y' / ''), and the colour of that canvas pixel. */
  async function pointerOnCanvas(g: GameSession): Promise<{ mark: string; rgba: number[] | null }> {
    return g.page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('[data-testid="screen"]');
      const mark = c?.dataset['guide'] ?? '';
      const m = /^(?:mark|edge):(\d+),(\d+)$/.exec(mark);
      if (!c || !m) return { mark, rgba: null };
      return { mark, rgba: [...(c.getContext('2d')?.getImageData(Number(m[1]), Number(m[2]), 1, 1).data ?? [])] };
    });
  }
  /** The pointer is on screen: exposed, consistent with the walkthrough, and drawn in gold on the canvas. */
  async function expectPointer(g: GameSession, where: string): Promise<Snap> {
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
  async function expectNoPointer(g: GameSession, where: string): Promise<void> {
    await g.page.waitForFunction(() => (document.querySelector<HTMLCanvasElement>('[data-testid="screen"]')?.dataset['guide'] ?? '') === '', undefined, { timeout: 3000 });
    assert.equal((await g.state<Snap>()).guideShown, false, `${where}: the pointer is hidden`);
  }

  test('Show the way (v0.4.2): a new Kathā journey in संस्कृतम् — the pointer marks the next goal, hides in dialogue, verse moments, battle and menus, and Settings turn it off; no Latin', { timeout: 300_000 }, async () => {
    const g = await open({ seed: 7, viewport: { width: 390, height: 844 } });
    await toNewJourney(g);
    await g.tap('dlang-sa');
    await g.waitForState("s => s.dialogueLang === 'sa'");
    assert.equal(await g.page.locator('[data-testid="journey-katha"]').getAttribute('aria-checked'), 'true', 'संस्कृतम्: कथा by default');
    await g.tap('start-journey');
    await g.waitForState("s => s.screen === 'game' && s.style === 'katha'");
    // whenever something is on screen (dialogue, a verse moment, a battle, a recitation), the pointer is not drawn
    const busy = new Set<string>();
    const shownWhileBusy: string[] = [];
    const bot = new Bot(g, {
      onStep: async (s) => {
        const kind = s.phase === 'battle' ? 'battle' : (s.pending ?? s.phase);
        busy.add(kind);
        // the canvas redraws on the next animation frame: give it two frames after the state changed, and count only a
        // marker drawn while something was on screen both before and after those frames (no one-frame race)
        const before = await g.state<Snap>();
        await g.page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
        const { mark } = await pointerOnCanvas(g);
        const now = await g.state<Snap>();
        const busyNow = (x: Snap): boolean => !!x.pending || x.phase !== 'explore';
        if (busyNow(before) && busyNow(now) && (now.guideShown || mark)) shownWhileBusy.push(`${kind}: guideShown ${now.guideShown} data-guide "${mark}"`);
      },
    });
    // the first free moment (after the intro): the pointer is on screen
    await bot.playUntil((s) => s.phase === 'explore' && !s.pending && !!s.guideShown, 400);
    const first = await expectPointer(g, 'the first free moment');
    await expectNoLatin(g, 'explore with the pointer');
    // follow the story through the first goals and the tutorial duel: the pointer comes back at every free moment
    const targets = new Set<string>([JSON.stringify(first.guide)]);
    await bot.playUntil((s) => {
      if (s.phase === 'explore' && !s.pending && s.guide && s.guideShown) targets.add(JSON.stringify({ ...s.guide, distance: 0 }));
      return s.flags.includes('ch1.duel_done') && s.phase === 'explore' && !s.pending;
    }, 900);
    const after = await expectPointer(g, 'after the duel');
    assert.ok(targets.size >= 2, `the pointer moved on with the story: ${[...targets].join(' | ')}`);
    assert.ok(['say', 'shloka', 'battle'].every((k) => busy.has(k)), `dialogue, a verse moment and a battle were checked: ${[...busy].join(', ')}`);
    assert.deepEqual(shownWhileBusy, [], 'never drawn while something else is on screen');
    // the menu hides it; Settings → मार्गं दिश switches it off (prefs-v1, never the save) and on again
    await g.tap('btn-menu');
    await g.page.locator('[data-testid="menu"]').waitFor();
    await expectNoPointer(g, 'menu open');
    await g.tap('tab-settings');
    const toggle = g.page.locator('[data-testid="toggle-show-way"]');
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true', 'on by default');
    assert.match((await g.page.locator('[data-testid="setting-show-way"]').textContent()) ?? '', DEVA, 'the setting is in Sanskrit');
    await expectNoLatin(g, 'settings with Show the way');
    await g.tap('toggle-show-way');
    await g.waitForState('s => s.showWay === false');
    await g.tap('sheet-close');
    await g.page.locator('[data-testid="menu"]').waitFor({ state: 'detached' });
    await expectNoPointer(g, 'setting off');
    assert.ok((await g.state<Snap>()).guide, 'the target is still known (only the marker is off)');
    const prefs = JSON.parse((await g.page.evaluate(() => localStorage.getItem('samskuru:v1:game:ramayana-yatra:prefs-v1'))) ?? '{}') as { showWay?: boolean };
    assert.equal(prefs.showWay, false, 'stored with the preferences');
    const save = (await g.page.evaluate(() => localStorage.getItem('samskuru:v1:game:ramayana-yatra:save-v1'))) ?? '';
    assert.ok(save && !/guide|showWay/.test(save), 'nothing of the pointer is in the save');
    await g.tap('btn-menu');
    await g.page.locator('[data-testid="menu"]').waitFor();
    await g.tap('tab-settings');
    await g.tap('toggle-show-way');
    await g.waitForState('s => s.showWay === true');
    await g.tap('sheet-close');
    await g.page.locator('[data-testid="menu"]').waitFor({ state: 'detached' });
    const back = await expectPointer(g, 'setting on again');
    assert.deepEqual(back.guide, after.guide, 'the same target');
    g.expectClean();
    await g.close();
  });

  // ───────── production readiness (fx-full, v0.4.3): reload, console, offline ─────────
  test('production: a hard reload mid-chapter resumes the save — the same place, story flags, verses and party (Kathā in संस्कृतम्)', { timeout: 240_000 }, async () => {
    const g = await open({ seed: 5 });
    await toNewJourney(g);
    await g.tap('dlang-sa');
    await g.waitForState("s => s.dialogueLang === 'sa'");
    await g.tap('journey-katha');
    await g.tap('start-journey');
    await g.waitForState("s => s.screen === 'game' && s.style === 'katha'");
    // follow the pointer until a few walkthrough steps of book 1 are done (verses heard, the tutorial duel won)
    await guidePlaythrough(g, { label: 'reload', until: (s) => (s.guide?.step ?? 0) >= 4 && s.phase === 'explore' && !s.pending });
    // then walk on a few steps (no event, no map change: nothing the autosave reacts to)
    const bot = new Bot(g);
    let walked = 0;
    for (let i = 0; i < 40 && walked < 3; i++) {
      const s = await bot.snap();
      if (await bot.handle(s)) continue;
      if (s.phase !== 'explore' || s.pending) {
        await g.page.waitForTimeout(60);
        continue;
      }
      if ((await followPointer(bot, s)) === 'moved') walked += 1;
    }
    await g.waitForState("s => s.phase === 'explore' && !s.pending");
    const before = await g.state<Snap>();
    assert.ok(before.chapter === 1 && before.heard.length > 0, `mid book 1 with verses heard: book ${before.chapter}, ${before.heard.length} heard`);
    await reloadToTitle(g);
    await g.waitForState('s => s.screen === "title" && s.canContinue');
    await continueToExplore(g);
    const after = await g.state<Snap>();
    const view = (s: Snap): unknown => ({ map: s.map, x: s.x, y: s.y, chapter: s.chapter, style: s.style, reader: s.reader, flags: [...s.flags].sort(), heard: [...s.heard].sort(), restored: [...s.restored].sort(), party: s.party.map((m) => `${m.id}:L${m.level}:${m.hp}`), guide: s.guide && { step: s.guide.step, kind: s.guide.kind, x: s.guide.x, y: s.guide.y } });
    assert.deepEqual(view(after), view(before), 'Continue after a hard reload puts the player back exactly where they were');
    assert.equal(after.dialogueLang, 'sa', 'the story-text language survives the reload');
    // e2e hook: the walkability grid is cached across steps, so it never marks the player's own tile as solid (a
    // stale '#' where the player once stood closed the one-tile pass to lanka_palace for the full-playthrough bot)
    assert.equal(after.grid[after.y]?.[after.x], '.', 'the grid does not bake in the player position');
    g.expectClean();
    await g.close();
  });

  test('production: no console errors on load — title, New journey, the first scene and Continue in English, संस्कृतम् + English and संस्कृतम्', { skip: uiCalm ? false : 'needs a calm chapter-1 save', timeout: 240_000 }, async () => {
    assert.ok(uiCalm);
    const g = await open({ seed: 4 });
    const warnings: string[] = [];
    g.page.on('console', (m) => {
      if (m.type() === 'warning' && m.text().includes('ramayana-yatra')) warnings.push(m.text());
    });
    for (const lang of ['en', 'sa-en', 'sa'] as const) {
      // a first visit: no save
      await g.page.evaluate(([p, sv, l]) => {
        localStorage.removeItem(sv as string);
        localStorage.setItem(p as string, JSON.stringify({ dialogueLang: l }));
        // after the game's own save on page hide (see reloadWith)
        window.addEventListener('pagehide', () => localStorage.removeItem(sv as string));
        document.addEventListener('visibilitychange', () => localStorage.removeItem(sv as string));
      }, [PREFS, SAVE, lang] as const);
      await reloadToTitle(g);
      assert.equal((await g.state<Snap>()).canContinue, false, 'a first visit: no save, no Continue');
      assert.equal((await g.state<Snap>()).dialogueLang, lang);
      if (lang === 'sa') await expectNoLatin(g, 'title (first visit)');
      await toNewJourney(g);
      assert.equal(await g.page.locator(`[data-testid="dlang-${lang}"]`).getAttribute('aria-checked'), 'true', `the picker shows ${lang}`);
      if (lang === 'sa') await expectNoLatin(g, 'new journey');
      await g.tap('start-journey');
      await g.waitForState("s => s.screen === 'game' && !!s.pending");
      if (lang === 'sa') await expectNoLatin(g, 'the first scene');
      // a returning visit: Continue
      await reloadWith(g, uiCalm.save, lang);
      if (lang === 'sa') await expectNoLatin(g, 'title (Continue)');
      await continueToExplore(g);
      if (lang === 'sa') await expectNoLatin(g, 'exploring after Continue');
      assert.deepEqual(g.errors, [], `console errors in ${lang}:\n${g.errors.join('\n')}`);
    }
    assert.deepEqual(warnings, [], 'no game warnings (unknown markup ids, guide errors, failed saves) on load');
    g.expectClean();
    await g.close();
  });

  test('production: after one visit the service worker serves the game offline — offline reload → title → a new journey starts (a build with the service worker)', { timeout: 120_000 }, async () => {
    const out = join('.e2e', `sw-${process.pid}`);
    execFileSync(process.execPath, ['tools/build.mjs', `--outdir=${out}`, '--only=ramayana-yatra'], { cwd: ROOT, stdio: 'pipe' });
    const started = await serveDir(join(ROOT, out));
    try {
      const g = await open({ seed: 2 });
      // a normal visit (no e2e flag): the app registers its service worker, which precaches the game
      await g.page.goto(`${started.url}/#/play/ramayana-yatra`);
      await g.page.locator('[data-testid="title-new"]').waitFor({ timeout: 15000 });
      const sw = await g.page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise<void>((ok) => navigator.serviceWorker.addEventListener('controllerchange', () => ok(), { once: true }));
        return { controlled: !!navigator.serviceWorker.controller, caches: await caches.keys() };
      });
      assert.ok(sw.controlled && sw.caches.some((k) => k.startsWith('samskuru-')), `the service worker controls the page: ${JSON.stringify(sw)}`);
      await g.page.context().setOffline(true);
      try {
        await g.page.reload();
        await g.page.locator('[data-testid="title-new"]').waitFor({ timeout: 15000 });
        await g.tap('title-new');
        await g.tap('start-journey');
        await g.page.locator('[data-testid="screen"]').waitFor({ timeout: 10000 });
        await g.page.locator('[data-testid="panel"]').waitFor();
        const fonts = await g.page.evaluate(async () => {
          await document.fonts.ready;
          return [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family);
        });
        assert.deepEqual(fonts, [], 'every font loads offline');
      } finally {
        await g.page.context().setOffline(false);
      }
      g.expectClean();
      await g.close();
    } finally {
      started.close();
      rmSync(join(ROOT, out), { recursive: true, force: true });
    }
  });
});


// ───────────────────────── full playthrough (opt-in: RY_FULL=1) ─────────────────────────
// The bot plays like a player who follows "Show the way": in free exploration it only reads the exposed pointer
// (`guide`), walks toward it with the on-screen pad (BFS over the snapshot grid, the route the pointer itself would
// take: around repeatable triggers and, in the practice game, around kuśa grass when it can), talks / steps on /
// recites there, and handles whatever comes up (dialogue, choices, verse moments, battles, recitations, shrines,
// chapter ends) with the ordinary Bot. There is no scripted route and no walkthrough lookup.

const tileKey = (x: number, y: number): string => `${x},${y}`;

/** Encounter (kuśa) tiles of a map, from the content + tile catalog. */
function encounterTiles(mapId: string): { x: number; y: number }[] {
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
function contentRoute(from: string, to: string, flags: Set<string>): string[] {
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
function repeatTriggerTiles(mapId: string, flags: string[]): Set<string> {
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
function talkSpotsAt(mapId: string, nx: number, ny: number): Set<string> {
  const m = CONTENT.maps.find((x) => x.id === mapId);
  const out = new Set<string>();
  for (const [dx, dy] of Object.values(D)) {
    out.add(tileKey(nx + dx, ny + dy));
    const t = m ? tileAt(m, nx + dx, ny + dy) : null;
    if (t && (t.ground === 'market_stall' || t.overlay === 'market_stall')) out.add(tileKey(nx + 2 * dx, ny + 2 * dy));
  }
  return out;
}

const dirToward = (s: { x: number; y: number }, t: { x: number; y: number }): Dir => (t.x > s.x ? 'right' : t.x < s.x ? 'left' : t.y > s.y ? 'down' : 'up');

/**
 * One move toward the map pointer: a pad step along the route, or (beside a person / shrine) turn and press A.
 * Returns 'moved' / 'interacted', or a reason when the pointer cannot be followed.
 */
async function followPointer(bot: Bot, s: Snap): Promise<string> {
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

interface ChapterStats {
  chapter: number;
  ms: number;
  battles: number;
  wild: number;
  challenges: number;
  losses: number;
  grindBattles: number;
}

interface FullRun {
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
async function guidePlaythrough(g: GameSession, opts: { latin?: () => Promise<string[]>; label: string; until?: (s: Snap) => boolean; continueBooks?: boolean }): Promise<FullRun> {
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
 */
function planAt(content: GameContent, chapter: number, mapId: string, level: number, allies: string[]): { save: ReturnType<typeof toSave> } | null {
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
    if (s.kanda > chapter) continue;
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

function planFinale(content: GameContent): { save: ReturnType<typeof toSave> } | null {
  if (!content.events.some((e) => JSON.stringify(e.cmds).includes('"end":true'))) return null;
  return planAt(content, 6, 'lanka_palace', 40, ['player', 'rama', 'lakshmana', 'hanuman', 'jambavan', 'vibhishana']);
}

/**
 * A sign whose English text has a Sambhāṣaṇa translation (and no {player}, so the Sanskrit line is Latin-free),
 * with a save standing in front of it, facing it. The save comes from planAt for the sign's map, so the story
 * flags around it are consistent. Null while no sign is translated.
 */
function signPlan(content: GameContent): { save: ReturnType<typeof toSave>; en: string; sa: string } | null {
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
function introPlan(content: GameContent): string | null {
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
function saveFacing(content: GameContent, save: ReturnType<typeof toSave>, mapId: string, target: { x: number; y: number }): ReturnType<typeof toSave> | null {
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
function shopPlan(content: GameContent): ReturnType<typeof toSave> | null {
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
function shrinePlan(content: GameContent): ReturnType<typeof toSave> | null {
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
