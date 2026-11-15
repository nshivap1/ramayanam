/**
 * v0.6 WP0: drawing the effects kit (logic-stage.ts) — on the map (view-screen) and on a told cutscene's stage
 * (view-told). OWNER: WP0 / orchestrator. Canvas only, no React.
 *
 * A `KitView` remembers what the stage looked like and when each change began, so a fall, a rise, a growth or a prop's
 * glide animates; timed effects (shake, flash, petals, rain, glow, arrow) are added with `addKitFx`. Every drawing has
 * a reduced-motion path (no movement, no strobe): a fall / rise / growth / glide is shown at once, petals and rain are a
 * still scatter, the arrow's whole line shows, a glow is a steady outline, a flash is a soft fade, there is no shake.
 * `kitActive` names what is on screen now (mirrored on the canvas as data-kit for the browser tests).
 */
import type { Art } from './art';
import type { SpriteId } from './catalog';
import type { Dir, EmoteIcon, GlowColor, KitScreenFx, StageState, TintColor } from './types';

/** ms of a fall / rise, a growth and a prop's default glide. */
export const FALL_MS = 380;
export const GROW_MS = 800;
export const GLIDE_MS = 600;

export type KitFxView = {
  name: KitScreenFx | 'glow' | 'arrow' | 'emote' | 'hop';
  at: number;
  ms: number;
  rect?: { x: number; y: number; w: number; h: number };
  path?: { x: number; y: number }[];
  /** v0.6.1: a glow's look; an emote's figure and picture; a hop's figures and count */
  color?: GlowColor;
  id?: string;
  icon?: EmoteIcon;
  ids?: string[];
  n?: number;
};

/** v0.6.1: a kit fx (from GameState.fx or a cutscene step) as the view keeps it. */
export function kitFxView(f: { name: KitFxView['name']; ms: number; at?: { x: number; y: number; w: number; h: number }; path?: { x: number; y: number }[]; color?: GlowColor; id?: string; icon?: EmoteIcon; ids?: string[]; n?: number }): Omit<KitFxView, 'at'> {
  return {
    name: f.name,
    ms: f.ms,
    ...(f.at ? { rect: f.at } : {}),
    ...(f.path ? { path: f.path } : {}),
    ...(f.color ? { color: f.color } : {}),
    ...(f.id ? { id: f.id } : {}),
    ...(f.icon ? { icon: f.icon } : {}),
    ...(f.ids ? { ids: f.ids } : {}),
    ...(f.n ? { n: f.n } : {}),
  };
}

export interface KitView {
  /** the stage last seen (null: none) */
  last: StageState | null;
  /** per id: the fall (down) or rise began at `at` */
  fall: Map<string, { at: number; down: boolean }>;
  grow: Map<string, { at: number; from: number; to: number }>;
  glide: Map<string, { at: number; fromX: number; fromY: number; ms: number }>;
  tint: { color: Exclude<TintColor, 'none'> | null; at: number; prev: Exclude<TintColor, 'none'> | null };
  fx: KitFxView[];
}

export function createKitView(): KitView {
  return { last: null, fall: new Map(), grow: new Map(), glide: new Map(), tint: { color: null, at: -1e9, prev: null }, fx: [] };
}

/** Forget everything (a new map / a new cutscene). */
export function resetKitView(v: KitView): void {
  v.last = null;
  v.fall.clear();
  v.grow.clear();
  v.glide.clear();
  v.tint = { color: null, at: -1e9, prev: null };
  v.fx = [];
}

/** Compare the stage with the last one seen and start the animations of what changed. `glideMs`: per prop id, optional. */
export function syncKitView(v: KitView, stage: StageState | undefined | null, now: number, glideMs?: (id: string) => number | undefined): void {
  const prev = v.last;
  const cur = stage ?? null;
  if (prev === cur) return;
  const pDown = new Set(prev?.down ?? []);
  const cDown = new Set(cur?.down ?? []);
  for (const id of cDown) if (!pDown.has(id)) v.fall.set(id, { at: now, down: true });
  for (const id of pDown) if (!cDown.has(id)) v.fall.set(id, { at: now, down: false });
  const ids = new Set([...Object.keys(prev?.scale ?? {}), ...Object.keys(cur?.scale ?? {})]);
  for (const id of ids) {
    const a = prev?.scale[id] ?? 1;
    const b = cur?.scale[id] ?? 1;
    if (a !== b) v.grow.set(id, { at: now, from: currentScale(v, id, now, a), to: b });
  }
  for (const [id, p] of Object.entries(cur?.props ?? {})) {
    const q = prev?.props[id];
    if (q && !p.carry && !q.carry && (q.x !== p.x || q.y !== p.y)) v.glide.set(id, { at: now, fromX: q.x, fromY: q.y, ms: glideMs?.(id) ?? p.ms ?? GLIDE_MS });
  }
  const t = cur?.tint ?? null;
  if (t !== v.tint.color) v.tint = { color: t, at: now, prev: v.tint.color };
  v.last = cur;
}

