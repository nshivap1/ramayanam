/**
 * Pixel art for Rāmāyaṇa-yātrā: every tile, character, battler, background, light overlay and the
 * HUD font are generated in code (no image files) and cached into offscreen canvases on first use.
 * Runtime drawing is drawImage from those atlases only. OWNER: art.
 */
import { PROP_IDS, SPRITE_IDS, TILE_IDS } from './catalog';
import type { BattleBgId, BattlerId, PropId, SpriteId, TileId } from './catalog';
import { PROPS_A } from './art-v06-a';
import { PROPS_B } from './art-v06-b';
import { PROPS_C } from './art-v06-c';
import { PROPS_D } from './art-v06-d';
import type { Dir, MapDef } from './types';
import { HAS_DOM, Pix, makeCanvas, pixCanvas, putPix } from './art-core';
import { type FringeSide, OBJECT_TILES, TILES, buildFringe, createGroundResolver, drawObjectLayer, fringeBetween } from './art-tiles';
import { SPRITE_H, SPRITE_W, buildBirdBust, buildPortraitCrop, buildSprite } from './art-sprites';
import { BATTLERS, BATTLER_FRAMES, buildBattler, battlerPortraitCrop, spritePortraitCrop } from './art-battlers';
import { CHARS } from './art-sprites';
import { BGS, type BgLayers, buildBg, drawBgAnim } from './art-bg';
import { GLYPHS, GLYPH_ADV, GLYPH_H, GLYPH_W } from './art-font';

export interface Art {
  /** 16x16 tile at internal-pixel coords; t = seconds (animated water etc). */
  drawTile(ctx: CanvasRenderingContext2D, id: TileId, x: number, y: number, t: number): void;
  /** 16x24 character; (x, y) = top-left of the 16x16 tile it stands on (sprite extends 8px above). */
  drawSprite(ctx: CanvasRenderingContext2D, id: SpriteId, x: number, y: number, dir: Dir, frame: 0 | 1 | 2): void;
  /** 64x64 battler drawn facing LEFT; flip=true mirrors it (allies face right). */
  drawBattler(ctx: CanvasRenderingContext2D, id: BattlerId, x: number, y: number, opts?: { flip?: boolean; alpha?: number; flash?: boolean; t?: number }): void;
  /** Full 320x180 battle background. */
  drawBattleBg(ctx: CanvasRenderingContext2D, id: BattleBgId, t: number): void;
  /** Full-screen ambient light overlay for a map (day/dusk/night/dawn/interior). */
  drawLight(ctx: CanvasRenderingContext2D, light: MapDef['light'], t: number): void;
  /** Crisp data-URL portrait (character head/shoulders) for DOM <img>. */
  portraitUrl(id: SpriteId): string;
  /** Data-URL battler image for DOM <img>. */
  battlerUrl(id: BattlerId): string;
  /** 5x7 ASCII pixel font for canvas HUD numbers/labels. */
  drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color?: string): void;
  /**
   * v0.6 effects kit: a prop at (x, y) = the top-left of the tile it stands on — a PROP_ID (16×16, art-v06-<x>.ts), any
   * TileId (drawn as an object) or a SpriteId (a figure facing down). Unknown ids draw nothing.
   */
  drawProp(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, t: number): void;
}

/** v0.6: the packages' prop drawings (art-v06-<x>.ts). */
export const PROP_DRAW: Record<PropId, (p: Pix) => void> = { ...PROPS_A, ...PROPS_B, ...PROPS_C, ...PROPS_D };

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
type Canvas = HTMLCanvasElement;

/** Map ids that have a full-size battler portrait source (sprite id → battler id). */
const PORTRAIT_FROM_BATTLER: Partial<Record<SpriteId, BattlerId>> = {
  player_a: 'b_player_a',
  player_b: 'b_player_b',
  rama: 'b_rama',
  lakshmana: 'b_lakshmana',
  hanuman: 'b_hanuman',
  sugriva: 'b_sugriva',
  jambavan: 'b_jambavan',
  vibhishana: 'b_vibhishana',
  bharadvaja: 'b_bharadvaja',
  pandita: 'b_pandita',
  ravana: 'b_ravana',
  kumbhakarna: 'b_kumbhakarna',
  indrajit: 'b_indrajit',
  lanka_devi: 'b_lanka_devi',
  surasa: 'b_surasa',
  rakshasi: 'b_rakshasi',
  golden_deer: 'b_maya_mriga',
};

