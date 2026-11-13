import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SANDHI_RULES, applyNatva, joinSandhi, joinSandhiDeva, sandhiRule } from './sandhi';
import type { SandhiOptions } from './sandhi';
import { devaToSlp1, slp1ToDeva, validateDeva } from './translit';

test('registry: shape and metadata', () => {
  assert.ok(SANDHI_RULES.length >= 30);
  const ids = new Set<string>();
  for (const rule of SANDHI_RULES) {
    assert.ok(!ids.has(rule.id), `duplicate id ${rule.id}`);
    ids.add(rule.id);
    assert.match(rule.id, /^[a-z][a-z-]*$/);
    assert.ok(['svara', 'visarga', 'vyanjana'].includes(rule.family));
    assert.ok(validateDeva(rule.name.sa, { allowPunctuation: '(),' }).ok, `name.sa of ${rule.id}`);
    assert.ok(rule.name.iast.length > 0 && rule.name.en.length > 0);
    assert.ok(rule.sutra !== undefined, `${rule.id} has a sūtra`);
    assert.match(rule.sutra.ref, /^[1-8]\.[1-4]\.\d{1,3}$/);
    assert.ok(validateDeva(rule.sutra.text, { allowPunctuation: '≍' }).ok, `sūtra text of ${rule.id}: ${rule.sutra.text}`);
    assert.ok(rule.summary.length > 20 && !rule.summary.includes('\n'));
    assert.ok(rule.examples.length >= 3, `${rule.id} has ≥ 3 examples`);
    assert.equal(sandhiRule(rule.id), rule);
  }
  assert.equal(sandhiRule('no-such-rule'), undefined);
  assert.equal(sandhiRule('guna')?.sutra?.ref, '6.1.87');
});

test('registry is self-verifying: every example goes through joinSandhiDeva', () => {
  for (const rule of SANDHI_RULES) {
    for (const ex of rule.examples) {
      for (const part of [ex.first, ex.second, ex.result]) assert.ok(validateDeva(part).ok, `${rule.id}: ${part}`);
      const r = joinSandhiDeva(ex.first, ex.second, ex.options);
      const label = `${rule.id}: ${ex.first} + ${ex.second}`;
      if (ex.alternative === true) {
        const alt = r.alternatives.find((a) => a.ruleId === rule.id);
        assert.ok(alt !== undefined, `${label} offers the alternative`);
        assert.equal(alt.result, ex.result, label);
        assert.notEqual(r.result, ex.result, label);
      } else {
        assert.equal(r.result, ex.result, label);
        assert.equal(r.ruleId, rule.id, label);
        assert.equal(r.special, undefined, `${label} must not be flagged as an unhandled special`);
      }
    }
  }
});

test('registry: no counterexample is attributed to its rule', () => {
  for (const rule of SANDHI_RULES) {
    for (const ce of rule.counterexamples ?? []) {
      const r = joinSandhiDeva(ce.first, ce.second, ce.options);
      assert.notEqual(r.ruleId, rule.id, `${rule.id} must not apply to ${ce.first} + ${ce.second}`);
      assert.ok(ce.note.length > 0);
    }
  }
});

test('registry: every implemented ruleId is documented, and every rule is reachable', () => {
  const produced = new Set<string>();
  for (const rule of SANDHI_RULES) {
    for (const ex of rule.examples) {
      const r = joinSandhiDeva(ex.first, ex.second, ex.options);
      if (r.ruleId !== null) produced.add(r.ruleId);
      for (const a of r.alternatives) produced.add(a.ruleId);
    }
  }
  for (const id of produced) assert.ok(sandhiRule(id) !== undefined, `undocumented rule id ${id}`);
  for (const rule of SANDHI_RULES) assert.ok(produced.has(rule.id), `rule ${rule.id} is never produced`);
});

type Case = [first: string, second: string, result: string, opts?: SandhiOptions];
const C: SandhiOptions = { compound: true };
const I: SandhiOptions = { internal: true };
const R: SandhiOptions = { rFinal: true };
const P: SandhiOptions = { pragrhya: true };

