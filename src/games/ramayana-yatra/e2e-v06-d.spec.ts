/**
 * v0.6 browser tests of WP-D (OWNER: v0.6 WP-D; notes/v06-ownership.md, notes/v06-d.md): the mountain of herbs (the 3D
 * told cutscene with its one choice, Yuddha 6.74), opened early with window.__ryScript([{ "cutscene": "herbs" }]) from a
 * calm Kathā save on the Laṅkā battlefield (book 6), played at window.__ryCutsceneSpeed.
 *   1. 3D, Kathā in संस्कृतम् (390×844, motion on): WebGL draws (pixels read back in the frame they are drawn); the
 *      phases flat → rotate-out → scene → rotate-in → done; every shot in order; the question with its one option (in
 *      Sanskrit, no Latin on screen) answered by a tap; the shots after it (roar, lift, sea, revive) and the flash /
 *      shake of the tearing peak; seen.herbs; the story goes on
 *   2. reduced motion (the harness default), English at 360×640: the painter's 2D stills (no WebGL canvas; a different
 *      picture before and after the herbs hide), the question answered with the key 1
 *   3. no WebGL (getContext('webgl') refused) with motion on: the 2D still; skip at the question asks first (No keeps the
 *      question, Yes ends it: seen.herbs, no answer, the story goes on)
 *   4. RY_SHOTS=<dir>: a screenshot of every shot at normal speed (390×844, संस्कृतम्) and the reduced-motion stills
 * Run only these:
 *   node tools/build.mjs --outdir=.e2e/d --only=ramayana-yatra --no-sw
 *   SAMSKURU_E2E=1 SAMSKURU_DIST=.e2e/d node --import tsx --test --test-concurrency=1 --test-name-pattern="v0.6 D" src/games/ramayana-yatra/e2e.spec.ts
 */
import assert from 'node:assert/strict';
import type { GameSession } from '../../../tests/e2e/harness';
import { type E2eCase, type Open, type Snap, CONTENT, continueToExplore, expectNoLatin, kathaFrom, planAt, reloadWith, shot } from './e2e-kit.spec';
import { toldOf } from './logic-told';

const ID = 'herbs';
const TALL = { width: 390, height: 844 };
const SMALL = { width: 360, height: 640 };
const SHOTS = process.env['RY_SHOTS'] ?? '';
const HERBS = toldOf(CONTENT, ID);
/** A line after the scene (a story line with its Sanskrit, so the संस्कृतम् sweep holds). */
const NEXT = 'In Lanka, Ravana weeps for his brother.';
const OPTION_SA = CONTENT.dialogueSa?.['Take the whole mountain!'] ?? '';

/** A calm Kathā save on the Laṅkā battlefield (book 6), else the first map of book 1. */
function calmSave(): ReturnType<typeof kathaFrom> | null {
  const p = planAt(CONTENT, 6, 'lanka_battlefield', 30, ['player', 'rama', 'lakshmana', 'hanuman']) ?? planAt(CONTENT, 1, CONTENT.walkthrough[0]?.map ?? '', 5, ['player', 'rama', 'lakshmana']);
  return p ? kathaFrom(p.save, 1) : null;
}
const SAVE = calmSave();
const ready = !!(SAVE && HERBS && OPTION_SA && CONTENT.dialogueSa?.[NEXT]);

async function openCalm(open: Open, lang: 'en' | 'sa', vp: { width: number; height: number }, o: { motion?: boolean; noWebgl?: boolean } = {}): Promise<GameSession> {
  assert.ok(SAVE);
  const g = await open({ seed: 74, viewport: vp });
  if (o.motion) await g.page.emulateMedia({ reducedMotion: 'no-preference' });
  if (o.noWebgl)
    await g.page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl' || type === 'experimental-webgl' || type === 'webgl2') return null;
        return (orig as (this: HTMLCanvasElement, t: string, ...r: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof orig;
    });
  await reloadWith(g, SAVE, lang);
  await continueToExplore(g);
  return g;
}

