import assert from 'node:assert/strict';
import { test } from 'node:test';
import { devaToSlp1, validateDeva } from '../../sanskrit/translit';
import { conj, DHATUS, LAKARAS, PREFIXED } from '../dhatu/index';
import { SHABDA } from '../shabda/index';
import type { Lakara, Pada, Purusha, Vacana } from '../types';
import { CLAUSE_PATTERNS, meta, sentencesForLevel, sentenceText, sentenceTextAnusvara, SENTENCES, VERBLESS_PATTERNS, type Sentence, type SentenceWord } from './index';
import { Nominals } from '../../../tools/content/verbal/nominal';
import { oraclesAvailable } from '../../../tools/content/verbal/oracles';

const NOMINAL = /^([1-8])\.([1-3])\.([mfnx])$/;
const FINITE = /^(lat|lan|lrt|lot|vidhilin)\.([1-3])\.([1-3])$/;
const CASE_OF_ROLE: Record<string, number[]> = { karta: [1], karma: [2], karana: [3], sampradana: [4], apadana: [5], sambandha: [6], adhikarana: [7], sambodhana: [8] };

const finite = (s: Sentence): SentenceWord[] => s.words.filter((w) => w.role === 'kriya' && FINITE.test(w.tag));
const text = (s: Sentence): string => s.words.map((w) => w.sa).join(' ');

test('size, ids, levels', () => {
  assert.ok(SENTENCES.length >= 400, `only ${SENTENCES.length} sentences`);
  assert.equal(new Set(SENTENCES.map((s) => s.id)).size, SENTENCES.length, 'duplicate ids');
  assert.equal(new Set(SENTENCES.map(text)).size, SENTENCES.length, 'duplicate sentences');
  assert.equal(meta.count, SENTENCES.length);
  const l1 = sentencesForLevel(1);
  assert.ok(l1.length >= 120, `only ${l1.length} sentences at L1`);
  assert.ok(sentencesForLevel(2).length > l1.length && sentencesForLevel(3).length === SENTENCES.length);
  for (const s of l1) {
    assert.ok(s.words.length >= 2 && s.words.length <= 3, `${s.id}: L1 sentences have two or three words`);
    for (const k of finite(s)) assert.match(k.tag, /^lat\./, `${s.id}: L1 is present tense only`);
    for (const w of s.words) if (NOMINAL.test(w.tag)) assert.match(w.tag, /^[126]\./, `${s.id}: L1 uses prathamā / dvitīyā (and मम-type ṣaṣṭhī) only`);
  }
  for (const s of SENTENCES) {
    if (/vidhilin|ktva|tumun|visheshana/.test(s.pattern)) assert.ok(s.level >= 3, `${s.id}: belongs to L3`);
    if (finite(s).some((k) => /^(lan|lrt|lot)\./.test(k.tag))) assert.ok(s.level >= 2, `${s.id}: laṅ / lṛṭ / loṭ start at L2`);
  }
});

test('pattern coverage report', (t) => {
  const byPattern = new Map<string, number[]>();
  for (const s of SENTENCES) {
    const row = byPattern.get(s.pattern) ?? [0, 0, 0, 0];
    row[s.level] = (row[s.level] ?? 0) + 1;
    byPattern.set(s.pattern, row);
  }
  for (const [p, row] of byPattern) t.diagnostic(`${p.padEnd(24)} L1 ${row[1]}  L2 ${row[2]}  L3 ${row[3]}`);
  for (const p of ['karta-kriya', 'karta-karma-kriya', 'karana', 'sampradana', 'apadana', 'sambandha', 'adhikarana', 'saha', 'vina', 'prati', 'namah', 'hyah-lan', 'shvah-lrt', 'adya-lat', 'lot', 'vidhilin', 'ktva', 'tumun-icchati', 'visheshana-karma', 'sambodhana-lot']) {
    assert.ok((byPattern.get(p) ?? []).reduce((a, b) => a + (b ?? 0), 0) >= 5, `pattern ${p} is under-represented`);
  }
  const lemmas = new Set(SENTENCES.flatMap((s) => finite(s).map((k) => k.lemma)));
  assert.ok(lemmas.size >= 35, `only ${lemmas.size} different verbs`);
  for (const l of ['lat', 'lan', 'lrt', 'lot', 'vidhilin']) assert.ok(SENTENCES.some((s) => finite(s).some((k) => k.tag.startsWith(l + '.'))), `no ${l} sentence`);
  for (const v of [1, 2, 3, 4, 5, 6, 7, 8]) assert.ok(SENTENCES.some((s) => s.words.some((w) => w.tag.startsWith(`${v}.`))), `vibhakti ${v} never used`);
});

