/**
 * Challenge and feedback panels (view agent). Choice kinds use @ui <Choice> with 1–4 hotkeys;
 * krama is tap-to-order with undo. A countdown (useCountdown) reports to the shell HUD.
 */
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { Button, Chip, Choice, FeedbackBar, SaText, cx, useCountdown } from '@ui';
import { Markup, SaMarkup, StoryLine } from './view-markup';
import { KIND_EN, VerseRef, useButtons, useEnv } from './view-common';
import { useUi } from './view-ui';
import type { Action, Challenge, ChallengeOption, Pending } from './types';

type ChallengePending = Extract<Pending, { kind: 'challenge' }>;
type FeedbackPending = Extract<Pending, { kind: 'feedback' }>;

function KindBadge({ kind }: { kind: string }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const n = env.idx.name.get(`kind.${kind}`);
  return (
    <span className="g-ramayana-yatra__kind" data-testid="challenge-kind">
      {n ? <SaText>{n.sa}</SaText> : null}
      {n && ui.lang === 'sa' ? null : <span>{KIND_EN[kind] ?? kind}</span>}
    </span>
  );
}

/**
 * An English option label in the player's language. An interface label (vibhakti case names, "Continue") has a
 * Sanskrit `labelSa`; a meaning (artha) stays English in every mode — it is the meaning being taught (data-en-ok).
 */
function EnOptionText({ o }: { o: ChallengeOption }): ReactElement {
  const ui = useUi();
  if (ui.isSa && o.labelSa)
    return (
      <span className="g-ramayana-yatra__opt-sa">
        <SaMarkup text={o.labelSa} />
        {ui.lang === 'sa-en' ? (
          <span className="g-ramayana-yatra__ui-en is-block" data-testid="ui-en">
            {o.en ?? ''}
          </span>
        ) : null}
      </span>
    );
  return <span data-en-ok="">{o.en ?? ''}</span>;
}

/** lipi: when the user reads IAST, the forced scripts are swapped so the task stays "the other script". */
function useFlip(ch: Challenge): (sc: 'deva' | 'iast' | undefined) => 'deva' | 'iast' | undefined {
  const env = useEnv();
  const swap = ch.kind === 'lipi' && env.script === 'iast';
  return (sc) => (swap && sc ? (sc === 'deva' ? 'iast' : 'deva') : sc);
}

/** An option label; `both` shows Devanagari = IAST (lipi feedback). */
function OptionLabel({ o, script, both }: { o: ChallengeOption; script?: 'deva' | 'iast'; both?: boolean }): ReactElement {
  const ui = useUi();
  if (!o.sa) return ui.isSa ? <EnOptionText o={o} /> : <span>{o.en ?? ''}</span>;
  if (both)
    return (
      <span className="g-ramayana-yatra__both">
        <SaText script="deva">{o.sa}</SaText>
        <span aria-hidden="true"> = </span>
        {/* the other script on purpose (lipi): Sanskrit in IAST, not English */}
        <span data-en-ok="">
          <SaText script="iast">{o.sa}</SaText>
        </span>
      </span>
    );
  return <SaText script={script}>{o.sa}</SaText>;
}