/** Independent textbook cases, grouped by the rule that must fire (`none` = no rule). */
const CASES: Record<string, Case[]> = {
  'savarna-dirgha': [
    ['देव', 'आलयः', 'देवालयः'], ['हिम', 'आलयः', 'हिमालयः'], ['विद्या', 'आलयः', 'विद्यालयः'], ['रत्न', 'आकरः', 'रत्नाकरः'],
    ['दया', 'आनन्दः', 'दयानन्दः'], ['मुनि', 'इन्द्रः', 'मुनीन्द्रः'], ['गिरि', 'ईशः', 'गिरीशः'], ['रवि', 'इन्द्रः', 'रवीन्द्रः'],
    ['नदी', 'ईशः', 'नदीशः'], ['गुरु', 'उपदेशः', 'गुरूपदेशः'], ['लघु', 'ऊर्मिः', 'लघूर्मिः'], ['वधू', 'उत्सवः', 'वधूत्सवः'],
    ['होतृ', 'ऋकारः', 'होतॄकारः'], ['च', 'अपि', 'चापि'], ['तथा', 'अपि', 'तथापि'], ['न', 'अस्ति', 'नास्ति'],
    ['अत्र', 'आगच्छ', 'अत्रागच्छ'], ['अपि', 'इदम्', 'अपीदम्'], ['साधु', 'उक्तम्', 'साधूक्तम्'], ['श्री', 'ईशः', 'श्रीशः'],
    ['सु', 'उक्तिः', 'सूक्तिः'], ['परम', 'अर्थः', 'परमार्थः'], ['महा', 'आत्मा', 'महात्मा'],
  ],
  guna: [
    ['सूर्य', 'उदयः', 'सूर्योदयः'], ['महा', 'ऋषिः', 'महर्षिः'], ['सुर', 'इन्द्रः', 'सुरेन्द्रः'], ['नर', 'ईशः', 'नरेशः'],
    ['रमा', 'ईशः', 'रमेशः'], ['महा', 'इन्द्रः', 'महेन्द्रः'], ['पर', 'उपकारः', 'परोपकारः'], ['हित', 'उपदेशः', 'हितोपदेशः'],
    ['गङ्गा', 'उदकम्', 'गङ्गोदकम्'], ['महा', 'ऊर्मिः', 'महोर्मिः'], ['देव', 'ऋषिः', 'देवर्षिः'], ['सप्त', 'ऋषयः', 'सप्तर्षयः'],
    ['राज', 'ऋषिः', 'राजर्षिः'], ['ब्रह्म', 'ऋषिः', 'ब्रह्मर्षिः'], ['न', 'इति', 'नेति'], ['च', 'इति', 'चेति'],
    ['यथा', 'उक्तम्', 'यथोक्तम्'], ['उप', 'इन्द्रः', 'उपेन्द्रः'], ['तव', 'इदम्', 'तवेदम्'], ['नील', 'उत्पलम्', 'नीलोत्पलम्'],
  ],
  vrddhi: [
    ['सदा', 'एव', 'सदैव'], ['अद्य', 'एव', 'अद्यैव'], ['तथा', 'एव', 'तथैव'], ['मम', 'एव', 'ममैव'],
    ['जन', 'एकता', 'जनैकता'], ['मत', 'ऐक्यम्', 'मतैक्यम्'], ['महा', 'ऐश्वर्यम्', 'महैश्वर्यम्'], ['वन', 'ओषधिः', 'वनौषधिः'],
    ['जल', 'ओघः', 'जलौघः'], ['परम', 'औषधम्', 'परमौषधम्'], ['महा', 'औषधम्', 'महौषधम्'], ['न', 'एव', 'नैव'],
    ['च', 'एव', 'चैव'], ['गङ्गा', 'ओघः', 'गङ्गौघः'], ['उप', 'एति', 'उपैति'],
  ],
  yan: [
    ['इति', 'आदि', 'इत्यादि'], ['सु', 'आगतम्', 'स्वागतम्'], ['पितृ', 'आज्ञा', 'पित्राज्ञा'], ['प्रति', 'उत्तरम्', 'प्रत्युत्तरम्'],
    ['अति', 'अन्तम्', 'अत्यन्तम्'], ['अति', 'आचारः', 'अत्याचारः'], ['इति', 'अपि', 'इत्यपि'], ['नदी', 'अत्र', 'नद्यत्र'],
    ['देवी', 'आगमनम्', 'देव्यागमनम्'], ['अनु', 'अयः', 'अन्वयः'], ['सु', 'अस्ति', 'स्वस्ति'], ['गुरु', 'आदेशः', 'गुर्वादेशः'],
    ['मनु', 'अन्तरम्', 'मन्वन्तरम्'], ['वधू', 'आगमनम्', 'वध्वागमनम्'], ['मातृ', 'आदेशः', 'मात्रादेशः'], ['धातृ', 'अंशः', 'धात्रंशः'],
    ['पितृ', 'इच्छा', 'पित्रिच्छा'], ['खलु', 'एषः', 'खल्वेषः'], ['अस्ति', 'एव', 'अस्त्येव'], ['दधि', 'अत्र', 'दध्यत्र'],
    ['मधु', 'इदम्', 'मध्विदम्'], ['अभि', 'उदयः', 'अभ्युदयः'], ['प्रति', 'अक्षम्', 'प्रत्यक्षम्'], ['सुधी', 'उपास्यः', 'सुध्युपास्यः'],
  ],
  ayadi: [
    ['ने', 'अनम्', 'नयनम्', I], ['पौ', 'अकः', 'पावकः'], ['शे', 'अनम्', 'शयनम्', I], ['चे', 'अनम्', 'चयनम्', I],
    ['गै', 'अकः', 'गायकः', I], ['पो', 'अनः', 'पवनः', I], ['पो', 'इत्रम्', 'पवित्रम्', I], ['भौ', 'उकः', 'भावुकः', I],
    ['नौ', 'इकः', 'नाविकः'], ['हरे', 'ए', 'हरये', I], ['विष्णो', 'ए', 'विष्णवे', I], ['भो', 'अति', 'भवति', I],
    ['उभौ', 'अपि', 'उभावपि'], ['द्वौ', 'एव', 'द्वावेव'], ['तौ', 'इति', 'ताविति'], ['बालौ', 'आगच्छतः', 'बालावागच्छतः'],
    ['गुरौ', 'उत्कः', 'गुरावुत्कः'],
  ],
  purvarupa: [
    ['ते', 'अत्र', 'तेऽत्र'], ['गृहे', 'अस्मिन्', 'गृहेऽस्मिन्'], ['गुरो', 'अत्र', 'गुरोऽत्र'], ['लोके', 'अस्मिन्', 'लोकेऽस्मिन्'],
  ],
  'yava-lopa': [
    ['वने', 'इह', 'वन इह'], ['ते', 'आगताः', 'त आगताः'], ['ते', 'उक्तवन्तः', 'त उक्तवन्तः'], ['गृहे', 'एव', 'गृह एव'],
    ['श्रियै', 'उद्यतः', 'श्रिया उद्यतः'], ['ते', 'एव', 'त एव'],
  ],
  pragrhya: [
    ['हरी', 'एतौ', 'हरी एतौ', P], ['माले', 'इमे', 'माले इमे', P], ['ते', 'एव', 'ते एव', P], ['अमी', 'अश्वाः', 'अमी अश्वाः'],
    ['अमू', 'आसाते', 'अमू आसाते'], ['साधू', 'इमौ', 'साधू इमौ', P],
  ],
  'visarga-o-avagraha': [
    ['रामः', 'अपि', 'रामोऽपि'], ['रामः', 'अत्र', 'रामोऽत्र'], ['रामः', 'अस्ति', 'रामोऽस्ति'], ['बालः', 'अत्र', 'बालोऽत्र'],
    ['देवः', 'अयम्', 'देवोऽयम्'], ['कः', 'अयम्', 'कोऽयम्'], ['सः', 'अयम्', 'सोऽयम्'], ['सः', 'अपि', 'सोऽपि'],
    ['एषः', 'अस्ति', 'एषोऽस्ति'], ['मनः', 'अनुकूलम्', 'मनोऽनुकूलम्'], ['यशः', 'अभिलाषी', 'यशोऽभिलाषी'],
  ],
  'visarga-o': [
    ['रामः', 'गच्छति', 'रामो गच्छति'], ['नरः', 'गच्छति', 'नरो गच्छति'], ['कः', 'वदति', 'को वदति'], ['छात्रः', 'लिखति', 'छात्रो लिखति'],
    ['अश्वः', 'धावति', 'अश्वो धावति'], ['सूर्यः', 'भाति', 'सूर्यो भाति'], ['मृगः', 'न', 'मृगो न'], ['रामः', 'जयति', 'रामो जयति'],
    ['पुत्रः', 'यच्छति', 'पुत्रो यच्छति'], ['रामः', 'राजते', 'रामो राजते'], ['मनः', 'हरः', 'मनोहरः', C], ['यशः', 'दा', 'यशोदा', C],
    ['तपः', 'बलम्', 'तपोबलम्', C], ['पयः', 'धरः', 'पयोधरः', C], ['सरः', 'जम्', 'सरोजम्', C], ['अधः', 'गतिः', 'अधोगतिः', C],
    ['तेजः', 'मयः', 'तेजोमयः', C], ['शिरः', 'मणिः', 'शिरोमणिः', C],
  ],
  'visarga-lopa-a': [
    ['रामः', 'इति', 'राम इति'], ['रामः', 'आगच्छति', 'राम आगच्छति'], ['कः', 'इह', 'क इह'], ['नरः', 'उवाच', 'नर उवाच'],
    ['अर्जुनः', 'उवाच', 'अर्जुन उवाच'], ['सञ्जयः', 'उवाच', 'सञ्जय उवाच'], ['एषः', 'एव', 'एष एव'], ['सः', 'इति', 'स इति'],
    ['सः', 'एव', 'स एव'], ['सः', 'इच्छति', 'स इच्छति'],
  ],
  'visarga-lopa-aa': [
    ['देवाः', 'गच्छन्ति', 'देवा गच्छन्ति'], ['रामाः', 'गच्छन्ति', 'रामा गच्छन्ति'], ['बालाः', 'गच्छन्ति', 'बाला गच्छन्ति'],
    ['नराः', 'वदन्ति', 'नरा वदन्ति'], ['छात्राः', 'अत्र', 'छात्रा अत्र'], ['कन्याः', 'आगच्छन्ति', 'कन्या आगच्छन्ति'], ['ताः', 'एव', 'ता एव'],
    ['देवाः', 'रक्षन्ति', 'देवा रक्षन्ति'],
  ],
  'visarga-rutva': [
    ['हरिः', 'अत्र', 'हरिरत्र'], ['हरिः', 'अस्ति', 'हरिरस्ति'], ['अग्निः', 'अत्र', 'अग्निरत्र'], ['कविः', 'अयम्', 'कविरयम्'],
    ['विष्णुः', 'इति', 'विष्णुरिति'], ['भानुः', 'उदेति', 'भानुरुदेति'], ['मतिः', 'मम', 'मतिर्मम'], ['गुरुः', 'ब्रह्मा', 'गुरुर्ब्रह्मा'],
    ['गुरुः', 'विष्णुः', 'गुरुर्विष्णुः'], ['गुरुः', 'देवः', 'गुरुर्देवः'], ['वायुः', 'वाति', 'वायुर्वाति'], ['हरेः', 'इच्छा', 'हरेरिच्छा'],
    ['गुरोः', 'आज्ञा', 'गुरोराज्ञा'], ['नौः', 'इयम्', 'नौरियम्'], ['देवैः', 'अपि', 'देवैरपि'], ['तैः', 'उक्तम्', 'तैरुक्तम्'],
    ['निः', 'आशा', 'निराशा'], ['दुः', 'आत्मा', 'दुरात्मा'], ['निः', 'गुणः', 'निर्गुणः'], ['दुः', 'जनः', 'दुर्जनः'],
    ['निः', 'धनः', 'निर्धनः'], ['दुः', 'गन्धः', 'दुर्गन्धः'], ['निः', 'बलः', 'निर्बलः'], ['दुः', 'लभः', 'दुर्लभः'],
    ['निः', 'मलः', 'निर्मलः'], ['बहिः', 'गच्छति', 'बहिर्गच्छति'], ['आविः', 'भवति', 'आविर्भवति'], ['धनुः', 'धरः', 'धनुर्धरः'],
    ['आयुः', 'वेदः', 'आयुर्वेदः'], ['यजुः', 'वेदः', 'यजुर्वेदः'], ['ज्योतिः', 'मयः', 'ज्योतिर्मयः'], ['आशीः', 'वादः', 'आशीर्वादः'],
    ['चतुः', 'भुजः', 'चतुर्भुजः'], ['चतुः', 'आननः', 'चतुराननः'],
  ],
  'visarga-satva': [
    ['रामः', 'च', 'रामश्च'], ['रामः', 'तिष्ठति', 'रामस्तिष्ठति'], ['अग्निः', 'च', 'अग्निश्च'], ['देवाः', 'च', 'देवाश्च'],
    ['बालः', 'चलति', 'बालश्चलति'], ['नराः', 'तत्र', 'नरास्तत्र'], ['कः', 'तत्र', 'कस्तत्र'], ['इतः', 'ततः', 'इतस्ततः'],
    ['मनः', 'तापः', 'मनस्तापः'], ['पूर्णः', 'चन्द्रः', 'पूर्णश्चन्द्रः'], ['वृक्षः', 'छायाम्', 'वृक्षश्छायाम्'], ['पुनः', 'तत्र', 'पुनस्तत्र'],
    ['निः', 'चयः', 'निश्चयः'], ['दुः', 'चरित्रम्', 'दुश्चरित्रम्'], ['निः', 'तारः', 'निस्तारः'], ['दुः', 'तरः', 'दुस्तरः'],
  ],
  'visarga-kupvoh': [
    ['रामः', 'करोति', 'रामः करोति'], ['बालः', 'खादति', 'बालः खादति'], ['गुरुः', 'पठति', 'गुरुः पठति'], ['नराः', 'कुर्वन्ति', 'नराः कुर्वन्ति'],
    ['रामः', 'फलम्', 'रामः फलम्'], ['कः', 'कः', 'कः कः'], ['पुनः', 'पुनः', 'पुनः पुनः'], ['दुः', 'खम्', 'दुःखम्', C],
    ['भोः', 'कृष्ण', 'भोः कृष्ण'],
  ],
  'visarga-shari': [['नमः', 'शिवाय', 'नमः शिवाय'], ['बालः', 'सीदति', 'बालः सीदति'], ['कः', 'शेते', 'कः शेते']],
  'visarga-sah-esah': [
    ['सः', 'गच्छति', 'स गच्छति'], ['सः', 'पठति', 'स पठति'], ['सः', 'वदति', 'स वदति'], ['एषः', 'गच्छति', 'एष गच्छति'],
    ['एषः', 'बालकः', 'एष बालकः'], ['एषः', 'तिष्ठति', 'एष तिष्ठति'], ['सः', 'चलति', 'स चलति'],
  ],
  'visarga-r-final': [
    ['पुनः', 'अपि', 'पुनरपि'], ['प्रातः', 'एव', 'प्रातरेव'], ['पुनः', 'आगच्छति', 'पुनरागच्छति'], ['पुनः', 'गच्छति', 'पुनर्गच्छति'],
    ['पुनः', 'उक्तिः', 'पुनरुक्तिः'], ['प्रातः', 'आशः', 'प्रातराशः'], ['पितः', 'अत्र', 'पितरत्र', R], ['मातः', 'इह', 'मातरिह', R],
    ['अन्तः', 'धानम्', 'अन्तर्धानम्', R], ['अन्तः', 'गतः', 'अन्तर्गतः', R],
  ],
  'r-lopa-dirgha': [
    ['हरिः', 'रमते', 'हरी रमते'], ['भानुः', 'राजते', 'भानू राजते'], ['पुनः', 'रमते', 'पुना रमते'], ['निः', 'रवः', 'नीरवः', C],
    ['निः', 'रजः', 'नीरजः', C], ['अन्तः', 'राष्ट्रियः', 'अन्ताराष्ट्रियः', { rFinal: true, compound: true }],
  ],
  'visarga-bhoh': [['भोः', 'राम', 'भो राम'], ['भोः', 'अच्युत', 'भो अच्युत'], ['भोः', 'भोः', 'भो भोः']],
  'visarga-shatva': [
    ['निः', 'पापः', 'निष्पापः'], ['दुः', 'करः', 'दुष्करः'], ['निः', 'कलङ्कः', 'निष्कलङ्कः'], ['दुः', 'कर्म', 'दुष्कर्म'],
    ['निः', 'कपटः', 'निष्कपटः'], ['चतुः', 'कोणः', 'चतुष्कोणः'],
  ],
  jashtva: [
    ['वाक्', 'ईशः', 'वागीशः'], ['तत्', 'अपि', 'तदपि'], ['एतत्', 'अस्ति', 'एतदस्ति'], ['यत्', 'इच्छसि', 'यदिच्छसि'],
    ['तत्', 'उक्तम्', 'तदुक्तम्'], ['सत्', 'आनन्दः', 'सदानन्दः'], ['जगत्', 'अम्बा', 'जगदम्बा'], ['वाक्', 'दानम्', 'वाग्दानम्'],
    ['वाक्', 'देवी', 'वाग्देवी'], ['दिक्', 'अम्बरः', 'दिगम्बरः'], ['दिक्', 'अन्तः', 'दिगन्तः'], ['षट्', 'दर्शनम्', 'षड्दर्शनम्'],
    ['षट्', 'अङ्गम्', 'षडङ्गम्'], ['षट्', 'रिपवः', 'षड्रिपवः'], ['सुप्', 'अन्तः', 'सुबन्तः'], ['तत्', 'गतम्', 'तद्गतम्'],
    ['तत्', 'धनम्', 'तद्धनम्'], ['यत्', 'यत्', 'यद्यत्'], ['तत्', 'वनम्', 'तद्वनम्'], ['उत्', 'योगः', 'उद्योगः'],
    ['सत्', 'भावः', 'सद्भावः'], ['तत्', 'रूपम्', 'तद्रूपम्'], ['भगवत्', 'भक्तिः', 'भगवद्भक्तिः'], ['महत्', 'दानम्', 'महद्दानम्'],
    ['सत्', 'गतिः', 'सद्गतिः'], ['उत्', 'गमः', 'उद्गमः'], ['विद्युत्', 'वेगः', 'विद्युद्वेगः'], ['चित्', 'आनन्दः', 'चिदानन्दः'],
    ['सत्', 'आचारः', 'सदाचारः'], ['तद्', 'एव', 'तदेव'],
  ],
  cartva: [['उद्', 'पन्नः', 'उत्पन्नः'], ['तद्', 'कालः', 'तत्कालः'], ['वाग्', 'पतिः', 'वाक्पतिः']],
  shcutva: [
    ['सत्', 'चित्', 'सच्चित्'], ['सत्', 'जनः', 'सज्जनः'], ['तत्', 'चित्रम्', 'तच्चित्रम्'], ['उत्', 'चारणम्', 'उच्चारणम्'],
    ['सत्', 'चरित्रम्', 'सच्चरित्रम्'], ['तत्', 'छाया', 'तच्छाया'], ['उत्', 'छेदः', 'उच्छेदः'], ['यावत्', 'जीवम्', 'यावज्जीवम्'],
    ['तत्', 'जलम्', 'तज्जलम्'], ['विपत्', 'जालम्', 'विपज्जालम्'], ['जगत्', 'जननी', 'जगज्जननी'], ['भवान्', 'जानाति', 'भवाञ्जानाति'],
    ['एतान्', 'जनान्', 'एताञ्जनान्'], ['तान्', 'शत्रून्', 'ताञ्शत्रून्'],
  ],
  shtutva: [
    ['तत्', 'टीका', 'तट्टीका'], ['तत्', 'ठक्कुरः', 'तट्ठक्कुरः'], ['तत्', 'डमरुः', 'तड्डमरुः'], ['तत्', 'ढक्का', 'तड्ढक्का'],
    ['महान्', 'डमरुः', 'महाण्डमरुः'],
  ],
  'parasavarna-l': [
    ['तत्', 'लीनः', 'तल्लीनः'], ['उत्', 'लासः', 'उल्लासः'], ['उत्', 'लङ्घनम्', 'उल्लङ्घनम्'], ['विद्युत्', 'लेखा', 'विद्युल्लेखा'],
    ['जगत्', 'लयः', 'जगल्लयः'], ['महान्', 'लाभः', 'महाँल्लाभः'], ['अस्मिन्', 'लोके', 'अस्मिँल्लोके'],
  ],
  chatva: [
    ['तत्', 'शिवः', 'तच्छिवः'], ['तत्', 'शरीरम्', 'तच्छरीरम्'], ['उत्', 'शिष्टम्', 'उच्छिष्टम्'], ['सत्', 'शीलः', 'सच्छीलः'],
    ['श्रीमत्', 'शरत्', 'श्रीमच्छरत्'],
  ],
  anunasika: [
    ['जगत्', 'नाथः', 'जगन्नाथः'], ['तत्', 'न', 'तन्न'], ['तत्', 'नाम', 'तन्नाम'], ['एतत्', 'मम', 'एतन्मम'],
    ['उत्', 'मेषः', 'उन्मेषः'], ['सत्', 'मतिः', 'सन्मतिः'], ['उत्', 'नयनम्', 'उन्नयनम्'], ['षट्', 'मुखः', 'षण्मुखः'],
    ['दिक्', 'मण्डलम्', 'दिङ्मण्डलम्'], ['वाक्', 'निपुणः', 'वाङ्निपुणः'], ['प्राक्', 'मुखः', 'प्राङ्मुखः'], ['अप्', 'मयम्', 'अम्मयम्'],
    ['षट्', 'नवतिः', 'षण्णवतिः'], ['चित्', 'मयम्', 'चिन्मयम्'], ['उत्', 'नतिः', 'उन्नतिः'],
  ],
  'purvasavarna-h': [
    ['तत्', 'हविः', 'तद्धविः'], ['उत्', 'हतः', 'उद्धतः'], ['वाक्', 'हीनः', 'वाग्घीनः'], ['षट्', 'हलानि', 'षड्ढलानि'],
    ['उत्', 'हरणम्', 'उद्धरणम्'], ['तत्', 'हि', 'तद्धि'], ['वाक्', 'हरि', 'वाग्घरि'],
  ],
  'udah-stha': [['उद्', 'स्थानम्', 'उत्थानम्'], ['उत्', 'स्थितिः', 'उत्थितिः'], ['उत्', 'स्तब्धः', 'उत्तब्धः']],
  anusvara: [
    ['अहम्', 'गच्छामि', 'अहं गच्छामि'], ['किम्', 'करोषि', 'किं करोषि'], ['वनम्', 'गच्छामि', 'वनं गच्छामि'], ['फलम्', 'खादति', 'फलं खादति'],
    ['त्वम्', 'पठसि', 'त्वं पठसि'], ['अहम्', 'हसामि', 'अहं हसामि'], ['तम्', 'शिष्यम्', 'तं शिष्यम्'], ['कार्यम्', 'साधयति', 'कार्यं साधयति'],
    ['रामम्', 'रक्ष', 'रामं रक्ष'], ['सम्', 'कल्पः', 'संकल्पः', C], ['सम्', 'योगः', 'संयोगः', C], ['सम्', 'हारः', 'संहारः', C],
    ['सम्', 'सारः', 'संसारः', C], ['सम्', 'वादः', 'संवादः', C], ['सम्', 'रक्षणम्', 'संरक्षणम्', C], ['सम्', 'लापः', 'संलापः', C],
    ['सम्', 'शयः', 'संशयः', C], ['सम्', 'स्कृतम्', 'संस्कृतम्', C], ['अहं', 'गच्छामि', 'अहं गच्छामि'],
  ],
  'n-rutva': [
    ['कस्मिन्', 'चित्', 'कस्मिंश्चित्'], ['तान्', 'तान्', 'तांस्तान्'], ['तान्', 'च', 'तांश्च'], ['भवान्', 'चलति', 'भवांश्चलति'],
    ['तान्', 'छात्रान्', 'तांश्छात्रान्'], ['अस्मिन्', 'तु', 'अस्मिंस्तु'], ['कान्', 'चित्', 'कांश्चित्'], ['बालकान्', 'च', 'बालकांश्च'],
    ['हसन्', 'तरति', 'हसंस्तरति'], ['एतान्', 'टीकते', 'एतांष्टीकते'], ['भवान्', 'तत्र', 'भवांस्तत्र'],
  ],
  namut: [
    ['तस्मिन्', 'एव', 'तस्मिन्नेव'], ['तस्मिन्', 'इति', 'तस्मिन्निति'], ['अस्मिन्', 'एव', 'अस्मिन्नेव'], ['पठन्', 'अपि', 'पठन्नपि'],
    ['राजन्', 'इह', 'राजन्निह'], ['हसन्', 'आगच्छति', 'हसन्नागच्छति'], ['प्रत्यङ्', 'आस्ते', 'प्रत्यङ्ङास्ते'], ['कुर्वन्', 'अपि', 'कुर्वन्नपि'],
  ],
  tuk: [
    ['वृक्ष', 'छाया', 'वृक्षच्छाया'], ['शिव', 'छाया', 'शिवच्छाया'], ['अनु', 'छेदः', 'अनुच्छेदः'], ['परि', 'छेदः', 'परिच्छेदः'],
    ['गृह', 'छिद्रम्', 'गृहच्छिद्रम्'], ['अव', 'छेदः', 'अवच्छेदः'], ['आ', 'छन्नः', 'आच्छन्नः'],
  ],
  none: [
    ['राम', 'गच्छ', 'राम गच्छ'], ['नदी', 'वहति', 'नदी वहति'], ['हरे', 'कृष्ण', 'हरे कृष्ण'], ['साधु', 'वदति', 'साधु वदति'],
    ['अहम्', 'अस्मि', 'अहमस्मि'], ['अहम्', 'अत्र', 'अहमत्र'], ['त्वम्', 'एव', 'त्वमेव'], ['किम्', 'इदम्', 'किमिदम्'],
    ['इदम्', 'उक्तम्', 'इदमुक्तम्'], ['कथम्', 'अपि', 'कथमपि'], ['एवम्', 'एव', 'एवमेव'], ['तान्', 'एव', 'तानेव'],
    ['तान्', 'अपि', 'तानपि'], ['बालान्', 'अपि', 'बालानपि'], ['विद्वान्', 'अस्ति', 'विद्वानस्ति'], ['महान्', 'आत्मा', 'महानात्मा'],
    ['भवान्', 'गच्छति', 'भवान्गच्छति'], ['तान्', 'पश्यति', 'तान्पश्यति'], ['तत्', 'कालः', 'तत्कालः'], ['तत्', 'परः', 'तत्परः'],
    ['सत्', 'पुत्रः', 'सत्पुत्रः'], ['उत्', 'साहः', 'उत्साहः'], ['वाक्', 'पतिः', 'वाक्पतिः'], ['दिक्', 'पालः', 'दिक्पालः'],
    ['षट्', 'पदः', 'षट्पदः'], ['तत्', 'त्वम्', 'तत्त्वम्'], ['तत्', 'पुस्तकम्', 'तत्पुस्तकम्'], ['सम्', 'राट्', 'सम्राट्'],
    ['कः', 'त्सरुः', 'कः त्सरुः'],
  ],
};

