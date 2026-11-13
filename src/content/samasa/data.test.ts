import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { devaToIast, normalizeDeva, validateDeva } from '../../sanskrit/translit';
import { SAMASAS, SAMASA_TYPES, meta, samasasByType } from './index';
import type { SamasaType } from './types';

const TYPES = Object.keys(SAMASA_TYPES) as SamasaType[];
const VIBHAKTI_SUBTYPES = ['द्वितीया-तत्पुरुषः', 'तृतीया-तत्पुरुषः', 'चतुर्थी-तत्पुरुषः', 'पञ्चमी-तत्पुरुषः', 'षष्ठी-तत्पुरुषः', 'सप्तमी-तत्पुरुषः'];

test('samāsa pack: size, ids, types', () => {
  assert.ok(SAMASAS.length >= 150, `expected ≥ 150 compounds, got ${SAMASAS.length}`);
  assert.equal(meta.count, SAMASAS.length);
  assert.equal(new Set(SAMASAS.map((s) => s.id)).size, SAMASAS.length, 'duplicate id');
  assert.equal(new Set(SAMASAS.map((s) => s.compound)).size, SAMASAS.length, 'duplicate compound');
  assert.equal(TYPES.length, 8);
  let total = 0;
  for (const t of TYPES) {
    const n = samasasByType(t).length;
    assert.ok(n >= 10, `type ${t}: only ${n} compounds`);
    total += n;
    const info = SAMASA_TYPES[t];
    assert.ok(validateDeva(info.sa).ok, `${t}: ${info.sa}`);
    assert.equal(devaToIast(info.sa), info.iast, `${t}: iast does not match sa`);
    assert.ok(info.en.length > 5 && info.hint.length > 20);
  }
  assert.equal(total, SAMASAS.length);
});

test('samāsa pack: strings are valid, normalised Devanagari', () => {
  for (const s of SAMASAS) {
    assert.match(s.id, /^samasa-[a-z-]+-\d{2}$/);
    assert.ok(TYPES.includes(s.type), `${s.id}: type`);
    for (const x of [s.compound, s.vigraha, s.subtype ?? 'अ', ...s.members]) {
      const r = validateDeva(x);
      assert.ok(r.ok, `${s.id}: ${x}: ${r.errors.join('; ')}`);
      assert.equal(x, normalizeDeva(x), `${s.id}: ${x} not normalised`);
    }
    assert.ok(!/[\s-]/.test(s.compound), `${s.id}: compound must be one word`);
    assert.ok(!/[।॥ऽ-]/.test(s.vigraha), `${s.id}: vigraha must be unsandhied words without punctuation`);
    assert.ok(s.members.length >= 2 && s.members.every((m) => !/\s/.test(m)), `${s.id}: members`);
    assert.ok(s.subtype !== undefined && /ः$|े$|ौ$|न$|म्$/.test(s.subtype), `${s.id}: subtype`);
    assert.ok(s.en.trim().length >= 3 && !/[ऀ-ॿ]/.test(s.en), `${s.id}: gloss`);
    assert.ok(s.level === 4 || s.level === 5, `${s.id}: samāsa analysis belongs to levels 4–5`);
    assert.ok(s.provenance.verifiedBy.includes('oracle:ashtadhyayi-com-forms(vigraha)'), `${s.id}: vigraha forms not verified`);
    assert.ok(s.provenance.verifiedBy.includes('oracle:mw-member-stems'), `${s.id}: member stems not verified`);
  }
});

