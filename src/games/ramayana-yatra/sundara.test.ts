/**
 * v0.5b WP-B: playing as Hanumān through the Sundara-kāṇḍa in Kathā (notes/v05b-plan.md §3, scenes 7–10; notes/v05b-b.md).
 *  - P4: Hanumān's sprite only in Kathā book 5 with katha.hanuman (set by the leap, unset by Sītā's farewell after the
 *    fire); a save made mid-book loads as Hanumān and respawn keeps it; the practice game never walks as him
 *  - every chapter-5 battle has lead: hanuman, and a Kathā fight puts Hanumān forward
 *  - scene 7: Surasā is a choice chain that can never be lost ("grow" makes her wait, "tiny" gets through, no battle)
 *  - scene 8: the guards' light (P3 avoid-triggers): being seen sends Hanumān back to the lane's mouth with no battle and
 *    no HP change; every lane entry has a route around the light; the patrols pass without a fight in Kathā; the
 *    practice game keeps its patrol fights and has no light at all
 *  - scene 9: in the Aśoka grove the student sings Rāma's story — three story recitations (P1), a miss carries on
 *  - scene 10: Laṅkā ablaze — four roofs in any order (the gate opens after the fourth), then Sītā is safe, then the leap
 *    home and ch5.complete; the practice Akṣa script still ends the book at once
 *  - bots: the Kathā pointer bot over 25 seeds is never seen; the Kathā story bot (70 % reciter) is never seen either
 * Every test starts from a book-5 save (bookFive), so it depends on book 5 alone.
 *  - art: the burning roof tile and the rider's pixel masks
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { type Level, createRng } from '@sdk';
import { loadContent } from './content';
import { type Action, type GameContent, type GameState, DELTA, HANUMAN_FLAG, burningBlocks, guideTarget, inSight, loadGame, mapById, newGame, newMember, npcsOn, playerSprite, reduce, roofBlock, roofFires, sightTiles, stepInJourney, toSave, triggerCovers, withUnlockedMoves } from './logic';
import { findPath, spot, talkSpots } from './logic-guide';
import { type AutoOptions, autoplay, doStep, partyHealth, patchUp, restAtShrine } from './logic-sim';
import { TILES } from './art-tiles';
import { Pix } from './art-core';
import { RIDER, riderPalette } from './view-screen';

const REAL = loadContent();
const ADV: Action = { type: 'advance' };

/**
 * A save at the start of book 5 (books 1–4 done: their walkthrough flags, verses heard and restored, the student and
 * Hanumān at level 24), so these tests depend on book 5 alone (other packages rework books 1–4 and 6 meanwhile).
 */
function bookFive(style: 'katha' | 'abhyasa', avatar: 'a' | 'b', seed = 7, level: Level = 3): GameState {
  const katha = style === 'katha';
  let st = newGame(seed, level, REAL, { name: 'Bot', avatar, ...(katha ? { style: 'katha' as const } : {}) });
  const flags: Record<string, true> = { ...st.save.flags };
  const k = REAL.walkthrough.findIndex((w) => w.chapter === 5);
  for (const w of REAL.walkthrough.slice(0, k)) if (stepInJourney(w, { style })) flags[w.expectFlag] = true;
  for (let c = 1; c <= 4; c++) flags[`ch${c}.complete`] = true;
  const shlokas: GameState['save']['shlokas'] = {};
  for (const sh of REAL.shlokas) {
    if (sh.kanda > 4) continue;
    shlokas[sh.id] = { heard: true, restored: true, best: 1 };
    flags[`heard.${sh.id}`] = true;
    flags[`restored.${sh.id}`] = true;
  }
  const party = ['player', 'hanuman'].map((id) => withUnlockedMoves(newMember(REAL.allies.find((a) => a.id === id)!, 24, REAL), { shlokas }, REAL));
  const ch = REAL.chapters.find((c) => c.kanda === 5)!;
  st = {
    ...st,
    mode: 'explore',
    script: null,
    pending: null,
    save: { ...st.save, flags, shlokas, party, chapter: 4, completedChapters: [1, 2, 3, 4], mapId: ch.startMap, x: ch.startX, y: ch.startY, respawn: { mapId: ch.startMap, x: ch.startX, y: ch.startY }, items: { phala: 9, madhu: 5, oshadhi: 3 }, niska: 500 },
  };
  return loadGame(toSave(st), seed, level, REAL)!;
}

