# QA playtest report (fresh-eyes agent, 01:30 ET). Screenshots: /home/claude/scratch/qa/shots/

**No P0** (no crash, soft-lock, console error, raw markup, or Devanagari leak outside lipi). Platform drop-2 virāma fix confirmed.

## P1
1. **[view] Recital counter off by one.** It shows "Recital 2/6 … 7/6". logic-learning.ts already sends 1-based `step` (`step: 1`, `step: done + 1`), and view-challenge.tsx:109 adds 1 again.
2. **[view] lipi feedback in IAST mode shows Devanagari.** FeedbackPanel → OptionLabel (view-challenge.tsx ~25-27, 196-210) uses `o.script` without the lipi flip() that ChallengeBody applies. Show both scripts ("यथा = yathā").
3. **[core/story] After ch1 completes, Continue lands in Ayodhyā with the stale ch1 objective,** and the party HP is carried over (0 HP heroes). Heal the party on chapter completion and set the next objective at completion.
4. **[view] Verse card: the translation sits far below the fold inside an inner scroller with no cue.** At 360×640 only 3 of 4 pādas are visible. Show the translation under the pādas (collapsible) plus a scroll cue/fade.
5. **[view] vibhakti question "in line 4 of its verse" shows only the word.** Show the pāda (challenge.shlokaId + padaIndex) with the word highlighted. The same applies to purana/viccheda context and the verse reference.
6. **[view] Touch targets under 44 px at 360×640.**
   - Verse word chips vw-*: 34 px.
   - 36 px: Padakośa filter/book chips, Settings toggles/speed buttons, detail-back, equip Cancel/Equip, shop buy-*.
   - 32 px: edit-moves-*, form-ref-*.
7. **[view] Menu → Words (360, IAST): long words hard-clipped mid-word with no ellipsis.** Wrap or shrink instead.

## P2
8. **[view] Menu sub-views:** Esc/X closes the whole menu. It should go back one level.
9. **[view] Timeout shows "Not quite"** with no "Time's up" title.
10. **[view] Canvas foe nameplate truncates to "YATUDHANA DEMO".** Use a short label (truncate on a word boundary or use the name only).
11. **[core/battle] Item on a full-HP hero:** no feedback from the menu (no toast). In battle there's no choice of target.
12. **[view] Equip editor at 4/4 equipped:** tapping a 5th move does nothing, with no hint.
13. **[view] Move list:** status moves show only "status". Show `MoveDef.description`.
14. **[view] New journey:** the name field is prefilled "Shishya" and not selected, so typing appends. Select on focus, or use a placeholder.
15. **[view] Empty space:** a 150–200 px empty band on title/new-journey at 390×844. A one-line dialogue sits in a ~1,100 px box with ▶ far away.
16. **[view] Landscape 844×390:** the controls are below the fold. The canvas `touch-action:none` blocks page scroll.
17. **[view] Desktop 1280×800:** a narrow column. Use two columns (canvas left, panel right) from ~1000 px, and hide the D-pad when there's no touch. The last option is clipped at the panel bottom.
18. **[view] viccheda at 360 IAST:** the 2-column grid overflows by 4 px, and multi-word options wrap per word.
19. **[content]** Mixed romanisation in English UI ("Valmiki" vs "Vālmīki").
20. **[view] Rapid A presses skip verse cards unread.** Add a ~500 ms input guard on newly shown cards.
21. **[view] Menu sheet:** focus is not trapped (Tab escapes to the shell).
22. **[view] Fainted hero is still drawn standing at 0 HP** (forced switch). Dim it.
23. **[story/battle] Tāṭakā trigger can start the boss with exhausted heroes.** Give a rest/heal prompt before ch1–3 bosses, like ch4–6's "Rest and save, then fight".
24. **[core] Result summary:** "chapter 1" while the UI says "Book 1". The summary is duplicated with the headline.
25. **[view] Shop:** 15 rapid taps spend all niṣka. Add a quantity step or debounce.
26. **[logic] The very first story question is timed.** Make story `{quiz}` challenges untimed; keep battle timers.
27. **[minor]** Menu opens during a warp. A corrupt save is dropped silently. The canvas scales by a non-integer factor.

## Performance
- Game chunk: 836 kB raw / 183 kB gzip. App entry: 66 kB gzip.
- Frames: 16.7 ms avg, p99 16.8 ms. Under 4× throttle, walking p99 is 50 ms.
- Heap is flat (~6.8 MB). No listener leak.
