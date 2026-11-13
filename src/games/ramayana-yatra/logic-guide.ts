/**
 * "Show the way" (v0.4.2, fx-guide): where the player should go next, derived from the game's own walkthrough.
 * Pure and deterministic; never stored in the save (the view recomputes it when the save changes; memoized per
 * save object). Also home of the multi-map BFS `findPath` (moved here from logic-sim, which re-exports it), so the
 * view can use it without importing the test bot.
 *
 *   guideTarget(state, content) → GuideTarget | null
 *     The first walkthrough step whose `expectFlag` is not set (the walkthrough is shared by both journey styles).
 *     Its goal is a person (talk), a tile (reach) or a shrine (recite) on the step's map. When the goal is on the
 *     player's map, the target is that person / tile / shrine. Otherwise the target is the exit (warp tile) on the
 *     player's map that the shortest route to the goal crosses first (findPath over walkable tiles and open warps;
 *     the practice game prefers a route without encounter grass when one exists; Kathā has no random encounters,
 *     so it takes the shortest). Null after the ending (mode `ended`, or every step done).
 */
import type { Dir, GameContent, GameState, MapDef, SaveData, WalkStep, WarpDef } from './types';
import { TILE_PROPS } from './catalog';
import { testFlag } from './logic-util';
import { DELTA, DIRS, hasTile, inBounds, isSolidTile, mapById, npcsOn, tileAt, triggerCovers, type PlacedNpc } from './logic-world';
import { isKatha } from './logic-katha';

// ───────────────────────── pathing ─────────────────────────

interface Layout {
  maps: MapDef[];
  offset: Map<string, number>;
  total: number;
}
const layoutCache = new WeakMap<GameContent, Layout>();
const warpIndexCache = new WeakMap<MapDef, Map<number, WarpDef>>();

/** The warp that a step onto (x, y) takes (the first warp listed for that tile, as the reducer does). */
export function warpIndex(map: MapDef): Map<number, WarpDef> {
  let m = warpIndexCache.get(map);
  if (!m) {
    m = new Map();
    for (const w of map.warps) if (!m.has(w.y * map.width + w.x)) m.set(w.y * map.width + w.x, w);
    warpIndexCache.set(map, m);
  }
  return m;
}
/** A tile as one integer (x and y may be −1 at a map edge). */
export const spot = (x: number, y: number): number => (y + 1) * 65536 + (x + 1);

/** Every tile of every map gets one integer id (offset[map] + y * width + x). */
function layoutOf(content: GameContent): Layout {
  const hit = layoutCache.get(content);
  if (hit) return hit;
  const offset = new Map<string, number>();
  let total = 0;
  for (const m of content.maps) {
    if (offset.has(m.id)) continue;
    offset.set(m.id, total);
    total += Math.max(0, m.width * m.height);
  }
  const lay: Layout = { maps: content.maps.filter((m, i) => content.maps.findIndex((o) => o.id === m.id) === i), offset, total };
  layoutCache.set(content, lay);
  return lay;
}

/**
 * BFS from the player's position over walkable tiles and open warps (across maps) to the first tile
 * satisfying `goal`. Returns the step directions, or null. Tiles with repeatable (once:false) triggers are
 * avoided unless they are the goal. `avoidEncounters` skips encounter tiles (the caller retries without).
 */
