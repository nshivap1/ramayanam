/**
 * v0.6 WP-C (Sundara, Yuddha; notes/v06-c.md, notes/v06-plan.md §2 row C). OWNER: v0.6 WP-C.
 *  - the 15 C verses (shlokas-5.json) are Kathā-only, heard once each at their moment of the Kathā story (inside Kathā
 *    blocks), never restorable, never a gate; the practice journey meets none of them and none of C's new lines
 *  - set pieces on the main path: the launch from Mahendra (5.1.39), the Ocean rises (6.22.17), waking Kumbhakarṇa (a
 *    told cutscene ≤ 15 s, then 6.60.54), the herbs (6.74.33, then package D's cutscene); no input but ▶, waits ≤ 1 s
 *  - hidden moments, found only by a player who looks (bots with `hidden: true`): the honey grove (Madhuvana), "same
 *    words, two counsellors" (Mārīca 3.37.2 / Vibhīṣaṇa 6.16.21) and the drum gag in the Kumbhakarṇa cutscene
 *  - verse echoes (katha-echoes.json): defined with titles in sa-ui-v06-c.json; they fire on the Kathā path
 *  - Nala's "Rama's name on every stone!" line is gone from both journeys and from the dialogue files; it is the only
 *    change the practice journey sees (the v0.5a guard hash comes back exactly when that line is put back)
 *  - every new Kathā line of C has its Sanskrit in sa-dialogue-12.json and verifies with the oracle
 * This file holds no Sanskrit: it reads content and checks it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadContent } from './content';
import { isRestorable, practiceContent } from './logic-journey';
import { runWalkthrough } from './logic-sim';
import { checkTold, toldMs, toldOf, toldPath, toldTimeline } from './logic-told';
import { getOracle, sentencesOf, isKathaCond } from './sa-verify';
import { uiEn, uiSa } from './sa-ui';
import { PAINTERS } from './cutscene-paint';
import { SPRITE_IDS, PROP_IDS } from './catalog';
import type { Level } from '@sdk';
import type { EventCmd, GameContent, GameState } from './types';
import ch5 from './content/story-ch5.json';
import ch6 from './content/story-ch6.json';
import shlokas5 from './content/shlokas-5.json';
import dia12 from './content/sa-dialogue-12.json';
import echoesRaw from './content/katha-echoes.json';
import { SPRITE_IDS_C, PROP_IDS_C } from './art-v06-c';

const REAL = loadContent();
const C_IDS = (shlokas5 as { shlokas: { id: string }[] }).shlokas.map((s) => s.id);
const EVENTS = ([ch5, ch6] as unknown as { events: { id: string; cmds: EventCmd[] }[] }[]).flatMap((f) => f.events);
const NALA_LINE = /name on every stone/;

/** Where each C verse is heard (event id), in story order. */
const PLACED: Record<string, string> = {
  's-yatha-raghava': 'ch5.leap_start',
  's-tvarate-karyakalo': 'ch5.mainaka',
  's-upavasa-krsham': 'ch5.vatika_enter',
  's-trnam-antaratah': 'ch5.vatika_enter',
  's-vanaro-ham': 'ch5.sita',
  's-dhanyas-te': 'ch5.roof_1', // and roof_2–4: whichever roof burns last
  's-drshta-devi': 'ch5.sita',
  's-vinashyed-dhi': 'ch6.vibhishana_refuge',
  's-tato-madhyat': 'ch6.nala',
  's-vadhyamano': 'ch6.kumbhakarna',
  's-mrtasanjivani': 'ch6.kumbhakarna',
  's-dharmatma-satyasandhah': 'ch6.indrajit',
  's-esha-setuh': 'ch6.ravana',
  's-etat-te-rakshitam': 'ch6.ravana',
  's-na-paryadevan': 'ch6.coronation',
};

