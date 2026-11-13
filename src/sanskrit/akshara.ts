/**
 * Orthographic akṣara segmentation of Devanagari text.
 *
 * An akṣara is `(consonant + virāma)* consonant? + vowel + modifier?`, i.e. a
 * consonant cluster with its vowel sign (or the inherent `a`), or an
 * independent vowel, optionally followed by anusvāra / visarga / candrabindu.
 * A halanta consonant that is not followed by another consonant (word-final
 * `म्` in `रामम्`) belongs to the preceding akṣara, as does an avagraha.
 */
import { _deva } from './translit';

const AVAGRAHA = 'ऽ';

/** Parts of one akṣara, all in Devanagari. See {@link aksharaParts}. */
export interface AksharaParts {
  /** Onset consonants as bare letters, in order (`['क','ष']` for `क्ष…`). */
  consonants: string[];
  /** Nucleus as an independent vowel letter (`'अ'` for the inherent a). `'ॐ'` for the sacred syllable; `''` for a vowelless halanta fragment. */
  vowel: string;
  /** Trailing halanta consonants as bare letters (`['म']` for `मम्`). */
  finals: string[];
  /** Any of `'ं'`, `'ः'`, `'ँ'`, `'ऽ'`, in written order. */
  modifiers: string[];
}

interface Item {
  text: string;
  kind: 'akshara' | 'halanta' | 'sep';
}

function segment(deva: string): Item[] {
  const text = _deva.canonical(deva);
  const items: Item[] = [];
  const n = text.length;
  let i = 0;
  const readTail = (start: number): number => {
    let j = start;
    while (j < n && _deva.isMark(text.charAt(j))) j += 1;
    while (j < n && text.charAt(j) === AVAGRAHA) j += 1;
    return j;
  };
  while (i < n) {
    const ch = text.charAt(i);
    if (_deva.isConsonant(ch)) {
      let j = i + 1;
      while (j + 1 < n && text.charAt(j) === _deva.VIRAMA && _deva.isConsonant(text.charAt(j + 1))) j += 2;
      if (text.charAt(j) === _deva.VIRAMA) {
        // halanta cluster with no vowel: closes the preceding akṣara
        j += 1;
        const chunk = text.slice(i, j);
        const last = items[items.length - 1];
        if (last !== undefined && last.kind !== 'sep') last.text += chunk;
        else items.push({ text: chunk, kind: 'halanta' });
        i = j;
        continue;
      }
      if (j < n && _deva.isMatra(text.charAt(j))) j += 1;
      j = readTail(j);
      items.push({ text: text.slice(i, j), kind: 'akshara' });
      i = j;
      continue;
    }
    if (_deva.isIndependentVowel(ch) || ch === _deva.OM) {
      const j = readTail(i + 1);
      items.push({ text: text.slice(i, j), kind: 'akshara' });
      i = j;
      continue;
    }
    // separator: whitespace, punctuation, digits, a word-initial avagraha, or stray signs
    const last = items[items.length - 1];
    if (last !== undefined && last.kind === 'sep' && ch !== AVAGRAHA && last.text !== AVAGRAHA) last.text += ch;
    else items.push({ text: ch, kind: 'sep' });
    i += 1;
  }
  return items;
}

/**
 * Splits Devanagari text into orthographic akṣaras.
 *
 * - A word-final halanta consonant attaches to the preceding akṣara:
 *   `रामम्` → `['रा','मम्']`.
 * - An avagraha attaches to the preceding akṣara: `रामोऽपि` → `['रा','मोऽ','पि']`.
 *   (A word-initial avagraha after a space, as in `शिवो ऽहम्`, is treated as a
 *   separator.)
 * - `ॐ` is one akṣara.
 * - Spaces, punctuation, daṇḍas and digits are dropped unless
 *   `opts.keepSeparators` is true, in which case each run is returned as its
 *   own item.
 *
 * Input is NFC-normalised and stripped of ZWJ / ZWNJ / nukta first.
 *
 * @example
 * splitAksharas('धर्मक्षेत्रे')  // → ['ध','र्म','क्षे','त्रे']
 * splitAksharas('कार्त्स्न्यम्') // → ['का','र्त्स्न्यम्']
 * splitAksharas('तत् त्वम्', { keepSeparators: true }) // → ['तत्',' ','त्वम्']
 */
export function splitAksharas(deva: string, opts?: { keepSeparators?: boolean }): string[] {
  const keep = opts?.keepSeparators === true;
  const out: string[] = [];
  for (const item of segment(deva)) {
    if (item.kind === 'sep' && !keep) continue;
    out.push(item.text);
  }
  return out;
}

