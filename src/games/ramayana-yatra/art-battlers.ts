/** 64x64 battlers, drawn facing LEFT, built from shaded primitives + a 1px outline. OWNER: art. */
import type { BattlerId } from './catalog';
import { type C, Pix, col, mix } from './art-core';
import { CHARS } from './art-sprites';
import type { SpriteId } from './catalog';
import { R } from './art-palette';

export const BATTLER_FRAMES = 2;

type Ramp = readonly string[];
type HairStyle = 'topknot' | 'crown' | 'tiara' | 'long' | 'wild' | 'turban' | 'bald' | 'tuft' | 'short';
type Weapon = 'bow' | 'mace' | 'spear' | 'sword' | 'staff' | 'book' | 'club' | 'claws' | 'none' | 'scroll' | 'orb';

export interface HeroSpec {
  skin: Ramp;
  hair: Ramp;
  top?: Ramp; // clothed torso; undefined = bare chest
  lower: Ramp;
  accent?: Ramp;
  build?: 'slim' | 'normal' | 'broad' | 'female' | 'bulky';
  scale?: number;
  head?: 'human' | 'vanara' | 'bear' | 'rakshasa';
  hairStyle: HairStyle;
  beard?: Ramp;
  mustache?: boolean;
  horns?: boolean;
  fangs?: boolean;
  weapon: Weapon;
  quiver?: boolean;
  tail?: boolean;
  robe?: boolean;
  sash?: Ramp;
  armor?: Ramp;
  eye?: string;
  extraHeads?: boolean;
  aura?: Ramp;
  cloud?: boolean;
  outline?: string;
  longHair?: boolean;
  band?: string;
}

export interface BattlerDef {
  float?: boolean;
  draw: (p: Pix, f: number) => void;
}

const G = R.gold;
const OUT = '#1c1224';

// ───────────────────────── humanoid builder ─────────────────────────

