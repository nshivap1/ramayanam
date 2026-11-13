# VOCAB — everyday vocabulary (शब्दकोशः)

1,121 entries in 29 categories: 716 nouns (with gender), 112 adjectives, 111 indeclinables, 113 verbs (laṭ 3rd singular),
35 pronoun forms and 34 courtesy phrases. 545 entries are level ≤ 1 (Śibira).

```ts
import { VOCAB, VOCAB_CATEGORIES, vocabForLevel, vocabByCategory, meta } from '@content/vocab';
vocabByCategory('animals', 1); // level-1 animals: गजः 🐘, सिंहः 🦁 …
```

| Field | Meaning |
|---|---|
| `sa` | citation form: noun in nominative singular (वृक्षः, फलम्, लता, पिता, राजा, दिक्); adjective in masculine nominative (सुन्दरः, महान्); avyaya as-is; verb in laṭ 3rd singular (पठति, लभते); phrase as spoken |
| `stem` | prātipadika of nominals (वृक्ष, पितृ, राजन्, दिश्) |
| `gender` | always present on nouns; absent on adjectives |
| `paradigm` | id of the SHABDA table the word declines like — same stem class, gender **and ṇatva behaviour**, so plain stem substitution is safe (पुत्र → `rama-m` पुत्रेण, गज → `deva-m` गजेन). Absent when no safe model exists (अम्बा, जामातृ, pronominal adjectives such as पूर्व, most consonant stems) |
| `emoji` | only where one emoji clearly depicts the meaning; unique within a category |
| `provenance.verifiedBy` | see below |

Categories: family, people, body, food, fruits, vegetables, animals, birds (& insects), nature, house, kitchen, school, clothing, colours,
professions, places, transport, modern objects, time, days, months (& seasons), directions, qualities, feelings, pronouns, questions, avyaya, verbs, greetings.
Numbers are not here (they live in `src/sanskrit/numbers.ts`).

## Conventions

- NFC Devanagari, class nasal before stops (सङ्ख्या, सङ्गणकम्, किन्तु), citation forms end in म् not ं; inside phrases a final म् is written ं before a consonant (कुशलं वा, शुभं भवतु).
- Spellings follow current usage where the dictionaries print the older doubled form: पत्रम्, छत्रम्, वार्ता (MW: पत्त्र, छत्त्र, वार्त्ता). कार्त्तिकः and ज्यैष्ठः are spelled as the dictionary headwords.
- Where the dictionary allows two genders, the one usual in spoken Sanskrit is used: ओदनम्, वर्षम्, शकटम् (n.); नखः, चरणः, कपाटः, आकाशः (m.).
- `level`: 1 = everyday words of the spoken camp, 2 = Praveśa, 3 = rarer / literary synonyms. A teaching judgement, not a fact about the language.
- Ids are ASCII slugs derived from the stem (diacritics dropped); homographs carry a suffix (`paksa-fortnight`, `patra-letter`, `vrddha-adj`). Ids are stable: never rename one.
- The word list is original (written from general knowledge of common vocabulary and then verified); it is **not** derived from any picture dictionary or published list.

## How it was verified

`tools/content/nominal/gen-vocab.ts` checks every line of `tools/content/nominal/vocab-list.ts`; a line that fails is dropped and reported
(`tools/content/nominal/reports/vocab-report.md`). Nothing is taken from the dictionaries except yes/no answers.

