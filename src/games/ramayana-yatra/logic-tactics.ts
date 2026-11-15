/**
 * Kathā battle tactics (v0.5a). OWNER: fx-strat. Spec: notes/katha.md → "v0.5a: a strategic layer".
 * Pure + deterministic (no rng here). Kathā only: every caller checks isKatha first; the practice game never reaches it.
 *
 * Owner's playtest of Bāla-kāṇḍa: "just spamming Rāma with the āgneyāstra was effective … there wasn't really a
 * strategic element there." Four light rules, grounded in Vālmīki where the text says something (content/katha.json
 * `tactics`, each entry with its `source`) and in plain element logic (catalog ELEMENT_CHART) where it does not:
 *  1. **The right astra for the right foe.** The astra that fits a foe in the text is decisive — the foe falls or is
 *     driven off, with a short story beat (Bāla 1.30.17–18: the Mānava astra hurls Mārīca a hundred yojanas into the
 *     ocean, alive; 1.30.21–22: the Āgneya fells Subāhu; Yuddha 6.108: the brahmāstra, once Rāvaṇa is worn down). The foe
 *     card shows each foe's affinity (that astra, else the element strong against it).
 *  2. **Read the warning, answer it.** A boss readies a great blow one turn ahead in one short Sanskrit line (future
 *     tense: "… प्रयोक्ष्यते!" / Tāṭakā's rain of stones, Bāla 1.26.16). Its next action is the blow (it acts after the
 *     hero). A support move (any move with no power: a guard, a heal, a mantra), a switch, a cover by a benched guardian
 *     (Lakṣmaṇa's रक्षा, one tap) or a counter (the arrows that met Tāṭakā's stones, Bāla 1.26.17; a move of the element
 *     strong against the blow's element) blunts it to KATHA_BLUNT and leaves the foe open (its defence falls
 *     KATHA_OPENING stages); ignored, it lands at KATHA_STRIKE × an ordinary hit, capped at KATHA_STRIKE_CAP of the hero's
 *     max HP — it costs HP, never the fight.
 *  3. **Astra fatigue.** The same astra (verse-bound, or one of Viśvāmitra's `divine` weapons) cast on consecutive turns
 *     lands at KATHA_FATIGUE (× 0.6, then × 0.4); any other action resets it. The move button shows a "tired" cue.
 *  4. **Roles.** Guardians (`tactics.guards`: Lakṣmaṇa → रक्षा) cover from the bench when a blow is readied.
 *  5. **The verse shield.** With a blow readied, the hero may answer by reciting a line of any heard verse (the least
 *     practised pāda first, so the whole verse book comes round): recited, the blow is blunted and the foe left open; a
 *     faltering line protects half as well (the Kathā rule: a miss = half effect).
 *  6. **Boss phases** (v0.5b P7, OWNER: WP-C; `tactics.phases`). A phase begins once the boss is at or below `below` × its
 *     HP and shows its beat (each time it begins; `once`: one time per battle). A phase with a `floor` holds while the
 *     hero in front holds its fitting move (`fit`, equipped): a hit that does not fit cannot take the boss below
 *     `floor` × its HP — the beat shows again ("a head falls, and a new one rises") and, if the fitting astra is spent, it
 *     comes back to hand (1 PP), so the fight can always end. A hero without it is never held back. A phase may wait for
 *     a story flag (`requires`): until it is set the phase does not begin, its floor holds every blow — its fit too, from
 *     any hero — and its fit is not decisive, so the boss cannot be finished. Rāvaṇa (owner, 14 Nov): the Āditya-hṛdayam
 *     (Yuddha 6.105; package E's cutscene sets `seen.aditya` at ≤ 60 %) → his heads grow back (6.107.55–58) → Mātali's
 *     reminder (6.108.1–2) → the brahmāstra (6.108.16–18).
 */
