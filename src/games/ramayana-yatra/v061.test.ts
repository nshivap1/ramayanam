/**
 * v0.6.1 (notes/v061-animations.md): the animation pass and the one telling of the Āditya-hṛdayam.
 *  - the kit's new pieces: emote bubbles, hops, the camera focus, a prop move that keeps its glide time, the Puṣpaka
 *    (a flying prop) — all Kathā only, so the practice journey's state is untouched;
 *  - the Puṣpaka's flight (Yuddha 6.123): from Laṅkā over the bridge, the ocean shore, Ṛṣyamūka, Pañcavaṭī and Ayodhyā,
 *    one place per stop of the five questions, before the warp home; the practice journey flies straight home;
 *  - the Āditya-hṛdayam is told once: in Kathā no Agastya waits before the gate (it opens after Indrajit) and the told
 *    cutscene mid-battle teaches the hymn; the practice journey keeps Agastya's lesson before the gate.
 * The hymn-only phase of Rāvaṇa's fight is tested with the other phases (tactics.test.ts), the cutscene's teaching in
 * cutscene.test.ts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from './content';
import { reduce, visibleNpcs } from './logic';
import { startScript } from './logic-events';
import { EMPTY_STAGE, applyKit, kitFx } from './logic-stage';
import { testFlag } from './logic-util';
import { FLYING_PROPS } from './art-v061';
import { PROP_IDS } from './catalog';
import { KATHA_FLAG } from './logic-katha';
import type { EventCmd, GameState, SaveData } from './types';

const REAL = loadContent();

function state(style: 'katha' | 'abhyasa', at: { mapId: string; x: number; y: number }, flags: string[] = []): GameState {
  const f: SaveData['flags'] = style === 'katha' ? { [KATHA_FLAG]: true } : {};
  for (const x of flags) f[x] = true;
  const save: SaveData = {
    v: 1, playerName: 'T', avatar: 'a', mapId: at.mapId, x: at.x, y: at.y, facing: 'up', respawn: { mapId: at.mapId, x: at.x, y: at.y },
    chapter: 6, objective: '', flags: f, party: [], items: {}, niska: 0, words: {}, shlokas: {},
    step: 0, npcPos: {}, playMs: 0, completedChapters: [], ...(style === 'katha' ? { style: 'katha' as const, smrti: {} } : {}),
  };
  return { v: 1, seed: 7, tick: 0, level: 3, save, mode: 'explore', script: null, pending: null, battle: null, recital: null, session: { correct: 0, total: 0, swift: 0, practised: [], shlokasHeard: [], shlokasRestored: [], battlesWon: 0, chaptersCompleted: [] }, fx: [] };
}

const ravanaOnWin = (): EventCmd[] => {
  const ev = REAL.events.find((e) => e.id === 'ch6.ravana')!;
  return (ev.cmds.find((c) => 'battle' in c) as { onWin: EventCmd[] }).onWin;
};

/** Play a script to its end: say / verse / fade / wait advance; a question takes its story reply (no goto). */
function playOut(s0: GameState, onWarp?: (s: GameState) => void): GameState {
  let s = s0;
  let map = s.save.mapId;
  let asked = 0;
  for (let n = 0; n < 2000 && s.mode === 'script'; n++) {
    if (s.save.mapId !== map) {
      map = s.save.mapId;
      onWarp?.(s);
    }
    const p = s.pending;
    if (p?.kind === 'choice') {
      const blockChoice = (cmds: EventCmd[]): Extract<EventCmd, { choice: string }>[] =>
        cmds.flatMap((c) => ('choice' in c ? [c] : 'if' in c ? [...blockChoice(c.then ?? []), ...blockChoice(c.else ?? [])] : []));
      const all = blockChoice(ravanaOnWin());
      // the questions come in story order (the first and the last offer the same three names); the panel may order the
      // replies its own way: the story reply is found by its label
      const c = all[asked++];
      const right = c ? p.options.indexOf(c.options.find((o) => !o.goto)!.label) : 0;
      s = reduce(s, REAL, { type: 'choose', index: right });
      continue;
    }
    s = reduce(s, REAL, { type: 'advance' });
  }
  return s;
}

test('v0.6.1 kit: a prop move keeps its glide time (capped at 20 s); a move without one drops it; the Puṣpaka is a prop that flies', () => {
  const world = { at: (id: string) => (id === 'player' ? { x: 1, y: 1 } : null), actors: () => ['player'] };
  let st = applyKit(EMPTY_STAGE, { prop: 'p', sprite: 'vimana', at: { x: 2, y: 2 } } as never, world as never);
  st = applyKit(st, { prop: 'p', to: { x: 9, y: 2 }, ms: 4500 } as never, world as never);
  assert.deepEqual(st.props['p'], { sprite: 'vimana', x: 9, y: 2, ms: 4500 });
  st = applyKit(st, { prop: 'p', to: { x: 9, y: 9 }, ms: 99999 } as never, world as never);
  assert.equal(st.props['p']!.ms, 20000);
  st = applyKit(st, { prop: 'p', to: 'player' } as never, world as never);
  assert.deepEqual(st.props['p'], { sprite: 'vimana', x: 1, y: 1 }, 'a move without ms glides at the view default');
  assert.ok((PROP_IDS as readonly string[]).includes('vimana') && FLYING_PROPS.has('vimana'));
  assert.equal(kitFx({ prop: 'p', to: { x: 1, y: 1 }, ms: 900 } as never, st, world as never), null, 'a prop move is state (the view glides it), not a timed effect');
});

