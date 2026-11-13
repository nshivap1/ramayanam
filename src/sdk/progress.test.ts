import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS,
  DEFAULT_SETTINGS,
  LEITNER_INTERVALS,
  PROFILE_VERSION,
  type Profile,
  XP_PER_LEVEL,
  applyMastery,
  dailyDone,
  dueItems,
  effectiveStreak,
  loadProfile,
  newProfile,
  playerLevel,
  recordSession,
  resolveLevel,
  saveProfile,
  skillMastery,
  starsFor,
  xpFor,
} from './progress';
import { ROOT_PREFIX, memoryKV } from './storage';
import type { GameMode, Level, MasteryEvent, SessionResult } from './types';

const DAY0 = '2026-11-10';
const KEY = `${ROOT_PREFIX}profile`;
const G = { id: 'test-game' };

/** dateKey `n` days after DAY0 (UTC arithmetic, independent of the module under test). */
function day(n: number, from: string = DAY0): string {
  const [y, m, d] = from.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreeze(v);
  }
  return value;
}
const won = (extra: Partial<SessionResult> = {}): SessionResult => ({ outcome: 'won', score: 10, ...extra });
const lost = (extra: Partial<SessionResult> = {}): SessionResult => ({ outcome: 'lost', score: 0, ...extra });
/** Play one session on each listed day offset; returns the final profile. Inputs are frozen to prove purity along the way. */
function playDays(offsets: readonly number[], start: Profile = newProfile(DAY0), mode: GameMode = 'practice'): Profile {
  let p = start;
  for (const o of offsets) p = recordSession(deepFreeze(p), G, mode, won(), day(o)).profile;
  return p;
}
const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const stored = (value: unknown): ReturnType<typeof memoryKV> => memoryKV({ [KEY]: typeof value === 'string' ? value : JSON.stringify(value) });

// ───────────────────────────── newProfile / loadProfile / saveProfile ─────────────────────────────

test('newProfile: a clean slate with default settings (and its own settings object)', () => {
  const p = newProfile(DAY0);
  assert.deepEqual(p, {
    version: PROFILE_VERSION,
    createdAt: DAY0,
    xp: 0,
    streak: { current: 0, best: 0, lastDay: null, freezes: 0 },
    xpByDay: {},
    dailyGoalXp: 30,
    games: {},
    daily: {},
    mastery: {},
    achievements: {},
    settings: DEFAULT_SETTINGS,
  });
  assert.notEqual(p.settings, DEFAULT_SETTINGS, 'settings must be a copy');
  p.settings.script = 'iast';
  assert.equal(DEFAULT_SETTINGS.script, 'deva');
  assert.equal(newProfile(DAY0).settings.script, 'deva');
  assert.deepEqual(DEFAULT_SETTINGS, { script: 'deva', sound: true, haptics: true, reducedMotion: false, level: 1, labs: false, theme: 'system' });
});

test('loadProfile: nothing stored → new profile dated today', () => {
  assert.deepEqual(loadProfile(memoryKV(), DAY0), newProfile(DAY0));
});

test('saveProfile → loadProfile round-trips a played profile exactly', () => {
  const kv = memoryKV();
  let p = playDays([0, 1, 2]);
  p = recordSession(p, { id: 'other' }, 'daily', won({ correct: 9, total: 10, share: '🟩🟩', summary: '9/10', best: { label: 'Chain', value: 4 }, mastery: [{ skill: 'sandhi', itemId: 'sandhi:guna:deva+indra', correct: true }] }), day(2)).profile;
  saveProfile(kv, p);
  assert.deepEqual(kv.keys(), [KEY]);
  assert.deepEqual(loadProfile(kv, day(40)), JSON.parse(JSON.stringify(p)));
  assert.equal(loadProfile(kv, day(40)).createdAt, DAY0, 'createdAt is the first day, not the load day');
});

test('loadProfile: unreadable or non-object JSON → new profile, never a throw', () => {
  for (const raw of ['{', '', 'null', '5', '"profile"', 'true', '[]', '[1,2,3]', 'undefined', '{"xp":']) {
    assert.deepEqual(loadProfile(stored(raw), DAY0), newProfile(DAY0), `raw ${JSON.stringify(raw)}`);
  }
});

test('loadProfile: partial data is merged over defaults (missing top-level and nested fields are filled in)', () => {
  const p = loadProfile(stored({ xp: 140, streak: { current: 4, lastDay: day(-1) }, settings: { script: 'iast' }, createdAt: '2026-01-02' }), DAY0);
  assert.equal(p.xp, 140);
  assert.equal(p.createdAt, '2026-01-02');
  assert.deepEqual(p.streak, { current: 4, best: 0, lastDay: day(-1), freezes: 0 });
  assert.deepEqual(p.settings, { ...DEFAULT_SETTINGS, script: 'iast' });
  assert.equal(p.dailyGoalXp, 30);
  assert.deepEqual([p.xpByDay, p.games, p.daily, p.mastery, p.achievements], [{}, {}, {}, {}, {}]);
});

test('loadProfile: a setting added in a later release gets its default; settings the user changed are kept', () => {
  const old = { settings: { script: 'iast', sound: false } }; // written before haptics/theme/labs existed
  const p = loadProfile(stored(old), DAY0);
  assert.equal(p.settings.script, 'iast');
  assert.equal(p.settings.sound, false);
  assert.equal(p.settings.haptics, true);
  assert.equal(p.settings.theme, 'system');
  assert.equal(p.settings.level, 1);
});

test('loadProfile: version is always the current one; fields from a newer release survive a load/save cycle', () => {
  const kv = stored({ version: 99, xp: 5, futureField: { a: 1 }, settings: { futureSetting: 'x' }, achievements: { 'from-the-future': '2030-01-01' } });
  const p = loadProfile(kv, DAY0);
  assert.equal(p.version, PROFILE_VERSION);
  assert.equal(p.xp, 5);
  saveProfile(kv, p);
  const again = JSON.parse(kv.getItem(KEY) as string) as Record<string, unknown>;
  assert.deepEqual(again['futureField'], { a: 1 }, 'a downgrade must not destroy data written by a newer version');
  assert.deepEqual((again['settings'] as Record<string, unknown>)['futureSetting'], 'x');
  assert.deepEqual(p.achievements, { 'from-the-future': '2030-01-01' });
});

test('loadProfile: null or wrong-typed containers fall back to empty/default containers', () => {
  for (const bad of [null, 5, 'abc', true, [], [1]]) {
    const p = loadProfile(stored({ xp: 7, streak: bad, settings: bad, xpByDay: bad, games: bad, daily: bad, mastery: bad, achievements: bad }), DAY0);
    const label = `containers = ${JSON.stringify(bad)}`;
    assert.equal(p.xp, 7, label);
    assert.deepEqual(p.streak, { current: 0, best: 0, lastDay: null, freezes: 0 }, label);
    assert.deepEqual(p.settings, DEFAULT_SETTINGS, label);
    assert.deepEqual([p.xpByDay, p.games, p.daily, p.mastery, p.achievements], [{}, {}, {}, {}, {}], label);
  }
});

