/** 16x24 overworld characters: palette-indexed body grids + procedural accessories. OWNER: art. */
import type { SpriteId } from './catalog';
import { type C, Pix } from './art-core';
import { R } from './art-palette';
// v0.6 (WP0): the packages' new characters (art-v06-<x>.ts) join CHARS; a package may draw one itself (BUILD_<X>)
import { BUILD_A, CHARS_A } from './art-v06-a';
import { BUILD_B, CHARS_B } from './art-v06-b';
import { BUILD_C, CHARS_C } from './art-v06-c';
import { BUILD_D, CHARS_D } from './art-v06-d';

export type SDir = 'down' | 'up' | 'right';
export const SPRITE_W = 16;
export const SPRITE_H = 24;

/** Keys every body grid may use (tests check this). */
export const BODY_KEYS = ['.', 'S', 's', 'E', 'H', 'h', 'T', 't', 'A', 'L', 'l', 'F'] as const;

const HEAD: Record<SDir, string[]> = {
  down: [
    '................',
    '................',
    '................',
    '.....HHHHHH.....',
    '....HHHHHHHH....',
    '...HHhHHHHhHH...',
    '...HHSSSSSSHH...',
    '...HSSSSSSSSH...',
    '...SSESSSSESS...',
    '...SSESSSSESS...',
    '...sSSSSSSSSs...',
    '....sSSssSSs....',
  ],
  up: [
    '................',
    '................',
    '................',
    '.....HHHHHH.....',
    '....HHHHHHHH....',
    '...HHHHhHHHHH...',
    '...HHHHHHHHHH...',
    '...HHhHHHHHHH...',
    '...HHHHHHHhHH...',
    '...HHHHHHHHHH...',
    '...sHHHHHHHHs...',
    '....sSSSSSSs....',
  ],
  right: [
    '................',
    '................',
    '................',
    '.....HHHHHH.....',
    '....HHHHHHHH....',
    '...HHHhHHHHHH...',
    '...HHHHHHSSSH...',
    '...HHHHHSSSSS...',
    '...HHHHsSSSES...',
    '...HHHSSSSSESS..',
    '....HsSSSSSSS...',
    '.....ssSSSSs....',
  ],
};

const TORSO: Record<SDir, string[]> = {
  down: ['....TTTTTTTT....', '...STTAATTTTS...', '...STTTTAATTS...', '...SAAAAAAAAS...'],
  up: ['....TTTTTTTT....', '...STTTTAATTS...', '...STTAATTTTS...', '...SAAAAAAAAS...'],
  right: ['.....TTTTTT.....', '.....TTtTTT.....', '.....TTtTTT.....', '.....AASAAA.....'],
};

type Legs = [string[], string[], string[]]; // stand, step-left, step-right
const SHORT_LEGS: Record<SDir, Legs> = {
  down: [
    ['....LLLLLLLL....', '....LLLlLLLL....', '....LLLlLLLL....', '....LLL..LLL....', '.....SS..SS.....', '.....SS..SS.....', '.....FF..FF.....'],
    ['....LLLLLLLL....', '....LLLlLLLL....', '....LLLlLLLL....', '....LLL..LLL....', '.....SS..SS.....', '.....SS..FF.....', '.....FF.........'],
    ['....LLLLLLLL....', '....LLLLlLLL....', '....LLLLlLLL....', '....LLL..LLL....', '.....SS..SS.....', '.....FF..SS.....', '.........FF.....'],
  ],
  up: [
    ['....LLLLLLLL....', '....LLLLlLLL....', '....LLLLlLLL....', '....LLL..LLL....', '.....SS..SS.....', '.....SS..SS.....', '.....FF..FF.....'],
    ['....LLLLLLLL....', '....LLLLlLLL....', '....LLLLlLLL....', '....LLL..LLL....', '.....SS..SS.....', '.....SS..FF.....', '.....FF.........'],
    ['....LLLLLLLL....', '....LLLlLLLL....', '....LLLlLLLL....', '....LLL..LLL....', '.....SS..SS.....', '.....FF..SS.....', '.........FF.....'],
  ],
  right: [
    ['.....LLLLLL.....', '.....LLLLLL.....', '.....LLlLLL.....', '.....LLLLLL.....', '......sSSS......', '......sSSS......', '......FFFFF.....'],
    ['.....LLLLLL.....', '.....LLLLLL.....', '.....LlLLLL.....', '.....LLLLLLL....', '.....ss..SS.....', '....ss....SS....', '....FF....FFF...'],
    ['.....LLLLLL.....', '.....LLLLLL.....', '.....LLLLlL.....', '....LLLLLLL.....', '.....SS..ss.....', '....SS....ss....', '....FF....FFF...'],
  ],
};
const LONG_LEGS: Record<SDir, Legs> = {
  down: [
    ['....LLLLLLLL....', '....LLLLLLLL....', '...LLLLlLLLLL...', '...LLLLlLLLLL...', '...LLLLlLLLLL...', '...lLLLlLLLLl...', '....FF....FF....'],
    ['....LLLLLLLL....', '....LLLLLLLL....', '...LLLLlLLLLL...', '...LLLLlLLLLL...', '...LLLLlLLLLL...', '...lLLLlLLLLl...', '....FF..........'],
    ['....LLLLLLLL....', '....LLLLLLLL....', '...LLLLLlLLLL...', '...LLLLLlLLLL...', '...LLLLLlLLLL...', '...lLLLLlLLLl...', '..........FF....'],
  ],
  up: [
    ['....LLLLLLLL....', '....LLLLLLLL....', '...LLLLLlLLLL...', '...LLLLLlLLLL...', '...LLLLLlLLLL...', '...lLLLLlLLLl...', '....FF....FF....'],
    ['....LLLLLLLL....', '....LLLLLLLL....', '...LLLLLlLLLL...', '...LLLLLlLLLL...', '...LLLLLlLLLL...', '...lLLLLlLLLl...', '..........FF....'],
    ['....LLLLLLLL....', '....LLLLLLLL....', '...LLLLlLLLLL...', '...LLLLlLLLLL...', '...LLLLlLLLLL...', '...lLLLlLLLLl...', '....FF..........'],
  ],
  right: [
    ['.....LLLLLL.....', '.....LLLLLL.....', '.....LLLLLLL....', '....LLLlLLLL....', '....LLLlLLLL....', '....lLLlLLLL....', '.....FFFFF......'],
    ['.....LLLLLL.....', '.....LLLLLL.....', '.....LLLLLLL....', '....LLLlLLLLL...', '....LLLlLLLLL...', '....lLLlLLLLl...', '....FF....FFF...'],
    ['.....LLLLLL.....', '.....LLLLLL.....', '.....LLLLLLL....', '....LLLLlLLL....', '....LLLLlLLL....', '....lLLLlLLL....', '.....FF.FFF.....'],
  ],
};

