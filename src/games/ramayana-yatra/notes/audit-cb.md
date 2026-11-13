# audit-cb: Sanskrit audit of sa-dialogue-4.json, sa-battle.json, sa-grammar.json (brief v0.4.2)

Auditor: au-cb (model). Date: 2026-11-12. I edited only these three files, and only their Sanskrit (`en`, `ctx` and `label` are unchanged). I added no models. I checked every new word with `sa-ui/words.ts` or `sa-oracle/check.ts --word` before using it.

## Counts

| | strings checked | fixed (accuracy / meaning) | consistency | simplified (ease) | flagged for a human |
|---|---|---|---|---|---|
| `content/sa-dialogue-4.json` | 159 | 2 | 1 | 1 | 3 |
| `content/sa-battle.json` | 60 templates + 145 slot forms + 2 stats + the number tables | 12 (2 templates, 10 move forms) | — | — | 6 |
| `content/sa-grammar.json` | 156 (91 grammar labels, 34 terms, 19 notes, 9 pos, 3 gender) | 0 | — | — | 1 |
| **total** | **375 strings + 145 forms** | **14** | **1** | **1** | **10** |

**Tests**, after the last edit: `sambhashana`, `sa-ui`, `katha-content`, `grammar-sa` and `sa-battle` pass 48/48. As an extra check, `content.test` and `learning.test` pass 37/37. The oracle check of file 4 shows 159/159 entries with 0 problems.

## Changes

