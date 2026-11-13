import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aksharaParts, composeAkshara, countAksharas, splitAksharas } from './akshara';
import { devaToSlp1 } from './translit';
import { CONJUNCTS, DEVA_CONSONANTS, DEVA_MATRAS, DEVA_VOWELS, TRIPLES, WORDS } from './testdata';

const CORPUS: string[] = [...TRIPLES.map((t) => t[0]), ...WORDS];

test('splitAksharas: specified behaviour', () => {
  const cases: [string, string[]][] = [
    ['रामम्', ['रा', 'मम्']],
    ['राम', ['रा', 'म']],
    ['रामः', ['रा', 'मः']],
    ['धर्मक्षेत्रे', ['ध', 'र्म', 'क्षे', 'त्रे']],
    ['संस्कृतम्', ['सं', 'स्कृ', 'तम्']],
    ['कार्त्स्न्यम्', ['का', 'र्त्स्न्यम्']],
    ['क्षत्रियः', ['क्ष', 'त्रि', 'यः']],
    ['ज्ञानम्', ['ज्ञा', 'नम्']],
    ['श्रीः', ['श्रीः']],
    ['बुद्ध्या', ['बु', 'द्ध्या']],
    ['रामोऽपि', ['रा', 'मोऽ', 'पि']],
    ['सोऽहम्', ['सोऽ', 'हम्']],
    ['अइउण्', ['अ', 'इ', 'उण्']],
    ['आत्मा', ['आ', 'त्मा']],
    ['ॐ', ['ॐ']],
    ['वाक्', ['वाक्']],
    ['ऊर्क्', ['ऊर्क्']],
    ['पुंस्', ['पुंस्']],
    ['ताँल्लोकान्', ['ताँ', 'ल्लो', 'कान्']],
    ['दुःखम्', ['दुः', 'खम्']],
    ['अंशः', ['अं', 'शः']],
    ['प्रउग', ['प्र', 'उ', 'ग']],
    ['कर्मण्येवाधिकारस्ते', ['क', 'र्म', 'ण्ये', 'वा', 'धि', 'का', 'र', 'स्ते']],
    ['म्', ['म्']],
    ['', []],
  ];
  for (const [input, expected] of cases) assert.deepEqual(splitAksharas(input), expected, input);
});

test('splitAksharas: separators', () => {
  assert.deepEqual(splitAksharas('रामः गच्छति ।'), ['रा', 'मः', 'ग', 'च्छ', 'ति']);
  assert.deepEqual(splitAksharas('रामः गच्छति ।', { keepSeparators: true }), ['रा', 'मः', ' ', 'ग', 'च्छ', 'ति', ' ।']);
  assert.deepEqual(splitAksharas('तत् त्वम्', { keepSeparators: true }), ['तत्', ' ', 'त्वम्']);
  assert.deepEqual(splitAksharas('तत् त्वम्'), ['तत्', 'त्वम्']);
  assert.deepEqual(splitAksharas('देव-आलयः', { keepSeparators: true }), ['दे', 'व', '-', 'आ', 'ल', 'यः']);
  assert.deepEqual(splitAksharas('॥ १२ ॥', { keepSeparators: true }), ['॥ १२ ॥']);
  assert.deepEqual(splitAksharas('॥ १२ ॥'), []);
  // a halanta never attaches across a separator
  assert.deepEqual(splitAksharas('अ म्', { keepSeparators: true }), ['अ', ' ', 'म्']);
  // word-initial avagraha (spaced style) is a separator
  assert.deepEqual(splitAksharas('शिवो ऽहम्'), ['शि', 'वो', 'हम्']);
  assert.deepEqual(splitAksharas('शिवो ऽहम्', { keepSeparators: true }), ['शि', 'वो', ' ', 'ऽ', 'हम्']);
  // input is normalised (ZWJ / ZWNJ / nukta)
  assert.deepEqual(splitAksharas('क्\u200Dष'), ['क्ष']);
  assert.deepEqual(splitAksharas('क\u093Cि'), ['कि']);
});

test('splitAksharas: lossless with keepSeparators, and one vowel per akṣara', () => {
  for (const w of CORPUS) {
    assert.equal(splitAksharas(w, { keepSeparators: true }).join(''), w, w);
    const vowels = (devaToSlp1(w).match(/[aAiIuUfFxXeEoO]|ॐ/g) ?? []).length;
    assert.equal(countAksharas(w), vowels, w);
    for (const a of splitAksharas(w)) {
      const n = (devaToSlp1(a).match(/[aAiIuUfFxXeEoO]|ॐ/g) ?? []).length;
      assert.ok(n <= 1, `${a} in ${w}`);
    }
  }
});

test('countAksharas', () => {
  assert.equal(countAksharas('कर्मण्येवाधिकारस्ते'), 8);
  assert.equal(countAksharas('मा ते सङ्गोऽस्त्वकर्मणि'), 8);
  assert.equal(countAksharas('सोऽहम्'), 2);
  assert.equal(countAksharas('संस्कृतम्'), 3);
  assert.equal(countAksharas('कार्त्स्न्यम्'), 2);
  assert.equal(countAksharas('रामः गच्छति ।'), 5);
  assert.equal(countAksharas('ॐ नमः शिवाय'), 6);
  assert.equal(countAksharas(''), 0);
  assert.equal(countAksharas('म्'), 0);
  assert.equal(countAksharas('। ॥ १'), 0);
  // code points ≠ akṣaras
  assert.equal([...'संस्कृतम्'].length, 9);
});

