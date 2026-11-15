/**
 * v0.6 WP-D: the mountain of herbs (Yuddha 6.74; notes/v06-d.md, plan row D). OWNER: v0.6 WP-D.
 *  - content/cutscene-herbs.json is well formed (checkTold), Kathā book 6, painter "d" and 3D scene "herbs" registered,
 *    its shots in story order; exactly one question, whose one choice is "Take the whole mountain!"; it carries no verse
 *    (package C plays 6.74.33, s-mrtasanjivani, right before it in the same Kathā block)
 *  - every answer path lifts the mountain and ends with the army rising; a skip (no answer) and `advance` end it too:
 *    seen.herbs is set and the story goes on; nothing in it can fail, gate or ask for a recitation
 *  - reachable: package C's placement (story-ch6, ch6.kumbhakarna onWin, inside a Kathā block); the Kathā story bots meet
 *    it and finish with seen.herbs; the practice journey never meets it (the command is skipped; its names are Kathā-only)
 *  - pacing: ≤ 45 s at normal speed with the 3D camera moves (the question waits for one tap)
 *  - Sanskrit of file 13: every line has its Sanskrit, ≤ 10 words a sentence, Level 1–3 by the oracle
 *  - the 3D choreography (pure helpers of cutscene3d-herbs.ts): herbs shown / hiding, the peak torn off and carried, the
 *    army lying until 'revive', the camera from the battle frame to the first shot and back, the mountain meshes
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from './content';
import { type EventCmd, type GameContent, type GameState, type ToldStep, checkTold, newGame, practiceContent, reduce, toldAsks, toldOf, toldPath, toldTimeline, toldVerses } from './logic';
import { startScript } from './logic-events';
import { runWalkthrough } from './logic-sim';
import { PAINTERS } from './cutscene-paint';
import { SCENES_3D } from './cutscene3d-scenes';
import { FRAME_POSE } from './cutscene3d';
import {
  HERB_MOUNTAIN,
  HERB_SHOTS,
  NORTH_START,
  PEAK_CAP,
  REVIVE_END,
  armyLayout,
  heroAt,
  herbSet,
  herbShot,
  herbSpots,
  herbsPath,
  herbsShown,
  mountainMesh,
  peakAt,
  rangeMesh,
  riseK,
  shotPose,
} from './cutscene3d-herbs';
import { easiest, getOracle, isKathaCond } from './sa-verify';
import sa13 from './content/sa-dialogue-13.json';
import names6 from './content/names-6.json';
import ch6 from './content/story-ch6.json';

const REAL = loadContent();
const HERBS = toldOf(REAL, 'herbs');
const ID = 'herbs';
const CHOICE = 'Take the whole mountain!';
/** The 3D phases of view-told.tsx (PHASE_MS['3d']): flat, rotate-out, rotate-in (ms). */
const PHASES_3D_MS = 700 + 3600 + 3000;
const PHASES_2D_MS = 350 + 500 + 500;

function calm(style: 'katha' | 'abhyasa', content: GameContent = REAL): GameState {
  const s = newGame(1, 3, content, { name: 'Herbs', avatar: 'a', style });
  return { ...s, mode: 'explore', script: null, pending: null, fx: [] };
}
const play = (s: GameState, cmds: unknown[]): GameState => startScript(s, REAL, 'test.v06d', cmds as EventCmd[]);
const shotsOf = (steps: readonly ToldStep[]): string[] => steps.flatMap((s) => ('scene' in s ? [s.scene] : []));
const saysOf = (steps: readonly ToldStep[]): string[] => steps.flatMap((s) => ('say' in s ? [s.say] : []));

test('v0.6 D: cutscene-herbs.json is well formed — Kathā book 6, painter "d" and 3D scene "herbs" registered, its shots in story order, one question whose one choice is “Take the whole mountain!”', () => {
  assert.ok(HERBS, 'the herbs cutscene is playable (not a stub)');
  const known = { shlokas: new Set(REAL.shlokas.map((s) => s.id)), painters: new Set(Object.keys(PAINTERS)), scenes3d: new Set(Object.keys(SCENES_3D)) };
  assert.deepEqual(checkTold(HERBS, known), []);
  assert.equal(HERBS.chapter, 6);
  assert.equal(HERBS.painter, 'd');
  assert.equal(HERBS.scene3d, 'herbs');
  assert.ok(/6\.74/.test(HERBS.source), 'cites Yuddha 6.74');
  assert.deepEqual(shotsOf(HERBS.steps), [...HERB_SHOTS], 'every shot once, in story order');
  const asks = toldAsks(HERBS);
  assert.equal(asks.length, 1, 'exactly one question');
  assert.deepEqual(asks[0]!.options.map((o) => o.label), [CHOICE], 'its one choice');
  // nothing else interactive: no hotspot, no cast to lose, no kit effect but the flash and the shake of the tearing peak
  const kinds = new Set(HERBS.steps.map((s) => Object.keys(s).find((k) => k !== 'ms' && k !== 'who')));
  assert.deepEqual([...kinds].sort(), ['ask', 'fx', 'say', 'scene']);
  assert.deepEqual(HERBS.steps.filter((s) => 'fx' in s).map((s) => (s as { fx: string }).fx), ['flash', 'shake']);
  const lift = HERBS.steps.findIndex((s) => 'scene' in s && s.scene === 'lift');
  assert.ok(HERBS.steps.slice(lift - 2, lift).every((s) => 'fx' in s), 'the flash and the shake come as the peak tears (the lift shot)');
  // the shots the painter and the 3D scene know
  for (const k of shotsOf(HERBS.steps)) assert.equal(herbShot(k), k);
});

