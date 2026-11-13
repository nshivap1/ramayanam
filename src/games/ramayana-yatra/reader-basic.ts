/**
 * Which lexicon words are BASIC for a reader of संस्कृतम् (v0.4.3, fx-level). TEST-SIDE module: it reads the platform
 * packs (@content/vocab, @content/dhatu) to derive the list that content/reader.json stores, so the game bundle never
 * ships the packs; reader.test.ts checks that the stored list equals this derivation (logic-reader.ts uses the list).
 *
 * The rule (also in PRD.md → Challenge mix per story-text language):
 *  1. closed word classes are basic: every indeclinable (च, वा, अपि, एव, इति, न …), pronoun (सः, अहम्, किम् …) and numeral
 *     (एक) — logic-reader BASIC_POS, decided at run time from `pos`;
 *  2. a noun / adjective whose stem is an everyday-vocabulary (@content/vocab) entry of level ≤ 2 (Śibira, Praveśa) in the
 *     same word class (an adjective may match a pronominal entry: सर्व) and in the same sense (the glosses share a word);
 *  3. a verb whose root is a dhātu (@content/dhatu) of level ≤ 2 in the same sense (the glosses share a word: विद् "to
 *     know" is level 3 and not basic, although विद् "to exist" is level 2).
 *  Everything else — compounds, participles, rarer nouns/adjectives and verbs — is a harder verse word (धर्मज्ञः, कृतज्ञः,
 *  अनिर्वेदः, ब्रूहि …). Names are never asked for their meaning anyway (buildArtha).
 */
import { DHATUS } from '@content/dhatu';
import { VOCAB } from '@content/vocab';
import { spellingKey } from '@sanskrit';
import type { LexEntry } from './types';
import { sharesContentWord } from './logic-learning';

/** Highest pack level that counts as basic (1 = Śibira everyday words, 2 = Praveśa). */
export const BASIC_LEVEL = 2;

export interface BasicEntry {
  lemma: string;
  /** the pack entry that makes the word basic: `vocab:<id> L<n>` or `dhatu:<id> L<n>` */
  by: string;
}

const sk = (s: string): string => spellingKey(s);

/** Rules 2–3 over a lexicon (rule 1 is decided at run time from `pos`). Keyed by lexId, in lexicon order. */
export function deriveBasic(lexicon: readonly LexEntry[]): Record<string, BasicEntry> {
  const out: Record<string, BasicEntry> = {};
  for (const e of lexicon) {
    if (out[e.id]) continue;
    if (e.pos === 'noun' || e.pos === 'adjective') {
      const classes = e.pos === 'noun' ? ['noun'] : ['adjective', 'pronoun'];
      const hit = VOCAB.filter((v) => v.level <= BASIC_LEVEL && classes.includes(v.pos) && [v.stem, v.sa].some((x) => x !== undefined && sk(x) === sk(e.lemma)) && sharesContentWord(e.meaning, v.en)).sort((a, b) => a.level - b.level)[0];
      if (hit) out[e.id] = { lemma: e.lemma, by: `vocab:${hit.id} L${hit.level}` };
    } else if (e.pos === 'verb') {
      const hit = DHATUS.filter((d) => sk(d.dhatu) === sk(e.lemma) && sharesContentWord(e.meaning, d.en)).sort((a, b) => a.level - b.level)[0];
      if (hit && hit.level <= BASIC_LEVEL) out[e.id] = { lemma: e.lemma, by: `dhatu:${hit.id} L${hit.level}` };
    }
  }
  return out;
}
