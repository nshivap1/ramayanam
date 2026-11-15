/**
 * v0.6 WP0 browser tests (OWNER: WP0 / orchestrator; notes/v06-wp0.md): the effects kit, hidden moments and told
 * cutscenes through the real UI, before any package content uses them — a test cutscene is registered at run time
 * (window.__ryTold, e2e only) and played from window.__ryScript. Its lines are story lines that already have their
 * Sanskrit (so the संस्कृतम् no-Latin sweep holds); its verse is a v0.5 verse.
 *   1. told cutscene (Kathā, संस्कृतम्, 390×844, motion on): the title, a line, the hotspot found (its line plays), the
 *      verse with its pādas lit, the kit on the stage (flash, shake, all but two fall, rise, a prop carried, an arrow,
 *      petals), the question answered (the second option: its flag and line), the cast walks; cutscene-done → flags; the
 *      story goes on; the verse book offers the replay, which plays and can be skipped (with a confirmation)
 *   2. the kit on the map + a hotspot (Kathā, English, 360×640): stage state, the kit fx log and the canvas's data-kit;
 *      the stage is cleared when the script ends; a hotspot passed by ▶, then found with A (its flag, its line)
 *   3. reduced motion (the harness default): the told cutscene still plays (2D still, effects' still paths), a skip
 *      asks first (No keeps playing; Yes ends it: seen, the story goes on)
 */
import assert from 'node:assert/strict';
import { type E2eCase, type Snap, Bot, CONTENT, continueToExplore, expectNoLatin, kathaFrom, planAt, reloadWith, shot } from './e2e-kit.spec';
import type { ToldCutscene } from './types';
import type { GameSession } from '../../../tests/e2e/harness';

const calmPlan = planAt(CONTENT, 1, CONTENT.walkthrough[0]?.map ?? '', 5, ['player', 'rama', 'lakshmana']);
const calm = calmPlan ? kathaFrom(calmPlan.save, 1) : null;
const has = (en: string): boolean => !!CONTENT.dialogueSa?.[en];
const L = {
  title: 'Rama finds a friend in Sugriva, and the search begins.',
  line: 'The princes of Ayodhya go to the forest.',
  hidden: 'A golden deer appears in the forest.',
  ask: 'Her mouth is vast now. What should Hanuman do?',
  opt0: 'Grow larger again!',
  opt1: 'Become tiny!',
  after: 'Suddenly Hanuman becomes as small as a thumb.',
  next: 'Ravana. The king of the rakshasas.',
};
const linesOk = Object.values(L).every(has);
const VERSE = 's-ma-nishada';

const TEST_SCENE: ToldCutscene = {
  version: 1,
  id: 'wp0test',
  chapter: 1,
  title: L.title,
  painter: 'plain',
  source: 'WP0 browser test',
  steps: [
    { scene: 'forest' },
    { cast: 'rama', sprite: 'rama', at: { x: 6, y: 8 }, face: 'right' },
    { cast: 'lak', sprite: 'lakshmana', at: { x: 4, y: 8 }, face: 'right' },
    { cast: 'v1', sprite: 'villager_m', at: { x: 12, y: 8 }, face: 'left' },
    { cast: 'v2', sprite: 'villager_f', at: { x: 14, y: 8 }, face: 'left' },
    { say: L.line },
    { hotspot: 'deer', at: [15, 4, 4, 4], ms: 12000, then: [{ say: L.hidden }] },
    { verse: VERSE, padas: [0, 1] },
    { fx: 'flash' },
    { fx: 'shake', ms: 900 },
    { topple: { allBut: ['rama', 'lak'] } },
    { wait: 900 },
    { rise: 'all' },
    { prop: 'gift', sprite: 'flowers_red', at: { x: 10, y: 8 } },
    { prop: 'gift', carry: 'rama' },
    { arrow: { from: 'rama', to: { x: 19, y: 8 } } },
    { fx: 'petals', ms: 2500 },
    { ask: L.ask, options: [{ label: L.opt0 }, { label: L.opt1, set: 'wp0.tiny', then: [{ say: L.after }] }] },
    { cast: 'rama', to: { x: 9, y: 8 }, ms: 800 },
    { say: L.line },
  ],
};

/** Open the calm Kathā save in `lang` at `vp`; motion on unless `reduced` (the harness emulates reduced motion). */
async function openCalm(open: Parameters<E2eCase['run']>[0]['open'], lang: 'en' | 'sa', vp: { width: number; height: number }, reduced: boolean, seed = 61): Promise<GameSession> {
  assert.ok(calm);
  const g = await open({ seed, viewport: vp });
  if (!reduced) await g.page.emulateMedia({ reducedMotion: 'no-preference' });
  await reloadWith(g, calm, lang);
  await continueToExplore(g);
  return g;
}

async function register(g: GameSession, speed: number): Promise<void> {
  const ok = await g.page.evaluate(([c, sp]) => {
    const w = window as unknown as { __ryTold: (x: unknown) => boolean; __ryCutsceneSpeed?: number; __ryCutsceneLog?: string[] };
    w.__ryCutsceneSpeed = sp as number;
    w.__ryCutsceneLog = [];
    return w.__ryTold(c);
  }, [TEST_SCENE, speed] as const);
  assert.ok(ok, 'the e2e cutscene hook registered the scene');
}

