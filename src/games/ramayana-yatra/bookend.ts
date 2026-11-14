/**
 * The end of a book (v0.5a, fx-end). PURE: no React, no DOM. Used by view-bookend.tsx (the in-game book-complete
 * screen) and Game.tsx (the session result's game-provided strings).
 *
 *   bookName(content, k)        the book's name: English, Sanskrit, and the Sanskrit pada form before a consonant
 *   bookStats(state, content…)  the three numbers of the screen, for one book
 *   saResult(result, …)         the session result's summary / share / review rows in Sanskrit (a reader of संस्कृतम्)
 *
 * Every Sanskrit word comes from content (names.json, verse text) or from interface keys in content/sa-ui-katha.json
 * (`bookEnd.*`, oracle-verified by sa-ui.test.ts). The only rule applied in code is anusvāra before a consonant
 * (Aṣṭādhyāyī 8.3.23 मोऽनुस्वारः): बालकाण्डम् + समाप्तम् → बालकाण्डं समाप्तम्; bookend.test.ts checks it against the
 * sandhi engine (joinSandhiDeva) for every book name.
 */
import type { ReviewItem, SessionResult } from '@sdk';
import { toDevaDigits } from '@sanskrit';
import type { GameContent, GameState } from './types';
import { uiSa } from './sa-ui';

/** A word-final म् written as anusvāra, as before a consonant (8.3.23); other words unchanged. */
export function beforeConsonant(word: string): string {
  return word.endsWith('म्') ? `${word.slice(0, -2)}ं` : word;
}

export interface BookName {
  /** "Bāla Kāṇḍa" (names.json en, before " · ") */
  en: string;
  /** "बालकाण्डम्" */
  sa: string;
  /** "बालकाण्डं": the form before a consonant (समाप्तम्, प्रति) */
  saPada: string;
}

export function bookName(content: GameContent, k: number): BookName {
  const n = content.names.find((x) => x.id === `kanda.${k}`);
  const en = (n?.en ?? `Book ${k}`).split(' · ')[0] ?? `Book ${k}`;
  const sa = n?.sa ?? '';
  return { en, sa, saPada: beforeConsonant(sa) };
}

/** Where a book's counters started in this session (the view keeps one; zeros at the session start). */
export interface BookMark {
  recited: number;
  correct: number;
  total: number;
}
export const ZERO_MARK: BookMark = { recited: 0, correct: 0, total: 0 };

export interface BookStats {
  kanda: number;
  /** the book's verses (ChapterDef.shlokaIds, in story order) */
  verses: string[];
  heard: number;
  restored: number;
  /** lines recited since the mark (Kathā: smarana answers counted by the view) */
  recited: number;
  /** practice: questions answered right / answered since the mark */
  correct: number;
  answered: number;
}

/**
 * The numbers of the book-complete screen for book `kanda`: how many of the book's verses are heard / restored (the
 * save), and the lines recited / questions answered since `mark` (this sitting, since the book began or the session
 * started). `recitedNow` = the view's running count of recitation lines this session.
 */
export function bookStats(state: GameState, content: GameContent, kanda: number, mark: BookMark, recitedNow: number): BookStats {
  const ch = content.chapters.find((c) => c.kanda === kanda);
  const have = new Set(content.shlokas.map((s) => s.id));
  const verses = (ch?.shlokaIds ?? content.shlokas.filter((s) => s.kanda === kanda).map((s) => s.id)).filter((id) => have.has(id));
  const sh = state.save.shlokas;
  return {
    kanda,
    verses,
    heard: verses.filter((id) => sh[id]?.heard).length,
    restored: verses.filter((id) => sh[id]?.restored).length,
    recited: Math.max(0, recitedNow - mark.recited),
    correct: Math.max(0, state.session.correct - mark.correct),
    answered: Math.max(0, state.session.total - mark.total),
  };
}

/** The verse-bound moves (astras) a verse gives when it is restored (defs.json `unlockShloka`). */
export function astrasOf(content: GameContent, shlokaId: string): string[] {
  return content.moves.filter((m) => m.unlockShloka === shlokaId).map((m) => m.id);
}

