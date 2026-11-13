# Independent Sanskrit audit — 11 Nov 2026

Two reviewers that had not seen the content being built read the engine and all seven packs.
They are AI reviewers working from grammar and reference datasets — **not** a substitute for a human
scholar's sign-off, but a second, independent pass. Full reports: [SANSKRIT_AUDIT_A.md](SANSKRIT_AUDIT_A.md)
(shabda, vocab, dhatu, sentences) and [SANSKRIT_AUDIT_B.md](SANSKRIT_AUDIT_B.md) (engine, sandhi, samasa, verses).

## Coverage and findings

| Area | Examined | Certain errors | Probable / for a scholar |
|---|---|---|---|
| shabda — 173 paradigms | all, read in full | 0 | 0 |
| vocab — 1,121 words | all | 0 | 3 |
| dhatu — 199 roots | all roots at 4 key cells, 57 full paradigms, all kṛdantas, 155 prefixed verbs (about 11,000 finite forms **not** read one by one) | 0 | 4 |
| sentences — 671 | all | 1 sentence, 24 word glosses, 31 role labels | 3 tags, ~25 unnatural sentences |
| engine — sandhi rules, 281 probes, pratyāhāras, varṇa table, 20 metres, numbers | all listed | 3 (probe outputs) | 4 |
| sandhi — 847 examples | all | 2 | 5 |
| samasa — 244 compounds | all | 0 | 2 |
| verses — 135 | all (Gītā collated by script; the other 67 read against standard readings) | 2 | 4 |

No wrong inflected form was found in any paradigm or conjugation table that was read.

## What was done with the certain errors (all applied in this release)

| Finding | Action | Where |
|---|---|---|
| रामाः मोदकम् खादन्ति (a proper name pluralised) | sentence removed | `src/content/sentences/audit-overlay.ts` |
| 24 verb glosses carried a separate न ("does not go" for गच्छति) | glosses corrected | same |
| nouns with सह / विना / नमः tagged as kāraka roles | role is now `upapada` (upapada-vibhakti) | same; `Role` type extended |
| शाकम् tagged masculine in 3 sentences, neuter in vocab | tag set to neuter | same |
| verse: भवन्त्युपेयाः (e-text typo) | served as भवन्त्यपेयाः | `VERSE_CORRECTIONS` in `src/content/subhashita/index.ts` |
| verse: पात्रत्वात् धनमाप्नोति (unsandhied in the witness) | served as पात्रत्वाद्धनमाप्नोति | same |
| हरिः + चन्द्रः = हरिश्चन्द्रः listed as visarga sandhi | withheld | `WITHHELD_SANDHI` in `src/content/sandhi/index.ts` |
| यत् + मया: optional form यद्मया missing | engine fixed (nasal obligatory only before the suffixes -मय / -मात्र); pack regenerated | `src/sanskrit/sandhi.ts` |
| engine gave अहारात्रः, षड्दश, पुंकोकिलः with no warning | now flagged `special` (code `lexical`), never presented as a confident result | `src/sanskrit/sandhi.ts` |
| लोक् / मार्ग् showed non-ṇic लोकित्वा … ; विद् "find" showed विदितः | those kṛdanta cells withheld | `WITHHELD_KRDANTA` in `src/content/dhatu/index.ts` |
| मरीचम् "pepper" carried a chilli emoji | emoji withheld | `src/content/vocab/index.ts` |

Every correction is an explicit overlay next to the generated data, with the reason, so a human reviewer
can confirm or revert each one. Regeneration tests still pass against the reference datasets.

## Still open — needs a human Sanskrit reviewer

- Everything under "Probable errors / needs scholar decision" in both reports (optional forms not yet
  accepted such as अवेः, वर्तित्वा; कोश / कोष spelling; weekday name variants; a few engine alternatives;
  two samāsa classifications; four verse readings).
- About 25 grammatical but unnatural generated sentences (listed in report A) — candidates for removal.
- "Hazards for games" sections: synonym pairs, debatable samāsa types, alternative sandhi results.
- Not examined at all: transliteration and akṣara modules beyond their own tests; verse reference numbers
  against printed editions; levels and themes; Sanskrit that lives inside individual games
  (titles, labels, clock phrases, unit names — each game lists its own in `PRD.md → Content`).
