/**
 * v0.5b WP-D: the Kathā set pieces of the Yuddha-kāṇḍa besides the bridge (setu.test) and the finale (bookend.test).
 *  - scene 11, Vibhīṣaṇa's council (Yuddha 6.17–18): Vibhīṣaṇa arrives and Rāma asks his counsellors; the player hears
 *    Aṅgada ("test him first", 6.17), returns, Hanumān speaks, the Kathā question, the vow (the verse), and the player
 *    says the vow's line (P1 on s-sakrdeva pāda 2) before Vibhīṣaṇa joins. Two Kathā-only walkthrough steps; the
 *    practice journey keeps its one-talk scene (with its quiz) and Aṅgada's old line.
 *  - scene 14, the return in the Puṣpaka (Yuddha 6.123): five stops in flight order; at each the verse heard there is
 *    shown and the player names the place among three names of names.json; a wrong name gets Rāma's "look again" and
 *    the same question; the practice journey flies straight home.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Level } from '@sdk';
import { loadContent } from './content';
import { reduce, stepInJourney } from './logic';
import { startScript } from './logic-events';
import { doStep, runWalkthrough } from './logic-sim';
import type { EventCmd, GameState, JourneyStyle, WalkStep } from './types';

const REAL = loadContent();

/** The state right after the walkthrough step that sets `flag` (the real story, one journey). */
function after(flag: string, style: JourneyStyle, seed = 3, level: Level = 3): GameState {
  const i = REAL.walkthrough.findIndex((w) => w.expectFlag === flag);
  let at: GameState | null = null;
  runWalkthrough(REAL, seed, level, {
    style,
    steps: REAL.walkthrough.slice(0, i + 1),
    onStep: (k, s) => {
      if (k === i) at = s;
    },
  });
  assert.ok(at, `reached ${flag}`);
  return at;
}

/** Talk to an NPC of setu_shore and play the scene out; what it showed: say lines, scene recitations, choices, quizzes. */
function talk(s: GameState, npc: string): { state: GameState; seen: string[] } {
  const seen: string[] = [];
  const seenP = new Set<unknown>();
  const note = (g: GameState): void => {
    const p = g.pending;
    if (!p || seenP.has(p)) return;
    seenP.add(p);
    if (p.kind === 'say') seen.push(`say:${p.text}`);
    else if (p.kind === 'challenge') seen.push(p.context === 'scene' && p.challenge.smarana ? `scene:${p.challenge.smarana.shlokaId}:${p.challenge.smarana.pada}` : `challenge:${p.context}`);
    else seen.push(p.kind);
  };
  const step: WalkStep = { chapter: 6, map: 'setu_shore', action: { talk: npc }, expectFlag: 'none' };
  const state = doStep(s, REAL, step, { onAction: (b, _a, n) => (note(b), note(n)) });
  return { state, seen };
}

const has = (seen: string[], text: string): boolean => seen.some((x) => x === `say:${text}`);

test('scene 11 (Kathā): the council — Vibhīṣaṇa arrives, Rāma asks; Aṅgada says test him; back at the shore, the player says the vow, then Vibhīṣaṇa joins', () => {
  let s = after('ch6.started', 'katha');
  // 1. Vibhīṣaṇa in the air; Sugrīva's warning; Rāma asks his counsellors (no vow yet)
  let t = talk(s, 'vibhishana');
  assert.ok(has(t.seen, 'Do not trust him, friend! He is the enemy\'s own brother. He may be a spy.'));
  assert.ok(has(t.seen, 'Rama turns to his counsellors: "What do you say?"'));
  assert.ok(t.state.save.flags['ch6.council'] && !t.state.save.flags['ch6.vibhishana_joined']);
  assert.equal(t.state.save.objective, 'Ask Angada for his counsel.');
  assert.ok(!t.seen.some((x) => x.startsWith('scene:')));
  s = t.state;
  // 2. talking to him again before Aṅgada: he waits, nothing changes
  t = talk(s, 'vibhishana');
  assert.deepEqual(t.seen, ['say:Vibhishana waits. First ask Angada for his counsel.']);
  assert.deepEqual(t.state.save.flags, s.save.flags);
  // 3. Aṅgada's counsel (Yuddha 6.17)
  t = talk(s, 'angada_s');
  assert.ok(has(t.seen, 'He has come from our enemy. Let Rama test him first.'));
  assert.ok(t.state.save.flags['ch6.council_angada']);
  s = t.state;
  // 4. back to Vibhīṣaṇa: Hanumān, the question, the vow; the player says pāda 2 (अभयं सर्वभूतेभ्यो); he joins
  t = talk(s, 'vibhishana');
  const i = (x: string): number => t.seen.indexOf(x);
  assert.ok(i("say:He spoke for Sita in Ravana's court. He saved my life when Ravana ordered my death.") >= 0, 'Hanumān speaks for him');
  assert.ok(t.seen.includes('choice'), 'the Kathā question');
  assert.ok(t.seen.includes('shloka'), 'the vow (verse moment)');
  const vow = i('scene:s-sakrdeva:2');
  assert.ok(vow > i('shloka') && vow > i('say:Go, bring him to me. Say my vow to him.'), 'the player says the vow line after Rāma asks');
  assert.ok(i('say:Vibhishana hears the vow and comes down from the sky.') > vow);
  assert.ok(!t.seen.some((x) => x.startsWith('challenge:quiz')), 'no quiz in Kathā');
  assert.ok(t.state.save.flags['ch6.vibhishana_joined']);
  assert.ok(t.state.save.party.some((m) => m.id === 'vibhishana'));
  assert.ok(t.state.lastSmarana?.context === 'scene' && t.state.lastSmarana.challenge.smarana?.shlokaId === 's-sakrdeva');
});

