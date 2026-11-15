/**
 * v0.6 told-cutscene painters of package D (the 2D still of the herbs mountain: reduced motion / no WebGL). OWNER: v0.6 WP-D.
 * Registered by WP0 (cutscene-paint.ts merges PAINTERS_D); content/cutscene-herbs.json names it with "painter": "d".
 * A painter paints the 320 × 180 backdrop of the current shot (`cue.scene`, from the { "scene": key } steps); the engine
 * draws the cast, props and kit effects on top (this scene has no cast: everything is painted here; the engine adds the
 * flash and the shake as the peak tears). With `cue.reduced` every shot is a still frame (nothing moves with time); without
 * it (no WebGL, a lost context) the same pictures move a little: Hanumān's flights, the herbs winking out, the peak lifted,
 * the army rising. The shots and their verses: cutscene3d-herbs.ts (the 3D scene) and notes/v06-d.md.
 * Painters run only in the browser; keep module scope free of DOM work (tests import this file).
 */
import type { Art } from './art';
import { R } from './art-palette';
import { hash2, makeCanvas } from './art-core';
import type { SpriteId } from './catalog';
import type { Painter, PaintCue } from './cutscene-paint';
import { lankaCanvas, smooth, spriteStrip } from './cutscene3d';
import { herbShot, herbsShown, ihash, riseK } from './cutscene3d-herbs';

const W = 320;
const H = 180;
type G = CanvasRenderingContext2D;