import type { BattleSpec, BattleState, Element, Fighter, GameContent, GameState, KathaPhase, KathaTactics, MoveDef, MoveEffect, PartyMember } from './types';
import { type PadaRef, MIN_BOUND_CHUNKS, kathaIndex, padaKey, smrtiOf } from './logic-katha';
import { indexOf, testFlag } from './logic-util';
import { ELEMENT_CHART } from './catalog';
import { MAX_EQUIPPED } from './logic-progress';
import { isKatha, tiresMove } from './logic-katha';

/** Damage of an astra cast again on consecutive turns: the 1st cast × 1, the 2nd × 0.6, the 3rd and later × 0.4. */
export const KATHA_FATIGUE = [1, 0.6, 0.4] as const;
/** A readied blow that is not answered: × this of the foe's ordinary hit … */
export const KATHA_STRIKE = 2.4;
/** … but at most this share of the hero's max HP (never the fight). */
export const KATHA_STRIKE_CAP = 0.45;
/** An answered blow: × this … */
export const KATHA_BLUNT = 0.3;
/** … and the foe is left open: its defence falls this many stages (sharply). */
export const KATHA_OPENING = 1;
/** Warning cadence: first readied on the foe's 2nd action (content `first` overrides; 0 = in the opening), then every 3rd. */
export const KATHA_WARN_FIRST = 2;
export const KATHA_WARN_EVERY = 3;
/** Battle command index of a cover (Kathā, a blow readied, a benched guardian): `{ type: 'choose', index: COVER_CMD }`. */
export const COVER_CMD = 4;
/** Battle command index of the verse shield (Kathā, a blow readied): the hero recites a line of a heard verse. */
export const SHIELD_CMD = 5;
/** The default warning line (content/sa-battle.json): "{x} is about to use {m}!" (future tense of the "uses" line). */
export const WARN_TEMPLATE = 'kathaWarn';

const EMPTY: KathaTactics = { divine: [], grants: [], guards: [], fits: [], warnings: [] };

export function tacticsOf(content: GameContent): KathaTactics {
  return content.katha?.tactics ?? EMPTY;
}

// ───────────────────────── fatigue ─────────────────────────

/** A damaging astra: verse-bound (defs.json unlockShloka) or one of the `divine` weapons. Only these tire (logic-katha tiresMove). */
export function tires(content: GameContent, moveId: string): boolean {
  return tiresMove(content, moveId);
}

/** The damage multiplier of casting `moveId` now (after `chain`). */
export function fatigueMult(chain: BattleState['chain'], content: GameContent, moveId: string): number {
  if (!chain || chain.moveId !== moveId || !tires(content, moveId)) return 1;
  return KATHA_FATIGUE[Math.min(chain.n, KATHA_FATIGUE.length - 1)] as number;
}

/** The chain after casting `moveId`. */
export function nextChain(chain: BattleState['chain'], moveId: string): NonNullable<BattleState['chain']> {
  return chain && chain.moveId === moveId ? { moveId, n: chain.n + 1 } : { moveId, n: 1 };
}

/** True when the move's next cast would land tired (the view's cue). */
export function isTired(b: Pick<BattleState, 'chain'>, content: GameContent, moveId: string): boolean {
  return fatigueMult(b.chain, content, moveId) < 1;
}

// ───────────────────────── matchups ─────────────────────────

type FitEntry = KathaTactics['fits'][number];

/** The text's fitting astra for this foe in this book (or undefined). */
export function fitFor(content: GameContent, chapter: number, foeId: string): FitEntry | undefined {
  return tacticsOf(content).fits.find((f) => f.foe === foeId && (f.chapter === undefined || f.chapter === chapter));
}

