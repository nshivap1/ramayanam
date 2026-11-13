/**
 * Smṛti-yugalam — pure logic for a memory/concentration game.
 * State is immutable; `flip` and `settle` are the only transitions. No timers here: the UI
 * decides when to call `settle` after showing a mismatch.
 */
import { devaToIast } from '@sanskrit';
import { createRng } from '@sdk';

export interface Card {
  /** Index on the board. */
  index: number;
  /** Pair key (the akṣara). Two cards share a key. */
  key: string;
  /** Which face of the pair this card shows. */
  face: 'deva' | 'sound';
  /** Text on the card: the akṣara (Devanagari) or its romanised sound. */
  label: string;
}

export interface State {
  cards: Card[];
  /** Indices currently face up but not yet matched (0–2 entries). */
  open: number[];
  matched: string[];
  moves: number;
  mismatches: number;
  /** True while two non-matching cards are showing; call `settle` to turn them back. */
  pending: boolean;
  done: boolean;
}

/** Letters that are easy to mix up are dealt together to make the board interesting. */
export const DECK: readonly string[] = [
  'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ',
  'क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ', 'ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न',
  'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह', 'क्ष', 'ज्ञ', 'त्र', 'श्र',
];

export const PAIRS = 8;

export function deal(seed: number, pairs: number = PAIRS): State {
  const rng = createRng(seed);
  const keys = rng.sample(DECK, pairs);
  const faces = keys.flatMap((key): Omit<Card, 'index'>[] => [
    { key, face: 'deva', label: key },
    { key, face: 'sound', label: devaToIast(key) },
  ]);
  const cards = rng.shuffle(faces).map((c, index) => ({ ...c, index }));
  return { cards, open: [], matched: [], moves: 0, mismatches: 0, pending: false, done: false };
}

export function isFaceUp(state: State, index: number): boolean {
  const card = state.cards[index];
  return card !== undefined && (state.open.includes(index) || state.matched.includes(card.key));
}

/** Flip a card. Ignored if the card is already face up, the board is waiting to settle, or the game is over. */
export function flip(state: State, index: number): State {
  const card = state.cards[index];
  if (!card || state.done || state.pending || isFaceUp(state, index)) return state;
  if (state.open.length === 0) return { ...state, open: [index] };
  const first = state.cards[state.open[0] as number] as Card;
  const moves = state.moves + 1;
  if (first.key === card.key) {
    const matched = [...state.matched, card.key];
    return { ...state, open: [], matched, moves, done: matched.length * 2 === state.cards.length };
  }
  return { ...state, open: [first.index, index], moves, mismatches: state.mismatches + 1, pending: true };
}

/** Turn a mismatched pair face down again. */
export function settle(state: State): State {
  return state.pending ? { ...state, open: [], pending: false } : state;
}

/** 3 stars: near-perfect memory; 2: reasonable; 1: finished. */
export function starsFor(moves: number, pairs: number): 1 | 2 | 3 {
  if (moves <= pairs + Math.ceil(pairs / 2)) return 3;
  if (moves <= pairs * 2 + 2) return 2;
  return 1;
}

export function score(state: State): number {
  const pairs = state.cards.length / 2;
  return Math.max(10, pairs * 20 - state.mismatches * 5);
}

/** Emoji summary for sharing: one square per pair, green if found without a mismatch involving it is unknowable, so we show moves. */
export function shareGrid(state: State): string {
  const pairs = state.cards.length / 2;
  const stars = starsFor(state.moves, pairs);
  return `${'🟪'.repeat(pairs)}\n${'⭐'.repeat(stars)} ${state.moves} moves`;
}
