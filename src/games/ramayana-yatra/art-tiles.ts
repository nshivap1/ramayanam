/** 16x16 overworld tiles, generated procedurally into Pix buffers. OWNER: art. */
import type { TileId } from './catalog';
import { type C, Pix, hash2, strSeed } from './art-core';
import { INK, R } from './art-palette';

export interface TileDef {
  frames: number;
  fps: number;
  draw: (p: Pix, f: number) => void;
}

type R5 = readonly string[];
const at = <T>(a: readonly T[], i: number): T => a[Math.max(0, Math.min(a.length - 1, i))] as T;

// ───────────────────────── shared layers ─────────────────────────

/** When true, ground helpers draw nothing so object tiles can be built on a transparent layer. */
let bgOff = false;

function speckle(p: Pix, seed: number, chance: number, c: C, x0 = 0, y0 = 0, w = 16, h = 16): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (hash2(x, y, seed) < chance) p.set(x, y, c);
}

function grassBg(p: Pix, seed = 1, tufts = true): void {
  if (bgOff) return;
  p.rect(0, 0, 16, 16, R.grass[1]);
  speckle(p, seed, 0.035, R.grass[0]);
  speckle(p, seed + 7, 0.03, R.grass[2]);
  if (!tufts) return;
  // two low-contrast blade tufts at irregular spots so large fields do not form a visible grid
  const spots: [number, number][] = [
    [3, 5],
    [11, 12],
  ];
  for (const [x, y] of spots) {
    p.set(x, y, R.grass[2]);
    p.set(x + 2, y, R.grass[2]);
    p.set(x + 1, y + 1, R.grass[2]);
    p.set(x + 1, y - 1, R.grass[0]);
  }
}

function earthBg(p: Pix, seed = 2): void {
  if (bgOff) return;
  p.rect(0, 0, 16, 16, R.earth[1]);
  speckle(p, seed, 0.06, R.earth[0]);
  speckle(p, seed + 3, 0.06, R.earth[2]);
  const peb: [number, number][] = [
    [3, 3],
    [11, 6],
    [6, 12],
  ];
  for (const [x, y] of peb) {
    if (hash2(x, y, seed) < 0.3) continue;
    p.set(x, y, R.earth[3]);
    p.set(x + 1, y, R.earth[3]);
    p.set(x, y - 1, R.earth[0]);
  }
}

/** Shared animated water so every water-bearing tile lines up with its neighbours. */
function waterLayer(p: Pix, f: number, ramp: R5, x0 = 0, y0 = 0, w = 16, h = 16, foam = false): void {
  p.rect(x0, y0, w, h, at(ramp, 2));
  const rows = [2, 7, 12];
  for (let k = 0; k < rows.length; k++) {
    const yy = rows[k] as number;
    const ph = (f * 4 + k * 6 + (k === 1 ? 9 : 0)) % 16;
    const pts: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 0],
    ];
    for (const [dx, dy] of pts) {
      const x = (ph + dx) % 16;
      const y = yy + dy;
      if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) p.set(x, y, at(ramp, 1));
    }
    const sx = (ph + 2) % 16;
    if (sx >= x0 && sx < x0 + w && yy >= y0 && yy < y0 + h && (f + k) % 2 === 0) p.set(sx, yy, at(ramp, 0));
    // darker trough
    const tx = (ph + 9) % 16;
    for (let d = 0; d < 3; d++) {
      const x = (tx + d) % 16;
      const y = yy + 3;
      if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) p.set(x, y, at(ramp, 3));
    }
  }
  if (foam) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) if (hash2(x, y, 40 + f) < 0.025) p.set(x, y, at(ramp, 0));
  }
}

/** Draw an object onto a scratch layer, outline it, then composite. */
function obj(p: Pix, draw: (q: Pix) => void, outline: C = INK, diag = false): void {
  const q = new Pix(16, 16);
  draw(q);
  q.outline(outline, diag);
  p.blit(q, 0, 0);
}

function shadow(p: Pix, cx: number, cy: number, rx: number, ry: number, c: C = '#00000040'): void {
  if (bgOff) c = '#1a0c2058';
  // darken by blending a fixed shadow colour over the ground (pre-mixed per ramp for crispness)
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) p.set(x, y, c);
    }
}

function flame(q: Pix, cx: number, by: number, f: number, size = 1): void {
  const h = [5, 6, 5, 4][f % 4] as number;
  const sway = [0, 1, 0, -1][f % 4] as number;
  const H = Math.round(h * size);
  for (let i = 0; i < H; i++) {
    const t = i / H;
    const half = Math.max(0, Math.round((1 - t) * 1.6 * size - 0.2));
    const x = cx + Math.round(sway * t);
    for (let dx = -half; dx <= half; dx++) {
      const edge = Math.abs(dx) === half && half > 0;
      q.set(x + dx, by - i, edge ? R.fire[3] : t > 0.6 ? R.fire[2] : R.fire[1]);
    }
  }
  q.set(cx + sway, by - H, R.fire[3]);
  q.set(cx, by, R.fire[0]);
}

// ───────────────────────── nature ─────────────────────────

const TUFT = ['a..a...a', 'ba.ba.ab', 'bb.bb.bb', 'cbbcbbbc', 'ccbccbcc', 'dccdccdd', 'eddddddd'];
const TUFT_SWAY = ['.a..a...', 'ab.ab.a.', 'bb.bb.bb', 'cbbcbbbc', 'ccbccbcc', 'dccdccdd', 'eddddddd'];

function kusha(p: Pix, f = 0): void {
  p.rect(0, 0, 16, 16, R.kusha[3]);
  speckle(p, 9, 0.08, R.kusha[4]);
  const pal = { a: R.kusha[0], b: R.kusha[1], c: R.kusha[2], d: R.kusha[3], e: R.kusha[4] };
  for (const [x, y, row] of [
    [0, 1, 0],
    [8, 1, 0],
    [-4, 9, 1],
    [4, 9, 1],
    [12, 9, 1],
  ] as [number, number, number][])
    p.grid((f + row) % 2 ? TUFT_SWAY : TUFT, pal, x, y);
}

function tree(p: Pix): void {
  grassBg(p, 11, false);
  shadow(p, 8, 14.5, 6, 1.6, R.grass[3]);
  obj(
    p,
    (q) => {
      q.rect(6, 11, 4, 4, R.bark[1]);
      q.vl(6, 11, 14, R.bark[0]);
      q.vl(9, 11, 14, R.bark[2]);
      q.ball(5, 7, 4.6, 4.2, R.leaf);
      q.ball(11, 7, 4.6, 4.2, R.leaf);
      q.ball(8, 4.6, 5.2, 4.4, R.leaf);
      q.ball(8, 8, 5, 3.4, R.leaf, 0.12);
      // leaf clusters
      for (const [x, y] of [
        [4, 5],
        [9, 3],
        [12, 7],
        [6, 9],
      ] as [number, number][]) {
        q.paint(x, y, R.leaf[0]);
        q.paint(x + 1, y, R.leaf[1]);
        q.paint(x, y + 1, R.leaf[2]);
      }
    },
    R.leaf[4],
  );
}

