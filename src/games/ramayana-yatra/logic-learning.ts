/**
 * Learning engine (DESIGN §4 + §13 levels). OWNER: battle. Pure + deterministic.
 *
 * Sanskrit accuracy (docs/SANSKRIT_ACCURACY.md):
 *  - Every option, stimulus and tile is a real string from the content: verse word forms
 *    (pada-ccheda), lexicon lemmas/forms/meanings, sandhi notes. Nothing here creates or alters Sanskrit.
 *    The only composition is joining real word forms with a single space (a pāda in pada-ccheda form,
 *    with "＿＿" for the blank, or a sandhi note's split words).
 *  - Distractors are other real items. No distractor equals an accepted answer (spellingKey for
 *    Sanskrit, so anusvāra and class-nasal spellings of one word count as the same word; case-folded
 *    text for meanings); meanings that share a content word with an accepted meaning are never used as
 *    distractors; homographs are never offered against each other.
 *  - A verse word with an open edition variant (`ShlokaWord.variant`) is never the gap of a pūraṇa
 *    challenge: the other reading must not be offered or judged as wrong (QA 11 Nov, REVIEW.md).
 *  - Explanations are English with {w:lexId} / {n:nameId} markup only.
 */
import type { Level, Rng } from '@sdk';
import { devaToSlp1, normalizeDeva, slp1ToDeva, spellingKey, splitAksharas } from '@sanskrit';
import type {
  Challenge,
  ChallengeKind,
  Reader,
  ChallengeOption,
  ChallengeResult,
  Fx,
  GameContent,
  GameState,
  GrammarRole,
  LexEntry,
  MasteryTier,
  SaveData,
  Shloka,
  ShlokaWord,
  WordProgress,
} from './types';
import { bump, indexOf, rngFor } from './logic-util';
import { MAX_EQUIPPED, allyForMove } from './logic-progress';
import { armAstra, armParty, gradeSmarana, isKatha, recordSmarana, smaranaRecitalQueue } from './logic-katha';
import { isBasicWord, readerOf } from './logic-reader';
import { type UiSlot, uiEn, uiSa } from './sa-ui';
import saBattleJson from './content/sa-battle.json';

// ───────────────────────── Sambhāṣaṇa slots (OWNER: ui-b) ─────────────────────────
// Prompts, explanations and toasts carry a Sanskrit version next to the unchanged English (promptSa /
// explanationSa / labelSa / toast textSa), built from content/sa-ui-b.json keys with uiSa / uiToast. Names and
// items inside a Sanskrit sentence are inflected: the forms come from content/sa-battle.json (no Devanagari here).

type SaCase = 'nom' | 'gen' | 'acc';
const SA_FORMS = (saBattleJson as unknown as { forms: Record<'ally' | 'move' | 'item', Record<string, Partial<Record<SaCase, string>>>> }).forms;

/** A party member as a slot: English markup as given, Sanskrit in `cas` (sa '' when there is no form). */
export function uiAllySlot(allyId: string | null, cas: 'nom' | 'gen', en: string, content: GameContent): { en: string; sa: string } {
  if (allyId === null) return { en, sa: cas === 'nom' ? (uiSa(content, 'toast.aHero') ?? '') : '' };
  return { en, sa: SA_FORMS.ally[allyId]?.[cas] ?? '' };
}

/** An item as a slot in the accusative: {n:nameId} in English, the declined form in Sanskrit (sa '' when unknown). */
export function uiItemSlot(content: GameContent, itemId: string, nameId: string): { en: string; sa: string } {
  const key = itemId === 'kusha_mudrika' ? uiSa(content, 'toast.itemAccRing') : itemId === 'chudamani' ? uiSa(content, 'toast.itemAccJewel') : undefined;
  return { en: `{n:${nameId}}`, sa: SA_FORMS.item[itemId]?.acc ?? key ?? '' };
}

/** A move as a slot in the accusative ({n:move.id} in English). */
export function uiMoveSlot(moveId: string): { en: string; sa: string } {
  return { en: `{n:move.${moveId}}`, sa: SA_FORMS.move[moveId]?.acc ?? '' };
}

/**
 * A toast in both languages. `text` is the English exactly as the logic always wrote it (so it never depends on the
 * interface table; learning.test checks it equals the key's English); `textSa` is uiSa(content, key, slots), left out
 * when the key is missing or a slot has no Sanskrit form (the English then shows in every mode).
 */
export function saToast(text: string, textSa: string | undefined, slots?: Record<string, UiSlot>): Extract<Fx, { kind: 'toast' }> {
  const missing = !!slots && Object.values(slots).some((v) => typeof v === 'object' && !v.sa);
  return textSa && !missing ? { kind: 'toast', text, textSa } : { kind: 'toast', text };
}

/** Sanskrit sentences joined by a space (undefined when a required part is missing). */
function saJoin(...parts: (string | undefined)[]): string | undefined {
  return parts.every((p) => p !== undefined) ? parts.filter((p) => p !== '').join(' ') : undefined;
}

/** `ch` with promptSa / explanationSa set when they exist (left out otherwise). */
function withSa(ch: Challenge, promptSa: string | undefined, explanationSa: string | undefined): Challenge {
  return { ...ch, ...(promptSa ? { promptSa } : {}), ...(explanationSa ? { explanationSa } : {}) };
}

// ───────────────────────── constants ─────────────────────────

export const BLANK = '＿＿';
export const KIND_ORDER: ChallengeKind[] = ['artha', 'lipi', 'purana', 'krama', 'viccheda', 'vibhakti'];
export const RESTORE_THRESHOLD = 0.75;

/** English labels for grammatical roles (options of `vibhakti` challenges). Case first: the case is what the form shows. */
export const ROLE_LABELS: Record<GrammarRole, string> = {
  subject: 'Nominative (subject)',
  object: 'Accusative (object)',
  instrument: 'Instrumental (by, with)',
  recipient: 'Dative (to, for)',
  source: 'Ablative (from)',
  possessor: 'Genitive (of)',
  location: 'Locative (in, at)',
  address: 'Vocative (calling out)',
  verb: 'Verb',
  indeclinable: 'Indeclinable',
  modifier: 'Modifier (agrees with a noun)',
};
/**
 * Case-centred teaching lines (sa-review P1): they describe the case and its usual range of uses, so they stay true
 * for less typical uses too (locative of respect, genitive with "possible", ablative of cause, nominative of comparison…).
 * The Sanskrit case name comes from names.json via {n:role.*} markup.
 */
export const ROLE_EXPLAIN: Record<GrammarRole, string> = {
  subject: 'in the nominative ({n:role.subject}), the naming case. It marks the subject and also words that stand with it: a predicate ("is X"), an apposition, or the standard in a comparison ("like X")',
  object: 'in the accusative ({n:role.object}). It usually marks the object of a verb ("whom, what"), and also the goal of motion, a stretch of time or space, or an adverb',
  instrument: 'in the instrumental ({n:role.instrument}): "by, with, through". It marks the means or the agent, company, and also the respect in which something holds ("in steadfastness")',
  recipient: 'in the dative ({n:role.recipient}): "to, for". It marks the one who receives or benefits, or a purpose',
  source: 'in the ablative ({n:role.source}): "from". It marks separation or source, and also a cause ("because of") or the point of comparison ("than")',
  possessor: 'in the genitive ({n:role.possessor}): relation, "of, belonging to"; with some words also "for, to" ("possible for")',
  location: 'in the locative ({n:role.location}): place, time or sphere, "in, at, among, in respect of, towards"',
  address: 'in the vocative ({n:role.address}): it calls out to someone, "O ..."',
  verb: 'a verb ({n:role.verb}): it states the action or state, with its person, number and tense',
  indeclinable: 'an indeclinable ({n:role.indeclinable}): its form never changes (particles, adverbs, conjunctions)',
  modifier: 'a modifier ({n:role.modifier}): it describes a noun or pronoun and agrees with it in case, number and gender',
};
/**
 * Sanskrit of the role options (traditional case names: प्रथमा विभक्तिः …) and of the role explanations (the case and
 * its question word: कः? कम्? केन? …), from content/sa-ui-b.json.
 */
const ROLE_SA: Record<GrammarRole, { label: (c: GameContent) => string | undefined; expl: (c: GameContent, f: string) => string | undefined }> = {
  subject: { label: (c) => uiSa(c, 'learn.roleSubject'), expl: (c, f) => uiSa(c, 'learn.explSubject', { f }) },
  object: { label: (c) => uiSa(c, 'learn.roleObject'), expl: (c, f) => uiSa(c, 'learn.explObject', { f }) },
  instrument: { label: (c) => uiSa(c, 'learn.roleInstrument'), expl: (c, f) => uiSa(c, 'learn.explInstrument', { f }) },
  recipient: { label: (c) => uiSa(c, 'learn.roleRecipient'), expl: (c, f) => uiSa(c, 'learn.explRecipient', { f }) },
  source: { label: (c) => uiSa(c, 'learn.roleSource'), expl: (c, f) => uiSa(c, 'learn.explSource', { f }) },
  possessor: { label: (c) => uiSa(c, 'learn.rolePossessor'), expl: (c, f) => uiSa(c, 'learn.explPossessor', { f }) },
  location: { label: (c) => uiSa(c, 'learn.roleLocation'), expl: (c, f) => uiSa(c, 'learn.explLocation', { f }) },
  address: { label: (c) => uiSa(c, 'learn.roleAddress'), expl: (c, f) => uiSa(c, 'learn.explAddress', { f }) },
  verb: { label: (c) => uiSa(c, 'learn.roleVerb'), expl: (c, f) => uiSa(c, 'learn.explVerb', { f }) },
  indeclinable: { label: (c) => uiSa(c, 'learn.roleIndeclinable'), expl: (c, f) => uiSa(c, 'learn.explIndeclinable', { f }) },
  modifier: { label: (c) => uiSa(c, 'learn.roleModifier'), expl: (c, f) => uiSa(c, 'learn.explModifier', { f }) },
};
/** The case name with its Sanskrit label (participle explanations). */
const CASE_NAME: Partial<Record<GrammarRole, string>> = {
  subject: 'the nominative ({n:role.subject})',
  object: 'the accusative ({n:role.object})',
  instrument: 'the instrumental ({n:role.instrument})',
  recipient: 'the dative ({n:role.recipient})',
  source: 'the ablative ({n:role.source})',
  possessor: 'the genitive ({n:role.possessor})',
  location: 'the locative ({n:role.location})',
  address: 'the vocative ({n:role.address})',
};
/**
 * A participle (kṛdanta) standing as the predicate (QA 11 Nov): a verbal adjective, declined like a noun. It is NOT a
 * finite verb, so it has no person ending; the case comes from its grammar line.
 */
