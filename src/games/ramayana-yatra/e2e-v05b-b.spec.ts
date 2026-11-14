/**
 * v0.5b browser tests of WP-B (OWNER: WP-B; notes/v05b-ownership.md, notes/v05b-b.md): playing as Hanumān in book 5
 * (the leap, Surasā, Laṅkā by night, the Aśoka grove, Laṅkā ablaze); P3 stealth, P4 the sprite.
 * Plan §7: e2e: the Hanumān sprite (expose.playerSprite); stealth by following the pointer, with no Latin; a practice
 * chapter-5 save still has its patrol fight.
 *
 *  - Laṅkā by night (संस्कृतम्, 390×844): from the city gate the bot only follows the map pointer to the grove gate — the
 *    guards' light shows, nobody sees Hanumān, no battle; then a deliberate step into the light: the guard turns (the
 *    line in Sanskrit) and Hanumān is back at the lane's mouth
 *  - the leap (संस्कृतम्, 390×844): Surasā's choice chain ("grow" first: she waits; then "tiny"), then Siṃhikā
 *  - the Aśoka grove (संस्कृतम्, 390×844): the student sings Rāma's story — three story recitations
 *  - Laṅkā ablaze (संस्कृतम्, 390×844): four roofs, the gate, Sītā is safe, the leap home (back to the avatar)
 *  - the practice game (English): a chapter-5 save walks as the avatar, sees no light and still fights its patrol
 *  - (for WP-A) Guha's ferry: figures carried over the Ganga sit in one wooden boat
 * Screenshots (RY_SHOTS=dir): v05b-b-*.png.
 */
import assert from 'node:assert/strict';
import type { GameSession } from '../../../tests/e2e/harness';
import { type E2eCase, type Open, type Snap, Bot, CONTENT, continueToExplore, expectNoLatin, followPointer, kathaFrom, planAt, reloadWith, shot } from './e2e-kit.spec';
import { isSolidTile } from './logic';

const SIZE = { width: 390, height: 844 };
const SEEN = 'A guard turns toward the light! Hanuman slips back into the shadows.';

/** A chapter-5 save on `mapId` (planAt), made Kathā, with Hanumān carrying the student (or the practice game). */
function save5(mapId: string, katha = true, extra: Record<string, true> = {}): ReturnType<typeof kathaFrom> {
  const plan = planAt(CONTENT, 5, mapId, 22, ['player', 'hanuman']);
  assert.ok(plan, `a chapter-5 save on ${mapId}`);
  const sv = katha ? kathaFrom(plan.save, 2) : plan.save;
  return { ...sv, flags: { ...sv.flags, ...(katha ? { 'katha.hanuman': true as const } : {}), ...extra } };
}

async function openAt(open: Open, save: unknown, lang: 'sa' | 'en', seed = 7): Promise<GameSession> {
  const g = await open({ seed, viewport: SIZE });
  await reloadWith(g, save, lang);
  await continueToExplore(g);
  return g;
}

/**
 * Follow the map pointer (the player's only guide) until `done`; dialogue, choices, verses, recitations and battles
 * are handled by the ordinary Bot. Counts the times a guard saw Hanumān and the battles fought.
 */
