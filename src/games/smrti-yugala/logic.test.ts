import { test } from 'node:test';
import assert from 'node:assert/strict';
import { devaToIast, validateDeva } from '@sanskrit';
import { createRng } from '@sdk';
import { DECK, PAIRS, type State, deal, flip, isFaceUp, score, settle, shareGrid, starsFor } from './logic';

const SEEDS = Array.from({ length: 50 }, (_, i) => i * 104729 + 7);

test('deck: unique, well-formed akṣaras with unique sounds', () => {
  assert.equal(new Set(DECK).size, DECK.length);
  for (const a of DECK) assert.equal(validateDeva(a).ok, true, a);
  assert.equal(new Set(DECK.map((a) => devaToIast(a))).size, DECK.length);
});

test('deal: deterministic, 2 cards per key, labels correct', () => {
  for (const seed of SEEDS) {
    const s = deal(seed);
    assert.deepEqual(deal(seed), s);
    assert.equal(s.cards.length, PAIRS * 2);
    const byKey = new Map<string, string[]>();
    for (const c of s.cards) byKey.set(c.key, [...(byKey.get(c.key) ?? []), c.face]);
    assert.equal(byKey.size, PAIRS);
    for (const [key, faces] of byKey) {
      assert.deepEqual(faces.slice().sort(), ['deva', 'sound']);
      assert.ok(DECK.includes(key));
    }
    for (const c of s.cards) assert.equal(c.label, c.face === 'deva' ? c.key : devaToIast(c.key));
    s.cards.forEach((c, i) => assert.equal(c.index, i));
  }
  assert.notDeepEqual(deal(1).cards, deal(2).cards);
});

test('flip: match, mismatch, settle and guards', () => {
  const s0 = deal(42);
  const a = s0.cards[0]!;
  const partner = s0.cards.find((c) => c.key === a.key && c.index !== a.index)!;
  const other = s0.cards.find((c) => c.key !== a.key)!;

  const s1 = flip(s0, a.index);
  assert.deepEqual(s1.open, [a.index]);
  assert.equal(s1.moves, 0);
  assert.equal(flip(s1, a.index), s1, 'flipping the same card again is ignored');

  const miss = flip(s1, other.index);
  assert.equal(miss.pending, true);
  assert.equal(miss.moves, 1);
  assert.equal(miss.mismatches, 1);
  assert.equal(flip(miss, partner.index), miss, 'no flips while a mismatch is showing');
  const settled = settle(miss);
  assert.deepEqual(settled.open, []);
  assert.equal(isFaceUp(settled, a.index), false);

  const hit = flip(s1, partner.index);
  assert.deepEqual(hit.matched, [a.key]);
  assert.equal(hit.pending, false);
  assert.equal(isFaceUp(hit, a.index), true);
  assert.equal(flip(hit, a.index), hit, 'matched cards cannot be flipped');
  assert.equal(flip(s0, 999), s0);
  assert.equal(settle(s0), s0);
});

function perfectBot(state: State): State {
  let s = state;
  for (const c of state.cards) {
    if (isFaceUp(s, c.index)) continue;
    const partner = state.cards.find((x) => x.key === c.key && x.index !== c.index)!;
    s = flip(flip(s, c.index), partner.index);
  }
  return s;
}

test('perfect bot finishes every seed in exactly PAIRS moves with 3 stars', () => {
  for (const seed of SEEDS) {
    const s = perfectBot(deal(seed));
    assert.equal(s.done, true);
    assert.equal(s.moves, PAIRS);
    assert.equal(s.mismatches, 0);
    assert.equal(starsFor(s.moves, PAIRS), 3);
    assert.equal(score(s), PAIRS * 20);
    assert.equal(flip(s, 0), s, 'no moves after the game is done');
  }
});

test('random bot always terminates; invariants hold throughout', () => {
  for (const seed of SEEDS.slice(0, 20)) {
    const rng = createRng(seed);
    let s = deal(seed);
    let guard = 0;
    while (!s.done) {
      assert.ok(++guard < 5000, 'random play must terminate');
      if (s.pending) {
        s = settle(s);
        continue;
      }
      const down = s.cards.filter((c) => !isFaceUp(s, c.index));
      s = flip(s, rng.pick(down).index);
      assert.ok(s.open.length <= 2);
      assert.equal(s.pending, s.open.length === 2);
      assert.ok(s.mismatches <= s.moves);
    }
    assert.equal(s.matched.length, PAIRS);
    assert.ok(score(s) >= 10);
    assert.match(shareGrid(s), /moves$/);
  }
});

test('stars thresholds', () => {
  assert.equal(starsFor(8, 8), 3);
  assert.equal(starsFor(12, 8), 3);
  assert.equal(starsFor(13, 8), 2);
  assert.equal(starsFor(18, 8), 2);
  assert.equal(starsFor(19, 8), 1);
});