/** The story bot through book 5 (doStep per walkthrough step of the journey; a failed step rests and retries). */
function playBook5(s0: GameState, content: GameContent, style: 'katha' | 'abhyasa', opts: AutoOptions = {}, onStep?: (flag: string, s: GameState) => void): GameState {
  let s = s0;
  for (const w of content.walkthrough.filter((x) => x.chapter === 5 && stepInJourney(x, { style }))) {
    for (let attempt = 0; attempt < 5 && !s.save.flags[w.expectFlag]; attempt++) {
      if (s.mode === 'explore') s = patchUp(s, content);
      if (partyHealth(s, content) < 0.5 || attempt > 0) s = restAtShrine(s, content, opts);
      s = doStep(s, content, w, opts);
    }
    assert.ok(s.save.flags[w.expectFlag], `${style}: book 5 step ${JSON.stringify(w.action)} on ${w.map} sets ${w.expectFlag}`);
    onStep?.(w.expectFlag, s);
  }
  return s;
}

/**
 * A player who only follows the map pointer through book 5 (logic-sim runGuide's way, from a book-5 save): walk the
 * shortest route to the target, act there (talk / step on / recite), let the story play; rest when the party is low.
 */
function guideBook5(s0: GameState, content: GameContent, opts: AutoOptions = {}): GameState {
  let s = autoplay(s0, content, opts);
  for (let n = 0; n < 400 && !s.save.flags['ch5.complete']; n++) {
    if (s.mode !== 'explore') {
      s = autoplay(s, content, opts);
      continue;
    }
    if (partyHealth(s, content) < 0.5) s = restAtShrine(s, content, opts);
    const g = guideTarget(s, content);
    assert.ok(g, `a pointer at ${s.save.mapId} (${s.save.x},${s.save.y})`);
    const map = s.save.mapId;
    const beside = new Set(Object.values(DELTA).map(([dx, dy]) => spot(g.x + dx, g.y + dy)));
    // an exit: walk beside it, then step through (a route through a warp lands on the other map)
    const spots = g.kind === 'npc' ? talkSpots(content, map, g.x, g.y) : g.kind === 'shrine' || g.kind === 'exit' ? beside : new Set([spot(g.x, g.y)]);
    if (!spots.has(spot(s.save.x, s.save.y))) {
      const path = findPath(s, content, (m, x, y) => m === map && spots.has(spot(x, y)));
      assert.ok(path, `a route to the pointer (${g.kind} ${g.x},${g.y}) on ${map}`);
      for (const dir of path) {
        const before = s;
        s = reduce(s, content, { type: 'step', dir });
        if (s.mode !== 'explore' || s.save.mapId !== map || (s.save.x === before.save.x && s.save.y === before.save.y)) break;
      }
      continue;
    }
    if (g.kind === 'exit') {
      s = autoplay(reduce(s, content, { type: 'step', dir: g.x > s.save.x ? 'right' : g.x < s.save.x ? 'left' : g.y > s.save.y ? 'down' : 'up' }), content, opts);
      continue;
    }
    if (g.kind === 'tile') {
      // standing on it without its event firing: step off and back on
      const off = (['up', 'down', 'left', 'right'] as const).find((d) => reduce(s, content, { type: 'step', dir: d }).save.x !== s.save.x || reduce(s, content, { type: 'step', dir: d }).save.y !== s.save.y);
      assert.ok(off);
      s = reduce(s, content, { type: 'step', dir: off });
      continue;
    }
    const dir = g.x > s.save.x ? 'right' : g.x < s.save.x ? 'left' : g.y > s.save.y ? 'down' : 'up';
    const opened = reduce(reduce(s, content, { type: 'face', dir }), content, { type: 'interact' });
    s = autoplay(opened, content, { ...opts, ...(g.recite ? { recite: g.recite } : {}) });
  }
  return s;
}

/** The state after each book-5 walkthrough step (by expectFlag), played by the story bot from bookFive (memoized). */
const runs = new Map<string, Map<string, GameState>>();
function after(style: 'katha' | 'abhyasa', flag: string, avatar: 'a' | 'b' = 'a'): GameState {
  const key = `${style}:${avatar}`;
  let m = runs.get(key);
  if (!m) {
    const got = new Map<string, GameState>();
    const s = bookFive(style, avatar);
    got.set('ch4.complete', s);
    playBook5(s, REAL, style, {}, (flag, t) => got.set(flag, t));
    runs.set(key, (m = got));
  }
  const s = m.get(flag);
  assert.ok(s, `${style}: no step expects ${flag}`);
  return s;
}

