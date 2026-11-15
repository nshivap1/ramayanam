/**
 * Kathā battle tactics (v0.5a) — OWNER: fx-strat. Spec: notes/katha.md → "v0.5a: a strategic layer"; logic-tactics.ts.
 *  - content: every katha.json `tactics` entry names real foes / moves / allies / flags / sa-battle templates and its source
 *  - matchups: the fitting astra of the text is decisive with its story beat (Mānava → Mārīca, Āgneya → Subāhu in Book 1;
 *    the brahmāstra once Rāvaṇa is worn to half); elsewhere the foe card shows the element strong against the foe
 *  - warnings: a boss readies its great blow one turn ahead (a short Sanskrit line, future tense); it lands on the foe's
 *    next action, after the hero; a support move, a counter, a switch, a cover or the verse shield blunts it (and leaves
 *    the foe open); ignored it is capped; wild fights, duels and the practice game never warn
 *  - fatigue: the same astra on consecutive turns × 0.6, then × 0.4; another move resets it; plain moves never tire
 *  - grants: Viśvāmitra's astras reach Rāma when Tāṭakā falls (Kathā only); roles: Lakṣmaṇa covers from the bench
 *  - v0.5b P7 (WP-C) boss phases: Rāvaṇa's heads grow back — from half strength a blow that is not the brahmāstra
 *    cannot take him below 40 % while Rāma holds it (a held blow shows the heads line; a spent brahmāstra comes back to
 *    hand); Mātali's line plays once; the brahmāstra ends it; every bot wins, the strategic one in ≤ 15 turns
 * This file holds no Sanskrit: every string comes from the content.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BattleBeat, BattleSpec, BattleState, GameState, PartyMember, SaveData } from './types';
import { loadContent } from './content';
import { indexOf } from './logic-util';
import { KATHA_FLAG, bestHit, rotationHit } from './logic-katha';
import {
  COVER_CMD,
  KATHA_BLUNT,
  KATHA_FATIGUE,
  KATHA_STRIKE_CAP,
  SHIELD_CMD,
  WARN_TEMPLATE,
  affinityOf,
  answerOf,
  applyGrants,
  canShield,
  coverOf,
  fatigueMult,
  fitFor,
  isDecisive,
  nextChain,
  readiesAt,
  shieldPada,
  tires,
  warnPlan,
} from './logic-tactics';
import { SA_BATTLE, battleAction, battleMenu, saText, startBattle } from './logic-battle';
import { fighterFromEnemy, newMember } from './logic-progress';
import { newGame, reduce } from './logic';
import { botActions, strategicChoice } from './logic-sim';
import { createRng } from '@sdk';
import { existsSync } from 'node:fs';
import { onlyMove, phaseFloor, phasesBegun, phasesOf, spendOnly, strikeScale } from './logic-tactics';
import { getOracle } from './sa-verify';

const C = loadContent();
const idx = indexOf(C);
const T = C.katha!.tactics!;

function member(id: string, level: number, moves: string[]): PartyMember {
  const m = newMember(idx.ally.get(id)!, level, C);
  const pp = { ...m.pp };
  for (const x of moves) pp[x] = idx.move.get(x)!.pp;
  return { ...m, moves, pp };
}

function kState(party: PartyMember[], o: { chapter?: number; style?: 'katha' | 'abhyasa'; heard?: string[]; flags?: string[] } = {}): GameState {
  const ch = C.chapters.find((c) => c.kanda === (o.chapter ?? 1)) ?? C.chapters[0]!;
  const style = o.style ?? 'katha';
  const shlokas: SaveData['shlokas'] = {};
  for (const id of o.heard ?? []) shlokas[id] = { heard: true, restored: false, best: 0 };
  const flags: SaveData['flags'] = style === 'katha' ? { [KATHA_FLAG]: true } : {};
  for (const f of o.flags ?? []) flags[f] = true;
  const save: SaveData = {
    v: 1, playerName: 'T', avatar: 'a', mapId: ch.startMap, x: ch.startX, y: ch.startY, facing: 'down', respawn: { mapId: ch.startMap, x: ch.startX, y: ch.startY },
    chapter: (o.chapter ?? 1) as SaveData['chapter'], objective: '', flags, party, items: {}, niska: 0, words: {}, shlokas,
    step: 0, npcPos: {}, playMs: 0, completedChapters: [], ...(style === 'katha' ? { style, smrti: {} } : {}),
  };
  return { v: 1, seed: 5, tick: 0, level: 3, save, mode: 'explore', script: null, pending: null, battle: null, recital: null, session: { correct: 0, total: 0, swift: 0, practised: [], shlokasHeard: [], shlokasRestored: [], battlesWon: 0, chaptersCompleted: [] }, fx: [] };
}

const spec = (enemies: [string, number][], kind: BattleSpec['kind'], lead?: string): BattleSpec => ({ enemies: enemies.map(([id, level]) => ({ id, level })), kind, canRun: false, canLose: true, bg: 'forest', music: 'boss', ...(lead ? { lead } : {}) });

/** Advance until the command menu (or the battle's end). */
function toCommand(s0: GameState): GameState {
  let s = s0;
  for (let i = 0; i < 80 && s.battle && s.battle.phase !== 'command' && !['won', 'lost'].includes(s.battle.phase); i++) {
    if (s.pending?.kind === 'challenge' && s.pending.challenge.smarana) s = battleAction(s, C, { type: 'answer', picks: s.pending.challenge.smarana.gaps.length ? [s.pending.challenge.smarana.gapAnswers[0]![0]!] : [], timeMs: 500 });
    else s = battleAction(s, C, { type: 'advance' });
  }
  return s;
}
/** Cast one move from the command menu (one tap = choose 0 then choose i); a recitation is answered right. */
function cast(s: GameState, moveId: string): GameState {
  const i = s.battle!.ally.moves.indexOf(moveId);
  assert.ok(i >= 0, `${moveId} equipped (${s.battle!.ally.moves.join(', ')})`);
  let n = battleAction(battleAction(s, C, { type: 'choose', index: 0 }), C, { type: 'choose', index: i });
  if (n.pending?.kind === 'challenge' && n.pending.challenge.smarana) {
    const sp = n.pending.challenge.smarana;
    n = battleAction(n, C, { type: 'answer', picks: sp.gaps.length ? [sp.gapAnswers[0]![0]!] : [], timeMs: 500 });
  }
  return n;
}
const turnBeats = (before: GameState, after: GameState): BattleBeat[] => after.battle!.beats.slice(before.battle!.beats.length);
const noFoe = (s: GameState): GameState => ({ ...s, battle: { ...s.battle!, foe: { ...s.battle!.foe, stunned: true } } });