test('≥ 300 independent textbook cases, each with the rule that must fire', () => {
  let n = 0;
  for (const [ruleId, cases] of Object.entries(CASES)) {
    if (ruleId !== 'none') assert.ok(sandhiRule(ruleId) !== undefined, `unknown rule id in test table: ${ruleId}`);
    for (const [first, second, result, opts] of cases) {
      const r = joinSandhiDeva(first, second, opts);
      const label = `${first} + ${second}`;
      assert.equal(r.result, result, label);
      assert.equal(r.ruleId, ruleId === 'none' ? null : ruleId, label);
      n += 1;
    }
  }
  assert.ok(n >= 300, `only ${n} cases`);
});

test('result invariants over all cases: spaced / changed / SLP1 parity', () => {
  for (const cases of Object.values(CASES)) {
    for (const [first, second, , opts] of cases) {
      const d = joinSandhiDeva(first, second, opts);
      const s = joinSandhi(devaToSlp1(first), devaToSlp1(second), opts);
      assert.equal(slp1ToDeva(s.result), d.result);
      assert.equal(s.ruleId, d.ruleId);
      assert.equal(d.spaced, d.result.includes(' '));
      assert.equal(s.spaced, s.result.includes(' '));
      assert.ok((s.result.match(/ /g) ?? []).length <= 1);
      const f = devaToSlp1(first).replace(/M$/, 'm');
      assert.equal(s.changed, s.result.replace(' ', '') !== f + devaToSlp1(second));
      if (s.ruleId === null) assert.equal(s.changed, false, `${first} + ${second}: no rule ⇒ unchanged`);
      assert.ok(validateDeva(d.result).ok, d.result);
      for (const a of d.alternatives) {
        assert.ok(validateDeva(a.result).ok, a.result);
        assert.notEqual(a.result, d.result);
        assert.equal(a.spaced, a.result.includes(' '));
        assert.ok(sandhiRule(a.ruleId) !== undefined);
      }
    }
  }
});