/** Start the scene through the e2e script hook at `speed` (the log cleared). */
async function startHerbs(g: GameSession, speed: number): Promise<void> {
  const ok = await g.page.evaluate(
    ([cmds, sp]) => {
      const w = window as unknown as { __ryScript: (c: unknown) => boolean; __ryCutsceneSpeed?: number; __ryCutsceneLog?: string[] };
      w.__ryCutsceneSpeed = sp as number;
      w.__ryCutsceneLog = [];
      return w.__ryScript(cmds);
    },
    [[{ cutscene: ID }, { say: NEXT }], speed] as const,
  );
  assert.ok(ok, '__ryScript ran from a calm moment');
  await g.waitForState(`s => s.pending === 'cutscene' && !!s.told && s.told.id === '${ID}'`);
  await g.page.locator(`[data-testid="told"][data-id="${ID}"]`).waitFor();
}
const cutLog = (g: GameSession): Promise<string[]> => g.page.evaluate(() => (window as unknown as { __ryCutsceneLog?: string[] }).__ryCutsceneLog ?? []);
const root = (g: GameSession) => g.page.locator('[data-testid="told"]');

/** The shots the log crossed, in order (told|step|i|scene → the step's key). */
function shotsIn(log: string[]): string[] {
  const steps = HERBS?.steps ?? [];
  return log.flatMap((e) => {
    const m = /^told\|step\|(\d+)\|scene$/.exec(e);
    const st = m ? steps[Number(m[1])] : undefined;
    return st && 'scene' in st ? [st.scene] : [];
  });
}

/** WebGL pixels of the told canvas, read in a frame right after the scene drew it: how many distinct colours. */
async function glColours(g: GameSession): Promise<number> {
  return g.page.evaluate(
    () =>
      new Promise<number>((res) => {
        requestAnimationFrame(() => {
          const c = document.querySelector('[data-testid="told-gl"]') as HTMLCanvasElement | null;
          const gl = c?.getContext('webgl') as WebGLRenderingContext | null;
          if (!c || !gl) return res(0);
          const seen = new Set<string>();
          const px = new Uint8Array(4);
          for (let i = 1; i < 8; i++)
            for (let j = 1; j < 8; j++) {
              gl.readPixels(Math.floor((c.width * i) / 8), Math.floor((c.height * j) / 8), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
              seen.add(`${(px[0] as number) >> 3},${(px[1] as number) >> 3},${(px[2] as number) >> 3}`);
            }
          res(seen.size);
        });
      }),
  );
}
/** A small signature of the 2D told canvas (to tell two stills apart). */
const canvas2d = (g: GameSession): Promise<string> =>
  g.page.evaluate(() => {
    const c = document.querySelector('[data-testid="told-canvas"]') as HTMLCanvasElement | null;
    const x = c?.getContext('2d');
    if (!c || !x) return '';
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    const cols = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 97) {
      h = (h * 31 + (d[i] as number) + (d[i + 1] as number) * 3 + (d[i + 2] as number) * 7) >>> 0;
      cols.add(((d[i] as number) >> 4) * 256 + ((d[i + 1] as number) >> 4) * 16 + ((d[i + 2] as number) >> 4));
    }
    return `${cols.size}:${h}`;
  });

/** Wait for the question (the clock stops on it). */
async function waitAsk(g: GameSession, timeout = 60_000): Promise<void> {
  await g.page.locator('[data-testid="told"][data-ask="true"]').waitFor({ timeout });
  await g.page.locator('[data-testid="told-opt-0"]').waitFor();
}

/** After the scene: the story goes on with the next line; seen.herbs. */
async function expectStoryGoesOn(g: GameSession): Promise<Snap> {
  await g.waitForState(`s => s.pending === 'say' && s.say === ${JSON.stringify(NEXT)}`, 60_000);
  await root(g).waitFor({ state: 'detached' });
  const s = await g.state<Snap>();
  assert.ok(s.flags.includes('seen.herbs'), 'seen.herbs');
  assert.equal(s.told ?? null, null);
  return s;
}