async function pointerUntil(g: GameSession, bot: Bot, done: (s: Snap) => boolean, onSnap?: (s: Snap) => Promise<void>, max = 1500): Promise<{ seen: number; battles: number; last: Snap }> {
  let seen = 0;
  let battles = 0;
  let lastSay = '';
  let inBattle = false;
  let lastErr = '';
  for (let i = 0; i < max; i++) {
    const s = await bot.snap();
    if (s.say && s.say !== lastSay && s.say === SEEN) seen++;
    lastSay = s.say ?? '';
    if (s.phase === 'battle' && !inBattle) battles++;
    inBattle = s.phase === 'battle';
    if (onSnap) await onSnap(s);
    if (done(s)) return { seen, battles, last: s };
    bot.note(`${s.map}@${s.x},${s.y} ${s.phase}/${s.pending ?? '-'} guide=${JSON.stringify(s.guide && { k: s.guide.kind, x: s.guide.x, y: s.guide.y })}`);
    if (await bot.handle(s)) continue;
    if (s.phase === 'explore' && !s.pending) {
      const r = await followPointer(bot, s);
      if (r !== 'moved' && r !== 'interacted') {
        if (r === lastErr) throw new Error(`stuck following the pointer: ${r}\n${bot.trace.join('\n')}`);
        lastErr = r;
      }
    } else await g.page.waitForTimeout(60);
  }
  throw new Error(`not done after ${max} moves\n${bot.trace.join('\n')}`);
}

