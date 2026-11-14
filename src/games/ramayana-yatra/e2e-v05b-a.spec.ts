/**
 * v0.5b browser tests of WP-A (OWNER: WP-A; notes/v05b-ownership.md): story set pieces of books 1–3 (Krauñca, Guha's
 * ferry, the golden deer, Jaṭāyu); P1 story recitation, P2 book review.
 * Plan §7: e2e (संस्कृतम्, 390×844): the deer chase, then Jaṭāyu, with no Latin. Also: the Krauñca scene's recitation
 * (the first a player says: coach line, ८ अक्षराणि, laghu / guru marks) and the boat ride across the Gaṅgā.
 * RY_SHOTS=<dir> saves screenshots of each scene.
 */
import assert from 'node:assert/strict';
import { type E2eCase, type Snap, Bot, CONTENT, continueToExplore, expectCastLayout, expectNoLatin, kathaFrom, planAt, reloadWith, shot } from './e2e-kit.spec';
import { toSave } from './logic';

type Save = ReturnType<typeof toSave>;
type Goal = NonNullable<Snap['next']>;

/** A Kathā save at the start of `map` (chapter `ch`), `patch` merged into its flags; heard verses at smṛti level `lvl`. */
function kathaSave(ch: number, map: string, level: number, allies: string[], flags: Record<string, boolean> = {}, lvl = 1, fresh = false): Save | null {
  const p = planAt(CONTENT, ch, map, level, allies);
  if (!p) return null;
  let save: Save = p.save;
  if (fresh) {
    // a new player: no verse heard yet (the Krauñca scene is the first)
    const keep = Object.fromEntries(Object.entries(save.flags).filter(([k]) => !k.startsWith('heard.') && !k.startsWith('restored.')));
    save = { ...save, shlokas: {}, flags: keep };
  }
  const k = kathaFrom({ ...save, flags: { ...save.flags, ...flags } } as Save, lvl);
  return k;
}

/** Walk to tile (x, y) on the current map, handling whatever is pending on the way; stops when `stop(snap)` holds. */
async function walkTo(bot: Bot, x: number, y: number, stop: (s: Snap) => boolean, max = 300): Promise<Snap> {
  for (let i = 0; i < max; i++) {
    const s = await bot.snap();
    if (stop(s)) return s;
    if (s.pending) {
      await bot.handle(s);
      continue;
    }
    if (s.x === x && s.y === y) return s;
    const goal: Goal = { chapter: s.chapter ?? 1, map: s.map ?? '', action: { reach: { x, y } }, expectFlag: '' };
    const r = await bot.walk(s, goal);
    if (r !== 'moved' && r !== 'interacted' && r !== 'at goal') throw new Error(`walkTo ${x},${y}: ${r}\n${bot.trace.join('\n')}`);
  }
  throw new Error(`walkTo ${x},${y}: not reached\n${bot.trace.join('\n')}`);
}

/** Handle pendings (bot) until `done(snap)`; `onSnap` sees every snapshot first. */
async function until(bot: Bot, done: (s: Snap) => boolean, onSnap?: (s: Snap) => Promise<void>, max = 400): Promise<Snap> {
  for (let i = 0; i < max; i++) {
    const s = await bot.snap();
    if (onSnap) await onSnap(s);
    if (done(s)) return s;
    if (!(await bot.handle(s))) await bot.page.waitForTimeout(60);
  }
  throw new Error(`until: not reached\n${bot.trace.join('\n')}`);
}

/** A visible NPC's tile (undefined when hidden). */
const npc = (s: Snap, id: string): { x: number; y: number } | undefined => {
  const n = s.npcs.find((m) => m.id === id);
  return n ? { x: n.x, y: n.y } : undefined;
};
const VP = { width: 390, height: 844 };

const krauncha = kathaSave(1, 'tamasa_bank', 7, ['player'], {}, 0, true);
const ferry = kathaSave(2, 'shringaverapura', 10, ['player', 'rama', 'lakshmana'], { 'ch2.left_city': true });
const deer = kathaSave(3, 'mriga_vana', 16, ['player', 'rama']);