/** All body grids, for tests (each must be 16 wide; heads+torso+legs = 23 rows). */
export function bodyGrid(dir: SDir, long: boolean, frame: 0 | 1 | 2): string[] {
  const legs = (long ? LONG_LEGS : SHORT_LEGS)[dir][frame];
  const torso = TORSO[dir].slice();
  if (dir === 'right' && frame !== 0) {
    // arm swing: hand forward / back
    torso[3] = frame === 1 ? '.....AAASAA.....' : '.....ASAAAA.....';
  } else if (frame !== 0) {
    // arm swing seen from the front/back: one hand rises a pixel
    const row = (torso[3] as string).split('');
    row[frame === 1 ? 3 : 12] = '.';
    torso[3] = row.join('');
  }
  return [...HEAD[dir], ...torso, ...legs, '................'];
}

type Acc =
  | 'topknot'
  | 'crown'
  | 'tiara'
  | 'longhair'
  | 'beard'
  | 'beardshort'
  | 'mustache'
  | 'horns'
  | 'turban'
  | 'helmet'
  | 'bow'
  | 'quiver'
  | 'mace'
  | 'tail'
  | 'staff'
  | 'spear'
  | 'fangs'
  | 'earrings'
  | 'necklace'
  | 'muzzle'
  | 'bear'
  | 'tenheads'
  | 'headband'
  | 'feather'
  | 'veena'
  | 'scroll'
  | 'serpent'
  | 'flower'
  | 'wildhair'
  | 'tuft'
  | 'armor';

export interface CharSpec {
  kind?: 'human' | 'krauncha' | 'deer' | 'jatayu';
  long?: boolean;
  skin: readonly string[];
  hair: readonly [string, string];
  top: readonly [string, string];
  lower: readonly [string, string];
  accent: string;
  feet?: string;
  bare?: boolean;
  child?: boolean;
  broad?: boolean;
  outline?: string;
  metal?: readonly string[];
  acc: Acc[];
}

const BLACK_HAIR = ['#2c2238', '#1a1424'] as const;
const WHITE_HAIR = ['#f4f0ec', '#c8c0c8'] as const;
const GREY_HAIR = ['#bcb4bc', '#8c8494'] as const;
const WHITE_CLOTH = ['#fbf8f0', '#d8d0c8'] as const;
const OCHRE = [R.saffron[2], R.saffron[3]] as const;
const SAND = '#8c5a3c';

