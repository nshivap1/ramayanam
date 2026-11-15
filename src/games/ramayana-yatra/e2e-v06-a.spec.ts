/**
 * v0.6 browser tests of WP-A (OWNER: v0.6 WP-A; notes/v06-ownership.md, notes/v06-a.md): Bāla and Ayodhyā.
 *   1. the Mithilā told cutscene (Kathā, संस्कृतम्, 390×844, motion on): its title and lines in Sanskrit, Ahalyā found
 *      at the hermitage (her verse), the bow lifted and broken (flash, shake, all fall but four, rise), the wedding
 *      (petals), Paraśurāma; every verse heard; seen.mithila; the replay in the verse book; no Latin
 *   2. the sandals at Citrakūṭa (Kathā, संस्कृतम्, 360×640): Bharata comes, Rāma's consolation, the sandals placed, the
 *      gold wash, the verse, Bharata carries them on his head; the stage is gone when the scene ends; no Latin
 *   3. reduced motion, English: the Mithilā cutscene as a still; skip asks first; skipped = seen, its main-path verses
 *      heard, Ahalyā not found (a player who passes by never meets her)
 * Run only these:
 *   node tools/build.mjs --outdir=.e2e/a --only=ramayana-yatra --no-sw
 *   SAMSKURU_E2E=1 SAMSKURU_DIST=.e2e/a node --import tsx --test --test-concurrency=1 --test-name-pattern="v0.6 A" src/games/ramayana-yatra/e2e.spec.ts
 */
import assert from 'node:assert/strict';
import { type E2eCase, type Snap, Bot, CONTENT, continueToExplore, expectNoLatin, kathaFrom, planAt, reloadWith, shot } from './e2e-kit.spec';
import type { GameSession } from '../../../tests/e2e/harness';

const MAIN = ['s-aropayitva', 's-nipetush', 's-iyam-sita', 's-purayasva', 's-aropya', 's-madhuhantaram'];
const calmPlan = planAt(CONTENT, 1, CONTENT.walkthrough[0]?.map ?? '', 5, ['player', 'rama', 'lakshmana']);
const calm = calmPlan ? kathaFrom(calmPlan.save, 1) : null;
const chitraPlan = planAt(CONTENT, 2, 'chitrakuta', 9, ['player', 'rama', 'lakshmana']);
const chitra = chitraPlan ? kathaFrom({ ...chitraPlan.save, flags: { ...chitraPlan.save.flags, 'ch2.at_chitrakuta': true } }, 1) : null;
const mithila = CONTENT.cutscenes?.find((c) => c.id === 'mithila' && !c.stub);

async function openKatha(open: Parameters<E2eCase['run']>[0]['open'], save: unknown, lang: 'en' | 'sa', vp: { width: number; height: number }, reduced: boolean, seed: number): Promise<GameSession> {
  const g = await open({ seed, viewport: vp });
  if (!reduced) await g.page.emulateMedia({ reducedMotion: 'no-preference' });
  await reloadWith(g, save, lang);
  await continueToExplore(g);
  return g;
}

async function startMithila(g: GameSession, speed: number): Promise<void> {
  const ran = await g.page.evaluate((sp) => {
    const w = window as unknown as { __ryScript: (x: unknown) => boolean; __ryCutsceneSpeed?: number; __ryCutsceneLog?: string[] };
    w.__ryCutsceneSpeed = sp;
    w.__ryCutsceneLog = [];
    return w.__ryScript([{ if: 'style.katha', then: [{ cutscene: 'mithila' }] }]);
  }, speed);
  assert.ok(ran, 'the e2e script hook ran from a calm moment');
  await g.waitForState("s => s.pending === 'cutscene' && !!s.told && s.told.id === 'mithila'");
}

