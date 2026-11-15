/**
 * v0.6: the mountain of herbs (Yuddha 6.74) as a 3D told cutscene on the Āditya engine. OWNER: v0.6 WP-D.
 * Registered as SCENES_D.herbs (content/cutscene-herbs.json says "scene3d": "herbs"); cutscene3d-scenes.ts merges it.
 * Its 2D still (reduced motion, no WebGL, a lost context): cutscene-paint-d.ts. Story beats and their verses:
 * notes/v06-d.md.
 *
 * Raw WebGL 1 like the Āditya scene (cutscene3d.ts), reusing its exports: the vector / matrix kit, the textured-quad,
 * sky-dither and sea shaders, the pixel textures (the game's own sprites as 4-way billboards, the battlefield ground,
 * Laṅkā on Trikūṭa) and the battle-frame plane that folds back at the start and stands up again at the end. Two sets:
 *   lanka     the battlefield at night, the fallen army, the sea (the flat / rotate phases, 'north', 'sea', 'revive')
 *   himalaya  a dawn-gold Himālaya over a sea of clouds: golden Ṛṣabha, white Kailāsa and the herb mountain between
 *             them (6.74.30–31), its herbs as flickering lights ('himalaya', 'search', 'hidden', 'roar', 'lift')
 * The mountains are small flat-shaded meshes (vertex colours from the game palette, dithered colour bands); the herb
 * mountain's peak is its own mesh, so Hanumān can tear it off, lift it and carry it, shining like the sun (6.74.67–69).
 * One shot per `{ "scene": key }` step (cuts); inside a shot the choreography runs on the scene clock (seconds since the
 * shot began), the ambient motion (water, twinkles, Hanumān looking about while the question waits) on its own clock.
 * Budget as the Āditya scene: ≤ 420 px wide internally (the view sizes the canvas), ~20 draw calls (sprites and lights
 * are batched per texture), a few thousand triangles.
 *
 * Pure helpers (no DOM; unit-tested in v06-d.test.ts): herbShot, herbSet, heroAt, peakAt, herbsShown, riseK, shotPose,
 * herbsPath, herbHeight, herbSpots, armyLayout, mountainMesh. Keep module scope free of DOM / WebGL work.
 */
import type { Art } from './art';
import { R } from './art-palette';
import { hash2, makeCanvas } from './art-core';
import type { SpriteId } from './catalog';
import {
  type Pose,
  type Prog,
  type V3,
  DITHER,
  FRAME,
  FRAME_POSE,
  FS_SEA,
  FS_TEX,
  VS_SEA,
  VS_SKY,
  VS_TEX,
  add,
  clamp01,
  cross,
  easeInOut,
  framePlane,
  groundCanvas,
  hexRgb,
  lankaCanvas,
  lerp,
  lerp3,
  lookAt,
  mul,
  norm,
  perspective,
  scale,
  smooth,
  spriteStrip,
  sub,
} from './cutscene3d';
import type { Scene3DFactory, Scene3DTold, ToldCue3D, ToldPhase3D } from './cutscene3d-scenes';

/** An integer hash ≥ 0 (art-core's hash2 is a fraction in [0, 1)). */
export const ihash = (x: number, y: number, s = 0): number => Math.floor(hash2(x, y, s) * 1_000_000);

// ───────────────────────── shots and sets ─────────────────────────

/** The shots of content/cutscene-herbs.json (`{ "scene": key }`), in story order. */
export const HERB_SHOTS = ['north', 'himalaya', 'search', 'hidden', 'roar', 'lift', 'sea', 'revive'] as const;
export type HerbShot = (typeof HERB_SHOTS)[number];
export type HerbSet = 'lanka' | 'himalaya';

/** The shot of a scene key ('' before the first step, or an unknown key → 'north'). */
export function herbShot(scene: string): HerbShot {
  return (HERB_SHOTS as readonly string[]).includes(scene) ? (scene as HerbShot) : 'north';
}

/** Which set a frame shows: the battlefield outside the scene phase (the frame plane lives there), else by shot. */
export function herbSet(shot: HerbShot, phase: ToldPhase3D): HerbSet {
  if (phase !== 'scene') return 'lanka';
  return shot === 'himalaya' || shot === 'search' || shot === 'hidden' || shot === 'roar' || shot === 'lift' ? 'himalaya' : 'lanka';
}

// ───────────────────────── the herb mountain (Himālaya set, world units) ─────────────────────────

export const HERB_MT = { r: 15, h: 12.5, rings: 7, segs: 18, cutRing: 2, exp: 1.3 } as const;
/** The surface height of the herb mountain at radius r (noise-free profile of its mesh). */
export function herbHeight(r: number): number {
  const f = 1 - Math.min(1, Math.max(0, r) / HERB_MT.r);
  return HERB_MT.h * Math.pow(f, HERB_MT.exp);
}
/** Where the torn peak's cut lies: the centre of the cut ring (its cap). */
export const PEAK_CAP: V3 = [0, herbHeight((HERB_MT.r * HERB_MT.cutRing) / HERB_MT.rings) - 0.5, 0];

/** The four great herbs of 6.74.33 as lights on the summit (twelve lights, three of each colour). */
export function herbSpots(): { at: V3; col: V3; i: number }[] {
  const cols: V3[] = [hexRgb(R.gold[1]), hexRgb(R.white[0]), hexRgb(R.saffron[0]), hexRgb(R.leaf[0])];
  const out: { at: V3; col: V3; i: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const th = (i / 12) * Math.PI * 2 + (ihash(i, 3, 5) % 100) / 160;
    const r = 1.3 + ((ihash(i, 7, 5) % 100) / 100) * 2.9;
    out.push({ at: [Math.sin(th) * r, herbHeight(r) + 0.35, Math.cos(th) * r], col: cols[i % 4] as V3, i });
  }
  return out;
}

/** How much of herb i (0..11) still shows: all in 'himalaya', one by one gone during 'search' (6.74.64), none after. */
export function herbsShown(shot: HerbShot, s: number, i = 0): number {
  if (shot === 'himalaya' || shot === 'north') return 1;
  if (shot === 'search') return 1 - smooth(1.2 + 0.14 * i, 1.6 + 0.14 * i, s);
  return 0;
}

// ───────────────────────── Hanumān ─────────────────────────

export interface Hero {
  /** feet (bottom centre of the billboard) */
  pos: V3;
  /** height in world units */
  h: number;
  /** velocity (world units / s): the flight tilt follows its screen direction */
  vel: V3;
  /** where he faces (yaw; 0 = +z) */
  facing: number;
  /** 0 standing upright … 1 tilted along his flight */
  fly: number;
  /** a red-gold glow about him (the roar) */
  aura: number;
  /** he carries the peak over his head */
  carry: boolean;
  /** shown at all */
  show: boolean;
}

const HERO_LANKA: V3 = [0, 0, -3.5];
const SUMMIT: V3 = [0, herbHeight(1.4), 1.4];
const SHOULDER: V3 = [0, herbHeight(6.2), 6.2];
const bez = (a: V3, c: V3, b: V3, u: number): V3 => lerp3(lerp3(a, c, u), lerp3(c, b, u), u);

/**
 * Hanumān in a shot `s` seconds in (`idle`: the ambient clock). north: he leaps from among the fallen and flies north
 * over the sea (6.74.49–55); himalaya: he flies in and lands on the herb mountain (6.74.56–62); search / hidden: he
 * stands on its summit looking about; roar: on its shoulder he grows (6.74.65); lift: he tears off the peak, raises it
 * and leaps into the sky with it (6.74.67–68); sea: he flies back over the sea with it (6.74.69); revive: he comes down
 * over the battlefield (6.74.72). Outside the scene (`shot` null): before → standing among the fallen; after → over the field.
 */