/** Add a timed effect (from a 'kit' fx or a cutscene step). */
export function addKitFx(v: KitView, f: Omit<KitFxView, 'at'>, now: number): void {
  v.fx = [...v.fx.filter((x) => now - x.at < x.ms), { ...f, at: now }];
}

const ease = (k: number): number => 1 - (1 - k) * (1 - k);
const clamp01 = (k: number): number => (k < 0 ? 0 : k > 1 ? 1 : k);

/** 0 standing … 1 lying for a figure / prop id. */
export function fallK(v: KitView, id: string, now: number, reduced: boolean): number {
  const f = v.fall.get(id);
  const down = v.last?.down.includes(id) ?? false;
  if (!f || reduced) return down ? 1 : 0;
  const k = ease(clamp01((now - f.at) / FALL_MS));
  return f.down ? k : 1 - k;
}

function currentScale(v: KitView, id: string, now: number, fallback: number): number {
  const g = v.grow.get(id);
  if (!g) return fallback;
  const k = ease(clamp01((now - g.at) / GROW_MS));
  return g.from + (g.to - g.from) * k;
}

/** The sprite scale of an id now (1 = normal). */
export function scaleK(v: KitView, id: string, now: number, reduced: boolean): number {
  const target = v.last?.scale[id] ?? 1;
  return reduced ? target : currentScale(v, id, now, target);
}

/** Where a prop is drawn now (tiles; a glide in progress interpolates). */
export function propAt(v: KitView, id: string, x: number, y: number, now: number, reduced: boolean): { x: number; y: number } {
  const g = v.glide.get(id);
  if (!g || reduced) return { x, y };
  const k = ease(clamp01((now - g.at) / Math.max(1, g.ms)));
  return { x: g.fromX + (x - g.fromX) * k, y: g.fromY + (y - g.fromY) * k };
}

/**
 * Draw a figure with the kit's fall and scale: (px, py) = the top-left of the tile it stands on (the sprite reaches 8 px
 * above it, its feet at py + 16); it falls about its feet toward the side it faces, and grows from its feet.
 */
export function drawKitFigure(ctx: CanvasRenderingContext2D, art: Art, sprite: SpriteId, px: number, py: number, facing: Dir, frame: 0 | 1 | 2, fall: number, scale: number): void {
  if (fall <= 0 && scale === 1) {
    art.drawSprite(ctx, sprite, px, py, facing, frame);
    return;
  }
  ctx.save();
  ctx.translate(px + 8, py + 16);
  if (scale !== 1) ctx.scale(scale, scale);
  if (fall > 0) {
    const side = facing === 'left' ? -1 : 1;
    // lying on the ground: the pivot moves a little so the body rests on the tile, not beside it
    ctx.translate(side * 4 * fall, -2 * fall);
    ctx.rotate(side * (Math.PI / 2) * fall);
  }
  art.drawSprite(ctx, sprite, -8, -16, facing, fall > 0 ? 0 : frame);
  ctx.restore();
}

/** Draw a prop (16 × 16 tile frame at px, py) with the kit's fall and scale. */
export function drawKitProp(ctx: CanvasRenderingContext2D, art: Art, sprite: string, px: number, py: number, t: number, fall: number, scale: number): void {
  if (fall <= 0 && scale === 1) {
    art.drawProp(ctx, sprite, px, py, t);
    return;
  }
  ctx.save();
  ctx.translate(px + 8, py + 16);
  if (scale !== 1) ctx.scale(scale, scale);
  if (fall > 0) ctx.rotate((Math.PI / 2) * fall);
  art.drawProp(ctx, sprite, -8, -16, t);
  ctx.restore();
}

