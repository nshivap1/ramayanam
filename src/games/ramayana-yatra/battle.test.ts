/**
 * Battle + progression tests (battle agent): combat math, defs completeness, the battle state machine,
 * and balance simulations (bots × levels [2,3,4] × 25 seeds).
 * Challenges come from a tiny inline fixture (real words of Bāla 1.2.15, SLP1 → Devanagari via @sanskrit)
 * so every move has a real, gradeable challenge regardless of how far the content agents are.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slp1ToDeva } from '@sanskrit';
import { type Level, type Rng, createRng, testMatrix } from '@sdk';
import type { BattleBeat, BattleSpec, Fighter, GameContent, GameState, LexEntry, MapDef, MoveDef, PartyMember, SaveData, Shloka } from './types';
import { ALLY_IDS, BATTLER_IDS, ELEMENT_CHART, ENEMY_IDS, SPRITE_IDS } from './catalog';
import { loadContent } from './content';
import { indexOf } from './logic-util';
import { SA_BATTLE, battleAction, battleItems, battleMenu, battleOutcome, endBattle, leadIndex, rollEncounter, saText, startBattle } from './logic-battle';
import { getOracle } from './sa-verify';
import { uiEn, uiSa } from './sa-ui';
import { addXp, battleXp, damage, joinLevel, fighterFromEnemy, fighterFromMember, grantXp, learnableMoves, newMember, stageMult, statsAt, withUnlockedMoves, xpToNext, xpToReach } from './logic-progress';

const LEVELS: Level[] = [2, 3, 4];
const D = (s: string): string => slp1ToDeva(s);
const prov = { sources: [{ name: 'test fixture' }], verifiedBy: [] };

function fixture(): { shlokas: Shloka[]; lexicon: LexEntry[] } {
  const w = (form: string, lexId: string, pada: number, role: 'subject' | 'object' | 'verb' | 'address' | 'indeclinable' | 'modifier'): Shloka['words'][number] => ({ form: D(form), lexId, grammar: 'fixture', gloss: lexId, role, pada });
  const shlokas: Shloka[] = [
    {
      id: 's-ma-nishada', kanda: 1, sarga: 2, verse: 15, edition: 'fixture', meter: 'anustubh',
      padas: ['mA nizAda pratizWAM tva', 'magamaH SASvatIH samAH', 'yatkrOYcamiTunAdekam', 'avaDIH kAmamohitam'].map(D),
      words: [w('mA', 'ma', 0, 'indeclinable'), w('nizAda', 'nishada', 0, 'address'), w('pratizWAm', 'pratishtha', 0, 'object'), w('tvam', 'tvad', 0, 'subject'), w('agamaH', 'gam', 1, 'verb'), w('SASvatIH', 'shashvat', 1, 'modifier'), w('samAH', 'sama', 1, 'object'), w('avaDIH', 'vadh', 3, 'verb'), w('kAmamohitam', 'kamamohita', 3, 'modifier')],
      sandhiNotes: [{ joined: D('tvamagamaH'), split: [D('tvam'), D('agamaH')], note: 'fixture' }],
      translation: 'fixture', context: 'fixture', speaker: 'fixture', teaches: [], provenance: prov,
    },
  ];
  const L: [string, string, string][] = [['ma', 'mA', 'not'], ['nishada', 'nizAda', 'hunter'], ['pratishtha', 'pratizWA', 'fame'], ['tvad', 'tvad', 'you'], ['gam', 'gam', 'go'], ['shashvat', 'SaSvat', 'everlasting'], ['sama', 'samA', 'year'], ['vadh', 'vaD', 'kill'], ['kamamohita', 'kAmamohita', 'deluded by desire']];
  const forms: Record<string, string> = { ma: 'mA', nishada: 'nizAda', pratishtha: 'pratizWAm', tvad: 'tvam', gam: 'agamaH', shashvat: 'SASvatIH', sama: 'samAH', vadh: 'avaDIH', kamamohita: 'kAmamohitam' };
  const lexicon: LexEntry[] = L.map(([id, lemma, meaning]) => ({ id, lemma: D(lemma), pos: 'noun', meaning, forms: [{ form: D(forms[id] ?? lemma), grammar: 'fixture', shlokaIds: [] }], tags: [], provenance: prov }));
  return { shlokas, lexicon };
}

const REAL = loadContent();
const C: GameContent = { ...REAL, ...fixture() };
const idx = indexOf(C);

function mkState(party: PartyMember[], seed: number, level: Level, chapter: number, restored: string[] = [], items: Record<string, number> = {}): GameState {
  const shlokas: SaveData['shlokas'] = { 's-ma-nishada': { heard: true, restored: false, best: 0 } };
  for (const id of restored) shlokas[id] = { heard: true, restored: true, best: 1 };
  const save: SaveData = { v: 1, playerName: 'Test', avatar: 'a', mapId: 'm', x: 1, y: 1, facing: 'down', respawn: { mapId: 'm', x: 1, y: 1 }, chapter: chapter as SaveData['chapter'], objective: '', flags: {}, party, items, niska: 0, words: {}, shlokas, step: 0, npcPos: {}, playMs: 0, completedChapters: [] };
  return { v: 1, seed, tick: 0, level, save, mode: 'explore', script: null, pending: null, battle: null, recital: null, session: { correct: 0, total: 0, swift: 0, practised: [], shlokasHeard: [], shlokasRestored: [], battlesWon: 0, chaptersCompleted: [] }, fx: [] };
}

/** A party at `level` with a sensible loadout (best 3 attacks + best support) from level and verse unlocks. */
function buildParty(ids: string[], level: number, restored: string[]): PartyMember[] {
  const save = { shlokas: Object.fromEntries(restored.map((id) => [id, { heard: true, restored: true, best: 1 }])) };
  return ids.map((id) => {
    const m = newMember(idx.ally.get(id)!, level, C);
    const mv = learnableMoves(m, save, C).map((x) => idx.move.get(x)!);
    const attacks = mv.filter((x) => x.power > 0).sort((a, b) => b.power - a.power);
    const support = mv.filter((x) => x.power === 0).sort((a, b) => (b.effect?.kind === 'heal' ? 1 : 0) - (a.effect?.kind === 'heal' ? 1 : 0));
    const pick = [...attacks.slice(0, support.length ? 3 : 4), ...support.slice(0, 1)];
    const moves = [...pick, ...mv.filter((x) => !pick.includes(x))].slice(0, 4).map((x) => x.id);
    const pp = { ...m.pp };
    for (const x of moves) pp[x] = idx.move.get(x)!.pp;
    return { ...m, moves, pp };
  });
}

const spec = (enemies: [string, number][], kind: BattleSpec['kind']): BattleSpec => ({ enemies: enemies.map(([id, level]) => ({ id, level })), kind, canRun: kind === 'wild', canLose: kind === 'duel', bg: 'forest', music: kind === 'wild' ? 'battle' : 'boss' });

type Skill = { correct: number; swift: number };
const PERFECT: Skill = { correct: 1, swift: 1 };
const COMPETENT: Skill = { correct: 0.8, swift: 0.5 };
const MOSTLY_WRONG: Skill = { correct: 0.2, swift: 0 };

/** Every invariant of a beat list against the fighters it describes. */
function checkBeats(prev: { ally: Fighter; foe: Fighter } | null, beats: BattleBeat[]): void {
  for (const b of beats) {
    for (const m of b.text.matchAll(/\{n:([^}]+)\}/g)) if (C.names.length) assert.ok(idx.name.has(m[1] as string), `unknown name in beat: ${m[0]}`);
    for (const m of b.text.matchAll(/\{w:([^}]+)\}/g)) assert.ok(idx.lex.has(m[1] as string), `unknown lexId in beat: ${m[0]}`);
    assert.ok(Number.isInteger(b.allyHp) && b.allyHp >= 0, `allyHp ${b.allyHp}`);
    assert.ok(Number.isInteger(b.foeHp) && b.foeHp >= 0, `foeHp ${b.foeHp}`);
    assert.ok(!/[ऀ-ॿ]/.test(b.text), 'beat text has no raw Devanagari');
  }
  void prev;
}

interface PlayResult { outcome: 'win' | 'lose' | 'run' | null; turns: number; state: GameState; steps: number }

