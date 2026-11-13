/**
 * Transliteration between Devanagari, IAST, SLP1 and Harvard-Kyoto.
 *
 * SLP1 is the internal phonemic hub: every conversion goes `from → SLP1 → to`.
 * All conversions are lossless on well-formed Sanskrit input (see README for
 * the disambiguation conventions that make IAST and HK round-trip safe).
 */

export type Scheme = 'deva' | 'iast' | 'slp1' | 'hk';

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/** [slp1, independent vowel, vowel sign (mātrā), IAST, HK] */
const VOWEL_TABLE: readonly (readonly [string, string, string, string, string])[] = [
  ['a', 'अ', '', 'a', 'a'],
  ['A', 'आ', 'ा', 'ā', 'A'],
  ['i', 'इ', 'ि', 'i', 'i'],
  ['I', 'ई', 'ी', 'ī', 'I'],
  ['u', 'उ', 'ु', 'u', 'u'],
  ['U', 'ऊ', 'ू', 'ū', 'U'],
  ['f', 'ऋ', 'ृ', 'ṛ', 'R'],
  ['F', 'ॠ', 'ॄ', 'ṝ', 'RR'],
  ['x', 'ऌ', 'ॢ', 'ḷ', 'lR'],
  ['X', 'ॡ', 'ॣ', 'ḹ', 'lRR'],
  ['e', 'ए', 'े', 'e', 'e'],
  ['E', 'ऐ', 'ै', 'ai', 'ai'],
  ['o', 'ओ', 'ो', 'o', 'o'],
  ['O', 'औ', 'ौ', 'au', 'au'],
];

/** [slp1, Devanagari, IAST, HK] */
const CONSONANT_TABLE: readonly (readonly [string, string, string, string])[] = [
  ['k', 'क', 'k', 'k'],
  ['K', 'ख', 'kh', 'kh'],
  ['g', 'ग', 'g', 'g'],
  ['G', 'घ', 'gh', 'gh'],
  ['N', 'ङ', 'ṅ', 'G'],
  ['c', 'च', 'c', 'c'],
  ['C', 'छ', 'ch', 'ch'],
  ['j', 'ज', 'j', 'j'],
  ['J', 'झ', 'jh', 'jh'],
  ['Y', 'ञ', 'ñ', 'J'],
  ['w', 'ट', 'ṭ', 'T'],
  ['W', 'ठ', 'ṭh', 'Th'],
  ['q', 'ड', 'ḍ', 'D'],
  ['Q', 'ढ', 'ḍh', 'Dh'],
  ['R', 'ण', 'ṇ', 'N'],
  ['t', 'त', 't', 't'],
  ['T', 'थ', 'th', 'th'],
  ['d', 'द', 'd', 'd'],
  ['D', 'ध', 'dh', 'dh'],
  ['n', 'न', 'n', 'n'],
  ['p', 'प', 'p', 'p'],
  ['P', 'फ', 'ph', 'ph'],
  ['b', 'ब', 'b', 'b'],
  ['B', 'भ', 'bh', 'bh'],
  ['m', 'म', 'm', 'm'],
  ['y', 'य', 'y', 'y'],
  ['r', 'र', 'r', 'r'],
  ['l', 'ल', 'l', 'l'],
  ['v', 'व', 'v', 'v'],
  ['S', 'श', 'ś', 'z'],
  ['z', 'ष', 'ṣ', 'S'],
  ['s', 'स', 's', 's'],
  ['h', 'ह', 'h', 'h'],
  ['L', 'ळ', 'ḻ', 'L'],
];

/** [slp1, Devanagari, IAST, HK] — anusvāra, visarga, candrabindu, avagraha */
const MARK_TABLE: readonly (readonly [string, string, string, string])[] = [
  ['M', 'ं', 'ṃ', 'M'],
  ['H', 'ः', 'ḥ', 'H'],
  ['~', 'ँ', 'm\u0310', '~'],
  ["'", 'ऽ', "'", "'"],
];

const VIRAMA = '्';
const OM = 'ॐ';
const DANDA = '।';
const DOUBLE_DANDA = '॥';
const DEVA_DIGITS = '०१२३४५६७८९';

