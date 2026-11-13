/**
 * Oracle re-verification: when the reference datasets are available (env SAMSKURU_ORACLES, default
 * /home/claude/refs/data) every paradigm is re-derived from them and must equal the committed data,
 * and every stored form must be attested as the pack's rule requires. Skipped when the datasets are absent.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build, render } from '../../../tools/content/nominal/gen-shabda';
import { cellName, derive, toDeva } from '../../../tools/content/nominal/lib/derive';
import { loadAshtadhyayi, loadHuet, oraclesAvailable } from '../../../tools/content/nominal/lib/oracles';
import { canon, natvaApplies } from '../../../tools/content/nominal/lib/slp';
import { SHABDA_SPECS } from '../../../tools/content/nominal/shabda-spec';
import { devaToSlp1 } from '../../sanskrit/translit';
import { SHABDA } from './index';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const skip = oraclesAvailable() ? false : 'reference datasets not present (set SAMSKURU_ORACLES)';

test('oracle: regenerated pack is identical to the committed data.ts', { skip }, () => {
  const { built, dropped } = build();
  assert.deepEqual(dropped, [], 'no paradigm of the spec may fail verification silently');
  assert.equal(built.length, SHABDA.length);
  const committed = readFileSync(fileURLToPath(new URL('./data.ts', import.meta.url)), 'utf8');
  assert.equal(render(built), committed, 'data.ts is stale — run tools/content/nominal/gen-shabda.ts');
});

test('oracle: every stored form is attested by two source families (or by an explicit, reasoned exception)', { skip }, () => {
  const byId = new Map(SHABDA.map((p) => [p.id, p]));
  let cells = 0;
  let forms = 0;
  let exceptions = 0;
  for (const spec of SHABDA_SPECS) {
    const p = byId.get(spec.id);
    assert.ok(p, `${spec.id} missing from pack`);
    const d = derive(spec);
    const families = new Set(d.sources.map((s) => s.family));
    assert.ok(families.size >= 2, `${spec.id}: fewer than two source families`);
    const allowed = new Set(d.leftovers.filter((l) => l.verdict === 'accepted-by-rule' || l.verdict === 'accepted-by-spec').map((l) => `${l.cell}:${l.form}`));
    for (let i = 0; i < 24; i++) {
      const stored: readonly string[] = p.forms[Math.floor(i / 3)]?.[i % 3] ?? [];
      if (stored.length) cells++;
      for (const deva of stored) {
        forms++;
        const f: string = canon(devaToSlp1(deva));
        const attesting = new Set(d.sources.filter((s) => (s.cells[i] ?? []).includes(f)).map((s) => s.family));
        if (attesting.size >= 2) continue;
        assert.ok(allowed.has(`${cellName(i)}:${f}`), `${spec.id} ${cellName(i)} ${deva}: attested only by ${[...attesting].join(', ') || 'nobody'}`);
        assert.ok(attesting.size >= 1, `${spec.id} ${cellName(i)} ${deva}: not attested at all`);
        exceptions++;
      }
    }
  }
  assert.ok(cells > 3000, `expected > 3000 verified cells, got ${cells}`);
  assert.ok(exceptions <= 30, `too many single-family exceptions (${exceptions}); review tools/content/nominal/reports/shabda-report.md`);
  assert.ok(forms >= cells);
});

/**
 * Every place where a whole-word source table lists a cell but does not contain the pack's display form.
 * Each line was examined by hand (see REVIEW.md → "Known disagreements between sources"); a new line here
 * means a source changed or a paradigm was added and must be investigated before the list is edited.
 */
