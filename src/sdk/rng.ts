/**
 * Deterministic pseudo-random numbers. Games MUST take all randomness from an Rng created
 * from `ctx.seed` so that daily puzzles are identical for everyone and tests are reproducible.
 * Never call Math.random() in game logic.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
  /** Uniform integer in [lo, hi] inclusive. */
  range(lo: number, hi: number): number;
  /** Random element. Throws on empty input. */
  pick<T>(items: readonly T[]): T;
  /** New shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** `k` distinct elements in random order (k is clamped to items.length). */
  sample<T>(items: readonly T[], k: number): T[];
  /** True with probability p. */
  chance(p: number): boolean;
  /** Weighted pick; weights must be ≥ 0 and not all zero. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T;
  /** Independent child generator (stable for a given label). */
  fork(label: string): Rng;
}

/** FNV-1a 32-bit string hash. Stable across platforms. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good enough for games. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number): number => {
    if (!(n > 0)) throw new RangeError(`rng.int(n) needs n > 0, got ${n}`);
    return Math.floor(next() * n);
  };
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  };
  const rng: Rng = {
    next,
    int,
    range: (lo, hi) => lo + int(hi - lo + 1),
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new RangeError('rng.pick on empty array');
      return items[int(items.length)] as T;
    },
    shuffle,
    sample: (items, k) => shuffle(items).slice(0, Math.max(0, Math.min(k, items.length))),
    chance: (p) => next() < p,
    weighted: <T>(items: readonly T[], weights: readonly number[]): T => {
      if (items.length === 0 || items.length !== weights.length) throw new RangeError('rng.weighted: bad input');
      let total = 0;
      for (const w of weights) total += Math.max(0, w);
      if (!(total > 0)) throw new RangeError('rng.weighted: weights sum to zero');
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= Math.max(0, weights[i] as number);
        if (r < 0) return items[i] as T;
      }
      return items[items.length - 1] as T;
    },
    // Hash (seed, label) together rather than XOR-ing the label hash into the seed: XOR made
    // fork(a).fork(a) reproduce the parent stream and fork(a).fork(b) equal fork(b).fork(a).
    fork: (label) => createRng(hashString(`fork|${seed >>> 0}|${label}`)),
  };
  return rng;
}

/** Seed for a (date, game) pair: everyone gets the same daily puzzle. */
export function dailySeed(dateKey: string, gameId: string): number {
  return hashString(`samskuru|${dateKey}|${gameId}`);
}

/** Local calendar day as YYYY-MM-DD. */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole days from dateKey a to dateKey b (b − a). */
export function daysBetween(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const ua = Date.UTC(pa[0] ?? 1970, (pa[1] ?? 1) - 1, pa[2] ?? 1);
  const ub = Date.UTC(pb[0] ?? 1970, (pb[1] ?? 1) - 1, pb[2] ?? 1);
  return Math.round((ub - ua) / 86400000);
}

/** Day number since the platform epoch (2026-01-01) — handy for "Puzzle #123" labels. */
export function puzzleNumber(dateKey: string): number {
  return daysBetween('2026-01-01', dateKey) + 1;
}
