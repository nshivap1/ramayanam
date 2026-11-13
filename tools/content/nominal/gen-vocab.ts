/**
 * Verifies tools/content/nominal/vocab-list.ts against the dictionaries and writes
 * src/content/vocab/data.ts + tools/content/nominal/reports/vocab-report.md.
 *
 *   node --import tsx tools/content/nominal/gen-vocab.ts           # regenerate
 *   node --import tsx tools/content/nominal/gen-vocab.ts --check   # fail if data.ts is stale
 *
 * An entry that cannot be verified is dropped and listed in the report — it never reaches the pack.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHABDA_DATA } from '../../../src/content/shabda/data.ts';
import type { ShabdaParadigm } from '../../../src/content/shabda/types.ts';
import type { Gender } from '../../../src/content/types.ts';
import { devaToSlp1, slp1ToDeva, validateDeva } from '../../../src/sanskrit/translit.ts';
import { altKeys, apteNeuterInsideMasculine, dictsAvailable, key, loadAmara, loadApte, loadDcs, loadMw, loadMwIndeclinables, loadVerbForms, type MwRecord } from './lib/dict.ts';
import { declineWithKaleEndings, loadAshtadhyayi, loadHuet, oraclesAvailable, ORACLE_ROOT } from './lib/oracles.ts';
import { canon, natvaFrom } from './lib/slp.ts';
import { type Candidate, VOCAB_LIST } from './vocab-list.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const OUT = join(repo, 'src', 'content', 'vocab', 'data.ts');
const REPORT = join(here, 'reports', 'vocab-report.md');

export interface BuiltEntry {
  id: string;
  sa: string;
  stem?: string;
  pos: Candidate['pos'];
  gender?: Gender;
  en: string;
  category: string;
  level: number;
  emoji?: string;
  paradigm?: string;
  source: string;
  verifiedBy: string[];
}
export interface Dropped {
  word: string;
  category: string;
  en: string;
  reason: string;
}

const deva = (slp: string): string => slp1ToDeva(slp).normalize('NFC');
/** an inflected word in comparable SLP1 (pausa visarga, class nasals) */
const slp = (d: string): string => canon(devaToSlp1(d));
/** a stem in SLP1 — never touched by the pausa rules (शिरस् stays Siras) */
const stemSlp = (d: string): string => devaToSlp1(d);

// ---------------------------------------------------------------------------------------------
// citation forms
// ---------------------------------------------------------------------------------------------
/** nominative singular by rule for the regular classes; undefined when the class needs an oracle */
function citationByRule(stem: string, g: Gender): string | undefined {
  const last = stem.slice(-1);
  if (last === 'a') return g === 'm' ? stem + 'H' : g === 'n' ? stem + 'm' : undefined;
  if (last === 'A' && g === 'f') return stem;
  if (last === 'I' && g === 'f') return stem;
  if (last === 'i') return g === 'n' ? stem : stem + 'H';
  if (last === 'u') return g === 'n' ? stem : stem + 'H';
  return undefined;
}
/** nominative singular guesses for the other classes — accepted only when an oracle table confirms one of them */
function citationCandidates(stem: string, g: Gender): string[] {
  const out: string[] = [];
  const r = citationByRule(stem, g);
  if (r) out.push(r);
  if (stem.endsWith('U')) out.push(stem + 'H');
  if (stem.endsWith('f')) out.push(stem.slice(0, -1) + 'A');
  if (stem.endsWith('o') || stem.endsWith('O')) out.push(stem.slice(0, -1) + 'OH');
  if (stem.endsWith('an')) out.push(g === 'n' ? stem.slice(0, -1) : stem.slice(0, -2) + 'A');
  if (stem.endsWith('in')) out.push(g === 'n' ? stem.slice(0, -1) : stem.slice(0, -2) + 'I');
  if (/[aiu]s$/.test(stem)) out.push(stem.slice(0, -1) + 'H', stem.slice(0, -2) + 'AH');
  if (stem.endsWith('at')) out.push(g === 'n' ? stem : stem.slice(0, -2) + 'An', stem.slice(0, -2) + 'an');
  if (/[cjS]$/.test(stem)) out.push(stem.slice(0, -1) + 'k', stem.slice(0, -1) + 'w');
  if (/[dtD]$/.test(stem)) out.push(stem.slice(0, -1) + 't');
  if (stem.endsWith('z')) out.push(stem.slice(0, -1) + 'w');
  if (stem.endsWith('h')) out.push(stem.slice(0, -1) + 't', stem.slice(0, -1) + 'k', stem.slice(0, -1) + 'w');
  return out;
}

const LINGA: Record<Gender, string> = { m: 'P', f: 'S', n: 'N' };
let ashtIndex: Map<string, string[][][]> | undefined;
function ashtTables(stemDeva: string, g: Gender): string[][][] {
  if (!ashtIndex) {
    ashtIndex = new Map();
    for (const e of loadAshtadhyayi().values()) {
      const k = `${e.word} ${e.linga}`;
      const list = ashtIndex.get(k);
      if (list) list.push(e.cells);
      else ashtIndex.set(k, [e.cells]);
    }
  }
  return ashtIndex.get(`${stemDeva} ${LINGA[g]}`) ?? [];
}

const SHABDA_BY_STEM = new Map<string, ShabdaParadigm>();
for (const p of SHABDA_DATA) if (!p.genderless) SHABDA_BY_STEM.set(`${p.stem} ${p.gender}`, p);
const SHABDA_BY_ID = new Map(SHABDA_DATA.map((p) => [p.id, p]));

/** oracle tables for the exact stem + gender: SHABDA pack, Heritage (Huet), ashtadhyayi.com */
function oracleTables(stemDeva: string, g: Gender): { name: string; cells: string[][] }[] {
  const out: { name: string; cells: string[][] }[] = [];
  const stem = stemSlp(stemDeva);
  const sh = SHABDA_BY_STEM.get(`${stemDeva} ${g}`);
  if (sh) out.push({ name: `pack:shabda#${sh.id}`, cells: sh.forms.flat().map((c) => c.map(slp)) });
  const h = loadHuet().get(`${devaToSlp1(stemDeva)} ${g}`);
  if (h) out.push({ name: `oracle:heritage-huet#${stem} ${g}`, cells: h });
  for (const cells of ashtTables(stemDeva, g)) out.push({ name: `oracle:ashtadhyayi-com#${stem} ${g}`, cells });
  return out;
}