function hero(s: HeroSpec): (p: Pix, f: number) => void {
  return (p, f) => {
    const sc = (s.scale ?? 1) * 0.95;
    const dy = f === 1 ? 1 : 0; // breathing
    const X = (x: number): number => 32 + (x - 32) * sc;
    const Y = (y: number, upper = true): number => 62 - (62 - y) * sc + (upper ? dy : 0);
    const S = (r: number): number => r * sc;
    const q = new Pix(64, 64);
    const build = s.build ?? 'normal';
    const tw = build === 'broad' ? 10.5 : build === 'bulky' ? 12.5 : build === 'slim' ? 7.6 : build === 'female' ? 7.2 : 8.6;
    const skin = s.skin;
    const torsoR = s.armor ?? s.top ?? skin;
    const hairR = s.hair;
    const accent = s.accent ?? G;

    // aura / cloud (behind everything)
    if (s.aura) {
      for (let i = 0; i < 3; i++) p.ell(X(31), Y(30), S(20 - i * 3) + f, S(28 - i * 3) + f, s.aura[i] as string);
    }

    // tail (behind)
    if (s.tail) {
      const c = hairR;
      q.capsule(X(40), Y(44), X(50), Y(48, false), S(2), c);
      q.capsule(X(50), Y(48, false), X(56), Y(38), S(1.8), c);
      q.capsule(X(56), Y(38), X(53), Y(28), S(1.6), c);
      q.capsule(X(53), Y(28), X(48), Y(26), S(1.6), c, S(1.2));
    }
    // long hair behind
    if (s.longHair || s.hairStyle === 'long' || s.hairStyle === 'crown' || s.hairStyle === 'wild') {
      const len = s.hairStyle === 'long' || s.longHair ? 36 : 28;
      q.capsule(X(32), Y(14), X(36), Y(len), S(s.hairStyle === 'wild' ? 7 : 5.5), hairR, S(3.5));
    }
    // quiver (behind)
    if (s.quiver) {
      q.capsule(X(39), Y(18), X(44), Y(38), S(2.8), R.wood);
      for (let i = 0; i < 3; i++) {
        q.line(X(38 + i * 2), Y(17 - i), X(39 + i * 2), Y(12 - i), R.white[1]);
        q.set(X(39 + i * 2), Y(11 - i), i === 1 ? R.red[1] : R.white[0]);
      }
      q.hl(X(38), X(43), Y(22), G[2]);
    }
    // back arm
    q.capsule(X(37), Y(25), X(40), Y(33), S(2.8), skin, S(2.5), 0.18);
    q.capsule(X(40), Y(33), X(38), Y(40), S(2.5), skin, S(2.3), 0.18);
    // legs
    const legTop = s.robe ? 54 : 48;
    q.capsule(X(25), Y(legTop, false), X(23), Y(59, false), S(2.7), skin, S(2.3));
    q.capsule(X(37), Y(legTop, false), X(38), Y(59, false), S(2.7), skin, S(2.3), 0.15);
    q.ell(X(21.5), Y(60.5, false), S(3), S(1.6), skin[2] as string);
    q.ell(X(37.5), Y(60.5, false), S(3), S(1.6), skin[3] as string);
    if (s.head === 'vanara' || s.head === 'bear') {
      q.set(X(19), Y(61, false), skin[3] as string);
    }
    // lower garment
    if (s.robe) {
      q.polyShade(
        [
          [X(22), Y(36)],
          [X(41), Y(36)],
          [X(46), Y(60, false)],
          [X(17), Y(60, false)],
        ],
        s.lower,
        'x',
      );
      q.line(X(31), Y(40), X(30), Y(59, false), s.lower[3] as string);
    } else {
      q.polyShade(
        [
          [X(22), Y(36)],
          [X(41), Y(36)],
          [X(44), Y(50, false)],
          [X(34), Y(51, false)],
          [X(31), Y(46, false)],
          [X(28), Y(51, false)],
          [X(18), Y(50, false)],
        ],
        s.lower,
        'x',
      );
      // fold lines
      q.line(X(26), Y(40), X(23), Y(49, false), s.lower[3] as string);
      q.line(X(36), Y(40), X(39), Y(49, false), s.lower[3] as string);
    }
    // torso
    q.capsule(X(31), Y(27), X(31), Y(36), S(tw), torsoR, S(tw * (build === 'bulky' ? 0.9 : 0.7)));
    if (build === 'female' && !s.armor) {
      q.ball(X(26), Y(30), S(3), S(2.6), torsoR);
    }
    if (!s.top && !s.armor) {
      // bare chest: pectoral / belly hints
      q.line(X(27), Y(31), X(30), Y(31), skin[2] as string);
      q.set(X(31), Y(35), skin[2] as string);
    }
    // waist sash/belt
    q.hl(X(23), X(39), Y(37), accent[2] as string);
    q.hl(X(23), X(39), Y(38), accent[3] as string);
    q.set(X(26), Y(37), accent[0] as string);
    // uttariya / sacred thread diagonal
    if (s.sash) {
      q.line(X(25), Y(23), X(37), Y(36), s.sash[1] as string, 2);
      q.line(X(26), Y(23), X(38), Y(36), s.sash[2] as string);
    }
    if (s.armor) {
      q.hl(X(24), X(38), Y(24), G[1]);
      q.hl(X(24), X(38), Y(32), G[2]);
      q.ball(X(24.5), Y(25), S(3.2), S(2.4), G);
      q.ball(X(37.5), Y(25), S(3.2), S(2.4), G, 0.15);
      q.hl(X(26), X(36), Y(28), s.armor[3] as string);
    }
    // neck
    q.capsule(X(29), Y(19), X(30), Y(24), S(3), skin);
    // necklace
    q.line(X(24), Y(24), X(29), Y(28), G[1]);
    q.line(X(29), Y(28), X(34), Y(24), G[2]);
    q.set(X(29), Y(28), R.red[1]);

    // head
    const hx = X(28);
    const hy = Y(14);
    const hr = S(7.9);
    if (s.extraHeads) {
      // nine smaller crowned heads in an arc behind the main head: ten heads in all
      const order = [0, 8, 1, 7, 2, 6, 3, 5];
      for (const i of order) {
        const k = i - 4;
        const cx = hx + S(k * 5.7);
        const cy = hy + S(Math.abs(k) * 1.6 - 3.5);
        const hd = new Pix(64, 64);
        hd.ball(cx, cy, S(3.6), S(3.9), skin, -0.05 + Math.abs(k) * 0.03);
        hd.hl(Math.round(cx - S(3)), Math.round(cx + S(3)), Math.round(cy - S(3.6)), G[2]);
        hd.set(Math.round(cx), Math.round(cy - S(4.8)), G[1]);
        hd.set(Math.round(cx - S(1.5)), Math.round(cy - S(4.4)), G[2]);
        hd.set(Math.round(cx + S(1.5)), Math.round(cy - S(4.4)), G[2]);
        hd.rect(Math.round(cx - S(3.6)), Math.round(cy - S(3)), Math.round(S(7.2)), Math.max(1, Math.round(S(1.4))), hairR[1] as string);
        hd.set(Math.round(cx - S(1.4)), Math.round(cy), '#1a1020');
        hd.set(Math.round(cx + S(1.2)), Math.round(cy), '#1a1020');
        hd.hl(Math.round(cx - S(1.5)), Math.round(cx + S(1.3)), Math.round(cy + S(1.8)), hairR[2] as string);
        hd.outline(s.outline ?? OUT);
        q.blit(hd, 0, 0);
      }
    }
    if (s.head === 'bear') {
      q.ball(hx + S(1), hy, S(8), S(7.5), hairR);
      q.ball(X(32), Y(7), S(2.4), S(2.4), hairR);
      q.ball(X(25), Y(7.5), S(2.4), S(2.4), hairR);
      q.capsule(X(26), Y(16), X(19), Y(18), S(3.2), ['#e0ccbc', '#c8b0a0', '#a08878', '#786050'], S(2.6));
      q.ell(X(17.5), Y(17), S(1.5), S(1.2), '#1a1010');
      q.set(X(23), Y(12), '#1a1010');
      q.set(X(23), Y(11), R.white[0]);
      q.line(X(20), Y(20), X(24), Y(20), '#5a4038');
    } else if (s.head === 'vanara') {
      q.ball(hx + S(1), hy, S(7.6), S(7.6), hairR);
      q.ball(X(36), Y(15), S(2.4), S(2.4), hairR, 0.1);
      q.ell(X(36), Y(15), S(1.2), S(1.2), R.vanaraFace[2]);
      const face: Ramp = R.vanaraFace;
      q.ball(X(24.5), Y(15), S(4.6), S(5.4), face);
      q.ball(X(21.5), Y(19), S(3.6), S(2.6), face);
      q.set(X(19), Y(18), '#5a3828');
      q.set(X(20), Y(18), '#5a3828');
      q.line(X(19), Y(21), X(23), Y(21), face[3] as string);
      q.set(X(23), Y(14), '#1a1020');
      q.set(X(23), Y(13), '#1a1020');
      q.set(X(22), Y(13), R.white[0]);
      q.line(X(21), Y(11), X(26), Y(11), hairR[3] as string);
    } else {
      q.ball(hx, hy, hr, S(8.1), skin);
      // ear
      q.ell(X(34), Y(15), S(1.6), S(2.2), skin[2] as string);
      // face
      const eye = s.eye ?? '#1a1020';
      q.set(X(24), Y(14), eye);
      q.set(X(24), Y(15), eye);
      q.set(X(23), Y(13), skin[3] as string);
      q.set(X(25), Y(13), skin[3] as string);
      if (build !== 'female' && s.head !== 'rakshasa') q.set(X(25), Y(14), R.white[0]);
      q.set(X(20), Y(16), skin[1] as string);
      q.set(X(20), Y(17), skin[2] as string);
      q.set(X(21), Y(16), skin[1] as string);
      q.line(X(22), Y(19), X(23), Y(19), skin[3] as string);
      if (s.head === 'rakshasa') {
        q.line(X(21), Y(12), X(27), Y(13), skin[4] ?? (skin[3] as string));
        q.set(X(24), Y(14), s.eye ?? '#ffe060');
      }
    }
    if (s.fangs) {
      q.set(X(21), Y(20), '#ffffff');
      q.set(X(21), Y(21), '#ffffff');
      q.set(X(24), Y(20), '#ffffff');
    }
    if (s.mustache) {
      q.line(X(20), Y(18), X(25), Y(18), hairR[2] as string);
      q.set(X(19), Y(19), hairR[2] as string);
    }
    if (s.beard) {
      q.polyShade(
        [
          [X(20), Y(17)],
          [X(31), Y(18)],
          [X(30), Y(25)],
          [X(25), Y(31)],
          [X(21), Y(26)],
        ],
        s.beard,
        'x',
      );
      q.line(X(21), Y(18), X(26), Y(18), s.beard[2] as string);
      q.set(X(22), Y(19), skin[3] as string);
    }
    // hair styles
    const hairCap = (shift = 0): void => {
      for (let y = Math.floor(hy - S(9)); y <= Math.ceil(hy + S(5)); y++)
        for (let x = Math.floor(hx - S(9)); x <= Math.ceil(hx + S(10)); x++) {
          const nx = (x + 0.5 - (hx + S(0.8))) / S(8.5);
          const ny = (y + 0.5 - (hy - S(0.6))) / S(8.4);
          if (nx * nx + ny * ny > 1) continue;
          const rel = y - (hy - S(3) + shift);
          const back = x > hx + S(2.5);
          if (rel < 0 || (back && y < hy + S(4))) {
            const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
            void nz;
            const lv = nx < -0.3 && ny < -0.2 ? 0 : nx > 0.4 || ny > 0.5 ? 2 : 1;
            q.set(x, y, hairR[lv] as string);
          }
        }
    };
    if (s.head !== 'vanara' && s.head !== 'bear') {
      if (s.hairStyle !== 'bald' && s.hairStyle !== 'tuft' && s.hairStyle !== 'turban') hairCap();
      if (s.hairStyle === 'tuft') {
        hairCap(-3);
        q.capsule(X(31), Y(7), X(35), Y(4), S(1.4), hairR);
      }
    }
    if (s.hairStyle === 'topknot') q.ball(X(30), Y(5), S(3.8), S(3.4), hairR);
    if (s.hairStyle === 'wild') {
      for (const [a, b] of [
        [34, 4],
        [38, 9],
        [39, 16],
        [29, 3],
        [24, 5],
      ] as [number, number][])
        q.capsule(X(30), Y(11), X(a), Y(b), S(2), hairR, S(0.8));
    }
    if (s.hairStyle === 'turban') {
      q.ball(X(29), Y(10), S(8.2), S(5.4), s.sash ?? R.saffron);
      q.line(X(22), Y(11), X(35), Y(7), (s.sash ?? R.saffron)[3] as string);
      q.line(X(22), Y(13), X(36), Y(10), (s.sash ?? R.saffron)[3] as string);
      q.ball(X(24), Y(9), S(1.4), S(1.4), G);
    }
    if (s.hairStyle === 'crown' || s.hairStyle === 'tiara') {
      const tall = s.hairStyle === 'crown';
      q.polyShade(
        [
          [X(21), Y(10)],
          [X(36), Y(10)],
          [X(36), Y(7)],
          [X(21), Y(7)],
        ],
        G,
        'y',
      );
      if (tall) {
        q.polyShade(
          [
            [X(22), Y(8)],
            [X(35), Y(8)],
            [X(31), Y(1.5)],
            [X(27), Y(1.5)],
          ],
          G,
          'x',
        );
        q.ell(X(29), Y(1.5), S(1.3), S(1.3), G[1] as string);
        q.ell(X(28.5), Y(4.5), S(1.4), S(1.6), R.red[1]);
        q.set(X(28), Y(4), R.red[0]);
        q.hl(X(23), X(34), Y(6), G[3] as string);
      } else {
        for (const x of [23, 27, 31, 35]) q.poly([[X(x - 1.5), Y(8)], [X(x + 1.5), Y(8)], [X(x), Y(4)]], G[2] as string);
        q.set(X(27), Y(8), R.red[1]);
      }
      q.set(X(23), Y(8), R.red[1]);
      // ear ornament
      q.ball(X(32.5), Y(19.5), S(1.6), S(1.6), G);
    }
    if (s.band) q.line(X(21), Y(9), X(36), Y(8), s.band, Math.max(1, Math.round(S(1.6))));
    if (s.horns) {
      q.capsule(X(25), Y(8), X(20), Y(1), S(1.8), R.white, S(0.7));
      q.capsule(X(33), Y(8), X(38), Y(0), S(1.8), R.white, S(0.7), 0.2);
    }

    // front arm + weapon
    const wpn = s.weapon;
    const hand: [number, number] = wpn === 'bow' ? [17, 30] : wpn === 'book' || wpn === 'scroll' ? [21, 35] : [18, 36];
    if (wpn === 'staff' || wpn === 'spear') {
      q.line(X(15), Y(wpn === 'spear' ? 6 : 6), X(17), Y(61, false), R.wood[2], Math.max(1, Math.round(S(2))));
      q.line(X(14), Y(6), X(16), Y(60, false), R.wood[1]);
      if (wpn === 'spear') q.polyShade([[X(12.5), Y(7)], [X(17.5), Y(7)], [X(15), Y(0.5)]], R.stone, 'x');
      else q.ball(X(15), Y(6), S(2), S(2), R.wood);
    }
    if (wpn === 'club') {
      q.capsule(X(18), Y(38), X(8), Y(10), S(3.4), R.lanka, S(4.4));
      for (let i = 0; i < 4; i++) q.set(X(9 + i * 2.2), Y(14 + i * 6), G[1]);
    }
    q.capsule(X(25), Y(25), X(21), Y(32), S(2.9), skin, S(2.6));
    q.capsule(X(21), Y(32), X(hand[0]), Y(hand[1]), S(2.6), skin, S(2.4));
    q.hl(X(20), X(23), Y(32), accent[2] as string); // armlet
    q.ball(X(hand[0]), Y(hand[1]), S(2.6), S(2.4), skin);
    if (wpn === 'bow') {
      // great bow: arc to the left, straight string
      for (let y = -24; y <= 24; y++) {
        const t = y / 24;
        const x = 17 - 9 * Math.sqrt(Math.max(0, 1 - t * t));
        q.set(X(x), Y(30 + y), R.wood[1]);
        q.set(X(x) + 1, Y(30 + y), R.wood[2]);
        if (Math.abs(y) > 21) q.set(X(x), Y(30 + y), G[1]);
      }
      q.vl(X(17), Y(6), Y(54), '#fff4e0');
      q.ball(X(hand[0]), Y(hand[1]), S(2.6), S(2.4), skin);
      q.hl(X(8), X(9), Y(30), G[2]);
    }
    if (wpn === 'mace') {
      q.line(X(17), Y(40), X(13), Y(18), G[3], Math.max(2, Math.round(S(2))));
      q.ball(X(12), Y(13), S(6.4), S(6.4), G);
      q.hl(X(7), X(17), Y(13), G[3] as string);
      q.ball(X(12), Y(5.5), S(1.6), S(1.6), G);
      q.ball(X(hand[0]), Y(hand[1]), S(2.6), S(2.4), skin);
    }
    if (wpn === 'sword') {
      for (let i = 0; i <= 22; i++) {
        const t = i / 22;
        const x = 17 - t * 12 - Math.sin(t * Math.PI) * 3;
        const y = 35 - t * 22;
        q.set(X(x), Y(y), R.white[0]);
        q.set(X(x) + 1, Y(y), R.white[2]);
        if (i < 16) q.set(X(x) + 2, Y(y), R.white[2]);
      }
      q.hl(X(15), X(20), Y(37), G[2]);
      q.ball(X(hand[0]), Y(hand[1]), S(2.6), S(2.4), skin);
    }
    if (wpn === 'book' || wpn === 'scroll') {
      q.rect(X(12), Y(32), Math.round(S(12)), Math.round(S(4)), '#f0dca0');
      q.hl(X(12), X(12) + Math.round(S(12)) - 1, Y(32), '#fff4c8');
      q.hl(X(12), X(12) + Math.round(S(12)) - 1, Y(35), '#a8804c');
      for (let i = 0; i < 3; i++) q.hl(X(13), X(22), Y(33 + (i % 2)), '#c8a060');
      q.vl(X(17), Y(31), Y(36), '#6a4424');
      q.ball(X(hand[0]), Y(hand[1]), S(2.6), S(2.4), skin);
    }
    if (wpn === 'claws') {
      for (let i = 0; i < 3; i++) q.line(X(16 - i), Y(35 + i * 2), X(13 - i), Y(37 + i * 2), R.white[0]);
    }
    if (wpn === 'orb') {
      q.ball(X(15), Y(31), S(4), S(4), ['#fbeaff', '#d8a8ff', '#a070e0', '#6c44b0']);
      q.set(X(14), Y(29), '#ffffff');
    }

    q.outline(s.outline ?? OUT);
    if (s.cloud) {
      const c = new Pix(64, 64);
      for (const [x, y, r] of [
        [14, 58, 7],
        [26, 60, 8],
        [40, 59, 8],
        [52, 58, 6],
        [33, 55, 6],
      ] as [number, number, number][])
        c.ball(x, y + dy, r, r * 0.6, ['#ffffff', '#d8d0f0', '#a8a0d0', '#7870a8']);
      c.outline('#3c3060');
      q.blit(c, 0, 0);
    }
    p.blit(q, 0, 0);
  };
}

