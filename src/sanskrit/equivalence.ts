/**
 * Spelling equivalence for answer checking.
 *
 * Sanskrit orthography allows two spellings of a nasal: anusvāra (ं) or the explicit nasal.
 * A learner who types फलं for फलम्, or गंगा for गङ्गा, has spelled the word correctly, so typed
 * answers must be compared by {@link spellingKey}, never by raw string equality.
 *
 * The key rewrites every anusvāra to the nasal it stands for:
 *  - before a stop (क…म) → that stop's class nasal + virāma   (गंगा → गङ्गा, संधि → सन्धि, पंच → पञ्च)
 *  - at the end of a word (before a space, daṇḍa or the end)  → म्   (फलं → फलम्, अहं गच्छामि → अहम् गच्छामि)
 *  - before य र ल व श ष स ह and vowels it is a true anusvāra and is kept (संस्कृतम्, संयोगः).
 * It never changes what is displayed — use it only to compare.
 */
import { normalizeDeva } from './translit';

const VIRAMA = '्';
const ANUSVARA = 'ं';
const CLASS_NASAL: readonly (readonly [string, string])[] = [
  ['कखगघङ', 'ङ'],
  ['चछजझञ', 'ञ'],
  ['टठडढण', 'ण'],
  ['तथदधन', 'न'],
  ['पफबभम', 'म'],
];

function nasalFor(next: string | undefined): string | null {
  if (next === undefined) return 'म';
  if (/[\s।॥,;.!?\-–—]/.test(next)) return 'म';
  for (const [stops, nasal] of CLASS_NASAL) if (stops.includes(next)) return nasal;
  return null;
}

/**
 * Canonical comparison key of a Devanagari string (see module doc).
 * @example spellingKey('फलं') === spellingKey('फलम्')        // true
 * @example spellingKey('गंगा') === spellingKey('गङ्गा')        // true
 * @example spellingKey('अहं गच्छामि') === spellingKey('अहम् गच्छामि') // true
 * @example spellingKey('संस्कृतम्')                            // 'संस्कृतम्' (true anusvāra kept)
 */
export function spellingKey(deva: string): string {
  const chars = [...normalizeDeva(deva)];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] as string;
    if (ch !== ANUSVARA) {
      out += ch;
      continue;
    }
    const nasal = nasalFor(chars[i + 1]);
    out += nasal === null ? ANUSVARA : nasal + VIRAMA;
  }
  return out;
}

/** True when two strings are the same Sanskrit spelling up to anusvāra / explicit-nasal convention. */
export function sameSpelling(a: string, b: string): boolean {
  return spellingKey(a) === spellingKey(b);
}
