/**
 * Every code example in docs/DESIGN_SYSTEM.md lives here, so the type-checker keeps the
 * documentation honest: tests/contract/platform.test.ts fails if a `tsx` block in that doc
 * is not found in this file line for line. Change an example here first, then paste it into the doc.
 * (Nothing imports this file; it is compiled, never bundled.)
 */
import { type ReactElement, useRef, useState } from 'react';
import type { GameProps, Question } from '@sdk';
import {
  AksharaKeyboard,
  Button,
  Card,
  Chip,
  Choice,
  FeedbackBar,
  Hearts,
  IconButton,
  type KeyState,
  Pill,
  ProgressBar,
  QuizRunner,
  SaText,
  Sheet,
  Tile,
  cx,
  renderSa,
  useCountdown,
  useInterval,
  useKeydown,
  useLatest,
  useOnce,
  useRafLoop,
  useSettings,
  useSwipe,
} from '@ui';

export function ButtonExample({ onCheck, onSkip, canCheck }: { onCheck: () => void; onSkip: () => void; canCheck: boolean }): ReactElement {
  return (
    <div className="sk-stack">
      <Button full disabled={!canCheck} onClick={onCheck} data-testid="check">
        Check
      </Button>
      <Button variant="secondary" size="sm" onClick={onSkip}>
        Skip
      </Button>
    </div>
  );
}

export function IconButtonExample({ onHint }: { onHint: () => void }): ReactElement {
  return (
    <IconButton label="Hint" onClick={onHint} data-testid="hint">
      💡
    </IconButton>
  );
}

export function ChoiceExample({ picked, onPick }: { picked: string | null; onPick: (id: string) => void }): ReactElement {
  return (
    <div className="sk-choices">
      <Choice sa="रामेण" hotkey="1" state={picked === 'a' ? 'selected' : 'idle'} onClick={() => onPick('a')} data-testid="choice-a" />
      <Choice sa="रामाय" hotkey="2" state={picked === 'b' ? 'selected' : 'idle'} onClick={() => onPick('b')} data-testid="choice-b" />
    </div>
  );
}

export function TileExample({ onTap }: { onTap: (akshara: string) => void }): ReactElement {
  return (
    <div className="sk-row sk-row--center">
      <Tile sa="सं" state="correct" />
      <Tile sa="स्कृ" state="present" />
      <Tile sa="तम्" state="absent" />
      <Tile sa="क्ष" size={72} onClick={() => onTap('क्ष')} label="kṣa" data-testid="tile-ksha" />
    </div>
  );
}

export function ChipExample({ used, onUse }: { used: boolean; onUse: () => void }): ReactElement {
  return (
    <div className="sk-bank">
      <Chip sa="बालकः" state={used ? 'used' : 'idle'} onClick={onUse} data-testid="token-t1" />
      <Chip text="the boy" state="selected" />
    </div>
  );
}

export function StatusExample({ done, total, lives, combo }: { done: number; total: number; lives: number; combo: number }): ReactElement {
  return (
    <Card flat className="sk-stack">
      <ProgressBar value={done / total} label="Round progress" />
      <div className="sk-row sk-row--between">
        <Hearts lives={lives} max={3} />
        <Pill tone="gold">×{combo}</Pill>
      </div>
    </Card>
  );
}

export function SheetExample(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Show the paradigm
      </Button>
      <Sheet title="रामः — tṛtīyā" open={open} onClose={() => setOpen(false)} data-testid="paradigm-sheet">
        <SaText as="p" nowrap={false}>
          रामेण रामाभ्याम् रामैः
        </SaText>
      </Sheet>
    </>
  );
}

export function FeedbackExample({ correct, onContinue }: { correct: boolean; onContinue: () => void }): ReactElement {
  return (
    <FeedbackBar correct={correct} onContinue={onContinue}>
      <strong>Correct answer: </strong>
      <SaText>रामेण</SaText>
    </FeedbackBar>
  );
}

export function SaTextExample(): ReactElement {
  const { script } = useSettings();
  return (
    <div className="sk-stack">
      <SaText>संस्कृतम्</SaText>
      <SaText script="deva">क्ष</SaText>
      <SaText as="p" shloka nowrap={false}>
        धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः
      </SaText>
      <button type="button" aria-label={renderSa('पठति', script)}>
        ▶
      </button>
    </div>
  );
}

export function KeyboardExample({ onSubmit }: { onSubmit: (text: string) => void }): ReactElement {
  const [typed, setTyped] = useState('');
  const hints: Record<string, KeyState> = { र: 'correct', म: 'present', क: 'absent' };
  return (
    <>
      <div className="sk-typed" aria-live="polite">
        {typed ? <SaText>{typed}</SaText> : null}
      </div>
      <AksharaKeyboard value={typed} onChange={setTyped} onEnter={() => onSubmit(typed)} keyState={hints} />
    </>
  );
}

export function QuizExample({ ctx, questions }: GameProps & { questions: readonly Question[] }): ReactElement {
  return <QuizRunner ctx={ctx} questions={questions} options={{ lives: 3 }} buildResult={(_state, base) => ({ ...base, summary: `Lesson 1 · ${base.summary ?? ''}` })} />;
}

export function SwipeExample({ onMove }: { onMove: (dir: 'up' | 'down' | 'left' | 'right') => void }): ReactElement {
  const board = useRef<HTMLDivElement>(null);
  useSwipe(board, onMove, { threshold: 32 });
  return <div ref={board} className="sk-stage" data-testid="board" />;
}

export function KeydownExample({ onPick, onSubmit }: { onPick: (n: number) => void; onSubmit: () => void }): null {
  useKeydown((e) => {
    if (e.key === 'Enter') onSubmit();
    else if (/^[1-4]$/.test(e.key)) onPick(Number(e.key));
  });
  return null;
}

export function CountdownExample({ ctx, onTimeUp }: GameProps & { onTimeUp: () => void }): ReactElement {
  const { leftMs, add } = useCountdown(60_000, onTimeUp);
  useInterval(() => ctx.hud({ timeLeftMs: leftMs }), 250);
  return (
    <Button size="sm" onClick={() => add(5_000)}>
      +5 s
    </Button>
  );
}

export function RafExample({ step, paused }: { step: (dtMs: number) => void; paused: boolean }): null {
  useRafLoop(step, !paused);
  return null;
}

export function LatestAndOnceExample({ ctx, score }: GameProps & { score: number }): null {
  const latestScore = useLatest(score);
  useOnce(() => ctx.announce('Round started'));
  useInterval(() => ctx.hud({ score: latestScore.current }), 1000);
  return null;
}

export function ClassNamesExample({ selected, wrong }: { selected: boolean; wrong: boolean }): ReactElement {
  return <div className={cx('g-my-game__cell', selected && 'is-selected', wrong && 'is-wrong')} />;
}
