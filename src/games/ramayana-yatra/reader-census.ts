/**
 * Challenge census for reader.test.ts (v0.4.3, fx-level). TEST-SIDE module (not imported by the game): it draws the
 * classic challenges a player meets — practice battle moves (makeChallenge per kind), the Kathā study hall round and a
 * practice shrine recital — over seeds × levels × chapters, so a test can count kinds per reader and hash the draws.
 */
import type { Level } from '@sdk';
import type { Challenge, ChallengeKind, GameContent, GameState, Reader } from './types';
import { KIND_ORDER, makeChallenge, markHeard, recitalQueue, startStudy } from './logic-learning';
import { kathaSave } from './logic-katha';
import { newGame } from './logic-state';

export interface CensusDraw {
  where: 'battle' | 'study' | 'recital';
  seed: number;
  level: Level;
  chapter: number;
  /** the kind asked for (battle: the move's kind; study: the round's slot; recital: '') */
  asked: ChallengeKind | '';
  challenge: Challenge;
}

/** A state at the start of `chapter` with every verse of books 1..chapter heard (Kathā: style katha). */
export function censusState(content: GameContent, seed: number, level: Level, chapter: number, opts: { reader?: Reader; katha?: boolean } = {}): GameState {
  const g = newGame(seed, level, content, { name: 'Census', avatar: 'a' });
  let save = { ...g.save, chapter: chapter as GameState['save']['chapter'], completedChapters: Array.from({ length: chapter - 1 }, (_, i) => (i + 1) as GameState['save']['chapter']) };
  if (opts.katha) save = kathaSave(save, 'katha');
  if (opts.reader) save = { ...save, reader: opts.reader };
  let s: GameState = { ...g, mode: 'explore', script: null, pending: null, save };
  for (const sh of content.shlokas) if (sh.kanda <= chapter) s = markHeard(s, content, sh.id);
  return { ...s, fx: [] };
}

/**
 * The draws: per seed × level × chapter, one battle challenge of every kind (KIND_ORDER: a practice move of that kind),
 * one Kathā study-hall round (STUDY_ROUND challenges) and one practice recital of the chapter's first verse.
 */
export function census(content: GameContent, seeds: number[], levels: Level[], chapters: number[], reader?: Reader): CensusDraw[] {
  const out: CensusDraw[] = [];
  for (const seed of seeds)
    for (const level of levels)
      for (const chapter of chapters) {
        let s = censusState(content, seed, level, chapter, reader ? { reader } : {});
        for (const kind of KIND_ORDER) {
          const r = makeChallenge(s, content, kind);
          s = r.state;
          out.push({ where: 'battle', seed, level, chapter, asked: kind, challenge: r.challenge });
        }
        const k = startStudy(censusState(content, seed, level, chapter, { katha: true, ...(reader ? { reader } : {}) }), content);
        for (const ch of k.recital?.queue ?? []) out.push({ where: 'study', seed, level, chapter, asked: '', challenge: ch });
        const verse = content.shlokas.find((x) => x.kanda === chapter);
        if (verse) for (const ch of recitalQueue(s, content, verse.id).queue) out.push({ where: 'recital', seed, level, chapter, asked: '', challenge: ch });
      }
  return out;
}

/** Kind counts of a census (study / battle / recital together or one of them). */
export function kindCounts(draws: CensusDraw[], where?: CensusDraw['where']): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of KIND_ORDER) out[k] = 0;
  for (const d of draws) if (!where || d.where === where) out[d.challenge.kind] = (out[d.challenge.kind] ?? 0) + 1;
  return out;
}
