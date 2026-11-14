/**
 * v0.5b WP-D: Nala's bridge (P5, logic-setu; plan §7 "D": seeded, always solvable in 3–12 taps; hints lead to the
 * solution; the bot solves it). The day lengths are Yuddha 6.22.66–70 (14, 20, 21, 22, 23 yojanas; 100 in all, 6.22.74).
 *  - the puzzle is seeded (same seed + tag → same bridge), 5 columns × 4 turns, 3–12 taps, ≥ 3 stones out of true
 *  - a tap turns a stone a quarter; a true stone stays put, so the bridge takes exactly `setuTaps` taps (never more)
 *  - Nala's hint points at the first stone not yet true, and following hints alone builds the bridge
 *  - ▶ continues only once the bridge is whole; the script then runs on; nothing can be lost
 *  - Kathā only: a practice save skips `{setu}`; the bot (logic-sim) and the real story's Kathā block solve it
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from './content';
import { newGame, reduce } from './logic';
import { startScript } from './logic-events';
import { botActions, runWalkthrough } from './logic-sim';
import {
  SETU_COLS,
  SETU_DAYS,
  SETU_MAX_TAPS,
  SETU_MIN_OFF,
  SETU_MIN_TAPS,
  SETU_TURNS,
  setuAction,
  setuBotActions,
  setuBuilt,
  setuPuzzle,
  setuSolved,
  setuTaps,
  startSetu,
  stoneTurnsLeft,
} from './logic-setu';
import type { EventCmd, GameState, SetuPending } from './types';

const REAL = loadContent();

function calm(style?: 'katha', seed = 1): GameState {
  const s = newGame(seed, 3, REAL, { name: 'Setu', avatar: 'a', ...(style ? { style } : {}) });
  return { ...s, mode: 'explore', script: null, pending: null, fx: [] };
}
const run = (s: GameState, cmds: unknown[]): GameState => startScript(s, REAL, 'test.setu', cmds as EventCmd[]);
const bridge = (s: GameState): SetuPending => {
  assert.equal(s.pending?.kind, 'setu', `a setu pending (${s.pending?.kind})`);
  return s.pending as SetuPending;
};

test('setu: the days are Yuddha 6.22.66–70 and make a hundred yojanas (6.22.74)', () => {
  assert.deepEqual([...SETU_DAYS], [14, 20, 21, 22, 23]);
  assert.equal(SETU_DAYS.reduce((a, b) => a + b, 0), 100);
  assert.equal(SETU_COLS, 5);
});

test('setu: seeded — the same seed and tag give the same bridge; 500 seeds × 3 tags are all 3–12 taps with ≥ 3 stones off', () => {
  assert.deepEqual(setuPuzzle(7, '6.22'), setuPuzzle(7, '6.22'));
  const shapes = new Set<string>();
  for (let seed = 1; seed <= 500; seed++)
    for (const tag of ['6.22', 'nala', 'x']) {
      const p = setuPuzzle(seed, tag);
      assert.equal(p.kind, 'setu');
      assert.equal(p.tag, tag);
      assert.equal(p.cols, SETU_COLS);
      assert.equal(p.turns, SETU_TURNS);
      assert.equal(p.cells.length, SETU_COLS);
      assert.deepEqual(p.solution, [0, 0, 0, 0, 0]);
      assert.equal(p.taps, 0);
      assert.equal(p.hint, null);
      assert.ok(p.cells.every((c) => Number.isInteger(c) && c >= 0 && c < SETU_TURNS));
      const n = setuTaps(p);
      assert.ok(n >= SETU_MIN_TAPS && n <= SETU_MAX_TAPS, `seed ${seed} ${tag}: ${n} taps`);
      assert.ok(p.cells.filter((c, i) => c !== p.solution[i]).length >= SETU_MIN_OFF, `seed ${seed} ${tag}: stones off`);
      assert.ok(!setuSolved(p));
      shapes.add(p.cells.join(''));
    }
  assert.ok(shapes.size > 50, `varied bridges (${shapes.size})`);
});

test('setu: a tap turns a stone a quarter; a true stone stays put; any tapping order builds the bridge in exactly setuTaps taps', () => {
  for (let seed = 1; seed <= 60; seed++) {
    let s = run(calm('katha', seed), [{ setu: '6.22' }, { say: 'after' }]);
    const p0 = bridge(s);
    const need = setuTaps(p0);
    // a tapping order that cycles over every stone, true ones included (those taps are refused: the same state)
    let refused = 0;
    for (let k = 0; !setuSolved(bridge(s)) && k < 200; k++) {
      const i = k % SETU_COLS;
      const before = bridge(s);
      const next = reduce(s, REAL, { type: 'choose', index: i });
      if (stoneTurnsLeft(before, i) === 0) {
        assert.equal(next, s, 'a true stone does not turn');
        refused++;
        continue;
      }
      const p = bridge(next);
      assert.equal(p.cells[i], (before.cells[i]! + 1) % SETU_TURNS, 'a quarter turn');
      assert.equal(p.taps, before.taps + 1);
      assert.equal(setuTaps(p), setuTaps(before) - 1, 'every tap brings the bridge nearer');
      s = next;
    }
    const done = bridge(s);
    assert.ok(setuSolved(done));
    assert.equal(done.taps, need, `seed ${seed}: exactly the taps it needed`);
    assert.ok(done.taps <= SETU_MAX_TAPS);
    assert.equal(setuBuilt(done), 100, 'the shore meets Laṅkā: a hundred yojanas');
    assert.ok(refused >= 0);
    // whole: no more turning; ▶ continues the script
    assert.equal(reduce(s, REAL, { type: 'choose', index: 0 }), s);
    const after = reduce(s, REAL, { type: 'advance' });
    assert.ok(after.pending?.kind === 'say' && after.pending.text === 'after', 'the script continues');
  }
});

test("setu: Nala's hint points at the first stone not yet true; following hints alone builds the bridge; ▶ never continues early", () => {
  for (let seed = 1; seed <= 40; seed++) {
    let s = run(calm('katha', seed), [{ setu: 'nala' }, { say: 'after' }]);
    let hints = 0;
    for (let k = 0; k < 100 && !setuSolved(bridge(s)); k++) {
      const p = bridge(s);
      if (p.hint === null) {
        const h = reduce(s, REAL, { type: 'advance' });
        const hp = bridge(h); // ▶ before the bridge is whole: a hint, never the next line
        const first = p.cells.findIndex((_c, i) => stoneTurnsLeft(p, i) > 0);
        assert.equal(hp.hint, first, 'the first stone (day order) not yet true');
        assert.equal(reduce(h, REAL, { type: 'advance' }), h, 'asking again with the hint shown changes nothing');
        hints++;
        s = h;
        continue;
      }
      s = reduce(s, REAL, { type: 'choose', index: p.hint });
    }
    const done = bridge(s);
    assert.ok(setuSolved(done), `seed ${seed}: hints lead to the solution`);
    assert.equal(done.hint, null, 'the hint clears when its stone sits true');
    assert.ok(hints >= 1 && hints <= SETU_COLS);
  }
});

test('setu: actions that do not apply leave the state unchanged', () => {
  const s = run(calm('katha'), [{ setu: '6.22' }]);
  for (const a of [{ type: 'choose', index: -1 }, { type: 'choose', index: 5 }, { type: 'choose', index: 1.5 }, { type: 'choose' }, { type: 'answer', option: 'x', timeMs: 1 }, { type: 'step', dir: 'up' }])
    assert.equal(reduce(s, REAL, a as never), s, JSON.stringify(a));
  // setuAction on another pending: the same object
  const other: GameState = { ...s, pending: { kind: 'say', text: 'x' } };
  assert.equal(setuAction(other, REAL, { type: 'choose', index: 0 }), other);
});

test('setu: Kathā only — the practice game skips {setu}; an empty tag is skipped', () => {
  const k = run(calm('katha'), [{ setu: '6.22' }, { say: 'after' }]);
  assert.equal(k.pending?.kind, 'setu');
  const pr = run(calm(), [{ setu: '6.22' }, { say: 'after' }]);
  assert.ok(pr.pending?.kind === 'say' && pr.pending.text === 'after', 'practice: skipped');
  assert.equal(startSetu(calm(), REAL, '6.22').pending, null);
  assert.equal(startSetu(calm('katha'), REAL, '  ').pending, null);
  // seeded by the save: two seeds, two bridges (usually); the same seed, the same bridge
  assert.deepEqual(bridge(run(calm('katha', 4), [{ setu: '6.22' }])).cells, setuPuzzle(calm('katha', 4).seed, '6.22').cells);
});

test('setu: the bot solves it (setuBotActions and logic-sim botActions), from every seeded bridge', () => {
  for (let seed = 1; seed <= 80; seed++) {
    let s = run(calm('katha', seed), [{ setu: '6.22' }, { say: 'after' }]);
    for (let n = 0; n < 30 && s.pending?.kind === 'setu'; n++) {
      const acts = botActions(s, REAL, { recited: false, rested: false });
      assert.deepEqual(acts, setuBotActions(s.pending));
      const next = acts.map((a) => reduce(s, REAL, a)).find((x) => x !== s);
      assert.ok(next, 'one of the bot actions applies');
      s = next;
    }
    assert.ok(s.pending?.kind === 'say' && s.pending.text === 'after', `seed ${seed}: solved and continued`);
  }
});

test("setu: the real story's {setu} sits in Nala's Kathā block, and the Kathā story bot builds the bridge (the practice bot never meets it)", () => {
  const nala = REAL.events.find((e) => e.id === 'ch6.nala');
  assert.ok(nala && JSON.stringify(nala.cmds).includes('"setu":"6.22"'), 'ch6.nala has {setu: "6.22"}');
  const steps = REAL.walkthrough.slice(0, REAL.walkthrough.findIndex((w) => w.expectFlag === 'ch6.setu_built') + 1);
  for (const style of ['katha', 'abhyasa'] as const) {
    let bridges = 0;
    const r = runWalkthrough(REAL, 5, 3, { style, steps, onAction: (b, _a, n) => void (n.pending?.kind === 'setu' && b.pending?.kind !== 'setu' && bridges++) });
    assert.equal(r.error ?? null, null);
    assert.ok(r.state.save.flags['ch6.setu_built'], `${style}: the bridge was built`);
    assert.equal(bridges, style === 'katha' ? 1 : 0, `${style}: the puzzle`);
  }
});
