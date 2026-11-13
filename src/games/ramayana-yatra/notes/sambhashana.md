# Sambhāṣaṇa-Saṃskṛtam dialogue mode: style guide and verification rules

The goal is an optional **dialogue language** setting: English (default) · संस्कृतम् + English · संस्कृतम् only. Story text (say lines, choice prompts/options, objectives, signs, battle intros, enemy intro/defeat lines) gets a simple spoken-Sanskrit version that a learner up to **Level 3 (Paricaya)** of the Samskrita Bharati ladder can follow.

Files (one translator owns each): `content/sa-dialogue-1.json` (common, ch1, ch2), `-2.json` (ch3, ch4), `-3.json` (ch5, ch6, enemy lines). Shape:
```json
{ "version": 1,
  "models": [ { "stem": "राक्षस", "gender": "m", "paradigm": "deva-m", "en": "demon", "source": "MW rAkzasa m." } ],
  "entries": [ { "en": "<exact English>", "sa": "<Sanskrit>", "ctx": "<event · speaker>" } ] }
```
`en` and `ctx` are generated, so never edit them. Fill `sa` only. `models` lists extra noun/adjective stems your lines need that the platform packs don't already decline (see "Verification" below).

## Register: how to write
- **Short, plain sentences**, normally ≤ 10 words; split long English lines into 2–3 Sanskrit sentences. Faithful meaning, not word-for-word. Simplify freely.
- **Padaccheda: no sandhi between words.** Each word stands in its own dictionary form (बालकः गच्छति, not बालको गच्छति). The only allowed print convention: a word-final म् may be written ं before a following consonant (अहं गच्छामि, कुशलं वा). Inside words, use normal correct spelling.
- **Punctuation:** end sentences with `।` (never a Latin full stop). `?` `!` `,` are fine. No ॥.
- **Tenses** (the Sambhāṣaṇa core):
  - present laṭ for most speech and narration;
  - past: prefer the **ktavatu** participle (सः गतवान्, सा गतवती, ते गतवन्तः, अहं दृष्टवान्/दृष्टवती); laṅ only for very common verbs;
  - future lṛṭ (गमिष्यामि, द्रक्ष्यति);
  - requests: loṭ (त्वम् आगच्छ; भवान् आगच्छतु; let us: गच्छाम).
- **Address:**
  - elders/sages to the student or to children: त्वम् or the vocative वत्स, with 2nd-person verbs.
  - Polite address to equals/elders/heroes: **भवान् / भवती with 3rd-person verbs** (भवान् कुत्र गच्छति?).
  - Respectful vocatives: हे राम, भगवन् (to a sage), देवि (to Sītā), आर्य.