export const CHARS: Record<SpriteId, CharSpec> = {
  player_a: { skin: R.skinWarm, hair: BLACK_HAIR, top: [R.skinWarm[1], R.skinWarm[2]], lower: WHITE_CLOTH, accent: R.saffron[1], bare: true, acc: ['topknot', 'scroll'] },
  player_b: { long: true, skin: R.skinFair, hair: BLACK_HAIR, top: [R.teal[2], R.teal[3]], lower: [R.saffron[1], R.saffron[2]], accent: R.gold[1], acc: ['longhair', 'flower', 'scroll'] },
  valmiki: { long: true, skin: R.skinTan, hair: WHITE_HAIR, top: OCHRE, lower: OCHRE, accent: R.saffron[4], acc: ['topknot', 'beard', 'staff'] },
  bharadvaja: { skin: R.skinWarm, hair: BLACK_HAIR, top: [R.skinWarm[1], R.skinWarm[2]], lower: [R.saffron[1], R.saffron[2]], accent: WHITE_CLOTH[0], bare: true, acc: ['topknot'] },
  narada: { long: true, skin: R.skinFair, hair: BLACK_HAIR, top: WHITE_CLOTH, lower: WHITE_CLOTH, accent: R.saffron[1], acc: ['topknot', 'veena'] },
  vishvamitra: { long: true, skin: R.skinTan, hair: GREY_HAIR, top: [R.red[2], R.red[3]], lower: [R.saffron[2], R.saffron[3]], accent: R.saffron[1], acc: ['topknot', 'beard', 'staff'] },
  rama: { skin: R.skinRama, hair: BLACK_HAIR, top: [R.skinRama[1], R.skinRama[2]], lower: [R.turmeric[1], R.turmeric[2]], accent: R.gold[1], bare: true, acc: ['crown', 'earrings', 'necklace', 'quiver', 'bow'] },
  lakshmana: { skin: R.skinFair, hair: BLACK_HAIR, top: [R.skinFair[1], R.skinFair[2]], lower: [R.saffron[1], R.saffron[2]], accent: R.gold[1], bare: true, acc: ['tiara', 'earrings', 'quiver', 'bow'] },
  sita: { long: true, skin: R.skinFair, hair: BLACK_HAIR, top: [R.red[1], R.red[2]], lower: [R.red[2], R.red[3]], accent: R.gold[1], acc: ['longhair', 'tiara', 'earrings', 'necklace'] },
  dasharatha: { long: true, skin: R.skinWarm, hair: WHITE_HAIR, top: [R.red[1], R.red[2]], lower: [R.gold[2], R.gold[3]], accent: R.gold[1], acc: ['crown', 'beard', 'necklace'] },
  kaikeyi: { long: true, skin: R.skinFair, hair: BLACK_HAIR, top: [R.teal[2], R.teal[3]], lower: [R.teal[3], R.teal[4]], accent: R.gold[1], acc: ['longhair', 'tiara', 'earrings', 'necklace'] },
  kausalya: { long: true, skin: R.skinWarm, hair: GREY_HAIR, top: WHITE_CLOTH, lower: WHITE_CLOTH, accent: R.gold[2], acc: ['longhair', 'tiara', 'necklace'] },
  sumitra: { long: true, skin: R.skinFair, hair: BLACK_HAIR, top: [R.lotus[2], R.lotus[3]], lower: [R.lotus[3], R.lotus[4]], accent: R.gold[1], acc: ['longhair', 'tiara', 'earrings'] },
  bharata: { skin: R.skinTan, hair: BLACK_HAIR, top: [R.skinTan[1], R.skinTan[2]], lower: [R.red[1], R.red[2]], accent: R.gold[1], bare: true, acc: ['crown', 'earrings', 'necklace'] },
  vasishtha: { long: true, skin: R.skinWarm, hair: WHITE_HAIR, top: WHITE_CLOTH, lower: WHITE_CLOTH, accent: R.saffron[2], acc: ['topknot', 'beard', 'staff'] },
  guha: { skin: R.skinDeep, hair: BLACK_HAIR, top: [R.skinDeep[1], R.skinDeep[2]], lower: [R.leaf[2], R.leaf[3]], accent: R.red[1], bare: true, acc: ['headband', 'feather', 'necklace', 'mustache'] },
  sumantra: { skin: R.skinWarm, hair: GREY_HAIR, top: WHITE_CLOTH, lower: [R.indigo[2], R.indigo[3]], accent: R.gold[2], acc: ['turban', 'beardshort'] },
  rishi: { long: true, skin: R.skinTan, hair: GREY_HAIR, top: OCHRE, lower: OCHRE, accent: R.saffron[4], acc: ['topknot', 'beard'] },
  rishika: { long: true, skin: R.skinWarm, hair: BLACK_HAIR, top: OCHRE, lower: OCHRE, accent: R.saffron[1], acc: ['topknot', 'longhair'] },
  villager_m: { skin: R.skinTan, hair: BLACK_HAIR, top: WHITE_CLOTH, lower: [R.wood[1], R.wood[2]], accent: R.saffron[2], acc: ['headband', 'mustache'] },
  villager_f: { long: true, skin: R.skinTan, hair: BLACK_HAIR, top: [R.leaf[1], R.leaf[2]], lower: [R.leaf[2], R.leaf[3]], accent: R.saffron[1], acc: ['longhair', 'flower'] },
  child: { child: true, skin: R.skinWarm, hair: BLACK_HAIR, top: [R.skinWarm[1], R.skinWarm[2]], lower: WHITE_CLOTH, accent: R.saffron[1], bare: true, acc: ['tuft'] },
  merchant: { skin: R.skinWarm, hair: BLACK_HAIR, top: [R.turmeric[1], R.turmeric[2]], lower: WHITE_CLOTH, accent: R.red[2], acc: ['turban', 'mustache'] },
  guard: { skin: R.skinTan, hair: BLACK_HAIR, top: [R.red[2], R.red[3]], lower: [R.red[2], R.red[3]], accent: R.gold[2], acc: ['helmet', 'armor', 'spear', 'mustache'] },
  pandita: { skin: R.skinFair, hair: BLACK_HAIR, top: WHITE_CLOTH, lower: WHITE_CLOTH, accent: R.saffron[1], acc: ['tuft', 'scroll'] },
  shabari: { long: true, skin: R.skinDeep, hair: WHITE_HAIR, top: [R.wood[1], R.wood[2]], lower: [R.wood[2], R.wood[3]], accent: R.saffron[2], acc: ['topknot', 'staff'] },
  jatayu: { kind: 'jatayu', skin: R.vulture, hair: WHITE_HAIR, top: WHITE_CLOTH, lower: WHITE_CLOTH, accent: R.gold[1], acc: [] },
  agastya: { long: true, skin: R.skinTan, hair: WHITE_HAIR, top: [R.saffron[2], R.saffron[3]], lower: [R.saffron[3], R.saffron[4]], accent: R.gold[2], acc: ['topknot', 'beard', 'staff'] },
  hanuman: { skin: R.vanaraFace, hair: [R.vanara[1], R.vanara[2]], top: [R.vanara[1], R.vanara[2]], lower: [R.red[1], R.red[2]], accent: R.gold[1], bare: true, acc: ['muzzle', 'tiara', 'necklace', 'tail', 'mace'] },
  sugriva: { skin: R.vanaraFace, hair: [R.vanara[2], R.vanara[3]], top: [R.vanara[2], R.vanara[3]], lower: [R.leaf[1], R.leaf[2]], accent: R.gold[1], bare: true, acc: ['muzzle', 'crown', 'necklace', 'tail'] },
  jambavan: { skin: [R.bear[0], R.bear[0], R.bear[1], R.bear[2]], hair: [R.bear[1], R.bear[2]], top: [R.bear[1], R.bear[2]], lower: [R.saffron[2], R.saffron[3]], accent: R.gold[2], bare: true, broad: true, acc: ['bear', 'staff', 'necklace'] },
  angada: { skin: R.vanaraFace, hair: [R.vanara[1], R.vanara[2]], top: [R.vanara[1], R.vanara[2]], lower: [R.teal[1], R.teal[2]], accent: R.gold[1], bare: true, acc: ['muzzle', 'tiara', 'tail', 'mace'] },
  vanara: { skin: R.vanaraFace, hair: [R.vanara[2], R.vanara[3]], top: [R.vanara[2], R.vanara[3]], lower: [R.wood[2], R.wood[3]], accent: R.wood[1], bare: true, acc: ['muzzle', 'tail'] },
  vibhishana: { skin: R.rakshasaBlue, hair: BLACK_HAIR, top: WHITE_CLOTH, lower: WHITE_CLOTH, accent: R.gold[1], acc: ['crown', 'mustache', 'necklace'] },
  rakshasa: { skin: R.rakshasaGreen, hair: ['#3a1c30', '#24101e'], top: [R.lanka[1], R.lanka[2]], lower: [R.red[2], R.red[3]], accent: R.gold[2], acc: ['horns', 'fangs', 'wildhair', 'armor', 'spear'] },
  rakshasi: { long: true, skin: R.rakshasaPurple, hair: ['#3a1c30', '#24101e'], top: [R.red[3], R.red[4]], lower: [R.red[3], R.red[4]], accent: R.gold[2], acc: ['longhair', 'wildhair', 'fangs', 'earrings'] },
  ravana: { skin: R.skinTan, hair: BLACK_HAIR, top: [R.gold[2], R.gold[3]], lower: [R.lanka[1], R.lanka[2]], accent: R.red[2], acc: ['tenheads', 'crown', 'mustache', 'armor', 'necklace'] },
  kumbhakarna: { skin: R.rakshasaGreen, hair: ['#3a1c30', '#24101e'], top: [R.rakshasaGreen[1], R.rakshasaGreen[2]], lower: [R.wood[2], R.wood[3]], accent: R.gold[2], bare: true, broad: true, acc: ['horns', 'fangs', 'wildhair', 'necklace'] },
  indrajit: { skin: R.rakshasaPurple, hair: BLACK_HAIR, top: [R.lanka[1], R.lanka[2]], lower: [R.indigo[2], R.indigo[3]], accent: R.gold[1], acc: ['crown', 'armor', 'bow', 'quiver'] },
  lanka_devi: { long: true, skin: R.rakshasaRed, hair: BLACK_HAIR, top: [R.gold[2], R.gold[3]], lower: [R.lanka[1], R.lanka[2]], accent: R.red[1], acc: ['longhair', 'crown', 'earrings', 'spear'] },
  surasa: { long: true, skin: R.serpent, hair: ['#1e3a2a', '#12241a'], top: [R.serpent[1], R.serpent[2]], lower: [R.serpent[2], R.serpent[3]], accent: R.gold[1], acc: ['longhair', 'tiara', 'serpent'] },
  golden_deer: { kind: 'deer', skin: R.deerGold, hair: WHITE_HAIR, top: WHITE_CLOTH, lower: WHITE_CLOTH, accent: R.white[0], acc: [] },
  krauncha: { kind: 'krauncha', skin: R.feather, hair: WHITE_HAIR, top: WHITE_CLOTH, lower: WHITE_CLOTH, accent: R.red[1], acc: [] },
  hunter: { skin: R.skinDeep, hair: BLACK_HAIR, top: [R.skinDeep[1], R.skinDeep[2]], lower: [R.wood[2], R.wood[3]], accent: R.wood[1], bare: true, acc: ['headband', 'feather', 'bow', 'quiver'] },
  // v0.5b (WP-D): Kuśa and Lava, the twins Vālmīki taught the poem (Bāla 1.4.4–12): boys in hermit dress, Rāma's likeness
  // (1.4.10–11), singing to the strings (1.4.8) — the veena; Lava with a tuft instead of a topknot, to tell them apart
  kusha: { child: true, skin: R.skinRama, hair: BLACK_HAIR, top: [R.skinRama[1], R.skinRama[2]], lower: OCHRE, accent: R.saffron[1], bare: true, acc: ['topknot', 'veena'] },
  lava: { child: true, skin: R.skinRama, hair: BLACK_HAIR, top: [R.skinRama[1], R.skinRama[2]], lower: OCHRE, accent: R.gold[1], bare: true, acc: ['tuft', 'veena'] },
  // v0.6: the packages' characters (art-v06-a … -d.ts)
  ...CHARS_A,
  ...CHARS_B,
  ...CHARS_C,
  ...CHARS_D,
};

