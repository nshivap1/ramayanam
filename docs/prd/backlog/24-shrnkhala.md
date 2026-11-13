# शृङ्खला · Śṛṅkhalā — The chain

| | |
|---|---|
| **Id** | `shrnkhala` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | puzzle — after *Dominoes* |
| **Skills / levels** | shabdakosha (L1–L2), sandhi (L3–L4) · L1–L4 |
| **Modes** | practice · daily |
| **Session** | ~3 min, 2 chains of 6 links |
| **Build size** | M |

## Learning objective
Two games on one board. At L1–L2 the links are word ↔ meaning (vocabulary recall). At L3–L4 the links are sandhi junctions: the learner finds the word that joins the open end *by the rule named for that joint* (guṇa, yaṇ, visarga → ओ …) — the "what happens when these two meet?" reflex needed for reading joined text.

## Why people come back
A chain that closes cleanly, a daily chain, a fewest-mistakes best.

## Core loop
1. A start tile lies on the board with one open half. The hand holds 6 chain tiles and 2 decoys, shuffled.
2. Each tile has a left and a right half. Tap the tile whose **left half answers the open half**:
   - *Meaning chain*: open half = emoji / gloss of a word; the answering half = that word.
   - *Sandhi chain*: open half = a first word; a banner names the rule for this joint (Sanskrit name + one-line summary); the answering half = the second word that joins it by that rule.
3. Right → the tile snaps on (sandhi chain: a badge on the joint shows the joined form); its right half becomes the new open half. Wrong → shake, mistake +1.
4. Six links complete a chain; a session is two chains; outcome `completed` (no lose state).

## Sanskrit rules
- **Meaning chain.** Words from `@content/vocab`. The chain is built from 7 distinct words w₀…w₆; tile *i* = [w_i | clue of w_{i+1}]. Clues are unique within the hand (no shared emoji or gloss); decoys use words and clues not in the chain.
- **Sandhi chain — every joint is a pack example.** Pick 6 `SANDHI_EXAMPLES` e₁…e₆ covering at least four different `ruleId`s (examples of one rule would all fit each other's joints). Joint *i* asks for `ruleId(e_i)`. Tiles: start = [· | first(e₁)], then [second(e_i) | first(e_{i+1})], last = [second(e₆) | ·]. The badge shows `e_i.result` as stored (with its space when the words stay apart, as in रामो गच्छति). No join is displayed that is not a pack example.
- **The engine is used only as a checker**, to guarantee uniqueness: for each open half first(e_i), `joinSandhiDeva(first(e_i), X, e_i.options)` must return `ruleId(e_i)` for X = second(e_i) and a *different* `ruleId` (or `null`) for the left half X of every other tile in the hand, decoys included. Hands that fail are re-drawn (`rng.fork`), so exactly one tile fits each joint.
- Wrong-tap feedback names the engine's rule for the attempted pair ("that would be yaṇ, not guṇa") but shows **no joined form**.
- `SANDHI_PENDING_ENGINE` is never used. Rule names and summaries come from `SANDHI_RULES`.
- Never generate words; never fuse more than two words into a running string.

## Content
- L1: vocab `level ≤ 1` with emoji (clue = emoji). L2: vocab `level ≤ 2` (clue = English gloss). Minimum ≥ 150 words per level.
- L3: svara rules with ≥ 20 examples at `level ≤ 3` — `savarna-dirgha`, `guna`, `vrddhi`, `yan`, `ayadi`. L4: + visarga and vyañjana rules with ≥ 20 examples (`visarga-o`, `visarga-rutva`, `visarga-satva`, `jashtva`, `anunasika`, `shcutva` …). The pack has 848 examples over 35 rules; the eligible-rule list is computed, not typed.
- Decoys in the sandhi chain are tiles built from examples of rules not used in the chain.
- Minimum: ≥ 5 eligible rules at L3, ≥ 10 at L4 (asserted); hand construction succeeds within 50 redraws for every test seed.

## Modes, levels, scoring
- Score per link: 20 first try, 10 after one mistake, 5 otherwise; +30 per chain without mistakes.
- `correct` = links made first try; `total` = 12. Stars from that accuracy (≥ 90 % → 3, ≥ 70 % → 2).
- Mastery: `shabdakosha` · `vocab:<id>`; `sandhi` · `<ruleId>:<exampleId>`; correct = first try.
- `best: { label: 'Fewest mistakes', value, lowerIsBetter: true }`; daily state in `ctx.store` by `ctx.dateKey`.
- Share card (daily): one row per chain, a square per link — 🟩 first try, 🟨 after mistakes: `🟩🟩🟨🟩🟩🟩`.

## UX notes
Portrait: the chain scrolls inside its own strip, newest link centred (the stage never scrolls sideways); open half highlighted. Hand: 2-column grid of two-part tiles (≥ 44 px high). Digits 1–8 pick a tile. `ctx.announce` reads each joined form. `ctx.expose({ phase, open, hand: [{ id, left, right, fits }] })`.

## Acceptance tests
- `logic.test.ts`: meaning chain — clues unique in the hand; exactly one tile fits every open half; decoys fit nowhere.
- `logic.test.ts`: sandhi chain — every joint equals a pack example (first, second, result, ruleId); `joinSandhiDeva(first, second, options).result === result` for each; ≥ 4 distinct rules per chain; for every open half exactly one hand tile yields the joint's `ruleId` under the engine.
- `logic.test.ts`: named case — at a guṇa joint with open half देव, the tile carrying the pack's second word for that example fits; a tile whose left half begins with अ or आ does not (the engine reports savarṇa-dīrgha).
- `logic.test.ts`: `testMatrix([1, 2, 3, 4], 25)` → two chains of six links; construction succeeds within the redraw cap; deterministic.
- `logic.test.ts`: perfect bot → 12/12, 3 stars, decoys left in hand; random bot terminates; scoring table.
- `logic.test.ts`: eligible-rule list and pool assertions.
- `e2e.spec.ts`: complete two chains at 390 px via `window.__game`; a wrong tap shows the rule-name feedback and no joined form; the chain strip scrolls without page overflow; reload restores the daily; IAST run; no console errors.

## Out of scope / later
Two-ended play; pass-and-play; internal sandhi; single-rule drill rounds.

## Open questions
- Sanskrit reviewer: is naming the engine's rule for a *wrong* pair helpful, or too much?
- Product: at L3, one meaning chain and one sandhi chain per session?
