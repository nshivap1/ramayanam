/**
 * Nala's bridge (v0.5b P5, OWNER: WP-D; notes/v05b-plan.md §2 scene 12, Yuddha 6.22). view-panel.tsx routes the 'setu'
 * pending here. Logic: logic-setu.ts.
 *
 * One row: the shore, five stones (the five days of building, 14 · 20 · 21 · 22 · 23 yojanas, Yuddha 6.22.66–70), Laṅkā.
 * Each stone is a span of the bridge seen from the side — sky above, the sea below, the stone deck across the middle —
 * drawn turned by `cells[i]` quarters; a tap turns it a quarter (clockwise, always forward, so 3 → 0 is one more
 * quarter, never a spin back). A stone that sits true is set (gold edge) and stays put. Under each stone, the yojanas of
 * its day; below, the yojanas standing so far of the hundred. One button: "Ask Nala" (the first stone not yet true is
 * marked), then — once the bridge is whole — continue ▶. Keys: 1–5 turn stones, A (Z / Enter / Space) = the button.
 * Test ids: `setu-panel` (data-solved, data-taps, data-hint), `setu-cell-<i>` (data-turn, data-goal, data-set),
 * `setu-advance`. Strings: content/sa-ui-setu.json (keys setu.*). No timer, nothing to lose; reduced motion: no tween.
 */
import { type ReactElement, useRef } from 'react';
import { Button, cx } from '@ui';
import type { Action, SetuPending } from './types';
import { SETU_DAYS, setuBuilt, setuSolved, stoneTurnsLeft } from './logic-setu';
import { useButtons } from './view-common';
import { useUi } from './view-ui';

/** The angle each stone is drawn at: starts at turn × 90°, and every turn adds its quarter (never spins back). */
function useAngles(p: SetuPending): number[] {
  const ref = useRef<{ tag: string; cells: number[]; angles: number[] } | null>(null);
  const q = 360 / Math.max(1, p.turns);
  const r = ref.current;
  if (!r || r.tag !== p.tag || r.cells.length !== p.cells.length) ref.current = { tag: p.tag, cells: p.cells.slice(), angles: p.cells.map((c) => c * q) };
  else if (r.cells.some((c, i) => c !== p.cells[i])) {
    const t = Math.max(1, p.turns);
    ref.current = { tag: p.tag, cells: p.cells.slice(), angles: r.angles.map((a, i) => a + ((((p.cells[i] ?? 0) - (r.cells[i] ?? 0)) % t) + t) % t * q) };
  }
  return ref.current!.angles;
}

/** One span of the bridge, upright: sky, sun, the deck across the middle, rocks under it, the sea with two waves. */
function Span(): ReactElement {
  return (
    <svg className="g-ramayana-yatra__setu-span" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect className="g-ramayana-yatra__setu-sky" x="0" y="0" width="40" height="22" />
      <circle className="g-ramayana-yatra__setu-sun" cx="32" cy="7" r="3.5" />
      <rect className="g-ramayana-yatra__setu-sea" x="0" y="22" width="40" height="18" />
      <path className="g-ramayana-yatra__setu-wave" d="M1 31q2.5-2.5 5 0t5 0t5 0t5 0t5 0t5 0t5 0t5 0M4 37q2.5-2.5 5 0t5 0t5 0t5 0t5 0t5 0" />
      <path className="g-ramayana-yatra__setu-rock" d="M13 24l3 8h8l3-8z" />
      <rect className="g-ramayana-yatra__setu-deck" x="0" y="16" width="40" height="8" />
      <path className="g-ramayana-yatra__setu-seam" d="M10 16v8M20 16v8M30 16v8" />
    </svg>
  );
}

/** The two ends: the shore (sand, a palm) and Laṅkā (a golden wall and tower), with the deck's end at mid height. */
function End({ lanka }: { lanka: boolean }): ReactElement {
  return (
    <svg className="g-ramayana-yatra__setu-end-art" viewBox="0 0 20 40" aria-hidden="true" focusable="false">
      <rect className="g-ramayana-yatra__setu-sky" x="0" y="0" width="20" height="22" />
      <rect className="g-ramayana-yatra__setu-sea" x="0" y="22" width="20" height="18" />
      {lanka ? (
        <>
          <path className="g-ramayana-yatra__setu-wall" d="M2 24V8h3v-3h3v3h4v-6h3v6h3v16z" />
          <path className="g-ramayana-yatra__setu-seam" d="M5 12h3M12 12h3M5 18h3M12 18h3" />
        </>
      ) : (
        <>
          <path className="g-ramayana-yatra__setu-sand" d="M0 24V16h20v8l-2 14H0z" />
          <path className="g-ramayana-yatra__setu-palm" d="M6 16V5M6 5l-5 3M6 5l5 3M6 5l-3-4M6 5l4-3" />
        </>
      )}
    </svg>
  );
}

