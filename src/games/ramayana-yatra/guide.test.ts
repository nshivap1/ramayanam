/**
 * "Show the way" (v0.4.2, fx-guide): the map pointer's target (logic-guide.ts guideTarget).
 *  - routing rules on a small fixture: the goal on this map / an exit toward another map; the practice game prefers a
 *    route without encounter grass when one exists, Kathā takes the shortest; npc places, hidden npcs, shrines, closed
 *    routes; null when every step is done or after the ending; memoized and pure (never in the save)
 *  - every walkthrough step of the real story: from the step's start the target is non-null, serves that step, and is
 *    reachable; null after the ending (both journey styles)
 *  - the pointer-following bot (logic-sim runGuide): from a new journey it only ever walks to the pointer and acts there,
 *    and reaches the ending of the whole game in both styles (practice, Kathā perfect and 70 % reciters) over several
 *    seeds × levels. RY_GUIDE_SEEDS=25 runs the full matrix (default 3 seeds per level).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { type Level, testMatrix } from '@sdk';
import { loadContent } from './content';
import { manifest } from './manifest';
import { type GameContent, type GameState, type MapDef, guideStep, guideTarget, mapById, newGame, testFlag, toSave } from './logic';
import { findPath, spot, talkSpots } from './logic-guide';
import { runGuide, runWalkthrough } from './logic-sim';

const REAL = loadContent();
const LEVELS = manifest.levels as Level[];

// ───────────────────────── fixture ─────────────────────────

/**
 * ga: the player at (1,3). Exit X (1,0) is 3 steps away across two kuśa (encounter) tiles; exit W (11,3) is 10 steps
 * away on plain grass. Both lead to gb (2,2). gb: the goal tile (3,2), a shrine at (3,0), an npc at (3,1).
 */
const GA: MapDef = {
  id: 'ga',
  nameId: 'place.ga',
  kanda: 1,
  width: 12,
  height: 5,
  legend: { '#': 'tree', '.': 'grass', ',': 'kusha', X: 'grass', W: 'grass' },
  ground: ['#X##########', '#,##########', '#,##########', '#..........W', '############'],
  music: 'ashrama',
  battleBg: 'ashrama',
  npcs: [],
  warps: [
    { x: 1, y: 0, to: 'gb', tx: 2, ty: 2 },
    { x: 11, y: 3, to: 'gb', tx: 2, ty: 2 },
  ],
  triggers: [],
};
const GB: MapDef = {
  id: 'gb',
  nameId: 'place.gb',
  kanda: 1,
  width: 6,
  height: 5,
  legend: { '#': 'tree', '.': 'grass', S: 'shrine' },
  ground: ['###S##', '#....#', '#....#', '#....#', '######'],
  music: 'ashrama',
  battleBg: 'ashrama',
  npcs: [
    { id: 'sage', sprite: 'valmiki', x: 3, y: 1, facing: 'down', event: 'none' },
    { id: 'ghost', sprite: 'rishi', x: 4, y: 3, facing: 'down', event: 'none', showIf: 'seen.ghost' },
  ],
  warps: [{ x: 1, y: 1, to: 'ga', tx: 1, ty: 3 }],
  triggers: [],
};
function fixture(action: GameContent['walkthrough'][number]['action'], maps: MapDef[] = [GA, GB]): GameContent {
  return { ...REAL, maps, walkthrough: [{ chapter: 1, map: 'gb', action, expectFlag: 'test.done' }] };
}
function at(content: GameContent, mapId: string, x: number, y: number, patch: Partial<GameState['save']> = {}): GameState {
  const s = newGame(1, 3, REAL, { name: 'Guide', avatar: 'a' });
  return { ...s, mode: 'explore', script: null, pending: null, fx: [], save: { ...s.save, mapId, x, y, flags: {}, npcPos: {}, ...patch } };
}
const REACH = fixture({ reach: { x: 3, y: 2 } });