/** The fitting astra lands decisively now: it is the foe's fit, and the foe is worn down to `below` (if set). */
export function isDecisive(content: GameContent, chapter: number, foe: Pick<Fighter, 'id' | 'hp' | 'maxHp'>, moveId: string, flags?: Flags): boolean {
  const f = fitFor(content, chapter, foe.id);
  if (!f || f.move !== moveId) return false;
  // v0.5b: a boss phase this move fits that waits for a story flag (`requires`) keeps it from being decisive until then
  if (phasesOf(content, chapter, foe.id).some((p) => p.fit === moveId && !phaseOpen(p, flags))) return false;
  return f.below === undefined || foe.hp <= Math.ceil(foe.maxHp * f.below);
}

/** The elements of the heroes' moves that can be super effective (× 2), in the order the card names them. */
const HERO_ELEMENTS: Element[] = ['divya', 'agni', 'jala', 'vayu', 'bhumi'];

/** The heroes' element whose attacks are super effective (× 2) against `el` (plain element logic), or undefined. */
export function strongAgainst(el: Element): Element | undefined {
  return HERO_ELEMENTS.find((a) => (ELEMENT_CHART[a]?.[el] ?? 1) >= 2);
}

/** What the foe card shows: the text's fitting astra, else the element strong against the foe (null: neither). */
export type Affinity = { kind: 'astra'; moveId: string; below?: number } | { kind: 'element'; element: Element };
export function affinityOf(content: GameContent, chapter: number, foe: Pick<Fighter, 'id' | 'element'>): Affinity | null {
  const f = fitFor(content, chapter, foe.id);
  if (f && indexOf(content).move.has(f.move)) return { kind: 'astra', moveId: f.move, ...(f.below !== undefined ? { below: f.below } : {}) };
  const el = strongAgainst(foe.element);
  return el ? { kind: 'element', element: el } : null;
}

// ───────────────────────── warnings ─────────────────────────

export interface WarnPlan {
  moveId: string;
  ready: string;
  strike?: string;
  counter: string[];
  /** the foe action that readies it first (−1 = in the opening) */
  start: number;
  every: number;
}

/** The foe's great blow: its strongest damaging move (by power; the first on a tie). */
export function greatMove(foe: Pick<Fighter, 'moves'>, content: GameContent): MoveDef | undefined {
  const idx = indexOf(content);
  let best: MoveDef | undefined;
  for (const id of foe.moves) {
    const mv = idx.move.get(id);
    if (mv && mv.power > 0 && (!best || mv.power > best.power)) best = mv;
  }
  return best;
}

/** How a Kathā boss warns (null: no warnings — wild fights, duels, a foe with no damaging move). */
export function warnPlan(content: GameContent, chapter: number, spec: Pick<BattleSpec, 'kind'>, foe: Pick<Fighter, 'id' | 'moves'>): WarnPlan | null {
  if (spec.kind !== 'boss') return null;
  const mv = greatMove(foe, content);
  if (!mv) return null;
  const e = tacticsOf(content).warnings.find((w) => w.foe === foe.id && (w.chapter === undefined || w.chapter === chapter));
  const first = e?.first ?? KATHA_WARN_FIRST;
  return { moveId: mv.id, ready: e?.ready ?? WARN_TEMPLATE, ...(e?.strike ? { strike: e.strike } : {}), counter: e?.counter ?? [], start: first - 1, every: KATHA_WARN_EVERY };
}

/**
 * v0.5b (WP-C): a warned blow that does not fall on the heroes themselves lands at this share of a great blow
 * (`strikeScale` on a content/katha.json warning; default 1) — Subāhu's and Mārīca's rain of blood drenches the altar
 * (Bāla 1.30.12), so it costs the heroes half. (types.ts lists no such field yet: requested in notes/v05b-c.md.)
 */
export function strikeScale(content: GameContent, chapter: number, foeId: string): number {
  const e = tacticsOf(content).warnings.find((w) => w.foe === foeId && (w.chapter === undefined || w.chapter === chapter)) as { strikeScale?: number } | undefined;
  const k = e?.strikeScale;
  return typeof k === 'number' && k > 0 && k <= 1 ? k : 1;
}

