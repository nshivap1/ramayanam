# v0.5b WP-D: Vibhīṣaṇa's council, Nala's bridge, the Puṣpaka return, the Lava–Kuśa finale (P5)

Owner: v05-D. Plan: [v05b-plan.md](v05b-plan.md) §1 P5, §2 scenes 11, 12, 14, 15, §5. Ownership: [v05b-ownership.md](v05b-ownership.md).

## Sources checked (this session, valmikiramayan.net, vulgate numbering)
- **Yuddha 6.22.66–70**: the bridge per day — 14, 20, 21, 22, 23 yojanas; **6.22.74**: a hundred yojanas long, ten wide;
  6.22.61, 72: Nala built it. Fetched twice (the Devanagari page and the roman / translation page). The figures are used
  (SETU_DAYS, the stones' labels, one narration line). Note: the site numbers these verses 66–70, not 68–72.
- **Yuddha 6.123**: from the Puṣpaka Rāma shows Sītā Laṅkā (3–4), Nala's setu (16), the Setubandha where Vibhīṣaṇa came
  (20–21), Kiṣkindhā (22), Ṛśyamūka (38), Pampā (40), Janasthāna (42–43), Pañcavaṭī (44–45), Citrakūṭa (51),
  Śṛṅgaverapura (54), Ayodhyā (55).
- **Bāla 1.4**: Vālmīki teaches the poem to Kuśa and Lava (3–6, 12); they sing it to sages (13–26), then in the streets of
  Ayodhyā, where Rāma sees them and brings them to his palace (27–30); Rāma sits on the throne with his ministers and
  brothers (30) and tells Lakṣmaṇa, Śatrughna and Bharata to listen (31–35); he is absorbed in it (36). Sītā is not in the
  court; **Vālmīki is not said to be there either** (so he stays at the āśrama in the game; see Decisions).
- Yuddha 6.17 (Aṅgada: one who comes from the enemy must be tested) and 6.18.33–34 (the vow; "bring him, I have given him
  fearlessness") from reference knowledge, not fetched: kept generic in the lines (no verse numbers on screen).

## Status (14 Nov) — all built; my tests green; some suite failures are other packages' in-progress work (below)
- [x] P5 `logic-setu.ts` + `setu.test.ts` (8 tests)
- [x] `view-setu.tsx` + `sa-ui-setu.json` (13 keys) + my style.css section
- [x] `story-ch6.json` scenes 11, 12, 14, 15 + two Kathā-only walkthrough steps. **Generated** by
      `/home/claude/scratch/v05b-d/build_ch6.py` from `git show HEAD:…/story-ch6.json` (re-run after editing the script;
      once the orchestrator commits this work, its asserts fail: edit the JSON directly from then on)
- [x] `sa-dialogue-9.json` (29 lines, all verify) — filled by `/home/claude/scratch/v05b-d/fill9.py` (the SA table is there)
- [x] `names.json` person.kusha / person.lava; sprites `kusha` / `lava` (art-sprites.ts CHARS, catalog SPRITE_IDS); art tests green
- [x] `view-bookend.tsx` `KathaEnding` (all 21 verses by book, state, lines recited) — **needs routing** (Requests)
- [x] `bookend.test.ts` (finale ×7; Kathā-only-step fixes), `yuddha.test.ts` (scenes 11, 14; 4 tests)
- [x] `e2e-v05b-d.spec.ts`: 5 cases, all pass (bridge by tap and by keys at 360×640; council; Puṣpaka; finale → won)
- [x] screenshots `/home/claude/scratch/v05b-d/shots/` (read and checked)

## What the player does
- **11 Vibhīṣaṇa's council** (Kathā): talking to Vibhīṣaṇa plays his arrival and Sugrīva's warning, then Rāma asks his
  counsellors (objective: ask Aṅgada). Talking to him again first: "Vibhīṣaṇa waits." Aṅgada (by the huts): "He has come
  from our enemy. Let Rāma test him first." Back at Vibhīṣaṇa: Hanumān's word, the v0.4 question (what does he ask?), the
  vow (verse moment), Rāma: "Go, bring him to me. Say my vow to him." → **the player says pāda 2 (अभयं सर्वभूतेभ्यो)**
  (P1) → "Vibhīṣaṇa hears the vow and comes down from the sky" → the shared ending (he joins). Practice: unchanged (one
  talk, the quiz). Walkthrough: two `style: 'katha'` steps (`talk vibhishana → ch6.council`, `talk angada_s →
  ch6.council_angada`) before the shared `talk vibhishana → ch6.vibhishana_joined`.
- **12 Nala's bridge** (Kathā): after the shared lines (the Ocean, Nala, five days of carrying), Nala: "Let every stone sit
  true. Then the bridge will reach Lanka." → **the puzzle** → "Fourteen yojanas on the first day; then twenty, twenty-one,
  twenty-two and twenty-three. A hundred yojanas in all." → the shared last line. The puzzle: one row — the shore, five
  stones (the five days; their yojanas under them in Devanagari digits), Laṅkā. Each stone is a span seen from the side
  (sky, sun, deck, rocks, sea) set down turned 90/180/270°; a tap turns it a quarter; a stone that sits true is set (gold)
  and stays put, so a bridge takes exactly its 3–12 taps; "Ask Nala" marks the first stone (day order) not yet true;
  "bridge: n / 100 yojanas"; once whole: "The bridge is whole! It reaches Laṅkā." and ▶. Keys 1–5 and Z.
- **14 the Puṣpaka** (Kathā, in Rāvaṇa's onWin after boarding): "From the Pushpaka, Rama shows Sita the places of their
  story." Five stops in 6.123 order; at each the verse heard there (verse moment), then "Rama asks you: 'Where did we
  hear this verse?'" with three place names (locatives of names.json places): s-anirvedah → Laṅkā · s-sakrdeva → the
  ocean shore · s-naham-janami → Ṛśyamūka · s-golden-deer → Pañcavaṭī · s-ramo-dvir → Ayodhyā. A wrong name: Rāma "Not
  there. Look down again." and the same question. No flags. Practice: straight home.
- **15 the Lava–Kuśa recital** (Kathā, end of `ch6.epilogue_valmiki`, one script): Vālmīki: Kuśa and Lava have learned the
  whole story; go with them to Ayodhyā and sing it before Rāma → fade → `ch6.recital`, warp to the court (the twins on the
  carpet; Sītā, Kausalyā, Hanumān, Sugrīva and the vānara hidden; Rāma, Bharata, Lakṣmaṇa, Vasiṣṭha, citizens stay) →
  narration (1.4.27–31), Rāma: "Brothers, listen. These two sing a great story." → "{player}, sing with them: say one line
  in every book." → **per book 1–6: "Kusha and Lava sing." · the key verse (verse moment) · the player says its
  least-practised pāda (P1 "least") · the book's card (P2)** → "Rāma listens with his brothers. His whole mind is on the
  story." → fade, unset `ch6.recital`, back at the Tamasā → Vālmīki: "As long as there are mountains and rivers, Rāma's
  story will live." (Bāla 2.36–37, Brahmā's blessing, recalled) → the shared last line, `ch6.complete`, save, end → won.

## Decisions
- **Puzzle model:** "turn stones until the shore meets Laṅkā" as a 1-row picture puzzle (every turn visibly different:
  the sea below, the deck level), not pipes; `solution` is all 0; true stones lock (no tap is ever wasted, so "≤ 12
  taps" holds exactly and nothing can be lost). Seeded by the save's seed + the tag (`setuPuzzle`); ≥ 3 stones out of true.
  The view keeps a running angle per stone so 3 → 0 turns forward.
- **Finale order per book:** verse → line → card (the plan had the card first). The card's title is "<book> समाप्तम्"
  (complete), which reads right after the book was sung, and its "lines recited" then counts the line just said.
- **Vālmīki stays at the āśrama** (Bāla 1.4 does not put him in the court; his presence there is Uttara). He sends the
  twins and the player, and speaks the closing line back at the Tamasā. The plan said "the twins and Vālmīki are shown".
- **Nala's shared line** keeps "Rāma's name on every stone!" (a later tradition, not 6.22; in both journeys at v0.5a). I
  did not change shared text (its Sanskrit is in file 3). For review.
- **Puṣpaka:** one Kathā block for the scene (katha-content wants one choice block per scene); no flags; a distractor is
  never a place where the verse was also heard or recited.
- **Story structure:** linear scripts with Kathā-only inserts (no practice-only blocks, no shared line inside a Kathā
  block), so collectStoryStrings keeps shared lines in file 3 and file 9 holds only new lines; the practice journey runs
  the same commands as v0.5a (+ no-op labels). Guard hash green.
- **Twins' sprites:** child figures, Rāma's skin tone (1.4.10–11: his likeness), ochre hermit cloth, a vīṇā; Kuśa a
  topknot, Lava a tuft.
- **Ending panel:** `KathaEnding` reuses existing keys (end.*, bookEnd.*, verses.restored, common.heard) + one new
  (`setu.endAll`); rows `ending-verse-<id>` with `data-state` (restored · heard · new) and `data-recited`.

## New Sanskrit (29 story lines in sa-dialogue-9, 13 UI strings in sa-ui-setu; all oracle-verified; no new models)
Teacher, check first: (1) the vow line "गच्छ, तम् अत्र आनय। मम व्रतं तस्मै वद।"; (2) the day line
"प्रथमे दिने १४ योजनानि। ततः २०, २१, २२, २३ च। सर्वं मिलित्वा १०० योजनानि।" (मिलित्वा for "in all"); (3) the closing
line "यावत् पर्वताः नद्यः च सन्ति, तावत् रामस्य कथा जीविष्यति।". Also: रामः आसने उपविशति (आसनम् for the throne;
सिंहासन is not in the packs); अङ्गदस्य मतं पृच्छतु (मत kta as "counsel"); the locatives of the place options.

## Tests (14 Nov)
- Mine: setu.test 8/8, yuddha.test 4/4, bookend.test finale 7/7 + "stop here" fixed; e2e V05B_D 5/5; guard hash green;
  sambhashana and sa-ui green; typecheck clean.
- Full unit suite (game): 298 pass / 14 fail. Failing because of other packages' in-progress work: the Kathā story bot
  loses Rāvaṇa (C, scene 13), so every test that plays the whole Kathā walkthrough fails at walkthrough[76] — bookend
  "next-book (katha …)" ×2 and "nothing happens …", guide.test "guide on the REAL story", the pointer-following bot,
  "story bots finish in both journeys …", katha.test "story bots play Kathā …" (also C's 'antya'); katha-content Surasā
  (B). My finale / setu / yuddha tests stop before Rāvaṇa on purpose.
- Failing by design (v0.4 rules that every package's set pieces break; orchestrator, Request 3): katha-content "choice
  blocks are well formed … nothing changes the game", "each choice block plays" (the Puṣpaka is a set piece: the question
  is not its first command), "every line of a Kathā block is a file-5 story string", "the story bot meets only its own
  journey's wording" (B's ch5 lines), v05b-hooks "{setu} … skipped" (Request 2) and the two Kathā-only-step counts
  (Request 5).

## Requests (files I do not own)
1. **view-panel.tsx `EndingPanel`**: route a Kathā save to the new ending —
   `if (isKatha(state.save)) return <KathaEnding state={state} recited={props.recited} onFinish={onFinish} />;`
   (import `KathaEnding` from './view-bookend'). Plan §5.5. My e2e finale test then also checks the 21 rows (it does so
   whenever `[data-katha]` is present).
2. **v05b-hooks.test.ts line 269** ("{setu} is wired (skipped until WP-D lands the puzzle)"): the puzzle now pends in Kathā
   — expect `pending.kind === 'setu'` there (the practice line stays `say`).
3. **katha-content.test.ts** (v0.4 rules): exempt v0.5b set pieces — Kathā blocks that hold `smarana` / `book` / `setu` /
   `shloka` / `warp` / `set` / `fade` — from "a Kathā choice must not change …" and "each choice block plays", and let
   files 6–9 hold Kathā lines ("file 5 only"). Mine: ch6.vibhishana_refuge, ch6.angada_shore, ch6.nala, ch6.ravana,
   ch6.epilogue_valmiki, ch6.twins.
4. **PRD / katha.md / REVIEW.md** at integration: the scenes above; Sanskrit review of the 29 + 13 lines; names
   person.kusha / person.lava (Bāla 1.4 fetched, MW asserted); the fidelity note on Nala's shared line.
5. **v05b-hooks.test.ts lines 104 and 118** assume REAL has no Kathā-only steps of its own (they insert one synthetic
   step and compare with `REAL.walkthrough.length` / `shared.length + 1`). With the packages' real Kathā-only steps (mine:
   ch6.council, ch6.council_angada; also B's and C's) they fail: count the journey's steps (`journeySteps`) instead.
6. Stale file-5 entries: none (I rewrote no Kathā line that file 5 holds).

## Next (if resumed)
- Nothing open in my files. Re-generate only while story-ch6.json at HEAD is still v0.5a + WP0:
  `python3 /home/claude/scratch/v05b-d/build_ch6.py && python3 /home/claude/scratch/v05b-d/fill9.py`.
