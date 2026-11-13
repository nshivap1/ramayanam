import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { METERS, checkAnustubh, identifyVerse, weights } from '../../sanskrit/chandas';
import { devaToSlp1, normalizeDeva, validateDeva } from '../../sanskrit/translit';
import { wordsRejoin } from '../../../tools/content/sahitya/verse-lib';
import { GITA_VERSES } from './data-gita';
import { OTHER_VERSES } from './data-other';
import { VERSES, meta, meterCounts, versesByMeter, versesForLevel } from './index';

const flat = (s: string): string => s.replace(/[।॥\s]/g, '');
const VIPULA = new Set(['LLL', 'GLL', 'GGG', 'GLG']); // na, bha, ma, ra gaṇa in syllables 5–7
const METER_SYLLABLES = new Map<string, number[]>([
  ['anustubh', [8]],
  ['upajati', [11, 12]],
  ...METERS.map((m): [string, number[]] => [m.id, [m.syllables]]),
]);

test('verse pack: size and spread', () => {
  assert.ok(VERSES.length >= 100, `expected ≥ 100 verses, got ${VERSES.length}`);
  assert.equal(meta.count, VERSES.length);
  assert.ok(GITA_VERSES.length >= 50, `Gītā verses: ${GITA_VERSES.length}`);
  assert.ok(OTHER_VERSES.length >= 40, `other verses: ${OTHER_VERSES.length}`);
  const longMetres = VERSES.filter((v) => v.meter !== 'anustubh');
  assert.ok(longMetres.length >= 15, `verses beyond anuṣṭubh: ${longMetres.length}`);
  assert.ok(new Set(longMetres.map((v) => v.meter)).size >= 6, 'expected at least 6 different longer metres');
  assert.ok(VERSES.filter((v) => v.words !== undefined).length >= 40, 'expected ≥ 40 verses with word lists');
  assert.equal(Object.values(meterCounts()).reduce((a, b) => a + b, 0), VERSES.length);
  assert.equal(versesByMeter('anustubh').length + longMetres.length, VERSES.length);
  assert.equal([0, 1, 2, 3, 4, 5].reduce((n, l) => n + versesForLevel(l as 0 | 1 | 2 | 3 | 4 | 5).length, 0), VERSES.length);
});

test('verse pack: ids are unique and no verse occurs twice', () => {
  const ids = new Set<string>();
  const texts = new Map<string, string>();
  for (const v of VERSES) {
    assert.match(v.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(v.id), `duplicate id ${v.id}`);
    ids.add(v.id);
    const key = devaToSlp1(flat(v.text));
    assert.ok(!texts.has(key), `${v.id} has the same text as ${texts.get(key)}`);
    texts.set(key, v.id);
  }
  for (const v of GITA_VERSES) {
    assert.match(v.id, /^bg-\d+-\d+$/);
    assert.equal(v.source.work, 'भगवद्गीता');
    assert.match(v.source.ref, /^[०-९]+\.[०-९]+$/);
  }
});

test('verse pack: text is valid Devanagari, four pādas that re-join to the printed text', () => {
  for (const v of VERSES) {
    for (const s of [v.text, ...v.padas, v.source.work, v.source.ref]) {
      const r = validateDeva(s, s === v.source.ref ? { allowPunctuation: '.' } : undefined);
      assert.ok(r.ok, `${v.id}: ${s}: ${r.errors.join('; ')}`);
      assert.equal(s, s.normalize('NFC'), `${v.id}: not NFC`);
    }
    assert.match(v.text, /^[^\n।॥]+ ।\n[^\n।॥]+ ॥$/, `${v.id}: text must be two lines ending in । and ॥`);
    assert.ok(!/[०-९0-9a-zA-Z|:-]/.test(v.text), `${v.id}: digits, Latin letters or ASCII punctuation in text`);
    assert.equal(v.padas.length, 4, `${v.id}: needs exactly 4 pādas`);
    for (const p of v.padas) assert.equal(p, normalizeDeva(p), `${v.id}: pāda not normalised`);
    assert.equal(flat(v.padas.join('')), flat(v.text), `${v.id}: pādas do not re-join to text`);
    const [l1, l2] = v.text.split('\n').map(flat) as [string, string];
    assert.equal(flat(`${v.padas[0]}${v.padas[1]}`), l1, `${v.id}: pādas 1–2 ≠ first line`);
    assert.equal(flat(`${v.padas[2]}${v.padas[3]}`), l2, `${v.id}: pādas 3–4 ≠ second line`);
  }
});

