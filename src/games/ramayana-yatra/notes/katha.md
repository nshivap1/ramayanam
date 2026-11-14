# Kathā mode (v0.4): spec for every agent

Plan (owner-approved): the Docs artifact "Rāmāyaṇa-yātrā: Kathā mode — a story-first plan for Sanskrit readers".
v0.4 = the Kathā core loop on today's 21 verses and maps. **Nothing in the practice game may change**: a save
without `style`, or with `style: 'abhyasa'`, plays exactly as v0.3.0, and every existing test stays green.

## Journey style
- `SaveData.style?: 'katha' | 'abhyasa'` (absent = 'abhyasa'). `newGame(…, opts.style)`; `style: 'katha'` also sets
  the flag `style.katha` (so story JSON can branch with the existing `if` command: `{ "if": "style.katha", "then": [...] }`).
- New journey screen: a Journey picker, कथा (story) / अभ्यासः (practice). Default: कथा when Story text is
  संस्कृतम् or संस्कृतम् + English, अभ्यासः for English. Every language can pick either.
- Settings: the journey can be switched mid-game (`{ type: 'set-style', style }`, only in explore mode).

## What Kathā changes (logic)
1. **Random encounters off** (kuśa tiles never roll).
2. **Party level floor per chapter** so story fights are winnable without grinding (tune with the story bot).
3. **Story `quiz` commands are skipped**; their `onCorrect` branch runs (13 in today's story).
4. **Battle moves:** a move bound in `content/katha.json` `astras` (moveId → shlokaId + pada) opens a **smarana**
   challenge for that pāda (context 'battle'); every other move resolves with **no input** at the ordinary
   (correct, not swift) power. Enemy turns are unchanged.
5. **Duels** (debates of verses): each player turn is a smarana challenge on a pāda of a verse the player has
   heard (rotate; prefer the duel's own verse when it has one).
6. **Shrine recital** (restore / re-recite a verse): the four pādas in order as smarana challenges at that verse's
   pāda levels (first time: level 1 each; a level-0 or mastered pāda in a recital still gets one gap, so a recital
   is always 4 taps). Restored at ≥ 3 of 4 pādas flawless (same 75% rule as today).
7. **Study hall** (अभ्यासशाला): an extra shrine option in Kathā only — a round of 5 classic challenges
   (`makeChallenge`, context 'quiz', with today's feedback panels). Optional, never on the story path.
8. **No `feedback` pending after a smarana answer**: the view animates the result inline, then the battle
   beats / next recital step follow directly.

## Smarana (recitation) challenges — audited (ux-audit, /home/claude/scratch/ux-audit/AUDIT.md: PASS WITH CHANGES, all adopted)
`Challenge.kind = 'smarana'`, `Challenge.smarana: SmaranaSpec` (types.ts); `options` / `answers` stay unset.
- **Chunks** = the printed pāda (`shloka.padas[p]`) split on spaces, verbatim, in its sandhi form (e.g. `ददाम्येतद्व्रतं`).
- **At most ONE gap per cast, at every level** (never more than one tap):
  | level | gap | other chunks |
  |---|---|---|
  | 0 (first casts) | none: the line recites and the cast fires (`answer { picks: [] }`) | full |
  | 1 | the last chunk | full |
  | 2 | one chunk (seeded; rotate so every chunk gets recalled) | full |
  | 3 | one chunk | `hint`: first akṣara + ॰ |
  | 4 (mastered) | none: recites itself fast (≈ 0.12 s/akṣara), EXCEPT a spot check (`check: true`, an L3 gap) on mastered casts 2, 4, 8, 16, … (`smrti.casts` / `nextCheck`) | full / `hint` on a check |
  Two flawless casts in a row → level + 1 (max 4), streak reset; a miss → level − 1 (min 0), streak 0; a miss on a
  spot check → level 3. An `auto: true` answer (automatic recitation) = correct with **full** effect, mastery untouched.
- **Gap rules:** never gap a chunk that shares a lexId or stem with the astra's own name (विद्धि's gap is never विद्धि);
  rotate the gap position across casts.
- **Options:** exactly 3 per gap: the right chunk + 2 other printed chunks of the same verse; drop a distractor that
  shares a lexId or `spellingKey` with the answer, or that would complete ANOTHER real pāda (e.g. केयूरे / कुण्डले);
  prefer distractors with the same syllable count; in a shrine recital prefer chunks of pādas not yet shown;
  shuffled with the seeded rng on every cast. All verbatim content.
- **Binding rule:** bind astras only to pādas of ≥ 2 chunks (11 of 84 pādas are one chunk). In a shrine recital a
  one-chunk pāda is gapped whole and its options are other one-chunk pādas / chunks.
- **Kathā outcome semantics** (battle): correct or auto = full effect; **a miss = half effect for every astra**
  (damage × 0.5, heal × 0.5, stage change ± 2 → ± 1, ± 1 stays ± 1) — never "no effect"; **no swift bonus in
  Kathā** (swift's 1.5× is practice-game only; a recalled cast may get × 1.1); `timeLimitMs` = 0 (no visible timer).
  No separate falter ▶ beat: the outcome is folded into the effect beat. The recital REPLACES the "{x} uses {m}!"
  beat for bound casts. Falter wording in Sanskrit must not say उत्तरम् ("answer") — sa-battle templates for the
  Kathā outcome are new keys, reviewed by the Sanskrit reviewer.
- **Battle narration auto-advances in Kathā** (v0.4.3: 1.5 s + 180 ms/akṣara — a learner's reading pace; v0.4.1 had
  ≈ 1.4 s + 30 ms/akṣara, too fast to read; tap / A to hurry; reduced motion: same timing, no tween). This saves ~40
  taps per boss fight. The practice game keeps tap-to-advance. **Except the tutorial duel**: every beat waits for a tap.
- **weights** (optional): laghu/guru per akṣara of the printed pāda (chandas engine). The gap box shows no marks
  until filled.

## Recitation panel (view) — audited rules
- Line large, auto-fit 34 → 20 px, one row, never wrapping inside a word; the full pāda shown when complete.
- Recites akṣara by akṣara (≈ 0.25 s; mastered ≈ 0.12 s), at least 0.4 s before any gap; tapping the line or
  Enter / Space / Z only HURRIES it (never picks a chip); B does nothing during a cast.
- Chips: stacked full width, ≥ 52 px tall (46 px when the screen is ≤ 700 px tall); never a row of three; keys 1–3;
  **armed 300 ms after they appear** (a pointer press that began before arming and `KeyboardEvent.repeat` are ignored).
- Miss: the right chunk shimmers into the gap, the line finishes, the effect beat says it faltered (no verdict text).
- No English gloss until the line is complete (sa-en shows it after; caption "Recall the missing word" / अत्र किं पदम्?
  for the first 3 gapped casts — v0.4.3: in संस्कृतम् too, where it was missing).
- Screen reader: the animation is `aria-hidden`; one polite announcement (astra, the line with "blank" and the cue
  akṣaras, "three choices"); focus moves to the chip group; after a pick announce the full pāda and the effect,
  on a miss the right word. No timeouts. Reduced motion: the line appears at once and stops at the gap.
- Shrine recital: the verse shown in place (completed pādas, the live line, progress dots), fits 360 × 640.
- Contrast: cue ॰ in `--ink-3`, filled-word border `--gold-ink` (AUDIT.md criterion 19).
- Automatic recitation: offered on the Kathā start (New journey) and in the cast panel's help; casts never ask.

## Content (content/katha.json)
- `astras`: the 10 verse-bound moves of defs.json (`unlockShloka`), each with the pāda that best carries the
  move (e.g. viddhi → s-ramam-dasharatham pāda 0 "रामं दशरथं विद्धि").
- `verses`: for all 21 verses — `anvaya` (the verse's own pada-ccheda forms, each exactly once, reordered; implied
  words in [brackets], oracle-verified) and `saralarthah` (1–4 short Level-1–3 Sambhāṣaṇa sentences,
  oracle-verified, house style of notes/sambhashana.md).
- Sambhāṣaṇa **choices** in about 10 existing scenes, Kathā only (`if: style.katha`): 2–3 replies in English
  (story text, as every story string) + Sanskrit in content/sa-dialogue-5.json; a reply that misreads the question
  gets a short in-character answer and the conversation turns back; never a "wrong" stamp; never changes the epic.

## Views
- **Verse moment** (the `shloka` pending, Kathā only): the printed verse, large; then the anvaya unfolds by itself
  (words glide from verse order into prose order; reduced motion = shown at once) and the सरलार्थः fades in; ▶
  continues (one tap). Tabs to revisit: पदच्छेदः · अन्वयः · सरलार्थः (+ the English meaning in sa-en and en).
  Every word stays tappable (word card). The practice game keeps today's verse card.
- **Recitation panel** (smarana): see "Recitation panel (view) — audited rules" above; `answer { picks }` (or
  `picks: []` with no gap, `auto: true` for automatic recitation).
- The verse book (श्लोकाः tab) shows verses in story order with "n / 21" progress (the पुस्तकम्).
- New interface strings go in content/sa-ui-katha.json (rules: notes/sa-ui.md). संस्कृतम् mode: no Latin outside `data-en-ok`.

## Gate (v0.4)
`node tools/check.mjs --e2e --game=ramayana-yatra` green, plus: the story bot plays **Kathā** to the ending for every
seed × level (perfect reciter and a 70 %-accurate one); every anvaya is a permutation of its verse; every new Sanskrit
word verifies; e2e: New journey (कथा) → verse moment → a recited astra in battle → a shrine recital, in संस्कृतम्
with the no-Latin sweep; the practice game's tests unchanged.

## v0.4.1: fixes from the fresh-eyes playtest (kc-qa)
Findings (book 1 in संस्कृतम्, 390 × 844): 842 s, battles 66 %; 229 taps (1 per story beat, 106 battle-menu taps,
11 recitation taps); bosses Tāṭakā 124 s / 25 menu taps, Subāhu lost once then 194 s / 40 menu taps; whole game
86 recitation taps; practice mode identical to v0.3. Decisions:
- P0 `अहं {player}` → nominative शिष्यः/शिष्या (saPlayer; done by the orchestrator).
- **Astras reach the bosses:** in Kathā a newly unlocked verse-bound astra is equipped automatically, replacing a
  plain move (toast says which); never replaces another astra; a hero keeps ≤ 4 moves.
- **Skipped quizzes are silent:** in Kathā a story `quiz` runs only the non-`say` commands of its onCorrect branch.
- **Kathā wording:** tutorial lines, help and move descriptions that describe practice mechanics get Kathā
  variants (`if: "style.katha"` / `"!style.katha"` blocks; `katha.json moveText`).
- **Shorter, lighter battles in Kathā:** one-tap moves (the command panel lists the active hero's moves directly;
  switch / items / run are secondary buttons); duels go straight to the recitation (no move choice); boss and
  enemy HP scaled down in Kathā so a story fight is ≈ 6–10 player turns and a boss ≈ 8–12; no story fight may be
  lost by a reasonable player (bot: 70 % reciter who also picks plain moves badly).
- **Recite the whole verse over time:** a bound astra rotates through every eligible pāda of its verse (≥ 2
  chunks, a gap that is not the name): the least-practised first, the binding's pāda as the first one.
- New journey: Begin / Back in a sticky footer (all modes).
- P2: no ॰ cue on one-akṣara chunks; no Latin "." in screen-reader text; the chapter result screen in Kathā reports
  verses heard / recited / restored instead of a correct/total score with ✗; sa-en choices show English only for the
  prompt, not on the options; a half-effect line never sits next to "महत् फलम्" without explanation.

### v0.4.1 outcome (12 Nov)
All P0/P1/P2 decisions above are implemented (fx-core, fx-view, fx-content; Sanskrit review fx-rev). The gate passed: typecheck, 197 unit tests, contract, and 24 e2e (1 skipped, RY_FULL). The practice game is unchanged: its snapshot and walkthrough-equality tests are green.
- Logic: astras auto-equip (free slot → status move → weakest plain move; never an astra), and old Kathā saves are armed once (`katha.armed`). The story fight is led by the hero with the most equipped astras (`BattleSpec.lead` wins). Foe HP = min(ordinary, max(0.3 × ordinary, turns ÷ foes × the lead's best hit)), with turn targets wild 3, duel 6, boss 7. A foe hit is capped at 25 % of the lead's HP. Duels go straight to `challenge`, and the line carries the hero's best damaging move (no PP). Astras rotate pādas (own pāda first, then least practised). New beat `kathaHalfBut` follows the element beat.
- Bots (perfect, 70 %, careless 70 % with plain moves at random; 25 seeds × 3 levels): 0 lost fights. Boss turns / recitations (perfect): Tāṭakā 9.7/6, Subāhu+Mārīca 14.2/8, Dūṣaṇa 9.0/2, Laṅkā 10.0/7, Akṣa 9.9/5, Kumbhakarṇa 11.1/8, Indrajit 11.9/4, Rāvaṇa 6.4/6. Census: ≈ 138 recitations, ≈ 86 recitation taps, ≈ 74 min (perfect bot); with random any-move picks the careless bot lost Akṣa 1–2 times in 75, so the test bot picks plain moves.
- View: one-tap move panel (keys 1–4; switch / items / run on 5–7), duel turn = recitation with a पठ badge, sticky New-journey footer, Kathā move text, queued toasts, Kathā session result (verses heard · lines recited · verses restored), sa-en Kathā replies in Sanskrit only, no ॰ on one-akṣara words, screen-reader line ends with ।. Tāṭakā measured: 8 move taps + 4 recitation taps (v0.4: 25 menu taps).
- Open for v0.5: Subāhu+Mārīca runs past the 12-turn target (test allows 15); careless bosses 12–18 turns.

## v0.4.3: the tutorial duel (fx-duel)
Owner's playtest: "I didn't follow the part with Bharadvaja — went by quick and didn't understand how to interact or how
it advanced the plot." Causes: beats advanced at 1.4 s + 30 ms/akṣara; the caption was hidden in संस्कृतम्; every duel
pāda was level 0, so the duel recited itself with no input at all; the story never said why there was a duel.
- **Plot (Kathā wording, sa-dialogue-5):** what Vālmīki tells (Bāla 2.19 — the disciple, delighted, takes up the guru's
  new words as he speaks them; the guru is pleased), not invented as a quote: Vālmīki asks Bharadvāja to learn the new
  verse by heart and teach it to the student; Bharadvāja: "The teacher's new verse! Let us learn it by heart first, then
  walk back." / "I say a line, and you say it after me. Where a word is missing, tap the right one."; after: "Now the
  verse lives in two memories. Let us tell the guru." → Vālmīki: "I heard you both, and I am pleased …" → the shrine.
  Objectives: "Talk to Bharadvaja and learn the new verse by heart." The practice game keeps its debate wording (the
  `else` of each `{ "if": "style.katha" }` block). Kathā blocks may now hold `objective` too (quest-log text only).
- **Call and response (`BattleSpec.tutorial`, Kathā only, logic-katha `isEchoDuel`):** the battle opens with a lesson
  line (sa-battle `kathaEchoIntro`) and the first **model beat** (`BattleBeat.model`, `kathaEchoModel`): Bharadvāja says
  pāda 0, printed in full (no gap, no input). Each player turn says back the pāda just modelled with **one gap** (a
  level-0 pāda gets the level-1 gap, its last eligible chunk: buildSmarana `echo`; a mastered pāda still recites
  itself). One beat per answer: "{x} says the line back!" (`kathaEchoSay`) with the hit (a miss: + `kathaHalfBut`, half
  power). The duelist's turn is the next model beat — never an attack, so the tutorial cannot be lost. Foe HP = 4 turns
  (KATHA_TUTORIAL_TURNS) × the lead's best hit: a perfect reciter says the verse once through (4 turns), a 70 % one ≤ 8.
  The end: `kathaEchoDown` and `kathaEchoWin` ("The lesson is complete!"), no debate defeat line. Name bar: पाठः.
- **Interaction:** nothing auto-advances in the tutorial duel (each beat waits for ▶); its first recitation shows a
  coach line above the line (`katha.coach`: पादं शृणु। रिक्ते स्थाने उचितं पदं चिनु।), read for 1.2 s before the line
  starts (a tap starts it), and the gap and the three chips pulse until the first tap (a static accent ring with
  reduced motion). The caption अत्र किं पदम्? shows in संस्कृतम् too (first three gapped casts, every language).

## v0.5a: a strategic layer for Kathā battles (fx-strat, 13 Nov)
Owner's playtest of Bāla-kāṇḍa: "the fight sequence was a bit repetitive and chore-like. just spamming Rāma with the
āgneyāstra was effective … there wasn't really a strategic element there." Code: `logic-tactics.ts` (data:
`content/katha.json → tactics`; every textual entry has its `source`). Kathā wild and boss fights only: duels, the tutorial
duel and the practice game never reach it (a practice battle state carries none of the new fields; snapshot green).
- **Matchups (the right astra for the right foe).** `tactics.fits`: where Vālmīki names the astra, it is decisive — the
  foe falls / is driven off at once with a story beat (sa-battle `kathaFit*`; no "uses" line before it): Mārīca ←
  Mānava and Subāhu ← Āgneya in Book 1 (Bāla 1.30.17–22), Rāvaṇa ← brahmāstra once worn to ≤ ½ (Yuddha 6.108). Not encoded:
  the Vāyavya against the followers (1.30.23; no such foes in a battle). The foe card (`BattleTags` → `foe-affinity`)
  says उचितम्: <the astra>, else the hero element × 2 against the foe (`affinityOf`). Viśvāmitra's grant
  (`tactics.grants`): setting `ch1.tataka_defeated` gives Rāma the Mānava (a new defs move, not in any learnset: the
  practice game never sees it) and the Vāyavya, equipped in place of the plain bāṇa, with the usual toasts; story battles
  re-apply grants (older saves). The sacrifice fight has `lead: "rama"` (the text: Rāma does it).
- **Warnings.** Every Kathā boss readies its great blow (its strongest damaging move) on its 2nd action and every 3rd
  after (`KATHA_WARN_FIRST` 2, `…EVERY` 3; `first: 0` = in the opening, Subāhu's rain of blood, Bāla 1.30.12). The ready
  beat (`tactic: 'warn'`) is one short Sanskrit line, future tense: `kathaWarn` "{x} {m.acc} प्रयोक्ष्यते!" or the boss's
  own (`kathaWarnStones` for Tāṭakā, Bāla 1.26.16; `kathaWarnBlood`). Readying is not a blow. The next foe action is the
  strike, and with a blow readied the hero always acts first. Answers this turn (`answerOf` etc.): any support move
  (power 0), a counter (`counter` list: Rāma's / Lakṣmaṇa's bāṇa against Tāṭakā's stones, Bāla 1.26.17; or a move of the
  natural element × 2 against the blow's element), a switch (the hero who steps in braces), a **cover** (`choose 4`: a
  benched guardian — `tactics.guards`, Lakṣmaṇa → रक्षा — or a benched hero with an unbound guard move; the hero keeps
  the field) or the **verse shield** (`choose 5`: a recitation of the least-practised ≥ 2-chunk pāda of any heard verse;
  `kathaShield`; a miss protects half). Answered: × `KATHA_BLUNT` 0.3 (`kathaBlunt`, `tactic: 'blunt'`) and the foe is left
  open (defence −`KATHA_OPENING` 1; a faltering shield: × 0.65, no opening). Ignored: × `KATHA_STRIKE` 2.4 of an ordinary
  hit, capped at `KATHA_STRIKE_CAP` 45 % of the hero's max HP. A bound foe loses its readied blow; a fallen one too.
- **Fatigue.** The same astra (verse-bound, or `tactics.divine`: āgneya, vāruṇa, vāyavya, mānava) on consecutive turns
  lands × 0.6, then × 0.4 (`KATHA_FATIGUE`; `battle.chain`); any other action (a move, a switch, an item, a cover, a
  shield) resets it; plain moves never tire (tiring them too made the two-hero Laṅkā fights losable for a spammer). The
  beat says `kathaTired`; the move button shows श्रान्तम् (`katha.tired`). Foe HP is now scaled to `rotationHit` (the hit
  kept up while rotating: max((d1 + d2)/2, (1.6 d1 + d2)/3, 0.4 d1), d1 when the best move does not tire) and
  `KATHA_TURNS.boss` is 10 (bosses are often capped at their ordinary HP).
- **View.** Foe card: affinity chip + a "!" mark while a blow is readied. Command panel: an answer row above the moves
  (श्लोकं पठ key 8, the cover key 9; move descriptions hide to make room), a श्रान्तम् tag on a tired astra, moves that
  answer the blow get a red edge. Beats carry `data-tactic` (warn / fit borders).
- **Hints (Kathā blocks, sa-dialogue-5):** Viśvāmitra before Tāṭakā (stones; guard or recite) and after her (fatigue);
  Rāma before the sacrifice (Mānava for Mārīca, Āgneya for Subāhu; guard the altar); Mātali before Rāvaṇa (the
  brahmāstra when he tires).
- **Bots** (logic-sim `policy`): 'strategic' (decisive fit; with a blow readied a counter, a recited support move, the
  verse shield, a cover; otherwise set-ups and a two-turn rotation), 'spam' (the most damaging move every turn).
  Census (25 seeds × 3 levels, all books; /home/claude/scratch/fx-strat/): 0 lost fights for strategic, spammer, 70 %,
  careless (and spammer / strategic at 70 %). Boss turns (mean per boss fight) strategic 8.9 (before, perfect bot 9.5) ·
  spammer 11.7 (+32 %; before it was the fastest at 8.2) · 70 % 11.7 · careless 12.0. Recitations per playthrough:
  strategic 138.9 (before 137.4) · 70 % 166.9 (156.9) · careless 133.5 (131.9) · spammer 136.2 (138.2); distinct verses
  recited in story fights: strategic 7.0 (before 5.0), spammer 3.0. Est. playthrough (strategic): 109 min (before 114).
  The sacrifice fight is 2 turns for a strategic player (the text's two decisive astras), ~20 for a spammer.

## v0.5 (v0.5b): story set pieces, Hanumān, verse chains, the Āditya-hṛdayam, Lava–Kuśa (14 Nov)
Plan: `notes/v05b-plan.md`; ownership `notes/v05b-ownership.md`; each package's design, decisions and checks in
`notes/v05b-a.md` … `v05b-e.md`; the first Sanskrit review in `notes/v05b-rev1.md` (the second in REVIEW.md).
Rules that hold for every set piece:
- **Kathā only.** Each set piece is a `{ "if": "style.katha", "then": [...], "else": [...] }` block (or a Kathā-only
  `requires`), and Kathā-only walkthrough steps carry `style: 'katha'` (skipped by guideStep, runWalkthrough, runGuide
  and the e2e bot in the practice journey). The practice journey runs the v0.5a commands: the "v0.5b guard" hash in
  logic.test (`V05A_PRACTICE`, seeds 1–3 × L2–4) and `V03_SNAPSHOT` are unchanged.
- **Sanskrit files.** New Kathā lines go to sa-dialogue-6 (ch1–3), 7 (ch4), 8 (ch5), 9 (ch6); file 5 is frozen
  (`FILE5_V05A`). New interface strings: sa-ui-scene, sa-ui-chain, sa-ui-setu; the hymn's narration and controls live in
  `content/aditya-hridayam.json → ui / narration` (checked in cutscene.test). Numbers are Devanagari digits.
- **Nothing can be lost.** A missed recitation shows the right word and the script goes on; a misread question returns
  to the question; the bridge locks true stones; stealth sends Hanumān back with no fight; the chain duel never strikes.
- **Engine pieces** (types.ts): P1 `{smarana, pada | "least"}` (logic-scene.ts, RecitePanel with context 'scene');
  P2 `{book: n}` (BookEnd in review mode); P3 `TriggerDef.avoid` (findPath treats an active one as a wall); P4
  `playerSprite(save)` ('hanuman' only in Kathā, chapter 5, flag `katha.hanuman`); P5 `{setu}` (logic-setu.ts,
  view-setu.tsx); P6 `Challenge.kind 'antya'` (logic-chain.ts, view-chain.tsx); P7 `tactics.phases` with an optional
  `requires` flag condition; warnings may carry `strikeScale` (the rain of blood falls on the altar: × 0.5).
- **The hymn gate.** In Kathā, Rāvaṇa's phases (`ravana_heads`, `ravana_matali`) require `seen.aditya`; until the
  cutscene has played every blow is held at 40 %. `cutsceneDue` (logic-cutscene.ts): Rāvaṇa's battle in book 6, no
  `seen.aditya`, the first calm moment he is shown at ≤ 60 %. The view plays the scene and dispatches `cutscene-done`
  (sets the flag); logic-sim's Kathā bot dispatches it itself, so every story bot reaches the ending. The practice bot
  never dispatches it (the practice game reads nothing of it).
- **Integration (orchestrator, 14 Nov):** the ending panel routes Kathā to `KathaEnding` (view-bookend) after the
  recital and keeps the practice ending; `ch6.shore_start` unsets `katha.hanuman` for older saves; Rāvaṇa's battle has
  `lead: "rama"`; the Kathā battle check allows the 'smarana' and 'antya' kinds; in Kathā `ch6.agastya` skips its
  "Ravana himself is coming out to fight…" line (that moment is now the cutscene's); Akṣa's warned blow (ch5, Hanumān
  leads alone) is countered by Hanumān's `vayu_vega` (katha.json warnings, Sundara 5.47.23: between the arrows like the
  wind). Without it the spammer bot lost Akṣa in 2 of 75 runs (a crit on an ignored strike, Akṣa at 1–2 HP); after it:
  0 losses for all four bots, Akṣa strategic 6.4 / spammer 8.0 turns, bosses spammer / strategic 11.03 / 8.03 = 1.37.
