/**
 * Kathā mode (v0.4): journey style, level floors, astra bindings and the smarana (recitation) builder. OWNER: kc-core.
 * Spec: notes/katha.md ("What Kathā changes (logic)" and "Smarana (recitation) challenges", audited in
 * /home/claude/scratch/ux-audit/AUDIT.md). Pure + deterministic: randomness only via rngFor(state, label) + bump.
 *
 * Sanskrit accuracy: nothing here creates Sanskrit. A smarana challenge shows the printed pāda (`shloka.padas[p]`)
 * split on spaces, verbatim, and every option is one of those printed chunks (of the same verse; a whole one-chunk
 * pāda in a shrine recital). The chandas engine only labels the printed akṣaras laghu / guru.
 *
 * The practice game (style absent or 'abhyasa') never reaches this module's state changes: every caller checks
 * `isKatha(state)` first.
 */
import { scanLine, spellingKey, splitAksharas, devaToSlp1, normalizeDeva } from '@sanskrit';
import type { BattleSpec, Challenge, ChallengeOption, Fighter, GameContent, GameState, JourneyStyle, MoveDef, PartyMember, SaveData, Shloka, SmaranaChunk, SmaranaSpec } from './types';
import { bump, clamp, indexOf, rngFor } from './logic-util';
import { MAX_EQUIPPED, addXp, damage, learnableMoves, xpToNext } from './logic-progress';

// ───────────────────────── journey style ─────────────────────────

/** Flag set while the journey style is Kathā (story JSON branches with `{ "if": "style.katha", "then": [...] }`). */
export const KATHA_FLAG = 'style.katha';

/** The journey style of a save (absent = the practice game). */
export function styleOf(save: Pick<SaveData, 'style'>): JourneyStyle {
  return save.style === 'katha' ? 'katha' : 'abhyasa';
}

export function isKatha(state: { save: Pick<SaveData, 'style'> }): boolean {
  return state.save.style === 'katha';
}

/**
 * v0.4.1: set once a Kathā save's unlocked astras have been equipped (armKatha). A Kathā save without it (written by
 * v0.4.0) is armed once when it is loaded; later choices in the move editor are then left alone.
 */
export const ARMED_FLAG = 'katha.armed';

/** Kathā save fields: style, the derived flags and an smṛti record (the floor and the astras are applied separately). */
export function kathaSave(save: SaveData, style: JourneyStyle): SaveData {
  const flags = { ...save.flags };
  if (style === 'katha') {
    flags[KATHA_FLAG] = true;
    flags[ARMED_FLAG] = true;
  } else {
    delete flags[KATHA_FLAG];
    delete flags[ARMED_FLAG];
  }
  return { ...save, style, flags, ...(style === 'katha' ? { smrti: save.smrti ?? {} } : {}) };
}

// ───────────────────────── astras reach the bosses (v0.4.1) ─────────────────────────

/** A verse-bound move (defs.json `unlockShloka`): an astra. */
export function isAstra(content: GameContent, moveId: string): boolean {
  return !!indexOf(content).move.get(moveId)?.unlockShloka;
}

/**
 * The slot a newly unlocked astra takes in Kathā: a free slot (index = moves.length) while fewer than 4 are equipped,
 * otherwise the least useful PLAIN move (a status move first, then the lowest power; the earliest slot on a tie). Never
 * another astra, and never the hero's only damaging move for a status astra. null = no slot (the astra stays learnable).
 */
export function astraSlot(moves: string[], moveId: string, content: GameContent): number | null {
  const idx = indexOf(content);
  if (moves.includes(moveId)) return null;
  if (moves.length < MAX_EQUIPPED) return moves.length;
  const power = (id: string): number => idx.move.get(id)?.power ?? 0;
  const damaging = moves.filter((id) => power(id) > 0);
  const lastHit = (idx.move.get(moveId)?.power ?? 0) <= 0 && damaging.length === 1 ? damaging[0] : undefined;
  let best: number | null = null;
  moves.forEach((id, i) => {
    if (isAstra(content, id) || id === lastHit) return;
    if (best === null || power(id) < power(moves[best] as string)) best = i;
  });
  return best;
}

/** One astra equipped in Kathā (`replaced`: the plain move it took the place of). */
export interface ArmedAstra {
  allyId: string;
  moveId: string;
  replaced?: string;
}

/** Equip one astra on a member (Kathā rule, astraSlot); PP is set for it either way. */
export function armAstra(member: PartyMember, moveId: string, content: GameContent): { member: PartyMember; armed: ArmedAstra | null } {
  const mv = indexOf(content).move.get(moveId);
  if (!mv) return { member, armed: null };
  const pp = member.pp[moveId] === undefined ? { ...member.pp, [moveId]: mv.pp } : member.pp;
  const slot = astraSlot(member.moves, moveId, content);
  if (slot === null) return { member: pp === member.pp ? member : { ...member, pp }, armed: null };
  const old = member.moves[slot];
  const moves = member.moves.slice();
  moves[slot] = moveId;
  return { member: { ...member, moves, pp }, armed: { allyId: member.id, moveId, ...(old !== undefined ? { replaced: old } : {}) } };
}

