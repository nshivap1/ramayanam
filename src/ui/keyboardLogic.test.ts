import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDeva } from '../sanskrit';
import { createRng } from '../sdk/rng';
import { ANUSVARA, AVAGRAHA, BACKSPACE, CANDRABINDU, CONSONANT_ROWS, ENTER, MARK_KEYS, RARE_VOWEL_KEYS, VIRAMA, VISARGA, VOWEL_KEYS, applyKey, keysFor } from './keyboardLogic';

const CONSONANTS = CONSONANT_ROWS.flat();
/** Vowel keys that have a dependent sign (everything except अ). */
const SIGN: Record<string, string> = { आ: 'ा', इ: 'ि', ई: 'ी', उ: 'ु', ऊ: 'ू', ऋ: 'ृ', ॠ: 'ॄ', ऌ: 'ॢ', ए: 'े', ऐ: 'ै', ओ: 'ो', औ: 'ौ' };
const ALL_KEYS = [...VOWEL_KEYS, ...RARE_VOWEL_KEYS, ...CONSONANTS, ...MARK_KEYS, CANDRABINDU, ' '];
const type = (keys: readonly string[], from = ''): string => keys.reduce((text, k) => applyKey(text, k), from);
const codePoints = (s: string): number => [...s].length;
/** validateDeva problems, ignoring its one spelling (not structural) check: C + र् + ृ, as in the misspelling श्रृ. */
const structuralErrors = (s: string): string[] => validateDeva(s).errors.filter((e) => !e.includes('impossible cluster'));

/** One representative text per "what was typed last" situation. All are well-formed. */
const AFTER = {
  start: '',
  consonant: 'क',
  virama: 'क्',
  sign: 'कि',
  vowel: 'अ',
  longVowel: 'ई',
  anusvara: 'कं',
  visarga: 'कः',
  candrabindu: 'कँ',
  avagraha: 'सोऽ',
  space: 'क ',
} as const;
type Situation = keyof typeof AFTER;
const SITUATIONS = Object.keys(AFTER) as Situation[];

/** Assert that `key` is accepted in exactly the `legal` situations, appending itself there and changing nothing elsewhere. */
function assertLegalOnlyAfter(key: string, legal: readonly Situation[], name: string): void {
  for (const s of SITUATIONS) {
    const before = AFTER[s];
    const after = applyKey(before, key);
    if (legal.includes(s)) {
      assert.equal(after, before + key, `${name} after ${s} should be appended`);
      assert.deepEqual(validateDeva(after).errors, [], `${name} after ${s} must give well-formed text`);
    } else {
      assert.equal(after, before, `${name} after ${s} is illegal and must be ignored`);
    }
  }
}

// ───────────────────────────── the key set ─────────────────────────────

