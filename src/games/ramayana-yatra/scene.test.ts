/**
 * v0.5b WP-A (notes/v05b-plan.md §2 scenes 1–4, §7 "A"; notes/v05b-a.md): the story set pieces of books 1–3 in Kathā.
 *  - Krauñca (Bāla 1.2): the hunter steps out, the struck bird is gone, Vālmīki turns; the player says pāda 0 (P1) —
 *    eight syllables with their laghu / guru weights (sceneMeter), coached as the first recitation of all
 *  - Guha's ferry (Ayodhyā 2.52): the four step into the boat and cross; Sītā prays mid-stream; the far bank
 *  - the golden deer (Araṇya 3.42–44): the deer's positions at each chase (a skipped trigger leaves no deer behind);
 *    the shadows; Mārīca's true form and his cry in Rāma's voice
 *  - Jaṭāyu (Araṇya 3.67–68): the question loop always ends (every order, misreads included; a misread changes nothing)
 *  - the practice journey sees none of it (same lines, flags and positions as before)
 *  - bots: the story bot (perfect and 70 %) plays books 1–3 of Kathā through every set piece, 25 seeds × L2–4
 * The practice hash is in logic.test.ts ("v0.5b guard"); the Sanskrit of the new lines is checked by sambhashana.test.ts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, testMatrix } from '@sdk';
import { loadContent } from './content';
import { type Action, type Dir, type GameState, firstRecitation, newGame, newMember, reduce, sceneMeter, visibleNpcs, withUnlockedMoves } from './logic';
import { startEvent } from './logic-events';
import { botActions, runWalkthrough } from './logic-sim';

const REAL = loadContent();
const LEVELS = [2, 3, 4] as const;

// ───────────────────────── helpers ─────────────────────────

/**
 * A calm state on `map` at (x, y): the walkthrough's flags before the first step on that map, earlier books complete,
 * the verses of the earlier books heard (and of this one when `heard`), the party at `level`; Kathā or practice.
 */
function at(chapter: number, map: string, x: number, y: number, facing: Dir, o: { katha: boolean; allies?: string[]; level?: number; flags?: string[]; heard?: boolean }): GameState {
  let s = newGame(5, 3, REAL, { name: 'Scene', avatar: 'a', ...(o.katha ? { style: 'katha' as const } : {}) });
  const flags: Record<string, true> = { ...s.save.flags };
  const k = REAL.walkthrough.findIndex((w) => w.chapter === chapter && w.map === map);
  for (const w of REAL.walkthrough.slice(0, Math.max(0, k))) flags[w.expectFlag] = true;
  for (let c = 1; c < chapter; c++) flags[`ch${c}.complete`] = true;
  for (const f of o.flags ?? []) flags[f] = true;
  const shlokas: GameState['save']['shlokas'] = {};
  for (const sh of REAL.shlokas) {
    if (sh.kanda > chapter || (sh.kanda === chapter && !o.heard)) continue;
    shlokas[sh.id] = { heard: true, restored: true, best: 1 };
    flags[`heard.${sh.id}`] = true;
    flags[`restored.${sh.id}`] = true;
  }
  const level = o.level ?? 12;
  const party = (o.allies ?? ['player']).map((id) => withUnlockedMoves(newMember(REAL.allies.find((a) => a.id === id)!, level, REAL), { shlokas }, REAL));
  s = { ...s, mode: 'explore', script: null, pending: null, fx: [], save: { ...s.save, chapter: chapter as GameState['save']['chapter'], mapId: map, x, y, facing, flags, shlokas, party, smrti: {} } };
  return s;
}

interface Seen {
  kind: string;
  text?: string;
  who?: string;
  flags: Set<string>;
  /** visible NPCs: id → "x,y" */
  npcs: Map<string, string>;
  player: string;
  map: string;
  state: GameState;
}

/**
 * Play the running script to calm (explore, nothing pending), recording every new pending. `choose` picks a choice
 * (default: the story bot's); `miss` answers a story recitation with a wrong chip. Battles: the story bot.
 */