/** Equip every unlocked (verse restored) astra a member can learn but has not equipped, in defs order. */
export function armMember(member: PartyMember, save: Pick<SaveData, 'shlokas'>, content: GameContent): { member: PartyMember; armed: ArmedAstra[] } {
  let m = member;
  const armed: ArmedAstra[] = [];
  for (const id of learnableMoves(member, save, content)) {
    if (!isAstra(content, id) || m.moves.includes(id)) continue;
    const r = armAstra(m, id, content);
    m = r.member;
    if (r.armed) armed.push(r.armed);
  }
  return { member: m, armed };
}

/** Kathā: equip the whole party's unlocked astras (set-style, the v0.4.0 save migration) and set ARMED_FLAG. */
export function armParty(state: GameState, content: GameContent): { state: GameState; armed: ArmedAstra[] } {
  if (!isKatha(state)) return { state, armed: [] };
  const armed: ArmedAstra[] = [];
  const party = state.save.party.map((m) => {
    const r = armMember(m, state.save, content);
    armed.push(...r.armed);
    return r.member;
  });
  return { state: { ...state, save: { ...state.save, party, flags: { ...state.save.flags, [ARMED_FLAG]: true } } }, armed };
}

// ───────────────────────── shorter story fights (v0.4.1) ─────────────────────────

/** Player turns a Kathā fight is scaled to (with the lead hero's best hit), split over the foes of the battle. */
export const KATHA_TURNS: Record<BattleSpec['kind'], number> = { wild: 3, duel: 6, boss: 7 };
/** The tutorial duel (`spec.tutorial`, v0.4.3) is scaled to one turn per pāda: the verse is learned once through. */
export const KATHA_TUTORIAL_TURNS = 4;

/**
 * The Kathā tutorial duel (v0.4.3, `BattleSpec.tutorial`): call and response. The duelist's turn is a model recitation
 * (the next pāda said in full, no input) instead of an attack; the player then says that pāda back with one gap. The
 * practice game never plays it (the spec field is ignored there).
 */
export function isEchoDuel(state: { save: Pick<SaveData, 'style'> }, spec: Pick<BattleSpec, 'kind' | 'tutorial'>): boolean {
  return isKatha(state) && spec.kind === 'duel' && spec.tutorial === true;
}

/** A Kathā foe never has less than this share of its ordinary HP. */
export const KATHA_HP_FLOOR = 0.3;

/**
 * The damage of the fighter's best equipped damaging move against `foe` (quality 1, mean variance), 0 when it has none;
 * with `setup`, × 1.25 if the fighter can raise its attack and × 1.25 if it can lower the foe's defence (one stage each:
 * a player who uses such a move once; not in a duel, where every turn is the recited line).
 */
export function bestHit(ally: Fighter, foe: Fighter, content: GameContent, setup = true): number {
  const idx = indexOf(content);
  let best = 0;
  let up = false;
  let down = false;
  for (const id of ally.moves) {
    const mv = idx.move.get(id);
    if (!mv) continue;
    if (mv.power > 0) best = Math.max(best, damage(ally, foe, mv, 1, 0.925).amount);
    const effects = [mv.effect, ...((mv as MoveDef & { extraEffects?: MoveDef['effect'][] }).extraEffects ?? [])];
    for (const e of effects) {
      if (e?.kind === 'buff-atk' && e.target !== 'enemy' && e.amount > 0) up = true;
      if (e?.kind === 'debuff-def' && e.target === 'enemy') down = true;
    }
  }
  return setup ? best * (up ? 1.25 : 1) * (down ? 1.25 : 1) : best;
}

/** Equipped moves of a member that are bound to a pāda (astras the hero can recite). */
export function boundAstras(member: Pick<PartyMember, 'moves'>, content: GameContent): number {
  return member.moves.filter((id) => astraBinding(content, id) !== null).length;
}

/**
 * Kathā (v0.4.1): who steps forward first in a story battle (every kind). `spec.lead` when that hero is conscious;
 * otherwise the conscious hero with the most equipped bound astras, so the verses reach the bosses. Ties keep the usual
 * order (logic-battle leadIndex: the reciter first in a duel, else the heroes in party order and the reciter last), so
 * with no astras anywhere the lead is the usual one. undefined = nobody is conscious.
 */
export function kathaLead(party: PartyMember[], spec: BattleSpec, content: GameContent): number | undefined {
  if (spec.lead) {
    const i = party.findIndex((m) => m.id === spec.lead && m.hp > 0);
    if (i >= 0) return i;
  }
  const alive = party.flatMap((m, i) => (m.hp > 0 ? [i] : []));
  const isPlayer = (i: number): boolean => party[i]?.id === 'player';
  const order = spec.kind === 'duel' ? [...alive.filter(isPlayer), ...alive.filter((i) => !isPlayer(i))] : [...alive.filter((i) => !isPlayer(i)), ...alive.filter(isPlayer)];
  let best: number | undefined;
  let most = -1;
  for (const i of order) {
    const n = boundAstras(party[i] as PartyMember, content);
    if (n > most) {
      best = i;
      most = n;
    }
  }
  return best;
}

