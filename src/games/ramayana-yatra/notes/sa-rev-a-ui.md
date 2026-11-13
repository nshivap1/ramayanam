# sa-rev-a-ui: independent review of content/sa-ui-a.json (interface strings, area a)

Reviewer: sa-rev-a (did not write these strings). Scope: all 110 entries of `content/sa-ui-a.json` plus its model काण्ड,
judged **filled and in place** (slot values from Game.tsx / view-*.tsx, screenshots in `scratch/ui-a/shots/sa-*`).
Every new word was checked with `scratch/sa-ui/words.ts`. `sa-ui.test.ts`: 4/4 pass. `tools/test.mjs unit games/ramayana-yatra/`: 134/134 pass.
Nothing is marked human-reviewed.

## Changes (9 lines; `en` and keys untouched)

| key | before → after | reason |
|---|---|---|
| title.tagline | अत्र श्लोकाः **मन्त्राणां** बलं ददति। → अत्र श्लोकाः **मन्त्रेभ्यः** बलं ददति। | Grammar: the recipient of दा takes the dative ("verses give power **to** the moves"). Also, in sa-battle "मन्त्राणां बलम्" means PP, so the old wording could be misread. |
| title.howto4 | …पूर्णान् कुरु च। → …पूर्णान् कुरु च। **ततः नूतनान् मन्त्रान् लभस्व।** | Meaning: the English "unlock new astras" had been dropped, and it is the main reward of the shrine. Moves are मन्त्राः, as in the glossary and the tagline. |
| newGame.intro | मायया श्लोकाः **नष्टाः**। → मायया श्लोकाः **विक्षिप्ताः**। | Meaning: the English says "scattered". नष्ट means destroyed, which makes no sense next to "restore it". This also matches the story's wording (sa-dialogue-1: आशीः … विक्षिप्ता). |
| newGame.notReady | यात्रा अधुना न **आरभते**। … → यात्रा **अद्य अपि न आरब्धा**। … | Grammar: आरभते is transitive ("undertakes"), so "the journey begins" with यात्रा as subject is not standard. The kta passive (आ+रभ्, fem.) says "has not begun yet". |
| hud.explore | परितः **पश्य** → परितः **पश्यतु** | Consistency within the screen: this text appears in the objective slot, where every story objective uses the polite form (DEFAULT_OBJECTIVE: …गच्छतु … वदतु). Buttons and key hints on the same screen stay 2nd singular. |
| hud.error | **किम् अपि न** सम्यक् अभवत्। … → **कार्यं** सम्यक् न अभवत्। … | Meaning: किम् अपि + न means "nothing" (as in toast.chest), so the old line read "nothing went right". The new line says "the action did not go right". |
| end.thanks | त्वया पूर्णाः श्लोकाः … → त्वया पूर्णाः **कृताः** श्लोकाः … | Grammar and clarity: "verses made whole by you". The agent in त्वया needs a participle. Bare त्वया पूर्णाः reads oddly. The new line uses the game's पूर्णं कुरु idiom. |
| end.finish | अन्तं गच्छ → **यात्रायाः** अन्तं गच्छ | Meaning: on its own, अन्तं गच्छ can be read as "come to an end / perish". Naming the journey makes it plain and matches end.title यात्रायाः अन्तः. (यात्रां पूर्णां कुरु is not possible because the oracle declines पूर्ण only as m./n.) |
| settings.relaxedSub | प्रश्नेषु समयः न → **यावत् इच्छसि, तावत् चिन्तय** | Meaning: "no time in questions" could be read as "no time left", the opposite of Relaxed mode (no timer). The new line, "think as long as you like", is the same idea the story uses for this setting (sa-dialogue-1: यावत् इच्छसि, तावत् चिन्तयितुं शक्नोषि). |

## Judged and kept (the questions asked)

