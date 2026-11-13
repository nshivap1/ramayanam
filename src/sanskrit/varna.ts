/**
 * The Sanskrit sound inventory (varṇamālā), places of articulation,
 * the Māheśvara-sūtras and pratyāhāras, and savarṇa (homogeneity) tests.
 * All sounds are identified by their SLP1 letter.
 */

export type Sthana = 'kantha' | 'talu' | 'murdha' | 'danta' | 'oshtha' | 'nasika' | 'kanthatalu' | 'kanthoshtha' | 'dantoshtha';

export interface Varna {
  slp1: string;
  deva: string;
  iast: string;
  kind: 'svara' | 'vyanjana' | 'ayogavaha';
  /** Vowels only. e ai o au are dīrgha (they have no short form). */
  length?: 'hrasva' | 'dirgha';
  /** Place(s) of articulation. Nasal stops list their varga place and `nasika`. */
  sthana: Sthana[];
  /** The five stop classes, named by their first member in SLP1 (`wa` = ṭa-varga). */
  varga?: 'ka' | 'ca' | 'wa' | 'ta' | 'pa';
  /** Consonants only: sparśa (stop / nasal), antaḥstha (semivowel), ūṣman (sibilant, h). */
  cls?: 'sparsha' | 'antahstha' | 'ushman';
  /** Consonants only: voiced (ghoṣa) or not (aghoṣa). */
  ghosha?: boolean;
  /** Consonants only: aspirated (mahāprāṇa) or not (alpaprāṇa). The ūṣmans count as mahāprāṇa. */
  mahaprana?: boolean;
  /** Consonants only: true for the five nasal stops. */
  nasal?: boolean;
}

function svara(slp1: string, deva: string, iast: string, length: 'hrasva' | 'dirgha', sthana: Sthana): Varna {
  return { slp1, deva, iast, kind: 'svara', length, sthana: [sthana] };
}

const VARGA_STHANA: Record<'ka' | 'ca' | 'wa' | 'ta' | 'pa', Sthana> = { ka: 'kantha', ca: 'talu', wa: 'murdha', ta: 'danta', pa: 'oshtha' };

function sparsha(slp1: string, deva: string, iast: string, varga: 'ka' | 'ca' | 'wa' | 'ta' | 'pa', column: 1 | 2 | 3 | 4 | 5): Varna {
  const nasal = column === 5;
  return {
    slp1,
    deva,
    iast,
    kind: 'vyanjana',
    sthana: nasal ? [VARGA_STHANA[varga], 'nasika'] : [VARGA_STHANA[varga]],
    varga,
    cls: 'sparsha',
    ghosha: column >= 3,
    mahaprana: column === 2 || column === 4,
    nasal,
  };
}

function antahstha(slp1: string, deva: string, iast: string, sthana: Sthana): Varna {
  return { slp1, deva, iast, kind: 'vyanjana', sthana: [sthana], cls: 'antahstha', ghosha: true, mahaprana: false, nasal: false };
}

function ushman(slp1: string, deva: string, iast: string, sthana: Sthana, ghosha: boolean): Varna {
  return { slp1, deva, iast, kind: 'vyanjana', sthana: [sthana], cls: 'ushman', ghosha, mahaprana: true, nasal: false };
}

/**
 * The varṇamālā in traditional order: 13 svaras, anusvāra and visarga, the 25
 * sparśas, 4 antaḥsthas and 4 ūṣmans (48 entries).
 *
 * Places of articulation follow the Pāṇinīya-śikṣā / Siddhānta-kaumudī
 * statements (अकुहविसर्जनीयानां कण्ठः । इचुयशानां तालु । ऋटुरषाणां मूर्धा ।
 * ऌतुलसानां दन्ताः । उपूपध्मानीयानामोष्ठौ । ञमङणनानां नासिका च । एदैतोः कण्ठतालु ।
 * ओदौतोः कण्ठोष्ठम् । वकारस्य दन्तोष्ठम् । नासिकानुस्वारस्य ।).
 *
 * Deliberately not listed (they are still handled by transliteration): the
 * theoretical long ॡ, candrabindu, avagraha, Vedic ळ, jihvāmūlīya and
 * upadhmānīya. `ghosha` / `mahaprana` are given for consonants only.
 */
