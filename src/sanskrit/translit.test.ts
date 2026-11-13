import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectScheme,
  devaToIast,
  devaToSlp1,
  fromDevaDigits,
  iastToDeva,
  iastToSlp1,
  normalizeDeva,
  slp1ToDeva,
  slp1ToIast,
  toDevaDigits,
  transliterate,
  validateDeva,
} from './translit';
import {
  CONJUNCTS,
  DEVA_CONSONANTS,
  DEVA_MATRAS,
  DEVA_VOWELS,
  IAST_CONSONANTS,
  IAST_VOWELS,
  SLP1_CONSONANTS,
  SLP1_VOWELS,
  TRIPLES,
  WORDS,
} from './testdata';

const CORPUS: string[] = [...TRIPLES.map((t) => t[0]), ...WORDS];

test('corpus is large and every item is valid Devanagari', () => {
  assert.ok(CORPUS.length >= 250, `corpus has ${CORPUS.length} items`);
  for (const w of CORPUS) {
    const v = validateDeva(w);
    assert.deepEqual(v, { ok: true, errors: [] }, `validateDeva(${w})`);
    assert.equal(normalizeDeva(w), w, `corpus item is already normalised: ${w}`);
  }
});

test('hand-checked triples: deva → slp1, deva → iast', () => {
  for (const [deva, slp1, iast] of TRIPLES) {
    assert.equal(devaToSlp1(deva), slp1, `devaToSlp1(${deva})`);
    assert.equal(devaToIast(deva), iast, `devaToIast(${deva})`);
    assert.equal(slp1ToIast(slp1), iast, `slp1ToIast(${slp1})`);
  }
});

test('hand-checked triples: slp1 → deva, iast → deva, iast → slp1', () => {
  for (const [deva, slp1, iast] of TRIPLES) {
    assert.equal(slp1ToDeva(slp1), deva, `slp1ToDeva(${slp1})`);
    assert.equal(iastToDeva(iast), deva, `iastToDeva(${iast})`);
    assert.equal(iastToSlp1(iast), slp1, `iastToSlp1(${iast})`);
  }
});

test('round trip deva → slp1 → deva over the corpus', () => {
  for (const w of CORPUS) assert.equal(slp1ToDeva(devaToSlp1(w)), w);
});

test('round trip deva → iast → deva over the corpus', () => {
  for (const w of CORPUS) assert.equal(iastToDeva(devaToIast(w)), w);
});

test('round trip deva → hk → deva over the corpus', () => {
  for (const w of CORPUS) assert.equal(transliterate(transliterate(w, 'deva', 'hk'), 'hk', 'deva'), w);
});