const RAMA_SACRIFICE = ['vayavyastra', 'agneyastra', 'varunastra', 'manavastra'];
function sacrifice(): GameState {
  const party = [member('player', 8, ['pada_bana', 'lipi_raksha', 'shoka_shloka']), member('rama', 8, RAMA_SACRIFICE), member('lakshmana', 8, ['bana', 'khadga'])];
  return startBattle(kState(party, { heard: ['s-ma-nishada', 's-kausalya-supraja'] }), C, spec([['subahu', 7], ['maricha', 7]], 'boss', 'rama'));
}

// ───────────────────────── content ─────────────────────────

test('tactics content: every entry names real foes, moves, allies, flags and sa-battle templates, with a source; the beats and lines verify', () => {
  const flags = new Set<string>();
  const walk = (cmds: unknown): void => {
    for (const c of (Array.isArray(cmds) ? cmds : []) as Record<string, unknown>[]) {
      if (typeof c['set'] === 'string') flags.add(c['set']);
      for (const k of ['then', 'else', 'onWin', 'onLose', 'onCorrect', 'onWrong']) walk(c[k]);
    }
  };
  for (const e of C.events) walk(e.cmds);
  const problems: string[] = [];
  const tpl = (k: string | undefined, where: string): void => {
    if (k !== undefined && !SA_BATTLE.templates[k]) problems.push(`${where}: no sa-battle template "${k}"`);
  };
  for (const id of T.divine) if (!idx.move.get(id) || idx.move.get(id)!.unlockShloka) problems.push(`divine ${id}: a move with no verse`);
  for (const g of T.grants) {
    if (!flags.has(g.flag)) problems.push(`grant: no story sets "${g.flag}"`);
    if (!idx.ally.has(g.ally)) problems.push(`grant: ally ${g.ally}`);
    for (const m of g.moves) if (!idx.move.has(m)) problems.push(`grant: move ${m}`);
    if (!g.source.trim()) problems.push(`grant ${g.flag}: source`);
  }
  for (const g of T.guards) if (!idx.ally.has(g.ally) || !idx.move.get(g.move)?.effect || !g.source.trim()) problems.push(`guard ${g.ally}/${g.move}`);
  for (const f of T.fits) {
    if (!idx.enemy.has(f.foe) || !idx.move.has(f.move) || !f.source.trim()) problems.push(`fit ${f.foe}/${f.move}`);
    if (f.chapter !== undefined && !C.chapters.some((c) => c.kanda === f.chapter)) problems.push(`fit ${f.foe}: chapter ${f.chapter}`);
    if (f.below !== undefined && !(f.below > 0 && f.below < 1)) problems.push(`fit ${f.foe}: below ${f.below}`);
    tpl(f.beat, `fit ${f.foe}`);
  }
  for (const w of T.warnings) {
    if (!idx.enemy.has(w.foe) || !w.source.trim()) problems.push(`warning ${w.foe}`);
    for (const m of w.counter ?? []) if (!idx.move.has(m)) problems.push(`warning ${w.foe}: counter ${m}`);
    tpl(w.ready, `warning ${w.foe}`);
    tpl(w.strike, `warning ${w.foe}`);
  }
  tpl(WARN_TEMPLATE, 'default warning');
  // the fitting beats are fixed lines (no slots): each verifies with the oracle
  for (const f of T.fits) {
    const sa = saText(f.beat);
    if (!sa || !getOracle().verifyLine(sa, {}).ok) problems.push(`fit beat ${f.beat} does not verify: ${sa}`);
  }
  assert.deepEqual(problems, []);
  // the three textual matchups of the brief (Bāla 1.30.17–22; Yuddha 6.108)
  assert.equal(fitFor(C, 1, 'maricha')?.move, 'manavastra');
  assert.equal(fitFor(C, 1, 'subahu')?.move, 'agneyastra');
  assert.equal(fitFor(C, 6, 'ravana')?.move, 'brahmastra');
  assert.equal(fitFor(C, 3, 'maricha'), undefined, 'the golden deer of Book 3 is not the Mānava’s');
});

// ───────────────────────── matchups ─────────────────────────

test('matchups: the fitting astra is decisive with its story beat (Mānava hurls Mārīca into the ocean); any other astra is an ordinary hit; the card shows each foe’s affinity', () => {
  let s = toCommand(sacrifice());
  assert.equal(s.battle!.ally.id, 'rama', 'Rāma leads the sacrifice (spec.lead)');
  assert.deepEqual(affinityOf(C, 1, s.battle!.foe), { kind: 'astra', moveId: 'agneyastra' });
  // an unfitting astra: an ordinary hit, the foe stands
  const a = cast(s, 'varunastra');
  assert.ok(a.battle!.foe.hp > 0 && !turnBeats(s, a).some((b) => b.tactic === 'fit'));
  // the Āgneya fells Subāhu at once: its beat (no "uses" line), then Mārīca steps forward
  s = toCommand(a);
  const b = cast(s, 'agneyastra');
  const fb = turnBeats(s, b);
  const fit = fb.find((x) => x.tactic === 'fit');
  assert.ok(fit && fit.textSa === saText('kathaFitAgneya') && fit.fx?.kind === 'hit', 'the Āgneya beat');
  assert.equal(fit.foeHp, 0);
  assert.ok(!fb.some((x) => /uses \{n:move\.agneyastra\}/.test(x.text)), 'the beat names the cast itself');
  s = toCommand(b);
  assert.equal(s.battle!.foe.id, 'maricha');
  assert.deepEqual(affinityOf(C, 1, s.battle!.foe), { kind: 'astra', moveId: 'manavastra' });
  const c = cast(s, 'manavastra');
  assert.ok(turnBeats(s, c).some((x) => x.tactic === 'fit' && x.textSa === saText('kathaFitManava')), 'the Mānava beat: far into the ocean, alive');
  assert.equal(toCommand(c).battle!.phase, 'won');
  // Book 3's Mārīca has no fitting astra: the card shows the element strong against māyā
  assert.deepEqual(affinityOf(C, 3, fighterFromEnemy('maricha', 14, C)), { kind: 'element', element: 'divya' });
  assert.deepEqual(affinityOf(C, 6, fighterFromEnemy('kumbhakarna', 26, C)), { kind: 'element', element: 'vayu' });
  assert.equal(affinityOf(C, 1, fighterFromEnemy('bharadvaja_duel', 3, C)), null, 'nothing is strong against a debater');
});