test('loadProfile: wrong-typed scalars fall back to defaults instead of poisoning arithmetic', () => {
  for (const bad of [null, '12', 'abc', true, {}, []]) {
    const p = loadProfile(stored({ xp: bad, dailyGoalXp: bad, createdAt: bad, streak: { current: bad, best: bad, freezes: bad, lastDay: bad } }), DAY0);
    const label = `scalars = ${JSON.stringify(bad)}`;
    assert.equal(p.xp, 0, label);
    assert.equal(p.dailyGoalXp, 30, label);
    assert.equal(p.createdAt, DAY0, label);
    assert.deepEqual(p.streak, { current: 0, best: 0, lastDay: null, freezes: 0 }, label);
  }
  assert.equal(loadProfile(stored({ dailyGoalXp: 0 }), DAY0).dailyGoalXp, 30, 'a zero goal would divide by zero on the home screen');
  assert.equal(loadProfile(stored({ dailyGoalXp: -5 }), DAY0).dailyGoalXp, 30);
  assert.equal(loadProfile(stored({ dailyGoalXp: 50 }), DAY0).dailyGoalXp, 50);
});

test('loadProfile: a malformed streak.lastDay cannot crash the home screen or freeze the streak for ever', () => {
  for (const lastDay of [5, 'garbage', '', '10/11/2026', {}, '2026-13-45x']) {
    const p = loadProfile(stored({ streak: { current: 4, best: 9, lastDay, freezes: 1 } }), DAY0);
    const label = `lastDay = ${JSON.stringify(lastDay)}`;
    assert.doesNotThrow(() => effectiveStreak(p, DAY0), label);
    assert.ok(Number.isFinite(effectiveStreak(p, DAY0)), label);
    const after = recordSession(p, G, 'practice', won(), DAY0);
    assert.equal(after.profile.streak.lastDay, DAY0, label);
    assert.equal(after.profile.streak.current, 1, label);
    assert.equal(after.profile.streak.best, 9, `${label}: the best streak is still worth keeping`);
    assert.equal(recordSession(after.profile, G, 'practice', won(), day(1)).profile.streak.current, 2, label);
  }
});

test('loadProfile → recordSession: whatever is in storage, the next session yields a sane, serialisable profile', () => {
  const payloads: unknown[] = [
    {},
    { xp: 'lots' },
    { streak: { current: '7', lastDay: 5 } },
    { games: { 'test-game': null } },
    { games: { 'test-game': 5 } },
    { games: { 'test-game': {} } },
    { daily: { [DAY0]: null } },
    { daily: { [DAY0]: 'x' } },
    { xpByDay: 'x' },
    { mastery: 'x' },
    { achievements: [] },
    { settings: { script: 'tamil', level: 9 } },
  ];
  for (const payload of payloads) {
    const label = JSON.stringify(payload);
    const p = loadProfile(stored(payload), DAY0);
    const out = recordSession(p, G, 'daily', won({ correct: 9, total: 10, mastery: [{ skill: 'akshara', itemId: 'a', correct: true }] }), DAY0);
    const n = out.profile;
    assert.equal(typeof n.xp, 'number', label);
    assert.ok(Number.isFinite(n.xp) && n.xp >= out.xpEarned, label);
    assert.equal(n.streak.current, 1, label);
    assert.equal(n.streak.lastDay, DAY0, label);
    assert.ok((n.games['test-game']?.plays ?? 0) >= 1, label);
    assert.equal(n.daily[DAY0]?.['test-game']?.score, 10, label);
    assert.equal(n.mastery['akshara|a']?.box, 1, label);
    assert.ok(Number.isFinite(n.xpByDay[DAY0]), label);
    assert.deepEqual(JSON.parse(JSON.stringify(n)), JSON.parse(JSON.stringify(loadProfile(stored(n), DAY0))), `${label}: load(save(p)) must be stable`);
  }
});

// ───────────────────────────── stars / XP / player level ─────────────────────────────

test('starsFor: explicit stars always win (including 0)', () => {
  for (const stars of [0, 1, 2, 3] as const) {
    assert.equal(starsFor(won({ stars, correct: 10, total: 10 })), stars);
    assert.equal(starsFor(lost({ stars, correct: 0, total: 10 })), stars);
  }
});

test('starsFor: accuracy table for won / completed sessions', () => {
  const table: [number, number, 0 | 1 | 2 | 3][] = [
    [10, 10, 3], [9, 10, 3], [90, 100, 3], [27, 30, 3], [89, 100, 2], [8, 10, 2], [7, 10, 2], [21, 30, 2], [69, 100, 1], [5, 10, 1], [1, 10, 1], [1, 1000, 1], [0, 10, 0], [1, 1, 3], [0, 1, 0],
  ];
  for (const [correct, total, expected] of table) {
    assert.equal(starsFor(won({ correct, total })), expected, `won ${correct}/${total}`);
    assert.equal(starsFor({ outcome: 'completed', score: 0, correct, total }), expected, `completed ${correct}/${total}`);
  }
});

test('starsFor: a lost session never earns more than 1 star from accuracy', () => {
  assert.equal(starsFor(lost({ correct: 10, total: 10 })), 1);
  assert.equal(starsFor(lost({ correct: 5, total: 10 })), 1);
  assert.equal(starsFor(lost({ correct: 49, total: 100 })), 0);
  assert.equal(starsFor(lost({ correct: 0, total: 10 })), 0);
});

test('starsFor: without usable accuracy, falls back to the outcome', () => {
  assert.equal(starsFor(won()), 2);
  assert.equal(starsFor({ outcome: 'completed', score: 5 }), 2);
  assert.equal(starsFor(lost()), 0);
  assert.equal(starsFor(won({ correct: 0, total: 0 })), 2, 'total 0 means "no discrete answers"');
  assert.equal(starsFor(won({ total: 10 })), 2, 'total without correct');
  assert.equal(starsFor(won({ correct: 10 })), 2, 'correct without total');
  assert.equal(starsFor(lost({ correct: 0, total: 0 })), 0);
});

test('xpFor: 5 + 5 per star; a loss is capped at 8; +10 only for the first daily', () => {
  const table: [SessionResult, GameMode, boolean, number][] = [
    [won({ stars: 0 }), 'practice', false, 5],
    [won({ stars: 1 }), 'practice', false, 10],
    [won({ stars: 2 }), 'practice', false, 15],
    [won({ stars: 3 }), 'practice', false, 20],
    [won({ stars: 3 }), 'endless', false, 20],
    [won({ stars: 3 }), 'timed', false, 20],
    [lost({ stars: 0 }), 'practice', false, 5],
    [lost({ stars: 1 }), 'practice', false, 8],
    [lost({ stars: 3 }), 'practice', false, 8],
    [won({ stars: 3 }), 'daily', true, 30],
    [won({ stars: 0 }), 'daily', true, 15],
    [lost({ stars: 0 }), 'daily', true, 15],
    [lost({ stars: 3 }), 'daily', true, 18],
    [won({ stars: 3 }), 'daily', false, 20],
    [won({ stars: 3 }), 'practice', true, 20], // the flag is ignored outside daily mode
  ];
  for (const [result, mode, first, expected] of table) assert.equal(xpFor(result, mode, first), expected, `${result.outcome} ★${result.stars} ${mode} first=${first}`);
});

