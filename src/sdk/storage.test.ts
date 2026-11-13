import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { newProfile, loadProfile, saveProfile } from './progress';
import { type KV, ROOT_PREFIX, browserKV, gameStore, memoryKV, readJson, writeJson } from './storage';

// ───────────────────────────── memoryKV ─────────────────────────────

test('memoryKV: get/set/overwrite/remove/keys', () => {
  const kv = memoryKV();
  assert.equal(kv.getItem('a'), null);
  assert.deepEqual(kv.keys(), []);
  kv.setItem('a', '1');
  kv.setItem('b', '2');
  assert.equal(kv.getItem('a'), '1');
  kv.setItem('a', '3');
  assert.equal(kv.getItem('a'), '3');
  assert.deepEqual(kv.keys().sort(), ['a', 'b']);
  kv.removeItem('a');
  assert.equal(kv.getItem('a'), null);
  assert.deepEqual(kv.keys(), ['b']);
  kv.removeItem('never-existed'); // must not throw
  assert.deepEqual(kv.keys(), ['b']);
});

test('memoryKV: an empty string is a value, not "missing"', () => {
  const kv = memoryKV();
  kv.setItem('empty', '');
  assert.equal(kv.getItem('empty'), '');
  assert.deepEqual(kv.keys(), ['empty']);
});

test('memoryKV: seeded from an initial record without aliasing it; instances are isolated', () => {
  const initial = { x: '1' };
  const a = memoryKV(initial);
  const b = memoryKV(initial);
  assert.equal(a.getItem('x'), '1');
  a.setItem('x', '2');
  a.setItem('y', '9');
  assert.deepEqual(initial, { x: '1' }, 'the initial record must not be mutated');
  assert.equal(b.getItem('x'), '1');
  assert.equal(b.getItem('y'), null);
});

test('memoryKV: keys that collide with Object.prototype members behave like any other key', () => {
  const kv = memoryKV();
  for (const k of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    assert.equal(kv.getItem(k), null, `${k} must start absent`);
    kv.setItem(k, 'v');
    assert.equal(kv.getItem(k), 'v');
  }
  assert.equal(kv.keys().length, 4);
});

// ───────────────────────────── readJson / writeJson ─────────────────────────────

test('readJson/writeJson: round-trip JSON values, including Devanagari and nested data', () => {
  const kv = memoryKV();
  const values: unknown[] = [0, 1.5, -3, true, false, '', 'रामः गच्छति', [], [1, [2, 3]], {}, { a: { b: ['क्ष', 'ज्ञ'] }, n: null }];
  values.forEach((v, i) => {
    writeJson(kv, `k${i}`, v);
    assert.deepEqual(readJson<unknown>(kv, `k${i}`, 'FALLBACK'), v);
  });
});

test('readJson: missing key → the fallback itself (same reference)', () => {
  const fallback = { fresh: true };
  assert.equal(readJson(memoryKV(), 'nope', fallback), fallback);
});

test('readJson: corrupt JSON falls back instead of throwing', () => {
  for (const raw of ['{', '{"a":', '[1,2', 'undefined', 'NaN', "{'single':1}", '', '\u0000', '{"a":1}}', 'रामः']) {
    const kv = memoryKV({ k: raw });
    assert.doesNotThrow(() => readJson(kv, 'k', 0), `raw ${JSON.stringify(raw)}`);
    assert.equal(readJson(kv, 'k', 'FB'), 'FB', `raw ${JSON.stringify(raw)} should fall back`);
  }
});

test('readJson: falsy stored values are real values, not "missing"', () => {
  const kv = memoryKV({ zero: '0', no: 'false', empty: '""', nul: 'null' });
  assert.equal(readJson(kv, 'zero', 7), 0);
  assert.equal(readJson(kv, 'no', true), false);
  assert.equal(readJson(kv, 'empty', 'x'), '');
  assert.equal(readJson<unknown>(kv, 'nul', 'x'), null);
});

