#!/usr/bin/env node
// Scaffold a new game that already passes the gate, so you start from green.
//   npm run new-game -- <id> [--custom] [--labs] [--title="देवनागरी|IAST|English"]
//   default template: lesson/quiz (QuizRunner);  --custom: reducer-style custom mechanic
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from './gen-registry.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const labs = args.includes('--labs');
const custom = args.includes('--custom');
const titleArg = (args.find((a) => a.startsWith('--title=')) ?? '').slice(8);
if (!id || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  console.error('usage: npm run new-game -- <kebab-case-id> [--custom] [--labs] [--title="देवनागरी|IAST|English"]');
  process.exit(1);
}
const dir = join(root, labs ? 'labs' : 'src/games', id);
if (existsSync(dir) || existsSync(join(root, 'src/games', id)) || existsSync(join(root, 'labs', id))) {
  console.error(`a game named ${id} already exists`);
  process.exit(1);
}
const [sa = 'नूतनक्रीडा', iast = 'Nūtana-krīḍā', en = 'New game'] = titleArg ? titleArg.split('|') : [];
const harness = labs ? '../../tests/e2e/harness' : '../../../tests/e2e/harness';

const files = {};

files['manifest.ts'] = `import type { GameManifest } from '@sdk';

export const manifest: GameManifest = {
  id: '${id}',
  version: '0.1.0',
  title: { sa: '${sa}', iast: '${iast}', en: '${en}' },
  tagline: 'TODO: one line, at most 60 characters',
  description: 'TODO: one to three sentences on what the player does and learns.',
  kind: '${custom ? 'puzzle' : 'lesson'}',
  skills: ['akshara'],
  levels: [0],
  modes: ['practice'],
  minutes: 2,
  icon: '${[...sa][0] ?? 'क'}',
  hue: 'teal',
  status: '${labs ? 'labs' : 'beta'}',
  howToPlay: ['TODO: first step.', 'TODO: second step.'],
  content: [],
};
`;

