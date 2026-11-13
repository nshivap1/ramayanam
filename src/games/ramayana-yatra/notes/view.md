# view: notes (Game.tsx, view-*.tsx, input.ts, style.css, e2e.spec.ts)

Status (00:50 ET, final): the UI is integrated with the real logic and content. `node tools/test.mjs e2e ramayana-yatra`: **6/6 green**
(1 intro → verse card → tutorial duel → menu → Rest & end session · 2 wrong answer → feedback with the correct answer ·
3 IAST verse card · 4 360×640 keyboard-only walk + talk + menu · 5 injected ch1-finale save → chapter complete → result
`completed`, save resumes at the book-2 start map · 6 injected late-game save → Rāvaṇa → ending → result `won`).
Contract tests pass (10/10), the typecheck is clean, and `node tools/check.mjs --e2e --game=ramayana-yatra` → ALL CHECKS PASSED.
Stability: the three longest tests passed 8 runs in a row after hardening (see "Flake fixed" below).
Screenshots: `/home/claude/scratch/view/final/*.png` (title 390/360, new journey, chapter curtain, dialogue with speaker
bubble, shrine, krama, feedback, shop, menus, ending, battle, dark, IAST, desktop, sandhi notes, equip).

## Flake fixed (00:40)
1 of about 10 runs of the chapter-completion test got stuck. Two fixes: the e2e walkability-grid cache key now uses the
exact flag set + npcPos (before, only the counts were used, and a set+unset of temporary flags could leave a stale grid), and
the injected ch1 party is now L14. The bot now prints its last 40 decisions when it gets stuck.

## Orchestrator notes (00:20), done
1. Title canvas: Vālmīki and the student stand on the near sandbank (art ALLY platform ≈ 66,153), the krauñca pair on the far
   one, and the logo sits bottom-right over the water.
2. Title panel: the first verse (s-ma-nishada, from content) as an epigraph, the tagline, and (on tall screens ≥ 760 px) the
   manifest's how-to-play steps, so 390×844 no longer looks empty.
3. Autosave is calm-only: `persist()` writes only when `mode === 'explore' && !pending` (or `mode === 'ended'`). Chapter
   completion marks the save dirty, and it is written at the next calm moment (the e2e test checks that the save is at the
   book-2 start map, not mid-event). The one exception is the story's own `{save}` / shrine Save pending, which the reducer
   contract asks the view to write. It is written there and then again at the next calm moment.
   FYI core/story-a: after the ch1 finale's `{warp: ayodhya_city}`, `save.chapter` is still 1 at the calm moment (the ch2 title
   runs from the fallback trigger on the first step). The chapter-complete card says "Book 1 complete", which is correct.

## Files
| file | what |
|---|---|
| `Game.tsx` | content/art/audio, title flow (Continue / New journey: name + avatar), `dispatch → reduce`, fx, autosave, HUD, e2e snapshot, the single `ctx.finish` |
| `view-screen.tsx` | 320×180 canvas: eased camera, tile layers via `tileAt`, tweened y-sorted sprites (140 ms per step, scripted `move` paths replayed from `place − path`), light, warp/fade/encounter transitions, bump. Battle: bg, battlers, HP boxes (English, pixel font), lerped HP, hit/heal/buff particles tinted by element, damage numbers, swift sparkle, faint fade, switch/flee slides |
| `view-panel.tsx` | bottom panel switch: explore (objective, place + party status, D-pad, A/B, Menu, Verses), say (portrait, speaker, typewriter), choice, verse card, word cards, chapter title card, shop, shrine (Rest / Recite list / Save / Leave), save, ending credits, chapter-complete card |
| `view-battle.tsx` | battle panel: beats with ▶, Fight/Switch/Item/Run, move list (element · power · PP · challenge kind), switch list (forced switch hides Back), item list. Uses `battleMenu()` |
| `view-challenge.tsx` | challenge (Choice with 1–4 hotkeys, krama tap-to-order + Undo/Check, countdown → `ctx.hud.timeLeftMs`), feedback (FeedbackBar, the picked option, the correct answer, explanation markup) |
| `view-cards.tsx` | `ShlokaCard` (pādas with SaText shloka; word chips per pāda → form · grammar · gloss; word-by-word table; translation; context; reference; source) and `WordCard` |
| `view-menu.tsx` | start menu Sheet: Party (with a move-equip editor when a hero knows > 4 moves), Words (Padakośa, filter by tier/book), Verses (Ślokakośa), Items (use → `use-item`), Settings (music, text speed, Relaxed), Save, Rest & end session (confirm) |
| `view-markup.tsx` | `{w:}` `{n:}` `{f:shlokaId:wordIndex}` `{player}` `{b:}` renderer and typewriter. `{f:}` shows `shloka.words[i].form` via SaText; tapping opens the lexId's word card with that form highlighted. Unknown ids or an out-of-range index render nothing (`console.warn` once) |
| `view-common.tsx` | env context, key routing (`useButtons`), helpers |
| `input.ts` | keyboard map, held directions, press-and-hold D-pad props |

