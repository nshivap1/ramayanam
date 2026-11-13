# Samāsa pack (`src/content/samasa`)

244 textbook-standard compounds with their conventional (laukika) vigraha, type, subtype, member stems and an
English gloss.

```ts
import { SAMASAS, SAMASA_TYPES, samasasByType } from '@content/samasa';
samasasByType('bahuvrihi');   // पीताम्बरः — पीतम् अम्बरं यस्य सः …
SAMASA_TYPES.dvigu.hint;      // one-sentence learner explanation
```

## Contents

| type | n | subtypes |
|---|---|---|
| tatpurusha | 64 | द्वितीया 5 · तृतीया 9 · चतुर्थी 4 · पञ्चमी 7 · षष्ठी 28 · सप्तमी 11 |
| karmadharaya | 26 | विशेषणपूर्वपद · उपमानपूर्वपद · उपमानोत्तरपद · अवधारणापूर्वपद · विशेषणोभयपद |
| dvigu | 12 | समाहार-द्विगुः |
| dvandva | 27 | इतरेतर 25 · समाहार 2 |
| bahuvrihi | 36 | समानाधिकरण · व्यधिकरण · उपमान · नञ् · प्रादि |
| avyayibhava | 22 | by sense: पदार्थानतिवृत्तौ, वीप्सायाम्, सामीप्ये, अभावे, योग्यतायाम् … |
| nan-tatpurusha | 21 | |
| upapada | 36 | |

Levels: 4 for the commonest transparent compounds (recognition), 5 otherwise (formal samāsa analysis is Kovida
material).

Files: `types.ts` · `data.ts` (GENERATED, one compound per line) · `index.ts` (with `SAMASA_TYPES`) · `data.test.ts`.

## Conventions

- `compound`: the usual citation form — nominative singular (`राजपुरुषः`, `नीलोत्पलम्`, `त्रिलोकी`), dual / plural for
  itaretara-dvandvas (`रामलक्ष्मणौ`, `देवासुराः`), the indeclinable form for avyayībhāvas (`यथाशक्ति`, `प्रतिदिनम्`).
- `vigraha`: separate words, **no sandhi applied** (`पीतम् अम्बरं यस्य सः`, `राजा च असौ ऋषिः च`), word-final म् written as
  anusvāra only before a consonant. Shapes are fixed per type and enforced by the tests: bahuvrīhi ends in सः / सा
  and contains a form of यद्; upapada ends in इति; nañ starts with न; samāhāra-dvigu ends in समाहारः; dvandva has
  one च per member.
- `members`: stems in compound order (`राजन्`, `पुरुष`); for nañ compounds the first member is `न`; for upapada
  compounds the last member is the kṛt-final element (`कार`, `ज्ञ`, `द`, `स्थ`).
- `subtype`: the finer traditional class, in Sanskrit.
- Ekaśeṣa (`पितरौ`) is not a samāsa and is excluded.

## Verification

The classification and the vigraha are the author's, following the standard school presentation; they are
**not** something a program can prove. What is mechanical:

- every vigraha word is a real inflected form: found in the ashtadhyayi.com subanta table (9,007 paradigms), or
  formed from a dictionary stem by the same ending-replacement as a paradigm of that table (with ṇatva re-applied by
  the Samskuru `applyNatva`), or a present-tense form of the ashtadhyayi.com tiṅanta table, or one of ten listed
  indeclinables → `oracle:ashtadhyayi-com-forms(vigraha)` (244 / 244; 57 items use the analogy route);
- a word that visibly belongs to a member stem must be explained by that stem (so `नद्यस्य`, `देवेण`, `पुस्तकाणाम्` are
  rejected — see the negative cases in `data.test.ts`);
- every member stem is a Monier-Williams / Apte headword → `oracle:mw-member-stems` (244 / 244);
- the compound itself is a headword of Monier-Williams (213) and / or Apte (31) → `oracle:mw-headword`,
  `oracle:apte-headword`. 30 compounds are in neither (mostly dvandvas of names and transparent school examples;
  listed in REVIEW.md).

`data.test.ts` regenerates the file and compares it when the corpora are present; otherwise that test is skipped.

## Adding compounds

1. Add a line to `tools/content/sahitya/sources/samasa.txt` under the right `## type | level` header:
   `compound | vigraha | subtype | member,stems | English | flags` (flags: `L4`, `mw:<stem>`). Append at the end of a
   section — ids are positional.
2. `node --import tsx tools/content/sahitya/gen-samasa.ts`, read the report, then
   `node tools/test.mjs unit src/content/samasa`.
3. Include a compound only when both its type and its vigraha are beyond dispute. If grammarians differ, leave it
   out or record the accepted alternative in `subtype` and in REVIEW.md.

## Known gaps

- No taddhitārtha / uttarapada dvigu, no madhyamapadalopī compounds, no aluk-samāsa section, no kugati / prādi
  tatpuruṣa section, no ekaśeṣa.
- Deliberately left out as debatable: पुरुषोत्तमः (सप्तमी vs. निर्धारण-षष्ठी), नरसिंहः, सप्तर्षयः, गुरुदक्षिणा, पदच्युतः, अहोरात्रः,
  शीतोष्णम्, निर्जनम्.
- The form check validates that a vigraha word is *a* form of its stem, not that it is the *right case* for the
  subtype; that is covered by the shape tests only partly and needs the human review.

## Sources and licences

| source | used for | licence |
|---|---|---|
| `ashtadhyayi-com/data` (`shabda/data2.txt`, `dhatu/dhatuforms_vidyut_shuddha_kartari.txt`) | validating vigraha word-forms (lookup only) | no licence file; README permits use with credit |
| Monier-Williams, Apte 1890 (`sanskrit-lexicon/csl-orig`) | headword lookups (no dictionary text copied) | CC BY-NC-SA 3.0 |

The list, analyses and glosses are authored for Samskuru.
