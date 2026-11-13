/**
 * Shared helpers for the sāhitya content generators (sandhi, samāsa, subhāṣita packs).
 *
 * Corpora are read from the directory named by the environment variable
 * `SAMSKURU_ORACLES` (default `/home/claude/refs/data`). They are treated as
 * untrusted DATA: files are parsed, never executed.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { devaToSlp1, iastToDeva, iastToSlp1, slp1ToDeva } from '../../../src/sanskrit/translit';

export const ORACLES = process.env.SAMSKURU_ORACLES ?? '/home/claude/refs/data';
export const oraclePath = (...parts: string[]): string => join(ORACLES, ...parts);
export const hasOracle = (...parts: string[]): boolean => existsSync(oraclePath(...parts));

const HOMORGANIC: [RegExp, string][] = [
  [/[NM](?=[kKgG])/g, 'M'],
  [/[YM](?=[cCjJ])/g, 'M'],
  [/[RM](?=[wWqQ])/g, 'M'],
  [/[nM](?=[tTdD])/g, 'M'],
  [/[mM](?=[pPbBm])/g, 'M'],
  [/[nM](?=n)/g, 'M'],
];

/**
 * Comparison key for two witnesses of the same Sanskrit text: SLP1 with spaces,
 * punctuation, digits and avagrahas removed, and a class nasal before a stop of
 * its own varga folded into anusvāra (सङ्ग = संग, सम्मूढ = संमूढ). Two witnesses
 * with the same key differ only in orthographic convention.
 */
export function cmpKeySlp1(slp1: string): string {
  let s = slp1.replace(/[^a-zA-Z~]/g, '');
  // word-final m before a consonant ≡ anusvāra; fold every m/M before a consonant
  s = s.replace(/m(?=[kKgGcCjJwWqQtTdDnpPbBmyrlvSzsh])/g, 'M');
  for (const [re, to] of HOMORGANIC) s = s.replace(re, to);
  // nasalised l (ताँल्लोकान्) is also written with anusvāra (तांल्लोकान्)
  s = s.replace(/~l/g, 'Ml').replace(/~/g, '');
  // optional doubling of a stop before y / v (8.4.47 anaci ca): सिद्ध्यति = सिध्यति
  s = s.replace(/dD(?=[yv])/g, 'D');
  // archaic doubling before r: मित्त्र = मित्र, पत्त्र = पत्र
  s = s.replace(/tt(?=r)/g, 't');
  return s;
}
export const cmpKeyDeva = (deva: string): string => cmpKeySlp1(devaToSlp1(deva.normalize('NFC')));
/** GRETIL IAST (word-spaced, hyphenated compounds, ' for avagraha) → comparison key. */
export function cmpKeyIast(iast: string): string {
  return cmpKeySlp1(iastToSlp1(cleanGretilIast(iast)));
}

