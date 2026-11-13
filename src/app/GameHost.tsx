import { Component, type ErrorInfo, type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type GameComponent,
  type GameContext,
  type GameEntry,
  type GameMode,
  type Hud,
  type KV,
  type Level,
  LEVELS,
  type Profile,
  type SessionOutcome,
  type SessionResult,
  dailyDone,
  dailySeed,
  gameStore,
  hashString,
  recordSession,
  resolveLevel,
  share,
  shareText,
  toDateKey,
} from '@sdk';
import { Button, Hearts, IconButton, PauseContext, Pill, ProgressBar, SaText, Sheet, cx } from '@ui';
import { playSfx, vibrate } from './audio';
import { navigate } from './router';

interface HostProps {
  entry: GameEntry;
  query: Record<string, string>;
  profile: Profile;
  kv: KV;
  onProfile: (p: Profile) => void;
}

class GameErrorBoundary extends Component<{ children: ReactNode; onExit: () => void }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[samskuru] game crashed', error, info.componentStack);
  }
  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="sk-stage sk-center" data-testid="game-error">
          <div className="sk-h2">क्षम्यताम् — something went wrong</div>
          <p className="sk-muted">{this.state.error.message}</p>
          <Button onClick={this.props.onExit}>Back to games</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const fmtTime = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const HEADLINES: Record<SessionResult['outcome'], { sa: string; en: string }> = {
  won: { sa: 'साधु साधु!', en: 'Well done!' },
  completed: { sa: 'समाप्तम्!', en: 'Complete!' },
  lost: { sa: 'पुनः प्रयतस्व', en: 'Try again' },
};

/**
 * Hosts one game session: builds the GameContext, renders the consistent top bar
 * (close · progress · score/timer/lives · help), the help sheet, and the shared result
 * screen; records XP, streak and mastery when the game calls `ctx.finish`.
 */
