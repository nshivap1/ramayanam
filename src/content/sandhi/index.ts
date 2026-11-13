/**
 * Sandhi example pack: real words and natural word-pairs for every external-sandhi rule of the Samskuru engine.
 * See ./README.md. Every item of SANDHI_EXAMPLES is reproduced by `joinSandhiDeva(first, second, options)`.
 */
import type { Level, PackMeta } from '../types';
import { SANDHI_DATA } from './data';
import type { SandhiExample } from './types';

export type { PendingSandhiExample, SandhiExample, SandhiExampleOptions } from './types';
/** Correct forms the engine cannot yet produce — NOT part of SANDHI_EXAMPLES; do not use for auto-graded play. */
export { SANDHI_PENDING_ENGINE } from './pending';

/**
 * Items withheld after the independent audit of 11 Nov 2026 (docs/audit/SANSKRIT_AUDIT_B.md; REVIEW.md → Corrections).
 * Kept in the generated data so ids stay stable; filtered here so no game serves them.
 *  - sandhi-visarga-satva-29 हरिः + चन्द्रः = हरिश्चन्द्रः: not visarga sandhi (suṭ augment, 6.1.153, on the stem हरि).
 */
export const WITHHELD_SANDHI: ReadonlySet<string> = new Set(['sandhi-visarga-satva-29']);

export const SANDHI_EXAMPLES: readonly SandhiExample[] = SANDHI_DATA.filter((e) => !WITHHELD_SANDHI.has(e.id));

/** Examples of one family (svara / visarga / vyañjana); with `level`, only those at or below that level. */
export function sandhiByFamily(f: SandhiExample['family'], level?: Level): SandhiExample[] {
  return SANDHI_EXAMPLES.filter((e) => e.family === f && (level === undefined || e.level <= level));
}

/** Examples of one rule (`ruleId` as in SANDHI_RULES of @sanskrit, e.g. 'guna', 'visarga-o'). */
export function sandhiByRule(ruleId: string): SandhiExample[] {
  return SANDHI_EXAMPLES.filter((e) => e.ruleId === ruleId);
}

export const meta: PackMeta = {
  id: 'sandhi',
  title: 'Sandhi examples',
  version: '1.0.0',
  description: 'Engine-verified sandhi examples (svara, visarga, vyañjana) built from real words and natural word pairs, tagged by rule and level.',
  license: 'CC0-1.0 (examples authored for Samskuru; individual word pairs are not copyrightable)',
  sources: [
    'Hand-authored textbook-style examples (tools/content/sahitya/sources/sandhi.txt)',
    'Verified with the Samskuru sandhi engine (src/sanskrit/sandhi.ts)',
    'Cross-checked against the CC0 sandhi rule table of sanskrit/data (learnsanskrit.org, after M. R. Kale)',
    'Attestation lookups: Monier-Williams and Apte headword lists (Cologne Digital Sanskrit Dictionaries, CC BY-NC-SA 3.0 — consulted, not redistributed); Bhagavad-gītā, Rāmāyaṇa and Mahābhārata e-texts',
  ],
  count: SANDHI_EXAMPLES.length,
};
