/**
 * The verse-chain duel's pick (v0.5b P6, OWNER: WP-C; notes/v05b-plan.md §4, notes/v05b-c.md). view-panel.tsx routes a
 * challenge of kind 'antya' here.
 *
 * One turn, one tap: the opponent's line on top (its key akṣara highlighted — the last sound, shown again on its own
 * beside the question), then three full heard pādas as stacked chips (keys 1–3, `opt-<id>`; the first akṣara of each
 * underlined). The chips arm 300 ms after they appear (a press that began before is ignored, as in the recitation
 * panel). A pick recites itself: the line lights up akṣara by akṣara; a miss dims the pick and the right line shimmers
 * in and is said instead. Then the answer is sent (no feedback panel; the battle beats follow). A / Enter hurries the
 * line. Reduced motion: no per-akṣara light, a short hold. A chain that was reset ("any line") asks for any line: every
 * chip is right. All Sanskrit on screen is the content's (pādas) or content/sa-ui-chain.json (keys chain.*).
 */
import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { SaText, cx, renderSa, useLatest, usePaused } from '@ui';
import { splitAksharas } from '@sanskrit';
import type { Action, GameState, Pending } from './types';
import { chainKeyAt } from './logic-chain';
import { useButtons, useEnv } from './view-common';
import { useUi } from './view-ui';

type ChallengePending = Extract<Pending, { kind: 'challenge' }>;

/** chips armed after they appear; one akṣara of the said line; the hold after it (longer after a miss) */
const ARM_MS = 300;
const SAY_MS = 110;
const HOLD_MS = 450;
const HOLD_MISS_MS = 800;
const MISS_LEAD_MS = 600;

type Phase = 'asking' | 'saying' | 'done';

/** A line as words of akṣaras (spaces kept between words), with the flat index of each akṣara. */
function wordsOf(line: string): { aks: string[]; at: number }[] {
  let n = 0;
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const aks = splitAksharas(w);
      const out = { aks, at: n };
      n += aks.length;
      return out;
    });
}

/** A line drawn akṣara by akṣara: `key` the akṣara to highlight, `head` underline the first, `lit` how many are said. */
function Line({ text, keyAt, head, lit, className, testid }: { text: string; keyAt?: number; head?: boolean; lit?: number; className?: string; testid?: string }): ReactElement {
  const words = useMemo(() => wordsOf(text), [text]);
  return (
    <span className={cx('g-ramayana-yatra__chain-line', className)} data-testid={testid} aria-hidden="true">
      {words.map((w, i) => (
        <span key={i} className="g-ramayana-yatra__chain-w">
          {w.aks.map((a, j) => {
            const k = w.at + j;
            return (
              <SaText key={j} className={cx('g-ramayana-yatra__chain-ak', k === keyAt && 'is-key', head && k === 0 && 'is-head', lit !== undefined && (k < lit ? 'is-lit' : 'is-dark'))} {...(k === keyAt ? { 'data-testid': 'chain-key-ak' } : {})}>
                {a}
              </SaText>
            );
          })}
        </span>
      ))}
    </span>
  );
}

export function ChainPanel({ pending, state, dispatch, onTimeLeft }: { pending: ChallengePending; state: GameState; dispatch: (a: Action) => void; onTimeLeft: (ms: number | undefined) => void }): ReactElement | null {
  void onTimeLeft; // untimed (Kathā)
  const ch = pending.challenge;
  if (!ch.antya || !ch.options) return null;
  return <ChainTurn key={ch.id} pending={pending} state={state} dispatch={dispatch} />;
}