// ---------------------------------------------------------------------------------------------
// declension models
// ---------------------------------------------------------------------------------------------
const MODEL_CANDIDATES: { test: (stem: string, g: Gender) => boolean; cut: number; ids: string[] }[] = [
  { test: (s, g) => s.endsWith('a') && g === 'm', cut: 1, ids: ['rama-m', 'deva-m'] },
  { test: (s, g) => s.endsWith('a') && g === 'n', cut: 1, ids: ['mitra-n', 'phala-n'] },
  { test: (s, g) => s.endsWith('A') && g === 'f', cut: 1, ids: ['rama-f', 'lata-f'] },
  { test: (s, g) => s.endsWith('I') && g === 'f', cut: 1, ids: ['nari-f', 'nadi-f'] },
  { test: (s, g) => s.endsWith('i') && g === 'm', cut: 1, ids: ['hari-m', 'muni-m'] },
  { test: (s, g) => s.endsWith('i') && g === 'f', cut: 1, ids: ['ratri-f', 'mati-f'] },
  { test: (s, g) => s.endsWith('u') && g === 'm', cut: 1, ids: ['guru-m', 'sadhu-m'] },
  { test: (s, g) => s.endsWith('u') && g === 'f', cut: 1, ids: ['dhenu-f'] },
  { test: (s, g) => s.endsWith('u') && g === 'n', cut: 1, ids: ['ashru-n', 'madhu-n'] },
  { test: (s, g) => s.endsWith('in') && g === 'm', cut: 2, ids: ['mantrin-m', 'svamin-m'] },
  { test: (s, g) => s.endsWith('as') && g === 'n', cut: 2, ids: ['manas-n'] },
  { test: (s, g) => s.endsWith('mat') && g === 'm', cut: 2, ids: ['dhimat-m'] },
  { test: (s, g) => s.endsWith('vat') && g === 'm', cut: 2, ids: ['balavat-m'] },
];
/** ī / i stems that do not follow नदी / हरि */
const NO_MODEL = new Set(['strI', 'SrI', 'lakzmI', 'DI', 'hrI', 'BI', 'tantrI', 'tarI', 'pati', 'saKi', 'akzi', 'daDi', 'asTi', 'sakTi']);

interface Inflection {
  modelId: string;
  /** 24 cells, SLP1, with ṇatva re-derived for this stem */
  cells: string[][];
  /** true when plain stem substitution into the model already gives exactly these forms */
  naiveOk: boolean;
}
function inflectLike(modelId: string, stem: string, cut: number): Inflection | undefined {
  const model = SHABDA_BY_ID.get(modelId);
  if (!model) return undefined;
  const mStem = stemSlp(model.stem);
  const mBase = mStem.slice(0, mStem.length - cut);
  const base = stem.slice(0, stem.length - cut);
  let naiveOk = true;
  const cells: string[][] = [];
  for (const cell of model.forms.flat()) {
    const out: string[] = [];
    for (const f of cell.map(slp)) {
      if (!f.startsWith(mBase)) return undefined;
      const suffix = f.slice(mBase.length);
      const derived = natvaFrom(base + suffix.replace(/R/g, 'n'), base.length);
      if (derived !== base + suffix) naiveOk = false;
      out.push(derived);
    }
    cells.push(out);
  }
  return { modelId, cells, naiveOk };
}

/** picks the SHABDA model a stem declines like; returns the inflected cells for phrase verification */
function chooseModel(stemDeva: string, g: Gender): { link?: string; cells?: string[][]; note?: string } {
  const stem = stemSlp(stemDeva);
  const exact = SHABDA_BY_STEM.get(`${stemDeva} ${g}`);
  if (exact) return { link: exact.id, cells: exact.forms.flat().map((c) => c.map(slp)) };
  // compound whose last member is itself a pack paradigm (सर्वनामन् → नामन्)
  for (const p of SHABDA_DATA) {
    if (p.genderless || p.gender !== g || p.kind === 'pronoun' || p.kind === 'numeral') continue;
    const ps = stemSlp(p.stem);
    if (ps.length >= 4 && stem.length > ps.length && stem.endsWith(ps) && !/[aAiIuU]$/.test(ps)) {
      const prefix = stem.slice(0, stem.length - ps.length);
      return { link: p.id, cells: p.forms.flat().map((c) => c.map((f) => prefix + slp(f))), note: `compound ending in ${p.stem}` };
    }
  }
  if (NO_MODEL.has(stem)) return {};
  const cls = MODEL_CANDIDATES.find((c) => c.test(stem, g));
  if (!cls) return {};
  let chosen: Inflection | undefined;
  for (const id of cls.ids) {
    const inf = inflectLike(id, stem, cls.cut);
    if (inf?.naiveOk) {
      chosen = inf;
      break;
    }
  }
  if (!chosen) return { note: 'no model with the same ṇatva behaviour' };
  // when an oracle has a full table for this very stem, the model must reproduce its forms
  for (const t of oracleTables(stemDeva, g)) {
    for (let i = 0; i < 24; i++) {
      const theirs = t.cells[i] ?? [];
      const ours = chosen.cells[i]?.[0];
      if (theirs.length === 0 || !ours) continue;
      if (!theirs.includes(ours)) return { note: `model ${chosen.modelId} gives ${deva(ours)} but ${t.name} has ${theirs.map(deva).join('/')} — not linked` };
    }
  }
  return { link: chosen.modelId, cells: chosen.cells };
}