// ───────────────────────── beasts & special forms ─────────────────────────

function wolf(p: Pix, f: number): void {
  const q = new Pix(64, 64);
  const W: Ramp = ['#b8b0b8', '#8c8090', '#645a6c', '#40384a', '#282030'];
  const dy = f;
  q.capsule(48, 40 + dy, 58, 30, 3, W, 1.5); // tail
  q.capsule(44, 44, 46, 60, 3, W, 2.4, 0.2);
  q.capsule(38, 44, 36, 60, 3, W, 2.4, 0.2);
  q.ball(38, 40 + dy, 14, 9, W);
  q.capsule(22, 44, 20, 60, 3.2, W, 2.6);
  q.capsule(28, 44, 30, 60, 3.2, W, 2.6);
  q.ball(22, 34 + dy, 8, 9, W);
  q.capsule(18, 30 + dy, 7, 33 + dy, 4.4, W, 3);
  q.poly([[15, 24 + dy], [21, 22 + dy], [17, 14 + dy]], W[2] as string);
  q.poly([[21, 24 + dy], [27, 24 + dy], [25, 15 + dy]], W[1] as string);
  q.set(14, 28 + dy, '#ffe040');
  q.set(15, 28 + dy, '#ffe040');
  q.set(4, 32 + dy, '#1a1018');
  q.line(5, 35 + dy, 13, 35 + dy, '#3a1020');
  q.set(8, 35 + dy, '#ffffff');
  q.set(11, 35 + dy, '#ffffff');
  for (const x of [18, 20, 28, 30]) q.set(x, 61, '#e8e0e0');
  q.ell(30, 44 + dy, 9, 2, W[3] as string);
  q.outline(OUT);
  p.blit(q, 0, 0);
}

