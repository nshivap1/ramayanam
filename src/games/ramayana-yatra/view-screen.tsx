/**
 * Top screen (view agent): the 320×180 pixel canvas. Overworld (eased camera, tile layers,
 * tweened y-sorted sprites, light, warp/fade/encounter transitions, bump) and battle
 * (backgrounds, battlers, HP boxes, hit/heal/buff particles, damage numbers, faint fades).
 * All cosmetic animation state lives here; game state is only read (via a ref) each frame.
 */
import { type ReactElement, type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { type Rng, createRng } from '@sdk';
import { useRafLoop, useSwipe } from '@ui';
import { toDevaDigits } from '@sanskrit';
import type { BattleBgId, BattlerId, SpriteId, TileId } from './catalog';
import { DELTA } from './input';
import { type GuideTarget, affinityOf, burningBlocks, currentMap, isKatha, playerSprite, roofBlock, roofFires, sightTiles, tileAt, visibleNpcs } from './logic';
import { INK, R } from './art-palette';
import { ELEMENT_COLOR, MOVE_STEP_MS, STEP_MS, Name, PlayerName, type ViewEnv, asciiLabel, englishName, useEnv } from './view-common';
import { useUi } from './view-ui';
import { type BattleBeat, type Dir, type Element, type GameState, type MapDef, TILE, VIEW_H, VIEW_W } from './types';

/** Cosmetic triggers written by Game (from state.fx) and read by the canvas. Times are performance.now(). */
export interface Anim {
  shakeAt: number;
  flashAt: number;
  encounterAt: number;
  warpAt: number;
  bumpAt: number;
  /** Earliest time the next overworld step may be sent (tween in progress). */
  busyUntil: number;
  /** Current step duration (shorter while running). */
  stepMs: number;
}
export function createAnim(): Anim {
  return { shakeAt: -1e9, flashAt: -1e9, encounterAt: -1e9, warpAt: -1e9, bumpAt: -1e9, busyUntil: 0, stepMs: STEP_MS };
}

interface Ent {
  sprite: SpriteId;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t0: number;
  dur: number;
  facing: Dir;
  parity: number;
  path: { pts: { x: number; y: number }[]; dirs: Dir[]; t0: number; seg: number } | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  t0: number;
  life: number;
  color: string;
  size: number;
  shape: 'sq' | 'up' | 'down' | 'star';
}
interface Popup {
  text: string;
  x: number;
  y: number;
  t0: number;
  color: string;
}

interface Vis {
  mapId: string | null;
  player: Ent | null;
  npcs: Map<string, Ent>;
  camX: number;
  camY: number;
  lastPending: unknown;
  fade: number;
  fadeTarget: number;
  lastMode: string;
  // battle
  battleRef: unknown;
  lastBeat: BattleBeat | null;
  hpAlly: number;
  hpFoe: number;
  foeKey: string;
  allyKey: string;
  enterFoe: number;
  enterAlly: number;
  leaveAlly: number;
  faintFoe: number;
  faintAlly: number;
  hitFoe: number;
  hitAlly: number;
  particles: Particle[];
  popups: Popup[];
  rng: Rng;
  /** what the map pointer drew this frame ('' | 'mark:x,y' | 'edge:x,y', canvas px of a marker pixel), mirrored on data-guide */
  guideMark: string;
  /** v0.5b (WP-B) Laṅkā ablaze: the map and how many roof blocks burnt last frame (a new one flashes), its time, the embers */
  fireMap: string | null;
  fireLit: number;
  fireFlashAt: number;
  embers: Particle[];
  /** figures drawn in a boat this frame (Guha's ferry), mirrored on data-boats for tests */
  boats: number;
}

const ease = (k: number): number => 1 - (1 - k) * (1 - k);
const clamp01 = (k: number): number => (k < 0 ? 0 : k > 1 ? 1 : k);

function entPos(e: Ent, now: number): { x: number; y: number; moving: boolean; k: number; facing: Dir; parity: number } {
  if (e.path) {
    const { pts, dirs, t0, seg } = e.path;
    const n = dirs.length;
    const el = now - t0;
    if (seg <= 0 || el >= n * seg) {
      const last = pts[pts.length - 1] as { x: number; y: number };
      return { x: last.x, y: last.y, moving: false, k: 1, facing: e.facing, parity: e.parity };
    }
    const i = Math.max(0, Math.floor(el / seg));
    const k = (el - i * seg) / seg;
    const a = pts[i] as { x: number; y: number };
    const b = pts[i + 1] as { x: number; y: number };
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, moving: true, k, facing: dirs[i] as Dir, parity: i % 2 };
  }
  const k = e.dur > 0 ? clamp01((now - e.t0) / e.dur) : 1;
  return { x: e.fromX + (e.toX - e.fromX) * k, y: e.fromY + (e.toY - e.fromY) * k, moving: k < 1, k, facing: e.facing, parity: e.parity };
}

function newEnt(sprite: SpriteId, x: number, y: number, facing: Dir): Ent {
  return { sprite, fromX: x, fromY: y, toX: x, toY: y, t0: 0, dur: 0, facing, parity: 0, path: null };
}

/** Update an entity toward its logical tile; returns true if a tween started. */
function retarget(e: Ent, x: number, y: number, facing: Dir, now: number, reduced: boolean, move: { path: Dir[] } | null, stepMs = STEP_MS): boolean {
  if (e.toX === x && e.toY === y) {
    if (!e.path || now - e.path.t0 > e.path.dirs.length * e.path.seg) e.facing = facing;
    return false;
  }
  const cur = entPos(e, now);
  if (move && move.path.length > 0 && !reduced) {
    // logic already moved the entity: replay the path from where it started
    let sx = x;
    let sy = y;
    for (const d of move.path) {
      sx -= DELTA[d].dx;
      sy -= DELTA[d].dy;
    }
    const pts = [{ x: sx, y: sy }];
    for (const d of move.path) {
      const p = pts[pts.length - 1] as { x: number; y: number };
      pts.push({ x: p.x + DELTA[d].dx, y: p.y + DELTA[d].dy });
    }
    e.path = { pts, dirs: move.path, t0: now, seg: MOVE_STEP_MS };
    e.fromX = x;
    e.fromY = y;
    e.toX = x;
    e.toY = y;
    e.facing = move.path[move.path.length - 1] as Dir;
    return true;
  }
  e.path = null;
  const dist = Math.abs(x - Math.round(cur.x)) + Math.abs(y - Math.round(cur.y));
  if (dist === 1 && !reduced) {
    e.fromX = cur.x;
    e.fromY = cur.y;
    e.t0 = now;
    e.dur = stepMs;
  } else {
    e.fromX = x;
    e.fromY = y;
    e.dur = 0;
  }
  e.toX = x;
  e.toY = y;
  e.facing = facing;
  e.parity ^= 1;
  return true;
}

const FOE_X = 222;
const FOE_Y = 16;
const ALLY_X = 34;
const ALLY_Y = 90;

export interface ScreenProps {
  stateRef: RefObject<GameState | null>;
  env: ViewEnv;
  anim: Anim;
  onSwipe?: (d: Dir) => void;
  overlay?: ReactNode;
  title?: boolean;
  /** "Show the way" (v0.4.2): the target to mark this frame, or null (hidden: setting off, dialogue, battle, menus …) */
  guideRef?: RefObject<GuideTarget | null>;
}

