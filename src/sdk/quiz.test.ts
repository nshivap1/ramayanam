import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type ArrangeQuestion,
  type ChoiceQuestion,
  type Given,
  type PairsQuestion,
  type Question,
  type QuizState,
  type TypeQuestion,
  advance,
  correctAnswer,
  createQuiz,
  currentQuestion,
  isCorrect,
  quizProgress,
  quizResult,
  submit,
  validateQuestion,
} from './quiz';
import { createRng } from './rng';

// ───────────────────────────── fixtures (real Sanskrit only) ─────────────────────────────

const choice = (over: Partial<ChoiceQuestion> = {}): ChoiceQuestion => ({
  kind: 'choice',
  id: 'shabda:rama-m:3.1',
  skill: 'vibhakti',
  instruction: 'Choose the tṛtīyā ekavacana of रामः',
  prompt: { sa: 'रामः' },
  options: [
    { id: 'a', sa: 'रामेण' },
    { id: 'b', sa: 'रामाय' },
    { id: 'c', sa: 'रामात्' },
    { id: 'd', sa: 'रामस्य' },
  ],
  answer: 'a',
  explain: { text: 'तृतीया · एकवचनम्' },
  ...over,
});

/** बालकः पुस्तकं पठति — both SOV orders with the verb last are keyed; गच्छति is a distractor. */
const arrange = (over: Partial<ArrangeQuestion> = {}): ArrangeQuestion => ({
  kind: 'arrange',
  id: 'vakya:balaka-pustaka-pathati',
  skill: 'vakya',
  instruction: 'Build the sentence',
  prompt: { text: 'The boy reads a book.' },
  tokens: [
    { id: 't1', sa: 'बालकः' },
    { id: 't2', sa: 'पुस्तकं' },
    { id: 't3', sa: 'पठति' },
    { id: 't4', sa: 'गच्छति' },
  ],
  answers: [
    ['t1', 't2', 't3'],
    ['t2', 't1', 't3'],
  ],
  ...over,
});

const pairs = (over: Partial<PairsQuestion> = {}): PairsQuestion => ({
  kind: 'pairs',
  id: 'vocab:pairs:jala-vrksha-phala',
  skill: 'shabdakosha',
  instruction: 'Tap the matching pairs',
  prompt: { text: 'Match each word with its meaning' },
  left: [
    { id: 'l1', sa: 'जलम्' },
    { id: 'l2', sa: 'वृक्षः' },
    { id: 'l3', sa: 'फलम्' },
  ],
  right: [
    { id: 'r2', text: 'tree' },
    { id: 'r3', text: 'fruit' },
    { id: 'r1', text: 'water' },
  ],
  pairs: { l1: 'r1', l2: 'r2', l3: 'r3' },
  ...over,
});

const typeQ = (over: Partial<TypeQuestion> = {}): TypeQuestion => ({
  kind: 'type',
  id: 'vocab:type:vrksha',
  skill: 'shabdakosha',
  instruction: 'Type the word for “tree”',
  prompt: { text: 'tree' },
  answers: ['वृक्षः'],
  ...over,
});

const ALL: Question[] = [choice(), arrange(), pairs(), typeQ()];
const rightAnswer = (q: Question): Given => (q.kind === 'choice' ? q.answer : q.kind === 'arrange' ? (q.answers[0] as string[]) : q.kind === 'pairs' ? q.pairs : (q.answers[0] as string));
const wrongAnswer = (q: Question): Given => (q.kind === 'choice' ? 'zz-not-an-option' : q.kind === 'arrange' ? [] : q.kind === 'pairs' ? {} : 'क');
/** n distinct valid choice questions. */
const lesson = (n: number): ChoiceQuestion[] => Array.from({ length: n }, (_, i) => choice({ id: `q${i + 1}` }));

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreeze(v);
  }
  return value;
}
/** Answer the current question right or wrong and move on. */
function step(s: QuizState, right: boolean): QuizState {
  const q = currentQuestion(s);
  assert.ok(q, 'step() called on a finished quiz');
  return advance(submit(s, right ? rightAnswer(q) : wrongAnswer(q)));
}
function play(questions: readonly Question[], pattern: (i: number, q: Question) => boolean, options?: Parameters<typeof createQuiz>[1]): QuizState {
  let s = createQuiz(questions, options);
  let i = 0;
  for (let q = currentQuestion(s); q; q = currentQuestion(s)) {
    assert.ok(i < 1000, 'quiz must terminate');
    s = step(s, pattern(i++, q));
  }
  return s;
}
const has = (errs: string[], fragment: string): boolean => errs.some((e) => e.includes(fragment));

// ───────────────────────────── validateQuestion ─────────────────────────────

test('validateQuestion: the fixtures of every kind are valid (an accepted case beside every rejected one)', () => {
  for (const q of ALL) assert.deepEqual(validateQuestion(q), [], q.kind);
});

test('validateQuestion (any kind): missing id and missing instruction are reported', () => {
  for (const q of ALL) {
    assert.ok(has(validateQuestion({ ...q, id: '' }), 'question without id'), q.kind);
    assert.ok(has(validateQuestion({ ...q, instruction: '' }), 'missing instruction'), q.kind);
    assert.equal(validateQuestion({ ...q, instruction: '' }).length, 1, `${q.kind}: exactly one problem`);
    assert.ok(validateQuestion({ ...q, instruction: '' })[0]!.startsWith(`${q.id}:`), 'problems are prefixed with the question id');
  }
});