test('v0.6.1 the Puṣpaka (Kathā): it flies over Laṅkā, the bridge, the ocean shore, Ṛṣyamūka, Pañcavaṭī and Ayodhyā — one place per stop — then home; at each place the chariot, at twice its size, and the camera on it', () => {
  const s0 = startScript(state('katha', { mapId: 'lanka_palace', x: 11, y: 6 }, ['ch6.indrajit_defeated', 'ch6.ravana_defeated']), REAL, 'test.pushpaka', ravanaOnWin().slice(9));
  const maps: string[] = [];
  const end = playOut(s0, (s) => {
    maps.push(s.save.mapId);
    if (s.save.mapId === 'ayodhya_return') return;
    // the warp clears the stage; the flight's own commands follow it before the screen fades in
    let t = s;
    for (let k = 0; k < 10 && t.pending?.kind !== 'fade'; k++) t = reduce(t, REAL, { type: 'advance' });
    assert.equal(t.stage?.props['pushpaka']?.sprite, 'vimana', `${s.save.mapId}: the Puṣpaka is there`);
    assert.equal(t.stage?.scale['pushpaka'], 2, `${s.save.mapId}: at twice its size`);
    assert.ok(t.stage?.focus, `${s.save.mapId}: the camera holds on the place`);
    const map = REAL.maps.find((m) => m.id === s.save.mapId)!;
    const f = t.stage!.focus!;
    assert.ok(Math.abs(f.x - s.save.x) > 10 || Math.abs(f.y - s.save.y) > 6, `${s.save.mapId}: the player stands out of view (${s.save.x},${s.save.y} vs focus ${f.x},${f.y})`);
    assert.ok(f.x >= 0 && f.y >= 0 && f.x < map.width && f.y < map.height);
  });
  assert.deepEqual(maps, ["lanka_city", "setu", "setu_shore", "rishyamuka", "panchavati", "ayodhya_city", "ayodhya_return"], `end: ${end.mode} ${end.save.mapId} ${end.pending?.kind}`);
  assert.equal(end.save.mapId, 'ayodhya_return');
  assert.equal(end.stage, undefined, 'the stage is gone when the scene ends');
});

test('v0.6.1 the Puṣpaka (practice): the same lines, no flight — straight home from the palace', () => {
  const s0 = startScript(state('abhyasa', { mapId: 'lanka_palace', x: 11, y: 6 }, ['ch6.indrajit_defeated', 'ch6.ravana_defeated']), REAL, 'test.pushpaka', ravanaOnWin().slice(9));
  const maps: string[] = [];
  const end = playOut(s0, (s) => maps.push(s.save.mapId));
  assert.deepEqual(maps, ['ayodhya_return']);
  assert.equal(end.stage, undefined);
});

test('v0.6.1 the Āditya-hṛdayam is told once: in Kathā no Agastya before the gate and the gate opens after Indrajit; the practice journey keeps his lesson, and its gate waits for the hymn', () => {
  const field = REAL.maps.find((m) => m.id === 'lanka_battlefield')!;
  const gate = field.warps.find((w) => w.to === 'lanka_palace')!;
  const k = state('katha', { mapId: 'lanka_battlefield', x: 16, y: 27 }, ['ch6.indrajit_defeated']);
  const p = state('abhyasa', { mapId: 'lanka_battlefield', x: 16, y: 27 }, ['ch6.indrajit_defeated']);
  assert.ok(!visibleNpcs(k, REAL).some((n) => n.id === 'agastya'), 'Kathā: Agastya comes in the battle');
  assert.ok(visibleNpcs(p, REAL).some((n) => n.id === 'agastya'), 'practice: Agastya waits before the gate');
  assert.ok(testFlag(k.save.flags, gate.requires), 'Kathā: the gate is open after Indrajit');
  assert.ok(!testFlag(p.save.flags, gate.requires), 'practice: the gate waits for the hymn');
  assert.ok(testFlag({ ...p.save.flags, 'restored.s-aditya-hrdayam': true }, gate.requires));
  assert.ok(!testFlag({ [KATHA_FLAG]: true }, gate.requires), 'Kathā: not before Indrajit falls');
  // the walkthrough: the lesson is a practice-only step
  const step = REAL.walkthrough.find((w) => 'talk' in w.action && w.action.talk === 'agastya')!;
  assert.equal(step.style, 'abhyasa');
});

test('v0.6.1 testFlag: "|" joins alternatives of "&" groups', () => {
  assert.ok(testFlag({ a: true }, 'a|b&c'));
  assert.ok(testFlag({ b: true, c: true }, 'a|b&c'));
  assert.ok(!testFlag({ b: true }, 'a|b&c'));
  assert.ok(testFlag({}, '!a|b'));
  assert.ok(!testFlag({ a: true }, '!a|b'));
});