test('samāsa pack: the vigraha has the shape its type requires', () => {
  for (const s of SAMASAS) {
    const words = s.vigraha.split(' ');
    switch (s.type) {
      case 'tatpurusha':
        assert.ok(VIBHAKTI_SUBTYPES.includes(s.subtype ?? ''), `${s.id}: subtype ${s.subtype}`);
        assert.equal(words.length, 2, `${s.id}: a vibhakti-tatpuruṣa vigraha has two words`);
        break;
      case 'karmadharaya':
        assert.ok(s.subtype?.endsWith('-कर्मधारयः'), `${s.id}: subtype`);
        break;
      case 'dvigu':
        assert.equal(words[words.length - 1], 'समाहारः', `${s.id}: samāhāra-dvigu vigraha ends in समाहारः`);
        break;
      case 'dvandva': {
        const ca = words.filter((w) => w === 'च').length;
        assert.equal(ca, s.members.length, `${s.id}: one च per member`);
        assert.ok(/[ौेः]$|णि$|नि$|ती$|म्$/.test(s.compound), `${s.id}: dvandva citation form should be dual / plural / samāhāra`);
        break;
      }
      case 'bahuvrihi':
        assert.ok(['सः', 'सा'].includes(words[words.length - 1] as string), `${s.id}: bahuvrīhi vigraha ends in सः / सा`);
        assert.ok(words.some((w) => ['यस्य', 'यस्याः', 'येन', 'यं', 'यम्', 'यस्मात्', 'यस्मिन्'].includes(w)), `${s.id}: bahuvrīhi vigraha needs a form of यद्`);
        break;
      case 'avyayibhava':
        assert.ok(/(म्|ि|ु)$/.test(s.compound), `${s.id}: an avyayībhāva is indeclinable (-म् or a short vowel)`);
        break;
      case 'nan-tatpurusha':
        assert.equal(words[0], 'न', `${s.id}: nañ vigraha starts with न`);
        assert.equal(words.length, 2);
        assert.equal(s.members[0], 'न');
        assert.ok(s.compound.startsWith('अ'), `${s.id}: nañ compound starts with अ / अन्`);
        // अन्- before a vowel, अ- before a consonant
        if (/^[अआइईउऊऋएऐओऔ]/.test(words[1] as string)) assert.ok(s.compound.startsWith('अन'), `${s.id}: अन्- is required before a vowel`);
        else assert.ok(s.compound.startsWith(`अ${(words[1] as string).charAt(0)}`), `${s.id}: अ- + ${words[1]}`);
        break;
      case 'upapada':
        assert.equal(words[words.length - 1], 'इति', `${s.id}: upapada vigraha ends in इति`);
        assert.equal(words.length, 3);
        break;
    }
  }
});

test('samāsa pack: generator output and oracle checks are reproducible (needs SAMSKURU_ORACLES)', async (t) => {
  const oracles = process.env.SAMSKURU_ORACLES ?? '/home/claude/refs/data';
  if (!existsSync(`${oracles}/ashtadhyayi-com_data/shabda/data2.txt`) || !existsSync(`${oracles}/sanskrit-lexicon_csl-orig/v02/mw/mw.txt`)) {
    t.skip('corpora not present: cross-check skipped');
    return;
  }
  const gen = await import('../../../tools/content/sahitya/gen-samasa');
  const g = gen.generateSamasa();
  assert.ok(g.complete);
  assert.equal(readFileSync(gen.SAMASA_DATA_FILE, 'utf8'), g.body, 'data.ts is out of date: run node --import tsx tools/content/sahitya/gen-samasa.ts');
  // the form check has teeth: non-forms are rejected, real forms accepted
  assert.equal(gen.vigrahaWordStatus('राज्ञः', ['राजन्']), 'subanta-table');
  assert.equal(gen.vigrahaWordStatus('करोति', []), 'tinanta-table');
  assert.ok(gen.vigrahaWordStatus('कुम्भं', ['कुम्भ']) !== undefined);
  for (const bad of ['राज्ञस्य', 'कुम्भस्या', 'गङ्गायः', 'करोन्ति', 'पुस्तकाणाम्', 'देवेण', 'पितृस्य', 'नद्यस्य']) {
    assert.equal(gen.vigrahaWordStatus(bad, ['राजन्', 'कुम्भ', 'गङ्गा', 'पुस्तक', 'देव', 'पितृ', 'नदी']), undefined, `${bad} must not be accepted as a form`);
  }
});