test('every word is valid Devanagari; tags and roles are well-formed', () => {
  for (const s of SENTENCES) {
    assert.ok(s.words.length >= 2, s.id);
    for (const w of s.words) {
      const v = validateDeva(w.sa);
      assert.ok(v.ok, `${s.id} ${w.sa}: ${v.errors.join('; ')}`);
      assert.doesNotMatch(w.sa, /\s/, `${s.id}: a word contains whitespace`);
      assert.doesNotMatch(w.sa, /ं$/u, `${s.id} ${w.sa}: padaccheda keeps final म्`);
      assert.ok(validateDeva(w.lemma, { allowPunctuation: '+' }).ok, `${s.id} lemma ${w.lemma}`);
      assert.ok(w.en.length > 0, `${s.id} ${w.sa}: empty gloss`);
      if (w.role === 'avyaya') assert.equal(w.tag, 'avyaya', `${s.id} ${w.sa}`);
      else if (w.role === 'kriya') assert.ok(FINITE.test(w.tag) || w.tag === 'ktva' || w.tag === 'tumun', `${s.id} ${w.sa}: tag ${w.tag}`);
      else {
        const m = NOMINAL.exec(w.tag);
        assert.ok(m, `${s.id} ${w.sa}: tag ${w.tag}`);
        const cases = CASE_OF_ROLE[w.role];
        if (cases && !(w.role === 'karma' || w.role === 'karana')) assert.ok(cases.includes(Number(m[1])), `${s.id} ${w.sa}: role ${w.role} with vibhakti ${m[1]}`);
        if (w.role === 'karma') assert.equal(m[1], '2', `${s.id} ${w.sa}: karma must be dvitīyā`);
        if (w.role === 'karana') assert.equal(m[1], '3', `${s.id} ${w.sa}: karaṇa / saha-yukta must be tṛtīyā`);
      }
    }
    assert.match(s.en, /^[A-Z].*\.$/, `${s.id}: English "${s.en}"`);
    assert.doesNotMatch(s.en, / {2}|undefined|\bthe the\b| \./, `${s.id}: English "${s.en}"`);
    assert.ok(s.provenance.verifiedBy.length >= 2, `${s.id}: provenance`);
    assert.equal(sentenceText(s), text(s) + '।');
  }
});

test('one finite kriyā, at most one kartā, kriyā last', () => {
  for (const s of SENTENCES) {
    const f = finite(s);
    const verbals = s.words.filter((w) => w.tag === 'ktva' || w.tag === 'tumun');
    if (VERBLESS_PATTERNS.includes(s.pattern)) {
      assert.equal(f.length, 0, `${s.id}: verbless pattern`);
      assert.equal(s.words[s.words.length - 1]?.sa, 'नमः', s.id);
    } else {
      assert.equal(f.length, 1, `${s.id}: exactly one finite verb`);
      assert.equal(s.words[s.words.length - 1], f[0], `${s.id}: the finite verb closes the sentence`);
    }
    assert.equal(verbals.length, CLAUSE_PATTERNS.includes(s.pattern) ? 1 : 0, `${s.id}: ktvā / tumun only in clause patterns`);
    const kartas = s.words.filter((w) => w.role === 'karta');
    assert.ok(kartas.length <= 1, `${s.id}: more than one kartā`);
    const ki = s.words.findIndex((w) => w.role === 'karta');
    const oi = s.words.findIndex((w) => w.role === 'karma');
    if (ki >= 0 && oi >= 0) assert.ok(ki < oi, `${s.id}: kartā precedes karma`);
  }
});

