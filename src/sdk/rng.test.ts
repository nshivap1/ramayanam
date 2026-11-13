import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { type Rng, createRng, dailySeed, daysBetween, hashString, puzzleNumber, toDateKey } from './rng';

/** Pearson chi-square statistic against a uniform expectation. */
function chiSquare(counts: readonly number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  const e = n / counts.length;
  return counts.reduce((s, c) => s + (c - e) ** 2 / e, 0);
}
const take = (rng: Rng, n: number): number[] => Array.from({ length: n }, () => rng.next());
const SEEDS = [0, 1, 2, 12345, 0x9e3779b9, 0xffffffff];

// ───────────────────────────── determinism ─────────────────────────────

test('createRng: the same seed always yields the same stream', () => {
  for (const seed of SEEDS) assert.deepEqual(take(createRng(seed), 200), take(createRng(seed), 200));
});

test('createRng: different seeds yield different streams (including adjacent seeds)', () => {
  const firsts = new Set<number>();
  for (let seed = 0; seed < 2000; seed++) firsts.add(createRng(seed).next());
  assert.equal(firsts.size, 2000, 'first outputs of 2000 adjacent seeds are all distinct');
  assert.notDeepEqual(take(createRng(1), 20), take(createRng(2), 20));
});

test('createRng: the stream is pinned (changing the generator would change every daily puzzle)', () => {
  const r = createRng(1);
  assert.deepEqual([r.int(1000), r.int(1000), r.int(1000), r.int(1000), r.int(1000)], PINNED_SEED_1);
});
// Regression values recorded from the shipped mulberry32 implementation.
const PINNED_SEED_1 = ((): number[] => {
  // mulberry32 reference implementation, kept independent of the module under test
  let a = 1;
  const ref = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: 5 }, () => Math.floor(ref() * 1000));
})();

test('createRng: seeds are reduced to unsigned 32 bits', () => {
  assert.deepEqual(take(createRng(-1), 10), take(createRng(0xffffffff), 10));
  assert.deepEqual(take(createRng(2 ** 32 + 5), 10), take(createRng(5), 10));
  assert.deepEqual(take(createRng(7.9), 10), take(createRng(7), 10));
  assert.deepEqual(take(createRng(Number.NaN), 10), take(createRng(0), 10));
});

test('createRng: seed 0 is not degenerate', () => {
  const xs = take(createRng(0), 100);
  assert.equal(new Set(xs).size, 100);
  assert.ok(xs.some((x) => x > 0.5) && xs.some((x) => x < 0.5));
});

// ───────────────────────────── distribution ─────────────────────────────

test('next: always in [0, 1), mean ≈ 0.5, deciles uniform (chi-square) for several seeds', () => {
  for (const seed of SEEDS) {
    const rng = createRng(seed);
    const buckets = new Array<number>(10).fill(0);
    let sum = 0;
    for (let i = 0; i < 100_000; i++) {
      const x = rng.next();
      assert.ok(x >= 0 && x < 1, `next() out of range: ${x}`);
      buckets[Math.floor(x * 10)]!++;
      sum += x;
    }
    // df = 9: p = 0.001 critical value is 27.88. Deterministic seeds, so this cannot flake.
    assert.ok(chiSquare(buckets) < 27.88, `seed ${seed}: chi-square ${chiSquare(buckets)}`);
    assert.ok(Math.abs(sum / 100_000 - 0.5) < 0.005, `seed ${seed}: mean ${sum / 100_000}`);
  }
});

test('next: the FIRST output across consecutive seeds is uniform too (sessions use seed, seed+1, …)', () => {
  const deciles = new Array<number>(10).fill(0);
  const quarters = new Array<number>(4).fill(0);
  for (let seed = 0; seed < 20_000; seed++) {
    deciles[Math.floor(createRng(seed).next() * 10)]!++;
    quarters[createRng(seed).int(4)]!++;
  }
  assert.ok(chiSquare(deciles) < 27.88, `chi-square ${chiSquare(deciles)}`);
  assert.ok(chiSquare(quarters) < 16.27, `chi-square ${chiSquare(quarters)}`); // df = 3, p = 0.001
});

