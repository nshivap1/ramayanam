# v0.5b plan: story set pieces, Hanumān, verse-chain duels, Lava–Kuśa finale

Written on 14 Nov 2026 from a read-only planning pass over the code, after the owner's Bāla-kāṇḍa playtest ("story telling good … good to progress the build"). v0.5a (Vālmīki-grounded battle tactics and the book-complete screen) lands first.

## 0. Rules for every package
1. **Kathā only.** Each set piece is a `{ "if": "style.katha", "then": [...], "else": [today's commands] }` block, so the practice journey is unchanged.
2. **Kathā-only walkthrough steps.** Add `WalkStep.style?: 'katha'`. `guideStep`, `runWalkthrough`, `runGuide` and the e2e `next` skip steps for the other journey, so practice saves get no extra flags.
3. **Guard test.** Before any change, record a practice hash on the real content in `logic.test.ts`: `runWalkthrough(REAL)` for seeds 1–3 × L2–4, projected like `V03_SNAPSHOT`, taken on the v0.5a HEAD.
4. **Sanskrit.**
   - No new declension models (Kuśa and Lava are regular -a stems).
   - Numbers are written as Devanagari digits.
   - Every line passes the oracle tests.
   - Two model reviews go into `REVIEW.md` before release.

## 1. New engine pieces
WP0 adds the types and empty stubs; the package that owns each piece fills it in.

- **P1 story recitation `{ "smarana": id, "pada": n | "least" }`:**
  - One pāda, spoken as the story's action.
  - Uses `buildSmarana` (mode 'recital', with a new context `'scene'`) and `recordSmarana`, and is shown by `RecitePanel`.
  - A miss shows the right word and the script carries on.
  - Code: `logic-scene.ts`.
- **P2 `{ "book": n }`:** a read-only review of one book (`BookEnd` in review mode, using `bookStats`).
- **P3 `TriggerDef.avoid`:** a guard's line of sight. `findPath` treats an active one as a wall; the e2e `nav()` grid marks it `#`.
- **P4 `playerSprite(save)`:** returns 'hanuman' only in Kathā, in chapter 5, with the flag `katha.hanuman` set.
- **P5 `{ "setu": tag }`:** the bridge puzzle.
  - Pending state is `setu {cells, solution}`.
  - `choose i` turns a stone; `advance` gives Nala's hint, or continues once solved.
  - Code: `logic-setu.ts`.
- **P6 `Challenge.kind 'antya'`:** the pick in a chain duel. It uses `options`/`answers`, so `correctAnswer`, `Bot.answer` and the `opt-<id>` test ids work unchanged.
- **P7 `tactics.phases`:** boss phases, as data in `katha.json`.

## 2. Set pieces