function deer(p: Pix, f: number): void {
  const q = new Pix(64, 64);
  const D = R.deerGold;
  const dy = f;
  q.capsule(42, 42, 44, 59, 2, D, 1.6, 0.2);
  q.capsule(36, 42, 34, 59, 2, D, 1.6, 0.2);
  q.ball(36, 38 + dy, 14, 8, D);
  q.capsule(48, 34 + dy, 52, 31 + dy, 2, D, 1);
  q.capsule(24, 42, 22, 59, 2.2, D, 1.7);
  q.capsule(29, 42, 30, 59, 2.2, D, 1.7);
  q.capsule(25, 34 + dy, 18, 18 + dy, 4, D, 3);
  q.ball(15, 16 + dy, 5, 4.4, D);
  q.capsule(13, 18 + dy, 7, 20 + dy, 2.8, D, 2);
  q.set(6, 19 + dy, '#3a2010');
  q.set(13, 14 + dy, '#1a1020');
  q.set(12, 13 + dy, '#ffffff');
  q.poly([[17, 12 + dy], [21, 11 + dy], [20, 7 + dy]], D[2] as string);
  // silver-tipped antlers
  const ant = (x0: number, y0: number, dir: number): void => {
    q.line(x0, y0, x0 + dir * 4, y0 - 8, D[3] as string);
    q.line(x0 + dir * 2, y0 - 4, x0 + dir * 7, y0 - 6, D[3] as string);
    q.line(x0 + dir * 3, y0 - 6, x0 + dir, y0 - 10, D[3] as string);
    q.set(x0 + dir * 4, y0 - 8, '#ffffff');
    q.set(x0 + dir * 7, y0 - 6, '#ffffff');
    q.set(x0 + dir, y0 - 10, '#ffffff');
  };
  ant(14, 12 + dy, -1);
  ant(17, 12 + dy, 1);
  for (const [x, y] of [
    [30, 34],
    [36, 31],
    [42, 35],
    [34, 40],
    [44, 41],
    [27, 39],
    [39, 37],
  ] as [number, number][]) {
    q.paint(x, y + dy, '#f8f8ff');
    q.paint(x + 1, y + dy, '#c8c8e0');
  }
  q.outline('#4a2c10');
  // sparkles
  const sp = f === 0 ? [[10, 30], [50, 22], [40, 52]] : [[54, 40], [20, 50], [28, 24]];
  for (const [x, y] of sp as [number, number][]) {
    q.set(x, y, '#ffffff');
    q.set(x - 1, y, '#fff6b0');
    q.set(x + 1, y, '#fff6b0');
    q.set(x, y - 1, '#fff6b0');
    q.set(x, y + 1, '#fff6b0');
  }
  p.blit(q, 0, 0);
}