const SLP_VOWELS = new Set(VOWEL_TABLE.map((r) => r[0]));

const DEVA_INDEP_TO_SLP = new Map(VOWEL_TABLE.map((r) => [r[1], r[0]]));
const DEVA_MATRA_TO_SLP = new Map(VOWEL_TABLE.filter((r) => r[2] !== '').map((r) => [r[2], r[0]]));
const DEVA_CONS_TO_SLP = new Map(CONSONANT_TABLE.map((r) => [r[1], r[0]]));
const DEVA_MARK_TO_SLP = new Map(MARK_TABLE.map((r) => [r[1], r[0]]));

const SLP_TO_DEVA_INDEP = new Map(VOWEL_TABLE.map((r) => [r[0], r[1]]));
const SLP_TO_DEVA_MATRA = new Map(VOWEL_TABLE.map((r) => [r[0], r[2]]));
const SLP_TO_DEVA_CONS = new Map(CONSONANT_TABLE.map((r) => [r[0], r[1]]));
const SLP_TO_DEVA_MARK = new Map(MARK_TABLE.map((r) => [r[0], r[1]]));

const SLP_TO_IAST = new Map<string, string>([
  ...VOWEL_TABLE.map((r) => [r[0], r[3]] as [string, string]),
  ...CONSONANT_TABLE.map((r) => [r[0], r[2]] as [string, string]),
  ...MARK_TABLE.map((r) => [r[0], r[2]] as [string, string]),
]);
const SLP_TO_HK = new Map<string, string>([
  ...VOWEL_TABLE.map((r) => [r[0], r[4]] as [string, string]),
  ...CONSONANT_TABLE.map((r) => [r[0], r[3]] as [string, string]),
  ...MARK_TABLE.map((r) => [r[0], r[3]] as [string, string]),
]);

/** Unaspirated stops: followed by `h` they would be misread as aspirates in IAST / HK. */
const SLP_PLAIN_STOPS = new Set(['k', 'g', 'c', 'j', 'w', 'q', 't', 'd', 'p', 'b']);

function sortedTokens(pairs: [string, string][]): [string, string][] {
  return [...pairs].sort((a, b) => b[0].length - a[0].length);
}

/** IAST token → SLP1 (longest match first). Input is NFC + lower-cased before matching. */
const IAST_TOKENS: [string, string][] = sortedTokens([
  ...VOWEL_TABLE.map((r) => [r[3], r[0]] as [string, string]),
  ...CONSONANT_TABLE.map((r) => [r[2], r[0]] as [string, string]),
  ['ṃ', 'M'],
  ['ṁ', 'M'],
  ['ḥ', 'H'],
  ['m\u0310', '~'],
  ["'", "'"],
  ['\u2019', "'"],
  // hiatus-marking diaeresis (praüga, titaü)
  ['ï', 'i'],
  ['ü', 'u'],
  // ISO 15919 spellings accepted on input
  ['r\u0325\u0304', 'F'],
  ['r\u0325', 'f'],
  ['l\u0325\u0304', 'X'],
  ['l\u0325', 'x'],
  ['ē', 'e'],
  ['ō', 'o'],
]);

const HK_TOKENS: [string, string][] = sortedTokens([
  ...VOWEL_TABLE.map((r) => [r[4], r[0]] as [string, string]),
  ...CONSONANT_TABLE.map((r) => [r[3], r[0]] as [string, string]),
  ['M', 'M'],
  ['H', 'H'],
  ['~', '~'],
  ["'", "'"],
]);

// ---------------------------------------------------------------------------
// Devanagari normalisation / validation
// ---------------------------------------------------------------------------

/** NFC, no ZWJ/ZWNJ, nukta-free. Does not touch whitespace. */
function canonicalDeva(text: string): string {
  let s = text.normalize('NFC');
  if (/[\u200C\u200D\u093C\u0929\u0931\u0934\u0958-\u095F]/.test(s)) {
    s = s
      .replace(/[\u200C\u200D]/g, '')
      .normalize('NFD')
      .replace(/\u093C/g, '')
      .normalize('NFC');
  }
  return s;
}

