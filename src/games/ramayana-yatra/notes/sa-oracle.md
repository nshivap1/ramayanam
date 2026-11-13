# sa-oracle: the Sanskrit word checker for the Sambhāṣaṇa dialogue

OWNER: sa-oracle. Files: `sa-verify.ts` (the oracle, a pure module that is never imported by Game.tsx), `sambhashana.test.ts` (the gate), and the CLI at `/home/claude/scratch/sa-oracle/check.ts`.
Rules: `notes/sambhashana.md` → "Verification". This note explains how to **use** the checker.

## 1. Check your file (run this often)

```bash
cd /home/claude/fw && node --import tsx /home/claude/scratch/sa-oracle/check.ts content/sa-dialogue-2.json
```
- Leave out the file argument to check all four dialogue files. `--verbose` also prints the analysis of every word in the lines that pass.
- The checker reads the JSON fresh from disk on every run (≈ 1 s), and the `models` of **all four** dialogue files and of `content/sa-ui-*.json` feed the index.
- Output per file:
  - every entry with a problem, as `#index [ctx]`, then en / sa, then one `✗` line per problem with suggestions;
  - the counts: translated / missing / with problems / stale;
  - a level summary;
  - **flagged** words. These are not failures, but keep them few: L4 roots, `model` words (each one is a human-review item), and verse forms.
- Exit code 1 means something must be fixed before the gate (`sambhashana.test.ts`) is green.

## 2. Look up one word, or find a word by its meaning

```bash
node --import tsx /home/claude/scratch/sa-oracle/check.ts --word "गतवती रामेण"   # ✓ with every analysis, or ✗ with suggestions
node --import tsx /home/claude/scratch/sa-oracle/check.ts --find "river"          # vocab / dhatu / prefixed / shabda / lexicon / names by English
node --import tsx /home/claude/scratch/sa-oracle/check.ts --find "come" --max 50
```
`--find` shows the citation form, the level, and how the word declines ("declines like deva-m" means every case form is accepted). For verbs it shows the root and the ktavatu · ktvā · tumun forms. For a vocab noun marked "citation form only", only that exact form is accepted; if you need other cases, add a `models` entry (§4).

## 3. What counts as a verified word

The checker removes markup (`{player}` `{w:id}` `{f:…}`, and checks the inside of `{b:…}`), then splits the line on spaces and `। , ? ! ; : — – … " ' ( )`. Every remaining word must be in the index. The comparison uses `spellingKey`, so अहं = अहम् and गंगा = गङ्गा. The index holds about 73,000 forms:

| Source | What is accepted |
|---|---|
| `shabda` | every cell of every paradigm: pronouns (अहम् मम मया … सः सा तत् … भवान् भवती भवतः …), numerals, model nouns |
| `vocab` | citation forms, indeclinables, the words of the courtesy phrases (धन्यवादः, कृपया, अस्तु, स्वागतम्, क्षम्यताम् …) |
| `vocab-decl` | **any case form** of a vocab noun/adjective that has a `paradigm` link; also the neuter of a-stem adjectives (सुन्दरम्, सुन्दरेण …). The direction words decline in all genders: पूर्व दक्षिण उत्तर like सर्व (पूर्वस्यां दिशि, दक्षिणस्याः), पश्चिम like देव/लता. It does **not** cover the feminine of other adjectives: add a model for सुन्दरी (nadi-f) if you need it |
| `dhatu` | every finite form (laṭ laṅ lṛṭ loṭ vidhiliṅ, in the taught pada) of all 199 roots. L4 roots are accepted but flagged |
| `krdanta` | ktvā, tumun, lyap as stored. kta in all genders (गतः गतम् गता …), ktavatu (गतवान् गतवन्तम् गतवता … · गतवत् n. · गतवती गतवत्याः … f.), śatṛ masculine (गच्छन् गच्छन्तम् गच्छता …), śānac / tavya / anīyar in all genders |
| `prefixed` | the PREFIXED verbs, plus upasarga + any base form **with the same first letter as the base laṭ 3sg**: आगच्छतु, आगमिष्यति, आगतवान्, आगतवती, आगन्तुम्, उपविशतु, प्रविष्टवान् … **Not** laṅ (आगच्छत् comes only from the sentences pack: आ-गम्, उप-विश्, प्र-विश्, अव-गम्, आ-नी, उद्-स्था) and **not** ktvā (use the lyap form: आगत्य, उपविश्य). Forms where ṇatva could cross the upasarga are left out |
| `sentences` | every word of the verified sentences pack |
| `lexicon` | the verse-lexicon forms exactly as stored (flagged as verse forms), plus lexicon nouns with a regular stem, declined automatically |
| `name` | names.json stems declined automatically (see below) |
| `model` | your `models` entries (§4) |
| `number` | `cardinal` 1–100 and 1000 with variants (एकम् … शतम्), **declined**: 11–19 like पञ्चन् (चतुर्दशभिः), -म् like वन with ṇatva (शतेन, सहस्राणि, सहस्रेण), -ति like मति (विंशत्या), -शत् like सरित् (त्रिंशता). 1–10 come from shabda (एकः, द्वौ, त्रयः …) |
| `interjection` | हे, भोः, हा (reviewed list). अहो and धिक् are in vocab. ओह् is **not** Sanskrit; अरे / रे are not dignified |