export function participleExplain(caseRole: GrammarRole): string {
  return `a participle standing as the predicate, in place of a finite verb. A participle is a verbal adjective: like a noun it has case, number and gender (here ${CASE_NAME[caseRole] ?? 'a case form'}), and unlike a finite verb it has no person ending`;
}
const CASE_ROLE: [RegExp, GrammarRole][] = [
  [/\bnom\b|nominative/i, 'subject'],
  [/\bacc\b|accusative/i, 'object'],
  [/\binstr?\b|instrumental/i, 'instrument'],
  [/\bdat\b|dative/i, 'recipient'],
  [/\babl\b|ablative/i, 'source'],
  [/\bgen\b|genitive/i, 'possessor'],
  [/\bloc\b|locative/i, 'location'],
  [/\bvoc\b|vocative/i, 'address'],
];
const CASE_ROLES: GrammarRole[] = ['subject', 'object', 'instrument', 'recipient', 'source', 'possessor', 'location', 'address'];
const ALL_ROLES: GrammarRole[] = [...CASE_ROLES, 'verb', 'indeclinable', 'modifier'];

const HAS_DEVA = /[\u0900-\u097F]/;
/** Content English (gloss, grammar, translation) with raw Sanskrit is dropped from explanations. */
const en = (t: string | undefined): string => (t && !HAS_DEVA.test(t) ? t : '');
const quoted = (t: string | undefined): string => (en(t) ? `"${en(t)}"` : '');
const STOP = new Set(
  'a an the of to in on at by for from with and or as is be o oh'.split(' '),
);

// ───────────────────────── small helpers ─────────────────────────

const nd = (s: string): string => normalizeDeva(s);
/** Spelling-equivalence key (anusvāra = class nasal / word-final m): two strings with one key are the same word. */
const sk = (s: string): string => spellingKey(s);
export const fold = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

function stem(t: string): string {
  for (const suf of ['ing', 'ed', 'es', 's']) if (t.length - suf.length >= 2 && t.endsWith(suf)) return t.slice(0, -suf.length);
  return t;
}
function contentWords(meaning: string): string[] {
  const toks = fold(meaning).split(/[^a-z]+/).filter(Boolean);
  const content = toks.filter((t) => !STOP.has(t));
  return (content.length ? content : toks).map(stem);
}
/** Comma/semicolon-separated senses of a gloss, without "to"/articles and parentheses ("to be, exist" → be · exist). */
function senses(meaning: string): string[] {
  return fold(meaning)
    .split(/[,;/]/)
    .map((x) => x.replace(/\([^)]*\)/g, '').trim().replace(/^(to|a|an|the)\s+/, '').trim())
    .filter(Boolean);
}
const BE_FAMILY = new Set(['be', 'become', 'exist', 'is', 'am', 'are', 'being', 'existing', 'becoming']);
const ARTICLES = new Set(['a', 'an', 'the', 'to']);

/**
 * True if two English meanings could both be right: they share a content word (or one word is a prefix of the other,
 * ≥ 3 letters), share a whole sense ("as" · "like, as"), are both in the "to be" family (as / bhū / vṛt), or one of them
 * consists only of stop words that the other contains (sa-review P2).
 */
export function sharesContentWord(a: string, b: string): boolean {
  const sa = senses(a);
  const sb = senses(b);
  if (sa.some((x) => sb.includes(x))) return true;
  const ta = fold(a).split(/[^a-z]+/).filter(Boolean);
  const tb = fold(b).split(/[^a-z]+/).filter(Boolean);
  if (ta.some((t) => BE_FAMILY.has(t)) && tb.some((t) => BE_FAMILY.has(t))) return true;
  const stopOnly = (t: string[]): boolean => t.length > 0 && t.every((x) => STOP.has(x));
  if (stopOnly(ta) && ta.filter((x) => !ARTICLES.has(x)).some((x) => tb.includes(x))) return true;
  if (stopOnly(tb) && tb.filter((x) => !ARTICLES.has(x)).some((x) => ta.includes(x))) return true;
  const wa = contentWords(a);
  const wb = contentWords(b);
  for (const x of wa)
    for (const y of wb) {
      if (x === y) return true;
      const [s, l] = x.length <= y.length ? [x, y] : [y, x];
      if (s.length >= 3 && l.startsWith(s)) return true;
    }
  return false;
}

const DEMONSTRATIVE_SENSE = /\b(this|that)\b/;
const PERSONAL_SENSE = /\b(he|she|it)\b/;
/**
 * QA 11 Nov: every demonstrative pronoun (this / that) can also stand for "he, she, it" (the game's own glosses use
 * forms of the "this" pronoun as "by him", "his"). So a demonstrative whose gloss lists "he, she, it" is never offered
 * as a wrong meaning of another demonstrative, and vice versa.
 */
export function pronounSensesClash(a: LexEntry | undefined, b: LexEntry | undefined): boolean {
  if (!a || !b || a.pos !== 'pronoun' || b.pos !== 'pronoun') return false;
  const fa = fold(a.meaning);
  const fb = fold(b.meaning);
  const demo = (f: string): boolean => DEMONSTRATIVE_SENSE.test(f) || PERSONAL_SENSE.test(f);
  return demo(fa) && demo(fb) && (PERSONAL_SENSE.test(fa) || PERSONAL_SENSE.test(fb));
}

function aksharaCount(s: string): number {
  try {
    return splitAksharas(s).length;
  } catch {
    return [...s].length;
  }
}
function firstAkshara(s: string): string {
  try {
    return splitAksharas(s)[0] ?? '';
  } catch {
    return s.slice(0, 1);
  }
}

export function refOf(sh: Shloka): string {
  return `{n:kanda.${sh.kanda}} ${sh.kanda}.${sh.sarga}.${sh.verse}`;
}

const SLP1_CONSONANT_END = /[kKgGNcCjJYwWqQRtTdDnpPbBmyrlvSzsh]$/;
const SLP1_VOWEL_START = /^[aAiIuUfFxXeEoO]/;
/**
 * The two half-verses as printed (QA 11 Nov, title epigraph). Pādas are stored split at the word boundary when the print
 * writes a junction together across the pāda break (tvam | agamaḥ is printed tvamagamaḥ; REVIEW.md convention). Here the
 * pādas of each half are joined with a space, except that a consonant-final pāda and a vowel-initial pāda are written
 * together (a final consonant before a vowel is written joined in Devanagari print; for s-ma-nishada, the only verse
 * shown this way, the content notes record exactly this printed form). No letter is added, dropped or changed: only
 * that one space goes. The verse card keeps the four-pāda learner layout.
 */
export function halfVerseLines(sh: Shloka): string[] {
  const out: string[] = [];
  for (let i = 0; i < sh.padas.length; i += 2) {
    const a = sh.padas[i] ?? '';
    const b = sh.padas[i + 1];
    if (b === undefined) {
      out.push(a);
      continue;
    }
    const aw = a.split(' ');
    const bw = b.split(' ');
    const last = devaToSlp1(nd(aw[aw.length - 1] ?? ''));
    const first = devaToSlp1(nd(bw[0] ?? ''));
    if (SLP1_CONSONANT_END.test(last) && SLP1_VOWEL_START.test(first)) {
      out.push([...aw.slice(0, -1), slp1ToDeva(last + first), ...bw.slice(1)].join(' '));
    } else out.push(`${a} ${b}`);
  }
  return out;
}

function posLabel(e: LexEntry): string {
  const g = e.gender === 'm' ? 'masc. ' : e.gender === 'f' ? 'fem. ' : e.gender === 'n' ? 'neut. ' : '';
  return `${g}${e.pos}`;
}

function levelTier(level: Level): 2 | 3 | 4 {
  return level <= 2 ? 2 : level >= 4 ? 4 : 3;
}
export function optionCount(level: Level): number {
  return levelTier(level) === 2 ? 3 : 4;
}

/** DESIGN §4.3 + §13: 15 s choice / 25 s krama; L2 ×1.5, L4 ×0.8. */
export function timeLimitFor(kind: ChallengeKind, level: Level): number {
  const base = kind === 'krama' ? 25000 : 15000;
  const t = levelTier(level);
  return Math.round(base * (t === 2 ? 1.5 : t === 4 ? 0.8 : 1));
}

/** Weighted sampling without replacement (returns items in pick order). */
function weightedOrder<T>(rng: Rng, items: T[], weight: (t: T) => number): T[] {
  const rest = items.map((t) => ({ t, w: Math.max(0, weight(t)) }));
  const out: T[] = [];
  while (rest.length) {
    const total = rest.reduce((a, r) => a + r.w, 0);
    let i = 0;
    if (total > 0) {
      let x = rng.next() * total;
      for (i = 0; i < rest.length - 1; i++) {
        x -= (rest[i] as { w: number }).w;
        if (x < 0) break;
      }
    } else i = rng.int(rest.length);
    out.push((rest[i] as { t: T }).t);
    rest.splice(i, 1);
  }
  return out;
}

