/**
 * Battle state machine (DESIGN §5, CONTRACTS.md). OWNER: battle. Pure + deterministic: every random
 * decision uses rngFor(state, label) followed by bump(state).
 *
 * Phases and the actions they accept:
 *   intro / beats      advance → pop one beat; when none remain → command (or next foe / forced switch)
 *   command            choose 0 Fight → pick-move · 1 Switch → pick-switch · 2 Item → pick-item · 3 Run
 *   pick-move          choose i (index into battle.ally.moves) → challenge   · choose -1 → command
 *   challenge          answer {option|order, timeMs} → feedback (pending feedback)
 *   feedback           advance → the turn resolves into beats
 *   pick-switch        choose i (party index) · -1 → command (not when the active hero is exhausted)
 *   pick-item          choose i (index into battleMenu().items) · -1 → command
 *   won / lost / fled  advance → pop beats; battleOutcome() is non-null once no beats remain
 * While the phase is not challenge/feedback, state.pending = { kind: 'battle' }.
 *
 * Kathā (v0.4, notes/katha.md; the practice game is untouched): picking a move bound to a pāda (logic-katha
 * astraBinding), or ANY move in a duel, opens a smarana challenge (context 'battle'); every other move resolves at once
 * with no input at the ordinary power. A smarana answer resolves the turn directly (no feedback phase). Outcome: correct /
 * automatic = full effect (×1.1 damage for a recalled gap), a miss = half effect for every astra (damage, heal, stages
 * ±2 → ±1), folded into the effect beat; no swift power; the recital beat replaces "{x} uses {m}!".
 * v0.4.1: a duel turn goes straight to the recitation (kathaDuelTurn: no command / pick-move phase); an astra rotates
 * through its verse's pādas (logic-katha astraPada); foe HP is scaled to the story's turn targets (kathaFoe) and
 * the hero with the most equipped astras steps forward (kathaLead; `spec.lead` wins) and the foe's attack is capped
 * (kathaFoeAtk); a missed damaging cast says the element line first, then the falter.
 * v0.4.3: the tutorial duel (`spec.tutorial`, isEchoDuel) is call and response — the duelist's turn is a model beat
 * (`BattleBeat.model`: the next pāda said in full, no input) instead of an attack, the player's turn says that pāda back
 * with one gap (buildSmarana `echo`), one beat per answer ("{x} says the line back!" with the hit), and the battle opens
 * with the first model line; the foe never strikes, so the tutorial cannot be lost.
 * v0.5a (logic-tactics.ts, Kathā wild / boss fights): the astra that fits a foe in Vālmīki is decisive (a story beat);
 * a boss readies a great blow one turn ahead (a `warn` beat; it then acts after the hero) that a support move, a switch,
 * a cover (`choose COVER_CMD`: a benched guardian steps in) or a counter blunts; the same astra on consecutive turns
 * tires (× 0.6, × 0.4). Duels and the practice game never reach any of it.
 * v0.5b (WP-C, logic-chain.ts): a Kathā duel against a foe of content/katha-chain.json is a verse chain (śloka-antyakṣarī):
 * the opponent's turn is a line (a model beat, like the tutorial's), the player's turn an 'antya' pick (three heard
 * pādas, one opens with the last sound of the opponent's line); the link lands at full power, half on a miss, × 1.5 when
 * the opponent is stumped; the opponent never strikes, so it cannot be lost. Boss phases (`tactics.phases`, P7): Rāvaṇa's
 * heads grow back — hits that do not fit cannot take him below the phase floor while the hero holds the fitting astra —
 * and Mātali's line plays once (a beat when a phase begins).
 */
import type { Rng } from '@sdk';
import { cardinal } from '@sanskrit';
import type { Action, BattleBeat, BattleSpec, BattleState, EnemyDef, Fighter, Fx, GameContent, GameState, MapDef, MoveDef, MoveEffect, PadaRefT, PartyMember } from './types';
import { bump, clamp, indexOf, must, rngFor } from './logic-util';
import { MAX_STAGE, addXp, battleXp, damage, elementMult, fighterFromEnemy, fighterFromMember, maxHpOf } from './logic-progress';
import { grade, makeChallenge, markSeen, recordResult } from './logic-learning';
import { astraBinding, astraPada, buildSmarana, duelMove, duelPada, gradeSmarana, isEchoDuel, isKatha, kathaFoe, kathaLead, recordSmarana } from './logic-katha';
import { COVER_CMD, KATHA_BLUNT, KATHA_OPENING, KATHA_STRIKE, KATHA_STRIKE_CAP, SHIELD_CMD, type WarnPlan, answerOf, canShield, coverOf, fatigueMult, fitFor, isDecisive, nextChain, onlyMove, phaseFloor, phasesBegun, readiesAt, shieldPada, spendOnly, strikeScale, warnPlan } from './logic-tactics';
import { CHAIN_MISS, CHAIN_STUMPED, chainDuel, chainFoe, chainOpen, chainOptions, chainReady, chainTurn, isChainDuel } from './logic-chain';
import saBattleJson from './content/sa-battle.json';

export const QUALITY = { swift: 1.5, correct: 1.0, wrong: 0.35 } as const;
/** Kathā outcome multipliers: a recalled gap (×1.1 damage), a miss (half effect). No swift power in Kathā. */
export const KATHA_QUALITY = { recalled: 1.1, full: 1.0, half: 0.5 } as const;
export const CRIT_CHANCE = 1 / 16;
const SECONDARY_CHANCE = 0.3;

// ───────────────────────── naming / vocabulary ─────────────────────────

const allyName = (id: string): string => (id === 'player' ? '{player}' : `{n:ally.${id}}`);
const foeName = (id: string): string => `{n:enemy.${id}}`;
const moveName = (id: string): string => `{n:move.${id}}`;
const itemName = (id: string): string => `{n:item.${id}}`;

// ───────────────────────── Sanskrit narration (BattleBeat.textSa) ─────────────────────────
// OWNER: sa-battle. Every Sanskrit word comes from content/sa-battle.json (forms + templates) or from the
// @sanskrit number engine; sa-battle.test.ts verifies every instantiation with the oracle. Pure: no state.

export type SaGender = 'm' | 'f' | 'n' | 'player';
export interface SaForms {
  gender: SaGender;
  nom?: string;
  acc?: string;
  ins?: string;
  gen?: string;
  voc?: string;
}
export type SaTemplateText = string | { m: string; f: string };
export interface SaBattleData {
  version: number;
  forms: Record<'ally' | 'enemy' | 'group' | 'move' | 'item', Record<string, SaForms>>;
  stats: Record<'atk' | 'def', string>;
  numbers: { hundreds: string[]; thousands: string[]; and: string; digits: string };
  templates: Record<string, { en: string; sa: SaTemplateText }>;
}
export const SA_BATTLE = saBattleJson as unknown as SaBattleData;

/** Who a template's {x.…} slot names. */
export interface SaRef {
  kind: 'ally' | 'enemy' | 'group';
  id: string;
}
export interface SaSlots {
  x?: SaRef;
  /** move id ({m.acc} / {m.ins}) */
  m?: string;
  /** item id ({i.acc}) */
  i?: string;
  /** stat ({s}) */
  s?: 'atk' | 'def';
  /** number ({n}) */
  n?: number;
  /** lexicon id ({word} → {w:id}) */
  word?: string;
}
const saAlly = (id: string): SaRef => ({ kind: 'ally', id });
const saFoe = (id: string): SaRef => ({ kind: 'enemy', id });
const SA_HEROES: SaRef = { kind: 'group', id: 'heroes' };

/**
 * A number as Sanskrit words: 1–100 and 1000 from cardinal(); otherwise the thousands, hundreds and the rest
 * (largest first) joined by numbers.and ("and"); 0 and ≥ 10000 as Devanagari digits.
 */
export function saNumber(n: number, data: SaBattleData = SA_BATTLE): string {
  const nb = data.numbers;
  if (!Number.isInteger(n) || n < 1 || n >= 10000) return String(Math.max(0, Math.round(n))).replace(/[0-9]/g, (d) => nb.digits.charAt(Number(d)));
  if (n <= 100 || n === 1000) return cardinal(n);
  const th = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const r = n % 100;
  const parts = [nb.thousands[th] ?? '', nb.hundreds[h] ?? '', r > 0 ? cardinal(r) : ''].filter((p) => p !== '');
  return parts.length === 1 ? (parts[0] as string) : `${parts.join(' ')} ${nb.and}`;
}

const SA_GENDER_RE = /\{g:([^{}|]*)\|([^{}]*)\}/g;
const resolveG = (s: string, avatar: 'a' | 'b'): string => s.replace(SA_GENDER_RE, (_w, m: string, f: string) => (avatar === 'b' ? f : m));

export function saFormsOf(ref: SaRef, data: SaBattleData = SA_BATTLE): SaForms | undefined {
  return data.forms[ref.kind]?.[ref.id];
}

/** One template variant with its slots filled, `{g:…}` resolved for `avatar`; null when a form is missing. */
function saFill(tpl: string, slots: SaSlots, avatar: 'a' | 'b', data: SaBattleData): string | null {
  let missing = false;
  const out = tpl.replace(/\{(x|m|i)\.(nom|acc|ins|gen|voc)\}|\{(n|s|word)\}/g, (whole, who?: string, cas?: string, plain?: string) => {
    let v: string | undefined;
    if (who === 'x') v = slots.x ? saFormsOf(slots.x, data)?.[cas as 'nom'] : undefined;
    else if (who === 'm') v = slots.m !== undefined ? data.forms.move[slots.m]?.[cas as 'acc'] : undefined;
    else if (who === 'i') v = slots.i !== undefined ? data.forms.item[slots.i]?.[cas as 'acc'] : undefined;
    else if (plain === 'n') v = slots.n !== undefined ? saNumber(slots.n, data) : undefined;
    else if (plain === 's') v = slots.s ? data.stats[slots.s] : undefined;
    else if (plain === 'word') v = slots.word !== undefined ? `{w:${slots.word}}` : undefined;
    if (v === undefined || v === '') {
      missing = true;
      return whole;
    }
    return v;
  });
  return missing ? null : resolveG(out, avatar);
}

/** The masculine and feminine readings of a line as one string: differing words become `{g:masc|fem}`. */
export function mergeGender(a: string, b: string): string | undefined {
  if (a === b) return a;
  const ta = a.split(' ');
  const tb = b.split(' ');
  if (ta.length !== tb.length) return /[{}|]/.test(a + b) ? undefined : `{g:${a}|${b}}`;
  const tail = /^(.*?)([,\u0964!?]*)$/u; // trailing comma, danda, ! or ?
  return ta
    .map((x, k) => {
      const y = tb[k] as string;
      if (x === y) return x;
      const [, wx = '', px = ''] = tail.exec(x) ?? [];
      const [, wy = '', py = ''] = tail.exec(y) ?? [];
      return px === py && wx && wy ? `{g:${wx}|${wy}}${px}` : `{g:${x}|${y}}`;
    })
    .join(' ');
}

/**
 * The Sanskrit of one beat kind (content/sa-battle.json `templates[key]`) with its slots, or undefined when the
 * template or a form is missing (the view then shows the English). A gendered template follows the gender of
 * {x}; for the player (and for `{g:…}` written in a template) both readings are kept as `{g:masc|fem}`.
 */
