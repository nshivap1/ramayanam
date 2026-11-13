// Pure routing functions only (parseHash / buildHash). The hooks in router.ts need a browser and are covered by tests/e2e/shell.spec.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../sdk/rng';
import { buildHash, parseHash } from './router';

// ───────────────────────────── parseHash ─────────────────────────────

test('parseHash: empty and root hashes → no path, no query', () => {
  for (const hash of ['', '#', '#/', '#//', '#/?', '#?', '/', '#///']) {
    assert.deepEqual(parseHash(hash), { path: [], query: {} }, JSON.stringify(hash));
  }
});

test('parseHash: path segments', () => {
  assert.deepEqual(parseHash('#/learn').path, ['learn']);
  assert.deepEqual(parseHash('#/play/smrti-yugala').path, ['play', 'smrti-yugala']);
  assert.deepEqual(parseHash('#/a/b/c/d').path, ['a', 'b', 'c', 'd']);
});

test('parseHash: tolerant of a missing slash, a missing #, trailing and doubled slashes', () => {
  assert.deepEqual(parseHash('#learn').path, ['learn']);
  assert.deepEqual(parseHash('/learn').path, ['learn']);
  assert.deepEqual(parseHash('learn').path, ['learn']);
  assert.deepEqual(parseHash('#/play/x/').path, ['play', 'x']);
  assert.deepEqual(parseHash('#/play//x').path, ['play', 'x']);
});

test('parseHash: query string', () => {
  assert.deepEqual(parseHash('#/play/x?mode=daily&level=2&seed=7'), { path: ['play', 'x'], query: { mode: 'daily', level: '2', seed: '7' } });
  assert.deepEqual(parseHash('#/play/x?e2e=1').query, { e2e: '1' });
  assert.deepEqual(parseHash('#/?labs=1'), { path: [], query: { labs: '1' } });
  assert.deepEqual(parseHash('#?labs=1'), { path: [], query: { labs: '1' } });
});

test('parseHash: query values are always strings; flags without a value are empty strings; the last duplicate wins', () => {
  assert.deepEqual(parseHash('#/x?seed=007').query, { seed: '007' });
  assert.deepEqual(parseHash('#/x?e2e').query, { e2e: '' });
  assert.deepEqual(parseHash('#/x?e2e=').query, { e2e: '' });
  assert.deepEqual(parseHash('#/x?a=1&a=2').query, { a: '2' });
  assert.deepEqual(parseHash('#/x?&&a=1&').query, { a: '1' });
});

test('parseHash: percent-decoding of path and query (Devanagari, spaces, reserved characters)', () => {
  assert.deepEqual(parseHash('#/play/%E0%A4%B0%E0%A4%BE%E0%A4%AE%E0%A4%83').path, ['play', 'रामः']);
  assert.deepEqual(parseHash('#/a%2Fb/c').path, ['a/b', 'c'], 'an encoded slash stays inside its segment');
  assert.deepEqual(parseHash('#/a%20b').path, ['a b']);
  assert.deepEqual(parseHash('#/x?q=%E0%A4%95&r=a%26b%3Dc').query, { q: 'क', r: 'a&b=c' });
  assert.deepEqual(parseHash('#/x?q=a+b').query, { q: 'a b' }, 'form encoding: + is a space');
  assert.deepEqual(parseHash('#/x?q=a%2Bb').query, { q: 'a+b' });
  assert.deepEqual(parseHash('#/play/रामः?शब्दः=फलम्'), { path: ['play', 'रामः'], query: { 'शब्दः': 'फलम्' } }, 'raw Unicode is accepted as is');
});

test('parseHash: a malformed percent escape must not throw (a bad link would otherwise blank the whole app)', () => {
  for (const hash of ['#/play/100%', '#/play/%E0%A4', '#/%', '#/play/%zz/x', '#/a%2', '#/play/x?seed=%E0%A4', '#/play/x?%=%']) {
    assert.doesNotThrow(() => parseHash(hash), `parseHash(${JSON.stringify(hash)})`);
  }
  assert.deepEqual(parseHash('#/play/100%').path, ['play', '100%'], 'an undecodable segment is kept verbatim');
  assert.deepEqual(parseHash('#/games/%zz').path[0], 'games', 'the good segments still route');
});

test('parseHash: hostile query keys cannot pollute Object.prototype', () => {
  const route = parseHash('#/x?__proto__=polluted&constructor=c&toString=t');
  assert.equal(({} as Record<string, unknown>)['polluted'], undefined);
  assert.equal(Object.prototype.toString.call({}), '[object Object]');
  assert.equal(typeof {}.constructor, 'function');
  assert.deepEqual(route.path, ['x']);
});

// ───────────────────────────── buildHash ─────────────────────────────

test('buildHash: path only', () => {
  assert.equal(buildHash([]), '#/');
  assert.equal(buildHash(['learn']), '#/learn');
  assert.equal(buildHash(['play', 'smrti-yugala']), '#/play/smrti-yugala');
});

