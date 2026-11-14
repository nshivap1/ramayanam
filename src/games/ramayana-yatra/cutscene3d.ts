/**
 * v0.5b WP-E: the Āditya-hṛdayam cutscene in 3D (OWNER: WP-E). Raw WebGL 1, no dependency: one small renderer that
 * draws the battlefield before Laṅkā in the game's own pixel art — a dithered dawn sky with the rising sun at the
 * centre of the scene, the sea with the sun's glitter path, the shore, Laṅkā on Trikūṭa, Rāvaṇa's chariot far off, Rāma
 * and Agastya as 4-way pixel billboards (the sprite facing follows the camera, as in old 2.5D games), clouds and the
 * watching gods as points of light — at a low internal resolution scaled up with crisp pixels (cheap on phones).
 *
 * "Breaking the 2D plane": the live battle canvas is a plane in this world. The camera starts exactly in front of it
 * (it fills the stage, so the first frame IS the battle frame), then pulls back, lifts and rolls out of the flat view
 * while the plane folds back onto the ground and dissolves; the 3D world was there behind it all along. The return runs
 * the other way and ends on the plane, upright and opaque — the live battle frame again — before the overlay goes.
 *
 * Why WebGL and not CSS 3D: a real perspective camera that rolls and orbits, a sky and sea with per-pixel light (the
 * sun's glow, the glitter path) and depth sorting of sprites against the ground are natural in a shader and awkward with
 * preserve-3d layers; the scene is ~15 draw calls at ≈ 320 × 180–480 × 300 pixels, so a mid-range phone keeps 60 fps.
 * Fallbacks (view-cutscene.tsx): no WebGL, a lost context or reduced motion → `paintScene2D` (a still painting of the
 * same scene) with crossfades.
 *
 * Pure helpers (no DOM; unit-tested): `shotFor`, `posePath`, `framePlane`, `sunDir`. The rest needs a browser.
 */
import type { Art } from './art';
import { R } from './art-palette';
import { hash2, makeCanvas } from './art-core';
import type { CutscenePhase, CutsceneStep } from './logic-cutscene';
import type { Dir } from './types';
import type { SpriteId } from './catalog';

// ───────────────────────── small vector / matrix kit ─────────────────────────

export type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function lookAt(eye: V3, target: V3, up: V3): Float32Array {
  const z = norm(sub(eye, target));
  const x = norm(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}
function mul(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = (a[r] as number) * (b[c * 4] as number) + (a[4 + r] as number) * (b[c * 4 + 1] as number) + (a[8 + r] as number) * (b[c * 4 + 2] as number) + (a[12 + r] as number) * (b[c * 4 + 3] as number);
  return o;
}

// ───────────────────────── the set (world units ≈ metres; the sun rises in −z) ─────────────────────────

export const RAMA: V3 = [-0.9, 0, 0];
export const AGASTYA: V3 = [0.95, 0, -0.35];
export const CHARIOT: V3 = [-9, 0, -26];
const PAIR: V3 = [0, 1.0, -0.2];
const LANKA_C: V3 = [-58, 0, -118];
const SHORE_Z = -40;
/** The battle frame in the world: 16 × 9 units, bottom edge on the ground at z = −8 (it folds back about that edge). */
export const FRAME = { w: 16, h: 9, z: -8 } as const;
/** The camera that sees the frame plane exactly filling a 16:9 stage. */
const FRAME_DIST = 10;
export const FRAME_FOV = 2 * Math.atan(FRAME.h / 2 / FRAME_DIST);

export interface Pose {
  pos: V3;
  target: V3;
  fov: number;
  roll: number;
}
const deg = (d: number): number => (d * Math.PI) / 180;
export const FRAME_POSE: Pose = { pos: [0, FRAME.h / 2, FRAME.z + FRAME_DIST], target: [0, FRAME.h / 2, FRAME.z], fov: FRAME_FOV, roll: 0 };
const pose = (pos: V3, target: V3, fovDeg: number, roll = 0): Pose => ({ pos, target, fov: deg(fovDeg), roll });

/** The sun's direction: low over the sea, rising from 3° to 13° as the hymn goes on (`rise` 0..1). */
export function sunDir(rise: number): V3 {
  const e = deg(lerp(3, 13, clamp01(rise)));
  return norm([0.14, Math.sin(e), -Math.cos(e)]);
}

export type ShotId = 'wide' | 'ravana' | 'rama' | 'gods' | 'two' | 'orbit' | 'sun' | 'high' | 'resolve' | 'crane';

/**
 * The shot for a step of the follow-along: the long battle and Rāvaṇa's return look at his chariot, Rāma weary is a
 * close shot, the gods tilt to the sky, Agastya's arrival and the first verses are a two-shot with the sun between
 * them, the hymn orbits them (verses 3–15), turns to face the sun for the salutations (16–21), rises wide (22–27),
 * looks past Rāma at Rāvaṇa as he takes up his bow (28–30) and cranes up to the sun among the gods (31).
 */
export function shotFor(step: CutsceneStep | undefined): ShotId {
  if (!step) return 'crane';
  if (step.kind === 'narration') return (['wide', 'ravana', 'rama', 'gods', 'two', 'two', 'two'] as ShotId[])[step.index] ?? 'two';
  const v = step.verse;
  if (v <= 2) return 'two';
  if (v <= 15) return 'orbit';
  if (v <= 21) return 'sun';
  if (v <= 27) return 'high';
  if (v <= 30) return 'resolve';
  return 'crane';
}

/** The camera of a shot; `u` (0..1) moves it slowly inside the shot (the orbit's angle, a slow push-in). */
export function shotPose(shot: ShotId, u: number): Pose {
  const k = clamp01(u);
  switch (shot) {
    case 'wide':
      return pose(lerp3([5.5, 2.3, 9.5], [4.6, 2.1, 8.2], k), [-2.0, 2.2, -10], 50);
    case 'ravana':
      return pose(lerp3([1.6, 1.7, 3.4], [1.3, 1.6, 2.6], k), add(CHARIOT, [0, 1.2, 0]), 34);
    case 'rama':
      return pose(lerp3([1.0, 1.25, 3.0], [0.7, 1.2, 2.3], k), add(RAMA, [0, 0.95, 0]), 34);
    case 'gods':
      return pose([2.4, 1.2, 5.2], lerp3([0, 7, -20], [0, 10, -22], k), 56);
    case 'two':
      return pose(lerp3([0.4, 1.2, 4.8], [0.3, 1.1, 3.9], k), [0, 1.55, -2], 42);
    case 'orbit': {
      const th = deg(lerp(28, -38, k));
      const r = 4.6;
      return pose([PAIR[0] + Math.sin(th) * r, 1.1 + 0.3 * Math.sin(k * Math.PI), PAIR[2] + Math.cos(th) * r], [PAIR[0], 1.6, PAIR[2] - 1], 44);
    }
    case 'sun':
      return pose(lerp3([0.3, 0.6, 5.6], [0.1, 0.55, 4.8], k), [0.9, 3.2, -40], 46);
    case 'high':
      return pose(lerp3([-6.2, 3.4, 9.2], [-5.0, 3.0, 8.2], k), [0.5, 1.6, -14], 48);
    case 'resolve':
      return pose(lerp3([1.6, 1.5, 5.0], [1.2, 1.4, 4.2], k), add(CHARIOT, [0, 1.4, 0]), 38);
    case 'crane':
      return pose(lerp3([0.2, 2.0, 6.5], [0.2, 6.5, 9], k), lerp3([0.4, 2.5, -30], [0.6, 7.5, -40], k), 54);
  }
}

/**
 * The camera of the rotate phases: out of the flat view (`out`: from the frame pose to the wide shot) along an arc that
 * pulls back, lifts and rolls; in (`out` false): from `from` back to the frame pose. `k` 0..1 (eased inside).
 */
export function posePath(k: number, out: boolean, from: Pose = shotPose('wide', 0)): Pose {
  const e = easeInOut(clamp01(k));
  const a = out ? FRAME_POSE : from;
  const b = out ? shotPose('wide', 0) : FRAME_POSE;
  const arc = Math.sin(Math.PI * e);
  const pos = add(lerp3(a.pos, b.pos, e), [arc * (out ? 2.2 : -1.2), arc * 1.8, arc * 3.2]);
  return { pos, target: lerp3(a.target, b.target, e), fov: lerp(a.fov, b.fov, e), roll: arc * (out ? 0.16 : -0.1) };
}

/** The battle frame as a world plane: how far it has folded back onto the ground (radians) and its opacity. */
export function framePlane(phase: CutscenePhase, k: number): { tilt: number; alpha: number } {
  if (phase === 'flat') return { tilt: 0, alpha: 1 };
  if (phase === 'rotate-out') return { tilt: smooth(0.15, 0.9, k) * deg(84), alpha: 1 - smooth(0.3, 0.85, k) };
  if (phase === 'rotate-in') return { tilt: (1 - smooth(0.15, 0.8, k)) * deg(84), alpha: smooth(0.35, 0.92, k) };
  if (phase === 'done') return { tilt: 0, alpha: 1 };
  return { tilt: deg(84), alpha: 0 };
}

// ───────────────────────── pixel textures (generated from the game's palette and sprites) ─────────────────────────

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];