export const V06_D: E2eCase[] = [
  {
    name: 'v0.6 D: the mountain of herbs in 3D — Kathā in संस्कृतम् at 390×844: WebGL draws; flat → rotate-out → every shot in order → rotate-in; the one question (one option, Sanskrit, no Latin) answered by a tap; the peak tears with a flash and a shake; seen.herbs; the story goes on',
    skip: ready ? false : 'needs a calm Kathā save, the herbs cutscene and its Sanskrit',
    timeout: 180_000,
    run: async ({ open }) => {
      const g = await openCalm(open, 'sa', TALL, { motion: true });
      await startHerbs(g, 3);
      assert.equal(await root(g).getAttribute('data-mode'), '3d', 'WebGL and motion: 3D');
      assert.equal(await g.page.locator('[data-testid="told-gl"]').count(), 1);
      // the title in Sanskrit; the scene draws (several colours in the frame it was drawn)
      assert.ok(((await g.page.locator('[data-testid="told-title"]').textContent()) ?? '').includes(CONTENT.dialogueSa?.[HERBS!.title] ?? '?'));
      await g.page.locator('[data-testid="told"][data-phase="scene"]').waitFor({ timeout: 30_000 });
      await g.page.locator('[data-testid="told-say"]').waitFor();
      assert.ok((await glColours(g)) >= 4, 'the 3D scene draws');
      await expectNoLatin(g, 'the herbs cutscene');
      await waitAsk(g);
      assert.ok((await glColours(g)) >= 4, 'the 3D scene draws at the question');
      assert.equal(await g.page.locator('[data-testid="told-opt-1"]').count(), 0, 'one option only');
      assert.ok(((await g.page.locator('[data-testid="told-opt-0"]').textContent()) ?? '').includes(OPTION_SA), `the option in Sanskrit: ${OPTION_SA}`);
      await expectNoLatin(g, 'the herbs question');
      await shot(g, 'v06-d-ask-sa-390');
      // the clock waits on the question
      const step = await root(g).getAttribute('data-step');
      await g.page.waitForTimeout(600);
      assert.equal(await root(g).getAttribute('data-step'), step, 'the question waits');
      // watch the kit while the rest plays (the flash and the shake as the peak tears)
      const kit = new Set<string>();
      const watch = setInterval(() => {
        void root(g)
          .getAttribute('data-kit', { timeout: 200 })
          .then((k) => (k ?? '').split(',').filter(Boolean).forEach((x) => kit.add(x)))
          .catch(() => undefined);
      }, 30);
      await g.tap('told-opt-0');
      await expectStoryGoesOn(g);
      clearInterval(watch);
      const log = await cutLog(g);
      for (const e of [`told|start|${ID}`, 'told|ask|0', 'told|answer|0|0', 'told|done|played']) assert.ok(log.includes(e), `log has ${e}: ${log.slice(-10).join(' ')}`);
      assert.deepEqual(shotsIn(log), ['north', 'himalaya', 'search', 'hidden', 'roar', 'lift', 'sea', 'revive'], 'every shot once, in order');
      assert.ok(log.indexOf('told|answer|0|0') < log.findIndex((e) => /^told\|step\|\d+\|scene$/.test(e) && shotsIn([e])[0] === 'lift'), 'the mountain is lifted after the choice');
      assert.ok(kit.has('flash'), `the flash as the peak tears (${[...kit].join(',')})`);
      await expectNoLatin(g, 'the story after the scene');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 D: reduced motion — the painter’s 2D stills (no WebGL canvas; a different picture once the herbs hide); the question answered with the key 1; English at 360×640',
    skip: ready ? false : 'needs a calm Kathā save and the herbs cutscene',
    timeout: 120_000,
    run: async ({ open }) => {
      const g = await openCalm(open, 'en', SMALL);
      await startHerbs(g, 4);
      assert.equal(await root(g).getAttribute('data-mode'), '2d', 'reduced motion: the 2D still');
      assert.equal(await g.page.locator('[data-testid="told-gl"]').count(), 0, 'no WebGL canvas');
      await g.page.locator('[data-testid="told-say"]').waitFor({ timeout: 30_000 });
      const first = await canvas2d(g);
      assert.ok(Number(first.split(':')[0]) >= 6, `the still is painted (${first})`);
      assert.ok(((await g.page.locator('[data-testid="told-say"]').textContent()) ?? '').includes('Himalaya'), 'the first line (English)');
      await waitAsk(g);
      const atAsk = await canvas2d(g);
      assert.notEqual(atAsk, first, 'another still once the herbs hide');
      assert.ok(((await g.page.locator('[data-testid="told-ask"]').textContent()) ?? '').includes('What will Hanuman do now?'));
      await shot(g, 'v06-d-reduced-ask-en-360');
      await g.page.keyboard.press('1');
      await expectStoryGoesOn(g);
      const log = await cutLog(g);
      assert.ok(log.includes('told|answer|0|0') && log.includes('told|done|played'), log.slice(-6).join(' '));
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 D: no WebGL → the 2D still with motion on; skip at the question asks first (No keeps the question, Yes ends the scene: seen.herbs, no answer, the story goes on)',
    skip: ready ? false : 'needs a calm Kathā save and the herbs cutscene',
    timeout: 120_000,
    run: async ({ open }) => {
      const g = await openCalm(open, 'en', SMALL, { motion: true, noWebgl: true });
      await startHerbs(g, 4);
      await g.page.locator('[data-testid="told"][data-mode="2d"]').waitFor({ timeout: 5000 });
      assert.equal(await g.page.locator('[data-testid="told-gl"]').count(), 0, 'no WebGL canvas once the scene could not start');
      await waitAsk(g);
      await g.tap('told-skip');
      await g.page.locator('[data-testid="told-skip-ask"]').waitFor();
      await g.tap('told-skip-no');
      assert.equal(await g.page.locator('[data-testid="told-skip-ask"]').count(), 0);
      assert.equal(await root(g).getAttribute('data-ask'), 'true', 'No: the question is still there');
      await g.tap('told-skip');
      await g.tap('told-skip-yes');
      await expectStoryGoesOn(g);
      const log = await cutLog(g);
      assert.ok(log.includes('told|skip') && log.includes('told|done|skipped'), log.slice(-6).join(' '));
      assert.ok(!log.some((e) => e.startsWith('told|answer')), 'no answer given');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 D: skip from the Himālaya in 3D — Esc at the question asks first; Yes flies back to the battle frame (rotate-in → done) and the story goes on',
    skip: ready ? false : 'needs a calm Kathā save and the herbs cutscene',
    timeout: 120_000,
    run: async ({ open }) => {
      const g = await openCalm(open, 'sa', TALL, { motion: true });
      await startHerbs(g, 4);
      assert.equal(await root(g).getAttribute('data-mode'), '3d');
      await waitAsk(g);
      await g.page.keyboard.press('Escape');
      await g.page.locator('[data-testid="told-skip-ask"]').waitFor();
      await expectNoLatin(g, 'the skip question');
      await g.tap('told-skip-yes');
      await g.page.locator('[data-testid="told"][data-phase="rotate-in"]').waitFor({ timeout: 10_000 });
      assert.ok((await glColours(g)) >= 3, 'the battle frame comes back in 3D');
      await expectStoryGoesOn(g);
      const log = await cutLog(g);
      assert.ok(log.includes('told|done|skipped'));
      assert.ok(!shotsIn(log).includes('lift'), 'skipped before the lift');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 D: screenshots (RY_SHOTS) — every shot of the 3D scene at normal speed (390×844, संस्कृतम्) and the reduced-motion stills',
    skip: SHOTS && ready ? false : 'set RY_SHOTS=<dir> to take the screenshot sequence',
    timeout: 300_000,
    run: async ({ open }) => {
      const take = async (g: GameSession, tag: string, delays: number[]): Promise<void> => {
        // a picture shortly after each shot starts (and one in the rotate-out and the rotate-in)
        const seen = new Set<string>();
        for (let i = 0; i < 2400; i++) {
          const ph = await root(g).getAttribute('data-phase', { timeout: 1000 }).catch(() => null);
          if (!ph) break;
          const log = await cutLog(g);
          const shots = shotsIn(log);
          const key = ph === 'scene' ? (shots.at(-1) ?? 'start') : ph;
          if (!seen.has(key) && (ph !== 'flat' || i > 3)) {
            seen.add(key);
            await g.page.waitForTimeout(delays[seen.size % delays.length] ?? 900);
            await shot(g, `${tag}-${String(seen.size).padStart(2, '0')}-${key}`);
          }
          if ((await root(g).getAttribute('data-ask', { timeout: 500 }).catch(() => null)) === 'true') {
            await shot(g, `${tag}-ask`);
            await g.tap('told-opt-0');
          }
          await g.page.waitForTimeout(60);
        }
      };
      const g = await openCalm(open, 'sa', TALL, { motion: true });
      await startHerbs(g, 1);
      await take(g, 'v06-d-3d-sa', [1800, 1500, 2200]);
      g.expectClean();
      await g.close();
      const r = await openCalm(open, 'en', TALL);
      await startHerbs(r, 1);
      await take(r, 'v06-d-still-en', [600]);
      r.expectClean();
      await r.close();
    },
  },
];