/** v0.6: package-drawn characters (art-v06-<x>.ts BUILD_<X>): a frame facing down / up / right. */
const V06_BUILD: Partial<Record<SpriteId, (dir: 'down' | 'up' | 'right', frame: 0 | 1 | 2) => Pix>> = { ...BUILD_A, ...BUILD_B, ...BUILD_C, ...BUILD_D };

const EYE = '#1a1020';

export function paletteFor(s: CharSpec): Record<string, C> {
  return {
    S: s.skin[1] as string,
    s: s.skin[2] as string,
    E: EYE,
    H: s.hair[0],
    h: s.hair[1],
    T: s.bare ? (s.skin[1] as string) : s.top[0],
    t: s.bare ? (s.skin[2] as string) : s.top[1],
    A: s.accent,
    L: s.lower[0],
    l: s.lower[1],
    F: s.feet ?? SAND,
  };
}

// ───────────── accessories (drawn in the 'right'/'down'/'up' frame of reference) ─────────────

const G = R.gold;
function accessory(p: Pix, a: Acc, d: SDir, s: CharSpec, frame: number): void {
  const H = s.hair[0];
  const h = s.hair[1];
  switch (a) {
    case 'topknot':
      if (d === 'right') {
        p.ell(6.5, 2.4, 2.2, 1.6, H);
        p.set(6, 2, h);
      } else {
        p.ell(8, 2.2, 2.2, 1.6, H);
        p.set(7, 1, d === 'up' ? h : H);
        p.set(8, 3, h);
      }
      break;
    case 'tuft':
      if (d === 'right') {
        p.set(5, 2, H);
        p.set(5, 3, H);
        p.set(4, 1, H);
      } else {
        p.set(8, 2, H);
        p.set(7, 1, H);
      }
      break;
    case 'crown':
    case 'tiara': {
      const tall = a === 'crown';
      if (d === 'right') {
        p.hl(4, 11, 4, G[2]);
        p.hl(5, 11, 5, G[3]);
        if (tall) {
          p.rect(6, 1, 3, 3, G[2]);
          p.vl(6, 1, 3, G[1]);
          p.set(7, 0, G[1]);
          p.set(10, 3, G[2]);
          p.set(4, 3, G[3]);
        } else {
          p.set(8, 3, G[1]);
          p.set(10, 3, G[2]);
        }
        p.set(9, 4, R.red[1]);
      } else {
        p.hl(4, 11, 4, G[2]);
        p.hl(4, 11, 5, G[3]);
        p.set(4, 4, G[1]);
        if (tall) {
          p.rect(7, 1, 2, 3, G[2]);
          p.set(7, 1, G[1]);
          p.set(7, 0, G[0]);
          p.set(8, 0, G[1]);
          p.vl(5, 2, 3, G[2]);
          p.vl(10, 2, 3, G[2]);
          p.set(4, 3, G[3]);
          p.set(11, 3, G[3]);
        } else {
          p.set(6, 3, G[2]);
          p.set(8, 3, G[1]);
          p.set(7, 3, G[1]);
          p.set(9, 3, G[2]);
        }
        if (d === 'down') {
          p.set(7, 4, R.red[1]);
          p.set(8, 4, R.red[1]);
        }
      }
      break;
    }
    case 'longhair':
      if (d === 'down') {
        p.vl(3, 10, 12, H);
        p.vl(12, 10, 12, H);
        p.set(3, 12, h);
        p.set(12, 12, h);
      } else if (d === 'up') {
        p.rect(5, 11, 6, 3, H);
        p.rect(6, 14, 4, 2, H);
        p.set(7, 16, h);
        p.set(8, 16, h);
        p.vl(8, 11, 15, h);
      } else {
        p.rect(3, 9, 2, 6, H);
        p.vl(3, 10, 14, h);
        p.set(4, 15, h);
      }
      break;
    case 'flower':
      if (d === 'right') {
        p.set(4, 5, R.lotus[1]);
        p.set(3, 6, R.white[0]);
      } else if (d === 'up') {
        p.set(6, 6, R.lotus[1]);
        p.set(9, 6, R.white[0]);
      } else p.set(11, 5, R.lotus[1]);
      break;
    case 'beard':
    case 'beardshort': {
      const W = s.hair[0];
      const Wd = s.hair[1];
      const long = a === 'beard';
      if (d === 'down') {
        p.hl(5, 10, 10, W);
        p.hl(4, 11, 11, W);
        p.set(7, 10, Wd);
        p.set(8, 10, Wd);
        if (long) {
          p.hl(5, 10, 12, W);
          p.hl(6, 9, 13, W);
          p.hl(7, 8, 14, Wd);
          p.set(6, 12, Wd);
        }
      } else if (d === 'right') {
        p.hl(9, 12, 10, W);
        p.hl(8, 12, 11, W);
        p.set(12, 10, Wd);
        if (long) {
          p.hl(9, 11, 12, W);
          p.hl(9, 10, 13, Wd);
        }
      }
      break;
    }
    case 'mustache':
      if (d === 'down') {
        p.hl(6, 9, 10, s.hair[1]);
        p.set(5, 11, s.hair[1]);
        p.set(10, 11, s.hair[1]);
      } else if (d === 'right') {
        p.hl(10, 12, 10, s.hair[1]);
      }
      break;
    case 'horns': {
      const c1 = '#f4ecd8';
      const c2 = '#b8a888';
      if (d === 'right') {
        p.set(9, 3, c2);
        p.set(10, 2, c1);
        p.set(11, 1, c1);
        p.set(5, 3, c2);
        p.set(4, 2, c2);
      } else {
        for (const [x, y] of [
          [4, 3],
          [3, 2],
          [3, 1],
          [11, 3],
          [12, 2],
          [12, 1],
        ] as [number, number][])
          p.set(x, y, y === 1 ? c1 : c2);
      }
      break;
    }
    case 'wildhair':
      if (d === 'down') {
        p.set(3, 4, H);
        p.set(12, 4, H);
        p.set(2, 6, H);
        p.set(13, 6, H);
        p.set(6, 2, H);
        p.set(9, 2, H);
      } else if (d === 'up') {
        p.set(2, 6, H);
        p.set(13, 6, H);
        p.set(6, 2, H);
        p.set(9, 2, H);
        p.set(2, 9, H);
        p.set(13, 9, H);
      } else {
        p.set(2, 5, H);
        p.set(2, 8, H);
        p.set(5, 2, H);
        p.set(3, 3, H);
      }
      break;
    case 'turban': {
      const c = s.top[0] === WHITE_CLOTH[0] && s.accent ? s.accent : s.accent;
      const tc = a === 'turban' ? (s.acc.includes('beardshort') ? WHITE_CLOTH[0] : R.saffron[1]) : c;
      const ts = a === 'turban' ? (s.acc.includes('beardshort') ? WHITE_CLOTH[1] : R.saffron[3]) : c;
      if (d === 'right') {
        p.ell(7.5, 4.5, 5, 2.6, tc);
        p.hl(4, 11, 5, ts);
        p.set(4, 3, ts);
        p.set(3, 4, tc);
      } else {
        p.ell(8, 4.5, 5.5, 2.6, tc);
        p.hl(3, 12, 6, ts);
        if (d === 'down') {
          p.line(5, 3, 9, 5, ts);
          p.set(8, 4, R.red[1]);
        } else p.line(10, 3, 6, 5, ts);
      }
      break;
    }
    case 'helmet': {
      const M = s.metal ?? R.stone;
      if (d === 'right') {
        p.ell(7.5, 4.8, 4.8, 2.8, M[1] as string);
        p.hl(3, 12, 6, M[2] as string);
        p.set(6, 2, M[0] as string);
        p.vl(7, 0, 2, R.red[1]);
      } else {
        p.ell(8, 4.8, 5.2, 2.8, M[1] as string);
        p.hl(3, 12, 6, M[2] as string);
        p.set(6, 3, M[0] as string);
        p.vl(8, 0, 2, R.red[1]);
        p.vl(7, 1, 2, R.red[2]);
      }
      break;
    }
    case 'headband':
      if (d === 'right') p.hl(4, 12, 5, s.accent);
      else p.hl(3, 12, 5, s.accent);
      break;
    case 'feather':
      if (d === 'right') {
        p.vl(4, 1, 4, R.white[0]);
        p.set(4, 1, R.red[1]);
      } else {
        p.vl(11, 1, 4, R.white[0]);
        p.set(11, 1, R.red[1]);
      }
      break;
    case 'earrings':
      if (d === 'down') {
        p.set(3, 11, G[1]);
        p.set(12, 11, G[1]);
      } else if (d === 'right') p.set(7, 10, G[1]);
      break;
    case 'necklace':
      if (d === 'down') {
        p.hl(6, 9, 12, G[1]);
        p.set(7, 13, G[2]);
        p.set(8, 13, R.red[1]);
      } else if (d === 'right') p.set(9, 12, G[1]);
      break;
    case 'armor': {
      const M = G;
      if (d === 'down') {
        p.hl(4, 11, 12, M[2]);
        p.set(4, 12, M[1]);
        p.set(11, 12, M[3]);
        p.hl(5, 10, 14, M[3]);
      } else if (d === 'up') {
        p.hl(4, 11, 12, M[2]);
        p.hl(5, 10, 14, M[3]);
      } else {
        p.hl(5, 10, 12, M[2]);
        p.set(6, 12, M[1]);
      }
      break;
    }
    case 'scroll':
      if (d === 'down') {
        p.rect(11, 14, 3, 2, '#e8d49c');
        p.set(13, 15, '#a08050');
      } else if (d === 'right') {
        p.rect(8, 14, 3, 2, '#e8d49c');
        p.set(10, 15, '#a08050');
      }
      break;
    case 'bow': {
      const W = R.wood;
      if (d === 'down') {
        p.vl(14, 10, 20, W[2]);
        p.set(13, 9, W[1]);
        p.set(13, 21, W[1]);
        p.vl(13, 10, 20, '#f0e8d0');
        p.set(14, 15, G[2]);
      } else if (d === 'up') {
        p.line(4, 11, 11, 18, W[2]);
        p.line(5, 11, 12, 18, W[3]);
      } else {
        p.vl(12, 10, 20, W[2]);
        p.set(11, 9, W[1]);
        p.set(11, 21, W[1]);
        p.vl(11, 10, 20, '#f0e8d0');
        p.set(12, 15, G[2]);
      }
      break;
    }
    case 'quiver':
      if (d === 'up') {
        p.rect(9, 11, 2, 6, R.wood[3]);
        p.vl(9, 11, 16, R.wood[2]);
        p.set(9, 10, R.white[0]);
        p.set(10, 9, R.red[1]);
        p.set(11, 10, R.white[0]);
      } else if (d === 'down') {
        p.set(4, 10, R.white[0]);
        p.set(3, 9, R.red[1]);
      } else {
        p.rect(4, 11, 2, 5, R.wood[3]);
        p.vl(4, 11, 15, R.wood[2]);
        p.set(4, 10, R.white[0]);
        p.set(3, 9, R.red[1]);
      }
      break;
    case 'mace':
      if (d === 'down') {
        p.vl(13, 12, 17, G[3]);
        p.ell(13.5, 10.5, 2, 2, G[2]);
        p.set(13, 9, G[0]);
        p.set(14, 11, G[3]);
      } else if (d === 'up') {
        p.vl(2, 12, 17, G[3]);
        p.ell(2.5, 10.5, 2, 2, G[2]);
        p.set(2, 9, G[1]);
      } else {
        p.line(8, 15, 11, 11, G[3]);
        p.ell(12, 9.5, 2, 2, G[2]);
        p.set(11, 8, G[0]);
      }
      break;
    case 'staff':
    case 'spear': {
      const wc = R.wood[2];
      const tip = a === 'spear' ? R.stone[1] : R.wood[1];
      if (d === 'down') {
        p.vl(13, 5, 22, wc);
        p.set(13, 4, tip);
        if (a === 'spear') {
          p.set(13, 3, tip);
          p.set(12, 5, tip);
          p.set(14, 5, tip);
        }
      } else if (d === 'up') {
        p.vl(2, 5, 22, wc);
        p.set(2, 4, tip);
        if (a === 'spear') p.set(2, 3, tip);
      } else {
        p.vl(12, 4, 22, wc);
        p.set(12, 3, tip);
        if (a === 'spear') {
          p.set(12, 2, tip);
          p.set(13, 4, tip);
          p.set(11, 4, tip);
        }
      }
      break;
    }
    case 'veena':
      if (d === 'down') {
        p.line(3, 8, 12, 19, R.wood[2]);
        p.ell(12.5, 19, 2, 2, R.wood[1]);
        p.ell(4, 9, 1.5, 1.5, R.wood[1]);
      } else if (d === 'up') {
        p.line(12, 8, 4, 18, R.wood[2]);
        p.ell(4, 18.5, 2, 2, R.wood[1]);
      } else {
        p.line(6, 8, 11, 18, R.wood[2]);
        p.ell(11.5, 18.5, 2, 2, R.wood[1]);
      }
      break;
    case 'muzzle': {
      const m = R.vanaraFace[0];
      const fur = s.hair[0];
      const furd = s.hair[1];
      if (d === 'down') {
        for (let y = 6; y <= 10; y++) {
          p.set(3, y, fur);
          p.set(12, y, fur);
        }
        p.set(4, 11, furd);
        p.set(11, 11, furd);
        p.hl(5, 10, 10, m);
        p.hl(6, 9, 11, m);
        p.set(7, 10, '#5a3828');
        p.set(8, 10, '#5a3828');
        p.hl(5, 10, 7, s.skin[2] as string);
        p.set(2, 8, s.skin[2] as string);
        p.set(13, 8, s.skin[2] as string);
        p.set(2, 9, furd);
        p.set(13, 9, furd);
      } else if (d === 'right') {
        p.hl(11, 13, 10, m);
        p.hl(10, 12, 11, m);
        p.set(13, 9, '#5a3828');
        p.vl(7, 9, 10, fur);
        p.set(6, 8, s.skin[2] as string);
        p.set(5, 11, furd);
      } else {
        p.set(2, 8, s.skin[2] as string);
        p.set(13, 8, s.skin[2] as string);
      }
      break;
    }
    case 'bear': {
      const m = R.bear[0];
      if (d === 'down') {
        p.hl(6, 9, 10, '#c8b0a0');
        p.hl(6, 9, 11, '#c8b0a0');
        p.set(7, 10, '#2a1810');
        p.set(8, 10, '#2a1810');
        p.ell(4, 3.5, 1.4, 1.4, s.hair[0]);
        p.ell(11, 3.5, 1.4, 1.4, s.hair[0]);
        p.set(5, 7, '#e8e0d8');
        p.set(10, 7, '#e8e0d8');
      } else if (d === 'right') {
        p.hl(11, 13, 9, '#c8b0a0');
        p.hl(11, 13, 10, '#c8b0a0');
        p.set(13, 9, '#2a1810');
        p.ell(6, 3.5, 1.4, 1.4, s.hair[0]);
      } else {
        p.ell(4, 3.5, 1.4, 1.4, s.hair[0]);
        p.ell(11, 3.5, 1.4, 1.4, s.hair[0]);
      }
      void m;
      break;
    }
    case 'tenheads': {
      // four smaller crowned heads flank the main head (ten heads suggested in 16px)
      const sk = s.skin[1] as string;
      const sd = s.skin[2] as string;
      const head = (x: number, y: number, face: boolean): void => {
        p.rect(x, y, 2, 3, sk);
        p.set(x + 1, y + 2, sd);
        p.hl(x, x + 1, y - 1, G[2]);
        if (face) p.set(x + (x < 8 ? 1 : 0), y + 1, '#1a1020');
      };
      if (d === 'right') {
        head(1, 2, false);
        head(0, 7, false);
      } else {
        head(1, 2, d === 'down');
        head(13, 2, d === 'down');
        head(0, 7, d === 'down');
        head(14, 7, d === 'down');
      }
      break;
    }
    case 'serpent': {
      p.clearRows(16, 23);
      const sk = R.serpent;
      const sw = frame === 1 ? -1 : frame === 2 ? 1 : 0;
      if (d === 'right') {
        p.capsule(7, 16, 6, 21, 2.6, sk);
        p.capsule(6, 21, 12, 21, 2, sk);
        p.capsule(12, 21, 14, 18 + sw, 1.2, sk, 0.6);
      } else {
        p.capsule(8, 16, 8, 20, 3, sk);
        p.ell(8 + sw * 0.5, 20.5, 5.5, 2.4, sk[2] as string);
        p.ell(8 + sw * 0.5, 20.5, 4.5, 1.6, sk[1] as string);
        p.capsule(12 + sw, 21, 14.5, 17.5 + sw, 1.2, sk, 0.5);
        p.set(8, 18, sk[0] as string);
      }
      break;
    }
    case 'tail': {
      const c = s.hair[0];
      const cd = s.hair[1];
      const sw = frame === 1 ? -1 : frame === 2 ? 1 : 0;
      if (d === 'down') {
        p.set(12, 17, cd);
        p.set(13, 16, c);
        p.set(14, 15 + sw, c);
        p.set(14, 14 + sw, c);
        p.set(14, 13 + sw, c);
        p.set(13, 12 + sw, c);
      } else if (d === 'up') {
        p.vl(8, 16, 18, c);
        p.set(9, 19, c);
        p.set(10, 19, c);
        p.set(11, 18 + sw, c);
        p.set(12, 17 + sw, c);
        p.set(12, 16 + sw, cd);
        p.set(11, 15 + sw, c);
      } else {
        p.set(4, 16, c);
        p.set(3, 17, c);
        p.set(2, 16 + sw, c);
        p.set(2, 15 + sw, c);
        p.set(2, 14 + sw, c);
        p.set(3, 13 + sw, cd);
      }
      break;
    }
    case 'fangs':
      if (d === 'down') {
        p.set(6, 11, '#ffffff');
        p.set(9, 11, '#ffffff');
      } else if (d === 'right') p.set(11, 11, '#ffffff');
      break;
  }
}