test('matchups: the brahmāstra decides Rāvaṇa only once he is worn down to half (Yuddha 6.108)', () => {
  const ravana = fighterFromEnemy('ravana', 30, C);
  assert.equal(isDecisive(C, 6, ravana, 'brahmastra'), false, 'at full strength: an ordinary (strong) hit');
  assert.equal(isDecisive(C, 6, { ...ravana, hp: Math.ceil(ravana.maxHp * 0.5) }, 'brahmastra'), true);
  assert.equal(isDecisive(C, 6, { ...ravana, hp: 1 }, 'dharma_vigraha'), false);
  assert.equal(isDecisive(C, 1, fighterFromEnemy('maricha', 7, C), 'manavastra'), true, 'Mārīca at once');
});

// ───────────────────────── warnings ─────────────────────────

test('warnings: a boss readies its great blow on its second action (one short line, future tense); it lands on the next action, after the hero; ignored it is capped, never a knock-out from full', () => {
  const party = [member('player', 12, ['pada_bana', 'lipi_raksha', 'shoka_shloka'])];
  let s = toCommand(startBattle(kState(party), C, spec([['tataka', 6]], 'boss')));
  const plan = warnPlan(C, 1, { kind: 'boss' }, s.battle!.foe)!;
  assert.ok(plan && plan.start === 1 && readiesAt(plan, 1) && readiesAt(plan, 4) && !readiesAt(plan, 2), 'the 2nd, 5th, 8th … action');
  assert.equal(plan.ready, 'kathaWarnStones', 'Tāṭakā rains stones (Bāla 1.26.16)');
  // turn 1: an ordinary blow; turn 2: she readies (no blow)
  s = toCommand(cast(s, 'pada_bana'));
  assert.equal(s.battle!.warn, undefined);
  const r = cast(s, 'pada_bana');
  const warn = turnBeats(s, r).find((b) => b.tactic === 'warn');
  assert.ok(warn && warn.textSa === saText('kathaWarnStones', { x: { kind: 'enemy', id: 'tataka' } }), 'her warning line');
  assert.ok(r.battle!.warn && r.battle!.warn.foeId === 'tataka');
  assert.equal(r.battle!.ally.hp, s.battle!.ally.hp, 'readying is not a blow');
  // turn 3, ignored: the strike lands after the hero's move (whatever the speed), at most KATHA_STRIKE_CAP of max HP
  s = toCommand(r);
  const slow = { ...s, battle: { ...s.battle!, ally: { ...s.battle!.ally, spd: 1 } } };
  const t = cast(slow, 'pada_bana');
  const tb = turnBeats(slow, t);
  const heroAt = tb.findIndex((b) => /uses \{n:move\.pada_bana\}/.test(b.text));
  const strikeAt = tb.findIndex((b) => b.textSa === saText('kathaStrikeStones', { x: { kind: 'enemy', id: 'tataka' } }));
  assert.ok(heroAt >= 0 && strikeAt > heroAt, 'the hero acts first against a readied blow');
  const lost = s.battle!.ally.hp - t.battle!.ally.hp;
  assert.ok(lost > 0 && lost <= Math.round(s.battle!.ally.maxHp * KATHA_STRIKE_CAP), `capped (${lost} of ${s.battle!.ally.maxHp})`);
  assert.ok(!tb.some((b) => b.tactic === 'blunt'));
  assert.equal(t.battle!.warn, undefined, 'the blow is spent');
});

test('warnings: answered by a support move — the blow lands softly (× KATHA_BLUNT) and the foe is left open (defence −1); a counter (Rāma’s arrows against the stones), a switch, a cover and the verse shield answer too', () => {
  const readied = (party: PartyMember[], foe: [string, number] = ['tataka', 6]): GameState => {
    let s = toCommand(startBattle(kState(party, { heard: ['s-ma-nishada'] }), C, spec([foe], 'boss')));
    for (let i = 0; i < 6 && !s.battle!.warn; i++) s = toCommand(cast(s, s.battle!.ally.moves.find((m) => (idx.move.get(m)?.power ?? 0) > 0)!));
    assert.ok(s.battle!.warn, 'a blow is readied');
    return s;
  };
  const ignoredLoss = (s: GameState): number => s.battle!.ally.hp - toCommand(cast(s, 'pada_bana')).battle!.ally.hp;
  // a support move (रक्षा)
  const p = [member('player', 12, ['pada_bana', 'lipi_raksha', 'shoka_shloka']), member('lakshmana', 12, ['bana', 'khadga'])];
  let s = readied(p);
  assert.equal(answerOf(C, s.battle!.warn, 'lipi_raksha'), 'guard');
  assert.equal(answerOf(C, s.battle!.warn, 'pada_bana'), null);
  const full = ignoredLoss(s);
  const g = cast(s, 'lipi_raksha');
  const gb = turnBeats(s, g);
  assert.ok(gb.some((b) => b.tactic === 'blunt' && b.textSa?.startsWith(saText('kathaBlunt') ?? '?')), 'the heroes were ready');
  assert.ok(gb.some((b) => b.textSa === saText('statFall', { x: { kind: 'enemy', id: 'tataka' }, s: 'def' })), 'the foe is left open');
  assert.equal(g.battle!.foe.stages.def, -1);
  const soft = s.battle!.ally.hp - g.battle!.ally.hp;
  assert.ok(soft <= Math.max(1, Math.ceil(full * KATHA_BLUNT)) + 2 && soft < full, `blunted: ${soft} (ignored: ${full})`);
  // a counter: Rāma's arrows meet Tāṭakā's stones (Bāla 1.26.17)
  const rama = readied([member('rama', 12, ['bana', 'agneyastra', 'varunastra'])]);
  assert.equal(answerOf(C, rama.battle!.warn, 'bana'), 'counter');
  const k = cast(rama, 'bana');
  assert.ok(turnBeats(rama, k).some((b) => b.tactic === 'blunt') && k.battle!.foe.hp < rama.battle!.foe.hp, 'the counter hits and blunts');
  // a switch braces the hero who steps in
  s = readied(p);
  const sw = battleAction(battleAction(s, C, { type: 'choose', index: 1 }), C, { type: 'choose', index: 1 });
  assert.ok(turnBeats(s, sw).some((b) => b.tactic === 'blunt'), 'switching answers');
  // a cover: Lakṣmaṇa, benched, steps in with रक्षा (tactics.guards) — one tap
  s = readied([member('rama', 12, ['agneyastra', 'varunastra']), member('lakshmana', 12, ['bana', 'khadga'])]);
  assert.deepEqual(coverOf(s, C), { index: 1, allyId: 'lakshmana', moveId: 'lipi_raksha' });
  const cv = battleAction(s, C, { type: 'choose', index: COVER_CMD });
  const cb = turnBeats(s, cv);
  assert.ok(cb.some((b) => b.textSa === saText('uses', { x: { kind: 'ally', id: 'lakshmana' }, m: 'lipi_raksha' })), 'Lakṣmaṇa uses रक्षा');
  assert.ok(cb.some((b) => b.tactic === 'blunt'));
  assert.ok(cv.battle!.participants.includes(1), 'he shares the victory');
  // the verse shield: a line of a heard verse (the least practised pāda), then the blow lands softly
  s = readied([member('rama', 12, ['agneyastra', 'varunastra'])]);
  assert.equal(coverOf(s, C), null, 'nobody on the bench');
  assert.ok(canShield(s, C) && shieldPada(s, C)?.shlokaId === 's-ma-nishada');
  const sh = battleAction(s, C, { type: 'choose', index: SHIELD_CMD });
  assert.ok(sh.pending?.kind === 'challenge' && sh.pending.challenge.smarana && sh.battle!.pendingShield, 'a recitation opens');
  const sp = sh.pending.challenge.smarana!;
  const done = battleAction(sh, C, { type: 'answer', picks: sp.gaps.length ? [sp.gapAnswers[0]![0]!] : [], timeMs: 400 });
  const db = turnBeats(sh, done);
  assert.ok(db.some((b) => b.recital?.shlokaId === 's-ma-nishada' && b.textSa === saText('kathaShield', { x: { kind: 'ally', id: 'rama' } })));
  assert.ok(db.some((b) => b.tactic === 'blunt'));
  // nothing to answer: the answers are refused (same object)
  const calm = toCommand(startBattle(kState([member('rama', 12, ['agneyastra'])], { heard: ['s-ma-nishada'] }), C, spec([['tataka', 6]], 'boss')));
  assert.equal(battleAction(calm, C, { type: 'choose', index: COVER_CMD }), calm);
  assert.equal(battleAction(calm, C, { type: 'choose', index: SHIELD_CMD }), calm);
});

