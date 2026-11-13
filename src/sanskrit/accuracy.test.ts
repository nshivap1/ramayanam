/**
 * Accuracy-risk regression suite.
 *
 * Implements the test cases of the "Accuracy-risk checklist — 25 ways Sanskrit
 * games go wrong" (research note sanskrit-data-and-curriculum.md, section 4)
 * that concern this library: script / encoding (risks 1–3, 6–7),
 * transliteration (8–9), sandhi (5, 10–15), ṇatva (16) and metre (23–24).
 * Risks 4 and 17–22, 25 are about answer matching, form generation and data
 * import, which live outside src/sanskrit.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aksharaParts,
  applyNatva,
  countAksharas,
  detectScheme,
  devaToIast,
  devaToSlp1,
  iastToDeva,
  identifyVerse,
  joinSandhiDeva,
  matchMeter,
  normalizeDeva,
  slp1ToDeva,
  splitAksharas,
  validateDeva,
  weights,
} from './index';

const natva = (deva: string): string => slp1ToDeva(applyNatva(devaToSlp1(deva)));

test('risk 1: split by akṣara, never by code point', () => {
  assert.equal([...'संस्कृतम्'].length, 9);
  // (the checklist lists the final म् separately; this library attaches a word-final halanta to its akṣara)
  assert.deepEqual(splitAksharas('संस्कृतम्'), ['सं', 'स्कृ', 'तम्']);
  assert.equal(countAksharas('संस्कृतम्'), 3);
  assert.equal([...'कार्त्स्न्यम्'].length, 13);
  assert.deepEqual(splitAksharas('कार्त्स्न्यम्'), ['का', 'र्त्स्न्यम्']);
  assert.equal(countAksharas('कार्त्स्न्यम्'), 2);
  assert.deepEqual(splitAksharas('क्षत्रियः'), ['क्ष', 'त्रि', 'यः']);
});

test('risk 2: normalisation — nukta letters and combining order', () => {
  assert.equal('\u0958'.normalize('NFC'), 'क\u093C');
  assert.equal('क्\u093C'.normalize('NFC'), 'क\u093C्');
  assert.equal(validateDeva('ज\u093C').ok, false);
  assert.equal(validateDeva('ज\u093C').ok, false);
  assert.equal(normalizeDeva('ज\u093C'), 'ज');
  assert.equal(validateDeva('कंि').ok, false);
  assert.equal(validateDeva('किं').ok, true);
});

test('risk 3: look-alike sequences that normalisation does not fix', () => {
  assert.notEqual('अा'.normalize('NFC'), 'आ');
  assert.equal(validateDeva('अाम').ok, false);
  assert.equal(validateDeva('आम').ok, true);
  assert.equal(validateDeva('काे').ok, false);
  assert.equal(validateDeva('को').ok, true);
  assert.equal(validateDeva('राम:').ok, false);
  assert.equal(validateDeva('रामः').ok, true);
  assert.equal(validateDeva('रामः |').ok, false);
  assert.equal(validateDeva('रामः ||').ok, false);
  assert.equal(validateDeva('रामः ।').ok, true);
  assert.equal(normalizeDeva('रामः ।।'), 'रामः ॥');
  assert.equal(validateDeva('श्लोकः 12').ok, false);
  assert.equal(validateDeva('श्लोकः १२').ok, true);
  assert.equal(validateDeva("सो'हम्").ok, false);
  assert.equal(validateDeva('सोऽहम्').ok, true);
});

test('risk 5: word-final m — anusvāra before a consonant, m before a vowel', () => {
  assert.equal(joinSandhiDeva('अहम्', 'गच्छामि').result, 'अहं गच्छामि');
  assert.equal(joinSandhiDeva('अहम्', 'अस्मि').result, 'अहमस्मि');
  assert.notEqual(joinSandhiDeva('अहम्', 'अस्मि').result, 'अहं अस्मि');
  assert.notEqual(joinSandhiDeva('अहं', 'अस्मि').result, 'अहं अस्मि');
});

test('risk 6: avagraha', () => {
  assert.equal(joinSandhiDeva('रामः', 'अत्र').result, 'रामोऽत्र');
  assert.equal(devaToIast('सोऽहम्'), "so'ham");
  assert.equal(iastToDeva("so'ham"), 'सोऽहम्');
  assert.equal(countAksharas('सोऽहम्'), 2);
  assert.equal(countAksharas('मा ते सङ्गोऽस्त्वकर्मणि'), 8);
});

test('risk 7: joiners, impossible clusters, and the real consonants of a conjunct', () => {
  assert.equal(validateDeva('क्\u200Dष').ok, false);
  assert.equal(validateDeva('क्\u200Cष').ok, false);
  assert.equal(normalizeDeva('क्\u200Dष'), 'क्ष');
  assert.equal(validateDeva('श्रृणोति').ok, false);
  assert.equal(validateDeva('शृणोति').ok, true);
  assert.equal(validateDeva('श्रृङ्गार').ok, false);
  assert.equal(validateDeva('शृङ्गार').ok, true);
  const consonants = (word: string): string[] => splitAksharas(word).flatMap((a) => [...aksharaParts(a).consonants, ...aksharaParts(a).finals]);
  assert.deepEqual(consonants('ज्ञानम्'), ['ज', 'ञ', 'न', 'म']);
  assert.deepEqual(consonants('क्षमा'), ['क', 'ष', 'म']);
});

test('risk 8: hiatus अइ / अउ is never confused with ऐ / औ', () => {
  for (const w of ['अइउण्', 'प्रउग', 'तितउ']) {
    assert.equal(iastToDeva(devaToIast(w)), w);
    assert.equal(slp1ToDeva(devaToSlp1(w)), w);
  }
  assert.notEqual(devaToIast('अइउण्'), 'aiuṇ');
  assert.equal(iastToDeva('aiuṇ'), 'ऐउण्');
});

test('risk 9: digraph ambiguity and scheme confusion', () => {
  assert.equal(iastToDeva('kṛṣṇa'), 'कृष्ण');
  assert.equal(iastToDeva('kruṣṇa'), 'क्रुष्ण');
  assert.notEqual(detectScheme('krishna'), 'iast');
  assert.notEqual(detectScheme('dhṛitarāśhtra'), 'iast');
  assert.notEqual(detectScheme('vruddhiraadaich'), 'iast');
  assert.equal(iastToDeva('ṛṣiḥ'), 'ऋषिः');
  assert.notEqual(iastToDeva('ruṣiḥ'), 'ऋषिः');
  assert.notEqual(iastToDeva('riṣiḥ'), 'ऋषिः');
  // explicit virāma + ह survives both SLP1 and IAST
  assert.equal(slp1ToDeva(devaToSlp1('अग्हि')), 'अग्हि');
  assert.equal(iastToDeva(devaToIast('अग्हि')), 'अग्हि');
  assert.equal(iastToDeva('aghi'), 'अघि');
  assert.equal(iastToDeva('saṃskṛta'), iastToDeva('saṁskṛta'));
  assert.equal(devaToIast('संस्कृत'), 'saṃskṛta');
});

test('risk 10: सः / एषः lose the visarga before any consonant', () => {
  assert.equal(joinSandhiDeva('सः', 'गच्छति').result, 'स गच्छति');
  assert.notEqual(joinSandhiDeva('सः', 'गच्छति').result, 'सो गच्छति');
  assert.equal(joinSandhiDeva('एषः', 'बालकः').result, 'एष बालकः');
  assert.equal(joinSandhiDeva('सः', 'अपि').result, 'सोऽपि');
  assert.equal(joinSandhiDeva('सः', 'इच्छति').result, 'स इच्छति');
});

test('risk 11: r-final words written with a visarga', () => {
  assert.equal(joinSandhiDeva('पुनः', 'अपि').result, 'पुनरपि');
  assert.notEqual(joinSandhiDeva('पुनः', 'अपि').result, 'पुनोऽपि');
  assert.equal(joinSandhiDeva('प्रातः', 'एव').result, 'प्रातरेव');
  assert.equal(joinSandhiDeva('अन्तः', 'गतः', { rFinal: true }).result, 'अन्तर्गतः');
  assert.equal(joinSandhiDeva('पितः', 'अत्र', { rFinal: true }).result, 'पितरत्र');
  assert.equal(joinSandhiDeva('पुनः', 'रमते').result, 'पुना रमते');
  // without the lexical flag the function cannot know, and says so
  assert.ok(joinSandhiDeva('पितः', 'अत्र').note?.includes('rFinal'));
});

test('risk 12: ordinary visarga sandhi traps', () => {
  const r = joinSandhiDeva('रामः', 'आगच्छति');
  assert.equal(r.result, 'राम आगच्छति');
  assert.equal(r.spaced, true); // must not be re-joined to रामागच्छति
  assert.equal(joinSandhiDeva('रामः', 'अस्ति').result, 'रामोऽस्ति');
  assert.equal(joinSandhiDeva('रामः', 'गच्छति').result, 'रामो गच्छति');
  assert.equal(joinSandhiDeva('रामाः', 'गच्छन्ति').result, 'रामा गच्छन्ति');
  assert.equal(joinSandhiDeva('हरिः', 'अस्ति').result, 'हरिरस्ति');
  assert.equal(joinSandhiDeva('हरिः', 'रमते').result, 'हरी रमते');
  assert.equal(joinSandhiDeva('रामः', 'च').result, 'रामश्च');
  assert.equal(joinSandhiDeva('रामः', 'तिष्ठति').result, 'रामस्तिष्ठति');
  assert.equal(joinSandhiDeva('रामः', 'करोति').result, 'रामः करोति');
  assert.equal(joinSandhiDeva('भोः', 'राम').result, 'भो राम');
  assert.equal(joinSandhiDeva('भोः', 'अच्युत').result, 'भो अच्युत');
});

test('risk 13: pragṛhya needs morphology, supplied as an option', () => {
  assert.equal(joinSandhiDeva('हरी', 'एतौ', { pragrhya: true }).result, 'हरी एतौ');
  assert.equal(joinSandhiDeva('माले', 'इमे', { pragrhya: true }).result, 'माले इमे');
  assert.equal(joinSandhiDeva('अमी', 'अश्वाः').result, 'अमी अश्वाः');
  assert.equal(joinSandhiDeva('ते', 'एव').result, 'त एव'); // masculine plural
  assert.equal(joinSandhiDeva('ते', 'एव', { pragrhya: true }).result, 'ते एव'); // feminine / neuter dual
});

test('risk 14: vowel-sandhi special cases', () => {
  assert.equal(joinSandhiDeva('महा', 'ऋषिः').result, 'महर्षिः');
  assert.equal(joinSandhiDeva('देव', 'इन्द्रः').result, 'देवेन्द्रः');
  assert.equal(joinSandhiDeva('इति', 'आदि').result, 'इत्यादि');
  assert.equal(joinSandhiDeva('उप', 'एति').result, 'उपैति');
  assert.equal(joinSandhiDeva('ते', 'अत्र').result, 'तेऽत्र');
  const v = joinSandhiDeva('विष्णो', 'इह');
  assert.deepEqual([v.result, ...v.alternatives.map((a) => a.result)], ['विष्ण इह', 'विष्णविह']);
  // upasarga + ṛ- / e-initial root (6.1.91, 6.1.94): not derivable from two strings — flagged, never silently wrong
  assert.ok(joinSandhiDeva('प्र', 'एजते').note?.includes('prejate'));
  assert.ok(joinSandhiDeva('प्र', 'ऋच्छति').note?.includes('prārcchati'));
});

test('risk 15: consonant sandhi — doubling, inserted sibilants, optional forms', () => {
  assert.equal(joinSandhiDeva('तस्मिन्', 'एव').result, 'तस्मिन्नेव');
  assert.equal(joinSandhiDeva('तान्', 'एव').result, 'तानेव');
  assert.equal(joinSandhiDeva('तान्', 'च').result, 'तांश्च');
  assert.equal(joinSandhiDeva('तान्', 'तान्').result, 'तांस्तान्');
  assert.equal(joinSandhiDeva('तान्', 'लोकान्').result, 'ताँल्लोकान्');
  assert.equal(joinSandhiDeva('तत्', 'च').result, 'तच्च');
  assert.equal(joinSandhiDeva('तत्', 'टीका').result, 'तट्टीका');
  assert.equal(joinSandhiDeva('तत्', 'लीनः').result, 'तल्लीनः');
  assert.equal(joinSandhiDeva('तत्', 'हितम्').result, 'तद्धितम्');
  const s = joinSandhiDeva('तत्', 'शिवः');
  assert.deepEqual([s.result, ...s.alternatives.map((a) => a.result)], ['तच्छिवः', 'तच्शिवः']);
  assert.equal(joinSandhiDeva('वाक्', 'मयम्').result, 'वाङ्मयम्');
  assert.equal(joinSandhiDeva('जगत्', 'नाथः').result, 'जगन्नाथः');
  assert.equal(joinSandhiDeva('वृक्ष', 'छाया').result, 'वृक्षच्छाया');
  assert.equal(joinSandhiDeva('तस्मिन्', 'इति').result, 'तस्मिन्निति');
  // sam + kṛta = saṃskṛta inserts s by a lexical rule (6.1.137): not generated, but flagged
  const k = joinSandhiDeva('सम्', 'कृतम्', { compound: true });
  assert.notEqual(k.result, 'संस्कृतम्');
  assert.ok(k.note?.includes('6.1.137'));
  assert.equal(joinSandhiDeva('सम्', 'स्कृतम्', { compound: true }).result, 'संस्कृतम्');
});

test('risk 16: ṇatva', () => {
  for (const [input, expected] of [
    ['रामेन', 'रामेण'], ['रामानाम्', 'रामाणाम्'], ['पुष्पेन', 'पुष्पेण'], ['पुष्पानि', 'पुष्पाणि'], ['पुष्पानाम्', 'पुष्पाणाम्'],
    ['हरिना', 'हरिणा'], ['गुरुना', 'गुरुणा'], ['नेतॄनाम्', 'नेतॄणाम्'], ['चतुर्नाम्', 'चतुर्णाम्'], ['कर्मना', 'कर्मणा'],
    ['ब्रह्मनि', 'ब्रह्मणि'], ['गृह्यमानः', 'गृह्यमाणः'], ['स्मर्यमानः', 'स्मर्यमाणः'], ['चोरयमानः', 'चोरयमाणः'],
    ['प्रनीय', 'प्रणीय'], ['प्रनम्य', 'प्रणम्य'],
  ] as const) {
    assert.equal(natva(input), expected, input);
  }
  for (const same of ['देवेन', 'देवानाम्', 'वनेन', 'वनानि', 'रथेन', 'अर्जुनेन', 'रसेन', 'दर्शनेन', 'रामान्', 'लभमानः', 'दीयमानः', 'आनीय']) {
    assert.equal(natva(same), same, same);
  }
});

test('risk 23: laghu / guru is decided across word boundaries', () => {
  assert.equal(weights('न त्वेवाहं जातु नासं'), 'GGGGGLGG');
  assert.equal(weights('धर्मक्षेत्रे कुरुक्षेत्रे'), 'GGGGLGGG');
  assert.equal(weights('कुरु'), 'LL');
  assert.equal(weights('रामः'), 'GG');
  assert.equal(weights('संस्कृतम्'), 'GLG');
  // spaces, daṇḍas, digits and avagraha do not count
  assert.equal(weights('धर्मक्षेत्रे कुरुक्षेत्रे ॥ १ ॥'), weights('धर्मक्षेत्रेकुरुक्षेत्रे'));
});

test('risk 24: pāda-final anceps, upajāti, and rule-based anuṣṭubh', () => {
  assert.equal(weights('वासांसि जीर्णानि यथा विहाय'), 'GGLGGLLGLGL');
  assert.equal(matchMeter(weights('वासांसि जीर्णानि यथा विहाय'))?.id, 'indravajra');
  const gita222 = ['वासांसि जीर्णानि यथा विहाय', 'नवानि गृह्णाति नरोऽपराणि', 'तथा शरीराणि विहाय जीर्णा', 'न्यन्यानि संयाति नवानि देही'];
  assert.equal(identifyVerse(gita222).kind, 'upajati');
  assert.equal(identifyVerse(['वागर्थाविव सम्पृक्तौ वागर्थप्रतिपत्तये । जगतः पितरौ वन्दे पार्वतीपरमेश्वरौ ॥']).kind, 'anustubh');
  assert.equal(weights('मा ते सङ्गोऽस्त्वकर्मणि'), 'GGGGLGLL');
  assert.equal(countAksharas('मा ते सङ्गोऽस्त्वकर्मणि'), 8);
});

test('public surface: everything the spec names is exported from index.ts', async () => {
  const api = (await import('./index')) as Record<string, unknown>;
  const functions = [
    'transliterate', 'devaToSlp1', 'slp1ToDeva', 'devaToIast', 'iastToDeva', 'slp1ToIast', 'iastToSlp1', 'detectScheme', 'normalizeDeva',
    'validateDeva', 'toDevaDigits', 'fromDevaDigits', 'splitAksharas', 'countAksharas', 'aksharaParts', 'composeAkshara', 'varna',
    'pratyahara', 'isSavarna', 'isVowel', 'isConsonant', 'joinSandhi', 'joinSandhiDeva', 'sandhiRule', 'applyNatva', 'scanLine', 'weights',
    'ganas', 'matchMeter', 'checkAnustubh', 'identifyVerse', 'cardinal', 'ordinal', 'cardinalVariants',
  ];
  for (const name of functions) assert.equal(typeof api[name], 'function', name);
  for (const name of ['VARNAS', 'SHIVA_SUTRAS', 'SANDHI_RULES', 'METERS', 'PRATYAHARA_NAMES']) assert.ok(Array.isArray(api[name]), name);
  assert.equal(typeof api['STHANA_NAMES'], 'object');
  // nothing internal leaks
  for (const name of Object.keys(api)) assert.ok(!name.startsWith('_'), name);
});