| Kind | Rule | Tags | Count |
|---|---|---|---|
| Noun, classical | stem **with this gender** in Monier-Williams, Apte (1890) or the Amarakośa, **and** an English keyword of the gloss found in the dictionary article of that gender | `oracle:mw#…`, `oracle:apte#…`, `oracle:amarakosha`, `gloss:mw` / `gloss:apte` | 632 |
| Noun / avyaya, dictionary word in a modern sense | gender and spelling from the dictionary; meaning from current usage (घटी clock, कक्षा class, विमानम् aeroplane, आलुकम् potato, युतकम् shirt …) | + `usage:samskrita-bharati(sense)` | 16 |
| Noun, modern coinage | established Samskrita Bharati usage; for compounds the last member must be a dictionary word of the same gender (दूरवाणी ← वाणी f., रेलयानम् ← यानम् n.) | `usage:samskrita-bharati`, `oracle:mw-or-apte(head …)` | 72 |
| Citation form | nominative confirmed in the SHABDA pack / Heritage / ashtadhyayi.com table or as Apte's headword; by rule only for regular अ, आ, इ, ई, उ stems | `…(nominative)`, `rule:nominative(regular stem)` | all nominals |
| Adjective | stem in MW / Apte + gloss keyword | as nouns | 112 |
| Avyaya | marked *ind.* in MW / Apte (or Amarakośa avyaya) + gloss keyword; किन्तु, परन्तु, कदाचित्, किञ्चित् as fusions of two dictionary indeclinables; परह्यः as usage | `oracle:mw#…(ind.)` | 111 |
| Verb, unprefixed | the form is the laṭ 3sg cell of a dhātu in the ashtadhyayi.com (vidyut) tables **and** occurs in Sanskrit Heritage; meaning keyword in the dhātupāṭha gloss or the MW root article | `oracle:ashtadhyayi-com-dhatu#…`, `oracle:heritage-roots`, `gloss:…` | 88 |
| Verb, prefixed | base form verified as above; prefixed root is an MW headword whose article contains the gloss; the join is either sandhi-free (आ+गच्छति, उद्+पतति) or attested in the DCS corpus (विस्मरति, प्रेषयति) | + `oracle:mw#Agam`, `rule:upasarga-join(no sandhi)` / `corpus:dcs(…)` | 25 |
| Pronoun form | must be the stated cell of a SHABDA paradigm | `pack:shabda#tad-m@1.1` | 35 |
| Phrase | every word is a verified form (pack form, finite verb in both conjugation datasets, kta participle, dictionary indeclinable or nominative of an MW stem) | `word:…`, `usage:samskrita-bharati` | 34 |

Supplementary: 573 entries are also attested (lemma + gender, or the verb form) in the DCS Rāmāyaṇa/Mahābhārata sample (`corpus:dcs(n)`).
842 entries carry a `paradigm` link; where an oracle has a full table for the very word, the link is kept only if the model reproduces that table.

The gloss check is a keyword heuristic (it resolves MW's "id." and "= synonym" one level): it catches a wrong word–meaning pairing,
it does not prove that the gloss is the best translation. Every gloss was additionally read by the author; a human reviewer has not yet signed off.

Dropped by the generator (4): चित्रकः 'leopard' (sense not in the dictionaries), समीपे (not an indeclinable headword), पिदधाति (irregular prefix form, unattested in the sample),
स्वीकरोति (cvi-formation, not in the conjugation tables). Withdrawn during review (3): a mistyped causative, चिटिका 'ticket' (usage not certain), आर्ये (could not be verified as a vocative).

### Sources and licences (lookup only — nothing is vendored)

| Dataset | Licence |
|---|---|
| Monier-Williams, Apte 1890 — Cologne Digital Sanskrit Lexicon (`sanskrit-lexicon/csl-orig`) | CC BY-NC-SA 3.0 |
| Amarakośa JSON, conjugation tables — `ashtadhyayi-com/data` | no LICENSE file; README permits use with credit |
| Sanskrit Heritage verb forms — `sanskrit/data` | LGPLLR |
| DCS sample — `ambuda-org/dcs` | CC BY 4.0 |

Because the dictionaries are non-commercial share-alike, the pack stores only its own glosses and the *fact* that a headword/gender exists
(tags name the headword consulted). Maintainers should confirm this reading of the licences before a commercial release.

## Tests

`node tools/test.mjs unit src/content/vocab` — `vocab.test.ts` (ids, uniqueness, Devanagari validity, gloss length, emoji, citation-vs-stem consistency,
paradigm links incl. ṇatva, levels, provenance rules, required words) and `oracle.test.ts` (rebuilds the pack from the datasets and requires byte-identical
output; re-checks gender tags and verb forms; skipped when `SAMSKURU_ORACLES` is absent).

## Adding a word

1. Add one line to the right category in `tools/content/nominal/vocab-list.ts` using `N/A/I/V/R/P` (see the header comment there). Give the *stem* for nominals.
2. `node --import tsx tools/content/nominal/gen-vocab.ts`; read the word's line in `reports/vocab-report.md`. If it was dropped, the reason is there
   (wrong gender? different dictionary spelling? gloss keyword missing → add `kw`). Use `modern: true` only for coinages you are certain of.
3. Never edit `data.ts`; never change an existing id. Add the word to REVIEW.md → awaiting review.

## Known gaps

- No numerals, no sentences, no synonyms cross-links, no plural-only words; feminine forms of adjectives are not listed (derive with SHABDA models लता / नदी only after review).
- Verb entries give one form; conjugation lives in the DHATU pack. Prefixed verbs whose join needs sandhi and that are absent from the corpus sample are missing (e.g. प्रणमति, निषीदति).
- Regional/alternative modern words (बस्यानम्, वार्तापत्रिका, दूरभाषः …) are not included; one established form per meaning.