export function findPath(state: GameState, content: GameContent, goal: (map: string, x: number, y: number) => boolean, avoidEncounters = false): Dir[] | null {
  const flags = state.save.flags;
  const lay = layoutOf(content);
  const startOff = lay.offset.get(state.save.mapId);
  const startMap = mapById(content, state.save.mapId);
  if (startOff === undefined || !startMap) return null;
  const npcBlock = new Map<string, Set<number>>();
  const blocked = (mapId: string, w: number, x: number, y: number): boolean => {
    let set = npcBlock.get(mapId);
    if (!set) {
      set = new Set(npcsOn(state, content, mapId).filter((n) => n.solid !== false).map((n) => n.y * w + n.x));
      npcBlock.set(mapId, set);
    }
    return set.has(y * w + x);
  };
  const prev = new Int32Array(lay.total).fill(-1); // previous node id (+ dir in prevDir); -2 = start
  const prevDir = new Uint8Array(lay.total);
  const startId = startOff + state.save.y * startMap.width + state.save.x;
  if (startId < 0 || startId >= lay.total) return null;
  prev[startId] = -2;
  const queue = new Int32Array(lay.total);
  const queueMap: MapDef[] = new Array<MapDef>(lay.total);
  let qh = 0;
  let qt = 0;
  queue[qt] = startId;
  queueMap[qt++] = startMap;
  const reconstruct = (id: number): Dir[] => {
    const path: Dir[] = [];
    for (let at = id; prev[at]! >= 0; at = prev[at]!) path.push(DIRS[prevDir[at]!]!);
    return path.reverse();
  };
  while (qh < qt) {
    const cur = queue[qh]!;
    const map = queueMap[qh++]!;
    const off = lay.offset.get(map.id)!;
    const cx = (cur - off) % map.width;
    const cy = Math.floor((cur - off) / map.width);
    for (let d = 0; d < 4; d++) {
      const dir = DIRS[d]!;
      const nx = cx + DELTA[dir][0];
      const ny = cy + DELTA[dir][1];
      if (!inBounds(map, nx, ny) || isSolidTile(map, nx, ny) || blocked(map.id, map.width, nx, ny)) continue;
      const warp = warpIndex(map).get(ny * map.width + nx);
      let nextMap = map;
      let tx = nx;
      let ty = ny;
      if (warp) {
        if (!testFlag(flags, warp.requires)) continue;
        const t = mapById(content, warp.to);
        if (!t || isSolidTile(t, warp.tx, warp.ty) || !lay.offset.has(t.id)) continue;
        nextMap = t;
        tx = warp.tx;
        ty = warp.ty;
      } else if (!goal(map.id, nx, ny)) {
        if (map.triggers.length > 0 && map.triggers.some((t) => t.once === false && triggerCovers(t, nx, ny) && testFlag(flags, t.requires))) continue;
        if (avoidEncounters) {
          const t = tileAt(map, nx, ny);
          if ((t.ground && TILE_PROPS[t.ground].encounter) || (t.overlay && TILE_PROPS[t.overlay].encounter)) continue;
        }
      }
      const id = lay.offset.get(nextMap.id)! + ty * nextMap.width + tx;
      if (prev[id] !== -1) continue;
      prev[id] = cur;
      prevDir[id] = d;
      if (goal(nextMap.id, tx, ty)) return reconstruct(id);
      queue[qt] = id;
      queueMap[qt++] = nextMap;
    }
  }
  return null;
}

/** Spots from which pressing A talks to an npc at (nx, ny): adjacent tiles, or across a market-stall counter. */
export function talkSpots(content: GameContent, mapId: string, nx: number, ny: number): Set<number> {
  const map = mapById(content, mapId);
  const out = new Set<number>();
  if (!map) return out;
  for (const d of DIRS) {
    const [dx, dy] = DELTA[d];
    out.add(spot(nx + dx, ny + dy));
    if (hasTile(map, nx + dx, ny + dy, 'market_stall')) out.add(spot(nx + 2 * dx, ny + 2 * dy));
  }
  return out;
}

/**
 * The npc to talk to for a walkthrough `talk` step: the npc itself if visible, otherwise a visible npc standing
 * where the target is defined (the common "retry" pattern: a second npc with the opposite showIf on the same tile).
 */
export function visibleTarget(state: GameState, content: GameContent, mapId: string, npcId: string): PlacedNpc | undefined {
  const npcs = npcsOn(state, content, mapId);
  const direct = npcs.find((n) => n.id === npcId);
  if (direct) return direct;
  const def = mapById(content, mapId)?.npcs.find((n) => n.id === npcId);
  return def ? npcs.find((n) => n.x === def.x && n.y === def.y) : undefined;
}

/** The shrine tiles of a map. */
export function shrineTiles(map: MapDef): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (hasTile(map, x, y, 'shrine')) out.push({ x, y });
  return out;
}

// ───────────────────────── the guide ─────────────────────────

export type GuideKind = 'npc' | 'tile' | 'shrine' | 'exit';

/** Where the map pointer stands: always a tile of the player's current map. */
export interface GuideTarget {
  /** npc: a person to talk to · tile: a place to step on · shrine: recite there · exit: the way out toward the goal */
  kind: GuideKind;
  /** the player's current map (the marker is drawn on it) */
  map: string;
  x: number;
  y: number;
  /** kind npc: the npc (as placed now) to talk to */
  npc?: string;
  /** kind exit: the map the exit leads to */
  to?: string;
  /** kind shrine: the verse to recite there */
  recite?: string;
  /** index of the walkthrough step this target serves (the first one not done yet) */
  step: number;
  /** the step's own goal (it may be on another map) */
  goal: { map: string; x: number; y: number };
  /** steps from the player to the place where the target is acted on (0: already there); -1: no open route */
  distance: number;
}

/** Index of the first walkthrough step whose flag is not set yet (-1: every step is done). */
export function guideStep(save: Pick<SaveData, 'flags'>, content: GameContent): number {
  return content.walkthrough.findIndex((w) => !save.flags[w.expectFlag]);
}

interface Goal {
  /** where the marker stands when the goal is on the player's map */
  point: { x: number; y: number };
  /** tiles of the step's map from which the goal is acted on (talk: beside the npc; reach: the tile; recite: beside a shrine) */
  spots: Set<number>;
  kind: Exclude<GuideKind, 'exit'>;
  npc?: string;
  recite?: string;
  /** recite: the shrines (the marker goes on the one next to the route's end) */
  shrines?: { x: number; y: number }[];
}

