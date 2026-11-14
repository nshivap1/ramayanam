/**
 * v0.5b browser tests of WP-C (OWNER: WP-C; notes/v05b-ownership.md): the verse-chain duel (Kiṣkindhā 4.3), Jāmbavān's roll call, Rāvaṇa's phases; P6, P7.
 * Plan §7: e2e (360×640): the chips fit, a tap links; the Rāvaṇa phase lines show.
 *  - the chain duel through the story (Kathā, संस्कृतम्, 360×640): Hanumān's rule lines, the opponent's line with its key
 *    akṣara, three chips that fit the screen, one tap links (and a miss shows the right line), to the win; no Latin
 *  - the roll call on Mahendra (390×844): the four vanaras, then Jāmbavān turns to Hanumān
 *  - Rāvaṇa (390×844): the heads line and Mātali's line show in Sanskrit, then the brahmāstra ends it
 * RY_SHOTS=<dir> saves screenshots of each scene.
 */
import assert from 'node:assert/strict';
import type { GameSession } from '../../../tests/e2e/harness';
import { type E2eCase, type Snap, Bot, CONTENT, continueToExplore, expectNoLatin, followPointer, kathaFrom, planAt, reloadWith, shot } from './e2e-kit.spec';
import { toSave } from './logic';
import { SA_BATTLE } from './logic-battle';

type Save = ReturnType<typeof toSave>;

/** A Kathā save at the start of `map` (chapter `ch`), heard verses at smṛti level 1. */
function kathaSave(ch: number, map: string, level: number, allies: string[]): Save | null {
  const p = planAt(CONTENT, ch, map, level, allies);
  return p ? kathaFrom(p.save, 1) : null;
}

const SMALL = { width: 360, height: 640 };
const TALL = { width: 390, height: 844 };
const duelSave = kathaSave(4, 'rishyamuka', 19, ['player', 'rama', 'lakshmana']);
const rollSave = kathaSave(4, 'mahendra_hill', 19, ['player', 'rama', 'lakshmana', 'hanuman', 'sugriva', 'jambavan']);
// (the Āditya-hṛdayam already heard — package E's cutscene sets seen.aditya at ≤ 60 %; Rāvaṇa's phases wait for it)
const ravanaSave = ((s) => (s ? { ...s, flags: { ...s.flags, 'seen.aditya': true } } : null))(kathaSave(6, 'lanka_palace', 33, ['player', 'rama', 'lakshmana', 'hanuman']));

/** The story moves on: a pending is handled by the bot, the explore map follows the pointer. */
async function drive(bot: Bot, s: Snap): Promise<void> {
  if (s.pending) {
    if (!(await bot.handle(s))) await bot.page.waitForTimeout(60);
    return;
  }
  if (s.phase === 'explore') {
    const r = await followPointer(bot, s);
    if (r !== 'moved' && r !== 'interacted') throw new Error(`pointer: ${r}\n${bot.trace.join('\n')}`);
    return;
  }
  await bot.page.waitForTimeout(60);
}

/** The pick on screen fits: three chips inside the viewport, each line on one row inside its chip. */
async function expectChainLayout(g: GameSession, vp: { width: number; height: number }): Promise<void> {
  const chips = await g.page.locator('[data-testid="chain-chips"] [data-testid^="opt-"]').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      const line = e.querySelector('.g-ramayana-yatra__chain-line') as HTMLElement | null;
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, h: r.height, over: line ? line.scrollWidth - line.clientWidth : 0, lineRight: line ? line.getBoundingClientRect().right : 0 };
    }),
  );
  assert.equal(chips.length, 3, 'three chips');
  for (const c of chips) {
    assert.ok(c.left >= 0 && c.right <= vp.width + 0.5, `a chip fits the width (${c.left}–${c.right} of ${vp.width})`);
    assert.ok(c.bottom <= vp.height + 0.5, `a chip is on screen (bottom ${c.bottom} of ${vp.height})`);
    assert.ok(c.h >= 44, `a chip is a thumb target (${c.h} px)`);
    assert.ok(c.over <= 1 && c.lineRight <= c.right, `the line stays inside its chip (overflow ${c.over})`);
  }
  const key = await g.page.locator('[data-testid="chain-prev"] [data-testid="chain-key-ak"]').count();
  const prev = await g.page.locator('[data-testid="chain-prev"]').count();
  if (prev) assert.equal(key, 1, 'the key akṣara is marked in the opponent’s line');
}