/** A character's four facings side by side (16 × 24 each), drawn by the game's sprite art. */
function spriteStrip(art: Art, id: SpriteId): HTMLCanvasElement | null {
  const c = makeCanvas(64, 24);
  const g = c?.getContext('2d');
  if (!c || !g) return null;
  g.imageSmoothingEnabled = false;
  DIRS.forEach((d, i) => {
    g.save();
    g.beginPath();
    g.rect(i * 16, 0, 16, 24);
    g.clip();
    art.drawSprite(g, id, i * 16, 8, d, 0);
    g.restore();
  });
  // the sprite art draws a soft ground shadow; the 3D scene draws its own
  return c;
}

function fill(g: CanvasRenderingContext2D, c: string, x: number, y: number, w: number, h: number): void {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

/** Laṅkā on Trikūṭa: the hill, the walls, towers with golden roofs and lit windows (palette: lanka, gold, fire). */
export function lankaCanvas(): HTMLCanvasElement | null {
  const W = 192;
  const H = 80;
  const c = makeCanvas(W, H);
  const g = c?.getContext('2d');
  if (!c || !g) return null;
  // the hill
  for (let x = 0; x < W; x++) {
    const t = x / W;
    const top = Math.round(42 - 26 * Math.sin(Math.PI * Math.pow(t, 0.9)) + 3 * Math.sin(x * 0.31) + 2 * Math.sin(x * 0.07));
    for (let y = top; y < H; y++) fill(g, y < top + 2 ? R.lanka[1] : (hash2(x, y, 7) % 7 === 0 ? R.lanka[2] : R.lanka[3]), x, y, 1, 1);
  }
  // walls and towers on the summit
  fill(g, R.lanka[2], 40, 30, 112, 8);
  for (let x = 40; x < 152; x += 4) fill(g, R.lanka[1], x, 28, 2, 2);
  const towers = [[52, 14, 8], [70, 6, 10], [92, 0, 14], [116, 8, 10], [134, 16, 8]] as const;
  for (const [x, top, w] of towers) {
    fill(g, R.lanka[1], x, top + 6, w, 32 - top);
    fill(g, R.lanka[0], x, top + 6, 1, 32 - top);
    // golden roof (a stepped dome) and a finial
    for (let i = 0; i < 4; i++) fill(g, R.gold[i === 0 ? 0 : i === 3 ? 3 : 1], x - 1 + i, top + 5 - i, w + 2 - 2 * i, 1);
    fill(g, R.gold[2], x + Math.floor(w / 2), top, 1, 2);
    // lit windows
    for (let y = top + 9; y < 30; y += 5) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (hash2(wx, y, 3) % 3) fill(g, R.fire[2], wx, y, 1, 2);
  }
  return c;
}

/** Rāvaṇa's chariot with Rāvaṇa on it (his sprite), dark and gold, its banner red. */
export function chariotCanvas(art: Art): HTMLCanvasElement | null {
  const c = makeCanvas(48, 40);
  const g = c?.getContext('2d');
  if (!c || !g) return null;
  g.imageSmoothingEnabled = false;
  // banner
  fill(g, R.wood[3], 39, 2, 1, 22);
  fill(g, R.red[1], 40, 3, 7, 4);
  fill(g, R.red[2], 40, 6, 5, 2);
  // Rāvaṇa standing in the car (sprite facing the viewer)
  g.save();
  g.beginPath();
  g.rect(14, 0, 16, 24);
  g.clip();
  art.drawSprite(g, 'ravana', 14, 6, 'down', 0);
  g.restore();
  // the car
  fill(g, R.rakshasaPurple[3], 6, 20, 34, 9);
  fill(g, R.rakshasaPurple[2], 6, 20, 34, 2);
  fill(g, R.gold[1], 6, 22, 34, 1);
  fill(g, R.gold[2], 6, 28, 34, 1);
  // wheels
  for (const wx of [12, 34]) {
    for (let a = 0; a < 24; a++) {
      const r = 7;
      const x = Math.round(wx + Math.cos((a / 24) * Math.PI * 2) * r);
      const y = Math.round(31 + Math.sin((a / 24) * Math.PI * 2) * r);
      fill(g, R.rakshasaPurple[4], x, y, 1, 1);
    }
    for (let a = 0; a < 4; a++) {
      const ang = (a / 4) * Math.PI;
      for (let s = -6; s <= 6; s++) fill(g, R.gold[2], Math.round(wx + Math.cos(ang) * s), Math.round(31 + Math.sin(ang) * s), 1, 1);
    }
    fill(g, R.gold[0], wx, 31, 1, 1);
  }
  return c;
}

/** The battlefield before Laṅkā (64 × 64, tiles): trodden earth, sandy patches, grass tufts, stones, spent arrows. */
function groundCanvas(): HTMLCanvasElement | null {
  const c = makeCanvas(64, 64);
  const g = c?.getContext('2d');
  if (!c || !g) return null;
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const h = hash2(x, y, 11) % 29;
      // soft patches of sand (low-frequency) over the earth, dithered
      const patch = Math.sin(x * 0.2 + Math.sin(y * 0.15) * 2) + Math.cos(y * 0.18 + x * 0.05) > 1.1 ? 1 : 0;
      const base = patch ? R.sand[2] : R.earth[2];
      fill(g, h === 0 ? R.earth[4] : h < 4 ? R.earth[3] : h < 9 ? (patch ? R.sand[1] : R.earth[1]) : base, x, y, 1, 1);
    }
  // grass tufts
  for (let i = 0; i < 26; i++) {
    const x = hash2(i, 1, 21) % 62;
    const y = hash2(i, 2, 21) % 62;
    fill(g, R.grass[3], x, y + 1, 1, 2);
    fill(g, R.grass[2], x + 1, y, 1, 3);
    fill(g, R.grass[4], x + 2, y + 1, 1, 2);
  }
  // stones
  for (let i = 0; i < 12; i++) {
    const x = hash2(i, 3, 23) % 62;
    const y = hash2(i, 4, 23) % 62;
    fill(g, R.rock[3], x, y, 2, 2);
    fill(g, R.rock[1], x, y, 1, 1);
  }
  // spent arrows lying on the field
  for (let i = 0; i < 5; i++) {
    const x = hash2(i, 5, 29) % 56;
    const y = hash2(i, 6, 29) % 60;
    for (let k = 0; k < 6; k++) fill(g, R.wood[2], x + k, y + (i % 2 ? Math.floor(k / 3) : 0), 1, 1);
    fill(g, R.white[1], x, y, 1, 1);
  }
  return c;
}

