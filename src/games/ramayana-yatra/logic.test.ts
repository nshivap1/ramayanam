/**
 * Core engine tests. OWNER: core.
 *  - unit tests on small inline fixture content (independent of the real story files)
 *  - loadGame fuzzing, determinism, reduce-never-throws fuzz bot
 *  - the story-bot: follows content.walkthrough on the REAL content for every level × 25 seeds
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRng, testMatrix, type Level } from '@sdk';
import { manifest } from './manifest';
import { loadContent } from './content';
import { getOracle } from './sa-verify';
import { type UiSlot, uiEn, uiSa } from './sa-ui';
import type { Action, BattleSpec, EventCmd, GameContent, GameState, MapDef } from './types';
import {
  DEFEAT_TEXT,
  REST_TEXT,
  SHRINE_LEAVE,
  SHRINE_REST,
  SHRINE_SAVE,
  currentMap,
  isWalkable,
  joinLevel,
  knownMoves,
  loadGame,
  nextBookObjective,
  newGame,
  npcInFront,
  reduce,
  sessionResult,
  storyProgress,
  tileAt,
  toSave,
  uiAllySlot,
  uiItemSlot,
  visibleNpcs,
} from './logic';
import { autoplay, runWalkthrough } from './logic-sim';

// ───────────────────────── fixture content ─────────────────────────

const M1: MapDef = {
  id: 'm1',
  nameId: 'place.m1',
  kanda: 1,
  width: 10,
  height: 8,
  legend: { '#': 'tree', '.': 'grass', ',': 'kusha', S: 'shrine', I: 'sign', W: 'well', C: 'chest', M: 'market_stall', D: 'hut_door', G: 'gate', '~': 'water', B: 'bridge_h' },
  ground: ['##########', '#....S.IW#', '#........#', '#..M....C#', '#,,,.....D', '#,,,.....G', '#..~~....#', '##########'],
  overlay: ['          ', '          ', '          ', '          ', '          ', '          ', '    B     ', '          '],
  music: 'ashrama',
  battleBg: 'ashrama',
  encounters: { rate: 1, table: [{ enemyId: 'nishachara', weight: 1, minLevel: 2, maxLevel: 2 }] },
  npcs: [
    { id: 'sage', sprite: 'valmiki', x: 2, y: 2, facing: 'down', event: 't.sage' },
    { id: 'seller', sprite: 'merchant', x: 3, y: 2, facing: 'down', event: 't.shop' },
    { id: 'ghost', sprite: 'rishi', x: 4, y: 2, facing: 'down', event: 't.ghost', solid: false },
    { id: 'hidden', sprite: 'child', x: 6, y: 2, facing: 'down', event: 't.hidden', showIf: 'show.hidden' },
    { id: 'bard', sprite: 'narada', x: 7, y: 3, facing: 'left', event: 't.hear' },
    { id: 'ender', sprite: 'vasishtha', x: 8, y: 6, facing: 'up', event: 't.end', showIf: 'restored.s1' },
  ],
  warps: [
    { x: 9, y: 4, to: 'm2', tx: 2, ty: 3, facing: 'up' },
    { x: 9, y: 5, to: 'm2', tx: 1, ty: 3, requires: 'gate.open', lockedEvent: 't.locked' },
  ],
  triggers: [
    { x: 6, y: 4, w: 1, h: 1, event: 't.trig' },
    { x: 7, y: 6, w: 1, h: 1, event: 't.rep', once: false },
    { x: 5, y: 6, w: 1, h: 1, event: 't.req', requires: 'need.flag' },
  ],
  signs: [{ x: 7, y: 1, text: 'A sign.' }],
};
const M2: MapDef = {
  id: 'm2',
  nameId: 'place.m2',
  kanda: 1,
  width: 5,
  height: 5,
  legend: { '#': 'tree', '.': 'grass', D: 'hut_door' },
  ground: ['#####', '#...#', '#...#', '#...#', '##D##'],
  music: 'ashrama',
  battleBg: 'ashrama',
  npcs: [{ id: 'host', sprite: 'rishika', x: 3, y: 1, facing: 'down', event: 't.host' }],
  warps: [{ x: 2, y: 4, to: 'm1', tx: 8, ty: 4, facing: 'left' }],
  triggers: [],
  onEnter: 't.enter2',
};

const ev = (id: string, cmds: EventCmd[]) => ({ id, cmds });
const NISH_SPEC: BattleSpec = { enemies: [{ id: 'nishachara', level: 2 }], kind: 'boss', canRun: false, canLose: false, bg: 'forest', music: 'boss' };

function fixture(): GameContent {
  const prov = { sources: [{ name: 'test fixture' }], verifiedBy: [] };
  const stats = (hp: number, atk: number) => ({ hp, atk, def: 8, spd: 8 });
  const lex = ['a', 'b', 'c', 'd', 'e', 'f'].map((k, i) => ({
    id: `lx${k}`,
    lemma: `w${k}`,
    pos: 'noun' as const,
    gender: 'm' as const,
    meaning: `meaning ${k}`,
    forms: [{ form: `w${k}`, grammar: 'nom. sg.', shlokaIds: ['s1'] }],
    tags: ['person'],
    provenance: prov,
    ...(i < 0 ? {} : {}),
  }));
  return {
    shlokas: [
      {
        id: 's1',
        kanda: 1,
        sarga: 1,
        verse: 1,
        edition: 'fixture',
        meter: 'other',
        padas: ['wa wb', 'wc wd', 'we wf', 'wa wc'],
        words: [
          { form: 'wa', lexId: 'lxa', grammar: 'nom. sg.', gloss: 'a', role: 'subject', pada: 0 },
          { form: 'wb', lexId: 'lxb', grammar: 'acc. sg.', gloss: 'b', role: 'object', pada: 0 },
          { form: 'wc', lexId: 'lxc', grammar: 'nom. sg.', gloss: 'c', role: 'subject', pada: 1 },
          { form: 'wd', lexId: 'lxd', grammar: 'acc. sg.', gloss: 'd', role: 'object', pada: 1 },
          { form: 'we', lexId: 'lxe', grammar: 'nom. sg.', gloss: 'e', role: 'subject', pada: 2 },
          { form: 'wf', lexId: 'lxf', grammar: 'acc. sg.', gloss: 'f', role: 'object', pada: 2 },
          { form: 'wa', lexId: 'lxa', grammar: 'nom. sg.', gloss: 'a', role: 'subject', pada: 3 },
          { form: 'wc', lexId: 'lxc', grammar: 'nom. sg.', gloss: 'c', role: 'subject', pada: 3 },
        ],
        sandhiNotes: [],
        translation: 'fixture',
        context: 'fixture',
        speaker: 'fixture',
        teaches: [],
        provenance: prov,
      },
    ],
    lexicon: lex,
    names: [],
    moves: [
      { id: 'pada_bana', nameId: 'move.pada_bana', element: 'none', power: 35, pp: 20, challenge: 'artha', description: '', origin: '' },
      { id: 'lipi_raksha', nameId: 'move.lipi_raksha', element: 'none', power: 0, pp: 10, challenge: 'artha', effect: { kind: 'buff-def', amount: 1, target: 'party' }, description: '', origin: '' },
      { id: 'shoka_shloka', nameId: 'move.shoka_shloka', element: 'divya', power: 60, pp: 10, challenge: 'artha', description: '', origin: '', unlockShloka: 's1' },
      { id: 'bana', nameId: 'move.bana', element: 'none', power: 40, pp: 20, challenge: 'artha', description: '', origin: '' },
      { id: 'nakha', nameId: 'move.nakha', element: 'none', power: 40, pp: 30, challenge: 'artha', description: '', origin: '' },
    ],
    allies: [
      { id: 'player', nameId: 'ally.player', battler: 'b_player_a', element: 'none', base: stats(30, 12), growth: stats(4, 2), moves: [{ moveId: 'pada_bana', level: 1 }, { moveId: 'lipi_raksha', level: 1 }, { moveId: 'shoka_shloka', level: 1 }], description: '', overworld: 'player_a' },
      { id: 'rama', nameId: 'ally.rama', battler: 'b_rama', element: 'divya', base: stats(40, 14), growth: stats(5, 3), moves: [{ moveId: 'bana', level: 1 }], description: '', overworld: 'rama' },
    ],
    enemies: [{ id: 'nishachara', nameId: 'enemy.nishachara', battler: 'b_nishachara', element: 'maya', base: stats(12, 6), growth: stats(2, 1), moves: [{ moveId: 'nakha', level: 1 }], description: '', xp: 10, niska: 5, kind: 'wild' }],
    items: [
      { id: 'phala', nameId: 'item.phala', kind: 'heal', amount: 0.4, price: 20, description: '' },
      { id: 'madhu', nameId: 'item.madhu', kind: 'pp', amount: 5, price: 30, description: '' },
      { id: 'oshadhi', nameId: 'item.oshadhi', kind: 'revive', amount: 0.5, price: 80, description: '' },
    ],
    chapters: [{ kanda: 1, nameId: 'kanda.1', summary: 'fixture', startMap: 'm1', startX: 4, startY: 4, shlokaIds: ['s1'], keyShloka: 's1' }],
    maps: [M1, M2],
    events: [
      ev('common.intro', [{ say: 'intro' }, { objective: 'Go' }]),
      ev('t.sage', [{ say: 'Hello {player}' }, { choice: 'Pick', options: [{ label: 'Yes', set: 'said.yes' }, { label: 'No', goto: 'no' }] }, { say: 'after' }, { goto: 'end' }, { label: 'no' }, { set: 'said.no' }, { label: 'end' }]),
      ev('t.shop', [{ say: 'Buy?' }, { shop: ['phala', 'madhu', 'unknown_item'] }, { say: 'Bye' }]),
      ev('t.ghost', [{ say: 'boo' }]),
      ev('t.hidden', [{ say: 'found me' }]),
      ev('t.hear', [{ shloka: 's1' }, { learn: ['lxa', 'lxb', 'nope'] }, { set: 'bard.done' }]),
      ev('t.end', [{ set: 'ch6.complete' }, { end: true }]),
      ev('t.locked', [{ say: 'locked' }]),
      ev('t.trig', [{ set: 'trig.ran' }, { say: 'triggered' }]),
      ev('t.rep', [{ say: 'rep' }]),
      ev('t.req', [{ say: 'req' }]),
      ev('t.enter2', [{ if: '!entered2', then: [{ set: 'entered2' }, { say: 'welcome' }] }]),
      ev('t.host', [{ say: 'host' }]),
      ev('t.loop', [{ label: 'a' }, { set: 'x' }, { goto: 'a' }]),
      ev('t.if', [{ if: 'f1', then: [{ set: 'then.ran' }], else: [{ set: 'else.ran' }, { if: 'f2', then: [{ goto: 'out' }] }, { set: 'after.inner' }] }, { set: 'after.if' }, { label: 'out' }, { set: 'end.ran' }]),
      ev('t.cmds', [
        { give: 'phala', qty: 3 },
        { take: 'phala' },
        { niska: 25 },
        { niska: -1000 },
        { join: 'rama' },
        { join: 'rama' },
        { join: 'nobody' },
        { music: 'forest' },
        { sfx: 'win' },
        { objective: 'New goal' },
        { face: 'sage', dir: 'left' },
        { move: 'sage', path: ['right', 'down'] },
        { move: 'player', path: ['left'] },
        { wait: 300 },
        { fade: 'out' },
        { chapter: 2 },
        { set: 'ch1.complete' },
        { set: 'ch1.complete' },
        { leave: 'rama' },
        { save: true },
        { rest: true },
        { heal: true },
        { warp: 'm2', x: 1, y: 1, facing: 'right' },
        { say: 'done' },
      ]),
      ev('t.quiz', [{ quiz: 'artha', lexIds: ['lxa'], onCorrect: [{ set: 'quiz.ok' }], onWrong: [{ set: 'quiz.bad' }] }, { set: 'quiz.after' }]),
      ev('t.battle', [{ battle: NISH_SPEC, onWin: [{ set: 'won' }], onLose: [{ set: 'lost' }] }, { set: 'battle.after' }]),
      ev('t.duel', [{ battle: { ...NISH_SPEC, kind: 'duel', canLose: true }, onWin: [{ set: 'duel.won' }], onLose: [{ set: 'duel.lost' }] }, { set: 'duel.after' }]),
      ev('t.restore', [{ shloka: 's1', mode: 'restore' }, { set: 'restore.after' }]),
    ],
    walkthrough: [
      { chapter: 1, map: 'm1', action: { talk: 'bard' }, expectFlag: 'bard.done' },
      { chapter: 1, map: 'm1', action: { recite: 's1' }, expectFlag: 'restored.s1' },
      { chapter: 1, map: 'm1', action: { talk: 'sage' }, expectFlag: 'said.yes' },
      { chapter: 1, map: 'm2', action: { talk: 'host' }, expectFlag: 'entered2' },
      { chapter: 1, map: 'm1', action: { reach: { x: 6, y: 4 } }, expectFlag: 'trig.ran' },
      { chapter: 1, map: 'm1', action: { talk: 'ender' }, expectFlag: 'ch6.complete' },
    ],
  };
}

const FX = fixture();
const LEVELS = manifest.levels;

/** Explore state on the fixture with the intro dismissed, placed at (x, y) facing dir. */
function at(x: number, y: number, facing: 'up' | 'down' | 'left' | 'right' = 'down', patch: Partial<GameState['save']> = {}, content = FX): GameState {
  let s = newGame(1, 3, content, { name: 'Tester', avatar: 'a' });
  s = autoplay(s, content);
  return { ...s, save: { ...s.save, x, y, facing, ...patch } };
}
function run(s: GameState, ...actions: Action[]): GameState {
  return actions.reduce((acc, a) => reduce(acc, FX, a), s);
}
function startEv(s: GameState, id: string): GameState {
  // talk-free way to start an event in tests: make it an npc's event? Simpler: use a fresh script.
  const e = FX.events.find((x) => x.id === id)!;
  return reduce({ ...s, mode: 'script', script: { eventId: id, frames: [{ cmds: e.cmds, pc: 0 }] }, pending: { kind: 'wait', ms: 0 } }, FX, { type: 'advance' });
}
const ADV: Action = { type: 'advance' };