/** Does the foe ready its blow on action number `acts` (0-based; −1 = the opening)? */
export function readiesAt(plan: WarnPlan, acts: number): boolean {
  return acts >= plan.start && (acts - plan.start) % plan.every === 0;
}

/** Element of moves that counter a blow of `el` (super effective against it), for the natural elements only. */
function counterElement(el: Element): Element | undefined {
  if (el === 'maya' || el === 'divya' || el === 'none') return undefined;
  return (['agni', 'jala', 'vayu', 'bhumi'] as Element[]).find((a) => (ELEMENT_CHART[a]?.[el] ?? 1) > 1);
}

/** How a move answers the readied blow: a support move (no power), a counter (listed, or of the counter element), or not at all. */
export function answerOf(content: GameContent, warn: BattleState['warn'], moveId: string): 'guard' | 'counter' | null {
  if (!warn) return null;
  const idx = indexOf(content);
  const mv = idx.move.get(moveId);
  if (!mv) return null;
  if (mv.power <= 0) return 'guard';
  if (warn.counter.includes(moveId)) return 'counter';
  const blow = idx.move.get(warn.moveId);
  const ce = blow ? counterElement(blow.element) : undefined;
  return ce && mv.element === ce ? 'counter' : null;
}

// ───────────────────────── guardians (cover) ─────────────────────────

const isGuardEffect = (e: MoveEffect | undefined): boolean => !!e && ((e.kind === 'buff-def' && e.target !== 'enemy') || (e.kind === 'debuff-atk' && e.target === 'enemy'));

/**
 * The benched hero who can cover a readied blow in one tap: a guardian of `tactics.guards` (Lakṣmaṇa → रक्षा) first,
 * then any conscious benched hero with an equipped guard move (raises the heroes' defence / lowers the foe's attack)
 * that needs no recitation; party order. null when no blow is readied or nobody can cover.
 */
export function coverOf(state: GameState, content: GameContent): { index: number; allyId: string; moveId: string } | null {
  const b = state.battle;
  if (!b || !b.warn || !isKatha(state) || b.spec.kind === 'duel') return null;
  const idx = indexOf(content);
  const party = state.save.party;
  const bench = party.flatMap((m, i) => (i !== b.active && m.hp > 0 ? [i] : []));
  for (const g of tacticsOf(content).guards) {
    const i = bench.find((j) => party[j]?.id === g.ally);
    if (i !== undefined && idx.move.has(g.move)) return { index: i, allyId: g.ally, moveId: g.move };
  }
  for (const i of bench) {
    const m = party[i] as PartyMember;
    const id = m.moves.find((x) => {
      const mv = idx.move.get(x);
      return !!mv && mv.power <= 0 && !mv.unlockShloka && isGuardEffect(mv.effect);
    });
    if (id) return { index: i, allyId: m.id, moveId: id };
  }
  return null;
}

// ───────────────────────── grants (Viśvāmitra's astras) ─────────────────────────

/** One move a grant gave (`replaced`: the plain move it took the place of; `equipped`: false when no slot was free). */
export interface Granted {
  allyId: string;
  moveId: string;
  replaced?: string;
  equipped: boolean;
}

/**
 * Kathā: give each hero the moves of every grant whose flag is set (only `flag` when given), once — a move the hero
 * already knows (equipped, or with a PP record) is left alone. A granted move fills a free slot, else the weakest move
 * that is neither verse-bound nor a divine weapon nor another grant (Rāma's plain bāṇa); with no such slot it is known
 * (the Party menu lists it) but not equipped. The practice game: the same object.
 */