function fill(g: G, c: string, x: number, y: number, w: number, h: number): void {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

/** A dithered vertical gradient through `cols` over rows y0..y1. */
function bands(g: G, y0: number, y1: number, cols: string[], seed: number): void {
  for (let y = y0; y < y1; y++) {
    const f = ((y - y0) / Math.max(1, y1 - y0)) * (cols.length - 1);
    const i = Math.floor(f);
    for (let x = 0; x < W; x += 4) {
      const d = ihash(x >> 2, y, seed) % 100 < (f - i) * 100 ? 1 : 0;
      fill(g, cols[Math.min(cols.length - 1, i + d)] as string, x, y, 4, 1);
    }
  }
}

function stars(g: G, yMax: number, n: number, seed: number): void {
  for (let i = 0; i < n; i++) {
    const x = ihash(i, 1, seed) % W;
    const y = ihash(i, 2, seed) % yMax;
    fill(g, i % 5 === 0 ? R.white[0] : R.white[2], x, y, 1, 1);
  }
}

/** A soft round light (stepped alpha rings). */
function glow(g: G, x: number, y: number, r: number, color: string, alpha: number): void {
  if (alpha <= 0.01 || r <= 0) return;
  const prev = g.globalAlpha;
  g.fillStyle = color;
  for (let k = 3; k >= 1; k--) {
    g.globalAlpha = prev * alpha * (k === 1 ? 0.9 : k === 2 ? 0.35 : 0.15);
    g.beginPath();
    g.arc(x, y, (r * k) / 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = prev;
}

type Kind = 'herb' | 'rishabha' | 'kailasa' | 'range';
/** A mountain painted column by column (light from the left; snow above `snow` of its height; strata on Kailāsa). */
function mountain(g: G, cx: number, baseY: number, halfW: number, h: number, kind: Kind, seed: number): void {
  for (let x = Math.max(0, Math.floor(cx - halfW)); x < Math.min(W, Math.ceil(cx + halfW)); x++) {
    const d = Math.abs(x - cx) / halfW;
    const prof = kind === 'kailasa' ? Math.pow(1 - d, 0.75) : kind === 'herb' ? Math.pow(1 - d, 1.25) : Math.pow(1 - d, 1.05);
    const jag = (2.5 * Math.sin(x * 0.21 + seed) + ((ihash(x, 1, seed) % 5) - 2)) * (1 - d * 0.5);
    const ridge = 1 + 0.07 * Math.sin(x * 0.09 + seed * 1.7) * d;
    const top = Math.round(baseY - h * prof * ridge + jag * 0.6);
    const lit = x < cx;
    for (let y = Math.max(0, top); y < Math.min(H, baseY); y++) {
      const fy = (baseY - y) / h;
      const hs = ihash(x, y, seed) % 7;
      const speck = ihash(x, y, seed + 1) % 41 === 0;
      let c: string;
      if (kind === 'kailasa') c = Math.floor(fy * 10 + Math.sin(x * 0.08) * 0.4) % 3 === 1 && y - top > 2 && hs > 1 ? (lit ? R.white[2] : R.rock[2]) : lit ? (hs ? R.white[0] : R.white[1]) : hs ? R.white[2] : R.white[3];
      else if (kind === 'range') c = fy > 0.55 && y - top < 14 ? (lit ? R.white[1] : R.white[2]) : lit ? R.mountain[3] : R.mountain[4];
      else if (kind === 'rishabha') c = fy > 0.86 && y - top < 6 ? R.white[1] : lit ? (hs ? R.gold[2] : R.gold[1]) : hs ? R.gold[3] : R.earth[3];
      else c = fy > 0.86 && y - top < 6 ? R.white[1] : speck ? R.gold[1] : fy > 0.55 ? (lit ? (hs ? R.leaf[2] : R.leaf[1]) : R.leaf[3]) : lit ? (hs ? R.leaf[3] : R.leaf[2]) : R.leafDark[2];
      fill(g, c, x, y, 1, 1);
    }
  }
}

/** A sea of clouds from row y0 down. */
function cloudSea(g: G, y0: number): void {
  const cols = [R.white[0], R.lotus[0], R.lotus[1], R.lotus[1], R.lotus[2], R.lotus[2], R.lotus[3]];
  for (let x = 0; x < W; x++) {
    const top = Math.round(y0 + 3 * Math.sin(x * 0.07) + 2 * Math.sin(x * 0.19 + 1));
    for (let y = top; y < H; y++) {
      // soft rolls of cloud: a wave per band, lighter on their tops
      const roll = Math.sin(x * 0.05 + y * 0.6) + Math.sin(x * 0.11 - y * 0.3);
      const f = Math.min(cols.length - 1, Math.max(0, Math.floor((y - top) / 9 + (roll > 1.2 ? -1 : roll < -1.2 ? 1 : 0))));
      fill(g, y - top < 2 ? R.white[0] : (cols[f] as string), x, y, 1, 1);
    }
  }
}

// ───────────────────────── cached layers ─────────────────────────

const layers = new Map<string, HTMLCanvasElement | null>();
function layer(key: string, paint: (g: G) => void): HTMLCanvasElement | null {
  if (layers.has(key)) return layers.get(key) ?? null;
  const c = makeCanvas(W, H);
  const g = c?.getContext('2d');
  if (c && g) {
    g.imageSmoothingEnabled = false;
    paint(g);
  }
  layers.set(key, c);
  return c;
}

const strips = new WeakMap<Art, Map<SpriteId, HTMLCanvasElement | null>>();
function strip(art: Art, id: SpriteId): HTMLCanvasElement | null {
  let m = strips.get(art);
  if (!m) strips.set(art, (m = new Map()));
  if (!m.has(id)) m.set(id, spriteStrip(art, id));
  return m.get(id) ?? null;
}

/** A figure from its 4-way strip (0 front, 1 back, 2 left, 3 right), feet at (x, y), scaled, rotated about the feet. */
function figure(g: G, art: Art, id: SpriteId, dir: number, x: number, y: number, k: number, ang = 0): void {
  const s = strip(art, id);
  if (!s) return;
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (ang) g.rotate(ang);
  g.drawImage(s, dir * 16, 0, 16, 24, Math.round(-8 * k), Math.round(-24 * k), Math.round(16 * k), Math.round(24 * k));
  g.restore();
}

const DAWN = [R.indigo[4], R.indigo[3], R.lotus[4], R.lotus[3], R.saffron[2], R.saffron[1], R.gold[1]] as string[];
const NIGHT = [R.indigo[4], R.indigo[4], R.indigo[3], R.lanka[1], R.lotus[4]] as string[];

function lankaNight(g: G, horizon: number): void {
  bands(g, 0, horizon, NIGHT, 3);
  stars(g, horizon - 20, 60, 5);
  const sea = [R.ocean[4], R.ocean[5], R.ocean[5]];
  for (let y = horizon; y < H; y++) fill(g, sea[Math.min(2, Math.floor(((y - horizon) / (H - horizon)) * 3))] as string, 0, y, W, 1);
  for (let i = 0; i < 40; i++) fill(g, R.ocean[3], ihash(i, 3, 9) % W, horizon + 2 + (ihash(i, 4, 9) % (H - horizon - 2)), 3, 1);
}

/** The battlefield at night with the fallen army lying on it (the opening shot). */
function fieldBg(art: Art): HTMLCanvasElement | null {
  return layer('field', (g) => {
    lankaNight(g, 104);
    const lk = lankaCanvas();
    if (lk) {
      g.globalAlpha = 0.85;
      g.drawImage(lk, 0, 0, 192, 80, -24, 104 - 46, 138, 58);
      g.globalAlpha = 1;
    }
    for (let y = 138; y < H; y++) for (let x = 0; x < W; x += 2) fill(g, ihash(x, y, 4) % 9 === 0 ? R.lankaFloor[1] : y < 142 ? R.lankaFloor[1] : R.lankaFloor[2], x, y, 2, 1);
    // the fallen (Indrajit's weapon, 6.73): figures lying on the field
    const fallen: [SpriteId, number, number, number][] = [['vanara', 40, 160, 1], ['vanara', 92, 172, -1], ['rama', 128, 164, -1], ['lakshmana', 196, 166, 1], ['vanara', 244, 158, 1], ['vanara', 286, 172, -1], ['vanara', 20, 176, 1]];
    for (const [id, x, y, side] of fallen) figure(g, art, id, 0, x, y, 1, (side * Math.PI) / 2);
  });
}

function himalayaBg(): HTMLCanvasElement | null {
  return layer('himalaya', (g) => {
    bands(g, 0, 124, DAWN, 7);
    stars(g, 40, 30, 8);
    // the far range, then golden Ṛṣabha (left) and white Kailāsa (right) with the herb mountain between (6.74.30–31)
    for (const [cx, hw, h, sd] of [[30, 70, 60, 1], [120, 80, 74, 2], [210, 70, 66, 3], [300, 80, 70, 4]] as const) mountain(g, cx, 124, hw, h, 'range', sd);
    mountain(g, 72, 128, 70, 82, 'rishabha', 11);
    mountain(g, 252, 128, 72, 90, 'kailasa', 12);
    mountain(g, 160, 132, 64, 76, 'herb', 13);
    cloudSea(g, 120);
  });
}

/** Close on the herb mountain: the whole of it, or its base with the peak gone (`torn`). */
function summitBg(torn: boolean): HTMLCanvasElement | null {
  return layer(torn ? 'summit-torn' : 'summit', (g) => {
    bands(g, 0, 160, DAWN, 9);
    stars(g, 36, 24, 10);
    mountain(g, -20, 150, 90, 120, 'rishabha', 21);
    mountain(g, 345, 150, 95, 135, 'kailasa', 22);
    const m = makeCanvas(W, H);
    const mg = m?.getContext('2d');
    if (m && mg) {
      mountain(mg, 160, 200, 200, 136, 'herb', 23);
      if (torn) {
        g.drawImage(m, 0, PEAK_CUT, W, H - PEAK_CUT, 0, PEAK_CUT, W, H - PEAK_CUT);
        // the broken rock where the peak was
        for (let x = 110; x < 210; x++) fill(g, ihash(x, 1, 5) % 3 ? R.cliff[3] : R.earth[3], x, PEAK_CUT + (ihash(x, 2, 5) % 3), 1, 3);
      } else g.drawImage(m, 0, 0);
    }
    cloudSea(g, 156);
  });
}
/** The row where the peak tears off (summit close-up). */
const PEAK_CUT = 104;
/** The peak alone (rows above PEAK_CUT of the close-up's mountain), for lifting. */
function peakImg(): HTMLCanvasElement | null {
  return layer('peak', (g) => {
    const m = makeCanvas(W, H);
    const mg = m?.getContext('2d');
    if (!m || !mg) return;
    mountain(mg, 160, 200, 200, 136, 'herb', 23);
    g.drawImage(m, 0, 0, W, PEAK_CUT + 2, 0, 0, W, PEAK_CUT + 2);
    for (let x = 110; x < 210; x++) fill(g, R.cliff[4], x, PEAK_CUT + 1, 1, 2);
  });
}

function seaBg(): HTMLCanvasElement | null {
  return layer('sea', (g) => {
    lankaNight(g, 92);
    const lk = lankaCanvas();
    if (lk) {
      g.globalAlpha = 0.8;
      g.drawImage(lk, 0, 0, 192, 80, 8, 92 - 30, 90, 38);
      g.globalAlpha = 1;
    }
  });
}

function reviveBg(): HTMLCanvasElement | null {
  return layer('revive', (g) => {
    bands(g, 0, 96, NIGHT, 12);
    stars(g, 50, 40, 13);
    const lk = lankaCanvas();
    if (lk) {
      g.globalAlpha = 0.75;
      g.drawImage(lk, 0, 0, 192, 80, -30, 96 - 40, 120, 50);
      g.globalAlpha = 1;
    }
    // the battlefield, warm under the peak's light
    for (let y = 96; y < H; y++) for (let x = 0; x < W; x += 2) fill(g, ihash(x, y, 6) % 11 === 0 ? R.earth[3] : y < 120 ? R.earth[4] : R.mud[3], x, y, 2, 1);
    g.globalAlpha = 0.28;
    g.fillStyle = R.gold[1];
    g.beginPath();
    g.ellipse(160, 140, 170, 46, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  });
}

// ───────────────────────── the painter ─────────────────────────

const HERB_COLS = [R.gold[1], R.white[0], R.saffron[0], R.leaf[0]] as string[];
/** The herb lights on the close-up's summit (x, y). */
const HERB_AT: [number, number][] = Array.from({ length: 12 }, (_, i) => [160 + (((ihash(i, 1, 3) % 100) / 100) * 2 - 1) * 70, 74 + (ihash(i, 2, 3) % 40)]);

/** Hanumān with the peak over his head, glowing like the sun (6.74.69), feet at (x, y), scale k. */
function heroWithPeak(g: G, art: Art, x: number, y: number, k: number, glowK: number): void {
  const pk = peakImg();
  const top = y - 24 * k;
  glow(g, x, top - 30 * (k / 3.5), 60 * (k / 3.5), R.gold[1], 0.5 * glowK);
  if (pk) {
    const s = k / 3.5;
    // the peak image spans x 110..210 above PEAK_CUT; its base sits on his head
    g.drawImage(pk, 96, 30, 128, PEAK_CUT - 28, Math.round(x - 64 * s), Math.round(top - (PEAK_CUT - 28) * s), Math.round(128 * s), Math.round((PEAK_CUT - 28) * s));
  }
  figure(g, art, 'hanuman', 0, x, y, k);
}

export const paintHerbs: Painter = (g: G, cue: PaintCue, art: Art) => {
  g.imageSmoothingEnabled = false;
  const shot = herbShot(cue.scene);
  const still = cue.reduced;
  const s = still ? 99 : Math.max(0, cue.t) / 1000;
  const tw = still ? 0 : cue.time / 1000;
  const bg = (c: HTMLCanvasElement | null): void => {
    if (c) g.drawImage(c, 0, 0);
    else fill(g, R.indigo[4], 0, 0, W, H);
  };
  switch (shot) {
    case 'north': {
      bg(fieldBg(art));
      if (cue.scene === '') {
        // before the first shot: he stands among the fallen (6.74.7–13)
        figure(g, art, 'hanuman', 1, 160, 156, 1.2);
        break;
      }
      // he leaps into the sky and away north (6.74.49)
      const u = still ? 1.6 : Math.max(0, s - 0.5);
      const x = 160 + 46 * u;
      const y = 156 - 120 * (1 - Math.exp(-1.4 * u));
      const k = Math.max(0.7, 1.2 - 0.18 * u);
      figure(g, art, 'hanuman', 1, x, y, k, u > 0 ? 0.5 : 0);
      break;
    }
    case 'himalaya': {
      bg(himalayaBg());
      glow(g, 160, 60, 22, R.gold[1], 0.55 + (still ? 0 : 0.1 * Math.sin(tw * 4)));
      for (let i = 0; i < 8; i++) glow(g, 160 + ((ihash(i, 3, 2) % 40) - 20), 58 + (ihash(i, 4, 2) % 18), 2.5, HERB_COLS[i % 4] as string, 0.8 + (still ? 0 : 0.2 * Math.sin(tw * 6 + i)));
      // Hanumān flies in and lands on the summit (6.74.56–62)
      const u = still ? 0.82 : smooth(0.2, 4.6, s);
      const x = 300 - 140 * u;
      const y = 20 + 34 * u * u + 2;
      figure(g, art, 'hanuman', u < 1 ? 2 : 0, x, y, 0.75, u < 1 ? -1.1 * (1 - u) : 0);
      break;
    }
    case 'search':
    case 'hidden': {
      bg(summitBg(false));
      if (shot === 'hidden') {
        g.globalAlpha = 0.18;
        fill(g, R.indigo[4], 0, 0, W, H);
        g.globalAlpha = 1;
      }
      // the four herbs (6.74.32–33) blazing; during 'search' they wink out one by one (6.74.64)
      for (let i = 0; i < HERB_AT.length; i++) {
        const [hx, hy] = HERB_AT[i] as [number, number];
        let a = shot === 'search' ? (still ? 1 : herbsShown('search', s, i)) : 0;
        if (!still && a > 0 && a < 1) a *= Math.sin(tw * 40 + i) > 0 ? 1 : 0.3;
        glow(g, hx, hy, 9, HERB_COLS[i % 4] as string, 0.35 * a);
        glow(g, hx, hy, 3, HERB_COLS[i % 4] as string, a);
      }
      const look = shot === 'search' ? Math.sin(s * 1.6) : Math.sin(tw * 0.9);
      figure(g, art, 'hanuman', still ? 0 : look > 0.5 ? 3 : look < -0.5 ? 2 : 0, 160, 76, 2);
      break;
    }
    case 'roar': {
      bg(summitBg(false));
      // on the mountain's shoulder he grows and roars (6.74.65)
      const gk = still ? 1 : smooth(0.2, 1.8, s);
      const k = 2 + 1.6 * gk;
      glow(g, 160, 176 - 12 * k, 22 * k, R.saffron[1], (0.35 + (still ? 0 : 0.08 * Math.sin(tw * 9))) * (still ? 1 : smooth(0.1, 0.8, s)));
      figure(g, art, 'hanuman', 0, 160, 178, k);
      break;
    }
    case 'lift': {
      bg(summitBg(true));
      // he tears off the peak (6.74.67), raises it and leaps into the sky with it (6.74.68)
      const up = still ? 0 : Math.max(0, s - 2.6);
      const k = 3.6;
      const fx = 160;
      const fy = 178 - 46 * up * up;
      const to = still ? 1 : smooth(1.3, 2.6, s);
      if (to < 1) {
        const pk = peakImg();
        const lift = (still ? 1 : smooth(0.15, 1.3, s)) * 10;
        const jit = !still && s < 1.3 ? Math.round(Math.sin(tw * 50) * 2) : 0;
        // from where it tore, onto his head (its base meets his head as `to` reaches 1)
        const dy = (1 - to) * -lift + to * (fy - 24 * k - PEAK_CUT);
        if (pk) g.drawImage(pk, jit, Math.round(dy));
        if (!still && s < 2) for (let i = 0; i < 14; i++) {
          const v = Math.max(0, s - 0.1);
          fill(g, R.cliff[3], Math.round(160 + (((ihash(i, 1, 4) % 100) / 50) - 1) * 70 * v), Math.round(PEAK_CUT - 30 * v + 60 * v * v + (ihash(i, 2, 4) % 10)), 2, 2);
        }
        figure(g, art, 'hanuman', 0, fx, fy, k);
      } else heroWithPeak(g, art, fx, fy, k, still ? 1 : smooth(1.3, 3.0, s));
      break;
    }
    case 'sea': {
      bg(seaBg());
      // back over the sea, shining like the sun (6.74.69): the peak's light on the water
      const x = still ? 176 : 290 - 80 * Math.min(s, 2.5);
      for (let y = 96; y < H; y += 2) {
        const w = 4 + (y - 92) * 0.5;
        for (let i = 0; i < 3; i++) if (ihash(i, y, still ? 0 : Math.floor(tw * 8)) % 2) fill(g, R.gold[i === 0 ? 0 : 1], Math.round(x - w / 2 + ((ihash(i, y, 7) % 100) / 100) * w), y, 3, 1);
      }
      heroWithPeak(g, art, x, 82, 1.6, 1);
      break;
    }
    case 'revive': {
      bg(reviveBg());
      // the scent of the herbs (6.74.73): golden motes over the field; Rāma, Lakṣmaṇa and the vānaras rise (6.74.74)
      heroWithPeak(g, art, 160, 76 - (still ? 0 : 10 * (1 - smooth(0, 2.6, s))), 1.4, 1);
      for (let i = 0; i < 24; i++) {
        const cyc = still ? ((ihash(i, 9, 1) % 100) / 100) : (tw * 0.35 + (ihash(i, 9, 1) % 100) / 100) % 1;
        const mx = 160 + (((ihash(i, 8, 1) % 200) / 100) - 1) * (30 + 120 * cyc);
        const my = 70 + 90 * cyc;
        fill(g, R.gold[i % 3 === 0 ? 0 : 1], Math.round(mx), Math.round(my), 1, 1);
      }
      const army: [SpriteId, number, number, number][] = [['rama', 136, 160, -1], ['lakshmana', 184, 158, 1], ['vanara', 40, 150, 1], ['vanara', 84, 172, -1], ['vanara', 236, 150, -1], ['vanara', 280, 170, 1], ['vanara', 108, 132, 1], ['vanara', 216, 130, -1], ['vanara', 22, 128, -1], ['vanara', 300, 132, 1]];
      army.forEach(([id, x, y, side], i) => {
        const k = still ? 1 : riseK('revive', s, i);
        figure(g, art, id, 0, x, y, i < 2 ? 1.4 : 1.15, k >= 1 ? 0 : ((1 - k) * side * Math.PI) / 2);
      });
      break;
    }
  }
};

export const PAINTERS_D: Record<string, Painter> = { d: paintHerbs };
