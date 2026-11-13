import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BATTLE_BG_IDS, BATTLER_IDS, SPRITE_IDS, TILE_IDS, TRACK_IDS } from './catalog';
import { createArt } from './art';
import { createAudio, parseLine, SCALES, TRACKS } from './audio';
import { Pix } from './art-core';
import { TILES } from './art-tiles';
import { BODY_KEYS, CHARS, SPRITE_H, SPRITE_W, bodyGrid, buildSprite, paletteFor } from './art-sprites';
import { BATTLERS, BATTLER_FRAMES, buildBattler, spritePortraitCrop } from './art-battlers';
import { BGS } from './art-bg';
import { GLYPHS } from './art-font';

const sameSet = (a: readonly string[], b: readonly string[], what: string): void => {
  const A = new Set(a);
  const B = new Set(b);
  for (const x of A) assert.ok(B.has(x), `${what}: "${x}" has a drawing but is not in the catalog`);
  for (const x of B) assert.ok(A.has(x), `${what}: catalog id "${x}" has no drawing`);
};

test('every catalog id has exactly one definition (and no unknown extras)', () => {
  sameSet(Object.keys(TILES), TILE_IDS, 'tiles');
  sameSet(Object.keys(CHARS), SPRITE_IDS, 'sprites');
  sameSet(Object.keys(BATTLERS), BATTLER_IDS, 'battlers');
  sameSet(Object.keys(BGS), BATTLE_BG_IDS, 'battle backgrounds');
  sameSet(Object.keys(TRACKS), TRACK_IDS, 'music tracks');
});

test('body grids are 16x24 and use only known palette keys', () => {
  const keys = new Set<string>(BODY_KEYS);
  for (const dir of ['down', 'up', 'right'] as const)
    for (const long of [false, true])
      for (const frame of [0, 1, 2] as const) {
        const g = bodyGrid(dir, long, frame);
        assert.equal(g.length, SPRITE_H, `${dir}/${long}/${frame} rows`);
        g.forEach((row, i) => {
          assert.equal(row.length, SPRITE_W, `${dir}/${long}/${frame} row ${i} width`);
          for (const ch of row) assert.ok(keys.has(ch), `unknown key "${ch}" in ${dir}/${long}/${frame} row ${i}`);
        });
      }
  for (const id of SPRITE_IDS) {
    const pal = paletteFor(CHARS[id]);
    for (const k of BODY_KEYS) if (k !== '.') assert.ok(pal[k] !== undefined, `${id} palette lacks "${k}"`);
  }
});

test('every tile frame is a fully opaque 16x16 image', () => {
  for (const id of TILE_IDS) {
    const def = TILES[id];
    assert.ok(def.frames >= 1 && def.frames <= 4, `${id} frames`);
    if (def.frames > 1) assert.ok(def.fps > 0, `${id} animated tiles need fps`);
    for (let f = 0; f < def.frames; f++) {
      const p = new Pix(16, 16);
      def.draw(p, f);
      let holes = 0;
      for (let i = 0; i < p.d.length; i++) if (((p.d[i] as number) >>> 24) !== 255) holes++;
      assert.equal(holes, 0, `${id} frame ${f} has ${holes} non-opaque pixels`);
    }
  }
});

test('animated tiles actually change between frames', () => {
  for (const id of ['water', 'ocean', 'lotus', 'torch', 'banner', 'shore_n', 'shrine'] as const) {
    const a = new Pix(16, 16);
    const b = new Pix(16, 16);
    TILES[id].draw(a, 0);
    TILES[id].draw(b, 1);
    assert.notDeepEqual(Array.from(a.d), Array.from(b.d), `${id} does not animate`);
  }
});