export function GameHost({ entry, query, profile, kv, onProfile }: HostProps): ReactElement {
  const { manifest } = entry;
  const e2e = query['e2e'] === '1';
  const dateKey = toDateKey();
  const mode: GameMode = (manifest.modes as string[]).includes(query['mode'] ?? '') ? (query['mode'] as GameMode) : (manifest.modes[0] as GameMode);
  const level: Level = resolveLevel(manifest, query['level'] !== undefined && /^[0-5]$/.test(query['level']) ? (Number(query['level']) as Level) : profile.settings.level);

  const [session, setSession] = useState(0);
  const [Game, setGame] = useState<GameComponent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hud, setHud] = useState<Hud>({});
  const [outcome, setOutcome] = useState<{ result: SessionResult; rec: SessionOutcome } | null>(null);
  const [help, setHelp] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [live, setLive] = useState('');
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const finishedRef = useRef(false);
  const paused = help || confirmExit;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const store = useMemo(() => gameStore(kv, manifest.id), [kv, manifest.id]);

  const seed = useMemo(() => {
    if (query['seed'] !== undefined && /^\d+$/.test(query['seed'])) return (Number(query['seed']) + session) >>> 0;
    if (mode === 'daily') return dailySeed(dateKey, manifest.id);
    return hashString(`${manifest.id}|${Date.now()}|${session}|${Math.random()}`);
  }, [query, mode, dateKey, manifest.id, session]);

  useEffect(() => {
    let alive = true;
    setGame(null);
    setLoadError(null);
    entry
      .load()
      .then((m) => {
        if (alive) setGame(() => m.default);
      })
      .catch((err: unknown) => {
        console.error('[samskuru] failed to load game', err);
        if (alive) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
  }, [entry]);

  // First visit: show how-to-play once.
  useEffect(() => {
    if (e2e) return;
    if (!store.get('seenHelp', false)) {
      setHelp(true);
      store.set('seenHelp', true);
    }
  }, [store, e2e]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const exit = useCallback(() => navigate(['games']), []);

  const ctx: GameContext = useMemo(() => {
    finishedRef.current = false;
    const settings = profileRef.current.settings;
    return {
      manifest,
      mode,
      level,
      seed,
      dateKey,
      settings,
      store,
      hud: (patch) => setHud((h) => ({ ...h, ...patch })),
      finish: (result) => {
        if (finishedRef.current) {
          console.warn(`[samskuru] ${manifest.id}: ctx.finish called more than once; ignored`);
          return;
        }
        finishedRef.current = true;
        const rec = recordSession(profileRef.current, manifest, mode, result, dateKey);
        onProfile(rec.profile);
        playSfx(result.outcome === 'lost' ? 'lose' : 'win', settings.sound);
        if (e2e) (window as unknown as Record<string, unknown>)['__result'] = { result, xp: rec.xpEarned, stars: rec.stars };
        // the result screen starts clean (no stale progress bar / hearts / timer); a game's own label (e.g. "3/6") stays
        setHud((h) => (h.label !== undefined ? { label: h.label } : {}));
        setOutcome({ result, rec });
      },
      exit,
      sfx: (name) => playSfx(name, profileRef.current.settings.sound),
      haptic: (kind = 'light') => vibrate(kind, profileRef.current.settings.haptics),
      isPaused: () => pausedRef.current || document.hidden,
      announce: (text) => setLive(text),
      expose: (snapshot) => {
        if (e2e) (window as unknown as Record<string, unknown>)['__game'] = snapshot;
      },
    };
    // A new ctx (and so a fresh game mount) per session / seed / mode / level / script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest, mode, level, seed, dateKey, store, exit, e2e, profile.settings.script]);

  const playAgain = (): void => {
    setOutcome(null);
    setHud({});
    setSession((s) => s + 1);
  };

  const doShare = async (): Promise<void> => {
    if (!outcome) return;
    const text = shareText(manifest, outcome.result, dateKey, mode === 'daily', outcome.rec.streakAfter);
    const how = await share(text);
    setToast(how === 'copied' ? 'Copied to clipboard' : how === 'shared' ? 'Shared' : 'Could not share');
  };

  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (outcome) stageRef.current?.scrollTo({ top: 0 });
  }, [outcome]);

  const inPlay = Game !== null && outcome === null;
  const already = mode === 'daily' ? dailyDone(profile, manifest.id, dateKey) : undefined;

  return (
    <div className={cx('app-game', `hue-${manifest.hue}`)} data-testid="game-host" data-game={manifest.id} data-mode={mode} data-level={level}>
      <header className="app-game__bar">
        <IconButton label="Close" onClick={() => (inPlay ? setConfirmExit(true) : exit())} data-testid="game-close">
          ✕
        </IconButton>
        {hud.progress !== undefined ? (
          <ProgressBar value={hud.progress} />
        ) : (
          <div className="app-game__title">
            <SaText>{manifest.title.sa}</SaText>
            {hud.label ? <span className="sk-muted sk-small"> · {hud.label}</span> : null}
          </div>
        )}
        <div className="app-game__stats">
          {hud.combo !== undefined && hud.combo > 1 ? <Pill tone="gold">×{hud.combo}</Pill> : null}
          {hud.timeLeftMs !== undefined ? (
            <Pill tone={hud.timeLeftMs < (hud.timeWarnMs ?? 10000) ? 'bad' : undefined} data-testid="hud-time">
              ⏱ {fmtTime(hud.timeLeftMs)}
            </Pill>
          ) : null}
          {hud.score !== undefined ? <Pill tone="accent" data-testid="hud-score">{hud.score}</Pill> : null}
          {hud.lives !== undefined ? <Hearts lives={hud.lives} max={hud.maxLives} /> : null}
          <IconButton label="How to play" onClick={() => setHelp(true)} data-testid="game-help">
            ?
          </IconButton>
        </div>
      </header>

      <main className="app-game__stage" data-testid="game-stage" ref={stageRef}>
        {loadError ? (
          <div className="sk-stage sk-center" data-testid="game-error">
            <div className="sk-h2">Could not load this game</div>
            <p className="sk-muted">{loadError}</p>
            <Button onClick={exit}>Back to games</Button>
          </div>
        ) : Game === null ? (
          <div className="sk-stage sk-center sk-muted" data-testid="game-loading">
            …
          </div>
        ) : outcome === null ? (
          <GameErrorBoundary key={`${session}|${seed}|${profile.settings.script}`} onExit={exit}>
            <PauseContext.Provider value={paused}>
              <Game ctx={ctx} />
            </PauseContext.Provider>
          </GameErrorBoundary>
        ) : (
          <ResultScreen manifestTitle={manifest.title.sa} outcome={outcome} daily={mode === 'daily'} canShare={mode === 'daily' || outcome.result.share !== undefined} onShare={doShare} onAgain={playAgain} onExit={exit} practiceAvailable={mode === 'daily' && manifest.modes.some((m) => m !== 'daily')} onPractice={() => navigate(['play', manifest.id], { mode: manifest.modes.find((m) => m !== 'daily'), level })} />
        )}
      </main>

      <div className="sk-sr" aria-live="polite">
        {live}
      </div>

      <Sheet title="How to play" open={help} onClose={() => setHelp(false)} data-testid="help-sheet">
        <div className="sk-stack">
          <div>
            <SaText className="sk-h2">{manifest.title.sa}</SaText>
            <div className="sk-muted">{manifest.title.en}</div>
          </div>
          <p>{manifest.description}</p>
          <ol className="app-help__steps">
            {manifest.howToPlay.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="sk-row sk-row--wrap">
            <Pill tone="accent">{LEVELS.find((l) => l.level === level)?.iast ?? ''}</Pill>
            <Pill>{mode}</Pill>
            {manifest.inspiredBy && profile.settings.labs ? <Pill>after {manifest.inspiredBy}</Pill> : null}
          </div>
          {already ? <p className="sk-muted sk-small">You have already played today's puzzle — replays earn practice XP only.</p> : null}
          <Button full onClick={() => setHelp(false)} data-testid="help-start">
            Play
          </Button>
        </div>
      </Sheet>

      <Sheet title="Leave this game?" open={confirmExit} onClose={() => setConfirmExit(false)}>
        <div className="sk-stack">
          <p>Your progress in this round will be lost.</p>
          <Button full onClick={() => setConfirmExit(false)}>
            Keep playing
          </Button>
          <Button full variant="secondary" onClick={exit} data-testid="confirm-exit">
            Leave
          </Button>
        </div>
      </Sheet>

      {toast ? <div className="sk-toast">{toast}</div> : null}
    </div>
  );
}

interface ResultProps {
  manifestTitle: string;
  outcome: { result: SessionResult; rec: SessionOutcome };
  daily: boolean;
  canShare: boolean;
  practiceAvailable: boolean;
  onShare: () => void;
  onAgain: () => void;
  onPractice: () => void;
  onExit: () => void;
}

function ResultScreen({ manifestTitle, outcome, daily, canShare, practiceAvailable, onShare, onAgain, onPractice, onExit }: ResultProps): ReactElement {
  const { result, rec } = outcome;
  const head = HEADLINES[result.outcome];
  const review = result.review ?? [];
  return (
    <div className="app-result" data-testid="result" data-outcome={result.outcome} data-stars={rec.stars}>
      <div className="app-result__hero">
        <div className="app-result__stars" aria-label={`${rec.stars} of 3 stars`}>
          {[1, 2, 3].map((i) => (
            <span key={i} className={cx('app-result__star', i <= rec.stars && 'is-on')} style={{ animationDelay: `${i * 120}ms` }}>
              ★
            </span>
          ))}
        </div>
        <SaText className="app-result__headline">{head.sa}</SaText>
        <div className="sk-muted">
          {head.en} · <SaText>{manifestTitle}</SaText>
        </div>
        {result.summary ? <div className="app-result__summary">{result.summary}</div> : null}
      </div>

      <div className="app-result__grid">
        <div className="app-result__stat">
          <div className="app-result__stat-value" data-testid="result-xp">+{rec.xpEarned}</div>
          <div className="app-result__stat-label">XP</div>
        </div>
        <div className="app-result__stat">
          <div className="app-result__stat-value" data-testid="result-score">{result.score}</div>
          <div className="app-result__stat-label">{rec.newBestScore && result.score > 0 ? 'Score · new best!' : 'Score'}</div>
        </div>
        <div className="app-result__stat">
          <div className="app-result__stat-value">🔥 {rec.streakAfter}</div>
          <div className="app-result__stat-label">{rec.streakAfter > rec.streakBefore ? 'Streak extended' : 'Day streak'}</div>
        </div>
      </div>

      {rec.newAchievements.length > 0 ? (
        <div className="app-result__badges">
          {rec.newAchievements.map((a) => (
            <Pill key={a.id} tone="gold">
              🏅 {a.title.sa} · {a.title.en}
            </Pill>
          ))}
        </div>
      ) : null}

      {result.share ? <pre className="app-result__share" data-testid="result-share">{result.share}</pre> : null}

      {review.length > 0 ? (
        <section className="app-result__review" aria-label="What you practised">
          <h3 className="sk-h3">What you practised</h3>
          <ul>
            {review.slice(0, 30).map((r, i) => (
              <li key={i} className={r.correct ? 'is-ok' : 'is-bad'}>
                <span aria-hidden="true">{r.correct ? '✓' : '✕'}</span>
                <span>
                  <SaText nowrap={false}>{r.sa}</SaText>
                  {r.en ? <span className="sk-muted"> — {r.en}</span> : null}
                  {r.note ? <div className="sk-muted sk-small">{r.note}</div> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="app-result__actions">
        {canShare ? (
          <Button full variant="secondary" onClick={onShare} data-testid="result-share-btn">
            Share
          </Button>
        ) : null}
        {daily && practiceAvailable ? (
          <Button full onClick={onPractice} data-testid="result-practice">
            Keep practising
          </Button>
        ) : (
          <Button full onClick={onAgain} data-testid="result-again">
            Play again
          </Button>
        )}
        <Button full variant="ghost" onClick={onExit} data-testid="result-exit">
          Back to games
        </Button>
      </div>
    </div>
  );
}