/** Lower-cases and strips GRETIL editorial marks that are not part of the text. */
export function cleanGretilIast(iast: string): string {
  return iast
    .normalize('NFC')
    .toLowerCase()
    .replace(/ṁ/g, 'ṃ')
    .replace(/[-_*]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const IAST_CONS_END = /(kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh|[kgṅcjñṭḍṇtdnpbmyrlvśṣsh])$/;
const IAST_VOWEL_START = /^[aāiīuūṛṝḷeo]/;
const IAST_INITIAL = /^(kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh|ai|au|.)/;

/**
 * Is `final` + `initial` a junction that already shows sandhi, so that the two words may be written together?
 * False for junctions the e-text left unsandhied (pātratvāt dhanam, tat śrutvā, tān ca): those are kept apart,
 * exactly as the corpus has them.
 */
function sandhiedJunction(final: string, initial: string): boolean {
  const voicelessInit = ['k', 'kh', 'c', 'ch', 'ṭ', 'ṭh', 't', 'th', 'p', 'ph', 'ś', 'ṣ', 's'];
  if (['k', 'ṭ', 'p'].includes(final)) return ['k', 'kh', 'p', 'ph', 't', 'th', 's', 'ṣ', 'c', 'ch', 'ṭ', 'ṭh'].includes(initial) || (final !== 'k' && initial === 'ś') || (final === 'k' && initial === 'ś');
  if (final === 't') return ['k', 'kh', 'p', 'ph', 't', 'th', 's'].includes(initial);
  if (['g', 'ḍ', 'b'].includes(final)) return !voicelessInit.includes(initial) && initial !== 'h';
  if (final === 'd') return !voicelessInit.includes(initial) && !['j', 'jh', 'ḍ', 'ḍh', 'l', 'h'].includes(initial);
  if (final === 'n') return !['c', 'ch', 'ṭ', 'ṭh', 't', 'th', 'j', 'jh', 'ḍ', 'ḍh', 'ś', 'l'].includes(initial);
  if (final === 'r') return !voicelessInit.includes(initial) && initial !== 'r';
  if (final === 's') return ['t', 'th', 's'].includes(initial);
  if (final === 'ś') return ['c', 'ch', 'ś'].includes(initial);
  if (final === 'ṣ') return ['ṭ', 'ṭh', 'ṣ', 'k', 'p'].includes(initial);
  if (final === 'c') return ['c', 'ch'].includes(initial);
  if (final === 'j') return ['j', 'jh'].includes(initial);
  if (final === 'l') return initial === 'l';
  if (final === 'ñ') return ['c', 'ch', 'j', 'jh', 'ś'].includes(initial);
  if (final === 'ṅ') return true;
  if (final === 'ṇ') return true;
  if (final === 'y' || final === 'v') return IAST_VOWEL_START.test(initial);
  return false;
}

/**
 * Converts one line of GRETIL-style IAST (sandhi applied but words written apart: `vāgarthāv iva saṃpṛktau`)
 * into conventional Devanagari: a word ending in a consonant is written together with the following word
 * (वागर्थाविव संपृक्तौ) when the junction shows sandhi; a word-final m before a consonant is written as anusvāra;
 * a junction the e-text left unsandhied stays apart (पात्रत्वात् धनम्). No sound is changed.
 * Returns undefined if the line contains characters outside IAST (digits used as sandhi markers, brackets, …).
 */
export function gretilLineToDeva(line: string): string | undefined {
  const clean = cleanGretilIast(line);
  if (/[^a-zāīūṛṝḷḹṅñṭḍṇśṣṃḥ' ]/.test(clean)) return undefined;
  const words = clean.split(' ').filter((w) => w !== '');
  let out = '';
  for (let i = 0; i < words.length; i++) {
    let w = words[i] as string;
    const next = words[i + 1];
    if (w.startsWith("'")) out = out.replace(/ $/, ''); // avagraha attaches to the previous word
    if (next === undefined) {
      out += w;
      break;
    }
    const fin = IAST_CONS_END.exec(w)?.[1];
    if (fin === undefined) {
      out += `${w} `;
      continue;
    }
    const init = next.startsWith("'") ? "'" : ((IAST_INITIAL.exec(next)?.[1] as string) ?? '');
    const vowelNext = IAST_VOWEL_START.test(next);
    if (fin === 'm') {
      if (vowelNext) out += w;
      else if (init === "'") out += `${w} `;
      else {
        w = `${w.slice(0, -1)}ṃ`;
        out += `${w} `;
      }
    } else if (init !== "'" && (vowelNext ? !['k', 'ṭ', 't', 'p', 's', 'ś', 'ṣ', 'c'].includes(fin) : sandhiedJunction(fin, init))) out += w;
    else out += `${w} `;
  }
  return iastToDeva(out.trim());
}

/** Strips XML tags and decodes the few entities GRETIL TEI uses. */
export function stripTags(xml: string): string {
  return xml
    .replace(/<lb\s*\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;|&apos;/g, "'");
}

// ---------------------------------------------------------------------------
// Monier-Williams headwords
// ---------------------------------------------------------------------------

const dictCache = new Map<string, Set<string> | undefined>();
/** nasal-insensitive key: MW writes saMkalpa where the packs write सङ्कल्प */
export function mwKey(slp1: string): string {
  let s = slp1;
  for (const [re, to] of HOMORGANIC) s = s.replace(re, to);
  return s;
}
/** All headwords (k1) of a Cologne dictionary (`mw`, `ap90`) as nasal-folded SLP1 keys; undefined when absent. */
export function loadDict(name: 'mw' | 'ap90'): Set<string> | undefined {
  if (dictCache.has(name)) return dictCache.get(name);
  const p = oraclePath('sanskrit-lexicon_csl-orig', 'v02', name, `${name}.txt`);
  if (!existsSync(p)) {
    dictCache.set(name, undefined);
    return undefined;
  }
  const set = new Set<string>();
  const re = /<k1>([^<]+)<k2>/g;
  const text = readFileSync(p, 'utf8');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) set.add(mwKey(m[1] as string));
  dictCache.set(name, set);
  return set;
}
export const loadMw = (): Set<string> | undefined => loadDict('mw');

/**
 * Candidate stems (SLP1) for a nominative-singular citation form, to look a
 * compound up in a stem dictionary: देवालयः → devAlaya, नयनम् → nayana,
 * महात्मा → mahAtman / mahAtmA, विद्यार्थी → vidyArTin / vidyArTI …
 */
export function stemCandidates(citationDeva: string): string[] {
  const s = devaToSlp1(citationDeva);
  const out = new Set<string>([s]);
  if (s.endsWith('H')) {
    out.add(s.slice(0, -1));
    if (s.endsWith('AH')) out.add(`${s.slice(0, -2)}as`);
    if (s.endsWith('aH')) out.add(`${s.slice(0, -2)}as`);
  }
  if (s.endsWith('am')) out.add(s.slice(0, -1));
  if (s.endsWith('a')) out.add(`${s}n`); // जन्म → जन्मन्
  if (s.endsWith('A')) {
    out.add(`${s.slice(0, -1)}an`);
    out.add(`${s.slice(0, -1)}f`);
    out.add(`${s.slice(0, -1)}a`);
  }
  if (s.endsWith('I')) {
    out.add(`${s.slice(0, -1)}in`);
    out.add(`${s.slice(0, -1)}a`);
  }
  if (s.endsWith('O')) out.add(`${s.slice(0, -1)}a`); // dual citation of a-stems
  if (s.endsWith('e')) out.add(`${s.slice(0, -1)}a`); // neuter dual
  if (s.endsWith('AH')) out.add(`${s.slice(0, -2)}a`); // plural citation
  if (s.endsWith('ayaH')) out.add(`${s.slice(0, -4)}i`);
  if (s.endsWith('avaH')) out.add(`${s.slice(0, -4)}u`);
  if (s.endsWith('At')) out.add(`${s.slice(0, -2)}a`);
  if (s.endsWith('an')) out.add(`${s.slice(0, -2)}at`);
  if (s.endsWith('An')) {
    out.add(`${s.slice(0, -2)}at`);
    out.add(`${s.slice(0, -2)}as`);
  }
  if (s.endsWith('k')) out.add(`${s.slice(0, -1)}c`);
  return [...out];
}

/** Returns the headword (SLP1) that attests a citation form in the given dictionary, or undefined. */
export function dictAttests(name: 'mw' | 'ap90', citationDeva: string, extraStems: string[] = []): string | undefined {
  const dict = loadDict(name);
  if (dict === undefined) return undefined;
  for (const c of [...extraStems.map((d) => devaToSlp1(d)), ...stemCandidates(citationDeva)]) {
    if (dict.has(mwKey(c))) return c;
  }
  return undefined;
}
export const mwAttests = (citationDeva: string, extraStems: string[] = []): string | undefined => dictAttests('mw', citationDeva, extraStems);
export const apteAttests = (citationDeva: string, extraStems: string[] = []): string | undefined => dictAttests('ap90', citationDeva, extraStems);

// ---------------------------------------------------------------------------
// Devanagari running-text corpus (for attestation of sandhied phrases)
// ---------------------------------------------------------------------------

export interface TextCorpus {
  name: string;
  /** all text, tokens separated by single spaces, punctuation removed, in nasal-folded SLP1 */
  text: string;
}

function corpusText(devaChunks: string[]): string {
  const parts: string[] = [];
  for (const chunk of devaChunks) {
    const cleaned = chunk
      .normalize('NFC')
      .replace(/:/g, 'ः')
      .replace(/[^ऀ-ॿ\s]/g, ' ')
      .replace(/[।॥०-९]/g, ' ');
    parts.push(mwKey(devaToSlp1(cleaned)).replace(/[^a-zA-Z'~ ]/g, ' '));
  }
  return ` ${parts.join(' ').replace(/\s+/g, ' ')} `;
}

let corporaCache: TextCorpus[] | undefined;
/** Devanagari text corpora available under SAMSKURU_ORACLES (Gītā, Rāmāyaṇa, Mahābhārata). */
export function loadTextCorpora(): TextCorpus[] {
  if (corporaCache !== undefined) return corporaCache;
  const out: TextCorpus[] = [];
  const gita = oraclePath('vedicscriptures_bhagavad-gita', 'slok');
  if (existsSync(gita)) {
    const chunks = readdirSync(gita)
      .filter((f) => f.endsWith('.json'))
      .map((f) => (JSON.parse(readFileSync(join(gita, f), 'utf8')) as { slok?: string }).slok ?? '');
    out.push({ name: 'bhagavad-gita', text: corpusText(chunks) });
  }
  const ram = oraclePath('bhavykhatri_DharmicData', 'ValmikiRamayana');
  if (existsSync(ram)) {
    const chunks: string[] = [];
    for (const f of readdirSync(ram).filter((x) => x.endsWith('.json'))) {
      for (const row of JSON.parse(readFileSync(join(ram, f), 'utf8')) as { text?: string }[]) chunks.push(row.text ?? '');
    }
    out.push({ name: 'valmiki-ramayana', text: corpusText(chunks) });
  }
  const mbh = oraclePath('bhavykhatri_DharmicData', 'Mahabharata');
  if (existsSync(mbh)) {
    const chunks: string[] = [];
    for (const f of readdirSync(mbh).filter((x) => x.endsWith('.json'))) {
      const walk = (v: unknown): void => {
        if (typeof v === 'string') {
          if (/[ऀ-ॿ]/.test(v)) chunks.push(v);
        } else if (Array.isArray(v)) v.forEach(walk);
        else if (v !== null && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(walk);
      };
      walk(JSON.parse(readFileSync(join(mbh, f), 'utf8')));
    }
    out.push({ name: 'mahabharata', text: corpusText(chunks) });
  }
  corporaCache = out;
  return out;
}

/** Names of the corpora in which the Devanagari phrase occurs as whole token(s). */
export function corpusAttests(phraseDeva: string): string[] {
  const key = ` ${mwKey(devaToSlp1(phraseDeva.normalize('NFC'))).replace(/\s+/g, ' ').trim()} `;
  return loadTextCorpora()
    .filter((c) => c.text.includes(key))
    .map((c) => c.name);
}

export const slpToDeva = slp1ToDeva;
/** JSON.stringify with single quotes, for emitting TypeScript literals. */
export function q(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}