| # | Scene (Vālmīki) | What exists today | Kathā set piece (mechanic) | New Sanskrit lines | WP |
|---|---|---|---|---|---|
| 1 | Krauñca birds (Bāla 1.2) | `ch1.krauncha` trigger: narration, verse | Played out on `tamasa_bank`: the hunter steps out, a bird disappears (flag), Vālmīki turns. Then P1 says pāda 0 with laghu/guru marks ("four quarters of eight"). | 0–1 | A |
| 2 | Guha's ferry (Ayodhyā 2.50–52) | Choice, then a narrated crossing | The player is moved across the river (the boat ride); Sītā prays to Gaṅgā mid-stream | 2 | A |
| 3 | Golden deer (Araṇya 3.42–44) | 3 chase triggers, Mārīca fight | The deer moves away at each trigger; Mārīca's cry in Rāma's voice | 3 | A |
| 4 | Jaṭāyu (Araṇya 3.67–68) | Narration, verse | The dying bird can say little: the player asks who took her and which way. A question that misreads gets a gasp, and the talk returns to the question. | 6 | A |
| 5 | Hanumān in disguise (Kiṣkindhā 4.3) | Choice, verses, recitation duel | The first verse-chain duel (§4) | 3 + 6 UI | C |
| 6 | Jāmbavān (Kiṣkindhā 4.65–66) | Four vānaras already say how far they can leap | Roll call: talk to Gaja, Gavākṣa, Śarabha and Mainda (Kathā-only steps); then Jāmbavān turns to Hanumān | 1 | C |
| 7 | The leap (Sundara 5.1) | Surasā duel, Siṃhikā boss | Play as Hanumān. Surasā becomes a choice chain: her mouth widens, he grows twice, then the player picks "grow" or "become tiny". Tiny gets through; grow means she waits (cannot be lost). Siṃhikā fights with `lead: hanuman`. | 5 | B |
| 8 | Laṅkā by night (Sundara 5.2–11) | 3 patrol fights | Stealth: lit tiles near the guards are avoid-triggers (`once: false`). Stepping on one means "a guard turns", and Hanumān goes back to the mouth of the lane with no fight. In Kathā the patrol events set their flags without a battle. | 3 | B |
| 9 | Aśoka grove (Sundara 5.30–36) | Narration, verse, choice | Before showing himself, Hanumān sings Rāma's story: P1 on `s-ramam-dasharatham:0`, `s-golden-deer:1`, `s-aranya-3:3` | 3 | B |
| 10 | Laṅkā ablaze (Sundara 5.53–55) | Narrated in Akṣa's onWin | Back to `lanka_city` with the flag `ch5.ablaze`. Four Kathā-only steps onto roofs (a new `roof_fire` tile, a flash), then the grove (Sītā is safe), then the leap home. | 5 | B |
| 11 | Vibhīṣaṇa's council (Yuddha 6.17–18) | Narration, choice, verse | Walk to Aṅgada ("test him"), then the existing choice, then the player speaks the vow: P1 on `s-sakrdeva:2` | 4 | D |
| 12 | Nala's bridge (Yuddha 6.22) | Narration | P5 puzzle: five columns are five days, with day lengths 14·20·21·22·23 yojanas (check against 6.22). Turn stones until the shore meets Laṅkā: at most 12 taps, a hint button, no way to fail. | 3 + 5 UI | D |
| 13 | Rāvaṇa (Yuddha 6.107–108) | Boss; the brahmāstra is decisive at half health | Phases. At half health a head falls and grows back: hits that don't fit cannot take him below 40 % (`kathaHeads`). Mātali's line plays once (`kathaMatali`), then the brahmāstra ends it. `lead: rama`. | 2 templates | C |
| 14 | The return (Yuddha 6.123) | Narration | Puṣpaka tour: five stops. At each, the verse spoken there is shown and the player names the place from 3 names already in `names.json`. | 2 | D |
| 15 | Lava–Kuśa (Bāla 1.4) | Vālmīki's epilogue | §5 | 8 + 4 UI | D |

About 55 story lines, about 20 UI strings, 2 battle templates and 2 names in total.

## 3. Playing as Hanumān (Sundara-kāṇḍa)
- **Maps:** `ocean_leap`, `lanka_gate`, `lanka_city` and `ashoka_vatika` (all in `story-ch5.json`).
- **Switching control:**
  - The Kathā block in `ch5.leap_start` sets `katha.hanuman`, with one line: you ride on his shoulder and guide his steps.
  - The fire sequence unsets it before `{warp: setu_shore}`, and `ch6.shore_start` unsets it again for older saves.
  - Because P4 also checks for chapter 5, a stale flag changes nothing.
- **Party and save:**
  - The party stays the student plus Hanumān. The student does the reciting; Hanumān's astras are `jaya_ghosha` and `anirveda`.
  - Every chapter-5 battle gets `lead: 'hanuman'`, a field only Kathā reads.
  - There is no new save field. A save made mid-book loads as Hanumān, and respawn keeps it.
- **Pointer:**
  - P3 keeps the pointer, `runGuide` and the RY_FULL bot out of the guards' sight.
  - The Akṣa step expects `ch5.aksha_defeated` in both journeys (practice sets it in the same script as `ch5.complete`).
  - The roof steps and the grove step (which sets `ch5.complete`) are Kathā-only.

