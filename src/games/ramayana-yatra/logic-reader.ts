/**
 * Reader level (v0.4.3, fx-level). OWNER: core. Pure.
 *
 * The view mirrors its story-text language (`prefs.dialogueLang`) into the save with the action `set-reader`
 * (`save.reader`: 'sa' = संस्कृतम् only, 'sa-en' = संस्कृतम् + English, absent = English). The learning engine reads it
 * (logic-learning `readerChain`, `unlockedKinds`): a reader of Devanagari never gets `lipi` (script) challenges, and a
 * संस्कृतम्-only reader is never asked the meaning (`artha`) of a basic word and gets the harder kinds first.
 * A save without `reader` plays exactly as before (the practice snapshot and the census hash in reader.test.ts).
 *
 * BASIC words (the rule, from data; PRD → Challenge mix per story-text language):
 *  1. every indeclinable, pronoun and numeral (BASIC_POS: च, वा, अपि, एव, इति, न, सः, अहम्, एक …);
 *  2. a noun / adjective whose stem is an everyday-vocabulary (@content/vocab) word of level ≤ 2 in the same class and
 *     sense, and a verb whose root is a dhātu (@content/dhatu) of level ≤ 2 in the same sense — precomputed into
 *     content/reader.json by reader-basic.ts (so the game never bundles the packs; reader.test.ts keeps it in step).
 *  Everything else (compounds, participles, rarer words: धर्मज्ञः, कृतज्ञः, अनिर्वेदः …) is a harder verse word.
 */
import type { GameState, LexEntry, PartOfSpeech, Reader, SaveData } from './types';
import readerJson from './content/reader.json';

/** Closed word classes: always basic for a reader of संस्कृतम्. */
export const BASIC_POS: ReadonlySet<PartOfSpeech> = new Set<PartOfSpeech>(['indeclinable', 'pronoun', 'numeral']);

/** Open-class basic words (rule 2), keyed by lexId, with the lemma they were derived for. */
export const READER_BASIC: Readonly<Record<string, { lemma: string; by: string }>> = (readerJson as unknown as { basic: Record<string, { lemma: string; by: string }> }).basic;

export const READERS: readonly Reader[] = ['sa', 'sa-en'];

/** 'sa' / 'sa-en' as a Reader; anything else (English, null, junk) → undefined (= English). */
export function toReader(v: unknown): Reader | undefined {
  return v === 'sa' || v === 'sa-en' ? v : undefined;
}

/** The save's reader level (undefined = English). */
export function readerOf(save: Pick<SaveData, 'reader'>): Reader | undefined {
  return toReader(save.reader);
}

/** True for a word a संस्कृतम् reader knows (never asked for its meaning in 'sa'). Unknown entry → false. */
export function isBasicWord(e: LexEntry | undefined): boolean {
  if (!e) return false;
  return BASIC_POS.has(e.pos) || READER_BASIC[e.id]?.lemma === e.lemma;
}

/**
 * The action `set-reader`: 'sa' / 'sa-en' set `save.reader`; 'en' / null / undefined remove it (English). Same object
 * when nothing changes or the value is not a reader level. Accepted in every mode (it only changes what the next
 * challenge draws).
 */
export function setReader(state: GameState, reader: unknown): GameState {
  if (reader !== 'en' && reader !== null && reader !== undefined && toReader(reader) === undefined) return state;
  const r = toReader(reader);
  if (state.save.reader === r) return state;
  const { reader: _old, ...rest } = state.save;
  return { ...state, save: r ? { ...rest, reader: r } : rest };
}
