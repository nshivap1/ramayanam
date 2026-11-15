/**
 * v0.6 told-cutscene painters of package A (the Mithilā told cutscene, cutscene-mithila.json). OWNER: v0.6 WP-A.
 * Registered by WP0 (cutscene-paint.ts merges PAINTERS_A); the cutscene names it with "painter": "a".
 * Painter "a" paints the 320 × 180 backdrop of each shot (`{ "scene": key }`):
 *   road     the road north to Mithilā at morning: hills, Mithilā's towers far off, a dusty road
 *   ashrama  Gautama's silent hermitage (Bāla 1.48–49): a leaf hut in an overgrown clearing (the Ahalyā hotspot is the hut,
 *            stage tiles 13–16 × 4–7)
 *   sabha    Janaka's hall (1.67): pillars, banners, a stone floor
 *   wedding  the same hall with the wedding fire (1.73)
 *   storm    the road home to Ayodhyā under a dark sky (1.74–76); the clouds part when the stage's tint is cleared
 * The engine draws the cast, the props and the kit effects on top. Figures stand with their feet at stage row 9
 * (y = 144), so every backdrop keeps its ground from y ≈ 128 down. With `cue.reduced` nothing moves with time.
 * No DOM work at module scope (tests import this file).
 */
import type { Painter, PaintCue } from './cutscene-paint';
import { R } from './art-palette';

const W = 320;
const H = 180;

function sky(g: CanvasRenderingContext2D, stops: [number, string][], h = H): void {
  const grd = g.createLinearGradient(0, 0, 0, h);
  for (const [k, c] of stops) grd.addColorStop(k, c);
  g.fillStyle = grd;
  g.fillRect(0, 0, W, h);
}

/** A rounded hill line across the screen at height y (amplitude a, phase p). */
function hills(g: CanvasRenderingContext2D, y: number, a: number, p: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) g.lineTo(x, y - a * (0.5 + 0.5 * Math.sin(x / 37 + p)) - (a / 2) * Math.sin(x / 13 + p * 2));
  g.lineTo(W, H);
  g.closePath();
  g.fill();
}