test('readJson: every read parses a fresh copy (callers cannot corrupt the store by mutating a result)', () => {
  const kv = memoryKV();
  writeJson(kv, 'k', { list: [1, 2] });
  const first = readJson<{ list: number[] }>(kv, 'k', { list: [] });
  first.list.push(3);
  assert.deepEqual(readJson(kv, 'k', null), { list: [1, 2] });
});

test('writeJson: stores exactly JSON.stringify(value)', () => {
  const kv = memoryKV();
  writeJson(kv, 'k', { b: 1, a: [true, null] });
  assert.equal(kv.getItem('k'), '{"b":1,"a":[true,null]}');
});

// ───────────────────────────── gameStore ─────────────────────────────

test('gameStore: keys are namespaced samskuru:v1:game:<id>:<key>', () => {
  const kv = memoryKV();
  gameStore(kv, 'pada-shodha').set('best', 4);
  assert.deepEqual(kv.keys(), ['samskuru:v1:game:pada-shodha:best']);
  assert.equal(ROOT_PREFIX, 'samskuru:v1:');
  assert.equal(kv.getItem(`${ROOT_PREFIX}game:pada-shodha:best`), '4');
});

test('gameStore: get returns the fallback until set; set/get/remove round trip', () => {
  const store = gameStore(memoryKV(), 'g');
  assert.equal(store.get('level', 3), 3);
  assert.deepEqual(store.get<number[]>('stars', []), []);
  store.set('level', 5);
  store.set('stars', [3, 2]);
  store.set('seenHelp', false);
  assert.equal(store.get('level', 3), 5);
  assert.deepEqual(store.get<number[]>('stars', []), [3, 2]);
  assert.equal(store.get('seenHelp', true), false, 'a stored false must not be replaced by the fallback');
  store.remove('level');
  assert.equal(store.get('level', 3), 3);
  store.remove('level'); // idempotent
  assert.deepEqual(store.get<number[]>('stars', []), [3, 2]);
});

test('gameStore: two games never see each other’s keys', () => {
  const kv = memoryKV();
  const a = gameStore(kv, 'akshara-paricaya');
  const b = gameStore(kv, 'smrti-yugala');
  a.set('best', 1);
  b.set('best', 2);
  assert.equal(a.get('best', 0), 1);
  assert.equal(b.get('best', 0), 2);
  a.remove('best');
  assert.equal(a.get('best', 0), 0);
  assert.equal(b.get('best', 0), 2, 'removing in one game must not touch the other');
  b.set('only-b', 'x');
  assert.equal(a.get('only-b', 'absent'), 'absent');
});

test('gameStore: an id that is a prefix of another id is still isolated', () => {
  const kv = memoryKV();
  const short = gameStore(kv, 'pada');
  const long = gameStore(kv, 'pada-shodha');
  short.set('x', 'short');
  long.set('x', 'long');
  short.set('shodha:x', 'tricky');
  short.set('-shodha:x', 'trickier');
  assert.equal(short.get('x', ''), 'short');
  assert.equal(long.get('x', ''), 'long');
  assert.equal(new Set(kv.keys()).size, 4, 'four distinct underlying keys');
  short.remove('x');
  assert.equal(long.get('x', ''), 'long');
});

test('gameStore: two stores for the same id over the same KV share data (a reload sees saved state)', () => {
  const kv = memoryKV();
  gameStore(kv, 'g').set('resume', { row: 2, guesses: ['रामः'] });
  assert.deepEqual(gameStore(kv, 'g').get('resume', null), { row: 2, guesses: ['रामः'] });
  assert.equal(gameStore(memoryKV(), 'g').get('resume', null), null, 'a different KV is a different device');
});

test('gameStore: corrupt JSON under a game key falls back and can be overwritten', () => {
  const kv = memoryKV({ [`${ROOT_PREFIX}game:g:state`]: '{"row":' });
  const store = gameStore(kv, 'g');
  assert.deepEqual(store.get('state', { row: 0 }), { row: 0 });
  store.set('state', { row: 1 });
  assert.deepEqual(store.get('state', { row: 0 }), { row: 1 });
});

