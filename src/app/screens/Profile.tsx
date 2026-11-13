import { type ReactElement, useState } from 'react';
import { ACHIEVEMENTS, LEVELS, type Level, type Profile, SKILLS, type Settings, type Skill, effectiveStreak, playerLevel, skillMastery, toDateKey } from '@sdk';
import { Button, ProgressBar, SaText, Sheet, cx } from '@ui';

function lastDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
    out.push(toDateKey(x));
  }
  return out;
}

export function ProfileScreen({ profile, setSettings, onReset, gameCount }: { profile: Profile; setSettings: (p: Partial<Settings>) => void; onReset: () => void; gameCount: number }): ReactElement {
  const today = toDateKey();
  const pl = playerLevel(profile.xp);
  const week = lastDays(7);
  const maxXp = Math.max(profile.dailyGoalXp, ...week.map((d) => profile.xpByDay[d] ?? 0));
  const mastery = skillMastery(profile);
  const [confirm, setConfirm] = useState(false);
  const s = profile.settings;
  const played = Object.keys(profile.games).length;

  return (
    <div className="app-screen" data-testid="screen-profile">
      <header className="app-section__head">
        <h1 className="sk-h1">
          <SaText>मम प्रगतिः</SaText> <span className="sk-muted sk-h3">· My progress</span>
        </h1>
      </header>

      <section className="app-statgrid">
        <div className="sk-card app-statcard">
          <div className="app-statcard__v">🔥 {effectiveStreak(profile, today)}</div>
          <div className="app-statcard__l">day streak · best {profile.streak.best}</div>
        </div>
        <div className="sk-card app-statcard">
          <div className="app-statcard__v">⭐ {profile.xp}</div>
          <div className="app-statcard__l">XP · level {pl.level}</div>
        </div>
        <div className="sk-card app-statcard">
          <div className="app-statcard__v">
            {played}/{gameCount}
          </div>
          <div className="app-statcard__l">games tried</div>
        </div>
        <div className="sk-card app-statcard">
          <div className="app-statcard__v">🧊 {profile.streak.freezes}</div>
          <div className="app-statcard__l">streak freezes</div>
        </div>
      </section>

      <section className="sk-card">
        <h2 className="sk-h3">This week</h2>
        <div className="app-week" aria-label="XP for the last 7 days">
          {week.map((d) => {
            const xp = profile.xpByDay[d] ?? 0;
            return (
              <div key={d} className="app-week__col" title={`${d}: ${xp} XP`}>
                <div className="app-week__bar">
                  <div className={cx('app-week__fill', xp >= profile.dailyGoalXp && 'is-goal')} style={{ height: `${Math.round((xp / maxXp) * 100)}%` }} />
                </div>
                <div className="app-week__day">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${d}T12:00:00`).getDay()]}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sk-card">
        <h2 className="sk-h3">Skills</h2>
        <div className="sk-stack">
          {(Object.keys(SKILLS) as Skill[]).map((k) => {
            const m = mastery[k];
            return (
              <div key={k} className="app-skill">
                <div className="sk-row sk-row--between">
                  <span>
                    <SaText>{SKILLS[k].sa}</SaText> <span className="sk-muted sk-small">· {SKILLS[k].en}</span>
                  </span>
                  <span className="sk-muted sk-small">{m ? `${m.items} items` : '—'}</span>
                </div>
                <ProgressBar value={m?.mastery ?? 0} label={`${SKILLS[k].en} mastery`} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="sk-card">
        <h2 className="sk-h3">Achievements</h2>
        <div className="app-badges">
          {ACHIEVEMENTS.map((a) => {
            const got = profile.achievements[a.id] !== undefined;
            return (
              <div key={a.id} className={cx('app-badge', got && 'is-on')} title={a.description}>
                <div className="app-badge__icon" aria-hidden="true">
                  {got ? '🏅' : '🔒'}
                </div>
                <SaText>{a.title.sa}</SaText>
                <div className="sk-muted sk-small">{a.description}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sk-card" data-testid="settings">
        <h2 className="sk-h3">Settings</h2>
        <div className="app-setting">
          <span>Script · लिपिः</span>
          <div className="app-seg" role="group" aria-label="Script">
            <button className={cx(s.script === 'deva' && 'is-active')} onClick={() => setSettings({ script: 'deva' })} data-testid="script-deva">
              देवनागरी
            </button>
            <button className={cx(s.script === 'iast' && 'is-active')} onClick={() => setSettings({ script: 'iast' })} data-testid="script-iast">
              IAST
            </button>
          </div>
        </div>
        <div className="app-setting">
          <span>Level · स्तरः</span>
          <select value={s.level} onChange={(e) => setSettings({ level: Number(e.target.value) as Level })} aria-label="Level" data-testid="setting-level">
            {LEVELS.map((l) => (
              <option key={l.level} value={l.level}>
                {l.iast} — {l.en}
              </option>
            ))}
          </select>
        </div>
        <div className="app-setting">
          <span>Theme</span>
          <div className="app-seg" role="group" aria-label="Theme">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button key={t} className={cx(s.theme === t && 'is-active')} onClick={() => setSettings({ theme: t })} data-testid={`theme-${t}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        {(
          [
            ['sound', 'Sound effects'],
            ['haptics', 'Vibration'],
            ['reducedMotion', 'Reduce motion'],
            ['labs', 'Show Labs (experimental games)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="app-setting">
            <span>{label}</span>
            <input type="checkbox" checked={s[key]} onChange={(e) => setSettings({ [key]: e.target.checked })} data-testid={`setting-${key}`} />
          </label>
        ))}
        <Button variant="ghost" onClick={() => setConfirm(true)} data-testid="reset">
          Reset all progress
        </Button>
        <p className="sk-muted sk-small">Progress is stored only on this device. Fonts: Noto Sans Devanagari and Tiro Devanagari Sanskrit (SIL OFL).</p>
      </section>

      <Sheet title="Reset all progress?" open={confirm} onClose={() => setConfirm(false)}>
        <div className="sk-stack">
          <p>This clears XP, streaks and mastery on this device. It cannot be undone.</p>
          <Button
            variant="bad"
            full
            onClick={() => {
              onReset();
              setConfirm(false);
            }}
            data-testid="reset-confirm"
          >
            Reset
          </Button>
          <Button variant="secondary" full onClick={() => setConfirm(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