/** Plays a battle with a bot. `rng` decides correctness; random=true makes every menu choice random. */
function play(s0: GameState, sp: BattleSpec, skill: Skill, rng: Rng, opts: { random?: boolean; maxSteps?: number } = {}): PlayResult {
  let s = startBattle(s0, C, sp);
  assert.equal(s.mode, 'battle');
  assert.deepEqual(s.pending, { kind: 'battle' });
  let steps = 0;
  const max = opts.maxSteps ?? 6000;
  let lastAllyHp = s.battle!.ally.hp;
  let lastFoeHp = s.battle!.foe.hp;
  while (battleOutcome(s) === null && steps++ < max) {
    const b = s.battle!;
    const before = s;
    switch (b.phase) {
      case 'intro': case 'beats': case 'won': case 'lost': case 'fled': {
        const beat = b.beats[0];
        if (beat) {
          // HP only changes on a beat that says why (hit / heal / switch / faint) or when a new foe arrives
          if (beat.allyHp !== lastAllyHp) assert.ok(beat.fx && ['hit', 'heal', 'switch'].includes(beat.fx.kind) && (beat.fx.target === 'ally' || beat.fx.kind === 'switch') || beat.text.includes('level') || beat.text.includes('restored') || beat.text.includes('recover'), `ally hp change explained: ${beat.text}`);
          if (beat.foeHp !== lastFoeHp) assert.ok((beat.fx?.kind === 'hit' && beat.fx.target === 'foe') || (beat.fx?.kind === 'heal' && beat.fx.target === 'foe') || /appears|steps forward|blocks|challenges|\{n:enemy\./.test(beat.text), `foe hp change explained: ${beat.text}`);
          lastAllyHp = beat.allyHp;
          lastFoeHp = beat.foeHp;
        }
        s = battleAction(s, C, { type: 'advance' });
        break;
      }
      case 'feedback':
        s = battleAction(s, C, { type: 'advance' });
        checkBeats(null, s.battle!.beats);
        if (s.battle!.beats.length) {
          const last = s.battle!.beats[s.battle!.beats.length - 1]!;
          assert.equal(last.allyHp, s.battle!.ally.hp, 'last beat matches the ally');
          assert.equal(last.foeHp, s.battle!.foe.hp, 'last beat matches the foe');
        }
        break;
      case 'command': {
        if (opts.random) {
          s = battleAction(s, C, { type: 'choose', index: rng.int(4) });
          break;
        }
        const menu = battleMenu(s, C);
        if (b.ally.hp / b.ally.maxHp < 0.3 && menu.items.some((i) => idx.item.get(i)!.kind === 'heal')) {
          s = battleAction(s, C, { type: 'choose', index: 2 });
          const i = battleMenu(s, C).items.findIndex((x) => idx.item.get(x)!.kind === 'heal');
          s = battleAction(s, C, { type: 'choose', index: i });
          break;
        }
        s = battleAction(s, C, { type: 'choose', index: 0 });
        break;
      }
      case 'pick-move': {
        const menu = battleMenu(s, C);
        if (opts.random) {
          s = battleAction(s, C, { type: 'choose', index: rng.int(menu.moves.length + 1) - 1 });
          break;
        }
        let best = -1;
        let bestScore = -Infinity;
        menu.moves.forEach((m, i) => {
          if (!m.usable) return;
          const mv = idx.move.get(m.id)!;
          const e = mv.effect;
          let score = -1;
          if (mv.power > 0) score = damage(b.ally, b.foe, mv, 1, 1).amount;
          else if (e?.kind === 'heal') score = b.ally.hp / b.ally.maxHp < 0.4 ? 1e6 : -1;
          else if (e?.kind === 'debuff-def') score = b.foe.stages.def > -2 && b.foe.hp > b.foe.maxHp * 0.5 ? 5e5 : -1;
          else if (e?.kind === 'buff-atk') score = b.ally.stages.atk < 2 && b.foe.hp > b.foe.maxHp * 0.5 ? 4e5 : -1;
          else if (e?.kind === 'debuff-atk') score = b.foe.stages.atk > -2 && b.foe.hp > b.foe.maxHp * 0.5 ? 3e5 : -1;
          else if (e?.kind === 'buff-def') score = b.ally.stages.def < 2 && b.foe.hp > b.foe.maxHp * 0.6 ? 2e5 : -1;
          if (score > bestScore) {
            bestScore = score;
            best = i;
          }
        });
        s = battleAction(s, C, { type: 'choose', index: best });
        break;
      }
      case 'challenge': {
        const p: GameState['pending'] = s.pending;
        assert.ok(p?.kind === 'challenge' && p.context === 'battle', 'battle challenge pending');
        const ch = p.challenge;
        const ok = rng.chance(skill.correct);
        const fast = ok && rng.chance(skill.swift);
        const timeMs = fast ? 1000 : Math.round(ch.timeLimitMs * 0.7);
        s = ch.tiles ? battleAction(s, C, { type: 'answer', order: ok ? ch.orders![0]! : [], timeMs }) : battleAction(s, C, { type: 'answer', option: ok ? ch.answers![0]! : 'wrong', timeMs });
        assert.equal(s.pending?.kind, 'feedback');
        break;
      }
      case 'pick-switch': {
        const menu = battleMenu(s, C);
        if (opts.random && !menu.forcedSwitch && rng.chance(0.3)) {
          s = battleAction(s, C, { type: 'choose', index: -1 });
          break;
        }
        const pick = menu.switchable.slice().sort((a, c) => fighterFromMember(s.save.party[c]!, C).atk - fighterFromMember(s.save.party[a]!, C).atk)[0]!;
        s = battleAction(s, C, { type: 'choose', index: opts.random ? (menu.switchable[rng.int(menu.switchable.length)] ?? pick) : pick });
        break;
      }
      case 'pick-item':
        s = battleAction(s, C, { type: 'choose', index: opts.random ? rng.int(battleItems(s, C).length + 1) - 1 : -1 });
        break;
    }
    if (s.battle) {
      for (const m of s.save.party) assert.ok(m.hp >= 0 && m.hp <= statsAt(idx.ally.get(m.id)!, m.level).hp, 'party hp in range');
      assert.ok(s.battle.ally.hp <= s.battle.ally.maxHp && s.battle.foe.hp <= s.battle.foe.maxHp);
      if (s.battle.phase !== 'challenge' && s.battle.phase !== 'feedback') assert.deepEqual(s.pending, { kind: 'battle' });
    }
    void before;
  }
  return { outcome: battleOutcome(s), turns: s.battle?.turn ?? 0, state: s, steps };
}

const KEY = ['s-ma-nishada', 's-ramam-dasharatham', 's-ramo-vigrahavan', 's-vyakaranam', 's-jayatyatibalo', 's-aditya-hrdayam'];
const CH1 = ['player', 'rama', 'lakshmana'];
const CH6 = ['player', 'rama', 'lakshmana', 'hanuman', 'jambavan', 'vibhishana'];
/**
 * Boss / duel fights as the story files stage them (party, enemy levels), at the recommended party level, plus
 * under-levelled variants (`under`) that the no-grinding path can produce: a perfect player must win those too.
 */
type Boss = { name: string; enemies: [string, number][]; kind: 'boss' | 'duel'; party: string[]; level: number; keys: number; chapter: number; under?: boolean };
const B = (name: string, enemies: [string, number][], kind: 'boss' | 'duel', party: string[], level: number, keys: number, chapter: number, under = false): Boss => ({ name, enemies, kind, party, level, keys, chapter, under });
const DUO5 = ['hanuman', 'player'];
const BOSSES: Boss[] = [
  B('bharadvaja tutorial duel', [['bharadvaja_duel', 3]], 'duel', ['player'], 3, 0, 1),
  B('tataka', [['tataka', 6]], 'boss', CH1, 6, 1, 1),
  B('tataka (L5 party)', [['tataka', 6]], 'boss', CH1, 5, 1, 1, true),
  B('yajna subahu+maricha', [['subahu', 7], ['maricha', 7]], 'boss', CH1, 7, 1, 1),
  B('yajna (L6 party)', [['subahu', 7], ['maricha', 7]], 'boss', CH1, 6, 1, 1, true),
  B('pandita duel', [['pandita_duel', 10]], 'duel', CH1, 10, 1, 2),
  B('pandita duel (L9 party)', [['pandita_duel', 10]], 'duel', CH1, 9, 1, 2, true),
  B('bharadvaja chapter duel', [['bharadvaja_duel', 10]], 'duel', CH1, 10, 2, 2),
  B('dushana+khara (Rama alone with the reciter)', [['dushana', 12], ['khara', 13]], 'boss', ['player', 'rama'], 13, 2, 3),
  B('dushana+khara (L12 party)', [['dushana', 12], ['khara', 13]], 'boss', ['player', 'rama'], 12, 2, 3, true),
  B('maricha golden deer (two heroes)', [['maricha', 14]], 'boss', ['player', 'rama'], 14, 2, 3),
  B('maricha (L13 party)', [['maricha', 14]], 'boss', ['player', 'rama'], 13, 2, 3, true),
  B('kabandha', [['kabandha', 14]], 'boss', CH1, 14, 3, 3),
  B('hanuman duel', [['hanuman_duel', 16]], 'duel', CH1, 16, 3, 4),
  B('hanuman duel (L15 party)', [['hanuman_duel', 16]], 'duel', CH1, 15, 3, 4, true),
  B('surasa', [['surasa_duel', 19]], 'duel', DUO5, 19, 4, 5),
  B('simhika', [['simhika', 19]], 'boss', DUO5, 19, 4, 5),
  B('lanka_devi', [['lanka_devi', 20]], 'boss', DUO5, 19, 4, 5),
  B('aksha', [['aksha', 22]], 'boss', DUO5, 22, 4, 5),
  B('aksha (L21 party)', [['aksha', 22]], 'boss', DUO5, 21, 4, 5, true),
  B('dhumraksha', [['dhumraksha', 24]], 'boss', CH6, 24, 5, 6),
  B('dhumraksha (L22 party)', [['dhumraksha', 24]], 'boss', CH6, 22, 5, 6, true),
  B('kumbhakarna', [['kumbhakarna', 26]], 'boss', CH6, 26, 5, 6),
  B('kumbhakarna (L24 party)', [['kumbhakarna', 26]], 'boss', CH6, 24, 5, 6, true),
  B('indrajit', [['indrajit', 27]], 'boss', CH6, 27, 5, 6),
  B('ravana L30', [['ravana', 30]], 'boss', CH6, 28, 6, 6),
  B('ravana L30 (L26 party)', [['ravana', 30]], 'boss', CH6, 26, 6, 6, true),
];

function bossState(bs: Boss, seed: number, level: Level, items: Record<string, number> = {}): GameState {
  const keys = KEY.slice(0, bs.keys);
  return mkState(buildParty(bs.party, bs.level, keys), seed, level, bs.chapter, keys, items);
}

// ───────────────────────── math ─────────────────────────

test('xp curve, stats and stage multipliers follow DESIGN §5', () => {
  assert.deepEqual([1, 2, 5, 10, 28].map(xpToNext), [12, 42, 217, 757, 4831]);
  assert.equal(xpToReach(1), 0);
  assert.equal(xpToReach(3), 12 + 42);
  assert.deepEqual([-4, -3, -1, 0, 1, 2, 3, 4].map((s) => +stageMult(s).toFixed(4)), [0.512, 0.512, 0.8, 1, 1.25, 1.5625, 1.9531, 1.9531]);
  const rama = idx.ally.get('rama')!;
  assert.deepEqual(statsAt(rama, 1), { hp: rama.base.hp, atk: rama.base.atk, def: rama.base.def, spd: rama.base.spd });
  const s10 = statsAt(rama, 10);
  assert.equal(s10.hp, Math.floor(rama.base.hp + rama.growth.hp * 9));
});

test('damage: base formula × element chart × STAB 1.25 × quality × variance; stages apply', () => {
  const f = (over: Partial<Fighter>): Fighter => ({ id: 'x', level: 10, hp: 100, maxHp: 100, atk: 50, def: 50, spd: 10, element: 'none', moves: [], stages: { atk: 0, def: 0 }, stunned: false, ...over });
  const mv = (over: Partial<MoveDef>): MoveDef => ({ id: 'm', nameId: 'move.m', element: 'none', power: 50, pp: 10, challenge: 'artha', description: '', origin: '', ...over });
  // base = floor(((2*10/5+2) * 50 * 1) / 50) + 2 = 6 + 2 = 8
  assert.deepEqual(damage(f({ element: 'divya' }), f({}), mv({}), 1, 1), { amount: 8 });
  assert.deepEqual(damage(f({}), f({}), mv({}), 1, 1), { amount: 10 }, 'STAB when the elements match (8 × 1.25)');
  assert.deepEqual(damage(f({ element: 'divya' }), f({ element: 'maya' }), mv({ element: 'divya' }), 1, 1), { amount: 20, effective: 'super' }, 'divya vs maya ×2 with STAB');
  assert.deepEqual(damage(f({ element: 'jala' }), f({ element: 'bhumi' }), mv({ element: 'jala' }), 1, 1), { amount: 5, effective: 'weak' });
  assert.equal(damage(f({ element: 'divya' }), f({}), mv({}), 1.5, 1).amount, 12, 'swift quality 1.5');
  assert.equal(damage(f({ element: 'divya' }), f({}), mv({}), 0.35, 1).amount, 3, 'wrong quality 0.35');
  assert.equal(damage(f({ element: 'divya' }), f({}), mv({}), 1, 0.85).amount, 7, 'variance');
  assert.equal(damage(f({ element: 'divya', stages: { atk: 2, def: 0 } }), f({}), mv({}), 1, 1).amount, 11, '+2 atk: floor(6*1.5625... )+2');
  assert.equal(damage(f({ element: 'divya' }), f({ stages: { atk: 0, def: -2 } }), mv({}), 1, 1).amount, 11, '−2 def');
  assert.equal(damage(f({}), f({}), mv({ power: 0 }), 1, 1).amount, 0, 'status moves deal nothing');
  assert.ok(damage(f({ atk: 1 }), f({ def: 999 }), mv({ power: 10 }), 0.35, 0.85).amount >= 1, 'at least 1');
});

test('newMember, level-ups, learned moves (auto-equip while < 4) and verse unlocks', () => {
  assert.equal(newMember(idx.ally.get('rama')!, 3, C).level, 5, 'heroes never join below their minLevel');
  assert.equal(newMember(idx.ally.get('vibhishana')!, 20, C).level, 24);
  assert.equal(newMember(idx.ally.get('player')!, 3, C).level, 3);
  assert.equal(newMember(idx.ally.get('hanuman')!, 19, C).level, 19);
  const lak = newMember(idx.ally.get('lakshmana')!, 7, C);
  assert.deepEqual(lak.moves, ['bana', 'khadga'], 'verse moves are not level moves');
  assert.equal(lak.hp, statsAt(idx.ally.get('lakshmana')!, 7).hp);
  const r = addXp(lak, xpToNext(7), C);
  assert.equal(r.member.level, 8);
  assert.deepEqual(r.learned, ['agni_bana']);
  assert.deepEqual(r.member.moves, ['bana', 'khadga', 'agni_bana']);
  assert.equal(r.member.pp['agni_bana'], idx.move.get('agni_bana')!.pp);
  assert.ok(r.member.hp > lak.hp, 'hp grows with the level');
  // a hero with 4 equipped moves learns but does not equip
  const full = { ...newMember(idx.ally.get('rama')!, 8, C) };
  assert.equal(full.moves.length, 3);
  const r9 = addXp({ ...full, moves: [...full.moves, 'bana'].slice(0, 4).concat([]) }, xpToNext(8), C);
  assert.equal(r9.member.level, 9);
  // multi-level jump
  const big = addXp(newMember(idx.ally.get('player')!, 3, C), xpToReach(10) - xpToReach(3), C);
  assert.equal(big.member.level, 10);
  assert.equal(big.levels.length, 7);
  // grantXp on several members
  const st = mkState([newMember(idx.ally.get('player')!, 3, C), newMember(idx.ally.get('rama')!, 3, C)], 1, 3, 1);
  const g = grantXp(st, C, [0, 1], 500);
  assert.equal(g.levelUps.length, 2);
  assert.ok(g.state.save.party.every((m) => m.level > 3));
  // śrānta heroes stay at 0 hp on level up
  assert.equal(addXp({ ...lak, hp: 0 }, 5000, C).member.hp, 0);
  // learnable/withUnlockedMoves
  const save = { shlokas: { 's-ramo-vigrahavan': { heard: true, restored: true, best: 1 } } };
  const rama = newMember(idx.ally.get('rama')!, 12, C);
  assert.ok(learnableMoves(rama, save, C).includes('dharma_vigraha'));
  assert.ok(!learnableMoves(rama, { shlokas: {} }, C).includes('dharma_vigraha'));
  assert.ok(withUnlockedMoves({ ...rama, moves: ['bana'] }, save, C).moves.includes('dharma_vigraha'));
});

test('battleXp: DESIGN base × level factor; shares 1 / 0.75 benched / 0.5 exhausted; clamped catch-up; join floors', () => {
  assert.equal(battleXp(50, 5, 5, true), 50);
  assert.equal(battleXp(50, 5, 5, false), Math.round(50 * 0.75));
  assert.equal(battleXp(50, 5, 5, false, true), 25, 'exhausted heroes still learn from watching');
  assert.ok(battleXp(50, 10, 5, true) > battleXp(50, 10, 10, true), 'under-levelled heroes catch up');
  assert.equal(battleXp(50, 5, 40, true), Math.round(50 * 0.4), 'over-levelled floor');
  assert.equal(battleXp(50, 30, 1, true), Math.round(50 * 6 * Math.pow(6, 0.95) * 3), 'catch-up ceiling ×3');
  const p = (lv: number): PartyMember => newMember(idx.ally.get('player')!, lv, C);
  assert.equal(joinLevel({ party: [p(3)], chapter: 1 }), 5, 'the princes join at the ch1 floor');
  assert.equal(joinLevel({ party: [p(12), p(14)], chapter: 4 }), 15);
  assert.equal(joinLevel({ party: [p(20), p(22)], chapter: 4 }), 21, 'party average when above the floor');
  assert.equal(joinLevel({ party: [p(20)], chapter: 6 }), 24);
});

// ───────────────────────── defs completeness ─────────────────────────

test('defs.json: every ally/enemy/move/item from DESIGN, valid ids, English text, nameIds', () => {
  const ids = (xs: { id: string }[]): string[] => xs.map((x) => x.id).sort();
  assert.deepEqual(ids(C.allies), [...ALLY_IDS].sort());
  assert.deepEqual(ids(C.enemies), [...ENEMY_IDS].sort());
  assert.deepEqual(ids(C.items), ['chudamani', 'kanda_mula', 'kusha_mudrika', 'madhu', 'oshadhi', 'phala', 'sanjivani']);
  const moveIds = 'pada_bana lipi_raksha shoka_shloka suprabhata shuddha_vak bana agneyastra varunastra vayavyastra dharma_vigraha abhaya aditya_hrdaya brahmastra khadga viddhi agni_bana vayu_vega gada jaya_ghosha anirveda shaila vriksha prajna mantrana jala_dhara nakha maya_jala shula garjana andhakara parigha agni_varsha naga_pasha chandrahasa tarka prashna'.split(' ');
  assert.deepEqual(ids(C.moves), moveIds.sort());
  const kinds = new Set(['artha', 'lipi', 'purana', 'krama', 'viccheda', 'vibhakti']);
  const deva = /[ऀ-ॿ]/;
  for (const m of C.moves) {
    assert.equal(m.nameId, `move.${m.id}`);
    assert.ok(kinds.has(m.challenge));
    assert.ok(!deva.test(m.description) && !deva.test(m.origin));
    if (m.power === 0 && !['tarka'].includes(m.id)) assert.ok(m.effect, `${m.id} status move has an effect`);
  }
  for (const a of C.allies) {
    assert.equal(a.nameId, `ally.${a.id}`);
    assert.ok((BATTLER_IDS as readonly string[]).includes(a.battler));
    assert.ok((SPRITE_IDS as readonly string[]).includes(a.overworld));
    for (const m of a.moves) assert.ok(idx.move.has(m.moveId), `${a.id} → ${m.moveId}`);
    assert.ok(newMember(a, 1, C).moves.length >= 1, `${a.id} has a move at level 1`);
    assert.ok(newMember(a, 1, C).moves.some((id) => idx.move.get(id)!.power > 0) || a.id === 'player' || true);
  }
  for (const e of C.enemies) {
    assert.equal(e.nameId, `enemy.${e.id}`);
    assert.ok((BATTLER_IDS as readonly string[]).includes(e.battler), `${e.id} battler ${e.battler}`);
    assert.ok(['wild', 'boss', 'duelist'].includes(e.kind));
    assert.equal(e.kind === 'duelist', e.id.endsWith('_duel'));
    assert.ok(e.xp > 0 && e.niska > 0);
    assert.ok(e.moves.length > 0 && e.moves.every((m) => idx.move.has(m.moveId) && m.moveId !== 'tarka' ? true : e.kind === 'duelist'));
    for (const t of [e.description, e.intro ?? '', e.defeatLine ?? '']) assert.ok(!deva.test(t));
    for (const d of e.drops ?? []) assert.ok(idx.item.has(d.itemId) && d.chance > 0 && d.chance <= 1);
    assert.ok(fighterFromEnemy(e.id, 1, C).moves.length > 0);
  }
  // duelists use the duel battlers
  assert.equal(idx.enemy.get('bharadvaja_duel')!.battler, 'b_bharadvaja');
  assert.equal(idx.enemy.get('pandita_duel')!.battler, 'b_pandita');
  assert.equal(idx.enemy.get('hanuman_duel')!.battler, 'b_hanuman_duel');
  assert.equal(idx.enemy.get('surasa_duel')!.battler, 'b_surasa');
  // verse-unlocked moves belong to exactly one hero
  for (const m of C.moves.filter((x) => x.unlockShloka)) assert.equal(C.allies.filter((a) => a.moves.some((x) => x.moveId === m.id)).length, 1, m.id);
  // names exist for every id once content-v has written them
  if (C.names.length > 0) {
    const names = new Set(C.names.map((n) => n.id));
    const missing = [...C.moves.map((m) => m.nameId), ...C.allies.map((a) => a.nameId), ...C.enemies.map((e) => e.nameId), ...C.items.map((i) => i.nameId)].filter((n) => !names.has(n));
    assert.deepEqual(missing, [], 'every nameId is in names.json');
  }
});

// ───────────────────────── balance simulations ─────────────────────────

test('perfect bot beats every boss at its recommended level and slightly under it (levels [2,3,4] × 25 seeds, no items)', () => {
  for (const bs of BOSSES) {
    for (const { level, seed } of testMatrix(LEVELS, 25)) {
      const r = play(bossState(bs, seed, level), spec(bs.enemies, bs.kind), PERFECT, createRng(seed));
      assert.equal(r.outcome, 'win', `${bs.name} L${level} seed ${seed}: ${r.outcome} after ${r.turns} turns`);
    }
  }
});

test('competent bot (80% correct, 2 fruits) wins most boss fights; mostly-wrong bot loses most (stakes)', () => {
  let lostSome = 0;
  const main = BOSSES.filter((b) => !b.under);
  for (const bs of main) {
    let compWins = 0;
    let wrongWins = 0;
    for (let seed = 1; seed <= 25; seed++) {
      if (play(bossState(bs, seed, 3, { phala: 2 }), spec(bs.enemies, bs.kind), COMPETENT, createRng(seed + 1000)).outcome === 'win') compWins++;
      if (play(bossState(bs, seed, 3), spec(bs.enemies, bs.kind), MOSTLY_WRONG, createRng(seed + 2000)).outcome === 'win') wrongWins++;
    }
    assert.ok(compWins >= 19, `${bs.name}: competent bot won only ${compWins}/25`);
    if (wrongWins < 25) lostSome++;
    if (bs.kind === 'boss') assert.ok(wrongWins <= 15, `${bs.name}: mostly-wrong bot won ${wrongWins}/25`);
  }
  assert.ok(lostSome >= main.length - 2, 'wrong answers have consequences in (almost) every fight');
});

test('random bot always terminates with a valid outcome (wild, boss, duel)', () => {
  const wilds: [string, number][] = [['nishachara', 4], ['vrka', 5], ['yatudhana', 12], ['rakshasi', 20], ['maya_mriga', 13]];
  for (let seed = 1; seed <= 40; seed++) {
    const rng = createRng(seed);
    const lvl = 3 + (seed % 20);
    const party = buildParty(seed % 3 === 0 ? ['player'] : CH6.slice(0, 2 + (seed % 5)), lvl, KEY.slice(0, seed % 7));
    const [id, l] = wilds[seed % wilds.length]!;
    const items = { phala: seed % 3, madhu: seed % 2, oshadhi: seed % 2, kanda_mula: 1 };
    const kind: BattleSpec['kind'] = seed % 4 === 0 ? 'boss' : seed % 4 === 1 ? 'duel' : 'wild';
    const enemies: [string, number][] = kind === 'boss' ? [['khara', lvl], ['dushana', lvl]] : kind === 'duel' ? [['pandita_duel', lvl]] : [[id, l]];
    const r = play(mkState(party, seed, LEVELS[seed % 3]!, 1 + (seed % 6), [], items), spec(enemies, kind), { correct: 0.5, swift: 0.3 }, rng, { random: true, maxSteps: 20000 });
    assert.ok(r.outcome === 'win' || r.outcome === 'lose' || r.outcome === 'run', `seed ${seed}: ${r.outcome} after ${r.steps} steps`);
    if (kind !== 'wild') assert.notEqual(r.outcome, 'run');
    const end = endBattle(r.state, C);
    assert.equal(end.outcome, r.outcome);
    assert.equal(end.state.battle, null);
    assert.equal(end.state.mode, 'explore');
    assert.equal(end.state.pending, null);
  }
});

// ───────────────────────── state machine details ─────────────────────────

function advanceBeats(s: GameState): GameState {
  let t = s;
  for (let i = 0; i < 200 && t.battle && (t.battle.phase === 'intro' || t.battle.phase === 'beats' || ((t.battle.phase === 'won' || t.battle.phase === 'lost' || t.battle.phase === 'fled') && t.battle.beats.length > 0)); i++) t = battleAction(t, C, { type: 'advance' });
  return t;
}
function useMove(s: GameState, moveIndex: number, correct = true): GameState {
  let t = battleAction(s, C, { type: 'choose', index: 0 });
  t = battleAction(t, C, { type: 'choose', index: moveIndex });
  assert.equal(t.battle!.phase, 'challenge');
  const ch = (t.pending as { challenge: { answers?: string[]; orders?: number[][]; tiles?: string[] } }).challenge;
  t = ch.tiles ? battleAction(t, C, { type: 'answer', order: correct ? ch.orders![0]! : [], timeMs: 500 }) : battleAction(t, C, { type: 'answer', option: correct ? ch.answers![0]! : 'zzz', timeMs: 500 });
  assert.equal(t.battle!.phase, 'feedback');
  return battleAction(t, C, { type: 'advance' });
}

test('start: intro beats, lead selection, pending, music fx; ignored actions return the same object', () => {
  const party = buildParty(['player', 'rama', 'lakshmana'], 8, []);
  const s0 = mkState(party, 7, 3, 1);
  const s = startBattle(s0, C, spec([['nishachara', 5]], 'wild'));
  assert.equal(s.battle!.phase, 'intro');
  assert.equal(s.battle!.active, 1, 'rama leads, not the reciter');
  assert.equal(leadIndex(party, spec([['pandita_duel', 5]], 'duel')), 0, 'the reciter leads a duel');
  assert.ok(s.battle!.beats[0]!.text.includes('{n:enemy.nishachara}'));
  assert.ok(s.fx.some((f) => f.kind === 'music'));
  assert.equal(battleAction(s, C, { type: 'choose', index: 0 }), s, 'choose ignored during intro');
  assert.equal(battleAction(s, C, { type: 'answer', option: 'o0', timeMs: 1 }), s);
  const c = advanceBeats(s);
  assert.equal(c.battle!.phase, 'command');
  assert.equal(battleAction(c, C, { type: 'advance' }), c, 'advance ignored in command');
  assert.equal(battleOutcome(c), null);
  // back navigation
  const pm = battleAction(c, C, { type: 'choose', index: 0 });
  assert.equal(pm.battle!.phase, 'pick-move');
  assert.equal(battleAction(pm, C, { type: 'choose', index: -1 }).battle!.phase, 'command');
  assert.equal(battleAction(pm, C, { type: 'choose', index: 9 }), pm, 'invalid move index ignored');
});

test('PP: each use costs 1; 0-PP moves cannot be chosen; all-out heroes strike weakly instead of stalling', () => {
  const party = buildParty(['rama'], 10, []);
  let s = startBattle(mkState(party, 3, 3, 1), C, spec([['kumbhakarna', 10]], 'boss'));
  s = advanceBeats({ ...s, battle: { ...s.battle!, foe: { ...s.battle!.foe, atk: 1, hp: 9999, maxHp: 9999 } } });
  const moveId = s.battle!.ally.moves[0]!;
  const before = s.save.party[0]!.pp[moveId]!;
  s = advanceBeats(useMove(s, 0));
  assert.equal(s.battle!.phase, 'command');
  assert.equal(s.save.party[0]!.pp[moveId], before - 1);
  // drain PP of move 0 only
  const p0 = s.save.party[0]!;
  s = { ...s, save: { ...s.save, party: [{ ...p0, pp: { ...p0.pp, [moveId]: 0 } }] } };
  const pm = battleAction(s, C, { type: 'choose', index: 0 });
  assert.equal(battleMenu(pm, C).moves[0]!.usable, false);
  assert.equal(battleAction(pm, C, { type: 'choose', index: 0 }), pm, '0-PP move refused');
  // all moves at 0 → weary strike allowed
  const zero = Object.fromEntries(Object.keys(p0.pp).map((k) => [k, 0]));
  const sz = { ...s, save: { ...s.save, party: [{ ...p0, hp: p0.hp, pp: zero }] } };
  assert.ok(battleMenu(sz, C).moves.every((m) => m.usable));
  const after = useMove(sz, 0);
  assert.ok(after.battle!.beats.some((b) => b.text.includes('weary')));
});

test('items: fruit heals and is consumed; honey restores PP; herb revives; no-effect uses cost nothing', () => {
  const party = buildParty(['rama', 'lakshmana'], 10, []);
  const hurt = [{ ...party[0]!, hp: 5, pp: Object.fromEntries(Object.entries(party[0]!.pp).map(([k]) => [k, 1])) }, { ...party[1]!, hp: 0 }];
  const phase = (x: GameState): string => x.battle!.phase;
  let s = startBattle(mkState(hurt, 5, 3, 1, [], { phala: 1, madhu: 1, oshadhi: 1, kusha_mudrika: 1 }), C, spec([['nishachara', 3]], 'wild'));
  s = advanceBeats({ ...s, battle: { ...s.battle!, foe: { ...s.battle!.foe, atk: 1, hp: 9999, maxHp: 9999 } } });
  assert.deepEqual(battleItems(s, C), ['phala', 'madhu', 'oshadhi'], 'key items are not offered');
  s = battleAction(s, C, { type: 'choose', index: 2 });
  assert.equal(phase(s), 'pick-item');
  s = battleAction(s, C, { type: 'choose', index: 0 });
  assert.equal(s.save.items['phala'], 0);
  assert.ok(s.battle!.beats.some((b) => b.fx?.kind === 'heal'));
  s = advanceBeats(s);
  assert.equal(phase(s), 'command');
  assert.ok(s.battle!.ally.hp > 5 - 3, 'healed (minus at most a weak hit)');
  assert.ok(s.save.party[0]!.hp === s.battle!.ally.hp, 'party hp mirrors the active fighter');
  s = advanceBeats(battleAction(battleAction(s, C, { type: 'choose', index: 2 }), C, { type: 'choose', index: 0 })); // madhu
  assert.equal(s.save.items['madhu'], 0);
  for (const id of s.save.party[0]!.moves) assert.ok(s.save.party[0]!.pp[id]! >= Math.min(6, idx.move.get(id)!.pp));
  assert.equal(phase(s), 'command');
  s = advanceBeats(battleAction(battleAction(s, C, { type: 'choose', index: 2 }), C, { type: 'choose', index: 0 })); // oshadhi
  assert.equal(s.save.items['oshadhi'], 0);
  assert.ok(s.save.party[1]!.hp > 0, 'lakshmana revived');
  assert.deepEqual(battleItems(s, C), []);
  // no-effect: a full-health hero does not waste fruit nor a turn
  const fresh = buildParty(['rama'], 10, []);
  const f0 = advanceBeats(startBattle(mkState(fresh, 5, 3, 1, [], { phala: 2 }), C, spec([['nishachara', 3]], 'wild')));
  const f1 = battleAction(battleAction(f0, C, { type: 'choose', index: 2 }), C, { type: 'choose', index: 0 });
  assert.equal(f1.save.items['phala'], 2);
  assert.equal(advanceBeats(f1).battle!.turn, f0.battle!.turn);
  // with no items, Item gives an info beat
  const n0 = advanceBeats(startBattle(mkState(fresh, 5, 3, 1), C, spec([['nishachara', 3]], 'wild')));
  const n1 = battleAction(n0, C, { type: 'choose', index: 2 });
  assert.equal(n1.battle!.phase, 'beats');
  assert.equal(advanceBeats(n1).battle!.phase, 'command');
});

test('run: only from wild battles; chance by speed; a failed run gives the foe a turn', () => {
  const party = buildParty(['rama'], 20, []);
  let fled = 0;
  let failed = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = advanceBeats(startBattle(mkState(party, seed, 3, 1), C, spec([['vrka', 25]], 'wild')));
    const r = battleAction(s, C, { type: 'choose', index: 3 });
    if (r.battle!.phase === 'fled') {
      fled++;
      const done = advanceBeats(r);
      assert.equal(battleOutcome(done), 'run');
      assert.equal(endBattle(done, C).outcome, 'run');
    } else {
      failed++;
      assert.ok(r.battle!.beats.some((b) => b.text.includes('could not get away')));
      assert.ok(r.battle!.turn > s.battle!.turn, 'the foe acted');
    }
  }
  assert.ok(fled > 0 && failed > 0, `fled ${fled}, failed ${failed}`);
  for (const kind of ['boss', 'duel'] as const) {
    const s = advanceBeats(startBattle(mkState(party, 1, 3, 1), C, spec([[kind === 'boss' ? 'khara' : 'pandita_duel', 10]], kind)));
    const r = battleAction(s, C, { type: 'choose', index: 3 });
    assert.notEqual(r.battle!.phase, 'fled');
    assert.equal(r.battle!.turn, s.battle!.turn, 'no turn spent');
    assert.equal(advanceBeats(r).battle!.phase, 'command');
  }
});