function cloudCanvas(): HTMLCanvasElement | null {
  const c = makeCanvas(64, 20);
  const g = c?.getContext('2d');
  if (!c || !g) return null;
  const blobs = [[14, 12, 9], [28, 9, 11], [44, 12, 9], [52, 14, 6]] as const;
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 64; x++) {
      let inside = false;
      let edge = false;
      for (const [cx, cy, r] of blobs) {
        const d = Math.hypot((x - cx) * 0.8, y - cy);
        if (d < r) inside = true;
        if (d < r && d > r - 1.6 && y < cy) edge = true;
      }
      if (inside && y < 17) fill(g, edge ? R.sand[0] : y > 13 ? R.lotus[1] : R.white[1], x, y, 1, 1);
    }
  return c;
}

function dotCanvas(color: string, size: number, round: boolean): HTMLCanvasElement | null {
  const c = makeCanvas(size, size);
  const g = c?.getContext('2d');
  if (!c || !g) return null;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!round || Math.hypot(x - (size - 1) / 2, (y - (size - 1) / 2) * 2) <= (size - 1) / 2) fill(g, color, x, y, 1, 1);
  return c;
}

// ───────────────────────── a still painting of the scene (fallback: no WebGL, lost context, reduced motion) ─────────────────────────

/**
 * The same scene as a still 2D painting at 320 × 180 (scaled up crisply by CSS): dawn sky bands, the sun, the sea and its
 * glitter, Laṅkā, the chariot, Rāma and Agastya facing each other with the sun between them.
 */