/** The canvas offset of an active shake (none with reduced motion). */
export function kitShake(v: KitView, now: number, reduced: boolean): { x: number; y: number } {
  if (reduced) return { x: 0, y: 0 };
  let a = 0;
  for (const f of v.fx) if (f.name === 'shake' && now >= f.at && now - f.at < f.ms) a = Math.max(a, 3 * (1 - (now - f.at) / f.ms));
  return a ? { x: Math.round(Math.sin(now / 18) * a), y: Math.round(Math.cos(now / 23) * a * 0.6) } : { x: 0, y: 0 };
}

/** v0.6.1: how far (px, upward) a figure is lifted by a hop now (0 with reduced motion). */
export function hopY(v: KitView, id: string, now: number, reduced: boolean): number {
  if (reduced) return 0;
  let y = 0;
  for (const f of v.fx) {
    if (f.name !== 'hop' || !f.ids?.includes(id) || now < f.at || now - f.at >= f.ms) continue;
    const n = f.n ?? 1;
    const k = ((now - f.at) / f.ms) * n;
    const ph = k - Math.floor(k);
    y = Math.max(y, Math.sin(ph * Math.PI) * 6);
  }
  return Math.round(y);
}

/**
 * v0.6.1: draw the emote bubbles. `where(id)` gives a figure's canvas top-left (px) now, or null (then the tile the
 * emote was given at is used, through `tile`). A bubble pops in, floats up 2 px and fades at the end; reduced motion:
 * it simply shows.
 */
export function drawEmotes(ctx: CanvasRenderingContext2D, v: KitView, now: number, reduced: boolean, where: (id: string) => { x: number; y: number; scale?: number } | null, tile: (x: number, y: number) => { x: number; y: number }): void {
  for (const f of v.fx) {
    if (f.name !== 'emote' || !f.icon || now < f.at || now - f.at >= f.ms) continue;
    const el = now - f.at;
    const pos: { x: number; y: number; scale?: number } | null = (f.id ? where(f.id) : null) ?? (f.rect ? tile(f.rect.x, f.rect.y) : null);
    if (!pos) continue;
    const sc = pos.scale ?? 1;
    const pop = reduced ? 1 : Math.min(1, el / 120);
    const rise = reduced ? 0 : Math.round(Math.min(1, el / 400) * 2);
    const fade = Math.min(1, (f.ms - el) / 250);
    const bx = Math.round(pos.x) + 1;
    const by = Math.round(pos.y + 16 - 24 * sc) - 15 - rise;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    if (pop < 1) {
      ctx.translate(bx + 7, by + 11);
      ctx.scale(pop, pop);
      ctx.translate(-(bx + 7), -(by + 11));
    }
    drawEmoteBubble(ctx, bx, by, f.icon, reduced ? 0 : el);
    ctx.restore();
  }
}

const EMOTE_PX: Record<EmoteIcon, { rows: string[]; colors: Record<string, string> }> = {
  music: { rows: ['...##...', '...#.#..', '...#..#.', '...#....', '.###....', '####....', '.##.....'], colors: { '#': '#3a2822' } },
  heart: { rows: ['........', '.##.##..', '#######.', '#######.', '.#####..', '..###...', '...#....'], colors: { '#': '#d2384a' } },
  tears: { rows: ['..#...#.', '..#...#.', '.###.###', '.###.###', '.###.###', '..#...#.', '........'], colors: { '#': '#4a8fd8' } },
  exclaim: { rows: ['...##...', '...##...', '...##...', '...##...', '........', '...##...', '...##...'], colors: { '#': '#d2384a' } },
  question: { rows: ['..####..', '.##..##.', '.....##.', '....##..', '...##...', '........', '...##...'], colors: { '#': '#3a2822' } },
  anger: { rows: ['.#....#.', '..#..#..', '#......#', '........', '#......#', '..#..#..', '.#....#.'], colors: { '#': '#d2384a' } },
  dots: { rows: ['........', '........', '........', '#..#..#.', '........', '........', '........'], colors: { '#': '#3a2822' } },
  sleep: { rows: ['..###...', '.##.....', '##....*.', '##...***', '##....*.', '.##.....', '..###...'], colors: { '#': '#3c5aa8', '*': '#e0a838' } },
  sparkle: { rows: ['...#....', '...#....', '.#####..', '#######.', '.#####..', '...#....', '...#....'], colors: { '#': '#e0a838' } },
};

