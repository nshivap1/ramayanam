/** 320x180 battle backgrounds: static pixel layers + light runtime animation. OWNER: art. */
import type { BattleBgId } from './catalog';
import { type C, Pix, bayer, hash2, mix, pixCanvas } from './art-core';
import { R } from './art-palette';

export const BG_W = 320;
export const BG_H = 180;

export interface BgLayers {
  base: HTMLCanvasElement;
  far: HTMLCanvasElement | null; // slow-drifting layer (clouds / mist), drawn wrapped
  near: HTMLCanvasElement | null; // faster drifting layer
}

type Ramp = readonly string[];

function sky(p: Pix, cols: Ramp, y0: number, y1: number): void {
  const n = cols.length;
  for (let y = y0; y < y1; y++) {
    const f = ((y - y0) / Math.max(1, y1 - y0)) * (n - 1);
    const i = Math.floor(f);
    const fr = f - i;
    for (let x = 0; x < BG_W; x++) {
      const c = fr > bayer(x, y) ? cols[Math.min(n - 1, i + 1)] : cols[i];
      p.set(x, y, c as string);
    }
  }
}

function ridge(p: Pix, base: number, amp: number, c: C, seed: number, freq = 1, top?: C): void {
  for (let x = 0; x < BG_W; x++) {
    const h =
      Math.sin(x * 0.021 * freq + seed) * 0.5 +
      Math.sin(x * 0.047 * freq + seed * 2.3) * 0.3 +
      Math.sin(x * 0.11 * freq + seed * 4.1) * 0.15 +
      (hash2(x >> 2, seed, 9) - 0.5) * 0.1;
    const y = Math.round(base - amp * (0.6 + h));
    for (let k = y; k < BG_H; k++) p.set(x, k, c);
    if (top !== undefined) p.set(x, y, top);
  }
}

function canopy(p: Pix, base: number, amp: number, ramp: Ramp, seed: number, bump = 14): void {
  for (let x = 0; x < BG_W; x++) {
    const ph = (x + seed * 7) % bump;
    const arc = Math.sqrt(Math.max(0, 1 - ((ph - bump / 2) / (bump / 2)) ** 2));
    const y = Math.round(base - amp * (0.4 + 0.6 * arc) - Math.sin(x * 0.05 + seed) * amp * 0.4);
    for (let k = y; k < BG_H; k++) {
      const d = k - y;
      const c = d === 0 ? ramp[0] : d < 3 && arc > 0.5 ? ramp[1] : ramp[2];
      p.set(x, k, c as string);
    }
  }
}

function platform(p: Pix, cx: number, cy: number, rx: number, ry: number, top: Ramp, side: string): void {
  p.ell(cx, cy + 3, rx, ry, side);
  p.ell(cx, cy, rx, ry, top[2] as string);
  p.ell(cx - rx * 0.06, cy - ry * 0.12, rx * 0.86, ry * 0.72, top[1] as string);
  p.ell(cx - rx * 0.12, cy - ry * 0.25, rx * 0.6, ry * 0.42, top[0] as string);
  // dithered edge between rings
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const r2 = nx * nx + ny * ny;
      if (r2 > 0.62 && r2 < 0.78 && bayer(x, y) < 0.5) p.set(x, y, top[2] as string);
    }
}

function speckle(p: Pix, x0: number, y0: number, w: number, h: number, chance: number, c: C, seed: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (hash2(x, y, seed) < chance) p.set(x, y, c);
}

function cloud(p: Pix, cx: number, cy: number, w: number, ramp: Ramp): void {
  const q = new Pix(p.w, p.h);
  q.ell(cx, cy, w * 0.5, w * 0.16, ramp[1] as string);
  q.ell(cx - w * 0.18, cy - w * 0.08, w * 0.2, w * 0.14, ramp[0] as string);
  q.ell(cx + w * 0.12, cy - w * 0.1, w * 0.24, w * 0.16, ramp[0] as string);
  q.hl(Math.round(cx - w * 0.45), Math.round(cx + w * 0.45), Math.round(cy + w * 0.12), ramp[2] as string);
  p.blit(q, 0, 0);
}