| file · key / English | before → after | why |
|---|---|---|
| d4 · DEFAULT_OBJECTIVE "Explore the hermitage and talk to everyone you meet." | …। यान् जनान् पश्यति, तैः सर्वैः सह वदतु। → …। **सर्वैः जनैः सह वदतु।** | **Ease.** This is the first objective of the game. The relative clause (यान् … तैः) is replaced by four L1–L2 words, and the meaning is the same. It now matches the Book 2–6 objectives (अत्र जनैः सह वदतु). |
| d4 · move maya_jala "A net of illusion; may lower defence." | शत्रुः मायया **बध्नाति**। कदाचित् धैर्यं न्यूनं भवति। → शत्रुः मायया **प्रहरति**। कदाचित् **वीरस्य** धैर्यं न्यूनं भवति। | **Meaning.** In this game बन्ध् means "stun": the battle beats बद्धः / बद्धा and naga_pasha's blurb use it that way. maya_jala does damage (power 55) and may lower the *hero's* defence, but it never binds. The old line also left open whose defence falls. Now it follows the enemy-attack pattern (शत्रुः शूलेन प्रहरति). जाल ("net") is not in the packs. |
| d4 · origin dharma_vigraha "Restore the verse of Rama as dharma embodied" | **रामस्य श्लोकं** पूर्णं कुरु, “रामः विग्रहवान् धर्मः” इति। → **“रामः विग्रहवान् धर्मः” इति श्लोकं** पूर्णं कुरु। | **Meaning.** In the other origins the genitive names the speaker of the verse (सुमित्रायाः, हनुमतः, अगस्त्यस्य …). So रामस्य श्लोकः reads as "Rāma's verse", but Mārīca speaks it (Araṇya 37). The verse is now named by its words. kc-rev made the same point for तस्य in file 5. |
| d4 · origin shuddha_vak "Restore the verse praising flawless speech" | **शुद्धायाः वाचः** श्लोकं पूर्णं कुरु। → **शुद्धस्य वचनस्य** श्लोकं पूर्णं कुरु। | **Consistency** (orchestrator / au-d2; rev-c item 8). It is the same verse that file 2 calls शुद्धस्य वचनस्य श्लोकः in four places (ch4 objectives, shrine keeper, Hanumān). The ch4 summary and the hanuman_duel blurb keep शुद्धया वाचा, because they describe Hanumān's speech, not the verse's name (file 3 also uses शुद्धया वाचा). |
| battle · `noRevive` "No one needs reviving." | सर्वे वीराः स्वस्थाः एव सन्ति। → **कः अपि वीरः श्रान्तः न अस्ति।** | **Accuracy.** The beat fires whenever no hero is down, including when heroes are hurt (logic-battle.ts:790). In that case "all heroes are well" contradicts the HP bars. The new line says exactly what the English says. श्रान्त is the game's word for a downed hero (allyDown, allDown, oshadhi blurb "श्रान्तः वीरः पुनः उत्तिष्ठति"). |
| battle · `refreshed` "The heroes are refreshed." | सर्वे वीराः पुनः स्वस्थाः भवन्ति। → **वीराणां बलं वर्धते।** | **Accuracy.** This is a partial party heal (35 / 30 / 50 %) that skips downed heroes. "All heroes become well again" overclaims. The new wording is the one the move blurbs use (सर्वेषां वीराणां बलं वर्धते — …). `allRestored` (sanjīvanī, a full revive) keeps सर्वे वीराः पुनः स्वस्थाः भवन्ति. |
| battle · forms.move **dharma_vigraha** | धर्मम् / धर्मेण → **“धर्मः” इति मन्त्रम् / मन्त्रेण** | **Meaning** (orchestrator / au-ui). "रामः धर्मम् अपि जानाति / धर्मं प्रयुङ्क्ते" reads as "Rāma also knows dharma / employs dharma". This was kc-rev's note too. |
| battle · forms.move **jaya_ghosha** | जयम् / जयेन → **“जय” इति मन्त्रम् / मन्त्रेण** | Same reason ("knows victory"). The quoted word is the cry itself, जय! (loṭ 2sg of जि, L2), because the noun जयः does not verify. |
| battle · forms.move **agni_bana** | अग्निम् / अग्निना → **अग्नेः बाणम् / अग्नेः बाणेन** | "लक्ष्मणः अग्निम् अपि जानाति" reads as "Lakṣmaṇa also knows fire". The new form matches the blurb (अग्नेः बाणः) and the English ("A fire arrow"). It is a weapon, so it is not quoted. |
| battle · forms.move **abhaya, anirveda, shuddha_vak, suprabhata, shoka_shloka** | अभयम्, अनिर्वेदम्, व्याकरणम्, सुप्रभातम्, श्लोकम् (and the -एन forms) → **“अभयम्” / “अनिर्वेदः” / “व्याकरणम्” / “सुप्रभातम्” / “श्लोकः” इति मन्त्रम् / मन्त्रेण** | These moves are announced with "…अपि जानाति!" (the battle `learned` beat and the sa-ui-b `recital.newMove*` toasts). The bare nouns read as "the student also knows grammar / good-morning / the verse", and "Hanumān knows perseverance". Quoting the menu name (names.json) marks it as a move name, as “विद्धि” इति मन्त्रम् already did. This also fixes kathaRecite's "श्लोकस्य पादं पठित्वा श्लोकं प्रयुङ्क्ते" (kc-rev item 10): it now reads "…पठित्वा “श्लोकः” इति मन्त्रम् प्रयुङ्क्ते". |
| battle · forms.move **pada_bana, lipi_raksha** | वाचम् / वाचा, रक्षाम् / रक्षया → **“वाक्” / “रक्षा” इति मन्त्रम् / मन्त्रेण** | These are the player's plain moves, which a Kathā astra replaces. sa-ui-b `recital.newMoveSwap` then says "{$old} त्यक्त्वा": वाचं त्यक्त्वा means "giving up speech" (falling silent), and रक्षां त्यक्त्वा means "giving up protection". Quoting them also keeps all five student moves in one pattern ("the student reciter … mantras"). |

The move-form `gender` of the 9 quoted moves is now `m` (head noun मन्त्रः, as for viddhi). The field is used only for validation.