test('xpFor: bounded whatever a game reports — no score, accuracy or star value can inflate it', () => {
  for (const mode of ['daily', 'practice', 'endless', 'timed'] as const) {
    for (const outcome of ['won', 'lost', 'completed'] as const) {
      for (const score of [0, 10, 1e9, -5]) {
        for (const [correct, total] of [[0, 10], [10, 10], [1e6, 1], [undefined, undefined]] as const) {
          const xp = xpFor({ outcome, score, correct, total }, mode, true);
          assert.ok(Number.isInteger(xp) && xp >= 5 && xp <= 30, `${mode}/${outcome}/${score}/${correct}/${total} → ${xp}`);
        }
      }
    }
  }
});

test('playerLevel: 100 XP per level, 1-based', () => {
  assert.equal(XP_PER_LEVEL, 100);
  assert.deepEqual(playerLevel(0), { level: 1, into: 0, need: 100 });
  assert.deepEqual(playerLevel(99), { level: 1, into: 99, need: 100 });
  assert.deepEqual(playerLevel(100), { level: 2, into: 0, need: 100 });
  assert.deepEqual(playerLevel(250), { level: 3, into: 50, need: 100 });
  assert.deepEqual(playerLevel(12345), { level: 124, into: 45, need: 100 });
});

// ───────────────────────────── streak ─────────────────────────────

test('streak: first ever session starts a 1-day streak', () => {
  const out = recordSession(newProfile(DAY0), G, 'practice', won(), DAY0);
  assert.deepEqual(out.profile.streak, { current: 1, best: 1, lastDay: DAY0, freezes: 0 });
  assert.equal(out.streakBefore, 0);
  assert.equal(out.streakAfter, 1);
});

test('streak: a lost session keeps the day just like a win', () => {
  const p = recordSession(newProfile(DAY0), G, 'practice', lost(), DAY0).profile;
  assert.equal(p.streak.current, 1);
  assert.equal(recordSession(p, G, 'practice', lost(), day(1)).profile.streak.current, 2);
});

test('streak: playing twice on the same day counts once', () => {
  const once = playDays([0]);
  const twice = playDays([0, 0, 0]);
  assert.deepEqual(twice.streak, once.streak);
  const out = recordSession(once, G, 'practice', won(), DAY0);
  assert.equal(out.streakBefore, 1);
  assert.equal(out.streakAfter, 1);
});

test('streak: consecutive days add up, across month and year ends', () => {
  assert.deepEqual(playDays([0, 1, 2]).streak, { current: 3, best: 3, lastDay: day(2), freezes: 0 });
  let p = newProfile('2026-12-29');
  for (const d of ['2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']) p = recordSession(p, G, 'practice', won(), d).profile;
  assert.equal(p.streak.current, 5);
  p = newProfile('2028-02-27');
  for (const d of ['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01']) p = recordSession(p, G, 'practice', won(), d).profile;
  assert.equal(p.streak.current, 4, 'leap day is a day like any other');
  p = newProfile('2026-02-27');
  for (const d of ['2026-02-27', '2026-02-28', '2026-03-01']) p = recordSession(p, G, 'practice', won(), d).profile;
  assert.equal(p.streak.current, 3);
});

test('streak: a missed day without a freeze resets to 1 and keeps the best', () => {
  const p = playDays([0, 1, 2, 4]);
  assert.deepEqual(p.streak, { current: 1, best: 3, lastDay: day(4), freezes: 0 });
  const out = recordSession(playDays([0, 1, 2]), G, 'practice', won(), day(4));
  assert.equal(out.streakBefore, 0, 'the broken streak already shows as 0 before the session');
  assert.equal(out.streakAfter, 1);
  assert.equal(playDays([0, 1, 2, 30]).streak.current, 1);
});

test('streak: a freeze is earned on day 7 — exactly once, even with several sessions that day', () => {
  assert.equal(playDays(range(0, 5)).streak.freezes, 0);
  assert.equal(playDays(range(0, 6)).streak.freezes, 1);
  assert.equal(playDays([...range(0, 6), 6, 6, 6]).streak.freezes, 1);
  assert.equal(playDays(range(0, 12)).streak.freezes, 1);
});

test('streak: at most 2 freezes are held (earned on days 7 and 14, not 21)', () => {
  assert.equal(playDays(range(0, 13)).streak.freezes, 2);
  assert.equal(playDays(range(0, 20)).streak.freezes, 2);
  assert.equal(playDays(range(0, 27)).streak.freezes, 2);
  assert.equal(playDays(range(0, 27)).streak.current, 28);
});

test('streak: a freeze is consumed by a one-day gap and the streak continues', () => {
  const seven = playDays(range(0, 6));
  assert.equal(effectiveStreak(seven, day(7)), 7, 'the day after: still alive');
  assert.equal(effectiveStreak(seven, day(8)), 7, 'one missed day is covered by the freeze');
  assert.equal(effectiveStreak(seven, day(9)), 0, 'two missed days are not');
  const out = recordSession(seven, G, 'practice', won(), day(8));
  assert.deepEqual(out.profile.streak, { current: 8, best: 8, lastDay: day(8), freezes: 0 });
  assert.equal(out.streakBefore, 7);
  assert.equal(out.streakAfter, 8);
  // the freeze is gone: the next gap breaks the streak
  assert.deepEqual(recordSession(out.profile, G, 'practice', won(), day(10)).profile.streak, { current: 1, best: 8, lastDay: day(10), freezes: 0 });
});

test('streak: two freezes cover a two-day gap; one freeze does not', () => {
  const fourteen = playDays(range(0, 13));
  assert.equal(fourteen.streak.freezes, 2);
  assert.equal(effectiveStreak(fourteen, day(16)), 14);
  assert.equal(effectiveStreak(fourteen, day(17)), 0);
  assert.deepEqual(recordSession(fourteen, G, 'practice', won(), day(16)).profile.streak, { current: 15, best: 15, lastDay: day(16), freezes: 0 });
  assert.deepEqual(recordSession(fourteen, G, 'practice', won(), day(15)).profile.streak, { current: 15, best: 15, lastDay: day(15), freezes: 1 });
  const seven = playDays(range(0, 6));
  assert.deepEqual(recordSession(seven, G, 'practice', won(), day(9)).profile.streak, { current: 1, best: 7, lastDay: day(9), freezes: 1 }, 'an insufficient freeze is not spent');
});

test('streak: a freeze-saved streak that reaches a multiple of 7 earns the next freeze', () => {
  const thirteen = { ...newProfile(DAY0), streak: { current: 13, best: 13, lastDay: day(0), freezes: 1 } };
  assert.deepEqual(recordSession(thirteen, G, 'practice', won(), day(2)).profile.streak, { current: 14, best: 14, lastDay: day(2), freezes: 1 });
});

