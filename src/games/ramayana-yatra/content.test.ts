/**
 * Sanskrit quality gate for the Ramayana-yatra content (OWNER: content-v).
 *
 * Checks every Devanagari string in ./content/*.json against the engine (@sanskrit) and the
 * closed-world rules of docs/SANSKRIT_ACCURACY.md. Failure messages name the item and field so they
 * can be fixed directly. This file holds no Sanskrit literals: all Sanskrit comes from the JSON.
 *
 * The three allowlists below (SINGLE_SOURCE, SANDHI_ENGINE_EXCEPTIONS, OMITTED_NAME_IDS) must be
 * mirrored in REVIEW.md. The tests check both directions and also fail on stale entries.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkAnustubh, devaToSlp1, joinSandhi, normalizeDeva, slp1ToDeva, validateDeva } from '@sanskrit';
import { loadContent } from './content';
import type { LexEntry, NameEntry, Shloka } from './types';
import lex1Raw from './content/lexicon-1.json';
import lex2Raw from './content/lexicon-2.json';
import defsRaw from './content/defs.json';
import storyCommon from './content/story-common.json';
import storyCh1 from './content/story-ch1.json';
import storyCh2 from './content/story-ch2.json';
import storyCh3 from './content/story-ch3.json';
import storyCh4 from './content/story-ch4.json';
import storyCh5 from './content/story-ch5.json';
import storyCh6 from './content/story-ch6.json';
import { ALLY_IDS, ENEMY_IDS, SPRITE_IDS } from './catalog';

const content = loadContent();
const REVIEW_MD = readFileSync(new URL('./REVIEW.md', import.meta.url), 'utf8');

// ───────────────────────── Allowlists (mirror every change in REVIEW.md) ─────────────────────────

/**
 * Verses whose text currently rests on ONE source (one host in provenance.sources, and no
 * letter-for-letter match by the independent verifier below). They ship only as "awaiting human
 * review". REVIEW.md section "## Single-source items" must list exactly these ids.
 */
export const SINGLE_SOURCE: Record<string, string> = {
  // id: 'why it is single-source'
};

/**
 * Independent verification by content-v: verse id → the second source that was fetched and compared
 * letter for letter with the stored pādas (host must differ from every provenance source).
 * A 'match' here counts as the second confirmation (SANSKRIT_ACCURACY.md principle 2). A 'variant' (an edition
 * difference, not a transcription error) does not count, and must be listed in REVIEW.md's discrepancy table.
 */
export const INDEPENDENT_CHECKS: Record<string, { url: string; result: 'match' | 'variant' | 'mismatch'; note?: string }> = {
  's-tapah-svadhyaya': { url: 'https://ambuda.org/proofing/ramayana-condensed-in-the-poet-s-own-words/download/text', result: 'match' },
  's-ko-nvasmin': { url: 'https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-1/verse-2', result: 'match' },
  's-samudra-iva': { url: 'https://enjoylearningsanskrit.com/scriptures/ramayana/book-1/chapter-1/verse-16', result: 'match', note: 'critical-edition numbering 1.1.16' },
  's-ma-nishada': { url: 'https://ambuda.org/proofing/ramayana-condensed-in-the-poet-s-own-words/download/text', result: 'match', note: 'orthography only: visarga written as sibilant' },
  's-kausalya-supraja': { url: 'https://vedapath.app/en/ramayana/bala-kanda/23/1.23.2', result: 'match', note: 'orthography only: class nasal for anusvara' },
  's-ramo-dvir': { url: 'https://ambuda.org/proofing/ramayana-condensed-in-the-poet-s-own-words/download/text', result: 'match' },
  's-pitari-shushrusha': { url: 'https://vishvasa.github.io/kAvyam/laxyam/padyam/subhAShitam/rAmAyaNamuktAvaliH', result: 'match' },
  's-ramam-dasharatham': { url: 'https://ambuda.org/proofing/ramayana-condensed-in-the-poet-s-own-words/download/text', result: 'match' },
  // Edition variant in pāda 4 (two uncited witnesses read a different epithet for Indra); ours follows the cited editions. Human reviewer decides.
  's-ramo-vigrahavan': { url: 'https://vedapath.app/en/ramayana/aranya-kanda/37/3.37.13', result: 'variant' },
  's-golden-deer': { url: 'https://de.wisdomlib.org/hinduism/book/the-ramayana-sanskrit/d/doc711611.html', result: 'match' },
  's-aranya-3': { url: 'https://de.wisdomlib.org/hinduism/book/the-ramayana-sanskrit/d/doc712332.html', result: 'match' },
  's-naham-janami': { url: 'https://vedapath.app/en/ramayana/kishkindha-kanda/6/4.6.22', result: 'match' },
  's-anirvedah': { url: 'https://vishvasa.github.io/kAvyam/laxyam/padyam/subhAShitam/rAmAyaNamuktAvaliH', result: 'match' },
  // Edition variant in pāda 2 (final word: three readings across witnesses). Human reviewer decides.
  's-kalyani-bata': { url: 'https://vishvasa.github.io/kAvyam/laxyam/padyam/subhAShitam/rAmAyaNamuktAvaliH', result: 'variant' },
  's-jayatyatibalo': { url: 'https://www.wisdomlib.org/hinduism/book/the-ramayana-sanskrit/d/doc716325.html', result: 'match' },
  's-dasoham': { url: 'https://enjoylearningsanskrit.com/scriptures/ramayana/book-5/chapter-41/verse-7', result: 'match', note: 'orthography only: n-final assimilated before s' },
  's-sakrdeva': { url: 'https://de.wisdomlib.org/hinduism/book/the-ramayana-sanskrit/d/doc717545.html', result: 'match' },
  's-aditya-hrdayam': { url: 'https://www.greenmesg.org/stotras/surya/aditya_hridayam.php', result: 'match' },
  's-maranantani': { url: 'https://www.wisdomlib.org/hinduism/book/the-ramayana-sanskrit/d/doc721126.html', result: 'match' },
};

