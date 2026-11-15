/**
 * v0.6 told-cutscene painters of package C (e.g. waking Kumbhakarṇa, if C tells it as a cutscene). OWNER: v0.6 WP-C.
 * Registered by WP0 (cutscene-paint.ts merges PAINTERS_C); a cutscene JSON names one with "painter": "<id>".
 * A painter paints the 320 × 180 backdrop of the current shot (`cue.scene`, from the { "scene": key } steps); the engine
 * draws the cast, props and kit effects on top. With `cue.reduced` draw a still. See cutscene-paint.ts (PaintCue) and
 * notes/v06-wp0.md. Painters run only in the browser; keep module scope free of DOM work (tests import this file).
 *
 * WP-C painter "c" (content/cutscene-kumbhakarna.json): shot "hall" — Kumbhakarṇa's sleeping hall in Laṅkā (Yuddha
 * 6.60): dark violet walls, golden pillars, hanging lamps whose flames flicker (still with reduced motion), a stone
 * floor and the great couch the giant sleeps on. Any other shot key falls back to the hall.
 */
import type { Painter } from './cutscene-paint';
import { R } from './art-palette';

/** Kumbhakarṇa's hall (320 × 180). */
const hall: Painter = (g, cue) => {
  const t = cue.reduced ? 0 : cue.time / 1000;
  // walls
  const wall = g.createLinearGradient(0, 0, 0, 120);
  wall.addColorStop(0, R.lanka[4]);
  wall.addColorStop(1, R.lanka[2]);
  g.fillStyle = wall;
  g.fillRect(0, 0, 320, 120);
  // wall panels with golden trim
  g.fillStyle = R.lanka[3];
  for (let x = 12; x < 320; x += 52) g.fillRect(x, 22, 36, 74);
  g.fillStyle = R.gold[3];
  for (let x = 12; x < 320; x += 52) {
    g.fillRect(x, 20, 36, 2);
    g.fillRect(x, 96, 36, 2);
  }
  // pillars
  for (const x of [0, 104, 208, 312]) {
    g.fillStyle = R.gold[3];
    g.fillRect(x - 4, 0, 12, 120);
    g.fillStyle = R.gold[2];
    g.fillRect(x - 2, 0, 4, 120);
    g.fillStyle = R.gold[1];
    g.fillRect(x - 6, 112, 16, 8);
  }
  // floor
  g.fillStyle = R.lankaFloor[1];
  g.fillRect(0, 120, 320, 60);
  g.fillStyle = R.lankaFloor[2];
  for (let x = 0; x < 320; x += 32) g.fillRect(x, 120, 1, 60);
  for (let y = 136; y < 180; y += 16) g.fillRect(0, y, 320, 1);
  // the great couch under the sleeper (centre of the stage)
  g.fillStyle = R.red[3];
  g.fillRect(88, 104, 150, 22);
  g.fillStyle = R.red[2];
  g.fillRect(88, 104, 150, 6);
  g.fillStyle = R.gold[2];
  g.fillRect(84, 124, 158, 4);
  g.fillRect(84, 100, 6, 28);
  g.fillRect(236, 100, 6, 28);
  // hanging lamps with flickering flames
  for (const [i, x] of [52, 160, 268].entries()) {
    g.fillStyle = R.gold[3];
    g.fillRect(x, 0, 1, 30);
    g.fillRect(x - 5, 30, 11, 3);
    const f = cue.reduced ? 0 : Math.round(Math.sin(t * 9 + i * 2.1) * 1.5);
    g.fillStyle = R.fire[3];
    g.fillRect(x - 2, 25 + f, 5, 5 - f);
    g.fillStyle = R.fire[1];
    g.fillRect(x - 1, 27 + f, 3, 3 - f);
  }
};

export const PAINTERS_C: Record<string, Painter> = { c: (g, cue, art) => hall(g, cue, art) };