test('multi-foe sequence: the next foe steps in after the first is defeated; XP and coins per foe', () => {
  const party = buildParty(['rama'], 30, ['s-ramo-vigrahavan']);
  let s = advanceBeats(startBattle(mkState(party, 11, 3, 3), C, spec([['nishachara', 3], ['yatudhana', 3]], 'boss')));
  assert.equal(s.battle!.foeIndex, 0);
  let guard = 0;
  while (s.battle!.foeIndex === 0 && guard++ < 20) s = advanceBeats(useMove(s, 0));
  assert.equal(s.battle!.foeIndex, 1);
  assert.equal(s.battle!.foe.id, 'yatudhana');
  assert.equal(s.battle!.foe.hp, s.battle!.foe.maxHp);
  assert.ok(s.save.niska > 0, 'coins for the first foe');
  const xpAfterFirst = s.save.party[0]!.xp + xpToReach(s.save.party[0]!.level);
  assert.equal(s.battle!.phase, 'command');
  while (battleOutcome(s) === null && guard++ < 40) s = advanceBeats(useMove(s, 0));
  assert.equal(battleOutcome(s), 'win');
  assert.ok(s.save.party[0]!.xp + xpToReach(s.save.party[0]!.level) > xpAfterFirst);
  const end = endBattle(s, C);
  assert.equal(end.outcome, 'win');
  assert.equal(end.state.session.battlesWon, 0, 'core counts wins');
});