/** Sort candidates by score (desc), random tiebreak, then sample `k` from the best window. */
function pickBest<T>(rng: Rng, items: T[], score: (t: T) => number, k: number): T[] {
  const scored = rng.shuffle(items).map((t) => ({ t, s: score(t) }));
  scored.sort((a, b) => b.s - a.s);
  const window = scored.slice(0, Math.max(k, Math.min(scored.length, k * 3))).map((x) => x.t);
  return rng.sample(window, k);
}

// ───────────────────────── content index ─────────────────────────

interface Occ {
  sh: Shloka;
  w: ShlokaWord;
  wi: number;
}
interface LearnIndex {
  /** spellingKey of a form → first original string seen (one entry per spelling-equivalence class) */
  forms: Map<string, string>;
  /** spellingKey of a form → lexIds that have it (forms, verse words, lemmas) */
  lexByForm: Map<string, Set<string>>;
  formsOfLex: Map<string, string[]>;
  occ: Map<string, Occ[]>;
  /** pāda words (verse order) per shloka id */
  padaWords: Map<string, ShlokaWord[][]>;
  notes: { sh: Shloka; joined: string; split: string[]; note: string }[];
  /** every real Sanskrit string (normalized), for tests */
  strings: Set<string>;
}
const learnCache = new WeakMap<GameContent, LearnIndex>();

export function learnIndex(c: GameContent): LearnIndex {
  const hit = learnCache.get(c);
  if (hit) return hit;
  const forms = new Map<string, string>();
  const lexByForm = new Map<string, Set<string>>();
  const formsOfLex = new Map<string, string[]>();
  const occ = new Map<string, Occ[]>();
  const padaWords = new Map<string, ShlokaWord[][]>();
  const strings = new Set<string>();
  const lexIds = new Set(c.lexicon.map((e) => e.id));
  const addForm = (form: string, lexId: string | null): void => {
    if (!form || !form.trim()) return;
    strings.add(nd(form));
    if (lexId === null) return;
    const k = sk(form);
    if (!forms.has(k)) forms.set(k, form);
    let s = lexByForm.get(k);
    if (!s) lexByForm.set(k, (s = new Set()));
    s.add(lexId);
    const fl = formsOfLex.get(lexId) ?? [];
    if (!fl.some((f) => sk(f) === k)) fl.push(form);
    formsOfLex.set(lexId, fl);
  };
  for (const e of c.lexicon) {
    for (const f of e.forms) addForm(f.form, e.id);
    // lemmas are real strings but not inflected forms: index for homograph detection only
    strings.add(nd(e.lemma));
    const k = sk(e.lemma);
    let s = lexByForm.get(k);
    if (!s) lexByForm.set(k, (s = new Set()));
    s.add(e.id);
  }
  const notes: LearnIndex['notes'] = [];
  for (const sh of c.shlokas) {
    for (const p of sh.padas) strings.add(nd(p));
    const byPada: ShlokaWord[][] = sh.padas.map(() => []);
    sh.words.forEach((w, wi) => {
      addForm(w.form, lexIds.has(w.lexId) ? w.lexId : null);
      if (lexIds.has(w.lexId)) {
        const o = occ.get(w.lexId) ?? [];
        o.push({ sh, w, wi });
        occ.set(w.lexId, o);
      }
      const list = byPada[w.pada];
      if (list) list.push(w);
    });
    padaWords.set(sh.id, byPada);
    for (const n of sh.sandhiNotes ?? []) {
      strings.add(nd(n.joined));
      for (const s of n.split) strings.add(nd(s));
      if (n.joined && n.split.length >= 2 && n.split.every((s) => s.trim())) notes.push({ sh, joined: n.joined, split: n.split, note: n.note });
    }
  }
  const idx: LearnIndex = { forms, lexByForm, formsOfLex, occ, padaWords, notes, strings };
  learnCache.set(c, idx);
  return idx;
}

// ───────────────────────── SRS / mastery ─────────────────────────

export function tier(save: SaveData, lexId: string): MasteryTier {
  const w = save.words[lexId];
  if (!w || (w.seen === 0 && w.box === 0 && w.correct + w.wrong === 0)) return 'unseen';
  if (w.box >= 4) return 'mastered';
  if (w.box >= 2) return 'known';
  return 'seen';
}

/**
 * Kinds available in the current chapter. Level 4 unlocks viccheda/vibhakti one chapter earlier.
 * Reader level (v0.4.3, `save.reader`): a reader of Devanagari never gets `lipi` (READER_SKIPS); a संस्कृतम्-only reader
 * ('sa') needs no ramp, so every other kind is open from book 1. No reader (English): exactly as before.
 */
export function unlockedKinds(save: SaveData, level?: Level): ChallengeKind[] {
  const reader = readerOf(save);
  if (reader === 'sa') return KIND_ORDER.filter((k) => !READER_SKIPS.sa.includes(k));
  const ch = Math.max(save.chapter, ...save.completedChapters.map((k) => Math.min(6, k + 1)), 1);
  const early = level !== undefined && level >= 4 ? 1 : 0;
  const at: Record<ChallengeKind, number> = { artha: 1, lipi: 1, purana: 2, krama: 3, viccheda: 4 - early, vibhakti: 5 - early, smarana: 99 }; // smarana is never drawn at random (Kathā builds it for a pāda)
  const kinds = KIND_ORDER.filter((k) => ch >= at[k]);
  return reader ? kinds.filter((k) => !READER_SKIPS[reader].includes(k)) : kinds;
}

/** Kinds a reader never gets (v0.4.3): the script kind (lipi) for anyone who reads Devanagari. */
export const READER_SKIPS: Record<Reader, readonly ChallengeKind[]> = { sa: ['lipi'], 'sa-en': ['lipi'] };
/** The harder kinds a संस्कृतम्-only reader gets first (v0.4.3). */
export const HARD_KINDS: readonly ChallengeKind[] = ['vibhakti', 'viccheda', 'krama', 'purana'];

/**
 * The kinds to try, in order, for a challenge of `kind` asked by a reader (v0.4.3; with no reader `build` keeps the
 * v0.3 chain). Never a skipped kind (lipi); 'sa' builds artha for harder words only (Ctx.hardWords), so a failed artha
 * moves on to another kind, never to a basic word.
 *  1. a skipped kind is replaced: 'sa' → the harder kinds in a seeded order; 'sa-en' → artha (a word question);
 *  2. today's chain from `kind` (gated to the unlocked kinds when `gate`, as today), minus skipped kinds;
 *  3. the other open kinds: 'sa' the harder ones (seeded order) then artha, 'sa-en' in KIND_ORDER;
 *  4. last resort: any kind the reader may get (even one not unlocked yet), before the placeholder.
 */
export function readerChain(kind: ChallengeKind, reader: Reader, unlocked: readonly ChallengeKind[], gate: boolean, rng: Rng): ChallengeKind[] {
  const skip = READER_SKIPS[reader];
  const out: ChallengeKind[] = [];
  const add = (k: ChallengeKind, open: boolean): void => {
    if (k !== 'smarana' && !skip.includes(k) && !out.includes(k) && (open || !gate || unlocked.includes(k))) out.push(k);
  };
  const hard = reader === 'sa' ? rng.shuffle([...HARD_KINDS]) : [];
  const others: ChallengeKind[] = reader === 'sa' ? [...hard, 'artha'] : [...KIND_ORDER];
  if (skip.includes(kind)) for (const k of reader === 'sa' ? hard : (['artha'] as ChallengeKind[])) add(k, false);
  let k: ChallengeKind | null = kind;
  if (gate) while (k && !unlocked.includes(k)) k = fallbackOf(k);
  for (; k; k = fallbackOf(k)) add(k, false);
  for (const o of others) add(o, false);
  for (const o of others) add(o, true);
  return out;
}

function fallbackOf(kind: ChallengeKind): ChallengeKind | null {
  switch (kind) {
    case 'vibhakti':
    case 'viccheda':
    case 'purana':
      return 'artha';
    case 'krama':
      return 'purana';
    case 'artha':
      return 'lipi';
    case 'lipi':
    case 'smarana':
      return null;
  }
}

function srsWeight(save: SaveData, lexId: string): number {
  const w = save.words[lexId];
  const box = w ? Math.min(5, Math.max(0, w.box)) : 0;
  let recency = 1.2;
  if (w && w.correct + w.wrong > 0) {
    const gap = save.step - w.lastStep;
    recency = gap <= 0 ? 0.2 : Math.min(1, 0.25 + 0.25 * gap);
  }
  return (6 - box) * recency;
}

function heardShlokas(state: GameState, content: GameContent): Shloka[] {
  return content.shlokas.filter((s) => state.save.shlokas[s.id]?.heard);
}

/** Word pool with weights: heard verses' words + words seen (DESIGN §4.2). */
export function wordPool(state: GameState, content: GameContent): { lexId: string; weight: number }[] {
  const idx = indexOf(content);
  const li = learnIndex(content);
  const ids = new Set<string>();
  for (const sh of heardShlokas(state, content)) for (const w of sh.words) if (idx.lex.has(w.lexId)) ids.add(w.lexId);
  for (const [id, wp] of Object.entries(state.save.words)) if (wp.seen > 0 && idx.lex.has(id)) ids.add(id);
  if (ids.size === 0) {
    const chapterSh = content.shlokas.filter((s) => s.kanda === state.save.chapter);
    for (const sh of chapterSh.length ? chapterSh : content.shlokas.slice(0, 2)) for (const w of sh.words) if (idx.lex.has(w.lexId)) ids.add(w.lexId);
  }
  if (ids.size === 0) for (const e of content.lexicon.slice(0, 12)) ids.add(e.id);
  const out: { lexId: string; weight: number }[] = [];
  for (const id of ids) {
    const inChapter = (li.occ.get(id) ?? []).some((o) => o.sh.kanda === state.save.chapter);
    out.push({ lexId: id, weight: srsWeight(state.save, id) * (inChapter ? 2 : 1) });
  }
  return out;
}