test('v0.6 D: every answer path tears off the mountain, carries it back and ends with the army rising; the scene carries no verse (C plays 6.74.33 before it)', () => {
  const ask = toldAsks(HERBS!)[0]!;
  for (let i = 0; i < ask.options.length; i++) {
    const path = toldPath(HERBS!, [i]);
    const at = path.findIndex((s) => 'ask' in s);
    const after = shotsOf(path.slice(at));
    assert.deepEqual(after, ['roar', 'lift', 'sea', 'revive'], `option ${i}: the mountain is lifted and carried back`);
    assert.match(saysOf(path).at(-1) ?? '', /rise, as if from sleep/, 'the last line: the army rises (6.74.74)');
    assert.deepEqual(toldVerses(path), [], 'no verse step: s-mrtasanjivani is heard once, in C’s block');
  }
  // a skip or the bot's default (no answer) plays the same path
  assert.deepEqual(toldPath(HERBS!, []), toldPath(HERBS!, [0]));
});

test('v0.6 D: reachable through package C’s placement — { cutscene: herbs } sits in a Kathā block of ch6.kumbhakarna, right after s-mrtasanjivani', () => {
  type Cmd = Record<string, unknown>;
  type Found = { katha: boolean; prev: Cmd | undefined; event: string };
  const all: Found[] = [];
  let event = '';
  const walk = (cmds: unknown, katha: boolean): void => {
    if (!Array.isArray(cmds)) return;
    (cmds as Cmd[]).forEach((c, i) => {
      if (!c || typeof c !== 'object') return;
      if (c['cutscene'] === ID) all.push({ katha, prev: (cmds as Cmd[])[i - 1], event });
      for (const k of ['then', 'else', 'onWin', 'onLose', 'onCorrect', 'onWrong']) if (k in c) walk(c[k], katha || (k === 'then' && isKathaCond(c['if'])));
      if (Array.isArray(c['options'])) for (const o of c['options'] as Cmd[]) walk(o['then'], katha);
    });
  };
  for (const e of (ch6 as unknown as { events: { id: string; cmds: unknown }[] }).events) {
    event = e.id;
    walk(e.cmds, false);
  }
  assert.equal(all.length, 1, 'story-ch6 starts the herbs cutscene once');
  const f = all[0] as Found;
  assert.equal(f.event, 'ch6.kumbhakarna', 'the event');
  assert.ok(f.katha, 'inside a Kathā block');
  assert.equal(f.prev?.['shloka'], 's-mrtasanjivani', 'right after Jāmbavān’s verse (6.74.33)');
});

test('v0.6 D: the Kathā story bots meet the scene after Kumbhakarṇa and finish with seen.herbs; the practice journey never meets it', () => {
  for (const [seed, level] of [[11, 3], [29, 1], [4041, 5]] as const) {
    let met = 0;
    const k = runWalkthrough(REAL, seed, level, { style: 'katha', onAction: (b) => void (b.pending?.kind === 'cutscene' && b.pending.id === ID && met++) });
    assert.equal(k.failedAt, -1, `Kathā seed ${seed} L${level}: ${k.error}`);
    assert.ok(met > 0, 'the bot met the herbs cutscene');
    assert.ok(k.state.save.flags['seen.herbs'], 'seen.herbs');
    assert.ok(k.state.save.flags['ch6.kumbhakarna_defeated'], 'and the story went on after it');
    const p = runWalkthrough(REAL, seed, level, { onAction: (b) => assert.notEqual(b.pending?.kind === 'cutscene' && b.pending.id, ID, 'practice never meets it') });
    assert.equal(p.failedAt, -1, `practice seed ${seed}: ${p.error}`);
    assert.ok(!p.state.save.flags['seen.herbs']);
  }
});