// ───────────────────────── new game / selectors ─────────────────────────

test('newGame: chapter 1 start, player at level 3, intro script, deterministic', () => {
  for (const level of LEVELS) {
    const s = newGame(42, level, FX, { name: '  Arjun  ', avatar: 'b' });
    assert.deepEqual(newGame(42, level, FX, { name: '  Arjun  ', avatar: 'b' }), s);
    assert.equal(s.mode, 'script');
    assert.deepEqual(s.pending, { kind: 'say', text: 'intro' });
    assert.equal(s.save.mapId, 'm1');
    assert.deepEqual([s.save.x, s.save.y], [4, 4]);
    assert.equal(s.save.playerName, 'Arjun');
    assert.equal(s.save.avatar, 'b');
    assert.equal(s.save.chapter, 1);
    assert.equal(s.save.party.length, 1);
    assert.equal(s.save.party[0]!.id, 'player');
    assert.equal(s.save.party[0]!.level, 3);
    const e = reduce(s, FX, ADV);
    assert.equal(e.mode, 'explore');
    assert.equal(e.pending, null);
    assert.equal(e.save.objective, 'Go');
  }
  const noIntro = { ...FX, events: FX.events.filter((e) => e.id !== 'common.intro') };
  const n = newGame(1, 3, noIntro, { name: '', avatar: 'a' });
  assert.equal(n.mode, 'explore');
  assert.ok(n.save.playerName.length > 0, 'empty names get a default');
  assert.ok(n.save.objective.length > 0);
  const empty: GameContent = { shlokas: [], lexicon: [], names: [], moves: [], allies: [], enemies: [], items: [], chapters: [], maps: [], events: [], walkthrough: [] };
  const z = newGame(1, 3, empty, { name: 'x', avatar: 'a' });
  assert.equal(z.mode, 'explore');
  assert.equal(currentMap(z, empty).width, 1);
  assert.equal(reduce(z, empty, { type: 'step', dir: 'up' }).save.y, z.save.y);
});

test('tileAt / isWalkable / visibleNpcs', () => {
  const s = at(4, 4);
  assert.deepEqual(tileAt(M1, 0, 0), { ground: 'tree', overlay: null });
  assert.deepEqual(tileAt(M1, 4, 6), { ground: 'water', overlay: 'bridge_h' });
  assert.deepEqual(tileAt(M1, -1, 0), { ground: null, overlay: null });
  assert.deepEqual(tileAt(M1, 10, 0), { ground: null, overlay: null });
  assert.equal(isWalkable(s, FX, 4, 3), true);
  assert.equal(isWalkable(s, FX, 0, 0), false, 'tree');
  assert.equal(isWalkable(s, FX, 3, 6), false, 'water');
  assert.equal(isWalkable(s, FX, 4, 6), false, 'solid if either layer is solid');
  assert.equal(isWalkable(s, FX, -1, 4), false, 'out of bounds');
  assert.equal(isWalkable(s, FX, 4, 4), false, 'the player');
  assert.equal(isWalkable(s, FX, 2, 2), false, 'solid npc');
  assert.equal(isWalkable(s, FX, 4, 2), true, 'non-solid npc');
  assert.equal(isWalkable(s, FX, 6, 2), true, 'hidden npc (showIf false)');
  assert.deepEqual(visibleNpcs(s, FX).map((n) => n.id), ['sage', 'seller', 'ghost', 'bard']);
  const shown = { ...s, save: { ...s.save, flags: { 'show.hidden': true as const }, npcPos: { 'm1/sage': { x: 5, y: 2, facing: 'up' as const } } } };
  assert.equal(isWalkable(shown, FX, 6, 2), false);
  const sage = visibleNpcs(shown, FX).find((n) => n.id === 'sage')!;
  assert.deepEqual([sage.x, sage.y, sage.facing], [5, 2, 'up'], 'npcPos overrides');
  assert.equal(isWalkable(shown, FX, 2, 2), true, 'moved npc frees its old tile');
});

// ───────────────────────── movement, warps, triggers, encounters ─────────────────────────

test('step: move, bump into walls/npcs, face', () => {
  const s = at(4, 4, 'down');
  const up = reduce(s, FX, { type: 'step', dir: 'up' });
  assert.deepEqual([up.save.x, up.save.y, up.save.facing], [4, 3, 'up']);
  assert.deepEqual(up.fx, []);
  const wall = reduce(at(1, 1, 'down'), FX, { type: 'step', dir: 'up' });
  assert.deepEqual([wall.save.x, wall.save.y, wall.save.facing], [1, 1, 'up']);
  assert.deepEqual(wall.fx, [{ kind: 'bump' }]);
  const npc = reduce(at(2, 3, 'down'), FX, { type: 'step', dir: 'up' });
  assert.deepEqual([npc.save.x, npc.save.y], [2, 3]);
  assert.deepEqual(npc.fx, [{ kind: 'bump' }]);
  const ghost = reduce(at(4, 3), FX, { type: 'step', dir: 'up' });
  assert.deepEqual([ghost.save.x, ghost.save.y], [4, 2], 'walk through a non-solid npc');
  const f = reduce(s, FX, { type: 'face', dir: 'left' });
  assert.equal(f.save.facing, 'left');
  assert.equal(reduce(f, FX, { type: 'face', dir: 'left' }), f, 'same facing → same object');
  assert.equal(reduce(s, FX, { type: 'step', dir: 'diagonal' as never }), s);
  // fx are cleared on the next reduce
  const next = reduce(wall, FX, { type: 'step', dir: 'right' });
  assert.deepEqual(next.fx, []);
});