/**
 * Number of syllabic akṣaras (those containing a vowel) in Devanagari text.
 * Separators and vowelless halanta fragments are not counted.
 *
 * @example
 * countAksharas('कर्मण्येवाधिकारस्ते') // → 8
 * countAksharas('रामः गच्छति ।')       // → 5
 */
export function countAksharas(deva: string): number {
  let count = 0;
  for (const item of segment(deva)) if (item.kind === 'akshara') count += 1;
  return count;
}

/**
 * Decomposes ONE akṣara (as returned by {@link splitAksharas}) into its parts.
 * Throws a `RangeError` if the string is not a single well-formed akṣara.
 *
 * @example
 * aksharaParts('क्षे')  // → { consonants: ['क','ष'], vowel: 'ए', finals: [], modifiers: [] }
 * aksharaParts('मम्')  // → { consonants: ['म'], vowel: 'अ', finals: ['म'], modifiers: [] }
 * aksharaParts('मोऽ')  // → { consonants: ['म'], vowel: 'ओ', finals: [], modifiers: ['ऽ'] }
 * aksharaParts('अं')   // → { consonants: [], vowel: 'अ', finals: [], modifiers: ['ं'] }
 */
export function aksharaParts(akshara: string): AksharaParts {
  const text = _deva.canonical(akshara);
  const bad = (): never => {
    throw new RangeError(`not a single akṣara: ${JSON.stringify(akshara)}`);
  };
  const n = text.length;
  if (n === 0) bad();
  const parts: AksharaParts = { consonants: [], vowel: '', finals: [], modifiers: [] };
  let i = 0;
  const first = text.charAt(0);
  if (first === _deva.OM || _deva.isIndependentVowel(first)) {
    parts.vowel = first;
    i = 1;
  } else if (_deva.isConsonant(first)) {
    const run: string[] = [];
    let hasNucleus = false;
    while (i < n && _deva.isConsonant(text.charAt(i))) {
      run.push(text.charAt(i));
      i += 1;
      if (text.charAt(i) === _deva.VIRAMA) {
        i += 1;
        continue;
      }
      hasNucleus = true;
      break;
    }
    if (!hasNucleus) {
      // vowelless halanta fragment such as a lone 'म्'
      if (i !== n) bad();
      parts.finals = run;
      return parts;
    }
    parts.consonants = run;
    const next = text.charAt(i);
    if (i < n && _deva.isMatra(next)) {
      parts.vowel = _deva.matraToIndependent(next);
      i += 1;
    } else parts.vowel = 'अ';
  } else bad();
  while (i < n) {
    const ch = text.charAt(i);
    if (_deva.isMark(ch) || ch === AVAGRAHA) {
      parts.modifiers.push(ch);
      i += 1;
    } else if (_deva.isConsonant(ch) && text.charAt(i + 1) === _deva.VIRAMA) {
      parts.finals.push(ch);
      i += 2;
    } else bad();
  }
  return parts;
}

/**
 * Builds an akṣara from its parts — the inverse of {@link aksharaParts}.
 * Order written: onset cluster, vowel (sign), anusvāra / visarga /
 * candrabindu, halanta finals, avagraha.
 *
 * @example
 * composeAkshara({ consonants: ['त','र'], vowel: 'ए', finals: [], modifiers: [] }) // → 'त्रे'
 * composeAkshara({ consonants: ['म'], vowel: 'अ', finals: ['म'], modifiers: [] })  // → 'मम्'
 */
export function composeAkshara(parts: AksharaParts): string {
  let out = parts.consonants.join(_deva.VIRAMA);
  if (parts.consonants.length > 0) {
    if (parts.vowel === '') throw new RangeError('an akṣara with onset consonants needs a vowel');
    if (parts.vowel !== 'अ') {
      const matra = _deva.independentToMatra(parts.vowel);
      if (matra === undefined) throw new RangeError(`not a vowel: ${JSON.stringify(parts.vowel)}`);
      out += matra;
    }
  } else if (parts.vowel !== '') {
    if (parts.vowel !== _deva.OM && !_deva.isIndependentVowel(parts.vowel)) throw new RangeError(`not a vowel: ${JSON.stringify(parts.vowel)}`);
    out += parts.vowel;
  }
  for (const m of parts.modifiers) if (m !== AVAGRAHA) out += m;
  for (const c of parts.finals) out += c + _deva.VIRAMA;
  for (const m of parts.modifiers) if (m === AVAGRAHA) out += m;
  return out;
}
