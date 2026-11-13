import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  type GameContext,
  type Given,
  type Question,
  type QuizOptions,
  type QuizState,
  type Rich,
  type Script,
  type SessionResult,
  advance,
  correctAnswer,
  createQuiz,
  currentQuestion,
  quizProgress,
  quizResult,
  submit,
} from '@sdk';
import { AksharaKeyboard } from './AksharaKeyboard';
import { useKeydown } from './hooks';
import { Button, Chip, Choice, type ChipState, type ChoiceState, FeedbackBar } from './primitives';
import { SaText, renderSa } from './SaText';

export interface QuizRunnerProps {
  ctx: GameContext;
  /** Questions built from verified content, already ordered/shuffled with the seeded rng. */
  questions: readonly Question[];
  options?: QuizOptions;
  /** Customise the result (add a share card, summary…). Receives the default result. */
  buildResult?: (state: QuizState, base: SessionResult) => SessionResult;
}

/** Rough rendered width of an option in characters, in the script it will actually be shown in. */
function shownLength(o: Rich, script: Script): number {
  const sa = o.sa !== undefined ? renderSa(o.sa, o.script ?? script) : '';
  return [...sa].length + (o.text ? o.text.length + (sa ? 1 : 0) : 0);
}

function RichView({ value, big }: { value: Rich | undefined; big?: boolean }): ReactElement | null {
  if (!value || (value.sa === undefined && value.text === undefined)) return null;
  return (
    <>
      {value.sa !== undefined ? (
        <SaText as="div" nowrap={false} script={value.script} style={big ? undefined : { fontSize: 'inherit' }}>
          {value.sa}
        </SaText>
      ) : null}
      {value.text !== undefined ? <div className={big ? 'sk-quiz__prompt-text' : undefined}>{value.text}</div> : null}
    </>
  );
}

/**
 * Runs a whole lesson: one question at a time, Check → feedback → Continue, hearts and
 * progress in the shell top bar, then the shared result screen. Use this for every
 * lesson-style game so they all feel the same.
 *
 * Test hooks (data-testid): choice-<id>, token-<id>, picked-<id>, left-<id>, right-<id>,
 * check, continue, feedback; `ctx.expose` publishes { phase, kind, qid, answer }.
 */