export function Screen({ stateRef, env, anim, onSwipe, overlay, title, guideRef }: ScreenProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const envRef = useRef(env);
  envRef.current = env;
  const vis = useRef<Vis>({
    mapId: null,
    player: null,
    npcs: new Map(),
    camX: 0,
    camY: 0,
    lastPending: null,
    fade: 0,
    fadeTarget: 0,
    lastMode: '',
    battleRef: null,
    lastBeat: null,
    hpAlly: 0,
    hpFoe: 0,
    foeKey: '',
    allyKey: '',
    enterFoe: -1e9,
    enterAlly: -1e9,
    leaveAlly: Infinity,
    faintFoe: Infinity,
    faintAlly: Infinity,
    hitFoe: -1e9,
    hitAlly: -1e9,
    particles: [],
    popups: [],
    rng: createRng(0x5eed),
    guideMark: '',
    fireMap: null,
    fireLit: 0,
    fireFlashAt: -1e9,
    embers: [],
    boats: 0,
  });

  useSwipe(wrapRef, (d) => onSwipe?.(d), { keys: false, threshold: 28 });

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = VIEW_W;
    c.height = VIEW_H;
  }, []);

  useRafLoop((dt) => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    const now = performance.now();
    const t = now / 1000;
    const s = stateRef.current;
    const e = envRef.current;
    const v = vis.current;
    try {
      if (!s || title) drawTitle(ctx, e, t, v);
      else {
        const inBattle = s.mode === 'battle' && !!s.battle;
        const encK = now - anim.encounterAt;
        v.guideMark = '';
        v.boats = 0;
        if (inBattle && encK > 420) drawBattle(ctx, s, e, v, now, dt);
        else drawWorld(ctx, s, e, v, anim, now, dt, inBattle ? null : (guideRef?.current ?? null));
        if (v.lastMode === 'battle' && s.mode !== 'battle') anim.warpAt = now;
        v.lastMode = s.mode;
        // fades
        const p = s.pending;
        if (p?.kind === 'fade') v.fadeTarget = p.to === 'out' ? 1 : 0;
        else if (s.mode === 'explore' && !p) v.fadeTarget = 0;
        const fk = e.reduced ? 1 : Math.min(1, dt / 120);
        v.fade += (v.fadeTarget - v.fade) * fk;
        if (Math.abs(v.fade - v.fadeTarget) < 0.01) v.fade = v.fadeTarget;
        if (v.fade > 0) {
          ctx.fillStyle = `rgba(8,6,12,${v.fade})`;
          ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }
        // warp fade-in
        const wk = (now - anim.warpAt) / 320;
        if (wk >= 0 && wk < 1 && !e.reduced) {
          ctx.fillStyle = `rgba(8,6,12,${1 - ease(wk)})`;
          ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }
        // encounter transition: flashes, then closing blinds, then opening
        if (encK >= 0 && encK < 840) drawEncounter(ctx, encK, e.reduced);
        // flash
        const fl = (now - anim.flashAt) / 260;
        if (fl >= 0 && fl < 1) {
          ctx.fillStyle = `rgba(255,255,255,${(1 - fl) * 0.85})`;
          ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        }
      }
    } catch (err) {
      // never let a content gap crash the frame loop
      ctx.fillStyle = 'rgb(20,14,24)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      if (!(v as unknown as { errLogged?: boolean }).errLogged) {
        (v as unknown as { errLogged?: boolean }).errLogged = true;
        console.warn('[ramayana-yatra] render', err);
      }
    }
    // the map pointer, mirrored for tests (data-guide on the canvas)
    const mark = !s || title ? '' : v.guideMark;
    if ((c.dataset['guide'] ?? '') !== mark) c.dataset['guide'] = mark;
    const boats = String(!s || title ? 0 : v.boats);
    if (c.dataset['boats'] !== boats) c.dataset['boats'] = boats;
    // screen shake (CSS transform on the canvas so the HUD text stays crisp)
    const sk = (now - anim.shakeAt) / 360;
    if (sk >= 0 && sk < 1 && !envRef.current.reduced) {
      const a = (1 - sk) * 3;
      c.style.transform = `translate(${Math.round(Math.sin(now / 18) * a)}px, ${Math.round(Math.cos(now / 23) * a * 0.6)}px)`;
    } else if (c.style.transform) c.style.transform = '';
  }, true);

  return (
    <div className="g-ramayana-yatra__screen" ref={wrapRef}>
      <canvas ref={canvasRef} className="g-ramayana-yatra__canvas" width={VIEW_W} height={VIEW_H} aria-hidden="true" data-testid="screen" />
      {overlay}
    </div>
  );
}

/**
 * Battle info boxes in Sanskrit (dialogueLang sa / sa-en): the canvas draws only the boxes and HP bars, and these DOM
 * labels sit on top of them (positions in canvas units: foe box 6,8 · ally box 190,128, both 124 wide), so names,
 * levels and HP numbers follow the script setting. English mode keeps the pixel-font labels and renders nothing here.
 */
export function BattleTags({ state }: { state: GameState }): ReactElement | null {
  const env = useEnv();
  const ui = useUi();
  const b = state.battle;
  if (!b) return null;
  const beat = b.beats[0] ?? null;
  const allyHp = Math.max(0, beat ? beat.allyHp : b.ally.hp);
  const foeDef = env.idx.enemy.get(b.foe.id);
  const allyDef = env.idx.ally.get(b.ally.id);
  const lv = (n: number): ReactNode => (
    <span className="g-ramayana-yatra__btag-lv">
      {ui.t('common.lv', undefined, { gloss: false })} {ui.num(n)}
    </span>
  );
  return (
    <div className="g-ramayana-yatra__btags" aria-hidden="true" data-testid="battle-tags">
      <div className="g-ramayana-yatra__btag is-foe">
        <span className="g-ramayana-yatra__btag-name">
          <Name id={foeDef?.nameId} fallback={b.foe.id} />
        </span>
        {lv(b.foe.level)}
        {b.warn ? (
          <span className="g-ramayana-yatra__btag-warn" data-testid="foe-warn">
            !
          </span>
        ) : null}
      </div>
      <FoeAffinity state={state} />
      <div className="g-ramayana-yatra__btag is-ally">
        <span className="g-ramayana-yatra__btag-name">{b.ally.id === 'player' ? <PlayerName /> : <Name id={allyDef?.nameId} fallback={b.ally.id} />}</span>
        {lv(b.ally.level)}
      </div>
      <div className="g-ramayana-yatra__btag is-ally-hp">
        <span>
          {b.spec.kind === 'duel' ? ui.t('hud.resolve', undefined, { gloss: false }) : ui.t('common.hp', undefined, { gloss: false })} {ui.num(allyHp)}/{ui.num(b.ally.maxHp)}
        </span>
      </div>
    </div>
  );
}

/**
 * v0.5a (Kathā wild / boss fights): the foe's affinity under its name — the astra that fits it in Vālmīki (Mānava for
 * Mārīca in Book 1), else the element strong against it (logic-tactics affinityOf). In the player's language.
 */
function FoeAffinity({ state }: { state: GameState }): ReactElement | null {
  const env = useEnv();
  const ui = useUi();
  const b = state.battle;
  if (!b || !isKatha(state) || b.spec.kind === 'duel') return null;
  const aff = affinityOf(env.content, state.save.chapter, b.foe);
  if (!aff) return null;
  const n = env.idx.name.get(aff.kind === 'astra' ? `move.${aff.moveId}` : `element.${aff.element}`);
  if (!n) return null;
  return (
    <div className={`g-ramayana-yatra__btag is-affinity ${aff.kind === 'astra' ? 'is-astra' : `el-${aff.kind === 'element' ? aff.element : ''}`}`} data-testid="foe-affinity" data-affinity={aff.kind === 'astra' ? aff.moveId : aff.element}>
      <span aria-hidden="true">✦ </span>
      {ui.t('katha.fitTag', { x: { en: n.en, sa: n.sa } }, { gloss: false })}
    </div>
  );
}

