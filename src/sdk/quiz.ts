/**
 * Quiz engine — the pure state machine behind lesson-style ("Duolingo-style") games.
 * A game builds a list of {@link Question}s from verified content and hands it to
 * `<QuizRunner>` (src/ui), which renders prompts, choices, word banks, the check button,
 * the feedback bar, hearts and progress consistently for every game.
 *
 * Four question kinds:
 *  - `choice`  pick one of N options
 *  - `arrange` order tokens from a word bank (multiple accepted orders supported — Sanskrit word order is free)
 *  - `pairs`   match left items to right items (memory-free matching, like Duolingo "tap the pairs")
 *  - `type`    build an answer on the on-screen akṣara keyboard / text field
 */
import { spellingKey } from '../sanskrit/equivalence';
import type { MasteryEvent, ReviewItem, Script, SessionResult, Skill } from './types';

/** A piece of display content: Sanskrit (authored in Devanagari, shown in the user's script) and/or plain text. */
export interface Rich {
  /** Sanskrit, Devanagari. */
  sa?: string;
  /** Plain text in the UI language (English). */
  text?: string;
  /** Lock the display script of `sa` regardless of the user setting (script-teaching games only). */
  script?: Script;
}

export interface Option extends Rich {
  id: string;
}

interface QuestionBase {
  /** Stable id of the fact tested (drives mastery / spaced repetition), e.g. `shabda:rama:3.1`. */
  id: string;
  skill: Skill;
  /** Instruction line, e.g. "Choose the correct form". */
  instruction: string;
  prompt: Rich;
  /** Optional extra context shown under the prompt (e.g. "तृतीया · बहुवचनम्"). */
  context?: Rich;
  /** Shown in the feedback bar after answering (the rule, the paradigm cell, the translation…). */
  explain?: Rich;
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'choice';
  options: Option[];
  /** id of the correct option. */
  answer: string;
}

export interface ArrangeQuestion extends QuestionBase {
  kind: 'arrange';
  /** The bank, including any distractor tokens. Token ids must be unique. */
  tokens: Option[];
  /** Accepted orderings (token ids). The first is shown as "the" answer. */
  answers: string[][];
}

export interface PairsQuestion extends QuestionBase {
  kind: 'pairs';
  left: Option[];
  right: Option[];
  /** left id → right id. Must be a bijection. */
  pairs: Record<string, string>;
}

export interface TypeQuestion extends QuestionBase {
  kind: 'type';
  /** Accepted answers in Devanagari (compared after normalisation). First is canonical. */
  answers: string[];
  /** Akṣara pool for the on-screen keyboard; omit for the full keyboard. */
  keys?: string[];
}

export type Question = ChoiceQuestion | ArrangeQuestion | PairsQuestion | TypeQuestion;

/** What the player submits for each kind. */
export type Given = string | string[] | Record<string, string>;

export interface Answered {
  question: Question;
  given: Given;
  correct: boolean;
  /** Number of wrong attempts before this entry (pairs only: wrong taps). */
  mistakes: number;
}

export interface QuizOptions {
  /** Hearts. 0 = unlimited (practice). Default 3. */
  lives?: number;
  /** Re-ask wrongly answered questions at the end (once each). Default true. */
  retryWrong?: boolean;
  /** Points per correct answer; streak adds +2 per consecutive correct up to +10. Default 10. */
  points?: number;
}

export interface QuizState {
  queue: Question[];
  index: number;
  /** Number of first-pass questions (retries are not counted in accuracy). */
  firstPass: number;
  lives: number;
  maxLives: number;
  status: 'asking' | 'feedback' | 'done';
  outcome: 'completed' | 'lost' | null;
  last: Answered | null;
  history: Answered[];
  streak: number;
  bestStreak: number;
  score: number;
  retried: string[];
  opts: Required<QuizOptions>;
}

const norm = (s: string): string => s.normalize('NFC').replace(/[‌‍]/g, '').replace(/\s+/g, ' ').trim();
/** What the player sees for an option/token — used to detect look-alikes. */
const look = (r: Rich): string => norm(`${r.sa ?? ''}|${r.text ?? ''}`);