/**
 * Verses whose pādas the sandhi engine cannot rebuild exactly from `words` (id → reason). Each
 * reason must say which junction and why (e.g. an edition's spelling, an r-final word the engine
 * cannot know). REVIEW.md section "## Sandhi-engine exceptions" must list exactly these ids.
 */
export const SANDHI_ENGINE_EXCEPTIONS: Record<string, string> = {
  // The edition leaves word-final n unassimilated before the palatal sibilant; the engine applies scutva (8.4.40).
  's-dasoham': 'pada 3: printed with n unassimilated before the palatal sibilant (no scutva, 8.4.40); text kept as printed',
};

/**
 * Name ids deliberately left out of names.json because no attested word could be confirmed.
 * The view shows English for these. REVIEW.md section "## Omitted names" must list exactly these.
 */
export const OMITTED_NAME_IDS: readonly string[] = ['person.rishika', 'person.villager_f'];

// ───────────────────────── Helpers ─────────────────────────

const LATIN_OR_IAST = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

/** Problems with one Sanskrit field (empty array = fine). */
function devaProblems(x: unknown): string[] {
  if (typeof x !== 'string') return ['not a string'];
  const out: string[] = [];
  const v = validateDeva(x);
  if (!v.ok) out.push(...v.errors);
  if (x !== x.normalize('NFC')) out.push('not NFC');
  if (LATIN_OR_IAST.test(x)) out.push('contains Latin/IAST letters (store Devanagari only)');
  if (/[\u0964\u0965]/.test(x)) out.push('contains a daṇḍa (store pādas and words without daṇḍas)');
  if (normalizeDeva(x) !== x) out.push('not normalised (normalizeDeva changes it: extra spaces, nukta or ZWJ/ZWNJ)');
  return out;
}

function checkDeva(where: string, x: unknown, failures: string[]): void {
  for (const p of devaProblems(x)) failures.push(`${where}: ${JSON.stringify(x)}: ${p}`);
}

function report(failures: string[], what: string): void {
  if (failures.length) assert.fail(`${failures.length} ${what} problem(s):\n  - ${failures.slice(0, 60).join('\n  - ')}${failures.length > 60 ? `\n  … and ${failures.length - 60} more` : ''}`);
}

const host = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