/** Explore at (x, y) on a map, nothing pending. */
function standAt(s: GameState, mapId: string, x: number, y: number, flags: Record<string, true> = {}): GameState {
  return { ...s, mode: 'explore', script: null, pending: null, battle: null, fx: [], save: { ...s.save, mapId, x, y, flags: { ...s.save.flags, ...flags } } };
}

/** Walk the shortest path to (x, y) on the player's map, stepping like a player (stops at the first event). */
function walk(s: GameState, x: number, y: number, content: GameContent = REAL): GameState {
  const map = s.save.mapId;
  const path = findPath(s, content, (m, tx, ty) => m === map && tx === x && ty === y);
  assert.ok(path, `a path to (${x},${y}) on ${map} from (${s.save.x},${s.save.y})`);
  let t = s;
  for (const dir of path) {
    t = reduce(t, content, { type: 'step', dir });
    if (t.mode !== 'explore') break;
  }
  return t;
}

/** Press ▶ through say / move / fade / wait pendings until a choice, a challenge, a battle or explore. */
function readOn(s: GameState): GameState {
  let t = s;
  for (let n = 0; n < 200 && t.mode === 'script' && t.pending && ['say', 'move', 'fade', 'wait', 'title', 'shloka', 'words'].includes(t.pending.kind); n++) t = reduce(t, REAL, ADV);
  return t;
}

const hp = (s: GameState): string => s.save.party.map((m) => `${m.id}:${m.hp}`).join(' ');

// ───────────────────────── P4: the sprite, the save ─────────────────────────

test('P4 on the real story: Hanumān from the leap until Sītā\'s farewell after the fire, in Kathā only; the avatar (a or b) everywhere else', () => {
  const ch5 = REAL.walkthrough.filter((w) => w.chapter === 5);
  for (const avatar of ['a', 'b'] as const) {
    const own = avatar === 'b' ? 'player_b' : 'player_a';
    assert.equal(playerSprite(after('katha', 'ch4.complete', avatar).save), own, 'book 4: the avatar');
    for (const w of ch5) {
      const s = after('katha', w.expectFlag, avatar);
      const want = w.expectFlag === 'ch5.complete' ? own : 'hanuman';
      assert.equal(playerSprite(s.save), want, `${avatar} after ${w.expectFlag} on ${s.save.mapId}`);
    }
    const done = after('katha', 'ch5.complete', avatar);
    assert.equal(done.save.flags[HANUMAN_FLAG], undefined, 'the farewell unsets katha.hanuman');
    assert.equal(done.save.mapId, 'setu_shore', 'home again, at the shore camp');
    for (const w of ch5.filter((x) => !x.style)) assert.equal(playerSprite(after('abhyasa', w.expectFlag, avatar).save), own, `practice ${w.expectFlag}`);
    assert.ok(!after('abhyasa', 'ch5.aksha_defeated', avatar).save.flags[HANUMAN_FLAG], 'the practice game never sets the flag');
  }
});

test('P4: a save made mid-book loads as Hanumān (lanka_city, lanka_ablaze), and a respawn keeps him', () => {
  for (const flag of ['ch5.city_entered', 'ch5.aksha_defeated']) {
    const s = after('katha', flag);
    const back = loadGame(JSON.parse(JSON.stringify(toSave(s))), 11, 3, REAL);
    assert.ok(back, flag);
    assert.equal(back.save.mapId, s.save.mapId);
    assert.deepEqual([back.save.x, back.save.y], [s.save.x, s.save.y]);
    assert.equal(playerSprite(back.save), 'hanuman', `${flag}: loads as Hanumān on ${back.save.mapId}`);
  }
  // the respawn point (a shrine of the book) keeps the flag: respawning changes the place, not who walks
  const s = after('katha', 'ch5.lanka_devi_yielded');
  const r = s.save.respawn;
  const re = loadGame({ ...toSave(s), mapId: r.mapId, x: r.x, y: r.y }, 11, 3, REAL)!;
  assert.equal(playerSprite(re.save), 'hanuman');
});

// ───────────────────────── battles: lead hanuman ─────────────────────────