// ───────────────────────── builders ─────────────────────────

interface Ctx {
  state: GameState;
  content: GameContent;
  rng: Rng;
  level: Level;
  id: string;
  n: number;
  pool: { lexId: string; weight: number }[];
  lexIds?: string[];
  shloka?: Shloka;
  pada?: number;
  /**
   * संस्कृतम्-only reader (v0.4.3): word questions (artha) only for harder words (never isBasicWord), and the pūraṇa gap
   * / vibhakti word prefers a harder word when the line has one. False with no reader: everything as before.
   */
  hardWords: boolean;
}

/**
 * 'sa' (v0.4.3): a word a संस्कृतम् reader may be asked the meaning of — not a basic word (isBasicWord) and not a proper
 * name (its "meaning" only restates the name).
 */
export function hardWord(e: LexEntry | undefined): boolean {
  return !!e && e.pos !== 'name' && !isBasicWord(e);
}

function poolTargets(cx: Ctx): string[] {
  const idx = indexOf(cx.content);
  const forcedAll = (cx.lexIds ?? []).filter((id) => idx.lex.has(id));
  const forced = cx.hardWords ? forcedAll.filter((id) => hardWord(idx.lex.get(id))) : forcedAll;
  if (forced.length) return weightedOrder(cx.rng, forced, (id) => srsWeight(cx.state.save, id));
  // 'sa': the words asked for are all basic (or names): none of them is asked (the caller moves on to another kind)
  if (forcedAll.length) return [];
  let pool = cx.pool;
  if (cx.hardWords) pool = pool.filter((p) => hardWord(idx.lex.get(p.lexId)));
  if (cx.shloka) {
    const inV = new Set(cx.shloka.words.map((w) => w.lexId));
    const sub = pool.filter((p) => inV.has(p.lexId));
    if (sub.length) pool = sub;
    else if (cx.hardWords) return []; // 'sa': the verse has no harder word to ask: another kind on this verse instead
  }
  return weightedOrder(
    cx.rng,
    pool.map((p) => p.lexId),
    (id) => pool.find((p) => p.lexId === id)?.weight ?? 1,
  ).slice(0, 24);
}

function finishOptions(cx: Ctx, correct: ChallengeOption[], distractors: ChallengeOption[]): { options: ChallengeOption[]; answers: string[] } {
  const all = cx.rng.shuffle([...correct.map((o) => ({ o, ok: true })), ...distractors.map((o) => ({ o, ok: false }))]);
  const options = all.map((x, i) => ({ ...x.o, id: `o${i}` }));
  const answers = all.flatMap((x, i) => (x.ok ? [`o${i}`] : []));
  return { options, answers };
}

/** `{f:shlokaId:wordIndex}`: the exact inflected form of a verse word (view renders it with SaText; tap → word card). */
export function fRef(sh: Shloka, w: ShlokaWord): string {
  return `{f:${sh.id}:${sh.words.indexOf(w)}}`;
}
/** "grammar, "gloss"" for a verse word (content English only). */
function gram(w: ShlokaWord): string {
  return [en(w.grammar), quoted(w.gloss)].filter(Boolean).join(', ');
}

/**
 * Where a word occurs (sa-review P0). A grammar note is given ONLY for an occurrence whose form equals `form`
 * (the form the challenge shows), cited as {f:…}. If no occurrence has that form, the note names a verse form
 * with its gloss but no grammar, or is empty.
 */
function occurrenceNote(cx: Ctx, lexId: string, form: string): { en: string; sa: string | undefined } {
  const occ = learnIndex(cx.content).occ.get(lexId) ?? [];
  const heard = (list: Occ[]): Occ | undefined => list.find((o) => cx.state.save.shlokas[o.sh.id]?.heard) ?? list[0];
  const exact = heard(occ.filter((o) => nd(o.w.form) === nd(form)));
  if (exact) {
    const g = gram(exact.w);
    const sa = uiSa(cx.content, 'learn.noteSame', { f: fRef(exact.sh, exact.w) });
    return { en: g ? ` In ${refOf(exact.sh)} this very form, ${fRef(exact.sh, exact.w)}, is ${g}.` : ` This form occurs in ${refOf(exact.sh)}.`, sa };
  }
  const any = heard(occ);
  if (!any) return { en: '', sa: '' };
  return { en: ` In ${refOf(any.sh)} it appears as ${fRef(any.sh, any.w)}${quoted(any.w.gloss) ? ` ${quoted(any.w.gloss)}` : ''}.`, sa: uiSa(cx.content, 'learn.noteOther', { f: fRef(any.sh, any.w) }) };
}

function buildArtha(cx: Ctx): Challenge | null {
  const idx = indexOf(cx.content);
  const li = learnIndex(cx.content);
  const forcedIds = new Set(cx.lexIds ?? []);
  for (const tid of poolTargets(cx)) {
    const target = idx.lex.get(tid);
    if (!target || !en(target.meaning).trim()) continue;
    // a proper name's "meaning" restates the name: ask names only when a script asks for them
    if (target.pos === 'name' && !forcedIds.has(tid)) continue;
    const stim = target.lemma;
    const accepted = new Set<string>([target.id, ...(li.lexByForm.get(sk(stim)) ?? [])]);
    const accMeanings = [...accepted].map((id) => idx.lex.get(id)?.meaning ?? '').filter(Boolean);
    const accFold = new Set(accMeanings.map(fold));
    const seenMeaning = new Set<string>(accFold);
    const cands = cx.content.lexicon.filter((e) => {
      if (accepted.has(e.id) || !en(e.meaning).trim()) return false;
      if ((e.pos === 'name') !== (target.pos === 'name')) return false;
      const f = fold(e.meaning);
      if (accFold.has(f)) return false;
      if (accMeanings.some((m) => sharesContentWord(m, e.meaning))) return false;
      // demonstratives can all serve as "he, she, it": never offer one demonstrative's gloss against another's
      if ([...accepted].some((id) => pronounSensesClash(idx.lex.get(id), e))) return false;
      // never offer an entry whose lemma/forms coincide with the stimulus (homograph, spelling-equivalent)
      if (sk(e.lemma) === sk(stim) || e.forms.some((x) => sk(x.form) === sk(stim))) return false;
      return true;
    });
    const tags = new Set(target.tags);
    const picked: LexEntry[] = [];
    // 'sa' (v0.4.3): the wrong meanings come from harder words too, so no option is given away by a word every reader knows
    const hardBonus = (e: LexEntry): number => (cx.hardWords && !isBasicWord(e) ? 1 : 0);
    for (const e of pickBest(cx.rng, cands, (e) => (e.pos === target.pos ? 2 : 0) + (e.tags.some((t) => tags.has(t)) ? 1 : 0) + (cx.state.save.words[e.id] ? 0.5 : 0) + hardBonus(e), cands.length)) {
      if (picked.length >= cx.n - 1) break;
      const f = fold(e.meaning);
      if (seenMeaning.has(f) || picked.some((p) => sharesContentWord(p.meaning, e.meaning))) continue;
      seenMeaning.add(f);
      picked.push(e);
    }
    if (picked.length < 1) continue;
    const { options, answers } = finishOptions(cx, [{ id: '', en: target.meaning }], picked.map((e) => ({ id: '', en: e.meaning })));
    const note = occurrenceNote(cx, target.id, stim);
    return withSa(
      {
        id: cx.id,
        kind: 'artha',
        prompt: 'What does this word mean?',
        stimulus: stim,
        options,
        answers,
        lexIds: [target.id],
        explanation: `{w:${target.id}} (${posLabel(target)}) means "${target.meaning}".${note.en}`,
        timeLimitMs: timeLimitFor('artha', cx.level),
      },
      uiSa(cx.content, 'learn.arthaPrompt'),
      saJoin(uiSa(cx.content, 'learn.arthaExpl', { w: `{w:${target.id}}` }), note.sa),
    );
  }
  return null;
}

/** lipi: a grammar note only for an occurrence of exactly the stimulus form; otherwise nothing (lemma-level only). */
function lipiNote(cx: Ctx, lexId: string, form: string): { en: string; sa: string | undefined } {
  const occ = (learnIndex(cx.content).occ.get(lexId) ?? []).filter((o) => nd(o.w.form) === nd(form));
  const o = occ.find((x) => cx.state.save.shlokas[x.sh.id]?.heard) ?? occ[0];
  if (!o) return { en: '', sa: '' };
  const g = gram(o.w);
  return { en: g ? ` In ${refOf(o.sh)} this form, ${fRef(o.sh, o.w)}, is ${g}.` : ` This form occurs in ${refOf(o.sh)}.`, sa: uiSa(cx.content, 'learn.noteSame', { f: fRef(o.sh, o.w) }) };
}