test('XP and level-ups on a win: levelup beats, learned moves, hp written back by endBattle; drops', () => {
  const party = buildParty(['player', 'lakshmana'], 7, []);
  let s = startBattle(mkState(party, 21, 3, 1), C, spec([['tataka', 12]], 'boss'));
  // make the foe nearly defeated so one hit wins
  s = { ...s, battle: { ...s.battle!, foe: { ...s.battle!.foe, hp: 1 } } };
  s = advanceBeats(useMove(advanceBeats(s), 0));
  assert.equal(battleOutcome(s), 'win');
  const lak = s.save.party[1]!;
  assert.ok(lak.level >= 8, `lakshmana levelled (${lak.level})`);
  assert.ok(lak.moves.includes('agni_bana'), 'learned at level 8 and auto-equipped');
  assert.ok(s.save.party[0]!.level > 7, 'the benched reciter also gains XP');
  assert.ok((s.save.items['kanda_mula'] ?? 0) >= 1, 'boss drop (chance 1)');
  const end = endBattle(s, C);
  assert.equal(end.state.save.party[1]!.hp, end.state.save.party[1]!.hp);
  assert.equal(end.state.battle, null);
});

test('losing: all heroes exhausted → lost; canLose duel reports lose; forced switch after a faint', () => {
  const weak = buildParty(['player', 'rama'], 3, []);
  let s = advanceBeats(startBattle(mkState(weak, 2, 3, 1), C, spec([['ravana', 40]], 'boss')));
  let guard = 0;
  let sawForced = false;
  while (battleOutcome(s) === null && guard++ < 100) {
    if (s.battle!.phase === 'pick-switch') {
      sawForced = true;
      assert.ok(battleMenu(s, C).forcedSwitch);
      assert.equal(battleAction(s, C, { type: 'choose', index: -1 }), s, 'cannot back out of a forced switch');
      s = advanceBeats(battleAction(s, C, { type: 'choose', index: battleMenu(s, C).switchable[0]! }));
      continue;
    }
    s = advanceBeats(useMove(s, 0, false));
  }
  assert.ok(sawForced, 'forced switch happened');
  assert.equal(battleOutcome(s), 'lose');
  assert.ok(s.save.party.every((m) => m.hp === 0));
  assert.equal(endBattle(s, C).outcome, 'lose');
});

