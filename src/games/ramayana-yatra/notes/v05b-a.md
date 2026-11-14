# v0.5b WP-A: scenes 1–4 (Krauñca, Guha's ferry, the golden deer, Jaṭāyu); P1, P2

Owner: v05-A. Files: story-ch1/2/3.json, sa-dialogue-6.json, sa-ui-scene.json, logic-scene.ts, view-scene.tsx,
scene.test.ts, e2e-v05b-a.spec.ts, this file, style.css section "v0.5b WP-A".

## Status (resume here)
- [x] scene 1 Krauñca (ch1.krauncha, Kathā blocks inserted between the shared lines)
- [x] scene 2 Guha's ferry (ch2.guha, Kathā blocks between the shared commands)
- [x] scene 3 golden deer (mriga_vana chase_1..3 + Mārīca's cry)
- [x] scene 4 Jaṭāyu question loop
- [x] Sanskrit lines in sa-dialogue-6 (14 entries, sambhashana green)
- [x] P1 polish (view-scene head: "your line" + syllables; coach on the first recitation; sa-ui-scene; css)
- [x] scene.test.ts (13 tests: order of each scene, deer positions, skipped triggers, Mārīca's form, the Jaṭāyu loop in
      every order + 200 random runs, practice unchanged, bots perfect/70 % × 25 seeds × L2–4 for books 1–3)
- [x] e2e-v05b-a.spec.ts (4 cases: Krauñca recitation; ferry; deer chase → Mārīca's cry → Jaṭāyu with a misread;
      P1 at 360×640 by keyboard in both scripts) — green on my snapshot and on the shared tree (14 Nov, 12:40)
- [x] guard hash green (snapshot and shared tree); whole unit suite: 264/267, the 3 failures are Requests 1–2 below
- Screenshots (390×844, संस्कृतम्): /home/claude/scratch/v05b-a/shots/ (a1 Krauñca arrow + recitation, a2 ferry,
  a3 deer waits / shadows / Mārīca's cry, a4 Jaṭāyu's questions, a5 recitation at 360×640 deva + IAST)

## New Sanskrit (for the reviewers)
sa-dialogue-6.json: 13 lines + 1 speaker title; sa-ui-scene.json: 2 labels (scene.your तव पादः, scene.syllables
{$n} अक्षराणि). All pass the oracle. Check first: Sītā's prayer (हे गङ्गे मातः … वयं १४ वर्षाणि वने वत्स्यामः …),
the cry's title मारीचः, रामस्य वाचा (वाचा "with the voice of"), and Jaṭāyu's questions / gasped answer
(सीतां कः हृतवान्? · सः तां कुत्र नीतवान्? · आकाशेन… दक्षिणां दिशं गतवान्।). No file-5 entry became stale.

Working method: the shared tree is broken now and then by other packages' in-progress files, so tests run in a
private snapshot: /home/claude/scratch/v05b-a/wt (git archive HEAD + node_modules link); copy my files there with
/home/claude/scratch/v05b-a/sync.sh. The JSON edits are scripted: /home/claude/scratch/v05b-a/edit/{ch1,ch2,ch3,sa6}.py
(run on the HEAD versions of the story files: `git checkout HEAD -- content/story-chN.json` first).

## Design (what the player sees)
1. **Krauñca** (Bāla 1.2, tamasa_bank): the two birds turn to each other as they sing; the hunter steps out of the bushes
   (move 2 tiles); the struck bird is gone (flag `ch1.krauncha_fell` hides krauncha_a); Vālmīki turns to the hunter as the
   words rise out of his grief; after "Four quarters, eight syllables in each …" he faces you: "Say the first quarter with
   me" and P1 recites s-ma-nishada pāda 0 (laghu/guru marks; the head says ८ अक्षराणि; the coach line, since it is the
   player's first recitation).
2. **Guha's ferry** (Ayodhyā 2.52): fade; at the river steps Sītā, Rāma, Lakṣmaṇa and you step down into the boat (Kathā
   NPCs `*_boat`, flag `ch2.ferry_boat`); the boatmen row (the four move down a row together, one by one); mid-stream Sītā
   bows to the Gaṅgā and prays (to come home after fourteen years and worship her); one more row; fade; the far bank.
3. **Golden deer** (Araṇya 3.42–44, mriga_vana): at each chase trigger the deer bounds away and vanishes, to wait
   further on (deer_glimpse_1 → deer_k2 at (14,15) → deer_k3 at (25,7) → the clearing). In Kathā a later chase also sets
   the earlier flags, so a skipped trigger leaves no deer behind. At the third, "some of the deer around you are only
   shadows": three shadow deer show while the line is read. After the fight, Mārīca's cry is its own line, spoken
   "in Rāma's voice" (speaker title + Rāma's portrait), then "the cry rings on through the forest".
4. **Jaṭāyu** (Araṇya 3.67–68): after his verse, a question loop: "Jaṭāyu has breath for only a few words. What will you
   ask him?" — Who took Sītā? (Rāvaṇa, the king of the rākṣasas) · Which way did he take her? (through the sky, to the
   south) · Who are you? (a misread: he only gasps; the question again). Each answered question leaves the menu; when
   both are answered his last line follows ("But I am old … Go south").

## Requests (files I do not own)
1. **katha-content.test.ts (WP-C / orchestrator): two v0.4 rules contradict every v0.5b set piece.**
   - "choice blocks are well formed … nothing changes the game" allows only say/choice/label/goto/objective in a Kathā
     block. Set pieces need move/face/wait/fade/warp/set/unset/if and P1/P2/P5. Proposal: keep the rule for blocks that
     hold a top-level `choice` and no set-piece command (the v0.4 conversations); for the others require only that every
     flag they set/unset is Kathā-only (never read by a practice condition) and that `warp`/`move` targets exist.
   - "every line of a Kathā block is a file-5 story string" → files 5–9 (v0.5b rule: new Kathā text goes to 6–9).
   Until then these two tests fail on WP-A's (and B/C/D's) blocks.
2. **Balance (WP-C):** Subāhu + Mārīca (Bāla 1.30) is fragile for the census "70 % reciter" (policy best): ~19.7 turns
   on average, max 22. Any RNG shift can lose one of 75 runs: with WP-A's Krauñca recitation (one more reciter draw
   before the fight) seed 31679 L3 loses it once (katha.test "story bots play Kathā to the ending"). HEAD: 0 of 75.
   Trace: the bot spams the tired Vāyavya into Subāhu's rain of blood, Rāma falls at turn 7, Lakṣmaṇa at 12, the
   student at 15 with Mārīca at 3 HP. Any extra recitation before the fight (any pāda) gives the same loss; without the
   Krauñca recitation the census is as at HEAD. scene.test's bot test reports this as a diagnostic only.
3. **A boat (WP-B, view-screen.tsx), optional polish:** Guha's crossing moves four figures over water tiles; a small
   wooden hull drawn under any entity standing on a water tile (instead of its shadow) would make it a boat ride.
   The scene works without it.
