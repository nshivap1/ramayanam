/**
 * v0.6 sprites and props of WP-C (Sundara, Yuddha: e.g. Samudra, Dadhimukha, the drums). OWNER: v0.6 WP-C.
 * Registered by WP0: catalog.ts appends SPRITE_IDS_C to SPRITE_IDS and PROP_IDS_C to PROP_IDS; art-sprites.ts merges
 * CHARS_C (and BUILD_C) into the character set; art.ts draws PROPS_C. art.test checks every id has a drawing;
 * content.test wants `person.<id>` in your names file for every new sprite id.
 *
 *   SPRITE_IDS_C  new 16×24 characters (4 directions × 3 frames). Each needs a CHARS_C entry (a CharSpec drawn by the
 *                 humanoid builder of art-sprites.ts like every character), and may add a BUILD_C builder that draws it instead.
 *   PROP_IDS_C    new 16×16 objects for the effects kit's `{ "prop" }` (any TileId or SpriteId works as a prop too).
 *                 Each needs a PROPS_C entry that paints a 16×16 Pix (art-core).
 * Type-only imports from the art modules (no runtime import of catalog.ts here: catalog imports this file).
 *
 * WP-C: `sagara` — the Ocean-lord who rises before Rāma (Yuddha 6.22.17; the critical edition adds "with serpents of
 * blazing mouths"): sea-blue, foam-white hair, a pearl crown, serpents. `dadhimukha` — the old vānara keeper of
 * Sugrīva's honey grove (Sundara 5.61–63), grey-haired, with a staff. Props: `drum` (waking Kumbhakarṇa, Yuddha 6.60),
 * `elephant` (the thousand elephants driven over him, 6.60.54), `honeycomb` (Madhuvana, 5.61).
 */
import type { Pix } from './art-core';
import type { CharSpec } from './art-sprites';
import { INK, R } from './art-palette';

export const SPRITE_IDS_C = ['sagara', 'dadhimukha'] as const;
export type SpriteIdC = (typeof SPRITE_IDS_C)[number];
export const CHARS_C: Record<SpriteIdC, CharSpec> = {
  sagara: {
    long: true,
    skin: [R.ocean[1], R.ocean[2], R.ocean[3], R.ocean[4]],
    hair: [R.white[0], R.white[2]],
    top: [R.teal[1], R.teal[2]],
    lower: [R.ocean[2], R.ocean[3]],
    accent: R.white[0],
    acc: ['longhair', 'crown', 'necklace', 'earrings', 'serpent'],
  },
  dadhimukha: {
    skin: R.vanaraFace,
    hair: [R.white[2], R.white[3]],
    top: [R.vanara[2], R.vanara[3]],
    lower: [R.wood[2], R.wood[3]],
    accent: R.gold[2],
    bare: true,
    acc: ['muzzle', 'tail', 'beardshort', 'staff'],
  },
};
/** custom sprite builders (a frame of the figure facing down / up / right; left is mirrored) */
export const BUILD_C: Partial<Record<SpriteIdC, (dir: 'down' | 'up' | 'right', frame: 0 | 1 | 2) => Pix>> = {};

export const PROP_IDS_C = ['drum', 'elephant', 'honeycomb'] as const;
export type PropIdC = (typeof PROP_IDS_C)[number];
export const PROPS_C: Record<PropIdC, (p: Pix) => void> = {
  /** a barrel drum on its side: wooden body with bands, hide heads */
  drum: (p) => {
    p.ell(8, 11, 6, 3, INK);
    p.rect(3, 5, 10, 7, R.wood[2]);
    p.rect(3, 5, 10, 2, R.wood[1]);
    p.rect(3, 10, 10, 2, R.wood[3]);
    p.vl(5, 5, 11, R.gold[2]);
    p.vl(10, 5, 11, R.gold[2]);
    p.ell(3, 8, 2, 4, R.sand[1]);
    p.ell(13, 8, 2, 4, R.sand[2]);
    p.line(12, 2, 14, 5, R.wood[3]);
    p.outline(INK);
  },
  /** a small elephant in profile, facing right */
  elephant: (p) => {
    const g = [R.stone[2], R.stone[3], R.rock[3], R.rock[4]] as const;
    p.ball(7, 8, 6, 4, g);
    p.rect(3, 10, 2, 4, g[2]);
    p.rect(9, 10, 2, 4, g[2]);
    p.ball(12, 6, 3, 3, g);
    p.vl(14, 7, 12, g[1]);
    p.set(15, 12, g[1]);
    p.ell(10, 6, 1, 2, g[0]);
    p.set(13, 5, INK);
    p.set(14, 9, R.white[0]);
    p.rect(5, 4, 4, 1, R.red[2]);
    p.outline(INK);
  },
  /** a honeycomb hanging from a branch, dripping */
  honeycomb: (p) => {
    p.hl(1, 14, 2, R.bark[2]);
    p.ball(8, 8, 5, 5, [R.gold[0], R.gold[1], R.gold[2], R.gold[3]]);
    for (const [x, y] of [[6, 6], [9, 6], [7, 9], [10, 9], [5, 9]] as const) p.set(x, y, R.gold[3]);
    p.vl(8, 13, 15, R.gold[2]);
    p.set(11, 13, R.gold[2]);
    p.outline(INK);
  },
};
