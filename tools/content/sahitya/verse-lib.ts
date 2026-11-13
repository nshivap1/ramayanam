/**
 * Verse helpers for the subhāṣita pack generator: corpus readers (Gītā JSON, GRETIL TEI, subhāṣita lists),
 * pāda splitting, metre classification on top of the Samskuru chandas engine, and the padaccheda re-sandhi check.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { splitAksharas } from '../../../src/sanskrit/akshara';
import { checkAnustubh, identifyVerse, weights } from '../../../src/sanskrit/chandas';
import { joinSandhi } from '../../../src/sanskrit/sandhi';
import { devaToSlp1, normalizeDeva, slp1ToDeva } from '../../../src/sanskrit/translit';
import { cmpKeyDeva, cmpKeyIast, cmpKeySlp1, gretilLineToDeva, oraclePath, stripTags } from './lib';

// ---------------------------------------------------------------------------
// Bhagavad-gītā witnesses
// ---------------------------------------------------------------------------

/** Removes speaker lines (… उवाच), verse numbers and daṇḍas; returns the verse lines as printed in the corpus. */
function gitaLines(raw: string): string[] {
  return raw
    .normalize('NFC')
    .replace(/‌|‍/g, '')
    .split(/\n+/)
    .map((l) => l.replace(/[|।॥]+\s*[0-9०-९]+\s*[-.]\s*[0-9०-९]+\s*[|।॥]+/g, '').replace(/[|।॥]/g, ' ').replace(/\s+/g, ' ').trim())
    .map((l) => l.replace(/^\S+\s?[उु]वाच(\s+|$)/, '').trim())
    .filter((l) => l !== '');
}

export interface GitaWitness {
  name: string;
  lines: string[];
}

let gitaGita: { chapter_number: number; verse_number: number; text: string }[] | undefined;
const dharmic = new Map<number, { chapter: number; verse: number; text: string }[]>();
let gretilBhg: Map<string, string> | undefined;

/** Text of one Gītā verse in the primary corpus (vedicscriptures/bhagavad-gita), as lines; undefined if absent. */
export function gitaPrimary(ch: number, v: number): string[] | undefined {
  const p = oraclePath('vedicscriptures_bhagavad-gita', 'slok', `bhagavadgita_chapter_${ch}_slok_${v}.json`);
  if (!existsSync(p)) return undefined;
  const j = JSON.parse(readFileSync(p, 'utf8')) as { slok: string };
  return gitaLines(j.slok);
}

/** The same verse in the other corpora (comparison keys only are used). */
export function gitaOtherKeys(ch: number, v: number): { name: string; key: string }[] {
  const out: { name: string; key: string }[] = [];
  const p1 = oraclePath('gita_gita', 'data', 'verse.json');
  if (existsSync(p1)) {
    gitaGita ??= JSON.parse(readFileSync(p1, 'utf8')) as typeof gitaGita;
    const row = gitaGita?.find((r) => r.chapter_number === ch && r.verse_number === v);
    if (row !== undefined) out.push({ name: 'gita/gita', key: cmpKeyDeva(gitaLines(row.text).join(' ')) });
  }
  const p2 = oraclePath('bhavykhatri_DharmicData', 'SrimadBhagvadGita', `bhagavad_gita_chapter_${ch}.json`);
  if (existsSync(p2)) {
    if (!dharmic.has(ch)) dharmic.set(ch, (JSON.parse(readFileSync(p2, 'utf8')) as { BhagavadGitaChapter: { chapter: number; verse: number; text: string }[] }).BhagavadGitaChapter);
    const row = dharmic.get(ch)?.find((r) => r.verse === v);
    if (row !== undefined) out.push({ name: 'DharmicData', key: cmpKeyDeva(gitaLines(row.text).join(' ')) });
  }
  const p3 = oraclePath('ambuda-org_gretil-sahitya', '1_sanskr', 'tei', 'sa_bhagavadgItA-comm.xml');
  if (existsSync(p3)) {
    if (gretilBhg === undefined) {
      gretilBhg = new Map();
      const xml = readFileSync(p3, 'utf8');
      const re = /<lg>([\s\S]*?)\|\|\s*BhG_(\d+)\.(\d+)\s*\|\|/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null) {
        const text = stripTags((m[1] as string).slice((m[1] as string).lastIndexOf('<lg>') + 1)).replace(/\|/g, ' ');
        const k = `${m[2]}.${m[3]}`;
        if (!gretilBhg.has(k)) gretilBhg.set(k, cmpKeyIast(text.replace(/^.*\buvāca\b/s, '')));
      }
    }
    const key = gretilBhg.get(`${ch}.${v}`);
    if (key !== undefined) out.push({ name: 'GRETIL', key });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pādas and metre
// ---------------------------------------------------------------------------

/** Splits a line after its n-th syllable, at an akṣara boundary. */
export function splitAfterSyllable(line: string, n: number): [string, string] | undefined {
  const parts = splitAksharas(line, { keepSeparators: true });
  let count = 0;
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] as string;
    const isSyllable = weights(part).length === 1;
    if (isSyllable && count === n) return [out.trim(), parts.slice(i).join('').trim()];
    if (isSyllable) count += 1;
    out += part;
  }
  return undefined;
}