/** A 16 × 13 picture bubble with its tail at the bottom left; `el` ms animates a few pictures (0 = still). */
function drawEmoteBubble(ctx: CanvasRenderingContext2D, x: number, y: number, icon: EmoteIcon, el: number): void {
  ctx.fillStyle = 'rgb(58,40,34)';
  ctx.fillRect(x - 1, y, 16, 11);
  ctx.fillRect(x, y - 1, 14, 13);
  ctx.fillRect(x + 3, y + 12, 3, 2);
  ctx.fillStyle = 'rgb(255,250,236)';
  ctx.fillRect(x, y, 14, 11);
  ctx.fillRect(x + 4, y + 11, 1, 1);
  const art = EMOTE_PX[icon];
  // the dots appear one by one; tears fall a little; the heart beats; the sparkle twinkles
  const shown = icon === 'dots' && el > 0 ? Math.min(3, 1 + Math.floor(el / 280)) : 3;
  const dy = icon === 'tears' && el > 0 ? Math.floor(el / 220) % 2 : 0;
  for (let r = 0; r < art.rows.length; r++) {
    const row = art.rows[r]!;
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]!;
      if (ch === '.') continue;
      if (icon === 'dots' && Math.floor(c / 3) >= shown) continue;
      if (icon === 'sparkle' && el > 0 && (r === 0 || r === 6 || c === 0 || c === 6) && Math.floor(el / 200) % 2) continue;
      ctx.fillStyle = art.colors[ch] ?? '#3a2822';
      ctx.fillRect(x + 3 + c, y + 2 + r + (icon === 'tears' && r >= 2 ? dy : 0), 1, 1);
    }
  }
  if (icon === 'heart' && el > 0 && Math.floor(el / 300) % 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(x + 5, y + 4, 1, 1);
  }
}

/** The effects on screen now (names, sorted; the tint as tint:<colour>). */
export function kitActive(v: KitView, now: number): string[] {
  const out = new Set<string>();
  for (const f of v.fx) if (now >= f.at && now - f.at < f.ms) out.add(f.name);
  if (v.tint.color) out.add(`tint:${v.tint.color}`);
  return [...out].sort();
}

const TINT_RGBA: Record<Exclude<TintColor, 'none'>, [number, number, number, number]> = {
  gold: [255, 196, 90, 0.2],
  red: [200, 40, 30, 0.22],
  night: [10, 12, 52, 0.38],
  dawn: [255, 160, 170, 0.2],
  sea: [40, 120, 170, 0.22],
};