function play(state: GameState, o: { choose?: (s: GameState, seen: Seen[]) => number; miss?: boolean; max?: number } = {}): { state: GameState; seen: Seen[] } {
  const seen: Seen[] = [];
  const ctx = { recited: false, rested: false, choices: new Map<string, number>() };
  let s = state;
  let last: unknown = null;
  for (let n = 0; n < (o.max ?? 4000); n++) {
    if (s.mode === 'explore' && !s.pending) return { state: s, seen };
    const p = s.pending;
    if (p && p !== last) {
      last = p;
      seen.push({
        kind: p.kind === 'challenge' ? `challenge:${p.context}` : p.kind,
        ...(p.kind === 'say' ? { text: p.text, ...(p.who ? { who: p.who } : {}) } : {}),
        flags: new Set(Object.keys(s.save.flags)),
        npcs: new Map(visibleNpcs(s, REAL).map((m) => [m.id, `${m.x},${m.y}`])),
        player: `${s.save.x},${s.save.y}`,
        map: s.save.mapId,
        state: s,
      });
    }
    let a: Action | undefined;
    if (p?.kind === 'choice' && o.choose) a = { type: 'choose', index: o.choose(s, seen) };
    else if (p?.kind === 'challenge' && p.context === 'scene' && o.miss) {
      const sp = p.challenge.smarana!;
      const wrong = (sp.gapOptions[0] ?? []).find((x) => !(sp.gapAnswers[0] ?? []).includes(x.id));
      a = { type: 'answer', picks: wrong ? [wrong.id] : [], timeMs: 900 };
    }
    const cands = a ? [a] : botActions(s, REAL, ctx);
    let next = s;
    for (const c of cands) {
      next = reduce(s, REAL, c);
      if (next !== s) break;
    }
    assert.notEqual(next, s, `no action applies: ${p?.kind ?? s.mode}`);
    s = next;
  }
  throw new Error('play: did not reach a calm state');
}

const sayAt = (seen: Seen[], re: RegExp): Seen => {
  const x = seen.find((e) => e.kind === 'say' && re.test(e.text ?? ''));
  assert.ok(x, `a say line matching ${re}`);
  return x;
};
const order = (seen: Seen[], pred: (e: Seen) => boolean): number => seen.findIndex(pred);
const golden = (e: Seen | GameState): string[] => {
  const npcs = 'npcs' in e ? [...e.npcs.keys()] : visibleNpcs(e, REAL).map((n) => n.id);
  const sprites = new Map(REAL.maps.find((m) => m.id === 'mriga_vana')!.npcs.map((n) => [n.id, n.sprite]));
  return npcs.filter((id) => sprites.get(id) === 'golden_deer').sort();
};

// ───────────────────────── 1. Krauñca ─────────────────────────

