/**
 * v0.6 browser tests of WP-C (OWNER: v0.6 WP-C; notes/v06-ownership.md, notes/v06-c.md): Sundara and Yuddha (the launch, the honey grove, the Ocean rises, waking Kumbhakarṇa, two counsellors, verse echoes).
 *   1. the launch from Mahendra (Kathā, संस्कृतम्, 360×640, motion on): the hold (shake), 5.1.39 heard, the flight like
 *      Rāma's arrow (arrow + flash), the उत्तिष्ठ echo toast (4.66.36 heard before); no Latin
 *   2. the Ocean rises (Kathā, English, 390×844): the sea darkens, Sāgara rises out of the water (a prop), 6.22.17 heard,
 *      the stage clears; Nala never says "Rāma's name on every stone" — and neither does the practice journey
 *   3. waking Kumbhakarṇa (told cutscene, संस्कृतम्, 390×844): its title in Sanskrit, the shake, the drum gag found by a
 *      player who looks; then reduced motion in English: a still, skip asks first, skipped = seen, the gag not found
 *   4. hidden moments (Kathā, संस्कृतम्, 360×640): the two counsellors at Vibhīṣaṇa's arrival (look closer → Mārīca's
 *      verse again, the counsellors echo) and the honey grove at the news from Laṅkā (look closer → the dance, then
 *      5.64.28 and the कौसल्या सुप्रजा echo); both run from the real story blocks; no Latin
 * Run only these:
 *   node tools/build.mjs --outdir=.e2e/c --only=ramayana-yatra --no-sw
 *   SAMSKURU_E2E=1 SAMSKURU_DIST=.e2e/c node --import tsx --test --test-concurrency=1 --test-name-pattern="v0.6 C" src/games/ramayana-yatra/e2e.spec.ts
 */
import assert from 'node:assert/strict';
import { type E2eCase, type Snap, Bot, CONTENT, continueToExplore, expectNoLatin, kathaFrom, planAt, reloadWith, shot } from './e2e-kit.spec';
import type { GameSession } from '../../../tests/e2e/harness';
import { uiEn } from './sa-ui';
import type { EventCmd } from './types';

type Save = NonNullable<ReturnType<typeof planAt>>['save'];
const withFlags = (save: Save, flags: string[]): Save => ({ ...save, flags: { ...save.flags, ...Object.fromEntries(flags.map((f) => [f, true])) } });

const leapPlan = planAt(CONTENT, 5, 'ocean_leap', 22, ['player', 'rama', 'lakshmana', 'hanuman', 'sugriva', 'jambavan']);
const shorePlan = planAt(CONTENT, 6, 'setu_shore', 30, ['player', 'rama', 'lakshmana', 'hanuman', 'jambavan']);
const fieldPlan = planAt(CONTENT, 6, 'lanka_battlefield', 32, ['player', 'rama', 'lakshmana', 'hanuman', 'jambavan', 'vibhishana']);
const kumbha = CONTENT.cutscenes?.find((c) => c.id === 'kumbhakarna' && !c.stub);
const NAME_STONES = /name on every stone/;

async function openAs(open: Parameters<E2eCase['run']>[0]['open'], save: unknown, lang: 'en' | 'sa', vp: { width: number; height: number }, reduced: boolean, seed: number): Promise<GameSession> {
  const g = await open({ seed, viewport: vp });
  if (!reduced) await g.page.emulateMedia({ reducedMotion: 'no-preference' });
  await reloadWith(g, save, lang);
  await continueToExplore(g);
  return g;
}

/** The Kathā blocks of an event (real content) that hold this command kind / verse. */
function kathaBlock(eventId: string, has: (json: string) => boolean): EventCmd[] {
  const out: EventCmd[][] = [];
  const walk = (cmds: EventCmd[] | undefined): void => {
    for (const c of cmds ?? []) {
      if ('if' in c && c.if === 'style.katha' && has(JSON.stringify(c.then))) out.push(c.then);
      const o = c as unknown as Record<string, EventCmd[] | undefined>;
      for (const k of ['then', 'else', 'onWin', 'onLose', 'onCorrect', 'onWrong']) walk(o[k]);
    }
  };
  walk(CONTENT.events.find((e) => e.id === eventId)?.cmds);
  const inner = out.filter((b) => !out.some((o) => o !== b && JSON.stringify(b).includes(JSON.stringify(o))));
  assert.equal(inner.length, 1, `${eventId}: one Kathā block`);
  return inner[0]!;
}

