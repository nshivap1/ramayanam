/**
 * Sanskrit number words (saṅkhyā). The tables are hard-coded data, not
 * composed by rule: the irregular forms (षोडश, त्रयोविंशतिः, षड्विंशतिः,
 * द्व्यशीतिः, षण्णवतिः …) make composition unsafe.
 */

/**
 * Cardinals 1–100 in the counting / citation form taught in standard tables:
 * 1–4 in the neuter nominative (एकम् द्वे त्रीणि चत्वारि), 5–19 in their
 * genderless nominative (पञ्च षट् … नवदश), and the decades from 20 as the
 * nominative singular of the feminine / neuter number noun (विंशतिः, त्रिंशत्,
 * शतम्).
 */
const CARDINALS: readonly string[] = [
  'एकम्', 'द्वे', 'त्रीणि', 'चत्वारि', 'पञ्च', 'षट्', 'सप्त', 'अष्ट', 'नव', 'दश',
  'एकादश', 'द्वादश', 'त्रयोदश', 'चतुर्दश', 'पञ्चदश', 'षोडश', 'सप्तदश', 'अष्टादश', 'नवदश', 'विंशतिः',
  'एकविंशतिः', 'द्वाविंशतिः', 'त्रयोविंशतिः', 'चतुर्विंशतिः', 'पञ्चविंशतिः', 'षड्विंशतिः', 'सप्तविंशतिः', 'अष्टाविंशतिः', 'नवविंशतिः', 'त्रिंशत्',
  'एकत्रिंशत्', 'द्वात्रिंशत्', 'त्रयस्त्रिंशत्', 'चतुस्त्रिंशत्', 'पञ्चत्रिंशत्', 'षट्त्रिंशत्', 'सप्तत्रिंशत्', 'अष्टात्रिंशत्', 'नवत्रिंशत्', 'चत्वारिंशत्',
  'एकचत्वारिंशत्', 'द्विचत्वारिंशत्', 'त्रिचत्वारिंशत्', 'चतुश्चत्वारिंशत्', 'पञ्चचत्वारिंशत्', 'षट्चत्वारिंशत्', 'सप्तचत्वारिंशत्', 'अष्टचत्वारिंशत्', 'नवचत्वारिंशत्', 'पञ्चाशत्',
  'एकपञ्चाशत्', 'द्विपञ्चाशत्', 'त्रिपञ्चाशत्', 'चतुष्पञ्चाशत्', 'पञ्चपञ्चाशत्', 'षट्पञ्चाशत्', 'सप्तपञ्चाशत्', 'अष्टपञ्चाशत्', 'नवपञ्चाशत्', 'षष्टिः',
  'एकषष्टिः', 'द्विषष्टिः', 'त्रिषष्टिः', 'चतुःषष्टिः', 'पञ्चषष्टिः', 'षट्षष्टिः', 'सप्तषष्टिः', 'अष्टषष्टिः', 'नवषष्टिः', 'सप्ततिः',
  'एकसप्ततिः', 'द्विसप्ततिः', 'त्रिसप्ततिः', 'चतुःसप्ततिः', 'पञ्चसप्ततिः', 'षट्सप्ततिः', 'सप्तसप्ततिः', 'अष्टसप्ततिः', 'नवसप्ततिः', 'अशीतिः',
  'एकाशीतिः', 'द्व्यशीतिः', 'त्र्यशीतिः', 'चतुरशीतिः', 'पञ्चाशीतिः', 'षडशीतिः', 'सप्ताशीतिः', 'अष्टाशीतिः', 'नवाशीतिः', 'नवतिः',
  'एकनवतिः', 'द्विनवतिः', 'त्रिनवतिः', 'चतुर्नवतिः', 'पञ्चनवतिः', 'षण्णवतिः', 'सप्तनवतिः', 'अष्टनवतिः', 'नवनवतिः', 'शतम्',
];

/**
 * Equally correct alternative forms.
 * - 8: अष्टौ beside अष्ट.
 * - x9: the subtractive एकोन- forms (एकोनविंशतिः "twenty less one").
 * - From 42 on, द्वि / त्रि / अष्ट may also appear as द्वा / त्रयस् / अष्टा
 *   (विभाषा चत्वारिंशत्प्रभृतौ सर्वेषाम् 6.3.49) — never before अशीति.
 */
