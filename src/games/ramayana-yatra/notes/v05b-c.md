# v0.5b WP-C — the verse-chain duel; scenes 5, 6, 13 (P6, P7)

Status: **done** (14 Nov). A resumed run only needs to re-run the checks below.

## What was built
- **Scene 5, the verse-chain duel (śloka-antyakṣarī), Kiṣkindhā 4.3** — logic-chain.ts, battle hook in logic-battle.ts,
  view-chain.tsx, content/katha-chain.json (hanuman_duel, 5 links). Kathā only (isChainDuel); the practice debate is unchanged.
  - Key = last consonant of the pāda (finals first, else the onset; ं ः ् vowel signs ignored); head = first consonant
    (a vowel-initial line opens with none). Groups: varga, else the semivowels / the sibilants + h.
  - Turn: Hanumān's line (a model beat), then an 'antya' pick: 3 full heard pādas, exactly 1 opens with the key (wrong
    chips: another group at L2–3, the key's own group at L4+). One tap; the pick recites itself; a miss says the right
    line at half power. Reset (no unused pāda opens with the key): "any line", all 3 chips valid. Stumped (the player's
    line ends on a sound nobody can answer): × 1.5 and Hanumān opens a fresh chain. No pāda twice. Never strikes.
  - Steering: the valid chip and Hanumān's lines are the ones after which the chain goes on longest (DFS look-ahead,
    CHAIN_LOOK 16 lines, 3000 nodes). At the duel (13 verses, 52 pādas) the longest chain is 11 lines = opening + 5
    links: a perfect player links exactly 5 times with no reset (HP = links × the line's hit at its lowest roll).
  - Story (Kathā block, ch4.mendicant): Hanumān's 2 rule lines; onWin: "A fine chain! …".
- **Scene 6, Jāmbavān's roll call** — Kathā objective "Ask each vanara how far he can leap."; each vanara sets
  `ch4.roll_<id>`; after all four: "Every vanara has spoken…" + the old objective + `ch4.roll_call`; Aṅgada's gate
  (Kathā, `style.katha&!ch4.roll_call`); 4 Kathā-only walkthrough steps (gaja, gavaksha, sharabha, mainda).
- **Scene 13, Rāvaṇa in phases (P7)** — katha.json `tactics.phases`: ravana_heads (≤ 50 %, floor 40 %, fit brahmāstra,
  beat kathaHeads, Yuddha 6.107.55–58), ravana_matali (≤ 40 %, kathaMatali, once, 6.108.1–2); both `requires:
  "seen.aditya"` (owner, 14 Nov: package E's Āditya-hṛdayam cutscene, Yuddha 6.105, at ≤ 60 %). Until the flag: every
  blow, the brahmāstra too, is held at 40 % (Rāvaṇa cannot be finished), no phase begins, the brahmāstra is not
  decisive. After it: non-fit blows held while the hero in front holds the brahmāstra (heads line each time; a spent
  brahmāstra gets 1 PP back), Mātali once, then the brahmāstra decides (tactics.fits). logic-tactics phasesOf /
  phaseOpen / phaseFloor / phasesBegun; isDecisive(…, flags?) (no flags = no requirement: logic-sim's call is unchanged).
- **Package A's requests (orchestrator, 14 Nov):**
  - katha-content.test: Kathā blocks may hold any story command (world.test validates them); the choice conversations
    keep their form (a reply sets no flag, a misread changes nothing and returns; the plays test advances the lines /
    verses before the question and lets the bot finish a set piece). A Kathā line's Sanskrit lives where
    collectStoryStrings puts it (5 or 6–9), or with the practice line it shares. Story bots there play `STORY`: REAL,
    or REAL with the phases' `requires` lifted until logic-cutscene.ts exists.
  - The sacrifice fight (Subāhu + Mārīca): the rain of blood falls on the altar (Bāla 1.30.12), so its strike costs the
    heroes half (katha.json warnings `strikeScale: 0.5`, logic-tactics `strikeScale`, used in foeStrike), and the Mānava
    counters it (1.30.15). Census (25 seeds × 3 levels, HEAD ch5, hymn assumed): 0 lost fights for strategic, spammer,
    70 %, careless, spam70, strat70 (seed 31679 L3 fixed); bosses spammer 11.87 vs strategic 8.97 = 1.32×; sacrifice
    2.0 / 20.7 turns; 360 extra 70 % fights (40 seeds): no hero falls.
- Sanskrit: sa-dialogue-7 (6 lines), sa-battle (5 templates: kathaChainRule, kathaChainSays, kathaChainStumped,
  kathaHeads, kathaMatali), sa-ui-chain (8 keys). All oracle-verified.

## Checks (all green for my files)
- full unit suite (14 Nov, last run): 305 / 313 pass; the 8 failures are all "Kathā story bot stops at Rāvaṇa"
  (request 1: E's hook) — guide.test ×2, bookend.test ×3, katha.test ×2, v05b-hooks ×1.
- unit: chain.test (7), tactics.test (16, incl. 5 phase tests and the rain-of-blood share), sa-battle.test (10), katha-content.test, world.test,
  sambhashana (my file 6/6), sa-ui; "v0.5b guard" hash unchanged.
- census (scratch, HEAD ch5 because WP-B is mid-work, hymn assumed): Rāvaṇa strategic 5.2 turns, spammer 11.8,
  70 % 9.3, careless 12.4; bosses spammer/strategic 11.82/8.97 = 1.32; Hanumān duel 5.0 (perfect) / 6.0 (70 %).
  The 70 % bot's 1 lost fight is ch1 subahu+maricha (WP-A's ch1 changes shift the rng; no code of mine runs there).
- e2e (`v0.5b C`, 3 cases): chain duel 360×640 संस्कृतम् (chips fit, a tap links, a miss shimmers, win); roll call;
  Rāvaṇa heads → Mātali → brahmāstra. Shots: /home/claude/scratch/v05b-c/shots/.

## Requests (files I do not own)
1. **Package E / orchestrator — the hymn gate:** Kathā Rāvaṇa cannot be finished until `seen.aditya` is set. Until E's
   logic-sim bot hook (`cutscene-done` when `cutsceneDue`) and Game.tsx overlay land, every Kathā story bot stops at
   Rāvaṇa: katha.test (story bots, census, wording, choice play), guide.test (REAL story, pointer bot), bookend.test
   (next-book), v05b-hooks (Kathā runWalkthrough). To ship without E, drop the two `"requires"` in katha.json phases.
   My tests use E's module when present (tactics.test `hymnIfDue`), else set the flag at ≤ 60 %. My e2e pre-sets
   `seen.aditya` in the Rāvaṇa save; once E's overlay exists, drop that and click through it.
2. **types.ts:** add `requires?: FlagCond` to `KathaPhase` (logic-tactics reads it through a local `PhaseDef`) and
   `strikeScale?: number` to `KathaTactics.warnings[]` (read through a cast in logic-tactics `strikeScale`).
3. **story-ch6.json (WP-D):** add `"lead": "rama"` to the Rāvaṇa battle spec in `ch6.ravana` (Rāma leads already by
   kathaLead, but the plan asks for it explicitly).
4. **katha.test.ts:** the story-bot check "a classic challenge in a Kathā battle" must allow `kind === 'antya'`. (The
   v0.4 Kathā-block rules lived in my katha-content.test.ts: relaxed, see above.)
5. **v05b-hooks.test.ts:** "a Kathā-only step is skipped…" / "runWalkthrough skips…" assume REAL has no Kathā-only steps.
6. **view-battle.tsx (nobody's):** optional — the Versus bar says वादः in the chain duel; पादानां क्रीडा (sa-ui-chain
   `chain.badge`) would fit better.
7. Teacher review first: kathaChainRule ("यः पादः तस्य अन्तिमेन वर्णेन आरभते, तं वद!"), the rule line in file 7 ("मम
   पादस्य अन्तिमेन वर्णेन त्वं पादम् आरभस्व।"), kathaHeads ("… नूतनं शिरः पुनः उद्भवति!").