test('IAST output is NFC and uses only the standard diacritics', () => {
  const allowed = /^[a-zāīūṛṝḷḹṅñṭḍṇśṣṃḥḻïü\u0310':|0-9 \-ॐ.]*$/;
  for (const w of CORPUS) {
    const iast = devaToIast(w);
    assert.equal(iast, iast.normalize('NFC'));
    assert.match(iast, allowed, `${w} → ${iast}`);
  }
});

test('property: every consonant × vowel syllable', () => {
  for (let c = 0; c < DEVA_CONSONANTS.length; c++) {
    for (let v = 0; v < DEVA_MATRAS.length; v++) {
      const deva = DEVA_CONSONANTS.charAt(c) + (DEVA_MATRAS[v] as string);
      const slp1 = SLP1_CONSONANTS.charAt(c) + SLP1_VOWELS.charAt(v);
      const iast = (IAST_CONSONANTS[c] as string) + (IAST_VOWELS[v] as string);
      assert.equal(devaToSlp1(deva), slp1);
      assert.equal(slp1ToDeva(slp1), deva);
      assert.equal(devaToIast(deva), iast);
      assert.equal(iastToDeva(iast), deva);
      assert.equal(iastToSlp1(iast), slp1);
    }
  }
});

test('property: independent vowels with each modifier', () => {
  const mods: [string, string, string][] = [
    ['', '', ''],
    ['ं', 'M', 'ṃ'],
    ['ः', 'H', 'ḥ'],
    ['ँ', '~', 'm\u0310'],
  ];
  for (let v = 0; v < DEVA_VOWELS.length; v++) {
    for (const [dm, sm, im] of mods) {
      const deva = (DEVA_VOWELS[v] as string) + dm;
      const slp1 = SLP1_VOWELS.charAt(v) + sm;
      const iast = (IAST_VOWELS[v] as string) + im;
      assert.equal(devaToSlp1(deva), slp1);
      assert.equal(slp1ToDeva(slp1), deva);
      assert.equal(devaToIast(deva), iast);
      assert.equal(iastToDeva(iast), deva);
    }
  }
});

test('property: common conjuncts × vowels, plus halanta form', () => {
  for (const [cluster, slp] of CONJUNCTS) {
    for (let v = 0; v < DEVA_MATRAS.length; v++) {
      const deva = cluster + (DEVA_MATRAS[v] as string);
      const slp1 = slp + SLP1_VOWELS.charAt(v);
      assert.equal(devaToSlp1(deva), slp1);
      assert.equal(slp1ToDeva(slp1), deva);
      assert.equal(iastToDeva(devaToIast(deva)), deva);
    }
    assert.equal(devaToSlp1(`${cluster}्`), slp);
    assert.equal(slp1ToDeva(slp), `${cluster}्`);
  }
});

test('property: every two-consonant cluster round-trips through SLP1, IAST and HK', () => {
  for (let a = 0; a < DEVA_CONSONANTS.length; a++) {
    for (let b = 0; b < DEVA_CONSONANTS.length; b++) {
      const deva = `अ${DEVA_CONSONANTS.charAt(a)}्${DEVA_CONSONANTS.charAt(b)}ि`;
      assert.equal(slp1ToDeva(devaToSlp1(deva)), deva);
      assert.equal(iastToDeva(devaToIast(deva)), deva);
      assert.equal(transliterate(transliterate(deva, 'deva', 'hk'), 'hk', 'deva'), deva);
    }
  }
});

test('property: every vowel hiatus pair round-trips', () => {
  for (const v1 of DEVA_VOWELS) {
    for (const v2 of DEVA_VOWELS) {
      const deva = `क${v1 === 'अ' ? '' : DEVA_MATRAS[DEVA_VOWELS.indexOf(v1)]}${v2}`;
      assert.equal(slp1ToDeva(devaToSlp1(deva)), deva);
      assert.equal(iastToDeva(devaToIast(deva)), deva);
      assert.equal(transliterate(transliterate(deva, 'deva', 'hk'), 'hk', 'deva'), deva);
    }
  }
});

test('IAST conventions: ai / au are diphthongs, hiatus needs a mark', () => {
  assert.equal(iastToDeva('kaivalyam'), 'कैवल्यम्');
  assert.equal(iastToDeva('gauḥ'), 'गौः');
  assert.equal(iastToSlp1('ai'), 'E');
  assert.equal(iastToSlp1('au'), 'O');
  assert.equal(iastToSlp1('aï'), 'ai');
  assert.equal(iastToSlp1('aü'), 'au');
  assert.equal(iastToSlp1('a:i'), 'ai');
  assert.equal(iastToSlp1('a:u'), 'au');
  assert.equal(devaToIast('अइ'), 'aï');
  assert.equal(devaToIast('अउ'), 'aü');
  assert.equal(devaToIast('ऐ'), 'ai');
  assert.equal(devaToIast('औ'), 'au');
  assert.equal(devaToIast('आइ'), 'āi');
  assert.equal(iastToDeva('āi'), 'आइ');
  // aspirates vs stop + h
  assert.equal(iastToDeva('khaga'), 'खग');
  assert.equal(iastToDeva('k:haga'), 'क्हग');
  assert.equal(devaToIast('उद्हार'), 'ud:hāra');
  assert.equal(devaToIast('उद्धार'), 'uddhāra');
});

test('iastToSlp1 accepts input variants', () => {
  assert.equal(iastToSlp1('saṃskṛtam'), 'saMskftam');
  assert.equal(iastToSlp1('saṁskṛtam'), 'saMskftam');
  assert.equal(iastToSlp1('Rāmaḥ'), 'rAmaH');
  assert.equal(iastToSlp1('KṚṢṆA'), 'kfzRa');
  assert.equal(iastToSlp1('so\u2019ham'), "so'ham");
  assert.equal(iastToSlp1("so'ham"), "so'ham");
  // decomposed input (combining marks) is normalised
  assert.equal(iastToSlp1('ra\u0304ma'), 'rAma');
  assert.equal(iastToSlp1('kr\u0323s\u0323n\u0323a'), 'kfzRa');
  assert.equal(iastToSlp1('pitr\u0323\u0304n'), 'pitFn');
  // ISO 15919 vocalic letters
  assert.equal(iastToSlp1('kr\u0325ta'), 'kfta');
  assert.equal(iastToSlp1('kl\u0325pta'), 'kxpta');
  assert.equal(iastToDeva('kruṣṇa'), 'क्रुष्ण');
  assert.equal(iastToDeva('ṛṣiḥ'), 'ऋषिः');
  assert.notEqual(iastToDeva('ruṣiḥ'), 'ऋषिः');
});

test('Harvard-Kyoto', () => {
  assert.equal(transliterate('kRSNa', 'hk', 'deva'), 'कृष्ण');
  assert.equal(transliterate('saMskRtam', 'hk', 'deva'), 'संस्कृतम्');
  assert.equal(transliterate('jJAnam', 'hk', 'deva'), 'ज्ञानम्');
  assert.equal(transliterate('zivaH', 'hk', 'deva'), 'शिवः');
  assert.equal(transliterate('SaSThI', 'hk', 'deva'), 'षष्ठी');
  assert.equal(transliterate('aGgam', 'hk', 'deva'), 'अङ्गम्');
  assert.equal(transliterate('pitRRNAm', 'hk', 'deva'), 'पितॄणाम्');
  assert.equal(transliterate('klRptam', 'hk', 'deva'), 'कॢप्तम्');
  assert.equal(transliterate('कृष्णः', 'deva', 'hk'), 'kRSNaH');
  assert.equal(transliterate('ऐश्वर्यम्', 'deva', 'hk'), 'aizvaryam');
  assert.equal(transliterate('धर्मक्षेत्रे', 'deva', 'hk'), 'dharmakSetre');
  assert.equal(transliterate('प्रउग', 'deva', 'hk'), 'pra:uga');
  assert.equal(transliterate('kfzRa', 'slp1', 'hk'), 'kRSNa');
  assert.equal(transliterate('kRSNa', 'hk', 'iast'), 'kṛṣṇa');
  assert.equal(transliterate('kṛṣṇa', 'iast', 'hk'), 'kRSNa');
});

test('transliterate: identity, punctuation and digits', () => {
  assert.equal(transliterate('रामः', 'deva', 'deva'), 'रामः');
  assert.equal(transliterate('rAmaH', 'slp1', 'slp1'), 'rAmaH');
  assert.equal(transliterate('रामः', 'deva', 'iast'), 'rāmaḥ');
  assert.equal(transliterate('rāmaḥ', 'iast', 'slp1'), 'rAmaH');
  assert.equal(transliterate('rAmaH', 'slp1', 'deva'), 'रामः');
  assert.equal(devaToSlp1('। ॥ १२३'), '| || 123');
  assert.equal(slp1ToDeva('| || 123'), '। ॥ १२३');
  assert.equal(devaToSlp1('राम, सीता?'), 'rAma, sItA?');
  assert.equal(slp1ToDeva('rAma, sItA?'), 'राम, सीता?');
  assert.equal(devaToSlp1(''), '');
  assert.equal(slp1ToDeva(''), '');
  assert.equal(slp1ToDeva('tat ca'), 'तत् च');
  assert.equal(slp1ToDeva('vAk'), 'वाक्');
  assert.equal(slp1ToDeva('a i u'), 'अ इ उ');
  assert.equal(devaToSlp1('रामः\nगच्छति'), 'rAmaH\ngacCati');
});

test('detectScheme', () => {
  assert.equal(detectScheme('रामः'), 'deva');
  assert.equal(detectScheme('ॐ'), 'deva');
  assert.equal(detectScheme('rāmaḥ'), 'iast');
  assert.equal(detectScheme('kṛṣṇa'), 'iast');
  assert.equal(detectScheme('Śiva'), 'iast');
  assert.equal(detectScheme('saṁskṛtam'), 'iast');
  assert.equal(detectScheme('kfzRa'), 'slp1');
  assert.equal(detectScheme('gacCati'), 'slp1');
  assert.equal(detectScheme('Darmakzetre'), 'slp1');
  assert.equal(detectScheme('rAmaH'), 'slp1');
  assert.equal(detectScheme('kRSNa'), 'hk');
  assert.equal(detectScheme('dharmakSetre'), 'hk');
  assert.equal(detectScheme('saMskRtam'), 'hk');
  assert.equal(detectScheme('zAstram'), 'slp1'); // reads as SLP1 or HK: ambiguous strings default to the internal scheme
  assert.equal(detectScheme('dharmazAstra'), 'hk');
  assert.equal(detectScheme('dharma'), 'iast');
  assert.equal(detectScheme('deva'), 'iast');
  assert.equal(detectScheme('123 ।'), 'unknown');
  assert.equal(detectScheme(''), 'unknown');
  // informal romanisations are not IAST
  assert.equal(detectScheme('krishna'), 'unknown');
  assert.equal(detectScheme('raama'), 'unknown');
  assert.equal(detectScheme('dhṛitarāśhtra'), 'unknown');
  assert.equal(detectScheme('vruddhiraadaich'), 'unknown');
});

test('normalizeDeva', () => {
  assert.equal(normalizeDeva('  रामः   गच्छति  '), 'रामः गच्छति');
  assert.equal(normalizeDeva('राम\u200Dः'), 'रामः');
  assert.equal(normalizeDeva('क्\u200Cष'), 'क्ष');
  assert.equal(normalizeDeva('\u0958'), 'क');
  assert.equal(normalizeDeva('क\u093C'), 'क');
  assert.equal(normalizeDeva('ज\u093C'), 'ज');
  assert.equal(normalizeDeva('ड\u093C'), 'ड');
  assert.equal(normalizeDeva('\u0931'), 'र');
  assert.equal(normalizeDeva('\u0929'), 'न');
  assert.equal(normalizeDeva('\u0934'), 'ळ');
  assert.equal(normalizeDeva('क\u093C्'), 'क्');
  assert.equal(normalizeDeva('रामः ।।'), 'रामः ॥');
  assert.equal(normalizeDeva('रामः\n\tगच्छति'), 'रामः गच्छति');
  assert.equal(normalizeDeva(''), '');
  assert.equal(normalizeDeva('ळ'), 'ळ');
  // NFC never recomposes the nukta letters, and reorders nukta before virāma
  assert.equal('\u0958'.normalize('NFC'), 'क\u093C');
  assert.equal('क्\u093C'.normalize('NFC'), 'क\u093C्');
  // idempotent
  for (const w of ['  क\u093C  ख\u093C ', 'राम\u200Dः ।।', 'तत्  त्वम्']) assert.equal(normalizeDeva(normalizeDeva(w)), normalizeDeva(w));
});

test('validateDeva accepts well-formed text', () => {
  for (const ok of ['अ', 'क', 'क्', 'ॐ', 'रामः ।', 'तत् त्वम् असि ॥ १ ॥', 'शिवो ऽहम्', 'देव-आलयः', 'रामोऽपि', 'निरृतिः', 'शृणोति', 'पुंस्', 'अऽऽ']) {
    assert.deepEqual(validateDeva(ok), { ok: true, errors: [] }, ok);
  }
  assert.equal(validateDeva('रामः, सीता च!').ok, false);
  assert.equal(validateDeva('रामः, सीता च!', { allowPunctuation: ',!' }).ok, true);
});

test('validateDeva rejects malformed text', () => {
  const bad: [string, RegExp][] = [
    ['', /empty/],
    ['काि', /cannot follow a vowel sign/],
    ['काे', /cannot follow a vowel sign/],
    ['अा', /cannot follow an independent vowel/],
    ['अाम', /cannot follow an independent vowel/],
    ['ॐा', /cannot follow an independent vowel/],
    ['ाम', /dangling vowel sign/],
    ['क ा', /dangling vowel sign/],
    ['कंि', /dangling vowel sign/],
    ['्क', /dangling virāma/],
    ['अ्', /dangling virāma/],
    ['का्', /dangling virāma/],
    ['क््', /dangling virāma/],
    ['क्अ', /virāma must be followed by a consonant/],
    ['क्ा', /dangling vowel sign/],
    ['क्ं', /must follow a vowel/],
    ['ंक', /must follow a vowel/],
    ['कंः', /more than one/],
    ['कःं', /more than one/],
    ['ऽक', /avagraha at the start/],
    ['क्ऽ', /avagraha cannot follow a virāma/],
    ['कंऽ', /avagraha cannot follow anusvāra/],
    ['क-ऽ', /avagraha must follow a vowel/],
    ['राम:', /disallowed code point ":"/],
    ['rama', /disallowed code point "r"/],
    ['राम 12', /disallowed code point "1"/],
    ['ज\u093C', /disallowed code point/],
    ['क\u093C', /not in Unicode NFC|disallowed/],
    ['क\u200Dष', /disallowed code point/],
    ['ऎ', /disallowed code point/],
    ['ऑ', /disallowed code point/],
    ['कॅ', /disallowed code point/],
    ['श्रृणोति', /impossible cluster/],
    ['श्रृङ्गारः', /impossible cluster/],
    ['राम|', /disallowed code point/],
  ];
  for (const [text, re] of bad) {
    const v = validateDeva(text);
    assert.equal(v.ok, false, `should reject ${JSON.stringify(text)}`);
    assert.ok(v.errors.some((e) => re.test(e)), `${JSON.stringify(text)} → ${JSON.stringify(v.errors)}`);
  }
});

test('validateDeva reports positions and all errors', () => {
  const v = validateDeva('काि कx');
  assert.equal(v.ok, false);
  assert.equal(v.errors.length, 2);
  assert.match(v.errors[0] as string, /^index 2:/);
  assert.match(v.errors[1] as string, /^index 5:/);
});

test('digits', () => {
  assert.equal(toDevaDigits(0), '०');
  assert.equal(toDevaDigits(108), '१०८');
  assert.equal(toDevaDigits(1234567890), '१२३४५६७८९०');
  assert.equal(toDevaDigits('2.47'), '२.४७');
  assert.equal(toDevaDigits(-5), '-५');
  assert.equal(toDevaDigits('अध्यायः 18'), 'अध्यायः १८');
  assert.equal(fromDevaDigits('१०८'), 108);
  assert.equal(fromDevaDigits('०'), 0);
  assert.equal(fromDevaDigits('२.५'), 2.5);
  assert.equal(fromDevaDigits('-७'), -7);
  assert.equal(fromDevaDigits('42'), 42);
  assert.equal(fromDevaDigits(' १२ '), 12);
  assert.ok(Number.isNaN(fromDevaDigits('')));
  assert.ok(Number.isNaN(fromDevaDigits('राम')));
  assert.ok(Number.isNaN(fromDevaDigits('१२क')));
  for (let n = 0; n <= 1000; n += 37) assert.equal(fromDevaDigits(toDevaDigits(n)), n);
});
