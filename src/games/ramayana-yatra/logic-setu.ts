/**
 * Nala's bridge (v0.5b P5, OWNER: WP-D; notes/v05b-plan.md §1 P5 and §2 scene 12, Yuddha 6.22). Pure and deterministic.
 *
 * `{ "setu": tag }` (Kathā only) opens the puzzle as the pending `SetuPending` (types.ts). One row of five stones: the
 * five columns are the five days of building (Yuddha 6.22.66–70: 14, 20, 21, 22, 23 yojanas, a hundred in all, 6.22.74).
 * Each stone is a span of the bridge seen from the side (sky above, sea below, the deck across the middle), set down
 * turned by a quarter, a half or three quarters; `cells[i]` is how far stone i is turned, `solution` is all zeros (the
 * span sits true). The bridge is whole — the shore meets Laṅkā — when every stone sits true.
 *   choose i   turn stone i a quarter (+1 mod `turns`); a stone that sits true stays put (it is set: no tap is wasted)
 *   advance    before the bridge is whole: Nala's hint (`hint` = the first stone, in day order, that is not yet true);
 *              once whole: the script continues
 * There is no way to fail: every tap brings a stone nearer, so the bridge takes exactly `setuTaps` taps, 3–12 by
 * construction (seeded by the save's seed and the tag). The practice game never sees it (startSetu skips there).
 *
 * Hooks (WP0): logic-events exec → startSetu, resumeScript → setuAction (pending null → the script runs on),
 * logic-sim botActions → setuBotActions, Game.tsx expose `setu`, view-panel → view-setu SetuPanel.
 */
import { createRng, hashString } from '@sdk';
import type { Action, GameContent, GameState, SetuPending } from './types';
import { isKatha } from './logic-katha';

/** Yuddha 6.22.66–70 (vulgate, valmikiramayan.net): yojanas of bridge built on each of the five days. Sum 100 (6.22.74). */
export const SETU_DAYS: readonly number[] = [14, 20, 21, 22, 23];
/** The five columns: one stone per day. */
export const SETU_COLS = SETU_DAYS.length;
/** A stone has four quarter turns. */
export const SETU_TURNS = 4;
/** Fewest / most taps a bridge may need (plan §7: always solvable in 3–12 taps). */
export const SETU_MIN_TAPS = 3;
export const SETU_MAX_TAPS = 12;
/** At least this many stones start out of true. */
export const SETU_MIN_OFF = 3;

/** The bridge is whole: every stone at its solution turn. */
export function setuSolved(p: Pick<SetuPending, 'cells' | 'solution'>): boolean {
  return p.cells.length === p.solution.length && p.cells.every((c, i) => c === p.solution[i]);
}

/** Quarter turns stone i still needs (0 when it sits true). */
export function stoneTurnsLeft(p: Pick<SetuPending, 'cells' | 'solution' | 'turns'>, i: number): number {
  const t = Math.max(1, p.turns);
  return ((((p.solution[i] ?? 0) - (p.cells[i] ?? 0)) % t) + t) % t;
}

/** Taps the bridge still needs (every tap turns a stone a quarter nearer; a true stone never turns). */
export function setuTaps(p: Pick<SetuPending, 'cells' | 'solution' | 'turns'>): number {
  return p.cells.reduce((n, _c, i) => n + stoneTurnsLeft(p, i), 0);
}

/** Yojanas of bridge standing: the sum of the days whose stone sits true. */
export function setuBuilt(p: Pick<SetuPending, 'cells' | 'solution'>): number {
  return p.cells.reduce((n, c, i) => n + (c === p.solution[i] ? (SETU_DAYS[i] ?? 0) : 0), 0);
}

/**
 * The puzzle for a seed and a tag: five stones turned so that the bridge needs SETU_MIN_TAPS–SETU_MAX_TAPS taps and at
 * least SETU_MIN_OFF stones are out of true. Deterministic (the same seed and tag always give the same bridge).
 */
export function setuPuzzle(seed: number, tag: string): SetuPending {
  const rng = createRng((seed ^ hashString(`setu:${tag}`)) >>> 0);
  const solution = SETU_DAYS.map(() => 0);
  const make = (cells: number[]): SetuPending => ({ kind: 'setu', tag, cols: SETU_COLS, turns: SETU_TURNS, cells, solution, taps: 0, hint: null });
  for (let attempt = 0; attempt < 200; attempt++) {
    const p = make(SETU_DAYS.map(() => rng.int(SETU_TURNS)));
    const off = p.cells.filter((c, i) => c !== solution[i]).length;
    const n = setuTaps(p);
    if (off >= SETU_MIN_OFF && n >= SETU_MIN_TAPS && n <= SETU_MAX_TAPS) return p;
  }
  return make([1, 3, 2, 0, 1]); // 9 taps, 4 stones off (a fallback the seeded loop never needs: setu.test)
}

/**
 * P5 exec hook: pend the puzzle seeded by the save's seed and `tag` (Kathā only; the same state in the practice game).
 * An empty tag is skipped (world.test refuses it).
 */
export function startSetu(state: GameState, content: GameContent, tag: string): GameState {
  void content;
  if (!isKatha(state) || typeof tag !== 'string' || !tag.trim()) return state;
  return { ...state, pending: setuPuzzle(state.seed, tag) };
}

/**
 * P5 resume hook (a 'setu' pending): `choose i` turns stone i a quarter (a stone that sits true stays put); `advance`
 * gives Nala's hint, or continues once the bridge is whole (then the pending is null and the caller runs the script on).
 * The same object for anything that does not apply (a true stone, an index out of range, a hint already shown, …).
 */
export function setuAction(state: GameState, content: GameContent, action: { type: string; [k: string]: unknown }): GameState {
  void content;
  const p = state.pending;
  if (p?.kind !== 'setu') return state;
  if (action.type === 'advance') {
    if (setuSolved(p)) return { ...state, pending: null };
    const hint = p.cells.findIndex((_c, i) => stoneTurnsLeft(p, i) > 0);
    if (hint < 0 || hint === p.hint) return state;
    return { ...state, pending: { ...p, hint }, fx: [...state.fx, { kind: 'sfx', name: 'tick' }] };
  }
  if (action.type !== 'choose') return state;
  const i = action['index'];
  if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= p.cells.length || stoneTurnsLeft(p, i) === 0) return state;
  const cells = p.cells.map((c, k) => (k === i ? (c + 1) % Math.max(1, p.turns) : c));
  const next: SetuPending = { ...p, cells, taps: p.taps + 1 };
  const set = cells[i] === p.solution[i];
  if (set && p.hint === i) next.hint = null;
  const whole = setuSolved(next);
  return { ...state, pending: next, fx: [...state.fx, { kind: 'sfx', name: whole ? 'win' : set ? 'merge' : 'tap' }] };
}

/**
 * Bot hook (logic-sim botActions, and the e2e bot reads `expose.setu.solution`): the actions that solve the pending
 * puzzle, best first — continue when solved, else turn the first stone that differs from the solution.
 */
export function setuBotActions(p: SetuPending): Action[] {
  if (setuSolved(p)) return [{ type: 'advance' }];
  const i = p.cells.findIndex((c, k) => c !== p.solution[k]);
  return [{ type: 'choose', index: i }, { type: 'advance' }];
}