/**
 * Normalises Devanagari text into the canonical form used across Samskuru:
 * Unicode NFC, ZWJ / ZWNJ removed, nukta removed (क़ → क, ड़ → ड, ऱ → र …),
 * a doubled single daṇḍa `।।` rewritten as `॥`, runs of whitespace collapsed to
 * one space, and leading / trailing whitespace trimmed.
 *
 * @example
 * normalizeDeva('  राम\u200Dः   गच्छति ।। ') // → 'रामः गच्छति ॥'
 * normalizeDeva('क़') // → 'क'
 */
export function normalizeDeva(text: string): string {
  return canonicalDeva(text)
    .replace(/।\s*।/g, DOUBLE_DANDA)
    .replace(/\s+/g, ' ')
    .trim();
}

type DevaClass = 'C' | 'V' | 'M' | 'H' | 'X' | 'A' | 'O' | 'S';

function devaClass(ch: string): DevaClass | undefined {
  if (DEVA_CONS_TO_SLP.has(ch)) return 'C';
  if (DEVA_INDEP_TO_SLP.has(ch)) return 'V';
  if (DEVA_MATRA_TO_SLP.has(ch)) return 'M';
  if (ch === VIRAMA) return 'H';
  if (ch === 'ं' || ch === 'ः' || ch === 'ँ') return 'X';
  if (ch === 'ऽ') return 'A';
  if (ch === OM) return 'O';
  if (ch === ' ' || ch === '\n' || ch === '-' || ch === DANDA || ch === DOUBLE_DANDA || DEVA_DIGITS.includes(ch)) return 'S';
  return undefined;
}

