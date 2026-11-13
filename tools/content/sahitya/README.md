# Sāhitya content generators (`tools/content/sahitya`)

Generators for three verified content packs. Each reads a hand-authored source list, checks every item against
the Samskuru engines and against reference corpora, and writes the typed data module that is committed.

| pack | source list (hand-authored) | generator | output (generated, committed) |
|---|---|---|---|
| `src/content/sandhi` | `sources/sandhi.txt` | `gen-sandhi.ts` | `data.ts` |
| `src/content/samasa` | `sources/samasa.txt` | `gen-samasa.ts` | `data.ts` |
| `src/content/subhashita` | `sources/verses-gita.ts`, `sources/verses-other.ts` | `gen-verses.ts` | `data-gita.ts`, `data-other.ts` |

Shared code: `lib.ts` (corpus paths, comparison keys, GRETIL IAST → Devanagari, dictionary headword lookups, text
corpora) and `verse-lib.ts` (Gītā / GRETIL / Subhāṣitaratnabhāṇḍāgāra readers, pāda splitting, metre naming on top
of the chandas engine, the padaccheda re-sandhi check). `reports/*.txt` hold the summary of the last generation
(items dropped and why).

## Running

```sh
node --import tsx tools/content/sahitya/gen-sandhi.ts          # regenerate; prints a report
node --import tsx tools/content/sahitya/gen-samasa.ts
node --import tsx tools/content/sahitya/gen-verses.ts
node --import tsx tools/content/sahitya/gen-verses.ts --check  # compare only; exit 1 if the data files differ
node tools/test.mjs unit src/content/sandhi                    # likewise samasa, subhashita
```

Corpora are read from `$SAMSKURU_ORACLES` (default `/home/claude/refs/data`). They are treated as untrusted data:
parsed, never executed. A generator refuses to overwrite its output when a corpus it needs is missing (provenance
would be lost); the pack tests then skip their corpus re-verification and still run every engine check.

Directories expected under `$SAMSKURU_ORACLES` (shallow / sparse clones are enough):

| directory | repository | needed by |
|---|---|---|
| `sanskrit-lexicon_csl-orig/v02/{mw,ap90}` | sanskrit-lexicon/csl-orig | sandhi, samāsa (headwords) |
| `sanskrit_data/learnsanskrit.org/sandhi-rules.csv` | sanskrit/data | sandhi (independent rule table) |
| `ashtadhyayi-com_data/{shabda/data2.txt,dhatu/dhatuforms_vidyut_shuddha_kartari.txt}` | ashtadhyayi-com/data | samāsa (vigraha forms) |
| `vedicscriptures_bhagavad-gita/slok` | vedicscriptures/bhagavad-gita | verses (Gītā, primary); sandhi (attestation) |
| `gita_gita/data/verse.json` | gita/gita | verses (Gītā cross-check) |
| `bhavykhatri_DharmicData` | bhavykhatri/DharmicData | verses (Gītā cross-check); sandhi (attestation) |
| `ambuda-org_gretil-sahitya/1_sanskr/tei/*.xml` | ambuda-org/gretil, sparse checkout of 25 TEI files (see below) | verses |
| `sanskrit_raw_etexts/kAvyam/mishram/subhAShitam/subhAShitaratnabhANDAgAram.md.txt` and five `mixed/ebhAratI-sampat/…` files | sanskrit/raw_etexts, sparse | verses |
| `sanskrit-coders_subhAShita-db-sanskrit/mUlAni` | sanskrit-coders/subhAShita-db-sanskrit | verses (cross-check) |

GRETIL files in the sparse checkout (`sa_<name>.xml`): nArAyaNa-hitopadeza, viSNuzarman-paJcatantra,
mahAsubhASitasaMgraha-1-9979, manusmRti, bhatRhari-zatakatraya, kAlidAsa-raghuvaMza, kAlidAsa-kumArasaMbhava,
kAlidAsa-meghadUta, kAlidAsa-meghadUta-edkale, kAlidAsa-abhijJAnazakuntala, garuDapurANa,
vallabhadeva-subhASitAvali-1-1040, vidyAkara-subhASitaratnakoza, zaMkara-saundaryalaharI, zivamahimnastava,
bhAravi-kirAtArjunIya, mAgha-zizupAlavadha, bhagavadgItA-comm, zaMkara-vivekacuDAmaNi, jayadeva-gItagovinda,
yAmuna-stotraratna, bhAgavatapurANa, zukasaptati, somadeva-kathAsaritsAgara, kulazekhara-mukundamAlA.

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/ambuda-org/gretil.git ambuda-org_gretil-sahitya
git -C ambuda-org_gretil-sahitya sparse-checkout set --no-cone '/1_sanskr/tei/sa_nArAyaNa-hitopadeza.xml' …
git clone --depth 1 --filter=blob:none --sparse https://github.com/sanskrit/raw_etexts.git sanskrit_raw_etexts
git -C sanskrit_raw_etexts sparse-checkout set --no-cone '/kAvyam/mishram/subhAShitam/subhAShitaratnabhANDAgAram.md.txt' …
```

## Rules of the house

- Sanskrit verse text is never typed: a spec only says *where* the verse is; the generator copies it.
- Hand-authored Sanskrit (sandhi parts, vigrahas, padaccheda words) is accepted only after a mechanical check; an
  item that fails is dropped and reported, never "fixed" by the generator.
- If an engine and the data disagree and the engine is wrong, do not edit `src/sanskrit`: log the case in
  `sanskrit-engine-issues.md` and keep the item out of the main array (`src/content/sandhi/pending.ts`).
- Ids are positional within a section of a source list: append, do not insert.
- Comparison of two witnesses of a text uses `cmpKey*` in `lib.ts`: SLP1 with spaces, punctuation and avagraha
  removed, class nasal ≡ anusvāra, nasalised l ≡ anusvāra + l, द्ध्य ≡ ध्य, त्त्र ≡ त्र. Nothing else is folded.