/** Every command of an event with whether it sits inside a Kathā-only branch. */
function walk(cmds: EventCmd[] | undefined, katha: boolean, out: { c: EventCmd; katha: boolean }[] = []): { c: EventCmd; katha: boolean }[] {
  for (const c of cmds ?? []) {
    out.push({ c, katha });
    const o = c as unknown as Record<string, EventCmd[] | undefined>;
    const isK = 'if' in c && isKathaCond(c.if);
    const isP = 'if' in c && typeof c.if === 'string' && c.if.split('&').map((x) => x.trim()).includes('!style.katha');
    walk(o['then'], katha || isK, out);
    walk(o['else'], katha || isP, out);
    for (const k of ['onCorrect', 'onWrong', 'onWin', 'onLose'] as const) walk(o[k], katha, out);
    if ('hotspot' in c) walk((c as { then: EventCmd[] }).then, true, out);
  }
  return out;
}

function kathaRun(seed: number, level: Level, hidden = false) {
  const met: string[] = [];
  const r = runWalkthrough(REAL, seed, level, { style: 'katha', ...(hidden ? { hidden: true } : {}), onAction: (_b, _a, n) => {
    if (n.pending) met.push(JSON.stringify(n.pending));
  } });
  return { r, met };
}

test('v0.6 C: the 15 verses are Kathā-only, heard (never restorable), each placed once inside a Kathā block of its event', () => {
  assert.equal(C_IDS.length, 15);
  assert.deepEqual(new Set(C_IDS), new Set(Object.keys(PLACED)));
  for (const id of C_IDS) {
    const sh = REAL.shlokas.find((s) => s.id === id);
    assert.ok(sh?.kathaOnly, `${id} is kathaOnly`);
    assert.equal(isRestorable(REAL, id), false, `${id} is heard only`);
    const hits = EVENTS.flatMap((e) => walk(e.cmds, false).filter(({ c }) => 'shloka' in c && c.shloka === id).map((x) => ({ ...x, event: e.id })));
    assert.ok(hits.length >= 1, `${id} is heard somewhere`);
    for (const h of hits) {
      assert.ok(h.katha, `${id} (${h.event}) sits inside a Kathā block`);
      assert.notEqual((h.c as { mode?: string }).mode, 'restore', `${id} is heard, not restored`);
    }
    assert.ok(hits.some((h) => h.event === PLACED[id]), `${id} is heard in ${PLACED[id]}`);
    if (id !== 's-dhanyas-te') assert.equal(new Set(hits.map((h) => h.event)).size, 1, `${id} is placed in one event`);
  }
  // no new gate: no C verse is a chapter's key verse, a shrine requirement, an astra or a smarana
  for (const ch of REAL.chapters) assert.ok(!C_IDS.includes(ch.keyShloka), `chapter ${ch.kanda} key verse`);
  for (const m of REAL.moves) assert.ok(!m.unlockShloka || !C_IDS.includes(m.unlockShloka), `move ${m.id}`);
  for (const e of EVENTS) for (const { c } of walk(e.cmds, false)) if ('smarana' in c) assert.ok(!C_IDS.includes(c.smarana), `${e.id}: no recitation of a C verse`);
});

test('v0.6 C: the practice journey never meets a C verse or a C line; its content has none of them', () => {
  const P = practiceContent(REAL);
  for (const id of C_IDS) assert.ok(!P.shlokas.some((s) => s.id === id), `${id} filtered out of the practice content`);
  const lines = new Set((dia12 as { entries: { en: string }[] }).entries.map((e) => e.en));
  for (const [seed, level] of [[1, 3], [2, 2]] as const) {
    const texts: string[] = [];
    const r = runWalkthrough(REAL, seed, level as Level, { onAction: (_b, _a, n) => {
      if (n.pending) texts.push(JSON.stringify(n.pending));
    } });
    assert.equal(r.error, null, r.error ?? '');
    for (const id of C_IDS) assert.ok(!r.state.save.flags[`heard.${id}`] && !r.state.save.shlokas[id], `practice: ${id} unheard`);
    for (const t of texts) {
      for (const l of lines) assert.ok(!t.includes(JSON.stringify(l).slice(1, -1)), `practice met a C line: ${l}`);
      assert.ok(!NALA_LINE.test(t), 'practice: Nala\'s name-stones line is gone');
    }
    assert.ok(!Object.keys(r.state.save.flags).some((f) => f.startsWith('echo.') || f.startsWith('found.ch5.madhuvana') || f.startsWith('found.ch6.counsellors')), 'practice: no echo or hidden flag');
  }
});