test('guide: another map → the exit the shortest route crosses; the practice game avoids encounter grass when it can, Kathā takes the shortest', () => {
  const practice = guideTarget(at(REACH, 'ga', 1, 3), REACH);
  assert.deepEqual(practice, { kind: 'exit', map: 'ga', x: 11, y: 3, to: 'gb', step: 0, goal: { map: 'gb', x: 3, y: 2 }, distance: 10 });
  const katha = guideTarget(at(REACH, 'ga', 1, 3, { style: 'katha' }), REACH);
  assert.deepEqual(katha && { kind: katha.kind, x: katha.x, y: katha.y, distance: katha.distance }, { kind: 'exit', x: 1, y: 0, distance: 3 }, 'Kathā (no random encounters): the shortest way');
  // the only way crosses the grass: then the practice game takes it
  const onlyGrass = fixture({ reach: { x: 3, y: 2 } }, [{ ...GA, warps: [GA.warps[0]!] }, GB]);
  const g = guideTarget(at(onlyGrass, 'ga', 1, 3), onlyGrass);
  assert.deepEqual(g && { kind: g.kind, x: g.x, y: g.y, distance: g.distance }, { kind: 'exit', x: 1, y: 0, distance: 3 });
});

test('guide: on the goal map → the tile / the person / the shrine itself; standing at it → distance 0', () => {
  assert.deepEqual(guideTarget(at(REACH, 'gb', 1, 1), REACH), { kind: 'tile', map: 'gb', x: 3, y: 2, step: 0, goal: { map: 'gb', x: 3, y: 2 }, distance: 3 });
  assert.equal(guideTarget(at(REACH, 'gb', 3, 2), REACH)?.distance, 0, 'standing on the tile');
  const talk = fixture({ talk: 'sage' });
  assert.deepEqual(guideTarget(at(talk, 'gb', 1, 2), talk), { kind: 'npc', map: 'gb', x: 3, y: 1, npc: 'sage', step: 0, goal: { map: 'gb', x: 3, y: 1 }, distance: 2 });
  // a scripted move put the sage elsewhere: the pointer follows him
  const moved = guideTarget(at(talk, 'gb', 1, 2, { npcPos: { 'gb/sage': { x: 1, y: 3, facing: 'up' } } }), talk);
  assert.deepEqual(moved && { x: moved.x, y: moved.y, distance: moved.distance }, { x: 1, y: 3, distance: 0 }, 'beside him already');
  // not visible yet (showIf): its defined place
  const ghost = fixture({ talk: 'ghost' });
  const gh = guideTarget(at(ghost, 'gb', 1, 1), ghost);
  assert.deepEqual(gh && { kind: gh.kind, x: gh.x, y: gh.y }, { kind: 'npc', x: 4, y: 3 });
  // from another map, toward a person: the exit
  assert.equal(guideTarget(at(talk, 'ga', 1, 3), talk)?.kind, 'exit');
  const recite = fixture({ recite: 's-ma-nishada' }, [GA, { ...GB, npcs: [] }]); // the sage would stand in front of the shrine
  assert.deepEqual(guideTarget(at(recite, 'gb', 1, 3), recite), { kind: 'shrine', map: 'gb', x: 3, y: 0, recite: 's-ma-nishada', step: 0, goal: { map: 'gb', x: 3, y: 0 }, distance: 4 });
});

test('guide: no open route (a closed gate) → still an exit toward the goal map, distance -1', () => {
  const closed = fixture({ reach: { x: 3, y: 2 } }, [{ ...GA, warps: GA.warps.map((w) => ({ ...w, requires: 'gate.open' })) }, GB]);
  const g = guideTarget(at(closed, 'ga', 1, 3), closed);
  assert.ok(g && g.kind === 'exit' && g.to === 'gb' && g.distance === -1, JSON.stringify(g));
  const open = guideTarget(at(closed, 'ga', 1, 3, { flags: { 'gate.open': true } }), closed);
  assert.equal(open?.distance, 10);
});

