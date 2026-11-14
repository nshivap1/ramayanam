# रामायणयात्रा · Rāmāyaṇa-yātrā

A retro story RPG through all six kāṇḍas of Vālmīki's Rāmāyaṇa, built on 21 real ślokas. You walk with Rāma, Lakṣmaṇa and Hanumān, hear each verse at the moment the story speaks it, and cast astras by reciting lines of those verses. You can play in English, संस्कृतम् + English, or entirely in simple spoken Sanskrit.

This repository is the standalone home of the game. The game is one game folder of the **Samskuru** platform, which is a web app for Sanskrit learning games. The platform code is included here so that the game builds and runs on its own. It is the same code as in Samskuru, so the folder `src/games/ramayana-yatra/` can move between the two repositories unchanged.

## Two ways to play
- **Kathā (story first).** This is the default for the Sanskrit modes.
  - Each verse appears at its moment in the story as पदच्छेदः → अन्वयः → सरलार्थः.
  - You cast astras by reciting a line of their verse: one tap fills the missing word.
  - There are no random battles and no quizzes.
  - A gold marker on the map shows where to go next.
  - The great scenes are played, not just told (v0.5): the Krauñca birds, Guha's ferry, the golden deer, Jaṭāyu, a verse-chain duel with Hanumān, walking as Hanumān through Laṅkā by night and setting it ablaze, Nala's bridge, Rāvaṇa in phases, the Puṣpaka return and the Lava–Kuśa recital as the ending.
  - Mid-battle with Rāvaṇa, the **Āditya-hṛdayam** plays as a cutscene that leaves the flat battle for a 3D view: all 31 verses (Yuddha 6.105) with English, lit line by line so you can follow along. Replay it from the verse book.
- **Abhyāsa (practice).** Every move in battle is a Sanskrit question about words, sandhi or grammar.

## Run it

You need Node 22.6 or newer.

```bash
npm install
npm run dev            # http://127.0.0.1:5173/#/play/ramayana-yatra  (rebuilds on save)
npm run check -- --e2e --game=ramayana-yatra   # the gate: types · unit · contract · build · browser
```

To deploy it on its own: `node tools/vercel-build.mjs` with `SAMSKURU_GAME=ramayana-yatra` builds only this game into `dist/`, and the page opens straight into it. That variable is what the Vercel project `ramayanam` sets.

## Where things are

| Path | What |
|---|---|
| `src/games/ramayana-yatra/` | The game: `PRD.md` (the spec), `logic*.ts` (pure, seeded rules), `view-*.tsx`, `content/` (story, verses, lexicon, Sanskrit tables), tests |
| `src/games/ramayana-yatra/notes/` | Design notes: Kathā (`katha.md`), Sanskrit style (`sambhashana.md`, `sa-ui.md`), the reviews and the v0.4.2 audit (`audit-*.md`), the v0.5 plan and package notes (`v05b-*.md`) |
| `src/games/ramayana-yatra/REVIEW.md` | What a human Sanskrit teacher should check, in priority order |
| `src/games/akshara-paricaya/`, `src/games/smrti-yugala/` | The platform's two reference games. Its contract tests use them. |
| `src/app`, `src/sdk`, `src/ui`, `src/sanskrit`, `src/content`, `tools`, `tests`, `docs` | The Samskuru platform. See [AGENTS.md](AGENTS.md) and [docs/](docs/). |

## Sanskrit status

Every Sanskrit word the game shows passes a machine check against verified content packs. All lines have also had independent model reviews, including a full audit in v0.4.2. None of it has been reviewed by a human yet. Before a public release, a Sanskrit teacher should go through `REVIEW.md`, starting with the anvaya and सरलार्थः texts of the 21 verses.

---

## The Samskuru platform (संस्कुरु)

Samskuru is one installable web app (a PWA) that hosts many small Sanskrit learning games on a
shared platform: a game SDK, a design system, a Sanskrit engine, verified content packs and a test
harness. Each game is a self-contained folder, so many people and coding agents can add games in
parallel without touching each other's work or a central list.

