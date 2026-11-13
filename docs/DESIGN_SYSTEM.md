# Design system

The shared look and the UI kit in `src/ui` (imported as `@ui`). Games use these components and
tokens before writing anything of their own, so forty games read as one product. The rules at the
end are enforced by `tests/contract/games.test.ts`.

Every code example on this page is compiled: it is copied from
`tests/docs/design-system.examples.tsx`, which the type-checker covers and the contract test
compares with this page.

## Visual language

- **Parchment, maroon, saffron.** The palette comes from the founding deck: a warm paper background, deep maroon for the brand and default accent, saffron for energy. Six further hues (indigo, teal, gold, rose, leaf, plum) give each game its own accent without leaving the family.
- **Chunky, pressable controls.** Buttons, choices, tiles and chips have a solid bottom edge (`--edge`, 4 px) that collapses when pressed. It reads as a physical key, works without hover, and gives touch feedback with no animation library.
- **Large Devanagari.** Sanskrit is set bigger and with more line height than the Latin text around it; the akṣara is the visual unit.
- **Quiet chrome, loud content.** The shell's bars are plain; colour is spent on the play area, feedback (green / red, always with a ✓ / ✕) and the game's accent.
- **Light and dark** share every token name; a game that uses tokens gets dark mode for free.

## Tokens

Defined in `src/ui/tokens.css`. Use them as `var(--name)`. Games must not hard-code colours.

### Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#fff6ee` | `#1a1310` | page background |
| `--paper-2` | `#fbeadb` | `#231a16` | subtle fill, hover |
| `--paper-3` | `#f3dcc8` | `#2f231d` | tracks, keyboard keys |
| `--surface` | `#ffffff` | `#261c18` | cards, buttons, sheets |
| `--ink` | `#2a1a14` | `#f6ebe2` | text |
| `--ink-2` | `#5b463c` | `#d2bfb2` | secondary text |
| `--ink-3` | `#8d776b` | `#a08c80` | muted text |
| `--line` | `#ead8c8` | `#3a2c25` | hairlines, card borders |
| `--line-strong` | `#d9bfa9` | `#524036` | control borders and edges |
| `--ok` / `--ok-ink` / `--ok-soft` | `#3f9b2f` / `#2c741f` / `#dcf5d3` | `#6cc25a` / `#4e9a3f` / `#1f3a1a` | correct |
| `--bad` / `--bad-ink` / `--bad-soft` | `#d8433b` / `#a52a24` / `#fde0dd` | `#ef6b63` / `#c64a43` / `#421e1c` | wrong, lives |
| `--warn` / `--warn-soft` | `#d79a12` / `#fdf0c8` | `#e8b63c` / `#3d3113` | "present" tiles, badges |
| `--mute` / `--mute-soft` | `#b9a79b` / `#efe5dc` | `#6f5f55` / `#2e2520` | "absent" tiles, disabled |

Hue families — each has a base, an `-ink` (darker: edges, text on soft) and a `-soft` (tint: fills):

| Hue | `--<hue>` light / dark | `--<hue>-ink` light / dark | `--<hue>-soft` light / dark |
|---|---|---|---|
| `maroon` | `#7a1027` / `#e0607b` | `#5a0b1c` / `#b84560` | `#f6dfe3` / `#3d1c24` |
| `saffron` | `#e8743b` / `#f08a55` | `#b9521f` / `#c56a39` | `#fde4d3` / `#40261a` |
| `indigo` | `#2f4f8f` / `#7ea0e6` | `#213a6b` / `#5c7fc7` | `#dfe7f6` / `#1f2a42` |
| `teal` | `#1f8a83` / `#45b8b0` | `#146560` / `#2f928b` | `#d6f0ed` / `#173533` |
| `gold` | `#c98a1b` / `#e3ac45` | `#946310` / `#b98a2e` | `#fbecc9` / `#3b2e14` |
| `rose` | `#d6497a` / `#ee79a2` | `#a32f58` / `#c4577f` | `#fbdde8` / `#40202d` |
| `leaf` | `#4c9a2a` / `#7cc55a` | `#36721b` / `#5c9f3e` | `#e0f3d5` / `#22361a` |
| `plum` | `#7b4bb3` / `#a985dd` | `#5a3489` / `#8765bb` | `#eadffa` / `#2c2140` |

