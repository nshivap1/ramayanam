# Grammar labels in Sanskrit (v0.3.x, OWNER: ui-g)

In **संस्कृतम्** and **संस्कृतम् + English** the grammar of the verse words is shown with traditional Sanskrit terms:
the word row under a verse, the word-by-word table, and the word card (part of speech, gender, the forms list), plus
the aria-label of `{f:…}` form buttons. English mode is unchanged. Only the **meanings** (glosses, translations,
lexicon notes, sandhi notes, the source) stay English and keep `data-en-ok`.

| File | Role |
|---|---|
| `content/sa-grammar.json` | `grammar` (exact English of `words[].grammar` / `forms[].grammar` → Sanskrit), `pos`, `gender`, the glossaries `terms` and `notes`, and `models` |
| `view-cards.tsx` | `<Gram>`: English (as before) / Sanskrit via `<SaText>` / Sanskrit + small English gloss (sa-en). An unknown string falls back to English (and the gate fails) |
| `view-markup.tsx` | `{f:…}` aria-label reads the Sanskrit label in the Sanskrit modes |
| `grammar-sa.test.ts` | the gate (below) |

In the Sanskrit modes the word-by-word table has **two columns**: the form with its grammar under it, then the meaning.
Full terms do not fit a third column at 360 px in IAST (English IAST already overflows on s-samudra-iva; English mode is
left as it was). No abbreviations are used: the learner reads the real terms.

## The term system (one system, everywhere)

| English | Sanskrit | Source of the name |
|---|---|---|
| nom. acc. instr. dat. abl. gen. loc. | प्रथमा द्वितीया तृतीया चतुर्थी पञ्चमी षष्ठी सप्तमी (elliptic for … विभक्तिः) | `VIBHAKTI_NAMES` (@content/types) |
| voc. | सम्बोधनम् | `VIBHAKTI_NAMES[8]` |
| sg. du. pl. | एकवचनम् द्विवचनम् बहुवचनम् | `VACANA_NAMES` |
| m. f. n. | पुंलिङ्गम् स्त्रीलिङ्गम् नपुंसकलिङ्गम् | `GENDER_NAMES` |
| 3rd 2nd 1st person | प्रथमपुरुषः मध्यमपुरुषः उत्तमपुरुषः | `PURUSHA_NAMES` |
| present imperative future optative | लट् लोट् लृट् विधिलिङ् (lakāra names, not "वर्तमानकालः") | `LAKARA_NAMES` |
| perfect aorist | लिट् लुङ् | Pāṇini 3.2.115 / 3.2.110 (not in the dhātu pack) |
| active middle passive (finite verb) | परस्मैपदम् आत्मनेपदम् कर्मणि | models |
| past (passive) participle · present active participle · infinitive · gerundive | क्त · शतृ · तुमुन् · तव्यत् (कर्तव्यम्) / यत् (शक्यम्, 3.1.99) | kṛt names as taught in school |
| comparative | तरप् (5.3.57) | taddhita name |
| root, upasarga | √ + root in Devanagari (√ज्ञा), upasarga in citation form (अभि, उत्, निस्, आ) | IAST of the English, transliterated |
| indecl. | अव्ययम् | names.json role term |

Order: case, number, gender (as the English) for nouns; **lakāra, person, number, pada** for verbs (the order a Sanskrit
class recites: लट्, प्रथमपुरुषः, एकवचनम्, परस्मैपदम्); kṛt suffix first, then case, number, gender. Terms are separated by
", ", alternatives by "/" (प्रथमा/द्वितीया), notes go in parentheses. Root expressions: `(अभि + √भाष्)`.

Part of speech: noun नाम (Yāska's नाम) · pronoun सर्वनाम · adjective विशेषणम् · verb धातुः (every verb lemma is a root) ·
indeclinable अव्ययम् · compound समासः · name संज्ञा · numeral सङ्ख्या · participle कृदन्तम्.

## Notes (English → Sanskrit, the `notes` glossary)

compound समासः · predicate विधेयम् · impersonal predicate भावे विधेयम् · relative सम्बन्धवाचकम् · interrogative प्रश्नवाचकम् ·
indefinite pronoun अनिश्चयवाचकं सर्वनाम · enclitic आदेशः (मा मे नः are the substitutes of 8.1.20–23) · same form as dat. sg.
चतुर्थ्याम् अपि · same form as acc./dat. pl. द्वितीयायाम् अपि, चतुर्थ्याम् अपि · duration कालवाचकम् · object of vyāharatā
व्याहरता इति पदस्य कर्म · used as the verb क्रियापदम् · prohibitive निषेधे · compound adverb समासः, क्रियाविशेषणम् · used as adverb
क्रियाविशेषणम् · with augment आगमेन सह · active sense / intransitive "has come about" कर्तरि (kta in the agent sense, 3.4.72).

**Dropped** (value `""`): "(conjunction)" on यत् (no plain term was verifiable; the label still says अव्ययम्: प्रथमा/द्वितीया …,
and the gloss "because" carries the meaning) and "as with verbs of motion" (explanation). The English gloss of
निर्वृत्तम् inside its grammar ("has come about") is a meaning and is not repeated.

## How every label is verified (`grammar-sa.test.ts`)

1. **Coverage**: every grammar string of the verses and the lexicon, every pos and gender has an entry; none stale.
2. **Script**: NFC, `validateDeva`, no Latin / IAST / ASCII digits.
3. **Words**: everything except the technical names goes through the oracle (`createOracle` with the bundled models
   plus this file's 24 `models`): case names via names.json, सर्वनाम/सङ्ख्या/क्रियापदम्/कालः via vocab, कर्मणि/कर्तरि via
   SHABDA, the rest via the models (MW headwords; each model is a human-review item).
4. **Technical names** the oracle cannot hold, checked against the packs: lakāra names must be among Pāṇini's
   lakāras and the five the dhātu pack teaches must equal `LAKARA_NAMES`; kṛt names must be the class names of the
   pack's kṛdanta keys (kta, śatṛ, tavyat, tumun …); roots must be in `DHATUS` or a verb lemma of the lexicon
   (भा is lexicon-only); upasargas must be in the prādi list; all are produced by `iastToDeva` from the English IAST.
5. **Agreement**: each label must contain exactly the glossary terms its English names (outside and inside the
   parentheses), with the core terms equal to the platform tables of @content/types.
6. **Forms**: wherever the oracle's dhātu index knows a verse form (also with its upasarga stripped), one analysis must
   agree with the label: lakāra, person, number and pada for finite verbs (28 forms checked), kṛt suffix, case,
   number and gender for kṛdantas. Aorist, perfect and passive forms are not in the pack: their labels rest on 4–5.

The oracle proves that each word exists and the cross-check that the technical labels fit the forms; a human
Sanskrit reviewer still signs off the term choices and the models (REVIEW.md).

## Adding a verse

A new grammar string fails the gate until it has an entry. Compose it from `terms` and `notes`; a new note needs a
`notes` entry (or `""` to drop it, listed above); a new term word needs a model with an MW source.