export function saText(key: string, slots: SaSlots = {}, data: SaBattleData = SA_BATTLE): string | undefined {
  const t = data.templates[key]?.sa;
  if (t === undefined) return undefined;
  const g = slots.x ? saFormsOf(slots.x, data)?.gender : undefined;
  if (slots.x && !g) return undefined;
  const pick = (want: 'm' | 'f'): string => (typeof t === 'string' ? t : t[g === 'f' ? 'f' : g === 'm' || g === 'n' ? 'm' : want]);
  const a = saFill(pick('m'), slots, 'a', data);
  const b = saFill(pick('f'), slots, 'b', data);
  return a === null || b === null ? undefined : mergeGender(a, b);
}

/** Several Sanskrit sentences as one beat (undefined if any part is missing). */
function saJoin(...parts: (string | undefined)[]): string | undefined {
  return parts.every((p) => p !== undefined) ? parts.join(' ') : undefined;
}

interface Vocab {
  uses: (who: string, mv: string) => string;
  foeUses: (who: string, mv: string) => string;
  takes: (who: string, n: number) => string;
  foeDown: (who: string) => string;
  allyDown: (who: string) => string;
  allDown: string;
  win: string;
  /** content/sa-battle.json template keys of the same beats */
  sa: Record<'uses' | 'foeUses' | 'takes' | 'foeDown' | 'allyDown' | 'allDown' | 'win', string>;
}
function vocab(spec: BattleSpec, echo = false): Vocab {
  // the tutorial duel (call and response, v0.4.3): the duel's lines, but it ends as a lesson learned, not a debate won
  if (echo) {
    const d = vocab(spec);
    return { ...d, foeDown: (w) => `${w} says: well done! You know every line!`, win: 'The lesson is complete!', sa: { ...d.sa, foeDown: 'kathaEchoDown', win: 'kathaEchoWin' } };
  }
  if (spec.kind === 'duel')
    return {
      uses: (w, m) => `${w} answers with ${m}!`,
      foeUses: (w, m) => `${w} counters with ${m}!`,
      takes: (w, n) => `${w}'s conviction wavers (${n}).`,
      foeDown: (w) => `${w} is persuaded!`,
      allyDown: (w) => `${w} has lost conviction.`,
      allDown: 'Your side has lost the debate.',
      win: 'The debate is won!',
      sa: { uses: 'duelAnswers', foeUses: 'duelCounters', takes: 'duelTakes', foeDown: 'duelFoeDown', allyDown: 'duelAllyDown', allDown: 'duelAllDown', win: 'duelWin' },
    };
  return {
    uses: (w, m) => `${w} uses ${m}!`,
    foeUses: (w, m) => `${w} uses ${m}!`,
    takes: (w, n) => `${w} takes ${n} damage.`,
    foeDown: (w) => `${w} is defeated!`,
    allyDown: (w) => `${w} is exhausted and withdraws.`,
    allDown: 'All the heroes are exhausted...',
    win: 'Victory!',
    sa: { uses: 'uses', foeUses: 'uses', takes: 'takes', foeDown: 'foeDown', allyDown: 'allyDown', allDown: 'allDown', win: 'win' },
  };
}

// ───────────────────────── helpers ─────────────────────────

const conscious = (p: PartyMember[]): number[] => p.flatMap((m, i) => (m.hp > 0 ? [i] : []));

function withBattle(state: GameState, b: BattleState, extra?: Partial<GameState>): GameState {
  const pending = b.phase === 'challenge' || b.phase === 'feedback' ? state.pending : { kind: 'battle' as const };
  return { ...state, battle: b, pending, ...extra };
}

/** Write the active fighter's HP into save.party (PP is already tracked there). */
function syncAlly(state: GameState): GameState {
  const b = state.battle;
  if (!b) return state;
  const party = state.save.party.slice();
  const m = party[b.active];
  if (!m) return state;
  party[b.active] = { ...m, hp: Math.max(0, b.ally.hp) };
  return { ...state, save: { ...state.save, party } };
}

export function maxPp(moveId: string, content: GameContent): number {
  return indexOf(content).move.get(moveId)?.pp ?? 0;
}

/** Items usable in battle (qty > 0, not key items), in defs order. */
export function battleItems(state: GameState, content: GameContent): string[] {
  return content.items.filter((it) => it.kind !== 'key' && (state.save.items[it.id] ?? 0) > 0).map((it) => it.id);
}

/** Everything the battle menu needs. */
export function battleMenu(state: GameState, content: GameContent): { moves: { id: string; pp: number; maxPp: number; usable: boolean }[]; switchable: number[]; items: string[]; canRun: boolean; forcedSwitch: boolean } {
  const b = state.battle;
  if (!b) return { moves: [], switchable: [], items: [], canRun: false, forcedSwitch: false };
  const m = state.save.party[b.active];
  const pps = b.ally.moves.map((id) => m?.pp[id] ?? 0);
  const allOut = pps.every((p) => p <= 0);
  // v0.6.1 (Kathā): an `only` boss phase leaves the hero one move (Rāvaṇa from 60 %: the Āditya-hṛdayam, once)
  const only = isKatha(state) && b.bossPhases ? onlyMove(content, state.save.chapter, b.foe.id, b.bossPhases, b.ally.moves) : null;
  return {
    moves: b.ally.moves.map((id, i) => ({ id, pp: pps[i] ?? 0, maxPp: maxPp(id, content), usable: only ? id === only : allOut || (pps[i] ?? 0) > 0 })),
    switchable: conscious(state.save.party).filter((i) => i !== b.active),
    items: battleItems(state, content),
    canRun: b.spec.kind === 'wild' && b.spec.canRun,
    forcedSwitch: b.ally.hp <= 0,
  };
}

/** Who steps forward first: the reciter in a duel; otherwise the first conscious hero who is not the reciter. */
export function leadIndex(party: PartyMember[], spec: BattleSpec): number {
  const alive = conscious(party);
  if (spec.kind === 'duel') {
    const p = alive.find((i) => party[i]?.id === 'player');
    if (p !== undefined) return p;
  }
  return alive.find((i) => party[i]?.id !== 'player') ?? alive[0] ?? 0;
}

/** The intro beat text. Story intros (spec.intro, enemy intro) have no textSa: the view looks them up in dialogueSa. */
function introText(spec: BattleSpec, def: EnemyDef, first: boolean, echo = false): { text: string; textSa?: string } {
  const n = foeName(def.id);
  const x = { x: saFoe(def.id) };
  const sa = (text: string, key: string): { text: string; textSa?: string } => withSa({ text }, saText(key, x));
  // the tutorial duel is a lesson, not a debate: its own opening line instead of the story's "challenges you" intro
  if (echo) return withSa({ text: `${n} recites the new verse with you.` }, saText('kathaEchoIntro', x));
  if (first && spec.intro) return { text: spec.intro };
  if (def.intro) return { text: def.intro };
  if (spec.kind === 'duel') return sa(`${n} challenges you to a debate of verses!`, 'appearDuel');
  if (spec.kind === 'boss') return sa(`${n} blocks the way!`, 'appearBoss');
  return first ? sa(`A wild ${n} appears!`, 'appearWild') : sa(`${n} steps forward!`, 'appearNext');
}

/** `obj` with `textSa` set when there is a Sanskrit line (the field is left out otherwise). */
function withSa<T extends object>(obj: T, textSa: string | undefined): T & { textSa?: string } {
  return textSa === undefined ? obj : { ...obj, textSa };
}

/** The tutorial duel's model beat: the duelist says pāda `model` in full (the view prints the line; no input). */
function modelText(foeId: string): { text: string; textSa?: string } {
  return withSa({ text: `${foeName(foeId)} says a line: listen, then say it back.` }, saText('kathaEchoModel', { x: saFoe(foeId) }));
}

// ───────────────────────── start ─────────────────────────

export function startBattle(state: GameState, content: GameContent, spec: BattleSpec): GameState {
  const idx = indexOf(content);
  const first = spec.enemies[0];
  if (!first) throw new Error('startBattle: spec has no enemies');
  const def = must(idx.enemy, first.id, 'enemy');
  const alive = conscious(state.save.party);
  const active = (isKatha(state) ? kathaLead(state.save.party, spec, content) : undefined) ?? leadIndex(state.save.party, spec); // Kathā: the hero with the most astras (v0.4.1)
  const member = state.save.party[active];
  if (!member) throw new Error('startBattle: empty party');
  const ally = fighterFromMember(member, content);
  const foe0 = fighterFromEnemy(first.id, first.level, content);
  // v0.5b: a Kathā duel against a chain opponent opens with its first line (null: nothing heard yet — the ordinary duel)
  const chain = isChainDuel(state, content, spec) ? chainOpen(state, content, first.id) : null;
  const foe = chain ? chainFoe(foe0, ally, content, chainDuel(content, first.id)) : isKatha(state) ? kathaFoe(foe0, ally, spec, content) : foe0; // Kathā: shorter story fights (v0.4.1)
  const snap = { allyHp: ally.hp, foeHp: foe.hp };
  // the tutorial duel opens with the duelist's first model line (the pāda the first turn says back)
  const echo = isEchoDuel(state, spec);
  const model = echo ? duelPada(state, content, first.id, 0) : null;
  const beats: BattleBeat[] = [{ ...introText(spec, def, true, echo && !!model), ...snap }];
  // v0.5a: a boss whose blow is readied in the opening (Subāhu's rain of blood on the altar, Bāla 1.30.12) says so first
  const open = alive.length > 0 ? openingWarn(state, content, spec, foe, snap) : { beats: [] };
  beats.push(...open.beats);
  let phase: BattleState['phase'] = 'intro';
  if (alive.length === 0) {
    const v = vocab(spec, echo);
    beats.push(withSa({ text: v.allDown, ...snap, sfx: 'lose' as const }, saText(v.sa.allDown)));
    phase = 'lost';
  } else if (model) {
    beats.push({ ...modelText(first.id), ...snap, fx: { kind: 'switch' as const, target: 'ally' as const }, model });
  } else if (chain) {
    // the verse chain: the rule in one line, then the opponent's first line (a model beat: the pāda printed in full)
    beats.push({ ...tplBeat('kathaChainRule', first.id), ...snap, fx: { kind: 'switch' as const, target: 'ally' as const } });
    beats.push({ ...tplBeat('kathaChainSays', first.id), ...snap, model: chain.line });
  } else {
    const duel = spec.kind === 'duel';
    beats.push(withSa({ text: duel ? `${allyName(ally.id)} steps forward to answer.` : `Go, ${allyName(ally.id)}!`, ...snap, fx: { kind: 'switch' as const, target: 'ally' as const } }, saText(duel ? 'duelStepForward' : 'go', { x: saAlly(ally.id) })));
  }
  const battle: BattleState = { spec, foeIndex: 0, foe, ally, active, phase, beats, participants: [active], turn: 0, ...(isKatha(state) && spec.kind !== 'duel' ? { foeActs: 0, ...(open.warn ? { warn: open.warn } : {}) } : {}), ...(chain && alive.length > 0 ? { antya: chain.antya } : {}) };
  const fx: Fx[] = [...state.fx, { kind: 'music', track: spec.music }];
  return { ...state, mode: 'battle', battle, pending: { kind: 'battle' }, fx };
}

// ───────────────────────── turn resolution ─────────────────────────