test('warps: door, onEnter (every entry), locked warp with lockedEvent, way back', () => {
  const s = at(8, 4);
  const w = reduce(s, FX, { type: 'step', dir: 'right' });
  assert.equal(w.save.mapId, 'm2');
  assert.deepEqual([w.save.x, w.save.y, w.save.facing], [2, 3, 'up']);
  assert.ok(w.fx.some((f) => f.kind === 'warp'));
  assert.equal(w.mode, 'script', 'onEnter runs');
  assert.deepEqual(w.pending, { kind: 'say', text: 'welcome' });
  const in2 = reduce(w, FX, ADV);
  assert.equal(in2.mode, 'explore');
  assert.equal(in2.save.flags['entered2'], true);
  const back = reduce(in2, FX, { type: 'step', dir: 'down' });
  assert.equal(back.save.mapId, 'm1');
  assert.deepEqual([back.save.x, back.save.y, back.save.facing], [8, 4, 'left']);
  const again = reduce(reduce(back, FX, { type: 'step', dir: 'right' }), FX, { type: 'interact' });
  assert.equal(again.save.mapId, 'm2');
  assert.equal(again.mode, 'explore', 'guarded onEnter does not repeat');
  // locked gate
  const g = reduce(at(8, 5), FX, { type: 'step', dir: 'right' });
  assert.deepEqual([g.save.mapId, g.save.x, g.save.y, g.save.facing], ['m1', 8, 5, 'right'], 'locked warp blocks the step');
  assert.deepEqual(g.pending, { kind: 'say', text: 'locked' });
  const open = reduce(at(8, 5, 'down', { flags: { 'gate.open': true, entered2: true } }), FX, { type: 'step', dir: 'right' });
  assert.deepEqual([open.save.mapId, open.save.x, open.save.y, open.save.facing], ['m2', 1, 3, 'right'], 'facing defaults to the step dir');
});

test('triggers: once (flag trig.<map>.<event>), repeatable, requires', () => {
  const s = at(5, 4);
  const t1 = reduce(s, FX, { type: 'step', dir: 'right' });
  assert.equal(t1.mode, 'script');
  assert.equal(t1.save.flags['trig.m1.t.trig'], true);
  const done = reduce(t1, FX, ADV);
  assert.equal(done.save.flags['trig.ran'], true);
  const off = reduce(done, FX, { type: 'step', dir: 'left' });
  const t2 = reduce(off, FX, { type: 'step', dir: 'right' });
  assert.equal(t2.mode, 'explore', 'once-trigger does not fire twice');
  // repeatable
  let r = at(7, 5);
  for (let i = 0; i < 2; i++) {
    r = reduce(r, FX, { type: 'step', dir: 'down' });
    assert.deepEqual(r.pending, { kind: 'say', text: 'rep' });
    r = reduce(reduce(r, FX, ADV), FX, { type: 'step', dir: 'up' });
  }
  // requires
  const q = reduce(at(5, 5), FX, { type: 'step', dir: 'down' });
  assert.equal(q.mode, 'explore');
  const q2 = reduce(at(5, 5, 'down', { flags: { 'need.flag': true } }), FX, { type: 'step', dir: 'down' });
  assert.deepEqual(q2.pending, { kind: 'say', text: 'req' });
});

test('encounters: stepping on kusha rolls an encounter; state stays valid', () => {
  let s = at(4, 4);
  let battles = 0;
  for (let i = 0; i < 40; i++) {
    s = reduce(s, FX, { type: 'step', dir: i % 2 === 0 ? 'left' : 'right' });
    if (s.mode === 'battle') {
      battles++;
      assert.ok(s.fx.some((f) => f.kind === 'encounter'));
      assert.ok(s.battle);
      s = autoplay(s, FX);
    }
    assert.ok(['explore', 'script'].includes(s.mode));
    if (s.mode === 'script') s = autoplay(s, FX);
  }
  assert.ok(battles >= 0);
});

// ───────────────────────── interact ─────────────────────────

test('interact: npc turns to face the player, signs, shrine, well, chest, counters, nothing', () => {
  const s = at(2, 3, 'up');
  const t = reduce(s, FX, { type: 'interact' });
  assert.equal(t.mode, 'script');
  assert.deepEqual(t.pending, { kind: 'say', text: 'Hello {player}' });
  assert.deepEqual(t.save.npcPos['m1/sage'], { x: 2, y: 2, facing: 'down' });
  const sign = reduce(at(7, 2, 'up'), FX, { type: 'interact' });
  assert.deepEqual(sign.pending, { kind: 'say', text: 'A sign.' });
  assert.equal(reduce(sign, FX, ADV).mode, 'explore');
  const shrine = reduce(at(5, 2, 'up'), FX, { type: 'interact' });
  assert.deepEqual(shrine.pending, { kind: 'shrine' });
  const well = reduce(at(8, 2, 'up'), FX, { type: 'interact' });
  assert.equal(well.mode, 'explore');
  assert.equal(well.fx[0]?.kind, 'toast');
  const chest = reduce(at(8, 2, 'down'), FX, { type: 'interact' });
  assert.equal(chest.fx[0]?.kind, 'toast');
  const counter = at(3, 4, 'up');
  assert.equal(npcInFront(counter, FX)?.id, 'seller');
  assert.deepEqual(reduce(counter, FX, { type: 'interact' }).pending, { kind: 'say', text: 'Buy?' });
  const none = at(5, 4, 'down');
  assert.equal(reduce(none, FX, { type: 'interact' }), none);
});

// ───────────────────────── interpreter ─────────────────────────

test('interpreter: say, choice with set, choice with goto, labels', () => {
  const s = at(2, 3, 'up');
  let a = run(s, { type: 'interact' }, ADV);
  assert.deepEqual(a.pending, { kind: 'choice', prompt: 'Pick', options: ['Yes', 'No'] });
  assert.equal(reduce(a, FX, { type: 'choose', index: 2 }), a, 'out of range');
  assert.equal(reduce(a, FX, ADV), a, 'advance does not answer a choice');
  const yes = reduce(a, FX, { type: 'choose', index: 0 });
  assert.equal(yes.save.flags['said.yes'], true);
  assert.deepEqual(yes.pending, { kind: 'say', text: 'after' });
  const yesDone = reduce(yes, FX, ADV);
  assert.equal(yesDone.mode, 'explore');
  assert.equal(yesDone.script, null);
  assert.equal(yesDone.save.flags['said.no'], undefined, 'goto end skipped the no branch');
  a = run(s, { type: 'interact' }, ADV, { type: 'choose', index: 1 });
  assert.equal(a.mode, 'explore');
  assert.equal(a.save.flags['said.no'], true);
});

test('interpreter: if/else frames and goto out of a nested block', () => {
  const base = at(4, 4);
  const t = startEv(base, 't.if');
  assert.equal(t.mode, 'explore');
  assert.deepEqual(Object.keys(t.save.flags).sort(), ['after.if', 'after.inner', 'else.ran', 'end.ran']);
  const t2 = startEv({ ...base, save: { ...base.save, flags: { f2: true } } }, 't.if');
  assert.deepEqual(Object.keys(t2.save.flags).sort(), ['else.ran', 'end.ran', 'f2']);
  const t3 = startEv({ ...base, save: { ...base.save, flags: { f1: true } } }, 't.if');
  assert.deepEqual(Object.keys(t3.save.flags).sort(), ['after.if', 'end.ran', 'f1', 'then.ran']);
});

test('interpreter: goto loops are caught with a clear error naming the event', () => {
  assert.throws(() => startEv(at(4, 4), 't.loop'), /Event "t\.loop" ran more than 500 commands/);
});

