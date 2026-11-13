# रूपसुडोकु · Rūpa-suḍoku — Paradigm Sudoku

| | |
|---|---|
| **Id** | `rupa-sudoku` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | puzzle — after *Sudoku* |
| **Skills / levels** | kriyapada, sankhya · L0–L3 |
| **Modes** | practice · daily |
| **Session** | 5–10 min, one grid |
| **Build size** | M |

## Learning objective
Keep one verb paradigm in view for ten minutes. The grid's symbols are the forms of one verb in one lakāra, and the input pad *is* the textbook table (puruṣa rows × vacana columns), so every placement asks "which cell is पठामः?". At L0 the symbols are Devanagari digits. Honest note: the deduction is not Sanskrit; the value is prolonged, relaxed exposure.

## Why people come back
A familiar, calm, longer puzzle for adults; a daily grid with a time to share.

## Core loop
1. A grid with givens. Tap an empty cell, then tap a form on the paradigm pad (or press 1–9 in pad order).
2. A placement that differs from the solution is shown in the error colour and counted as a mistake; it can be overwritten or cleared.
3. "Notes" toggle writes candidate marks instead (9×9 only).
4. Grid complete and correct → `won`. There is no lose state; mistakes cost stars.

## Sanskrit rules
- **Symbol sets** come from `@content/dhatu` via `conj(d, lakara, pada, p, v)`; each symbol is the cell's `Forms[0]`.
  - 9-symbol set: the nine cells of one lakāra in one pada.
  - 6-symbol set: ekavacana + bahuvacana × three puruṣas (L1 — the Śibira course does not teach the dual) or, at L2+, any two vacanas chosen by the seed.
- A table is eligible only if all needed cells are non-empty **and their display forms are pairwise distinct strings**. Pairs that differ only by a final virāma (अपठत् / अपठत) are legal but hard to read in a small cell: such tables are used only at L3.
- Vikalpa alternates appear only on the end screen.
- The pad is always laid out as the paradigm: rows प्रथम / मध्यम / उत्तम, columns एक / द्वि / बहु, labelled from `PURUSHA_NAMES` and `VACANA_NAMES`.
- L0 uses digits from `toDevaDigits(1…6)`; no verb content.
- Never invent or abbreviate a form to make it fit a cell.

## Content
- Dhātus: `dhatusForLevel(level)`; L1 uses laṭ only; L2 laṭ, laṅ, lṛṭ, loṭ; L3 adds vidhiliṅ and ātmanepada tables.
- **Grid bank (game-local, digits only, no Sanskrit):** `content.ts` holds 20 base puzzles per size and difficulty (6×6 easy / medium; 9×9 easy / medium), each a givens string plus solution, generated offline by a script in the PR and **proved unique by the solver in `logic.test.ts`**. At run time a puzzle is a base puzzle transformed by validity-preserving shuffles drawn from the seed (relabel symbols; permute rows within a band, columns within a stack, whole bands, whole stacks; transpose where the box shape allows). This avoids a uniqueness search at run time (the contract forbids blocking > 50 ms).
- Minimum: ≥ 30 eligible (dhātu, lakāra) tables per level, asserted; grid variety is effectively unlimited.

## Modes, levels, scoring
- **Size by level and screen.** L0: 6×6 digits. L1: 6×6 forms. L2–L3: 9×9 forms when the stage is ≥ 560 px wide, otherwise 6×6 forms with two vacanas — nine-form cells are not legible on a phone (a 9×9 cell is ≈ 38 px at 360 px; three-akṣara Devanagari needs ≈ 52 px). `Game.tsx` measures the stage once and passes the size to `init(seed, level, size)`.
- **Daily is always 6×6**: the same puzzle on every device.
- Score: `1000 − 20 × mistakes − seconds` (floor 100). Stars: 0–1 mistakes → 3; 2–4 → 2; more → 1.
- `best: { label: 'Fastest solve (s)', value, lowerIsBetter: true }`. HUD: `progress` = filled / empty-at-start; `label` = elapsed time.
- Mastery: one event — `kriyapada` · `dhatu:<dhatuId>:<lakara>:<pada>:table`, correct = ≤ 1 mistake; L0: `sankhya` · `digit:1-6`.
- Share card (daily): `६×६ · 4:31 · ✕1`.
- In-progress grid saved under `ctx.store` (daily: by `ctx.dateKey`; practice: last game).

## UX notes
Portrait: title line with the root, lakāra and meaning; square grid (box borders thicker); paradigm pad below as a 3 × 3 (or 3 × 2) table of large buttons showing the forms with a count of how many of each remain; Notes and Clear buttons. Selecting a cell highlights its row, column and box. Keyboard: arrows move, digits place, N toggles notes, Backspace clears. Cell text is `<SaText>` at ≥ 14 px; tables whose forms exceed 3 akṣaras are ineligible for 6×6 (4 for 9×9). `ctx.expose({ phase, size, solution, cells })`.

## Acceptance tests
- `logic.test.ts`: every base puzzle has exactly one solution (solver counts to 2 and stops); its stored solution matches.
- `logic.test.ts`: every transformation of a base puzzle (1,000 seeded samples per size) is a valid Sudoku with the transformed solution satisfying row / column / box rules and matching the givens.
- `logic.test.ts`: symbol sets — distinct strings; named case `path-1p` laṭ gives पठति पठतः पठन्ति पठसि पठथः पठथ पठामि पठावः पठामः in pad order; a table with an empty cell is rejected.
- `logic.test.ts`: `testMatrix([0, 1, 2, 3], 25)` × sizes → deterministic puzzle; L1 sets contain no dvivacana form; daily always 6×6.
- `logic.test.ts`: solver bot fills every puzzle → `won`, 0 mistakes, 3 stars; wrong-placement bot records mistakes and can still finish; init < 20 ms.
- `e2e.spec.ts`: complete a 6×6 at 390 px from `window.__game.solution` → result; a wrong placement shows the error style and lowers stars; reload restores the grid; 9×9 appears at 1280 px for L2; IAST run; no console errors; no overflow.

## Out of scope / later
Noun-paradigm Sudoku (too many homographic cells); hints; variants.

## Open questions
- Product: is the 6×6 phone fallback at L2–L3 acceptable, or should 9×9 get a zoom lens?
- Sanskrit reviewer: at L2, which two vacanas should the 6×6 prefer — or rotate all three pairs?
