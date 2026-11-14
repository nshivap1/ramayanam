/**
 * v0.5b browser tests of WP-D (OWNER: WP-D; notes/v05b-ownership.md): Vibhīṣaṇa's council, Nala's bridge, the Puṣpaka return, the Lava–Kuśa finale; P5.
 * Plan §7: e2e: the bridge puzzle by tap and by keys at 360×640 (expose.setu); the finale from a late save, then won with Sanskrit rows.
 *
 * Every case plays Kathā in संस्कृतम् with the no-Latin sweep; screenshots go to $RY_SHOTS (v05b-d-*.png).
 *   1. Nala's bridge by tap at 360×640: the real scene (talk to Nala), five stones on screen, Nala's hint, ≤ 12 taps,
 *      the whole bridge (100 yojanas), ▶ — the story goes on
 *   2. Nala's bridge by keys at 360×640: 1–5 turn the stones, Z asks Nala, Z continues
 *   3. Vibhīṣaṇa's council (390×844): Aṅgada's counsel, the Kathā question, the vow said by the player (s-sakrdeva pāda 2)
 *   4. the Puṣpaka (390×844): five stops, a wrong name gets "look again", then home
 *   5. the Lava–Kuśa finale from a late save (390×844): six book reviews in the court (the twins shown), six lines, the
 *      closing line, the ending; the shell result "won" with Sanskrit rows
 */
import assert from 'node:assert/strict';
import { type E2eCase, Bot, CONTENT, DEVA, LATIN, type Snap, continueToExplore, expectNoLatin, kathaFrom, planAt, reloadWith, shot } from './e2e-kit.spec';
import type { EventCmd } from './types';

const ALLIES = ['player', 'rama', 'lakshmana', 'hanuman', 'jambavan'];
const PHONE = { width: 360, height: 640 };
const TALL = { width: 390, height: 844 };

/** A Kathā save on `map` in book 6 with every walkthrough flag before the step that sets `upTo` (all verses restored). */
function kathaSave(map: string, upTo: string): ReturnType<typeof kathaFrom> | null {
  const plan = planAt(CONTENT, 6, map, 30, ALLIES);
  const k = CONTENT.walkthrough.findIndex((w) => w.expectFlag === upTo);
  if (!plan || k < 0) return null;
  const flags: Record<string, true> = { ...plan.save.flags };
  for (const w of CONTENT.walkthrough.slice(0, k)) flags[w.expectFlag] = true;
  return kathaFrom({ ...plan.save, flags }, 1);
}

const bridgeSave = kathaSave('setu_shore', 'ch6.setu_built');
const councilSave = kathaSave('setu_shore', 'ch6.council');
const finaleSave = kathaSave('tamasa_ashrama', 'ch6.complete');

/** The Kathā block of the Puṣpaka tour (story-ch6 ch6.ravana → onWin): the opening line, then a verse and a question per stop. */
function pushpakaBlock(): EventCmd[] | null {
  const ev = CONTENT.events.find((e) => e.id === 'ch6.ravana');
  const battle = ev?.cmds.find((c) => 'battle' in c) as { onWin?: EventCmd[] } | undefined;
  const block = battle?.onWin?.find((c) => 'if' in c && c.if === 'style.katha' && JSON.stringify(c).includes('Where did we hear this verse?'));
  return block ? [block] : null;
}

/** Walk to Nala and play his lines until the bridge is on screen. */
async function toBridge(open: Parameters<E2eCase['run']>[0]['open'], seed: number): Promise<{ g: Awaited<ReturnType<typeof open>>; s: Snap }> {
  assert.ok(bridgeSave);
  const g = await open({ seed, viewport: PHONE });
  await reloadWith(g, bridgeSave, 'sa');
  await continueToExplore(g);
  const bot = new Bot(g);
  const s = await bot.playUntil((x) => x.pending === 'setu', 400);
  await g.page.locator('[data-testid="setu-panel"]').waitFor();
  return { g, s };
}

/** Every stone and the button are on screen, ≥ 44 px, inside the viewport. */
async function expectBridgeFits(g: Awaited<ReturnType<Parameters<E2eCase['run']>[0]['open']>>, where: string): Promise<void> {
  const vp = g.page.viewportSize();
  assert.ok(vp);
  for (let i = 0; i < 5; i++) {
    const b = await g.page.locator(`[data-testid="setu-cell-${i}"]`).boundingBox();
    assert.ok(b && b.x >= 0 && b.x + b.width <= vp.width && b.y >= 0 && b.y + b.height <= vp.height && b.width >= 44 && b.height >= 44, `${where}: stone ${i} on screen, ≥ 44 px (${JSON.stringify(b)})`);
  }
  const a = await g.page.locator('[data-testid="setu-advance"]').boundingBox();
  assert.ok(a && a.y + a.height <= vp.height && a.height >= 44, `${where}: the button is on screen (${JSON.stringify(a)})`);
  await expectNoLatin(g, where);
}

