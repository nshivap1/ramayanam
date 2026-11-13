/**
 * Verse pack: Bhagavad-gītā verses, subhāṣitas, kāvya openings and stotra verses — text copied from corpora,
 * metre verified by the chandas engine, translations and word glosses by Samskuru. See ./README.md.
 */
import type { Level, PackMeta } from '../types';
import { GITA_VERSES } from './data-gita';
import { OTHER_VERSES } from './data-other';
import type { Verse } from './types';

export type { Verse } from './types';

/**
 * Readings corrected after the independent audit of 11 Nov 2026 (docs/audit/SANSKRIT_AUDIT_B.md; see REVIEW.md →
 * Corrections). The generated data keeps the e-text witness letter-for-letter; the correction is applied here so
 * that it is explicit: verse id → [what the witness has, the corrected reading].
 */
export const VERSE_CORRECTIONS: Readonly<Record<string, readonly [string, string]>> = {
  'guna-gunajneshu-guna-bhavanti': ['भवन्त्युपेयाः', 'भवन्त्यपेयाः'],
  'vidya-dadati-vinayam': ['पात्रत्वात् धनमाप्नोति', 'पात्रत्वाद्धनमाप्नोति'],
};

function corrected(v: Verse): Verse {
  const fix = VERSE_CORRECTIONS[v.id];
  if (!fix) return v;
  const [from, to] = fix;
  return { ...v, padas: v.padas.map((p) => p.split(from).join(to)), text: v.text.split(from).join(to), provenance: { ...v.provenance, verifiedBy: [...v.provenance.verifiedBy, 'audit:reading-corrected'] } };
}

export const VERSES: readonly Verse[] = [...GITA_VERSES, ...OTHER_VERSES].map(corrected);

/** Verses in one metre: 'anustubh', 'upajati', or a METERS id such as 'vasantatilaka'. */
export function versesByMeter(meter: string): Verse[] {
  return VERSES.filter((v) => v.meter === meter);
}

/** Verses tagged with exactly this level. */
export function versesForLevel(level: Level): Verse[] {
  return VERSES.filter((v) => v.level === level);
}

/** The syllabic metres beyond anuṣṭubh that occur in the pack, with counts (for metre games). */
export function meterCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of VERSES) out[v.meter] = (out[v.meter] ?? 0) + 1;
  return out;
}

export const meta: PackMeta = {
  id: 'subhashita',
  title: 'Verses: Gītā, subhāṣitas, kāvya',
  version: '1.0.0',
  description: 'Well-known Sanskrit verses with pāda division, engine-verified metre, own English translations and padaccheda word lists.',
  license: 'Sanskrit texts: public domain (ancient works). Translations and glosses: © Samskuru contributors, CC BY-SA 4.0. Digitisations consulted are listed in README.md with their licences.',
  sources: [
    'vedicscriptures/bhagavad-gita (Gītā text; GPL-3.0 repository, public-domain Sanskrit text)',
    'gita/gita and bhavykhatri/DharmicData (Gītā cross-check)',
    'GRETIL TEI e-texts via ambuda-org/gretil (Hitopadeśa, Pañcatantra, Manusmṛti, Śatakatraya, Raghuvaṃśa, Kumārasambhava, Meghadūta, Abhijñānaśākuntala, Mahāsubhāṣitasaṃgraha, Subhāṣitaratnakośa, Garuḍapurāṇa, Mukundamālā, Śivamahimnaḥ stava)',
    'Subhāṣitaratnabhāṇḍāgāra and ebhāratī-sampat e-texts in sanskrit/raw_etexts',
  ],
  count: VERSES.length,
};