test('buildHash: query — numbers are stringified, undefined and empty strings are dropped, 0 is kept, order is preserved', () => {
  assert.equal(buildHash(['play', 'x'], { mode: 'daily', level: 2 }), '#/play/x?mode=daily&level=2');
  assert.equal(buildHash(['play', 'x'], { mode: undefined, level: 0 }), '#/play/x?level=0');
  assert.equal(buildHash(['play', 'x'], { mode: '', level: undefined }), '#/play/x');
  assert.equal(buildHash(['play', 'x'], {}), '#/play/x');
  assert.equal(buildHash(['x'], { b: 1, a: 2 }), '#/x?b=1&a=2');
  assert.equal(buildHash([], { labs: 1 }), '#/?labs=1');
});

test('buildHash: everything that could break a URL is percent-encoded', () => {
  assert.equal(buildHash(['a/b', 'c?d', 'e#f', 'g h', '100%']), '#/a%2Fb/c%3Fd/e%23f/g%20h/100%25');
  assert.equal(buildHash(['x'], { q: 'a&b=c', r: 'x y', s: '1+1', t: '?#/' }), '#/x?q=a%26b%3Dc&r=x%20y&s=1%2B1&t=%3F%23%2F');
  assert.equal(buildHash(['x'], { 'a&b': 'c' }), '#/x?a%26b=c');
  assert.equal(buildHash(['play', 'रामः']), '#/play/%E0%A4%B0%E0%A4%BE%E0%A4%AE%E0%A4%83');
  assert.match(buildHash(['play', 'रामः'], { q: 'फलम् 🪷' }), /^#\/[\x21-\x7e]+$/, 'pure printable ASCII');
});

test('buildHash: the links the shell really builds', () => {
  assert.equal(buildHash(['play', 'akshara-paricaya'], { mode: undefined, level: undefined }), '#/play/akshara-paricaya', 'catalogue card');
  assert.equal(buildHash(['play', 'smrti-yugala'], { mode: 'daily', level: undefined }), '#/play/smrti-yugala?mode=daily', 'daily card');
  assert.equal(buildHash(['play', 'smrti-yugala'], { level: 0, mode: 'practice' }), '#/play/smrti-yugala?level=0&mode=practice', 'path node at level 0');
  assert.equal(buildHash(['games']), '#/games');
});

// ───────────────────────────── round trips ─────────────────────────────

test('round trip: parseHash(buildHash(path, query)) returns the same path and the query as strings', () => {
  const cases: [string[], Record<string, string | number>][] = [
    [[], {}],
    [['learn'], {}],
    [['play', 'smrti-yugala'], { mode: 'daily', level: 0, seed: 4294967295 }],
    [['play', 'रामः'], { q: 'फलम्', 'शब्दः': 'वृक्षः' }],
    [['a/b', 'c?d=e', 'f#g', 'h&i', 'j k', '100%', '%41', 'x+y', '.', '..'], { 'k&1': 'v=1', 'k 2': 'v+2', 'k?3': 'v#3', k4: '%41', k5: 'a/b', k6: ' ', k7: '🪷' }],
    [['क्ष', 'ज्ञ', 'सोऽहम्', 'अहं गच्छामि'], { text: 'धर्मक्षेत्रे कुरुक्षेत्रे' }],
  ];
  for (const [path, query] of cases) {
    const hash = buildHash(path, query);
    const expected = Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)]));
    assert.deepEqual(parseHash(hash), { path, query: expected }, hash);
    assert.equal(buildHash(parseHash(hash).path, parseHash(hash).query), hash, 'build ∘ parse is stable');
  }
});

test('round trip: 2 000 random routes made of awkward characters', () => {
  const alphabet = ['a', 'Z', '0', '-', '_', '.', '~', ' ', '/', '?', '#', '&', '=', '+', '%', '"', "'", '<', '\\', 'क', 'ष', '्', 'ं', 'ः', 'ऽ', 'é', 'ñ', '🪷', '‍'];
  const rng = createRng(20261110);
  const word = (min: number): string => Array.from({ length: rng.range(min, 6) }, () => rng.pick(alphabet)).join('');
  for (let i = 0; i < 2000; i++) {
    const path = Array.from({ length: rng.range(0, 4) }, () => word(1));
    const query: Record<string, string> = {};
    for (let n = rng.range(0, 4); n > 0; n--) {
      const key = word(1);
      if (key === '__proto__') continue;
      query[key] = word(1);
    }
    const hash = buildHash(path, query);
    assert.deepEqual(parseHash(hash), { path, query }, `route ${i}: ${hash}`);
  }
});

test('round trip: documented lossy cases — empty segments vanish, empty values are dropped', () => {
  assert.deepEqual(parseHash(buildHash(['play', '', 'x'])).path, ['play', 'x']);
  assert.deepEqual(parseHash(buildHash(['x'], { a: '', b: undefined, c: 'kept' })).query, { c: 'kept' });
});

test('parseHash and buildHash do not mutate their arguments', () => {
  const path = Object.freeze(['play', 'x']) as unknown as string[];
  const query = Object.freeze({ mode: 'daily', level: 2 });
  assert.doesNotThrow(() => buildHash(path, query));
  assert.deepEqual([path, query], [['play', 'x'], { mode: 'daily', level: 2 }]);
  const a = parseHash('#/play/x?mode=daily');
  const b = parseHash('#/play/x?mode=daily');
  assert.notEqual(a.path, b.path);
  assert.notEqual(a.query, b.query);
});