interface Ctx {
  content: GameContent;
  rng: Rng;
  spec: BattleSpec;
  v: Vocab;
  ally: Fighter;
  foe: Fighter;
  party: PartyMember[];
  active: number;
  beats: BattleBeat[];
  over: 'won' | 'lost' | null;
  foeDown: boolean;
  allyDown: boolean;
  /** side that just shook off a stun this turn (cannot be bound again at once) */
  immune: 'ally' | 'foe' | null;
  /** Kathā: a missed recital's outcome, folded into the next (effect) beat */
  prefix?: { text: string; textSa: string | undefined };
  /** the Kathā tutorial duel (isEchoDuel): call and response, the foe models the next pāda instead of attacking */
  echo: boolean;
  /** v0.5a: Kathā tactics are on (a Kathā wild / boss fight; never a duel, never the practice game) */
  tactics: boolean;
  chapter: number;
  /** the active hero's last move and how many times in a row (astra fatigue) */
  chain?: BattleState['chain'];
  /** the foe's readied blow (lands on its next action) */
  warn?: BattleState['warn'];
  /** actions the current foe has taken (warning cadence) */
  foeActs: number;
  /** how the hero answered a readied blow this turn (`shieldHalf`: a verse shield whose line faltered — half the protection) */
  answer?: 'guard' | 'counter' | 'switch' | 'cover' | 'shield' | 'shieldHalf';
  /** how this boss warns (null: it does not) */
  plan: WarnPlan | null;
  /** v0.5b P7: the boss phases begun (BattleState.bossPhases) */
  phases: string[];
  /** v0.5b P7: the save's story flags (a boss phase may wait for one, e.g. seen.aditya) */
  flags: GameState['save']['flags'];
}

function beat(cx: Ctx, text: string, fx?: BattleBeat['fx'], sfx?: BattleBeat['sfx'], textSa?: string, recital?: BattleBeat['recital'], model?: BattleBeat['model'], tactic?: BattleBeat['tactic']): void {
  const pre = cx.prefix;
  if (pre) {
    cx.prefix = undefined;
    text = `${pre.text} ${text}`;
    textSa = saJoin(pre.textSa, textSa);
  }
  cx.beats.push({ text, allyHp: cx.ally.hp, foeHp: cx.foe.hp, ...(fx ? { fx } : {}), ...(sfx ? { sfx } : {}), ...(textSa !== undefined ? { textSa } : {}), ...(recital ? { recital } : {}), ...(model ? { model } : {}), ...(tactic ? { tactic } : {}) });
}

function variance(cx: Ctx): number {
  return 0.85 + cx.rng.next() * 0.15;
}

function applyEffect(cx: Ctx, side: 'ally' | 'foe', eff: MoveEffect): void {
  const user = side === 'ally' ? cx.ally : cx.foe;
  const opp = side === 'ally' ? cx.foe : cx.ally;
  const userName = side === 'ally' ? allyName(cx.ally.id) : foeName(cx.foe.id);
  const oppName = side === 'ally' ? foeName(cx.foe.id) : allyName(cx.ally.id);
  const userSa = side === 'ally' ? saAlly(cx.ally.id) : saFoe(cx.foe.id);
  const oppSa = side === 'ally' ? saFoe(cx.foe.id) : saAlly(cx.ally.id);
  const oppSide = side === 'ally' ? 'foe' : 'ally';
  switch (eff.kind) {
    case 'heal':
    case 'drain': {
      const amt = Math.max(1, Math.round(user.maxHp * eff.amount));
      const before = user.hp;
      user.hp = Math.min(user.maxHp, user.hp + amt);
      const rec = saText('recovers', { x: userSa, n: user.hp - before });
      if (side === 'ally' && eff.target === 'party' && eff.kind === 'heal') {
        cx.party = cx.party.map((m, i) => {
          if (i === cx.active || m.hp <= 0) return m;
          const mx = maxHpOf(m, cx.content);
          return { ...m, hp: Math.min(mx, m.hp + Math.max(1, Math.round(mx * eff.amount))) };
        });
        const up = user.hp > before;
        beat(cx, up ? `The heroes are refreshed. ${userName} recovers ${user.hp - before}.` : 'The heroes are refreshed.', { kind: 'heal', target: side, amount: user.hp - before }, 'merge', up ? saJoin(saText('refreshed'), rec) : saText('refreshed'));
      } else if (user.hp > before) beat(cx, `${userName} recovers ${user.hp - before}.`, { kind: 'heal', target: side, amount: user.hp - before }, 'merge', rec);
      else beat(cx, `${userName} is already at full strength.`, undefined, undefined, saText('fullStrength', { x: userSa }));
      return;
    }
    case 'buff-atk':
    case 'buff-def': {
      const stat = eff.kind === 'buff-atk' ? 'atk' : 'def';
      const target = eff.target === 'enemy' ? opp : user;
      const tName = eff.target === 'enemy' ? oppName : eff.target === 'party' && side === 'ally' ? 'The heroes' : userName;
      const tSa = eff.target === 'enemy' ? oppSa : eff.target === 'party' && side === 'ally' ? SA_HEROES : userSa;
      const prev = target.stages[stat];
      target.stages = { ...target.stages, [stat]: clamp(prev + eff.amount, -MAX_STAGE, MAX_STAGE) };
      const word = stat === 'atk' ? 'attack' : 'defence';
      const poss = tName === 'The heroes' ? "The heroes'" : `${tName}'s`;
      if (target.stages[stat] === prev) beat(cx, `${poss} ${word} cannot rise any higher.`, undefined, undefined, saText('statMax', { x: tSa, s: stat }));
      else beat(cx, `${poss} ${word} rises${eff.amount >= 2 ? ' sharply' : ''}!`, { kind: 'buff', target: eff.target === 'enemy' ? oppSide : side }, undefined, saText(eff.amount >= 2 ? 'statRiseSharp' : 'statRise', { x: tSa, s: stat }));
      return;
    }
    case 'debuff-atk':
    case 'debuff-def': {
      const stat = eff.kind === 'debuff-atk' ? 'atk' : 'def';
      const target = eff.target === 'self' ? user : opp;
      const tSide = eff.target === 'self' ? side : oppSide;
      const tName = eff.target === 'self' ? userName : oppName;
      const tSa = eff.target === 'self' ? userSa : oppSa;
      const prev = target.stages[stat];
      target.stages = { ...target.stages, [stat]: clamp(prev - Math.abs(eff.amount), -MAX_STAGE, MAX_STAGE) };
      const word = stat === 'atk' ? 'attack' : 'defence';
      if (target.stages[stat] === prev) beat(cx, `${tName}'s ${word} cannot fall any lower.`, undefined, undefined, saText('statMin', { x: tSa, s: stat }));
      else beat(cx, `${tName}'s ${word} falls${Math.abs(eff.amount) >= 2 ? ' sharply' : ''}!`, { kind: 'debuff', target: tSide }, undefined, saText(Math.abs(eff.amount) >= 2 ? 'statFallSharp' : 'statFall', { x: tSa, s: stat }));
      return;
    }
    case 'stun': {
      if (cx.immune === oppSide) return;
      if (cx.rng.chance(eff.amount) || eff.amount >= 1) {
        opp.stunned = true;
        beat(cx, `${oppName} is bound and will lose a turn!`, { kind: 'debuff', target: oppSide }, undefined, saText('stun', { x: oppSa }));
      }
      return;
    }
  }
}

function checkFoe(cx: Ctx): void {
  if (cx.foe.hp > 0 || cx.foeDown) return;
  cx.foeDown = true;
  const def = indexOf(cx.content).enemy.get(cx.foe.id);
  beat(cx, cx.v.foeDown(foeName(cx.foe.id)), { kind: 'faint', target: 'foe' }, 'correct', saText(cx.v.sa.foeDown, { x: saFoe(cx.foe.id) }));
  if (def?.defeatLine && !cx.echo) beat(cx, def.defeatLine); // story text: its Sanskrit is in dialogueSa (a debate line: not in the tutorial lesson)
}

function checkAlly(cx: Ctx): void {
  if (cx.ally.hp > 0 || cx.allyDown) return;
  cx.allyDown = true;
  cx.party[cx.active] = { ...(cx.party[cx.active] as PartyMember), hp: 0 };
  beat(cx, cx.v.allyDown(allyName(cx.ally.id)), { kind: 'faint', target: 'ally' }, undefined, saText(cx.v.sa.allyDown, { x: saAlly(cx.ally.id) }));
  if (conscious(cx.party).length === 0) {
    beat(cx, cx.v.allDown, undefined, 'lose', saText(cx.v.sa.allDown));
    cx.over = 'lost';
  }
}

/** Sanskrit for the "super effective" / "not very effective" prefix (undefined part → no prefix). */
const saEffect = (e: 'super' | 'weak' | undefined): string | undefined => (e ? saText(e) : undefined);

/** Kathā: a miss gives half of every effect (heal / drain × 0.5, stun chance × 0.5, stages ±2 → ±1, ±1 stays ±1). */
export function halfEffect(e: MoveEffect): MoveEffect {
  if (e.kind === 'heal' || e.kind === 'drain' || e.kind === 'stun') return { ...e, amount: e.amount * 0.5 };
  const a = Math.abs(e.amount);
  return { ...e, amount: Math.sign(e.amount || 1) * Math.max(1, Math.ceil(a / 2)) };
}

/** How a Kathā cast went (PlayerAct.katha). */
export interface KathaCast {
  /** the pāda recited (absent for a plain move, which needs no input) */
  recital?: { shlokaId: string; pada: number; correct: boolean };
  /** a gap was filled correctly (not automatic): ×1.1 damage */
  recalled: boolean;
  /** the move is bound to a pāda (an astra) */
  bound: boolean;
  /** a Kathā duel turn (v0.4.1): the line carries the move's power; no PP is spent */
  duel?: boolean;
}

/** Kathā miss on a damaging cast: the falter sentence, after the element line ("super effective" → "But …"; v0.4.1). */
function halfLine(effective: 'super' | 'weak' | undefined): { text: string; textSa: string | undefined } {
  return effective === 'super' ? { text: 'But the line falters: only half the power lands.', textSa: saText('kathaHalfBut') } : { text: 'The line falters: only half the power lands.', textSa: saText('kathaHalf') };
}

