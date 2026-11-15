# v0.6 plan: 45 + 3 new verses, Paraśurāma, 13 special moments

Owner's decisions (14 Nov 2026, on the doc "Rāmāyaṇa-yātrā v0.6: candidate verses and special moments",
https://claude.ai/artifact/Y2BHQmnd2fPXXZrxFsZuaS; research in `notes/v06-verses*.md`):
- **Verses approved** as listed in the doc (integrator's choices in `notes/v06-verses.md`), with two changes:
  - Araṇya: Śabarī's anchor is her **critical-edition forest-food verse** (vulgate 3.74.17cd–18ab, CE 3.70.13), not 3.74.11.
  - **Add a text-accurate Paraśurāma scene** (Bāla 1.74–76, on the road home from Mithilā): he confronts Rāma, Daśaratha
    pleads, Rāma strings the Vaiṣṇava bow, and Paraśurāma recognises him as Viṣṇu. **Vālmīki only**: Lakṣmaṇa says
    nothing to Paraśurāma (his sarcasm is Tulsīdās's Rāmcaritmānas, a later telling; the owner chose not to use it).
    2–3 verses, including the recognition verse.
- **Mithilā: a told cutscene** (no new maps). It carries Ahalyā (hidden moment), the bow (set piece), Janaka giving Sītā,
  and Paraśurāma.
- **Nala's "Rāma's name on every stone" line: remove it** (a later tradition) — both journeys, with its Sanskrit entry.
- **Build all 13 special moments** (the doc's table).
- **Pacing (owner, 16:28):** "don't belabor the user with excessive practice … don't let it slow the progression too much."
- **Sanskrit (owner):** audit all new Sanskrit; keep it simple, as before (Sambhāṣaṇa Level 1–3, short sentences).

## 0. Rules for every package
1. **Kathā only.** New verses, lines and set pieces live in `{ "if": "style.katha", "then": [...] }` blocks (Nala's line
   removal is the one change to shared text). The practice journey must stay identical: `V03_SNAPSHOT` and the
   "v0.5b guard" (`V05A_PRACTICE`) in logic.test stay green. v0.6 verses and lexicon are **Kathā-only content**: WP0
   filters them out of everything the practice game reads (challenge pools, distractors, chapter fallbacks, verse book).
2. **Pacing budget.** New verses are **heard** (verse moments, `mode: "hear"`), never new gates. No new astras, no new
   required recitations, no new shrine requirements; the book gates stay the v0.5 key verses. A verse moment is
   skippable at once (tap / A), as today. At most **one optional story recitation (P1) per book** for a new verse.
   Budget, measured by the Kathā census bots (katha.test): **≤ +10 % actions and ≤ +12 recitations per playthrough**
   versus v0.5.1, and **0 lost fights**. Set pieces are short (≤ 15 s each on the main path; hidden ones optional);
   any interaction in them is one tap/key, can't fail, and has a reduced-motion path.
3. **Sanskrit.** Verse text comes from the live valmikiramayan.net page, re-fetched by the package (the research
   used a model-summarising fetch tool: never trust it letter by letter), checked against a second source; the
   joined (saṃhitā) form follows the game's precedent; every word gets a lexicon form; `checkAnustubh` + meterNote
   where needed; `joinSandhiDeva` rebuild. New dialogue lines: Level 1–3, ≤ ~10 words a sentence, glossary of
   notes/sa-ui.md, oracle-verified. Two model reviews (rev1, rev2) go into REVIEW.md before release.
4. **Fidelity.** Events follow Vālmīki; no later traditions (no floating name-stones, no tasted berries, no
   Lakṣmaṇa–Paraśurāma exchange); Sītā's fire ordeal is not a set piece.
5. **Tests.** Each package adds unit tests and e2e cases (its own spec file), keeps the whole unit suite green on its
   own files, and never edits another package's files: it writes a request in its notes file instead.

## 1. WP0 (groundwork, first) — owner: v06-WP0
- **Content loading:** `shlokas-3.json` (A), `shlokas-4.json` (B), `shlokas-5.json` (C); `lexicon-3/4/5.json` with
  **merge by id** (an entry whose id exists in an earlier file only adds forms; lemma / pos / meaning must agree; a
  test checks it); `katha-verses-3/4/5.json` (anvaya + सरलार्थः, same schema as katha.json → verses), merged;
  new names in per-package `names-3/4/5/6.json` (A/B/C/D), merged; the new verses join their chapter's `shlokaIds`.
- **Kathā-only filter** (rule 1) with tests: practice hashes unchanged with the new files present.
- **Sanskrit files:** `sa-dialogue-10.json` (A: ch1–2), `-11` (B: ch3–4), `-12` (C: ch5–6), `-13` (D); the
  `collectStoryStrings` rule (lines held in 5–9 at v0.5.1 stay there; new Kathā lines go to 10–13 by chapter /
  package); `sa-ui-v06.json` for shared UI strings, `sa-ui-v06-a/b/c/d.json` per package if needed.
- **Effects kit** (event commands + view, reduced-motion paths, e2e-exposed): `{"fx":"shake"|"flash"|"petals"|"rain"
  |"tint", ms?}`, `{"topple": ids | {"allBut": ids}}` / `{"rise": …}` (NPCs and the player fall and stand up),
  `{"grow": id, "scale": n}` (sprite scale), `{"glow": {x, y}}` (a tile shimmer / hotspot), `{"prop": …}` (a small
  object sprite placed, moved, carried), `{"arrow": {from, to, through}}` (a projectile line across tiles).
- **Told cutscenes:** generalise the Āditya-hṛdayam engine into scripted cutscenes: `content/cutscene-<id>.json`
  (steps: narration sa/en, verse by `shlokaId` with pādas lit, painted 2D scene by painter id, fx, wait, and a
  **hotspot** step for hidden moments), started by an event command `{"cutscene": id}` (Kathā blocks), replayable
  from the verse book once seen; painters registered per package (`cutscene-paint-a.ts` …), 3D scenes registered
  for D. The Āditya scene keeps working unchanged (its tests).
- **Verse book & book screens** scale to ~13 verses a book without making progress look like failure (e.g. the
  book-complete numbers: heard n / total, restored counts only restorable verses); the Kathā ending lists all verses.
- **Echoes / titles:** a tiny "verse echoes" record (flags) and a title line in the verse book (used by C).
- **Art:** per-package sprite files `art-v06-a/b/c/d.ts` (empty stubs registered in the catalog).
- **Tests & e2e:** `e2e-v06-{a,b,c,d}.spec.ts` registered in e2e.spec.ts; e2e-kit Bot handles the new pendings
  (cutscene, hotspot) the way it handles v0.5b ones; the full playthrough (RY_FULL) must still finish.
- **Ownership file:** `notes/v06-ownership.md` (shared files stay WP0's; packages request hooks).

## 2. Packages (content phase can start at once; story/set pieces after WP0 lands)
| WP | Books | Verses | Special moments | Also |
|---|---|---|---|---|
| **A** | Bāla, Ayodhyā | 8 + 8 (+ 2–3 Paraśurāma) | Mithilā told cutscene: **Ahalyā** (hidden hotspot), **the bow breaks** (flash, shake, all fall but four, rise; petals for the wedding), Janaka gives Sītā, **Paraśurāma** (Vālmīki only); **the sandals** (map set piece at Citrakūṭa) | story-ch1/2 |
| **B** | Araṇya, Kiṣkindhā | 7 + 7 (Śabarī: CE forest-food verse) | **The deer show the way** (3.64; confirm verses), **the trees remember** (hidden), **one arrow, seven trees**, **Hanumān grows** on Mahendra | story-ch3/4 |
| **C** | Sundara, Yuddha | 7 + 8 | **The launch** (hold, then "like Rāma's arrow"), **the honey grove** (hidden dance), **the Ocean rises**, **waking Kumbhakarṇa** (comic; optional drum gag), **same words, two counsellors** (hidden), **verse echoes** (title) | story-ch5/6; remove Nala's name-stones line |
| **D** | Yuddha | — (uses C's 6.74.33) | **The mountain of herbs**: a second 3D cutscene on the Āditya engine, with the one choice "take the whole mountain" | cutscene + 3D scene + painter; C places `{"cutscene":"herbs"}` |

Then: rev1 + rev2 (Sanskrit: verse data, anvaya, सरलार्थः, dialogue; verse text re-checked against the live pages),
the full gate, RY_FULL both journeys, the census budget, version 0.6.0, docs (PRD, katha.md, REVIEW.md), release.

## Baseline for the pacing budget (v0.5.1 census, katha.test, 75 runs per bot)
Per playthrough — strategic: 1533 actions, 110.3 recitations · spammer: 1733, 110.4 · 70 % reciter: 1782, 136.5 ·
careless 70 %: 1767, 113.5. Budget for v0.6: ≤ +10 % actions and ≤ +12 recitations for each bot; 0 lost fights.