async function script(g: GameSession, cmds: unknown[]): Promise<void> {
  const ran = await g.page.evaluate((c) => (window as unknown as { __ryScript: (x: unknown) => boolean }).__ryScript(c), cmds);
  assert.ok(ran, 'the e2e script hook ran from a calm moment');
  // the exposed state follows the script one render later: wait for it, or a bot reads the old explore state and walks
  await g.waitForState("s => s.phase !== 'explore' || !!s.pending");
}

const cutLog = (g: GameSession): Promise<string[]> => g.page.evaluate(() => (window as unknown as { __ryCutsceneLog?: string[] }).__ryCutsceneLog ?? []);

export const V06_WP0: E2eCase[] = [
  {
    name: 'v0.6 WP0: a told cutscene — title, line, the hotspot found, the verse lit, the kit on the stage, the question answered; flags; the story goes on; replay from the verse book; Kathā in संस्कृतम् at 390×844, no Latin',
    skip: calm && linesOk ? false : 'needs a calm chapter-1 save and the test lines in the dialogue TM',
    timeout: 180_000,
    run: async ({ open }) => {
      const g = await openCalm(open, 'sa', { width: 390, height: 844 }, false);
      await register(g, 5);
      await script(g, [{ if: 'style.katha', then: [{ cutscene: TEST_SCENE.id }, { say: L.next }] }]);
      await g.waitForState("s => s.pending === 'cutscene' && s.told && s.told.id === 'wp0test' && !s.told.replay");
      const root = g.page.locator('[data-testid="told"]');
      await root.waitFor();
      assert.equal(await root.getAttribute('data-replay'), 'false');
      // the title and the first line, in Sanskrit
      await g.page.locator('[data-testid="told-say"]').waitFor({ timeout: 10_000 });
      const title = (await g.page.locator('[data-testid="told-title"]').textContent()) ?? '';
      assert.ok(title.includes(CONTENT.dialogueSa?.[L.title] ?? '?'), `the title in Sanskrit: ${title}`);
      await expectNoLatin(g, 'told cutscene');
      await shot(g, 'v06-wp0-told-sa-390');
      // watch the stage while the bot plays it (finds the hotspot, answers the second option)
      const kitSeen = new Set<string>();
      let verseSeen = false;
      const watch = setInterval(() => {
        void root
          .getAttribute('data-kit', { timeout: 200 })
          .then((k) => (k ?? '').split(',').filter(Boolean).forEach((x) => kitSeen.add(x)))
          .catch(() => undefined);
        void g.page
          .locator('[data-testid="told-pada-0"]')
          .count()
          .then((n) => (verseSeen ||= n > 0))
          .catch(() => undefined);
      }, 40);
      const bot = new Bot(g, { findHidden: true, toldAnswer: () => 1 });
      await bot.handle(await bot.snap());
      clearInterval(watch);
      await g.waitForState(`s => s.pending === 'say' && s.say === ${JSON.stringify(L.next)}`);
      const s = await g.state<Snap>();
      for (const f of ['seen.wp0test', 'found.wp0test.deer', 'wp0.tiny']) assert.ok(s.flags.includes(f), `flag ${f}`);
      assert.ok(s.heard.includes(VERSE));
      const log = await cutLog(g);
      for (const e of ['told|start|wp0test', 'told|hotspot|deer', 'told|found|deer', 'told|ask|0', 'told|answer|0|1', 'told|done|played']) assert.ok(log.includes(e), `log has ${e}: ${log.slice(-12).join(' ')}`);
      assert.ok(verseSeen, 'the verse was shown with its pādas');
      for (const k of ['flash', 'petals']) assert.ok(kitSeen.has(k), `${k} on the stage (${[...kitSeen].join(',')})`);
      // the story goes on; the verse book offers the replay
      await bot.handle(await bot.snap());
      await g.waitForState("s => s.phase === 'explore' && !s.pending");
      await g.tap('btn-menu');
      await g.page.locator('[data-testid="menu"]').waitFor();
      await g.tap('tab-verses');
      await g.page.locator('[data-testid="told-replay-wp0test"]').waitFor();
      await expectNoLatin(g, 'verse book with the replay');
      await g.tap('told-replay-wp0test');
      await g.waitForState("s => !!s.told && s.told.replay === true");
      await g.page.locator('[data-testid="told"][data-replay="true"]').waitFor();
      await g.tap('told-skip');
      await g.tap('told-skip-yes');
      await g.waitForState('s => !s.told && s.menu === true');
      assert.equal(await g.page.locator('[data-testid="tab-verses"]').getAttribute('aria-selected'), 'true', 'back to the verse book');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 WP0: the effects kit on the map (all but one fall — the player too —, flash, petals, a prop carried, an arrow; cleared when the script ends) and a hotspot passed, then found; Kathā in English at 360×640',
    skip: calm ? false : 'needs a calm chapter-1 save',
    timeout: 120_000,
    run: async ({ open }) => {
      const g = await openCalm(open, 'en', { width: 360, height: 640 }, false);
      const s0 = await g.state<Snap>();
      const npc = s0.npcs[0];
      assert.ok(npc, 'an npc on the start map');
      await script(g, [
        {
          if: 'style.katha',
          then: [
            { topple: { allBut: [npc.id] } },
            { fx: 'flash' },
            { fx: 'petals', ms: 6000 },
            { prop: 'gift', sprite: 'flowers_red', at: 'player' },
            { prop: 'gift', carry: 'player' },
            { arrow: { from: 'player', to: { x: s0.x + 4, y: s0.y } } },
            { grow: npc.id, scale: 2 },
            { say: L.line },
          ],
        },
      ]);
      await g.waitForState(`s => s.pending === 'say' && !!s.stage`);
      const s = await g.state<Snap>();
      assert.ok(s.stage?.down.includes('player'), 'the player fell too');
      assert.ok(!s.stage?.down.includes(npc.id), `${npc.id} stands`);
      assert.equal(s.stage?.scale[npc.id], 2);
      assert.equal(s.stage?.props['gift']?.carry, 'player');
      for (const k of ['flash', 'petals', 'arrow']) assert.ok(s.kitLog?.includes(k), `kit log has ${k}: ${s.kitLog?.join(',')}`);
      await g.page.waitForFunction(() => (document.querySelector('canvas[data-testid="screen"]')?.getAttribute('data-kit') ?? '').includes('petals'), null, { timeout: 3000 });
      await shot(g, 'v06-wp0-kit-en-360');
      await g.tap('advance');
      await g.page.waitForTimeout(200);
      if ((await g.state<Snap>()).pending === 'say') await g.tap('advance');
      await g.waitForState('s => s.phase === "explore" && !s.pending && !s.stage');
      // a hidden moment: passed by ▶ …
      const hs = (flag: string): unknown[] => [{ if: 'style.katha', then: [{ say: L.line }, { hotspot: { x: s0.x, y: s0.y - 1 }, ms: 15000, flag, then: [{ say: L.hidden }] }, { say: L.next }] }];
      await script(g, hs('wp0.spot1'));
      const pass = new Bot(g);
      await pass.playUntil((x) => x.pending === 'hotspot');
      await g.page.locator('[data-testid="panel-hotspot"]').waitFor();
      assert.deepEqual((await g.state<Snap>()).hotspot, { x: s0.x, y: s0.y - 1, ms: 15000 });
      await pass.handle(await pass.snap());
      await g.waitForState(`s => s.pending === 'say' && s.say === ${JSON.stringify(L.next)}`);
      assert.ok(!(await g.state<Snap>()).flags.includes('wp0.spot1'), 'passed: no flag');
      await pass.playUntil((x) => x.phase === 'explore' && !x.pending);
      // … and found with a tap on the scene
      await script(g, hs('wp0.spot2'));
      const find = new Bot(g, { findHidden: true });
      await find.playUntil((x) => x.pending === 'hotspot');
      await find.handle(await find.snap());
      await g.waitForState(`s => s.pending === 'say' && s.say === ${JSON.stringify(L.hidden)}`);
      assert.ok((await g.state<Snap>()).flags.includes('wp0.spot2'), 'found: its flag');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 WP0: reduced motion — a told cutscene plays as a 2D still with the effects’ still paths; skip asks first (No keeps it playing, Yes ends it: seen, the story goes on)',
    skip: calm && linesOk ? false : 'needs a calm chapter-1 save and the test lines',
    timeout: 120_000,
    run: async ({ open }) => {
      const g = await openCalm(open, 'en', { width: 360, height: 640 }, true);
      await register(g, 2);
      await script(g, [{ if: 'style.katha', then: [{ cutscene: TEST_SCENE.id }, { say: L.next }] }]);
      const root = g.page.locator('[data-testid="told"]');
      await root.waitFor();
      assert.equal(await root.getAttribute('data-mode'), '2d', 'reduced motion: the 2D stage');
      await g.page.locator('[data-testid="told-say"]').waitFor({ timeout: 10_000 });
      await shot(g, 'v06-wp0-told-reduced-en-360');
      await g.tap('told-skip');
      await g.page.locator('[data-testid="told-skip-ask"]').waitFor();
      await g.tap('told-skip-no');
      assert.equal(await g.page.locator('[data-testid="told-skip-ask"]').count(), 0, 'No: it goes on');
      assert.equal((await g.state<Snap>()).pending, 'cutscene');
      await g.tap('told-skip');
      await g.tap('told-skip-yes');
      await g.waitForState(`s => s.pending === 'say' && s.say === ${JSON.stringify(L.next)}`);
      const s = await g.state<Snap>();
      assert.ok(s.flags.includes('seen.wp0test'), 'a skipped scene counts as seen');
      assert.ok(!s.flags.includes('wp0.tiny'), 'no answer given: no option flag');
      assert.ok((await cutLog(g)).includes('told|done|skipped'));
      g.expectClean();
      await g.close();
    },
  },
];