test('streak: the clock going backwards changes nothing (no reset, no double count, no crash)', () => {
  const p = playDays([0, 1, 2]);
  const back = recordSession(p, G, 'practice', won(), day(0));
  assert.deepEqual(back.profile.streak, p.streak);
  assert.equal(back.streakBefore, 3);
  assert.equal(back.streakAfter, 3);
  assert.equal(effectiveStreak(p, day(-5)), 3);
  // …and when the clock is right again the streak carries on from the real last day
  assert.equal(recordSession(back.profile, G, 'practice', won(), day(3)).profile.streak.current, 4);
  assert.equal(back.profile.xpByDay[day(0)], (p.xpByDay[day(0)] ?? 0) + back.xpEarned, 'XP is still credited to the (wrong) day');
});

test('effectiveStreak: 0 before any play; unchanged today and tomorrow; 0 after a gap', () => {
  assert.equal(effectiveStreak(newProfile(DAY0), DAY0), 0);
  const p = playDays([0, 1]);
  assert.equal(effectiveStreak(p, day(1)), 2);
  assert.equal(effectiveStreak(p, day(2)), 2);
  assert.equal(effectiveStreak(p, day(3)), 0);
  assert.equal(effectiveStreak(p, day(400)), 0);
  assert.equal(p.streak.current, 2, 'effectiveStreak is a view; it never mutates');
});

test('streak: best never decreases over a long irregular history', () => {
  let p = newProfile(DAY0);
  let best = 0;
  const offsets = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14, 20, 21, 22, 23, 24, 25, 26, 27, 29, 31, 40];
  for (const o of offsets) {
    p = recordSession(p, G, 'practice', won(), day(o)).profile;
    assert.ok(p.streak.best >= best && p.streak.best >= p.streak.current);
    assert.ok(p.streak.freezes >= 0 && p.streak.freezes <= 2);
    assert.ok(p.streak.current >= 1);
    best = p.streak.best;
  }
});

// ───────────────────────────── recordSession: stats ─────────────────────────────

test('recordSession: first session creates the game stats and credits XP', () => {
  const out = recordSession(newProfile(DAY0), G, 'practice', won({ score: 120, correct: 10, total: 10 }), DAY0);
  assert.equal(out.stars, 3);
  assert.equal(out.xpEarned, 20);
  assert.equal(out.newBestScore, true);
  assert.equal(out.dailyReplay, false);
  assert.equal(out.profile.xp, 20);
  assert.deepEqual(out.profile.xpByDay, { [DAY0]: 20 });
  assert.deepEqual(JSON.parse(JSON.stringify(out.profile.games['test-game'])), { plays: 1, wins: 1, bestScore: 120, bestStars: 3, lastPlayed: DAY0, dailyStreak: 0 });
  assert.deepEqual(out.profile.daily, {}, 'practice sessions never create daily records');
});

test('recordSession: plays/wins/best score/best stars accumulate; a loss is a play but not a win', () => {
  let p = newProfile(DAY0);
  const steps: [SessionResult, { plays: number; wins: number; bestScore: number; bestStars: number; newBest: boolean }][] = [
    [won({ score: 50, stars: 1 }), { plays: 1, wins: 1, bestScore: 50, bestStars: 1, newBest: true }],
    [lost({ score: 80, stars: 0 }), { plays: 2, wins: 1, bestScore: 80, bestStars: 1, newBest: true }],
    [won({ score: 80, stars: 3 }), { plays: 3, wins: 2, bestScore: 80, bestStars: 3, newBest: false }],
    [{ outcome: 'completed', score: 10, stars: 2 }, { plays: 4, wins: 3, bestScore: 80, bestStars: 3, newBest: false }],
    [won({ score: 81, stars: 0 }), { plays: 5, wins: 4, bestScore: 81, bestStars: 3, newBest: true }],
  ];
  for (const [result, want] of steps) {
    const out = recordSession(p, G, 'practice', result, day(1));
    const s = out.profile.games['test-game']!;
    assert.deepEqual({ plays: s.plays, wins: s.wins, bestScore: s.bestScore, bestStars: s.bestStars, newBest: out.newBestScore }, want);
    assert.equal(s.lastPlayed, day(1));
    p = out.profile;
  }
});

test('recordSession: games are tracked independently', () => {
  let p = recordSession(newProfile(DAY0), { id: 'a' }, 'practice', won({ score: 5 }), DAY0).profile;
  p = recordSession(p, { id: 'b' }, 'practice', lost({ score: 9 }), DAY0).profile;
  assert.deepEqual(Object.keys(p.games).sort(), ['a', 'b']);
  assert.equal(p.games['a']!.bestScore, 5);
  assert.equal(p.games['a']!.wins, 1);
  assert.equal(p.games['b']!.wins, 0);
  assert.equal(p.xp, p.xpByDay[DAY0]);
});

test('recordSession: personal best — higher is better by default', () => {
  const play = (p: Profile, value: number): Profile => recordSession(p, G, 'practice', won({ best: { label: 'Longest chain', value } }), DAY0).profile;
  let p = play(newProfile(DAY0), 5);
  assert.deepEqual(p.games['test-game']!.best, { label: 'Longest chain', value: 5 });
  p = play(p, 3);
  assert.equal(p.games['test-game']!.best!.value, 5);
  p = play(p, 5);
  assert.equal(p.games['test-game']!.best!.value, 5);
  p = play(p, 12);
  assert.equal(p.games['test-game']!.best!.value, 12);
  p = recordSession(p, G, 'practice', won(), DAY0).profile;
  assert.deepEqual(p.games['test-game']!.best, { label: 'Longest chain', value: 12 }, 'a session without `best` keeps the record');
});

test('recordSession: personal best with lowerIsBetter — fewer is better, and the flag is not stored', () => {
  const play = (p: Profile, value: number): Profile => recordSession(p, G, 'practice', won({ best: { label: 'Fewest moves', value, lowerIsBetter: true } }), DAY0).profile;
  let p = play(newProfile(DAY0), 14);
  assert.deepEqual(p.games['test-game']!.best, { label: 'Fewest moves', value: 14 });
  p = play(p, 20);
  assert.equal(p.games['test-game']!.best!.value, 14, 'a worse (higher) value must not replace the record');
  p = play(p, 14);
  assert.equal(p.games['test-game']!.best!.value, 14);
  p = play(p, 9);
  assert.equal(p.games['test-game']!.best!.value, 9);
  p = play(p, 0);
  assert.equal(p.games['test-game']!.best!.value, 0, 'zero is a legitimate best');
});

test('recordSession: a new best label replaces the old statistic (game changed what it tracks)', () => {
  let p = recordSession(newProfile(DAY0), G, 'practice', won({ best: { label: 'Best streak', value: 50 } }), DAY0).profile;
  p = recordSession(p, G, 'practice', won({ best: { label: 'Fewest moves', value: 99, lowerIsBetter: true } }), DAY0).profile;
  assert.deepEqual(p.games['test-game']!.best, { label: 'Fewest moves', value: 99 });
});

// ───────────────────────────── recordSession: daily ─────────────────────────────