/** Verse context for challenges tied to a pāda: reference + line, and (vibhakti/viccheda) the line with the target marked. */
function VerseContext({ ch }: { ch: Challenge }): ReactElement | null {
  const env = useEnv();
  const ui = useUi();
  const sh = ch.shlokaId ? env.idx.shloka.get(ch.shlokaId) : undefined;
  if (!sh) return null;
  const line = ch.padaIndex;
  let body: ReactElement | null = null;
  if (line !== undefined && ch.stimulus) {
    if (ch.kind === 'vibhakti') {
      const words = sh.words.filter((w) => w.pada === line);
      let marked = false;
      body = (
        <div className="g-ramayana-yatra__ctx-words" data-testid="challenge-context-line">
          {words.map((w, i) => {
            const hit = !marked && w.form === ch.stimulus;
            marked ||= hit;
            return (
              <span key={i} className={cx('g-ramayana-yatra__ctx-word', hit && 'is-target')}>
                <SaText>{w.form}</SaText>
              </span>
            );
          })}
        </div>
      );
    } else if (ch.kind === 'viccheda') {
      const pada = sh.padas[line] ?? '';
      const at = pada.indexOf(ch.stimulus);
      body = (
        <div className="g-ramayana-yatra__ctx-line" data-testid="challenge-context-line">
          {at >= 0 ? (
            <>
              {at > 0 ? <SaText shloka>{pada.slice(0, at)}</SaText> : null}
              <mark className="g-ramayana-yatra__ctx-mark">
                <SaText shloka>{ch.stimulus}</SaText>
              </mark>
              {at + ch.stimulus.length < pada.length ? <SaText shloka>{pada.slice(at + ch.stimulus.length)}</SaText> : null}
            </>
          ) : (
            <SaText shloka nowrap={false}>
              {pada}
            </SaText>
          )}
        </div>
      );
    }
  }
  return (
    <div className="g-ramayana-yatra__ctx" data-testid="challenge-context">
      <span className="g-ramayana-yatra__ctx-ref">
        <VerseRef kanda={sh.kanda} sarga={sh.sarga} verse={sh.verse} />
        {line !== undefined ? <span> · {ui.t('challenge.line', { n: line + 1 }, { gloss: false })}</span> : null}
      </span>
      {body}
    </div>
  );
}

export function ChallengePanel({ pending, dispatch, onTimeLeft }: { pending: ChallengePending; dispatch: (a: Action) => void; onTimeLeft: (ms: number | undefined) => void }): ReactElement {
  const ch = pending.challenge;
  return <ChallengeBody key={ch.id} ch={ch} step={pending.step} steps={pending.steps} context={pending.context} dispatch={dispatch} onTimeLeft={onTimeLeft} />;
}