export function paintScene2D(g: CanvasRenderingContext2D, art: Art): void {
  const W = 320;
  const H = 180;
  g.imageSmoothingEnabled = false;
  const sky = [R.indigo[3], R.indigo[2], R.lotus[3], R.lotus[2], R.saffron[1], R.saffron[0]];
  const horizon = 104;
  for (let y = 0; y < horizon; y++) {
    const f = (y / horizon) * (sky.length - 1);
    const i = Math.floor(f);
    const d = hash2(y, 3, 1) % 100 < (f - i) * 100 ? 1 : 0;
    fill(g, sky[Math.min(sky.length - 1, i + d)] as string, 0, y, W, 1);
  }
  // the sun, half risen, with rays
  const sx = 176;
  for (let r = 34; r > 0; r -= 6) {
    g.globalAlpha = 0.12;
    g.fillStyle = R.gold[0];
    g.beginPath();
    g.arc(sx, horizon, r + 10, Math.PI, 0);
    g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = R.gold[0];
  g.beginPath();
  g.arc(sx, horizon, 14, Math.PI, 0);
  g.fill();
  // sea
  const sea = [R.saffron[2], R.ocean[2], R.ocean[3], R.ocean[4]];
  for (let y = horizon; y < 140; y++) fill(g, sea[Math.min(3, Math.floor(((y - horizon) / 36) * 4))] as string, 0, y, W, 1);
  for (let y = horizon + 2; y < 140; y += 3) for (let x = sx - 18 - (y - horizon); x < sx + 18 + (y - horizon); x += 5) if (hash2(x, y, 5) % 3 === 0) fill(g, R.gold[0], x, y, 3, 1);
  // Laṅkā far on the left
  const lanka = lankaCanvas();
  if (lanka) g.drawImage(lanka, 0, 0, 192, 80, -20, horizon - 46, 138, 58);
  // shore and battlefield
  for (let y = 134; y < H; y++) fill(g, y < 138 ? R.sand[1] : y < 150 ? R.earth[1] : R.earth[2], 0, y, W, 1);
  // the chariot, far
  const ch = chariotCanvas(art);
  if (ch) g.drawImage(ch, 0, 0, 48, 40, 70, 112, 36, 30);
  // Rāma and Agastya, near, facing each other
  const strip = (id: SpriteId, dir: number, x: number): void => {
    const s = spriteStrip(art, id);
    if (s) g.drawImage(s, dir * 16, 0, 16, 24, x, 120, 32, 48);
  };
  g.globalAlpha = 0.35;
  fill(g, R.earth[4], 132, 165, 26, 3);
  fill(g, R.earth[4], 196, 165, 26, 3);
  g.globalAlpha = 1;
  strip('rama', 3, 128);
  strip('agastya', 2, 192);
}

// ───────────────────────── the WebGL renderer ─────────────────────────

const VS_TEX = `attribute vec3 aPos; attribute vec2 aUv; uniform mat4 uVP; uniform vec3 uCam; varying vec2 vUv; varying float vDist;
void main(){ vUv = aUv; vDist = distance(aPos, uCam); gl_Position = uVP * vec4(aPos, 1.0); }`;
const FS_TEX = `precision mediump float; varying vec2 vUv; varying float vDist; uniform sampler2D uTex; uniform float uAlpha; uniform vec3 uTint;
uniform vec3 uFog; uniform vec2 uFogR; uniform float uCut;
void main(){ vec4 c = texture2D(uTex, vUv); if (uCut > 0.5 && c.a < 0.5) discard; vec3 col = c.rgb * uTint;
  float f = clamp((vDist - uFogR.x) / (uFogR.y - uFogR.x), 0.0, 1.0); col = mix(col, uFog, f * f);
  gl_FragColor = vec4(col, (uCut > 0.5 ? 1.0 : c.a) * uAlpha); }`;
const VS_SKY = `attribute vec3 aPos; uniform mat4 uVP; uniform vec3 uCam; varying vec3 vDir;
void main(){ vDir = aPos; vec4 p = uVP * vec4(aPos * 400.0 + uCam, 1.0); gl_Position = p.xyww; }`;
// interleaved-gradient-noise ordered dither and colour bands: the pixel-art look of the sky and the sea
const DITHER = `float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
vec3 band(vec3 c){ float n = ign(floor(gl_FragCoord.xy)); return floor(c * 14.0 + n) / 14.0; }`;
const FS_SKY = `precision mediump float; varying vec3 vDir; uniform vec3 uSun; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform vec3 uSunCol; uniform float uTime;
${DITHER}
void main(){ vec3 d = normalize(vDir); float e = d.y; vec3 col = mix(uLow, uMid, smoothstep(0.0, 0.22, e)); col = mix(col, uTop, smoothstep(0.22, 0.75, e));
  float s = max(dot(d, uSun), 0.0); col += uSunCol * (pow(s, 6.0) * 0.35 + pow(s, 40.0) * 0.55);
  float ray = 0.5 + 0.5 * sin(atan(d.x - uSun.x, d.y - uSun.y) * 18.0 + uTime * 0.3); col += uSunCol * pow(s, 14.0) * ray * 0.25;
  if (s > 0.9990) col = vec3(1.0, 0.97, 0.82); else if (s > 0.9984) col = mix(uSunCol, vec3(1.0), 0.6);
  gl_FragColor = vec4(band(col), 1.0); }`;
const VS_SEA = `attribute vec3 aPos; uniform mat4 uVP; varying vec3 vW; void main(){ vW = aPos; gl_Position = uVP * vec4(aPos, 1.0); }`;
const FS_SEA = `precision mediump float; varying vec3 vW; uniform vec3 uCam; uniform vec3 uSun; uniform float uTime; uniform vec3 uDeep; uniform vec3 uNear; uniform vec3 uFog; uniform vec3 uSunCol;
${DITHER}
void main(){ vec3 v = normalize(uCam - vW); vec2 p = vW.xz; float w1 = sin(p.x * 0.9 + uTime * 1.3 + sin(p.y * 0.4)); float w2 = sin(p.y * 1.7 - uTime * 0.9 + p.x * 0.3);
  vec3 n = normalize(vec3(w1 * 0.06, 1.0, w2 * 0.08)); vec3 r = reflect(-v, n); float s = max(dot(r, uSun), 0.0);
  float dist = distance(uCam.xz, vW.xz); vec3 col = mix(uNear, uDeep, smoothstep(10.0, 120.0, dist));
  col += uSunCol * pow(s, 60.0) * 1.4; col += uSunCol * pow(s, 8.0) * 0.18;
  col = mix(col, uFog, smoothstep(60.0, 380.0, dist)); gl_FragColor = vec4(band(col), 1.0); }`;

interface Prog {
  p: WebGLProgram;
  a: Record<string, number>;
  u: Record<string, WebGLUniformLocation | null>;
}
interface Sprite {
  tex: WebGLTexture;
  /** world position of the bottom centre */
  at: V3;
  w: number;
  h: number;
  /** a 4-way strip: the facing (yaw, radians; 0 = towards +z) picks the frame from the camera's angle */
  facing?: number;
  /** visible share 0..1 (Agastya arrives during the narration) */
  alpha?: number;
  backlit?: boolean;
  /** a blob shadow on the ground (the character sprites carry their own) */
  blob?: boolean;
}

const hexRgb = (h: string): V3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

export interface SceneCue {
  phase: CutscenePhase;
  /** progress of a rotate phase 0..1; in the scene phase, the fraction of the step on screen */
  k: number;
  /** the step of the follow-along on screen (camera shot, Agastya's arrival) and its fraction */
  step: CutsceneStep | undefined;
  /** 0..1 of the whole follow-along (the sun rises with it) */
  progress: number;
  /** wall-clock seconds for the water and the gods' lights (frozen while paused) */
  time: number;
  /** elapsed ms since the last frame (camera smoothing) */
  dt: number;
}

export interface Scene3D {
  /** Draw a frame. `frame` is the live battle canvas (its texture is refreshed while the frame plane shows). */
  render(cue: SceneCue, frame: HTMLCanvasElement | null): void;
  /** The camera now (the rotate-in starts from it). */
  readonly pose: Pose;
  readonly lost: boolean;
  dispose(): void;
}

/** A WebGL scene on `canvas`, or null when WebGL is not available (the caller paints the still instead). */
export function createScene3D(canvas: HTMLCanvasElement, art: Art, onLost: (lost: boolean) => void): Scene3D | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: true, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' }) as WebGLRenderingContext | null;
  } catch {
    gl = null;
  }
  if (!gl) return null;
  let lost = false;
  let res: ReturnType<typeof build> | null = null;
  const cam: Pose = { ...FRAME_POSE, pos: [...FRAME_POSE.pos] as V3, target: [...FRAME_POSE.target] as V3 };
  let lastFrameUpload = -1;
  /** the camera where the rotate-in began (it flies from there back to the frame) */
  let rotateFrom: Pose | null = null;

  const onLostEv = (e: Event): void => {
    e.preventDefault();
    lost = true;
    res = null;
    onLost(true);
  };
  const onRestored = (): void => {
    lost = false;
    try {
      res = build(gl as WebGLRenderingContext);
      onLost(false);
    } catch {
      res = null;
    }
  };
  canvas.addEventListener('webglcontextlost', onLostEv);
  canvas.addEventListener('webglcontextrestored', onRestored);

  function build(g: WebGLRenderingContext) {
    const shader = (type: number, src: string): WebGLShader => {
      const s = g.createShader(type);
      if (!s) throw new Error('shader');
      g.shaderSource(s, src);
      g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS) && !g.isContextLost()) throw new Error(`shader: ${g.getShaderInfoLog(s) ?? ''}`);
      return s;
    };
    const program = (vs: string, fs: string, attrs: string[], unis: string[]): Prog => {
      const p = g.createProgram();
      if (!p) throw new Error('program');
      g.attachShader(p, shader(g.VERTEX_SHADER, vs));
      g.attachShader(p, shader(g.FRAGMENT_SHADER, fs));
      g.linkProgram(p);
      if (!g.getProgramParameter(p, g.LINK_STATUS) && !g.isContextLost()) throw new Error(`link: ${g.getProgramInfoLog(p) ?? ''}`);
      const a: Record<string, number> = {};
      for (const n of attrs) a[n] = g.getAttribLocation(p, n);
      const u: Record<string, WebGLUniformLocation | null> = {};
      for (const n of unis) u[n] = g.getUniformLocation(p, n);
      return { p, a, u };
    };
    const texture = (src: TexImageSource | null, repeat = false): WebGLTexture => {
      const t = g.createTexture();
      if (!t) throw new Error('texture');
      g.bindTexture(g.TEXTURE_2D, t);
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false);
      if (src) g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, src);
      else g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, 1, 1, 0, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array([20, 14, 24, 255]));
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, repeat ? g.REPEAT : g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, repeat ? g.REPEAT : g.CLAMP_TO_EDGE);
      return t;
    };
    const buffer = (data: Float32Array, dynamic = false): WebGLBuffer => {
      const b = g.createBuffer();
      if (!b) throw new Error('buffer');
      g.bindBuffer(g.ARRAY_BUFFER, b);
      g.bufferData(g.ARRAY_BUFFER, data, dynamic ? g.DYNAMIC_DRAW : g.STATIC_DRAW);
      return b;
    };
    const tex = program(VS_TEX, FS_TEX, ['aPos', 'aUv'], ['uVP', 'uCam', 'uTex', 'uAlpha', 'uTint', 'uFog', 'uFogR', 'uCut']);
    const sky = program(VS_SKY, FS_SKY, ['aPos'], ['uVP', 'uCam', 'uSun', 'uTop', 'uMid', 'uLow', 'uSunCol', 'uTime']);
    const sea = program(VS_SEA, FS_SEA, ['aPos'], ['uVP', 'uCam', 'uSun', 'uTime', 'uDeep', 'uNear', 'uFog', 'uSunCol']);
    // sky dome (a sphere of directions; the shader colours it)
    const dome: number[] = [];
    const ring = (i: number, j: number): V3 => {
      const th = (i / 24) * Math.PI * 2;
      const ph = -0.25 + (j / 10) * (Math.PI / 2 + 0.25);
      return [Math.cos(ph) * Math.sin(th), Math.sin(ph), Math.cos(ph) * Math.cos(th)];
    };
    for (let j = 0; j < 10; j++)
      for (let i = 0; i < 24; i++) {
        const a = ring(i, j);
        const b = ring(i + 1, j);
        const c = ring(i + 1, j + 1);
        const d = ring(i, j + 1);
        dome.push(...a, ...b, ...c, ...a, ...c, ...d);
      }
    const quadXZ = (x0: number, x1: number, z0: number, z1: number, y: number): Float32Array => new Float32Array([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z0, x1, y, z1, x0, y, z1]);
    // ground with uv in world units / 8
    const gx0 = -60;
    const gx1 = 60;
    const gz0 = SHORE_Z;
    const gz1 = 30;
    const U = 8;
    const groundV = new Float32Array([gx0, 0, gz0, gx0 / U, gz0 / U, gx1, 0, gz0, gx1 / U, gz0 / U, gx1, 0, gz1, gx1 / U, gz1 / U, gx0, 0, gz0, gx0 / U, gz0 / U, gx1, 0, gz1, gx1 / U, gz1 / U, gx0, 0, gz1, gx0 / U, gz1 / U]);
    const sand = dotCanvas(R.sand[1], 4, false);
    const foam = dotCanvas(R.white[0], 4, false);
    return {
      tex,
      sky,
      sea,
      domeBuf: buffer(new Float32Array(dome)),
      domeN: dome.length / 3,
      // the sea all round (the battlefield is a strip of land in it; the shore line faces the sunrise), well below the
      // ground: a near sea and ground fight for depth on 16-bit depth buffers (and in SwiftShader)
      seaBuf: buffer(quadXZ(-600, 600, -600, 600, -0.3)),
      groundBuf: buffer(groundV),
      shoreBuf: buffer(new Float32Array([gx0, 0.03, SHORE_Z + 2.2, 0, 0, gx1, 0.03, SHORE_Z + 2.2, 1, 0, gx1, 0.03, SHORE_Z, 1, 1, gx0, 0.03, SHORE_Z + 2.2, 0, 0, gx1, 0.03, SHORE_Z, 1, 1, gx0, 0.03, SHORE_Z, 0, 1])),
      dyn: buffer(new Float32Array(6 * 5), true),
      tGround: texture(groundCanvas(), true),
      tSand: texture(sand),
      tFoam: texture(foam),
      tLanka: texture(lankaCanvas()),
      tChariot: texture(chariotCanvas(art)),
      tRama: texture(spriteStrip(art, 'rama')),
      tAgastya: texture(spriteStrip(art, 'agastya')),
      tCloud: texture(cloudCanvas()),
      tGod: texture(dotCanvas(R.gold[0], 3, false)),
      tShadow: texture(dotCanvas('#2e1a14', 8, true)),
      tFrame: texture(null),
    };
  }

  try {
    res = build(gl);
  } catch (err) {
    console.warn('[ramayana-yatra] cutscene 3D unavailable', err);
    canvas.removeEventListener('webglcontextlost', onLostEv);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    return null;
  }

  function render(cue: SceneCue, frame: HTMLCanvasElement | null): void {
    const g = gl;
    const r = res;
    if (!g || !r || lost || g.isContextLost()) return;
    const W = canvas.width;
    const H = canvas.height;
    g.viewport(0, 0, W, H);
    // ── the camera ──
    let want: Pose;
    if (cue.phase === 'flat' || cue.phase === 'done') want = FRAME_POSE;
    else if (cue.phase === 'rotate-out') want = posePath(cue.k, true);
    else if (cue.phase === 'rotate-in') want = posePath(cue.k, false, rotateFrom ?? cam);
    else {
      const sh = shotFor(cue.step);
      want = shotPose(sh, shotProgress(cue));
    }
    if (cue.phase !== 'rotate-in') rotateFrom = null;
    else if (!rotateFrom) rotateFrom = { ...cam, pos: [...cam.pos] as V3, target: [...cam.target] as V3 };
    const follow = cue.phase === 'scene' ? 1 - Math.exp(-Math.max(0, cue.dt) / 1400) : 1;
    cam.pos = lerp3(cam.pos, want.pos, follow);
    cam.target = lerp3(cam.target, want.target, follow);
    cam.fov = lerp(cam.fov, want.fov, follow);
    cam.roll = lerp(cam.roll, want.roll, follow);
    const aspect = W / Math.max(1, H);
    // a stage taller than 16:9 keeps the frame plane's width in view (the flat frame fills a 16:9 stage exactly)
    const fovY = aspect < 16 / 9 ? 2 * Math.atan(Math.tan(cam.fov / 2) * (16 / 9 / aspect)) : cam.fov;
    const fwd = norm(sub(cam.target, cam.pos));
    const right0 = norm(cross(fwd, [0, 1, 0]));
    const up: V3 = norm(add(scale(cross(right0, fwd), Math.cos(cam.roll)), scale(right0, Math.sin(cam.roll))));
    const vp = mul(perspective(fovY, aspect, 0.25, 900), lookAt(cam.pos, cam.target, up));
    const sun = sunDir(cue.progress);
    const rise = clamp01(cue.progress);
    const warm = hexRgb(R.saffron[0]);
    const sunCol: V3 = lerp3(hexRgb(R.saffron[1]), hexRgb(R.gold[0]), rise);
    const fog: V3 = lerp3(hexRgb(R.lotus[2]), hexRgb(R.saffron[0]), rise);

    g.clearColor(0.08, 0.05, 0.1, 1);
    g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
    g.disable(g.CULL_FACE);
    // ── sky ──
    g.depthMask(false);
    g.disable(g.DEPTH_TEST);
    g.useProgram(r.sky.p);
    g.bindBuffer(g.ARRAY_BUFFER, r.domeBuf);
    g.enableVertexAttribArray(r.sky.a['aPos'] as number);
    g.vertexAttribPointer(r.sky.a['aPos'] as number, 3, g.FLOAT, false, 0, 0);
    g.uniformMatrix4fv(r.sky.u['uVP'] ?? null, false, vp);
    g.uniform3fv(r.sky.u['uCam'] ?? null, cam.pos);
    g.uniform3fv(r.sky.u['uSun'] ?? null, sun);
    g.uniform3fv(r.sky.u['uTop'] ?? null, lerp3(hexRgb(R.indigo[4]), hexRgb(R.indigo[2]), rise));
    g.uniform3fv(r.sky.u['uMid'] ?? null, lerp3(hexRgb(R.lotus[3]), hexRgb(R.lotus[2]), rise));
    g.uniform3fv(r.sky.u['uLow'] ?? null, lerp3(hexRgb(R.saffron[2]), warm, rise));
    g.uniform3fv(r.sky.u['uSunCol'] ?? null, sunCol);
    g.uniform1f(r.sky.u['uTime'] ?? null, cue.time);
    g.drawArrays(g.TRIANGLES, 0, r.domeN);
    g.disableVertexAttribArray(r.sky.a['aPos'] as number);
    // ── sea ──
    g.enable(g.DEPTH_TEST);
    g.depthMask(true);
    g.useProgram(r.sea.p);
    g.bindBuffer(g.ARRAY_BUFFER, r.seaBuf);
    g.enableVertexAttribArray(r.sea.a['aPos'] as number);
    g.vertexAttribPointer(r.sea.a['aPos'] as number, 3, g.FLOAT, false, 0, 0);
    g.uniformMatrix4fv(r.sea.u['uVP'] ?? null, false, vp);
    g.uniform3fv(r.sea.u['uCam'] ?? null, cam.pos);
    g.uniform3fv(r.sea.u['uSun'] ?? null, sun);
    g.uniform1f(r.sea.u['uTime'] ?? null, cue.time);
    g.uniform3fv(r.sea.u['uDeep'] ?? null, hexRgb(R.ocean[4]));
    g.uniform3fv(r.sea.u['uNear'] ?? null, hexRgb(R.ocean[2]));
    g.uniform3fv(r.sea.u['uFog'] ?? null, fog);
    g.uniform3fv(r.sea.u['uSunCol'] ?? null, sunCol);
    g.drawArrays(g.TRIANGLES, 0, 6);
    g.disableVertexAttribArray(r.sea.a['aPos'] as number);
    // ── textured things ──
    g.useProgram(r.tex.p);
    g.uniformMatrix4fv(r.tex.u['uVP'] ?? null, false, vp);
    g.uniform3fv(r.tex.u['uCam'] ?? null, cam.pos);
    g.uniform1i(r.tex.u['uTex'] ?? null, 0);
    g.uniform3fv(r.tex.u['uFog'] ?? null, fog);
    g.activeTexture(g.TEXTURE0);
    const aPos = r.tex.a['aPos'] as number;
    const aUv = r.tex.a['aUv'] as number;
    g.enableVertexAttribArray(aPos);
    g.enableVertexAttribArray(aUv);
    const draw = (buf: WebGLBuffer, n: number, t: WebGLTexture, o: { alpha?: number; tint?: V3; fog?: [number, number]; cut?: boolean }): void => {
      g.bindBuffer(g.ARRAY_BUFFER, buf);
      g.vertexAttribPointer(aPos, 3, g.FLOAT, false, 20, 0);
      g.vertexAttribPointer(aUv, 2, g.FLOAT, false, 20, 12);
      g.bindTexture(g.TEXTURE_2D, t);
      g.uniform1f(r.tex.u['uAlpha'] ?? null, o.alpha ?? 1);
      g.uniform3fv(r.tex.u['uTint'] ?? null, o.tint ?? [1, 1, 1]);
      g.uniform2fv(r.tex.u['uFogR'] ?? null, o.fog ?? [40, 260]);
      g.uniform1f(r.tex.u['uCut'] ?? null, o.cut ? 1 : 0);
      g.drawArrays(g.TRIANGLES, 0, n);
    };
    const light: V3 = lerp3([0.95, 0.82, 0.78], [1.0, 0.95, 0.86], rise);
    draw(r.groundBuf, 6, r.tGround, { tint: light, fog: [30, 120] });
    draw(r.shoreBuf, 6, r.tSand, { tint: light, fog: [30, 120] });
    // billboards: a quad facing the camera (vertical), written into the dynamic buffer
    const camRight = norm([right0[0], 0, right0[2]]);
    const quad = (at: V3, w: number, h: number, u0: number, u1: number, upright = true): Float32Array => {
      const rx = scale(camRight, w / 2);
      const upv: V3 = upright ? [0, h, 0] : scale(norm(cross(camRight, fwd)), h);
      const a = sub(at, rx);
      const b = add(at, rx);
      const c = add(b, upv);
      const d = add(a, upv);
      return new Float32Array([...a, u0, 1, ...b, u1, 1, ...c, u1, 0, ...a, u0, 1, ...c, u1, 0, ...d, u0, 0]);
    };
    const drawQuad = (data: Float32Array, t: WebGLTexture, o: Parameters<typeof draw>[3]): void => {
      g.bindBuffer(g.ARRAY_BUFFER, r.dyn);
      g.bufferData(g.ARRAY_BUFFER, data, g.DYNAMIC_DRAW);
      draw(r.dyn, 6, t, o);
    };
    // Laṅkā (a fixed far plane facing the battlefield) and the clouds
    const lw = 64;
    const lh = (lw * 80) / 192;
    const lankaQ = new Float32Array([LANKA_C[0] - lw / 2, -1, LANKA_C[2], 0, 1, LANKA_C[0] + lw / 2, -1, LANKA_C[2], 1, 1, LANKA_C[0] + lw / 2, lh - 1, LANKA_C[2], 1, 0, LANKA_C[0] - lw / 2, -1, LANKA_C[2], 0, 1, LANKA_C[0] + lw / 2, lh - 1, LANKA_C[2], 1, 0, LANKA_C[0] - lw / 2, lh - 1, LANKA_C[2], 0, 0]);
    g.enable(g.BLEND);
    g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
    drawQuad(lankaQ, r.tLanka, { tint: lerp3([0.75, 0.62, 0.8], [0.95, 0.85, 0.9], rise), fog: [60, 420], cut: true });
    const clouds: [number, number, number, number][] = [[-40, 26, -150, 46], [30, 32, -170, 40], [70, 22, -130, 30], [-90, 30, -120, 36]];
    for (const [x, y, z, w] of clouds) drawQuad(quad([x + Math.sin(cue.time * 0.02 + x) * 3, y, z], w, w * 0.3, 0, 1, false), r.tCloud, { tint: lerp3([0.95, 0.75, 0.82], [1, 0.95, 0.9], rise), fog: [500, 900], cut: true });
    // the gods watching: points of light among the clouds, twinkling
    for (let i = 0; i < 14; i++) {
      const x = -60 + ((i * 37) % 120);
      const y = 18 + ((i * 13) % 14);
      const z = -110 - ((i * 29) % 50);
      const tw = 0.5 + 0.5 * Math.sin(cue.time * 2.1 + i * 1.7);
      drawQuad(quad([x, y, z], 0.9, 0.9, 0, 1, false), r.tGod, { alpha: 0.35 + 0.65 * tw, tint: [1.2, 1.1, 0.9], fog: [900, 1000] });
    }
    // shadows, the chariot, Rāma and Agastya (4-way sprites)
    const agastyaIn = cue.phase === 'scene' ? agastyaShare(cue.step, cue.k) : 0;
    const sprites: Sprite[] = [
      { tex: r.tChariot, at: CHARIOT, w: 3.6, h: 3.0, backlit: false, blob: true },
      { tex: r.tRama, at: RAMA, w: 1.2, h: 1.8, facing: rama(cue.step), backlit: true },
      { tex: r.tAgastya, at: [AGASTYA[0], 0, lerp(AGASTYA[2] - 6, AGASTYA[2], agastyaIn)], w: 1.2, h: 1.8, facing: -Math.PI / 2, alpha: agastyaIn, backlit: true },
    ];
    // a camera that faces the sun sees the near figures against the light (silhouettes)
    const against = clamp01((dot(fwd, sun) - 0.55) / 0.4);
    for (const s of sprites) {
      if ((s.alpha ?? 1) <= 0.01) continue;
      if (s.blob) {
      const sh = new Float32Array([s.at[0] - s.w * 0.45, 0.04, s.at[2] - 0.25, 0, 0, s.at[0] + s.w * 0.45, 0.04, s.at[2] - 0.25, 1, 0, s.at[0] + s.w * 0.45, 0.04, s.at[2] + 0.25, 1, 1, s.at[0] - s.w * 0.45, 0.04, s.at[2] - 0.25, 0, 0, s.at[0] + s.w * 0.45, 0.04, s.at[2] + 0.25, 1, 1, s.at[0] - s.w * 0.45, 0.04, s.at[2] + 0.25, 0, 1]);
      drawQuad(sh, r.tShadow, { alpha: 0.35 * (s.alpha ?? 1) });
      }
      let u0 = 0;
      let u1 = 1;
      if (s.facing !== undefined) {
        // the sprite frame from the angle between where the figure faces and where the camera stands
        const toCam = Math.atan2(cam.pos[0] - s.at[0], cam.pos[2] - s.at[2]);
        let a = toCam - s.facing;
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        const dir = Math.abs(a) < Math.PI / 4 ? 0 : Math.abs(a) > (3 * Math.PI) / 4 ? 1 : a > 0 ? 2 : 3;
        u0 = dir / 4;
        u1 = (dir + 1) / 4;
      }
      const tint: V3 = s.backlit ? lerp3(light, [0.32, 0.22, 0.34], against * 0.85) : lerp3([0.8, 0.7, 0.85], light, 0.5);
      drawQuad(quad(s.at, s.w, s.h, u0, u1), s.tex, { alpha: s.alpha ?? 1, tint, fog: [40, 220], cut: true });
    }
    // the shore's foam line
    const foamA = 0.5 + 0.3 * Math.sin(cue.time * 1.4);
    drawQuad(new Float32Array([-60, 0.05, SHORE_Z + 0.4, 0, 0, 60, 0.05, SHORE_Z + 0.4, 1, 0, 60, 0.05, SHORE_Z - 0.6, 1, 1, -60, 0.05, SHORE_Z + 0.4, 0, 0, 60, 0.05, SHORE_Z - 0.6, 1, 1, -60, 0.05, SHORE_Z - 0.6, 0, 1]), r.tFoam, { alpha: foamA, fog: [40, 160] });
    // ── the battle frame (drawn last, over everything): upright and opaque at the ends, folded back and gone in 3D ──
    const fp = framePlane(cue.phase, cue.k);
    if (fp.alpha > 0.002) {
      if (frame && (cue.phase !== 'scene') && performance.now() - lastFrameUpload > 30) {
        lastFrameUpload = performance.now();
        g.bindTexture(g.TEXTURE_2D, r.tFrame);
        try {
          g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, frame);
        } catch {
          /* a frame that cannot be read leaves the last one */
        }
      }
      const hw = FRAME.w / 2;
      const c = Math.cos(fp.tilt);
      const s = Math.sin(fp.tilt);
      const top: V3 = [0, FRAME.h * c, FRAME.z - FRAME.h * s];
      const v = new Float32Array([-hw, 0, FRAME.z, 0, 1, hw, 0, FRAME.z, 1, 1, hw, top[1], top[2], 1, 0, -hw, 0, FRAME.z, 0, 1, hw, top[1], top[2], 1, 0, -hw, top[1], top[2], 0, 0]);
      g.disable(g.DEPTH_TEST);
      drawQuad(v, r.tFrame, { alpha: fp.alpha, fog: [1000, 2000] });
      g.enable(g.DEPTH_TEST);
    }
    g.disable(g.BLEND);
    g.disableVertexAttribArray(aPos);
    g.disableVertexAttribArray(aUv);
  }
  return {
    render,
    get pose() {
      return cam;
    },
    get lost() {
      return lost;
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onLostEv);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      res = null;
    },
  };
}

