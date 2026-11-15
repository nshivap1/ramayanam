/**
 * v0.6.1 props for the story animations (notes/v061-animations.md). OWNER: v0.6.1.
 * Registered like the v0.6 packages' art: catalog.ts appends PROP_IDS_E to PROP_IDS; art.ts draws PROPS_E.
 * Small 16×16 objects the story hands from one figure to another:
 *   palm_book  Vālmīki's palm-leaf book of verses (Bāla, the player's verse book)
 *   ring       Rāma's ring engraved with his name (Kiṣkindhā 4.44.12; Sundara 5.36)
 *   jewel      Sītā's crest-jewel, the cūḍāmaṇi (Sundara 5.38; Rāma receives it, 5.64)
 *   necklace   the pearl necklace Sītā gives Hanumān at the coronation (Yuddha 6.128)
 *   vimana     the Puṣpaka, the flying chariot (Yuddha 6.121–123): a swan-prowed golden pavilion on a cloud with Rāma and
 *              Sītā under its roof; a flying prop (view-screen draws it above the map with a shadow; shown at scale 2)
 */
import type { Pix } from './art-core';
import { INK, R } from './art-palette';

export const PROP_IDS_E = ['palm_book', 'ring', 'jewel', 'necklace', 'vimana'] as const;
export type PropIdE = (typeof PROP_IDS_E)[number];

/** Props drawn in the air above the map (a shadow on the ground below): the view lifts them over every figure and roof. */
export const FLYING_PROPS: ReadonlySet<string> = new Set<PropIdE>(['vimana']);

/**
 * The Puṣpaka, row by row (16×16): Y y z gold (bright, mid, dark) · R r red (roof, Sītā's cloth) · W w cloud / swan ·
 * B beak · H hair · S Rāma's face · F Sītā's face · g Rāma's yellow cloth · . clear.
 */
const VIMANA = [
  '........Y.......',
  '........YRR.....',
  '.......YYRR.....',
  '......RRRRR.....',
  '.WW..RRRrRRR....',
  'BW..YYYYYYYYY...',
  '..W.z.HH.HH.z...',
  '..W.z.SS.FF.z...',
  '..W.z.gg.rr.z..W',
  '..WWYYYYYYYYY.WW',
  '..WyyyyyyyyyyyW.',
  '...zzzzzzzzzzz..',
  '.wWWWwWWWWwWWWw.',
  'wWWWWWWWWWWWWWWw',
  '.wwWWwwWWWwwWww.',
  '..ww..www..ww...',
];

export const PROPS_E: Record<PropIdE, (p: Pix) => void> = {
  /** a bundle of palm leaves bound with a cord between two wooden boards */
  palm_book: (p) => {
    p.rect(2, 7, 12, 2, R.wood[2]);
    p.rect(2, 9, 12, 3, R.thatch[1]);
    p.hl(2, 13, 10, R.thatch[2]);
    p.rect(2, 12, 12, 2, R.wood[2]);
    p.hl(2, 13, 13, R.wood[3]);
    p.vl(7, 6, 14, R.red[2]);
    p.set(7, 5, R.red[1]);
    p.set(6, 4, R.red[1]);
    p.set(8, 4, R.red[1]);
    p.outline(INK);
  },
  /** a gold signet ring with a bright stone */
  ring: (p) => {
    p.ell(8, 10, 4, 3, R.gold[2]);
    p.ell(8, 10, 2, 1, null);
    p.hl(6, 10, 7, R.gold[1]);
    p.rect(7, 5, 3, 3, R.gold[1]);
    p.set(8, 6, R.red[1]);
    p.set(7, 6, R.red[2]);
    p.set(9, 6, R.gold[0]);
    p.outline(INK);
  },
  /** the crest-jewel: a pale gem in a gold setting with a small drop */
  jewel: (p) => {
    p.ball(8, 8, 4, 4, [R.white[0], R.teal[0], R.teal[1], R.teal[2]]);
    p.hl(4, 12, 12, R.gold[2]);
    p.hl(5, 11, 13, R.gold[3]);
    p.set(8, 14, R.gold[1]);
    p.set(7, 6, R.white[0]);
    p.outline(INK);
  },
  /** a loop of pearls with a gold pendant */
  necklace: (p) => {
    const pts: [number, number][] = [[3, 4], [2, 6], [2, 8], [3, 10], [5, 12], [7, 13], [9, 13], [11, 12], [13, 10], [14, 8], [14, 6], [13, 4]];
    for (const [x, y] of pts) {
      p.set(x, y, R.white[0]);
      p.set(x, y + 1, R.white[2]);
    }
    p.rect(7, 13, 3, 2, R.gold[1]);
    p.set(8, 15, R.red[1]);
    p.outline(INK);
  },
  /** the Puṣpaka (see VIMANA) */
  vimana: (p) => {
    const col: Record<string, string> = {
      Y: R.gold[1], y: R.gold[2], z: R.gold[3], R: R.red[1], r: R.red[2], W: R.white[0], w: R.white[2], B: R.saffron[1],
      H: INK, S: R.skinRama[1], F: R.skinFair[1], g: R.gold[0],
    };
    VIMANA.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = col[row[x]!];
        if (c) p.set(x, y, c);
      }
    });
    p.outline(INK);
  },
};