function palm(p: Pix): void {
  grassBg(p, 12, false);
  shadow(p, 8, 14.5, 5, 1.4, R.grass[3]);
  obj(
    p,
    (q) => {
      for (let y = 5; y <= 14; y++) {
        const x = 7 + Math.round(Math.sin((y - 5) / 4) * 1.2);
        q.set(x, y, y % 2 ? R.bark[1] : R.bark[0]);
        q.set(x + 1, y, R.bark[2]);
      }
      const cx = 8;
      const cy = 4;
      const fr: [number, number][] = [
        [-7, 3],
        [-5, -2],
        [0, -4],
        [5, -2],
        [7, 3],
        [-3, 4],
        [3, 4],
      ];
      for (const [dx, dy] of fr) q.capsule(cx, cy, cx + dx, cy + dy, 1.4, R.palm, 0.6);
      q.ball(7, 6, 1.2, 1.2, R.wood);
      q.ball(9.5, 6, 1.2, 1.2, R.wood);
    },
    R.leaf[4],
  );
}

function ashoka(p: Pix): void {
  grassBg(p, 13, false);
  shadow(p, 8, 14.6, 4.5, 1.4, R.grass[3]);
  obj(
    p,
    (q) => {
      q.rect(7, 12, 2, 3, R.bark[1]);
      q.ball(8, 7, 4.6, 6.6, R.leafDark);
      q.ball(8, 3.5, 3, 3, R.leafDark);
      for (let y = 2; y < 13; y += 2) for (let x = 4; x < 13; x += 3) if (hash2(x, y, 5) < 0.45) q.paint(x + (y % 4 ? 1 : 0), y, hash2(x, y, 6) < 0.5 ? R.saffron[1] : R.red[1]);
      q.paint(6, 4, R.leafDark[0]);
      q.paint(7, 3, R.leafDark[0]);
    },
    R.leafDark[4],
  );
}

function banyan(p: Pix): void {
  grassBg(p, 14, false);
  shadow(p, 8, 14.6, 7, 1.5, R.grass[3]);
  obj(
    p,
    (q) => {
      q.rect(6, 9, 4, 6, R.bark[1]);
      q.vl(9, 9, 14, R.bark[2]);
      for (const x of [2, 4, 11, 13]) q.vl(x, 8, 13 + (x % 3 === 0 ? 1 : 0), R.bark[2]);
      q.ball(8, 5, 7.6, 4.8, R.leafDark);
      q.ball(4, 6, 3.6, 3, R.leafDark, 0.08);
      q.ball(12, 6, 3.6, 3, R.leafDark, 0.08);
      for (const [x, y] of [
        [5, 3],
        [10, 2],
        [3, 6],
        [12, 5],
      ] as [number, number][]) {
        q.paint(x, y, R.leafDark[0]);
        q.paint(x + 1, y, R.leafDark[1]);
      }
    },
    R.leafDark[4],
  );
}

function bush(p: Pix): void {
  grassBg(p, 15, false);
  shadow(p, 8, 13.8, 6, 1.6, R.grass[3]);
  obj(
    p,
    (q) => {
      q.ball(5.5, 10, 3.8, 3.4, R.leaf);
      q.ball(10.5, 10, 3.8, 3.4, R.leaf);
      q.ball(8, 7.5, 4.2, 3.6, R.leaf);
      q.paint(6, 6, R.leaf[0]);
      q.paint(7, 6, R.leaf[0]);
      q.paint(10, 9, R.red[1]);
      q.paint(5, 11, R.red[1]);
    },
    R.leaf[4],
  );
}

function rock(p: Pix): void {
  grassBg(p, 16);
  shadow(p, 8.5, 13, 5.5, 1.6, R.grass[3]);
  obj(p, (q) => {
    q.ball(8, 10, 5, 3.8, R.rock);
    q.paint(6, 8, R.rock[0]);
    q.paint(7, 8, R.rock[0]);
  });
}

function boulder(p: Pix): void {
  grassBg(p, 17, false);
  shadow(p, 8.5, 14, 7, 1.8, R.grass[3]);
  obj(p, (q) => {
    q.ball(8, 8.5, 7, 6.2, R.rock);
    q.line(9, 5, 11, 9, R.rock[3]);
    q.line(11, 9, 10, 12, R.rock[3]);
    q.paint(5, 4, R.rock[0]);
    q.paint(6, 4, R.rock[0]);
    q.paint(4, 5, R.rock[0]);
  });
}

function cliff(p: Pix): void {
  p.rect(0, 0, 16, 16, R.cliff[2]);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const band = (y + (x % 8 < 4 ? 0 : 1)) % 5;
      if (band === 0) p.set(x, y, R.cliff[3]);
      else if (band === 1) p.set(x, y, R.cliff[1]);
    }
  for (const x of [3, 11]) for (let y = 4; y < 15; y++) if (hash2(x, y, 3) < 0.7) p.set(x + (y % 3 === 0 ? 1 : 0), y, R.cliff[4]);
  p.rect(0, 0, 16, 3, R.grass[1]);
  p.hl(0, 15, 2, R.grass[2]);
  p.hl(0, 15, 3, R.cliff[4]);
  for (let x = 0; x < 16; x += 3) p.set(x, 3, R.grass[3]);
  p.hl(0, 15, 15, R.cliff[4]);
}

/** Tileable rock facets (wrapped Voronoi): lit top-left rims, dark bottom-right seams. */
function rockCells(p: Pix, ramp: R5, seed: number, n: number): void {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) pts.push([hash2(i, seed, 1) * 16, hash2(i, seed, 2) * 16, hash2(i, seed, 3)]);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      let d1 = 1e9;
      let d2 = 1e9;
      let best: [number, number, number] = pts[0] as [number, number, number];
      let bdx = 0;
      let bdy = 0;
      for (const pt of pts) {
        let dx = x + 0.5 - pt[0];
        let dy = y + 0.5 - pt[1];
        if (dx > 8) dx -= 16;
        if (dx < -8) dx += 16;
        if (dy > 8) dy -= 16;
        if (dy < -8) dy += 16;
        const d = Math.hypot(dx, dy);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          best = pt;
          bdx = dx;
          bdy = dy;
        } else if (d < d2) d2 = d;
      }
      const shade = best[2] < 0.33 ? 1 : best[2] < 0.75 ? 2 : 2;
      let c = at(ramp, shade);
      if (d2 - d1 < 1.1) c = bdx + bdy < 0 ? at(ramp, 4) : at(ramp, 3);
      else if (d2 - d1 < 2.2 && bdx + bdy < -1) c = at(ramp, shade - 1);
      p.set(x, y, c);
    }
}

function mountain(p: Pix): void {
  rockCells(p, R.mountain, 21, 5);
  speckle(p, 22, 0.03, R.mountain[4]);
  speckle(p, 23, 0.02, R.mountain[0]);
}

function shore(p: Pix, f: number, side: 'n' | 's' | 'e' | 'w'): void {
  waterLayer(p, f, R.water);
  const wob = (i: number): number => ([0, 1, 1, 0, 0, -1, 0, 1][(i + f) % 8] as number) + 5;
  for (let i = 0; i < 16; i++) {
    const d = wob(i);
    for (let k = 0; k < 16; k++) {
      const inLand = k < d;
      const isFoam = k === d || (k === d + 1 && (i + f) % 3 === 0);
      const [x, y] = side === 'n' ? [i, k] : side === 's' ? [i, 15 - k] : side === 'w' ? [k, i] : [15 - k, i];
      if (inLand) {
        const edge = k === d - 1;
        p.set(x, y, edge ? R.sand[2] : hash2(x, y, 31) < 0.08 ? R.sand[0] : R.sand[1]);
      } else if (isFoam) p.set(x, y, R.water[0]);
    }
  }
}

