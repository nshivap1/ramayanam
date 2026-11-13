import type { Forms, Lakara, Level, Pada, Provenance } from '../types';

export interface DhatuEntry {
  /** ascii slug: root + gaṇa + pada, e.g. 'path-1p', 'labh-1a', 'kr-8u' */
  id: string;
  /** root as taught, Devanagari without anubandhas: 'पठ्', 'गम्', 'कृ', 'भू' */
  dhatu: string;
  gana: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  /** pada taught to learners: parasmaipadī, ātmanepadī, ubhayapadī */
  pada: 'P' | 'A' | 'U';
  en: string;
  /** dhātupāṭha meaning (e.g. 'व्यक्तायां वाचि') */
  artha?: string;
  /** aupadeśika form with anubandhas as in the dhātupāṭha (e.g. 'डुकृञ्', 'पठँ') */
  upadesha?: string;
  /** dhātupāṭha index gaṇa.number (ashtadhyayi.com numbering), e.g. '01.0381' */
  dhatupatha?: string;
  /** usage note (pada restrictions, suppletion, gaṇa conventions) */
  note?: string;
  level: Level;
  /**
   * [lakāra][pada] → 3 × 3 table [puruṣa − 1][vacana − 1] of accepted forms, display form first.
   * Puruṣa order: prathama (3rd person), madhyama, uttama. A withheld cell is [].
   */
  forms: Partial<Record<Lakara, Partial<Record<Pada, Forms[][]>>>>;
  /**
   * kta / ktavatu / śatṛ / śānac / tavya / anīyar: masculine nominative singular (गतः, गतवान्,
   * गच्छन्, लभमानः, गन्तव्यः, गमनीयः); ktvā / tumun: the indeclinable (गत्वा, गन्तुम्).
   */
  krdanta: { ktva?: Forms; tumun?: Forms; kta?: Forms; ktavatu?: Forms; shatr?: Forms; shanac?: Forms; tavya?: Forms; aniyar?: Forms };
  /** lyap forms with real upasargas (आ + गम् → आगम्य, आगत्य) */
  lyap?: { upasarga: string; form: string; en: string }[];
  /** finite forms shipped, and how many of them each independent engine confirms in the same cell */
  evidence: { forms: number; sanskritverb: number; heritage: number };
  provenance: Provenance;
}

export interface PrefixedVerb {
  id: string;
  /** upasarga(s) or gati word in citation form, '+'-joined outermost first: 'आ', 'प्रति+आ', 'उद्', 'नमस्' */
  upasarga: string;
  /** id of the base DhatuEntry */
  base: string;
  /** laṭ prathama-puruṣa ekavacana */
  lat3s: string;
  en: string;
  level: Level;
  provenance: Provenance;
}

/** Compact authoring shape used by the generated data file. */
export interface RawDhatu {
  id: string;
  dhatu: string;
  gana: DhatuEntry['gana'];
  pada: DhatuEntry['pada'];
  level: Level;
  en: string;
  artha: string;
  upadesha: string;
  dhatupatha: string;
  note?: string;
  /** paradigm strings, see {@link parseTable} */
  forms: Partial<Record<Lakara, Partial<Record<Pada, string>>>>;
  /** '/'-separated accepted forms per kṛt suffix */
  krdanta: Partial<Record<keyof DhatuEntry['krdanta'], string>>;
  lyap?: { upasarga: string; form: string; en: string }[];
  evidence: { forms: number; sanskritverb: number; heritage: number };
  verifiedBy: string[];
}

export interface RawPrefixed {
  id: string;
  upasarga: string;
  base: string;
  lat3s: string;
  en: string;
  level: Level;
  verifiedBy: string[];
}

/**
 * Parses a one-line paradigm: 'पठति पठतः पठन्ति | पठसि पठथः पठथ | पठामि पठावः पठामः'.
 * Rows are puruṣas (prathama | madhyama | uttama), cells are vacanas, '/' separates accepted
 * alternates (display form first), '—' is a withheld cell.
 */
export function parseTable(s: string): Forms[][] {
  const rows = s.split('|').map((row) =>
    row
      .trim()
      .split(/\s+/)
      .map((cell): Forms => (cell === '—' ? [] : cell.split('/'))),
  );
  if (rows.length !== 3 || rows.some((r) => r.length !== 3)) throw new Error(`malformed paradigm: ${s}`);
  return rows;
}