test('next: no short cycles and no immediate repeats in 50 000 draws', () => {
  const xs = take(createRng(42), 50_000);
  assert.ok(new Set(xs).size > 49_990);
  for (let i = 1; i < xs.length; i++) assert.notEqual(xs[i], xs[i - 1]);
});

// ───────────────────────────── int / range / pick / chance ─────────────────────────────

test('int: integers in [0, n), every value reachable, roughly uniform', () => {
  const rng = createRng(7);
  for (const n of [1, 2, 3, 7, 10, 100]) {
    const counts = new Array<number>(n).fill(0);
    for (let i = 0; i < n * 2000; i++) {
      const v = rng.int(n);
      assert.ok(Number.isInteger(v) && v >= 0 && v < n, `int(${n}) gave ${v}`);
      counts[v]!++;
    }
    assert.ok(counts.every((c) => c > 0), `int(${n}) never produced some value`);
    assert.ok(counts.every((c) => Math.abs(c - 2000) < 300), `int(${n}) is skewed: ${counts.join(',')}`);
  }
  assert.equal(createRng(3).int(1), 0);
});

test('int: rejects n ≤ 0 and NaN', () => {
  const rng = createRng(1);
  for (const bad of [0, -1, -0.5, Number.NaN]) assert.throws(() => rng.int(bad), RangeError, `int(${bad}) should throw`);
});

test('range: inclusive on both ends, works with negatives, throws when hi < lo', () => {
  const rng = createRng(11);
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    const v = rng.range(-2, 2);
    assert.ok(Number.isInteger(v) && v >= -2 && v <= 2);
    seen.add(v);
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [-2, -1, 0, 1, 2]);
  for (let i = 0; i < 50; i++) assert.equal(rng.range(5, 5), 5);
  const dice = new Array<number>(7).fill(0);
  for (let i = 0; i < 12_000; i++) dice[rng.range(1, 6)]!++;
  assert.equal(dice[0], 0);
  assert.ok(chiSquare(dice.slice(1)) < 20.52, `d6 chi-square ${chiSquare(dice.slice(1))}`); // df = 5
  assert.throws(() => rng.range(3, 2), RangeError);
});

test('pick: returns a member, covers all members, throws on empty input', () => {
  const rng = createRng(5);
  const items = ['क', 'ख', 'ग', 'घ'] as const;
  const seen = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const p = rng.pick(items);
    assert.ok(items.includes(p));
    seen.add(p);
  }
  assert.equal(seen.size, items.length);
  assert.equal(rng.pick(['only']), 'only');
  assert.throws(() => rng.pick([]), RangeError);
});

test('chance: 0 never, 1 always, p ≈ observed frequency', () => {
  const rng = createRng(9);
  let hits = 0;
  for (let i = 0; i < 1000; i++) {
    assert.equal(rng.chance(0), false);
    assert.equal(rng.chance(1), true);
  }
  for (let i = 0; i < 20_000; i++) if (rng.chance(0.3)) hits++;
  assert.ok(Math.abs(hits / 20_000 - 0.3) < 0.015, `chance(0.3) hit ${hits / 20_000}`);
  assert.equal(rng.chance(-1), false);
  assert.equal(rng.chance(2), true);
});

// ───────────────────────────── shuffle / sample ─────────────────────────────

test('shuffle: a permutation, input untouched, new array each time', () => {
  const input = Object.freeze(Array.from({ length: 50 }, (_, i) => i));
  for (const seed of SEEDS) {
    const out = createRng(seed).shuffle(input);
    assert.notEqual(out, input);
    assert.equal(out.length, input.length);
    assert.deepEqual(out.slice().sort((a, b) => a - b), [...input]);
  }
  assert.deepEqual(input, Array.from({ length: 50 }, (_, i) => i));
  assert.notDeepEqual(createRng(1).shuffle(input), [...input], 'a 50-element shuffle that changes nothing is a bug');
  assert.deepEqual(createRng(1).shuffle([]), []);
  assert.deepEqual(createRng(1).shuffle(['x']), ['x']);
});