/**
 * Kathā foe HP: min(ordinary, max(KATHA_HP_FLOOR × ordinary, KATHA_TURNS[kind] / foes × the active hero's best hit)),
 * so a story fight lasts ≈ 6–10 player turns and a boss ≈ 8–12 whatever the party (never longer than the practice game's).
 * The foe's level (XP, coins) and every other stat are unchanged.
 */
export function kathaFoe(foe: Fighter, ally: Fighter, spec: BattleSpec, content: GameContent): Fighter {
  const tamed = kathaFoeAtk(foe, ally, content);
  const hit = bestHit(ally, tamed, content, spec.kind !== 'duel');
  if (hit <= 0) return tamed;
  const turns = spec.kind === 'duel' && spec.tutorial ? KATHA_TUTORIAL_TURNS : KATHA_TURNS[spec.kind];
  const want = Math.round((turns / Math.max(1, spec.enemies.length)) * hit);
  const hp = clamp(want, Math.ceil(foe.maxHp * KATHA_HP_FLOOR), foe.maxHp);
  return hp === foe.maxHp ? tamed : { ...tamed, hp, maxHp: hp };
}

/** A Kathā foe's best ordinary hit on the hero who steps forward is at most this share of the hero's max HP. */
export const KATHA_FOE_HIT = 0.25;

/**
 * Kathā (v0.4.1): the foe's attack lowered (never raised) so its strongest move hits the lead hero for at most
 * KATHA_FOE_HIT of the hero's max HP (stage 0, no crit): the reciter who steps forward is never felled in two or three
 * blows, so a story fight cannot be lost by a reasonable player.
 */
export function kathaFoeAtk(foe: Fighter, ally: Fighter, content: GameContent): Fighter {
  const idx = indexOf(content);
  let worst = 0;
  for (const id of foe.moves) {
    const mv = idx.move.get(id);
    if (mv && mv.power > 0) worst = Math.max(worst, damage(foe, ally, mv, 1, 1).amount);
  }
  const cap = ally.maxHp * KATHA_FOE_HIT;
  if (worst <= cap) return foe;
  return { ...foe, atk: Math.max(1, Math.floor((foe.atk * cap) / worst)) };
}

/** Kathā duel turn: the move whose power the recited line carries (the best damaging move; else the first one). */
export function duelMove(ally: Fighter, foe: Fighter, content: GameContent): MoveDef | undefined {
  const idx = indexOf(content);
  let best: MoveDef | undefined;
  let bestD = -1;
  for (const id of ally.moves) {
    const mv = idx.move.get(id);
    if (!mv) continue;
    const d = mv.power > 0 ? damage(ally, foe, mv, 1, 1).amount : 0;
    if (d > bestD) {
      best = mv;
      bestD = d;
    }
  }
  return best;
}

// ───────────────────────── party level floor ─────────────────────────

/**
 * Kathā has no random encounters, so story battles are the only XP. Every hero is raised to at least this level
 * (per chapter) at the chapter card, before every story battle and when Kathā is chosen. Tuned with the story bot
 * (logic-sim, katha.test.ts): a perfect and a 70 %-accurate reciter win every story fight without grinding.
 */
export const KATHA_FLOOR: Record<number, number> = { 1: 7, 2: 11, 3: 16, 4: 19, 5: 23, 6: 33 };

export function kathaFloor(save: Pick<SaveData, 'chapter'>): number {
  return KATHA_FLOOR[save.chapter] ?? 1;
}

/** XP that takes a member exactly to `level` (0 when already there). */
function xpTo(m: PartyMember, level: number): number {
  let need = -m.xp;
  for (let l = m.level; l < level; l++) need += xpToNext(l);
  return Math.max(0, need);
}

/** Raise every party member below the chapter floor to it (HP grows with the level; level moves are learned). */
export function applyKathaFloor(state: GameState, content: GameContent): GameState {
  if (!isKatha(state)) return state;
  const floor = kathaFloor(state.save);
  const idx = indexOf(content);
  let changed = false;
  const party = state.save.party.map((m) => {
    if (m.level >= floor || !idx.ally.has(m.id)) return m;
    changed = true;
    return addXp(m, xpTo(m, floor), content).member;
  });
  return changed ? { ...state, save: { ...state.save, party } } : state;
}

// ───────────────────────── printed chunks ─────────────────────────