test('Krauñca (Kathā): the hunter steps out, the struck bird is gone, Vālmīki turns, then the player says pāda 0 — in that order; the scene ends as before', () => {
  const s0 = startEvent(at(1, 'tamasa_bank', 14, 7, 'down', { katha: true }), REAL, 'ch1.krauncha');
  const { state, seen } = play(s0);
  const arrow = sayAt(seen, /^Then a \{w:nishada\}/);
  assert.equal(arrow.npcs.get('hunter'), '7,9', 'the hunter has stepped out of the bushes');
  assert.ok(!arrow.npcs.has('krauncha_a') && arrow.npcs.has('krauncha_b'), 'the struck bird is gone, its mate is there');
  const birds = sayAt(seen, /^In a tree by the water/);
  assert.equal(birds.npcs.get('krauncha_a'), '21,9');
  assert.deepEqual([birds.state.save.npcPos['tamasa_bank/krauncha_a']?.facing, birds.state.save.npcPos['tamasa_bank/krauncha_b']?.facing], ['down', 'up'], 'the birds turn to each other as they sing');
  const pity = sayAt(seen, /^Valmiki's heart fills/);
  assert.equal(pity.state.save.npcPos['tamasa_bank/valmiki']?.facing, 'left', 'Vālmīki turns to the hunter');
  // the order: the arrow, the verse, "four quarters, eight syllables", then the player's line, then the palm-leaf book
  const iArrow = order(seen, (e) => e === arrow);
  const iVerse = order(seen, (e) => e.kind === 'shloka');
  const iFour = order(seen, (e) => /^Four quarters, eight syllables/.test(e.text ?? ''));
  const iSay = order(seen, (e) => e.text === 'Say the first quarter with me, {player}.');
  const iRec = order(seen, (e) => e.kind === 'challenge:scene');
  const iBook = order(seen, (e) => /^\{player\}, take this palm-leaf book/.test(e.text ?? ''));
  assert.ok(iArrow < iVerse && iVerse < iFour && iFour < iSay && iSay < iRec && iRec < iBook, `order ${[iArrow, iVerse, iFour, iSay, iRec, iBook]}`);
  const rec = seen[iRec]!.state.pending;
  assert.ok(rec?.kind === 'challenge' && rec.context === 'scene');
  const sp = rec.challenge.smarana!;
  assert.equal(sp.shlokaId, 's-ma-nishada');
  assert.equal(sp.pada, 0);
  assert.equal(sp.gaps.length, 1, 'one gap to fill (the first time: the last word)');
  assert.equal(sp.gaps[0], sp.chunks.length - 1);
  const meter = sceneMeter(sp);
  assert.equal(meter.syllables, 8, '"eight syllables in each"');
  assert.match(meter.weights, /^[LG]{8}$/, 'laghu / guru for each of the eight');
  assert.ok(firstRecitation(seen[iRec]!.state.save), "a new player's first recitation is coached");
  assert.ok(seen[iSay]!.flags.has('ch1.krauncha_fell'));
  // after: recorded like a shrine pāda; the scene ends as it did
  assert.equal(state.lastSmarana?.context, 'scene');
  assert.ok(state.save.flags['ch1.krauncha_seen']);
  assert.ok((state.save.smrti?.['s-ma-nishada:0']?.streak ?? 0) >= 1, 'the line counts toward its mastery');
  assert.ok(!firstRecitation(state.save), 'later recitations are not coached');
});

test('Krauñca (practice): the scene plays exactly as before — no hunter move, the bird stays until the scene ends, no recitation', () => {
  const s0 = startEvent(at(1, 'tamasa_bank', 14, 7, 'down', { katha: false }), REAL, 'ch1.krauncha');
  const { state, seen } = play(s0);
  assert.ok(!seen.some((e) => e.kind === 'move' || e.kind === 'challenge:scene'), 'no moves, no story recitation');
  assert.ok(seen.some((e) => e.kind === 'challenge:quiz'), "the practice game's question is still asked");
  assert.ok(!seen.some((e) => e.text === 'Say the first quarter with me, {player}.'));
  assert.equal(sayAt(seen, /^Then a \{w:nishada\}/).npcs.get('hunter'), '5,9');
  assert.ok(sayAt(seen, /^Then a \{w:nishada\}/).npcs.has('krauncha_a'));
  assert.ok(!state.save.flags['ch1.krauncha_fell'] && state.save.flags['ch1.krauncha_seen']);
  assert.deepEqual(state.save.npcPos, {}, 'nobody moved');
});

test('sceneMeter / firstRecitation: syllables and weights of a pāda; a weight list that does not line up is dropped; any learnt pāda ends the coaching', () => {
  const chunks = [{ text: 'मा', show: 'full' as const }, { text: 'निषाद', show: 'full' as const }];
  assert.deepEqual(sceneMeter({ chunks, weights: ['G', 'L', 'G', 'L'] }), { syllables: 4, weights: 'GLGL' });
  assert.deepEqual(sceneMeter({ chunks, weights: ['G', 'L'] }), { syllables: 4, weights: '' });
  assert.deepEqual(sceneMeter({ chunks }), { syllables: 4, weights: '' });
  assert.ok(firstRecitation({}));
  assert.ok(firstRecitation({ smrti: { 'a:0': { level: 0, streak: 0 } } }));
  assert.ok(!firstRecitation({ smrti: { 'a:0': { level: 0, streak: 1 } } }));
  assert.ok(!firstRecitation({ smrti: { 'a:0': { level: 2, streak: 0 } } }));
});

// ───────────────────────── 2. Guha's ferry ─────────────────────────

test('Guha’s ferry (Kathā): the four step into the boat side by side, cross a row, Sītā prays mid-stream, one more row, then the far bank; the boat is gone afterwards', () => {
  const s0 = startEvent(at(2, 'shringaverapura', 18, 12, 'down', { katha: true, flags: ['ch2.left_city'], allies: ['player', 'rama', 'lakshmana'] }), REAL, 'ch2.guha');
  const { state, seen } = play(s0);
  const row = sayAt(seen, /^Guha's boatmen row/);
  assert.equal(row.map, 'shringaverapura');
  assert.deepEqual([row.npcs.get('lakshmana_boat'), row.npcs.get('sita_boat'), row.npcs.get('rama_boat'), row.player], ['15,16', '16,16', '17,16', '18,16'], 'in the boat, side by side');
  assert.ok(row.npcs.has('guha'), 'Guha stays on the bank');
  const pray = sayAt(seen, /^Mother Ganga/);
  assert.equal(pray.who, 'person.sita');
  assert.deepEqual([pray.npcs.get('sita_boat'), pray.player], ['16,17', '18,17'], 'mid-stream');
  assert.ok(order(seen, (e) => /^In mid-stream Sita bows/.test(e.text ?? '')) < order(seen, (e) => e === pray));
  const far = sayAt(seen, /^On the far bank/);
  assert.ok(!far.npcs.has('sita_boat') && !far.flags.has('ch2.ferry_boat'), 'the boat scene is over before the far bank');
  // boarding: Sītā first, then Rāma, Lakṣmaṇa and you (four moves), then two rows of four
  const moves = seen.filter((e) => e.kind === 'move').map((e) => (e.state.pending as { who: string }).who);
  assert.deepEqual(moves, ['sita_boat', 'rama_boat', 'lakshmana_boat', 'player', ...Array(2).fill(['sita_boat', 'rama_boat', 'lakshmana_boat', 'player']).flat()]);
  assert.equal(state.save.mapId, 'chitrakuta');
  assert.ok(state.save.flags['ch2.ferried'] && !state.save.flags['ch2.ferry_boat']);
});

test('Guha’s ferry (practice): the same fade, lines and warp as before — no boat, no prayer', () => {
  const s0 = startEvent(at(2, 'shringaverapura', 18, 12, 'down', { katha: false, flags: ['ch2.left_city'], allies: ['player', 'rama', 'lakshmana'] }), REAL, 'ch2.guha');
  const { state, seen } = play(s0);
  assert.ok(!seen.some((e) => e.kind === 'move'), 'nobody moves');
  const i = order(seen, (e) => /^My boat is ready/.test(e.text ?? ''));
  assert.deepEqual(seen.slice(i, i + 4).map((e) => e.text ?? e.kind), ['My boat is ready. Let me take you across the Ganga.', 'fade', "Guha's boatmen row them across the wide, shining Ganga.", 'On the far bank, the sage Bharadvaja of Prayaga welcomes them and shows them the way to the hill of Chitrakuta.'], 'fade out, the two lines, as before');
  assert.equal(seen[i + 2]!.map, 'shringaverapura', 'no warp to the steps');
  assert.ok(!seen.some((e) => /^Mother Ganga|^In mid-stream/.test(e.text ?? '')));
  assert.equal(state.save.mapId, 'chitrakuta');
  assert.ok(state.save.flags['ch2.ferried'] && !state.save.flags['ch2.ferry_boat']);
});

// ───────────────────────── 3. The golden deer ─────────────────────────

const forest = (katha: boolean): GameState => at(3, 'mriga_vana', 1, 10, 'right', { katha, heard: true, allies: ['player', 'rama'], level: 16 });
const chase = (s: GameState, n: 1 | 2 | 3): { state: GameState; seen: Seen[] } => play(startEvent(s, REAL, `ch3.chase_${n}`));

test('the golden deer (Kathā): at each chase the deer bounds away and waits further on — (9,5) → gone, (14,15) → gone, (25,7) → gone; shadows at the third; then only the deer in the clearing', () => {
  let s = forest(true);
  assert.deepEqual(golden(s), ['deer_far', 'deer_glimpse_1']);
  const c1 = chase(s, 1);
  assert.equal(sayAt(c1.seen, /^A flash of gold/).npcs.get('deer_glimpse_1'), '13,12', 'it bounded away (and the line follows)');
  assert.ok(c1.seen.some((e) => e.kind === 'move'), 'the deer runs');
  s = c1.state;
  assert.deepEqual(golden(s), ['deer_far', 'deer_k2']);
  assert.equal(visibleNpcs(s, REAL).find((n) => n.id === 'deer_k2')?.x, 14);
  const c2 = chase(s, 2);
  assert.equal(sayAt(c2.seen, /^The deer stops and looks back/).npcs.get('deer_k2'), '14,15', 'it waits, looking back, while the line is read');
  s = c2.state;
  assert.deepEqual(golden(s), ['deer_far', 'deer_k3']);
  const c3 = chase(s, 3);
  const strange = sayAt(c3.seen, /^The forest grows strange/);
  assert.deepEqual(golden(strange), ['deer_far', 'deer_k3', 'shadow_a', 'shadow_b', 'shadow_c'], 'shadow deer all around');
  s = c3.state;
  assert.deepEqual(golden(s), ['deer_far'], 'only the deer in the clearing');
  assert.ok(['ch3.chase_1', 'ch3.chase_2', 'ch3.chase_3'].every((f) => s.save.flags[f]) && !s.save.flags['ch3.deer_shadows']);
  assert.equal(s.save.objective, 'Catch up with the golden deer at the far end of the forest.');
});

test('the golden deer (Kathā): a skipped trigger leaves no deer behind — chase 3 first clears them all; a late chase 1 or 2 moves nothing', () => {
  let s = forest(true);
  const c3 = chase(s, 3);
  assert.ok(!c3.seen.some((e) => e.kind === 'move'), 'no deer to move');
  s = c3.state;
  assert.deepEqual(golden(s), ['deer_far']);
  for (const n of [1, 2] as const) {
    const late = chase(s, n);
    assert.ok(!late.seen.some((e) => e.kind === 'move' || e.kind === 'wait'), `chase ${n} later: nothing moves`);
    s = late.state;
    assert.deepEqual(golden(s), ['deer_far']);
  }
  // chase 2 straight after the start: the first deer goes, the third waits
  const c2 = chase(forest(true), 2);
  assert.deepEqual(golden(c2.state), ['deer_far', 'deer_k3']);
});

test('the golden deer (practice): the chase lines and flags as before — no deer moves, no Kathā deer, no shadows', () => {
  let s = forest(false);
  for (const n of [1, 2, 3] as const) {
    const c = chase(s, n);
    assert.deepEqual(c.seen.map((e) => e.kind), ['say'], `chase ${n}: one line`);
    s = c.state;
    assert.ok(s.save.flags[`ch3.chase_${n}`]);
  }
  assert.deepEqual(golden(s), ['deer_far']);
  assert.deepEqual(s.save.npcPos, {});
  assert.ok(!s.save.flags['ch3.deer_shadows']);
});

test('Mārīca (Kathā): after the fight the deer falls and Mārīca lies there in his true form; his cry is its own line, in Rāma’s voice; the story goes on as before. Practice: the one line as before', () => {
  const k = play(startEvent(forest(true), REAL, 'ch3.maricha_deer'));
  const fell = sayAt(k.seen, /^Struck by Rama's arrow, the deer falls/);
  assert.ok(fell.npcs.has('maricha_true') && !fell.npcs.has('deer_far'), 'the deer is gone, the rākṣasa lies there');
  const cry = sayAt(k.seen, /^"Ha Sita! Ha Lakshmana!"$/);
  assert.equal(cry.who, "Maricha, in Rama's voice");
  assert.equal((cry.state.pending as { portrait?: string }).portrait, 'rama', "Rāma's face, Mārīca's voice");
  const dies = sayAt(k.seen, /^Then Maricha dies/);
  assert.ok(!dies.npcs.has('maricha_true'), 'gone when he dies');
  const iRama = order(k.seen, (e) => /^Lakshmana was right/.test(e.text ?? ''));
  assert.ok(order(k.seen, (e) => e === fell) < order(k.seen, (e) => e === cry) && order(k.seen, (e) => e === cry) < order(k.seen, (e) => e === dies) && order(k.seen, (e) => e === dies) < iRama);
  assert.ok(k.state.save.flags['ch3.maricha_defeated'] && k.state.save.mapId === 'panchavati');
  const p = play(startEvent(forest(false), REAL, 'ch3.maricha_deer'));
  assert.ok(sayAt(p.seen, /^Struck by Rama's arrow, Maricha takes his true form\. With his last breath/));
  assert.ok(!p.seen.some((e) => e.text === '"Ha Sita! Ha Lakshmana!"' || /^Then Maricha dies/.test(e.text ?? '')));
  assert.ok(!p.state.save.flags['ch3.deer_fell']);
});

// ───────────────────────── 4. Jaṭāyu ─────────────────────────

const glade = (katha: boolean): GameState => startEvent(at(3, 'jatayu_glade', 14, 8, 'down', { katha, heard: true, allies: ['player', 'rama', 'lakshmana'], flags: ['ch3.maricha_defeated'] }), REAL, 'ch3.jatayu');
const WHO = 'Who took Sita?';
const WAY = 'Which way did he take her?';
const MISS = 'Who are you?';

/** Play Jaṭāyu's scene picking the replies `picks` (by label) in turn; the record of questions offered. */
function jatayu(picks: string[]): { state: GameState; seen: Seen[]; offered: string[][] } {
  const offered: string[][] = [];
  let i = 0;
  const r = play(glade(true), {
    choose: (s) => {
      const p = s.pending as Extract<GameState['pending'], { kind: 'choice' }>;
      offered.push([...p!.options]);
      const want = picks[i++] ?? p!.options[0]!;
      const at = p!.options.indexOf(want);
      assert.ok(at >= 0, `"${want}" is offered (${p!.options.join(' | ')})`);
      return at;
    },
  });
  return { ...r, offered };
}

test('Jaṭāyu (Kathā): ask who took her and which way, in either order; a misread question gets only a gasp and the question again (no flag changes); each answer leaves the menu; then his last words', () => {
  for (const picks of [[WHO, WAY], [WAY, WHO], [MISS, WHO, WAY], [WHO, MISS, WAY], [WAY, MISS, MISS, WHO], [MISS, MISS, WAY, MISS, WHO]]) {
    const { state, seen, offered } = jatayu(picks);
    const tag = picks.join(' → ');
    assert.ok(state.save.flags['ch3.jatayu_done'], `${tag}: the scene ends`);
    assert.equal(offered.length, picks.length, `${tag}: one question per pick`);
    // the menu: all three until one is answered, then the other and the misread
    let asked = 0;
    offered.forEach((opts, k) => {
      assert.deepEqual(opts, asked === 0 ? [WHO, WAY, MISS] : picks.slice(0, k).includes(WHO) ? [WAY, MISS] : [WHO, MISS], `${tag}: menu ${k}`);
      if (picks[k] !== MISS) asked++;
    });
    const lines = seen.filter((e) => e.kind === 'say').map((e) => e.text);
    assert.equal(lines.filter((t) => t === 'Ravana. The king of the rakshasas.').length, 1, `${tag}: who, once`);
    assert.equal(lines.filter((t) => t === 'Through the sky... to the south.').length, 1, `${tag}: which way, once`);
    assert.equal(lines.filter((t) => t === 'Jatayu only gasps. His breath is almost gone.').length, picks.filter((p) => p === MISS).length, `${tag}: a gasp per misread`);
    assert.ok(!lines.includes('It was Ravana. He took Sita in his flying chariot and flew south. I broke his chariot and fought him with all my strength.'), 'not the practice line');
    const last = lines.indexOf('But I am old, and he struck me down. She cried out your name, Rama. Go south. You will find her.');
    assert.ok(last > lines.lastIndexOf('Ravana. The king of the rakshasas.') && last > lines.lastIndexOf('Through the sky... to the south.'), `${tag}: his last words come after both answers`);
    // a misread changes no flag: the flags at the gasp equal those at the question before it
    seen.forEach((e, k) => {
      if (e.text !== 'Jatayu only gasps. His breath is almost gone.') return;
      const q = seen.slice(0, k).reverse().find((x) => x.kind === 'choice')!;
      assert.deepEqual([...e.flags].sort(), [...q.flags].sort(), `${tag}: the misread changes nothing`);
    });
  }
});

test('Jaṭāyu (Kathā): any sequence of replies ends the scene (random replies, 200 runs); the story bot ends it too', () => {
  const rng = createRng(77);
  for (let run = 0; run < 200; run++) {
    const r = play(glade(true), { choose: (s) => rng.int((s.pending as { options: string[] }).options.length), max: 3000 });
    assert.ok(r.state.save.flags['ch3.jatayu_done'], `run ${run}`);
  }
  assert.ok(play(glade(true)).state.save.flags['ch3.jatayu_done'], 'the story bot (pickChoice) ends it');
});

test('Jaṭāyu (practice): his two lines as before; no questions', () => {
  const { state, seen } = play(glade(false));
  assert.ok(!seen.some((e) => e.kind === 'choice'));
  const lines = seen.filter((e) => e.kind === 'say').map((e) => e.text ?? '');
  const a = lines.indexOf('It was Ravana. He took Sita in his flying chariot and flew south. I broke his chariot and fought him with all my strength.');
  assert.ok(a >= 0 && lines[a + 1]?.startsWith('But I am old'));
  assert.ok(state.save.flags['ch3.jatayu_done'] && !state.save.flags['ch3.jatayu_who']);
});

// ───────────────────────── bots ─────────────────────────

test('bots: the Kathā story bot (perfect and 70 % reciters) plays books 1–3 through every set piece, 25 seeds × L2–4 — each scene’s flags in order, the boat scene closed, no error', (t) => {
  const steps = REAL.walkthrough.filter((w) => w.chapter <= 3);
  const FLAGS = ['ch1.krauncha_fell', 'ch1.krauncha_seen', 'ch2.ferry_boat', 'ch2.ferried', 'ch3.chase_3', 'ch3.deer_fell', 'ch3.maricha_dead', 'ch3.maricha_defeated', 'ch3.jatayu_done', 'ch3.complete'];
  const problems: string[] = [];
  let losses = 0;
  let scenes = 0;
  for (const accuracy of [1, 0.7]) {
    for (const { level, seed } of testMatrix(LEVELS, 25)) {
      const when = new Map<string, number>();
      let n = 0;
      let lostInMine = '';
      const r = runWalkthrough(REAL, seed, level, {
        style: 'katha',
        accuracy,
        attempts: 12,
        steps,
        onAction: (b, _a, nx) => {
          n++;
          for (const f of FLAGS) if (nx.save.flags[f] && !when.has(f)) when.set(f, n);
          if (b.pending?.kind === 'challenge' && b.pending.context === 'scene') scenes++;
          // the set pieces hold no fight of their own; the deer fight (ch3.maricha_deer) is the only battle in them
          if (b.mode === 'battle' && nx.mode !== 'battle' && b.battle?.phase === 'lost' && b.script?.eventId === 'ch3.maricha_deer') lostInMine = 'the deer fight';
        },
      });
      const tag = `${accuracy === 1 ? 'perfect' : '70 %'} seed ${seed} L${level}`;
      losses += r.losses;
      if (r.error) problems.push(`${tag}: ${r.error}`);
      if (lostInMine) problems.push(`${tag}: lost ${lostInMine}`);
      const times = FLAGS.map((f) => when.get(f) ?? -1);
      if (times.some((x) => x < 0)) problems.push(`${tag}: flags never set: ${FLAGS.filter((f) => !when.has(f)).join(', ')}`);
      else if (times.some((x, i) => i > 0 && x < times[i - 1]!)) problems.push(`${tag}: flags out of order ${times.join(',')}`);
      if (r.state.save.flags['ch2.ferry_boat'] || r.state.save.flags['ch3.deer_shadows']) problems.push(`${tag}: a scene flag left set`);
      if (problems.length > 4) break;
    }
  }
  t.diagnostic(`150 runs of books 1–3: ${scenes} story recitations, ${losses} lost fights in all (the census in katha.test.ts holds every fight to 0)`);
  assert.deepEqual(problems, []);
  assert.equal(scenes, 150, 'one story recitation (the Krauñca line) per run');
});