function palm(p: Pix, x: number, base: number, h: number, c: string): void {
  for (let i = 0; i < h; i++) p.set(x + Math.round(Math.sin(i / 9) * 2), base - i, c);
  const tx = x + Math.round(Math.sin(h / 9) * 2);
  const ty = base - h;
  for (const [dx, dy] of [
    [-9, 3],
    [-6, -2],
    [0, -4],
    [6, -2],
    [9, 3],
    [-4, 4],
    [4, 4],
  ] as [number, number][])
    p.line(tx, ty, tx + dx, ty + dy, c, 2);
}

const ALLY: [number, number, number, number] = [66, 153, 50, 12];
const FOE: [number, number, number, number] = [254, 80, 44, 10];

function platforms(p: Pix, top: Ramp, side: string): void {
  platform(p, ALLY[0], ALLY[1], ALLY[2], ALLY[3], top, side);
  platform(p, FOE[0], FOE[1], FOE[2], FOE[3], top, side);
}

// ───────────────────────── per-background builders ─────────────────────────

function ashrama(p: Pix): void {
  sky(p, ['#8cc8f0', '#a8d8f4', '#c8e8f4', '#f4ecd0', '#fcdcb0'], 0, 96);
  ridge(p, 86, 22, '#9cb4c8', 1.2, 0.8, '#b8c8d8');
  ridge(p, 96, 14, '#7ca088', 2.6, 1.3, '#94b49c');
  for (const x of [20, 46, 270, 300]) palm(p, x, 100, 26 + (x % 7), '#4c7c50');
  canopy(p, 104, 8, ['#6ca850', '#4c8c44', '#3c7038'], 3, 18);
  // hut silhouettes
  for (const x of [120, 160]) {
    p.rect(x, 92, 26, 12, '#d8b888');
    p.poly([[x - 4, 93], [x + 30, 93], [x + 13, 82]], '#c89a50');
    p.rect(x + 10, 96, 6, 8, '#6a4a30');
  }
  // ground
  sky(p, ['#8cc860', '#7cbc54', '#6cae4c', '#5ea044'], 104, 180);
  speckle(p, 0, 104, 320, 76, 0.006, '#a8d870', 5);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(hash2(i, 1, 31) * 316);
    const y = 108 + Math.floor(hash2(i, 2, 31) * 68);
    p.set(x, y, '#4c8c3c');
    p.set(x + 1, y + 1, '#4c8c3c');
    p.set(x + 2, y, '#4c8c3c');
    p.set(x + 1, y - 1, '#a8d870');
  }
  platforms(p, ['#b4e070', '#8cc858', '#6aa848'], '#4a7c38');
}

function forest(p: Pix): void {
  sky(p, ['#3c6c48', '#2c5840', '#204434'], 0, 70);
  // light shafts are animated; trunks
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(hash2(i, 1, 2) * 320);
    const w = 6 + Math.floor(hash2(i, 2, 3) * 8);
    p.rect(x, 0, w, 120, i % 2 ? '#3c2c24' : '#4a3628');
    p.vl(x, 0, 119, '#5c4430');
  }
  canopy(p, 30, 20, ['#4c8c44', '#3c7038', '#2c5830'], 1, 22);
  for (let y = 0; y < 34; y++) for (let x = 0; x < 320; x++) p.set(x, y, '#24482a');
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(hash2(i, 3, 41) * 320);
    const y = Math.floor(hash2(i, 4, 41) * 30);
    const r = 4 + hash2(i, 5, 41) * 6;
    p.ball(x, y, r, r * 0.8, ['#4c8c44', '#3c7038', '#2c5830', '#24482a']);
  }
  canopy(p, 116, 16, ['#5c9c48', '#3c7c3c', '#2c6034'], 5, 16);
  sky(p, ['#5c8c44', '#4c7c3c', '#3c6c34'], 118, 180);
  speckle(p, 0, 118, 320, 62, 0.012, '#2c5428', 7);
  speckle(p, 0, 118, 320, 62, 0.02, '#8cbc5c', 8);
  // kusha tufts
  for (let x = 4; x < 320; x += 17) {
    const y = 124 + ((x * 13) % 50);
    for (let k = -2; k <= 2; k++) p.line(x, y, x + k, y - 5 + Math.abs(k), '#a8c860');
  }
  platforms(p, ['#8cb458', '#6c9c48', '#4c7c3c'], '#2c4c28');
}