test('warnings: Subāhu’s rain of blood is readied in the opening (Bāla 1.30.12); felling him with the fitting astra spends it; wild fights, duels and the practice game never warn', () => {
  const s0 = sacrifice();
  const open = s0.battle!.beats.find((b) => b.tactic === 'warn');
  assert.ok(open && open.textSa === saText('kathaWarnBlood', { x: { kind: 'enemy', id: 'subahu' } }), 'the opening line');
  assert.ok(s0.battle!.warn);
  const s = toCommand(s0);
  const b = cast(s, 'agneyastra');
  assert.ok(!turnBeats(s, b).some((x) => x.textSa === saText('kathaStrikeBlood', { x: { kind: 'enemy', id: 'subahu' } })), 'a fallen foe strikes no blow');
  const run = (kind: BattleSpec['kind'], foe: [string, number], style: 'katha' | 'abhyasa' = 'katha'): BattleState => {
    let st = toCommand(startBattle(kState([member('player', 20, ['pada_bana', 'shoka_shloka'])], { style, heard: ['s-ma-nishada'] }), C, spec([foe], kind)));
    for (let i = 0; i < 6 && st.battle && st.battle.phase === 'command'; i++) st = toCommand(st.save.style === 'katha' ? cast(noFoe(st), 'pada_bana') : battleAction(battleAction(st, C, { type: 'choose', index: 0 }), C, { type: 'choose', index: 0 }));
    return st.battle!;
  };
  assert.equal(warnPlan(C, 1, { kind: 'wild' }, fighterFromEnemy('nishachara', 5, C)), null);
  assert.equal(warnPlan(C, 1, { kind: 'duel' }, fighterFromEnemy('bharadvaja_duel', 3, C)), null);
  const wild = run('wild', ['nishachara', 5]);
  assert.ok(!wild.beats.some((x) => x.tactic) && wild.warn === undefined && wild.chain !== undefined, 'a wild fight: fatigue only');
  // the practice game: no tactics field at all (byte-identical battle state)
  const practice = startBattle(kState([member('player', 20, ['pada_bana', 'shoka_shloka'])], { style: 'abhyasa' }), C, spec([['tataka', 6]], 'boss')).battle!;
  for (const k of ['chain', 'warn', 'foeActs', 'pendingShield'] as const) assert.ok(!(k in practice), `practice: no ${k}`);
  assert.ok(!practice.beats.some((x) => x.tactic));
});

test('warnings (v0.5b): the rain of blood falls on the altar — it costs the heroes half a great blow (strikeScale, Bāla 1.30.12); the Mānava answers it (1.30.15); other blows are unchanged', () => {
  assert.equal(strikeScale(C, 1, 'subahu'), 0.5);
  assert.equal(strikeScale(C, 1, 'maricha'), 0.5);
  assert.equal(strikeScale(C, 1, 'tataka'), 1, 'Tāṭakā’s stones fall on the heroes');
  assert.equal(strikeScale(C, 3, 'maricha'), 1, 'only the sacrifice of Book 1');
  for (const w of T.warnings) {
    const k = (w as { strikeScale?: number }).strikeScale;
    if (k !== undefined) assert.ok(k > 0 && k <= 1 && /1\.30\.12/.test(w.source), `${w.foe}: a share in (0, 1] with its source`);
  }
  const warn = { foeId: 'subahu', moveId: 'x', counter: T.warnings.find((w) => w.foe === 'subahu')!.counter ?? [] };
  assert.equal(answerOf(C, warn, 'manavastra'), 'counter', 'the Mānava scatters them (1.30.15)');
  // an unanswered rain: at most half the usual cap of the hero's HP
  const party = [member('rama', 8, ['bana', 'agneyastra']), member('lakshmana', 8, ['bana'])];
  let s = toCommand(startBattle(kState(party, { heard: ['s-ma-nishada'] }), C, spec([['subahu', 7]], 'boss', 'rama')));
  assert.ok(s.battle!.warn, 'readied in the opening');
  const hp0 = s.battle!.ally.hp;
  const n = cast(s, 'bana');
  const strike = turnBeats(s, n).find((b) => b.fx?.kind === 'hit' && b.fx.target === 'ally')!;
  assert.ok(strike.fx!.amount! <= Math.max(1, Math.round(s.battle!.ally.maxHp * KATHA_STRIKE_CAP * 0.5)), `half the cap (${strike.fx!.amount} of ${hp0})`);
});

// ───────────────────────── fatigue ─────────────────────────