export interface PadaInfo {
  key: string; // `${shlokaId}:${pada}`
  shlokaId: string;
  pada: number;
  /** the printed pāda split on spaces (verbatim) */
  chunks: string[];
  /** spellingKey of each chunk */
  keys: string[];
  /** lexIds of the verse words inside each chunk (pada-ccheda words aligned to the printed chunks) */
  lex: string[][];
  /** akṣara count of each chunk */
  ak: number[];
  /** spellingKey of the whole pāda (chunks joined by one space) */
  lineKey: string;
  /** laghu / guru per printed akṣara (absent when the scansion does not align with the printed akṣaras) */
  weights?: ('L' | 'G')[];
}

interface KathaIndex {
  padas: Map<string, PadaInfo>;
  byShloka: Map<string, PadaInfo[]>;
  /** lineKey → pāda keys with that line */
  lines: Map<string, string[]>;
  all: PadaInfo[];
}

const kathaCache = new WeakMap<GameContent, KathaIndex>();

export const padaKey = (shlokaId: string, pada: number): string => `${shlokaId}:${pada}`;

function aksharas(s: string): string[] {
  try {
    return splitAksharas(s);
  } catch {
    return [...s];
  }
}

function slp(s: string): string {
  try {
    return devaToSlp1(normalizeDeva(s)).replace(/[^A-Za-z]/g, '');
  } catch {
    return s;
  }
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_v, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0] as number;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j] as number;
      row[j] = Math.min((row[j] as number) + 1, (row[j - 1] as number) + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length] as number;
}

/**
 * Align the pada-ccheda words of one pāda to its printed chunks (each chunk takes ≥ 1 consecutive word): the split
 * whose joined word forms are closest (edit distance in SLP1) to the printed chunks. Sandhi only changes letters at
 * the joins, so this recovers which words a chunk like dadāmy-etad-vrataṃ (s-sakrdeva pāda 3) holds.
 */
export function alignWords(chunks: string[], words: { form: string; lexId: string }[]): string[][] {
  const n = chunks.length;
  const m = words.length;
  if (n === 0) return [];
  if (m === 0) return chunks.map(() => []);
  if (m < n) return chunks.map((_c, i) => (words[i] ? [words[i]!.lexId] : []));
  const cs = chunks.map(slp);
  const ws = words.map((w) => slp(w.form));
  const INF = 1e9;
  // cost[i][j]: best cost for the first i chunks using the first j words
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(INF));
  const back: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(-1));
  cost[0]![0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = i; j <= m - (n - i); j++) {
      for (let k = i - 1; k < j; k++) {
        const prev = cost[i - 1]![k]!;
        if (prev >= INF) continue;
        const c = prev + editDistance(cs[i - 1]!, ws.slice(k, j).join(''));
        if (c < cost[i]![j]!) {
          cost[i]![j] = c;
          back[i]![j] = k;
        }
      }
    }
  }
  const out: string[][] = new Array(n);
  let j = m;
  for (let i = n; i >= 1; i--) {
    const k = back[i]![j]!;
    out[i - 1] = words.slice(k, j).map((w) => w.lexId);
    j = k;
  }
  return out;
}

/** Laghu / guru per printed akṣara of the pāda, when the chandas scan lines up with the chunks' akṣaras. */
function padaWeights(chunks: string[]): ('L' | 'G')[] | undefined {
  try {
    const printed = chunks.flatMap(aksharas);
    const scan = scanLine(chunks.join(' '));
    if (scan.length !== printed.length || scan.some((s, i) => normalizeDeva(s.text) !== normalizeDeva(printed[i] as string))) return undefined;
    return scan.map((s) => s.weight);
  } catch {
    return undefined;
  }
}

export function kathaIndex(content: GameContent): KathaIndex {
  const hit = kathaCache.get(content);
  if (hit) return hit;
  const padas = new Map<string, PadaInfo>();
  const byShloka = new Map<string, PadaInfo[]>();
  const lines = new Map<string, string[]>();
  const all: PadaInfo[] = [];
  for (const sh of content.shlokas) {
    const list: PadaInfo[] = [];
    sh.padas.forEach((text, p) => {
      const chunks = text.split(/\s+/).filter(Boolean);
      const words = sh.words.filter((w) => w.pada === p);
      const key = padaKey(sh.id, p);
      const lineKey = spellingKey(chunks.join(' '));
      const weights = padaWeights(chunks);
      const info: PadaInfo = { key, shlokaId: sh.id, pada: p, chunks, keys: chunks.map((c) => spellingKey(c)), lex: alignWords(chunks, words), ak: chunks.map((c) => aksharas(c).length), lineKey, ...(weights ? { weights } : {}) };
      padas.set(key, info);
      list.push(info);
      all.push(info);
      lines.set(lineKey, [...(lines.get(lineKey) ?? []), key]);
    });
    byShloka.set(sh.id, list);
  }
  const idx: KathaIndex = { padas, byShloka, lines, all };
  kathaCache.set(content, idx);
  return idx;
}

export function padaInfo(content: GameContent, shlokaId: string, pada: number): PadaInfo | undefined {
  return kathaIndex(content).padas.get(padaKey(shlokaId, pada));
}

// ───────────────────────── astra bindings ─────────────────────────