## Behaviour worth knowing
- Movement: `step` is sent only when the previous tween has finished (`anim.busyUntil`); a tap during a tween is queued once. Hold to walk. Swipe on the canvas also steps.
- Keys: arrows/WASD move; Z / Enter / Space = A; X / Esc / Backspace = B; M = menu; 1–4 = options (krama: n-th remaining tile; Z = Check, X = Undo). Enter on a focused button is left to the button, so a key never fires twice.
- Reduced motion = platform setting OR OS `prefers-reduced-motion`: no tweens, typewriter or shake, and fades are near-instant.
- Autosave (calm-only): a save is "owed" after a new journey, any mode change (event/battle end), map change or chapter
  completion, and it is written at the next calm moment (explore, nothing pending). Also on `ended`, menu Save, before
  `ctx.finish`, and on the story's `{save}` pendings (forced, per the reducer contract). v0.4.3 (fx-full): also on
  `pagehide`, on `visibilitychange` → hidden and when the game unmounts (shell ✕), calm only, so steps walked since
  the last autosave survive a reload or a phone app being closed.
- Session end: menu "Rest & end session", the ending's "Complete the journey", or, after a chapter completes, a "Book N complete / See results" card shown at the next calm moment (explore, no pending).
- Music: `createAudio()` only when `ctx.settings.sound`. In-game toggle in Settings. The track comes from the battle spec, an fx `music` (kept until the map changes), or `map.music`. Disposed on unmount.
- lipi in IAST mode: stimulus/option scripts are swapped (per notes/battle.md). L2: an IAST hint line under Devanagari stimuli.
- Relaxed (Settings): no timers, `timeMs: 0`.
- Hold B / X to run (shorter steps). Dialogue and battle beats are announced via `ctx.announce`.
- During `wait` / `move` / `fade`, the last dialogue line stays on screen (dimmed), so the box doesn't flicker between lines.
- The chapter title card also shows as a curtain over the canvas. The panel shows the English name and `ChapterDef.summary`.
- On tall screens the battle panel shows an element-matchup hint (from `ELEMENT_CHART`, hidden when neutral).
- The verse card has collapsible sandhi notes (joined = split + split, then the English note).
- A pixel speech bubble marks the speaking NPC on the canvas (`say.who` = `person.<sprite>`).

## e2e snapshot (`window.__game`)
`{ seq, phase, screen, canContinue, pending, map, x, y, facing, objective, chapter, challenge{id,kind,answers,orders,optionIds,tiles,context}, feedback, choice, shloka, battle{phase,allyHp,foeHp,foe,kind,beats,canRun,moves}, restored, heard, party, flags, menu, chapterDone, npcs (visible), warps, grid ('.' walkable), shrines, next (first unmet walkthrough step), route (map ids to next.map) }`.
The e2e bot walks with BFS on `grid` toward `next`, crossing maps through `route`.

## Orchestrator notes (00:50), done
- `{f:<shlokaId>:<wordIndex}` markup is supported everywhere markup is rendered (dialogue, feedback explanations, beats, toasts,
  objectives, aria text via `markupPlain`). The e2e bot now fails if raw markup (`{w:` `{n:` `{b:` `{f:` `{player}`) ever
  shows in dialogue or feedback text.
- Grammar, gloss, sandhi and lexicon notes are rendered as plain text (they may contain IAST after sa-review).
- e2e stays driven by the exposed state (BFS on `grid` toward `next`), so NPC/map changes by world-polish are fine.

## QA report (notes/qa-report.md), view items: status 01:55
Done:
- P1 #1 recital counter uses the logic's 1-based `step` (the e2e bot asserts 1 ≤ n ≤ m on every recital step).
- P1 #2 lipi feedback uses the same flipped scripts as the options and shows both scripts ("deva = iast").
- P1 #4 verse card: pāda lines are 44 px buttons (tap a line → its word chips); the translation sits right under the pādas
  (toggle in the card header); scroll shadows cue more content. At 360×640 all 4 pādas + the translation's start are visible.
- P1 #5 challenges with shlokaId+padaIndex show "reference · line N"; vibhakti shows the line's words with the target
  highlighted; viccheda shows the printed line with the joined form marked (purana/viccheda never reveal the answer).
