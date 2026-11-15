/**
 * Sambhāṣaṇa oracle (OWNER: sa-oracle). Machine verification that every Sanskrit word written in
 * content/sa-dialogue-*.json is a real, verified form (rules: notes/sambhashana.md → Verification).
 *
 * PURE module: no DOM, no I/O, no clock. It is imported only by sambhashana.test.ts and by the
 * translators' CLI checker — never by Game.tsx, so it never reaches the browser bundle.
 *
 * The form index is built once, lazily, keyed by `spellingKey` (अहं = अहम्). Every entry records
 * where the form comes from (`source`), its lemma, grammar, English and a teaching level. Sources:
 *   shabda       every cell of every SHABDA paradigm
 *   vocab        VOCAB citation forms (incl. the words of courtesy phrases)
 *   vocab-decl   VOCAB nouns/adjectives with a `paradigm`, declined by stem substitution
 *                (+ the neuter of a-stem adjectives, a regular rule)
 *   dhatu        finite forms (laṭ laṅ lṛṭ loṭ vidhiliṅ) of every root; L4 roots are flagged
 *   krdanta      ktvā, tumun, lyap as-is; kta / ktavatu / śatṛ / śānac / tavya / anīyar declined on models
 *   prefixed     PREFIXED verbs: lat3s, and upasarga + base form where the join is sandhi-free
 *   sentences    every word of the verified SENTENCES pack (e.g. आगच्छत्-type prefixed laṅ forms)
 *   lexicon      the game's verse-lexicon forms as stored; lexicon nouns declined on the automatic model
 *   name         names.json stems declined on the automatic model
 *   model        `models` entries of the dialogue files, declined on their SHABDA paradigm
 *   number       `cardinal` / `cardinalVariants` from @sanskrit
 *   interjection the tiny reviewed list below
 *
 * The oracle proves that each word EXISTS as written. It does not check agreement, case government,
 * word choice or meaning: a human reviewer still signs the dialogue off (see notes/sa-oracle.md).
 */
import { DHATUS, LAKARAS, PREFIXED, type DhatuEntry } from '@content/dhatu';
import { SHABDA, shabda, type ShabdaParadigm } from '@content/shabda';
import { VOCAB } from '@content/vocab';
import { SENTENCES } from '@content/sentences';
import type { Lakara, Pada } from '@content/types';
import { cardinal, cardinalVariants, devaToSlp1, slp1ToDeva, spellingKey, validateDeva } from '@sanskrit';
import type { DialogueEntry, KathaContent, LexEntry, MoveDef, NameEntry, Shloka } from './types';
import lexicon1 from './content/lexicon-1.json';
import lexicon2 from './content/lexicon-2.json';
import namesJson from './content/names.json';
import sa1 from './content/sa-dialogue-1.json';
import sa2 from './content/sa-dialogue-2.json';
import sa3 from './content/sa-dialogue-3.json';
import sa4 from './content/sa-dialogue-4.json';
import sa5 from './content/sa-dialogue-5.json';
import sa6 from './content/sa-dialogue-6.json';
import sa7 from './content/sa-dialogue-7.json';
import sa8 from './content/sa-dialogue-8.json';
import sa9 from './content/sa-dialogue-9.json';
import sa10 from './content/sa-dialogue-10.json';
import sa11 from './content/sa-dialogue-11.json';
import sa12 from './content/sa-dialogue-12.json';
import sa13 from './content/sa-dialogue-13.json';
import { CUTSCENE_FILES, UI_FILES, bundledParts, loadContent } from './content';
import { hashString } from '@sdk';
import defsJson from './content/defs.json';
import kathaJson from './content/katha.json';
import storyCommon from './content/story-common.json';
import storyCh1 from './content/story-ch1.json';
import storyCh2 from './content/story-ch2.json';
import storyCh3 from './content/story-ch3.json';
import storyCh4 from './content/story-ch4.json';
import storyCh5 from './content/story-ch5.json';
import storyCh6 from './content/story-ch6.json';
import { DEFEAT_TEXT, REST_TEXT, nextBookObjective } from './logic-events';
import { DEFAULT_OBJECTIVE } from './logic-state';

// ───────────────────────── Types ─────────────────────────

export type SaSource =
  | 'shabda'
  | 'vocab'
  | 'vocab-decl'
  | 'dhatu'
  | 'krdanta'
  | 'prefixed'
  | 'sentences'
  | 'lexicon'
  | 'name'
  | 'model'
  | 'number'
  | 'interjection';

export interface SaAnalysis {
  /** citation form / stem / root */
  lemma: string;
  source: SaSource;
  /** e.g. "ins. sg. m. (rama-m)", "laṭ 3sg P", "kta → acc. sg. n." */
  grammar: string;
  en: string;
  /** teaching level 1–4 (vocab / dhatu / shabda level; kṛdanta and lakāra raise it, see LAKARA_LEVEL / KRT_LEVEL) */
  level: number;
  /** reported (not failed) by the level report: 'L4 root', 'verse form', 'model (review)', … */
  flag?: string;
}

/** One `models` entry of a dialogue file: an extra stem declined like a SHABDA paradigm. */
export interface SaModel {
  stem: string;
  gender: 'm' | 'f' | 'n';
  paradigm: string;
  en: string;
  source: string;
}

export interface SaToken {
  text: string;
  analyses: SaAnalysis[];
  /** only for unknown words */
  suggestions?: string[];
}

export interface VerifyResult {
  ok: boolean;
  tokens: SaToken[];
  errors: string[];
}

export interface VerifyCtx {
  /** the English line: enables the markup check ({w:…} {n:…} {f:…} {player} {$slot} must also be in the English) */
  en?: string;
  /** an interface string (content/sa-ui-*.json): the UI symbols ▶ ◀ ◈ · × / % + ( ) are allowed */
  ui?: boolean;
  /** a label / button / heading, not a sentence: no final । ? ! needed */
  label?: boolean;
}

/** Symbols an interface string may contain besides Sanskrit and punctuation. */
const UI_SYMBOLS_RE = /[▶◀◈·×/%+()↑↓←→★☆✓✗…\u0970]/gu; // U+0970 (the Devanagari abbreviation sign) after a first-akṣara hint

export interface DialogueFile {
  version?: number;
  models?: SaModel[];
  entries: DialogueEntry[];
}

// ───────────────────────── Small SLP1 helpers (ported from tools/content/nominal/lib/slp.ts) ─────────────────────────

const VOWELS = 'aAiIuUfFxXeEoO';
/** May stand between the trigger and n without blocking ṇatva: aṭ (vowels, h y v r), ku, pu, anusvāra (8.4.2). */
const NATVA_TRANSPARENT = new Set([...VOWELS, ...'hyvr', ...'kKgGN', ...'pPbBm', 'M']);
const NATVA_TRIGGER = new Set(['r', 'f', 'F', 'z']);
/** n is retroflexed only before a vowel or n m y v (never word-finally; 8.4.37). */
const NATVA_FOLLOW = new Set([...VOWELS, ...'nmyv']);

function natvaApplies(w: string, i: number): boolean {
  const next = w.charAt(i + 1);
  if (next === '' || !NATVA_FOLLOW.has(next)) return false;
  for (let j = i - 1; j >= 0; j--) {
    const c = w.charAt(j);
    if (NATVA_TRIGGER.has(c)) return true;
    if (!NATVA_TRANSPARENT.has(c)) return false;
  }
  return false;
}

/** ṇatva on every dental n at index >= from (the inflectional part); the stem is left as spelled. */
function natvaFrom(w: string, from: number): string {
  let out = w;
  for (let i = Math.max(0, from); i < out.length; i++) {
    if (out.charAt(i) === 'n' && natvaApplies(out, i)) out = out.slice(0, i) + 'R' + out.slice(i + 1);
  }
  return out;
}

/** Does some dental n at index >= from stand in a ṇatva context (used to refuse unsure prefix joins)? */
function natvaContextFrom(w: string, from: number): boolean {
  for (let i = Math.max(0, from); i < w.length; i++) if (w.charAt(i) === 'n' && natvaApplies(w, i)) return true;
  return false;
}

const slp = (deva: string): string => devaToSlp1(deva);

// ───────────────────────── Labels ─────────────────────────

const CASES = ['nom.', 'acc.', 'ins.', 'dat.', 'abl.', 'gen.', 'loc.', 'voc.'] as const;
const NUMS = ['sg.', 'du.', 'pl.'] as const;
const PERS = ['3', '2', '1'] as const; // Sanskrit prathama = English 3rd person
const VNUM = ['sg', 'du', 'pl'] as const;
const LAKARA_LABEL: Record<Lakara, string> = { lat: 'laṭ', lan: 'laṅ', lrt: 'lṛṭ', lot: 'loṭ', vidhilin: 'vidhiliṅ' };
/** Teaching level of the tense itself (Sambhāṣaṇa core: laṭ, lṛṭ, loṭ first). */
const LAKARA_LEVEL: Record<Lakara, number> = { lat: 1, lrt: 1, lot: 1, lan: 2, vidhilin: 2 };
type Krt = 'kta' | 'ktavatu' | 'shatr' | 'shanac' | 'tavya' | 'aniyar' | 'ktva' | 'tumun' | 'lyap';
/** Teaching level of the kṛt suffix (ktavatu past and ktvā/tumun are Sambhāṣaṇa basics). Editorial. */
const KRT_LEVEL: Record<Krt, number> = { ktavatu: 1, ktva: 1, tumun: 1, kta: 2, lyap: 2, tavya: 3, aniyar: 3, shatr: 3, shanac: 4 };

function cellLabel(v: number, n: number, g: string): string {
  return `${CASES[v] ?? '?'} ${NUMS[n] ?? '?'} ${g}`;
}

// ───────────────────────── Declension by model ─────────────────────────

interface Cell {
  v: number; // 0..7
  n: number; // 0..2
  slp: string;
}

interface ModelShape {
  base: string; // SLP1 common prefix of stem and all forms
  stemRest: string; // stem minus base
  cells: { v: number; n: number; ending: string }[];
}

const shapeCache = new Map<string, ModelShape | null>();

/**
 * Splits a paradigm into base + endings (in SLP1) so that a new stem can be substituted.
 * Pronoun / numeral tables are refused unless `closedClass` (only for the explicit lists below:
 * direction adjectives on सर्व, numerals 11–19 on पञ्चन्).
 */
function modelShape(p: ShabdaParadigm, closedClass = false): ModelShape | null {
  const ck = `${p.id}${closedClass ? '+' : ''}`;
  const hit = shapeCache.get(ck);
  if (hit !== undefined) return hit;
  const stem = slp(p.stem);
  const raw: { v: number; n: number; f: string }[] = [];
  p.forms.forEach((row, v) => row.forEach((forms, n) => forms.forEach((f) => raw.push({ v, n, f: slp(f) }))));
  let base = stem;
  for (const r of raw) {
    let k = 0;
    while (k < base.length && k < r.f.length && base.charAt(k) === r.f.charAt(k)) k++;
    base = base.slice(0, k);
  }
  const shape: ModelShape | null =
    base.length === 0 || (!closedClass && (p.kind === 'pronoun' || p.kind === 'numeral'))
      ? null
      : { base, stemRest: stem.slice(base.length), cells: raw.map((r) => ({ v: r.v, n: r.n, ending: r.f.slice(base.length) })) };
  shapeCache.set(ck, shape);
  return shape;
}