export const VARNAS: readonly Varna[] = [
  svara('a', 'अ', 'a', 'hrasva', 'kantha'),
  svara('A', 'आ', 'ā', 'dirgha', 'kantha'),
  svara('i', 'इ', 'i', 'hrasva', 'talu'),
  svara('I', 'ई', 'ī', 'dirgha', 'talu'),
  svara('u', 'उ', 'u', 'hrasva', 'oshtha'),
  svara('U', 'ऊ', 'ū', 'dirgha', 'oshtha'),
  svara('f', 'ऋ', 'ṛ', 'hrasva', 'murdha'),
  svara('F', 'ॠ', 'ṝ', 'dirgha', 'murdha'),
  svara('x', 'ऌ', 'ḷ', 'hrasva', 'danta'),
  svara('e', 'ए', 'e', 'dirgha', 'kanthatalu'),
  svara('E', 'ऐ', 'ai', 'dirgha', 'kanthatalu'),
  svara('o', 'ओ', 'o', 'dirgha', 'kanthoshtha'),
  svara('O', 'औ', 'au', 'dirgha', 'kanthoshtha'),
  { slp1: 'M', deva: 'ं', iast: 'ṃ', kind: 'ayogavaha', sthana: ['nasika'] },
  { slp1: 'H', deva: 'ः', iast: 'ḥ', kind: 'ayogavaha', sthana: ['kantha'] },
  sparsha('k', 'क', 'k', 'ka', 1),
  sparsha('K', 'ख', 'kh', 'ka', 2),
  sparsha('g', 'ग', 'g', 'ka', 3),
  sparsha('G', 'घ', 'gh', 'ka', 4),
  sparsha('N', 'ङ', 'ṅ', 'ka', 5),
  sparsha('c', 'च', 'c', 'ca', 1),
  sparsha('C', 'छ', 'ch', 'ca', 2),
  sparsha('j', 'ज', 'j', 'ca', 3),
  sparsha('J', 'झ', 'jh', 'ca', 4),
  sparsha('Y', 'ञ', 'ñ', 'ca', 5),
  sparsha('w', 'ट', 'ṭ', 'wa', 1),
  sparsha('W', 'ठ', 'ṭh', 'wa', 2),
  sparsha('q', 'ड', 'ḍ', 'wa', 3),
  sparsha('Q', 'ढ', 'ḍh', 'wa', 4),
  sparsha('R', 'ण', 'ṇ', 'wa', 5),
  sparsha('t', 'त', 't', 'ta', 1),
  sparsha('T', 'थ', 'th', 'ta', 2),
  sparsha('d', 'द', 'd', 'ta', 3),
  sparsha('D', 'ध', 'dh', 'ta', 4),
  sparsha('n', 'न', 'n', 'ta', 5),
  sparsha('p', 'प', 'p', 'pa', 1),
  sparsha('P', 'फ', 'ph', 'pa', 2),
  sparsha('b', 'ब', 'b', 'pa', 3),
  sparsha('B', 'भ', 'bh', 'pa', 4),
  sparsha('m', 'म', 'm', 'pa', 5),
  antahstha('y', 'य', 'y', 'talu'),
  antahstha('r', 'र', 'r', 'murdha'),
  antahstha('l', 'ल', 'l', 'danta'),
  antahstha('v', 'व', 'v', 'dantoshtha'),
  ushman('S', 'श', 'ś', 'talu', false),
  ushman('z', 'ष', 'ṣ', 'murdha', false),
  ushman('s', 'स', 's', 'danta', false),
  ushman('h', 'ह', 'h', 'kantha', true),
];