test('guide: null when every step is done and after the ending; memoized per save; pure (nothing in the save)', () => {
  assert.equal(guideTarget(at(REACH, 'ga', 1, 3, { flags: { 'test.done': true } }), REACH), null);
  assert.equal(guideStep({ flags: { 'test.done': true } }, REACH), -1);
  const s = at(REACH, 'ga', 1, 3);
  assert.equal(guideTarget({ ...s, mode: 'ended' }, REACH), null);
  const before = JSON.stringify(s);
  const saved = JSON.stringify(toSave(s));
  const a = guideTarget(s, REACH);
  assert.equal(guideTarget(s, REACH), a, 'the same save object → the same (memoized) target');
  assert.equal(guideTarget({ ...s, pending: { kind: 'wait', ms: 1 } }, REACH), a, 'depends on the save only');
  const moved = { ...s, save: { ...s.save, x: 2 } };
  assert.notEqual(guideTarget(moved, REACH), a, 'a new save → recomputed');
  assert.equal(guideTarget(moved, REACH)?.distance, 9);
  assert.equal(JSON.stringify(s), before, 'the state is untouched');
  assert.equal(JSON.stringify(toSave(s)), saved, 'the save is byte-identical');
  assert.ok(!Object.keys(toSave(s)).some((k) => /guide|way/i.test(k)), 'the save holds nothing of it');
});

// ───────────────────────── every walkthrough step of the real story ─────────────────────────

/** The place where a target is acted on is reachable from here (an independent BFS). */
function reachable(s: GameState, content: GameContent, g: NonNullable<ReturnType<typeof guideTarget>>): boolean {
  const map = mapById(content, s.save.mapId)!;
  if (g.kind === 'exit') {
    const w = map.warps.find((x) => x.x === g.x && x.y === g.y);
    if (!w || w.to !== g.to || !testFlag(s.save.flags, w.requires)) return false;
    return !!findPath(s, content, (m, x, y) => m === w.to && x === w.tx && y === w.ty);
  }
  const spots = g.kind === 'tile' ? new Set([spot(g.x, g.y)]) : g.kind === 'npc' ? talkSpots(content, map.id, g.x, g.y) : new Set([spot(g.x + 1, g.y), spot(g.x - 1, g.y), spot(g.x, g.y + 1), spot(g.x, g.y - 1)]);
  if (spots.has(spot(s.save.x, s.save.y))) return true;
  return !!findPath(s, content, (m, x, y) => m === map.id && spots.has(spot(x, y)));
}

test('guide on the REAL story: at the start of every walkthrough step the target is non-null, serves that step and is reachable; null after the ending (both journey styles)', () => {
  const problems: string[] = [];
  let checked = 0;
  for (const style of ['abhyasa', 'katha'] as const) {
    for (const seed of [5, 23]) {
      const starts: GameState[] = [];
      const r = runWalkthrough(REAL, seed, 3, { style, ...(style === 'katha' ? { accuracy: 1, attempts: 12 } : {}), onStep: (_i, s) => starts.push(s) });
      assert.equal(r.error, null, `${style} seed ${seed}: ${r.error}`);
      // the first step starts after the intro; step i + 1 starts where step i ended
      const intro = runWalkthrough(REAL, seed, 3, { style, steps: [] }).state;
      for (const [i, s] of [intro, ...starts.slice(0, -1)].entries()) {
        const g = guideTarget(s, REAL);
        const tag = `${style} seed ${seed} step ${i} ${JSON.stringify(REAL.walkthrough[i]?.action)} on ${REAL.walkthrough[i]?.map} (player on ${s.save.mapId} ${s.save.x},${s.save.y}, mode ${s.mode})`;
        checked++;
        if (!g) {
          problems.push(`${tag}: no target`);
          continue;
        }
        if (g.step !== guideStep(s.save, REAL)) problems.push(`${tag}: serves step ${g.step}, not the first open one`);
        if (g.step < i) problems.push(`${tag}: points back at step ${g.step}`);
        if (g.map !== s.save.mapId) problems.push(`${tag}: the pointer is on ${g.map}`);
        if (g.goal.map !== REAL.walkthrough[g.step]?.map) problems.push(`${tag}: goal on ${g.goal.map}`);
        if (g.distance < 0 || !reachable(s, REAL, g)) problems.push(`${tag}: ${g.kind} (${g.x},${g.y}) is not reachable`);
      }
      assert.equal(r.state.mode, 'ended', `${style} seed ${seed}: the story ended`);
      assert.equal(guideTarget(r.state, REAL), null, 'no pointer after the ending');
      assert.equal(guideTarget({ ...r.state, mode: 'explore' }, REAL), null, 'every step done: no pointer');
    }
  }
  assert.deepEqual(problems.slice(0, 20), [], `${problems.length} problem(s) in ${checked} step starts`);
  assert.ok(checked >= 4 * REAL.walkthrough.length - 8, `checked ${checked} step starts`);
});

