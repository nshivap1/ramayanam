/**
 * v0.5b WP0 (notes/v05b-plan.md §0–§1, §7 "WP0"): the hooks the four packages build on.
 *  - Kathā-only walkthrough steps (`WalkStep.style: 'katha'`) are skipped in the practice game by guideStep /
 *    guideTarget, runWalkthrough, runGuide and quest progress, and followed in Kathā (a synthetic Kathā-only step
 *    inserted into the real story); the practice bot plays exactly as without it
 *  - P1 `{smarana, pada}` story recitation: pending challenge context 'scene', graded and recorded like a shrine pāda,
 *    no feedback pending, the script carries on after a hit or a miss; "least"; a mastered pāda recites itself;
 *    skipped in the practice game and for unknown verses
 *  - P2 `{book: n}` book review: pending 'book', ▶ continues; skipped in the practice game
 *  - P3 avoid-triggers: findPath keeps out of an active one (inSight); P4 playerSprite; P5 setu hooks (stub: the
 *    command is skipped; a solved bridge continues; the bot's actions); P6 the 'antya' pick (the bot's accuracy) and
 *    katha-chain.json; the new content files are loaded
 * The practice hash on the real content is in logic.test.ts (V05A_PRACTICE). Packages add their own test files
 * (notes/v05b-ownership.md); this one is WP0's.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRng } from '@sdk';
import { DIALOGUE_FILES, UI_FILES, loadContent } from './content';
import {
  type Challenge,
  type EventCmd,
  type GameContent,
  type GameState,
  type MapDef,
  type SetuPending,
  type WalkStep,
  HANUMAN_FLAG,
  LEAST,
  avoidActive,
  chainDuel,
  guideStep,
  guideTarget,
  inSight,
  isChainDuel,
  isSolidTile,
  leastPada,
  newGame,
  playerSprite,
  reduce,
  setuBotActions,
  setuSolved,
  stepInJourney,
  storyProgress,
} from './logic';
import { startScript } from './logic-events';
import { findPath } from './logic-guide';
import { autoplay, botActions, runGuide, runWalkthrough } from './logic-sim';

const REAL = loadContent();

/** A calm state on the real content (explore, nothing pending), Kathā or practice. */
function calm(style?: 'katha', patch: Partial<GameState['save']> = {}): GameState {
  const s = newGame(1, 3, REAL, { name: 'Hooks', avatar: 'a', ...(style ? { style } : {}) });
  return { ...s, mode: 'explore', script: null, pending: null, fx: [], save: { ...s.save, ...patch } };
}
const run = (s: GameState, cmds: unknown[]): GameState => startScript(s, REAL, 'test.v05b', cmds as EventCmd[]);
const proj = (s: GameState): string => createHash('sha256').update(JSON.stringify({ save: s.save, session: s.session, mode: s.mode, tick: s.tick })).digest('hex').slice(0, 16);

// ───────────────────────── Kathā-only walkthrough steps ─────────────────────────

/**
 * The real story with one Kathā-only step after "talk to Vālmīki" (ch1.restored_ma_nishada): reach a tile beside him
 * on tamasa_ashrama, where a Kathā-only once-trigger sets `v05b.katha_step`.
 */