export function heroAt(shot: HerbShot | 'before' | 'after', s: number, idle = 0): Hero {
  const base: Hero = { pos: HERO_LANKA, h: 2.4, vel: [0, 0, 0], facing: Math.PI, fly: 0, aura: 0, carry: false, show: true };
  switch (shot) {
    case 'before':
      return base;
    case 'north': {
      const u = Math.max(0, s - 0.5);
      const pos: V3 = [HERO_LANKA[0] + 1.2 * u, 15 * (1 - Math.exp(-u * 1.1)), HERO_LANKA[2] - 24 * u - 5 * u * u];
      const vel: V3 = [1.2, 15 * 1.1 * Math.exp(-u * 1.1), -24 - 10 * u];
      return { ...base, pos, vel: s < 0.5 ? [0, 0, 0] : vel, h: lerp(2.4, 3.2, smooth(0.5, 2.0, s)), fly: smooth(0.6, 1.4, s) };
    }
    case 'himalaya': {
      const u = smooth(0.2, 4.6, s);
      const a: V3 = [36, 30, 24];
      const c: V3 = [14, 27, 8];
      const pos = bez(a, c, SUMMIT, u);
      const ahead = bez(a, c, SUMMIT, Math.min(1, u + 0.02));
      const vel = u < 1 ? scale(sub(ahead, pos), 30) : ([0, 0, 0] as V3);
      const landed = smooth(4.0, 4.7, s);
      return { ...base, pos, vel, h: 4, facing: landed > 0.5 ? 0 : Math.atan2(vel[0], vel[2]), fly: 1 - landed };
    }
    case 'search':
      return { ...base, pos: SUMMIT, h: 4, facing: Math.sin(s * 1.6) * 1.3 };
    case 'hidden':
      return { ...base, pos: SUMMIT, h: 4, facing: Math.sin(idle * 0.9) * 1.4 };
    case 'roar': {
      const g = smooth(0.2, 1.8, s);
      return { ...base, pos: SHOULDER, h: lerp(4, 8.5, g), facing: 0, aura: smooth(0.1, 0.8, s) };
    }
    case 'lift': {
      const u = Math.max(0, s - 2.6);
      const pos: V3 = add(SHOULDER, [-2.5 * u - 0.6 * u * u, 7 * u + 2.2 * u * u, 2.0 * u]);
      const vel: V3 = [-2.5 - 1.2 * u, 7 + 4.4 * u, 2.0];
      return { ...base, pos, vel, h: 8.5, facing: 0, aura: 1 - smooth(1.0, 3.0, s), carry: s >= 1.3, fly: 0.25 * smooth(2.6, 3.4, s) };
    }
    case 'sea': {
      const t = Math.min(s, 3.2);
      return { ...base, pos: [3, 16, -230 + 70 * t], vel: [0, 0, 70], h: 3.6, facing: 0, carry: true, fly: 0.2 };
    }
    case 'revive': {
      const d = smooth(0, 2.6, s);
      return { ...base, pos: lerp3([0, 15, -18], [0, 9.5, -14], d), vel: [0, -2 * (1 - d), 1.5 * (1 - d)], h: 3.6, facing: 0, carry: true };
    }
    case 'after':
      return { ...base, pos: [0, 9.5, -14], h: 3.6, facing: 0, carry: true };
  }
}

/**
 * The torn peak: where its cap centre is (world), its scale and roll, and how brightly it shines. Absent (null) while it
 * is still part of the mountain (the base mesh carries its own peak until 'lift').
 */
export function peakAt(shot: HerbShot | 'before' | 'after', s: number, hero: Hero = heroAt(shot, s)): { at: V3; k: number; roll: number; glow: number } | null {
  const over = (hh: Hero, k: number): V3 => add(hh.pos, [0, hh.h * 1.02 + 0.2 * k, 0]);
  if (shot === 'lift') {
    const tear = smooth(0.15, 1.3, s);
    const lifted: V3 = add(PEAK_CAP, [0, 1.6 * tear, 0]);
    const to = easeInOut(smooth(1.3, 2.6, s));
    const at = s < 2.6 ? lerp3(lifted, over(hero, 1), to) : over(hero, 1);
    return { at, k: 1, roll: 0.07 * Math.sin(s * 38) * (1 - smooth(0.9, 1.3, s)), glow: lerp(0.25, 1, smooth(1.3, 3.0, s)) };
  }
  if (shot === 'sea' || shot === 'revive' || shot === 'after') return { at: over(hero, hero.h / 8.5), k: hero.h / 8.5, roll: 0, glow: 1 };
  return null;
}

// ───────────────────────── the army (Laṅkā set) ─────────────────────────

/** Rāma, Lakṣmaṇa and twelve vānaras lying on the battlefield (struck by Indrajit's weapon, 6.73) — where and which side. */
export function armyLayout(): { id: SpriteId; at: V3; side: 1 | -1 }[] {
  const out: { id: SpriteId; at: V3; side: 1 | -1 }[] = [
    { id: 'rama', at: [-1.6, 0, 2.6], side: -1 },
    { id: 'lakshmana', at: [1.4, 0, 2.0], side: 1 },
  ];
  for (let i = 0; out.length < 14 && i < 80; i++) {
    const x = -11 + ((ihash(i, 1, 41) % 1000) / 1000) * 22;
    const z = -7 + ((ihash(i, 2, 41) % 1000) / 1000) * 13;
    if (Math.abs(x) < 3.2 && z > -1) continue;
    if (out.some((o) => Math.hypot(o.at[0] - x, o.at[2] - z) < 2.2)) continue;
    out.push({ id: 'vanara', at: [x, 0, z], side: ihash(i, 3, 41) % 2 ? 1 : -1 });
  }
  return out;
}

/**
 * How far figure i has risen (0 lying … 1 standing): Rāma and Lakṣmaṇa first as they breathe in the herbs (6.74.73),
 * then the vānaras one by one, like sleepers at the end of the night (6.74.74). Before 'revive' they lie; after, they stand.
 */
export function riseK(shot: HerbShot | 'before' | 'after', s: number, i: number): number {
  if (shot === 'after') return 1;
  if (shot !== 'revive') return 0;
  const start = i === 0 ? 0.9 : i === 1 ? 1.15 : 1.7 + (i - 2) * 0.22;
  return smooth(start, start + 0.55, s);
}

// ───────────────────────── cameras ─────────────────────────

const deg = (d: number): number => (d * Math.PI) / 180;
const pose = (pos: V3, target: V3, fovDeg: number, roll = 0): Pose => ({ pos, target, fov: deg(fovDeg), roll });
/** The first shot's opening camera: behind and above the battlefield, looking north over the sea (the rotate-out ends here). */
export const NORTH_START: Pose = pose([6.5, 3.6, 7.5], [0, 2.4, -8], 50);