## 4. Verse-chain duel (śloka-antyakṣarī)
- **Why lines and not whole verses:** chaining whole verses is too sparse, because almost every verse ends on म and only मा निषाद / मरणान्तानि can follow. Chaining pādas gives on average 4.4 possible next lines among the 84 pādas.
- **The rule:**
  - The key is the last consonant of the other side's pāda, found with `splitAksharas` (vowel signs, ं, ः and ् are ignored).
  - A valid answer is a pāda of a heard verse whose first consonant is the key.
  - No pāda is used twice in one duel.
- **A turn:**
  - Hanumān says a pāda in full, with the key akṣara highlighted.
  - The player picks one of 3 chips (full pādas, exactly 1 valid). The pick then recites itself, so a turn is one tap.
  - Hanumān answers from the sound the player's line ended on.
- **Misses and dead ends:**
  - A miss: the right line shimmers in, and the turn lands at half power.
  - If the player has no valid pāda, the chain resets to "any line".
  - If the player's line ends on a sound no remaining heard pāda starts with, Hanumān is stumped and the turn lands at ×1.5.
- **Wrong options:** they start with other sounds at L2–3, and with sounds from the same consonant group (varga) at L4.
- **Cannot be lost:** like the tutorial duel, Hanumān never strikes. His HP is 5 links × the lead's best hit.
- **Different from the recitation duel:** the recitation duel asks for the missing word inside a given line. The chain asks which line, anywhere in the book, opens with a given sound, and the player's choice steers where the chain goes.
- **Where it appears:** Hanumān at Kiṣkindhā 4.3; the practice game keeps its debate. Chain opponents are listed in `katha-chain.json`, so v0.6 can add more without code. At about 66 verses, the same rule gives roughly 13 possible next lines per sound.
- **Code:**
  - `logic-chain.ts` (`chainKey`, `chainOptions`, `chainTurn`)
  - a hook into `kathaDuelTurn` / `resolveTurn` in `logic-battle.ts`
  - Hanumān's turn handled like the tutorial duel's model line (`echoModel`)
  - the view in `view-chain.tsx`

## 5. Court-recital finale (Bāla 1.4)
A Kathā block at the end of `ch6.epilogue_valmiki` runs as one script, so the shared last walkthrough step does not change.
1. Vālmīki says he has taught the poem to Kuśa and Lava. Add `person.kusha` and `person.lava` to `names.json`, citing MW and Bāla 1.4.
2. Warp to `ayodhya_return` with the flag `ch6.recital`: the twins and Vālmīki are shown, and the coronation NPCs, including Sītā, are hidden. Bāla 1.4 does not place her there, and the Uttara-kāṇḍa is out of scope.
3. For each book 1–6:
   - `{book: n}` shows the review: verses heard and restored, lines recited.
   - The twins sing that book's key verse.
   - The player says its least-practised pāda (P1 with `"least"`). A mastered pāda recites itself.
4. Rāma listens with his brothers, moved. Vālmīki speaks a closing line.
5. `ch6.complete` and `{end}`. The ending panel lists all 21 verses with their state and the total lines recited. The outcome is *won*.

## 6. Work packages

| WP | Only this package edits | Scope |
|---|---|---|
| **0** — orchestrator, first | `types.ts`, `content.ts`, `sa-verify.ts`, `logic.ts`, `logic-events.ts` (`exec` hooks), `logic-sim.ts` (`botActions` hooks), `Game.tsx` (`expose`: `setu`, `playerSprite`, avoid marks), `view-panel.tsx` (routes to new panels), `world.test.ts`, `e2e.spec.ts` | P1–P7 stubs, `WalkStep.style`, the practice hash; moves `Bot`, `Snap` and `planAt` into a new `e2e-kit.ts`; pre-registers tests calling `e2e-v05b-{a,b,c,d}.ts`; registers the new Sanskrit files and the `collectStoryStrings` rule (Kathā text already in file 5 stays there; new Kathā text goes to file 6 for ch1–3, 7 for ch4, 8 for ch5, 9 for ch6) |
| **A** | `story-ch1..3.json`, `sa-dialogue-6.json`, `logic-scene.ts`, `view-scene.tsx`, `sa-ui-scene.json` | Scenes 1–4; P1 and P2 (landed on day 1) |
| **B** | `story-ch5.json`, `sa-dialogue-8.json`, `logic-guide.ts`, `logic-sundara.ts`, `view-screen.tsx`, `art-tiles.ts` | §3; scenes 7–10 |
| **C** | `story-ch4.json`, `sa-dialogue-7.json`, `logic-chain.ts`, `logic-battle.ts`, `logic-tactics.ts`, `katha.json`, `katha-chain.json`, `sa-battle.json`, `sa-ui-chain.json`, `view-chain.tsx` | §4; scenes 5, 6, 13 |
| **D** | `story-ch6.json`, `sa-dialogue-9.json`, `names.json`, `logic-setu.ts`, `view-setu.tsx`, `view-bookend.tsx`, `art-sprites.ts`, `sa-ui-setu.json` | Scenes 11, 12, 14, 15 |