/** Declension class of a paradigm: its endings with ṇ written n (paradigms of one class differ only in ṇatva). */
function classKey(p: ShabdaParadigm): string | null {
  const sh = modelShape(p);
  return sh ? `${p.gender}|${sh.stemRest}|${sh.cells.map((c) => `${c.v}${c.n}${c.ending.replace(/R/g, 'n')}`).join(',')}` : null;
}

/**
 * Declines `stem` (SLP1) like paradigm `p`.
 * - `natva: 'derive'`: endings are de-retroflexed and ṇatva is re-derived for the new stem (safe for any stem;
 *   used for kṛdantas and the automatic model, always on models without ṇatva in their endings).
 * - `natva: 'check'`: plain substitution, but refuse when the re-derived ṇatva would differ (model / vocab links).
 */
function declineLike(stem: string, p: ShabdaParadigm, natva: 'derive' | 'check', closedClass = false): { cells: Cell[] } | { error: string; natva?: true } {
  const shape = modelShape(p, closedClass);
  if (!shape) return { error: `paradigm ${p.id} cannot be used as a model (pronoun/numeral or no common stem)` };
  if (!stem.endsWith(shape.stemRest)) return { error: `stem does not end like the model stem ${p.stem} (needs …${slp1ToDeva(shape.stemRest) || '∅'})` };
  const base = stem.slice(0, stem.length - shape.stemRest.length);
  const cells: Cell[] = [];
  for (const c of shape.cells) {
    const plain = base + c.ending;
    const derived = natvaFrom(base + c.ending.replace(/R/g, 'n'), base.length);
    if (natva === 'check' && derived !== plain) {
      return { error: `ṇatva differs from the model ${p.id} (${slp1ToDeva(plain)} vs ${slp1ToDeva(derived)}): choose a paradigm with the same ṇatva behaviour`, natva: true };
    }
    cells.push({ v: c.v, n: c.n, slp: natva === 'derive' ? derived : plain });
  }
  return { cells };
}

/** Models without ṇatva in their endings (ṇatva is re-derived for each new stem). */
const AUTO_MODEL = { am: 'deva-m', an: 'vana-n', af: 'lata-f', If: 'nadi-f', im: 'muni-m', um: 'sadhu-m' } as const;
/** Pronominal (sarvādi) stems decline unlike देव/वन: never auto-declined. */
const SARVADI = new Set(
  ['सर्व', 'विश्व', 'उभ', 'उभय', 'अन्य', 'अन्यतर', 'इतर', 'कतर', 'कतम', 'त्वत्', 'नेम', 'सम', 'सिम', 'पूर्व', 'पर', 'अवर', 'दक्षिण', 'उत्तर', 'अपर', 'अधर', 'स्व', 'अन्तर', 'एक'].map(slp),
);
/** ī-stems that do not follow नदी (avī-tantrī-starī-lakṣmī; monosyllables are refused separately). */
/** Direction words that decline like सर्व (vocab gives them without a paradigm link). */
const DIRECTION_SARVADI = new Set(['पूर्व', 'दक्षिण', 'उत्तर'].map(slp));
const NOT_NADI = new Set(['अवी', 'तरी', 'तन्त्री', 'स्तरी', 'लक्ष्मी'].map(slp));

/** Irregular paradigms: valid only for their own word (already in SHABDA), never as a model for another stem. */
const NOT_A_MODEL = new Set(['pati-m', 'sakhi-m', 'pathin-m', 'ap-f', 'ahan-n', 'shvan-m', 'yuvan-m', 'stri-f', 'go-m', 'go-f', 'nau-f']);

const syllables = (s: string): number => [...s].filter((c) => VOWELS.includes(c)).length;

// ───────────────────────── Interjections (reviewed; reason per item) ─────────────────────────

/**
 * Only interjections not already in VOCAB (which has अहो, धिक्, आम्, नमः, स्वस्ति …).
 * हे  — MW "he, ind. a vocative particle"; the style guide prints it before vocatives (हे राम).
 * भोः — MW "bhos, ind. a vocative particle (in addressing persons)"; standard in Sambhāṣaṇa and drama.
 * हा  — MW "hā, ind. an exclamation expressing grief, dejection, pain"; frequent in the Rāmāyaṇa (हा सीते).
 * Not admitted: ओह् (not a Sanskrit headword in MW / Apte), अरे / रे (disrespectful register).
 */
const INTERJECTIONS: readonly { sa: string; en: string }[] = [
  { sa: 'हे', en: 'O! (vocative particle)' },
  { sa: 'भोः', en: 'O! sir! (vocative particle)' },
  { sa: 'हा', en: 'alas! (grief)' },
];

/** Phrase words in VOCAB that are sandhi-joined print forms and must not be accepted as tokens. */
const PHRASE_TOKEN_EXCLUDE = new Set(['नमो']);

// ───────────────────────── Index ─────────────────────────

export interface OracleOptions {
  models?: SaModel[];
  lexicon?: LexEntry[];
  names?: NameEntry[];
}

export interface Oracle {
  verifyLine(sa: string, ctx?: VerifyCtx): VerifyResult;
  analyse(word: string): SaAnalysis[];
  suggest(word: string, max?: number): string[];
  /** forms indexed per source (a form counted once per source) */
  stats(): { forms: number; bySource: Record<string, number>; buildMs: number };
  /** problems with `models` (invalid paradigm, gender, ṇatva, missing source) — the test fails on these */
  modelErrors: string[];
  /** English search over VOCAB, DHATU, PREFIXED, SHABDA, lexicon, names, models */
  find(gloss: string, max?: number): { sa: string; en: string; source: string; level: number; note: string }[];
}

interface BaseForm {
  slp: string;
  grammar: string;
  level: number;
  kind: 'finite' | Krt;
  lakara?: Lakara;
  pada?: Pada;
}

function lexEntries(): LexEntry[] {
  const out = new Map<string, LexEntry>();
  for (const list of [(lexicon1 as unknown as { lexicon: LexEntry[] }).lexicon, (lexicon2 as unknown as { lexicon: LexEntry[] }).lexicon]) {
    for (const e of list) {
      const prev = out.get(e.id);
      out.set(e.id, prev ? { ...prev, forms: [...prev.forms, ...e.forms] } : e);
    }
  }
  // v0.6: the forms lexicon-3/4/5 add (merged by id, content.ts mergeLexiconsV06)
  for (const e of loadContent().lexicon) {
    const prev = out.get(e.id);
    if (!prev) out.set(e.id, e);
    else {
      const extra = e.forms.filter((f) => f.kathaOnly);
      if (extra.length) out.set(e.id, { ...prev, forms: [...prev.forms, ...extra] });
    }
  }
  return [...out.values()];
}

/** `models` of all dialogue files and interface-string files (as bundled). */
export function bundledModels(): SaModel[] {
  return [...BUNDLED_FILES, ...(UI_FILES as unknown as DialogueFile[])].flatMap((f) => f.models ?? []);
}

/**
 * sa-dialogue-1 … 13 in file order (5 = the Sanskrit of story lines inside Kathā-only blocks up to v0.5a, OWNER:
 * kc-content; 6–9 = the Kathā lines v0.5b adds: 6 ch1–3 (WP-A), 7 ch4 + new moveText (WP-C), 8 ch5 (WP-B), 9 ch6 (WP-D);
 * 10–13 = the Kathā lines v0.6 adds: 10 A (ch1–2, story-common, cutscene-mithila), 11 B (ch3–4), 12 C (ch5–6,
 * cutscene-kumbhakarna, new moveText), 13 D (cutscene-herbs)).
 */
export const BUNDLED_FILES = [sa1, sa2, sa3, sa4, sa5, sa6, sa7, sa8, sa9, sa10, sa11, sa12, sa13] as unknown as DialogueFile[];

