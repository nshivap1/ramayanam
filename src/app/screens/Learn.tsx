import { type ReactElement, useMemo } from 'react';
import { type GameEntry, LEVELS, type Level, type Profile, SKILLS, type Settings, type Skill, effectiveStreak, playerLevel, toDateKey } from '@sdk';
import { ProgressBar, SaText, cx } from '@ui';
import { buildHash } from '../router';
import { GameCard } from './GameCard';

/** Skill order of the learning path within a level. */
const PATH_ORDER: Skill[] = ['akshara', 'shabdakosha', 'sankhya', 'kriyapada', 'vibhakti', 'avyaya', 'vakya', 'sandhi', 'krdanta', 'samasa', 'chandas', 'subhashita'];

export interface PathNode {
  entry: GameEntry;
  skill: Skill;
}

/**
 * The learning path for a level is derived from game manifests (levels × primary skill),
 * so a newly contributed game appears on the path with no central edit.
 */
export function buildPath(games: readonly GameEntry[], level: Level): PathNode[] {
  const nodes: PathNode[] = [];
  for (const skill of PATH_ORDER) {
    for (const entry of games) {
      if (entry.manifest.skills[0] === skill && entry.manifest.levels.includes(level)) nodes.push({ entry, skill });
    }
  }
  return nodes;
}

export function LearnScreen({ games, profile, setSettings }: { games: readonly GameEntry[]; profile: Profile; setSettings: (p: Partial<Settings>) => void }): ReactElement {
  const today = toDateKey();
  const level = profile.settings.level;
  const streak = effectiveStreak(profile, today);
  const pl = playerLevel(profile.xp);
  const xpToday = profile.xpByDay[today] ?? 0;
  const dailies = useMemo(() => games.filter((g) => g.manifest.modes.includes('daily')), [games]);
  const path = useMemo(() => buildPath(games, level), [games, level]);
  const doneToday = dailies.filter((g) => profile.daily[today]?.[g.manifest.id]).length;

  return (
    <div className="app-screen" data-testid="screen-learn">
      <header className="app-hero">
        <div className="app-hero__brand">
          <SaText className="app-hero__title" script="deva">
            संस्कुरु
          </SaText>
          <span className="app-hero__sub">saṃskuru · play your way to Saṃskṛtam</span>
        </div>
        <div className="app-hero__stats">
          <span className="app-stat" data-testid="stat-streak" title="Day streak">
            🔥 <b>{streak}</b>
          </span>
          <span className="app-stat" data-testid="stat-xp" title="Total XP">
            ⭐ <b>{profile.xp}</b>
          </span>
        </div>
      </header>

      <section className="app-goal sk-card" aria-label="Daily goal">
        <div className="sk-row sk-row--between">
          <strong>
            <SaText>अद्यतनं लक्ष्यम्</SaText> <span className="sk-muted">· Today's goal</span>
          </strong>
          <span className="sk-muted sk-small" style={{ whiteSpace: 'nowrap' }}>
            {Math.min(xpToday, profile.dailyGoalXp)} / {profile.dailyGoalXp} XP · level {pl.level}
          </span>
        </div>
        <ProgressBar value={xpToday / profile.dailyGoalXp} label="Daily XP goal" />
      </section>

      {dailies.length > 0 ? (
        <section aria-label="Daily puzzles">
          <div className="app-section__head">
            <h2 className="sk-h3">
              <SaText>दैनिकक्रीडाः</SaText> <span className="sk-muted">· Daily puzzles</span>
            </h2>
            <span className="sk-muted sk-small">
              {doneToday} / {dailies.length}
            </span>
          </div>
          <div className="app-dailies">
            {dailies.map((g) => (
              <GameCard key={g.manifest.id} entry={g} profile={profile} mode="daily" compact />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-label="Learning path">
        <div className="app-section__head">
          <h2 className="sk-h3">
            <SaText>मार्गः</SaText> <span className="sk-muted">· Your path</span>
          </h2>
        </div>
        <div className="app-levels" role="tablist" aria-label="Level">
          {LEVELS.map((l) => (
            <button key={l.level} role="tab" aria-selected={l.level === level} className={cx('app-level', l.level === level && 'is-active')} onClick={() => setSettings({ level: l.level })} data-testid={`level-${l.level}`}>
              <SaText>{l.sa}</SaText>
              <span className="app-level__en">{l.en}</span>
            </button>
          ))}
        </div>
        {path.length === 0 ? (
          <p className="sk-muted sk-center" style={{ padding: 'var(--s-6) 0' }} data-testid="path-empty">
            New games for this level are on the way. Try a neighbouring level, or <a href="#/games">browse all games</a>.
          </p>
        ) : (
          <ol className="app-path" data-testid="path">
            {path.map((n, i) => {
              const m = n.entry.manifest;
              const stars = profile.games[m.id]?.bestStars ?? 0;
              const newSkill = i === 0 || path[i - 1]?.skill !== n.skill;
              return (
                <li key={m.id} className={cx('app-path__item', `hue-${m.hue}`)}>
                  {newSkill ? (
                    <div className="app-path__skill">
                      <SaText>{SKILLS[n.skill].sa}</SaText> <span className="sk-muted">· {SKILLS[n.skill].en}</span>
                    </div>
                  ) : null}
                  <a className={cx('app-path__node', stars > 0 && 'is-done')} style={{ marginInlineStart: `${[0, 18, 30, 18, 0, -18, -30, -18][i % 8] ?? 0}%` }} href={buildHash(['play', m.id], { level, mode: m.modes.find((x) => x !== 'daily') ?? m.modes[0] })} data-testid={`path-${m.id}`}>
                    <span className="app-path__glyph">
                      <SaText script="deva">{m.icon}</SaText>
                    </span>
                    <span className="app-path__label">
                      <SaText>{m.title.sa}</SaText>
                      <span className="app-path__en">{m.title.en}</span>
                      <span className="app-path__stars" aria-label={`${stars} stars`}>
                        {'★'.repeat(stars)}
                        <span className="app-path__stars-off">{'★'.repeat(3 - stars)}</span>
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