test('fatigue: the same astra on consecutive turns lands × 0.6, then × 0.4 (a tired beat), another move resets it; plain moves never tire', () => {
  assert.deepEqual([...KATHA_FATIGUE], [1, 0.6, 0.4]);
  assert.equal(tires(C, 'agneyastra'), true, 'a divine weapon');
  assert.equal(tires(C, 'manavastra'), true);
  assert.equal(tires(C, 'shoka_shloka'), true, 'a verse-bound astra');
  assert.equal(tires(C, 'bana'), false, 'a plain arrow');
  assert.equal(tires(C, 'lipi_raksha'), false, 'a support move');
  let ch = nextChain(undefined, 'agneyastra');
  assert.equal(fatigueMult(ch, C, 'agneyastra'), 0.6);
  ch = nextChain(ch, 'agneyastra');
  assert.equal(fatigueMult(ch, C, 'agneyastra'), 0.4);
  assert.equal(fatigueMult(nextChain(ch, 'agneyastra'), C, 'agneyastra'), 0.4, 'stays at × 0.4');
  assert.equal(fatigueMult(nextChain(ch, 'bana'), C, 'agneyastra'), 1, 'another move resets');
  // in battle: three Āgneyas on a bound foe (no foe turns, same variance range) — the 2nd and 3rd are tired and weaker
  const party = [member('rama', 20, ['agneyastra', 'varunastra', 'bana'])];
  let s = toCommand(startBattle(kState(party), C, spec([['kumbhakarna', 26]], 'wild')));
  const hits: number[] = [];
  const tired: boolean[] = [];
  for (let i = 0; i < 3; i++) {
    const n = cast(noFoe(s), 'agneyastra');
    const hit = turnBeats(s, n).find((b) => b.fx?.kind === 'hit' && b.fx.target === 'foe')!;
    hits.push(hit.fx!.amount!);
    tired.push(hit.tactic === 'tired');
    s = toCommand(n);
  }
  assert.deepEqual(tired, [false, true, true]);
  assert.ok(hits[1]! < hits[0]! && hits[2]! < hits[1]!, `× 0.6 then × 0.4: ${hits.join(', ')}`);
  assert.deepEqual(s.battle!.chain, { moveId: 'agneyastra', n: 3 });
  s = toCommand(cast(noFoe(s), 'varunastra'));
  assert.deepEqual(s.battle!.chain, { moveId: 'varunastra', n: 1 }, 'rotating resets the chain');
  const fresh = cast(noFoe(s), 'agneyastra');
  assert.ok(!turnBeats(s, fresh).some((b) => b.tactic === 'tired'), 'the rested astra is fresh again');
});

test('fatigue: Kathā foes are scaled to the hit a hero keeps up while rotating (rotationHit) — the best hit with a strong second astra, less with a weak one', () => {
  const foe = fighterFromEnemy('ravana', 30, C); // māyā: fire and water both land × 1 for Rāma
  const two = { ...newMember(idx.ally.get('rama')!, 26, C), moves: ['agneyastra', 'varunastra'] };
  const one = { ...newMember(idx.ally.get('player')!, 26, C), moves: ['shoka_shloka', 'pada_bana'] };
  const plain = { ...newMember(idx.ally.get('hanuman')!, 26, C), moves: ['vayu_vega', 'gada'] };
  const ally = (m: PartyMember) => ({ id: m.id, level: m.level, hp: m.hp, maxHp: m.hp, atk: 40, def: 30, spd: 30, element: idx.ally.get(m.id)!.element, moves: m.moves, stages: { atk: 0, def: 0 }, stunned: false });
  assert.ok(Math.abs(rotationHit(ally(two), foe, C) - bestHit(ally(two), foe, C)) <= 1, 'two equal astras alternate at full power');
  assert.ok(rotationHit(ally(one), foe, C) < bestHit(ally(one), foe, C), 'one astra and a weak arrow: less');
  assert.equal(rotationHit(ally(plain), foe, C), bestHit(ally(plain), foe, C), 'plain moves do not tire');
});

// ───────────────────────── grants, roles, the strategic bot ─────────────────────────

test('grants: when Tāṭakā falls, Viśvāmitra’s Mānava and Vāyavya reach Rāma in Kathā (equipped in place of the plain bāṇa, a toast); the practice game is untouched', () => {
  const party = [member('player', 7, ['pada_bana', 'lipi_raksha', 'shoka_shloka']), member('rama', 7, ['bana', 'agneyastra', 'varunastra'])];
  const k = applyGrants(kState(party, { flags: ['ch1.tataka_defeated'] }), C);
  assert.deepEqual(k.state.save.party[1]!.moves, ['vayavyastra', 'agneyastra', 'varunastra', 'manavastra']);
  assert.ok(k.state.save.party[1]!.pp['manavastra']! > 0);
  assert.deepEqual(k.granted.map((g) => g.moveId), ['manavastra', 'vayavyastra']);
  assert.equal(applyGrants(k.state, C).granted.length, 0, 'once');
  assert.equal(applyGrants(kState(party), C).granted.length, 0, 'not before the flag');
  const p = kState(party, { style: 'abhyasa', flags: ['ch1.tataka_defeated'] });
  assert.equal(applyGrants(p, C).state, p, 'practice: the same object');
  // through the story command: the flag's `set` gives the moves with a toast
  const g = newGame(3, 3, C, { name: 'G', avatar: 'a', style: 'katha' });
  const withRama: GameState = { ...g, save: { ...g.save, party: [...g.save.party, member('rama', 7, ['bana', 'agneyastra', 'varunastra'])] }, mode: 'script', script: { eventId: 't', frames: [{ cmds: [{ set: 'ch1.tataka_defeated' }, { say: 'x' }], pc: 0 }] }, pending: { kind: 'say', text: 'y' } };
  const after = reduce(withRama, C, { type: 'advance' });
  assert.ok(after.save.party.find((m) => m.id === 'rama')!.moves.includes('manavastra'));
  assert.ok(after.fx.some((f) => f.kind === 'toast' && /manavastra/.test(f.text)), 'a toast names the new astra');
});

test('the strategic bot: the decisive astra first; with a blow readied a counter, a recited answer, then a cover; otherwise it rotates away from a tired astra', () => {
  let s = toCommand(sacrifice());
  const pick = (st: GameState): string => {
    const c = strategicChoice(st, C);
    return 'index' in c ? st.battle!.ally.moves[c.index]! : Object.keys(c)[0]!;
  };
  assert.equal(pick(s), 'agneyastra', 'Subāhu: the Āgneya decides');
  s = toCommand(cast(s, 'agneyastra'));
  assert.equal(pick(s), 'manavastra', 'Mārīca: the Mānava decides');
  // a readied blow and no fit: the verse shield (recited) before Lakṣmaṇa's cover
  let t = toCommand(startBattle(kState([member('rama', 12, ['agneyastra', 'varunastra']), member('lakshmana', 12, ['bana'])], { heard: ['s-ma-nishada'] }), C, spec([['tataka', 6]], 'boss')));
  for (let i = 0; i < 6 && !t.battle!.warn; i++) t = toCommand(cast(t, 'agneyastra'));
  assert.equal(pick(t), 'shield');
  // rotation: after an astra, the other astra (a tired astra never wins a near tie)
  let r = toCommand(startBattle(kState([member('rama', 20, ['agneyastra', 'varunastra'])]), C, spec([['kumbhakarna', 26]], 'wild')));
  r = toCommand(cast(noFoe(r), 'agneyastra'));
  assert.equal(pick(r), 'varunastra');
});

