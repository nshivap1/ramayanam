/**
 * v0.6 sprites and props of WP-B (Araṇya, Kiṣkindhā: e.g. the deer herd, the seven sāla trees). OWNER: v0.6 WP-B.
 * Registered by WP0: catalog.ts appends SPRITE_IDS_B to SPRITE_IDS and PROP_IDS_B to PROP_IDS; art-sprites.ts merges
 * CHARS_B (and BUILD_B) into the character set; art.ts draws PROPS_B. art.test checks every id has a drawing;
 * content.test wants `person.<id>` in your names file for every new sprite id.
 *
 *   SPRITE_IDS_B  new 16×24 characters (4 directions × 3 frames). Each needs a CHARS_B entry (a CharSpec drawn by the
 *                 humanoid builder of art-sprites.ts like every character), and may add a BUILD_B builder that draws it instead.
 *   PROP_IDS_B    new 16×16 objects for the effects kit's `{ "prop" }` (any TileId or SpriteId works as a prop too).
 *                 Each needs a PROPS_B entry that paints a 16×16 Pix (art-core).
 * Type-only imports from the art modules (no runtime import of catalog.ts here: catalog imports this file).
 *
 * WP-B uses:
 *   deer  an ordinary spotted forest deer (chital), brown with white spots — the herd of Araṇya 3.64 that rises, faces
 *         south and leads Rāma toward the river (story-ch3 ch3.maricha_deer, Kathā). Drawn by its own builder (BUILD_B)
 *         so it is not the golden deer (Mārīca's disguise). As a prop it is drawn facing down (= south, toward the
 *         viewer), which is the point of the scene.
 *   The seven sāla trees of Kiṣkindhā 4.12 are the `tree` tile drawn as props; no new prop art is needed.
 */
import { Pix } from './art-core';
import type { CharSpec } from './art-sprites';

export const SPRITE_IDS_B = ['deer'] as const;
export type SpriteIdB = (typeof SPRITE_IDS_B)[number];

/** brown chital ramp (light → dark) and its spots */
const BROWN = ['#f6dcb4', '#e0ac74', '#bc7c48', '#8c5630', '#5a361e'] as const;
const SPOT = '#fff8ec';
const CREAM = ['#fbf4e6', '#e6d8c4'] as const;

export const CHARS_B: Record<SpriteIdB, CharSpec> = {
  deer: { kind: 'deer', skin: BROWN, hair: CREAM, top: CREAM, lower: CREAM, accent: SPOT, acc: [] },
};

/** A brown spotted deer, 16 × 24 (same build as the golden deer of art-sprites, its own colours). */
function chital(d: 'down' | 'up' | 'right', frame: 0 | 1 | 2): Pix {
  const p = new Pix(16, 24);
  const D = BROWN;
  const k = frame === 0 ? 0 : frame === 1 ? 1 : -1;
  if (d === 'right') {
    for (const [x, ph] of [
      [3, 1],
      [5, -1],
      [10, 1],
      [12, -1],
    ] as [number, number][])
      p.line(x, 16, x + ph * k, 22, D[3]);
    p.ball(7.5, 14, 6, 3, D);
    p.capsule(11.5, 13, 12.5, 9, 1.3, D, 1.2);
    p.ball(13, 8, 2, 1.7, D);
    p.set(15, 9, D[2]);
    p.set(13, 7, '#1a1020');
    p.set(12, 6, D[3]);
    p.line(12, 6, 11, 3, D[4]);
    p.line(11, 3, 10, 2, D[4]);
    p.set(12, 3, D[4]);
    p.line(13, 6, 14, 3, D[4]);
    p.set(2, 12, CREAM[0]);
    p.set(1, 12, D[1]);
    for (const [x, y] of [
      [4, 13],
      [6, 12],
      [8, 13],
      [10, 12],
      [5, 15],
      [9, 15],
    ] as [number, number][])
      p.set(x, y, SPOT);
  } else {
    const back = d === 'up';
    p.line(6, 17, 6, 22 - (k > 0 ? 1 : 0), D[3]);
    p.line(10, 17, 10, 22 - (k < 0 ? 1 : 0), D[3]);
    p.ball(8, 14.5, 3.6, 4, D);
    if (!back) {
      p.capsule(8, 12, 8, 8, 1.4, D);
      p.ball(8, 7, 2.2, 2, D);
      p.set(7, 7, '#1a1020');
      p.set(9, 7, '#1a1020');
      p.set(8, 9, D[4]);
      p.set(5, 6, D[2]);
      p.set(11, 6, D[2]);
      p.set(8, 12, CREAM[0]);
    } else {
      p.ball(8, 8, 2, 2, D);
      p.set(8, 18, CREAM[0]);
      p.set(8, 19, CREAM[1]);
    }
    p.line(7, 5, 5, 2, D[4]);
    p.line(9, 5, 11, 2, D[4]);
    p.set(4, 3, D[4]);
    p.set(12, 3, D[4]);
    p.set(6, 14, SPOT);
    p.set(10, 13, SPOT);
    p.set(9, 16, SPOT);
    p.set(7, 16, SPOT);
  }
  p.outline('#3c220e');
  return p;
}

/** custom sprite builders (a frame of the figure facing down / up / right; left is mirrored) */
export const BUILD_B: Partial<Record<SpriteIdB, (dir: 'down' | 'up' | 'right', frame: 0 | 1 | 2) => Pix>> = { deer: chital };

export const PROP_IDS_B = [] as const;
export type PropIdB = (typeof PROP_IDS_B)[number];
export const PROPS_B: Record<PropIdB, (p: Pix) => void> = {};