// ───────────────────────── title ─────────────────────────

function drawTitle(ctx: CanvasRenderingContext2D, env: ViewEnv, t: number, v: Vis): void {
  env.art.drawBattleBg(ctx, 'river' as BattleBgId, t);
  // fireflies / drifting motes
  const r = createRng(7);
  for (let i = 0; i < 18; i++) {
    const bx = r.next() * VIEW_W;
    const by = 40 + r.next() * 120;
    const ph = r.next() * 6.28;
    const x = (bx + Math.sin(t * 0.6 + ph) * 12 + t * 6) % VIEW_W;
    const y = by + Math.cos(t * 0.8 + ph) * 6;
    const a = env.reduced ? 0.6 : 0.35 + 0.35 * Math.sin(t * 2 + ph);
    ctx.fillStyle = `rgba(255,230,150,${a})`;
    ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
  }
  // the sage and the student on the near sandbank (art-bg ALLY platform ≈ centre 66,153),
  // the pair of kraunca birds on the far one (FOE platform ≈ centre 254,80)
  const bob = env.reduced ? 0 : Math.round(Math.sin(t * 2) * 0.6);
  env.art.drawSprite(ctx, 'valmiki', 42, 134 + bob, 'right', 0);
  env.art.drawSprite(ctx, env.avatar === 'b' ? 'player_b' : 'player_a', 70, 136, 'right', 0);
  const peck = env.reduced ? 0 : Math.floor(t * 1.5) % 4 === 0 ? 1 : 0;
  env.art.drawSprite(ctx, 'krauncha', 236, 62, 'right', (peck ? 1 : 0) as 0 | 1);
  env.art.drawSprite(ctx, 'krauncha', 256, 63, 'left', 0);
  v.mapId = null;
}

// ───────────────────────── overworld ─────────────────────────

function drawWorld(ctx: CanvasRenderingContext2D, s: GameState, env: ViewEnv, v: Vis, anim: Anim, now: number, dt: number, guide: GuideTarget | null = null): void {
  const map = currentMap(s, env.content);
  const t = now / 1000;
  const reduced = env.reduced;
  const pend = s.pending;
  const newPending = pend !== v.lastPending;
  v.lastPending = pend;
  const moveFor = (who: string): { path: Dir[] } | null => (newPending && pend?.kind === 'move' && pend.who === who ? { path: pend.path } : null);

  // P4 (v0.5b): in Kathā book 5 the player walks as Hanumān, the student riding on his shoulder
  const avatarSprite: SpriteId = playerSprite(s.save);
  const fresh = v.mapId !== map.id || !v.player;
  if (fresh) {
    v.mapId = map.id;
    v.player = newEnt(avatarSprite, s.save.x, s.save.y, s.save.facing);
    v.npcs = new Map();
  } else if (v.player) {
    v.player.sprite = avatarSprite;
    const moved = retarget(v.player, s.save.x, s.save.y, s.save.facing, now, reduced, moveFor('player'), anim.stepMs);
    if (moved && v.player.dur > 0) anim.busyUntil = Math.max(anim.busyUntil, v.player.t0 + v.player.dur);
  }
  const npcs = visibleNpcs(s, env.content);
  const seen = new Set<string>();
  for (const n of npcs) {
    seen.add(n.id);
    const ent = v.npcs.get(n.id);
    if (!ent || fresh) v.npcs.set(n.id, newEnt(n.sprite, n.x, n.y, n.facing));
    else retarget(ent, n.x, n.y, n.facing, now, reduced, moveFor(n.id));
  }
  for (const k of [...v.npcs.keys()]) if (!seen.has(k)) v.npcs.delete(k);

  // camera
  const player = v.player as Ent;
  const pp = entPos(player, now);
  const mw = map.width * TILE;
  const mh = map.height * TILE;
  const tx = mw <= VIEW_W ? (mw - VIEW_W) / 2 : Math.max(0, Math.min(mw - VIEW_W, pp.x * TILE + 8 - VIEW_W / 2));
  const ty = mh <= VIEW_H ? (mh - VIEW_H) / 2 : Math.max(0, Math.min(mh - VIEW_H, pp.y * TILE + 4 - VIEW_H / 2));
  if (fresh || reduced) {
    v.camX = tx;
    v.camY = ty;
  } else {
    const a = 1 - Math.exp(-dt / 70);
    v.camX += (tx - v.camX) * a;
    v.camY += (ty - v.camY) * a;
    if (Math.abs(tx - v.camX) < 0.25) v.camX = tx;
    if (Math.abs(ty - v.camY) < 0.25) v.camY = ty;
  }
  const cx = Math.round(v.camX);
  const cy = Math.round(v.camY);

  ctx.fillStyle = 'rgb(12,10,18)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const x0 = Math.max(0, Math.floor(cx / TILE));
  const y0 = Math.max(0, Math.floor(cy / TILE));
  const x1 = Math.min(map.width - 1, Math.floor((cx + VIEW_W) / TILE));
  const y1 = Math.min(map.height - 1, Math.floor((cy + VIEW_H) / TILE));
  // v0.5b Laṅkā ablaze: a roof block burns once Hanumān has leapt onto its roof_fire tile; until then it is a roof
  const fire = roofFires(map).length > 0 ? burningBlocks(map, s.save.flags) : null;
  const roofTile = (id: TileId, x: number, y: number): TileId => (fire && (id === 'lanka_roof' || id === 'roof_fire') ? (fire.has(roofBlock(map, x, y)) ? 'roof_fire' : 'lanka_roof') : id);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const tl = tileAt(map, x, y);
      if (tl.ground) env.art.drawTile(ctx, roofTile(tl.ground, x, y), x * TILE - cx, y * TILE - cy, t);
      if (tl.overlay) env.art.drawTile(ctx, roofTile(tl.overlay, x, y), x * TILE - cx, y * TILE - cy, t);
    }
  }
  if (fire) {
    if (v.fireMap === map.id && fire.size > v.fireLit) v.fireFlashAt = now;
    if (v.fireMap !== map.id) v.embers = [];
    v.fireMap = map.id;
    v.fireLit = fire.size;
    // a roof not yet alight but waiting for Hanumān: a spark on it, so the eye finds it
    for (const f of roofFires(map)) {
      if (fire.has(f.block)) continue;
      const sx = f.x * TILE - cx;
      const sy = f.y * TILE - cy;
      if (sx < -TILE || sx > VIEW_W || sy < -TILE || sy > VIEW_H) continue;
      const k = reduced ? 0 : Math.floor(t * 6) % 3;
      ctx.fillStyle = 'rgb(255,192,48)';
      ctx.fillRect(sx + 7, sy + 5 + k, 2, 2);
      ctx.fillStyle = 'rgb(255,122,32)';
      ctx.fillRect(sx + 4 + k * 3, sy + 10, 1, 1);
    }
  } else {
    v.fireMap = null;
    v.fireLit = 0;
    v.embers = [];
  }

  // who is speaking? (pending say with a person.* / sprite id) → a pixel speech bubble above them
  let speaker: Ent | null = null;
  if (pend?.kind === 'say' && pend.who) {
    const sid = pend.who.replace(/^person\./, '');
    if (sid === 'player' || sid === '{player}' || (sid === avatarSprite && avatarSprite === 'hanuman')) speaker = v.player;
    else {
      let best = Infinity;
      for (const ent of v.npcs.values()) {
        if (ent.sprite !== sid) continue;
        const d = Math.abs(ent.toX - player.toX) + Math.abs(ent.toY - player.toY);
        if (d < best) {
          best = d;
          speaker = ent;
        }
      }
    }
  }

  // sprites, y-sorted
  const list: { y: number; draw: () => void }[] = [];
  // v0.5b (WP-B, for WP-A's ferry): a figure carried over water (a scripted move: nobody walks there) sits in a boat;
  // figures side by side on one row share one hull
  const afloat = new Set<string>();
  for (const ent of [...v.npcs.values(), v.player as Ent]) {
    const q = entPos(ent, now);
    const bx = Math.round(q.x);
    const by = Math.round(q.y);
    if (onWater(map, bx, by)) afloat.add(`${bx},${by}`);
  }
  v.boats = afloat.size;
  const pushEnt = (ent: Ent, isPlayer: boolean): void => {
    const p = entPos(ent, now);
    let ox = 0;
    let oy = 0;
    if (isPlayer) {
      const bk = (now - anim.bumpAt) / 140;
      if (bk >= 0 && bk < 1 && !reduced) {
        const d = DELTA[ent.facing];
        const a = Math.sin(bk * Math.PI) * 2;
        ox = d.dx * a;
        oy = d.dy * a;
      }
    }
    const frame: 0 | 1 | 2 = p.moving && p.k < 0.6 ? (p.parity ? 1 : 2) : 0;
    const px = Math.round(p.x * TILE - cx + ox);
    const py = Math.round(p.y * TILE - cy + oy);
    if (px < -24 || px > VIEW_W + 8 || py < -24 || py > VIEW_H + 24) return;
    list.push({
      y: p.y + (isPlayer ? 0.001 : 0),
      draw: () => {
        // soft shadow
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(px + 3, py + 13, 10, 2);
        ctx.fillRect(px + 4, py + 12, 8, 4);
        const rider = isPlayer && ent.sprite === 'hanuman';
        const side = p.facing === 'left' || p.facing === 'right';
        if (rider && side) drawRider(ctx, px, py - 8, p.facing, s.save.avatar === 'b' ? 'b' : 'a', frame);
        const tx = Math.round(p.x);
        const ty = Math.round(p.y);
        const boat = afloat.has(`${tx},${ty}`);
        env.art.drawSprite(ctx, ent.sprite, px, py, p.facing, boat ? 0 : frame);
        if (rider && !side) drawRider(ctx, px, py - 8, p.facing, s.save.avatar === 'b' ? 'b' : 'a', frame);
        if (boat) drawHull(ctx, px, py, !afloat.has(`${tx - 1},${ty}`), !afloat.has(`${tx + 1},${ty}`));
      },
    });
  };
  for (const ent of v.npcs.values()) pushEnt(ent, false);
  pushEnt(player, true);
  list.sort((a, b) => a.y - b.y);
  for (const it of list) it.draw();
  if (speaker) {
    const p = entPos(speaker, now);
    const bob = reduced ? 0 : Math.round(Math.sin(now / 160));
    const bx = Math.round(p.x * TILE - cx) + 3;
    const by = Math.round(p.y * TILE - cy) - 17 + bob;
    ctx.fillStyle = 'rgb(58,40,34)';
    ctx.fillRect(bx - 1, by, 12, 7);
    ctx.fillRect(bx, by - 1, 10, 9);
    ctx.fillRect(bx + 3, by + 8, 3, 1);
    ctx.fillStyle = 'rgb(255,250,236)';
    ctx.fillRect(bx, by, 10, 7);
    ctx.fillRect(bx + 4, by + 7, 1, 1);
    ctx.fillStyle = 'rgb(58,40,34)';
    for (let i = 0; i < 3; i++) ctx.fillRect(bx + 2 + i * 3, by + 3, 1, 1);
  }

  env.art.drawLight(ctx, map.light, t);
  // v0.5b (WP-B), above the light so they read at night: the lamplight a guard watches (P3), the burning roofs
  drawSight(ctx, map, s, cx, cy, t, reduced);
  if (fire) drawFire(ctx, map, fire, v, cx, cy, now, dt, reduced);
  // the map pointer sits above the light, so it reads on night maps too
  if (guide && guide.map === map.id) {
    const ent = guide.kind === 'npc' && guide.npc ? v.npcs.get(guide.npc) : undefined;
    const gp = ent ? entPos(ent, now) : { x: guide.x, y: guide.y };
    v.guideMark = drawGuide(ctx, guide.kind, Math.round(gp.x * TILE - cx), Math.round(gp.y * TILE - cy), Math.round(pp.x * TILE - cx) + 8, Math.round(pp.y * TILE - cy) + 8, now, reduced);
  }
}

