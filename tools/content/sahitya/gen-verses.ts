/**
 * Generates src/content/subhashita/data-gita.ts and data-other.ts from sources/verses-gita.ts and
 * sources/verses-other.ts.
 *
 *   node --import tsx tools/content/sahitya/gen-verses.ts [--check]
 *
 * For every selected verse the TEXT is copied from a corpus under SAMSKURU_ORACLES (never typed):
 *   Bhagavad-gītā   primary: vedicscriptures/bhagavad-gita (Devanagari); it must agree, sound for sound, with at
 *                   least one other witness (gita/gita, DharmicData, GRETIL) — else the verse is dropped.
 *   other verses    primary: the witness named in the spec (Subhāṣitaratnabhāṇḍāgāra in Devanagari, or a GRETIL
 *                   TEI file in IAST converted mechanically); every other corpus that has exactly the same
 *                   reading is recorded in `provenance.verifiedBy`.
 * The text must pass validateDeva, split into four pādas and be recognised by the chandas engine
 * (identifyVerse; for anuṣṭubh with a vipulā pāda: checkAnustubh on the even pādas + the vipulā table).
 * A `words` list is emitted only if the sandhi engine re-joins it into exactly the verse text.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeDeva, validateDeva } from '../../../src/sanskrit/translit';
import { cmpKeyDeva, cmpKeyIast, hasOracle, oraclePath, q } from './lib';
import { GITA_SPECS } from './sources/verses-gita';
import { OTHER_SPECS, OTHER_WORDS } from './sources/verses-other';
import { gitaOtherKeys, gitaPrimary, gretilFiles, gretilToDevaLines, gretilVerses, printedText, scanVerse, srbVerses, wordsRejoin } from './verse-lib';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '..', '..', '..', 'src', 'content', 'subhashita');
export const VERSE_FILES = { gita: join(OUT_DIR, 'data-gita.ts'), other: join(OUT_DIR, 'data-other.ts') };
const REPORT = join(here, 'reports', 'verses-report.txt');

const DEVA_DIGITS = '०१२३४५६७८९';
const devaNum = (s: string): string => s.replace(/[0-9]/g, (d) => DEVA_DIGITS.charAt(Number(d)));

interface Built {
  block: string;
  key: string;
  meter: string;
  words: boolean;
  witnesses: number;
}

function parseWords(spec: string | undefined): { sa: string; en: string }[] | undefined {
  if (spec === undefined) return undefined;
  return spec.split('|').map((pair) => {
    const i = pair.indexOf('=');
    if (i < 0) throw new Error(`bad word entry "${pair}"`);
    return { sa: pair.slice(0, i).trim().normalize('NFC'), en: pair.slice(i + 1).trim() };
  });
}

function build(
  id: string,
  lines: string[],
  meta: { work: string; ref: string; theme: string; level: number; translation: string; words?: string },
  provenanceSource: string,
  corpora: string[],
  report: string[],
): Built | undefined {
  const bad = lines.flatMap((l) => validateDeva(l).errors.map((e) => `${l}: ${e}`));
  if (bad.length > 0) {
    report.push(`DROP ${id}: invalid Devanagari in corpus text: ${bad.join('; ')}`);
    return undefined;
  }
  const scanned = scanVerse(lines);
  if (scanned === undefined) {
    report.push(`DROP ${id}: the chandas engine does not recognise the metre: ${lines.join(' / ')}`);
    return undefined;
  }
  const text = printedText(lines);
  const flat = (s: string): string => s.replace(/[।॥\s]/g, '');
  if (flat(scanned.padas.join('')) !== flat(text)) {
    report.push(`DROP ${id}: pādas do not re-join to the text`);
    return undefined;
  }
  const verifiedBy = corpora.map((c) => `corpus:${c}`);
  verifiedBy.push(scanned.meterNote === undefined ? 'engine:identifyVerse' : 'engine:checkAnustubh+vipula');
  const words = parseWords(meta.words);
  let wordsOk = false;
  if (words !== undefined) {
    const badWord = words.find((w) => !validateDeva(w.sa).ok || /\s/.test(w.sa) || w.en === '');
    if (badWord !== undefined) report.push(`WORDS-DROPPED ${id}: bad entry ${badWord.sa}`);
    else if (!wordsRejoin(words.map((w) => w.sa), text)) report.push(`WORDS-DROPPED ${id}: the word list does not re-join to the verse text`);
    else {
      wordsOk = true;
      verifiedBy.push('engine:joinSandhi(words)');
    }
  }
  const out: string[] = ['  {'];
  out.push(`    id: ${q(id)},`);
  out.push(`    padas: [${scanned.padas.map(q).join(', ')}],`);
  out.push(`    text: ${q(text)},`);
  out.push(`    meter: ${q(scanned.meter)},`);
  if (scanned.meterNote !== undefined) out.push(`    meterNote: ${q(scanned.meterNote)},`);
  out.push(`    translation: ${q(meta.translation)},`);
  if (wordsOk && words !== undefined) {
    out.push('    words: [');
    for (const w of words) out.push(`      { sa: ${q(w.sa)}, en: ${q(w.en)} },`);
    out.push('    ],');
  }
  out.push(`    source: { work: ${q(meta.work)}, ref: ${q(devaNum(meta.ref))} },`);
  out.push(`    theme: ${q(meta.theme)},`);
  out.push(`    level: ${meta.level},`);
  out.push(`    provenance: { source: ${q(provenanceSource)}, verifiedBy: [${verifiedBy.map(q).join(', ')}] },`);
  out.push('  },');
  return { block: out.join('\n'), key: cmpKeyDeva(lines.join(' ').replace(/-/g, '')), meter: scanned.meter, words: wordsOk, witnesses: corpora.length };
}

// --- witnesses for non-Gītā verses ----------------------------------------------------------------------------
interface Witness {
  name: string;
  has(key: string): boolean;
}
let witnessCache: Witness[] | undefined;
function witnesses(): Witness[] {
  if (witnessCache !== undefined) return witnessCache;
  const out: Witness[] = [];
  for (const f of gretilFiles()) {
    const keys = gretilVerses(f).map((v) => v.key);
    const name = `gretil/${f.replace(/^sa_/, '').replace(/\.xml$/, '')}`;
    // `endsWith`: a GRETIL verse block may begin with an introductory "tathā coktam" line
    out.push({ name, has: (k) => keys.some((x) => x === k || (x.endsWith(k) && x.length - k.length <= 24)) });
  }
  const srbKeys = new Set(srbVerses().map((v) => v.key));
  if (srbKeys.size > 0) out.push({ name: 'subhashitaratnabhandagara', has: (k) => srbKeys.has(k) });
  const wholeFile = (name: string, ...path: string[]): void => {
    const p = oraclePath(...path);
    if (!existsSync(p)) return;
    const key = cmpKeyDeva(readFileSync(p, 'utf8').replace(/:/g, 'ः'));
    // a verse-final m is anusvāra when the file continues with a consonant: compare without it
    out.push({ name, has: (k) => key.includes(k.replace(/[mM]$/, '')) });
  };
  const eb = ['sanskrit_raw_etexts', 'mixed', 'ebhAratI-sampat'];
  wholeFile('ebharati/hitopadesha', ...eb, 'kAvyAni', 'kathA', 'nArAyaNapaNDitaH', 'hitopadeshaH.md');
  wholeFile('ebharati/panchatantra', ...eb, 'kAvyAni', 'kathA', 'viShNusharmA', 'panchatantrakam.md');
  wholeFile('ebharati/chanakyanitidarpana', ...eb, 'dharmashAstram', 'rAjanItiH', 'chANakyaH', 'mihirachandrasharmA', 'chANakyanItidarpaNaH.md');
  wholeFile('ebharati/chanakyashataka', ...eb, 'dharmashAstram', 'nItishAstram', 'chANakyaH', 'chANakyashatakam.md');
  wholeFile('ebharati/bhartrhari-shatakatraya', ...eb, 'dharmashAstram', 'nItishAstram', 'bhartRhariH', 'nItishatakaM_shRngArashatakaM_vairAgyashatakaM_cha.md');
  const tsvDir = oraclePath('sanskrit-coders_subhAShita-db-sanskrit', 'mUlAni', 'vishvAsa-priya-padyAni');
  if (existsSync(tsvDir)) {
    const f = readdirSync(tsvDir).find((x) => x.endsWith('.tsv'));
    if (f !== undefined) wholeFile('vishvasa-priya-padyani', 'sanskrit-coders_subhAShita-db-sanskrit', 'mUlAni', 'vishvAsa-priya-padyAni', f);
  }
  witnessCache = out;
  return out;
}

const INTRO = /^(anyac ca|aparaṃ ca|tathā ca|tathā coktam|tathā hi|uktaṃ ca|kiṃ ca|api ca|yataḥ|tad uktam)\b/;

export interface GeneratedVerses {
  gita: string;
  other: string;
  summary: string[];
  complete: boolean;
}

function fileHeader(name: string, what: string): string {
  return `/**
 * GENERATED by tools/content/sahitya/gen-verses.ts — do not edit by hand.
 * ${what}
 * The Sanskrit text of every verse is copied from the corpus named in \`provenance\`; translations and word glosses
 * are Samskuru's own. data.test.ts re-checks syllable counts and metre with the chandas engine on every run.
 */