// draw-order: things behind the body first
const BEHIND: Partial<Record<SDir, Acc[]>> = {
  down: ['longhair', 'tail', 'veena', 'tenheads'],
  right: ['quiver', 'tail', 'longhair', 'tenheads', 'staff', 'spear'],
  up: ['bow', 'mace', 'staff', 'spear', 'tenheads'],
};

function humanoid(s: CharSpec, d: SDir, frame: 0 | 1 | 2): Pix {
  const p = new Pix(SPRITE_W, SPRITE_H);
  const pal = paletteFor(s);
  const behind = BEHIND[d] ?? [];
  for (const a of s.acc) if (behind.includes(a)) accessory(p, a, d, s, frame);
  const body = new Pix(SPRITE_W, SPRITE_H);
  body.grid(bodyGrid(d, !!s.long, frame), pal);
  if (s.broad) {
    for (let y = 12; y <= 15; y++) {
      body.set(2, y, pal['S'] as string);
      body.set(13, y, pal['S'] as string);
      if (y === 12) {
        body.set(3, y, pal['T'] as string);
        body.set(12, y, pal['T'] as string);
      }
    }
    if (d === 'right') for (let y = 12; y <= 15; y++) body.set(11, y, pal['T'] as string);
  }
  p.blit(body, 0, 0);
  for (const a of s.acc) if (!behind.includes(a)) accessory(p, a, d, s, frame);
  // hair under crowns etc. stays; sacred-thread sash already in grid
  let out = p;
  if (s.child) {
    // compress rows: remove torso/leg rows for a smaller build, keep the bottom aligned
    const drop = new Set([3, 13, 16, 17, 19]);
    const q = new Pix(SPRITE_W, SPRITE_H);
    let ty = SPRITE_H - 1;
    for (let y = SPRITE_H - 1; y >= 0; y--) {
      if (drop.has(y)) continue;
      for (let x = 0; x < SPRITE_W; x++) q.set(x, ty, p.get(x, y));
      ty--;
    }
    out = q;
  }
  out.outline(s.outline ?? '#24162c');
  return out;
}

