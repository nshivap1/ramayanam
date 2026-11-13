import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChoiceQuestion } from './quiz';
import { assertValidQuestions, testMatrix, validateManifest } from './testing';
import { type GameManifest, LEVELS, SKILLS } from './types';

const base = (): GameManifest => ({
  id: 'pada-shodha',
  version: '1.2.3',
  title: { sa: 'पदशोधः', iast: 'Pada-śodhaḥ', en: 'Word hunt' },
  tagline: 'Guess the hidden word in six tries',
  description: 'A daily word puzzle: guess the hidden Sanskrit word, akṣara by akṣara.',
  kind: 'daily',
  skills: ['shabdakosha', 'akshara'],
  levels: [1, 2],
  modes: ['daily', 'practice'],
  minutes: 3,
  icon: 'प',
  hue: 'teal',
  status: 'beta',
  howToPlay: ['Type a word.', 'Green means right place.'],
  content: ['vocab'],
});
const errorsFor = (over: Partial<GameManifest> | Record<string, unknown>, folder?: string): string[] => validateManifest({ ...base(), ...over } as GameManifest, folder);
/** Exactly one problem, mentioning `fragment`, prefixed with the game id. */
function assertOnly(over: Partial<GameManifest> | Record<string, unknown>, fragment: string, folder?: string): void {
  const errs = errorsFor(over, folder);
  assert.equal(errs.length, 1, `expected exactly one problem for ${JSON.stringify(over)}, got ${JSON.stringify(errs)}`);
  assert.ok(errs[0]!.includes(fragment), `"${errs[0]}" should mention "${fragment}"`);
}
const assertOk = (over: Partial<GameManifest> | Record<string, unknown>, folder?: string): void => assert.deepEqual(errorsFor(over, folder), [], JSON.stringify(over));

// ───────────────────────────── validateManifest: one test per rule ─────────────────────────────

test('validateManifest: a complete manifest is valid (with and without a folder name)', () => {
  assert.deepEqual(validateManifest(base()), []);
  assert.deepEqual(validateManifest(base(), 'pada-shodha'), []);
});

test('rule: id is kebab-case ASCII', () => {
  for (const id of ['Pada-Shodha', 'pada_shodha', 'pada shodha', '-pada', 'pada-', 'pada--shodha', '9lives', 'पद', 'pada.shodha', 'pada/shodha']) assertOnly({ id }, 'id must be kebab-case');
  for (const id of ['a', 'pada', 'pada-shodha', 'sandhi-2048', 'x1-y2-z3']) assertOk({ id });
  assert.ok(errorsFor({ id: '' })[0]!.startsWith('(no id):'), 'a missing id is labelled');
});

test('rule: id equals the folder name (only checked when a folder name is given)', () => {
  assertOnly({}, 'id must equal folder name "other-folder"', 'other-folder');
  assertOnly({}, 'id must equal folder name', 'Pada-shodha');
  assertOk({}, 'pada-shodha');
  assertOk({ id: 'whatever' });
});

test('rule: version is plain semver x.y.z', () => {
  for (const version of ['1.0', '1', 'v1.0.0', '1.0.0-beta', '1.0.0.0', '', '1.a.0', ' 1.0.0']) assertOnly({ version }, 'version must be semver');
  for (const version of ['0.1.0', '1.0.0', '10.20.30']) assertOk({ version });
});

test('rule: title.sa contains Devanagari', () => {
  for (const sa of ['Pada-shodha', 'padaśodhaḥ', '', '123', 'パダ']) assertOnly({ title: { sa, iast: 'x', en: 'y' } }, 'title.sa must be Devanagari');
  assertOk({ title: { sa: 'संस्कुरु २०४८', iast: 'x', en: 'y' } });
});

test('rule: title.iast and title.en are present and not blank', () => {
  assertOnly({ title: { sa: 'पदशोधः', iast: '', en: 'Word hunt' } }, 'title.iast and title.en are required');
  assertOnly({ title: { sa: 'पदशोधः', iast: 'Pada-śodhaḥ', en: '   ' } }, 'title.iast and title.en are required');
  assertOnly({ title: { sa: 'पदशोधः', iast: '\t', en: '' } }, 'title.iast and title.en are required');
});