function river(p: Pix): void {
  sky(p, ['#78b8e8', '#98ccf0', '#bce0f4', '#e4f0f0'], 0, 70);
  ridge(p, 64, 14, '#8cb0c0', 4.2, 0.9);
  canopy(p, 74, 8, ['#6ca850', '#4c8c44', '#3c7038'], 6, 12);
  p.rect(0, 74, 320, 6, '#e4cc94');
  sky(p, ['#5cb4d8', '#48a0cc', '#3a8cc0', '#2e78ac', '#2a6ca0'], 80, 180);
  for (let y = 84; y < 180; y += 7) for (let x = (y * 13) % 29; x < 320; x += 41) p.hl(x, x + 8, y, '#8cd4ec');
  // sandbanks under the platforms
  p.ell(FOE[0], FOE[1] + 2, FOE[2] + 10, FOE[3] + 5, '#e4cc94');
  p.ell(ALLY[0], ALLY[1] + 2, ALLY[2] + 14, ALLY[3] + 6, '#e4cc94');
  platforms(p, ['#fcecbc', '#f0d8a0', '#dcbc80'], '#b89860');
  for (const [x, y] of [
    [20, 120],
    [290, 140],
    [180, 160],
  ] as [number, number][]) {
    p.ell(x, y, 5, 2, R.leaf[2]);
    p.set(x, y - 2, R.lotus[1]);
    p.set(x - 1, y - 1, R.lotus[2]);
    p.set(x + 1, y - 1, R.lotus[2]);
  }
}

function palace(p: Pix): void {
  sky(p, ['#5c2430', '#7c3038', '#9c4040'], 0, 110);
  // curtains
  for (let x = 0; x < 320; x++) {
    const fold = Math.sin(x * 0.35) * 0.5 + 0.5;
    const c = fold > 0.7 ? '#c84848' : fold > 0.35 ? '#a83a40' : '#8c3038';
    for (let y = 0; y < 24 + Math.round(Math.sin(x * 0.07) * 6); y++) p.set(x, y, c);
  }
  p.rect(0, 0, 320, 4, R.gold[2]);
  p.hl(0, 319, 4, R.gold[3]);
  // pillars
  for (const x of [16, 96, 196, 276]) {
    p.rect(x, 20, 26, 92, R.sandstone[1]);
    p.rect(x + 18, 20, 8, 92, R.sandstone[2]);
    p.rect(x, 20, 3, 92, R.sandstone[0]);
    p.rect(x - 4, 18, 34, 6, R.gold[2]);
    p.rect(x - 4, 106, 34, 6, R.gold[3]);
    for (let y = 34; y < 104; y += 16) p.hl(x, x + 25, y, R.sandstone[3]);
  }
  // marble floor in perspective
  for (let y = 110; y < 180; y++) {
    const t = (y - 110) / 70;
    const tile = Math.max(6, Math.round(8 + t * 26));
    for (let x = 0; x < 320; x++) {
      const u = Math.floor((x - 160) / tile + 100);
      const v = Math.floor(Math.pow(t, 0.7) * 7);
      const a = (u + v) % 2 === 0;
      p.set(x, y, a ? R.marble[1] : R.marble[2]);
    }
  }
  p.hl(0, 319, 110, R.gold[3]);
  // carpet
  for (let y = 110; y < 180; y++) {
    const t = (y - 110) / 70;
    const hw = 18 + t * 44;
    for (let x = Math.round(160 - hw); x <= 160 + hw; x++) p.set(x, y, Math.abs(x - 160) > hw - 3 ? R.gold[2] : R.red[2]);
  }
  platforms(p, [R.marble[0], R.marble[1], R.marble[2]], R.marble[4]);
}

function cave(p: Pix): void {
  sky(p, ['#1c1620', '#2a2028', '#3a2e30'], 0, 120);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash2(i, 5, 1) * 320);
    const len = 8 + Math.floor(hash2(i, 6, 1) * 26);
    const w = 3 + Math.floor(hash2(i, 7, 1) * 6);
    p.poly([[x - w, 0], [x + w, 0], [x, len]], i % 2 ? R.cave[3] : R.cave[2]);
  }
  ridge(p, 112, 20, R.cave[3], 7.1, 1.4, R.cave[2]);
  sky(p, [R.cave[2], R.cave[2], R.cave[3]], 116, 180);
  speckle(p, 0, 116, 320, 64, 0.012, R.cave[1], 11);
  speckle(p, 0, 116, 320, 64, 0.012, R.cave[4], 12);
  // crystals
  for (const [x, y] of [
    [30, 100],
    [150, 104],
    [300, 96],
    [250, 130],
  ] as [number, number][]) {
    p.poly([[x - 3, y], [x + 3, y], [x, y - 10]], R.teal[1]);
    p.poly([[x + 2, y], [x + 6, y], [x + 4, y - 6]], R.teal[2]);
    p.set(x - 1, y - 6, R.teal[0]);
  }
  platforms(p, [R.cave[0], R.cave[1], R.cave[2]], R.cave[4]);
}

