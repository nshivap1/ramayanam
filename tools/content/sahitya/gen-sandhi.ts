/**
 * Generates src/content/sandhi/data.ts from sources/sandhi.txt.
 *
 *   node --import tsx tools/content/sahitya/gen-sandhi.ts [--check]
 *
 * Every candidate is run through the Samskuru sandhi engine; only items the
 * engine reproduces under the declared rule are emitted. Independent checks
 * (recorded per item in `provenance.verifiedBy`, skipped when the corpora are
 * absent — the previous provenance is then kept from the existing data file):
 *   oracle:learnsanskrit-sandhi-rules  the junction is in the CC0 rule table of sanskrit/data
 *   oracle:mw-headword                 the resulting word is a Monier-Williams headword
 *   oracle:apte-headword               the resulting word is a headword of Apte's dictionary (1890)
 *   corpus:<name>                      the resulting phrase occurs in a Devanagari text corpus
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SANDHI_RULES, joinSandhiDeva, type SandhiOptions } from '../../../src/sanskrit/sandhi';
import { devaToSlp1, validateDeva } from '../../../src/sanskrit/translit';
import { apteAttests, corpusAttests, hasOracle, loadMw, mwAttests, mwKey, oraclePath, q } from './lib';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, 'sources', 'sandhi.txt');
export const SANDHI_DATA_FILE = join(here, '..', '..', '..', 'src', 'content', 'sandhi', 'data.ts');
const REPORT = join(here, 'reports', 'sandhi-report.txt');

interface Cand {
  line: number;
  ruleId: string;
  family: string;
  level: number;
  first: string;
  second: string;
  result: string;
  en: string;
  compound: boolean;
  options: SandhiOptions;
  mwStems: string[];
}

function parse(): Cand[] {
  const out: Cand[] = [];
  let rule = '';
  let family = '';
  let level = 3;
  readFileSync(SRC, 'utf8')
    .split('\n')
    .forEach((raw, idx) => {
      const line = raw.trim();
      if (line === '' || (line.startsWith('#') && !line.startsWith('##'))) return;
      if (line.startsWith('##')) {
        const [r, f, l] = line.slice(2).split('|').map((x) => x.trim());
        rule = r ?? '';
        family = f ?? '';
        level = Number(l);
        return;
      }
      const parts = line.split(';').map((x) => x.trim());
      const lhs = parts.shift();
      const isFlags = (x: string): boolean => x.split(/\s+/).every((f) => /^(c|i|r|p|L[0-5]|mw:\S+)$/.test(f));
      const flagText = parts.length > 1 && isFlags(parts[parts.length - 1] as string) ? (parts.pop() as string) : '';
      const en = parts.join('; ');
      const m = /^(\S+) \+ (\S+) = (.+)$/.exec(lhs ?? '');
      if (m === null) throw new Error(`sandhi.txt:${idx + 1}: cannot parse "${line}"`);
      const flags = flagText.split(/\s+/).filter((x) => x !== '');
      const options: SandhiOptions = {};
      let lv = level;
      const mwStems: string[] = [];
      for (const f of flags) {
        if (f === 'c') options.compound = true;
        else if (f === 'i') options.internal = true;
        else if (f === 'r') options.rFinal = true;
        else if (f === 'p') options.pragrhya = true;
        else if (/^L[0-5]$/.test(f)) lv = Number(f.slice(1));
        else if (f.startsWith('mw:')) mwStems.push(f.slice(3));
        else throw new Error(`sandhi.txt:${idx + 1}: unknown flag ${f}`);
      }
      out.push({
        line: idx + 1,
        ruleId: rule,
        family,
        level: lv,
        first: (m[1] as string).normalize('NFC'),
        second: (m[2] as string).normalize('NFC'),
        result: (m[3] as string).trim().normalize('NFC'),
        en,
        compound: options.compound === true || options.internal === true,
        options,
        mwStems,
      });
    });
  return out;
}

// --- CC0 rule table (independent of the engine) -----------------------------
type Table = Map<string, { result: string; type: string }[]>;
function loadTable(): Table | undefined {
  const p = oraclePath('sanskrit_data', 'learnsanskrit.org', 'sandhi-rules.csv');
  if (!existsSync(p)) return undefined;
  const t: Table = new Map();
  for (const row of readFileSync(p, 'utf8').split('\n').slice(1)) {
    const [first, second, result, type] = row.trim().split(',');
    if (first === undefined || second === undefined || result === undefined || type === undefined) continue;
    const k = `${first}+${second}`;
    const list = t.get(k) ?? [];
    list.push({ result, type });
    t.set(k, list);
  }
  return t;
}
const fold = (slp: string): string => mwKey(slp.replace(/\s+/g, '').replace(/m(?=[kKgGcCjJwWqQtTdDnpPbBmyrlvSzsh])/g, 'M'));

function tableConfirms(t: Table, c: Cand): boolean {
  let f = devaToSlp1(c.first);
  const s = devaToSlp1(c.second);
  if (f.endsWith('M')) f = `${f.slice(0, -1)}m`;
  const keys: string[] = [];
  if (f.endsWith('H')) {
    const pv = f.charAt(f.length - 2);
    if (c.options.rFinal === true || f === 'punaH' || f === 'prAtaH') keys.push(`${pv}r`, 'r');
    else keys.push(`${pv}s`, 's');
    f = f.slice(0, -1) + (keys[1] as string);
  } else {
    if (/[ai]n$/.test(f)) keys.push(f.slice(-2));
    keys.push(f.slice(-1));
  }
  const want = fold(devaToSlp1(c.result));
  for (const key of keys) {
    const rows = t.get(`${key}+${s.charAt(0)}`);
    if (rows === undefined) continue;
    for (const row of rows) {
      const internal = row.type === 'internal';
      if (internal !== (c.options.internal === true)) continue;
      const got = fold(f.slice(0, f.length - key.length) + row.result.replace(/ /g, '') + s.slice(1));
      if (got === want) return true;
    }
  }
  return false;
}

// --- generation ---------------------------------------------------------------
export interface Generated {
  /** full text of the generated module */
  body: string;
  summary: string[];
  /** false when a corpus was missing, so `provenance.verifiedBy` is incomplete */
  complete: boolean;
}