test('interpreter: items, niska, party, music/sfx, objective, move/face, wait/fade, chapter, completion, save, rest, warp', () => {
  let s = startEv(at(4, 4, 'down', { niska: 50 }), 't.cmds');
  assert.ok(s.fx.some((f) => f.kind === 'toast'));
  assert.ok(s.fx.some((f) => f.kind === 'music' && f.track === 'forest'));
  assert.ok(s.fx.some((f) => f.kind === 'sfx' && f.name === 'win'));
  assert.equal(s.save.items['phala'], 2);
  assert.equal(s.save.niska, 0, 'niska never goes below 0');
  assert.deepEqual(s.save.party.map((m) => m.id), ['player', 'rama'], 'join once; unknown allies are skipped');
  assert.equal(s.save.party[1]!.level, joinLevel({ party: [s.save.party[0]!], chapter: 1 }), 'joins at joinLevel (party average, chapter floor)');
  assert.equal(s.save.objective, 'New goal');
  // first pending: the sage's move (already applied)
  assert.deepEqual(s.pending, { kind: 'move', who: 'sage', path: ['right', 'down'] });
  assert.deepEqual(s.save.npcPos['m1/sage'], { x: 3, y: 3, facing: 'down' });
  s = reduce(s, FX, ADV);
  assert.deepEqual(s.pending, { kind: 'move', who: 'player', path: ['left'] });
  assert.deepEqual([s.save.x, s.save.y, s.save.facing], [3, 4, 'left']);
  s = reduce(s, FX, ADV);
  assert.deepEqual(s.pending, { kind: 'wait', ms: 300 });
  s = reduce(s, FX, ADV);
  assert.deepEqual(s.pending, { kind: 'fade', to: 'out' });
  s = reduce(s, FX, ADV);
  assert.deepEqual(s.pending, { kind: 'title', nameId: 'kanda.2' });
  assert.equal(s.save.chapter, 2);
  s = reduce(s, FX, ADV);
  assert.deepEqual(s.save.completedChapters, [1]);
  assert.deepEqual(s.session.chaptersCompleted, [1], 'chapter completion recorded once');
  assert.deepEqual(s.save.party.map((m) => m.id), ['player'], 'leave');
  assert.deepEqual(s.pending, { kind: 'save' });
  s = reduce(s, FX, ADV);
  assert.deepEqual(s.save.respawn, { mapId: 'm1', x: 3, y: 4 }, 'rest sets the respawn point here');
  assert.equal(s.save.mapId, 'm2');
  assert.deepEqual([s.save.x, s.save.y, s.save.facing], [1, 1, 'right']);
  assert.ok(s.fx.some((f) => f.kind === 'warp'));
  assert.deepEqual(s.pending, { kind: 'say', text: 'welcome' }, 'onEnter pushed by the warp command');
  s = reduce(s, FX, ADV);
  assert.deepEqual(s.pending, { kind: 'say', text: 'done' });
  s = reduce(s, FX, ADV);
  assert.equal(s.mode, 'explore');
});

test('chapter completion (chN.complete) fully heals the party and sets a next-book objective; a later {objective} wins', () => {
  const s = at(4, 4, 'down', { objective: 'Old goal' });
  const hurt = { ...s, save: { ...s.save, party: s.save.party.map((m) => ({ ...m, hp: 0, pp: Object.fromEntries(Object.keys(m.pp).map((k) => [k, 0])) })) } };
  const script = (cmds: EventCmd[]): GameState => reduce({ ...hurt, mode: 'script', script: { eventId: 'x', frames: [{ cmds, pc: 0 }] }, pending: { kind: 'wait', ms: 0 } }, FX, ADV);
  const a = script([{ set: 'ch1.complete' }, { say: 'done' }]);
  assert.equal(a.save.party[0]!.hp, s.save.party[0]!.hp, 'HP restored');
  assert.deepEqual(a.save.party[0]!.pp, s.save.party[0]!.pp, 'PP restored');
  assert.equal(a.save.objective, nextBookObjective(1));
  assert.match(a.save.objective, /Book 2/);
  const b = script([{ set: 'ch1.complete' }, { objective: 'Find Vasishtha in Ayodhya' }, { say: 'done' }]);
  assert.equal(b.save.objective, 'Find Vasishtha in Ayodhya');
  const c = script([{ choice: 'End?', options: [{ label: 'Yes', set: 'ch2.complete' }] }]);
  const c2 = reduce(c, FX, { type: 'choose', index: 0 });
  assert.equal(c2.save.party[0]!.hp, s.save.party[0]!.hp, 'also via a choice option');
  assert.deepEqual(c2.save.completedChapters, [2]);
  const again = script([{ set: 'other.flag' }, { say: 'x' }]);
  assert.equal(again.save.party[0]!.hp, 0, 'other flags do not heal');
  assert.equal(again.save.objective, 'Old goal');
  assert.match(nextBookObjective(6), /journey is complete/);
});

test('interpreter: heal / rest restore HP and PP', () => {
  const s = at(4, 4);
  const hurt = { ...s, save: { ...s.save, party: s.save.party.map((m) => ({ ...m, hp: 1, pp: Object.fromEntries(Object.keys(m.pp).map((k) => [k, 0])) })) } };
  const h = reduce({ ...hurt, mode: 'script', script: { eventId: 'x', frames: [{ cmds: [{ heal: true }, { say: 'ok' }], pc: 0 }] }, pending: { kind: 'wait', ms: 0 } }, FX, ADV);
  assert.equal(h.save.party[0]!.hp, s.save.party[0]!.hp);
  assert.deepEqual(h.save.party[0]!.pp, s.save.party[0]!.pp);
});

test('quiz: challenge → answer → feedback → onCorrect / onWrong', () => {
  const s = startEv(at(4, 4), 't.quiz');
  assert.equal(s.pending?.kind, 'challenge');
  if (s.pending?.kind !== 'challenge') return;
  assert.equal(s.pending.context, 'quiz');
  const ch = s.pending.challenge;
  assert.equal(ch.timeLimitMs, 0, 'story quizzes are untimed');
  assert.equal(reduce(s, FX, ADV), s, 'advance does not skip a challenge');
  assert.equal(reduce(s, FX, { type: 'answer', timeMs: Number.NaN, option: 'o0' }), s, 'invalid answer');
  const right = ch.orders?.[0] ? { type: 'answer' as const, order: ch.orders[0], timeMs: 900 } : { type: 'answer' as const, option: ch.answers![0]!, timeMs: 900 };
  const fb = reduce(s, FX, right);
  assert.equal(fb.pending?.kind, 'feedback');
  assert.equal(fb.session.total, 1);
  assert.equal(fb.session.correct, 1);
  assert.ok(fb.fx.some((f) => f.kind === 'sfx' && f.name === 'correct'));
  const ok = reduce(fb, FX, ADV);
  assert.equal(ok.save.flags['quiz.ok'], true);
  assert.equal(ok.save.flags['quiz.after'], true);
  assert.equal(ok.mode, 'explore');
  const wrongOpt = ch.options?.find((o) => !(ch.answers ?? []).includes(o.id));
  if (wrongOpt) {
    const bad = run(s, { type: 'answer', option: wrongOpt.id, timeMs: 900 }, ADV);
    assert.equal(bad.save.flags['quiz.bad'], true);
    assert.equal(bad.save.flags['quiz.ok'], undefined);
    assert.equal(bad.session.correct, 0);
  }
});

test('shloka: hear marks heard (flag heard.<id>), restore runs a recital (flag restored.<id>)', () => {
  let s = run(at(7, 4, 'up'), { type: 'interact' });
  assert.deepEqual(s.pending, { kind: 'shloka', shlokaId: 's1' });
  assert.equal(s.save.shlokas['s1']?.heard, true);
  assert.equal(s.save.flags['heard.s1'], true);
  assert.deepEqual(s.session.shlokasHeard, ['s1']);
  s = reduce(s, FX, ADV);
  assert.deepEqual(s.pending, { kind: 'words', lexIds: ['lxa', 'lxb'] }, 'unknown lexIds are dropped');
  s = reduce(s, FX, ADV);
  assert.equal(s.save.flags['bard.done'], true);
  const r = autoplay(startEv(s, 't.restore'), FX);
  assert.equal(r.save.shlokas['s1']?.restored, true);
  assert.equal(r.save.flags['restored.s1'], true);
  assert.deepEqual(r.session.shlokasRestored, ['s1']);
  assert.equal(r.save.flags['restore.after'], true);
  assert.equal(r.recital, null);
});

test('shrine: rest (heal + respawn, menu again), save (menu again), recite a heard verse, leave', () => {
  const s0 = at(5, 2, 'up');
  const hurt = { ...s0, save: { ...s0.save, party: s0.save.party.map((m) => ({ ...m, hp: 1 })) } };
  let s = reduce(hurt, FX, { type: 'interact' });
  assert.deepEqual(s.pending, { kind: 'shrine' });
  assert.equal(reduce(s, FX, { type: 'recite', shlokaId: 's1' }), s, 'cannot recite an unheard verse');
  assert.equal(reduce(s, FX, { type: 'choose', index: 7 }), s);
  s = reduce(s, FX, { type: 'choose', index: SHRINE_REST });
  assert.deepEqual(s.pending, { kind: 'say', text: REST_TEXT });
  assert.equal(s.save.party[0]!.hp, s0.save.party[0]!.hp);
  assert.deepEqual(s.save.respawn, { mapId: 'm1', x: 5, y: 2 });
  s = reduce(s, FX, ADV);
  assert.deepEqual(s.pending, { kind: 'shrine' }, 'menu again after resting');
  s = reduce(s, FX, { type: 'choose', index: SHRINE_SAVE });
  assert.deepEqual(s.pending, { kind: 'save' });
  assert.equal(toSave(s).respawn.x, 5);
  s = reduce(s, FX, ADV);
  assert.deepEqual(s.pending, { kind: 'shrine' }, 'menu again after saving');
  // recite a heard verse
  const heard = { ...s, save: { ...s.save, shlokas: { s1: { heard: true, restored: false, best: 0 } } } };
  let r = reduce(heard, FX, { type: 'recite', shlokaId: 's1' });
  assert.notEqual(r, heard);
  r = autoplay(r, FX, { recite: 's1' }); // finishes the recital, rests, leaves
  assert.equal(r.save.shlokas['s1']?.restored, true);
  assert.equal(r.save.flags['restored.s1'], true);
  assert.equal(r.mode, 'explore');
  const left = reduce(s, FX, { type: 'choose', index: SHRINE_LEAVE });
  assert.equal(left.mode, 'explore');
  assert.equal(left.script, null);
});