test('every chapter-5 battle has lead: hanuman, and a Kathā fight (Siṃhikā) puts Hanumān forward', () => {
  const specs: string[] = [];
  const walkCmds = (cmds: unknown[] | undefined, at: string): void => {
    for (const c of (cmds ?? []) as Record<string, unknown>[]) {
      if (c['battle']) {
        const b = c['battle'] as { lead?: string; enemies: { id: string }[] };
        specs.push(`${at} ${b.enemies.map((e) => e.id).join('+')}:${b.lead}`);
        walkCmds(c['onWin'] as unknown[], at);
        walkCmds(c['onLose'] as unknown[], at);
      }
      for (const k of ['then', 'else', 'onCorrect', 'onWrong']) walkCmds(c[k] as unknown[] | undefined, at);
    }
  };
  const maps5 = new Set(REAL.maps.filter((m) => m.kanda === 5).map((m) => m.id));
  for (const e of REAL.events.filter((x) => x.id.startsWith('ch5.'))) walkCmds(e.cmds, e.id);
  assert.ok(specs.length >= 7, specs.join(' | '));
  assert.deepEqual(specs.filter((x) => !x.endsWith(':hanuman')), [], 'every battle leads with Hanumān');
  assert.ok(maps5.has('lanka_ablaze'));
  // Kathā: walk into Siṃhikā (27,11) after Surasā; Hanumān is the hero who steps forward
  const s = walk(standAt(after('katha', 'ch5.surasa_done'), 'ocean_leap', 24, 9), 27, 11);
  const b = readOn(s);
  assert.equal(b.mode, 'battle', 'Siṃhikā fights');
  assert.equal(b.save.party[b.battle!.active]!.id, 'hanuman', 'Hanumān leads');
});

// ───────────────────────── scene 7: Surasā ─────────────────────────

test('scene 7: Surasā is a choice chain that can never be lost — "grow" makes her wait, "become tiny" gets through, never a battle', () => {
  const start = after('katha', 'ch5.mainaka');
  let s = walk(standAt(start, 'ocean_leap', 21, 8), 24, 8);
  const hp0 = hp(s);
  let battles = 0;
  const seenChoices: string[] = [];
  const step = (t: GameState, a: Action): GameState => {
    const n = reduce(t, REAL, a);
    if (n.mode === 'battle') battles++;
    return n;
  };
  s = readOn(s);
  for (let k = 0; k < 6; k++) {
    assert.equal(s.pending?.kind, 'choice', `the choice comes back (${k})`);
    const opts = (s.pending as { options: string[] }).options;
    seenChoices.push(opts.join(' / '));
    const grow = opts.indexOf('Grow larger again!');
    assert.ok(grow >= 0, opts.join(' / '));
    s = step(s, { type: 'choose', index: grow });
    for (let n = 0; n < 20 && s.pending?.kind === 'say'; n++) s = step(s, ADV);
    assert.ok(!s.save.flags['ch5.surasa_done'], 'growing never passes her');
  }
  const tiny = (s.pending as { options: string[] }).options.indexOf('Become tiny!');
  s = step(s, { type: 'choose', index: tiny });
  for (let n = 0; n < 40 && s.mode === 'script'; n++) s = step(s, ADV);
  assert.equal(s.mode, 'explore');
  assert.equal(s.save.flags['ch5.surasa_done'], true, 'tiny gets through');
  assert.equal(battles, 0, 'never a battle');
  assert.equal(hp(s), hp0, 'no HP lost');
  // the practice game keeps its duel
  const p = readOn(walk(standAt(after('abhyasa', 'ch5.mainaka'), 'ocean_leap', 21, 8), 24, 8));
  assert.equal(p.mode, 'battle');
  assert.equal(p.battle?.spec.kind, 'duel');
});

// ───────────────────────── scene 8: Laṅkā by night ─────────────────────────

const SEEN = /^ch5\.seen_/;