test('scene 11: the two council steps are Kathā-only walkthrough steps; the practice scene is one talk, with its quiz and no recitation', () => {
  const steps = REAL.walkthrough.filter((w) => w.expectFlag === 'ch6.council' || w.expectFlag === 'ch6.council_angada');
  assert.equal(steps.length, 2);
  assert.ok(steps.every((w) => w.style === 'katha'));
  const practice = after('ch6.started', 'abhyasa');
  assert.ok(steps.every((w) => !stepInJourney(w, practice.save)), 'skipped in practice');
  const a = talk(practice, 'angada_s');
  assert.ok(has(a.seen, 'Hanuman, they say you set Lanka ablaze with your own tail! Tell me everything later.'), "Aṅgada's practice line");
  assert.ok(!a.state.save.flags['ch6.council_angada']);
  const t = talk(a.state, 'vibhishana');
  assert.ok(has(t.seen, 'Rama listens to every counsel. Then he speaks.'));
  assert.ok(t.seen.includes('challenge:quiz'), 'the practice quiz');
  assert.ok(!t.seen.some((x) => x.startsWith('scene:')) && !t.seen.includes('choice'));
  assert.ok(!has(t.seen, 'Rama turns to his counsellors: "What do you say?"'));
  assert.ok(t.state.save.flags['ch6.vibhishana_joined'] && !t.state.save.flags['ch6.council']);
});

// ───────────────────────── scene 14: the Puṣpaka ─────────────────────────

const ravana = REAL.events.find((e) => e.id === 'ch6.ravana')!;
const onWin = (ravana.cmds.find((c) => 'battle' in c) as { onWin: EventCmd[] }).onWin;
/** the five stops: the verse heard there, and the right place (Yuddha 6.123 flight order) */
const STOPS = [
  ['s-anirvedah', 'In Lanka.'],
  ['s-sakrdeva', 'On the ocean shore.'],
  ['s-naham-janami', 'On Rishyamuka hill.'],
  ['s-golden-deer', 'At Panchavati.'],
  ['s-ramo-dvir', 'In Ayodhya.'],
] as const;

function homeward(style: JourneyStyle): GameState {
  const s = after('ch6.restored_aditya', style, 5, 3);
  return startScript({ ...s, save: { ...s.save, mapId: 'lanka_palace', x: 11, y: 6 } }, REAL, 'ch6.ravana', onWin);
}

test('scene 14 (Kathā): the Puṣpaka — five stops in flight order; at each the verse heard there, then "where?" among three names; a wrong name gets "look again" and the same question', () => {
  let s = homeward('katha');
  const names = new Set(REAL.names.filter((n) => n.id.startsWith('place.')).map((n) => n.sa));
  let stop = 0;
  let wrongTried = 0;
  for (let n = 0; n < 400 && s.mode === 'script' && s.save.mapId !== 'ayodhya_return'; n++) {
    const p = s.pending;
    if (p?.kind === 'shloka' && stop < STOPS.length && p.shlokaId === STOPS[stop]![0]) {
      s = reduce(s, REAL, { type: 'advance' });
      // the question for this stop
      assert.equal(s.pending?.kind, 'choice', `stop ${stop + 1}: the question follows the verse`);
      const c = s.pending as Extract<GameState['pending'], { kind: 'choice' }>;
      assert.equal(c.prompt, 'Rama asks you: "Where did we hear this verse?"');
      assert.equal(c.options.length, 3);
      const right = c.options.indexOf(STOPS[stop]![1]);
      assert.ok(right >= 0, `stop ${stop + 1}: the right place is offered (${c.options.join(' / ')})`);
      // a wrong name: Rāma's line, then the same question again
      const wrong = (right + 1) % 3;
      let w = reduce(s, REAL, { type: 'choose', index: wrong });
      assert.ok(w.pending?.kind === 'say' && w.pending.text === 'Not there. Look down again.');
      w = reduce(w, REAL, { type: 'advance' });
      assert.ok(w.pending?.kind === 'choice' && w.pending.options.join() === c.options.join(), 'the same question again');
      wrongTried++;
      const flags = w.save.flags;
      s = reduce(w, REAL, { type: 'choose', index: right });
      stop++;
      assert.deepEqual(s.save.flags, flags, 'naming a place changes no flag');
      continue;
    }
    if (p?.kind === 'shloka') assert.ok(stop === 0 || stop >= STOPS.length, `an unexpected verse ${p.shlokaId} at stop ${stop}`);
    s = reduce(s, REAL, { type: 'advance' });
  }
  assert.equal(stop, 5, 'five stops');
  assert.equal(wrongTried, 5);
  assert.equal(s.save.mapId, 'ayodhya_return', 'then home to Ayodhyā');
  // every place offered is already in names.json (the options' Sanskrit is their locative: sa-dialogue-9, oracle-checked)
  assert.ok(names.has('लङ्का') && names.has('ऋश्यमूक') && names.has('पञ्चवटी') && names.has('अयोध्या') && names.has('समुद्र'));
});

test('scene 14: the practice journey flies straight home (no stops, no question)', () => {
  let s = homeward('abhyasa');
  const kinds: string[] = [];
  for (let n = 0; n < 100 && s.mode === 'script' && s.save.mapId !== 'ayodhya_return'; n++) {
    if (s.pending) kinds.push(s.pending.kind === 'shloka' ? `shloka:${s.pending.shlokaId}` : s.pending.kind);
    s = reduce(s, REAL, { type: 'advance' });
  }
  assert.equal(s.save.mapId, 'ayodhya_return');
  assert.ok(!kinds.includes('choice'));
  assert.deepEqual(kinds.filter((k) => k.startsWith('shloka:')), ['shloka:s-maranantani'], 'only the verse of Rāvaṇa’s rites');
});