function ocean(p: Pix): void {
  sky(p, ['#4c8ce0', '#6ca4e8', '#8cbcf0', '#b0d4f4', '#d8ecf8'], 0, 96);
  ridge(p, 94, 6, '#7ca4c8', 9.3, 0.6);
  sky(p, ['#3a84cc', '#3274bc', '#2a64ac', '#24569c', '#1e488c'], 96, 180);
  for (let y = 100; y < 180; y += 5) for (let x = (y * 17) % 37; x < 320; x += 47) p.hl(x, x + 6 + (y >> 5), y, '#68b8e8');
  // foam rings as platforms
  p.ell(FOE[0], FOE[1] + 2, FOE[2] + 6, FOE[3] + 3, '#ffffff');
  p.ell(ALLY[0], ALLY[1] + 2, ALLY[2] + 8, ALLY[3] + 4, '#ffffff');
  platforms(p, ['#9cd4f4', '#6cb8e8', '#4c9cd8'], '#2a64ac');
}

function lanka(p: Pix): void {
  sky(p, ['#0c0a24', '#161236', '#241a48', '#3a2456', '#5a2c5c'], 0, 110);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash2(i, 9, 3) * 320);
    const y = Math.floor(hash2(i, 10, 3) * 80);
    p.set(x, y, i % 5 ? '#c8c0f0' : '#ffffff');
  }
  p.ell(262, 26, 12, 12, '#fff4d0');
  p.ell(266, 23, 11, 11, '#141030');
  // golden city silhouette
  for (let i = 0; i < 18; i++) {
    const x = i * 19 - 6 + Math.floor(hash2(i, 2, 5) * 8);
    const h = 30 + Math.floor(hash2(i, 3, 5) * 40);
    const w = 14 + Math.floor(hash2(i, 4, 5) * 8);
    p.rect(x, 110 - h, w, h, '#2a1e3c');
    p.poly([[x - 2, 110 - h], [x + w + 2, 110 - h], [x + w / 2, 110 - h - 14]], '#3a2a4c');
    p.vl(Math.round(x + w / 2), 110 - h - 18, 110 - h - 14, R.gold[2]);
    for (let wy = 110 - h + 6; wy < 106; wy += 9) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (hash2(wx, wy, 6) < 0.55) p.rect(wx, wy, 2, 3, R.gold[1]);
    p.hl(x, x + w - 1, 110 - h, R.gold[3]);
  }
  sky(p, [R.lankaFloor[1], R.lankaFloor[2], R.lankaFloor[3]], 110, 180);
  for (let y = 112; y < 180; y += 10) p.hl(0, 319, y, R.gold[4]);
  platforms(p, [R.lanka[1], R.lanka[2], R.lanka[3]], '#100a18');
  for (const [x, y] of [
    [FOE[0] - FOE[2], FOE[1]],
    [FOE[0] + FOE[2] - 1, FOE[1]],
    [ALLY[0] - ALLY[2], ALLY[1]],
    [ALLY[0] + ALLY[2] - 1, ALLY[1]],
  ] as [number, number][])
    p.set(x, y, R.gold[1]);
}

