/**
 * Generates src/content/sentences/data.ts: simple sentences that are correct BY CONSTRUCTION.
 *
 *   node --import tsx tools/content/verbal/gen-sentences.ts
 *
 * Every verb form is read from the verified dhātu pack (prefixed verbs: the pack's base form
 * joined by joinPrefix); every nominal form from the śabda oracle (see nominal.ts); agreement
 * and case government are fixed by the pattern that builds the sentence; which words may
 * combine comes from the hand-curated compatibility table in sentence-lexicon.ts.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { conj, dhatu, PREFIXED } from '../../../src/content/dhatu/index';
import { SHABDA } from '../../../src/content/shabda/index';
import { devaToSlp1, normalizeDeva, slp1ToDeva, validateDeva } from '../../../src/sanskrit/translit';
import type { Gender, Lakara, Level, Purusha, Vacana, Vibhakti } from '../../../src/content/types';
import { Nominals } from './nominal';
import { key, normSlp, oraclePath, PATHS, pausa } from './oracles';
import { joinPrefix } from './prefixed-build';
import { PREFIXED_SPECS } from './prefixed-list';
import { ADJECTIVES, AVYAYA, COMPANY, COUNTABLES, DEFINITE, GIVING, INSTRUMENT, INTRANSITIVE, LOCATION, MOTION, NOUNS, POSSESSION, QUALITIES, REVERED, SOURCE, TRANSITIVE, VERBS, WITHOUT, type VerbSpec } from './sentence-lexicon';

const OUT = fileURLToPath(new URL('../../../src/content/sentences/data.ts', import.meta.url));

type Role = 'karta' | 'karma' | 'kriya' | 'karana' | 'sampradana' | 'apadana' | 'sambandha' | 'adhikarana' | 'sambodhana' | 'visheshana' | 'avyaya';
interface W {
  sa: string;
  en: string;
  role: Role;
  lemma: string;
  tag: string;
}
interface S {
  words: W[];
  en: string;
  level: Level;
  topic: string;
  pattern: string;
  tags: Set<string>;
}

const N = new Nominals();
const usedTags = new Set<string>();
const list = (s: string): string[] => s.split(' ').filter((x) => x.length > 0);

// ── verification of the hand-written lexicon ───────────────────────────────────────────────

function loadCsvFirstColumn(rel: string): Set<string> {
  const out = new Set<string>();
  const p = oraclePath(rel);
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split('\n').slice(1)) out.add(normSlp(pausa(line.split(',')[0] ?? '')));
  return out;
}
const mwStems = new Map<string, string>();
{
  const p = oraclePath('sanskrit_data/monier-williams/nominal-stems.csv');
  if (existsSync(p)) for (const line of readFileSync(p, 'utf8').split('\n').slice(1)) {
    const [stem = '', g = ''] = line.split(',');
    mwStems.set(stem, (mwStems.get(stem) ?? '') + g.trim());
  }
}
const mwText = existsSync(oraclePath(PATHS.mwText)) ? readFileSync(oraclePath(PATHS.mwText), 'utf8') : '';
const indeclinables = new Set([...loadCsvFirstColumn('sanskrit_data/monier-williams/indeclinables.csv'), ...loadCsvFirstColumn('sanskrit_data/learnsanskrit.org/indeclinables.csv')]);

const lexiconEvidence: string[] = [];
for (const [k, spec] of Object.entries(NOUNS)) {
  const slp = devaToSlp1(spec.stem);
  const inOracle = N.headword(spec.stem, spec.g) !== undefined;
  const inMw = (mwStems.get(slp) ?? '').includes(spec.g);
  const inPack = SHABDA.some((p) => p.stem === spec.stem && p.gender === spec.g);
  if (!inOracle && !inMw && !inPack) throw new Error(`noun ${k} (${spec.stem}, ${spec.g}): stem/gender not confirmed by any reference`);
  lexiconEvidence.push(`${spec.stem}(${spec.g}): ${[inOracle ? 'oracle-headword' : '', inMw ? 'mw-gender' : '', inPack ? 'shabda-pack' : ''].filter(Boolean).join('+')}`);
}
for (const [k, a] of Object.entries(ADJECTIVES)) {
  const slp = devaToSlp1(a.stem);
  const re = new RegExp(`<k1>${slp}<k2>[^\\n]*\\n[^\\n]*<lex>mf\\(<s>A/?</s>`);
  if (!re.test(mwText)) throw new Error(`adjective ${k}: MW does not give a feminine in -ā`);
}
for (const [k, a] of Object.entries(AVYAYA)) {
  const slp = normSlp(devaToSlp1(a.sa));
  const ok = indeclinables.has(slp) || mwText.includes(`<k1>${slp.replace(/H$/, 's')}<k2>`);
  if (!ok) throw new Error(`avyaya ${k} (${a.sa}) not found in the indeclinable lists or MW headwords`);
}

// ── word builders ──────────────────────────────────────────────────────────────────────────

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function np(k: string, vacana: Vacana): string {
  const s = NOUNS[k];
  if (!s) throw new Error(`unknown noun ${k}`);
  if (s.name && !DEFINITE.has(k)) return s.en;
  if (s.pl === '' && !DEFINITE.has(k)) return s.en;
  return `the ${vacana === 1 ? s.en : s.pl}`;
}
function noun(k: string, vib: Vibhakti, vacana: Vacana, role: Role, en: string, tags: Set<string>): W {
  const s = NOUNS[k];
  if (!s) throw new Error(`unknown noun ${k}`);
  const src = N.decline(s.stem, s.g, vib, vacana);
  // a second, independently built pack must agree wherever it has the word
  const pack = SHABDA.find((p) => p.stem === s.stem && p.gender === s.g);
  if (pack) {
    const cell = pack.forms[vib - 1]?.[vacana - 1] ?? [];
    if (!cell.includes(src.forms[0] ?? '')) throw new Error(`${s.stem} ${vib}.${vacana}: ${src.forms[0]} disagrees with the shabda pack (${cell.join('/')})`);
    tags.add(`pack:shabda/${pack.id}`);
  }
  for (const t of src.verifiedBy) tags.add(t);
  return { sa: src.forms[0] ?? '', en, role, lemma: s.stem, tag: `${vib}.${vacana}.${s.g}` };
}
function adjective(k: string, g: Gender, vib: Vibhakti, vacana: Vacana, tags: Set<string>): W {
  const a = ADJECTIVES[k];
  if (!a) throw new Error(`unknown adjective ${k}`);
  const stem = g === 'f' ? normalizeDeva(slp1ToDeva(devaToSlp1(a.stem).slice(0, -1) + 'A')) : a.stem;
  const src = N.decline(stem, g, vib, vacana);
  for (const t of src.verifiedBy) tags.add(t);
  tags.add('oracle:mw(feminine-in-ā)');
  return { sa: src.forms[0] ?? '', en: a.en, role: 'visheshana', lemma: a.stem, tag: `${vib}.${vacana}.${g}` };
}
function avyaya(k: keyof typeof AVYAYA): W {
  return { sa: AVYAYA[k].sa, en: AVYAYA[k].en, role: 'avyaya', lemma: AVYAYA[k].sa, tag: 'avyaya' };
}

const PREFIXED_LAN_OK = new Set(['a-gam', 'upa-vis', 'pra-vis', 'ava-gam', 'a-ni', 'ut-stha']);
function verbForm(v: VerbSpec, lakara: Lakara, pu: Purusha, va: Vacana, tags: Set<string>): { sa: string; lemma: string } {
  const d = dhatu(v.dhatu);
  if (!d) throw new Error(`dhātu ${v.dhatu} missing from the pack`);
  const base = conj(d, lakara, v.pada, pu, va)[0];
  if (!base) throw new Error(`${v.dhatu} ${lakara} ${pu}.${va}: no form`);
  tags.add('pack:dhatu');
  if (!v.prefixed) return { sa: base, lemma: d.dhatu };
  const p = PREFIXED.find((x) => x.id === v.prefixed);
  const spec = PREFIXED_SPECS.find((x) => x.id === v.prefixed);
  if (!p || !spec) throw new Error(`prefixed verb ${v.prefixed} missing from the pack`);
  if (lakara === 'lan' && !PREFIXED_LAN_OK.has(spec.id)) throw new Error(`laṅ of ${spec.id} is not whitelisted`);
  const joined = joinPrefix(spec.prefixes, key(base), { baseId: spec.base, nopadesha: (d.upadesha ?? '').startsWith('ण') });
  const sa = normalizeDeva(slp1ToDeva(joined.form));
  if (lakara === 'lat' && pu === 1 && va === 1 && sa !== p.lat3s) throw new Error(`${spec.id}: join disagrees with PREFIXED`);
  tags.add('pack:dhatu(PREFIXED)');
  tags.add('rule:upasarga-join');
  return { sa, lemma: `${p.upasarga}+${d.dhatu}` };
}

type Agr = 'I' | 'you' | 'sg3' | 'pl';
interface Subj {
  w: W;
  pu: Purusha;
  va: Vacana;
  g: Gender | 'x';
  en: string;
  agr: Agr;
  /** honorific bhavān / bhavatī */
  polite?: boolean;
  id: string;
}
function nounSubj(k: string, va: Vacana, tags: Set<string>): Subj {
  const en = np(k, va);
  return { w: noun(k, 1, va, 'karta', en, tags), pu: 1, va, g: NOUNS[k]?.g ?? 'm', en, agr: va === 1 ? 'sg3' : 'pl', id: k };
}
const PRONOUNS: Record<string, { urlid: string; ls: string | null; lsg: string; va: Vacana; pu: Purusha; g: Gender | 'x'; en: string; gloss?: string; agr: Agr; lemma: string; polite?: boolean }> = {
  aham: { urlid: '@asmad1', ls: 'asmad', lsg: 'none', va: 1, pu: 3, g: 'x', en: 'I', agr: 'I', lemma: 'अस्मद्' },
  tvam: { urlid: '@yuSmad1', ls: 'yuzmad', lsg: 'none', va: 1, pu: 2, g: 'x', en: 'you', agr: 'you', lemma: 'युष्मद्' },
  sah: { urlid: '@tad1', ls: 'tad', lsg: 'm', va: 1, pu: 1, g: 'm', en: 'he', agr: 'sg3', lemma: 'तद्' },
  sa: { urlid: '@tad2', ls: 'tad', lsg: 'f', va: 1, pu: 1, g: 'f', en: 'she', agr: 'sg3', lemma: 'तद्' },
  vayam: { urlid: '@asmad1', ls: 'asmad', lsg: 'none', va: 3, pu: 3, g: 'x', en: 'we', agr: 'pl', lemma: 'अस्मद्' },
  yuyam: { urlid: '@yuSmad1', ls: 'yuzmad', lsg: 'none', va: 3, pu: 2, g: 'x', en: 'you all', agr: 'pl', lemma: 'युष्मद्' },
  te: { urlid: '@tad1', ls: 'tad', lsg: 'm', va: 3, pu: 1, g: 'm', en: 'they', agr: 'pl', lemma: 'तद्' },
  tah: { urlid: '@tad2', ls: 'tad', lsg: 'f', va: 3, pu: 1, g: 'f', en: 'they', agr: 'pl', lemma: 'तद्' },
  bhavan: { urlid: '@bhavat1', ls: null, lsg: '', va: 1, pu: 1, g: 'm', en: 'you', gloss: 'you (sir)', agr: 'you', lemma: 'भवत्', polite: true },
  bhavati: { urlid: '@bhavatI1', ls: null, lsg: '', va: 1, pu: 1, g: 'f', en: 'you', gloss: 'you (madam)', agr: 'you', lemma: 'भवती', polite: true },
  avam: { urlid: '@asmad1', ls: 'asmad', lsg: 'none', va: 2, pu: 3, g: 'x', en: 'we both', agr: 'pl', lemma: 'अस्मद्' },
  yuvam: { urlid: '@yuSmad1', ls: 'yuzmad', lsg: 'none', va: 2, pu: 2, g: 'x', en: 'you both', agr: 'pl', lemma: 'युष्मद्' },
  tau: { urlid: '@tad1', ls: 'tad', lsg: 'm', va: 2, pu: 1, g: 'm', en: 'they both', agr: 'pl', lemma: 'तद्' },
};
function pronForm(id: string, vib: Vibhakti, tags: Set<string>): string {
  const p = PRONOUNS[id];
  if (!p) throw new Error(`unknown pronoun ${id}`);
  const src = N.pronoun(p.urlid, p.ls, p.lsg, vib, p.va);
  for (const t of src.verifiedBy) tags.add(t);
  const packId = { '@asmad1': 'asmad', '@yuSmad1': 'yushmad', '@tad1': 'tad-m', '@tad2': 'tad-f', '@bhavat1': 'bhavat-m', '@bhavatI1': 'bhavati-f' }[p.urlid];
  const pack = SHABDA.find((x) => x.id === packId);
  if (pack) {
    const cell = pack.forms[vib - 1]?.[p.va - 1] ?? [];
    if (cell[0] !== src.forms[0]) throw new Error(`pronoun ${id} ${vib}: ${src.forms[0]} vs shabda pack display form ${cell[0]}`);
    tags.add(`pack:shabda/${pack.id}`);
  }
  return src.forms[0] ?? '';
}
function pronSubj(id: string, tags: Set<string>): Subj {
  const p = PRONOUNS[id];
  if (!p) throw new Error(`unknown pronoun ${id}`);
  const w: W = { sa: pronForm(id, 1, tags), en: p.gloss ?? p.en, role: 'karta', lemma: p.lemma, tag: `1.${p.va}.${p.g}` };
  return { w, pu: p.pu, va: p.va, g: p.g, en: p.en, agr: p.agr, id, ...(p.polite ? { polite: true } : {}) };
}