function withKathaStep(): { content: GameContent; at: number } {
  const i = REAL.walkthrough.findIndex((w) => w.expectFlag === 'ch1.restored_ma_nishada');
  const base = REAL.walkthrough[i]!;
  const map = REAL.maps.find((m) => m.id === base.map)!;
  const npc = map.npcs.find((n) => 'talk' in base.action && n.id === base.action.talk)!;
  const free = [[0, 1], [0, -1], [1, 0], [-1, 0]]
    .map(([dx, dy]) => ({ x: npc.x + dx!, y: npc.y + dy! }))
    .find((p) => !isSolidTile(map, p.x, p.y) && !map.triggers.some((t) => p.x >= t.x && p.y >= t.y && p.x < t.x + t.w && p.y < t.y + t.h) && !map.warps.some((w) => w.x === p.x && w.y === p.y) && !map.npcs.some((n) => n.x === p.x && n.y === p.y));
  assert.ok(free, 'a free tile beside Vālmīki');
  const step: WalkStep = { chapter: base.chapter, map: map.id, action: { reach: free }, expectFlag: 'v05b.katha_step', style: 'katha' };
  const maps = REAL.maps.map((m) => (m.id === map.id ? { ...m, triggers: [...m.triggers, { x: free.x, y: free.y, w: 1, h: 1, event: 'common.v05b_katha_step', requires: 'style.katha' }] } : m));
  const events = [...REAL.events, { id: 'common.v05b_katha_step', cmds: [{ set: 'v05b.katha_step' }] as EventCmd[] }];
  const walkthrough = [...REAL.walkthrough.slice(0, i + 1), step, ...REAL.walkthrough.slice(i + 1)];
  return { content: { ...REAL, maps, events, walkthrough }, at: i + 1 };
}

test('v0.5b: stepInJourney — a step with style "katha" belongs to the Kathā journey only; others to both', () => {
  const step: WalkStep = { chapter: 1, map: 'm', action: { reach: { x: 0, y: 0 } }, expectFlag: 'f' };
  assert.ok(stepInJourney(step, {}) && stepInJourney(step, { style: 'katha' }) && stepInJourney(step, { style: 'abhyasa' }));
  const k = { ...step, style: 'katha' as const };
  assert.ok(!stepInJourney(k, {}) && !stepInJourney(k, { style: 'abhyasa' }) && stepInJourney(k, { style: 'katha' }));
});

test('v0.5b: a Kathā-only step is skipped in the practice game by guideStep / guideTarget and quest progress, and served in Kathā', () => {
  const { content, at } = withKathaStep();
  const done = Object.fromEntries(content.walkthrough.slice(0, at).map((w) => [w.expectFlag, true as const]));
  const practice = calm(undefined, { flags: done });
  const katha = calm('katha', { flags: { ...done, 'style.katha': true } });
  assert.equal(guideStep(practice.save, content), at + 1, 'practice: the step after the Kathā-only one');
  assert.equal(guideStep(katha.save, content), at, 'Kathā: the Kathā-only step');
  assert.equal(guideTarget(practice, content)?.step, at + 1);
  assert.equal(guideTarget(katha, content)?.step, at);
  // quest progress counts the steps of the save's journey (ch6.complete left out: it means 1 on its own)
  const shared = content.walkthrough.filter((w) => !w.style);
  const most = Object.fromEntries(shared.filter((w) => w.expectFlag !== 'ch6.complete').map((w) => [w.expectFlag, true as const]));
  const n = shared.filter((w) => w.expectFlag !== 'ch6.complete').length;
  assert.equal(storyProgress(calm(undefined, { flags: most }), content), n / shared.length, 'practice: the Kathā-only step is not counted');
  // v0.5b packages add their own Kathā-only steps: the Kathā journey counts every step of the walkthrough
  assert.equal(storyProgress(calm('katha', { flags: { ...most, 'style.katha': true } }), content), n / content.walkthrough.length, 'Kathā: it is');
  const all = { ...most, 'ch6.complete': true as const };
  assert.equal(guideStep({ flags: all }, content), -1, 'practice: every step done');
  assert.equal(guideStep({ flags: all, style: 'katha' }, content), at, 'Kathā: the Kathā-only step is still open');
});