import type { Verse } from './types';

export const ${name}: readonly Verse[] = [
`;
}

export function generateVerses(): GeneratedVerses {
  const report: string[] = [];
  const seenKeys = new Map<string, string>();
  const stats = { gita: 0, other: 0, dropped: 0, words: 0, single: [] as string[], meters: new Map<string, number>() };
  const accept = (id: string, b: Built | undefined, blocks: string[]): boolean => {
    if (b === undefined) {
      stats.dropped++;
      return false;
    }
    const dup = seenKeys.get(b.key);
    if (dup !== undefined) {
      report.push(`DROP ${id}: same text as ${dup}`);
      stats.dropped++;
      return false;
    }
    seenKeys.set(b.key, id);
    blocks.push(b.block);
    stats.meters.set(b.meter, (stats.meters.get(b.meter) ?? 0) + 1);
    if (b.words) stats.words++;
    return true;
  };

  // ---- Bhagavad-gītā
  const gitaBlocks: string[] = [];
  for (const s of GITA_SPECS) {
    const id = `bg-${s.ch}-${s.v}`;
    const lines = gitaPrimary(s.ch, s.v);
    if (lines === undefined) {
      report.push(`DROP ${id}: not found in the primary corpus`);
      stats.dropped++;
      continue;
    }
    const key = cmpKeyDeva(lines.join(' ').replace(/-/g, ''));
    const others = gitaOtherKeys(s.ch, s.v);
    const agree = others.filter((o) => o.key === key).map((o) => o.name);
    if (agree.length === 0) {
      report.push(`DROP ${id}: no second corpus has the same reading (${others.map((o) => o.name).join(', ')} differ)`);
      stats.dropped++;
      continue;
    }
    const differ = others.filter((o) => o.key !== key).map((o) => o.name);
    if (differ.length > 0) report.push(`NOTE ${id}: reading differs in ${differ.join(', ')} (agrees with ${agree.join(', ')})`);
    const corpora = ['vedicscriptures/bhagavad-gita', ...agree.map((a) => (a === 'GRETIL' ? 'gretil/bhagavadgItA' : a))];
    const b = build(id, lines, { work: 'भगवद्गीता', ref: `${s.ch}.${s.v}`, theme: s.theme, level: s.level, translation: s.translation, words: s.words }, `Bhagavad-gītā ${s.ch}.${s.v}; text of vedicscriptures/bhagavad-gita`, corpora, report);
    if (accept(id, b, gitaBlocks)) stats.gita++;
  }

  // ---- other verses
  const otherBlocks: string[] = [];
  for (const s of OTHER_SPECS) {
    let lines: string[] | undefined;
    let primary = '';
    let label = '';
    if (s.from === 'srb') {
      const k = cmpKeyDeva(s.find);
      const v = srbVerses().find((x) => x.key.startsWith(k));
      if (v !== undefined) {
        lines = v.lines.map((l) => normalizeDeva(l));
        primary = 'subhashitaratnabhandagara';
        label = `Subhāṣitaratnabhāṇḍāgāra (${v.ref}), Devanagari e-text in sanskrit/raw_etexts`;
        if (devaNum(s.ref) !== devaNum(v.ref) && s.work === 'सुभाषितरत्नभाण्डागारम्') report.push(`NOTE ${s.id}: spec ref "${s.ref}" ≠ corpus ref "${v.ref}"`);
      }
    } else if (s.from.startsWith('gretil:')) {
      const stem = s.from.slice(7);
      const k = cmpKeyIast(s.find);
      const v = gretilVerses(`sa_${stem}.xml`).find((x) => x.key.startsWith(k) || (x.key.includes(k) && x.key.indexOf(k) <= 24));
      if (v !== undefined) {
        let src = v.lines;
        while (src.length > 2 && src.length % 2 === 1 && (INTRO.test((src[0] as string).toLowerCase()) || (src[0] as string).length < 24)) src = src.slice(1);
        if (src.length === 4) src = [`${src[0]} ${src[1]}`, `${src[2]} ${src[3]}`];
        lines = gretilToDevaLines(src);
        if (lines === undefined) report.push(`DROP ${s.id}: the GRETIL lines contain non-IAST marks: ${src.join(' / ')}`);
        primary = `gretil/${stem}`;
        label = `GRETIL e-text ${stem}${v.ref === '' ? '' : ` (${v.ref})`}, IAST converted to Devanagari`;
      }
    }
    if (lines === undefined) {
      if (primary === '') report.push(`DROP ${s.id}: "${s.find}" not found in ${s.from}`);
      stats.dropped++;
      continue;
    }
    const key = cmpKeyDeva(lines.join(' '));
    const also = witnesses()
      .filter((w) => w.name !== primary && w.has(key))
      .map((w) => w.name);
    const b = build(s.id, lines, { ...s, words: s.words ?? OTHER_WORDS[s.id] }, label, [primary, ...also], report);
    if (accept(s.id, b, otherBlocks)) {
      stats.other++;
      if (also.length === 0) stats.single.push(s.id);
    }
  }

  const gita = `${fileHeader('GITA_VERSES', 'Bhagavad-gītā verses.')}${gitaBlocks.join('\n')}\n];\n`;
  const other = `${fileHeader('OTHER_VERSES', 'Subhāṣitas, kāvya openings and stotra verses.')}${otherBlocks.join('\n')}\n];\n`;
  const summary = [
    `Gītā verses ${stats.gita}, other verses ${stats.other}, dropped ${stats.dropped}, with verified word lists ${stats.words}`,
    `metres: ${[...stats.meters].map(([k, v]) => `${k} ${v}`).join(', ')}`,
    `single-witness verses (${stats.single.length}): ${stats.single.join(', ')}`,
    '',
    ...report,
  ];
  const complete = hasOracle('vedicscriptures_bhagavad-gita') && hasOracle('ambuda-org_gretil-sahitya') && hasOracle('sanskrit_raw_etexts') && hasOracle('gita_gita');
  return { gita, other, summary, complete };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const g = generateVerses();
  console.log(g.summary.join('\n'));
  if (process.argv.includes('--check')) {
    const same = existsSync(VERSE_FILES.gita) && readFileSync(VERSE_FILES.gita, 'utf8') === g.gita && existsSync(VERSE_FILES.other) && readFileSync(VERSE_FILES.other, 'utf8') === g.other;
    console.log(same ? 'verse data files are up to date' : 'verse data files DIFFER from generator output');
    process.exit(same ? 0 : 1);
  }
  if (!g.complete) {
    console.error('Corpora missing under SAMSKURU_ORACLES: refusing to overwrite the verse data files.');
    process.exit(2);
  }
  writeFileSync(VERSE_FILES.gita, g.gita);
  writeFileSync(VERSE_FILES.other, g.other);
  writeFileSync(REPORT, `${g.summary.join('\n')}\n`);
}
