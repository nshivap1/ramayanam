# sa-battle: Sambhāṣaṇa battle narration (`BattleBeat.textSa`)

OWNER: sa-battle. Files: `content/sa-battle.json` (all the Sanskrit), the builder at the top of `logic-battle.ts`
(`saText`, `saNumber`, `mergeGender`), `BattleBeat.textSa` in `types.ts`, the beat view (`view-battle.tsx` `BeatView`,
`view-markup.tsx` `useStory` / `StoryLine` / `useStoryTypewriter` with an optional `sa`), and the gate `sa-battle.test.ts`.
Style and verification rules: `notes/sambhashana.md`, `notes/sa-oracle.md`.

## What the player sees
With the dialogue language set to संस्कृतम् or संस्कृतम् + English, every battle beat shows Sanskrit: generated narration
from `beat.textSa`, story text (battle intros, enemy intro / defeat lines) from `content.dialogueSa` as before. In sa-en the
English sits dimmed below. The akṣara typewriter, `{player}` / `{w:}` rendering and `{g:masc|fem}` resolution by avatar are
the same as for story lines (`resolveGender`). The end-of-battle fallback lines in `BattlePanel` (no beats left) use the
`win` / `allDown` / `fled` templates as well.

## How a beat gets its Sanskrit
- `logic-battle.ts` builds `textSa` wherever it builds `text`, with `saText(key, slots)`. The function is pure and
  deterministic. There is no Devanagari in the TS file; the test enforces this.
- `templates[key].sa` is a string, or `{ "m": …, "f": … }` when a participle, adjective or pronoun agrees with the actor
  `{x}` (जितः / जिता, श्रान्तः / श्रान्ता, बद्धः / बद्धा + सः / सा, एकः / एका). The gender comes from `forms.<kind>.<id>.gender`.
- **The player** (`forms.ally.player`, gender `player`): nominative `{g:शिष्यः|शिष्या} {player}` (the typed name stands in
  apposition, uninflected, as in the English); genitive `{g:शिष्यस्य|शिष्यायाः}` (no name, because an uninflected name in the
  genitive would not be grammatical); vocative `{player}` (address). For the player, both variants are filled and merged word by
  word into `{g:masc|fem}`, so the view picks by avatar. "You" (the reader) is `{g:भवान्|भवती}` with 3rd-person verbs.
- Slots: `{x.nom|gen|voc}` actor (ally, enemy, or the group "heroes" → वीराणाम्), `{m.acc|ins}` move, `{i.acc}` item, `{s}` stat
  word (attack तेजः, defence धैर्यम्, both neuter so न्यूनम् agrees), `{n}` number, `{word}` → `{w:lexId}`.
- Beats that combine sentences (critical / effectiveness prefix + damage; "refreshed" + recovery) join templates with a space.
- Story-text beats (`spec.intro`, `EnemyDef.intro`, `EnemyDef.defeatLine`) keep `textSa` unset.

## Numbers
`{n}` (damage, recovery, XP, coins, level) is said in words that are grammatical for every n, with no agreement problem: the
figure stands after a dash, as an apposition ("ताटकायाः बलं न्यूनं भवति — द्वादश।").
- 1–100 and 1000 come from `@sanskrit` `cardinal()`.
- 101–9999 are the thousands, the hundreds and the rest, largest first, joined by च. This follows the Rāmāyaṇa pattern
  "दश वर्षसहस्राणि दश वर्षशतानि च": 123 = शतम् त्रयोविंशतिः च; 245 = द्वे शते पञ्चचत्वारिंशत् च; 1234 = सहस्रम् द्वे शते चतुस्त्रिंशत् च.
  The words for the hundreds and thousands are in `numbers` in the JSON.
- 0 and ≥ 10000 (never reached) become Devanagari digits.

## Coverage
56 templates cover every English beat kind in `logic-battle.ts`, in both the wild/boss and the duel wording. Forms: 7 allies
(nom/gen/voc), 22 enemies (nom/gen), 1 group, 36 moves (acc/ins), 5 battle items (acc), 2 stats. Left out on purpose:
- the English suffix " (equip it from the Party menu)" after "X learned M!". It is a UI instruction, and the Sanskrit line ends
  at "अधुना X M अपि जानाति!". In sa-en the English below still shows it.