// ── English ────────────────────────────────────────────────────────────────────────────────

function enVerb(v: VerbSpec, lakara: Lakara, s: Subj, negated = false): string {
  const [base, s3, past] = v.en;
  const be = base === 'be';
  const not = negated ? ' not' : '';
  if (lakara === 'lrt') return `will${not} ${base}`;
  if (lakara === 'vidhilin') return `should${not} ${base}`;
  if (lakara === 'lan') {
    if (be) return (s.agr === 'I' || s.agr === 'sg3' ? 'was' : 'were') + not;
    return negated ? `did not ${base}` : past;
  }
  if (be) return (s.agr === 'I' ? 'am' : s.agr === 'sg3' ? 'is' : 'are') + not;
  if (negated) return `${s.agr === 'sg3' ? 'does' : 'do'} not ${base}`;
  return s.agr === 'sg3' ? s3 : base;
}
function obj(v: VerbSpec, objEn: string): string {
  return v.prep ? `${v.prep} ${objEn}` : objEn;
}
function kriya(vk: string, lakara: Lakara, s: Subj, tags: Set<string>, negated = false): W {
  const v = VERBS[vk];
  if (!v) throw new Error(`unknown verb ${vk}`);
  const f = verbForm(v, lakara, s.pu, s.va, tags);
  tags.add('rule:agreement');
  return { sa: f.sa, en: enVerb(v, lakara, s, negated), role: 'kriya', lemma: f.lemma, tag: `${lakara}.${s.pu}.${s.va}` };
}
/** English clause for an imperative, by subject. */
function enImperative(v: VerbSpec, s: Subj, rest: string): string {
  const core = `${v.en[0]}${rest ? ' ' + rest : ''}`;
  if (s.polite) return `Please ${core}.`;
  if (s.pu === 2) return s.va === 1 ? `${capital(core)}.` : s.va === 2 ? `Both of you, ${core}.` : `All of you, ${core}.`;
  return `Let ${s.agr === 'I' ? 'me' : s.en === 'he' ? 'him' : s.en === 'she' ? 'her' : s.en === 'they' ? 'them' : s.en} ${core}.`;
}