test('daily: the first attempt of the day is recorded and earns the +10 bonus', () => {
  const out = recordSession(newProfile(DAY0), G, 'daily', won({ score: 4, stars: 3, share: '🟩🟨⬛', summary: 'Solved in 4 of 6' }), DAY0);
  assert.equal(out.xpEarned, 30);
  assert.equal(out.dailyReplay, false);
  assert.deepEqual(out.profile.daily, { [DAY0]: { 'test-game': { score: 4, stars: 3, outcome: 'won', share: '🟩🟨⬛', summary: 'Solved in 4 of 6' } } });
  assert.deepEqual(dailyDone(out.profile, 'test-game', DAY0), out.profile.daily[DAY0]!['test-game']);
  assert.equal(dailyDone(out.profile, 'test-game', day(1)), undefined);
  assert.equal(dailyDone(out.profile, 'other-game', DAY0), undefined);
  assert.equal(out.profile.games['test-game']!.dailyStreak, 1);
  assert.equal(out.profile.games['test-game']!.lastDaily, DAY0);
});

test('daily: a replay earns exactly 2 XP and never overwrites the recorded attempt — better or worse', () => {
  const first = recordSession(newProfile(DAY0), G, 'daily', lost({ score: 1, stars: 0, share: 'FIRST', summary: 'first' }), DAY0);
  const record = structuredClone(first.profile.daily[DAY0]!['test-game']);
  for (const replay of [won({ score: 999, stars: 3, share: 'REPLAY', summary: 'replay' }), lost({ score: 0, stars: 0 }), won({ score: 1, correct: 10, total: 10 })]) {
    const out = recordSession(first.profile, G, 'daily', replay, DAY0);
    assert.equal(out.dailyReplay, true);
    assert.equal(out.xpEarned, 2);
    assert.equal(out.profile.xp, first.profile.xp + 2);
    assert.deepEqual(out.profile.daily[DAY0]!['test-game'], record, 'the daily record is the first attempt, for ever');
    assert.equal(out.profile.games['test-game']!.dailyStreak, 0, 'a replay cannot repair a lost daily');
    assert.equal(out.profile.games['test-game']!.lastDaily, DAY0);
    assert.equal(out.profile.games['test-game']!.plays, 2);
  }
});

test('daily: replay detection is per game and per day', () => {
  let p = recordSession(newProfile(DAY0), { id: 'a' }, 'daily', won({ stars: 3 }), DAY0).profile;
  const otherGame = recordSession(p, { id: 'b' }, 'daily', won({ stars: 3 }), DAY0);
  assert.equal(otherGame.dailyReplay, false);
  assert.equal(otherGame.xpEarned, 30);
  p = otherGame.profile;
  const nextDay = recordSession(p, { id: 'a' }, 'daily', won({ stars: 3 }), day(1));
  assert.equal(nextDay.dailyReplay, false);
  assert.equal(nextDay.xpEarned, 30);
  assert.deepEqual(Object.keys(nextDay.profile.daily).sort(), [DAY0, day(1)]);
  assert.deepEqual(Object.keys(nextDay.profile.daily[DAY0]!).sort(), ['a', 'b']);
});

test('daily: practising the same game first does not use up the daily (and practice never counts as a replay)', () => {
  let p = recordSession(newProfile(DAY0), G, 'practice', won({ stars: 3 }), DAY0).profile;
  const daily = recordSession(p, G, 'daily', won({ stars: 3 }), DAY0);
  assert.equal(daily.dailyReplay, false);
  assert.equal(daily.xpEarned, 30);
  p = daily.profile;
  const practice = recordSession(p, G, 'practice', won({ stars: 3 }), DAY0);
  assert.equal(practice.dailyReplay, false);
  assert.equal(practice.xpEarned, 20);
  assert.deepEqual(practice.profile.daily, p.daily);
});

test('daily: per-game daily streak — consecutive wins grow it, a loss zeroes it, a skipped day restarts it', () => {
  const dailyOn = (p: Profile, offset: number, result: SessionResult): Profile => recordSession(p, G, 'daily', result, day(offset)).profile;
  let p = dailyOn(newProfile(DAY0), 0, won());
  p = dailyOn(p, 1, won());
  p = dailyOn(p, 2, { outcome: 'completed', score: 1 });
  assert.equal(p.games['test-game']!.dailyStreak, 3);
  p = dailyOn(p, 3, lost());
  assert.equal(p.games['test-game']!.dailyStreak, 0);
  p = dailyOn(p, 4, won());
  assert.equal(p.games['test-game']!.dailyStreak, 1);
  p = dailyOn(p, 6, won());
  assert.equal(p.games['test-game']!.dailyStreak, 1, 'day 5 was skipped');
  p = recordSession(p, G, 'practice', won(), day(7)).profile;
  assert.equal(p.games['test-game']!.dailyStreak, 1, 'practice sessions leave the daily streak alone');
  assert.equal(p.games['test-game']!.lastDaily, day(6));
  p = dailyOn(p, 7, won());
  assert.equal(p.games['test-game']!.dailyStreak, 2);
});

// ───────────────────────────── recordSession: pruning ─────────────────────────────

test('xpByDay: several sessions on a day add up; total XP equals the sum of days', () => {
  let p = newProfile(DAY0);
  let total = 0;
  for (const [offset, result] of [[0, won({ stars: 3 })], [0, lost({ stars: 0 })], [1, won({ stars: 1 })], [1, won({ stars: 2 })], [3, won({ stars: 3 })]] as const) {
    const out = recordSession(p, G, 'practice', result, day(offset));
    total += out.xpEarned;
    p = out.profile;
  }
  assert.deepEqual(p.xpByDay, { [day(0)]: 25, [day(1)]: 25, [day(3)]: 20 });
  assert.equal(p.xp, total);
  assert.equal(Object.values(p.xpByDay).reduce((a, b) => a + b, 0), p.xp);
});

test('xpByDay and daily: only the most recent 60 days are kept; total XP is not affected by pruning', () => {
  let p = newProfile(DAY0);
  for (let i = 0; i < 75; i++) p = recordSession(deepFreeze(p), G, 'daily', won({ stars: 3 }), day(i)).profile;
  const xpDays = Object.keys(p.xpByDay).sort();
  const dailyDays = Object.keys(p.daily).sort();
  assert.equal(xpDays.length, 60);
  assert.equal(dailyDays.length, 60);
  assert.equal(xpDays[0], day(15));
  assert.equal(xpDays[59], day(74));
  assert.deepEqual(dailyDays, xpDays);
  assert.equal(p.xp, 75 * 30, 'lifetime XP must survive pruning');
  assert.equal(p.games['test-game']!.plays, 75);
});

test('xpByDay and daily: exactly 60 days are not pruned; the 61st day drops only the oldest', () => {
  let p = newProfile(DAY0);
  for (let i = 0; i < 60; i++) p = recordSession(p, G, 'daily', won(), day(i * 2)).profile; // sparse days still count as entries
  assert.equal(Object.keys(p.xpByDay).length, 60);
  assert.ok(p.xpByDay[day(0)] !== undefined);
  p = recordSession(p, G, 'daily', won(), day(200)).profile;
  assert.equal(Object.keys(p.xpByDay).length, 60);
  assert.equal(p.xpByDay[day(0)], undefined);
  assert.ok(p.xpByDay[day(2)] !== undefined);
  assert.ok(p.xpByDay[day(200)] !== undefined);
  assert.equal(p.daily[day(0)], undefined);
  assert.ok(p.daily[day(200)] !== undefined);
});