test('v0.5b: runWalkthrough skips a Kathā-only step in the practice game (plays exactly as without it) and follows it in Kathā', () => {
  const { content, at } = withKathaStep();
  const steps: number[] = [];
  const a = runWalkthrough(content, 4, 3, { onStep: (i) => steps.push(i) });
  const b = runWalkthrough(REAL, 4, 3);
  assert.equal(a.error, null, a.error ?? '');
  assert.equal(a.failedAt, -1);
  assert.ok(!steps.includes(at), 'onStep never reports the Kathā-only step in the practice game');
  assert.equal(steps.length, REAL.walkthrough.filter((w) => !w.style).length, 'every shared step, with its index in the walkthrough');
  assert.equal(a.actions, b.actions, 'the same actions');
  assert.equal(proj(a.state), proj(b.state), 'the same final state');
  assert.ok(!a.state.save.flags['v05b.katha_step']);
  const k = runWalkthrough(content, 4, 3, { style: 'katha', accuracy: 1, attempts: 12 });
  assert.equal(k.error, null, k.error ?? '');
  assert.ok(k.state.save.flags['v05b.katha_step'], 'Kathā: the Kathā-only step was done');
  assert.equal(k.state.mode, 'ended');
});

test('v0.5b: runGuide (the pointer-following bot) never targets a Kathā-only step in the practice game, and does in Kathā', () => {
  const { content, at } = withKathaStep();
  const until = (s: GameState): boolean => guideStep(s.save, content) > at + 2 || guideStep(s.save, content) < 0;
  const seen: number[] = [];
  const p = runGuide(content, 2, 3, { until, onTarget: (_s, g) => seen.push(g.step) });
  assert.equal(p.error, null, p.error ?? '');
  assert.ok(!seen.includes(at), 'practice: the pointer skipped the Kathā-only step');
  assert.ok(seen.includes(at + 1));
  const kseen: number[] = [];
  const k = runGuide(content, 2, 3, { style: 'katha', accuracy: 1, until, onTarget: (_s, g) => kseen.push(g.step) });
  assert.equal(k.error, null, k.error ?? '');
  assert.ok(k.state.save.flags['v05b.katha_step'], 'Kathā: the pointer led to the Kathā-only step');
});

// ───────────────────────── P1: story recitation ─────────────────────────

const VERSE = 's-ma-nishada';

test('v0.5b P1: {smarana, pada} pends a story recitation (context scene); a hit or a miss is recorded and the script carries on', () => {
  const s0 = run(calm('katha'), [{ smarana: VERSE, pada: 0 }, { say: 'after' }]);
  assert.equal(s0.pending?.kind, 'challenge');
  const p = s0.pending as Extract<GameState['pending'], { kind: 'challenge' }>;
  assert.equal(p.context, 'scene');
  const sp = p.challenge.smarana!;
  assert.ok(sp && sp.shlokaId === VERSE && sp.pada === 0);
  assert.equal(sp.gaps.length, 1, 'one gap, as at a shrine');
  assert.equal(sp.gapOptions[0]!.length, 3, 'three chips');
  const right = sp.gapAnswers[0]![0]!;
  const wrong = sp.gapOptions[0]!.find((o) => o.id !== right)!.id;
  // a hit
  const hit = reduce(s0, REAL, { type: 'answer', picks: [right], timeMs: 900 });
  assert.equal(hit.pending?.kind, 'say');
  assert.equal(hit.lastSmarana?.context, 'scene');
  assert.equal(hit.lastSmarana?.correct, true);
  assert.equal(hit.save.smrti?.[`${VERSE}:0`]?.streak, 1, 'recorded like a shrine pāda');
  assert.equal(hit.session.total, s0.session.total + 1);
  assert.ok(hit.fx.some((f) => f.kind === 'sfx' && f.name === 'correct'));
  // a miss: the story carries on all the same
  const miss = reduce(s0, REAL, { type: 'answer', picks: [wrong], timeMs: 900 });
  assert.equal(miss.pending?.kind, 'say');
  assert.equal(miss.lastSmarana?.correct, false);
  assert.equal(miss.save.smrti?.[`${VERSE}:0`]?.level ?? 0, 0);
  // anything else: the same object
  for (const a of [{ type: 'answer', picks: ['zz'], timeMs: 1 }, { type: 'answer', picks: [], timeMs: 1 }, { type: 'answer', picks: [right, right], timeMs: 1 }, { type: 'answer', picks: [right], timeMs: -5 }, { type: 'choose', index: 0 }, { type: 'advance' }] as const) {
    assert.equal(reduce(s0, REAL, a as never), s0, JSON.stringify(a));
  }
  // the bot recites it
  const auto = autoplay(s0, REAL);
  assert.equal(auto.mode, 'explore');
});