// ───────────────────────── the pointer-following bot ─────────────────────────

test('pointer-following bot: from a new journey, walking only to the pointer and acting there reaches the ending of the whole game — practice, Kathā (perfect) and Kathā (70 % reciter) × levels × seeds', (t) => {
  const seeds = Math.max(1, Math.min(25, Number(process.env['RY_GUIDE_SEEDS'] ?? 3) || 3));
  const failures: string[] = [];
  for (const [style, accuracy] of [['abhyasa', undefined], ['katha', 1], ['katha', 0.7]] as const) {
    const sum = { runs: 0, targets: 0, exits: 0, recoveries: 0, defeats: 0 };
    for (const { level, seed } of testMatrix(LEVELS, seeds)) {
      const r = runGuide(REAL, seed, level, { style, ...(accuracy !== undefined ? { accuracy } : {}), attempts: accuracy !== undefined && accuracy < 1 ? 12 : 6 });
      sum.runs++;
      sum.targets += r.targets;
      sum.exits += r.exits;
      sum.recoveries += r.recoveries;
      sum.defeats += r.defeats;
      const tag = `${style}${accuracy !== undefined ? ` acc ${accuracy}` : ''} seed ${seed} level ${level}`;
      if (r.error) failures.push(`${tag}: ${r.error}`);
      else if (r.state.mode !== 'ended' || !r.state.save.flags['ch6.complete']) failures.push(`${tag}: stopped at step ${r.step} in mode ${r.state.mode}`);
      if (failures.length >= 3) break;
    }
    const n = Math.max(1, sum.runs);
    t.diagnostic(`${style}${accuracy !== undefined ? ` (accuracy ${accuracy})` : ''}: ${sum.runs} runs to the ending · per run ${(sum.targets / n).toFixed(0)} targets (${(sum.exits / n).toFixed(0)} exits), ${(sum.recoveries / n).toFixed(2)} recoveries, ${(sum.defeats / n).toFixed(2)} defeats`);
  }
  assert.deepEqual(failures, []);
});

test('pointer-following bot stops cleanly where asked (chapter 1 in both styles), and the pointer never leaves the player\'s map', () => {
  for (const style of ['abhyasa', 'katha'] as const) {
    let off = 0;
    const r = runGuide(REAL, 41, 3, { style, until: (s) => !!s.save.flags['ch1.complete'], onTarget: (s, g) => void (g.map !== s.save.mapId && off++) });
    assert.equal(r.error, null, `${style}: ${r.error}`);
    assert.equal(r.state.save.flags['ch1.complete'], true);
    assert.equal(off, 0);
    assert.ok(r.targets > 5 && r.exits > 0, `${style}: people, places and exits (${r.targets} targets, ${r.exits} exits)`);
  }
});