### Move forms: what I decided for every move (orchestrator request)
- **Quoted as “X” इति मन्त्रम्** (abstract names that read as plain nouns in "knows / uses / gives up"): pada_bana, lipi_raksha, shoka_shloka, suprabhata, shuddha_vak, dharma_vigraha, abhaya, jaya_ghosha (“जय”), anirveda, plus viddhi (already quoted).
- **Kept as bare nouns** (a weapon or object the hero wields, so "uses / knows the X" is natural): bana, khadga, gada, shaila, vriksha. The enemy ones are nakha, shula, parigha, chandrahasa and naga_pasha.
- **Kept as named astras / hymn** (already full names): agneyastra / varunastra / vayavyastra (… अस्त्रम्), brahmastra, aditya_hrdaya.
- **Descriptive form:** agni_bana → अग्नेः बाणम्.
- **Kept bare, only ever in "uses" / "counters"** (starting moves of allies that are never announced or replaced, and enemy moves): vayu_vega वेगम्, prajna प्रज्ञाम्, mantrana मन्त्रणम्, jala_dhara जलम्, maya_jala मायाम्, garjana गर्जनम्, andhakara अन्धकारम्, agni_varsha अग्निम्, tarka तर्कम्, prashna प्रश्नम्. "मारीचः मायां प्रयुङ्क्ते" and "भरद्वाजः तर्केण प्रतिवदति" are natural. Quoting them would only make the lines longer.
- **No full compound name verifies**: धर्मविग्रह, जयघोष, अग्निबाण, वायुवेग, जलधारा, मायाजाल, अग्निवृष्टि, शोकश्लोक, पदबाण, लिपिरक्षा and शुद्धवाक् all fail the oracle. I added no models.
- **File-4 names vs the menu:** no file-4 line gives a move a *different* name. The blurbs that open with a gloss (आग्नेय → "अग्नेः अस्त्रम्", आदित्यहृदय → "सूर्यस्य श्लोकाः", सुप्रभात → "शुभं प्रभातम्", परिघ → "कठिनः महान् दण्डः") are shown directly under the menu name (view-battle.tsx:480, view-menu.tsx:453). They explain the name, so I kept them. The shuddha_vak blurb opens with व्याकरणम्, which matches the menu.

## Checked and kept
- **sa-battle, all 60 templates** read correctly for every hero and foe in their DOMAIN:
  - player {g:} merging, the feminine foes (एका, जिता, बद्धा, सा, श्रान्ता), the plural group (वीराणां तेजः / धैर्यं वर्धते, इतः अधिकं न वर्धते);
  - neuter numbers in apposition (एकम्, द्वे, त्रीणि … शतम् त्रयोविंशतिः च).
- **The Kathā sequence reads well**, for example:
  - "X श्लोकस्य पादं पठित्वा M प्रयुङ्क्ते!" → [महत् फलम्! किन्तु | ∅] पाठः न पूर्णः, अतः फलं शते पञ्चाशत् एव। → "Y-gen बलं न्यूनं भवति — n।";
  - in a duel: "X श्लोकेन प्रतिवदति!" → … "विश्वासः न्यूनः भवति — n।".
- **`statMin` इतः अधिकं न्यूनं न भवति:** the "इतः अधिकम्" (any further) chunk parallels statMax and is grammatical, so I kept it.
- **sa-grammar:** every label agrees with its English and with the verse form, including:
  - शक्यम् → यत् (3.1.99), कर्तव्यम् → तव्यत्, महत्तरम् → तरप्;
  - याचते (dat. of याचत्) → शतृ, प्रपन्नाय → क्त कर्तरि (3.4.72);
  - क्रियताम् → लोट् कर्मणि, अगमः / अवधीः → लुङ्, परिपप्रच्छ → लिट्.

  The term system (vibhakti / vacana / liṅga / puruṣa / lakāra names, कृत् suffix names, सम्बोधनम्, अव्ययम्) is the standard classroom set and is consistent throughout.
- **File 4:** the chapter-summary facts, the agreement checks and the rev-c human list items (Danu → कबन्धः, Gaja, priest, iron club, level-8 wording …) are not repeated here.