test('shop: buy checks niska and the item list; choose -1 leaves', () => {
  let s = run(at(3, 4, 'up', { niska: 50 }), { type: 'interact' }, ADV);
  assert.deepEqual(s.pending, { kind: 'shop', items: ['phala', 'madhu'] }, 'unknown items are not offered');
  const b = reduce(s, FX, { type: 'buy', itemId: 'phala', qty: 2 });
  assert.equal(b.save.niska, 10);
  assert.equal(b.save.items['phala'], 2);
  assert.equal(reduce(b, FX, { type: 'buy', itemId: 'madhu', qty: 1 }), b, 'not enough niska');
  assert.equal(reduce(b, FX, { type: 'buy', itemId: 'oshadhi', qty: 1 }), b, 'not on sale here');
  assert.equal(reduce(b, FX, { type: 'buy', itemId: 'phala', qty: 0 }), b);
  assert.equal(reduce(b, FX, { type: 'buy', itemId: 'phala', qty: 1.5 }), b);
  s = reduce(b, FX, { type: 'choose', index: -1 });
  assert.deepEqual(s.pending, { kind: 'say', text: 'Bye' });
});

// ───────────────────────── battles ─────────────────────────

function finishedBattle(s: GameState, phase: 'won' | 'lost' | 'fled', spec: BattleSpec = NISH_SPEC): GameState {
  const f = { id: 'nishachara', level: 2, hp: 0, maxHp: 10, atk: 1, def: 1, spd: 1, element: 'maya' as const, moves: ['nakha'], stages: { atk: 0, def: 0 }, stunned: false };
  return { ...s, mode: 'battle', pending: { kind: 'battle' }, battle: { spec, foeIndex: 0, foe: f, ally: { ...f, id: 'player' }, active: 0, phase, beats: [{ text: 'end', allyHp: 0, foeHp: 0 }], participants: [0], turn: 1 } };
}

test('battle command: starts a battle; a win runs onWin and continues the script', () => {
  const s = startEv(at(4, 4), 't.battle');
  assert.equal(s.mode, 'battle');
  assert.ok(s.battle);
  assert.equal(s.pending?.kind, 'battle');
  assert.ok(s.fx.some((f) => f.kind === 'encounter'));
  const done = autoplay(s, FX);
  assert.equal(done.mode, 'explore');
  assert.equal(done.battle, null);
  if (done.save.flags['won']) {
    assert.equal(done.save.flags['battle.after'], true);
    assert.equal(done.session.battlesWon, 1);
  } else {
    assert.equal(done.save.flags['battle.after'], undefined, 'canLose:false defeat abandons the event');
  }
});

test('battle outcome: canLose:false defeat respawns (heal, -10% niska, say); canLose:true runs onLose', () => {
  const base = startEv(at(4, 4, 'down', { niska: 105, respawn: { mapId: 'm1', x: 6, y: 3 } }), 't.battle');
  const wounded = { ...base, save: { ...base.save, party: base.save.party.map((m) => ({ ...m, hp: 0 })), flags: { ...base.save.flags, 'trig.m1.t.battle': true as const } } };
  const lost = reduce(finishedBattle(wounded, 'lost'), FX, ADV);
  assert.equal(lost.battle, null);
  assert.deepEqual([lost.save.mapId, lost.save.x, lost.save.y], ['m1', 6, 3]);
  assert.equal(lost.save.niska, 95);
  assert.equal(lost.save.party[0]!.hp, at(4, 4).save.party[0]!.hp);
  assert.deepEqual(lost.pending, { kind: 'say', text: DEFEAT_TEXT });
  assert.equal(lost.save.flags['trig.m1.t.battle'], undefined, 'once-trigger re-armed');
  assert.equal(lost.save.flags['lost'], undefined);
  const after = reduce(lost, FX, ADV);
  assert.equal(after.mode, 'explore');
  assert.equal(after.save.flags['battle.after'], undefined);
  // canLose:true
  const d = startEv(at(4, 4), 't.duel');
  const dl = reduce(finishedBattle({ ...d, save: { ...d.save, party: d.save.party.map((m) => ({ ...m, hp: 0 })) } }, 'lost', { ...NISH_SPEC, kind: 'duel', canLose: true }), FX, ADV);
  assert.equal(dl.save.flags['duel.lost'], true);
  assert.equal(dl.save.flags['duel.after'], true);
  assert.ok(dl.save.party[0]!.hp > 0, 'healed after a losable battle');
  // win via a finished battle
  const w = reduce(finishedBattle(startEv(at(4, 4), 't.battle'), 'won'), FX, ADV);
  assert.equal(w.save.flags['won'], true);
  assert.equal(w.session.battlesWon, 1);
  // wild battle (no script) → explore
  const wild = reduce(finishedBattle(at(4, 4), 'fled'), FX, ADV);
  assert.equal(wild.mode, 'explore');
  assert.equal(wild.battle, null);
});

// ───────────────────────── explore menu actions ─────────────────────────

test('use-item, equip, tick', () => {
  const s = at(4, 4, 'down', { items: { phala: 1, madhu: 1, oshadhi: 1 } });
  const full = s.save.party[0]!.hp;
  const refused = (r: GameState, why: RegExp, msg: string): void => {
    assert.equal(r.save, s.save, `${msg}: nothing consumed or changed`);
    const toast = r.fx.find((f) => f.kind === 'toast');
    assert.ok(toast && toast.kind === 'toast' && why.test(toast.text), `${msg}: toast explains (${JSON.stringify(r.fx)})`);
  };
  refused(reduce(s, FX, { type: 'use-item', itemId: 'phala', target: 0 }), /already at full strength/, 'already at full HP');
  refused(reduce(s, FX, { type: 'use-item', itemId: 'madhu', target: 0 }), /fully charged/, 'PP already full');
  const hurt = { ...s, save: { ...s.save, party: [{ ...s.save.party[0]!, hp: 1 }] } };
  const healed = reduce(hurt, FX, { type: 'use-item', itemId: 'phala', target: 0 });
  assert.ok(healed.save.party[0]!.hp > 1 && healed.save.party[0]!.hp <= full);
  assert.equal(healed.save.items['phala'], undefined, 'last one used up');
  const none = reduce({ ...healed, save: { ...healed.save, party: [{ ...healed.save.party[0]!, hp: 1 }] } }, FX, { type: 'use-item', itemId: 'phala', target: 0 });
  assert.match((none.fx.find((f) => f.kind === 'toast') as { text: string } | undefined)?.text ?? '', /no \{n:item\.phala\} left/, 'none left');
  assert.equal(none.save.party[0]!.hp, 1);
  const notDown = reduce(hurt, FX, { type: 'use-item', itemId: 'oshadhi', target: 0 });
  assert.match((notDown.fx.find((f) => f.kind === 'toast') as { text: string } | undefined)?.text ?? '', /\{player\} is not exhausted/, 'revive needs hp 0');
  assert.equal(notDown.save.items['oshadhi'], 1, 'revive item kept');
  const down = { ...s, save: { ...s.save, party: [{ ...s.save.party[0]!, hp: 0 }] } };
  const downHeal = reduce(down, FX, { type: 'use-item', itemId: 'phala', target: 0 });
  assert.match((downHeal.fx.find((f) => f.kind === 'toast') as { text: string } | undefined)?.text ?? '', /exhausted/, 'heal on an exhausted hero explains');
  assert.equal(downHeal.save.party[0]!.hp, 0);
  const revived = reduce(down, FX, { type: 'use-item', itemId: 'oshadhi', target: 0 });
  assert.ok(revived.save.party[0]!.hp > 0);
  assert.equal(revived.save.items['oshadhi'], undefined, 'revive consumed');
  assert.equal(reduce(s, FX, { type: 'use-item', itemId: 'phala', target: 5 }), s);
  // equip
  assert.deepEqual(knownMoves(s, FX, 0).sort(), ['lipi_raksha', 'pada_bana'], 'verse-locked move hidden until restored');
  const restored = { ...s, save: { ...s.save, shlokas: { s1: { heard: true, restored: true, best: 1 } } } };
  assert.ok(knownMoves(restored, FX, 0).includes('shoka_shloka'));
  const eq = reduce(restored, FX, { type: 'equip', member: 0, moves: ['shoka_shloka', 'pada_bana'] });
  assert.deepEqual(eq.save.party[0]!.moves, ['shoka_shloka', 'pada_bana']);
  assert.equal(eq.save.party[0]!.pp['shoka_shloka'], 10);
  assert.equal(reduce(s, FX, { type: 'equip', member: 0, moves: ['shoka_shloka'] }), s, 'unknown move');
  assert.equal(reduce(s, FX, { type: 'equip', member: 0, moves: [] }), s);
  assert.equal(reduce(s, FX, { type: 'equip', member: 0, moves: ['pada_bana', 'pada_bana'] }), s);
  // tick
  assert.equal(reduce(s, FX, { type: 'tick', ms: 1500 }).save.playMs, 1500);
  assert.equal(reduce(s, FX, { type: 'tick', ms: 10_000_000 }).save.playMs, 60_000);
  assert.equal(reduce(s, FX, { type: 'tick', ms: -5 }), s);
});

