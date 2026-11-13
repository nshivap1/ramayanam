/**
 * Generates src/content/samasa/data.ts from sources/samasa.txt.
 *
 *   node --import tsx tools/content/sahitya/gen-samasa.ts [--check]
 *
 * Checks per item (all mechanical; the type / vigraha judgement itself is the author's and is listed for human
 * review in src/content/samasa/REVIEW.md):
 *   - every string is valid Devanagari;
 *   - every member stem is a Monier-Williams or Apte headword;
 *   - every word of the vigraha is a known inflected form: found in the ashtadhyayi.com subanta table, formed from a
 *     dictionary stem by the same ending-replacement as a paradigm of that table (analogy, with ṇatva applied), a
 *     present-tense form of the ashtadhyayi.com tiṅanta table, or one of the indeclinables listed below;
 *   - whether the compound itself is a MW / Apte headword is recorded (`oracle:mw-headword`, `oracle:apte-headword`).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyNatva } from '../../../src/sanskrit/sandhi';
import { devaToSlp1, validateDeva } from '../../../src/sanskrit/translit';
import { apteAttests, loadDict, mwAttests, mwKey, oraclePath, q, stemCandidates } from './lib';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, 'sources', 'samasa.txt');
export const SAMASA_DATA_FILE = join(here, '..', '..', '..', 'src', 'content', 'samasa', 'data.ts');
const REPORT = join(here, 'reports', 'samasa-report.txt');

const TYPES = ['tatpurusha', 'karmadharaya', 'dvigu', 'dvandva', 'bahuvrihi', 'avyayibhava', 'nan-tatpurusha', 'upapada'];
/** Indeclinables used in vigrahas (not in the subanta / tiṅanta tables). */
const AVYAYA = new Set(['च', 'इव', 'एव', 'न', 'इति', 'प्रति', 'बहिः', 'पश्चात्', 'अनतिक्रम्य', 'द्विः']);

interface Paradigm {
  stem: string;
  forms: string[];
}
interface Oracle {
  nominal: Set<string>;
  verbal: Set<string>;
  paradigms: Paradigm[];
}
let oracleCache: Oracle | undefined | null = null;
function loadOracle(): Oracle | undefined {
  if (oracleCache !== null) return oracleCache;
  const p1 = oraclePath('ashtadhyayi-com_data', 'shabda', 'data2.txt');
  const p2 = oraclePath('ashtadhyayi-com_data', 'dhatu', 'dhatuforms_vidyut_shuddha_kartari.txt');
  if (!existsSync(p1) || !existsSync(p2)) {
    oracleCache = undefined;
    return undefined;
  }
  const nominal = new Set<string>();
  const paradigms: Paradigm[] = [];
  const data = (JSON.parse(readFileSync(p1, 'utf8')) as { data: { word: string; forms: string }[] }).data;
  for (const row of data) {
    const forms: string[] = [];
    for (const cell of row.forms.split(';')) {
      for (const alt of cell.split('-')) {
        const f = devaToSlp1(alt.replace(/^हे /, '').trim());
        if (f !== '') {
          forms.push(f);
          nominal.add(f);
        }
      }
    }
    paradigms.push({ stem: devaToSlp1(row.word), forms });
  }
  const verbal = new Set<string>();
  const verbs = JSON.parse(readFileSync(p2, 'utf8')) as Record<string, Record<string, string>>;
  for (const entry of Object.values(verbs)) {
    for (const key of ['plat', 'alat']) {
      const cells = entry[key];
      if (cells === undefined) continue;
      for (const cell of cells.split(';')) for (const alt of cell.split(',')) verbal.add(devaToSlp1(alt.trim()));
    }
  }
  oracleCache = { nominal, verbal, paradigms };
  return oracleCache;
}

function commonPrefix(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a.charAt(n) === b.charAt(n)) n++;
  return n;
}

/** Is `word` formed from `stem` by the ending-replacement of some oracle paradigm whose stem ends like `stem`? */
function byAnalogy(o: Oracle, stem: string, word: string): boolean {
  const last2 = stem.slice(-2);
  for (const p of o.paradigms) {
    if (p.stem === stem || p.stem.length < 2 || !p.stem.endsWith(last2)) continue;
    for (const f of p.forms) {
      const k = commonPrefix(p.stem, f);
      const tail = p.stem.slice(k);
      if (tail.length > 2 || !stem.endsWith(tail)) continue;
      // the model's ending may carry its own ṇatva (अर्काणाम्): undo it, then apply ṇatva for THIS stem
      const cand = stem.slice(0, stem.length - tail.length) + f.slice(k).replace(/R/g, 'n');
      if (applyNatva(cand) === word) return true;
    }
  }
  return false;
}