// ── sentence assembly ──────────────────────────────────────────────────────────────────────

const all: S[] = [];
function emit(pattern: string, level: Level, topic: string, tags: Set<string>, words: W[], en: string): void {
  for (const w of words) {
    const v = validateDeva(w.sa);
    if (!v.ok) throw new Error(`invalid Devanagari ${w.sa}: ${v.errors.join('; ')}`);
  }
  // L1 (śibira) is kept to two- and three-word present-tense sentences; longer ones start at L2
  const lv: Level = level === 1 && words.length > 3 ? 2 : level;
  all.push({ words, en, level: lv, topic, pattern, tags });
}
/** try-catch wrapper: a combination whose form cannot be verified is skipped, never guessed. */
const skipped: string[] = [];
function attempt(label: string, f: () => void): void {
  try {
    f();
  } catch (e) {
    skipped.push(`${label}: ${(e as Error).message}`);
  }
}
const subjOf = (id: string, va: Vacana, tags: Set<string>): Subj => (PRONOUNS[id] ? pronSubj(id, tags) : nounSubj(id, va, tags));
const TENSE_ADV: Partial<Record<Lakara, keyof typeof AVYAYA>> = { lat: 'adya', lan: 'hyah', lrt: 'shvah' };

// generic human actions used with pronoun subjects: [verb, object noun | '', destination?]
const HUMAN_ACTIONS: [string, string, string][] = [
  ['path', 'pustaka', 'school'],
  ['likh', 'patra', 'school'],
  ['khad', 'phala', 'food'],
  ['pa', 'jala', 'food'],
  ['drs', 'citra', 'home'],
  ['kri', 'phala', 'market'],
  ['sru', 'gita', 'home'],
  ['is', 'dugdha', 'food'],
  ['kr', 'karya', 'daily'],
  ['ani', 'jala', 'home'],
  ['pac', 'bhojana', 'food'],
  ['jna', 'uttara', 'school'],
  ['gam', 'vidyalaya', 'school'],
  ['gam', 'grha', 'home'],
  ['pravis', 'mandira', 'devotion'],
  ['has', '', 'home'],
  ['dhav', '', 'play'],
  ['krid', '', 'play'],
  ['upavis', '', 'daily'],
  ['utstha', '', 'daily'],
  ['agam', '', 'travel'],
  ['nrt', '', 'play'],
];
/** Stative verbs make odd commands ("want milk!", "know the answer!") and odd complements of "wants to / can". */
const NO_IMPERATIVE = new Set(['jna', 'is']);
const NO_TUMUN = new Set(['is', 'jna', 'labh', 'smr']);
/** Verbs whose "should always …" reads as sensible advice. */
const VIDHI_OK = new Set(['path', 'likh', 'nam', 'vand', 'sev', 'raks', 'puj', 'kr', 'smr', 'sic']);
const PERSON_PRONOUNS = ['aham', 'tvam', 'sah', 'sa', 'vayam', 'yuyam', 'te', 'tah', 'bhavan', 'bhavati'];