export function createOracle(opts: OracleOptions = {}): Oracle {
  const t0 = performance.now();
  const index = new Map<string, SaAnalysis[]>();
  const display = new Map<string, string>(); // key → a display spelling
  const perSource = new Map<string, Set<string>>();
  const modelErrors: string[] = [];

  const add = (deva: string, a: SaAnalysis): void => {
    const key = spellingKey(deva);
    if (!key) return;
    let list = index.get(key);
    if (!list) {
      list = [];
      index.set(key, list);
      display.set(key, deva);
    }
    if (!list.some((x) => x.source === a.source && x.lemma === a.lemma && x.grammar === a.grammar)) list.push(a);
    let set = perSource.get(a.source);
    if (!set) perSource.set(a.source, (set = new Set()));
    set.add(key);
  };
  const addSlp = (s: string, a: SaAnalysis): void => add(slp1ToDeva(s), a);

  /** Declines a stem on a paradigm id and adds every cell. */
  const addDeclined = (stemSlp: string, paradigmId: string, natva: 'derive' | 'check', mk: (v: number, n: number, g: string) => SaAnalysis, only?: (v: number, n: number) => boolean, closedClass = false): string | null => {
    const p = shabda(paradigmId);
    if (!p) return `unknown paradigm ${paradigmId}`;
    const r = declineLike(stemSlp, p, natva, closedClass);
    if ('error' in r) return r.error;
    for (const c of r.cells) if (!only || only(c.v, c.n)) addSlp(c.slp, mk(c.v, c.n, p.genderless ? '' : `${p.gender}.`));
    return null;
  };

  // 1. SHABDA: every cell.
  for (const p of SHABDA) {
    p.forms.forEach((row, v) =>
      row.forEach((forms, n) => {
        for (const f of forms) add(f, { lemma: p.citation, source: 'shabda', grammar: `${cellLabel(v, n, p.genderless ? '' : `${p.gender}.`)} (${p.id})`, en: p.en, level: p.level });
      }),
    );
  }

  // 2. VOCAB: citation forms, phrase words, paradigm declension.
  for (const e of VOCAB) {
    const words = e.pos === 'phrase' ? e.sa.split(/\s+/) : [e.sa];
    for (const w of words) {
      if (e.pos === 'phrase' && PHRASE_TOKEN_EXCLUDE.has(w)) continue;
      add(w, { lemma: e.sa, source: 'vocab', grammar: e.pos === 'phrase' ? `word of the phrase “${e.sa}”` : `${e.pos}${e.gender ? ` ${e.gender}.` : ''} (citation)`, en: e.en, level: e.level });
    }
    if ((e.pos === 'noun' || e.pos === 'adjective') && e.paradigm && e.stem) {
      const stemSlp = slp(e.stem);
      const err = addDeclined(stemSlp, e.paradigm, 'check', (v, n, g) => ({ lemma: e.sa, source: 'vocab-decl', grammar: `${cellLabel(v, n, g)} (like ${e.paradigm ?? ''})`, en: e.en, level: e.level }));
      if (err) modelErrors.push(`vocab ${e.id}: ${err}`); // never expected: the vocab pack tests its links
      // the neuter of a non-pronominal a-stem adjective is regular (like वन, ṇatva re-derived)
      if (e.pos === 'adjective' && stemSlp.endsWith('a') && shabda(e.paradigm)?.anta === 'अकारान्तः' && !SARVADI.has(stemSlp)) {
        addDeclined(stemSlp, AUTO_MODEL.an, 'derive', (v, n) => ({ lemma: e.sa, source: 'vocab-decl', grammar: `${cellLabel(v, n, 'n.')} (adjective, like वन)`, en: e.en, level: e.level }));
      }
    }
    // Direction adjectives without a paradigm link: पूर्व दक्षिण उत्तर are sarvanāma in the sense of direction (1.1.34)
    // and take the सर्व forms (पूर्वस्याम्, दक्षिणस्याः …; the optional regular forms of 7.1.16 / 1.1.34 are not added);
    // पश्चिम is an ordinary a-stem adjective (MW paścima mf(ā)n.).
    if (e.category === 'directions' && e.pos === 'adjective' && !e.paradigm && e.stem) {
      const st = slp(e.stem);
      const mk = (label: string) => (v: number, n: number, g: string): SaAnalysis => ({ lemma: e.sa, source: 'vocab-decl', grammar: `${cellLabel(v, n, g)} (${label})`, en: e.en, level: e.level });
      if (DIRECTION_SARVADI.has(st)) for (const pid of ['sarva-m', 'sarva-f', 'sarva-n']) addDeclined(st, pid, 'derive', mk('direction, like सर्व'), undefined, true);
      else if (st === slp('पश्चिम')) {
        addDeclined(st, AUTO_MODEL.am, 'derive', mk('like देव'));
        addDeclined(st, AUTO_MODEL.an, 'derive', mk('like वन'));
        addDeclined(`${st.slice(0, -1)}A`, AUTO_MODEL.af, 'derive', mk('like लता'));
      }
    }
  }

  // 3. DHATU: finite forms and kṛdantas (cached per root for the prefixed verbs).
  const rootForms = new Map<string, BaseForm[]>();
  const declineKrt = (out: BaseForm[], stem: string, krt: Krt, level: number, genders: [string, 'derive' | 'check'][]): void => {
    for (const [pid, natva] of genders) {
      const p = shabda(pid);
      if (!p) continue;
      const r = declineLike(stem, p, natva);
      if ('error' in r) continue;
      for (const c of r.cells) out.push({ slp: c.slp, grammar: `${krt} → ${cellLabel(c.v, c.n, `${p.gender}.`)}`, level, kind: krt });
    }
  };
  const formsOfRoot = (d: DhatuEntry): BaseForm[] => {
    const hit = rootForms.get(d.id);
    if (hit) return hit;
    const out: BaseForm[] = [];
    for (const lakara of LAKARAS) {
      for (const pada of ['P', 'A'] as const) {
        const table = d.forms[lakara]?.[pada];
        if (!table) continue;
        table.forEach((row, p) =>
          row.forEach((cell, n) => {
            for (const f of cell) out.push({ slp: slp(f), grammar: `${LAKARA_LABEL[lakara]} ${PERS[p] ?? '?'}${VNUM[n] ?? '?'} ${pada}`, level: Math.max(d.level, LAKARA_LEVEL[lakara]), kind: 'finite', lakara, pada });
          }),
        );
      }
    }
    const k = d.krdanta;
    const lv = (krt: Krt): number => Math.max(d.level, KRT_LEVEL[krt]);
    for (const f of k.ktva ?? []) out.push({ slp: slp(f), grammar: 'ktvā (indeclinable)', level: lv('ktva'), kind: 'ktva' });
    for (const f of k.tumun ?? []) out.push({ slp: slp(f), grammar: 'tumun (infinitive)', level: lv('tumun'), kind: 'tumun' });
    const aStem = (f: string): string | null => {
      const s = slp(f);
      return s.endsWith('aH') ? s.slice(0, -1) : null;
    };
    const A_GENDERS: [string, 'derive'][] = [
      [AUTO_MODEL.am, 'derive'],
      [AUTO_MODEL.an, 'derive'],
    ];
    for (const krt of ['kta', 'tavya', 'aniyar', 'shanac'] as const) {
      for (const f of k[krt] ?? []) {
        const stem = aStem(f);
        if (!stem) continue;
        declineKrt(out, stem, krt, lv(krt), A_GENDERS);
        declineKrt(out, `${stem.slice(0, -1)}A`, krt, lv(krt), [[AUTO_MODEL.af, 'derive']]); // feminine in -ā (like लता/रमा)
      }
    }
    for (const f of k.ktavatu ?? []) {
      const s = slp(f);
      if (!s.endsWith('vAn')) continue;
      const stem = `${s.slice(0, -2)}at`; // गतवान् → गतवत्
      declineKrt(out, stem, 'ktavatu', lv('ktavatu'), [
        ['bhagavat-m', 'derive'],
        ['shrimat-n', 'derive'],
      ]);
      declineKrt(out, `${stem}I`, 'ktavatu', lv('ktavatu'), [[AUTO_MODEL.If, 'derive']]); // गतवती (like नदी)
    }
    for (const f of k.shatr ?? []) {
      const s = slp(f);
      if (!s.endsWith('an')) continue; // ददत्-type (3rd gaṇa) nominatives are not declined on गच्छत्
      declineKrt(out, `${s.slice(0, -1)}t`, 'shatr', lv('shatr'), [['gacchat-m', 'derive']]);
    }
    rootForms.set(d.id, out);
    return out;
  };
  for (const d of DHATUS) {
    const flag = d.level >= 4 ? 'L4 root' : undefined;
    for (const b of formsOfRoot(d)) {
      const a: SaAnalysis = { lemma: d.dhatu, source: b.kind === 'finite' ? 'dhatu' : 'krdanta', grammar: b.grammar, en: d.en, level: b.level };
      if (flag) a.flag = flag;
      addSlp(b.slp, a);
    }
    for (const l of d.lyap ?? []) {
      const a: SaAnalysis = { lemma: `${l.upasarga}+${d.dhatu}`, source: 'krdanta', grammar: 'lyap (indeclinable)', en: l.en, level: Math.max(d.level, KRT_LEVEL.lyap) };
      if (flag) a.flag = flag;
      add(l.form, a);
    }
  }

  // 4. PREFIXED: lat3s; upasarga + base form where the join is sandhi-free (same first letter as the base laṭ 3sg).
  const byId = new Map(DHATUS.map((d) => [d.id, d]));
  for (const pv of PREFIXED) {
    const d = byId.get(pv.base);
    const lemma = `${pv.upasarga}+${d?.dhatu ?? pv.base}`;
    const flag = pv.level >= 4 || (d?.level ?? 0) >= 4 ? 'L4 root' : undefined;
    const mk = (grammar: string, level: number): SaAnalysis => {
      const a: SaAnalysis = { lemma, source: 'prefixed', grammar, en: pv.en, level };
      if (flag) a.flag = flag;
      return a;
    };
    add(pv.lat3s, mk('laṭ 3sg (PREFIXED)', pv.level));
    if (!d) continue;
    const L = slp(pv.lat3s);
    let X: string | null = null;
    let pada: Pada | null = null;
    for (const pd of ['P', 'A'] as const) {
      for (const B of d.forms.lat?.[pd]?.[0]?.[0] ?? []) {
        const b = slp(B);
        if (X === null && L.endsWith(b) && L.length > b.length) {
          X = L.slice(0, L.length - b.length);
          pada = pd;
        }
      }
    }
    if (X === null || pada === null) continue; // the join changed the root's first sound: only lat3s is known
    const first = L.charAt(X.length);
    const xTriggers = [...X].some((c) => NATVA_TRIGGER.has(c));
    for (const b of formsOfRoot(d)) {
      if (b.kind === 'ktva' || b.lakara === 'lan') continue; // ktvā → lyap; laṅ has the augment
      if (b.kind === 'finite' && b.pada !== pada) continue; // the prefixed verb keeps the pada of its lat3s
      if ((b.kind === 'shatr' && pada !== 'P') || (b.kind === 'shanac' && pada !== 'A')) continue;
      if (b.slp.charAt(0) !== first) continue;
      const joined = X + b.slp;
      if (xTriggers && natvaContextFrom(joined, X.length)) continue; // ṇatva across the upasarga (8.4.14 ff.) is not guessed
      addSlp(joined, mk(`${b.grammar} (upasarga ${pv.upasarga})`, Math.max(pv.level, b.level)));
    }
  }

  // 5. SENTENCES: every word is a verified form.
  for (const s of SENTENCES) {
    for (const w of s.words) add(w.sa, { lemma: w.lemma, source: 'sentences', grammar: w.tag, en: w.en, level: s.level });
  }

  // 6. Verse lexicon: stored forms; nouns/adjectives with a regular stem declined on the automatic model.
  const lex = opts.lexicon ?? lexEntries();
  const lexGender = new Map<string, 'm' | 'f' | 'n'>();
  for (const e of lex) {
    for (const f of e.forms) add(f.form, { lemma: e.lemma, source: 'lexicon', grammar: f.grammar, en: e.meaning, level: 3, flag: 'verse form' });
    if (e.gender && (e.pos === 'noun' || e.pos === 'name' || e.pos === 'compound')) lexGender.set(slp(e.lemma), e.gender);
  }

  /** Automatic model: regular -a m/n, -ā f, -ī f (+ person -i/-u m, -mat/-vat m) with ṇatva re-derived. */
  const autoDecline = (stemSlp: string, gender: 'm' | 'f' | 'n' | 'mn', mk: (v: number, n: number, g: string, model: string) => SaAnalysis): boolean => {
    if (SARVADI.has(stemSlp)) return false;
    const last = stemSlp.charAt(stemSlp.length - 1);
    const go = (pid: string, only?: (v: number, n: number) => boolean): boolean => addDeclined(stemSlp, pid, 'derive', (v, n, g) => mk(v, n, g, pid), only) === null;
    if (last === 'a' && gender === 'm') return go(AUTO_MODEL.am);
    if (last === 'a' && gender === 'n') return go(AUTO_MODEL.an);
    // gender unknown: only the cells -a masculines and neuters share (ins.–loc., acc. sg., voc. sg.)
    if (last === 'a' && gender === 'mn') return go(AUTO_MODEL.am, (v, n) => (v >= 2 && v <= 6) || (n === 0 && (v === 1 || v === 7)));
    if (last === 'A' && gender === 'f' && !stemSlp.endsWith('ambA')) return go(AUTO_MODEL.af);
    if (last === 'I' && gender === 'f' && syllables(stemSlp) > 1 && !NOT_NADI.has(stemSlp)) return go(AUTO_MODEL.If);
    return false;
  };

  for (const e of lex) {
    const s = slp(e.lemma);
    const mk = (v: number, n: number, g: string, model: string): SaAnalysis => ({ lemma: e.lemma, source: 'lexicon', grammar: `${cellLabel(v, n, g)} (auto, like ${model})`, en: e.meaning, level: 3, flag: 'verse word (auto-declined)' });
    const g = lexGender.get(s);
    if (g && (e.pos === 'noun' || e.pos === 'name' || e.pos === 'compound')) autoDecline(s, g, mk);
    else if (e.pos === 'adjective' && s.endsWith('a')) {
      autoDecline(s, 'm', mk);
      autoDecline(s, 'n', mk);
    }
  }

  // 7. names.json: automatic model (gender from the id class, the citation ending, or the lexicon).
  // v0.6: names-3/4/5/6 too (the merged content)
  const names = opts.names ?? loadContent().names;
  const genderlessStems = new Map<string, string>(); // SLP1 stem → name id (only the m/n-shared cells are known)
  for (const ne of names) {
    const cls = ne.id.split('.')[0] ?? '';
    const isBeing = cls === 'person' || cls === 'ally' || cls === 'enemy';
    let s = slp(ne.sa);
    let gender: 'm' | 'f' | 'n' | 'mn' | null = null;
    let model: 'auto' | 'mat' | 'vat' | 'i' | 'u' = 'auto';
    if (s.endsWith('aH')) [s, gender] = [s.slice(0, -1), 'm'];
    else if (s.endsWith('AH')) [s, gender] = [`${s.slice(0, -2)}a`, 'm']; // nom. pl. (श्लोकाः)
    else if (s.endsWith('Ani')) [s, gender] = [`${s.slice(0, -3)}a`, 'n']; // nom. pl. (पदानि)
    else if (s.endsWith('am')) [s, gender] = [s.slice(0, -1), 'n']; // nom. sg. n. (बालकाण्डम्)
    else if (isBeing && s.endsWith('mAn')) [s, model] = [`${s.slice(0, -2)}at`, 'mat']; // हनुमान् → हनुमत् (like धीमत्)
    else if (isBeing && s.endsWith('vAn')) [s, model] = [`${s.slice(0, -2)}at`, 'vat']; // जाम्बवान् → जाम्बवत् (like भगवत्)
    else if (s.endsWith('a')) gender = lexGender.get(s) ?? (isBeing ? 'm' : 'mn');
    else if (s.endsWith('A') || s.endsWith('I')) gender = 'f';
    else if (isBeing && s.endsWith('i') && s !== 'pati' && s !== 'saKi') model = 'i';
    else if (isBeing && s.endsWith('u')) model = 'u';
    const stemDeva = slp1ToDeva(s);
    const mk = (v: number, n: number, g: string, pid: string): SaAnalysis => ({ lemma: stemDeva, source: 'name', grammar: `${cellLabel(v, n, gender === 'mn' ? 'm./n.' : g)} (auto, like ${pid})`, en: ne.en, level: 1 });
    if (model === 'mat' || model === 'vat' || model === 'i' || model === 'u') {
      const pid = model === 'mat' ? 'dhimat-m' : model === 'vat' ? 'bhagavat-m' : model === 'i' ? AUTO_MODEL.im : AUTO_MODEL.um;
      addDeclined(s, pid, 'derive', (v, n, g) => mk(v, n, g, pid));
    } else if (gender) {
      autoDecline(s, gender, mk);
      if (gender === 'mn') genderlessStems.set(s, ne.id);
    }
  }

  // 8. models from the dialogue files.
  const models = opts.models ?? bundledModels();
  for (const m of models) {
    const where = `model ${m.stem || '(no stem)'}`;
    const p = shabda(m.paradigm);
    if (!m.stem || !validateDeva(m.stem).ok) {
      modelErrors.push(`${where}: stem must be well-formed Devanagari`);
      continue;
    }
    if (!p) {
      modelErrors.push(`${where}: unknown paradigm id "${m.paradigm}"`);
      continue;
    }
    if (p.kind === 'pronoun' || p.kind === 'numeral') {
      modelErrors.push(`${where}: paradigm ${m.paradigm} is a ${p.kind}; use a noun/adjective paradigm`);
      continue;
    }
    if (NOT_A_MODEL.has(p.id)) {
      modelErrors.push(`${where}: paradigm ${m.paradigm} is irregular and cannot serve as a model for another stem`);
      continue;
    }
    if (!p.genderless && p.gender !== m.gender) {
      modelErrors.push(`${where}: gender ${m.gender} does not match paradigm ${m.paradigm} (${p.gender})`);
      continue;
    }
    if (!m.source || !m.source.trim()) modelErrors.push(`${where}: missing dictionary "source" (MW/Apte headword)`);
    if (!m.en || !m.en.trim()) modelErrors.push(`${where}: missing "en"`);
    const stemSlp = slp(m.stem);
    const mkM = (note: string) => (v: number, n: number, g: string): SaAnalysis => ({ lemma: m.stem, source: 'model', grammar: `${cellLabel(v, n, g)} (model, like ${m.paradigm}${note})`, en: m.en, level: 3, flag: 'model (human review)' });
    const r = declineLike(stemSlp, p, 'check');
    if ('error' in r && r.natva) {
      // Same declension class, other ṇatva: the forms are re-derived (always correct); it is an error only when
      // SHABDA has a paradigm of the same class with the right ṇatva, which the file should then name.
      const key = classKey(p);
      const fits = SHABDA.filter((q) => q.id !== p.id && !NOT_A_MODEL.has(q.id) && (q.kind === 'noun' || q.kind === 'adjective') && classKey(q) === key && !('error' in declineLike(stemSlp, q, 'check'))).map((q) => q.id);
      if (fits.length) modelErrors.push(`${where}: ${r.error} — use ${fits.join(' or ')}`);
      addDeclined(stemSlp, m.paradigm, 'derive', mkM(', ṇatva re-derived'));
    } else if ('error' in r) modelErrors.push(`${where}: ${r.error}`);
    else addDeclined(stemSlp, m.paradigm, 'check', mkM(''));
  }

  // 9. numbers.
  for (let n = 1; n <= 100; n++) {
    for (const f of [cardinal(n), ...cardinalVariants(n)]) add(f, { lemma: cardinal(n), source: 'number', grammar: `cardinal ${n}`, en: String(n), level: n <= 10 ? 1 : 2 });
  }
  add(cardinal(1000), { lemma: cardinal(1000), source: 'number', grammar: 'cardinal 1000', en: '1000', level: 2 });
  // Declined cardinals: 11–19 like पञ्चन् (plural only); -म् (शतम्, सहस्रम्) n. like वन, -ति f. like मति, -शत् f. like सरित्
  // (ṇatva re-derived: सहस्राणि, सहस्रेण). 1–10 are full SHABDA tables already.
  for (const n of [...Array.from({ length: 90 }, (_v, i) => i + 11), 1000]) {
    for (const f of [cardinal(n), ...cardinalVariants(n)]) {
      const c = slp(f);
      const mk = (v: number, k: number, g: string): SaAnalysis => ({ lemma: f, source: 'number', grammar: `${cellLabel(v, k, g)} (cardinal ${n})`, en: String(n), level: n <= 20 ? 2 : 3 });
      if (n <= 19 && c.endsWith('a')) addDeclined(`${c}n`, 'panchan', 'derive', mk, undefined, true);
      else if (c.endsWith('am')) addDeclined(c.slice(0, -1), AUTO_MODEL.an, 'derive', mk);
      else if (c.endsWith('iH')) addDeclined(c.slice(0, -1), 'mati-f', 'derive', mk);
      else if (c.endsWith('Sat')) addDeclined(c, 'sarit-f', 'derive', mk);
    }
  }

  // 10. interjections.
  for (const i of INTERJECTIONS) add(i.sa, { lemma: i.sa, source: 'interjection', grammar: 'interjection (reviewed list)', en: i.en, level: 1 });

  // Suggestion structures.
  const keys = [...index.keys()].sort();
  const byFirst = new Map<string, string[]>();
  for (const k of keys) {
    const f = k.charAt(0);
    let arr = byFirst.get(f);
    if (!arr) byFirst.set(f, (arr = []));
    arr.push(k);
  }
  const buildMs = performance.now() - t0;

  const analyse = (word: string): SaAnalysis[] => index.get(spellingKey(word)) ?? [];

  const suggest = (word: string, max = 6): string[] => {
    const key = spellingKey(word);
    if (!key) return [];
    const scored = new Map<string, number>();
    const consider = (k: string, score: number): void => {
      const prev = scored.get(k);
      if (prev === undefined || score < prev) scored.set(k, score);
    };
    // (a) edit distance ≤ 2 among keys with the same first letter and similar length
    const bucket = byFirst.get(key.charAt(0)) ?? [];
    for (const k of bucket) {
      if (Math.abs(k.length - key.length) > 2) continue;
      const d = boundedLevenshtein(key, k, 2);
      if (d <= 2) consider(k, d + Math.abs(k.length - key.length) * 0.2);
    }
    // (b) by stem: keys sharing the longest prefix (≥ 2 letters) — e.g. रामेन → रामेण, रामेभ्यः …
    let lo = 0;
    let hi = keys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((keys[mid] ?? '') < key) lo = mid + 1;
      else hi = mid;
    }
    for (let plen = Math.min(key.length, 12); plen >= 2; plen--) {
      const prefix = key.slice(0, plen);
      const found: string[] = [];
      for (let i = lo; i < keys.length && found.length < 40; i++) {
        const k = keys[i] ?? '';
        if (!k.startsWith(prefix)) break;
        found.push(k);
      }
      for (let i = lo - 1; i >= 0 && found.length < 80; i--) {
        const k = keys[i] ?? '';
        if (!k.startsWith(prefix)) break;
        found.push(k);
      }
      if (found.length) {
        for (const k of found) consider(k, 2 + (key.length - plen) * 0.25 + Math.abs(k.length - key.length) * 0.1);
        break;
      }
    }
    // (c) two known words written together (missing space)
    for (let i = 2; i < key.length - 1; i++) {
      const a = key.slice(0, i);
      const b = key.slice(i);
      if (index.has(a) && index.has(b) && !/^[ा-्ँ-ः]/.test(b)) consider(`${display.get(a) ?? a} ${display.get(b) ?? b}`, 1.5);
    }
    scored.delete(key);
    return [...scored.entries()]
      .sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0]))
      .slice(0, max)
      .map(([k]) => display.get(k) ?? k);
  };

  /** Why an unknown word is unknown, when we can tell (a names.json stem of unknown gender). */
  const hint = (word: string): string | undefined => {
    const w = slp(word);
    for (const end of ['aH', 'AH', 'Ani', 'O', 'e', 'An', 'am', 'a']) {
      if (!w.endsWith(end)) continue;
      const stem = `${w.slice(0, w.length - end.length)}a`;
      const id = genderlessStems.get(stem);
      if (id) return `names.json ${id} (${slp1ToDeva(stem)}) has no known gender, so only its gender-neutral cases are accepted: add a models entry { "stem": "${slp1ToDeva(stem)}", "gender": "m" or "n", "paradigm": … }`;
    }
    return undefined;
  };

  const lexIds = new Set(lex.map((e) => e.id));
  const nameIds = new Set(names.map((n) => n.id));

  const verifyLine = (sa: string, ctx: VerifyCtx = {}): VerifyResult => verify(sa, ctx, { analyse, suggest, hint, lexIds, nameIds });

  const stats = (): { forms: number; bySource: Record<string, number>; buildMs: number } => {
    const bySource: Record<string, number> = {};
    for (const [s, set] of perSource) bySource[s] = set.size;
    return { forms: index.size, bySource, buildMs };
  };

  const find = (gloss: string, max = 25): { sa: string; en: string; source: string; level: number; note: string }[] => {
    const q = gloss.trim().toLowerCase();
    if (!q) return [];
    const re = new RegExp(`(^|[^a-z])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    const out: { sa: string; en: string; source: string; level: number; note: string; rank: number }[] = [];
    const push = (sa: string, en: string, source: string, level: number, note: string): void => {
      if (!re.test(en)) return;
      const exact = en.toLowerCase().split(/[,;]\s*/).some((p) => p.replace(/^(to|a|an|the) /, '') === q.replace(/^(to|a|an|the) /, ''));
      out.push({ sa, en, source, level, note, rank: (exact ? 0 : 10) + level });
    };
    for (const e of VOCAB) push(e.sa, e.en, `vocab ${e.pos}`, e.level, e.paradigm ? `declines like ${e.paradigm}` : e.gender ? `${e.gender}. (citation form only)` : '');
    for (const d of DHATUS) {
      const lat = d.forms.lat?.P?.[0]?.[0]?.[0] ?? d.forms.lat?.A?.[0]?.[0]?.[0] ?? d.dhatu;
      const k = d.krdanta;
      push(lat, d.en, `dhatu ${d.dhatu} (${d.id})`, d.level, [k.ktavatu?.[0], k.ktva?.[0], k.tumun?.[0]].filter(Boolean).join(' · ') + (d.level >= 4 ? ' [L4 root]' : ''));
    }
    for (const p of PREFIXED) push(p.lat3s, p.en, `prefixed ${p.upasarga}+${p.base}`, p.level, '');
    for (const p of SHABDA) if (p.kind === 'noun' || p.kind === 'adjective') push(p.citation, p.en, `shabda ${p.id}`, p.level, '');
    for (const e of lex) push(e.lemma, e.meaning, `lexicon ${e.id}`, 3, e.forms.map((f) => f.form).join(' · '));
    for (const n of names) push(n.sa, n.en, `name ${n.id}`, 1, '');
    for (const m of models) push(m.stem, m.en, `model ${m.paradigm}`, 3, '');
    return out
      .sort((a, b) => a.rank - b.rank)
      .slice(0, max)
      .map(({ rank: _r, ...rest }) => rest);
  };

  return { verifyLine, analyse, suggest, stats, modelErrors, find };
}

function boundedLevenshtein(a: string, b: string, bound: number): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > bound) return bound + 1;
  let prev = new Array<number>(n + 1);
  let cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const v = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > bound) return bound + 1;
    [prev, cur] = [cur, prev];
  }
  return prev[n] ?? bound + 1;
}

// ───────────────────────── Line verification ─────────────────────────

/** Separators between words (besides whitespace). */
const PUNCT = '।॥,?!;:—–…"\'()‘’“”';
const PUNCT_RE = /[\s।॥,?!;:—–…"'()‘’“”]+/u;
const LATIN = /[A-Za-z]/;
const IAST_MARKS = /[āīūṛṝḷḹṅñṭḍṇśṣḥṃṁĀĪŪṚṜḶḸṄÑṬḌṆŚṢḤṂṀ̀-ͯ]/;
const MARKUP_RE = /\{(player|\$[A-Za-z0-9_]+|w:[^{}]*|n:[^{}]*|f:[^{}]*|b:[^{}]*)\}/g;
const DEVA_DIGITS = /^[\u0966-\u096F]+$/;
const ANUSVARA = 'ं';

interface VerifyDeps {
  analyse: (w: string) => SaAnalysis[];
  suggest: (w: string, max?: number) => string[];
  hint: (w: string) => string | undefined;
  lexIds: Set<string>;
  nameIds: Set<string>;
}

/** Markup tokens (other than {b:…}) of a string, e.g. ['{player}', '{w:dharma}']. */
export function markupTokens(s: string): string[] {
  return [...s.matchAll(MARKUP_RE)].map((m) => m[0]).filter((t) => !t.startsWith('{b:'));
}

/** Index of the k-th occurrence (0-based) of `w` as a whole word in `s`, or -1. */
function nthIndex(s: string, w: string, k: number): number {
  let from = 0;
  let seen = 0;
  for (;;) {
    const i = s.indexOf(w, from);
    if (i < 0) return -1;
    const before = s.charAt(i - 1);
    const after = s.charAt(i + w.length);
    const isBoundary = (c: string): boolean => c === '' || /[\s।॥,?!;:—–…"'()‘’“”\u0000]/u.test(c);
    if (isBoundary(before) && isBoundary(after)) {
      if (seen === k) return i;
      seen++;
    }
    from = i + 1;
  }
}

const GENDER_RE = /\{g:([^{}|]*)\|([^{}]*)\}/g;

/**
 * `{g:masc|fem}` picks the word for the player's gender (avatar a = शिष्य, b = शिष्या). Both variants of the
 * line must verify on their own.
 */
function verify(sa: string, ctx: VerifyCtx, deps: VerifyDeps): VerifyResult {
  if (sa.includes('{g:')) {
    const errs: string[] = [];
    for (const m of sa.matchAll(GENDER_RE)) {
      const [whole, a = '', b = ''] = m;
      if (!a.trim() || !b.trim()) errs.push(`${whole}: both the masculine and the feminine form are required`);
      if (a.trim() === b.trim()) errs.push(`${whole}: masculine and feminine forms are identical; write the word plainly`);
    }
    if (/\{g:/.test(sa.replace(GENDER_RE, ''))) errs.push('malformed {g:masc|fem} markup');
    const masc = verifyPlain(sa.replace(GENDER_RE, (_w, a: string) => a), ctx, deps);
    const fem = verifyPlain(sa.replace(GENDER_RE, (_w, _a: string, b: string) => b), ctx, deps);
    return {
      ok: errs.length === 0 && masc.ok && fem.ok,
      tokens: [...masc.tokens, ...fem.tokens.filter((t) => !masc.tokens.some((u) => u.text === t.text))],
      errors: [...errs, ...masc.errors.map((e) => `(masc) ${e}`), ...fem.errors.map((e) => `(fem) ${e}`)],
    };
  }
  return verifyPlain(sa, ctx, deps);
}

function verifyPlain(sa: string, ctx: VerifyCtx, deps: VerifyDeps): VerifyResult {
  const errors: string[] = [];
  const tokens: SaToken[] = [];
  const line = sa.trim();
  if (!line) return { ok: false, tokens, errors: ['empty line'] };
  if (line !== line.normalize('NFC')) errors.push('text is not in Unicode NFC');

  // Markup: check ids and English presence, then replace by spaces ({b:…} keeps its content).
  for (const m of line.matchAll(MARKUP_RE)) {
    const t = m[0];
    const body = m[1] ?? '';
    if (body.startsWith('w:') && !deps.lexIds.has(body.slice(2))) errors.push(`${t}: unknown lexicon id`);
    if (body.startsWith('n:')) {
      if (!deps.nameIds.has(body.slice(2))) errors.push(`${t}: unknown name id`);
      if (!ctx.label) errors.push(`${t}: do not use {n:…} in a Sanskrit sentence (it renders the bare stem); write the inflected name`);
    }
    if (body.startsWith('b:') && !/[\u0900-\u097F]/.test(body)) errors.push(`${t}: {b:…} must contain Sanskrit`);
    if (ctx.en !== undefined && !t.startsWith('{b:') && !ctx.en.includes(t)) errors.push(`${t}: markup not present in the English line`);
  }
  let stripped = line.replace(MARKUP_RE, (_m, body: string) => (body.startsWith('b:') ? ` ${body.slice(2)} ` : ' '));
  // the same text with a placeholder where a rendered word stands ({player} {w:…} {n:…} {f:…}): for the ं rule
  const withSlots = line.replace(MARKUP_RE, (_m, body: string) => (body.startsWith('b:') ? ` ${body.slice(2)} ` : ' \u0000 '));
  if (/[{}]/.test(stripped)) errors.push('unknown or malformed {…} markup');

  if (ctx.ui) stripped = stripped.replace(UI_SYMBOLS_RE, ' ');
  const latin = stripped.match(/[A-Za-z]+/g);
  if (latin) errors.push(`Latin letters outside markup: ${[...new Set(latin)].join(', ')}`);
  if (IAST_MARKS.test(stripped)) errors.push('IAST / romanisation diacritics outside markup');
  if (/[0-9]/.test(stripped)) errors.push('ASCII digits: write numbers as words');
  if (stripped.includes('.')) errors.push('Latin full stop "." : end sentences with ।');
  if (stripped.includes('॥')) errors.push('॥ is not used in dialogue: end sentences with ।');
  if (/[-‐‑]/.test(stripped)) errors.push('hyphen: no hyphenated compounds, write separate words');
  const body = stripped.replace(/[{}A-Za-z0-9.]/g, ' ').replace(/\s+/g, ' ').trim();
  if (body) {
    const v = validateDeva(body, { allowPunctuation: PUNCT });
    if (!v.ok) errors.push(...v.errors.map((e) => `validateDeva: ${e}`));
  }
  if (!ctx.label && !/[।?!]["'”’)]*$/u.test(line.replace(ctx.ui ? UI_SYMBOLS_RE : /$^/u, '').replace(/\{[^{}]*\}$/u, '').trim())) errors.push('must end with ।, ? or !');

  // Tokens.
  const words = stripped.split(PUNCT_RE).filter((w) => w.length > 0);
  words.forEach((w, i) => {
    if (LATIN.test(w) || /[0-9.{}]/.test(w) || /[-‐‑]/.test(w)) {
      tokens.push({ text: w, analyses: [] });
      return;
    }
    if (DEVA_DIGITS.test(w)) {
      tokens.push({ text: w, analyses: [{ lemma: w, source: 'number', grammar: 'Devanagari digits', en: w, level: 1 }] });
      return;
    }
    if (w.endsWith(ANUSVARA)) {
      // the only allowed print sandhi: word-final म् as ं before a following consonant (not before a vowel, not at a
      // pause); before a markup word ({w:…}, {player}) the next sound is unknown, so it is not judged
      const occ = nthIndex(withSlots, w, words.slice(0, i).filter((x) => x === w).length);
      const after = occ < 0 ? '' : withSlots.slice(occ + w.length).replace(/^\s+/, '');
      if (!after.startsWith('\u0000') && (after === '' || /^[।॥,?!;:—–…"'()‘’“”]/u.test(after) || /^[\u0905-\u0914]/.test(after))) errors.push(`"${w}": word-final ं only before a consonant; write म्`);
    }
    const analyses = deps.analyse(w);
    if (analyses.length) tokens.push({ text: w, analyses });
    else {
      const suggestions = deps.suggest(w);
      tokens.push({ text: w, analyses, suggestions });
      const h = deps.hint(w);
      errors.push(`unknown word "${w}"${suggestions.length ? ` (did you mean: ${suggestions.join(', ')})` : ''}${h ? ` — ${h}` : ''}`);
    }
  });
  // an interface label may be only slots and symbols ("{$n} / {$t}", or a slot + the abbreviation sign)
  if (tokens.length === 0 && !(ctx.ui && ctx.label)) errors.push('no Sanskrit words');
  return { ok: errors.length === 0, tokens, errors };
}

// ───────────────────────── Default oracle (lazy) ─────────────────────────

let defaultOracle: Oracle | null = null;

/** The oracle over the bundled packs, lexicon, names and the `models` of all three dialogue files. */
export function getOracle(): Oracle {
  if (!defaultOracle) defaultOracle = createOracle();
  return defaultOracle;
}

export function verifyLine(sa: string, ctx: VerifyCtx = {}): VerifyResult {
  return getOracle().verifyLine(sa, ctx);
}
export function analyse(word: string): SaAnalysis[] {
  return getOracle().analyse(word);
}
export function suggest(word: string, max?: number): string[] {
  return getOracle().suggest(word, max);
}

// ───────────────────────── Story strings (coverage) ─────────────────────────

export type DialogueFileNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
/**
 * The dialogue file of NEW Kathā text, by story file. v0.5b: 6 common / ch1–3 (WP-A), 7 ch4 (WP-C), 8 ch5 (WP-B), 9 ch6
 * (WP-D) — frozen since v0.5.1 (FILES69_V051). v0.6: 10 common / ch1–2 (WP-A), 11 ch3–4 (WP-B), 12 ch5–6 (WP-C), 13 (WP-D's
 * cutscene).
 */
export type KathaFileNo = 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
/** v0.6: the dialogue file of each package's new Kathā text (stories and told cutscenes). */
export const V06_FILE: Readonly<Record<'a' | 'b' | 'c' | 'd', 10 | 11 | 12 | 13>> = { a: 10, b: 11, c: 12, d: 13 };

/** A short stable key of an English string (hashString, base 36): the frozen v0.5a sets below are written with it. */
export function enKey(en: string): string {
  return hashString(en).toString(36);
}

/**
 * v0.5b: the strings sa-dialogue-5.json held at v0.5a (enKey of each `en`). Kathā text among them stays in file 5; every
 * other Kathā string goes to the package file of its chapter (6–9), so the four packages never edit the same file.
 * File 5 may only lose entries (a line a package rewrites becomes stale there).
 */
export const FILE5_V05A: ReadonlySet<string> = new Set([
  '1g3a7t4', 'qlxkmc', '15ny4e6', '1fgqzim', '6qvrpo', '9skonk', '1ozfiyx', '15sbpge', '40spau', '17ukp7t', '27r8xv',
  '3gl80u', 'epui5u', '1dquje2', 'kxgbd4', '1j8zno9', '10lub8l', '1xrih61', '1gq4q9u', '1kbgni1', '1plzzl7',
  '1s2js3m', '4oxkaw', 'iy0aix', 'modtxd', '1ta7pkz', 'pt6do3', '1q38gos', '1b9118r', 'h352ue', 'rh9sbn', 'mz2dd5',
  'udp5l0', 'lf12sl', '19kr180', '12lrgd4', '1sauuaf', '1xk38er', '6cm63u', 'gkpq57', '12j64eb', '14ctxcn',
  '1czfvv1', 'nilos4', 'ns2hut', '1t95cjq', 'd3q280', '6h4bzr', '1e3mw7x', '1v9od9p', '11irep0', '1tvin6y', 'oewpvb',
  'kh9xu5', '17f1gx3', '1fh2m6f', 'ztrire', 'iri9hp', '1w25s9b', '1sm7r6p', '4gh3gv', 'kvz2qr', '1wvzjct', 'bafqhj',
  '15autws', 'lxa9yz', '13tya22', 'llmlxb', 'l8mmg6', '7d7yoq', '1bx1s25', '1hr16rj', '1kpznjb', '1njophb', '2x8b68',
  'yhv6hl', '17o3anj', 'f4fflo', '84tl0q', 'oumbic', 'jaakro', 'lhayz7', 'z0zg8y', 'f9s23p', '131lw66', '1cyx0oa',
  'ywoszq', 'wusxw0', 'h8nho9', '1upzob5',
]);

/**
 * v0.6: the strings sa-dialogue-6 … 9 held at v0.5.1 (enKey → file). Files 6–9 are frozen like file 5: a Kathā string
 * among them stays in its file; every other new Kathā string goes to the v0.6 file of its package (10–13). They may only
 * lose entries (a line a package rewrites becomes stale there).
 */
export const FILES69_V051: ReadonlyMap<string, 6 | 7 | 8 | 9> = new Map<string, 6 | 7 | 8 | 9>([
  ['1acb0ne', 6], ['1b7zci9', 6], ['ij0q7z', 6], ['scqrp6', 6], ['do2p4y', 6], ['1ccmz80', 6], ['17j3e3e', 6], ['ea0vw5', 6], ['1y0doly', 6], ['165g20e', 6], ['dekebf', 6], ['ahaxyb', 6], ['5eerul', 6], ['114kirk', 6],
  ['1ou0v7y', 7], ['ads4ui', 7], ['12tsqzi', 7], ['15gf7uw', 7], ['zsr94x', 7], ['n3q91q', 7],
  ['nvdu2n', 8], ['1isuxyh', 8], ['9staos', 8], ['5q778s', 8], ['r2b9dk', 8], ['hyuakl', 8], ['8czzz', 8], ['8tk3v3', 8], ['c1w0m0', 8], ['14jfq6z', 8], ['1it6ggn', 8], ['1dk3sst', 8], ['10mqto4', 8], ['6i45xs', 8], ['8pwhz1', 8], ['1rglg6r', 8], ['fosu43', 8], ['1eiavvu', 8], ['pwtyu6', 8], ['vktfyt', 8], ['8rhy9t', 8], ['7lw4mb', 8], ['13vzb38', 8], ['ydujvz', 8], ['1meaw5b', 8], ['nrqklp', 8], ['hp391', 8], ['16d6klz', 8], ['11nd3j7', 8], ['mnze2q', 8],
  ['1l5v464', 9], ['xme8l6', 9], ['6ajvb1', 9], ['6xevtw', 9], ['1e6ozi8', 9], ['174sl6s', 9], ['jjj8yy', 9], ['1dm71ep', 9], ['1p5vmf2', 9], ['hsz3re', 9], ['czy75n', 9], ['iilmma', 9], ['1e9esv1', 9], ['phvmtb', 9], ['kywgrr', 9], ['hqskva', 9], ['lqgq4s', 9], ['1y04e7i', 9], ['8t5v29', 9], ['zzcdm9', 9], ['2z3lw8', 9], ['19a8k6o', 9], ['96je2w', 9], ['12subig', 9], ['18dfkc6', 9], ['1u49myf', 9], ['cga97l', 9], ['17nc8sp', 9], ['1k6vky7', 9],
]);

/**
 * v0.5b: the speaker titles ("label": true) sa-dialogue-4.json held at v0.5a (enKey). A title that is not among them and
 * is used only inside Kathā blocks goes to the Kathā file of its chapter (6–9, as a label), not to file 4.
 */
export const LABELS4_V05A: ReadonlySet<string> = new Set([
  't8dq7p', '9mnfpq', '2y4btw', '536fcd', '1pa52oz', '13crbi5', 'tslf41', 'rrtj83', '1ubuk3w', '780c00', '9un6s4',
  '1x5u46m', 'c5ed1y', 'wagnwy', 'mkaky5', '17cih99', '1m575se', 'v962ib', '1gohyfl', '19aztcb', '433a1t', 'zn7snp',
  '19ff0e3', '18mb9mv', '6ojxhg', '1hw9aou', 'zhpawn', 'qjdk1o', '1hknv30', 'oacq6f', '7nv6ka', '1fe7vry', 'rjiaj4',
  '1cbdf8n', '119jcwn', 'qi9sts', '112gfd0', '27hzd2', '49rqcw', '7tyios', '6urj4l', '1p1w7di', '11v4oia', 'nm3uvc',
  '1j31v2s', 'f0qa95', 'j1zvfh', 'po9x5r', '73hik2', '19l8e2b', '1yd7lpb', '1jfcnko', '1drvcnh', '29rmfb', 'da5bdb',
  '18vfo6v', '1nf6zl0', '1snxuk7', '1mk7277',
]);

/**
 * A Kathā-only block: `{ "if": "style.katha", "then": [...] }` (also `style.katha&…`). Its `then` lines are seen only in
 * the Kathā journey (notes/katha.md), so their Sanskrit lives in sa-dialogue-5.json (OWNER: kc-content).
 */
export function isKathaCond(cond: unknown): boolean {
  return typeof cond === 'string' && cond.split('&').map((c) => c.trim()).includes('style.katha');
}

/**
 * A practice-only block (v0.4.1): `{ "if": "!style.katha", "then": [...] }` wraps a line that describes the practice
 * game's mechanics (questions on every move, swift answers, wild foes in the grass…); its Kathā wording follows in a
 * Kathā-only block. The `then` lines are the practice game's text and keep their files (1–3); an `else` would be
 * Kathā text (file 5).
 */
export function isPracticeCond(cond: unknown): boolean {
  return typeof cond === 'string' && cond.split('&').map((c) => c.trim()).includes('!style.katha');
}

export interface StoryString {
  en: string;
  /**
   * which dialogue file owns it: 1 common/ch1/ch2 · 2 ch3/ch4 · 3 ch5/ch6 + enemy lines · 4 content strings (titles,
   * descriptions…) · 5 story lines inside Kathā-only blocks up to v0.5a (any chapter) · 6–9 Kathā lines new in v0.5b
   * (6 common/ch1–3, 7 ch4 and new moveText, 8 ch5, 9 ch6), incl. new Kathā-only speaker titles (labels)
   */
  file: DialogueFileNo;
  ctx: string;
  /** a label (NPC speaker title), not a sentence: its entry may carry `"label": true` (no final ।, `{n:…}` allowed) */
  label?: boolean;
}

type Cmd = Record<string, unknown>;
export interface StoryLike {
  chapters?: { kanda: number; summary?: string }[];
  maps?: { id: string; signs?: { text: string }[] }[];
  events?: { id: string; cmds?: Cmd[] }[];
}
export interface DefsLike {
  moves?: { id: string; description?: string; origin?: string }[];
  allies?: { id: string; description?: string }[];
  enemies?: { id: string; description?: string; intro?: string; defeatLine?: string }[];
  items?: { id: string; description?: string }[];
}

/** `origin` values of defs.json moves that are internal tags, never shown to the player. */
export const MOVE_ORIGIN_TAGS: ReadonlySet<string> = new Set(['start', 'enemy', 'duelist']);

/** A `who` that is not shown as English: the player, or a names.json id (rendered from names.json). */
function isNameWho(who: string, nameIds: ReadonlySet<string>): boolean {
  return who === 'player' || who === '{player}' || nameIds.has(who);
}

/**
 * Every English story string that needs a Sanskrit version, in story order, first occurrence only.
 * Files 1–3 (story lines): say, choice prompt and option labels, objective, battle intro (walking if/then/else, quiz
 * onCorrect/onWrong, battle onWin/onLose), map sign text, and enemy intro/defeatLine in defs.json.
 * File 4 (content strings, read by the views with useUi().c(en) or <StoryLine>): the logic's own story lines
 * (DEFEAT_TEXT, REST_TEXT, DEFAULT_OBJECTIVE, the next-book objectives), NPC speaker titles (`who` that is free
 * English, as labels), chapter summaries, and the defs.json descriptions (moves, allies, enemies, items) and move
 * origins (except the internal tags in MOVE_ORIGIN_TAGS).
 * Kathā text (files 5–9): every story line inside the `then` of a Kathā-only block (`{ "if": "style.katha", … }`, see
 * isKathaCond) or the `else` of a practice-only block (`{ "if": "!style.katha", … }`, see isPracticeCond), in any chapter
 * (the practice-only `then` keeps its file 1–3), and the Kathā wording of move descriptions (`katha.json → moveText`,
 * v0.4.1, after every other string). v0.5b rule: a string sa-dialogue-5.json held at v0.5a (FILE5_V05A) stays in file 5;
 * any other goes to the package file of its story file — 6 for story-common / ch1–3, 7 for ch4, 8 for ch5, 9 for ch6, and
 * 7 for a new moveText. Speaker titles go to file 4, except a NEW title (not in LABELS4_V05A) first used inside a Kathā
 * block: it goes, as a label, to that chapter's Kathā file (6–9).
 * `input` replaces the bundled files (tests); every field defaults to the bundled content.
 */
export function collectStoryStrings(input: StoryInput = {}): StoryString[] {
  // v0.6: new Kathā text of story-common / ch1–2 → 10 (WP-A), ch3–4 → 11 (WP-B), ch5–6 → 12 (WP-C)
  const files: [StoryLike, 1 | 2 | 3, KathaFileNo][] = input.stories ?? [
    [storyCommon as unknown as StoryLike, 1, 10],
    [storyCh1 as unknown as StoryLike, 1, 10],
    [storyCh2 as unknown as StoryLike, 1, 10],
    [storyCh3 as unknown as StoryLike, 2, 11],
    [storyCh4 as unknown as StoryLike, 2, 11],
    [storyCh5 as unknown as StoryLike, 3, 12],
    [storyCh6 as unknown as StoryLike, 3, 12],
  ];
  const file5 = input.file5 ?? FILE5_V05A;
  const files69 = input.files69 ?? FILES69_V051;
  const labels4 = input.labels4 ?? LABELS4_V05A;
  /** the file of a Kathā string: 5 when file 5 held it at v0.5a, 6–9 when that file held it at v0.5.1, else `fresh` */
  const kathaFile = (en: unknown, fresh: KathaFileNo): DialogueFileNo => {
    if (typeof en !== 'string') return fresh;
    const k = enKey(en);
    return file5.has(k) ? 5 : (files69.get(k) ?? fresh);
  };
  const out: StoryString[] = [];
  const seen = new Set<string>();
  const push = (en: unknown, file: DialogueFileNo, ctx: string, label?: boolean): void => {
    if (typeof en !== 'string' || !en.trim() || seen.has(en)) return;
    seen.add(en);
    out.push(label ? { en, file, ctx, label } : { en, file, ctx });
  };
  /** `katha`: inside a Kathā branch — its strings go to 5 (held at v0.5a), 6–9 (held at v0.5.1) or to `kfile` (new) */
  const walk = (cmds: unknown, file: 1 | 2 | 3, kfile: KathaFileNo, katha: boolean, ev: string): void => {
    if (!Array.isArray(cmds)) return;
    for (const c of cmds as Cmd[]) {
      if (!c || typeof c !== 'object') continue;
      const k5 = katha ? ' (Kathā)' : '';
      const at = (en: unknown): DialogueFileNo => (katha ? kathaFile(en, kfile) : file);
      if ('say' in c) push(c.say, at(c.say), `${ev} · ${typeof c.who === 'string' ? c.who : 'narration'}${k5}`);
      if ('choice' in c) {
        push(c.choice, at(c.choice), `${ev} · choice prompt${k5}`);
        if (Array.isArray(c.options)) for (const o of c.options as { label?: unknown }[]) push(o?.label, at(o?.label), `${ev} · choice option${katha ? " (player's reply, Kathā)" : ''}`);
      }
      if ('objective' in c) push(c.objective, at(c.objective), `${ev} · objective${k5}`);
      if ('battle' in c && c.battle && typeof c.battle === 'object') push((c.battle as { intro?: unknown }).intro, at((c.battle as { intro?: unknown }).intro), `${ev} · battle intro${k5}`);
      // v0.6: a hotspot's `then` (Kathā only, so `katha` holds already)
      for (const k of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose']) {
        if (!(k in c)) continue;
        // Kathā text: the `then` of a Kathā-only block and the `else` of a practice-only block. The practice game's text
        // (`else` of a Kathā block, `then` of a practice block) keeps its file.
        const kathaBranch = 'if' in c && ((k === 'then' && isKathaCond(c.if)) || (k === 'else' && isPracticeCond(c.if)));
        walk(c[k], file, kfile, katha || kathaBranch, ev);
      }
    }
  };
  for (const [s, file, kfile] of files) {
    for (const e of s.events ?? []) walk(e.cmds, file, kfile, false, e.id);
    for (const m of s.maps ?? []) for (const sg of m.signs ?? []) push(sg.text, file, `${m.id} · sign`);
  }
  // v0.6: told cutscenes (Kathā only): title, narration, questions and their options → the package's file (10–13)
  const cutscenes: [ToldLike, KathaFileNo][] = input.cutscenes ?? bundledParts().cutscenes.map((c, i) => [c as unknown as ToldLike, V06_FILE[CUTSCENE_FILES[i]?.pkg ?? 'a']]);
  const walkTold = (steps: unknown, kfile: KathaFileNo, id: string): void => {
    if (!Array.isArray(steps)) return;
    for (const st of steps as Cmd[]) {
      if (!st || typeof st !== 'object') continue;
      if ('say' in st) push(st.say, kathaFile(st.say, kfile), `cutscene ${id} · ${typeof st.who === 'string' ? st.who : 'narration'} (Kathā)`);
      if ('ask' in st) {
        push(st.ask, kathaFile(st.ask, kfile), `cutscene ${id} · question (Kathā)`);
        for (const o of (Array.isArray(st.options) ? st.options : []) as { label?: unknown; then?: unknown }[]) {
          push(o?.label, kathaFile(o?.label, kfile), `cutscene ${id} · option (player's reply, Kathā)`);
          walkTold(o?.then, kfile, id);
        }
      }
      if ('hotspot' in st) walkTold(st.then, kfile, id);
    }
  };
  for (const [c, kfile] of cutscenes) {
    if (c.stub) continue;
    push(c.title, kathaFile(c.title, kfile), `cutscene ${c.id} · title (label, Kathā)`, true);
    walkTold(c.steps, kfile, c.id);
  }
  const defs = input.defs ?? (defsJson as unknown as DefsLike);
  for (const e of defs.enemies ?? []) {
    push(e.intro, 3, `${e.id} · intro`);
    push(e.defeatLine, 3, `${e.id} · defeatLine`);
  }

  // ── file 4: content strings ──
  // story lines made by the logic (shown through <StoryLine>: say panel / quest log)
  push(DEFAULT_OBJECTIVE, 4, 'logic-state DEFAULT_OBJECTIVE · objective (quest-log line at a new game)');
  push(DEFEAT_TEXT, 4, 'logic-events DEFEAT_TEXT · narration (the party lost and wakes at the respawn point)');
  push(REST_TEXT, 4, 'logic-events REST_TEXT · narration (shrine: rest)');
  for (const n of [1, 2, 3, 4, 5, 6] as const) push(nextBookObjective(n), 4, `logic-events nextBookObjective(${n}) · objective (after Book ${n} ends)`);
  // NPC speaker titles: a `who` in free English (names.json ids are drawn from names.json)
  const nameIds = new Set(input.nameIds ?? loadContent().names.map((n) => n.id));
  // v0.5b: a new title (not in file 4 at v0.5a) first used inside a Kathā block goes to that chapter's Kathā file
  // (v0.6: one file 6–9 held at v0.5.1 stays there; else the package's v0.6 file)
  const walkWho = (cmds: unknown, kfile: KathaFileNo, katha: boolean, ev: string): void => {
    if (!Array.isArray(cmds)) return;
    for (const c of cmds as Cmd[]) {
      if (!c || typeof c !== 'object') continue;
      if (typeof c.who === 'string' && !isNameWho(c.who, nameIds)) push(c.who, katha && !labels4.has(enKey(c.who)) ? kathaFile(c.who, kfile) : 4, `${ev} · speaker title (label)${katha ? ' (Kathā)' : ''}`, true);
      for (const k of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose']) {
        if (!(k in c)) continue;
        const kathaBranch = 'if' in c && ((k === 'then' && isKathaCond(c.if)) || (k === 'else' && isPracticeCond(c.if)));
        walkWho(c[k], kfile, katha || kathaBranch, ev);
      }
    }
  };
  for (const [s, , kfile] of files) for (const e of s.events ?? []) walkWho(e.cmds, kfile, false, e.id);
  // v0.6: a cutscene's speaker titles (always Kathā)
  const walkToldWho = (steps: unknown, kfile: KathaFileNo, id: string): void => {
    if (!Array.isArray(steps)) return;
    for (const st of steps as Cmd[]) {
      if (!st || typeof st !== 'object') continue;
      if (typeof st.who === 'string' && !isNameWho(st.who, nameIds)) push(st.who, labels4.has(enKey(st.who)) ? 4 : kathaFile(st.who, kfile), `cutscene ${id} · speaker title (label) (Kathā)`, true);
      if ('hotspot' in st) walkToldWho(st.then, kfile, id);
      if ('ask' in st) for (const o of (Array.isArray(st.options) ? st.options : []) as { then?: unknown }[]) walkToldWho(o?.then, kfile, id);
    }
  };
  for (const [c, kfile] of cutscenes) if (!c.stub) walkToldWho(c.steps, kfile, c.id);
  // chapter cards
  for (const [s] of files) for (const ch of s.chapters ?? []) push(ch.summary, 4, `chapter ${ch.kanda} · summary (title card)`);
  // defs.json
  for (const m of defs.moves ?? []) push(m.description, 4, `move ${m.id} · description`);
  for (const m of defs.moves ?? []) if (m.origin && !MOVE_ORIGIN_TAGS.has(m.origin)) push(m.origin, 4, `move ${m.id} · origin (how it is learned)`);
  for (const a of defs.allies ?? []) push(a.description, 4, `ally ${a.id} · description`);
  for (const e of defs.enemies ?? []) push(e.description, 4, `enemy ${e.id} · description`);
  for (const it of defs.items ?? []) push(it.description, 4, `item ${it.id} · description`);

  // ── Kathā content strings: file 5 (held at v0.5a), 6–9 (held at v0.5.1), else file 12 (katha.json moveText: WP-C) ──
  const moveText = input.moveText ?? (kathaJson as unknown as KathaContent).moveText ?? {};
  for (const [id, en] of Object.entries(moveText)) push(en, kathaFile(en, input.moveTextFile ?? 12), `move ${id} · description (Kathā: katha.json moveText)`);
  return out;
}

