/**
 * Sambhāṣaṇa battle narration gate (OWNER: sa-battle). Rules: notes/sambhashana.md; design: notes/sa-battle.md.
 *
 * 1. content/sa-battle.json is complete: every ally / enemy / move / battle item has the forms the templates need,
 *    every template the battle logic asks for exists (and none is stale), gendered variants line up word for word.
 * 2. EVERY template instantiation verifies with the oracle (getOracle().verifyLine): each template × every name of
 *    its domain × gender variant (the player's {g:masc|fem} both ways) × every move / item / stat × numbers 1…999.
 *    Composite beats (crit / effectiveness prefix + damage, "refreshed" + recovery) are checked too.
 * 3. Simulated battles (wild, boss, duel; perfect, weak and random bots over seeds): every beat either has a textSa
 *    that verifies, or is story text (spec.intro, enemy intro / defeatLine) with a content.dialogueSa entry.
 * This file holds no Sanskrit: everything comes from the JSON and the oracle.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { type Level, type Rng, createRng } from '@sdk';
import { cardinal } from '@sanskrit';
import type { BattleBeat, BattleSpec, EventCmd, GameContent, GameState, PartyMember, SaveData } from './types';
import { loadContent } from './content';
import { indexOf } from './logic-util';
import { SA_BATTLE, type SaRef, type SaSlots, battleAction, battleItems, battleMenu, battleOutcome, mergeGender, saFormsOf, saNumber, saText, startBattle } from './logic-battle';
import { learnableMoves, newMember } from './logic-progress';
import { getOracle } from './sa-verify';
import { WARN_TEMPLATE } from './logic-tactics';

const C: GameContent = loadContent();
const idx = indexOf(C);
const O = getOracle();
const MAX_LINES = 60;
const report = (lines: string[]): string => `${lines.length} problem(s):\n  ${lines.slice(0, MAX_LINES).join('\n  ')}${lines.length > MAX_LINES ? `\n  … ${lines.length - MAX_LINES} more` : ''}`;

type Kind = SaRef['kind'];
const KEYS = Object.keys(SA_BATTLE.templates);
const ALLIES: SaRef[] = C.allies.map((a) => ({ kind: 'ally', id: a.id }));
const ENEMIES: SaRef[] = C.enemies.map((e) => ({ kind: 'enemy', id: e.id }));
const GROUPS: SaRef[] = Object.keys(SA_BATTLE.forms.group).map((id) => ({ kind: 'group', id }));
const MOVES = C.moves.map((m) => m.id);
/** Items that can appear in a beat: usable in battle (not key items) and enemy drops. */
const ITEMS = [...new Set([...C.items.filter((i) => i.kind !== 'key').map((i) => i.id), ...C.enemies.flatMap((e) => (e.drops ?? []).map((d) => d.itemId))])];
const WORDS = [...new Set(C.enemies.flatMap((e) => e.restoresWords ?? []))].filter((w) => idx.lex.has(w));
const NUMBERS = Array.from({ length: 999 }, (_v, i) => i + 1);

