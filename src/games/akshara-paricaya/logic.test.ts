import { test } from 'node:test';
import assert from 'node:assert/strict';
import { devaToIast, iastToDeva, validateDeva } from '@sanskrit';
import { type Option, type Question, advance, assertValidQuestions, createQuiz, currentQuestion, quizResult, submit } from '@sdk';
import { CONJUNCTS, CONSONANTS, QUESTIONS_PER_LESSON, STAGES, SYLLABLES, VOWELS, buildLesson, currentStage } from './logic';

const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 13);

test('pools: every akṣara is well-formed Devanagari and unique', () => {
  for (const stage of STAGES) {
    assert.equal(new Set(stage.pool).size, stage.pool.length, `${stage.id} has duplicates`);
    for (const a of stage.pool) assert.deepEqual(validateDeva(a), { ok: true, errors: [] }, `${a} is malformed`);
  }
  assert.equal(VOWELS.length, 15);
  assert.equal(CONSONANTS.length, 33);
  assert.equal(SYLLABLES.length, 120);
  assert.ok(CONJUNCTS.length >= 40);
});

test('pools: romanisation is unique within a stage and round-trips', () => {
  for (const stage of STAGES) {
    const seen = new Map<string, string>();
    for (const a of stage.pool) {
      const r = devaToIast(a);
      assert.ok(!seen.has(r), `${a} and ${seen.get(r)} both romanise to ${r}`);
      seen.set(r, a);
      assert.equal(iastToDeva(r), a, `round trip failed for ${a} (${r})`);
    }
  }
});

test('known romanisations (hand-checked sample)', () => {
  const expected: Record<string, string> = { अ: 'a', ऋ: 'ṛ', ॠ: 'ṝ', ऐ: 'ai', 'अं': 'aṃ', 'अः': 'aḥ', ङ: 'ṅa', ञ: 'ña', ण: 'ṇa', श: 'śa', ष: 'ṣa', 'क्ष': 'kṣa', 'ज्ञ': 'jña', 'श्र': 'śra', 'कृ': 'kṛ', 'रू': 'rū', 'हृ': 'hṛ', 'दं': 'daṃ', 'नः': 'naḥ', 'ङ्क': 'ṅka', 'ञ्च': 'ñca', 'र्य': 'rya' };
  for (const [d, r] of Object.entries(expected)) assert.equal(devaToIast(d), r);
});

test('lessons: valid, deterministic, right size, for every stage and many seeds', () => {
  for (let stage = 0; stage < STAGES.length; stage++) {
    for (const seed of SEEDS) {
      const qs = buildLesson(stage, seed);
      assert.equal(qs.length, QUESTIONS_PER_LESSON);
      assertValidQuestions(qs);
      assert.deepEqual(buildLesson(stage, seed), qs, 'same seed must give the same lesson');
    }
  }
  assert.notDeepEqual(buildLesson(0, 1), buildLesson(0, 2));
});

test('lessons: the keyed answer is truly correct and no distractor is also correct', () => {
  for (let stage = 0; stage < STAGES.length; stage++) {
    for (const seed of SEEDS) {
      for (const q of buildLesson(stage, seed)) {
        if (q.kind === 'choice') {
          const target = q.answer;
          const shown = q.prompt.sa ?? q.prompt.text ?? '';
          const reading = q.prompt.sa !== undefined;
          assert.equal(reading ? shown : iastToDeva(shown), target);
          assert.equal(q.options.length, 4);
          const labels = q.options.map((o) => (reading ? (o.text ?? '') : devaToIast(o.sa ?? '')));
          assert.equal(new Set(labels).size, 4, `ambiguous options in ${q.id}: ${labels.join(', ')}`);
          assert.equal(labels.filter((l) => l === devaToIast(target)).length, 1);
          if (reading) assert.equal(q.prompt.script, 'deva', 'script-teaching prompts must lock Devanagari');
        } else if (q.kind === 'pairs') {
          for (const l of q.left) {
            const partner: Option | undefined = q.right.find((x) => x.id === q.pairs[l.id]);
            assert.equal(partner?.text, devaToIast(l.sa ?? ''));
          }
        } else assert.fail(`unexpected kind ${q.kind}`);
      }
    }
  }
});

test('a perfect bot completes with 3 stars; a failing bot loses', () => {
  const answerOf = (q: Question): string | Record<string, string> => (q.kind === 'choice' ? q.answer : q.kind === 'pairs' ? q.pairs : '');
  let s = createQuiz(buildLesson(1, 99));
  for (let q = currentQuestion(s); q; q = currentQuestion(s)) s = advance(submit(s, answerOf(q)));
  const r = quizResult(s);
  assert.equal(r.outcome, 'completed');
  assert.equal(r.correct, QUESTIONS_PER_LESSON);
  assert.equal(r.mastery?.length, QUESTIONS_PER_LESSON);

  let f = createQuiz(buildLesson(1, 99));
  for (let q = currentQuestion(f); q; q = currentQuestion(f)) f = advance(submit(f, 'definitely-wrong'));
  assert.equal(quizResult(f).outcome, 'lost');
});

test('stage unlocking', () => {
  assert.equal(currentStage([]), 0);
  assert.equal(currentStage([1]), 0);
  assert.equal(currentStage([2]), 1);
  assert.equal(currentStage([3, 3, 1]), 2);
  assert.equal(currentStage([3, 3, 3, 3]), 3);
});