export interface PadaRef {
  shlokaId: string;
  pada: number;
}

/** Astras recite only pādas of at least two printed chunks (one-chunk pādas would blank the whole line). */
export const MIN_BOUND_CHUNKS = 2;

function bindable(content: GameContent, ref: PadaRef): boolean {
  return (padaInfo(content, ref.shlokaId, ref.pada)?.chunks.length ?? 0) >= MIN_BOUND_CHUNKS;
}

/**
 * The pāda a verse-bound move (defs.json `unlockShloka`) recites: its content/katha.json `astras` entry, else the first
 * pāda of its verse with ≥ 2 chunks. null = a plain move (no input in Kathā).
 */
export function astraBinding(content: GameContent, moveId: string): PadaRef | null {
  const mv = indexOf(content).move.get(moveId);
  if (!mv?.unlockShloka) return null;
  const entry = content.katha?.astras?.find((a) => a.moveId === moveId);
  if (entry && bindable(content, entry)) return { shlokaId: entry.shlokaId, pada: entry.pada };
  const list = kathaIndex(content).byShloka.get(mv.unlockShloka) ?? [];
  const first = list.find((p) => p.chunks.length >= MIN_BOUND_CHUNKS);
  return first ? { shlokaId: first.shlokaId, pada: first.pada } : null;
}

/**
 * Every pāda a bound astra recites over time (v0.4.1, "recite the whole verse"): the pādas of its verse with ≥ 2 chunks
 * and at least one chunk that may be the gap (not the astra's own name), the binding's pāda first, then in verse order.
 */
export function astraPadas(content: GameContent, moveId: string): PadaRef[] {
  const b = astraBinding(content, moveId);
  if (!b) return [];
  const ok = (kathaIndex(content).byShloka.get(b.shlokaId) ?? []).filter((p) => p.chunks.length >= MIN_BOUND_CHUNKS && gapEligible(content, p, moveId).length > 0);
  return [b, ...ok.filter((p) => p.pada !== b.pada).map((p) => ({ shlokaId: p.shlokaId, pada: p.pada }))];
}

/**
 * The pāda the next cast of a bound astra recites: the least-practised of astraPadas (lowest smṛti level, then streak,
 * then casts since mastery); a tie goes to the binding's pāda, then verse order. A fresh astra starts on its binding.
 */
export function astraPada(state: GameState, content: GameContent, moveId: string): PadaRef | null {
  const before = (a: number[], b: number[]): boolean => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return (a[i] as number) < (b[i] as number);
    return false;
  };
  let best: PadaRef | null = null;
  let bestKey: number[] = [];
  for (const ref of astraPadas(content, moveId)) {
    const e = smrtiOf(state.save, padaKey(ref.shlokaId, ref.pada));
    const key = [e.level, e.streak, e.casts ?? 0];
    if (best === null || before(key, bestKey)) {
      best = ref;
      bestKey = key;
    }
  }
  return best;
}

// ───────────────────────── the astra's own name (never the gap) ─────────────────────────

const marksCache = new WeakMap<GameContent, Map<string, { lex: Set<string>; stems: string[] }>>();

/** lexIds and SLP1 stems that a move's Sanskrit name stands for (content/names.json `move.<id>`). */
function nameMarks(content: GameContent, moveId: string | undefined): { lex: Set<string>; stems: string[] } {
  if (!moveId) return { lex: new Set(), stems: [] };
  let cache = marksCache.get(content);
  if (!cache) marksCache.set(content, (cache = new Map()));
  const hit = cache.get(moveId);
  if (hit) return hit;
  const marks = computeMarks(content, moveId);
  cache.set(moveId, marks);
  return marks;
}

function computeMarks(content: GameContent, moveId: string): { lex: Set<string>; stems: string[] } {
  const lex = new Set<string>();
  const stems: string[] = [];
  const name = indexOf(content).name.get(`move.${moveId}`)?.sa;
  if (!name) return { lex, stems };
  for (const part of name.split(/\s+/).filter(Boolean)) {
    const k = spellingKey(part);
    let s = slp(k);
    if (s.length > 3 && s.endsWith('a')) s = s.slice(0, -1); // a-stem: dharma → Darm (matches dharmaḥ, dharmam …)
    if (s.length >= 2) stems.push(s);
    for (const e of content.lexicon) if (spellingKey(e.lemma) === k || e.forms.some((f) => spellingKey(f.form) === k)) lex.add(e.id);
  }
  return { lex, stems };
}

/** Chunks of a pāda that may be the gap: never one that shares a lexId or stem with the astra's own name. */
export function gapEligible(content: GameContent, info: PadaInfo, moveId?: string): number[] {
  const marks = nameMarks(content, moveId);
  return info.chunks.flatMap((c, i) => {
    const s = slp(info.keys[i] ?? c);
    if (marks.stems.some((st) => s.includes(st))) return [];
    if ((info.lex[i] ?? []).some((id) => marks.lex.has(id))) return [];
    return [i];
  });
}

