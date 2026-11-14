/**
 * Kathā mode (v0.4) logic tests. OWNER: kc-core. Spec: notes/katha.md (the audited recitation rules).
 *  - journey style (newGame / set-style / loadGame), random encounters off, level floors, story quizzes skipped
 *  - battle: plain moves need no input, astras open a smarana (no feedback), duels recite heard verses, the Kathā
 *    outcome (full / half effect for damage, heal and stage astras, ×1.1 for a recalled gap, auto = full, no swift)
 *  - the smarana builder: one gap max, the level ladder and spot checks, gap rules (never the astra's own name,
 *    rotation), option rules (3 verbatim chunks of the verse, no shared lexId / spelling, never completing another
 *    real pāda), weights, bindings (a fixture binding list until content/katha.json has its astras)
 *  - shrine recital (4 smarana pādas) and the study hall
 *  - the story bot plays Kathā to the ending (perfect and 70 %-accurate reciters), fuzz never throws
 * This file holds no Sanskrit: every string comes from the content (and names.json for the astra names).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { type Level, createRng, testMatrix } from '@sdk';
import { devaToSlp1, scanLine, spellingKey, splitAksharas } from '@sanskrit';
import type { Action, BattleBeat, BattleSpec, Challenge, GameContent, GameState, PartyMember, SaveData, SmaranaSpec } from './types';
import { loadContent } from './content';
import { indexOf } from './logic-util';
import { TILE_PROPS } from './catalog';
import {
  FIRST_CHECK,
  KATHA_FLAG,
  KATHA_FLOOR,
  MASTERED,
  ARMED_FLAG,
  KATHA_HP_FLOOR,
  KATHA_TURNS,
  KATHA_TUTORIAL_TURNS,
  type SmrtiEntry,
  alignWords,
  armMember,
  astraBinding,
  astraPada,
  astraPadas,
  astraSlot,
  bestHit,
  boundAstras,
  kathaFoe,
  kathaFoeAtk,
  kathaLead,
  KATHA_FOE_HIT,
  buildSmarana,
  castPlan,
  completesOtherPada,
  duelPada,
  duelVerse,
  gapEligible,
  gradeSmarana,
  isKatha,
  kathaIndex,
  nextSmrti,
  padaInfo,
  padaKey,
  recordSmarana,
  rotationHit,
  smrtiOf,
  styleOf,
} from './logic-katha';
import { SHRINE_CMDS, SHRINE_EVENT_ID, SHRINE_STUDY, startScript } from './logic-events';
import { STUDY_ROUND, uiAllySlot, uiMoveSlot } from './logic-learning';
import { uiSa } from './sa-ui';
import { KATHA_QUALITY, SA_BATTLE, battleAction, halfEffect, leadIndex, saText, startBattle } from './logic-battle';
import { allyForMove, damage, fighterFromEnemy, fighterFromMember, newMember } from './logic-progress';
import { loadGame, newGame, reduce, toSave } from './logic';
import { runWalkthrough } from './logic-sim';
import { manifest } from './manifest';

const REAL = loadContent();
const LEVELS = manifest.levels;
const idx = indexOf(REAL);

/**
 * Fixture binding list (kc-content writes the real one into content/katha.json). aditya_hrdaya is bound to a ONE-chunk
 * pāda on purpose: such a binding is ignored (default: the first ≥ 2-chunk pāda of the verse).
 */
const FIX_ASTRAS = [
  { moveId: 'viddhi', shlokaId: 's-ramam-dasharatham', pada: 0 },
  { moveId: 'anirveda', shlokaId: 's-anirvedah', pada: 1 },
  { moveId: 'jaya_ghosha', shlokaId: 's-jayatyatibalo', pada: 2 },
  { moveId: 'abhaya', shlokaId: 's-sakrdeva', pada: 2 },
  { moveId: 'shoka_shloka', shlokaId: 's-ma-nishada', pada: 0 },
  { moveId: 'aditya_hrdaya', shlokaId: 's-aditya-hrdayam', pada: 1 },
];
const FX: GameContent = { ...REAL, katha: { astras: FIX_ASTRAS, verses: REAL.katha?.verses ?? [] } };
const BOUND = REAL.moves.filter((m) => m.unlockShloka).map((m) => m.id);

// ───────────────────────── helpers ─────────────────────────

function member(id: string, level: number, moves: string[], content = FX): PartyMember {
  const m = newMember(indexOf(content).ally.get(id)!, level, content);
  const pp = { ...m.pp };
  for (const x of moves) pp[x] = indexOf(content).move.get(x)!.pp;
  return { ...m, moves, pp };
}

interface KOpts {
  chapter?: number;
  heard?: string[];
  restored?: string[];
  smrti?: SaveData['smrti'];
  seed?: number;
  level?: Level;
  style?: 'katha' | 'abhyasa';
}

function kState(party: PartyMember[], o: KOpts = {}): GameState {
  const shlokas: SaveData['shlokas'] = {};
  for (const id of o.heard ?? []) shlokas[id] = { heard: true, restored: false, best: 0 };
  for (const id of o.restored ?? []) shlokas[id] = { heard: true, restored: true, best: 1 };
  const ch = REAL.chapters.find((c) => c.kanda === (o.chapter ?? 1)) ?? REAL.chapters[0]!;
  const style = o.style ?? 'katha';
  const save: SaveData = {
    v: 1, playerName: 'K', avatar: 'a', mapId: ch.startMap, x: ch.startX, y: ch.startY, facing: 'down', respawn: { mapId: ch.startMap, x: ch.startX, y: ch.startY },
    chapter: (o.chapter ?? 1) as SaveData['chapter'], objective: '', flags: style === 'katha' ? { [KATHA_FLAG]: true } : {}, party, items: {}, niska: 100, words: {}, shlokas,
    step: 0, npcPos: {}, playMs: 0, completedChapters: [], style, ...(style === 'katha' ? { smrti: o.smrti ?? {} } : {}),
  };
  return { v: 1, seed: o.seed ?? 7, tick: 0, level: o.level ?? 3, save, mode: 'explore', script: null, pending: null, battle: null, recital: null, session: { correct: 0, total: 0, swift: 0, practised: [], shlokasHeard: [], shlokasRestored: [], battlesWon: 0, chaptersCompleted: [] }, fx: [] };
}

const spec = (enemies: [string, number][], kind: BattleSpec['kind']): BattleSpec => ({ enemies: enemies.map(([id, level]) => ({ id, level })), kind, canRun: false, canLose: true, bg: 'forest', music: 'boss' });

/** Start a battle and advance to the command menu (the foe bound, so it cannot act this turn: the ally's beats are clean). */
function fight(s0: GameState, sp: BattleSpec, content = FX): GameState {
  let s = startBattle(s0, content, sp);
  for (let i = 0; i < 20 && s.battle!.phase !== 'command'; i++) s = battleAction(s, content, { type: 'advance' });
  assert.equal(s.battle!.phase, 'command');
  return bindFoe(s);
}
function bindFoe(s: GameState): GameState {
  return { ...s, battle: { ...s.battle!, foe: { ...s.battle!.foe, stunned: true } } };
}
function pick(s: GameState, moveId: string, content = FX): GameState {
  const i = s.battle!.ally.moves.indexOf(moveId);
  assert.ok(i >= 0, `${moveId} equipped`);
  return battleAction(battleAction(s, content, { type: 'choose', index: 0 }), content, { type: 'choose', index: i });
}
function sm(s: GameState): SmaranaSpec {
  const p = s.pending;
  assert.ok(p?.kind === 'challenge' && p.challenge.kind === 'smarana' && p.challenge.smarana, `a smarana challenge is pending (got ${p?.kind})`);
  return p.challenge.smarana;
}
const rightPicks = (sp: SmaranaSpec): string[] => (sp.gaps.length ? [sp.gapAnswers[0]![0]!] : []);
const wrongPicks = (sp: SmaranaSpec): string[] => (sp.gaps.length ? [sp.gapOptions[0]!.find((o) => !sp.gapAnswers[0]!.includes(o.id))!.id] : []);
const answer = (picks: string[], auto = false): Action => ({ type: 'answer', picks, timeMs: 900, ...(auto ? { auto: true } : {}) });
/** The one beat of a turn that carries `recital` (the foe may act first). */
function recitalBeat(beats: BattleBeat[]): BattleBeat {
  const r = beats.filter((b) => b.recital);
  assert.equal(r.length, 1, `one recital beat (${beats.map((b) => b.text).join(' / ')})`);
  return r[0]!;
}
function newBeats(before: GameState, after: GameState): BattleBeat[] {
  return after.battle!.beats.slice(Math.max(0, before.battle!.beats.length));
}
/** Smṛti record putting every pāda the astra recites (astraPadas) at `level`: the next cast is on the binding's pāda. */
function smrtiFor(moveId: string, level: number, content = FX, extra: Partial<SmrtiEntry> = {}): SaveData['smrti'] {
  const out: NonNullable<SaveData['smrti']> = {};
  for (const r of astraPadas(content, moveId)) out[padaKey(r.shlokaId, r.pada)] = { level, streak: 0, ...(level >= MASTERED ? { casts: 0, nextCheck: FIRST_CHECK } : {}), ...extra };
  return out;
}
/** A one-hero Kathā battle with the astra equipped and its verse restored, at the command menu. */
function astraFight(moveId: string, o: { level?: number; smrti?: number; foe?: [string, number]; extra?: string[] } = {}): GameState {
  const ally = allyForMove(moveId, FX)!;
  const mv = idx.move.get(moveId)!;
  const s = kState([member(ally, o.level ?? 20, [moveId, ...(o.extra ?? [])])], { restored: [mv.unlockShloka!], smrti: smrtiFor(moveId, o.smrti ?? 1), chapter: 3 });
  return fight(s, spec([o.foe ?? ['ravana', 30]], 'boss'));
}
const nameOf = (moveId: string): string => idx.name.get(`move.${moveId}`)?.sa ?? '';
const slp = (d: string): string => devaToSlp1(spellingKey(d)).replace(/[^A-Za-z]/g, '');
/** "answer" (uttaram), the word the practice game's falter line starts with (content/sa-battle.json falterHit): never in Kathā. */
const ANSWER_WORD = spellingKey(String(SA_BATTLE.templates['falterHit']!.sa).split(' ')[0]!);

// ───────────────────────── journey style ─────────────────────────

test('journey style: newGame without a style is the practice game exactly as v0.3; katha sets the flag, smṛti and the floor', () => {
  const plain = newGame(3, 3, REAL, { name: 'P', avatar: 'a' });
  assert.equal('style' in plain.save, false, 'no style field without opts.style');
  assert.equal('smrti' in plain.save, false);
  assert.equal(plain.save.flags[KATHA_FLAG], undefined);
  assert.equal(styleOf(plain.save), 'abhyasa');
  const ab = newGame(3, 3, REAL, { name: 'P', avatar: 'a', style: 'abhyasa' });
  assert.equal(ab.save.style, 'abhyasa');
  assert.equal(ab.save.flags[KATHA_FLAG], undefined);
  assert.deepEqual({ ...ab.save, style: undefined }, { ...plain.save, style: undefined }, 'an explicit abhyasa journey starts the same');
  const k = newGame(3, 3, REAL, { name: 'P', avatar: 'a', style: 'katha' });
  assert.equal(k.save.style, 'katha');
  assert.equal(k.save.flags[KATHA_FLAG], true);
  assert.deepEqual(k.save.smrti, {});
  assert.ok(isKatha(k));
  assert.ok(k.save.party.every((m) => m.level >= KATHA_FLOOR[1]!), `party raised to the chapter 1 floor (${k.save.party.map((m) => m.level)})`);
  assert.equal(k.mode, plain.mode, 'the same intro runs');
});

test('set-style: explore only; katha sets the flag, smṛti and the floor; abhyasa unsets the flag; same style = same object', () => {
  const s = kState([member('player', 3, ['pada_bana'])], { style: 'abhyasa', chapter: 2 });
  const k = reduce(s, REAL, { type: 'set-style', style: 'katha' });
  assert.equal(k.save.style, 'katha');
  assert.equal(k.save.flags[KATHA_FLAG], true);
  assert.deepEqual(k.save.smrti, {});
  assert.equal(k.save.party[0]!.level, KATHA_FLOOR[2]);
  assert.ok(k.save.party[0]!.hp > s.save.party[0]!.hp, 'HP grows with the floor');
  assert.equal(reduce(k, REAL, { type: 'set-style', style: 'katha' }), k, 'same style: same object');
  const back = reduce({ ...k, save: { ...k.save, smrti: { 'x:0': { level: 2, streak: 1 } } } }, REAL, { type: 'set-style', style: 'abhyasa' });
  assert.equal(back.save.style, 'abhyasa');
  assert.equal(back.save.flags[KATHA_FLAG], undefined);
  assert.deepEqual(back.save.smrti, { 'x:0': { level: 2, streak: 1 } }, 'smṛti is kept for a later switch back');
  assert.equal(back.save.party[0]!.level, KATHA_FLOOR[2], 'levels are kept');
  assert.equal(reduce(k, REAL, { type: 'set-style', style: 'nonsense' as 'katha' }), k);
  const scripted = startScript(s, REAL, 'test', [{ say: 'hello' }]);
  assert.equal(scripted.mode, 'script');
  assert.equal(reduce(scripted, REAL, { type: 'set-style', style: 'katha' }), scripted, 'not while a script runs');
});

