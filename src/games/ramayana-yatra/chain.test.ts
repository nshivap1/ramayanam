/**
 * The verse-chain duel, śloka-antyakṣarī (v0.5b P6, OWNER: WP-C; notes/v05b-plan.md §4 and §7 "C", logic-chain.ts):
 *  - keys: the last consonant of a pāda (ं ः ् and vowel signs ignored), the first consonant it opens with (none for a
 *    vowel), the consonant groups
 *  - the pick: exactly 1 valid chip of 3, all verbatim heard pādas; wrong chips open with another sound (another group
 *    at L2–3, the key's own group at L4 where the book has one); one tap answers (options / answers)
 *  - no pāda is said twice in a duel; the reset to "any line" (every chip valid); the stumped bonus (× 1.5, a fresh line)
 *  - cannot be lost: the opponent never strikes; a perfect player links exactly 5 times, a weak one a few more
 *  - every set of heard verses possible at the duel (the story's, and any one or two left out)
 *  - the practice game keeps its debate
 * This file holds no Sanskrit words: the lines come from the content; the expected keys are single letters.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { type Level, createRng, testMatrix } from '@sdk';
import { splitAksharas } from '@sanskrit';
import type { AntyaState, BattleBeat, BattleSpec, GameState, PartyMember, SaveData } from './types';
import { loadContent } from './content';
import { indexOf } from './logic-util';
import { KATHA_FLAG } from './logic-katha';
import { CHAIN_LINKS, CHAIN_STUMPED, answerLine, chainDuel, chainHead, chainKey, chainKeyAt, chainLines, chainOpen, chainOptions, chainReady, chainTurn, heardLines, isChainDuel, soundGroup } from './logic-chain';
import { SA_BATTLE, battleAction, startBattle } from './logic-battle';
import { newMember } from './logic-progress';
import { runWalkthrough } from './logic-sim';
import { manifest } from './manifest';

const C = loadContent();
const idx = indexOf(C);
const FOE = 'hanuman_duel';
const pada = (id: string, p: number): string => idx.shloka.get(id)!.padas[p]!;

function member(id: string, level: number): PartyMember {
  return newMember(idx.ally.get(id)!, level, C);
}

/** A Kathā (or practice) state at chapter 4 with these verses heard. */
function kState(heard: string[], o: { style?: 'katha' | 'abhyasa'; level?: Level; seed?: number } = {}): GameState {
  const style = o.style ?? 'katha';
  const shlokas: SaveData['shlokas'] = {};
  for (const id of heard) shlokas[id] = { heard: true, restored: false, best: 0 };
  const ch = C.chapters.find((c) => c.kanda === 4)!;
  const save: SaveData = {
    v: 1, playerName: 'T', avatar: 'a', mapId: ch.startMap, x: ch.startX, y: ch.startY, facing: 'down', respawn: { mapId: ch.startMap, x: ch.startX, y: ch.startY },
    chapter: 4, objective: '', flags: style === 'katha' ? { [KATHA_FLAG]: true } : {}, party: [member('player', 19), member('rama', 19), member('lakshmana', 19)], items: {}, niska: 0, words: {}, shlokas,
    step: 0, npcPos: {}, playMs: 0, completedChapters: [], ...(style === 'katha' ? { style, smrti: {} } : {}),
  };
  return { v: 1, seed: o.seed ?? 5, tick: 0, level: o.level ?? 3, save, mode: 'explore', script: null, pending: null, battle: null, recital: null, session: { correct: 0, total: 0, swift: 0, practised: [], shlokasHeard: [], shlokasRestored: [], battlesWon: 0, chaptersCompleted: [] }, fx: [] };
}

const DUEL: BattleSpec = { enemies: [{ id: FOE, level: 16 }], kind: 'duel', canRun: false, canLose: true, bg: 'forest', music: 'duel', intro: 'Hanuman invites you to a friendly contest of verses.' };

