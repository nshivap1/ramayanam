/**
 * VOCAB — verified everyday vocabulary for Samskrita Bharati learners.
 *
 * Every noun's stem and gender is confirmed in a dictionary (Monier-Williams / Apte / Amarakośa) or, for a modern
 * coinage, marked `usage:samskrita-bharati`; verbs are checked against two conjugation datasets; see ./README.md
 * and ./REVIEW.md.
 */
import type { Level, PackMeta } from '../types';
import { VOCAB_CATEGORY_DATA, VOCAB_DATA } from './data';
import type { VocabCategory, VocabEntry } from './types';

export type { VocabCategory, VocabEntry } from './types';

/** All entries, grouped by category in teaching order. */
/**
 * Corrections from the independent audit of 11 Nov 2026 (docs/audit/SANSKRIT_AUDIT_A.md), to fold into
 * tools/content/nominal/vocab-list.ts at the next regeneration:
 *  - `marica` (pepper): the 🌶️ emoji shows a chilli, not pepper — emoji withheld so picture games do not mislead.
 */
const NO_EMOJI: ReadonlySet<string> = new Set(['marica']);

export const VOCAB: readonly VocabEntry[] = VOCAB_DATA.map((v) => {
  if (!NO_EMOJI.has(v.id) || v.emoji === undefined) return v;
  const { emoji: _withheld, ...rest } = v;
  return rest;
});

/** Category list (id, Sanskrit name, English name, emoji), in display order. */
export const VOCAB_CATEGORIES: readonly VocabCategory[] = VOCAB_CATEGORY_DATA;

/** Cumulative: every entry a learner at `level` may be shown (e.level <= level). */
export function vocabForLevel(level: Level): VocabEntry[] {
  return VOCAB.filter((e) => e.level <= level);
}

/** Entries of one category, optionally limited (cumulatively) to a level. Unknown category → []. */
export function vocabByCategory(category: string, level?: Level): VocabEntry[] {
  return VOCAB.filter((e) => e.category === category && (level === undefined || e.level <= level));
}

export const meta: PackMeta = {
  id: 'vocab',
  title: 'Śabdakośaḥ — everyday vocabulary',
  version: '1.0.0',
  description:
    'High-frequency everyday words (nouns with gender, adjectives, indeclinables, verbs in laṭ 3rd singular, pronoun forms, courtesy phrases) in thematic categories, each verified against dictionaries and conjugation tables.',
  license: 'Original word selection and glosses; dictionaries were consulted for verification only — see README.md → “Sources and licences”',
  sources: [
    'Monier-Williams Sanskrit-English Dictionary (Cologne Digital Sanskrit Lexicon, csl-orig) — lookup only',
    'V. S. Apte, The Practical Sanskrit-English Dictionary, 1890 (Cologne, csl-orig) — lookup only',
    'Amarakośa with liṅga (ashtadhyayi.com kosha/amara.json) — lookup only',
    'Conjugation tables: ashtadhyayi.com (vidyut-prakriya) and Sanskrit Heritage (sanskrit/data roots.csv) — lookup only',
    'Digital Corpus of Sanskrit sample (ambuda-org/dcs, CC BY 4.0) — corpus attestation',
    'SHABDA pack of this repository (pronoun forms, declension models)',
    'Spoken-Sanskrit usage of Samskrita Bharati for modern coinages (tagged usage:samskrita-bharati)',
  ],
  count: VOCAB.length,
};