test('daily: pruning also happens on non-daily sessions and never drops today', () => {
  const daily: Profile['daily'] = {};
  for (let i = 1; i <= 70; i++) daily[day(-i)] = { g: { score: 1, stars: 1, outcome: 'won' } };
  const out = recordSession({ ...newProfile(day(-80)), daily }, G, 'practice', won(), DAY0);
  assert.equal(Object.keys(out.profile.daily).length, 60);
  assert.equal(out.profile.daily[day(-70)], undefined);
  assert.ok(out.profile.daily[day(-1)]);
});

// ───────────────────────────── mastery (Leitner) ─────────────────────────────

const ev = (itemId: string, correct: boolean, skill: MasteryEvent['skill'] = 'vibhakti'): MasteryEvent => ({ skill, itemId, correct });

test('mastery: intervals are 0/1/2/4/8/16 days', () => {
  assert.deepEqual([...LEITNER_INTERVALS], [0, 1, 2, 4, 8, 16]);
});

test('mastery: a new item answered correctly enters box 1, due tomorrow; answered wrongly it stays in box 0, due today', () => {
  const m = applyMastery({}, [ev('shabda:rama-m:3.1', true), ev('shabda:rama-m:6.3', false)], DAY0);
  assert.deepEqual(m, {
    'vibhakti|shabda:rama-m:3.1': { skill: 'vibhakti', box: 1, due: day(1), seen: 1, correct: 1 },
    'vibhakti|shabda:rama-m:6.3': { skill: 'vibhakti', box: 0, due: DAY0, seen: 1, correct: 0 },
  });
});

test('mastery: each correct answer moves one box up with the matching interval, and box 5 is the ceiling', () => {
  let m: ReturnType<typeof applyMastery> = {};
  const expected: [number, number][] = [[1, 1], [2, 2], [3, 4], [4, 8], [5, 16], [5, 16], [5, 16]];
  expected.forEach(([box, interval], i) => {
    const today = day(i * 20);
    m = applyMastery(m, [ev('x', true)], today);
    assert.deepEqual(m['vibhakti|x'], { skill: 'vibhakti', box, due: day(interval, today), seen: i + 1, correct: i + 1 }, `after ${i + 1} correct answers`);
  });
});

test('mastery: a wrong answer sends the item back to box 0 (due today) from any box, keeping the counts', () => {
  for (let box = 0; box <= 5; box++) {
    const start = { 'vibhakti|x': { skill: 'vibhakti' as const, box, due: day(30), seen: 9, correct: 7 } };
    const m = applyMastery(start, [ev('x', false)], DAY0);
    assert.deepEqual(m['vibhakti|x'], { skill: 'vibhakti', box: 0, due: DAY0, seen: 10, correct: 7 }, `from box ${box}`);
    assert.equal(start['vibhakti|x'].box, box, 'the input record must not be mutated');
  }
});

test('mastery: due dates cross month, year and leap-day boundaries correctly', () => {
  const at = (box: number, today: string): string => applyMastery({ 'vibhakti|x': { skill: 'vibhakti', box: box - 1, due: today, seen: 1, correct: 1 } }, [ev('x', true)], today)['vibhakti|x']!.due;
  assert.equal(at(1, '2026-01-31'), '2026-02-01');
  assert.equal(at(5, '2026-12-20'), '2027-01-05');
  assert.equal(at(2, '2026-02-27'), '2026-03-01');
  assert.equal(at(2, '2028-02-27'), '2028-02-29');
  assert.equal(at(5, '2028-02-20'), '2028-03-07');
  assert.equal(at(4, '2026-10-28'), '2026-11-05', 'unaffected by DST changes');
  assert.equal(at(1, '2026-12-31'), '2027-01-01');
});

test('mastery: events in one session apply in order; the same itemId under two skills is two items', () => {
  const m = applyMastery({}, [ev('x', true), ev('x', true), ev('x', false), ev('x', true), ev('x', true, 'sandhi')], DAY0);
  assert.deepEqual(m['vibhakti|x'], { skill: 'vibhakti', box: 1, due: day(1), seen: 4, correct: 3 });
  assert.deepEqual(m['sandhi|x'], { skill: 'sandhi', box: 1, due: day(1), seen: 1, correct: 1 });
  assert.equal(Object.keys(m).length, 2);
});

test('mastery: no events → the very same object; with events → a new object, input untouched', () => {
  const start = deepFreeze({ 'vibhakti|x': { skill: 'vibhakti' as const, box: 2, due: DAY0, seen: 2, correct: 2 } });
  assert.equal(applyMastery(start, [], DAY0), start);
  const next = applyMastery(start, deepFreeze([ev('x', true), ev('y', false)]), DAY0);
  assert.notEqual(next, start);
  assert.equal(start['vibhakti|x'].box, 2);
  assert.equal(next['vibhakti|x']!.box, 3);
});

test('mastery: recordSession feeds SessionResult.mastery into the profile', () => {
  const out = recordSession(newProfile(DAY0), G, 'practice', won({ mastery: [ev('a', true), ev('b', false)] }), DAY0);
  assert.equal(out.profile.mastery['vibhakti|a']!.box, 1);
  assert.equal(out.profile.mastery['vibhakti|b']!.box, 0);
  const again = recordSession(out.profile, G, 'practice', won(), day(1));
  assert.equal(again.profile.mastery, out.profile.mastery, 'a result without mastery events leaves mastery untouched');
});

test('dueItems: only this skill, only items due today or earlier, weakest box first, original order within a box', () => {
  const p: Profile = {
    ...newProfile(DAY0),
    mastery: {
      'vibhakti|strong-due': { skill: 'vibhakti', box: 4, due: day(-3), seen: 5, correct: 5 },
      'vibhakti|weak-due-1': { skill: 'vibhakti', box: 0, due: DAY0, seen: 2, correct: 0 },
      'vibhakti|not-due': { skill: 'vibhakti', box: 1, due: day(1), seen: 1, correct: 1 },
      'vibhakti|mid-due': { skill: 'vibhakti', box: 2, due: day(-1), seen: 3, correct: 2 },
      'sandhi|other-skill': { skill: 'sandhi', box: 0, due: day(-9), seen: 1, correct: 0 },
      'vibhakti|weak-due-2': { skill: 'vibhakti', box: 0, due: day(-20), seen: 1, correct: 0 },
      'vibhakti|shabda:rama-m:3.1|odd': { skill: 'vibhakti', box: 3, due: DAY0, seen: 1, correct: 1 },
    },
  };
  assert.deepEqual(dueItems(p, 'vibhakti', DAY0), ['weak-due-1', 'weak-due-2', 'mid-due', 'shabda:rama-m:3.1|odd', 'strong-due']);
  assert.deepEqual(dueItems(p, 'sandhi', DAY0), ['other-skill']);
  assert.deepEqual(dueItems(p, 'chandas', DAY0), []);
  assert.deepEqual(dueItems(p, 'vibhakti', day(-2)), ['weak-due-2', 'strong-due']);
  assert.deepEqual(dueItems(p, 'vibhakti', day(1)).length, 6);
  assert.deepEqual(dueItems(newProfile(DAY0), 'vibhakti', DAY0), []);
});