test('"stays as it is" rules report changed: false', () => {
  for (const [a, b] of [['रामः', 'करोति'], ['हरिः', 'शेते'], ['अमी', 'ईशाः']] as const) {
    const r = joinSandhiDeva(a, b);
    assert.equal(r.changed, false);
    assert.equal(r.spaced, true);
    assert.notEqual(r.ruleId, null);
    assert.equal(r.result, `${a} ${b}`);
  }
  assert.equal(joinSandhiDeva('रामः', 'अपि').changed, true);
  assert.equal(joinSandhiDeva('तद्', 'एव').changed, false); // already cited in its voiced form
});

test('optional forms are offered as alternatives', () => {
  const alts = (a: string, b: string, opts?: SandhiOptions): string[] => joinSandhiDeva(a, b, opts).alternatives.map((x) => x.result);
  // 8.4.45: nasal (primary) or voiced stop
  assert.deepEqual(alts('जगत्', 'नाथः'), ['जगद्नाथः']);
  assert.deepEqual(alts('एतत्', 'मुरारिः'), ['एतद्मुरारिः']);
  assert.deepEqual(alts('षट्', 'मासाः'), ['षड्मासाः']);
  // … but obligatory before the suffixes -maya / -mātra
  assert.deepEqual(alts('वाक्', 'मयम्'), []);
  assert.deepEqual(alts('तत्', 'मात्रम्'), []);
  assert.deepEqual(alts('चित्', 'मयम्'), []);
  // 8.4.59: anusvāra or class nasal
  assert.deepEqual(alts('अहम्', 'गच्छामि'), ['अहङ्गच्छामि']);
  assert.deepEqual(alts('किम्', 'चित्'), ['किञ्चित्']);
  assert.deepEqual(alts('सम्', 'गमः', { compound: true }), ['सङ्गमः']);
  assert.deepEqual(alts('सम्', 'चयः', { compound: true }), ['सञ्चयः']);
  assert.deepEqual(alts('सम्', 'न्यासः', { compound: true }), ['सन्न्यासः']);
  assert.deepEqual(alts('अलम्', 'कारः', { compound: true }), ['अलङ्कारः']);
  assert.deepEqual(alts('शम्', 'भुः', { compound: true }), ['शम्भुः']);
  assert.deepEqual(alts('अहम्', 'हसामि'), []);
  assert.deepEqual(alts('अहम्', 'शृणोमि'), []);
  assert.deepEqual(alts('रामम्', 'रक्ष'), []);
  // 8.3.36: visarga or sibilant
  assert.deepEqual(alts('हरिः', 'शेते'), ['हरिश्शेते']);
  assert.deepEqual(alts('रामः', 'षष्ठः'), ['रामष्षष्ठः']);
  assert.deepEqual(alts('बालः', 'सरति'), ['बालस्सरति']);
  // 8.4.63: ch optional
  assert.deepEqual(alts('तत्', 'शिवः'), ['तच्शिवः']);
  assert.deepEqual(alts('वाक्', 'शूरः'), ['वाक्छूरः']);
  assert.equal(joinSandhiDeva('वाक्', 'शूरः').result, 'वाक्शूरः');
  assert.deepEqual(alts('तान्', 'शत्रून्'), ['ताञ्छत्रून्', 'ताञ्च्छत्रून्']);
  // 8.4.62: h optional
  assert.deepEqual(alts('वाक्', 'हरिः'), ['वाग्हरिः']);
  assert.deepEqual(alts('तत्', 'हितम्'), ['तद्हितम्']);
  // 8.3.19: ay / av or hiatus
  assert.deepEqual(alts('हरे', 'एहि'), ['हरयेहि']);
  assert.deepEqual(alts('विष्णो', 'इह'), ['विष्णविह']);
  assert.deepEqual(alts('श्रियै', 'उद्यतः'), ['श्रियायुद्यतः']);
  assert.deepEqual(alts('गुरौ', 'उत्कः'), ['गुरा उत्कः']);
  assert.deepEqual(alts('तस्मै', 'अदात्'), ['तस्मायदात्']);
  // 8.3.2: nasalised vowel instead of anusvāra
  assert.deepEqual(alts('कस्मिन्', 'चित्'), ['कस्मिँश्चित्']);
  assert.deepEqual(alts('भवान्', 'च'), ['भवाँश्च']);
  // 6.1.76: tuk optional after a word-final long vowel
  assert.deepEqual(alts('लक्ष्मी', 'छाया'), ['लक्ष्मीच्छाया']);
  // rules without options have no alternatives
  for (const [a, b] of [['देव', 'आलयः'], ['रामः', 'अपि'], ['रामः', 'गच्छति'], ['तत्', 'च'], ['हरिः', 'अत्र'], ['तस्मिन्', 'एव']] as const) {
    assert.deepEqual(alts(a, b), []);
  }
});