test('validateQuestion (choice): duplicate option ids', () => {
  const errs = validateQuestion(choice({ options: [{ id: 'a', sa: 'रामेण' }, { id: 'a', sa: 'रामाय' }, { id: 'c', sa: 'रामात्' }] }));
  assert.ok(has(errs, 'duplicate option ids'), String(errs));
});

test('validateQuestion (choice): fewer than two options', () => {
  assert.ok(has(validateQuestion(choice({ options: [{ id: 'a', sa: 'रामेण' }] })), 'needs ≥2 options'));
  assert.ok(has(validateQuestion(choice({ options: [] })), 'needs ≥2 options'));
  assert.deepEqual(validateQuestion(choice({ options: [{ id: 'a', sa: 'रामेण' }, { id: 'b', sa: 'रामाय' }] })), [], 'two options are enough');
});

test('validateQuestion (choice): the answer must be the id of an option', () => {
  assert.ok(has(validateQuestion(choice({ answer: 'zz' })), 'answer id not among options'));
  assert.ok(has(validateQuestion(choice({ answer: 'रामेण' })), 'answer id not among options'), 'the label is not the id');
  assert.ok(has(validateQuestion(choice({ answer: '' })), 'answer id not among options'));
});

test('validateQuestion (choice): two options that look the same to the player are rejected', () => {
  const same = validateQuestion(choice({ options: [{ id: 'a', sa: 'रामेण' }, { id: 'b', sa: 'रामेण' }, { id: 'c', sa: 'रामात्' }] }));
  assert.ok(has(same, 'two options look identical'), String(same));
  const text = validateQuestion(choice({ options: [{ id: 'a', text: 'by Rāma' }, { id: 'b', text: 'by Rāma' }] }));
  assert.ok(has(text, 'two options look identical'));
  // invisible differences do not make options distinguishable
  const zwj = validateQuestion(choice({ options: [{ id: 'a', sa: 'क्ष' }, { id: 'b', sa: 'क्‍ष' }] }));
  assert.ok(has(zwj, 'two options look identical'), 'ZWJ variants look identical');
  const spaces = validateQuestion(choice({ options: [{ id: 'a', text: 'to  Rāma ' }, { id: 'b', text: 'to Rāma' }] }));
  assert.ok(has(spaces, 'two options look identical'), 'whitespace variants look identical');
  // same Sanskrit with different glosses is distinguishable; so is sa vs text
  assert.deepEqual(validateQuestion(choice({ options: [{ id: 'a', sa: 'रामाभ्याम्', text: 'tṛtīyā' }, { id: 'b', sa: 'रामाभ्याम्', text: 'caturthī' }] })), []);
  assert.deepEqual(validateQuestion(choice({ options: [{ id: 'a', sa: 'a' }, { id: 'b', text: 'a' }] })), []);
});

test('validateQuestion (arrange): duplicate token ids', () => {
  const errs = validateQuestion(arrange({ tokens: [{ id: 't1', sa: 'बालकः' }, { id: 't1', sa: 'पठति' }], answers: [['t1']] }));
  assert.ok(has(errs, 'duplicate token ids'), String(errs));
});

test('validateQuestion (arrange): needs at least one accepted answer, none of them empty', () => {
  assert.ok(has(validateQuestion(arrange({ answers: [] })), 'no accepted answers'));
  assert.ok(has(validateQuestion(arrange({ answers: [['t1', 't2', 't3'], []] })), 'empty answer'));
});

test('validateQuestion (arrange): an answer may not use a token twice or use an unknown token', () => {
  assert.ok(has(validateQuestion(arrange({ answers: [['t1', 't1', 't3']] })), 'answer repeats a token'));
  const unknown = validateQuestion(arrange({ answers: [['t1', 't9', 't3']] }));
  assert.ok(has(unknown, 'answer uses unknown token t9'), String(unknown));
  assert.equal(validateQuestion(arrange({ answers: [['t1', 't2', 't3'], ['t8']] })).length, 1, 'only the bad alternative is reported');
});

test('validateQuestion (arrange): the same word may legitimately appear twice in the bank', () => {
  const q = arrange({ tokens: [{ id: 't1', sa: 'रामः' }, { id: 't2', sa: 'च' }, { id: 't3', sa: 'लक्ष्मणः' }, { id: 't4', sa: 'च' }], answers: [['t1', 't2', 't3', 't4']] });
  assert.deepEqual(validateQuestion(q), []);
});

test('validateQuestion (pairs): duplicate left / right ids', () => {
  assert.ok(has(validateQuestion(pairs({ left: [{ id: 'l1', sa: 'जलम्' }, { id: 'l1', sa: 'वृक्षः' }, { id: 'l3', sa: 'फलम्' }] })), 'duplicate left ids'));
  assert.ok(has(validateQuestion(pairs({ right: [{ id: 'r1', text: 'water' }, { id: 'r1', text: 'tree' }, { id: 'r3', text: 'fruit' }] })), 'duplicate right ids'));
});

test('validateQuestion (pairs): both columns must have the same size', () => {
  const errs = validateQuestion(pairs({ right: [{ id: 'r1', text: 'water' }, { id: 'r2', text: 'tree' }, { id: 'r3', text: 'fruit' }, { id: 'r4', text: 'river' }] }));
  assert.ok(has(errs, 'left/right sizes differ'), String(errs));
});

test('validateQuestion (pairs): the mapping must be one-to-one', () => {
  const errs = validateQuestion(pairs({ pairs: { l1: 'r1', l2: 'r1', l3: 'r3' } }));
  assert.ok(has(errs, 'pairs not one-to-one'), String(errs));
});