async function runScript(g: GameSession, cmds: EventCmd[]): Promise<void> {
  const ok = await g.page.evaluate((c) => (window as unknown as { __ryScript: (x: unknown) => boolean }).__ryScript([{ if: 'style.katha', then: c }]), cmds);
  assert.ok(ok, 'the e2e script hook ran from a calm moment');
  await g.waitForState('s => s.pending !== null');
}

export const V06_C: E2eCase[] = [
  {
    name: 'v0.6 C: the launch from Mahendra — the hold, 5.1.39, the flight like Rāma’s arrow, the उत्तिष्ठ echo; Kathā in संस्कृतम् at 360×640, no Latin',
    skip: leapPlan ? false : 'needs a chapter-5 save at the ocean',
    timeout: 150_000,
    run: async ({ open }) => {
      assert.ok(leapPlan);
      const save = kathaFrom(withFlags(leapPlan.save, ['heard.s-uttishtha-hari']), 1);
      const g = await openAs(open, save, 'sa', { width: 360, height: 640 }, false, 81);
      const bot = new Bot(g);
      let verseSaid = false;
      const s = await bot.playUntil((x) => {
        if (x.pending === 'shloka' && x.shloka === 's-yatha-raghava') verseSaid = true;
        return x.flags.includes('ch5.started') && x.phase === 'explore' && !x.pending;
      });
      assert.ok(verseSaid, '5.1.39 is shown');
      assert.ok(s.heard.includes('s-yatha-raghava'));
      const kit = s.kitLog ?? [];
      for (const k of ['shake', 'arrow', 'flash']) assert.ok(kit.includes(k), `${k} fired (${kit.join(',')})`);
      assert.ok(s.flags.includes('echo.uttishtha'), 'the उत्तिष्ठ echo is noticed');
      assert.ok((s.toasts ?? []).some((t) => t.includes(uiEn(CONTENT, 'v06c.echo.uttishtha'))), `the echo toast (${(s.toasts ?? []).join(' | ')})`);
      assert.ok(!s.stage, 'the stage is cleared');
      await expectNoLatin(g, 'the ocean after the launch');
      await shot(g, 'v06-c-launch-after-sa-360');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 C: the Ocean rises — the sea darkens, Sāgara rises from the water, 6.22.17; no "Rāma’s name on every stone" in Kathā or in practice; English at 390×844',
    skip: shorePlan ? false : 'needs a chapter-6 save on the shore',
    timeout: 240_000,
    run: async ({ open }) => {
      assert.ok(shorePlan);
      const joined = withFlags(shorePlan.save, ['ch6.started', 'ch6.council', 'ch6.council_angada', 'ch6.vibhishana_joined']);
      // Kathā
      const g = await openAs(open, kathaFrom(joined, 1), 'en', { width: 390, height: 844 }, false, 82);
      const bot = new Bot(g);
      let rose = false;
      let sea = false;
      let stones = false;
      const s = await bot.playUntil((x) => {
        if (x.stage?.props['ocean_lord']?.sprite === 'sagara') rose = true;
        if (x.stage?.tint === 'sea') sea = true;
        if (NAME_STONES.test(x.say ?? '')) stones = true;
        if (rose && x.pending === 'shloka' && x.shloka === 's-tato-madhyat') void shot(g, 'v06-c-ocean-rises-en-390').catch(() => undefined);
        return x.flags.includes('ch6.setu_built') && x.phase === 'explore' && !x.pending;
      });
      assert.ok(rose && sea, 'Sāgara rises out of a darkened sea');
      assert.ok(s.heard.includes('s-tato-madhyat'), '6.22.17 heard');
      assert.ok(!stones, 'Kathā: no name-stones line');
      assert.ok(!s.stage, 'the stage is cleared');
      g.expectClean();
      await g.close();
      // the practice journey: the same scene without the set piece, and without the line
      const p = await openAs(open, joined, 'en', { width: 390, height: 844 }, true, 83);
      const pbot = new Bot(p);
      let pstones = false;
      let pstage = false;
      const ps = await pbot.playUntil((x) => {
        if (NAME_STONES.test(x.say ?? '')) pstones = true;
        if (x.stage) pstage = true;
        return x.flags.includes('ch6.setu_built') && x.phase === 'explore' && !x.pending;
      });
      assert.ok(!pstones, 'practice: no name-stones line');
      assert.ok(!pstage && !ps.heard.includes('s-tato-madhyat'), 'practice: no set piece, no v0.6 verse');
      p.expectClean();
      await p.close();
    },
  },
  {
    name: 'v0.6 C: waking Kumbhakarṇa — the told cutscene in संस्कृतम् (title, shake), the drum gag found by a player who looks; reduced motion: a still, skip = seen, the gag not found',
    skip: fieldPlan && kumbha ? false : 'needs a chapter-6 battlefield save and cutscene-kumbhakarna.json',
    timeout: 180_000,
    run: async ({ open }) => {
      assert.ok(fieldPlan);
      const save = kathaFrom(withFlags(fieldPlan.save, ['ch6.battlefield_entered']), 1);
      const g = await openAs(open, save, 'sa', { width: 390, height: 844 }, false, 84);
      await g.page.evaluate(() => {
        const w = window as unknown as { __ryCutsceneSpeed?: number; __ryCutsceneLog?: string[] };
        w.__ryCutsceneSpeed = 4;
        w.__ryCutsceneLog = [];
      });
      await runScript(g, [{ cutscene: 'kumbhakarna' }]);
      await g.waitForState("s => s.pending === 'cutscene' && !!s.told && s.told.id === 'kumbhakarna'");
      const root = g.page.locator('[data-testid="told"]');
      await root.waitFor();
      const title = (await g.page.locator('[data-testid="told-title"]').textContent()) ?? '';
      assert.ok(title.includes(CONTENT.dialogueSa?.['Kumbhakarna wakes'] ?? '?'), `the title in Sanskrit: ${title}`);
      await g.page.locator('[data-testid="told-say"]').waitFor({ timeout: 15_000 });
      await expectNoLatin(g, 'the Kumbhakarṇa cutscene');
      const kitSeen = new Set<string>();
      const watch = setInterval(() => {
        void root
          .getAttribute('data-kit', { timeout: 200 })
          .then((k) => (k ?? '').split(',').filter(Boolean).forEach((x) => kitSeen.add(x)))
          .catch(() => undefined);
      }, 40);
      const bot = new Bot(g, { findHidden: true });
      await bot.handle(await bot.snap());
      clearInterval(watch);
      await g.waitForState("s => s.pending !== 'cutscene'");
      const s = await g.state<Snap>();
      for (const f of ['seen.kumbhakarna', 'found.kumbhakarna.drum']) assert.ok(s.flags.includes(f), `flag ${f}`);
      const log = await g.page.evaluate(() => (window as unknown as { __ryCutsceneLog?: string[] }).__ryCutsceneLog ?? []);
      for (const e of ['told|start|kumbhakarna', 'told|found|drum']) assert.ok(log.includes(e), `log has ${e}: ${log.slice(-10).join(' ')}`);
      assert.ok(kitSeen.has('shake'), `shake on the stage (${[...kitSeen].join(',')})`);
      g.expectClean();
      await g.close();
      // reduced motion, English: a still; skip asks first; skipped = seen; the gag stays hidden
      const r = await openAs(open, save, 'en', { width: 360, height: 640 }, true, 85);
      await runScript(r, [{ cutscene: 'kumbhakarna' }]);
      await r.waitForState("s => s.pending === 'cutscene' && !!s.told && s.told.id === 'kumbhakarna'");
      const rroot = r.page.locator('[data-testid="told"]');
      await rroot.waitFor();
      assert.equal(await rroot.getAttribute('data-mode'), '2d', 'reduced motion: the 2D stage');
      await shot(r, 'v06-c-kumbhakarna-reduced-en-360');
      await r.tap('told-skip');
      await r.page.locator('[data-testid="told-skip-ask"]').waitFor();
      await r.tap('told-skip-yes');
      await r.waitForState("s => s.pending !== 'cutscene'");
      const rs = await r.state<Snap>();
      assert.ok(rs.flags.includes('seen.kumbhakarna'), 'a skipped scene counts as seen');
      assert.ok(!rs.flags.includes('found.kumbhakarna.drum'), 'the gag stays hidden');
      r.expectClean();
      await r.close();
    },
  },
  {
    name: 'v0.6 C: hidden moments — two counsellors (Mārīca’s verse again, the counsellors echo) and the honey grove (the dance, 5.64.28, the कौसल्या सुप्रजा echo) found by a player who looks; Kathā in संस्कृतम् at 360×640, no Latin',
    skip: shorePlan ? false : 'needs a chapter-6 save on the shore',
    timeout: 240_000,
    run: async ({ open }) => {
      assert.ok(shorePlan);
      const save = kathaFrom(withFlags(shorePlan.save, ['ch6.started', 'heard.s-sulabhah-purusha']), 1);
      const g = await openAs(open, save, 'sa', { width: 360, height: 640 }, false, 86);
      const bot = new Bot(g, { findHidden: true });
      // 1. Vibhīṣaṇa's counsel (6.9.19) and the hidden "two counsellors" (the real Kathā block of ch6.vibhishana_refuge)
      await runScript(g, kathaBlock('ch6.vibhishana_refuge', (j) => j.includes('"s-vinashyed-dhi"')));
      let hot = false;
      let maricha = false;
      let s = await bot.playUntil((x) => {
        if (x.hotspot) hot = true;
        if (x.pending === 'shloka' && x.shloka === 's-sulabhah-purusha') maricha = true;
        return x.phase === 'explore' && !x.pending;
      });
      assert.ok(hot, 'the hotspot shimmered at Vibhīṣaṇa');
      assert.ok(maricha, 'Mārīca’s verse is heard again');
      for (const f of ['found.ch6.counsellors', 'echo.counsellors']) assert.ok(s.flags.includes(f), `flag ${f}`);
      assert.ok(s.heard.includes('s-vinashyed-dhi'));
      assert.ok((s.toasts ?? []).some((t) => t.includes(uiEn(CONTENT, 'v06c.echo.counsellors'))), `the counsellors toast (${(s.toasts ?? []).join(' | ')})`);
      await expectNoLatin(g, 'after the two counsellors');
      // 2. the news from Laṅkā with the hidden honey grove (the real Kathā block of ch5.sita, played on the shore)
      // (the real branch warps to the shore at (2, 6) first: the grove's palm is beside the player)
      await runScript(g, [{ warp: 'setu_shore', x: 2, y: 6, facing: 'right' }, ...kathaBlock('ch5.sita', (j) => j.includes('"s-drshta-devi"'))]);
      let danced = false;
      s = await bot.playUntil((x) => {
        if (x.stage?.props['dm']?.sprite === 'dadhimukha') danced = true;
        if (x.stage?.props['dm'] && x.pending === 'say') void shot(g, 'v06-c-honey-grove-sa-360').catch(() => undefined);
        return x.phase === 'explore' && !x.pending;
      });
      assert.ok(danced, 'Dadhimukha chases the dancers');
      for (const f of ['found.ch5.madhuvana', 'echo.kausalya']) assert.ok(s.flags.includes(f), `flag ${f}`);
      assert.ok(s.heard.includes('s-drshta-devi'), '5.64.28 heard');
      assert.ok(!s.stage, 'the stage is cleared');
      await expectNoLatin(g, 'after the honey grove');
      g.expectClean();
      await g.close();
    },
  },
];