- P1 #6 touch targets ≥ 44 px (chips, filters, `sk-btn--sm` inside the game, links, back, equip, buy, edit-moves, form-ref);
  e2e test 4 asserts every visible button in the panel and the menu is ≥ 44 px at 360×640.
- P1 #7 long Padakośa words span two grid columns at a smaller size (no clipping).
- P2 #8 Esc / backdrop / ✕ / X in a menu detail view go back one level first.
- P2 #9 "Time's up" title on timeout. #10 canvas nameplates cut on a word boundary. #12 equip hint when 4/4 are full.
  #13 move descriptions in the move list. #14 name field selected on focus. #18 2-column options only for single-word
  Sanskrit options. #20 500 ms input guard on new verse/word cards. #21 Tab focus trapped in the menu sheet.
  #22 exhausted hero dimmed on the canvas and in the switch list. #25 shop buy debounced (350 ms).
- P2 #15 dialogue is a compact speech box with ▶ beside the text; new-journey has a premise line + how-to (tall screens).
- P2 #16 landscape phones: smaller canvas, no status strip, panel scrolls as a fallback; pad + A/B reachable (screenshot
  final2/11). The canvas is the only `touch-action:none` area.
- P2 #17 mouse/keyboard devices (`hover:hover and pointer:fine`): no on-screen pad, keyboard hints instead; the challenge list
  has bottom padding so the last option's edge isn't clipped.
Not done:
- P2 #17 two-column desktop: the shell's `.app-game__stage` is capped at `--content-max` (560 px). A game cannot widen it
  without styling the platform (`:has()` hacks would break the scoping rule). Needs a platform option (e.g. a manifest
  `wide: true`) → orchestrator/platform.

## Bug found by the full playthrough (fixed 01:50)
If a step started an event while a D-pad button was held, the pad unmounted before its `pointerup`, the direction stayed
"held", and after the event the player walked into a wall forever (this was also the old 1-in-10 e2e flake). Fixed:
pad-held directions are released on any window `pointerup`/`pointercancel`, and all held directions are cleared whenever
the game leaves free exploration (keys re-press through autorepeat).

## Requests / open issues
- **content-v**: none blocking. `person.villager_m/_f` and `person.rishika` are missing on purpose; dialogue then shows the plain `who` text.
- **orchestrator**: the late-game test builds its save from the walkthrough (all flags before the `lanka_palace` step, all verses restored, party L40 with verse unlocks). If ch6 changes so that this step moves, the test still finds it by map id; it is skipped (with a reason) only if there is no ch6 step on `lanka_palace` or no `{end:true}` event.

## v0.4.1 Kathā view fixes (fx-view, 12 Nov; spec notes/katha.md "v0.4.1")
- **One-tap moves** (view-battle `KathaCommand`): in a Kathā journey the battle command panel IS the active hero's move
  list (श्लोकः tag on verse-bound astras, element · power · PP, the Kathā move text). One tap or key 1–4 casts (the view
  sends `choose 0` + `choose i`, so the reducer is untouched); वीरम् आह्वय / वस्तूनि / निर्गच्छ are small secondary
  buttons (keys 5–7; input.ts now maps 1–9). Armed 300 ms after it appears (`data-armed`). Its layout follows its own
  height (CSS container `kcmd`): short → moves in two columns, no prompt; short and narrow (360×640) → no description.
  The practice game keeps Fight → move list. Measured: Tāṭakā in Kathā = 8 turns, 8 move taps + 4–5 recitation taps.
- **Duels**: fx-core sends a Kathā duel turn straight to phase `challenge`; the recitation head shows पठ (no astra).
- **Move text**: `moveDescription(content, id, katha)` (view-battle) → katha.json `moveText` in Kathā, else defs; used in the
  battle lists and the party tab (Kathā: element · PP, श्लोकः tag, the text; the move editor shows श्लोकः, not the kind).
- **New journey**: the form body scrolls, Begin / Back sit in a footer (`new-journey-foot`) that never scrolls away.
- **Toasts queue** (Game.tsx): several toasts from one step show one after another (2.4 s each); e2e snapshot `toasts`.
- **Session result in Kathā** (view-katha `kathaResult`): summary/share "Book 1 … · n verses heard · n lines recited · n
  verses restored"; review = the verses met (all ✓, note heard / lines recited / restored). Same outcome, score,
  correct/total (stars), best, mastery. Lines recited are counted by Game.tsx (each smarana answer), snapshot `recited`.
- P2: one-akṣara chunks never get the ॰ cue (logic shows them full; the view guards too); a no-gap cast's screen-reader
  line is the key `katha.srLine` (। in Sanskrit, never a Latin "."); Kathā choice replies are Sanskrit only in sa-en
  (`StoryLine noGloss`), the prompt keeps its gloss.
