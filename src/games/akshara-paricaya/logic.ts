/**
 * Akṣara-paricayaḥ — pure logic. Builds a lesson of choice/pairs questions from the varṇamālā.
 * All Sanskrit here is the closed set of Devanagari letters; the romanisation is computed by the
 * shared transliterator (never typed by hand), so the answer key cannot drift from the script.
 */
import { devaToIast } from '@sanskrit';
import { type ChoiceQuestion, type PairsQuestion, type Question, type Rng, createRng } from '@sdk';

export const VOWELS = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ॠ', 'ऌ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः'] as const;

export const CONSONANTS = [
  'क', 'ख', 'ग', 'घ', 'ङ',
  'च', 'छ', 'ज', 'झ', 'ञ',
  'ट', 'ठ', 'ड', 'ढ', 'ण',
  'त', 'थ', 'द', 'ध', 'न',
  'प', 'फ', 'ब', 'भ', 'म',
  'य', 'र', 'ल', 'व',
  'श', 'ष', 'स', 'ह',
] as const;

const MATRAS = ['ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः'] as const;
const MATRA_BASES = ['क', 'ग', 'त', 'द', 'न', 'प', 'म', 'र', 'स', 'ह'] as const;
/** Consonant + vowel-sign syllables (गुणिताक्षराणि). रु / रू / हृ are included deliberately — their shapes are irregular. */
export const SYLLABLES: readonly string[] = MATRA_BASES.flatMap((c) => MATRAS.map((m) => c + m));

/** Common conjuncts (संयुक्ताक्षराणि), each occurring in everyday words. */
export const CONJUNCTS = [
  'क्ष', 'ज्ञ', 'त्र', 'श्र', 'द्य', 'द्ध', 'द्व', 'द्म', 'क्त', 'त्त', 'न्त', 'न्द', 'स्त', 'स्थ', 'ष्ट', 'ष्ठ', 'प्र', 'क्र', 'ग्र', 'ब्र',
  'स्व', 'त्व', 'त्य', 'त्म', 'ह्म', 'ह्य', 'ङ्क', 'ङ्ग', 'ञ्च', 'ञ्ज', 'ण्ड', 'म्ब', 'च्छ', 'ज्ज', 'श्च', 'श्व', 'स्य', 'र्य', 'र्म', 'र्थ',
] as const;

export const STAGES = [
  { id: 'svara', title: { sa: 'स्वराः', en: 'Vowels' }, pool: VOWELS as readonly string[] },
  { id: 'vyanjana', title: { sa: 'व्यञ्जनानि', en: 'Consonants' }, pool: CONSONANTS as readonly string[] },
  { id: 'gunita', title: { sa: 'गुणिताक्षराणि', en: 'Vowel signs' }, pool: SYLLABLES },
  { id: 'samyukta', title: { sa: 'संयुक्ताक्षराणि', en: 'Conjuncts' }, pool: CONJUNCTS as readonly string[] },
] as const;

/** Letters that beginners confuse by shape or sound — used first as distractors. */
const CONFUSABLE: Record<string, string[]> = {
  ब: ['व', 'ष'], व: ['ब', 'क'], भ: ['म', 'झ'], म: ['भ', 'स'], घ: ['ध', 'छ'], ध: ['घ', 'थ'], ख: ['स', 'र'], ष: ['प', 'ब'], प: ['ष', 'य'],
  द: ['ढ', 'ड'], ड: ['ङ', 'ढ', 'द'], ढ: ['द', 'ड'], ङ: ['ड', 'इ'], ट: ['ठ', 'ढ'], ठ: ['ट', 'उ'], थ: ['य', 'ध'], य: ['थ', 'प'], त: ['न', 'ट'], न: ['त', 'ण'],
  ण: ['न', 'ष'], श: ['ष', 'स'], स: ['श', 'म'], ज: ['ञ', 'झ'], ञ: ['ज', 'ङ'], च: ['ज', 'छ'], छ: ['च', 'घ'], क: ['फ', 'व'], फ: ['क', 'प'], ग: ['म', 'ण'],
  इ: ['ई', 'ङ'], ई: ['इ', 'ऐ'], उ: ['ऊ', 'ठ'], ऊ: ['उ', 'ॠ'], ऋ: ['ॠ', 'ऌ'], ॠ: ['ऋ', 'ऊ'], ए: ['ऐ', 'ओ'], ऐ: ['ए', 'औ'], ओ: ['औ', 'अ'], औ: ['ओ', 'ऐ'], अ: ['आ', 'ओ'], आ: ['अ', 'औ'],
};

