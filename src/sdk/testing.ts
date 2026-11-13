/**
 * Helpers for game unit tests (logic.test.ts). Import from '@sdk'.
 */
import type { GameManifest, Level, Skill } from './types';
import { LEVELS, SKILLS } from './types';
import { type Question, validateQuestion } from './quiz';

const HUES = ['saffron', 'maroon', 'indigo', 'teal', 'gold', 'rose', 'leaf', 'plum'];
const KINDS = ['arcade', 'puzzle', 'daily', 'lesson', 'quiz'];
const MODES = ['daily', 'practice', 'endless', 'timed'];

/** Structural validation of a manifest. Returns problems (empty = valid). Used by the contract test for every game. */
export function validateManifest(m: GameManifest, folderName?: string): string[] {
  const errs: string[] = [];
  const need = (cond: boolean, msg: string): void => {
    if (!cond) errs.push(`${m.id || '(no id)'}: ${msg}`);
  };
  need(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(m.id), 'id must be kebab-case');
  if (folderName !== undefined) need(m.id === folderName, `id must equal folder name "${folderName}"`);
  need(/^\d+\.\d+\.\d+$/.test(m.version), 'version must be semver');
  need(/[ऀ-ॿ]/.test(m.title.sa), 'title.sa must be Devanagari');
  need(m.title.iast.trim().length > 0 && m.title.en.trim().length > 0, 'title.iast and title.en are required');
  need(m.tagline.length > 0 && m.tagline.length <= 60, 'tagline must be 1–60 chars');
  need(m.description.length >= 20, 'description must be at least 20 chars');
  need(KINDS.includes(m.kind), 'unknown kind');
  need(HUES.includes(m.hue), 'unknown hue');
  need(m.skills.length > 0 && m.skills.every((s) => Object.prototype.hasOwnProperty.call(SKILLS, s)), 'skills must be non-empty and known');
  need(m.levels.length > 0 && m.levels.every((l) => LEVELS.some((x) => x.level === l)), 'levels must be non-empty and within 0–5');
  need(m.modes.length > 0 && m.modes.every((x) => MODES.includes(x)), 'modes must be non-empty and known');
  need(m.minutes > 0 && m.minutes <= 30, 'minutes must be within 1–30');
  need(m.icon.length > 0 && [...m.icon].length <= 4, 'icon must be 1–4 characters');
  need(['stable', 'beta', 'labs'].includes(m.status), 'unknown status');
  need(m.howToPlay.length >= 2 && m.howToPlay.length <= 6, 'howToPlay needs 2–6 steps');
  need(Array.isArray(m.content), 'content must list content pack ids (may be empty)');
  return errs;
}

/** Throws if any question is malformed or two questions share an id. */
export function assertValidQuestions(questions: readonly Question[]): void {
  const seen = new Set<string>();
  for (const q of questions) {
    const errs = validateQuestion(q);
    if (errs.length) throw new Error(errs.join('; '));
    if (seen.has(q.id)) throw new Error(`duplicate question id ${q.id}`);
    seen.add(q.id);
  }
}

/** All (level, seed) combinations a game should be exercised with in tests. */
export function testMatrix(levels: readonly Level[], seeds: number = 25): { level: Level; seed: number }[] {
  const out: { level: Level; seed: number }[] = [];
  for (const level of levels) for (let s = 1; s <= seeds; s++) out.push({ level, seed: s * 7919 + level });
  return out;
}

export type { Skill };