test('keys: 11 vowels, 2 rare vowels, the 33 consonants of the varṇamālā in order, 4 marks', () => {
  assert.deepEqual([...VOWEL_KEYS], ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ']);
  assert.deepEqual([...RARE_VOWEL_KEYS], ['ॠ', 'ऌ']);
  assert.equal(CONSONANTS.join(''), 'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह');
  assert.deepEqual(CONSONANT_ROWS.map((r) => r.length), [10, 10, 9, 4]);
  assert.deepEqual([...MARK_KEYS], ['ं', 'ः', '्', 'ऽ']);
  assert.deepEqual([VIRAMA, ANUSVARA, VISARGA, CANDRABINDU, AVAGRAHA].map((c) => c.codePointAt(0)), [0x94d, 0x902, 0x903, 0x901, 0x93d]);
});

test('keys: no key appears twice, every key is one code point, and none collides with the control keys', () => {
  assert.equal(new Set(ALL_KEYS).size, ALL_KEYS.length);
  for (const k of ALL_KEYS) assert.equal(codePoints(k), 1, `key ${k}`);
  assert.ok(!ALL_KEYS.includes(BACKSPACE) && !ALL_KEYS.includes(ENTER));
  assert.notEqual(BACKSPACE, ENTER);
});

// ───────────────────────────── applyKey: one section per key class ─────────────────────────────

test('consonant keys: always appended — at the start, after anything, and after a virāma to form a conjunct', () => {
  for (const c of CONSONANTS) {
    for (const s of SITUATIONS) {
      const after = applyKey(AFTER[s], c);
      assert.equal(after, AFTER[s] + c, `${c} after ${s}`);
      assert.deepEqual(validateDeva(after).errors, [], `${c} after ${s}`);
    }
  }
  assert.equal(type(['क', VIRAMA, 'ष']), 'क्ष');
  assert.equal(type(['ज', VIRAMA, 'ञ']), 'ज्ञ');
  assert.equal(type(['त', VIRAMA, 'र']), 'त्र');
  assert.equal(type(['श', VIRAMA, 'र']), 'श्र');
  assert.equal(type(['द', VIRAMA, 'ध', VIRAMA, 'य']), 'द्ध्य');
  assert.equal(type(['र', VIRAMA, 'त', VIRAMA, 'स', VIRAMA, 'न', VIRAMA, 'य']), 'र्त्स्न्य');
});

test('अ key: independent अ where a vowel can start; nothing after a consonant (inherent a); cancels a virāma', () => {
  assert.equal(applyKey('', 'अ'), 'अ');
  assert.equal(applyKey('क', 'अ'), 'क', 'क already contains a');
  assert.equal(applyKey('क्', 'अ'), 'क', 'क् + अ → क');
  assert.equal(applyKey('क्ष्', 'अ'), 'क्ष');
  assert.equal(applyKey('कि', 'अ'), 'किअ');
  assert.equal(applyKey('अ', 'अ'), 'अअ');
  assert.equal(applyKey('कं', 'अ'), 'कंअ');
  assert.equal(applyKey('कः', 'अ'), 'कःअ');
  assert.equal(applyKey('सोऽ', 'अ'), 'सोऽअ');
  assert.equal(applyKey('क ', 'अ'), 'क अ');
  for (const s of SITUATIONS) assert.deepEqual(validateDeva(applyKey(AFTER[s], 'अ')).errors, [], `अ after ${s}`);
});

test('vowel keys (आ … औ, ॠ, ऌ): vowel SIGN after a consonant, sign REPLACING a virāma, independent letter elsewhere', () => {
  assert.equal(Object.keys(SIGN).length, 12);
  for (const [vowel, sign] of Object.entries(SIGN)) {
    assert.equal(applyKey('क', vowel), `क${sign}`, `क + ${vowel}`);
    assert.equal(applyKey('क्', vowel), `क${sign}`, `क् + ${vowel}`);
    assert.equal(applyKey('क्ष्', vowel), `क्ष${sign}`, `क्ष् + ${vowel}`);
    for (const s of ['start', 'sign', 'vowel', 'longVowel', 'anusvara', 'visarga', 'candrabindu', 'avagraha', 'space'] as const) {
      assert.equal(applyKey(AFTER[s], vowel), AFTER[s] + vowel, `${vowel} after ${s} is the independent letter`);
    }
    for (const s of SITUATIONS) assert.deepEqual(validateDeva(applyKey(AFTER[s], vowel)).errors, [], `${vowel} after ${s}`);
  }
});

test('vowel keys: the irregular-looking syllables are still plain consonant + sign (रु, रू, हृ, कृ, दृ, शृ)', () => {
  assert.equal(type(['र', 'उ']), 'रु');
  assert.equal(type(['र', 'ऊ']), 'रू');
  assert.equal(type(['ह', 'ऋ']), 'हृ');
  assert.equal(type(['क', 'ऋ']), 'कृ');
  assert.equal(type(['द', 'ऋ']), 'दृ');
  assert.equal(type(['श', 'ऋ']), 'शृ');
  assert.equal(type(['प', 'इ', 'त', 'ॠ', 'न', VIRAMA]), 'पितॄन्');
  assert.equal(type(['क', 'ऌ', 'प', VIRAMA, 'त']), 'कॢप्त');
});

test('virāma key: only directly after a consonant', () => {
  assertLegalOnlyAfter(VIRAMA, ['consonant'], 'virāma');
  for (const c of CONSONANTS) assert.equal(applyKey(c, VIRAMA), c + VIRAMA);
  assert.equal(applyKey('क्ष', VIRAMA), 'क्ष्');
});

test('anusvāra key: only after a vowel (inherent, sign or independent); never doubled or stacked on another mark', () => {
  assertLegalOnlyAfter(ANUSVARA, ['consonant', 'sign', 'vowel', 'longVowel'], 'anusvāra');
});

test('candrabindu: same positions as anusvāra', () => {
  assertLegalOnlyAfter(CANDRABINDU, ['consonant', 'sign', 'vowel', 'longVowel'], 'candrabindu');
});

test('visarga key: only after a vowel; never after virāma, another visarga, anusvāra, candrabindu, avagraha or a space', () => {
  assertLegalOnlyAfter(VISARGA, ['consonant', 'sign', 'vowel', 'longVowel'], 'visarga');
});

test('avagraha key: after a vowel or at the start of a later word; never first, doubled, after a virāma or after ं ः ँ', () => {
  assertLegalOnlyAfter(AVAGRAHA, ['consonant', 'sign', 'vowel', 'longVowel', 'space'], 'avagraha');
  assert.equal(type(['स', 'ओ', AVAGRAHA, 'ह', 'म', VIRAMA]), 'सोऽहम्');
});

test('space: separates words; never leading, never doubled; allowed after a final virāma (रामम् …)', () => {
  assertLegalOnlyAfter(' ', ['consonant', 'virama', 'sign', 'vowel', 'longVowel', 'anusvara', 'visarga', 'candrabindu', 'avagraha'], 'space');
  assert.equal(type([' ', ' ', 'क', ' ', ' ', 'ख']), 'क ख');
});

test('after a space a word starts afresh: marks that need a host are refused, vowels are independent', () => {
  const t = 'राम ';
  assert.equal(applyKey(t, VIRAMA), t);
  assert.equal(applyKey(t, ANUSVARA), t);
  assert.equal(applyKey(t, VISARGA), t);
  assert.equal(applyKey(t, 'इ'), 'राम इ');
  assert.equal(applyKey(t, 'अ'), 'राम अ');
  assert.equal(applyKey(t, 'क'), 'राम क');
});

test('enter and unknown keys leave the text exactly as it is', () => {
  for (const before of Object.values(AFTER)) {
    assert.equal(applyKey(before, ENTER), before);
    for (const junk of ['', 'a', 'Z', '1', '१', '।', '॥', 'ॐ', '‍', '‌', '़', 'ा', 'ि', '🪷', '\n', '-', 'ॡ']) {
      assert.equal(applyKey(before, junk), before, `key ${JSON.stringify(junk)} after ${JSON.stringify(before)}`);
    }
  }
});

// ───────────────────────────── backspace ─────────────────────────────

test('backspace: removes exactly one code point per press and is harmless on empty text', () => {
  assert.equal(applyKey('', BACKSPACE), '');
  const steps = ['क्ष्म्या', 'क्ष्म्य', 'क्ष्म्', 'क्ष्म', 'क्ष्', 'क्ष', 'क्', 'क', '', ''];
  for (let i = 0; i + 1 < steps.length; i++) assert.equal(applyKey(steps[i] as string, BACKSPACE), steps[i + 1], `step ${i}`);
  assert.equal(applyKey('कि', BACKSPACE), 'क', 'removing a sign restores the inherent a');
  assert.equal(applyKey('कं', BACKSPACE), 'क');
  assert.equal(applyKey('सोऽ', BACKSPACE), 'सो');
  assert.equal(applyKey('राम ', BACKSPACE), 'राम');
  assert.equal(applyKey('अ', BACKSPACE), '');
});

test('backspace: undoes any single key press that changed the text by appending', () => {
  for (const s of SITUATIONS) {
    for (const k of ALL_KEYS) {
      const before = AFTER[s];
      const after = applyKey(before, k);
      if (after === before + k || (after.startsWith(before) && codePoints(after) === codePoints(before) + 1)) {
        assert.equal(applyKey(after, BACKSPACE), before, `${JSON.stringify(k)} after ${s}`);
      }
    }
  }
});

test('backspace: correcting a mistake mid-word gives the same text as typing it right the first time', () => {
  const wrong = type(['ग', 'च', VIRAMA, 'च']); // गच्च
  const fixed = type(['छ', 'त', 'इ'], applyKey(wrong, BACKSPACE));
  assert.equal(fixed, 'गच्छति');
  assert.equal(type(['आ'], type([BACKSPACE, BACKSPACE], 'रामेण')), 'रामा');
});

// ───────────────────────────── real words ─────────────────────────────

const WORDS: readonly string[] = [
  // a-stem masculine paradigm, including the final halanta forms
  'रामः', 'रामम्', 'रामेण', 'रामाय', 'रामात्', 'रामस्य', 'रामे', 'रामौ', 'रामाः', 'रामान्', 'रामैः', 'रामेभ्यः', 'रामाणाम्', 'रामेषु', 'रामाभ्याम्',
  // everyday nouns
  'घटः', 'मेघः', 'झटिति', 'मूढः', 'रथः', 'कथा', 'देवः', 'फलम्', 'फलानि', 'वनम्', 'नदी', 'नद्यः', 'नद्याम्', 'माता', 'पिता', 'भ्राता', 'गुरुः', 'गुरवः', 'कविः', 'कवयः', 'मतिः', 'मत्यै', 'मतये', 'मधु', 'वारि', 'पुस्तकम्', 'विद्यालयः', 'छात्रः', 'बालकः', 'बालिका',
  // verbs
  'गच्छति', 'गच्छन्ति', 'गच्छामि', 'पठति', 'लिखति', 'खादति', 'पिबति', 'अस्ति', 'सन्ति', 'भवति', 'करोति', 'कुर्वन्ति', 'पश्यति', 'शृणोति', 'जानाति', 'ददाति', 'तिष्ठति', 'इच्छति',
  // conjuncts: क्ष ज्ञ त्र श्र द्ध द्ध्य and longer clusters
  'क्षेत्रम्', 'क्षत्रियः', 'ज्ञानम्', 'विज्ञानम्', 'यज्ञः', 'त्रयः', 'पुत्रः', 'मित्रम्', 'शास्त्रम्', 'श्रीः', 'श्रद्धा', 'आश्रमः', 'बुद्धिः', 'शुद्ध्यति', 'बुद्ध्या', 'स्त्री', 'राष्ट्रम्', 'उष्ट्रः', 'लक्ष्मीः', 'कार्त्स्न्यम्', 'तत्त्वम्', 'उज्ज्वलः', 'ब्रह्म', 'चिह्नम्', 'आह्लादः', 'धर्मः', 'कर्म', 'सूर्यः', 'चन्द्रः',
  // final halanta consonants
  'वाक्', 'सम्राट्', 'तत्', 'जगत्', 'विद्वान्', 'भगवान्', 'राजन्', 'आत्मन्', 'मरुत्',
  // anusvāra and visarga, word-internal and final
  'संस्कृतम्', 'संयोगः', 'सिंहः', 'हंसः', 'अंशः', 'दुःखम्', 'अन्तःकरणम्', 'पुनः', 'प्रातः', 'मनःसु',
  // class nasals
  'सङ्ख्या', 'पञ्च', 'दण्डः', 'सन्धिः', 'सम्बन्धः', 'अङ्गम्',
  // ऋ / ॠ / ऌ signs; रु and रू
  'कृष्णः', 'कृतम्', 'गृहम्', 'मृगः', 'पितृभिः', 'हृदयम्', 'दृष्टिः', 'तृणम्', 'वृक्षः', 'पितॄन्', 'कॢप्तम्', 'रुद्रः', 'रूपम्', 'रुचिः',
  // avagraha
  'सोऽहम्', 'कोऽपि', 'रामोऽस्ति', 'तेऽपि',
  // every word-initial vowel
  'अहम्', 'आत्मा', 'इन्द्रः', 'ईश्वरः', 'उदकम्', 'ऊर्जा', 'ऋषिः', 'ऋतुः', 'एकः', 'ऐक्यम्', 'ओदनम्', 'औषधम्',
  // phrases (spaces, sentence sandhi with anusvāra, avagraha after a space)
  'सत्यमेव जयते', 'अहं गच्छामि', 'धर्मक्षेत्रे कुरुक्षेत्रे', 'बालकः पुस्तकं पठति', 'शिवो ऽहम्',
];

test('word list: at least 60 distinct, well-formed words covering every tricky class', () => {
  assert.ok(WORDS.length >= 60, `only ${WORDS.length} words`);
  assert.equal(new Set(WORDS).size, WORDS.length, 'duplicate word in the list');
  for (const w of WORDS) assert.deepEqual(validateDeva(w), { ok: true, errors: [] }, `${w} is not well-formed — fix the test data`);
  const all = WORDS.join(' ');
  for (const needle of ['क्ष', 'ज्ञ', 'त्र', 'श्र', 'द्ध्य', 'म्', 'ं', 'ः', 'कृ', 'रु', 'रू', 'ऽ', 'ॄ', 'ॢ', ...VOWEL_KEYS]) assert.ok(all.includes(needle), `no word exercises ${needle}`);
  for (const c of CONSONANTS) assert.ok(all.includes(c), `no word uses the consonant ${c}`);
});

test('keysFor: one key per code point, vowel signs mapped to their vowel key, and every key exists on the keyboard', () => {
  assert.deepEqual(keysFor('कि'), ['क', 'इ']);
  assert.deepEqual(keysFor('रामम्'), ['र', 'आ', 'म', 'म', '्']);
  assert.deepEqual(keysFor('सोऽहम्'), ['स', 'ओ', 'ऽ', 'ह', 'म', '्']);
  assert.deepEqual(keysFor('कृष्णः'), ['क', 'ऋ', 'ष', '्', 'ण', 'ः']);
  assert.deepEqual(keysFor('पितॄन्'), ['प', 'इ', 'त', 'ॠ', 'न', '्']);
  assert.deepEqual(keysFor('अहं गच्छामि'), ['अ', 'ह', 'ं', ' ', 'ग', 'च', '्', 'छ', 'आ', 'म', 'इ']);
  assert.deepEqual(keysFor(''), []);
  for (const w of WORDS) {
    const keys = keysFor(w);
    assert.equal(keys.length, codePoints(w), w);
    for (const k of keys) assert.ok(ALL_KEYS.includes(k), `${w}: key ${JSON.stringify(k)} is not on the keyboard`);
  }
});

test('typing every real word through keysFor reproduces it exactly, with well-formed text after every key press', () => {
  for (const w of WORDS) {
    let text = '';
    for (const k of keysFor(w)) {
      const next = applyKey(text, k);
      assert.notEqual(next, text, `${w}: key ${JSON.stringify(k)} was ignored after ${JSON.stringify(text)}`);
      text = next;
      assert.deepEqual(validateDeva(text).errors, [], `${w}: intermediate ${JSON.stringify(text)}`);
    }
    assert.equal(text, w);
    assert.equal(text.normalize('NFC'), text, `${w}: result must be NFC`);
    assert.equal(validateDeva(text).ok, true);
  }
});

test('every real word can be erased one code point at a time, staying well-formed until empty', () => {
  for (const w of WORDS) {
    let text = w;
    for (let n = codePoints(w); n > 0; n--) {
      assert.equal(codePoints(text), n, w);
      assert.ok(w.startsWith(text), `${w}: ${JSON.stringify(text)} is not a prefix`);
      assert.deepEqual(validateDeva(text).errors, [], `${w}: ${JSON.stringify(text)}`);
      text = applyKey(text, BACKSPACE);
    }
    assert.equal(text, '');
  }
});

test('erasing half a word and retyping the rest gives the word again', () => {
  for (const w of WORDS) {
    const keys = keysFor(w);
    const keep = Math.floor(keys.length / 2);
    let text = w;
    for (let i = keys.length; i > keep; i--) text = applyKey(text, BACKSPACE);
    assert.equal(type(keys.slice(keep), text), w, w);
  }
});

test('typing one word after another with a space gives the two-word phrase', () => {
  const rng = createRng(2026);
  for (let i = 0; i < 100; i++) {
    const [a, b] = [rng.pick(WORDS), rng.pick(WORDS)];
    const phrase = type([...keysFor(a), ' ', ...keysFor(b)]);
    assert.equal(phrase, `${a} ${b}`);
    assert.equal(validateDeva(phrase).ok, true, phrase);
  }
});

// ───────────────────────────── adversarial: random key mashing ─────────────────────────────

test('fuzz: 4 000 random key sequences never throw and never produce structurally malformed Devanagari', () => {
  const keys = [...ALL_KEYS, BACKSPACE, BACKSPACE, VIRAMA, VIRAMA, ANUSVARA, VISARGA, AVAGRAHA, ' ', ENTER];
  for (let seed = 1; seed <= 4000; seed++) {
    const rng = createRng(seed);
    let text = '';
    const pressed: string[] = [];
    for (let i = 0; i < 40; i++) {
      const k = rng.pick(keys);
      pressed.push(k);
      const next = applyKey(text, k);
      const delta = codePoints(next) - codePoints(text);
      assert.ok(delta >= -1 && delta <= 1, `seed ${seed}: one key changed the length by ${delta}`);
      text = next;
      if (text === '') continue;
      const errors = structuralErrors(text);
      if (errors.length) assert.fail(`seed ${seed}: keys ${JSON.stringify(pressed.join(' '))} produced ${JSON.stringify(text)} → ${errors.join('; ')}`);
      assert.ok(!text.startsWith(' ') && !text.includes('  '), `seed ${seed}: stray space in ${JSON.stringify(text)}`);
    }
  }
});

test('fuzz: every reachable two-key and three-key text is structurally well-formed (exhaustive)', () => {
  let checked = 0;
  for (const a of ALL_KEYS) {
    for (const b of ALL_KEYS) {
      const two = type([a, b]);
      if (two !== '') assert.deepEqual(structuralErrors(two), [], `${a} ${b} → ${two}`);
      for (const c of [VIRAMA, ANUSVARA, VISARGA, CANDRABINDU, AVAGRAHA, ' ', 'अ', 'इ', 'ऋ', 'क', 'र']) {
        const three = type([c], two);
        if (three !== '') assert.deepEqual(structuralErrors(three), [], `${a} ${b} ${c} → ${three}`);
        checked++;
      }
    }
  }
  assert.ok(checked > 25_000);
});

test('boundary: the keyboard lets a learner type the common misspelling श्रृ (it is a wrong answer, not an impossible key press)', () => {
  const misspelt = type(['श', VIRAMA, 'र', 'ऋ', 'ण', 'ओ', 'त', 'इ']);
  assert.equal(misspelt, 'श्रृणोति');
  assert.equal(validateDeva(misspelt).ok, false, 'validateDeva flags the spelling');
  assert.deepEqual(structuralErrors(misspelt), [], '…but the string is structurally sound');
  assert.equal(validateDeva(type(keysFor('शृणोति'))).ok, true);
});