/** The verses heard when the Kathā story reaches Hanumān's duel (the story bot, seed 1, level 3). */
const STORY_HEARD: string[] = (() => {
  let at: string[] | null = null;
  runWalkthrough(C, 1, 3, {
    style: 'katha',
    onAction: (b, _a, n) => {
      if (!at && b.mode !== 'battle' && n.mode === 'battle' && n.battle?.spec.enemies.some((e) => e.id === FOE)) at = Object.keys(n.save.shlokas).filter((id) => n.save.shlokas[id]?.heard);
    },
    steps: C.walkthrough.filter((w) => w.chapter <= 4),
  });
  assert.ok(at, 'the Kathā story reaches the duel');
  return at;
})();

interface DuelRun {
  won: boolean;
  links: number;
  said: string[];
  picks: { key: string | null; options: string[]; answers: string[]; valid: string[] }[];
  allyHurt: boolean;
  resets: number;
  stumps: number;
  beats: BattleBeat[];
}

/** Play the duel through the reducer: the bot picks the right chip with probability `accuracy` (its own rng). */
function duel(heard: string[], accuracy: number, o: { level?: Level; seed?: number } = {}): DuelRun {
  let s = startBattle(kState(heard, o), C, DUEL);
  const rng = createRng(o.seed ?? 1);
  const out: DuelRun = { won: false, links: 0, said: [], picks: [], allyHurt: false, resets: 0, stumps: 0, beats: [...s.battle!.beats] };
  const hp0 = s.battle!.ally.hp;
  for (let n = 0; n < 600 && s.battle && !(['won', 'lost'].includes(s.battle.phase) && s.battle.beats.length === 0); n++) {
    const b = s.battle;
    if (b.ally.hp < hp0) out.allyHurt = true;
    if (s.pending?.kind === 'challenge') {
      const ch = s.pending.challenge;
      assert.equal(ch.kind, 'antya', 'every player turn of a chain duel is a verse-chain pick');
      const valid = (ch.options ?? []).filter((x) => chainHead(x.sa!) === ch.antya!.key || ch.antya!.key === null).map((x) => x.id);
      out.picks.push({ key: ch.antya!.key, options: (ch.options ?? []).map((x) => x.sa!), answers: ch.answers ?? [], valid });
      if (ch.antya!.key === null) out.resets++;
      const right = ch.answers![0]!;
      const wrong = ch.options!.find((x) => !ch.answers!.includes(x.id))?.id;
      const before = s;
      s = battleAction(s, C, { type: 'answer', option: rng.next() < accuracy || !wrong ? right : wrong, timeMs: 800 });
      out.links++;
      const nb = s.battle!.beats.slice(0);
      out.beats.push(...nb);
      for (const bt of nb) if (bt.recital) out.said.push(`${bt.recital.shlokaId}:${bt.recital.pada}`);
      for (const bt of nb) if (bt.model) out.said.push(`${bt.model.shlokaId}:${bt.model.pada}`);
      if (s.battle!.antya?.stumped && !before.battle!.antya?.stumped) out.stumps++;
      continue;
    }
    s = battleAction(s, C, { type: 'advance' });
  }
  out.won = s.battle?.phase === 'won';
  return out;
}

// ───────────────────────── keys ─────────────────────────

test('chain keys: the last consonant of a pāda (ं ः ् and vowel signs ignored) and the akṣara that holds it; the first consonant it opens with (none for a vowel); groups', () => {
  // (the expected keys are single letters; the lines are the content's)
  assert.equal(chainKey(pada('s-vyakaranam', 0)), 'म', 'final म् (halanta)');
  assert.equal(chainKey(pada('s-tapah-svadhyaya', 0)), 'त', 'a final anusvāra is ignored');
  assert.equal(chainKey(pada('s-ramo-vigrahavan', 0)), 'म', 'a final visarga is ignored (र्मः → म)');
  assert.equal(chainKey(pada('s-aranya-3', 0)), 'न', 'a doubled halanta final (न्न्)');
  assert.equal(chainKey(pada('s-golden-deer', 0)), 'स', 'the avagraha of the last word is no sound');
  assert.equal(chainKey(pada('s-ramo-dvir', 3)), 'त', 'a vowel sign is ignored (ते → त)');
  assert.equal(chainHead(pada('s-golden-deer', 3)), 'क', 'a conjunct opens with its first consonant (क्री → क)');
  assert.equal(chainHead(pada('s-tapah-svadhyaya', 0)), 'त');
  assert.equal(chainHead(pada('s-ma-nishada', 1)), null, 'a line that opens with a vowel opens with no consonant');
  const at = chainKeyAt(pada('s-vyakaranam', 0))!;
  assert.equal(at.at, splitAksharas(pada('s-vyakaranam', 0)).length - 1, 'the key sits in the last akṣara');
  // every pāda of the book has a key, and the lines are the printed pādas, verbatim
  for (const l of chainLines(C)) {
    assert.ok(l.tail, `${l.id} has a last consonant`);
    assert.equal(l.text, idx.shloka.get(l.ref.shlokaId)!.padas[l.ref.pada]!.split(/\s+/).filter(Boolean).join(' '));
  }
  assert.equal(soundGroup('त'), soundGroup('न'), 'ta-varga');
  assert.notEqual(soundGroup('त'), soundGroup('क'));
  assert.equal(soundGroup('य'), soundGroup('व'), 'the semivowels are one group');
  assert.equal(soundGroup(null), null);
});