- e2e Bot: drives the Kathā command panel (`moveInput` key / tap); a choice that comes back with no progress in between
  (a Kathā reply that misreads the question) is answered with the next option (snapshot `choice.prompt`).

## v0.4.2 "Show the way" — the map pointer (fx-guide, 12 Nov)
The owner, new to RPGs, felt stuck; the ◆ objective line was the only guidance. Now a marker on the map shows where to
go next (logic: notes/core.md "Show the way").
- **Game.tsx**: `guide = useMemo(guideTarget(state, content))` on the save (and the ending); shown only when
  `prefs.showWay` and free exploration (mode explore, nothing pending — so never in dialogue, verse moments, chapter
  curtains, battle, recitation, shop/shrine), no menu, no word/verse sheet, no chapter-complete card. The visible target
  goes to the canvas through `guideRef` (read each frame).
- **view-screen.tsx `drawGuide`** (after the light tint, so night maps keep it readable; gold `rgb(255,214,90)` with a dark
  outline, 2× chunky pixels): a person → a ▼ above the head (follows the npc's tween); a tile / shrine / exit → a soft
  glow on the tile + corner brackets + ▼ above (▲ below on the top row); off-screen → an arrow (8 directions) at the
  screen edge on the line from the player toward the target. Reduced motion: no bob, no pulse, static glow. The canvas
  has no text, so both scripts and light/dark are the same. The canvas mirrors what it drew in `data-guide`
  (`mark:x,y` / `edge:x,y` = a marker pixel, `''` = nothing).
- **Settings → मार्गं दिश** ("Show the way", sub गन्तव्यं स्थानं दर्शयति): `prefs-v1.showWay`, on by default, both
  journeys; keys `settings.showWay` / `settings.showWaySub` in content/sa-ui-katha.json (oracle-verified; दर्शय is not in
  the packs, दिश् "to point out, to show" is). `data-testid="toggle-show-way"`.
- **e2e snapshot**: `guide` ({kind, map, x, y, to, npc, recite, step, goal, distance} | null), `guideShown`, `showWay`.
- **e2e** "Show the way (v0.4.2)": a new Kathā journey in संस्कृतम् → at the first free moment the target serves the next
  walkthrough step (an open warp when the goal is elsewhere) and the canvas pixel at `data-guide` is gold; never drawn
  in dialogue, a verse moment or battle; the menu hides it; the setting turns it off (stored in prefs-v1, nothing in the
  save) and on again; no Latin.
- Screenshots: /home/claude/scratch/fx-guide/shots/ (first map, person, exit, off-screen arrows, setting off, Settings,
  dark; 390×844 and 360×640).

## v0.4.3 production readiness (fx-full, 13 Nov)
- **RY_FULL follows the map pointer.** The opt-in full playthrough no longer uses a scripted route (`next` / `route`):
  in free exploration it reads only the exposed `guide`, walks toward it with the on-screen pad (BFS over the snapshot
  grid, around repeatable triggers and, in the practice game, around kuśa when it can — the pointer's own routing),
  and at a person / shrine turns and presses A; a pointer tile it stands on is stepped off and on again. Everything
  else (dialogue, choices, verse moments, battles, recitations, shrines, chapter ends → result → Continue) is the
  ordinary `Bot`. A lost practice battle → grind on kuśa (Kathā: just retry). It fails with a trace on a stall, on a
  pointer it cannot reach (twice in a row), or on 12 presses of A at one target without the story moving on.
  Every calm moment must have the pointer drawn (`guideShown`); in संस्कृतम् every changed screen is swept for Latin.
  `RY_FULL=1` plays both journeys (Kathā in संस्कृतम्, practice in English), `RY_FULL=katha|practice` one;
  `RY_FULL_SEEDS="21,22"` (default 21). About 7–8 min per run.
- **Fixed: steps lost on reload** — see Autosave above (e2e "a hard reload mid-chapter resumes the save").
- **Fixed (e2e hook): stale grid.** The snapshot grid is cached per (map, flags, npc places) but marked the player's own
  tile `#` at caching time; after walking on, that tile stayed solid (in book 6 it closed the one-tile pass to
  lanka_palace for the bot). The grid is now computed without the player.
- New e2e (in the gate): hard reload mid-chapter → Continue → same place, flags, verses, party, pointer; no console
  errors (or game warnings) on load in en / sa-en / sa (title, New journey, first scene, Continue; no Latin in sa);
  offline: the test builds the game with the service worker, visits once, goes offline, reloads → title → a new
  journey starts, fonts loaded.
