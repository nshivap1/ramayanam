/**
 * Player progress: XP, daily streak, per-game stats, daily completions, per-item mastery
 * (Leitner spaced repetition) and achievements. Pure functions over a plain {@link Profile}
 * object so it is trivially testable and can later sync to a backend unchanged.
 */
import type { GameManifest, GameMode, Level, MasteryEvent, SessionResult, Settings, Skill } from './types';
import { daysBetween } from './rng';
import { type KV, ROOT_PREFIX, readJson, writeJson } from './storage';

export const PROFILE_VERSION = 1;

export interface GameStats {
  plays: number;
  wins: number;
  bestScore: number;
  bestStars: number;
  /** Personal best for the game-defined statistic (see SessionResult.best). */
  best?: { label: string; value: number };
  lastPlayed: string; // dateKey
  /** Consecutive daily-mode wins. */
  dailyStreak: number;
  lastDaily?: string;
}

export interface DailyRecord {
  score: number;
  stars: number;
  outcome: SessionResult['outcome'];
  share?: string;
  summary?: string;
}

export interface MasteryItem {
  /** Leitner box 0–5. */
  box: number;
  /** dateKey when due for review. */
  due: string;
  seen: number;
  correct: number;
  skill: Skill;
}

export interface Profile {
  version: number;
  createdAt: string;
  xp: number;
  streak: { current: number; best: number; lastDay: string | null; freezes: number };
  /** XP earned per dateKey (last 60 days kept) — powers the weekly chart and daily goal. */
  xpByDay: Record<string, number>;
  dailyGoalXp: number;
  games: Record<string, GameStats>;
  /** dateKey → gameId → record. Only daily-mode sessions. */
  daily: Record<string, Record<string, DailyRecord>>;
  mastery: Record<string, MasteryItem>;
  achievements: Record<string, string>; // id → dateKey unlocked
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  script: 'deva',
  sound: true,
  haptics: true,
  reducedMotion: false,
  level: 1,
  labs: false,
  theme: 'system',
};

