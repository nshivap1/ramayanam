import type { Gender, Level, Provenance } from '../types';

export interface VocabEntry {
  /** ascii slug, stable */
  id: string;
  /**
   * citation form shown to learners: nouns in the nominative singular (वृक्षः, फलम्, लता), adjectives in the
   * masculine nominative singular (सुन्दरः), avyayas as-is (अत्र), verbs as laṭ 3rd singular (पठति)
   */
  sa: string;
  /** prātipadika for nominals */
  stem?: string;
  pos: 'noun' | 'adjective' | 'avyaya' | 'verb' | 'pronoun' | 'numeral' | 'phrase';
  /** always set for nouns */
  gender?: Gender;
  /** concise primary meaning */
  en: string;
  /** id from VOCAB_CATEGORIES */
  category: string;
  level: Level;
  /** a single emoji when one clearly depicts the meaning (unique within its category) */
  emoji?: string;
  /** id of the SHABDA paradigm it declines like (same ending, gender and ṇatva behaviour), when one exists */
  paradigm?: string;
  provenance: Provenance;
}

export interface VocabCategory {
  id: string;
  sa: string;
  en: string;
  emoji: string;
}