export function applyGrants(state: GameState, content: GameContent, flag?: string): { state: GameState; granted: Granted[] } {
  if (!isKatha(state)) return { state, granted: [] };
  const t = tacticsOf(content);
  const idx = indexOf(content);
  const granted: Granted[] = [];
  const special = new Set([...t.divine, ...t.grants.flatMap((g) => g.moves)]);
  let party = state.save.party;
  for (const g of t.grants) {
    if (flag !== undefined ? g.flag !== flag : !state.save.flags[g.flag]) continue;
    party = party.map((m) => {
      if (m.id !== g.ally) return m;
      let moves = m.moves;
      let pp = m.pp;
      for (const id of g.moves) {
        const mv = idx.move.get(id);
        if (!mv || moves.includes(id) || pp[id] !== undefined) continue;
        pp = { ...pp, [id]: mv.pp };
        let slot: number | null = moves.length < MAX_EQUIPPED ? moves.length : null;
        if (slot === null) {
          moves.forEach((x, i) => {
            const xm = idx.move.get(x);
            if (!xm || xm.unlockShloka || special.has(x)) return;
            if (slot === null || xm.power < (idx.move.get(moves[slot] as string)?.power ?? 0)) slot = i;
          });
        }
        if (slot === null) {
          granted.push({ allyId: m.id, moveId: id, equipped: false });
          continue;
        }
        const old = moves[slot];
        moves = moves.slice();
        moves[slot] = id;
        granted.push({ allyId: m.id, moveId: id, equipped: true, ...(old !== undefined ? { replaced: old } : {}) });
      }
      return moves === m.moves && pp === m.pp ? m : { ...m, moves, pp };
    });
  }
  return granted.length ? { state: { ...state, save: { ...state.save, party } }, granted } : { state, granted };
}

// ───────────────────────── the verse shield ─────────────────────────

/**
 * The pāda a verse shield recites: of every heard verse, the pādas of ≥ 2 printed chunks; the least practised (smṛti
 * level, streak, casts since mastery), ties in story order. null when no verse has been heard.
 */
export function shieldPada(state: GameState, content: GameContent): PadaRef | null {
  let best: PadaRef | null = null;
  let bestKey: number[] = [];
  const before = (a: number[], b: number[]): boolean => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return (a[i] as number) < (b[i] as number);
    return false;
  };
  for (const p of kathaIndex(content).all) {
    if (p.chunks.length < MIN_BOUND_CHUNKS || !state.save.shlokas[p.shlokaId]?.heard) continue;
    const e = smrtiOf(state.save, padaKey(p.shlokaId, p.pada));
    const key = [e.level, e.streak, e.casts ?? 0];
    if (best === null || before(key, bestKey)) {
      best = { shlokaId: p.shlokaId, pada: p.pada };
      bestKey = key;
    }
  }
  return best;
}

/** The verse shield can be raised now (Kathā, a wild / boss fight, a blow readied, a verse heard). */
export function canShield(state: GameState, content: GameContent): boolean {
  const b = state.battle;
  return !!b && !!b.warn && isKatha(state) && b.spec.kind !== 'duel' && shieldPada(state, content) !== null;
}

// ───────────────────────── boss phases (v0.5b P7, WP-C) ─────────────────────────

/** Story flags as the save holds them (`undefined`: the caller does not know them — no phase waits). */
type Flags = Readonly<Record<string, true | undefined>>;

/**
 * A phase as content/katha.json writes it: `requires` (a FlagCond, e.g. "seen.aditya") is the story flag the phase
 * waits for. (types.ts KathaPhase does not list the field yet: requested in notes/v05b-c.md.)
 */
export type PhaseDef = KathaPhase & { requires?: string };

/** The boss phases of this foe in this book (content order). */
export function phasesOf(content: GameContent, chapter: number, foeId: string): PhaseDef[] {
  return (tacticsOf(content).phases ?? []).filter((p) => p.foe === foeId && (p.chapter === undefined || p.chapter === chapter));
}

/** The phase's story flag is set (or it waits for none; or the caller passed no flags). */
export function phaseOpen(p: PhaseDef, flags: Flags | undefined): boolean {
  return !p.requires || flags === undefined || testFlag(flags as Record<string, true | undefined>, p.requires);
}