// ───────────────────────── Sundara-kāṇḍa in Kathā (v0.5b, WP-B) ─────────────────────────

/**
 * P4: the student riding on Hanumān's right shoulder, drawn over his sprite (16×24, top-left x, y): beside his head
 * when he faces the player or walks away, behind his head in profile (drawn first, so he covers it). Pixel masks:
 * o ink · H hair · S skin · s skin shade · T top · L lower cloth · K the verse book · F flower (avatar b).
 */
export const RIDER: Record<'down' | 'up' | 'right' | 'left', { x: number; y: number; rows: Record<'a' | 'b', string[]> }> = {
  down: {
    x: -2,
    y: 4,
    rows: {
      a: ['..o..', '.oHo.', 'oHHHo', 'oHSSo', 'oSSSo', '.oso.', 'oSTSo', 'oTKTo', 'oLLLo', '.oLLo', '..oSo', '...o.'],
      b: ['.....', '.ooo.', 'oHHFo', 'oHSSH', 'HSSSH', 'Hoso.', 'oTTTo', 'oTKTo', 'oLLLo', '.oLLo', '..oSo', '...o.'],
    },
  },
  up: {
    x: 13,
    y: 4,
    rows: {
      a: ['..o..', '.oHo.', 'oHHHo', 'oHHHo', 'oHHHo', '.oso.', 'oSSSo', 'osSso', 'oLLLo', 'oLLo.', '.....', '.....'],
      b: ['.....', '.ooo.', 'oHHFo', 'oHHHo', 'oHHHH', 'oHHHo', 'oTHTo', 'oTTTo', 'oLLLo', 'oLLo.', '.....', '.....'],
    },
  },
  right: {
    x: -2,
    y: 5,
    rows: {
      a: ['..o..', '.oHo.', 'oHHHo', 'oHHSo', 'oHSSo', '.oso.', 'oSSTo', 'oTTKo', 'oLLLo', '.oLLo', '..oSo', '...o.'],
      b: ['.....', '.ooo.', 'oHHHo', 'FHHSo', 'HHSSo', 'Hoso.', 'oTTTo', 'oTTKo', 'oLLLo', '.oLLo', '..oSo', '...o.'],
    },
  },
  left: {
    x: 13,
    y: 5,
    rows: {
      a: ['..o..', '.oHo.', 'oHHHo', 'oSHHo', 'oSSHo', '.oso.', 'oTSSo', 'oKTTo', 'oLLLo', 'oLLo.', 'oSo..', '.o...'],
      b: ['.....', '.ooo.', 'oHHHo', 'oSHHF', 'oSSHH', '.osoH', 'oTTTo', 'oKTTo', 'oLLLo', 'oLLo.', 'oSo..', '.o...'],
    },
  },
};