/** Validates a question's internal consistency. Returns a list of problems (empty = valid). */
export function validateQuestion(q: Question): string[] {
  const errs: string[] = [];
  const uniq = (ids: string[], what: string): void => {
    if (new Set(ids).size !== ids.length) errs.push(`${q.id}: duplicate ${what} ids`);
  };
  if (!q.id) errs.push('question without id');
  if (!q.instruction) errs.push(`${q.id}: missing instruction`);
  switch (q.kind) {
    case 'choice': {
      uniq(q.options.map((o) => o.id), 'option');
      if (q.options.length < 2) errs.push(`${q.id}: needs ≥2 options`);
      if (!q.options.some((o) => o.id === q.answer)) errs.push(`${q.id}: answer id not among options`);
      const labels = q.options.map((o) => norm(`${o.sa ?? ''}|${o.text ?? ''}`));
      if (new Set(labels).size !== labels.length) errs.push(`${q.id}: two options look identical`);
      break;
    }
    case 'arrange': {
      const ids = q.tokens.map((t) => t.id);
      uniq(ids, 'token');
      if (q.answers.length === 0) errs.push(`${q.id}: no accepted answers`);
      for (const a of q.answers) {
        if (a.length === 0) errs.push(`${q.id}: empty answer`);
        if (new Set(a).size !== a.length) errs.push(`${q.id}: answer repeats a token`);
        for (const id of a) if (!ids.includes(id)) errs.push(`${q.id}: answer uses unknown token ${id}`);
      }
      break;
    }
    case 'pairs': {
      uniq(q.left.map((o) => o.id), 'left');
      uniq(q.right.map((o) => o.id), 'right');
      if (q.left.length !== q.right.length) errs.push(`${q.id}: left/right sizes differ`);
      // Two look-alikes in one column have different partners, so a player cannot pick the "right" one.
      if (new Set(q.left.map(look)).size !== q.left.length) errs.push(`${q.id}: two left items look identical`);
      if (new Set(q.right.map(look)).size !== q.right.length) errs.push(`${q.id}: two right items look identical`);
      const targets = Object.values(q.pairs);
      if (new Set(targets).size !== targets.length) errs.push(`${q.id}: pairs not one-to-one`);
      for (const l of q.left) {
        const r = q.pairs[l.id];
        if (r === undefined || !q.right.some((o) => o.id === r)) errs.push(`${q.id}: left ${l.id} has no valid partner`);
      }
      break;
    }
    case 'type': {
      if (q.answers.length === 0 || q.answers.some((a) => norm(a) === '')) errs.push(`${q.id}: needs non-empty answers`);
      break;
    }
  }
  return errs;
}

export function isCorrect(q: Question, given: Given): boolean {
  switch (q.kind) {
    case 'choice':
      return typeof given === 'string' && given === q.answer;
    case 'arrange': {
      // Compare what is on screen, not token ids: a bank may hold the same word twice
      // (रामः च लक्ष्मणः च) and the player cannot tell the copies apart.
      if (!Array.isArray(given) || new Set(given).size !== given.length) return false;
      const shown = new Map(q.tokens.map((t) => [t.id, look(t)]));
      if (!given.every((id) => shown.has(id))) return false;
      return q.answers.some((a) => a.length === given.length && a.every((id, i) => shown.get(id) === shown.get(given[i] as string)));
    }
    case 'pairs': {
      if (typeof given !== 'object' || Array.isArray(given)) return false;
      const g = given as Record<string, string>;
      return q.left.every((l) => g[l.id] === q.pairs[l.id]);
    }
    case 'type':
      // typed Sanskrit is compared up to anusvāra / explicit-nasal spelling (फलं = फलम्, गंगा = गङ्गा)
      return typeof given === 'string' && q.answers.some((a) => spellingKey(norm(a)) === spellingKey(norm(given)));
  }
}

export function createQuiz(questions: readonly Question[], options: QuizOptions = {}): QuizState {
  if (questions.length === 0) throw new Error('createQuiz: no questions');
  for (const q of questions) {
    const errs = validateQuestion(q);
    if (errs.length) throw new Error(`Invalid question: ${errs.join('; ')}`);
  }
  const opts: Required<QuizOptions> = { lives: options.lives ?? 3, retryWrong: options.retryWrong ?? true, points: options.points ?? 10 };
  return {
    queue: questions.slice(),
    index: 0,
    firstPass: questions.length,
    lives: opts.lives,
    maxLives: opts.lives,
    status: 'asking',
    outcome: null,
    last: null,
    history: [],
    streak: 0,
    bestStreak: 0,
    score: 0,
    retried: [],
    opts,
  };
}

