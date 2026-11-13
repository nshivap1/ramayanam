import type { Level, Provenance } from '../types';

/** Facts about the two parts that the sandhi engine cannot read off their spelling (mirrors `SandhiOptions` of @sanskrit). */
export interface SandhiExampleOptions {
  /** The first word is pragṛhya (a dual in ī / ū / e …): no vowel sandhi. */
  pragrhya?: boolean;
  /** The first word's visarga stands for an original r (अन्तः = antar, मातः = mātar). */
  rFinal?: boolean;
  /** The two parts form one word (compound, or upasarga + word): written together. */
  compound?: boolean;
  /** Stem / root + suffix inside a word (ने + अनम् = नयनम्). */
  internal?: boolean;
}

export interface SandhiExample {
  id: string;
  /** First part, in its independent (pre-sandhi) form: रामः, तत्, सम्, देव. */
  first: string;
  /** Second part, in its independent form. */
  second: string;
  /** The joined form. When the two words stay written apart the space is kept: 'रामो गच्छति'. */
  result: string;
  /** Id of the rule in `SANDHI_RULES` (@sanskrit) that produces `result`. */
  ruleId: string;
  family: 'svara' | 'visarga' | 'vyanjana';
  level: Level;
  /** Gloss of the combined expression. */
  en?: string;
  /** True when the join is inside a compound / word (देव + आलयः) rather than between sentence words. */
  compound?: boolean;
  /** Options to pass to `joinSandhiDeva(first, second, options)` to obtain `result`. */
  options?: SandhiExampleOptions;
  /** Other equally correct outcomes for the same two parts (optional rules): accept these as answers too. */
  alternatives?: string[];
  provenance: Provenance;
}

/** A sandhi the engine cannot (yet) produce — a lexical or word-internal special case. Never part of SANDHI_EXAMPLES. */
export interface PendingSandhiExample {
  id: string;
  first: string;
  second: string;
  result: string;
  /** The Pāṇinian rule that licenses the form. */
  sutra: { ref: string; text: string };
  family: 'svara' | 'visarga' | 'vyanjana';
  level: Level;
  en: string;
  /** What `joinSandhiDeva` returned for these parts when the item was recorded. */
  engineGave: string;
  pendingEngine: true;
  provenance: Provenance;
}
