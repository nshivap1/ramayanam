import type { ReactElement } from 'react';
import { type GameEntry, type Level, type Profile, SKILLS, dailyDone, toDateKey } from '@sdk';
import { SaText, cx } from '@ui';
import { buildHash } from '../router';

export function GameCard({ entry, profile, level, mode, compact }: { entry: GameEntry; profile: Profile; level?: Level; mode?: string; compact?: boolean }): ReactElement {
  const m = entry.manifest;
  const stats = profile.games[m.id];
  const done = mode === 'daily' ? dailyDone(profile, m.id, toDateKey()) : undefined;
  return (
    <a className={cx('app-card', `hue-${m.hue}`, compact && 'app-card--compact', done && 'is-done')} href={buildHash(['play', m.id], { mode, level })} data-testid={`card-${m.id}`}>
      <span className="app-card__glyph" aria-hidden="true">
        <SaText script="deva">{m.icon}</SaText>
      </span>
      <span className="app-card__body">
        <span className="app-card__title">
          <SaText>{m.title.sa}</SaText>
        </span>
        <span className="app-card__en">{m.title.en}</span>
        {compact ? null : <span className="app-card__tag">{m.tagline}</span>}
        <span className="app-card__meta">
          {done ? <span className="app-card__done">✓ done today</span> : null}
          {!done && !compact ? <span>{m.skills.map((s) => SKILLS[s].en).join(' · ')}</span> : null}
          {!compact ? <span>· {m.minutes} min</span> : null}
          {stats && stats.bestStars > 0 ? <span className="app-card__stars">{'★'.repeat(stats.bestStars)}</span> : null}
          {m.status !== 'stable' ? <span className="app-card__badge">{m.status}</span> : null}
        </span>
      </span>
    </a>
  );
}