/** The camera of a shot `s` seconds in, for Hanumān `hero` there. */
export function shotPose(shot: HerbShot, s: number, hero: Hero = heroAt(shot, s), idle = 0): Pose {
  switch (shot) {
    case 'north': {
      const track = pose(add(hero.pos, [6.5, 2.2, 7]), add(hero.pos, [0, 0.8, -6]), 48);
      const k = smooth(0.6, 2.4, s);
      return { pos: lerp3(NORTH_START.pos, track.pos, k), target: lerp3(NORTH_START.target, track.target, k), fov: lerp(NORTH_START.fov, track.fov, k), roll: 0.05 * Math.sin(Math.PI * k) };
    }
    case 'himalaya':
      return pose(lerp3([3, 10, 48], [2, 10.5, 41], clamp01(s / 5.7)), [0, 9.6, 0], 46);
    case 'search':
      return pose(lerp3([7, 13.6, 17], [6, 13.3, 15], clamp01(s / 4.8)), [0, 12.2, 0], 44);
    case 'hidden':
      return pose([4.6 + Math.sin(idle * 0.3) * 0.4, 13.5, 10.5], [0, 12.7, 0], 42);
    case 'roar': {
      const g = smooth(0.2, 1.8, s);
      return pose(lerp3([9, 8.2, 18], [8, 7.9, 16.5], clamp01(s / 5.4)), [0, lerp(10.5, 13.5, g), 3], 54);
    }
    case 'lift': {
      const back = smooth(2.0, 6.5, s);
      const look = smooth(2.4, 3.6, s);
      const target = lerp3([0, 12, 3], add(hero.pos, [0, hero.h * 0.8, 0]), look);
      return pose(lerp3([11, 9, 25], [20, 20, 48], back), target, lerp(54, 50, back));
    }
    case 'sea':
      return pose(add(hero.pos, [-9, -4.5, -7]), add(hero.pos, [0.5, 1.2, 7]), 56, -0.04);
    case 'revive':
      return pose(lerp3([6, 3.2, 13], [5, 3.0, 11], clamp01(s / 6.2)), [0, 5.0, -10], 52);
  }
}

/** The end of 'revive' (where the return to the frame starts when a skip left the camera in the other set). */
export const REVIVE_END: Pose = shotPose('revive', 6.2, heroAt('revive', 6.2));

/**
 * The camera of the rotate phases: out of the flat view (`out`) from the frame pose to the first shot along an arc that
 * pulls back, lifts and rolls; in (`out` false) from `from` back to the frame pose. `k` 0..1 (eased inside).
 */
export function herbsPath(k: number, out: boolean, from: Pose = REVIVE_END): Pose {
  const e = easeInOut(clamp01(k));
  const a = out ? FRAME_POSE : from;
  const b = out ? NORTH_START : FRAME_POSE;
  const arc = Math.sin(Math.PI * e);
  const pos = add(lerp3(a.pos, b.pos, e), [arc * (out ? 2.0 : -1.2), arc * 1.6, arc * 2.4]);
  return { pos, target: lerp3(a.target, b.target, e), fov: lerp(a.fov, b.fov, e), roll: arc * (out ? 0.12 : -0.08) };
}

// ───────────────────────── mountain meshes (pure: Float32Array of pos3 nrm3 col3 per vertex) ─────────────────────────

export type MountainKind = 'herb' | 'rishabha' | 'kailasa' | 'range';
export interface MountainSpec {
  kind: MountainKind;
  at: [number, number];
  r: number;
  h: number;
  seed: number;
}
const C = (hex: string): V3 => hexRgb(hex);

function faceColour(kind: MountainKind, fy: number, ny: number, hsh: number): V3 {
  const pick = (xs: string[]): V3 => C(xs[hsh % xs.length] as string);
  switch (kind) {
    case 'herb':
      if (fy > 0.86 && ny > 0.35) return pick([R.white[1], R.white[0], R.white[1]]);
      if (hsh % 29 === 0) return C(R.gold[2]);
      if (fy > 0.55) return pick([R.leaf[2], R.grass[3], R.rock[2], R.leaf[2]]);
      return pick([R.leaf[3], R.leafDark[2], R.leaf[3], R.grass[4]]);
    case 'rishabha':
      if (fy > 0.84 && ny > 0.45) return pick([R.white[1], R.gold[0]]);
      return pick([R.gold[2], R.gold[3], R.gold[2], R.earth[3], R.gold[1]]);
    case 'kailasa':
      if (Math.floor(fy * 10) % 3 === 1 && ny < 0.8 && fy < 0.9) return pick([R.rock[3], R.mountain[3]]);
      return pick([R.white[0], R.white[1], R.white[1], R.white[2]]);
    case 'range':
      if (fy > 0.55 && ny > 0.3) return pick([R.white[1], R.white[2], R.white[1]]);
      return pick([R.mountain[3], R.indigo[3], R.mountain[4]]);
  }
}

function profile(kind: MountainKind, f: number): number {
  if (kind === 'kailasa') return Math.pow(f, 0.8);
  if (kind === 'herb') return Math.pow(f, HERB_MT.exp);
  if (kind === 'rishabha') return Math.pow(f, 1.1);
  return Math.pow(f, 1.25);
}

/**
 * A mountain as flat-shaded triangles: rings from the apex (ring 0) to the base, jagged by a seeded hash, coloured by
 * height and slope. `part`: 'all', or for the herb mountain 'base' (rings ≥ cutRing, with a broken-rock cap) / 'peak'
 * (rings < cutRing, with a cap under it).
 */
export function mountainMesh(m: MountainSpec, part: 'all' | 'base' | 'peak' = 'all'): Float32Array {
  const NR = m.kind === 'herb' ? HERB_MT.rings : 7;
  const NS = m.kind === 'herb' ? HERB_MT.segs : 16;
  const cut = HERB_MT.cutRing;
  const ring: V3[][] = [];
  for (let i = 0; i <= NR; i++) {
    const row: V3[] = [];
    for (let j = 0; j < NS; j++) {
      const jit = i === 0 ? 0 : ((ihash(i, j, m.seed) % 100) / 100 - 0.5) * 0.24;
      const th = (j / NS) * Math.PI * 2 + jit * 0.5;
      const rr = (m.r * i) / NR * (1 + jit);
      const f = 1 - i / NR;
      const ridge = 1 + 0.07 * Math.sin(th * 5 + m.seed) * (1 - f) + (i === 0 ? 0 : jit * 0.25);
      const y = i === NR ? -1.2 : m.h * profile(m.kind, f) * ridge;
      row.push([m.at[0] + Math.sin(th) * rr, y, m.at[1] + Math.cos(th) * rr]);
    }
    ring.push(row);
  }
  const out: number[] = [];
  const tri = (a: V3, b: V3, c: V3, col?: V3): void => {
    let n = norm(cross(sub(b, a), sub(c, a)));
    if (n[1] < 0) n = scale(n, -1);
    const cy = (a[1] + b[1] + c[1]) / 3;
    const hsh = ihash(Math.round((a[0] + b[0] + c[0]) * 7), Math.round((a[2] + b[2] + c[2]) * 7), m.seed);
    const k = col ?? faceColour(m.kind, cy / m.h, n[1], hsh);
    for (const p of [a, b, c]) out.push(p[0], p[1], p[2], n[0], n[1], n[2], k[0], k[1], k[2]);
  };
  const want = (i: number): boolean => part === 'all' || (part === 'peak' ? i < cut : i >= cut);
  for (let i = 0; i < NR; i++) {
    if (!want(i)) continue;
    const r0 = ring[i] as V3[];
    const r1 = ring[i + 1] as V3[];
    for (let j = 0; j < NS; j++) {
      const j1 = (j + 1) % NS;
      if (i === 0) tri(r0[0] as V3, r1[j] as V3, r1[j1] as V3);
      else {
        tri(r0[j] as V3, r1[j] as V3, r1[j1] as V3);
        tri(r0[j] as V3, r1[j1] as V3, r0[j1] as V3);
      }
    }
  }
  if (part !== 'all') {
    // the broken rock where the peak was torn off (a cap under the peak, another on the base)
    const cr = ring[cut] as V3[];
    const cy = cr.reduce((a, p) => a + p[1], 0) / cr.length;
    const centre: V3 = [m.at[0], part === 'peak' ? cy - 0.6 : cy - 0.3, m.at[1]];
    for (let j = 0; j < NS; j++) {
      const hsh = ihash(j, 9, m.seed);
      const col = C(hsh % 3 === 0 ? R.cliff[3] : hsh % 3 === 1 ? R.earth[3] : R.cliff[2]);
      tri(centre, cr[j] as V3, cr[(j + 1) % NS] as V3, col);
    }
  }
  return new Float32Array(out);
}