function battlefield(p: Pix): void {
  sky(p, ['#4a2040', '#8c3040', '#c8503c', '#e88040', '#f4b060'], 0, 100);
  ridge(p, 92, 18, '#5a2c3c', 3.3, 1);
  // distant Lanka walls
  for (let x = 170; x < 320; x += 12) {
    p.rect(x, 70, 10, 26, '#3a1c30');
    p.rect(x + 2, 64, 6, 6, '#3a1c30');
  }
  ridge(p, 102, 8, '#6c3c34', 6.6, 2);
  sky(p, [R.cliff[2], R.cliff[3], '#5a3c30'], 102, 180);
  speckle(p, 0, 102, 320, 78, 0.012, R.cliff[1], 13);
  speckle(p, 0, 102, 320, 78, 0.012, R.cliff[4], 14);
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(hash2(i, 7, 51) * 300);
    const y = 110 + Math.floor(hash2(i, 8, 51) * 64);
    p.line(x, y, x + 6, y + 2, R.cliff[4]);
    p.line(x + 6, y + 2, x + 9, y + 1, R.cliff[4]);
  }
  // broken spears / arrows stuck in the ground
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash2(i, 1, 21) * 320);
    const y = 112 + Math.floor(hash2(i, 2, 21) * 60);
    p.line(x, y, x + 3, y - 9, R.wood[3]);
    p.set(x + 3, y - 10, R.stone[1]);
  }
  platforms(p, [R.cliff[1], R.cliff[2], R.cliff[3]], R.cliff[4]);
}

const BUILD: Record<BattleBgId, (p: Pix) => void> = { ashrama, forest, river, palace, cave, ocean, lanka, battlefield };
export const BGS: Record<BattleBgId, true> = { ashrama: true, forest: true, river: true, palace: true, cave: true, ocean: true, lanka: true, battlefield: true };

function cloudLayer(ramp: Ramp, count: number, y0: number, y1: number, seed: number, size: number): HTMLCanvasElement | null {
  const p = new Pix(BG_W, BG_H);
  for (let i = 0; i < count; i++) {
    const cx = Math.floor(hash2(i, seed, 1) * BG_W);
    const cy = y0 + Math.floor(hash2(i, seed, 2) * (y1 - y0));
    const w = size * (0.7 + hash2(i, seed, 3) * 0.6);
    cloud(p, cx, cy, w, ramp);
    cloud(p, cx - BG_W, cy, w, ramp);
    cloud(p, cx + BG_W, cy, w, ramp);
  }
  return pixCanvas(p);
}

export function buildBg(id: BattleBgId): BgLayers | null {
  const p = new Pix(BG_W, BG_H);
  BUILD[id](p);
  const base = pixCanvas(p);
  if (!base) return null;
  let far: HTMLCanvasElement | null = null;
  let near: HTMLCanvasElement | null = null;
  const CL = ['#ffffff', '#eef4fa', '#c8d8e8'];
  if (id === 'ashrama' || id === 'river') {
    far = cloudLayer(CL, 4, 10, 40, 1, 46);
    near = cloudLayer(CL, 2, 24, 56, 2, 70);
  } else if (id === 'ocean') {
    far = cloudLayer(CL, 5, 8, 50, 3, 50);
    near = cloudLayer(['#ffffffc0', '#e0ecf8c0', '#c0d0e0c0'], 3, 30, 70, 4, 80);
  } else if (id === 'battlefield') {
    far = cloudLayer(['#5a2c3c', '#4a2434', '#3a1c2c'], 5, 10, 60, 5, 60);
    near = cloudLayer(['#6a4c4ca0', '#5a3c3ca0', '#4a2c2ca0'], 3, 60, 96, 6, 90);
  } else if (id === 'lanka') {
    far = cloudLayer(['#3a2c5ca0', '#2c2048a0', '#20183aa0'], 4, 20, 70, 7, 70);
  } else if (id === 'cave' || id === 'forest') {
    near = cloudLayer(id === 'cave' ? ['#ffffff18', '#ffffff10', '#ffffff08'] : ['#e8ffd820', '#d0f0c018', '#b8e0a810'], 4, 90, 140, 8, 90);
  }
  return { base, far, near };
}

function wrapDraw(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, off: number): void {
  const x = Math.round(((off % BG_W) + BG_W) % BG_W);
  ctx.drawImage(img, x, 0);
  ctx.drawImage(img, x - BG_W, 0);
}