test('gameStore: a game cannot read or clobber the player profile, whatever key it uses', () => {
  const kv = memoryKV();
  const profile = { ...newProfile('2026-11-10'), xp: 1234 };
  saveProfile(kv, profile);
  const store = gameStore(kv, 'rogue');
  for (const key of ['profile', '../profile', ':profile', '']) {
    assert.equal(store.get<unknown>(key, 'nothing'), 'nothing', `key ${JSON.stringify(key)} leaked the profile`);
    store.set(key, { xp: 999_999 });
    store.remove(key);
  }
  assert.equal(loadProfile(kv, '2026-11-10').xp, 1234);
  assert.deepEqual(kv.keys(), [`${ROOT_PREFIX}profile`]);
});

test('gameStore: storing undefined reads back as the fallback (never as the string "undefined")', () => {
  const store = gameStore(memoryKV(), 'g');
  store.set('k', 5);
  store.set<number | undefined>('k', undefined);
  assert.equal(store.get('k', 7), 7);
});

// ───────────────────────────── browserKV ─────────────────────────────

/** Minimal Storage double with switchable failure modes. */
class FakeStorage {
  data = new Map<string, string>();
  fail: { get?: boolean; set?: boolean; remove?: boolean; enumerate?: boolean } = {};
  calls = { set: 0, get: 0 };
  get length(): number {
    if (this.fail.enumerate) throw new Error('SecurityError');
    return this.data.size;
  }
  key(i: number): string | null {
    if (this.fail.enumerate) throw new Error('SecurityError');
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string): string | null {
    this.calls.get++;
    if (this.fail.get) throw new Error('SecurityError');
    return this.data.has(k) ? (this.data.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.calls.set++;
    if (this.fail.set) throw new DOMException('quota', 'QuotaExceededError');
    this.data.set(k, String(v));
  }
  removeItem(k: string): void {
    if (this.fail.remove) throw new Error('SecurityError');
    this.data.delete(k);
  }
  clear(): void {
    this.data.clear();
  }
}

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
function stubLocalStorage(descriptor: PropertyDescriptor): void {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor });
}
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else delete (globalThis as { localStorage?: unknown }).localStorage;
});

/** The KV contract every backend must satisfy. */
function exerciseKV(kv: KV, label: string): void {
  assert.equal(kv.getItem('samskuru:test:a'), null, label);
  kv.setItem('samskuru:test:a', '1');
  kv.setItem('samskuru:test:b', '2');
  assert.equal(kv.getItem('samskuru:test:a'), '1', label);
  kv.setItem('samskuru:test:a', '3');
  assert.equal(kv.getItem('samskuru:test:a'), '3', label);
  assert.deepEqual(kv.keys().filter((k) => k.startsWith('samskuru:test:')).sort(), ['samskuru:test:a', 'samskuru:test:b'], label);
  kv.removeItem('samskuru:test:a');
  assert.equal(kv.getItem('samskuru:test:a'), null, label);
  assert.equal(kv.getItem('samskuru:test:b'), '2', label);
  kv.removeItem('samskuru:test:b');
  assert.deepEqual(kv.keys().filter((k) => k.startsWith('samskuru:test:')), [], label);
}

test('browserKV: works on a healthy localStorage, writes through, and leaves no probe key behind', () => {
  const ls = new FakeStorage();
  stubLocalStorage({ value: ls });
  const kv = browserKV();
  assert.deepEqual([...ls.data.keys()], [], 'the availability probe must clean up after itself');
  exerciseKV(kv, 'healthy');
  kv.setItem('persisted', 'yes');
  assert.equal(ls.data.get('persisted'), 'yes', 'values must really reach localStorage');
  assert.equal(browserKV().getItem('persisted'), 'yes', 'a second instance (page reload) sees the stored value');
  ls.data.set('written-by-another-tab', 'x');
  assert.equal(kv.getItem('written-by-another-tab'), 'x');
  assert.ok(kv.keys().includes('written-by-another-tab'));
});