test('shuffle: keeps duplicates (multiset preserved)', () => {
  const out = createRng(4).shuffle(['अ', 'अ', 'आ', 'इ', 'इ', 'इ']);
  assert.deepEqual(out.slice().sort(), ['अ', 'अ', 'आ', 'इ', 'इ', 'इ'].sort());
});

test('shuffle: unbiased — all 6 orders of 3 items and all 24 orders of 4 items equally likely', () => {
  const three = new Map<string, number>();
  const rng = createRng(99);
  for (let i = 0; i < 60_000; i++) {
    const k = rng.shuffle([1, 2, 3]).join('');
    three.set(k, (three.get(k) ?? 0) + 1);
  }
  assert.equal(three.size, 6);
  assert.ok(chiSquare([...three.values()]) < 20.52, `chi-square ${chiSquare([...three.values()])}`); // df = 5
  // one shuffle per seed: what a game actually does at the start of a session
  const four = new Map<string, number>();
  for (let seed = 0; seed < 24_000; seed++) {
    const k = createRng(seed).shuffle([1, 2, 3, 4]).join('');
    four.set(k, (four.get(k) ?? 0) + 1);
  }
  assert.equal(four.size, 24);
  assert.ok(chiSquare([...four.values()]) < 49.73, `chi-square ${chiSquare([...four.values()])}`); // df = 23
});

test('shuffle: each element is equally likely to land first', () => {
  const rng = createRng(2024);
  const first = new Array<number>(5).fill(0);
  for (let i = 0; i < 25_000; i++) first[rng.shuffle([0, 1, 2, 3, 4])[0]!]!++;
  assert.ok(chiSquare(first) < 18.47, `chi-square ${chiSquare(first)}`); // df = 4
});

test('sample: k distinct members, k clamped to [0, length], input untouched', () => {
  const items = Object.freeze(['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज']);
  for (const seed of SEEDS) {
    const rng = createRng(seed);
    for (let k = 0; k <= items.length; k++) {
      const s = rng.sample(items, k);
      assert.equal(s.length, k);
      assert.equal(new Set(s).size, k, 'sample must not repeat an element');
      assert.ok(s.every((x) => items.includes(x)));
    }
    assert.equal(rng.sample(items, 99).length, items.length);
    assert.deepEqual(rng.sample(items, 99).slice().sort(), [...items].sort());
    assert.deepEqual(rng.sample(items, -3), []);
    assert.deepEqual(rng.sample([], 3), []);
  }
  assert.equal(items.length, 8);
});

test('sample: every element is equally likely to be chosen', () => {
  const rng = createRng(31);
  const counts = new Array<number>(10).fill(0);
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 0; i < 20_000; i++) for (const x of rng.sample(items, 3)) counts[x]!++;
  assert.ok(chiSquare(counts) < 27.88, `chi-square ${chiSquare(counts)}`);
});

// ───────────────────────────── weighted ─────────────────────────────

test('weighted: zero-weight (and negative-weight) items are never picked', () => {
  const rng = createRng(17);
  for (let i = 0; i < 5000; i++) {
    assert.equal(rng.weighted(['a', 'b', 'c'], [0, 1, 0]), 'b');
    assert.notEqual(rng.weighted(['a', 'b', 'c'], [1, -5, 1]), 'b');
    assert.equal(rng.weighted(['a', 'b'], [0, 0.0001]), 'b');
    assert.equal(rng.weighted(['first', 'last'], [3, 0]), 'first', 'a trailing zero weight must never win');
  }
});

test('weighted: frequencies follow the weights', () => {
  const rng = createRng(7);
  const counts = [0, 0, 0];
  for (let i = 0; i < 60_000; i++) counts[rng.weighted([0, 1, 2], [1, 2, 3])]!++;
  assert.ok(Math.abs(counts[0]! - 10_000) < 500, String(counts));
  assert.ok(Math.abs(counts[1]! - 20_000) < 600, String(counts));
  assert.ok(Math.abs(counts[2]! - 30_000) < 700, String(counts));
});