const VARNA_BY_SLP1 = new Map(VARNAS.map((v) => [v.slp1, v]));

/**
 * Looks up a sound by its SLP1 letter. Returns `undefined` for anything that
 * is not in {@link VARNAS} (including `X` ॡ, `~`, `'`, `L`).
 *
 * @example
 * varna('k')?.sthana    // → ['kantha']
 * varna('N')?.sthana    // → ['kantha', 'nasika']
 * varna('B')?.mahaprana // → true
 */
export function varna(slp1Char: string): Varna | undefined {
  return VARNA_BY_SLP1.get(slp1Char);
}

const VOWEL_CHARS = 'aAiIuUfFxXeEoO';
const CONSONANT_CHARS = 'kKgGNcCjJYwWqQRtTdDnpPbBmyrlvSzshL';

/**
 * True for the 14 SLP1 vowel letters `a A i I u U f F x X e E o O`.
 * @example isVowel('f') // → true (ऋ)
 */
export function isVowel(slp1Char: string): boolean {
  return slp1Char.length === 1 && VOWEL_CHARS.includes(slp1Char);
}

/**
 * True for the SLP1 consonant letters (the 33 classical consonants and `L` ळ).
 * Anusvāra `M`, visarga `H` and candrabindu `~` are neither vowels nor consonants here.
 * @example isConsonant('z') // → true (ष)
 */
export function isConsonant(slp1Char: string): boolean {
  return slp1Char.length === 1 && CONSONANT_CHARS.includes(slp1Char);
}

/** Names of the places of articulation (nominative forms as used in the śikṣā statements). */
export const STHANA_NAMES: Record<Sthana, { sa: string; iast: string; en: string }> = {
  kantha: { sa: 'कण्ठः', iast: 'kaṇṭhaḥ', en: 'throat (guttural / velar)' },
  talu: { sa: 'तालु', iast: 'tālu', en: 'palate (palatal)' },
  murdha: { sa: 'मूर्धा', iast: 'mūrdhā', en: 'roof of the mouth (retroflex / cerebral)' },
  danta: { sa: 'दन्ताः', iast: 'dantāḥ', en: 'teeth (dental)' },
  oshtha: { sa: 'ओष्ठौ', iast: 'oṣṭhau', en: 'lips (labial)' },
  nasika: { sa: 'नासिका', iast: 'nāsikā', en: 'nose (nasal)' },
  kanthatalu: { sa: 'कण्ठतालु', iast: 'kaṇṭhatālu', en: 'throat and palate' },
  kanthoshtha: { sa: 'कण्ठोष्ठम्', iast: 'kaṇṭhoṣṭham', en: 'throat and lips' },
  dantoshtha: { sa: 'दन्तोष्ठम्', iast: 'dantoṣṭham', en: 'teeth and lips (labio-dental)' },
};

/**
 * The 14 Māheśvara-sūtras (Śiva-sūtras). `sounds` are SLP1 letters without the
 * purely enunciative `a`; `it` is the final marker consonant in SLP1.
 * Note that `h` occurs twice (sūtras 5 and 14) and the marker `R` (ण्) twice
 * (sūtras 1 and 6).
 */