function serpent(p: Pix, f: number, ramp: Ramp, crowned: boolean, face: boolean): void {
  const q = new Pix(64, 64);
  const dy = f;
  // coils
  q.ball(36, 54, 22, 8, ramp, 0.15);
  q.ball(34, 52, 16, 5, ramp);
  q.capsule(42, 50, 34, 36 + dy, 6, ramp, 5.5);
  q.capsule(34, 36 + dy, 28, 22 + dy, 5.5, ramp, 5);
  // belly scales
  for (let y = 26; y < 50; y += 3) q.hl(29 + Math.round((y - 26) / 4), 33 + Math.round((y - 26) / 4), y + dy, ramp[0] as string);
  // hood
  q.ball(27, 16 + dy, 11, 10, ramp);
  q.ball(27, 17 + dy, 7, 7, ramp, -0.1);
  for (const [x, y] of [
    [20, 12],
    [34, 12],
    [22, 22],
    [32, 22],
  ] as [number, number][])
    q.paint(x, y + dy, ramp[3] as string);
  if (face) {
    const sk = R.serpent;
    q.ball(26, 18 + dy, 5, 5.5, ['#d8f0b8', '#b0d890', '#88b870', '#5a8850']);
    q.set(24, 17 + dy, '#1a1020');
    q.set(28, 17 + dy, '#1a1020');
    q.line(25, 21 + dy, 27, 21 + dy, '#5a8850');
    q.capsule(30, 14 + dy, 36, 30 + dy, 3, ['#2e5a3a', '#1e3a2a', '#12241a'], 2);
    void sk;
  } else {
    q.ball(18, 20 + dy, 6, 4, ramp);
    q.set(16, 18 + dy, '#ffe040');
    q.line(12, 22 + dy, 17, 22 + dy, '#3a1020');
    q.line(9, 22 + dy, 12, 24 + dy, R.red[1]);
  }
  if (crowned) {
    q.polyShade([[20, 9 + dy], [33, 9 + dy], [31, 2 + dy], [27, 4 + dy], [23, 2 + dy]], G, 'y');
    q.set(26, 6 + dy, R.red[1]);
  }
  q.outline(OUT);
  p.blit(q, 0, 0);
}