export interface Scanned {
  padas: string[];
  meter: string;
  meterNote?: string;
}

const VIPULA: Record<string, string> = { LLL: 'na', GLL: 'bha', GGG: 'ma', GLG: 'ra' };

/**
 * Splits a verse given as lines (2 half-verses, or 4 pādas) into 4 pādas and names its metre with the engine.
 * Anuṣṭubh: each pāda has 8 syllables; even pādas must pass `checkAnustubh`; an odd pāda that fails the pathyā
 * test must be one of the four classical vipulās (syllables 5–7 = na / bha / ma / ra gaṇa), which is recorded in
 * `meterNote`. Anything else → undefined (the verse is not used).
 */
export function scanVerse(lines: string[]): Scanned | undefined {
  let padas: string[];
  if (lines.length === 4) padas = lines;
  else if (lines.length === 2) {
    padas = [];
    for (const line of lines) {
      const n = weights(line).length;
      if (n % 2 !== 0) return undefined;
      const sp = splitAfterSyllable(line, n / 2);
      if (sp === undefined) return undefined;
      padas.push(...sp);
    }
  } else return undefined;
  padas = padas.map((p) => normalizeDeva(p.replace(/-$/, '')));
  const id = identifyVerse(padas);
  if (id.meter !== null) return { padas, meter: id.meter };
  const pats = padas.map((p) => weights(p));
  if (pats.every((p) => p.length === 8)) {
    const notes: string[] = [];
    for (let i = 0; i < 4; i++) {
      const chk = checkAnustubh(padas[i] as string, i as 0 | 1 | 2 | 3);
      if (chk.ok) continue;
      if (i % 2 === 1) return undefined; // even pādas admit no variation
      const pat = pats[i] as string;
      const v = VIPULA[pat.slice(4, 7)];
      if (v === undefined) return undefined;
      notes.push(`pāda ${i + 1}: ${v}-vipulā`);
    }
    return { padas, meter: 'anustubh', meterNote: `vipulā (${notes.join(', ')})` };
  }
  return undefined;
}

/** The printed two-line form: pādas 1–2 । pādas 3–4 ॥ (pādas are re-joined exactly as in the source line). */
export function printedText(lines: string[]): string {
  const two = lines.length === 4 ? [joinPadaPair(lines[0] as string, lines[1] as string), joinPadaPair(lines[2] as string, lines[3] as string)] : lines;
  return `${normalizeDeva(two[0] as string)} ।\n${normalizeDeva(two[1] as string)} ॥`;
}
function joinPadaPair(a: string, b: string): string {
  return a.endsWith('-') ? a.slice(0, -1) + b : `${a} ${b}`;
}

// ---------------------------------------------------------------------------
// Padaccheda check: the word list, re-joined by the sandhi engine, must give the verse text
// ---------------------------------------------------------------------------

function commonSuffix(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a.charAt(a.length - 1 - n) === b.charAt(b.length - 1 - n)) n++;
  return n;
}

/**
 * True if the words (Devanagari, pre-sandhi pada forms, verse order) can be joined by `joinSandhi` — taking, at
 * each junction, the main result, a listed alternative, the pragṛhya reading, or plain juxtaposition (half-verse
 * boundary) — into exactly the verse text (compared with `cmpKey`, i.e. ignoring spacing and nasal orthography).
 */
export function wordsRejoin(words: string[], text: string): boolean {
  const target = cmpKeyDeva(text.replace(/[।॥\n]/g, ' '));
  const w = words.map((x) => devaToSlp1(x.normalize('NFC')));
  const seen = new Set<string>();
  const dfs = (i: number, acc: string): boolean => {
    const accKey = cmpKeySlp1(acc);
    if (i === w.length) return accKey === target;
    // prune: everything but the last few sounds of acc is final
    const stable = accKey.slice(0, Math.max(0, accKey.length - 4));
    if (!target.startsWith(stable)) return false;
    const memo = `${i}|${acc.slice(-12)}|${accKey.length}`;
    if (seen.has(memo)) return false;
    seen.add(memo);
    const prev = w[i - 1] as string;
    const next = w[i] as string;
    const tokens = acc.split(' ');
    const last = tokens[tokens.length - 1] as string;
    const head = tokens.slice(0, -1).join(' ');
    const c = commonSuffix(last, prev);
    const p0 = prev.slice(0, prev.length - c);
    const t0 = last.slice(0, last.length - c);
    const candidates = new Set<string>([`${prev} ${next}`]);
    for (const opts of [{}, { pragrhya: true }]) {
      const r = joinSandhi(prev, next, opts);
      candidates.add(r.result);
      for (const a of r.alternatives) candidates.add(a.result);
    }
    for (const cand of candidates) {
      if (!cand.startsWith(p0)) continue;
      const joined = `${head === '' ? '' : `${head} `}${t0}${cand.slice(p0.length)}`;
      if (dfs(i + 1, joined)) return true;
    }
    return false;
  };
  return w.length > 0 && dfs(1, w[0] as string);
}