function lotus(p: Pix, f: number): void {
  waterLayer(p, f, R.water);
  const pad = (cx: number, cy: number, r: number): void => {
    p.ell(cx, cy, r + 0.4, r * 0.7 + 0.4, R.leaf[4]);
    p.ell(cx, cy, r, r * 0.7, R.leaf[1]);
    p.ell(cx - 0.6, cy - 0.5, r * 0.5, r * 0.3, R.leaf[0]);
    p.set(Math.round(cx + r * 0.5), Math.round(cy), R.water[2]);
  };
  pad(4.5, 11.5, 3.2);
  pad(12, 5, 2.6);
  pad(12.5, 13, 2);
  // flower
  const bob = f % 2;
  const fx = 5;
  const fy = 9 - bob;
  p.set(fx, fy - 3, R.lotus[1]);
  for (let x = fx - 2; x <= fx + 2; x++) p.set(x, fy - 1, R.lotus[2]);
  p.set(fx - 1, fy - 2, R.lotus[1]);
  p.set(fx + 1, fy - 2, R.lotus[1]);
  p.set(fx, fy - 2, R.lotus[0]);
  p.set(fx - 2, fy - 2, R.lotus[3]);
  p.set(fx + 2, fy - 2, R.lotus[3]);
  p.set(fx - 3, fy - 1, R.lotus[3]);
  p.set(fx + 3, fy - 1, R.lotus[3]);
  p.set(fx, fy - 1, R.turmeric[1]);
  p.set(12, 4 - bob, R.lotus[1]);
  p.set(11, 5 - bob, R.lotus[2]);
  p.set(13, 5 - bob, R.lotus[2]);
  p.set(12, 5 - bob, R.lotus[0]);
}

function reeds(p: Pix): void {
  p.rect(0, 0, 16, 16, R.grass[2]);
  speckle(p, 33, 0.08, R.grass[3]);
  speckle(p, 34, 0.05, R.teal[2]);
  for (const [x, h] of [
    [2, 9],
    [5, 12],
    [8, 8],
    [11, 11],
    [14, 9],
  ] as [number, number][]) {
    p.vl(x, 15 - h, 15, R.palm[1]);
    p.set(x + 1, 15 - h + 3, R.palm[0]);
    p.vl(x, 15 - h - 2, 15 - h + 1, R.wood[3]);
    p.set(x, 15 - h - 3, R.palm[1]);
    p.vl(x - 1 + (x % 2), 15 - Math.floor(h / 2), 15, R.palm[2]);
  }
}

function bridge(p: Pix, f: number, horiz: boolean): void {
  waterLayer(p, f, R.water);
  const plank = (i: number, j: number): void => {
    const [x, y] = horiz ? [i, j] : [j, i];
    const k = Math.floor(i / 3);
    const seam = i % 3 === 2;
    p.set(x, y, seam ? R.wood[3] : (k + (j > 7 ? 1 : 0)) % 2 ? R.wood[1] : R.wood[0]);
  };
  for (let i = 0; i < 16; i++) for (let j = 3; j <= 12; j++) plank(i, j);
  for (let i = 0; i < 16; i++) {
    const r1: [number, number] = horiz ? [i, 2] : [2, i];
    const r2: [number, number] = horiz ? [i, 13] : [13, i];
    p.set(r1[0], r1[1], R.wood[2]);
    p.set(r2[0], r2[1], R.wood[3]);
    const s2: [number, number] = horiz ? [i, 14] : [14, i];
    p.set(s2[0], s2[1], R.water[3]);
  }
  for (const i of [1, 9]) {
    for (const j of [1, 2, 13]) {
      const [x, y] = horiz ? [i, j] : [j, i];
      p.set(x, y, R.wood[3]);
    }
    const [x, y] = horiz ? [i, 1] : [1, i];
    p.set(x, y, R.wood[0]);
  }
}

function setu(p: Pix, f: number): void {
  waterLayer(p, f, R.ocean, 0, 0, 16, 16, true);
  const stones: [number, number, number, number][] = [
    [0, 0, 7, 5],
    [7, 0, 9, 6],
    [0, 5, 5, 6],
    [5, 6, 6, 5],
    [11, 6, 5, 5],
    [0, 11, 8, 5],
    [8, 11, 8, 5],
  ];
  for (const [x, y, w, h] of stones) {
    const q = new Pix(16, 16);
    q.ball(x + w / 2, y + h / 2, w / 2 + 0.3, h / 2 + 0.3, R.stone);
    q.rim(R.stone[4], 'bottom');
    p.blit(q, 0, 0);
  }
  speckle(p, 51, 0.04, R.teal[2]);
}

function cave(p: Pix, kind: 'floor' | 'wall' | 'entrance'): void {
  if (kind === 'floor') {
    p.rect(0, 0, 16, 16, R.cave[2]);
    speckle(p, 61, 0.07, R.cave[1]);
    speckle(p, 62, 0.06, R.cave[3]);
    p.set(4, 5, R.cave[0]);
    p.set(5, 5, R.cave[3]);
    p.set(11, 11, R.cave[0]);
    p.set(12, 11, R.cave[3]);
    return;
  }
  rockCells(p, R.cave, 63, 7);
  p.hl(0, 15, 0, R.cave[0]);
  if (kind === 'entrance') {
    p.ell(8, 12, 5.5, 8.5, R.cave[4]);
    p.ell(8, 12.5, 4.5, 7.6, '#0c0810');
    p.rect(3, 13, 10, 3, '#0c0810');
    p.hl(4, 11, 15, R.cave[3]);
  }
}

function flowersRed(p: Pix): void {
  grassBg(p, 71, false);
  for (const [x, y] of [
    [4, 4],
    [11, 6],
    [6, 11],
    [13, 13],
  ] as [number, number][]) {
    p.set(x, y + 2, R.grass[3]);
    p.set(x, y - 1, R.red[1]);
    p.set(x - 1, y, R.red[1]);
    p.set(x + 1, y, R.red[2]);
    p.set(x, y + 1, R.red[2]);
    p.set(x, y, R.turmeric[1]);
    p.set(x - 1, y - 1, R.red[0]);
  }
}

function stump(p: Pix): void {
  grassBg(p, 72);
  shadow(p, 8.5, 13.5, 5.5, 1.5, R.grass[3]);
  obj(p, (q) => {
    q.rect(4, 7, 8, 6, R.bark[1]);
    q.vl(4, 7, 12, R.bark[0]);
    q.vl(11, 7, 12, R.bark[2]);
    q.vl(8, 9, 12, R.bark[2]);
    q.ell(8, 7, 4, 1.8, R.wood[0]);
    q.ell(8, 7, 2.2, 0.9, R.wood[1]);
    q.set(8, 7, R.wood[2]);
    q.set(3, 12, R.bark[1]);
    q.set(12, 12, R.bark[1]);
  });
}

function log(p: Pix): void {
  grassBg(p, 73);
  shadow(p, 8, 12.5, 7, 1.5, R.grass[3]);
  obj(p, (q) => {
    q.capsule(2.5, 9, 13, 9, 3, R.bark);
    q.ell(13, 9, 2, 2.8, R.wood[1]);
    q.ell(13, 9, 1, 1.4, R.wood[2]);
    q.hl(4, 10, 8, R.bark[0]);
  });
}

// ───────────────────────── village ─────────────────────────

function thatchRows(p: Pix, x0: number, x1: number, y0: number, y1: number): void {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const r = (y - y0) % 4;
      let c: string = r === 3 ? R.thatch[3] : r === 0 ? R.thatch[1] : R.thatch[2];
      if (r !== 3 && (x * 3 + y * 5) % 7 === 0) c = R.thatch[0];
      if (r === 2 && (x + y) % 4 === 0) c = R.thatch[3];
      p.set(x, y, c);
    }
}

