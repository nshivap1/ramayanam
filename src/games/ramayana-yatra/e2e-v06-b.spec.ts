/**
 * v0.6 browser tests of WP-B (OWNER: v0.6 WP-B; notes/v06-ownership.md): Araṇya and Kiṣkindhā (the deer show the way, the trees remember, one arrow through seven trees, Hanumān grows).
 * Append E2eCase entries ({ name: 'v0.6 B: …', skip?, timeout?, run: async ({ open }) => … }); e2e.spec.ts registers
 * V06_B at the end of its suite. Helpers: ./e2e-kit.spec (Bot — it plays told cutscenes and passes hotspots;
 * openWithSave, kathaFrom, planAt, continueToExplore, expectNoLatin, shot …) and window.__ryScript(cmds) to open a set
 * piece before its story content exists. Run only these:
 *   node tools/build.mjs --outdir=.e2e/b --only=ramayana-yatra --no-sw
 *   SAMSKURU_E2E=1 SAMSKURU_DIST=.e2e/b node --import tsx --test --test-concurrency=1 --test-name-pattern="v0.6 B" src/games/ramayana-yatra/e2e.spec.ts
 *
 *   1. the deer show the way (Araṇya 3.64; Kathā, संस्कृतम्, 390×844, motion on): the empty-hut block of ch3.maricha_deer —
 *      Sītā's verse to the trees and Rāma's verse to the kadamba heard, three deer rest, rise, run south (the stage), the
 *      bridge glows; no Latin on screen; the stage is cleared when the script ends
 *   2. one arrow, seven trees (Kiṣkindhā 4.5 / 4.12 / 4.22; Kathā, English, keyboard only, 360×640): the real alliance
 *      event — the offer of friendship, the seven sāla trees, the arrow through them and back (kit log), Vālī's last
 *      words; all three B verses heard; the alliance is made
 *   3. Hanumān grows (Kiṣkindhā 4.66.36; Kathā, English, 360×640, reduced motion = the harness default): Hanumān sits
 *      apart on the clifftop, Jāmbavān's verse, he grows to 3× as he is praised (the still path), the book ends
 *   4. the trees remember (hidden spot by the Pañcavaṭī hut; Kathā, संस्कृतम्): facing the tree and A — petals, two
 *      lines, Sītā's verse again, its flag; the practice game: nothing there
 */
import assert from 'node:assert/strict';
import { type E2eCase, type Snap, Bot, CONTENT, continueToExplore, expectNoLatin, kathaFrom, planAt, reloadWith, shot } from './e2e-kit.spec';
import type { EventCmd } from './types';
import type { GameSession } from '../../../tests/e2e/harness';

type Save = NonNullable<ReturnType<typeof planAt>>['save'];

/** A planned save on `mapId` (chapter `ch`), Kathā (or practice), with extra flags, at (x, y) facing `facing`. */
function saveAt(ch: number, mapId: string, allies: string[], lvl: number, flags: string[], x: number, y: number, facing: string, katha = true): Save | null {
  const p = planAt(CONTENT, ch, mapId, lvl, allies);
  if (!p) return null;
  const s0 = katha ? kathaFrom(p.save, 1) : p.save;
  const f: Record<string, true> = { ...s0.flags };
  for (const x of flags) f[x] = true;
  return { ...s0, flags: f, x, y, facing } as Save;
}

async function openSave(open: Parameters<E2eCase['run']>[0]['open'], save: Save, lang: 'en' | 'sa', vp: { width: number; height: number }, motion: boolean, seed: number): Promise<GameSession> {
  const g = await open({ seed, viewport: vp });
  if (motion) await g.page.emulateMedia({ reducedMotion: 'no-preference' });
  await reloadWith(g, save, lang);
  await continueToExplore(g);
  return g;
}

async function script(g: GameSession, cmds: unknown[]): Promise<void> {
  const ran = await g.page.evaluate((c) => (window as unknown as { __ryScript: (x: unknown) => boolean }).__ryScript(c), cmds);
  assert.ok(ran, 'the e2e script hook ran from a calm moment');
}

/** The Kathā block of `event` that contains a command matching `pred` (as it is in the content). */
function kathaBlockOf(event: string, pred: (c: EventCmd) => boolean): EventCmd | null {
  const e = CONTENT.events.find((x) => x.id === event);
  let hit: EventCmd | null = null;
  const go = (cmds: EventCmd[] | undefined): void => {
    for (const c of cmds ?? []) {
      if (hit) return;
      if ('if' in c && c.if === 'style.katha' && c.then.some(pred)) hit = c;
      const o = c as unknown as Record<string, EventCmd[] | undefined>;
      for (const k of ['then', 'else', 'onWin', 'onLose', 'onCorrect', 'onWrong']) go(o[k]);
    }
  };
  go(e?.cmds);
  return hit;
}