test('aksharaParts: specified behaviour', () => {
  assert.deepEqual(aksharaParts('क्षे'), { consonants: ['क', 'ष'], vowel: 'ए', finals: [], modifiers: [] });
  assert.deepEqual(aksharaParts('मम्'), { consonants: ['म'], vowel: 'अ', finals: ['म'], modifiers: [] });
  assert.deepEqual(aksharaParts('क'), { consonants: ['क'], vowel: 'अ', finals: [], modifiers: [] });
  assert.deepEqual(aksharaParts('आ'), { consonants: [], vowel: 'आ', finals: [], modifiers: [] });
  assert.deepEqual(aksharaParts('अं'), { consonants: [], vowel: 'अ', finals: [], modifiers: ['ं'] });
  assert.deepEqual(aksharaParts('मोऽ'), { consonants: ['म'], vowel: 'ओ', finals: [], modifiers: ['ऽ'] });
  assert.deepEqual(aksharaParts('श्रीः'), { consonants: ['श', 'र'], vowel: 'ई', finals: [], modifiers: ['ः'] });
  assert.deepEqual(aksharaParts('ताँ'), { consonants: ['त'], vowel: 'आ', finals: [], modifiers: ['ँ'] });
  assert.deepEqual(aksharaParts('पुंस्'), { consonants: ['प'], vowel: 'उ', finals: ['स'], modifiers: ['ं'] });
  assert.deepEqual(aksharaParts('र्त्स्न्यम्'), { consonants: ['र', 'त', 'स', 'न', 'य'], vowel: 'अ', finals: ['म'], modifiers: [] });
  assert.deepEqual(aksharaParts('ऊर्क्'), { consonants: [], vowel: 'ऊ', finals: ['र', 'क'], modifiers: [] });
  assert.deepEqual(aksharaParts('ॐ'), { consonants: [], vowel: 'ॐ', finals: [], modifiers: [] });
  assert.deepEqual(aksharaParts('म्'), { consonants: [], vowel: '', finals: ['म'], modifiers: [] });
  assert.deepEqual(aksharaParts('कॄ'), { consonants: ['क'], vowel: 'ॠ', finals: [], modifiers: [] });
  // the consonants of ज्ञ and क्ष are separate letters even when the tile shows one glyph
  assert.deepEqual(aksharaParts('ज्ञा').consonants, ['ज', 'ञ']);
  assert.deepEqual(aksharaParts('क्ष').consonants, ['क', 'ष']);
});

test('aksharaParts rejects what is not a single akṣara', () => {
  for (const bad of ['', 'राम', 'ा', '्', 'ं', ' ', 'क ', 'कख', 'a', 'क्अ', 'काि', 'अा', 'मम', '।']) {
    assert.throws(() => aksharaParts(bad), RangeError, JSON.stringify(bad));
  }
});

test('composeAkshara is the inverse of aksharaParts over the corpus', () => {
  let n = 0;
  for (const w of CORPUS) {
    for (const a of splitAksharas(w)) {
      assert.equal(composeAkshara(aksharaParts(a)), a, `${a} in ${w}`);
      n += 1;
    }
  }
  assert.ok(n > 800, `checked ${n} akṣaras`);
});

test('property: every consonant × vowel, and every conjunct × vowel', () => {
  for (const c of DEVA_CONSONANTS) {
    for (let v = 0; v < DEVA_MATRAS.length; v++) {
      const a = c + (DEVA_MATRAS[v] as string);
      assert.deepEqual(splitAksharas(a), [a]);
      const parts = aksharaParts(a);
      assert.deepEqual(parts, { consonants: [c], vowel: DEVA_VOWELS[v], finals: [], modifiers: [] });
      assert.equal(composeAkshara(parts), a);
    }
  }
  for (const [cluster] of CONJUNCTS) {
    const letters = cluster.split('्');
    for (let v = 0; v < DEVA_MATRAS.length; v++) {
      const a = cluster + (DEVA_MATRAS[v] as string);
      assert.deepEqual(splitAksharas(a), [a]);
      const parts = aksharaParts(a);
      assert.deepEqual(parts.consonants, letters);
      assert.equal(parts.vowel, DEVA_VOWELS[v]);
      assert.equal(composeAkshara(parts), a);
      // followed by another akṣara, the cluster still starts the first one
      assert.deepEqual(splitAksharas(`${a}क`), [a, 'क']);
    }
  }
});

test('composeAkshara: building blocks and errors', () => {
  assert.equal(composeAkshara({ consonants: ['त', 'र'], vowel: 'ए', finals: [], modifiers: [] }), 'त्रे');
  assert.equal(composeAkshara({ consonants: ['म'], vowel: 'अ', finals: ['म'], modifiers: [] }), 'मम्');
  assert.equal(composeAkshara({ consonants: [], vowel: 'इ', finals: [], modifiers: ['ं'] }), 'इं');
  assert.equal(composeAkshara({ consonants: ['म'], vowel: 'ओ', finals: [], modifiers: ['ऽ'] }), 'मोऽ');
  assert.equal(composeAkshara({ consonants: ['क'], vowel: 'अ', finals: ['त'], modifiers: ['ं'] }), 'कंत्');
  assert.equal(composeAkshara({ consonants: [], vowel: '', finals: ['म'], modifiers: [] }), 'म्');
  assert.throws(() => composeAkshara({ consonants: ['क'], vowel: '', finals: [], modifiers: [] }), RangeError);
  assert.throws(() => composeAkshara({ consonants: ['क'], vowel: 'x', finals: [], modifiers: [] }), RangeError);
  assert.throws(() => composeAkshara({ consonants: [], vowel: 'क', finals: [], modifiers: [] }), RangeError);
  // swapping the vowel of an akṣara
  const parts = aksharaParts('क्षे');
  assert.equal(composeAkshara({ ...parts, vowel: 'इ' }), 'क्षि');
  assert.equal(composeAkshara({ ...parts, vowel: 'अ' }), 'क्ष');
});