function codePointLabel(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0;
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

/**
 * Checks that a string is structurally well-formed Sanskrit in Devanagari.
 *
 * Allowed code points: the Sanskrit vowels (अ–औ, ॠ, ऌ, ॡ) and their signs, the
 * consonants क–ह and Vedic ळ, virāma, anusvāra, visarga, candrabindu, avagraha,
 * ॐ, daṇḍas (। ॥), Devanagari digits, the space, the newline, and the hyphen
 * (used to display split compounds). Anything else — Latin letters, ASCII
 * digits, ZWJ/ZWNJ, nukta letters, short ऎ / ऒ, etc. — is an error; run
 * {@link normalizeDeva} first. Extra punctuation can be whitelisted with
 * `opts.allowPunctuation`.
 *
 * Structural rules: a vowel sign or virāma must directly follow a consonant;
 * no two vowel signs in a row; no vowel sign or virāma after an independent
 * vowel; anusvāra / visarga / candrabindu must follow a vowel (at most one per
 * akṣara); a virāma must be followed by a consonant or a word break; an
 * avagraha must follow a vowel (or stand word-initially after a space, as in
 * `शिवो ऽहम्`). One phonotactic check is included because the error is so
 * common: a consonant + र् + ृ cluster (`श्रृ` for `शृ`) is rejected. The empty
 * string is reported as not ok.
 *
 * @example
 * validateDeva('धर्मक्षेत्रे कुरुक्षेत्रे').ok // → true
 * validateDeva('काि').errors // → ['index 2: vowel sign ि (U+093F) cannot follow a vowel sign']
 */
export function validateDeva(text: string, opts?: { allowPunctuation?: string }): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const extra = opts?.allowPunctuation ?? '';
  if (text.length === 0) return { ok: false, errors: ['empty string'] };
  if (text !== text.normalize('NFC')) errors.push('text is not in Unicode NFC');
  // state: what the previous code point was
  let prev: DevaClass | 'START' = 'START';
  let prevChar = '';
  let index = 0;
  for (const ch of text) {
    const at = `index ${index}`;
    index += ch.length;
    let cls = devaClass(ch);
    if (cls === undefined && extra.includes(ch)) cls = 'S';
    if (cls === undefined) {
      errors.push(`${at}: disallowed code point ${JSON.stringify(ch)} (${codePointLabel(ch)})`);
      prev = 'S';
      prevChar = ch;
      continue;
    }
    switch (cls) {
      case 'C':
      case 'V':
      case 'O':
        if (prev === 'H' && cls !== 'C') errors.push(`${at}: virāma must be followed by a consonant or a word break, not ${ch}`);
        break;
      case 'M':
        if (prev === 'M') errors.push(`${at}: vowel sign ${ch} (${codePointLabel(ch)}) cannot follow a vowel sign`);
        else if (prev === 'V' || prev === 'O') errors.push(`${at}: vowel sign ${ch} (${codePointLabel(ch)}) cannot follow an independent vowel`);
        else if (prev !== 'C') errors.push(`${at}: dangling vowel sign ${ch} (${codePointLabel(ch)}) without a consonant`);
        break;
      case 'H':
        if (prev !== 'C') errors.push(`${at}: dangling virāma (must directly follow a consonant)`);
        break;
      case 'X':
        if (prev === 'X') errors.push(`${at}: more than one of anusvāra / visarga / candrabindu on the same akṣara`);
        else if (prev !== 'C' && prev !== 'V' && prev !== 'M') errors.push(`${at}: ${ch} (${codePointLabel(ch)}) must follow a vowel`);
        break;
      case 'A':
        if (prev === 'START') errors.push(`${at}: avagraha at the start of the text`);
        else if (prev === 'H') errors.push(`${at}: avagraha cannot follow a virāma`);
        else if (prev === 'X') errors.push(`${at}: avagraha cannot follow anusvāra / visarga / candrabindu`);
        else if (prev === 'S' && !/\s/.test(prevChar)) errors.push(`${at}: avagraha must follow a vowel`);
        break;
      case 'S':
        break;
    }
    prev = cls;
    prevChar = ch;
  }
  // phonotactics: consonant + r + vocalic ṛ never occurs (श्रृ is a frequent misspelling of शृ)
  const rri = /[क-हळ]्र[ृॄ]/.exec(text);
  if (rri !== null) errors.push(`index ${rri.index}: impossible cluster ${rri[0]} (consonant + र् + ऋ); write the consonant with ृ directly, e.g. शृ not श्रृ`);
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Devanagari ⇄ SLP1
// ---------------------------------------------------------------------------

/**
 * Devanagari → SLP1. Non-letters pass through, except that Devanagari digits
 * become ASCII digits and `।` / `॥` become `|` / `||`. `ॐ` is kept as the
 * symbol `ॐ` (it is a sign, not a spelling; this keeps round trips lossless).
 * Input is NFC-normalised and stripped of ZWJ/ZWNJ/nukta first; whitespace is
 * preserved exactly.
 *
 * @example
 * devaToSlp1('धर्मक्षेत्रे') // → 'Darmakzetre'
 * devaToSlp1('रामोऽपि ।')    // → "rAmo'pi |"
 */
export function devaToSlp1(s: string): string {
  const text = canonicalDeva(s);
  let out = '';
  const n = text.length;
  let i = 0;
  while (i < n) {
    const ch = text.charAt(i);
    const cons = DEVA_CONS_TO_SLP.get(ch);
    if (cons !== undefined) {
      out += cons;
      const next = text.charAt(i + 1);
      if (next === VIRAMA) {
        i += 2;
        continue;
      }
      const matra = next === '' ? undefined : DEVA_MATRA_TO_SLP.get(next);
      if (matra !== undefined) {
        out += matra;
        i += 2;
        continue;
      }
      out += 'a';
      i += 1;
      continue;
    }
    const vowel = DEVA_INDEP_TO_SLP.get(ch);
    if (vowel !== undefined) {
      out += vowel;
      i += 1;
      continue;
    }
    const mark = DEVA_MARK_TO_SLP.get(ch);
    if (mark !== undefined) {
      out += mark;
      i += 1;
      continue;
    }
    if (ch === DANDA) out += '|';
    else if (ch === DOUBLE_DANDA) out += '||';
    else {
      const d = DEVA_DIGITS.indexOf(ch);
      out += d >= 0 ? String(d) : ch;
    }
    i += 1;
  }
  return out;
}

/**
 * SLP1 → Devanagari. A consonant not followed by a vowel gets a virāma
 * (so word-final consonants come out halanta). ASCII digits become Devanagari
 * digits, `|` → `।`, `||` → `॥`; everything else passes through.
 *
 * @example
 * slp1ToDeva('kArtsnyam')  // → 'कार्त्स्न्यम्'
 * slp1ToDeva("so'ham 108") // → 'सोऽहम् १०८'
 */
export function slp1ToDeva(s: string): string {
  let out = '';
  let pending = false; // a consonant has been written and still awaits its vowel
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const ch = s.charAt(i);
    const cons = SLP_TO_DEVA_CONS.get(ch);
    if (cons !== undefined) {
      if (pending) out += VIRAMA;
      out += cons;
      pending = true;
      continue;
    }
    if (SLP_VOWELS.has(ch)) {
      out += pending ? (SLP_TO_DEVA_MATRA.get(ch) ?? '') : (SLP_TO_DEVA_INDEP.get(ch) ?? '');
      pending = false;
      continue;
    }
    if (pending) {
      out += VIRAMA;
      pending = false;
    }
    const mark = SLP_TO_DEVA_MARK.get(ch);
    if (mark !== undefined) {
      out += mark;
    } else if (ch === '|') {
      if (s.charAt(i + 1) === '|') {
        out += DOUBLE_DANDA;
        i += 1;
      } else out += DANDA;
    } else if (ch >= '0' && ch <= '9') {
      out += DEVA_DIGITS.charAt(ch.charCodeAt(0) - 48);
    } else out += ch;
  }
  if (pending) out += VIRAMA;
  return out;
}