test('chain content: katha-chain.json names Hanumān (Kiṣkindhā 4.3, 5 links); only a Kathā duel against it is a chain', () => {
  const d = chainDuel(C, FOE);
  assert.ok(d && d.links === CHAIN_LINKS && /Kiṣkindhā 4\.3|4\.2–3/.test(d.source));
  for (const x of C.chain!.duels) assert.ok(idx.enemy.get(x.foe)?.kind === 'duelist', `${x.foe} is a duelist`);
  assert.ok(isChainDuel(kState([]), C, DUEL));
  assert.ok(!isChainDuel(kState([], { style: 'abhyasa' }), C, DUEL), 'the practice game keeps its debate');
  assert.ok(!isChainDuel(kState([]), C, { ...DUEL, enemies: [{ id: 'bharadvaja_duel', level: 3 }] }), 'the tutorial duel stays call and response');
});

// ───────────────────────── the pick ─────────────────────────

test('chain pick: exactly 1 valid chip of 3, all verbatim heard pādas; wrong chips open with other sounds (another group at L2–3, the same varga at L4); the chain resets to any line when no unused pāda opens with the key', () => {
  const lines = heardLines(kState(STORY_HEARD), C);
  const texts = new Set(lines.map((l) => l.text));
  let same = 0;
  let other = 0;
  for (const level of [2, 3, 4] as const) {
    for (let seed = 1; seed <= 25; seed++) {
      const r = duel(STORY_HEARD, 0.7, { level, seed });
      assert.ok(r.won, `level ${level} seed ${seed}: won`);
      for (const p of r.picks) {
        for (const o of p.options) assert.ok(texts.has(o), `a chip is a verbatim heard pāda: ${o}`);
        assert.equal(new Set(p.options).size, p.options.length, 'no chip twice');
        if (p.key === null) {
          assert.deepEqual([...p.answers].sort(), p.valid.sort(), 'any line: every chip is valid');
          continue;
        }
        assert.equal(p.options.length, 3, 'three chips');
        assert.equal(p.answers.length, 1, 'exactly one valid chip');
        assert.deepEqual(p.valid, p.answers, 'the valid chip is the one that opens with the key');
        for (const o of p.options) {
          const h = chainHead(o);
          if (h === p.key) continue;
          if (h !== null && soundGroup(h) === soundGroup(p.key)) same += level >= 4 ? 1 : 0;
          else other += level >= 4 ? 0 : 1;
          if (level <= 3) assert.ok(h === null || soundGroup(h) !== soundGroup(p.key), `L${level}: a wrong chip opens with a sound of another group (${h} for ${p.key})`);
        }
      }
    }
  }
  assert.ok(same > 0 && other > 0, `L4 wrong chips share the key's group (${same}), L2–3 ones do not (${other})`);
  // the reset: every unused pāda that opens with the key said → "any line"
  const open = chainOpen(kState(STORY_HEARD), C, FOE)!;
  const key = open.antya.key!;
  const starters = lines.filter((l) => l.head === key).map((l) => l.id);
  const spent: AntyaState = { ...open.antya, used: [...open.antya.used, ...starters] };
  assert.equal(answerLine(lines, spent), null);
  const reset = chainReady(kState(STORY_HEARD), C, spent);
  assert.equal(reset.key, null, 'the chain resets to "any line"');
  const any = chainOptions(kState(STORY_HEARD), C, reset)!;
  assert.equal(any.challenge.options!.length, 3);
  assert.equal(any.challenge.answers!.length, 3, 'every chip is valid');
  assert.ok(any.challenge.options!.every((o) => !lines.find((l) => l.text === o.sa && spent.used.includes(l.id))), 'no used line is offered');
});

