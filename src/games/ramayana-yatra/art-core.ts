/**
 * Pixel-art core: an RGBA pixel buffer with drawing helpers used at atlas-build time only.
 * Runtime drawing is always drawImage from cached canvases. OWNER: art.
 * Colours are packed little-endian ABGR (the layout of ImageData viewed as Uint32Array).
 */

export type Col = number; // packed ABGR, 0 = transparent
export type C = string | number;

const cache = new Map<string, number>();

/** '#rgb' | '#rrggbb' | '#rrggbbaa' → packed ABGR. */
export function col(c: C): Col {
  if (typeof c === 'number') return c;
  const hit = cache.get(c);
  if (hit !== undefined) return hit;
  let h = c.startsWith('#') ? c.slice(1) : c;
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  const v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  cache.set(c, v);
  return v;
}

export function rgbOf(c: Col): [number, number, number, number] {
  return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, (c >>> 24) & 255];
}

export function toHex(c: Col): string {
  const [r, g, b] = rgbOf(c);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Mix two colours (t = 0 → a, 1 → b). */
export function mix(a: C, b: C, t: number): string {
  const [r1, g1, b1] = rgbOf(col(a));
  const [r2, g2, b2] = rgbOf(col(b));
  const f = (x: number, y: number): string =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return '#' + f(r1, r2) + f(g1, g2) + f(b1, b2);
}

/** 4x4 ordered-dither thresholds in [0, 1). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return ((BAYER[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16;
}

/** Choose a ramp index from a continuous value with dithering only in the band transitions. */
export function rampIdx(f: number, n: number, x: number, y: number): number {
  const v = Math.max(0, Math.min(n - 1, f));
  const base = Math.floor(v);
  let frac = v - base;
  frac = frac < 0.3 ? 0 : frac > 0.7 ? 1 : (frac - 0.3) / 0.4;
  const i = frac > bayer(x, y) ? base + 1 : base;
  return Math.min(n - 1, i);
}

const LX = -0.5;
const LY = -0.62;
const LZ = 0.6;
const LN = Math.hypot(LX, LY, LZ);

/** Lambert-ish light from the top-left; returns 0 (lit) .. 1 (dark). */
export function lightAt(nx: number, ny: number, nz: number): number {
  const d = (nx * LX + ny * LY + nz * LZ) / LN;
  return 1 - Math.max(0, Math.min(1, d * 0.85 + 0.25));
}

export class Pix {
  readonly w: number;
  readonly h: number;
  readonly d: Uint32Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.d = new Uint32Array(w * h);
  }
  inb(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x: number, y: number, c: C | null): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inb(x, y)) return;
    this.d[y * this.w + x] = c === null ? 0 : col(c);
  }
  get(x: number, y: number): Col {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inb(x, y)) return 0;
    return this.d[y * this.w + x] as number;
  }
  /** Set only where already opaque (for painting details onto a shape). */
  paint(x: number, y: number, c: C): void {
    if (this.get(x, y) !== 0) this.set(x, y, c);
  }
  rect(x: number, y: number, w: number, h: number, c: C | null): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  fill(c: C): void {
    this.d.fill(col(c));
  }
  hl(x0: number, x1: number, y: number, c: C): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
  }
  vl(x: number, y0: number, y1: number, c: C): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: C, w = 1): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (w <= 1) this.set(x0, y0, c);
      else this.rect(x0 - Math.floor((w - 1) / 2), y0 - Math.floor((w - 1) / 2), w, w, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  /** Filled ellipse; centre may be fractional. */
  ell(cx: number, cy: number, rx: number, ry: number, c: C | null): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, c);
      }
  }
  /** Shaded ellipsoid using a light→dark ramp. */
  ball(cx: number, cy: number, rx: number, ry: number, ramp: readonly C[], bias = 0): void {
    const n = ramp.length;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const nz = Math.sqrt(1 - r2);
        const f = (lightAt(nx, ny, nz) + bias) * (n - 0.01);
        this.set(x, y, ramp[rampIdx(f, n, x, y)] as C);
      }
  }
  /** Shaded capsule (limb) from (x0,y0) to (x1,y1) with radius r (r1 at the end). */
  capsule(x0: number, y0: number, x1: number, y1: number, r: number, ramp: readonly C[], r1 = r, bias = 0): void {
    const n = ramp.length;
    const minx = Math.floor(Math.min(x0, x1) - Math.max(r, r1) - 1);
    const maxx = Math.ceil(Math.max(x0, x1) + Math.max(r, r1) + 1);
    const miny = Math.floor(Math.min(y0, y1) - Math.max(r, r1) - 1);
    const maxy = Math.ceil(Math.max(y0, y1) + Math.max(r, r1) + 1);
    const vx = x1 - x0;
    const vy = y1 - y0;
    const L2 = vx * vx + vy * vy || 1;
    for (let y = miny; y <= maxy; y++)
      for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let t = ((px - x0) * vx + (py - y0) * vy) / L2;
        t = Math.max(0, Math.min(1, t));
        const qx = x0 + vx * t;
        const qy = y0 + vy * t;
        const rr = r + (r1 - r) * t;
        const dx = (px - qx) / rr;
        const dy = (py - qy) / rr;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        const f = (lightAt(dx, dy, nz) + bias) * (n - 0.01);
        this.set(x, y, ramp[rampIdx(f, n, x, y)] as C);
      }
  }
  /** Filled polygon (even-odd scanline). */
  poly(pts: readonly (readonly [number, number])[], c: C): void {
    if (pts.length < 3) return;
    let miny = Infinity;
    let maxy = -Infinity;
    for (const p of pts) {
      miny = Math.min(miny, p[1]);
      maxy = Math.max(maxy, p[1]);
    }
    for (let y = Math.floor(miny); y <= Math.ceil(maxy); y++) {
      const sy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i] as readonly [number, number];
        const b = pts[(i + 1) % pts.length] as readonly [number, number];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) {
          xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.round(xs[k] as number);
        const xb = Math.round(xs[k + 1] as number) - 1;
        for (let x = xa; x <= xb; x++) this.set(x, y, c);
      }
    }
  }
  /** Polygon shaded by a horizontal/vertical gradient across a ramp. */
  polyShade(pts: readonly (readonly [number, number])[], ramp: readonly C[], dir: 'x' | 'y' | 'xy' = 'xy'): void {
    const tmp = new Pix(this.w, this.h);
    tmp.poly(pts, '#ffffff');
    let minx = Infinity;
    let maxx = -Infinity;
    let miny = Infinity;
    let maxy = -Infinity;
    for (const p of pts) {
      minx = Math.min(minx, p[0]);
      maxx = Math.max(maxx, p[0]);
      miny = Math.min(miny, p[1]);
      maxy = Math.max(maxy, p[1]);
    }
    const n = ramp.length;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (!tmp.get(x, y)) continue;
        const fx = (x - minx) / Math.max(1, maxx - minx);
        const fy = (y - miny) / Math.max(1, maxy - miny);
        const f = dir === 'x' ? fx : dir === 'y' ? fy : fx * 0.55 + fy * 0.45;
        this.set(x, y, ramp[rampIdx(f * (n - 0.01), n, x, y)] as C);
      }
  }
  /** Outer outline: transparent pixels touching opaque ones (4-neighbour) become c. */
  outline(c: C, diag = false): void {
    const cc = col(c);
    const src = this.d.slice();
    const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : (src[y * this.w + x] as number));
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (at(x, y) !== 0) continue;
        let hit = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1);
        if (!hit && diag) hit = at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1);
        if (hit) this.d[y * this.w + x] = cc;
      }
  }
  /** Inner edge darkening: opaque pixels next to transparent become c (selective outline). */
  rim(c: C, side: 'all' | 'bottom' | 'right' = 'all'): void {
    const cc = col(c);
    const src = this.d.slice();
    const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : (src[y * this.w + x] as number));
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (at(x, y) === 0) continue;
        const b = at(x, y + 1) === 0;
        const r = at(x + 1, y) === 0;
        const any = b || r || at(x - 1, y) === 0 || at(x, y - 1) === 0;
        if ((side === 'all' && any) || (side === 'bottom' && b) || (side === 'right' && (r || b))) this.d[y * this.w + x] = cc;
      }
  }
  /** Paint a palette-indexed string grid. '.' and ' ' are transparent. */
  grid(rows: readonly string[], pal: Readonly<Record<string, C>>, dx = 0, dy = 0, flip = false): void {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j] as string;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i] as string;
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c === undefined) continue;
        this.set(dx + (flip ? row.length - 1 - i : i), dy + j, c);
      }
    }
  }
  blit(src: Pix, dx: number, dy: number, flip = false): void {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const v = src.d[y * src.w + x] as number;
        if (v !== 0) this.set(dx + (flip ? src.w - 1 - x : x), dy + y, v);
      }
  }
  flipped(): Pix {
    const p = new Pix(this.w, this.h);
    p.blit(this, 0, 0, true);
    return p;
  }
  clone(): Pix {
    const p = new Pix(this.w, this.h);
    p.d.set(this.d);
    return p;
  }
  /** Replace colours. */
  recolor(map: ReadonlyMap<Col, Col>): void {
    for (let i = 0; i < this.d.length; i++) {
      const v = map.get(this.d[i] as number);
      if (v !== undefined) this.d[i] = v;
    }
  }
  /** Every opaque pixel → c (silhouette). */
  silhouette(c: C): Pix {
    const p = new Pix(this.w, this.h);
    const cc = col(c);
    for (let i = 0; i < this.d.length; i++) if (this.d[i]) p.d[i] = cc;
    return p;
  }
  shift(dx: number, dy: number): Pix {
    const p = new Pix(this.w, this.h);
    p.blit(this, dx, dy);
    return p;
  }
  /** Copy rows [y0, y1) from src at the same position (used for walk-frame leg swaps). */
  clearRows(y0: number, y1: number): void {
    for (let y = y0; y < y1; y++) for (let x = 0; x < this.w; x++) this.set(x, y, null);
  }
}

export const HAS_DOM = typeof document !== 'undefined';

export function makeCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (!HAS_DOM) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Write a Pix into a canvas at (dx, dy). */
export function putPix(canvas: HTMLCanvasElement, p: Pix, dx = 0, dy = 0): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const img = g.createImageData(p.w, p.h);
  new Uint32Array(img.data.buffer).set(p.d);
  // putImageData ignores compositing; use an intermediate canvas so transparency composes.
  const tmp = makeCanvas(p.w, p.h);
  if (!tmp) return;
  const tg = tmp.getContext('2d');
  if (!tg) return;
  tg.putImageData(img, 0, 0);
  g.drawImage(tmp, dx, dy);
}

export function pixCanvas(p: Pix): HTMLCanvasElement | null {
  const c = makeCanvas(p.w, p.h);
  if (!c) return null;
  const g = c.getContext('2d');
  if (!g) return c;
  const img = g.createImageData(p.w, p.h);
  new Uint32Array(img.data.buffer).set(p.d);
  g.putImageData(img, 0, 0);
  return c;
}

/** Tiny deterministic hash noise (seedless, reproducible): returns [0, 1). */
export function hash2(x: number, y: number, s = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function strSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