- the key items `kusha_mudrika` (Rāma's ring) and `chudamani`. They are never usable in battle and never dropped, so they have no forms (चूडामणिम्
  doesn't verify).

## The gate (`sa-battle.test.ts`, ≈ 9 s)
1. Every ally, enemy, move and battle item has the needed forms and a gender, and the five feminine foes are `f`. No stale
   entries. Every template the logic names exists, none is unused, the m/f variants have the same word count, and there are
   no unknown placeholders or Latin letters.
2. **Every instantiation** is checked: each template × every name in its domain (`DOMAIN` in the test) × gender variant (the
   player both ways) × every move / item / stat / restored word × n = 1…999. That is about 106,000 lines, each run through
   `getOracle().verifyLine`. Composite beats are checked too, and so are the numbers 1…9999.
3. About 336 simulated battles (wild at two levels; every boss and duel foe; every story battle spec; perfect, weak and
   random bots; both avatars). Every beat must have a `textSa` that verifies (with the English as markup context), or be
   story text with a `dialogueSa` entry. Win, lose and run all occur.

Dependency: some words verify only through the dialogue translators' `models` (वाद, मन्त्र, अस्त्र, इन्द्रजित्, सहस्र).
If a model is renamed or removed, this gate names the word that fails.

## For the human Sanskrit reviewer
Everything here is model-written and machine-verified word by word. It is **not** human-reviewed. Please check in particular:
- `uses`: X M-acc **प्रयुङ्क्ते** (ātmanepada of प्र+युज्, 1.3.64) for every move. This includes non-weapons ("रावणः गर्जनम्
  प्रयुङ्क्ते", "रामः आदित्यहृदयम् प्रयुङ्क्ते"), and विद्धि is quoted: "“विद्धि” इति मन्त्रम्".
- The apposition `शिष्यः {player}` with an uninflected typed name.
- Damage / recovery / XP as "X-gen बलं न्यूनं भवति / बलं वर्धते / ज्ञानं वर्धते — n". Level as "X नूतनं सोपानं प्राप्नोति — n" (सोपान
  "step" for level: स्तर does not verify). Coins as "भवान् धनं प्राप्नोति — n" (no word for coin).
- The additive numbers above 100 ("शतम् त्रयोविंशतिः च").
- Duel wording:
  - "X M-ins उत्तरं ददाति" (answers with);
  - "X M-ins प्रतिवदति" (counters with);
  - "X-gen विश्वासः न्यूनः भवति — n" (conviction wavers);
  - "X “सत्यम्” इति अङ्गीकरोति" (is persuaded);
  - "X उत्तरं दातुं न शक्नोति" (has lost conviction);
  - "वादे भवतः पक्षः जितः" (your side has lost);
  - "वादः मध्ये न त्यक्तव्यः".
- Defeat as "X जितः / जिता" (पराजित does not verify).
- Effectiveness and critical hits: "महत् फलम्!" / "अल्पं फलम्।" / "अहो, अतीव तीक्ष्णम्!". The critical one is the weakest
  rendering: प्रहार / आघात do not verify.
- Stun: "X बद्धः! सः अनन्तरं युद्धं न करिष्यति!" (will lose a turn).
- Defence rendered as धैर्यम्, attack as तेजः.
- "अस्मात् युद्धात् गन्तुं न शक्नुमः!" (no running), "वयं सुखेन निर्गतवन्तः!" / "वयम् इतः गन्तुं न शक्तवन्तः!" (fled / not).

## Not done here (other owners)
- `notes/view-sa.md` still says "generated narration … stays English". It should now point here.
- `REVIEW.md` and `PRD.md → Content` should list `content/sa-battle.json` as game-local Sanskrit awaiting a human reviewer.
- There is no e2e assertion for Sanskrit battle beats (e2e is owned by view-sa).
