/**
 * The end of a book (v0.5a, fx-end): logic `next-book` (the book-complete screen's "continue") and the pure helpers of
 * bookend.ts (the screen's numbers, the session result's strings for a reader of संस्कृतम्).
 *   - a walkthrough that takes "continue" at every book end plays all six books to the ending in ONE session, in both
 *     journeys (Kathā and practice): each next book's opening runs at once (title card first), on its start map
 *   - `next-book` does nothing anywhere else (no book complete, mid-event, next book already begun, after book 6)
 *   - "stop here": the save taken at that calm moment resumes in the next book (and "continue" still works on it)
 *   - book names before a consonant agree with the sandhi engine; the Sanskrit result has no Latin and keeps the contract
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinSandhiDeva } from '@sanskrit';
import type { Level } from '@sdk';
import { loadContent } from './content';
import { autoplay, doStep, grind, partyHealth, patchUp, restAtShrine, runWalkthrough, SimError, type AutoOptions } from './logic-sim';
import { loadGame, newGame, nextBookKanda, reduce, sessionResult, toSave } from './logic';
import { ZERO_MARK, astrasOf, beforeConsonant, bookName, bookStats, saResult } from './bookend';
import { uiSa } from './sa-ui';
import type { GameState, JourneyStyle } from './types';

const REAL = loadContent();
const LATIN = /[A-Za-z]/;

/** Follow the walkthrough; at each `ch{k}.started` step take the book-complete screen's "continue" instead of walking. */
function playContinuing(style: JourneyStyle, seed: number, level: Level): { state: GameState; continued: number[]; openings: GameState[] } {
  const auto: AutoOptions = {};
  let s = autoplay(newGame(seed, level, REAL, { name: 'Bot', avatar: 'a', style }), REAL, auto);
  const continued: number[] = [];
  const openings: GameState[] = [];
  for (const [i, step] of REAL.walkthrough.entries()) {
    if (s.save.flags[step.expectFlag]) continue;
    const m = /^ch([2-6])\.started$/.exec(step.expectFlag);
    if (m) {
      const k = Number(m[1]);
      assert.equal(s.mode, 'explore', `book ${k - 1} ends calm`);
      assert.equal(nextBookKanda(s), k, `the next book is ${k}`);
      const n = reduce(s, REAL, { type: 'next-book' });
      assert.notEqual(n, s, `continue into book ${k}`);
      openings.push(n);
      s = autoplay(n, REAL, auto);
      continued.push(k);
      assert.ok(s.save.flags[step.expectFlag], `book ${k} has begun`);
      continue;
    }
    for (let attempt = 0; attempt < 8 && !s.save.flags[step.expectFlag]; attempt++) {
      try {
        if (s.mode === 'explore') {
          s = patchUp(s, REAL);
          if (partyHealth(s, REAL) < 0.5) s = restAtShrine(s, REAL, auto);
        }
        s = doStep(s, REAL, step, auto);
        if (s.mode === 'ended') break;
      } catch (e) {
        if (!(e instanceof SimError)) throw e;
      }
      if (!s.save.flags[step.expectFlag]) s = style === 'katha' ? restAtShrine(s, REAL, auto) : grind(s, REAL, 8, auto);
    }
    assert.ok(s.save.flags[step.expectFlag], `walkthrough[${i}] ${JSON.stringify(step.action)}: ${step.expectFlag}`);
  }
  return { state: s, continued, openings };
}

for (const style of ['katha', 'abhyasa'] as const)
  for (const seed of [3, 21])
    test(`next-book (${style}, seed ${seed}): "continue" at every book end plays all six books to the ending in one session; each opening starts at once on the next book's start map`, () => {
      const r = playContinuing(style, seed, 3);
      assert.equal(r.state.mode, 'ended', 'the ending');
      assert.deepEqual(r.continued, [2, 3, 4, 5, 6]);
      assert.deepEqual([...r.state.session.chaptersCompleted].sort(), [1, 2, 3, 4, 5, 6], 'one session: all six books');
      r.openings.forEach((o, i) => {
        const k = i + 2;
        const ch = REAL.chapters.find((c) => c.kanda === k);
        assert.equal(o.mode, 'script', `book ${k}: the opening runs`);
        assert.equal(o.pending?.kind, 'title', `book ${k}: the title card first`);
        assert.equal(o.save.chapter, k, `book ${k}: the chapter is set`);
        assert.equal(o.save.mapId, ch?.startMap, `book ${k}: on its start map`);
      });
      assert.equal(sessionResult(r.state, REAL).outcome, 'won');
    });

