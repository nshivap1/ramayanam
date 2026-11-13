# एकम्! · Ekam! — The case-matching card game

| | |
|---|---|
| **Id** | `ekam` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | puzzle — after *Uno* |
| **Skills / levels** | vibhakti · L2–L3 |
| **Modes** | practice |
| **Session** | ~4 min, one hand against two bots |
| **Build size** | M |

## Learning objective
Recognise case, number and gender fast enough to play cards with them. Every play is the judgement "my card shares a vibhakti, a vacana or a liṅga with the top card". After 20 sessions a Praveśa learner analyses a declined form in about two seconds — and knows which forms are ambiguous, because those are the best cards.

## Why people come back
A real card game with luck, bots and the "एकम्!" shout.

## Core loop
1. Deal 7 cards each to the player and two bots; turn one card up. Cards show a declined word only (no labels).
2. On your turn tap a card:
   - **Legal** (shares at least one feature with the top card) → it is played; a chip explains the match ("सप्तमी = सप्तमी").
   - **Illegal** → the card shakes, both analyses are shown, a mistake is recorded; at L3 you also draw one card. Your turn continues.
   - No legal card (or by choice) → draw one; play it if legal, otherwise the turn passes.
3. Action cards (icon only): **Skip** (next player misses a turn), **+2** (next player draws two and misses a turn), **Wild** (always legal; the next card may be anything).
4. With two cards left, playing one arms the **एकम्!** button for 3 seconds; missing it draws two cards.
5. First empty hand wins (`won` / `lost`). After 200 turns, or when no cards can be drawn, fewest cards wins; a tie is `completed`.

## Sanskrit rules
- **Deck**: three noun paradigms — one masculine, one feminine, one neuter — from `@content/shabda`; one card per *distinct display form* in vibhakti 1–7 (≈ 15–17 per stem, ≈ 48 word cards) plus 2 Skip, 2 +2, 2 Wild.
- **A card carries every analysis of its form.** `A(card)` = all (vibhakti, vacana) cells of its paradigm whose `Forms` contain the text, each with the stem's gender. रामाभ्याम् is tṛtīyā, caturthī and pañcamī dvivacana at once; फलम् is prathamā and dvitīyā.
- **Legality**: card *c* may be played on top card *t* iff some analysis in `A(c)` and some analysis in `A(t)` share a vibhakti, or a vacana, or the liṅga. Syncretic forms are therefore semi-wild — the game rewards knowing them.
- The explanation chip names one shared feature (vibhakti first, then vacana, then liṅga) from `VIBHAKTI_NAMES`, `VACANA_NAMES`, `GENDER_NAMES`.
- Cards show `Forms[0]`; vikalpa alternates are listed in the long-press / "?" analysis sheet.
- Vocative is excluded. Paradigms must have all 21 cells (no dual-only or plural-only words). Never generate a form.
- The shout button's label एकम् is `cardinal(1)` from `@sanskrit`, plus "!".

## Content
- L2: a-stem masculine, ā- or ī-stem feminine, a-stem neuter from `shabdaForLevel(2)` (e.g. ids `deva-m`, `lata-f`, `phala-n` — the seed picks one per gender). L3: any noun paradigms with `level ≤ 3`, including consonant stems.
- Minimum pool: ≥ 4 eligible paradigms per gender per level (≥ 64 deck combinations), asserted.

## Modes, levels, scoring
- **Bots** (deterministic from the seed) play a random legal card, prefer an action card when the next player has ≤ 2 cards, draw when nothing is legal, and never play illegally.
- Score: win 100 + 10 × cards left in opponents' hands − 5 × mistakes (floor 10); loss 10 × legal plays made (cap 60).
- `correct` = legal play attempts, `total` = all play attempts. Stars: win with ≤ 1 mistake → 3; win → 2; loss with accuracy ≥ 80 % → 1; else 0.
- Mastery: for each attempt on a word card, `vibhakti` · `shabda:<paradigmId>:<v>.<n>` using the first analysis of the card; correct = the attempt was legal.
- `best: { label: 'Fastest win (turns)', value, lowerIsBetter: true }`.

## UX notes
Portrait: bots' card counts at the top; discard pile, deck and match chip in the centre; the player's hand as wrapping cards (min 64 × 44 px, text ≥ 16 px) that scroll *inside their own strip* beyond 10 cards. Bot turns take ~600 ms (instant under reduced motion). Keyboard: arrows select, Enter plays, D draws, Space shouts. "?" opens a `Sheet` with the selected card's analyses (a hint: no mastery event for that card). `ctx.expose({ phase, turn, top, hand: [{ id, text, legal }], deckCount })`.

## Acceptance tests
- `logic.test.ts`: deck — one card per distinct form; `A(card)` covers every cell exactly once across the stem's cards.
- `logic.test.ts`: legality is symmetric and reflexive; named cases — रामेण on रामाय is legal (vacana and liṅga); रामाभ्याम् on a caturthī-bahuvacana feminine card is legal (vibhakti 4); a card differing in all three features from every analysis of the top card is illegal.
- `logic.test.ts`: action cards — Skip, +2 and Wild effects on turn order and hand sizes; the shout window (pass time as a number) and its two-card penalty.
- `logic.test.ts`: simulation — bot-vs-bot-vs-bot games for `testMatrix([2, 3], 25)` always terminate (≤ 200 turns), card count is conserved, no illegal bot play; a perfect human bot (always plays a legal card, always shouts) finishes with 0 mistakes; a random-tap bot terminates and records mistakes.
- `logic.test.ts`: scoring and star thresholds; pool assertions.
- `e2e.spec.ts`: play a full game at 390 px via `window.__game` (legal taps, a draw, a shout) → result screen; an illegal tap shows both analyses and keeps the turn; IAST run; no overflow outside the hand strip; no console errors.

## Out of scope / later
Pass-and-play and online multiplayer; verb decks; house rules.

## Open questions
- Product: should Wild let the player *name* the next vibhakti?
- Sanskrit reviewer: is "any shared analysis" the right legality rule for syncretic forms, or should the player declare which analysis they intend?