- **menu = स्यूतः (bag).** Kept. No verified word exists for menu or options: विकल्प, सूची-as-list (forbidden), व्यवस्था and विन्यास all fail. It is Level 1 and playful, and it fits the story's "eat some fruit from your bag" (स्यूतात्). A bag holding the Party and Settings tabs is a game convention. Human item.
- **settings = इच्छाः.** Kept. रुचि, व्यवस्था, विन्यास, नियम and विकल्प are all unverified. इच्छाः ("your wishes") is Level 1 and clear enough. settings.note "अन्याः इच्छाः अन्यत्र सन्ति।" plays on it. Human item.
- **XP = ज्ञानम्.** Kept. It matches sa-battle `xp` ("{x.gen} ज्ञानं वर्धते"), and अनुभव is unverified as a noun. Mastery uses ज्ञानस्य स्तरः on a different screen.
- **shrine = आश्रमस्य मन्दिरम्.** Kept. sa-dialogue-1 uses the same words ("एतत् आश्रमस्य मन्दिरम्") and मन्दिरम् throughout.
- **end session = अद्य अलम्.** Kept. "Enough for today" is idiomatic spoken Sanskrit. विश्राम्य is the correct loṭ 2sg of वि+श्रम् (śamādi lengthening). It is not the lyap विश्रम्य.
- **owned N = तव पार्श्वे N.** Kept. मम/तव पार्श्वे is the standard Sambhāṣaṇa way to say "I have / you have".
- **Book N = काण्डम् N.** Kept. Model काण्ड (n., phala-n) is right: the ण is in the stem, so the plural is काण्डानि with dental न, like फलानि. MW gives m./n., and the kāṇḍa names are neuter. chapter.done काण्डम् k पूर्णम् matches the story ("एवं बालकाण्डं पूर्णम्").
- Register: every screen of area a uses 2nd singular (buttons, how-to, intro, chapter note, menu). The only exception is the objective slot (above).

## Code-level problems (not edited)

1. **view-menu.tsx:338** `items.useOn` fills `{$item}` with `{n:nameId}`, which renders the bare stem (फल) inside a question. The Sanskrit works around this with "फल · कस्मै ददासि?". If the view passed the accusative from sa-battle `forms.item`, as the toasts do, the entry could read "{$item} कस्मै ददासि?" → "फलं कस्मै ददासि?".
2. **view-menu.tsx:45** The Words tab label comes from names.json `ui.words` = **पदानि**, but the glossary and `common.words` say **शब्दाः**, and sa-dialogue-1 calls it शब्दानां पुस्तकम्. In Sanskrit modes the tab should use `common.words`. (words.all सर्वाणि and words.unseen अदृष्टम् पदम् agree with the visible पदानि, so I left them.)
3. **view-common.tsx:263** `lang.withEn` is filled with the literal 'English', so the Sanskrit aria-label is "संस्कृतम् English च" (Latin inside Sanskrit). This is minor, because the visible segment also says English.

## Cross-file inconsistencies (report only)

- **sa-dialogue-1** uses **सूची** for the menu in 2 lines ("Press Menu (M)…" → सूच्यां…; "turn on Relaxed in the menu's Settings" → सूच्यां शान्तं मार्गं चिनु). The glossary forbids सूची, and the UI uses स्यूतः. The same file calls the party **मित्राणि**, while the UI uses वीराः.
- **sa-battle** `levelUp` uses **सोपानम्**, but `common.lv` is स्तरः. `ppFull` / `ppRecharged` use **मन्त्राणां बलम्**, but the glossary says PP = उत्साहः ("उत्साहः पुनः पूर्णः").
- **sa-ui-b** toasts mix forms of address. toast.received / bought / noneLeft use polite {g:भवान्|भवती}, while toast.battleOnly (प्रयुङ्क्ष्व) and toast.keepSafe (रक्ष) use 2nd singular, and areas a and common use त्वम्/तव. Also, battle.power "तेजः" is the same word as the attack stat (glossary: attack → तेजः).

## For a human teacher

1. स्यूतः for "Menu" and इच्छाः for "Settings": acceptable to a Samskrita Bharati teacher, or is there a standard term they would rather teach?
2. ज्ञानम् for hero XP, in a game where word mastery is also "knowledge".
3. यात्रा अद्य अपि न आरब्धा (newGame.notReady): or is intransitive आरभते acceptable in modern usage?
4. यात्रायाः अन्तं गच्छ for "Complete the journey" (L4 समाप्नुहि is the alternative).
5. Labels with plural nouns before small numbers (होराः १, पूर्णाः श्लोकाः १): acceptable label style?
6. end.credit1 "वाल्मीकेः कथा": रामायणम् is not in the oracle as a common noun. Should it be added as a model?