export const V05B_C: E2eCase[] = [
  {
    name: 'v0.5b C: the verse-chain duel with Hanumān (Kiṣkindhā 4.3) — Kathā in संस्कृतम् at 360×640: the rule, the line with its last sound, three chips that fit, one tap links (a miss shows the right line), to the win; no Latin',
    skip: duelSave ? false : 'needs a chapter-4 save on rishyamuka',
    timeout: 300_000,
    run: async ({ open }) => {
      assert.ok(duelSave);
      const g = await open({ seed: 41, viewport: SMALL });
      await reloadWith(g, duelSave, 'sa');
      await continueToExplore(g);
      const bot = new Bot(g, {});
      const said = new Set<string>();
      let turns = 0;
      let missed = false;
      for (let i = 0; i < 900; i++) {
        const s = await bot.snap();
        if (s.say) said.add(s.say);
        if (s.flags.includes('ch4.hanuman_joined')) break;
        if (s.pending === 'challenge' && s.challenge?.kind === 'antya') {
          const c = s.challenge;
          await g.page.locator('[data-testid="chain-chips"][data-armed="true"]').waitFor({ timeout: 4000 });
          turns++;
          if (turns === 1) {
            await expectChainLayout(g, SMALL);
            assert.ok(await g.page.locator('[data-testid="chain-key"]').isVisible(), 'the last sound is shown beside the question');
            await expectNoLatin(g, 'the verse-chain pick');
            await shot(g, 'c5-chain-pick-sa-360');
          }
          const foe0 = s.battle?.foeHp ?? 0;
          // the second turn misses on purpose: the right line shimmers in and is said
          const miss = turns >= 2 && !missed && c.answers.length === 1;
          const pick = miss ? (c.optionIds.find((o) => !c.answers.includes(o)) as string) : (c.answers[0] as string);
          await g.tap(`opt-${pick}`);
          if (miss) {
            await g.page.locator(`[data-testid="chain-panel"][data-correct="false"]`).waitFor({ timeout: 2000 });
            assert.equal(await g.page.locator(`[data-testid="opt-${c.answers[0]}"].is-right`).count(), 1, 'the right line shimmers in');
            await shot(g, 'c5-chain-miss-sa-360');
            missed = true;
          }
          assert.ok(await bot.waitSeq(s.seq, 6000), 'one tap links: the turn resolves');
          const after = await bot.snap();
          assert.ok((after.battle?.foeHp ?? foe0) < foe0 || after.phase !== 'battle', `the link lands (${foe0} → ${after.battle?.foeHp})`);
          continue;
        }
        if (s.pending === 'battle' && s.battle?.foe === 'hanuman_duel' && turns === 1 && (await g.page.locator('[data-testid="beat-model"]').count())) {
          await expectNoLatin(g, 'Hanumān’s line');
          await shot(g, 'c5-chain-line-sa-360');
        }
        await drive(bot, s);
      }
      const end = await bot.snap();
      assert.ok(end.flags.includes('ch4.hanuman_joined'), `Hanumān joins (${bot.trace.slice(-5).join(' | ')})`);
      assert.ok(said.has('Let us play a game of verses, friend: a chain of lines.') && said.has("I say a line. You answer with a line that begins with my line's last sound."), 'Hanumān says the rule of the game');
      assert.ok(turns >= 5 && turns <= 10 && missed, `five links and one miss (${turns} picks)`);
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b C: Jāmbavān’s roll call on Mahendra — Kathā in संस्कृतम् at 390×844: Gaja, Gavākṣa, Śarabha and Mainda say how far they can leap, then Jāmbavān turns to Hanumān; no Latin',
    skip: rollSave ? false : 'needs a chapter-4 save on mahendra_hill',
    timeout: 240_000,
    run: async ({ open }) => {
      assert.ok(rollSave);
      const g = await open({ seed: 43, viewport: TALL });
      await reloadWith(g, rollSave, 'sa');
      await continueToExplore(g);
      const bot = new Bot(g, {});
      const order: string[] = [];
      let shotDone = false;
      for (let i = 0; i < 900; i++) {
        const s = await bot.snap();
        for (const f of ['ch4.roll_gaja', 'ch4.roll_gavaksha', 'ch4.roll_sharabha', 'ch4.roll_mainda', 'ch4.roll_call', 'ch4.complete']) if (s.flags.includes(f) && !order.includes(f)) order.push(f);
        if (s.flags.includes('ch4.complete')) break;
        if (s.pending === 'say' && s.say === 'Every vanara has spoken. None can leap a hundred yojanas.' && !shotDone) {
          shotDone = true;
          await g.page.waitForTimeout(700);
          await expectNoLatin(g, 'the roll call');
          await shot(g, 'c6-rollcall-sa-390');
        }
        if (s.pending === 'say' && s.say?.startsWith('Why are you silent, Hanuman?')) {
          await g.page.waitForTimeout(700);
          await expectNoLatin(g, 'Jāmbavān');
          await shot(g, 'c6-jambavan-sa-390');
        }
        await drive(bot, s);
      }
      assert.deepEqual(order, ['ch4.roll_gaja', 'ch4.roll_gavaksha', 'ch4.roll_sharabha', 'ch4.roll_mainda', 'ch4.roll_call', 'ch4.complete'], 'the four vanaras, then Jāmbavān');
      assert.ok(shotDone, 'the roll call ends with its line');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b C: Rāvaṇa in phases (Yuddha 6.107–108) — Kathā in संस्कृतम् at 390×844: a head falls and grows back, Mātali’s line, then the brahmāstra ends it; no Latin',
    skip: ravanaSave ? false : 'needs a chapter-6 save in lanka_palace',
    timeout: 300_000,
    run: async ({ open }) => {
      assert.ok(ravanaSave);
      const g = await open({ seed: 47, viewport: TALL });
      await reloadWith(g, ravanaSave, 'sa');
      await continueToExplore(g);
      const heads = SA_BATTLE.templates['kathaHeads']!.sa as string;
      const matali = SA_BATTLE.templates['kathaMatali']!.sa as string;
      const fit = SA_BATTLE.templates['kathaFitBrahma']!.sa as string;
      const seen = { heads: 0, matali: 0, fit: 0, ramaHeld: false };
      // Rāma in front: until Mātali has spoken, his verse astra and his shield of protection in turn (a heal when hurt),
      // never the brahmāstra — the heads hold; then the brahmāstra
      let last = '';
      const bot = new Bot(g, {
        pickMove: (s, usable) => {
          const b = s.battle;
          const want = seen.matali ? 'brahmastra' : b && b.allyHp < b.allyMax * 0.5 && usable.includes('aditya_hrdaya') ? 'aditya_hrdaya' : last === 'dharma_vigraha' && usable.includes('abhaya') ? 'abhaya' : 'dharma_vigraha';
          last = want;
          return usable.includes(want) ? want : undefined;
        },
      });
      const ran = await g.page.evaluate((c) => (window as unknown as { __ryScript: (cmds: unknown) => boolean }).__ryScript(c), [{ battle: { enemies: [{ id: 'ravana', level: 30 }], kind: 'boss', canRun: false, canLose: false, bg: 'lanka', music: 'boss', intro: 'Ravana, king of Lanka, attacks!', lead: 'rama' } }]);
      assert.ok(ran, 'the battle starts from a calm moment');
      await g.waitForState("s => s.phase === 'battle'");
      const beatText = async (): Promise<string> => ((await g.page.locator('[data-testid="beat-text"]').first().textContent({ timeout: 100 }).catch(() => '')) ?? '').trim();
      for (let i = 0; i < 1500; i++) {
        const s = await bot.snap();
        if (s.phase !== 'battle' && s.phase !== 'script') break;
        let text = await beatText();
        // a phase line on its way (the typewriter): let it finish, then look at it (the same beat is seen once)
        let phaseLine = false;
        for (const [k, line] of [['heads', heads], ['matali', matali], ['fit', fit]] as const) {
          if (text.length < 4 || !line.startsWith(text)) continue;
          phaseLine = true;
          for (let t = 0; t < 40 && text !== line; t++) {
            await g.page.waitForTimeout(100);
            text = await beatText();
          }
          assert.equal(text, line, `the ${k} line shows in full`);
          seen[k]++;
          const front = ((await g.page.locator('[data-testid="battle-names"]').textContent()) ?? '').trim();
          if (k === 'heads') seen.ramaHeld ||= front.startsWith('राम');
          if (seen[k] === 1) {
            await expectNoLatin(g, k);
            await shot(g, `c13-ravana-${k}-sa-390`);
          }
          await g.page.locator('[data-testid="advance"]').first().click({ timeout: 700 }).catch(() => undefined);
          await bot.waitSeq(s.seq, 3000);
        }
        // (after a phase line, look at the next beat before anything hurries it)
        if (!phaseLine) await drive(bot, s);
      }
      assert.ok(seen.heads >= 1, `a head falls and grows back (in Sanskrit; ${seen.heads})`);
      assert.ok(seen.ramaHeld, 'Rāma is in front when the heads grow back');
      assert.equal(seen.matali, 1, 'Mātali’s line shows once (in Sanskrit)');
      assert.equal(seen.fit, 1, 'the brahmāstra pierces Rāvaṇa’s heart');
      const end = await bot.snap();
      assert.notEqual(end.phase, 'battle', 'the brahmāstra ends the fight');
      g.expectClean();
      await g.close();
    },
  },
];
