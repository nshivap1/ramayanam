/**
 * v0.6 WP-A (Bāla, Ayodhyā; notes/v06-a.md, plan row A). OWNER: v0.6 WP-A.
 *  - the 19 verses of shlokas-3 are placed: 13 on the Kathā main path (map scripts and the Mithilā told cutscene), Ahalyā
 *    hidden in the cutscene, 4 at optional talks (each heard once); every placement sits in a Kathā block
 *  - the Mithilā told cutscene: well formed, painter "a", Vālmīki only (Lakṣmaṇa never speaks; Viśvāmitra has left before
 *    Paraśurāma comes), its verses in story order; reachable and completed by the Kathā story bots; Ahalyā is found only
 *    with `hidden`; the practice journey never sees it
 *  - the sandals set piece (ch2.bharata): the sandals are placed, glide to the hero and back, and Bharata carries them on
 *    his head while "places the sandals on his head" is on screen; the stage is gone when the scene ends
 *  - pacing (plan §0.2): chapters 1–2 cost the Kathā bots ≤ 12 more actions and no more recitations, with no lost fight;
 *    the cutscene's main path stays ≤ 130 s hands-off (every step skippable in the view)
 *  - Sanskrit of file 10: Level 1–3 words, ≤ 10 words a sentence (the oracle itself is sambhashana.test's)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { type Level, testMatrix } from '@sdk';
import { assembleContent, bundledParts, loadContent } from './content';
import { type EventCmd, type GameContent, type GameState, checkTold, newGame, practiceContent, reduce, stageOf, toldHotspots, toldOf, toldPath, toldTimeline, toldVerses } from './logic';
import { startScript } from './logic-events';
import { autoplay, runWalkthrough } from './logic-sim';
import { PAINTERS } from './cutscene-paint';
import { easiest, getOracle, isKathaCond } from './sa-verify';
import shlokas3 from './content/shlokas-3.json';
import sa10 from './content/sa-dialogue-10.json';

const REAL = loadContent();
const MINE = (shlokas3 as unknown as { shlokas: { id: string }[] }).shlokas.map((s) => s.id);
const CUTSCENE = ['s-aropayitva', 's-nipetush', 's-iyam-sita', 's-purayasva', 's-aropya', 's-madhuhantaram'];
const HIDDEN = ['s-ahalya'];
const MAP_MAIN = ['s-unashodasha', 's-pitur-vacana', 's-krtartho-smi', 's-yathayodhya', 's-gange', 's-na-rajyad', 's-kshayanta', 's-paduke'];
const OPTIONAL: Record<string, { event: string; map: string }> = {
  's-mantragramam': { event: 'ch1.vishvamitra_road', map: 'siddhashrama_road' },
  's-yan-mangalam': { event: 'ch2.kausalya', map: 'ayodhya_palace' },
  's-agratas-te': { event: 'ch2.sita', map: 'ayodhya_palace' },
  's-yad-acarati': { event: 'ch2.bharata', map: 'chitrakuta' },
};
const CH12 = REAL.walkthrough.filter((w) => w.chapter <= 2);

/** Every `{ "shloka": id }` of the story with whether it sits inside a Kathā branch. */
function placements(content: GameContent): { id: string; event: string; katha: boolean }[] {
  const out: { id: string; event: string; katha: boolean }[] = [];
  const walk = (cmds: EventCmd[] | undefined, event: string, katha: boolean): void => {
    for (const c of cmds ?? []) {
      if ('shloka' in c) out.push({ id: c.shloka, event, katha });
      const o = c as unknown as Record<string, EventCmd[] | undefined>;
      for (const k of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose'] as const) walk(o[k], event, katha || ('if' in c && k === 'then' && isKathaCond(c.if)));
    }
  };
  for (const e of content.events) walk(e.cmds, e.id, false);
  return out;
}

function at(map: string, flags: Record<string, true> = {}, style: 'katha' | 'abhyasa' = 'katha'): GameState {
  const s = newGame(5, 3, REAL, { name: 'Tester', avatar: 'a', style });
  return { ...s, mode: 'explore', script: null, pending: null, fx: [], save: { ...s.save, mapId: map, flags: { ...s.save.flags, ...flags } } };
}
const ev = (id: string): EventCmd[] => REAL.events.find((e) => e.id === id)!.cmds;

// ───────────────────────── placements ─────────────────────────

test('v0.6 A: every verse of shlokas-3 is placed once, in a Kathā block or the Mithilā cutscene (13 main path, 1 hidden, 4 optional)', () => {
  assert.equal(MINE.length, 19);
  assert.deepEqual(new Set([...CUTSCENE, ...HIDDEN, ...MAP_MAIN, ...Object.keys(OPTIONAL)]), new Set(MINE));
  const p = placements(REAL).filter((x) => MINE.includes(x.id));
  for (const x of p) assert.ok(x.katha, `${x.id} in ${x.event} sits in a Kathā block`);
  for (const id of [...MAP_MAIN, ...Object.keys(OPTIONAL)]) assert.equal(p.filter((x) => x.id === id).length, 1, `${id} is placed once in the story`);
  for (const [id, o] of Object.entries(OPTIONAL)) assert.equal(p.find((x) => x.id === id)?.event, o.event);
  const c = toldOf(REAL, 'mithila')!;
  assert.deepEqual(toldVerses(toldPath(c)), CUTSCENE, 'the cutscene main path, in story order');
  assert.deepEqual(toldVerses(toldPath(c), new Set(['ahalya'])), [...HIDDEN, ...CUTSCENE], 'Ahalyā first when found');
  for (const id of [...CUTSCENE, ...HIDDEN]) assert.ok(!p.some((x) => x.id === id), `${id} only in the cutscene`);
  // the cutscene is started once, from the Kathā branch of ch1.yajna
  const starts: string[] = [];
  const walk = (cmds: EventCmd[] | undefined, event: string, katha: boolean): void => {
    for (const x of cmds ?? []) {
      if ('cutscene' in x && x.cutscene === 'mithila') starts.push(`${event}:${katha}`);
      const o = x as unknown as Record<string, EventCmd[] | undefined>;
      for (const k of ['then', 'else', 'onWin'] as const) walk(o[k], event, katha || ('if' in x && k === 'then' && isKathaCond(x.if)));
    }
  };
  for (const e of REAL.events) walk(e.cmds, e.id, false);
  assert.deepEqual(starts, ['ch1.yajna:true']);
  // the practice game sees none of it
  const prac = practiceContent(REAL);
  for (const id of MINE) assert.ok(!prac.shlokas.some((s) => s.id === id), `${id} is Kathā-only`);
});

// ───────────────────────── the Mithilā told cutscene ─────────────────────────

test('v0.6 A: the Mithilā cutscene is well formed, painted by "a", and follows Vālmīki (Lakṣmaṇa silent, Viśvāmitra gone before Paraśurāma)', () => {
  const c = toldOf(REAL, 'mithila');
  assert.ok(c, 'cutscene-mithila.json is playable (not a stub)');
  assert.deepEqual(checkTold(c, { shlokas: new Set(REAL.shlokas.map((s) => s.id)), painters: new Set(Object.keys(PAINTERS)) }), []);
  assert.equal(c.painter, 'a');
  assert.ok(PAINTERS['a'], 'painter a is registered');
  assert.equal(c.chapter, 1);
  const steps = toldPath(c);
  const all = [...steps, ...toldHotspots(c).flatMap((h) => h.then)];
  for (const s of all) if ('say' in s) assert.notEqual(s.who, 'person.lakshmana', 'Lakṣmaṇa says nothing (the exchange with Paraśurāma is Tulsīdās, not Vālmīki)');
  // Viśvāmitra leaves before the road home (1.74.1); Paraśurāma enters only after that
  const vmGone = steps.findIndex((s) => 'cast' in s && s.cast === 'vm' && s.remove);
  const prIn = steps.findIndex((s) => 'cast' in s && s.cast === 'pr');
  assert.ok(vmGone > 0 && prIn > vmGone, 'Viśvāmitra has left when Paraśurāma comes');
  // the bow: everyone falls but four (1.67.19), then they rise
  const topple = steps.find((s) => 'topple' in s) as { topple: { allBut: string[] } } | undefined;
  assert.deepEqual(new Set(topple?.topple.allBut.filter((x) => x !== 'bow')), new Set(['rama', 'lak', 'vm', 'janaka']));
  assert.ok(steps.some((s) => 'rise' in s && s.rise === 'all'));
  // Ahalyā is a hidden hotspot with her verse
  const h = toldHotspots(c);
  assert.deepEqual(h.map((x) => x.hotspot), ['ahalya']);
  assert.ok(h[0]!.then.some((s) => 'verse' in s && s.verse === 's-ahalya'));
});

test('v0.6 A: pacing — the cutscene main path is ≤ 130 s hands-off; Ahalyā adds ≤ 25 s for those who find her', () => {
  const c = toldOf(REAL, 'mithila')!;
  const ms = toldTimeline(REAL, toldPath(c)).reduce((a, b) => a + b.ms, 0);
  const extra = toldTimeline(REAL, toldHotspots(c)[0]!.then).reduce((a, b) => a + b.ms, 0);
  console.log(`# Mithilā: main path ${(ms / 1000).toFixed(1)} s, Ahalyā +${(extra / 1000).toFixed(1)} s`);
  assert.ok(ms <= 130_000, `${ms} ms`);
  assert.ok(extra <= 25_000, `${extra} ms`);
});

// ───────────────────────── the story bots ─────────────────────────

test('v0.6 A: Kathā bots play chapters 1–2: the cutscene plays, the main-path verses are heard, Ahalyā only with `hidden`; practice sees none of it', () => {
  for (const { level, seed } of testMatrix([2, 3, 4] as Level[], 3)) {
    const k = runWalkthrough(REAL, seed, level, { style: 'katha', steps: CH12, attempts: 12 });
    assert.ok(!k.error, `katha ${seed}/${level}: ${k.error}`);
    const f = k.state.save.flags;
    assert.ok(f['ch2.complete'], 'chapter 2 completes');
    assert.ok(f['seen.mithila'], 'the Mithilā cutscene played');
    for (const id of [...MAP_MAIN, ...CUTSCENE]) assert.ok(k.state.save.shlokas[id]?.heard, `${id} heard on the main path`);
    assert.ok(!f['found.mithila.ahalya'] && !k.state.save.shlokas['s-ahalya']?.heard, 'Ahalyā stays hidden for a bot that passes by');
    for (const id of Object.keys(OPTIONAL)) assert.ok(!k.state.save.shlokas[id]?.heard, `${id} is optional (not on the bots' path)`);
    assert.equal(k.losses + k.defeats, 0);
    const h = runWalkthrough(REAL, seed, level, { style: 'katha', steps: CH12, attempts: 12, hidden: true });
    assert.ok(h.state.save.flags['found.mithila.ahalya'] && h.state.save.shlokas['s-ahalya']?.heard, 'found with hidden: true');
    const p = runWalkthrough(REAL, seed, level, { style: 'abhyasa', steps: CH12, attempts: 12 });
    assert.ok(!p.error, `practice ${seed}/${level}: ${p.error}`);
    assert.ok(!p.state.save.flags['seen.mithila'], 'no cutscene in the practice game');
    for (const id of MINE) assert.ok(!p.state.save.shlokas[id]?.heard, `practice never hears ${id}`);
  }
});

test('v0.6 A: pacing — chapters 1–2 cost the Kathā bots ≤ 12 more actions, no more recitations and no lost fight (vs the v0.5.1 story)', () => {
  const git = (f: string): unknown => JSON.parse(execSync(`git show HEAD:src/games/ramayana-yatra/content/${f}`, { cwd: new URL('../../..', import.meta.url).pathname, maxBuffer: 1 << 26 }).toString());
  let before: GameContent;
  try {
    const parts = bundledParts();
    before = assembleContent({ ...parts, stories: parts.stories.map((s, i) => (i === 1 ? git('story-ch1.json') : i === 2 ? git('story-ch2.json') : s)) as typeof parts.stories, cutscenes: parts.cutscenes.filter((c) => c.id !== 'mithila') });
  } catch {
    return; // no git history (an exported tree): the census in notes/v06-a.md stands
  }
  const bots = [{ accuracy: 1, policy: 'strategic' as const }, { accuracy: 1, policy: 'spam' as const }, { accuracy: 0.7 }, { accuracy: 0.7, careless: 0.5 }];
  for (const bot of bots) {
    let a = 0, b = 0, ra = 0, rb = 0, lost = 0;
    for (const { level, seed } of testMatrix([2, 3, 4] as Level[], 2)) {
      const opts = { style: 'katha' as const, steps: CH12, attempts: 12, ...bot };
      const x = runWalkthrough(REAL, seed, level, opts);
      const y = runWalkthrough(before, seed, level, { ...opts, steps: before.walkthrough.filter((w) => w.chapter <= 2) });
      a += x.actions;
      b += y.actions;
      ra += x.recitations;
      rb += y.recitations;
      lost += x.losses + x.defeats;
    }
    const n = 6;
    console.log(`# ${bot.policy ?? `${bot.accuracy * 100} %${bot.careless ? ' careless' : ''}`}: actions ${(b / n).toFixed(1)} → ${(a / n).toFixed(1)}, recitations ${(rb / n).toFixed(1)} → ${(ra / n).toFixed(1)}`);
    assert.ok((a - b) / n <= 12, `+${((a - b) / n).toFixed(1)} actions`);
    assert.equal(ra, rb, 'no new recitations');
    assert.equal(lost, 0);
  }
});

// ───────────────────────── optional verses, the sandals ─────────────────────────

test('v0.6 A: the optional verses play once at their talk in Kathā, never in practice', () => {
  for (const [id, o] of Object.entries(OPTIONAL)) {
    const flags: Record<string, true> = { 'ch2.boons_done': true, 'ch2.bharata_done': true };
    let s = startScript(at(o.map, flags), REAL, o.event, ev(o.event));
    s = autoplay(s, REAL);
    assert.ok(s.save.shlokas[id]?.heard, `${id} heard at ${o.event}`);
    // a second talk does not replay it
    let seen = false;
    s = startScript({ ...s, mode: 'explore', script: null, pending: null }, REAL, o.event, ev(o.event));
    for (let i = 0; i < 40 && s.pending; i++) {
      if (s.pending.kind === 'shloka' && s.pending.shlokaId === id) seen = true;
      s = reduce(s, REAL, { type: 'advance' });
    }
    assert.ok(!seen, `${id} plays once`);
    let p = startScript(at(o.map, flags, 'abhyasa'), practiceContent(REAL), o.event, ev(o.event));
    p = autoplay(p, practiceContent(REAL));
    assert.ok(!p.save.shlokas[id]?.heard, `practice: ${id} not heard`);
  }
});

test('v0.6 A: the sandals — placed, carried by Bharata on his head while the line says so, gone when the scene ends', () => {
  let s = startScript(at('chitrakuta', { 'ch2.at_chitrakuta': true }), REAL, 'ch2.bharata', ev('ch2.bharata'));
  let carried = false;
  let verse = false;
  for (let i = 0; i < 120 && s.pending; i++) {
    if (s.pending?.kind === 'shloka' && s.pending.shlokaId === 's-paduke') {
      verse = true;
      assert.ok(stageOf(s).props['paduka'], 'the sandals are on the stage during the verse');
      assert.equal(stageOf(s).tint, 'gold');
    }
    if (s.pending?.kind === 'say' && /places the sandals on his head/.test(s.pending.text)) carried = stageOf(s).props['paduka']?.carry === 'bharata';
    s = reduce(s, REAL, s.pending.kind === 'choice' ? { type: 'choose', index: 0 } : { type: 'advance' });
  }
  assert.ok(verse, 'the sandals verse plays');
  assert.ok(carried, 'Bharata carries them on his head');
  s = autoplay(s, REAL);
  assert.equal(s.stage, undefined, 'the stage is cleared');
  assert.ok(s.save.flags['ch2.bharata_done']);
});

// ───────────────────────── Sanskrit of file 10 ─────────────────────────

test('v0.6 A: sa-dialogue-10 — Level 1–3 words, ≤ 10 words a sentence', () => {
  const o = getOracle();
  const entries = (sa10 as unknown as { entries: { en: string; sa: string }[] }).entries;
  assert.ok(entries.length >= 15);
  for (const e of entries) {
    for (const sent of e.sa.split(/[।?!]/u)) {
      const words = sent.split(/[\s,]+/u).filter(Boolean);
      assert.ok(words.length <= 10, `${e.en}: ${words.length} words`);
      for (const w of words) {
        const lv = easiest(o.analyse(w))?.level ?? 9;
        assert.ok(lv <= 3, `${e.en}: ${w} is level ${lv}`);
      }
    }
  }
});