test('v0.6 D: it completes on every path — the one tap, a skip (no answer), `advance`; seen.herbs set, no verse heard by it, the script goes on; the practice journey skips the command', () => {
  const s0 = play(calm('katha'), [{ if: 'style.katha', then: [{ cutscene: ID }, { say: 'after' }] }]);
  assert.deepEqual(s0.pending, { kind: 'cutscene', id: ID });
  const heard = (s: GameState): string[] => Object.keys(s.save.flags).filter((f) => f.startsWith('heard.')).sort();
  for (const action of [{ type: 'cutscene-done', id: ID, found: [], answers: [0] }, { type: 'cutscene-done', id: ID, found: [], answers: [] }, { type: 'advance' }] as const) {
    const s = reduce(s0, REAL, action as never);
    assert.equal(s.pending?.kind, 'say', JSON.stringify(action));
    assert.ok(s.save.flags['seen.herbs'], 'seen.herbs');
    assert.deepEqual(heard(s), heard(s0), 'it hears no verse of its own');
  }
  // a wrong answer index is refused (the view only offers the one option)
  assert.equal(reduce(s0, REAL, { type: 'cutscene-done', id: ID, found: [], answers: [1] } as never), s0);
  // practice: the command is skipped, the script goes on
  const p = play(calm('abhyasa'), [{ cutscene: ID }, { say: 'next' }]);
  assert.equal(p.pending?.kind, 'say');
  assert.ok(!p.save.flags['seen.herbs']);
  // the place names are Kathā-only content
  const pr = practiceContent(REAL);
  for (const n of (names6 as { names: { id: string }[] }).names) {
    assert.ok(REAL.names.find((x) => x.id === n.id)?.kathaOnly, `${n.id} is Kathā-only`);
    assert.ok(!pr.names.some((x) => x.id === n.id), `${n.id} is not in the practice content`);
  }
});

test('v0.6 D: pacing — ≤ 45 s at normal speed with the 3D camera moves (≤ 40 s in 2D); every line is on screen ≥ 4 s; the question waits for one tap', () => {
  for (const answers of [[0], []]) {
    const beats = toldTimeline(REAL, toldPath(HERBS!, answers));
    const ms = beats.reduce((a, b) => a + b.ms, 0);
    assert.ok(ms + PHASES_3D_MS <= 45_000, `3D: ${ms + PHASES_3D_MS} ms`);
    assert.ok(ms + PHASES_2D_MS <= 40_000, `2D: ${ms + PHASES_2D_MS} ms`);
    assert.ok(ms >= 25_000, `long enough to read (${ms} ms)`);
    for (const b of beats.filter((x) => x.kind === 'say')) assert.ok(b.ms >= 4000, `a line ${b.ms} ms`);
    assert.equal(beats.filter((x) => x.kind === 'ask').length, 1);
  }
});

test('v0.6 D: Sanskrit of file 13 — every line of the scene has its Sanskrit; ≤ 10 words a sentence; every word Level 1–3 by the oracle; the herb mountain’s neighbours are names-6 (Ṛṣabha, Kailāsa, 6.74.30)', () => {
  const sa = REAL.dialogueSa ?? {};
  const lines = [HERBS!.title, ...saysOf(HERBS!.steps), ...toldAsks(HERBS!).flatMap((a) => [a.ask, ...a.options.map((o) => o.label)])];
  for (const en of lines) assert.ok(sa[en], `Sanskrit for “${en}”`);
  const entries = (sa13 as { entries: { en: string; sa: string }[] }).entries;
  assert.deepEqual(entries.map((e) => e.en).sort(), [...lines].sort(), 'file 13 holds exactly the scene’s lines');
  const o = getOracle();
  for (const e of entries) {
    for (const sentence of e.sa.split(/[।?!]/).map((x) => x.trim()).filter(Boolean)) {
      const words = sentence.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
      assert.ok(words.length <= 10, `≤ 10 words: ${sentence}`);
      for (const w of words) {
        const lv = easiest(o.analyse(w))?.level ?? 99;
        assert.ok(lv <= 3, `${w} (${e.en}) is Level ${lv}`);
      }
    }
  }
  assert.deepEqual((names6 as { names: { id: string; sa: string }[] }).names.map((n) => [n.id, n.sa]), [['place.rishabha', 'ऋषभ'], ['place.kailasa', 'कैलास']]);
});