/** Puruṣa a subject demands — recomputed here from the lemma, independently of the generator. */
function purushaOf(lemma: string): number {
  if (lemma === 'अस्मद्') return 3;
  if (lemma === 'युष्मद्') return 2;
  return 1; // every noun, तद्, and the honorific भवत् / भवती
}

test('verb agrees with its kartā in puruṣa and vacana (भवान् / भवती take the prathama-puruṣa)', () => {
  let checked = 0;
  for (const s of SENTENCES) {
    const k = finite(s)[0];
    if (!k) continue;
    const m = FINITE.exec(k.tag);
    assert.ok(m);
    const karta = s.words.find((w) => w.role === 'karta');
    if (!karta) {
      // only the vocative pattern drops the subject: implied त्वम्
      assert.equal(s.pattern, 'sambodhana-lot', `${s.id}: sentence without kartā`);
      assert.equal(k.tag, 'lot.2.1', s.id);
      const voc = s.words.find((w) => w.role === 'sambodhana');
      assert.ok(voc && /^8\.1\./.test(voc.tag), s.id);
      continue;
    }
    const n = NOMINAL.exec(karta.tag);
    assert.ok(n && n[1] === '1', `${s.id}: kartā must be prathamā`);
    assert.equal(Number(m[2]), purushaOf(karta.lemma), `${s.id}: puruṣa of ${k.sa} with ${karta.sa}`);
    assert.equal(m[3], n[2], `${s.id}: vacana of ${k.sa} with ${karta.sa}`);
    checked++;
  }
  assert.ok(checked > 400);
  const bhavan = SENTENCES.filter((s) => s.words.some((w) => w.sa === 'भवान्' || w.sa === 'भवती'));
  assert.ok(bhavan.length >= 10);
  for (const s of bhavan) assert.match(finite(s)[0]?.tag ?? '', /\.1\.1$/, `${s.id}: भवान् with a non-prathama verb`);
});

test('viśeṣaṇa agrees with its viśeṣya in vibhakti, vacana and liṅga', () => {
  let n = 0;
  for (const s of SENTENCES) {
    s.words.forEach((w, i) => {
      if (w.role !== 'visheshana') return;
      const head = s.words[i + 1];
      assert.ok(head && NOMINAL.test(head.tag), `${s.id}: adjective without a following noun`);
      assert.equal(w.tag, head.tag, `${s.id}: ${w.sa} ${head.sa}`);
      n++;
    });
  }
  assert.ok(n >= 20);
});

test('avyaya government and tense–adverb agreement', () => {
  const TENSE: Record<string, string> = { 'ह्यः': 'lan', 'श्वः': 'lrt', 'अद्य': 'lat' };
  for (const s of SENTENCES) {
    s.words.forEach((w, i) => {
      const prev = s.words[i - 1];
      const prevCase = prev ? NOMINAL.exec(prev.tag)?.[1] : undefined;
      if (w.sa === 'सह') assert.equal(prevCase, '3', `${s.id}: सह needs tṛtīyā`);
      if (w.sa === 'विना') assert.ok(prevCase === '2' || prevCase === '3', `${s.id}: विना needs dvitīyā or tṛtīyā`);
      if (w.sa === 'प्रति') assert.equal(prevCase, '2', `${s.id}: प्रति needs dvitīyā`);
      if (w.sa === 'नमः') assert.equal(prevCase, '4', `${s.id}: नमः needs caturthī`);
      const tense = TENSE[w.sa];
      if (tense) assert.ok(finite(s)[0]?.tag.startsWith(tense + '.'), `${s.id}: ${w.sa} with ${finite(s)[0]?.tag}`);
    });
  }
});

