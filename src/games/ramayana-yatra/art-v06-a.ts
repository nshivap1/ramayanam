/**
 * v0.6 sprites and props of WP-A (Bāla, Ayodhyā). OWNER: v0.6 WP-A.
 * Registered by WP0: catalog.ts appends SPRITE_IDS_A to SPRITE_IDS and PROP_IDS_A to PROP_IDS; art-sprites.ts merges
 * CHARS_A (and BUILD_A) into the character set; art.ts draws PROPS_A. art.test checks every id has a drawing;
 * content.test wants `person.<id>` in names-3.json for every new sprite id (person.janaka, person.ahalya,
 * person.parashurama).
 *
 *   SPRITE_IDS_A  janaka (King of Mithilā, Bāla 1.66–73), ahalya (Gautama's wife, 1.49), parashurama (Jāmadagnya, 1.74–76:
 *                 a sage with matted hair and a bow; Vālmīki's axe rests on his shoulder, not drawn at 16 × 24)
 *   PROP_IDS_A    shiva_dhanus (Śiva's great bow, 1.67), shiva_dhanus_broken (broken in the middle, 1.67.17),
 *                 vishnu_dhanus (the Vaiṣṇava bow Paraśurāma brings, 1.75), paduka (the gold-adorned sandals, 2.112.21)
 * Type-only imports from the art modules (no runtime import of catalog.ts here: catalog imports this file).
 */
import type { Pix } from './art-core';
import type { CharSpec } from './art-sprites';
import { R } from './art-palette';

const WHITE_HAIR = ['#f4f0ec', '#c8c0c8'] as const;
const GREY_HAIR = ['#bcb4bc', '#8c8494'] as const;
const BLACK_HAIR = ['#2c2238', '#1a1424'] as const;
const WHITE_CLOTH = ['#fbf8f0', '#d8d0c8'] as const;

export const SPRITE_IDS_A = ['janaka', 'ahalya', 'parashurama'] as const;
export type SpriteIdA = (typeof SPRITE_IDS_A)[number];
export const CHARS_A: Record<SpriteIdA, CharSpec> = {
  // a royal sage-king: white beard, crown, gold and white
  janaka: { long: true, skin: R.skinWarm, hair: WHITE_HAIR, top: [R.gold[1], R.gold[2]], lower: WHITE_CLOTH, accent: R.red[1], acc: ['crown', 'beard', 'necklace'] },
  // the ascetic's wife: plain pale cloth, long hair
  ahalya: { long: true, skin: R.skinFair, hair: BLACK_HAIR, top: [R.lotus[0], R.lotus[1]], lower: WHITE_CLOTH, accent: R.gold[1], acc: ['longhair', 'earrings'] },
  // the Bhārgava: grey matted hair and beard, bark cloth, a bow and quiver
  parashurama: { skin: R.skinTan, hair: GREY_HAIR, top: [R.bark[1], R.bark[2]], lower: [R.saffron[2], R.saffron[3]], accent: R.red[2], bare: true, broad: true, acc: ['topknot', 'beard', 'quiver', 'bow'] },
};
/** custom sprite builders (a frame of the figure facing down / up / right; left is mirrored) */
export const BUILD_A: Partial<Record<SpriteIdA, (dir: 'down' | 'up' | 'right', frame: 0 | 1 | 2) => Pix>> = {};

export const PROP_IDS_A = ['shiva_dhanus', 'shiva_dhanus_broken', 'vishnu_dhanus', 'paduka'] as const;
export type PropIdA = (typeof PROP_IDS_A)[number];

/** A great bow lying flat: the stave arcs up between the two tips, the string runs straight below. */
function bow(p: Pix, wood: readonly string[], trim: string): void {
  // stave: an arc from (1, 12) up to (8, 5) and down to (14, 12)
  const pts: [number, number][] = [[1, 12], [2, 10], [3, 8], [5, 6], [8, 5], [11, 6], [13, 8], [14, 10], [15, 12]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i] as [number, number];
    const [x1, y1] = pts[i + 1] as [number, number];
    p.line(x0, y0, x1, y1, wood[1] as string, 2);
    p.line(x0, y0 + 1, x1, y1 + 1, wood[3] as string);
  }
  // grip and trim
  p.rect(7, 4, 3, 3, trim);
  p.set(8, 5, wood[0] as string);
  // the string
  p.hl(1, 15, 13, '#f0e8d0');
  p.set(1, 12, trim);
  p.set(15, 12, trim);
}

export const PROPS_A: Record<PropIdA, (p: Pix) => void> = {
  shiva_dhanus: (p) => bow(p, R.indigo, R.gold[1]),
  shiva_dhanus_broken: (p) => {
    // two halves, splintered in the middle, lying apart
    p.line(0, 13, 3, 9, R.indigo[1], 2);
    p.line(3, 9, 6, 7, R.indigo[1], 2);
    p.line(0, 14, 6, 8, R.indigo[3]);
    p.set(6, 6, R.gold[1]);
    p.set(7, 7, R.wood[0]);
    p.line(9, 8, 12, 9, R.indigo[1], 2);
    p.line(12, 9, 15, 13, R.indigo[1], 2);
    p.line(9, 9, 15, 14, R.indigo[3]);
    p.set(9, 7, R.gold[1]);
    p.set(8, 8, R.wood[0]);
    // the slack string
    p.line(0, 14, 5, 15, '#f0e8d0');
    p.line(10, 15, 15, 14, '#f0e8d0');
  },
  vishnu_dhanus: (p) => bow(p, R.gold, R.teal[1]),
  paduka: (p) => {
    // two gold-adorned sandals side by side, toe knobs up
    for (const x0 of [2, 9]) {
      p.ell(x0 + 2, 9, 2, 5, R.wood[2]);
      p.ell(x0 + 2, 9, 1, 4, R.gold[2]);
      p.set(x0 + 2, 5, R.gold[0]);
      p.set(x0 + 2, 6, R.gold[1]);
      p.hl(x0, x0 + 4, 13, R.wood[3]);
      p.set(x0 + 1, 9, R.gold[0]);
    }
  },
};