/** Citation of a verse in Sanskrit: the book's name and the numbers in Devanagari ("बालकाण्डम् १.२.१५"). */
export function verseRefSa(content: GameContent, shlokaId: string): string {
  const s = content.shlokas.find((x) => x.id === shlokaId);
  if (!s) return '';
  const n = bookName(content, s.kanda).sa;
  return `${n ? `${n} ` : ''}${toDevaDigits(`${s.kanda}.${s.sarga}.${s.verse}`)}`;
}

const nonEmpty = (xs: (string | undefined)[]): string[] => xs.filter((x): x is string => !!x);

/** The "Book 1 complete" part of the summary in Sanskrit. */
function booksSa(state: GameState, content: GameContent): string | undefined {
  const books = [...state.session.chaptersCompleted].sort((a, b) => a - b);
  if (books.length === 1) {
    const b = bookName(content, books[0]!);
    return uiSa(content, 'bookEnd.title', { book: { en: b.en, sa: b.saPada } });
  }
  if (books.length > 1) return uiSa(content, 'bookEnd.resultBooks', { list: { en: books.join(', '), sa: toDevaDigits(books.join(', ')) } });
  return uiSa(content, 'bookEnd.resultOpen', { k: state.save.chapter });
}

/**
 * The session result for a reader of संस्कृतम् (save.reader 'sa'): the game-provided strings the shell shows (summary,
 * share, review rows) in Sanskrit. Same contract and numbers as the English result (outcome, score, correct / total,
 * best, mastery unchanged). Kathā (`katha`): verses heard · lines recited · verses restored, and one row per verse met
 * (the first pāda, its citation, what happened to it). Practice: books · verses restored · right answers; the review
 * rows stay the words practised (lemma + its English meaning: the meaning being taught). `recited`: shlokaId → lines.
 * `render` turns Devanagari into the player's script (the shell prints these strings as they are).
 */
export function saResult(result: SessionResult, state: GameState, content: GameContent, katha: boolean, recited: ReadonlyMap<string, number>, render: (deva: string) => string = (x) => x): SessionResult {
  const ss = state.session;
  const head = booksSa(state, content);
  if (!head) return result;
  if (!katha) {
    const summary = nonEmpty([head, uiSa(content, 'bookEnd.resultRestored', { n: ss.shlokasRestored.length }), uiSa(content, 'bookEnd.resultRight', { c: ss.correct, t: ss.total })]).join(' · ');
    return { ...result, summary: render(summary), share: render(summary) };
  }
  const heard = new Set(ss.shlokasHeard);
  const restored = new Set(ss.shlokasRestored);
  const lines = [...recited.values()].reduce((a, b) => a + b, 0);
  const summary = nonEmpty([
    head,
    uiSa(content, 'bookEnd.resultHeard', { n: heard.size }),
    uiSa(content, 'bookEnd.resultRecited', { n: lines }),
    uiSa(content, 'bookEnd.resultRestored', { n: restored.size }),
  ]).join(' · ');
  const order = [...content.chapters].sort((a, b) => a.kanda - b.kanda).flatMap((c) => c.shlokaIds);
  const ids = [...new Set([...order, ...content.shlokas.map((s) => s.id)])].filter((id) => heard.has(id) || restored.has(id) || recited.has(id));
  const review: ReviewItem[] = ids.flatMap((id) => {
    const sh = content.shlokas.find((x) => x.id === id);
    if (!sh) return [];
    const n = recited.get(id) ?? 0;
    const note = nonEmpty([heard.has(id) ? uiSa(content, 'common.heard') : undefined, n ? uiSa(content, 'bookEnd.resultRecited', { n }) : undefined, restored.has(id) ? uiSa(content, 'verses.restored') : undefined]).join(' · ');
    return [{ sa: sh.padas[0] ?? '', en: render(verseRefSa(content, id)), note: render(note), correct: true }];
  });
  return { ...result, summary: render(summary), share: render(summary), review };
}
