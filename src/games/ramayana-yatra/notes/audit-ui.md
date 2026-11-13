# audit-ui: Sanskrit audit of the interface strings (v0.4.2)

Auditor: au-ui (model; did not write these strings). Brief: `scratch/audit/BRIEF.md`. Files: `content/sa-ui-common.json`
(20), `sa-ui-a.json` (110), `sa-ui-b.json` (108), `sa-ui-katha.json` (27). Each `sa` was read against its `en`, its `ctx`
and, for every slotted key, the code that fills the slot (`grep` of the views and logic: `uiItemSlot` → accusative,
`uiAllySlot(…,'gen'|'nom')`, `uiMoveSlot` → accusative, numbers → Devanagari digits, `{f:}` / `{w:}` with इति).
Every new word was checked with `scratch/sa-ui/words.ts`. No new `models`. Only `sa` fields changed. Nothing is marked
human-reviewed.

## Counts

| strings checked | fixed (accuracy / meaning) | simplified / made consistent (ease) | flagged for a human |
|---|---|---|---|
| 265 | 3 | 3 | 13 |

Tests: `sambhashana`, `sa-ui`, `katha-content`, `grammar-sa`, `sa-battle` pass 48/48 after the edits.

## Changes

| key (English, short) | before → after | why |
|---|---|---|
| `katha.help1` "The verse recites itself. Tap it to go faster." | श्लोकं पठ। शीघ्रं पठितुं श्लोकं स्पृश। → **श्लोकः स्वयं वदति।** शीघ्रं पठितुं **तं** स्पृश। | **Meaning.** The old line told the player to recite the verse ("श्लोकं पठ"). The help exists to say the opposite: the line runs by itself, and a tap only speeds it up. स्वयं वदति matches `katha.autoReciteSub` (श्लोकाः स्वयं वदन्ति). The oracle has no passive, so पठ्यते is not available. तं replaces the repeated श्लोकं. |
| `katha.help2` "One word is missing: pick it with one tap." | एकं पदं रिक्तम्। तत् पदं चिनु। → एकं **स्थानं** रिक्तम्। **उचितं** पदं चिनु। | **Accuracy.** "पदं रिक्तम्" says "the word is empty". It is the place that is empty. This is the same fix fx-rev made to the tutorial lines (sa-dialogue-5: रिक्तं स्थानम् … उचितं पदं चिनु), and it matches `learn.puranaPrompt` (रिक्ते स्थाने). The length is unchanged. |
| `katha.noteAbhyasa` "every move asks a question, and wild foes wait in the grass" | सर्वदा प्रश्नाः। वने युद्धानि। → **युद्धे** सर्वदा प्रश्नाः। **तृणे शत्रवः प्रतीक्षन्ते।** | **Meaning.** The note must show what makes Practice different from Story. "वने युद्धानि" (battles in the forest) is true of Kathā too, so the real difference (foes lying in wait in the grass, i.e. random encounters) was lost. "सर्वदा प्रश्नाः" had no place, and questions come only in battle. The new text uses the tutorial's own picture (तृणे निशाचराः …) with the plainer शत्रवः (L2). प्रतीक्षन्ते is L2 and was already used in sa-dialogue-1. |
| `hud.explore` "Explore" (objective line) | परितः पश्यतु → **सर्वत्र गच्छतु** | **Ease and consistency.** This is the same English verb as `DEFAULT_OBJECTIVE` ("Explore the hermitage …" → आश्रमे **सर्वत्र गच्छतु**), which the player sees in the same slot at the start of the game. A Level-3 learner meets परितः as a postposition taking the accusative (ग्रामं परितः), so on its own it leaves "around what?" open. Both words are L1. The polite 3rd person stays, as in every objective. |
| `title.howto4` "…unlock new astras." | नूतनान् मन्त्रान् लभस्व → **नूतनानि अस्त्राणि** लभस्व | **Same word for the same thing.** The line just above it (`title.howto3`, added in v0.4.1) calls astras अस्त्राणि, and so does `katha.noteKatha`. Read together, मन्त्रान् here suggested something different. Move = मन्त्रः and astra = अस्त्रम् (see the proposal below; the tutorial now uses the same split: "एकं मन्त्रं चिनु। यदि अस्त्रं चिनोषि …"). |
| `katha.hurry` "Recite faster" (tooltip / aria of the reciting line) | शीघ्रं वद → शीघ्रं **पठ** | **Consistency.** The player's "recite" is पठ everywhere else: `battle.recite`, `shrine.recite`, `title.howto3`, the help line's शीघ्रं पठितुं, and sa-battle's पठित्वा. वद is kept only where the verse speaks by itself. |

## Questions asked by the orchestrator