/** The far range behind the three mountains (one buffer). */
export function rangeMesh(): Float32Array {
  const parts: Float32Array[] = [];
  const peaks: [number, number, number, number][] = [[-75, -95, 26, 34], [-38, -120, 30, 46], [0, -135, 34, 52], [40, -118, 30, 44], [78, -100, 26, 36], [-110, -70, 22, 28], [112, -75, 22, 30]];
  peaks.forEach(([x, z, r, h], i) => parts.push(mountainMesh({ kind: 'range', at: [x, z], r, h, seed: 60 + i })));
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export const RISHABHA: MountainSpec = { kind: 'rishabha', at: [-21, -7], r: 13, h: 16, seed: 31 };
export const KAILASA: MountainSpec = { kind: 'kailasa', at: [22, -10], r: 13, h: 19, seed: 37 };
export const HERB_MOUNTAIN: MountainSpec = { kind: 'herb', at: [0, 0], r: HERB_MT.r, h: HERB_MT.h, seed: 17 };

// ───────────────────────── shaders of this scene ─────────────────────────

/** A sky with a glow (the herbs' blaze / the peak like the sun), dithered bands and stars. */
const FS_SKY_H = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vDir; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform vec3 uGlowDir; uniform vec3 uGlowCol; uniform float uGlow; uniform float uStars; uniform float uTime;
${DITHER}
float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){ vec3 d = normalize(vDir); float e = d.y; vec3 col = mix(uLow, uMid, smoothstep(-0.02, 0.2, e)); col = mix(col, uTop, smoothstep(0.2, 0.7, e));
  float s = max(dot(d, uGlowDir), 0.0); col += uGlowCol * uGlow * (pow(s, 7.0) * 0.4 + pow(s, 50.0) * 0.6);
  vec2 cell = floor(vec2(atan(d.x, d.z) * 120.0, e * 120.0)); float h = h21(cell);
  if (h > 0.985) col += vec3(0.85, 0.85, 1.0) * uStars * smoothstep(0.08, 0.35, e) * (0.55 + 0.45 * sin(uTime * 2.0 + h * 80.0));
  gl_FragColor = vec4(band(col), 1.0); }`;

/** Flat-shaded vertex-coloured meshes (the mountains), lit by one warm light, with an emissive glow, fog and bands. */
const VS_MESH = `attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aCol; uniform mat4 uVP; uniform mat4 uM; uniform vec3 uCam;
varying vec3 vCol; varying vec3 vN; varying float vDist; varying float vY;
void main(){ vec4 w = uM * vec4(aPos, 1.0); vN = (uM * vec4(aNrm, 0.0)).xyz; vCol = aCol; vDist = distance(w.xyz, uCam); vY = aPos.y; gl_Position = uVP * w; }`;
const FS_MESH = `precision mediump float; varying vec3 vCol; varying vec3 vN; varying float vDist; varying float vY;
uniform vec3 uLight; uniform vec3 uLightCol; uniform vec3 uAmb; uniform vec3 uFog; uniform vec2 uFogR; uniform vec3 uGlow; uniform vec2 uGlowY;
${DITHER}
void main(){ float d = max(dot(normalize(vN), uLight), 0.0); vec3 col = vCol * (uAmb + uLightCol * d) + uGlow * smoothstep(uGlowY.x, uGlowY.y, vY);
  float f = clamp((vDist - uFogR.x) / (uFogR.y - uFogR.x), 0.0, 1.0); col = mix(col, uFog, f * f); gl_FragColor = vec4(band(col), 1.0); }`;

/** Batched billboards: sprites (cut), lights (additive) and debris, each quad with its own colour. */
const VS_BB = `attribute vec3 aPos; attribute vec2 aUv; attribute vec4 aCol; uniform mat4 uVP; uniform vec3 uCam; varying vec2 vUv; varying vec4 vCol; varying float vDist;
void main(){ vUv = aUv; vCol = aCol; vDist = distance(aPos, uCam); gl_Position = uVP * vec4(aPos, 1.0); }`;
const FS_BB = `precision mediump float; varying vec2 vUv; varying vec4 vCol; varying float vDist; uniform sampler2D uTex; uniform float uMode; uniform vec3 uFog; uniform vec2 uFogR;
void main(){ vec4 c = texture2D(uTex, vUv) * vCol; float f = clamp((vDist - uFogR.x) / (uFogR.y - uFogR.x), 0.0, 1.0);
  if (uMode < 0.5) { if (c.a < 0.5) discard; gl_FragColor = vec4(mix(c.rgb, uFog, f * f), 1.0); }
  else { gl_FragColor = vec4(c.rgb * c.a * (1.0 - f), 1.0); } }`;

/** A full-screen colour wash (the flash as the peak tears). */
const VS_FULL = `attribute vec2 aXY; void main(){ gl_Position = vec4(aXY, 0.0, 1.0); }`;
const FS_FULL = `precision mediump float; uniform vec4 uCol; void main(){ gl_FragColor = uCol; }`;

// ───────────────────────── small 4×4 matrix kit for models ─────────────────────────

const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
/** p ↦ to + Rz(roll) · k · (p − pivot) (column-major). */
export function modelMatrix(to: V3, k: number, roll: number, pivot: V3): Float32Array {
  const c = Math.cos(roll) * k;
  const s = Math.sin(roll) * k;
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, k, 0, to[0] - (c * pivot[0] - s * pivot[1]), to[1] - (s * pivot[0] + c * pivot[1]), to[2] - k * pivot[2], 1]);
}

// ───────────────────────── textures ─────────────────────────

/** A soft round light (white; tinted per quad), stepped like pixel art. */
function glowCanvas(): HTMLCanvasElement | null {
  const n = 16;
  const c = makeCanvas(n, n);
  const g = c?.getContext('2d');
  if (!c || !g) return null;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5) / 7.5;
      if (d >= 1) continue;
      const a = Math.round(Math.pow(1 - d, 1.6) * 6) / 6;
      g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      g.fillRect(x, y, 1, 1);
    }
  return c;
}
function solidCanvas(color: string): HTMLCanvasElement | null {
  const c = makeCanvas(4, 4);
  const g = c?.getContext('2d');
  if (!c || !g) return null;
  g.fillStyle = color;
  g.fillRect(0, 0, 4, 4);
  g.fillStyle = R.cliff[4];
  g.fillRect(0, 3, 4, 1);
  g.fillRect(3, 0, 1, 4);
  return c;
}

// ───────────────────────── the scene ─────────────────────────

const LANKA_CITY: V3 = [-34, -1, 74];
const SEA_Y = -0.3;
const CLOUD_Y = 0.4;
type Rgba = [number, number, number, number];

function createHerbsScene(canvas: HTMLCanvasElement, art: Art, onLost: (lost: boolean) => void): Scene3DTold | null {
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
  let lastShot = '';
  let lastPhase: ToldPhase3D = 'flat';
  let rotateFrom: Pose | null = null;
  let lastFrameUpload = -1;
  let idle = 0;
  const army = armyLayout();
  const spots = herbSpots();

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
    const mesh = (data: Float32Array): { buf: WebGLBuffer; n: number } => ({ buf: buffer(data), n: data.length / 9 });
    const quadXZ = (x0: number, x1: number, z0: number, z1: number, y: number): Float32Array => new Float32Array([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z0, x1, y, z1, x0, y, z1]);
    // sky dome (directions; the shader colours it)
    const dome: number[] = [];
    const ringAt = (i: number, j: number): V3 => {
      const th = (i / 24) * Math.PI * 2;
      const ph = -0.25 + (j / 10) * (Math.PI / 2 + 0.25);
      return [Math.cos(ph) * Math.sin(th), Math.sin(ph), Math.cos(ph) * Math.cos(th)];
    };
    for (let j = 0; j < 10; j++)
      for (let i = 0; i < 24; i++) {
        const a = ringAt(i, j);
        const b = ringAt(i + 1, j);
        const c = ringAt(i + 1, j + 1);
        const d = ringAt(i, j + 1);
        dome.push(...a, ...b, ...c, ...a, ...c, ...d);
      }
    // the battlefield strip (uv in world units / 8), from the northern shore (z −40) to Laṅkā (z 90)
    const U = 8;
    const [gx0, gx1, gz0, gz1] = [-70, 70, -40, 90];
    const groundV = new Float32Array([gx0, 0, gz0, gx0 / U, gz0 / U, gx1, 0, gz0, gx1 / U, gz0 / U, gx1, 0, gz1, gx1 / U, gz1 / U, gx0, 0, gz0, gx0 / U, gz0 / U, gx1, 0, gz1, gx1 / U, gz1 / U, gx0, 0, gz1, gx0 / U, gz1 / U]);
    return {
      tex: program(VS_TEX, FS_TEX, ['aPos', 'aUv'], ['uVP', 'uCam', 'uTex', 'uAlpha', 'uTint', 'uFog', 'uFogR', 'uCut']),
      sky: program(VS_SKY, FS_SKY_H, ['aPos'], ['uVP', 'uCam', 'uTop', 'uMid', 'uLow', 'uGlowDir', 'uGlowCol', 'uGlow', 'uStars', 'uTime']),
      sea: program(VS_SEA, FS_SEA, ['aPos'], ['uVP', 'uCam', 'uSun', 'uTime', 'uDeep', 'uNear', 'uFog', 'uSunCol']),
      mesh: program(VS_MESH, FS_MESH, ['aPos', 'aNrm', 'aCol'], ['uVP', 'uM', 'uCam', 'uLight', 'uLightCol', 'uAmb', 'uFog', 'uFogR', 'uGlow', 'uGlowY']),
      bb: program(VS_BB, FS_BB, ['aPos', 'aUv', 'aCol'], ['uVP', 'uCam', 'uTex', 'uMode', 'uFog', 'uFogR']),
      full: program(VS_FULL, FS_FULL, ['aXY'], ['uCol']),
      domeBuf: buffer(new Float32Array(dome)),
      domeN: dome.length / 3,
      seaBuf: buffer(quadXZ(-600, 600, -600, 600, SEA_Y)),
      cloudBuf: buffer(quadXZ(-500, 500, -500, 500, CLOUD_Y)),
      groundBuf: buffer(groundV),
      fullBuf: buffer(new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1])),
      dyn: buffer(new Float32Array(6 * 5), true),
      batch: buffer(new Float32Array(6 * 9), true),
      range: mesh(rangeMesh()),
      rishabha: mesh(mountainMesh(RISHABHA)),
      kailasa: mesh(mountainMesh(KAILASA)),
      herbAll: mesh(mountainMesh(HERB_MOUNTAIN)),
      herbBase: mesh(mountainMesh(HERB_MOUNTAIN, 'base')),
      herbPeak: mesh(mountainMesh(HERB_MOUNTAIN, 'peak')),
      tGround: texture(groundCanvas(), true),
      tLanka: texture(lankaCanvas()),
      tHero: texture(spriteStrip(art, 'hanuman')),
      tRama: texture(spriteStrip(art, 'rama')),
      tLak: texture(spriteStrip(art, 'lakshmana')),
      tVanara: texture(spriteStrip(art, 'vanara')),
      tGlow: texture(glowCanvas()),
      tRock: texture(solidCanvas(R.cliff[3])),
      tFrame: texture(null),
    };
  }

  try {
    res = build(gl);
  } catch (err) {
    console.warn('[ramayana-yatra] herbs 3D unavailable', err);
    canvas.removeEventListener('webglcontextlost', onLostEv);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    return null;
  }

  function render(cue: ToldCue3D, frame: HTMLCanvasElement | null): void {
    const g = gl;
    const r = res;
    if (!g || !r || lost || g.isContextLost()) return;
    idle += Math.max(0, cue.dt) / 1000;
    const W = canvas.width;
    const H = canvas.height;
    g.viewport(0, 0, W, H);
    const shot = herbShot(cue.scene);
    const set = herbSet(shot, cue.phase);
    const s = cue.phase === 'scene' ? Math.max(0, cue.t) / 1000 : 0;
    const when: HerbShot | 'before' | 'after' = cue.phase === 'scene' ? shot : cue.phase === 'flat' || cue.phase === 'rotate-out' ? 'before' : 'after';
    const hero = heroAt(when, s, idle);
    const peak = peakAt(when, s, hero);
    // ── the camera: rotate phases follow the arc exactly; a new shot cuts; inside a shot a short smoothing ──
    let want: Pose;
    if (cue.phase === 'flat' || cue.phase === 'done') want = FRAME_POSE;
    else if (cue.phase === 'rotate-out') want = herbsPath(cue.k, true);
    else if (cue.phase === 'rotate-in') {
      if (!rotateFrom) rotateFrom = lastPhase === 'scene' && herbSet(herbShot(lastShot), 'scene') === 'lanka' ? { ...cam, pos: [...cam.pos] as V3, target: [...cam.target] as V3 } : REVIVE_END;
      want = herbsPath(cue.k, false, rotateFrom);
    } else want = shotPose(shot, s, hero, idle);
    if (cue.phase !== 'rotate-in') rotateFrom = null;
    const cut = cue.phase !== 'scene' || cue.scene !== lastShot || lastPhase !== 'scene';
    const follow = cut ? 1 : 1 - Math.exp(-Math.max(0, cue.dt) / 160);
    cam.pos = lerp3(cam.pos, want.pos, follow);
    cam.target = lerp3(cam.target, want.target, follow);
    cam.fov = lerp(cam.fov, want.fov, follow);
    cam.roll = lerp(cam.roll, want.roll, follow);
    lastShot = cue.scene;
    lastPhase = cue.phase;
    // the shake as the peak tears (and a tremor as he roars)
    const quake = cue.phase !== 'scene' ? 0 : shot === 'lift' ? 0.32 * (1 - smooth(0.9, 1.4, s)) : shot === 'roar' ? 0.1 * smooth(0.3, 0.5, s) * (1 - smooth(1.2, 1.6, s)) : 0;
    const jit: V3 = quake > 0 ? [Math.sin(idle * 71) * quake, Math.sin(idle * 53 + 1) * quake, 0] : [0, 0, 0];
    const eye = add(cam.pos, jit);
    const look = add(cam.target, scale(jit, 0.6));
    const aspect = W / Math.max(1, H);
    const fovY = aspect < 16 / 9 ? 2 * Math.atan(Math.tan(cam.fov / 2) * (16 / 9 / aspect)) : cam.fov;
    const fwd = norm(sub(look, eye));
    const right0 = norm(cross(fwd, [0, 1, 0]));
    const up: V3 = norm(add(scale(cross(right0, fwd), Math.cos(cam.roll)), scale(right0, Math.sin(cam.roll))));
    const vp = mul(perspective(fovY, aspect, 0.3, 1200), lookAt(eye, look, up));
    const camRight = norm([right0[0], 0, right0[2]]);
    const camUp = norm(cross(camRight, fwd));

    // ── lights and colours of the set ──
    const himalaya = set === 'himalaya';
    const shown = himalaya ? spots.reduce((a, h) => a + herbsShown(shot, s, h.i), 0) / spots.length : 0;
    const glowSrc: V3 | null = peak ? add(peak.at, [0, 2.2 * peak.k, 0]) : himalaya ? [0, HERB_MT.h, 0] : null;
    const glowAmt = peak ? peak.glow : himalaya ? 0.25 + 0.75 * shown : 0.35;
    const glowDir: V3 = glowSrc ? norm(sub(glowSrc, eye)) : norm([0.1, 0.06, -1]);
    const gold = hexRgb(R.gold[1]);
    const fog: V3 = himalaya ? lerp3(hexRgb(R.lotus[3]), hexRgb(R.saffron[2]), 0.45) : lerp3(hexRgb(R.indigo[4]), hexRgb(R.indigo[3]), 0.5);
    // the field brightens as the peak comes (its light falls on the army)
    const lit = set === 'lanka' && peak ? smooth(0, 1, peak.glow) * (when === 'sea' ? 0.35 : 1) : 0;

    g.clearColor(0.05, 0.04, 0.1, 1);
    g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
    g.disable(g.CULL_FACE);
    // ── sky ──
    g.depthMask(false);
    g.disable(g.DEPTH_TEST);
    g.useProgram(r.sky.p);
    g.bindBuffer(g.ARRAY_BUFFER, r.domeBuf);
    const aSky = r.sky.a['aPos'] as number;
    g.enableVertexAttribArray(aSky);
    g.vertexAttribPointer(aSky, 3, g.FLOAT, false, 0, 0);
    g.uniformMatrix4fv(r.sky.u['uVP'] ?? null, false, vp);
    g.uniform3fv(r.sky.u['uCam'] ?? null, eye);
    if (himalaya) {
      // dawn-gold: deep indigo above, rose, gold at the horizon
      g.uniform3fv(r.sky.u['uTop'] ?? null, hexRgb(R.indigo[4]));
      g.uniform3fv(r.sky.u['uMid'] ?? null, lerp3(hexRgb(R.lotus[4]), hexRgb(R.indigo[3]), 0.35));
      g.uniform3fv(r.sky.u['uLow'] ?? null, lerp3(hexRgb(R.saffron[1]), hexRgb(R.gold[1]), 0.4));
    } else {
      g.uniform3fv(r.sky.u['uTop'] ?? null, scale(hexRgb(R.indigo[4]), 0.55));
      g.uniform3fv(r.sky.u['uMid'] ?? null, hexRgb(R.indigo[4]));
      g.uniform3fv(r.sky.u['uLow'] ?? null, lerp3(hexRgb(R.indigo[3]), hexRgb(R.lotus[4]), 0.35 + 0.4 * lit));
    }
    g.uniform3fv(r.sky.u['uGlowDir'] ?? null, glowDir);
    g.uniform3fv(r.sky.u['uGlowCol'] ?? null, gold);
    g.uniform1f(r.sky.u['uGlow'] ?? null, glowAmt);
    g.uniform1f(r.sky.u['uStars'] ?? null, himalaya ? 0.45 : 1);
    g.uniform1f(r.sky.u['uTime'] ?? null, idle);
    g.drawArrays(g.TRIANGLES, 0, r.domeN);
    g.disableVertexAttribArray(aSky);
    g.enable(g.DEPTH_TEST);
    g.depthMask(true);

    // ── the sea (night) or the sea of clouds (Himālaya) ──
    g.useProgram(r.sea.p);
    g.bindBuffer(g.ARRAY_BUFFER, himalaya ? r.cloudBuf : r.seaBuf);
    const aSea = r.sea.a['aPos'] as number;
    g.enableVertexAttribArray(aSea);
    g.vertexAttribPointer(aSea, 3, g.FLOAT, false, 0, 0);
    g.uniformMatrix4fv(r.sea.u['uVP'] ?? null, false, vp);
    g.uniform3fv(r.sea.u['uCam'] ?? null, eye);
    g.uniform3fv(r.sea.u['uSun'] ?? null, glowSrc ? norm(sub(glowSrc, [eye[0], 0, eye[2]])) : glowDir);
    g.uniform1f(r.sea.u['uTime'] ?? null, himalaya ? idle * 0.25 : idle);
    g.uniform3fv(r.sea.u['uDeep'] ?? null, himalaya ? lerp3(hexRgb(R.lotus[3]), hexRgb(R.indigo[2]), 0.4) : scale(hexRgb(R.ocean[5]), 0.8));
    g.uniform3fv(r.sea.u['uNear'] ?? null, himalaya ? lerp3(hexRgb(R.white[1]), hexRgb(R.lotus[1]), 0.5) : hexRgb(R.ocean[4]));
    g.uniform3fv(r.sea.u['uFog'] ?? null, fog);
    g.uniform3fv(r.sea.u['uSunCol'] ?? null, scale(gold, himalaya ? 0.35 : 0.3 + 0.9 * (peak ? peak.glow : 0)));
    g.drawArrays(g.TRIANGLES, 0, 6);
    g.disableVertexAttribArray(aSea);

    // ── mountains ──
    const drawMesh = (m: { buf: WebGLBuffer; n: number }, model: Float32Array, glow: V3, glowY: [number, number], fogR: [number, number]): void => {
      g.bindBuffer(g.ARRAY_BUFFER, m.buf);
      const aP = r.mesh.a['aPos'] as number;
      const aN = r.mesh.a['aNrm'] as number;
      const aC = r.mesh.a['aCol'] as number;
      g.enableVertexAttribArray(aP);
      g.enableVertexAttribArray(aN);
      g.enableVertexAttribArray(aC);
      g.vertexAttribPointer(aP, 3, g.FLOAT, false, 36, 0);
      g.vertexAttribPointer(aN, 3, g.FLOAT, false, 36, 12);
      g.vertexAttribPointer(aC, 3, g.FLOAT, false, 36, 24);
      g.uniformMatrix4fv(r.mesh.u['uM'] ?? null, false, model);
      g.uniform3fv(r.mesh.u['uGlow'] ?? null, glow);
      g.uniform2fv(r.mesh.u['uGlowY'] ?? null, glowY);
      g.uniform2fv(r.mesh.u['uFogR'] ?? null, fogR);
      g.drawArrays(g.TRIANGLES, 0, m.n);
      g.disableVertexAttribArray(aP);
      g.disableVertexAttribArray(aN);
      g.disableVertexAttribArray(aC);
    };
    if (himalaya || peak) {
      g.useProgram(r.mesh.p);
      g.uniformMatrix4fv(r.mesh.u['uVP'] ?? null, false, vp);
      g.uniform3fv(r.mesh.u['uCam'] ?? null, eye);
      g.uniform3fv(r.mesh.u['uFog'] ?? null, fog);
      if (himalaya) {
        g.uniform3fv(r.mesh.u['uLight'] ?? null, norm([-0.45, 0.55, 0.7]));
        g.uniform3fv(r.mesh.u['uLightCol'] ?? null, [1.0, 0.8, 0.55]);
        g.uniform3fv(r.mesh.u['uAmb'] ?? null, [0.32, 0.27, 0.45]);
        drawMesh(r.range, IDENT, [0, 0, 0], [99, 100], [80, 320]);
        drawMesh(r.rishabha, IDENT, scale(gold, 0.06 + 0.08 * shown), [6, 16], [40, 260]);
        drawMesh(r.kailasa, IDENT, [0, 0, 0], [99, 100], [40, 260]);
        // the herb mountain glows from its herbs (gone dim once they hide)
        const herbGlow = scale(gold, 0.05 + 0.3 * shown);
        if (peak) {
          drawMesh(r.herbBase, IDENT, herbGlow, [4, 9], [40, 260]);
        } else drawMesh(r.herbAll, IDENT, herbGlow, [5, 12.5], [40, 260]);
      } else {
        // the peak alone, lit by its own light
        g.uniform3fv(r.mesh.u['uLight'] ?? null, norm([0.2, 1, 0.3]));
        g.uniform3fv(r.mesh.u['uLightCol'] ?? null, [0.6, 0.5, 0.35]);
        g.uniform3fv(r.mesh.u['uAmb'] ?? null, [0.35, 0.3, 0.32]);
      }
      if (peak) drawMesh(r.herbPeak, modelMatrix(peak.at, peak.k, peak.roll, PEAK_CAP), scale(gold, 0.15 + 0.6 * peak.glow), [-50, -49], [60, 400]);
    }

    // ── the battlefield, Laṅkā on its hill (Laṅkā set) ──
    g.useProgram(r.tex.p);
    g.uniformMatrix4fv(r.tex.u['uVP'] ?? null, false, vp);
    g.uniform3fv(r.tex.u['uCam'] ?? null, eye);
    g.uniform1i(r.tex.u['uTex'] ?? null, 0);
    g.uniform3fv(r.tex.u['uFog'] ?? null, fog);
    g.activeTexture(g.TEXTURE0);
    const aPos = r.tex.a['aPos'] as number;
    const aUv = r.tex.a['aUv'] as number;
    const drawTex = (buf: WebGLBuffer, n: number, t: WebGLTexture, o: { alpha?: number; tint?: V3; fog?: [number, number]; cut?: boolean }): void => {
      g.enableVertexAttribArray(aPos);
      g.enableVertexAttribArray(aUv);
      g.bindBuffer(g.ARRAY_BUFFER, buf);
      g.vertexAttribPointer(aPos, 3, g.FLOAT, false, 20, 0);
      g.vertexAttribPointer(aUv, 2, g.FLOAT, false, 20, 12);
      g.bindTexture(g.TEXTURE_2D, t);
      g.uniform1f(r.tex.u['uAlpha'] ?? null, o.alpha ?? 1);
      g.uniform3fv(r.tex.u['uTint'] ?? null, o.tint ?? [1, 1, 1]);
      g.uniform2fv(r.tex.u['uFogR'] ?? null, o.fog ?? [40, 260]);
      g.uniform1f(r.tex.u['uCut'] ?? null, o.cut ? 1 : 0);
      g.drawArrays(g.TRIANGLES, 0, n);
      g.disableVertexAttribArray(aPos);
      g.disableVertexAttribArray(aUv);
    };
    const dynQuad = (data: Float32Array, t: WebGLTexture, o: Parameters<typeof drawTex>[3]): void => {
      g.bindBuffer(g.ARRAY_BUFFER, r.dyn);
      g.bufferData(g.ARRAY_BUFFER, data, g.DYNAMIC_DRAW);
      drawTex(r.dyn, 6, t, o);
    };
    const night: V3 = [0.42, 0.4, 0.62];
    const warm: V3 = [1.0, 0.86, 0.62];
    if (!himalaya) {
      drawTex(r.groundBuf, 6, r.tGround, { tint: lerp3(night, warm, lit), fog: [30, 140] });
      const lw = 64;
      const lh = (lw * 80) / 192;
      const [lx, ly, lz] = LANKA_CITY;
      g.enable(g.BLEND);
      g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
      dynQuad(new Float32Array([lx + lw / 2, ly, lz, 0, 1, lx - lw / 2, ly, lz, 1, 1, lx - lw / 2, ly + lh, lz, 1, 0, lx + lw / 2, ly, lz, 0, 1, lx - lw / 2, ly + lh, lz, 1, 0, lx + lw / 2, ly + lh, lz, 0, 0]), r.tLanka, { tint: lerp3([0.45, 0.4, 0.62], [0.8, 0.7, 0.75], lit), fog: [80, 420], cut: true });
      g.disable(g.BLEND);
    }

    // ── billboards (batched per texture) ──
    g.useProgram(r.bb.p);
    g.uniformMatrix4fv(r.bb.u['uVP'] ?? null, false, vp);
    g.uniform3fv(r.bb.u['uCam'] ?? null, eye);
    g.uniform1i(r.bb.u['uTex'] ?? null, 0);
    g.uniform3fv(r.bb.u['uFog'] ?? null, fog);
    const aBP = r.bb.a['aPos'] as number;
    const aBU = r.bb.a['aUv'] as number;
    const aBC = r.bb.a['aCol'] as number;
    const flush = (data: number[], t: WebGLTexture, mode: 0 | 1, fogR: [number, number]): void => {
      if (!data.length) return;
      g.bindBuffer(g.ARRAY_BUFFER, r.batch);
      g.bufferData(g.ARRAY_BUFFER, new Float32Array(data), g.DYNAMIC_DRAW);
      g.enableVertexAttribArray(aBP);
      g.enableVertexAttribArray(aBU);
      g.enableVertexAttribArray(aBC);
      g.vertexAttribPointer(aBP, 3, g.FLOAT, false, 36, 0);
      g.vertexAttribPointer(aBU, 2, g.FLOAT, false, 36, 12);
      g.vertexAttribPointer(aBC, 4, g.FLOAT, false, 36, 20);
      g.bindTexture(g.TEXTURE_2D, t);
      g.uniform1f(r.bb.u['uMode'] ?? null, mode);
      g.uniform2fv(r.bb.u['uFogR'] ?? null, fogR);
      g.drawArrays(g.TRIANGLES, 0, data.length / 9);
      g.disableVertexAttribArray(aBP);
      g.disableVertexAttribArray(aBU);
      g.disableVertexAttribArray(aBC);
    };
    /** a quad about `at` (bottom centre, or centre), rotated `ang` in the view plane (counter-clockwise) */
    const quad = (out: number[], at: V3, w: number, h: number, ang: number, bottom: boolean, u0: number, u1: number, col: Rgba, upAxis: V3 = [0, 1, 0]): void => {
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      const rv = add(scale(camRight, c), scale(upAxis, sn));
      const uv = sub(scale(upAxis, c), scale(camRight, sn));
      const base = bottom ? at : sub(at, scale(uv, h / 2));
      const a = sub(base, scale(rv, w / 2));
      const b = add(base, scale(rv, w / 2));
      const cc = add(b, scale(uv, h));
      const d = add(a, scale(uv, h));
      const v = (p: V3, u: number, t: number): void => void out.push(p[0], p[1], p[2], u, t, col[0], col[1], col[2], col[3]);
      v(a, u0, 1);
      v(b, u1, 1);
      v(cc, u1, 0);
      v(a, u0, 1);
      v(cc, u1, 0);
      v(d, u0, 0);
    };
    /** the 4-way frame of a figure at `at` facing `facing`, from where the camera stands */
    const frameOf = (at: V3, facing: number): [number, number] => {
      const toCam = Math.atan2(eye[0] - at[0], eye[2] - at[2]);
      let a = toCam - facing;
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      const dir = Math.abs(a) < Math.PI / 4 ? 0 : Math.abs(a) > (3 * Math.PI) / 4 ? 1 : a > 0 ? 2 : 3;
      return [dir / 4, (dir + 1) / 4];
    };
    const project = (p: V3): [number, number] => {
      const m = (i: number): number => vp[i] as number;
      const x = m(0) * p[0] + m(4) * p[1] + m(8) * p[2] + m(12);
      const y = m(1) * p[0] + m(5) * p[1] + m(9) * p[2] + m(13);
      const w = m(3) * p[0] + m(7) * p[1] + m(11) * p[2] + m(15);
      const ww = Math.abs(w) < 1e-4 ? 1e-4 : w;
      return [(x / ww) * aspect, y / ww];
    };
    const light: V3 = himalaya ? [1.0, 0.9, 0.78] : lerp3(night, warm, lit);
    const tint = (k: V3, a = 1): Rgba => [k[0], k[1], k[2], a];
    // the army: lying (struck by Indrajit's weapon), rising in 'revive'
    if (!himalaya) {
      const byTex = new Map<WebGLTexture, number[]>();
      army.forEach((f, i) => {
        const k = riseK(when, s, i);
        const ang = (1 - k) * (Math.PI / 2) * f.side;
        const h = f.id === 'vanara' ? 1.7 : 1.85;
        const w = (h * 2) / 3;
        const at: V3 = [f.at[0], (w / 2) * Math.abs(Math.sin(ang)), f.at[2]];
        // they face the field's front (the camera side), looking up as they rise
        const [u0, u1] = frameOf(f.at, 0);
        const t = f.id === 'rama' ? r.tRama : f.id === 'lakshmana' ? r.tLak : r.tVanara;
        const list = byTex.get(t) ?? [];
        quad(list, at, w, h, ang, true, u0, u1, tint(light));
        byTex.set(t, list);
      });
      for (const [t, list] of byTex) flush(list, t, 0, [40, 220]);
    }
    // Hanumān
    if (hero.show) {
      const w = (hero.h * 2) / 3;
      const [u0, u1] = frameOf(hero.pos, hero.facing);
      let ang = 0;
      if (hero.fly > 0.01 && Math.hypot(hero.vel[0], hero.vel[1], hero.vel[2]) > 0.01) {
        const centre = add(hero.pos, [0, hero.h / 2, 0]);
        const p0 = project(centre);
        const p1 = project(add(centre, scale(hero.vel, 0.05)));
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        if (Math.hypot(dx, dy) > 1e-5) ang = Math.max(-1.9, Math.min(1.9, Math.atan2(-dx, dy))) * hero.fly;
      }
      const list: number[] = [];
      if (ang === 0) quad(list, hero.pos, w, hero.h, 0, true, u0, u1, tint(light));
      else quad(list, add(hero.pos, [0, hero.h / 2, 0]), w, hero.h, ang, false, u0, u1, tint(light));
      flush(list, r.tHero, 0, [60, 400]);
    }
    // debris as the peak tears (rocks flung out and falling)
    if (when === 'lift' && s < 2.4) {
      const list: number[] = [];
      for (let i = 0; i < 18; i++) {
        const th = (i / 18) * Math.PI * 2 + (ihash(i, 1, 9) % 100) / 50;
        const sp = 3 + (ihash(i, 2, 9) % 100) / 25;
        const u = Math.max(0, s - 0.1 - (i % 4) * 0.08);
        if (u <= 0) continue;
        const p: V3 = add(PEAK_CAP, [Math.sin(th) * sp * u, 1.2 + 6 * u - 9 * u * u, Math.cos(th) * sp * u]);
        if (p[1] < -2) continue;
        quad(list, p, 0.5, 0.5, idle * 3 + i, false, 0, 1, tint(lerp3([0.55, 0.45, 0.4], [1, 0.9, 0.7], 0.3)), camUp);
      }
      flush(list, r.tRock, 0, [60, 400]);
    }
    // lights: the herbs, the roar's aura, the peak's blaze, the scent drifting over the army
    g.enable(g.BLEND);
    g.blendFunc(g.ONE, g.ONE);
    g.depthMask(false);
    const lights: number[] = [];
    if (himalaya && !peak) {
      for (const h of spots) {
        let a = herbsShown(shot, s, h.i);
        if (a <= 0.001) continue;
        const fl = 0.75 + 0.25 * Math.sin(idle * 5 + h.i * 1.9);
        if (shot === 'search' && a < 1) a *= 0.5 + 0.5 * Math.sign(Math.sin(idle * 38 + h.i * 2.3));
        quad(lights, h.at, 1.7, 1.7, 0, false, 0, 1, [h.col[0], h.col[1], h.col[2], a * fl], camUp);
        quad(lights, h.at, 4.4, 4.4, 0, false, 0, 1, [h.col[0], h.col[1], h.col[2], 0.3 * a * fl], camUp);
      }
    }
    if (hero.aura > 0.01) {
      const pulse = 0.8 + 0.2 * Math.sin(idle * 9);
      quad(lights, add(hero.pos, [0, hero.h * 0.55, -0.3]), hero.h * 1.3, hero.h * 1.4, 0, false, 0, 1, [1, 0.45, 0.2, 0.5 * hero.aura * pulse], camUp);
    }
    if (peak) {
      const c = add(peak.at, [0, 2.2 * peak.k, 0]);
      const big = 11 * peak.k * (0.95 + 0.05 * Math.sin(idle * 3));
      quad(lights, c, big, big, 0, false, 0, 1, [1, 0.85, 0.45, 0.55 * peak.glow], camUp);
      quad(lights, c, big * 2.2, big * 2.2, 0, false, 0, 1, [1, 0.7, 0.35, 0.25 * peak.glow], camUp);
    }
    if (when === 'revive' || when === 'after') {
      // the scent of the herbs: golden motes drifting down over the field (6.74.73)
      const from = peak ? peak.at : ([0, 9, -14] as V3);
      const start = when === 'after' ? 1 : smooth(0.3, 1.0, s);
      for (let i = 0; i < 26; i++) {
        const cyc = (idle * 0.35 + (ihash(i, 4, 7) % 100) / 100) % 1;
        const th = (ihash(i, 5, 7) % 628) / 100;
        const rr = 2 + cyc * (6 + (ihash(i, 6, 7) % 8));
        const p: V3 = [from[0] + Math.sin(th) * rr, from[1] - cyc * 11.5, from[2] + Math.cos(th) * rr * 0.8 + cyc * 15];
        const a = start * Math.sin(Math.PI * cyc);
        quad(lights, p, 0.45, 0.45, 0, false, 0, 1, [1, 0.88, 0.5, a], camUp);
      }
    }
    flush(lights, r.tGlow, 1, [200, 900]);
    g.depthMask(true);
    g.disable(g.BLEND);

    // ── the battle frame (drawn last): upright and opaque at the ends, folded back and gone in 3D ──
    const fp = framePlane(cue.phase, cue.k);
    if (fp.alpha > 0.002) {
      g.useProgram(r.tex.p);
      if (frame && cue.phase !== 'scene' && performance.now() - lastFrameUpload > 30) {
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
      const sn = Math.sin(fp.tilt);
      const top: V3 = [0, FRAME.h * c, FRAME.z - FRAME.h * sn];
      const v = new Float32Array([-hw, 0, FRAME.z, 0, 1, hw, 0, FRAME.z, 1, 1, hw, top[1], top[2], 1, 0, -hw, 0, FRAME.z, 0, 1, hw, top[1], top[2], 1, 0, -hw, top[1], top[2], 0, 0]);
      g.disable(g.DEPTH_TEST);
      g.enable(g.BLEND);
      g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
      dynQuad(v, r.tFrame, { alpha: fp.alpha, fog: [1000, 2000] });
      g.disable(g.BLEND);
      g.enable(g.DEPTH_TEST);
    }
    // ── the flash as the peak tears away ──
    const flash = cue.phase === 'scene' && shot === 'lift' ? 0.85 * (1 - smooth(0, 0.45, s)) : 0;
    if (flash > 0.01) {
      g.disable(g.DEPTH_TEST);
      g.enable(g.BLEND);
      g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
      g.useProgram(r.full.p);
      g.bindBuffer(g.ARRAY_BUFFER, r.fullBuf);
      const aXY = r.full.a['aXY'] as number;
      g.enableVertexAttribArray(aXY);
      g.vertexAttribPointer(aXY, 2, g.FLOAT, false, 0, 0);
      g.uniform4fv(r.full.u['uCol'] ?? null, [1, 0.97, 0.85, flash]);
      g.drawArrays(g.TRIANGLES, 0, 6);
      g.disableVertexAttribArray(aXY);
      g.disable(g.BLEND);
      g.enable(g.DEPTH_TEST);
    }
  }

  return {
    render,
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

export const SCENES_D: Record<string, Scene3DFactory> = { herbs: createHerbsScene };