test('v0.6 D: the 3D choreography — herbs shine, then wink out one by one and stay hidden at the question; the peak is the mountain’s until “lift”, then over Hanumān’s head; the army lies until “revive” and stands at the end', () => {
  const spots = herbSpots();
  assert.equal(spots.length, 12);
  for (const h of spots) {
    assert.equal(herbsShown('himalaya', 3, h.i), 1);
    assert.equal(herbsShown('search', 0, h.i), 1);
    assert.equal(herbsShown('search', 4.2, h.i), 0);
    assert.equal(herbsShown('hidden', 0, h.i), 0);
  }
  const gone = spots.map((h) => [0.5, 1, 1.5, 2, 2.5, 3, 3.5].findIndex((t) => herbsShown('search', t, h.i) < 0.5));
  assert.deepEqual(gone, [...gone].sort((a, b) => a - b), 'one by one');
  for (const shot of ['himalaya', 'search', 'hidden', 'roar'] as const) assert.equal(peakAt(shot, 2), null, `${shot}: the peak is still the mountain's`);
  const torn = peakAt('lift', 0.6)!;
  assert.ok(torn.at[1] > PEAK_CAP[1], 'tearing: it rises');
  for (const [shot, t] of [['lift', 3], ['sea', 1], ['revive', 4], ['after', 0]] as const) {
    const h = heroAt(shot, t);
    const p = peakAt(shot, t, h)!;
    assert.ok(p && Math.abs(p.at[1] - (h.pos[1] + h.h)) < 1, `${shot}: over his head`);
    assert.ok(p.glow > 0.9, `${shot}: shining like the sun`);
  }
  const army = armyLayout();
  assert.equal(army.length, 14);
  assert.deepEqual(army.slice(0, 2).map((a) => a.id), ['rama', 'lakshmana']);
  army.forEach((_, i) => {
    assert.equal(riseK('before', 0, i), 0);
    assert.equal(riseK('north', 2, i), 0);
    assert.equal(riseK('revive', 0, i), 0);
    assert.equal(riseK('revive', 6.2, i), 1, `figure ${i} stands by the end of the line`);
    assert.equal(riseK('after', 0, i), 1);
  });
  assert.ok(riseK('revive', 1.4, 0) > riseK('revive', 1.4, 5), 'Rāma first, then the vānaras');
});

test('v0.6 D: the 3D cameras and sets — the battle frame opens onto the first shot and the last shot returns to it; every shot has a finite camera; two sets (the battlefield, the Himālaya); the mountain meshes', () => {
  const near = (a: number[], b: number[]): boolean => a.every((x, i) => Math.abs(x - (b[i] as number)) < 1e-9);
  assert.ok(near(herbsPath(0, true).pos, FRAME_POSE.pos) && near(herbsPath(1, true).pos, NORTH_START.pos), 'rotate-out: frame → first shot');
  assert.ok(near(herbsPath(0, false).pos, REVIVE_END.pos) && near(herbsPath(1, false).pos, FRAME_POSE.pos), 'rotate-in: last shot → frame');
  assert.ok(near(shotPose('north', 0).pos, NORTH_START.pos), 'the first shot starts where the rotate-out ends');
  for (const shot of HERB_SHOTS)
    for (const t of [0, 1, 2.5, 4, 7]) {
      const p = shotPose(shot, t, heroAt(shot, t), 3);
      assert.ok([...p.pos, ...p.target, p.fov, p.roll].every(Number.isFinite), `${shot} @${t}`);
      assert.ok(Math.hypot(p.pos[0] - p.target[0], p.pos[1] - p.target[1], p.pos[2] - p.target[2]) > 1, `${shot} @${t}: looks somewhere`);
      const h = heroAt(shot, t, 3);
      assert.ok([...h.pos, ...h.vel, h.h].every(Number.isFinite) && h.h > 1);
    }
  assert.deepEqual(HERB_SHOTS.map((s) => herbSet(s, 'scene')), ['lanka', 'himalaya', 'himalaya', 'himalaya', 'himalaya', 'himalaya', 'lanka', 'lanka']);
  for (const ph of ['flat', 'rotate-out', 'rotate-in', 'done'] as const) assert.equal(herbSet('lift', ph), 'lanka', `${ph}: the battlefield (the frame lives there)`);
  assert.equal(herbShot(''), 'north');
  assert.equal(herbShot('nonsense'), 'north');
  // meshes: finite, upward normals, the peak and the base together are the mountain plus two caps
  const all = mountainMesh(HERB_MOUNTAIN);
  const base = mountainMesh(HERB_MOUNTAIN, 'base');
  const peak = mountainMesh(HERB_MOUNTAIN, 'peak');
  assert.equal(all.length % 27, 0);
  assert.equal(base.length + peak.length, all.length + 2 * 18 * 27, 'base + peak = mountain + two caps of 18 triangles');
  for (const m of [all, base, peak, rangeMesh()]) {
    assert.ok(m.every(Number.isFinite));
    for (let v = 0; v < m.length; v += 9) assert.ok((m[v + 4] as number) >= 0, 'normals point up');
  }
  let top = -1;
  for (let v = 0; v < peak.length; v += 9) top = Math.max(top, peak[v + 1] as number);
  assert.ok(top > 11 && top < 14, `the peak reaches the summit (${top})`);
});