test('validateQuestion (pairs): every left item needs a partner that exists on the right', () => {
  const missing = validateQuestion(pairs({ pairs: { l1: 'r1', l2: 'r2' } }));
  assert.ok(has(missing, 'left l3 has no valid partner'), String(missing));
  const dangling = validateQuestion(pairs({ pairs: { l1: 'r1', l2: 'r2', l3: 'r9' } }));
  assert.ok(has(dangling, 'left l3 has no valid partner'), String(dangling));
});

test('validateQuestion (pairs): two items in one column that look identical make the round unanswerable', () => {
  // जलम् and वारि both mean "water": tapping जलम् + the "wrong" water would be marked as a mistake.
  const synonyms = pairs({
    left: [{ id: 'l1', sa: 'जलम्' }, { id: 'l2', sa: 'वारि' }],
    right: [{ id: 'r1', text: 'water' }, { id: 'r2', text: 'water' }],
    pairs: { l1: 'r1', l2: 'r2' },
  });
  assert.ok(has(validateQuestion(synonyms), 'two right items look identical'), String(validateQuestion(synonyms)));
  const sameLeft = pairs({
    left: [{ id: 'l1', sa: 'रामाभ्याम्' }, { id: 'l2', sa: 'रामाभ्याम्' }],
    right: [{ id: 'r1', text: 'tṛtīyā dvivacana' }, { id: 'r2', text: 'caturthī dvivacana' }],
    pairs: { l1: 'r1', l2: 'r2' },
  });
  assert.ok(has(validateQuestion(sameLeft), 'two left items look identical'), String(validateQuestion(sameLeft)));
  assert.throws(() => createQuiz([synonyms]), /look identical/);
});

test('validateQuestion (type): needs at least one non-blank accepted answer', () => {
  assert.ok(has(validateQuestion(typeQ({ answers: [] })), 'needs non-empty answers'));
  assert.ok(has(validateQuestion(typeQ({ answers: [''] })), 'needs non-empty answers'));
  assert.ok(has(validateQuestion(typeQ({ answers: ['वृक्षः', '   '] })), 'needs non-empty answers'));
  assert.ok(has(validateQuestion(typeQ({ answers: ['‍'] })), 'needs non-empty answers'), 'a lone joiner is blank');
  assert.deepEqual(validateQuestion(typeQ({ answers: ['मत्यै', 'मतये'] })), []);
});

test('validateQuestion: several problems are all reported at once', () => {
  const errs = validateQuestion(choice({ instruction: '', options: [{ id: 'a', sa: 'रामेण' }], answer: 'q' }));
  assert.equal(errs.length, 3, String(errs));
});

// ───────────────────────────── isCorrect ─────────────────────────────

test('isCorrect (choice): only the keyed option id', () => {
  const q = choice();
  assert.equal(isCorrect(q, 'a'), true);
  for (const g of ['b', 'c', 'd', '', 'A', ' a', 'रामेण']) assert.equal(isCorrect(q, g), false, `given ${JSON.stringify(g)}`);
  assert.equal(isCorrect(q, ['a']), false, 'wrong shape');
  assert.equal(isCorrect(q, { a: 'a' }), false, 'wrong shape');
});

test('isCorrect (arrange): every keyed order is accepted — Sanskrit word order is free', () => {
  const q = arrange();
  assert.equal(isCorrect(q, ['t1', 't2', 't3']), true);
  assert.equal(isCorrect(q, ['t2', 't1', 't3']), true);
});

test('isCorrect (arrange): un-keyed orders, partial, over-long and distractor answers are wrong', () => {
  const q = arrange();
  const wrong: Given[] = [['t3', 't2', 't1'], ['t1', 't3', 't2'], ['t1', 't2'], ['t1'], [], ['t1', 't2', 't3', 't4'], ['t1', 't2', 't4'], ['t4', 't2', 't3'], ['t1', 't2', 'nope'], 't1 t2 t3', { 0: 't1', 1: 't2', 2: 't3' }];
  for (const g of wrong) assert.equal(isCorrect(q, g), false, `given ${JSON.stringify(g)}`);
});

test('isCorrect (arrange): identical-looking tokens are interchangeable (रामः च लक्ष्मणः च)', () => {
  const q = arrange({ tokens: [{ id: 't1', sa: 'रामः' }, { id: 't2', sa: 'च' }, { id: 't3', sa: 'लक्ष्मणः' }, { id: 't4', sa: 'च' }, { id: 't5', sa: 'सीता' }], answers: [['t1', 't2', 't3', 't4']] });
  assert.equal(isCorrect(q, ['t1', 't2', 't3', 't4']), true);
  assert.equal(isCorrect(q, ['t1', 't4', 't3', 't2']), true, 'the player cannot know which च is "t2" — the sentence on screen is identical');
  assert.equal(isCorrect(q, ['t3', 't2', 't1', 't4']), false, 'a different sentence is still wrong unless it is keyed');
  assert.equal(isCorrect(q, ['t1', 't2', 't3', 't2']), false, 'one token cannot be used twice');
  assert.equal(isCorrect(q, ['t1', 't2', 't5', 't4']), false);
  // a distractor that duplicates a needed word is as good as the original
  const d = arrange({ tokens: [{ id: 't1', sa: 'बालकः' }, { id: 't2', sa: 'पठति' }, { id: 'x', sa: 'पठति' }], answers: [['t1', 't2']] });
  assert.equal(isCorrect(d, ['t1', 'x']), true);
  assert.equal(isCorrect(d, ['x', 't1']), false);
});