test('scene 8: the guards\' light is Kathā only; findPath never crosses it, and every lane entry has a route around it to every goal of the city', () => {
  const k = after('katha', 'ch5.city_entered');
  const map = mapById(REAL, 'lanka_city')!;
  const lit = sightTiles(map, k.save.flags);
  assert.ok(lit.length >= 20, `${lit.length} lit tiles`);
  for (const t of lit) assert.ok(inSight(map, k.save.flags, t.x, t.y));
  assert.deepEqual(sightTiles(map, after('abhyasa', 'ch5.city_entered').save.flags), [], 'no light in the practice game');
  const avoid = map.triggers.filter((t) => t.avoid);
  assert.ok(avoid.length >= 4);
  for (const t of avoid) {
    assert.equal(t.once, false, 'a guard can turn again');
    assert.ok(map.triggers.indexOf(t) < map.triggers.findIndex((x) => !x.avoid), 'the light is checked before any patrol trigger');
  }
  // the lane mouths: every place being seen sends Hanumān back to
  const mouths = REAL.events.filter((e) => SEEN.test(e.id)).map((e) => {
    const w = JSON.stringify(e.cmds).match(/"warp":"lanka_city","x":(\d+),"y":(\d+)/);
    assert.ok(w, e.id);
    return { id: e.id, x: Number(w[1]), y: Number(w[2]) };
  });
  assert.equal(mouths.length, avoid.length);
  // the city's goals, with the flags at that point of the story
  const goals: [string, number, number, Record<string, true>][] = [
    ['patrol_a', 17, 9, {}],
    ['despair', 17, 6, { 'ch5.patrol_a': true }],
    ['patrol_c', 31, 17, { 'ch5.patrol_a': true, 'ch5.anirvedah': true }],
    ['grove gate', 35, 17, { 'ch5.patrol_a': true, 'ch5.anirvedah': true, 'ch5.patrol_c': true }],
  ];
  const from = [{ id: 'the city gate', x: 17, y: 24 }, ...mouths];
  const problems: string[] = [];
  for (const [g, gx, gy, fl] of goals) {
    for (const m of from) {
      const s = standAt(k, 'lanka_city', m.x, m.y, fl);
      if (inSight(map, s.save.flags, m.x, m.y)) {
        problems.push(`${m.id} (${m.x},${m.y}) is in the light`);
        continue;
      }
      const path = findPath(s, REAL, (mm, x, y) => mm === 'lanka_city' && x === gx && y === gy) ?? (gx === 35 ? findPath(s, REAL, (mm) => mm === 'ashoka_vatika') : null);
      if (!path) {
        problems.push(`${m.id} (${m.x},${m.y}) → ${g}: no route around the light`);
        continue;
      }
      let x = m.x;
      let y = m.y;
      for (const d of path) {
        x += DELTA[d][0];
        y += DELTA[d][1];
        if (inSight(map, s.save.flags, x, y)) problems.push(`${m.id} → ${g}: the route crosses the light at (${x},${y})`);
      }
    }
  }
  assert.deepEqual(problems, []);
  // the pointer, from the city gate, never stands in the light
  const g = guideTarget(standAt(k, 'lanka_city', 17, 24), REAL);
  assert.ok(g && !inSight(map, k.save.flags, g.x, g.y) && g.distance > 0, JSON.stringify(g));
});

test('scene 8: being seen sends Hanumān back to the lane\'s mouth — no battle, no HP change, no flag — from every lit zone', () => {
  const k = after('katha', 'ch5.city_entered');
  const map = mapById(REAL, 'lanka_city')!;
  const tried: string[] = [];
  for (const t of map.triggers.filter((x) => x.avoid)) {
    // a dark, walkable tile beside the zone, and the step into it
    let start: { x: number; y: number; dir: 'up' | 'down' | 'left' | 'right' } | null = null;
    for (let y = t.y; y < t.y + t.h && !start; y++)
      for (let x = t.x; x < t.x + t.w && !start; x++)
        for (const dir of ['up', 'down', 'left', 'right'] as const) {
          const sx = x - DELTA[dir][0];
          const sy = y - DELTA[dir][1];
          const s0 = standAt(k, 'lanka_city', sx, sy);
          if (triggerCovers(t, sx, sy) || inSight(map, s0.save.flags, sx, sy) || map.triggers.some((o) => o.once === false && triggerCovers(o, sx, sy))) continue;
          if (!findPath(standAt(k, 'lanka_city', 17, 24), REAL, (m, ax, ay) => m === 'lanka_city' && ax === sx && ay === sy)) continue;
          if (!npcsOn(s0, REAL, 'lanka_city').every((n) => n.x !== x || n.y !== y) || reduce(s0, REAL, { type: 'step', dir }) === s0) continue;
          start = { x: sx, y: sy, dir };
          break;
        }
    assert.ok(start, `a way into ${t.event}`);
    const s0 = standAt(k, 'lanka_city', start.x, start.y);
    let s = reduce(s0, REAL, { type: 'step', dir: start.dir });
    assert.equal(s.script?.eventId, t.event, `stepping into the light runs ${t.event}`);
    let battles = 0;
    s = autoplay(s, REAL, { onAction: (_b, _a, n) => void (n.mode === 'battle' && battles++) });
    const back = REAL.events.find((e) => e.id === t.event)!;
    const w = JSON.stringify(back.cmds).match(/"warp":"lanka_city","x":(\d+),"y":(\d+)/)!;
    assert.equal(s.mode, 'explore');
    assert.deepEqual([s.save.mapId, s.save.x, s.save.y], ['lanka_city', Number(w[1]), Number(w[2])], `${t.event}: back at the lane's mouth`);
    assert.equal(battles, 0, `${t.event}: no battle`);
    assert.equal(hp(s), hp(s0), `${t.event}: no HP lost`);
    assert.deepEqual(Object.keys(s.save.flags).sort(), Object.keys(s0.save.flags).sort(), `${t.event}: no flag changes`);
    assert.equal(s.save.niska, s0.save.niska);
    tried.push(t.event);
  }
  assert.ok(tried.length >= 4, tried.join(' '));
});