test('dueItems: a full review cycle — wrong today → due today; right today → due tomorrow, not today', () => {
  let p = recordSession(newProfile(DAY0), G, 'practice', won({ mastery: [ev('right', true), ev('wrong', false)] }), DAY0).profile;
  assert.deepEqual(dueItems(p, 'vibhakti', DAY0), ['wrong']);
  assert.deepEqual(dueItems(p, 'vibhakti', day(1)), ['wrong', 'right']);
  p = recordSession(p, G, 'practice', won({ mastery: [ev('wrong', true)] }), DAY0).profile;
  assert.deepEqual(dueItems(p, 'vibhakti', DAY0), []);
  assert.deepEqual(dueItems(p, 'vibhakti', day(1)).sort(), ['right', 'wrong']);
});

test('dueItems: date comparison is correct across a year boundary', () => {
  const p: Profile = { ...newProfile(DAY0), mastery: { 'akshara|a': { skill: 'akshara', box: 1, due: '2027-01-02', seen: 1, correct: 1 } } };
  assert.deepEqual(dueItems(p, 'akshara', '2026-12-31'), []);
  assert.deepEqual(dueItems(p, 'akshara', '2027-01-01'), []);
  assert.deepEqual(dueItems(p, 'akshara', '2027-01-02'), ['a']);
  assert.deepEqual(dueItems(p, 'akshara', '2027-10-01'), ['a']);
});

test('skillMastery: mean(box / 5) per skill; unseen skills are absent', () => {
  assert.deepEqual(skillMastery(newProfile(DAY0)), {});
  const item = (skill: MasteryEvent['skill'], box: number) => ({ skill, box, due: DAY0, seen: 1, correct: 1 });
  const p: Profile = { ...newProfile(DAY0), mastery: { 'akshara|a': item('akshara', 5), 'akshara|b': item('akshara', 0), 'akshara|c': item('akshara', 1), 'sandhi|x': item('sandhi', 5), 'vakya|y': item('vakya', 0) } };
  const m = skillMastery(p);
  assert.deepEqual(Object.keys(m).sort(), ['akshara', 'sandhi', 'vakya']);
  assert.equal(m['akshara']!.items, 3);
  assert.ok(Math.abs(m['akshara']!.mastery - 0.4) < 1e-12);
  assert.deepEqual(m['sandhi'], { items: 1, mastery: 1 });
  assert.deepEqual(m['vakya'], { items: 1, mastery: 0 });
  for (const v of Object.values(m)) assert.ok(v.mastery >= 0 && v.mastery <= 1);
});

// ───────────────────────────── achievements ─────────────────────────────

test('achievements: ids are unique, titled in Devanagari, and tests are pure predicates', () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  const fresh = deepFreeze(newProfile(DAY0));
  for (const a of ACHIEVEMENTS) {
    assert.match(a.title.sa, /[ऀ-ॿ]/, a.id);
    assert.ok(a.title.en.length > 0 && a.description.length > 0, a.id);
    assert.equal(a.test(fresh), false, `${a.id} must not be unlocked on a brand-new profile`);
  }
});

test('achievements: first-game unlocks on the first session and is reported exactly once', () => {
  const first = recordSession(newProfile(DAY0), G, 'practice', lost(), DAY0);
  assert.deepEqual(first.newAchievements.map((a) => a.id), ['first-game']);
  assert.deepEqual(first.profile.achievements, { 'first-game': DAY0 });
  const second = recordSession(first.profile, G, 'practice', lost(), day(5));
  assert.deepEqual(second.newAchievements, []);
  assert.deepEqual(second.profile.achievements, { 'first-game': DAY0 }, 'the unlock date is not overwritten');
});

test('achievements: several can unlock in one session', () => {
  const out = recordSession(newProfile(DAY0), G, 'practice', won({ stars: 3 }), DAY0);
  assert.deepEqual(out.newAchievements.map((a) => a.id).sort(), ['first-game', 'three-stars']);
});

test('achievements: every id unlocks at its threshold, not before, and exactly once over a long history', () => {
  const unlockedAt = new Map<string, number>();
  const seenCount = new Map<string, number>();
  let p = newProfile(DAY0);
  let session = 0;
  const play = (gameId: string, mode: GameMode, result: SessionResult, d: string): void => {
    const out = recordSession(deepFreeze(p), { id: gameId }, mode, result, d);
    session++;
    for (const a of out.newAchievements) {
      unlockedAt.set(a.id, session);
      seenCount.set(a.id, (seenCount.get(a.id) ?? 0) + 1);
      assert.equal(out.profile.achievements[a.id], d);
    }
    p = out.profile;
  };
  const has = (id: string): boolean => p.achievements[id] !== undefined;

  play('g1', 'practice', lost({ stars: 0 }), day(0)); // 5 xp
  assert.ok(has('first-game') && !has('three-stars') && !has('streak-3'));
  play('g1', 'practice', won({ stars: 2 }), day(1));
  assert.ok(!has('three-stars') && !has('streak-3'));
  play('g1', 'practice', won({ stars: 3 }), day(2));
  assert.ok(has('three-stars') && has('streak-3') && !has('streak-7'));
  for (let d = 3; d <= 5; d++) play('g1', 'practice', lost({ stars: 0 }), day(d));
  assert.ok(!has('streak-7'));
  play('g1', 'practice', lost({ stars: 0 }), day(6));
  assert.ok(has('streak-7') && !has('streak-30'));

  // explorer: distinct games
  for (let i = 2; i <= 4; i++) play(`g${i}`, 'practice', lost({ stars: 0 }), day(6));
  assert.ok(!has('explorer-5'));
  play('g5', 'practice', lost({ stars: 0 }), day(6));
  assert.ok(has('explorer-5') && !has('explorer-15'));
  for (let i = 6; i <= 14; i++) play(`g${i}`, 'practice', lost({ stars: 0 }), day(6));
  assert.ok(!has('explorer-15'));
  play('g15', 'practice', lost({ stars: 0 }), day(6));
  assert.ok(has('explorer-15'));

  // xp-100
  assert.ok(p.xp < 100 ? !has('xp-100') : has('xp-100'));
  while (p.xp < 95) play('g1', 'practice', lost({ stars: 0 }), day(6));
  if (p.xp < 100) {
    assert.ok(!has('xp-100'));
    play('g1', 'practice', lost({ stars: 0 }), day(6));
  }
  assert.ok(has('xp-100') && !has('xp-1000'));

  // daily-3: three different dailies on one day (two is not enough; three across two days is not enough)
  play('g1', 'daily', lost({ stars: 0 }), day(6));
  play('g2', 'daily', lost({ stars: 0 }), day(6));
  play('g2', 'daily', lost({ stars: 0 }), day(6)); // replay does not count
  assert.ok(!has('daily-3'));
  play('g3', 'daily', lost({ stars: 0 }), day(6));
  assert.ok(has('daily-3'));

  // scholar-50: 50 distinct items
  play('g1', 'practice', lost({ stars: 0, mastery: Array.from({ length: 49 }, (_, i) => ev(`item-${i}`, true)) }), day(6));
  play('g1', 'practice', lost({ stars: 0, mastery: [ev('item-0', false), ev('item-1', true)] }), day(6));
  assert.ok(!has('scholar-50'), 'repeating items is not practising new ones');
  play('g1', 'practice', lost({ stars: 0, mastery: [ev('item-49', false)] }), day(6));
  assert.ok(has('scholar-50'));

  // streak-30 and xp-1000
  for (let d = 7; d <= 28; d++) play('g1', 'practice', lost({ stars: 0 }), day(d));
  assert.ok(!has('streak-30'));
  play('g1', 'practice', lost({ stars: 0 }), day(29));
  assert.ok(has('streak-30'));
  while (p.xp < 1000 - 20) play('g1', 'practice', won({ stars: 3 }), day(29));
  assert.ok(!has('xp-1000'));
  play('g1', 'practice', won({ stars: 3 }), day(29));
  assert.ok(has('xp-1000'));

  assert.deepEqual([...unlockedAt.keys()].sort(), ACHIEVEMENTS.map((a) => a.id).sort(), 'every achievement is reachable');
  for (const a of ACHIEVEMENTS) assert.equal(seenCount.get(a.id), 1, `${a.id} must be announced exactly once`);
  // a streak that later breaks does not take achievements away
  play('g1', 'practice', lost({ stars: 0 }), day(100));
  assert.equal(p.streak.current, 1);
  assert.equal(Object.keys(p.achievements).length, ACHIEVEMENTS.length);
});