function simhika(p: Pix, f: number): void {
  const q = new Pix(64, 64);
  const Sh = R.shadow;
  const dy = f;
  // rising shadow-body from waves
  q.ball(34, 44, 22, 18, Sh, 0.1);
  q.ball(30, 28 + dy, 15, 14, Sh);
  q.capsule(18, 36 + dy, 6, 22 + dy, 4, Sh, 2.2);
  q.capsule(46, 36, 58, 24 + dy, 4, Sh, 2.2, 0.2);
  for (const [x, y] of [
    [6, 22],
    [58, 24],
  ] as [number, number][])
    for (let i = 0; i < 3; i++) q.line(x, y + dy, x - 2 + i * 2, y - 4 + dy, '#e8e0ff');
  // great maw
  q.ell(26, 34 + dy, 7, 4.5, '#0a0614');
  for (let i = 0; i < 5; i++) {
    q.set(21 + i * 2.5, 31 + dy, '#ffffff');
    q.set(22 + i * 2.5, 37 + dy, '#ffffff');
  }
  q.ell(22, 24 + dy, 2.2, 1.4, '#ff4060');
  q.ell(32, 24 + dy, 2.2, 1.4, '#ff4060');
  q.set(22, 24 + dy, '#ffe0e0');
  q.set(32, 24 + dy, '#ffe0e0');
  // hair tendrils
  for (const [a, b] of [
    [16, 10],
    [24, 8],
    [36, 9],
    [44, 14],
  ] as [number, number][])
    q.capsule(30, 18 + dy, a, b + dy, 2, Sh, 0.8);
  q.outline('#0c0818');
  // waves at the base
  for (let x = 4; x < 62; x++) {
    const y = 56 + Math.round(Math.sin(x * 0.5 + f * 2) * 1.5);
    for (let k = y; k < 64; k++) q.set(x, k, k === y ? R.ocean[0] : k < y + 2 ? R.ocean[1] : R.ocean[2]);
  }
  p.blit(q, 0, 0);
}

function kabandha(p: Pix, f: number): void {
  const q = new Pix(64, 64);
  const K: Ramp = R.rakshasaRed;
  const dy = f;
  q.capsule(22, 46, 20, 58, 4, K, 3.4);
  q.capsule(42, 46, 44, 58, 4, K, 3.4, 0.2);
  // long arms (canonically huge)
  q.capsule(48, 22 + dy, 57, 40, 4, K, 3.4, 0.2);
  q.capsule(57, 40, 53, 56, 3.4, K, 3, 0.2);
  q.capsule(16, 22 + dy, 8, 38, 4, K, 3.4);
  q.capsule(8, 38, 7, 55, 3.4, K, 3);
  q.ball(32, 32 + dy, 19, 18, K);
  // single eye in the chest, mouth in the belly
  q.ell(32, 24 + dy, 5, 3.6, '#fff4d0');
  q.ell(32, 24 + dy, 2.2, 2.6, '#c02020');
  q.set(32, 24 + dy, '#1a0a0a');
  q.line(26, 20 + dy, 38, 20 + dy, K[4] as string);
  q.ell(32, 39 + dy, 8, 4, '#2a0a10');
  for (let i = 0; i < 5; i++) {
    q.set(26 + i * 3, 36 + dy, '#ffffff');
    q.set(27 + i * 3, 42 + dy, '#ffffff');
  }
  q.hl(16, 48, 48, G[3]);
  q.outline(OUT);
  p.blit(q, 0, 0);
}

// ───────────────────────── table ─────────────────────────

const WHITE5: Ramp = ['#ffffff', '#f0ece4', '#d8d0c8', '#b0a8a8', '#807880'];
const OCHRE: Ramp = R.saffron.slice(1);
const BLACKHAIR: Ramp = ['#4a3c5c', '#2c2238', '#1a1424', '#100c18'];
const WHITEHAIR: Ramp = ['#ffffff', '#e4e0e8', '#bcb4c4', '#8c84a0'];

