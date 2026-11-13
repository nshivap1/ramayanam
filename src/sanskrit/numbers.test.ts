import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardinal, cardinalVariants, ordinal } from './numbers';
import { devaToIast, validateDeva } from './translit';

test('cardinal: hand-checked values', () => {
  const expected: [number, string][] = [
    [1, 'एकम्'], [2, 'द्वे'], [3, 'त्रीणि'], [4, 'चत्वारि'], [5, 'पञ्च'], [6, 'षट्'], [7, 'सप्त'], [8, 'अष्ट'],
    [9, 'नव'], [10, 'दश'], [11, 'एकादश'], [12, 'द्वादश'], [13, 'त्रयोदश'], [14, 'चतुर्दश'], [15, 'पञ्चदश'], [16, 'षोडश'],
    [17, 'सप्तदश'], [18, 'अष्टादश'], [19, 'नवदश'], [20, 'विंशतिः'], [21, 'एकविंशतिः'], [22, 'द्वाविंशतिः'], [23, 'त्रयोविंशतिः'],
    [24, 'चतुर्विंशतिः'], [26, 'षड्विंशतिः'], [28, 'अष्टाविंशतिः'], [30, 'त्रिंशत्'], [32, 'द्वात्रिंशत्'], [33, 'त्रयस्त्रिंशत्'],
    [34, 'चतुस्त्रिंशत्'], [36, 'षट्त्रिंशत्'], [38, 'अष्टात्रिंशत्'], [40, 'चत्वारिंशत्'], [44, 'चतुश्चत्वारिंशत्'], [50, 'पञ्चाशत्'],
    [55, 'पञ्चपञ्चाशत्'], [60, 'षष्टिः'], [64, 'चतुःषष्टिः'], [66, 'षट्षष्टिः'], [70, 'सप्ततिः'], [77, 'सप्तसप्ततिः'], [80, 'अशीतिः'],
    [81, 'एकाशीतिः'], [82, 'द्व्यशीतिः'], [83, 'त्र्यशीतिः'], [84, 'चतुरशीतिः'], [85, 'पञ्चाशीतिः'], [86, 'षडशीतिः'], [87, 'सप्ताशीतिः'],
    [88, 'अष्टाशीतिः'], [89, 'नवाशीतिः'], [90, 'नवतिः'], [94, 'चतुर्नवतिः'], [96, 'षण्णवतिः'], [99, 'नवनवतिः'], [100, 'शतम्'],
    [1000, 'सहस्रम्'],
  ];
  assert.ok(expected.length >= 40);
  for (const [n, word] of expected) assert.equal(cardinal(n), word, String(n));
});

test('cardinal: the same subset checked in IAST (guards against look-alike typos)', () => {
  const expected: [number, string][] = [
    [1, 'ekam'], [2, 'dve'], [3, 'trīṇi'], [4, 'catvāri'], [6, 'ṣaṭ'], [16, 'ṣoḍaśa'], [19, 'navadaśa'], [20, 'viṃśatiḥ'],
    [23, 'trayoviṃśatiḥ'], [26, 'ṣaḍviṃśatiḥ'], [33, 'trayastriṃśat'], [42, 'dvicatvāriṃśat'], [54, 'catuṣpañcāśat'],
    [63, 'triṣaṣṭiḥ'], [74, 'catuḥsaptatiḥ'], [82, 'dvyaśītiḥ'], [96, 'ṣaṇṇavatiḥ'], [100, 'śatam'], [1000, 'sahasram'],
  ];
  for (const [n, iast] of expected) assert.equal(devaToIast(cardinal(n)), iast, String(n));
});

test('cardinal: structure of the full 1–100 table', () => {
  const all: string[] = [];
  for (let n = 1; n <= 100; n++) {
    const w = cardinal(n);
    assert.ok(validateDeva(w).ok, `${n}: ${w}`);
    assert.ok(!all.includes(w), `${n}: ${w} repeated`);
    all.push(w);
  }
  // decade endings
  const decade: Record<number, string> = { 2: 'विंशतिः', 3: 'त्रिंशत्', 4: 'चत्वारिंशत्', 5: 'पञ्चाशत्', 6: 'षष्टिः', 7: 'सप्ततिः', 8: 'शीतिः', 9: 'नवतिः' };
  for (let n = 20; n <= 99; n++) {
    // 96 is षण्णवतिः: the n of navati is retroflexed after ṣaṇ
    const ending = n === 96 ? 'णवतिः' : (decade[Math.floor(n / 10)] as string);
    assert.ok(cardinal(n).endsWith(ending), `${n}: ${cardinal(n)}`);
  }
  // 16 is षोडश (ṣaṣ + daśa with retroflexion)
  for (let n = 11; n <= 19; n++) assert.ok(cardinal(n).endsWith(n === 16 ? 'डश' : 'दश'), `${n}`);
  // unit prefixes
  for (let d = 2; d <= 9; d++) {
    if (d !== 8) {
      assert.ok(cardinal(d * 10 + 1).startsWith('एक'), `${d}1`);
      assert.ok(cardinal(d * 10 + 5).startsWith('पञ्च'), `${d}5`);
      assert.ok(cardinal(d * 10 + 7).startsWith('सप्त'), `${d}7`);
      assert.ok(cardinal(d * 10 + 9).startsWith('नव'), `${d}9`);
    }
    assert.ok(/^(षड्|षट्|षड|षण्)/.test(cardinal(d * 10 + 6)), `${d}6`);
    assert.ok(/^चतु/.test(cardinal(d * 10 + 4)), `${d}4`);
  }
  // dvā / trayas / aṣṭā are obligatory before 20 and 30 (6.3.47–48)
  assert.equal(cardinal(22), 'द्वाविंशतिः');
  assert.equal(cardinal(23), 'त्रयोविंशतिः');
  assert.equal(cardinal(28), 'अष्टाविंशतिः');
  assert.equal(cardinal(32), 'द्वात्रिंशत्');
  assert.equal(cardinal(38), 'अष्टात्रिंशत्');
});

