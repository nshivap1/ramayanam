/**
 * v0.6 told-cutscene painters of package B (Araṇya, Kiṣkindhā; only if B tells a scene as a cutscene). OWNER: v0.6 WP-B.
 * Registered by WP0 (cutscene-paint.ts merges PAINTERS_B); a cutscene JSON names one with "painter": "<id>".
 * A painter paints the 320 × 180 backdrop of the current shot (`cue.scene`, from the { "scene": key } steps); the engine
 * draws the cast, props and kit effects on top. With `cue.reduced` draw a still. See cutscene-paint.ts (PaintCue) and
 * notes/v06-wp0.md. Painters run only in the browser; keep module scope free of DOM work (tests import this file).
 */
import type { Painter } from './cutscene-paint';

export const PAINTERS_B: Record<string, Painter> = {};
