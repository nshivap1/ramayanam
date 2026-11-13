/**
 * Samāsa pack: textbook-standard compounds with their conventional vigraha, type and member stems.
 * See ./README.md. Classification follows the standard school presentation (Laghusiddhāntakaumudī tradition).
 */
import type { PackMeta } from '../types';
import { SAMASA_DATA } from './data';
import type { Samasa, SamasaType } from './types';

export type { Samasa, SamasaType } from './types';

export const SAMASAS: readonly Samasa[] = SAMASA_DATA;

export const SAMASA_TYPES: Record<SamasaType, { sa: string; iast: string; en: string; hint: string }> = {
  tatpurusha: {
    sa: 'तत्पुरुषः',
    iast: 'tatpuruṣaḥ',
    en: 'determinative compound (case relation)',
    hint: 'The last member is the main word; the first stands to it in a case relation (2nd to 7th case): राज्ञः पुरुषः → राजपुरुषः.',
  },
  karmadharaya: {
    sa: 'कर्मधारयः',
    iast: 'karmadhārayaḥ',
    en: 'descriptive compound (same case)',
    hint: 'A tatpuruṣa whose two members refer to the same thing: adjective + noun, or a comparison: नीलम् उत्पलम् → नीलोत्पलम्.',
  },
  dvigu: {
    sa: 'द्विगुः',
    iast: 'dviguḥ',
    en: 'numeral compound (collective)',
    hint: 'A karmadhāraya whose first member is a numeral, naming a group taken as one: त्रयाणां लोकानां समाहारः → त्रिलोकी.',
  },
  dvandva: {
    sa: 'द्वन्द्वः',
    iast: 'dvandvaḥ',
    en: 'copulative compound ("and")',
    hint: 'All members are equally important and are joined by "and" (च): रामः च लक्ष्मणः च → रामलक्ष्मणौ.',
  },
  bahuvrihi: {
    sa: 'बहुव्रीहिः',
    iast: 'bahuvrīhiḥ',
    en: 'possessive compound (refers to something else)',
    hint: 'The compound describes something outside itself; the vigraha uses a form of यद्: पीतम् अम्बरं यस्य सः → पीताम्बरः.',
  },
  avyayibhava: {
    sa: 'अव्ययीभावः',
    iast: 'avyayībhāvaḥ',
    en: 'adverbial compound (indeclinable)',
    hint: 'The first member, usually an indeclinable, is the main word and the whole compound is indeclinable: शक्तिम् अनतिक्रम्य → यथाशक्ति.',
  },
  'nan-tatpurusha': {
    sa: 'नञ्-तत्पुरुषः',
    iast: 'nañ-tatpuruṣaḥ',
    en: 'negative compound',
    hint: 'The negative न is compounded as अ- (अन्- before a vowel): न धर्मः → अधर्मः.',
  },
  upapada: {
    sa: 'उपपद-तत्पुरुषः',
    iast: 'upapada-tatpuruṣaḥ',
    en: 'compound with a verbal last member',
    hint: 'The last member is formed from a verbal root and does not occur as an independent word in that sense: कुम्भं करोति इति → कुम्भकारः.',
  },
};

/** All compounds of one type. */
export function samasasByType(t: SamasaType): Samasa[] {
  return SAMASAS.filter((s) => s.type === t);
}

export const meta: PackMeta = {
  id: 'samasa',
  title: 'Samāsa (compounds)',
  version: '1.0.0',
  description: 'Textbook-standard Sanskrit compounds with conventional vigraha, type, subtype and member stems.',
  license: 'CC0-1.0 (word lists and analyses authored for Samskuru; English glosses © Samskuru contributors, CC BY-SA 4.0)',
  sources: [
    'Hand-authored from the standard school presentation of samāsa (tools/content/sahitya/sources/samasa.txt)',
    'Vigraha word-forms checked against the ashtadhyayi.com subanta / tiṅanta tables',
    'Member stems and compound headwords looked up in Monier-Williams and Apte (Cologne Digital Sanskrit Dictionaries, CC BY-NC-SA 3.0 — consulted, not redistributed)',
  ],
  count: SAMASAS.length,
};