const CARDINAL_VARIANTS: Readonly<Record<number, readonly string[]>> = {
  8: ['अष्टौ'],
  19: ['एकोनविंशतिः'],
  29: ['एकोनत्रिंशत्'],
  39: ['एकोनचत्वारिंशत्'],
  42: ['द्वाचत्वारिंशत्'],
  43: ['त्रयश्चत्वारिंशत्'],
  48: ['अष्टाचत्वारिंशत्'],
  49: ['एकोनपञ्चाशत्'],
  52: ['द्वापञ्चाशत्'],
  53: ['त्रयःपञ्चाशत्'],
  58: ['अष्टापञ्चाशत्'],
  59: ['एकोनषष्टिः'],
  62: ['द्वाषष्टिः'],
  63: ['त्रयःषष्टिः'],
  68: ['अष्टाषष्टिः'],
  69: ['एकोनसप्ततिः'],
  72: ['द्वासप्ततिः'],
  73: ['त्रयःसप्ततिः'],
  78: ['अष्टासप्ततिः'],
  79: ['एकोनाशीतिः'],
  89: ['एकोननवतिः'],
  92: ['द्वानवतिः'],
  93: ['त्रयोनवतिः'],
  98: ['अष्टानवतिः'],
  99: ['एकोनशतम्'],
};

function checkCardinalRange(n: number): void {
  if (!Number.isInteger(n) || !((n >= 1 && n <= 100) || n === 1000)) {
    throw new RangeError(`cardinal(): supported values are the integers 1–100 and 1000, got ${String(n)}`);
  }
}

/**
 * The Sanskrit cardinal number word for `n`, in Devanagari.
 *
 * Supported: the integers 1–100, and 1000 (सहस्रम्). Anything else throws a
 * `RangeError`.
 *
 * Convention — the counting form used in standard tables: एकम् द्वे त्रीणि
 * चत्वारि (neuter nominative) for 1–4; पञ्च षट् सप्त अष्ट नव दश … नवदश; then
 * विंशतिः … नवनवतिः, शतम्. Where the tradition allows two forms (19 नवदश /
 * एकोनविंशतिः, 42 द्विचत्वारिंशत् / द्वाचत्वारिंशत् …) this returns the first
 * and {@link cardinalVariants} lists the others. These are not inflected for
 * the gender or case of the thing counted.
 *
 * @example
 * cardinal(3)    // → 'त्रीणि'
 * cardinal(16)   // → 'षोडश'
 * cardinal(23)   // → 'त्रयोविंशतिः'
 * cardinal(96)   // → 'षण्णवतिः'
 * cardinal(1000) // → 'सहस्रम्'
 */
export function cardinal(n: number): string {
  checkCardinalRange(n);
  if (n === 1000) return 'सहस्रम्';
  return CARDINALS[n - 1] as string;
}

/**
 * Other equally correct forms of the cardinal `n` (possibly none); the form
 * returned by {@link cardinal} is not repeated. Same range as `cardinal`.
 *
 * @example
 * cardinalVariants(19) // → ['एकोनविंशतिः']
 * cardinalVariants(42) // → ['द्वाचत्वारिंशत्']
 * cardinalVariants(5)  // → []
 */
export function cardinalVariants(n: number): string[] {
  checkCardinalRange(n);
  return [...(CARDINAL_VARIANTS[n] ?? [])];
}

/** Ordinal stems 1–20 (masculine / neuter stem in -a), without the case ending. */
const ORDINAL_STEMS: readonly string[] = [
  'प्रथम', 'द्वितीय', 'तृतीय', 'चतुर्थ', 'पञ्चम', 'षष्ठ', 'सप्तम', 'अष्टम', 'नवम', 'दशम',
  'एकादश', 'द्वादश', 'त्रयोदश', 'चतुर्दश', 'पञ्चदश', 'षोडश', 'सप्तदश', 'अष्टादश', 'नवदश', 'विंश',
];

/**
 * The Sanskrit ordinal for `n` (1–20) in the nominative singular of the given
 * gender, in Devanagari. Throws a `RangeError` outside 1–20.
 *
 * Feminines: प्रथमा द्वितीया तृतीया take -ā; from चतुर्थी onwards -ī.
 * For 20 the shorter classical form विंशः / विंशी / विंशम् is returned
 * (विंशतितमः is an equally correct alternative, 5.2.56); for 19, नवदशः
 * (alternative एकोनविंशः).
 *
 * @example
 * ordinal(1, 'm')  // → 'प्रथमः'
 * ordinal(3, 'f')  // → 'तृतीया'
 * ordinal(4, 'f')  // → 'चतुर्थी'
 * ordinal(6, 'n')  // → 'षष्ठम्'
 * ordinal(11, 'f') // → 'एकादशी'
 */
export function ordinal(n: number, gender: 'm' | 'f' | 'n'): string {
  if (!Number.isInteger(n) || n < 1 || n > 20) {
    throw new RangeError(`ordinal(): supported values are the integers 1–20, got ${String(n)}`);
  }
  const stem = ORDINAL_STEMS[n - 1] as string;
  if (gender === 'm') return `${stem}ः`;
  if (gender === 'n') return `${stem}म्`;
  if (gender === 'f') return n <= 3 ? `${stem}ा` : `${stem}ी`;
  throw new RangeError(`ordinal(): gender must be 'm', 'f' or 'n'`);
}