/** Static base + drifting layers + a handful of animated rects (cheap). */
export function drawBgAnim(ctx: CanvasRenderingContext2D, id: BattleBgId, L: BgLayers, t: number): void {
  ctx.drawImage(L.base, 0, 0);
  if (L.far) wrapDraw(ctx, L.far, -t * 3);
  if (L.near) wrapDraw(ctx, L.near, -t * 8);
  const fr = (x: number, y: number, w: number, h: number, c: string): void => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  switch (id) {
    case 'ashrama': {
      // smoke wisps from the huts' hearth
      for (let i = 0; i < 5; i++) {
        const k = (t * 0.5 + i / 5) % 1;
        fr(140 + Math.sin(k * 6 + i) * 3, 80 - k * 30, 2, 2, `rgba(255,255,255,${(0.5 * (1 - k)).toFixed(2)})`);
      }
      // butterflies
      for (let i = 0; i < 2; i++) {
        const x = 150 + Math.sin(t * 0.7 + i * 3) * 60;
        const y = 120 + Math.cos(t * 1.1 + i) * 14;
        const flap = Math.floor(t * 8 + i) % 2;
        fr(x, y, flap ? 3 : 1, 2, i ? '#f08cb0' : '#ffd860');
      }
      break;
    }
    case 'forest': {
      for (let i = 0; i < 3; i++) {
        const a = 0.07 + 0.04 * Math.sin(t * 0.9 + i * 2);
        const x = 60 + i * 95;
        ctx.fillStyle = `rgba(255,250,200,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 18, 0);
        ctx.lineTo(x + 58, 150);
        ctx.lineTo(x + 26, 150);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.12 + i / 6) % 1;
        const x = (i * 57 + Math.sin(t + i) * 10) % 320;
        fr(x, 20 + k * 150, 2, 1, i % 2 ? '#8cbc5c' : '#c8a048');
      }
      for (let i = 0; i < 5; i++) {
        const a = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
        fr((i * 71 + 30) % 320, 100 + ((i * 37) % 60), 1, 1, `rgba(255,250,170,${a.toFixed(2)})`);
      }
      break;
    }
    case 'river':
    case 'ocean': {
      const c = id === 'ocean' ? 'rgba(232,252,255,0.8)' : 'rgba(200,244,240,0.8)';
      for (let i = 0; i < 14; i++) {
        const y = 100 + ((i * 29) % 78);
        const x = (i * 83 + t * (8 + (i % 3) * 4)) % 340 - 10;
        fr(x, y, 5 + (i % 3) * 2, 1, c);
      }
      break;
    }
    case 'palace': {
      for (const x of [56, 160, 264]) {
        const h = 4 + Math.round(Math.sin(t * 9 + x) * 1.2);
        fr(x - 4, 104, 9, 3, R.gold[3]);
        fr(x - 1, 104 - h, 3, h, R.fire[2]);
        fr(x, 104 - h + 1, 1, h - 1, R.fire[1]);
      }
      break;
    }
    case 'cave': {
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.6 + i * 0.27) % 1;
        const x = 40 + i * 80;
        fr(x, 20 + k * 90, 1, 2, 'rgba(160,220,240,0.8)');
      }
      for (let i = 0; i < 4; i++) {
        const a = 0.3 + 0.3 * Math.sin(t * 1.5 + i * 2);
        fr([30, 150, 300, 250][i] as number, ([96, 100, 92, 126][i] as number) - 2, 2, 2, `rgba(168,240,224,${a.toFixed(2)})`);
      }
      break;
    }
    case 'lanka': {
      for (let i = 0; i < 10; i++) {
        const tw = Math.sin(t * 3 + i * 2.1) > 0.6;
        if (tw) fr(Math.floor(hash2(i, 9, 3) * 320), Math.floor(hash2(i, 10, 3) * 80), 1, 1, '#ffffff');
      }
      for (const x of [20, 300]) {
        const h = 6 + Math.round(Math.sin(t * 10 + x) * 2);
        fr(x - 1, 100, 3, 14, R.lanka[1]);
        fr(x - 3, 100 - h, 7, h, R.fire[3]);
        fr(x - 2, 101 - h, 5, h - 2, R.fire[2]);
        fr(x - 1, 102 - h, 3, h - 4, R.fire[1]);
      }
      break;
    }
    case 'battlefield': {
      for (let i = 0; i < 12; i++) {
        const k = (t * 0.25 + i / 12) % 1;
        const x = (i * 47 + Math.sin(t * 2 + i) * 8) % 320;
        fr(x, 170 - k * 150, 1, 1, i % 3 ? '#ffb040' : '#ffe080');
      }
      // banner
      for (let j = 0; j < 10; j++) {
        const yy = 60 + Math.round(Math.sin(j * 0.7 - t * 4) * 1.5);
        fr(30 + j, yy, 1, 8 - Math.floor(j / 3), j % 2 ? R.saffron[1] : R.saffron[2]);
      }
      fr(29, 58, 1, 46, R.wood[3]);
      break;
    }
  }
  void mix;
}