test('loadGame: a missing style stays absent (practice), katha re-derives its flag, smṛti is parsed leniently, round trip', () => {
  const s = kState([member('player', 6, ['pada_bana'])], { smrti: { 's-ma-nishada:0': { level: 4, streak: 0, casts: 3, nextCheck: 4, last: 1 } } });
  const saved = toSave(s);
  const l = loadGame(JSON.parse(JSON.stringify({ ...saved, flags: {} })), 1, 3, REAL)!;
  assert.equal(l.save.style, 'katha');
  assert.equal(l.save.flags[KATHA_FLAG], true, 'the flag follows save.style');
  assert.deepEqual(l.save.smrti, saved.smrti);
  assert.deepEqual(loadGame(toSave(l), 1, 3, REAL)!.save, l.save, 'stable round trip');
  const old = { ...saved } as Record<string, unknown>;
  delete old['style'];
  delete old['smrti'];
  const o = loadGame({ ...old, flags: { [KATHA_FLAG]: true } }, 1, 3, REAL)!;
  assert.equal('style' in o.save, false, 'a pre-v0.4 save has no style (the practice game)');
  assert.equal('smrti' in o.save, false);
  assert.equal(o.save.flags[KATHA_FLAG], undefined, 'a stray style.katha flag is dropped');
  const messy = loadGame({ ...saved, style: 'other', smrti: { a: { level: 9, streak: 0 }, b: 'x', c: { level: 2, streak: 1, casts: -1, nextCheck: 'n' }, d: null } }, 1, 3, REAL)!;
  assert.ok(messy, 'bad Kathā fields never cost the save');
  assert.equal('style' in messy.save, false);
  assert.deepEqual(messy.save.smrti, { c: { level: 2, streak: 1 } });
  const katha = loadGame({ ...saved, smrti: undefined }, 1, 3, REAL)!;
  assert.deepEqual(katha.save.smrti, {}, 'a Kathā save always has a smṛti record');
});

// ───────────────────────── story rules ─────────────────────────

test('no random encounters in Kathā (kuśa tiles never roll); the practice game still meets them', () => {
  let found: { map: string; a: [number, number]; b: [number, number] } | null = null;
  for (const map of REAL.maps) {
    if (!map.encounters || map.encounters.rate <= 0 || found) continue;
    const enc = (x: number, y: number): boolean => {
      const g = map.ground[y]?.[x];
      const t = g !== undefined ? map.legend[g] : undefined;
      const o = map.overlay?.[y]?.[x];
      const ot = o && o !== ' ' ? map.legend[o] : undefined;
      const solid = (t && TILE_PROPS[t].solid) || (ot && TILE_PROPS[ot].solid);
      return !!t && !solid && (!!TILE_PROPS[t].encounter || (!!ot && !!TILE_PROPS[ot].encounter)) && !map.warps.some((w) => w.x === x && w.y === y) && !map.triggers.some((tr) => x >= tr.x && y >= tr.y && x < tr.x + (tr.w || 1) && y < tr.y + (tr.h || 1)) && !map.npcs.some((n) => n.x === x && n.y === y);
    };
    for (let y = 0; y < map.height && !found; y++) for (let x = 0; x + 1 < map.width && !found; x++) if (enc(x, y) && enc(x + 1, y)) found = { map: map.id, a: [x, y], b: [x + 1, y] };
  }
  assert.ok(found, 'an encounter area on the real maps');
  const walk = (style: 'katha' | 'abhyasa'): number => {
    let s = kState([member('player', 10, ['pada_bana'], REAL)], { style });
    s = { ...s, save: { ...s.save, mapId: found!.map, x: found!.a[0], y: found!.a[1] } };
    let battles = 0;
    for (let i = 0; i < 300; i++) {
      const n = reduce(s, REAL, { type: 'step', dir: i % 2 === 0 ? 'right' : 'left' });
      if (n.mode === 'battle') {
        battles++;
        s = { ...n, mode: 'explore', battle: null, pending: null };
      } else s = n;
    }
    return battles;
  };
  assert.equal(walk('katha'), 0, 'Kathā: no wild battles');
  assert.ok(walk('abhyasa') > 0, 'the practice game: wild battles as before');
});

