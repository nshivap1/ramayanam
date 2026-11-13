# sa-rev-b: Sanskrit review of sa-dialogue-2.json (Araṇya + Kiṣkindhā) and sa-dialogue-3.json (Sundara + Yuddha + enemies)

Reviewer: agent sa-rev-b (independent; did not write these lines). Date: 2026-11-11, 13:10–13:30 ET.

Scope: every `sa` line in both files was checked for agreement, case government, tense/mood, meaning, register, level, the player's gender, and game-wide consistency. Only `sa` was edited. `en`, `ctx` and `models` are unchanged, and no models were added. After each batch, the word checker (`check.ts`) and `sambhashana.test` were both clean (0 problems, 10/10 pass). `content.test` also passes.

## Counts

| | lines checked | lines changed |
|---|---|---|
| sa-dialogue-2.json | 277 | 84 |
| sa-dialogue-3.json | 297 | 29 |
| **total** | **574** | **113** |


Changes by category (a line is counted once, under its main reason):

| category | file 2 | file 3 | total |
|---|---|---|---|
| consistency-direction | 32 | 1 | 33 |
| meaning | 18 | 3 | 21 |
| consistency-shrine | 12 | 7 | 19 |
| consistency | 8 | 0 | 8 |
| case | 6 | 1 | 7 |
| level | 0 | 7 | 7 |
| gender | 1 | 5 | 6 |
| agreement | 4 | 0 | 4 |
| register | 0 | 3 | 3 |
| prohibition | 2 | 1 | 3 |
| tense-mood | 1 | 1 | 2 |

Category key:
- **consistency-direction**: 'पूर्वः मार्गः … नयति' (which also reads "the former road") → the game-wide style पूर्वां दिशम् / पूर्वस्यां दिशि.
- **consistency-shrine**: the shrine is मन्दिरम् everywhere; आश्रमः is kept only for hermitages.
- **consistency**: other cross-file wording ("joins your party" = `त्वया सह आगच्छति`, verse book = `श्लोकानां पुस्तकम्`, quiz feedback in त्वम्).
- **level**: प्रतिपालय् (L3, literary) → प्रतीक्ष् (L2, the verb used everywhere else).
- **register**: choice prompts in polite loṭ + वा, and address-form clashes.
- **gender**: the player addressed with `{g:masc|fem}`.
- **prohibition**: मा + loṭ replaced where a natural alternative exists.

