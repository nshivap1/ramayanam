/**
 * World logic: tiles, collision, NPC visibility, stepping, warps, triggers, interaction.
 * OWNER: core. Pure and deterministic (randomness only through logic-battle's rollEncounter).
 * Kathā (v0.4): random encounters are off (kuśa tiles never roll).
 */
import type { Dir, GameContent, GameState, MapDef, NpcDef, SignDef, TriggerDef, WarpDef } from './types';
import { type TileId, TILE_IDS, TILE_PROPS } from './catalog';
import { indexOf, testFlag } from './logic-util';
import { battleOutcome, rollEncounter, startBattle } from './logic-battle';
import { SHRINE_CMDS, SHRINE_EVENT_ID, afterBattle, enterMapEffects, setFlag, startEvent, startScript } from './logic-events';
import { saToast } from './logic-learning';
import { uiSa } from './sa-ui';
import { isKatha } from './logic-katha';

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
export const DELTA: Record<Dir, readonly [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function isDir(d: unknown): d is Dir {
  return d === 'up' || d === 'down' || d === 'left' || d === 'right';
}

/** NPC as currently placed (after showIf filtering and scripted-move overrides). */
export type PlacedNpc = NpcDef & { x: number; y: number; facing: Dir };

const TILE_SET: ReadonlySet<string> = new Set<string>(TILE_IDS);

/** 1×1 solid placeholder used when the save points at a map the content does not have (never throws). */
export const VOID_MAP: MapDef = {
  id: '',
  nameId: '',
  kanda: 1,
  width: 1,
  height: 1,
  legend: { ' ': 'void' },
  ground: [' '],
  music: 'ashrama',
  battleBg: 'ashrama',
  npcs: [],
  warps: [],
  triggers: [],
};

export function mapById(content: GameContent, id: string): MapDef | undefined {
  return indexOf(content).map.get(id);
}

export function currentMap(state: GameState, content: GameContent): MapDef {
  return mapById(content, state.save.mapId) ?? VOID_MAP;
}

export function inBounds(map: MapDef, x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < map.width && y < map.height;
}

function tileOf(map: MapDef, ch: string | undefined): TileId | null {
  if (ch === undefined) return null;
  const t = map.legend[ch];
  return t !== undefined && TILE_SET.has(t) ? t : null;
}

/** Ground + overlay tile ids at (x, y). Overlay char ' ' = empty. Out of bounds / unknown chars → null. */
export function tileAt(map: MapDef, x: number, y: number): { ground: TileId | null; overlay: TileId | null } {
  if (!inBounds(map, x, y)) return { ground: null, overlay: null };
  const g = map.ground[y]?.[x];
  const o = map.overlay?.[y]?.[x];
  return { ground: tileOf(map, g), overlay: o === undefined || o === ' ' ? null : tileOf(map, o) };
}

const solidCache = new WeakMap<MapDef, Uint8Array>();

function solidGrid(map: MapDef): Uint8Array {
  const hit = solidCache.get(map);
  if (hit) return hit;
  const grid = new Uint8Array(Math.max(0, map.width * map.height));
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const t = tileAt(map, x, y);
      const solid = t.ground === null || TILE_PROPS[t.ground].solid || (t.overlay !== null && TILE_PROPS[t.overlay].solid);
      grid[y * map.width + x] = solid ? 1 : 0;
    }
  }
  solidCache.set(map, grid);
  return grid;
}

/** Static solidity (tiles only): out of bounds, unknown ground, or a solid ground/overlay tile. */
export function isSolidTile(map: MapDef, x: number, y: number): boolean {
  if (!inBounds(map, x, y)) return true;
  return solidGrid(map)[y * map.width + x] === 1;
}

/** True when either layer at (x, y) is the given tile. */
export function hasTile(map: MapDef, x: number, y: number, id: TileId): boolean {
  const t = tileAt(map, x, y);
  return t.ground === id || t.overlay === id;
}

export function npcKey(mapId: string, npcId: string): string {
  return `${mapId}/${npcId}`;
}

/** NPCs on any map, filtered by showIf against the current flags, with save.npcPos overrides applied. */
export function npcsOn(state: GameState, content: GameContent, mapId: string): PlacedNpc[] {
  const map = mapById(content, mapId);
  if (!map) return [];
  const out: PlacedNpc[] = [];
  for (const n of map.npcs) {
    if (!testFlag(state.save.flags, n.showIf)) continue;
    const o = state.save.npcPos[npcKey(mapId, n.id)];
    out.push(o ? { ...n, x: o.x, y: o.y, facing: o.facing } : { ...n });
  }
  return out;
}

export function visibleNpcs(state: GameState, content: GameContent): PlacedNpc[] {
  return npcsOn(state, content, state.save.mapId);
}