- **"परितः पश्यतु" for Explore.** It is grammatical: adverbial परितः, polite loṭ 3sg, the house register for objectives. I changed it anyway, for ease and consistency (see the table).
- **"श्लोकाः स्वयं वदन्ति" for automatic recitation.** Kept. It is correct and clear at a glance: "the verses speak by themselves; you never choose a word". वद् is the natural verb when the verse is the subject. पठन्ति would mean "the verses read", and the passive पठ्यन्ते is not in the oracle. "स्वयं पूर्णाः भवन्ति" (fx-rev's idea) would clash with पूर्णः = "restored", the glossary term for a verse made whole at the shrine. help1 now uses the same wording, so the two lines agree.
- **Journey picker कथा / अभ्यासः.** Self-explanatory: both are L1/L2 words, and each comes with a one-line note. The Story note (कथां पठ। श्लोकः एव अस्त्रम्।) is good. The Practice note was too thin to tell the two apart, so it was fixed (see the table).
- **Slot cases.** Every slot was checked against the code that fills it. The cases match in every template:
  - nominative: `battle.whatWillDo`, `recital.newMove*`, `toast.astraArmed`;
  - accusative: `{$move}`, `{$old}`, `{$item}` in `items.useOn` and the `toast.*` item lines;
  - genitive: `{$who}` in `toast.exhausted`, `fullStrength`, `notExhausted`, `ppFull`;
  - इति + `{f:}` / `{w:}`: the learn.* lines;
  - numbers.

  The default player name works in every slot: शिष्यः for the nominative, शिष्यस्य for the genitive, and the शिष्य vocative in `end.thanks`. One cross-file meaning problem shows up only when the slots are filled (item 11 below).

## For a human teacher

1. `hud.explore` / all objectives: polite loṭ 3sg with no भवान् (सर्वत्र गच्छतु), while buttons and hints use the 2nd singular. This is the house convention (REVIEW.md). Confirm it reads naturally in an objective line.
2. `katha.autoRecite` "स्वयं पाठः": स्वयम् could be read as "by yourself", the opposite of "automatic". The sub-line (श्लोकाः स्वयं वदन्ति…) makes it clear, and it always sits beside the toggle. The compound स्वयंपाठः does not verify.
3. `katha.help1` "श्लोकः स्वयं वदति। शीघ्रं पठितुं तं स्पृश।": the verse speaks, yet the player "recites faster". An alternative that keeps one subject: "तं स्पृश, तदा सः शीघ्रं वदति" (all words verify, but it is longer).
4. `katha.autoReciteSub` (kept) and help1: वदति for a verse that "recites itself" is a personification. It was already listed in REVIEW.md.
5. `katha.tabPada` पदच्छेदः, `tabAnvaya` अन्वयः, `tabSarala` सरलार्थः (models): these are school-edition terms. Does a Level-3 student know them, or should the tabs get a gloss in sa-only mode?
6. `title.howto3` कथायाम् / अभ्यासे as names of the two journeys, beside howto2's कथायाम् "in the story" (fx-rev item, still open).
7. `katha.noteAbhyasa` (new): युद्धे सर्वदा प्रश्नाः is a verbless nominal sentence. The more literal मन्त्रे मन्त्रे प्रश्नः ("a question at every move") also verifies.
8. `settings.soundOff` "अधुना गीतं न भवति" drops "in your Samskuru settings". settings.note (अन्याः इच्छाः अन्यत्र सन्ति) just below covers it. Acceptable?
9. `settings.on/off` = आम् / न on toggle buttons (also the auto-recitation toggle).
10. `title.playH` / `title.restored` / `katha.bookProgress`: plural labels before a count that may be 1 (होराः १). This was flagged earlier and is still open.
11. **Filled toasts with concept-named moves** (`recital.newMove`, `newMoveSwap`, `toast.astraArmed`): the template is grammatical, but sa-battle `forms.move.acc` gives धर्मम्, जयम्, अनिर्वेदम्, सुप्रभातम्, so the toast reads "अधुना रामः **धर्मम् अपि जानाति**!" ("now Rāma knows dharma too!") and "… बाणं त्यक्त्वा **जयम्** प्रयुङ्क्ते". viddhi already uses the clear pattern “विद्धि” इति मन्त्रम्. The fix belongs to sa-battle.json (see the proposals below), not to the templates. With `इति` the quoted name should be in its citation form, so the templates cannot work around it.
12. `learn.lipiPrompt` "अयम् एव शब्दः कः?" (terse; flagged by sa-rev-b, still open).
13. `toast.aHero` "एकः वीरः" (एक as an indefinite article; flagged by sa-rev-b, still open).

## Code-level items (not edited; still open from earlier reviews)

- `lang.withEn` is filled with the literal 'English' (view-common.tsx:274), so the Sanskrit aria label is "संस्कृतम् English च".
- `toast.receivedN` / `boughtN`: the item stays in the accusative singular with ×N (फलम् ×३). An `accPl` in sa-battle `forms.item` would fix it (sa-rev-b note 1).

## Glossary proposals for the orchestrator (notes/sa-ui.md)

- **move = मन्त्रः; astra (verse-bound move) = अस्त्रम्.** This is already the practice in howto3, katha.noteKatha and the updated tutorial (sa-dialogue-1/5: "एकं मन्त्रं चिनु। यदि अस्त्रं चिनोषि …"). howto4 now follows it.
- **The player recites = पठ्** (पठ, पठितुं, पठित्वा). **A verse that recites itself = स्वयं वदति** (the oracle has no passive).
- **A gap = रिक्तं स्थानम्; the right word = उचितं पदम्.** Never पदं रिक्तम्.
- **Explore (objective) = सर्वत्र गच्छतु**, as in DEFAULT_OBJECTIVE. Look around = सर्वत्र पश्यतु (book-start objectives).
- sa-battle owner: for moves named after a concept, use the viddhi pattern in `forms.move.acc`/`ins` (“धर्मः” इति मन्त्रम्, which verifies; “जयः” does not verify in the oracle today, so check each name) so that the unlock and swap toasts and kathaRecite do not say "knows dharma" or "employs victory". kc-rev already raised this for kathaRecite.