export function newProfile(today: string): Profile {
  return {
    version: PROFILE_VERSION,
    createdAt: today,
    xp: 0,
    streak: { current: 0, best: 0, lastDay: null, freezes: 0 },
    xpByDay: {},
    dailyGoalXp: 30,
    games: {},
    daily: {},
    mastery: {},
    achievements: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

const PROFILE_KEY = `${ROOT_PREFIX}profile`;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const asRecord = <T>(v: unknown): Record<string, T> => (isRecord(v) ? (v as Record<string, T>) : {});
const asNumber = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const isDateKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function loadProfile(kv: KV, today: string): Profile {
  const raw = readJson<unknown>(kv, PROFILE_KEY, null);
  const base = newProfile(today);
  if (!isRecord(raw)) return base;
  // Forward-compatible merge: missing fields get defaults and wrong-typed fields are replaced by
  // defaults (a malformed profile must never crash the shell). Unknown fields are kept, so data
  // written by a newer version survives being loaded and saved by an older one.
  const streak = asRecord<unknown>(raw['streak']);
  const goal = asNumber(raw['dailyGoalXp'], base.dailyGoalXp);
  return {
    ...base,
    ...raw,
    version: PROFILE_VERSION,
    createdAt: isDateKey(raw['createdAt']) ? raw['createdAt'] : base.createdAt,
    xp: asNumber(raw['xp'], base.xp),
    dailyGoalXp: goal > 0 ? goal : base.dailyGoalXp,
    streak: {
      ...base.streak,
      ...streak,
      current: asNumber(streak['current'], 0),
      best: asNumber(streak['best'], 0),
      lastDay: isDateKey(streak['lastDay']) ? streak['lastDay'] : null,
      freezes: asNumber(streak['freezes'], 0),
    },
    settings: { ...base.settings, ...asRecord<never>(raw['settings']) },
    xpByDay: asRecord(raw['xpByDay']),
    games: asRecord(raw['games']),
    daily: asRecord(raw['daily']),
    mastery: asRecord(raw['mastery']),
    achievements: asRecord(raw['achievements']),
  };
}

export function saveProfile(kv: KV, profile: Profile): void {
  writeJson(kv, PROFILE_KEY, profile);
}

// ───────────────────────────── XP & stars ─────────────────────────────

/** Stars 0–3 for a result: explicit `stars` wins; else from accuracy; else from outcome. */
export function starsFor(result: SessionResult): 0 | 1 | 2 | 3 {
  if (result.stars !== undefined) return result.stars;
  if (result.total !== undefined && result.total > 0 && result.correct !== undefined) {
    const acc = result.correct / result.total;
    if (result.outcome === 'lost') return acc >= 0.5 ? 1 : 0;
    if (acc >= 0.9) return 3;
    if (acc >= 0.7) return 2;
    return acc > 0 ? 1 : 0;
  }
  return result.outcome === 'lost' ? 0 : 2;
}

/** XP for a finished session. Deliberately simple and bounded so no game can inflate it. */
export function xpFor(result: SessionResult, mode: GameMode, firstDailyToday: boolean): number {
  const stars = starsFor(result);
  let xp = 5 + stars * 5; // 5..20
  if (result.outcome === 'lost') xp = Math.min(xp, 8);
  if (mode === 'daily' && firstDailyToday) xp += 10;
  return xp;
}

export const XP_PER_LEVEL = 100;
/** Player level (1-based) and progress within it. */
export function playerLevel(xp: number): { level: number; into: number; need: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return { level, into: xp % XP_PER_LEVEL, need: XP_PER_LEVEL };
}

// ───────────────────────────── Streak ─────────────────────────────

/** Streak as it should be displayed today (a missed day shows 0 unless a freeze can cover it). */
export function effectiveStreak(profile: Profile, today: string): number {
  const { current, lastDay, freezes } = profile.streak;
  if (!lastDay) return 0;
  const gap = daysBetween(lastDay, today);
  if (gap <= 1) return current;
  if (gap - 1 <= freezes) return current;
  return 0;
}

function bumpStreak(profile: Profile, today: string): Profile['streak'] {
  const s = { ...profile.streak };
  if (s.lastDay === today) return s;
  if (!s.lastDay) {
    s.current = 1;
  } else {
    const gap = daysBetween(s.lastDay, today);
    if (gap === 1) s.current += 1;
    else if (gap > 1 && gap - 1 <= s.freezes) {
      s.freezes -= gap - 1;
      s.current += 1;
    } else if (gap > 1) s.current = 1;
    else return s; // clock went backwards; leave untouched
  }
  s.lastDay = today;
  s.best = Math.max(s.best, s.current);
  // Earn a streak freeze every 7 days, hold at most 2.
  if (s.current > 0 && s.current % 7 === 0) s.freezes = Math.min(2, s.freezes + 1);
  return s;
}

// ───────────────────────────── Mastery (Leitner) ─────────────────────────────

/** Days until next review per box. */
export const LEITNER_INTERVALS = [0, 1, 2, 4, 8, 16] as const;

function addDays(dateKey: string, days: number): string {
  const p = dateKey.split('-').map(Number);
  const d = new Date(Date.UTC(p[0] ?? 1970, (p[1] ?? 1) - 1, (p[2] ?? 1) + days));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function applyMastery(mastery: Record<string, MasteryItem>, events: readonly MasteryEvent[], today: string): Record<string, MasteryItem> {
  if (events.length === 0) return mastery;
  const out = { ...mastery };
  for (const ev of events) {
    const key = `${ev.skill}|${ev.itemId}`;
    const prev = out[key] ?? { box: 0, due: today, seen: 0, correct: 0, skill: ev.skill };
    const box = ev.correct ? Math.min(5, prev.box + 1) : Math.max(0, Math.min(prev.box, 1) - 1);
    out[key] = {
      skill: ev.skill,
      box,
      due: addDays(today, LEITNER_INTERVALS[box] ?? 0),
      seen: prev.seen + 1,
      correct: prev.correct + (ev.correct ? 1 : 0),
    };
  }
  return out;
}

/** Item ids for a skill that are due for review today (weakest first). */
export function dueItems(profile: Profile, skill: Skill, today: string): string[] {
  return Object.entries(profile.mastery)
    .filter(([, m]) => m.skill === skill && m.due <= today)
    .sort((a, b) => a[1].box - b[1].box)
    .map(([k]) => k.slice(k.indexOf('|') + 1));
}

/** 0..1 mastery per skill = mean(box / 5) over seen items; 0 when nothing seen. */
export function skillMastery(profile: Profile): Record<string, { items: number; mastery: number }> {
  const acc: Record<string, { items: number; sum: number }> = {};
  for (const m of Object.values(profile.mastery)) {
    const a = (acc[m.skill] ??= { items: 0, sum: 0 });
    a.items += 1;
    a.sum += m.box / 5;
  }
  const out: Record<string, { items: number; mastery: number }> = {};
  for (const [k, v] of Object.entries(acc)) out[k] = { items: v.items, mastery: v.items ? v.sum / v.items : 0 };
  return out;
}

// ───────────────────────────── Achievements ─────────────────────────────

export interface Achievement {
  id: string;
  title: { sa: string; en: string };
  description: string;
  test(p: Profile): boolean;
}

const totalPlays = (p: Profile): number => Object.values(p.games).reduce((n, g) => n + g.plays, 0);

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-game', title: { sa: 'शुभारम्भः', en: 'Auspicious start' }, description: 'Finish your first game.', test: (p) => totalPlays(p) >= 1 },
  { id: 'streak-3', title: { sa: 'त्रिदिनम्', en: 'Three days' }, description: 'Reach a 3-day streak.', test: (p) => p.streak.best >= 3 },
  { id: 'streak-7', title: { sa: 'सप्ताहः', en: 'A full week' }, description: 'Reach a 7-day streak.', test: (p) => p.streak.best >= 7 },
  { id: 'streak-30', title: { sa: 'मासः', en: 'A full month' }, description: 'Reach a 30-day streak.', test: (p) => p.streak.best >= 30 },
  { id: 'xp-100', title: { sa: 'शतम्', en: 'Hundred' }, description: 'Earn 100 XP.', test: (p) => p.xp >= 100 },
  { id: 'xp-1000', title: { sa: 'सहस्रम्', en: 'Thousand' }, description: 'Earn 1000 XP.', test: (p) => p.xp >= 1000 },
  { id: 'explorer-5', title: { sa: 'अन्वेषकः', en: 'Explorer' }, description: 'Play 5 different games.', test: (p) => Object.keys(p.games).length >= 5 },
  { id: 'explorer-15', title: { sa: 'पर्यटकः', en: 'Wanderer' }, description: 'Play 15 different games.', test: (p) => Object.keys(p.games).length >= 15 },
  { id: 'three-stars', title: { sa: 'त्रितारकम्', en: 'Three stars' }, description: 'Earn 3 stars in any game.', test: (p) => Object.values(p.games).some((g) => g.bestStars >= 3) },
  {
    id: 'daily-3',
    title: { sa: 'दैनिकः', en: 'Daily devotee' },
    description: 'Complete 3 daily puzzles in one day.',
    test: (p) => Object.values(p.daily).some((d) => Object.keys(d).length >= 3),
  },
  { id: 'scholar-50', title: { sa: 'विद्यार्थी', en: 'Student' }, description: 'Practise 50 distinct items.', test: (p) => Object.keys(p.mastery).length >= 50 },
];

// ───────────────────────────── Recording a session ─────────────────────────────

export interface SessionOutcome {
  profile: Profile;
  xpEarned: number;
  stars: 0 | 1 | 2 | 3;
  streakBefore: number;
  streakAfter: number;
  newBestScore: boolean;
  newAchievements: Achievement[];
  /** True when this was a daily attempt that had already been recorded today (not re-scored). */
  dailyReplay: boolean;
}

/** Apply a finished session to the profile. Pure: returns a new profile. */
export function recordSession(
  profile: Profile,
  manifest: Pick<GameManifest, 'id'>,
  mode: GameMode,
  result: SessionResult,
  today: string,
): SessionOutcome {
  const stars = starsFor(result);
  const streakBefore = effectiveStreak(profile, today);
  const todaysDaily = profile.daily[today] ?? {};
  const dailyReplay = mode === 'daily' && todaysDaily[manifest.id] !== undefined;
  const firstDailyToday = mode === 'daily' && !dailyReplay;
  const xpEarned = dailyReplay ? 2 : xpFor(result, mode, firstDailyToday);

  const prev = profile.games[manifest.id];
  const won = result.outcome !== 'lost';
  const newBestScore = !prev || result.score > prev.bestScore;
  let best = prev?.best;
  if (result.best) {
    const better = !best || best.label !== result.best.label || (result.best.lowerIsBetter ? result.best.value < best.value : result.best.value > best.value);
    if (better) best = { label: result.best.label, value: result.best.value };
  }
  let dailyStreak = prev?.dailyStreak ?? 0;
  let lastDaily = prev?.lastDaily;
  if (firstDailyToday) {
    const consecutive = lastDaily !== undefined && daysBetween(lastDaily, today) === 1;
    dailyStreak = won ? (consecutive ? dailyStreak + 1 : 1) : 0;
    lastDaily = today;
  }
  const stats: GameStats = {
    plays: (prev?.plays ?? 0) + 1,
    wins: (prev?.wins ?? 0) + (won ? 1 : 0),
    bestScore: Math.max(prev?.bestScore ?? 0, result.score),
    bestStars: Math.max(prev?.bestStars ?? 0, stars),
    best,
    lastPlayed: today,
    dailyStreak,
    lastDaily,
  };

  const xpByDay = { ...profile.xpByDay, [today]: (profile.xpByDay[today] ?? 0) + xpEarned };
  const days = Object.keys(xpByDay).sort();
  while (days.length > 60) delete xpByDay[days.shift() as string];

  const daily = firstDailyToday
    ? {
        ...profile.daily,
        [today]: { ...todaysDaily, [manifest.id]: { score: result.score, stars, outcome: result.outcome, share: result.share, summary: result.summary } },
      }
    : profile.daily;
  const dailyDays = Object.keys(daily).sort();
  const prunedDaily = { ...daily };
  while (dailyDays.length > 60) delete prunedDaily[dailyDays.shift() as string];

  let next: Profile = {
    ...profile,
    xp: profile.xp + xpEarned,
    streak: bumpStreak(profile, today),
    xpByDay,
    games: { ...profile.games, [manifest.id]: stats },
    daily: prunedDaily,
    mastery: applyMastery(profile.mastery, result.mastery ?? [], today),
  };

  const newAchievements: Achievement[] = [];
  const achievements = { ...next.achievements };
  for (const a of ACHIEVEMENTS) {
    if (achievements[a.id] === undefined && a.test(next)) {
      achievements[a.id] = today;
      newAchievements.push(a);
    }
  }
  next = { ...next, achievements };

  return { profile: next, xpEarned, stars, streakBefore, streakAfter: next.streak.current, newBestScore, newAchievements, dailyReplay };
}

/** Has today's daily for this game been played? */
export function dailyDone(profile: Profile, gameId: string, today: string): DailyRecord | undefined {
  return profile.daily[today]?.[gameId];
}

/** Suggested level for a game given the player's setting: the closest level the game supports. */
export function resolveLevel(manifest: Pick<GameManifest, 'levels'>, preferred: Level): Level {
  if (manifest.levels.length === 0) return preferred;
  let bestLevel = manifest.levels[0] as Level;
  for (const l of manifest.levels) if (Math.abs(l - preferred) < Math.abs(bestLevel - preferred)) bestLevel = l;
  return bestLevel;
}