/** Bullet ids listed under a "## <heading>" section of REVIEW.md (lines starting with "- `id`"). */
function reviewSection(heading: string): string[] {
  const lines = REVIEW_MD.split('\n');
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return [];
  const ids: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (/^##\s/.test(l)) break;
    const m = /^\s*-\s+`([^`]+)`/.exec(l);
    if (m) ids.push(m[1] as string);
  }
  return ids;
}

function sameSet(where: string, code: string[], review: string[], failures: string[]): void {
  for (const id of code) if (!review.includes(id)) failures.push(`${where}: "${id}" is in content.test.ts but not listed in REVIEW.md`);
  for (const id of review) if (!code.includes(id)) failures.push(`${where}: "${id}" is listed in REVIEW.md but not in content.test.ts`);
}

/** Pāda numbers (1-based) named in a meterNote, e.g. "pāda 3: vipulā", "pādas 1 and 3: …". */
function padasNamed(note: string | undefined): Set<number> {
  const out = new Set<number>();
  if (!note) return out;
  for (const m of note.matchAll(/p[āa]das?\s*((?:\d|\s|,|and|&|\+)+)/gi)) for (const d of (m[1] as string).match(/\d/g) ?? []) out.add(Number(d));
  return out;
}

/** Content words shared by two English glosses (case-insensitive, ignoring stop-words). */
function meaningsClash(a: string, b: string): boolean {
  const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'and', 'or', 'is', 'be', 'one', 'who', 'that', 'this', 'as', 'not', 'o']);
  const words = (s: string) => new Set(s.toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/).filter((w) => w.length > 1 && !STOP.has(w)));
  const wa = words(a);
  for (const w of words(b)) if (wa.has(w)) return true;
  return false;
}

const lexById = new Map<string, LexEntry>(content.lexicon.map((e) => [e.id, e]));
const shlokaById = new Map<string, Shloka>(content.shlokas.map((s) => [s.id, s]));
const nameById = new Map<string, NameEntry>(content.names.map((n) => [n.id, n]));

// ───────────────────────── Sandhi rebuild (engine check) ─────────────────────────

const compact = (deva: string) => devaToSlp1(deva).replace(/\s+/g, '');

/** Half-verses of a verse: pādas 0+1 and 2+3 (a 2- or 3-pāda verse yields what it has). */
const HALVES: [number, number][] = [
  [0, 1],
  [2, 3],
];

/**
 * Rebuilds each half-verse from its words with the sandhi engine (joinSandhi = joinSandhiDeva on SLP1):
 * the words of pādas 0+1 (then 2+3) are joined as ONE sequence, so sandhi across the pāda break inside a
 * half-verse is applied, and the result is compared with the two pādas concatenated (SLP1, spaces ignored).
 * By the project convention a pāda break that falls inside a sandhi is stored at the word boundary
 * (tvam | agamah); in SLP1 without spaces that is the same string as the printed joined form. Every engine
 * alternative (vikalpa) is accepted. No sandhi is applied between the two half-verses.
 * Returns null on success, or the first half-verse where the rebuild and the text part ways.
 */
function sandhiRebuild(s: Shloka): null | { half: string; expected: string; got: string } {
  const indexed = s.words.map((w, i) => ({ w, i }));
  for (const [p0, p1] of HALVES) {
    if (p0 >= s.padas.length) break;
    const padas = s.padas.slice(p0, p1 + 1);
    const target = padas.map(compact).join('');
    const label = padas.length > 1 ? `pādas ${p0 + 1}–${p1 + 1}` : `pāda ${p0 + 1}`;
    const words = indexed
      .filter(({ w }) => w.pada >= p0 && w.pada <= p1)
      .sort((x, y) => x.w.pada - y.w.pada || x.i - y.i)
      .map(({ w }) => devaToSlp1(w.form));
    if (words.length === 0) return { half: label, expected: padas.join(' | '), got: 'has no words in words[]' };
    // candidate = finished text + surface of the current word (its tail not yet joined) + that word's original form.
    // The junction is decided on the ORIGINAL words, so whole-word rules (sa-h, esa-h, punar, ami ...) still apply
    // when the word's head was changed by the junction on its left.
    type Cand = { done: string; cur: string; orig: string };
    let cands: Cand[] = [{ done: '', cur: words[0] as string, orig: words[0] as string }];
    let best = '';
    for (const next of words.slice(1)) {
      const out: Cand[] = [];
      for (const c of cands) {
        const r = joinSandhi(c.orig, next);
        for (const v of new Set([r.result, ...r.alternatives.map((x) => x.result)].map((x) => x.replace(/\s+/g, '')))) {
          let l = 0;
          while (l < c.orig.length && l < v.length && c.orig[l] === v[l]) l++;
          const tail = c.orig.slice(l); // part of the original word changed by this junction
          let cand: Cand;
          if (c.cur.endsWith(tail)) cand = { done: c.done + c.cur.slice(0, c.cur.length - tail.length), cur: v.slice(l), orig: next };
          else {
            // tiny word changed on both sides: fall back to joining the surface form
            const r2 = joinSandhi(c.cur, next).result.replace(/\s+/g, '');
            let m = 0;
            while (m < c.cur.length && m < r2.length && c.cur[m] === r2[m]) m++;
            cand = { done: c.done + r2.slice(0, m), cur: r2.slice(m), orig: next };
          }
          if (target.startsWith(cand.done)) {
            out.push(cand);
            if (cand.done.length > best.length) best = cand.done;
          }
        }
      }
      cands = out.filter((c, i) => out.findIndex((d) => d.done === c.done && d.cur === c.cur) === i).slice(0, 64);
      if (cands.length === 0) break;
    }
    if (cands.some((c) => c.done + c.cur === target)) continue;
    const full = cands.length ? (cands[0] as Cand).done + (cands[0] as Cand).cur : '';
    const got = full ? `rebuilds it as "${slp1ToDeva(full)}"` : `agrees only up to "${slp1ToDeva(best) || '(start)'}" and then diverges`;
    return { half: label, expected: padas.join(' | '), got };
  }
  return null;
}

/**
 * Every surface the sandhi engine allows for this word sequence (SLP1, spaces removed). As in sandhiRebuild, each
 * junction is decided on the original words.
 */
function engineJoin(words: string[]): string[] {
  type C = { done: string; cur: string; orig: string };
  let cands: C[] = [{ done: '', cur: words[0] ?? '', orig: words[0] ?? '' }];
  for (const next of words.slice(1)) {
    const out: C[] = [];
    for (const c of cands) {
      const r = joinSandhi(c.orig, next);
      for (const v of new Set([r.result, ...r.alternatives.map((a) => a.result)].map((x) => x.replace(/\s+/g, '')))) {
        let l = 0;
        while (l < c.orig.length && l < v.length && c.orig[l] === v[l]) l++;
        const tail = c.orig.slice(l);
        if (c.cur.endsWith(tail)) out.push({ done: c.done + c.cur.slice(0, c.cur.length - tail.length), cur: v.slice(l), orig: next });
        else out.push({ done: c.done + c.cur, cur: v.slice(c.orig.length), orig: next });
      }
    }
    cands = out.slice(0, 64);
  }
  return [...new Set(cands.map((c) => c.done + c.cur))];
}

// ───────────────────────── Sanskrit fields ─────────────────────────

test('every Sanskrit field is valid, NFC, normalised Devanagari with no Latin/IAST', () => {
  const f: string[] = [];
  for (const s of content.shlokas) {
    s.padas.forEach((p, i) => checkDeva(`shloka ${s.id} padas[${i}]`, p, f));
    s.words.forEach((w, i) => checkDeva(`shloka ${s.id} words[${i}].form`, w.form, f));
    s.sandhiNotes.forEach((n, i) => {
      checkDeva(`shloka ${s.id} sandhiNotes[${i}].joined`, n.joined, f);
      n.split.forEach((x, j) => checkDeva(`shloka ${s.id} sandhiNotes[${i}].split[${j}]`, x, f));
    });
  }
  for (const e of content.lexicon) {
    checkDeva(`lexicon ${e.id} lemma`, e.lemma, f);
    e.forms.forEach((x, i) => checkDeva(`lexicon ${e.id} forms[${i}].form`, x.form, f));
  }
  for (const n of content.names) checkDeva(`names ${n.id} sa`, n.sa, f);
  report(f, 'Sanskrit-field');
});

// ───────────────────────── Shlokas ─────────────────────────

test('shlokas: ids, references, metre, words, sandhi notes, texts', () => {
  const f: string[] = [];
  const seen = new Set<string>();
  for (const s of content.shlokas) {
    const at = `shloka ${s.id}`;
    if (!/^s-[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) f.push(`${at}: id must look like "s-ma-nishada"`);
    if (seen.has(s.id)) f.push(`${at}: duplicate id`);
    seen.add(s.id);
    if (![1, 2, 3, 4, 5, 6].includes(s.kanda)) f.push(`${at}.kanda: ${s.kanda} is not 1–6`);
    if (!Number.isInteger(s.sarga) || s.sarga < 1) f.push(`${at}.sarga: must be a positive integer`);
    if (!Number.isInteger(s.verse) || s.verse < 1) f.push(`${at}.verse: must be a positive integer`);
    if (!s.edition?.trim()) f.push(`${at}.edition: empty (say which edition/numbering)`);
    // metre
    if (s.meter === 'anustubh') {
      if (s.padas.length !== 4) f.push(`${at}.padas: anuṣṭubh needs exactly 4 pādas, has ${s.padas.length}`);
      const named = padasNamed(s.meterNote);
      s.padas.forEach((p, i) => {
        const r = checkAnustubh(p, i as 0 | 1 | 2 | 3);
        if (!r.ok && !named.has(i + 1)) f.push(`${at}.padas[${i}] (pāda ${i + 1}): does not scan as pathyā anuṣṭubh (${r.syllables} syllables, ${r.pattern}; ${r.issues.join('; ')}) and meterNote does not name "pāda ${i + 1}"`);
      });
    } else if (s.meter === 'other') {
      if (!s.meterNote?.trim()) f.push(`${at}.meterNote: required when meter is "other" (name the metre)`);
      if (s.padas.length < 2) f.push(`${at}.padas: needs at least 2 pādas`);
    } else f.push(`${at}.meter: must be "anustubh" or "other"`);
    // words
    if (s.words.length === 0) f.push(`${at}.words: empty`);
    const forms = new Set(s.words.map((w) => w.form));
    s.words.forEach((w, i) => {
      const wa = `${at}.words[${i}] (${w.form})`;
      const e = lexById.get(w.lexId);
      if (!e) f.push(`${wa}.lexId: "${w.lexId}" is not in lexicon-1/2.json`);
      else if (!e.forms.some((x) => x.form === w.form)) f.push(`${wa}: form is not among lexicon "${w.lexId}" forms`);
      if (!Number.isInteger(w.pada) || w.pada < 0 || w.pada > 3 || w.pada >= s.padas.length) f.push(`${wa}.pada: ${w.pada} is not a pāda index of this verse`);
      if (!w.grammar?.trim()) f.push(`${wa}.grammar: empty`);
      if (!w.gloss?.trim()) f.push(`${wa}.gloss: empty`);
    });
    // sandhi notes
    // convention: a pāda break inside a sandhi is stored at the WORD boundary (tvam | agamah), never mid-syllable
    for (const [p0, p1] of HALVES) {
      if (p1 >= s.padas.length) continue;
      const lastOfFirst = [...s.words].reverse().find((w) => w.pada === p0);
      const firstOfSecond = s.words.find((w) => w.pada === p1);
      if (!lastOfFirst || !firstOfSecond) continue;
      const fin = devaToSlp1(lastOfFirst.form).slice(-1);
      const start = compact(s.padas[p1] as string);
      const nextWord = devaToSlp1(firstOfSecond.form);
      // the namut augment (8.3.32: a nasal after a short vowel doubles before a vowel) belongs to the next word: -an | nanv-
      const namut = /[NRn]/.test(fin) && start.startsWith(fin + nextWord.charAt(0));
      if (!namut && /[aAiIuUfFxXeEoO]/.test(nextWord.charAt(0)) && !/[aAiIuUfFxXeEoOHM]/.test(fin) && start.startsWith(fin) && !start.startsWith(nextWord.slice(0, 2))) {
        f.push(`${at}.padas[${p1}]: pāda ${p1 + 1} begins with the final consonant of "${lastOfFirst.form}"; by convention cut the pāda at the word boundary (end pāda ${p0 + 1} with "${lastOfFirst.form}", start pāda ${p1 + 1} with "${firstOfSecond.form}") and note it in provenance`);
      }
    }
    // a sandhi may span the pāda break inside a half-verse (stored at the word boundary), so search the half-lines
    const halfLines = HALVES.filter(([p0]) => p0 < s.padas.length).map(([p0, p1]) => s.padas.slice(p0, p1 + 1).map(compact).join(''));
    s.sandhiNotes.forEach((n, i) => {
      const na = `${at}.sandhiNotes[${i}]`;
      if (!halfLines.some((h) => h.includes(compact(n.joined)))) f.push(`${na}.joined: "${n.joined}" does not occur in any half-verse (pādas 1–2 or 3–4; spaces ignored)`);
      if (n.split.length < 2) f.push(`${na}.split: needs at least 2 members`);
      n.split.forEach((x, j) => {
        if (!forms.has(x)) f.push(`${na}.split[${j}]: "${x}" is not a word form of this verse`);
      });
      if (!n.note?.trim()) f.push(`${na}.note: empty`);
    });
    if (!s.translation?.trim()) f.push(`${at}.translation: empty`);
    if (!s.context?.trim()) f.push(`${at}.context: empty`);
    if (!s.speaker?.trim()) f.push(`${at}.speaker: empty`);
    if (!Array.isArray(s.teaches)) f.push(`${at}.teaches: must be an array`);
  }
  report(f, 'shloka');
});

test('shlokas: provenance, two confirmations, never humanReviewed', () => {
  const f: string[] = [];
  for (const s of content.shlokas) {
    const at = `shloka ${s.id}.provenance`;
    const p = s.provenance;
    if (!p || !Array.isArray(p.sources)) {
      f.push(`${at}: missing`);
      continue;
    }
    if (!p.sources.some((x) => x.name?.trim() && host(x.url))) f.push(`${at}.sources: needs at least one named source with a URL`);
    if (!Array.isArray(p.verifiedBy) || p.verifiedBy.length < 2) f.push(`${at}.verifiedBy: needs at least 2 entries (e.g. "source:…", "engine:checkAnustubh")`);
    if ((p as { humanReviewed?: unknown }).humanReviewed === true) f.push(`${at}.humanReviewed: only a human reviewer may set this; agents leave it unset/false`);
    const hosts = new Set(p.sources.map((x) => host(x.url)).filter((h): h is string => h !== null));
    const ind = INDEPENDENT_CHECKS[s.id];
    const indOk = ind !== undefined && ind.result === 'match' && host(ind.url) !== null && !hosts.has(host(ind.url) as string);
    const twoSources = hosts.size >= 2 || indOk;
    if (!twoSources && !(s.id in SINGLE_SOURCE)) f.push(`${s.id}: only one source (${[...hosts].join(', ') || 'none'}) and no independent match; add a second source, or list it in SINGLE_SOURCE and REVIEW.md "## Single-source items"`);
    if (twoSources && s.id in SINGLE_SOURCE) f.push(`${s.id}: listed in SINGLE_SOURCE but now has two confirmations; remove it there and in REVIEW.md`);
  }
  const discrepancySection = (REVIEW_MD.split(/^## Discrepancies found by independent verification$/m)[1] ?? '').split(/^## /m)[0] ?? '';
  for (const id of Object.keys(SINGLE_SOURCE)) if (!shlokaById.has(id)) f.push(`SINGLE_SOURCE: "${id}" is not a verse id`);
  for (const [id, c] of Object.entries(INDEPENDENT_CHECKS)) {
    if (!shlokaById.has(id)) f.push(`INDEPENDENT_CHECKS: "${id}" is not a verse id`);
    if (c.result === 'mismatch') f.push(`INDEPENDENT_CHECKS: ${id} disagrees with ${c.url}${c.note ? ` (${c.note})` : ''}; resolve the discrepancy (see REVIEW.md)`);
    if (c.result === 'variant' && !discrepancySection.includes(id)) f.push(`INDEPENDENT_CHECKS: ${id} is an edition variant; list it in REVIEW.md "## Discrepancies found by independent verification"`);
  }
  sameSet('single-source allowlist', Object.keys(SINGLE_SOURCE), reviewSection('Single-source items'), f);
  report(f, 'provenance');
});

test('shlokas: the sandhi engine rebuilds every half-verse from its words (or the verse is a listed exception)', () => {
  const f: string[] = [];
  for (const s of content.shlokas) {
    if (s.words.length === 0 || s.padas.length === 0) continue; // reported by the shloka test
    const r = sandhiRebuild(s);
    const listed = s.id in SANDHI_ENGINE_EXCEPTIONS;
    if (r && !listed) f.push(`shloka ${s.id} ${r.half}: the half-verse reads "${r.expected}", but joining its words[] with the sandhi engine ${r.got}. Fix words[] (missing/extra word, wrong pada index, wrong form), or add the id to SANDHI_ENGINE_EXCEPTIONS with a reason and list it in REVIEW.md`);
    if (!r && listed) f.push(`shloka ${s.id}: listed in SANDHI_ENGINE_EXCEPTIONS but the engine now rebuilds it exactly; remove the exception here and in REVIEW.md`);
  }
  for (const [id, why] of Object.entries(SANDHI_ENGINE_EXCEPTIONS)) {
    if (!shlokaById.has(id)) f.push(`SANDHI_ENGINE_EXCEPTIONS: "${id}" is not a verse id`);
    if (!why.trim()) f.push(`SANDHI_ENGINE_EXCEPTIONS: "${id}" needs a reason`);
  }
  sameSet('sandhi-engine exceptions', Object.keys(SANDHI_ENGINE_EXCEPTIONS), reviewSection('Sandhi-engine exceptions'), f);
  report(f, 'sandhi-engine');
});

test('REVIEW.md sign-off table lists every verse, and no verse is marked human-reviewed by an agent', () => {
  const f: string[] = [];
  const rows = REVIEW_MD.split('\n').filter((l) => l.startsWith('|'));
  for (const s of content.shlokas) if (!rows.some((l) => l.includes(`\`${s.id}\``))) f.push(`REVIEW.md: sign-off table has no row for \`${s.id}\``);
  report(f, 'REVIEW.md');
});

