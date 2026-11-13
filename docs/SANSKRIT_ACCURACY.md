# Sanskrit accuracy policy

The product promise is that a learner can trust every akṣara they see. This document says how
that promise is kept, and what "verified" means here. It is deliberately strict.

## Principles

1. **Closed world.** A game may show or accept only Sanskrit that comes from
   (a) a content pack under `src/content/` or (b) a deterministic engine under `src/sanskrit/`.
   No procedurally invented words, no pseudo-Sanskrit filler, no model-written Sanskrit at runtime.
2. **Two independent confirmations.** A pack item ships when at least two of these agree:
   a rule engine in this repo; an external reference dataset ("oracle"); a printed/standard source
   named in the item's provenance. Where only one exists, the item is listed in the pack's
   `REVIEW.md` as single-source and waits for a human.
3. **Humans have the last word.** Machine checks catch typos and rule violations; they do not
   replace a Sanskrit scholar. Each pack has a `REVIEW.md` sign-off table. Only a human reviewer
   sets `humanReviewed: true`. Agents never tick that box.
4. **When unsure, leave it out.** Coverage is never a reason to include a doubtful form.
5. **Never "fix" a source text.** Verses are stored letter-for-letter from the cited corpus.
   If a verse does not scan, record the anomaly (e.g. `meterNote: 'vipulā'`) — do not edit it.

## Layers

| Layer | Location | What guarantees correctness |
|---|---|---|
| Script | `src/sanskrit/translit.ts`, `akshara.ts` | Round-trip tests over all C×V combinations and conjuncts; `validateDeva` structural check |
| Sound classes | `src/sanskrit/varna.ts` | Table tests against the varṇamālā and the 14 Māheśvara-sūtras |
| Sandhi | `src/sanskrit/sandhi.ts` | Rule registry with sūtra references; every registry example and counter-example is executed as a test |
| Metre | `src/sanskrit/chandas.ts` | Definitions cross-checked (pattern ↔ gaṇa formula); real verses must scan |
| Paradigms | `src/content/shabda`, `dhatu` | Generated from reference data, cross-checked against a second source, golden textbook tables in tests |
| Words | `src/content/vocab` | Dictionary attestation of spelling and gender |
| Sentences | `src/content/sentences` | Generated from verified forms by agreement-checked patterns |
| Verses | `src/content/subhashita` | Verbatim from cited corpus; metre verified by the engine |
| Games | `src/games/*` | Contract tests + per-game tests that every puzzle has exactly the keyed answers |

## Conventions (so that string comparison is meaningful)

- Unicode NFC Devanagari; no ZWJ/ZWNJ; no nukta letters.
- Inside a word, a nasal before a stop is written as the class nasal (सङ्ख्या, पञ्च, दण्डः, सन्धिः, सम्बन्धः); anusvāra before य र ल व श ष स ह (संस्कृतम्, संयोगः). Word-final म् is written म् in citation tables and before vowels/pause, and as anusvāra before a consonant in running text (अहं गच्छामि).
- Citation forms: nominals in nominative singular (वृक्षः), verbs in laṭ prathama-puruṣa singular (पठति), roots without anubandhas (पठ्).
- `Forms` arrays: index 0 is the conventional textbook form (what we display); every member is accepted as an answer.
- Internal encoding for computation is SLP1; IAST is display-only and always derived.

## Known hard cases every game must respect

| Trap | Requirement |
|---|---|
| Code points ≠ letters | Count, split and compare by akṣara (`splitAksharas`), e.g. क्ष्म्या is one akṣara. |
| Homographic paradigm cells | रामाभ्याम् is tṛtīyā, caturthī and pañcamī dual — accept all, or do not ask. |
| Optional forms (vikalpa) | मत्यै / मतये both correct. Use `Forms`. |
| Free word order | बालकः पुस्तकं पठति = पुस्तकं बालकः पठति. Accept all valid orders or ask for something order-independent. |
| Sandhi exceptions | सः/एषः drop visarga before consonants; pragṛhya duals do not combine; r-final words (पुनः, प्रातः, अन्तः) behave unlike -aḥ words. The engine needs to be told; content carries the flag. |
| ṇatva | रामेण but देवेन; never derive by naive suffixing. Forms come from packs. |
| Final syllable in metre | A pāda-final syllable may count as guru. Use `matchMeter`/`checkAnustubh`, not raw string equality. |
| Anusvāra vs class nasal | Normalise before comparing typed answers (`normalizeDeva` + the pack's convention). |
| भवान् / भवती | Takes a third-person verb. |

`src/sanskrit/accuracy.test.ts` turns the full risk list (see `docs/research/sanskrit-data-and-curriculum.md`, section 4) into executable tests.

## Adding or changing Sanskrit content

1. Add the item to the pack's data with `provenance.source` and `verifiedBy`.
2. Run the pack's generator/verification script if it has one (`tools/content/*/README.md`).
3. `npm run validate` and `npm test` must pass.
4. Add the item to the pack's `REVIEW.md` "awaiting human review" list.
5. A human Sanskrit reviewer approves the PR (see `CONTRIBUTING.md` → reviewers).

## Reporting an error

Open an issue with: where you saw it (game, level, screenshot), what is shown, what it should be,
and a reference. Errors in Sanskrit are P0: the item is removed first and investigated second.

## Honest status

"Verified" in this repository means: mechanically checked as described above. It does **not** yet
mean reviewed by a Sanskrit scholar. Each pack's `REVIEW.md` shows what a human has and has not
signed off. Treat unsigned content as release-candidate, not final.

An independent (AI) audit of the engine and all packs was run on 11 Nov 2026; its findings, what was
corrected and what is still open for a scholar are in [docs/audit/README.md](audit/README.md).