function ChallengeBody({ ch, step, steps, context, dispatch, onTimeLeft }: { ch: Challenge; step?: number; steps?: number; context: ChallengePending['context']; dispatch: (a: Action) => void; onTimeLeft: (ms: number | undefined) => void }): ReactElement {
  const env = useEnv();
  const ui = useUi();
  const t0 = useRef(performance.now());
  const sent = useRef(false);
  const [order, setOrder] = useState<number[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const timed = ch.timeLimitMs > 0 && !env.prefs.relaxed;
  const flip = useFlip(ch);
  const stimScript = flip(ch.stimulusScript);
  const hint = env.level === 2 && (stimScript ?? env.script) === 'deva' && ch.kind !== 'lipi';
  const isKrama = ch.kind === 'krama' && !!ch.tiles;

  const submit = (a: { option?: string; order?: number[] }): void => {
    if (sent.current) return;
    sent.current = true;
    const timeMs = env.prefs.relaxed ? 0 : Math.round(performance.now() - t0.current);
    dispatch({ type: 'answer', ...a, timeMs });
  };
  const { leftMs } = useCountdown(timed ? ch.timeLimitMs : 1, () => submit(isKrama ? { order } : {}), timed);

  const lastSec = useRef(-1);
  useEffect(() => {
    if (!timed) return;
    const sec = Math.ceil(leftMs / 1000);
    if (sec !== lastSec.current) {
      lastSec.current = sec;
      onTimeLeft(leftMs);
    }
  }, [leftMs, timed, onTimeLeft]);
  useEffect(() => () => onTimeLeft(undefined), [onTimeLeft]);

  const opts = ch.options ?? [];
  const pick = (id: string): void => {
    if (sent.current) return;
    setPicked(id);
    submit({ option: id });
  };
  const tiles = ch.tiles ?? [];
  const place = (i: number): void => {
    if (sent.current || order.includes(i)) return;
    setOrder([...order, i]);
  };
  const undo = (): void => setOrder(order.slice(0, -1));
  const complete = order.length === tiles.length && tiles.length > 0;

  useButtons({
    num: (n) => {
      if (isKrama) {
        const avail = tiles.map((_, i) => i).filter((i) => !order.includes(i));
        const i = avail[n - 1];
        if (i !== undefined) place(i);
      } else {
        const o = opts[n - 1];
        if (o) pick(o.id);
      }
    },
    a: () => {
      if (isKrama && complete) submit({ order });
    },
    b: () => {
      if (isKrama) undo();
    },
  });

  const allSa = opts.length > 0 && opts.every((o) => !!o.sa);
  const frac = timed ? leftMs / ch.timeLimitMs : 1;
  return (
    <div className="g-ramayana-yatra__challenge" data-testid="challenge" data-kind={ch.kind}>
      <div className="g-ramayana-yatra__challenge-head">
        <KindBadge kind={ch.kind} />
        {steps ? (
          <span className="g-ramayana-yatra__steps" data-testid="challenge-step">
            {context === 'recite' ? (
              ui.t('challenge.recitalStep', { i: step ?? 1, n: steps }, { gloss: false })
            ) : (
              <>
                {ui.num(step ?? 1)} / {ui.num(steps)}
              </>
            )}
          </span>
        ) : null}
      </div>
      {timed ? (
        <div className={cx('g-ramayana-yatra__timer', frac < 0.25 && 'is-low')} role="timer" aria-label={ui.plain('challenge.secondsLeft', { n: Math.ceil(leftMs / 1000) })}>
          <div className="g-ramayana-yatra__timer-fill" style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%` }} />
        </div>
      ) : null}
      <div className="g-ramayana-yatra__prompt" data-testid="challenge-prompt">
        {ui.isSa && ch.promptSa ? <StoryLine en={ch.prompt} sa={ch.promptSa} /> : ch.prompt}
      </div>
      {ch.stimulus ? (
        <div className="g-ramayana-yatra__stimulus" data-testid="challenge-stimulus" {...(stimScript === 'iast' ? { 'data-en-ok': '' } : {})}>
          <SaText script={stimScript} nowrap={false} shloka={!!ch.shlokaId}>
            {ch.stimulus}
          </SaText>
          {hint ? (
            <div data-en-ok="">
              <SaText as="div" script="iast" nowrap={false} className="g-ramayana-yatra__hint-iast">
                {ch.stimulus}
              </SaText>
            </div>
          ) : null}
        </div>
      ) : null}
      <VerseContext ch={ch} />
      {isKrama ? (
        <div className="g-ramayana-yatra__krama">
          <div className="g-ramayana-yatra__answerline" data-testid="krama-line" aria-label={ui.plain('challenge.yourOrder')}>
            {order.length === 0 ? <span className="g-ramayana-yatra__hint">{ui.t('challenge.tapOrder')}</span> : null}
            {order.map((i, k) => (
              <span key={k} className="g-ramayana-yatra__placed">
                <SaText>{tiles[i] ?? ''}</SaText>
              </span>
            ))}
          </div>
          <div className="sk-bank">
            {tiles.map((w, i) => (
              <Chip key={i} sa={w} state={order.includes(i) ? 'used' : 'idle'} onClick={() => place(i)} data-testid={`tile-${i}`} />
            ))}
          </div>
          <div className="g-ramayana-yatra__row2">
            <Button variant="secondary" onClick={undo} disabled={order.length === 0} data-testid="krama-undo">
              {ui.t('challenge.undo', undefined, { gloss: false })}
            </Button>
            <Button onClick={() => submit({ order })} disabled={!complete} data-testid="krama-check">
              {ui.t('challenge.check', undefined, { gloss: false })}
            </Button>
          </div>
        </div>
      ) : (
        <div className={cx('sk-choices', allSa && opts.length > 2 && opts.every((o) => !/\s/.test(o.sa ?? '')) && 'sk-choices--2')}>
          {opts.map((o, i) =>
            ui.isSa && !o.sa ? (
              <Choice key={o.id} hotkey={String(i + 1)} state={picked === o.id ? 'selected' : 'idle'} onClick={() => pick(o.id)} data-testid={`opt-${o.id}`}>
                <EnOptionText o={o} />
              </Choice>
            ) : (
              <Choice key={o.id} hotkey={String(i + 1)} state={picked === o.id ? 'selected' : 'idle'} onClick={() => pick(o.id)} script={flip(o.script)} sa={o.sa} text={o.sa ? undefined : o.en} data-testid={`opt-${o.id}`} />
            ),
          )}
        </div>
      )}
      {!timed ? <p className="g-ramayana-yatra__hint">{ui.t('challenge.untimed')}</p> : null}
    </div>
  );
}

export function CorrectAnswer({ ch }: { ch: Challenge }): ReactElement | null {
  const flip = useFlip(ch);
  if (ch.kind === 'krama' && ch.tiles && ch.orders?.[0]) {
    const words = (ch.orders[0] ?? []).map((i) => ch.tiles?.[i] ?? '');
    return (
      <span data-testid="correct-answer">
        <SaText nowrap={false}>{words.join(' ')}</SaText>
      </span>
    );
  }
  const ok = (ch.options ?? []).filter((o) => (ch.answers ?? []).includes(o.id));
  if (!ok.length) return null;
  return (
    <span data-testid="correct-answer">
      {ok.map((o, i) => (
        <span key={o.id}>
          {i ? ' / ' : ''}
          <OptionLabel o={o} script={flip(o.script)} both={ch.kind === 'lipi'} />
        </span>
      ))}
    </span>
  );
}

export function FeedbackPanel({ pending, dispatch }: { pending: FeedbackPending; dispatch: (a: Action) => void }): ReactElement {
  const { challenge: ch, result } = pending;
  const ui = useUi();
  const advance = (): void => dispatch({ type: 'advance' });
  useButtons({ a: advance, b: advance });
  const flip = useFlip(ch);
  const timedOut = !result.correct && ch.timeLimitMs > 0 && !pending.picked && result.timeMs >= ch.timeLimitMs - 250;
  // FeedbackBar takes a plain-string title: Sanskrit in the player's script (sa-en: "Sanskrit · English")
  const both = (en: string, sa: string): string => (!ui.isSa ? en : ui.lang === 'sa-en' ? `${sa} · ${en}` : sa);
  const title = result.correct
    ? result.swift
      ? both(ui.en('challenge.swift'), ui.plain('challenge.swift'))
      : both(ui.en('challenge.correct'), ui.plain('challenge.correct'))
    : timedOut
      ? both(ui.en('challenge.timeUp'), ui.plain('challenge.timeUp'))
      : both(ui.en('challenge.notQuite'), ui.plain('challenge.notQuite'));
  const pickedOpt = pending.picked ? (ch.options ?? []).find((o) => o.id === pending.picked) : undefined;
  return (
    <div className="g-ramayana-yatra__feedback">
      <FeedbackBar correct={result.correct} title={title} onContinue={advance} {...(ui.isSa ? { continueLabel: ui.plain('common.continue') } : {})}>
        <div className="sk-stack">
          {!result.correct && pickedOpt ? (
            <div className="g-ramayana-yatra__fb-line">
              <span className="g-ramayana-yatra__fb-label">{ui.t('challenge.youChose', undefined, { gloss: false })}</span> <OptionLabel o={pickedOpt} script={flip(pickedOpt.script)} both={ch.kind === 'lipi'} />
            </div>
          ) : null}
          <div className="g-ramayana-yatra__fb-line">
            <span className="g-ramayana-yatra__fb-label">{result.correct ? ui.t('common.answer', undefined, { gloss: false }) : ui.t('challenge.correctAnswer', undefined, { gloss: false })}</span> <CorrectAnswer ch={ch} />
          </div>
          {ch.explanation ? (
            <div className="g-ramayana-yatra__fb-expl" data-testid="feedback-explanation">
              {ui.isSa && ch.explanationSa ? <StoryLine en={ch.explanation} sa={ch.explanationSa} /> : <Markup text={ch.explanation} />}
            </div>
          ) : null}
        </div>
      </FeedbackBar>
    </div>
  );
}