function tree(g: CanvasRenderingContext2D, x: number, y: number, s: number, sway: number): void {
  g.fillStyle = R.bark[2];
  g.fillRect(x - 1 * s, y - 10 * s, 3 * s, 10 * s);
  g.fillStyle = R.leaf[3];
  g.beginPath();
  g.ellipse(x + sway, y - 16 * s, 10 * s, 9 * s, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = R.leaf[2];
  g.beginPath();
  g.ellipse(x - 3 * s + sway, y - 19 * s, 6 * s, 5 * s, 0, 0, Math.PI * 2);
  g.fill();
}

function road(g: CanvasRenderingContext2D, cue: PaintCue): void {
  sky(g, [[0, '#9fd2ee'], [0.55, '#f6e2b0'], [1, '#f2c98a']], 140);
  const t = cue.reduced ? 0 : cue.t / 1000;
  // sun and a few clouds drifting
  g.fillStyle = 'rgba(255,246,200,0.9)';
  g.beginPath();
  g.arc(60, 38, 14, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [cx, cy] of [[120, 30], [230, 22]] as const) {
    const x = (cx + t * 4) % (W + 60) - 30;
    g.fillRect(x, cy, 44, 6);
    g.fillRect(x + 8, cy - 4, 26, 5);
  }
  hills(g, 112, 16, 0.4, R.mountain[2]);
  // Mithilā's towers, far off on the right
  g.fillStyle = R.sandstone[3];
  for (const [x, w, h] of [[262, 8, 26], [274, 10, 34], [288, 8, 22], [298, 9, 30]] as const) {
    g.fillRect(x, 104 - h, w, h);
    g.fillStyle = R.palaceRoof[2];
    g.fillRect(x - 1, 104 - h - 3, w + 2, 3);
    g.fillStyle = R.sandstone[3];
  }
  hills(g, 124, 8, 1.7, R.grass[3]);
  g.fillStyle = R.grass[2];
  g.fillRect(0, 124, W, 56);
  // the road
  g.fillStyle = R.earth[2];
  g.fillRect(0, 132, W, 26);
  g.fillStyle = R.earth[1];
  for (let x = 6; x < W; x += 22) g.fillRect(x, 140 + ((x / 22) % 2) * 6, 8, 2);
  const sway = cue.reduced ? 0 : Math.sin(t * 1.3) * 0.8;
  for (const [x, s] of [[24, 1.4], [92, 1], [176, 1.2], [244, 0.9]] as const) tree(g, x, 128, s, sway);
}

function ashrama(g: CanvasRenderingContext2D, cue: PaintCue): void {
  sky(g, [[0, '#7fae9a'], [0.6, '#c8d6a8'], [1, '#e0d8a8']], 140);
  const t = cue.reduced ? 0 : cue.t / 1000;
  // a ring of dark trees around the clearing
  g.fillStyle = R.leafDark[2];
  g.fillRect(0, 40, W, 90);
  for (let x = -10; x < W + 20; x += 26) {
    g.fillStyle = (x / 26) % 2 ? R.leafDark[1] : R.leafDark[3];
    g.beginPath();
    g.ellipse(x, 52 + ((x * 7) % 11), 22, 26, 0, 0, Math.PI * 2);
    g.fill();
  }
  // the clearing, overgrown
  g.fillStyle = R.kusha[2];
  g.fillRect(0, 122, W, 58);
  g.fillStyle = R.kusha[3];
  for (let x = 0; x < W; x += 5) {
    const h = 6 + ((x * 13) % 9);
    const lean = cue.reduced ? 0 : Math.sin(t * 2 + x / 9);
    g.fillRect(x + lean, 128 - h, 1, h);
  }
  // the silent leaf hut (the hotspot region: x 208–272, y 64–128)
  g.fillStyle = R.thatch[3];
  g.beginPath();
  g.moveTo(206, 92);
  g.lineTo(240, 66);
  g.lineTo(274, 92);
  g.closePath();
  g.fill();
  g.fillStyle = R.thatch[2];
  g.fillRect(212, 92, 56, 34);
  g.fillStyle = R.mud[3];
  g.fillRect(234, 104, 14, 22);
  // weeds over the threshold, a cold fire-pit
  g.fillStyle = R.kusha[3];
  for (let x = 214; x < 268; x += 4) g.fillRect(x, 120 - ((x * 5) % 6), 1, 8);
  g.fillStyle = R.stone[3];
  g.fillRect(150, 136, 16, 4);
  g.fillStyle = R.stone[4];
  g.fillRect(154, 134, 8, 2);
}

function hall(g: CanvasRenderingContext2D): void {
  sky(g, [[0, '#5a2a30'], [0.5, '#8c4a3a'], [1, '#b8754a']], 132);
  // back wall with pillars and banners
  for (let x = 16; x < W; x += 48) {
    g.fillStyle = R.sandstone[2];
    g.fillRect(x, 18, 12, 112);
    g.fillStyle = R.sandstone[1];
    g.fillRect(x + 2, 18, 3, 112);
    g.fillStyle = R.gold[2];
    g.fillRect(x - 2, 16, 16, 4);
    g.fillRect(x - 2, 126, 16, 4);
  }
  for (let x = 40; x < W; x += 96) {
    g.fillStyle = R.red[2];
    g.fillRect(x, 22, 14, 40);
    g.fillStyle = R.gold[1];
    g.fillRect(x, 58, 14, 4);
    g.fillRect(x + 5, 30, 4, 4);
  }
  // stone floor
  g.fillStyle = R.marble[2];
  g.fillRect(0, 130, W, 50);
  g.fillStyle = R.marble[3];
  for (let x = 0; x < W; x += 20) g.fillRect(x, 130, 1, 50);
  for (let y = 140; y < H; y += 12) g.fillRect(0, y, W, 1);
  // a long carpet
  g.fillStyle = R.red[3];
  g.fillRect(0, 146, W, 6);
}

function sabha(g: CanvasRenderingContext2D): void {
  hall(g);
  // the dais where the bow's chest stood
  g.fillStyle = R.stone[3];
  g.fillRect(156, 128, 60, 6);
  g.fillStyle = R.stone[2];
  g.fillRect(160, 124, 52, 4);
}

function wedding(g: CanvasRenderingContext2D, cue: PaintCue): void {
  hall(g);
  // garlands across the hall
  g.strokeStyle = R.saffron[1];
  g.lineWidth = 2;
  for (let x = 0; x < W; x += 64) {
    g.beginPath();
    g.moveTo(x, 20);
    g.quadraticCurveTo(x + 32, 40, x + 64, 20);
    g.stroke();
  }
  // the fire altar (between Sītā and Rāma: stage tiles 10–12, feet row 9)
  g.fillStyle = R.sandstone[3];
  g.fillRect(170, 132, 28, 10);
  g.fillStyle = R.sandstone[2];
  g.fillRect(174, 128, 20, 4);
  const t = cue.reduced ? 0 : cue.t / 1000;
  const f = cue.reduced ? 0 : Math.sin(t * 9) * 1.5;
  g.fillStyle = R.fire[3];
  g.beginPath();
  g.moveTo(176, 128);
  g.quadraticCurveTo(184 + f, 104, 192, 128);
  g.fill();
  g.fillStyle = R.fire[1];
  g.beginPath();
  g.moveTo(180, 128);
  g.quadraticCurveTo(184 - f, 114, 188, 128);
  g.fill();
}

function storm(g: CanvasRenderingContext2D, cue: PaintCue): void {
  const clear = !cue.stage.tint;
  sky(g, clear ? [[0, '#8cb8e0'], [0.6, '#e8d8b0'], [1, '#e8c090']] : [[0, '#2a2440'], [0.6, '#4a3a58'], [1, '#6a4a50']], 140);
  const t = cue.reduced ? 0 : cue.t / 1000;
  // clouds roll while the sky is dark
  g.fillStyle = clear ? 'rgba(255,255,255,0.6)' : 'rgba(30,24,44,0.85)';
  for (let i = 0; i < 6; i++) {
    const x = ((i * 70 + t * (clear ? 3 : 12)) % (W + 80)) - 40;
    g.beginPath();
    g.ellipse(x, 28 + (i % 3) * 10, 34, 10, 0, 0, Math.PI * 2);
    g.fill();
  }
  hills(g, 114, 14, 2.3, clear ? R.mountain[2] : R.mountain[4]);
  g.fillStyle = clear ? R.grass[2] : R.grass[4];
  g.fillRect(0, 124, W, 56);
  g.fillStyle = clear ? R.earth[2] : R.earth[4];
  g.fillRect(0, 132, W, 26);
  // windblown dust while dark
  if (!clear && !cue.reduced) {
    g.fillStyle = 'rgba(200,170,130,0.35)';
    for (let i = 0; i < 24; i++) {
      const x = (i * 41 + t * 90) % W;
      g.fillRect(x, 120 + ((i * 17) % 34), 6, 1);
    }
  }
}

/** Painter "a": the Mithilā told cutscene. */
const paintA: Painter = (g, cue) => {
  switch (cue.scene) {
    case 'ashrama':
      return ashrama(g, cue);
    case 'sabha':
      return sabha(g);
    case 'wedding':
      return wedding(g, cue);
    case 'storm':
      return storm(g, cue);
    default:
      return road(g, cue);
  }
};

export const PAINTERS_A: Record<string, Painter> = { a: paintA };