The idea comes from the project's founding deck: most learners meet Sanskrit in a weekly class and
then do not use it until the next one. Samskuru fills that gap with **daily, lightweight, engaging
practice** — two-minute quick hits, a streak worth keeping, results you can share without spoilers,
and variable rewards (stars, personal bests, unlocks, a new daily puzzle) — so that what was taught
on Sunday is used on Monday. Two rules outrank everything else: the Sanskrit must be correct, and
nothing half-built ships. Both are spelled out in [AGENTS.md](AGENTS.md).

### Screenshots

<!-- SCREENSHOTS: replace this block with images once the first release is cut.
     Generate them with:  node tools/screenshot.mjs "#/learn?e2e=1" docs/screenshots/learn.png -->

| Learn (path, streak, daily puzzles) | A game in play | Result and share card |
|---|---|---|
| _placeholder_ | _placeholder_ | _placeholder_ |

### Quick start

Requires Node 22.6 or newer.

```bash
npm install        # once
npm run dev        # http://127.0.0.1:5173 — rebuilds on save, refresh the page
npm run check      # the gate: registry · types · content · unit · contract · build
```

Add `-- --e2e` to `npm run check` to include the browser tests (first run:
`npx playwright install chromium`). To work on one game in isolation use
`npm run check -- --e2e --game=<id>`. All commands are listed in [AGENTS.md](AGENTS.md#commands).

### Repository map

| Path | What lives there | Owner doc |
|---|---|---|
| `src/sanskrit` | Deterministic Sanskrit engine: transliteration, akṣara segmentation, sandhi, metre, numbers | [src/sanskrit/README.md](src/sanskrit/README.md) |
| `src/content` | Verified content packs, imported as `@content/<pack>`: `shabda`, `dhatu`, `vocab`, `sentences`, `sandhi`, `samasa`, `subhashita` — each with provenance, a `README.md` and a `REVIEW.md`. `npm run validate` prints the content report | [docs/SANSKRIT_ACCURACY.md](docs/SANSKRIT_ACCURACY.md) |
| `src/sdk` | The game contract, seeded RNG, quiz engine, progress (XP, streak, mastery), storage, share | [docs/GAME_CONTRACT.md](docs/GAME_CONTRACT.md) |
| `src/ui` | Design system: tokens, components, hooks, `<QuizRunner>`, the akṣara keyboard | [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) |
| `src/games/<id>` | One folder per game: manifest, pure logic, tests, component, browser test, PRD | [AGENTS.md](AGENTS.md) |
| `src/app` | The shell: routing, catalogue, learning path, profile, game host, result screen | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| `labs` | Experiments, hidden unless Labs is switched on | [labs/README.md](labs/README.md) |
| `tests` | Repo-wide contract tests and the browser-test harness | [docs/TESTING.md](docs/TESTING.md) |
| `tools` | Zero-config scripts: build, dev server, test runner, scaffolder, gate, screenshots | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#build-pipeline) |
| `docs` | Contract, architecture, decisions (`docs/adr`), PRDs (`docs/prd`), research | this table |
| `public` | Static files: HTML template, web manifest, service worker template, fonts, icons | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#pwa-and-service-worker) |

### Where to go next

- **Build or change a game** → [AGENTS.md](AGENTS.md), then [docs/GAME_CONTRACT.md](docs/GAME_CONTRACT.md).
- **Contribute in any other way** (PRD, content, Sanskrit review, bug report) → [CONTRIBUTING.md](CONTRIBUTING.md).
- **Understand the platform** → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the decision records in [docs/adr](docs/adr/0001-react-typescript-esbuild.md).
- **Use the UI kit** → [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
- **Write tests** → [docs/TESTING.md](docs/TESTING.md).
- **See what is planned** → [docs/ROADMAP.md](docs/ROADMAP.md) for the platform and the PRD index [docs/prd/README.md](docs/prd/README.md) for games.
- **Know what "verified Sanskrit" means here** → [docs/SANSKRIT_ACCURACY.md](docs/SANSKRIT_ACCURACY.md).

### Games

<!-- GAMES-TABLE -->
33 games

| Id | Game | Kind | Skills | Levels | Modes | Status |
|---|---|---|---|---|---|---|
| [`akshara-paricaya`](src/games/akshara-paricaya/PRD.md) | अक्षरपरिचयः · Meet the letters | lesson | akshara | L0 | practice | stable |
| [`akshara-tadana`](src/games/akshara-tadana/PRD.md) | अक्षरताडनम् · Whack the akṣara | arcade | akshara | L0 L1 | timed, practice | stable |
| [`antyakshari`](src/games/antyakshari/PRD.md) | अन्त्याक्षरी · Last-letter chain | puzzle | shabdakosha, akshara | L1 L2 L3 | endless, practice, daily | stable |
| [`catushtaya`](src/games/catushtaya/PRD.md) | चतुष्टयम् · Fours | daily | shabdakosha, vibhakti, kriyapada, krdanta, samasa, avyaya, subhashita | L2 L3 L4 | daily, practice | stable |
| [`chando-laya`](src/games/chando-laya/PRD.md) | छन्दोलयः · Metre beat | puzzle | chandas, subhashita, akshara | L3 L4 L5 | practice, timed, daily | stable |
| [`dipa-raksha`](src/games/dipa-raksha/PRD.md) | दीपरक्षा · Save the lamps | puzzle | akshara, shabdakosha | L0 L1 L2 | practice, daily | stable |
| [`kah-corah`](src/games/kah-corah/PRD.md) | कः चोरः? · Who is the thief? | puzzle | vibhakti, vakya | L2 L3 | daily, practice | beta |
| [`kah-samayah`](src/games/kah-samayah/PRD.md) | कः समयः? · What time is it? | lesson | sankhya | L1 L2 | practice, timed, daily | stable |
| [`katha`](src/games/katha/PRD.md) | कथा · Stories | lesson | vakya, shabdakosha | L1 L2 | practice | beta |
| [`koti-pati`](src/games/koti-pati/PRD.md) | कोटिपतिः · Crorepati quiz | quiz | shabdakosha, vibhakti, kriyapada, sandhi, samasa, krdanta, akshara, sankhya, vakya, chandas, subhashita, avyaya | L1 L2 L3 L4 | practice, daily, timed | stable |
| [`lakshya-sankhya`](src/games/lakshya-sankhya/PRD.md) | लक्ष्यसङ्ख्या · Target number | puzzle | sankhya | L1 L2 | practice, daily | beta |
| [`pada-pata`](src/games/pada-pata/PRD.md) | पदपातः · Falling words | arcade | vibhakti | L1 L2 L3 | endless, timed, practice | stable |
| [`pada-shodha`](src/games/pada-shodha/PRD.md) | पदशोधः · Word hunt | daily | shabdakosha, akshara | L1 L2 L3 | daily, practice | stable |
| [`pada-sopana`](src/games/pada-sopana/PRD.md) | पदसोपानम् · The word ladder | puzzle | shabdakosha, akshara | L1 L2 L3 | daily, practice | beta |
| [`padani`](src/games/padani/PRD.md) | पदानि · Word cards | lesson | shabdakosha | L0 L1 L2 L3 | practice, daily | stable |
| [`patha-mala`](src/games/patha-mala/PRD.md) | पाठमाला · Lesson garland | lesson | shabdakosha, kriyapada, vibhakti, vakya, krdanta | L1 L2 L3 | practice, daily | stable |
| [`pathashala`](src/games/pathashala/PRD.md) | पाठशाला · The Sanskrit course | lesson | vakya, akshara, shabdakosha, vibhakti, kriyapada, sankhya, sandhi, subhashita | L0 L1 L2 | practice | beta |
| [`ramayana-yatra`](src/games/ramayana-yatra/PRD.md) | रामायणयात्रा · Journey through the Rāmāyaṇa | arcade | subhashita, shabdakosha, sandhi, vibhakti, chandas | L2 L3 L4 | practice | beta |
| [`rupa-rahasya`](src/games/rupa-rahasya/PRD.md) | रूपरहस्यम् · The secret form | daily | vibhakti | L2 L3 | daily, practice | beta |
| [`rupa-trika`](src/games/rupa-trika/PRD.md) | रूपत्रिकम् · Verb-form Set | puzzle | kriyapada | L2 L3 L4 | practice, timed, daily | stable |
| [`samasa-setu`](src/games/samasa-setu/PRD.md) | समाससेतुः · Compound bridge | arcade | samasa | L4 L5 | timed, practice, daily | stable |
| [`sandhi-cheda`](src/games/sandhi-cheda/PRD.md) | सन्धिच्छेदः · Sandhi splitter | arcade | sandhi | L2 L3 L4 | practice, timed, daily | stable |
| [`sandhi-melana`](src/games/sandhi-melana/PRD.md) | सन्धिमेलनम् · Sandhi 2048 | puzzle | sandhi | L2 L3 L4 | endless, timed, daily | stable |
| [`sankhya-pattika`](src/games/sankhya-pattika/PRD.md) | सङ्ख्यापट्टिका · Number bingo | puzzle | sankhya, akshara | L0 L1 L2 | practice, timed, daily | stable |
| [`sarpakshara`](src/games/sarpakshara/PRD.md) | सर्पाक्षरम् · Akṣara snake | arcade | subhashita, akshara | L2 L3 L4 | practice, daily, timed | stable |
| [`shloka-racana`](src/games/shloka-racana/PRD.md) | श्लोकरचना · Compose the verse | puzzle | chandas, subhashita | L3 L4 L5 | practice, daily | beta |
| [`shloka-yojana`](src/games/shloka-yojana/PRD.md) | श्लोकयोजनम् · Verse builder | daily | subhashita, shabdakosha, sandhi | L2 L3 L4 L5 | daily, practice | stable |
| [`shuka-uddayana`](src/games/shuka-uddayana/PRD.md) | शुकोड्डयनम् · Parrot flight | arcade | kriyapada, vakya | L1 L2 L3 | endless, practice, daily | stable |
| [`smrti-yugala`](src/games/smrti-yugala/PRD.md) | स्मृतियुगलम् · Memory pairs | puzzle | akshara | L0 | practice, daily | stable |
| [`vakya-racana`](src/games/vakya-racana/PRD.md) | वाक्यरचना · Sentence builder | lesson | vakya, kriyapada, vibhakti | L1 L2 L3 | practice, daily | stable |
| [`varna-gola`](src/games/varna-gola/PRD.md) | वर्णगोलः · Colour ball | arcade | shabdakosha | L1 L2 L3 | practice, daily | stable |
| [`varna-rahasya`](src/games/varna-rahasya/PRD.md) | वर्णरहस्यम् · The secret sound | daily | akshara | L0 L1 | daily, practice | beta |
| [`varna-vyuha`](src/games/varna-vyuha/PRD.md) | वर्णव्यूहः · The sound formation | puzzle | akshara | L0 L1 | daily, practice | beta |
<!-- /GAMES-TABLE -->

### Licence

- **Code:** to be chosen by the maintainers. **TODO** — until a `LICENSE` file is added, no licence
  is granted beyond what the law allows by default; do not assume the code is open source.
- **Fonts:** Noto Sans Devanagari and Tiro Devanagari Sanskrit are distributed under the SIL Open
  Font License 1.1. The licence texts ship next to the font files:
  [OFL-NotoSansDevanagari.txt](public/fonts/OFL-NotoSansDevanagari.txt),
  [OFL-TiroDevanagariSanskrit.txt](public/fonts/OFL-TiroDevanagariSanskrit.txt).
- **Content:** every content pack under `src/content` lists its own sources, and each item carries
  its provenance; see the pack's `README.md` / `REVIEW.md` and
  [docs/SANSKRIT_ACCURACY.md](docs/SANSKRIT_ACCURACY.md). Third-party material is used only under
  the terms stated there.
