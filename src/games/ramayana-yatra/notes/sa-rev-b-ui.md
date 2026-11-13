# sa-rev-b: review of the interface strings (sa-ui-b.json, sa-ui-common.json)

Independent second pass on the Sambhāṣaṇa interface strings of area b (battle menu, challenge prompts / feedback /
explanations, case-role labels and explanations, recital and logic toasts, verse / word cards) and the 20 shared
`common.*` terms. Every template was read **filled**, using the real slot values: the challenges were generated for
every verse and kind (logic-learning `makeChallenge`), and the toasts were filled with every item (sa-battle
`forms.item` + `toast.itemAcc*`) and every hero (`forms.ally`, genitive / nominative). The script is in
`/home/claude/scratch/sa-rev-b/ui/dump.ts`. Only `sa` fields were changed (no `en`, no keys, no code).

## Changes (14 lines in sa-ui-b.json; sa-ui-common.json unchanged)

| Key | Before | After | Reason |
|---|---|---|---|
| `learn.vibhaktiPrompt` | पादः {$n} — अस्य पदस्य का विभक्तिः? | पादः {$n} — अस्य पदस्य का विभक्तिः? अथवा इदं किं पदम्? | **Teaching accuracy.** The options include क्रियापदम्, अव्ययम्, विशेषणम्. An indeclinable has no विभक्ति, so "what is its case?" alone does not fit those answers. The English asks "which case **or role**". |
| `learn.vicchedaPrompt` | अस्मिन् पदे के शब्दाः सन्ति? | अस्मिन् सन्धौ के शब्दाः सन्ति? | **Teaching accuracy.** The stimulus is a sandhi-joined stretch of two or three padas (वाल्मीकिर्मुनिपुङ्गवम्, समुद्र इव, कर्तव्यं दैवमाह्निकम्), not one पदम्. Calling it "this pada" teaches a wrong idea of what a pada is. |
| `learn.vicchedaExpl` | अस्मिन् पदे {$parts} इति शब्दाः सन्ति। | अस्मिन् सन्धौ {$parts} इति शब्दाः सन्ति। | Same reason as `learn.vicchedaPrompt`, and it now matches the prompt. |
| `learn.puranaPrompt` | पादः {$n} — अत्र कः शब्दः अस्ति? | पादः {$n} — रिक्ते स्थाने कः शब्दः अस्ति? | "अत्र" (here) was vague. रिक्तं स्थानम् is the classroom term for a gap ("रिक्तस्थानं पूरयत"), and it is faithful to "fills the gap". |
| `challenge.untimed` | समयः बहु अस्ति · शनैः चिन्तय। | बहुः समयः अस्ति · शनैः चिन्तय। | **Agreement.** As an adjective, बहु must agree with समयः (m.): बहुः. Using बहु as an indeclinable predicate here is colloquial. |
| `recital.newMoveEquip` | … वीराणां पृष्ठे तं मन्त्रं चिनु। | … “वीराः” इति पृष्ठे तं मन्त्रं चिनु। | "वीराणां पृष्ठे" also reads "on the heroes' back" (पृष्ठम् = back / page). The new text names the menu tab (`menu.party` = वीराः), the way the English names "the Party menu". The quotes follow sa-battle's “विद्धि” इति style. |
| `toast.received` | {g:भवान्\|भवती} {$item} {g:प्राप्तवान्\|प्राप्तवती}। | त्वम् {$item} {g:प्राप्तवान्\|प्राप्तवती}। | **Register consistency.** Every other interface string speaks to the player in the 2nd person singular: ui-a has तव यात्रा, कस्मै ददासि, चिनु, and this file has रक्ष, देहि, चिनु, न शक्नोषि, प्रयतस्व. त्वम् is also gender-neutral (sambhashana.md). It is written त्वम्, not त्वं, because the slot can begin with a vowel (ओषधिम्, अङ्गुलीयकम्). |
| `toast.receivedN` | {g:भवान्\|भवती} {$item} ×{$n} {g:प्राप्तवान्\|प्राप्तवती}। | त्वम् {$item} ×{$n} {g:प्राप्तवान्\|प्राप्तवती}। | Same reason as `toast.received`. |
| `toast.bought` | {g:भवान्\|भवती} {$item} {g:क्रीतवान्\|क्रीतवती}। | त्वम् {$item} {g:क्रीतवान्\|क्रीतवती}। | Same reason as `toast.received`. |
| `toast.boughtN` | {g:भवान्\|भवती} {$item} ×{$n} {g:क्रीतवान्\|क्रीतवती}। | त्वम् {$item} ×{$n} {g:क्रीतवान्\|क्रीतवती}। | Same reason as `toast.received`. |
| `toast.noneLeft` | अधुना {g:भवान्\|भवती} {$item} न धारयति। | अधुना त्वम् {$item} न वहसि। | Same register fix. धारयसि is not in the oracle, so the verb is वहसि ("you carry", which takes the accusative slot). |
| `toast.battleOnly` | {$item} युद्धे एव प्रयुङ्क्ष्व। | {$item} युद्धे एव देहि। | प्रयुङ्क्ष्व (7th-class ātmanepada loṭ) is correct, but it is Level 4 and the only "use" verb of its kind in the game. The game's verb for using an item is देहि (`items.use`, `items.useOn` कस्मै ददासि). |
| `toast.itemAccRing` | अङ्गुलीयकम् | रामस्य अङ्गुलीयकम् | **Fidelity.** The English is "Rāma's ring" (the story item, not just any ring). |
| `toast.itemAccJewel` | चूडामणिम् | सीतायाः चूडामणिम् | **Fidelity.** The English is "Sītā's crest-jewel". |