test('isCorrect (pairs): the full keyed mapping, in any key order; anything less is wrong', () => {
  const q = pairs();
  assert.equal(isCorrect(q, { l1: 'r1', l2: 'r2', l3: 'r3' }), true);
  assert.equal(isCorrect(q, { l3: 'r3', l1: 'r1', l2: 'r2' }), true);
  assert.equal(isCorrect(q, { l1: 'r1', l2: 'r2', l3: 'r3', extra: 'ignored' }), true);
  const wrong: Given[] = [{ l1: 'r1', l2: 'r3', l3: 'r2' }, { l1: 'r1', l2: 'r2' }, {}, { r1: 'l1', r2: 'l2', r3: 'l3' }, ['r1', 'r2', 'r3'], 'l1:r1'];
  for (const g of wrong) assert.equal(isCorrect(q, g), false, `given ${JSON.stringify(g)}`);
});

test('isCorrect (type): exact match after NFC, joiner and whitespace normalisation', () => {
  const q = typeQ({ answers: ['रामः गच्छति'] });
  assert.equal(isCorrect(q, 'रामः गच्छति'), true);
  assert.equal(isCorrect(q, '  रामः   गच्छति '), true, 'leading / trailing / repeated spaces');
  assert.equal(isCorrect(q, 'रामः\tगच्छति\n'), true, 'tabs and newlines are spaces');
  assert.equal(isCorrect(q, 'रामः गच्छति'), true, 'no-break space');
  assert.equal(isCorrect(q, 'रामः ग‍च्छति'), true, 'ZWJ is ignored');
  assert.equal(isCorrect(q, 'रामः गच्‌छति'), true, 'ZWNJ is ignored');
  assert.equal(isCorrect(q, 'रामःगच्छति'), false, 'a missing space is a different answer');
  assert.equal(isCorrect(q, 'रामः गच्छन्ति'), false);
  assert.equal(isCorrect(q, 'रामाः गच्छति'), false);
  assert.equal(isCorrect(q, ''), false);
  assert.equal(isCorrect(q, ['रामः गच्छति']), false, 'wrong shape');
});

test('isCorrect (type): NFC — a decomposed and a precomposed spelling of the same letter are equal', () => {
  // U+0929 (ऩ) canonically equals U+0928 U+093C; NFC composes the pair.
  assert.notEqual('ऩ', 'ऩ');
  assert.equal(isCorrect(typeQ({ answers: ['ऩ'] }), 'ऩ'), true);
  assert.equal(isCorrect(typeQ({ answers: ['ऩ'] }), 'ऩ'), true);
  // the normalisation applies to the key as well as to the input
  assert.equal(isCorrect(typeQ({ answers: [' क्‍ष '] }), 'क्ष'), true);
});

test('isCorrect (type): every listed alternative (vikalpa) is accepted, nothing else is inferred', () => {
  const q = typeQ({ answers: ['मत्यै', 'मतये'] });
  assert.equal(isCorrect(q, 'मत्यै'), true);
  assert.equal(isCorrect(q, 'मतये'), true);
  assert.equal(isCorrect(q, 'मत्याः'), false);
  // anusvāra vs explicit nasal IS folded (spellingKey): both spellings of the same word are correct
  assert.equal(isCorrect(typeQ({ answers: ['सङ्ख्या'] }), 'संख्या'), true);
  assert.equal(isCorrect(typeQ({ answers: ['फलम्'] }), 'फलं'), true);
  assert.equal(isCorrect(typeQ({ answers: ['संस्कृतम्'] }), 'सम्स्कृतम्'), false);
});

// ───────────────────────────── createQuiz ─────────────────────────────

test('createQuiz: rejects an empty list', () => {
  assert.throws(() => createQuiz([]), /no questions/);
});

test('createQuiz: rejects any invalid question, naming the problem', () => {
  assert.throws(() => createQuiz([choice(), choice({ id: 'bad', answer: 'zz' })]), /Invalid question: bad: answer id not among options/);
  assert.throws(() => createQuiz([arrange({ answers: [] })]), /no accepted answers/);
  assert.throws(() => createQuiz([pairs({ pairs: {} })]), /no valid partner/);
  assert.throws(() => createQuiz([typeQ({ answers: [] })]), /non-empty answers/);
  assert.throws(() => createQuiz([choice({ id: '' })]), /question without id/);
});

test('createQuiz: initial state and defaults (3 lives, retry on, 10 points)', () => {
  const s = createQuiz(ALL);
  assert.deepEqual(
    { index: s.index, firstPass: s.firstPass, lives: s.lives, maxLives: s.maxLives, status: s.status, outcome: s.outcome, last: s.last, history: s.history, streak: s.streak, bestStreak: s.bestStreak, score: s.score, retried: s.retried, opts: s.opts },
    { index: 0, firstPass: 4, lives: 3, maxLives: 3, status: 'asking', outcome: null, last: null, history: [], streak: 0, bestStreak: 0, score: 0, retried: [], opts: { lives: 3, retryWrong: true, points: 10 } },
  );
  assert.deepEqual(s.queue, ALL);
  assert.equal(currentQuestion(s), ALL[0]);
  assert.equal(quizProgress(s), 0);
});

test('createQuiz: options are honoured, including lives: 0', () => {
  const s = createQuiz(ALL, { lives: 0, retryWrong: false, points: 25 });
  assert.deepEqual(s.opts, { lives: 0, retryWrong: false, points: 25 });
  assert.equal(s.lives, 0);
  assert.equal(s.maxLives, 0);
  assert.equal(createQuiz(ALL, { lives: 5 }).lives, 5);
  assert.deepEqual(createQuiz(ALL, { lives: 5 }).opts, { lives: 5, retryWrong: true, points: 10 });
});