const has = (en: string): boolean => !!CONTENT.dialogueSa?.[en];

// 1. the deer
const deerBlock = kathaBlockOf('ch3.maricha_deer', (c) => 'prop' in c && c.sprite === 'deer');
const pv = saveAt(3, 'panchavati', ['player', 'rama', 'lakshmana'], 8, ['ch3.at_panchavati', 'ch3.khara_defeated', 'ch3.deer_seen', 'ch3.maricha_defeated'], 16, 10, 'up');
// 2. the arrow
const rk = saveAt(4, 'rishyamuka', ['player', 'rama', 'lakshmana', 'hanuman'], 9, ['ch4.started', 'ch4.met_mendicant', 'ch4.hanuman_joined'], 24, 5, 'up');
// 3. Hanumān grows
const mh = saveAt(4, 'mahendra_hill', ['player', 'rama', 'lakshmana', 'hanuman', 'jambavan'], 12, ['ch4.mahendra_reached', 'ch4.roll_gaja', 'ch4.roll_gavaksha', 'ch4.roll_sharabha', 'ch4.roll_mainda', 'ch4.roll_call'], 21, 5, 'up');
// 4. the trees remember
const spot = CONTENT.maps.find((m) => m.id === 'panchavati')?.spots?.find((s) => s.event === 'ch3.trees_remember');
const tr = spot ? saveAt(3, 'panchavati', ['player', 'rama', 'lakshmana'], 8, ['ch3.at_panchavati', 'ch3.khara_defeated', 'ch3.deer_seen', 'ch3.maricha_defeated'], spot.x, spot.y + 1, 'up') : null;
const trPractice = spot ? saveAt(3, 'panchavati', ['player', 'rama'], 8, ['ch3.at_panchavati', 'ch3.khara_defeated', 'ch3.deer_seen', 'ch3.maricha_defeated'], spot.x, spot.y + 1, 'up', false) : null;