export const V05B_A: E2eCase[] = [
  {
    name: 'v0.5b A: the Krauñca birds — the hunter steps out, a bird is gone, Vālmīki turns; the player says pāda 0 (coach, ८ अक्षराणि, laghu/guru); Kathā in संस्कृतम् at 390×844, no Latin',
    skip: krauncha ? false : 'needs a chapter-1 save on tamasa_bank',
    timeout: 180_000,
    run: async ({ open }) => {
      assert.ok(krauncha);
      const g = await open({ seed: 31, viewport: VP });
      await reloadWith(g, krauncha, 'sa');
      await continueToExplore(g);
      let castSeen = false;
      const bot = new Bot(g, {
        onCast: async (s) => {
          if (s.challenge?.context !== 'scene') return;
          castSeen = true;
          await g.page.locator('[data-testid="scene-recite"] [data-testid="recite-cast"]').waitFor();
          assert.equal(await g.page.locator('[data-testid="scene-recite"]').getAttribute('data-coach'), 'true', 'the first recitation of all is coached');
          assert.ok(await g.page.locator('[data-testid="scene-coach"]').isVisible(), 'the coach line shows');
          const meter = g.page.locator('[data-testid="scene-meter"]');
          assert.equal(await meter.getAttribute('data-n'), '8', 'eight syllables in the quarter');
          assert.equal(((await meter.textContent()) ?? '').trim(), '८ अक्षराणि', 'the metre in Sanskrit');
          assert.equal((await meter.getAttribute('data-weights'))?.length, 8, 'a laghu / guru scan of the eight');
          assert.ok((await g.page.locator('[data-testid="recite-line"].has-marks').count()) === 1, 'the line carries laghu / guru marks');
          await expectCastLayout(g, 'the Krauñca recitation');
          await expectNoLatin(g, 'the Krauñca recitation');
          await shot(g, 'a1-krauncha-recite-sa-390');
        },
      });
      // into the scene: the trigger row of the bank
      const s0 = await walkTo(bot, 14, 7, (s) => s.pending !== null);
      assert.equal(s0.map, 'tamasa_bank');
      const before = await bot.snap();
      assert.ok(npc(before, 'krauncha_a') && npc(before, 'hunter'), 'the pair of birds and the hunter at the start');
      // the arrow: the hunter has stepped out, the struck bird is gone
      const arrow = await until(bot, (s) => s.pending === 'say' && (s.say ?? '').startsWith('Then a {w:nishada}'));
      assert.deepEqual(npc(arrow, 'hunter'), { x: 7, y: 9 }, 'the hunter stepped out of the bushes');
      assert.equal(npc(arrow, 'krauncha_a'), undefined, 'the struck bird is gone');
      assert.ok(npc(arrow, 'krauncha_b'), 'its mate is still there');
      assert.ok(arrow.flags.includes('ch1.krauncha_fell'));
      await g.page.waitForTimeout(400);
      await expectNoLatin(g, 'the arrow');
      await shot(g, 'a1-krauncha-arrow-sa-390');
      // the verse, then the player's line (P1), then the story carries on to Bharadvāja
      const rec = await until(bot, (s) => s.pending === 'challenge' && s.challenge?.context === 'scene');
      assert.equal(rec.challenge?.smarana?.shlokaId, 's-ma-nishada');
      assert.equal(rec.challenge?.smarana?.pada, 0, 'the first quarter');
      assert.equal(rec.challenge?.smarana?.gaps.length, 1, 'one gap to fill');
      await bot.cast(rec);
      assert.ok(castSeen, 'the recitation panel was checked');
      const after = await until(bot, (s) => s.phase === 'explore' && !s.pending);
      assert.ok(after.flags.includes('ch1.krauncha_seen'), 'the scene ends as before');
      assert.ok((after.recited?.['s-ma-nishada'] ?? 0) >= 1, 'the line counts as recited');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b A: Guha’s ferry — the party steps into the boat and crosses the Gaṅgā; Sītā prays mid-stream; the far bank (Kathā, संस्कृतम्, 390×844, no Latin)',
    skip: ferry ? false : 'needs a chapter-2 save at Shringaverapura',
    timeout: 180_000,
    run: async ({ open }) => {
      assert.ok(ferry);
      const g = await open({ seed: 32, viewport: VP });
      await reloadWith(g, ferry, 'sa');
      await continueToExplore(g);
      const bot = new Bot(g);
      // talk to Guha (the bot follows the walkthrough: talk guha)
      await until(bot, (s) => s.pending !== null || s.phase !== 'explore', async (s) => {
        if (s.phase === 'explore' && !s.pending) await bot.walk(s);
      });
      // the boarding: the three step down into the boat, then you
      const row = await until(bot, (s) => s.pending === 'say' && (s.say ?? '').startsWith("Guha's boatmen row"));
      assert.deepEqual([npc(row, 'lakshmana_boat'), npc(row, 'sita_boat'), npc(row, 'rama_boat')], [{ x: 15, y: 16 }, { x: 16, y: 16 }, { x: 17, y: 16 }], 'in the boat side by side: Lakṣmaṇa, Sītā, Rāma');
      assert.deepEqual([row.map, row.x, row.y], ['shringaverapura', 18, 16], 'and you beside Rāma');
      // mid-stream: Sītā's prayer to the Gaṅgā
      const prayer = await until(bot, (s) => s.pending === 'say' && (s.say ?? '').startsWith('Mother Ganga'));
      assert.deepEqual([prayer.x, prayer.y], [18, 17], 'mid-stream');
      assert.deepEqual(npc(prayer, 'sita_boat'), { x: 16, y: 17 });
      await g.page.waitForTimeout(1800); // the line types out
      assert.match((await g.page.locator('[data-testid="say-text"]').textContent()) ?? '', /गङ्गे/, 'she speaks to the Gaṅgā');
      await expectNoLatin(g, 'Sītā’s prayer');
      await shot(g, 'a2-ferry-prayer-sa-390');
      const far = await until(bot, (s) => s.phase === 'explore' && !s.pending);
      assert.equal(far.map, 'chitrakuta', 'the far bank, then Chitrakūṭa');
      assert.ok(far.flags.includes('ch2.ferried') && !far.flags.includes('ch2.ferry_boat'), 'ferried; the boat scene is over');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b A: the deer chase — the deer bounds away at each trigger, shadows, Mārīca cries in Rāma’s voice — then Jaṭāyu: a misread question gets a gasp, who and which way (Kathā, संस्कृतम्, 390×844, no Latin)',
    skip: deer ? false : 'needs a chapter-3 save in the deer forest',
    timeout: 300_000,
    run: async ({ open }) => {
      assert.ok(deer);
      const g = await open({ seed: 33, viewport: VP });
      await reloadWith(g, deer, 'sa');
      await continueToExplore(g);
      const swept = new Set<string>();
      const sweep = async (s: Snap): Promise<void> => {
        const k = s.pending === 'say' ? `say:${s.say}` : s.pending === 'choice' ? `choice:${s.choice?.prompt}:${s.choice?.options}` : '';
        if (!k || swept.has(k)) return;
        swept.add(k);
        await g.page.waitForTimeout(250);
        await expectNoLatin(g, k);
      };
      const bot = new Bot(g, { onStep: sweep });
      const s0 = await bot.snap();
      assert.ok(npc(s0, 'deer_glimpse_1') && !npc(s0, 'deer_k2') && !npc(s0, 'deer_k3'), 'one golden deer ahead');
      // chase 1: the deer looks back, then bounds away and is gone; it waits further on
      const c1 = await walkTo(bot, 5, 6, (s) => s.pending === 'say');
      assert.match(c1.say ?? '', /^A flash of gold/);
      assert.deepEqual(npc(c1, 'deer_glimpse_1'), { x: 13, y: 12 }, 'it bounded away');
      const w1 = await until(bot, (s) => s.phase === 'explore' && !s.pending);
      assert.equal(npc(w1, 'deer_glimpse_1'), undefined, 'gone');
      assert.deepEqual(npc(w1, 'deer_k2'), { x: 14, y: 15 }, 'the deer waits further on');
      // chase 2
      const c2 = await walkTo(bot, 13, 12, (s) => s.pending === 'say');
      assert.match(c2.say ?? '', /^The deer stops and looks back/);
      assert.ok(npc(c2, 'deer_k2'), 'it waits, looking back');
      await shot(g, 'a3-deer-waits-sa-390');
      const w2 = await until(bot, (s) => s.phase === 'explore' && !s.pending);
      assert.equal(npc(w2, 'deer_k2'), undefined, 'gone again');
      assert.deepEqual(npc(w2, 'deer_k3'), { x: 25, y: 7 });
      // chase 3: shadows around you
      const c3 = await walkTo(bot, 21, 10, (s) => s.pending === 'say');
      assert.match(c3.say ?? '', /^The forest grows strange/);
      assert.ok(['shadow_a', 'shadow_b', 'shadow_c'].every((id) => npc(c3, id)), 'shadow deer all around');
      await shot(g, 'a3-deer-shadows-sa-390');
      const w3 = await until(bot, (s) => s.phase === 'explore' && !s.pending);
      assert.ok(['shadow_a', 'shadow_b', 'shadow_c', 'deer_k2', 'deer_k3', 'deer_glimpse_1'].every((id) => !npc(w3, id)), 'only the deer in the clearing is left');
      assert.ok(npc(w3, 'deer_far'));
      // the fight, then Mārīca's cry in Rāma's voice: its own line, under a speaker title, with Rāma's face
      let cried = false;
      await until(
        bot,
        (s) => s.flags.includes('ch3.maricha_defeated') && s.phase === 'explore' && !s.pending,
        async (s) => {
          if (s.phase === 'explore' && !s.pending) await bot.walk(s);
          if (cried || s.pending !== 'say' || s.say !== '"Ha Sita! Ha Lakshmana!"') return;
          cried = true;
          assert.ok(npc(s, 'maricha_true') && !npc(s, 'deer_far'), 'the deer has fallen: Mārīca lies there in his true form');
          await g.page.waitForTimeout(1500);
          assert.match((await g.page.locator('[data-testid="say-text"]').textContent()) ?? '', /हा सीते/, 'the cry');
          assert.match((await g.page.locator('[data-testid="panel-say"] .g-ramayana-yatra__speaker').first().textContent()) ?? '', /रामस्य वाचा/, 'spoken in Rāma’s voice');
          await expectNoLatin(g, 'Mārīca’s cry');
          await shot(g, 'a3-maricha-cry-sa-390');
        },
        1500,
      );
      assert.ok(cried, 'Mārīca’s cry is its own line');
      // Jaṭāyu: ask a question that misreads (a gasp), then who and which way
      const asked: string[] = [];
      let gasp = false;
      let shotAsk = false;
      for (let i = 0; i < 900; i++) {
        const s = await bot.snap();
        if (s.flags.includes('ch3.jatayu_done') && s.phase === 'explore' && !s.pending) break;
        if (s.pending === 'choice' && (s.choice?.prompt ?? '').startsWith('Jatayu has breath')) {
          await sweep(s);
          if (!shotAsk) {
            shotAsk = true;
            assert.equal(s.choice?.options, 3, 'three questions');
            await shot(g, 'a4-jatayu-ask-sa-390');
          }
          // first a question that misreads the moment (the last option), then the first one offered
          const i0 = asked.length === 0 ? (s.choice?.options ?? 1) - 1 : 0;
          asked.push(`${s.choice?.options}:${i0}`);
          await g.tap(`choice-${i0}`);
          await bot.waitSeq(s.seq);
          continue;
        }
        if (s.pending === 'say' && s.say === 'Jatayu only gasps. His breath is almost gone.') gasp = true;
        if (await bot.handle(s)) continue;
        if (s.phase === 'explore' && !s.pending) await bot.walk(s);
      }
      const end = await bot.snap();
      assert.ok(end.flags.includes('ch3.jatayu_done'), `Jaṭāyu's scene ends (${asked.join(' ')})`);
      assert.ok(gasp, 'the misread question got a gasp');
      assert.deepEqual(asked, ['3:2', '3:0', '2:0'], 'the question came back after the gasp; each answer leaves the menu');
      assert.ok(end.flags.includes('ch3.jatayu_who') && end.flags.includes('ch3.jatayu_way'));
      assert.ok([...swept].some((k) => k === 'say:Ravana. The king of the rakshasas.'), 'he names Rāvaṇa');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b A: a story recitation at 360×640 by keyboard, in both scripts — the head (your line, the syllables), the coach on a first recitation, the chips on screen; ▶ the story goes on',
    skip: krauncha ? false : 'needs a chapter-1 save on tamasa_bank',
    timeout: 180_000,
    run: async ({ open }) => {
      assert.ok(krauncha);
      for (const script of ['deva', 'iast'] as const) {
        const g = await open({ seed: 34, script, viewport: { width: 360, height: 640 } });
        await reloadWith(g, krauncha, 'sa');
        await continueToExplore(g);
        const ran = await g.page.evaluate((c) => (window as unknown as { __ryScript: (cmds: unknown) => boolean }).__ryScript(c), [{ if: 'style.katha', then: [{ smarana: 's-ma-nishada', pada: 0 }] }]);
        assert.ok(ran, 'the e2e script hook ran from a calm moment');
        await g.waitForState("s => s.pending === 'challenge' && s.challenge && s.challenge.context === 'scene'");
        const s = await g.state<Snap>();
        let checked = false;
        const bot = new Bot(g, {
          keyboard: true,
          onCast: async () => {
            checked = true;
            assert.ok(await g.page.locator('[data-testid="scene-your"]').isVisible(), `${script}: "your line"`);
            assert.equal(await g.page.locator('[data-testid="scene-meter"]').getAttribute('data-n'), '8', `${script}: eight syllables`);
            assert.ok(await g.page.locator('[data-testid="scene-coach"]').isVisible(), `${script}: the coach line`);
            await expectCastLayout(g, `story recitation 360×640 (${script})`);
            if (script === 'deva') {
              await expectNoLatin(g, 'story recitation 360×640');
              await shot(g, 'a5-recite-sa-360');
            } else await shot(g, 'a5-recite-iast-360');
          },
        });
        await bot.cast(s);
        assert.ok(checked, `${script}: the chips were checked`);
        await g.waitForState("s => s.phase === 'explore' && !s.pending");
        g.expectClean();
        await g.close();
      }
    },
  },
];