/** v0.6.1: the marker BattleState.bossPhases keeps once an `only` phase's fit has been cast. */
export const spentMark = (id: string): string => `${id}:spent`;

/**
 * v0.6.1: the one move the hero in front may use now — the fit of an `only` phase that has begun, is not spent and whose
 * fit the hero holds (Rāvaṇa: from 60 % the Āditya-hṛdayam, until it has been recited once); else null.
 */
export function onlyMove(content: GameContent, chapter: number, foeId: string, begun: readonly string[] | undefined, allyMoves: readonly string[]): string | null {
  if (!begun?.length) return null;
  for (const p of phasesOf(content, chapter, foeId)) {
    if (!p.only || !p.fit || !begun.includes(p.id) || begun.includes(spentMark(p.id))) continue;
    if (allyMoves.includes(p.fit)) return p.fit;
  }
  return null;
}

/** v0.6.1: the begun list after `moveId` was cast: an `only` phase whose fit it is becomes spent (the same list otherwise). */
export function spendOnly(content: GameContent, chapter: number, foeId: string, begun: string[], moveId: string): string[] {
  const add = phasesOf(content, chapter, foeId).filter((p) => p.only && p.fit === moveId && begun.includes(p.id) && !begun.includes(spentMark(p.id))).map((p) => spentMark(p.id));
  return add.length ? [...begun, ...add] : begun;
}

/** HP at or below which a share of the foe's HP is reached (as isDecisive: ceil of the share). */
const shareHp = (maxHp: number, share: number): number => Math.ceil(maxHp * share);

/**
 * The HP a hit with `moveId` cannot take the foe below, from the phases with a floor that hold now: a move that is not
 * the phase's fit, while the hero in front holds that fit (equipped) — or, while the phase waits for its story flag,
 * every move from any hero (the boss cannot be finished yet). null: nothing holds the foe. `fit` names the move that
 * ends the floor (the brahmāstra), `phase` the phase whose beat shows when the floor holds.
 */
export function phaseFloor(content: GameContent, chapter: number, foe: Pick<Fighter, 'id' | 'maxHp'>, ally: Pick<Fighter, 'moves'>, moveId: string, flags?: Flags): { hp: number; fit?: string; phase: PhaseDef } | null {
  let out: { hp: number; fit?: string; phase: PhaseDef } | null = null;
  for (const p of phasesOf(content, chapter, foe.id)) {
    if (p.floor === undefined) continue;
    if (phaseOpen(p, flags) && p.fit !== undefined && (moveId === p.fit || !ally.moves.includes(p.fit))) continue;
    const hp = shareHp(foe.maxHp, p.floor);
    if (!out || hp > out.hp) out = { hp, ...(p.fit !== undefined ? { fit: p.fit } : {}), phase: p };
  }
  return out;
}

/**
 * The phases begun after a change of the foe's HP: `begun` (BattleState.bossPhases) keeps a `once` phase for good and
 * drops any other phase the foe has climbed back above (it may begin again); `now` are the phases that begin with this
 * HP (at or below their share, their story flag set, not begun; never for a fallen foe), in content order.
 */
export function phasesBegun(content: GameContent, chapter: number, foe: Pick<Fighter, 'id' | 'hp' | 'maxHp'>, begun: readonly string[] = [], flags?: Flags): { begun: string[]; now: PhaseDef[] } {
  const list = phasesOf(content, chapter, foe.id);
  const below = (p: KathaPhase): boolean => foe.hp <= shareHp(foe.maxHp, p.below);
  const kept = begun.filter((id) => {
    const p = list.find((x) => x.id === id);
    return !p || p.once === true || below(p);
  });
  const now = foe.hp > 0 ? list.filter((p) => !kept.includes(p.id) && below(p) && phaseOpen(p, flags)) : [];
  return { begun: [...kept, ...now.map((p) => p.id)], now };
}