// 1. kartā + kriyā (laṭ)
for (const [vk, subs, topic] of INTRANSITIVE) {
  for (const sk of list(subs)) {
    for (const va of [1, 3] as Vacana[]) {
      attempt(`sv ${sk} ${vk}`, () => {
        const tags = new Set<string>();
        const s = nounSubj(sk, va, tags);
        const k = kriya(vk, 'lat', s, tags);
        emit('karta-kriya', 1, topic, tags, [s.w, k], `${capital(s.en)} ${k.en}.`);
      });
    }
  }
}
// 2. pronoun subjects (laṭ), with and without karma
for (const [vk, ok, topic] of HUMAN_ACTIONS) {
  for (const pk of PERSON_PRONOUNS) {
    attempt(`pron ${pk} ${vk}`, () => {
      const tags = new Set<string>();
      const s = pronSubj(pk, tags);
      const k = kriya(vk, 'lat', s, tags);
      const v = VERBS[vk] as VerbSpec;
      if (ok === '') emit('sarvanama-kriya', 1, topic, tags, [s.w, k], `${capital(s.en)} ${k.en}.`);
      else {
        const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
        emit('sarvanama-karma-kriya', 1, topic, tags, [s.w, o, k], `${capital(s.en)} ${k.en} ${obj(v, np(ok, 1))}.`);
      }
    });
  }
}
// 3. kartā + karma + kriyā (laṭ; singular and plural subjects, some plural objects)
for (const [vk, subs, objs, topic] of TRANSITIVE) {
  for (const sk of list(subs)) {
    for (const ok of list(objs)) {
      for (const va of [1, 3] as Vacana[]) {
        attempt(`svo ${sk} ${ok} ${vk}`, () => {
          const tags = new Set<string>();
          const s = nounSubj(sk, va, tags);
          const v = VERBS[vk] as VerbSpec;
          const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
          const k = kriya(vk, 'lat', s, tags);
          emit('karta-karma-kriya', 1, topic, tags, [s.w, o, k], `${capital(s.en)} ${k.en} ${obj(v, np(ok, 1))}.`);
        });
      }
    }
  }
}
for (const sk of ['balaka', 'balika', 'chatra', 'janaka']) {
  for (const ok of list(COUNTABLES)) {
    attempt(`count ${sk} ${ok}`, () => {
      const tags = new Set<string>();
      const s = nounSubj(sk, 1, tags);
      const o = noun(ok, 2, 3, 'karma', np(ok, 3), tags);
      const k = kriya('gan', 'lat', s, tags);
      emit('karta-karma-kriya', 1, 'school', tags, [s.w, o, k], `${capital(s.en)} ${k.en} ${np(ok, 3)}.`);
    });
  }
}
// 4. motion with dvitīyā
for (const [subs, places, topic] of MOTION) {
  for (const sk of list(subs)) {
    for (const pk of list(places)) {
      for (const va of [1, 3] as Vacana[]) {
        attempt(`go ${sk} ${pk}`, () => {
          const tags = new Set<string>();
          const s = nounSubj(sk, va, tags);
          const o = noun(pk, 2, 1, 'karma', `to ${np(pk, 1)}`, tags);
          const k = kriya('gam', 'lat', s, tags);
          emit('karta-karma-kriya', 1, topic, tags, [s.w, o, k], `${capital(s.en)} ${k.en} to ${np(pk, 1)}.`);
        });
      }
    }
  }
}
// 5. अत्र / तत्र + अस्ति; न; अपि; अद्य
for (const sk of ['balaka', 'balika', 'chatra', 'shikshaka', 'janaka', 'matr', 'pustaka', 'phala', 'grha', 'vidyalaya', 'mandira', 'vrksha', 'kukkura', 'lekhani']) {
  for (const adv of ['atra', 'tatra'] as const) {
    for (const va of [1, 3] as Vacana[]) {
      attempt(`asti ${sk}`, () => {
        const tags = new Set<string>();
        const s = nounSubj(sk, va, tags);
        const k = kriya('as', 'lat', s, tags);
        emit('karta-avyaya-kriya', 1, 'home', tags, [s.w, avyaya(adv), k], `${capital(s.en)} ${k.en} ${AVYAYA[adv].en}.`);
      });
    }
  }
}
for (const pk of ['aham', 'tvam', 'sah', 'sa', 'vayam', 'bhavan']) {
  for (const adv of ['atra', 'tatra'] as const) {
    attempt(`asti ${pk}`, () => {
      const tags = new Set<string>();
      const s = pronSubj(pk, tags);
      const k = kriya('as', 'lat', s, tags);
      emit('karta-avyaya-kriya', 1, 'home', tags, [s.w, avyaya(adv), k], `${capital(s.en)} ${k.en} ${AVYAYA[adv].en}.`);
    });
  }
}
for (const [vk, subs, topic] of INTRANSITIVE) {
  for (const sk of list(subs).slice(0, 3)) {
    attempt(`na ${sk} ${vk}`, () => {
      const tags = new Set<string>();
      const s = nounSubj(sk, 1, tags);
      const k = kriya(vk, 'lat', s, tags, true);
      emit('na-kriya', 1, topic, tags, [s.w, avyaya('na'), k], `${capital(s.en)} ${k.en}.`);
    });
    attempt(`api ${sk} ${vk}`, () => {
      const tags = new Set<string>();
      const s = nounSubj(sk, 1, tags);
      const k = kriya(vk, 'lat', s, tags);
      emit('api', 1, topic, tags, [s.w, avyaya('api'), k], `${capital(s.en)} also ${k.en}.`);
    });
  }
}
for (const [vk, subs, objs, topic] of TRANSITIVE.slice(0, 20)) {
  const sk = list(subs)[0] as string;
  const ok = list(objs)[0] as string;
  attempt(`na ${sk} ${ok} ${vk}`, () => {
    const tags = new Set<string>();
    const s = nounSubj(sk, 1, tags);
    const v = VERBS[vk] as VerbSpec;
    const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
    const k = kriya(vk, 'lat', s, tags, true);
    emit('na-kriya', 1, topic, tags, [s.w, o, avyaya('na'), k], `${capital(s.en)} ${k.en} ${obj(v, np(ok, 1))}.`);
  });
}
// 6. time adverb + tense (अद्य laṭ L1; ह्यः laṅ, श्वः lṛṭ L2) — noun and pronoun subjects
for (const lakara of ['lat', 'lan', 'lrt'] as Lakara[]) {
  const adv = TENSE_ADV[lakara] as keyof typeof AVYAYA;
  const level: Level = lakara === 'lat' ? 1 : 2;
  const pattern = lakara === 'lat' ? 'adya-lat' : lakara === 'lan' ? 'hyah-lan' : 'shvah-lrt';
  for (const [vk, subs, objs, topic] of TRANSITIVE) {
    if (vk === 'jna') continue;
    const ss = list(subs);
    const os = list(objs);
    for (let i = 0; i < Math.min(3, ss.length); i++) {
      const sk = ss[i] as string;
      const ok = os[i % os.length] as string;
      for (const va of [1, 3] as Vacana[]) {
        attempt(`${pattern} ${sk} ${ok} ${vk}`, () => {
          const tags = new Set<string>();
          const s = nounSubj(sk, va, tags);
          const v = VERBS[vk] as VerbSpec;
          const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
          const k = kriya(vk, lakara, s, tags);
          emit(pattern, level, topic, tags, [avyaya(adv), s.w, o, k], `${capital(AVYAYA[adv].en)} ${s.en} ${k.en} ${obj(v, np(ok, 1))}.`);
        });
      }
    }
  }
  for (const [vk, ok, topic] of HUMAN_ACTIONS) {
    for (const pk of PERSON_PRONOUNS) {
      attempt(`${pattern} ${pk} ${vk}`, () => {
        const tags = new Set<string>();
        const s = pronSubj(pk, tags);
        const v = VERBS[vk] as VerbSpec;
        const k = kriya(vk, lakara, s, tags);
        const subjEn = s.agr === 'I' ? 'I' : s.en;
        if (ok === '') emit(pattern, level, topic, tags, [avyaya(adv), s.w, k], `${capital(AVYAYA[adv].en)} ${subjEn} ${k.en}.`);
        else {
          const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
          emit(pattern, level, topic, tags, [avyaya(adv), s.w, o, k], `${capital(AVYAYA[adv].en)} ${subjEn} ${k.en} ${obj(v, np(ok, 1))}.`);
        }
      });
    }
  }
}
// 7. मम / तव / तस्य … + noun + अत्र अस्ति (ṣaṣṭhī)
for (const [pk, enPoss] of [['aham', 'my'], ['tvam', 'your'], ['sah', 'his'], ['sa', 'her'], ['bhavan', 'your']] as const) {
  for (const tk of ['pustaka', 'lekhani', 'grha', 'kanduka', 'mitra']) {
    for (const adv of ['atra', 'tatra'] as const) {
      attempt(`mama ${pk} ${tk}`, () => {
        const tags = new Set<string>();
        const owner: W = { sa: pronForm(pk, 6, tags), en: enPoss, role: 'sambandha', lemma: PRONOUNS[pk]?.lemma ?? '', tag: `6.1.${PRONOUNS[pk]?.g ?? 'x'}` };
        const s = nounSubj(tk, 1, tags);
        const k = kriya('as', 'lat', s, tags);
        emit('sambandha', pk === 'aham' || pk === 'tvam' ? 1 : 2, 'home', tags, [owner, { ...s.w, en: NOUNS[tk]?.en ?? '' }, avyaya(adv), k], `${capital(enPoss)} ${NOUNS[tk]?.en} is ${AVYAYA[adv].en}.`);
      });
    }
  }
}
for (const [owners, things] of POSSESSION) {
  for (const ok of list(owners)) {
    for (const tk of list(things)) {
      for (const adv of ['atra', 'tatra'] as const) {
        attempt(`poss ${ok} ${tk}`, () => {
          const tags = new Set<string>();
          const owner = noun(ok, 6, 1, 'sambandha', `${np(ok, 1)}'s`, tags);
          const s = nounSubj(tk, 1, tags);
          const k = kriya('as', 'lat', s, tags);
          emit('sambandha', 2, 'home', tags, [owner, { ...s.w, en: NOUNS[tk]?.en ?? '' }, avyaya(adv), k], `${capital(np(ok, 1))}'s ${NOUNS[tk]?.en} is ${AVYAYA[adv].en}.`);
        });
      }
    }
  }
}
// 8. adhikaraṇa (saptamī)
for (const [vk, subs, places, topic] of LOCATION) {
  for (const sk of list(subs)) {
    for (const pk of list(places)) {
      for (const va of [1, 3] as Vacana[]) {
        attempt(`loc ${sk} ${pk} ${vk}`, () => {
          const tags = new Set<string>();
          const s = nounSubj(sk, va, tags);
          const prep = pk === 'marga' || pk === 'asana' || pk === 'vrksha' ? 'on' : 'in';
          const loc = noun(pk, 7, 1, 'adhikarana', `${prep} ${np(pk, 1)}`, tags);
          const k = kriya(vk, 'lat', s, tags);
          emit('adhikarana', 2, topic, tags, [s.w, loc, k], `${capital(s.en)} ${k.en} ${prep} ${np(pk, 1)}.`);
        });
      }
    }
  }
}
// 9. karaṇa (tṛtīyā)
for (const [vk, subs, objs, instrs, topic] of INSTRUMENT) {
  for (const sk of list(subs)) {
    for (const ik of list(instrs)) {
      for (const ok of objs === '' ? [''] : list(objs)) {
        attempt(`instr ${sk} ${ok} ${ik} ${vk}`, () => {
          const tags = new Set<string>();
          const s = nounSubj(sk, 1, tags);
          const v = VERBS[vk] as VerbSpec;
          const prep = vk === 'gam' ? 'by' : 'with';
          const ins = noun(ik, 3, 1, 'karana', `${prep} ${np(ik, 1)}`, tags);
          const k = kriya(vk, 'lat', s, tags);
          if (ok === '') emit('karana', 2, topic, tags, [s.w, ins, k], `${capital(s.en)} ${k.en} ${prep} ${np(ik, 1)}.`);
          else {
            const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
            emit('karana', 2, topic, tags, [s.w, ins, o, k], `${capital(s.en)} ${k.en} ${obj(v, np(ok, 1))} ${prep} ${np(ik, 1)}.`);
          }
        });
      }
    }
  }
}
// 10. saha + tṛtīyā
for (const [vk, subs, comps, topic] of COMPANY) {
  for (const sk of list(subs)) {
    for (const ck of list(comps)) {
      if (ck === sk) continue;
      attempt(`saha ${sk} ${ck} ${vk}`, () => {
        const tags = new Set<string>();
        const s = nounSubj(sk, 1, tags);
        const c = noun(ck, 3, 1, 'karana', np(ck, 1), tags);
        const k = kriya(vk, 'lat', s, tags);
        emit('saha', 2, topic, tags, [s.w, c, avyaya('saha'), k], `${capital(s.en)} ${k.en} with ${np(ck, 1)}.`);
      });
    }
  }
}
// 11. sampradāna (caturthī)
for (const [subs, recs, gifts, topic] of GIVING) {
  for (const sk of list(subs)) {
    for (const rk of list(recs)) {
      for (const gk of list(gifts)) {
        attempt(`give ${sk} ${rk} ${gk}`, () => {
          const tags = new Set<string>();
          const s = nounSubj(sk, 1, tags);
          const r = noun(rk, 4, 1, 'sampradana', `to ${np(rk, 1)}`, tags);
          const o = noun(gk, 2, 1, 'karma', np(gk, 1), tags);
          const k = kriya('da', 'lat', s, tags);
          emit('sampradana', 2, topic, tags, [s.w, r, o, k], `${capital(s.en)} ${k.en} ${np(gk, 1)} to ${np(rk, 1)}.`);
        });
      }
    }
  }
}
// 12. apādāna (pañcamī)
for (const [vk, subs, objs, sources, topic] of SOURCE) {
  for (const sk of list(subs)) {
    for (const fk of list(sources)) {
      for (const ok of objs === '' ? [''] : list(objs)) {
        attempt(`from ${sk} ${fk} ${vk}`, () => {
          const tags = new Set<string>();
          const s = nounSubj(sk, 1, tags);
          const v = VERBS[vk] as VerbSpec;
          const fear = vk === 'bhi';
          const src = noun(fk, 5, 1, 'apadana', `${fear ? 'of' : 'from'} ${np(fk, 1)}`, tags);
          const k = kriya(vk, 'lat', s, tags);
          if (fear) {
            emit('apadana', 3, topic, tags, [s.w, src, { ...k, en: 'is afraid' }], `${capital(s.en)} is afraid of ${np(fk, 1)}.`);
          } else if (ok === '') emit('apadana', 2, topic, tags, [s.w, src, k], `${capital(s.en)} ${k.en} from ${np(fk, 1)}.`);
          else {
            const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
            emit('apadana', 2, topic, tags, [s.w, src, o, k], `${capital(s.en)} ${k.en} ${obj(v, np(ok, 1))} from ${np(fk, 1)}.`);
          }
        });
      }
    }
  }
}
// 13. vinā (dvitīyā and tṛtīyā), prati, namaḥ
for (const [subs, things] of WITHOUT) {
  for (const sk of list(subs)) {
    for (const tk of list(things)) {
      for (const vib of [2, 3] as Vibhakti[]) {
        attempt(`vina ${sk} ${tk}`, () => {
          const tags = new Set<string>();
          const s = nounSubj(sk, 1, tags);
          const t = noun(tk, vib, 1, vib === 2 ? 'karma' : 'karana', np(tk, 1), tags);
          const k = kriya('jiv', 'lat', s, tags, true);
          emit('vina', 2, 'nature', tags, [s.w, t, avyaya('vina'), avyaya('na'), k], `${capital(s.en)} ${k.en} without ${np(tk, 1)}.`);
        });
      }
    }
  }
}
for (const [subs, places, topic] of MOTION) {
  for (const sk of list(subs).slice(0, 2)) {
    for (const pk of list(places)) {
      attempt(`prati ${sk} ${pk}`, () => {
        const tags = new Set<string>();
        const s = nounSubj(sk, 1, tags);
        const o = noun(pk, 2, 1, 'karma', np(pk, 1), tags);
        const k = kriya('gam', 'lat', s, tags);
        emit('prati', 2, topic, tags, [s.w, o, avyaya('prati'), k], `${capital(s.en)} ${k.en} towards ${np(pk, 1)}.`);
      });
    }
  }
}
for (const rk of list(REVERED)) {
  attempt(`namah ${rk}`, () => {
    const tags = new Set<string>();
    const r = noun(rk, 4, 1, 'sampradana', `to ${np(rk, 1)}`, tags);
    emit('namah', 2, 'devotion', tags, [r, avyaya('namah')], `Salutations to ${np(rk, 1)}.`);
  });
}
// 14. loṭ (commands and requests), with sambodhana variants
for (const [vk, ok, topic] of HUMAN_ACTIONS) {
  if (NO_IMPERATIVE.has(vk)) continue;
  for (const pk of ['tvam', 'yuyam', 'bhavan', 'bhavati', 'sah', 'te']) {
    attempt(`lot ${pk} ${vk}`, () => {
      const tags = new Set<string>();
      const s = pronSubj(pk, tags);
      const v = VERBS[vk] as VerbSpec;
      const k = kriya(vk, 'lot', s, tags);
      k.en = v.en[0];
      if (ok === '') emit('lot', 2, topic, tags, [s.w, k], enImperative(v, s, ''));
      else {
        const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
        emit('lot', 2, topic, tags, [s.w, o, k], enImperative(v, s, obj(v, np(ok, 1))));
      }
    });
  }
}
for (const [vk, ok, topic] of HUMAN_ACTIONS.slice(0, 14)) {
  if (NO_IMPERATIVE.has(vk)) continue;
  for (const ak of ['balaka', 'chatra', 'putra', 'mitra']) {
    attempt(`he ${ak} ${vk}`, () => {
      const tags = new Set<string>();
      const voc = noun(ak, 8, 1, 'sambodhana', NOUNS[ak]?.en ?? '', tags);
      const s = pronSubj('tvam', tags);
      const v = VERBS[vk] as VerbSpec;
      const k = kriya(vk, 'lot', s, tags);
      k.en = v.en[0];
      const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
      emit('sambodhana-lot', 2, topic, tags, [avyaya('he'), voc, o, k], `O ${NOUNS[ak]?.en}, ${v.en[0]} ${obj(v, np(ok, 1))}.`);
    });
  }
}
// 15. dual subjects (L2)
for (const [vk, ok, topic] of HUMAN_ACTIONS) {
  for (const pk of ['avam', 'yuvam', 'tau']) {
    attempt(`dual ${pk} ${vk}`, () => {
      const tags = new Set<string>();
      const s = pronSubj(pk, tags);
      const v = VERBS[vk] as VerbSpec;
      const k = kriya(vk, 'lat', s, tags);
      if (ok === '') emit('dvivacana', 2, topic, tags, [s.w, k], `${capital(s.en)} ${k.en}.`);
      else {
        const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
        emit('dvivacana', 2, topic, tags, [s.w, o, k], `${capital(s.en)} ${k.en} ${obj(v, np(ok, 1))}.`);
      }
    });
  }
}
// 16. vidhiliṅ (L3)
for (const [vk, subs, objs, topic] of TRANSITIVE) {
  if (!VIDHI_OK.has(vk)) continue;
  const ss = list(subs);
  const os = list(objs);
  for (let i = 0; i < Math.min(2, ss.length); i++) {
    const sk = ss[i] as string;
    const ok = os[(i + 1) % os.length] as string;
    for (const va of [1, 3] as Vacana[]) {
      attempt(`vidhilin ${sk} ${ok} ${vk}`, () => {
        const tags = new Set<string>();
        const s = nounSubj(sk, va, tags);
        const v = VERBS[vk] as VerbSpec;
        const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
        const k = kriya(vk, 'vidhilin', s, tags);
        emit('vidhilin', 3, topic, tags, [s.w, avyaya('sarvada'), o, k], `${capital(s.en)} should always ${v.en[0]} ${obj(v, np(ok, 1))}.`);
      });
    }
  }
}
// 17. tumun + इच्छति / शक्नोति (L3)
for (const [vk, subs, objs, topic] of TRANSITIVE) {
  if (NO_TUMUN.has(vk)) continue;
  const ss = list(subs);
  const os = list(objs);
  for (let i = 0; i < Math.min(3, ss.length); i++) {
    const sk = ss[i] as string;
    const ok = os[(i + 2) % os.length] as string;
    for (const aux of ['is', 'sak']) {
      attempt(`tumun ${sk} ${ok} ${vk} ${aux}`, () => {
        const tags = new Set<string>();
        const v = VERBS[vk] as VerbSpec;
        if (v.prefixed) throw new Error('tumun of prefixed verbs is not in the pack');
        const d = dhatu(v.dhatu);
        const inf = d?.krdanta.tumun?.[0];
        if (!d || !inf) throw new Error(`no tumun for ${v.dhatu}`);
        const s = nounSubj(sk, 1, tags);
        const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
        const k = kriya(aux, 'lat', s, tags);
        const infW: W = { sa: inf, en: `to ${v.en[0]}`, role: 'kriya', lemma: d.dhatu, tag: 'tumun' };
        const en = aux === 'is' ? `${capital(s.en)} wants to ${v.en[0]} ${obj(v, np(ok, 1))}.` : `${capital(s.en)} can ${v.en[0]} ${obj(v, np(ok, 1))}.`;
        emit(aux === 'is' ? 'tumun-icchati' : 'tumun-shaknoti', 3, topic, tags, [s.w, o, infW, k], en);
      });
    }
  }
}
// 18. ktvā clause (L3): X goes somewhere, then does something
const AFTER_GOING: [place: string, verb: string, object: string, subjects: string, topic: string][] = [
  ['grha', 'khad', 'bhojana', 'balaka balika chatra janaka', 'home'],
  ['grha', 'pa', 'jala', 'balaka balika krshaka', 'home'],
  ['vidyalaya', 'path', 'patha', 'chatra kanya balaka', 'school'],
  ['vidyalaya', 'likh', 'lekha', 'chatra balika', 'school'],
  ['apana', 'kri', 'phala', 'janaka matr sevaka', 'market'],
  ['apana', 'kri', 'vastra', 'matr janaka', 'market'],
  ['mandira', 'puj', 'deva', 'matr janaka balika', 'devotion'],
  ['udyana', 'drs', 'pushpa', 'balaka balika matr', 'nature'],
  ['nadi', 'pa', 'jala', 'ashva gaja', 'animals'],
  ['kshetra', 'kr', 'karya', 'krshaka', 'society'],
];
{
  const gam = dhatu('gam-1p');
  const gatva = gam?.krdanta.ktva?.[0];
  if (!gam || !gatva) throw new Error('गत्वा missing from the dhātu pack');
  for (const [pk, vk, ok, subs, topic] of AFTER_GOING) {
    for (const sk of list(subs)) {
      for (const va of [1, 3] as Vacana[]) {
        attempt(`ktva ${sk} ${pk} ${vk}`, () => {
          const tags = new Set<string>();
          const s = nounSubj(sk, va, tags);
          const v = VERBS[vk] as VerbSpec;
          const place = noun(pk, 2, 1, 'karma', `to ${np(pk, 1)}`, tags);
          const o = noun(ok, 2, 1, 'karma', np(ok, 1), tags);
          const k = kriya(vk, 'lat', s, tags);
          const g: W = { sa: gatva, en: 'having gone', role: 'kriya', lemma: gam.dhatu, tag: 'ktva' };
          emit('ktva', 3, topic, tags, [s.w, place, g, o, k], `Having gone to ${np(pk, 1)}, ${s.en} ${k.en} ${obj(v, np(ok, 1))}.`);
        });
      }
    }
  }
}
// 19. viśeṣaṇa agreement (L3): adjective + karma, adjective + kartā
const OBJECT_VERBS: Record<string, [verb: string, subject: string]> = {
  phala: ['khad', 'balaka'],
  modaka: ['khad', 'balika'],
  dugdha: ['pa', 'shishu'],
  jala: ['pa', 'chatra'],
  gita: ['sru', 'balika'],
  pustaka: ['path', 'chatra'],
  vastra: ['kri', 'matr'],
  grha: ['drs', 'janaka'],
  yana: ['drs', 'balaka'],
  kanduka: ['is', 'balaka'],
  lekhani: ['is', 'chatra'],
  marga: ['drs', 'krshaka'],
  nadi: ['drs', 'balaka'],
  katha: ['kath', 'matr'],
  lekha: ['likh', 'chatra'],
  pushpa: ['drs', 'balika'],
  gaja: ['drs', 'balaka'],
  vrksha: ['drs', 'balika'],
};
for (const [ak, nouns] of QUALITIES) {
  for (const nk of list(nouns)) {
    const ov = OBJECT_VERBS[nk];
    if (ov) {
      for (const va of [1, 3] as Vacana[]) {
        if (va === 3 && NOUNS[nk]?.pl === '') continue;
        attempt(`adj-obj ${ak} ${nk}`, () => {
          const tags = new Set<string>();
          const [vk, sk] = ov;
          const s = nounSubj(sk, 1, tags);
          const v = VERBS[vk] as VerbSpec;
          const g = NOUNS[nk]?.g ?? 'n';
          const a = adjective(ak, g, 2, va, tags);
          const count = NOUNS[nk]?.pl !== '';
          const head = va === 1 ? (NOUNS[nk]?.en ?? '') : (NOUNS[nk]?.pl ?? '');
          const o = noun(nk, 2, va, 'karma', head, tags);
          const k = kriya(vk, 'lat', s, tags);
          emit('visheshana-karma', 3, 'home', tags, [s.w, a, o, k], `${capital(s.en)} ${k.en} ${obj(v, `${count ? 'the ' : ''}${ADJECTIVES[ak]?.en} ${head}`)}.`);
        });
      }
    } else {
      // adjective qualifies the kartā: the skilful student reads
      for (const va of [1, 3] as Vacana[]) {
        attempt(`adj-subj ${ak} ${nk}`, () => {
          const tags = new Set<string>();
          const s = nounSubj(nk, va, tags);
          const a = adjective(ak, NOUNS[nk]?.g ?? 'm', 1, va, tags);
          const vk = ak === 'alasa' ? 'svap' : nk === 'gayaka' ? 'gai' : nk === 'krshaka' || nk === 'sevaka' ? 'agam' : 'path';
          const k = kriya(vk, 'lat', s, tags);
          const head = va === 1 ? NOUNS[nk]?.en : NOUNS[nk]?.pl;
          emit('visheshana-karta', 3, 'society', tags, [a, { ...s.w, en: head ?? '' }, k], `The ${ADJECTIVES[ak]?.en} ${head} ${k.en}.`);
        });
      }
    }
  }
}

