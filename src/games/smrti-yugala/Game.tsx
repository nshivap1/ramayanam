import { type ReactElement, useEffect, useRef, useState } from 'react';
import type { GameProps } from '@sdk';
import { SaText, cx } from '@ui';
import { type State, deal, flip, isFaceUp, score, settle, shareGrid, starsFor } from './logic';

/**
 * Custom-mechanic reference game. Pattern to copy:
 *  - all rules live in logic.ts (pure, seeded); this file only renders state and forwards input
 *  - ctx.hud(...) feeds the shell top bar; ctx.expose(...) publishes what a test bot needs
 *  - ctx.finish(...) exactly once, with score, stars, review, mastery and a share card
 */
export default function Game({ ctx }: GameProps): ReactElement {
  const [state, setState] = useState<State>(() => deal(ctx.seed));
  const finished = useRef(false);
  const pairs = state.cards.length / 2;

  useEffect(() => {
    ctx.hud({ progress: state.matched.length / pairs, label: `${state.moves} moves` });
    ctx.expose({ phase: state.done ? 'done' : state.pending ? 'pending' : 'playing', cards: state.cards.map((c) => ({ index: c.index, key: c.key })), matched: state.matched, moves: state.moves });
  }, [state, ctx, pairs]);

  // Turn a mismatch back after a beat.
  useEffect(() => {
    if (!state.pending) return;
    const t = setTimeout(() => setState((s) => settle(s)), ctx.settings.reducedMotion ? 500 : 900);
    return () => clearTimeout(t);
  }, [state.pending, ctx.settings.reducedMotion]);

  useEffect(() => {
    if (!state.done || finished.current) return;
    finished.current = true;
    const t = setTimeout(
      () =>
        ctx.finish({
          outcome: 'won',
          score: score(state),
          stars: starsFor(state.moves, pairs),
          summary: `${pairs} pairs in ${state.moves} moves`,
          best: { label: 'Fewest moves', value: state.moves, lowerIsBetter: true },
          share: shareGrid(state),
          review: state.matched.map((key) => ({ sa: key, en: state.cards.find((c) => c.key === key && c.face === 'sound')?.label, correct: true })),
          mastery: state.matched.map((key) => ({ skill: 'akshara' as const, itemId: `akshara:pair:${key}`, correct: true })),
        }),
      600,
    );
    return () => clearTimeout(t);
  }, [state, ctx, pairs]);

  const onFlip = (index: number): void => {
    const next = flip(state, index);
    if (next === state) return;
    if (next.matched.length > state.matched.length) {
      ctx.sfx('correct');
      ctx.haptic('success');
      ctx.announce('Pair found');
    } else if (next.pending) {
      ctx.sfx('wrong');
    } else ctx.sfx('tap');
    setState(next);
  };

  return (
    <div className="sk-stage g-smrti-yugala">
      <div className="g-smrti-yugala__board" role="grid" aria-label="Memory board">
        {state.cards.map((c) => {
          const up = isFaceUp(state, c.index);
          const matched = state.matched.includes(c.key);
          return (
            <button
              key={c.index}
              type="button"
              className={cx('g-smrti-yugala__card', up && 'is-up', matched && 'is-matched', state.pending && state.open.includes(c.index) && 'is-miss')}
              onClick={() => onFlip(c.index)}
              aria-label={up ? c.label : `Card ${c.index + 1}, face down`}
              aria-disabled={up}
              data-testid={`card-${c.index}`}
              data-up={up ? 'true' : 'false'}
            >
              <span className="g-smrti-yugala__face">{up ? c.face === 'deva' ? <SaText script="deva">{c.label}</SaText> : <span className="g-smrti-yugala__sound">{c.label}</span> : <span aria-hidden="true">ॐ</span>}</span>
            </button>
          );
        })}
      </div>
      <p className="sk-muted sk-small">
        {state.matched.length} / {pairs} pairs
      </p>
    </div>
  );
}