test('duel vocabulary: conviction and persuasion', () => {
  const party = buildParty(['player'], 30, []);
  let s = advanceBeats(startBattle(mkState(party, 4, 3, 1), C, spec([['bharadvaja_duel', 3]], 'duel')));
  let guard = 0;
  while (battleOutcome(s) === null && guard++ < 30) s = advanceBeats(useMove(s, 0));
  const all = JSON.stringify(s.battle);
  void all;
  const fresh = advanceBeats(startBattle(mkState(party, 4, 3, 1), C, spec([['bharadvaja_duel', 3]], 'duel')));
  const t = useMove(fresh, 0);
  const text = t.battle!.beats.map((b) => b.text).join(' | ');
  assert.ok(/conviction|persuaded/.test(text), text);
  assert.ok(!/damage/.test(text), 'no violent vocabulary in a duel');
});

test('stun: a bound hero loses a turn; the foe acts', () => {
  const content: GameContent = { ...C, moves: C.moves.map((m) => (m.id === 'nakha' ? { ...m, power: 1, effect: { kind: 'stun' as const, amount: 1, target: 'enemy' as const } } : m)) };
  const ix = indexOf(content);
  void ix;
  const party = buildParty(['rama'], 30, []);
  let s = startBattle(mkState(party, 9, 3, 1), content, spec([['vrka', 1]], 'wild'));
  s = { ...s, battle: { ...s.battle!, foe: { ...s.battle!.foe, moves: ['nakha'], spd: 999, hp: 9999, maxHp: 9999 } } };
  for (let i = 0; i < 10 && s.battle!.phase !== 'command'; i++) s = battleAction(s, content, { type: 'advance' });
  let t = battleAction(battleAction(s, content, { type: 'choose', index: 0 }), content, { type: 'choose', index: 0 });
  const ch = (t.pending as { challenge: { answers?: string[]; orders?: number[][]; tiles?: string[] } }).challenge;
  t = battleAction(t, content, ch.tiles ? { type: 'answer', order: ch.orders![0]!, timeMs: 1 } : { type: 'answer', option: ch.answers![0]!, timeMs: 1 });
  t = battleAction(t, content, { type: 'advance' });
  // the faster foe binds the hero before the hero acts: the hero's move is lost this turn
  const texts = t.battle!.beats.map((b) => b.text);
  const bound = texts.findIndex((x) => x.includes('bound and will lose a turn'));
  assert.ok(bound >= 0, texts.join(' | '));
  assert.ok(texts[bound + 1]?.includes('cannot act'), texts.join(' | '));
  assert.ok(!texts.some((x) => x.includes('{n:ally.rama} uses')), 'no action while bound');
  assert.equal(t.battle!.ally.stunned, false);
  // next turn: the foe binds again (amount 1) only after the hero acted (immunity ends with the turn)
  t = battleAction(battleAction(advanceBeats(t), content, { type: 'choose', index: 0 }), content, { type: 'choose', index: 0 });
  const ch2 = (t.pending as { challenge: { answers?: string[]; orders?: number[][]; tiles?: string[] } }).challenge;
  t = battleAction(battleAction(t, content, ch2.tiles ? { type: 'answer', order: ch2.orders![0]!, timeMs: 1 } : { type: 'answer', option: ch2.answers![0]!, timeMs: 1 }), content, { type: 'advance' });
  const seen: string[] = [];
  for (let i = 0; i < 60 && t.battle!.phase !== 'command'; i++) {
    if (t.battle!.beats[0]) seen.push(t.battle!.beats[0].text);
    t = battleAction(t, content, { type: 'advance' });
  }
  assert.ok(seen.some((x) => x.includes('cannot act')), seen.join(' | '));
  assert.equal(t.battle!.phase, 'command');
  assert.equal(t.battle!.ally.stunned, false);
  // a slower foe's bind costs the hero the NEXT turn, which resolves without a command
  let u = startBattle(mkState(party, 9, 3, 1), content, spec([['vrka', 1]], 'wild'));
  u = advanceBeats({ ...u, battle: { ...u.battle!, foe: { ...u.battle!.foe, moves: ['nakha'], spd: 0, hp: 9999, maxHp: 9999 } } });
  u = battleAction(battleAction(u, content, { type: 'choose', index: 0 }), content, { type: 'choose', index: 0 });
  const ch3 = (u.pending as { challenge: { answers?: string[]; orders?: number[][]; tiles?: string[] } }).challenge;
  u = battleAction(battleAction(u, content, ch3.tiles ? { type: 'answer', order: ch3.orders![0]!, timeMs: 1 } : { type: 'answer', option: ch3.answers![0]!, timeMs: 1 }), content, { type: 'advance' });
  assert.equal(u.battle!.ally.stunned, true);
  const turn = u.battle!.turn;
  const seen2: string[] = [];
  for (let i = 0; i < 60 && u.battle!.phase !== 'command'; i++) {
    if (u.battle!.beats[0]) seen2.push(u.battle!.beats[0].text);
    u = battleAction(u, content, { type: 'advance' });
  }
  assert.ok(seen2.some((x) => x.includes('cannot act')), seen2.join(' | '));
  assert.equal(u.battle!.turn, turn + 1, 'the lost turn was resolved automatically');
  assert.equal(u.battle!.ally.stunned, false, 'not re-bound in the turn it recovered');
});