**Order:**
1. WP0 first.
2. A, B, C and D in parallel. D waits on A's P1/P2 for the finale and uses stubs until they land.
3. Integration:
   - two model Sanskrit reviews, added to `REVIEW.md`
   - `PRD.md` and `notes/katha.md`, updated from each package's `notes/v05b-*.md`
   - the 0.5.0 version bump
   - RY_FULL

**Risks:**
- **Sanskrit volume** (about 75 strings). Reuse vocabulary that already verifies; for "become tiny" or "a head grows back", fall back to plain forms (वर्धते, लघुः भवति).
- **The practice journey drifting.** Covered by the hash, the `else` branches and the style-tagged steps.
- **Gate time.** About +15 % bot actions; RY_FULL Kathā should stay at or under 9.5 min (about 8 now).
- **Stealth soft-locks.** `world.test` checks that every lane entry still has a route around the guards' sight.
- **Chain dead ends.** `chain.test` covers every set of heard verses possible at the duel.
- **Tone.** Lava–Kuśa without any Uttara events; Hanumān drawn with dignity.

## 7. Acceptance tests
- **WP0:**
  - typecheck passes
  - the practice hash equals v0.5a
  - P1/P2/P5 commands outside a Kathā block fail `world.test`
  - Kathā-only steps are skipped in practice by `guideTarget`, `runWalkthrough` and `runGuide`
- **A:**
  - unit: each scene's flags in order; the deer's positions; Jaṭāyu's question loop ends
  - bots: perfect and 70 %, 25 seeds × L2–4, 0 lost fights
  - e2e (संस्कृतम्, 390×844): deer chase, then Jaṭāyu, with no Latin
- **B:**
  - unit: `playerSprite` only in Kathā chapter 5; `lead: hanuman`; being seen sends you back with no battle and no HP loss; `findPath` avoids active sight lines; Surasā can never be lost; roofs, then `ch5.complete`; save/load mid-book
  - bots: Kathā `runGuide`, 25 seeds, 0 times seen
  - e2e: the Hanumān sprite (`expose`); stealth by following the pointer, with no Latin; a practice chapter-5 save still has its patrol fight
- **C:**
  - `chain.test`: keys; exactly 1 valid option of 3, all verbatim heard pādas; no repeats; reset; the stumped bonus; cannot be lost; the practice debate unchanged
  - Rāvaṇa: the 40 % floor holds until the brahmāstra; Mātali's line plays once; the strategic bot needs at most 15 turns; the spammer and careless bots still win
  - e2e (360×640): the chips fit, a tap links; the Rāvaṇa phase lines show
- **D:**
  - `setu.test`: seeded, always solvable in 3–12 taps; hints lead to the solution; the bot solves it
  - finale: one `book` card and one recitation per book, then *won*; the practice epilogue is unchanged
  - e2e: the bridge puzzle by tap and by keys at 360×640; the finale from a late save, then *won* with Sanskrit rows
- **RY_FULL:**
  - Kathā in संस्कृतम्, following the pointer through every set piece (including Kathā-only steps):
    - the chain duel answered through `opt-*`, the bridge through `expose.setu.solution`
    - 0 times seen (2 tolerated), no Latin, no console errors
    - ending *won*, in at most 9.5 min
  - Practice in English: the same steps and battles as v0.5a, with no set pieces.