export function QuizRunner({ ctx, questions, options, buildResult }: QuizRunnerProps): ReactElement {
  const [quiz, setQuiz] = useState<QuizState>(() => createQuiz(questions, options));
  const [choice, setChoice] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [selL, setSelL] = useState<string | null>(null);
  const [selR, setSelR] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const pairMistakes = useRef(0);
  const finished = useRef(false);

  const q = currentQuestion(quiz);
  const asking = quiz.status === 'asking';

  const resetInputs = (): void => {
    setChoice(null);
    setPicked([]);
    setTyped('');
    setMatched({});
    setSelL(null);
    setSelR(null);
    setWrongPair(null);
    pairMistakes.current = 0;
  };

  // HUD + test snapshot
  useEffect(() => {
    ctx.hud({ progress: quizProgress(quiz), lives: quiz.maxLives > 0 ? quiz.lives : undefined, maxLives: quiz.maxLives > 0 ? quiz.maxLives : undefined, score: quiz.score });
    const answer: unknown = !q ? null : q.kind === 'choice' ? q.answer : q.kind === 'arrange' ? q.answers[0] : q.kind === 'pairs' ? q.pairs : q.answers[0];
    ctx.expose({ phase: quiz.status, kind: q?.kind ?? null, qid: q?.id ?? null, answer, index: quiz.index, total: quiz.queue.length, lives: quiz.lives, score: quiz.score });
  }, [quiz, q, ctx]);

  // Finish
  useEffect(() => {
    if (quiz.status !== 'done' || finished.current) return;
    finished.current = true;
    const base = quizResult(quiz);
    ctx.finish(buildResult ? buildResult(quiz, base) : base);
  }, [quiz, ctx, buildResult]);

  const doSubmit = (given: Given, mistakes = 0): void => {
    setQuiz((s) => {
      const next = submit(s, given, mistakes);
      if (next !== s && next.last) {
        ctx.sfx(next.last.correct ? 'correct' : 'wrong');
        ctx.haptic(next.last.correct ? 'success' : 'error');
      }
      return next;
    });
  };
  const doContinue = (): void => {
    resetInputs();
    setQuiz((s) => advance(s));
  };

  const canCheck = useMemo(() => {
    if (!q || !asking) return false;
    if (q.kind === 'choice') return choice !== null;
    if (q.kind === 'arrange') return picked.length > 0;
    if (q.kind === 'type') return typed.trim().length > 0;
    return false;
  }, [q, asking, choice, picked, typed]);

  const check = (): void => {
    if (!q || !canCheck) return;
    if (q.kind === 'choice' && choice !== null) doSubmit(choice);
    else if (q.kind === 'arrange') doSubmit(picked);
    else if (q.kind === 'type') doSubmit(typed);
  };

  useKeydown((e) => {
    if (!q) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (quiz.status === 'feedback') doContinue();
      else check();
      return;
    }
    if (asking && q.kind === 'choice' && /^[1-9]$/.test(e.key)) {
      const opt = q.options[Number(e.key) - 1];
      if (opt) setChoice(opt.id);
    }
  });

  // Pairs: resolve a selected left+right
  useEffect(() => {
    if (!q || q.kind !== 'pairs' || !asking || selL === null || selR === null) return;
    if (q.pairs[selL] === selR) {
      const next = { ...matched, [selL]: selR };
      setMatched(next);
      setSelL(null);
      setSelR(null);
      ctx.sfx('tap');
      if (Object.keys(next).length === q.left.length) doSubmit(next, pairMistakes.current);
    } else {
      pairMistakes.current += 1;
      setWrongPair([selL, selR]);
      ctx.sfx('wrong');
      const t = setTimeout(() => {
        setWrongPair(null);
        setSelL(null);
        setSelR(null);
      }, 450);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selL, selR]);

  if (!q) return <div className="sk-quiz" data-testid="quiz-done" />;

  const last = quiz.last;
  const showFeedback = quiz.status === 'feedback' && last !== null;

  let body: ReactElement;
  if (q.kind === 'choice') {
    body = (
      <div className={q.options.length % 2 === 0 && q.options.every((o) => shownLength(o, ctx.settings.script) <= 9) ? 'sk-choices sk-choices--2' : 'sk-choices'}>
        {q.options.map((o, i) => {
          let state: ChoiceState = choice === o.id ? 'selected' : 'idle';
          if (showFeedback) state = o.id === q.answer ? 'correct' : o.id === choice ? 'wrong' : 'muted';
          return <Choice key={o.id} sa={o.sa} text={o.text} script={o.script} state={state} hotkey={String(i + 1)} disabled={!asking} onClick={() => setChoice(o.id)} data-testid={`choice-${o.id}`} />;
        })}
      </div>
    );
  } else if (q.kind === 'arrange') {
    const tok = (id: string): (typeof q.tokens)[number] | undefined => q.tokens.find((t) => t.id === id);
    body = (
      <>
        <div className="sk-answerline" data-testid="answer-line" aria-label="Your answer">
          {picked.map((id) => {
            const t = tok(id);
            return t ? <Chip key={id} sa={t.sa} text={t.text} script={t.script} disabled={!asking} onClick={() => setPicked((p) => p.filter((x) => x !== id))} data-testid={`picked-${id}`} /> : null;
          })}
        </div>
        <div className="sk-bank" data-testid="word-bank">
          {q.tokens.map((t) => (
            <Chip key={t.id} sa={t.sa} text={t.text} script={t.script} state={picked.includes(t.id) ? 'used' : 'idle'} disabled={!asking} onClick={() => setPicked((p) => (p.includes(t.id) ? p : [...p, t.id]))} data-testid={`token-${t.id}`} />
          ))}
        </div>
      </>
    );
  } else if (q.kind === 'pairs') {
    const doneR = new Set(Object.values(matched));
    const stateL = (id: string): ChipState => (matched[id] !== undefined ? 'done' : wrongPair?.[0] === id ? 'wrong' : selL === id ? 'selected' : 'idle');
    const stateR = (id: string): ChipState => (doneR.has(id) ? 'done' : wrongPair?.[1] === id ? 'wrong' : selR === id ? 'selected' : 'idle');
    body = (
      <div className="sk-pairs">
        <div className="sk-pairs__col">
          {q.left.map((o) => (
            <Chip key={o.id} sa={o.sa} text={o.text} script={o.script} state={stateL(o.id)} disabled={!asking || wrongPair !== null} onClick={() => setSelL(o.id)} data-testid={`left-${o.id}`} />
          ))}
        </div>
        <div className="sk-pairs__col">
          {q.right.map((o) => (
            <Chip key={o.id} sa={o.sa} text={o.text} script={o.script} state={stateR(o.id)} disabled={!asking || wrongPair !== null} onClick={() => setSelR(o.id)} data-testid={`right-${o.id}`} />
          ))}
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <div className="sk-typed" data-testid="typed" aria-live="polite">
          {typed ? <SaText>{typed}</SaText> : null}
        </div>
        <AksharaKeyboard value={typed} onChange={setTyped} onEnter={check} disabled={!asking} noEnter />
      </>
    );
  }

  const answerRich = correctAnswer(q);
  return (
    <div className="sk-quiz" data-testid="quiz" data-kind={q.kind} data-qid={q.id}>
      <h2 className="sk-quiz__instruction">{q.instruction}</h2>
      <div className="sk-quiz__prompt" data-testid="prompt">
        <RichView value={q.prompt} big />
        {q.context ? (
          <div className="sk-quiz__context">
            <RichView value={q.context} />
          </div>
        ) : null}
      </div>
      <div className="sk-quiz__body">{body}</div>
      {showFeedback && last ? (
        <FeedbackBar correct={last.correct} onContinue={doContinue}>
          {!last.correct && q.kind !== 'pairs' ? (
            <div>
              <strong>Correct answer: </strong>
              {answerRich.sa !== undefined ? <SaText nowrap={false} script={answerRich.script}>{answerRich.sa}</SaText> : answerRich.text}
            </div>
          ) : null}
          {q.explain ? <RichView value={q.explain} /> : null}
        </FeedbackBar>
      ) : q.kind === 'pairs' ? null : (
        <div className="sk-quiz__footer">
          <Button full disabled={!canCheck} onClick={check} data-testid="check">
            Check
          </Button>
        </div>
      )}
    </div>
  );
}