// ───────────── non-humanoids ─────────────

function krauncha(d: SDir, frame: number): Pix {
  const p = new Pix(16, 24);
  const F = R.feather;
  const legC = '#b06048';
  const step = frame === 0 ? 0 : frame === 1 ? -1 : 1;
  if (d === 'right') {
    p.vl(7, 16, 22, legC);
    p.vl(9 + step, 16, 22, legC);
    p.set(8, 22, legC);
    p.set(10 + step, 22, legC);
    p.ball(7, 13.5, 4.8, 3.2, F);
    p.capsule(3, 12, 1, 15, 1.5, F, 1); // tail
    p.capsule(10, 12, 11, 6, 1.1, F, 1.1); // neck
    p.ball(11.5, 5.5, 2, 1.8, F);
    p.set(12, 4, R.red[1]);
    p.set(11, 4, R.red[1]);
    p.set(12, 5, '#1a1020');
    p.hl(13, 15, 6, '#e0a040');
    p.line(5, 12, 9, 12, F[2] as string);
  } else {
    const back = d === 'up';
    p.vl(7 - (step < 0 ? 0 : 0), 16, 22 + (step < 0 ? 0 : 0), legC);
    p.vl(9, 16, 22, legC);
    if (step) p.set(step < 0 ? 7 : 9, 22, null);
    p.ball(8, 13.5, 4.2, 3.4, F);
    p.capsule(8, 12, 8, 6, 1.2, F, 1.1);
    p.ball(8, 5, 2, 1.8, F);
    p.set(7, 3, R.red[1]);
    p.set(8, 3, R.red[1]);
    p.set(9, 3, R.red[1]);
    if (!back) {
      p.set(7, 5, '#1a1020');
      p.set(9, 5, '#1a1020');
      p.vl(8, 6, 8, '#e0a040');
    } else {
      p.ell(8, 16, 2.5, 1.5, F[2] as string);
    }
    p.set(4, 13, F[2] as string);
    p.set(12, 13, F[2] as string);
  }
  p.outline('#2a2232');
  return p;
}