// ───────────────────────── boss phases (v0.5b P7, WP-C) ─────────────────────────

/** Rāvaṇa's fight as the story reaches it (party and moves of a Kathā playthrough at Book 6, level floor 33). */
const RAMA6 = ['dharma_vigraha', 'aditya_hrdaya', 'brahmastra', 'vayavyastra'];
const HEARD6 = ['s-ramo-vigrahavan', 's-aditya-hrdayam', 's-ma-nishada', 's-jayatyatibalo', 's-sakrdeva', 's-anirvedah'];
/** The flag package E's Āditya-hṛdayam cutscene sets (Yuddha 6.105): Rāvaṇa's finishing phases wait for it. */
const HYMN = 'seen.aditya';
/** v0.6.1: the hymn-only phase (katha.json ravana_weary) as it stands once Rāma has recited the Āditya-hṛdayam. */
const WEARY_SPENT = ['ravana_weary', 'ravana_weary:spent'];
/**
 * Rāvaṇa's fight. In Kathā the hymn-only phase starts spent (Rāma has recited the hymn once, as after the cutscene), so
 * the floor and heads tests see every move; `weary: true` leaves it fresh (the phase begins at 60 %, as in play).
 */
function ravanaFight(ramaMoves = RAMA6, o: { style?: 'katha' | 'abhyasa'; seed?: number; hymn?: boolean; weary?: boolean } = {}): GameState {
  const party = [member('player', 33, ['pada_bana', 'lipi_raksha', 'shoka_shloka', 'shuddha_vak']), member('hanuman', 33, ['vayu_vega', 'gada', 'jaya_ghosha']), member('rama', 33, ramaMoves), member('lakshmana', 33, ['bana', 'khadga', 'agni_bana', 'viddhi'])];
  const s0 = kState(party, { chapter: 6, heard: HEARD6, ...(o.style ? { style: o.style } : {}), ...(o.hymn === false ? {} : { flags: [HYMN] }) });
  const s = startBattle({ ...s0, seed: o.seed ?? 5 }, C, spec([['ravana', 30]], 'boss', 'rama'));
  return o.weary || o.style === 'abhyasa' ? s : { ...s, battle: { ...s.battle!, bossPhases: [...WEARY_SPENT] } };
}

/**
 * Package E's cutscene (logic-cutscene.ts `cutsceneDue`, the action `cutscene-done` sets seen.aditya) when its module is
 * there; otherwise its effect: the flag, the first time Rāvaṇa is at or below 60 %.
 */
type CutsceneMod = { cutsceneDue: (s: GameState, c: typeof C) => unknown };
const cutsceneMod: Promise<CutsceneMod | null> = (async () => {
  const url = new URL('./logic-cutscene.ts', import.meta.url);
  if (!existsSync(url)) return null;
  return (await import(url.href)) as CutsceneMod;
})();
async function hymnIfDue(s: GameState): Promise<GameState> {
  const b = s.battle;
  if (!b || b.foe.id !== 'ravana' || s.save.flags[HYMN]) return s;
  const mod = await cutsceneMod;
  if (mod) return mod.cutsceneDue(s, C) ? reduce(s, C, { type: 'cutscene-done', id: 'aditya-hridayam' } as unknown as Parameters<typeof reduce>[2]) : s;
  return b.foe.hp <= Math.ceil(b.foe.maxHp * 0.6) ? { ...s, save: { ...s.save, flags: { ...s.save.flags, [HYMN]: true } } } : s;
}
const tplEn = (k: string): string => SA_BATTLE.templates[k]!.en;
/** All beats queued by a state (the turn's narration, before it is advanced). */
const queued = (s: GameState): BattleBeat[] => s.battle?.beats ?? [];

test('phases content: every phase names a real foe, its fitting move and a sa-battle beat, with a source; Rāvaṇa: the heads from half strength (floor 40 %, the brahmāstra fits), Mātali once', () => {
  const problems: string[] = [];
  for (const p of T.phases ?? []) {
    if (!idx.enemy.has(p.foe) || !p.source.trim() || !p.id) problems.push(`phase ${p.id}: foe / source`);
    if (p.fit !== undefined && !idx.move.has(p.fit)) problems.push(`phase ${p.id}: fit ${p.fit}`);
    if (p.beat !== undefined && !SA_BATTLE.templates[p.beat]) problems.push(`phase ${p.id}: beat ${p.beat}`);
    if (!(p.below > 0 && p.below < 1) || (p.floor !== undefined && !(p.floor > 0 && p.floor < p.below))) problems.push(`phase ${p.id}: shares`);
    const sa = p.beat ? saText(p.beat) : undefined;
    if (p.beat && (!sa || !getOracle().verifyLine(sa, {}).ok)) problems.push(`phase ${p.id}: beat does not verify: ${sa}`);
  }
  assert.deepEqual(problems, []);
  const r = phasesOf(C, 6, 'ravana');
  assert.deepEqual(r.map((p) => [p.below, p.floor, p.fit, p.once ?? false, p.requires, p.only ?? false]), [[0.6, undefined, 'aditya_hrdaya', true, undefined, true], [0.5, 0.4, 'brahmastra', false, HYMN, false], [0.4, undefined, undefined, true, HYMN, false]], 'the hymn alone from 60 % (v0.6.1); the heads and Mātali wait for the Āditya-hṛdayam (Yuddha 6.105)');
  assert.ok(/6\.105/.test(r[0]!.source) && /6\.107/.test(r[1]!.source) && /6\.108/.test(r[2]!.source), 'Yuddha 6.105 (the hymn), 6.107 (the heads), 6.108 (Mātali)');
  assert.deepEqual(phasesOf(C, 5, 'ravana'), [], 'Book 6 only');
  // the floor holds for a hero who holds the brahmāstra, for every move but the brahmāstra
  const rv = fighterFromEnemy('ravana', 30, C);
  const hymn = { [HYMN]: true as const };
  assert.equal(phaseFloor(C, 6, rv, { moves: RAMA6 }, 'dharma_vigraha', hymn)?.hp, Math.ceil(rv.maxHp * 0.4));
  assert.equal(phaseFloor(C, 6, rv, { moves: RAMA6 }, 'brahmastra', hymn), null);
  assert.equal(phaseFloor(C, 6, rv, { moves: ['bana', 'khadga'] }, 'bana', hymn), null, 'after the hymn a hero without the brahmāstra is never held back');
  assert.equal(phaseFloor(C, 6, rv, { moves: RAMA6 }, 'brahmastra', {})?.hp, Math.ceil(rv.maxHp * 0.4), 'before the hymn the brahmāstra is held too');
  assert.equal(phaseFloor(C, 6, rv, { moves: ['bana'] }, 'bana', {})?.hp, Math.ceil(rv.maxHp * 0.4), 'before the hymn every hero is held');
  assert.equal(isDecisive(C, 6, { ...rv, hp: 1 }, 'brahmastra', {}), false, 'before the hymn the brahmāstra is not decisive');
  assert.equal(isDecisive(C, 6, { ...rv, hp: 1 }, 'brahmastra', hymn), true);
  // phases begin at their share, `once` stays, the others may begin again
  const half = { ...rv, hp: Math.ceil(rv.maxHp * 0.5) };
  assert.deepEqual(phasesBegun(C, 6, half, [], hymn).now.map((p) => p.id), ['ravana_weary', 'ravana_heads']);
  assert.deepEqual(phasesBegun(C, 6, half, [], {}).now.map((p) => p.id), ['ravana_weary'], 'before the hymn only the hymn-only phase begins (the cutscene comes with it)');
  assert.deepEqual(phasesBegun(C, 6, { ...rv, hp: Math.ceil(rv.maxHp * 0.4) }, [...WEARY_SPENT, 'ravana_heads'], hymn).now.map((p) => p.id), ['ravana_matali']);
  assert.deepEqual(phasesBegun(C, 6, rv, [...WEARY_SPENT, 'ravana_heads', 'ravana_matali'], hymn).begun, [...WEARY_SPENT, 'ravana_matali'], 'healed above half: the heads may begin again; the hymn-only phase and Mātali stay said');
  assert.deepEqual(phasesBegun(C, 6, { ...rv, hp: 0 }, [], hymn).now, [], 'never for a fallen foe');
});