function buildLipi(cx: Ctx): Challenge | null {
  const idx = indexOf(cx.content);
  const li = learnIndex(cx.content);
  const allForms = [...li.forms.entries()];
  for (const tid of poolTargets(cx)) {
    const target = idx.lex.get(tid);
    const fl = li.formsOfLex.get(tid) ?? [];
    if (!target || fl.length === 0) continue;
    const stim = cx.rng.pick(fl);
    const key = sk(stim);
    const len = aksharaCount(stim);
    const first = firstAkshara(stim);
    const cands = allForms.filter(([k]) => k !== key);
    if (cands.length < 1) continue;
    const picked = pickBest(cx.rng, cands, ([, f]) => {
      const d = Math.abs(aksharaCount(f) - len);
      return (d === 0 ? 2 : d === 1 ? 1 : 0) + (firstAkshara(f) === first ? 2 : 0);
    }, cx.n - 1);
    const { options, answers } = finishOptions(cx, [{ id: '', sa: stim, script: 'deva' }], picked.map(([, f]) => ({ id: '', sa: f, script: 'deva' as const })));
    const note = lipiNote(cx, target.id, stim);
    return withSa(
      {
        id: cx.id,
        kind: 'lipi',
        prompt: 'Which spelling matches this word?',
        stimulus: stim,
        stimulusScript: 'iast',
        options,
        answers,
        lexIds: [target.id],
        explanation: `This is a form of {w:${target.id}}${en(target.meaning) ? ` "${en(target.meaning)}"` : ''}. Match it one syllable at a time.${note.en}`,
        timeLimitMs: timeLimitFor('lipi', cx.level),
      },
      uiSa(cx.content, 'learn.lipiPrompt'),
      saJoin(uiSa(cx.content, 'learn.lipiExpl', { w: `{w:${target.id}}` }), note.sa),
    );
  }
  return null;
}

/** Candidate verses for verse-based kinds: the forced verse, else heard verses (current chapter ×2). */
function verseOrder(cx: Ctx): Shloka[] {
  if (cx.shloka) return [cx.shloka];
  let list = heardShlokas(cx.state, cx.content);
  const forced = new Set(cx.lexIds ?? []);
  if (forced.size) {
    const sub = list.filter((s) => s.words.some((w) => forced.has(w.lexId)));
    if (sub.length) list = sub;
  }
  return weightedOrder(cx.rng, list, (s) => (s.kanda === cx.state.save.chapter ? 2 : 1));
}

function padaOrder(cx: Ctx, sh: Shloka, minWords: number): number[] {
  const pw = learnIndex(cx.content).padaWords.get(sh.id) ?? [];
  const ok = pw.map((ws, i) => ({ i, n: ws.length })).filter((x) => x.n >= minWords);
  if (cx.pada !== undefined) return ok.some((x) => x.i === cx.pada) ? [cx.pada] : [];
  return weightedOrder(cx.rng, ok, (x) => x.n).map((x) => x.i);
}

function buildPurana(cx: Ctx): Challenge | null {
  const idx = indexOf(cx.content);
  const li = learnIndex(cx.content);
  const allForms = [...li.forms.entries()];
  for (const sh of verseOrder(cx)) {
    const pw = li.padaWords.get(sh.id) ?? [];
    for (const p of padaOrder(cx, sh, 2)) {
      const words = pw[p] ?? [];
      const forced = new Set(cx.lexIds ?? []);
      // an open edition variant (REVIEW.md) is never the gap: its other reading must not be judged wrong
      let slots = words.map((w, i) => ({ w, i })).filter((x) => idx.lex.has(x.w.lexId) && !x.w.variant);
      // 'sa' (v0.4.3): the gap is a harder word when the line has one (not च / न / सः …), even if a basic word was asked for
      if (cx.hardWords && slots.some((x) => !isBasicWord(idx.lex.get(x.w.lexId)))) slots = slots.filter((x) => !isBasicWord(idx.lex.get(x.w.lexId)));
      if (forced.size && slots.some((x) => forced.has(x.w.lexId))) slots = slots.filter((x) => forced.has(x.w.lexId));
      for (const { w, i } of weightedOrder(cx.rng, slots, (x) => srsWeight(cx.state.save, x.w.lexId))) {
        const key = sk(w.form);
        const inPada = new Set(words.map((x) => sk(x.form)));
        const cands = allForms.filter(([k]) => k !== key && !inPada.has(k));
        if (cands.length < 1) continue;
        const pos = idx.lex.get(w.lexId)?.pos;
        const len = aksharaCount(w.form);
        const picked = pickBest(cx.rng, cands, ([k, f]) => {
          const lex = [...(li.lexByForm.get(k) ?? [])];
          const samePos = lex.some((id) => idx.lex.get(id)?.pos === pos) ? 2 : 0;
          const sameGram = lex.some((id) => (li.occ.get(id) ?? []).some((o) => o.w.grammar === w.grammar && sk(o.w.form) === k)) ? 2 : 0;
          return samePos + sameGram + (Math.abs(aksharaCount(f) - len) <= 1 ? 1 : 0);
        }, cx.n - 1);
        const stimulus = words.map((x, j) => (j === i ? BLANK : x.form)).join(' ');
        const { options, answers } = finishOptions(cx, [{ id: '', sa: w.form }], picked.map(([, f]) => ({ id: '', sa: f })));
        return withSa(
          {
            id: cx.id,
            kind: 'purana',
            prompt: `Which word fills the gap in line ${p + 1} of this verse?`,
            stimulus,
            shlokaId: sh.id,
            padaIndex: p,
            options,
            answers,
            lexIds: [w.lexId],
            explanation: `The verse has ${fRef(sh, w)} here${gram(w) ? `: ${gram(w)}` : ''}. It is a form of {w:${w.lexId}}. (${refOf(sh)}, line ${p + 1})`,
            timeLimitMs: timeLimitFor('purana', cx.level),
          },
          uiSa(cx.content, 'learn.puranaPrompt', { n: p + 1 }),
          uiSa(cx.content, 'learn.puranaExpl', { f: fRef(sh, w), w: `{w:${w.lexId}}` }),
        );
      }
    }
  }
  return null;
}

/** Every permutation of tile indexes that spells `seq` (normalized), so duplicate words are interchangeable. */
export function kramaOrders(tiles: string[], seq: string[]): number[][] {
  const t = tiles.map(nd);
  const s = seq.map(nd);
  const out: number[][] = [];
  const used = new Array<boolean>(t.length).fill(false);
  const cur: number[] = [];
  const go = (k: number): void => {
    if (out.length >= 720) return;
    if (k === s.length) {
      out.push(cur.slice());
      return;
    }
    for (let i = 0; i < t.length; i++) {
      if (used[i] || t[i] !== s[k]) continue;
      used[i] = true;
      cur.push(i);
      go(k + 1);
      cur.pop();
      used[i] = false;
    }
  };
  if (t.length === s.length) go(0);
  return out;
}

function buildKrama(cx: Ctx): Challenge | null {
  const li = learnIndex(cx.content);
  for (const sh of verseOrder(cx)) {
    const pw = li.padaWords.get(sh.id) ?? [];
    for (const p of padaOrder(cx, sh, 2)) {
      const words = pw[p] ?? [];
      const seq = words.map((w) => w.form);
      if (new Set(seq.map(nd)).size < 2) continue;
      let tiles = seq.slice();
      for (let tries = 0; tries < 12; tries++) {
        tiles = cx.rng.shuffle(seq);
        if (tiles.map(nd).join(' ') !== seq.map(nd).join(' ')) break;
      }
      if (tiles.map(nd).join(' ') === seq.map(nd).join(' ')) tiles = [...seq.slice(1), ...seq.slice(0, 1)];
      const orders = kramaOrders(tiles, seq);
      if (orders.length === 0) continue;
      const lexIds = [...new Set(words.map((w) => w.lexId).filter((id) => indexOf(cx.content).lex.has(id)))];
      const gloss = words.map((w) => `${fRef(sh, w)}${quoted(w.gloss) ? ` ${quoted(w.gloss)}` : ''}`).join(', ');
      return withSa(
        {
          id: cx.id,
          kind: 'krama',
          prompt: `Arrange the words of line ${p + 1} in the order the verse has them.`,
          shlokaId: sh.id,
          padaIndex: p,
          tiles,
          orders,
          lexIds,
          explanation: `Line ${p + 1} of ${refOf(sh)}: ${gloss}.${en(sh.translation) ? ` The verse says: "${en(sh.translation)}"` : ''}`,
          timeLimitMs: timeLimitFor('krama', cx.level),
        },
        uiSa(cx.content, 'learn.kramaPrompt', { n: p + 1 }),
        // the verse translation (English) is left out of the Sanskrit: it stays on the verse card
        uiSa(cx.content, 'learn.kramaExpl', { words: words.map((w) => fRef(sh, w)).join(' ') }),
      );
    }
  }
  return null;
}

/**
 * A note whose joined form already shows every word boundary and differs from the split at most by anusvāra for a
 * word-final m (śāśvatīḥ samāḥ, rāmaṃ daśarathaṃ): the answer would look like the stimulus (sa-review P2). A form that
 * hides a boundary without a sound change (tvamagamaḥ) is still a real question: where do the words divide?
 */
export function isTrivialNote(n: { joined: string; split: string[] }): boolean {
  const squash = (x: string): string => devaToSlp1(nd(x)).replace(/\s+/g, ' ').replace(/M(?= |$)/g, 'm').trim();
  return squash(n.joined) === squash(n.split.join(' '));
}

