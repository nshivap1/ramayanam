/**
 * v0.6 WP-B (Araṇya, Kiṣkindhā; notes/v06-b.md, notes/v06-plan.md §2 row B). OWNER: v0.6 WP-B.
 *  - the 14 B verses (shlokas-4.json) are heard once each at their moment of the Kathā story, inside Kathā blocks, in book
 *    order; never restorable, never a gate; the practice journey meets none of them, and none of B's new lines
 *  - set pieces on the main path: the deer show the way (Araṇya 3.64), one arrow through seven sāla trees (4.12.3–4),
 *    Hanumān grows as the vānaras praise him (4.66.36–4.67.4); each short (no input but ▶, waits ≤ 2 s)
 *  - the trees remember (hidden spot by the Pañcavaṭī hut): Kathā only, only between the abduction and Jaṭāyu's glade
 *  - every new Kathā line of B has its Sanskrit in sa-dialogue-11.json and verifies with the oracle
 *  - the B deer sprite (art-v06-b.ts) has a name (names-4.json) and is not the golden deer
 * This file holds no Sanskrit: it reads content and checks it.
 */
import { test } from 'node:test';
import type { Level } from '@sdk';
import assert from 'node:assert/strict';
import { loadContent } from './content';
import { type EventCmd, type GameState, isRestorable, newGame, practiceContent, reduce, stageOf } from './logic';
import { runWalkthrough } from './logic-sim';
import { getOracle } from './sa-verify';
import { buildSprite } from './art-sprites';
import { SPRITE_IDS } from './catalog';
import ch3 from './content/story-ch3.json';
import ch4 from './content/story-ch4.json';
import dia11 from './content/sa-dialogue-11.json';
import shlokas4 from './content/shlokas-4.json';

const REAL = loadContent();
const B_IDS = (shlokas4 as { shlokas: { id: string }[] }).shlokas.map((s) => s.id);
const STORY = [ch3, ch4] as unknown as { events: { id: string; cmds: EventCmd[] }[]; maps: { id: string; spots?: unknown[]; npcs: { id: string; showIf?: string }[] }[] }[];
const EVENTS = STORY.flatMap((f) => f.events);

/** Where each B verse is heard on the main story path (event id). */
const PLACED: Record<string, string> = {
  's-apyaham-jivitam': 'ch3.dandaka_sages',
  's-tasmajjato': 'ch3.enter_panchavati',
  's-sulabhah-purusha': 'ch3.khara',
  's-amantraye': 'ch3.maricha_deer',
  's-asti-kaccit': 'ch3.maricha_deer',
  's-sarvatra-khalu': 'ch3.jatayu',
  's-maya-tu-vividham': 'ch3.shabari',
  's-rocate-yadi': 'ch4.sugriva_alliance',
  's-sa-visrshto': 'ch4.sugriva_alliance',
  's-deshakalau': 'ch4.sugriva_alliance',
  's-esha-gharma': 'ch4.arrive_kishkindha',
  's-anena-tvam': 'ch4.council',
  's-ito-dvipe': 'ch4.sampati',
  's-uttishtha-hari': 'ch4.jambavan_speech',
};
/** Hidden moments of B (events reached from a map spot, not from the main path). */
const HIDDEN_EVENTS = new Set(['ch3.trees_remember']);

const KIDS = ['then', 'else', 'onWin', 'onLose', 'onCorrect', 'onWrong'] as const;
const isKatha = (c: unknown): boolean => typeof (c as { if?: unknown }).if === 'string' && /(^|&)style\.katha(&|$)/.test((c as { if: string }).if);

/** Every command with the event it is in and whether it sits inside a Kathā-only branch. */
function walk(visit: (c: EventCmd, event: string, inKatha: boolean) => void): void {
  const go = (cmds: EventCmd[] | undefined, event: string, inKatha: boolean): void => {
    for (const c of cmds ?? []) {
      visit(c, event, inKatha);
      const o = c as unknown as Record<string, EventCmd[] | undefined>;
      for (const k of KIDS) go(o[k], event, inKatha || (k === 'then' && isKatha(c)));
    }
  };
  for (const e of EVENTS) go(e.cmds, e.id, false);
}