// ── selection ──────────────────────────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const text = (s: S): string => s.words.map((w) => w.sa).join(' ');
const QUOTA: Record<string, number> = {
  'karta-kriya': 40,
  'sarvanama-kriya': 26,
  'sarvanama-karma-kriya': 44,
  'karta-karma-kriya': 90,
  'karta-avyaya-kriya': 20,
  'na-kriya': 16,
  api: 10,
  'adya-lat': 16,
  'hyah-lan': 36,
  'shvah-lrt': 36,
  sambandha: 22,
  adhikarana: 34,
  karana: 24,
  saha: 16,
  sampradana: 22,
  apadana: 26,
  vina: 8,
  prati: 8,
  namah: 7,
  lot: 34,
  'sambodhana-lot': 10,
  dvivacana: 14,
  vidhilin: 24,
  'tumun-icchati': 16,
  'tumun-shaknoti': 14,
  ktva: 24,
  'visheshana-karma': 22,
  'visheshana-karta': 12,
};
/**
 * Sentences that must be in the pack when the patterns produce them (the textbook staples),
 * identified by lemma:tag sequences — still no inflected form is typed here.
 */
const PINNED = new Set([
  'बालक:1.1.m पुस्तक:2.1.n पठ्:lat.1.1',
  'मातृ:1.1.f भोजन:2.1.n पच्:lat.1.1',
  'छात्र:1.3.m विद्यालय:2.1.m गम्:lat.1.3',
  'अस्मद्:1.1.x जल:2.1.n पा:lat.3.1',
  'अस्मद्:1.1.x विद्यालय:2.1.m गम्:lat.3.1',
  'बालक:1.1.m गृह:2.1.n गम्:ktva भोजन:2.1.n खाद्:lat.1.1',
  'बालिका:1.1.f गीत:2.1.n गै:lat.1.1',
  'मातृ:1.1.f बालक:4.1.m फल:2.1.n दा:lat.1.1',
  'फल:1.1.n वृक्ष:5.1.m पत्:lat.1.1',
  'गुरु:4.1.m नमः:avyaya',
]);
const signature = (s: S): string => s.words.map((w) => `${w.lemma}:${w.tag}`).join(' ');
const seen = new Set<string>();
const chosen: S[] = [];
const patternOrder = Object.keys(QUOTA);
for (const pattern of patternOrder) {
  const pool = all.filter((s) => s.pattern === pattern).sort((a, b) => hash(text(a)) - hash(text(b)) || (text(a) < text(b) ? -1 : 1));
  // spread over verbs: round-robin by verb lemma so that no single verb dominates a pattern
  const byVerb = new Map<string, S[]>();
  for (const s of pool) {
    const kv = s.words.filter((w) => w.role === 'kriya').map((w) => w.lemma).join('+') || '-';
    const arr = byVerb.get(kv) ?? [];
    arr.push(s);
    byVerb.set(kv, arr);
  }
  const queues = [...byVerb.values()];
  let taken = 0;
  const quota = QUOTA[pattern] ?? 0;
  for (const s of pool) {
    if (!PINNED.has(signature(s)) || seen.has(text(s))) continue;
    seen.add(text(s));
    chosen.push(s);
    taken++;
  }
  while (taken < quota && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const s = q.shift();
      if (!s || taken >= quota) continue;
      const t = text(s);
      if (seen.has(t)) continue;
      seen.add(t);
      chosen.push(s);
      taken++;
    }
  }
}