export const V05B_B: E2eCase[] = [
  {
    name: 'v0.5b B: Laṅkā by night as Hanumān — the sprite (expose), stealth by following the pointer (never seen, no battle), the light in संस्कृतम्, then a guard turns and Hanumān is back at the lane\'s mouth (390×844, no Latin)',
    timeout: 300_000,
    run: async ({ open }) => {
      const g = await openAt(open, save5('lanka_city'), 'sa');
      const s0 = await g.state<Snap>();
      assert.equal(s0.playerSprite, 'hanuman', 'P4: Hanumān walks in Kathā book 5');
      assert.equal(s0.map, 'lanka_city');
      const bot = new Bot(g);
      let swept = false;
      const r = await pointerUntil(g, bot, (s) => s.flags.includes('ch5.patrol_c'), async (s) => {
        // the first calm moment with the guards' light on screen: no Latin, a screenshot
        if (!swept && s.phase === 'explore' && !s.pending && s.flags.includes('ch5.city_entered') && s.grid.some((row) => row.includes('#'))) {
          swept = true;
          await expectNoLatin(g, 'Laṅkā by night');
          await shot(g, 'v05b-b-stealth-sa-390');
        }
        if (s.pending === 'say' && s.say?.startsWith('A patrol marches past')) {
          await expectNoLatin(g, 'the patrol passes');
          await shot(g, 'v05b-b-patrol-sa-390');
        }
      });
      assert.ok(swept, 'the guards\' light was on screen');
      assert.equal(r.seen, 0, 'following the pointer, nobody saw Hanumān');
      assert.equal(r.battles, 0, 'no fight in the city');
      assert.ok(r.last.flags.includes('ch5.patrol_a') && r.last.flags.includes('ch5.anirvedah'));
      assert.equal(r.last.playerSprite, 'hanuman');
      // a deliberate step into the light: the lamps of the avenue (their sentry never leaves)
      await g.waitForState("s => s.phase === 'explore' && !s.pending");
      const save = save5('lanka_city', true, { 'ch5.city_entered': true });
      await reloadWith(g, { ...save, x: 17, y: 20 }, 'sa');
      await continueToExplore(g);
      const b4 = await g.state<Snap>();
      assert.equal(b4.grid[19]?.[17], '#', 'the lamplit avenue is marked in the grid');
      await bot.step('up');
      await g.waitForState(`s => s.say === ${JSON.stringify(SEEN)}`);
      await expectNoLatin(g, 'a guard turns');
      await shot(g, 'v05b-b-seen-sa-390');
      const seenAt = await g.state<Snap>();
      assert.ok(seenAt.party.every((m, i) => m.hp === b4.party[i]?.hp), 'no HP lost');
      await pointerUntil(g, bot, (s) => s.phase === 'explore' && !s.pending);
      const back = await g.state<Snap>();
      assert.deepEqual([back.map, back.x, back.y], ['lanka_city', 17, 22], 'back at the mouth of the lane, below the lamps');
      assert.equal(back.battle, null);
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b B: the leap as Hanumān — Surasā\'s choice chain in संस्कृतम् ("grow": she waits; "tiny": he passes, no duel), then Siṃhikā (390×844, no Latin)',
    timeout: 300_000,
    run: async ({ open }) => {
      // from Mahendra's edge: the leap's opening makes the student ride on Hanumān's shoulder
      const plan = save5('ocean_leap');
      const { 'katha.hanuman': _, ...flags } = plan.flags as Record<string, true>;
      const g = await openAt(open, { ...plan, flags }, 'sa', 11);
      assert.equal((await g.state<Snap>()).playerSprite, 'player_a', 'before the leap: the student');
      const bot = new Bot(g);
      let choiceShot = false;
      let prompts = 0;
      let duel = false;
      const r = await pointerUntil(g, bot, (s) => s.flags.includes('ch5.simhika_done'), async (s) => {
        if (s.pending === 'choice' && s.choice?.prompt === 'Her mouth is vast now. What should Hanuman do?') {
          prompts++;
          if (!choiceShot) {
            choiceShot = true;
            await expectNoLatin(g, "Surasā's choice");
            await shot(g, 'v05b-b-surasa-sa-390');
          }
        }
        if (s.battle?.kind === 'duel') duel = true;
        if (s.flags.includes('ch5.started') && s.phase === 'explore' && !s.pending) assert.equal(s.playerSprite, 'hanuman', 'after the leap: Hanumān');
      });
      assert.ok(prompts >= 2, `the choice came back after "grow" (${prompts})`);
      assert.equal(duel, false, 'no duel with Surasā in Kathā');
      assert.equal(r.battles, 1, 'one fight: Siṃhikā');
      assert.ok(r.last.flags.includes('ch5.surasa_done'));
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b B: the Aśoka grove — the student sings Rāma\'s story with Hanumān: three story recitations in संस्कृतम् (390×844, no Latin)',
    timeout: 300_000,
    run: async ({ open }) => {
      const g = await openAt(open, save5('ashoka_vatika'), 'sa', 13);
      const asked: string[] = [];
      const bot = new Bot(g, {
        onCast: async (s) => {
          if (s.challenge?.context !== 'scene') return;
          asked.push(`${s.challenge.smarana?.shlokaId}:${s.challenge.smarana?.pada}`);
          if (asked.length === 1) {
            await expectNoLatin(g, 'the grove recitation');
            await shot(g, 'v05b-b-grove-recite-sa-390');
          }
        },
      });
      await pointerUntil(g, bot, (s) => s.flags.includes('ch5.met_sita'));
      // every pāda is below mastery (kathaFrom level 2), so each of the three has a gap to fill
      assert.deepEqual(asked, ['s-ramam-dasharatham:0', 's-golden-deer:1', 's-aranya-3:3'], 'three story recitations, in story order');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b B: Laṅkā ablaze — four burning roofs by the pointer, the gate opens, Sītā is safe, the leap home as the student again (संस्कृतम्, 390×844, no Latin)',
    timeout: 300_000,
    run: async ({ open }) => {
      const base = save5('ashoka_vatika', true, { 'ch5.vatika_entered': true, 'ch5.met_sita': true, 'ch5.proclaimed': true, 'ch5.restored_jaya': true, 'ch5.aksha_defeated': true, 'ch5.ablaze': true });
      const sv = { ...base, mapId: 'lanka_ablaze', x: 17, y: 8, facing: 'down', respawn: { mapId: 'lanka_ablaze', x: 17, y: 8 }, items: { ...base.items, chudamani: 1 } };
      const g = await openAt(open, sv, 'sa', 17);
      const s0 = await g.state<Snap>();
      assert.equal(s0.map, 'lanka_ablaze');
      assert.equal(s0.playerSprite, 'hanuman');
      assert.equal(s0.guide?.kind, 'tile', 'the pointer is on a roof');
      const bot = new Bot(g);
      let roofs = 0;
      let swept = false;
      const r = await pointerUntil(g, bot, (s) => s.flags.includes('ch5.complete') && s.phase === 'explore', async (s) => {
        const n = s.flags.filter((f) => /^ch5\.roof_\d$/.test(f)).length;
        if (n > roofs) roofs = n;
        if (n === 2 && !swept && s.phase === 'explore' && !s.pending) {
          swept = true;
          await g.page.waitForTimeout(500); // after the flash
          await expectNoLatin(g, 'Laṅkā ablaze');
          await shot(g, 'v05b-b-ablaze-sa-390');
        }
        if (s.pending === 'say' && s.say === 'The fire has not touched the grove. Sita is unharmed.') {
          await expectNoLatin(g, 'Sītā is safe');
          await shot(g, 'v05b-b-sita-safe-sa-390');
        }
      });
      assert.equal(roofs, 4);
      assert.ok(swept);
      assert.equal(r.last.map, 'setu_shore');
      assert.equal(r.last.playerSprite, 'player_a', 'home: the student walks again');
      assert.equal(r.battles, 0);
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b B (for WP-A): figures carried over water sit in a boat — Guha\'s ferry, Sītā, Rāma, Lakṣmaṇa and the student in one hull (390×844)',
    timeout: 120_000,
    run: async ({ open }) => {
      const plan = planAt(CONTENT, 2, 'shringaverapura', 8, ['player', 'rama', 'lakshmana']);
      assert.ok(plan);
      const sv = kathaFrom(plan.save, 2);
      const g = await openAt(open, { ...sv, flags: { ...sv.flags, 'ch2.ferry_boat': true as const }, x: 18, y: 14, facing: 'down' }, 'sa', 23);
      const boats = (): Promise<string | undefined> => g.page.evaluate(() => document.querySelector<HTMLCanvasElement>('[data-testid="screen"]')?.dataset['boats']);
      assert.equal(await boats(), '0', 'on the bank: no boat');
      const down2 = ['down', 'down'];
      const ran = await g.page.evaluate((c) => (window as unknown as { __ryScript: (cmds: unknown) => boolean }).__ryScript(c), [
        { move: 'sita_boat', path: down2 },
        { move: 'rama_boat', path: down2 },
        { move: 'lakshmana_boat', path: down2 },
        { move: 'player', path: down2 },
        { say: "Guha's boatmen row them across the wide, shining Ganga." },
      ]);
      assert.ok(ran);
      await g.waitForState("s => s.pending === 'say'");
      await g.page.waitForFunction(() => document.querySelector<HTMLCanvasElement>('[data-testid="screen"]')?.dataset['boats'] === '4', undefined, { timeout: 5000 });
      await shot(g, 'v05b-b-ferry-boat-sa-390');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b B: the practice game — a chapter-5 save in Laṅkā walks as the avatar, sees no guards\' light and still fights its patrol (English)',
    timeout: 240_000,
    run: async ({ open }) => {
      const g = await openAt(open, save5('lanka_city', false), 'en', 19);
      const s0 = await g.state<Snap>();
      assert.equal(s0.playerSprite, 'player_a');
      assert.notEqual(s0.style, 'katha');
      const map = CONTENT.maps.find((m) => m.id === 'lanka_city')!;
      for (const t of map.triggers.filter((x) => x.avoid))
        for (let y = t.y; y < t.y + t.h; y++)
          for (let x = t.x; x < t.x + t.w; x++) if (!isSolidTile(map, x, y) && !s0.npcs.some((n) => n.x === x && n.y === y)) assert.notEqual(s0.grid[y]?.[x], '#', `no light in the grid at (${x},${y})`);
      const bot = new Bot(g);
      const r = await pointerUntil(g, bot, (s) => s.flags.includes('ch5.patrol_a'));
      assert.ok(r.battles >= 1, 'the avenue patrol fights');
      g.expectClean();
      await g.close();
    },
  },
];