test('end: mode ended, pending ending; further actions are ignored; sessionResult says won', () => {
  const s0 = at(4, 4);
  const s = startEv({ ...s0, session: { ...s0.session, correct: 7, total: 9, practised: [{ lexId: 'lxa', correct: true }, { lexId: 'lxb', correct: false }, { lexId: 'lxa', correct: false }, { lexId: 'zzz', correct: true }], shlokasRestored: ['s1'] } }, 't.end');
  assert.equal(s.mode, 'ended');
  assert.deepEqual(s.pending, { kind: 'ending' });
  for (const a of [ADV, { type: 'step', dir: 'up' }, { type: 'interact' }, { type: 'choose', index: 0 }] as Action[]) assert.equal(reduce(s, FX, a), s);
  const r = sessionResult(s, FX);
  assert.equal(r.outcome, 'won');
  assert.equal(r.score, 10 * 7 + 25 * 1 + 100 * 1, 'ch6.complete counts as a chapter completed this session');
  assert.equal(r.correct, 7);
  assert.equal(r.total, 9);
  assert.deepEqual(r.review, [
    { sa: 'wb', en: 'meaning b', correct: false },
    { sa: 'wa', en: 'meaning a', correct: false },
  ]);
  assert.deepEqual(r.mastery, [
    { skill: 'shabdakosha', itemId: 'shabdakosha:ramayana:lxb', correct: false },
    { skill: 'shabdakosha', itemId: 'shabdakosha:ramayana:lxa', correct: false },
    { skill: 'subhashita', itemId: 'subhashita:ramayana:s1', correct: true },
  ]);
  assert.equal(r.summary, 'Book 6 complete · 1 verse restored · 7/9 correct');
  assert.equal(storyProgress(s, FX), 1);
  const two = sessionResult({ ...s0, session: { ...s0.session, chaptersCompleted: [2, 1], correct: 38, total: 45, shlokasRestored: ['a', 'b', 'c', 'd'] } }, FX);
  assert.equal(two.summary, 'Books 1, 2 complete · 4 verses restored · 38/45 correct');
  const mid = sessionResult(at(4, 4), FX);
  assert.equal(mid.summary, 'Book 1 in progress · 0 verses restored · 0/0 correct');
  assert.equal(mid.outcome, 'completed');
  assert.equal(mid.score, 0);
  assert.ok(typeof mid.summary === 'string' && mid.summary.length > 0);
  const many = { ...s0, session: { ...s0.session, practised: Array.from({ length: 30 }, (_, i) => ({ lexId: FX.lexicon[i % 6]!.id, correct: i % 2 === 0 })) } };
  assert.ok((sessionResult(many, FX).review ?? []).length <= 12);
});

test('storyProgress: share of walkthrough flags', () => {
  const s = at(4, 4, 'down', { flags: { 'bard.done': true, 'said.yes': true, 'trig.ran': true } });
  assert.equal(storyProgress(s, FX), 3 / 6);
  assert.equal(storyProgress(at(4, 4), FX), 0);
});

// ───────────────────────── saves ─────────────────────────

test('toSave / loadGame round trip; defaults for missing optional fields; relocation', () => {
  const s = at(4, 3, 'left', { flags: { a: true }, items: { phala: 2 }, niska: 77, shlokas: { s1: { heard: true, restored: false, best: 0.5 } } });
  const saved = toSave(s);
  assert.deepEqual(JSON.parse(JSON.stringify(saved)), saved, 'JSON-serialisable');
  const l = loadGame(JSON.parse(JSON.stringify(saved)), 9, 3, FX);
  assert.ok(l);
  assert.deepEqual(l.save, { ...saved, flags: { ...saved.flags, 'heard.s1': true } }, 'verse flags are derived from save.shlokas');
  const again = loadGame(toSave(l), 9, 3, FX);
  assert.deepEqual(again?.save, l.save, 'stable round trip');
  assert.equal(l.mode, 'explore');
  assert.equal(l.pending, null);
  const minimal = loadGame({ v: 1, playerName: 'P', mapId: 'm1', x: 4, y: 4 }, 1, 2, FX);
  assert.ok(minimal);
  assert.equal(minimal.save.party[0]!.id, 'player');
  assert.equal(minimal.save.chapter, 1);
  assert.deepEqual(minimal.save.flags, {});
  assert.deepEqual(minimal.save.respawn, { mapId: 'm1', x: 4, y: 4 });
  const walled = loadGame({ ...saved, x: 0, y: 0 }, 1, 3, FX);
  assert.ok(walled);
  assert.ok(isWalkable({ ...walled, save: { ...walled.save, x: -9 } }, FX, walled.save.x, walled.save.y), 'moved out of the wall');
  const lost = loadGame({ ...saved, mapId: 'gone', respawn: { mapId: 'gone', x: 1, y: 1 } }, 1, 3, FX);
  assert.equal(lost?.save.mapId, 'm1');
  assert.equal(loadGame({ ...saved, party: [{ ...saved.party[0], id: 'nobody' }] }, 1, 3, FX)?.save.party[0]?.id, 'player');
});

test('loadGame: garbage never throws and returns null', () => {
  const valid = toSave(at(4, 4));
  const bads: unknown[] = [
    null, undefined, 0, 1, 'save', true, [], [valid], {}, { v: 2 }, { ...valid, v: '1' }, { ...valid, x: '3' }, { ...valid, x: 1.5 }, { ...valid, x: -1 },
    { ...valid, mapId: 5 }, { ...valid, playerName: null }, { ...valid, flags: { a: 1 } }, { ...valid, flags: [] }, { ...valid, party: {} },
    { ...valid, party: [{ id: 'player' }] }, { ...valid, party: [{ ...valid.party[0], moves: [1] }] }, { ...valid, party: [{ ...valid.party[0], moves: ['a', 'b', 'c', 'd', 'e'] }] },
    { ...valid, items: { phala: -1 } }, { ...valid, niska: Number.NaN }, { ...valid, niska: 'lots' }, { ...valid, facing: 'north' }, { ...valid, chapter: 7 },
    { ...valid, words: { a: { seen: 1 } } }, { ...valid, shlokas: { s1: { heard: 'yes', restored: false, best: 0 } } }, { ...valid, npcPos: { k: { x: 1 } } },
    { ...valid, completedChapters: [0] }, { ...valid, respawn: 'home' }, { ...valid, avatar: 'c' }, { ...valid, playMs: Infinity },
  ];
  for (const b of bads) assert.equal(loadGame(b, 1, 3, FX), null, `should reject ${JSON.stringify(b)?.slice(0, 80)}`);
  // random mutation fuzz
  const rng = createRng(1234);
  const junk = (): unknown => rng.pick([null, -1, 0.5, 'x', {}, [], [1, 'a'], { x: 1 }, true, 1e309, '']);
  const keys = Object.keys(valid);
  for (let i = 0; i < 2000; i++) {
    const m = JSON.parse(JSON.stringify(valid)) as Record<string, unknown>;
    const n = 1 + rng.int(3);
    for (let j = 0; j < n; j++) {
      const k = rng.pick(keys);
      if (rng.chance(0.2)) delete m[k];
      else m[k] = junk();
    }
    const r = loadGame(m, i, 3, FX);
    if (r) {
      assert.ok(Array.isArray(r.save.party) && r.save.party.length > 0);
      assert.equal(typeof r.save.mapId, 'string');
    }
  }
});

// ───────────────────────── determinism & fuzz ─────────────────────────

function randomAction(rng: ReturnType<typeof createRng>, s: GameState): Action {
  const dirs = ['up', 'down', 'left', 'right'] as const;
  const p = s.pending;
  const smart = rng.chance(0.6);
  if (smart && p?.kind === 'challenge') {
    const ch = p.challenge;
    if (rng.chance(0.7)) return ch.orders?.[0] ? { type: 'answer', order: ch.orders[0], timeMs: rng.int(20000) } : { type: 'answer', option: ch.answers?.[0] ?? 'o0', timeMs: rng.int(20000) };
    return { type: 'answer', option: rng.pick(ch.options ?? [{ id: 'o9' }]).id, timeMs: rng.int(20000) };
  }
  if (smart && p?.kind === 'shrine') return rng.chance(0.3) ? { type: 'recite', shlokaId: rng.pick(['s1', 's-ma-nishada', 'zzz']) } : { type: 'choose', index: rng.int(5) - 1 };
  if (smart && p?.kind === 'shop') return rng.chance(0.5) ? { type: 'buy', itemId: rng.pick(p.items), qty: 1 + rng.int(3) } : { type: 'choose', index: -1 };
  if (smart && s.mode === 'explore') return rng.chance(0.8) ? { type: 'step', dir: rng.pick(dirs) } : { type: 'interact' };
  if (smart && s.mode !== 'explore') return rng.chance(0.6) ? { type: 'advance' } : { type: 'choose', index: rng.int(5) - 1 };
  const garbage: unknown[] = [
    { type: 'step', dir: 'sideways' }, { type: 'choose', index: 99 }, { type: 'choose', index: Number.NaN }, { type: 'answer', timeMs: -1 }, { type: 'answer' },
    { type: 'answer', order: [9, 9, 9], timeMs: 5 }, { type: 'buy', itemId: 'phala', qty: -3 }, { type: 'use-item', itemId: 'zzz', target: -1 }, { type: 'equip', member: 9, moves: null },
    { type: 'tick', ms: 'x' }, { type: 'recite', shlokaId: 42 }, { type: 'nope' }, null, 'step', { type: 'face', dir: 7 },
  ];
  const all: Action[] = [
    { type: 'step', dir: rng.pick(dirs) }, { type: 'face', dir: rng.pick(dirs) }, { type: 'interact' }, { type: 'advance' }, { type: 'choose', index: rng.int(6) - 1 },
    { type: 'answer', option: `o${rng.int(4)}`, timeMs: rng.int(30000) }, { type: 'answer', order: [0, 1, 2, 3], timeMs: 1000 }, { type: 'recite', shlokaId: 's1' },
    { type: 'use-item', itemId: rng.pick(['phala', 'madhu', 'oshadhi']), target: rng.int(3) }, { type: 'buy', itemId: rng.pick(['phala', 'madhu']), qty: 1 },
    { type: 'equip', member: rng.int(2), moves: ['pada_bana'] }, { type: 'tick', ms: rng.int(5000) },
  ];
  return (rng.chance(0.15) ? rng.pick(garbage) : rng.pick(all)) as Action;
}

