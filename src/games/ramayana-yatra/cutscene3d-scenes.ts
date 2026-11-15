/**
 * v0.6 WP0: 3D scenes of told cutscenes. OWNER: WP0 / orchestrator — a package registers its scene in its own module
 * (D: cutscene3d-herbs.ts, SCENES_D); this file merges them. The Āditya-hṛdayam scene (cutscene3d.ts) is not one of
 * them: its engine (view-cutscene.tsx) is unchanged.
 *
 * A told cutscene with "scene3d": "<id>" plays in 3D when the scene is registered, WebGL works and motion is not reduced;
 * otherwise its 2D painter (cutscene-paint.ts) draws the still. The view (view-told.tsx) walks the same phases as the
 * Āditya engine: flat (the live game frame) → rotate-out → scene → rotate-in (back to the frame) → done, and calls
 * `render` every frame with a ToldCue3D. A scene may reuse the helpers cutscene3d.ts exports (lerp, smooth, easeInOut,
 * sunDir, posePath, framePlane, …); D may add exports there without changing the Āditya scene (notes/v06-ownership.md).
 */
import type { Art } from './art';
import type { ToldStep } from './types';
import type { ToldStage } from './logic-told';
import { SCENES_D } from './cutscene3d-herbs';

/** The phases of a 3D told cutscene (the Āditya engine's CUTSCENE_PHASES). */
export type ToldPhase3D = 'flat' | 'rotate-out' | 'scene' | 'rotate-in' | 'done';

/** What a 3D scene is told each frame. */
export interface ToldCue3D {
  phase: ToldPhase3D;
  /** progress of a rotate phase 0..1; in the scene phase, the fraction of the beat on screen */
  k: number;
  /** the current shot (`{ "scene": key }`) and ms since it began (scene clock) */
  scene: string;
  t: number;
  /** 0..1 of the whole scene phase */
  progress: number;
  /** wall-clock seconds (water, lights; frozen while paused) */
  time: number;
  /** ms since the last frame (camera smoothing) */
  dt: number;
  stage: ToldStage;
  step: ToldStep | undefined;
  found: readonly string[];
  answers: readonly number[];
}

export interface Scene3DTold {
  /** Draw a frame; `frame` is the live game canvas (for the flat phases' frame plane). */
  render(cue: ToldCue3D, frame: HTMLCanvasElement | null): void;
  readonly lost: boolean;
  dispose(): void;
}

/** A WebGL scene on `canvas`, or null when WebGL is not available (the view paints the 2D still instead). */
export type Scene3DFactory = (canvas: HTMLCanvasElement, art: Art, onLost: (lost: boolean) => void) => Scene3DTold | null;

/** Every registered 3D scene by id. */
export const SCENES_3D: Readonly<Record<string, Scene3DFactory>> = { ...SCENES_D };