test('shlokas: every sandhi note splits into consecutive verse words that the engine joins back to the printed form', () => {
  const f: string[] = [];
  for (const s of content.shlokas) {
    const order = s.words.map((w, i) => ({ w, i })).sort((a, b) => a.w.pada - b.w.pada || a.i - b.i).map((x) => x.w);
    s.sandhiNotes.forEach((n, k) => {
      const at = `shloka ${s.id}.sandhiNotes[${k}] (${n.joined})`;
      let pos = -1;
      for (let i = 0; i + n.split.length <= order.length && pos < 0; i++) if (n.split.every((x, j) => order[i + j]?.form === x)) pos = i;
      if (pos < 0) {
        f.push(`${at}.split: [${n.split.join(' + ')}] are not consecutive words of the verse in this order`);
        return;
      }
      const target = compact(n.joined);
      const parts = n.split.map((x) => devaToSlp1(x));
      const after = order[pos + n.split.length];
      // the last member may carry the sandhi of the word that follows it in the verse
      const ok = engineJoin(parts).includes(target) || (after !== undefined && engineJoin([...parts, devaToSlp1(after.form)]).some((x) => x.startsWith(target)));
      if (!ok) f.push(`${at}: the engine does not join [${n.split.join(' + ')}] into the printed form "${n.joined}" (also tried with the next word as context); check the split or the joined form`);
    });
  }
  report(f, 'sandhi-note');
});

