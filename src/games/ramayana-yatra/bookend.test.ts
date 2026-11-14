/**
 * The end of a book (v0.5a, fx-end): logic `next-book` (the book-complete screen's "continue") and the pure helpers of
 * bookend.ts (the screen's numbers, the session result's strings for a reader of संस्कृतम्).
 *   - a walkthrough that takes "continue" at every book end plays all six books to the ending in ONE session, in both
 *     journeys (Kathā and practice): each next book's opening runs at once (title card first), on its start map
 *   - `next-book` does nothing anywhere else (no book complete, mid-event, next book already begun, after book 6)
 *   - "stop here": the save taken at that calm moment resumes in the next book (and "continue" still works on it)
 *   - book names before a consonant agree with the sandhi engine; the Sanskrit result has no Latin and keeps the contract
 *   - v0.5b WP-D, the Lava–Kuśa court recital (Kathā): per book the twins sing its key verse, the player says the verse's
 *     least-practised pāda, then the book's card; in the court (twins, Rāma, brothers; no Sītā), then Vālmīki's closing line and the ending — won;
 *     the practice epilogue is unchanged; a late save plays it too
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinSandhiDeva } from '@sanskrit';
import { type Level, createRng } from '@sdk';
import { loadContent } from './content';
import { autoplay, doStep, grind, partyHealth, patchUp, restAtShrine, runWalkthrough, SimError, type AutoOptions } from './logic-sim';
import { leastPada, loadGame, newGame, nextBookKanda, reduce, sessionResult, stepInJourney, toSave, visibleNpcs } from './logic';
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
    if (s.save.flags[step.expectFlag] || !stepInJourney(step, s.save)) continue; // v0.5b: a Kathā-only step is not the practice game's
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
  const r = runWalkthrough(REAL, 5, 3, { style: 'katha', accuracy: 1, attempts: 12, onStep: (i, s) => (snaps[i] = s) });
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
    // v0.5b: the first calm state with the book complete (in practice, book 5 completes in the Akṣa step's script: the
    // step that sets ch5.complete is Kathā-only, WP-B)
    const ends: GameState[] = [];
    const steps = REAL.walkthrough.slice(0, REAL.walkthrough.findIndex((w) => w.expectFlag === 'ch6.started') + 1);
    runWalkthrough(REAL, 9, 3, {
      style,
      steps,
      ...(style === 'katha' ? { accuracy: 1, attempts: 12 } : {}),
      onStep: (_i, s) => {
        for (const k of [1, 2, 3, 4, 5]) if (!ends[k] && s.save.flags[`ch${k}.complete`]) ends[k] = s;
      },
    });
    for (const k of [1, 2, 3, 4, 5]) {
      const s = ends[k]!;
      assert.ok(s, `${style} book ${k}: completed`);
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
  runWalkthrough(REAL, 11, 3, { style: 'katha', accuracy: 1, attempts: 12, onStep: (i, s) => (snaps[i] = s) });
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

// ───────────────────────── v0.5b WP-D: the Lava–Kuśa court recital (Bāla 1.4; plan §5) ─────────────────────────

/** Book order → its key verse (chapters[].keyShloka): what the twins sing and the player says a line of. */
const KEYS = [...REAL.chapters].sort((a, b) => a.kanda - b.kanda).map((c) => c.keyShloka);

interface FinaleTrace {
  state: GameState;
  /** distinct pendings while the epilogue runs: book:k · shloka:id · scene:id:pada · say:<English> · ending */
  trace: string[];
  /** per story recitation: its pāda was the verse's least-practised one just before (P1 "least") */
  least: boolean[];
  /** at the first book card: the map, the recital flag, the NPCs shown */
  court: { map: string; recital: boolean; npcs: string[] } | null;
}

/**
 * A late state: the walkthrough (one journey) up to the step before Rāvaṇa, then Rāvaṇa fallen and Rāma crowned, back
 * at the Tamasā below Vālmīki (where the coronation's script leaves the player). Built this way so the finale's tests do
 * not hang on the boss fight (the battle tests cover it).
 */