function buildViccheda(cx: Ctx): Challenge | null {
  const li = learnIndex(cx.content);
  const splitKey = (sp: string[]): string => sp.map(sk).join(' ');
  let notes = li.notes.filter((n) => !isTrivialNote(n) && (cx.shloka ? n.sh.id === cx.shloka.id : cx.state.save.shlokas[n.sh.id]?.heard));
  const forced = new Set(cx.lexIds ?? []);
  if (forced.size) {
    const sub = notes.filter((n) => n.sh.words.some((w) => forced.has(w.lexId) && n.split.some((s) => nd(s) === nd(w.form))));
    if (sub.length) notes = sub;
  }
  for (const t of weightedOrder(cx.rng, notes, (n) => (n.sh.kanda === cx.state.save.chapter ? 2 : 1))) {
    const jk = sk(t.joined);
    const accepted = new Set(li.notes.filter((n) => sk(n.joined) === jk).map((n) => splitKey(n.split)));
    const seen = new Set(accepted);
    const cands: typeof li.notes = [];
    for (const n of li.notes) {
      const k = splitKey(n.split);
      if (seen.has(k) || sk(n.joined) === jk) continue;
      seen.add(k);
      cands.push(n);
    }
    if (cands.length < 1) continue;
    const tWords = new Set(t.split.map(nd));
    const len = aksharaCount(t.joined);
    const picked = pickBest(cx.rng, cands, (n) => (n.split.some((s) => tWords.has(nd(s))) ? 2 : 0) + (Math.abs(aksharaCount(n.joined) - len) <= 2 ? 1 : 0) + (firstAkshara(n.joined) === firstAkshara(t.joined) ? 1 : 0), cx.n - 1);
    const { options, answers } = finishOptions(cx, [{ id: '', sa: t.split.join(' ') }], picked.map((n) => ({ id: '', sa: n.split.join(' ') })));
    const lexIds = [...new Set(t.sh.words.filter((w) => tWords.has(nd(w.form)) && indexOf(cx.content).lex.has(w.lexId)).map((w) => w.lexId))];
    // split words as markup, in split order (only when every part is a known verse word)
    const parts = t.split.map((sp) => t.sh.words.find((w) => nd(w.form) === nd(sp)));
    const partsText = parts.every(Boolean) ? `It splits into ${parts.map((w) => `${fRef(t.sh, w as ShlokaWord)}${quoted((w as ShlokaWord).gloss) ? ` ${quoted((w as ShlokaWord).gloss)}` : ''}`).join(' + ')}. ` : 'The correct split is highlighted. ';
    // sandhi notes may quote Devanagari; raw Sanskrit must not appear in English text, so such notes are left out
    const noteText = HAS_DEVA.test(t.note) ? '' : `${t.note} `;
    // Sanskrit: the parts (when they are verse words); the English sandhi note is left out
    const partsSa = parts.every(Boolean) ? uiSa(cx.content, 'learn.vicchedaExpl', { parts: parts.map((w) => fRef(t.sh, w as ShlokaWord)).join(' + ') }) : uiSa(cx.content, 'learn.vicchedaShown');
    return withSa(
      {
        id: cx.id,
        kind: 'viccheda',
        prompt: 'How does this joined form split into words?',
        stimulus: t.joined,
        shlokaId: t.sh.id,
        options,
        answers,
        lexIds,
        explanation: `${partsText}${noteText}(${refOf(t.sh)})`,
        timeLimitMs: timeLimitFor('viccheda', cx.level),
      },
      uiSa(cx.content, 'learn.vicchedaPrompt'),
      partsSa,
    );
  }
  return null;
}

function caseRoleOf(grammar: string): GrammarRole | null {
  for (const [re, r] of CASE_ROLE) if (re.test(grammar)) return r;
  return null;
}

/**
 * Case roles that a form with this grammar can ALSO carry out of context (homographic paradigm cells,
 * docs/SANSKRIT_ACCURACY.md). Deliberately conservative: when number/gender is unclear, more is banned.
 *  sg: abl = gen (and = acc pl of consonant stems); nom = voc for consonant stems; neuter nom = acc = voc;
 *      fem/neut -e forms (loc sg = voc sg f = nom/acc du).
 *  du: nom = acc = voc; instr = dat = abl; gen = loc.      pl: nom = acc = voc (f/n, and conservatively m); dat = abl.
 */
export function syncreticRoles(role: GrammarRole, grammar: string): GrammarRole[] {
  if (!CASE_ROLES.includes(role)) return [];
  const g = grammar.toLowerCase();
  const sg = /\bsg\b|singular/.test(g);
  const du = /\bdu\b|dual/.test(g);
  const pl = /\bpl\b|plural/.test(g);
  const masc = /\bm\b|masc/.test(g);
  const fem = /\bf\b|fem/.test(g);
  if (!sg && !du && !pl) return CASE_ROLES.filter((r) => r !== role);
  const groups: GrammarRole[][] = [];
  if (sg) {
    groups.push(['source', 'possessor', 'object'], ['subject', 'address']);
    if (!masc && !fem) groups.push(['subject', 'object', 'address']);
    if (!masc) groups.push(['location', 'subject', 'object', 'address']);
  }
  if (du) groups.push(['subject', 'object', 'address'], ['instrument', 'recipient', 'source'], ['possessor', 'location']);
  if (du && !masc) groups.push(['subject', 'object', 'address', 'location']); // neuter/fem dual -e = loc. sg.
  if (pl) groups.push(['subject', 'object', 'address'], ['recipient', 'source'], ['object', 'source', 'possessor']);
  return [...new Set(groups.filter((x) => x.includes(role)).flat())].filter((r) => r !== role);
}

/**
 * QA 11 Nov: a word keyed "verb" whose grammar is a participle (kṛdanta) with a case tag ("past passive participle,
 * nom. sg. n.") is a declined verbal adjective used predicatively. For case-role questions it is a nominal: its case
 * is accepted alongside "Verb", and the explanation does not call it a finite verb. Returns that case, else null.
 */
export function participleCase(role: GrammarRole | undefined, grammar: string): GrammarRole | null {
  if (role !== 'verb' || !/participle|gerundive/i.test(grammar)) return null;
  return caseRoleOf(grammar);
}

/** Indeclinable ending in -m (nityam, satatam, yathāsukham …): an adverbial accusative form (QA 11 Nov). */
function isAmAdverb(form: string): boolean {
  return /m$/.test(devaToSlp1(nd(form)));
}

/** Roles that could be argued correct alongside `role` (never offered as distractors). */
function roleConflicts(role: GrammarRole, grammar: string, form = ''): GrammarRole[] {
  if (role === 'modifier') {
    const c = caseRoleOf(grammar);
    return ['indeclinable', 'verb', ...(c ? [c, ...syncreticRoles(c, grammar)] : CASE_ROLES)];
  }
  if (role === 'verb') {
    const c = participleCase(role, grammar);
    return ['indeclinable', 'modifier', ...(c ? [c, ...syncreticRoles(c, grammar)] : [])];
  }
  // adverbs in -am are traditionally neuter accusatives (kriyāviśeṣaṇa): never mark "Accusative" wrong for them
  if (role === 'indeclinable') return ['verb', 'modifier', ...(isAmAdverb(form) ? (['object'] as GrammarRole[]) : [])];
  return ['modifier', ...syncreticRoles(role, grammar)];
}

function buildVibhakti(cx: Ctx): Challenge | null {
  const idx = indexOf(cx.content);
  const forced = new Set(cx.lexIds ?? []);
  for (const sh of verseOrder(cx)) {
    let slots = sh.words.map((w, wi) => ({ w, wi })).filter((x) => x.w.role && idx.lex.has(x.w.lexId));
    // 'sa' (v0.4.3): not "which role has च?" (an indeclinable) when the verse has a declined or verb form to ask, even
    // if the indeclinable was the word asked for
    if (cx.hardWords && slots.some((x) => x.w.role !== 'indeclinable')) slots = slots.filter((x) => x.w.role !== 'indeclinable');
    if (forced.size && slots.some((x) => forced.has(x.w.lexId))) slots = slots.filter((x) => forced.has(x.w.lexId));
    for (const { w } of weightedOrder(cx.rng, slots, (x) => srsWeight(cx.state.save, x.w.lexId))) {
      const key = nd(w.form);
      const same = sh.words.filter((x) => nd(x.form) === key);
      // a predicative participle is also accepted under its case (participleCase)
      const accepted = new Set<GrammarRole>(same.flatMap((x) => (x.role ? [x.role, ...(participleCase(x.role, x.grammar) ? [participleCase(x.role, x.grammar) as GrammarRole] : [])] : [])));
      if (same.some((x) => !x.role)) continue; // an unlabelled twin: ambiguous, skip
      const banned = new Set<GrammarRole>([...accepted, ...same.flatMap((x) => [...accepted].flatMap((r) => roleConflicts(r, x.grammar, x.form)))]);
      const cands = ALL_ROLES.filter((r) => !banned.has(r));
      if (cands.length < 1) continue;
      const picked = pickBest(cx.rng, cands, (r) => (CASE_ROLES.includes(r) ? 1 : 0), cx.n - accepted.size);
      // English case-role label (unchanged) + its Sambhāṣaṇa name (प्रथमा विभक्तिः …) for the Sanskrit modes
      const opt = (r: GrammarRole): ChallengeOption => {
        const labelSa = ROLE_SA[r].label(cx.content);
        return labelSa ? { id: '', en: ROLE_LABELS[r], labelSa } : { id: '', en: ROLE_LABELS[r] };
      };
      const correct = [...accepted].map(opt);
      const { options, answers } = finishOptions(cx, correct, picked.map(opt));
      const role = w.role as GrammarRole;
      const pc = participleCase(role, w.grammar);
      return withSa(
        {
          id: cx.id,
          kind: 'vibhakti',
          prompt: `Which case or role does this word have in line ${w.pada + 1} of its verse?`,
          stimulus: w.form,
          shlokaId: sh.id,
          padaIndex: w.pada,
          options,
          answers,
          lexIds: [w.lexId],
          explanation: `${fRef(sh, w)}${gram(w) ? ` (${gram(w)})` : ''} is ${pc ? participleExplain(pc) : ROLE_EXPLAIN[role]}. (${refOf(sh)})`,
          timeLimitMs: timeLimitFor('vibhakti', cx.level),
        },
        uiSa(cx.content, 'learn.vibhaktiPrompt', { n: w.pada + 1 }),
        // a predicative participle is explained by its case (QA 11 Nov), as in English
        ROLE_SA[pc ?? role].expl(cx.content, fRef(sh, w)),
      );
    }
  }
  return null;
}

const BUILDERS: Record<ChallengeKind, (cx: Ctx) => Challenge | null> = {
  artha: buildArtha,
  lipi: buildLipi,
  purana: buildPurana,
  krama: buildKrama,
  viccheda: buildViccheda,
  vibhakti: buildVibhakti,
  smarana: () => null, // Kathā: built for a specific pāda by kc-core (notes/katha.md), never drawn at random
};