export function SetuPanel({ p, dispatch }: { p: SetuPending; dispatch: (a: Action) => void }): ReactElement {
  const ui = useUi();
  const solved = setuSolved(p);
  const angles = useAngles(p);
  const total = SETU_DAYS.reduce((a, b) => a + b, 0);
  const turn = (i: number): void => {
    if (i >= 0 && i < p.cells.length) dispatch({ type: 'choose', index: i });
  };
  const advance = (): void => dispatch({ type: 'advance' });
  useButtons({ a: advance, num: (n) => turn(n - 1) });
  return (
    <div className="g-ramayana-yatra__setu" data-testid="setu-panel" data-solved={solved ? 'true' : 'false'} data-taps={p.taps} data-hint={p.hint ?? undefined}>
      <div className="g-ramayana-yatra__setu-head">
        <p className="g-ramayana-yatra__eyebrow">{ui.t('setu.title')}</p>
        <p className={cx('g-ramayana-yatra__setu-status', solved && 'is-whole')} data-testid="setu-status" aria-live="polite">
          {solved ? ui.t('setu.whole', undefined, { block: true }) : p.hint !== null ? ui.t('setu.hintSay', undefined, { block: true }) : ui.t('setu.help', undefined, { block: true })}
        </p>
      </div>
      <div className={cx('g-ramayana-yatra__setu-strip', solved && 'is-whole')}>
        <div className="g-ramayana-yatra__setu-endcol">
          <div className="g-ramayana-yatra__setu-end" title={ui.plain('setu.shore')}>
            <End lanka={false} />
          </div>
          <span className="g-ramayana-yatra__setu-endname" aria-hidden="true">
            {ui.t('setu.shore', undefined, { gloss: false })}
          </span>
        </div>
        <div className="g-ramayana-yatra__setu-stones" role="group" aria-label={ui.plain('setu.days')}>
          {p.cells.map((c, i) => {
            const set = stoneTurnsLeft(p, i) === 0;
            const y = SETU_DAYS[i] ?? 0;
            const name = `${ui.plain('setu.stone', { n: i + 1, y })}${set ? ` · ${ui.plain('setu.set')}` : ''}`;
            return (
              <div key={i} className="g-ramayana-yatra__setu-col">
                <button
                  type="button"
                  className={cx('g-ramayana-yatra__setu-cell', set && 'is-set', p.hint === i && 'is-hint')}
                  onClick={() => turn(i)}
                  data-testid={`setu-cell-${i}`}
                  data-turn={c}
                  data-goal={p.solution[i]}
                  data-set={set ? 'true' : 'false'}
                  aria-label={name}
                  aria-disabled={set ? true : undefined}
                >
                  <span className="g-ramayana-yatra__setu-turn" style={{ transform: `rotate(${angles[i] ?? 0}deg)` }}>
                    <Span />
                  </span>
                  <span className="g-ramayana-yatra__setu-key" aria-hidden="true">
                    {ui.num(i + 1)}
                  </span>
                </button>
                <span className={cx('g-ramayana-yatra__setu-day', set && 'is-set')} data-testid={`setu-day-${i}`} title={ui.plain('setu.yojanas', { n: y })}>
                  {ui.num(y)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="g-ramayana-yatra__setu-endcol">
          <div className="g-ramayana-yatra__setu-end" title={ui.plain('setu.lanka')}>
            <End lanka />
          </div>
          <span className="g-ramayana-yatra__setu-endname" aria-hidden="true">
            {ui.t('setu.lanka', undefined, { gloss: false })}
          </span>
        </div>
      </div>
      <p className="g-ramayana-yatra__setu-built" data-testid="setu-built" data-n={setuBuilt(p)}>
        {ui.t('setu.built', { n: setuBuilt(p), t: total }, { gloss: false })}
      </p>
      <div className="g-ramayana-yatra__setu-foot">
        {solved ? (
          <Button full onClick={advance} data-testid="setu-advance">
            {ui.t('common.continue', undefined, { gloss: false })}
          </Button>
        ) : (
          <Button full variant="secondary" onClick={advance} data-testid="setu-advance" disabled={p.hint !== null && stoneTurnsLeft(p, p.hint) > 0}>
            {ui.t('setu.ask', undefined, { gloss: false })}
          </Button>
        )}
      </div>
    </div>
  );
}
