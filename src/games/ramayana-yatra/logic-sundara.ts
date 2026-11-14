/**
 * Sundara-kāṇḍa in Kathā (v0.5b, OWNER: WP-B; notes/v05b-plan.md §3, notes/v05b-b.md). Pure and deterministic.
 *
 *   playerSprite(save)  P4: the overworld sprite the player walks as — Hanumān in a Kathā journey, in book 5, while the
 *                       flag `katha.hanuman` is set (the student rides on his shoulder); otherwise the chosen avatar.
 *                       Because it also checks book 5, a stale flag changes nothing elsewhere. Set by the Kathā block
 *                       of `ch5.leap_start`, unset by Sītā's farewell after the fire (before the warp to setu_shore).
 *   roofBlock / burningBlocks / sightTiles   what the map view draws for scenes 8 and 10 (pure, from the map and the
 *                       flags): the roofs of Laṅkā (lanka_roof / roof_fire tiles) form blocks; a block burns once the
 *                       trigger on its roof_fire tile has fired (or at once when no trigger covers it); the guards'
 *                       lit tiles are the active avoid-triggers (P3, logic-world inSight).
 *
 * The story itself is data (content/story-ch5.json, Kathā blocks): the leap (Surasā as a choice chain), Laṅkā by night
 * (stealth: being seen warps Hanumān back to the lane's mouth, never a fight), the Aśoka grove (P1 recitations of
 * Rāma's story), Laṅkā ablaze (the map `lanka_ablaze`, four roofs, then the grove and the leap home).
 */
import type { SpriteId, TileId } from './catalog';
import type { MapDef, SaveData } from './types';
import { avoidActive, avoidTriggers, tileAt, triggerCovers, triggerFlag } from './logic-world';

/** Set by the Kathā block of `ch5.leap_start`; unset by the fire sequence before `{warp: setu_shore}` and by `ch6.shore_start`. */
export const HANUMAN_FLAG = 'katha.hanuman';

/** P4: 'hanuman' only in Kathā, in book 5, with `katha.hanuman` set; otherwise the avatar's sprite (player_a / player_b). */
export function playerSprite(save: Pick<SaveData, 'avatar' | 'style' | 'chapter' | 'flags'>): SpriteId {
  if (save.style === 'katha' && save.chapter === 5 && save.flags[HANUMAN_FLAG]) return 'hanuman';
  return save.avatar === 'b' ? 'player_b' : 'player_a';
}

// ───────────────────────── Laṅkā ablaze (scene 10): the roofs ─────────────────────────

const ROOF: ReadonlySet<TileId> = new Set<TileId>(['lanka_roof', 'roof_fire']);

interface Roofs {
  /** block id per tile (y * width + x), -1 where there is no roof */
  block: Int32Array;
  /** the roof_fire tiles and the block each belongs to */
  fires: { x: number; y: number; block: number }[];
}
const roofCache = new WeakMap<MapDef, Roofs>();

function roofsOf(map: MapDef): Roofs {
  const hit = roofCache.get(map);
  if (hit) return hit;
  const w = map.width;
  const block = new Int32Array(Math.max(0, w * map.height)).fill(-1);
  const isRoof = (x: number, y: number): boolean => {
    const t = tileAt(map, x, y);
    return (t.ground !== null && ROOF.has(t.ground)) || (t.overlay !== null && ROOF.has(t.overlay));
  };
  let n = 0;
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < w; x++) {
      if (block[y * w + x] !== -1 || !isRoof(x, y)) continue;
      const stack = [[x, y] as const];
      block[y * w + x] = n;
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= map.height || block[ny * w + nx] !== -1 || !isRoof(nx, ny)) continue;
          block[ny * w + nx] = n;
          stack.push([nx, ny]);
        }
      }
      n++;
    }
  const fires: Roofs['fires'] = [];
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < w; x++) {
      const t = tileAt(map, x, y);
      if (t.ground === 'roof_fire' || t.overlay === 'roof_fire') fires.push({ x, y, block: block[y * w + x]! });
    }
  const r = { block, fires };
  roofCache.set(map, r);
  return r;
}

/** The roof_fire tiles of a map, each with its roof block (empty on a map without fire). */
export function roofFires(map: MapDef): readonly { x: number; y: number; block: number }[] {
  return roofsOf(map).fires;
}

/** The roof block (lanka_roof / roof_fire tiles joined side by side) at (x, y), or -1. */
export function roofBlock(map: MapDef, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return -1;
  return roofsOf(map).block[y * map.width + x]!;
}

/**
 * The roof blocks that burn: a block with a roof_fire tile burns once a trigger on that tile has fired (its once-flag
 * is set: Hanumān has leapt onto it), or from the start when no trigger covers the tile. Empty on a map without fire.
 */
export function burningBlocks(map: MapDef, flags: Record<string, true>): Set<number> {
  const out = new Set<number>();
  const { fires } = roofsOf(map);
  for (const f of fires) {
    const on = map.triggers.filter((t) => triggerCovers(t, f.x, f.y));
    if (on.length === 0 || on.some((t) => t.once !== false && flags[triggerFlag(map.id, t.event)])) out.add(f.block);
  }
  return out;
}

// ───────────────────────── Laṅkā by night (scene 8): the guards' light ─────────────────────────

/** The tiles a guard watches now (P3: the active avoid-triggers of the map), each once, row by row. */
export function sightTiles(map: MapDef, flags: Record<string, true>): { x: number; y: number }[] {
  const seen = new Set<number>();
  const out: { x: number; y: number }[] = [];
  for (const t of avoidTriggers(map)) {
    if (!avoidActive(t, map.id, flags)) continue;
    for (let y = t.y; y < t.y + Math.max(1, t.h || 1); y++)
      for (let x = t.x; x < t.x + Math.max(1, t.w || 1); x++) {
        const k = y * map.width + x;
        if (x < 0 || y < 0 || x >= map.width || y >= map.height || seen.has(k)) continue;
        seen.add(k);
        out.push({ x, y });
      }
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}
