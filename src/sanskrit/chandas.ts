/**
 * Chandas — metrical scansion, gaṇas, the common sama-vṛtta metres and the
 * anuṣṭubh (śloka) check.
 */
import { aksharaParts, splitAksharas } from './akshara';
import { devaToSlp1, normalizeDeva } from './translit';

/** `L` = laghu (light, 1 mātrā), `G` = guru (heavy, 2 mātrās). */
export type Weight = 'L' | 'G';

export interface Syllable {
  /** The syllable as its Devanagari akṣara (display form, aligned with `splitAksharas`). */
  text: string;
  /** The same akṣara in SLP1. */
  slp1: string;
  weight: Weight;
}

const LONG_VOWELS = new Set(['आ', 'ई', 'ऊ', 'ॠ', 'ॡ', 'ए', 'ऐ', 'ओ', 'औ', 'ॐ']);

/**
 * Scans one pāda / line of Devanagari into metrical syllables.
 *
 * A syllable is guru when
 * 1. its vowel is long (ā ī ū ṝ e ai o au), or
 * 2. it carries an anusvāra or a visarga, or
 * 3. its vowel is followed by two or more consonants before the next vowel —
 *    counted across word boundaries within the line (`न च` + `श्रेयः`: the च is
 *    guru), or
 * 4. it is the last syllable of the line and ends in a consonant.
 * Otherwise it is laghu. The last syllable is NOT automatically lengthened:
 * it gets its natural weight; metre matching treats it as free
 * ({@link matchMeter}).
 *
 * Not applied: the poetic licence that lets a short vowel stay light before
 * `pr`, `hr`, `br`, `kr`. Spaces, daṇḍas, digits, hyphens and avagrahas are
 * ignored; candrabindu does not add weight; `ॐ` is one guru syllable.
 *
 * @example
 * scanLine('धर्मक्षेत्रे').map((s) => s.weight).join('') // → 'GGGG'
 * scanLine('कुरु')  // → [{ text: 'कु', slp1: 'ku', weight: 'L' }, { text: 'रु', slp1: 'ru', weight: 'L' }]
 */
export function scanLine(deva: string): Syllable[] {
  const aksharas = splitAksharas(normalizeDeva(deva)).map((text) => ({ text, parts: aksharaParts(text) }));
  // vowelless fragments (a line starting with a bare halanta) carry no syllable
  const syllabic = aksharas.filter((a) => a.parts.vowel !== '');
  const out: Syllable[] = [];
  for (let i = 0; i < syllabic.length; i++) {
    const cur = syllabic[i] as (typeof syllabic)[number];
    const next = syllabic[i + 1];
    const { parts } = cur;
    let heavy = LONG_VOWELS.has(parts.vowel) || parts.modifiers.includes('ं') || parts.modifiers.includes('ः');
    if (!heavy) {
      const following = parts.finals.length + (next === undefined ? 0 : next.parts.consonants.length);
      heavy = next === undefined ? parts.finals.length >= 1 : following >= 2;
    }
    out.push({ text: cur.text, slp1: devaToSlp1(cur.text), weight: heavy ? 'G' : 'L' });
  }
  return out;
}

/**
 * The weight pattern of a line as a string of `L` / `G`.
 * @example weights('कर्मण्येवाधिकारस्ते') // → 'GGGGLGGG'
 */
export function weights(deva: string): string {
  return scanLine(deva)
    .map((s) => s.weight)
    .join('');
}

const GANA_BY_PATTERN: Record<string, string> = {
  LGG: 'ya',
  GGG: 'ma',
  GGL: 'ta',
  GLG: 'ra',
  LGL: 'ja',
  GLL: 'bha',
  LLL: 'na',
  LLG: 'sa',
};
const PATTERN_BY_GANA: Record<string, string> = {
  ya: 'LGG',
  ma: 'GGG',
  ta: 'GGL',
  ra: 'GLG',
  ja: 'LGL',
  bha: 'GLL',
  na: 'LLL',
  sa: 'LLG',
  la: 'L',
  ga: 'G',
};