// ───────────────────────── smṛti (recitation mastery) ─────────────────────────

export type SmrtiEntry = NonNullable<SaveData['smrti']>[string];
export const MASTERED = 4;
export const FIRST_CHECK = 2;

export function smrtiOf(save: Pick<SaveData, 'smrti'>, key: string): SmrtiEntry {
  return save.smrti?.[key] ?? { level: 0, streak: 0 };
}

/**
 * How the next cast of a pāda is built. `gapLevel` 0 = no gap; 1 = the last chunk; 2 = one rotated chunk; 3 = one
 * rotated chunk with first-akṣara hints elsewhere. Battle: level 4 recites itself except on mastered casts 2, 4, 8 …
 * (a spot check). Shrine recital: always one gap (level 0 → 1, mastered → 3).
 */
export function castPlan(entry: SmrtiEntry, mode: 'battle' | 'recital'): { gapLevel: 0 | 1 | 2 | 3; check: boolean } {
  const level = clamp(Math.round(entry.level), 0, MASTERED);
  if (mode === 'recital') return { gapLevel: level === 0 ? 1 : level >= MASTERED ? 3 : (level as 1 | 2 | 3), check: false };
  if (level < MASTERED) return { gapLevel: level as 0 | 1 | 2 | 3, check: false };
  const next = (entry.casts ?? 0) + 1;
  return next === (entry.nextCheck ?? FIRST_CHECK) ? { gapLevel: 3, check: true } : { gapLevel: 0, check: false };
}

/**
 * Mastery after one answered cast. Automatic recitation leaves it untouched. Two flawless casts in a row → level + 1
 * (max 4, then the spot-check schedule starts); a miss → level − 1 (min 0); a miss on a mastered pāda → level 3.
 * A line with no gap (level 0 exposure, a mastered self-recital) counts as flawless.
 */
export function nextSmrti(entry: SmrtiEntry, spec: Pick<SmaranaSpec, 'gaps' | 'check'>, correct: boolean): SmrtiEntry {
  const gap = spec.gaps[0];
  const last = gap !== undefined ? { last: gap } : entry.last !== undefined ? { last: entry.last } : {};
  if (entry.level >= MASTERED) {
    const casts = entry.casts ?? 0;
    const nextCheck = entry.nextCheck ?? FIRST_CHECK;
    if (gap === undefined) return { level: MASTERED, streak: 0, casts: casts + 1, nextCheck, ...last };
    if (!correct) return { level: MASTERED - 1, streak: 0, ...last };
    if (spec.check) return { level: MASTERED, streak: 0, casts: casts + 1, nextCheck: nextCheck * 2, ...last };
    return { level: MASTERED, streak: 0, casts, nextCheck, ...last }; // a mastered pāda recited at a shrine
  }
  if (!correct) return { level: Math.max(0, entry.level - 1), streak: 0, ...last };
  const streak = entry.streak + 1;
  if (streak < 2) return { level: entry.level, streak, ...last };
  const level = Math.min(MASTERED, entry.level + 1);
  return level >= MASTERED ? { level, streak: 0, casts: 0, nextCheck: FIRST_CHECK, ...last } : { level, streak: 0, ...last };
}

/** Write the result of one cast into save.smrti (unless it was an automatic recitation). */
export function recordSmarana(state: GameState, spec: SmaranaSpec, correct: boolean, auto: boolean): GameState {
  if (auto) return state;
  const key = padaKey(spec.shlokaId, spec.pada);
  const entry = nextSmrti(smrtiOf(state.save, key), spec, correct);
  return { ...state, save: { ...state.save, smrti: { ...(state.save.smrti ?? {}), [key]: entry } } };
}

// ───────────────────────── options ─────────────────────────

interface Cand {
  text: string;
  key: string;
  lex: string[];
  ak: number;
  shlokaId: string;
  pada: number;
  whole: boolean;
}

function candidatesOf(list: PadaInfo[]): Cand[] {
  return list.flatMap((p) => p.chunks.map((text, i) => ({ text, key: p.keys[i] as string, lex: p.lex[i] ?? [], ak: p.ak[i] ?? 0, shlokaId: p.shlokaId, pada: p.pada, whole: p.chunks.length === 1 })));
}

/** The pāda line with chunk `gap` replaced by `text` would be ANOTHER real pāda (e.g. keyūre ↔ kuṇḍale in s-naham-janami). */
export function completesOtherPada(content: GameContent, info: PadaInfo, gap: number, text: string): boolean {
  const line = spellingKey(info.chunks.map((c, i) => (i === gap ? text : c)).join(' '));
  return (kathaIndex(content).lines.get(line) ?? []).some((k) => k !== info.key);
}

/**
 * Two distractors for the gap: printed chunks of the same verse (other verses only if the verse runs short) that do not
 * share a spelling or a lexId with the answer and would not complete another real pāda. Preference: pādas not yet shown
 * (shrine), chunks not on the line itself, the same syllable count. A one-chunk pāda (shrine) is gapped whole and is
 * offered against other one-chunk pādas first (a whole line against a whole line: a shared particle such as na is no
 * giveaway there, the verse's order decides, so only the spelling rule applies between two whole pādas).
 */