function kathaAllyAct(cx: Ctx, mv: MoveDef, correct: boolean, k: KathaCast, weary: boolean): void {
  const m = cx.party[cx.active] as PartyMember;
  if (!weary && !k.duel) cx.party[cx.active] = { ...m, pp: { ...m.pp, [mv.id]: Math.max(0, (m.pp[mv.id] ?? 0) - 1) } };
  const me = allyName(cx.ally.id);
  const meSa = saAlly(cx.ally.id);
  if (cx.echo && k.recital) return echoAllyAct(cx, mv, correct, k);
  // the recital replaces "{x} uses {m}!" (a duel turn on another verse: "answers with a line of verse")
  if (k.recital && cx.spec.kind === 'duel' && !k.bound) beat(cx, `${me} answers with a line of verse!`, undefined, undefined, saText('kathaDuelRecite', { x: meSa }), k.recital);
  else if (k.recital) beat(cx, `${me} recites the line and invokes ${moveName(mv.id)}!`, undefined, undefined, saText('kathaRecite', { x: meSa, m: mv.id }), k.recital);
  // v0.5a: a decisive fitting astra's story beat names the cast itself, so the "uses" line is left out
  else if (!(cx.tactics && !k.duel && correct && !weary && mv.power > 0 && isDecisive(cx.content, cx.chapter, cx.foe, mv.id, cx.flags))) beat(cx, cx.v.uses(me, moveName(mv.id)), undefined, undefined, saText(cx.v.sa.uses, { x: meSa, m: mv.id }));
  if (weary) beat(cx, `${me} is weary: with no PP left, the move is weak.`, undefined, undefined, saText('weary', { x: meSa }));
  const eff = (e: MoveEffect): MoveEffect => (correct ? e : halfEffect(e));
  // v0.5a tactics: answering a readied blow, astra fatigue (× 0.6, × 0.4 on a repeat) and the decisive fitting astra
  let tired = 1;
  if (cx.tactics && !k.duel) {
    const ans = answerOf(cx.content, cx.warn, mv.id);
    if (ans) cx.answer = ans;
    tired = fatigueMult(cx.chain, cx.content, mv.id);
    cx.chain = nextChain(cx.chain, mv.id);
    cx.phases = spendOnly(cx.content, cx.chapter, cx.foe.id, cx.phases, mv.id); // v0.6.1: the only move, cast
    if (correct && !weary && mv.power > 0 && isDecisive(cx.content, cx.chapter, cx.foe, mv.id, cx.flags)) return decisiveHit(cx);
  }
  if (mv.power > 0) {
    const q = (correct ? (k.recalled ? KATHA_QUALITY.recalled : KATHA_QUALITY.full) : KATHA_QUALITY.half) * (weary ? 0.5 : 1) * tired;
    const d = damage(cx.ally, cx.foe, mv, q, variance(cx));
    // v0.5b P7: a boss phase's floor — a hit that does not fit cannot take the boss below it (Rāvaṇa's heads grow back)
    const floor = cx.tactics && !k.duel ? phaseFloor(cx.content, cx.chapter, cx.foe, cx.ally, mv.id, cx.flags) : null;
    const held = floor !== null && cx.foe.hp - d.amount < floor.hp;
    const amount = held && floor ? Math.max(0, Math.min(d.amount, cx.foe.hp - floor.hp)) : d.amount;
    cx.foe.hp = Math.max(0, cx.foe.hp - amount);
    // a miss: the element line first, then the falter, then the damage ("It is super effective! But the line falters: …")
    const half = correct ? null : halfLine(d.effective);
    const tiredLine = tired < 1 ? tplBeat('kathaTired') : null;
    const pre = (tiredLine ? `${tiredLine.text} ` : '') + (d.effective === 'super' ? 'It is super effective! ' : d.effective === 'weak' ? 'It is not very effective. ' : '') + (half ? `${half.text} ` : '');
    const takesSa = saText(cx.v.sa.takes, { x: saFoe(cx.foe.id), n: amount });
    // (a hit the floor stops entirely shows only the phase's line)
    if (amount > 0 || !held) beat(cx, `${pre}${cx.v.takes(foeName(cx.foe.id), amount)}`, { kind: 'hit', target: 'foe', amount, ...(d.effective ? { effective: d.effective } : {}) }, 'tap', saJoin(...(tiredLine ? [tiredLine.textSa] : []), ...(d.effective ? [saEffect(d.effective)] : []), ...(half ? [half.textSa] : []), takesSa), undefined, undefined, tiredLine ? 'tired' : undefined);
    phaseBeats(cx, held && floor ? floor : null);
    if (mv.effect && (cx.foe.hp > 0 || mv.effect.kind === 'drain')) applyEffect(cx, 'ally', eff(mv.effect));
  } else {
    if (!correct) cx.prefix = { text: 'The line falters: only half the power lands.', textSa: saText('kathaHalf') };
    if (mv.effect) applyEffect(cx, 'ally', eff(mv.effect));
  }
  for (const e of extraEffects(mv)) applyEffect(cx, 'ally', eff(e));
  const left = cx.prefix;
  if (left) {
    // nothing visible happened (e.g. a stun that did not bind): the outcome stands alone
    cx.prefix = undefined;
    beat(cx, left.text, undefined, undefined, left.textSa);
  }
  checkFoe(cx);
}

/**
 * v0.5a: the astra that fits the foe in Vālmīki lands decisively — its story beat (content/sa-battle.json `fits[].beat`,
 * e.g. the Mānava astra hurls Mārīca into the ocean) takes the foe's remaining strength, and the foe falls / is driven off.
 */
function decisiveHit(cx: Ctx): void {
  const fit = fitFor(cx.content, cx.chapter, cx.foe.id);
  const amount = Math.max(1, cx.foe.hp);
  cx.foe.hp = 0;
  const t = tplBeat(fit?.beat ?? 'super');
  beat(cx, t.text, { kind: 'hit', target: 'foe', amount, effective: 'super' }, 'tap', t.textSa, undefined, undefined, 'fit');
  checkFoe(cx);
}

/**
 * v0.5b P7: boss phases after a hit (logic-tactics phasesBegun / phaseFloor). The floor held the hit (`held`): its phase's
 * beat (a head falls and a new one rises) and, if the fitting astra is spent, it comes back to hand (1 PP); then each
 * phase that begins now shows its beat (Mātali's line, once) — a beat already shown this turn is not repeated.
 */
function phaseBeats(cx: Ctx, held: { fit?: string; phase: { beat?: string } } | null): void {
  const shown = new Set<string>();
  if (held) {
    if (held.phase.beat) {
      const t = tplBeat(held.phase.beat, cx.foe.id);
      beat(cx, t.text, undefined, undefined, t.textSa);
      shown.add(held.phase.beat);
    }
    const m = cx.party[cx.active];
    if (held.fit && m && m.moves.includes(held.fit) && (m.pp[held.fit] ?? 0) <= 0) cx.party[cx.active] = { ...m, pp: { ...m.pp, [held.fit]: 1 } };
  }
  const r = phasesBegun(cx.content, cx.chapter, cx.foe, cx.phases, cx.flags);
  cx.phases = r.begun;
  for (const p of r.now) {
    if (!p.beat || shown.has(p.beat)) continue;
    const t = tplBeat(p.beat, cx.foe.id);
    beat(cx, t.text, undefined, undefined, t.textSa);
    shown.add(p.beat);
  }
}

/**
 * v0.5b (WP-C) the verse chain: the player's link — one beat: the line said (the recital; on a miss the right line, at
 * half power: "But the line falters…"; a stumped opponent: × CHAIN_STUMPED, "{x} knows no line with that sound…") and
 * the hit. The line's power only (the best damaging move, no PP, no secondary effect).
 */
function chainAllyAct(cx: Ctx, act: Extract<PlayerAct, { kind: 'chain' }>): void {
  const said = withSa({ text: `${allyName(cx.ally.id)} answers with a line of verse!` }, saText('kathaDuelRecite', { x: saAlly(cx.ally.id) }));
  const half = act.correct ? null : { text: 'But the line falters: only half the power lands.', textSa: saText('kathaHalfBut') };
  const stumped = act.stumped ? tplBeat('kathaChainStumped', cx.foe.id) : null;
  const q = (act.correct ? KATHA_QUALITY.full : CHAIN_MISS) * (act.stumped ? CHAIN_STUMPED : 1);
  const d = damage(cx.ally, cx.foe, act.move, q, variance(cx));
  cx.foe.hp = Math.max(0, cx.foe.hp - d.amount);
  const parts = [said, ...(half ? [half] : []), ...(stumped ? [stumped] : []), withSa({ text: cx.v.takes(foeName(cx.foe.id), d.amount) }, saText(cx.v.sa.takes, { x: saFoe(cx.foe.id), n: d.amount }))];
  beat(cx, parts.map((x) => x.text).join(' '), { kind: 'hit', target: 'foe', amount: d.amount }, 'tap', saJoin(...parts.map((x) => x.textSa)), { ...act.spoken, correct: act.correct });
  checkFoe(cx);
}

/** v0.5b (WP-C) the verse chain: the opponent's turn — its line (a model beat: the pāda printed in full), never a blow. */
function chainFoeLine(cx: Ctx, line: PadaRefT | null): void {
  if (!line || cx.foe.hp <= 0 || cx.ally.hp <= 0) return;
  cx.foe.stunned = false;
  const t = tplBeat('kathaChainSays', cx.foe.id);
  beat(cx, t.text, undefined, undefined, t.textSa, undefined, line);
}

/** v0.5a: a benched guardian steps in front of the readied blow with a guard move (one tap): its effect, and the blow is blunted. */
function coverAct(cx: Ctx, allyId: string, moveId: string): void {
  const mv = indexOf(cx.content).move.get(moveId);
  cx.answer = 'cover';
  cx.chain = undefined;
  beat(cx, cx.v.uses(allyName(allyId), moveName(moveId)), undefined, undefined, saText(cx.v.sa.uses, { x: saAlly(allyId), m: moveId }));
  if (mv?.effect) applyEffect(cx, 'ally', mv.effect);
}

/** v0.5a: the verse shield — the hero recites a line of a heard verse and the heroes stand ready (a faltering line: half). */
function shieldAct(cx: Ctx, correct: boolean, recital: { shlokaId: string; pada: number; correct: boolean }): void {
  cx.answer = correct ? 'shield' : 'shieldHalf';
  cx.chain = undefined;
  const me = allyName(cx.ally.id);
  const said = withSa({ text: `${me} recites a line of verse: the heroes stand ready!` }, saText('kathaShield', { x: saAlly(cx.ally.id) }));
  const half = correct ? null : { text: 'But the line falters: only half the power lands.', textSa: saText('kathaHalfBut') };
  beat(cx, half ? `${said.text} ${half.text}` : said.text, { kind: 'buff', target: 'ally' }, undefined, half ? saJoin(said.textSa, half.textSa) : said.textSa, recital);
}

/** v0.5a: the foe readies its great blow (one short line, the future tense); it lands on the foe's next action. */
function foeReady(cx: Ctx, plan: WarnPlan): void {
  cx.warn = { foeId: cx.foe.id, moveId: plan.moveId, ...(plan.strike ? { strike: plan.strike } : {}), counter: plan.counter };
  const t = tplBeat(plan.ready, cx.foe.id, plan.moveId);
  beat(cx, t.text, undefined, undefined, t.textSa, undefined, undefined, 'warn');
}

/**
 * v0.5a: the readied blow lands: × KATHA_STRIKE of an ordinary hit, at most KATHA_STRIKE_CAP of the hero's max HP; answered
 * this turn (a support move, a counter, a switch, a cover) it is blunted to × KATHA_BLUNT ("The heroes were ready …") and the
 * foe is left open (its defence falls KATHA_OPENING stages).
 */
function foeStrike(cx: Ctx, w: NonNullable<BattleState['warn']>): void {
  cx.warn = undefined;
  const mv = indexOf(cx.content).move.get(w.moveId);
  if (!mv) return;
  const fn = foeName(cx.foe.id);
  const line = w.strike ? tplBeat(w.strike, cx.foe.id, mv.id) : withSa({ text: cx.v.foeUses(fn, moveName(mv.id)) }, saText(cx.v.sa.foeUses, { x: saFoe(cx.foe.id), m: mv.id }));
  beat(cx, line.text, undefined, undefined, line.textSa);
  // (v0.5b: a blow aimed elsewhere — the rain of blood on the altar — costs the heroes only its share, strikeScale)
  const sc = strikeScale(cx.content, cx.chapter, cx.foe.id);
  const d = damage(cx.foe, cx.ally, mv, KATHA_STRIKE * sc, variance(cx));
  let amount = Math.min(d.amount, Math.max(1, Math.round(cx.ally.maxHp * KATHA_STRIKE_CAP * sc)));
  const blunt = cx.answer !== undefined;
  // a faltering verse shield protects half as well (the Kathā rule: a miss = half effect) and leaves no opening
  const half = cx.answer === 'shieldHalf';
  if (blunt) amount = Math.max(1, Math.round(amount * (half ? (1 + KATHA_BLUNT) / 2 : KATHA_BLUNT)));
  cx.ally.hp = Math.max(0, cx.ally.hp - amount);
  const takesSa = saText(cx.v.sa.takes, { x: saAlly(cx.ally.id), n: amount });
  const takes = cx.v.takes(allyName(cx.ally.id), amount);
  if (blunt) {
    const b = tplBeat('kathaBlunt');
    beat(cx, `${b.text} ${takes}`, { kind: 'hit', target: 'ally', amount }, 'tap', saJoin(b.textSa, takesSa), undefined, undefined, 'blunt');
    // the blow spent, the foe is left open
    if (cx.ally.hp > 0 && !half) applyEffect(cx, 'ally', { kind: 'debuff-def', amount: KATHA_OPENING, target: 'enemy' });
  } else {
    const pre = d.effective === 'super' ? 'It is super effective! ' : d.effective === 'weak' ? 'It is not very effective. ' : '';
    beat(cx, `${pre}${takes}`, { kind: 'hit', target: 'ally', amount, ...(d.effective ? { effective: d.effective } : {}) }, 'wrong', saJoin(...(d.effective ? [saEffect(d.effective)] : []), takesSa));
  }
  checkAlly(cx);
}

