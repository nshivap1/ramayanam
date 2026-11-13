import { type ReactElement, useMemo, useState } from 'react';
import { type GameProps, type QuizState, type SessionResult, starsFor } from '@sdk';
import { Button, QuizRunner, SaText, cx } from '@ui';
import { STAGES, buildLesson, currentStage } from './logic';

/**
 * Lesson-style reference game: pick a stage → <QuizRunner> does the rest.
 * Copy this file when your game is "a sequence of questions".
 */
export default function Game({ ctx }: GameProps): ReactElement {
  const [stars, setStars] = useState<number[]>(() => ctx.store.get<number[]>('stageStars', []));
  const unlocked = currentStage(stars);
  const [stage, setStage] = useState<number | null>(null);
  const questions = useMemo(() => (stage === null ? [] : buildLesson(stage, ctx.seed + stage)), [stage, ctx.seed]);

  if (stage === null) {
    ctx.expose({ phase: 'menu', unlocked });
    return (
      <div className="sk-stage g-akshara-paricaya" data-testid="stage-menu">
        <h2 className="sk-h2">Choose a stage</h2>
        <div className="sk-stack" style={{ width: '100%' }}>
          {STAGES.map((s, i) => (
            <Button key={s.id} full variant={i === unlocked ? 'primary' : 'secondary'} disabled={i > unlocked} onClick={() => setStage(i)} data-testid={`stage-${i}`} className={cx(i > unlocked && 'is-locked')}>
              <SaText>{s.title.sa}</SaText> · {s.title.en} {'★'.repeat(stars[i] ?? 0)}
              {i > unlocked ? ' 🔒' : ''}
            </Button>
          ))}
        </div>
        <p className="sk-muted sk-small">Earn 2 stars to unlock the next stage.</p>
      </div>
    );
  }

  const buildResult = (_state: QuizState, base: SessionResult): SessionResult => {
    const earned = starsFor(base);
    const next = stars.slice();
    next[stage] = Math.max(next[stage] ?? 0, earned);
    ctx.store.set('stageStars', next);
    setStars(next);
    return { ...base, summary: `${STAGES[stage]?.title.en ?? ''} · ${base.summary ?? ''}` };
  };

  return <QuizRunner ctx={ctx} questions={questions} options={{ lives: 3 }} buildResult={buildResult} />;
}