**Accent.** `--accent`, `--accent-ink`, `--accent-soft` point at one hue family. The default is
maroon (the shell). Inside a game they point at the family named by `manifest.hue`: the game host,
game cards and path nodes carry the class `hue-<name>`. In a game, write `var(--accent)` — never a
hue by name — and the game is recoloured by changing one word in its manifest.

### Type

| Token | Value | Use |
|---|---|---|
| `--font-ui` | system UI stack, then the Devanagari font | interface text |
| `--font-deva` | `'Samskuru Deva'` (Noto Sans Devanagari, variable 100–900), then system Devanagari fonts | Sanskrit in Devanagari |
| `--font-shloka` | `'Samskuru Shloka'` (Tiro Devanagari Sanskrit), then `--font-deva` fonts | verses, the brand |
| `--font-iast` | `'Gentium Plus', 'Charis SIL', 'Noto Serif', Georgia, 'Times New Roman', serif` | Sanskrit in IAST (no IAST font is shipped; the first installed one is used) |
| `--fs-xs` … `--fs-3xl` | `0.75rem`, `0.875rem`, `1rem`, `1.25rem`, `1.5rem`, `2rem`, `2.75rem` | `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl` |

### Space, shape, elevation

| Token | Value |
|---|---|
| `--s-1` … `--s-7` | `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px` |
| `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-pill` | `8px`, `12px`, `16px`, `24px`, `999px` |
| `--edge` | `4px` — the pressable bottom edge |
| `--shadow-1`, `--shadow-2` | resting card; sheets and toasts (darker in the dark theme) |
| `--topbar-h`, `--nav-h`, `--content-max` | `56px`, `64px`, `560px` |
| `--safe-top`, `--safe-bottom` | `env(safe-area-inset-*)` — already applied by the shell and by sticky bars |

### Motion

| Token | Value | Use |
|---|---|---|
| `--t-fast` | `120ms` | presses, hovers |
| `--t-med` | `220ms` | state changes, sheets, pops |
| `--t-slow` | `420ms` | shakes, progress, result stars |
| `--ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | default |
| `--ease-pop` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | overshoot for rewards |

Ready-made animations: classes `sk-anim-pop`, `sk-anim-shake`, `sk-anim-flip`, `sk-anim-bounce`
(keyframes `sk-pop`, `sk-shake`, `sk-fade`, `sk-rise`, `sk-flip`, `sk-bounce`). With Reduce motion
on (the setting or the OS preference) every animation and transition is cut to 1 ms by the
design system; you only need to handle JavaScript-driven motion yourself
(`ctx.settings.reducedMotion`).

## Components

All exported from `@ui`. Sanskrit props (`sa`) take Devanagari and are rendered through
`<SaText>`, so they follow the user's script setting unless `script` locks it.

### Button

Extends the native `<button>` attributes (`onClick`, `disabled`, `data-testid`, …); `type`
defaults to `"button"`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'ok' \| 'bad'` | `'primary'` | primary uses the accent; `ok` / `bad` are for feedback |
| `size` | `'md' \| 'sm'` | `'md'` | 48 px / 36 px high |
| `full` | `boolean` | `false` | full width |

```tsx
return (
  <div className="sk-stack">
    <Button full disabled={!canCheck} onClick={onCheck} data-testid="check">
      Check
    </Button>
    <Button variant="secondary" size="sm" onClick={onSkip}>
      Skip
    </Button>
  </div>
);
```

### IconButton