/** v0.6: what collectStoryStrings reads of a told cutscene. */
export interface ToldLike {
  id: string;
  title?: string;
  stub?: boolean;
  steps?: Cmd[];
}

/** What collectStoryStrings reads (tests pass their own; every field defaults to the bundled content). */
export interface StoryInput {
  /** story files in play order, each with its file for story lines (1–3) and for NEW Kathā lines (v0.6: 10–12) */
  stories?: [StoryLike, 1 | 2 | 3, KathaFileNo][];
  /** v0.6: told cutscenes with the file of their new lines (default: the bundled ones, 10–13 by package) */
  cutscenes?: [ToldLike, KathaFileNo][];
  /** v0.6: enKey → file of the strings files 6–9 held at v0.5.1 (default FILES69_V051) */
  files69?: ReadonlyMap<string, 6 | 7 | 8 | 9>;
  /** v0.6: the file of a NEW katha.json moveText (default 12, WP-C) */
  moveTextFile?: KathaFileNo;
  defs?: DefsLike;
  /** names.json ids (a `who` that is a name id is not a speaker title) */
  nameIds?: string[];
  /** katha.json moveText */
  moveText?: Record<string, string>;
  /** enKey of the strings file 5 held at v0.5a (default FILE5_V05A) */
  file5?: ReadonlySet<string>;
  /** enKey of the speaker titles file 4 held at v0.5a (default LABELS4_V05A) */
  labels4?: ReadonlySet<string>;
}