function lateState(style: JourneyStyle, seed: number, level: Level): GameState {
  const k = REAL.walkthrough.findIndex((w) => w.expectFlag === 'ch6.restored_aditya');
  const r = runWalkthrough(REAL, seed, level, { style, steps: REAL.walkthrough.slice(0, k + 1) });
  assert.equal(r.error, null, `${style} seed ${seed} L${level}: ${r.error}`);
  const s = r.state;
  const flags = { ...s.save.flags, 'ch6.ravana_defeated': true as const, 'ch6.crowned': true as const };
  return { ...s, save: { ...s.save, flags, mapId: 'tamasa_ashrama', x: 15, y: 8, facing: 'up' } };
}

function playFinale(style: JourneyStyle, seed: number, level: Level, accuracy?: number): FinaleTrace {
  const trace: string[] = [];
  const least: boolean[] = [];
  let court: FinaleTrace['court'] = null;
  const seenP = new Set<unknown>();
  const note = (b: GameState, n: GameState): void => {
    const p = n.pending;
    if (!p || seenP.has(p)) return;
    seenP.add(p);
    if (p.kind === 'book') {
      trace.push(`book:${p.kanda}`);
      court ??= { map: n.save.mapId, recital: !!n.save.flags['ch6.recital'], npcs: visibleNpcs(n, REAL).map((x) => x.id) };
    } else if (p.kind === 'shloka') trace.push(`shloka:${p.shlokaId}`);
    else if (p.kind === 'challenge' && p.context === 'scene' && p.challenge.smarana) {
      const sp = p.challenge.smarana;
      trace.push(`scene:${sp.shlokaId}:${sp.pada}`);
      least.push(leastPada(b, REAL, sp.shlokaId) === sp.pada);
    } else if (p.kind === 'say') trace.push(`say:${p.text}`);
    else if (p.kind === 'ending') trace.push('ending');
  };
  const late = lateState(style, seed, level);
  const step = REAL.walkthrough.find((w) => w.expectFlag === 'ch6.complete')!;
  const state = doStep(late, REAL, step, {
    ...(accuracy !== undefined ? { reciter: { accuracy, rng: createRng(seed) } } : {}),
    onAction: (b, _a, n) => {
      note(b, b); // the talk's first line (the interaction itself is not reported)
      note(b, n);
    },
  });
  return { state, trace, least, court };
}

for (const [seed, level, accuracy] of [[2, 2], [7, 3], [11, 4], [19, 3, 0.7], [23, 4, 0.7]] as [number, Level, number?][])
  test(`finale (Kathā, seed ${seed}, L${level}${accuracy ? `, ${accuracy * 100} % reciter` : ''}): one book card and one recitation per book, in order, then the ending — won`, () => {
    const f = playFinale('katha', seed, level, accuracy);
    const books = f.trace.filter((t) => t.startsWith('book:'));
    const scenes = f.trace.filter((t) => t.startsWith('scene:'));
    assert.deepEqual(books, ['book:1', 'book:2', 'book:3', 'book:4', 'book:5', 'book:6'], 'one review per book, in order');
    assert.equal(scenes.length, 6, 'one recitation per book');
    scenes.forEach((t, i) => assert.ok(t.startsWith(`scene:${KEYS[i]}:`), `book ${i + 1}: a line of its key verse ${KEYS[i]} (${t})`));
    assert.ok(f.least.every(Boolean), 'each line is the key verse’s least-practised pāda');
    // per book: the twins sing (the verse), the player's line, then the book's card
    const flow = f.trace.filter((t) => !t.startsWith('say:') && t !== 'ending').map((t) => t.split(':').slice(0, 2).join(':'));
    assert.deepEqual(flow.slice(-18), KEYS.flatMap((key, k) => [`shloka:${key}`, `scene:${key}`, `book:${k + 1}`]), 'verse, line, card — book by book');
    // the court (Bāla 1.4.30): Rāma with his brothers and the twins; Sītā, Kausalyā and the vānaras not there
    assert.ok(f.court && f.court.map === 'ayodhya_return' && f.court.recital, 'the recital is in Ayodhyā');
    for (const id of ['kusha', 'lava', 'rama_c', 'bharata', 'lakshmana_c']) assert.ok(f.court!.npcs.includes(id), `${id} in the court`);
    for (const id of ['sita_c', 'kausalya', 'hanuman_c', 'sugriva_c', 'vanara_c']) assert.ok(!f.court!.npcs.includes(id), `${id} not in the court`);
    // the end: back at the Tamasā, Vālmīki's closing line, the ending; won
    assert.equal(f.trace.at(-1), 'ending');
    assert.ok(f.trace.includes("say:As long as there are mountains and rivers, Rama's story will live."), "Vālmīki's closing line");
    assert.equal(f.state.mode, 'ended');
    assert.equal(f.state.save.mapId, 'tamasa_ashrama');
    assert.ok(!f.state.save.flags['ch6.recital'], 'the recital flag is cleared');
    assert.ok(f.state.save.flags['ch6.complete']);
    assert.equal(sessionResult(f.state, REAL).outcome, 'won');
  });