/** The rider's colours: the chosen avatar's own (art-sprites player_a / player_b). */
export function riderPalette(avatar: 'a' | 'b'): Record<string, string> {
  const skin = avatar === 'b' ? R.skinFair : R.skinWarm;
  return {
    o: INK,
    H: '#2c2238',
    S: skin[1],
    s: skin[2],
    T: avatar === 'b' ? R.teal[2] : skin[1],
    L: avatar === 'b' ? R.saffron[1] : '#fbf8f0',
    K: R.saffron[2],
    F: R.lotus[1],
  };
}

function drawRider(ctx: CanvasRenderingContext2D, x: number, y: number, facing: Dir, avatar: 'a' | 'b', frame: 0 | 1 | 2): void {
  const m = RIDER[facing];
  const pal = riderPalette(avatar);
  const bob = frame === 0 ? 0 : 1; // he rides with Hanumān's stride
  const rows = m.rows[avatar];
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j] as string;
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i] as string];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + m.x + i, y + m.y + j + bob, 1, 1);
    }
  }
}

const WATERY: ReadonlySet<TileId> = new Set<TileId>(['water', 'water_deep', 'ocean', 'lotus', 'shore_n', 'shore_s', 'shore_e', 'shore_w']);

/** A water or shore tile (where a figure can only be by boat). */
function onWater(map: MapDef, x: number, y: number): boolean {
  const t = tileAt(map, x, y);
  return t.ground !== null && WATERY.has(t.ground);
}

/**
 * Guha's ferry (for WP-A, Ayodhyā 2.52): a wooden hull drawn over the figure's feet (16 px wide; the prow curls up at a
 * row's free ends, so figures side by side sit in one boat).
 */
function drawHull(ctx: CanvasRenderingContext2D, px: number, py: number, leftEnd: boolean, rightEnd: boolean): void {
  const x0 = px - (leftEnd ? 3 : 0);
  const x1 = px + 16 + (rightEnd ? 3 : 0);
  // a ripple at the waterline
  ctx.fillStyle = 'rgba(232,252,255,0.55)';
  ctx.fillRect(x0 - 1, py + 15, x1 - x0 + 2, 1);
  ctx.fillStyle = INK;
  ctx.fillRect(x0, py + 9, x1 - x0, 6);
  ctx.fillStyle = R.wood[1];
  ctx.fillRect(x0 + (leftEnd ? 1 : 0), py + 10, x1 - x0 - (leftEnd ? 1 : 0) - (rightEnd ? 1 : 0), 1);
  ctx.fillStyle = R.wood[2];
  ctx.fillRect(x0 + (leftEnd ? 1 : 0), py + 11, x1 - x0 - (leftEnd ? 1 : 0) - (rightEnd ? 1 : 0), 2);
  ctx.fillStyle = R.wood[3];
  ctx.fillRect(x0 + (leftEnd ? 2 : 0), py + 13, x1 - x0 - (leftEnd ? 2 : 0) - (rightEnd ? 2 : 0), 1);
  // the prows curl up at the ends
  if (leftEnd) {
    ctx.fillStyle = INK;
    ctx.fillRect(x0 - 1, py + 7, 2, 3);
    ctx.fillStyle = R.wood[1];
    ctx.fillRect(x0, py + 8, 1, 2);
  }
  if (rightEnd) {
    ctx.fillStyle = INK;
    ctx.fillRect(x1 - 1, py + 7, 2, 3);
    ctx.fillStyle = R.wood[1];
    ctx.fillRect(x1 - 1, py + 8, 1, 2);
  }
}

/** P3: the tiles a guard watches glow with lamplight (a soft pool with a brighter rim), so the dark way reads. */
function drawSight(ctx: CanvasRenderingContext2D, map: MapDef, s: GameState, cx: number, cy: number, t: number, reduced: boolean): void {
  const tiles = sightTiles(map, s.save.flags);
  if (tiles.length === 0) return;
  const on = new Set(tiles.map((p) => p.y * map.width + p.x));
  const pulse = reduced ? 0 : Math.sin(t * 2.4) * 0.04;
  for (const p of tiles) {
    const sx = p.x * TILE - cx;
    const sy = p.y * TILE - cy;
    if (sx < -TILE || sx > VIEW_W || sy < -TILE || sy > VIEW_H) continue;
    // warm lamplight over the cool night (source-over, so it reads as orange, not as a white highlight)
    ctx.fillStyle = `rgba(255,158,52,${0.3 + pulse})`;
    ctx.fillRect(sx, sy, TILE, TILE);
    // the pool is brightest in its middle: a lighter inner square
    ctx.fillStyle = `rgba(255,206,110,${0.16 + pulse})`;
    ctx.fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
    // where the light ends: a dotted rim, every other pixel (the step that would be seen)
    ctx.fillStyle = 'rgba(255,226,140,0.85)';
    const rim = (x0: number, y0: number, horiz: boolean): void => {
      for (let i = 0; i < TILE; i += 2) ctx.fillRect(horiz ? x0 + i : x0, horiz ? y0 : y0 + i, 1, 1);
    };
    if (!on.has((p.y - 1) * map.width + p.x)) rim(sx, sy, true);
    if (!on.has((p.y + 1) * map.width + p.x)) rim(sx, sy + TILE - 1, true);
    if (p.x === 0 || !on.has(p.y * map.width + p.x - 1)) rim(sx, sy, false);
    if (p.x === map.width - 1 || !on.has(p.y * map.width + p.x + 1)) rim(sx + TILE - 1, sy, false);
  }
}