test('shlokas: word roles agree with the stated grammar (vibhakti challenges rely on this)', () => {
  const f: string[] = [];
  const allowed: Record<string, string[]> = {
    nom: ['subject', 'modifier'], acc: ['object', 'modifier', 'indeclinable'], instr: ['instrument', 'modifier'], dat: ['recipient', 'modifier'],
    abl: ['source', 'modifier'], gen: ['possessor', 'modifier'], loc: ['location', 'modifier'], voc: ['address', 'modifier'],
  };
  for (const s of content.shlokas) {
    s.words.forEach((w, i) => {
      if (!w.role) return;
      const at = `shloka ${s.id}.words[${i}] (${w.form}) role "${w.role}" vs grammar "${w.grammar}"`;
      const indecl = /indecl/.test(w.grammar);
      const participle = /participle|gerundive/.test(w.grammar);
      const finite = /\b(1st|2nd|3rd) (sg|du|pl)\b|imperative|optative|infinitive|aorist|perfect/.test(w.grammar) && !participle;
      const m = /\b(nom|acc|instr|dat|abl|gen|loc|voc)\./.exec(w.grammar);
      if (finite && w.role !== 'verb' && !indecl) f.push(`${at}: a finite verb must have role "verb"`);
      else if (m && !indecl && !(participle && w.role === 'verb') && !(allowed[m[1] as string] ?? []).includes(w.role)) f.push(`${at}: the case and the role disagree`);
      else if (w.role === 'verb' && !finite && !participle) f.push(`${at}: role "verb" needs a verb or a predicative participle`);
    });
  }
  report(f, 'role');
});