test('options: pragṛhya', () => {
  assert.equal(joinSandhiDeva('हरी', 'एतौ').result, 'हर्येतौ');
  assert.equal(joinSandhiDeva('हरी', 'एतौ', { pragrhya: true }).result, 'हरी एतौ');
  assert.equal(joinSandhiDeva('ते', 'एव').result, 'त एव');
  assert.equal(joinSandhiDeva('ते', 'एव', { pragrhya: true }).result, 'ते एव');
  assert.equal(joinSandhiDeva('ते', 'अत्र').result, 'तेऽत्र');
  assert.equal(joinSandhiDeva('ते', 'अत्र', { pragrhya: true }).result, 'ते अत्र');
  assert.equal(joinSandhiDeva('अहो', 'अस्य').result, 'अहो अस्य');
  assert.equal(joinSandhiDeva('अहो', 'अस्य').ruleId, 'pragrhya');
  // pragṛhya only concerns vowel + vowel
  assert.equal(joinSandhiDeva('हरी', 'गच्छतः', { pragrhya: true }).result, 'हरी गच्छतः');
  assert.equal(joinSandhiDeva('हरी', 'गच्छतः', { pragrhya: true }).ruleId, null);
});

test('options: rFinal', () => {
  assert.equal(joinSandhiDeva('अन्तः', 'अस्ति').result, 'अन्तोऽस्ति');
  assert.ok(joinSandhiDeva('अन्तः', 'अस्ति').note?.includes('rFinal'));
  assert.equal(joinSandhiDeva('अन्तः', 'अस्ति', { rFinal: true }).result, 'अन्तरस्ति');
  assert.equal(joinSandhiDeva('स्वः', 'गच्छति').result, 'स्वो गच्छति');
  assert.equal(joinSandhiDeva('स्वः', 'गच्छति', { rFinal: true }).result, 'स्वर्गच्छति');
  // written with r
  assert.equal(joinSandhi('punar', 'api').result, 'punarapi');
  assert.equal(joinSandhi('punar', 'api').changed, false);
  assert.equal(joinSandhi('antar', 'gata').result, 'antargata');
  assert.equal(joinSandhi('punar', 'ca').result, 'punaSca');
  assert.equal(joinSandhi('punar', 'karoti').result, 'punaH karoti');
  assert.equal(joinSandhi('punar', 'ramate').result, 'punA ramate');
  assert.equal(joinSandhi('prAtar', 'kAlaH', { compound: true }).result, 'prAtaHkAlaH');
  // r-final before voiceless sounds behaves like any visarga
  assert.equal(joinSandhiDeva('अन्तः', 'करणम्', { rFinal: true, compound: true }).result, 'अन्तःकरणम्');
  assert.equal(joinSandhiDeva('पुनः', 'च').result, 'पुनश्च');
});