function goalOf(state: GameState, content: GameContent, step: WalkStep): Goal | null {
  const map = mapById(content, step.map);
  if (!map) return null;
  const a = step.action;
  if ('talk' in a) {
    const npc = visibleTarget(state, content, step.map, a.talk);
    // not visible yet (shown by the map's own onEnter or a trigger on the way): its defined place
    const def = npc ?? map.npcs.find((n) => n.id === a.talk);
    if (!def) return null;
    return { point: { x: def.x, y: def.y }, spots: talkSpots(content, step.map, def.x, def.y), kind: 'npc', npc: npc?.id ?? a.talk };
  }
  if ('reach' in a) return { point: { x: a.reach.x, y: a.reach.y }, spots: new Set([spot(a.reach.x, a.reach.y)]), kind: 'tile' };
  if ('recite' in a) {
    const shrines = shrineTiles(map);
    if (shrines.length === 0) return null;
    const spots = new Set<number>();
    for (const sh of shrines) for (const d of DIRS) spots.add(spot(sh.x + DELTA[d][0], sh.y + DELTA[d][1]));
    return { point: shrines[0]!, spots, kind: 'shrine', recite: a.recite, shrines };
  }
  return null;
}

/** Map ids from `from` to `to` over warps, ignoring their `requires` (BFS); [] when unconnected. */
function mapHops(content: GameContent, from: string, to: string): string[] {
  const prev = new Map<string, string>([[from, '']]);
  const q = [from];
  while (q.length) {
    const m = q.shift()!;
    for (const w of mapById(content, m)?.warps ?? []) {
      if (prev.has(w.to)) continue;
      prev.set(w.to, m);
      if (w.to === to) {
        const path = [to];
        for (let c = m; c; c = prev.get(c) ?? '') path.unshift(c);
        return path;
      }
      q.push(w.to);
    }
  }
  return [];
}

function compute(state: GameState, content: GameContent): GuideTarget | null {
  const i = guideStep(state.save, content);
  if (i < 0) return null;
  const step = content.walkthrough[i]!;
  const goal = goalOf(state, content, step);
  const here = mapById(content, state.save.mapId);
  if (!goal || !here) return null;
  const { x: px, y: py, mapId } = state.save;
  const base = { step: i, goal: { map: step.map, x: goal.point.x, y: goal.point.y } };
  const atGoal = (gx: number, gy: number): GuideTarget => {
    // a shrine step: the shrine beside the place where the route ends
    let point = goal.point;
    if (goal.shrines) point = goal.shrines.find((sh) => Math.abs(sh.x - gx) + Math.abs(sh.y - gy) === 1) ?? point;
    return { kind: goal.kind, map: mapId, x: point.x, y: point.y, ...(goal.npc ? { npc: goal.npc } : {}), ...(goal.recite ? { recite: goal.recite } : {}), ...base, goal: { map: step.map, x: point.x, y: point.y }, distance: -1 };
  };
  if (mapId === step.map && goal.spots.has(spot(px, py))) return { ...atGoal(px, py), distance: 0 };
  const isGoal = (m: string, x: number, y: number): boolean => m === step.map && goal.spots.has(spot(x, y));
  const path = (!isKatha(state) ? findPath(state, content, isGoal, true) : null) ?? findPath(state, content, isGoal, false);
  if (path) {
    // follow the route on this map: the first warp it steps on is the way out
    let x = px;
    let y = py;
    for (let k = 0; k < path.length; k++) {
      x += DELTA[path[k]!][0];
      y += DELTA[path[k]!][1];
      const w = warpIndex(here).get(y * here.width + x);
      if (w) return { kind: 'exit', map: mapId, x, y, to: w.to, ...base, distance: k + 1 };
    }
    return { ...atGoal(x, y), distance: path.length };
  }
  // no open route (an npc in the way, a closed gate): point at the goal itself, or at an exit toward its map
  if (mapId === step.map) return atGoal(goal.point.x, goal.point.y);
  const hops = mapHops(content, mapId, step.map);
  const next = hops[1];
  const exits = next ? here.warps.filter((w) => w.to === next) : [];
  if (exits.length === 0) return null;
  const w = exits.reduce((a, b) => (Math.abs(b.x - px) + Math.abs(b.y - py) < Math.abs(a.x - px) + Math.abs(a.y - py) ? b : a));
  return { kind: 'exit', map: mapId, x: w.x, y: w.y, to: w.to, ...base, distance: -1 };
}

const memo = new WeakMap<GameContent, WeakMap<SaveData, GuideTarget | null>>();

/**
 * Where to go next (see the file comment), or null after the ending. Depends only on the save (map, position, flags,
 * npc places, journey style), so it is memoized per save object: the view can call it every frame.
 */
export function guideTarget(state: GameState, content: GameContent): GuideTarget | null {
  if (state.mode === 'ended') return null;
  let per = memo.get(content);
  if (!per) memo.set(content, (per = new WeakMap()));
  if (per.has(state.save)) return per.get(state.save) ?? null;
  const g = compute(state, content);
  per.set(state.save, g);
  return g;
}
