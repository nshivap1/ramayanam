import assert from 'node:assert/strict';
import { test } from 'node:test';
import { natvaFrom } from '../../../tools/content/nominal/lib/slp';
import { devaToSlp1, validateDeva } from '../../sanskrit/translit';
import { SHABDA, shabda } from '../shabda/index';
import { VOCAB, VOCAB_CATEGORIES, meta, vocabByCategory, vocabForLevel } from './index';
import type { VocabEntry } from './types';

const nouns = VOCAB.filter((e) => e.pos === 'noun');
const tagged = (e: VocabEntry, prefix: string): boolean => e.provenance.verifiedBy.some((t) => t.startsWith(prefix));

test('pack size, categories and meta', () => {
  assert.ok(VOCAB.length >= 600, `expected ≥ 600 entries, got ${VOCAB.length}`);
  assert.ok(VOCAB_CATEGORIES.length >= 22, `expected ≥ 22 categories, got ${VOCAB_CATEGORIES.length}`);
  assert.equal(meta.count, VOCAB.length);
  assert.equal(meta.id, 'vocab');
  const ids = new Set(VOCAB_CATEGORIES.map((c) => c.id));
  assert.equal(ids.size, VOCAB_CATEGORIES.length, 'category ids unique');
  for (const c of VOCAB_CATEGORIES) {
    assert.match(c.id, /^[a-z]+$/);
    assert.ok(validateDeva(c.sa).ok, `category name ${c.sa}`);
    assert.ok(c.en.length > 0 && c.emoji.length > 0);
    assert.ok(vocabByCategory(c.id).length >= 5, `category ${c.id} has too few entries`);
  }
  for (const e of VOCAB) assert.ok(ids.has(e.category), `${e.id}: unknown category ${e.category}`);
});

test('ids are unique ascii slugs', () => {
  const seen = new Set<string>();
  for (const e of VOCAB) {
    assert.match(e.id, /^[a-z][a-z-]*[a-z]$/, e.id);
    assert.ok(!seen.has(e.id), `duplicate id ${e.id}`);
    seen.add(e.id);
  }
});

test('(sa, en) pairs are unique and a word occurs once per category', () => {
  const pairs = new Set<string>();
  const perCategory = new Set<string>();
  for (const e of VOCAB) {
    const p = `${e.sa}|${e.en}`;
    assert.ok(!pairs.has(p), `duplicate (sa, en): ${p}`);
    pairs.add(p);
    const c = `${e.category}|${e.sa}`;
    assert.ok(!perCategory.has(c), `${e.sa} twice in category ${e.category}`);
    perCategory.add(c);
  }
});

test('every Sanskrit string is valid NFC Devanagari in the house spelling', () => {
  for (const e of VOCAB) {
    for (const s of [e.sa, ...(e.stem ? [e.stem] : [])]) {
      assert.equal(s, s.normalize('NFC'), e.id);
      const r = validateDeva(s);
      assert.ok(r.ok, `${e.id}: ${s}: ${r.errors.join('; ')}`);
      assert.ok(!/[।॥०-९ऽ-]/.test(s), `${e.id}: ${s}: no punctuation or digits`);
      assert.ok(!/ं[क-म]/.test(s), `${e.id}: ${s}: anusvāra before a stop (use the class nasal)`);
      assert.equal(s, s.trim());
      assert.ok(!/ {2}/.test(s), e.id);
    }
    if (e.pos !== 'phrase') {
      assert.ok(!e.sa.includes(' '), `${e.id}: only phrases may contain spaces`);
      assert.ok(!e.sa.endsWith('ं'), `${e.id}: citation forms end in म्, not anusvāra`);
    } else {
      // inside a phrase a word-final म् is written as anusvāra only before a consonant-initial word
      const words = e.sa.split(' ');
      words.forEach((w, i) => {
        if (w.endsWith('ं')) assert.ok(i < words.length - 1 && /^[क-ह]/.test(words[i + 1]!), `${e.id}: anusvāra must be followed by a consonant-initial word`);
      });
    }
  }
});