export const V06_B: E2eCase[] = [
  {
    name: 'v0.6 B: the deer show the way — the trees, the silent river, three deer rest, rise and run south (stage + glow); B verses heard; Kathā in संस्कृतम् at 390×844, no Latin; the stage clears',
    skip: deerBlock && pv ? false : 'needs the deer block and a Pañcavaṭī save',
    timeout: 120_000,
    run: async ({ open }) => {
      const g = await openSave(open, pv!, 'sa', { width: 390, height: 844 }, true, 71);
      await script(g, [deerBlock]);
      await g.waitForState("s => s.pending === 'say'");
      const seen = { deer: new Set<string>(), down: false, upAfter: false, south: false, lines: 0 };
      let latinChecked = false;
      const bot = new Bot(g, {
        onStep: async (s) => {
          const st = s.stage;
          if (st) {
            for (const [id, p] of Object.entries(st.props)) if (p.sprite === 'deer') seen.deer.add(id);
            if (st.down.some((d) => d.startsWith('deer'))) seen.down = true;
            else if (seen.down && seen.deer.size) seen.upAfter = true;
            if (Object.values(st.props).some((p) => p.sprite === 'deer' && p.y >= 16)) seen.south = true;
          }
          if (s.pending === 'say' && s.say && has(s.say)) seen.lines++;
          if (!latinChecked && s.pending === 'say' && seen.down) {
            latinChecked = true;
            await expectNoLatin(g, 'the deer (Kathā, संस्कृतम्)');
            await shot(g, 'v06-b-deer-sa-390');
          }
        },
      });
      await bot.playUntil((s) => s.phase === 'explore' && !s.pending);
      const s = await g.state<Snap>();
      assert.equal(seen.deer.size, 3, `three deer (${[...seen.deer].join(',')})`);
      assert.ok(seen.down && seen.upAfter, 'they rest, then rise');
      assert.ok(seen.south, 'they run south toward the river');
      assert.ok(latinChecked, 'the संस्कृतम् screen was checked');
      for (const id of ['s-amantraye', 's-asti-kaccit']) assert.ok(s.heard.includes(id), `${id} heard`);
      assert.ok((s.kitLog ?? []).includes('glow'), `the bridge glows (${(s.kitLog ?? []).join(',')})`);
      assert.ok(!s.stage, 'the stage is cleared when the script ends');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 B: one arrow, seven trees — the real alliance on Ṛśyamūka: the offer, the seven sāla trees, the arrow through them and back, Vālī’s last words; three B verses heard; Kathā in English, keyboard only, 360×640',
    skip: rk ? false : 'needs a Ṛśyamūka save',
    timeout: 180_000,
    run: async ({ open }) => {
      const g = await openSave(open, rk!, 'en', { width: 360, height: 640 }, true, 72);
      let trees = 0;
      let atRow = false;
      const bot = new Bot(g, {
        keyboard: true,
        onStep: async (s) => {
          const sala = Object.entries(s.stage?.props ?? {}).filter(([id, p]) => id.startsWith('sala') && p.sprite === 'tree');
          trees = Math.max(trees, sala.length);
          if (sala.length === 7 && s.map === 'rishyamuka' && s.x === 18 && s.y === 2) atRow = true;
          if (sala.length === 7 && !atRow) await shot(g, 'v06-b-sala-en-360');
        },
      });
      await bot.playUntil((s) => s.flags.includes('ch4.alliance') && s.phase === 'explore' && !s.pending, 1500);
      const s = await g.state<Snap>();
      assert.equal(trees, 7, 'seven sāla trees on the stage');
      assert.ok(atRow, 'Rāma stands at the head of the row');
      const arrows = (s.kitLog ?? []).filter((k) => k === 'arrow').length;
      assert.ok(arrows >= 2, `the arrow flies and comes back (${(s.kitLog ?? []).join(',')})`);
      for (const k of ['flash', 'shake']) assert.ok((s.kitLog ?? []).includes(k), `${k}`);
      for (const id of ['s-rocate-yadi', 's-sa-visrshto', 's-deshakalau', 's-naham-janami']) assert.ok(s.heard.includes(id), `${id} heard`);
      assert.ok(s.party.some((m) => m.id === 'sugriva'), 'Sugrīva joins');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 B: Hanumān grows — he sits apart on Mahendra, Jāmbavān’s verse, he grows to 3× as the vānaras praise him (reduced-motion still path); Book 4 ends; Kathā in English at 360×640',
    skip: mh ? false : 'needs a Mahendra save',
    timeout: 180_000,
    run: async ({ open }) => {
      const g = await openSave(open, mh!, 'en', { width: 360, height: 640 }, false, 73);
      const s0 = await g.state<Snap>();
      assert.ok(s0.npcs.some((n) => n.id === 'hanuman_m'), 'Hanumān sits apart on the clifftop (Kathā)');
      let scale = 1;
      const bot = new Bot(g, {
        onStep: async (s) => {
          scale = Math.max(scale, s.stage?.scale['hanuman_m'] ?? 1);
        },
      });
      await bot.playUntil((s) => s.flags.includes('ch4.complete') && s.phase === 'explore' && !s.pending, 1500);
      const s = await g.state<Snap>();
      assert.equal(scale, 3, 'he grows to three times his size');
      assert.ok((s.kitLog ?? []).includes('shake'), 'the hill shakes');
      assert.ok(s.heard.includes('s-uttishtha-hari'), 'Jāmbavān’s verse heard');
      assert.ok(!s.npcs.some((n) => n.id === 'hanuman_m'), 'he has gone to the summit with the party');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.6 B: the trees remember — the shimmering tree by the Pañcavaṭī hut: A → petals, two lines, Sītā’s verse again, its flag (Kathā, संस्कृतम्, no Latin); the practice game has nothing there',
    skip: tr && trPractice ? false : 'needs the hidden spot and Pañcavaṭī saves',
    timeout: 120_000,
    run: async ({ open }) => {
      const g = await openSave(open, tr!, 'sa', { width: 390, height: 844 }, true, 74);
      await shot(g, 'v06-b-trees-glow-sa-390');
      const s0 = await g.state<Snap>();
      await g.tap('btn-a');
      await g.waitForState("s => s.pending === 'say'");
      await expectNoLatin(g, 'the trees remember (संस्कृतम्)');
      const bot = new Bot(g);
      await bot.playUntil((s) => s.phase === 'explore' && !s.pending);
      const s = await g.state<Snap>();
      assert.ok(s.flags.includes('ch3.trees_remembered'), 'found');
      assert.ok((s.kitLog ?? []).includes('petals'), 'petals fall');
      assert.ok(s.heard.includes('s-amantraye'));
      assert.equal(s.x, s0.x);
      g.expectClean();
      await g.close();
      // the practice game: A on the same tile does nothing
      const p = await openSave(open, trPractice!, 'en', { width: 360, height: 640 }, false, 75);
      await p.tap('btn-a');
      await p.page.waitForTimeout(400);
      const q = await p.state<Snap>();
      assert.equal(q.pending, null, 'no hidden moment in the practice game');
      p.expectClean();
      await p.close();
    },
  },
];