// ---------------------------------------------------------------------------
// SLP1 ⇄ IAST / HK
// ---------------------------------------------------------------------------

/**
 * SLP1 → IAST (NFC, standard diacritics: ā ī ū ṛ ṝ ḷ ḹ ṅ ñ ṭ ḍ ṇ ś ṣ ṃ ḥ;
 * candrabindu is `m̐`, ळ is `ḻ`, avagraha is `'`).
 *
 * Disambiguation (keeps IAST lossless): a genuine hiatus `a`+`i` / `a`+`u`
 * is written with a diaeresis (`praüga`), and an unaspirated stop followed by
 * `h` is written with the ISO 15919 colon (`k:h`), so that plain `ai`, `au`,
 * `kh` … always mean the diphthongs / aspirates.
 *
 * @example
 * slp1ToIast('kfzRaH')  // → 'kṛṣṇaḥ'
 * slp1ToIast('prauga')  // → 'praüga'
 * slp1ToIast('prOQa')   // → 'prauḍha'
 */
export function slp1ToIast(s: string): string {
  let out = '';
  let prev = '';
  for (const ch of s) {
    const mapped = SLP_TO_IAST.get(ch);
    if (mapped === undefined) {
      out += ch;
    } else if (prev === 'a' && ch === 'i') {
      out += 'ï';
    } else if (prev === 'a' && ch === 'u') {
      out += 'ü';
    } else if (ch === 'h' && SLP_PLAIN_STOPS.has(prev)) {
      out += ':h';
    } else {
      out += mapped;
    }
    prev = ch;
  }
  return out.normalize('NFC');
}

function latinToSlp1(text: string, tokens: readonly [string, string][]): string {
  let out = '';
  let i = 0;
  const n = text.length;
  let prev = '';
  outer: while (i < n) {
    // disambiguating colon: a:i, a:u, k:h (and HK l:R, R:R)
    if (text.charAt(i) === ':' && prev !== '' && i + 1 < n) {
      const next = text.charAt(i + 1);
      const hiatus = prev === 'a' && (next === 'i' || next === 'u');
      const stopH = SLP_PLAIN_STOPS.has(prev) && next === 'h';
      const hkVocalic = (prev === 'l' || prev === 'f' || prev === 'x') && next === 'R';
      if (hiatus || stopH || hkVocalic) {
        // the colon only breaks the digraph; drop it and read on
        i += 1;
        prev = '';
        continue;
      }
    }
    for (const [tok, slp] of tokens) {
      if (text.startsWith(tok, i)) {
        out += slp;
        prev = slp;
        i += tok.length;
        continue outer;
      }
    }
    const ch = text.charAt(i);
    out += ch;
    prev = '';
    i += 1;
  }
  return out;
}

