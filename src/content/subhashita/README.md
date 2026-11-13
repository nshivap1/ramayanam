# Verse pack (`src/content/subhashita`)

135 well-known Sanskrit verses — 68 from the Bhagavad-gītā and 67 subhāṣitas, kāvya openings and stotra
verses — each with four pādas, an engine-verified metre, Samskuru's own English translation, attribution, theme and
level; 56 also carry a padaccheda word list with glosses.

```ts
import { VERSES, versesByMeter, versesForLevel } from '@content/subhashita';
versesByMeter('vasantatilaka');   // 5 verses
versesForLevel(2);                // the simplest subhāṣitas
```

## Contents

| metre | n | | metre | n |
|---|---|---|---|---|
| anustubh | 105 (19 with a vipulā pāda) | | shardulavikridita | 3 |
| upajati | 12 | | indravajra | 2 |
| vasantatilaka | 5 | | upendravajra, malini, mandakranta, sragdhara, shikharini, vamshastha, shalini, drutavilambita | 1 each |

30 verses are in metres other than anuṣṭubh (13 different metres in all). Levels: 2 = 17, 3 = 42, 4 = 58, 5 = 18.

Works: भगवद्गीता (68) · हितोपदेशः (19) · सुभाषितरत्नभाण्डागारम् (15) · नीतिशतकम् (8) · पञ्चतन्त्रम् (6) · महासुभाषितसङ्ग्रहः (5) ·
मनुस्मृतिः (4) · रघुवंशम् (2) · वैराग्यशतकम् (2) · कुमारसम्भवम्, मेघदूतम्, अभिज्ञानशाकुन्तलम्, मुकुन्दमाला, शिवमहिम्नःस्तोत्रम्,
सुभाषितरत्नकोशः (1 each).

Files: `types.ts` · `data-gita.ts`, `data-other.ts` (GENERATED, one verse per block) · `index.ts` · `data.test.ts`.

## Conventions

- **Nothing is typed from memory.** The Sanskrit of `text` / `padas` is copied by the generator from a corpus file;
  the only transformations are: NFC; removal of verse numbers, speaker lines (… उवाच) and footnote marks; `|`, `||`,
  `।।` → `।`, `॥`; and, for GRETIL (IAST) witnesses, mechanical conversion to Devanagari.
- `text`: two lines, `half-verse ।\nhalf-verse ॥`. Spelling (class nasal vs. anusvāra, e.g. सङ्गो / संपृक्तौ) is that
  of the primary witness and is not normalised.
- `padas`: exactly four. Half-verses are split after half their syllables **at an akṣara boundary**, exactly as
  editions that print pāda breaks do (जीर्णा- / न्यन्यानि): the pādas concatenate to `text`, and when a word or a sandhi
  cluster straddles the break the next pāda begins with the conjunct (`मा कर्मफलहेतुर्भू` / `र्मा ते सङ्गोऽस्त्वकर्मणि`).
  A game that shows single pādas may prefer to display such a pāda with a leading hyphen.
- GRETIL conversion: words that GRETIL separates only because of its Roman-script convention are written together
  when the junction shows sandhi (`vāgarthāv iva` → वागर्थाविव, `brūyāt priyaṃ` → ब्रूयात्प्रियं); word-final m before a
  consonant is written as anusvāra; a junction the e-text leaves **unsandhied** stays apart (`pātratvāt dhanam` →
  पात्रत्वात् धनम्). No sound is added, removed or changed.
- `meter`: `'anustubh'`, `'upajati'` or an id of `METERS`. An anuṣṭubh whose odd pāda is a classical vipulā keeps
  its text untouched and gets `meterNote: 'vipulā (pāda n: x-vipulā)'` (x = na / bha / ma / ra).
- `source.ref` uses Devanagari digits and follows the numbering of the e-text used (Hitopadeśa: `प्रस्ताविका n` for
  the introduction, else `book.verse`; Śatakatraya: GRETIL verse number within the śataka; Subhāṣitaratnabhāṇḍāgāra:
  section name + number; Mahāsubhāṣitasaṃgraha / Subhāṣitaratnakośa: serial number).
- `translation`: plain English written for Samskuru (not copied from any published translation). Two Gītā verses
  that form one sentence (12.13–14, 16.2–3) are translated as the two halves of that sentence.
- `words`: sandhi dissolved, compounds kept whole, in verse order, each with a contextual gloss.
- `theme`: one IAST keyword (vidyā, udyama, bhakti, karma, vāk, sajjana, paropakāra …).

## Verification