test('verse pack: syllable counts and metre are confirmed by the chandas engine', () => {
  for (const v of VERSES) {
    const allowed = METER_SYLLABLES.get(v.meter);
    assert.ok(allowed !== undefined, `${v.id}: unknown metre ${v.meter}`);
    const counts = v.padas.map((p) => weights(p).length);
    for (const n of counts) assert.ok(allowed.includes(n), `${v.id}: a pāda has ${n} syllables, ${v.meter} needs ${allowed.join(' or ')}`);
    assert.equal(new Set(counts).size, 1, `${v.id}: pādas of unequal length ${counts.join(',')}`);
    const id = identifyVerse(v.padas);
    if (v.meterNote === undefined) {
      assert.equal(id.meter, v.meter, `${v.id}: engine identifies ${id.meter}, pack says ${v.meter}`);
      continue;
    }
    // anuṣṭubh with a vipulā pāda: the engine's pathyā check must fail exactly where the note says
    assert.equal(v.meter, 'anustubh', `${v.id}: meterNote is only used for anuṣṭubh`);
    assert.match(v.meterNote, /^vipulā \((pāda [13]: (na|bha|ma|ra)-vipulā(, )?)+\)$/, `${v.id}: meterNote format`);
    assert.equal(id.meter, null, `${v.id}: has a meterNote but the engine accepts it as regular ${id.meter}`);
    v.padas.forEach((p, i) => {
      const chk = checkAnustubh(p, i as 0 | 1 | 2 | 3);
      assert.equal(chk.syllables, 8, `${v.id}: pāda ${i + 1}`);
      const noted = v.meterNote?.includes(`pāda ${i + 1}:`) === true;
      if (i % 2 === 1) assert.ok(chk.ok, `${v.id}: even pāda ${i + 1} must be regular: ${chk.issues.join('; ')}`);
      else if (chk.ok) assert.ok(!noted, `${v.id}: pāda ${i + 1} is regular but noted as vipulā`);
      else {
        assert.ok(noted, `${v.id}: pāda ${i + 1} is irregular but not noted`);
        assert.ok(VIPULA.has(chk.pattern.slice(4, 7)), `${v.id}: pāda ${i + 1} (${chk.pattern}) is not a classical vipulā`);
        assert.equal(chk.pattern.charAt(7) !== '', true);
      }
    });
  }
});

test('verse pack: translations, themes, levels, provenance', () => {
  const seen = new Set<string>();
  for (const v of VERSES) {
    assert.ok(v.translation.length >= 40, `${v.id}: translation too short`);
    assert.ok(!/[ऀ-ॿ]/.test(v.translation), `${v.id}: Devanagari in translation`);
    assert.ok(!seen.has(v.translation), `${v.id}: duplicate translation`);
    seen.add(v.translation);
    assert.match(v.theme, /^[a-zāīūṛṅñṭḍṇśṣṃḥ]+$/, `${v.id}: theme`);
    assert.ok(Number.isInteger(v.level) && v.level >= 2 && v.level <= 5, `${v.id}: level`);
    const corpora = v.provenance.verifiedBy.filter((x) => x.startsWith('corpus:'));
    assert.ok(corpora.length >= 1, `${v.id}: no corpus in provenance`);
    assert.ok(v.provenance.verifiedBy.some((x) => x.startsWith('engine:identifyVerse') || x.startsWith('engine:checkAnustubh')), `${v.id}: no metre check in provenance`);
    assert.ok(v.provenance.source.length > 10);
  }
  for (const v of GITA_VERSES) {
    assert.ok(v.provenance.verifiedBy.filter((x) => x.startsWith('corpus:')).length >= 2, `${v.id}: a Gītā verse needs two agreeing corpora`);
  }
});

test('verse pack: word lists are valid and re-join (through the sandhi engine) to the verse text', () => {
  let n = 0;
  for (const v of VERSES) {
    if (v.words === undefined) continue;
    n += 1;
    assert.ok(v.words.length >= 5, `${v.id}: suspiciously short word list`);
    for (const w of v.words) {
      assert.ok(validateDeva(w.sa).ok && !/[\s।॥ऽ-]/.test(w.sa), `${v.id}: bad word ${w.sa}`);
      assert.ok(w.en.trim() !== '' && !/[ऀ-ॿ]/.test(w.en), `${v.id}: bad gloss for ${w.sa}`);
    }
    assert.ok(wordsRejoin(v.words.map((w) => w.sa), v.text), `${v.id}: words do not re-join to the text`);
    assert.ok(v.provenance.verifiedBy.includes('engine:joinSandhi(words)'), `${v.id}: provenance lacks the words check`);
  }
  assert.ok(n >= 40);
  // the check has teeth: a wrong case form, a missing word and a wrong order are all rejected
  const bg = VERSES.find((v) => v.id === 'bg-2-47');
  assert.ok(bg?.words !== undefined);
  const good = bg.words.map((w) => w.sa);
  assert.ok(wordsRejoin(good, bg.text));
  assert.ok(!wordsRejoin(good.map((w) => (w === 'फलेषु' ? 'फलेन' : w)), bg.text));
  assert.ok(!wordsRejoin(good.slice(1), bg.text));
  assert.ok(!wordsRejoin([good[1] as string, good[0] as string, ...good.slice(2)], bg.text));
});

test('verse pack: generator output matches the corpora (needs SAMSKURU_ORACLES)', async (t) => {
  const oracles = process.env.SAMSKURU_ORACLES ?? '/home/claude/refs/data';
  if (!existsSync(`${oracles}/vedicscriptures_bhagavad-gita`)) {
    t.skip('corpora not present: corpus re-verification skipped');
    return;
  }
  const gen = await import('../../../tools/content/sahitya/gen-verses');
  const g = gen.generateVerses();
  if (!g.complete) {
    t.skip('some corpora missing: corpus re-verification skipped');
    return;
  }
  assert.equal(readFileSync(gen.VERSE_FILES.gita, 'utf8'), g.gita, 'data-gita.ts is out of date with the corpora / specs');
  assert.equal(readFileSync(gen.VERSE_FILES.other, 'utf8'), g.other, 'data-other.ts is out of date with the corpora / specs');
});