/** Lines of the Mithilā cutscene to screenshot (RY_SHOTS) when on screen. */
const SHOT_LINES: [string, string][] = [
  ['Rama steps inside. There shines Ahalya, the wife of the sage Gautama. For a long time no one could see her.', 'v06-a-mithila-ahalya-sa-390'],
  ['Janaka brings Sita in all her jewels. She stands before the fire, in front of Rama.', 'v06-a-mithila-wedding-sa-390'],
  ['Sage, your anger is over now. Grant safety to my young sons!', 'v06-a-mithila-parashurama-sa-390'],
];

const cutLog = (g: GameSession): Promise<string[]> => g.page.evaluate(() => (window as unknown as { __ryCutsceneLog?: string[] }).__ryCutsceneLog ?? []);

export const V06_A: E2eCase[] = [
  {
    name: 'v0.6 A: the Mithilā told cutscene — Ahalyā found, the bow breaks (all fall but four), the wedding, Paraśurāma; every verse heard; replay; Kathā in संस्कृतम् at 390×844, no Latin',
    skip: calm && mithila ? false : 'needs a calm chapter-1 save and cutscene-mithila.json',
    timeout: 240_000,
    run: async ({ open }) => {
      assert.ok(calm);
      const g = await openKatha(open, calm, 'sa', { width: 390, height: 844 }, false, 71);
      await startMithila(g, 6);
      const root = g.page.locator('[data-testid="told"]');
      await root.waitFor();
      await g.page.locator('[data-testid="told-say"]').waitFor({ timeout: 15_000 });
      const title = (await g.page.locator('[data-testid="told-title"]').textContent()) ?? '';
      assert.ok(title.includes(CONTENT.dialogueSa?.['Mithila'] ?? '?'), `the title in Sanskrit: ${title}`);
      await expectNoLatin(g, 'the Mithilā cutscene');
      // watch the stage while the bot plays it (it taps the hidden hotspot)
      const kitSeen = new Set<string>();
      const versesSeen = new Set<string>();
      let shotTaken = false;
      const shotsTaken = new Set<string>();
      const watch = setInterval(() => {
        void root
          .getAttribute('data-kit', { timeout: 200 })
          .then((k) => (k ?? '').split(',').filter(Boolean).forEach((x) => kitSeen.add(x)))
          .catch(() => undefined);
        void g.page
          .locator('[data-testid="told-verse"]')
          .getAttribute('data-verse', { timeout: 200 })
          .then((id) => id && versesSeen.add(id))
          .catch(() => undefined);
        if (!shotTaken && kitSeen.has('shake')) {
          shotTaken = true;
          void shot(g, 'v06-a-mithila-bow-sa-390').catch(() => undefined);
        }
        // screenshots of the other shots (RY_SHOTS only): Ahalyā, the wedding, Paraśurāma
        void g.page
          .locator('[data-testid="told-say"]')
          .textContent({ timeout: 200 })
          .then((t) => {
            for (const [en, name] of SHOT_LINES) if (t && !shotsTaken.has(name) && t.includes(CONTENT.dialogueSa?.[en] ?? '\u0000')) {
              shotsTaken.add(name);
              void shot(g, name).catch(() => undefined);
            }
          })
          .catch(() => undefined);
      }, 40);
      const bot = new Bot(g, { findHidden: true });
      await bot.handle(await bot.snap());
      clearInterval(watch);
      await g.waitForState("s => s.pending !== 'cutscene'");
      const s = await g.state<Snap>();
      for (const f of ['seen.mithila', 'found.mithila.ahalya']) assert.ok(s.flags.includes(f), `flag ${f}`);
      for (const id of ['s-ahalya', ...MAIN]) assert.ok(s.heard.includes(id), `${id} heard`);
      const log = await cutLog(g);
      for (const e of ['told|start|mithila', 'told|hotspot|ahalya', 'told|found|ahalya']) assert.ok(log.includes(e), `log has ${e}: ${log.slice(-12).join(' ')}`);
      assert.ok(log.some((x) => x.startsWith('told|done|')), 'the scene ended');
      for (const k of ['flash', 'shake', 'petals']) assert.ok(kitSeen.has(k), `${k} on the stage (${[...kitSeen].join(',')})`);
      if (versesSeen.size) for (const id of ['s-aropayitva', 's-madhuhantaram']) assert.ok(versesSeen.has(id), `${id} shown (${[...versesSeen].join(',')})`);
      // the verse book offers the replay
      await bot.playUntil((x) => x.phase === 'explore' && !x.pending);
      await g.tap('btn-menu');
      await g.page.locator('[data-testid="menu"]').waitFor();
      await g.tap('tab-verses');
      await g.page.locator('[data-testid="told-replay-mithila"]').waitFor();
      await expectNoLatin(g, 'verse book with the Mithilā replay');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 A: the sandals at Chitrakuta — Rama comforts Bharata, the golden sandals are set down, Bharata carries them on his head; the stage clears; Kathā in संस्कृतम् at 360×640, no Latin',
    skip: chitra ? false : 'needs a chapter-2 save at Chitrakuta',
    timeout: 180_000,
    run: async ({ open }) => {
      assert.ok(chitra);
      const g = await openKatha(open, chitra, 'sa', { width: 360, height: 640 }, false, 72);
      const bot = new Bot(g);
      let placed = false;
      let gold = false;
      let carried = false;
      let consoled = false;
      const s = await bot.playUntil((x) => {
        if (x.pending === 'shloka' && x.shloka === 's-kshayanta') consoled = true;
        if (x.stage?.props['paduka']) placed = true;
        if (x.stage?.tint === 'gold') gold = true;
        if (x.pending === 'say' && /places the sandals on his head/.test(x.say ?? '')) carried = x.stage?.props['paduka']?.carry === 'bharata';
        return x.flags.includes('ch2.bharata_done') && x.phase === 'explore' && !x.pending;
      });
      assert.ok(consoled, 'Rama’s consolation (2.105.16) is heard');
      assert.ok(placed && gold, 'the sandals are placed in a golden light');
      assert.ok(carried, 'Bharata carries the sandals on his head');
      assert.ok(s.heard.includes('s-paduke') && s.heard.includes('s-kshayanta'));
      assert.ok(!s.stage, 'the stage is cleared');
      await expectNoLatin(g, 'Chitrakuta after the sandals');
      await shot(g, 'v06-a-sandals-after-sa-360');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 A: reduced motion — the Mithilā cutscene as a still; skip asks first; skipped = seen with its main-path verses heard, Ahalyā not found; English at 360×640',
    skip: calm && mithila ? false : 'needs a calm chapter-1 save and cutscene-mithila.json',
    timeout: 120_000,
    run: async ({ open }) => {
      assert.ok(calm);
      const g = await openKatha(open, calm, 'en', { width: 360, height: 640 }, true, 73);
      await startMithila(g, 2);
      const root = g.page.locator('[data-testid="told"]');
      await root.waitFor();
      assert.equal(await root.getAttribute('data-mode'), '2d', 'reduced motion: the 2D stage');
      await g.page.locator('[data-testid="told-say"]').waitFor({ timeout: 10_000 });
      await shot(g, 'v06-a-mithila-reduced-en-360');
      await g.tap('told-skip');
      await g.page.locator('[data-testid="told-skip-ask"]').waitFor();
      await g.tap('told-skip-yes');
      await g.waitForState("s => s.pending !== 'cutscene'");
      const s = await g.state<Snap>();
      assert.ok(s.flags.includes('seen.mithila'), 'a skipped scene counts as seen');
      assert.ok(!s.flags.includes('found.mithila.ahalya') && !s.heard.includes('s-ahalya'), 'Ahalyā stays hidden');
      for (const id of MAIN) assert.ok(s.heard.includes(id), `${id} heard`);
      assert.ok((await cutLog(g)).includes('told|done|skipped'));
      g.expectClean();
      await g.close();
    },
  },
];