/**
 * Splits a weight pattern into the traditional three-syllable gaṇas
 * (ya ma ta ra ja bha na sa — the यमाताराजभानसलगम् mnemonic); the one or two
 * syllables left over at the end are named `la` (laghu) / `ga` (guru).
 * Characters other than `L` and `G` (e.g. yati marks) are ignored.
 *
 * @example
 * ganas('GGLGGLLGLGG') // → ['ta','ta','ja','ga','ga']   (indravajrā)
 * ganas('LGGLGG')      // → ['ya','ya']
 */
export function ganas(pattern: string): string[] {
  const p = pattern.replace(/[^LG]/g, '');
  const out: string[] = [];
  let i = 0;
  for (; i + 3 <= p.length; i += 3) out.push(GANA_BY_PATTERN[p.slice(i, i + 3)] as string);
  for (; i < p.length; i++) out.push(p.charAt(i) === 'G' ? 'ga' : 'la');
  return out;
}

export interface Meter {
  id: string;
  name: { sa: string; iast: string };
  /** Syllables per pāda. */
  syllables: number;
  /** Weight pattern of one pāda, e.g. `'GGLGGLLGLGG'`. */
  pattern: string;
  /** Space-separated gaṇas, e.g. `'ta ta ja ga ga'`. */
  ganaFormula: string;
  /** Caesura: lengths of the sections of the pāda (they sum to `syllables`). */
  yati?: number[];
  /** The traditional definition (one pāda, itself composed in the metre). */
  lakshana?: string;
}

function meter(id: string, sa: string, iast: string, ganaFormula: string, yati?: number[], lakshana?: string): Meter {
  const pattern = ganaFormula
    .split(' ')
    .map((g) => PATTERN_BY_GANA[g] ?? '?')
    .join('');
  const m: Meter = { id, name: { sa, iast }, syllables: pattern.length, pattern, ganaFormula };
  if (yati !== undefined) m.yati = yati;
  if (lakshana !== undefined) m.lakshana = lakshana;
  return m;
}

/**
 * The common sama-vṛtta metres (all four pādas alike), each defined by its
 * gaṇa formula. `lakshana` is the traditional defining line (mostly from the
 * Vṛttaratnākara), which is itself in the metre it defines.
 */