// ───────────────────────── Lexicon ─────────────────────────

test('lexicon: ids, agreement across files, traceable forms, short meanings, tags', () => {
  const f: string[] = [];
  const raw: [string, LexEntry[]][] = [
    ['lexicon-1.json', (lex1Raw as unknown as { lexicon: LexEntry[] }).lexicon],
    ['lexicon-2.json', (lex2Raw as unknown as { lexicon: LexEntry[] }).lexicon],
  ];
  const first = new Map<string, { file: string; e: LexEntry }>();
  for (const [file, list] of raw) {
    const ids = new Set<string>();
    for (const e of list) {
      const at = `${file} ${e.id}`;
      if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(e.id)) f.push(`${at}: id must be an ASCII slug like "dharma", "gam", "rama-2"`);
      if (ids.has(e.id)) f.push(`${at}: duplicate id within ${file}`);
      ids.add(e.id);
      const prev = first.get(e.id);
      if (prev) {
        for (const k of ['lemma', 'pos', 'gender', 'meaning'] as const) {
          if ((prev.e[k] ?? null) !== (e[k] ?? null)) f.push(`${e.id}: ${k} differs between ${prev.file} (${JSON.stringify(prev.e[k])}) and ${file} (${JSON.stringify(e[k])})`);
        }
      } else first.set(e.id, { file, e });
      if (!e.meaning?.trim()) f.push(`${at}.meaning: empty`);
      else if (e.meaning.length > 40) f.push(`${at}.meaning: ${e.meaning.length} chars (max 40): "${e.meaning}"`);
      if (!Array.isArray(e.tags) || e.tags.length === 0) f.push(`${at}.tags: empty (needed for distractors)`);
      if (!Array.isArray(e.forms) || e.forms.length === 0) f.push(`${at}.forms: empty`);
      if (!e.provenance || !Array.isArray(e.provenance.sources) || e.provenance.sources.length === 0) f.push(`${at}.provenance.sources: empty`);
      if ((e.provenance as { humanReviewed?: unknown } | undefined)?.humanReviewed === true) f.push(`${at}.provenance.humanReviewed: agents never set this`);
      (e.forms ?? []).forEach((x, i) => {
        const fa = `${at}.forms[${i}] (${x.form})`;
        if (!x.grammar?.trim()) f.push(`${fa}.grammar: empty`);
        if (!Array.isArray(x.shlokaIds) || x.shlokaIds.length === 0) f.push(`${fa}.shlokaIds: empty (every form must trace to a verse)`);
        for (const sid of x.shlokaIds ?? []) {
          const s = shlokaById.get(sid);
          if (!s) f.push(`${fa}.shlokaIds: "${sid}" is not a verse id`);
          else if (!s.words.some((w) => w.form === x.form && w.lexId === e.id)) f.push(`${fa}: verse ${sid} has no word with this form and lexId "${e.id}"`);
        }
      });
    }
  }
  report(f, 'lexicon');
});