/** A small deterministic hash (petal / raindrop placement). */
function h(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Draw the timed effects and the tint over the stage. `tile(x, y)` maps tiles to canvas pixels (the camera); `w`, `h`
 * the canvas size. Glow and arrow are drawn in tile space; petals, rain, flash and tint cover the screen.
 */
export function drawKitFx(ctx: CanvasRenderingContext2D, v: KitView, now: number, reduced: boolean, tile: (x: number, y: number) => { x: number; y: number }, w = 320, hh = 180): void {
  v.fx = v.fx.filter((f) => now - f.at < f.ms + 50);
  for (const f of v.fx) {
    const k = clamp01((now - f.at) / Math.max(1, f.ms));
    if (now < f.at) continue;
    if (f.name === 'glow' && f.rect && f.color === 'fire') drawFlames(ctx, tile(f.rect.x, f.rect.y), f.rect.w * 16, f.rect.h * 16, now - f.at, f.ms, reduced);
    else if (f.name === 'glow' && f.rect) drawGlowRect(ctx, tile(f.rect.x, f.rect.y), f.rect.w * 16, f.rect.h * 16, now, reduced, 1 - k * k);
    else if (f.name === 'arrow' && f.path && f.path.length >= 2) drawArrow(ctx, f.path.map((p) => tile(p.x + 0.5, p.y + 0.5)), k, reduced);
    else if (f.name === 'petals') drawFall(ctx, now - f.at, f.ms, reduced, 'petals', w, hh);
    else if (f.name === 'rain') drawFall(ctx, now - f.at, f.ms, reduced, 'rain', w, hh);
    else if (f.name === 'wind') drawWind(ctx, now - f.at, f.ms, reduced, w, hh);
    else if (f.name === 'smoke') drawSmoke(ctx, now - f.at, f.ms, reduced, w, hh);
    else if (f.name === 'birds') drawBirds(ctx, now - f.at, f.ms, reduced, w, hh);
    else if (f.name === 'embers') drawEmbers(ctx, now - f.at, f.ms, reduced, w, hh);
    else if (f.name === 'dust') drawDust(ctx, now - f.at, f.ms, reduced, w, hh);
    else if (f.name === 'rays') drawRays(ctx, now - f.at, f.ms, reduced, w, hh);
    else if (f.name === 'lamps') drawLamps(ctx, now - f.at, f.ms, reduced, w, hh);
  }
  // the tint fades in (and out) over 600 ms; at once with reduced motion
  const tk = reduced ? 1 : clamp01((now - v.tint.at) / 600);
  const paint = (c: Exclude<TintColor, 'none'> | null, a: number): void => {
    if (!c || a <= 0) return;
    const [r, g, b, al] = TINT_RGBA[c];
    ctx.fillStyle = `rgba(${r},${g},${b},${al * a})`;
    ctx.fillRect(0, 0, w, hh);
  };
  paint(v.tint.color, tk);
  if (tk < 1) paint(v.tint.prev, 1 - tk);
  // the flash last, over everything
  for (const f of v.fx) {
    if (f.name !== 'flash' || now < f.at) continue;
    const k = clamp01((now - f.at) / Math.max(1, f.ms));
    if (k >= 1) continue;
    ctx.fillStyle = `rgba(255,255,255,${(1 - k) * (reduced ? 0.35 : 0.85)})`;
    ctx.fillRect(0, 0, w, hh);
  }
}

/** A tile shimmer: a pulsing gold border with sparkles (reduced motion: a steady outline). */
export function drawGlowRect(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, w: number, hh: number, now: number, reduced: boolean, alpha = 1): void {
  const pulse = reduced ? 0.7 : 0.45 + 0.35 * Math.sin(now / 160);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.strokeStyle = `rgba(255,224,130,${pulse})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(p.x) + 0.5, Math.round(p.y) + 0.5, w - 1, hh - 1);
  ctx.fillStyle = `rgba(255,236,170,${pulse * 0.25})`;
  ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y) + 1, w - 2, hh - 2);
  if (!reduced) {
    for (let i = 0; i < 3; i++) {
      const t = (now / 700 + i / 3) % 1;
      const sx = Math.round(p.x + h(i, 1) * (w - 2) + 1);
      const sy = Math.round(p.y + hh - 2 - t * (hh - 2));
      ctx.fillStyle = `rgba(255,250,210,${1 - t})`;
      ctx.fillRect(sx, sy, 1, 1);
    }
  }
  ctx.restore();
}

/** A golden streak along a polyline (canvas px), its head at `k` of the way; reduced motion: the whole line, fading. */
function drawArrow(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], k: number, reduced: boolean): void {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    seg.push(d);
    total += d;
  }
  const at = (dist: number): { x: number; y: number } => {
    let d = Math.max(0, Math.min(total, dist));
    for (let i = 0; i < seg.length; i++) {
      const s = seg[i]!;
      if (d <= s || i === seg.length - 1) {
        const q = s > 0 ? d / s : 1;
        return { x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * q, y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * q };
      }
      d -= s;
    }
    return pts[pts.length - 1]!;
  };
  ctx.save();
  if (reduced) {
    ctx.strokeStyle = `rgba(255,214,90,${0.8 * (1 - k)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const head = at(total * Math.min(1, k * 1.15));
  const tail = at(total * Math.min(1, k * 1.15) - 28);
  const g = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
  g.addColorStop(0, 'rgba(255,214,90,0)');
  g.addColorStop(1, 'rgba(255,240,170,1)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(Math.round(head.x) - 1, Math.round(head.y) - 1, 2, 2);
  if (k * 1.15 >= 1) {
    // the strike: a small burst at the end
    const b = Math.min(1, (k * 1.15 - 1) / 0.15);
    const end = pts[pts.length - 1]!;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.fillStyle = `rgba(255,220,140,${1 - b})`;
      ctx.fillRect(Math.round(end.x + Math.cos(a) * 6 * b), Math.round(end.y + Math.sin(a) * 6 * b), 1, 1);
    }
  }
  ctx.restore();
}

/** Petals or rain over the whole screen for `ms` (fading in and out); reduced motion: a still scatter. */
function drawFall(ctx: CanvasRenderingContext2D, el: number, ms: number, reduced: boolean, kind: 'petals' | 'rain', w: number, hh: number): void {
  const fade = Math.min(1, el / 300, (ms - el) / 500);
  if (fade <= 0) return;
  const n = kind === 'petals' ? 34 : 60;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x0 = h(i, 3) * w;
    const speed = kind === 'petals' ? 18 + h(i, 5) * 22 : 160 + h(i, 6) * 80;
    const y = reduced ? h(i, 4) * hh : ((h(i, 4) * hh + (el / 1000) * speed) % (hh + 10)) - 5;
    const x = reduced ? x0 : kind === 'petals' ? x0 + Math.sin(el / 600 + i) * 8 : x0 - ((el / 1000) * speed * 0.25) % w;
    const xx = ((x % w) + w) % w;
    if (kind === 'petals') {
      ctx.fillStyle = i % 3 === 0 ? `rgba(255,255,255,${0.85 * fade})` : i % 3 === 1 ? `rgba(255,170,200,${0.9 * fade})` : `rgba(255,214,90,${0.85 * fade})`;
      ctx.fillRect(Math.round(xx), Math.round(y), 2, i % 2 ? 1 : 2);
    } else {
      ctx.fillStyle = `rgba(170,200,230,${0.55 * fade})`;
      if (reduced) ctx.fillRect(Math.round(xx), Math.round(y), 1, 2);
      else ctx.fillRect(Math.round(xx), Math.round(y), 1, 4);
    }
  }
  if (kind === 'rain') {
    ctx.fillStyle = `rgba(30,40,70,${0.18 * fade})`;
    ctx.fillRect(0, 0, w, hh);
  }
  ctx.restore();
}

// ───────────────────────── v0.6.1: more screen effects (notes/v061-animations.md) ─────────────────────────

/** 0 → 1 over the first `a` ms, 1 → 0 over the last `b` ms. */
function envelope(el: number, ms: number, a = 300, b = 500): number {
  return Math.max(0, Math.min(1, el / a, (ms - el) / b));
}

/** Wind: pale streaks and a few leaves blowing across (reduced motion: a few still streaks). */
function drawWind(ctx: CanvasRenderingContext2D, el: number, ms: number, reduced: boolean, w: number, hh: number): void {
  const fade = envelope(el, ms);
  if (fade <= 0) return;
  ctx.save();
  for (let i = 0; i < 22; i++) {
    const y = Math.round(h(i, 11) * hh);
    const len = 10 + Math.round(h(i, 12) * 22);
    const sp = 260 + h(i, 13) * 220;
    const x = reduced ? h(i, 14) * w : ((h(i, 14) * (w + 60) + (el / 1000) * sp) % (w + 60)) - 40;
    ctx.fillStyle = `rgba(240,244,255,${0.35 * fade})`;
    ctx.fillRect(Math.round(x), y, len, 1);
  }
  for (let i = 0; i < 10; i++) {
    const sp = 150 + h(i, 15) * 90;
    const x = reduced ? h(i, 16) * w : ((h(i, 16) * (w + 40) + (el / 1000) * sp) % (w + 40)) - 20;
    const y = reduced ? h(i, 17) * hh : h(i, 17) * hh + Math.sin(el / 180 + i) * 6;
    ctx.fillStyle = i % 2 ? `rgba(120,150,60,${0.9 * fade})` : `rgba(170,120,60,${0.9 * fade})`;
    ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
    ctx.fillRect(Math.round(x) + 1, Math.round(y) + 1, 1, 1);
  }
  ctx.restore();
}

/** Smoke: dark wisps rising from below and a dim veil (reduced motion: the veil and still wisps). */
function drawSmoke(ctx: CanvasRenderingContext2D, el: number, ms: number, reduced: boolean, w: number, hh: number): void {
  const fade = envelope(el, ms, 500, 800);
  if (fade <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(28,22,40,${0.28 * fade})`;
  ctx.fillRect(0, 0, w, hh);
  for (let i = 0; i < 16; i++) {
    const x0 = h(i, 21) * w;
    const sp = 14 + h(i, 22) * 16;
    const y = reduced ? h(i, 23) * hh : hh + 10 - (((el / 1000) * sp + h(i, 23) * (hh + 30)) % (hh + 30));
    const x = reduced ? x0 : x0 + Math.sin(el / 700 + i) * 6;
    const r = 5 + Math.round(h(i, 24) * 6);
    ctx.fillStyle = `rgba(52,44,66,${0.35 * fade})`;
    ctx.fillRect(Math.round(x - r), Math.round(y - r / 2), r * 2, r);
    ctx.fillRect(Math.round(x - r / 2), Math.round(y - r), r, r * 2);
  }
  ctx.restore();
}

/** Birds: a small flock flapping across the sky, low left to high right (reduced motion: the flock, still). */
function drawBirds(ctx: CanvasRenderingContext2D, el: number, ms: number, reduced: boolean, w: number, hh: number): void {
  const fade = envelope(el, ms, 150, 300);
  if (fade <= 0) return;
  const k = reduced ? 0.5 : el / ms;
  ctx.save();
  ctx.fillStyle = `rgba(40,30,30,${0.9 * fade})`;
  for (let i = 0; i < 9; i++) {
    const ox = (i % 3) * 9 + h(i, 31) * 6 - (i > 2 ? 6 : 0) * Math.floor(i / 3);
    const oy = Math.floor(i / 3) * 6 + h(i, 32) * 4;
    const x = Math.round(-30 + k * (w + 60) + ox);
    const y = Math.round(hh * 0.62 - k * hh * 0.5 + oy);
    const up = reduced ? true : Math.floor(el / 120 + i) % 2 === 0;
    ctx.fillRect(x, y, 1, 1);
    if (up) {
      ctx.fillRect(x - 2, y - 1, 2, 1);
      ctx.fillRect(x + 1, y - 1, 2, 1);
    } else {
      ctx.fillRect(x - 2, y + 1, 2, 1);
      ctx.fillRect(x + 1, y + 1, 2, 1);
    }
  }
  ctx.restore();
}

/** Embers: sparks rising over a warm glow from below (reduced motion: the glow and still sparks). */
function drawEmbers(ctx: CanvasRenderingContext2D, el: number, ms: number, reduced: boolean, w: number, hh: number): void {
  const fade = envelope(el, ms);
  if (fade <= 0) return;
  ctx.save();
  const g = ctx.createLinearGradient(0, hh, 0, hh * 0.4);
  g.addColorStop(0, `rgba(255,120,40,${0.32 * fade})`);
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, hh);
  for (let i = 0; i < 40; i++) {
    const x0 = h(i, 41) * w;
    const sp = 30 + h(i, 42) * 50;
    const y = reduced ? h(i, 43) * hh : hh + 4 - (((el / 1000) * sp + h(i, 43) * hh) % (hh + 8));
    const x = reduced ? x0 : x0 + Math.sin(el / 300 + i * 1.7) * 3;
    const flick = reduced ? 1 : 0.5 + 0.5 * Math.sin(el / 70 + i * 3);
    ctx.fillStyle = i % 3 ? `rgba(255,190,70,${(0.6 + 0.4 * flick) * fade})` : `rgba(255,110,40,${(0.6 + 0.4 * flick) * fade})`;
    ctx.fillRect(Math.round(x), Math.round(y), 1, i % 4 ? 1 : 2);
  }
  ctx.restore();
}

/** Dust: a brown haze, falling grit and a few small stones (reduced motion: the haze and still grit). */
function drawDust(ctx: CanvasRenderingContext2D, el: number, ms: number, reduced: boolean, w: number, hh: number): void {
  const fade = envelope(el, ms, 150, 700);
  if (fade <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(150,110,70,${0.2 * fade})`;
  ctx.fillRect(0, 0, w, hh);
  for (let i = 0; i < 45; i++) {
    const x = h(i, 51) * w;
    const sp = 60 + h(i, 52) * 90;
    const y = reduced ? h(i, 53) * hh : ((h(i, 53) * hh + (el / 1000) * sp) % (hh + 6)) - 3;
    ctx.fillStyle = `rgba(120,90,60,${0.75 * fade})`;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  for (let i = 0; i < 6; i++) {
    const x = h(i, 54) * w;
    const sp = 160 + h(i, 55) * 80;
    const y = reduced ? h(i, 56) * hh : ((h(i, 56) * hh * 0.5 + (el / 1000) * sp) % (hh + 6)) - 3;
    ctx.fillStyle = `rgba(80,64,52,${0.9 * fade})`;
    ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
  }
  ctx.restore();
}

/** Rays: shafts of golden light from above, slowly swaying (reduced motion: still shafts). */
function drawRays(ctx: CanvasRenderingContext2D, el: number, ms: number, reduced: boolean, w: number, hh: number): void {
  const fade = envelope(el, ms, 500, 900);
  if (fade <= 0) return;
  ctx.save();
  const sway = reduced ? 0 : Math.sin(el / 900) * 10;
  for (let i = 0; i < 5; i++) {
    const cx = w * (0.15 + i * 0.18) + sway;
    const top = 10 + h(i, 61) * 14;
    const bottom = 34 + h(i, 62) * 22;
    const g = ctx.createLinearGradient(0, 0, 0, hh);
    g.addColorStop(0, `rgba(255,236,170,${0.34 * fade})`);
    g.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - top / 2, 0);
    ctx.lineTo(cx + top / 2, 0);
    ctx.lineTo(cx + bottom / 2 + 30, hh);
    ctx.lineTo(cx - bottom / 2 + 30, hh);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = `rgba(255,240,190,${0.12 * fade})`;
  ctx.fillRect(0, 0, w, hh);
  ctx.restore();
}

/** Lamps: little flames twinkling across the scene, each with a halo (reduced motion: steady lights). */
function drawLamps(ctx: CanvasRenderingContext2D, el: number, ms: number, reduced: boolean, w: number, hh: number): void {
  const fade = envelope(el, ms, 600, 900);
  if (fade <= 0) return;
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const x = Math.round(h(i, 71) * w);
    const y = Math.round(18 + h(i, 72) * (hh - 30));
    const on = Math.min(1, Math.max(0, (el - h(i, 73) * 1200) / 300));
    if (on <= 0) continue;
    const flick = reduced ? 1 : 0.75 + 0.25 * Math.sin(el / 90 + i * 2.3);
    ctx.fillStyle = `rgba(255,200,90,${0.22 * fade * on * flick})`;
    ctx.fillRect(x - 3, y - 3, 7, 7);
    ctx.fillStyle = `rgba(255,236,150,${0.95 * fade * on * flick})`;
    ctx.fillRect(x, y - 1, 1, 2);
    ctx.fillStyle = `rgba(255,150,60,${0.95 * fade * on})`;
    ctx.fillRect(x, y + 1, 1, 1);
  }
  ctx.restore();
}

/** Flames over a w × hh px region (a `glow` with color "fire"); reduced motion: still flames. */
function drawFlames(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, w: number, hh: number, el: number, ms: number, reduced: boolean): void {
  const fade = envelope(el, ms, 200, 500);
  if (fade <= 0) return;
  ctx.save();
  const x0 = Math.round(p.x);
  const y0 = Math.round(p.y);
  const g = ctx.createRadialGradient(x0 + w / 2, y0 + hh * 0.7, 2, x0 + w / 2, y0 + hh * 0.7, Math.max(w, hh));
  g.addColorStop(0, `rgba(255,170,60,${0.45 * fade})`);
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x0 - w / 2, y0 - hh / 2, w * 2, hh * 2);
  const cols = Math.max(3, Math.round(w / 3));
  for (let i = 0; i < cols; i++) {
    const t = reduced ? 0.6 : 0.55 + 0.45 * Math.sin(el / 80 + i * 1.9);
    const fh = Math.round((hh * 0.55 + h(i, 81) * hh * 0.35) * t);
    const fx = x0 + Math.round(((i + 0.5) / cols) * w);
    for (let y = 0; y < fh; y++) {
      const q = y / Math.max(1, fh);
      ctx.fillStyle = q < 0.35 ? `rgba(255,90,30,${fade})` : q < 0.7 ? `rgba(255,170,50,${fade})` : `rgba(255,236,140,${fade})`;
      ctx.fillRect(fx, y0 + hh - 1 - y, q > 0.8 ? 1 : 2, 1);
    }
  }
  ctx.restore();
}
