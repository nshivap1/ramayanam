import type { Level, Provenance } from '../types';

export type Role = 'karta' | 'karma' | 'kriya' | 'karana' | 'sampradana' | 'apadana' | 'sambandha' | 'adhikarana' | 'sambodhana' | 'visheshana' | 'avyaya' | 'upapada';

export interface SentenceWord {
  /** the word as it stands in the sentence (padaccheda form, Devanagari) */
  sa: string;
  /** English gloss of this word in this sentence */
  en: string;
  role: Role;
  /** prātipadika for nominals (बालक), dhātu for verbs (पठ्; prefixed: आ+गम्), the word itself for indeclinables */
  lemma: string;
  /**
   * nominal: '<vibhakti>.<vacana>.<gender>' e.g. '2.1.n' (gender 'x' for अस्मद् / युष्मद्);
   * finite verb: '<lakara>.<purusha>.<vacana>' e.g. 'lat.1.1' (puruṣa 1 = prathama);
   * 'ktva' / 'tumun' for the two verbal indeclinables; 'avyaya' for other indeclinables.
   */
  tag: string;
}

export interface Sentence {
  id: string;
  /** natural prose order: kartā … other kārakas … karma … kriyā; no sandhi between words */
  words: SentenceWord[];
  en: string;
  level: Level;
  topic: string;
  pattern: string;
  provenance: Provenance;
}

/** Compact authoring shape of the generated data file. */
export interface RawSentence {
  id: string;
  level: Level;
  topic: string;
  pattern: string;
  en: string;
  /** words ' ; '-separated, each  form|gloss|role|lemma|tag */
  w: string;
  /** verifiedBy tags */
  v: string[];
}
