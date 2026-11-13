# tools/content/verbal — generators for the dhātu and sentence packs

These scripts build `src/content/dhatu/data.ts` and `src/content/sentences/data.ts` from reference
datasets ("oracles"). The generated files are committed; the packs and their tests work without the
datasets (oracle re-verification tests are skipped when they are absent).

## Datasets

Set `SAMSKURU_ORACLES` to a directory (default `/home/claude/refs/data`) holding shallow clones
named `<owner>_<repo>`:

| directory | repository | used for |
|---|---|---|
| `ashtadhyayi-com_data` | ashtadhyayi-com/data (`dhatu/`, `shabda/`) | primary verb, kṛdanta and noun forms; dhātupāṭha metadata |
| `drdhaval2785_SanskritVerb` | drdhaval2785/SanskritVerb (`generatedforms/verbforms.tar.gz`) | independent verb engine |
| `sanskrit_data` | sanskrit/data (`sanskrit-heritage-site/`, `learnsanskrit.org/`, `monier-williams/`) | Heritage forms, CC0 ending tables, MW lists |
| `sanskrit-lexicon_csl-inflect` | sanskrit-lexicon/csl-inflect (`huetdata/extract/`) | complete Heritage conjugation tables |
| `ambuda-org_dcs` | ambuda-org/dcs | corpus attestations (kṛdantas, prefixed verbs, lyap) |
| `ambuda-org_vidyut` | ambuda-org/vidyut (`vidyut-prakriya/tests`) | Kāśikā / Kaumudī example forms |
| `sanskrit-lexicon_csl-orig` | sanskrit-lexicon/csl-orig (`v02/mw`, `v02/ap90`) | dictionary citations, adjective genders |

The datasets are untrusted input: the scripts only read data files (JSON, CSV, TSV, XML inside one
tar.gz, plain text) and never execute anything from them.

## Regenerating

```bash
node --import tsx tools/content/verbal/gen-dhatu.ts        # → src/content/dhatu/data.ts + verification-report.json
node --import tsx tools/content/verbal/gen-sentences.ts    # → src/content/sentences/data.ts   (needs the dhātu and shabda packs)
node tools/test.mjs unit src/content/dhatu
node tools/test.mjs unit src/content/sentences
```

Both generators are deterministic: with unchanged inputs the output is byte-identical. Run
`gen-sentences.ts --skipped` to list combinations that were skipped because a form could not be
verified, `--lexicon` to see which reference confirmed each hand-typed stem.

## Files

| file | role |
|---|---|
| `oracles.ts` | read-only loaders and the shared SLP1 normalisation (class nasal, pausa finals) |
| `dhatu-list.ts` | **curated input**: which dhātus (dhātupāṭha index), taught pada, level, gloss, display preferences |
| `dhatu-build.ts` | cell-by-cell cross-check A ∩ (B ∪ C); kṛdanta checks; display ordering |
| `prefixed-list.ts` | **curated input**: prefix + base dhātu + gloss |
| `prefixed-build.ts` | `joinPrefix` (conservative upasarga sandhi that refuses unknown contexts), attestation, lyap |
| `gen-dhatu.ts` | writes the dhātu data file and the verification report |
| `nominal.ts` | verified noun / pronoun forms: oracle lookup, model declension + ṇatva, independent ending tables |
| `sentence-lexicon.ts` | **curated input**: stems, genders, glosses, indeclinables, who-can-do-what table |
| `gen-sentences.ts` | pattern generators, lexicon verification, deterministic selection, output |

## Rules of the house

- Curated inputs contain stems, roots, indices and English — **never an inflected Sanskrit form**.
- A form is shipped only when two independent sources agree on it in the same grammatical cell (or,
  for prefixed verbs and lyap, when the joined form is attested). Unconfirmed → dropped and reported.
- Sorting inside an oracle cell is meaningless (often alphabetical); the display form is chosen by the
  rules in `dhatu-build.ts` plus the `prefer` lists, and every choice is listed for human review.
- When a golden table in a test disagrees with generated data, find out which is wrong; never edit
  the data file or the golden table just to make them match.