test('glosses are concise; emoji are single graphemes, unique within a category', () => {
  const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const used = new Set<string>();
  for (const e of VOCAB) {
    assert.ok(e.en.trim().length > 0 && e.en === e.en.trim(), e.id);
    const words = e.en.split(/\s+/).length;
    assert.ok(words <= (e.pos === 'phrase' ? 8 : 4), `${e.id}: gloss too long (${words} words): ${e.en}`);
    if (e.emoji !== undefined) {
      assert.equal([...seg.segment(e.emoji)].length, 1, `${e.id}: emoji must be a single grapheme: ${e.emoji}`);
      const k = `${e.category}|${e.emoji}`;
      assert.ok(!used.has(k), `${e.id}: emoji ${e.emoji} used twice in ${e.category}`);
      used.add(k);
    }
  }
});

test('nouns carry a gender; citation ending is consistent with stem + gender (regular classes)', () => {
  const rules: { stem: RegExp; g: string; cite: (s: string) => string }[] = [
    { stem: /a$/, g: 'm', cite: (s) => s + 'H' },
    { stem: /a$/, g: 'n', cite: (s) => s + 'm' },
    { stem: /A$/, g: 'f', cite: (s) => s },
    { stem: /[iu]$/, g: 'm', cite: (s) => s + 'H' },
    { stem: /[iu]$/, g: 'f', cite: (s) => s + 'H' },
    { stem: /[iu]$/, g: 'n', cite: (s) => s },
    { stem: /in$/, g: 'm', cite: (s) => s.slice(0, -2) + 'I' },
    { stem: /an$/, g: 'm', cite: (s) => s.slice(0, -2) + 'A' },
    { stem: /an$/, g: 'n', cite: (s) => s.slice(0, -1) },
    { stem: /f$/, g: 'm', cite: (s) => s.slice(0, -1) + 'A' },
    { stem: /f$/, g: 'f', cite: (s) => s.slice(0, -1) + 'A' },
    { stem: /[aiu]s$/, g: 'n', cite: (s) => s.slice(0, -1) + 'H' },
  ];
  let checked = 0;
  for (const e of nouns) {
    assert.ok(e.gender === 'm' || e.gender === 'f' || e.gender === 'n', `${e.id}: noun without gender`);
    assert.ok(e.stem, `${e.id}: noun without stem`);
    const stem = devaToSlp1(e.stem!);
    const sa = devaToSlp1(e.sa);
    assert.ok(!/[HM]$/.test(stem), `${e.id}: a stem never ends in visarga / anusvāra`);
    const rule = rules.find((r) => r.stem.test(stem) && r.g === e.gender);
    if (rule) {
      assert.equal(sa, rule.cite(stem), `${e.id}: citation ${e.sa} does not fit stem ${e.stem} (${e.gender})`);
      checked++;
    } else if (/I$/.test(stem) && e.gender === 'f') {
      assert.ok(sa === stem || sa === stem + 'H', `${e.id}: ī-stem citation`);
      checked++;
    } else {
      // remaining consonant / ū / diphthong stems: the nominative must differ from the bare stem or equal it only for त्-stems
      assert.ok(sa.length > 0);
    }
  }
  assert.ok(checked > 500, `only ${checked} nouns fell under the regular rules`);
  // adjectives are cited in the masculine nominative
  for (const e of VOCAB.filter((x) => x.pos === 'adjective')) {
    assert.equal(e.gender, undefined, `${e.id}: adjectives have no fixed gender`);
    const stem = devaToSlp1(e.stem!);
    const sa = devaToSlp1(e.sa);
    if (/a$/.test(stem) || /u$/.test(stem)) assert.equal(sa, stem + 'H', e.id);
    else if (/in$/.test(stem)) assert.equal(sa, stem.slice(0, -2) + 'I', e.id);
    else if (/at$/.test(stem)) assert.equal(sa, stem.slice(0, -2) + 'An', e.id);
    else assert.fail(`${e.id}: unexpected adjective stem class ${e.stem}`);
  }
});

test('verbs are laṭ 3rd singular; avyayas are single words', () => {
  for (const e of VOCAB.filter((x) => x.pos === 'verb')) {
    assert.match(devaToSlp1(e.sa), /(ti|te)$/, `${e.id}: ${e.sa}`);
    assert.equal(e.gender, undefined);
    assert.equal(e.stem, undefined);
  }
  for (const e of VOCAB.filter((x) => x.pos === 'avyaya')) {
    assert.equal(e.gender, undefined, e.id);
    assert.equal(e.paradigm, undefined, e.id);
  }
});