test('scene 8: in Kathā the patrols pass without a fight (their flags set, the guard gone, his light out); the practice game keeps its patrol fights', () => {
  const k = after('katha', 'ch5.city_entered');
  const map = mapById(REAL, 'lanka_city')!;
  let battles = 0;
  let s = walk(standAt(k, 'lanka_city', 17, 24), 17, 9);
  s = autoplay(s, REAL, { onAction: (_b, _a, n) => void (n.mode === 'battle' && battles++) });
  assert.equal(s.save.flags['ch5.patrol_a'], true);
  assert.equal(battles, 0, 'no fight');
  assert.ok(!npcsOn(s, REAL, 'lanka_city').some((n) => n.id === 'guard_a'), 'the patrol has moved on');
  assert.ok(!sightTiles(map, s.save.flags).some((t) => t.x === 19 && t.y === 10), 'his light is out');
  // talking to the west lane's guard: he sees nothing, no fight
  const asked = reduce(reduce(standAt(k, 'lanka_city', 9, 13), REAL, { type: 'face', dir: 'down' }), REAL, { type: 'interact' });
  assert.equal(asked.script?.eventId, 'ch5.patrol_b', 'talking to the west lane\'s guard');
  const talk = readOn(asked);
  assert.equal(talk.mode, 'explore', 'no fight');
  assert.ok(npcsOn(talk, REAL, 'lanka_city').some((n) => n.id === 'guard_b'), 'he stays at his post');
  // practice: the same tiles start the patrol fights
  const p = after('abhyasa', 'ch5.city_entered');
  assert.equal(readOn(walk(standAt(p, 'lanka_city', 17, 24), 17, 9)).mode, 'battle', 'practice: the avenue patrol fights');
  const pb = readOn(reduce(standAt(p, 'lanka_city', 10, 16), REAL, { type: 'step', dir: 'left' }));
  assert.equal(pb.mode, 'battle', 'practice: the west lane patrol fights');
});

// ───────────────────────── scene 9: the Aśoka grove ─────────────────────────

test('scene 9: Hanumān sings Rāma\'s story to Sītā — three story recitations in order, and a miss carries on', () => {
  const k = after('katha', 'ch5.vatika_entered');
  const asked: string[] = [];
  let misses = 0;
  const opts = {
    reciter: { accuracy: 0, rng: createRng(5) },
    onAction: (b: GameState, a: Action, n: GameState) => {
      const p = b.pending;
      if (p?.kind === 'challenge' && p.context === 'scene' && a.type === 'answer') {
        asked.push(`${p.challenge.smarana!.shlokaId}:${p.challenge.smarana!.pada}`);
        if (n.lastSmarana && !n.lastSmarana.correct) misses++;
      }
    },
  };
  const spots = talkSpots(REAL, 'ashoka_vatika', 12, 10);
  let s = standAt(k, 'ashoka_vatika', 1, 11);
  const path = findPath(s, REAL, (m, x, y) => m === 'ashoka_vatika' && spots.has(spot(x, y)))!;
  for (const d of path) s = reduce(s, REAL, { type: 'step', dir: d });
  const dir = s.save.x < 12 ? 'right' : s.save.x > 12 ? 'left' : s.save.y < 10 ? 'down' : 'up';
  s = reduce(reduce(s, REAL, { type: 'face', dir }), REAL, { type: 'interact' });
  s = autoplay(s, REAL, opts);
  assert.deepEqual(asked, ['s-ramam-dasharatham:0', 's-golden-deer:1', 's-aranya-3:3']);
  assert.ok(misses >= 1, 'the reciter missed, and the story went on');
  assert.equal(s.save.flags['ch5.met_sita'], true);
  // the practice game: no story recitation
  const p: string[] = [];
  let q = standAt(after('abhyasa', 'ch5.vatika_entered'), 'ashoka_vatika', s.save.x, s.save.y);
  q = reduce(reduce({ ...q, save: { ...q.save, facing: dir } }, REAL, { type: 'face', dir }), REAL, { type: 'interact' });
  autoplay(q, REAL, { onAction: (b) => void (b.pending?.kind === 'challenge' && b.pending.context === 'scene' && p.push('scene')) });
  assert.deepEqual(p, []);
});

