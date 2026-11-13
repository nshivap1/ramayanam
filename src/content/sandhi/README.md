# Sandhi example pack (`src/content/sandhi`)

847 sandhi examples built from real words and natural word pairs, one or more for every rule of the Samskuru
sandhi engine (`SANDHI_RULES` in `src/sanskrit/sandhi.ts`), tagged by family, rule and level.

```ts
import { SANDHI_EXAMPLES, sandhiByFamily, sandhiByRule, meta } from '@content/sandhi';
sandhiByRule('guna');           // गण + ईशः = गणेशः …
sandhiByFamily('visarga', 3);   // visarga examples at level ≤ 3
```

## Contents

| family | rules (examples) |
|---|---|
| svara (247) | savarna-dirgha 41 · guna 42 · vrddhi 32 · yan 46 · ayadi 29 · purvarupa 24 · yava-lopa 18 · pragrhya 15 |
| visarga (305) | visarga-o-avagraha 25 · visarga-o 32 · visarga-lopa-a 22 · visarga-lopa-aa 20 · visarga-rutva 41 · visarga-satva 38 · visarga-kupvoh 15 · visarga-shari 21 · visarga-sah-esah 20 · visarga-r-final 24 · r-lopa-dirgha 13 · visarga-bhoh 12 · visarga-shatva 22 |
| vyañjana (295) | jashtva 42 · cartva 19 · shcutva 22 · shtutva 7 · parasavarna-l 15 · chatva 14 · anunasika 28 · purvasavarna-h 13 · udah-stha 8 · anusvara 28 · anusvara-parasavarna 38 · n-rutva 21 · namut 24 · tuk 16 |

Levels: 2 = 144 (common vowel sandhi), 3 = 457, 4 = 246. Visarga and consonant sandhi start at level 3.

Files: `types.ts` (interfaces) · `data.ts` (GENERATED, one example per line) · `pending.ts` (26 correct forms the
engine cannot produce; not playable content) · `index.ts` · `data.test.ts`.

## Conventions

- `first`, `second`: the two parts in their independent (pre-sandhi) form — nominal words with visarga (`रामः`),
  `तत्`, `सम्`, stems as first members of compounds (`देव`, `महा`, `मनः`).
- `result`: the joined form. When the two words stay written apart the single space is kept (`रामो गच्छति`,
  `अहं गच्छामि`, `राम आगच्छति`); a word ending in a consonant is written together with the next (`तच्च`, `हरिरस्ति`).
- `ruleId`: the engine rule that yields `result` (ids of `SANDHI_RULES`).
- `compound: true`: the junction is inside one word — a compound, upasarga + word, or (for `ayadi`) a textbook
  derivation such as ने + अनम् = नयनम्. Otherwise the two parts are separate sentence words.
- `options`: what must be passed to `joinSandhiDeva(first, second, options)`: `compound`, `internal`, `rFinal`
  (अन्तः = antar), `pragrhya` (dual in ī / ū / e).
- `alternatives`: other equally correct outcomes for the same parts (संकल्पः beside सङ्कल्पः, जगद्नाथः beside
  जगन्नाथः, हरिश्शेते beside हरिः शेते …). Games must accept them as answers.
- Class nasals are written (सङ्कल्पः, सञ्चयः, सन्तोषः); the anusvāra spelling is always among `alternatives`.
- Glosses (`en`) describe the combined expression.

## Verification

1. **Engine (all 847).** `gen-sandhi.ts` emits an item only if `joinSandhiDeva` returns `result` (as main result
   or listed alternative) *under the rule the author declared*; `data.test.ts` repeats this on every test run and also
   checks that `alternatives` equals the engine's other outcomes. → `engine:joinSandhiDeva`
2. **Independent rule table (697).** The junction is looked up in the CC0 sandhi table of `sanskrit/data`
   (learnsanskrit.org, after Kale's grammar), which is independent of the engine. → `oracle:learnsanskrit-sandhi-rules`.
   The other 150 items belong to rules that table does not cover by design (सः / एषः, भोः, pragṛhya, निस् / दुस् + क प,
   cartva from stem-final द्, some vocatives) — no contradiction was found.
3. **Attestation of the result.** Compound results are looked up as headwords in Monier-Williams (386) and Apte
   (129) → `oracle:mw-headword`, `oracle:apte-headword`; every result is searched as whole token(s) in Devanagari
   e-texts of the Gītā, Rāmāyaṇa and Mahābhārata (292 hits) → `corpus:<name>`.

The oracle-dependent checks are re-run by `data.test.ts` when the corpora are present (`SAMSKURU_ORACLES`), by
regenerating the file and comparing it byte for byte; without the corpora that test is skipped.

## Adding examples

1. Add a line to `tools/content/sahitya/sources/sandhi.txt` under the right `## rule | family | level` header:
   `first + second = result ; gloss ; flags` (flags: `c` compound, `i` internal, `r` r-final, `p` pragṛhya, `L4`,
   `mw:<stem>`). Append at the END of a section — ids are numbered by position.
2. `node --import tsx tools/content/sahitya/gen-sandhi.ts` — read the report: anything the engine does not
   reproduce is dropped with the engine's own output shown.
3. `node tools/test.mjs unit src/content/sandhi`.

Never edit `data.ts` by hand. If the engine is wrong, do not "fix" the example: log the case in
`sanskrit-engine-issues.md` and put the item in `pending.ts`.

## Known gaps

- Word-internal consonant sandhi (इष् + तः = इष्टः), ṇatva and ṣatva (प्रणामः, रामायणम्, निषिद्धः) and lexical
  specials (नमस्कारः, भास्करः, संस्कृतम्, मनीषा, गवाक्षः …) are outside `joinSandhiDeva`; 26 such forms are kept in
  `SANDHI_PENDING_ENGINE` with their sūtra, flagged `pendingEngine: true`, and are **not** in `SANDHI_EXAMPLES`.
- `shtutva` (7) and `udah-stha` (8) have few natural examples.
- No Vedic sandhi, no pluta, no optional anunāsika of y / v / l after anusvāra.
- 38 compound results (listed in REVIEW.md) are in neither dictionary nor corpus; the sandhi itself is certain.

## Sources and licences

| source | used for | licence |
|---|---|---|
| Samskuru sandhi engine | verification | project licence |
| `sanskrit/data` → `learnsanskrit.org/sandhi-rules.csv` | independent junction check | CC0 |
| Monier-Williams, Apte 1890 (`sanskrit-lexicon/csl-orig`) | headword attestation (lookup only; no dictionary text is copied) | CC BY-NC-SA 3.0 |
| `vedicscriptures/bhagavad-gita`, `bhavykhatri/DharmicData` | phrase attestation (lookup only) | GPL-3.0 / ODbL |

The examples themselves are short word pairs authored for Samskuru (CC0).