const KNOWN_SOURCE_DISAGREEMENTS = [
  // Heritage prints the nominative for the vocative of महत्; vidyut and Kale agree on हे महन् (6.4.8/6.4.10: no lengthening in sambuddhi)
  'mahat-m 8.1 महन् | heritage-huet | महान्',
  // slips in the learnsanskrit.org (Kale) CSV: typos …
  'sakhi-m 7.3 सखिषु | learnsanskrit-kale | सखीषु',
  'svasri-f 8.1 स्वसः | learnsanskrit-kale | स्वसाः',
  'adas-m 6.3 अमीषाम् | learnsanskrit-kale | अमीनाम्',
  'adas-n 6.3 अमीषाम् | learnsanskrit-kale | अमीनाम्',
  'shash 1.3 षट् | learnsanskrit-kale | षष्',
  // … and rows filed under the wrong case number (neuter vocatives keyed as case 7; अष्टन् shifted by one case)
  'sarva-n 7.1 सर्वस्मिन् | learnsanskrit-kale | सर्वम्',
  'sarva-n 7.2 सर्वयोः | learnsanskrit-kale | सर्वे',
  'sarva-n 7.3 सर्वेषु | learnsanskrit-kale | सर्वाणि',
  'anya-n 7.1 अन्यस्मिन् | learnsanskrit-kale | अन्यम्',
  'anya-n 7.2 अन्ययोः | learnsanskrit-kale | अन्ये',
  'anya-n 7.3 अन्येषु | learnsanskrit-kale | अन्यानि',
  'eka-n 7.1 एकस्मिन् | learnsanskrit-kale | एकम्',
  'eka-n 7.2 एकयोः | learnsanskrit-kale | एके',
  'eka-n 7.3 एकेषु | learnsanskrit-kale | एकानि',
  'dvi-n 7.2 द्वयोः | learnsanskrit-kale | द्वे',
  'ashtan 2.3 अष्ट | learnsanskrit-kale | अष्टभिः/अष्टाभिः',
  'ashtan 3.3 अष्टभिः | learnsanskrit-kale | अष्टभ्यः/अष्टाभ्यः',
  'ashtan 5.3 अष्टभ्यः | learnsanskrit-kale | अष्टानाम्',
  'ashtan 6.3 अष्टानाम् | learnsanskrit-kale | अष्टसु/अष्टासु',
];

test('oracle: the display form of every cell is in every whole-word source that lists the cell (known disagreements pinned)', { skip }, () => {
  const found: string[] = [];
  for (const spec of SHABDA_SPECS) {
    const d = derive(spec);
    for (const src of d.sources) {
      if (src.tag.includes('kale-endings')) continue; // generic ending tables are checked form-by-form above
      const name = src.tag.replace(/^(oracle|model):/, '').replace(/[#(].*$/, '');
      for (let i = 0; i < 24; i++) {
        const first = d.cells[i]?.[0];
        const theirs = src.cells[i] ?? [];
        if (!first || theirs.length === 0) continue; // an empty cell in a source (e.g. no vocative) is not a disagreement
        if (!theirs.includes(first)) found.push(`${spec.id} ${cellName(i)} ${toDeva(first)} | ${name} | ${theirs.map(toDeva).join('/')}`);
      }
    }
  }
  assert.deepEqual(found.sort(), [...KNOWN_SOURCE_DISAGREEMENTS].sort());
});

test('oracle: the ṇatva helper used for model / ending-table derivations agrees with both oracles', { skip }, () => {
  // inflectional n after the stem: rule output must match what the oracles print, over every table they have
  let checked = 0;
  const bad: string[] = [];
  const exceptions = /(Gn|zaRRAm$|^kuRqin)/; // हन्-stems (8.4.22), षण्णाम् (ṣṭutva), कौण्डिन्य plural stem
  for (const e of loadAshtadhyayi().values()) {
    const stem = devaToSlp1(e.word);
    for (const cell of e.cells)
      for (const f of cell) {
        let p = 0;
        while (p < stem.length && p < f.length && stem[p] === f[p]) p++;
        for (let i = p; i < f.length; i++) {
          const c = f[i];
          if (c !== 'n' && c !== 'R') continue;
          checked++;
          const should = natvaApplies(f.slice(0, i) + 'n' + f.slice(i + 1), i);
          if (should !== (c === 'R') && !exceptions.test(f)) bad.push(`${e.urlid}:${f}`);
        }
      }
  }
  assert.ok(checked > 20000, `checked ${checked}`);
  assert.ok(bad.length <= 40, `ṇatva helper disagrees with ashtadhyayi.com on ${bad.length} forms: ${bad.slice(0, 10).join(' ')}`);
  assert.ok(loadHuet().size > 30000);
});