test('weighted: rejects empty input, mismatched lengths, all-zero and NaN weights', () => {
  const rng = createRng(1);
  assert.throws(() => rng.weighted([], []), RangeError);
  assert.throws(() => rng.weighted(['a', 'b'], [1]), RangeError);
  assert.throws(() => rng.weighted(['a'], [1, 2]), RangeError);
  assert.throws(() => rng.weighted(['a', 'b'], [0, 0]), RangeError);
  assert.throws(() => rng.weighted(['a', 'b'], [-1, -2]), RangeError);
  assert.throws(() => rng.weighted(['a', 'b'], [Number.NaN, 1]), RangeError);
});

// ───────────────────────────── fork ─────────────────────────────

test('fork: stable for a label, different across labels and from the parent', () => {
  const a1 = take(createRng(5).fork('board'), 20);
  const a2 = take(createRng(5).fork('board'), 20);
  const b = take(createRng(5).fork('distractors'), 20);
  assert.deepEqual(a1, a2);
  assert.notDeepEqual(a1, b);
  assert.notDeepEqual(a1, take(createRng(5), 20));
  assert.notDeepEqual(take(createRng(5).fork(''), 20), take(createRng(5), 20), 'even an empty label must not alias the parent');
  assert.notDeepEqual(take(createRng(5).fork('board'), 20), take(createRng(6).fork('board'), 20), 'depends on the parent seed');
});

test('fork: does not consume from, and is not affected by, the parent stream', () => {
  const plain = take(createRng(77), 30);
  const parent = createRng(77);
  const early = parent.fork('x');
  const firstHalf = take(parent, 15);
  const late = parent.fork('x'); // forked after the parent advanced
  parent.fork('y');
  const secondHalf = take(parent, 15);
  assert.deepEqual([...firstHalf, ...secondHalf], plain, 'forking must not advance the parent');
  assert.deepEqual(take(early, 20), take(late, 20), 'a fork is a function of (seed, label) only');
});

test('fork: nested forks are independent — order matters and a repeated label never leads back to the parent', () => {
  const parent = take(createRng(5), 20);
  assert.notDeepEqual(take(createRng(5).fork('x').fork('x'), 20), parent, 'fork(x).fork(x) must not reproduce the parent stream');
  assert.notDeepEqual(take(createRng(5).fork('a').fork('b'), 20), take(createRng(5).fork('b').fork('a'), 20), 'fork(a).fork(b) and fork(b).fork(a) must differ');
  assert.notDeepEqual(take(createRng(5).fork('a').fork('b'), 20), take(createRng(5).fork('ab'), 20));
  assert.deepEqual(take(createRng(5).fork('a').fork('b'), 20), take(createRng(5).fork('a').fork('b'), 20));
});

test('fork: 200 labels from one seed give 200 distinct, individually uniform streams', () => {
  const firsts = new Set<number>();
  const buckets = new Array<number>(10).fill(0);
  for (let i = 0; i < 200; i++) {
    const child = createRng(123).fork(`round-${i}`);
    firsts.add(child.next());
    for (let j = 0; j < 500; j++) buckets[Math.floor(child.next() * 10)]!++;
  }
  assert.equal(firsts.size, 200);
  assert.ok(chiSquare(buckets) < 27.88, `chi-square ${chiSquare(buckets)}`);
});

// ───────────────────────────── hashString / dailySeed ─────────────────────────────

test('hashString: matches the published FNV-1a 32-bit test vectors', () => {
  assert.equal(hashString(''), 0x811c9dc5);
  assert.equal(hashString('a'), 0xe40c292c);
  assert.equal(hashString('foobar'), 0xbf9cf968);
});

test('hashString: pinned values for repo strings (stability across releases and platforms)', () => {
  assert.equal(hashString('samskuru'), 3986060112);
  assert.equal(hashString('संस्कृतम्'), 1402611213);
});