export const QUESTIONS_PER_LESSON = 12;

function distractors(target: string, pool: readonly string[], rng: Rng, n: number): string[] {
  const out: string[] = [];
  const targetIast = devaToIast(target);
  const add = (c: string): void => {
    if (c !== target && !out.includes(c) && pool.includes(c) && devaToIast(c) !== targetIast) out.push(c);
  };
  for (const c of rng.shuffle(CONFUSABLE[target] ?? [])) add(c);
  // For syllables/conjuncts prefer near neighbours: same first letter or same ending.
  const first = [...target][0] ?? '';
  const lastCh = [...target].slice(-1)[0] ?? '';
  for (const c of rng.shuffle(pool.filter((p) => p !== target && ([...p][0] === first || [...p].slice(-1)[0] === lastCh)))) {
    if (out.length >= n) break;
    add(c);
  }
  for (const c of rng.shuffle(pool)) {
    if (out.length >= n) break;
    add(c);
  }
  return out.slice(0, n);
}

/** Build one lesson. Deterministic for (stage, seed). */
export function buildLesson(stageIndex: number, seed: number): Question[] {
  const stage = STAGES[Math.max(0, Math.min(STAGES.length - 1, stageIndex))] ?? STAGES[0];
  const rng = createRng(seed);
  const targets = rng.sample(stage.pool, QUESTIONS_PER_LESSON - 2);
  const questions: Question[] = targets.map((target, i): ChoiceQuestion => {
    const toSound = i % 2 === 0;
    const opts = rng.shuffle([target, ...distractors(target, stage.pool, rng, 3)]);
    return {
      kind: 'choice',
      id: `akshara:${stage.id}:${target}:${toSound ? 'read' : 'find'}`,
      skill: 'akshara',
      instruction: toSound ? 'Which sound is this?' : 'Which akṣara makes this sound?',
      prompt: toSound ? { sa: target, script: 'deva' } : { text: devaToIast(target) },
      options: opts.map((o) => (toSound ? { id: o, text: devaToIast(o) } : { id: o, sa: o, script: 'deva' as const })),
      answer: target,
      explain: { text: `${target} = ${devaToIast(target)}` },
    };
  });
  // Two "tap the pairs" rounds, placed mid-lesson and at the end.
  const pairRound = (n: number): PairsQuestion => {
    const items = rng.sample(stage.pool, 4);
    return {
      kind: 'pairs',
      id: `akshara:${stage.id}:pairs:${n}:${items.join('')}`,
      skill: 'akshara',
      instruction: 'Tap the matching pairs',
      prompt: { text: 'Match each akṣara with its sound' },
      left: items.map((x) => ({ id: x, sa: x, script: 'deva' as const })),
      right: rng.shuffle(items).map((x) => ({ id: `r:${x}`, text: devaToIast(x) })),
      pairs: Object.fromEntries(items.map((x) => [x, `r:${x}`])),
    };
  };
  questions.splice(5, 0, pairRound(1));
  questions.push(pairRound(2));
  return questions;
}

/** Next stage to play given the best stars earned per stage (unlock on ≥ 2 stars). */
export function currentStage(stars: readonly number[]): number {
  for (let i = 0; i < STAGES.length; i++) if ((stars[i] ?? 0) < 2) return i;
  return STAGES.length - 1;
}