test('v0.5b P1: "least" recites the least-practised pāda (ties → the first); a mastered pāda recites itself, mastery untouched', () => {
  const smrti = { [`${VERSE}:0`]: { level: 2, streak: 0 }, [`${VERSE}:1`]: { level: 1, streak: 1 }, [`${VERSE}:2`]: { level: 1, streak: 0 }, [`${VERSE}:3`]: { level: 3, streak: 0 } };
  const s = calm('katha', { smrti });
  assert.equal(leastPada(s, REAL, VERSE), 2);
  assert.equal(leastPada(calm('katha'), REAL, VERSE), 0, 'all fresh: the first');
  assert.equal(leastPada(s, REAL, 'no-such-verse'), null);
  const p = run(s, [{ smarana: VERSE, pada: LEAST }]).pending;
  assert.ok(p?.kind === 'challenge' && p.challenge.smarana?.pada === 2);
  const mastered = Object.fromEntries([0, 1, 2, 3].map((i) => [`${VERSE}:${i}`, { level: 4, streak: 0, casts: 3, nextCheck: 4 }]));
  const m = run(calm('katha', { smrti: mastered }), [{ smarana: VERSE, pada: LEAST }, { say: 'after' }]);
  const mp = m.pending as Extract<GameState['pending'], { kind: 'challenge' }>;
  assert.equal(mp.challenge.smarana?.gaps.length, 0, 'a mastered pāda recites itself (no gap, no spot check)');
  const done = reduce(m, REAL, { type: 'answer', picks: [], timeMs: 400 });
  assert.equal(done.pending?.kind, 'say');
  assert.deepEqual(done.save.smrti, m.save.smrti, 'mastery untouched');
  assert.equal(done.session.total, m.session.total, 'not counted as an answer');
});

test('v0.5b P1: skipped in the practice game, and for an unknown verse or pāda', () => {
  const cmds = [{ smarana: VERSE, pada: 0 }, { say: 'after' }];
  const p = run(calm(), cmds);
  assert.ok(p.pending?.kind === 'say' && p.pending.text === 'after', 'practice: no recitation');
  assert.equal(p.save.smrti, undefined);
  for (const bad of [{ smarana: 'no-such-verse', pada: 0 }, { smarana: VERSE, pada: 7 }, { smarana: VERSE, pada: 1.5 }]) {
    const k = run(calm('katha'), [bad, { say: 'after' }]);
    assert.ok(k.pending?.kind === 'say', JSON.stringify(bad));
  }
});

// ───────────────────────── P2: book review ─────────────────────────

test('v0.5b P2: {book: n} pends a read-only review; advance continues; skipped in the practice game and for a bad book', () => {
  const s = run(calm('katha'), [{ book: 1 }, { say: 'after' }]);
  assert.deepEqual(s.pending, { kind: 'book', kanda: 1 });
  assert.equal(reduce(s, REAL, { type: 'choose', index: 0 }), s);
  assert.equal(reduce(s, REAL, { type: 'answer', picks: [], timeMs: 1 }), s);
  const next = reduce(s, REAL, { type: 'advance' });
  assert.ok(next.pending?.kind === 'say' && next.pending.text === 'after');
  assert.deepEqual(next.save, s.save, 'read-only');
  assert.ok(run(calm(), [{ book: 1 }, { say: 'after' }]).pending?.kind === 'say', 'practice: skipped');
  for (const b of [0, 7, 2.5, '1']) assert.ok(run(calm('katha'), [{ book: b }, { say: 'after' }]).pending?.kind === 'say', `book ${String(b)}`);
  assert.equal(autoplay(s, REAL).mode, 'explore', 'the bot continues past it');
});