export const METERS: readonly Meter[] = [
  meter('indravajra', 'इन्द्रवज्रा', 'indravajrā', 'ta ta ja ga ga', undefined, 'स्यादिन्द्रवज्रा यदि तौ जगौ गः'),
  meter('upendravajra', 'उपेन्द्रवज्रा', 'upendravajrā', 'ja ta ja ga ga', undefined, 'उपेन्द्रवज्रा जतजास्ततो गौ'),
  meter('vamshastha', 'वंशस्थम्', 'vaṃśastham', 'ja ta ja ra', undefined, 'जतौ तु वंशस्थमुदीरितं जरौ'),
  meter('indravamsha', 'इन्द्रवंशा', 'indravaṃśā', 'ta ta ja ra', undefined, 'स्यादिन्द्रवंशा ततजै रसंयुतैः'),
  meter('vasantatilaka', 'वसन्ततिलका', 'vasantatilakā', 'ta bha ja ja ga ga', undefined, 'उक्ता वसन्ततिलका तभजा जगौ गः'),
  meter('malini', 'मालिनी', 'mālinī', 'na na ma ya ya', [8, 7], 'ननमयययुतेयं मालिनी भोगिलोकैः'),
  meter('mandakranta', 'मन्दाक्रान्ता', 'mandākrāntā', 'ma bha na ta ta ga ga', [4, 6, 7], 'मन्दाक्रान्ता जलधिषडगैर्म्भौ नतौ ताद्गुरू चेत्'),
  meter('shikharini', 'शिखरिणी', 'śikhariṇī', 'ya ma na sa bha la ga', [6, 11], 'रसै रुद्रैश्छिन्ना यमनसभला गः शिखरिणी'),
  meter('shardulavikridita', 'शार्दूलविक्रीडितम्', 'śārdūlavikrīḍitam', 'ma sa ja sa ta ta ga', [12, 7], 'सूर्याश्वैर्मसजस्तताः सगुरवः शार्दूलविक्रीडितम्'),
  meter('sragdhara', 'स्रग्धरा', 'sragdharā', 'ma ra bha na ya ya ya', [7, 7, 7], 'म्रभ्नैर्यानां त्रयेण त्रिमुनियतियुता स्रग्धरा कीर्तितेयम्'),
  meter('bhujangaprayata', 'भुजङ्गप्रयातम्', 'bhujaṅgaprayātam', 'ya ya ya ya', undefined, 'भुजङ्गप्रयातं भवेद्यैश्चतुर्भिः'),
  meter('totaka', 'तोटकम्', 'toṭakam', 'sa sa sa sa', undefined, 'इह तोटकमम्बुधिसैः प्रथितम्'),
  meter('drutavilambita', 'द्रुतविलम्बितम्', 'drutavilambitam', 'na bha bha ra', undefined, 'द्रुतविलम्बितमाह नभौ भरौ'),
  meter('rathoddhata', 'रथोद्धता', 'rathoddhatā', 'ra na ra la ga', undefined, 'रान्नराविह रथोद्धता लगौ'),
  meter('svagata', 'स्वागता', 'svāgatā', 'ra na bha ga ga', undefined, 'स्वागतेति रनभाद्गुरुयुग्मम्'),
  meter('shalini', 'शालिनी', 'śālinī', 'ma ta ta ga ga', [4, 7], 'शालिन्युक्ता म्तौ तगौ गोऽब्धिलोकैः'),
  meter('harini', 'हरिणी', 'hariṇī', 'na sa ma ra sa la ga', [6, 4, 7], 'रसयुगहयैर्न्सौ म्रौ स्लौ गो यदा हरिणी तदा'),
  meter('prthvi', 'पृथ्वी', 'pṛthvī', 'ja sa ja sa ya la ga', [8, 9], 'जसौ जसयला वसुग्रहयतिश्च पृथ्वी गुरुः'),
  meter('praharshini', 'प्रहर्षिणी', 'praharṣiṇī', 'ma na ja ra ga', [3, 10], 'म्नौ ज्रौ गस्त्रिदशयतिः प्रहर्षिणीयम्'),
  meter('pancacamara', 'पञ्चचामरम्', 'pañcacāmaram', 'ja ra ja ra ja ga', [8, 8], 'जरौ जरौ ततो जगौ च पञ्चचामरं वदेत्'),
];

/**
 * Finds the sama-vṛtta in {@link METERS} whose pāda has exactly this weight
 * pattern. The last syllable is anceps (a light final syllable counts as
 * heavy, पादान्तस्थं विकल्पेन). Non-`L`/`G` characters are ignored.
 *
 * @example
 * matchMeter('GGLGGLLGLGG')?.id // → 'indravajra'
 * matchMeter('GGLGGLLGLGL')?.id // → 'indravajra'  (final syllable free)
 * matchMeter('LLLL')            // → undefined
 */
export function matchMeter(pattern: string): Meter | undefined {
  const p = pattern.replace(/[^LG]/g, '');
  if (p.length === 0) return undefined;
  const head = p.slice(0, -1);
  return METERS.find((m) => m.syllables === p.length && m.pattern.slice(0, -1) === head);
}

function anustubhIssues(pattern: string, padaIndex: number): string[] {
  const issues: string[] = [];
  if (pattern.length !== 8) {
    issues.push(`a pāda of anuṣṭubh has 8 syllables, found ${pattern.length}`);
    return issues;
  }
  const odd = padaIndex % 2 === 0; // pādas 1 and 3
  if (pattern.charAt(4) !== 'L') issues.push('the 5th syllable must be laghu');
  if (pattern.charAt(5) !== 'G') issues.push('the 6th syllable must be guru');
  if (odd && pattern.charAt(6) !== 'G') issues.push('the 7th syllable must be guru in pādas 1 and 3 (pathyā form; the line may be a vipulā variant, which is not checked)');
  if (!odd && pattern.charAt(6) !== 'L') issues.push('the 7th syllable must be laghu in pādas 2 and 4');
  return issues;
}