function assertValid(s: GameState, content: GameContent, where: string): void {
  assert.ok(['explore', 'script', 'battle', 'ended'].includes(s.mode), `${where}: mode`);
  if (s.mode === 'script') assert.ok(s.pending !== null && s.script !== null, `${where}: script mode must wait on a pending`);
  if (s.mode === 'battle') assert.ok(s.battle !== null, `${where}: battle mode needs state.battle`);
  if (s.mode === 'explore') assert.equal(s.pending, null, `${where}: explore has no pending`);
  if (s.mode === 'ended') assert.equal(s.pending?.kind, 'ending', `${where}: ended shows the ending`);
  const map = currentMap(s, content);
  if (content.maps.length > 0) {
    assert.ok(s.save.x >= 0 && s.save.y >= 0 && s.save.x < map.width && s.save.y < map.height, `${where}: player in bounds`);
  }
  assert.ok(s.save.party.length > 0, `${where}: party`);
  assert.ok(Number.isInteger(s.save.niska) && s.save.niska >= 0, `${where}: niska`);
  assert.ok(Object.values(s.save.items).every((n) => Number.isInteger(n) && n >= 0), `${where}: items`);
}

/** Walkthrough steps of the contiguous chapters 1..k that have steps (later chapters can't be reached yet). */
function contiguousSteps(content: GameContent): { steps: GameContent['walkthrough']; chapters: number[] } {
  const chapters: number[] = [];
  for (let k = 1; k <= 6 && content.walkthrough.some((w) => w.chapter === k); k++) chapters.push(k);
  return { steps: content.walkthrough.filter((w) => chapters.includes(w.chapter)), chapters };
}

function fuzz(content: GameContent, seeds: { level: Level; seed: number }[], actionsPerRun: number, from?: (seed: number, level: Level) => GameState): void {
  for (const { level, seed } of seeds) {
    const rng = createRng(seed ^ 0x5eed);
    let s = from ? from(seed, level) : newGame(seed, level, content, { name: 'Fuzz', avatar: seed % 2 ? 'a' : 'b' });
    for (let i = 0; i < actionsPerRun; i++) {
      const a = randomAction(rng, s);
      const where = `seed ${seed} level ${level} action ${i} ${JSON.stringify(a)}`;
      let next: GameState;
      try {
        next = reduce(s, content, a);
      } catch (e) {
        throw new Error(`${where} threw in mode=${s.mode} pending=${s.pending?.kind}: ${(e as Error).stack}`);
      }
      try {
        assertValid(next, content, where);
      } catch (e) {
        throw new Error(`${(e as Error).message}\n before: mode=${s.mode} pending=${JSON.stringify(s.pending)?.slice(0, 200)} items=${JSON.stringify(s.save.items)} battle=${s.battle?.phase}\n after: mode=${next.mode} pending=${JSON.stringify(next.pending)?.slice(0, 200)} items=${JSON.stringify(next.save.items)}`);
      }
      s = next;
      if (s.mode === 'ended') break;
    }
  }
}

test('determinism: same seed + same actions ⇒ identical states', () => {
  for (const seed of [1, 2, 3]) {
    const play = (): GameState[] => {
      const rng = createRng(seed);
      let s = newGame(seed, 3, FX, { name: 'D', avatar: 'a' });
      const out = [s];
      for (let i = 0; i < 300; i++) {
        s = reduce(s, FX, randomAction(rng, s));
        out.push(s);
      }
      return out;
    };
    assert.deepEqual(play(), play());
  }
});

/**
 * v0.4 (Kathā) must leave the practice game byte-identical: a fixed action log on the fixture (random actions from fixed
 * seeds, plus the story bot at every level) hashes to exactly what the v0.3.0 logic produced (computed with the v0.3.0
 * modules before Kathā was added). A save without `style` never touches any Kathā code path.
 */
// v0.4.2: the hash leaves out the Sanskrit text fields (textSa / sa / nameSa) of beats and toasts, so a Sanskrit wording
// fix does not count as a gameplay change. The full hash ('1d71e253b960610d2392be4f') held unchanged from v0.3.0 through
// v0.4.1; this Sanskrit-free hash was computed on v0.4.1 + the duel-panel fix (94f7207) and is identical after the v0.4.2
// Sanskrit audit, which changed only wording.
const V03_SNAPSHOT = '8023058a91d071ee816f54b4';
const NO_SANSKRIT_TEXT = (k: string, v: unknown): unknown => (k === 'textSa' || k === 'sa' || k === 'nameSa' ? undefined : v);
test('v0.4: the practice game is byte-identical to v0.3.0 on a fixed action log (snapshot, Sanskrit wording excluded)', () => {
  const h = createHash('sha256');
  const proj = (s: GameState): string => JSON.stringify({ save: s.save, session: s.session, battle: s.battle, pending: s.pending, mode: s.mode, tick: s.tick, recital: s.recital, fx: s.fx, script: s.script }, NO_SANSKRIT_TEXT);
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const rng = createRng(seed * 7919);
    let s = newGame(seed, 3, FX, { name: 'Snap', avatar: seed % 2 ? 'a' : 'b' });
    for (let i = 0; i < 400; i++) {
      s = reduce(s, FX, randomAction(rng, s));
      h.update(proj(s));
    }
  }
  for (const level of LEVELS) {
    const r = runWalkthrough(FX, 50 + level, level);
    h.update(proj(r.state));
    h.update(`${r.actions}/${r.battles}/${r.defeats}/${r.failedAt}`);
  }
  const got = h.digest('hex').slice(0, 24);
  assert.equal(got, V03_SNAPSHOT, `practice-game action log hash ${got}`);
});

test('fuzz: reduce never throws and always leaves a valid state (fixture content, 25 seeds × levels, 300+ actions)', () => {
  fuzz(FX, testMatrix(LEVELS), 320);
});

const REAL = loadContent();

/** States captured after each walkthrough step of one story-bot run (fuzz starting points deep in the story). */
function snapshots(content: GameContent, level: Level, steps?: GameContent['walkthrough']): GameState[] {
  const out: GameState[] = [];
  runWalkthrough(content, 101 + level, level, { onStep: (_i, s) => out.push(s), attempts: 2, ...(steps ? { steps } : {}) });
  return out;
}

test('fuzz: reduce never throws on the real content (25 seeds × levels, 300+ actions)', (t) => {
  if (REAL.maps.length === 0) return void t.skip('no story content yet');
  fuzz(REAL, testMatrix(LEVELS), 320);
});

test('fuzz from deep story states (after every walkthrough step), fixture + real content', () => {
  for (const content of [FX, REAL]) {
    if (content.walkthrough.length === 0) continue;
    for (const level of LEVELS) {
      const snaps = snapshots(content, level, content === REAL ? contiguousSteps(REAL).steps : undefined);
      if (snaps.length === 0) continue;
      fuzz(content, testMatrix([level], 12), 150, (seed) => snaps[seed % snaps.length]!);
    }
  }
});

// ───────────────────────── story-bot ─────────────────────────

test('story-bot on fixture content: walkthrough completes for every level', () => {
  for (const { level, seed } of testMatrix(LEVELS, 5)) {
    const r = runWalkthrough(FX, seed, level);
    assert.equal(r.error, null, r.error ?? '');
    assert.equal(r.state.mode, 'ended');
    assert.equal(r.state.save.flags['ch6.complete'], true);
  }
});

test('story-bot on fixture content in Kathā (v0.4): the walkthrough completes for every level, quizzes skipped, recitals recited', () => {
  for (const { level, seed } of testMatrix(LEVELS, 5)) {
    for (const accuracy of [1, 0.7]) {
      const r = runWalkthrough(FX, seed, level, { style: 'katha', accuracy, attempts: 12 });
      assert.equal(r.error, null, r.error ?? '');
      assert.equal(r.state.mode, 'ended');
      assert.equal(r.state.save.style, 'katha');
      assert.equal(r.state.save.flags['restored.s1'], true);
      assert.ok(r.recitations >= 4, `the shrine recital was recited (${r.recitations})`);
    }
  }
});

/** Verse ids used by `{shloka}` / quiz commands of each chapter's events that are not in the verse files yet. */
function missingVersesByChapter(content: GameContent): Map<number, string[]> {
  const known = new Set(content.shlokas.map((x) => x.id));
  const out = new Map<number, string[]>();
  const walk = (cmds: EventCmd[] | undefined, ch: number): void => {
    for (const c of cmds ?? []) {
      const id = 'shloka' in c ? c.shloka : 'quiz' in c ? c.shlokaId : undefined;
      if (id && !known.has(id)) out.set(ch, [...new Set([...(out.get(ch) ?? []), id])]);
      if ('if' in c) (walk(c.then, ch), walk(c.else, ch));
      if ('quiz' in c) (walk(c.onCorrect, ch), walk(c.onWrong, ch));
      if ('battle' in c) (walk(c.onWin, ch), walk(c.onLose, ch));
    }
  };
  for (const e of content.events) {
    const m = /^ch([1-6])\./.exec(e.id);
    if (m) walk(e.cmds, Number(m[1]));
  }
  for (const w of content.walkthrough) if ('recite' in w.action && !known.has(w.action.recite)) out.set(w.chapter, [...new Set([...(out.get(w.chapter) ?? []), w.action.recite])]);
  return out;
}

