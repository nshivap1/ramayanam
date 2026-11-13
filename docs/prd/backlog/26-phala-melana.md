# फलमेलनम् · Phala-melanam — Vowel-fruit merge

| | |
|---|---|
| **Id** | `phala-melana` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | arcade — after *Suika (Watermelon) Game*, without physics |
| **Skills / levels** | sandhi · L3 |
| **Modes** | endless · practice |
| **Session** | 3–6 min, until the well overflows |
| **Build size** | M |

## Learning objective
Know the vowel-sandhi table by feel: अ + अ → आ, अ + इ → ए, अ + उ → ओ, अ + ए → ऐ, अ + ओ → औ, इ + इ → ई, उ + उ → ऊ — and that order matters (इ + अ does *not* give ए). After 20 sessions a Paricaya learner predicts savarṇa-dīrgha, guṇa and vṛddhi results instantly.

## Why people come back
The "one more drop" loop, a high score, and chain reactions (अ, अ, इ → ए → ऐ) that feel clever.

## Core loop
1. A well of 5 columns × 7 rows. A vowel tile waits at the top; the next one is previewed.
2. Choose a column (tap it, or arrows + Space). The tile falls onto the stack.
3. **Merge check**: let *B* be the tile directly below and *T* the tile that landed. If the table has (B, T), they fuse into the result in B's cell and a banner shows `अ + इ → ए` with the rule name. The fused tile is then checked against the tile below it, and so on (chain ×2, ×3 …).
4. **Ripening**: a fused ऐ or औ scores and disappears; tiles above fall and are re-checked.
5. **Prediction round** (every fifth drop that would merge): the game pauses — "अ + उ = ?" with three vowel options. Right → double score. Wrong → the dropped tile becomes an inert stone.
6. A column that would exceed 7 tiles ends the game: `lost` in endless; in practice mode the goal is an order list ("make 3 × ऐ, 2 × ई") → `won`.

## Sanskrit rules
- **Temporal order = sandhi order.** The tile already in the well is the pūrva (first) sound, the newcomer the para (second). Merges are vertical only, so the older tile is always below.
- **The merge table is derived, not typed.** At module load, for every ordered pair (a, b) of the tile set {अ आ इ ई उ ऊ ए ओ ऐ औ}, call `joinSandhi(a, b, { internal: true })` (SLP1 via `devaToSlp1`); keep the pair iff the result is a single vowel of the tile set. This yields exactly:
  - अ/आ + अ/आ → आ (`savarna-dirgha`); इ/ई + इ/ई → ई; उ/ऊ + उ/ऊ → ऊ;
  - अ/आ + इ/ई → ए; अ/आ + उ/ऊ → ओ (`guna`);
  - अ/आ + ए/ऐ → ऐ; अ/आ + ओ/औ → औ (`vrddhi`).
- Every other pair (yaṇ and ayādi cases such as इ + अ or ए + अ, whose results are not single vowels) **does not merge** in v1; the tiles stack, with a one-time hint that the pair needs a different rule.
- Banner text uses `SANDHI_RULES` (`name.sa`, `sutra.ref`) for the `ruleId` the engine returned.
- Tiles show independent vowel letters through `<SaText>` (IAST letters in IAST mode). ऋ / ऌ are not in the tile set.
- No result is shown that the engine did not return; exactly one prediction option equals the engine's result.

## Content
- Engine only: `joinSandhi`, `SANDHI_RULES`, `devaToSlp1` / `slp1ToDeva`. No pack.
- Spawn weights (seeded): अ 30, आ 10, इ 18, ई 6, उ 18, ऊ 6, ए 6, ओ 6; ऐ / औ never spawn.
- 100 ordered pairs, 28 of which merge — a small domain by design; variety comes from board states.

## Modes, levels, scoring
- Score: savarṇa-dīrgha 10, guṇa 20, vṛddhi 40, × chain depth; ripened ऐ / औ +50; prediction right ×2.
- Endless: `lost` at overflow (the normal end); stars by score (≥ 1500 → 3, ≥ 700 → 2, ≥ 200 → 1). Practice: three order lists of rising size; stars by drops used.
- `correct` / `total` = prediction rounds answered right / asked. HUD: `score`, `combo` (chain depth), `label` (next order item in practice).
- Mastery: `sandhi` · `svara:<a>+<b>` from prediction rounds only (right or wrong) — ordinary merges emit nothing, to avoid inflating mastery.
- `best: { label: 'High score', value }`.

## UX notes
Portrait: well centred (tiles ≈ 56 px), preview and order list above, banner below. DOM grid with CSS falls (instant under reduced motion); the tile waits for the player, so there is no time pressure. Colour per vowel family plus a corner shape. Keys: ←/→ choose, Space/↓ drops, 1–3 answer predictions. `ctx.expose({ phase, grid, current, next, table, prediction: { answer } })`.

## Acceptance tests
- `logic.test.ts`: the derived table equals the list above — 28 merging pairs with the stated results and rule ids; named non-merges: इ + अ, उ + अ, ए + अ, ऐ + इ.
- `logic.test.ts`: order matters — अ on इ does not merge; इ on अ gives ए.
- `logic.test.ts`: chain — column [अ, अ] + drop इ → ए then ऐ, which ripens and leaves the column empty; score = 20 + 40 × 2 + 50.
- `logic.test.ts`: prediction — asked only when the pending pair merges; wrong answer creates a stone that never merges; options contain exactly one correct tile.
- `logic.test.ts`: simulation over 25 seeds — random-column bot always terminates by overflow; greedy bot (prefers a merging column) outscores random on average; grid invariants (no floating tiles, heights ≤ 7); spawns deterministic per seed; the greedy bot completes the practice order lists.
- `e2e.spec.ts`: scripted drops at 390 px produce a visible banner for a guṇa merge and a chain; a prediction answered right and one answered wrong; overflow → result screen; reduced motion; IAST run; no console errors; no overflow.

## Out of scope / later
Real physics (no dependencies allowed; logic must be deterministic); yaṇ / ayādi merges; word-level tiles (that is `sandhi-melana`'s territory).

## Open questions
- Sanskrit reviewer: is isolated-vowel merging (with `internal: true`) an acceptable abstraction of svara-sandhi for L3, and should ऋ (अ + ऋ → अर्) be shown at all?
- Product: how often should prediction rounds occur?
