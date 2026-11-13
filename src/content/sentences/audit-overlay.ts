/**
 * Corrections from the independent audit of 11 Nov 2026 (docs/audit/SANSKRIT_AUDIT_A.md), applied on top of
 * the generated data so they are explicit and reviewable. Fold them into tools/content/verbal/gen-sentences.ts
 * the next time the pack is regenerated, then empty this file.
 */

/** Sentences removed: a proper name in the plural ("रामाः … खादन्ति"). */
export const REMOVED_SENTENCES: ReadonlySet<string> = new Set(['karta-karma-kriya-016']);

/** Word glosses that wrongly carried the negation of a separate न ("does not go" → "goes"): id → [word index, was, now]. */
export const GLOSS_FIXES: Readonly<Record<string, readonly [number, string, string]>> = {
  'na-kriya-001': [2, "does not go", "goes"],
  'na-kriya-002': [2, "does not come", "comes"],
  'na-kriya-003': [2, "does not cry", "cries"],
  'na-kriya-004': [2, "does not run", "runs"],
  'na-kriya-005': [2, "does not play", "plays"],
  'na-kriya-006': [3, "does not remember", "remembers"],
  'na-kriya-007': [2, "does not fall", "falls"],
  'na-kriya-008': [2, "does not sit down", "sits down"],
  'na-kriya-009': [2, "does not sleep", "sleeps"],
  'na-kriya-010': [3, "does not protect", "protects"],
  'na-kriya-011': [2, "does not eat", "eats"],
  'na-kriya-012': [2, "does not dance", "dances"],
  'na-kriya-013': [2, "does not read", "reads"],
  'na-kriya-014': [3, "does not see", "sees"],
  'na-kriya-015': [2, "does not rejoice", "rejoices"],
  'na-kriya-016': [2, "does not write", "writes"],
  'vina-001': [4, "does not live", "lives"],
  'vina-002': [4, "does not live", "lives"],
  'vina-003': [4, "does not live", "lives"],
  'vina-004': [4, "does not live", "lives"],
  'vina-005': [4, "does not live", "lives"],
  'vina-006': [4, "does not live", "lives"],
  'vina-007': [4, "does not live", "lives"],
  'vina-008': [4, "does not live", "lives"],
};

/**
 * Nouns governed by सह, विना and नमः take an upapada-vibhakti (2.3.19, 2.3.32, 2.3.16); they are not the
 * karaṇa / karma / sampradāna kāraka. Their role is 'upapada': pattern → index of the governed word.
 */
export const UPAPADA_WORD: Readonly<Record<string, number>> = { saha: 1, vina: 1, namah: 0 };

/** Tag corrections: शाकम् is neuter (as in the vocab pack). */
export const TAG_FIXES: Readonly<Record<string, readonly [string, string, string]>> = {
  'apadana-009': ['शाकम्', '2.1.m', '2.1.n'],
  'karta-karma-kriya-057': ['शाकम्', '2.1.m', '2.1.n'],
  'tumun-shaknoti-012': ['शाकम्', '2.1.m', '2.1.n'],
};
