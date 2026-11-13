/**
 * Dictionary / corpus lookups used to verify the VOCAB pack. Read-only; nothing from these datasets is vendored.
 *
 *   MW    Monier-Williams Sanskrit-English Dictionary (Cologne digital edition, csl-orig v02/mw/mw.txt)  — CC BY-NC-SA 3.0
 *   AP90  V. S. Apte, The Practical Sanskrit-English Dictionary, 1890 (csl-orig v02/ap90/ap90.txt)      — CC BY-NC-SA 3.0
 *   AK    Amarakośa with liṅga per word (ashtadhyayi.com kosha/amara.json)
 *   DCS   Digital Corpus of Sanskrit, Rāmāyaṇa + Mahābhārata sample (ambuda-org/dcs)                     — CC BY 4.0
 *   dhātu forms: ashtadhyayi.com (vidyut-prakriya) conjugation tables; Sanskrit Heritage roots.csv
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { devaToSlp1 } from '../../../../src/sanskrit/translit.ts';
import { ORACLE_ROOT } from './oracles.ts';
import { canon, classNasal } from './slp.ts';

export const DICT_FILES = {
  mw: 'sanskrit-lexicon_csl-orig/v02/mw/mw.txt',
  ap90: 'sanskrit-lexicon_csl-orig/v02/ap90/ap90.txt',
  amara: 'ashtadhyayi-com_data/kosha/amara.json',
  mwIndeclinables: 'sanskrit_data/monier-williams/indeclinables.csv',
  dhatuData: 'ashtadhyayi-com_data/dhatu/data.txt',
  dhatuKartari: 'ashtadhyayi-com_data/dhatu/dhatuforms_vidyut_shuddha_kartari.txt',
  dhatuKarmani: 'ashtadhyayi-com_data/dhatu/dhatuforms_vidyut_shuddha_karmani.txt',
  dhatuNich: 'ashtadhyayi-com_data/dhatu/dhatuforms_vidyut_nich_kartari.txt',
  dhatuKrut: 'ashtadhyayi-com_data/dhatu/dhatuforms_vidyut_shuddha_krut.txt',
  heritageRoots: 'sanskrit_data/sanskrit-heritage-site/roots.csv',
  dcsRamayana: 'ambuda-org_dcs/ramayanam.txt',
  dcsMahabharata: 'ambuda-org_dcs/mahabharatam.txt',
} as const;

export function dictsAvailable(): boolean {
  return Object.values(DICT_FILES).every((f) => existsSync(join(ORACLE_ROOT, f)));
}

function read(rel: string): string {
  return readFileSync(join(ORACLE_ROOT, rel), 'utf8');
}

/** lookup key: SLP1 with class nasals (MW writes saMKyA, we write saNKyA) */
export function key(slp: string): string {
  return classNasal(slp);
}