// ---------------------------------------------------------------------------
// GRETIL verse index
// ---------------------------------------------------------------------------

export interface GretilVerse {
  file: string;
  /** reference found in the block (xml:id or trailing `// Hit_0.6 //`), if any */
  ref: string;
  /** verse lines in GRETIL IAST, one per <l> */
  lines: string[];
  key: string;
}

const gretilCache = new Map<string, GretilVerse[]>();
export function gretilVerses(file: string): GretilVerse[] {
  const hit = gretilCache.get(file);
  if (hit !== undefined) return hit;
  const p = oraclePath('ambuda-org_gretil-sahitya', '1_sanskr', 'tei', file);
  const out: GretilVerse[] = [];
  if (existsSync(p)) {
    const xml = readFileSync(p, 'utf8');
    const body = xml.slice(xml.indexOf('<body>'));
    const re = /<lg([^>]*)>([\s\S]*?)<\/lg>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      const attrs = m[1] as string;
      const inner = m[2] as string;
      const id = /xml:id="([^"]+)"/.exec(attrs)?.[1];
      const rawLines = [...inner.matchAll(/<l[^>]*>([\s\S]*?)<\/l>/g)].map((x) => stripTags(x[1] as string).replace(/\s+/g, ' ').trim());
      const trailing = /\/\/\s*([A-Za-z]+_[0-9.]+[a-z*]?)\s*\/\/|\|\|\s*([A-Za-z_]*[0-9.]+)\s*\|\|/.exec(rawLines.join(' '));
      const lines = rawLines
        .map((l) => l.replace(/(\/\/|\|\|).*$/, '').replace(/[/|]+\s*$/, '').replace(/\[[^\]]*\]/g, '').trim())
        .filter((l) => l !== '');
      if (lines.length === 0) continue;
      out.push({ file, ref: id ?? trailing?.[1] ?? trailing?.[2] ?? '', lines, key: cmpKeyIast(lines.join(' ')) });
    }
  }
  gretilCache.set(file, out);
  return out;
}

export function gretilFiles(): string[] {
  const dir = oraclePath('ambuda-org_gretil-sahitya', '1_sanskr', 'tei');
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.xml')) : [];
}

/** GRETIL half-verse lines → Devanagari lines (undefined if a line has non-IAST marks). */
export function gretilToDevaLines(lines: string[]): string[] | undefined {
  const out: string[] = [];
  for (const l of lines) {
    const d = gretilLineToDeva(l);
    if (d === undefined) return undefined;
    out.push(d);
  }
  return out;
}

export { cmpKeyDeva, cmpKeyIast, slp1ToDeva };

// ---------------------------------------------------------------------------
// Subhāṣita-ratna-bhāṇḍāgāra (Devanagari e-text in sanskrit/raw_etexts)
// ---------------------------------------------------------------------------

export interface DevaVerse {
  /** `<prakaraṇa heading> <verse number>` as printed */
  ref: string;
  lines: string[];
  key: string;
}

let srbCache: DevaVerse[] | undefined;
/** Verses of the Subhāṣitaratnabhāṇḍāgāra: two lines each (… । / … ॥ n ॥). Footnote markers `(n)` are removed. */
export function srbVerses(): DevaVerse[] {
  if (srbCache !== undefined) return srbCache;
  const p = oraclePath('sanskrit_raw_etexts', 'kAvyam', 'mishram', 'subhAShitam', 'subhAShitaratnabhANDAgAram.md.txt');
  const out: DevaVerse[] = [];
  if (existsSync(p)) {
    const lines = readFileSync(p, 'utf8').replace(/^﻿/, '').split('\n');
    let section = '';
    let pending: string | undefined;
    for (const raw of lines) {
      const line = raw.normalize('NFC').replace(/\((\d+)\)/g, '').replace(/\s+/g, ' ').trim();
      const head = /^<(.+?)>$/.exec(line);
      if (head !== null) {
        section = (head[1] as string).replace(/[।.]/g, '').trim();
        pending = undefined;
        continue;
      }
      const end = /^(.*?)॥\s*(\d+)\s*॥$/.exec(line);
      if (end !== null) {
        if (pending !== undefined) {
          const l1 = pending.replace(/।\s*$/, '').trim();
          const l2 = (end[1] as string).trim();
          out.push({ ref: `${section} ${end[2]}`, lines: [l1, l2], key: cmpKeyDeva(`${l1} ${l2}`) });
        }
        pending = undefined;
        continue;
      }
      pending = /।\s*$/.test(line) && !line.startsWith('(') ? line : undefined;
    }
  }
  srbCache = out;
  return out;
}