test('phases: before the Āditya-hṛdayam (Yuddha 6.105; seen.aditya) Rāvaṇa cannot be finished — every blow, the brahmāstra too, is held at 40 %, no phase begins; once the hymn is heard, Mātali speaks and the brahmāstra ends it', () => {
  // Kathā (v0.6.1): before the cutscene Rāma has not learned the hymn — no hymn-only phase holds his other moves
  let s = toCommand(ravanaFight(['dharma_vigraha', 'brahmastra', 'vayavyastra', 'agneyastra'], { hymn: false, weary: true }));
  const floor = Math.ceil(s.battle!.foe.maxHp * 0.4);
  const beats: BattleBeat[] = [];
  const moves = ['dharma_vigraha', 'brahmastra', 'vayavyastra', 'brahmastra'];
  for (let i = 0; i < 24; i++) {
    const n = cast(noFoe(s), moves[i % moves.length]!);
    beats.push(...queued(n));
    s = toCommand(n);
    assert.ok(s.battle!.foe.hp >= floor && s.battle!.phase !== 'won', `turn ${i}: Rāvaṇa ${s.battle!.foe.hp} ≥ ${floor}`);
  }
  assert.equal(s.battle!.foe.hp, floor, 'held at 40 %');
  assert.ok(!beats.some((b) => b.tactic === 'fit'), 'the brahmāstra is not decisive yet');
  assert.ok(!beats.some((b) => b.text === tplEn('kathaMatali')), 'Mātali waits for the hymn');
  assert.ok(beats.some((b) => b.text === tplEn('kathaHeads')), 'a held blow: the head grows back');
  assert.deepEqual(s.battle!.bossPhases, ['ravana_weary'], 'no phase but the hymn-only one has begun (it holds nothing while the hero lacks the hymn)');
  // the hymn (package E's cutscene sets the flag); the next blow that the heads hold brings Mātali's line, once
  s = { ...s, save: { ...s.save, flags: { ...s.save.flags, [HYMN]: true } } };
  const m = cast(noFoe(s), 'dharma_vigraha');
  assert.equal(queued(m).filter((b) => b.text === tplEn('kathaMatali')).length, 1, 'Mātali speaks');
  const end = cast(toCommand(m), 'brahmastra');
  assert.ok(queued(end).some((b) => b.tactic === 'fit'));
  assert.equal(end.battle!.phase, 'won');
});

test('phases: Rāvaṇa’s heads grow back — from half strength a blow that is not the brahmāstra cannot take him below 40 % (the heads line each time); Mātali’s line plays once; then the brahmāstra ends it (Yuddha 6.107–108)', () => {
  let s = toCommand(ravanaFight());
  const floor = Math.ceil(s.battle!.foe.maxHp * 0.4);
  const beats: BattleBeat[] = [];
  for (let i = 0; i < 24; i++) {
    const n = cast(noFoe(s), i % 2 ? 'vayavyastra' : 'dharma_vigraha');
    beats.push(...queued(n));
    s = toCommand(n);
    assert.ok(s.battle!.foe.hp >= floor, `turn ${i}: Rāvaṇa ${s.battle!.foe.hp} ≥ ${floor}`);
  }
  assert.equal(s.battle!.foe.hp, floor, 'held at 40 %');
  const heads = beats.filter((b) => b.text === tplEn('kathaHeads'));
  assert.ok(heads.length >= 3, `the heads line at half strength and on each held blow (${heads.length})`);
  assert.ok(heads.every((b) => b.textSa === saText('kathaHeads')), 'with its Sanskrit');
  assert.equal(beats.filter((b) => b.text === tplEn('kathaMatali')).length, 1, 'Mātali speaks once');
  assert.deepEqual(s.battle!.bossPhases, [...WEARY_SPENT, 'ravana_heads', 'ravana_matali']);
  // the brahmāstra ends it (the decisive story beat)
  const end = cast(s, 'brahmastra');
  assert.ok(queued(end).some((b) => b.tactic === 'fit' && b.text === tplEn('kathaFitBrahma')));
  assert.equal(end.battle!.foe.hp, 0);
  assert.equal(end.battle!.phase, 'won');
});

