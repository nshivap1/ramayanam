/**
 * Shared types for verified content packs. Every Sanskrit string a game shows or accepts
 * comes from a pack in src/content (or from a deterministic engine in src/sanskrit).
 * All Sanskrit is authored in Devanagari (NFC). See docs/SANSKRIT_ACCURACY.md.
 */
import type { Level } from '../sdk/types';

export type { Level };

export type Gender = 'm' | 'f' | 'n';
/** 1 prathamā · 2 dvitīyā · 3 tṛtīyā · 4 caturthī · 5 pañcamī · 6 ṣaṣṭhī · 7 saptamī · 8 sambodhana */
export type Vibhakti = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
/** 1 ekavacana · 2 dvivacana · 3 bahuvacana */
export type Vacana = 1 | 2 | 3;
/** Sanskrit order: 1 prathama-puruṣa (he/she/it) · 2 madhyama (you) · 3 uttama (I) */
export type Purusha = 1 | 2 | 3;
export type Lakara = 'lat' | 'lan' | 'lrt' | 'lot' | 'vidhilin';
export type Pada = 'P' | 'A';

export const VIBHAKTI_NAMES: Record<Vibhakti, { sa: string; iast: string; en: string }> = {
  1: { sa: 'प्रथमा', iast: 'prathamā', en: 'nominative' },
  2: { sa: 'द्वितीया', iast: 'dvitīyā', en: 'accusative' },
  3: { sa: 'तृतीया', iast: 'tṛtīyā', en: 'instrumental' },
  4: { sa: 'चतुर्थी', iast: 'caturthī', en: 'dative' },
  5: { sa: 'पञ्चमी', iast: 'pañcamī', en: 'ablative' },
  6: { sa: 'षष्ठी', iast: 'ṣaṣṭhī', en: 'genitive' },
  7: { sa: 'सप्तमी', iast: 'saptamī', en: 'locative' },
  8: { sa: 'सम्बोधनम्', iast: 'sambodhanam', en: 'vocative' },
};
export const VACANA_NAMES: Record<Vacana, { sa: string; iast: string; en: string }> = {
  1: { sa: 'एकवचनम्', iast: 'ekavacanam', en: 'singular' },
  2: { sa: 'द्विवचनम्', iast: 'dvivacanam', en: 'dual' },
  3: { sa: 'बहुवचनम्', iast: 'bahuvacanam', en: 'plural' },
};
export const PURUSHA_NAMES: Record<Purusha, { sa: string; iast: string; en: string }> = {
  1: { sa: 'प्रथमपुरुषः', iast: 'prathamapuruṣaḥ', en: 'third person' },
  2: { sa: 'मध्यमपुरुषः', iast: 'madhyamapuruṣaḥ', en: 'second person' },
  3: { sa: 'उत्तमपुरुषः', iast: 'uttamapuruṣaḥ', en: 'first person' },
};
export const LAKARA_NAMES: Record<Lakara, { sa: string; iast: string; en: string }> = {
  lat: { sa: 'लट्', iast: 'laṭ', en: 'present' },
  lan: { sa: 'लङ्', iast: 'laṅ', en: 'past (imperfect)' },
  lrt: { sa: 'लृट्', iast: 'lṛṭ', en: 'future' },
  lot: { sa: 'लोट्', iast: 'loṭ', en: 'imperative' },
  vidhilin: { sa: 'विधिलिङ्', iast: 'vidhiliṅ', en: 'optative' },
};
export const GENDER_NAMES: Record<Gender, { sa: string; iast: string; en: string }> = {
  m: { sa: 'पुंलिङ्गम्', iast: 'puṃliṅgam', en: 'masculine' },
  f: { sa: 'स्त्रीलिङ्गम्', iast: 'strīliṅgam', en: 'feminine' },
  n: { sa: 'नपुंसकलिङ्गम्', iast: 'napuṃsakaliṅgam', en: 'neuter' },
};

/** How an item was verified. Every pack item carries at least one. */
export interface Provenance {
  /** Human-readable origin: textbook, corpus, dataset. */
  source: string;
  /** Machine checks that confirmed it, e.g. 'oracle:vidyut-prakriya', 'oracle:ashtadhyayi-com', 'engine:joinSandhi', 'engine:scanLine'. */
  verifiedBy: string[];
  /** Set true only by a human Sanskrit reviewer (name + date in the pack's REVIEW.md). */
  humanReviewed?: boolean;
}

/** A cell that can have optional alternates (vikalpa). First entry is the form shown; all are accepted as answers. */
export type Forms = readonly string[];

export interface PackMeta {
  id: string;
  title: string;
  version: string;
  description: string;
  license: string;
  sources: string[];
  /** Number of items, for the validation report. */
  count: number;
}
