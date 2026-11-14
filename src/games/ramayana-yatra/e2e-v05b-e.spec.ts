/**
 * v0.5b browser tests of WP-E (OWNER: WP-E; notes/v05b-e.md): the Āditya-hṛdayam cutscene in Rāvaṇa's battle
 * (Yuddha 6.105.1–31), the owner's homage.
 *  - Kathā in संस्कृतम् (390×844, motion on): the scene starts when Rāvaṇa is worn to 60 %, walks the 3D phases
 *    (flat → rotate-out → scene → rotate-in → done; WebGL), the narration then all 31 verses lit in order; Latin only in
 *    the English the owner asked for (data-en-ok); back to the battle with input working; the flag seen.aditya
 *  - the practice journey in English (360×640): the scene there too; pause holds it; skip asks first (No goes on, Yes
 *    skips) and still counts as seen; the reader fits the small screen
 *  - the replay (the easter egg): Menu → श्लोकाः offers "आदित्यहृदयम् ▶" only once seen; it plays over the menu and
 *    returns to the verse book
 *  - reduced motion: the still painting with crossfades (no WebGL canvas); a lost WebGL context falls back to the
 *    still and comes back when restored; no console errors anywhere
 * RY_SHOTS=<dir>: a screenshot sequence (flat → rotating → 3D → recitation with the highlight → back to flat) at 390×844
 * and on a desktop window.
 * The scene runs fast under ?e2e=1 (window.__ryCutsceneSpeed sets the pace) and logs `phase|step` to
 * window.__ryCutsceneLog.
 */
import assert from 'node:assert/strict';
import type { GameSession } from '../../../tests/e2e/harness';
import { type E2eCase, type Snap, Bot, CONTENT, continueToExplore, expectNoLatin, kathaFrom, latinOnScreen, planAt, reloadWith } from './e2e-kit.spec';
import { expectNoOverflow } from '../../../tests/e2e/harness';
import type { EventCmd } from './types';
import type { toSave } from './logic';

type Save = ReturnType<typeof toSave>;
type CsSnap = Snap & { cutscene?: { id: string; replay: boolean } | null };

const TALL = { width: 390, height: 844 };
const SMALL = { width: 360, height: 640 };
const DESKTOP = { width: 1280, height: 800 };
const FLAG = 'seen.aditya';
const SHOTS = process.env['RY_SHOTS'] ?? '';

/** Rāvaṇa's battle exactly as the story stages it (story-ch6.json ch6.ravana). */
function ravanaBattle(): EventCmd {
  const ev = CONTENT.events.find((e) => e.id === 'ch6.ravana');
  const find = (cmds: unknown): EventCmd | null => {
    if (!Array.isArray(cmds)) return null;
    for (const c of cmds as Record<string, unknown>[]) {
      if (c && typeof c === 'object' && 'battle' in c) return { battle: (c as { battle: unknown }).battle } as EventCmd;
      for (const k of ['then', 'else']) {
        const r = find(c?.[k]);
        if (r) return r;
      }
    }
    return null;
  };
  const b = find(ev?.cmds);
  assert.ok(b, 'ch6.ravana has a battle');
  return b;
}

/** A late save on the palace map of book 6 (before Rāvaṇa), Kathā or practice. */
function lateSave(katha: boolean, flags: string[] = []): Save | null {
  const p = planAt(CONTENT, 6, 'lanka_palace', 36, ['player', 'rama', 'lakshmana', 'hanuman']);
  if (!p) return null;
  const s = katha ? kathaFrom(p.save, 1) : p.save;
  return { ...s, flags: { ...s.flags, ...Object.fromEntries(flags.map((f) => [f, true as const])) } };
}

/** The game with this save, the story text in `lang`, motion on (unless `reduced`), the cutscene at `speed`. */
async function openAt(open: (o?: { seed?: number; viewport?: { width: number; height: number } }) => Promise<GameSession>, save: Save, lang: 'en' | 'sa-en' | 'sa', vp: { width: number; height: number }, o: { reduced?: boolean; speed?: number } = {}): Promise<GameSession> {
  const g = await open({ seed: 61, viewport: vp });
  // the harness emulates reduced motion; the 3D tests turn it off before the game mounts again (reloadWith reloads)
  if (!o.reduced) await g.page.emulateMedia({ reducedMotion: 'no-preference' });
  await reloadWith(g, save, lang);
  await setSpeed(g, o.speed ?? 0);
  await continueToExplore(g);
  return g;
}

