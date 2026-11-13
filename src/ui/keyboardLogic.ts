/**
 * Pure editing logic for the on-screen Devanagari keyboard. The keyboard has keys for
 * independent vowels, consonants and marks; this module turns key presses into a
 * well-formed Devanagari string (vowel after a consonant becomes a vowel sign, virāma
 * builds conjuncts, marks attach only where they are legal).
 */
export const VOWEL_KEYS = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ'] as const;
export const RARE_VOWEL_KEYS = ['ॠ', 'ऌ'] as const;
export const CONSONANT_ROWS: readonly (readonly string[])[] = [
  ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ'],
  ['ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न'],
  ['प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व'],
  ['श', 'ष', 'स', 'ह'],
];
export const VIRAMA = '्';
export const ANUSVARA = 'ं';
export const VISARGA = 'ः';
export const CANDRABINDU = 'ँ';
export const AVAGRAHA = 'ऽ';
export const MARK_KEYS = [ANUSVARA, VISARGA, VIRAMA, AVAGRAHA] as const;
export const BACKSPACE = '⌫';
export const ENTER = '⏎';

const MATRA: Record<string, string> = { आ: 'ा', इ: 'ि', ई: 'ी', उ: 'ु', ऊ: 'ू', ऋ: 'ृ', ॠ: 'ॄ', ऌ: 'ॢ', ए: 'े', ऐ: 'ै', ओ: 'ो', औ: 'ौ' };
const isConsonant = (ch: string): boolean => ch >= 'क' && ch <= 'ह';
const isIndependentVowel = (ch: string): boolean => (ch >= 'अ' && ch <= 'औ') || ch === 'ॠ' || ch === 'ॡ';
const isMatra = (ch: string): boolean => (ch >= 'ा' && ch <= 'ौ') || ch === 'ॢ' || ch === 'ॣ';

/** Apply one key press to the current text; returns the new text (unchanged if the key is illegal there). */
export function applyKey(text: string, key: string): string {
  const chars = [...text];
  const last = chars[chars.length - 1] ?? '';
  if (key === BACKSPACE) return chars.slice(0, -1).join('');
  if (key === ENTER) return text;
  if (key === 'अ') {
    if (last === VIRAMA) return chars.slice(0, -1).join(''); // क् + अ → क
    if (isConsonant(last)) return text; // inherent a already present
    return text + 'अ';
  }
  const matra = MATRA[key];
  if (matra !== undefined) {
    if (last === VIRAMA) return chars.slice(0, -1).join('') + matra; // क् + इ → कि
    if (isConsonant(last)) return text + matra;
    return text + key;
  }
  if (isConsonant(key)) return text + key;
  if (key === VIRAMA) return isConsonant(last) ? text + VIRAMA : text;
  if (key === ANUSVARA || key === CANDRABINDU) return isConsonant(last) || isMatra(last) || isIndependentVowel(last) ? text + key : text;
  // One of ं ः ँ per akṣara, and an avagraha never follows one of them (same rules as validateDeva).
  if (key === VISARGA) return isConsonant(last) || isMatra(last) || isIndependentVowel(last) ? text + key : text;
  if (key === AVAGRAHA) return text.length > 0 && last !== VIRAMA && last !== AVAGRAHA && last !== ANUSVARA && last !== VISARGA && last !== CANDRABINDU ? text + key : text;
  if (key === ' ') return text.length > 0 && last !== ' ' ? text + ' ' : text;
  return text;
}

/** Type a whole Devanagari string through applyKey from independent-letter key presses (used in tests and by bots). */
export function keysFor(deva: string): string[] {
  const keys: string[] = [];
  const unMatra: Record<string, string> = {};
  for (const [v, m] of Object.entries(MATRA)) unMatra[m] = v;
  for (const ch of deva) {
    const v = unMatra[ch];
    keys.push(v ?? ch);
  }
  return keys;
}