**Automatic name model** (no `models` entry needed):
- person/ally/enemy names in -a are declined as masculine, with ṇatva: रामः रामम् रामेण रामाय रामात् रामस्य रामे हे राम; लक्ष्मणेन; रावणेन.
- -ā names → feminine like लता (सीता सीताम् सीतया सीतायाः हे सीते; लङ्का, अयोध्या, तमसा, पम्पा).
- -ī names → like नदी (कैकेयी, पञ्चवटी, राक्षसी).
- person names in -i → like मुनि with ṇatva: वाल्मीकिः वाल्मीकिना; ऋषिः ऋषिणा.
- person names in -u → like साधु with ṇatva (जटायुः जटायुना).
- -मान् / -वान् → like धीमत् / भगवत्: हनुमान् हनुमन्तम् हनुमता हनुमतः; जाम्बवान् जाम्बवन्तम्.
- Names given as nominatives (-म्, -ः, -ाः, -ानि) take the matching a-stem gender.
- **Place and thing names in -a without a known gender** (चित्रकूट, दण्डकारण्य, जनस्थान, शृङ्गवेरपुर, सिद्धाश्रम …) get **only the cases that masculine and neuter share**: चित्रकूटम् (acc.), चित्रकूटेन, चित्रकूटाय, चित्रकूटात्, चित्रकूटस्य, चित्रकूटे. For the nominative, add a model with the gender.
- Consonant-stem names (इन्द्रजित्, वणिज् …) need a model: `इन्द्रजित्` m `marut-m`.

## 4. Adding a `models` entry (a noun the packs don't decline)

Use a model when `--word` says ✗ for a proper noun or story term you really need (for example राक्षस, आश्रम, यज्ञ, शिष्य), and `--find` shows no verifiable alternative. Put it in **your own** file's `"models"` array:

```json
"models": [
  { "stem": "राक्षस", "gender": "m", "paradigm": "deva-m", "en": "demon", "source": "MW rAkzasa m." }
]
```
- `stem`: the prātipadika, not the nominative (राक्षस, not राक्षसः; इन्द्रजित्; वीणा).
- `gender` must equal the paradigm's gender.
- `paradigm`: a SHABDA id of the **same ending class, gender and ṇatva behaviour**. For a-stems the ṇatva rule is: if an r ṛ ṣ comes before the ending with only vowels, h y v r, k-row, p-row or ं in between, use the ṇatva model (`rama-m` रामेण, `mitra-n`/`pushpa-n` मित्राणि, `rama-f`); otherwise use the plain one (`deva-m`/`balaka-m`, `vana-n`/`phala-n`, `lata-f`). The checker derives ṇatva itself and **rejects a mismatch**, naming the paradigms that fit.
  - i-stem m: `muni-m` (no ṇatva) / `hari-m`.
  - u-stem m: `sadhu-m` / `guru-m`.
  - Others: `mati-f`, `nadi-f`, `pitri-m`, `rajan-m`, `manas-n`, `dhanus-n`, `marut-m`, `bhagavat-m`, `dhimat-m`.
  - Irregular paradigms (पति सखि पथिन् अप् अहन् श्वन् युवन् स्त्री गो नौ) cannot be models.
  - If **no** paradigm of the same class has the right ṇatva (for example सरयू: an ū-stem with ṇatva → सरयूणाम्), name the plain one (`vadhu-f`). The checker then re-derives ṇatva (`ṇatva re-derived` in `--word`) and doesn't complain.
  - List all ids: `node --import tsx -e "import {SHABDA} from './src/content/shabda/index.ts'; console.log(SHABDA.map(p=>p.id+' '+p.citation).join('\n'))"`