/**
 * The tutorial duel's player turn (v0.4.3): one beat — "{x} says the line back!" with the hit (a miss: "But the line
 * falters…", half power) — carrying the recital; the line's power only, no secondary effect of the move.
 */
function echoAllyAct(cx: Ctx, mv: MoveDef, correct: boolean, k: KathaCast): void {
  const me = allyName(cx.ally.id);
  const said = { text: `${me} says the line back!`, textSa: saText('kathaEchoSay', { x: saAlly(cx.ally.id) }) };
  const half = correct ? null : { text: 'But the line falters: only half the power lands.', textSa: saText('kathaHalfBut') };
  const text = half ? `${said.text} ${half.text}` : said.text;
  const textSa = half ? saJoin(said.textSa, half.textSa) : said.textSa;
  if (mv.power > 0) {
    const q = correct ? (k.recalled ? KATHA_QUALITY.recalled : KATHA_QUALITY.full) : KATHA_QUALITY.half;
    const d = damage(cx.ally, cx.foe, mv, q, variance(cx));
    cx.foe.hp = Math.max(0, cx.foe.hp - d.amount);
    beat(cx, text, { kind: 'hit', target: 'foe', amount: d.amount }, 'tap', textSa, k.recital);
  } else beat(cx, text, undefined, undefined, textSa, k.recital);
  checkFoe(cx);
}

/** The tutorial duel's foe turn (v0.4.3): the model recitation of the pāda the next player turn says back (no attack). */
function echoModel(cx: Ctx, ref: { shlokaId: string; pada: number } | null): void {
  if (cx.foe.hp <= 0 || cx.ally.hp <= 0) return;
  if (!ref) return foeAct(cx);
  cx.foe.stunned = false;
  const t = modelText(cx.foe.id);
  beat(cx, t.text, undefined, undefined, t.textSa, undefined, ref);
}

function allyAct(cx: Ctx, mv: MoveDef, res: { correct: boolean; swift: boolean; katha?: KathaCast }, weary: boolean): void {
  if (res.katha) return kathaAllyAct(cx, mv, res.correct, res.katha, weary);
  const m = cx.party[cx.active] as PartyMember;
  if (!weary) cx.party[cx.active] = { ...m, pp: { ...m.pp, [mv.id]: Math.max(0, (m.pp[mv.id] ?? 0) - 1) } };
  const me = allyName(cx.ally.id);
  const meSa = saAlly(cx.ally.id);
  beat(cx, cx.v.uses(me, moveName(mv.id)), undefined, undefined, saText(cx.v.sa.uses, { x: meSa, m: mv.id }));
  if (weary) beat(cx, `${me} is weary: with no PP left, the move is weak.`, undefined, undefined, saText('weary', { x: meSa }));
  if (res.swift) beat(cx, 'Flawless and swift! The mantra rings true.', { kind: 'swift', target: 'foe' }, 'correct', saText('swift'));
  if (!res.correct) beat(cx, mv.power > 0 ? 'The words falter... the move only partly lands.' : 'The words falter... the mantra has no effect.', mv.power > 0 ? undefined : { kind: 'miss', target: mv.effect?.target === 'enemy' ? 'foe' : 'ally' }, 'wrong', saText(mv.power > 0 ? 'falterHit' : 'falterStatus'));
  if (mv.power > 0) {
    const q = (res.swift ? QUALITY.swift : res.correct ? QUALITY.correct : QUALITY.wrong) * (weary ? 0.5 : 1);
    const d = damage(cx.ally, cx.foe, mv, q, variance(cx));
    cx.foe.hp = Math.max(0, cx.foe.hp - d.amount);
    const eff = d.effective === 'super' ? 'It is super effective! ' : d.effective === 'weak' ? 'It is not very effective. ' : '';
    const takesSa = saText(cx.v.sa.takes, { x: saFoe(cx.foe.id), n: d.amount });
    beat(cx, `${eff}${cx.v.takes(foeName(cx.foe.id), d.amount)}`, { kind: 'hit', target: 'foe', amount: d.amount, ...(d.effective ? { effective: d.effective } : {}) }, 'tap', d.effective ? saJoin(saEffect(d.effective), takesSa) : takesSa);
    if (res.correct && mv.effect && cx.foe.hp > 0) applyEffect(cx, 'ally', mv.effect);
    else if (res.correct && mv.effect && mv.effect.kind === 'drain') applyEffect(cx, 'ally', mv.effect);
  } else if (res.correct && mv.effect) {
    applyEffect(cx, 'ally', mv.effect);
  }
  if (res.correct) for (const e of extraEffects(mv)) applyEffect(cx, 'ally', e);
  checkFoe(cx);
}

/** Enemy AI: damaging moves weighted by power × effectiveness × STAB; status moves sometimes. */
export function chooseFoeMove(foe: Fighter, ally: Fighter, content: GameContent, rng: Rng): MoveDef {
  const idx = indexOf(content);
  const moves = foe.moves.map((id) => idx.move.get(id)).filter((m): m is MoveDef => !!m);
  if (moves.length === 0) throw new Error(`enemy ${foe.id} has no moves`);
  const weights = moves.map((mv) => {
    if (mv.power > 0) return mv.power * elementMult(mv.element, ally.element) * (mv.element === foe.element ? 1.25 : 1);
    const e = mv.effect;
    if (!e) return 1;
    if (e.kind === 'buff-atk' || e.kind === 'buff-def') return foe.stages[e.kind === 'buff-atk' ? 'atk' : 'def'] < 2 ? 30 : 2;
    if (e.kind === 'debuff-atk' || e.kind === 'debuff-def') return ally.stages[e.kind === 'debuff-atk' ? 'atk' : 'def'] > -2 ? 28 : 2;
    if (e.kind === 'heal') return foe.hp < foe.maxHp * 0.5 ? 50 : 2;
    return 20;
  });
  return rng.weighted(moves, weights);
}

function foeAct(cx: Ctx): void {
  if (cx.foe.hp <= 0 || cx.ally.hp <= 0) return;
  const fn = foeName(cx.foe.id);
  const fnSa = saFoe(cx.foe.id);
  // v0.5a: the foe's action number (warning cadence), counted for every action it takes
  const act = cx.foeActs;
  if (cx.tactics) cx.foeActs = act + 1;
  if (cx.foe.stunned) {
    cx.foe.stunned = false;
    cx.immune = 'foe';
    cx.warn = undefined; // a bound foe loses its readied blow
    beat(cx, `${fn} is bound and cannot act!`, undefined, undefined, saText('bound', { x: fnSa }));
    return;
  }
  if (cx.tactics && cx.warn) return foeStrike(cx, cx.warn);
  if (cx.tactics && cx.plan && readiesAt(cx.plan, act)) return foeReady(cx, cx.plan);
  const mv = chooseFoeMove(cx.foe, cx.ally, cx.content, cx.rng);
  beat(cx, cx.v.foeUses(fn, moveName(mv.id)), undefined, undefined, saText(cx.v.sa.foeUses, { x: fnSa, m: mv.id }));
  if (mv.power > 0) {
    const crit = cx.rng.chance(CRIT_CHANCE);
    const d = damage(cx.foe, cx.ally, mv, crit ? QUALITY.swift : QUALITY.correct, variance(cx));
    cx.ally.hp = Math.max(0, cx.ally.hp - d.amount);
    const pre = (crit ? 'A critical blow! ' : '') + (d.effective === 'super' ? 'It is super effective! ' : d.effective === 'weak' ? 'It is not very effective. ' : '');
    const preSa = [...(crit ? [saText('crit')] : []), ...(d.effective ? [saEffect(d.effective)] : [])];
    beat(cx, `${pre}${cx.v.takes(allyName(cx.ally.id), d.amount)}`, { kind: 'hit', target: 'ally', amount: d.amount, ...(d.effective ? { effective: d.effective } : {}) }, 'wrong', saJoin(...preSa, saText(cx.v.sa.takes, { x: saAlly(cx.ally.id), n: d.amount })));
    if (mv.effect && cx.ally.hp > 0) {
      const chance = mv.effect.kind === 'stun' ? 1 : SECONDARY_CHANCE;
      if (cx.rng.chance(chance)) applyEffect(cx, 'foe', mv.effect);
    }
  } else if (mv.effect) {
    applyEffect(cx, 'foe', mv.effect);
  }
  checkAlly(cx);
}

/** XP, coins, drops and restored words for one defeated foe. */
function rewards(state: GameState, cx: Ctx, b: BattleState): GameState {
  const idx = indexOf(cx.content);
  const def = idx.enemy.get(cx.foe.id);
  if (!def) return state;
  // sync this turn's damage/heals into the active member before XP is applied
  const synced = cx.party.slice();
  const act = synced[cx.active];
  if (act) synced[cx.active] = { ...act, hp: cx.ally.hp };
  cx.party = synced;
  let s: GameState = { ...state, save: { ...state.save, party: cx.party } };
  const party = s.save.party.slice();
  const ups: { text: string; textSa?: string }[] = [];
  let gained = 0;
  party.forEach((m, i) => {
    const xp = battleXp(def.xp, cx.foe.level, m.level, b.participants.includes(i) && m.hp > 0, m.hp <= 0);
    if (i === cx.active) gained = xp;
    const r = addXp(m, xp, cx.content);
    party[i] = r.member;
    if (r.levels.length) {
      ups.push(withSa({ text: `${allyName(m.id)} reached level ${r.member.level}!` }, saText('levelUp', { x: saAlly(m.id), n: r.member.level })));
      // the Sanskrit leaves out the "(equip it from the Party menu)" hint (a UI instruction; notes/sa-battle.md)
      for (const mv of r.learned) ups.push(withSa({ text: `${allyName(m.id)} learned ${moveName(mv)}!${r.member.moves.includes(mv) ? '' : ' (equip it from the Party menu)'}` }, saText('learned', { x: saAlly(m.id), m: mv })));
    }
  });
  cx.party = party;
  beat(cx, `${allyName(cx.ally.id)} gains ${gained} experience.`, undefined, undefined, saText('xp', { x: saAlly(cx.ally.id), n: gained }));
  const am = party[cx.active];
  if (am) {
    // level-up HP growth shows on the first "reached level" beat
    const nf = fighterFromMember(am, cx.content);
    cx.ally = { ...nf, stages: cx.ally.stages, stunned: cx.ally.stunned };
  }
  for (const t of ups) beat(cx, t.text, undefined, t.text.includes('reached level') ? 'levelup' : undefined, t.textSa);
  const coins = Math.max(1, Math.round((def.niska * cx.foe.level) / 5));
  const items = { ...s.save.items };
  const found: string[] = [];
  for (const d of def.drops ?? []) {
    if (idx.item.has(d.itemId) && cx.rng.chance(d.chance)) {
      items[d.itemId] = (items[d.itemId] ?? 0) + 1;
      found.push(d.itemId);
    }
  }
  beat(cx, `You receive ${coins} coins.`, undefined, undefined, saText('coins', { n: coins }));
  for (const it of found) beat(cx, `Found ${itemName(it)}!`, undefined, undefined, saText('found', { i: it }));
  s = { ...s, save: { ...s.save, party, niska: s.save.niska + coins, items } };
  const words = (def.restoresWords ?? []).filter((id) => idx.lex.has(id));
  if (words.length) {
    s = markSeen(s, words);
    for (const w of words) beat(cx, `Restored word: {w:${w}}`, undefined, undefined, saText('restored', { word: w }));
  }
  return s;
}