async function setSpeed(g: GameSession, speed: number): Promise<void> {
  await g.page.evaluate((sp) => {
    const w = window as unknown as { __ryCutsceneSpeed?: number; __ryCutsceneLog?: string[] };
    if (sp > 0) w.__ryCutsceneSpeed = sp;
    else delete w.__ryCutsceneSpeed;
    w.__ryCutsceneLog = [];
  }, speed);
}
const csLog = (g: GameSession): Promise<string[]> => g.page.evaluate(() => (window as unknown as { __ryCutsceneLog?: string[] }).__ryCutsceneLog ?? []);
const phase = (g: GameSession): Promise<string | null> => g.page.locator('[data-testid="cutscene"]').getAttribute('data-phase', { timeout: 2000 }).catch(() => null);
async function waitPhase(g: GameSession, p: string, timeout = 60_000): Promise<void> {
  await g.page.locator(`[data-testid="cutscene"][data-phase="${p}"]`).waitFor({ timeout });
}
async function shot(g: GameSession, name: string): Promise<void> {
  if (SHOTS) await g.page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Start Rāvaṇa's battle and fight (the e2e bot) until the cutscene is on screen. */
async function fightToScene(g: GameSession): Promise<CsSnap> {
  const ok = await g.page.evaluate((cmds) => (window as unknown as { __ryScript?: (c: unknown[]) => boolean }).__ryScript?.(cmds) ?? false, [ravanaBattle()] as unknown[]);
  assert.ok(ok, '__ryScript started the battle');
  await g.waitForState("s => s.phase === 'battle'");
  const bot = new Bot(g, {});
  for (let i = 0; i < 600; i++) {
    const s = await g.state<CsSnap>();
    if (s.cutscene) return s;
    assert.equal(s.flags.includes(FLAG), false, 'not seen before the trigger');
    if (s.battle) {
      // the trigger: Rāvaṇa above 60 % until the scene shows
      assert.ok(s.battle.foe === 'ravana', 'Rāvaṇa');
      if (s.pending) await bot.handle(s).catch(() => undefined);
      else await g.page.waitForTimeout(50);
    } else await g.page.waitForTimeout(50);
  }
  throw new Error(`no cutscene in Rāvaṇa's battle\n${bot.trace.join('\n')}`);
}

/** The scene's log: the phases in order and the follow-along (narration, then every pāda of the 31 verses, in order). */
function expectWalk(log: string[], o: { skipped?: boolean; mode: '3d' | 'fallback' }): void {
  assert.ok(log[0]?.startsWith(`start|${o.mode}`), `mode ${o.mode}: ${log[0]}`);
  const phases = log.filter((e) => /^(flat|rotate-out|rotate-in|done)\|$/.test(e)).map((e) => e.slice(0, -1));
  assert.deepEqual(phases, ['flat', 'rotate-out', 'rotate-in', 'done'], `phases: ${phases.join(' → ')}`);
  const at = log.flatMap((e, i) => (e.startsWith('scene|') ? [i] : []));
  assert.ok(at.length > 0 && (at[0] as number) > log.indexOf('rotate-out|') && (at[at.length - 1] as number) < log.indexOf('rotate-in|'), 'the 3D scene between the two camera moves');
  if (o.skipped) return;
  const steps = log.filter((e) => e.startsWith('scene|')).map((e) => e.slice('scene|'.length));
  const expected = [...CONTENT.aditya!.narration.map((_, i) => `narration:${i}`), ...CONTENT.aditya!.verses.flatMap((v) => v.padas.map((_, p) => `verse:${v.n}:${p}`))];
  assert.deepEqual(steps, expected, 'the narration, then all 31 verses pāda by pāda, in order, each once');
}

/** After the scene: back to the battle, the flag set, and the battle takes input again (a command is accepted). */
async function expectBattleGoesOn(g: GameSession): Promise<void> {
  await g.waitForState('s => !s.cutscene', 30_000);
  await g.page.locator('[data-testid="cutscene"]').waitFor({ state: 'detached' });
  const s = await g.state<CsSnap>();
  assert.ok(s.flags.includes(FLAG), 'seen.aditya is set');
  assert.equal(s.phase, 'battle', 'back in the battle');
  const bot = new Bot(g, {});
  for (let i = 0; i < 300; i++) {
    const t = await g.state<CsSnap>();
    assert.equal(t.cutscene ?? null, null, 'the scene does not come back');
    if (t.battle?.phase === 'command' && t.battle.beats === 0) {
      // the player's turn: one command through the real UI is taken
      await bot.handle(t);
      await g.waitForState(`s => s.seq > ${t.seq}`, 10_000);
      const u = await g.state<CsSnap>();
      assert.ok(u.seq > t.seq && (u.battle?.phase !== 'command' || u.battle.beats > 0 || u.phase !== 'battle'), 'the battle takes input after the scene');
      return;
    }
    if (t.pending) await bot.handle(t).catch(() => undefined);
    else await g.page.waitForTimeout(50);
  }
  throw new Error(`no command turn after the scene\n${bot.trace.join('\n')}`);
}

const kSave = lateSave(true);
const pSave = lateSave(false);
const seenSave = lateSave(true, [FLAG]);

export const V05B_E: E2eCase[] = [
  {
    name: 'v0.5b E: the Āditya-hṛdayam (Yuddha 6.105) in Rāvaṇa’s battle — Kathā in संस्कृतम् at 390×844: at 60 % the scene walks flat → rotate-out → 3D → rotate-in, the narration and all 31 verses lit in order, Latin only in the owner’s English; back to the battle with input working',
    skip: kSave ? false : 'needs a book-6 palace save',
    timeout: 300_000,
    run: async ({ open }) => {
      assert.ok(kSave);
      const g = await openAt(open, kSave, 'sa', TALL, { speed: 30 });
      const s = await fightToScene(g);
      assert.deepEqual(s.cutscene, { id: 'aditya-hridayam', replay: false });
      const root = g.page.locator('[data-testid="cutscene"]');
      assert.equal(await root.getAttribute('data-mode'), '3d', 'WebGL');
      assert.equal(await g.page.locator('[data-testid="cutscene-gl"]').count(), 1);
      assert.equal(await g.page.locator('[data-testid="panel"]').count(), 1, 'the frame stays');
      assert.equal(await g.page.locator('[data-testid="battle-panel"]').count(), 0, 'the battle panel waits (no battle input)');
      // the stage starts exactly over the game screen, and grows for the 3D view
      const screen = await g.page.locator('[data-testid="screen"]').boundingBox();
      const stage0 = await g.page.locator('.g-ramayana-yatra__cs-stage').boundingBox();
      assert.ok(screen && stage0 && Math.abs(screen.x - stage0.x) < 1.5 && Math.abs(screen.width - stage0.width) < 1.5 && Math.abs(screen.y - stage0.y) < 1.5, `stage over the screen ${JSON.stringify([screen, stage0])}`);
      await waitPhase(g, 'scene');
      // in the middle of the hymn: pause, look (no Latin outside the English; the current pāda lit; the counter)
      // (pressed from inside the page, on the frame verse 3 begins: the fast clock would outrun a polling test)
      await g.page.evaluate(`new Promise((res) => {
        (function tick() {
          const el = document.querySelector('[data-testid="cutscene"]');
          if (el && /^verse:3:/.test(el.dataset.step || '')) {
            document.querySelector('[data-testid="cutscene-pause"]').click();
            res(true);
          } else requestAnimationFrame(tick);
        })();
      })`);
      await g.page.locator('[data-testid="cutscene-pause"][aria-pressed="true"]').waitFor();
      const at = await g.page.locator('[data-testid="cutscene-count"]').getAttribute('data-verse');
      await g.page.waitForTimeout(400);
      assert.equal(await g.page.locator('[data-testid="cutscene-count"]').getAttribute('data-verse'), at, 'pause holds the scene');
      const stage1 = await g.page.locator('.g-ramayana-yatra__cs-stage').boundingBox();
      assert.ok(stage1 && screen && stage1.height > screen.height + 20, `the 3D stage is taller than the flat screen (${screen?.height} → ${stage1?.height})`);
      assert.equal(await g.page.locator('.g-ramayana-yatra__cs-pada.is-now').count(), 1, 'one pāda lit');
      assert.equal(await g.page.locator('[data-testid="cutscene-en"]').count(), 1, 'the English of the current verse');
      assert.ok((await g.page.locator('[data-testid="cutscene-count"]').innerText()).includes('/ ३१'), 'the counter in Devanagari digits');
      const lit = await g.page.locator('.g-ramayana-yatra__cs-pada.is-now').boundingBox();
      const box = await g.page.locator('[data-testid="cutscene-text"]').boundingBox();
      assert.ok(lit && box && lit.y >= box.y && lit.y + lit.height <= box.y + box.height, 'the lit pāda is scrolled into view');
      const latin = await latinOnScreen(g);
      assert.deepEqual(latin, [], `no Latin outside data-en-ok: ${JSON.stringify(latin)}`);
      assert.ok((await g.page.locator('[data-testid="cutscene-en"]').innerText()).length > 10, 'the English is there (data-en-ok)');
      await expectNoOverflow(g);
      await g.tap('cutscene-pause');
      await g.waitForState('s => !s.cutscene', 120_000);
      expectWalk(await csLog(g), { mode: '3d' });
      await expectBattleGoesOn(g);
      await expectNoLatin(g, 'back in the battle');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b E: the practice journey in English at 360×640 — the scene at Rāvaṇa’s 60 % too; skip asks first (No goes on, Yes skips) and a skip still counts as seen; the reader fits',
    skip: pSave ? false : 'needs a book-6 palace save',
    timeout: 300_000,
    run: async ({ open }) => {
      assert.ok(pSave);
      const g = await openAt(open, pSave, 'en', SMALL, { speed: 20 });
      await fightToScene(g);
      assert.equal((await g.state<CsSnap>()).style, null, 'the practice journey');
      await waitPhase(g, 'scene');
      assert.equal(await g.page.locator('[data-testid="cutscene-pause"]').innerText(), 'Pause');
      for (const id of ['cutscene-pause', 'cutscene-skip']) {
        const b = await g.page.locator(`[data-testid="${id}"]`).boundingBox();
        assert.ok(b && b.height >= 44 && b.x + b.width <= SMALL.width + 0.5, `${id} is a thumb target on screen`);
      }
      await expectNoOverflow(g);
      await g.tap('cutscene-skip');
      await g.page.locator('[data-testid="cutscene-ask"]').waitFor();
      assert.ok((await g.page.locator('[data-testid="cutscene-ask"]').innerText()).includes('Skip the hymn?'));
      await g.tap('cutscene-skip-no');
      await g.page.locator('[data-testid="cutscene-ask"]').waitFor({ state: 'detached' });
      assert.equal(await phase(g), 'scene', 'No: the scene goes on');
      await g.page.keyboard.press('Escape');
      await g.page.locator('[data-testid="cutscene-ask"]').waitFor();
      await g.tap('cutscene-skip-yes');
      await g.waitForState('s => !s.cutscene', 60_000);
      const log = await csLog(g);
      assert.ok(log.includes('skip'), 'skipped');
      assert.ok(!log.includes('scene|verse:31:3'), 'skipped before the end');
      assert.deepEqual(log.filter((e) => /^(rotate-in|done)\|/.test(e)).map((e) => e.split('|')[0]), ['rotate-in', 'done'], 'a skip still returns through the camera move');
      await expectBattleGoesOn(g);
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b E: the easter egg — Menu → श्लोकाः offers “आदित्यहृदयम् ▶” only once the scene was seen; it replays over the menu (from the map frame) and returns to the verse book',
    skip: kSave && seenSave ? false : 'needs a book-6 palace save',
    timeout: 200_000,
    run: async ({ open }) => {
      assert.ok(kSave && seenSave);
      const g = await openAt(open, kSave, 'sa', TALL, { speed: 60 });
      await g.tap('btn-menu');
      await g.tap('tab-verses');
      await g.page.locator('[data-testid="shlokakosha"]').waitFor();
      assert.equal(await g.page.locator('[data-testid="cutscene-replay"]').count(), 0, 'not before it is seen');
      await g.tap('sheet-close');
      await reloadWith(g, seenSave, 'sa');
      await setSpeed(g, 60);
      await continueToExplore(g);
      await g.tap('btn-menu');
      await g.tap('tab-verses');
      const entry = g.page.locator('[data-testid="cutscene-replay"]');
      await entry.waitFor();
      assert.ok((await entry.innerText()).includes('आदित्यहृदयम्'), 'the entry');
      await expectNoLatin(g, 'the verse book with the replay entry');
      await entry.click();
      await g.waitForState('s => !!s.cutscene && s.cutscene.replay === true');
      assert.equal(await g.page.locator('[data-testid="cutscene"]').getAttribute('data-replay'), 'true');
      await g.waitForState('s => !s.cutscene', 120_000);
      expectWalk(await csLog(g), { mode: '3d' });
      await g.waitForState('s => s.menu === true');
      assert.equal(await g.page.locator('[data-testid="tab-verses"]').getAttribute('aria-selected'), 'true', 'back on the verse book');
      const s = await g.state<CsSnap>();
      assert.equal(s.phase, 'explore', 'a replay changes nothing');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b E: reduced motion → the still painting with crossfades (no WebGL), the same walk; a lost WebGL context falls back to the still and returns when restored; no console errors',
    skip: kSave && seenSave ? false : 'needs a book-6 palace save',
    timeout: 300_000,
    run: async ({ open }) => {
      assert.ok(kSave && seenSave);
      // reduced motion (the harness default): in the battle
      const g = await openAt(open, kSave, 'sa-en', TALL, { reduced: true, speed: 80 });
      await fightToScene(g);
      assert.equal(await g.page.locator('[data-testid="cutscene"]').getAttribute('data-mode'), 'fallback');
      assert.equal(await g.page.locator('[data-testid="cutscene-gl"]').count(), 0, 'no WebGL canvas');
      await g.waitForState('s => !s.cutscene', 120_000);
      expectWalk(await csLog(g), { mode: 'fallback' });
      await expectBattleGoesOn(g);
      g.expectClean();
      await g.close();
      // motion on, a replay; the context is lost in the middle of the hymn, then restored
      const h = await openAt(open, seenSave, 'sa', TALL, { speed: 6 });
      await h.tap('btn-menu');
      await h.tap('tab-verses');
      await h.tap('cutscene-replay');
      await waitPhase(h, 'scene');
      const lose = (how: 'loseContext' | 'restoreContext'): Promise<boolean> =>
        h.page.evaluate((m) => {
          // (a lost context hands out no extensions: keep the one that lost it, to restore it)
          const w = window as unknown as { __ryLose?: WEBGL_lose_context | null };
          if (!w.__ryLose) {
            const c = document.querySelector('[data-testid="cutscene-gl"]') as HTMLCanvasElement | null;
            w.__ryLose = (c?.getContext('webgl') as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context') ?? null;
          }
          if (!w.__ryLose) return false;
          w.__ryLose[m]();
          return true;
        }, how);
      assert.ok(await lose('loseContext'), 'WEBGL_lose_context');
      await h.page.locator('[data-testid="cutscene"][data-mode="fallback"]').waitFor({ timeout: 5000 });
      assert.equal(await phase(h), 'scene', 'the scene goes on with the still');
      assert.ok(await lose('restoreContext'));
      await h.page.locator('[data-testid="cutscene"][data-mode="3d"]').waitFor({ timeout: 5000 });
      await h.page.evaluate(() => ((window as unknown as { __ryCutsceneSpeed?: number }).__ryCutsceneSpeed = 400));
      await h.waitForState('s => !s.cutscene', 120_000);
      const log = await csLog(h);
      assert.ok(log.includes('context-lost') && log.includes('context-restored'), log.slice(0, 5).join(' '));
      h.expectClean();
      await h.close();
    },
  },
  {
    name: 'v0.5b E: screenshots (RY_SHOTS) — flat → rotating → 3D → recitation with the highlight → back to flat, at 390×844 and on a desktop window',
    skip: SHOTS && kSave && seenSave ? false : 'set RY_SHOTS=<dir> to take the screenshot sequence',
    timeout: 400_000,
    run: async ({ open }) => {
      assert.ok(kSave && seenSave);
      const seq = async (g: GameSession, tag: string): Promise<void> => {
        /** run fast to verse `v` (pāda `p`), then go on at real time (the switch happens in the page, on the frame) */
        // (a string: tsx would wrap a named function in __name, which the page does not have)
        const slowAt = (v: number, p = 0): Promise<unknown> =>
          g.page.evaluate(`new Promise((res) => {
            window.__ryCutsceneSpeed = 150;
            (function tick() {
              const el = document.querySelector('[data-testid="cutscene"]');
              const m = /^verse:(\\d+):(\\d+)$/.exec(el ? el.dataset.step || '' : '');
              if (!el || el.dataset.phase !== 'scene' || (m && (Number(m[1]) > ${v} || (Number(m[1]) === ${v} && Number(m[2]) >= ${p})))) {
                window.__ryCutsceneSpeed = 1;
                res(true);
              } else requestAnimationFrame(tick);
            })();
          })`);
        await waitPhase(g, 'flat', 120_000);
        await shot(g, `${tag}-1-flat`);
        await waitPhase(g, 'rotate-out');
        await g.page.waitForTimeout(1300);
        await shot(g, `${tag}-2-rotating`);
        await g.page.waitForTimeout(900);
        await shot(g, `${tag}-3-rotating-late`);
        await waitPhase(g, 'scene');
        await g.page.waitForTimeout(2500);
        await shot(g, `${tag}-4-3d-narration`);
        await slowAt(6, 1);
        await g.page.waitForTimeout(2400);
        await shot(g, `${tag}-5-recitation-orbit`);
        await slowAt(17, 2);
        await g.page.waitForTimeout(2600);
        await shot(g, `${tag}-6-recitation-sun`);
        await slowAt(30, 0);
        await g.page.waitForTimeout(3000);
        await shot(g, `${tag}-7-recitation-ravana`);
        await slowAt(31, 2);
        await g.page.waitForTimeout(2600);
        await shot(g, `${tag}-8-verse-31-crane`);
        await g.page.evaluate(`new Promise((res) => {
          window.__ryCutsceneSpeed = 150;
          (function tick() {
            const el = document.querySelector('[data-testid="cutscene"]');
            if (!el || el.dataset.phase === 'rotate-in' || el.dataset.phase === 'done') {
              window.__ryCutsceneSpeed = 1;
              res(true);
            } else requestAnimationFrame(tick);
          })();
        })`);
        await g.page.waitForTimeout(1400);
        await shot(g, `${tag}-9-returning`);
        await g.waitForState('s => !s.cutscene', 60_000);
        await g.page.waitForTimeout(300);
        await shot(g, `${tag}-10-back-flat`);
      };
      const g = await openAt(open, kSave, 'sa', TALL, { speed: 1 });
      await g.page.evaluate(() => ((window as unknown as { __ryCutsceneSpeed?: number }).__ryCutsceneSpeed = 1));
      await fightToScene(g);
      await seq(g, 'phone-battle-sa');
      g.expectClean();
      await g.close();
      const d = await openAt(open, seenSave, 'sa-en', DESKTOP, { speed: 1 });
      await d.page.evaluate(() => ((window as unknown as { __ryCutsceneSpeed?: number }).__ryCutsceneSpeed = 1));
      await d.tap('btn-menu');
      await d.tap('tab-verses');
      await d.tap('cutscene-replay');
      await seq(d, 'desktop-replay-sa-en');
      d.expectClean();
      await d.close();
      // reduced motion: the still painting (IAST script, English story text)
      const r = await open({ seed: 61, viewport: TALL, script: 'iast' });
      await reloadWith(r, seenSave, 'en');
      await setSpeed(r, 1);
      await continueToExplore(r);
      await r.tap('btn-menu');
      await r.tap('tab-verses');
      await r.tap('cutscene-replay');
      await waitPhase(r, 'scene', 60_000);
      await r.page.waitForTimeout(800);
      await shot(r, 'phone-reduced-still-iast-en');
      r.expectClean();
      await r.close();
    },
  },
];

