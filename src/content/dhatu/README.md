# dhatu — verb conjugations (धातुरूपाणि)

199 high-frequency dhātus of all ten gaṇas with **laṭ, laṅ, lṛṭ, loṭ, vidhiliṅ** in the pada(s)
learners are taught, their common kṛdantas, lyap forms with real upasargas, and 155 prefixed
verbs. Everything is generated from reference datasets; nothing is typed by hand.

```ts
import { DHATUS, dhatu, conj, padasOf, dhatusForLevel, PREFIXED, meta } from '@content/dhatu';

const gam = dhatu('gam-1p')!;
conj(gam, 'lat', 'P', 1, 1);      // ['गच्छति']            prathama-puruṣa ekavacana
conj(gam, 'lot', 'P', 2, 1);      // ['गच्छ', 'गच्छतात्']   first = form to show, all = accepted answers
conj(gam, 'lat', 'A', 1, 1);      // []                   pada not taught for this root
gam.krdanta.ktva;                 // ['गत्वा']
gam.lyap;                         // [{ upasarga: 'आ', form: 'आगत्य', en: 'having come' }, …]
PREFIXED.find((p) => p.id === 'a-gam'); // { upasarga: 'आ', base: 'gam-1p', lat3s: 'आगच्छति', … }
```

## Contents

| gaṇa | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| dhātus | 87 | 17 | 7 | 26 | 5 | 19 | 7 | 2 | 6 | 23 |

Levels: L1 42 · L2 68 · L3 68 · L4 21 (editorial, after the Samskrita Bharati ladder).
12,385 finite forms in 11,739 cells · 1,340 kṛdanta forms · 96 lyap forms · 155 prefixed verbs.

## Conventions

- **Order of persons** is the Sanskrit one: `purusha` 1 = prathama (he/she/it), 2 = madhyama, 3 = uttama.
- **`Forms[0]` is the form to display**; every member is a correct answer. Order inside a cell:
  forms both independent engines confirm → curated preference (`prefer` in the list) → seṭ before
  aniṭ future → shorter. तातङ् imperatives (भवतात्, a blessing form valid in loṭ 3sg / 2sg) are
  accepted but always last.
- **`pada` is the pada taught**, which can be narrower than the dhātupāṭha (धाव् is listed `P`).
  `'U'` roots carry both tables. `[]` = the cell / pada / lakāra is not offered.
- **Spelling**: NFC Devanagari; class nasal before a stop inside a word (गच्छन्ति, भुङ्क्ते), anusvāra
  only before semivowels / sibilants / ह (हंसि, संहरति); pausa finals (अपठत्, never अपठद्; final म्).
- **gaṇa** follows the Pāṇinian dhātupāṭha (`dhatupatha` = ashtadhyayi.com index). श्रु is therefore
  gaṇa 1 although it conjugates like gaṇa 5 — see its `note`.
- **kṛdanta**: kta / ktavatu / śatṛ / śānac / tavya / anīyar as masculine nominative singular;
  ktvā / tumun as the indeclinable. A missing key means "not verified", not "does not exist".
- **Prefixed verbs** store only laṭ 3sg; `upasarga` is the citation form (`उद्`, `निर्`, `प्रति+आ`);
  gati and cvi words are included (`नमस्`, `अलम्`, `स्वी`).
- Optional non-ṇic forms of curādi roots (घोषति, चिन्तति) are deliberately not listed.

## Verification method

A finite form is shipped only if it stands **in the same paradigm cell** of

1. **A — ashtadhyayi.com dhātu tables** (output of the Pāṇinian engine *vidyut-prakriya*), and
2. at least one **independent engine**: **B — SanskritVerb** (Dhaval Patel's Pāṇinian PHP engine)
   or **C — Sanskrit Heritage** (Gérard Huet, INRIA; via `sanskrit/data` and `csl-inflect`).

| | finite forms |
|---|---|
| shipped | 12,385 |
| confirmed by B | 11,926 |
| confirmed by C | 11,496 |
| confirmed by both B and C | 11,037 |
| only B / only C | 889 / 459 |
| in A but confirmed by nobody → **dropped** | 140 forms, 6 whole cells |
| optional non-ṇic curādi forms → dropped by policy | 188 |

Kṛdantas: form from A; accepted when the stem is in Sanskrit Heritage's participle / infinitive /
gerund lists **or** the form is attested at least twice in the lemmatised Digital Corpus of Sanskrit
(DCS), and (declinables) an independent stem → nominative rule reproduces the form
(1,340 shipped: Heritage 1,302, DCS 459; 232 dropped). Present participles must also match the pack's own laṭ stem (गच्छन्ति → गच्छन्).
Prefixed verbs: deterministic `joinPrefix(prefix, verified base form)`; kept only if the junction is
attested (DCS 146, dictionary citation 6) or, for a plain concatenation, Monier-Williams lists the
prefixed root (3). lyap forms must be attested in DCS as gerunds.

`provenance.verifiedBy` names the sources that confirmed the entry; `evidence` gives the counts.
`verification-report.json` lists every dropped cell / form and every multi-form cell.
`dhatu.test.ts` re-runs the whole comparison when the datasets are present (`SAMSKURU_ORACLES`).

## Sources and licences (for maintainer review)

| Source | Role | Licence | Shipped? |
|---|---|---|---|
| ashtadhyayi-com/data (`dhatu/*vidyut*`, `data.txt`) | primary forms, artha, upadeśa | no LICENSE file; README: free to use with credit — **get written confirmation** | forms and metadata are derived from it |
| ambuda-org/vidyut | generator of the above; test assertions | MIT | no |
| drdhaval2785/SanskritVerb | independent engine | no LICENSE ("GNU" in a header) | no — comparison only |
| Sanskrit Heritage via sanskrit/data, csl-inflect | independent engine | LGPLLR / LGPL-3.0 | no — comparison only |
| ambuda-org/dcs (Digital Corpus of Sanskrit) | attestations | CC BY 4.0 | no — comparison only |
| Cologne MW / Apte, MW lists in sanskrit/data | prefixed-verb existence, citations | CC BY-NC-SA 3.0 | no — consulted only |

## How to add or change

1. Add a row to `tools/content/verbal/dhatu-list.ts` (dhātupāṭha index, taught pada, level, gloss)
   or `prefixed-list.ts`. Never write a conjugated form.
2. `node --import tsx tools/content/verbal/gen-dhatu.ts`, read the summary and
   `verification-report.json` (dropped cells, single-engine roots).
3. `node tools/test.mjs unit src/content/dhatu`; add a golden table for an irregular root.
4. List anything unusual in `REVIEW.md`. Only a human reviewer sets `humanReviewed`.

## Known gaps

- 6 withheld cells (see REVIEW.md §2); kṛdantas missing where no second source confirmed them
  (e.g. शिक्षित्वा, खेलित्वा, भाषमाणः; all kṛdantas of कूर्द्, शिक्ष्; kta of several curādi roots).
- अस्: lṛṭ is the suppletive भविष्यति; its other ārdhadhātuka kṛdantas (भूत्वा …) are not listed under अस्.
- Valid alternates no second engine has: वेद-series of विद्, भ्रम्यति, some स्तवीति forms.
- Prefixed verbs carry laṭ 3sg only; not accepted for lack of attestation: उपागच्छति, आविष्करोति,
  प्ररभते, परिश्राम्यति, उल्लिखति. No karmaṇi, ṇijanta, liṭ, luṅ, lṛṅ, āśīrliṅ.