function stripTags(s: string): string {
  return s
    .replace(/<ab n="([^"]*)">[^<]*<\/ab>/g, ' $1 ') // abbreviations with their expansion: g˚smith → goldsmith
    .replace(/<ls[^>]*>.*?<\/ls>/g, ' ')
    .replace(/<s>.*?<\/s>/g, ' ')
    .replace(/\{#.*?#\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[{}@%¦]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** spelling variants under which the dictionaries file a word: पत्र / पत्त्र, वार्ता / वार्त्ता, final त् / द् */
export function altKeys(k: string): string[] {
  const out = [k];
  const add = (x: string): void => {
    if (x !== k && !out.includes(x)) out.push(x);
  };
  add(k.replace(/([aAiIuUfeo])tr/, '$1ttr'));
  add(k.replace(/rt(?!t)/, 'rtt'));
  if (k.endsWith('t')) add(k.slice(0, -1) + 'd');
  return out;
}

// ---------------------------------------------------------------------------------------------
// Monier-Williams
// ---------------------------------------------------------------------------------------------
export interface MwRecord {
  /** 'm' | 'f' | 'n' | 'ind' — the gender of the headword in this sense ("inh" resolved to the preceding sense) */
  lex: Set<string>;
  /** English text of the sense (lower-cased; Sanskrit and literature references removed; "id." and "= X" resolved one level) */
  text: string;
}
export interface MwEntry {
  records: MwRecord[];
}
export interface Mw {
  entries: Map<string, MwEntry>;
  /** feminine stems that MW gives inside another headword: mf(ikā)n, f(ā), f(ī) → e.g. bAlikA from bAlaka */
  derivedFeminines: Map<string, { from: string; record: MwRecord }[]>;
}
let mwCache: Mw | undefined;

function feminineStem(base: string, ending: string): string | undefined {
  if (!base.endsWith('a')) return undefined;
  if (ending === 'A') return base.slice(0, -1) + 'A';
  if (ending === 'I') return base.slice(0, -1) + 'I';
  if (ending === 'ikA' && base.endsWith('aka')) return base.slice(0, -3) + 'ikA';
  return undefined;
}

export function loadMw(): Mw {
  if (mwCache) return mwCache;
  const entries = new Map<string, MwEntry>();
  const derivedFeminines = new Map<string, { from: string; record: MwRecord }[]>();
  const byL = new Map<string, MwRecord>();
  const aliases: { k: string; target: string }[] = [];
  const refs: { record: MwRecord; keys: string[] }[] = [];
  const lastLex = new Map<string, Set<string>>();
  let prevText = '';
  let k1: string | undefined;
  let k2 = '';
  let lnum = '';
  let body: string[] = [];
  const push = (k: string, record: MwRecord): void => {
    const e = entries.get(k);
    if (e) e.records.push(record);
    else entries.set(k, { records: [record] });
  };
  const flush = (): void => {
    if (k1 === undefined) return;
    const raw = body.join(' ');
    const k = key(k1);
    const alias = /\{\{Lbody=([0-9.]+)\}\}/.exec(raw);
    if (alias?.[1]) {
      aliases.push({ k, target: alias[1] });
      return;
    }
    const infos = [...raw.matchAll(/<info lex="([^"]*)"/g)].map((m) => m[1] ?? '');
    let lex = new Set<string>();
    const fem: string[] = [];
    if (infos.length > 0 && !infos.includes('inh')) {
      for (const info of infos) {
        for (const part of info.split(':')) {
          const [g, f] = part.split('#');
          if (f) {
            if (g === 'f') fem.push(f);
          } else if (g === 'm' || g === 'f' || g === 'n' || g === 'ind') lex.add(g);
        }
      }
      if (lex.size === 0 && fem.length > 0) lex.add('f');
      lastLex.set(k, lex);
    } else {
      lex = lastLex.get(k) ?? new Set<string>();
    }
    let text = stripTags(raw);
    if (/(^|[^a-z])id\./.test(text)) text += ' ' + prevText; // idem: the meaning of the preceding article
    prevText = text.length > 600 ? text.slice(0, 600) : text;
    const record: MwRecord = { lex, text };
    const refKeys: string[] = [];
    for (const m of raw.matchAll(/=\s*<s>([^<]+)<\/s>/g)) {
      let ref = (m[1] ?? '').replace(/[^A-Za-z-]/g, '');
      if (ref.startsWith('-') && k2.includes('—')) ref = k2.split('—').slice(0, -1).join('') + ref.slice(1);
      ref = ref.replace(/-/g, '');
      if (ref.length >= 2) refKeys.push(key(ref));
    }
    if (refKeys.length > 0) refs.push({ record, keys: refKeys });
    byL.set(lnum, record);
    push(k, record);
    for (const f of fem) {
      const fs = feminineStem(k, f);
      if (!fs) continue;
      const list = derivedFeminines.get(fs);
      if (list) list.push({ from: k, record });
      else derivedFeminines.set(fs, [{ from: k, record }]);
    }
  };
  for (const line of read(DICT_FILES.mw).split('\n')) {
    if (line.startsWith('<L>')) {
      k1 = /<k1>([^<]*)</.exec(line)?.[1];
      k2 = /<k2>([^<]*)</.exec(line)?.[1] ?? '';
      lnum = /^<L>([0-9.]+)</.exec(line)?.[1] ?? '';
      body = [];
    } else if (line.startsWith('<LEND>')) {
      flush();
      k1 = undefined;
    } else if (k1 !== undefined) body.push(line);
  }
  for (const a of aliases) {
    const target = byL.get(a.target);
    if (target) push(a.k, target);
  }
  // "= X": the meaning is given under the synonym X — append X's senses (one level only)
  const extra = new Map<MwRecord, string>();
  for (const r of refs) {
    const texts: string[] = [];
    for (const k of r.keys) for (const rec of (entries.get(k)?.records ?? []).slice(0, 4)) texts.push(rec.text.slice(0, 300));
    if (texts.length) extra.set(r.record, texts.join(' '));
  }
  for (const [rec, t] of extra) rec.text += ' ' + t;
  mwCache = { entries, derivedFeminines };
  return mwCache;
}

// ---------------------------------------------------------------------------------------------
// Apte 1890 — headwords are citation forms (vfkzaH, Palam, latA) for nouns, stems for adjectives
// ---------------------------------------------------------------------------------------------
export interface ApteEntry {
  raw: string;
  text: string;
}
let apteCache: Map<string, ApteEntry[]> | undefined;
export function loadApte(): Map<string, ApteEntry[]> {
  if (apteCache) return apteCache;
  const map = new Map<string, ApteEntry[]>();
  const byL = new Map<string, ApteEntry>();
  const aliases: { k: string; target: string }[] = [];
  let k1: string | undefined;
  let lnum = '';
  let body: string[] = [];
  const push = (k: string, e: ApteEntry): void => {
    const list = map.get(k);
    if (list) {
      if (!list.includes(e)) list.push(e);
    } else map.set(k, [e]);
  };
  for (const line of read(DICT_FILES.ap90).split('\n')) {
    if (line.startsWith('<L>')) {
      k1 = /<k1>([^<]*)</.exec(line)?.[1];
      lnum = /^<L>([0-9.]+)</.exec(line)?.[1] ?? '';
      body = [];
    } else if (line.startsWith('<LEND>')) {
      if (k1 !== undefined) {
        const raw = body.join(' ');
        const k = key(canon(k1.replace(/M$/, 'm'))); // neuter headwords are printed with a final anusvāra (PalaM)
        const alias = /\{\{Lbody=([0-9.]+)\}\}/.exec(raw);
        if (alias?.[1]) aliases.push({ k, target: alias[1] });
        else {
          const e = { raw, text: stripTags(raw) };
          byL.set(lnum, e);
          push(k, e);
        }
      }
      k1 = undefined;
    } else if (k1 !== undefined) body.push(line);
  }
  for (const a of aliases) {
    const t = byL.get(a.target);
    if (t) push(a.k, t);
  }
  apteCache = map;
  return map;
}

/** text of the neuter sub-sense that Apte files inside a masculine headword: `nAraMgaH … {#--gaM#} the fruit …` */
export function apteNeuterInsideMasculine(e: ApteEntry): string | undefined {
  const m = /--[A-Za-z]*M[,# ]/.exec(e.raw);
  if (!m) return undefined;
  return stripTags(e.raw.slice(m.index));
}

// ---------------------------------------------------------------------------------------------
// Amarakośa (liṅga per word) — P puṃliṅga, S strīliṅga, N napuṃsaka, A avyaya
// ---------------------------------------------------------------------------------------------
let amaraCache: Map<string, Set<string>> | undefined;
export function loadAmara(): Map<string, Set<string>> {
  if (amaraCache) return amaraCache;
  const json = JSON.parse(read(DICT_FILES.amara)) as { data: { words?: { word: string; linga: string }[] }[] };
  const map = new Map<string, Set<string>>();
  const G: Record<string, string> = { P: 'm', S: 'f', N: 'n', A: 'ind' };
  for (const verse of json.data) {
    for (const w of verse.words ?? []) {
      const k = key(devaToSlp1(w.word));
      const g = G[w.linga];
      if (!g) continue;
      const set = map.get(k);
      if (set) set.add(g);
      else map.set(k, new Set([g]));
    }
  }
  amaraCache = map;
  return map;
}

// ---------------------------------------------------------------------------------------------
// MW list of indeclinables (sanskrit/data)
// ---------------------------------------------------------------------------------------------
let indCache: Set<string> | undefined;
export function loadMwIndeclinables(): Set<string> {
  if (indCache) return indCache;
  indCache = new Set(
    read(DICT_FILES.mwIndeclinables)
      .split('\n')
      .slice(1)
      .map((l) => key(l.trim()))
      .filter(Boolean),
  );
  return indCache;
}

// ---------------------------------------------------------------------------------------------
// DCS sample (Rāmāyaṇa + Mahābhārata): lemma + gender counts, and attested finite verb tokens
// ---------------------------------------------------------------------------------------------
export interface Dcs {
  /** `${lemma} ${gender}` → occurrences as a noun/adjective of that gender */
  lemmaGender: Map<string, number>;
  /** attested present 3rd singular tokens (pausa spelling), → lemma */
  lat3s: Map<string, string>;
  /** every attested finite verb token, → lemma */
  finite: Map<string, string>;
}
let dcsCache: Dcs | undefined;
export function loadDcs(): Dcs {
  if (dcsCache) return dcsCache;
  const lemmaGender = new Map<string, number>();
  const lat3s = new Map<string, string>();
  const finite = new Map<string, string>();
  for (const file of [DICT_FILES.dcsRamayana, DICT_FILES.dcsMahabharata]) {
    for (const line of read(file).split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const [tok, lemma, tags] = line.split('\t');
      if (!tok || !lemma || !tags) continue;
      if (tags.startsWith('pos=n,g=') || tags.startsWith('pos=a,g=')) {
        const g = tags.charAt(8);
        const k = `${key(lemma)} ${g}`;
        lemmaGender.set(k, (lemmaGender.get(k) ?? 0) + 1);
      } else if (tags.startsWith('pos=v,')) {
        const t = key(canon(tok));
        finite.set(t, lemma);
        if (tags.includes('p=3,n=s,l=lat')) lat3s.set(t, lemma);
      }
    }
  }
  dcsCache = { lemmaGender, lat3s, finite };
  return dcsCache;
}

// ---------------------------------------------------------------------------------------------
// Verb forms
// ---------------------------------------------------------------------------------------------
export interface VerbForms {
  /** laṭ prathama-puruṣa ekavacana (Devanagari → SLP1 canon) → dhātus that have it; kind = primary | causative */
  lat3s: Map<string, { base: string; kind: 'primary' | 'causative'; pada: 'P' | 'A' }[]>;
  /** every finite form of laṭ / loṭ / vidhiliṅ (kartari, karmaṇi, causative) → for phrase verification */
  finite: Set<string>;
  /** kta participles in the three genders (nominative singular) */
  kta: Set<string>;
  /** dhātu metadata by baseindex */
  dhatu: Map<string, { dhatu: string; artha: string }>;
  /** Sanskrit Heritage: present 3rd singular forms (independent of vidyut) */
  heritageLat3s: Set<string>;
  heritageFinite: Set<string>;
}
let verbCache: VerbForms | undefined;
export function loadVerbForms(): VerbForms {
  if (verbCache) return verbCache;
  const lat3s: VerbForms['lat3s'] = new Map();
  const finite = new Set<string>();
  const kta = new Set<string>();
  const dhatu = new Map<string, { dhatu: string; artha: string }>();
  const meta = JSON.parse(read(DICT_FILES.dhatuData)) as { data: { baseindex: string; dhatu: string; artha_english?: string }[] };
  for (const d of meta.data) dhatu.set(d.baseindex, { dhatu: d.dhatu, artha: (d.artha_english ?? '').toLowerCase() });
  const cellForms = (cell: string): string[] =>
    cell
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
      .map((f) => key(canon(devaToSlp1(f))));
  const LAKARAS = ['lat', 'lot', 'vidhiling', 'lang', 'lrut'];
  const loadFile = (rel: string, kind: 'primary' | 'causative' | 'passive'): void => {
    const json = JSON.parse(read(rel)) as Record<string, Record<string, string>>;
    for (const [base, table] of Object.entries(json)) {
      for (const pada of ['p', 'a'] as const) {
        for (const lak of LAKARAS) {
          const row = table[pada + lak];
          if (!row) continue;
          const cells = row.split(';');
          cells.forEach((c) => cellForms(c).forEach((f) => finite.add(f)));
          if (lak === 'lat' && kind !== 'passive') {
            for (const f of cellForms(cells[0] ?? '')) {
              const list = lat3s.get(f);
              const item = { base, kind, pada: pada === 'p' ? ('P' as const) : ('A' as const) };
              if (list) list.push(item);
              else lat3s.set(f, [item]);
            }
          }
        }
      }
    }
  };
  loadFile(DICT_FILES.dhatuKartari, 'primary');
  loadFile(DICT_FILES.dhatuNich, 'causative');
  loadFile(DICT_FILES.dhatuKarmani, 'passive');
  const krut = JSON.parse(read(DICT_FILES.dhatuKrut)) as Record<string, Record<string, string>>;
  for (const table of Object.values(krut)) {
    const v = table['क्त'];
    if (!v) continue;
    for (const deriv of v.split(';')) {
      const parts = deriv.split(',');
      for (const p of parts.slice(1)) for (const f of p.split('/')) if (f.trim()) kta.add(key(canon(devaToSlp1(f.trim()))));
    }
  }
  const heritageLat3s = new Set<string>();
  const heritageFinite = new Set<string>();
  for (const line of read(DICT_FILES.heritageRoots).split('\n').slice(1)) {
    const p = line.split(',');
    if (p.length < 7) continue;
    const f = key(canon(p[0] ?? ''));
    heritageFinite.add(f);
    if (p[3] === '3' && p[4] === 's' && p[5] === 'pres' && (p[6] === 'para' || p[6] === 'atma')) heritageLat3s.add(f);
  }
  verbCache = { lat3s, finite, kta, dhatu, heritageLat3s, heritageFinite };
  return verbCache;
}