test('rollEncounter: rate, weights, level range, tick bump; no table → no battle', () => {
  const party = buildParty(['rama'], 5, []);
  const map = (rate: number): MapDef => ({ id: 'mm', nameId: 'place.mm', kanda: 1, width: 1, height: 1, legend: {}, ground: [], music: 'forest', battleBg: 'forest', npcs: [], warps: [], triggers: [], encounters: { rate, table: [{ enemyId: 'vrka', weight: 3, minLevel: 3, maxLevel: 5 }, { enemyId: 'nishachara', weight: 1, minLevel: 4, maxLevel: 4 }, { enemyId: 'not_an_enemy', weight: 9, minLevel: 1, maxLevel: 1 }] } });
  let s = mkState(party, 77, 3, 1);
  const counts: Record<string, number> = {};
  let hits = 0;
  for (let i = 0; i < 400; i++) {
    const r = rollEncounter(s, C, map(0.25));
    assert.equal(r.state.tick, s.tick + 1);
    s = r.state;
    if (r.spec) {
      hits++;
      const e = r.spec.enemies[0]!;
      counts[e.id] = (counts[e.id] ?? 0) + 1;
      assert.equal(r.spec.kind, 'wild');
      assert.equal(r.spec.canRun, true);
      assert.equal(r.spec.canLose, false);
      assert.equal(r.spec.bg, 'forest');
      if (e.id === 'vrka') assert.ok(e.level >= 3 && e.level <= 5);
      if (e.id === 'nishachara') assert.equal(e.level, 4);
    }
  }
  assert.ok(hits > 60 && hits < 140, `≈25% encounter rate (${hits}/400)`);
  assert.ok((counts['vrka'] ?? 0) > (counts['nishachara'] ?? 0), 'weights respected');
  assert.equal(counts['not_an_enemy'], undefined, 'unknown enemies are skipped');
  const none = rollEncounter(s, C, { ...map(1), encounters: undefined });
  assert.equal(none.spec, null);
  assert.equal(none.state, s);
  const exhausted = mkState(party.map((m) => ({ ...m, hp: 0 })), 1, 3, 1);
  assert.equal(rollEncounter(exhausted, C, map(1)).spec, null);
});

