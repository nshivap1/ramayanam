# view-sa: the dialogue-language setting (Sambhāṣaṇa-Saṃskṛtam story text)

Owner: view-sa (files: `Game.tsx`, `view-*.tsx`, `input.ts`, `style.css`, `e2e.spec.ts`). The feature itself, the register and
the verification rules are in `notes/sambhashana.md`. Translations live in `content/sa-dialogue-{1,2,3}.json` (translators);
`content.ts → dialogueMap()` turns them into `GameContent.dialogueSa` (English → Sanskrit).

## What the player sees
- **Setting:** `DialogueLang` = `'en'` (default) · `'sa-en'` · `'sa'`. It is stored in `prefs-v1` (`ViewPrefs.dialogueLang`, the
  same small key as music / text speed / relaxed), never in `save-v1`. `readPrefs()` validates what is stored, so an unknown
  value falls back to `'en'`.
- **Where:** Menu → Settings ("Story text", first row) and the New-journey screen (under "Choose your look"). Both use
  `DialogueLangControl` (view-common): a 3-way segmented radio group with labels "English" · "संस्कृतम् + English" · "संस्कृतम्".
  The Sanskrit word is names.json `ui.samskritam`, rendered with `<SaText>`, so it follows the script setting. There are no
  Devanagari literals in the code. Each segment is ≥ 44 px. Tab reaches the group (roving tabindex), and the arrow keys move the
  choice (wrapping). Under it: "Simple spoken Sanskrit (Level 1–3). Tap ▶ as usual."
- **Lookup:** `storySa(content, lang, en)` returns `content.dialogueSa[en]` (exact key) or null. Null (English mode, or not
  translated yet) means the English shows, silently. It is applied to:
  - say lines (dialogue box, and the dimmed echo during wait / move / fade). Signs are say lines (`core.sign` script), so they
    are covered too.
  - choice prompts and every option label.
  - the objective line (explore panel).
  - battle beats. `logic-battle.ts` puts `spec.intro` / `EnemyDef.intro` (`introText`) and `EnemyDef.defeatLine` into
    `BattleBeat.text` **verbatim, each as its own beat**; no beat wraps a story line in extra wording. So the beat text is looked up
    as is. Generated narration ("X uses Y!", damage, XP…) has no entry and stays English.
- **Rendering:** `<StoryLine en>` (view-markup) chooses the mode:
  - `'en'` or no translation: `<Markup>` exactly as before.
  - `'sa'`: `<SaMarkup>` only (`data-testid="story-sa"`).
  - `'sa-en'`: `<SaMarkup>`, then the English in smaller, dimmer text below a dashed rule (`story-en`). While the Sanskrit is
    still typing, the English keeps its space (visibility hidden), so the box never jumps.
- **`<SaMarkup>`:** every plain-text and `{b:}` run goes through `<SaText>` (Devanagari or IAST from the player's script).
  `{player}`, `{w:}`, `{n:}` and `{f:}` are rendered by `<Markup>` itself, so tapping a word still opens its card.
- **Typewriter:** `useStoryTypewriter(en)` → `useTypewriter(text, sa)`. For Sanskrit, the units are akṣaras from
  `splitAksharas(run, { keepSeparators: true })` (one per akṣara or separator run; a name / word / `{player}` is one unit), never
  code points, so no half-drawn conjunct can appear. The not-yet-revealed rest of the line is laid out invisibly
  (`.g-ramayana-yatra__ghost`), so lines never re-wrap mid-typing. The step is 2.2× the English per-character delay, since an
  akṣara carries more. Reduced motion or "Instant" shows the whole line at once.
- **Layout:** Devanagari lines get line-height 1.62 at 1.06 em, IAST 1.55. `word-break: keep-all` with no hyphens, so a line never
  breaks inside a word. The speech bubble, speaker label and portrait are unchanged.
- **Screen reader:** `ctx.announce` reads the Sanskrit in the player's script (`markupPlain(sa, env, true)`), with the English in
  parentheses in sa-en.
- **New journey:** with the picker added, the form uses `justify-content: safe center` and its own scroll, so the top is never cut
  off. Its repeated how-to list now shows only at ≥ 900 px height (the title screen shows it already). 390×844 fits without scrolling.

## e2e
- The snapshot now has `dialogueLang` and `say` (the English key of the current say line).
- New test: "dialogue language: Sanskrit via Settings (Devanagari only), Sanskrit + English, and IAST". It uses whatever is
  translated when it runs:
  1. A translated **sign** (`signPlan`: a `planAt` save on the sign's map, standing in front of it and facing it). The flow is
     English → Settings `sa` → read (Devanagari, no Latin letters, no English line) → Settings `sa-en` → read (Sanskrit, then
     English) → a new session in IAST → Settings `sa` → read (Latin, `sk-sa--iast`). It also checks that the setting is in
     `prefs-v1` and not in `save-v1`.
  2. Otherwise, the first translated line of the opening scene (`introPlan`). Settings `sa` is set in a calm session, then
     New journey; then `sa-en` is chosen on the New-journey picker; then IAST.
  3. If neither exists, the test skips with a reason.
- The run at about 12:55 ET used a real translated sign (dandaka_vana "East: Panchavati…"), and all e2e tests passed.

## Notes / for others
- **Platform (FYI):** `devaToIast` renders the daṇḍa `।` as `|`, so IAST Sanskrit lines end in "|". That is the platform's
  convention, and the game doesn't change it.
- **Translators:** lines with `{player}` show the typed (Latin) name inside the Sanskrit line, which is expected. The en dash "–"
  that some lines use renders fine in both scripts.
- **Explore panel at 360×640:** in sa-en, a long objective takes 2–3 lines, so the party strip under it shows less (it already
  clips, e.g. with 6 heroes). The objective's English is set smaller on short screens and hidden in landscape.
- Screenshots: `/home/claude/scratch/view-sa/*.png`.


## Update (orchestrator, 13:50)
Battle narration now has Sanskrit too: beats carry `textSa` from `content/sa-battle.json` (agent sa-battle; see notes/sa-battle.md), rendered by the same StoryLine/typewriter. The screen-reader announcement uses `textSa` for beats when the language is not English.