function ChainTurn({ pending, state, dispatch }: { pending: ChallengePending; state: GameState; dispatch: (a: Action) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const ch = pending.challenge;
  const spec = ch.antya!;
  const options = ch.options ?? [];
  const answers = ch.answers ?? [];
  const reduced = env.reduced;
  const paused = usePaused();
  const sh = spec.prev ? env.idx.shloka.get(spec.prev.shlokaId) : undefined;
  const prev = spec.prev && sh ? (sh.padas[spec.prev.pada] ?? '').split(/\s+/).filter(Boolean).join(' ') : '';
  const keyAt = prev ? chainKeyAt(prev) : null;
  const foe = state.battle ? env.idx.enemy.get(state.battle.foe.id) : undefined;
  const who = foe ? env.idx.name.get(foe.nameId) : undefined;

  const [phase, setPhase] = useState<Phase>('asking');
  const [armed, setArmed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [lit, setLit] = useState(0);
  const [live, setLive] = useState('');
  const armedAt = useRef(Number.POSITIVE_INFINITY);
  const downAt = useRef(0);
  const t0 = useRef(performance.now());
  const sent = useRef(false);
  const chipsRef = useRef<HTMLDivElement | null>(null);

  const ok = picked !== null && answers.includes(picked);
  // the line said: the pick when it links, else the right line (it shimmers in)
  const said = picked === null ? null : ok ? picked : (answers[0] ?? picked);
  const saidText = said ? (options.find((o) => o.id === said)?.sa ?? '') : '';
  const saidAks = useMemo(() => (saidText ? splitAksharas(saidText).length : 0), [saidText]);
  const plain = (s: string): string => renderSa(s, env.script);

  const send = (): void => {
    if (sent.current || picked === null) return;
    sent.current = true;
    dispatch({ type: 'answer', option: picked, timeMs: Math.round(performance.now() - t0.current) });
  };
  const sendRef = useLatest(send);

  // arm the chips once they are on screen; focus the group; one announcement
  useEffect(() => {
    armedAt.current = performance.now() + ARM_MS;
    const t = setTimeout(() => setArmed(true), ARM_MS);
    chipsRef.current?.focus({ preventScroll: true });
    const whoS = who ? plain(who.sa) : '';
    const lineS = plain(prev);
    const keyS = spec.key ? plain(`${spec.key}्`) : '';
    if (prev) setLive(ui.plain(spec.key ? 'chain.srTurn' : 'chain.srAny', { who: { en: whoS, sa: whoS }, line: { en: lineS, sa: lineS }, key: { en: keyS, sa: keyS } }));
    else setLive(ui.plain(spec.key ? 'chain.prompt' : 'chain.any'));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the said line lights up akṣara by akṣara, holds, then the answer is sent
  useEffect(() => {
    if (paused || phase === 'asking') return;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (phase === 'saying') {
      if (reduced) {
        setLit(saidAks);
        setPhase('done');
      } else if (lit >= saidAks) setPhase('done');
      else t = setTimeout(() => setLit(lit + 1), lit === 0 && !ok ? MISS_LEAD_MS : SAY_MS);
    } else t = setTimeout(() => sendRef.current?.(), ok ? HOLD_MS : HOLD_MISS_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lit, paused]);

  const pick = (id: string): void => {
    if (phase !== 'asking' || performance.now() < armedAt.current) return;
    setPicked(id);
    setPhase('saying');
    const good = answers.includes(id);
    const right = good ? (options.find((o) => o.id === id)?.sa ?? '') : (options.find((o) => answers.includes(o.id))?.sa ?? '');
    setLive(good ? plain(right) : ui.plain('chain.srRight', { line: { en: plain(right), sa: plain(right) } }));
  };
  const hurry = (): void => {
    if (phase === 'saying') {
      setLit(saidAks);
      setPhase('done');
    }
  };
  useButtons({
    a: hurry,
    b: () => undefined,
    num: (n) => {
      const o = options[n - 1];
      if (o) pick(o.id);
    },
  });

  const asking = phase === 'asking';
  return (
    <div className="g-ramayana-yatra__chain" data-testid="chain-panel" data-key={spec.key ?? ''} data-phase={phase} data-picked={picked ?? ''} data-correct={picked === null ? '' : ok ? 'true' : 'false'}>
      <div className="g-ramayana-yatra__chain-head">
        <span className="g-ramayana-yatra__astra is-recital" data-testid="chain-badge">
          {ui.t('chain.badge', undefined, { gloss: false })}
        </span>
        {who ? (
          <span className="g-ramayana-yatra__chain-who">
            <SaText>{who.sa}</SaText>
          </span>
        ) : null}
      </div>
      {prev ? (
        <div className="g-ramayana-yatra__chain-prev" data-testid="chain-prev">
          <Line text={prev} {...(keyAt ? { keyAt: keyAt.at } : {})} className="is-prev" testid="chain-prev-line" />
        </div>
      ) : null}
      <p className="g-ramayana-yatra__chain-ask" data-testid="chain-prompt">
        {spec.key ? (
          <>
            <span className="g-ramayana-yatra__chain-last">{ui.t('chain.last', undefined, { gloss: false })}</span>
            <SaText className="g-ramayana-yatra__chain-key" data-testid="chain-key">{`${spec.key}्`}</SaText>
            <span className="g-ramayana-yatra__chain-q">{ui.t('chain.prompt')}</span>
          </>
        ) : (
          <span className="g-ramayana-yatra__chain-q is-any">{ui.t('chain.any')}</span>
        )}
      </p>
      <p className="sk-sr" aria-live="polite" data-testid="chain-live">
        {live}
      </p>
      <div
        className={cx('g-ramayana-yatra__cast-chips g-ramayana-yatra__chain-chips', asking && !armed && 'is-arming')}
        role="group"
        aria-label={ui.plain('chain.chips')}
        tabIndex={-1}
        ref={chipsRef}
        data-testid="chain-chips"
        data-armed={armed && asking ? 'true' : 'false'}
      >
        {options.map((o, n) => {
          const isSaid = said === o.id;
          return (
            <button
              key={o.id}
              type="button"
              className={cx('g-ramayana-yatra__cast-chip g-ramayana-yatra__chain-chip', picked === o.id && (ok ? 'is-picked' : 'is-dim'), !ok && picked !== null && isSaid && 'is-right', picked !== null && !isSaid && picked !== o.id && 'is-off')}
              disabled={!asking}
              aria-label={plain(o.sa ?? '')}
              onPointerDown={() => {
                downAt.current = performance.now();
              }}
              onClick={(e) => {
                // a pointer press that began before the chips were armed is ignored (keyboard clicks have detail 0)
                if (e.detail !== 0 && downAt.current < armedAt.current) return;
                pick(o.id);
              }}
              data-testid={`opt-${o.id}`}
            >
              <span className="g-ramayana-yatra__cast-key" aria-hidden="true">
                {n + 1}
              </span>
              <Line text={o.sa ?? ''} head className="is-chip" {...(isSaid && !reduced ? { lit } : {})} />
              {picked === o.id && !ok ? (
                <span className="g-ramayana-yatra__cast-x" aria-hidden="true" data-testid="chain-miss-mark">
                  ✗
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