test('every verb form is a form of the dhātu pack in the tagged cell', () => {
  const byRoot = new Map<string, typeof DHATUS[number][]>();
  for (const d of DHATUS) byRoot.set(d.dhatu, [...(byRoot.get(d.dhatu) ?? []), d]);
  for (const s of SENTENCES) {
    for (const w of s.words) {
      if (w.role !== 'kriya') continue;
      const [prefix, root] = w.lemma.includes('+') ? [w.lemma.slice(0, w.lemma.lastIndexOf('+')), w.lemma.slice(w.lemma.lastIndexOf('+') + 1)] : ['', w.lemma];
      const cands = byRoot.get(root) ?? [];
      assert.ok(cands.length > 0, `${s.id}: root ${root} not in the dhātu pack`);
      if (w.tag === 'ktva' || w.tag === 'tumun') {
        assert.ok(cands.some((d) => (d.krdanta[w.tag as 'ktva' | 'tumun'] ?? []).includes(w.sa)), `${s.id}: ${w.sa} is not the ${w.tag} of ${root}`);
        continue;
      }
      const m = FINITE.exec(w.tag);
      assert.ok(m);
      const cell: string[] = [];
      for (const d of cands) for (const p of ['P', 'A'] as Pada[]) cell.push(...conj(d, m[1] as Lakara, p, Number(m[2]) as Purusha, Number(m[3]) as Vacana));
      if (prefix === '') {
        assert.ok(cell.includes(w.sa), `${s.id}: ${w.sa} is not ${w.tag} of ${root}`);
      } else {
        const pre = PREFIXED.filter((p) => p.upasarga === prefix && cands.some((d) => d.id === p.base));
        assert.ok(pre.length > 0, `${s.id}: ${w.lemma} is not in PREFIXED`);
        if (w.tag === 'lat.1.1') assert.ok(pre.some((p) => p.lat3s === w.sa), `${s.id}: ${w.sa} vs PREFIXED`);
        // the tail of the form is the pack's own base form (minus the sound that merged with the prefix)
        assert.ok(cell.some((b) => devaToSlp1(w.sa).endsWith(devaToSlp1(b).slice(1))), `${s.id}: ${w.sa} does not end in a ${w.tag} form of ${root}`);
        if (m[1] === 'lan') assert.match(w.sa, /^(आ|उपा|प्रा|अवा|उद)/u, `${s.id}: augment after the prefix in ${w.sa}`);
      }
    }
  }
  assert.ok(LAKARAS.length === 5);
  const some = (sa: string): boolean => SENTENCES.some((s) => s.words.some((w) => w.sa === sa));
  assert.ok(some('गत्वा'), 'गत्वा expected in the pack');
  // augment-after-prefix spot checks: whichever of these occur must be spelled exactly so
  const lanPrefixed = SENTENCES.flatMap((s) => s.words).filter((w) => w.tag.startsWith('lan.') && w.lemma.includes('+'));
  assert.ok(lanPrefixed.length >= 3, 'prefixed laṅ forms expected');
  const KNOWN: Record<string, string> = { 'आ+गम्|lan.1.1': 'आगच्छत्', 'उप+विश्|lan.1.1': 'उपाविशत्', 'प्र+विश्|lan.1.1': 'प्राविशत्', 'अव+गम्|lan.1.1': 'अवागच्छत्', 'आ+नी|lan.1.1': 'आनयत्', 'उद्+स्था|lan.1.1': 'उदतिष्ठत्' };
  for (const w of lanPrefixed) {
    const want = KNOWN[`${w.lemma}|${w.tag}`];
    if (want) assert.equal(w.sa, want);
  }
});

test('nominal forms agree with the independently built śabda pack wherever it has the word', () => {
  let compared = 0;
  for (const s of SENTENCES) {
    for (const w of s.words) {
      const m = NOMINAL.exec(w.tag);
      if (!m) continue;
      const g = m[3];
      const pack = SHABDA.filter((p) => p.stem === w.lemma && (g === 'x' ? p.genderless === true : p.gender === g && !p.genderless));
      if (pack.length === 0) continue;
      const ok = pack.some((p) => (p.forms[Number(m[1]) - 1]?.[Number(m[2]) - 1] ?? []).includes(w.sa));
      assert.ok(ok, `${s.id}: ${w.sa} (${w.lemma} ${w.tag}) is not in the śabda pack`);
      compared++;
    }
  }
  assert.ok(compared > 300, `only ${compared} forms could be compared`);
});

