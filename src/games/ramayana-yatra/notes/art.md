# art notes (owner: art agent)

Files: `art.ts` (the binding `Art` API + atlases), `art-core.ts` (Pix pixel buffer + helpers),
`art-palette.ts`, `art-tiles.ts`, `art-sprites.ts`, `art-battlers.ts`, `art-bg.ts`, `art-font.ts`,
`audio.ts`, `art.test.ts`. All drawing is generated in code. There are no image files and no global RNG (only seeded hashes).

## How to use (for the view agent)
- `const art = createArt()` once (e.g. `useMemo`). Everything is built lazily on first draw and cached.
  Importing or calling it in Node is safe; every draw is a no-op without `document`.
- `drawTile(ctx, id, x, y, t)`: 16x16 tiles, all fully opaque. **Object tiles are context-aware:**
  tree*, bush, rock, boulder, stump, log, fence, well, sign, chest, shrine, fire_altar, pillar, lamp,
  banner and torch are drawn over the ground drawn just before them, to their left or above (grass/kusha →
  grass, sand, path, battle_ground, stone_road, palace/lanka/cave/mat/wood floor, carpet). Lamps, torches and
  banners may also hang on walls. If there is no usable neighbour, the tile falls back to a baked default ground.
  This works best when the map is drawn row-major, left to right and top to bottom, as view-screen does now.
  Overlays are not needed. If you do use them, they still draw opaque.
  The same pass also draws soft grass-blade fringes where grass or kusha meets path or sand. Each fringe is
  drawn by the later tile of the pair, 2px over the shared edge.
- `shore_n/s/e/w` = **the side the land is on**. `shore_n` has sand along the north edge and water
  below, so put it on the top row of a lake. Likewise `shore_s` goes on the bottom row, `shore_w` on the
  left column and `shore_e` on the right column.
- Huts: `[hut_roof_l][hut_roof_m…][hut_roof_r]` over `[hut_wall|hut_window][hut_door][hut_wall…]`.
- `drawSprite(ctx, id, x, y, dir, frame)`: (x, y) = top-left of the tile the character stands on.
  It draws a soft drop shadow, then the 16x24 sprite at y-8. Frames: 0 stand, 1 step-left, 2 step-right
  (cycle 1,0,2,0 while walking). The golden deer, krauñca and Jaṭāyu have their own walk cycles.
- `drawBattler(ctx, id, x, y, {flip, alpha, flash, t})`: 64x64, faces LEFT. `flip` for allies.
  `t` drives a 2-frame breathing idle (~2.2 fps). Floating foes (Indrajit on his cloud, Siṃhikā,
  Surasā) also bob ±2px. `flash` draws a white silhouette, and `alpha` multiplies the current alpha.
  Feet sit at about y+62. The platforms are centred under the view's FOE_X/Y = (222, 16) and ALLY_X/Y = (34, 90).
- `drawBattleBg(ctx, id, t)`: full 320x180 at the current transform. Platforms: ally ellipse centre
  (66,153) rx 50, foe centre (254,80) rx 44 (matching view-screen's battler positions). Clouds/mist drift, and there are water glints, flames, embers,
  light shafts, stars and a waving banner.
- `drawLight(ctx, light, t)`: call it **after** drawing the map and sprites. It covers the whole canvas
  (it resets the transform and draws at `ctx.canvas` size) using a `multiply` colour grade plus a soft
  vignette. `day`/undefined = no-op. `interior` flickers gently, like lamplight.
- `portraitUrl(spriteId)`: a 48x48 PNG data URL (bust facing right, transparent background). Every
  humanoid uses the same bust style. Krauñca and Jaṭāyu are cropped from the sprite, and the golden
  deer from its battler. Use `image-rendering: pixelated`. The URL is cached.
- `battlerUrl(id)`: a 128x128 PNG data URL (the 64x64 battler at x2, facing left).
- `drawText(ctx, text, x, y, color?)`: 5x7 ASCII font, 6px advance, top-left anchored. ASCII only.

## Audio (`createAudio()`)
- The AudioContext is created on the first `unlock()` (call it from a pointer/key handler). `play(id)` before
  `unlock` is remembered and starts on unlock. `play` while disabled is remembered and starts when
  `setEnabled(true)` is called. `setEnabled(false)` silences at once and stops the scheduler.
  `dispose()` is idempotent: it stops every node, clears the only interval and closes the context.
- There is a light feedback-echo send for space. Its return also goes through the muted output, so disabling is truly silent.
- One 25 ms interval with 150 ms look-ahead scheduling. Steps are eighth notes. There are 14 original
  loops (8 bars each, written in scale degrees): Bhūpālī (title, ashrama, victory, shloka with a
  tanpura-style Pa–Sa drone), Yaman (ayodhya, ocean, duel, ending), Kāfī (forest, battle), Durgā (kishkindha),
  Bhairav (lanka, boss) and Bhairavī (sorrow). `victory` plays a 2-bar fanfare once, then loops.

## Notes / requests to other agents
- view: please call `art.drawLight` last in the overworld pass and `audio.unlock()` on the first input (both already done).
- view: on the title screen the 'river' background puts Vālmīki and the player in the water. Either stand them on
  the sandbanks (ally bank centre (66,153), far bank (254,80), shore strip at y≈74–80) or use the 'ashrama' background.
- world/story: `kusha` is the encounter grass and is drawn as tall golden-green tufts. `shrine` is a red
  tulasī-style planter with a lamp in its niche. `setu` shows stones with ocean between them (walkable).