// ───────────────────────── P3: avoid-triggers ─────────────────────────

test('v0.5b P3: findPath keeps out of an active avoid-trigger (a guard\'s line of sight); inactive ones are crossed', () => {
  const lane: MapDef = {
    id: 'lane', nameId: 'place.lane', kanda: 5, width: 7, height: 3, legend: { '#': 'tree', '.': 'grass' },
    ground: ['#######', '.......', '#.....#'], music: 'lanka', battleBg: 'lanka', npcs: [], warps: [],
    triggers: [{ x: 3, y: 1, w: 1, h: 1, event: 'ch5.seen', once: false, avoid: true, requires: 'style.katha&!ch5.dark' }],
  };
  const content: GameContent = { ...REAL, maps: [lane] };
  const s = calm('katha', { mapId: 'lane', x: 0, y: 1, flags: { 'style.katha': true } });
  const t = lane.triggers[0]!;
  assert.ok(avoidActive(t, 'lane', s.save.flags));
  assert.ok(inSight(lane, s.save.flags, 3, 1) && !inSight(lane, s.save.flags, 3, 2));
  const path = findPath(s, content, (m, x, y) => m === 'lane' && x === 6 && y === 1)!;
  let x = 0;
  let y = 1;
  const visited: string[] = [];
  for (const d of path) {
    x += d === 'right' ? 1 : d === 'left' ? -1 : 0;
    y += d === 'down' ? 1 : d === 'up' ? -1 : 0;
    visited.push(`${x},${y}`);
  }
  assert.ok(!visited.includes('3,1'), `the route goes around the guard's sight: ${visited.join(' ')}`);
  assert.equal(findPath(s, content, (m, gx, gy) => m === 'lane' && gx === 3 && gy === 1), null, 'never even as the goal');
  // inactive (requires fails; a once-trigger already fired): crossed
  const dark = { ...s, save: { ...s.save, flags: { ...s.save.flags, 'ch5.dark': true as const } } };
  assert.ok(!avoidActive(t, 'lane', dark.save.flags));
  assert.equal(findPath(dark, content, (m, gx, gy) => m === 'lane' && gx === 6 && gy === 1)?.length, 6, 'straight through');
  const once = { ...t, once: true };
  assert.ok(avoidActive(once, 'lane', s.save.flags) && !avoidActive(once, 'lane', { ...s.save.flags, 'trig.lane.ch5.seen': true }));
});

// ───────────────────────── P4: the player's sprite ─────────────────────────

test('v0.5b P4: playerSprite — Hanumān only in Kathā, in book 5, with katha.hanuman; else the avatar', () => {
  const f = { [HANUMAN_FLAG]: true as const };
  assert.equal(playerSprite({ avatar: 'a', style: 'katha', chapter: 5, flags: f }), 'hanuman');
  assert.equal(playerSprite({ avatar: 'b', style: 'katha', chapter: 5, flags: f }), 'hanuman');
  assert.equal(playerSprite({ avatar: 'a', style: 'katha', chapter: 6, flags: f }), 'player_a', 'a stale flag in book 6 changes nothing');
  assert.equal(playerSprite({ avatar: 'b', chapter: 5, flags: f }), 'player_b', 'the practice game');
  assert.equal(playerSprite({ avatar: 'a', style: 'katha', chapter: 5, flags: {} }), 'player_a');
});

// ───────────────────────── P5: Nala's bridge (hooks; the puzzle is WP-D's) ─────────────────────────

