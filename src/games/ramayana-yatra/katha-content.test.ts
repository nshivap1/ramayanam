/**
 * Kathā content gate (OWNER: kc-content). Spec: notes/katha.md → Content.
 *
 * content/katha.json:
 *  - `verses`: one entry per verse; anvaya = every pada-ccheda form (`words[].form`) exactly once, reordered, plus implied
 *    words in [brackets] that verify with the oracle; सरलार्थः = 1–4 short sentences that verify word by word.
 *  - `astras`: exactly the verse-bound moves of defs.json, each bound to a pāda of its own verse that prints as ≥ 2
 *    chunks and has a chunk that is not the astra's name (the gap); no two astras share a pāda.
 * Story: the Sambhāṣaṇa choices in Kathā-only blocks (`{ "if": "style.katha", "then": [...] }`) — 2–3 replies, exactly
 * one reply continues the story, every misread reply gets an answer and returns to the question, nothing in the block
 * changes the game (no flags, items, battles, quizzes, sfx); the practice game never sees them. Their Sanskrit (file 5)
 * is verified by sambhashana.test.ts.
 * v0.4.1 Kathā wording: a line that describes the practice game's mechanics sits in a practice-only block
 * (`{ "if": "!style.katha", "then": [...] }`, say lines only, its lines keep their files 1–3) with its Kathā wording in a
 * Kathā-only block beside it; Kathā never meets a practice-only block and the practice game never meets a Kathā one
 * (also checked on the story bot's walkthrough in both styles); no line the player can meet in Kathā, and no move
 * description shown in Kathā (`katha.json → moveText`), describes practice mechanics (PRACTICE_WORDING).
 * v0.5b (WP-C, for every package's set pieces; notes/v05b-plan.md §0): a Kathā block may hold any story command that
 * world.test validates (flags, warps, battles, P1 `smarana`, P2 `book`, P5 `setu` …) — the v0.4 "nothing changes the
 * game" rule now binds the choice conversations only (the replies set no flag, a misread changes nothing and returns to
 * the question); a Kathā line's Sanskrit lives where collectStoryStrings puts it (file 5 for the lines it held at
 * v0.5a, files 6–9 for new ones), or with the practice line it shares. Rāvaṇa waits for package E's Āditya-hṛdayam
 * cutscene (`seen.aditya`): until logic-cutscene.ts exists the story bots here play with that gate lifted.
 * This file holds no Sanskrit beyond the checkers' self-test inputs (all deliberately broken copies of real content).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from './content';
import { reduce } from './logic';
import { startScript } from './logic-events';
import { newGame } from './logic-state';
import { runWalkthrough } from './logic-sim';
import { existsSync } from 'node:fs';
import { anvayaToken, checkKathaAstras, checkKathaVerses, collectStoryStrings, getOracle, isKathaCond, isPracticeCond, padaChunks, sentencesOf, type KathaCheckInput } from './sa-verify';
import { autoplay } from './logic-sim';
import type { EventCmd, GameContent, GameState, KathaContent } from './types';

const REAL: GameContent = loadContent();
/**
 * The content the story bots play: REAL, or — until package E's cutscene module (logic-cutscene.ts, which sets
 * seen.aditya in the Rāvaṇa fight, and its bot hook) exists — REAL with the boss phases' story-flag gate lifted.
 */
const STORY: GameContent = existsSync(new URL('./logic-cutscene.ts', import.meta.url))
  ? REAL
  : { ...REAL, katha: { ...(REAL.katha as KathaContent), tactics: { ...REAL.katha!.tactics!, phases: (REAL.katha!.tactics!.phases ?? []).map((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'requires')) as typeof p) } } };
const KATHA = REAL.katha as KathaContent;
const input = (katha: KathaContent | undefined = KATHA): KathaCheckInput => ({ katha, shlokas: REAL.shlokas, moves: REAL.moves, names: REAL.names });
const clone = (): KathaContent => JSON.parse(JSON.stringify(KATHA)) as KathaContent;
const fail = (problems: string[]): string => `${problems.length} problem(s):\n  ${problems.slice(0, 60).join('\n  ')}`;