/**
 * Checks one pāda of an anuṣṭubh / śloka against the classical rule
 * श्लोके षष्ठं गुरु ज्ञेयं सर्वत्र लघु पञ्चमम् । द्विचतुष्पादयोर्ह्रस्वं सप्तमं
 * दीर्घमन्ययोः ॥ — 8 syllables; the 5th laghu and the 6th guru everywhere; the
 * 7th guru in pādas 1 and 3 (`padaIndex` 0, 2) and laghu in pādas 2 and 4
 * (`padaIndex` 1, 3).
 *
 * This is the regular (pathyā) form. The vipulā variants of the odd pādas,
 * which good poets also use, are reported as issues, not accepted.
 *
 * @example
 * checkAnustubh('कर्मण्येवाधिकारस्ते', 0) // → { ok: true, syllables: 8, pattern: 'GGGGLGGG', issues: [] }
 * checkAnustubh('मा फलेषु कदाचन', 1).ok   // → true
 */
export function checkAnustubh(pada: string, padaIndex: 0 | 1 | 2 | 3): { ok: boolean; syllables: number; pattern: string; issues: string[] } {
  const pattern = weights(pada);
  const issues = anustubhIssues(pattern, padaIndex);
  return { ok: issues.length === 0, syllables: pattern.length, pattern, issues };
}

/**
 * Identifies the metre of a verse given as its pādas (normally four).
 *
 * - `'anustubh'` (meter `'anustubh'`): every pāda passes {@link checkAnustubh}
 *   for its position. A 16- or 32-syllable line is accepted as two / four
 *   pādas, so the verse may also be given as two half-verses or as one string.
 * - `'samavrtta'`: every pāda matches the same entry of {@link METERS}
 *   (`meter` = its id).
 * - `'upajati'` (meter `'upajati'`): the pādas mix indravajrā with
 *   upendravajrā (11 syllables), or vaṃśastha with indravaṃśā (12 syllables).
 * - otherwise `'unknown'` with `meter: null` — including anuṣṭubh verses with
 *   a vipulā pāda and anything not in {@link METERS}.
 *
 * `perPada` gives, for each input line, the matched metre id, `'anustubh'`,
 * or `'unknown'`.
 *
 * @example
 * identifyVerse(['वागर्थाविव संपृक्तौ', 'वागर्थप्रतिपत्तये', 'जगतः पितरौ वन्दे', 'पार्वतीपरमेश्वरौ'])
 * // → { meter: 'anustubh', kind: 'anustubh', perPada: ['anustubh','anustubh','anustubh','anustubh'] }
 */
export function identifyVerse(padas: string[]): { meter: string | null; kind: 'anustubh' | 'samavrtta' | 'upajati' | 'unknown'; perPada: string[] } {
  const patterns = padas.map((p) => weights(p));
  if (patterns.length === 0) return { meter: null, kind: 'unknown', perPada: [] };

  // anuṣṭubh: split 16-syllable half-verses into two pādas each
  const anustubhPerPada: boolean[] = [];
  let index = 0;
  let anustubhPossible = true;
  for (const p of patterns) {
    if (p.length === 8 || p.length === 16 || p.length === 32) {
      let ok = true;
      for (let k = 0; k < p.length; k += 8) {
        if (anustubhIssues(p.slice(k, k + 8), index).length > 0) ok = false;
        index += 1;
      }
      anustubhPerPada.push(ok);
    } else {
      anustubhPossible = false;
      anustubhPerPada.push(false);
    }
  }
  const total = index;
  if (anustubhPossible && total % 2 === 0 && anustubhPerPada.every(Boolean)) {
    return { meter: 'anustubh', kind: 'anustubh', perPada: patterns.map(() => 'anustubh') };
  }

  const matched = patterns.map((p) => matchMeter(p)?.id);
  const perPada = matched.map((id, i) => id ?? (anustubhPossible && anustubhPerPada[i] === true ? 'anustubh' : 'unknown'));
  if (matched.every((id) => id !== undefined)) {
    const ids = new Set(matched as string[]);
    if (ids.size === 1) return { meter: matched[0] as string, kind: 'samavrtta', perPada };
    const all = (allowed: string[]): boolean => [...ids].every((id) => allowed.includes(id));
    if (all(['indravajra', 'upendravajra']) || all(['vamshastha', 'indravamsha'])) {
      return { meter: 'upajati', kind: 'upajati', perPada };
    }
  }
  return { meter: null, kind: 'unknown', perPada };
}