export const SHIVA_SUTRAS: readonly { n: number; sounds: string[]; it: string; deva: string }[] = [
  { n: 1, sounds: ['a', 'i', 'u'], it: 'R', deva: 'अइउण्' },
  { n: 2, sounds: ['f', 'x'], it: 'k', deva: 'ऋऌक्' },
  { n: 3, sounds: ['e', 'o'], it: 'N', deva: 'एओङ्' },
  { n: 4, sounds: ['E', 'O'], it: 'c', deva: 'ऐऔच्' },
  { n: 5, sounds: ['h', 'y', 'v', 'r'], it: 'w', deva: 'हयवरट्' },
  { n: 6, sounds: ['l'], it: 'R', deva: 'लण्' },
  { n: 7, sounds: ['Y', 'm', 'N', 'R', 'n'], it: 'm', deva: 'ञमङणनम्' },
  { n: 8, sounds: ['J', 'B'], it: 'Y', deva: 'झभञ्' },
  { n: 9, sounds: ['G', 'Q', 'D'], it: 'z', deva: 'घढधष्' },
  { n: 10, sounds: ['j', 'b', 'g', 'q', 'd'], it: 'S', deva: 'जबगडदश्' },
  { n: 11, sounds: ['K', 'P', 'C', 'W', 'T', 'c', 'w', 't'], it: 'v', deva: 'खफछठथचटतव्' },
  { n: 12, sounds: ['k', 'p'], it: 'y', deva: 'कपय्' },
  { n: 13, sounds: ['S', 'z', 's'], it: 'r', deva: 'शषसर्' },
  { n: 14, sounds: ['h'], it: 'l', deva: 'हल्' },
];

/**
 * The pratyāhāras actually used in the grammatical tradition (41 from the
 * Aṣṭādhyāyī, plus `Yam`, `cay` and `ra` from the Uṇādi-sūtras and vārttikas
 * — `ra` is not formed mechanically and is therefore not listed here), as
 * SLP1 names. `aR` is listed once; see {@link pratyahara} for its two readings.
 */
export const PRATYAHARA_NAMES: readonly string[] = [
  'aR', 'ak', 'ac', 'aw', 'am', 'aS', 'al',
  'ik', 'ic', 'iR', 'uk', 'eN', 'ec', 'Ec',
  'haS', 'hal', 'yaR', 'yam', 'yaY', 'yay', 'yar',
  'vaS', 'val', 'ral', 'may', 'Nam',
  'Jaz', 'JaS', 'Jay', 'Jar', 'Jal', 'Baz',
  'jaS', 'baS', 'Kay', 'Kar', 'Cav', 'cay', 'car', 'Sar', 'Sal', 'Yam',
];

const LONG_OF: Record<string, string> = { a: 'A', i: 'I', u: 'U', f: 'F' };

/**
 * Expands a pratyāhāra name (SLP1: first sound + optional enunciative `a` +
 * marker, e.g. `'ac'`, `'hal'`, `'yaR'`, `'JaS'`) into its sounds, in
 * Śiva-sūtra order, by the rule आदिरन्त्येन सहेता (1.1.71).
 *
 * - Vowels are returned as the short class representatives (`a i u f x e o E O`).
 *   Pass `{ expandSavarna: true }` to add the long vowels each stands for by
 *   अणुदित्सवर्णस्य चाप्रत्ययः (1.1.69): `a A i I u U f F x e o E O`.
 * - The marker ण् occurs twice. By tradition अण् is read with the FIRST ण्
 *   (`a i u`) and इण् / यण् with the SECOND. `pratyahara('aR')` therefore
 *   returns `['a','i','u']`; pass `{ marker: 2 }` for the wider reading used
 *   only in 1.1.69 (all vowels + `h y v r l`). `{ marker: 1 }` forces the
 *   first ण् (e.g. `pratyahara('iR', { marker: 1 })` → `['i','u']`).
 * - A pratyāhāra starting with `h` starts from the first `h` (sūtra 5); the
 *   repeated `h` of sūtra 14 is not duplicated in the result.
 * - Returns `[]` when the name cannot be formed from the sūtras.
 *
 * @example
 * pratyahara('ac')  // → ['a','i','u','f','x','e','o','E','O']
 * pratyahara('ik')  // → ['i','u','f','x']
 * pratyahara('yaR') // → ['y','v','r','l']
 * pratyahara('jaS') // → ['j','b','g','q','d']
 * pratyahara('ak', { expandSavarna: true }) // → ['a','A','i','I','u','U','f','F','x']
 */
