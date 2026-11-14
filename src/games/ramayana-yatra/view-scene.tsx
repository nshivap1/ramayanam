/**
 * Story set pieces in Kathā (v0.5b, OWNER: WP-A; notes/v05b-plan.md §1 P1–P2). view-panel.tsx routes here:
 *   SceneRecite  P1, a story recitation (challenge pending with context 'scene'): the recitation panel (RecitePanel)
 *                under a small head — "your line" and the pāda's metre (its syllables, e.g. ८ अक्षराणि: Vālmīki's
 *                "four quarters, eight syllables in each"); the player's very first recitation also gets the coach line
 *                (how to fill the gap). A miss shows the right word in the line, then the script carries on.
 *   BookReview   P2, the `{book}` review (pending 'book'): the book-complete screen in review mode (view-bookend
 *                BookEnd `review`, bookStats; lines recited = this session's recitations of the book's verses), ▶.
 * Strings: content/sa-ui-scene.json (keys `scene.*`); the coach line is the tutorial duel's (`katha.coach`).
 */
import { type ReactElement, useState } from 'react';
import type { Action, GameState, Pending } from './types';
import { ZERO_MARK, bookStats } from './bookend';
import { firstRecitation, sceneMeter } from './logic-scene';
import { BookEnd } from './view-bookend';
import { useEnv } from './view-common';
import { RecitePanel } from './view-katha';
import { useUi } from './view-ui';

type ChallengePending = Extract<Pending, { kind: 'challenge' }>;

/** P1: the player says the story's pāda (one gap, or a mastered pāda reciting itself). */
export function SceneRecite({ pending, state, dispatch }: { pending: ChallengePending; state: GameState; dispatch: (a: Action) => void }): ReactElement {
  const ui = useUi();
  const spec = pending.challenge.smarana;
  const meter = spec ? sceneMeter(spec) : null;
  // decided once, as the panel opens (the answer records the pāda before the panel goes)
  const [coach] = useState(() => !!spec && spec.gaps.length > 0 && firstRecitation(state.save));
  return (
    <div className="g-ramayana-yatra__scene" data-testid="scene-recite" data-coach={coach ? 'true' : undefined}>
      <div className="g-ramayana-yatra__scene-head">
        <span className="g-ramayana-yatra__scene-your" data-testid="scene-your">
          {ui.t('scene.your', undefined, { gloss: false })}
        </span>
        {meter && meter.syllables > 0 ? (
          <span className="g-ramayana-yatra__scene-meter" data-testid="scene-meter" data-n={meter.syllables} data-weights={meter.weights || undefined}>
            {ui.t('scene.syllables', { n: meter.syllables }, { gloss: false })}
          </span>
        ) : null}
      </div>
      {coach ? (
        <p className="g-ramayana-yatra__scene-coach" data-testid="scene-coach">
          {ui.t('katha.coach')}
        </p>
      ) : null}
      <RecitePanel pending={pending} state={state} dispatch={dispatch} />
    </div>
  );
}

/** P2: a read-only review of book `kanda`; ▶ (button `book-continue`, or A) continues the story. */
export function BookReview({ kanda, state, recited, dispatch }: { kanda: number; state: GameState; recited?: ReadonlyMap<string, number>; dispatch: (a: Action) => void }): ReactElement {
  const env = useEnv();
  // lines recited of THIS book's verses in this session (BookEnd counts from the mark: zero)
  const verses = bookStats(state, env.content, kanda, ZERO_MARK, 0).verses;
  const lines = verses.reduce((n, id) => n + (recited?.get(id) ?? 0), 0);
  return <BookEnd key={kanda} kanda={kanda} state={state} mark={ZERO_MARK} recitedNow={lines} onNext={null} onStop={() => dispatch({ type: 'advance' })} review />;
}