/**
 * IAST → SLP1. Input is NFC-normalised and lower-cased first (IAST has no
 * case distinction; `Rāma` = `rāma`). Accepts both `ṃ` and `ṁ` for anusvāra,
 * `'` or `’` for avagraha, `m̐` for candrabindu, and the ISO 15919 spellings
 * `r̥ r̥̄ l̥ l̥̄ ē ō`.
 *
 * Convention: `ai` and `au` are ALWAYS the diphthongs ऐ / औ, and a stop + `h`
 * is ALWAYS the aspirate. A real hiatus is written `aï` / `aü` (or `a:i` /
 * `a:u`); a real stop + ह is written `k:h`.
 *
 * @example
 * iastToSlp1('saṃskṛtam') // → 'saMskftam'
 * iastToSlp1('saṁskṛtam') // → 'saMskftam'
 * iastToSlp1('praüga')    // → 'prauga'
 */
export function iastToSlp1(s: string): string {
  // lower-case BEFORE NFC so that capitals with combining marks behave
  return latinToSlp1(s.normalize('NFC').toLowerCase().normalize('NFC'), IAST_TOKENS);
}

/** SLP1 → Harvard-Kyoto, with `:` inserted where HK would otherwise be ambiguous. */
function slp1ToHk(s: string): string {
  let out = '';
  let prev = '';
  for (const ch of s) {
    const mapped = SLP_TO_HK.get(ch);
    if (mapped === undefined) {
      out += ch;
    } else {
      const hiatus = prev === 'a' && (ch === 'i' || ch === 'u');
      const stopH = ch === 'h' && SLP_PLAIN_STOPS.has(prev);
      const vocalic = (ch === 'f' || ch === 'F') && (prev === 'l' || prev === 'f' || prev === 'x');
      out += hiatus || stopH || vocalic ? `:${mapped}` : mapped;
    }
    prev = ch;
  }
  return out;
}

function hkToSlp1(s: string): string {
  return latinToSlp1(s, HK_TOKENS);
}

/**
 * Devanagari → IAST.
 * @example devaToIast('संस्कृतम्') // → 'saṃskṛtam'
 */
export function devaToIast(s: string): string {
  return slp1ToIast(devaToSlp1(s));
}

/**
 * IAST → Devanagari.
 * @example iastToDeva('kṛṣṇaḥ') // → 'कृष्णः'
 */
export function iastToDeva(s: string): string {
  return slp1ToDeva(iastToSlp1(s));
}

function toSlp1(text: string, from: Scheme): string {
  switch (from) {
    case 'deva':
      return devaToSlp1(text);
    case 'iast':
      return iastToSlp1(text);
    case 'hk':
      return hkToSlp1(text);
    case 'slp1':
      return text;
  }
}

function fromSlp1(text: string, to: Scheme): string {
  switch (to) {
    case 'deva':
      return slp1ToDeva(text);
    case 'iast':
      return slp1ToIast(text);
    case 'hk':
      return slp1ToHk(text);
    case 'slp1':
      return text;
  }
}

/**
 * Converts text between any two supported schemes (via SLP1).
 * Spaces and punctuation pass through; daṇḍas and digits are mapped
 * (`।` ⇄ `|`, `॥` ⇄ `||`, `०-९` ⇄ `0-9`). When `from === to` the text is
 * returned unchanged.
 *
 * @example
 * transliterate('योगः', 'deva', 'iast') // → 'yogaḥ'
 * transliterate('kRSNa', 'hk', 'deva')  // → 'कृष्ण'
 */
export function transliterate(text: string, from: Scheme, to: Scheme): string {
  if (from === to) return text;
  return fromSlp1(toSlp1(text, from), to);
}

// ---------------------------------------------------------------------------
// Scheme detection
// ---------------------------------------------------------------------------