test('v0.6 B: each B verse is heard at its moment, in a Kathā block, as a heard verse (never restorable, never a gate)', () => {
  assert.equal(B_IDS.length, 14);
  assert.deepEqual(new Set(Object.keys(PLACED)), new Set(B_IDS));
  const where = new Map<string, string[]>();
  walk((c, event, inKatha) => {
    if (!('shloka' in c) || !B_IDS.includes(c.shloka)) return;
    assert.ok(inKatha, `${c.shloka} in ${event} is outside a Kathā block`);
    assert.equal(c.mode ?? 'hear', 'hear', `${c.shloka} in ${event} must be heard`);
    where.set(c.shloka, [...(where.get(c.shloka) ?? []), event]);
  });
  for (const id of B_IDS) {
    const evs = (where.get(id) ?? []).filter((e) => !HIDDEN_EVENTS.has(e));
    assert.deepEqual(evs, [PLACED[id]], `${id}: heard once on the main path, in ${PLACED[id]}`);
    assert.equal(isRestorable(REAL, id), false, `${id} is heard only`);
    assert.ok(REAL.shlokas.find((s) => s.id === id)?.kathaOnly, `${id} is Kathā-only content`);
  }
  // no new gates: no B verse in a quiz, a smarana, a shrine requirement or a flag condition
  walk((c) => {
    if ('quiz' in c) assert.ok(!B_IDS.includes(c.shlokaId ?? ''), `quiz on a B verse ${c.shlokaId}`);
    if ('smarana' in c) assert.ok(!B_IDS.includes(c.smarana), `smarana on a B verse ${c.smarana}`);
    if ('if' in c) for (const id of B_IDS) assert.ok(!c.if.includes(id), `a condition on ${id}`);
  });
  // the practice journey's content has none of them
  const practice = practiceContent(REAL);
  for (const id of B_IDS) assert.ok(!practice.shlokas.some((s) => s.id === id), `${id} not in the practice content`);
});

/** B's new English lines (sa-dialogue-11.json). */
const B_LINES = new Set((dia11 as { entries: { en: string }[] }).entries.map((e) => e.en));

interface Seen {
  heard: string[];
  lines: Set<string>;
  deerProps: Set<string>;
  deerDown: boolean;
  deerUp: boolean;
  arrows: { x: number; y: number }[][];
  hanumanScale: number;
  kit: number;
}
function play(style: 'katha' | 'abhyasa', seed: number, level: Level): { seen: Seen; state: GameState; error: string | null; losses: number } {
  const seen: Seen = { heard: [], lines: new Set(), deerProps: new Set(), deerDown: false, deerUp: false, arrows: [], hanumanScale: 1, kit: 0 };
  const r = runWalkthrough(REAL, seed, level, {
    style,
    attempts: 12,
    ...(style === 'katha' ? { accuracy: 1 } : {}),
    onAction: (b, _a, n) => {
      // (a talk step's first pending is reported as the `before` state of the next action)
      for (const x of [b, n]) {
        if (x.pending?.kind === 'shloka' && B_IDS.includes(x.pending.shlokaId) && seen.heard.at(-1) !== x.pending.shlokaId) seen.heard.push(x.pending.shlokaId);
        if (x.pending?.kind === 'say' && B_LINES.has(x.pending.text)) seen.lines.add(x.pending.text);
      }
      const st = stageOf(n);
      for (const [id, p] of Object.entries(st.props)) if (p.sprite === 'deer') seen.deerProps.add(id);
      if (st.down.some((d) => d.startsWith('deer'))) seen.deerDown = true;
      if (seen.deerDown && Object.values(st.props).some((p) => p.sprite === 'deer') && !st.down.some((d) => d.startsWith('deer'))) seen.deerUp = true;
      seen.hanumanScale = Math.max(seen.hanumanScale, st.scale['hanuman_m'] ?? 1);
      for (const f of n.fx) {
        if (f.kind !== 'kit') continue;
        seen.kit++;
        if (f.name === 'arrow' && f.path) seen.arrows.push(f.path);
      }
    },
  });
  return { seen, state: r.state, error: r.error, losses: r.losses + r.defeats };
}