// ───────────────────────── Level report helper ─────────────────────────

/** Easiest reading of a token (lowest level), preferring analyses without a flag. */
export function easiest(analyses: SaAnalysis[]): SaAnalysis | undefined {
  let best: SaAnalysis | undefined;
  for (const a of analyses) {
    if (!best || a.level < best.level || (a.level === best.level && best.flag !== undefined && a.flag === undefined)) best = a;
  }
  return best;
}

// ───────────────────────── Kathā content checks (content/katha.json, OWNER: kc-content) ─────────────────────────

/** What the Kathā checks need from the game content (pass `loadContent()`). */
export interface KathaCheckInput {
  katha: KathaContent | undefined;
  shlokas: Shloka[];
  moves: MoveDef[];
  names: NameEntry[];
}

/** The printed pāda split into its recitation chunks (verbatim, sandhi form), as the smarana challenge shows them. */
export function padaChunks(shloka: Shloka, pada: number): string[] {
  return (shloka.padas[pada] ?? '').split(/\s+/).filter((c) => c.length > 0);
}

/** An anvaya token: a verse form, or an implied word written "[अस्ति]". */
export function anvayaToken(token: string): { implied: boolean; word: string } {
  const m = /^\[(.+)\]$/u.exec(token);
  return m ? { implied: true, word: m[1] ?? '' } : { implied: false, word: token };
}