/** Returns how the vigraha word was validated, or undefined. */
function validForm(o: Oracle, dict: Set<string>, wordDeva: string, memberStems: string[]): string | undefined {
  if (AVYAYA.has(wordDeva)) return 'avyaya';
  const w = devaToSlp1(wordDeva.replace(/ं$/, 'म्'));
  if (o.nominal.has(w)) return 'subanta-table';
  if (o.verbal.has(w)) return 'tinanta-table';
  // A word that visibly belongs to a member stem must be explained by THAT stem (so नद्यस्य is not excused by
  // some other dictionary stem); only words unrelated to the members fall back to dictionary stems.
  const related = memberStems.map((m) => devaToSlp1(m)).filter((m) => m.length >= 4 && w.startsWith(m.slice(0, -1)));
  if (related.length > 0) {
    for (const m of related) {
      if (byAnalogy(o, m, w)) return 'analogy';
      if (m.endsWith('a') && byAnalogy(o, `${m.slice(0, -1)}A`, w)) return 'analogy';
    }
    return undefined;
  }
  const stems = new Set<string>(stemCandidates(wordDeva.replace(/ं$/, 'म्')));
  // further stem guesses: strip a case ending down to the stem vowel
  for (let cut = 1; cut <= 5 && cut < w.length - 1; cut++) {
    const base = w.slice(0, w.length - cut);
    for (const v of ['', 'a', 'A', 'i', 'I', 'u', 'U', 'f', 'an', 'as', 'in', 'at']) stems.add(base + v);
  }
  for (const s of stems) {
    if (s.length < 2) continue;
    // a feminine in -ā of an adjective listed in the dictionary under -a (स्थित → स्थिता)
    const known = dict.has(mwKey(s)) || (s.endsWith('A') && dict.has(mwKey(`${s.slice(0, -1)}a`)));
    if (known && byAnalogy(o, s, w)) return 'analogy';
  }
  return undefined;
}

/** For tests: how a vigraha word is recognised ('subanta-table', 'tinanta-table', 'analogy', 'avyaya'), or undefined. */
export function vigrahaWordStatus(wordDeva: string, memberStems: string[]): string | undefined {
  const o = loadOracle();
  const mw = loadDict('mw');
  if (o === undefined || mw === undefined) return undefined;
  return validForm(o, new Set<string>([...mw, ...(loadDict('ap90') ?? [])]), wordDeva, memberStems);
}

export interface GeneratedSamasa {
  body: string;
  summary: string[];
  complete: boolean;
}

