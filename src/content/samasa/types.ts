import type { Level, Provenance } from '../types';

export type SamasaType = 'tatpurusha' | 'karmadharaya' | 'dvigu' | 'dvandva' | 'bahuvrihi' | 'avyayibhava' | 'nan-tatpurusha' | 'upapada';

export interface Samasa {
  id: string;
  /** The compound in the form in which it is usually quoted: nominative singular (dual / plural for dvandvas), or the indeclinable form of an avyayībhāva. */
  compound: string;
  /** The standard laukika vigraha, words separated by single spaces, sandhi not applied: 'राज्ञः पुरुषः'. */
  vigraha: string;
  type: SamasaType;
  /** Finer class in Sanskrit, e.g. 'षष्ठी-तत्पुरुषः', 'समाहार-द्विगुः', 'उपमान-बहुव्रीहिः'. */
  subtype?: string;
  /** Member stems (prātipadika / avyaya / kṛt-final member) in compound order. */
  members: string[];
  en: string;
  level: Level;
  provenance: Provenance;
}