/** Laṅkā ablaze: burning roofs glow through the night, embers rise (not with reduced motion), a new blaze flashes. */
function drawFire(ctx: CanvasRenderingContext2D, map: MapDef, fire: Set<number>, v: Vis, cx: number, cy: number, now: number, dt: number, reduced: boolean): void {
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  const x0 = Math.max(0, Math.floor(cx / TILE));
  const y0 = Math.max(0, Math.floor(cy / TILE));
  const x1 = Math.min(map.width - 1, Math.floor((cx + VIEW_W) / TILE));
  const y1 = Math.min(map.height - 1, Math.floor((cy + VIEW_H) / TILE));
  const lit: { x: number; y: number }[] = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!fire.has(roofBlock(map, x, y))) continue;
      lit.push({ x, y });
      const flick = reduced ? 0 : ((x * 7 + y * 13 + Math.floor(now / 90)) % 5) * 0.025;
      ctx.fillStyle = `rgba(255,96,24,${0.22 + flick})`;
      ctx.fillRect(x * TILE - cx, y * TILE - cy, TILE, TILE);
    }
  // the whole sky warms as more of the city burns
  if (fire.size > 0) {
    ctx.fillStyle = `rgba(120,40,8,${Math.min(0.24, 0.06 * fire.size)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  // embers
  if (!reduced && lit.length > 0) {
    for (let n = 0; n < 2 && v.embers.length < 60; n++) {
      if (v.rng.next() > dt / 40) continue;
      const p = lit[Math.floor(v.rng.next() * lit.length)] as { x: number; y: number };
      v.embers.push({ x: p.x * TILE + v.rng.next() * TILE, y: p.y * TILE + v.rng.next() * 6, vx: (v.rng.next() - 0.5) * 0.012, vy: -0.02 - v.rng.next() * 0.02, g: 0, t0: now, life: 900 + v.rng.next() * 700, color: v.rng.next() < 0.5 ? 'rgb(255,192,48)' : 'rgb(255,122,32)', size: 1, shape: 'sq' });
    }
    const live: Particle[] = [];
    for (const e of v.embers) {
      const age = now - e.t0;
      if (age > e.life) continue;
      live.push(e);
      ctx.globalAlpha = 1 - age / e.life;
      ctx.fillStyle = e.color;
      ctx.fillRect(Math.round(e.x + e.vx * age - cx), Math.round(e.y + e.vy * age - cy), e.size, e.size);
    }
    ctx.globalAlpha = 1;
    v.embers = live;
  } else v.embers = [];
  ctx.globalCompositeOperation = prev;
  // a roof catches: one warm flash (none with reduced motion)
  const fk = (now - v.fireFlashAt) / 420;
  if (fk >= 0 && fk < 1 && !reduced) {
    ctx.fillStyle = `rgba(255,170,80,${(1 - fk) * 0.5})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

// ───────────────────────── map pointer ("Show the way", v0.4.2) ─────────────────────────

const GUIDE_FILL = 'rgb(255,214,90)';
const GUIDE_INK = 'rgb(58,40,34)';
/** Mask pixels are drawn this big (chunky retro pixels: the ▼ is about one sprite wide). */
const GUIDE_PX = 2;
/** Pixel masks ('#' = filled): the ▼ marker / edge arrow (down) and the diagonal arrow (down-right); the rest are rotations. */
const ARROW_DOWN = ['#######', '.#####.', '..###..', '...#...'];
const ARROW_DR = ['...##', '..###', '.####', '#####', '####.'];
/** Rotate a mask 90° clockwise (down → left → up → right; down-right → down-left → up-left → up-right). */
function rotCW(m: string[]): string[] {
  const h = m.length;
  const w = m[0]?.length ?? 0;
  const out: string[] = [];
  for (let i = 0; i < w; i++) {
    let row = '';
    for (let j = 0; j < h; j++) row += m[h - 1 - j]?.[i] ?? '.';
    out.push(row);
  }
  return out;
}
const rots = (m: string[]): string[][] => [m, rotCW(m), rotCW(rotCW(m)), rotCW(rotCW(rotCW(m)))];
const ARROW = rots(ARROW_DOWN); // 0 down · 1 left · 2 up · 3 right
const ARROW_D = rots(ARROW_DR); // 0 down-right · 1 down-left · 2 up-left · 3 up-right
/** The 8 edge arrows by octant of atan2(dy, dx): 0 right, 1 down-right, 2 down, … (y grows downward). */
const OCTANT: string[][] = [ARROW[3]!, ARROW_D[0]!, ARROW[0]!, ARROW_D[1]!, ARROW[1]!, ARROW_D[2]!, ARROW[2]!, ARROW_D[3]!];
const maskW = (m: string[]): number => (m[0]?.length ?? 0) * GUIDE_PX;
const maskH = (m: string[]): number => m.length * GUIDE_PX;

/** Draw a mask (GUIDE_PX per pixel) with a 1-px dark outline at (x, y); returns a filled canvas pixel near its middle (for tests). */
function drawMask(ctx: CanvasRenderingContext2D, m: string[], x: number, y: number): { x: number; y: number } {
  const h = m.length;
  const w = m[0]?.length ?? 0;
  const k = GUIDE_PX;
  ctx.fillStyle = GUIDE_INK;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (m[r]![c] === '#') ctx.fillRect(x + c * k - 1, y + r * k - 1, k + 2, k + 2);
  ctx.fillStyle = GUIDE_FILL;
  let mid = { x, y };
  let best = Infinity;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (m[r]![c] !== '#') continue;
      ctx.fillRect(x + c * k, y + r * k, k, k);
      const d = Math.abs(c - (w - 1) / 2) + Math.abs(r - (h - 1) / 2);
      if (d < best) {
        best = d;
        mid = { x: x + c * k, y: y + r * k };
      }
    }
  }
  return mid;
}

/**
 * The pointer: a bobbing ▼ above the target person, or a soft glow with corner brackets + ▼ on a target tile / shrine /
 * exit (a ▲ below when the tile is on the top row); when the target is off-screen, an arrow at the screen edge on the
 * line from the player toward it. Reduced motion: no bob, no pulse. (tx, ty) = the target tile's top-left in canvas
 * px; (fx, fy) = the player's centre. Returns 'mark:x,y' / 'edge:x,y' (a marker pixel) for data-guide.
 */
function drawGuide(ctx: CanvasRenderingContext2D, kind: GuideTarget['kind'], tx: number, ty: number, fx: number, fy: number, now: number, reduced: boolean): string {
  const wave = reduced ? 0 : Math.sin(now / 200);
  const bob = Math.round(wave * 1.5);
  const cxT = tx + TILE / 2;
  const cyT = ty + TILE / 2;
  const onScreen = cxT >= 0 && cxT <= VIEW_W && cyT >= 0 && cyT <= VIEW_H;
  if (onScreen) {
    if (kind !== 'npc') {
      // a soft glow on the tile, and corner brackets breathing by a pixel
      ctx.fillStyle = `rgba(255,214,90,${reduced ? 0.3 : 0.22 + 0.14 * (wave + 1)})`;
      ctx.fillRect(tx, ty, TILE, TILE);
      const d = reduced ? 0 : wave > 0 ? 1 : 0;
      const x0 = tx - 2 - d;
      const y0 = ty - 2 - d;
      const x1 = tx + TILE + d; // the far brackets' outer edge is x1 + 2
      const y1 = ty + TILE + d;
      const L = 6;
      const T = 2;
      const corner = (x: number, y: number, right: boolean, down: boolean, color: string, grow: number): void => {
        ctx.fillStyle = color;
        const hx = right ? x + T - L : x;
        const vy = down ? y + T - L : y;
        ctx.fillRect(hx - grow, y - grow, L + 2 * grow, T + 2 * grow);
        ctx.fillRect(x - grow, vy - grow, T + 2 * grow, L + 2 * grow);
      };
      for (const [color, grow] of [[GUIDE_INK, 1], [GUIDE_FILL, 0]] as const) {
        corner(x0, y0, false, false, color, grow);
        corner(x1, y0, true, false, color, grow);
        corner(x0, y1, false, true, color, grow);
        corner(x1, y1, true, true, color, grow);
      }
    }
    // ▼ above (a person: above the head), or ▲ below when there is no room above
    const m = ARROW[0]!;
    const left = tx + Math.round((TILE - maskW(m)) / 2);
    const above = ty - maskH(m) - (kind === 'npc' ? 5 : 5) + bob;
    const p = above >= 1 ? drawMask(ctx, m, left, above) : drawMask(ctx, ARROW[2]!, left, ty + TILE + 4 - bob);
    return `mark:${p.x},${p.y}`;
  }
  // off-screen: on the line from the player to the target, inset from the edge
  const dx = cxT - fx;
  const dy = cyT - fy;
  const inset = 10;
  const lim = (d: number, from: number, size: number): number => (d > 0 ? (size - inset - from) / d : d < 0 ? (inset - from) / d : Infinity);
  const k = Math.max(0, Math.min(lim(dx, fx, VIEW_W), lim(dy, fy, VIEW_H)));
  const ax = Math.round(Math.max(inset, Math.min(VIEW_W - inset, fx + dx * k)));
  const ay = Math.round(Math.max(inset, Math.min(VIEW_H - inset, fy + dy * k)));
  const oct = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
  const mask = OCTANT[oct]!;
  // nudge toward the target (half a bob): the arrow "pushes" that way
  const nudge = reduced ? 0 : Math.max(0, bob);
  const ux = Math.sign(Math.round(Math.cos((oct * Math.PI) / 4) * 10));
  const uy = Math.sign(Math.round(Math.sin((oct * Math.PI) / 4) * 10));
  const p = drawMask(ctx, mask, ax - Math.floor(maskW(mask) / 2) + ux * nudge, ay - Math.floor(maskH(mask) / 2) + uy * nudge);
  return `edge:${p.x},${p.y}`;
}

