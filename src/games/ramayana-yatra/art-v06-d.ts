/**
 * v0.6 sprites and props of WP-D (the mountain of herbs: e.g. the peak Hanumān lifts). OWNER: v0.6 WP-D.
 * Registered by WP0: catalog.ts appends SPRITE_IDS_D to SPRITE_IDS and PROP_IDS_D to PROP_IDS; art-sprites.ts merges
 * CHARS_D (and BUILD_D) into the character set; art.ts draws PROPS_D. art.test checks every id has a drawing;
 * content.test wants `person.<id>` in your names file for every new sprite id.
 *
 *   SPRITE_IDS_D  new 16×24 characters (4 directions × 3 frames). Each needs a CHARS_D entry (a CharSpec drawn by the
 *                 humanoid builder of art-sprites.ts like every character), and may add a BUILD_D builder that draws it instead.
 *   PROP_IDS_D    new 16×16 objects for the effects kit's `{ "prop" }` (any TileId or SpriteId works as a prop too).
 *                 Each needs a PROPS_D entry that paints a 16×16 Pix (art-core).
 * Type-only imports from the art modules (no runtime import of catalog.ts here: catalog imports this file).
 */
import type { Pix } from './art-core';
import type { CharSpec } from './art-sprites';

export const SPRITE_IDS_D = [] as const;
export type SpriteIdD = (typeof SPRITE_IDS_D)[number];
export const CHARS_D: Record<SpriteIdD, CharSpec> = {};
/** custom sprite builders (a frame of the figure facing down / up / right; left is mirrored) */
export const BUILD_D: Partial<Record<SpriteIdD, (dir: 'down' | 'up' | 'right', frame: 0 | 1 | 2) => Pix>> = {};

export const PROP_IDS_D = [] as const;
export type PropIdD = (typeof PROP_IDS_D)[number];
export const PROPS_D: Record<PropIdD, (p: Pix) => void> = {};