export const BATTLERS: Record<BattlerId, BattlerDef> = {
  b_player_a: { draw: hero({ skin: R.skinWarm, hair: BLACKHAIR, lower: WHITE5, sash: R.saffron, hairStyle: 'topknot', weapon: 'book', build: 'slim', scale: 0.92 }) },
  b_player_b: { draw: hero({ skin: R.skinFair, hair: BLACKHAIR, top: R.teal, lower: R.saffron, robe: true, hairStyle: 'long', weapon: 'book', build: 'female', scale: 0.92 }) },
  b_rama: { draw: hero({ skin: R.skinRama, hair: BLACKHAIR, lower: R.turmeric, sash: R.turmeric, hairStyle: 'crown', weapon: 'bow', quiver: true }) },
  b_lakshmana: { draw: hero({ skin: R.skinFair, hair: BLACKHAIR, lower: R.saffron, sash: R.red, hairStyle: 'tiara', weapon: 'bow', quiver: true, build: 'slim' }) },
  b_hanuman: { draw: hero({ skin: R.vanara, hair: R.vanara, lower: R.red, head: 'vanara', hairStyle: 'tiara', weapon: 'mace', tail: true, build: 'broad' }) },
  b_sugriva: { draw: hero({ skin: R.vanara.slice(1), hair: R.vanara.slice(1), lower: R.leaf, head: 'vanara', hairStyle: 'crown', weapon: 'mace', tail: true, build: 'broad' }) },
  b_jambavan: { draw: hero({ skin: R.bear, hair: R.bear, lower: R.saffron, head: 'bear', hairStyle: 'bald', weapon: 'staff', build: 'bulky', beard: WHITEHAIR }) },
  b_vibhishana: { draw: hero({ skin: R.rakshasaBlue, hair: BLACKHAIR, top: WHITE5, lower: WHITE5, robe: true, hairStyle: 'crown', weapon: 'none', mustache: true, sash: R.gold }) },
  b_bharadvaja: { draw: hero({ skin: R.skinWarm, hair: BLACKHAIR, lower: OCHRE, sash: WHITE5, hairStyle: 'topknot', weapon: 'scroll', build: 'slim' }) },
  b_pandita: { draw: hero({ skin: R.skinFair, hair: BLACKHAIR, top: WHITE5, lower: WHITE5, robe: true, hairStyle: 'turban', sash: R.saffron, weapon: 'scroll', mustache: true }) },
  b_hanuman_duel: { draw: hero({ skin: R.vanara, hair: R.vanara, top: OCHRE, lower: OCHRE, robe: true, head: 'vanara', hairStyle: 'bald', weapon: 'staff', tail: true }) },
  b_nishachara: { draw: hero({ skin: R.rakshasaPurple, hair: BLACKHAIR, lower: R.lanka, head: 'rakshasa', hairStyle: 'wild', horns: true, fangs: true, weapon: 'claws', build: 'normal', eye: '#ffe040' }) },
  b_yatudhana: { draw: hero({ skin: R.rakshasaGreen, hair: BLACKHAIR, top: R.indigo, lower: R.indigo, robe: true, head: 'rakshasa', hairStyle: 'wild', horns: true, fangs: true, weapon: 'orb', aura: ['#5a3a8c40', '#7a4aac40', '#a070d040'], eye: '#ff6060' }) },
  b_rakshasi: { draw: hero({ skin: R.rakshasaGreen, hair: BLACKHAIR, top: R.red, lower: R.red, robe: true, head: 'rakshasa', hairStyle: 'long', fangs: true, weapon: 'claws', build: 'female', eye: '#ffe040' }) },
  b_maya_mriga: { draw: deer },
  b_tataka: { draw: hero({ skin: R.rakshasaPurple, hair: BLACKHAIR, top: R.lanka, lower: R.red, robe: true, head: 'rakshasa', hairStyle: 'wild', fangs: true, weapon: 'claws', build: 'bulky', scale: 1.0, eye: '#ff4040' }) },
  b_subahu: { draw: hero({ skin: R.rakshasaRed, hair: BLACKHAIR, lower: R.lanka, armor: R.lanka, head: 'rakshasa', hairStyle: 'wild', horns: true, fangs: true, weapon: 'spear', mustache: true }) },
  b_maricha: { draw: hero({ skin: R.rakshasaBlue, hair: BLACKHAIR, lower: R.indigo, head: 'rakshasa', hairStyle: 'long', fangs: true, weapon: 'sword', build: 'slim', mustache: true, eye: '#ffe040' }) },
  b_khara: { draw: hero({ skin: R.rakshasaRed, hair: BLACKHAIR, lower: R.red, armor: R.red, head: 'rakshasa', hairStyle: 'tiara', horns: true, fangs: true, weapon: 'club', build: 'broad', mustache: true }) },
  b_dushana: { draw: hero({ skin: R.rakshasaGreen, hair: BLACKHAIR, lower: R.lanka, armor: R.indigo, head: 'rakshasa', hairStyle: 'wild', horns: true, fangs: true, weapon: 'sword', build: 'broad' }) },
  b_kabandha: { draw: kabandha },
  b_lanka_devi: { draw: hero({ skin: R.rakshasaRed, hair: BLACKHAIR, top: R.red, sash: R.gold, lower: R.lanka, robe: true, head: 'rakshasa', hairStyle: 'crown', fangs: true, weapon: 'spear', build: 'female', eye: '#ffe040' }) },
  b_aksha: { draw: hero({ skin: R.rakshasaPurple, hair: BLACKHAIR, lower: R.red, armor: R.lanka, head: 'rakshasa', hairStyle: 'tiara', weapon: 'sword', build: 'slim' }) },
  b_dhumraksha: { draw: hero({ skin: R.rock, hair: ['#5a5060', '#3a3444', '#26202e', '#18141e'], lower: R.lanka, armor: R.lanka, head: 'rakshasa', hairStyle: 'wild', horns: true, fangs: true, weapon: 'club', aura: ['#8080884a', '#a0a0a84a', '#c0c0c84a'], eye: '#ff8040' }) },
  b_kumbhakarna: { draw: hero({ skin: R.rakshasaGreen, hair: BLACKHAIR, lower: R.wood, head: 'rakshasa', hairStyle: 'wild', horns: true, fangs: true, weapon: 'club', build: 'bulky', scale: 1.0, mustache: true, eye: '#ff6040' }) },
  b_indrajit: { float: true, draw: hero({ skin: R.rakshasaPurple, hair: BLACKHAIR, lower: R.indigo, armor: R.lanka, head: 'rakshasa', hairStyle: 'crown', weapon: 'bow', quiver: true, cloud: true, build: 'slim', scale: 0.9 }) },
  b_ravana: { draw: hero({ skin: R.skinTan, hair: BLACKHAIR, lower: R.lanka, armor: R.lanka, sash: R.red, head: 'rakshasa', hairStyle: 'crown', extraHeads: true, weapon: 'sword', build: 'broad', mustache: true, eye: '#ffe060', scale: 1.0 }) },
  b_vrka: { draw: wolf },
  b_simhika: { float: true, draw: simhika },
  b_surasa: { float: true, draw: (p, f) => serpent(p, f, R.serpent, true, true) },
};