test('next-book: nothing happens unless a book is complete, the next one has not begun, and the game is calm', () => {
  const fresh = autoplay(newGame(5, 3, REAL, { name: 'Bot', avatar: 'a', style: 'katha' }), REAL);
  assert.equal(nextBookKanda(fresh), null);
  assert.equal(reduce(fresh, REAL, { type: 'next-book' }), fresh, 'no book complete yet');
  const snaps: GameState[] = [];
  const r = runWalkthrough(REAL, 5, 3, { style: 'katha', accuracy: 1, attempts: 12, onStep: (_i, s) => snaps.push(s) });
  assert.equal(r.failedAt, -1, r.error ?? '');
  const at = (flag: string): GameState => snaps[REAL.walkthrough.findIndex((w) => w.expectFlag === flag)]!;
  const end1 = at('ch1.complete');
  assert.equal(nextBookKanda(end1), 2);
  // mid-event: the same object
  const busy: GameState = { ...end1, mode: 'script', pending: { kind: 'say', text: 'x' } };
  assert.equal(reduce(busy, REAL, { type: 'next-book' }), busy);
  // book 2 already begun (the player walked into it): nothing
  const began = at('ch2.started');
  assert.equal(nextBookKanda(began), null);
  assert.equal(reduce(began, REAL, { type: 'next-book' }), began);
  // after book 6 (the ending): nothing
  assert.equal(nextBookKanda(r.state), null);
  assert.equal(reduce(r.state, REAL, { type: 'next-book' }), r.state);
  // twice: the second press finds book 2 begun (or the opening running) and does nothing
  const once = autoplay(reduce(end1, REAL, { type: 'next-book' }), REAL);
  assert.equal(reduce(once, REAL, { type: 'next-book' }), once);
});

test('"stop here": the save at the book-complete screen resumes in the next book, and "continue" still opens it after loading', () => {
  for (const style of ['katha', 'abhyasa'] as const) {
    const snaps: GameState[] = [];
    runWalkthrough(REAL, 9, 3, { style, ...(style === 'katha' ? { accuracy: 1, attempts: 12 } : {}), onStep: (_i, s) => snaps.push(s) });
    for (const k of [1, 2, 3, 4, 5]) {
      const s = snaps[REAL.walkthrough.findIndex((w) => w.expectFlag === `ch${k}.complete`)]!;
      assert.equal(s.mode, 'explore', `${style} book ${k}: calm at the end`);
      const loaded = loadGame(JSON.parse(JSON.stringify(toSave(s))), 77, 3, REAL);
      assert.ok(loaded, `${style} book ${k}: the save loads`);
      assert.ok(loaded.save.completedChapters.includes(k as 1));
      assert.equal(loaded.save.mapId, s.save.mapId, 'same place');
      assert.equal(nextBookKanda(loaded), k + 1, 'the next book waits');
      const o = reduce(loaded, REAL, { type: 'next-book' });
      assert.equal(o.save.chapter, k + 1);
      assert.equal(o.pending?.kind, 'title');
    }
  }
});

test('book names before a consonant (बालकाण्डं समाप्तम्, अयोध्याकाण्डं प्रति) agree with the sandhi engine', () => {
  for (const k of [1, 2, 3, 4, 5, 6]) {
    const n = bookName(REAL, k);
    assert.ok(n.sa.endsWith('म्'), n.sa);
    for (const next of ['समाप्तम्', 'प्रति']) assert.equal(`${n.saPada} ${next}`, joinSandhiDeva(n.sa, next).result, `${n.sa} + ${next}`);
    assert.ok(n.en && !n.en.includes('·'), n.en);
  }
  assert.equal(beforeConsonant('रामः'), 'रामः');
});