test('chain: no pāda is said twice in a duel; a perfect player links exactly 5 times with no reset; the opponent never strikes, so the duel cannot be lost', () => {
  const perfect = duel(STORY_HEARD, 1);
  assert.ok(perfect.won);
  assert.equal(perfect.links, CHAIN_LINKS, 'five links');
  assert.equal(perfect.resets, 0, 'the chain never breaks for a perfect player at the duel');
  assert.equal(new Set(perfect.said).size, perfect.said.length, 'no line twice');
  assert.ok(!perfect.allyHurt);
  assert.ok(!perfect.beats.some((b) => b.fx?.target === 'ally' && b.fx.kind === 'hit'), 'no blow lands on the hero');
  assert.ok(perfect.beats.some((b) => b.text === SA_BATTLE.templates['kathaChainRule']!.en.replace('{x}', `{n:enemy.${FOE}}`)), 'the rule beat opens the duel');
  // the 70 % and the hopeless reciter (and every seed × level): won, never hurt, still no line twice
  for (const { level, seed } of testMatrix(manifest.levels, 25)) {
    for (const acc of [0.7, 0]) {
      const r = duel(STORY_HEARD, acc, { level, seed });
      assert.ok(r.won && !r.allyHurt, `acc ${acc} L${level} seed ${seed}: won (${r.links} links), never hurt`);
      assert.ok(r.links <= 2 * CHAIN_LINKS, `at most ${2 * CHAIN_LINKS} links (${r.links})`);
      assert.equal(new Set(r.said).size, r.said.length, `acc ${acc} L${level} seed ${seed}: no line twice (${r.said.join(' ')})`);
    }
  }
});