/** Walkability on any map: in bounds, tile not solid, no visible solid NPC, not the player's own tile. */
export function isWalkableOn(state: GameState, content: GameContent, mapId: string, x: number, y: number): boolean {
  const map = mapById(content, mapId);
  if (!map || isSolidTile(map, x, y)) return false;
  if (mapId === state.save.mapId && x === state.save.x && y === state.save.y) return false;
  for (const n of npcsOn(state, content, mapId)) if (n.solid !== false && n.x === x && n.y === y) return false;
  return true;
}

export function isWalkable(state: GameState, content: GameContent, x: number, y: number): boolean {
  return isWalkableOn(state, content, state.save.mapId, x, y);
}

export function warpAt(map: MapDef, x: number, y: number): WarpDef | undefined {
  return map.warps.find((w) => w.x === x && w.y === y);
}

export function signAt(map: MapDef, x: number, y: number): SignDef | undefined {
  return map.signs?.find((s) => s.x === x && s.y === y);
}

export function triggerCovers(t: TriggerDef, x: number, y: number): boolean {
  return x >= t.x && y >= t.y && x < t.x + Math.max(1, t.w || 1) && y < t.y + Math.max(1, t.h || 1);
}

/** Flag set when a once-trigger fires. */
export function triggerFlag(mapId: string, eventId: string): string {
  return `trig.${mapId}.${eventId}`;
}

/**
 * v0.5b P3: an avoid-trigger (`TriggerDef.avoid`, a guard's line of sight) is active while its `requires` holds and,
 * for a once-trigger, its flag is not set yet. An active one is a wall to `findPath` and '#' in the e2e grid.
 */
export function avoidActive(t: TriggerDef, mapId: string, flags: Record<string, true>): boolean {
  return t.avoid === true && testFlag(flags, t.requires) && (t.once === false || !flags[triggerFlag(mapId, t.event)]);
}

const avoidCache = new WeakMap<MapDef, TriggerDef[]>();

/** The avoid-triggers of a map (cached per map object: findPath asks for every tile it visits). */
export function avoidTriggers(map: MapDef): TriggerDef[] {
  let a = avoidCache.get(map);
  if (!a) avoidCache.set(map, (a = (map.triggers ?? []).filter((t) => t.avoid === true)));
  return a;
}

/** v0.5b P3: (x, y) lies in an active avoid-trigger of the map. */
export function inSight(map: MapDef, flags: Record<string, true>, x: number, y: number): boolean {
  const av = avoidTriggers(map);
  return av.length > 0 && av.some((t) => triggerCovers(t, x, y) && avoidActive(t, map.id, flags));
}

/** The NPC the player would talk to when pressing A (directly in front, or across a market-stall counter). */
export function npcInFront(state: GameState, content: GameContent): PlacedNpc | undefined {
  const map = currentMap(state, content);
  const [dx, dy] = DELTA[state.save.facing];
  const fx = state.save.x + dx;
  const fy = state.save.y + dy;
  const npcs = visibleNpcs(state, content);
  const direct = npcs.find((n) => n.x === fx && n.y === fy);
  if (direct) return direct;
  if (hasTile(map, fx, fy, 'market_stall')) return npcs.find((n) => n.x === fx + dx && n.y === fy + dy);
  return undefined;
}

function withFacing(state: GameState, dir: Dir): GameState {
  return state.save.facing === dir ? state : { ...state, save: { ...state.save, facing: dir } };
}

function bumped(state: GameState, dir: Dir): GameState {
  const s = withFacing(state, dir);
  return { ...s, fx: [...s.fx, { kind: 'bump' }] };
}

/** Put the player on another map (no checks), emit the warp fx and run the map's onEnter event. */
export function enterMap(state: GameState, content: GameContent, mapId: string, x: number, y: number, facing: Dir): GameState {
  const s: GameState = { ...state, save: { ...state.save, mapId, x, y, facing }, fx: [...state.fx, { kind: 'warp' }] };
  return enterMapEffects(s, content, mapId);
}

/** The book whose opening `next-book` would play now (n + 1 after the last completed book n < 6), or null. */
export function nextBookKanda(state: GameState): number | null {
  const done = state.save.completedChapters;
  if (done.length === 0) return null;
  const k = Math.max(...done) + 1;
  return k <= 6 && !state.save.flags[`ch${k}.started`] ? k : null;
}

/**
 * v0.5a, the book-complete screen's "continue" (explore, nothing pending): right after book n is complete and before
 * book n + 1 has started, put the player where book n + 1 begins (its ChapterDef startMap / startX / startY; a player
 * already on that map stays where they are) and play its opening at once. The opening is the start map's trigger
 * that covers the walkthrough's `ch{n+1}.started` reach point: the same event a step into that area runs (it sets
 * the chapter, shows the title card and its scene). Anything else: the same state object.
 */