/**
 * Best-effort guess of the scheme a string is written in.
 *
 * - any Devanagari letter → `'deva'`
 * - spellings that no scholarly scheme produces (`sh`, `aa`, `ee`, `oo`, `ṛi` …
 *   as in `krishna`, `raama`, `dhṛitarāśhtra`) → `'unknown'` (informal romanisation)
 * - any IAST diacritic → `'iast'`
 * - a letter that only SLP1 uses (`f F x X E O w W q Q Y K C P B`) → `'slp1'`
 * - Harvard-Kyoto capitals / `z`, together with HK-only spellings (aspirate
 *   digraphs, `ai`, `au`, vocalic `R` between consonants) → `'hk'`
 * - plain lower-case ASCII (`dharma`, `deva`) → `'iast'` (it reads the same in
 *   IAST and HK)
 * - other ASCII with capitals that reads identically in SLP1 and HK (`rAmaH`)
 *   → `'slp1'`
 * - no letters at all → `'unknown'`
 *
 * This is a heuristic for convenience (e.g. accepting typed answers); content
 * pipelines should always state their scheme explicitly.
 *
 * @example
 * detectScheme('रामः')    // → 'deva'
 * detectScheme('kṛṣṇa')   // → 'iast'
 * detectScheme('kfzRa')   // → 'slp1'
 * detectScheme('kRSNa')   // → 'hk'
 */
export function detectScheme(text: string): Scheme | 'unknown' {
  if (/[ऄ-हा-ौॐॠ-ॣ]/.test(text)) return 'deva';
  const nfc = text.normalize('NFC');
  if (/sh|[śṣ]h|aa|ee|ii|oo|uu|[ṛṝ]i/i.test(nfc)) return 'unknown';
  if (/[āīūṛṝḷḹṅñṭḍṇśṣṃṁḥḻĀĪŪṚṜḶḸṄÑṬḌṆŚṢṂṀḤ]|m\u0310|[rl]\u0325/.test(nfc)) return 'iast';
  if (!/[A-Za-z]/.test(nfc)) return 'unknown';
  if (/[fFxXEOwWqQYKCPB]/.test(nfc)) return 'slp1';
  const hasUpper = /[A-Z]/.test(nfc);
  const hkSpelling =
    /[kgcjTDtdpb]h|a[iu]|RR|lR/.test(nfc) || /[kgcjtdnpbmyrlvszhGJTDNS]R(?![aAiIuUeo])/.test(nfc) || /^R[^aAiIuUeo]/.test(nfc);
  if (hkSpelling) return hasUpper || nfc.includes('z') ? 'hk' : 'iast';
  if (!hasUpper && !nfc.includes('z')) return 'iast';
  return 'slp1';
}

// ---------------------------------------------------------------------------
// Digits
// ---------------------------------------------------------------------------

/**
 * Renders a number (or a numeric string) with Devanagari digits. Only the
 * ASCII digits are replaced; signs, decimal points and separators are kept.
 *
 * @example
 * toDevaDigits(108)    // → '१०८'
 * toDevaDigits('2.47') // → '२.४७'
 */
export function toDevaDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => DEVA_DIGITS.charAt(d.charCodeAt(0) - 48));
}

/**
 * Parses a number written with Devanagari (or ASCII) digits. Returns `NaN`
 * when the string is not a plain number.
 *
 * @example
 * fromDevaDigits('१०८') // → 108
 * fromDevaDigits('२.५') // → 2.5
 */
export function fromDevaDigits(s: string): number {
  const ascii = s.trim().replace(/[०-९]/g, (d) => String(DEVA_DIGITS.indexOf(d)));
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(ascii)) return NaN;
  return Number(ascii);
}

// ---------------------------------------------------------------------------
// Internal helpers shared with the other modules (not part of the public API)
// ---------------------------------------------------------------------------

/** @internal — Devanagari character classes shared with akshara.ts; not re-exported from index.ts. */
export const _deva = {
  VIRAMA,
  OM,
  canonical: canonicalDeva,
  isConsonant: (ch: string): boolean => DEVA_CONS_TO_SLP.has(ch),
  isIndependentVowel: (ch: string): boolean => DEVA_INDEP_TO_SLP.has(ch),
  isMatra: (ch: string): boolean => DEVA_MATRA_TO_SLP.has(ch),
  isMark: (ch: string): boolean => ch === 'ं' || ch === 'ः' || ch === 'ँ',
  matraToIndependent: (matra: string): string => SLP_TO_DEVA_INDEP.get(DEVA_MATRA_TO_SLP.get(matra) ?? '') ?? '',
  independentToMatra: (vowel: string): string | undefined => {
    const slp = DEVA_INDEP_TO_SLP.get(vowel);
    return slp === undefined ? undefined : SLP_TO_DEVA_MATRA.get(slp);
  },
};