// ───────────────────────── katha.json: verses ─────────────────────────

test('katha: katha.json is loaded with an entry for every verse and a binding for every verse-bound move', () => {
  assert.ok(KATHA, 'content.katha is loaded');
  assert.equal(KATHA.verses.length, REAL.shlokas.length, 'one verse entry per verse');
  assert.deepEqual(new Set(KATHA.verses.map((v) => v.shlokaId)), new Set(REAL.shlokas.map((s) => s.id)));
  const bound = REAL.moves.filter((m) => m.unlockShloka).map((m) => m.id);
  assert.deepEqual(new Set(KATHA.astras.map((a) => a.moveId)), new Set(bound));
  assert.equal(KATHA.astras.length, bound.length);
});

test('katha: every anvaya is a permutation of its verse’s forms (+ verified [implied] words); every सरलार्थः verifies', () => {
  const problems = checkKathaVerses(input());
  assert.deepEqual(problems, [], fail(problems));
  // report (informational): implied words and sentence counts
  const implied = KATHA.verses.flatMap((v) => v.anvaya.filter((t) => anvayaToken(t).implied));
  const sents = KATHA.verses.map((v) => sentencesOf(v.saralarthah).length);
  console.log(`# anvaya: ${KATHA.verses.length} verses, implied words: ${implied.join(' ') || 'none'} · सरलार्थः sentences: ${Math.min(...sents)}–${Math.max(...sents)}`);
});