test('v0.6 B: the Kathā story bot hears all 14 B verses in book order and meets the three main-path set pieces; no lost fight', () => {
  for (const [seed, level] of [[3, 1], [11, 3], [19, 5]] as const) {
    const { seen, state, error, losses } = play('katha', seed, level);
    const tag = `seed ${seed} level ${level}`;
    assert.equal(error, null, `${tag}: ${error ?? ''}`);
    assert.ok(state.mode === 'ended' && state.save.flags['ch6.complete'], `${tag}: reaches the ending`);
    assert.equal(losses, 0, `${tag}: no lost fight`);
    for (const id of B_IDS) assert.ok(state.save.shlokas[id]?.heard, `${tag}: ${id} heard`);
    // book order = the chapters' shlokaIds (content.ts bookOrder) restricted to B
    const order = REAL.chapters.filter((c) => c.kanda === 3 || c.kanda === 4).flatMap((c) => c.shlokaIds).filter((id) => B_IDS.includes(id));
    assert.deepEqual(seen.heard, order, `${tag}: heard in book order`);
    // the deer show the way: three deer, lying, then risen; the arrow through seven sāla trees and back; Hanumān grows
    assert.equal(seen.deerProps.size, 3, `${tag}: three deer`);
    assert.ok(seen.deerDown && seen.deerUp, `${tag}: the deer rest, then rise`);
    assert.ok(seen.arrows.some((p) => p.length >= 9), `${tag}: an arrow through seven trees`);
    assert.ok(seen.arrows.length >= 2, `${tag}: the arrow comes back`);
    assert.equal(seen.hanumanScale, 3, `${tag}: Hanumān grows to 3×`);
    // every B line on the main path is met (the hidden moment's lines and Hanumān's optional line are not)
    const optional = new Set(EVENTS.filter((e) => HIDDEN_EVENTS.has(e.id) || e.id === 'ch4.hanuman_apart').flatMap((e) => JSON.stringify(e.cmds).match(/"say":"((?:[^"\\]|\\.)*)"/g) ?? []).map((m) => JSON.parse(m.slice(6)) as string));
    for (const en of B_LINES) if (!optional.has(en)) assert.ok(seen.lines.has(en), `${tag}: meets "${en.slice(0, 50)}…"`);
  }
});

test('v0.6 B: the practice journey is unchanged — no B verse, no B line, no kit effect in chapters 3–4', () => {
  for (const [seed, level] of [[5, 2], [13, 4]] as const) {
    const { seen, state, error } = play('abhyasa', seed, level);
    assert.equal(error, null, error ?? '');
    assert.ok(state.mode === 'ended');
    assert.deepEqual(seen.heard, [], 'no B verse heard');
    assert.equal(seen.lines.size, 0, 'no B line met');
    assert.equal(seen.kit, 0, 'no kit effect');
    for (const id of B_IDS) assert.ok(!state.save.shlokas[id], `${id} never in the save`);
  }
});

test('v0.6 B: the main-path set pieces are short — only ▶ to continue, waits ≤ 2 s each, at most 4 lines once the kit starts', () => {
  // v0.6.1: other story animations now share these events, so a piece is measured from its own first command
  const pieces: Record<string, [string, (c: EventCmd) => boolean]> = {
    'ch3.maricha_deer': ['the deer show the way', (c) => 'prop' in c && c.prop === 'deer1'],
    'ch4.sugriva_alliance': ['one arrow, seven trees', (c) => 'prop' in c && c.prop === 'sala1'],
    'ch4.jambavan_speech': ['Hanumān grows', (c) => 'grow' in c && c.grow === 'hanuman_m'],
  };
  for (const [event, [name, starts]] of Object.entries(pieces)) {
    let waits = 0;
    let says = 0;
    let kit = 0;
    const e = EVENTS.find((x) => x.id === event)!;
    const go = (cmds: EventCmd[] | undefined, inK: boolean): void => {
      for (const c of cmds ?? []) {
        if (inK && starts(c)) kit = Math.max(kit, 1);
        if (inK && kit > 0 && 'wait' in c) waits += c.wait;
        if (inK && kit > 0 && ('arrow' in c || 'prop' in c || 'grow' in c || 'topple' in c || 'rise' in c || 'fx' in c || 'glow' in c)) kit++;
        if (inK && kit > 0 && 'say' in c && B_LINES.has(c.say)) says++;
        if (inK) assert.ok(!('choice' in c) && !('battle' in c) && !('quiz' in c) && !('smarana' in c), `${name}: no input but ▶ (${JSON.stringify(c).slice(0, 40)})`);
        const o = c as unknown as Record<string, EventCmd[] | undefined>;
        for (const k of KIDS) go(o[k], inK || (k === 'then' && isKatha(c)));
      }
    };
    go(e.cmds, false);
    assert.ok(kit > 0, `${name}: uses the kit`);
    assert.ok(waits <= 2000, `${name}: ${waits} ms of waits`);
    assert.ok(says <= 4, `${name}: ${says} new lines once the kit starts`);
  }
});

