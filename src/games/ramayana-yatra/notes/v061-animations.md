# v0.6.1: the story moves on screen (15 Nov 2026)

Owner's request: moments where a lot happens in the story but nothing changes on screen should get animations that
follow the written text — **the text and storyline stay exactly as they are** (Krauñca at the start and the army
falling to Indrajit's weapon were the owner's examples; the Puṣpaka's return was named a prime candidate). Also: the
Āditya-hṛdayam was told twice in Kathā (Agastya's lesson before the gate, then the told cutscene in the battle); it is
now told once, mid-battle, when the hymn becomes Rāma's only way.

Everything here is **Kathā only**. The practice journey's state is untouched (the v0.5b guard `V05A_PRACTICE` and
`V03_SNAPSHOT` keep their hashes); it keeps Agastya's lesson before the gate.

## How the moments were found

`/home/claude/scratch/v061/audit.py` walked every Kathā script and listed runs of three or more story lines (say,
verse, choice) with no visual change between them (no kit command, warp, move, fade or cutscene). Each run was read
against the text and given effects that show what the lines say — never more than the text says. The placements live
in `/home/claude/scratch/v061/spec.py` (154 entries over 51 events, books 1–6); `apply.py --write` inserted them and
checked that every story line is unchanged (English text, order, speakers, verses).

## Engine additions (logic-stage.ts, view-stage.ts, view-screen.tsx, view-told.tsx)

| command | what it does | notes |
|---|---|---|
| `{ "emote": id, "icon": …, "ms"? }` | a speech-bubble icon over a figure: music, heart, tears, exclaim, question, anger, dots, sleep, sparkle | hides the speaker's typing dots while it shows |
| `{ "hop": id \| [ids], "n"? }` | a figure (or a placed prop) hops 1–3 times | joy, alarm, a start |
| `{ "focus": pos \| null }` | the camera holds on a tile (eased in and out more slowly than the walk follow); `null` / "player" lets go | cleared at a warp and at the script's end |
| `fx`: wind, smoke, birds, embers, dust, rays, lamps | seven new screen effects | each with a reduced-motion path |
| `glow` … `"color": "fire"` | flames instead of the gold glow | Jaṭāyu's and Śabarī's fires |
| `prop` … `"to"`, `"ms"` | **a prop's move now glides for its `ms`** (v0.6 content already wrote these: the deer, the Ocean rising, Surasā…; the view had used 600 ms for every move) | capped at 20 s |
| props `palm_book`, `ring`, `jewel`, `necklace`, `vimana` | art-v061.ts | `vimana` is a **flying prop**: drawn in the air above the light with a shadow on its tile |

All are Kathā-only (world.test refuses them outside a Kathā block); kit commands never wait.

## The moments (by book)

- **Bāla:** Krauñca — the camera frames the ford, Vālmīki admires the water, the birds sing (music, hearts, a hop), the
  hunter's arrow, the bird falls, its mate's tears and Vālmīki's, the illusion (night, wind, smoke, birds scattering), the
  palm-leaf book handed to the player and carried. Tāṭakā bursts out vast and falls like a mountain; birdsong returns.
  Viśvāmitra's sacrifice: the fire, the darkened sky, Mārīca carried away, dawn.
- **Ayodhyā:** a bright morning, flowers, singing; the palace at night (Kaikeyī's demand, the king struck and weeping);
  the chariot leaving, the first night, Guha's watch, Bharata's host and the news of the king.
- **Araṇya:** Pañcavaṭī's seasons, Śūrpaṇakhā driven off, an army gathering; the golden deer beside Sītā; Khara's army
  scattering; Mārīca's true form and the cry; the empty hut; Jaṭāyu's fire; Kabandha rising; Śabarī's fire.
- **Kiṣkindhā:** Hanumān's true form, the alliance fire, Sītā's jewels handed over and Rāma's tears, the caves, autumn,
  the ring, Sampāti, the ocean's roar.
- **Sundara:** Maināka rising, Surasā growing with Hanumān, Siṃhikā, Laṅkā's walls and lamps, the search and despair, the
  grove (Rāvaṇa comes and storms off, the blade of grass), the ring and the crest-jewel handed over, the burning tail.
- **Yuddha:** Vibhīṣaṇa in the air, the bridge, the army crossing, the torches, the battle; Kumbhakarṇa; **the army
  falls to Indrajit's weapon** (the heroes stand on the field as figures; night, smoke, arrows from the clouds, all
  topple; Jāmbavān sends Hanumān, who hops and leaps north; after the herbs everyone rises in light, held 1 s by a
  `wait` (the v0.6 pacing rule: Kathā waits ≤ 1 s; the rays and petals play on after it) because nothing after it waits and the stage clears at a script's end — an audit of every script found no other
  stage animation cut off by a script's end or a warp); Indrajit in his
  clouds; Rāvaṇa's fall; **the Puṣpaka** (below); the sandals; Ayodhyā's lamps; the coronation, the necklace for
  Hanumān, Rāma-rājya; the twins' recital in the epilogue.

## The Puṣpaka's return (Yuddha 6.121–123)

Before: four lines and five verse questions on the palace floor of Laṅkā, nothing moving. Now the Puṣpaka (a gold,
swan-prowed pavilion on a cloud, Rāma and Sītā under its roof, shown at twice its size) flies over the places of the
story, **one place for each stop**, so Rāma's "Not there. Look down again." can be taken literally:

| line / verse | the place below |
|---|---|
| "… boarded the flying chariot Pushpaka and rose into the sky" | Laṅkā by night (lanka_city) — it rises up the royal road |
| "From the Pushpaka, Rama shows Sita …", एष सेतुर्मया बद्धः, then the Laṅkā question | the bridge (setu), flying north along it |
| the ocean-shore verse (Vibhīṣaṇa's refuge) | the shore (setu_shore); a glow where Vibhīṣaṇa stood |
| Ṛṣyamūka's verse | Ṛṣyamūka; a glow on the alliance fire |
| the golden deer's verse | Pañcavaṭī, the hut empty; a glow where Sītā stood |
| the Ayodhyā verse | Ayodhyā (ayodhya_city); light on the palace door |

Each place: fade out → warp (the player is parked on a far, walkable tile out of the camera's view) → the "ayodhya"
music again (a warp would switch to the map's own track) → the camera focus → the chariot placed and grown → a 0.6 s
wait → fade in → a 4.5–5 s glide. The questions and the misread loops are untouched (the warp is before each verse,
the loop returns to the question after it). The stage, the focus and the music override all end with the warp home.
Practice: the same lines, straight home from the palace.

## The Āditya-hṛdayam, told once (Kathā)

- **Before the gate:** Agastya's NPC is practice-only (`showIf: ch6.indrajit_defeated&!style.katha`); the palace gate
  requires `restored.s-aditya-hrdayam|style.katha&ch6.indrajit_defeated` (testFlag: `|` = any of the `&` groups); the
  walkthrough's "talk to Agastya" step is `style: "abhyasa"` (practice-only steps are new: `stepInJourney` already
  compared a step's style with the save's). Indrajit's last objective in Kathā: "Go to the city's southern gate and
  enter Ravana's palace." (sa-dialogue-12; a new line, so the text of file 3 is untouched).
- **In the battle:** at 60 % the told cutscene plays as before; in Kathā it now **teaches** the hymn: heard and restored
  (flags, record, session), its moves armed (the Āditya-hṛdayam and the brahmāstra, as a recital would), and a beat:
  "Agastya departs. Now Rama uses only the Aditya-hridaya." / अगस्त्यः गच्छति। अधुना रामः {m.acc} एव प्रयुङ्क्ते। — right
  after the beat the scene played over (the hit that crossed 60 %), with its HP, before the rest of that turn.
- **The only way:** katha.json's new phase `ravana_weary` (below 0.6, fit aditya_hrdaya, `only`, `once`): while it has
  begun and is not spent, and the hero in front holds the hymn, every other move is greyed (`battleMenu` usable) and a tap
  on one does nothing; casting the hymn marks it spent (`ravana_weary:spent` in bossPhases) and the fight goes on: the
  heads, Mātali, the brahmāstra, as before. A hero without the hymn is never held.
- **Pacing:** the Kathā census's Rāvaṇa fight: strategic 5.2 → 8.1 turns, spammer 11.9 → 8.0 (the story now hands the
  brahmāstra over at 60 % and forces one hymn turn on everyone). The census's "spammer ≥ 30 % slower on bosses" is now
  measured on the bosses the story does not lead (10.94 vs 8.31 turns, +32 %); all bosses: 10.68 vs 8.29.

## Tests

`v061.test.ts` (prop glide time; the Puṣpaka's six places in Kathā with the chariot, its size and the camera; practice
flies straight home; the gate, Agastya and the walkthrough step in both journeys; testFlag's `|`). The hymn-only phase:
tactics.test (`phases (v0.6.1)`); the teaching: cutscene.test. Updated for the change: the phases content test, three
phase tests (they start with the hymn already recited), the v0.5b step counts (journey-aware), the walkthrough
validator (`abhyasa` steps), scene 14's anchor in Kathā, the choice-block test (fades and waits before a question).
