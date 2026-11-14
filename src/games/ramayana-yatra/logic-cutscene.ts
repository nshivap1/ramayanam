/**
 * v0.5b WP-E: the Āditya-hṛdayam cutscene (the owner's homage; Yuddha 6.105.1–31, vulgate numbering). OWNER: WP-E.
 * Pure and deterministic (no clock, no randomness). The view (view-cutscene.tsx, cutscene3d.ts) plays the scene; the
 * logic only says WHEN it is due and records that it was seen.
 *
 *   cutsceneDue(state, content)   the scene's id while it is due, else null: a battle with the trigger foe (Rāvaṇa,
 *                                 book 6), the save flag not set, and the foe SHOWN at or below `trigger.below` × its HP
 *                                 at a calm moment — the command menu, or a narration beat whose HP snapshot is that low
 *                                 (so a hit that crosses 60 % and 50 % at once still shows the scene before the next
 *                                 beat, e.g. WP-C's "a head grows back"). In both journeys: the practice bots never
 *                                 dispatch the action, so the practice game's logic and hashes do not change.
 *   cutsceneDone(state, content, id)   `{ type: 'cutscene-done', id }` while due → sets the save flag (`seen.aditya`).
 *                                 Anything else returns the same state object (the reducer contract).
 *   cutsceneSteps(content, opts)  the follow-along timeline: the narration lines, then every pāda of the 31 verses in
 *                                 order, each with its duration at the recitation pace (≈ 3 akṣaras / s, tunable).
 *
 * Replay (the easter egg) is view-only: once the flag is set the verse book offers the scene again; it dispatches
 * nothing.
 */
import { splitAksharas } from '@sanskrit';
import type { CutsceneContent, GameContent, GameState } from './types';

/** The one cutscene so far. */
export const ADITYA_ID = 'aditya-hridayam';

/** Recitation pace of the follow-along (akṣaras per second). The owner asked for a calm pace; tune here. */
export const RECITE_RATE = 3;

/** The 3D phases the view walks through, in order (exposed on the overlay as data-phase for the tests). */
export const CUTSCENE_PHASES = ['flat', 'rotate-out', 'scene', 'rotate-in', 'done'] as const;
export type CutscenePhase = (typeof CUTSCENE_PHASES)[number];

/** The cutscene content with this id, or null. */
export function cutsceneOf(content: GameContent, id: string): CutsceneContent | null {
  const c = content.aditya;
  return c && c.id === id ? c : null;
}

/** Has this save seen the scene (the replay entry shows only then)? */
export function cutsceneSeen(content: GameContent, flags: Record<string, true>, id: string = ADITYA_ID): boolean {
  const c = cutsceneOf(content, id);
  return !!c && !!flags[c.flag];
}

/**
 * The HP of the foe as the player sees it now: at the command menu the foe's HP; while narration beats play, the HP
 * snapshot of the beat on screen (beats[0]). Null at any other moment (a recitation in progress, a pick menu, the end).
 */
function shownFoeHp(state: GameState): number | null {
  const b = state.battle;
  if (!b) return null;
  if (b.phase === 'command') return b.foe.hp;
  if (b.phase === 'beats') {
    const beat = b.beats[0];
    return beat ? beat.foeHp : null;
  }
  return null;
}

/** The id of the cutscene due now, or null (see the file comment). */
export function cutsceneDue(state: GameState, content: GameContent): string | null {
  const c = content.aditya;
  if (!c || state.mode !== 'battle' || !state.battle) return null;
  if (state.save.flags[c.flag]) return null;
  const t = c.trigger;
  const foe = state.battle.foe;
  if (foe.id !== t.foe) return null;
  if (t.chapter !== undefined && state.save.chapter !== t.chapter) return null;
  const hp = shownFoeHp(state);
  if (hp === null || hp <= 0 || foe.maxHp <= 0) return null;
  return hp <= foe.maxHp * t.below ? c.id : null;
}

/** `{ type: 'cutscene-done', id }`: the scene that was due has been played (or skipped) → its save flag. */
export function cutsceneDone(state: GameState, content: GameContent, id: unknown): GameState {
  if (typeof id !== 'string' || cutsceneDue(state, content) !== id) return state;
  const c = cutsceneOf(content, id);
  if (!c) return state;
  return { ...state, save: { ...state.save, flags: { ...state.save.flags, [c.flag]: true } } };
}

// ───────────────────────── the follow-along timeline ─────────────────────────

export type CutsceneStep =
  | { kind: 'narration'; index: number; ms: number }
  | { kind: 'pada'; verse: number; pada: number; ms: number; aksharas: number };

/** Pauses after a pāda (ms): inside a half-verse, at the half-verse, after the verse. */
export const PADA_GAP = { pada: 250, half: 500, verse: 1000 } as const;
const NARRATION_BASE = 2200;
const NARRATION_PER_AKSHARA = 160;
const PADA_MIN = 1500;

/** Akṣaras of a Sanskrit line (spaces and punctuation are not akṣaras). */
export function aksharaCount(sa: string): number {
  return splitAksharas(sa.replace(/[।॥?!,.]/g, ' ')).filter((a) => a.trim() !== '').length;
}

/**
 * Every step of the follow-along in order: the narration lines (a learner's reading pace, 2.2 s + 160 ms per akṣara),
 * then each pāda of each verse at `rate` akṣaras per second (at least 1.5 s), with the pause after it folded into `ms`.
 */
export function cutsceneSteps(content: GameContent, opts: { id?: string; rate?: number } = {}): CutsceneStep[] {
  const c = cutsceneOf(content, opts.id ?? ADITYA_ID);
  if (!c) return [];
  const rate = opts.rate && opts.rate > 0 ? opts.rate : RECITE_RATE;
  const out: CutsceneStep[] = [];
  c.narration.forEach((line, index) => out.push({ kind: 'narration', index, ms: NARRATION_BASE + NARRATION_PER_AKSHARA * aksharaCount(line.sa) }));
  for (const v of c.verses) {
    v.padas.forEach((p, pada) => {
      const aksharas = aksharaCount(p);
      const gap = pada === v.padas.length - 1 ? PADA_GAP.verse : pada === 1 ? PADA_GAP.half : PADA_GAP.pada;
      out.push({ kind: 'pada', verse: v.n, pada, aksharas, ms: Math.max(PADA_MIN, Math.round((aksharas / rate) * 1000)) + gap });
    });
  }
  return out;
}

/** Where the timeline stands after `ms`: the step index (steps.length when finished) and the fraction of that step. */
export function stepAt(steps: readonly CutsceneStep[], ms: number): { index: number; frac: number } {
  let t = Math.max(0, ms);
  for (let i = 0; i < steps.length; i++) {
    const d = (steps[i] as CutsceneStep).ms;
    if (t < d) return { index: i, frac: d > 0 ? t / d : 1 };
    t -= d;
  }
  return { index: steps.length, frac: 1 };
}

/** Total length of the follow-along (ms). */
export function stepsMs(steps: readonly CutsceneStep[]): number {
  return steps.reduce((a, s) => a + s.ms, 0);
}

/** A stable key of a step (the e2e log, data-step on the overlay): narration:i or verse:n:p. */
export function stepKey(s: CutsceneStep | undefined): string {
  if (!s) return 'end';
  return s.kind === 'narration' ? `narration:${s.index}` : `verse:${s.verse}:${s.pada}`;
}
