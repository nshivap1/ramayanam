import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { type KV, type Profile, ROOT_PREFIX, type Settings, browserKV, loadProfile, saveProfile, toDateKey } from '@sdk';
import { SaText, SettingsContext, cx } from '@ui';
import { GameHost } from './GameHost';
import { Onboarding } from './Onboarding';
import { GAMES } from './registry.gen';
import { navigate, useRoute } from './router';
import { GamesScreen } from './screens/Games';
import { LearnScreen } from './screens/Learn';
import { ProfileScreen } from './screens/Profile';

const TABS = [
  { id: 'learn', sa: 'पठ', en: 'Learn', glyph: '📖' },
  { id: 'games', sa: 'क्रीड', en: 'Games', glyph: '🎲' },
  { id: 'profile', sa: 'अहम्', en: 'Me', glyph: '🪷' },
] as const;

function applyTheme(settings: Settings): void {
  const root = document.documentElement;
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  root.dataset['theme'] = dark ? 'dark' : 'light';
  root.dataset['reducedMotion'] = settings.reducedMotion ? 'true' : 'false';
  root.dataset['script'] = settings.script;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1a1310' : '#fff6ee');
}

export function App({ kv: injected }: { kv?: KV }): ReactElement {
  const kv = useMemo(() => injected ?? browserKV(), [injected]);
  const [profile, setProfile] = useState<Profile>(() => loadProfile(kv, toDateKey()));
  const route = useRoute();
  const [onboarded, setOnboarded] = useState<boolean>(() => kv.getItem(`${ROOT_PREFIX}onboarded`) !== null);

  const update = useCallback(
    (p: Profile) => {
      setProfile(p);
      saveProfile(kv, p);
    },
    [kv],
  );
  const setSettings = useCallback((patch: Partial<Settings>) => update({ ...profile, settings: { ...profile.settings, ...patch } }), [profile, update]);

  useEffect(() => applyTheme(profile.settings), [profile.settings]);

  // e2e/debug overrides via query (?script=iast&labs=1) — applied once, never persisted implicitly elsewhere.
  useEffect(() => {
    const q = route.query;
    const patch: Partial<Settings> = {};
    if ((q['script'] === 'iast' || q['script'] === 'deva') && q['script'] !== profile.settings.script) patch.script = q['script'];
    if (q['labs'] === '1' && !profile.settings.labs) patch.labs = true;
    if (Object.keys(patch).length) setSettings(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.query['script'], route.query['labs']]);

  const games = useMemo(() => GAMES.filter((g) => g.manifest.status !== 'labs' || profile.settings.labs), [profile.settings.labs]);

  const [head = 'learn', arg] = route.path;
  // First run: welcome screen (skipped for deep links into a game and for automated browser tests).
  if (!onboarded && head !== 'play' && route.query['e2e'] !== '1') {
    return (
      <SettingsContext.Provider value={profile.settings}>
        <Onboarding
          initial={profile.settings}
          onDone={(patch) => {
            kv.setItem(`${ROOT_PREFIX}onboarded`, toDateKey());
            setSettings(patch);
            setOnboarded(true);
          }}
        />
      </SettingsContext.Provider>
    );
  }
  let screen: ReactElement;
  let chrome = true;
  if (head === 'play' && arg) {
    const entry = GAMES.find((g) => g.manifest.id === arg);
    chrome = false;
    screen = entry ? (
      <GameHost key={`${arg}|${route.query['mode'] ?? ''}|${route.query['level'] ?? ''}|${route.query['seed'] ?? ''}`} entry={entry} query={route.query} profile={profile} kv={kv} onProfile={update} />
    ) : (
      <div className="sk-stage sk-center" data-testid="not-found">
        <div className="sk-h2">Game not found</div>
        <button className="sk-btn" onClick={() => navigate(['games'])}>
          All games
        </button>
      </div>
    );
  } else if (head === 'games') {
    screen = <GamesScreen games={games} profile={profile} />;
  } else if (head === 'profile') {
    screen = <ProfileScreen profile={profile} setSettings={setSettings} onReset={() => update(loadProfile({ getItem: () => null, setItem: () => undefined, removeItem: () => undefined, keys: () => [] }, toDateKey()))} gameCount={games.length} />;
  } else {
    screen = <LearnScreen games={games} profile={profile} setSettings={setSettings} />;
  }

  return (
    <SettingsContext.Provider value={profile.settings}>
      <div className={cx('app', !chrome && 'app--game')} data-testid="app" data-script={profile.settings.script}>
        <div className="app__view">{screen}</div>
        {chrome ? (
          <nav className="app__nav" aria-label="Main">
            {TABS.map((t) => (
              <a key={t.id} href={`#/${t.id}`} className={cx('app__tab', head === t.id && 'is-active')} aria-current={head === t.id ? 'page' : undefined} data-testid={`tab-${t.id}`}>
                <span className="app__tab-glyph" aria-hidden="true">
                  {t.glyph}
                </span>
                <span className="app__tab-label">
                  <SaText>{t.sa}</SaText>
                  <span className="sk-muted"> · {t.en}</span>
                </span>
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </SettingsContext.Provider>
  );
}