/** Which actors each {x}-template is used with in logic-battle.ts. */
const DOMAIN: Record<string, Kind[]> = {
  appearWild: ['enemy'], appearNext: ['enemy'], appearBoss: ['enemy'], appearDuel: ['enemy'], foeDown: ['enemy'], duelFoeDown: ['enemy'],
  kathaEchoIntro: ['enemy'], kathaEchoModel: ['enemy'], kathaEchoDown: ['enemy'], kathaEchoSay: ['ally'],
  // v0.5a Kathā tactics (logic-tactics): a boss's warned blow and its strike lines name the foe; the verse shield the hero
  kathaWarn: ['enemy'], kathaWarnStones: ['enemy'], kathaStrikeStones: ['enemy'], kathaWarnBlood: ['enemy'], kathaStrikeBlood: ['enemy'], kathaShield: ['ally'],
  // v0.5b (WP-C) the verse-chain duel: the opponent's rule, line and stumped lines name the foe
  kathaChainRule: ['enemy'], kathaChainSays: ['enemy'], kathaChainStumped: ['enemy'],
  go: ['ally'], duelStepForward: ['ally'], comeBack: ['ally'], kathaRecite: ['ally'], kathaDuelRecite: ['ally'], weary: ['ally'], allyDown: ['ally'], duelAllyDown: ['ally'], levelUp: ['ally'], learned: ['ally'], xp: ['ally'], revived: ['ally'], ppFull: ['ally'], ppRecharged: ['ally'],
  uses: ['ally', 'enemy'], duelAnswers: ['ally', 'enemy'], duelCounters: ['ally', 'enemy'], takes: ['ally', 'enemy'], duelTakes: ['ally', 'enemy'], recovers: ['ally', 'enemy'], fullStrength: ['ally', 'enemy'], stun: ['ally', 'enemy'], bound: ['ally', 'enemy'],
  statRise: ['ally', 'enemy', 'group'], statRiseSharp: ['ally', 'enemy', 'group'], statMax: ['ally', 'enemy', 'group'], statFall: ['ally', 'enemy'], statFallSharp: ['ally', 'enemy'], statMin: ['ally', 'enemy'],
};
const refsOf = (kinds: Kind[]): SaRef[] => kinds.flatMap((k) => (k === 'ally' ? ALLIES : k === 'enemy' ? ENEMIES : GROUPS));
const variants = (key: string): string[] => {
  const t = SA_BATTLE.templates[key]?.sa;
  return t === undefined ? [] : typeof t === 'string' ? [t] : [t.m, t.f];
};
const slotsIn = (key: string): { x: string[]; m: string[]; i: string[]; n: boolean; s: boolean; word: boolean } => {
  const all = variants(key).join(' ');
  const cases = (who: string): string[] => [...new Set([...all.matchAll(new RegExp(`\\{${who}\\.(\\w+)\\}`, 'g'))].map((m) => m[1] as string))];
  return { x: cases('x'), m: cases('m'), i: cases('i'), n: all.includes('{n}'), s: all.includes('{s}'), word: all.includes('{word}') };
};
const refName = (r: SaRef): string => `${r.kind}.${r.id}`;

// ───────────────────────── 1. data ─────────────────────────

test('sa-battle: every ally, enemy, move and battle item has its forms and gender', () => {
  const problems: string[] = [];
  const need = (r: SaRef, cases: string[]): void => {
    const f = saFormsOf(r);
    if (!f) return void problems.push(`${refName(r)}: no entry in forms.${r.kind}`);
    if (!['m', 'f', 'n', 'player'].includes(f.gender)) problems.push(`${refName(r)}: gender "${f.gender}" (m / f / n / player)`);
    for (const c of cases) if (!f[c as 'nom']?.trim()) problems.push(`${refName(r)}: missing the ${c} form`);
  };
  for (const r of ALLIES) need(r, ['nom', 'gen', 'voc']);
  for (const r of ENEMIES) need(r, ['nom', 'gen']);
  for (const r of GROUPS) need(r, ['gen']);
  for (const id of MOVES) need({ kind: 'move' as Kind, id }, ['acc', 'ins']);
  for (const id of ITEMS) need({ kind: 'item' as Kind, id }, ['acc']);
  assert.equal(saFormsOf({ kind: 'ally', id: 'player' })?.gender, 'player', 'the player has gender "player" (both readings as {g:masc|fem})');
  // the feminine foes (Tāṭakā, Laṅkā, Siṃhikā, Surasā, the rākṣasī) must take the feminine participles
  for (const id of ['tataka', 'lanka_devi', 'simhika', 'surasa_duel', 'rakshasi']) if (idx.enemy.has(id)) assert.equal(saFormsOf({ kind: 'enemy', id })?.gender, 'f', `enemy.${id} is feminine`);
  // no stale forms
  const known: Record<string, Set<string>> = { ally: new Set(C.allies.map((a) => a.id)), enemy: new Set(C.enemies.map((e) => e.id)), move: new Set(MOVES), item: new Set(C.items.map((i) => i.id)), group: new Set(['heroes']) };
  for (const [kind, rec] of Object.entries(SA_BATTLE.forms)) for (const id of Object.keys(rec)) if (!known[kind]?.has(id)) problems.push(`forms.${kind}.${id}: no such ${kind} in defs.json (stale)`);
  assert.equal(problems.length, 0, report(problems));
});

