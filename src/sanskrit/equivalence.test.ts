import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameSpelling, spellingKey } from './equivalence';
import { validateDeva } from './translit';

test('word-final anusvāra equals म्', () => {
  for (const [a, b] of [['फलं', 'फलम्'], ['अहं', 'अहम्'], ['गृहं', 'गृहम्'], ['पुस्तकं', 'पुस्तकम्'], ['त्वं', 'त्वम्'], ['किं', 'किम्']] as const) {
    assert.ok(sameSpelling(a, b), `${a} = ${b}`);
    assert.equal(spellingKey(a), b);
  }
});

test('anusvāra before a stop equals the class nasal', () => {
  for (const [a, b] of [['गंगा', 'गङ्गा'], ['शंका', 'शङ्का'], ['पंच', 'पञ्च'], ['संजयः', 'सञ्जयः'], ['दंडः', 'दण्डः'], ['कंठः', 'कण्ठः'], ['संधिः', 'सन्धिः'], ['अंतः', 'अन्तः'], ['संबन्धः', 'सम्बन्धः'], ['संपूर्णम्', 'सम्पूर्णम्'], ['संख्या', 'सङ्ख्या']] as const) {
    assert.ok(sameSpelling(a, b), `${a} = ${b}`);
    assert.equal(spellingKey(a), b);
  }
});

test('true anusvāra before semivowels, sibilants and ह is kept', () => {
  for (const w of ['संस्कृतम्', 'संयोगः', 'संवादः', 'संशयः', 'सिंहः', 'हंसः', 'संरक्षणम्', 'संलापः', 'वंशः']) assert.equal(spellingKey(w), w);
  assert.ok(!sameSpelling('संस्कृतम्', 'सम्स्कृतम्'));
  assert.ok(!sameSpelling('हंसः', 'हन्सः'));
});

test('running text: anusvāra before a following word', () => {
  assert.ok(sameSpelling('अहं गच्छामि', 'अहम् गच्छामि'));
  assert.ok(sameSpelling('बालकः पुस्तकं पठति।', 'बालकः पुस्तकम् पठति।'));
  assert.equal(spellingKey('त्वं च'), 'त्वम् च');
});

test('different words stay different; keys are well-formed; ZWJ/space noise ignored', () => {
  assert.ok(!sameSpelling('फलम्', 'फलः'));
  assert.ok(!sameSpelling('गङ्गा', 'गगा'));
  assert.ok(!sameSpelling('रामः', 'रामा'));
  assert.ok(sameSpelling(' फलं ', 'फलम्'));
  assert.ok(sameSpelling('क‍ं', 'कम्'));
  for (const w of ['गंगा', 'संधिः', 'अहं गच्छामि', 'पंच', 'किं']) assert.equal(validateDeva(spellingKey(w)).ok, true, w);
  assert.equal(spellingKey(spellingKey('संख्या')), spellingKey('संख्या'), 'idempotent');
});