test('story {quiz} commands are skipped in Kathā, silently (only the non-say commands of onCorrect run); the practice game still asks', () => {
  const quiz = [{ quiz: 'artha' as const, lexIds: ['rama'], onCorrect: [{ say: 'correct branch' }, { set: 'quiz.passed' }], onWrong: [{ say: 'wrong branch' }] }, { say: 'after' }];
  const k = startScript(kState([member('player', 6, ['pada_bana'])], { heard: ['s-ma-nishada'] }), REAL, 'test.quiz', quiz);
  assert.deepEqual(k.pending, { kind: 'say', text: 'after' }, 'the praise line of the skipped quiz is not said');
  assert.equal(k.save.flags['quiz.passed'], true, 'the rest of onCorrect runs');
  const praiseOnly = startScript(kState([member('player', 6, ['pada_bana'])]), REAL, 'test.quiz2', [{ quiz: 'artha' as const, lexIds: ['rama'], onCorrect: [{ say: 'well said' }] }, { say: 'after' }]);
  assert.deepEqual(praiseOnly.pending, { kind: 'say', text: 'after' });
  const p = startScript(kState([member('player', 6, ['pada_bana'])], { heard: ['s-ma-nishada'], style: 'abhyasa' }), REAL, 'test.quiz', quiz);
  assert.equal(p.pending?.kind, 'challenge');
  let real = 0;
  const walk = (cmds: unknown[]): void => {
    for (const c of cmds as Record<string, unknown>[]) {
      if ('quiz' in c) real++;
      for (const k2 of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose']) if (Array.isArray(c[k2])) walk(c[k2] as unknown[]);
    }
  };
  for (const e of REAL.events) walk(e.cmds);
  assert.ok(real >= 10, `the story has its quizzes (${real}); Kathā skips every one`);
});

test('level floor: the chapter card, every story battle and {join} raise the party to KATHA_FLOOR (never in the practice game)', () => {
  const low = (style: 'katha' | 'abhyasa'): GameState => kState([member('player', 4, ['pada_bana'], REAL)], { style, chapter: 1 });
  const card = startScript(low('katha'), REAL, 't', [{ chapter: 3 }]);
  assert.equal(card.pending?.kind, 'title');
  assert.equal(card.save.party[0]!.level, KATHA_FLOOR[3]);
  assert.equal(startScript(low('abhyasa'), REAL, 't', [{ chapter: 3 }]).save.party[0]!.level, 4);
  const six = { ...low('katha'), save: { ...low('katha').save, chapter: 6 as const } };
  const b = startScript(six, REAL, 't', [{ battle: spec([['nishachara', 2]], 'boss') }]);
  assert.equal(b.mode, 'battle');
  assert.equal(b.save.party[0]!.level, KATHA_FLOOR[6]);
  assert.equal(b.battle!.ally.level, KATHA_FLOOR[6], 'the fighter is built at the floor');
  assert.equal(b.battle!.ally.hp, b.battle!.ally.maxHp, 'and keeps full HP');
  const j = startScript(low('katha'), REAL, 't', [{ join: 'rama', level: 2 }, { say: 'x' }]);
  assert.ok(j.save.party.every((m) => m.level >= KATHA_FLOOR[1]!), 'a joining hero is floored too');
  // floors rise chapter by chapter
  for (let c = 2; c <= 6; c++) assert.ok(KATHA_FLOOR[c]! > KATHA_FLOOR[c - 1]!, `floor ch${c}`);
});

// ───────────────────────── battle ─────────────────────────

test('Kathā battle: a plain move resolves at once with no input, at the ordinary power (no swift)', () => {
  const s = fight(kState([member('player', 10, ['pada_bana', 'shoka_shloka'])], { restored: ['s-ma-nishada'] }), spec([['ravana', 30]], 'boss'));
  const n = pick(s, 'pada_bana');
  assert.equal(n.battle!.phase, 'beats');
  assert.deepEqual(n.pending, { kind: 'battle' });
  const beats = newBeats(s, n);
  const uses = beats.find((b) => /uses \{n:move\.pada_bana\}!/.test(b.text));
  assert.ok(uses, 'the ordinary "uses" beat');
  assert.ok(beats.every((b) => b.recital === undefined), 'no recital beat');
  assert.ok(!beats.some((b) => b.fx?.kind === 'swift' || /swift/i.test(b.text)), 'no swift beat');
  assert.equal(n.lastSmarana, undefined, 'nothing was recited');
  assert.equal(n.session.total, 0, 'no challenge was asked');
});

test('Kathā battle: an astra opens a smarana for its pāda (context battle, untimed); the answer resolves the turn with no feedback', () => {
  const s = astraFight('viddhi', { smrti: 1 });
  const c = pick(s, 'viddhi');
  assert.equal(c.battle!.phase, 'challenge');
  const p = c.pending;
  assert.ok(p?.kind === 'challenge' && p.context === 'battle');
  const sp = sm(c);
  const bind = astraBinding(FX, 'viddhi')!;
  assert.deepEqual([sp.shlokaId, sp.pada], [bind.shlokaId, bind.pada]);
  assert.equal(p.challenge.timeLimitMs, 0, 'no visible timer');
  assert.equal(p.challenge.options, undefined, 'options / answers stay unset (smarana has gapOptions)');
  assert.equal(sp.gaps.length, 1);
  // an invalid answer is ignored
  assert.equal(battleAction(c, FX, { type: 'answer', picks: ['nope'], timeMs: 1 }), c);
  assert.equal(battleAction(c, FX, { type: 'answer', picks: [], timeMs: 1 }), c);
  assert.equal(battleAction(c, FX, { type: 'answer', option: 'o0', timeMs: 1 }), c);
  const n = battleAction(c, FX, answer(rightPicks(sp)));
  assert.equal(n.battle!.phase, 'beats', 'no feedback phase');
  assert.deepEqual(n.pending, { kind: 'battle' });
  const beats = newBeats(c, n);
  const rb = recitalBeat(beats);
  assert.deepEqual(rb.recital, { shlokaId: sp.shlokaId, pada: sp.pada, correct: true }, 'the recital beat replaces "uses"');
  assert.match(rb.text, /recites the line and invokes \{n:move\.viddhi\}!/);
  assert.equal(rb.textSa, saText('kathaRecite', { x: { kind: 'ally', id: 'lakshmana' }, m: 'viddhi' }));
  assert.ok(!beats.some((b) => /uses \{n:move\.viddhi\}/.test(b.text)), 'no "uses" beat for a recited cast');
  assert.ok(!beats.some((b) => b.fx?.kind === 'swift' || /falter/.test(b.text)), 'no swift or falter beat on a correct cast');
  assert.equal(n.lastSmarana?.correct, true);
  assert.equal(n.lastSmarana?.context, 'battle');
  assert.deepEqual(n.lastSmarana?.picks, rightPicks(sp));
  assert.equal(n.save.smrti![padaKey(bind.shlokaId, bind.pada)]!.streak, 1, 'mastery recorded');
  assert.equal(n.session.total, 1, 'a recalled gap counts in the session');
  assert.equal(n.session.swift, 0, 'never swift');
});

test('Kathā battle: a level-0 pāda recites with no gap (picks: []), a mastered one recites itself except on spot checks', () => {
  const zero = pick(astraFight('viddhi', { smrti: 0 }), 'viddhi');
  const sp0 = sm(zero);
  assert.deepEqual(sp0.gaps, []);
  assert.equal(sp0.level, 0);
  assert.ok(sp0.chunks.every((c) => c.show === 'full'));
  assert.equal(battleAction(zero, FX, answer(['o0'])), zero, 'no picks for a line with no gap');
  const n0 = battleAction(zero, FX, answer([]));
  assert.equal(n0.battle!.phase, 'beats');
  assert.equal(n0.lastSmarana?.correct, true);
  const m = pick(astraFight('viddhi', { smrti: MASTERED }), 'viddhi');
  assert.deepEqual(sm(m).gaps, [], 'mastered cast 1: self-recital');
  assert.equal(sm(m).level, MASTERED);
  const bind = astraBinding(FX, 'viddhi')!;
  const key = padaKey(bind.shlokaId, bind.pada);
  const chk = pick(fight(kState([member('lakshmana', 20, ['viddhi'])], { restored: ['s-ramam-dasharatham'], smrti: smrtiFor('viddhi', MASTERED, FX, { casts: 1, nextCheck: 2 }), chapter: 3 }), spec([['ravana', 30]], 'boss')), 'viddhi');
  const cs = sm(chk);
  assert.deepEqual([cs.shlokaId, cs.pada], [bind.shlokaId, bind.pada]);
  assert.equal(cs.check, true, 'mastered cast 2: a spot check');
  assert.equal(cs.level, MASTERED);
  assert.equal(cs.gaps.length, 1);
  const ak = padaInfo(FX, cs.shlokaId, cs.pada)!.ak;
  assert.ok(cs.chunks.every((c, i) => c.show === (i === cs.gaps[0] ? 'gap' : (ak[i] ?? 0) > 1 ? 'hint' : 'full')), 'an L3-style gap with first-akṣara hints (none on a one-akṣara word)');
  const passed = battleAction(chk, FX, answer(rightPicks(cs)));
  assert.deepEqual(passed.save.smrti![key], { level: MASTERED, streak: 0, casts: 2, nextCheck: 4, last: cs.gaps[0] }, 'next check on cast 4');
  const failed = battleAction(chk, FX, answer(wrongPicks(cs)));
  assert.equal(failed.save.smrti![key]!.level, MASTERED - 1, 'a missed check drops to 3');
});

test('Kathā outcome: a miss halves damage (0.5) — never "no effect" — folded into the effect beat; recalled ×1.1; auto = full', () => {
  const s = astraFight('shoka_shloka', { smrti: 1, level: 20 });
  const c = pick(s, 'shoka_shloka');
  const sp = sm(c);
  const hit = (n: GameState): number => newBeats(c, n).find((b) => b.fx?.kind === 'hit' && b.fx.target === 'foe')!.fx!.amount!;
  const right = battleAction(c, FX, answer(rightPicks(sp)));
  const miss = battleAction(c, FX, answer(wrongPicks(sp)));
  const auto = battleAction(c, FX, answer([], true));
  const [r, w, a] = [hit(right), hit(miss), hit(auto)];
  assert.ok(Math.abs(w - (r * KATHA_QUALITY.half) / KATHA_QUALITY.recalled) <= 1.5, `miss ${w} ≈ half of full (recalled ${r})`);
  assert.ok(Math.abs(a - r / KATHA_QUALITY.recalled) <= 1.5, `auto ${a} = full power (recalled ${r} is ×1.1)`);
  assert.ok(w > 0);
  const mb = newBeats(c, miss);
  const effect = mb.find((b) => b.fx?.kind === 'hit')!;
  // Rāvaṇa (māyā) is weak to a divya astra: the element line first, then the falter (v0.4.1 narration order)
  assert.equal(effect.fx?.effective, 'super');
  assert.match(effect.text, /^It is super effective! But the line falters: only half the power lands\. .*takes/, 'the outcome is folded into the effect beat, after the element line');
  assert.equal(effect.textSa, [saText('super'), saText('kathaHalfBut'), saText('takes', { x: { kind: 'enemy', id: 'ravana' }, n: effect.fx!.amount! })].join(' '), 'with its Sanskrit in the same order');
  // a foe of no special weakness: the falter opens the effect beat
  const plain = pick(astraFight('shoka_shloka', { smrti: 1, level: 20, foe: ['kumbhakarna', 26] }), 'shoka_shloka');
  const pm = newBeats(plain, battleAction(plain, FX, answer(wrongPicks(sm(plain))))).find((b) => b.fx?.kind === 'hit')!;
  assert.equal(pm.fx?.effective, undefined);
  assert.match(pm.text, /^The line falters: only half the power lands\. .*takes/);
  assert.ok(pm.textSa?.startsWith(saText('kathaHalf')!), 'with its Sanskrit');
  assert.ok(!mb.some((b) => /The words falter/.test(b.text)), 'no separate falter beat');
  assert.equal(mb.filter((b) => /falters/.test(b.text)).length, 1);
  assert.deepEqual(recitalBeat(mb).recital, { shlokaId: sp.shlokaId, pada: sp.pada, correct: false });
  assert.equal(miss.lastSmarana?.correct, false);
  assert.equal(auto.lastSmarana?.auto, true);
  assert.deepEqual(auto.save.smrti, c.save.smrti, 'automatic recitation leaves mastery untouched');
  assert.equal(auto.session.total, 0, 'and is not a session answer');
  assert.ok(!spellingKey(saText('kathaHalf')!).includes(ANSWER_WORD.slice(0, -2)), 'the Kathā falter line never says "answer"');
});

test('Kathā outcome: half effect for heal and stage astras (heal ×0.5, ±2 → ±1, ±1 stays ±1), extra effects too', () => {
  // heal self (anirveda 0.5 of max HP)
  {
    let s = astraFight('anirveda', { smrti: 1 });
    s = { ...s, battle: { ...s.battle!, ally: { ...s.battle!.ally, hp: 1 } } };
    const c = pick(s, 'anirveda');
    const sp = sm(c);
    const healed = (n: GameState): BattleBeat => newBeats(c, n).find((b) => b.fx?.kind === 'heal')!;
    const max = s.battle!.ally.maxHp;
    assert.equal(healed(battleAction(c, FX, answer(rightPicks(sp)))).fx!.amount, Math.round(max * 0.5));
    const half = healed(battleAction(c, FX, answer(wrongPicks(sp))));
    assert.equal(half.fx!.amount, Math.round(max * 0.25), 'a miss heals half');
    assert.match(half.text, /^The line falters: only half the power lands\. .*recovers/);
  }
  // stage astras
  const stage = (moveId: string, read: (s: GameState) => number, full: number, halfV: number): void => {
    const c = pick(astraFight(moveId, { smrti: 2 }), moveId);
    const sp = sm(c);
    assert.equal(read(battleAction(c, FX, answer(rightPicks(sp)))), full, `${moveId} full`);
    const miss = battleAction(c, FX, answer(wrongPicks(sp)));
    assert.equal(read(miss), halfV, `${moveId} half`);
    const b = newBeats(c, miss).find((x) => x.fx?.kind === 'buff' || x.fx?.kind === 'debuff')!;
    assert.match(b.text, /^The line falters: only half the power lands\. /);
    assert.ok(!/sharply/.test(b.text), 'a halved ±2 is an ordinary rise / fall');
  };
  stage('jaya_ghosha', (s) => s.battle!.ally.stages.atk, 2, 1);
  stage('abhaya', (s) => s.battle!.ally.stages.def, 2, 1);
  stage('viddhi', (s) => s.battle!.foe.stages.def, -2, -1);
  // party heal + extra buff (aditya_hrdaya: heal 0.5 + attack +1)
  {
    let s = astraFight('aditya_hrdaya', { smrti: 1 });
    s = { ...s, battle: { ...s.battle!, ally: { ...s.battle!.ally, hp: 1 } } };
    const c = pick(s, 'aditya_hrdaya');
    const sp = sm(c);
    const miss = battleAction(c, FX, answer(wrongPicks(sp)));
    const heal = newBeats(c, miss).find((b) => b.fx?.kind === 'heal')!;
    assert.equal(heal.fx!.amount, Math.round(s.battle!.ally.maxHp * 0.25));
    assert.equal(miss.battle!.ally.stages.atk, 1, 'the extra +1 stays +1');
  }
  assert.deepEqual(halfEffect({ kind: 'heal', amount: 0.5, target: 'self' }), { kind: 'heal', amount: 0.25, target: 'self' });
  assert.deepEqual(halfEffect({ kind: 'buff-atk', amount: 2, target: 'party' }).amount, 1);
  assert.deepEqual(halfEffect({ kind: 'buff-atk', amount: 1, target: 'party' }).amount, 1);
  assert.deepEqual(halfEffect({ kind: 'buff-def', amount: 3, target: 'self' }).amount, 2);
  assert.deepEqual(halfEffect({ kind: 'debuff-def', amount: -2, target: 'enemy' }).amount, -1);
  assert.deepEqual(halfEffect({ kind: 'stun', amount: 0.3, target: 'enemy' }).amount, 0.15);
});

/** A Kathā duel advanced to its first player turn (the foe made sturdy so it lasts; the foe bound before each answer). */
function duelTurn(s0: GameState, foe: string, lv = 12): GameState {
  let s = startBattle(s0, FX, spec([[foe, lv]], 'duel'));
  s = { ...s, battle: { ...s.battle!, foe: { ...s.battle!.foe, hp: 9999, maxHp: 9999 } } };
  for (let i = 0; i < 20 && s.battle!.phase !== 'challenge' && s.battle!.phase !== 'command'; i++) s = battleAction(s, FX, { type: 'advance' });
  return s;
}

test('Kathā duels go straight to the recitation every player turn (no menu, no move choice): the duel’s own verse first, rotating; no PP spent', () => {
  const foe = 'bharadvaja_duel';
  const own = duelVerse(kState([], { heard: ['s-tapah-svadhyaya', 's-ma-nishada'] }), REAL, foe);
  assert.equal(own, 's-ma-nishada', 'the verse holding the duelist’s restoresWords');
  // an astra equipped too: a duel turn still recites the duel's verse (the line, not the move, is the answer)
  let s = duelTurn(kState([member('player', 12, ['pada_bana', 'shoka_shloka'])], { heard: ['s-tapah-svadhyaya'], restored: ['s-ma-nishada'] }), foe);
  const pp0 = s.save.party[0]!.pp;
  const seen: number[] = [];
  for (let turn = 0; turn < 5; turn++) {
    assert.equal(s.battle!.phase, 'challenge', `turn ${turn}: straight to the recitation`);
    const p = s.pending;
    assert.ok(p?.kind === 'challenge' && p.context === 'battle' && p.challenge.kind === 'smarana');
    assert.equal(s.battle!.pendingMove, 'shoka_shloka', 'the line carries the best damaging move');
    for (const i of [-1, 0, 1, 2, 3]) assert.equal(battleAction(s, FX, { type: 'choose', index: i }), s, 'no menu during a duel turn');
    const sp = sm(s);
    assert.equal(sp.shlokaId, 's-ma-nishada');
    seen.push(sp.pada);
    const c = bindFoe(s);
    const n = battleAction(c, FX, answer(rightPicks(sp)));
    const b0 = recitalBeat(newBeats(c, n));
    assert.match(b0.text, /answers with a line of verse!/);
    assert.equal(b0.textSa, saText('kathaDuelRecite', { x: { kind: 'ally', id: 'player' } }));
    s = n;
    for (let i = 0; i < 30 && s.battle!.phase !== 'challenge' && s.battle!.phase !== 'command'; i++) s = battleAction(s, FX, { type: 'advance' });
  }
  assert.deepEqual(seen, [0, 1, 2, 3, 0], 'pādas in turn');
  assert.deepEqual(s.save.party[0]!.pp, pp0, 'a duel recitation spends no PP');
  // a miss: half the power, folded into the effect beat
  const m = bindFoe(duelTurn(kState([member('player', 12, ['pada_bana'])], { heard: ['s-ma-nishada'], smrti: { 's-ma-nishada:0': { level: 1, streak: 0 } } }), foe));
  const mn = battleAction(m, FX, answer(wrongPicks(sm(m))));
  assert.equal(mn.lastSmarana?.correct, false);
  assert.ok(newBeats(m, mn).some((b) => /falters: only half the power lands\. .*wavers/.test(b.text)));
  // no own verse heard: every heard verse in story order
  const other = kState([member('player', 12, ['pada_bana'])], { heard: ['s-tapah-svadhyaya', 's-ko-nvasmin'] });
  assert.equal(duelVerse(other, REAL, foe), null);
  const refs = [0, 1, 2, 3, 4, 5, 6].map((i) => duelPada(other, REAL, foe, i)!);
  assert.ok(refs.every((r) => ['s-tapah-svadhyaya', 's-ko-nvasmin'].includes(r.shlokaId) && padaInfo(REAL, r.shlokaId, r.pada)!.chunks.length >= 2), 'heard verses, ≥ 2-chunk pādas only');
  assert.ok(new Set(refs.map((r) => padaKey(r.shlokaId, r.pada))).size >= 5, 'rotating');
  // nothing heard: the ordinary menu, and a move resolves at once
  const none = duelTurn(kState([member('player', 12, ['pada_bana'])]), foe);
  assert.equal(none.battle!.phase, 'command');
  assert.equal(pick(none, 'pada_bana').battle!.phase, 'beats');
  // the practice game keeps its menu in a duel
  const prac = duelTurn(kState([member('player', 12, ['pada_bana'])], { heard: ['s-ma-nishada'], style: 'abhyasa' }), foe);
  assert.equal(prac.battle!.phase, 'command');
});

// ───────────────────────── the tutorial duel (v0.4.3) ─────────────────────────

/** The real story's tutorial duel spec (ch1.bharadvaja_duel), found by walking the event. */
function tutorialSpec(): BattleSpec {
  let found: BattleSpec | undefined;
  const walk = (cmds: unknown[]): void => {
    for (const c of cmds as Record<string, unknown>[]) {
      const b = c['battle'] as BattleSpec | undefined;
      if (b?.tutorial) found ??= b;
      for (const k of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose']) if (Array.isArray(c[k])) walk(c[k] as unknown[]);
    }
  };
  for (const e of REAL.events) walk(e.cmds);
  assert.ok(found, 'a story battle carries `tutorial: true`');
  return found;
}

test('tutorial duel (v0.4.3): exactly one story fight is the tutorial — Bharadvāja’s duel in Book 1, before any other story fight', () => {
  const specs: { event: string; spec: BattleSpec }[] = [];
  const walk = (cmds: unknown[], event: string): void => {
    for (const c of cmds as Record<string, unknown>[]) {
      if (c['battle']) specs.push({ event, spec: c['battle'] as BattleSpec });
      for (const k of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose']) if (Array.isArray(c[k])) walk(c[k] as unknown[], event);
    }
  };
  for (const e of REAL.events) walk(e.cmds, e.id);
  const tut = specs.filter((x) => x.spec.tutorial);
  assert.deepEqual(tut.map((x) => x.event), ['ch1.bharadvaja_duel']);
  assert.equal(tut[0]!.spec.kind, 'duel');
  assert.deepEqual(tut[0]!.spec.enemies.map((e) => e.id), ['bharadvaja_duel']);
  // the first story fight of the game: the walkthrough meets no battle before it
  const steps = REAL.walkthrough;
  const at = steps.findIndex((w) => w.expectFlag === 'ch1.duel_done');
  assert.ok(at >= 0);
  let earlier = 0;
  runWalkthrough(REAL, 3, 3, { style: 'katha', steps: steps.slice(0, at), onAction: (b, _a, n) => void (b.mode !== 'battle' && n.mode === 'battle' && earlier++) });
  assert.equal(earlier, 0, 'no story fight before the tutorial duel');
});

test('tutorial duel (v0.4.3): call and response — the duelist models each pāda in full (no gap, no input), the player says that pāda back with one gap; the foe never strikes', () => {
  const tut = tutorialSpec();
  const s0 = kState([member('player', 3, ['pada_bana'])], { heard: ['s-ma-nishada'] });
  let s = startBattle(s0, REAL, tut);
  const b0 = s.battle!.beats;
  assert.equal(b0.length, 2, 'the opening line and the first model line');
  assert.equal(b0[0]!.textSa, saText('kathaEchoIntro', { x: { kind: 'enemy', id: 'bharadvaja_duel' } }), 'a lesson, not the story’s debate intro');
  assert.deepEqual(b0[1]!.model, { shlokaId: 's-ma-nishada', pada: 0 }, 'the first model line is the first pāda');
  assert.equal(b0[1]!.textSa, saText('kathaEchoModel', { x: { kind: 'enemy', id: 'bharadvaja_duel' } }));
  const hp0 = s.battle!.ally.hp;
  const pairs: string[] = [];
  let model = b0[1]!.model!;
  const phase = (x: GameState): string => x.battle!.phase;
  for (let turn = 0; turn < 12 && phase(s) !== 'won'; turn++) {
    for (let i = 0; i < 30 && phase(s) !== 'challenge' && phase(s) !== 'won'; i++) s = battleAction(s, REAL, { type: 'advance' });
    if (phase(s) === 'won') break;
    const sp = sm(s);
    // the line said back is the one just modelled, printed verbatim, with exactly one gap (its last chunk at level 0–1)
    assert.deepEqual({ shlokaId: sp.shlokaId, pada: sp.pada }, model, `turn ${turn}: says back the modelled pāda`);
    assert.equal(sp.gaps.length, 1, `turn ${turn}: one gap`);
    assert.equal(sp.gapOptions[0]!.length, 3, 'three chips');
    assert.equal(sp.chunks.map((c) => c.text).join(' '), REAL.shlokas.find((x) => x.id === sp.shlokaId)!.padas[sp.pada], 'the printed pāda');
    const n = battleAction(s, REAL, answer(rightPicks(sp)));
    const nb = newBeats(s, n);
    const said = nb.find((b) => b.recital);
    assert.ok(said, 'one beat says the line back');
    assert.match(said.text, /says the line back!/);
    assert.equal(said.textSa, saText('kathaEchoSay', { x: { kind: 'ally', id: 'player' } }));
    assert.equal(said.fx?.kind, 'hit', 'the line lands on the same beat');
    assert.ok(!nb.some((b) => b.fx?.target === 'ally' && b.fx.kind === 'hit'), 'the duelist never strikes');
    assert.ok(!nb.some((b) => /counters|wavers/.test(b.text)), 'no debate lines in the lesson');
    const next = nb.find((b) => b.model);
    if (n.battle!.phase !== 'won') {
      assert.ok(next, `turn ${turn}: the duelist models the next pāda`);
      const line = REAL.shlokas.find((x) => x.id === next.model!.shlokaId)?.padas[next.model!.pada];
      assert.ok(line && line.split(' ').length >= 2, 'a real pāda of ≥ 2 chunks');
      model = next.model!;
    } else assert.equal(next, undefined, 'no model line after the last one');
    pairs.push(`${sp.pada}`);
    s = n;
  }
  assert.equal(s.battle!.phase, 'won', 'the lesson is won');
  assert.deepEqual(pairs, ['0', '1', '2', '3'], 'one turn per pāda for a perfect reciter: the verse once through');
  assert.equal(s.battle!.ally.hp, hp0, 'no damage taken');
  const end = s.battle!.beats;
  assert.ok(end.some((b) => b.textSa === saText('kathaEchoDown', { x: { kind: 'enemy', id: 'bharadvaja_duel' } })));
  assert.ok(end.some((b) => b.textSa === saText('kathaEchoWin')));
  assert.ok(!end.some((b) => b.text === idx.enemy.get('bharadvaja_duel')!.defeatLine), 'the debate line is left out of the lesson');
  // a miss: the right word shimmers in, half the power, folded into the same beat; the next turn models the next pāda
  let m = startBattle(s0, REAL, tut);
  for (let i = 0; i < 5 && m.battle!.phase !== 'challenge'; i++) m = battleAction(m, REAL, { type: 'advance' });
  const mn = battleAction(m, REAL, answer(wrongPicks(sm(m))));
  const mb = newBeats(m, mn);
  assert.match(mb.find((b) => b.recital)!.text, /says the line back! But the line falters: only half the power lands\./);
  assert.deepEqual(mb.find((b) => b.model)!.model, { shlokaId: 's-ma-nishada', pada: 1 });
});

test('tutorial duel (v0.4.3): Kathā only — the practice game ignores the flag; a mastered pāda is not gapped; the echo gap is the last chunk', () => {
  const tut = tutorialSpec();
  // practice: the usual duel (the story intro, "steps forward", the menu, the foe's counters)
  const p = startBattle(kState([member('player', 3, ['pada_bana'])], { heard: ['s-ma-nishada'], style: 'abhyasa' }), REAL, tut);
  assert.equal(p.battle!.beats[0]!.text, tut.intro);
  assert.ok(p.battle!.beats.every((b) => !b.model), 'no model line in the practice game');
  // another Kathā duel keeps its v0.4.1 shape (no model line; the duelist counters)
  const other = startBattle(kState([member('player', 3, ['pada_bana'])], { heard: ['s-ma-nishada'] }), REAL, { ...tut, tutorial: false });
  assert.ok(other.battle!.beats.every((b) => !b.model));
  // the echo gap: level 0 → the level-1 gap (the last eligible chunk); a mastered pāda recites itself as ever
  const k0 = kState([member('player', 3, ['pada_bana'])], { heard: ['s-ma-nishada'] });
  const e0 = buildSmarana(k0, REAL, { shlokaId: 's-ma-nishada', pada: 1, mode: 'battle', echo: true }).challenge.smarana!;
  const plain = buildSmarana(k0, REAL, { shlokaId: 's-ma-nishada', pada: 1, mode: 'battle' }).challenge.smarana!;
  assert.deepEqual(plain.gaps, [], 'outside the tutorial a level-0 pāda has no gap');
  assert.deepEqual(e0.gaps, [gapEligible(REAL, padaInfo(REAL, 's-ma-nishada', 1)!).at(-1)]);
  assert.equal(e0.level, 1);
  const mastered = kState([member('player', 3, ['pada_bana'])], { heard: ['s-ma-nishada'], smrti: { 's-ma-nishada:1': { level: MASTERED, streak: 0, casts: 0, nextCheck: FIRST_CHECK } } });
  assert.deepEqual(buildSmarana(mastered, REAL, { shlokaId: 's-ma-nishada', pada: 1, mode: 'battle', echo: true }).challenge.smarana!.gaps, []);
  // the foe's HP: one turn per pāda (KATHA_TUTORIAL_TURNS) with the lead's best hit
  const k = startBattle(k0, REAL, tut).battle!;
  const ord = fighterFromEnemy('bharadvaja_duel', tut.enemies[0]!.level, REAL);
  assert.equal(k.foe.maxHp, kathaFoe(ord, k.ally, tut, REAL).maxHp);
  assert.equal(kathaFoe(ord, k.ally, tut, REAL).maxHp, Math.min(ord.maxHp, Math.max(Math.ceil(ord.maxHp * KATHA_HP_FLOOR), Math.round(KATHA_TUTORIAL_TURNS * bestHit(k.ally, kathaFoeAtk(ord, k.ally, REAL), REAL, false)))));
});

test('tutorial duel (v0.4.3): the story bots win it at every level — perfect in 4 turns, a 70 % reciter in ≤ 8 — and the story then leads back to Vālmīki', () => {
  const steps = REAL.walkthrough;
  const at = steps.findIndex((w) => w.expectFlag === 'ch1.duel_done');
  for (const accuracy of [1, 0.7]) {
    for (const { level, seed } of testMatrix(LEVELS, 25)) {
      let turns = -1;
      let models = 0;
      let struck = false;
      const r = runWalkthrough(REAL, seed, level, {
        style: 'katha',
        accuracy,
        steps: steps.slice(0, at + 1),
        onAction: (b, a, n) => {
          if (n.battle?.spec.tutorial) {
            // new beats appear at the start and after an answer (the queue is empty then): count their model lines
            if (!b.battle || a.type === 'answer') models += n.battle.beats.filter((x) => x.model).length;
            if (n.battle.beats.some((x) => x.fx?.kind === 'hit' && x.fx.target === 'ally')) struck = true;
          }
          if (b.battle?.spec.tutorial && n.mode !== 'battle') turns = b.battle.turn;
        },
      });
      const tag = `acc ${accuracy} seed ${seed} level ${level}`;
      assert.equal(r.error, null, `${tag}: ${r.error}`);
      assert.equal(r.losses, 0, tag);
      assert.ok(r.state.save.flags['ch1.duel_won'], `${tag}: the duel is won`);
      assert.ok(!struck, `${tag}: the duelist never strikes`);
      if (accuracy === 1) assert.equal(turns, 4, `${tag}: one turn per pāda`);
      else assert.ok(turns >= 4 && turns <= 8, `${tag}: ${turns} turns`);
      assert.equal(models, turns, `${tag}: a model line before every turn`);
      // afterwards: Vālmīki at the shrine is the next goal
      assert.equal(r.state.save.objective, 'Return to the hermitage and talk to Valmiki at the shrine.');
      assert.deepEqual(steps[at + 1]?.action, { talk: 'valmiki' });
    }
  }
});

test('the practice game keeps its challenge → feedback flow and swift power (no smarana anywhere)', () => {
  const p = kState([member('player', 10, ['pada_bana', 'shoka_shloka'])], { style: 'abhyasa', restored: ['s-ma-nishada'] });
  const s = fight(p, spec([['ravana', 30]], 'boss'));
  const c = pick(s, 'shoka_shloka');
  assert.equal(c.battle!.phase, 'challenge');
  assert.notEqual((c.pending as { challenge: Challenge }).challenge.kind, 'smarana');
  const ch = (c.pending as { challenge: Challenge }).challenge;
  const a = battleAction(c, FX, ch.orders ? { type: 'answer', order: ch.orders[0]!, timeMs: 100 } : { type: 'answer', option: ch.answers![0]!, timeMs: 100 });
  assert.equal(a.battle!.phase, 'feedback');
  assert.equal(a.lastSmarana, undefined);
});

// ───────────────────────── shrine recital & study hall ─────────────────────────

function atShrine(s: GameState): GameState {
  const t = startScript(s, REAL, SHRINE_EVENT_ID, SHRINE_CMDS);
  assert.equal(t.pending?.kind, 'shrine');
  return t;
}

test('shrine recital in Kathā: the four pādas in order, exactly one gap each (level 0 → L1, mastered → L3), no feedback in between', () => {
  const id = 's-ma-nishada';
  const smrti = { [padaKey(id, 1)]: { level: MASTERED, streak: 0, casts: 5, nextCheck: 8 }, [padaKey(id, 2)]: { level: 2, streak: 1 } };
  let s = reduce(atShrine(kState([member('player', 8, ['pada_bana'])], { heard: [id], smrti })), REAL, { type: 'recite', shlokaId: id });
  const levels: number[] = [];
  for (let step = 1; step <= 4; step++) {
    const p = s.pending;
    assert.ok(p?.kind === 'challenge' && p.context === 'recite' && p.step === step && p.steps === 4, `step ${step}`);
    const sp = sm(s);
    assert.equal(sp.pada, step - 1, 'pādas in order');
    assert.equal(sp.gaps.length, 1, 'always one gap in a recital');
    assert.equal(sp.gapOptions[0]!.length, 3);
    levels.push(sp.level);
    s = reduce(s, REAL, answer(step === 2 ? wrongPicks(sp) : rightPicks(sp)));
    assert.notEqual(s.pending?.kind, 'feedback', 'no feedback pending after a smarana answer');
    assert.equal(s.lastSmarana?.context, 'recite');
  }
  assert.deepEqual(levels, [1, 3, 2, 1], 'level 0 → 1 (first time), mastered → 3, others at their level');
  assert.equal(s.pending?.kind, 'shrine', 'the shrine menu returns');
  assert.equal(s.save.shlokas[id]!.restored, true, '3 of 4 flawless restores the verse');
  assert.equal(s.save.flags[`restored.${id}`], true);
  assert.equal(s.recital, null);
  assert.ok(s.fx.some((f) => f.kind === 'toast' && /Verse restored! 3 of 4 correct\./.test(f.text)));
  assert.equal(s.save.smrti![padaKey(id, 1)]!.level, MASTERED - 1, 'a miss on a mastered pāda drops it to 3');
  assert.ok(s.save.party[0]!.moves.includes('shoka_shloka') || s.save.party[0]!.pp['shoka_shloka'] !== undefined, 'the verse’s astra is unlocked');
  // 2 of 4: not restored
  let f = reduce(atShrine(kState([member('player', 8, ['pada_bana'])], { heard: [id] })), REAL, { type: 'recite', shlokaId: id });
  for (let step = 1; step <= 4; step++) f = reduce(f, REAL, answer(step <= 2 ? wrongPicks(sm(f)) : rightPicks(sm(f))));
  assert.equal(f.save.shlokas[id]!.restored, false);
  assert.ok(f.fx.some((x) => x.kind === 'toast' && /Three in four/.test(x.text)));
  // automatic recitation restores (full effect)
  let a = reduce(atShrine(kState([member('player', 8, ['pada_bana'])], { heard: [id] })), REAL, { type: 'recite', shlokaId: id });
  for (let step = 1; step <= 4; step++) a = reduce(a, REAL, answer([], true));
  assert.equal(a.save.shlokas[id]!.restored, true);
  assert.deepEqual(a.save.smrti, {}, 'mastery untouched by automatic recitation');
});

test('story restore commands use the Kathā recital too, and the one-chunk pādas are gapped whole against other one-chunk pādas', () => {
  const id = 's-nanrgveda'; // three one-chunk pādas
  let s = startScript(kState([member('player', 8, ['pada_bana'])], { heard: [id] }), REAL, 't', [{ shloka: id, mode: 'restore' }, { say: 'after' }]);
  for (let step = 0; step < 3; step++) {
    const sp = sm(s);
    const info = padaInfo(REAL, id, sp.pada)!;
    assert.equal(info.chunks.length, 1);
    assert.deepEqual(sp.gaps, [0], 'gapped whole');
    const opts = sp.gapOptions[0]!.map((o) => o.sa!);
    const wholePadas = new Set(kathaIndex(REAL).all.filter((p) => p.chunks.length === 1).map((p) => p.keys[0]));
    assert.ok(opts.filter((o) => wholePadas.has(spellingKey(o))).length >= 2, `other one-chunk pādas first: ${opts.join(' | ')}`);
    s = reduce(s, REAL, answer(rightPicks(sp)));
  }
  s = reduce(s, REAL, answer(rightPicks(sm(s))));
  assert.deepEqual(s.pending, { kind: 'say', text: 'after' }, 'the story continues after the recital');
  assert.equal(s.save.shlokas[id]!.restored, true);
});

test('study hall: SHRINE_STUDY (Kathā only) runs a round of classic challenges (context quiz, feedback panels) and returns to the menu', () => {
  const k = atShrine(kState([member('player', 8, ['pada_bana'])], { heard: ['s-ma-nishada', 's-tapah-svadhyaya'], chapter: 3 }));
  let s = reduce(k, REAL, { type: 'choose', index: SHRINE_STUDY });
  assert.equal(s.recital?.study, true);
  let asked = 0;
  for (let i = 0; i < 40 && s.pending?.kind !== 'shrine'; i++) {
    const p = s.pending;
    if (p?.kind === 'challenge') {
      assert.equal(p.context, 'quiz');
      assert.equal(p.step, asked + 1);
      assert.equal(p.steps, STUDY_ROUND);
      assert.notEqual(p.challenge.kind, 'smarana');
      asked++;
      const ch = p.challenge;
      s = reduce(s, REAL, ch.orders ? { type: 'answer', order: ch.orders[0]!, timeMs: 100 } : { type: 'answer', option: ch.answers![0]!, timeMs: 100 });
      assert.equal(s.pending?.kind, 'feedback', 'today’s feedback panel');
    } else s = reduce(s, REAL, { type: 'advance' });
  }
  assert.equal(asked, STUDY_ROUND);
  assert.equal(s.pending?.kind, 'shrine');
  assert.equal(s.recital, null);
  assert.equal(s.session.correct, STUDY_ROUND);
  const p = atShrine(kState([member('player', 8, ['pada_bana'])], { heard: ['s-ma-nishada'], style: 'abhyasa' }));
  assert.equal(reduce(p, REAL, { type: 'choose', index: SHRINE_STUDY }), p, 'the practice game has no study hall');
});

// ───────────────────────── smṛti ladder ─────────────────────────

test('smṛti ladder: two flawless casts → up, a miss → down (min 0), mastered spot checks on casts 2, 4, 8, 16, 32; a missed check → 3', () => {
  const gap = { gaps: [0] };
  const none = { gaps: [] as number[] };
  let e = smrtiOf({}, 'x:0');
  assert.deepEqual(e, { level: 0, streak: 0 });
  e = nextSmrti(e, none, true);
  assert.deepEqual([e.level, e.streak], [0, 1]);
  e = nextSmrti(e, none, true);
  assert.deepEqual([e.level, e.streak], [1, 0], 'two exposure casts → L1');
  e = nextSmrti(e, gap, true);
  e = nextSmrti(e, gap, false);
  assert.deepEqual([e.level, e.streak], [0, 0], 'a miss → level − 1, streak 0');
  assert.deepEqual(nextSmrti({ level: 0, streak: 1 }, gap, false), { level: 0, streak: 0, last: 0 }, 'min 0');
  e = { level: 3, streak: 1 };
  e = nextSmrti(e, gap, true);
  assert.deepEqual([e.level, e.casts, e.nextCheck], [MASTERED, 0, FIRST_CHECK], 'mastered: the check schedule starts');
  const checks: number[] = [];
  for (let cast = 1; cast <= 40; cast++) {
    const plan = castPlan(e, 'battle');
    if (plan.check) checks.push(cast);
    assert.equal(plan.gapLevel, plan.check ? 3 : 0);
    e = nextSmrti(e, plan.check ? { gaps: [1], check: true } : none, true);
    assert.equal(e.level, MASTERED);
  }
  assert.deepEqual(checks, [2, 4, 8, 16, 32]);
  assert.deepEqual([nextSmrti(e, { gaps: [0], check: true }, false).level, nextSmrti(e, { gaps: [0], check: true }, false).streak], [3, 0], 'a missed check → 3');
  assert.deepEqual(castPlan({ level: 0, streak: 0 }, 'recital'), { gapLevel: 1, check: false });
  assert.deepEqual(castPlan({ level: MASTERED, streak: 0, casts: 1, nextCheck: 2 }, 'recital'), { gapLevel: 3, check: false });
  assert.deepEqual(castPlan({ level: 2, streak: 0 }, 'battle'), { gapLevel: 2, check: false });
  // automatic recitation never touches mastery
  const s = kState([member('player', 6, ['pada_bana'])], { smrti: { 'x:0': { level: 2, streak: 1 } } });
  assert.equal(recordSmarana(s, { shlokaId: 'x', pada: 0, chunks: [], gaps: [0], gapOptions: [], gapAnswers: [], level: 2 }, true, true), s);
});

// ───────────────────────── the builder ─────────────────────────

/** Build a smarana for (shloka, pāda) at a smṛti entry, varying the seed. */
function build(shlokaId: string, pada: number, entry: SaveData['smrti'] extends Record<string, infer E> | undefined ? E : never, seed: number, mode: 'battle' | 'recital' = 'battle', moveId?: string, content = FX): Challenge {
  const s = kState([member('player', 6, ['pada_bana'])], { seed, smrti: { [padaKey(shlokaId, pada)]: entry } });
  return buildSmarana({ ...s, tick: seed * 31 }, content, { shlokaId, pada, mode, ...(moveId ? { moveId } : {}) }).challenge;
}

test('builder: at most ONE gap at every level (0–4, checks, both modes); L1 = the last eligible chunk; L2 full context; L3 hints', () => {
  const ki = kathaIndex(FX);
  for (const info of ki.all) {
    for (const mode of ['battle', 'recital'] as const) {
      for (const entry of [{ level: 0, streak: 0 }, { level: 1, streak: 0 }, { level: 2, streak: 1 }, { level: 3, streak: 0 }, { level: 4, streak: 0, casts: 0, nextCheck: 2 }, { level: 4, streak: 0, casts: 1, nextCheck: 2 }, { level: 4, streak: 0, casts: 3, nextCheck: 4 }]) {
        for (let seed = 1; seed <= 3; seed++) {
          const sp = build(info.shlokaId, info.pada, entry, seed, mode).smarana!;
          assert.ok(sp.gaps.length <= 1, `${info.key} ${mode} L${entry.level}: ≤ 1 gap`);
          assert.equal(sp.chunks.filter((c) => c.show === 'gap').length, sp.gaps.length);
          assert.deepEqual(sp.chunks.map((c) => c.text), info.chunks, 'the printed chunks, verbatim, in order');
          if (mode === 'recital') assert.equal(sp.gaps.length, 1, 'a recital always has its one gap');
          const plan = castPlan(entry, mode);
          if (plan.gapLevel === 0) assert.equal(sp.gaps.length, 0);
          if (sp.gaps.length === 0) continue;
          const g = sp.gaps[0]!;
          if (info.chunks.length > 1) {
            if (plan.gapLevel === 1) assert.equal(g, info.chunks.length - 1, 'L1: the last chunk');
            // L3 hints every other chunk by its first akṣara, except a one-akṣara chunk (no abbreviation cue: it shows in full; v0.4.1)
            const others = sp.chunks.flatMap((c, i) => (i === g ? [] : [[c.show, plan.gapLevel === 3 && (info.ak[i] ?? 0) > 1 ? 'hint' : 'full']]));
            assert.ok(others.every(([x, want]) => x === want), `${info.key} L${plan.gapLevel}: others ${others.map((o) => o[0])}`);
          }
          assert.equal(!!sp.check, plan.check);
        }
      }
    }
  }
});

test('builder: the gap rotates so every eligible chunk is recalled; the astra’s own name is never the gap', () => {
  for (const content of [FX, REAL]) {
    for (const moveId of BOUND) {
      const b = astraBinding(content, moveId)!;
      const info = padaInfo(content, b.shlokaId, b.pada)!;
      const eligible = gapEligible(content, info, moveId);
      assert.ok(eligible.length >= 1, `${moveId}: at least one chunk can be the gap`);
      const name = slp(nameOf(moveId));
      const stem = name.replace(/[aAiIuUeEoO]$/, '');
      for (const level of [1, 2, 3]) {
        let entry: { level: number; streak: number; last?: number } = { level, streak: 0 };
        const gaps = new Set<number>();
        for (let cast = 0; cast < 3 * info.chunks.length; cast++) {
          const sp = build(b.shlokaId, b.pada, entry, 11 + cast, 'battle', moveId, content).smarana!;
          const g = sp.gaps[0]!;
          gaps.add(g);
          const chunk = slp(info.chunks[g]!);
          assert.ok(!chunk.includes(name) && !(stem.length >= 2 && chunk.includes(stem)), `${moveId} L${level}: the gap "${info.chunks[g]}" is not the astra’s name`);
          entry = { level, streak: 0, ...(nextSmrti(entry, sp, true).last !== undefined ? { last: nextSmrti(entry, sp, true).last! } : {}) };
        }
        if (level === 1) assert.deepEqual([...gaps], [eligible[eligible.length - 1]], `${moveId} L1: the last eligible chunk`);
        else assert.deepEqual([...gaps].sort(), [...eligible].sort(), `${moveId} L${level}: every eligible chunk gets recalled`);
      }
    }
  }
  // the audit's case: viddhi ("know!") is never the gap of the astra viddhi, though it is its pāda's last chunk
  const vb = astraBinding(FX, 'viddhi')!;
  const vi = padaInfo(FX, vb.shlokaId, vb.pada)!;
  assert.equal(spellingKey(vi.chunks[vi.chunks.length - 1]!), spellingKey(nameOf('viddhi')));
  assert.ok(!gapEligible(FX, vi, 'viddhi').includes(vi.chunks.length - 1));
});

test('builder: options — 3 per gap, one right, all verbatim chunks of the verse, no shared spelling / lexId, never completing another real pāda', () => {
  const ki = kathaIndex(REAL);
  const allLines = ki.all.map((p) => ({ key: p.key, line: spellingKey(p.chunks.join(' ')) }));
  let outside = 0;
  let total = 0;
  for (const info of ki.all) {
    const verseChunks = new Set((ki.byShloka.get(info.shlokaId) ?? []).flatMap((p) => p.keys));
    const anyChunk = new Set(ki.all.flatMap((p) => p.keys));
    for (let g = 0; g < info.chunks.length; g++) {
      for (const mode of ['battle', 'recital'] as const) {
        const entry = { level: 2, streak: 0, last: (g + info.chunks.length - 1) % info.chunks.length };
        const ch = build(info.shlokaId, info.pada, entry, 5 + g, mode, undefined, REAL);
        const sp = ch.smarana!;
        assert.deepEqual(sp.gaps, [g], `${info.key}: forced gap ${g}`);
        const opts = sp.gapOptions[0]!;
        assert.equal(opts.length, 3, `${info.key} gap ${g}: three options`);
        assert.equal(new Set(opts.map((o) => o.id)).size, 3, 'unique ids');
        assert.equal(sp.gapAnswers[0]!.length, 1, 'exactly one right option');
        const right = opts.find((o) => o.id === sp.gapAnswers[0]![0])!;
        assert.equal(right.sa, info.chunks[g], 'the right option is the printed chunk');
        assert.ok(opts.every((o) => o.sa && !o.en), 'Sanskrit options');
        for (const o of opts.filter((x) => x !== right)) {
          total++;
          const k = spellingKey(o.sa!);
          assert.ok(anyChunk.has(k), `${info.key}: "${o.sa}" is a printed chunk`);
          if (!verseChunks.has(k)) outside++;
          assert.notEqual(k, info.keys[g], 'not the answer’s spelling');
          const lexOf = ki.all.flatMap((p) => p.keys.map((kk, i) => [kk, p.lex[i] ?? []] as const)).filter(([kk]) => kk === k).flatMap(([, l]) => l);
          const wholeVsWhole = info.chunks.length === 1 && ki.all.some((p) => p.chunks.length === 1 && p.keys[0] === k);
          if (!wholeVsWhole) assert.ok(!lexOf.some((id) => (info.lex[g] ?? []).includes(id)), `${info.key}: "${o.sa}" shares a lexId with the answer`);
          if (info.chunks.length > 1) {
            const line = spellingKey(info.chunks.map((c, i) => (i === g ? o.sa! : c)).join(' '));
            assert.ok(!allLines.some((l) => l.key !== info.key && l.line === line), `${info.key}: "${o.sa}" would complete another real pāda`);
          }
        }
      }
    }
  }
  assert.ok(outside / total < 0.02, `distractors come from the same verse (${outside} of ${total} from elsewhere)`);
  // the audit's pair: keyūre / kuṇḍale (s-naham-janami pādas 0 and 1) never stand against each other
  const p0 = padaInfo(REAL, 's-naham-janami', 0)!;
  const p1 = padaInfo(REAL, 's-naham-janami', 1)!;
  assert.ok(completesOtherPada(REAL, p0, 2, p1.chunks[2]!));
  for (let seed = 1; seed <= 30; seed++) {
    for (const [info, other] of [[p0, p1], [p1, p0]] as const) {
      const sp = build(info.shlokaId, info.pada, { level: 1, streak: 0 }, seed, 'recital', undefined, REAL).smarana!;
      assert.ok(!sp.gapOptions[0]!.some((o) => spellingKey(o.sa!) === other.keys[2]), 'never the parallel line’s word');
    }
  }
});

test('builder: shrine recitals prefer chunks of pādas not yet shown; chips are shuffled with the seed; deterministic', () => {
  const ki = kathaIndex(REAL);
  let checked = 0;
  for (const sh of REAL.shlokas) {
    const info = padaInfo(REAL, sh.id, 0)!;
    if (info.chunks.length < 2) continue;
    const g = info.chunks.length - 1;
    const later = (ki.byShloka.get(sh.id) ?? []).filter((p) => p.pada > 0).flatMap((p) => p.chunks.map((c, i) => ({ c, k: p.keys[i]!, lex: p.lex[i] ?? [] })));
    const usable = later.filter((x) => x.k !== info.keys[g] && !x.lex.some((id) => (info.lex[g] ?? []).includes(id)) && !completesOtherPada(REAL, info, g, x.c));
    if (new Set(usable.map((x) => x.k)).size < 2) continue;
    const sp = build(sh.id, 0, { level: 1, streak: 0 }, 3, 'recital', undefined, REAL).smarana!;
    const laterKeys = new Set(usable.map((x) => x.k));
    for (const o of sp.gapOptions[0]!) if (o.id !== sp.gapAnswers[0]![0]) assert.ok(laterKeys.has(spellingKey(o.sa!)), `${sh.id}: "${o.sa}" is from a pāda not yet shown`);
    checked++;
  }
  assert.ok(checked >= 15, `${checked} verses checked`);
  const positions = new Set<number>();
  for (let seed = 1; seed <= 40; seed++) {
    const sp = build('s-anirvedah', 0, { level: 2, streak: 0 }, seed).smarana!;
    positions.add(Number(sp.gapAnswers[0]![0]!.slice(1)));
  }
  assert.equal(positions.size, 3, 'the right chip moves');
  assert.deepEqual(build('s-anirvedah', 0, { level: 2, streak: 0 }, 9), build('s-anirvedah', 0, { level: 2, streak: 0 }, 9), 'same state → same challenge');
});

test('builder: distractors prefer the answer’s syllable count (battle casts: chunks off the line with the same akṣara count first)', () => {
  const ki = kathaIndex(REAL);
  let checked = 0;
  for (const info of ki.all) {
    if (info.chunks.length < 2) continue;
    const g = info.chunks.length - 1;
    const same = (ki.byShloka.get(info.shlokaId) ?? [])
      .filter((p) => p.pada !== info.pada)
      .flatMap((p) => p.chunks.map((c, i) => ({ c, k: p.keys[i]!, ak: p.ak[i]!, lex: p.lex[i] ?? [] })))
      .filter((x) => x.ak === info.ak[g] && x.k !== info.keys[g] && !x.lex.some((id) => (info.lex[g] ?? []).includes(id)) && !completesOtherPada(REAL, info, g, x.c));
    if (new Set(same.map((x) => x.k)).size < 2) continue;
    const sp = build(info.shlokaId, info.pada, { level: 1, streak: 0 }, 4, 'battle', undefined, REAL).smarana!;
    for (const o of sp.gapOptions[0]!) assert.equal(splitAksharas(o.sa!).length, info.ak[g], `${info.key}: "${o.sa}" has the answer’s syllable count`);
    checked++;
  }
  assert.ok(checked >= 20, `${checked} pādas checked`);
});

test('builder: weights label each printed akṣara laghu / guru (chandas), aligned with the chunks', () => {
  let withW = 0;
  for (const info of kathaIndex(REAL).all) {
    const sp = build(info.shlokaId, info.pada, { level: 1, streak: 0 }, 1, 'recital', undefined, REAL).smarana!;
    if (!sp.weights) continue;
    withW++;
    assert.equal(sp.weights.length, info.chunks.reduce((n, c) => n + splitAksharas(c).length, 0), `${info.key}: one weight per printed akṣara`);
    assert.deepEqual(sp.weights.join(''), scanLine(info.chunks.join(' ')).map((x) => x.weight).join(''));
  }
  assert.ok(withW >= 80, `${withW} of 84 pādas carry weights`);
});

test('builder: chunks hold their pada-ccheda words in order (alignment), e.g. one sandhi chunk holds three words', () => {
  for (const sh of REAL.shlokas) {
    sh.padas.forEach((_t, p) => {
      const info = padaInfo(REAL, sh.id, p)!;
      assert.deepEqual(info.lex.flat(), sh.words.filter((w) => w.pada === p).map((w) => w.lexId), `${info.key}`);
      assert.ok(info.lex.every((l) => l.length >= 1), `${info.key}: every chunk holds a word`);
    });
  }
  const big = kathaIndex(REAL).all.find((p) => p.lex.some((l) => l.length >= 3));
  assert.ok(big, 'a chunk with three words exists');
  assert.deepEqual(alignWords(['ab', 'cd'], [{ form: 'a', lexId: 'x' }, { form: 'b', lexId: 'y' }, { form: 'cd', lexId: 'z' }]).map((l) => l.join()), ['x,y', 'z']);
});

test('bindings: katha.json entries (≥ 2 chunks) win, else the first ≥ 2-chunk pāda of the move’s verse; plain moves are unbound', () => {
  for (const f of FIX_ASTRAS) {
    const b = astraBinding(FX, f.moveId)!;
    if (padaInfo(FX, f.shlokaId, f.pada)!.chunks.length >= 2) assert.deepEqual(b, { shlokaId: f.shlokaId, pada: f.pada }, f.moveId);
    else {
      const first = kathaIndex(FX).byShloka.get(f.shlokaId)!.find((p) => p.chunks.length >= 2)!;
      assert.deepEqual(b, { shlokaId: f.shlokaId, pada: first.pada }, `${f.moveId}: a one-chunk binding falls back`);
    }
  }
  const noKatha: GameContent = { ...REAL, katha: { astras: [], verses: [] } };
  for (const id of BOUND) {
    const mv = idx.move.get(id)!;
    const b = astraBinding(noKatha, id)!;
    assert.equal(b.shlokaId, mv.unlockShloka);
    assert.equal(b.pada, kathaIndex(REAL).byShloka.get(mv.unlockShloka!)!.findIndex((p) => p.chunks.length >= 2));
    const real = astraBinding(REAL, id)!;
    assert.equal(real.shlokaId, mv.unlockShloka, `${id}: content/katha.json binds a pāda of the move’s own verse`);
    assert.ok(padaInfo(REAL, real.shlokaId, real.pada)!.chunks.length >= 2);
  }
  assert.equal(BOUND.length, 10, 'ten verse-bound moves');
  for (const mv of REAL.moves.filter((m) => !m.unlockShloka)) assert.equal(astraBinding(REAL, mv.id), null);
  assert.equal(gradeSmarana({ id: 'c', kind: 'artha', prompt: '', lexIds: [], explanation: '', timeLimitMs: 0 }, { picks: [] }), null, 'only smarana challenges grade picks');
});

// ───────────────────────── v0.4.1: fixes from the fresh-eyes playtest ─────────────────────────

const PLAIN_RAMA = ['bana', 'agneyastra', 'varunastra', 'vayavyastra'];
const toastsOf = (s: GameState): { text: string; textSa?: string }[] => s.fx.flatMap((f) => (f.kind === 'toast' ? [f] : []));
const swapSa = (key: string, allyId: string, moveId: string, old: string): string | undefined => uiSa(REAL, key, { who: uiAllySlot(allyId, 'nom', `{n:ally.${allyId}}`, REAL), move: uiMoveSlot(moveId), old: uiMoveSlot(old) });

test('astras reach the bosses: a restored verse’s astra replaces the weakest plain move in Kathā (a toast names it, English + Sanskrit); the practice game only fills a free slot', () => {
  const id = 's-ramo-vigrahavan';
  const recite = (style: 'katha' | 'abhyasa'): GameState => {
    let s = reduce(atShrine(kState([member('player', 10, ['pada_bana']), member('rama', 10, PLAIN_RAMA)], { heard: [id], style })), REAL, { type: 'recite', shlokaId: id });
    for (let step = 0; step < 12 && s.pending?.kind === 'challenge'; step++) {
      const p = s.pending;
      s = reduce(s, REAL, p.challenge.smarana ? answer(rightPicks(sm(s))) : p.challenge.answers ? { type: 'answer', option: p.challenge.answers[0]!, timeMs: 500 } : { type: 'answer', order: [...p.challenge.orders![0]!], timeMs: 500 });
      if (s.pending?.kind === 'feedback') s = reduce(s, REAL, { type: 'advance' });
    }
    assert.equal(s.save.shlokas[id]!.restored, true, `${style}: restored`);
    return s;
  };
  const k = recite('katha');
  const rama = k.save.party.find((m) => m.id === 'rama')!;
  assert.deepEqual(rama.moves, ['dharma_vigraha', 'agneyastra', 'varunastra', 'vayavyastra'], 'the weakest plain move (bāṇa) gives its slot');
  assert.equal(rama.pp['dharma_vigraha'], idx.move.get('dharma_vigraha')!.pp);
  const t = toastsOf(k).find((x) => /in place of/.test(x.text))!;
  assert.equal(t.text, 'New move for {n:ally.rama}: {n:move.dharma_vigraha}, in place of {n:move.bana}');
  assert.ok(t.textSa && t.textSa === swapSa('recital.newMoveSwap', 'rama', 'dharma_vigraha', 'bana'), `Sanskrit toast: ${t.textSa}`);
  const p = recite('abhyasa');
  assert.deepEqual(p.save.party.find((m) => m.id === 'rama')!.moves, PLAIN_RAMA, 'practice game: four moves stay');
  assert.ok(toastsOf(p).some((x) => /\(equip it from the Party menu\)/.test(x.text)));
});

test('astraSlot: a free slot first; else the least useful plain move (status, then lowest power, then the earliest); never an astra; never the last damaging move for a status astra', () => {
  assert.equal(astraSlot(['pada_bana'], 'shoka_shloka', REAL), 1, 'a free slot');
  assert.equal(astraSlot(['pada_bana', 'shoka_shloka'], 'shoka_shloka', REAL), null, 'already equipped');
  assert.equal(astraSlot(['pada_bana', 'lipi_raksha', 'shoka_shloka', 'suprabhata'], 'shuddha_vak', REAL), 1, 'a status plain move first');
  assert.equal(astraSlot(PLAIN_RAMA, 'dharma_vigraha', REAL), 0, 'the lowest power');
  assert.equal(astraSlot(['agneyastra', 'varunastra', 'vayavyastra', 'dharma_vigraha'], 'abhaya', REAL), 0, 'a tie: the earliest slot');
  assert.equal(astraSlot(['dharma_vigraha', 'abhaya', 'aditya_hrdaya', 'brahmastra'], 'shoka_shloka', REAL), null, 'never another astra');
  assert.equal(astraSlot(['pada_bana', 'suprabhata', 'shuddha_vak', 'abhaya'], 'jaya_ghosha', REAL), null, 'a status astra never takes the only damaging move');
  assert.equal(astraSlot(['pada_bana', 'suprabhata', 'shuddha_vak', 'abhaya'], 'brahmastra', REAL), 0, 'a damaging astra may');
  const full = armMember(member('player', 20, ['pada_bana', 'lipi_raksha', 'shoka_shloka', 'suprabhata'], REAL), { shlokas: { 's-vyakaranam': { heard: true, restored: true, best: 1 } } }, REAL);
  assert.deepEqual(full.member.moves, ['pada_bana', 'shuddha_vak', 'shoka_shloka', 'suprabhata']);
  assert.deepEqual(full.armed, [{ allyId: 'player', moveId: 'shuddha_vak', replaced: 'lipi_raksha' }]);
});

test('astras: a v0.4.0 Kathā save is armed once on load (toast), Settings → Kathā arms, a joining hero is armed; the practice game is untouched', () => {
  const restored = ['s-ramo-vigrahavan'];
  const old = kState([member('player', 12, ['pada_bana']), member('rama', 12, PLAIN_RAMA)], { restored });
  assert.equal(old.save.flags[ARMED_FLAG], undefined, 'a v0.4.0 save');
  const l = loadGame(toSave(old), 1, 3, REAL)!;
  assert.deepEqual(l.save.party[1]!.moves, ['dharma_vigraha', 'agneyastra', 'varunastra', 'vayavyastra']);
  assert.equal(l.save.flags[ARMED_FLAG], true);
  const t = toastsOf(l).find((x) => /in place of/.test(x.text))!;
  assert.equal(t.text, '{n:ally.rama} now uses {n:move.dharma_vigraha} in place of {n:move.bana}');
  assert.equal(t.textSa, swapSa('toast.astraArmed', 'rama', 'dharma_vigraha', 'bana'));
  // armed once: a later choice in the move editor is kept
  const chosen = { ...l, save: { ...l.save, party: [l.save.party[0]!, { ...l.save.party[1]!, moves: PLAIN_RAMA }] } };
  assert.deepEqual(loadGame(toSave(chosen), 1, 3, REAL)!.save.party[1]!.moves, PLAIN_RAMA);
  // the practice game: no arming, no flag
  const prac = kState([member('player', 12, ['pada_bana']), member('rama', 12, PLAIN_RAMA)], { restored, style: 'abhyasa' });
  const lp = loadGame(toSave(prac), 1, 3, REAL)!;
  assert.deepEqual(lp.save.party[1]!.moves, PLAIN_RAMA);
  assert.equal(lp.save.flags[ARMED_FLAG], undefined);
  assert.deepEqual(lp.fx, []);
  // Settings → Kathā arms (toasts); back to the practice game keeps the moves and drops the flags
  const k = reduce(prac, REAL, { type: 'set-style', style: 'katha' });
  assert.deepEqual(k.save.party[1]!.moves, ['dharma_vigraha', 'agneyastra', 'varunastra', 'vayavyastra']);
  assert.ok(toastsOf(k).some((x) => /in place of/.test(x.text)));
  const a = reduce(k, REAL, { type: 'set-style', style: 'abhyasa' });
  assert.equal(a.save.flags[ARMED_FLAG], undefined);
  assert.deepEqual(a.save.party[1]!.moves, k.save.party[1]!.moves);
  // a new Kathā journey is born armed (its loads never re-arm)
  assert.equal(newGame(1, 3, REAL, { name: 'N', avatar: 'a', style: 'katha' }).save.flags[ARMED_FLAG], true);
  assert.equal(newGame(1, 3, REAL, { name: 'N', avatar: 'a' }).save.flags[ARMED_FLAG], undefined);
  // {join}: the newcomer's unlocked astras are equipped (four level moves at level 12)
  const join = (style: 'katha' | 'abhyasa'): string[] => startScript(kState([member('player', 12, ['pada_bana'])], { restored, style }), REAL, 't', [{ join: 'rama', level: 12 }, { say: 'x' }]).save.party.find((m) => m.id === 'rama')!.moves;
  assert.deepEqual(join('katha'), ['dharma_vigraha', 'agneyastra', 'varunastra', 'vayavyastra']);
  assert.deepEqual(join('abhyasa'), PLAIN_RAMA);
});

test('recite the whole verse: an astra rotates through every eligible pāda of its verse (binding first, then the least practised)', () => {
  for (const mv of REAL.moves.filter((m) => m.unlockShloka)) {
    const refs = astraPadas(REAL, mv.id);
    const bind = astraBinding(REAL, mv.id)!;
    assert.deepEqual(refs[0], bind, `${mv.id}: the binding first`);
    const verse = kathaIndex(REAL).byShloka.get(bind.shlokaId)!;
    const want = verse.filter((p) => p.chunks.length >= 2 && gapEligible(REAL, p, mv.id).length > 0).map((p) => p.pada);
    assert.deepEqual(refs.map((r) => r.pada).sort(), want.sort(), `${mv.id}: every pāda of ≥ 2 chunks with a gap that is not the name`);
    assert.ok(refs.length >= 2, `${mv.id}: more than one pāda to recite`);
    // play casts (a perfect reciter): every eligible pāda comes round, and none runs ahead of the others by more than a level
    let s = kState([member(allyForMove(mv.id, REAL)!, 20, [mv.id], REAL)], { restored: [bind.shlokaId] });
    const seen: number[] = [];
    for (let cast = 0; cast < refs.length * 4; cast++) {
      const ref = astraPada(s, REAL, mv.id)!;
      seen.push(ref.pada);
      const r = buildSmarana(s, REAL, { shlokaId: ref.shlokaId, pada: ref.pada, mode: 'battle', moveId: mv.id });
      s = recordSmarana(r.state, r.challenge.smarana!, true, false);
    }
    assert.equal(seen[0], bind.pada, `${mv.id}: the first cast is the binding’s pāda`);
    assert.deepEqual([...new Set(seen)].sort(), want.sort(), `${mv.id}: all recited (${seen.join(',')})`);
    const levels = refs.map((r) => smrtiOf(s.save, padaKey(r.shlokaId, r.pada)).level);
    assert.ok(Math.max(...levels) - Math.min(...levels) <= 1, `${mv.id}: even practice ${levels}`);
  }
  // in battle: the cast after the binding goes to another pāda
  const s = astraFight('viddhi', { smrti: 0 });
  const first = sm(pick(s, 'viddhi'));
  const b = astraBinding(FX, 'viddhi')!;
  assert.deepEqual([first.shlokaId, first.pada], [b.shlokaId, b.pada]);
  const after = { ...s, save: { ...s.save, smrti: { ...s.save.smrti, [padaKey(b.shlokaId, b.pada)]: { level: 0, streak: 1 } } } };
  assert.notEqual(sm(pick(after, 'viddhi')).pada, b.pada, 'the least-practised pāda next');
});

test('check the lead: in Kathā the hero with the most equipped bound astras steps forward (ties keep the usual order; an explicit spec.lead wins); the practice game keeps leadIndex', () => {
  const P = (id: string, moves: string[], hp?: number): PartyMember => ({ ...member(id, 20, moves, REAL), ...(hp !== undefined ? { hp } : {}) });
  const boss = spec([['ravana', 30]], 'boss');
  const duel = spec([['bharadvaja_duel', 12]], 'duel');
  const lead = (party: PartyMember[], sp: BattleSpec, style: 'katha' | 'abhyasa' = 'katha'): string => startBattle(kState(party, { style }), REAL, sp).battle!.ally.id;
  const party = [P('player', ['pada_bana', 'shoka_shloka']), P('hanuman', ['vayu_vega', 'gada', 'jaya_ghosha']), P('rama', ['dharma_vigraha', 'aditya_hrdaya', 'brahmastra', 'agneyastra']), P('lakshmana', ['bana', 'viddhi'])];
  assert.deepEqual(party.map((m) => boundAstras(m, REAL)), [1, 1, 3, 1]);
  assert.equal(lead(party, boss), 'rama', 'the most astras (3)');
  assert.equal(lead(party, duel), 'rama', 'in a duel too');
  assert.equal(lead(party, boss, 'abhyasa'), 'hanuman', 'practice: the first hero in party order');
  assert.equal(lead(party, duel, 'abhyasa'), 'player', 'practice: the reciter answers a duel');
  // ties keep the usual order: heroes in party order (the reciter last); in a duel the reciter first
  const tie = [P('player', ['shoka_shloka']), P('hanuman', ['jaya_ghosha']), P('lakshmana', ['viddhi'])];
  assert.equal(lead(tie, boss), 'hanuman');
  assert.equal(lead(tie, duel), 'player');
  // no astras anywhere: exactly the usual lead
  const none = [P('player', ['pada_bana']), P('rama', ['bana']), P('lakshmana', ['bana'])];
  for (const sp of [boss, duel]) assert.equal(kathaLead(none, sp, REAL), leadIndex(none, sp));
  // an exhausted hero never leads; an explicit lead wins when conscious
  assert.equal(lead(party.map((m) => (m.id === 'rama' ? { ...m, hp: 0 } : m)), boss), 'hanuman');
  assert.equal(lead(party, { ...boss, lead: 'lakshmana' }), 'lakshmana');
  assert.equal(lead(party.map((m) => (m.id === 'lakshmana' ? { ...m, hp: 0 } : m)), { ...boss, lead: 'lakshmana' }), 'rama');
  assert.equal(kathaLead(party.map((m) => ({ ...m, hp: 0 })), boss, REAL), undefined, 'nobody conscious');
});

test('shorter story fights: Kathā foe HP = clamp(turns / foes × the hit kept up while rotating astras (a duel: the best hit), floor, ordinary); the practice game keeps the ordinary HP; spec.lead (Kathā only)', () => {
  const party = [member('player', 20, ['pada_bana', 'shoka_shloka'], REAL), member('lakshmana', 20, ['bana', 'khadga', 'viddhi'], REAL), member('rama', 20, ['dharma_vigraha', 'agneyastra'], REAL)];
  for (const kind of ['wild', 'boss', 'duel'] as const) {
    for (const foes of [[['tataka', 6]], [['ravana', 30]], [['subahu', 7], ['maricha', 7]], [['bharadvaja_duel', 3]], [['kumbhakarna', 26]]] as [string, number][][]) {
      const sp = spec(foes, kind);
      const k = startBattle(kState(party, { restored: ['s-ramo-vigrahavan'] }), REAL, sp).battle!;
      const p = startBattle(kState(party, { restored: ['s-ramo-vigrahavan'], style: 'abhyasa' }), REAL, sp).battle!;
      const ord = fighterFromEnemy(foes[0]![0], foes[0]![1], REAL);
      assert.equal(p.foe.maxHp, ord.maxHp, 'practice: ordinary HP');
      assert.equal(p.foe.hp, ord.hp);
      // v0.5a: wild and boss fights scale to rotationHit (astra fatigue makes the best hit alone unsustainable)
      const want = Math.round((KATHA_TURNS[kind] / foes.length) * (kind === 'duel' ? bestHit(k.ally, ord, REAL, false) : rotationHit(k.ally, ord, REAL, true)));
      assert.equal(k.foe.maxHp, Math.min(ord.maxHp, Math.max(Math.ceil(ord.maxHp * KATHA_HP_FLOOR), want)), `${kind} ${foes.map((f) => f[0])}`);
      assert.equal(k.foe.hp, k.foe.maxHp, 'a fresh foe at full (scaled) HP');
      assert.deepEqual({ ...k.foe, hp: 0, maxHp: 0, atk: 0 }, { ...ord, hp: 0, maxHp: 0, atk: 0 }, 'every other stat unchanged');
      // the attack is only ever lowered, so the strongest ordinary hit on the lead is ≤ a quarter of its max HP
      assert.ok(k.foe.atk <= ord.atk);
      assert.equal(k.foe.atk, kathaFoeAtk(ord, k.ally, REAL).atk);
      const worst = Math.max(0, ...k.foe.moves.map((id) => idx.move.get(id)!).filter((mv) => mv.power > 0).map((mv) => damage(k.foe, k.ally, mv, 1, 1).amount));
      assert.ok(k.foe.atk === ord.atk || worst <= Math.ceil(k.ally.maxHp * KATHA_FOE_HIT) + 1, `${foes.map((f) => f[0])}: worst hit ${worst} on ${k.ally.maxHp} HP`);
    }
  }
  assert.equal(kathaFoe(fighterFromEnemy('ravana', 30, REAL), fighterFromMember(member('player', 5, ['lipi_raksha'], REAL), REAL), spec([['ravana', 30]], 'boss'), REAL).maxHp, fighterFromEnemy('ravana', 30, REAL).maxHp, 'no damaging move: ordinary HP');
  // spec.lead: Kathā lets the named hero step forward (when conscious); the practice game and duels ignore it
  const led = { ...spec([['ravana', 30]], 'boss'), lead: 'rama' };
  assert.equal(startBattle(kState(party), REAL, led).battle!.ally.id, 'rama');
  assert.equal(startBattle(kState(party, { style: 'abhyasa' }), REAL, led).battle!.ally.id, 'lakshmana');
  const down = party.map((m) => (m.id === 'rama' ? { ...m, hp: 0 } : m));
  assert.equal(startBattle(kState(down), REAL, led).battle!.ally.id, 'lakshmana', 'an exhausted lead: the usual order');
  assert.equal(startBattle(kState(party), REAL, { ...spec([['bharadvaja_duel', 3]], 'duel'), lead: 'rama' }).battle!.ally.id, 'rama', 'an explicit lead wins in a duel too');
  for (const e of REAL.events) {
    const walk = (cmds: unknown[]): void => {
      for (const c of cmds as Record<string, unknown>[]) {
        const b = c['battle'] as BattleSpec | undefined;
        if (b?.lead) assert.ok(idx.ally.has(b.lead), `${e.id}: battle lead "${b.lead}" is an ally id`);
        for (const k2 of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose']) if (Array.isArray(c[k2])) walk(c[k2] as unknown[]);
      }
    };
    walk(e.cmds);
  }
});

// ───────────────────────── simulation ─────────────────────────

/**
 * v0.5a bots (logic-sim `policy`): the strategic player (the fitting astra, answers every warned blow, rotates astras),
 * the spammer (the most damaging move every turn), and the existing 70 %-accurate and careless 70 % reciters (the battle
 * agent's move choice; careless: a random plain move half the time).
 */
const KATHA_BOTS = [
  { name: 'strategic', accuracy: 1, policy: 'strategic' as const },
  { name: 'spammer', accuracy: 1, policy: 'spam' as const },
  { name: '70 % reciter', accuracy: 0.7 },
  { name: 'careless 70 % reciter', accuracy: 0.7, careless: 0.5 },
];

test('story bots play Kathā to the ending for every seed × level — strategic, spammer, 70 % and careless reciters: no lost fight, no grinding; the strategic player is the fastest (story fights ≤ 10 turns, bosses ≤ 15) and the spammer takes ≥ 30 % more turns on bosses; the lead holds the most astras', (t) => {
  const seeds = Math.max(1, Math.min(25, Number(process.env['RY_BOT_SEEDS'] ?? 25) || 25));
  const failures: string[] = [];
  const bossMean: Record<string, number> = {};
  for (const bot of KATHA_BOTS) {
    const { accuracy } = bot;
    const careless = bot.careless ?? 0;
    const stats = { runs: 0, battles: 0, recitations: 0, gapped: 0, misses: 0, retries: 0, actions: 0 };
    const turns = new Map<string, number[]>();
    for (const { level, seed } of testMatrix(LEVELS, seeds)) {
      let bad = '';
      const r = runWalkthrough(REAL, seed, level, {
        style: 'katha',
        accuracy,
        ...(careless ? { careless } : {}),
        ...(bot.policy ? { policy: bot.policy } : {}),
        attempts: 12,
        onAction: (b, _a, n) => {
          if (b.mode !== 'battle' && n.mode === 'battle' && n.battle && !bad) {
            // check the lead: the hero who steps forward holds the most equipped bound astras among the conscious party
            const most = Math.max(...n.save.party.filter((m) => m.hp > 0).map((m) => boundAstras(m, REAL)));
            const ally = n.save.party[n.battle.active]!;
            if (!n.battle.spec.lead && boundAstras(ally, REAL) !== most) bad = `lead ${ally.id} has ${boundAstras(ally, REAL)} astras, another hero ${most}`;
          }
          if (b.mode === 'battle' && n.mode !== 'battle' && b.battle) {
            const key = `${b.battle.spec.kind} ${b.battle.spec.enemies.map((e) => e.id).join('+')}`;
            turns.set(key, [...(turns.get(key) ?? []), b.battle.turn]);
          }
          if (bad || n.mode !== 'battle' || !n.battle) return;
          for (const beat of n.battle.beats) {
            if (beat.fx?.kind === 'swift' || /swift|The words falter/.test(beat.text)) bad = `practice beat in Kathā: ${beat.text}`;
            if (/falters/.test(beat.text) && beat.textSa && spellingKey(beat.textSa).includes(ANSWER_WORD.slice(0, -2))) bad = `"answer" wording in Kathā: ${beat.textSa}`;
          }
          if (n.pending?.kind === 'challenge' && n.pending.context === 'battle' && n.pending.challenge.kind !== 'smarana' && n.pending.challenge.kind !== 'antya') bad = `a classic challenge in a Kathā battle (${n.pending.challenge.kind})`;
          if (n.pending?.kind === 'feedback') bad = 'a feedback panel in a Kathā battle';
          if (n.battle.spec.kind === 'duel' && (n.battle.phase === 'command' || n.battle.phase === 'pick-move') && Object.values(n.save.shlokas).some((x) => x.heard)) bad = 'a move menu in a Kathā duel';
          if (b.mode === 'explore' && n.battle.spec.kind === 'wild' && !b.script) bad = 'a random encounter in Kathā';
        },
      });
      stats.runs++;
      stats.battles += r.battles;
      stats.recitations += r.recitations;
      stats.gapped += r.gapped;
      stats.misses += r.misses;
      stats.retries += r.retries;
      stats.actions += r.actions;
      const tag = `${bot.name} seed ${seed} level ${level}`;
      if (r.error) failures.push(`${tag}: ${r.error}`);
      else if (r.state.mode !== 'ended' || !r.state.save.flags['ch6.complete']) failures.push(`${tag}: did not reach the ending`);
      else if (r.losses > 0 || r.defeats > 0) failures.push(`${tag}: lost ${r.losses} fight(s), ${r.defeats} defeat(s)`);
      else if (bad) failures.push(`${tag}: ${bad}`);
      if (failures.length >= 3) break;
    }
    const n = Math.max(1, stats.runs);
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    const bosses = [...turns].filter(([k]) => k.startsWith('boss'));
    bossMean[bot.name] = mean(bosses.map(([, v]) => mean(v)));
    t.diagnostic(`Kathā bot ${bot.name}: ${stats.runs} runs · per playthrough ${(stats.battles / n).toFixed(1)} battles, ${(stats.recitations / n).toFixed(1)} recitations (${(stats.gapped / n).toFixed(1)} with a gap to fill, ${(stats.misses / n).toFixed(1)} missed), ${(stats.retries / n).toFixed(2)} step retries, ${Math.round(stats.actions / n)} actions · boss fight ${bossMean[bot.name]!.toFixed(2)} turns on average`);
    t.diagnostic(`  turns per fight (mean): ${[...turns].map(([k, v]) => `${k} ${mean(v).toFixed(1)}`).join(' · ')}`);
    // the strategic player's fights stay short; the other bots are held to 0 losses (a spammer's fights run long on purpose)
    if (bot.policy === 'strategic') for (const [k, v] of turns) assert.ok(mean(v) <= (k.startsWith('boss') ? 15 : 10), `${bot.name}: ${k}: ${mean(v).toFixed(1)} turns on average (bosses ≤ 15, other story fights ≤ 10)`);
    if (accuracy === 1) assert.equal(stats.misses, 0);
    else assert.ok(stats.misses > 0, 'the 70 % reciter does miss');
  }
  assert.deepEqual(failures, []);
  // v0.5a: strategy pays — the strategic player is the fastest, the spammer clearly slower on bosses (≥ 30 % more turns)
  const strat = bossMean['strategic'] as number;
  for (const [name, m] of Object.entries(bossMean)) if (name !== 'strategic') assert.ok(m > strat, `the strategic player is the fastest on bosses (${strat.toFixed(2)} turns; ${name} ${m.toFixed(2)})`);
  if (seeds >= 10) assert.ok((bossMean['spammer'] as number) >= 1.3 * strat, `the spammer takes ≥ 30 % more turns on bosses (${(bossMean['spammer'] as number).toFixed(2)} vs ${strat.toFixed(2)})`);
});

const DIRS = ['up', 'down', 'left', 'right'] as const;
function kathaAction(rng: ReturnType<typeof createRng>, s: GameState): Action {
  const p = s.pending;
  const r = rng.next();
  if (r < 0.03) return { type: 'set-style', style: rng.chance(0.7) ? 'katha' : 'abhyasa' };
  if (p?.kind === 'challenge' && p.challenge.smarana) {
    const sp = p.challenge.smarana;
    const opts = sp.gapOptions[0] ?? [];
    const k = rng.int(6);
    if (k === 0) return { type: 'answer', auto: true, timeMs: 10 };
    if (k === 1) return { type: 'answer', picks: ['zz', 'yy'], timeMs: 10 };
    if (k === 2) return { type: 'answer', option: 'o0', timeMs: 10 };
    return { type: 'answer', picks: sp.gaps.length ? [opts[rng.int(Math.max(1, opts.length))]?.id ?? 'o0'] : [], timeMs: rng.int(5000) };
  }
  if (p?.kind === 'challenge') {
    const ch = p.challenge;
    if (ch.orders && ch.tiles) return { type: 'answer', order: rng.chance(0.6) ? [...ch.orders[0]!] : rng.shuffle(ch.tiles.map((_x, i) => i)), timeMs: 300 };
    const opts = ch.options ?? [];
    return { type: 'answer', option: opts[rng.int(Math.max(1, opts.length))]?.id ?? 'o0', timeMs: 300 };
  }
  if (s.mode === 'explore') return r < 0.75 ? { type: 'step', dir: rng.pick(DIRS) } : r < 0.9 ? { type: 'interact' } : { type: 'face', dir: rng.pick(DIRS) };
  if (p?.kind === 'choice') return { type: 'choose', index: rng.int(p.options.length) };
  if (p?.kind === 'shrine') return r < 0.5 ? { type: 'choose', index: rng.int(6) - 1 } : { type: 'recite', shlokaId: rng.pick([...Object.keys(s.save.shlokas), 's-ma-nishada']) };
  if (s.mode === 'battle') return r < 0.55 ? { type: 'advance' } : { type: 'choose', index: rng.int(6) - 1 };
  return r < 0.85 ? { type: 'advance' } : { type: 'choose', index: rng.int(4) - 1 };
}

function checkState(s: GameState, where: string): void {
  assert.ok(['explore', 'script', 'battle', 'ended'].includes(s.mode), `${where}: mode`);
  if (s.mode === 'script') assert.ok(s.pending !== null && s.script !== null, `${where}: script waits on a pending`);
  if (s.mode === 'battle') assert.ok(s.battle !== null, `${where}: battle`);
  if (s.mode === 'explore') assert.equal(s.pending, null, `${where}: explore has no pending`);
  const p = s.pending;
  if (p?.kind === 'challenge' && p.challenge.smarana) {
    const sp = p.challenge.smarana;
    assert.ok(sp.gaps.length <= 1, `${where}: ≤ 1 gap`);
    for (let g = 0; g < sp.gaps.length; g++) assert.equal(sp.gapOptions[g]!.length, 3, `${where}: 3 options`);
  }
  if (s.battle?.phase === 'feedback') assert.ok(!isKatha(s) || s.pending?.kind === 'feedback', `${where}: feedback phase`);
  assert.equal(!!s.save.flags[KATHA_FLAG], s.save.style === 'katha', `${where}: the flag follows the style`);
  for (const m of s.save.party) assert.ok(m.hp >= 0 && Number.isFinite(m.hp) && m.level >= 1, `${where}: party member`);
  assert.ok(Object.values(s.save.smrti ?? {}).every((e) => e.level >= 0 && e.level <= MASTERED && e.streak >= 0), `${where}: smṛti`);
}

function fuzzKatha(seeds: { level: Level; seed: number }[], actions: number, from: (seed: number, level: Level) => GameState): void {
  for (const { level, seed } of seeds) {
    const rng = createRng(seed ^ 0xca7a);
    let s = from(seed, level);
    for (let i = 0; i < actions; i++) {
      const a = kathaAction(rng, s);
      const where = `seed ${seed} level ${level} action ${i} ${JSON.stringify(a)}`;
      let next: GameState;
      try {
        next = reduce(s, REAL, a);
      } catch (e) {
        throw new Error(`${where} threw in mode=${s.mode} pending=${s.pending?.kind} battle=${s.battle?.phase}: ${(e as Error).stack}`);
      }
      checkState(next, where);
      s = next;
      if (s.mode === 'ended') break;
    }
  }
}

test('fuzz: reduce never throws in Kathā (random actions incl. bad / automatic recitations and style switches; 25 seeds × levels)', () => {
  fuzzKatha(testMatrix(LEVELS), 400, (seed, level) => newGame(seed, level, REAL, { name: 'F', avatar: seed % 2 ? 'a' : 'b', style: 'katha' }));
});

test('fuzz: from deep Kathā states (after every walkthrough step of a 70 % reciter)', () => {
  for (const level of LEVELS) {
    const snaps: GameState[] = [];
    runWalkthrough(REAL, 300 + level, level, { style: 'katha', accuracy: 0.7, attempts: 3, onStep: (_i, s) => snaps.push(s) });
    assert.ok(snaps.length > 20);
    fuzzKatha(testMatrix([level], 12), 200, (seed) => snaps[seed % snaps.length]!);
  }
});