export function distractorsFor(content: GameContent, info: PadaInfo, gap: number, rng: { shuffle<T>(xs: readonly T[]): T[] }, mode: 'battle' | 'recital'): string[] {
  const ki = kathaIndex(content);
  const answerKey = info.keys[gap] as string;
  const answerLex = new Set(info.lex[gap] ?? []);
  const ak = info.ak[gap] ?? 0;
  const whole = info.chunks.length === 1;
  const ok = (c: Cand): boolean => c.key !== answerKey && ((whole && c.whole) || !c.lex.some((id) => answerLex.has(id))) && (whole || !completesOtherPada(content, info, gap, c.text));
  const score = (c: Cand, sameVerse: boolean): number => {
    let s = sameVerse ? 100 : 0;
    if (whole) s += c.whole ? 20 : 0;
    else {
      if (mode === 'recital' && sameVerse && c.pada > info.pada) s += 6; // not yet shown in the recital
      if (!(sameVerse && c.pada === info.pada)) s += 4; // not visible on the line
    }
    s += c.ak === ak ? 3 : Math.abs(c.ak - ak) === 1 ? 1 : 0;
    return s;
  };
  const own = candidatesOf(ki.byShloka.get(info.shlokaId) ?? []).filter(ok).map((c) => ({ c, s: score(c, true) }));
  const others = own.length >= 4 && !whole ? [] : candidatesOf(ki.all.filter((p) => p.shlokaId !== info.shlokaId)).filter(ok).map((c) => ({ c, s: score(c, false) }));
  const ranked = rng.shuffle([...own, ...others]).sort((a, b) => b.s - a.s);
  const out: string[] = [];
  const seen = new Set<string>([answerKey]);
  for (const { c } of ranked) {
    if (seen.has(c.key)) continue;
    seen.add(c.key);
    out.push(c.text);
    if (out.length === 2) break;
  }
  return out;
}

// ───────────────────────── the smarana challenge ─────────────────────────

export interface SmaranaRequest {
  shlokaId: string;
  pada: number;
  mode: 'battle' | 'recital';
  /** the astra cast (its own name is never the gap) */
  moveId?: string;
  /** recital step (1-based) and length, for ids only */
  step?: number;
  /**
   * the tutorial duel's echo (v0.4.3): the pāda was just said in full by the duelist, so a pāda below mastery that would
   * recite with no gap (level 0) gets the level-1 gap (its last eligible chunk) — one tap, never more
   */
  echo?: boolean;
}

/** Which chunk to gap at this gap level (L1: the last eligible chunk; L2/L3: rotate after the previous gap). */
function pickGap(eligible: number[], gapLevel: number, entry: SmrtiEntry, rng: { int(n: number): number }): number | undefined {
  if (eligible.length === 0 || gapLevel === 0) return undefined;
  if (gapLevel === 1) return eligible[eligible.length - 1];
  if (entry.last === undefined) return eligible[rng.int(eligible.length)];
  return eligible.find((i) => i > (entry.last as number)) ?? eligible[0];
}

/** Build the smarana challenge for one pāda (bumps tick). Throws only for an unknown pāda (callers check). */
export function buildSmarana(state: GameState, content: GameContent, req: SmaranaRequest): { state: GameState; challenge: Challenge } {
  const info = padaInfo(content, req.shlokaId, req.pada);
  const sh = indexOf(content).shloka.get(req.shlokaId) as Shloka | undefined;
  if (!info || !sh) throw new Error(`buildSmarana: unknown pāda ${req.shlokaId}:${req.pada}`);
  const rng = rngFor(state, `smarana:${info.key}`);
  const entry = smrtiOf(state.save, info.key);
  const plan0 = castPlan(entry, req.mode);
  const plan = req.echo && plan0.gapLevel === 0 && entry.level < MASTERED ? { gapLevel: 1 as const, check: false } : plan0;
  const eligible = info.chunks.length === 1 ? [0] : gapEligible(content, info, req.moveId);
  const gap = pickGap(eligible, plan.gapLevel, entry, rng);
  const hint = plan.gapLevel === 3 && gap !== undefined;
  // a one-akṣara chunk has no first-akṣara cue to give: it shows in full (v0.4.1: no abbreviation cue on a one-akṣara word)
  const chunks: SmaranaChunk[] = info.chunks.map((text, i) => ({ text, show: i === gap ? 'gap' : hint && (info.ak[i] ?? 0) > 1 ? 'hint' : 'full' }));
  let gapOptions: ChallengeOption[][] = [];
  let gapAnswers: string[][] = [];
  if (gap !== undefined) {
    const texts = rng.shuffle([info.chunks[gap] as string, ...distractorsFor(content, info, gap, rng, req.mode)]);
    gapOptions = [texts.map((sa, i) => ({ id: `o${i}`, sa }))];
    gapAnswers = [texts.flatMap((t, i) => (spellingKey(t) === info.keys[gap] ? [`o${i}`] : []))];
  }
  // the level it was built at: a spot check stays 4 (mastered, `check: true`); a recital's gap level otherwise
  const level = plan.check && gap !== undefined ? MASTERED : gap === undefined ? clamp(entry.level, 0, MASTERED) : plan.gapLevel;
  const spec: SmaranaSpec = {
    shlokaId: info.shlokaId,
    pada: info.pada,
    chunks,
    gaps: gap === undefined ? [] : [gap],
    gapOptions,
    gapAnswers,
    level,
    ...(plan.check && gap !== undefined ? { check: true } : {}),
    ...(info.weights ? { weights: info.weights } : {}),
  };
  const challenge: Challenge = {
    id: `c-${state.tick}`,
    kind: 'smarana',
    prompt: gap === undefined ? 'Recite the line.' : 'Recite the line: recall the missing word.',
    shlokaId: info.shlokaId,
    padaIndex: info.pada,
    lexIds: gap === undefined ? [] : [...new Set(info.lex[gap] ?? [])],
    explanation: `{n:kanda.${sh.kanda}} ${sh.kanda}.${sh.sarga}.${sh.verse}`,
    timeLimitMs: 0,
    smarana: spec,
  };
  return { state: bump(state), challenge };
}