test('rule: tagline is 1–60 characters', () => {
  assertOnly({ tagline: '' }, 'tagline must be 1–60 chars');
  assertOnly({ tagline: 'x'.repeat(61) }, 'tagline must be 1–60 chars');
  assertOk({ tagline: 'x' });
  assertOk({ tagline: 'x'.repeat(60) });
});

test('rule: description is at least 20 characters', () => {
  assertOnly({ description: '' }, 'description must be at least 20 chars');
  assertOnly({ description: 'x'.repeat(19) }, 'description must be at least 20 chars');
  assertOk({ description: 'x'.repeat(20) });
});

test('rule: kind is one of the known kinds', () => {
  for (const kind of ['arcade', 'puzzle', 'daily', 'lesson', 'quiz']) assertOk({ kind });
  for (const kind of ['Arcade', 'card', '', 'toString']) assertOnly({ kind }, 'unknown kind');
});

test('rule: hue is one of the design-system accents', () => {
  for (const hue of ['saffron', 'maroon', 'indigo', 'teal', 'gold', 'rose', 'leaf', 'plum']) assertOk({ hue });
  for (const hue of ['red', '#7a1027', '', 'Teal']) assertOnly({ hue }, 'unknown hue');
});

test('rule: skills are non-empty and every one is a known skill', () => {
  assertOnly({ skills: [] }, 'skills must be non-empty and known');
  assertOnly({ skills: ['grammar'] }, 'skills must be non-empty and known');
  assertOnly({ skills: ['akshara', 'vocab'] }, 'skills must be non-empty and known');
  for (const skill of Object.keys(SKILLS)) assertOk({ skills: [skill] });
  assert.equal(Object.keys(SKILLS).length, 12);
});

test('rule: skills — names inherited from Object.prototype are not skills', () => {
  for (const skill of ['toString', 'constructor', 'hasOwnProperty', '__proto__', 'valueOf']) assertOnly({ skills: [skill] }, 'skills must be non-empty and known');
});

test('rule: levels are non-empty and within 0–5', () => {
  assertOnly({ levels: [] }, 'levels must be non-empty and within 0–5');
  for (const levels of [[6], [-1], [1.5], [0, 1, 9], ['1'], [Number.NaN]]) assertOnly({ levels }, 'levels must be non-empty and within 0–5');
  assertOk({ levels: LEVELS.map((l) => l.level) });
  assert.deepEqual(LEVELS.map((l) => l.level), [0, 1, 2, 3, 4, 5]);
});

test('rule: modes are non-empty and known', () => {
  assertOnly({ modes: [] }, 'modes must be non-empty and known');
  assertOnly({ modes: ['practice', 'zen'] }, 'modes must be non-empty and known');
  for (const mode of ['daily', 'practice', 'endless', 'timed']) assertOk({ modes: [mode] });
});

test('rule: minutes is a positive number up to 30', () => {
  for (const minutes of [0, -1, 31, 1000, Number.NaN, Number.POSITIVE_INFINITY]) assertOnly({ minutes }, 'minutes must be within 1–30');
  for (const minutes of [1, 2.5, 30]) assertOk({ minutes });
});

test('rule: icon is 1–4 characters, counted by code point', () => {
  assertOnly({ icon: '' }, 'icon must be 1–4 characters');
  assertOnly({ icon: 'स्मृति' }, 'icon must be 1–4 characters'); // 6 code points
  assertOnly({ icon: 'abcde' }, 'icon must be 1–4 characters');
  for (const icon of ['अ', 'स्मृ', 'क्ष', '🪷', '🪷🪷🪷🪷']) assertOk({ icon }); // astral emoji count once each
});

test('rule: status is stable, beta or labs', () => {
  for (const status of ['stable', 'beta', 'labs']) assertOk({ status });
  for (const status of ['alpha', 'draft', '', 'Stable']) assertOnly({ status }, 'unknown status');
});

