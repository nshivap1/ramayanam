/**
 * Samskuru shared Sanskrit core library. See ./README.md.
 */
export type { Scheme } from './translit';
export {
  transliterate,
  devaToSlp1,
  slp1ToDeva,
  devaToIast,
  iastToDeva,
  slp1ToIast,
  iastToSlp1,
  detectScheme,
  normalizeDeva,
  validateDeva,
  toDevaDigits,
  fromDevaDigits,
} from './translit';

export type { AksharaParts } from './akshara';
export { splitAksharas, countAksharas, aksharaParts, composeAkshara } from './akshara';

export type { Varna, Sthana } from './varna';
export { VARNAS, varna, SHIVA_SUTRAS, PRATYAHARA_NAMES, pratyahara, isSavarna, isVowel, isConsonant, STHANA_NAMES } from './varna';

export { cardinal, cardinalVariants, ordinal } from './numbers';

export type { SandhiFamily, SandhiOptions, SandhiRule, SandhiResult, SandhiSpecial } from './sandhi';
export { SANDHI_RULES, joinSandhi, joinSandhiDeva, sandhiRule, applyNatva } from './sandhi';

export type { Weight, Syllable, Meter } from './chandas';
export { scanLine, weights, ganas, METERS, matchMeter, checkAnustubh, identifyVerse } from './chandas';

export { spellingKey, sameSpelling } from './equivalence';
