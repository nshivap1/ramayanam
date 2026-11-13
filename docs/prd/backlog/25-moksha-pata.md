# मोक्षपटम् · Mokṣa-paṭam — Snakes and ladders quiz board

| | |
|---|---|
| **Id** | `moksha-pata` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | quiz — after *Snakes and Ladders* (whose Indian ancestor is the Mokṣa-paṭam) |
| **Skills / levels** | sankhya, shabdakosha, vibhakti, kriyapada · L0–L3 |
| **Modes** | practice (solo, or pass-and-play for 2–4) |
| **Session** | ~5 min, one 6 × 6 board |
| **Build size** | M |

## Learning objective
Mixed review in a family setting. Every roll is read as a Sanskrit number word; every ladder and snake asks a question at the player's level. Its particular value is social: a parent and child, or a small class, can play on one phone.

## Why people come back
A heritage game everyone knows, luck that keeps weaker players in the race, pass-and-play.

## Core loop
1. The board has 36 squares numbered in Devanagari digits, in boustrophedon order, with 4 ladders and 4 snakes.
2. **Roll**: the die shows a number *word* (एकम् … षट्). The player taps the destination square; three candidate squares are highlighted (current + n and two neighbours). Wrong → the right square is shown, mistake +1; the token moves there either way.
3. **Ladder foot**: a question appears. Right → climb. Wrong → stay.
4. **Snake head**: a question appears. Right → the snake is dodged. Wrong → slide down.
5. Reaching or passing square 36 finishes. Solo: `completed`. Pass-and-play: turns rotate; the first to finish ends the game (`completed`), and the winner is named in `summary`.

## Sanskrit rules
- Die words are `cardinal(1…6)` from `@sanskrit` (एकम् द्वे त्रीणि चत्वारि पञ्च षट् — the counting forms); square numbers use `toDevaDigits`.
- Questions are **choice only**, from small pure builders over the packs, obeying the standing rules: one keyed answer; no distractor string-equal to an accepted form; no "which case?" about a homographic form; vikalpa alternates never distractors.
  - L0: akṣara ↔ sound (`devaToIast`); digit ↔ number word.
  - L1: emoji → word; word → gender (from vocab); subject + laṭ verb (dhatu, prathama / uttama puruṣa).
  - L2: paradigm form for a named unambiguous cell (shabda); laṅ / lṛṭ form (dhatu); ktvā / tumun.
  - L3: sandhi result for a `SANDHI_EXAMPLES` pair (svara family; `alternatives` accepted, never distractors).
- **Ladder and snake names** follow the tradition (virtues and vices), using words only if the vocab pack has them — wanted: सत्यम्, दया, दानम्, क्षमा; क्रोधः, लोभः, मोहः, मदः (four of the six inner enemies). Missing ones are icon-only. No deity or religious figure is a snake, penalty or mascot.
- All Sanskrit through `<SaText>`; no free text input.

## Content
- Packs: `vocab`, `shabda`, `dhatu`, `sandhi`; engine `cardinal`, `toDevaDigits`, `devaToIast`.
- Boards: three hand-designed layouts in `content.ts` (pure numbers: ladder `[from, to]`, snake `[from, to]`), validated by tests: no feature on square 1 or 36; no square is both a ladder foot and a snake head; no ladder top is a snake head; no snake tail is a ladder foot; square 36 reachable.
- Each builder offers ≥ 40 distinct questions per level (asserted). Use the shared builder library if it exists (see `nityabhyasa`); otherwise builders live in this folder.

## Modes, levels, scoring
- Solo par = 14 turns. Score = 20 × correct answers + 10 × correct destination taps + max(0, (par − turns) × 10).
- `correct` / `total` count question answers and destination taps of all players on the device. Stars from that accuracy (≥ 90 % → 3, ≥ 70 % → 2, > 0 → 1).
- Mastery: builder ids as in the single-skill games (`vocab:<id>`, `shabda:<id>:<v>.<n>`, `dhatu:<id>:<lakara>:<p>.<v>`, `sandhi:<ruleId>:<exampleId>`), plus `sankhya` · `cardinal:<n>` for destination taps. In pass-and-play, mastery events are **not** emitted (several people share the device).
- `best: { label: 'Fewest turns', value, lowerIsBetter: true }` (solo only).
- Player count (1–4) chosen on the start card; stored in `ctx.store`.

## UX notes
Portrait: square board (6 × 6 cells ≥ 52 px at 360 px) with ladders and snakes drawn in SVG over the grid, tokens as coloured discs with distinct shapes; die and "Roll" button below; questions in a `Sheet` with `Choice` options and a `FeedbackBar`. Tokens hop square by square (jump under reduced motion). Space rolls, digits answer. Rolls are seeded (`rng.range(1, 6)`). `ctx.expose({ phase, player, square, die, destination, question: { answer } })`.

## Acceptance tests
- `logic.test.ts`: all three layouts pass the validity rules; boustrophedon numbering maps square ↔ (row, column) both ways.
- `logic.test.ts`: die words — `cardinal(n)` for n = 1…6 are six distinct strings; destination candidates always include the true square and stay within 1…36.
- `logic.test.ts`: transitions — ladder + right answer climbs; ladder + wrong stays; snake + right stays; snake + wrong slides; overshoot of 36 finishes.
- `logic.test.ts`: every builder × `testMatrix([0, 1, 2, 3], 25)` → valid choice questions with exactly one correct option; ≥ 40 distinct per level.
- `logic.test.ts`: simulation — perfect bot finishes every seed × layout within 40 turns; always-wrong bot still terminates (cap 200 turns asserted never reached); 4-player rotation is fair (turn order) and ends when the first finishes.
- `e2e.spec.ts`: solo game to the result at 390 px using `window.__game` (destination taps, one ladder answered right, one snake answered wrong); 2-player pass-and-play shows the turn banner and names the winner; reduced motion; IAST run; no console errors; no overflow.

## Out of scope / later
The traditional 72- or 100-square named board; online play; arrange / type questions.

## Open questions
- Sanskrit reviewer / product: approve the virtue and vice labels and the cultural framing; is the title मोक्षपटम् preferred over the Jñāna-caupar-style names?
- Product: should a wrong destination tap cost the move (harsher, more learning) rather than only a mistake?