test('chain: a miss says the right line all the same, at half power; a stumped opponent: × 1.5 and a fresh line', () => {
  const s = kState(STORY_HEARD);
  const lines = heardLines(s, C);
  const open = chainOpen(s, C, FOE)!;
  const ok = chainOptions(s, C, open.antya)!;
  const right = ok.challenge.antya!.lines[ok.challenge.options!.findIndex((o) => ok.challenge.answers!.includes(o.id))]!;
  const wrong = ok.challenge.antya!.lines[ok.challenge.options!.findIndex((o) => !ok.challenge.answers!.includes(o.id))]!;
  const a = chainTurn(s, C, open.antya, right);
  const b = chainTurn(s, C, open.antya, wrong);
  assert.ok(a.valid && !b.valid);
  assert.deepEqual(b.spoken, a.spoken, 'a miss says the right line');
  assert.deepEqual(b.antya, a.antya, 'the chain goes on the same way');
  // in battle: the missed link says the right line (its recital is that line, marked missed) at half power
  const miss = duel(STORY_HEARD, 0);
  const half = SA_BATTLE.templates['kathaHalfBut']!.en;
  const missed = miss.beats.filter((x) => x.recital && !x.recital.correct);
  assert.ok(missed.length > 0 && missed.every((x) => x.text.includes(half) && x.textSa), 'a missed link: "But the line falters…"');
  const link = startBattle(s, C, DUEL).battle!.foe.maxHp / CHAIN_LINKS;
  const stumpedEn = SA_BATTLE.templates['kathaChainStumped']!.en.replace('{x}', `{n:enemy.${FOE}}`);
  assert.ok(missed.filter((x) => !x.text.includes(stumpedEn)).every((x) => x.fx!.amount! <= Math.ceil((link * 0.5) / 0.85) + 1), 'half power');
  // a stumped opponent: a line whose last sound no unused pāda opens with
  const dead = lines.find((l) => l.tail !== null && !lines.some((m) => m.head === l.tail) && l.head !== null)!;
  assert.ok(dead, 'the book has a line no other line answers');
  // (the other lines with its first sound already said, so it is the line the player's turn says)
  const st: AntyaState = { key: dead.head, used: lines.filter((l) => l.head === dead.head && l.id !== dead.id).map((l) => l.id) };
  const t = chainTurn(s, C, st, dead.ref);
  assert.equal(t.reply, null, 'stumped: no answer');
  assert.ok(t.antya.stumped && t.antya.prev, 'a fresh line follows');
  assert.ok(t.antya.used.includes(`${t.antya.prev.shlokaId}:${t.antya.prev.pada}`) && t.antya.used.includes(dead.id), 'both lines are said');
  // in battle: the stumped link lands × 1.5 (variance aside) with its line
  let bs = startBattle(s, C, DUEL);
  while (bs.battle!.beats.length) bs = battleAction(bs, C, { type: 'advance' });
  assert.equal(bs.pending?.kind, 'challenge');
  const rigged: GameState = { ...bs, battle: { ...bs.battle!, antya: st } };
  const ch = chainOptions(rigged, C, st)!.challenge;
  const pend: GameState = { ...rigged, pending: { kind: 'challenge', challenge: ch, context: 'battle' } };
  const i = ch.antya!.lines.findIndex((l) => l.shlokaId === dead.ref.shlokaId && l.pada === dead.ref.pada);
  assert.ok(i >= 0, 'the dead-end line is the valid chip');
  const after = battleAction(pend, C, { type: 'answer', option: ch.options![i]!.id, timeMs: 500 });
  const hit = after.battle!.beats.find((x) => x.fx?.kind === 'hit')!;
  const stumped = SA_BATTLE.templates['kathaChainStumped']!.en.replace('{x}', `{n:enemy.${FOE}}`);
  assert.ok(hit.text.includes(stumped), 'the stumped line is told');
  assert.ok(hit.textSa, 'with its Sanskrit');
  const full = bs.battle!.foe.maxHp / CHAIN_LINKS; // a full link at its lowest roll
  assert.ok(hit.fx!.amount! >= Math.floor(full * CHAIN_STUMPED) - 1, `× 1.5 (${hit.fx!.amount} vs a link of ${full})`);
  assert.ok(after.battle!.beats.some((x) => x.model), 'the opponent says a fresh line');
});

test('chain: every set of heard verses possible at the duel — the story set, and any one or two verses left out — plays to a win with one valid chip, no repeats', () => {
  assert.ok(STORY_HEARD.includes('s-vyakaranam') && STORY_HEARD.includes('s-nanrgveda'), 'Rāma praises Hanumān’s speech (the two verses) right before the duel');
  const sets: string[][] = [STORY_HEARD];
  for (const a of STORY_HEARD) sets.push(STORY_HEARD.filter((x) => x !== a));
  for (let i = 0; i < STORY_HEARD.length; i++) for (let j = i + 1; j < STORY_HEARD.length; j += 3) sets.push(STORY_HEARD.filter((_x, k) => k !== i && k !== j));
  // a smaller book: just the two verses of the meeting
  sets.push(['s-nanrgveda', 's-vyakaranam']);
  for (const set of sets) {
    for (const acc of [1, 0.6]) {
      const r = duel(set, acc, { seed: set.length });
      assert.ok(r.won && !r.allyHurt, `${set.length} verses, acc ${acc}: won`);
      assert.equal(new Set(r.said).size, r.said.length, `${set.length} verses: no line twice`);
      for (const p of r.picks) if (p.key !== null) assert.equal(p.answers.length, 1, 'one valid chip');
    }
  }
});

test('chain: the practice game keeps its debate (no antya, classic challenges); a Kathā duel before any verse is heard falls back to the recited duel', () => {
  let s = startBattle(kState(STORY_HEARD, { style: 'abhyasa' }), C, DUEL);
  assert.equal(s.battle!.antya, undefined);
  for (let i = 0; i < 20 && s.battle!.phase !== 'command' && s.pending?.kind !== 'challenge'; i++) s = battleAction(s, C, { type: 'advance' });
  assert.equal(s.battle!.phase, 'command', 'the practice debate opens with the command menu');
  const k = startBattle(kState([]), C, DUEL);
  assert.equal(k.battle!.antya, undefined, 'nothing heard: no chain');
});
