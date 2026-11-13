import { type ReactElement, useMemo, useState } from 'react';
import { type GameEntry, type GameKind, type Profile, SKILLS, type Skill } from '@sdk';
import { SaText, cx } from '@ui';
import { GameCard } from './GameCard';

const KINDS: { id: GameKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'daily', label: 'Daily' },
  { id: 'puzzle', label: 'Puzzle' },
  { id: 'arcade', label: 'Arcade' },
  { id: 'lesson', label: 'Lessons' },
  { id: 'quiz', label: 'Quiz' },
];

export function GamesScreen({ games, profile }: { games: readonly GameEntry[]; profile: Profile }): ReactElement {
  const [kind, setKind] = useState<GameKind | 'all'>('all');
  const [skill, setSkill] = useState<Skill | 'all'>('all');
  const skills = useMemo(() => (Object.keys(SKILLS) as Skill[]).filter((s) => games.some((g) => g.manifest.skills.includes(s))), [games]);
  const shown = games.filter((g) => (kind === 'all' || g.manifest.kind === kind) && (skill === 'all' || g.manifest.skills.includes(skill)));
  return (
    <div className="app-screen" data-testid="screen-games">
      <header className="app-section__head">
        <h1 className="sk-h1">
          <SaText>क्रीडाः</SaText> <span className="sk-muted sk-h3">· {games.length} games</span>
        </h1>
      </header>
      <div className="app-filters" role="group" aria-label="Kind">
        {KINDS.map((k) => (
          <button key={k.id} className={cx('app-filter', kind === k.id && 'is-active')} onClick={() => setKind(k.id)} data-testid={`kind-${k.id}`}>
            {k.label}
          </button>
        ))}
      </div>
      <div className="app-filters" role="group" aria-label="Skill">
        <button className={cx('app-filter', skill === 'all' && 'is-active')} onClick={() => setSkill('all')}>
          All skills
        </button>
        {skills.map((s) => (
          <button key={s} className={cx('app-filter', skill === s && 'is-active')} onClick={() => setSkill(s)} data-testid={`skill-${s}`}>
            <SaText>{SKILLS[s].sa}</SaText>
          </button>
        ))}
      </div>
      <div className="app-grid" data-testid="game-grid">
        {shown.map((g) => (
          <GameCard key={g.manifest.id} entry={g} profile={profile} />
        ))}
        {shown.length === 0 ? <p className="sk-muted">No games match these filters.</p> : null}
      </div>
    </div>
  );
}