## For the human teacher
1. **battle `weary`** "X श्रान्तः अस्ति, अतः मन्त्रः दुर्बलः।" leaves out "with no PP left". In the same battle, श्रान्त is also the word for a *downed* hero (allyDown). An option that verifies: "{x.gen} मन्त्राणाम् उत्साहः न अस्ति, अतः मन्त्रः दुर्बलः।" (two words longer). Plain "रामस्य उत्साहः न अस्ति" would read "Rāma has no zeal", so I avoided it. I kept the current line because the menu shows उत्साहः ० right before this beat.
2. **battle `crit`** "अहो, अतीव तीक्ष्णम्!": the file-4 blurbs use तीक्ष्णम् to mean "strong against", so a critical hit can read as an effectiveness note. प्रहार and आघात do not verify (this was already flagged in notes/sa-battle.md).
3. **battle `comeBack`** "{x.voc}, पुनः आगच्छतु!": in Sambhāṣaṇa, पुनः आगच्छतु is the farewell "come again". प्रत्यागच्छतु (L2, verifies) means "come back" without that reading. I kept the current line because the switch context makes the meaning clear.
4. **Quoted move names** (the change above) make "uses" lines two words longer: रामः “धर्मः” इति मन्त्रम् प्रयुङ्क्ते. Please confirm the trade-off, and the choice of the cry “जय” (not जयः) for jaya_ghosha. The sa-ui-b swap toast now reads "“वाक्” इति मन्त्रं त्यक्त्वा तं मन्त्रं प्रयुङ्क्ते", which is correct but says मन्त्रम् twice. sa-ui-b's owner may prefer "… त्यक्त्वा तं प्रयुङ्क्ते".
5. **battle `refreshed` (new)** "वीराणां बलं वर्धते।": in the composite beat it is followed by "X-gen बलं वर्धते — n।". The two sentences are similar, but they mirror the English ("The heroes are refreshed. X recovers n.").
6. **kathaRecite** keeps श्लोकस्य पादं. On its own, पाद is glossed "foot" by the oracle, but the Kathā UI labels lines पादः १ …. "{x.nom} पादं पठित्वा {m.acc} प्रयुङ्क्ते!" would be shorter, if you prefer it.
7. **d4 tarka** "तीक्ष्णः वादः।": in the battle, वादः is the debate itself (वादे वयं जितवन्तः). तीक्ष्णः तर्कः would match the menu name, but तर्कः (nom.) does not verify (only तर्कम् / तर्केण do). A names.json gender for move.tarka would allow it.
8. **d4 maya_jala**: the "net" image is lost (जाल is not in the packs).
9. **d4 origin dharma_vigraha (new)**: the quote is the verse's words in padaccheda (रामः विग्रहवान् धर्मः), not the saṃhitā text (रामो विग्रहवान्धर्मः). This is the house rule. Please confirm it is fine inside quotation marks.
10. **sa-grammar pos: noun = नाम, name = संज्ञा.** A Level-3 reader knows नाम as "name" (मम नाम …), and Hindi-medium learners know संज्ञा as "noun", so the pair can be read the wrong way round on the word card ("धर्म · नाम", "राम · संज्ञा"). See the proposal below. I did not change it, because it is a term-system decision.

## Glossary / term proposals (for the orchestrator)
- **Move names inside sentences:** a move whose Sanskrit name is an abstract noun appears in sentences as "“X” इति मन्त्रम् / मन्त्रेण" (sa-battle `forms.move`). Weapons, astras and hymns stay bare nouns. Every view or toast that uses `uiMoveSlot` / `{m.acc}` gets this automatically. notes/sa-battle.md ("uses" and "Coverage") should mention it. That file is the owner's, so I did not edit it.
- **श्रान्त means a downed hero (0 HP) only.** Use something else for 0 PP (see item 1).
- **pos.noun**: consider **नामपदम्** (the school term for "noun word"; it needs a model with an MW/Apte source, since नामपदम् does not verify today), keeping संज्ञा for proper names. Alternatively, keep नाम and add a note for the teacher.