test('v0.5b P5: {setu} opens the bridge puzzle in Kathā (WP-D), is skipped in practice; a solved bridge continues; the bot solves a pending bridge', () => {
  assert.ok(run(calm('katha'), [{ setu: '6.22' }, { say: 'after' }]).pending?.kind === 'setu');
  assert.ok(run(calm(), [{ setu: '6.22' }, { say: 'after' }]).pending?.kind === 'say', 'practice: skipped');
  const bridge = (cells: number[]): SetuPending => ({ kind: 'setu', tag: 't', cols: 5, turns: 4, cells, solution: [1, 0, 2, 0, 3], taps: 0, hint: null });
  assert.ok(setuSolved(bridge([1, 0, 2, 0, 3])) && !setuSolved(bridge([0, 0, 2, 0, 3])));
  assert.deepEqual(setuBotActions(bridge([1, 0, 0, 0, 3]))[0], { type: 'choose', index: 2 });
  assert.deepEqual(setuBotActions(bridge([1, 0, 2, 0, 3]))[0], { type: 'advance' });
  // a pending bridge inside a script (as WP-D's startSetu will make it): solved → advance continues
  const s = run(calm('katha'), [{ say: 'before' }, { say: 'after' }]);
  const pend: GameState = { ...s, pending: bridge([1, 0, 2, 0, 3]) };
  const next = reduce(pend, REAL, { type: 'advance' });
  assert.ok(next.pending?.kind === 'say' && next.pending.text === 'after');
  assert.ok(botActions(pend, REAL, { recited: false, rested: false }).some((a) => a.type === 'advance'));
});

// ───────────────────────── P6: the verse-chain pick (hooks; the duel is WP-C's) ─────────────────────────

test("v0.5b P6: an 'antya' pick is answered through options / answers; the bot's reciter misses at its accuracy; katha-chain.json is loaded", () => {
  const ch: Challenge = {
    id: 'c-1', kind: 'antya', prompt: 'Which line?', lexIds: [], explanation: '', timeLimitMs: 0,
    options: [{ id: 'o0', sa: 'क' }, { id: 'o1', sa: 'ख' }, { id: 'o2', sa: 'ग' }], answers: ['o1'],
    antya: { key: null, lines: [{ shlokaId: VERSE, pada: 0 }, { shlokaId: VERSE, pada: 1 }, { shlokaId: VERSE, pada: 2 }] },
  };
  const s: GameState = { ...calm('katha'), mode: 'script', pending: { kind: 'challenge', challenge: ch, context: 'battle' } };
  const ok = botActions(s, REAL, { recited: false, rested: false, reciter: { accuracy: 1, rng: createRng(1) } })[0];
  assert.deepEqual(ok, { type: 'answer', option: 'o1', timeMs: 500 });
  const miss = botActions(s, REAL, { recited: false, rested: false, reciter: { accuracy: 0, rng: createRng(1) } })[0] as { option?: string };
  assert.ok(miss.option && miss.option !== 'o1', 'a miss picks a chip that does not chain');
  assert.deepEqual(botActions(s, REAL, { recited: false, rested: false })[0], ok, 'no reciter: always right');
  assert.ok(Array.isArray(REAL.chain?.duels), 'content.chain from katha-chain.json');
  const c2: GameContent = { ...REAL, chain: { version: 1, duels: [{ foe: 'hanuman_duel', links: 5, source: 'Kiṣkindhā 4.3' }] } };
  assert.equal(chainDuel(c2, 'hanuman_duel')?.links, 5);
  assert.ok(isChainDuel(calm('katha'), c2, { kind: 'duel', enemies: [{ id: 'hanuman_duel', level: 9 }] }));
  assert.ok(!isChainDuel(calm(), c2, { kind: 'duel', enemies: [{ id: 'hanuman_duel', level: 9 }] }), 'the practice game keeps its debate');
});

test('v0.5b: the new content files are loaded (sa-dialogue-6…9, sa-ui-scene / -setu / -chain, katha-chain.json)', () => {
  assert.equal(DIALOGUE_FILES.length, 9);
  assert.equal(UI_FILES.length, 7);
  assert.ok(REAL.chain && REAL.chain.version === 1);
});