## Translator doubts: resolutions
**File 2:**
- #104, #105, #202: direction lines rewritten (`दक्षिणां दिशं गतवान्`, `दक्षिणां दिशं गच्छ`, `पूर्वां दिशम्, पश्चिमां दिशम्, उत्तरां दिशं च गच्छत`).
- #106: `प्रियं मित्रं जटायुः` → `प्रियः सखा जटायुः` (masc., agrees).
- #219, #244: `एव अतीव` → comparative `सर्वेभ्यः (फलेभ्यः) अधिकं …`.
- #266, #135: `…काण्डम् आरभताम्` kept (grammatical polite imperative; see the human list for consistency with file 1).
- #134: changed to `एवम् अरण्यकाण्डं पूर्णम्।` (see the human list).
- #161: addressee made the player throughout, with the dual `आवां … करवाव`.
- #23: fine as is.
- Simplifications: see the human list.
- मा + loṭ: two replaced (#11, #20), the rest kept and listed.

**File 3:**
- #217: kept.
- #85: NE paraphrase.
- #44, #105, #222: kept.
- #257, #186, #167: kept and listed.
- #256: → `किं त्वया दृष्टम्?`.
- Dropped names: not verifiable, kept dropped and listed.
- मा + loṭ: #139 → मास्तु, #90 kept.
- #219: → `रामाय 'शुभं भवतु' इति वदति` (Agastya says त्वम् to Rāma, so polite जयतु clashed).
- #248: → `{g:वत्स|वत्से}`; the same fix in #221, #239, #249, and `मम {g:शिष्य|शिष्ये}` in #263.
- #9, #96: correct, no change.
- #106: kept (`वीरान्`, listed).
- #126: the dual `तिष्ठथः` is correct.
- #261: kept (listed).
- Shrine unified to मन्दिरम् (7 lines). The verse book was already `श्लोकानां पुस्तकम्`.

## Notes for the file-1 reviewer / orchestrator
- Colophon and "begin Book N" phrasing differ between file 1 and files 2/3 (see the human list).
- File 1 already uses `त्वया सह आगच्छति` for "joins your party" and `पूर्वां दिशं …` for directions. Files 2 and 3 now match.
- The original files are backed up at `/home/claude/scratch/sa-rev-b/sa-dialogue-{2,3}.orig.json`.

## Lines that still need a human Sanskrit teacher's judgement

### Prohibitions with मा + loṭ (kept: accepted in modern spoken Sanskrit)
- file 2 #30, #31 `तस्मिन् विश्वासं मा कुरु` · #43 `कदा अपि तां मा त्यज` · #75 `एतत् मा कुरु` · #235 `किञ्चित् कालं मा पश्यत` (stands in for "close your eyes"; निमीलय्/पिधा are not in the packs)
- file 3 #90 `एतां देवीं मा पीडयत`
- Changed: 2#11 → `तत्र न गन्तव्यम्`, 2#20 → `भयं मास्तु`, 3#139 → `तस्मिन् विश्वासः मास्तु`

### Intercardinal directions (no compound is verifiable, so these are paraphrases)
- NW: 2#208, 2#228 `नगरे उत्तरस्याः पश्चिमायाः च दिशोः मध्ये मन्दिरम् अस्ति` · 2#275 `उत्तरस्याः पश्चिमायाः च मध्ये – मन्दिरम्`
- SE: 2#231 `दक्षिणस्याः पूर्वस्याः च दिशोः मध्ये गच्छतु` (reads loosely as a direction of motion)
- NE: 3#85 `उत्तरस्याः पूर्वस्याः च दिशोः मध्ये`
- Classical terms (वायव्ये / ऐशान्यां / आग्नेय्यां दिशि) exist, but they aren't in the packs and are above Level 3.

### Game-wide choices that must match file 1 (the other reviewer's file)
- **Kāṇḍa colophon.** 2#134 is now `एवम् अरण्यकाण्डं पूर्णम्।`. File 1 has `इति बालकाण्डम्।` / `इति अयोध्याकाण्डम्।` (an authentic colophon, but verbless). Pick one style.
- **"Begin Book N".** 2#135, 2#266 and 3#120 use `…काण्डम् आरभताम्` (polite "please begin", classical transitive). File 1 uses `तत्र …काण्डम् आरभते` (intransitive "begins", modern usage, though vocab glosses आरभते as "begins"). Pick one.
- **"Not quite".** File 1 has `न तथा`, file 2 `न सम्यक्`, file 3 `समीचीनं न` (more natural: `न समीचीनम्`). All are correct; unify if you want learners to see one form.

### Word choice or sense the checker cannot judge
- 2#213: the move शुद्धवाक् is written as the phrase `शुद्धा वाक्` (the compound is not in the packs).
- 2#219: `जम्बूः` (vocab "rose apple") strictly names the tree; the fruit is जम्बु / जाम्बव n. The fruit list also mixes numbers.
- 2#83, 2#237: `एके` = "some" (classical pronominal plural). केचन / केचित्, which Sambhāṣaṇa learners know, are not in the packs.
- 2#100: `पक्षाः` for "feathers" (MW gives pakṣa "a feather", but its main sense is "wing").
- 2#45, 2#46: `सम्यक् पश्यतु` for "go carefully" (सावधान is not in the packs).
- 2#180, 2#191: `बहिः नीतवान्` for "drove out" (निष्कासितवान् is not in the packs). Mild.
- 2#7: `भवतः रक्षिष्यामि`, acc. pl. of भवत्. Correct, but learners will read भवतः as gen. sg.
- 2#253, 2#255: elliptical `विंशतिं / नवतिं योजनानि` (the verb is understood from #252).
- 2#161: the line now speaks only to the player (मित्र). The English half addressed to Rāma ("Your young companion…") was folded in.
- 3#44, 3#105, 3#222: `न उद्घाटितम्` for "shut / barred" (पिहित is not in the packs).
- 3#217: `पठ, पुनः पठ, पुनः अपि पठ` for "three times" (त्रिः is not in the packs). This reads well for learners.
- 3#261: `लङ्कां यावत् … गृहं यावत्`, यावत् + acc. as a postposition. This is later and spoken usage; classical would be आ लङ्कायाः / लङ्कापर्यन्तम्.
- 3#224: `देवानां राज्ञः चालकः` for Indra's charioteer Mātali. चालक is modern "driver"; सारथि and मातलि are not in the packs.
- 3#152: `देवानां तक्षकस्य पुत्रः` for "son of Viśvakarman". MW takṣaka is also an epithet of Viśvakarman, but learners know Takṣaka as the nāga. A model for विश्वकर्मन् would fix this.
- 3#186: `हिमवान् यत्र अस्ति, तत्र` (हिमवन्तम् is not in the packs). Correct but clumsy.
- 3#167: tower paraphrased as `प्रासादस्य उपरि यत् आसीत्`.
- 3#257: `द्वादश दीपेषु अग्निं दत्तवान्` for "lit twelve lamps" (ज्वालय् is not in the packs).
- 3#115: `सीता कुशलेन आसीत्` (adverbial instr.). कुशलिनी would be more usual but is not in the packs.
- 3#126: `हनुमान् त्वं च … तिष्ठथः`. The 2nd-person dual is right (when युष्मद् is among the subjects the verb is madhyama); please confirm.
- 3#263: `त्वया एव जनाः … कथयिष्यन्ति` for "because of you" (hetu instr. with an active verb; a learner could read it as an agent).
- 3#106: `वीरान्` for "generals" (सेनापति is not in the packs), with verbless ellipsis.

### Names dropped because they are not in the packs (the meaning survives)
2#23 Śūrpaṇakhā · 2#235 Svayamprabhā · 2#260 Garuḍa (→ `वायुः इव`) · 2#118/#119 "curse" (शाप) · 3#32 Lamba / Trikūṭa · 3#66 śiṃśapā · 3#122, 3#199 Indra (→ `देवानां राजानम्`) · 3#124 Kubera · 3#54 pearls / sandalwood · 3#224 Mātali. A few `models` entries (MW-sourced) would restore them, but each model is itself a review item.

### Translator simplifications judged acceptable (file 2)
#13, #15, #49, #71, #107, #118, #119, #126, #140, #183, #235, #260 keep the meaning. #33 and #213 changed the meaning and were fixed (see the log). #100 is acceptable (see above).


## Change log (file · entry · before → after · reason)


### sa-dialogue-2.json

- **#4** [ch3.dandaka_sages · Sage of Dandaka] *consistency-direction*: 'पूर्वः मार्गः … नयति' (also reads 'the former road') → game-wide 'पूर्वस्यां दिशि' style
  - before: पूर्वः मार्गः पञ्चवटीं नयति। सा गोदावर्याः पार्श्वे अस्ति। भवन्तः तत्र शान्त्या वसन्तु।
  - after: पञ्चवटी पूर्वस्यां दिशि अस्ति, गोदावर्याः पार्श्वे। भवन्तः तत्र शान्त्या वसन्तु।
- **#10** [ch3.dandaka_sages · objective (quest-log line, imperative to the player)] *consistency-direction*: direction style as in file 1 ('पूर्वां दिशं गत्वा X गच्छतु'); one clear sentence
  - before: पूर्वः मार्गः पञ्चवटीं नयति। वने तेन मार्गेण गच्छतु।
  - after: वने पूर्वां दिशं गत्वा पञ्चवटीं गच्छतु।
- **#11** [ch3.dandaka_sage_b · Sage of Dandaka] *prohibition*: मा + loṭ → classical and natural 'न गन्तव्यम्' (one must not go)
  - before: अत्र उन्नते तृणे बहवः निशाचराः सन्ति। यदि यूयं युद्धाय सज्जाः न स्थ, तर्हि तत्र मा गच्छत।
  - after: अत्र उन्नते तृणे बहवः निशाचराः सन्ति। यदि यूयं युद्धाय सज्जाः न स्थ, तर्हि तत्र न गन्तव्यम्।
- **#12** [ch3.dandaka_sage_c · Sage] *consistency-shrine*: shrine आश्रमः → मन्दिरम् (participle to neuter उद्घाटितम्); 'go on' = अग्रे गच्छत
  - before: अस्माकम् आश्रमः युष्मभ्यम् उद्घाटितः अस्ति। प्रथमं तत्र विश्राम्यत, ततः गच्छत। यदा यूयम् एकं श्लोकं पूर्णं कुरुथ, तदा युष्माकं वीराः अधिकं बलं लभन्ते।
  - after: अस्माकं मन्दिरं युष्मभ्यम् उद्घाटितम् अस्ति। प्रथमं तत्र विश्राम्यत, ततः अग्रे गच्छत। यदा यूयम् एकं श्लोकं पूर्णं कुरुथ, तदा युष्माकं वीराः अधिकं बलं लभन्ते।
- **#14** [ch3.dandaka_hermit · Hermit] *consistency-direction*: direction style; आश्रमः kept (hermitage)
  - before: उत्तरः मार्गः मुनीनाम् आश्रमं नयति। कः अपि आगमिष्यति इति तेषाम् आशा अस्ति।
  - after: मुनीनाम् आश्रमः इतः उत्तरस्यां दिशि अस्ति। कः अपि आगमिष्यति इति तेषाम् आशा अस्ति।
- **#20** [ch3.enter_panchavati · person.jatayu] *prohibition*: मा बिभीत (मा + loṭ) → the spoken idiom 'भयं मास्तु'
  - before: वत्साः, मा बिभीत। अहं जटायुः, गृध्राणां राजा। अहं युष्माकं पितुः राज्ञः दशरथस्य मित्रम् अस्मि।
  - after: वत्साः, भयं मास्तु। अहं जटायुः, गृध्राणां राजा। अहं युष्माकं पितुः राज्ञः दशरथस्य मित्रम् अस्मि।
- **#24** [ch3.enter_panchavati · narration] *meaning*: restore 'to the north' (gameplay cue) with direction style
  - before: सा क्रोधेन दुःखेन च धावति। सा जनस्थानं गच्छति, यत्र तस्याः भ्राता खरः वसति। अधुना तत्र बहवः निशाचराः समागच्छन्ति।
  - after: सा क्रोधेन दुःखेन च धावति। सा जनस्थानं गच्छति, यत्र तस्याः भ्राता खरः वसति। अधुना उत्तरस्यां दिशि बहवः निशाचराः समागच्छन्ति।
- **#25** [ch3.enter_panchavati · objective (quest-log line, imperative to the player)] *consistency-direction*: direction style; keeps 'north of Panchavati'
  - before: उत्तरः मार्गः जनस्थानं नयति। तत्र खरस्य निशाचरैः सह युध्यताम्।
  - after: पञ्चवट्याः उत्तरस्यां दिशि जनस्थानम् अस्ति। तत्र खरस्य निशाचरैः सह युध्यताम्।
- **#26** [ch3.north_locked · narration] *consistency-direction*: direction style
  - before: उत्तरः मार्गः कण्टकैः पूर्णः अस्ति। अग्रे गन्तुं न शक्यम्।
  - after: उत्तरस्यां दिशि मार्गः कण्टकैः पूर्णः अस्ति। अग्रे गन्तुं न शक्यम्।
- **#30** [ch3.panchavati_hermit · Hermit] *consistency-direction*: direction style; मा कुरु kept (human-review list)
  - before: परन्तु पूर्वः मार्गः एकं वनं नयति। तत्र सायङ्काले किञ्चित् विचित्रं प्रकाशते। यत् अतीव सुन्दरम् अस्ति, तस्मिन् विश्वासं मा कुरु।
  - after: परन्तु पूर्वस्यां दिशि एकं वनम् अस्ति। तत्र सायङ्काले किञ्चित् विचित्रं प्रकाशते। यत् अतीव सुन्दरम् अस्ति, तस्मिन् विश्वासं मा कुरु।
- **#31** [ch3.panchavati_hermit · Hermit] *consistency-direction*: direction style (same as #30)
  - before: अत्र गोदावरी शान्त्या वहति। परन्तु पूर्वः मार्गः एकं वनं नयति। तत्र सायङ्काले किञ्चित् विचित्रं प्रकाशते। यत् अतीव सुन्दरम् अस्ति, तस्मिन् विश्वासं मा कुरु।
  - after: अत्र गोदावरी शान्त्या वहति। परन्तु पूर्वस्यां दिशि एकं वनम् अस्ति। तत्र सायङ्काले किञ्चित् विचित्रं प्रकाशते। यत् अतीव सुन्दरम् अस्ति, तस्मिन् विश्वासं मा कुरु।
- **#32** [ch3.keeper · Sage of Panchavati] *consistency-shrine*: shrine → मन्दिरम् (participle to neuter); 'save' restored as in file 1 (यात्रां रक्ष)
  - before: अहं पञ्चवट्याः आश्रमं रक्षामि। अत्र विश्राम्य, श्लोकं पठ वा। आश्रमः सर्वेभ्यः उद्घाटितः अस्ति।
  - after: अहं पञ्चवट्याः मन्दिरं रक्षामि। अत्र विश्राम्य, यात्रां रक्ष, श्लोकं पठ वा। मन्दिरं सर्वेभ्यः उद्घाटितम् अस्ति।
- **#33** [ch3.keeper · Sage of Panchavati] *meaning*: 'gives strength for Rama' → 'becomes a mantra for Rama' (English says mantra; मन्त्र model already shared)
  - before: रामः साक्षात् धर्मः। धर्मः मनुष्यः भूत्वा आगतवान्। अधुना सः श्लोकः रामस्य कृते बलं ददाति।
  - after: रामः साक्षात् धर्मः। धर्मः मनुष्यः भूत्वा आगतवान्। अधुना सः श्लोकः रामस्य कृते मन्त्रः भवति।
- **#48** [ch3.sita · objective (quest-log line, imperative to the player)] *consistency-direction*: direction style; one sentence
  - before: पूर्वः मार्गः वनं नयति। तत्र तं सुन्दरं मृगम् अनुगच्छतु।
  - after: पूर्वां दिशं गत्वा वने तं सुन्दरं मृगम् अनुगच्छतु।
- **#49** [ch3.sita · person.sita] *case*: अनन्तरम् governs the ablative (युद्धात्), not the genitive
  - before: जनस्थानस्य युद्धस्य अनन्तरं रामः तूष्णीं तिष्ठति। सः वदति – महती वृष्टिः आगच्छति इति।
  - after: जनस्थानस्य युद्धात् अनन्तरं रामः तूष्णीं तिष्ठति। सः वदति – महती वृष्टिः आगच्छति इति।
- **#50** [ch3.sita · person.sita] *consistency-shrine*: shrine → मन्दिरम्; 'by the shrine' = मन्दिरस्य पार्श्वे
  - before: {player}, आश्रमे मुनिः त्वां द्रष्टुम् इच्छति।
  - after: {player}, मन्दिरस्य पार्श्वे मुनिः त्वां द्रष्टुम् इच्छति।
- **#51** [ch3.sita · objective (quest-log line, imperative to the player)] *consistency-shrine*: shrine → मन्दिरम्
  - before: आश्रमे मुनिना सह मारीचस्य वचनं पठतु।
  - after: मन्दिरे मुनिना सह मारीचस्य वचनं पठतु।
- **#55** [ch3.east_locked · narration] *consistency-direction*: direction style
  - before: पूर्वः मार्गः गभीरं वनं नयति। तत्र सर्वं विचित्रं शान्तम्। अधुना तत्र गन्तुं न आवश्यकम्।
  - after: पूर्वस्यां दिशि गभीरं वनम् अस्ति। तत्र सर्वं विचित्रं शान्तम्। अधुना तत्र गन्तुं न आवश्यकम्।
- **#56** [ch3.east_locked · narration] *gender*: English 'child' addresses the player → {g:वत्स|वत्से}; shrine → मन्दिरे
  - before: वायौ वाल्मीकिः मन्दं वदति – प्रथमं समुद्रस्य पार्श्वे श्रुतं श्लोकं पूर्णं कुरु। आश्रमे मुनिः त्वां श्रोष्यति।
  - after: वायौ वाल्मीकिः मन्दं वदति – {g:वत्स|वत्से}, प्रथमं समुद्रस्य पार्श्वे श्रुतं श्लोकं पूर्णं कुरु। मन्दिरे मुनिः त्वां श्रोष्यति।
- **#80** [ch3.khara · objective (quest-log line, imperative to the player)] *consistency-shrine*: shrine → मन्दिरम्
  - before: पञ्चवटीं प्रत्यागच्छतु। आश्रमे मुनिना सह मारीचस्य वचनं पठतु।
  - after: पञ्चवटीं प्रत्यागच्छतु। मन्दिरे मुनिना सह मारीचस्य वचनं पठतु।
- **#83** [ch3.chase_3 · narration] *meaning*: English 'some of the deer', not 'many' (बहवः) → एके 'some' (केचित्/केचन not in the packs)
  - before: वनं विचित्रं भवति। परितः बहवः मृगाः केवलं छायाः सन्ति। रामः धनुः हस्ते धारयति।
  - after: वनं विचित्रं भवति। परितः एके मृगाः केवलं छायाः सन्ति। रामः धनुः हस्ते धारयति।
- **#94** [ch3.maricha_deer · narration] *consistency*: 'joins your party' system line: files 1 and 3 use 'त्वया सह आगच्छति'; 'भवद्भिः सह चलति' differed in wording and register
  - before: लक्ष्मणः पुनः भवद्भिः सह चलति।
  - after: लक्ष्मणः पुनः त्वया सह आगच्छति।
- **#98** [ch3.maricha_deer · person.lakshmana] *consistency-direction*: clumsy 'सः दक्षिणः मार्गः नदीं तरति' → trail 'crosses the river and goes south'; 'broken' flowers → fallen (भग्न not verifiable)
  - before: भ्रातः, पश्यतु! भूमौ पुष्पाणि सन्ति। अत्र एकः मार्गः अस्ति। सः दक्षिणः मार्गः नदीं तरति।
  - after: भ्रातः, पश्यतु! भूमौ पतितानि पुष्पाणि सन्ति। अत्र एकः मार्गः अपि अस्ति। सः नदीं तीर्त्वा दक्षिणां दिशं गच्छति।
- **#99** [ch3.maricha_deer · objective (quest-log line, imperative to the player)] *consistency-direction*: direction style; 3 sentences → 2
  - before: सीतां मार्गयतु। दक्षिणः मार्गः गोदावरीं तरति। तेन मार्गेण गच्छतु।
  - after: सीतां मार्गयतु। गोदावरीं तीर्त्वा दक्षिणां दिशं गच्छतु।
- **#104** [ch3.jatayu · person.jatayu] *consistency-direction*: translator doubt: 'तस्य मार्गः दक्षिणः आसीत्' → 'flew south' (दक्षिणां दिशम्); ambiguous 'तस्य विमाने' (his = Rāvaṇa's, should be reflexive) dropped
  - before: सः रावणः आसीत्। रावणः सीतां तस्य विमाने नीत्वा आकाशेन गतवान्। तस्य मार्गः दक्षिणः आसीत्। अहं तस्य विमानं नष्टं कृतवान्। सर्वेण बलेन तेन सह युद्धवान्।
  - after: सः रावणः आसीत्। रावणः सीतां विमाने नीत्वा आकाशेन दक्षिणां दिशं गतवान्। अहं तस्य विमानं नष्टं कृतवान्, सर्वेण बलेन तेन सह युद्धवान् च।
- **#105** [ch3.jatayu · person.jatayu] *consistency-direction*: translator doubt: 'तस्याः मार्गः दक्षिणः। तं मार्गम् अनुगच्छ' → 'Go south' (दक्षिणां दिशं गच्छ)
  - before: परन्तु अहं वृद्धः। सः मां जितवान्। सा राम इति उच्चैः क्रन्दितवती। तस्याः मार्गः दक्षिणः। तं मार्गम् अनुगच्छ। त्वं तां द्रक्ष्यसि।
  - after: परन्तु अहं वृद्धः। सः मां जितवान्। सा राम इति उच्चैः क्रन्दितवती। दक्षिणां दिशं गच्छ। त्वं तां द्रक्ष्यसि।
- **#106** [ch3.jatayu · narration] *agreement*: translator doubt: neuter 'प्रियं मित्रं' in apposition to masc. जटायुः → masc. 'प्रियः सखा' (agrees in gender; classical word for a male friend)
  - before: एवम् उक्त्वा दशरथस्य प्रियं मित्रं जटायुः रामस्य बाह्वोः जीवनं त्यजति।
  - after: एवम् उक्त्वा दशरथस्य प्रियः सखा जटायुः रामस्य बाह्वोः जीवनं त्यजति।
- **#109** [ch3.jatayu · objective (quest-log line, imperative to the player)] *consistency-direction*: direction style as in file 1 ('… गच्छतु, वनं प्रति')
  - before: पूर्वः मार्गः पम्पां नयति। तेन मार्गेण गच्छतु।
  - after: पूर्वां दिशं गच्छतु, पम्पां प्रति।
- **#127** [ch3.shabari · person.shabari] *meaning*: 'I stayed here a long time' → 'I have waited for you a long time' (closer to 'waited all these years')
  - before: राम! मम गुरवः उक्तवन्तः – रामः आगमिष्यति, तस्य कृते अत्र तिष्ठ इति। अहं दीर्घं कालम् अत्र स्थितवती।
  - after: राम! मम गुरवः उक्तवन्तः – रामः आगमिष्यति, तस्य कृते अत्र तिष्ठ इति। अहं दीर्घं कालं भवन्तं प्रतीक्षितवती।
- **#130** [ch3.shabari · person.shabari] *consistency-direction*: keeps the imperative 'Go to Rishyamuka' and uses direction style
  - before: इतः पूर्वः मार्गः ऋश्यमूकं पर्वतं नयति। तत्र सुग्रीवः नाम वानरः चतुर्भिः मित्रैः सह जनेभ्यः दूरे वसति। सीतां मार्गयितुं सः भवतः उपकरिष्यति।
  - after: ऋश्यमूकं पर्वतं गच्छतु। सः इतः पूर्वस्यां दिशि अस्ति। तत्र सुग्रीवः नाम वानरः चतुर्भिः मित्रैः सह जनेभ्यः दूरे वसति। सीतां मार्गयितुं सः भवतः उपकरिष्यति।
- **#131** [ch3.shabari · narration] *case*: वद् takes the person addressed in the dative: तां → तस्यै
  - before: रामः तां शुभं भवतु इति वदति। ततः शबरी अग्निं प्रविशति। तस्याः शरीरं सूर्यः इव प्रकाशते। सा गुरूणां लोकं गच्छति।
  - after: रामः तस्यै शुभं भवतु इति वदति। ततः शबरी अग्निं प्रविशति। तस्याः शरीरं सूर्यः इव प्रकाशते। सा गुरूणां लोकं गच्छति।
- **#134** [ch3.shabari · narration] *meaning*: translator doubt: verbless colophon 'इति अरण्यकाण्डम्' → a learner-readable sentence 'Thus the Araṇyakāṇḍa is complete' ('third' dropped: तृतीयम् not in the packs). File 1 keeps 'इति …काण्डम्' — see human list
  - before: इति अरण्यकाण्डम्।
  - after: एवम् अरण्यकाण्डं पूर्णम्।
- **#135** [ch3.shabari · objective (quest-log line, imperative to the player)] *consistency-direction*: direction style; 'आरभताम्' kept (loṭ 3sg ātm., polite 'please begin', grammatical)
  - before: पूर्वः मार्गः ऋश्यमूकं नयति। तत्र गत्वा किष्किन्धाकाण्डम् आरभताम्।
  - after: पूर्वां दिशं गत्वा ऋश्यमूकं पर्वतं गच्छतु। तत्र किष्किन्धाकाण्डम् आरभताम्।
- **#138** [ch3.matanga_disciple · Sage] *consistency-shrine*: shrine → मन्दिरम्
  - before: मतङ्गस्य शिष्याः यानि पुष्पाणि धृतवन्तः, तानि कदा अपि न शुष्यन्ति इति जनाः वदन्ति। अस्माकम् आश्रमे विश्राम्य। तत्र महती शान्तिः अस्ति।
  - after: मतङ्गस्य शिष्याः यानि पुष्पाणि धृतवन्तः, तानि कदा अपि न शुष्यन्ति इति जनाः वदन्ति। अस्माकं मन्दिरे विश्राम्य। तत्र महती शान्तिः अस्ति।
- **#139** [ch3.pampa_child · Child] *consistency-direction*: direction style
  - before: पूर्वः मार्गः एकं पर्वतं नयति। तत्र वानराः सन्ति! महान्तः वानराः! ये सरः आगच्छन्ति, तान् सर्वान् ते पश्यन्ति।
  - after: पूर्वस्यां दिशि एकः पर्वतः अस्ति। तत्र वानराः सन्ति! महान्तः वानराः! ये सरः आगच्छन्ति, तान् सर्वान् ते पश्यन्ति।
- **#141** [dandaka_vana · sign] *consistency-direction*: sign: direction style
  - before: पूर्वः मार्गः – पञ्चवटी, गोदावर्याः पार्श्वे।
  - after: पूर्वस्यां दिशि – पञ्चवटी, गोदावर्याः पार्श्वे।
- **#143** [panchavati · sign] *consistency-direction*: sign: direction style; 'across the river' = नद्याः अन्यस्मिन् पार्श्वे (as file 3 #128; a gerund 'नदीं तीर्त्वा' has no agent in a sign); 'the road to Pampa' restored
  - before: पूर्वः मार्गः – गभीरं वनम्। उत्तरः मार्गः – जनस्थानम्। दक्षिणः मार्गः – नदीं तीर्त्वा पम्पाम्।
  - after: पूर्वस्यां दिशि – गभीरं वनम्। उत्तरस्यां दिशि – जनस्थानम्। दक्षिणस्यां दिशि, नद्याः अन्यस्मिन् पार्श्वे – पम्पायाः मार्गः।
- **#144** [jatayu_glade · sign] *consistency-direction*: sign: direction style (आश्रमः = hermitage, kept)
  - before: पूर्वः मार्गः – पम्पा, मतङ्गस्य आश्रमः च।
  - after: पूर्वस्यां दिशि – पम्पा, मतङ्गस्य आश्रमः च।
- **#145** [shabari_ashrama · sign] *consistency-direction*: sign: direction style
  - before: पूर्वः मार्गः – ऋश्यमूकं पर्वतं प्रति। तत्र सुग्रीवः जनेभ्यः दूरे वसति।
  - after: पूर्वस्यां दिशि ऋश्यमूके पर्वते सुग्रीवः जनेभ्यः दूरे वसति।
- **#152** [ch4.mendicant · narration] *case*: राजकुमारौ was the object of वदति (वद् does not take the person in the acc.); now the object of प्रणम्य 'bowing to the princes'
  - before: एकः साधुः मार्गेण अवतरति। सः प्रणम्य राजकुमारौ मधुरं वदति।
  - after: एकः साधुः मार्गेण अवतरति। सः राजकुमारौ प्रणम्य मधुरं वदति।
- **#153** [ch4.mendicant · Mendicant] *meaning*: the garments were 'in your hands'; English: bark garments on your shoulders → स्कन्धयोः
  - before: भवन्तौ कौ? भवन्तौ सूर्यः इव प्रकाशेते। भवतोः हस्तयोः धनुषी स्तः, मुनीनां वस्त्राणि च। वानराणां राजा सुग्रीवः मां प्रष्टुम् अत्र आदिष्टवान्।
  - after: भवन्तौ कौ? भवन्तौ सूर्यः इव प्रकाशेते। भवतोः हस्तयोः धनुषी स्तः। स्कन्धयोः मुनीनां वस्त्राणि सन्ति। वानराणां राजा सुग्रीवः मां प्रष्टुम् अत्र आदिष्टवान्।
- **#159** [ch4.mendicant · narration] *consistency*: quiz-feedback narration speaks to the player with त्वम् in files 1 and 3 ('पुनः पश्य'); पठतु → पठ
  - before: न सम्यक्। शब्दाः तेषाम् अन्ते मिलन्ति। विच्छेदं पठतु। तदा शब्दाः पुनः प्रकाशन्ते।
  - after: न सम्यक्। शब्दाः तेषाम् अन्ते मिलन्ति। विच्छेदं पठ। तदा शब्दाः पुनः प्रकाशन्ते।
- **#161** [ch4.mendicant · person.hanuman] *agreement*: translator doubt (addressee): the whole line now clearly addresses the player (मित्र, gender-neutral); the contest is Hanumān + player, so dual 'आवां … करवाव' instead of plural करवाम
  - before: मित्र, तव हस्ते श्लोकानां पुस्तकम् अस्ति। आगच्छ, एकत्र शब्दानां परीक्षां करवाम। ततः भवन्तः कीदृशाः इति अहं मम राज्ञे कथयिष्यामि।
  - after: मित्र, तव हस्ते श्लोकानां पुस्तकम् अस्ति। आगच्छ, आवां शब्दानां परीक्षां करवाव। ततः भवन्तः कीदृशाः इति अहं मम राज्ञे कथयिष्यामि।
- **#162** [ch4.mendicant · battle intro (narration)] *case*: आह्वयति needs its object: 'invites you' → त्वाम् (gender-neutral)
  - before: हनुमान् स्नेहेन श्लोकानां क्रीडायै आह्वयति।
  - after: हनुमान् स्नेहेन त्वां श्लोकानां क्रीडायै आह्वयति।
- **#164** [ch4.mendicant · narration] *consistency*: 'joins your party' wording as in files 1 and 3
  - before: हनुमान् अधुना भवद्भिः सह चलति!
  - after: हनुमान् त्वया सह आगच्छति!
- **#172** [ch4.hanuman_retry · person.hanuman] *agreement*: two participants (Hanumān + player): dual करवाव, as in #176 'वदिष्यावः'
  - before: मित्र, पुनः शब्दानां परीक्षां करवाम वा? वद, अहं श्रोष्यामि।
  - after: मित्र, पुनः शब्दानां परीक्षां करवाव वा? वद, अहं श्रोष्यामि।
- **#175** [ch4.hanuman_retry · person.hanuman] *meaning*: 'उत्तमं वदसि' (you speak excellently) over-praises; English 'but closer' → 'now you speak more correctly'
  - before: मम विश्वासः अधुना अपि न जातः। परन्तु इदानीं त्वम् उत्तमं वदसि।
  - after: मम विश्वासः अधुना अपि न जातः। परन्तु इदानीं त्वम् अधिकं सम्यक् वदसि।
- **#180** [ch4.minister · Vanara minister] *meaning*: pronoun 'तस्य भ्राता … तम्' came before Sugrīva was named; name him first
  - before: तस्य भ्राता वाली तं किष्किन्धायाः बहिः नीतवान्। तदा आरभ्य राजा सुग्रीवः भयेन वसति।
  - after: राज्ञः सुग्रीवस्य भ्राता वाली तं किष्किन्धायाः बहिः नीतवान्। तदा आरभ्य सुग्रीवः भयेन वसति।
- **#190** [ch4.sugriva_alliance · narration] *consistency*: quiz-feedback narration with त्वम् as in files 1 and 3: पश्यतु → पश्य
  - before: न सम्यक्। शब्दस्य पत्रं पुनः पश्यतु। तदा अर्थः मनसि स्थास्यति।
  - after: न सम्यक्। शब्दस्य पत्रं पुनः पश्य। तदा अर्थः मनसि स्थास्यति।
- **#193** [ch4.sugriva_alliance · narration] *consistency*: 'joins your party' wording as in files 1 and 3
  - before: सुग्रीवः अधुना भवद्भिः सह चलति!
  - after: सुग्रीवः त्वया सह आगच्छति!
- **#194** [ch4.sugriva_alliance · objective (quest-log line, imperative to the player)] *consistency-direction*: direction style; one sentence
  - before: उत्तरः मार्गः गुहया किष्किन्धां नयति। तेन मार्गेण गच्छतु।
  - after: गुहायाः मार्गेण उत्तरां दिशं गत्वा किष्किन्धां गच्छतु।
- **#195** [ch4.cave_locked · narration] *consistency-direction*: direction style
  - before: उत्तरः मार्गः गुहया पर्वतं प्रविशति। गुहायां गभीरः अन्धकारः अस्ति। प्रथमं पर्वतस्य उपरि वानरान् पश्यतु।
  - after: उत्तरस्यां दिशि गुहायाः मार्गः पर्वतं प्रविशति। गुहायां गभीरः अन्धकारः अस्ति। प्रथमं पर्वतस्य उपरि वानरान् पश्यतु।
- **#200** [ch4.council · person.angada] *consistency-shrine*: shrine → मन्दिरे; 'the southern party' restored (ready to go south)
  - before: अस्माकं वानराः गन्तुं सज्जाः। त्वया आश्रमे श्लोकः पूर्णः कृतः वा?
  - after: दक्षिणां दिशं गन्तुं वानराः सज्जाः सन्ति। त्वया मन्दिरे श्लोकः पूर्णः कृतः वा?
- **#202** [ch4.council · person.sugriva] *consistency-direction*: translator doubt: 'पूर्वः मार्गः, पश्चिमः मार्गः, उत्तरः मार्गः – एतेषु मार्गेषु गच्छत' → plain 'go east, west and north'
  - before: वानराः, पूर्वः मार्गः, पश्चिमः मार्गः, उत्तरः मार्गः – एतेषु मार्गेषु गच्छत! सर्वाणि वनानि, नदीः, गुहाः च मार्गयत। एकस्मिन् मासे प्रत्यागच्छत।
  - after: वानराः, पूर्वां दिशम्, पश्चिमां दिशम्, उत्तरां दिशं च गच्छत! सर्वाणि वनानि, नदीः, गुहाः च मार्गयत। एकस्मिन् मासे प्रत्यागच्छत।
- **#203** [ch4.council · person.sugriva] *consistency-direction*: 'दक्षिणः मार्गः – तत्र अङ्गदः नेता' → 'Angada will lead the vanaras south'; comma so हनुमान् is not read as 'king of the bears'
  - before: दक्षिणः मार्गः – तत्र अङ्गदः नेता। हनुमान् भल्लूकानां राजा जाम्बवान् च तेन सह गमिष्यतः।
  - after: अङ्गदः वानरान् दक्षिणां दिशं नेष्यति। हनुमान्, भल्लूकानां राजा जाम्बवान् च तेन सह गमिष्यतः।
- **#205** [ch4.council · narration] *consistency*: 'joins your party' wording as in files 1 and 3
  - before: जाम्बवान् अधुना भवद्भिः सह चलति!
  - after: जाम्बवान् त्वया सह आगच्छति!
- **#206** [ch4.council · narration] *meaning*: 'तस्य अङ्गुलीयकम्' reads as Hanumān's ring (non-reflexive pronoun); dropped — the next sentence says whose name is on it
  - before: रामः हनुमन्तं पृथक् नयति। सः हनुमते तस्य अङ्गुलीयकं ददाति। तस्मिन् रामस्य नाम लिखितम् अस्ति।
  - after: रामः हनुमन्तं पृथक् नयति। सः हनुमते अङ्गुलीयकं ददाति। तस्मिन् रामस्य नाम लिखितम् अस्ति।
- **#208** [ch4.council · objective (quest-log line, imperative to the player)] *consistency-shrine*: shrine → मन्दिरम्; 'north-west' restored as 'between north and west' (उत्तरपश्चिम… not verifiable; 'नगरस्य कोणे' lost the direction); 'ततः पूर्वः मार्गः – तेन गच्छतु' → direction style
  - before: नगरस्य कोणे आश्रमः अस्ति। तत्र शुद्धस्य वचनस्य श्लोकं पूर्णं करोतु। ततः पूर्वः मार्गः – तेन गच्छतु।
  - after: नगरे उत्तरस्याः पश्चिमायाः च दिशोः मध्ये मन्दिरम् अस्ति। तत्र शुद्धस्य वचनस्य श्लोकं पूर्णं करोतु। ततः पूर्वां दिशं गच्छतु।
- **#210** [ch4.shrine_keeper · Shrine keeper] *consistency-shrine*: shrine → मन्दिरम्
  - before: किष्किन्धायाः आश्रमे स्वागतम्। यदा इच्छसि, तदा अत्र विश्राम्य।
  - after: किष्किन्धायाः मन्दिरे स्वागतम्। यदा इच्छसि, तदा अत्र विश्राम्य।
- **#211** [ch4.shrine_keeper · Shrine keeper] *consistency*: 'your verse book' = श्लोकानां पुस्तकम् (game-wide term)
  - before: हनुमतः शुद्धं वचनं श्रुत्वा रामः अपि मुदितवान्। मया सह तं श्लोकं पठ। तदा तस्य सर्वे शब्दाः तव पुस्तके पुनः पूर्णाः भविष्यन्ति।
  - after: हनुमतः शुद्धं वचनं श्रुत्वा रामः अपि मुदितवान्। मया सह तं श्लोकं पठ। तदा तस्य सर्वे शब्दाः तव श्लोकानां पुस्तके पुनः पूर्णाः भविष्यन्ति।
- **#213** [ch4.shrine_keeper · narration] *meaning*: named the new strength 'व्याकरणम्' but the move is शुद्धवाक् 'flawless speech' (written शुद्धा वाक्; the compound is not in the packs); 'mantra' restored
  - before: अधुना भवद्भिः नूतनं बलं लब्धम् – व्याकरणम्। तत् सर्वान् बलवतः करोति।
  - after: नूतनः मन्त्रः लब्धः – शुद्धा वाक्। सः सर्वान् बलवतः करोति।
- **#214** [ch4.shrine_keeper · objective (quest-log line, imperative to the player)] *consistency-direction*: direction style; one sentence
  - before: पूर्वः मार्गः गुहया नगरात् बहिः नयति। वानरैः सह तेन मार्गेण गच्छतु।
  - after: वानरैः सह पूर्वस्यां दिशि गुहायाः मार्गेण नगरात् बहिः गच्छतु।
- **#218** [ch4.fruit_seller · Fruit seller] *meaning*: '{w:vyakarana} इति शब्दस्य अर्थः – सर्वे शब्दाः उचिताः' gave a false definition (vyākaraṇa = grammar); English 'That is vyākaraṇa: …' → 'एतत् एव व्याकरणम्'
  - before: हनुमान् बहु उक्तवान्, परन्तु तस्य सर्वे शब्दाः समीचीनाः। {w:vyakarana} इति शब्दस्य अर्थः – सर्वे शब्दाः उचिताः।
  - after: हनुमान् बहु उक्तवान्, परन्तु तस्य सर्वे शब्दाः समीचीनाः। एतत् एव {w:vyakarana} – सर्वे शब्दाः उचिताः।
- **#219** [ch4.fruit_seller · Fruit seller] *meaning*: translator doubt: 'एव अतीव' ≈ 'only … very sweet'; superlative → standard spoken comparative 'sweeter than all fruits' (abl. + अधिकम्)
  - before: आम्राणि, पनसाः, जम्बूः! लोके किष्किन्धायाः फलानि एव अतीव मधुराणि।
  - after: आम्राणि, पनसाः, जम्बूः! लोके किष्किन्धायाः फलानि सर्वेभ्यः फलेभ्यः अधिकं मधुराणि!
- **#221** [ch4.vanara_home · Vanara] *consistency-direction*: direction style
  - before: मम पतिः अन्यैः वानरैः सह उत्तरं मार्गं गच्छति। वयं सर्वे रामस्य राज्ञीं मार्गयिष्यामः।
  - after: मम पतिः अन्यैः वानरैः सह उत्तरां दिशं गच्छति। वयं सर्वे रामस्य राज्ञीं मार्गयिष्यामः।
- **#222** [ch4.vanara_elder · Vanara elder] *meaning*: non-reflexive 'तस्य वचनम्' (whose?) → 'the word given to Rāma'
  - before: वर्षासु अस्माकं नूतनः राजा तस्य वचनं विस्मृतवान्। तदा लक्ष्मणः क्रोधेन द्वारम् आगतवान्। राज्ञी तारा तं शान्तं कृतवती।
  - after: वर्षासु अस्माकं नूतनः राजा रामाय दत्तं वचनं विस्मृतवान्। तदा लक्ष्मणः क्रोधेन द्वारम् आगतवान्। राज्ञी तारा तं शान्तं कृतवती।
- **#224** [ch4.east_guard · Vanara guard] *consistency-direction*: direction style
  - before: पूर्वः मार्गः गुहया विन्ध्यस्य वनानि नयति। शुभं भवतु, वीराः!
  - after: पूर्वस्यां दिशि गुहायाः मार्गः विन्ध्यस्य वनानि नयति। शुभं भवतु, वीराः!
- **#225** [ch4.east_guard · Vanara guard] *consistency-direction*: direction style
  - before: पूर्वः मार्गः गुहया विन्ध्यस्य वनानि नयति।
  - after: पूर्वस्यां दिशि गुहायाः मार्गः विन्ध्यस्य वनानि नयति।
- **#226** [ch4.south_guard · Vanara guard] *consistency-direction*: direction style
  - before: दक्षिणः मार्गः गुहया पुनः ऋश्यमूकं पर्वतं नयति।
  - after: दक्षिणस्यां दिशि गुहायाः मार्गः पुनः ऋश्यमूकं पर्वतं नयति।
- **#227** [ch4.east_locked · person.hanuman] *consistency-shrine*: shrine → मन्दिरे
  - before: दूतस्य वचनं शुद्धम् एव भवेत्। प्रथमम् आश्रमे शुद्धस्य वचनस्य श्लोकं पूर्णं करवाम, ततः गच्छाम।
  - after: दूतस्य वचनं शुद्धम् एव भवेत्। प्रथमं मन्दिरे शुद्धस्य वचनस्य श्लोकं पूर्णं करवाम, ततः गच्छाम।
- **#228** [ch4.east_locked · objective (quest-log line, imperative to the player)] *consistency-shrine*: shrine → मन्दिरम्; 'north-west' restored (as #208)
  - before: नगरस्य कोणे आश्रमः अस्ति। तत्र शुद्धस्य वचनस्य श्लोकं पूर्णं करोतु।
  - after: नगरे उत्तरस्याः पश्चिमायाः च दिशोः मध्ये मन्दिरम् अस्ति। तत्र शुद्धस्य वचनस्य श्लोकं पूर्णं करोतु।
- **#231** [ch4.vindhya_enter · objective (quest-log line, imperative to the player)] *consistency-direction*: 'south-east' was dropped; restored as 'between south and east'
  - before: विन्ध्यस्य वने अग्रे गच्छतु, सीतां मार्गयतु च।
  - after: विन्ध्यस्य वने दक्षिणस्याः पूर्वस्याः च दिशोः मध्ये गच्छतु, सीतां मार्गयतु च।
- **#237** [ch4.scout · Vanara scout] *meaning*: 'सीतां न दृष्ट्वा' (न + ktvā is not classical; अदृष्ट्वा) → 'without news' as in #265; 'some of us' = एके, not बहवः 'many'
  - before: यदि वयं सीतां न दृष्ट्वा प्रत्यागच्छामः, तर्हि सुग्रीवः क्रुद्धः भविष्यति। अस्माकं मध्ये बहवः सर्वं त्यक्तुम् इच्छन्ति।
  - after: यदि वयं वार्तां विना प्रत्यागच्छामः, तर्हि सुग्रीवः क्रुद्धः भविष्यति। अस्माकं मध्ये एके सर्वं त्यक्तुम् इच्छन्ति।
- **#240** [ch4.sampati · Sampati] *meaning*: 'समुद्रं तीर्त्वा' attached a gerund to 'Lanka is' (no shared agent); 'to the south' restored
  - before: वत्साः, महेन्द्रं गच्छत। समुद्रं तीर्त्वा, इतः शतं योजनानि दूरे लङ्का अस्ति।
  - after: वत्साः, महेन्द्रं गच्छत। इतः दक्षिणस्यां दिशि शतं योजनानि दूरे लङ्का अस्ति।
- **#244** [ch4.sampati · Sampati] *meaning*: translator doubt: 'एव अतीव' superlative → comparative 'sharper than all' (as #219)
  - before: पुरा तं रक्षितुम् अहं सूर्यं प्रति अतीव उपरि उत्पतितवान्। मम पक्षौ दग्धौ। परन्तु अधुना अपि लोके मम नेत्रे एव अतीव तीक्ष्णे।
  - after: पुरा तं रक्षितुम् अहं सूर्यं प्रति अतीव उपरि उत्पतितवान्। मम पक्षौ दग्धौ। परन्तु अधुना अपि लोके मम नेत्रे सर्वेभ्यः अधिकं तीक्ष्णे।
- **#247** [ch4.sampati · objective (quest-log line, imperative to the player)] *consistency-direction*: direction style; 'समुद्रस्य उपरि … नयति' (leads over the ocean) → 'rises high by the sea'
  - before: पूर्वः मार्गः समुद्रस्य उपरि महेन्द्रं पर्वतं नयति। तेन मार्गेण गच्छतु।
  - after: पूर्वां दिशं गत्वा महेन्द्रं पर्वतं गच्छतु। सः समुद्रस्य पार्श्वे उन्नतः अस्ति।
- **#248** [ch4.mahendra_locked · person.jambavan] *tense-mood*: 'we must keep searching' — present 'मार्गयामः' (we search) → obligation 'अस्माभिः … मार्गयितव्यम्'
  - before: एषः मार्गः समुद्रस्य पार्श्वे महान्तं पर्वतं नयति। परन्तु तत्र गत्वा किं करिष्यामः? वयं पुनः मार्गयामः।
  - after: एषः मार्गः समुद्रस्य पार्श्वे महान्तं पर्वतं नयति। परन्तु तत्र गत्वा किं करिष्यामः? अस्माभिः पुनः मार्गयितव्यम्।
- **#250** [ch4.mahendra_enter · narration] *meaning*: 'तस्य बलम्' (someone else's) → reflexive 'आत्मनः बलम्' (his own)
  - before: कः शतं योजनानि उत्पतितुं शक्नोति? एकः एकः वानरः तस्य बलं वदति।
  - after: कः शतं योजनानि उत्पतितुं शक्नोति? एकः एकः वानरः आत्मनः बलं वदति।
- **#253** [ch4.vanara_gavaksha · Gavaksha] *case*: distance jumped (object of 'can leap' understood from #252) is accusative: विंशतिम्
  - before: कदाचित् विंशतिः योजनानि। समुद्रः अतीव विशालः!
  - after: कदाचित् विंशतिं योजनानि। समुद्रः अतीव विशालः!
- **#254** [ch4.vanara_sharabha · Sharabha] *agreement*: 'अहं त्रिंशत् योजनानि' had no verb; natural order 'न पर्याप्तम्'
  - before: अहं त्रिंशत् योजनानि। तत् अपि पर्याप्तं न।
  - after: अहं त्रिंशत् योजनानि उत्पतितुं शक्नोमि। तत् अपि न पर्याप्तम्।
- **#255** [ch4.vanara_mainda · Mainda] *case*: accusative of the distance jumped: नवतिम् (as #253)
  - before: यदि वायुः मम मित्रम्, तर्हि नवतिः योजनानि। परन्तु लङ्का शतं योजनानि दूरे अस्ति।
  - after: यदि वायुः मम मित्रम्, तर्हि नवतिं योजनानि। परन्तु लङ्का शतं योजनानि दूरे अस्ति।
- **#264** [ch4.jambavan_speech · narration] *consistency*: 'his own' strength: reflexive आत्मनः (not तस्य); 'returns to your side' in the game-wide party wording
  - before: हनुमान् तस्य सत्यं बलं स्मरति! अधुना तस्य बलम् अधिकम्। सः पुनः भवद्भिः सह चलति।
  - after: हनुमान् आत्मनः सत्यं बलं स्मरति! अधुना तस्य बलम् अधिकम्। सः पुनः त्वया सह आगच्छति।
- **#274** [rishyamuka · sign] *meaning*: 'ऋश्यमूके पर्वते, उपरि,' was disjointed → 'on top of Rishyamuka hill'
  - before: ऋश्यमूके पर्वते, उपरि, सुग्रीवः नाम वानरः जनेभ्यः दूरे वसति। अधः पम्पा अस्ति।
  - after: ऋश्यमूकस्य पर्वतस्य उपरि सुग्रीवः नाम वानरः जनेभ्यः दूरे वसति। अधः पम्पा अस्ति।
- **#275** [kishkindha_caves · sign] *consistency-shrine*: shrine → मन्दिरम्; 'उत्तरः पश्चिमः च कोणः' → 'between north and west'; direction style
  - before: किष्किन्धा – गुहासु वानराणां नगरम्। उत्तरः मार्गः – राज्ञः शाला। उत्तरः पश्चिमः च कोणः – आश्रमः।
  - after: किष्किन्धा – गुहासु वानराणां नगरम्। उत्तरस्यां दिशि – राज्ञः शाला। उत्तरस्याः पश्चिमायाः च मध्ये – मन्दिरम्।

### sa-dialogue-3.json

- **#1** [ch5.leap_start · narration] *level*: प्रतिपालयिष्यन्ति (L3, literary) → प्रतीक्षिष्यन्ते (L2, the verb used everywhere else in the game)
  - before: रामः, लक्ष्मणः, सुग्रीवः च किष्किन्धां प्रत्यागच्छन्ति। ते तत्र वार्तां प्रतिपालयिष्यन्ति। जाम्बवान् वानरैः सह समुद्रस्य तीरे एव तिष्ठति।
  - after: रामः, लक्ष्मणः, सुग्रीवः च किष्किन्धां प्रत्यागच्छन्ति। ते तत्र वार्तां प्रतीक्षिष्यन्ते। जाम्बवान् वानरैः सह समुद्रस्य तीरे एव तिष्ठति।
- **#10** [ch5.mainaka · narration] *consistency-shrine*: shrine आश्रमः → मन्दिरम् (adjectives to neuter)
  - before: यदा सः पर्वतेन सह वदति, तदा त्वं पर्वते एकं पुरातनम् आश्रमं गच्छसि। तत्र उपविश्य त्वं किञ्चित् विश्राम्यसि।
  - after: यदा सः पर्वतेन सह वदति, तदा त्वं पर्वते एकं पुरातनं मन्दिरं गच्छसि। तत्र उपविश्य त्वं किञ्चित् विश्राम्यसि।
- **#11** [ch5.mainaka · narration] *consistency-shrine*: shrine → मन्दिरम्
  - before: सर्वे पुनः स्वस्थाः सन्ति। मैनाकस्य आश्रमः तव स्थानं रक्षिष्यति।
  - after: सर्वे पुनः स्वस्थाः सन्ति। मैनाकस्य मन्दिरं तव स्थानं रक्षिष्यति।
- **#21** [ch5.surasa · choice prompt] *register*: choice prompt 'किं … दास्यति?' read as 'will he give?'; polite loṭ + वा as in all other choice prompts (file 2 #113, #168)
  - before: किं सुरसायै पुनः उत्तरं दास्यति?
  - after: पुनः सुरसायै उत्तरं ददातु वा?
- **#23** [ch5.surasa · choice option (player's reply/action)] *meaning*: 'पश्चात् गत्वा' = 'having gone later'; 'fall back' = पृष्ठतः (backwards), as file 2 #122
  - before: पश्चात् गत्वा विश्राम्यामि।
  - after: पृष्ठतः गत्वा विश्राम्यामि।
- **#24** [ch5.surasa · narration] *consistency-shrine*: shrine → मन्दिरम्
  - before: त्वं पुनः मैनाकं प्रति गच्छसि। तस्य आश्रमः तव बलं पुनः दास्यति।
  - after: त्वं पुनः मैनाकं प्रति गच्छसि। तस्य मन्दिरं तव बलं पुनः दास्यति।
- **#34** [ch5.arrive_lanka · narration] *consistency-shrine*: shrine → मन्दिरम्; adjective and pronoun to neuter (पुरातनं, तत्)
  - before: पश्चिमायां दिशि पर्वते शिलायाः पुरातनः आश्रमः अस्ति। नगरस्य जनाः तं विस्मृतवन्तः। त्वं तत्र विश्रमितुं शक्नोषि।
  - after: पश्चिमायां दिशि पर्वते शिलायाः पुरातनं मन्दिरम् अस्ति। नगरस्य जनाः तत् विस्मृतवन्तः। त्वं तत्र विश्रमितुं शक्नोषि।
- **#65** [ch5.grove_locked · narration] *case*: परितः governs the accusative: उद्यानस्य → उद्यानम्
  - before: उद्यानस्य परितः स्वर्णस्य महती भित्तिः अस्ति। हनुमान् चिन्तयति, 'प्रथमं रावणस्य प्रासादे मार्गयामि।'
  - after: उद्यानं परितः स्वर्णस्य महती भित्तिः अस्ति। हनुमान् चिन्तयति, 'प्रथमं रावणस्य प्रासादे मार्गयामि।'
- **#72** [ch5.sita · person.sita] *level*: प्रतिपालयामि → प्रतीक्षे (common verb, as elsewhere)
  - before: हनुमन्, सुखेन गच्छतु। रामाय कथयतु, 'अहं भवन्तं प्रतिपालयामि।'
  - after: हनुमन्, सुखेन गच्छतु। रामाय कथयतु, 'अहं भवन्तं प्रतीक्षे।'
- **#76** [ch5.sita · narration] *level*: प्रतिपालितवती → प्रतीक्षितवती
  - before: आम्! सीता बहु कालं प्रतिपालितवती। अन्ते आनन्दः तां प्राप्नोति।
  - after: आम्! सीता बहु कालं प्रतीक्षितवती। अन्ते आनन्दः तां प्राप्नोति।
- **#84** [ch5.sita · person.sita] *level*: प्रतिपालयिष्यामि → प्रतीक्षिष्ये
  - before: रामाय कथयतु, 'अहं केवलम् अल्पं कालं प्रतिपालयिष्यामि।' सुखेन गच्छतु।
  - after: रामाय कथयतु, 'अहं केवलम् अल्पं कालं प्रतीक्षिष्ये।' सुखेन गच्छतु।
- **#85** [ch5.sita · objective (quest-log line, imperative to the player)] *consistency-direction*: translator doubt (NE): 'go north, then east' → 'between north and east' (same pattern as NW in file 2)
  - before: अशोकवनिकायाम् उत्तरां दिशम्, ततः पूर्वां दिशं गच्छतु। तत्र मन्दिरस्य सोपानानि आरोहतु।
  - after: अशोकवनिकायाम् उत्तरस्याः पूर्वस्याः च दिशोः मध्ये मन्दिरम् अस्ति। तस्य सोपानानि आरोहतु।
- **#88** [ch5.trijata · Trijata] *tense-mood*: 'it has found her' → ktavatu प्राप्तवान् (agrees with आनन्दः m.)
  - before: {w:ananda} इति शब्दस्य अर्थः हर्षः। अन्ते आनन्दः तां प्राप्नोति इति अहं मन्ये।
  - after: {w:ananda} इति शब्दस्य अर्थः हर्षः। अन्ते आनन्दः तां प्राप्तवान् इति अहं मन्ये।
- **#97** [ch5.proclaim · narration] *level*: प्रतिपालयति → प्रतीक्षते
  - before: राक्षसाः सैनिकाः उद्यानं प्रति धावन्ति! हनुमान् मन्दिरस्य सोपानेषु तान् प्रतिपालयति।
  - after: राक्षसाः सैनिकाः उद्यानं प्रति धावन्ति! हनुमान् मन्दिरस्य सोपानेषु तान् प्रतीक्षते।
- **#101** [ch5.restore_jaya · narration] *consistency-shrine*: 'मन्दिरस्य आश्रमः' (the temple's hermitage) → the shrine is मन्दिरम्
  - before: मन्दिरस्य आश्रमः तव उपरि एव अस्ति। युद्धात् पूर्वं तत्र विश्राम्य।
  - after: मन्दिरं तव उपरि एव अस्ति। युद्धात् पूर्वं तत्र विश्राम्य।
- **#139** [ch6.vibhishana_refuge · person.sugriva] *prohibition*: मा + loṭ 'मा करोतु' → the spoken idiom 'विश्वासः मास्तु' (also removes the सखे + polite-verb clash)
  - before: सखे, तस्मिन् विश्वासं मा करोतु! सः शत्रोः भ्राता एव। सः रावणस्य दूतः भवेत्।
  - after: सखे, तस्मिन् विश्वासः मास्तु! सः शत्रोः भ्राता एव। सः रावणस्य दूतः भवेत्।
- **#171** [ch6.camp_keeper · Hermit] *consistency-shrine*: shrine → मन्दिरम् (अयम् → इदम्)
  - before: यदा लङ्का न आसीत्, तदा अपि अयम् आश्रमः सुवेले आसीत्। यदा इच्छसि, तदा अत्र विश्राम्य, श्लोकान् च पठ।
  - after: यदा लङ्का न आसीत्, तदा अपि इदं मन्दिरं सुवेले आसीत्। यदा इच्छसि, तदा अत्र विश्राम्य, श्लोकान् च पठ।
- **#175** [ch6.camp_sugriva · person.sugriva] *consistency-shrine*: shrine → मन्दिरे
  - before: मित्र, प्रथमम् आश्रमे विश्राम्यतु। अग्रे युद्धं दीर्घं भविष्यति।
  - after: मित्र, प्रथमं मन्दिरे विश्राम्यतु। अग्रे युद्धं दीर्घं भविष्यति।
- **#180** [ch6.battle_locked · Vanara sentry] *level*: प्रतिपालयतु → प्रतीक्षताम् (loṭ 3sg ātm.)
  - before: अङ्गदस्य वचनं प्रतिपालयतु। सः रामस्य दूतः भूत्वा रावणस्य प्रासादं गतवान्।
  - after: अङ्गदस्य वचनं प्रतीक्षताम्। सः रामस्य दूतः भूत्वा रावणस्य प्रासादं गतवान्।
- **#188** [ch6.dhumraksha · narration] *meaning*: 'fiercest' ≠ दुष्टः 'wicked'; बलवान् 'mighty' (क्रूर/उग्र/घोर not in the packs)
  - before: धूम्राक्षः रावणस्य एकः दुष्टः वीरः। तस्य नेत्रे धूमः इव स्तः। सः महत्या गदया मार्गे तिष्ठति।
  - after: धूम्राक्षः रावणस्य एकः बलवान् वीरः। तस्य नेत्रे धूमः इव स्तः। सः महत्या गदया मार्गे तिष्ठति।
- **#204** [ch6.indrajit · narration] *level*: प्रतिपालयति → प्रतीक्षते
  - before: लङ्कायाः द्वारस्य पुरतः एकः लघुः मुनिः तिष्ठति। सः तेजसा प्रकाशते। सः त्वां प्रतिपालयति इव।
  - after: लङ्कायाः द्वारस्य पुरतः एकः लघुः मुनिः तिष्ठति। सः तेजसा प्रकाशते। सः त्वां प्रतीक्षते इव।
- **#214** [ch6.agastya · choice prompt] *register*: choice prompt 'किम् … पठिष्यति?' (will he recite?) → polite loṭ + वा, like the other prompts
  - before: किम् अधुना अगस्त्येन सह श्लोकान् पठिष्यति?
  - after: अधुना अगस्त्येन सह श्लोकान् पठतु वा?
- **#219** [ch6.agastya · narration] *register*: translator doubt: Agastya says त्वम् to Rāma (#208), so polite 'जयतु' clashed; also वद् + acc. → dative रामाय; blessing as file 2 #131
  - before: अगस्त्यः रामम् 'जयतु' इति वदति। यथा शान्तं सः आगतवान्, तथा एव शान्तं गच्छति।
  - after: अगस्त्यः रामाय 'शुभं भवतु' इति वदति। यथा शान्तं सः आगतवान्, तथा एव शान्तं गच्छति।
- **#221** [ch6.agastya · person.agastya] *gender*: Agastya addresses the player ('child') → {g:वत्स|वत्से}
  - before: प्रायः सम्यक्। वत्स, मनः शान्तं कुरु। यदा इच्छसि, तदा पुनः मया सह पठ।
  - after: प्रायः सम्यक्। {g:वत्स|वत्से}, मनः शान्तं कुरु। यदा इच्छसि, तदा पुनः मया सह पठ।
- **#239** [ch6.coronation · person.vasishtha] *gender*: Vasiṣṭha addresses the player → {g:वत्स|वत्से}; प्रतिपालयति → प्रतीक्षते
  - before: रामः राजा अभवत्। वत्स, गृहं गच्छ। तव गुरुः त्वां प्रतिपालयति।
  - after: रामः राजा अभवत्। {g:वत्स|वत्से}, गृहं गच्छ। तव गुरुः त्वां प्रतीक्षते।
- **#248** [ch6.rama_court · person.rama] *gender*: translator doubt: Rāma addresses the player → {g:वत्स|वत्से}
  - before: वत्स, सर्वस्मिन् मार्गे त्वम् अस्माभिः सह आसीः। धन्यवादः।
  - after: {g:वत्स|वत्से}, सर्वस्मिन् मार्गे त्वम् अस्माभिः सह आसीः। धन्यवादः।
- **#249** [ch6.sita_court · person.sita] *gender*: Sītā addresses the player ('child') → {g:वत्स|वत्से}
  - before: वत्स, तव गुरवे अस्माकं कथां कथय। सत्यं कथय।
  - after: {g:वत्स|वत्से}, तव गुरवे अस्माकं कथां कथय। सत्यं कथय।
- **#256** [ch6.citizen_2 · Citizen] *meaning*: translator doubt: bare 'दृष्टं वा?' (seen?) is unclear to a learner → 'किं त्वया दृष्टम्?' (did you see it?), still gender-neutral
  - before: विमानम् आकाशात् अवतीर्णम्! दृष्टं वा? तत् सूर्यः इव प्रकाशते!
  - after: विमानम् आकाशात् अवतीर्णम्! किं त्वया दृष्टम्? तत् सूर्यः इव प्रकाशते!
- **#263** [ch6.epilogue_valmiki · person.valmiki] *gender*: Vālmīki addresses the player, English 'my student' → मम {g:शिष्य|शिष्ये} (gendered vocative)
  - before: धन्यवादः, वत्स। त्वया एव जनाः एतां कथां सर्वदा कथयिष्यन्ति।
  - after: धन्यवादः, मम {g:शिष्य|शिष्ये}। त्वया एव जनाः एतां कथां सर्वदा कथयिष्यन्ति।