// ── output ─────────────────────────────────────────────────────────────────────────────────

const q = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const counters = new Map<string, number>();
const lines: string[] = [];
for (const s of chosen) {
  const n = (counters.get(s.pattern) ?? 0) + 1;
  counters.set(s.pattern, n);
  const id = `${s.pattern}-${String(n).padStart(3, '0')}`;
  const words = s.words.map((w) => [w.sa, w.en, w.role, w.lemma, w.tag].join('|')).join(' ; ');
  for (const t of s.tags) usedTags.add(t.replace(/\/.*$/, ''));
  const tags = [...new Set([...s.tags].map((t) => t.replace(/^pack:shabda\/.*$/, 'pack:shabda')))].sort();
  lines.push(`  { id: ${q(id)}, level: ${s.level}, topic: ${q(s.topic)}, pattern: ${q(s.pattern)}, en: ${q(s.en)}, w: ${q(words)}, v: [${tags.map(q).join(', ')}] },`);
}
const header = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate: node --import tsx tools/content/verbal/gen-sentences.ts   (see tools/content/verbal/README.md)
 *
 * w = words in prose order, ' ; '-separated; each word is  form|English gloss|role|lemma|tag.
 * Words are in padaccheda form (no sandhi between words; a final म् stays म्).
 */
import type { RawSentence } from './types';

export const SENTENCE_DATA: readonly RawSentence[] = [
${lines.join('\n')}
];
`;
writeFileSync(OUT, header);
const byLevel = new Map<number, number>();
for (const s of chosen) byLevel.set(s.level, (byLevel.get(s.level) ?? 0) + 1);
console.log(JSON.stringify({ candidates: all.length, chosen: chosen.length, byLevel: Object.fromEntries(byLevel), byPattern: Object.fromEntries(counters), skipped: skipped.length, tags: [...usedTags].sort() }, null, 1));
if (process.argv.includes('--skipped')) for (const s of [...new Set(skipped)]) console.log('SKIP', s);
if (process.argv.includes('--lexicon')) for (const s of lexiconEvidence) console.log('LEX', s);