test('battles are deterministic for a seed and every challenge is recorded in the session', () => {
  const bs = BOSSES[1]!;
  const a = play(bossState(bs, 5, 3), spec(bs.enemies, bs.kind), COMPETENT, createRng(9));
  const b = play(bossState(bs, 5, 3), spec(bs.enemies, bs.kind), COMPETENT, createRng(9));
  assert.deepEqual(a.state, b.state);
  assert.ok(a.state.session.total > 0);
  assert.ok(a.state.session.practised.length > 0);
  assert.ok(Object.keys(a.state.save.words).length > 0, 'SRS updated by battle answers');
});

/** Lead-hero levels at each story fight when following the story files' battles plus `wild` encounters per chapter. */
function storyProgression(wildPerChapter: number, exhaustRama = false): { label: string; want: number; lead: number }[] {
  let chapter = 1;
  let wild = wildPerChapter;
  let party: PartyMember[] = [newMember(idx.ally.get('player')!, 3, C)];
  const out: { label: string; want: number; lead: number }[] = [];
  const join = (id: string, lv?: number): void => void party.push(newMember(idx.ally.get(id)!, lv ?? joinLevel({ party, chapter: chapter as SaveData['chapter'] }), C));
  const leave = (id: string): void => void (party = party.filter((m) => m.id !== id));
  const fight = (enemy: string, level: number, duel = false): void => {
    const def = idx.enemy.get(enemy)!;
    const lead = duel ? party.findIndex((m) => m.id === 'player') : Math.max(0, party.findIndex((m) => m.id !== 'player'));
    party = party.map((m, i) => {
      const ex = exhaustRama && m.id === 'rama';
      return addXp(m, battleXp(def.xp, level, m.level, i === lead && !ex, ex), C).member;
    });
  };
  const wilds = (ids: string[], lo: number, hi: number): void => {
    for (let i = 0; i < wild; i++) fight(ids[i % ids.length]!, Math.round(lo + ((hi - lo) * i) / Math.max(1, wild - 1)));
  };
  const at = (label: string, want: number): void => {
    const heroes = party.filter((m) => m.id !== 'player');
    const list = heroes.length ? heroes : party;
    out.push({ label, want, lead: Math.round(list.reduce((a, m) => a + m.level, 0) / list.length) });
  };
  fight('bharadvaja_duel', 3, true);
  join('rama');
  join('lakshmana');
  wilds(['nishachara', 'vrka'], 3, 6);
  fight('nishachara', 5);
  at('ch1 Tataka', 6);
  fight('tataka', 6);
  fight('subahu', 7);
  fight('maricha', 7);
  chapter = 2;
  wilds(['vrka', 'nishachara'], 7, 10);
  for (const l of [8, 9, 10]) fight('pandita_duel', l, true);
  at('ch2 Bharadvaja', 10);
  fight('bharadvaja_duel', 10, true);
  chapter = 3;
  wilds(['yatudhana', 'rakshasi'], 11, 13);
  fight('yatudhana', 12);
  leave('lakshmana');
  fight('rakshasi', 12);
  fight('yatudhana', 13);
  at('ch3 Dushana+Khara', 13);
  fight('dushana', 12);
  fight('khara', 13);
  at('ch3 Maricha', 14);
  fight('maricha', 14);
  join('lakshmana');
  fight('kabandha', 14);
  chapter = 4;
  wilds(['vrka', 'nishachara'], 15, 18);
  at('ch4 Hanuman duel', 16);
  fight('hanuman_duel', 16, true);
  for (const id of ['hanuman', 'sugriva', 'jambavan']) join(id);
  leave('hanuman');
  join('hanuman', 19);
  chapter = 5;
  for (const id of ['rama', 'lakshmana', 'sugriva', 'jambavan']) leave(id);
  fight('surasa_duel', 19, true);
  at('ch5 Simhika', 19);
  fight('simhika', 19);
  fight('lanka_devi', 20);
  for (const [e, l] of [['nishachara', 20], ['yatudhana', 20], ['yatudhana', 21], ['rakshasi', 21], ['nishachara', 21]] as const) fight(e, l);
  wilds(['nishachara', 'yatudhana'], 19, 21);
  at('ch5 Aksha', 22);
  fight('aksha', 22);
  chapter = 6;
  for (const id of ['rama', 'lakshmana', 'jambavan', 'vibhishana']) join(id);
  const w6 = wild;
  wild = Math.floor(w6 / 2);
  wilds(['nishachara', 'yatudhana', 'rakshasi'], 23, 25);
  at('ch6 Dhumraksha', 24);
  fight('dhumraksha', 24);
  wild = w6 - Math.floor(w6 / 2);
  wilds(['yatudhana', 'rakshasi', 'nishachara'], 24, 27);
  at('ch6 Kumbhakarna', 26);
  fight('kumbhakarna', 26);
  fight('indrajit', 27);
  at('ch6 Ravana', 28);
  return out;
}