test('browserKV: no localStorage at all (Node, old WebViews) → in-memory KV', () => {
  stubLocalStorage({ value: undefined });
  exerciseKV(browserKV(), 'undefined localStorage');
  stubLocalStorage({ value: null });
  exerciseKV(browserKV(), 'null localStorage');
});

test('browserKV: reading the localStorage property throws (sandboxed iframe, cookies blocked) → in-memory KV', () => {
  stubLocalStorage({
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
  let kv: KV | undefined;
  assert.doesNotThrow(() => {
    kv = browserKV();
  });
  exerciseKV(kv as KV, 'throwing getter');
});

test('browserKV: setItem throws from the start (private mode with zero quota) → in-memory KV, storage left alone', () => {
  const ls = new FakeStorage();
  ls.fail.set = true;
  stubLocalStorage({ value: ls });
  const kv = browserKV();
  const probes = ls.calls.set;
  exerciseKV(kv, 'zero quota');
  assert.equal(ls.calls.set, probes, 'after a failed probe the broken storage must not be used again');
  assert.equal(ls.data.size, 0);
});

test('browserKV: quota runs out AFTER start-up → the new value wins over the stale stored one', () => {
  const ls = new FakeStorage();
  stubLocalStorage({ value: ls });
  const kv = browserKV();
  kv.setItem('stars', '[1]');
  ls.fail.set = true; // disk full from here on
  assert.doesNotThrow(() => kv.setItem('stars', '[1,3]'));
  assert.equal(kv.getItem('stars'), '[1,3]', 'a write that could not be persisted must still be readable this session');
  assert.doesNotThrow(() => kv.setItem('fresh', 'x'));
  assert.equal(kv.getItem('fresh'), 'x');
  assert.deepEqual(kv.keys().sort(), ['fresh', 'stars']);
  kv.removeItem('stars');
  assert.equal(kv.getItem('stars'), null, 'remove must clear both the overflow copy and the stored copy');
  kv.removeItem('fresh');
  assert.deepEqual(kv.keys(), []);
});

test('browserKV: when quota comes back, writes go to localStorage again and no stale overflow copy shadows them', () => {
  const ls = new FakeStorage();
  stubLocalStorage({ value: ls });
  const kv = browserKV();
  ls.fail.set = true;
  kv.setItem('k', 'in-memory');
  ls.fail.set = false;
  kv.setItem('k', 'persisted');
  assert.equal(ls.data.get('k'), 'persisted');
  assert.equal(kv.getItem('k'), 'persisted');
  ls.data.set('k', 'changed-by-another-tab');
  assert.equal(kv.getItem('k'), 'changed-by-another-tab');
  assert.deepEqual(kv.keys(), ['k']);
});

test('browserKV: getItem / removeItem / key enumeration throwing later never propagates', () => {
  const ls = new FakeStorage();
  stubLocalStorage({ value: ls });
  const kv = browserKV();
  kv.setItem('a', '1');
  ls.fail = { get: true, set: true, remove: true, enumerate: true };
  assert.doesNotThrow(() => kv.getItem('a'));
  assert.doesNotThrow(() => kv.setItem('b', '2'));
  assert.equal(kv.getItem('b'), '2');
  assert.doesNotThrow(() => kv.removeItem('b'));
  assert.equal(kv.getItem('b'), null);
  assert.doesNotThrow(() => kv.keys());
  assert.ok(Array.isArray(kv.keys()));
});

test('browserKV + gameStore + profile: a whole save/load cycle survives a storage that starts failing', () => {
  const ls = new FakeStorage();
  stubLocalStorage({ value: ls });
  const kv = browserKV();
  const store = gameStore(kv, 'akshara-paricaya');
  store.set('stageStars', [3]);
  saveProfile(kv, { ...newProfile('2026-11-10'), xp: 20 });
  ls.fail.set = true;
  store.set('stageStars', [3, 2]);
  saveProfile(kv, { ...newProfile('2026-11-10'), xp: 35 });
  assert.deepEqual(store.get<number[]>('stageStars', []), [3, 2], 'the unlocked stage must not re-lock mid-session');
  assert.equal(loadProfile(kv, '2026-11-10').xp, 35);
});