test('sa-battle: the templates the battle logic uses all exist, none is stale, and they are well formed', () => {
  const src = readFileSync(new URL('./logic-battle.ts', import.meta.url), 'utf8');
  assert.ok(!/[ऀ-ॿ]/.test(src), 'logic-battle.ts holds no Devanagari: all Sanskrit lives in content/sa-battle.json');
  // quoted words on the lines that name templates (saText calls, the vocab `sa: {…}` records, intro keys)
  const NON_KEYS = new Set(['ally', 'foe', 'enemy', 'group', 'heroes', 'atk', 'def', 'switch', 'heal', 'buff', 'debuff', 'faint', 'flee', 'hit', 'miss', 'merge', 'tap', 'correct', 'wrong', 'lose', 'levelup', 'command', 'beats', 'duel', 'boss', 'wild', 'party', 'self', 'string', 'player', 'm', 'f', 'n', 'a', 'b']);
  const used = new Set<string>();
  for (const line of src.split('\n')) {
    if (!/saText\(|tplBeat\(|\bsa: \{|'appear/.test(line) || /^\s*(\/\/|\*)/.test(line) || /function saText|function tplBeat|data\.templates/.test(line)) continue;
    for (const m of line.matchAll(/'(\w+)'/g)) if (!NON_KEYS.has(m[1] as string) || KEYS.includes(m[1] as string)) used.add(m[1] as string);
  }
  // v0.5a: the tactics lines are named by content/katha.json `tactics` (fits[].beat, warnings[].ready / strike) and by
  // logic-tactics WARN_TEMPLATE (a boss's default warning)
  const tactics = C.katha?.tactics;
  for (const f of tactics?.fits ?? []) used.add(f.beat);
  for (const w of tactics?.warnings ?? []) for (const k of [w.ready, w.strike]) if (k) used.add(k);
  // v0.5b P7 (WP-C): boss phases name their beats in content/katha.json `tactics.phases`
  for (const p of tactics?.phases ?? []) if (p.beat) used.add(p.beat);
  used.add(WARN_TEMPLATE);
  ['super', 'weak'].forEach((k) => used.add(k)); // via saEffect(d.effective)
  const problems: string[] = [];
  for (const k of used) if (!KEYS.includes(k)) problems.push(`template "${k}" is used in logic-battle.ts but missing in content/sa-battle.json`);
  for (const k of KEYS) if (!used.has(k)) problems.push(`template "${k}" is never used by logic-battle.ts (stale)`);
  for (const k of KEYS) {
    const t = SA_BATTLE.templates[k]!;
    if (!t.en?.trim()) problems.push(`${k}: "en" (the English beat it translates) is missing`);
    const vs = variants(k);
    if (typeof t.sa !== 'string' && vs[0]!.split(' ').length !== vs[1]!.split(' ').length) problems.push(`${k}: the masculine and feminine variants must have the same number of words (they merge word by word into {g:masc|fem})`);
    if (typeof t.sa !== 'string' && vs[0] === vs[1]) problems.push(`${k}: identical m / f variants: write one string`);
    for (const v of vs) {
      const rest = v.replace(/\{(x|m|i)\.(nom|acc|ins|gen|voc)\}|\{(n|s|word|player)\}|\{g:[^{}|]*\|[^{}]*\}/g, '');
      if (/[{}]/.test(rest)) problems.push(`${k}: unknown placeholder in "${v}"`);
      if (/[A-Za-z]/.test(rest)) problems.push(`${k}: Latin letters in "${v}"`);
      if (!/[।?!]$/.test(v)) problems.push(`${k}: must end with ।, ? or ! — "${v}"`);
      if (slotsIn(k).x.length && !DOMAIN[k]) problems.push(`${k}: uses {x.…} but has no DOMAIN entry in sa-battle.test.ts`);
    }
  }
  assert.equal(problems.length, 0, report(problems));
});

test('sa-battle: mergeGender keeps shared words and marks the differing ones', () => {
  assert.equal(mergeGender('a b, c!', 'a d, c!'), 'a {g:b|d}, c!');
  assert.equal(mergeGender('x y', 'x y'), 'x y');
  assert.equal(mergeGender('{player} a', '{player} a b'), undefined);
});

// ───────────────────────── 2. every instantiation ─────────────────────────

/** All slot fillings of a template (the full cartesian product of its slots). */
function* instantiations(key: string): Generator<SaSlots> {
  const sl = slotsIn(key);
  const xs: (SaRef | undefined)[] = sl.x.length ? refsOf(DOMAIN[key] ?? []) : [undefined];
  const ms: (string | undefined)[] = sl.m.length ? MOVES : [undefined];
  const is: (string | undefined)[] = sl.i.length ? ITEMS : [undefined];
  const ss: ('atk' | 'def' | undefined)[] = sl.s ? ['atk', 'def'] : [undefined];
  const ns: (number | undefined)[] = sl.n ? NUMBERS : [undefined];
  const ws: (string | undefined)[] = sl.word ? WORDS : [undefined];
  for (const x of xs) for (const m of ms) for (const i of is) for (const s of ss) for (const n of ns) for (const word of ws) yield { ...(x ? { x } : {}), ...(m ? { m } : {}), ...(i ? { i } : {}), ...(s ? { s } : {}), ...(n !== undefined ? { n } : {}), ...(word ? { word } : {}) };
}
const describe = (key: string, sl: SaSlots): string => [key, sl.x && refName(sl.x), sl.m && `move.${sl.m}`, sl.i && `item.${sl.i}`, sl.s, sl.n !== undefined && `n=${sl.n}`, sl.word && `w:${sl.word}`].filter(Boolean).join(' · ');

test('sa-battle: every template × every name × gender × move / item / stat × numbers 1…999 verifies with the oracle', () => {
  const problems: string[] = [];
  let lines = 0;
  const perKey: string[] = [];
  for (const key of KEYS) {
    let k = 0;
    for (const sl of instantiations(key)) {
      const sa = saText(key, sl);
      lines++;
      k++;
      if (sa === undefined) {
        problems.push(`${describe(key, sl)}: no Sanskrit (a form is missing)`);
        continue;
      }
      if (/\{(x|m|i)\.|\{(n|s|word)\}/.test(sa)) problems.push(`${describe(key, sl)}: unfilled slot in "${sa}"`);
      if (sl.x && saFormsOf(sl.x)?.gender === 'player' && typeof SA_BATTLE.templates[key]!.sa !== 'string' && !sa.includes('{g:')) problems.push(`${describe(key, sl)}: the player's line has no {g:masc|fem}: "${sa}"`);
      const r = O.verifyLine(sa);
      if (!r.ok) problems.push(`${describe(key, sl)}: "${sa}" → ${r.errors.join('; ')}`);
    }
    const sl = slotsIn(key);
    const want = (sl.x.length ? refsOf(DOMAIN[key] ?? []).length : 1) * (sl.m.length ? MOVES.length : 1) * (sl.i.length ? ITEMS.length : 1) * (sl.s ? 2 : 1) * (sl.n ? 999 : 1) * (sl.word ? WORDS.length : 1);
    if (k !== want || k === 0) problems.push(`${key}: ${k} instantiations, expected ${want} (> 0)`);
    perKey.push(`${key} ${k}`);
  }
  console.log(`# sa-battle: ${KEYS.length} templates, ${lines} instantiations verified (${ALLIES.length} allies, ${ENEMIES.length} enemies, ${MOVES.length} moves, ${ITEMS.length} items, ${WORDS.length} restored words, n = 1…999)`);
  assert.equal(problems.length, 0, report(problems));
});

test('sa-battle: composite beats (critical / effectiveness + damage, refreshed + recovery) verify', () => {
  const problems: string[] = [];
  const pre: string[][] = [[], ['super'], ['weak'], ['crit'], ['crit', 'super'], ['crit', 'weak']];
  const ns = [1, 2, 9, 12, 99, 100, 101, 123, 200, 512, 999];
  for (const takes of ['takes', 'duelTakes']) {
    for (const x of refsOf(['ally', 'enemy'])) {
      for (const p of pre) {
        for (const n of ns) {
          const parts = [...p.map((k) => saText(k)), saText(takes, { x, n })];
          const sa = parts.every((s) => s !== undefined) ? parts.join(' ') : undefined;
          if (sa === undefined) problems.push(`${[...p, takes].join('+')} · ${refName(x)} · n=${n}: missing part`);
          else if (!O.verifyLine(sa).ok) problems.push(`${[...p, takes].join('+')} · ${refName(x)} · n=${n}: "${sa}" → ${O.verifyLine(sa).errors.join('; ')}`);
        }
      }
    }
  }
  for (const x of ALLIES) for (const n of NUMBERS) {
    const sa = `${saText('refreshed')} ${saText('recovers', { x, n })}`;
    const r = O.verifyLine(sa);
    if (!r.ok) problems.push(`refreshed+recovers · ${refName(x)} · n=${n}: "${sa}" → ${r.errors.join('; ')}`);
  }
  assert.equal(problems.length, 0, report(problems));
});

test('sa-battle: numbers are Sanskrit words for 1…9999 (cardinal 1–100, 1000; larger ones joined by "and") and verify', () => {
  const problems: string[] = [];
  for (let n = 1; n <= 9999; n++) {
    const w = saNumber(n);
    if (n <= 100 || n === 1000) assert.equal(w, cardinal(n));
    if (/[0-9०-९]/.test(w)) problems.push(`${n}: digits in "${w}"`);
    const r = O.verifyLine(`${w}।`);
    if (!r.ok) problems.push(`${n}: "${w}" → ${r.errors.join('; ')}`);
  }
  assert.equal(saNumber(12345), '१२३४५', 'beyond 9999: Devanagari digits');
  assert.ok(O.verifyLine(`${saNumber(12345)}।`).ok);
  assert.equal(problems.length, 0, report(problems));
});

// ───────────────────────── 3. simulated battles ─────────────────────────

function mkState(party: PartyMember[], seed: number, level: Level, items: Record<string, number> = {}, avatar: 'a' | 'b' = 'a'): GameState {
  const shlokas: SaveData['shlokas'] = Object.fromEntries(C.shlokas.map((s) => [s.id, { heard: true, restored: true, best: 1 }]));
  const save: SaveData = { v: 1, playerName: 'Test', avatar, mapId: 'm', x: 1, y: 1, facing: 'down', respawn: { mapId: 'm', x: 1, y: 1 }, chapter: 6 as SaveData['chapter'], objective: '', flags: {}, party, items, niska: 0, words: {}, shlokas, step: 0, npcPos: {}, playMs: 0, completedChapters: [] };
  return { v: 1, seed, tick: 0, level, save, mode: 'explore', script: null, pending: null, battle: null, recital: null, session: { correct: 0, total: 0, swift: 0, practised: [], shlokasHeard: [], shlokasRestored: [], battlesWon: 0, chaptersCompleted: [] }, fx: [] };
}

/** A party at `level`; `rot` rotates which learnable moves are equipped, so different seeds use different moves. */
function buildParty(ids: string[], level: number, rot: number): PartyMember[] {
  const save = { shlokas: Object.fromEntries(C.shlokas.map((s) => [s.id, { heard: true, restored: true, best: 1 }])) };
  return ids.map((id) => {
    const m = newMember(idx.ally.get(id)!, level, C);
    const mv = learnableMoves(m, save, C);
    const moves = mv.length <= 4 ? mv : Array.from({ length: 4 }, (_v, k) => mv[(rot + k) % mv.length] as string);
    const pp = { ...m.pp };
    for (const x of moves) pp[x] = idx.move.get(x)!.pp;
    return { ...m, moves, pp };
  });
}

/** Story battle specs (intro, kind, enemies) as the story files stage them. */
function storySpecs(): BattleSpec[] {
  const out: BattleSpec[] = [];
  const walk = (cmds: EventCmd[] | undefined): void => {
    for (const c of cmds ?? []) {
      const o = c as unknown as Record<string, unknown>;
      if (o.battle && typeof o.battle === 'object') out.push(o.battle as BattleSpec);
      for (const k of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose']) if (Array.isArray(o[k])) walk(o[k] as EventCmd[]);
    }
  };
  for (const e of C.events) walk(e.cmds);
  return out;
}

const STORY_TEXT = new Set<string>([...C.enemies.flatMap((e) => [e.intro, e.defeatLine]), ...storySpecs().map((s) => s.intro)].filter((t): t is string => !!t));

/** Every beat has a verified textSa, or is story text with a dialogueSa entry. */
function checkBeat(b: BattleBeat, where: string, problems: string[], seen: Set<string>): void {
  if (b.textSa === undefined) {
    if (!STORY_TEXT.has(b.text)) problems.push(`${where}: beat "${b.text}" has no textSa and is not story text`);
    else if (!C.dialogueSa?.[b.text]) problems.push(`${where}: story beat "${b.text}" has no content.dialogueSa entry`);
    return;
  }
  seen.add(b.text.replace(/\{[^}]*\}|\d+/g, '_'));
  const r = O.verifyLine(b.textSa, { en: b.text });
  if (!r.ok) problems.push(`${where}: "${b.text}" → "${b.textSa}": ${r.errors.join('; ')}`);
}

type Bot = 'perfect' | 'weak' | 'random';
function play(s0: GameState, sp: BattleSpec, bot: Bot, rng: Rng, where: string, problems: string[], seen: Set<string>): 'win' | 'lose' | 'run' | null {
  let s = startBattle(s0, C, sp);
  let checked = 0;
  for (let steps = 0; battleOutcome(s) === null && steps < 4000; steps++) {
    const b = s.battle!;
    // every beat once, as it is queued
    for (; checked < b.beats.length; checked++) checkBeat(b.beats[checked]!, where, problems, seen);
    switch (b.phase) {
      case 'intro': case 'beats': case 'won': case 'lost': case 'fled':
        s = battleAction(s, C, { type: 'advance' });
        checked = Math.max(0, checked - 1);
        break;
      case 'feedback':
        s = battleAction(s, C, { type: 'advance' });
        break;
      case 'command': {
        const menu = battleMenu(s, C);
        const pick = bot === 'random' ? rng.int(4) : b.ally.hp / b.ally.maxHp < 0.3 && menu.items.length && rng.chance(0.5) ? 2 : rng.chance(0.03) ? 1 + rng.int(3) : 0;
        s = battleAction(s, C, { type: 'choose', index: pick });
        break;
      }
      case 'pick-move': {
        const menu = battleMenu(s, C);
        const usable = menu.moves.flatMap((m, i) => (m.usable ? [i] : []));
        s = battleAction(s, C, { type: 'choose', index: usable.length ? (usable[rng.int(usable.length)] as number) : -1 });
        break;
      }
      case 'challenge': {
        const p = s.pending;
        assert.ok(p?.kind === 'challenge');
        const ok = rng.chance(bot === 'perfect' ? 1 : bot === 'weak' ? 0.15 : 0.6);
        const fast = ok && rng.chance(0.5);
        const ch = p.challenge;
        const timeMs = fast ? 800 : Math.round(ch.timeLimitMs * 0.7);
        const sm = ch.smarana; // Kathā recitation: the right chunk, a wrong one, or automatic recitation
        if (sm) {
          const opts = sm.gapOptions[0] ?? [];
          const picks = sm.gaps.length ? [ok ? sm.gapAnswers[0]![0]! : opts.find((o) => !sm.gapAnswers[0]!.includes(o.id))!.id] : [];
          s = battleAction(s, C, rng.chance(0.1) ? { type: 'answer', auto: true, timeMs: 0 } : { type: 'answer', picks, timeMs: 1200 });
          break;
        }
        s = ch.tiles ? battleAction(s, C, { type: 'answer', order: ok ? ch.orders![0]! : [], timeMs }) : battleAction(s, C, { type: 'answer', option: ok ? ch.answers![0]! : '\u0000wrong', timeMs });
        break;
      }
      case 'pick-switch': {
        const menu = battleMenu(s, C);
        s = battleAction(s, C, { type: 'choose', index: !menu.forcedSwitch && rng.chance(0.3) ? -1 : (menu.switchable[rng.int(menu.switchable.length)] ?? -1) });
        break;
      }
      case 'pick-item': {
        const n = battleItems(s, C).length;
        s = battleAction(s, C, { type: 'choose', index: n && rng.chance(0.85) ? rng.int(n) : -1 });
        break;
      }
    }
  }
  if (s.battle) for (; checked < s.battle.beats.length; checked++) checkBeat(s.battle.beats[checked]!, where, problems, seen);
  return battleOutcome(s);
}

test('sa-battle: every beat of simulated battles has a verified textSa or is story text with a dialogueSa entry', () => {
  const problems: string[] = [];
  const seen = new Set<string>();
  const outcomes: Record<string, number> = {};
  const wild = ['nishachara', 'yatudhana', 'rakshasi', 'maya_mriga', 'vrka'].filter((id) => idx.enemy.has(id));
  const all = C.allies.map((a) => a.id);
  const items = Object.fromEntries(C.items.filter((i) => i.kind !== 'key').map((i) => [i.id, 3]));
  const specs: { sp: BattleSpec; lvl: number }[] = [
    ...wild.flatMap((id) => [4, 25].map((lvl) => ({ sp: { enemies: [{ id, level: lvl }], kind: 'wild' as const, canRun: true, canLose: false, bg: 'forest', music: 'battle' } as BattleSpec, lvl }))),
    ...C.enemies.filter((e) => !wild.includes(e.id)).map((e) => ({ sp: { enemies: [{ id: e.id, level: 20 }, { id: wild[0] ?? e.id, level: 18 }], kind: e.id.endsWith('_duel') ? ('duel' as const) : ('boss' as const), canRun: false, canLose: true, bg: 'forest', music: 'boss' } as BattleSpec, lvl: 20 })),
    ...storySpecs().map((sp) => ({ sp, lvl: Math.max(...sp.enemies.map((e) => e.level)) })),
  ];
  let battles = 0;
  for (const [si, { sp, lvl }] of specs.entries()) {
    for (const seed of [1, 2]) {
      for (const bot of ['perfect', 'weak', 'random'] as Bot[]) {
        const rng = createRng(seed * 7919 + si * 31 + bot.length);
        const ids = sp.kind === 'duel' ? ['player', 'rama', 'hanuman'] : seed === 1 ? ['player', 'rama', 'lakshmana'] : all;
        const party = buildParty(ids, bot === 'weak' ? Math.max(2, lvl - 4) : lvl + 3, seed + si);
        const avatar = seed % 2 ? 'a' : 'b';
        const s0 = mkState(party, seed * 1000 + si, 3, bot === 'perfect' && seed === 2 ? {} : items, avatar);
        const out = play(s0, sp, bot, rng, `${sp.kind}:${sp.enemies.map((e) => e.id).join('+')} · ${bot} · seed ${seed}`, problems, seen);
        outcomes[out ?? 'unfinished'] = (outcomes[out ?? 'unfinished'] ?? 0) + 1;
        battles++;
      }
    }
  }
  console.log(`# sa-battle: ${battles} simulated battles (${Object.entries(outcomes).map(([k, v]) => `${k} ${v}`).join(' · ')}), ${seen.size} distinct beat shapes with textSa`);
  assert.equal(problems.length, 0, report(problems));
  assert.ok((outcomes.win ?? 0) > 0 && (outcomes.lose ?? 0) > 0 && (outcomes.run ?? 0) > 0, `win, lose and run paths all played: ${JSON.stringify(outcomes)}`);
  assert.ok(seen.size >= 30, `the bots met at least 30 distinct beat kinds (got ${seen.size})`);
});

test('sa-battle: Kathā battles (recital line, half-effect outcome folded into the effect beat) — every beat verifies', () => {
  const problems: string[] = [];
  const seen = new Set<string>();
  const outcomes: Record<string, number> = {};
  const smrti: NonNullable<SaveData['smrti']> = {};
  C.shlokas.forEach((sh, i) => sh.padas.forEach((_p, k) => (smrti[`${sh.id}:${k}`] = { level: 1 + ((i + k) % 3), streak: 0 })));
  const specs = storySpecs();
  for (const [si, sp] of specs.entries()) {
    for (const bot of ['perfect', 'weak', 'random'] as Bot[]) {
      const lvl = Math.max(...sp.enemies.map((e) => e.level));
      const ids = sp.kind === 'duel' ? ['player', 'rama', 'hanuman'] : ['player', 'rama', 'lakshmana', 'hanuman'];
      const base = mkState(buildParty(ids, bot === 'weak' ? Math.max(2, lvl - 2) : lvl + 4, si), 77 + si, 3, {}, si % 2 ? 'a' : 'b');
      // (v0.5b: Rāvaṇa's phases wait for the Āditya-hṛdayam — package E's cutscene sets seen.aditya at ≤ 60 %)
      const s0: GameState = { ...base, save: { ...base.save, style: 'katha', flags: { ...base.save.flags, 'style.katha': true, 'seen.aditya': true }, smrti } };
      const out = play(s0, sp, bot, createRng(si * 131 + bot.length), `Kathā ${sp.kind}:${sp.enemies.map((e) => e.id).join('+')} · ${bot}`, problems, seen);
      outcomes[out ?? 'unfinished'] = (outcomes[out ?? 'unfinished'] ?? 0) + 1;
    }
  }
  console.log(`# sa-battle Kathā: ${specs.length * 3} simulated battles (${Object.entries(outcomes).map(([k, v]) => `${k} ${v}`).join(' · ')})`);
  assert.equal(problems.length, 0, report(problems));
  const shapes = [...seen].join('\n');
  for (const re of [/recites the line and invokes/, /answers with a line of verse/, /^The line falters: only half the power lands\. .*takes/m, /^The line falters: only half the power lands\. .*(rises|falls|recovers|refreshed)/m]) assert.match(shapes, re, `a Kathā beat of shape ${re} was met and verified`);
  // v0.5b (WP-C): the verse-chain duel (the rule, the opponent's lines, a link) and Rāvaṇa's phases
  for (const re of [/^_ says a line of verse\. Answer with a line/m, /^_ says a line of verse\.$/m, /^_ answers with a line of verse! _'s conviction wavers/m, /^A head of _ falls, but a new head rises/m]) assert.match(shapes, re, `a v0.5b beat of shape ${re} was met and verified`);
});

test('sa-battle: story-text beats keep textSa unset (the view looks them up in dialogueSa)', () => {
  const sp = storySpecs().find((s) => s.intro);
  assert.ok(sp, 'a story battle with an intro');
  const s = startBattle(mkState(buildParty(['player', 'rama'], 20, 0), 1, 3), C, sp);
  const first = s.battle!.beats[0]!;
  assert.equal(first.text, sp.intro);
  assert.equal(first.textSa, undefined);
  assert.ok(C.dialogueSa?.[first.text], 'the intro has a Sanskrit entry in dialogueSa');
  const second = s.battle!.beats[1]!;
  assert.ok(second.textSa && O.verifyLine(second.textSa, { en: second.text }).ok, `the next beat has its own verified Sanskrit: ${second.textSa}`);
});

test('sa-battle: the player is named by {player} with {g:masc|fem} words, and textSa is deterministic', () => {
  const r = saText('uses', { x: { kind: 'ally', id: 'player' }, m: MOVES[0]! });
  assert.ok(r && r.includes('{player}') && r.includes('{g:'), `player line: ${r}`);
  const fem = saText('allyDown', { x: { kind: 'enemy', id: 'tataka' } });
  const masc = saText('allyDown', { x: { kind: 'enemy', id: 'khara' } });
  assert.ok(fem && masc && fem.split(' ').length === masc.split(' ').length && fem !== masc.replace(SA_BATTLE.forms.enemy.khara!.nom!, SA_BATTLE.forms.enemy.tataka!.nom!), 'feminine actors take the feminine variant');
  const sp: BattleSpec = { enemies: [{ id: 'vrka', level: 5 }], kind: 'wild', canRun: true, canLose: false, bg: 'forest', music: 'battle' };
  const a = startBattle(mkState(buildParty(['player', 'rama'], 8, 0), 9, 3), C, sp);
  const b = startBattle(mkState(buildParty(['player', 'rama'], 8, 0), 9, 3), C, sp);
  assert.deepEqual(a.battle!.beats, b.battle!.beats);
});