test('createQuiz: copies the question list (later changes to the caller’s array do not leak in)', () => {
  const list = lesson(3);
  const s = createQuiz(list);
  list.push(choice({ id: 'late' }));
  list.reverse();
  assert.equal(s.queue.length, 3);
  assert.deepEqual(s.queue.map((q) => q.id), ['q1', 'q2', 'q3']);
});

// ───────────────────────────── submit / advance ─────────────────────────────

test('submit (correct): asking → feedback, history and score updated, lives untouched', () => {
  const s0 = createQuiz(lesson(3));
  const s1 = submit(s0, 'a');
  assert.equal(s1.status, 'feedback');
  assert.equal(s1.index, 0, 'the index moves on advance, not on submit');
  assert.deepEqual(s1.last, { question: s0.queue[0], given: 'a', correct: true, mistakes: 0 });
  assert.deepEqual(s1.history, [s1.last]);
  assert.equal(s1.lives, 3);
  assert.equal(s1.score, 10);
  assert.equal(s1.streak, 1);
  assert.equal(s1.queue.length, 3);
  assert.equal(currentQuestion(s1), s0.queue[0], 'the question stays on screen during feedback');
});

test('submit (wrong): a life is lost, the streak resets, no points, the question is queued again', () => {
  const s1 = submit(submit(createQuiz(lesson(3)), 'a'), 'x'); // second submit is a no-op (feedback state)
  const s2 = submit(advance(s1), 'b');
  assert.equal(s2.status, 'feedback');
  assert.equal(s2.last!.correct, false);
  assert.equal(s2.lives, 2);
  assert.equal(s2.streak, 0);
  assert.equal(s2.bestStreak, 1);
  assert.equal(s2.score, 10);
  assert.deepEqual(s2.queue.map((q) => q.id), ['q1', 'q2', 'q3', 'q2']);
  assert.deepEqual(s2.retried, ['q2']);
  assert.equal(s2.firstPass, 3, 'retries never change the first-pass count');
});

test('submit: `mistakes` > 0 makes an otherwise complete pairs answer incorrect', () => {
  const s = createQuiz([pairs(), choice()]);
  const clean = submit(s, pairs().pairs, 0);
  assert.equal(clean.last!.correct, true);
  const fumbled = submit(s, pairs().pairs, 2);
  assert.equal(fumbled.last!.correct, false);
  assert.equal(fumbled.last!.mistakes, 2);
  assert.equal(fumbled.lives, 2);
  assert.deepEqual(fumbled.retried, [pairs().id]);
});

test('advance: feedback → asking the next question; `last` is cleared', () => {
  const s = advance(submit(createQuiz(lesson(3)), 'a'));
  assert.equal(s.status, 'asking');
  assert.equal(s.index, 1);
  assert.equal(s.last, null);
  assert.equal(currentQuestion(s)!.id, 'q2');
  assert.equal(s.history.length, 1, 'history is kept');
});

test('advance: after the last answer → done / completed, no current question', () => {
  const s = play(lesson(3), () => true);
  assert.equal(s.status, 'done');
  assert.equal(s.outcome, 'completed');
  assert.equal(s.index, 3);
  assert.equal(currentQuestion(s), null);
  assert.equal(quizProgress(s), 1);
});

test('submit and advance are no-ops (same object) in the wrong state', () => {
  const asking = createQuiz(lesson(2));
  assert.equal(advance(asking), asking, 'advance while asking');
  const feedback = submit(asking, 'a');
  assert.equal(submit(feedback, 'b'), feedback, 'submit during feedback (double tap on Check)');
  assert.equal(submit(feedback, 'a'), feedback);
  const done = play(lesson(2), () => true);
  assert.equal(submit(done, 'a'), done, 'submit after the end');
  assert.equal(advance(done), done, 'advance after the end');
  const lostQuiz = play(lesson(5), () => false);
  assert.equal(lostQuiz.outcome, 'lost');
  assert.equal(submit(lostQuiz, 'a'), lostQuiz);
  assert.equal(advance(lostQuiz), lostQuiz);
  assert.equal(currentQuestion(lostQuiz), null);
});

// ───────────────────────────── lives ─────────────────────────────

test('lives: one per wrong answer; the quiz is lost when they reach 0 — but only after the feedback is shown', () => {
  let s = createQuiz(lesson(6));
  s = step(s, false);
  assert.equal(s.lives, 2);
  s = step(s, false);
  assert.equal(s.lives, 1);
  assert.equal(s.status, 'asking');
  const third = submit(s, 'x');
  assert.equal(third.lives, 0);
  assert.equal(third.status, 'feedback', 'the player still sees why the last answer was wrong');
  assert.equal(third.outcome, null);
  assert.ok(currentQuestion(third), 'and which question it was');
  const end = advance(third);
  assert.equal(end.status, 'done');
  assert.equal(end.outcome, 'lost');
  assert.equal(end.history.length, 3);
});

test('lives: correct answers never cost a life; lives never go below 0', () => {
  const s = play(lesson(10), (i) => i !== 4, { lives: 3 });
  assert.equal(s.lives, 2);
  assert.equal(s.outcome, 'completed');
  for (let seed = 1; seed <= 30; seed++) {
    const rng = createRng(seed);
    let q = createQuiz(lesson(8), { lives: 2 });
    while (currentQuestion(q)) {
      q = step(q, rng.chance(0.5));
      assert.ok(q.lives >= 0 && q.lives <= q.maxLives);
    }
  }
});