test('bookStats: the book\'s verses heard / restored (the save) and the lines / answers since the mark', () => {
  const s0 = newGame(5, 3, REAL, { name: 'Bot', avatar: 'a', style: 'katha' });
  const ids = REAL.chapters.find((c) => c.kanda === 1)!.shlokaIds;
  const s: GameState = {
    ...s0,
    save: { ...s0.save, shlokas: { [ids[0]!]: { heard: true, restored: true, best: 1 }, [ids[1]!]: { heard: true, restored: false, best: 0 } } },
    session: { ...s0.session, correct: 9, total: 12 },
  };
  const st = bookStats(s, REAL, 1, { recited: 4, correct: 2, total: 3 }, 10);
  assert.deepEqual(st.verses, ids);
  assert.equal(st.heard, 2);
  assert.equal(st.restored, 1);
  assert.equal(st.recited, 6);
  assert.equal(st.correct, 7);
  assert.equal(st.answered, 9);
  assert.equal(bookStats(s, REAL, 1, ZERO_MARK, 0).recited, 0);
  assert.ok(astrasOf(REAL, 's-ma-nishada').length > 0, 'the first verse gives an astra');
});

test('saResult: the summary, share and review rows in Sanskrit (no Latin), the contract unchanged', () => {
  const snaps: GameState[] = [];
  runWalkthrough(REAL, 11, 3, { style: 'katha', accuracy: 1, attempts: 12, onStep: (_i, s) => snaps.push(s) });
  const s = snaps[REAL.walkthrough.findIndex((w) => w.expectFlag === 'ch1.complete')]!;
  const base = sessionResult(s, REAL);
  const recited = new Map<string, number>([[s.session.shlokasHeard[0] ?? 's-ma-nishada', 3]]);
  const r = saResult(base, s, REAL, true, recited);
  for (const k of ['outcome', 'score', 'correct', 'total', 'best', 'mastery'] as const) assert.deepEqual(r[k], base[k], k);
  const title = uiSa(REAL, 'bookEnd.title', { book: { en: '', sa: bookName(REAL, 1).saPada } });
  assert.ok(r.summary?.startsWith(`${title} · `), String(r.summary));
  assert.equal(r.summary?.split(' · ').length, 4);
  assert.ok(r.summary?.includes(uiSa(REAL, 'bookEnd.resultRecited', { n: 3 }) ?? '?'));
  assert.equal(r.share, r.summary);
  assert.ok(!LATIN.test(r.summary ?? ''), String(r.summary));
  assert.ok((r.review ?? []).length > 0);
  for (const row of r.review ?? []) assert.ok(!LATIN.test(`${row.sa} ${row.en ?? ''} ${row.note ?? ''}`), JSON.stringify(row));
  // practice: books · restored · right answers; the rows stay the words practised (their English meanings are taught)
  const p = saResult(base, { ...s, save: { ...s.save, style: 'abhyasa' } }, REAL, false, new Map());
  assert.equal(p.summary?.split(' · ').length, 3);
  assert.ok(!LATIN.test(p.summary ?? ''), String(p.summary));
  assert.deepEqual(p.review, base.review);
  // several books / none
  const two = saResult(base, { ...s, session: { ...s.session, chaptersCompleted: [2, 1] } }, REAL, true, new Map());
  assert.ok(two.summary?.startsWith(uiSa(REAL, 'bookEnd.resultBooks', { list: { en: '1, 2', sa: '१, २' } }) ?? '?'), String(two.summary));
  const none = saResult(base, { ...s, session: { ...s.session, chaptersCompleted: [] } }, REAL, true, new Map());
  assert.ok(none.summary?.startsWith(uiSa(REAL, 'bookEnd.resultOpen', { k: s.save.chapter }) ?? '?'), String(none.summary));
});