test('hashString: unsigned 32-bit, deterministic, sensitive to every character and to order', () => {
  for (const s of ['', 'a', 'रामः', 'x'.repeat(10_000), '🪷', 'a\u0000b']) {
    const h = hashString(s);
    assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff, `${JSON.stringify(s.slice(0, 8))} → ${h}`);
    assert.equal(hashString(s), h);
  }
  assert.notEqual(hashString('ab'), hashString('ba'));
  assert.notEqual(hashString('रामः'), hashString('रामाः'));
  assert.notEqual(hashString('a'), hashString('a '));
  const hashes = new Set(Array.from({ length: 5000 }, (_, i) => hashString(`item-${i}`)));
  assert.equal(hashes.size, 5000, 'no collisions among 5000 short keys');
});

test('dailySeed: same for everyone, differs per date and per game, pinned', () => {
  assert.equal(dailySeed('2026-11-10', 'smrti-yugala'), dailySeed('2026-11-10', 'smrti-yugala'));
  assert.notEqual(dailySeed('2026-11-10', 'smrti-yugala'), dailySeed('2026-11-11', 'smrti-yugala'));
  assert.notEqual(dailySeed('2026-11-10', 'smrti-yugala'), dailySeed('2026-11-10', 'akshara-paricaya'));
  // Pinned: changing the formula silently changes every player's daily puzzle and breaks shared results.
  assert.equal(dailySeed('2026-11-10', 'smrti-yugala'), 1836012996);
  assert.equal(dailySeed('2026-01-01', 'akshara-paricaya'), 2772751232);
  assert.equal(dailySeed('2026-11-10', 'smrti-yugala'), hashString('samskuru|2026-11-10|smrti-yugala'));
});

test('dailySeed: date and game id cannot be confused with each other', () => {
  assert.notEqual(dailySeed('2026-11-1', '0-x'), dailySeed('2026-11-10', '-x'));
  assert.notEqual(dailySeed('2026-11-10', 'ab'), dailySeed('2026-11-10', 'a-b'));
});

test('dailySeed: a whole year × 50 games has no collisions and yields different first draws day to day', () => {
  const seen = new Set<number>();
  const firstDraw = new Array<number>(10).fill(0);
  for (let d = 0; d < 366; d++) {
    const key = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
    for (let g = 0; g < 50; g++) {
      const s = dailySeed(key, `game-${g}`);
      assert.ok(Number.isInteger(s) && s >= 0 && s <= 0xffffffff);
      seen.add(s);
      firstDraw[createRng(s).int(10)]!++;
    }
  }
  assert.equal(seen.size, 366 * 50);
  assert.ok(chiSquare(firstDraw) < 27.88, `chi-square ${chiSquare(firstDraw)}`);
});

// ───────────────────────────── dates ─────────────────────────────

const ORIGINAL_TZ = process.env['TZ'];
function withTz<T>(tz: string, fn: () => T): T {
  process.env['TZ'] = tz;
  try {
    return fn();
  } finally {
    if (ORIGINAL_TZ === undefined) delete process.env['TZ'];
    else process.env['TZ'] = ORIGINAL_TZ;
  }
}
afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env['TZ'];
  else process.env['TZ'] = ORIGINAL_TZ;
});
const ZONES = ['UTC', 'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Pacific/Auckland', 'Pacific/Kiritimati', 'Europe/London'];

