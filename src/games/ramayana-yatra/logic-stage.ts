/**
 * v0.6 WP0: the effects kit (plan §1; notes/v06-wp0.md). OWNER: WP0 / orchestrator. Pure and deterministic.
 *
 * Event commands (Kathā only; world.test refuses them outside a Kathā block; in the practice journey `execKit` returns
 * the same state). None of them waits: a script composes them with `{ "wait": ms }`.
 *   { "fx": "shake" | "flash" | "petals" | "rain", "ms"? }   a one-shot / timed screen effect (Fx kind 'kit')
 *   { "fx": "tint", "color": "gold" | "red" | "night" | "dawn" | "sea" | "none" }   a colour wash (stage state) until the next tint / the script ends
 *   { "topple": ["janaka", "player"] }  or  { "topple": { "allBut": ["rama", "lakshmana", "vishvamitra", "janaka"] } }
 *                                        figures fall (npc ids of this map, "player", prop ids); allBut = every figure on the stage but these
 *   { "rise": ["player"] } | { "rise": "all" }   they stand up again
 *   { "grow": "hanuman_m", "scale": 2.5 }        sprite scale (0.5–4), anchored at the feet ("player" too)
 *   { "glow": { "x": 12, "y": 7, "w"?: 1, "h"?: 1 }, "ms"? }   a tile shimmer (one-shot)
 *   { "prop": "sandals", "sprite": "<prop / tile / sprite id>", "at": { "x": 8, "y": 5 } | "rama" }   place
 *   { "prop": "sandals", "to": { "x": 9, "y": 5 } | "bharata", "ms"? }   move (glides)
 *   { "prop": "sandals", "carry": "bharata" } | { "prop": "sandals", "carry": null }   carried over a figure's head / put down where it is
 *   { "prop": "sandals", "remove": true }
 *   { "arrow": { "from": "rama", "to": { "x": 30, "y": 6 }, "through": [{ "x": 20, "y": 6 }, …] }, "ms"? }   a projectile line
 * The view (view-screen + view-stage) draws GameState.stage and the 'kit' fx, with a reduced-motion path for each, and
 * logs every kit fx to window.__ryKitLog (e2e). The same commands are steps of a told cutscene (logic-told `stageAt`),
 * where the figures are the scene's cast.
 *
 * The hidden moment `{ "hotspot": { x, y }, "then": [...], "flag"?, "ms"? }` is a pending (logic-events): see
 * `hotspotPending`.
 */
import type { Dir, EventCmd, Fx, GameContent, GameState, HotspotPending, KitFxName, StagePos, StageProp, StageState, StageTarget, TintColor } from './types';
import { indexOf } from './logic-util';
import { visibleNpcs } from './logic-world';

/** Default length (ms) of the timed kit effects. */
export const KIT_MS = { shake: 600, flash: 450, petals: 4000, rain: 4000, glow: 2500, arrow: 700, prop: 600, grow: 800 } as const;
/** How long a hotspot waits before it passes by itself (ms). */
export const HOTSPOT_MS = 4000;
/** Scale limits of `{ "grow" }`. */
export const GROW_MIN = 0.5;
export const GROW_MAX = 4;
export const KIT_FX: readonly KitFxName[] = ['shake', 'flash', 'petals', 'rain', 'tint'];
export const TINTS: readonly TintColor[] = ['gold', 'red', 'night', 'dawn', 'sea', 'none'];
/** The kit's event-command keys (world.test: Kathā only). */
export const KIT_KEYS = ['fx', 'topple', 'rise', 'grow', 'glow', 'prop', 'arrow'] as const;
export type KitKey = (typeof KIT_KEYS)[number];

export type KitCmd = Extract<EventCmd, { fx: KitFxName } | { topple: StageTarget } | { rise: StageTarget | 'all' } | { grow: string } | { glow: { x: number; y: number } } | { prop: string } | { arrow: unknown }>;

export function isKitCmd(cmd: unknown): cmd is KitCmd {
  return !!cmd && typeof cmd === 'object' && KIT_KEYS.some((k) => k in (cmd as object));
}

export const EMPTY_STAGE: StageState = { down: [], scale: {}, props: {} };

/** The stage of a state (an empty one when nothing has changed). */
export function stageOf(s: Pick<GameState, 'stage'>): StageState {
  return s.stage ?? EMPTY_STAGE;
}