/** An answer to a smarana challenge: `picks` (one option id per gap), or `auto` (automatic recitation). */
export interface SmaranaAnswer {
  picks?: unknown;
  auto?: unknown;
}

/**
 * Grade a smarana answer, or null when it does not fit the challenge (wrong number of picks, unknown option id).
 * A line with no gap takes `picks: []` (or none); `auto: true` is always correct.
 */
export function gradeSmarana(ch: Challenge, a: SmaranaAnswer): { correct: boolean; auto: boolean; picks: string[] } | null {
  const sp = ch.smarana;
  if (!sp) return null;
  if (a.auto === true) return { correct: true, auto: true, picks: [] };
  const picks = a.picks === undefined ? [] : a.picks;
  if (!Array.isArray(picks) || !picks.every((p) => typeof p === 'string')) return null;
  if (picks.length !== sp.gaps.length) return null;
  let correct = true;
  for (let g = 0; g < sp.gaps.length; g++) {
    const pick = picks[g] as string;
    if (!(sp.gapOptions[g] ?? []).some((o) => o.id === pick)) return null;
    if (!(sp.gapAnswers[g] ?? []).includes(pick)) correct = false;
  }
  return { correct, auto: false, picks: [...(picks as string[])] };
}

// ───────────────────────── duels ─────────────────────────

/** The duel's own verse: the heard verse holding most of the duelist's `restoresWords` (null when none is heard). */
export function duelVerse(state: GameState, content: GameContent, foeId: string): string | null {
  const words = new Set(indexOf(content).enemy.get(foeId)?.restoresWords ?? []);
  if (words.size === 0) return null;
  let best: string | null = null;
  let bestN = 0;
  for (const sh of content.shlokas) {
    if (!state.save.shlokas[sh.id]?.heard) continue;
    const n = new Set(sh.words.map((w) => w.lexId).filter((id) => words.has(id))).size;
    if (n > bestN) {
      best = sh.id;
      bestN = n;
    }
  }
  return best;
}

/**
 * The pāda a duel turn recites: the duel's own verse when it is heard (its pādas in turn), otherwise every heard verse's
 * pādas in story order, rotating with the battle's cast count. Only pādas of ≥ 2 chunks. null = nothing heard yet.
 */
export function duelPada(state: GameState, content: GameContent, foeId: string, cast: number): PadaRef | null {
  const ki = kathaIndex(content);
  const own = duelVerse(state, content, foeId);
  const pool = (own ? ki.byShloka.get(own) ?? [] : ki.all.filter((p) => state.save.shlokas[p.shlokaId]?.heard)).filter((p) => p.chunks.length >= MIN_BOUND_CHUNKS);
  if (pool.length === 0) return null;
  const p = pool[((cast % pool.length) + pool.length) % pool.length] as PadaInfo;
  return { shlokaId: p.shlokaId, pada: p.pada };
}

// ───────────────────────── shrine recital ─────────────────────────

/** The four pādas of a verse in order, one smarana each (always one gap: a recital is always 4 taps). */
export function smaranaRecitalQueue(state: GameState, content: GameContent, shlokaId: string): { state: GameState; queue: Challenge[] } {
  const list = kathaIndex(content).byShloka.get(shlokaId) ?? [];
  let s = state;
  const queue: Challenge[] = [];
  for (const p of list) {
    const r = buildSmarana(s, content, { shlokaId, pada: p.pada, mode: 'recital', step: queue.length + 1 });
    s = r.state;
    queue.push(r.challenge);
  }
  return { state: s, queue };
}