test('golden: the textbook staples are in the pack, spelled exactly so (typed by hand)', () => {
  const texts = new Set(SENTENCES.map(sentenceText));
  for (const t of ['बालकः पुस्तकम् पठति।', 'माता भोजनम् पचति।', 'छात्राः विद्यालयम् गच्छन्ति।', 'अहम् जलम् पिबामि।', 'गुरवे नमः।', 'बालकः गृहम् गत्वा भोजनम् खादति।', 'बालिका गीतम् गायति।', 'माता बालकाय फलम् ददाति।', 'फलम् वृक्षात् पतति।']) {
    assert.ok(texts.has(t), `missing: ${t}`);
  }
  const printed = new Set(SENTENCES.map(sentenceTextAnusvara));
  for (const t of ['बालकः पुस्तकं पठति।', 'माता भोजनं पचति।', 'छात्राः विद्यालयं गच्छन्ति।', 'अहं जलं पिबामि।']) assert.ok(printed.has(t), `missing: ${t}`);
});

test('sentenceTextAnusvara applies only म् → ं before a consonant', () => {
  const s = SENTENCES.find((x) => x.words.some((w, i) => w.sa.endsWith('म्') && /^[क-ह]/u.test(x.words[i + 1]?.sa ?? '')));
  assert.ok(s);
  const a = sentenceTextAnusvara(s);
  assert.notEqual(a, sentenceText(s));
  assert.equal(a.replace(/ं /g, 'म् '), sentenceText(s));
  const v = SENTENCES.find((x) => x.words.some((w, i) => w.sa.endsWith('म्') && /^[अ-औ]/u.test(x.words[i + 1]?.sa ?? '')));
  assert.ok(v);
  assert.ok(sentenceTextAnusvara(v).includes('म् '), 'म् must stay before a vowel');
});

test('oracle: every nominal form re-verified against the reference declensions', { skip: oraclesAvailable() ? false : 'reference datasets not present (set SAMSKURU_ORACLES)' }, () => {
  const N = new Nominals();
  const PRON: Record<string, string> = { 'अस्मद्|x': '@asmad1', 'युष्मद्|x': '@yuSmad1', 'तद्|m': '@tad1', 'तद्|f': '@tad2', 'तद्|n': '@tad3', 'भवत्|m': '@bhavat1', 'भवती|f': '@bhavatI1' };
  let n = 0;
  for (const s of SENTENCES) {
    for (const w of s.words) {
      const m = NOMINAL.exec(w.tag);
      if (!m) continue;
      const v = Number(m[1]) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
      const num = Number(m[2]) as Vacana;
      const urlid = PRON[`${w.lemma}|${m[3]}`];
      let forms: string[];
      if (urlid) forms = N.pronoun(urlid, null, '', v, num).forms;
      else {
        // adjectives are stored under the masculine stem; their feminine declines as an ā-stem
        const stem = w.role === 'visheshana' && m[3] === 'f' ? w.lemma + 'ा' : w.lemma;
        forms = N.decline(stem, m[3] as 'm' | 'f' | 'n', v, num).forms;
      }
      assert.ok(forms.includes(w.sa), `${s.id}: ${w.sa} (${w.lemma} ${w.tag}) not confirmed; oracle has ${forms.join('/')}`);
      n++;
    }
  }
  assert.ok(n > 900);
  for (const [cls, g] of [['a', 'm'], ['a', 'n'], ['A', 'f'], ['I', 'f']] as const) {
    const r = N.validateModelDeclension(cls, g);
    assert.ok(r.checked > 600 && r.mismatches.length / r.checked < 0.04, `model declension ${cls}.${g}: ${r.mismatches.length}/${r.checked} oracle paradigms differ`);
  }
});