function drawEncounter(ctx: CanvasRenderingContext2D, k: number, reduced: boolean): void {
  if (reduced) {
    if (k < 200) {
      ctx.fillStyle = 'rgba(8,6,12,0.9)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    return;
  }
  if (k < 220) {
    const on = Math.floor(k / 55) % 2 === 0;
    ctx.fillStyle = on ? 'rgba(255,255,255,0.75)' : 'rgba(10,8,16,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }
  const bars = 12;
  const h = VIEW_H / bars;
  const closing = k < 420;
  const p = closing ? (k - 220) / 200 : 1 - (k - 420) / 420;
  ctx.fillStyle = 'rgb(10,8,16)';
  for (let i = 0; i < bars; i++) {
    const w = VIEW_W * clamp01(p * 1.25 - (i % 2 ? 0.1 : 0));
    if (i % 2) ctx.fillRect(VIEW_W - w, i * h, w, h + 1);
    else ctx.fillRect(0, i * h, w, h + 1);
  }
}

// ───────────────────────── battle ─────────────────────────

function battlerFor(s: GameState, env: ViewEnv, id: string, ally: boolean): BattlerId {
  if (ally) {
    if (id === 'player') return s.save.avatar === 'b' ? 'b_player_b' : 'b_player_a';
    return (env.idx.ally.get(id)?.battler ?? 'b_player_a') as BattlerId;
  }
  return (env.idx.enemy.get(id)?.battler ?? 'b_nishachara') as BattlerId;
}

/** Fit a label into `max` characters, cutting at a word boundary (never mid-word unless it is one long word). */
function fitName(name: string, max: number): string {
  if (name.length <= max) return name;
  const words = name.split(/\s+/);
  let out = '';
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > max) break;
    out = next;
  }
  return out || name.slice(0, max);
}

function hpColor(f: number): string {
  return f > 0.5 ? 'rgb(96,212,104)' : f > 0.2 ? 'rgb(240,200,64)' : 'rgb(232,72,64)';
}

function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(250,240,220,0.95)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgb(58,40,34)';
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  ctx.fillStyle = 'rgba(58,40,34,0.25)';
  ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
}

function drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hp: number, max: number): void {
  const f = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  ctx.fillStyle = 'rgb(58,40,34)';
  ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = 'rgb(90,72,64)';
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = hpColor(f);
  ctx.fillRect(x, y, Math.round(w * f), 3);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x, y, Math.round(w * f), 1);
}

function burst(v: Vis, x: number, y: number, color: string, n: number, shape: Particle['shape'], now: number, opts: { up?: boolean; speed?: number } = {}): void {
  const r = v.rng;
  for (let i = 0; i < n; i++) {
    const ang = opts.up ? -Math.PI / 2 + (r.next() - 0.5) * 1.2 : r.next() * Math.PI * 2;
    const sp = (opts.speed ?? 60) * (0.4 + r.next() * 0.8);
    v.particles.push({
      x: x + (r.next() - 0.5) * 20,
      y: y + (r.next() - 0.5) * 16,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      g: opts.up ? -10 : 90,
      t0: now,
      life: 450 + r.next() * 400,
      color,
      size: 1 + Math.floor(r.next() * 2),
      shape,
    });
  }
}