test('lives: losing the last life on the final question is still a loss', () => {
  const s = play(lesson(3), (i) => i < 2 ? false : false, { lives: 3 });
  assert.equal(s.outcome, 'lost');
  const lastQuestion = play(lesson(3), (i) => i === 2 ? false : true, { lives: 1 });
  assert.equal(lastQuestion.outcome, 'lost');
  assert.equal(lastQuestion.history.length, 3);
});

test('lives: 1 life — the first mistake ends the quiz after its feedback', () => {
  const s = play(lesson(5), (i) => i !== 1, { lives: 1 });
  assert.equal(s.outcome, 'lost');
  assert.equal(s.history.length, 2);
});

test('lives: 0 means unlimited — any number of mistakes still completes', () => {
  const s = play(lesson(6), () => false, { lives: 0 });
  assert.equal(s.outcome, 'completed');
  assert.equal(s.lives, 0);
  assert.equal(s.history.length, 12, '6 first-pass + 6 retries');
  assert.ok(s.history.every((a) => !a.correct));
  assert.equal(s.score, 0);
});

// ───────────────────────────── retryWrong ─────────────────────────────

test('retryWrong: wrong questions come back at the end, in the order they were missed', () => {
  let s = createQuiz(lesson(5), { lives: 0 });
  const asked: string[] = [];
  const wrongIds = new Set(['q2', 'q4']);
  for (let q = currentQuestion(s); q; q = currentQuestion(s)) {
    asked.push(q.id);
    const firstTime = asked.filter((id) => id === q.id).length === 1;
    s = step(s, !(firstTime && wrongIds.has(q.id)));
  }
  assert.deepEqual(asked, ['q1', 'q2', 'q3', 'q4', 'q5', 'q2', 'q4']);
  assert.equal(s.outcome, 'completed');
});

test('retryWrong: a question is re-queued once only, even if the retry is wrong too', () => {
  const s = play(lesson(3), (_i, q) => q.id !== 'q2', { lives: 0 });
  assert.deepEqual(s.history.map((a) => a.question.id), ['q1', 'q2', 'q3', 'q2']);
  assert.deepEqual(s.history.map((a) => a.correct), [true, false, true, false]);
  assert.deepEqual(s.retried, ['q2']);
  assert.equal(s.queue.length, 4);
  assert.equal(s.outcome, 'completed', 'the quiz ends rather than looping for ever');
});

test('retryWrong: a wrong answer on the very last question still gets its retry', () => {
  const s = play(lesson(3), (i) => i !== 2, { lives: 0 });
  assert.deepEqual(s.history.map((a) => a.question.id), ['q1', 'q2', 'q3', 'q3']);
  assert.equal(s.history[3]!.correct, true);
});

test('retryWrong: false — nothing is asked twice', () => {
  const s = play(lesson(4), (i) => i % 2 === 0, { lives: 0, retryWrong: false });
  assert.equal(s.history.length, 4);
  assert.equal(s.queue.length, 4);
  assert.deepEqual(s.retried, []);
  assert.equal(s.outcome, 'completed');
});

test('retryWrong: retries cost lives like any other answer', () => {
  const s = play(lesson(3), (_i, q) => q.id !== 'q1', { lives: 2 });
  // q1 ✕ (1 life left), q2 ✓, q3 ✓, q1 again ✕ (0 left) → lost
  assert.deepEqual(s.history.map((a) => a.question.id), ['q1', 'q2', 'q3', 'q1']);
  assert.equal(s.lives, 0);
  assert.equal(s.outcome, 'lost');
});

// ───────────────────────────── scoring ─────────────────────────────

test('scoring: 10 per correct answer + 2 per step of the streak, bonus capped at +10', () => {
  let s = createQuiz(lesson(9));
  const gained: number[] = [];
  for (let i = 0; i < 9; i++) {
    const before = s.score;
    s = step(s, true);
    gained.push(s.score - before);
  }
  assert.deepEqual(gained, [10, 12, 14, 16, 18, 20, 20, 20, 20]);
  assert.equal(s.score, 150);
  assert.equal(s.bestStreak, 9);
});

test('scoring: a wrong answer scores 0 and restarts the streak bonus; bestStreak remembers the longest run', () => {
  let s = createQuiz(lesson(8), { lives: 0, retryWrong: false });
  const gained: number[] = [];
  for (const right of [true, true, true, false, true, true, false, true]) {
    const before = s.score;
    s = step(s, right);
    gained.push(s.score - before);
  }
  assert.deepEqual(gained, [10, 12, 14, 0, 10, 12, 0, 10]);
  assert.equal(s.bestStreak, 3);
  assert.equal(s.streak, 1);
});

test('scoring: custom points keep the same streak bonus', () => {
  let s = createQuiz(lesson(3), { points: 100 });
  s = step(step(step(s, true), true), true);
  assert.equal(s.score, 100 + 102 + 104);
});

// ───────────────────────────── quizProgress ─────────────────────────────

test('quizProgress: 0 at the start, 1 at the end, counts the answered question during feedback', () => {
  let s = createQuiz(lesson(4));
  assert.equal(quizProgress(s), 0);
  s = submit(s, 'a');
  assert.equal(quizProgress(s), 0.25);
  s = advance(s);
  assert.equal(quizProgress(s), 0.25);
  s = advance(submit(s, 'a'));
  assert.equal(quizProgress(s), 0.5);
  s = advance(submit(advance(submit(s, 'a')), 'a'));
  assert.equal(quizProgress(s), 1);
});