// ───────────────────────── scene 10: Laṅkā ablaze ─────────────────────────

test('scene 10: after Akṣa, Laṅkā ablaze — four roofs in any order (the gate opens after the fourth), Sītā is safe, the leap home, ch5.complete', () => {
  const s0 = after('katha', 'ch5.aksha_defeated');
  assert.equal(s0.save.mapId, 'lanka_ablaze');
  assert.equal(s0.save.flags['ch5.ablaze'], true);
  assert.ok(!s0.save.flags['ch5.complete']);
  const map = mapById(REAL, 'lanka_ablaze')!;
  const fires = roofFires(map);
  assert.equal(fires.length, 4);
  assert.equal(burningBlocks(map, s0.save.flags).size, 0, 'nothing burns yet');
  // the gate to the grove is shut until every roof burns
  let s = walk(s0, 34, 17);
  s = autoplay(reduce(s, REAL, { type: 'step', dir: 'right' }), REAL);
  assert.equal(s.save.mapId, 'lanka_ablaze', 'the gate stays shut');
  // the roofs in reverse order
  let burning = 0;
  for (const f of [...fires].reverse()) {
    s = autoplay(walk(s, f.x, f.y), REAL);
    const now = burningBlocks(map, s.save.flags);
    assert.equal(now.size, ++burning, `roof (${f.x},${f.y}) burns`);
    assert.ok(now.has(roofBlock(map, f.x, f.y)));
    assert.equal(s.mode, 'explore');
  }
  assert.ok(!burningBlocks(map, s.save.flags).has(roofBlock(map, 7, 20)), "Vibhīṣaṇa's house is spared");
  // the pointer now leads to Sītā through the east gate
  const g = guideTarget(s, REAL);
  assert.ok(g && g.kind === 'exit' && g.to === 'ashoka_vatika', JSON.stringify(g));
  s = autoplay(walk(s, 34, 17), REAL);
  s = autoplay(reduce(s, REAL, { type: 'step', dir: 'right' }), REAL);
  assert.equal(s.save.mapId, 'ashoka_vatika');
  // the grove's west gate stays shut while Laṅkā burns
  const west = autoplay(reduce(standAt(s, 'ashoka_vatika', 1, 11), REAL, { type: 'step', dir: 'left' }), REAL);
  assert.equal(west.save.mapId, 'ashoka_vatika');
  // Sītā: the farewell, the leap home
  const spots = talkSpots(REAL, 'ashoka_vatika', 12, 10);
  const path = findPath(s, REAL, (m, x, y) => m === 'ashoka_vatika' && spots.has(spot(x, y)))!;
  for (const d of path) s = reduce(s, REAL, { type: 'step', dir: d });
  const dir = s.save.x < 12 ? 'right' : s.save.x > 12 ? 'left' : s.save.y < 10 ? 'down' : 'up';
  s = autoplay(reduce(reduce(s, REAL, { type: 'face', dir }), REAL, { type: 'interact' }), REAL);
  assert.equal(s.save.flags['ch5.complete'], true);
  assert.equal(s.save.mapId, 'setu_shore');
  assert.equal(s.save.flags[HANUMAN_FLAG], undefined);
  assert.equal(playerSprite(s.save), 'player_a');
  assert.ok(!s.save.items['chudamani'], 'the jewel is in Rāma\'s hands');
  // the practice game: Akṣa's script ends the book at once, Laṅkā ablaze never appears
  const p = after('abhyasa', 'ch5.aksha_defeated');
  assert.equal(p.save.flags['ch5.complete'], true);
  assert.ok(!p.save.flags['ch5.ablaze']);
  assert.equal(p.save.mapId, 'setu_shore');
});