test('katha: the verse checker catches a broken anvaya or सरलार्थः (self-test)', () => {
  const at = (k: KathaContent, id: string) => k.verses.find((v) => v.shlokaId === id)!;
  const expect = (mutate: (k: KathaContent) => void, re: RegExp): void => {
    const k = clone();
    mutate(k);
    const p = checkKathaVerses(input(k));
    assert.ok(p.some((x) => re.test(x)), `expected ${re}, got:\n  ${p.join('\n  ')}`);
  };
  const sh = REAL.shlokas.find((s) => s.id === 's-ramam-dasharatham')!;
  expect((k) => void at(k, sh.id).anvaya.pop(), /not a permutation.*missing/);
  expect((k) => void at(k, sh.id).anvaya.push(sh.words[0]!.form), /not a permutation.*not in the verse/);
  expect((k) => void (at(k, sh.id).anvaya = sh.words.map((w) => w.form)), /keeps the verse's own order/);
  expect((k) => void at(k, sh.id).anvaya.push(`[${sh.padas[0]!.split(' ')[0]!}क्ष]`), /implied word .* does not verify/);
  expect((k) => void at(k, sh.id).anvaya.push(sh.padas[0]!), /one word without spaces/);
  // a sandhi-joined print form is not a verified word in a सरलार्थः
  const joined = sh.padas[2]!.split(' ')[0]!; // a sandhi-joined chunk of pāda 3
  expect((k) => void (at(k, sh.id).saralarthah = `${sh.padas[2]!}।`), new RegExp(`saralarthah: unknown word "${joined}"`, 'u'));
  expect((k) => void (at(k, sh.id).saralarthah = at(k, sh.id).saralarthah.replace(/।$/u, '')), /saralarthah: must end with/);
  expect((k) => void (at(k, sh.id).saralarthah = Array.from({ length: 5 }, () => at(k, sh.id).saralarthah.split('।')[0]!.trim() + '।').join(' ')), /5 sentences/);
  expect((k) => void k.verses.splice(0, 1), /no entry for verse/);
  expect((k) => void k.verses.push({ ...k.verses[0]! }), /duplicate entry/);
});

// ───────────────────────── katha.json: astras ─────────────────────────

test('katha: astras bind real moves to a ≥ 2-chunk pāda of their own verse, with a gap that is not the astra’s name', () => {
  const problems = checkKathaAstras(input());
  assert.deepEqual(problems, [], fail(problems));
  const sh = new Map(REAL.shlokas.map((s) => [s.id, s]));
  for (const a of KATHA.astras) console.log(`# ${a.moveId.padEnd(14)} → ${a.shlokaId} pāda ${a.pada}: ${padaChunks(sh.get(a.shlokaId)!, a.pada).join(' · ')}`);
});

test('katha: the astra checker catches a bad binding (self-test)', () => {
  const expect = (mutate: (k: KathaContent) => void, re: RegExp): void => {
    const k = clone();
    mutate(k);
    const p = checkKathaAstras(input(k));
    assert.ok(p.some((x) => re.test(x)), `expected ${re}, got:\n  ${p.join('\n  ')}`);
  };
  const find = (k: KathaContent, id: string) => k.astras.find((a) => a.moveId === id)!;
  // s-aditya-hrdayam pāda 1 (सर्वशत्रुविनाशनम्) is one chunk
  expect((k) => void (find(k, 'brahmastra').pada = 1), /is one chunk/);
  expect((k) => void (find(k, 'brahmastra').pada = 0), /already bound to aditya_hrdaya/);
  expect((k) => void (find(k, 'viddhi').shlokaId = 's-ramo-vigrahavan'), /not the move's own verse/);
  expect((k) => void (find(k, 'viddhi').pada = 4), /is not a pāda/);
  expect((k) => void k.astras.splice(0, 1), /has no binding/);
  expect((k) => void k.astras.push({ moveId: 'no_such_move', shlokaId: 's-ma-nishada', pada: 1 }), /unknown move/);
  const plain = REAL.moves.find((m) => !m.unlockShloka)!;
  expect((k) => void k.astras.push({ moveId: plain.id, shlokaId: 's-ma-nishada', pada: 1 }), /no unlockShloka/);
  // a pāda whose every chunk contains the astra's name has no possible gap: dharma_vigraha on a fake verse
  const fake = { ...REAL.shlokas.find((s) => s.id === 's-ramo-vigrahavan')! };
  fake.padas = [...fake.padas];
  fake.padas[1] = 'विग्रहवान्धर्मः धर्मः'; // dharma_vigraha is bound to pāda 1
  const p = checkKathaAstras({ ...input(), shlokas: REAL.shlokas.map((s) => (s.id === fake.id ? fake : s)) });
  assert.ok(p.some((x) => /nothing can be the gap/.test(x)), p.join('\n'));
});

// ───────────────────────── story: Kathā choices ─────────────────────────

interface KBlock {
  event: string;
  then: EventCmd[];
}

/** Every Kathā-only branch in the real story (depth-first): the `then` of `style.katha`, the `else` of `!style.katha`. */
function kathaBlocks(): KBlock[] {
  const out: KBlock[] = [];
  const walk = (cmds: EventCmd[] | undefined, event: string): void => {
    for (const c of cmds ?? []) {
      if ('if' in c && isKathaCond(c.if)) out.push({ event, then: c.then });
      if ('if' in c && isPracticeCond(c.if) && c.else) out.push({ event, then: c.else });
      for (const k of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose'] as const) walk((c as unknown as Record<string, EventCmd[] | undefined>)[k], event);
    }
  };
  for (const e of REAL.events) walk(e.cmds, e.id);
  return out;
}

interface PBlock extends KBlock {
  /** the command list that holds the block, and its index there */
  list: EventCmd[];
  at: number;
}

/** Every practice-only block in the real story (`{ "if": "!style.katha", "then": [...] }`, v0.4.1), depth-first. */
function practiceBlocks(): PBlock[] {
  const out: PBlock[] = [];
  const walk = (cmds: EventCmd[] | undefined, event: string): void => {
    (cmds ?? []).forEach((c, at) => {
      if ('if' in c && isPracticeCond(c.if)) out.push({ event, then: c.then, list: cmds!, at });
      for (const k of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose'] as const) walk((c as unknown as Record<string, EventCmd[] | undefined>)[k], event);
    });
  };
  for (const e of REAL.events) walk(e.cmds, e.id);
  return out;
}

const BLOCKS = kathaBlocks();
const CHOICE_BLOCKS = BLOCKS.filter((b) => b.then.some((c) => 'choice' in c));

/** Story lines (say, choice prompts and replies) outside every Kathā-only branch: the lines the practice game shares. */
function sharedLines(): Set<string> {
  const out = new Set<string>();
  const walk = (cmds: EventCmd[] | undefined): void => {
    for (const c of cmds ?? []) {
      if ('say' in c) out.add(c.say);
      if ('choice' in c) [c.choice, ...c.options.map((o) => o.label)].forEach((x) => out.add(x));
      const o = c as unknown as Record<string, EventCmd[] | undefined>;
      const katha = 'if' in c && isKathaCond(c.if);
      const practice = 'if' in c && isPracticeCond(c.if);
      for (const k of ['then', 'else', 'onCorrect', 'onWrong', 'onWin', 'onLose'] as const) {
        if ((k === 'then' && katha) || (k === 'else' && practice)) continue;
        walk(o[k]);
      }
    }
  };
  for (const e of REAL.events) walk(e.cmds);
  return out;
}
const SHARED = sharedLines();

/** Every command kind of the story language (types.ts EventCmd; world.test validates each one's references). */
const EVENT_KINDS = new Set(['say', 'shloka', 'choice', 'label', 'goto', 'if', 'set', 'unset', 'give', 'take', 'niska', 'learn', 'quiz', 'battle', 'join', 'leave', 'heal', 'rest', 'shrine', 'warp', 'move', 'face', 'wait', 'fade', 'music', 'sfx', 'shop', 'save', 'chapter', 'objective', 'end', 'smarana', 'book', 'setu',
  // v0.6 Kathā-only kit and cutscene commands (validated in world.test)
  'fx', 'topple', 'rise', 'grow', 'glow', 'prop', 'arrow', 'hotspot', 'cutscene', 'echo']);

test('katha: about ten scenes carry a Sambhāṣaṇa choice in a Kathā-only block', () => {
  console.log(`# Kathā choices in: ${CHOICE_BLOCKS.map((b) => b.event).join(', ')}`);
  assert.ok(CHOICE_BLOCKS.length >= 8, `${CHOICE_BLOCKS.length} Kathā choice scenes (want about 10)`);
  assert.equal(new Set(CHOICE_BLOCKS.map((b) => b.event)).size, CHOICE_BLOCKS.length, 'one choice block per scene');
});

test('katha: choice blocks are well formed — 2–3 replies, one continues, misreads answer and return; a reply changes nothing; Kathā blocks hold story commands only', () => {
  // v0.4: say / choice / label / goto (+ objective, v0.4.3). v0.5b: the set pieces of every package put any story command
  // in a Kathā block (flags, warps, battles, smarana, book, setu …; world.test validates each); the choice
  // conversations keep their form, and a reply never sets a flag (checked below and in "each choice block plays")
  const problems: string[] = [];
  for (const b of BLOCKS) {
    const where = `${b.event} (Kathā block)`;
    for (const c of b.then) {
      const key = Object.keys(c).find((k) => EVENT_KINDS.has(k));
      if (!key) problems.push(`${where}: command ${JSON.stringify(c).slice(0, 60)} is not a story command`);
      if ('say' in c && /\b(wrong|incorrect)\b/i.test(c.say)) problems.push(`${where}: "${c.say}" sounds like a verdict (no "wrong" stamp)`);
    }
    const labelAt = new Map<string, number>();
    b.then.forEach((c, i) => {
      if ('label' in c) labelAt.set(c.label, i);
    });
    b.then.forEach((c, i) => {
      if (!('choice' in c)) return;
      const n = c.options.length;
      if (n < 2 || n > 3) problems.push(`${where}: choice "${c.choice}" has ${n} replies (2–3)`);
      const free = c.options.filter((o) => !o.goto);
      if (free.length !== 1) problems.push(`${where}: choice "${c.choice}" needs exactly one reply that continues the story (no goto), has ${free.length}`);
      if (c.options.some((o) => o.set)) problems.push(`${where}: a Kathā reply must not set flags`);
      const before = b.then[i - 1];
      const ask = before && 'label' in before ? before.label : null;
      if (!ask) problems.push(`${where}: choice "${c.choice}" must follow its own {label} (misreads return there)`);
      for (const o of c.options) {
        if (!o.goto) continue;
        const at = labelAt.get(o.goto);
        if (at === undefined) {
          problems.push(`${where}: reply "${o.label}" goes to a label outside the block`);
          continue;
        }
        // the misread branch: one or more say lines, then goto back to the question
        let j = at + 1;
        let says = 0;
        while (j < b.then.length && 'say' in b.then[j]!) (j++, says++);
        const back = b.then[j];
        if (says === 0) problems.push(`${where}: misread reply "${o.label}" gets no in-character answer`);
        if (!back || !('goto' in back) || back.goto !== ask) problems.push(`${where}: misread reply "${o.label}" must return to the question (goto "${ask ?? '?'}")`);
      }
    });
  }
  assert.deepEqual(problems, [], fail(problems));
});

/** A fresh explore state on the real content, with or without the Kathā flag. */
function fresh(katha: boolean): GameState {
  const s = newGame(7, 3, REAL, { name: 'Tester', avatar: 'a' });
  const flags = { ...s.save.flags };
  if (katha) flags['style.katha'] = true;
  else delete flags['style.katha'];
  return { ...s, mode: 'explore', script: null, pending: null, save: { ...s.save, flags } };
}

test('katha: each choice block plays — misreads loop back to the question, the story reply continues, then the block ends', () => {
  for (const b of CHOICE_BLOCKS) {
    const block: EventCmd = { if: 'style.katha', then: b.then };
    const choice = b.then.find((c): c is Extract<EventCmd, { choice: string }> => 'choice' in c)!;
    // (v0.5b set pieces may tell a few lines, or show a verse, before the question)
    let s0 = startScript(fresh(true), REAL, `test.${b.event}`, [block]);
    for (let k = 0; k < 20 && s0.pending && ['say', 'shloka', 'words', 'title'].includes(s0.pending.kind); k++) s0 = reduce(s0, REAL, { type: 'advance' });
    assert.deepEqual(s0.pending, { kind: 'choice', prompt: choice.choice, options: choice.options.map((o) => o.label) }, `${b.event}: the question is asked`);
    choice.options.forEach((o, i) => {
      if (!o.goto) return;
      let s = reduce(s0, REAL, { type: 'choose', index: i });
      assert.equal(s.pending?.kind, 'say', `${b.event}: misread reply ${i} gets an answer`);
      for (let k = 0; k < 5 && s.pending?.kind === 'say'; k++) s = reduce(s, REAL, { type: 'advance' });
      assert.deepEqual(s.pending, s0.pending, `${b.event}: after misread reply ${i} the question is asked again`);
      assert.deepEqual(s.save.flags, s0.save.flags, `${b.event}: a misread changes no flag`);
    });
    const right = choice.options.findIndex((o) => !o.goto);
    let s = reduce(s0, REAL, { type: 'choose', index: right });
    // (v0.5b: a set piece may go on after the reply — a recitation, a book review, a warp …: the bot plays it out)
    s = autoplay(s, STORY);
    assert.equal(s.pending, null, `${b.event}: the block ends after the story reply`);
    assert.equal(s.mode, 'explore', `${b.event}: control returns to the player`);
  }
});

test('katha: the practice game never sees a Kathā block (style.katha unset: the block is skipped)', () => {
  for (const b of BLOCKS) {
    const s = startScript(fresh(false), REAL, `test.${b.event}`, [{ if: 'style.katha', then: b.then }]);
    assert.equal(s.pending, null, `${b.event}: no pending without the Kathā flag`);
    assert.equal(s.mode, 'explore', b.event);
  }
});

// ───────────────────────── story: Kathā wording (v0.4.1) ─────────────────────────

/**
 * Wording that describes the practice game's mechanics: questions on every move, answering (swiftly, correctly),
 * timers / Relaxed, wild foes in the grass. A line the player can meet in Kathā must match none of these.
 */
const PRACTICE_WORDING: readonly RegExp[] = [
  /\banswer (?:it |them )?(?:well|swiftly|correctly|perfectly)\b/i,
  /\banswer its question\b/i,
  /\b(?:correct|wrong|right) answers?\b/i,
  /\bevery move\b.*\bquestion\b/i,
  /\bswift(?:ly)? and perfect/i,
  /\btime limit\b|\bRelaxed\b|\btimer\b/,
  /\bgrass\b.*\b(?:fight|leap out|hurt)\b|\b(?:fight|hurt)\b.*\bgrass\b/i,
];
/** Move descriptions that name a practice challenge (meaning, script, completing / ordering / splitting a line). */
const MOVE_PRACTICE = /\b(?:meaning|read the script|complete a line|split the joined|order the words|answer|question|swift)/i;
const practiceWording = (en: string): RegExp | undefined => PRACTICE_WORDING.find((re) => re.test(en));

const PBLOCKS = practiceBlocks();
const sayLines = (cmds: EventCmd[]): string[] => cmds.flatMap((c) => ('say' in c ? [c.say] : []));

test('katha: practice-only blocks hold only say lines with practice wording, each with its Kathā wording beside it', () => {
  console.log(`# practice-only blocks (Kathā wording beside them): ${PBLOCKS.map((b) => b.event).join(', ')}`);
  assert.ok(PBLOCKS.length >= 6, `${PBLOCKS.length} practice-only blocks (the v0.4.1 tutorial lines)`);
  const story = new Map(collectStoryStrings().map((x) => [x.en, x.file]));
  const problems: string[] = [];
  for (const b of PBLOCKS) {
    const where = `${b.event} (practice-only block)`;
    // say only: Kathā skips the block, so it must not hold anything that changes the game
    for (const c of b.then) if (!('say' in c) || Object.keys(c).some((k) => !['say', 'who', 'portrait'].includes(k))) problems.push(`${where}: ${JSON.stringify(c).slice(0, 70)} — only say lines (Kathā skips the block)`);
    if (b.then.length === 0) problems.push(`${where}: empty`);
    // a Kathā variant beside it: the next (or previous) sibling is a Kathā-only block, or the block's own else
    const own = b.list[b.at] as Extract<EventCmd, { if: string }>;
    const near = [b.list[b.at + 1], b.list[b.at - 1]].some((n) => !!n && 'if' in n && isKathaCond(n.if) && n.then.length > 0);
    if (!near && !(own.else && own.else.length > 0)) problems.push(`${where}: no Kathā wording beside it ({ "if": "style.katha", … } next to it)`);
    // the wrapper is for practice-mechanic lines only, and the practice text keeps its file (1–3)
    if (!b.then.some((c) => 'say' in c && practiceWording(c.say))) problems.push(`${where}: no line describes practice mechanics (PRACTICE_WORDING), so it needs no Kathā variant`);
    for (const en of sayLines(b.then)) {
      const f = story.get(en);
      if (f === undefined || f > 3) problems.push(`${where}: "${en.slice(0, 50)}…" is owned by file ${f ?? '(none)'}, not its chapter file 1–3`);
    }
  }
  assert.deepEqual(problems, [], fail(problems));
});

test('katha: Kathā never meets a practice-only block; the practice game plays it unchanged', () => {
  for (const b of PBLOCKS) {
    const block: EventCmd = { if: '!style.katha', then: b.then };
    const k = startScript(fresh(true), REAL, `test.${b.event}`, [block]);
    assert.equal(k.pending, null, `${b.event}: Kathā skips the practice wording`);
    let s = startScript(fresh(false), REAL, `test.${b.event}`, [block]);
    const seen: string[] = [];
    for (let i = 0; i < 8 && s.pending?.kind === 'say'; i++) {
      seen.push(s.pending.text);
      s = reduce(s, REAL, { type: 'advance' });
    }
    assert.deepEqual(seen, sayLines(b.then), `${b.event}: the practice game says its lines, in order`);
    assert.equal(s.pending, null, b.event);
  }
});

/** Every English line a player can meet in Kathā: practice-only branches and story quizzes' say lines are skipped. */
function kathaVisibleLines(): { event: string; en: string }[] {
  const out: { event: string; en: string }[] = [];
  const walk = (cmds: EventCmd[] | undefined, event: string, noSay = false): void => {
    for (const c of cmds ?? []) {
      if ('say' in c && !noSay) out.push({ event, en: c.say });
      if ('choice' in c) out.push({ event, en: c.choice }, ...c.options.map((o) => ({ event, en: o.label })));
      if ('objective' in c) out.push({ event, en: c.objective });
      if ('battle' in c) {
        if (c.battle.intro) out.push({ event, en: c.battle.intro });
        walk(c.onWin, event);
        walk(c.onLose, event);
      }
      // Kathā skips story quizzes: onWrong never runs, onCorrect runs without its say lines (v0.4.1)
      if ('quiz' in c) walk(c.onCorrect, event, true);
      if ('if' in c) {
        if (isPracticeCond(c.if)) walk(c.else, event, noSay);
        else if (isKathaCond(c.if)) walk(c.then, event, noSay);
        else {
          walk(c.then, event, noSay);
          walk(c.else, event, noSay);
        }
      }
    }
  };
  for (const e of REAL.events) walk(e.cmds, e.id);
  return out;
}

test('katha: no line a player meets in Kathā describes practice mechanics (questions, swift answers, timers, wild grass)', () => {
  const lines = kathaVisibleLines();
  const problems = lines.flatMap(({ event, en }) => {
    const re = practiceWording(en);
    return re ? [`${event}: "${en}" matches ${re} (wrap it in { "if": "!style.katha" } and add Kathā wording)`] : [];
  });
  console.log(`# Kathā-visible story lines checked: ${lines.length}`);
  assert.deepEqual(problems, [], fail(problems));
  // the checker is not vacuous: the practice game's own tutorial lines do match
  const practice = PBLOCKS.flatMap((b) => sayLines(b.then));
  assert.ok(practice.filter((en) => practiceWording(en)).length >= PBLOCKS.length, 'the practice-only lines match PRACTICE_WORDING');
});

test('katha: moveText gives Kathā wording to every move description that names a practice challenge; its Sanskrit is in file 5', () => {
  const moveText = KATHA.moveText ?? {};
  const moves = new Map(REAL.moves.map((m) => [m.id, m]));
  const story = new Map(collectStoryStrings().map((x) => [x.en, x]));
  const sa = new Map(REAL.dialogueSa ? Object.entries(REAL.dialogueSa) : []);
  const o = getOracle();
  const problems: string[] = [];
  for (const m of REAL.moves) {
    if (m.origin === 'enemy' || m.origin === 'duelist') continue; // never the player's moves
    if (MOVE_PRACTICE.test(m.description) && !moveText[m.id]) problems.push(`move ${m.id}: "${m.description}" names a practice challenge but has no katha.json moveText`);
  }
  for (const [id, en] of Object.entries(moveText)) {
    const m = moves.get(id);
    if (!m) problems.push(`moveText.${id}: unknown move`);
    else if (m.description === en) problems.push(`moveText.${id}: same as the defs.json description`);
    if (MOVE_PRACTICE.test(en) || practiceWording(en)) problems.push(`moveText.${id}: "${en}" still names a practice challenge`);
    const s = story.get(en);
    if (s?.file !== 5 || !s.ctx.startsWith(`move ${id} `)) problems.push(`moveText.${id}: "${en}" is owned by file ${s?.file ?? '(none)'} (${s?.ctx ?? '-'}), not file 5 as this move's Kathā description`);
    const t = sa.get(en);
    if (!t) problems.push(`moveText.${id}: no Sanskrit`);
    else {
      const r = o.verifyLine(t, { en });
      if (!r.ok) problems.push(`moveText.${id} → ${t}: ${r.errors.join('; ')}`);
    }
  }
  console.log(`# moveText: ${Object.keys(moveText).length} Kathā move descriptions (${Object.keys(moveText).join(', ')})`);
  assert.deepEqual(problems, [], fail(problems));
});

test('katha: the story bot meets only its own journey’s wording — practice: no Kathā line; Kathā: no practice-only line', () => {
  // (v0.5b: a set piece may repeat a line the practice game shares, e.g. an objective: that line is no Kathā wording)
  const kathaOnly = new Set(BLOCKS.flatMap((b) => sayLines(b.then)).filter((en) => !SHARED.has(en)));
  const practiceOnly = new Set(PBLOCKS.flatMap((b) => sayLines(b.then)));
  for (const style of ['abhyasa', 'katha'] as const) {
    const met = new Set<string>();
    const r = runWalkthrough(STORY, 11, 3, {
      style,
      attempts: 12,
      ...(style === 'katha' ? { accuracy: 1 } : {}),
      onAction: (_b, _a, n) => {
        if (n.pending?.kind === 'say') met.add(n.pending.text);
      },
    });
    assert.equal(r.error, null, `${style}: ${r.error ?? ''}`);
    assert.ok(r.state.mode === 'ended' && r.state.save.flags['ch6.complete'], `${style}: the walkthrough reaches the ending`);
    const wrong = [...met].filter((en) => (style === 'katha' ? practiceOnly : kathaOnly).has(en));
    assert.deepEqual(wrong, [], `${style}: met the other journey's wording`);
    const own = [...met].filter((en) => (style === 'katha' ? kathaOnly : practiceOnly).has(en));
    console.log(`# ${style}: ${met.size} story lines met, ${own.length} of them its own journey's tutorial wording`);
    assert.ok(own.length >= 3, `${style}: meets its own tutorial wording on the story path (Bharadvaja's debate, the road at dawn)`);
  }
});

test('katha: every line of a Kathā block has its Sanskrit where collectStoryStrings puts it — file 5 (held at v0.5a) or 6–9 (new in v0.5b), or with the practice line it shares', () => {
  const story = collectStoryStrings();
  const file = new Map(story.map((s) => [s.en, s.file]));
  const problems: string[] = [];
  const lines: string[] = [];
  for (const b of BLOCKS)
    for (const c of b.then) {
      if ('say' in c) lines.push(c.say);
      if ('choice' in c) lines.push(c.choice, ...c.options.map((o) => o.label));
    }
  for (const en of lines) {
    const f = file.get(en);
    if (f === undefined) problems.push(`"${en}" is not a story string`);
    else if (f < 5 && !SHARED.has(en)) problems.push(`"${en}" is owned by file ${f}, not a Kathā file (5–9), yet the practice game never says it`);
  }
  const sa = new Map(REAL.dialogueSa ? Object.entries(REAL.dialogueSa) : []);
  for (const en of lines) if (!sa.get(en)) problems.push(`"${en}" has no Sanskrit`);
  // the Sanskrit of the choices verifies (sambhashana.test.ts checks the whole file; this keeps the gate local too)
  const o = getOracle();
  for (const en of new Set(lines)) {
    const t = sa.get(en);
    if (!t) continue;
    const r = o.verifyLine(t, { en });
    if (!r.ok) problems.push(`"${en}" → ${t}: ${r.errors.join('; ')}`);
  }
  assert.deepEqual(problems, [], fail(problems));
});