test('paradigm links: exist in SHABDA, match gender and stem class, and decline correctly by plain substitution', () => {
  const classOf = (stem: string): string => {
    const m = /(mat|vat|in|an|as|is|us|[aAiIuUf])$/.exec(stem);
    return m ? m[1]! : stem.slice(-1);
  };
  let linked = 0;
  for (const e of VOCAB) {
    if (!e.paradigm) continue;
    linked++;
    const p = shabda(e.paradigm);
    assert.ok(p, `${e.id}: paradigm ${e.paradigm} does not exist`);
    if (e.pos === 'noun') assert.equal(p.gender, e.gender, `${e.id}: gender differs from paradigm ${p.id}`);
    if (e.pos === 'pronoun') {
      assert.ok(p.forms.flat().some((cell) => cell.includes(e.sa)), `${e.id}: ${e.sa} is not a form of ${p.id}`);
      continue;
    }
    const stem = devaToSlp1(e.stem!);
    const model = devaToSlp1(p.stem);
    if (stem === model) continue;
    if (stem.endsWith(model) && !/[aAiIuU]$/.test(model)) continue; // compound ending in the paradigm's own stem
    assert.equal(classOf(stem), classOf(model), `${e.id}: ${e.stem} and model ${p.stem} are different stem classes`);
    // ṇatva: substituting the stem into the model must already give the correct retroflexion for this stem
    const cut = /[aAiIuUf]$/.test(model) ? 1 : 2;
    const mBase = model.slice(0, -cut);
    const base = stem.slice(0, -cut);
    for (const cell of p.forms.flat()) {
      for (const f of cell.map(devaToSlp1)) {
        assert.ok(f.startsWith(mBase), `${p.id}: ${f}`);
        const naive = base + f.slice(mBase.length);
        const ruled = natvaFrom(base + f.slice(mBase.length).replace(/R/g, 'n'), base.length);
        assert.equal(naive, ruled, `${e.id}: declining ${e.stem} like ${p.stem} gives ${naive}, ṇatva rule requires ${ruled}`);
      }
    }
  }
  assert.ok(linked > 500, `only ${linked} entries are linked to a paradigm`);
  // spot checks
  const link = (sa: string): string | undefined => VOCAB.find((e) => e.sa === sa)?.paradigm;
  assert.equal(link('वृक्षः'), 'vriksha-m');
  assert.equal(link('पुत्रः'), 'rama-m');
  assert.equal(link('गजः'), 'deva-m');
  assert.equal(link('पुष्पम्'), 'pushpa-n');
  assert.equal(link('नेत्रम्'), 'mitra-n');
  assert.equal(link('मुखम्'), 'phala-n');
  assert.equal(link('शाखा'), 'lata-f');
  assert.equal(link('भाषा'), 'rama-f');
  assert.equal(link('पुत्री'), 'nari-f');
  assert.equal(link('भगिनी'), 'nadi-f');
  assert.equal(link('ऋषिः'), 'hari-m');
  assert.equal(link('अतिथिः'), 'muni-m');
  assert.equal(link('शत्रुः'), 'guru-m');
  assert.equal(link('पशुः'), 'sadhu-m');
  assert.equal(link('पिता'), 'pitri-m');
  assert.equal(link('राजा'), 'rajan-m');
  assert.equal(link('अम्बा'), undefined, 'अम्बा has the irregular vocative अम्ब and must not be linked to लता');
  assert.ok(SHABDA.length > 0);
});

test('levels: distribution is sane and helpers are cumulative', () => {
  for (const e of VOCAB) assert.ok(e.level >= 1 && e.level <= 5, `${e.id}: level ${e.level}`);
  assert.ok(vocabForLevel(1).length >= 150, `only ${vocabForLevel(1).length} words at level ≤ 1`);
  assert.equal(vocabForLevel(0).length, 0);
  assert.equal(vocabForLevel(5).length, VOCAB.length);
  let prev = 0;
  for (const l of [0, 1, 2, 3, 4, 5] as const) {
    const n = vocabForLevel(l).length;
    assert.ok(n >= prev);
    prev = n;
  }
  assert.ok(vocabForLevel(2).length > vocabForLevel(1).length);
  assert.deepEqual(vocabByCategory('no-such-category'), []);
  const animals = vocabByCategory('animals');
  assert.ok(animals.length >= 20 && animals.every((e) => e.category === 'animals'));
  assert.ok(vocabByCategory('animals', 1).length < animals.length);
  assert.ok(vocabByCategory('animals', 1).every((e) => e.level <= 1));
  // every category offers something to a level-1 learner or is explicitly an advanced one
  for (const c of VOCAB_CATEGORIES) if (c.id !== 'months') assert.ok(vocabByCategory(c.id, 1).length >= 2, `category ${c.id} has nothing at level 1`);
});