test('scene 10: the roof steps and the Sītā step are Kathā only; the Akṣa step expects ch5.aksha_defeated in both journeys', () => {
  const W = REAL.walkthrough;
  const ak = W.findIndex((w) => 'talk' in w.action && w.action.talk === 'aksha');
  assert.equal(W[ak]!.expectFlag, 'ch5.aksha_defeated');
  assert.equal(W[ak]!.style, undefined);
  const k = W.slice(ak + 1, ak + 6);
  assert.deepEqual(k.map((w) => w.expectFlag), ['ch5.roof_1', 'ch5.roof_2', 'ch5.roof_3', 'ch5.roof_4', 'ch5.complete']);
  assert.ok(k.every((w) => w.style === 'katha'));
  const map = mapById(REAL, 'lanka_ablaze')!;
  for (const w of k.slice(0, 4)) {
    const r = (w.action as { reach: { x: number; y: number } }).reach;
    assert.equal(map.ground[r.y]![r.x], Object.keys(map.legend).find((c) => map.legend[c] === 'roof_fire'), 'a roof_fire tile');
  }
});

// ───────────────────────── bots ─────────────────────────

/** REAL, with every "seen" event also setting test.seen. */
const WATCHED: GameContent = { ...REAL, events: REAL.events.map((e) => (SEEN.test(e.id) ? { ...e, cmds: [{ set: 'test.seen' }, ...e.cmds] } : e)) };

test('bots (self-test): in the watched content, being seen sets test.seen', () => {
  const k = after('katha', 'ch5.city_entered');
  const s = autoplay(reduce(standAt(k, 'lanka_city', 17, 20), WATCHED, { type: 'step', dir: 'up' }), WATCHED);
  assert.equal(s.save.flags['test.seen'], true);
  assert.deepEqual([s.save.x, s.save.y], [17, 22], 'back at the lane mouth below the lamps');
});

test('bots: the Kathā pointer bot (25 seeds × levels 2–4) and the Kathā story bot (70 % reciter) cross Laṅkā unseen and finish book 5', () => {
  const failures: string[] = [];
  for (let seed = 1; seed <= 25; seed++) {
    const level = (2 + (seed % 3)) as Level;
    try {
      const s = guideBook5(bookFive('katha', seed % 2 ? 'a' : 'b', seed, level), WATCHED);
      if (!s.save.flags['ch5.complete']) failures.push(`guide seed ${seed} L${level}: book 5 not finished (${s.save.mapId} ${s.save.x},${s.save.y})`);
      if (s.save.flags['test.seen']) failures.push(`guide seed ${seed} L${level}: seen by a guard`);
    } catch (e) {
      failures.push(`guide seed ${seed} L${level}: ${(e as Error).message}`);
    }
  }
  for (const level of [2, 3, 4] as Level[]) {
    let losses = 0;
    const s = playBook5(bookFive('katha', 'a', 3, level), WATCHED, 'katha', { reciter: { accuracy: 0.7, rng: createRng(level) }, onAction: (b, _a, n) => void (b.mode === 'battle' && n.mode !== 'battle' && b.battle?.phase === 'lost' && losses++) });
    if (s.save.flags['test.seen']) failures.push(`walk L${level}: seen by a guard`);
    if (losses > 0) failures.push(`walk L${level}: ${losses} lost fight(s)`);
  }
  assert.deepEqual(failures, []);
});

// ───────────────────────── art ─────────────────────────

test('art: the burning roof is an animated tile of its own; the rider\'s masks are well formed for both avatars and four facings', () => {
  const draw = (id: 'roof_fire' | 'lanka_roof', f: number): Uint32Array => {
    const p = new Pix(16, 16);
    TILES[id].draw(p, f);
    return p.d;
  };
  assert.equal(TILES.roof_fire.frames, 4);
  const frames = [0, 1, 2, 3].map((f) => draw('roof_fire', f).join(','));
  assert.equal(new Set(frames).size, 4, 'four distinct frames');
  assert.notEqual(frames[0], draw('lanka_roof', 0).join(','), 'not the plain roof');
  assert.ok(draw('roof_fire', 0).every((c) => c >>> 24 === 255), 'opaque');
  for (const [dir, m] of Object.entries(RIDER)) {
    for (const av of ['a', 'b'] as const) {
      const pal = riderPalette(av);
      const rows = m.rows[av];
      assert.equal(rows.length, m.rows.a.length, `${dir}: both avatars as tall`);
      for (const r of rows) {
        assert.equal(r.length, 5, `${dir} ${av}: 5 wide`);
        for (const ch of r) assert.ok(ch === '.' || pal[ch], `${dir} ${av}: "${ch}" has a colour`);
      }
    }
  }
});