function hutRoof(p: Pix, part: 'l' | 'm' | 'r'): void {
  grassBg(p, 81, false);
  thatchRows(p, 0, 15, 2, 14);
  // ridge cap
  p.hl(0, 15, 1, R.thatch[3]);
  p.hl(0, 15, 2, R.wood[2]);
  for (let x = 0; x < 16; x += 4) p.set(x + 1, 2, R.wood[1]);
  // eave
  p.hl(0, 15, 14, R.thatch[4]);
  p.hl(0, 15, 15, R.wood[4]);
  if (part !== 'm') {
    for (let y = 0; y < 16; y++) {
      const edge = Math.floor((15 - y) / 4);
      for (let k = 0; k < edge; k++) {
        const x = part === 'l' ? k : 15 - k;
        p.set(x, y, R.grass[1]);
      }
      const ex = part === 'l' ? edge : 15 - edge;
      if (y > 1) p.set(ex, y, R.thatch[4]);
    }
    for (let k = 0; k < 4; k++) p.set(part === 'l' ? k : 15 - k, 0, R.grass[1]);
  } else {
    p.hl(0, 15, 0, R.thatch[4]);
  }
}

function mudWall(p: Pix): void {
  p.rect(0, 0, 16, 16, R.mud[1]);
  speckle(p, 91, 0.05, R.mud[0]);
  speckle(p, 92, 0.04, R.mud[2]);
  p.rect(0, 0, 16, 2, R.mud[3]); // eave shadow
  p.hl(0, 15, 2, R.mud[2]);
  p.rect(0, 13, 16, 3, R.mud[3]);
  p.hl(0, 15, 13, R.mud[4]);
  p.hl(0, 15, 9, R.red[2]);
  for (let x = 1; x < 16; x += 4) {
    p.set(x, 10, R.white[0]);
    p.set(x + 2, 8, R.white[0]);
  }
}

function hutDoor(p: Pix): void {
  mudWall(p);
  p.rect(4, 3, 8, 13, R.wood[2]);
  p.rect(5, 4, 6, 12, '#2a1810');
  p.hl(4, 11, 3, R.wood[1]);
  p.vl(4, 3, 15, R.wood[1]);
  p.vl(11, 3, 15, R.wood[3]);
  // cloth curtain
  for (let x = 5; x <= 10; x++) {
    const h = 6 + ((x + 1) % 2);
    p.vl(x, 4, 4 + h, x % 2 ? R.saffron[2] : R.saffron[1]);
  }
  p.hl(5, 10, 4, R.saffron[3]);
}

function hutWindow(p: Pix): void {
  mudWall(p);
  p.rect(4, 3, 8, 6, R.wood[2]);
  p.rect(5, 4, 6, 4, '#2a1810');
  p.vl(7, 4, 7, R.wood[1]);
  p.vl(8, 4, 7, R.wood[1]);
  p.hl(5, 10, 5, R.wood[1]);
  p.hl(4, 11, 9, R.wood[3]);
}

function fence(p: Pix): void {
  grassBg(p, 93);
  for (const y of [6, 10]) {
    p.hl(0, 15, y, R.turmeric[2]);
    p.hl(0, 15, y + 1, R.turmeric[3]);
    for (let x = 0; x < 16; x += 5) p.set(x, y, R.turmeric[1]);
  }
  for (const x of [3, 11]) {
    p.rect(x, 3, 2, 11, R.wood[1]);
    p.vl(x + 1, 3, 13, R.wood[2]);
    p.hl(x, x + 1, 3, R.wood[0]);
    p.set(x - 1, 13, R.grass[3]);
    p.set(x + 2, 13, R.grass[3]);
  }
}

function well(p: Pix): void {
  grassBg(p, 94);
  shadow(p, 8.5, 14, 7, 1.8, R.grass[3]);
  obj(p, (q) => {
    // cylinder of stone courses, lit from the left
    for (let y = 8; y <= 13; y++)
      for (let x = 2; x <= 13; x++) {
        const lit = x < 6 ? 1 : x > 10 ? 3 : 2;
        const mortar = y === 10 || (y < 10 ? x % 4 === 1 : x % 4 === 3);
        q.set(x, y, mortar ? R.stone[4] : at(R.stone, lit));
      }
    q.hl(3, 12, 14, R.stone[3]);
    q.ell(8, 8, 6.4, 2.6, R.stone[1]);
    q.ell(8, 8, 4.6, 1.6, R.deep[4]);
    q.hl(6, 9, 8, R.deep[2]);
    q.vl(2, 1, 7, R.wood[2]);
    q.vl(13, 1, 7, R.wood[3]);
    q.hl(1, 14, 1, R.wood[1]);
    q.hl(1, 14, 2, R.wood[3]);
    q.vl(10, 3, 5, R.bark[3]);
    q.rect(9, 5, 3, 2, R.gold[3]);
    q.set(9, 5, R.gold[1]);
  });
}

function shrine(p: Pix, f: number): void {
  grassBg(p, 95, false);
  // flagstone platform
  p.rect(1, 12, 14, 4, R.stone[2]);
  p.hl(1, 14, 12, R.stone[1]);
  p.hl(1, 14, 15, R.stone[3]);
  p.vl(5, 13, 15, R.stone[3]);
  p.vl(10, 13, 15, R.stone[3]);
  obj(p, (q) => {
    // tulasi-style planter pillar with a lamp niche
    q.rect(4, 7, 8, 6, R.red[2]);
    q.vl(4, 7, 12, R.red[1]);
    q.vl(11, 7, 12, R.red[3]);
    q.rect(3, 6, 10, 2, R.red[1]);
    q.hl(3, 12, 7, R.red[3]);
    q.hl(4, 11, 12, R.red[3]);
    q.rect(6, 9, 4, 3, '#2a1014');
    q.hl(7, 8, 8, '#2a1014');
    q.hl(6, 9, 12, R.gold[3]);
    // plant
    q.ball(8, 3.6, 4, 3, R.leaf);
    q.ball(5.5, 4.6, 1.8, 1.6, R.leaf, 0.1);
    q.ball(10.5, 4.6, 1.8, 1.6, R.leaf, 0.1);
    q.paint(7, 2, R.leaf[0]);
    q.paint(9, 1, R.leaf[0]);
    q.set(8, 0, R.lotus[2]);
  });
  // lamp flame inside the niche
  const fl = [R.fire[1], R.fire[2]];
  p.set(7, 11, R.gold[2]);
  p.set(8, 11, R.gold[2]);
  p.set(f % 2 ? 8 : 7, 10, fl[0] as string);
  p.set(f % 2 ? 8 : 7, 9, f % 4 < 2 ? (fl[1] as string) : (fl[0] as string));
  if (f % 4 === 1) p.set(9, 3, R.fire[1]);
}

function fireAltar(p: Pix, f: number): void {
  earthBg(p, 96);
  obj(
    p,
    (q) => {
      q.rect(1, 7, 14, 8, R.red[3]);
      for (let y = 7; y < 15; y++) for (let x = 1; x < 15; x++) if (y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0) q.set(x, y, R.red[4]);
      q.hl(1, 14, 7, R.red[2]);
      q.rect(3, 6, 10, 3, '#3a1c14');
      q.rect(4, 7, 8, 1, R.bark[3]);
    },
    INK,
  );
  const fl = new Pix(16, 16);
  flame(fl, 6, 7, f, 1.3);
  flame(fl, 10, 7, f + 2, 1.1);
  flame(fl, 8, 7, f + 1, 1.6);
  p.blit(fl, 0, 0);
  if (f % 2) p.set(5, 0, R.fire[2]);
  else p.set(11, 1, R.fire[2]);
}