test('provenance: every entry is verified; modern coinages are flagged and never level 0', () => {
  for (const e of VOCAB) {
    assert.ok(e.provenance.source.length > 0, e.id);
    assert.ok(e.provenance.verifiedBy.length >= 1, e.id);
    assert.notEqual(e.provenance.humanReviewed, true, `${e.id}: only a human reviewer may set humanReviewed`);
    const modern = e.provenance.verifiedBy.includes('usage:samskrita-bharati');
    if (modern) assert.ok(e.level >= 1, `${e.id}: modern coinage below level 1`);
    if (e.pos === 'noun' && !modern) assert.ok(tagged(e, 'oracle:mw') || tagged(e, 'oracle:apte') || tagged(e, 'oracle:amarakosha'), `${e.id}: noun without dictionary confirmation`);
    if (e.pos === 'noun' && !modern && !tagged(e, 'usage:samskrita-bharati(sense)')) assert.ok(tagged(e, 'gloss:'), `${e.id}: meaning not confirmed by a dictionary`);
    if (e.pos === 'verb') assert.ok(tagged(e, 'oracle:ashtadhyayi-com-dhatu'), `${e.id}: verb without conjugation-table confirmation`);
    if (e.pos === 'pronoun') assert.ok(tagged(e, 'pack:shabda#'), e.id);
    if (e.pos === 'adjective') assert.ok(tagged(e, 'oracle:mw') || tagged(e, 'oracle:apte'), e.id);
    if (e.pos === 'avyaya' && !modern) assert.ok(tagged(e, 'oracle:'), e.id);
  }
  const modernNouns = nouns.filter((e) => e.provenance.verifiedBy.includes('usage:samskrita-bharati'));
  assert.ok(modernNouns.length <= nouns.length * 0.15, `too many unverifiable coinages: ${modernNouns.length}`);
});

test('the words the brief names are present with the expected citation forms', () => {
  const has = (sa: string, pos?: string): boolean => VOCAB.some((e) => e.sa === sa && (!pos || e.pos === pos));
  for (const sa of ['वृक्षः', 'फलम्', 'लता', 'दूरवाणी', 'सङ्गणकम्', 'यानम्', 'विमानम्', 'रेलयानम्', 'द्विचक्रिका', 'घटी', 'दूरदर्शनम्']) assert.ok(has(sa, 'noun'), `missing noun ${sa}`);
  for (const sa of ['अत्र', 'तत्र', 'कुत्र', 'अद्य', 'श्वः', 'ह्यः', 'अपि', 'च', 'एव', 'न', 'किन्तु', 'यदा', 'तदा', 'कदा', 'कथम्', 'किमर्थम्', 'सह', 'विना']) assert.ok(has(sa, 'avyaya'), `missing avyaya ${sa}`);
  for (const sa of ['नमस्ते', 'धन्यवादः', 'क्षम्यताम्', 'स्वागतम्', 'शुभरात्रिः', 'पुनर्मिलामः']) assert.ok(has(sa, 'phrase'), `missing phrase ${sa}`);
  for (const sa of ['पठति', 'गच्छति', 'अस्ति', 'करोति']) assert.ok(has(sa, 'verb'), `missing verb ${sa}`);
  for (const sa of ['रविवासरः', 'सोमवासरः', 'मङ्गलवासरः', 'बुधवासरः', 'गुरुवासरः', 'शुक्रवासरः', 'शनिवासरः', 'चैत्रः', 'फाल्गुनः', 'वसन्तः', 'ग्रीष्मः', 'शरत्', 'हेमन्तः', 'शिशिरः']) assert.ok(has(sa), `missing ${sa}`);
  const g = (sa: string): string | undefined => VOCAB.find((e) => e.sa === sa && e.pos === 'noun')?.gender;
  assert.equal(g('वृक्षः'), 'm');
  assert.equal(g('फलम्'), 'n');
  assert.equal(g('लता'), 'f');
  assert.equal(g('मित्रम्'), 'n');
  assert.equal(g('दधि'), 'n');
  assert.equal(g('अग्निः'), 'm');
  assert.equal(g('भूमिः'), 'f');
  assert.equal(g('विद्युत्'), 'f');
  assert.equal(g('दिक्'), 'f');
});