test('every character builds 4 dirs x 3 frames of 16x24 with feet on the tile', () => {
  for (const id of SPRITE_IDS)
    for (const d of ['down', 'up', 'left', 'right'] as const)
      for (const f of [0, 1, 2] as const) {
        const p = buildSprite(id, d, f);
        assert.equal(p.w, 16);
        assert.equal(p.h, 24);
        let n = 0;
        let lowest = -1;
        for (let y = 0; y < 24; y++) for (let x = 0; x < 16; x++) if (p.get(x, y)) {
          n++;
          lowest = y;
        }
        assert.ok(n > 40, `${id} ${d}/${f} is nearly empty`);
        assert.ok(lowest >= 21, `${id} ${d}/${f} floats (lowest row ${lowest})`);
      }
});

test('left is the mirror of right; walk frames differ from standing', () => {
  for (const id of SPRITE_IDS) {
    const r = buildSprite(id, 'right', 0);
    const l = buildSprite(id, 'left', 0);
    assert.deepEqual(Array.from(l.d), Array.from(r.flipped().d), `${id} left != mirrored right`);
    const s = buildSprite(id, 'down', 0);
    const w = buildSprite(id, 'down', 1);
    assert.notDeepEqual(Array.from(s.d), Array.from(w.d), `${id} walk frame equals stand frame`);
  }
});

test('every battler builds 64x64 frames that are non-empty and breathe', () => {
  for (const id of BATTLER_IDS) {
    const frames = Array.from({ length: BATTLER_FRAMES }, (_, f) => buildBattler(id, f));
    for (const p of frames) {
      assert.equal(p.w, 64);
      assert.equal(p.h, 64);
      let n = 0;
      for (let i = 0; i < p.d.length; i++) if (p.d[i]) n++;
      assert.ok(n > 600, `${id} is too sparse (${n} px)`);
    }
    assert.notDeepEqual(Array.from(frames[0]!.d), Array.from(frames[1]!.d), `${id} has no idle animation`);
  }
});

test('portrait busts exist for every humanoid character', () => {
  for (const id of SPRITE_IDS) {
    if (CHARS[id].kind && CHARS[id].kind !== 'human') continue;
    const p = spritePortraitCrop(id);
    let n = 0;
    for (let i = 0; i < p.d.length; i++) if (p.d[i]) n++;
    assert.ok(n > 120, `${id} portrait is nearly empty`);
  }
});

test('the HUD font covers printable ASCII', () => {
  for (let c = 32; c < 127; c++) assert.ok(GLYPHS.has(c), `glyph ${c} (${String.fromCharCode(c)}) missing`);
  for (const ch of '0123456789/ABCDEFGHIJKLMNOPQRSTUVWXYZ') assert.ok(GLYPHS.get(ch.charCodeAt(0))!.some((r) => r !== 0), `${ch} is blank`);
});

