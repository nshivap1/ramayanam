/**
 * Small pure helpers shared by every logic module. OWNER: orchestrator (additions welcome — keep them pure).
 */
import { type Rng, createRng, hashString } from '@sdk';
import type { AllyDef, EnemyDef, EventDef, FlagCond, GameContent, GameState, ItemDef, LexEntry, MapDef, MoveDef, NameEntry, Shloka } from './types';

/**
 * Deterministic Rng for one decision. Every call site passes a distinct label; callers that consume
 * randomness must also return a state with tick + 1 (use `bump`).
 */
export function rngFor(state: Pick<GameState, 'seed' | 'tick'>, label: string): Rng {
  return createRng((state.seed ^ hashString(`${label}:${state.tick}`)) >>> 0);
}

/** Return a copy of state with tick advanced (call after using rngFor). */
export function bump<T extends { tick: number }>(state: T): T {
  return { ...state, tick: state.tick + 1 };
}

/** Evaluate "a&!b&c" against a flag set. Empty / undefined → true. */
export function testFlag(flags: Record<string, true | undefined>, cond: FlagCond | undefined): boolean {
  if (!cond) return true;
  return cond
    .split('&')
    .map((p) => p.trim())
    .filter(Boolean)
    .every((p) => (p.startsWith('!') ? !flags[p.slice(1)] : !!flags[p]));
}

export interface ContentIndex {
  lex: Map<string, LexEntry>;
  shloka: Map<string, Shloka>;
  name: Map<string, NameEntry>;
  move: Map<string, MoveDef>;
  ally: Map<string, AllyDef>;
  enemy: Map<string, EnemyDef>;
  item: Map<string, ItemDef>;
  map: Map<string, MapDef>;
  event: Map<string, EventDef>;
}

const indexCache = new WeakMap<GameContent, ContentIndex>();

/** Id → record maps for a content object (cached per object identity). */
export function indexOf(c: GameContent): ContentIndex {
  const hit = indexCache.get(c);
  if (hit) return hit;
  const by = <T extends { id: string }>(xs: T[]): Map<string, T> => new Map(xs.map((x) => [x.id, x]));
  const idx: ContentIndex = {
    lex: by(c.lexicon),
    shloka: by(c.shlokas),
    name: by(c.names),
    move: by(c.moves),
    ally: by(c.allies),
    enemy: by(c.enemies),
    item: by(c.items),
    map: by(c.maps),
    event: by(c.events),
  };
  indexCache.set(c, idx);
  return idx;
}

/** Lookup that throws a precise error (content bugs should be loud in tests). */
export function must<T>(m: Map<string, T>, id: string, what: string): T {
  const v = m.get(id);
  if (v === undefined) throw new Error(`Unknown ${what} id "${id}"`);
  return v;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