function placeholder(id: string, kind: ChallengeKind, content?: GameContent): Challenge {
  const labelSa = content ? uiSa(content, 'learn.continue') : undefined;
  const ch: Challenge = {
    id,
    kind,
    prompt: 'The verses are still being gathered. Tap to continue.',
    options: [labelSa ? { id: 'o0', en: 'Continue', labelSa } : { id: 'o0', en: 'Continue' }],
    answers: ['o0'],
    lexIds: [],
    explanation: 'No verse words are available yet.',
    timeLimitMs: 0,
  };
  return content ? withSa(ch, uiSa(content, 'learn.placeholderPrompt'), uiSa(content, 'learn.placeholderExpl')) : ch;
}

function build(state: GameState, content: GameContent, kind: ChallengeKind, rng: Rng, extra: { lexIds?: string[]; shloka?: Shloka; pada?: number; gate: boolean }): Challenge | null {
  const unlocked = unlockedKinds(state.save, state.level);
  const reader = readerOf(state.save);
  const cx: Ctx = { state, content, rng, level: state.level, id: `c-${state.tick}`, n: optionCount(state.level), pool: wordPool(state, content), lexIds: extra.lexIds, shloka: extra.shloka, pada: extra.pada, hardWords: reader === 'sa' };
  if (reader) {
    // v0.4.3: a reader of Devanagari (readerChain: no lipi; 'sa': no basic-word artha, the harder kinds first)
    for (const rk of readerChain(kind, reader, unlocked, extra.gate, rngFor(state, `reader:${kind}`))) {
      const ch = BUILDERS[rk](cx);
      if (ch) return ch;
    }
    return null;
  }
  let k: ChallengeKind | null = kind;
  if (extra.gate) while (k && !unlocked.includes(k)) k = fallbackOf(k);
  while (k) {
    const ch = BUILDERS[k](cx);
    if (ch) return ch;
    k = fallbackOf(k);
  }
  return null;
}

/** DESIGN §4.1: falls back vibhakti→artha, viccheda→artha, krama→purana→artha, purana→artha (and artha→lipi). Bumps tick. */
export function makeChallenge(state: GameState, content: GameContent, kind: ChallengeKind, opts?: { lexIds?: string[]; shlokaId?: string }): { state: GameState; challenge: Challenge } {
  const rng = rngFor(state, `challenge:${kind}`);
  const shloka = opts?.shlokaId ? indexOf(content).shloka.get(opts.shlokaId) : undefined;
  const reader = readerOf(state.save);
  // a reader never sees a lipi challenge, not even as the "verses are still being gathered" placeholder
  const shown = reader && READER_SKIPS[reader].includes(kind) ? 'artha' : kind;
  const ch = build(state, content, kind, rng, { lexIds: opts?.lexIds, shloka, gate: true }) ?? placeholder(`c-${state.tick}`, shown, content);
  return { state: bump(state), challenge: ch };
}

// ───────────────────────── grading / recording ─────────────────────────

export function grade(ch: Challenge, answer: { option?: string; order?: number[]; timeMs: number }, relaxed: boolean): ChallengeResult {
  let correct = false;
  if (ch.tiles && ch.orders) {
    const o = answer.order;
    correct = !!o && o.length === ch.tiles.length && ch.orders.some((ord) => ord.length === o.length && ord.every((v, i) => v === o[i]));
  } else {
    correct = answer.option !== undefined && (ch.answers ?? []).includes(answer.option);
  }
  const t = Math.max(0, answer.timeMs);
  const swift = correct && (relaxed || ch.timeLimitMs <= 0 || t <= ch.timeLimitMs * 0.4);
  return { correct, swift, timeMs: t };
}

function wp(save: SaveData, id: string): WordProgress {
  return save.words[id] ?? { seen: 0, correct: 0, wrong: 0, box: 0, lastStep: save.step };
}

/** Leitner update (correct: box+1; wrong: box−2), session stats and the `practised` list. */
export function recordResult(state: GameState, ch: Challenge, result: ChallengeResult): GameState {
  const save = state.save;
  const step = save.step + 1;
  const words = { ...save.words };
  const ids = [...new Set(ch.lexIds)];
  for (const id of ids) {
    const p = wp(save, id);
    words[id] = {
      seen: p.seen + 1,
      correct: p.correct + (result.correct ? 1 : 0),
      wrong: p.wrong + (result.correct ? 0 : 1),
      box: result.correct ? Math.min(5, p.box + 1) : Math.max(0, p.box - 2),
      lastStep: step,
    };
  }
  const s = state.session;
  return {
    ...state,
    save: { ...save, words, step },
    session: {
      ...s,
      correct: s.correct + (result.correct ? 1 : 0),
      total: s.total + 1,
      swift: s.swift + (result.swift ? 1 : 0),
      practised: [...s.practised, ...ids.map((lexId) => ({ lexId, correct: result.correct }))],
    },
  };
}

export function markSeen(state: GameState, lexIds: string[]): GameState {
  const save = state.save;
  const words = { ...save.words };
  for (const id of new Set(lexIds)) {
    const p = wp(save, id);
    words[id] = { ...p, seen: p.seen + 1 };
  }
  return { ...state, save: { ...save, words } };
}

export function markHeard(state: GameState, content: GameContent, shlokaId: string): GameState {
  const sh = indexOf(content).shloka.get(shlokaId);
  const prev = state.save.shlokas[shlokaId] ?? { heard: false, restored: false, best: 0 };
  let s: GameState = { ...state, save: { ...state.save, shlokas: { ...state.save.shlokas, [shlokaId]: { ...prev, heard: true } } } };
  if (!state.session.shlokasHeard.includes(shlokaId)) s = { ...s, session: { ...s.session, shlokasHeard: [...s.session.shlokasHeard, shlokaId] } };
  if (sh) s = markSeen(s, sh.words.map((w) => w.lexId).filter((id) => indexOf(content).lex.has(id)));
  return s;
}

// ───────────────────────── recital (shrine) ─────────────────────────

/** Build the recital queue: one krama per pāda (purana before krama unlocks) + 2 word questions. */
export function recitalQueue(state: GameState, content: GameContent, shlokaId: string): { state: GameState; queue: Challenge[] } {
  const idx = indexOf(content);
  const sh = idx.shloka.get(shlokaId);
  if (!sh) return { state, queue: [] };
  const unlocked = unlockedKinds(state.save, state.level);
  const queue: Challenge[] = [];
  let s = state;
  const add = (kind: ChallengeKind, extra: { lexIds?: string[]; pada?: number }, chain: ChallengeKind[]): boolean => {
    for (const k of [kind, ...chain]) {
      const ch = build(s, content, k, rngFor(s, `recital:${shlokaId}:${queue.length}:${k}`), { ...extra, shloka: sh, gate: false });
      if (ch) {
        queue.push(ch);
        s = bump(s);
        return true;
      }
    }
    return false;
  };
  const pw = learnIndex(content).padaWords.get(sh.id) ?? [];
  sh.padas.forEach((_, p) => {
    const lex = (pw[p] ?? []).map((w) => w.lexId);
    if (unlocked.includes('krama')) add('krama', { pada: p }, ['purana']) || add('artha', { lexIds: lex }, []);
    else add('purana', { pada: p }, []) || add('artha', { lexIds: lex }, []);
  });
  // two word questions on key words (prefer non-indeclinables, least known first)
  const keyWords = [...new Set(sh.words.filter((w) => idx.lex.has(w.lexId)).map((w) => w.lexId))];
  const rng = rngFor(s, `recital-words:${shlokaId}`);
  const hardFirst = readerOf(s.save) === 'sa'; // v0.4.3: a संस्कृतम् reader's word questions go to the harder words first
  const ranked = weightedOrder(rng, keyWords, (id) => srsWeight(s.save, id) * (idx.lex.get(id)?.pos === 'indeclinable' ? 0.3 : 1) * (hardFirst && !hardWord(idx.lex.get(id)) ? 0.05 : 1));
  let asked = 0;
  for (const id of ranked) {
    if (asked >= 2) break;
    const useVib = unlocked.includes('vibhakti') && asked === 1 && sh.words.some((w) => w.lexId === id && w.role);
    if (add(useVib ? 'vibhakti' : 'artha', { lexIds: [id] }, ['artha'])) asked++;
  }
  return { state: s, queue };
}

/** Shrine recital. Kathā: the four pādas in order as smarana challenges (notes/katha.md); otherwise recitalQueue. */
export function startRecital(state: GameState, content: GameContent, shlokaId: string): GameState {
  const { state: s, queue } = isKatha(state) ? smaranaRecitalQueue(state, content, shlokaId) : recitalQueue(state, content, shlokaId);
  const first = queue[0];
  if (!first) return { ...s, recital: null, pending: null, fx: [...s.fx, saToast('This verse cannot be recited yet.', uiSa(content, 'recital.cannot'))] };
  return {
    ...s,
    recital: { shlokaId, queue, done: 0, correct: 0 },
    pending: { kind: 'challenge', challenge: first, context: 'recite', step: 1, steps: queue.length },
  };
}

/**
 * Kathā recital step: grade the smarana answer, update the pāda's smṛti, then go straight on to the next pāda (no
 * feedback pending) or finish the recital (restored at ≥ 3 of 4 flawless pādas). Same object for an invalid answer.
 */