test('phases: a spent brahmāstra comes back to hand when the heads hold; a hero without it is never held back; other bosses and the practice game carry no phases', () => {
  let s = toCommand(ravanaFight());
  const ri = s.battle!.active;
  s = { ...s, save: { ...s.save, party: s.save.party.map((m, i) => (i === ri ? { ...m, pp: { ...m.pp, brahmastra: 0 } } : m)) } };
  for (let i = 0; i < 24 && (s.save.party[ri]!.pp['brahmastra'] ?? 0) === 0; i++) s = toCommand(cast(noFoe(s), i % 2 ? 'vayavyastra' : 'dharma_vigraha'));
  assert.equal(s.save.party[ri]!.pp['brahmastra'], 1, 'the brahmāstra is back in hand');
  assert.equal(s.battle!.foe.hp, Math.ceil(s.battle!.foe.maxHp * 0.4));
  // without the brahmāstra equipped the fight is an ordinary one
  let t = toCommand(ravanaFight(['dharma_vigraha', 'aditya_hrdaya', 'vayavyastra', 'agneyastra']));
  for (let i = 0; i < 40 && t.battle!.phase !== 'won'; i++) t = toCommand(cast(noFoe(t), i % 2 ? 'vayavyastra' : 'dharma_vigraha'));
  assert.equal(t.battle!.phase, 'won', 'never held back');
  // other bosses: no field; the practice game: no field, no floor
  const k = toCommand(cast(noFoe(toCommand(startBattle(kState([member('rama', 33, RAMA6)], { chapter: 6, heard: HEARD6 }), C, spec([['kumbhakarna', 26]], 'boss', 'rama')))), 'dharma_vigraha'));
  assert.equal(k.battle!.bossPhases, undefined);
  const p = ravanaFight(RAMA6, { style: 'abhyasa' });
  assert.equal(p.battle!.bossPhases, undefined);
});

test('phases (v0.6.1): from 60 % the Āditya-hṛdayam is Rāma’s only move until he has recited it once — the menu greys the rest, a tap on them does nothing; then every move is back; a hero without the hymn, other foes and the practice game are never held', () => {
  let s = toCommand(ravanaFight(RAMA6, { weary: true }));
  for (let i = 0; i < 40 && !(s.battle!.bossPhases ?? []).includes('ravana_weary'); i++) s = toCommand(cast(noFoe(s), 'vayavyastra'));
  assert.ok(s.battle!.foe.hp <= Math.ceil(s.battle!.foe.maxHp * 0.6), 'at or below 60 %');
  assert.deepEqual(battleMenu(s, C).moves.filter((m) => m.usable).map((m) => m.id), ['aditya_hrdaya'], 'only the hymn');
  const hp = s.battle!.foe.hp;
  assert.equal(battleAction(battleAction(s, C, { type: 'choose', index: 0 }), C, { type: 'choose', index: RAMA6.indexOf('dharma_vigraha') }).battle!.foe.hp, hp, 'another move does nothing');
  s = toCommand(cast(noFoe(s), 'aditya_hrdaya'));
  assert.ok(s.battle!.bossPhases!.includes('ravana_weary:spent'), 'spent once recited');
  const menu = battleMenu(s, C).moves;
  assert.ok(menu.filter((m) => m.pp > 0).every((m) => m.usable) && menu.some((m) => m.id === 'brahmastra' && m.usable), 'every move is back');
  // the helpers: a hero without the hymn; a spent phase; another foe; the cast of another move spends nothing
  assert.equal(onlyMove(C, 6, 'ravana', ['ravana_weary'], ['bana', 'khadga']), null);
  assert.equal(onlyMove(C, 6, 'ravana', ['ravana_weary'], RAMA6), 'aditya_hrdaya');
  assert.equal(onlyMove(C, 6, 'ravana', WEARY_SPENT, RAMA6), null);
  assert.equal(onlyMove(C, 6, 'kumbhakarna', ['ravana_weary'], RAMA6), null);
  assert.deepEqual(spendOnly(C, 6, 'ravana', ['ravana_weary'], 'brahmastra'), ['ravana_weary']);
  assert.deepEqual(spendOnly(C, 6, 'ravana', ['ravana_weary'], 'aditya_hrdaya'), WEARY_SPENT);
  // practice: no phases, every move with PP is usable at any HP
  const p0 = toCommand(ravanaFight(RAMA6, { style: 'abhyasa' }));
  const p = { ...p0, battle: { ...p0.battle!, foe: { ...p0.battle!.foe, hp: Math.ceil(p0.battle!.foe.maxHp * 0.5) } } };
  assert.equal(p.battle.bossPhases, undefined);
  assert.ok(battleMenu(p, C).moves.filter((m) => m.pp > 0).every((m) => m.usable), 'practice: nothing greyed');
});

test('phases: every bot beats Rāvaṇa — strategic (≤ 15 turns), spammer, 70 % and careless 70 % reciters, with the Āditya-hṛdayam at 60 % (package E’s cutscene, or its effect); Mātali speaks at most once a fight', async () => {
  const BOTS = [
    { name: 'strategic', policy: 'strategic' as const, accuracy: 1 },
    { name: 'spammer', policy: 'spam' as const, accuracy: 1 },
    { name: '70 %', accuracy: 0.7 },
    { name: 'careless 70 %', accuracy: 0.7, careless: 0.5 },
  ];
  const mean: Record<string, number> = {};
  for (const bot of BOTS) {
    const turns: number[] = [];
    for (let seed = 1; seed <= 25; seed++) {
      let s = ravanaFight(RAMA6, { seed, hymn: false, weary: true });
      const ctx = { recited: false, rested: false, reciter: { accuracy: bot.accuracy, rng: createRng(seed) }, ...(bot.careless ? { careless: { chance: bot.careless, rng: createRng(seed + 99) } } : {}), ...(bot.policy ? { policy: bot.policy } : {}) };
      let matali = 0;
      for (let n = 0; n < 3000 && s.battle && !(['won', 'lost'].includes(s.battle.phase) && s.battle.beats.length === 0); n++) {
        if (s.battle.phase === 'command') s = await hymnIfDue(s);
        const before = s;
        for (const a of botActions(s, C, ctx)) {
          const nx = battleAction(s, C, a);
          if (nx !== s) {
            s = nx;
            break;
          }
        }
        if (s === before) break;
        // a turn resolves from an empty queue: the beats it adds are the new tail
        if (s.battle && before.battle && s.battle.beats.length > before.battle.beats.length) matali += s.battle.beats.slice(before.battle.beats.length).filter((b) => b.text === tplEn('kathaMatali')).length;
      }
      assert.equal(s.battle?.phase, 'won', `${bot.name} seed ${seed}: Rāvaṇa falls (turn ${s.battle?.turn}, ${s.battle?.foe.hp} HP)`);
      assert.ok(s.save.flags[HYMN], 'the hymn came first');
      assert.ok(matali <= 1, `${bot.name} seed ${seed}: Mātali speaks at most once (${matali})`);
      turns.push(s.battle!.turn);
    }
    mean[bot.name] = turns.reduce((a, b) => a + b, 0) / turns.length;
    if (bot.policy === 'strategic') assert.ok(Math.max(...turns) <= 15, `strategic: at most 15 turns (${Math.max(...turns)})`);
  }
  assert.ok((mean['spammer'] as number) > (mean['strategic'] as number), `the spammer is slower (${JSON.stringify(mean)})`);
});