test('options: compound and internal', () => {
  assert.equal(joinSandhiDeva('मनः', 'रथः').result, 'मनो रथः');
  assert.equal(joinSandhiDeva('मनः', 'रथः', { compound: true }).result, 'मनोरथः');
  assert.equal(joinSandhiDeva('ने', 'अनम्').result, 'नेऽनम्');
  assert.equal(joinSandhiDeva('ने', 'अनम्', { internal: true }).result, 'नयनम्');
  assert.equal(joinSandhiDeva('नै', 'अकः').result, 'ना अकः');
  assert.equal(joinSandhiDeva('नै', 'अकः', { internal: true }).result, 'नायकः');

  // a hiatus cannot be written as one word
  assert.equal(joinSandhiDeva('अतः', 'एव', { compound: true }).result, 'अत एव');
  // internal consonant sandhi is not attempted
  const r = joinSandhiDeva('वाच्', 'य', { internal: true });
  assert.equal(r.ruleId, null);
  assert.equal(r.changed, false);
  assert.ok(r.note !== undefined);
  assert.equal(joinSandhiDeva('देव', 'आलयः', { internal: true }).result, 'देवालयः');
});

test('SLP1 interface, input conveniences, and edge cases', () => {
  assert.deepEqual(joinSandhi('deva', 'AlayaH'), { result: 'devAlayaH', ruleId: 'savarna-dirgha', changed: true, spaced: false, alternatives: [] });
  assert.deepEqual(joinSandhi('rAmaH', 'gacCati'), { result: 'rAmo gacCati', ruleId: 'visarga-o', changed: true, spaced: true, alternatives: [] });
  assert.deepEqual(joinSandhi('rAma', 'gacCati'), { result: 'rAma gacCati', ruleId: null, changed: false, spaced: true, alternatives: [] });
  assert.equal(joinSandhi('rAmaH', 'api').result, "rAmo'pi");
  assert.equal(joinSandhi('tAn', 'lokAn').result, 'tA~llokAn');
  // final s is read as visarga, final anusvāra as m
  assert.equal(joinSandhi('manas', 'haraH', { compound: true }).result, 'manoharaH');
  assert.equal(joinSandhi('rAmas', 'ca').result, 'rAmaSca');
  assert.equal(joinSandhi('rAmas', 'karoti').result, 'rAmaH karoti');
  assert.equal(joinSandhi('ahaM', 'atra').result, 'ahamatra');
  assert.equal(joinSandhi('ahaM', 'atra').changed, false);
  assert.equal(joinSandhi('ahaM', 'gacCAmi').result, 'ahaM gacCAmi');
  // voiced citation forms
  assert.equal(joinSandhi('tad', 'ca').result, 'tacca');
  assert.equal(joinSandhi('vAg', 'ISaH').result, 'vAgISaH');
  assert.equal(joinSandhi('tad', 'karoti').result, 'tatkaroti');
  // empty operands
  assert.deepEqual(joinSandhi('', 'rAmaH'), { result: 'rAmaH', ruleId: null, changed: false, spaced: false, alternatives: [] });
  assert.deepEqual(joinSandhi('rAmaH', ''), { result: 'rAmaH', ruleId: null, changed: false, spaced: false, alternatives: [] });
  // a word that cannot end a pada: no guess
  for (const [a, b] of [['vAc', 'ISaH'], ['ac', 'antaH'], ['diS', 'gajaH'], ['lih', 'ati'], ['rAj', 'A']] as const) {
    const r = joinSandhi(a, b);
    assert.equal(r.ruleId, null, `${a} + ${b}`);
    assert.equal(r.changed, false);
    assert.ok(r.note?.includes('pada form'));
  }
  // non-sounds at the junction
  assert.equal(joinSandhi('rAmaH |', 'atra').ruleId, null);
  assert.equal(joinSandhi('rAmaH', '108').ruleId, null);
  // only the junction is touched
  assert.equal(joinSandhi('rAmaH ca lakzmaRaH', 'ca').result, 'rAmaH ca lakzmaRaSca');
});

test('exceptions and blocked rules', () => {
  // 8.3.35 śarpare visarjanīyaḥ
  assert.equal(joinSandhiDeva('कः', 'त्सरुः').result, 'कः त्सरुः');
  assert.equal(joinSandhiDeva('रामः', 'क्षत्रियः').result, 'रामः क्षत्रियः');
  assert.equal(joinSandhiDeva('निः', 'क्षत्रियः', { compound: true }).result, 'निःक्षत्रियः');
  // 8.3.7: praśān, and t not followed by am
  assert.equal(joinSandhiDeva('प्रशान्', 'तनोति').result, 'प्रशान्तनोति');
  assert.equal(joinSandhiDeva('सन्', 'त्सरुः').result, 'सन्त्सरुः');
  // 8.4.42 / 8.4.43
  assert.equal(joinSandhiDeva('षट्', 'ते').result, 'षट्ते');
  assert.equal(joinSandhiDeva('षट्', 'सन्तः').result, 'षट्सन्तः');
  assert.equal(joinSandhiDeva('सन्', 'षष्ठः').result, 'सन्षष्ठः');
  assert.equal(joinSandhiDeva('षट्', 'नगर्यः').result, 'षण्णगर्यः');
  assert.equal(joinSandhiDeva('षट्', 'नयनानि').result, 'षण्नयनानि');
  // n before other sounds stays
  for (const b of ['करोति', 'पठति', 'गच्छति', 'ददाति', 'भवति', 'नमति', 'मन्यते', 'याति', 'वदति', 'रमते', 'हसति', 'सरति']) {
    const r = joinSandhiDeva('तान्', b);
    assert.equal(r.result, `तान्${b}`);
    assert.equal(r.ruleId, null);
  }
  // doubling only after a short vowel, only before a vowel
  assert.equal(joinSandhiDeva('तान्', 'एव').result, 'तानेव');
  assert.equal(joinSandhiDeva('प्राङ्', 'आस्ते').result, 'प्राङास्ते');
  assert.equal(joinSandhiDeva('तस्मिन्', 'गृहे').result, 'तस्मिन्गृहे');
  // ch after a consonant-final word needs no tuk
  assert.equal(joinSandhiDeva('रामः', 'छात्रः').result, 'रामश्छात्रः');
  // lexical cases are flagged, not guessed
  assert.ok(joinSandhiDeva('प्र', 'एजते').note?.includes('6.1.94'));
  assert.ok(joinSandhiDeva('प्र', 'ऋच्छति').note?.includes('6.1.91'));
  assert.equal(joinSandhiDeva('प्र', 'इति').note, undefined);
  assert.ok(joinSandhiDeva('नमः', 'कारः', { compound: true }).note?.includes('namaskāra'));
  assert.ok(joinSandhiDeva('सम्', 'कृतम्', { compound: true }).note?.includes('saṃskṛta'));
  assert.equal(joinSandhiDeva('दुः', 'खम्', { compound: true }).result, 'दुःखम्');
});