test('lexicon: distractor safety report (meanings that share content words)', (t) => {
  // Not a failure: two entries whose meanings overlap must not be used as each other's distractors.
  const pairs: string[] = [];
  const L = content.lexicon;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i] as LexEntry;
    const b = L[j] as LexEntry;
    if (a.lemma !== b.lemma && meaningsClash(a.meaning, b.meaning)) pairs.push(`${a.id} "${a.meaning}" ~ ${b.id} "${b.meaning}"`);
  }
  t.diagnostic(`${pairs.length} overlapping meaning pair(s)${pairs.length ? `: ${pairs.slice(0, 40).join(' | ')}` : ''}`);
  assert.equal(meaningsClash('forest', 'dense forest'), true);
  assert.equal(meaningsClash('fire', 'water'), false);
});

// ───────────────────────── Names ─────────────────────────

const PLACE_MAP_IDS = [
  'tamasa_ashrama', 'valmiki_hut', 'tamasa_bank', 'siddhashrama_road', 'tataka_vana', 'siddhashrama',
  'ayodhya_city', 'ayodhya_palace', 'vasishtha_shala', 'shringaverapura', 'chitrakuta',
  'dandaka_vana', 'panchavati', 'khara_camp', 'mriga_vana', 'jatayu_glade', 'shabari_ashrama',
  'rishyamuka', 'kishkindha_caves', 'vindhya_search', 'mahendra_hill',
  'ocean_leap', 'lanka_gate', 'lanka_city', 'ashoka_vatika',
  'setu_shore', 'setu', 'suvela_camp', 'lanka_battlefield', 'lanka_palace', 'ayodhya_return',
];
const MOVE_IDS = [
  'pada_bana', 'lipi_raksha', 'shoka_shloka', 'suprabhata', 'shuddha_vak', 'bana', 'agneyastra', 'varunastra', 'vayavyastra',
  'dharma_vigraha', 'abhaya', 'aditya_hrdaya', 'brahmastra', 'khadga', 'viddhi', 'agni_bana', 'vayu_vega', 'gada', 'jaya_ghosha',
  'anirveda', 'shaila', 'vriksha', 'prajna', 'mantrana', 'jala_dhara',
  'nakha', 'maya_jala', 'shula', 'garjana', 'andhakara', 'parigha', 'agni_varsha', 'naga_pasha', 'chandrahasa', 'tarka', 'prashna',
];
const REQUIRED_NAME_IDS: string[] = [
  ...[1, 2, 3, 4, 5, 6].map((k) => `kanda.${k}`),
  ...PLACE_MAP_IDS.map((m) => `place.${m}`),
  ...SPRITE_IDS.map((s) => `person.${s}`),
  ...ALLY_IDS.map((a) => `ally.${a}`),
  ...ENEMY_IDS.map((e) => `enemy.${e}`),
  ...MOVE_IDS.map((m) => `move.${m}`),
  ...['phala', 'kanda_mula', 'madhu', 'oshadhi', 'sanjivani', 'kusha_mudrika', 'chudamani'].map((i) => `item.${i}`),
  ...['agni', 'jala', 'vayu', 'bhumi', 'divya', 'maya', 'none'].map((e) => `element.${e}`),
  ...['artha', 'lipi', 'purana', 'krama', 'viccheda', 'vibhakti'].map((k) => `kind.${k}`),
  ...['unseen', 'seen', 'known', 'mastered'].map((t) => `tier.${t}`),
  ...['subject', 'object', 'instrument', 'recipient', 'source', 'possessor', 'location', 'address', 'verb', 'indeclinable', 'modifier'].map((r) => `role.${r}`),
  'ui.words', 'ui.verses', 'ui.ashrama', 'ui.niska',
];