export function generateSamasa(): GeneratedSamasa {
  const o = loadOracle();
  const mw = loadDict('mw');
  const apte = loadDict('ap90');
  const complete = o !== undefined && mw !== undefined;
  const dict = new Set<string>([...(mw ?? []), ...(apte ?? [])]);
  const report: string[] = [];
  const emitted: string[] = [];
  const counters = new Map<string, number>();
  const seen = new Set<string>();
  const stats = { total: 0, emitted: 0, dropped: 0, mw: 0, unattested: [] as string[], analogy: 0 };
  let type = '';
  let level = 5;
  readFileSync(SRC, 'utf8')
    .split('\n')
    .forEach((raw, idx) => {
      const line = raw.trim();
      if (line === '' || (line.startsWith('#') && !line.startsWith('##'))) return;
      if (line.startsWith('##')) {
        const [t, l] = line.slice(2).split('|').map((x) => x.trim());
        if (t === undefined || !TYPES.includes(t)) throw new Error(`samasa.txt:${idx + 1}: unknown type ${t}`);
        type = t;
        level = Number(l);
        return;
      }
      const parts = line.split('|').map((x) => x.trim().normalize('NFC'));
      const [compound, vigraha, subtype, memberText, en, flagText = ''] = parts;
      if (compound === undefined || vigraha === undefined || subtype === undefined || memberText === undefined || en === undefined) {
        throw new Error(`samasa.txt:${idx + 1}: cannot parse`);
      }
      stats.total++;
      const n = (counters.get(type) ?? 0) + 1;
      counters.set(type, n);
      const id = `samasa-${type}-${String(n).padStart(2, '0')}`;
      const where = `samasa.txt:${idx + 1} ${compound}`;
      let lv = level;
      const extra: string[] = [];
      for (const f of flagText.split(/\s+/).filter((x) => x !== '')) {
        if (/^L[0-5]$/.test(f)) lv = Number(f.slice(1));
        else if (f.startsWith('mw:')) extra.push(f.slice(3));
        else throw new Error(`samasa.txt:${idx + 1}: unknown flag ${f}`);
      }
      const members = memberText.split(',').map((m) => m.trim());
      const drop = (why: string): void => {
        report.push(`DROP ${why}: ${where}`);
        stats.dropped++;
      };
      const bad = [compound, vigraha, subtype, ...members].filter((s) => !validateDeva(s).ok);
      if (bad.length > 0) return drop(`invalid Devanagari ${JSON.stringify(bad)}`);
      if (seen.has(compound)) return drop('duplicate compound');
      seen.add(compound);
      const verifiedBy: string[] = [];
      if (complete && o !== undefined) {
        const missing = members.filter((m) => !dict.has(mwKey(devaToSlp1(m))));
        if (missing.length > 0) return drop(`member stem not a dictionary headword: ${missing.join(', ')}`);
        verifiedBy.push('oracle:mw-member-stems');
        const how = vigraha.split(' ').map((w) => ({ w, how: validForm(o, dict, w, members) }));
        const unknown = how.filter((h) => h.how === undefined).map((h) => h.w);
        if (unknown.length > 0) return drop(`vigraha word not recognised as an inflected form: ${unknown.join(', ')}`);
        if (how.some((h) => h.how === 'analogy')) stats.analogy++;
        verifiedBy.push('oracle:ashtadhyayi-com-forms(vigraha)');
        const inMw = mwAttests(compound, extra) !== undefined;
        const inApte = apteAttests(compound, extra) !== undefined;
        if (inMw) {
          verifiedBy.push('oracle:mw-headword');
          stats.mw++;
        }
        if (inApte) verifiedBy.push('oracle:apte-headword');
        if (!inMw && !inApte) stats.unattested.push(`${id} ${compound}`);
      }
      const fields = [
        `id: ${q(id)}`,
        `compound: ${q(compound)}`,
        `vigraha: ${q(vigraha)}`,
        `type: ${q(type)}`,
        `subtype: ${q(subtype)}`,
        `members: [${members.map(q).join(', ')}]`,
        `en: ${q(en)}`,
        `level: ${lv}`,
        `provenance: { source: SRC, verifiedBy: [${verifiedBy.map(q).join(', ')}] }`,
      ];
      emitted.push(`  { ${fields.join(', ')} },`);
      stats.emitted++;
    });
  const header = `/**
 * GENERATED by tools/content/sahitya/gen-samasa.ts from tools/content/sahitya/sources/samasa.txt — do not edit by hand.
 * One compound per line. \`provenance.verifiedBy\` records the mechanical checks that passed (member stems and vigraha
 * word-forms against dictionaries / paradigm tables; dictionary attestation of the compound). The classification and
 * the vigraha follow standard school grammars and await human sign-off (REVIEW.md).
 */
import type { Samasa } from './types';

const SRC = 'Standard textbook compounds with their conventional vigraha (hand-authored; tools/content/sahitya/sources/samasa.txt)';

export const SAMASA_DATA: readonly Samasa[] = [
`;
  const body = `${header}${emitted.join('\n')}\n];\n`;
  const perType = TYPES.map((t) => `${t}: ${emitted.filter((e) => e.includes(`type: '${t}'`)).length}`).join(', ');
  const summary = [
    `candidates ${stats.total}, emitted ${stats.emitted}, dropped ${stats.dropped}`,
    `per type: ${perType}`,
    `compound is a MW headword: ${stats.mw}; items with a vigraha word validated by paradigm analogy: ${stats.analogy}`,
    `compounds found neither in MW nor in Apte (${stats.unattested.length}): ${stats.unattested.join(', ')}`,
    '',
    ...report,
  ];
  return { body, summary, complete };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const g = generateSamasa();
  console.log(g.summary.join('\n'));
  if (process.argv.includes('--check')) {
    const same = existsSync(SAMASA_DATA_FILE) && readFileSync(SAMASA_DATA_FILE, 'utf8') === g.body;
    console.log(same ? 'data.ts is up to date' : 'data.ts DIFFERS from generator output');
    process.exit(same ? 0 : 1);
  }
  if (!g.complete) {
    console.error('Corpora missing under SAMSKURU_ORACLES: refusing to overwrite data.ts (provenance would be lost).');
    process.exit(2);
  }
  writeFileSync(SAMASA_DATA_FILE, g.body);
  writeFileSync(REPORT, `${g.summary.join('\n')}\n`);
}