test('go: only certain forms are produced; gavendra / gavākṣa are declined, not guessed', () => {
  // go + indra is obligatorily gavendra (6.1.124): the engine produces NO sandhi form (never गविन्द्रः)
  for (const opts of [undefined, { compound: true }] as (SandhiOptions | undefined)[]) {
    const r = joinSandhiDeva('गो', 'इन्द्रः', opts);
    assert.equal(r.ruleId, null);
    assert.equal(r.changed, false);
    assert.equal(r.result, 'गो इन्द्रः');
    assert.deepEqual(r.special, { code: 'go', ref: '6.1.124' });
    assert.ok(r.note?.includes('gavendra'));
    assert.deepEqual(r.alternatives, []);
    assert.notEqual(r.result, 'गविन्द्रः');
  }
  // go + akṣa: the general pūrvarūpa form is returned but flagged (established form: gavākṣa)
  const aksha = joinSandhiDeva('गो', 'अक्षः', { compound: true });
  assert.equal(aksha.result, 'गोऽक्षः');
  assert.deepEqual(aksha.special, { code: 'go', ref: '6.1.123' });
  assert.ok(aksha.note?.includes('gavākṣa'));
  // go + agram: go'gram is a correct form (the optional gavāgram / go agram are mentioned, not listed)
  const agra = joinSandhiDeva('गो', 'अग्रम्', { compound: true });
  assert.equal(agra.result, 'गोऽग्रम्');
  assert.equal(agra.ruleId, 'purvarupa');
  assert.equal(agra.special, undefined);
  assert.ok(agra.note?.includes('gavāgram'));
  // go + other vowels: gav- (ayādi) is a correct form
  const isha = joinSandhiDeva('गो', 'ईशः', { compound: true });
  assert.equal(isha.result, 'गवीशः');
  assert.equal(isha.ruleId, 'ayadi');
  assert.equal(isha.special, undefined);
  assert.deepEqual(isha.alternatives, []);
  assert.ok(isha.note?.includes('gaveśa'));
  // before a consonant, and word-internally, nothing special
  assert.equal(joinSandhiDeva('गो', 'पालः', { compound: true }).result, 'गोपालः');
  assert.equal(joinSandhiDeva('गो', 'ए', { internal: true }).result, 'गवे');
  // other o-final words are untouched
  assert.equal(joinSandhiDeva('प्रभो', 'इन्द्र').result, 'प्रभ इन्द्र');
  assert.equal(joinSandhiDeva('प्रभो', 'इन्द्र').special, undefined);
});

/**
 * Engine issue log (content packs): lexical / gati / upasarga / internal specials that the engine does not
 * apply. For each pair the general-rule output must carry the machine-readable `special` flag (or be
 * "no rule"), and must never equal a form the engine claims with confidence.
 */
const KNOWN_SPECIALS: [first: string, second: string, expected: string, code: string][] = [
  ['नमः', 'कारः', 'नमस्कारः', 'gati-satva'],
  ['पुरः', 'कारः', 'पुरस्कारः', 'gati-satva'],
  ['तिरः', 'कारः', 'तिरस्कारः', 'gati-satva'],
  ['नमः', 'करोति', 'नमस्करोति', 'gati-satva'],
  ['भाः', 'करः', 'भास्करः', 'samasa-satva'],
  ['श्रेयः', 'करः', 'श्रेयस्करः', 'samasa-satva'],
  ['यशः', 'करः', 'यशस्करः', 'samasa-satva'],
  ['अयः', 'कारः', 'अयस्कारः', 'samasa-satva'],
  ['धनुः', 'पाणिः', 'धनुष्पाणिः', 'samasa-satva'],
  ['सम्', 'कृतम्', 'संस्कृतम्', 'sut'],
  ['सम्', 'कारः', 'संस्कारः', 'sut'],
  ['प्र', 'नामः', 'प्रणामः', 'natva'],
  ['परि', 'नामः', 'परिणामः', 'natva'],
  ['राम', 'अयनम्', 'रामायणम्', 'natva'],
  ['नि', 'सिद्धः', 'निषिद्धः', 'shatva'],
  ['अभि', 'सेकः', 'अभिषेकः', 'shatva'],
  ['वि', 'समः', 'विषमः', 'shatva'],
  ['युधि', 'स्थिरः', 'युधिष्ठिरः', 'shatva'],
  ['मातृ', 'स्वसा', 'मातृष्वसा', 'shatva'],
  ['स्व', 'ईरम्', 'स्वैरम्', 'vrddhi-special'],
  ['प्र', 'ऊढः', 'प्रौढः', 'vrddhi-special'],
  ['अक्ष', 'ऊहिनी', 'अक्षौहिणी', 'vrddhi-special'],
  ['सुख', 'ऋतः', 'सुखार्तः', 'vrddhi-special'],
  ['मनस्', 'ईषा', 'मनीषा', 'shakandhu'],
  ['कुल', 'अटा', 'कुलटा', 'shakandhu'],
  ['पतत्', 'अञ्जलिः', 'पतञ्जलिः', 'shakandhu'],
  ['शक', 'अन्धुः', 'शकन्धुः', 'shakandhu'],
  ['प्र', 'एजते', 'प्रेजते', 'upasarga-dhatu'],
  ['प्र', 'ऋच्छति', 'प्रार्च्छति', 'upasarga-dhatu'],
  ['उप', 'ओषति', 'उपोषति', 'upasarga-dhatu'],
  ['गो', 'इन्द्रः', 'गवेन्द्रः', 'go'],
  ['गो', 'अक्षः', 'गवाक्षः', 'go'],
  ['अच्', 'अन्तः', 'अजन्तः', 'not-a-pada'],
  ['वाच्', 'ईशः', 'वागीशः', 'not-a-pada'],
];

test('known specials the engine does not apply are flagged, never claimed', () => {
  for (const [first, second, expected, code] of KNOWN_SPECIALS) {
    for (const opts of [{ compound: true }, undefined] as (SandhiOptions | undefined)[]) {
      // रामायण-type ṇatva and the compound-only s-rules can only be suspected when the caller says "compound"
      const compoundOnly = (code === 'natva' && first === 'राम') || (code === 'samasa-satva' && first !== 'भाः') || (code === 'vrddhi-special' && first === 'सुख');
      if (opts === undefined && compoundOnly) continue;
      const r = joinSandhiDeva(first, second, opts);
      const label = `${first} + ${second} ${opts === undefined ? '' : '(compound)'}`;
      assert.ok(r.special !== undefined, `${label} must be flagged`);
      assert.equal(r.special.code, code, label);
      assert.match(r.special.ref, /^[1-8]\.[1-4]\.\d+/, label);
      assert.ok(r.note !== undefined && r.note.length > 20, `${label} explains itself`);
      // the engine did not produce the special form, and does not list it as an alternative either
      assert.notEqual(r.result, expected, label);
      assert.ok(!r.alternatives.some((a) => a.result === expected), label);
    }
  }
});

test('the special flag is absent on ordinary pairs', () => {
  let n = 0;
  for (const cases of Object.values(CASES)) {
    for (const [first, second, , opts] of cases) {
      assert.equal(joinSandhiDeva(first, second, opts).special, undefined, `${first} + ${second}`);
      n += 1;
    }
  }
  assert.ok(n >= 300);
  // near-misses of the detectors
  for (const [a, b, opts] of [
    ['रामः', 'करोति', undefined], // 8.3.46 is compound-only
    ['अन्तः', 'करणम्', C], // antar is an indeclinable
    ['प्रातः', 'कालः', C],
    ['मनः', 'पूतम्', C],
    ['उप', 'एति', undefined], // 6.1.89: ordinary vṛddhi
    ['प्र', 'इति', undefined],
    ['सम्', 'गच्छति', undefined],
    ['नि', 'गच्छति', undefined],
    ['देव', 'नाम', undefined],
    ['गुरु', 'सेवा', undefined],
  ] as [string, string, SandhiOptions | undefined][]) {
    assert.equal(joinSandhiDeva(a, b, opts).special, undefined, `${a} + ${b}`);
  }
  // flagged because the function cannot know
  assert.equal(joinSandhiDeva('अन्तः', 'अस्ति').special?.code, 'r-final-ambiguous');
  assert.equal(joinSandhiDeva('अन्तः', 'अस्ति', { rFinal: true }).special, undefined);
  assert.equal(joinSandhiDeva('राम', 'नाम', { compound: true }).special?.code, 'natva');
  assert.equal(joinSandhiDeva('देव', 'नाम', { compound: true }).special, undefined);
});