/** How far into its shot the camera is (the orbit angle, the slow push-in): the share of the shot's steps done. */
function shotProgress(cue: SceneCue): number {
  const s = cue.step;
  if (!s) return 1;
  const frac = clamp01(cue.k);
  if (s.kind === 'narration') return frac;
  const ranges: [number, number][] = [[1, 2], [3, 15], [16, 21], [22, 27], [28, 30], [31, 31]];
  const r = ranges.find(([a, b]) => s.verse >= a && s.verse <= b) ?? [s.verse, s.verse];
  const span = (r[1] - r[0] + 1) * 4;
  return clamp01(((s.verse - r[0]) * 4 + s.pada + frac) / span);
}

/**
 * Agastya walks in during the narration line that says he comes (index 4, `frac` of it), stays while he teaches, and
 * goes back the way he came as verse 27 says so (एवमुक्त्वा … जगाम स यथागतम्, its last two pādas): gone for 28–31.
 */
export function agastyaShare(step: CutsceneStep | undefined, frac = 1): number {
  if (!step) return 0;
  if (step.kind === 'narration') return step.index < 4 ? 0 : step.index === 4 ? smooth(0, 0.8, frac) : 1;
  if (step.verse < 27) return 1;
  if (step.verse > 27) return 0;
  return step.pada < 2 ? 1 : step.pada === 2 ? 1 - smooth(0.2, 1, frac) * 0.5 : 0.5 - smooth(0, 0.9, frac) * 0.5;
}

/** Rāma faces Agastya while he is taught, the sun while he recites (28–29), Rāvaṇa's chariot as he takes his bow (30). */
function rama(step: CutsceneStep | undefined): number {
  if (step?.kind === 'pada' && step.verse >= 28 && step.verse <= 29) return Math.PI; // towards −z, the sun
  if (step?.kind === 'pada' && step.verse >= 30) return Math.atan2(CHARIOT[0] - RAMA[0], CHARIOT[2] - RAMA[2]);
  if (step?.kind === 'narration' && step.index <= 1) return Math.atan2(CHARIOT[0] - RAMA[0], CHARIOT[2] - RAMA[2]);
  return Math.PI / 2; // towards +x, Agastya
}