test('every music track parses into whole 8-step bars with valid tokens', () => {
  const tok = /^(\d+[',]*|\.|-)$/;
  for (const id of TRACK_IDS) {
    const t = TRACKS[id];
    const scale = SCALES[t.scale];
    assert.ok(t.bpm >= 50 && t.bpm <= 200, `${id} bpm`);
    let bars = -1;
    for (const line of [t.lead, t.counter, t.bass]) {
      if (!line) continue;
      const bs = line.split('|').map((b) => b.trim().split(/\s+/));
      for (const [i, b] of bs.entries()) {
        assert.equal(b.length, 8, `${id} bar ${i} has ${b.length} tokens: ${b.join(' ')}`);
        for (const k of b) assert.ok(tok.test(k), `${id}: bad token "${k}"`);
      }
      if (bars < 0) bars = bs.length;
      assert.equal(bs.length, bars, `${id}: voices disagree on bar count`);
      const p = parseLine(line, scale, t.root);
      assert.ok(p.events.length > 0);
      for (const e of p.events) assert.ok(e.midi >= 24 && e.midi <= 100, `${id}: midi ${e.midi} out of range`);
    }
    assert.ok(bars >= 8 && bars <= 16, `${id}: ${bars} bars`);
    if (t.drums) for (const b of t.drums.split('|')) for (const k of b.trim().split(/\s+/)) assert.ok(/^[kshot.]$/.test(k), `${id}: drum "${k}"`);
    if (t.loopFrom !== undefined) assert.ok(t.loopFrom >= 0 && t.loopFrom < bars);
  }
});

test('createArt and createAudio work without a DOM (no throw, no-ops)', () => {
  const art = createArt();
  const fake = {} as CanvasRenderingContext2D;
  art.drawTile(fake, 'water', 0, 0, 1.5);
  art.drawSprite(fake, 'rama', 0, 0, 'down', 1);
  art.drawBattler(fake, 'b_ravana', 0, 0, { flip: true, flash: true, alpha: 0.5, t: 2 });
  art.drawBattleBg(fake, 'lanka', 1);
  art.drawLight(fake, 'night', 1);
  art.drawText(fake, 'HP 10/20', 0, 0);
  assert.equal(typeof art.portraitUrl('valmiki'), 'string');
  assert.equal(typeof art.battlerUrl('b_rama'), 'string');

  const audio = createAudio();
  audio.unlock();
  audio.play('title');
  audio.setEnabled(false);
  audio.play('battle');
  audio.setEnabled(true);
  audio.play(null);
  audio.dispose();
  audio.dispose(); // idempotent
  audio.play('ending'); // after dispose: harmless
  audio.unlock();
  audio.setEnabled(true);
});

test('object tiles adopt the ground drawn beside them; others are untouched', async () => {
  const { createGroundResolver, drawObjectLayer, OBJECT_TILES } = await import('./art-tiles');
  const g = createGroundResolver();
  // a row: sand, palm (object) → the palm stands on sand
  g.note(0, 0, 'sand');
  assert.equal(g.resolve(16, 0, 'tree_palm'), 'sand');
  // kusha / flowers normalise to grass under trees
  g.note(0, 16, 'kusha');
  assert.equal(g.resolve(16, 16, 'tree'), 'grass');
  // a torch next to a Lanka wall hangs on the wall; a rock never sits on a wall
  g.note(0, 32, 'lanka_wall');
  assert.equal(g.resolve(16, 32, 'torch'), 'lanka_wall');
  assert.notEqual(g.resolve(16, 32, 'rock'), 'lanka_wall');
  // non-object tiles are never re-grounded
  assert.equal(g.resolve(16, 0, 'water'), null);
  // object layers have transparent backgrounds but real content
  for (const id of Object.keys(OBJECT_TILES) as (keyof typeof OBJECT_TILES)[]) {
    const p = new Pix(16, 16);
    drawObjectLayer(id, p, 0);
    let clear = 0;
    let solid = 0;
    for (let i = 0; i < p.d.length; i++) (p.d[i] ? solid++ : clear++);
    assert.ok(clear > 10 && solid > 20, `${id} object layer: ${solid} solid / ${clear} clear`);
    assert.ok(OBJECT_TILES[id]!.base in TILES, `${id} base ground`);
  }
});

test('an object drawn as an overlay sits on the ground drawn just beneath it', async () => {
  const { createGroundResolver } = await import('./art-tiles');
  const g = createGroundResolver();
  g.note(0, 0, 'grass');
  g.note(16, 0, 'path'); // ground layer of the next cell
  assert.equal(g.resolve(16, 0, 'rock'), 'path'); // overlay at the same position
});

test('soft grass fringes join grass and path/sand only', async () => {
  const { fringeBetween, buildFringe } = await import('./art-tiles');
  assert.equal(fringeBetween('grass', 'path', true), 'gl');
  assert.equal(fringeBetween('path', 'kusha', true), 'gr');
  assert.equal(fringeBetween('grass', 'sand', false), 'gt');
  assert.equal(fringeBetween('sand', 'grass', false), 'gb');
  assert.equal(fringeBetween('grass', 'water', true), null);
  assert.equal(fringeBetween('stone_road', 'grass', true), null);
  for (const side of ['gl', 'gr', 'gt', 'gb'] as const) {
    const p = buildFringe(side);
    assert.equal(p.w * p.h, 64);
    assert.ok(p.d.some((v) => v !== 0));
  }
});
