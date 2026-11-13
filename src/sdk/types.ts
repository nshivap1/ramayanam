/**
 * The Samskuru game contract. Every game is a folder `src/games/<id>/` that exports a
 * {@link GameManifest} from `manifest.ts` and a React component taking {@link GameProps}
 * as the default export of `Game.tsx`. The shell owns everything around the play area
 * (top bar, help sheet, result screen, XP, streaks, persistence), so games stay small
 * and look consistent.
 */
import type { ComponentType } from 'react';

/** Display script for Sanskrit text. Content is authored in Devanagari; IAST is derived. */
export type Script = 'deva' | 'iast';

/**
 * Curriculum level, aligned to the Samskrita Bharati ladder.
 * 0 Akṣara (script) · 1 Śibira (spoken beginner) · 2 Praveśa · 3 Paricaya · 4 Śikṣā · 5 Kovida
 */
export type Level = 0 | 1 | 2 | 3 | 4 | 5;

export const LEVELS: readonly { level: Level; sa: string; iast: string; en: string }[] = [
  { level: 0, sa: 'अक्षरम्', iast: 'Akṣaram', en: 'Script & sounds' },
  { level: 1, sa: 'शिबिरम्', iast: 'Śibiram', en: 'Spoken beginner' },
  { level: 2, sa: 'प्रवेशः', iast: 'Praveśaḥ', en: 'Foundation' },
  { level: 3, sa: 'परिचयः', iast: 'Paricayaḥ', en: 'Intermediate' },
  { level: 4, sa: 'शिक्षा', iast: 'Śikṣā', en: 'Upper intermediate' },
  { level: 5, sa: 'कोविदः', iast: 'Kovidaḥ', en: 'Advanced' },
];

/** Skill tags used for filtering, the learning path and per-skill mastery. */
export type Skill =
  | 'akshara' // script, varṇamālā, pronunciation classes
  | 'shabdakosha' // vocabulary
  | 'vibhakti' // noun/pronoun declension, kāraka
  | 'kriyapada' // verb conjugation, lakāras
  | 'sandhi'
  | 'samasa'
  | 'vakya' // sentence construction, anvaya
  | 'chandas' // metre
  | 'subhashita' // verses & literature
  | 'sankhya' // numbers, time
  | 'avyaya' // indeclinables
  | 'krdanta'; // participles, gerunds, infinitives

export const SKILLS: Record<Skill, { sa: string; iast: string; en: string }> = {
  akshara: { sa: 'अक्षरम्', iast: 'akṣaram', en: 'Script' },
  shabdakosha: { sa: 'शब्दकोशः', iast: 'śabdakośaḥ', en: 'Vocabulary' },
  vibhakti: { sa: 'विभक्तिः', iast: 'vibhaktiḥ', en: 'Cases' },
  kriyapada: { sa: 'क्रियापदम्', iast: 'kriyāpadam', en: 'Verbs' },
  sandhi: { sa: 'सन्धिः', iast: 'sandhiḥ', en: 'Sandhi' },
  samasa: { sa: 'समासः', iast: 'samāsaḥ', en: 'Compounds' },
  vakya: { sa: 'वाक्यम्', iast: 'vākyam', en: 'Sentences' },
  chandas: { sa: 'छन्दः', iast: 'chandaḥ', en: 'Metre' },
  subhashita: { sa: 'सुभाषितम्', iast: 'subhāṣitam', en: 'Verses' },
  sankhya: { sa: 'सङ्ख्या', iast: 'saṅkhyā', en: 'Numbers' },
  avyaya: { sa: 'अव्ययम्', iast: 'avyayam', en: 'Indeclinables' },
  krdanta: { sa: 'कृदन्तम्', iast: 'kṛdantam', en: 'Participles' },
};

/** How a session is framed. `daily` = same seed for everyone on a given date, one scored attempt per day. */
export type GameMode = 'daily' | 'practice' | 'endless' | 'timed';

export type GameKind = 'arcade' | 'puzzle' | 'daily' | 'lesson' | 'quiz';

/** Accent colour families from the design system (see src/ui/tokens.css). */
export type Hue = 'saffron' | 'maroon' | 'indigo' | 'teal' | 'gold' | 'rose' | 'leaf' | 'plum';

export interface LocalizedName {
  /** Devanagari. */
  sa: string;
  /** IAST. */
  iast: string;
  /** English gloss. */
  en: string;
}