test('v0.6 C: the Kathā walkthrough hears all 15 verses in story order, plays the set pieces, notices the echoes, and passes the hidden moments by', () => {
  for (const [seed, level] of [[1, 3], [2, 2], [3, 4]] as const) {
    const { r, met } = kathaRun(seed, level as Level);
    assert.equal(r.error, null, r.error ?? '');
    assert.equal(r.losses + r.defeats, 0, 'no lost fight');
    const f = r.state.save.flags;
    assert.ok(f['ch6.complete'], 'reaches the ending');
    for (const id of C_IDS) assert.ok(f[`heard.${id}`], `${id} heard (seed ${seed})`);
    // story order: the first time each C verse is shown
    const order = C_IDS.map((id) => met.findIndex((t) => t.includes(`"${id}"`)));
    assert.ok(order.every((x) => x >= 0), 'each C verse is shown as a pending');
    assert.deepEqual([...order].sort((a, b) => a - b), order, `C verses in story order (seed ${seed})`);
    // set pieces: the told cutscene was seen; echoes whose first verse was heard are noticed
    assert.ok(f['seen.kumbhakarna'], 'waking Kumbhakarṇa was told');
    assert.ok(f['echo.kausalya'], 'the कौसल्या सुप्रजा echo');
    assert.equal(!!f['echo.uttishtha'], !!f['heard.s-uttishtha-hari'], 'the उत्तिष्ठ echo iff 4.66.36 was heard');
    assert.equal(!!f['echo.paduke'], !!f['heard.s-paduke'], 'the sandals echo iff 2.112.21 was heard');
    // hidden moments are passed by: no flag
    for (const h of ['found.ch5.madhuvana', 'found.ch6.counsellors', 'found.kumbhakarna.drum', 'echo.counsellors']) assert.ok(!f[h], `${h} not found by a player who does not look`);
    assert.ok(!met.some((t) => NALA_LINE.test(t)), 'Kathā: Nala\'s name-stones line is gone');
  }
});

test('v0.6 C: a player who looks finds every hidden moment (honey grove, two counsellors, the drum gag) and the counsellors echo', () => {
  const { r } = kathaRun(1, 3, true);
  assert.equal(r.error, null, r.error ?? '');
  const f = r.state.save.flags;
  for (const h of ['found.ch5.madhuvana', 'found.ch6.counsellors', 'found.kumbhakarna.drum']) assert.ok(f[h], `${h} found`);
  assert.ok(f['echo.counsellors'], 'the two-counsellors echo');
});

test('v0.6 C: set pieces are short and need no input but ▶ (waits ≤ 1 s); the Kumbhakarṇa cutscene is well formed and ≤ 15 s on the main path', () => {
  const c = toldOf(REAL, 'kumbhakarna');
  assert.ok(c, 'cutscene-kumbhakarna is playable');
  assert.deepEqual(checkTold(c!, { shlokas: new Set(REAL.shlokas.map((s) => s.id)), painters: new Set(Object.keys(PAINTERS)) }), []);
  const ms = toldMs(toldTimeline(REAL, toldPath(c!)));
  assert.ok(ms <= 15000, `waking Kumbhakarṇa takes ${ms} ms`);
  assert.equal(c!.steps.filter((s) => 'ask' in s).length, 0, 'no question: nothing to fail');
  for (const e of EVENTS) for (const { c: x, katha } of walk(e.cmds, false)) {
    if (!katha) continue;
    if ('wait' in x) assert.ok(x.wait <= 1000, `${e.id}: wait ${x.wait} ms`);
  }
  // the C sprites and props are registered and drawable
  for (const id of SPRITE_IDS_C) assert.ok((SPRITE_IDS as readonly string[]).includes(id) && REAL.names.some((n) => n.id === `person.${id}`), `sprite ${id}`);
  for (const id of PROP_IDS_C) assert.ok((PROP_IDS as readonly string[]).includes(id), `prop ${id}`);
});