test('story-bot on the REAL content: follow content.walkthrough to the ending (levels × 25 seeds)', (t) => {
  if (REAL.walkthrough.length === 0) return void t.skip('skipped (no walkthrough yet)');
  const { steps, chapters } = contiguousSteps(REAL);
  if (steps.length === 0) return void t.skip('skipped (no chapter 1 walkthrough yet)');
  const full = chapters.length === 6;
  if (!full) t.diagnostic(`partial story: following chapters ${chapters.join(', ')} only (chapter ${chapters.length + 1} has no walkthrough yet)`);
  const missing = missingVersesByChapter(REAL);
  for (const [ch, ids] of missing) t.diagnostic(`pending: chapter ${ch} uses verses not written yet: ${ids.join(', ')} (a story-bot failure in that chapter is reported, not failed)`);
  const failures: string[] = [];
  const blocked = new Set<string>();
  // RY_BOT_SEEDS=3 for a quick local check (the gate uses the default 25 seeds per level)
  const seeds = Math.max(1, Math.min(25, Number(process.env['RY_BOT_SEEDS'] ?? 25) || 25));
  for (const { level, seed } of testMatrix(LEVELS, seeds)) {
    const r = runWalkthrough(REAL, seed, level, { steps });
    const ch = r.failedAt >= 0 ? steps[r.failedAt]?.chapter ?? 0 : 0;
    if (r.error && missing.has(ch)) blocked.add(`chapter ${ch}: ${r.error.slice(0, 300)}`);
    else if (r.error) failures.push(`seed ${seed} level ${level}: ${r.error}`);
    else if (full && missing.size === 0 && (r.state.mode !== 'ended' || !r.state.save.flags['ch6.complete'])) failures.push(`seed ${seed} level ${level}: walkthrough finished but mode=${r.state.mode}, ch6.complete=${String(r.state.save.flags['ch6.complete'])}`);
    if (failures.length >= 3) break;
  }
  for (const b of [...blocked].slice(0, 5)) t.diagnostic(`pending (missing verses): ${b}`);
  assert.deepEqual(failures, []);
});

// ───────────────────────── Sambhāṣaṇa toasts (ui-b) ─────────────────────────

test('sa-ui: every logic toast carries a Sanskrit textSa that verifies, with the English unchanged (gifts, shop, item refusals, well, chest)', () => {
  const o = getOracle();
  const C: GameContent = { ...FX, ui: REAL.ui }; // the fixture scenes with the real interface strings
  const problems: string[] = [];
  const seen: string[] = [];
  /** The toast whose English matches `re`: it has textSa, the Sanskrit verifies, the English is the key's English. */
  const toast = (s: GameState, re: RegExp, key: string, slots: Record<string, UiSlot> = {}): void => {
    const t = s.fx.find((f): f is Extract<typeof f, { kind: 'toast' }> => f.kind === 'toast' && re.test(f.text));
    assert.ok(t, `a toast matching ${re} (${JSON.stringify(s.fx)})`);
    assert.equal(t.text, uiEn(C, key, slots), `${key}: English unchanged`);
    seen.push(key);
    if (!t.textSa) return void problems.push(`${key}: no textSa (${t.text})`);
    const r = o.verifyLine(t.textSa, { en: t.text, ui: true });
    if (!r.ok) problems.push(`${key} "${t.textSa}": ${r.errors.join('; ')}`);
  };
  const runC = (s: GameState, ...as: Action[]): GameState => as.reduce((acc, a) => reduce(acc, C, a), s);
  const atC = (x: number, y: number, f: 'up' | 'down' | 'left' | 'right', patch: Partial<GameState['save']> = {}): GameState => at(x, y, f, patch, C);
  // world
  toast(runC(atC(8, 2, 'up'), { type: 'interact' }), /well/, 'toast.well');
  toast(runC(atC(8, 2, 'down'), { type: 'interact' }), /chest/, 'toast.chest');
  // gifts (give phala ×3)
  const e = C.events.find((x) => x.id === 't.cmds')!;
  const g = reduce({ ...atC(4, 4, 'down'), mode: 'script', script: { eventId: e.id, frames: [{ cmds: e.cmds, pc: 0 }] }, pending: { kind: 'wait', ms: 0 } }, C, ADV);
  toast(g, /^Received/, 'toast.receivedN', { item: '{n:item.phala}', n: 3 });
  // shop
  const shop = runC(atC(3, 4, 'up', { niska: 50 }), { type: 'interact' }, ADV);
  toast(reduce(shop, C, { type: 'buy', itemId: 'phala', qty: 2 }), /^Bought/, 'toast.boughtN', { item: '{n:item.phala}', n: 2 });
  toast(reduce(shop, C, { type: 'buy', itemId: 'phala', qty: 1 }), /^Bought/, 'toast.bought', { item: '{n:item.phala}' });
  // item refusals, for the player (both avatars) and an ally
  for (const avatar of ['a', 'b'] as const) {
    const s = atC(4, 4, 'down', { avatar, items: { phala: 1, madhu: 1, oshadhi: 1 } });
    const who = '{player}';
    toast(reduce(s, C, { type: 'use-item', itemId: 'phala', target: 0 }), /full strength/, 'toast.fullStrength', { who });
    toast(reduce(s, C, { type: 'use-item', itemId: 'madhu', target: 0 }), /fully charged/, 'toast.ppFull', { who });
    toast(reduce(s, C, { type: 'use-item', itemId: 'oshadhi', target: 0 }), /not exhausted/, 'toast.notExhausted', { who });
    const down = { ...s, save: { ...s.save, party: [{ ...s.save.party[0]!, hp: 0 }] } };
    toast(reduce(down, C, { type: 'use-item', itemId: 'phala', target: 0 }), /is exhausted/, 'toast.exhausted', { who });
    const none = { ...s, save: { ...s.save, items: { phala: 0 } } };
    toast(reduce(none, C, { type: 'use-item', itemId: 'phala', target: 0 }), /left/, 'toast.noneLeft', { item: '{n:item.phala}' });
  }
  const withRama = startEv(at(4, 4, 'down', { niska: 50 }), 't.cmds');
  const ri = withRama.save.party.findIndex((m) => m.id === 'rama');
  if (ri >= 0) toast(reduce({ ...withRama, mode: 'explore', script: null, pending: null, fx: [], save: { ...withRama.save, items: { phala: 1 } } }, C, { type: 'use-item', itemId: 'phala', target: ri }), /full strength/, 'toast.fullStrength', { who: '{n:ally.rama}' });
  // key items and battle-only items (real items: the key items need their own accusative)
  const r0 = newGame(1, 3, REAL, { name: 'Tester', avatar: 'b' });
  const ex: GameState = { ...r0, mode: 'explore', script: null, pending: null, fx: [], save: { ...r0.save, items: { kusha_mudrika: 1, chudamani: 1, phala: 1 } } };
  for (const id of ['kusha_mudrika', 'chudamani']) toast(reduce(ex, REAL, { type: 'use-item', itemId: id, target: 0 }), /kept safe/, 'toast.keepSafe', { item: `{n:item.${id}}` });
  const buffy: GameContent = { ...REAL, items: REAL.items.map((it) => (it.id === 'phala' ? { ...it, kind: 'buff' as const } : it)) };
  toast(reduce(ex, buffy, { type: 'use-item', itemId: 'phala', target: 0 }), /only be used in battle/, 'toast.battleOnly', { item: '{n:item.phala}' });
  assert.deepEqual(problems, [], problems.join('\n'));
  // every item and every hero has the Sanskrit forms these toasts need
  for (const it of REAL.items) {
    const item = uiItemSlot(REAL, it.id, it.nameId);
    assert.ok(item.sa, `item ${it.id} has an accusative`);
    for (const key of ['toast.received', 'toast.receivedN', 'toast.bought', 'toast.boughtN', 'toast.noneLeft', 'toast.battleOnly', 'toast.keepSafe']) {
      const sa = uiSa(REAL, key, { item, n: 3 });
      assert.ok(sa && o.verifyLine(sa, { en: uiEn(REAL, key, { item, n: 3 }), ui: true }).ok, `${key} × ${it.id}: ${sa}`);
    }
  }
  for (const a of REAL.allies) {
    const who = uiAllySlot(a.id, 'gen', a.id === 'player' ? '{player}' : `{n:${a.nameId}}`, REAL);
    assert.ok(who.sa, `hero ${a.id} has a genitive`);
    for (const key of ['toast.exhausted', 'toast.fullStrength', 'toast.notExhausted', 'toast.ppFull']) {
      const sa = uiSa(REAL, key, { who });
      assert.ok(sa && o.verifyLine(sa, { en: uiEn(REAL, key, { who }), ui: true }).ok, `${key} × ${a.id}: ${sa}`);
    }
  }
  for (const k of ['toast.well', 'toast.chest', 'toast.receivedN', 'toast.bought', 'toast.boughtN', 'toast.fullStrength', 'toast.ppFull', 'toast.notExhausted', 'toast.exhausted', 'toast.noneLeft', 'toast.keepSafe', 'toast.battleOnly']) assert.ok(seen.includes(k), `exercised ${k}`);
  // English-only content (no interface table): the same toasts, without textSa
  const plain = reduce(at(8, 2, 'up'), FX, { type: 'interact' }).fx.find((f) => f.kind === 'toast');
  assert.deepEqual(plain, { kind: 'toast', text: 'The well water is cool and clear.' });
});