export function generateSandhi(): Generated {
  const cands = parse();
  const ruleIds = new Set(SANDHI_RULES.map((r) => r.id));
  const families = new Map(SANDHI_RULES.map((r) => [r.id, r.family]));
  const table = loadTable();
  const haveMw = loadMw() !== undefined;
  const haveCorpora = hasOracle('vedicscriptures_bhagavad-gita');
  const report: string[] = [];
  const emitted: string[] = [];
  const seen = new Set<string>();
  const counters = new Map<string, number>();
  const stats = { total: cands.length, emitted: 0, dropped: 0, table: 0, mw: 0, corpus: 0, unattestedCompounds: [] as string[] };

  for (const c of cands) {
    const where = `sandhi.txt:${c.line} ${c.first} + ${c.second} = ${c.result}`;
    const n = (counters.get(c.ruleId) ?? 0) + 1;
    counters.set(c.ruleId, n); // ids stay stable when an item is dropped
    const id = `sandhi-${c.ruleId}-${String(n).padStart(2, '0')}`;
    if (!ruleIds.has(c.ruleId)) {
      report.push(`DROP unknown rule: ${where}`);
      stats.dropped++;
      continue;
    }
    if (families.get(c.ruleId) !== c.family) {
      report.push(`DROP family mismatch (${c.family} vs engine ${families.get(c.ruleId)}): ${where}`);
      stats.dropped++;
      continue;
    }
    const bad = [c.first, c.second, c.result].filter((x) => !validateDeva(x).ok);
    if (bad.length > 0) {
      report.push(`DROP invalid Devanagari ${JSON.stringify(bad)}: ${where}`);
      stats.dropped++;
      continue;
    }
    const key = `${c.first}+${c.second}`;
    if (seen.has(key)) {
      report.push(`DROP duplicate: ${where}`);
      stats.dropped++;
      continue;
    }
    seen.add(key);
    const r = joinSandhiDeva(c.first, c.second, c.options);
    const outcomes = [{ result: r.result, ruleId: r.ruleId, spaced: r.spaced }, ...r.alternatives];
    const hit = outcomes.find((o) => o.result === c.result);
    if (hit === undefined) {
      report.push(`DROP engine gives ${outcomes.map((o) => `${o.result} [${o.ruleId}]`).join(' / ')}: ${where}`);
      stats.dropped++;
      continue;
    }
    if (hit.ruleId !== c.ruleId) {
      report.push(`DROP engine rule is ${hit.ruleId}, source says ${c.ruleId}: ${where}`);
      stats.dropped++;
      continue;
    }
    const alternatives = outcomes.filter((o) => o.result !== c.result).map((o) => o.result);
    const verifiedBy = ['engine:joinSandhiDeva'];
    if (table !== undefined && tableConfirms(table, c)) {
      verifiedBy.push('oracle:learnsanskrit-sandhi-rules');
      stats.table++;
    }
    if (haveMw && c.compound) {
      const stem = mwAttests(c.result, c.mwStems);
      const apte = apteAttests(c.result, c.mwStems);
      if (stem !== undefined) {
        verifiedBy.push('oracle:mw-headword');
        stats.mw++;
      }
      if (apte !== undefined) verifiedBy.push('oracle:apte-headword');
      if (stem === undefined && apte === undefined) stats.unattestedCompounds.push(`${id} ${c.result}`);
    }
    if (haveCorpora) {
      const hits = corpusAttests(c.result);
      for (const h of hits) verifiedBy.push(`corpus:${h}`);
      if (hits.length > 0) stats.corpus++;
    }
    const fields = [
      `id: ${q(id)}`,
      `first: ${q(c.first)}`,
      `second: ${q(c.second)}`,
      `result: ${q(c.result)}`,
      `ruleId: ${q(c.ruleId)}`,
      `family: ${q(c.family)}`,
      `level: ${c.level}`,
      `en: ${q(c.en)}`,
    ];
    if (c.compound) fields.push('compound: true');
    if (Object.keys(c.options).length > 0) fields.push(`options: { ${Object.keys(c.options).map((k) => `${k}: true`).join(', ')} }`);
    if (alternatives.length > 0) fields.push(`alternatives: [${alternatives.map(q).join(', ')}]`);
    fields.push(`provenance: { source: SRC, verifiedBy: [${verifiedBy.map(q).join(', ')}] }`);
    emitted.push(`  { ${fields.join(', ')} },`);
    stats.emitted++;
  }

  const header = `/**
 * GENERATED by tools/content/sahitya/gen-sandhi.ts from tools/content/sahitya/sources/sandhi.txt — do not edit by hand.
 * One example per line. Every item was reproduced by the sandhi engine (joinSandhiDeva) under the stated rule when
 * this file was generated; data.test.ts repeats that check on every test run.
 */
import type { SandhiExample } from './types';

const SRC = 'Samskuru sandhi list (hand-authored textbook-style examples; tools/content/sahitya/sources/sandhi.txt)';

export const SANDHI_DATA: readonly SandhiExample[] = [
`;
  const body = `${header}${emitted.join('\n')}\n];\n`;
  const perRule = [...counters.keys()].map((k) => `${k}: ${emitted.filter((e) => e.includes(`ruleId: '${k}'`)).length}`).join(', ');
  const summary = [
    `candidates ${stats.total}, emitted ${stats.emitted}, dropped ${stats.dropped}`,
    `confirmed by CC0 rule table: ${stats.table}; compounds attested in MW: ${stats.mw}; phrases attested in a corpus: ${stats.corpus}`,
    `per rule: ${perRule}`,
    `compounds found neither in MW nor in Apte (${stats.unattestedCompounds.length}): ${stats.unattestedCompounds.join(', ')}`,
    '',
    ...report,
  ];
  return { body, summary, complete: haveMw && table !== undefined && haveCorpora };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const g = generateSandhi();
  console.log(g.summary.join('\n'));
  if (process.argv.includes('--check')) {
    const same = existsSync(SANDHI_DATA_FILE) && readFileSync(SANDHI_DATA_FILE, 'utf8') === g.body;
    console.log(same ? 'data.ts is up to date' : 'data.ts DIFFERS from generator output');
    process.exit(same ? 0 : 1);
  }
  if (!g.complete) {
    console.error('Corpora missing under SAMSKURU_ORACLES: refusing to overwrite data.ts (provenance would be lost).');
    process.exit(2);
  }
  writeFileSync(SANDHI_DATA_FILE, g.body);
  writeFileSync(REPORT, `${g.summary.join('\n')}\n`);
}
