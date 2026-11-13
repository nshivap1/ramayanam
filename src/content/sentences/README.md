# sentences — simple verified sentences (सरलवाक्यानि)

671 short sentences generated from grammatical patterns over verified forms, so that agreement and
case government are correct by construction. L1 245 · L2 308 · L3 118.

```ts
import { SENTENCES, sentencesForLevel, sentenceText, sentenceTextAnusvara } from '@content/sentences';

const s = SENTENCES.find((x) => x.id === 'karta-karma-kriya-004')!;
sentenceText(s);          // 'बालकः पुस्तकम् पठति।'   padaccheda: words exactly as stored
sentenceTextAnusvara(s);  // 'बालकः पुस्तकं पठति।'    + the one obligatory print sandhi (म् → ं before a consonant)
s.words[1];               // { sa: 'पुस्तकम्', en: 'the book', role: 'karma', lemma: 'पुस्तक', tag: '2.1.n' }
```

## Patterns

| level | pattern ids | what they drill |
|---|---|---|
| L1 | `karta-kriya`, `sarvanama-kriya`, `karta-karma-kriya`, `sarvanama-karma-kriya`, `karta-avyaya-kriya`, `na-kriya`, `api`, `adya-lat` | 2–3 words, laṭ, prathamā + dvitīyā; अहम् / त्वम् / सः / सा / वयम् / यूयम् / ते / ताः; भवान् / भवती with the prathama-puruṣa verb; अत्र, तत्र, न, अपि, अद्य |
| L2 | `karana`, `saha`, `sampradana`, `apadana`, `adhikarana`, `sambandha`, `vina`, `prati`, `namah`, `hyah-lan`, `shvah-lrt`, `lot`, `sambodhana-lot`, `dvivacana` (and 4-word `na-kriya`, `adya-lat`) | tṛtīyā … saptamī, sambodhana; सह + 3, विना + 2 / 3, प्रति + 2, नमः + 4; ह्यः + laṅ, श्वः + lṛṭ; loṭ; dual |
| L3 | `vidhilin`, `ktva`, `tumun-icchati`, `tumun-shaknoti`, `visheshana-karma`, `visheshana-karta`, fear + pañcamī in `apadana` | vidhiliṅ, ktvā clause, tumun + इच्छति / शक्नोति, adjective agreement |

## Conventions

- **Word order**: kartā … other kārakas … karma … kriyā; time adverb first. Games must accept other
  orders — Sanskrit word order is free.
- **No sandhi between words** (padaccheda): `sentenceText` joins `words[].sa` with single spaces and
  adds `।`; a final म् stays म्. Use `sentenceTextAnusvara` for the usual printed spelling.
- **Tags**: nominal `vibhakti.vacana.gender` (`2.1.n`; gender `x` for अस्मद् / युष्मद्); finite verb
  `lakara.purusha.vacana` with puruṣa 1 = prathama (`lat.1.1`); `ktva`, `tumun`; `avyaya`.
- **Roles**: `karana` is also used for the tṛtīyā word governed by सह / विना; the dvitīyā of motion
  (विद्यालयम् गच्छति) and the dvitīyā with विना / प्रति are tagged `karma`; `sampradana` covers नमः + caturthī.
- **Lemma**: prātipadika (बालक, मातृ, तद्, अस्मद्), dhātu (पठ्), prefixed verb `आ+गम्`.
- `VERBLESS_PATTERNS` (`namah`) have no kriyā; `CLAUSE_PATTERNS` have one ktvā / tumun beside the finite verb.
  `sambodhana-lot` has no kartā (implied त्वम्).
- English is generated from the same pattern; count nouns take "the".

## Verification method

- **Verb forms**: read from the dhātu pack (double-verified, see `../dhatu/README.md`). Prefixed verbs:
  the pack's base form joined by the same `joinPrefix` that built `PREFIXED`; laṅ only for
  आगच्छत्-type forms on a whitelist (आ-गम्, उप-विश्, प्र-विश्, अव-गम्, आ-नी, उद्-स्था).
- **Nominal forms**: from the ashtadhyayi.com śabda tables when the word is a headword there (75 of
  89 nouns, all pronouns); otherwise by model declension (देव / वन / लता / नदी endings + ṇatva), a procedure
  the tests prove against every regular oracle paradigm of the class (3,414 / 1,704 / 1,010 / 635
  paradigms; the only differences are pronominals, gotra names and root-nouns). Independent check for
  every a / ā / ī-stem form: learnsanskrit.org ending tables (CC0, hand-entered); pronouns: its pronoun
  table. Wherever the separately built `shabda` pack has the word, the form must also be there.
- **Stems, genders, indeclinables** (the only hand-typed Sanskrit): each must be an oracle headword, a
  Monier-Williams stem of that gender, or a `shabda` pack paradigm; adjectives must be "mf(ā)n." in MW;
  indeclinables must be in the MW / learnsanskrit indeclinable lists or an MW headword.
- **Agreement and government** are fixed by the generating pattern and recomputed independently in
  `sentences.test.ts` (puruṣa / vacana, viśeṣaṇa = viśeṣya, case required by सह / विना / प्रति / नमः,
  tense required by ह्यः / श्वः / अद्य, one finite verb, one kartā).
- **Meaning**: only combinations listed in the hand-curated table `tools/content/verbal/sentence-lexicon.ts`.

## Sources and licences

ashtadhyayi-com/data `shabda/data2.txt` (no LICENSE file; free to use with credit — confirm);
sanskrit/data learnsanskrit.org tables (CC0); Monier-Williams lists and text (CC BY-NC-SA, consulted
only); the dhātu pack's sources. Only generated sentences are shipped.

## How to add

Add stems / verbs / frames to `tools/content/verbal/sentence-lexicon.ts` (never an inflected form), a
pattern block or quota in `gen-sentences.ts`, then
`node --import tsx tools/content/verbal/gen-sentences.ts` and `node tools/test.mjs unit src/content/sentences`.
A combination whose forms cannot be verified is skipped (run with `--skipped` to see why).

## Known gaps

No questions (किम्, कुत्र …), no च-coordination, no karmaṇi, no ktavatu past, no relative clauses,
no numerals; one adjective per sentence; ktvā clauses use गत्वा only; tumun only of unprefixed verbs;
no sandhi beyond `sentenceTextAnusvara`. English glosses are literal ("the food", "does work").