/** A state with no stage (a script ended, a new one begins). Same object when there is none. */
export function clearStage<T extends Pick<GameState, 'stage'>>(s: T): T {
  if (!s.stage) return s;
  const { stage: _gone, ...rest } = s;
  return rest as T;
}

/** The ids a target names, among `all` (the figures on the stage). */
export function targetIds(target: StageTarget | 'all' | unknown, all: readonly string[], down: readonly string[] = []): string[] {
  if (target === 'all') return [...down];
  if (Array.isArray(target)) return target.filter((x): x is string => typeof x === 'string');
  if (target && typeof target === 'object' && Array.isArray((target as { allBut?: unknown }).allBut)) {
    const but = new Set((target as { allBut: unknown[] }).allBut.filter((x): x is string => typeof x === 'string'));
    return all.filter((id) => !but.has(id));
  }
  return [];
}

/** How the kit finds figures and places (map scripts: npcs, the player and props; cutscenes: the cast and props). */
export interface StageWorld {
  /** every figure on the stage (allBut picks from these) */
  actors: () => string[];
  /** a figure's tile, or null */
  at: (id: string) => { x: number; y: number } | null;
}

/** A place: a tile, or where a figure / prop stands now. */
export function resolvePos(pos: StagePos | unknown, stage: StageState, world: StageWorld): { x: number; y: number } | null {
  if (typeof pos === 'string') {
    const p = stage.props[pos];
    if (p) {
      const c = p.carry ? world.at(p.carry) : null;
      return c ?? { x: p.x, y: p.y };
    }
    return world.at(pos);
  }
  if (pos && typeof pos === 'object') {
    const { x, y } = pos as { x: unknown; y: unknown };
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  }
  return null;
}

/**
 * The stage after one kit command (pure; the same object when nothing changes). One-shot effects (shake, flash, petals,
 * rain, glow, arrow) leave the stage as it is: see `kitFx`.
 */
export function applyKit(stage: StageState, cmd: KitCmd, world: StageWorld): StageState {
  if ('fx' in cmd) {
    if (cmd.fx !== 'tint') return stage;
    const c = cmd.color ?? 'none';
    if (!TINTS.includes(c)) return stage;
    if (c === 'none') {
      if (!stage.tint) return stage;
      const { tint: _t, ...rest } = stage;
      return rest;
    }
    return stage.tint === c ? stage : { ...stage, tint: c };
  }
  if ('topple' in cmd) {
    const props = Object.keys(stage.props);
    const ids = targetIds(cmd.topple, [...world.actors(), ...props]).filter((id) => !stage.down.includes(id));
    return ids.length ? { ...stage, down: [...stage.down, ...ids] } : stage;
  }
  if ('rise' in cmd) {
    const props = Object.keys(stage.props);
    const ids = new Set(targetIds(cmd.rise, [...world.actors(), ...props], stage.down));
    const down = stage.down.filter((id) => !ids.has(id));
    return down.length === stage.down.length ? stage : { ...stage, down };
  }
  if ('grow' in cmd) {
    if (typeof cmd.grow !== 'string' || typeof cmd.scale !== 'number' || !Number.isFinite(cmd.scale)) return stage;
    const k = Math.max(GROW_MIN, Math.min(GROW_MAX, cmd.scale));
    const scale = { ...stage.scale };
    if (k === 1) delete scale[cmd.grow];
    else scale[cmd.grow] = k;
    return { ...stage, scale };
  }
  if ('prop' in cmd) {
    const id = cmd.prop;
    if (typeof id !== 'string' || !id) return stage;
    const prev = stage.props[id];
    if (cmd.remove) {
      if (!prev) return stage;
      const props = { ...stage.props };
      delete props[id];
      return { ...stage, props, down: stage.down.filter((d) => d !== id) };
    }
    const here = prev ? resolvePos(id, stage, world) : null;
    let next: StageProp | null = prev ? { ...prev, ...(here ? { x: here.x, y: here.y } : {}) } : null;
    if (cmd.at !== undefined) {
      const p = resolvePos(cmd.at, stage, world);
      if (!p) return stage;
      next = { sprite: cmd.sprite ?? prev?.sprite ?? 'log', x: p.x, y: p.y };
    } else if (cmd.sprite && next) next = { ...next, sprite: cmd.sprite };
    if (!next) return stage; // moving or carrying a prop that was never placed
    if (cmd.to !== undefined) {
      const p = resolvePos(cmd.to, stage, world);
      if (p) {
        next = { ...next, x: p.x, y: p.y };
        delete next.carry;
      }
    }
    if (cmd.carry !== undefined) {
      if (typeof cmd.carry === 'string' && cmd.carry) next = { ...next, carry: cmd.carry };
      else delete next.carry;
    }
    return { ...stage, props: { ...stage.props, [id]: next } };
  }
  return stage;
}