- **Questions:** किम्, कुत्र, कदा, कथम्, कः / का, किमर्थम्, किं … वा?
- **Common glue words:** च, अपि, वा, न, एव, इति, परन्तु / किन्तु, अतः, तदा, यदा, अधुना, अत्र, तत्र, शीघ्रम्, सम्यक्, बहु, कृपया, धन्यवादः, आम्, अस्तु, पुनः, सह (+ instr.).
- **Names are written inflected:** रामः, रामम्, रामेण, रामाय, रामात्, रामस्य, रामे, हे राम · सीता, सीताम्, सीतया … · हनुमान्, हनुमन्तम्, हनुमता … · वाल्मीकिः (like हरि). Don't put `{n:…}` inside a Sanskrit sentence: it renders the bare stem.
- **The player's gender:** the student may be male (avatar a, शिष्य) or female (avatar b, शिष्या). Any word that addresses or describes the player and changes with gender is written `{g:masculine|feminine}`, e.g. `{g:वत्स|वत्से}`, `{g:गतवान्|गतवती}`. Both forms are verified, and the view picks one by avatar. Otherwise keep the player gender-neutral (त्वम्, passives, polite imperatives).
- **Markup:**
  - Keep `{player}` (the player's typed name, shown uninflected; use it in address position: "{player}, अत्र आगच्छ।").
  - `{w:lexId}` renders a verse word's dictionary form: use it only when the line is *about* that word ("{w:dharma} इति शब्दः …").
  - `{b:…}` must contain Sanskrit.
  - No Latin letters, no IAST anywhere else.
- **Gameplay words**, e.g. for "shrine, verse, word, menu, battle, recite, restore":
  - prefer story-world Sanskrit (वेदिका or आश्रमः for the shrine, श्लोकः, शब्दः, युद्धम्, पठतु / वदतु);
  - pure UI controls (button names A/B, "menu") can be paraphrased ("चिह्नं नुदतु" is too hard, so just say "पश्यतु" or omit).
  - Objectives are short imperatives to the player in polite form: "आश्रमं गच्छतु।", "वाल्मीकिं पश्यतु।".
- **Respect:** dignified language for Rāma, Sītā, Hanumān and the sages. No slang, no comic disrespect.
- **Level:** prefer vocab-pack words of level 1–2. Story terms (राक्षसः, आश्रमः, बाणः, धनुः, अस्त्रम्, यज्ञः, वानरः) are fine when verifiable.

## Verification (what `sambhashana.test.ts` enforces)
Every Sanskrit word (token between spaces/punctuation, after removing markup) must be a **verified form** from one of these:
1. **`@content/shabda`**: any cell of any paradigm: pronouns अस्मद् युष्मद् तद् एतद् यद् किम् इदम् सर्व अन्य भवत् भवती, numerals, and model nouns.
2. **`@content/vocab`**: citation forms, indeclinables and phrases. Nouns/adjectives with a `paradigm` link may take **any case form** by stem substitution on that paradigm (the pack documents this as safe).
3. **`@content/dhatu`**: any finite form (laṭ laṅ lṛṭ loṭ vidhiliṅ, the taught padas) of the 199 roots of level ≤ 3; kṛdantas: ktvā and tumun as-is; kta, ktavatu, śatṛ, tavya and anīyar declined on their models (kta → देव/राम-type, ktavatu → भगवत्/धीमत् type, fem -वती → नदी type, śatṛ → गच्छत् type); lyap forms.
4. **Prefixed verbs** in `PREFIXED`: the upasarga joined to a base form only where the join is sandhi-free (the same first letter as the base laṭ 3sg: आ+गच्छतु = आगच्छतु, आ+गतवान् = आगतवान्). Not with laṅ augments, not with ktvā (use the lyap form).
5. **The game's verse lexicon** (`content/lexicon-*.json` forms) and **names** (`content/names.json` stems) declined on a model from `models` or the oracle's automatic model (regular -a m/n, -ā f, -ī f stems with ṇatva).
6. **`models`** in the dialogue files: an extra stem + gender + a SHABDA paradigm id it declines like (same ending class, gender and ṇatva behaviour) + English + a dictionary `source` (MW/Apte). Every model is a human-review item, so keep them few.
7. Numbers from `@sanskrit` (`cardinal`).

Spelling comparison uses `spellingKey` (अहं = अहम्). Anything else fails the test with the exact word, entry and suggestions. There is no allowlist for content words; a few interjections may be allowed by the oracle owner with a reason.

## Review status
All Sanskrit dialogue is **model-written, then machine-verified word by word**. It is listed in REVIEW.md as awaiting a human Sanskrit reviewer (grammar, naturalness, level). Machine checks prove that each word exists as written. They do not prove that the sentence is grammatical, so the reviewer pass and a human sign-off still matter.

## File 4: content strings (`content/sa-dialogue-4.json`, OWNER: ui-c)
The same format and rules as files 1–3. The views look these strings up by their exact English with `useUi().c(en)` (view-ui.tsx) or `<StoryLine>`. `collectStoryStrings()` assigns them to `file: 4` after every story line, so a string that files 1–3 already hold stays there (first occurrence wins). Sources:
- **Logic story lines**: `DEFAULT_OBJECTIVE` (logic-state), `DEFEAT_TEXT`, `REST_TEXT` and `nextBookObjective(1…6)` (logic-events), all imported, so a changed constant shows up as a stale or missing entry.
- **NPC speaker titles**: every `who` that is free English (not a names.json id, not `player`). These are **labels** (`"label": true`): no final `।`, and `{n:…}` is allowed. The gate refuses `label` on any other string. One title can serve several speakers (Citizen, Sage, Hermit), so titles use the generic masculine unless every speaker is a woman (Villager → ग्रामस्य नारी; Night trader, a rākṣasī → आपणस्य राक्षसी). Personal names are written in Sanskrit only when names.json or the oracle knows them. Otherwise the title describes the speaker: Danu → कबन्धः, Sampāti → जटायोः भ्राता, Gavākṣa / Śarabha / Mainda → वानरः, Svayamprabhā → गुहायाः तापसी (model तापसी).
- **Chapter summaries** (`chapters[].summary`): short narrative sentences in the present tense; "you" is त्वम्.
- **defs.json**: move `description` and `origin` (the tags `start` / `enemy` / `duelist` are internal, see `MOVE_ORIGIN_TAGS`), and the ally, enemy and item `description`.

Conventions for the blurbs (keep them consistent with sa-battle.json and the sa-ui glossary):
- attack is तेजः and defence is धैर्यम्. One stage is `… वर्धते` / `… न्यूनं भवति`, and two stages is `… बहु वर्धते` / `… बहु न्यूनं भवति`.
- "Strong against X" is `X-acc. प्रति एतत् तीक्ष्णम्।` (वायुं, भूमिं, जलं, अग्निं, मायां).
- Shares of strength are words, not `%`: `बलं वर्धते — शते चत्वारिंशत्।` (40 in a hundred). The game's real amount is used (a third is 0.35, so शते पञ्चत्रिंशत्).
- PP is उत्साहः. Moves are मन्त्राः. Revive is `पुनः उत्तिष्ठति`. A "restore the verse" origin is `… श्लोकं पूर्णं कुरु।`.
- Instructions to the player use the 2nd person singular (वद, पठ, कुरु). Enemy moves name the actor (शत्रुः …).

## `{w:}` inside a sentence (audit v0.4.2)
`{w:lexId}` always renders the verse word's **dictionary stem** (धर्म, तपस्विन्, निषाद). Use it only:
- when the line is about the word itself (`{w:dharma} इति शब्दः …`), or
- where the stem is already the form the sentence needs (an -ā stem in the nominative, such as सन्ध्या or अयोध्या, or an indeclinable such as मा).

Otherwise, write the inflected form in plain Devanagari (धर्मः, तपस्वी), checked by the oracle like any other word.