export function buildBattler(id: BattlerId, f: number): Pix {
  const p = new Pix(64, 64);
  BATTLERS[id].draw(p, f);
  return p;
}

/** 24x24 head-and-shoulders crop of a battler (for 48x48 portraits at x2), facing right. */
export function battlerPortraitCrop(id: BattlerId): Pix {
  const full = buildBattler(id, 0);
  // find the top of the figure to frame the head
  let top = 0;
  outer: for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (full.get(x, y) !== 0) {
    top = y;
    break outer;
  }
  const heavy = id === 'b_ravana' || id === 'b_surasa' || id === 'b_maya_mriga';
  const y0 = Math.max(0, Math.min(40, (heavy ? top + 2 : top + 1) + (id === 'b_rama' || id === 'b_sugriva' || id === 'b_lanka_devi' || id === 'b_indrajit' ? 4 : 0)));
  const x0 = id === 'b_maya_mriga' ? 2 : 16;
  const p = new Pix(24, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) p.set(23 - x, y, full.get(x0 + x, y0 + y));
  void col;
  return p;
}

export type { C };

// ───────────────────────── portraits for every character ─────────────────────────

const ramp2 = (a: string, b: string): Ramp => [mix(a, '#ffffff', 0.35), a, b, mix(b, '#000000', 0.4)];

/** Derive a bust spec from an overworld character so every portrait shares one style. */
export function heroFromSprite(id: SpriteId): HeroSpec {
  const c = CHARS[id];
  const has = (a: string): boolean => (c.acc as string[]).includes(a);
  const hairStyle: HairStyle = has('crown')
    ? 'crown'
    : has('tiara')
      ? 'tiara'
      : has('turban') || has('helmet')
        ? 'turban'
        : has('wildhair')
          ? 'wild'
          : has('longhair')
            ? 'long'
            : has('topknot')
              ? 'topknot'
              : has('tuft')
                ? 'tuft'
                : 'short';
  const vanara = has('muzzle');
  const bear = has('bear');
  const hair = ramp2(c.hair[0], c.hair[1]);
  const fur = vanara ? (R.vanara as Ramp) : bear ? (R.bear as Ramp) : null;
  const female = !!c.long && has('longhair') && !has('beard');
  const spec: HeroSpec = {
    skin: fur ?? c.skin,
    hair: fur ?? hair,
    lower: ramp2(c.lower[0], c.lower[1]),
    hairStyle,
    weapon: 'none',
    head: vanara ? 'vanara' : bear ? 'bear' : has('fangs') || has('horns') ? 'rakshasa' : 'human',
    build: c.broad ? 'broad' : female ? 'female' : c.child ? 'slim' : 'normal',
    robe: !!c.long,
    longHair: has('longhair') && hairStyle !== 'long',
    mustache: has('mustache'),
    horns: has('horns'),
    fangs: has('fangs'),
    extraHeads: has('tenheads'),
  };
  if (!c.bare) spec.top = ramp2(c.top[0], c.top[1]);
  else spec.sash = ramp2(c.accent, mix(c.accent, '#000000', 0.25));
  if (has('beard') || has('beardshort')) spec.beard = ramp2(c.hair[0], c.hair[1]);
  if (has('armor')) spec.armor = R.gold;
  if (has('helmet')) spec.sash = R.stone;
  else if (hairStyle === 'turban') spec.sash = has('beardshort') ? (WHITE5 as Ramp) : R.saffron;
  if (has('headband')) spec.band = c.accent;
  if (has('fangs') || has('horns')) spec.eye = '#ffe040';
  return spec;
}

/** 24x24 bust facing right (shown at 48x48). */
export function spritePortraitCrop(id: SpriteId): Pix {
  const spec = { ...heroFromSprite(id), scale: 0.85 };
  const p = new Pix(64, 64);
  hero(spec)(p, 0);
  const out = new Pix(24, 24);
  const x0 = 17;
  const y0 = 9;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) out.set(23 - x, y, p.get(x0 + x, y0 + y));
  return out;
}