test('v0.6 B: the trees remember — a hidden spot by the Pañcavaṭī hut, Kathā only, between the abduction and Jaṭāyu', () => {
  const map = REAL.maps.find((m) => m.id === 'panchavati')!;
  const spot = map.spots?.find((s) => s.event === 'ch3.trees_remember');
  assert.ok(spot, 'the spot exists');
  const at = (style: 'katha' | 'abhyasa', flags: string[]): GameState => {
    const s = newGame(2, 3, REAL, { name: 'B', avatar: 'a', style });
    const f: Record<string, true> = { ...s.save.flags };
    for (const x of flags) f[x] = true;
    return { ...s, mode: 'explore', script: null, pending: null, fx: [], save: { ...s.save, mapId: 'panchavati', x: spot.x, y: spot.y + 1, facing: 'up', flags: f } };
  };
  // found in Kathā after the abduction: petals, its lines, Sītā's verse heard again, the flag
  let s = reduce(at('katha', ['ch3.maricha_defeated']), REAL, { type: 'interact' });
  const met: string[] = [];
  let petals = false;
  let verse = '';
  for (let i = 0; i < 12 && s.pending; i++) {
    if (s.fx.some((f) => f.kind === 'kit' && f.name === 'petals')) petals = true;
    if (s.pending.kind === 'say') met.push(s.pending.text);
    if (s.pending.kind === 'shloka') verse = s.pending.shlokaId;
    s = reduce(s, REAL, { type: 'advance' });
  }
  assert.ok(petals, 'petals fall');
  assert.equal(met.length, 2);
  assert.ok(met.every((en) => B_LINES.has(en)));
  assert.equal(verse, 's-amantraye');
  assert.ok(s.save.flags['ch3.trees_remembered'], 'found');
  // found again: one quiet line
  let again = reduce({ ...s, mode: 'explore', script: null, pending: null }, REAL, { type: 'interact' });
  assert.equal(again.pending?.kind, 'say');
  again = reduce(again, REAL, { type: 'advance' });
  assert.equal(again.pending, null);
  // not before the abduction, not after Jaṭāyu's glade, never in the practice game
  for (const [style, flags] of [['katha', []], ['katha', ['ch3.maricha_defeated', 'ch3.jatayu_done']], ['abhyasa', ['ch3.maricha_defeated']]] as const) {
    const n = reduce(at(style, [...flags]), REAL, { type: 'interact' });
    assert.ok(!(n.pending?.kind === 'say' && B_LINES.has(n.pending.text)), `${style} ${flags.join('+') || '(start)'}: inactive`);
  }
});

test('v0.6 B: every new Kathā line of B has its Sanskrit in sa-dialogue-11.json and it verifies; Hanumān on the clifftop is Kathā only', () => {
  const sa = new Map((dia11 as { entries: { en: string; sa: string }[] }).entries.map((e) => [e.en, e.sa]));
  const o = getOracle();
  walk((c, event, inKatha) => {
    if (!('say' in c) || !B_LINES.has(c.say)) return;
    assert.ok(inKatha, `"${c.say}" (${event}) sits in a Kathā block`);
    const t = sa.get(c.say)!;
    const r = o.verifyLine(t, { en: c.say });
    assert.ok(r.ok, `${c.say} → ${t}: ${r.errors.join('; ')}`);
  });
  const npc = STORY.flatMap((f) => f.maps).find((m) => m.id === 'mahendra_hill')!.npcs.find((n) => n.id === 'hanuman_m')!;
  assert.match(npc.showIf ?? '', /style\.katha/);
});

test('v0.6 B: the deer sprite is drawn by B (brown, not the golden deer) and has its name', () => {
  assert.ok((SPRITE_IDS as readonly string[]).includes('deer'));
  const a = buildSprite('deer' as never, 'down', 0);
  const g = buildSprite('golden_deer' as never, 'down', 0);
  let diff = 0;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 16; x++) if (a.get(x, y) !== g.get(x, y)) diff++;
  assert.ok(diff > 20, `the deer differs from the golden deer (${diff} pixels)`);
  for (const d of ['down', 'up', 'right', 'left'] as const) for (const f of [0, 1, 2] as const) assert.ok(buildSprite('deer' as never, d, f), `${d} ${f}`);
  assert.ok(REAL.names.some((n) => n.id === 'person.deer'), 'names-4 has person.deer');
});