test('toDateKey: zero-padded local YYYY-MM-DD', () => {
  assert.equal(toDateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(toDateKey(new Date(2026, 10, 10, 12, 0)), '2026-11-10');
  assert.equal(toDateKey(new Date(2026, 8, 9, 0, 0, 0, 0)), '2026-09-09');
  assert.match(toDateKey(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(toDateKey(), toDateKey(new Date()));
});

test('toDateKey: month, year and leap-day boundaries roll over at local midnight', () => {
  assert.equal(toDateKey(new Date(2026, 0, 31, 23, 59, 59, 999)), '2026-01-31');
  assert.equal(toDateKey(new Date(2026, 0, 31, 23, 59, 59, 999 + 1)), '2026-02-01');
  assert.equal(toDateKey(new Date(2026, 11, 31, 23, 59, 59)), '2026-12-31');
  assert.equal(toDateKey(new Date(2027, 0, 1, 0, 0, 0)), '2027-01-01');
  assert.equal(toDateKey(new Date(2028, 1, 29, 8)), '2028-02-29', '2028 is a leap year');
  assert.equal(toDateKey(new Date(2026, 1, 29, 8)), '2026-03-01', '2026 is not');
  assert.equal(toDateKey(new Date(2100, 1, 29, 8)), '2100-03-01', '2100 is not a leap year');
  assert.equal(toDateKey(new Date(2000, 1, 29, 8)), '2000-02-29', '2000 was');
});

test('toDateKey: uses the LOCAL calendar day, not UTC', () => {
  const instant = new Date('2026-01-01T20:00:00Z');
  assert.equal(withTz('Asia/Kolkata', () => toDateKey(instant)), '2026-01-02');
  assert.equal(withTz('UTC', () => toDateKey(instant)), '2026-01-01');
  assert.equal(withTz('America/Los_Angeles', () => toDateKey(instant)), '2026-01-01');
  assert.equal(withTz('Pacific/Kiritimati', () => toDateKey(instant)), '2026-01-02'); // UTC+14
  const early = new Date('2026-06-15T03:00:00Z');
  assert.equal(withTz('America/Los_Angeles', () => toDateKey(early)), '2026-06-14');
  assert.equal(withTz('Asia/Kolkata', () => toDateKey(early)), '2026-06-15');
});

test('toDateKey: correct on both sides of DST switches', () => {
  withTz('America/New_York', () => {
    // spring forward 2026-03-08 02:00 → 03:00; fall back 2026-11-01 02:00 → 01:00
    assert.equal(toDateKey(new Date(2026, 2, 7, 23, 59)), '2026-03-07');
    assert.equal(toDateKey(new Date(2026, 2, 8, 0, 0)), '2026-03-08');
    assert.equal(toDateKey(new Date(2026, 2, 8, 2, 30)), '2026-03-08', 'a wall-clock time that does not exist still maps to that day');
    assert.equal(toDateKey(new Date(2026, 2, 8, 23, 59)), '2026-03-08');
    assert.equal(toDateKey(new Date(2026, 10, 1, 0, 30)), '2026-11-01');
    assert.equal(toDateKey(new Date(2026, 10, 1, 23, 30)), '2026-11-01');
    assert.equal(toDateKey(new Date(2026, 10, 2, 0, 0)), '2026-11-02');
  });
  withTz('Europe/London', () => {
    assert.equal(toDateKey(new Date(2026, 2, 29, 1, 30)), '2026-03-29');
    assert.equal(toDateKey(new Date(2026, 9, 25, 1, 30)), '2026-10-25');
  });
});

test('daysBetween: basics, sign and antisymmetry', () => {
  assert.equal(daysBetween('2026-11-10', '2026-11-10'), 0);
  assert.equal(daysBetween('2026-11-10', '2026-11-11'), 1);
  assert.equal(daysBetween('2026-11-11', '2026-11-10'), -1);
  assert.equal(daysBetween('2026-11-01', '2026-11-30'), 29);
  for (const [a, b] of [['2026-01-31', '2026-03-01'], ['2025-12-25', '2026-01-05'], ['2028-02-28', '2028-03-01']] as const) {
    assert.equal(daysBetween(a, b), -daysBetween(b, a));
  }
});

test('daysBetween: month, year and leap boundaries', () => {
  assert.equal(daysBetween('2026-01-31', '2026-02-01'), 1);
  assert.equal(daysBetween('2026-04-30', '2026-05-01'), 1);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1, 'common year');
  assert.equal(daysBetween('2028-02-28', '2028-03-01'), 2, 'leap year');
  assert.equal(daysBetween('2028-02-28', '2028-02-29'), 1);
  assert.equal(daysBetween('2100-02-28', '2100-03-01'), 1, 'century non-leap year');
  assert.equal(daysBetween('2000-02-28', '2000-03-01'), 2, '400-year leap year');
  assert.equal(daysBetween('2026-01-01', '2027-01-01'), 365);
  assert.equal(daysBetween('2028-01-01', '2029-01-01'), 366);
  assert.equal(daysBetween('2026-01-01', '2036-01-01'), 3652, 'ten years containing two leap days (2028, 2032)');
});

test('daysBetween: DST switches never produce 0 or 2 for consecutive days, in any time zone', () => {
  for (const tz of ZONES) {
    withTz(tz, () => {
      assert.equal(daysBetween('2026-03-07', '2026-03-08'), 1, tz);
      assert.equal(daysBetween('2026-03-08', '2026-03-09'), 1, tz);
      assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2, tz);
      assert.equal(daysBetween('2026-10-31', '2026-11-01'), 1, tz);
      assert.equal(daysBetween('2026-11-01', '2026-11-02'), 1, tz);
      assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2, tz);
      assert.equal(daysBetween('2026-09-26', '2026-09-27'), 1, tz); // NZ spring forward
      assert.equal(daysBetween('2026-04-04', '2026-04-05'), 1, tz); // NZ fall back
    });
  }
});