test('exhaustive junction sweep: every final × every initial gives a well-formed result', () => {
  const finals = ['a', 'A', 'i', 'I', 'u', 'U', 'f', 'e', 'E', 'o', 'O', 'aH', 'AH', 'iH', 'uH', 'eH', 'oH', 'am', 'An', 'in', 'at', 'Ak', 'aw', 'ap', 'aN'];
  const initials = [...'aAiIuUfeEoO', ...'kKgGcCjJwWqQtTdDnpPbBmyrlvSzsh'];
  let n = 0;
  for (const fin of finals) {
    for (const ini of initials) {
      const first = `kar${fin}`;
      const second = `${ini}${'aAiIuUfeEoO'.includes(ini) ? 'ta' : 'ala'}`;
      const r = joinSandhi(first, second);
      assert.equal(typeof r.result, 'string');
      assert.equal(r.spaced, r.result.includes(' '));
      assert.ok(r.result.length >= first.length + second.length - 2);
      assert.ok(validateDeva(slp1ToDeva(r.result)).ok, `${first} + ${second} → ${r.result}`);
      if (r.ruleId !== null) assert.ok(sandhiRule(r.ruleId) !== undefined);
      if (r.ruleId === null) assert.equal(r.changed, false);
      // the result begins with the unchanged body of the first word and ends with the body of the second
      assert.ok(r.result.startsWith('ka'), r.result);
      assert.ok(r.result.endsWith(second.slice(1)), r.result);
      n += 1;
    }
  }
  assert.equal(n, finals.length * initials.length);
});

test('vowel + vowel table (all 14 × 14 combinations, checked against the rules)', () => {
  const vowels = [...'aAiIuUfFxeEoO'];
  const cls: Record<string, string> = { a: 'a', A: 'a', i: 'i', I: 'i', u: 'u', U: 'u', f: 'f', F: 'f', x: 'f' };
  const long: Record<string, string> = { a: 'A', i: 'I', u: 'U', f: 'F' };
  const guna: Record<string, string> = { i: 'e', u: 'o', f: 'ar' };
  for (const v1 of vowels) {
    for (const v2 of vowels) {
      const r = joinSandhi(`k${v1}`, `${v2}t`);
      let expected: string;
      const c1 = cls[v1];
      const c2 = cls[v2];
      if (c1 !== undefined && c1 === c2) expected = `k${long[c1]}t`;
      else if (c1 === 'a') {
        if (v2 === 'x') expected = 'kalt';
        else if (c2 !== undefined) expected = `k${guna[c2]}t`;
        else expected = `k${v2 === 'e' || v2 === 'E' ? 'E' : 'O'}t`;
      } else if (c1 !== undefined) expected = `k${v1 === 'x' ? 'l' : { i: 'y', u: 'v', f: 'r' }[c1]}${v2}t`;
      else if ((v1 === 'e' || v1 === 'o') && v2 === 'a') expected = `k${v1}'t`;
      else if (v1 === 'e' || v1 === 'o') expected = `ka ${v2}t`;
      else if (v1 === 'E') expected = `kA ${v2}t`;
      else expected = `kAv${v2}t`;
      assert.equal(r.result, expected, `k${v1} + ${v2}t`);
    }
  }
});

test('applyNatva: applies', () => {
  const pairs: [string, string][] = [
    ['रामेन', 'रामेण'], ['पुत्रेन', 'पुत्रेण'], ['नरानाम्', 'नराणाम्'], ['गुरुना', 'गुरुणा'], ['रामानाम्', 'रामाणाम्'],
    ['पुष्पेन', 'पुष्पेण'], ['पुष्पानि', 'पुष्पाणि'], ['पुष्पानाम्', 'पुष्पाणाम्'], ['हरिना', 'हरिणा'], ['नेतॄनाम्', 'नेतॄणाम्'],
    ['चतुर्नाम्', 'चतुर्णाम्'], ['कर्मना', 'कर्मणा'], ['ब्रह्मनि', 'ब्रह्मणि'], ['कृष्न', 'कृष्ण'], ['रामायन', 'रामायण'],
    ['ब्राह्मन', 'ब्राह्मण'], ['पूर्न', 'पूर्ण'], ['कर्न', 'कर्ण'], ['वर्न', 'वर्ण'], ['तृन', 'तृण'],
    ['पितॄनाम्', 'पितॄणाम्'], ['मृगेन', 'मृगेण'], ['रूपेन', 'रूपेण'], ['क्षीरेन', 'क्षीरेण'], ['ग्रहन', 'ग्रहण'],
    ['श्रवन', 'श्रवण'], ['निर्वान', 'निर्वाण'], ['रावन', 'रावण'], ['प्रमान', 'प्रमाण'], ['रमनीय', 'रमणीय'],
    ['वर्षेन', 'वर्षेण'], ['मूर्खेन', 'मूर्खेण'], ['सर्वेन', 'सर्वेण'], ['अक्षानाम्', 'अक्षाणाम्'], ['गृह्यमानः', 'गृह्यमाणः'],
    ['स्मर्यमानः', 'स्मर्यमाणः'], ['चोरयमानः', 'चोरयमाणः'], ['प्रनीय', 'प्रणीय'], ['प्रनम्य', 'प्रणम्य'], ['निषन्न', 'निषण्ण'],
    ['ऋनम्', 'ऋणम्'], ['वारिनि', 'वारिणि'], ['उष्न', 'उष्ण'], ['विष्नु', 'विष्णु'], ['कारनानि', 'कारणानि'],
    ['ब्रह्मन्य', 'ब्रह्मण्य'], ['करेन', 'करेण'], ['भ्रातॄनाम्', 'भ्रातॄणाम्'], ['स्वरेन', 'स्वरेण'], ['मित्रानि', 'मित्राणि'],
  ];
  for (const [input, expected] of pairs) {
    assert.equal(slp1ToDeva(applyNatva(devaToSlp1(input))), expected, input);
    // idempotent on its own output
    assert.equal(slp1ToDeva(applyNatva(devaToSlp1(expected))), expected, expected);
  }
});

test('applyNatva: blocked or not triggered', () => {
  const unchanged = [
    'रथेन', 'अर्जुनेन', 'रसेन', 'दर्शनेन', 'रामान्', 'देवेन', 'देवानाम्', 'वनेन', 'वनानि', 'लभमानः',
    'दीयमानः', 'आनीय', 'कुर्वन्ति', 'कुर्वन्', 'अर्चना', 'प्रार्थना', 'रचना', 'रत्नानि', 'कृतेन', 'ऋतेन',
    'राजानः', 'राज्ञा', 'क्रीडनम्', 'वर्तनम्', 'मर्दनम्', 'शरीरान्', 'पितॄन्', 'गुरून्', 'नरान्', 'रामेन्द्र',
    'प्रान्तः', 'क्रान्तिः', 'ग्रन्थः', 'वृन्दम्', 'क्षुभ्नाति', 'तृप्नोति', 'सरलेन', 'विरलानि', 'नयनम्', 'मनसा',
    'दृढेन', 'रटन्ति', 'पार्थेन', 'कीर्तनम्', 'प्रश्नः', 'स्नानम्',
  ];
  for (const w of unchanged) assert.equal(slp1ToDeva(applyNatva(devaToSlp1(w))), w, w);
});

test('applyNatva: scope is the single word', () => {
  assert.equal(applyNatva('rAmena'), 'rAmeRa');
  assert.equal(applyNatva('rAmaH nagaram'), 'rAmaH nagaram');
  assert.equal(applyNatva('rAma-nAma'), 'rAma-nAma');
  assert.equal(applyNatva('putrena saha vanena'), 'putreRa saha vanena');
  assert.equal(applyNatva(''), '');
  assert.equal(applyNatva('n'), 'n');
  assert.equal(applyNatva('rn'), 'rn');
});