test('cardinalVariants', () => {
  assert.deepEqual(cardinalVariants(8), ['अष्टौ']);
  assert.deepEqual(cardinalVariants(19), ['एकोनविंशतिः']);
  assert.deepEqual(cardinalVariants(29), ['एकोनत्रिंशत्']);
  assert.deepEqual(cardinalVariants(42), ['द्वाचत्वारिंशत्']);
  assert.deepEqual(cardinalVariants(43), ['त्रयश्चत्वारिंशत्']);
  assert.deepEqual(cardinalVariants(48), ['अष्टाचत्वारिंशत्']);
  assert.deepEqual(cardinalVariants(93), ['त्रयोनवतिः']);
  assert.deepEqual(cardinalVariants(99), ['एकोनशतम्']);
  assert.deepEqual(cardinalVariants(5), []);
  assert.deepEqual(cardinalVariants(100), []);
  assert.deepEqual(cardinalVariants(1000), []);
  // 82, 83, 88: no dvā- / trayas- / aṣṭā- option before aśīti
  for (const n of [82, 83, 88, 22, 23, 28, 32, 33, 38]) assert.deepEqual(cardinalVariants(n), [], String(n));
  for (let n = 1; n <= 100; n++) {
    for (const v of cardinalVariants(n)) {
      assert.ok(validateDeva(v).ok, v);
      assert.notEqual(v, cardinal(n));
    }
  }
  // every x9 from 19 on has the subtractive form of the next decade
  for (let n = 19; n <= 99; n += 10) assert.ok(cardinalVariants(n).some((v) => v.startsWith('एकोन')), String(n));
  // the returned array is a copy
  cardinalVariants(19).push('x');
  assert.deepEqual(cardinalVariants(19), ['एकोनविंशतिः']);
});

test('cardinal / cardinalVariants: range errors', () => {
  for (const bad of [0, -1, 101, 999, 1001, 1.5, NaN, Infinity, 200, 10000]) {
    assert.throws(() => cardinal(bad), RangeError, String(bad));
    assert.throws(() => cardinalVariants(bad), RangeError, String(bad));
  }
});

test('ordinal: 1–20 in three genders', () => {
  const m = ['प्रथमः', 'द्वितीयः', 'तृतीयः', 'चतुर्थः', 'पञ्चमः', 'षष्ठः', 'सप्तमः', 'अष्टमः', 'नवमः', 'दशमः', 'एकादशः', 'द्वादशः', 'त्रयोदशः', 'चतुर्दशः', 'पञ्चदशः', 'षोडशः', 'सप्तदशः', 'अष्टादशः', 'नवदशः', 'विंशः'];
  const f = ['प्रथमा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पञ्चदशी', 'षोडशी', 'सप्तदशी', 'अष्टादशी', 'नवदशी', 'विंशी'];
  const n = ['प्रथमम्', 'द्वितीयम्', 'तृतीयम्', 'चतुर्थम्', 'पञ्चमम्', 'षष्ठम्', 'सप्तमम्', 'अष्टमम्', 'नवमम्', 'दशमम्', 'एकादशम्', 'द्वादशम्', 'त्रयोदशम्', 'चतुर्दशम्', 'पञ्चदशम्', 'षोडशम्', 'सप्तदशम्', 'अष्टादशम्', 'नवदशम्', 'विंशम्'];
  for (let i = 1; i <= 20; i++) {
    assert.equal(ordinal(i, 'm'), m[i - 1], `m ${i}`);
    assert.equal(ordinal(i, 'f'), f[i - 1], `f ${i}`);
    assert.equal(ordinal(i, 'n'), n[i - 1], `n ${i}`);
    for (const g of ['m', 'f', 'n'] as const) assert.ok(validateDeva(ordinal(i, g)).ok);
  }
  assert.equal(devaToIast(ordinal(6, 'f')), 'ṣaṣṭhī');
  assert.equal(devaToIast(ordinal(4, 'm')), 'caturthaḥ');
});

test('ordinal: range errors', () => {
  for (const bad of [0, -3, 21, 100, 2.5, NaN]) assert.throws(() => ordinal(bad, 'm'), RangeError, String(bad));
  assert.throws(() => ordinal(1, 'x' as 'm'), RangeError);
});