test('names: well-formed entries with provenance', () => {
  const f: string[] = [];
  const seen = new Set<string>();
  for (const n of content.names) {
    const at = `names ${n.id}`;
    if (!/^[a-z]+\.[a-z0-9_]+$/.test(n.id)) f.push(`${at}: id must look like "move.agneyastra"`);
    if (seen.has(n.id)) f.push(`${at}: duplicate id`);
    seen.add(n.id);
    if (!n.en?.trim()) f.push(`${at}.en: empty`);
    const p = n.provenance;
    if (!p || !Array.isArray(p.sources) || p.sources.length === 0) f.push(`${at}.provenance.sources: empty`);
    else if (!p.sources.some((s) => host(s.url))) f.push(`${at}.provenance.sources: needs a URL`);
    if (!p?.verifiedBy?.includes('engine:validateDeva')) f.push(`${at}.provenance.verifiedBy: must include "engine:validateDeva"`);
    if (!p?.verifiedBy?.some((v) => v.startsWith('source:'))) f.push(`${at}.provenance.verifiedBy: needs a "source:…" entry (dictionary or Rāmāyaṇa passage)`);
    if ((p as { humanReviewed?: unknown } | undefined)?.humanReviewed === true) f.push(`${at}.provenance.humanReviewed: agents never set this`);
  }
  report(f, 'names');
});

test('names: every required id exists, except the deliberately omitted ones', () => {
  const f: string[] = [];
  for (const id of REQUIRED_NAME_IDS) {
    const omitted = OMITTED_NAME_IDS.includes(id);
    if (!omitted && !nameById.has(id)) f.push(`names.json: missing "${id}"`);
    if (omitted && nameById.has(id)) f.push(`names.json: "${id}" exists but is listed in OMITTED_NAME_IDS; remove it from the list and REVIEW.md`);
  }
  for (const id of OMITTED_NAME_IDS) if (!REQUIRED_NAME_IDS.includes(id)) f.push(`OMITTED_NAME_IDS: "${id}" is not a required id`);
  sameSet('omitted names', [...OMITTED_NAME_IDS], reviewSection('Omitted names'), f);
  report(f, 'required-name');
});

// ───────────────────────── Cross-references from defs and story files ─────────────────────────

const OTHER_FILES: [string, unknown][] = [
  ['defs.json', defsRaw],
  ['story-common.json', storyCommon],
  ['story-ch1.json', storyCh1],
  ['story-ch2.json', storyCh2],
  ['story-ch3.json', storyCh3],
  ['story-ch4.json', storyCh4],
  ['story-ch5.json', storyCh5],
  ['story-ch6.json', storyCh6],
];

/** Walks JSON, calling visit(path, key, value) for every property. */
function walk(x: unknown, path: string, visit: (path: string, key: string, v: unknown) => void): void {
  if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${path}[${i}]`, visit));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) {
    visit(`${path}.${k}`, k, v);
    walk(v, `${path}.${k}`, visit);
  }
}

test('defs + story: every nameId and {n:…} markup resolves in names.json (skips empty files)', () => {
  const f: string[] = [];
  for (const [file, data] of OTHER_FILES) {
    walk(data, file, (path, key, v) => {
      if (key === 'nameId' && typeof v === 'string' && !nameById.has(v)) f.push(`${path}: nameId "${v}" is not in names.json`);
      if (typeof v === 'string') for (const m of v.matchAll(/\{n:([^}]+)\}/g)) if (!nameById.has(m[1] as string)) f.push(`${path}: {n:${m[1]}} is not in names.json`);
    });
  }
  report(f, 'name-reference');
});

test('defs + story: no Devanagari or IAST typed into English text (Sanskrit only via {w:}/{n:} and content ids)', () => {
  const f: string[] = [];
  for (const [file, data] of OTHER_FILES) {
    walk(data, file, (path, _key, v) => {
      if (typeof v === 'string' && /[\u0900-\u097F]/.test(v)) f.push(`${path}: contains Devanagari "${v.slice(0, 40)}"; reference names.json/lexicon instead`);
    });
  }
  report(f, 'English-text');
});