- `en`: the gloss. `source`: the dictionary headword you checked (MW or Apte, SLP1 or IAST), e.g. `"MW rAkzasa m."`. Both are required.
- Use the same stem with the same model in every file (the test checks this). If another translator already added it, you don't need to repeat it: models from all files are shared.
- Keep models few: each one is a human-review item.

## 5. What the gate enforces (`sambhashana.test.ts`)

Always:
- every non-empty `sa` verifies word by word;
- no Latin letters, IAST, ASCII digits, `.`, `॥` or hyphens;
- the line ends with `।`, `?` or `!`;
- a word-final `ं` stands only before a consonant;
- markup in the Sanskrit (`{player}` `{w:…}` `{f:…}`) is also present in the English. `{n:…}` is refused in Sanskrit: write the inflected name;
- length ≤ 2.5 × English + 15 characters;
- models are valid.

Coverage: missing translations (`"sa": ""`) are only **reported**; they fail only with `RY_SA_STRICT=1`. A stale entry (an `en` that is no longer in the story), a story string with no entry at all, or a duplicate `en` always fails. These come from story edits by other agents, not from you: tell the orchestrator.

Run it: `cd /home/claude/fw && node tools/test.mjs unit games/ramayana-yatra/sambhashana.test` (add `RY_SA_STRICT=1` for the release check).

## 6. Patterns seen in the first batches (fixed by the translators)

- **`{player}` written in the Sanskrit when the English has no `{player}`** (for example "this child" → `{player}`): refused. Keep to the English (बालकः / अयं शिष्यः), or leave it out.
- **`ं` before a pause** (सत्यं, … · आश्रमं, …): write म् before `,` `।` `?` and before a vowel; `ं` only before a consonant. Before a `{w:…}` word it is not judged.
- **लिखितुं** is not a form: the tumun of लिख् is **लेखितुम्**. When `--word` gives a suggestion one letter away, it is usually the right form.
- **Story terms that come only from names.json** (तर्क, जय, बाण, दिव्य, अदृष्ट, सिद्धाश्रम …): only the gender-neutral cases are accepted until somebody adds a model. The error says so and gives the model to add.
- **Not in the packs, so each needs a model (or rephrase):**
  - nouns आर्य, प्रयत्न, विजय, विश्राम, शरण;
  - adjectives धन्य, and सुन्दरी (the feminine);
  - the root द्रा (निद्राति: use शेते, from शी, if available, or rephrase);
  - the aorist मा भैषीः (use मा बिभेतु / न भेतव्यम् if they verify).

  Check alternatives with `--word` / `--find` first.

## 7. What the checker cannot see (the reviewer's job)

It proves that each word exists as written. It does **not** check:
- agreement (सः गतवती passes);
- case government (सह + 3rd case);
- whether भवान् takes a 3rd-person verb;
- word order, meaning, register or level suitability;
- whether a homograph is used in the intended sense (गच्छति is laṭ 3sg and also śatṛ loc. sg.).

Sandhi *inside* a fixed vocab phrase word (नमस्ते, मास्तु, पुनर्मिलामः) is accepted because the vocab pack lists it.