// ---------------------------------------------------------------------------------------------
// gloss keywords
// ---------------------------------------------------------------------------------------------
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'one', 'who', 'that', 'this', 'not', 'are', 'you', 'out', 'off', 'into', 'also', 'someone', 'something', 'female', 'male', 'informal', 'respectful', 'relative', 'state', 'thing']);
function keywords(c: Candidate): string[] {
  if (c.opts.kw) return c.opts.kw.map((k) => k.toLowerCase());
  return c.en
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(/[^a-zāīūṛṣśṇṭḍñṅ'-]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}
function textHas(text: string, kws: string[]): string | undefined {
  return kws.find((k) => new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text));
}

// ---------------------------------------------------------------------------------------------
// verification per part of speech
// ---------------------------------------------------------------------------------------------
type Verdict = { ok: true; entry: Omit<BuiltEntry, 'id' | 'category' | 'level' | 'en' | 'emoji'>; cells?: string[][]; note?: string } | { ok: false; reason: string };

function dictNominal(stemDeva: string, g: Gender | undefined, c: Candidate, citation: string | undefined): { tags: string[]; gender: boolean; gloss?: string; seen: string } {
  const mw = loadMw();
  const stem = stemSlp(stemDeva);
  const k0 = key(stem);
  const kws = keywords(c);
  const tags: string[] = [];
  let gender = false;
  let gloss: string | undefined;
  const seen: string[] = [];
  const noteGloss = (hit: string | undefined, tag: string): void => {
    if (!hit) return;
    gloss = gloss ?? hit;
    if (!tags.includes(tag)) tags.push(tag);
  };
  for (const k of altKeys(k0)) {
    const entry = mw.entries.get(k);
    if (!entry) continue;
    const lexAll = new Set<string>();
    for (const r of entry.records) for (const l of r.lex) lexAll.add(l);
    seen.push(`MW ${k}: ${[...lexAll].join('/') || '?'}`);
    const matching: MwRecord[] = g ? entry.records.filter((r) => r.lex.has(g)) : entry.records.filter((r) => r.lex.has('m') || r.lex.has('f') || r.lex.has('n'));
    if (matching.length > 0) {
      gender = true;
      tags.push(`oracle:mw#${k}`);
      noteGloss(matching.map((r) => textHas(r.text, kws)).find(Boolean), 'gloss:mw');
    }
  }
  if (g === 'f') {
    const d = mw.derivedFeminines.get(k0);
    if (d && d.length > 0) {
      if (!gender) tags.push(`oracle:mw#${d[0]!.from}(f. ${k0})`);
      gender = true;
      seen.push(`MW feminine of ${d[0]!.from}`);
      const base = mw.entries.get(d[0]!.from);
      noteGloss([...d.map((x) => x.record), ...(base?.records ?? [])].map((r) => textHas(r.text, kws)).find(Boolean), 'gloss:mw');
    }
  }
  const apte = loadApte();
  const tryApte = (ak: string, how: 'citation' | 'stem' | 'neuter-in-masculine'): void => {
    const list = apte.get(ak);
    if (!list) return;
    if (how === 'neuter-in-masculine') {
      const texts = list.map(apteNeuterInsideMasculine).filter((t): t is string => !!t);
      if (texts.length === 0) return;
      seen.push(`Apte ${ak} (neuter sub-entry)`);
      tags.push(`oracle:apte#${ak}(n. sub-entry)`);
      gender = true;
      noteGloss(texts.map((t) => textHas(t, kws)).find(Boolean), 'gloss:apte');
      return;
    }
    // a headword in citation form (vfkzaH, Palam, latA) shows the gender by its ending; a stem headword needs the explicit marker
    const marker = g ? new RegExp(`<ab>${g}\\.</ab>`) : /<ab>a\.<\/ab>/;
    const ok = how === 'citation' || list.some((e) => marker.test(e.raw.slice(0, 400)));
    if (!ok) {
      seen.push(`Apte ${ak}: gender marker not found`);
      return;
    }
    seen.push(`Apte ${ak}`);
    tags.push(`oracle:apte#${ak}`);
    gender = true;
    noteGloss(list.map((e) => textHas(e.text, kws)).find(Boolean), 'gloss:apte');
  };
  for (const k of altKeys(k0)) {
    const cite = g && citation ? key(citation.replace(stem, k)) : undefined;
    const citeAlt = g && citation ? altKeys(key(citation)).find((x) => apte.has(x)) : undefined;
    const ck = cite && apte.has(cite) ? cite : citeAlt;
    if (ck && ck !== k) tryApte(ck, 'citation');
    else if (g === 'f' && /[AI]$/.test(k)) tryApte(k, 'citation');
    else tryApte(k, 'stem');
    if (g === 'n' && k.endsWith('a') && !tags.some((t) => t.startsWith('oracle:apte'))) tryApte(k + 'H', 'neuter-in-masculine');
    if (tags.some((t) => t.startsWith('oracle:apte'))) break;
  }
  if (g) {
    for (const k of altKeys(k0)) {
      const ak = loadAmara().get(k);
      if (ak?.has(g)) {
        tags.push('oracle:amarakosha');
        gender = true;
        seen.push('Amara');
        break;
      } else if (ak) seen.push(`Amara: ${[...ak].join('/')}`);
    }
    const n = loadDcs().lemmaGender.get(`${k0} ${g}`) ?? 0;
    if (n >= 2) tags.push(`corpus:dcs(${n})`);
  }
  return { tags, gender, gloss, seen: seen.join('; ') };
}

/** is `head` the last member of the compound `stem` (allowing a/ā-sandhi at the junction: क्रीडा + अङ्गण → क्रीडाङ्गण)? */
function endsWithHead(stem: string, head: string): boolean {
  if (stem.length <= head.length) return false;
  if (stem.endsWith(head)) return true;
  if (/^[aA]/.test(head) && stem.endsWith('A' + head.slice(1))) return true;
  return false;
}

function verifyNoun(c: Candidate): Verdict {
  const g = c.gender!;
  const stem = stemSlp(c.word);
  // ---- citation form
  const tables = oracleTables(c.word, g);
  const rule = citationByRule(stem, g);
  let citation: string | undefined;
  const citeTags: string[] = [];
  for (const t of tables) {
    const nom = t.cells[0] ?? [];
    const cand = citationCandidates(stem, g).find((x) => nom.includes(x));
    if (cand) {
      if (citation && citation !== cand) return { ok: false, reason: `oracles disagree on the nominative: ${citation} vs ${cand}` };
      citation = cand;
      citeTags.push(t.name.replace(/#.*/, '') + '(nominative)');
    } else if (nom.length > 0 && rule && !nom.includes(rule)) {
      return { ok: false, reason: `nominative by rule ${rule} contradicts ${t.name}: ${nom.join('/')}` };
    }
  }
  if (!citation) {
    // Apte lists nouns under their nominative singular
    const ap = citationCandidates(stem, g).find((x) => x !== stem && loadApte().has(key(x)));
    if (ap && (!rule || ap === rule)) {
      citation = ap;
      citeTags.push('oracle:apte(headword)');
    }
  }
  if (!citation) {
    // compound whose last member is a consonant-stem paradigm of the pack (इन्द्रधनुस् → धनुस्, सर्वनामन् → नामन्)
    for (const p of SHABDA_DATA) {
      if (p.genderless || p.gender !== g || p.kind === 'pronoun' || p.kind === 'numeral') continue;
      const ps = stemSlp(p.stem);
      if (ps.length >= 4 && stem.length > ps.length && stem.endsWith(ps) && !/[aAiIuU]$/.test(ps)) {
        citation = stem.slice(0, stem.length - ps.length) + slp(p.citation);
        citeTags.push(`pack:shabda#${p.id}(last member)`);
        break;
      }
    }
  }
  if (!citation && c.opts.modern && c.opts.head) {
    // compound: the citation ending is that of its (verified) head
    const head = stemSlp(c.opts.head);
    const headTables = oracleTables(c.opts.head, g);
    const headNom = citationCandidates(head, g).find((x) => headTables.some((t) => (t.cells[0] ?? []).includes(x))) ?? citationByRule(head, g);
    if (headNom && endsWithHead(stem, head)) citation = stem.slice(0, stem.length - head.length) + headNom.slice(0, 0) + (stem.endsWith(head) ? headNom : stem.slice(stem.length - head.length, stem.length - head.length + 1) + headNom.slice(1));
  }
  if (!citation) citation = rule;
  if (!citation) return { ok: false, reason: 'nominative singular could not be confirmed by any oracle for this stem class' };
  if (citeTags.length === 0) citeTags.push('rule:nominative(regular stem)');

  // ---- dictionary
  const d = dictNominal(c.word, g, c, citation);
  const tags: string[] = [];
  let source: string;
  if (d.gender && (d.gloss || c.opts.sense)) {
    // a word flagged as "modern sense" never claims a dictionary gloss, even if a keyword happens to occur in the article
    const modernSense = !!c.opts.sense || !d.gloss;
    tags.push(...d.tags.filter((t) => !(c.opts.sense && t.startsWith('gloss:'))));
    if (modernSense) tags.push('usage:samskrita-bharati(sense)');
    source = sourceName(d.tags, modernSense);
  } else if (c.opts.modern) {
    if (c.level < 1) return { ok: false, reason: 'modern coinage must be level ≥ 1' };
    if (c.opts.head) {
      const head = stemSlp(c.opts.head);
      if (!endsWithHead(stem, head)) return { ok: false, reason: `head ${c.opts.head} is not the last member of ${c.word}` };
      const hd = dictNominal(c.opts.head, g, { ...c, opts: {}, en: c.en }, undefined);
      if (!hd.gender) return { ok: false, reason: `head ${c.opts.head} is not a ${g}. word in the dictionaries (${hd.seen || 'not found'})` };
      tags.push(`oracle:mw-or-apte(head ${key(head)}, ${g}.)`);
    }
    tags.push('usage:samskrita-bharati');
    if (d.gender) tags.push(...d.tags.filter((t) => t.startsWith('oracle:')));
    source = 'modern Samskrita Bharati usage' + (c.opts.head ? ` (compound of ${c.opts.head}, gender from the dictionaries)` : '');
  } else if (!d.gender) {
    return { ok: false, reason: `stem with gender ${g} not found in MW / Apte / Amarakośa (${d.seen || 'no entry'})` };
  } else {
    return { ok: false, reason: `gloss "${c.en}" not confirmed by the dictionary definitions (${d.seen})` };
  }
  tags.push(...citeTags);
  const model = chooseModel(c.word, g);
  return { ok: true, entry: { sa: deva(citation), stem: c.word, pos: 'noun', gender: g, paradigm: model.link, source, verifiedBy: tags }, cells: model.cells, note: model.note };
}

function sourceName(tags: string[], modernSense: boolean): string {
  const names: string[] = [];
  if (tags.some((t) => t.startsWith('oracle:mw'))) names.push('Monier-Williams');
  if (tags.some((t) => t.startsWith('oracle:apte'))) names.push('Apte');
  if (tags.includes('oracle:amarakosha')) names.push('Amarakośa');
  return names.join(', ') + (modernSense ? '; modern sense per Samskrita Bharati usage' : '');
}

function verifyAdjective(c: Candidate): Verdict {
  const stem = stemSlp(c.word);
  let citation: string | undefined;
  const citeTags: string[] = [];
  const rule = citationByRule(stem, 'm');
  const tables = oracleTables(c.word, 'm');
  for (const t of tables) {
    const nom = t.cells[0] ?? [];
    const cand = citationCandidates(stem, 'm').find((x) => nom.includes(x));
    if (cand) {
      citation = citation ?? cand;
      citeTags.push(t.name.replace(/#.*/, '') + '(nominative)');
    }
  }
  if (!citation && /(mat|vat)$/.test(stem)) {
    const cells = declineWithKaleEndings(stem, stem.slice(-3), 'm');
    const nom = cells?.[0]?.[0];
    if (nom) {
      citation = nom;
      citeTags.push('oracle:learnsanskrit-kale-endings(nominative)');
    }
  }
  if (!citation) citation = rule;
  if (!citation) return { ok: false, reason: 'masculine nominative could not be confirmed for this stem class' };
  if (citeTags.length === 0) citeTags.push('rule:nominative(regular stem)');
  const d = dictNominal(c.word, undefined, c, undefined);
  if (!d.gender) return { ok: false, reason: `adjective stem not found in MW / Apte (${d.seen || 'no entry'})` };
  if (!d.gloss && !c.opts.sense) return { ok: false, reason: `gloss "${c.en}" not confirmed by the dictionary definitions (${d.seen})` };
  const tags = [...d.tags, ...(d.gloss ? [] : ['usage:samskrita-bharati(sense)']), ...citeTags];
  const model = chooseModel(c.word, 'm');
  // neuter and feminine forms of अ-stem adjectives, for phrase verification
  let cells = model.cells;
  if (stem.endsWith('a')) {
    const n = chooseModel(deva(stem), 'n');
    const f = chooseModel(deva(stem.slice(0, -1) + 'A'), 'f');
    cells = [...(model.cells ?? []), ...(n.cells ?? []), ...(f.cells ?? [])];
  }
  return { ok: true, entry: { sa: deva(citation), stem: c.word, pos: 'adjective', paradigm: model.link, source: sourceName(d.tags, !d.gloss), verifiedBy: tags }, cells, note: model.note };
}

function indeclinableKeys(word: string): string[] {
  const k = key(slp(word));
  const out = [k];
  if (k.endsWith('H')) out.push(k.slice(0, -1) + 's', k.slice(0, -1) + 'r');
  if (k.endsWith('t')) out.push(k.slice(0, -1) + 'd');
  return out;
}
function isIndeclinable(word: string, kws: string[]): { ok: boolean; tags: string[]; gloss: boolean } {
  const mw = loadMw();
  const tags: string[] = [];
  let gloss = false;
  for (const k of indeclinableKeys(word)) {
    const e = mw.entries.get(k);
    const ind = e?.records.filter((r) => r.lex.has('ind')) ?? [];
    if (ind.length > 0) {
      tags.push(`oracle:mw#${k}(ind.)`);
      if (ind.some((r) => textHas(r.text, kws)) || e!.records.some((r) => textHas(r.text, kws))) gloss = true;
    } else if (loadMwIndeclinables().has(k)) {
      tags.push(`oracle:mw-indeclinables#${k}`);
      if (e?.records.some((r) => textHas(r.text, kws))) gloss = true;
    }
    const ap = loadApte().get(k);
    if (ap?.some((x) => /<ab>(ind|adv)\.<\/ab>/.test(x.raw.slice(0, 500)))) {
      tags.push(`oracle:apte#${k}(ind.)`);
      if (ap.some((x) => textHas(x.text, kws))) gloss = true;
    }
    if (loadAmara().get(k)?.has('ind')) tags.push('oracle:amarakosha(avyaya)');
  }
  return { ok: tags.length > 0, tags, gloss };
}

function verifyAvyaya(c: Candidate): Verdict {
  const r = isIndeclinable(c.word, keywords(c));
  if (r.ok && (r.gloss || c.opts.sense)) return { ok: true, entry: { sa: c.word, pos: 'avyaya', source: sourceName(r.tags, !r.gloss), verifiedBy: [...new Set(r.tags), ...(r.gloss ? ['gloss:dictionary'] : ['usage:samskrita-bharati(sense)'])] } };
  if (c.opts.parts) {
    // a fused pair of indeclinables (किम् + तु → किन्तु): each part must be a dictionary indeclinable
    const tags: string[] = [];
    for (const part of c.opts.parts) {
      const pr = isIndeclinable(part, []);
      if (!pr.ok) return { ok: false, reason: `part ${part} is not a dictionary indeclinable` };
      tags.push(pr.tags[0]!);
    }
    return { ok: true, entry: { sa: c.word, pos: 'avyaya', source: `${c.opts.parts.join(' + ')} (Monier-Williams); meaning per common usage`, verifiedBy: [...tags, 'usage:samskrita-bharati(sense)'] } };
  }
  if (c.opts.modern) return { ok: true, entry: { sa: c.word, pos: 'avyaya', source: 'modern Samskrita Bharati usage', verifiedBy: ['usage:samskrita-bharati'] } };
  if (!r.ok) return { ok: false, reason: 'not marked as an indeclinable in MW / Apte / Amarakośa' };
  return { ok: false, reason: `gloss "${c.en}" not confirmed by the dictionary definitions` };
}

const SAFE_PREFIX_JOIN = (pre: string, base: string): string | undefined => {
  // only joins where no sandhi beyond the listed cases can arise
  const vowels = 'aAiIuUfFeEoO';
  if (pre === 'ud') {
    if ('kKcCwWtTpPsS'.includes(base.charAt(0)) && !base.startsWith('sT') && !base.startsWith('st')) return 'ut' + base;
    if ('gGdDbByrlv'.includes(base.charAt(0))) return 'ud' + base;
    return undefined;
  }
  if (pre === 'nir') return 'gGjJqQdDbBnmyrlvh'.includes(base.charAt(0)) && base.charAt(0) !== 'r' ? 'nir' + base : undefined;
  if (pre === 'sam') return 'pPbBm'.includes(base.charAt(0)) ? 'sam' + base : undefined;
  const last = pre.slice(-1);
  const first = base.charAt(0);
  if (!vowels.includes(last)) return undefined;
  if (vowels.includes(first)) {
    if ((last === 'a' || last === 'A') && (first === 'a' || first === 'A')) return pre.slice(0, -1) + 'A' + base.slice(1);
    if (last === 'a' && (first === 'e' || first === 'o')) return pre.slice(0, -1) + base; // 6.1.94 एङि पररूपम् (upasarga + root in e/o)
    return undefined;
  }
  // ṇatva / ṣatva after a prefix would change n- / s- initial roots: not handled here
  if ((first === 'n' || first === 's') && /[rfiu]/.test(pre)) return undefined;
  if (first === 'C') return undefined;
  return pre + base;
};

function verifyVerb(c: Candidate): Verdict {
  const vf = loadVerbForms();
  const form = key(slp(c.word));
  const tags: string[] = [];
  const kw = [c.kw ?? '', ...(c.opts.kw ?? [])].filter(Boolean);
  const heritageHas = (f: string): boolean => vf.heritageLat3s.has(f) || vf.heritageFinite.has(f);
  if (!c.opts.pre) {
    const hits = vf.lat3s.get(form);
    if (!hits) return { ok: false, reason: 'not a laṭ 3rd singular form in the ashtadhyayi.com conjugation tables' };
    if (!heritageHas(form)) return { ok: false, reason: 'not confirmed by the Sanskrit Heritage conjugation data' };
    let glossTag: string | undefined;
    let h = hits.find((x) => textHas(vf.dhatu.get(x.base)?.artha ?? '', kw));
    if (h) glossTag = 'gloss:dhatupatha';
    else {
      // fall back to the Monier-Williams article of the root
      for (const x of hits) {
        const root = key(devaToSlp1(vf.dhatu.get(x.base)?.dhatu ?? ''));
        if (loadMw().entries.get(root)?.records.some((r) => textHas(r.text, kw))) {
          h = x;
          glossTag = `gloss:mw#${root}`;
          break;
        }
      }
    }
    if (!h && !c.opts.sense) return { ok: false, reason: `meaning keyword "${kw.join('/')}" not found in the dhātupāṭha gloss of ${hits.map((x) => `${x.base} ${vf.dhatu.get(x.base)?.dhatu} (${vf.dhatu.get(x.base)?.artha})`).join(' | ')} nor in the MW root article` };
    h = h ?? hits[0]!;
    tags.push(`oracle:ashtadhyayi-com-dhatu#${h.base}${h.kind === 'causative' ? '(ṇic)' : ''}`, 'oracle:heritage-roots', glossTag ?? 'usage:samskrita-bharati(sense)');
    if (loadDcs().lat3s.has(form)) tags.push('corpus:dcs');
    return { ok: true, entry: { sa: c.word, pos: 'verb', source: `dhātu ${vf.dhatu.get(h.base)?.dhatu} (${h.base}), conjugation tables of ashtadhyayi.com (vidyut-prakriya) and Sanskrit Heritage`, verifiedBy: tags } };
  }
  // prefixed verb
  const pre = devaToSlp1(c.opts.pre);
  const base = key(slp(c.opts.base ?? ''));
  const hits = vf.lat3s.get(base);
  if (!hits) return { ok: false, reason: `base form ${c.opts.base} is not a laṭ 3rd singular form in the ashtadhyayi.com tables` };
  const dcs = loadDcs();
  const attested = dcs.lat3s.has(form);
  if (!heritageHas(base) && !attested) return { ok: false, reason: `base form ${c.opts.base} not confirmed by Sanskrit Heritage and the prefixed form is not attested in the DCS sample` };
  const root = c.opts.root ? key(c.opts.root) : undefined;
  const mwEntry = root ? loadMw().entries.get(root) : undefined;
  if (!root || !mwEntry) return { ok: false, reason: `prefixed root ${c.opts.root ?? '(none given)'} not found in Monier-Williams` };
  const joined = SAFE_PREFIX_JOIN(pre, base);
  if (joined !== undefined && joined !== form) return { ok: false, reason: `prefix join gives ${joined}, list has ${form}` };
  // where sandhi could intervene at the junction (ṣatva, ṇatva …) the junction itself must be attested in the corpus
  const junction = form.slice(0, Math.min(form.length, pre.length + 3));
  const junctionAttested = [...dcs.finite].some(([tok, lemma]) => key(lemma) === root && tok.startsWith(junction));
  if (joined === undefined && !attested && !junctionAttested) return { ok: false, reason: `prefix join ${pre}+${base} needs sandhi and neither the form nor its junction "${junction}…" is attested for ${root} in the DCS sample` };
  const kws = [...keywords(c), ...kw];
  const gloss = mwEntry.records.some((r) => textHas(r.text, kws));
  if (!gloss && !c.opts.sense) return { ok: false, reason: `gloss "${c.en}" (${kws.join('/')}) not found in the MW entry of ${root}` };
  tags.push(`oracle:ashtadhyayi-com-dhatu#${hits[0]!.base}(base ${base})`, heritageHas(base) ? 'oracle:heritage-roots(base)' : 'corpus:dcs(form)', `oracle:mw#${root}`, gloss ? 'gloss:mw' : 'usage:samskrita-bharati(sense)');
  if (joined === form) tags.push('rule:upasarga-join(no sandhi)');
  else tags.push(attested ? 'corpus:dcs(form attested)' : 'corpus:dcs(junction attested)');
  if (attested && !tags.includes('corpus:dcs(form attested)')) tags.push('corpus:dcs');
  return { ok: true, entry: { sa: c.word, pos: 'verb', source: `upasarga ${c.opts.pre} + ${c.opts.base}; Monier-Williams ${root}`, verifiedBy: tags } };
}

function verifyPronoun(c: Candidate): Verdict {
  const p = SHABDA_BY_ID.get(c.paradigm ?? '');
  if (!p) return { ok: false, reason: `paradigm ${c.paradigm} not in SHABDA` };
  const [v, n] = (c.cell ?? '').split('.').map(Number);
  const cell = p.forms[(v ?? 0) - 1]?.[(n ?? 0) - 1] ?? [];
  if (!cell.includes(c.word)) return { ok: false, reason: `${c.word} is not in ${c.paradigm} ${c.cell} (${cell.join('/')})` };
  return { ok: true, entry: { sa: c.word, stem: p.stem, pos: 'pronoun', gender: p.genderless ? undefined : p.gender, paradigm: p.id, source: `SHABDA pack ${p.id} ${c.cell}`, verifiedBy: [`pack:shabda#${p.id}@${c.cell}`, ...p.provenance.verifiedBy.map((t) => t.replace(/#.*/, ''))] } };
}

// ---------------------------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------------------------
const ASCII: Record<string, string> = {
  a: 'a', A: 'a', i: 'i', I: 'i', u: 'u', U: 'u', f: 'r', F: 'r', x: 'l', X: 'l', e: 'e', E: 'ai', o: 'o', O: 'au', M: 'm', H: 'h',
  k: 'k', K: 'kh', g: 'g', G: 'gh', N: 'n', c: 'c', C: 'ch', j: 'j', J: 'jh', Y: 'n', w: 't', W: 'th', q: 'd', Q: 'dh', R: 'n',
  t: 't', T: 'th', d: 'd', D: 'dh', n: 'n', p: 'p', P: 'ph', b: 'b', B: 'bh', m: 'm', y: 'y', r: 'r', l: 'l', v: 'v', S: 's', z: 's', s: 's', h: 'h',
};
function slug(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => [...devaToSlp1(w)].map((ch) => ASCII[ch] ?? '').join(''))
    .filter(Boolean)
    .join('-');
}

export function build(): { entries: BuiltEntry[]; dropped: Dropped[]; notes: string[]; categoryNotes: string[] } {
  const entries: BuiltEntry[] = [];
  const dropped: Dropped[] = [];
  const notes: string[] = [];
  const known = new Set<string>(); // every verified word form (SLP1) for phrase checking
  for (const p of SHABDA_DATA) for (const cell of p.forms.flat()) for (const f of cell) known.add(slp(f));
  const prefixes = new Set<string>();

  const all: Candidate[] = VOCAB_LIST.flatMap((cat) => cat.rows.map((r) => ({ ...r, category: cat.id })));
  const phrases: Candidate[] = [];
  for (const c of all) {
    if (c.pos === 'phrase') {
      phrases.push(c);
      continue;
    }
    let v: Verdict;
    if (c.pos === 'noun') v = verifyNoun(c);
    else if (c.pos === 'adjective') v = verifyAdjective(c);
    else if (c.pos === 'avyaya') v = verifyAvyaya(c);
    else if (c.pos === 'verb') v = verifyVerb(c);
    else v = verifyPronoun(c);
    if (!v.ok) {
      dropped.push({ word: c.word, category: c.category, en: c.en, reason: v.reason });
      continue;
    }
    if (v.note) notes.push(`${c.word} (${c.category}): ${v.note}`);
    known.add(slp(v.entry.sa));
    for (const cell of v.cells ?? []) for (const f of cell) known.add(f);
    if (c.pos === 'verb' && c.opts.pre) prefixes.add(devaToSlp1(c.opts.pre));
    entries.push({ ...v.entry, id: c.opts.id ?? slug(c.pos === 'noun' || c.pos === 'adjective' ? c.word : v.entry.sa), category: c.category, level: c.level, en: c.en, emoji: c.emoji });
  }

  // ---- phrases: every word must be a verified form
  const vf = loadVerbForms();
  const mw = loadMw();
  const wordOk = (tokenDeva: string): string | undefined => {
    const t = key(slp(tokenDeva.replace(/ं$/, 'म्')));
    if (known.has(t)) return 'pack form';
    if (vf.kta.has(t)) return 'kta participle (ashtadhyayi.com kṛdanta table)';
    if (vf.finite.has(t) && (vf.heritageFinite.has(t) || loadDcs().finite.has(t)) && /(ti|te|tu|tAm|mi|maH|si|anti|antu)$/.test(t)) return 'finite verb (ashtadhyayi.com + Heritage/DCS)';
    for (const pre of prefixes) {
      if (!t.startsWith(pre === 'ud' ? 'ut' : pre)) continue;
      for (const cand of [t.slice(pre.length), 'a' + t.slice(pre.length), 'A' + t.slice(pre.length)]) {
        if (vf.finite.has(cand) && SAFE_PREFIX_JOIN(pre, cand) === t) return `upasarga ${pre} + finite verb`;
      }
    }
    if (isIndeclinable(tokenDeva, []).ok) return 'indeclinable (dictionary)';
    // nominative singular of a dictionary stem
    const tryStem = (stem: string, g: Gender): boolean => {
      const e = mw.entries.get(key(stem));
      return !!e && e.records.some((r) => r.lex.has(g));
    };
    if (t.endsWith('aH') && tryStem(t.slice(0, -1), 'm')) return 'nominative of an MW stem (m.)';
    if (t.endsWith('am') && tryStem(t.slice(0, -1), 'n')) return 'nominative of an MW stem (n.)';
    return undefined;
  };
  for (const c of phrases) {
    const tokens = c.word.split(' ');
    const how: string[] = [];
    let fail: string | undefined;
    if (c.opts.modern && c.opts.head && tokens.length === 1) {
      const head = SHABDA_BY_STEM.get(`${c.opts.head} f`) ?? SHABDA_BY_STEM.get(`${c.opts.head} m`) ?? SHABDA_BY_STEM.get(`${c.opts.head} n`);
      if (!head || !c.word.endsWith(head.citation)) fail = `compound head ${c.opts.head} not verified`;
      else how.push(`compound ending in ${head.citation} (pack:shabda#${head.id})`, 'usage:samskrita-bharati');
    } else if (c.opts.parts) {
      for (const part of c.opts.parts) {
        const ok = wordOk(part);
        if (!ok) fail = `part ${part} is not a verified form`;
        else how.push(`${part}: ${ok}`);
      }
      how.push('sandhi:manual(listed in REVIEW.md)');
    } else {
      for (const tok of tokens) {
        const ok = wordOk(tok);
        if (!ok) fail = `word ${tok} is not a verified form`;
        else how.push(`${tok}: ${ok}`);
      }
    }
    if (fail) {
      dropped.push({ word: c.word, category: c.category, en: c.en, reason: fail });
      continue;
    }
    entries.push({ id: c.opts.id ?? slug(c.word), sa: c.word, pos: 'phrase', en: c.en, category: c.category, level: c.level, source: 'spoken-Sanskrit courtesy phrase (Samskrita Bharati usage); every word verified', verifiedBy: ['usage:samskrita-bharati', ...how.map((h) => `word:${h}`)] });
  }

  // ---- category names
  const categoryNotes: string[] = [];
  for (const cat of VOCAB_LIST) {
    for (const tok of cat.sa.split(' ')) if (!wordOk(tok)) categoryNotes.push(`category ${cat.id}: name word ${tok} is not a mechanically verified form`);
  }

  // ---- ids: disambiguate collisions deterministically
  const byId = new Map<string, BuiltEntry[]>();
  for (const e of entries) {
    const list = byId.get(e.id);
    if (list) list.push(e);
    else byId.set(e.id, [e]);
  }
  for (const [id, list] of byId) {
    if (list.length < 2) continue;
    for (const e of list) e.id = `${id}-${e.pos === 'noun' ? (e.gender ?? 'x') : e.pos === 'adjective' ? 'adj' : e.pos}`;
  }
  const seenIds = new Map<string, string>();
  const collisions: string[] = [];
  for (const e of entries) {
    const prev = seenIds.get(e.id);
    if (prev) collisions.push(`${e.id}: ${prev} / ${e.sa}`);
    seenIds.set(e.id, e.sa);
    if (!/^[a-z][a-z-]*$/.test(e.id)) throw new Error(`bad id ${e.id} for ${e.sa}`);
  }
  if (collisions.length) throw new Error(`id collisions that need an explicit opts.id in vocab-list.ts:\n${collisions.join('\n')}`);

  // ---- uniqueness rules
  const pair = new Set<string>();
  const perCat = new Set<string>();
  const emojiCat = new Set<string>();
  const final: BuiltEntry[] = [];
  for (const e of entries) {
    const pk = `${e.sa}|${e.en}`;
    const ck = `${e.category}|${e.sa}`;
    if (pair.has(pk)) {
      dropped.push({ word: e.sa, category: e.category, en: e.en, reason: 'duplicate (sa, en) pair' });
      continue;
    }
    if (perCat.has(ck)) {
      dropped.push({ word: e.sa, category: e.category, en: e.en, reason: 'same word twice in one category' });
      continue;
    }
    pair.add(pk);
    perCat.add(ck);
    if (e.emoji) {
      const ek = `${e.category}|${e.emoji}`;
      if (emojiCat.has(ek)) {
        notes.push(`${e.sa} (${e.category}): emoji ${e.emoji} already used in this category — removed`);
        e.emoji = undefined;
      } else emojiCat.add(ek);
    }
    for (const s of [e.sa, e.stem ?? e.sa]) {
      const r = validateDeva(s);
      if (!r.ok) throw new Error(`${e.id}: invalid Devanagari ${s}: ${r.errors.join('; ')}`);
    }
    final.push(e);
  }
  return { entries: final, dropped, notes, categoryNotes };
}

function q(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function render(entries: BuiltEntry[]): string {
  const L: string[] = [];
  L.push('/**');
  L.push(' * GENERATED FILE — do not edit by hand.');
  L.push(' * Source of truth: tools/content/nominal/vocab-list.ts, verified against the dictionaries by gen-vocab.ts.');
  L.push(' * Regenerate: node --import tsx tools/content/nominal/gen-vocab.ts');
  L.push(' */');
  L.push("import type { VocabCategory, VocabEntry } from './types';");
  L.push('');
  L.push('// prettier-ignore');
  L.push('export const VOCAB_CATEGORY_DATA: readonly VocabCategory[] = [');
  for (const cat of VOCAB_LIST) if (entries.some((e) => e.category === cat.id)) L.push(`  { id: ${q(cat.id)}, sa: ${q(cat.sa)}, en: ${q(cat.en)}, emoji: ${q(cat.emoji)} },`);
  L.push('];');
  L.push('');
  // one typed array per category: a single 1,000-element literal exceeds TypeScript's union-complexity limit
  const names: string[] = [];
  for (const cat of VOCAB_LIST) {
    const xs = entries.filter((e) => e.category === cat.id);
    if (xs.length === 0) continue;
    const name = `${cat.id.toUpperCase()}`;
    names.push(name);
    L.push('// prettier-ignore');
    L.push(`const ${name}: readonly VocabEntry[] = [`);
    for (const e of xs) {
      const parts = [`id: ${q(e.id)}`, `sa: ${q(e.sa)}`];
      if (e.stem) parts.push(`stem: ${q(e.stem)}`);
      parts.push(`pos: ${q(e.pos)}`);
      if (e.gender) parts.push(`gender: ${q(e.gender)}`);
      parts.push(`en: ${q(e.en)}`, `category: ${q(e.category)}`, `level: ${e.level}`);
      if (e.emoji) parts.push(`emoji: ${q(e.emoji)}`);
      if (e.paradigm) parts.push(`paradigm: ${q(e.paradigm)}`);
      parts.push(`provenance: { source: ${q(e.source)}, verifiedBy: [${e.verifiedBy.map(q).join(', ')}] }`);
      L.push(`  { ${parts.join(', ')} },`);
    }
    L.push('];');
    L.push('');
  }
  L.push(`export const VOCAB_DATA: readonly VocabEntry[] = [${names.map((n) => `...${n}`).join(', ')}];`);
  L.push('');
  return L.join('\n');
}

function renderReport(b: ReturnType<typeof build>): string {
  const { entries, dropped, notes, categoryNotes } = b;
  const L: string[] = [];
  L.push('# VOCAB verification report (generated)', '');
  L.push(`Candidates: ${entries.length + dropped.length}. Accepted: ${entries.length}. Dropped: ${dropped.length}.`, '');
  const count = (pred: (e: BuiltEntry) => boolean): number => entries.filter(pred).length;
  const has = (e: BuiltEntry, p: string): boolean => e.verifiedBy.some((t) => t.startsWith(p));
  L.push('## What verified what', '');
  L.push(`- Monier-Williams (stem + gender / indeclinable / prefixed root): ${count((e) => has(e, 'oracle:mw'))}`);
  L.push(`- Apte 1890: ${count((e) => has(e, 'oracle:apte'))}`);
  L.push(`- Amarakośa: ${count((e) => has(e, 'oracle:amarakosha'))}`);
  L.push(`- English gloss found in a dictionary definition (MW / Apte / dhātupāṭha): ${count((e) => has(e, 'gloss:'))}`);
  L.push(`- DCS corpus attestation (supplementary): ${count((e) => has(e, 'corpus:dcs'))}`);
  L.push(`- Verb form in ashtadhyayi.com tables AND Sanskrit Heritage: ${count((e) => has(e, 'oracle:ashtadhyayi-com-dhatu'))}`);
  L.push(`- Pronoun forms checked against the SHABDA pack: ${count((e) => e.pos === 'pronoun')}`);
  L.push(`- Modern coinage / usage (usage:samskrita-bharati, not a dictionary headword in this sense): ${count((e) => e.verifiedBy.includes('usage:samskrita-bharati'))}`);
  L.push(`- Dictionary word with a modern sense (usage:samskrita-bharati(sense)): ${count((e) => e.verifiedBy.includes('usage:samskrita-bharati(sense)'))}`);
  L.push(`- Entries linked to a SHABDA paradigm: ${count((e) => !!e.paradigm)}`);
  L.push('');
  L.push('## Per category', '', '| category | entries | level ≤ 1 | with emoji |', '|---|---|---|---|');
  for (const cat of VOCAB_LIST) {
    const xs = entries.filter((e) => e.category === cat.id);
    L.push(`| ${cat.id} | ${xs.length} | ${xs.filter((e) => e.level <= 1).length} | ${xs.filter((e) => e.emoji).length} |`);
  }
  L.push('', '## Per part of speech', '');
  for (const pos of ['noun', 'adjective', 'avyaya', 'verb', 'pronoun', 'phrase']) L.push(`- ${pos}: ${count((e) => e.pos === pos)}`);
  L.push('', '## Level distribution', '');
  for (let l = 0; l <= 5; l++) L.push(`- level ${l}: ${count((e) => e.level === l)}`);
  L.push('', '## Modern coinages and modern senses (reviewer: look here first)', '', '| word | gloss | category | basis |', '|---|---|---|---|');
  for (const e of entries) if (e.verifiedBy.some((t) => t.startsWith('usage:samskrita-bharati')) && e.pos !== 'phrase') L.push(`| ${e.sa} | ${e.en} | ${e.category} | ${e.verifiedBy.filter((t) => !t.startsWith('rule:') && !t.startsWith('corpus:')).join(', ')} |`);
  L.push('', '## Phrases', '', '| phrase | gloss | how each word was verified |', '|---|---|---|');
  for (const e of entries) if (e.pos === 'phrase') L.push(`| ${e.sa} | ${e.en} | ${e.verifiedBy.filter((t) => t.startsWith('word:')).map((t) => t.slice(5)).join(' · ')} |`);
  L.push('', '## Dropped candidates', '', '| word | category | gloss | reason |', '|---|---|---|---|');
  for (const d of dropped) L.push(`| ${d.word} | ${d.category} | ${d.en} | ${d.reason.replace(/\|/g, '/')} |`);
  L.push('', '## Notes (paradigm links, emoji)', '');
  for (const n of notes) L.push(`- ${n}`);
  L.push('', '## Category names', '');
  if (categoryNotes.length === 0) L.push('Every word of every Sanskrit category name is a verified form.');
  for (const n of categoryNotes) L.push(`- ${n}`);
  L.push('');
  return L.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!oraclesAvailable() || !dictsAvailable()) {
    console.error(`Reference datasets not found under ${ORACLE_ROOT} (set SAMSKURU_ORACLES).`);
    process.exit(2);
  }
  const b = build();
  const text = render(b.entries);
  if (process.argv.includes('--check')) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (current !== text) {
      console.error('src/content/vocab/data.ts is stale: re-run gen-vocab.ts');
      process.exit(1);
    }
    console.log(`vocab data up to date (${b.entries.length} entries)`);
  } else {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, text);
    mkdirSync(dirname(REPORT), { recursive: true });
    writeFileSync(REPORT, renderReport(b));
    console.log(`wrote ${b.entries.length} entries; dropped ${b.dropped.length}`);
  }
}