function jatayu(d: SDir, frame: number): Pix {
  const p = new Pix(16, 24);
  const V = R.vulture;
  const step = frame === 0 ? 0 : frame === 1 ? -1 : 1;
  const legC = '#e0a838';
  const headR = ['#f4d0b8', '#dca088', '#b07860'];
  if (d === 'right') {
    p.vl(6, 19, 22, legC);
    p.vl(9 + step, 19, 22, legC);
    p.set(10 + step, 22, legC);
    p.set(7, 22, legC);
    p.ball(7, 14, 5.6, 5.4, V);
    p.capsule(5, 9, 1, 20, 2.2, V, 1.4, 0.1); // folded wing
    for (let y = 11; y < 20; y += 2) p.set(3 + ((y >> 1) % 2), y, V[3] as string);
    p.ell(10, 9.5, 3, 2, R.white[0]);
    p.ball(11.5, 6, 2.4, 2.2, headR);
    p.set(12, 5, '#1a1020');
    p.set(14, 6, G[2]);
    p.set(14, 7, G[3]);
    p.set(13, 7, G[2]);
    p.set(10, 4, R.white[1]);
  } else {
    const back = d === 'up';
    p.vl(6, 19, 22 + (step < 0 ? -1 : 0), legC);
    p.vl(10, 19, 22 + (step > 0 ? -1 : 0), legC);
    // raised shoulders of the wings
    p.capsule(4, 8, 3, 19, 2.6, V, 2, 0.05);
    p.capsule(12, 8, 13, 19, 2.6, V, 2, 0.15);
    p.ball(8, 14.5, 4.2, 5, V, -0.05);
    for (let y = 10; y < 19; y += 3) {
      p.set(3, y, V[3] as string);
      p.set(13, y, V[3] as string);
    }
    p.ell(8, 8.5, 3.6, 1.8, R.white[0]);
    p.ball(8, 5.5, 2.6, 2.4, headR);
    if (!back) {
      p.set(7, 5, '#1a1020');
      p.set(9, 5, '#1a1020');
      p.set(8, 6, G[2]);
      p.set(8, 7, G[3]);
      p.hl(6, 10, 15, V[0] as string);
    } else {
      p.vl(8, 11, 18, V[3] as string);
      p.ell(8, 19, 2.5, 1.2, V[2] as string);
    }
  }
  p.outline('#24161c');
  return p;
}