export function beginNextBook(state: GameState, content: GameContent): GameState {
  if (state.mode !== 'explore' || state.pending) return state;
  const k = nextBookKanda(state);
  const ch = k === null ? undefined : content.chapters.find((c) => c.kanda === k);
  const map = ch ? mapById(content, ch.startMap) : undefined;
  if (!ch || !map) return state;
  const step = content.walkthrough.find((w) => w.expectFlag === `ch${k}.started` && w.map === map.id);
  const at = step && 'reach' in step.action ? step.action.reach : { x: ch.startX, y: ch.startY };
  let s: GameState = state;
  if (state.save.mapId !== map.id) {
    const dx = at.x - ch.startX;
    const dy = at.y - ch.startY;
    const facing: Dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    s = enterMap(state, content, map.id, ch.startX, ch.startY, facing);
    if (s.mode !== 'explore' || s.pending) return s; // the map's own onEnter took over (no start map has one today)
  }
  const ev = indexOf(content).event;
  const trig = map.triggers.find(
    (t) => triggerCovers(t, at.x, at.y) && ev.has(t.event) && testFlag(s.save.flags, t.requires) && (t.once === false || !s.save.flags[triggerFlag(map.id, t.event)]),
  );
  if (!trig) return s;
  if (trig.once !== false) s = setFlag(s, triggerFlag(map.id, trig.event));
  return startEvent(s, content, trig.event);
}

/** Explore-mode `step`. Returns the same object when nothing at all changed. */
export function stepPlayer(state: GameState, content: GameContent, dir: Dir): GameState {
  const map = currentMap(state, content);
  const [dx, dy] = DELTA[dir];
  const nx = state.save.x + dx;
  const ny = state.save.y + dy;
  const warp = inBounds(map, nx, ny) ? warpAt(map, nx, ny) : undefined;
  if (warp && !testFlag(state.save.flags, warp.requires)) {
    const faced = withFacing(state, dir);
    if (warp.lockedEvent && indexOf(content).event.has(warp.lockedEvent)) return startEvent(faced, content, warp.lockedEvent);
    return bumped(state, dir);
  }
  if (!isWalkable(state, content, nx, ny)) return bumped(state, dir);
  let s: GameState = { ...state, save: { ...state.save, x: nx, y: ny, facing: dir } };
  if (warp) {
    const target = mapById(content, warp.to);
    if (!target || isSolidTile(target, warp.tx, warp.ty)) return bumped(state, dir); // content bug: never strand the player
    return enterMap(s, content, warp.to, warp.tx, warp.ty, warp.facing ?? dir);
  }
  const ev = indexOf(content).event;
  const trig = map.triggers.find(
    (t) => triggerCovers(t, nx, ny) && ev.has(t.event) && testFlag(s.save.flags, t.requires) && (t.once === false || !s.save.flags[triggerFlag(map.id, t.event)]),
  );
  if (trig) {
    if (trig.once !== false) s = setFlag(s, triggerFlag(map.id, trig.event));
    return startEvent(s, content, trig.event);
  }
  const t = tileAt(map, nx, ny);
  const encounter = (t.ground !== null && TILE_PROPS[t.ground].encounter) || (t.overlay !== null && TILE_PROPS[t.overlay].encounter);
  if (encounter && map.encounters && map.encounters.table.length > 0 && !isKatha(s)) {
    const r = rollEncounter(s, content, map);
    s = r.state;
    if (r.spec) {
      const b = startBattle({ ...s, fx: [...s.fx, { kind: 'encounter' }] }, content, r.spec);
      return b.battle && battleOutcome(b) !== null ? afterBattle(b, content) : b;
    }
  }
  return s;
}

/** Explore-mode `interact` (A button). Same object when there is nothing to interact with. */
export function interact(state: GameState, content: GameContent): GameState {
  const map = currentMap(state, content);
  const facing = state.save.facing;
  const [dx, dy] = DELTA[facing];
  const fx = state.save.x + dx;
  const fy = state.save.y + dy;
  const npc = npcInFront(state, content);
  if (npc) {
    if (!indexOf(content).event.has(npc.event)) return state;
    const s: GameState = { ...state, save: { ...state.save, npcPos: { ...state.save.npcPos, [npcKey(map.id, npc.id)]: { x: npc.x, y: npc.y, facing: OPPOSITE[facing] } } } };
    return startEvent(s, content, npc.event);
  }
  const sign = signAt(map, fx, fy);
  if (sign) return startScript(state, content, 'core.sign', [{ say: sign.text }]);
  if (hasTile(map, fx, fy, 'shrine')) return startScript(state, content, SHRINE_EVENT_ID, SHRINE_CMDS);
  if (hasTile(map, fx, fy, 'well')) return { ...state, fx: [...state.fx, saToast('The well water is cool and clear.', uiSa(content, 'toast.well'))] };
  if (hasTile(map, fx, fy, 'chest')) return { ...state, fx: [...state.fx, saToast('The chest is empty.', uiSa(content, 'toast.chest'))] };
  return state;
}