A 44 × 44 px round button for a glyph. Extends the native `<button>` attributes.

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` (required) | becomes `aria-label` and `title` |
| `children` | node | the glyph |

```tsx
return (
  <IconButton label="Hint" onClick={onHint} data-testid="hint">
    💡
  </IconButton>
);
```

### Choice

A selectable answer row (what `<QuizRunner>` uses for multiple choice).

| Prop | Type | Default | Notes |
|---|---|---|---|
| `sa` | `string` | | Sanskrit label (Devanagari) |
| `text` | `string` | | plain label; shown small and muted next to `sa` when both are given |
| `state` | `'idle' \| 'selected' \| 'correct' \| 'wrong' \| 'muted'` | `'idle'` | `selected` also sets `aria-pressed` |
| `hotkey` | `string` | | badge such as `"1"` (handle the key yourself with `useKeydown`) |
| `disabled` | `boolean` | | |
| `onClick` | `() => void` | | |
| `script` | `'deva' \| 'iast'` | user setting | lock the script of `sa` |
| `data-testid` | `string` | | |
| `children` | node | | extra content after the labels |

Lay choices out with `sk-choices` (one column) or `sk-choices sk-choices--2` (two).

```tsx
return (
  <div className="sk-choices">
    <Choice sa="रामेण" hotkey="1" state={picked === 'a' ? 'selected' : 'idle'} onClick={() => onPick('a')} data-testid="choice-a" />
    <Choice sa="रामाय" hotkey="2" state={picked === 'b' ? 'selected' : 'idle'} onClick={() => onPick('b')} data-testid="choice-b" />
  </div>
);
```

### Tile

A square block for one akṣara: Wordle-style cells, board pieces, keys of a custom pad. Renders a
`<button>` when `onClick` is given, otherwise a `<span>`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `sa` | `string` | | Sanskrit content, usually one akṣara |
| `children` | node | | used when `sa` is not given |
| `state` | `'idle' \| 'filled' \| 'correct' \| 'present' \| 'absent' \| 'selected' \| 'accent' \| 'soft'` | `'idle'` | |
| `size` | `number` (px) | `52` | edge length; the glyph scales with it |
| `onClick` | `() => void` | | makes it a button |
| `disabled` | `boolean` | | buttons only |
| `script` | `'deva' \| 'iast'` | user setting | |
| `label` | `string` | | `aria-label` |
| `className`, `style`, `data-testid` | | | |

```tsx
return (
  <div className="sk-row sk-row--center">
    <Tile sa="सं" state="correct" />
    <Tile sa="स्कृ" state="present" />
    <Tile sa="तम्" state="absent" />
    <Tile sa="क्ष" size={72} onClick={() => onTap('क्ष')} label="kṣa" data-testid="tile-ksha" />
  </div>
);
```

### Chip

A word-bank token. `used` and `done` chips disable themselves.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `sa` | `string` | | Sanskrit label; takes precedence over `text` |
| `text` | `string` | | plain label |
| `state` | `'idle' \| 'used' \| 'selected' \| 'correct' \| 'wrong' \| 'done'` | `'idle'` | `used` = an empty slot left in the bank; `done` = matched and faded |
| `onClick` | `() => void` | | |
| `disabled` | `boolean` | | |
| `script` | `'deva' \| 'iast'` | user setting | |
| `data-testid` | `string` | | |

Containers: `sk-bank` (the wrapping bank) and `sk-answerline` (the ruled area chips are moved to).

```tsx
return (
  <div className="sk-bank">
    <Chip sa="बालकः" state={used ? 'used' : 'idle'} onClick={onUse} data-testid="token-t1" />
    <Chip text="the boy" state="selected" />
  </div>
);
```

### ProgressBar, Hearts, Pill, Card

| Component | Props | Notes |
|---|---|---|
| `ProgressBar` | `value: number` (0–1, clamped), `label?: string` | `role="progressbar"`; filled with the accent |
| `Hearts` | `lives: number`, `max?: number` | ♥ and a count, with an `aria-label` |
| `Pill` | `children`, `tone?: 'accent' \| 'ok' \| 'bad' \| 'gold'`, `data-testid?` | small status label |
| `Card` | `children`, `flat?: boolean`, `className?`, `style?` | bordered surface; `flat` removes the shadow |

The shell already draws progress, score, timer and hearts in the top bar from `ctx.hud(…)` — do
not repeat them in a game. Use these inside the play area (a per-round bar, a combo pill).

```tsx
return (
  <Card flat className="sk-stack">
    <ProgressBar value={done / total} label="Round progress" />
    <div className="sk-row sk-row--between">
      <Hearts lives={lives} max={3} />
      <Pill tone="gold">×{combo}</Pill>
    </div>
  </Card>
);
```

### Sheet

A modal bottom sheet (a centred dialog from 640 px up). Closes on backdrop click, on Escape and
with its own ✕; renders nothing while `open` is false.

| Prop | Type | Notes |
|---|---|---|
| `title` | `string` | heading and `aria-label` |
| `open` | `boolean` | |
| `onClose` | `() => void` | |
| `children` | node | |
| `data-testid` | `string` | set on the backdrop |

```tsx
const [open, setOpen] = useState(false);
return (
  <>
    <Button variant="ghost" onClick={() => setOpen(true)}>
      Show the paradigm
    </Button>
    <Sheet title="रामः — tṛtīyā" open={open} onClose={() => setOpen(false)} data-testid="paradigm-sheet">
      <SaText as="p" nowrap={false}>
        रामेण रामाभ्याम् रामैः
      </SaText>
    </Sheet>
  </>
);
```

### FeedbackBar

The sticky bar shown after an answer: verdict, optional explanation, Continue. `<QuizRunner>`
renders it for you; use it directly only in a custom lesson-like game.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `correct` | `boolean` | | colours the bar; sets `data-correct` |
| `title` | `string` | "साधु! Correct" / "Not quite" | |
| `children` | node | | the explanation or the right answer |
| `onContinue` | `() => void` | | the button is auto-focused, so Enter continues |
| `continueLabel` | `string` | `'Continue'` | |

Test hooks: `data-testid="feedback"` and `"continue"`.

```tsx
return (
  <FeedbackBar correct={correct} onContinue={onContinue}>
    <strong>Correct answer: </strong>
    <SaText>रामेण</SaText>
  </FeedbackBar>
);
```

### SaText and renderSa

**`<SaText>` is the only way to put Sanskrit on screen.** It converts the authored Devanagari to
the user's script, sets the font and `lang`, and prevents hyphenation and mid-word breaks.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `string` | | Sanskrit in Devanagari (the authored form) |
| `script` | `'deva' \| 'iast'` | user setting | lock the script — e.g. a script-teaching game that must show Devanagari |
| `shloka` | `boolean` | `false` | verse typeface (italic serif in IAST) |
| `nowrap` | `boolean` | `true` when the text has no spaces | pass `false` for sentences and verses |
| `as` | `'span' \| 'div' \| 'p'` | `'span'` | |
| `className`, `style`, `data-testid` | | | |

`renderSa(deva, script)` returns the plain string for places JSX cannot reach: `aria-label`s,
canvas text, share cards. `useSettings()` gives the current settings (in a game, `ctx.settings`
is the same object).

```tsx
const { script } = useSettings();
return (
  <div className="sk-stack">
    <SaText>संस्कृतम्</SaText>
    <SaText script="deva">क्ष</SaText>
    <SaText as="p" shloka nowrap={false}>
      धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः
    </SaText>
    <button type="button" aria-label={renderSa('पठति', script)}>
      ▶
    </button>
  </div>
);
```

### AksharaKeyboard

On-screen Devanagari keyboard: vowels, the 33 consonants, anusvāra, visarga, virāma, avagraha,
backspace, enter. It is a controlled input — the editing rules (vowel after a consonant becomes a
vowel sign, virāma joins consonants, marks only where they are legal) are the pure function
`applyKey` in `src/ui/keyboardLogic.ts`, exported together with `keysFor(word)` for bots and
tests.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `string` | | current text (Devanagari) |
| `onChange` | `(next: string) => void` | | called with the edited text |
| `onEnter` | `() => void` | | enter key |
| `keyState` | `Record<string, 'correct' \| 'present' \| 'absent'>` | | colour hints per key label |
| `rareVowels` | `boolean` | `false` | add ॠ and ऌ |
| `disabled` | `boolean` | `false` | |
| `noEnter` | `boolean` | `false` | hide enter when the game has its own submit button |
| `enterDisabled` | `boolean` | `false` | disable only the enter key (e.g. until the row has the right number of akṣaras) |
| `hiddenKeys` | `readonly string[]` | | key labels to leave out (e.g. `['ऽ']`) |

Test hooks: `key-<label>` for every key (for example `key-क`), `key-backspace`, `key-enter`.
Compare typed text with `sameSpelling` (so that फलं = फलम् and गंगा = गङ्गा) and split it with `splitAksharas` (both from `@sanskrit`).

```tsx
const [typed, setTyped] = useState('');
const hints: Record<string, KeyState> = { र: 'correct', म: 'present', क: 'absent' };
return (
  <>
    <div className="sk-typed" aria-live="polite">
      {typed ? <SaText>{typed}</SaText> : null}
    </div>
    <AksharaKeyboard value={typed} onChange={setTyped} onEnter={() => onSubmit(typed)} keyState={hints} />
  </>
);
```

### QuizRunner

Runs a whole lesson from a list of questions: prompt, input for each question kind (`choice`,
`arrange`, `pairs`, `type`), Check, feedback, Continue, hearts and progress in the shell bar,
retry of missed questions, and `ctx.finish` at the end. A lesson-style game is `logic.ts` building
`Question[]` plus this one element.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `ctx` | `GameContext` | | pass the game's `ctx` through |
| `questions` | `readonly Question[]` | | built from verified content with the seeded rng; invalid questions throw at mount |
| `options` | `{ lives?, retryWrong?, points? }` | `3`, `true`, `10` | `lives: 0` = unlimited |
| `buildResult` | `(state, base) => SessionResult` | | adjust the default result (summary, share card …) |

Keyboard: digits pick a choice, Enter checks and continues. Test hooks: `choice-<id>`,
`token-<id>`, `picked-<id>`, `left-<id>`, `right-<id>`, `check`, `continue`, `feedback`; the
exposed snapshot is `{ phase, kind, qid, answer, index, total, lives, score }`.

```tsx
return <QuizRunner ctx={ctx} questions={questions} options={{ lives: 3 }} buildResult={(_state, base) => ({ ...base, summary: `Lesson 1 · ${base.summary ?? ''}` })} />;
```

### FitText and SaMixed

`<FitText sa="एकोनचत्वारिंशत्" />` renders one line of Sanskrit that shrinks to fit the width of its box
instead of overflowing or wrapping (props: `sa`, `script?`, `minPx?` default 12, `className?`, `style?`).
The parent must give it a width. Under the hood it uses the `useFitText(ref, deps, minPx?)` hook, which
switches transitions off on the measured element — needed because reduced-motion mode gives every
property a 1 ms transition, so "set a style, then measure" would otherwise read a stale value.

`<SaMixed text="The pronouns सः and एषः lose their visarga…" />` renders English prose that contains
Devanagari runs (rule summaries, sūtra citations): each run goes through `<SaText>` and so follows the
script setting.

## Hooks

`usePaused()` — `true` while the shell covers the game (help sheet, "leave?" sheet). `useRafLoop`,
`useCountdown` and `useInterval` already stop while paused; call `usePaused()` (or `ctx.isPaused()`)
only if you run your own timers.


| Hook | Signature | Use |
|---|---|---|
| `useSwipe` | `(ref, onSwipe(dir), { threshold = 24, keys = true })` | swipes on an element via pointer events; arrow keys and WASD call the same handler |
| `useKeydown` | `(handler(e), enabled = true)` | window key handler; ignored while typing in an input |
| `useCountdown` | `(totalMs, onExpire, running = true) → { leftMs, reset(ms?), add(ms) }` | wall-clock countdown that pauses while the page is hidden |
| `useInterval` | `(fn, ms \| null)` | interval that always calls the latest `fn`; `null` pauses |
| `useRafLoop` | `(step(dtMs), running)` | animation-frame loop for arcade games; `dtMs` is clamped to 50; pauses when hidden |
| `useLatest` | `(value) → ref` | always-current ref, for listeners and loops |
| `useOnce` | `(fn)` | run once on mount, StrictMode-safe |
| `useSettings` | `() → Settings` | script, sound, motion … (prefer `ctx.settings` in games) |

All timers and listeners clean up on unmount. Keep the simulation itself in `logic.ts`
(`step(state, dtMs, input)`); the hooks only deliver time and input.

```tsx
const board = useRef<HTMLDivElement>(null);
useSwipe(board, onMove, { threshold: 32 });
return <div ref={board} className="sk-stage" data-testid="board" />;
```

```tsx
useKeydown((e) => {
  if (e.key === 'Enter') onSubmit();
  else if (/^[1-4]$/.test(e.key)) onPick(Number(e.key));
});
return null;
```

```tsx
const { leftMs, add } = useCountdown(60_000, onTimeUp);
useInterval(() => ctx.hud({ timeLeftMs: leftMs }), 250);
return (
  <Button size="sm" onClick={() => add(5_000)}>
    +5 s
  </Button>
);
```

```tsx
useRafLoop(step, !paused);
return null;
```

```tsx
const latestScore = useLatest(score);
useOnce(() => ctx.announce('Round started'));
useInterval(() => ctx.hud({ score: latestScore.current }), 1000);
return null;
```

`cx(...parts)` joins class names, skipping falsy values:

```tsx
return <div className={cx('g-my-game__cell', selected && 'is-selected', wrong && 'is-wrong')} />;
```

## CSS utility classes

From `src/ui/ui.css`. Prefix `sk-` belongs to the design system; games use `g-<id>`.

| Class | Effect |
|---|---|
| `sk-stage` | the root of a game's play area: a centred flex column with padding that fills the space under the top bar |
| `sk-stack`, `sk-stack--lg` | vertical grid with 12 px / 24 px gaps |
| `sk-row`, `sk-row--between`, `sk-row--center`, `sk-row--wrap` | horizontal flex row with a 12 px gap and alignment variants |
| `sk-center` | centre content both ways, centred text |
| `sk-h1`, `sk-h2`, `sk-h3`, `sk-small`, `sk-muted` | heading sizes, small text, muted colour |
| `sk-card`, `sk-card--flat` | the `Card` surface as a class |
| `sk-pill`, `sk-pill--accent` / `--ok` / `--bad` / `--gold` | the `Pill` as a class |
| `sk-choices`, `sk-choices--2` | grid for `Choice` rows |
| `sk-bank`, `sk-answerline` | chip bank and answer area |
| `sk-pairs`, `sk-pairs__col` | two-column matching layout |
| `sk-typed` | the box that shows typed text above the keyboard |
| `sk-sr` | visually hidden, still read by screen readers |
| `sk-anim-pop`, `sk-anim-shake`, `sk-anim-flip`, `sk-anim-bounce` | one-shot animations |

## Rules for game styles

1. **No colours of your own.** No hex, `rgb()` or named colours in a game's `style.css` — only tokens. A test rejects hex values.
2. **Scope everything.** Every selector contains `.g-<id>`; every `@keyframes` is named `g-<id>-…`. All game sheets are concatenated into one file, so an unscoped rule would restyle other games.
3. **Use the accent.** `var(--accent)`, `var(--accent-ink)`, `var(--accent-soft)`; choose the hue in `manifest.ts`.
4. **44 px touch targets** at least, and layouts that work at 360 × 640 without horizontal scrolling.
5. **Respect reduced motion.** CSS is handled for you; JavaScript and canvas motion is yours to switch off.
6. **Stable `data-testid`s** on everything a test or bot needs to press.
7. **Well-formed Devanagari in source.** Every Devanagari string literal in a game's `.ts` / `.tsx` files is checked with `validateDeva` and must be NFC; a stray mark such as a lone `ऽ` fails the contract test.

The memory game's whole stylesheet is a good model:

```css
/* src/games/smrti-yugala/style.css */
.g-smrti-yugala__board { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-3); width: 100%; max-width: 420px; }
.g-smrti-yugala__card.is-matched { background: var(--ok-soft); border-color: var(--ok); color: var(--ok-ink); box-shadow: none; }
@keyframes g-smrti-yugala-flip { from { transform: rotateY(90deg); } to { transform: rotateY(0); } }
```

## Devanagari typography

- **Fonts are shipped**, not assumed: Noto Sans Devanagari (variable weight) for text and Tiro Devanagari Sanskrit for verses, both under the SIL OFL, declared in `src/ui/tokens.css` with `font-display: swap` and cached offline. Rare conjuncts therefore look the same on every device.
- **Line height 1.6** for Devanagari (`.sk-sa`), 1.4 for IAST. Devanagari hangs from a head-line and stacks marks above and below it; tighter leading clips mātrās and repha. If you set `line-height: 1` on a container (tiles do), give it enough height instead.
- **Never letter-space Devanagari.** Tracking opens gaps in the head-line and can break conjunct shaping. `.sk-sa` resets `letter-spacing` and `text-transform`, so Sanskrit inside an upper-case, tracked button is unaffected — do not undo that.
- **Never hyphenate or break inside a word.** `.sk-sa` sets `hyphens: none` and `word-break: keep-all`; single words are `nowrap` by default. For sentences and verses pass `nowrap={false}` and let lines break at spaces.
- **Conjuncts are shaped by the font**, from consonant + virāma + consonant in the text. Do not insert zero-width joiners, do not build conjuncts from pieces in CSS, and do not truncate Sanskrit with `text-overflow` — you would cut an akṣara in half.
- **Size by akṣara, not by character.** `क्ष्म्या` is one akṣara and six code points. Use `splitAksharas` / `countAksharas` from `@sanskrit` to decide how many tiles a word needs, and leave room for wide conjuncts (a tile is square; pick the `size` for the widest akṣara you will show).
- **Weight.** 600–800 reads best for tiles and choices at these sizes; the variable font supports any weight from 100 to 900. The verse font has one weight.
- **IAST** needs the diacritics ā ī ū ṛ ṝ ḷ ṅ ñ ṭ ḍ ṇ ś ṣ ṃ ḥ; the font stack prefers Gentium Plus and Charis SIL and falls back to common serifs. It is always derived with `devaToIast`, never typed.
- **Canvas.** Draw with `renderSa(text, script)`, use the `'Samskuru Deva'` family after `document.fonts.ready`, and scale for `devicePixelRatio`.

## Do and don't

| Do | Don't |
|---|---|
| Render Sanskrit with `<SaText>` or `renderSa` | Put Devanagari in a bare text node or an `aria-label` literal |
| Start from `<QuizRunner>` if the game is a sequence of questions | Rebuild check / feedback / continue by hand |
| Root the game in `<div className="sk-stage g-<id>">` | Style `body`, `#root`, `.app…` or any `sk-` class |
| Feed the top bar with `ctx.hud({ progress, score, lives })` | Draw your own header, score, hearts, timer or close button |
| End with `ctx.finish(result)` and let the shell show the result | Build an end screen, award XP, or navigate away yourself |
| Use `var(--accent)` and semantic tokens (`--ok`, `--bad`, `--warn`) | Hard-code colours, or use red / green alone to carry meaning |
| Pair colour with a mark or text (✓ / ✕, "present") | Rely on hover — most players are on touch screens |
| Give every pressable thing a `data-testid` and a 44 px target | Use `:nth-child` selectors in tests, or tiny tap areas |
| Keep motion short (`--t-fast`, `--t-med`) and optional | Block input for long animations, or animate when reduced motion is on |
| Ask for a new shared component in a `platform:` change when two games need it | Copy a component from another game's folder |