function matFloor(p: Pix): void {
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const a = (Math.floor(x / 2) + Math.floor(y / 2)) % 2;
      p.set(x, y, a ? R.thatch[1] : R.thatch[2]);
      if ((x + y) % 2 === 0 && a) p.set(x, y, R.thatch[0]);
    }
  p.hl(0, 15, 15, R.thatch[3]);
  p.vl(15, 0, 15, R.thatch[3]);
}

function woodFloor(p: Pix): void {
  for (let y = 0; y < 16; y++) {
    const row = Math.floor(y / 4);
    for (let x = 0; x < 16; x++) {
      const off = (row % 2) * 8;
      const seam = y % 4 === 3 || (x + off) % 16 === 0;
      p.set(x, y, seam ? R.wood[3] : y % 4 === 0 ? R.wood[1] : R.wood[2]);
    }
  }
  speckle(p, 97, 0.04, R.wood[3]);
}

function wallInner(p: Pix): void {
  p.rect(0, 0, 16, 16, R.mud[0]);
  speckle(p, 98, 0.05, R.mud[1]);
  p.rect(0, 10, 16, 6, R.red[2]);
  p.hl(0, 15, 10, R.gold[2]);
  p.hl(0, 15, 15, R.red[4]);
  for (let x = 1; x < 16; x += 4) {
    p.set(x, 12, R.gold[1]);
    p.set(x + 1, 13, R.gold[1]);
    p.set(x - 1, 13, R.gold[1]);
  }
  p.hl(0, 15, 0, R.mud[3]);
}

function stairs(p: Pix): void {
  for (let s = 0; s < 4; s++) {
    const y = s * 4;
    p.rect(0, y, 16, 4, at(R.stone, 1 + (s % 2)));
    p.hl(0, 15, y, R.stone[0]);
    p.hl(0, 15, y + 3, R.stone[4]);
  }
  p.vl(0, 0, 15, R.stone[3]);
  p.vl(15, 0, 15, R.stone[3]);
}

function sign(p: Pix): void {
  grassBg(p, 99);
  shadow(p, 8, 14, 3, 1, R.grass[3]);
  obj(p, (q) => {
    q.rect(7, 9, 2, 6, R.wood[2]);
    q.rect(2, 3, 12, 7, R.wood[1]);
    q.hl(2, 13, 3, R.wood[0]);
    q.hl(2, 13, 9, R.wood[3]);
    for (const y of [5, 7]) q.hl(4, 11, y, R.wood[3]);
  });
}

function chest(p: Pix): void {
  earthBg(p, 100);
  shadow(p, 8, 14, 6.5, 1.4, R.earth[3]);
  obj(p, (q) => {
    q.rect(2, 6, 12, 8, R.wood[2]);
    q.rect(2, 4, 12, 4, R.wood[1]);
    q.hl(2, 13, 4, R.wood[0]);
    q.hl(2, 13, 8, R.gold[3]);
    q.vl(2, 4, 13, R.gold[2]);
    q.vl(13, 4, 13, R.gold[3]);
    q.vl(8, 4, 13, R.gold[2]);
    q.rect(7, 8, 3, 3, R.gold[1]);
    q.set(8, 9, R.wood[4]);
  });
}

// ───────────────────────── Ayodhyā ─────────────────────────

function stoneRoad(p: Pix): void {
  if (bgOff) return;
  p.rect(0, 0, 16, 16, R.stone[3]);
  const slabs: [number, number, number, number][] = [
    [0, 0, 8, 5],
    [8, 0, 8, 5],
    [-4, 5, 8, 6],
    [4, 5, 8, 6],
    [12, 5, 8, 6],
    [0, 11, 8, 5],
    [8, 11, 8, 5],
  ];
  for (const [x, y, w, h] of slabs) {
    p.rect(x, y, w - 1, h - 1, R.stone[1]);
    p.hl(x, x + w - 2, y, R.stone[0]);
    p.vl(x + w - 2, y + 1, y + h - 2, R.stone[2]);
  }
  speckle(p, 101, 0.04, R.stone[2]);
}

function palaceWall(p: Pix): void {
  p.rect(0, 0, 16, 16, R.sandstone[1]);
  for (let y = 0; y < 16; y++) {
    if (y % 5 === 4) p.hl(0, 15, y, R.sandstone[3]);
    else {
      const off = Math.floor(y / 5) % 2 ? 4 : 12;
      p.set(off, y, R.sandstone[3]);
    }
  }
  p.rect(0, 0, 16, 2, R.gold[2]);
  p.hl(0, 15, 0, R.gold[1]);
  for (let x = 1; x < 16; x += 3) p.set(x, 1, R.red[2]);
  // arch niche
  p.rect(5, 6, 6, 8, R.sandstone[3]);
  p.ell(8, 6.5, 3, 2.2, R.sandstone[3]);
  p.rect(6, 7, 4, 7, R.sandstone[4]);
  p.hl(5, 10, 14, R.sandstone[2]);
}

function palaceRoof(p: Pix): void {
  p.rect(0, 0, 16, 16, R.palaceRoof[3]);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const off = row % 2 ? 2 : 0;
    for (let k = -1; k < 5; k++) {
      const cx = k * 4 + off + 2;
      for (let dy = 0; dy < 4; dy++)
        for (let dx = -2; dx < 2; dx++) {
          const x = cx + dx;
          if (x < 0 || x > 15) continue;
          const edge = dy === 3 || (dy === 2 && (dx === -2 || dx === 1));
          p.set(x, y + dy, edge ? R.palaceRoof[4] : dy === 0 ? R.palaceRoof[1] : dx < 0 ? R.palaceRoof[1] : R.palaceRoof[2]);
        }
      if (cx - 1 >= 0 && cx - 1 < 16) p.set(cx - 1, y, R.palaceRoof[0]);
    }
  }
}

function palaceDoor(p: Pix): void {
  palaceWall(p);
  p.rect(2, 3, 12, 13, R.gold[3]);
  p.ell(8, 5, 6, 3.5, R.gold[3]);
  p.rect(3, 5, 10, 11, R.wood[2]);
  p.ell(8, 5.5, 5, 2.8, R.wood[2]);
  p.vl(8, 3, 15, R.wood[4]);
  for (const x of [4, 6, 10, 12]) for (const y of [7, 10, 13]) p.set(x - (x > 8 ? 1 : 0), y, R.gold[1]);
  p.vl(3, 5, 15, R.wood[1]);
  p.ell(8, 4.2, 1, 1, R.red[1]);
}

function palaceFloor(p: Pix): void {
  if (bgOff) return;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const a = (Math.floor(x / 8) + Math.floor(y / 8)) % 2;
      let c: string = a ? R.marble[1] : R.marble[2];
      if (x % 8 === 7 || y % 8 === 7) c = R.marble[3];
      if (x % 8 === 0 || y % 8 === 0) c = a ? R.marble[0] : R.marble[1];
      p.set(x, y, c);
    }
  for (const [x, y] of [
    [7, 7],
    [15, 15],
    [7, 15],
    [15, 7],
  ] as [number, number][])
    p.set(x, y, R.gold[2]);
  p.set(3, 3, R.sandstone[2]);
  p.set(11, 11, R.sandstone[2]);
}