test('quizProgress: never decreases and stays within [0, 1], whatever the player does (random bots × 300 seeds)', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = createRng(seed);
    const opts = { lives: rng.pick([0, 1, 3, 5]), retryWrong: rng.chance(0.8) };
    const questions = rng.shuffle([...lesson(rng.range(1, 8)), arrange(), pairs(), typeQ()]);
    let s = createQuiz(questions, opts);
    let prev = quizProgress(s);
    assert.equal(prev, 0);
    let guard = 0;
    while (s.status !== 'done') {
      assert.ok(++guard < 200, `seed ${seed} does not terminate`);
      const q = currentQuestion(s) as Question;
      s = s.status === 'asking' ? submit(s, rng.chance(0.6) ? rightAnswer(q) : wrongAnswer(q)) : advance(s);
      const p = quizProgress(s);
      assert.ok(p >= prev, `seed ${seed}: progress went back from ${prev} to ${p}`);
      assert.ok(p >= 0 && p <= 1, `seed ${seed}: progress ${p}`);
      prev = p;
    }
    if (s.outcome === 'completed') assert.equal(prev, 1, `seed ${seed}: a completed quiz ends at 100 %`);
    else assert.ok(prev > 0 && prev <= 1);
    // invariants of a finished quiz
    assert.ok(s.history.length <= s.queue.length);
    assert.ok(s.queue.length <= s.firstPass * 2, 'at most one retry per question');
    assert.equal(s.firstPass, questions.length);
    assert.equal(new Set(s.retried).size, s.retried.length);
    const r = quizResult(s);
    assert.ok((r.correct as number) <= (r.total as number) && (r.total as number) <= s.firstPass);
    assert.equal(r.outcome, s.outcome);
    assert.equal(r.score, s.score);
  }
});

// ───────────────────────────── correctAnswer ─────────────────────────────

test('correctAnswer (choice): the keyed option’s content, including a locked script', () => {
  assert.equal(correctAnswer(choice()).sa, 'रामेण');
  assert.equal(correctAnswer(choice()).text, undefined);
  const textual = correctAnswer(choice({ options: [{ id: 'a', text: 'ka' }, { id: 'b', text: 'kha' }], answer: 'b' }));
  assert.equal(textual.text, 'kha');
  assert.equal(textual.sa, undefined);
  const locked = correctAnswer(choice({ options: [{ id: 'a', sa: 'क', script: 'deva' }, { id: 'b', sa: 'ख', script: 'deva' }], answer: 'a' }));
  assert.equal(locked.sa, 'क');
  assert.equal(locked.script, 'deva');
  const both = correctAnswer(choice({ options: [{ id: 'a', sa: 'रामेण', text: 'by Rāma' }, { id: 'b', sa: 'रामाय', text: 'for Rāma' }], answer: 'b' }));
  assert.equal(both.sa, 'रामाय');
  assert.equal(both.text, 'for Rāma');
});

test('correctAnswer (arrange): the FIRST keyed order, joined with spaces, without distractors', () => {
  assert.deepEqual(correctAnswer(arrange()), { sa: 'बालकः पुस्तकं पठति' });
  assert.deepEqual(correctAnswer(arrange({ answers: [['t2', 't1', 't3'], ['t1', 't2', 't3']] })), { sa: 'पुस्तकं बालकः पठति' });
  const english = arrange({ tokens: [{ id: 'a', text: 'The boy' }, { id: 'b', text: 'reads' }], answers: [['a', 'b']] });
  assert.deepEqual(correctAnswer(english), { text: 'The boy reads' });
  const mixed = arrange({ tokens: [{ id: 'a', sa: 'रामः' }, { id: 'b', text: '+' }, { id: 'c', sa: 'सीता' }], answers: [['a', 'b', 'c']] });
  assert.deepEqual(correctAnswer(mixed), { text: 'रामः + सीता' }, 'mixed content cannot be rendered as Sanskrit');
});

test('correctAnswer (pairs): "left — right" for every pair, in left-column order', () => {
  assert.deepEqual(correctAnswer(pairs()), { text: 'जलम् — water · वृक्षः — tree · फलम् — fruit' });
});

test('correctAnswer (type): the first (canonical) accepted answer', () => {
  assert.deepEqual(correctAnswer(typeQ({ answers: ['मत्यै', 'मतये'] })), { sa: 'मत्यै' });
});

test('correctAnswer is itself accepted by isCorrect for the keyed answer of every kind', () => {
  for (const q of ALL) assert.equal(isCorrect(q, rightAnswer(q)), true, q.kind);
  for (const q of ALL) assert.equal(isCorrect(q, wrongAnswer(q)), false, q.kind);
});

// ───────────────────────────── quizResult ─────────────────────────────

test('quizResult: a perfect run', () => {
  const s = play(ALL, () => true);
  const r = quizResult(s);
  assert.equal(r.outcome, 'completed');
  assert.equal(r.correct, 4);
  assert.equal(r.total, 4);
  assert.equal(r.score, 10 + 12 + 14 + 16);
  assert.deepEqual(r.best, { label: 'Best streak', value: 4 });
  assert.equal(r.summary, '4 / 4 correct');
  assert.deepEqual(r.mastery, [
    { skill: 'vibhakti', itemId: 'shabda:rama-m:3.1', correct: true },
    { skill: 'vakya', itemId: 'vakya:balaka-pustaka-pathati', correct: true },
    { skill: 'shabdakosha', itemId: 'vocab:pairs:jala-vrksha-phala', correct: true },
    { skill: 'shabdakosha', itemId: 'vocab:type:vrksha', correct: true },
  ]);
  assert.equal(r.review!.length, 4);
  assert.equal(r.stars, undefined, 'stars are derived by the shell from accuracy');
  assert.equal(r.share, undefined);
});