test('rule: howToPlay has 2–6 steps', () => {
  assertOnly({ howToPlay: [] }, 'howToPlay needs 2–6 steps');
  assertOnly({ howToPlay: ['Only one step.'] }, 'howToPlay needs 2–6 steps');
  assertOnly({ howToPlay: Array.from({ length: 7 }, (_, i) => `Step ${i}`) }, 'howToPlay needs 2–6 steps');
  assertOk({ howToPlay: ['One.', 'Two.'] });
  assertOk({ howToPlay: Array.from({ length: 6 }, (_, i) => `Step ${i}`) });
});

test('rule: content is an array (possibly empty)', () => {
  assertOnly({ content: undefined }, 'content must list content pack ids');
  assertOnly({ content: 'vocab' }, 'content must list content pack ids');
  assertOnly({ content: null }, 'content must list content pack ids');
  assertOk({ content: [] });
});

test('validateManifest: every problem is reported, each prefixed with the game id', () => {
  const errs = errorsFor({ version: 'x', tagline: '', kind: 'nope', hue: 'nope', skills: [], levels: [], modes: [], minutes: 0, icon: '', status: 'nope', howToPlay: [], content: null });
  assert.equal(errs.length, 12, JSON.stringify(errs, null, 1));
  assert.ok(errs.every((e) => e.startsWith('pada-shodha: ')));
});

test('validateManifest: optional fields may be present or absent', () => {
  assertOk({ inspiredBy: 'Wordle', credits: ['Someone'] });
  assertOk({ inspiredBy: undefined, credits: undefined });
});

// ───────────────────────────── assertValidQuestions ─────────────────────────────

const q = (id: string, over: Partial<ChoiceQuestion> = {}): ChoiceQuestion => ({
  kind: 'choice',
  id,
  skill: 'akshara',
  instruction: 'Which sound is this?',
  prompt: { sa: 'क', script: 'deva' },
  options: [
    { id: 'ka', text: 'ka' },
    { id: 'kha', text: 'kha' },
  ],
  answer: 'ka',
  ...over,
});

test('assertValidQuestions: accepts valid, distinct questions', () => {
  assert.doesNotThrow(() => assertValidQuestions([q('a'), q('b'), q('c')]));
  assert.doesNotThrow(() => assertValidQuestions([]));
});

test('assertValidQuestions: throws on the first malformed question, quoting every problem it has', () => {
  assert.throws(() => assertValidQuestions([q('a'), q('b', { answer: 'nope' })]), /b: answer id not among options/);
  assert.throws(() => assertValidQuestions([q('a', { instruction: '', answer: 'nope' })]), /a: missing instruction; a: answer id not among options/);
});

test('assertValidQuestions: throws when two questions share an id (mastery ids must be unique within a session)', () => {
  assert.throws(() => assertValidQuestions([q('same'), q('other'), q('same')]), /duplicate question id same/);
});

// ───────────────────────────── testMatrix ─────────────────────────────

test('testMatrix: levels × 25 seeds by default, every level covered equally', () => {
  const m = testMatrix([0, 3, 5]);
  assert.equal(m.length, 75);
  for (const level of [0, 3, 5]) assert.equal(m.filter((x) => x.level === level).length, 25);
  assert.deepEqual(m[0], { level: 0, seed: 7919 });
});

test('testMatrix: seeds are distinct positive 32-bit integers and deterministic', () => {
  const m = testMatrix([0, 1, 2, 3, 4, 5], 40);
  assert.equal(m.length, 240);
  assert.equal(new Set(m.map((x) => x.seed)).size, 240, 'no two (level, seed) rows share a seed');
  assert.ok(m.every((x) => Number.isInteger(x.seed) && x.seed > 0 && x.seed <= 0xffffffff));
  assert.deepEqual(testMatrix([0, 1, 2, 3, 4, 5], 40), m);
});

test('testMatrix: custom seed count; no levels → empty matrix (a vacuous test must be noticed by the caller)', () => {
  assert.equal(testMatrix([2], 3).length, 3);
  assert.deepEqual(testMatrix([2], 3).map((x) => x.level), [2, 2, 2]);
  assert.deepEqual(testMatrix([]), []);
  assert.deepEqual(testMatrix([1], 0), []);
});
