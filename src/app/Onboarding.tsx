import { type ReactElement, useState } from 'react';
import { LEVELS, type Level, type Script, type Settings } from '@sdk';
import { Button, SaText, cx } from '@ui';

const BLURB: Record<Level, string> = {
  0: 'I am new to the Devanagari script',
  1: 'I can read; I know a few words and phrases',
  2: 'I know basic cases and tenses',
  3: 'I can handle sandhi and read simple verses',
  4: 'I read the Gītā and classical texts with help',
  5: 'I study compounds, metre and advanced grammar',
};

/** First-run welcome: pick a starting level and script. Everything can be changed later in Profile. */
export function Onboarding({ initial, onDone }: { initial: Settings; onDone: (patch: Partial<Settings>) => void }): ReactElement {
  const [level, setLevel] = useState<Level>(initial.level);
  const [script, setScript] = useState<Script>(initial.script);
  return (
    <div className="app-onboard" data-testid="onboarding">
      <div className="app-onboard__inner">
        <SaText className="app-hero__title" script="deva">
          संस्कुरु
        </SaText>
        <p className="app-onboard__lead">
          <SaText script="deva">स्वागतम्!</SaText> Short daily games that turn class-room Saṃskṛtam into habit.
        </p>
        <h2 className="sk-h3">Where are you on the path?</h2>
        <div className="app-onboard__levels" role="radiogroup" aria-label="Starting level">
          {LEVELS.map((l) => (
            <button key={l.level} type="button" role="radio" aria-checked={level === l.level} className={cx('app-onboard__level', level === l.level && 'is-active')} onClick={() => setLevel(l.level)} data-testid={`onboard-level-${l.level}`}>
              <span className="app-onboard__level-name">
                <SaText script="deva">{l.sa}</SaText> <span className="sk-muted">· {l.en}</span>
              </span>
              <span className="app-onboard__level-blurb">{BLURB[l.level]}</span>
            </button>
          ))}
        </div>
        <h2 className="sk-h3">How should Sanskrit be shown?</h2>
        <div className="app-seg" role="group" aria-label="Script">
          <button type="button" className={cx(script === 'deva' && 'is-active')} onClick={() => setScript('deva')} data-testid="onboard-deva">
            देवनागरी
          </button>
          <button type="button" className={cx(script === 'iast' && 'is-active')} onClick={() => setScript('iast')} data-testid="onboard-iast">
            Roman (IAST)
          </button>
        </div>
        <Button full onClick={() => onDone({ level, script })} data-testid="onboard-start">
          Start
        </Button>
        <p className="sk-muted sk-small">You can change both at any time under Me → Settings.</p>
      </div>
    </div>
  );
}
