# Sanskrit interface text (v0.3.0): rules for every agent

Goal: when the player picks **संस्कृतम्** (Story text = `sa`), *everything the game itself draws* is Sanskrit in
Devanagari (following the platform script setting): buttons, headings, hints, chips, numbers, toasts, battle menus,
challenge prompts and explanations, shop, shrine, menu, chapter cards, ending. **संस्कृतम् + English** (`sa-en`) shows
the Sanskrit with a small English gloss. **English** (`en`) must look exactly as before (tests rely on it).

## Where text lives

| What | File (owner) | How the view gets it |
|---|---|---|
| Interface strings (code-defined UI text, toasts) | `content/sa-ui-common.json` (orchestrator, frozen), `content/sa-ui-a.json` (ui-a), `content/sa-ui-b.json` (ui-b) | `useUi().t('key', slots)` / `uiToast(content, 'key', slots)` |
| Content strings (NPC titles `who`, chapter titles & summaries, move / item / ally / enemy descriptions, move origins) | `content/sa-dialogue-4.json` (ui-c), keyed by the exact English like files 1–3 | `useUi().c(en)` |
| Story lines | `content/sa-dialogue-1..3.json` (done) | `<StoryLine>` |

**Never write an English UI string in a view again**: add a key. English mode renders `entry.en`, so moving a string
into the table must not change its English (tests match English text).

## Entry format

```json
"shop.owned": { "en": "owned {$n}", "sa": "{$n} सन्ति", "label": true, "ctx": "shop row: how many you carry" }
```
- **key**: `area.name` (camelCase name). ui-a areas: `title newGame hud chapter shop shrine end menu party words verses items settings lang`. ui-b areas: `battle challenge card recital learn toast`. Shared terms: `common.*` (read-only, see below).
- **label: true** for buttons, headings, chips, short labels: no final । required, `{n:…}` (a bare names.json stem) allowed. Sentences (hints, toasts, explanations) end with । ? or !.
- **slots** `{$name}`: same set in `en` and `sa`. Values: a number (→ Devanagari digits in Sanskrit), a markup string (`{w:id}` `{player}`; in a sentence prefer a declined form passed as `{ en, sa }`), or `{ en, sa }`.
- UI symbols ▶ ◀ ◈ · × / % + ( ) ★ ✓ ✗ … are allowed in interface strings.
- `{g:masc|fem}` for any word that agrees with the player (avatar b = शिष्या). `{player}` is the player's name: with the default name it becomes शिष्य / शिष्ये (vocative) automatically (view-common `saPlayer`).
- Optional `models` (an extra stem declined on a SHABDA paradigm, with an MW source) exactly as in sa-dialogue files.

## Register: Level 1–3 Sambhāṣaṇa (same as notes/sambhashana.md)

Short, plain, padaccheda (no sandhi between words), present / imperative / ktavatu-kta past / tumun / ktvā-lyap.
Imperatives to the player in 2nd person singular (गच्छ, पश्य, चिनु). Labels may be bare nouns (आपणः, वस्तूनि).
Prefer words a Samskrita Bharati Level-3 student knows. One idea per sentence.

**Verification is the gate.** Every word must be found by the oracle:
```bash
cd /home/claude/fw
node --import tsx /home/claude/scratch/sa-ui/words.ts शब्द१ शब्द२ …      # check words (level, source)
node --import tsx /home/claude/scratch/sa-oracle/check.ts --find "buy"   # English search over every source
node --import tsx --test src/games/ramayana-yatra/sa-ui.test.ts          # the interface-string gate
```
If a word is not found, rephrase with words that are (do not force a form). Never mark anything human-reviewed.

## Shared terms (`common.*`, already verified; use these keys, do not redefine)

back ◀ पृष्ठतः · next अग्रे · continue अग्रे गच्छ ▶ · begin आरभस्व ▶ · leave निर्गच्छ · cancel त्यज · yes आम् · no न ·
save रक्ष · lv स्तरः · hp बलम् · pp उत्साहः · verse श्लोकः · verses श्लोकाः · word शब्दः · words शब्दाः · heard श्रुतः ·
journey यात्रा · question प्रश्नः · answer उत्तरम्

Consistency glossary (use the same Sanskrit for the same idea in both areas):
- battle stats (sa-battle.json): attack → तेजः, defence → धैर्यम्; HP → बलम्; PP → उत्साहः ("moves recharged" = उत्साहः पुनः पूर्णः)
- restored (a verse made whole) → पूर्णः (chip) / "श्लोकः पूर्णः अभवत्" style in sentences
- coins / purse → धनम् (the coin is names `ui.niska`)
- items → वस्तूनि · party / heroes → वीराः · menu → keep short (e.g. सूची is "needle": do NOT use)
- elements, challenge kinds, mastery tiers → names.json `element.*`, `kind.*`, `tier.*` (as `{n:…}` in labels, or render the name directly with `<SaText>`)

## Allowed English in संस्कृतम् mode (the only exceptions)

1. The **meaning being taught**: English glosses of verse words (word card, meaning-challenge options, verse
   translation behind the "translation" toggle) — no verified Sanskrit paraphrase exists. Mark the element with
   `data-en-ok` so the e2e "no Latin" sweep skips it.
2. A name the player typed in Latin letters.
3. The platform shell around the game (top bar, help, results) — outside this folder.

## Glossary decisions from the v0.4.2 audit
Use these everywhere: interface, story files and battle lines.

| Thing | Sanskrit |
|---|---|
| move | मन्त्रः |
| verse-bound move | अस्त्रम् |
| menu | स्यूतः |
| settings | इच्छाः |
| the player recites | पठ् (पठ, पठितुं, पठित्वा) |
| a verse recites itself (automatic recitation) | स्वयं वदति |
| a mastered line completes itself | स्वयं पूर्णः भवति |
| a gap | रिक्तं स्थानम् (never पदं रिक्तम्) |
| the right word | उचितं पदम् |
| Explore (objective line) | सर्वत्र गच्छतु |
| nearly (won) | प्रायः {g:जितवान्\|जितवती} |
| a concept-named move inside a sentence | quoted, with इति: “धर्मः” इति मन्त्रम् / मन्त्रेण (sa-battle `forms.move`) |