/** The one-shot / timed effect of a kit command for the view (map scripts), or null (state-only commands). */
export function kitFx(cmd: KitCmd, stage: StageState, world: StageWorld): Extract<Fx, { kind: 'kit' }> | null {
  const ms = (d: number): number => {
    const m = (cmd as { ms?: unknown }).ms;
    return typeof m === 'number' && Number.isFinite(m) && m >= 0 ? Math.min(20000, m) : d;
  };
  if ('fx' in cmd) {
    if (cmd.fx === 'shake' || cmd.fx === 'flash' || cmd.fx === 'petals' || cmd.fx === 'rain') return { kind: 'kit', name: cmd.fx, ms: ms(KIT_MS[cmd.fx]) };
    return null;
  }
  if ('glow' in cmd) {
    const g = cmd.glow;
    if (!g || typeof g.x !== 'number' || typeof g.y !== 'number') return null;
    return { kind: 'kit', name: 'glow', ms: ms(KIT_MS.glow), at: { x: g.x, y: g.y, w: Math.max(1, g.w ?? 1), h: Math.max(1, g.h ?? 1) } };
  }
  if ('arrow' in cmd) {
    const a = cmd.arrow as { from?: StagePos; to?: StagePos; through?: StagePos[] } | undefined;
    if (!a) return null;
    const pts = [a.from, ...(Array.isArray(a.through) ? a.through : []), a.to].map((p) => resolvePos(p, stage, world));
    if (pts.some((p) => !p)) return null;
    return { kind: 'kit', name: 'arrow', ms: ms(KIT_MS.arrow), path: pts as { x: number; y: number }[] };
  }
  return null;
}

/** The map world of a state: visible npcs, the player and their tiles. */
export function mapWorld(state: GameState, content: GameContent): StageWorld {
  let npcs: { id: string; x: number; y: number }[] | null = null;
  const list = (): { id: string; x: number; y: number }[] => (npcs ??= visibleNpcs(state, content).map((n) => ({ id: n.id, x: n.x, y: n.y })));
  return {
    actors: () => ['player', ...list().map((n) => n.id)],
    at: (id) => {
      if (id === 'player') return { x: state.save.x, y: state.save.y };
      const n = list().find((x) => x.id === id);
      return n ? { x: n.x, y: n.y } : null;
    },
  };
}

/** Run one kit command in a map script: the stage changes and / or a 'kit' fx for the view. Practice → the same state. */
export function execKit(state: GameState, content: GameContent, cmd: KitCmd, katha: boolean): GameState {
  if (!katha) return state;
  if (!indexOf(content).map.has(state.save.mapId)) return state;
  const world = mapWorld(state, content);
  const stage = stageOf(state);
  const next = applyKit(stage, cmd, world);
  const fx = kitFx(cmd, stage, world);
  let s: GameState = state;
  if (next !== stage) s = { ...s, stage: next };
  if (fx) s = { ...s, fx: [...s.fx, fx] };
  return s;
}

/** `{ "hotspot" }` → its pending (or null when malformed). */
export function hotspotPending(cmd: { hotspot: { x: number; y: number }; ms?: number }): HotspotPending | null {
  const h = cmd.hotspot;
  if (!h || typeof h.x !== 'number' || typeof h.y !== 'number') return null;
  const ms = typeof cmd.ms === 'number' && Number.isFinite(cmd.ms) && cmd.ms > 0 ? Math.min(20000, cmd.ms) : HOTSPOT_MS;
  return { kind: 'hotspot', x: h.x, y: h.y, ms };
}

/** The flag a hotspot sets when found: its `flag`, else `found.<event id>`. */
export function hotspotFlag(cmd: { flag?: string }, eventId: string): string {
  return typeof cmd.flag === 'string' && cmd.flag ? cmd.flag : `found.${eventId}`;
}

/** Facing helper for the view (a fallen figure lies toward its facing side; left / right only). */
export function fallSide(facing: Dir): 1 | -1 {
  return facing === 'left' ? -1 : 1;
}