test('finale: the practice epilogue is unchanged (no book card, no recitation, no warp; the v0.5a lines, then the ending)', () => {
  for (const [seed, level] of [[3, 3], [8, 2]] as [number, Level][]) {
    const f = playFinale('abhyasa', seed, level);
    assert.deepEqual(f.trace, [
      'say:You have returned, {player}. And the verse book is whole again.',
      'say:You walked beside Rama from the Tamasa to Lanka and home again. You heard the verses where they were first spoken.',
      'say:When I first saw the krauncha bird fall, my grief became a verse. Now you have carried every verse home.',
      'say:Thank you, my student. Because of you, this story can be told for all time.',
      'say:Let us begin again, from the very first word. Teach it to the next student who comes.',
      'ending',
    ]);
    assert.equal(f.court, null);
    assert.equal(f.state.save.mapId, 'tamasa_ashrama');
    assert.equal(sessionResult(f.state, REAL).outcome, 'won');
  }
});

test('finale: from a late save (crowned, back at the Tamasā), talking to Vālmīki plays the recital to the ending — won, every verse listed', () => {
  const i = REAL.walkthrough.findIndex((w) => w.expectFlag === 'ch6.complete');
  const late = lateState('katha', 4, 3);
  const loaded = loadGame(JSON.parse(JSON.stringify(toSave(late))), 4, 3, REAL);
  assert.ok(loaded && loaded.save.flags['ch6.crowned'] && !loaded.save.flags['ch6.complete']);
  let books = 0;
  let scenes = 0;
  const end = doStep(loaded!, REAL, REAL.walkthrough[i]!, {
    onAction: (_b, _a, n) => {
      if (n.pending?.kind === 'book' && _b.pending?.kind !== 'book') books++;
      if (n.pending?.kind === 'challenge' && n.pending.context === 'scene' && _b.pending !== n.pending) scenes++;
    },
  });
  assert.equal(books, 6);
  assert.equal(scenes, 6);
  assert.equal(end.mode, 'ended');
  assert.equal(sessionResult(end, REAL).outcome, 'won');
  // the Sanskrit result lists every verse heard this session (Kathā review rows), with no Latin
  const recited = new Map<string, number>(KEYS.map((k) => [k, 1]));
  const res = saResult(sessionResult(end, REAL), end, REAL, true, recited);
  assert.ok((res.review?.length ?? 0) >= 6, 'review rows');
  for (const row of res.review ?? []) assert.ok(!LATIN.test(`${row.sa}${row.en}${row.note ?? ''}`), `no Latin: ${JSON.stringify(row)}`);
});