export interface GameManifest {
  /** kebab-case; MUST equal the folder name under src/games (or labs). */
  id: string;
  /** semver of the game itself. Bump when rules or content change. */
  version: string;
  title: LocalizedName;
  /** ≤ 60 chars, English, shown on the game card. */
  tagline: string;
  /** 1–3 sentences shown in the game's info sheet. */
  description: string;
  kind: GameKind;
  skills: Skill[];
  /** Curriculum levels this game has content for. */
  levels: Level[];
  /** Supported modes; the first is the default. */
  modes: GameMode[];
  /** Typical session length in minutes. */
  minutes: number;
  /** One or two Devanagari akṣaras (or an emoji) used as the card glyph. */
  icon: string;
  hue: Hue;
  /** `labs` games are hidden unless Labs is enabled in settings. */
  status: 'stable' | 'beta' | 'labs';
  /** The popular game this adapts, if any (credit + discoverability). */
  inspiredBy?: string;
  /** 2–6 short steps, shown in the Help sheet and on first launch. */
  howToPlay: string[];
  /** Content pack ids this game reads (for provenance display and validation). */
  content: string[];
  credits?: string[];
}

export interface Settings {
  script: Script;
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  /** Default curriculum level for new sessions. */
  level: Level;
  labs: boolean;
  theme: 'system' | 'light' | 'dark';
}

/** What the shell's top bar shows. Games update it via `ctx.hud(...)`; omit fields you don't use. */
export interface Hud {
  /** 0..1 progress through the session (renders the progress bar). */
  progress?: number;
  score?: number;
  /** Remaining lives / hearts. */
  lives?: number;
  maxLives?: number;
  /** Remaining time in ms for timed sessions. */
  timeLeftMs?: number;
  /** The timer pill turns red below this many ms (default 10000). */
  timeWarnMs?: number;
  /** Combo / streak multiplier inside a session. */
  combo?: number;
  /** Short status text, e.g. "3 / 10". */
  label?: string;
}

/** One reviewed item, shown under "What you practised" on the result screen. */
export interface ReviewItem {
  /** Sanskrit in Devanagari. */
  sa: string;
  /** English meaning or explanation. */
  en?: string;
  note?: string;
  correct: boolean;
}

/** A learning signal for per-skill mastery and spaced repetition. */
export interface MasteryEvent {
  skill: Skill;
  /** Stable id of the fact practised, e.g. `shabda:rama:3.pl` or `vocab:vrksha`. */
  itemId: string;
  correct: boolean;
}

export interface SessionResult {
  outcome: 'won' | 'lost' | 'completed';
  /** Game-defined score (higher is better). */
  score: number;
  /** Number of correct / total answers, when the game has discrete answers. Used for accuracy and stars. */
  correct?: number;
  total?: number;
  /** 0–3. If omitted the shell derives it from accuracy/outcome. */
  stars?: 0 | 1 | 2 | 3;
  /** A personal-best statistic to track, e.g. { label: 'Longest chain', value: 12 }. */
  best?: { label: string; value: number; lowerIsBetter?: boolean };
  /** Plain-text share card (emoji grid etc.). The shell appends title, date and link. */
  share?: string;
  /** One-line summary shown under the headline, e.g. "Solved in 4 of 6". */
  summary?: string;
  review?: ReviewItem[];
  mastery?: MasteryEvent[];
}

/** Namespaced, versioned persistence for a game. Values must be JSON-serialisable. */
export interface GameStore {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export type Sfx = 'tap' | 'correct' | 'wrong' | 'win' | 'lose' | 'merge' | 'tick' | 'levelup';

export interface GameContext {
  manifest: GameManifest;
  mode: GameMode;
  level: Level;
  /** Deterministic 32-bit seed. Daily mode: derived from date + game id. Use `createRng(ctx.seed)`. */
  seed: number;
  /** Local calendar day, YYYY-MM-DD. */
  dateKey: string;
  settings: Readonly<Settings>;
  store: GameStore;
  /** Update the shell top bar. Shallow-merged. */
  hud(patch: Hud): void;
  /** End the session and show the shared result screen. Call exactly once per session. */
  finish(result: SessionResult): void;
  /** Leave the game without a result (the shell also offers this from the ✕ button). */
  exit(): void;
  sfx(name: Sfx): void;
  haptic(kind?: 'light' | 'medium' | 'success' | 'error'): void;
  /** True while the shell covers the game (help / leave sheet) or the page is hidden. The @ui timing hooks already honour this. */
  isPaused(): boolean;
  /** Screen-reader announcement (aria-live polite). */
  announce(text: string): void;
  /**
   * Publish a small serialisable snapshot for browser tests (exposed as `window.__game`
   * only when the URL has `e2e=1`). Include whatever a bot needs to play correctly,
   * e.g. `{ phase: 'playing', answer: 'रामः' }`. No-op in normal play.
   */
  expose(snapshot: Record<string, unknown>): void;
}

export interface GameProps {
  ctx: GameContext;
}

export type GameComponent = ComponentType<GameProps>;

/** Registry entry (generated — see tools/gen-registry.mjs). */
export interface GameEntry {
  manifest: GameManifest;
  load: () => Promise<{ default: GameComponent }>;
}