Every changed line verifies with the oracle (sa-ui.test, learning.test and logic.test fill the templates with real
values).

## Checked and left as they are

- **Case-role labels:** प्रथमा … सप्तमी विभक्तिः, सम्बोधनम्, क्रियापदम्, अव्ययम्, विशेषणम्. These are the correct feminine ordinal forms agreeing with विभक्तिः, and the standard Samskrita Bharati terms.
- **Case explanations:** "{f} इति पदे X विभक्तिः अस्ति।" with the question words कः/का/किम् (1), कम्/काम्/किम् (2), केन/कया (3), कस्मै/कस्यै (4), कस्मात्/कस्याः (5), कस्य/कस्याः (6), कस्मिन्/कस्याम् (7). Every interrogative form is correct, and कस्याः rightly appears for both 5 and 6. They were checked against every role in the verses: नारदम्, सः, संध्या, लोके, धैर्येण, प्रपन्नाय, क्रौञ्चमिथुनात्, लोकस्य, निषाद/तात, प्रतिजाने, नु, गुणवान्, काममोहितम्. Each explanation names only the case, so it stays true for less typical uses (goal of motion, respect, comparison). That matches the English ROLE_EXPLAIN design.
- **Battle menu:** युध्यस्व, पठ, वीरम् आह्वय, वस्तूनि, निर्गच्छ. Matchup lines (महत् / अल्पम् / समानम् फलम्) agree with फलम् (n.).
- **Toast genitives:** रामस्य / हनुमतः / जाम्बवतः / {g:शिष्यस्य|शिष्यायाः} बलं …, उत्साहः पूर्णः एव अस्ति. These follow the glossary (बलम्, उत्साहः, पूर्णः).
- **Card labels:** अलम् + instrumental (अलम् अर्थेन, अलं पदैः, अलं सन्धिना) is the idiomatic "enough of / hide".
- **Recital toasts:** श्लोकः पूर्णः अभवत्!, चतुर्षु त्रीणि (७५%), पुनः प्रयतस्व!
- **Models:** रूप n. (mitra-n, ṇatva रूपेण/रूपाणि ✓), विभक्ति f. (mati-f ✓), सन्धि m. (muni-m, no ṇatva: सन्धिना ✓), चूडामणि m. (muni-m; the ण is in the stem and there is no r/ṣ trigger, so चूडामणिना ✓). Gender and MW headwords are correct. common's स्तर m. (rama-m, ṇatva स्तरेण ✓).
- **sa-ui-common (20):** all correct (आरभस्व ātmanepada loṭ ✓, श्रुतः agrees with श्लोकः ✓).

## Code-level notes (not edited)

1. **Plural gifts and purchases show a singular noun.** `toast.receivedN` / `toast.boughtN` get the item in the accusative **singular** even when qty > 1, so the output is "त्वम् फलम् ×३ क्रीतवान्।". The × is a UI symbol, so this is acceptable, but proper Sanskrit is फलानि / ओषधीः. To fix it: add `accPl` to `content/sa-battle.json` `forms.item` (फलानि, मूलानि, मधु, ओषधीः, मृतसञ्जीवनीः), give `uiItemSlot` (logic-learning.ts:52) a `qty` argument that picks `accPl` when qty > 1, and pass qty at logic-events.ts:91 (`boughtToast`) and logic-events.ts:260 (`give`). Both new templates could then drop the ×.
2. **Register split between the UI and battle narration.** The interface strings now use त्वम् throughout. The sa-battle templates address the player with भवान् (e.g. `appearDuel` "{g:भवता|भवत्या} सह"). This may be intended (narrator vs. interface), but a human should confirm it.
3. **Two wordings for "moves fully charged".** sa-battle `ppFull` / `ppRecharged` say "मन्त्राणां बलं …", while the sa-ui glossary and `toast.ppFull` say "उत्साहः पूर्णः". These are the same idea in two wordings. The sa-battle owner may want to align them.

## For a human teacher

- `battle.power` "तेजः {$n}": a move's power and the hero's attack stat are both तेजः (glossary: attack → तेजः). This is fine as a word, but a teacher may prefer a separate word for move power (e.g. शक्तिः, not verified here).
- `learn.lipiPrompt` "अयम् एव शब्दः कः?" ("which one is this same word?") is terse. No word for "spelling / script" verifies (लिपि, लेखन are not in the oracle).
- `learn.vicchedaPrompt/Expl` "अस्मिन् सन्धौ …": confirm the wording for three-word chains (कर्तव्यम् + दैवम् + आह्निकम्).
- `learn.explModifier` "कीदृशः? कीदृशम्?": कीदृशी is not in the oracle. A teacher may want the feminine too.
- `learn.explVerb` "किं करोति?" is generic. For state verbs or 1st-person forms (प्रतिजाने), "किं करोति? किं भवति?" might teach better.
- `toast.noneLeft` "अधुना त्वम् {$item} न वहसि।" ("you no longer carry X") stands for "you have none left". Check that this is natural.
- `card.verseMissing` and `learn.placeholderPrompt` ("… न लब्धः / लब्धाः", "not found yet") approximate "still being restored / gathered".
- `toast.aHero` "एकः वीरः" uses एकः as an indefinite article (the spoken-Sanskrit habit). A strict teacher might prefer कः अपि वीरः.
- `challenge.timeUp` "समयः गतः" was kept. "समयः समाप्तः" is the more usual classroom phrase, but समाप्त is Level 4 in the oracle.
