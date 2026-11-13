import type { Level, Provenance } from '../types';

export interface Verse {
  id: string;
  /**
   * Exactly four pādas. The split follows akṣara boundaries, so the pādas concatenate to `text`; when a word or
   * a sandhi cluster runs across the boundary, the next pāda begins with the conjunct (…भू / र्मा ते…).
   */
  padas: string[];
  /** The two-line printed form: half-verse ।\n half-verse ॥ */
  text: string;
  /** 'anustubh', 'upajati', or the id of a metre in METERS (@sanskrit chandas). Verified by the engine. */
  meter: string;
  /** Set when an odd pāda of an anuṣṭubh is a vipulā variant, e.g. 'vipulā (pāda 1: na-vipulā)'. */
  meterNote?: string;
  /** Samskuru's own plain-English translation. */
  translation: string;
  /** Padaccheda: the words in verse order, sandhi dissolved (compounds kept whole), with glosses. */
  words?: { sa: string; en: string }[];
  /** Attribution, e.g. { work: 'भगवद्गीता', ref: '२.४७' }. */
  source: { work: string; ref: string };
  /** vidyā, mitra, dharma, udyama, satsaṅga, vāk … (IAST keyword) */
  theme: string;
  level: Level;
  provenance: Provenance;
}
