/**
 * v0.6 WP0: the painters of told cutscenes (2D, 320 × 180). OWNER: WP0 / orchestrator — each package owns its own
 * `cutscene-paint-<x>.ts` and registers its painters there (PAINTERS_<X>); this file merges them.
 *
 * A painter draws the BACKDROP of the stage for the current shot (`{ "scene": key }` steps) at the game's resolution;
 * the engine (view-told.tsx + view-stage.ts) then draws the cast, the props and the kit effects (topple, rise, grow,
 * glow, arrow, petals, rain, tint, flash, shake) on top, and the hotspot shimmer. A painter is called every frame with
 * the scene clock; with `cue.reduced` it must draw a still (nothing that moves with time).
 *
 * The fallback painter 'plain' (used when a cutscene names no painter, or one not registered yet) paints a battle
 * background when the shot key is a BATTLE_BG_ID ("palace", "forest", "river", "ashrama", "cave", "ocean", "lanka",
 * "battlefield"), else a quiet dusk wash — enough to block a scene out before its painter exists.
 */
import type { Art } from './art';
import { BATTLE_BG_IDS, type BattleBgId } from './catalog';
import type { ToldStep } from './types';
import type { ToldStage } from './logic-told';
import { PAINTERS_A } from './cutscene-paint-a';
import { PAINTERS_B } from './cutscene-paint-b';
import { PAINTERS_C } from './cutscene-paint-c';
import { PAINTERS_D } from './cutscene-paint-d';

/** What a painter is told each frame. */
export interface PaintCue {
  /** the current shot (`{ "scene": key }`), '' before the first */
  scene: string;
  /** ms since this shot began (scene clock; frozen while paused, fast in e2e) */
  t: number;
  /** ms since the cutscene's scene phase began */
  time: number;
  /** the stage now: cast, props, who is lying down, scales, tint */
  stage: ToldStage;
  /** the step on screen (painters may react to their own shots and cues) */
  step: ToldStep | undefined;
  /** reduced motion: draw a still */
  reduced: boolean;
  /** hotspot ids found so far, and the option picked at each question so far */
  found: readonly string[];
  answers: readonly number[];
}

/** Paints the 320 × 180 backdrop of a told cutscene. */
export type Painter = (g: CanvasRenderingContext2D, cue: PaintCue, art: Art) => void;

/** The fallback painter (see the file comment). */
export const plainPainter: Painter = (g, cue, art) => {
  if ((BATTLE_BG_IDS as readonly string[]).includes(cue.scene)) {
    art.drawBattleBg(g, cue.scene as BattleBgId, cue.reduced ? 0 : cue.t / 1000);
    return;
  }
  const grd = g.createLinearGradient(0, 0, 0, 180);
  grd.addColorStop(0, '#2a1f3d');
  grd.addColorStop(0.6, '#7a4a52');
  grd.addColorStop(1, '#c98a5a');
  g.fillStyle = grd;
  g.fillRect(0, 0, 320, 180);
  g.fillStyle = '#3b2a22';
  g.fillRect(0, 132, 320, 48);
};

/** Every registered painter by id ('plain' is WP0's fallback; packages register theirs in cutscene-paint-<x>.ts). */
export const PAINTERS: Readonly<Record<string, Painter>> = { plain: plainPainter, ...PAINTERS_A, ...PAINTERS_B, ...PAINTERS_C, ...PAINTERS_D };

/** The painter of a cutscene (its `painter` when registered, else 'plain'). */
export function painterOf(id: string | undefined): Painter {
  return (id && PAINTERS[id]) || plainPainter;
}