/** Optional JSON extension: `extraEffects` on a MoveDef (e.g. a heal that also raises attack). */
function extraEffects(mv: MoveDef): MoveEffect[] {
  const x = (mv as MoveDef & { extraEffects?: MoveEffect[] }).extraEffects;
  return Array.isArray(x) ? x : [];
}

/** `pass`: the hero's turn went elsewhere (a switch — `answer: 'switch'` braces the new hero for a readied blow —, an item, a failed run); `cover` (v0.5a): a benched guardian steps in */
type PlayerAct =
  | { kind: 'move'; move: MoveDef; correct: boolean; swift: boolean; weary: boolean; katha?: KathaCast }
  | { kind: 'pass'; answer?: 'switch' }
  | { kind: 'cover'; allyId: string; moveId: string }
  | { kind: 'shield'; correct: boolean; recital: { shlokaId: string; pada: number; correct: boolean } }
  /** v0.5b (WP-C) a verse-chain link: the line said (`spoken`), the opponent's answer (`reply`) or, stumped, its fresh line */
  | { kind: 'chain'; move: MoveDef; correct: boolean; spoken: PadaRefT; reply: PadaRefT | null; fresh?: PadaRefT; stumped: boolean };

function finishTurn(state: GameState, cx: Ctx, b: BattleState): GameState {
  let s: GameState = { ...state, save: { ...state.save, party: cx.party } };
  let phase: BattleState['phase'] = 'beats';
  if (cx.foeDown) {
    s = rewards(s, cx, b);
    if (b.foeIndex + 1 >= b.spec.enemies.length) {
      beat(cx, cx.v.win, undefined, 'win', saText(cx.v.sa.win));
      phase = 'won';
    }
  }
  if (cx.over === 'lost' && phase !== 'won') phase = 'lost';
  const party = s.save.party.slice();
  const am = party[cx.active];
  if (am) party[cx.active] = { ...am, hp: cx.ally.hp };
  const nb: BattleState = { ...b, ally: cx.ally, foe: cx.foe, beats: [...b.beats, ...cx.beats], phase, turn: b.turn + 1 };
  if (cx.tactics) {
    // v0.5a: the hero's chain, the foe's readied blow (dropped with the foe) and its action count carry to the next turn
    nb.chain = cx.chain;
    nb.warn = cx.foeDown ? undefined : cx.warn;
    nb.foeActs = cx.foeActs;
    // v0.5b P7: the boss phases begun (only once a boss has phases: other battles carry no field)
    if (cx.phases.length > 0 || b.bossPhases) nb.bossPhases = cx.phases;
  }
  return withBattle({ ...s, save: { ...s.save, party } }, nb);
}

function makeCtx(state: GameState, content: GameContent, b: BattleState): { cx: Ctx; state: GameState } {
  const rng = rngFor(state, `battle-turn:${b.turn}`);
  const cx: Ctx = {
    content,
    rng,
    spec: b.spec,
    v: vocab(b.spec, isEchoDuel(state, b.spec)),
    ally: { ...b.ally, stages: { ...b.ally.stages } },
    foe: { ...b.foe, stages: { ...b.foe.stages } },
    party: state.save.party.slice(),
    active: b.active,
    beats: [],
    over: null,
    foeDown: false,
    allyDown: false,
    immune: null,
    echo: isEchoDuel(state, b.spec),
    ...tacticsCtx(state, content, b),
  };
  return { cx, state: bump(state) };
}

/** v0.5a: the tactics part of a turn's context (off — `tactics: false` — outside Kathā wild / boss fights). */
function tacticsCtx(state: GameState, content: GameContent, b: BattleState): Pick<Ctx, 'tactics' | 'chapter' | 'chain' | 'warn' | 'foeActs' | 'plan' | 'phases' | 'flags'> {
  const on = isKatha(state) && b.spec.kind !== 'duel';
  const chapter = state.save.chapter;
  const flags = state.save.flags;
  if (!on) return { tactics: false, chapter, foeActs: 0, plan: null, phases: [], flags };
  return { tactics: true, chapter, chain: b.chain, warn: b.warn, foeActs: b.foeActs ?? 0, plan: warnPlan(content, chapter, b.spec, b.foe), phases: b.bossPhases ?? [], flags };
}

/** A content/sa-battle.json template as a beat: its English (`{x}` / `{m}` filled with name markup) and its Sanskrit. */
function tplBeat(key: string, foeId?: string, moveId?: string): { text: string; textSa?: string } {
  const en = (SA_BATTLE.templates[key]?.en ?? key).replace('{x}', foeId ? foeName(foeId) : '').replace('{m}', moveId ? moveName(moveId) : '');
  return withSa({ text: en }, saText(key, { ...(foeId ? { x: saFoe(foeId) } : {}), ...(moveId ? { m: moveId } : {}) }));
}

/** v0.5a: the opening of a boss whose blow is readied before the first turn (warning `first: 0`): its beat and warn. */
function openingWarn(state: GameState, content: GameContent, spec: BattleSpec, foe: Fighter, snap: { allyHp: number; foeHp: number }): { beats: BattleBeat[]; warn?: BattleState['warn'] } {
  if (!isKatha(state) || spec.kind === 'duel') return { beats: [] };
  const plan = warnPlan(content, state.save.chapter, spec, foe);
  if (!plan || !readiesAt(plan, -1)) return { beats: [] };
  const t = tplBeat(plan.ready, foe.id, plan.moveId);
  return { beats: [{ ...t, ...snap, tactic: 'warn' }], warn: { foeId: foe.id, moveId: plan.moveId, ...(plan.strike ? { strike: plan.strike } : {}), counter: plan.counter } };
}

function resolveTurn(state0: GameState, content: GameContent, act: PlayerAct): GameState {
  const b = state0.battle as BattleState;
  const { cx, state } = makeCtx(state0, content, b);
  // the tutorial duel: the player speaks first, then the duelist says the next pāda (the one the next turn says back)
  const foeTurn = (): void => (cx.echo ? echoModel(cx, duelPada(state0, content, cx.foe.id, b.casts ?? 0)) : foeAct(cx));
  if (act.kind === 'pass') {
    // v0.5a: any other action breaks the astra chain; a switch braces the hero who steps in
    if (cx.tactics) cx.chain = undefined;
    if (act.answer && cx.tactics && cx.warn) cx.answer = act.answer;
    foeTurn();
  } else if (act.kind === 'cover') {
    coverAct(cx, act.allyId, act.moveId);
    foeTurn();
  } else if (act.kind === 'shield') {
    shieldAct(cx, act.correct, act.recital);
    foeTurn();
  } else if (act.kind === 'chain') {
    // the verse chain: the player's link first, then the opponent's line (its answer, or a fresh line when stumped)
    chainAllyAct(cx, act);
    if (!cx.foeDown) chainFoeLine(cx, act.reply ?? act.fresh ?? null);
  } else {
    // a readied blow is slow (v0.5a): the hero acts first, so an answer comes in time
    const allyFirst = cx.echo || (cx.tactics && !!cx.warn) || cx.ally.spd >= cx.foe.spd;
    if (allyFirst) {
      allyAct(cx, act.move, act, act.weary);
      if (!cx.foeDown) foeTurn();
    } else {
      foeAct(cx);
      if (!cx.allyDown && !cx.over) {
        if (cx.ally.stunned) {
          // bound before acting: this turn's action is lost
          cx.ally.stunned = false;
          cx.immune = 'ally';
          beat(cx, `${allyName(cx.ally.id)} is bound and cannot act!`, undefined, undefined, saText('bound', { x: saAlly(cx.ally.id) }));
        } else allyAct(cx, act.move, act, act.weary);
      }
    }
  }
  return finishTurn(state, cx, b);
}

// ───────────────────────── after beats ─────────────────────────

function afterBeats(state: GameState, content: GameContent): GameState {
  const b = state.battle as BattleState;
  if (b.foe.hp <= 0) {
    const nextSpec = b.spec.enemies[b.foeIndex + 1];
    if (!nextSpec) return withBattle(state, { ...b, phase: 'won' });
    const def = must(indexOf(content).enemy, nextSpec.id, 'enemy');
    const foe0 = fighterFromEnemy(nextSpec.id, nextSpec.level, content);
    const foe = isKatha(state) ? kathaFoe(foe0, b.ally, b.spec, content) : foe0;
    const snap = { allyHp: b.ally.hp, foeHp: foe.hp };
    const nb: BattleState = { ...b, foe, foeIndex: b.foeIndex + 1, phase: 'beats', beats: [{ ...introText(b.spec, def, false), ...snap }] };
    if (isKatha(state) && b.spec.kind !== 'duel') {
      // v0.5a: a new foe starts its own warning cadence (and may ready its blow as it steps forward)
      const open = openingWarn(state, content, b.spec, foe, snap);
      nb.beats.push(...open.beats);
      nb.foeActs = 0;
      nb.warn = open.warn;
    }
    return withBattle(state, nb);
  }
  if (b.ally.hp <= 0) {
    if (conscious(state.save.party).length === 0) return withBattle(state, { ...b, phase: 'lost' });
    return withBattle(state, { ...b, phase: 'pick-switch' });
  }
  if (b.ally.stunned) {
    const s1 = withBattle(state, { ...b, ally: { ...b.ally, stunned: false } });
    const { cx, state: s2 } = makeCtx(s1, content, s1.battle as BattleState);
    cx.immune = 'ally';
    beat(cx, `${allyName(cx.ally.id)} is bound and cannot act!`, undefined, undefined, saText('bound', { x: saAlly(cx.ally.id) }));
    foeAct(cx);
    return finishTurn(s2, cx, s2.battle as BattleState);
  }
  if (isKatha(state) && b.spec.kind === 'duel' && b.antya) return chainDuelTurn(state, content, b);
  if (isKatha(state) && b.spec.kind === 'duel') return kathaDuelTurn(state, content, b);
  return withBattle(state, { ...b, phase: 'command' });
}

// ───────────────────────── commands ─────────────────────────

/**
 * v0.6.1 (Kathā): Agastya has taught the Āditya-hṛdayam in the battle (logic-cutscene): the hero in front takes up the
 * moves the hymn unlocked (the party already holds them) and a beat says that only the hymn can help him now. The scene
 * plays over the beat on screen (a hit that crossed 60 %), so this beat comes right after it — before the rest of the
 * turn's narration — with that beat's HP; from the command menu it is the one beat.
 */
export function hymnTaught(state: GameState, content: GameContent, moveId: string): GameState {
  const b = state.battle;
  if (!b) return state;
  const m = state.save.party[b.active];
  const ally = m && m.moves.join('|') !== b.ally.moves.join('|') ? { ...b.ally, moves: m.moves.slice() } : b.ally;
  const t = tplBeat('kathaHymnOnly', undefined, moveId);
  void content;
  const shown = b.phase === 'beats' ? b.beats[0] : undefined;
  if (!shown) return infoBeat(withBattle(state, { ...b, ally }), t.text, t.textSa);
  const beat = withSa({ text: t.text, allyHp: shown.allyHp, foeHp: shown.foeHp }, t.textSa);
  return withBattle(state, { ...b, ally, beats: [shown, beat, ...b.beats.slice(1)] });
}