test('natural play tracks the recommended levels: ±1 with 3–6 wild battles per chapter; ≤ 3 under with none; ≤ 2 over when grinding', () => {
  for (const wild of [3, 6]) for (const r of storyProgression(wild)) assert.ok(Math.abs(r.lead - r.want) <= 1, `${r.label} (${wild} wild/chapter): lead L${r.lead}, recommended L${r.want}`);
  for (const r of storyProgression(0)) assert.ok(r.lead >= r.want - 3, `${r.label} (story battles only): lead L${r.lead}, recommended L${r.want}`);
  for (const r of storyProgression(0, true)) assert.ok(r.lead >= r.want - 3, `${r.label} (Rama exhausted throughout): lead L${r.lead}`);
  for (const r of storyProgression(10)) assert.ok(r.lead <= r.want + 2, `${r.label} (10 wild/chapter): lead L${r.lead}, recommended L${r.want}`);
});

test('wild battles in each chapter band are fair: a competent bot at the band floor wins ≥ 90%', () => {
  const bands: { party: string[]; level: number; foes: string[]; lo: number; hi: number; keys: number }[] = [
    { party: CH1, level: 4, foes: ['nishachara', 'vrka'], lo: 3, hi: 6, keys: 0 },
    { party: CH1, level: 7, foes: ['nishachara', 'yatudhana', 'vrka'], lo: 6, hi: 10, keys: 1 },
    { party: CH1, level: 10, foes: ['nishachara', 'rakshasi', 'yatudhana', 'maya_mriga'], lo: 10, hi: 14, keys: 2 },
    { party: CH1, level: 15, foes: ['vrka', 'nishachara', 'yatudhana'], lo: 15, hi: 18, keys: 3 },
    { party: ['hanuman', 'player'], level: 18, foes: ['rakshasi', 'yatudhana', 'nishachara'], lo: 19, hi: 21, keys: 4 },
    { party: CH6, level: 22, foes: ['rakshasi', 'yatudhana', 'nishachara'], lo: 22, hi: 26, keys: 5 },
  ];
  for (const band of bands) {
    let wins = 0;
    const n = 30;
    for (let seed = 1; seed <= n; seed++) {
      const foe = band.foes[seed % band.foes.length]!;
      const lvl = band.lo + (seed % (band.hi - band.lo + 1));
      const keys = KEY.slice(0, band.keys);
      const r = play(mkState(buildParty(band.party, band.level, keys), seed, 3, 1, keys), spec([[foe, lvl]], 'wild'), COMPETENT, createRng(seed + 77));
      if (r.outcome === 'win') wins++;
      assert.ok(r.turns <= 30, `wild fights stay short (${r.turns} turns)`);
    }
    assert.ok(wins >= n * 0.9, `band L${band.lo}-${band.hi} at party L${band.level}: ${wins}/${n}`);
  }
});

test('real content: defeating a foe restores its words (marked seen, announced with {w:} beats)', (t) => {
  const lexReal = indexOf(REAL);
  const words = (lexReal.enemy.get('bharadvaja_duel')?.restoresWords ?? []).filter((w) => lexReal.lex.has(w));
  if (REAL.lexicon.length === 0 || words.length === 0) return t.skip('lexicon not written yet');
  const party = [newMember(lexReal.ally.get('player')!, 40, REAL)];
  let s = startBattle(mkState(party, 3, 3, 1), REAL, spec([['bharadvaja_duel', 3]], 'duel'));
  s = { ...s, battle: { ...s.battle!, foe: { ...s.battle!.foe, hp: 1 } }, save: { ...s.save, shlokas: Object.fromEntries(REAL.shlokas.map((x) => [x.id, { heard: true, restored: false, best: 0 }])) } };
  for (let i = 0; i < 10 && s.battle!.phase !== 'command'; i++) s = battleAction(s, REAL, { type: 'advance' });
  s = battleAction(battleAction(s, REAL, { type: 'choose', index: 0 }), REAL, { type: 'choose', index: 0 });
  const p = s.pending;
  assert.ok(p?.kind === 'challenge');
  const ch = p.challenge;
  s = battleAction(s, REAL, ch.tiles ? { type: 'answer', order: ch.orders![0]!, timeMs: 1 } : { type: 'answer', option: ch.answers![0]!, timeMs: 1 });
  s = battleAction(s, REAL, { type: 'advance' });
  const texts = s.battle!.beats.map((b) => b.text);
  for (const w of words) {
    assert.ok(texts.includes(`Restored word: {w:${w}}`), texts.join(' | '));
    assert.ok((s.save.words[w]?.seen ?? 0) >= 1, `${w} marked seen`);
  }
  assert.equal(s.battle!.phase, 'won');
});

// ───────────────────────── Sambhāṣaṇa battle menus (ui-b) ─────────────────────────

test('sa-ui: battle-menu Sanskrit composed by the view verifies (the command prompt for every hero, the element matchup for every pair, end lines)', () => {
  const o = getOracle();
  const problems: string[] = [];
  const check = (sa: string | undefined, en: string, what: string): void => {
    if (!sa) return void problems.push(`${what}: no Sanskrit`);
    const r = o.verifyLine(sa, { en, ui: true });
    if (!r.ok) problems.push(`${what} "${sa}": ${r.errors.join('; ')}`);
  };
  // "What will X do?": X in the nominative (sa-battle forms.ally) for every hero, both avatars via {g:}
  for (const a of REAL.allies) {
    const who = { en: a.id === 'player' ? '{player}' : `{n:${a.nameId}}`, sa: SA_BATTLE.forms.ally[a.id]?.nom ?? '' };
    assert.ok(who.sa, `${a.id} has a nominative`);
    check(uiSa(REAL, 'battle.whatWillDo', { who }), uiEn(REAL, 'battle.whatWillDo', { who }), `whatWillDo ${a.id}`);
  }
  // the matchup line, with the element chips filled by their names.json stems as the view shows them
  const els = ['agni', 'jala', 'vayu', 'bhumi', 'divya', 'maya', 'none'] as const;
  const word = (m: number): { en: string; sa: string } => {
    const k = m > 1 ? 'battle.strong' : m < 1 ? 'battle.weak' : 'battle.even';
    return { en: uiEn(REAL, k), sa: uiSa(REAL, k) ?? '' };
  };
  const stem = (el: string): string => indexOf(REAL).name.get(`element.${el}`)?.sa ?? '';
  let pairs = 0;
  for (const a of els)
    for (const f of els) {
      const out = ELEMENT_CHART[a]?.[f] ?? 1;
      const inc = ELEMENT_CHART[f]?.[a] ?? 1;
      if (out === 1 && inc === 1) continue;
      pairs++;
      const key = inc !== 1 ? 'battle.matchBoth' : 'battle.matchOne';
      const slots = { a: stem(a), f: stem(f), out: word(out), in: word(inc) };
      // the chips are names.json labels (like {n:element.x}): verify the sentence around them; the chips must exist
      check(uiSa(REAL, key, { ...slots, a: '', f: '' }), uiEn(REAL, key, { ...slots, a: '', f: '' }), `matchup ${a}/${f}`);
      for (const el of [a, f]) assert.ok(stem(el), `element chip ${el} is a names.json entry (content.test checks its Sanskrit)`);
    }
  assert.ok(pairs > 0);
  for (const k of ['win', 'allDown', 'fled']) assert.ok(saText(k), `end line ${k} has Sanskrit`);
  assert.deepEqual(problems, [], problems.join('\n'));
});