function smaranaRecitalAnswer(state: GameState, content: GameContent, ch: Challenge, answer: { picks?: unknown; auto?: unknown; timeMs?: number }): GameState {
  const r = state.recital;
  const spec = ch.smarana;
  const g = gradeSmarana(ch, answer);
  if (!r || !spec || !g) return state;
  let s = recordSmarana(state, spec, g.correct, g.auto);
  if (spec.gaps.length > 0 && !g.auto) s = recordResult(s, ch, { correct: g.correct, swift: false, timeMs: Math.max(0, answer.timeMs ?? 0) });
  const last = { challenge: ch, picks: g.picks, correct: g.correct, auto: g.auto, context: 'recite' as const };
  const rec = { ...r, correct: r.correct + (g.correct ? 1 : 0), done: r.done + 1 };
  const fx: Fx[] = spec.gaps.length > 0 && !g.auto ? [{ kind: 'sfx', name: g.correct ? 'correct' : 'wrong' }] : [];
  s = { ...s, lastSmarana: last, fx: [...s.fx, ...fx] };
  const next = rec.queue[rec.done];
  if (next) return { ...s, recital: rec, pending: { kind: 'challenge', challenge: next, context: 'recite', step: rec.done + 1, steps: rec.queue.length } };
  return finishRecital(s, content, rec);
}

export function recitalAnswer(state: GameState, content: GameContent, answer: { option?: string; order?: number[]; timeMs: number; picks?: unknown; auto?: unknown }): GameState {
  const r = state.recital;
  const ch = r?.queue[r.done];
  if (!r || !ch || state.pending?.kind !== 'challenge') return state;
  if (ch.kind === 'smarana') return smaranaRecitalAnswer(state, content, ch, answer);
  const result = grade(ch, answer, false);
  const s = recordResult(state, ch, result);
  const pending = { kind: 'feedback' as const, challenge: ch, result, ...(answer.option !== undefined ? { picked: answer.option } : {}), ...(answer.order ? { order: answer.order } : {}) };
  return {
    ...s,
    recital: { ...r, correct: r.correct + (result.correct ? 1 : 0) },
    pending,
    fx: [...s.fx, { kind: 'sfx', name: result.correct ? 'correct' : 'wrong' }],
  };
}

/**
 * Unlock every move tied to this verse (equip if < 4 equipped). Returns new state + toasts. Kathā (v0.4.1): the astra is
 * equipped in place of a plain move when four are equipped (logic-katha armAstra; `replaced` names that move).
 */
export function unlockMovesFor(state: GameState, content: GameContent, shlokaId: string): { state: GameState; unlocked: { moveId: string; allyId: string | null; equipped: boolean; replaced?: string }[] } {
  const party = state.save.party.slice();
  const unlocked: { moveId: string; allyId: string | null; equipped: boolean; replaced?: string }[] = [];
  const katha = isKatha(state);
  for (const mv of content.moves) {
    if (mv.unlockShloka !== shlokaId) continue;
    const allyId = allyForMove(mv.id, content);
    const i = party.findIndex((m) => m.id === allyId);
    const m = party[i];
    if (!m) {
      unlocked.push({ moveId: mv.id, allyId, equipped: false });
      continue;
    }
    if (katha) {
      const r = armAstra(m, mv.id, content);
      party[i] = r.member;
      unlocked.push({ moveId: mv.id, allyId, equipped: r.member.moves.includes(mv.id), ...(r.armed?.replaced ? { replaced: r.armed.replaced } : {}) });
      continue;
    }
    const pp = { ...m.pp, [mv.id]: m.pp[mv.id] ?? mv.pp };
    const equip = !m.moves.includes(mv.id) && m.moves.length < MAX_EQUIPPED;
    party[i] = { ...m, pp, moves: equip ? [...m.moves, mv.id] : m.moves };
    unlocked.push({ moveId: mv.id, allyId, equipped: equip || m.moves.includes(mv.id) });
  }
  return { state: { ...state, save: { ...state.save, party } }, unlocked };
}

/**
 * Kathā (v0.4.1): equip the party's unlocked astras (logic-katha armParty: in place of plain moves when four are
 * equipped) with a toast for each, and set ARMED_FLAG. Used when Kathā is chosen in Settings and, once, when a v0.4.0
 * Kathā save is loaded. The practice game: the same object.
 */
export function armKatha(state: GameState, content: GameContent): GameState {
  if (!isKatha(state)) return state;
  const r = armParty(state, content);
  const fx: Fx[] = r.armed.map((x) => {
    const slots = { who: uiAllySlot(x.allyId, 'nom', allyRef(x.allyId), content), move: uiMoveSlot(x.moveId) };
    if (!x.replaced) return saToast(`New move for ${allyRef(x.allyId)}: {n:move.${x.moveId}}`, uiSa(content, 'recital.newMove', slots), slots);
    const swap = { ...slots, old: uiMoveSlot(x.replaced) };
    return saToast(uiEn(content, 'toast.astraArmed', swap), uiSa(content, 'toast.astraArmed', swap), swap);
  });
  return fx.length ? { ...r.state, fx: [...r.state.fx, ...fx] } : r.state;
}

function allyRef(allyId: string | null): string {
  return allyId === 'player' ? '{player}' : allyId ? `{n:ally.${allyId}}` : 'a hero';
}

export function recitalAdvance(state: GameState, content: GameContent): GameState {
  const r = state.recital;
  if (!r || state.pending?.kind !== 'feedback') return state;
  const done = r.done + 1;
  const next = r.queue[done];
  if (next) return { ...state, recital: { ...r, done }, pending: { kind: 'challenge', challenge: next, context: 'recite', step: done + 1, steps: r.queue.length } };
  return finishRecital(state, content, r);
}

/** End of a recital: restored at ≥ 75 % (3 of 4 in Kathā), moves unlocked, toasts; recital and pending become null. */
function finishRecital(state: GameState, content: GameContent, r: NonNullable<GameState['recital']>): GameState {
  const total = r.queue.length;
  const acc = total ? r.correct / total : 0;
  const prev = state.save.shlokas[r.shlokaId] ?? { heard: true, restored: false, best: 0 };
  const passed = acc >= RESTORE_THRESHOLD;
  const restored = prev.restored || passed;
  const newly = restored && !prev.restored;
  let s: GameState = {
    ...state,
    recital: null,
    pending: null,
    save: { ...state.save, shlokas: { ...state.save.shlokas, [r.shlokaId]: { heard: true, restored, best: Math.max(prev.best, acc) } } },
  };
  const fx: Fx[] = [];
  if (newly) {
    if (!s.session.shlokasRestored.includes(r.shlokaId)) s = { ...s, session: { ...s.session, shlokasRestored: [...s.session.shlokasRestored, r.shlokaId] } };
    fx.push({ kind: 'sfx', name: 'win' }, { kind: 'flash' }, saToast(`Verse restored! ${r.correct} of ${total} correct.`, uiSa(content, 'recital.restored', { c: r.correct, t: total })));
    const u = unlockMovesFor(s, content, r.shlokaId);
    s = u.state;
    for (const x of u.unlocked) {
      const slots = { who: uiAllySlot(x.allyId, 'nom', allyRef(x.allyId), content), move: uiMoveSlot(x.moveId) };
      if (x.replaced) {
        // Kathā: the astra took the place of a plain move (v0.4.1)
        const swap = { ...slots, old: uiMoveSlot(x.replaced) };
        fx.push(saToast(uiEn(content, 'recital.newMoveSwap', swap), uiSa(content, 'recital.newMoveSwap', swap), swap));
        continue;
      }
      const sa = x.equipped ? uiSa(content, 'recital.newMove', slots) : uiSa(content, 'recital.newMoveEquip', slots);
      fx.push(saToast(`New move for ${allyRef(x.allyId)}: {n:move.${x.moveId}}${x.equipped ? '' : ' (equip it from the Party menu)'}`, sa, slots));
    }
  } else if (passed) {
    fx.push({ kind: 'sfx', name: 'correct' }, saToast(`Recited again: ${r.correct} of ${total} correct.`, uiSa(content, 'recital.again', { c: r.correct, t: total })));
  } else {
    fx.push({ kind: 'sfx', name: 'wrong' }, saToast(`${r.correct} of ${total} correct. Three in four (75%) restores the verse. Try again!`, uiSa(content, 'recital.fail', { c: r.correct, t: total })));
  }
  return { ...s, fx: [...s.fx, ...fx] };
}

// ───────────────────────── study hall (Kathā shrine) ─────────────────────────

/** Challenges in one study-hall round. */
export const STUDY_ROUND = 5;

/**
 * Kathā study hall (अभ्यासशाला): a round of STUDY_ROUND classic challenges (makeChallenge over the unlocked kinds, in
 * turn from a seeded start), context 'quiz' with the usual feedback panels, untimed. Optional, never on the story path.
 * `state.recital` holds the round (`study: true`, shlokaId ''); the caller has rewound the shrine so its menu returns.
 */
export function startStudy(state: GameState, content: GameContent): GameState {
  const kinds = unlockedKinds(state.save, state.level);
  const start = rngFor(state, 'study').int(Math.max(1, kinds.length));
  let s = bump(state);
  const queue: Challenge[] = [];
  for (let i = 0; i < STUDY_ROUND; i++) {
    const r = makeChallenge(s, content, kinds[(start + i) % kinds.length] ?? 'artha');
    s = r.state;
    queue.push({ ...r.challenge, timeLimitMs: 0 });
  }
  return { ...s, recital: { shlokaId: '', queue, done: 0, correct: 0, study: true }, pending: { kind: 'challenge', challenge: queue[0] as Challenge, context: 'quiz', step: 1, steps: queue.length } };
}

/** After a study-hall feedback panel: the next challenge, or the end of the round (recital and pending null). */
export function studyAdvance(state: GameState, _content: GameContent): GameState {
  const r = state.recital;
  if (!r?.study || state.pending?.kind !== 'feedback') return state;
  const done = r.done + 1;
  const next = r.queue[done];
  if (next) return { ...state, recital: { ...r, done }, pending: { kind: 'challenge', challenge: next, context: 'quiz', step: done + 1, steps: r.queue.length } };
  return { ...state, recital: null, pending: null };
}
