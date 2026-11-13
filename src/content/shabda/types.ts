import type { Forms, Gender, Level, Provenance } from '../types';

/** One declension table (śabda-rūpāvalī): 8 vibhaktis × 3 vacanas. */
export interface ShabdaParadigm {
  /** ascii slug, e.g. 'rama-m', 'tad-f', 'asmad' */
  id: string;
  /** prātipadika in Devanagari, e.g. 'राम' */
  stem: string;
  /** nominative singular (or the first existing nominative for dual-/plural-only words), e.g. 'रामः' */
  citation: string;
  /** for asmad / yuṣmad and the numerals 5–10 the value is 'm' and `genderless` is true */
  gender: Gender;
  genderless?: boolean;
  /** e.g. 'अकारान्तः'; pronouns 'सर्वनाम'; numerals 'सङ्ख्या' */
  anta: string;
  kind: 'noun' | 'pronoun' | 'numeral' | 'adjective';
  /** meaning */
  en: string;
  /** when Samskrita Bharati learners typically meet this paradigm */
  level: Level;
  /**
   * [vibhakti-1][vacana-1] → accepted forms, display form first.
   * `[]` when the cell does not exist (pronoun / numeral vocatives, dual-only and plural-only words).
   * Row 8 (index 7) is sambodhana, stored without the particle हे.
   */
  forms: Forms[][];
  provenance: Provenance;
}