test('daysBetween ∘ toDateKey: walking 800 local days one at a time always advances by exactly 1 (every zone)', () => {
  for (const tz of ZONES) {
    withTz(tz, () => {
      const start = toDateKey(new Date(2026, 0, 1, 12));
      let prev = start;
      for (let i = 1; i <= 800; i++) {
        // late evening and just after midnight are where off-by-one bugs live
        const key = toDateKey(new Date(2026, 0, 1 + i, i % 2 === 0 ? 23 : 0, i % 2 === 0 ? 59 : 1));
        if (daysBetween(prev, key) !== 1 || daysBetween(start, key) !== i) assert.fail(`${tz}: ${prev} → ${key} (i=${i}) gave ${daysBetween(prev, key)} / ${daysBetween(start, key)}`);
        prev = key;
      }
      assert.equal(daysBetween(start, prev), 800, tz);
    });
  }
});

test('daysBetween: tolerates unpadded keys; reports NaN (not a wrong number) for garbage', () => {
  assert.equal(daysBetween('2026-1-5', '2026-01-06'), 1);
  assert.ok(Number.isNaN(daysBetween('garbage', '2026-01-01')));
  assert.ok(Number.isNaN(daysBetween('2026-01-01', 'not-a-date')));
});

test('puzzleNumber: #1 on the platform epoch, +1 per day, across month/year/leap boundaries', () => {
  assert.equal(puzzleNumber('2026-01-01'), 1);
  assert.equal(puzzleNumber('2026-01-02'), 2);
  assert.equal(puzzleNumber('2026-01-31'), 31);
  assert.equal(puzzleNumber('2026-02-01'), 32);
  assert.equal(puzzleNumber('2026-03-01'), 60);
  assert.equal(puzzleNumber('2026-11-10'), 314);
  assert.equal(puzzleNumber('2026-12-31'), 365);
  assert.equal(puzzleNumber('2027-01-01'), 366);
  assert.equal(puzzleNumber('2028-02-29'), 365 + 365 + 31 + 29);
  assert.equal(puzzleNumber('2028-03-01'), 365 + 365 + 31 + 29 + 1);
  assert.equal(puzzleNumber('2025-12-31'), 0, 'the day before the epoch');
});

test('puzzleNumber: strictly increasing day by day and identical in every time zone', () => {
  const numbers = ZONES.map((tz) =>
    withTz(tz, () => {
      let prev = puzzleNumber('2026-01-01');
      for (let i = 1; i < 500; i++) {
        const n = puzzleNumber(new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
        assert.equal(n, prev + 1);
        prev = n;
      }
      return prev;
    }),
  );
  assert.deepEqual(numbers, new Array(ZONES.length).fill(500));
});
