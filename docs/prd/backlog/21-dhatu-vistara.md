# धातुविस्तारः · Dhātu-vistāraḥ — Root expansion

| | |
|---|---|
| **Id** | `dhatu-vistara` (permanent; folder name) |
| **Status** | proposed |
| **Kind / inspired by** | arcade — after *Text Twist* |
| **Skills / levels** | krdanta, kriyapada · L2–L4 |
| **Modes** | timed · practice · daily |
| **Session** | 2 min (timed / daily) or untimed |
| **Build size** | M |

## Learning objective
See one dhātu as a family. From a rack of akṣaras the learner spells every attested form of the root: the present, the kṛdantas (गत्वा, गन्तुम्, गतः …), prefixed presents (आगच्छति, अनुगच्छति) and their lyap forms (आगम्य). After 20 sessions the learner expects lyap instead of ktvā after an upasarga and knows common upasarga meanings by example.

## Why people come back
The "two more to find" itch, a countdown, a daily root, and a family table to study at the end.

## Core loop
1. The root is shown with its meaning. Below it, the **family board**: one blank slot per target form, grouped in rows (bare root; one row per upasarga), each slot showing its akṣara count and a type tag (लट् · क्त्वा / ल्यप् · तुमुन् · क्त …).
2. The **rack** holds the distinct akṣaras of all targets. Tap akṣaras to spell (tiles are not consumed); Backspace, Clear, Enter.
3. Enter:
   - an unfound target → it fills its slot, with its English gloss;
   - an already found form → "already found";
   - anything else → "not in this root's family" — no penalty.
4. **Hint** fills the first akṣara of the shortest unfound slot (−10).
5. Timed / daily: 120 s, then `completed`; everything found early → `won`. Practice: untimed, ends when all are found or on "Show all".

## Sanskrit rules
- **Targets come only from `@content/dhatu`**: for root *d* — `conj(d, 'lat', pada, 1, 1)` for each pada it has; every present `krdanta` field; every `PREFIXED` entry with `base === d.id` (its `lat3s`); every `d.lyap[]` form. No form is ever built by joining an upasarga, a root and a suffix: सन्धि, ṇatva and ṣatva inside such words (प्रणमति, निषीदति) are exactly why the pack stores them whole.
- **Vikalpa**: a `Forms` list with several members, and several lyap entries for one upasarga (आगम्य / आगत्य), share **one** slot; any member fills it; finding a second member later scores a "vikalpa" bonus and is listed beside the first.
- **Rack** = union of `splitAksharas(form)` over all accepted forms (including alternates), de-duplicated, shuffled. Input is a sequence of rack akṣaras, compared as a joined string after `normalizeDeva`.
- String-equal targets share one slot labelled with both types.
- Slot type tags: the fixed labels of `krdanta-racana` plus `LAKARA_NAMES.lat`.
- A real word outside this root's pack family is never called wrong, only "not in the list".

## Content
- Eligible roots: `dhatusForLevel(level)` with ≥ 8 slots. Most of the 199 roots qualify from kṛdantas alone; the 155 prefixed verbs and 41 lyap lists (कृ, हृ, गम्, भू, ईक्ष् lead) give the richest boards.
- Levels — L2: bare-root rows only, fields laṭ, ktva, tumun, kta, ktavatu (5–6 slots; threshold lowered to ≥ 5). L3: + prefixed laṭ and lyap, tavya, anīyar; board capped at 14 slots (seeded subset of upasarga rows). L4: + śatṛ / śānac, cap 18.
- Minimum pool: ≥ 40 eligible roots per level (asserted). Daily root: eligible roots sorted by id, shuffled once with a fixed seed, indexed by `puzzleNumber(ctx.dateKey)`.
- A rack over 24 akṣaras lowers the board cap until it fits.

## Modes, levels, scoring
- Score: 10 × akṣara count per found form; +20 vikalpa bonus; +50 for a complete board; −10 per hint.
- Stars: 100 % of slots → 3; ≥ 70 % → 2; ≥ 40 % → 1.
- HUD: `timeLeftMs`, `score`, `label` "7 / 12".
- Mastery: one event per slot — `krdanta` · `<dhatuId>:<field>` · `<dhatuId>:lyap:<upasarga>`; `kriyapada` · `prefixed:<prefixedId>` · `dhatu:<dhatuId>:lat:1.1`; correct = found without a hint.
- Share card (daily): `9/12 ⏱` plus one square per slot in board order — 🟩 found, 🟨 found with hint, ⬜ missed.
- `best: { label: 'Best board %', value }`. Daily state (found forms, time left) in `ctx.store` by `ctx.dateKey`.

## UX notes
Portrait: root card; family board as wrapping rows of slot pills (found forms as `<SaText>`); current input line; rack as a 6-column grid of `Tile` buttons (≥ 44 px); Hint / Clear / Enter. No physical-keyboard spelling in v1. End screen: the full family with glosses. `ctx.expose({ phase, targets: [{ slot, forms, tiles }], found })`.

## Acceptance tests
- `logic.test.ts`: for every eligible root, every accepted form can be spelled from the rack (`splitAksharas(form)` ⊆ rack) and maps to exactly one slot.
- `logic.test.ts`: named family from the pack — `gam-1p` at L3 includes गच्छति, गत्वा, गन्तुम्, गतः, आगच्छति, and one slot accepting both आगम्य and आगत्य; entering "आगत्वा" is rejected as "not in this root's family".
- `logic.test.ts`: no slot text is produced by concatenation — every target string is identical to a pack string (set membership).
- `logic.test.ts`: `testMatrix([2, 3, 4], 25)` → slot caps and field sets per level; rack ≤ 24; deterministic.
- `logic.test.ts`: perfect bot (spells every `Forms[0]`) → `won`, 3 stars, before the clock; idle bot → `completed` with 0; random-tile bot never crashes; timer ends at 120 000 ms; hint accounting.
- `logic.test.ts`: daily order has no repeat within the pool size; pool assertions.
- `e2e.spec.ts`: find three forms by tapping rack tiles at 390 px, one unknown string, one hint, then let the (shortened via `e2e`) timer end → result with share squares; reload mid-daily restores found forms; IAST run; no overflow with a 24-tile rack at 360 px; no console errors.

## Out of scope / later
Other finite forms; feminine / neuter kṛdantas; full-keyboard typing; lyuṭ / ghañ nouns (not in the pack).

## Open questions
- Sanskrit reviewer: are type tags enough of a clue, or should each slot show its English gloss from the start at L2?
- Product: is 120 s right for 14 slots on a phone?