function pillar(p: Pix): void {
  palaceFloor(p);
  shadow(p, 9, 15, 6, 1.2, R.marble[3]);
  obj(
    p,
    (q) => {
      q.rect(3, 0, 10, 2, R.sandstone[2]);
      q.rect(4, 2, 8, 12, R.sandstone[1]);
      q.vl(4, 2, 13, R.sandstone[0]);
      q.vl(10, 2, 13, R.sandstone[2]);
      q.vl(11, 2, 13, R.sandstone[3]);
      q.vl(7, 3, 12, R.sandstone[2]);
      q.hl(4, 11, 4, R.gold[2]);
      q.hl(4, 11, 11, R.gold[2]);
      q.rect(3, 13, 10, 2, R.sandstone[2]);
      q.hl(3, 12, 0, R.sandstone[0]);
    },
    R.sandstone[4],
  );
}

function carpet(p: Pix): void {
  palaceFloor(p);
  p.rect(2, 0, 12, 16, R.red[2]);
  p.vl(2, 0, 15, R.gold[2]);
  p.vl(13, 0, 15, R.gold[3]);
  p.vl(3, 0, 15, R.red[3]);
  p.vl(12, 0, 15, R.red[3]);
  for (let y = 0; y < 16; y += 8) {
    p.set(8, y + 2, R.gold[1]);
    p.set(7, y + 3, R.gold[2]);
    p.set(9, y + 3, R.gold[2]);
    p.set(8, y + 4, R.gold[1]);
    p.set(8, y + 3, R.saffron[1]);
    p.set(5, y + 7, R.gold[3]);
    p.set(10, y + 7, R.gold[3]);
  }
}

function throne(p: Pix): void {
  carpet(p);
  obj(
    p,
    (q) => {
      q.rect(2, 1, 12, 9, R.gold[2]);
      q.ell(8, 2, 6, 2.5, R.gold[1]);
      q.rect(4, 3, 8, 6, R.red[2]);
      q.rect(5, 4, 6, 4, R.red[1]);
      q.rect(1, 8, 14, 3, R.gold[2]);
      q.rect(2, 9, 12, 2, R.red[1]);
      q.rect(2, 11, 2, 4, R.gold[3]);
      q.rect(12, 11, 2, 4, R.gold[3]);
      q.rect(4, 11, 8, 2, R.gold[3]);
      q.set(8, 0, R.gold[0]);
      q.set(8, 1, R.red[1]);
      q.hl(2, 13, 8, R.gold[0]);
    },
    R.gold[4],
  );
}

function lamp(p: Pix, f: number): void {
  palaceFloor(p);
  shadow(p, 8.5, 15, 4, 1, R.marble[3]);
  obj(
    p,
    (q) => {
      q.rect(7, 6, 2, 8, R.gold[2]);
      q.vl(7, 6, 13, R.gold[1]);
      q.rect(5, 13, 6, 2, R.gold[3]);
      q.ell(8, 6, 4, 1.4, R.gold[2]);
      q.hl(4, 12, 6, R.gold[3]);
      q.ell(8, 10, 2.5, 0.9, R.gold[2]);
    },
    R.gold[4],
  );
  const fl = new Pix(16, 16);
  flame(fl, 5, 5, f, 0.7);
  flame(fl, 8, 5, f + 1, 0.9);
  flame(fl, 11, 5, f + 2, 0.7);
  p.blit(fl, 0, 0);
}

function gate(p: Pix): void {
  stoneRoad(p);
  p.rect(0, 0, 4, 16, R.sandstone[1]);
  p.rect(12, 0, 4, 16, R.sandstone[1]);
  p.vl(3, 0, 15, R.sandstone[3]);
  p.vl(12, 0, 15, R.sandstone[0]);
  p.rect(0, 0, 16, 4, R.sandstone[1]);
  p.ell(8, 4.5, 4.5, 3, R.stone[3]);
  p.rect(4, 4, 8, 12, R.stone[3]);
  p.rect(4, 5, 8, 11, R.stone[2]);
  p.ell(8, 4.5, 4, 2.5, R.stone[2]);
  stoneRoadPartial(p, 4, 8, 8, 8);
  p.hl(0, 15, 0, R.gold[2]);
  p.hl(0, 15, 1, R.gold[3]);
  p.set(8, 0, R.gold[0]);
  for (let y = 4; y < 16; y += 4) {
    p.hl(0, 2, y, R.sandstone[3]);
    p.hl(13, 15, y, R.sandstone[3]);
  }
}

function stoneRoadPartial(p: Pix, x0: number, y0: number, w: number, h: number): void {
  const q = new Pix(16, 16);
  stoneRoad(q);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) p.set(x, y, q.get(x, y));
}

function marketStall(p: Pix): void {
  stoneRoad(p);
  obj(p, (q) => {
    // awning stripes
    for (let x = 0; x < 16; x++) for (let y = 0; y < 5; y++) q.set(x, y, Math.floor(x / 2) % 2 ? R.saffron[1] : R.white[0]);
    for (let x = 0; x < 16; x += 2) q.set(x, 5, Math.floor(x / 2) % 2 ? R.saffron[2] : R.white[1]);
    q.hl(0, 15, 0, R.saffron[3]);
    q.vl(1, 5, 9, R.wood[2]);
    q.vl(14, 5, 9, R.wood[2]);
    // counter
    q.rect(0, 9, 16, 6, R.wood[1]);
    q.hl(0, 15, 9, R.wood[0]);
    q.hl(0, 15, 14, R.wood[3]);
    q.vl(5, 10, 14, R.wood[2]);
    q.vl(10, 10, 14, R.wood[2]);
    // goods
    for (const [x, c] of [
      [3, R.red[1]],
      [5, R.saffron[1]],
      [8, R.turmeric[1]],
      [11, R.leaf[1]],
      [13, R.red[1]],
    ] as [number, string][]) {
      q.set(x, 8, c);
      q.set(x + 1, 8, c);
      q.set(x, 7, c);
    }
    q.ell(7, 7, 1.4, 1.2, R.red[3]);
  });
}

function banner(p: Pix, f: number): void {
  stoneRoad(p);
  shadow(p, 7, 15, 3, 1, R.stone[3]);
  obj(p, (q) => {
    q.vl(4, 1, 14, R.wood[2]);
    q.vl(3, 1, 14, R.wood[1]);
    q.rect(2, 14, 4, 1, R.stone[3]);
    q.set(3, 0, R.gold[1]);
    q.set(4, 0, R.gold[2]);
    for (let x = 5; x <= 14; x++) {
      const t = (x - 5) / 9;
      const wave = Math.round(Math.sin(x * 0.8 - f * 1.6) * 1.2 * t);
      const top = 2 + wave + Math.round(t * 2);
      const bot = 9 + wave - Math.round(t * 3);
      for (let y = top; y <= bot; y++) q.set(x, y, y === top ? R.saffron[0] : y === bot ? R.saffron[3] : R.saffron[1]);
      if ((x + f) % 4 === 0) q.set(x, Math.round((top + bot) / 2), R.saffron[2]);
    }
    q.set(8, 5 + Math.round(Math.sin(8 * 0.8 - f * 1.6) * 0.5), R.red[2]);
  });
}