function deer(d: SDir, frame: number): Pix {
  const p = new Pix(16, 24);
  const D = R.deerGold;
  const silver = '#f4f4ff';
  const k = frame === 0 ? 0 : frame === 1 ? 1 : -1;
  if (d === 'right') {
    for (const [x, ph] of [
      [3, 1],
      [5, -1],
      [10, 1],
      [12, -1],
    ] as [number, number][]) {
      const off = ph * k;
      p.line(x, 16, x + off, 22, D[3] as string);
    }
    p.ball(7.5, 14, 6, 3, D);
    p.capsule(11.5, 13, 12.5, 9, 1.3, D, 1.2);
    p.ball(13, 8, 2, 1.7, D);
    p.set(15, 9, D[2] as string);
    p.set(13, 7, '#1a1020');
    p.set(12, 6, D[3] as string);
    p.line(12, 6, 11, 3, D[4] as string);
    p.line(11, 3, 10, 2, D[4] as string);
    p.set(12, 3, D[4] as string);
    p.line(13, 6, 14, 3, D[4] as string);
    p.set(2, 12, silver);
    p.set(1, 12, D[1] as string);
    for (const [x, y] of [
      [5, 13],
      [8, 12],
      [10, 14],
      [6, 15],
    ] as [number, number][])
      p.set(x, y, silver);
  } else {
    const back = d === 'up';
    p.line(6, 17, 6, 22 - (k > 0 ? 1 : 0), D[3] as string);
    p.line(10, 17, 10, 22 - (k < 0 ? 1 : 0), D[3] as string);
    p.ball(8, 14.5, 3.6, 4, D);
    if (!back) {
      p.capsule(8, 12, 8, 8, 1.4, D);
      p.ball(8, 7, 2.2, 2, D);
      p.set(7, 7, '#1a1020');
      p.set(9, 7, '#1a1020');
      p.set(8, 9, D[3] as string);
      p.set(5, 6, D[2] as string);
      p.set(11, 6, D[2] as string);
    } else {
      p.ball(8, 8, 2, 2, D);
      p.set(8, 18, silver);
      p.set(8, 19, silver);
    }
    p.line(7, 5, 5, 2, D[4] as string);
    p.line(9, 5, 11, 2, D[4] as string);
    p.set(4, 3, D[4] as string);
    p.set(12, 3, D[4] as string);
    p.set(6, 14, silver);
    p.set(10, 13, silver);
    p.set(9, 16, silver);
  }
  p.outline('#4a2c10');
  return p;
}

/** Build one frame of a character facing d (left = mirrored right). */
export function buildSprite(id: SpriteId, dir: 'down' | 'up' | 'left' | 'right', frame: 0 | 1 | 2): Pix {
  const s = CHARS[id];
  const d: SDir = dir === 'left' ? 'right' : dir;
  let p: Pix;
  const own = V06_BUILD[id];
  if (own) p = own(d, frame);
  else if (s.kind === 'krauncha') p = krauncha(d, frame);
  else if (s.kind === 'jatayu') p = jatayu(d, frame);
  else if (s.kind === 'deer') p = deer(d, frame);
  else p = humanoid(s, d, frame);
  return dir === 'left' ? p.flipped() : p;
}

/** Portrait (48x48): the down-facing head and shoulders, upscaled x3 from a 16x16 crop. */
export function buildPortraitCrop(id: SpriteId): Pix {
  const full = buildSprite(id, 'down', 0);
  const crop = new Pix(16, 16);
  const s = CHARS[id];
  const y0 = s.kind === 'deer' || s.kind === 'krauncha' || s.kind === 'jatayu' ? 1 : s.child ? 3 : 0;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) crop.set(x, y, full.get(x, y + y0));
  return crop;
}

/** 24x24 busts (facing right) for the bird characters' dialogue portraits. */
export function buildBirdBust(id: SpriteId): Pix | null {
  const kind = CHARS[id].kind;
  const p = new Pix(24, 24);
  if (kind === 'jatayu') {
    const V = R.vulture;
    const headR = ['#f8dcc8', '#e8b098', '#c88870', '#985c48'];
    p.ball(11, 23, 11.5, 8.5, V);
    for (let x = 3; x < 20; x += 3) p.paint(x, 19 + (x % 2), V[3] as string);
    p.ball(13, 15.5, 7.5, 3.4, R.white);
    p.capsule(13, 14, 14, 9, 3, headR);
    p.ball(14.5, 8, 4.8, 4.4, headR);
    p.poly(
      [
        [18, 6],
        [23, 8],
        [23, 11],
        [21, 13],
        [18, 11],
      ],
      G[2],
    );
    p.set(22, 12, G[4]);
    p.set(21, 12, G[3]);
    p.hl(19, 22, 7, G[1]);
    p.set(16, 6, '#1a1020');
    p.set(16, 5, '#ffffff');
    p.line(13, 4, 17, 4, headR[3] as string);
    p.outline('#24161c');
    return p;
  }
  if (kind === 'krauncha') {
    const F = R.feather;
    p.ball(9, 23, 9.5, 6.5, F);
    p.capsule(10, 20, 12, 9, 2.4, F, 2);
    p.ball(13, 7, 4.2, 3.6, F);
    p.rect(11, 3, 5, 2, R.red[1]);
    p.set(12, 3, R.red[0]);
    p.line(16, 8, 23, 10, '#e0a040', 2);
    p.set(23, 10, '#a06020');
    p.set(14, 6, '#1a1020');
    p.line(4, 21, 14, 23, F[2] as string);
    p.outline('#2a2232');
    return p;
  }
  return null;
}