export function createArt(): Art {
  let tileAtlas: Canvas | null = null;
  let objAtlas: Canvas | null = null;
  const tileRow = new Map<TileId, number>();
  const ground = createGroundResolver();
  const fringes = new Map<FringeSide, Canvas | null>();
  const fringe = (side: FringeSide): Canvas | null => {
    if (!fringes.has(side)) fringes.set(side, pixCanvas(buildFringe(side)));
    return fringes.get(side) ?? null;
  };
  /** Soft grass edges where grass meets path/sand (drawn by the later tile of each pair). */
  const edges = (ctx: CanvasRenderingContext2D, rx: number, ry: number, here: TileId): void => {
    const v = fringeBetween(ground.at(rx - 16, ry), here, true);
    if (v) {
      const img = fringe(v);
      if (img) ctx.drawImage(img, rx - 2, ry);
    }
    const h = fringeBetween(ground.at(rx, ry - 16), here, false);
    if (h) {
      const img = fringe(h);
      if (img) ctx.drawImage(img, rx, ry - 2);
    }
  };
  const sprites = new Map<SpriteId, Canvas | null>();
  /** v0.6: prop canvases (PROP_IDS) */
  const props = new Map<string, Canvas | null>();
  const battlers = new Map<BattlerId, { img: Canvas | null; white: Canvas | null }>();
  const bgs = new Map<BattleBgId, BgLayers | null>();
  const portraits = new Map<string, string>();
  let shadow: Canvas | null = null;
  let fontAtlas: Canvas | null = null;
  const fontTint = new Map<string, Canvas | null>();
  const lights = new Map<string, Canvas | null>();

  const ensureTiles = (): Canvas | null => {
    if (tileAtlas || !HAS_DOM) return tileAtlas;
    const maxF = 4;
    tileAtlas = makeCanvas(16 * maxF, 16 * TILE_IDS.length);
    if (!tileAtlas) return null;
    objAtlas = makeCanvas(16 * maxF, 16 * TILE_IDS.length);
    TILE_IDS.forEach((id, row) => {
      tileRow.set(id, row);
      const def = TILES[id];
      for (let f = 0; f < def.frames; f++) {
        const p = new Pix(16, 16);
        def.draw(p, f);
        putPix(tileAtlas as Canvas, p, f * 16, row * 16);
        if (OBJECT_TILES[id] && objAtlas) {
          const q = new Pix(16, 16);
          drawObjectLayer(id, q, f);
          putPix(objAtlas, q, f * 16, row * 16);
        }
      }
    });
    return tileAtlas;
  };

  const spriteSheet = (id: SpriteId): Canvas | null => {
    if (sprites.has(id)) return sprites.get(id) ?? null;
    if (!CHARS[id]) return null; // unknown id from content: draw nothing rather than crash
    const c = makeCanvas(SPRITE_W * 3, SPRITE_H * 4);
    if (c) {
      DIRS.forEach((d, row) => {
        for (let f = 0; f < 3; f++) putPix(c, buildSprite(id, d, f as 0 | 1 | 2), f * SPRITE_W, row * SPRITE_H);
      });
    }
    sprites.set(id, c);
    return c;
  };

  const battlerSheet = (id: BattlerId): { img: Canvas | null; white: Canvas | null } => {
    const hit = battlers.get(id);
    if (hit) return hit;
    if (!BATTLERS[id]) return { img: null, white: null };
    const img = makeCanvas(64 * BATTLER_FRAMES, 64);
    const white = makeCanvas(64 * BATTLER_FRAMES, 64);
    if (img && white) {
      for (let f = 0; f < BATTLER_FRAMES; f++) {
        const p = buildBattler(id, f);
        putPix(img, p, f * 64, 0);
        putPix(white, p.silhouette('#ffffff'), f * 64, 0);
      }
    }
    const v = { img, white };
    battlers.set(id, v);
    return v;
  };

  const shadowImg = (): Canvas | null => {
    if (shadow || !HAS_DOM) return shadow;
    const p = new Pix(12, 4);
    p.ell(6, 2, 6, 2, '#10081840');
    p.ell(6, 2, 4.5, 1.4, '#10081860');
    shadow = pixCanvas(p);
    return shadow;
  };

  const font = (color: string): Canvas | null => {
    if (!HAS_DOM) return null;
    if (fontTint.has(color)) return fontTint.get(color) ?? null;
    if (fontTint.size > 48) fontTint.clear(); // bound the per-colour cache
    if (!fontAtlas) {
      const p = new Pix(GLYPH_ADV * 96, GLYPH_H);
      for (let code = 32; code < 127; code++) {
        const g = GLYPHS.get(code);
        if (!g) continue;
        for (let r = 0; r < GLYPH_H; r++) for (let k = 0; k < GLYPH_W; k++) if (((g[r] ?? 0) >> (4 - k)) & 1) p.set((code - 32) * GLYPH_ADV + k, r, '#ffffff');
      }
      fontAtlas = pixCanvas(p);
    }
    const c = makeCanvas(GLYPH_ADV * 96, GLYPH_H);
    const g = c?.getContext('2d');
    if (c && g && fontAtlas) {
      g.drawImage(fontAtlas, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
    }
    fontTint.set(color, c);
    return c;
  };

  const lightImg = (key: string, build: (g: CanvasRenderingContext2D) => void): Canvas | null => {
    if (lights.has(key)) return lights.get(key) ?? null;
    const c = makeCanvas(320, 180);
    const g = c?.getContext('2d');
    if (c && g) build(g);
    lights.set(key, c);
    return c;
  };

  const vignette = (g: CanvasRenderingContext2D, color: string, inner: number, outer: number, alpha: number): void => {
    const grd = g.createRadialGradient(160, 90, inner, 160, 90, outer);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, color);
    g.globalAlpha = alpha;
    g.fillStyle = grd;
    g.fillRect(0, 0, 320, 180);
    g.globalAlpha = 1;
  };

  const toDataUrl = (p: Pix, scale: number): string => {
    if (!HAS_DOM) return '';
    const src = pixCanvas(p);
    const c = makeCanvas(p.w * scale, p.h * scale);
    const g = c?.getContext('2d');
    if (!src || !c || !g) return '';
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    try {
      return c.toDataURL('image/png');
    } catch {
      return '';
    }
  };

  return {
    drawTile(ctx, id, x, y, t) {
      const atlas = ensureTiles();
      if (!atlas) return;
      const def = TILES[id];
      const row = tileRow.get(id);
      if (!def || row === undefined) return;
      const rx = Math.round(x);
      const ry = Math.round(y);
      const frame = (d: { frames: number; fps: number }): number => (d.frames > 1 ? Math.floor(Math.max(0, t) * d.fps) % d.frames : 0);
      const f = frame(def);
      // object tiles sit on the ground drawn next to them (left/above) when that ground is known
      const under = objAtlas ? ground.resolve(rx, ry, id) : null;
      const urow = under ? tileRow.get(under) : undefined;
      if (under && urow !== undefined && objAtlas) {
        ctx.drawImage(atlas, frame(TILES[under]) * 16, urow * 16, 16, 16, rx, ry, 16, 16);
        edges(ctx, rx, ry, under);
        ctx.drawImage(objAtlas, f * 16, row * 16, 16, 16, rx, ry, 16, 16);
        ground.note(rx, ry, under);
        return;
      }
      ctx.drawImage(atlas, f * 16, row * 16, 16, 16, rx, ry, 16, 16);
      const base = OBJECT_TILES[id]?.base ?? id;
      if (!OBJECT_TILES[id]) edges(ctx, rx, ry, id);
      ground.note(rx, ry, base);
    },

    drawSprite(ctx, id, x, y, dir, frame) {
      const sheet = spriteSheet(id);
      if (!sheet) return;
      const sh = shadowImg();
      const rx = Math.round(x);
      const ry = Math.round(y);
      if (sh) ctx.drawImage(sh, rx + 2, ry + 12);
      const row = Math.max(0, DIRS.indexOf(dir));
      const f = frame === 1 || frame === 2 ? frame : 0;
      ctx.drawImage(sheet, f * SPRITE_W, row * SPRITE_H, SPRITE_W, SPRITE_H, rx, ry - 8, SPRITE_W, SPRITE_H);
    },

    drawBattler(ctx, id, x, y, opts = {}) {
      const sheet = battlerSheet(id);
      const src = opts.flash ? sheet.white : sheet.img;
      if (!src) return;
      const t = opts.t ?? 0;
      const f = Math.floor(t * 2.2) % BATTLER_FRAMES;
      const bob = BATTLERS[id]?.float ? Math.round(Math.sin(t * 2.4) * 2) : 0;
      const prevA = ctx.globalAlpha;
      if (opts.alpha !== undefined) ctx.globalAlpha = prevA * Math.max(0, Math.min(1, opts.alpha));
      const rx = Math.round(x);
      const ry = Math.round(y) + bob;
      if (opts.flip) {
        ctx.save();
        ctx.translate(rx + 64, ry);
        ctx.scale(-1, 1);
        ctx.drawImage(src, f * 64, 0, 64, 64, 0, 0, 64, 64);
        ctx.restore();
      } else ctx.drawImage(src, f * 64, 0, 64, 64, rx, ry, 64, 64);
      ctx.globalAlpha = prevA;
    },

    drawBattleBg(ctx, id, t) {
      if (!HAS_DOM) return;
      let layers = bgs.get(id);
      if (layers === undefined) {
        layers = BGS[id] ? buildBg(id) : null;
        bgs.set(id, layers);
      }
      if (!layers) return;
      drawBgAnim(ctx, id, layers, t);
    },

    drawLight(ctx, light, t) {
      if (!light || light === 'day' || !HAS_DOM) return;
      // two cached layers per light: a multiply tint (colour grading) and a soft source-over glow/vignette
      const mul = lightImg(light + ':mul', (g) => {
        const grd = g.createLinearGradient(0, 0, 0, 180);
        if (light === 'dawn') {
          grd.addColorStop(0, '#ffd8e0');
          grd.addColorStop(1, '#fff2e6');
        } else if (light === 'dusk') {
          grd.addColorStop(0, '#b890d0');
          grd.addColorStop(0.6, '#f0a890');
          grd.addColorStop(1, '#ffb878');
        } else if (light === 'night') {
          grd.addColorStop(0, '#5464b4');
          grd.addColorStop(1, '#6676c2');
        } else {
          grd.addColorStop(0, '#ffe0b0');
          grd.addColorStop(1, '#f8d0a0');
        }
        g.fillStyle = grd;
        g.fillRect(0, 0, 320, 180);
      });
      const over = lightImg(light + ':over', (g) => {
        if (light === 'dawn') {
          const grd = g.createLinearGradient(0, 0, 0, 180);
          grd.addColorStop(0, 'rgba(255,170,190,0.18)');
          grd.addColorStop(1, 'rgba(255,220,170,0.0)');
          g.fillStyle = grd;
          g.fillRect(0, 0, 320, 180);
        } else if (light === 'dusk') vignette(g, 'rgba(70,20,70,1)', 110, 230, 0.4);
        else if (light === 'night') vignette(g, 'rgba(4,4,28,1)', 90, 220, 0.55);
        else vignette(g, 'rgba(40,14,6,1)', 70, 205, 0.6);
      });
      if (!mul || !over) return;
      const cw = ctx.canvas?.width ?? 320;
      const chh = ctx.canvas?.height ?? 180;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(mul, 0, 0, cw, chh);
      ctx.globalCompositeOperation = 'source-over';
      if (light === 'interior') ctx.globalAlpha = 0.9 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.1) * 0.04; // lamp flicker
      else if (light === 'night') ctx.globalAlpha = 0.95 + Math.sin(t * 0.8) * 0.05;
      ctx.drawImage(over, 0, 0, cw, chh);
      ctx.restore();
    },

    portraitUrl(id) {
      const key = 'p:' + id;
      const hit = portraits.get(key);
      if (hit !== undefined) return hit;
      let url = '';
      if (!CHARS[id]) return '';
      const kind = CHARS[id].kind ?? 'human';
      const bid = PORTRAIT_FROM_BATTLER[id];
      const bird = kind === 'jatayu' || kind === 'krauncha' ? buildBirdBust(id) : null;
      if (kind === 'human') url = toDataUrl(spritePortraitCrop(id), 2);
      else if (bird) url = toDataUrl(bird, 2);
      else if (bid) url = toDataUrl(battlerPortraitCrop(bid), 2);
      else url = toDataUrl(buildPortraitCrop(id), 3);
      portraits.set(key, url);
      return url;
    },

    battlerUrl(id) {
      const key = 'b:' + id;
      const hit = portraits.get(key);
      if (hit !== undefined) return hit;
      if (!BATTLERS[id]) return '';
      const url = toDataUrl(buildBattler(id, 0), 2);
      portraits.set(key, url);
      return url;
    },

    drawProp(ctx, id, x, y, t) {
      if ((PROP_IDS as readonly string[]).includes(id)) {
        if (!props.has(id)) {
          const p = new Pix(16, 16);
          (PROP_DRAW as Record<string, ((p: Pix) => void) | undefined>)[id]?.(p);
          props.set(id, pixCanvas(p));
        }
        const img = props.get(id);
        if (img) ctx.drawImage(img, Math.round(x), Math.round(y));
      } else if ((TILE_IDS as readonly string[]).includes(id)) this.drawTile(ctx, id as TileId, Math.round(x), Math.round(y), t);
      else if ((SPRITE_IDS as readonly string[]).includes(id)) this.drawSprite(ctx, id as SpriteId, Math.round(x), Math.round(y), 'down', 0);
    },
    drawText(ctx, text, x, y, color = '#ffffff') {
      const atlas = font(color);
      if (!atlas) return;
      let cx = Math.round(x);
      const cy = Math.round(y);
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code >= 32 && code < 127 && code !== 32) ctx.drawImage(atlas, (code - 32) * GLYPH_ADV, 0, GLYPH_ADV, GLYPH_H, cx, cy, GLYPH_ADV, GLYPH_H);
        cx += GLYPH_ADV;
      }
    },
  };
}