function infoBeat(state: GameState, text: string, textSa?: string): GameState {
  const b = state.battle as BattleState;
  return withBattle(state, { ...b, phase: 'beats', beats: [...b.beats, withSa({ text, allyHp: b.ally.hp, foeHp: b.foe.hp }, textSa)] });
}

function doRun(state: GameState, content: GameContent): GameState {
  const b = state.battle as BattleState;
  if (b.spec.kind !== 'wild' || !b.spec.canRun) {
    const duel = b.spec.kind === 'duel';
    return infoBeat(state, duel ? 'A debate cannot be abandoned halfway!' : 'There is no running from this battle!', saText(duel ? 'noRunDuel' : 'noRun'));
  }
  const rng = rngFor(state, `run:${b.turn}`);
  const s = bump(state);
  const p = clamp(0.25 + 0.5 * (b.ally.spd / Math.max(1, b.foe.spd)), 0.25, 0.95);
  if (rng.chance(p)) {
    return withBattle(s, { ...b, phase: 'fled', beats: [...b.beats, withSa({ text: 'You got away safely!', allyHp: b.ally.hp, foeHp: b.foe.hp, fx: { kind: 'flee' as const, target: 'ally' as const } }, saText('fled'))] });
  }
  const s2 = withBattle(s, { ...b, beats: [...b.beats, withSa({ text: 'You could not get away!', allyHp: b.ally.hp, foeHp: b.foe.hp }, saText('fleeFail'))] });
  return resolveTurn(s2, content, { kind: 'pass' });
}

function doSwitch(state: GameState, content: GameContent, target: number): GameState {
  const b = state.battle as BattleState;
  const forced = b.ally.hp <= 0;
  const m = state.save.party[target];
  if (target === -1) return forced ? state : withBattle(state, { ...b, phase: 'command' });
  if (!m || m.hp <= 0 || target === b.active) return state;
  const s0 = syncAlly(state);
  const nf = fighterFromMember(m, content);
  const ally: Fighter = { ...nf, stages: { ...b.ally.stages } };
  const beats = [...b.beats];
  if (!forced) beats.push(withSa({ text: `${allyName(b.ally.id)}, come back!`, allyHp: b.ally.hp, foeHp: b.foe.hp }, saText('comeBack', { x: saAlly(b.ally.id) })));
  beats.push(withSa({ text: `Go, ${allyName(ally.id)}!`, allyHp: ally.hp, foeHp: b.foe.hp, fx: { kind: 'switch' as const, target: 'ally' as const } }, saText('go', { x: saAlly(ally.id) })));
  const participants = b.participants.includes(target) ? b.participants : [...b.participants, target];
  const s1 = withBattle(s0, { ...b, ally, active: target, participants, beats, phase: 'beats', ...(b.chain ? { chain: undefined } : {}) });
  return forced ? s1 : resolveTurn(s1, content, { kind: 'pass', answer: 'switch' });
}

function doItem(state: GameState, content: GameContent, i: number): GameState {
  const b = state.battle as BattleState;
  if (i === -1) return withBattle(state, { ...b, phase: 'command' });
  const itemId = battleItems(state, content)[i];
  if (!itemId) return state;
  const it = must(indexOf(content).item, itemId, 'item');
  let party = state.save.party.slice();
  let ally = { ...b.ally };
  const lines: { text: string; textSa?: string; fx?: BattleBeat['fx'] }[] = [];
  const name = allyName(ally.id);
  const nameSa = saAlly(ally.id);
  if (it.kind === 'heal') {
    if (ally.hp >= ally.maxHp) return infoBeat(withBattle(state, { ...b, phase: 'command' }), `${name} is already at full strength.`, saText('fullStrength', { x: nameSa }));
    const before = ally.hp;
    ally.hp = Math.min(ally.maxHp, ally.hp + Math.max(1, Math.round(ally.maxHp * it.amount)));
    lines.push(withSa({ text: `${name} recovers ${ally.hp - before}.`, fx: { kind: 'heal' as const, target: 'ally' as const, amount: ally.hp - before } }, saText('recovers', { x: nameSa, n: ally.hp - before })));
  } else if (it.kind === 'pp') {
    const m = party[b.active] as PartyMember;
    const pp = { ...m.pp };
    let changed = false;
    for (const id of m.moves) {
      const mx = maxPp(id, content);
      const nv = Math.min(mx, (pp[id] ?? 0) + Math.round(it.amount));
      if (nv !== pp[id]) changed = true;
      pp[id] = nv;
    }
    if (!changed) return infoBeat(withBattle(state, { ...b, phase: 'command' }), `${name}'s moves are already fully charged.`, saText('ppFull', { x: nameSa }));
    party[b.active] = { ...m, pp };
    lines.push(withSa({ text: `${name}'s moves are recharged.`, fx: { kind: 'buff' as const, target: 'ally' as const } }, saText('ppRecharged', { x: nameSa })));
  } else if (it.kind === 'revive') {
    const down = party.flatMap((m, j) => (m.hp <= 0 ? [j] : []));
    const whole = it.amount >= 1;
    if (down.length === 0 && !(whole && ally.hp < ally.maxHp)) return infoBeat(withBattle(state, { ...b, phase: 'command' }), 'No one needs reviving.', saText('noRevive'));
    const targets = whole ? party.map((_, j) => j) : down.slice(0, 1);
    party = party.map((m, j) => {
      if (!targets.includes(j) || j === b.active) return m;
      const mx = maxHpOf(m, content);
      return m.hp <= 0 || whole ? { ...m, hp: Math.max(m.hp, Math.max(1, Math.round(mx * it.amount))) } : m;
    });
    if (whole) ally.hp = Math.max(ally.hp, Math.round(ally.maxHp * it.amount));
    const revivedId = (party[targets[0] as number] as PartyMember).id;
    lines.push(withSa({ text: whole ? 'Every hero is restored!' : `${allyName(revivedId)} is revived!`, fx: { kind: 'heal' as const, target: 'ally' as const } }, whole ? saText('allRestored') : saText('revived', { x: saAlly(revivedId) })));
  } else if (it.kind === 'buff') {
    ally = { ...ally, stages: { ...ally.stages, atk: clamp(ally.stages.atk + Math.round(it.amount), -MAX_STAGE, MAX_STAGE) } };
    lines.push(withSa({ text: `${name}'s attack rises!`, fx: { kind: 'buff' as const, target: 'ally' as const } }, saText('statRise', { x: nameSa, s: 'atk' })));
  } else return state;
  const items = { ...state.save.items, [itemId]: Math.max(0, (state.save.items[itemId] ?? 0) - 1) };
  const beats: BattleBeat[] = [
    ...b.beats,
    withSa({ text: `You use ${itemName(itemId)}.`, allyHp: b.ally.hp, foeHp: b.foe.hp }, saText('useItem', { i: itemId })),
    ...lines.map((l) => ({ text: l.text, allyHp: ally.hp, foeHp: b.foe.hp, ...(l.fx ? { fx: l.fx } : {}), ...(l.textSa !== undefined ? { textSa: l.textSa } : {}) })),
  ];
  const am = party[b.active];
  if (am) party[b.active] = { ...am, hp: ally.hp };
  const s1 = withBattle({ ...state, save: { ...state.save, party, items } }, { ...b, ally, beats, phase: 'beats' });
  return resolveTurn(s1, content, { kind: 'pass' });
}

/** v0.5a (Kathā): a benched guardian covers the readied blow (logic-tactics coverOf); the same object when nobody can. */
function doCover(state: GameState, content: GameContent): GameState {
  const c = coverOf(state, content);
  const b = state.battle as BattleState;
  if (!c || b.phase !== 'command') return state;
  const participants = b.participants.includes(c.index) ? b.participants : [...b.participants, c.index];
  const s1 = withBattle(state, { ...b, participants, phase: 'beats' });
  return resolveTurn(s1, content, { kind: 'cover', allyId: c.allyId, moveId: c.moveId });
}

/** v0.5a (Kathā): the verse shield — a recitation of a heard verse's pāda (shieldPada); its answer resolves the turn. */
function doShield(state: GameState, content: GameContent): GameState {
  const b = state.battle as BattleState;
  const ref = canShield(state, content) ? shieldPada(state, content) : null;
  if (!ref || b.phase !== 'command') return state;
  const { state: s, challenge } = buildSmarana(state, content, { shlokaId: ref.shlokaId, pada: ref.pada, mode: 'battle' });
  return { ...s, battle: { ...b, phase: 'challenge', pendingMove: undefined, pendingShield: true, casts: (b.casts ?? 0) + 1 }, pending: { kind: 'challenge', challenge, context: 'battle' } };
}

function doPickMove(state: GameState, content: GameContent, i: number): GameState {
  const b = state.battle as BattleState;
  if (i === -1) return withBattle(state, { ...b, phase: 'command' });
  const menu = battleMenu(state, content);
  const entry = menu.moves[i];
  if (!entry || !entry.usable) return state;
  const mv = must(indexOf(content).move, entry.id, 'move');
  if (isKatha(state)) return kathaPickMove(state, content, b, mv);
  const { state: s, challenge } = makeChallenge(state, content, mv.challenge);
  return { ...s, battle: { ...b, phase: 'challenge', pendingMove: mv.id }, pending: { kind: 'challenge', challenge, context: 'battle' } };
}

const isWeary = (state: GameState, b: BattleState): boolean => b.ally.moves.every((id) => (state.save.party[b.active]?.pp[id] ?? 0) <= 0);

/**
 * Kathā move: an astra (a move bound to a pāda) opens a smarana challenge for one pāda of its verse (astraPada: the
 * least-practised eligible pāda, the binding's first; v0.4.1), any move in a duel recites a heard verse (only when no
 * verse has been heard is a duel turn picked from the menu: see kathaDuelTurn); a plain move resolves at once (no input,
 * ordinary power).
 */
function kathaPickMove(state: GameState, content: GameContent, b: BattleState, mv: MoveDef): GameState {
  const bound = astraBinding(content, mv.id) ? astraPada(state, content, mv.id) : null;
  const casts = b.casts ?? 0;
  const ref = bound ?? (b.spec.kind === 'duel' ? duelPada(state, content, b.foe.id, casts) : null);
  if (!ref) {
    const s0 = withBattle(state, { ...b, phase: 'beats' });
    return resolveTurn(s0, content, { kind: 'move', move: mv, correct: true, swift: false, weary: isWeary(state, b), katha: { recalled: false, bound: false } });
  }
  const { state: s, challenge } = buildSmarana(state, content, { shlokaId: ref.shlokaId, pada: ref.pada, mode: 'battle', moveId: mv.id });
  return { ...s, battle: { ...b, phase: 'challenge', pendingMove: mv.id, casts: casts + 1 }, pending: { kind: 'challenge', challenge, context: 'battle' } };
}

/**
 * Kathā duel (v0.4.1): every player turn goes straight to the recitation of a heard pāda (duelPada: the duel's own verse
 * first, rotating) with no command menu and no move choice; the line carries the power of the hero's best damaging move
 * (duelMove; no PP is spent). Phase `challenge`, `pendingMove` = that move. Nothing heard yet → the ordinary menu.
 */