/** Sentences of a सरलार्थः (split after । ? !). */
export function sentencesOf(sa: string): string[] {
  return sa
    .split(/(?<=[।?!]["'”’]*)\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * A chunk "is the astra's name" when it contains the move's name stem (names.json `move.*`, e.g. विद्धि, अभय, जय,
 * धर्म): such a chunk is never the gap (notes/katha.md → Gap rules), so a binding needs at least one other chunk.
 */
export function chunkIsAstraName(chunk: string, nameStem: string): boolean {
  const stem = spellingKey(nameStem);
  return stem.length > 0 && spellingKey(chunk).includes(stem);
}

const MAX_SENTENCES = 4;
const MAX_WORDS_PER_SENTENCE = 14;

/**
 * Problems in `katha.verses`: one entry per verse; anvaya = every pada-ccheda form of the verse exactly once, reordered,
 * plus implied words in [brackets] that verify; सरलार्थः = 1–4 sentences that verify word by word (sentence mode).
 */
export function checkKathaVerses(input: KathaCheckInput, oracle: Oracle = getOracle()): string[] {
  const out: string[] = [];
  const verses = input.katha?.verses ?? [];
  const byId = new Map(input.shlokas.map((s) => [s.id, s]));
  const seen = new Set<string>();
  for (const [i, v] of verses.entries()) {
    const at = `katha.verses[${i}] ${v.shlokaId}`;
    const sh = byId.get(v.shlokaId);
    if (!sh) {
      out.push(`${at}: unknown shlokaId`);
      continue;
    }
    if (seen.has(v.shlokaId)) out.push(`${at}: duplicate entry`);
    seen.add(v.shlokaId);
    // anvaya
    if (!Array.isArray(v.anvaya) || v.anvaya.length === 0) out.push(`${at}: anvaya is empty`);
    const want = sh.words.map((w) => w.form);
    const got: string[] = [];
    for (const t of v.anvaya ?? []) {
      if (typeof t !== 'string' || t.trim() !== t || /\s/.test(t) || t.length === 0) {
        out.push(`${at}: anvaya token ${JSON.stringify(t)} must be one word without spaces`);
        continue;
      }
      const tok = anvayaToken(t);
      if (tok.implied) {
        if (!validateDeva(tok.word).ok) out.push(`${at}: implied word ${t} is not well-formed Devanagari`);
        else if (oracle.analyse(tok.word).length === 0) out.push(`${at}: implied word ${t} does not verify (did you mean: ${oracle.suggest(tok.word, 4).join(', ')})`);
      } else got.push(tok.word);
    }
    const sortKey = (xs: string[]): string => [...xs].sort().join(' ');
    if (sortKey(got) !== sortKey(want)) {
      const missing = [...want];
      const extra: string[] = [];
      for (const g of got) {
        const k = missing.indexOf(g);
        if (k >= 0) missing.splice(k, 1);
        else extra.push(g);
      }
      out.push(`${at}: anvaya is not a permutation of the verse's forms${missing.length ? ` — missing ${missing.join(' ')}` : ''}${extra.length ? ` — not in the verse ${extra.join(' ')}` : ''}`);
    } else if (got.join(' ') === want.join(' ')) out.push(`${at}: anvaya keeps the verse's own order (it must give the prose order)`);
    // सरलार्थः
    const sa = (v.saralarthah ?? '').trim();
    if (!sa) {
      out.push(`${at}: saralarthah is empty`);
      continue;
    }
    if (/[{}]/.test(sa)) out.push(`${at}: saralarthah must be plain Sanskrit (no markup)`);
    const r = oracle.verifyLine(sa);
    for (const e of r.errors) out.push(`${at}: saralarthah: ${e}`);
    const sents = sentencesOf(sa);
    if (sents.length < 1 || sents.length > MAX_SENTENCES) out.push(`${at}: saralarthah has ${sents.length} sentences (1–${MAX_SENTENCES})`);
    for (const s of sents) {
      const n = s.split(PUNCT_RE).filter((w) => w.length > 0).length;
      if (n > MAX_WORDS_PER_SENTENCE) out.push(`${at}: saralarthah sentence of ${n} words (≤ ${MAX_WORDS_PER_SENTENCE}): ${s}`);
    }
  }
  for (const s of input.shlokas) if (!seen.has(s.id)) out.push(`katha.verses: no entry for verse ${s.id}`);
  return out;
}

/**
 * Problems in `katha.astras`: exactly the verse-bound moves of defs.json (`unlockShloka`), each bound once to a pāda of
 * its own verse; the pāda prints as ≥ 2 chunks and has a chunk that is not the astra's name (the gap); no two astras
 * share a pāda.
 */
export function checkKathaAstras(input: KathaCheckInput): string[] {
  const out: string[] = [];
  const astras = input.katha?.astras ?? [];
  const shlokas = new Map(input.shlokas.map((s) => [s.id, s]));
  const moves = new Map(input.moves.map((m) => [m.id, m]));
  const names = new Map(input.names.map((n) => [n.id, n]));
  const bound = new Set<string>();
  const padaUsed = new Map<string, string>();
  for (const [i, a] of astras.entries()) {
    const at = `katha.astras[${i}] ${a.moveId}`;
    const mv = moves.get(a.moveId);
    if (!mv) {
      out.push(`${at}: unknown move`);
      continue;
    }
    if (bound.has(a.moveId)) out.push(`${at}: bound twice`);
    bound.add(a.moveId);
    if (!mv.unlockShloka) out.push(`${at}: the move has no unlockShloka (only verse-bound moves are astras)`);
    else if (mv.unlockShloka !== a.shlokaId) out.push(`${at}: shlokaId ${a.shlokaId} is not the move's own verse ${mv.unlockShloka}`);
    const sh = shlokas.get(a.shlokaId);
    if (!sh) {
      out.push(`${at}: unknown shlokaId ${a.shlokaId}`);
      continue;
    }
    if (!Number.isInteger(a.pada) || a.pada < 0 || a.pada >= sh.padas.length) {
      out.push(`${at}: pada ${a.pada} is not a pāda of ${a.shlokaId} (0–${sh.padas.length - 1})`);
      continue;
    }
    const key = `${a.shlokaId}#${a.pada}`;
    const prev = padaUsed.get(key);
    if (prev) out.push(`${at}: pāda ${a.pada} of ${a.shlokaId} is already bound to ${prev}`);
    padaUsed.set(key, a.moveId);
    const chunks = padaChunks(sh, a.pada);
    if (chunks.length < 2) out.push(`${at}: pāda "${sh.padas[a.pada]}" is one chunk (bind only pādas of ≥ 2 chunks)`);
    const stem = names.get(mv.nameId)?.sa ?? '';
    if (!stem) out.push(`${at}: move name ${mv.nameId} is not in names.json`);
    else if (!chunks.some((c) => !chunkIsAstraName(c, stem))) out.push(`${at}: every chunk of "${sh.padas[a.pada]}" contains the astra's name ${stem}: nothing can be the gap`);
  }
  for (const m of input.moves) if (m.unlockShloka && !bound.has(m.id)) out.push(`katha.astras: verse-bound move ${m.id} (${m.unlockShloka}) has no binding`);
  return out;
}