export function pratyahara(name: string, opts?: { expandSavarna?: boolean; marker?: 1 | 2 }): string[] {
  if (name.length < 2 || name.length > 3) return [];
  const start = name.charAt(0);
  const it = name.charAt(name.length - 1);
  if (name.length === 3 && name.charAt(1) !== 'a') return [];
  // a consonant-initial pratyāhāra is always cited with the enunciative a; a vowel-initial one never is
  if ((name.length === 3) !== isConsonant(start)) return [];
  let startSutra = -1;
  let startPos = -1;
  for (let s = 0; s < SHIVA_SUTRAS.length && startSutra < 0; s++) {
    const pos = SHIVA_SUTRAS[s]?.sounds.indexOf(start) ?? -1;
    if (pos >= 0) {
      startSutra = s;
      startPos = pos;
    }
  }
  if (startSutra < 0) return [];
  const ends: number[] = [];
  for (let s = startSutra; s < SHIVA_SUTRAS.length; s++) if (SHIVA_SUTRAS[s]?.it === it) ends.push(s);
  if (ends.length === 0) return [];
  let end = ends[0] as number;
  if (ends.length > 1) {
    const which = opts?.marker ?? (start === 'a' ? 1 : 2);
    end = (which === 1 ? ends[0] : ends[ends.length - 1]) as number;
  }
  const out: string[] = [];
  for (let s = startSutra; s <= end; s++) {
    const sounds = SHIVA_SUTRAS[s]?.sounds ?? [];
    for (let p = s === startSutra ? startPos : 0; p < sounds.length; p++) {
      const sound = sounds[p] as string;
      if (out.includes(sound)) continue;
      out.push(sound);
      const long = LONG_OF[sound];
      if (opts?.expandSavarna === true && long !== undefined) out.push(long);
    }
  }
  return out;
}

const SAVARNA_VOWEL_CLASS: Record<string, string> = {
  a: 'a', A: 'a', i: 'i', I: 'i', u: 'u', U: 'u', f: 'f', F: 'f', x: 'f', X: 'f', e: 'e', E: 'E', o: 'o', O: 'O',
};

/**
 * Whether two sounds (SLP1) are savarṇa — homogeneous — by तुल्यास्यप्रयत्नं
 * सवर्णम् (1.1.9): same place of articulation and same internal effort.
 *
 * - short and long of the same vowel are savarṇa (`a`/`A`, `i`/`I`, `u`/`U`, `f`/`F`);
 * - ऋ and ऌ are savarṇa with each other (vārttika ऋऌवर्णयोर्मिथः सावर्ण्यं वाच्यम्);
 * - `e`, `E` (ai), `o`, `O` (au) are savarṇa only with themselves;
 * - the five stops of one varga are savarṇa with one another (`k K g G N` …);
 * - `y r l v S z s h` are savarṇa only with themselves;
 * - a vowel and a consonant are never savarṇa (नाज्झलौ 1.1.10);
 * - anusvāra, visarga and anything unknown are savarṇa with nothing.
 *
 * @example
 * isSavarna('a', 'A') // → true
 * isSavarna('k', 'N') // → true
 * isSavarna('e', 'E') // → false
 * isSavarna('i', 'S') // → false (same place, but vowel vs consonant)
 */
export function isSavarna(a: string, b: string): boolean {
  if (a.length !== 1 || b.length !== 1) return false;
  const va = SAVARNA_VOWEL_CLASS[a];
  const vb = SAVARNA_VOWEL_CLASS[b];
  if (va !== undefined || vb !== undefined) return va !== undefined && va === vb;
  const ca = VARNA_BY_SLP1.get(a);
  const cb = VARNA_BY_SLP1.get(b);
  if (ca === undefined || cb === undefined) return false;
  if (ca.kind !== 'vyanjana' || cb.kind !== 'vyanjana') return false;
  if (ca.varga !== undefined || cb.varga !== undefined) return ca.varga === cb.varga;
  return a === b;
}