export function currentQuestion(state: QuizState): Question | null {
  return state.status === 'done' ? null : (state.queue[state.index] ?? null);
}

/** Submit an answer for the current question. `mistakes` = wrong taps made before completing (pairs). */
export function submit(state: QuizState, given: Given, mistakes = 0): QuizState {
  if (state.status !== 'asking') return state;
  const question = state.queue[state.index];
  if (!question) return state;
  const correct = isCorrect(question, given) && mistakes === 0;
  const answered: Answered = { question, given, correct, mistakes };
  const streak = correct ? state.streak + 1 : 0;
  const lives = !correct && state.maxLives > 0 ? state.lives - 1 : state.lives;
  const queue = state.queue.slice();
  const retried = state.retried.slice();
  if (!correct && state.opts.retryWrong && !retried.includes(question.id)) {
    retried.push(question.id);
    queue.push(question);
  }
  return {
    ...state,
    queue,
    retried,
    lives,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    score: state.score + (correct ? state.opts.points + Math.min(10, (streak - 1) * 2) : 0),
    status: 'feedback',
    last: answered,
    history: [...state.history, answered],
  };
}

/** Advance after feedback. */
export function advance(state: QuizState): QuizState {
  if (state.status !== 'feedback') return state;
  if (state.maxLives > 0 && state.lives <= 0) return { ...state, status: 'done', outcome: 'lost' };
  const index = state.index + 1;
  if (index >= state.queue.length) return { ...state, index, status: 'done', outcome: 'completed' };
  return { ...state, index, status: 'asking', last: null };
}

/** 0..1 progress for the top bar. */
export function quizProgress(state: QuizState): number {
  // Answers given so far. (Not derived from `index`: a lost quiz stops without advancing it,
  // which made the bar step back by one question on the final transition.)
  return Math.min(1, state.history.length / state.queue.length);
}

const display = (r: Rich | undefined): string => r?.sa ?? r?.text ?? '';

/** The canonical correct answer of a question as displayable content. */
export function correctAnswer(q: Question): Rich {
  switch (q.kind) {
    case 'choice': {
      const o = q.options.find((x) => x.id === q.answer);
      return { sa: o?.sa, text: o?.text, script: o?.script };
    }
    case 'arrange': {
      const first = q.answers[0] ?? [];
      const toks = first.map((id) => q.tokens.find((t) => t.id === id));
      const allSa = toks.every((t) => t?.sa !== undefined);
      const joined = toks.map((t) => display(t)).join(' ');
      return allSa ? { sa: joined } : { text: joined };
    }
    case 'pairs':
      return { text: q.left.map((l) => `${display(l)} — ${display(q.right.find((r) => r.id === q.pairs[l.id]))}`).join(' · ') };
    case 'type':
      return { sa: q.answers[0] };
  }
}

/** Convert a finished quiz into the shell's {@link SessionResult}. Accuracy counts first-pass answers only. */
export function quizResult(state: QuizState): SessionResult {
  const first = state.history.slice(0, Math.min(state.firstPass, state.history.length));
  const correct = first.filter((a) => a.correct).length;
  const total = state.outcome === 'lost' ? state.firstPass : first.length;
  const mastery: MasteryEvent[] = first.map((a) => ({ skill: a.question.skill as Skill, itemId: a.question.id, correct: a.correct }));
  const review: ReviewItem[] = first.map((a) => {
    const ans = correctAnswer(a.question);
    const promptText = display(a.question.prompt);
    return {
      sa: ans.sa ?? a.question.prompt.sa ?? '',
      en: ans.sa ? (a.question.prompt.text ?? a.question.explain?.text) : (ans.text ?? promptText),
      note: a.question.explain?.text,
      correct: a.correct,
    };
  });
  return {
    outcome: state.outcome === 'lost' ? 'lost' : 'completed',
    score: state.score,
    correct,
    total,
    best: { label: 'Best streak', value: state.bestStreak },
    summary: `${correct} / ${total} correct`,
    review,
    mastery,
  };
}