function kathaDuelTurn(state: GameState, content: GameContent, b: BattleState): GameState {
  const casts = b.casts ?? 0;
  const ref = duelPada(state, content, b.foe.id, casts);
  const mv = duelMove(b.ally, b.foe, content);
  if (!ref || !mv) return withBattle(state, { ...b, phase: 'command' });
  // the tutorial duel's echo: the duelist has just said this pāda in full, so it is said back with one gap (v0.4.3)
  const { state: s, challenge } = buildSmarana(state, content, { shlokaId: ref.shlokaId, pada: ref.pada, mode: 'battle', ...(isEchoDuel(state, b.spec) ? { echo: true } : {}) });
  return { ...s, battle: { ...b, phase: 'challenge', pendingMove: mv.id, casts: casts + 1 }, pending: { kind: 'challenge', challenge, context: 'battle' } };
}

/**
 * v0.5b (WP-C) the verse chain's player turn: straight to the 'antya' pick (logic-chain chainOptions) with no command
 * menu — the chain reset to "any line" first when no unused heard pāda opens with the key (chainReady). The line carries
 * the power of the hero's best damaging move (duelMove; no PP). Nothing to pick (no heard verse): the ordinary Kathā duel.
 */
function chainDuelTurn(state: GameState, content: GameContent, b: BattleState): GameState {
  const mv = duelMove(b.ally, b.foe, content);
  const antya = chainReady(state, content, b.antya as NonNullable<BattleState['antya']>);
  const r = mv ? chainOptions(state, content, antya) : null;
  if (!r || !mv) return kathaDuelTurn(state, content, { ...b, antya: undefined });
  return { ...r.state, battle: { ...b, antya, phase: 'challenge', pendingMove: mv.id }, pending: { kind: 'challenge', challenge: r.challenge, context: 'battle' } };
}

/**
 * v0.5b (WP-C) the verse chain's pick resolves the turn directly (no feedback phase): the picked line (logic-chain
 * chainTurn: a wrong chip says the right line, at half power), the opponent's answer or its fresh line when stumped.
 */
function chainAnswer(state: GameState, content: GameContent, answer: { option?: string; timeMs?: number }): GameState {
  const b = state.battle as BattleState;
  const p = state.pending;
  if (p?.kind !== 'challenge' || !b.antya || !b.pendingMove || !p.challenge.antya) return state;
  const ch = p.challenge;
  const i = (ch.options ?? []).findIndex((o) => o.id === answer.option);
  const pick = ch.antya?.lines[i];
  if (i < 0 || !pick) return state;
  const correct = (ch.answers ?? []).includes(answer.option as string);
  const t = chainTurn(state, content, b.antya, pick);
  const timeMs = typeof answer.timeMs === 'number' && Number.isFinite(answer.timeMs) ? Math.max(0, answer.timeMs) : 0;
  const s = recordResult(state, ch, { correct, swift: false, timeMs });
  const mv = must(indexOf(content).move, b.pendingMove, 'move');
  const s0: GameState = { ...s, pending: { kind: 'battle' }, battle: { ...b, phase: 'beats', pendingMove: undefined, antya: t.antya } };
  const s1 = resolveTurn(s0, content, { kind: 'chain', move: mv, correct, spoken: t.spoken, reply: t.reply, ...(t.reply === null && t.antya.prev ? { fresh: t.antya.prev } : {}), stumped: t.reply === null });
  return { ...s1, fx: [...s1.fx, { kind: 'sfx', name: correct ? 'correct' : 'wrong' }] };
}

/** Kathā: a smarana answer resolves the turn directly (no feedback phase); `lastSmarana` lets the view animate it. */
function kathaAnswer(state: GameState, content: GameContent, answer: { picks?: unknown; auto?: unknown; timeMs?: unknown }): GameState {
  const b = state.battle as BattleState;
  const p = state.pending;
  if (p?.kind !== 'challenge' || (!b.pendingMove && !b.pendingShield) || !p.challenge.smarana) return state;
  const ch = p.challenge;
  const spec = p.challenge.smarana;
  const g = gradeSmarana(ch, answer);
  if (!g) return state;
  const gapped = spec.gaps.length > 0;
  let s = recordSmarana(state, spec, g.correct, g.auto);
  const timeMs = typeof answer.timeMs === 'number' && Number.isFinite(answer.timeMs) ? Math.max(0, answer.timeMs) : 0;
  if (gapped && !g.auto) s = recordResult(s, ch, { correct: g.correct, swift: false, timeMs });
  if (b.pendingShield) {
    // v0.5a: a verse shield's line resolves the turn as a shield
    const s0: GameState = { ...s, lastSmarana: { challenge: ch, picks: g.picks, correct: g.correct, auto: g.auto, context: 'battle' }, pending: { kind: 'battle' }, battle: { ...b, phase: 'beats', pendingMove: undefined, pendingShield: undefined } };
    const s1 = resolveTurn(s0, content, { kind: 'shield', correct: g.correct, recital: { shlokaId: spec.shlokaId, pada: spec.pada, correct: g.correct } });
    return { ...s1, fx: [...s1.fx, ...(gapped && !g.auto ? [{ kind: 'sfx' as const, name: g.correct ? ('correct' as const) : ('wrong' as const) }] : [])] };
  }
  const mv = must(indexOf(content).move, b.pendingMove as string, 'move');
  const duel = b.spec.kind === 'duel'; // a Kathā duel turn (kathaDuelTurn): the line, not the move, is the answer
  const katha: KathaCast = { recital: { shlokaId: spec.shlokaId, pada: spec.pada, correct: g.correct }, recalled: g.correct && gapped && !g.auto, bound: !duel && astraBinding(content, mv.id) !== null, ...(duel ? { duel: true } : {}) };
  const s0: GameState = { ...s, lastSmarana: { challenge: ch, picks: g.picks, correct: g.correct, auto: g.auto, context: 'battle' }, pending: { kind: 'battle' }, battle: { ...b, phase: 'beats', pendingMove: undefined } };
  const s1 = resolveTurn(s0, content, { kind: 'move', move: mv, correct: g.correct, swift: false, weary: !duel && isWeary(state, b), katha });
  const fx: Fx[] = gapped && !g.auto ? [{ kind: 'sfx', name: g.correct ? 'correct' : 'wrong' }] : [];
  return { ...s1, fx: [...s1.fx, ...fx] };
}

function doAnswer(state: GameState, content: GameContent, answer: { option?: string; order?: number[]; timeMs: number }): GameState {
  const b = state.battle as BattleState;
  const p = state.pending;
  if (p?.kind !== 'challenge') return state;
  if (p.challenge.kind === 'smarana') return kathaAnswer(state, content, answer as { picks?: unknown; auto?: unknown; timeMs?: unknown });
  if (p.challenge.kind === 'antya') return chainAnswer(state, content, answer);
  const result = grade(p.challenge, answer, false);
  const s = recordResult(state, p.challenge, result);
  return {
    ...s,
    battle: { ...b, phase: 'feedback' },
    pending: { kind: 'feedback', challenge: p.challenge, result, ...(answer.option !== undefined ? { picked: answer.option } : {}), ...(answer.order ? { order: answer.order } : {}) },
    fx: [...s.fx, { kind: 'sfx', name: result.correct ? 'correct' : 'wrong' }],
  };
}

function doResolveFeedback(state: GameState, content: GameContent): GameState {
  const b = state.battle as BattleState;
  const p = state.pending;
  if (p?.kind !== 'feedback' || !b.pendingMove) return state;
  const mv = must(indexOf(content).move, b.pendingMove, 'move');
  const m = state.save.party[b.active];
  const weary = b.ally.moves.every((id) => (m?.pp[id] ?? 0) <= 0);
  const s0: GameState = { ...state, pending: { kind: 'battle' }, battle: { ...b, phase: 'beats', pendingMove: undefined } };
  const s1 = resolveTurn(s0, content, { kind: 'move', move: mv, correct: p.result.correct, swift: p.result.swift, weary });
  const fx: Fx[] = p.result.swift ? [{ kind: 'flash' }] : [];
  return { ...s1, fx: [...s1.fx, ...fx] };
}

export function battleAction(state: GameState, content: GameContent, action: Action): GameState {
  const b = state.battle;
  if (!b) return state;
  switch (b.phase) {
    case 'intro':
    case 'beats':
    case 'won':
    case 'lost':
    case 'fled': {
      if (action.type !== 'advance') return state;
      if (b.beats.length === 0) return b.phase === 'intro' || b.phase === 'beats' ? afterBeats(state, content) : state;
      const nb = { ...b, beats: b.beats.slice(1) };
      const s = withBattle(state, nb);
      if (nb.beats.length > 0 || nb.phase === 'won' || nb.phase === 'lost' || nb.phase === 'fled') return s;
      return afterBeats(s, content);
    }
    case 'command': {
      if (action.type !== 'choose') return state;
      if (action.index === 0) return withBattle(state, { ...b, phase: 'pick-move' });
      if (action.index === 1) return battleMenu(state, content).switchable.length ? withBattle(state, { ...b, phase: 'pick-switch' }) : infoBeat(state, 'No other hero can step in.', saText('noSwitch'));
      if (action.index === 2) return battleItems(state, content).length ? withBattle(state, { ...b, phase: 'pick-item' }) : infoBeat(state, 'You have no items to use.', saText('noItems'));
      if (action.index === 3) return doRun(state, content);
      if (action.index === COVER_CMD) return doCover(state, content);
      if (action.index === SHIELD_CMD) return doShield(state, content);
      return state;
    }
    case 'pick-move':
      return action.type === 'choose' ? doPickMove(state, content, action.index) : state;
    case 'pick-switch':
      return action.type === 'choose' ? doSwitch(state, content, action.index) : state;
    case 'pick-item':
      return action.type === 'choose' ? doItem(state, content, action.index) : state;
    case 'challenge':
      return action.type === 'answer' ? doAnswer(state, content, action) : state;
    case 'feedback':
      return action.type === 'advance' ? doResolveFeedback(state, content) : state;
  }
}

export function battleOutcome(state: GameState): 'win' | 'lose' | 'run' | null {
  const b = state.battle;
  if (!b || b.beats.length > 0) return null;
  return b.phase === 'won' ? 'win' : b.phase === 'lost' ? 'lose' : b.phase === 'fled' ? 'run' : null;
}

export function endBattle(state: GameState, _content: GameContent): { state: GameState; outcome: 'win' | 'lose' | 'run' } {
  const b = state.battle;
  const outcome = battleOutcome(state) ?? (b?.phase === 'won' ? 'win' : b?.phase === 'lost' ? 'lose' : 'run');
  const s = syncAlly(state);
  // core increments session.battlesWon on 'win' (notes/core.md), so it is not counted here
  return { state: { ...s, battle: null, mode: 'explore', pending: null }, outcome };
}

export function rollEncounter(state: GameState, content: GameContent, map: MapDef): { state: GameState; spec: BattleSpec | null } {
  const enc = map.encounters;
  if (!enc || enc.rate <= 0 || state.save.party.every((m) => m.hp <= 0)) return { state, spec: null };
  const idx = indexOf(content);
  const table = enc.table.filter((t) => idx.enemy.has(t.enemyId) && t.weight > 0);
  if (table.length === 0) return { state, spec: null };
  const rng = rngFor(state, `encounter:${map.id}`);
  const s = bump(state);
  if (!rng.chance(enc.rate)) return { state: s, spec: null };
  const e = rng.weighted(table, table.map((t) => t.weight));
  const level = rng.range(Math.min(e.minLevel, e.maxLevel), Math.max(e.minLevel, e.maxLevel));
  return { state: s, spec: { enemies: [{ id: e.enemyId, level }], kind: 'wild', canRun: true, canLose: false, bg: map.battleBg, music: 'battle' } };
}