if (!custom) {
  files['logic.ts'] = `/**
 * ${id} — pure logic. Build the session's questions from verified content.
 * Replace the placeholder pool with data from '@content' (see docs/GAME_CONTRACT.md §7).
 */
import { devaToIast } from '@sanskrit';
import { type ChoiceQuestion, type Level, type Question, createRng } from '@sdk';

/** Placeholder content: the vowels. Swap for a pack, e.g. vocabForLevel(level). */
const POOL = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ'] as const;

export const ROUNDS = 8;

export function buildQuestions(seed: number, _level: Level): Question[] {
  const rng = createRng(seed);
  return rng.sample(POOL, ROUNDS).map((target): ChoiceQuestion => {
    const distractors = rng.sample(POOL.filter((p) => p !== target), 3);
    return {
      kind: 'choice',
      id: \`${id}:\${target}\`,
      skill: 'akshara',
      instruction: 'Which sound is this?',
      prompt: { sa: target, script: 'deva' },
      options: rng.shuffle([target, ...distractors]).map((o) => ({ id: o, text: devaToIast(o) })),
      answer: target,
      explain: { text: \`\${target} = \${devaToIast(target)}\` },
    };
  });
}
`;
  files['logic.test.ts'] = `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, assertValidQuestions, createQuiz, currentQuestion, quizResult, submit, testMatrix } from '@sdk';
import { manifest } from './manifest';
import { ROUNDS, buildQuestions } from './logic';

test('questions are valid, deterministic and unambiguous for every level × seed', () => {
  for (const { level, seed } of testMatrix(manifest.levels)) {
    const qs = buildQuestions(seed, level);
    assert.equal(qs.length, ROUNDS);
    assertValidQuestions(qs);
    assert.deepEqual(buildQuestions(seed, level), qs);
    for (const q of qs) {
      if (q.kind !== 'choice') continue;
      const labels = q.options.map((o) => o.text ?? o.sa);
      assert.equal(new Set(labels).size, labels.length, \`ambiguous options in \${q.id}\`);
    }
  }
});

test('a perfect bot completes; a wrong bot loses', () => {
  let s = createQuiz(buildQuestions(1, manifest.levels[0]!));
  for (let q = currentQuestion(s); q; q = currentQuestion(s)) s = advance(submit(s, q.kind === 'choice' ? q.answer : ''));
  assert.equal(quizResult(s).outcome, 'completed');
  assert.equal(quizResult(s).correct, ROUNDS);
  let f = createQuiz(buildQuestions(1, manifest.levels[0]!));
  for (let q = currentQuestion(f); q; q = currentQuestion(f)) f = advance(submit(f, 'wrong'));
  assert.equal(quizResult(f).outcome, 'lost');
});
`;
  files['Game.tsx'] = `import { type ReactElement, useMemo } from 'react';
import type { GameProps } from '@sdk';
import { QuizRunner } from '@ui';
import { buildQuestions } from './logic';

export default function Game({ ctx }: GameProps): ReactElement {
  const questions = useMemo(() => buildQuestions(ctx.seed, ctx.level), [ctx.seed, ctx.level]);
  return <QuizRunner ctx={ctx} questions={questions} options={{ lives: 3 }} />;
}
`;
  files['e2e.spec.ts'] = `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectNoOverflow, gameSuite, playQuiz } from '${harness}';

gameSuite('${id}', ({ open }) => {
  test('perfect run reaches the result screen with 3 stars', async () => {
    const g = await open({ seed: 1${labs ? ', labs: true' : ''} });
    await playQuiz(g);
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'completed');
    assert.equal(rec.stars, 3);
    await expectNoOverflow(g);
    g.expectClean();
    await g.close();
  });

  test('wrong answers show feedback and are retried', async () => {
    const g = await open({ seed: 2${labs ? ', labs: true' : ''} });
    await playQuiz(g, { wrongEvery: 5 });
    const rec = await g.expectResult();
    assert.ok((rec.result.correct ?? 0) < (rec.result.total ?? 0));
    g.expectClean();
    await g.close();
  });
});
`;
} else {
  files['logic.ts'] = `/**
 * ${id} — pure logic (custom mechanic). State is immutable; transitions are plain functions.
 * Placeholder mechanic: tap the akṣara that matches the shown sound, ROUNDS times.
 * Replace with your rules; keep it deterministic from the seed.
 */
import { devaToIast } from '@sanskrit';
import { type Level, createRng } from '@sdk';

const POOL = ['क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'त', 'थ', 'द', 'ध', 'प', 'फ', 'ब', 'भ'] as const;
export const ROUNDS = 6;
export const LIVES = 3;

export interface Round {
  target: string;
  /** Romanised sound shown to the player. */
  sound: string;
  options: string[];
}
export interface State {
  rounds: Round[];
  index: number;
  lives: number;
  score: number;
  correct: number;
  log: { target: string; picked: string; correct: boolean }[];
  over: boolean;
}

export function init(seed: number, _level: Level): State {
  const rng = createRng(seed);
  const rounds = rng.sample(POOL, ROUNDS).map((target) => ({ target, sound: devaToIast(target), options: rng.shuffle([target, ...rng.sample(POOL.filter((p) => p !== target), 5)]) }));
  return { rounds, index: 0, lives: LIVES, score: 0, correct: 0, log: [], over: false };
}

export function current(state: State): Round | null {
  return state.over ? null : (state.rounds[state.index] ?? null);
}

export function pick(state: State, option: string): State {
  const round = current(state);
  if (!round || !round.options.includes(option)) return state;
  const ok = option === round.target;
  const lives = ok ? state.lives : state.lives - 1;
  const index = state.index + 1;
  return { ...state, index, lives, score: state.score + (ok ? 10 : 0), correct: state.correct + (ok ? 1 : 0), log: [...state.log, { target: round.target, picked: option, correct: ok }], over: lives <= 0 || index >= state.rounds.length };
}

export function won(state: State): boolean {
  return state.over && state.lives > 0;
}
`;
  files['logic.test.ts'] = `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, testMatrix } from '@sdk';
import { manifest } from './manifest';
import { LIVES, ROUNDS, current, init, pick, won } from './logic';

test('init is deterministic; every round has its target among unique options', () => {
  for (const { level, seed } of testMatrix(manifest.levels)) {
    const s = init(seed, level);
    assert.deepEqual(init(seed, level), s);
    assert.equal(s.rounds.length, ROUNDS);
    for (const r of s.rounds) {
      assert.ok(r.options.includes(r.target));
      assert.equal(new Set(r.options).size, r.options.length);
    }
  }
});

test('perfect bot wins every seed', () => {
  for (const { level, seed } of testMatrix(manifest.levels)) {
    let s = init(seed, level);
    for (let r = current(s); r; r = current(s)) s = pick(s, r.target);
    assert.ok(won(s));
    assert.equal(s.correct, ROUNDS);
    assert.equal(s.score, ROUNDS * 10);
  }
});

test('wrong picks cost lives and end the game; random bot always terminates', () => {
  let s = init(1, manifest.levels[0]!);
  for (let i = 0; i < LIVES; i++) {
    const r = current(s)!;
    s = pick(s, r.options.find((o) => o !== r.target)!);
  }
  assert.equal(s.over, true);
  assert.equal(won(s), false);
  assert.equal(pick(s, 'क'), s, 'no moves after game over');
  for (let seed = 1; seed <= 30; seed++) {
    const rng = createRng(seed);
    let t = init(seed, manifest.levels[0]!);
    let guard = 0;
    for (let r = current(t); r; r = current(t)) {
      assert.ok(++guard < 100);
      t = pick(t, rng.pick(r.options));
    }
    assert.equal(t.over, true);
    assert.equal(t.log.length, t.index);
  }
});
`;
  files['Game.tsx'] = `import { type ReactElement, useEffect, useRef, useState } from 'react';
import type { GameProps } from '@sdk';
import { Tile } from '@ui';
import { LIVES, type State, current, init, pick, won } from './logic';

export default function Game({ ctx }: GameProps): ReactElement {
  const [state, setState] = useState<State>(() => init(ctx.seed, ctx.level));
  const finished = useRef(false);
  const round = current(state);

  useEffect(() => {
    ctx.hud({ progress: state.index / state.rounds.length, lives: state.lives, maxLives: LIVES, score: state.score });
    ctx.expose({ phase: state.over ? 'over' : 'playing', answer: round?.target ?? null, options: round?.options ?? [] });
  }, [state, round, ctx]);

  useEffect(() => {
    if (!state.over || finished.current) return;
    finished.current = true;
    ctx.finish({
      outcome: won(state) ? 'won' : 'lost',
      score: state.score,
      correct: state.correct,
      total: state.rounds.length,
      review: state.log.map((l) => ({ sa: l.target, correct: l.correct })),
      mastery: state.log.map((l) => ({ skill: 'akshara' as const, itemId: \`${id}:\${l.target}\`, correct: l.correct })),
    });
  }, [state, ctx]);

  const onPick = (option: string): void => {
    if (!round) return;
    ctx.sfx(option === round.target ? 'correct' : 'wrong');
    setState((s) => pick(s, option));
  };

  return (
    <div className="sk-stage g-${id}">
      <h2 className="sk-h2">Tap the akṣara for “{round?.sound ?? ''}”</h2>
      <div className="g-${id}__grid">
        {(round?.options ?? []).map((o) => (
          <Tile key={o} sa={o} script="deva" size={72} onClick={() => onPick(o)} data-testid={\`opt-\${o}\`} />
        ))}
      </div>
    </div>
  );
}
`;
  files['style.css'] = `/* Every selector must be scoped under .g-${id}; colours only via design tokens. */
.g-${id} { justify-content: center; }
.g-${id}__grid { display: grid; grid-template-columns: repeat(3, auto); gap: var(--s-3); }
`;
  files['e2e.spec.ts'] = `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectNoOverflow, gameSuite } from '${harness}';

gameSuite('${id}', ({ open }) => {
  test('perfect play wins with 3 stars', async () => {
    const g = await open({ seed: 1${labs ? ', labs: true' : ''} });
    for (let i = 0; i < 50; i++) {
      const s = await g.state<{ phase: string; answer: string | null }>();
      if (s.phase !== 'playing' || !s.answer) break;
      await g.tap(\`opt-\${s.answer}\`);
    }
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'won');
    assert.equal(rec.stars, 3);
    await expectNoOverflow(g);
    g.expectClean();
    await g.close();
  });

  test('three wrong taps lose', async () => {
    const g = await open({ seed: 2${labs ? ', labs: true' : ''} });
    for (let i = 0; i < 3; i++) {
      const s = await g.state<{ answer: string; options: string[] }>();
      await g.tap(\`opt-\${s.options.find((o) => o !== s.answer)}\`);
    }
    const rec = await g.expectResult();
    assert.equal(rec.result.outcome, 'lost');
    g.expectClean();
    await g.close();
  });
});
`;
}

files['PRD.md'] = `# ${sa} · ${iast} — ${en}

| | |
|---|---|
| **Id** | \`${id}\` |
| **Status** | ${labs ? 'labs experiment' : 'in-progress'} · v0.1.0 |
| **Kind / inspired by** | TODO |
| **Skills / levels** | TODO |
| **Session** | TODO |

## Learning objective
TODO

## Why people come back
TODO

## Core loop
TODO

## Sanskrit rules
TODO

## Content
TODO

## Modes, levels, scoring
TODO

## Acceptance tests
- \`logic.test.ts\`: TODO
- \`e2e.spec.ts\`: TODO

## Out of scope / later
TODO
`;

mkdirSync(dir, { recursive: true });
for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
generate({ quiet: true });
console.log(`created ${labs ? 'labs' : 'src/games'}/${id}/  (${Object.keys(files).join(', ')})

next:
  1. fill in PRD.md (docs/prd/TEMPLATE.md explains each section)
  2. npm run dev   →  http://127.0.0.1:5173/#/play/${id}${labs ? '?labs=1' : ''}
  3. replace the placeholder logic with your rules; keep tests green
  4. npm run check -- --e2e --game=${id}
`);