test('quizResult: accuracy, mastery and review count first-pass answers only — a correct retry does not erase the miss', () => {
  const s = play(lesson(5), (i) => i !== 1 && i !== 3, { lives: 0 }); // q2 and q4 wrong first time, right on retry
  assert.equal(s.history.length, 7);
  const r = quizResult(s);
  assert.equal(r.outcome, 'completed');
  assert.equal(r.correct, 3);
  assert.equal(r.total, 5);
  assert.equal(r.summary, '3 / 5 correct');
  assert.deepEqual(r.mastery!.map((m) => [m.itemId, m.correct]), [['q1', true], ['q2', false], ['q3', true], ['q4', false], ['q5', true]]);
  assert.deepEqual(r.review!.map((x) => x.correct), [true, false, true, false, true]);
  assert.equal(new Set(r.mastery!.map((m) => m.itemId)).size, 5, 'one mastery event per fact');
});

test('quizResult: a wrong retry does not count twice against the player', () => {
  const s = play(lesson(4), (_i, q) => q.id !== 'q3', { lives: 0 });
  const r = quizResult(s);
  assert.equal(r.correct, 3);
  assert.equal(r.total, 4);
  assert.equal(r.mastery!.filter((m) => !m.correct).length, 1);
});

test('quizResult: a lost quiz reports the full first-pass total, so unanswered questions count against accuracy', () => {
  const s = play(lesson(10), (i) => i === 0, { lives: 3 }); // ✓ ✕ ✕ ✕ → lost after 4 answers
  const r = quizResult(s);
  assert.equal(r.outcome, 'lost');
  assert.equal(r.correct, 1);
  assert.equal(r.total, 10);
  assert.equal(r.summary, '1 / 10 correct');
  assert.equal(r.mastery!.length, 4, 'mastery events only for questions actually answered');
  assert.equal(r.review!.length, 4);
});

test('quizResult: bestStreak includes retries; score matches the state', () => {
  const s = play(lesson(4), (i) => i !== 0, { lives: 0 }); // ✕ ✓ ✓ ✓ then retry ✓
  const r = quizResult(s);
  assert.deepEqual(r.best, { label: 'Best streak', value: 4 });
  assert.equal(r.correct, 3);
  assert.equal(r.score, s.score);
});

test('quizResult: review entries are displayable for every kind', () => {
  const r = quizResult(play(ALL, (i) => i % 2 === 0, { lives: 0, retryWrong: false }));
  const [c, a, p, t] = r.review as [NonNullable<typeof r.review>[number], NonNullable<typeof r.review>[number], NonNullable<typeof r.review>[number], NonNullable<typeof r.review>[number]];
  assert.deepEqual(c, { sa: 'रामेण', en: 'तृतीया · एकवचनम्', note: 'तृतीया · एकवचनम्', correct: true });
  assert.deepEqual(a, { sa: 'बालकः पुस्तकं पठति', en: 'The boy reads a book.', note: undefined, correct: false });
  assert.equal(p.sa, '', 'pairs have no single Sanskrit answer');
  assert.equal(p.en, 'जलम् — water · वृक्षः — tree · फलम् — fruit');
  assert.equal(p.correct, true);
  assert.deepEqual(t, { sa: 'वृक्षः', en: 'tree', note: undefined, correct: false });
});

// ───────────────────────────── immutability ─────────────────────────────

test('immutability: submit and advance accept deep-frozen states and questions and never change them', () => {
  const questions = deepFreeze([choice({ id: 'q1' }), arrange(), pairs(), typeQ()] as Question[]);
  let s = deepFreeze(createQuiz(questions, deepFreeze({ lives: 3 })));
  const snapshots: [QuizState, string][] = [];
  let i = 0;
  while (s.status !== 'done') {
    snapshots.push([s, JSON.stringify(s)]);
    const q = currentQuestion(s) as Question;
    let next: QuizState | undefined;
    assert.doesNotThrow(() => {
      next = s.status === 'asking' ? submit(s, deepFreeze(i++ % 3 === 0 ? wrongAnswer(q) : rightAnswer(q))) : advance(s);
    });
    assert.notEqual(next, s, 'a real transition returns a new object');
    s = deepFreeze(next as QuizState);
  }
  for (const [state, json] of snapshots) assert.equal(JSON.stringify(state), json, 'an earlier state changed after later transitions');
  assert.doesNotThrow(() => quizResult(s));
  assert.doesNotThrow(() => quizProgress(s));
  assert.equal(questions.length, 4);
});

test('immutability: queue, history and retried are fresh arrays on every submit (no aliasing between states)', () => {
  const s0 = createQuiz(lesson(3));
  const s1 = submit(s0, 'x');
  assert.notEqual(s1.queue, s0.queue);
  assert.notEqual(s1.history, s0.history);
  assert.notEqual(s1.retried, s0.retried);
  assert.equal(s0.queue.length, 3);
  assert.equal(s0.history.length, 0);
  assert.equal(s0.retried.length, 0);
  // two different futures from the same state do not interfere
  const right = submit(s0, 'a');
  assert.equal(right.queue.length, 3);
  assert.equal(s1.queue.length, 4);
});

test('determinism: the same answers always lead to deeply equal states and results', () => {
  const script = [true, false, true, true, false, true, true, true];
  const run = (): QuizState => play(lesson(6), (i) => script[i] ?? true, { lives: 0 });
  assert.deepEqual(run(), run());
  assert.deepEqual(quizResult(run()), quizResult(run()));
});