export const V05B_D: E2eCase[] = [
  {
    name: "v0.5b D: Nala's bridge by tap (Kathā, संस्कृतम्, 360×640) — the real scene, five stones, Nala's hint, ≤ 12 taps, the whole bridge, then the story goes on; no Latin",
    skip: bridgeSave ? false : 'needs a book-6 plan',
    timeout: 240_000,
    run: async ({ open }) => {
      const { g, s } = await toBridge(open, 31);
      const st = s.setu;
      assert.ok(st && st.cols === 5 && st.cells.length === 5 && st.taps === 0 && st.hint === null);
      assert.equal(await g.page.locator('[data-testid="setu-panel"]').getAttribute('data-solved'), 'false');
      // the day lengths under the stones: Yuddha 6.22.66–70, in Devanagari digits
      const days = await g.page.locator('[data-testid^="setu-day-"]').allTextContents();
      assert.deepEqual(days, ['१४', '२०', '२१', '२२', '२३']);
      await expectBridgeFits(g, 'bridge (start)');
      await shot(g, 'v05b-d-setu-start-sa-360');
      if (process.env['RY_SHOTS']) {
        // the same bridge at 390×844 (the screenshot size of the other scenes), then back to the phone
        await g.page.setViewportSize(TALL);
        await expectBridgeFits(g, 'bridge (start, 390×844)');
        await shot(g, 'v05b-d-setu-start-sa-390');
        await g.page.setViewportSize(PHONE);
      }
      // Nala's hint: the first stone, in day order, that is not yet true
      await g.tap('setu-advance');
      await g.waitForState('s => s.setu && s.setu.hint !== null');
      const h = await g.state<Snap>();
      const first = st.cells.findIndex((c, k) => c !== st.solution[k]);
      assert.equal(h.setu?.hint, first);
      assert.match((await g.page.locator(`[data-testid="setu-cell-${first}"]`).getAttribute('class')) ?? '', /is-hint/);
      assert.match((await g.page.locator('[data-testid="setu-status"]').textContent()) ?? '', DEVA);
      await expectNoLatin(g, 'bridge (hint)');
      await shot(g, 'v05b-d-setu-hint-sa-360');
      // a set stone does not turn: tap one (if any) and nothing changes
      const setIdx = st.cells.findIndex((c, k) => c === st.solution[k]);
      if (setIdx >= 0) {
        await g.page.locator(`[data-testid="setu-cell-${setIdx}"]`).dispatchEvent('click'); // aria-disabled: Playwright's click would wait
        await g.page.waitForTimeout(200);
        assert.equal((await g.state<Snap>()).setu?.taps, 0, 'a true stone stays put');
      }
      // turn stones until the bridge is whole
      let taps = 0;
      for (let n = 0; n < 20; n++) {
        const x = (await g.state<Snap>()).setu;
        assert.ok(x);
        const i = x.cells.findIndex((c, k) => c !== x.solution[k]);
        if (i < 0) break;
        await g.tap(`setu-cell-${i}`);
        await g.waitForState(`s => s.setu && s.setu.taps === ${x.taps + 1}`);
        taps++;
      }
      assert.ok(taps >= 3 && taps <= 12, `3–12 taps (${taps})`);
      await g.page.locator('[data-testid="setu-panel"][data-solved="true"]').waitFor();
      assert.equal(await g.page.locator('[data-testid="setu-built"]').getAttribute('data-n'), '100', 'a hundred yojanas');
      await expectBridgeFits(g, 'bridge (whole)');
      await g.page.waitForTimeout(300);
      await shot(g, 'v05b-d-setu-whole-sa-360');
      await g.tap('setu-advance');
      await g.waitForState("s => s.pending !== 'setu'");
      const bot = new Bot(g);
      await bot.playUntil((x) => x.flags.includes('ch6.setu_built') && x.phase === 'explore' && !x.pending, 200);
      g.expectClean();
      await g.close();
    },
  },
  {
    name: "v0.5b D: Nala's bridge by keys (Kathā, संस्कृतम्, 360×640) — 1–5 turn the stones, Z asks Nala, Z continues",
    skip: bridgeSave ? false : 'needs a book-6 plan',
    timeout: 240_000,
    run: async ({ open }) => {
      const { g, s } = await toBridge(open, 32);
      assert.ok(s.setu);
      await g.page.keyboard.press('z');
      await g.waitForState('s => s.setu && s.setu.hint !== null');
      for (let n = 0; n < 20; n++) {
        const x = (await g.state<Snap>()).setu;
        assert.ok(x);
        const i = x.cells.findIndex((c, k) => c !== x.solution[k]);
        if (i < 0) break;
        await g.page.keyboard.press(String(i + 1));
        await g.waitForState(`s => s.setu && s.setu.taps === ${x.taps + 1}`);
      }
      const done = (await g.state<Snap>()).setu;
      assert.ok(done && done.taps <= 12 && done.cells.every((c, k) => c === done.solution[k]));
      await g.page.locator('[data-testid="setu-panel"][data-solved="true"]').waitFor();
      await expectNoLatin(g, 'bridge (keys, whole)');
      await g.page.keyboard.press('z');
      await g.waitForState("s => s.pending !== 'setu'");
      g.expectClean();
      await g.close();
    },
  },
  {
    name: "v0.5b D: Vibhīṣaṇa's council (Kathā, संस्कृतम्, 390×844) — Aṅgada's counsel, the question, the player says the vow (s-sakrdeva pāda 2); no Latin",
    skip: councilSave ? false : 'needs a book-6 plan',
    timeout: 240_000,
    run: async ({ open }) => {
      assert.ok(councilSave);
      const g = await open({ seed: 33, viewport: TALL });
      await reloadWith(g, { ...councilSave, flags: { ...councilSave.flags, 'ch6.started': true } }, 'sa');
      await continueToExplore(g);
      let angada = false;
      let choice = false;
      let vow: { shlokaId: string; pada: number } | null = null;
      const bot = new Bot(g, {
        onStep: async (s) => {
          if (s.say === 'He has come from our enemy. Let Rama test him first.' && !angada) {
            angada = true;
            await expectNoLatin(g, "Aṅgada's counsel");
            await shot(g, 'v05b-d-council-angada-sa-390');
          }
          if (s.pending === 'choice' && !choice) {
            choice = true;
            await expectNoLatin(g, 'the council question');
          }
        },
        onCast: async (s) => {
          if (s.challenge?.context !== 'scene' || vow) return;
          vow = { shlokaId: s.challenge.smarana?.shlokaId ?? '', pada: s.challenge.smarana?.pada ?? -1 };
          await expectNoLatin(g, 'the vow');
          await shot(g, 'v05b-d-council-vow-sa-390');
        },
      });
      await bot.playUntil((x) => x.flags.includes('ch6.vibhishana_joined') && x.phase === 'explore' && !x.pending, 500);
      assert.ok(angada, "Aṅgada's counsel was heard");
      assert.ok(choice, 'the Kathā question');
      assert.deepEqual(vow, { shlokaId: 's-sakrdeva', pada: 2 }, 'the player said the vow line');
      const s = await g.state<Snap>();
      assert.ok(s.flags.includes('ch6.council') && s.flags.includes('ch6.council_angada'));
      assert.ok(s.party.some((m) => m.id === 'vibhishana'));
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b D: the Puṣpaka (Kathā, संस्कृतम्, 390×844) — five stops, "where did we hear this verse?", a wrong name gets "look again"; no Latin',
    skip: bridgeSave && pushpakaBlock() ? false : 'needs a book-6 plan and the Puṣpaka block',
    timeout: 240_000,
    run: async ({ open }) => {
      assert.ok(bridgeSave);
      const g = await open({ seed: 34, viewport: TALL });
      await reloadWith(g, bridgeSave, 'sa');
      await continueToExplore(g);
      const ran = await g.page.evaluate((c) => (window as unknown as { __ryScript: (cmds: unknown) => boolean }).__ryScript(c), pushpakaBlock());
      assert.ok(ran);
      // the exposed state follows the script one render later: wait for it, or the bot reads the old explore state and walks
      await g.waitForState("s => s.phase !== 'explore' || !!s.pending");
      let questions = 0;
      let lookAgain = 0;
      const verses: string[] = [];
      const bot = new Bot(g, {
        onVerse: async (s) => {
          if (s.shloka && verses.at(-1) !== s.shloka) verses.push(s.shloka); // a first ▶ may only finish the verse moment's unfolding
        },
        onStep: async (s) => {
          if (s.pending === 'choice') {
            questions++;
            if (questions === 1) {
              await expectNoLatin(g, 'the Puṣpaka question');
              await shot(g, 'v05b-d-pushpaka-question-sa-390');
            }
          }
          if (s.say === 'Not there. Look down again.') lookAgain++;
        },
      });
      await bot.playUntil((x) => verses.length === 5 && x.phase === 'explore' && !x.pending, 300);
      assert.deepEqual(verses, ['s-anirvedah', 's-sakrdeva', 's-naham-janami', 's-golden-deer', 's-ramo-dvir'], 'the five stops in flight order');
      assert.ok(lookAgain >= 1, 'a wrong name: Rāma says look again');
      assert.equal(questions, 5 + lookAgain, 'each wrong name brings the same question back');
      g.expectClean();
      await g.close();
    },
  },
  {
    name: 'v0.5b D: the Lava–Kuśa finale from a late save (Kathā, संस्कृतम्, 390×844) — six book reviews in the court, six lines, the closing line, the ending; won, with Sanskrit rows; no Latin',
    skip: finaleSave ? false : 'needs a book-6 plan',
    timeout: 420_000,
    run: async ({ open }) => {
      assert.ok(finaleSave);
      const g = await open({ seed: 35, viewport: TALL });
      await reloadWith(g, finaleSave, 'sa');
      await continueToExplore(g);
      const books: number[] = [];
      const lines: string[] = [];
      let court = false;
      const bot = new Bot(g, {
        onStep: async (s) => {
          if (s.pending === 'book' && s.book && books.at(-1) !== s.book) {
            books.push(s.book);
            if (!court) {
              court = true;
              assert.ok(s.flags.includes('ch6.recital') && s.map === 'ayodhya_return', 'the recital is in Ayodhyā');
              const ids = s.npcs.map((n) => n.id);
              for (const id of ['kusha', 'lava', 'rama_c']) assert.ok(ids.includes(id), `${id} in the court`);
              assert.ok(!ids.includes('sita_c'), 'Sītā is not in the court (Bāla 1.4)');
              await g.page.locator('[data-testid="book-review"][data-armed]').waitFor();
              await expectNoLatin(g, 'the court: book review');
              await shot(g, 'v05b-d-court-book-sa-390');
            }
          }
          if (s.say === 'Kusha and Lava sing.' && lines.length === 0) await shot(g, 'v05b-d-court-twins-sa-390');
        },
        onCast: async (s) => {
          if (s.challenge?.context !== 'scene') return;
          lines.push(`${s.challenge.smarana?.shlokaId}:${s.challenge.smarana?.pada}`);
          if (lines.length === 1) {
            await expectNoLatin(g, "the twins' verse: the player's line");
            await shot(g, 'v05b-d-court-line-sa-390');
          }
        },
      });
      await bot.playUntil((x) => x.phase === 'ended' || x.pending === 'ending', 1500);
      assert.deepEqual(books, [1, 2, 3, 4, 5, 6], 'one review per book');
      const keys = [...CONTENT.chapters].sort((a, b) => a.kanda - b.kanda).map((c) => c.keyShloka);
      assert.deepEqual(lines.map((l) => l.split(':')[0]), keys, "one line of each book's key verse");
      const panel = g.page.locator('[data-testid="panel-ending"]');
      await panel.waitFor();
      // the Kathā ending (view-bookend KathaEnding) lists all 21 verses once view-panel routes to it
      if (await g.page.locator('[data-testid="panel-ending"][data-katha]').count())
        assert.equal(await g.page.locator('[data-testid^="ending-verse-"]').count(), CONTENT.shlokas.length, 'every verse with its state');
      await expectNoLatin(g, 'the ending');
      await shot(g, 'v05b-d-ending-sa-390');
      await g.tap('ending-finish');
      const rec = await g.expectResult();
      const r = rec.result as { outcome: string; summary?: string; review?: { sa: string; en?: string; note?: string }[] };
      assert.equal(r.outcome, 'won');
      assert.ok(!LATIN.test(r.summary ?? '') && DEVA.test(r.summary ?? ''), `a Sanskrit summary: ${r.summary}`);
      assert.ok((r.review ?? []).length >= 6, 'the verses recited have their rows');
      for (const row of r.review ?? []) assert.ok(!LATIN.test(`${row.en ?? ''} ${row.note ?? ''}`) && DEVA.test(row.en ?? ''), `a Sanskrit review row: ${JSON.stringify(row)}`);
      await shot(g, 'v05b-d-result-sa-390');
      g.expectClean();
      await g.close();
    },
  },
];