| check | how | coverage |
|---|---|---|
| text = corpus | generator copies from the primary witness; `data.test.ts` regenerates and compares byte for byte when the corpora are present | 135 / 135 |
| second witness | sound-for-sound equality (spacing, nasal orthography, optional gemination ignored) with every other corpus that has the verse → one `corpus:<name>` per agreeing witness | Gītā: 68 / 68 with ≥ 2 corpora (58 with all four); others: 47 / 67 with ≥ 2; 85 verses with ≥ 3 |
| valid Devanagari | `validateDeva` on text, pādas, words | all |
| pādas | four; concatenate to `text` | all |
| syllables and metre | `weights`, `identifyVerse`; vipulā verses: `checkAnustubh` on even pādas + the vipulā table | all (`engine:identifyVerse` 116, `engine:checkAnustubh+vipula` 19) |
| word lists | the words, re-joined pairwise by the sandhi engine (`joinSandhi`, its listed alternatives, or plain juxtaposition at an unsandhied boundary), must give exactly the verse text; wrong forms, missing words and wrong order are rejected (negative tests) | 56 / 56 (`engine:joinSandhi(words)`) |

Gītā: primary witness `vedicscriptures/bhagavad-gita` (sanskritdocuments lineage); cross-checks `gita/gita` and
`DharmicData` (Gita Supersite lineage) and GRETIL. A verse is dropped unless at least one other lineage agrees.

The metre check earned its keep: it rejected three corrupt corpus readings (GRETIL Śatakatraya: `vākya-paṭutā`,
`karuṇa-parāṇāṃ`, `dūrāvalambino`), which were replaced by metrically sound witnesses, and the multi-witness
comparison exposed `santa santaḥ` for `santi santaḥ` in the same file.

## Adding a verse

1. Find it in a corpus (never type it). Add a spec to `tools/content/sahitya/sources/verses-gita.ts` (chapter,
   verse) or `verses-other.ts` (`from` = corpus, `find` = an incipit used only to locate the verse), with theme,
   level, attribution and **your own** translation; optionally a `words` string (`पदम्=gloss|…`).
2. `node --import tsx tools/content/sahitya/gen-verses.ts` and read the report: `DROP` = no witness / invalid text
   / unknown metre; `WORDS-DROPPED` = the word list does not re-join to the text (fix the padaccheda, never the text).
3. `node tools/test.mjs unit src/content/subhashita`.

## Known gaps

- 20 verses rest on a single corpus witness (listed first in REVIEW.md).
- Readings: where editions differ, the pack has the reading of the witness named in `provenance.source` (e.g.
  Pañcatantra's `प्रारब्धमुत्तमगुणा न परित्यजन्ति`, Subhāṣitaratnakośa's `यशसि चाभिरतिः`), which may differ from the form a
  learner has memorised.
- Irregular (epic) triṣṭubh verses of the Gītā (2.7, 2.20, 2.29, 2.70 …) are not included because the engine knows
  only the classical sama-vṛttas; 8.7 is omitted because the primary corpus prints a variant note inside the text.
- No mātrā metres (āryā), no Vedic verses; no word lists yet for the longer metres.
- "विद्या ददाति विनयं": the e-text witness printed pāda 3 unsandhied (पात्रत्वात् धनमाप्नोति); after the independent audit the reading पात्रत्वाद्धनमाप्नोति is served instead, through `VERSE_CORRECTIONS` in index.ts (see REVIEW.md → Corrections); the generated data file keeps the witness text.

## Sources and licences

The verses are ancient / classical works in the public domain. Licences below are those of the digitisations
consulted; no third-party translation or commentary is used.

| corpus | used for | licence |
|---|---|---|
| `vedicscriptures/bhagavad-gita` | Gītā text (primary) | GPL-3.0 (repository) |
| `gita/gita` | Gītā cross-check | Unlicense |
| `bhavykhatri/DharmicData` | Gītā cross-check | ODbL |
| GRETIL TEI via `ambuda-org/gretil` (Hitopadeśa, Pañcatantra, Manusmṛti, Śatakatraya, Raghuvaṃśa, Kumārasambhava, Meghadūta ed. Kale, Abhijñānaśākuntala, Mahāsubhāṣitasaṃgraha, Subhāṣitaratnakośa, Subhāṣitāvali, Garuḍapurāṇa, Mukundamālā, Śivamahimnaḥ stava, Śukasaptati, Bhagavadgītā) | text of subhāṣitas / kāvya; cross-checks | CC BY-NC-SA 4.0 (TEI headers) |
| `sanskrit/raw_etexts`: Subhāṣitaratnabhāṇḍāgāra; ebhāratī-sampat OCR texts (Hitopadeśa, Pañcatantra, Cāṇakya, Bhartṛhari) | primary text of 17 verses; cross-checks | no licence stated (public-domain editions) |
| `sanskrit-coders/subhAShita-db-sanskrit` (viśvāsa-priya-padyāni TSV) | cross-check only | GPL-3.0 |

Because several digitisations are non-commercial or share-alike, a commercial build should treat the *selection
and transcription* as needing clearance, or re-key the verses from printed public-domain editions; the pack stores
only the short verse texts themselves, which are public domain. Translations and glosses: © Samskuru contributors,
CC BY-SA 4.0.