function cityWall(p: Pix): void {
  p.rect(0, 0, 16, 16, R.sandstone[2]);
  for (let y = 0; y < 16; y++) {
    if (y % 5 === 4) p.hl(0, 15, y, R.sandstone[4]);
    else p.set((Math.floor(y / 5) % 2) * 8 + 4, y, R.sandstone[4]);
  }
  speckle(p, 121, 0.04, R.sandstone[3]);
  speckle(p, 122, 0.03, R.sandstone[1]);
  // coping with a crenellation hint
  p.rect(0, 0, 16, 3, R.sandstone[1]);
  p.hl(0, 15, 0, R.sandstone[0]);
  p.hl(0, 15, 3, R.sandstone[4]);
  for (const x0 of [3, 11]) {
    p.rect(x0, 1, 3, 2, R.sandstone[3]);
    p.hl(x0, x0 + 2, 1, R.sandstone[4]);
  }
}

// ───────────────────────── Laṅkā ─────────────────────────

function lankaWall(p: Pix): void {
  p.rect(0, 0, 16, 16, R.lanka[2]);
  for (let y = 0; y < 16; y++) {
    if (y % 6 === 5) p.hl(0, 15, y, R.lanka[4]);
    else p.set((Math.floor(y / 6) % 2) * 8 + 3, y, R.lanka[4]);
    if (y % 6 === 0) p.hl(0, 15, y, R.lanka[1]);
  }
  p.rect(0, 12, 16, 2, R.gold[3]);
  p.hl(0, 15, 12, R.gold[2]);
  for (let x = 1; x < 16; x += 4) p.set(x, 13, R.red[1]);
}

function lankaFloor(p: Pix): void {
  if (bgOff) return;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const a = (Math.floor(x / 8) + Math.floor(y / 8)) % 2;
      let c: string = a ? R.lankaFloor[1] : R.lankaFloor[2];
      if (x % 8 === 0 || y % 8 === 0) c = R.gold[3];
      else if (x % 8 === 1 && y % 8 === 1) c = R.lankaFloor[0];
      p.set(x, y, c);
    }
  p.set(4, 4, R.red[2]);
  p.set(12, 12, R.red[2]);
}

function lankaRoof(p: Pix): void {
  // dark glazed scalloped tiles with gold rims (palace roof pattern in Laṅkā colours)
  p.rect(0, 0, 16, 16, R.lanka[3]);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const off = row % 2 ? 2 : 0;
    for (let k = -1; k < 5; k++) {
      const cx = k * 4 + off + 2;
      for (let dy = 0; dy < 4; dy++)
        for (let dx = -2; dx < 2; dx++) {
          const x = cx + dx;
          if (x < 0 || x > 15) continue;
          const edge = dy === 3 || (dy === 2 && (dx === -2 || dx === 1));
          p.set(x, y + dy, edge ? R.gold[3] : dy === 0 ? R.lanka[1] : dx < 0 ? R.lanka[1] : R.lanka[2]);
        }
      if (cx - 1 >= 0 && cx - 1 < 16) p.set(cx - 1, y, R.lanka[0]);
    }
  }
  p.set(4, 1, R.gold[1]);
  p.set(12, 9, R.gold[1]);
}

function lankaDoor(p: Pix): void {
  lankaWall(p);
  p.rect(3, 2, 10, 14, R.gold[3]);
  p.ell(8, 3.5, 5, 3, R.gold[3]);
  p.rect(4, 4, 8, 12, '#1a0c14');
  p.ell(8, 4.5, 4, 2.2, '#1a0c14');
  p.rect(5, 7, 6, 9, R.red[3]);
  p.vl(8, 7, 15, R.red[4]);
  p.set(6, 11, R.gold[1]);
  p.set(10, 11, R.gold[1]);
  p.ell(8, 3, 1.2, 1.2, R.red[1]);
}

function battleGround(p: Pix): void {
  p.rect(0, 0, 16, 16, R.cliff[2]);
  speckle(p, 111, 0.08, R.cliff[3]);
  speckle(p, 112, 0.05, R.cliff[1]);
  speckle(p, 113, 0.03, R.rock[2]);
  p.line(2, 4, 6, 6, R.cliff[4]);
  p.line(6, 6, 7, 9, R.cliff[4]);
  p.line(10, 11, 14, 13, R.cliff[4]);
}

function torch(p: Pix, f: number): void {
  lankaFloor(p);
  shadow(p, 8.5, 15, 4, 1, R.lankaFloor[3]);
  obj(
    p,
    (q) => {
      q.rect(7, 8, 2, 6, R.lanka[1]);
      q.rect(5, 13, 6, 2, R.lanka[1]);
      q.rect(4, 6, 8, 3, R.gold[2]);
      q.hl(4, 11, 6, R.gold[1]);
      q.hl(4, 11, 8, R.gold[3]);
    },
    INK,
  );
  const fl = new Pix(16, 16);
  flame(fl, 8, 5, f, 1.3);
  flame(fl, 6, 5, f + 1, 0.8);
  flame(fl, 10, 5, f + 3, 0.8);
  p.blit(fl, 0, 0);
}

function voidTile(p: Pix): void {
  p.rect(0, 0, 16, 16, '#0a0612');
}

const st = (draw: (p: Pix) => void): TileDef => ({ frames: 1, fps: 0, draw: (p) => draw(p) });
const an = (frames: number, fps: number, draw: (p: Pix, f: number) => void): TileDef => ({ frames, fps, draw });

export const TILES: Record<TileId, TileDef> = {
  grass: st((p) => grassBg(p, 1)),
  grass_flowers: st((p) => {
    grassBg(p, 2, false);
    for (const [x, y, c] of [
      [4, 4, R.white[0]],
      [11, 7, R.lotus[1]],
      [6, 12, R.turmeric[1]],
      [13, 14, R.white[0]],
    ] as [number, number, string][]) {
      p.set(x - 1, y, c);
      p.set(x + 1, y, c);
      p.set(x, y - 1, c);
      p.set(x, y + 1, c);
      p.set(x, y, R.saffron[2]);
      p.set(x + 1, y + 1, R.grass[3]);
    }
  }),
  path: st((p) => earthBg(p, 3)),
  sand: st((p) => {
    p.rect(0, 0, 16, 16, R.sand[1]);
    speckle(p, 4, 0.07, R.sand[0]);
    speckle(p, 5, 0.05, R.sand[2]);
  }),
  kusha: an(2, 1.5, kusha),
  tree: st(tree),
  tree_palm: st(palm),
  tree_ashoka: st(ashoka),
  tree_banyan: st(banyan),
  bush: st(bush),
  rock: st(rock),
  boulder: st(boulder),
  cliff: st(cliff),
  mountain: st(mountain),
  water: an(4, 3, (p, f) => waterLayer(p, f, R.water)),
  water_deep: an(4, 3, (p, f) => waterLayer(p, f, R.deep)),
  ocean: an(4, 3, (p, f) => waterLayer(p, f, R.ocean, 0, 0, 16, 16, true)),
  shore_n: an(4, 3, (p, f) => shore(p, f, 'n')),
  shore_s: an(4, 3, (p, f) => shore(p, f, 's')),
  shore_e: an(4, 3, (p, f) => shore(p, f, 'e')),
  shore_w: an(4, 3, (p, f) => shore(p, f, 'w')),
  lotus: an(4, 3, lotus),
  reeds: st(reeds),
  bridge_h: an(4, 3, (p, f) => bridge(p, f, true)),
  bridge_v: an(4, 3, (p, f) => bridge(p, f, false)),
  setu: an(4, 3, setu),
  cave_floor: st((p) => cave(p, 'floor')),
  cave_wall: st((p) => cave(p, 'wall')),
  cave_entrance: st((p) => cave(p, 'entrance')),
  flowers_red: st(flowersRed),
  stump: st(stump),
  log: st(log),
  hut_roof_l: st((p) => hutRoof(p, 'l')),
  hut_roof_m: st((p) => hutRoof(p, 'm')),
  hut_roof_r: st((p) => hutRoof(p, 'r')),
  hut_wall: st(mudWall),
  hut_door: st(hutDoor),
  hut_window: st(hutWindow),
  fence: st(fence),
  well: st(well),
  shrine: an(4, 5, shrine),
  fire_altar: an(4, 6, fireAltar),
  mat_floor: st(matFloor),
  wood_floor: st(woodFloor),
  wall_inner: st(wallInner),
  stairs: st(stairs),
  sign: st(sign),
  chest: st(chest),
  stone_road: st(stoneRoad),
  palace_wall: st(palaceWall),
  palace_roof: st(palaceRoof),
  palace_door: st(palaceDoor),
  palace_floor: st(palaceFloor),
  pillar: st(pillar),
  carpet: st(carpet),
  throne: st(throne),
  lamp: an(4, 5, lamp),
  gate: st(gate),
  market_stall: st(marketStall),
  banner: an(4, 4, banner),
  city_wall: st(cityWall),
  lanka_wall: st(lankaWall),
  lanka_floor: st(lankaFloor),
  lanka_roof: st(lankaRoof),
  lanka_door: st(lankaDoor),
  battle_ground: st(battleGround),
  torch: an(4, 6, torch),
  void: st(voidTile),
};