test('v0.6 C: verse echoes — ids, titles (sa-ui-v06-c.json), verses; every { echo } names one', () => {
  const echoes = (echoesRaw as { echoes: { id: string; title: string; shlokaIds: string[]; source: string }[] }).echoes;
  assert.deepEqual(echoes.map((e) => e.id).sort(), ['counsellors', 'kausalya', 'paduke', 'uttishtha']);
  for (const e of echoes) {
    assert.ok(e.title.startsWith('v06c.echo.'), e.title);
    assert.ok(uiEn(REAL, e.title) && uiSa(REAL, e.title), `title ${e.title} has en and sa`);
    for (const id of e.shlokaIds) assert.ok(REAL.shlokas.some((s) => s.id === id), `${e.id}: ${id} is a verse`);
    assert.ok(e.source.trim());
  }
  const used = EVENTS.flatMap((e) => walk(e.cmds, false).filter(({ c }) => 'echo' in c).map(({ c, katha }) => ({ id: (c as { echo: string }).echo, katha })));
  assert.deepEqual([...new Set(used.map((u) => u.id))].sort(), echoes.map((e) => e.id).sort());
  for (const u of used) assert.ok(u.katha, `{ echo: ${u.id} } inside a Kathā block`);
});

test('v0.6 C: Nala\'s "Rama\'s name on every stone" line is gone (story, dialogue files); the practice journey changes by that line only', () => {
  for (const e of EVENTS) for (const { c } of walk(e.cmds, false)) if ('say' in c) assert.ok(!NALA_LINE.test(c.say), `${e.id}: ${c.say}`);
  assert.ok(!Object.keys(REAL.dialogueSa ?? {}).some((en) => NALA_LINE.test(en)), 'no dialogue entry for it');
  // put the line back (in memory, practice path) → the practice journey hashes exactly to the v0.5a constant
  const NO_SA = (k: string, v: unknown): unknown => (k === 'textSa' || k === 'sa' || k === 'nameSa' ? undefined : v);
  const hash = (C: GameContent): string => {
    const h = createHash('sha256');
    const proj = (s: GameState): string => JSON.stringify({ save: s.save, session: s.session, battle: s.battle, pending: s.pending, mode: s.mode, tick: s.tick, recital: s.recital, fx: s.fx, script: s.script }, NO_SA);
    for (const level of [2, 3, 4] as Level[]) for (const seed of [1, 2, 3]) {
      const r = runWalkthrough(C, seed, level, { onStep: (_i, s) => h.update(proj(s)) });
      h.update(proj(r.state));
      h.update(`${r.actions}/${r.battles}/${r.defeats}/${r.losses}/${r.retries}/${r.failedAt}/${r.error ?? ''}`);
    }
    return h.digest('hex').slice(0, 24);
  };
  const back = structuredClone(REAL) as GameContent;
  const nala = back.events.find((e) => e.id === 'ch6.nala')!;
  const t = ((nala.cmds[0] as { else: { then: EventCmd[] }[] }).else[0] as { then: EventCmd[] }).then;
  const i = t.findIndex((c) => 'say' in c && c.say.startsWith('For five days'));
  assert.ok(i > 0);
  t.splice(i, 0, { say: "I am Nala. Vanaras, bring me trees and boulders! Rama's name on every stone!", who: 'Nala', portrait: 'vanara' });
  assert.equal(hash(back), '9c766bd8c21a0c909c7c0070', 'v0.5a practice hash with the line put back');
});

test('v0.6 C: every new Kathā line (sa-dialogue-12) verifies with the oracle — Level ≤ 3, ≤ 10 words a sentence', () => {
  const o = getOracle();
  const entries = (dia12 as { entries: { en: string; sa: string; label?: boolean }[] }).entries;
  assert.ok(entries.length >= 15);
  for (const e of entries) {
    const r = o.verifyLine(e.sa, e.label ? { label: true } : {});
    assert.deepEqual(r.errors, [], `${e.en}: ${e.sa}`);
    for (const s of sentencesOf(e.sa)) assert.ok(s.split(/[\s,।?!'"]+/u).filter(Boolean).length <= 10, `sentence too long: ${s}`);
    for (const w of e.sa.split(/[\s,।?!'"]+/u).filter(Boolean)) {
      const lv = Math.min(...o.analyse(w).map((a) => a.level));
      assert.ok(lv <= 3, `${w} (in "${e.en}") is above Level 3`);
    }
  }
});