function drawBattle(ctx: CanvasRenderingContext2D, s: GameState, env: ViewEnv, v: Vis, now: number, dt: number): void {
  const b = s.battle;
  if (!b) return;
  const t = now / 1000;
  const reduced = env.reduced;
  // new battle → reset
  if (v.battleRef !== b.spec) {
    v.battleRef = b.spec;
    v.lastBeat = null;
    v.particles = [];
    v.popups = [];
    v.hpAlly = b.ally.hp;
    v.hpFoe = b.foe.hp;
    v.foeKey = `${b.foeIndex}:${b.foe.id}`;
    v.allyKey = `${b.active}:${b.ally.id}`;
    v.enterFoe = now;
    v.enterAlly = now;
    v.leaveAlly = Infinity;
    v.faintFoe = Infinity;
    v.faintAlly = Infinity;
  }
  const foeKey = `${b.foeIndex}:${b.foe.id}`;
  if (foeKey !== v.foeKey) {
    v.foeKey = foeKey;
    v.enterFoe = now;
    v.faintFoe = Infinity;
    v.hpFoe = b.foe.hp;
  }
  const allyKey = `${b.active}:${b.ally.id}`;
  if (allyKey !== v.allyKey) {
    v.allyKey = allyKey;
    v.enterAlly = now;
    v.faintAlly = Infinity;
    v.leaveAlly = Infinity;
    v.hpAlly = b.ally.hp;
  }
  // Sanskrit shown: the pixel font (ASCII) draws no words; names, levels and numbers are DOM text (<BattleTags>)
  const saShown = env.prefs.dialogueLang !== 'en';
  const beat = b.beats[0] ?? null;
  if (beat !== v.lastBeat) {
    v.lastBeat = beat;
    if (beat?.fx) {
      const fx = beat.fx;
      const onFoe = fx.target === 'foe';
      const cx = onFoe ? FOE_X + 32 : ALLY_X + 32;
      const cy = onFoe ? FOE_Y + 32 : ALLY_Y + 32;
      const attackerEl: Element = onFoe ? b.ally.element : b.foe.element;
      const col = ELEMENT_COLOR[attackerEl] ?? ELEMENT_COLOR.none;
      if (fx.kind === 'hit') {
        if (onFoe) v.hitFoe = now;
        else v.hitAlly = now;
        if (!reduced) burst(v, cx, cy, col, fx.effective === 'super' ? 22 : 12, 'sq', now, { speed: fx.effective === 'super' ? 95 : 70 });
        if (fx.amount !== undefined) v.popups.push({ text: `-${fx.amount}`, x: cx, y: cy - 20, t0: now, color: fx.effective === 'super' ? 'rgb(255,214,90)' : 'rgb(255,255,255)' });
      } else if (fx.kind === 'heal') {
        if (!reduced) burst(v, cx, cy + 10, 'rgb(130,240,140)', 14, 'sq', now, { up: true, speed: 40 });
        if (fx.amount !== undefined) v.popups.push({ text: `+${fx.amount}`, x: cx, y: cy - 20, t0: now, color: 'rgb(130,240,140)' });
      } else if (fx.kind === 'buff') {
        if (!reduced) burst(v, cx, cy + 10, 'rgb(255,214,90)', 8, 'up', now, { up: true, speed: 36 });
      } else if (fx.kind === 'debuff') {
        if (!reduced) burst(v, cx, cy - 16, 'rgb(120,170,255)', 8, 'down', now, { speed: 20 });
      } else if (fx.kind === 'miss') {
        if (!saShown) v.popups.push({ text: 'MISS', x: cx, y: cy - 20, t0: now, color: 'rgb(220,220,220)' });
      } else if (fx.kind === 'faint') {
        if (onFoe) v.faintFoe = now;
        else v.faintAlly = now;
      } else if (fx.kind === 'swift') {
        if (!reduced) burst(v, cx, cy, 'rgb(255,226,120)', 18, 'star', now, { speed: 80 });
        if (!saShown) v.popups.push({ text: 'SWIFT!', x: cx, y: cy - 30, t0: now, color: 'rgb(255,214,90)' });
      } else if (fx.kind === 'switch') {
        v.enterAlly = now;
      } else if (fx.kind === 'flee') {
        v.leaveAlly = now;
      }
    }
  }
  // HP lerp toward the current beat's snapshot (or the fighters when no beat is pending)
  const tgtAlly = beat ? beat.allyHp : b.ally.hp;
  const tgtFoe = beat ? beat.foeHp : b.foe.hp;
  if (reduced) {
    v.hpAlly = tgtAlly;
    v.hpFoe = tgtFoe;
  } else {
    const stepA = Math.max(0.4, b.ally.maxHp * 1.6) * (dt / 1000);
    const stepF = Math.max(0.4, b.foe.maxHp * 1.6) * (dt / 1000);
    v.hpAlly = v.hpAlly < tgtAlly ? Math.min(tgtAlly, v.hpAlly + stepA) : Math.max(tgtAlly, v.hpAlly - stepA);
    v.hpFoe = v.hpFoe < tgtFoe ? Math.min(tgtFoe, v.hpFoe + stepF) : Math.max(tgtFoe, v.hpFoe - stepF);
  }

  env.art.drawBattleBg(ctx, b.spec.bg, t);

  // platforms
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(FOE_X + 32, FOE_Y + 62, 38, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(ALLY_X + 32, ALLY_Y + 62, 42, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // foe
  {
    const ek = reduced ? 1 : ease(clamp01((now - v.enterFoe) / 420));
    const fk = reduced ? (now >= v.faintFoe ? 1 : 0) : clamp01((now - v.faintFoe) / 520);
    const hk = (now - v.hitFoe) / 380;
    const shake = hk >= 0 && hk < 1 && !reduced ? Math.round(Math.sin(hk * 30) * 3 * (1 - hk)) : 0;
    const blink = hk >= 0 && hk < 1 && Math.floor(hk * 8) % 2 === 0;
    const bob = reduced ? 0 : Math.round(Math.sin(t * 2.2) * 1.2);
    const x = Math.round(FOE_X + (1 - ek) * 140 + shake);
    const y = FOE_Y + bob + Math.round(fk * 10);
    if (fk < 1) env.art.drawBattler(ctx, battlerFor(s, env, b.foe.id, false), x, y, { alpha: 1 - fk, flash: blink, t });
  }
  // ally
  {
    const ek = reduced ? 1 : ease(clamp01((now - v.enterAlly) / 420));
    const lk = reduced ? (now >= v.leaveAlly ? 1 : 0) : clamp01((now - v.leaveAlly) / 400);
    const fk = reduced ? (now >= v.faintAlly ? 1 : 0) : clamp01((now - v.faintAlly) / 520);
    const hk = (now - v.hitAlly) / 380;
    const shake = hk >= 0 && hk < 1 && !reduced ? Math.round(Math.sin(hk * 30) * 3 * (1 - hk)) : 0;
    const blink = hk >= 0 && hk < 1 && Math.floor(hk * 8) % 2 === 0;
    const bob = reduced ? 0 : Math.round(Math.sin(t * 2.2 + 1.3) * 1.2);
    const x = Math.round(ALLY_X - (1 - ek) * 140 - lk * 160 + shake);
    const y = ALLY_Y + bob + Math.round(fk * 10);
    // an exhausted hero waiting to be switched out is drawn dimmed
    const out = b.ally.hp <= 0 && !b.beats.length ? 0.35 : 1;
    if (fk < 1 && lk < 1) env.art.drawBattler(ctx, battlerFor(s, env, b.ally.id, true), x, y, { flip: true, alpha: (1 - fk) * out, flash: blink, t });
  }

  // particles
  const live: Particle[] = [];
  for (const p of v.particles) {
    const age = now - p.t0;
    if (age > p.life) continue;
    live.push(p);
    const sec = age / 1000;
    const x = p.x + p.vx * sec;
    const y = p.y + p.vy * sec + 0.5 * p.g * sec * sec;
    const a = 1 - age / p.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    const px = Math.round(x);
    const py = Math.round(y);
    if (p.shape === 'star') {
      ctx.fillRect(px - 1, py, 3, 1);
      ctx.fillRect(px, py - 1, 1, 3);
    } else if (p.shape === 'up') {
      ctx.fillRect(px, py - 2, 1, 5);
      ctx.fillRect(px - 1, py - 1, 3, 1);
    } else if (p.shape === 'down') {
      ctx.fillRect(px, py - 2, 1, 5);
      ctx.fillRect(px - 1, py + 1, 3, 1);
    } else ctx.fillRect(px, py, p.size + 1, p.size + 1);
  }
  ctx.globalAlpha = 1;
  v.particles = live;

  // info boxes (English names; the Sanskrit name is in the DOM panel)
  const foeName = asciiLabel(englishName(env.idx, env.idx.enemy.get(b.foe.id)?.nameId, b.foe.id)).toUpperCase();
  const allyDef = env.idx.ally.get(b.ally.id);
  const allyName = b.ally.id === 'player' ? asciiLabel(env.playerName || 'You').toUpperCase() : asciiLabel(englishName(env.idx, allyDef?.nameId, b.ally.id)).toUpperCase();
  const label = b.spec.kind === 'duel' ? 'RESOLVE' : 'HP';
  const ADV = 6;
  const box = (x0: number, y0: number, h: number, name: string, level: number, hp: number, max: number, showNum: boolean): void => {
    drawBox(ctx, x0, y0, 124, h);
    if (saShown) {
      drawHpBar(ctx, x0 + 5, y0 + 19, 124 - 11, hp, max);
      return;
    }
    const lv = `LV${level}`;
    const maxChars = Math.floor((124 - 12 - lv.length * ADV - 4) / ADV);
    env.art.drawText(ctx, fitName(name, maxChars), x0 + 5, y0 + 4, 'rgb(58,40,34)');
    env.art.drawText(ctx, lv, x0 + 124 - 5 - lv.length * ADV, y0 + 4, 'rgb(58,40,34)');
    env.art.drawText(ctx, label, x0 + 5, y0 + 17, 'rgb(150,90,40)');
    const bx = x0 + 5 + label.length * ADV + 3;
    drawHpBar(ctx, bx, y0 + 19, x0 + 124 - 6 - bx, hp, max);
    if (showNum) {
      const txt = `${Math.max(0, Math.round(hp))}/${max}`;
      env.art.drawText(ctx, txt, x0 + 124 - 5 - txt.length * ADV, y0 + 29, 'rgb(58,40,34)');
    }
  };
  box(6, 8, 30, foeName, b.foe.level, v.hpFoe, b.foe.maxHp, false);
  box(190, 128, 42, allyName, b.ally.level, v.hpAlly, b.ally.maxHp, true);

  // damage numbers
  const keep: Popup[] = [];
  for (const p of v.popups) {
    const age = (now - p.t0) / 900;
    if (age >= 1) continue;
    keep.push(p);
    const y = Math.round(p.y - ease(age) * 14);
    const x = Math.round(p.x - p.text.length * 3);
    ctx.globalAlpha = age > 0.7 ? (1 - age) / 0.3 : 1;
    if (saShown && env.script === 'deva') {
      // damage numbers in Devanagari digits (the pixel font is ASCII only)
      const txt = toDevaDigits(p.text);
      ctx.font = 'bold 11px sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgb(20,12,16)';
      ctx.fillText(txt, p.x + 1, y - 1);
      ctx.fillStyle = p.color;
      ctx.fillText(txt, p.x, y - 2);
      ctx.textAlign = 'start';
    } else {
      env.art.drawText(ctx, p.text, x + 1, y + 1, 'rgb(20,12,16)');
      env.art.drawText(ctx, p.text, x, y, p.color);
    }
    ctx.globalAlpha = 1;
  }
  v.popups = keep;
}