test('achievements: unknown ids already in the profile (from a newer version) are preserved', () => {
  const start = { ...newProfile(DAY0), achievements: { 'future-badge': '2026-01-01' } };
  const out = recordSession(start, G, 'practice', won(), DAY0);
  assert.equal(out.profile.achievements['future-badge'], '2026-01-01');
  assert.equal(out.profile.achievements['first-game'], DAY0);
});

// ───────────────────────────── resolveLevel ─────────────────────────────

test('resolveLevel: the preferred level when supported, otherwise the nearest supported one', () => {
  const m = (levels: Level[]) => ({ levels });
  assert.equal(resolveLevel(m([0, 1, 2, 3, 4, 5]), 3), 3);
  assert.equal(resolveLevel(m([0]), 5), 0);
  assert.equal(resolveLevel(m([4, 5]), 0), 4);
  assert.equal(resolveLevel(m([1, 2]), 5), 2);
  assert.equal(resolveLevel(m([0, 4]), 1), 0);
  assert.equal(resolveLevel(m([0, 4]), 3), 4);
  assert.equal(resolveLevel(m([5, 0]), 1), 0, 'order in the manifest does not matter when one is strictly nearer');
  assert.equal(resolveLevel(m([3]), 3), 3);
});

test('resolveLevel: a tie goes to the level listed first; no levels → the preference itself', () => {
  assert.equal(resolveLevel({ levels: [1, 3] }, 2), 1);
  assert.equal(resolveLevel({ levels: [3, 1] }, 2), 3);
  assert.equal(resolveLevel({ levels: [] }, 4), 4);
});

test('resolveLevel: always returns a supported level for every manifest × preference', () => {
  const sets: Level[][] = [[0], [5], [0, 5], [1, 2, 3], [2, 4], [0, 1, 2, 3, 4, 5], [3, 0]];
  for (const levels of sets) {
    for (const preferred of [0, 1, 2, 3, 4, 5] as const) {
      const got = resolveLevel({ levels }, preferred);
      assert.ok(levels.includes(got), `${JSON.stringify(levels)} / ${preferred} → ${got}`);
      for (const l of levels) assert.ok(Math.abs(got - preferred) <= Math.abs(l - preferred));
      if (levels.includes(preferred)) assert.equal(got, preferred);
    }
  }
});

// ───────────────────────────── purity ─────────────────────────────

test('recordSession is pure: deep-frozen profile, manifest and result are accepted and left unchanged', () => {
  const rich = (): Profile => {
    let p = newProfile(DAY0);
    for (let i = 0; i < 65; i++) p = recordSession(p, { id: `g${i % 3}` }, i % 2 ? 'daily' : 'practice', won({ stars: 3, best: { label: 'B', value: i }, mastery: [ev(`i${i}`, i % 3 !== 0)] }), day(i)).profile;
    return p;
  };
  const profile = deepFreeze(rich());
  const snapshot = structuredClone(profile);
  const manifest = deepFreeze({ id: 'g1' });
  for (const mode of ['daily', 'practice', 'endless', 'timed'] as const) {
    for (const today of [day(64), day(65), day(70), day(10), day(500)]) {
      const result = deepFreeze(won({ score: 77, correct: 9, total: 10, share: '🟩', summary: 's', best: { label: 'B', value: 1000 }, review: [{ sa: 'रामः', correct: true }], mastery: [ev('i1', true), ev('brand-new', false)] }));
      let out: ReturnType<typeof recordSession> | undefined;
      assert.doesNotThrow(() => {
        out = recordSession(profile, manifest, mode, result, today);
      }, `${mode} on ${today}`);
      assert.notEqual(out!.profile, profile);
      assert.deepEqual(profile, snapshot, `${mode} on ${today} mutated its input`);
      assert.equal(out!.profile.xp, profile.xp + out!.xpEarned);
    }
  }
});

test('recordSession is deterministic: same inputs → deeply equal outputs', () => {
  const p = playDays([0, 1, 3]);
  const result = won({ correct: 7, total: 10, mastery: [ev('a', true)] });
  const a = recordSession(p, G, 'daily', result, day(4));
  const b = recordSession(p, G, 'daily', result, day(4));
  assert.deepEqual(a.profile, b.profile);
  assert.equal(a.xpEarned, b.xpEarned);
  assert.deepEqual(a.newAchievements.map((x) => x.id), b.newAchievements.map((x) => x.id));
});

test('recordSession: outcome fields are consistent with the returned profile', () => {
  let p = newProfile(DAY0);
  for (let i = 0; i < 40; i++) {
    const mode: GameMode = i % 3 === 0 ? 'daily' : 'practice';
    const result = i % 4 === 0 ? lost({ score: i, correct: i % 5, total: 10 }) : won({ score: i * 3, correct: 10 - (i % 4), total: 10 });
    const before = p;
    const out = recordSession(p, { id: `g${i % 2}` }, mode, result, day(Math.floor(i / 2)));
    assert.equal(out.stars, starsFor(result));
    assert.equal(out.profile.xp - before.xp, out.xpEarned);
    assert.equal(out.streakAfter, out.profile.streak.current);
    assert.equal(out.streakBefore, effectiveStreak(before, day(Math.floor(i / 2))));
    assert.ok(out.xpEarned === 2 ? out.dailyReplay : out.xpEarned >= 5 && out.xpEarned <= 30);
    assert.equal(out.newBestScore, !before.games[`g${i % 2}`] || result.score > before.games[`g${i % 2}`]!.bestScore);
    p = out.profile;
  }
});