export const TILE_SEED = strSeed('tiles');

// ───────────────────────── context-aware object tiles ─────────────────────────

/** Object tiles: drawn over whatever ground surrounds them (see GroundResolver); `walls` = may hang on a wall. */
export const OBJECT_TILES: Partial<Record<TileId, { walls: boolean; base: TileId }>> = {
  tree: { walls: false, base: 'grass' },
  tree_palm: { walls: false, base: 'grass' },
  tree_ashoka: { walls: false, base: 'grass' },
  tree_banyan: { walls: false, base: 'grass' },
  bush: { walls: false, base: 'grass' },
  rock: { walls: false, base: 'grass' },
  boulder: { walls: false, base: 'grass' },
  stump: { walls: false, base: 'grass' },
  log: { walls: false, base: 'grass' },
  fence: { walls: false, base: 'grass' },
  well: { walls: false, base: 'grass' },
  sign: { walls: false, base: 'grass' },
  chest: { walls: false, base: 'path' },
  shrine: { walls: false, base: 'grass' },
  fire_altar: { walls: false, base: 'path' },
  pillar: { walls: false, base: 'palace_floor' },
  lamp: { walls: true, base: 'palace_floor' },
  banner: { walls: true, base: 'stone_road' },
  torch: { walls: true, base: 'lanka_floor' },
};

const FLOOR_OF: Partial<Record<TileId, TileId>> = {
  grass: 'grass',
  kusha: 'grass',
  grass_flowers: 'grass',
  flowers_red: 'grass',
  path: 'path',
  sand: 'sand',
  battle_ground: 'battle_ground',
  stone_road: 'stone_road',
  palace_floor: 'palace_floor',
  lanka_floor: 'lanka_floor',
  cave_floor: 'cave_floor',
  mat_floor: 'mat_floor',
  wood_floor: 'wood_floor',
  carpet: 'carpet',
};
const WALLS = new Set<TileId>(['lanka_wall', 'palace_wall', 'wall_inner', 'cave_wall', 'city_wall']);

const GRASSY = new Set<TileId>(['grass', 'grass_flowers', 'flowers_red', 'kusha']);
const SOFT = new Set<TileId>(['path', 'sand']);
export type FringeSide = 'gl' | 'gr' | 'gt' | 'gb';

/** Which soft-edge fringe (if any) joins tile `a` (left/above) and tile `b` (right/below). */
export function fringeBetween(a: TileId | undefined | null, b: TileId, vertical: boolean): FringeSide | null {
  if (!a) return null;
  if (GRASSY.has(a) && SOFT.has(b)) return vertical ? 'gl' : 'gt';
  if (SOFT.has(a) && GRASSY.has(b)) return vertical ? 'gr' : 'gb';
  return null;
}

/**
 * Grass blades overhanging a path/sand edge. Vertical fringes are 4x16 (the edge runs down the middle);
 * horizontal ones are 16x4. 'gl' = grass on the left, 'gr' = grass on the right, 'gt' = grass above, 'gb' = below.
 */
export function buildFringe(side: FringeSide): Pix {
  const vertical = side === 'gl' || side === 'gr';
  const p = new Pix(vertical ? 4 : 16, vertical ? 16 : 4);
  for (let i = 0; i < 16; i++) {
    // blade length onto the soft side: 0..2 px, irregular but deterministic
    const h = hash2(i, side.charCodeAt(1), 77);
    const len = h < 0.3 ? 0 : h < 0.75 ? 1 : 2;
    for (let k = 0; k < 4; k++) {
      // k = distance from the grass side (0,1 grass; 2,3 soft side)
      let c: string | null = null;
      if (k < 2) c = k === 0 ? null : R.grass[1];
      else if (k - 2 < len) c = k - 2 === len - 1 ? R.grass[2] : R.grass[1];
      else if (k - 2 === len && k < 4) c = '#00000022';
      if (c === null) continue;
      const kk = side === 'gl' || side === 'gt' ? k : 3 - k;
      if (vertical) p.set(kk, i, c);
      else p.set(i, kk, c);
    }
  }
  return p;
}

/** Draw only the object (transparent background) for an object tile. */
export function drawObjectLayer(id: TileId, p: Pix, f: number): void {
  bgOff = true;
  try {
    TILES[id].draw(p, f);
  } finally {
    bgOff = false;
  }
}

/**
 * Remembers which ground was drawn at each screen position during the current pass, so an object
 * tile (tree, rock, lamp…) can be laid over the ground to its left or above instead of a fixed one.
 * Pure: no DOM. Bounded memory.
 */
export function createGroundResolver(): {
  note(x: number, y: number, id: TileId): void;
  resolve(x: number, y: number, id: TileId): TileId | null;
  at(x: number, y: number): TileId | undefined;
} {
  const mem = new Map<number, TileId>();
  let last: TileId | null = null; // last floor drawn
  let lastAny: TileId | null = null; // last floor or wall drawn
  let prevKey = -1; // position of the previous call (an overlay drawn right over its ground)
  let prevId: TileId | null = null;
  const key = (x: number, y: number): number => (x + 8192) * 16384 + (y + 8192);
  const ok = (cand: TileId | undefined | null, walls: boolean): TileId | null => {
    if (!cand) return null;
    const f = FLOOR_OF[cand];
    if (f) return f;
    if (walls && WALLS.has(cand)) return cand;
    return null;
  };
  return {
    at(x, y) {
      return mem.get(key(x, y));
    },
    note(x, y, id) {
      if (mem.size > 6000) mem.clear();
      mem.set(key(x, y), id);
      prevKey = key(x, y);
      prevId = id;
      if (FLOOR_OF[id]) last = id;
      if (FLOOR_OF[id] || WALLS.has(id)) lastAny = id;
    },
    resolve(x, y, id) {
      const o = OBJECT_TILES[id];
      if (!o) return null;
      // an overlay sits on the ground just drawn at the same spot; else left / above (drawn earlier in this
      // row-major pass); else the most recent ground
      if (prevKey === key(x, y)) {
        const here = ok(prevId, o.walls);
        if (here) return here;
      }
      return ok(mem.get(key(x - 16, y)), o.walls) ?? ok(mem.get(key(x, y - 16)), o.walls) ?? ok(o.walls ? lastAny : last, o.walls);
    },
  };
}
