/**
 * Sambhāṣaṇa dialogue gate (OWNER: sa-oracle). Rules: notes/sambhashana.md → Verification; usage: notes/sa-oracle.md.
 *
 * Always enforced: every non-empty `sa` in content/sa-dialogue-*.json verifies word by word against the
 * oracle (sa-verify.ts), plus punctuation / script / markup / length rules and valid `models`.
 * Coverage: every story string has an entry and no entry is stale; empty translations are only
 * counted, and fail unless RY_SA_LENIENT=1. Entries with `"label": true` (file 4: NPC speaker titles) are verified
 * as labels (no final ।); only label story strings may carry it. File 5 holds the lines inside Kathā-only blocks
 * (`{ "if": "style.katha", … }`, OWNER: kc-content) and the Kathā move descriptions (`katha.json → moveText`, v0.4.1);
 * the practice wording beside them (`{ "if": "!style.katha", … }`) keeps its file. katha.json itself is checked by
 * katha-content.test.ts. v0.5b: file 5 is frozen at v0.5a (FILE5_V05A); new Kathā text goes to 6 (ch1–3), 7 (ch4 and new
 * moveText), 8 (ch5), 9 (ch6) — one file per package (notes/v05b-ownership.md).
 * This file holds no Sanskrit beyond the oracle's self-test lines.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BUNDLED_FILES, FILE5_V05A, LABELS4_V05A, collectStoryStrings, createOracle, easiest, enKey, getOracle, isKathaCond, isPracticeCond, type DialogueFile, type SaModel, type StoryLike } from './sa-verify';
import kathaJson from './content/katha.json';

// Coverage is complete (919/919 at v0.2.0), so it is enforced by default. Set RY_SA_LENIENT=1 while a
// new English story line is waiting for its translation.
const STRICT = process.env.RY_SA_LENIENT !== '1';
const FILES: { name: string; data: DialogueFile }[] = BUNDLED_FILES.map((data, i) => ({ name: `sa-dialogue-${i + 1}.json`, data }));
const MAX_LINES = 80;
const short = (s: string, n = 50): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const report = (lines: string[]): string => `${lines.length} problem(s):\n  ${lines.slice(0, MAX_LINES).join('\n  ')}${lines.length > MAX_LINES ? `\n  … ${lines.length - MAX_LINES} more (run the CLI: notes/sa-oracle.md)` : ''}`;

test('sambhashana: the oracle index builds quickly and has every source', () => {
  const t0 = performance.now();
  const o = getOracle();
  const ms = performance.now() - t0;
  const st = o.stats();
  console.log(`# oracle: ${st.forms} forms in ${ms.toFixed(0)} ms · ${Object.entries(st.bySource).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  assert.ok(ms < 6000, `index build took ${ms.toFixed(0)} ms (target < 3000)`);
  for (const s of ['shabda', 'vocab', 'vocab-decl', 'dhatu', 'krdanta', 'prefixed', 'sentences', 'lexicon', 'name', 'number', 'interjection']) {
    assert.ok((st.bySource[s] ?? 0) > 0, `source ${s} contributes no forms`);
  }
});

test('sambhashana: coverage — every story string has an entry, no entry is stale', () => {
  const story = collectStoryStrings();
  const storyEn = new Set(story.map((s) => s.en));
  const labels = new Set(story.filter((s) => s.label).map((s) => s.en));
  const where = new Map<string, string>();
  const problems: string[] = [];
  let total = 0;
  let filled = 0;
  for (const f of FILES) {
    let fFilled = 0;
    f.data.entries.forEach((e, i) => {
      total++;
      if (e.sa && e.sa.trim()) {
        filled++;
        fFilled++;
      }
      if (!storyEn.has(e.en)) problems.push(`${f.name} entry #${i} (${e.ctx ?? ''}): stale — "${short(e.en)}" is no longer a story string`);
      else if (e.label && !labels.has(e.en)) problems.push(`${f.name} entry #${i} (${e.ctx ?? ''}): "label": true on "${short(e.en)}", which is not a label (only NPC speaker titles are)`);
      const prev = where.get(e.en);
      if (prev) problems.push(`${f.name} entry #${i}: duplicate of ${prev} "${short(e.en)}"`);
      else where.set(e.en, `${f.name} entry #${i}`);
    });
    console.log(`# ${f.name}: ${fFilled}/${f.data.entries.length} translated`);
  }
  for (const s of story) if (!where.has(s.en)) problems.push(`sa-dialogue-${s.file}.json: no entry for story string "${short(s.en)}" (${s.ctx})`);
  console.log(`# coverage: ${filled}/${story.length} story strings translated, ${total - filled} missing${STRICT ? ' (strict)' : ' (lenient: RY_SA_LENIENT=1)'}`);
  assert.deepEqual(problems, [], report(problems));
  if (STRICT) assert.equal(total - filled, 0, `${total - filled} entries have no Sanskrit yet: translate them in content/sa-dialogue-*.json (see notes/sambhashana.md), or set RY_SA_LENIENT=1 temporarily`);
});

test('sambhashana: every non-empty sa verifies word by word (no sandhi, no Latin, ends with । ? !)', () => {
  const o = getOracle();
  const problems: string[] = [];
  for (const f of FILES) {
    f.data.entries.forEach((e, i) => {
      const sa = e.sa?.trim() ?? '';
      if (!sa) return;
      const at = `${f.name} entry #${i} (${e.ctx ?? ''}) "${short(e.en, 40)}"`;
      const r = o.verifyLine(sa, { en: e.en, label: e.label === true });
      for (const err of r.errors) problems.push(`${at}: ${err}`);
      if (sa.length > e.en.length * 2.5 + 15) problems.push(`${at}: Sanskrit is ${sa.length} chars for ${e.en.length} English chars (limit ≈ 2.5×): split or simplify`);
    });
  }
  assert.deepEqual(problems, [], report(problems));
});

test('sambhashana: file 4 holds exactly the content strings (titles, summaries, descriptions, logic lines)', () => {
  const story = collectStoryStrings();
  const f4 = new Set(story.filter((s) => s.file === 4).map((s) => s.en));
  const data = FILES[3]?.data;
  assert.ok(data, 'sa-dialogue-4.json is bundled');
  const problems: string[] = [];
  for (const e of data.entries) if (!f4.has(e.en)) problems.push(`sa-dialogue-4.json: "${short(e.en)}" belongs to another file (or is stale)`);
  for (const s of story) if (s.file !== 4 && data.entries.some((e) => e.en === s.en)) problems.push(`sa-dialogue-4.json: "${short(s.en)}" is a story line of file ${s.file}`);
  // the static sources are present (a renamed constant or a moved field must not silently drop out of coverage)
  for (const re of [/^Explore the hermitage/, /^The heroes rest at the hermitage/, /^You rest by the shrine/, /^Book 6 begins/, /^The journey is complete/]) {
    if (![...f4].some((en) => re.test(en))) problems.push(`file 4 lacks the logic line ${re}`);
  }
  const ctxs = story.filter((s) => s.file === 4).map((s) => s.ctx);
  for (const kind of ['speaker title', 'summary', 'move ', 'origin', 'ally ', 'enemy ', 'item ']) {
    if (!ctxs.some((c) => c.includes(kind))) problems.push(`file 4 has no "${kind.trim()}" strings`);
  }
  assert.deepEqual(problems, [], report(problems));
});

test('sambhashana: file 5 holds exactly the story lines of Kathā-only blocks ({ "if": "style.katha", "then": [...] }) and the Kathā move descriptions', () => {
  assert.ok(isKathaCond('style.katha') && isKathaCond('style.katha&ch2.left_city'), 'style.katha (alone or with other flags) marks a Kathā block');
  assert.ok(!isKathaCond('!style.katha') && !isKathaCond('ch2.left_city') && !isKathaCond(undefined), 'a negated or other flag does not');
  assert.ok(isPracticeCond('!style.katha') && isPracticeCond('!style.katha&ch1.krauncha_seen'), '!style.katha marks a practice-only block');
  assert.ok(!isPracticeCond('style.katha') && !isPracticeCond('!ch1.gift_hut') && !isPracticeCond(undefined), 'style.katha or another negated flag does not');
  const story = collectStoryStrings();
  const f5 = story.filter((s) => s.file === 5);
  const f5en = new Set(f5.map((s) => s.en));
  const data = FILES[4]?.data;
  assert.equal(FILES[4]?.name, 'sa-dialogue-5.json');
  assert.ok(data, 'sa-dialogue-5.json is bundled');
  const problems: string[] = [];
  for (const e of data.entries) if (!f5en.has(e.en)) problems.push(`sa-dialogue-5.json: "${short(e.en)}" is not a line of a Kathā-only block (belongs to another file, or is stale)`);
  for (const s of story) if (s.file !== 5 && data.entries.some((e) => e.en === s.en)) problems.push(`sa-dialogue-5.json: "${short(s.en)}" is a story line of file ${s.file}`);
  for (const e of data.entries) if (e.label) problems.push(`sa-dialogue-5.json: "${short(e.en)}" carries "label": true (labels live in file 4)`);
  // Kathā choices: every choice prompt and option of a Kathā block is covered (the walker found them)
  const kinds = new Set(f5.map((s) => s.ctx.replace(/^\S+ · /, '').replace(/ \(.*$/, '')));
  if (f5.length > 0) for (const k of ['choice prompt', 'choice option']) if (![...kinds].some((x) => x.startsWith(k))) problems.push(`file 5 has no "${k}" strings`);
  // v0.4.1: katha.json moveText (the Kathā wording of move descriptions) is file 5, one entry per move (v0.5b: those
  // file 5 held at v0.5a; a new one is file 7, WP-C's)
  const moveText = (kathaJson as { moveText?: Record<string, string> }).moveText ?? {};
  for (const [id, en] of Object.entries(moveText)) {
    const s = story.find((x) => x.en === en);
    const want = FILE5_V05A.has(enKey(en)) ? 5 : 7;
    if (s?.file !== want || s.ctx !== `move ${id} · description (Kathā: katha.json moveText)`) problems.push(`moveText.${id}: "${short(en)}" is ${s ? `file ${s.file} (${s.ctx})` : 'not collected'}, not file ${want} as its Kathā description`);
  }
  console.log(`# file 5 (Kathā): ${f5.length} strings (${Object.keys(moveText).length} move descriptions)`);
  assert.deepEqual(problems, [], report(problems));
});

test('sambhashana (v0.5b): file 5 is frozen at v0.5a (it may only lose entries); files 6–9 hold exactly the new Kathā strings of their chapters', () => {
  assert.equal(BUNDLED_FILES.length, 9, 'sa-dialogue-1 … 9 are bundled');
  const story = collectStoryStrings();
  const problems: string[] = [];
  for (const e of FILES[4]!.data.entries) if (!FILE5_V05A.has(enKey(e.en))) problems.push(`sa-dialogue-5.json: "${short(e.en)}" is new since v0.5a — new Kathā text goes to file 6–9 of its chapter (notes/v05b-ownership.md)`);
  for (const n of [6, 7, 8, 9] as const) {
    const f = FILES[n - 1]!;
    assert.equal(f.name, `sa-dialogue-${n}.json`);
    const mine = new Set(story.filter((x) => x.file === n).map((x) => x.en));
    for (const e of f.data.entries) if (!mine.has(e.en)) problems.push(`${f.name}: "${short(e.en)}" is ${story.find((x) => x.en === e.en) ? `a string of file ${story.find((x) => x.en === e.en)!.file}` : 'stale'}`);
    for (const x of story) if (x.file === n && !f.data.entries.some((e) => e.en === x.en)) problems.push(`${f.name}: no entry for "${short(x.en)}" (${x.ctx})`);
    console.log(`# file ${n}: ${mine.size} strings`);
  }
  assert.deepEqual(problems, [], report(problems));
});

test('sambhashana (v0.5b): collectStoryStrings — Kathā text held by file 5 stays there; new Kathā text goes to 6 (ch1–3), 7 (ch4, new moveText), 8 (ch5), 9 (ch6)', () => {
  const k = (ev: string, cmds: unknown[]): StoryLike => ({ events: [{ id: ev, cmds: cmds as Record<string, unknown>[] }] });
  const kblock = (...lines: unknown[]): unknown => ({ if: 'style.katha', then: lines, else: [{ say: `practice ${lines.length}` }] });
  const stories: [StoryLike, 1 | 2 | 3, 6 | 7 | 8 | 9][] = [
    [k('common.x', [kblock({ say: 'new common' })]), 1, 6],
    [k('ch1.x', [kblock({ say: 'old kept line' }, { say: 'new ch1', who: 'Hunter' }, { say: 'titled', who: 'Old title' })]), 1, 6],
    [k('ch2.x', [{ say: 'Hunter' }, kblock({ choice: 'new ch2 prompt', options: [{ label: 'new ch2 reply' }] })]), 1, 6],
    [k('ch3.x', [{ if: '!style.katha', then: [{ say: 'practice wording' }], else: [{ objective: 'new ch3 objective' }] }]), 2, 6],
    [k('ch4.x', [kblock({ battle: { intro: 'new ch4 intro' } })]), 2, 7],
    [k('ch5.x', [{ if: 'ch5.flag', then: [kblock({ say: 'new ch5 nested' })] }]), 3, 8],
    [k('ch6.x', [kblock({ say: 'new ch6', who: 'Herald' }), { say: 'plain ch6', who: 'Crier' }]), 3, 9],
  ];
  const got = collectStoryStrings({
    stories,
    defs: {},
    nameIds: [],
    moveText: { a: 'old move text', b: 'new move text' },
    file5: new Set(['old kept line', 'old move text'].map(enKey)),
    labels4: new Set([enKey('Old title')]),
  });
  const fileOf = (en: string): number | undefined => got.find((x) => x.en === en)?.file;
  const labelOf = (en: string): boolean => !!got.find((x) => x.en === en)?.label;
  assert.equal(fileOf('new common'), 6, 'story-common → 6');
  assert.equal(fileOf('old kept line'), 5, 'a line file 5 held at v0.5a stays in file 5');
  assert.equal(fileOf('new ch1'), 6);
  assert.equal(fileOf('new ch2 prompt'), 6);
  assert.equal(fileOf('new ch2 reply'), 6, 'a Kathā reply → the chapter file');
  assert.equal(fileOf('new ch3 objective'), 6, "the else of a practice-only block is Kathā text");
  assert.equal(fileOf('practice wording'), 2, 'the practice-only then keeps its file');
  assert.equal(fileOf('new ch4 intro'), 7);
  assert.equal(fileOf('new ch5 nested'), 8, 'a Kathā block nested in another if');
  assert.equal(fileOf('new ch6'), 9);
  assert.equal(fileOf('plain ch6'), 3, 'non-Kathā lines keep files 1–3');
  assert.equal(fileOf('practice 1'), 1, "the else of a Kathā block is the practice game's (file 1–3)");
  assert.equal(fileOf('old move text'), 5);
  assert.equal(fileOf('new move text'), 7, 'a new Kathā move description → file 7 (WP-C)');
  // speaker titles: a new one first used inside a Kathā block → its chapter's file, as a label; others → file 4
  assert.equal(fileOf('Herald'), 9);
  assert.ok(labelOf('Herald'));
  assert.equal(fileOf('Old title'), 4, 'a title file 4 held at v0.5a stays in file 4');
  assert.equal(fileOf('Crier'), 4, 'a title used outside Kathā blocks → file 4');
  assert.equal(fileOf('Hunter'), 1, 'first occurrence wins (here a story line of ch2 before the title is walked)');
  // the frozen sets hold what files 4 and 5 held at v0.5a
  assert.equal(FILE5_V05A.size, 90);
  assert.equal(LABELS4_V05A.size, 59);
});

test('sambhashana: models — valid paradigm, matching gender and ṇatva, source present, one model per stem', () => {
  const o = getOracle();
  const problems = [...o.modelErrors.map((e) => `models: ${e}`)];
  const seen = new Map<string, { m: SaModel; file: string }>();
  for (const f of FILES) {
    (f.data.models ?? []).forEach((m, i) => {
      const at = `${f.name} models[${i}] ${m.stem}`;
      if (!m.source?.trim()) problems.push(`${at}: missing "source" (dictionary headword)`);
      const prev = seen.get(m.stem);
      if (prev && (prev.m.paradigm !== m.paradigm || prev.m.gender !== m.gender)) problems.push(`${at}: ${m.gender}/${m.paradigm} differs from ${prev.file} (${prev.m.gender}/${prev.m.paradigm})`);
      if (!prev) seen.set(m.stem, { m, file: f.name });
    });
  }
  console.log(`# models: ${seen.size} stem(s) (each one is a human-review item)`);
  assert.deepEqual(problems, [], report(problems));
});

test('sambhashana: level report (informational, never fails)', () => {
  const o = getOracle();
  const byLevel: Record<string, number> = {};
  const flagged = new Map<string, number>();
  for (const f of FILES) {
    for (const e of f.data.entries) {
      if (!e.sa?.trim()) continue;
      for (const t of o.verifyLine(e.sa, { en: e.en, label: e.label === true }).tokens) {
        const a = easiest(t.analyses);
        if (!a) continue;
        const k = `L${Math.min(4, a.level)}`;
        byLevel[k] = (byLevel[k] ?? 0) + 1;
        const why = a.flag ?? (a.level >= 4 ? 'level 4' : undefined);
        if (why) flagged.set(`${t.text} (${why})`, (flagged.get(`${t.text} (${why})`) ?? 0) + 1);
      }
    }
  }
  console.log(`# tokens by level: ${Object.entries(byLevel).sort().map(([k, v]) => `${k} ${v}`).join(' · ') || 'none yet'}`);
  const top = [...flagged.entries()].sort((a, b) => b[1] - a[1]);
  if (top.length) console.log(`# flagged words (${top.length}): ${top.slice(0, 40).map(([w, n]) => `${w} ×${n}`).join(', ')}`);
  assert.ok(true);
});

test('sambhashana: oracle self-tests — known-good lines pass', () => {
  const o = getOracle();
  const good: [string, string?][] = [
    ['अहं गच्छामि।'],
    ['रामः वनं गतवान्।'],
    ['भवान् कुत्र गच्छति?'],
    ['सीता हनुमन्तं पश्यति।'],
    ['आगच्छतु।'],
    ['सा आगतवती।'],
    ['ते गतवन्तः।'],
    ['अहं दृष्टवान्।'],
    ['गमिष्यामि।'],
    ['हे राम, भवान् कुत्र गच्छति?'],
    ['रामेण सह लक्ष्मणः अपि आगच्छति।'],
    ['{player}, अत्र आगच्छ।', '{player}, come here.'],
    ['वाल्मीकिः ऋषिणा सह वदति।'],
    ['हनुमता सह गच्छाम।'],
  ];
  const failures = good.map(([l, en]) => [l, o.verifyLine(l, en === undefined ? {} : { en })] as const).filter(([, r]) => !r.ok);
  assert.deepEqual(
    failures.map(([l, r]) => `${l}: ${r.errors.join('; ')}`),
    [],
  );
});

test('sambhashana: oracle self-tests — known-bad lines fail for the right reason', () => {
  const o = getOracle();
  const bad: [string, RegExp][] = [
    ['रामः कखगघति।', /unknown word "कखगघति"/], // invented word
    ['रामो गच्छति।', /unknown word "रामो"/], // sandhi between words
    ['रामेन सह गच्छति।', /unknown word "रामेन".*रामेण/], // wrong case form (ṇatva) → suggestion
    ['Rama गच्छति।', /Latin letters/],
    ['rāmaḥ गच्छति।', /Latin letters|IAST/],
    ['अहं गच्छामि', /must end with/], // missing daṇḍa
    ['अहं गच्छामि.', /full stop/],
    ['राम-लक्ष्मणौ गच्छतः।', /hyphen/],
    ['{n:person.rama} गच्छति।', /\{n:/],
    ['{w:nosuchword} इति शब्दः।', /unknown lexicon id/],
    ['{player}, अत्र आगच्छ।', /not present in the English/],
    ['किं अस्ति?', /word-final ं/],
    ['आगच्छत्वा।', /unknown word/], // prefix + ktvā is refused (lyap आगत्य)
  ];
  for (const [line, re] of bad) {
    const r = o.verifyLine(line, { en: 'English without markup.' });
    assert.ok(!r.ok, `should fail: ${line}`);
    assert.ok(re.test(r.errors.join(' | ')), `${line}: expected ${re}, got: ${r.errors.join(' | ')}`);
  }
  // models: wrong ṇatva / gender / paradigm are rejected
  const m = createOracle({
    models: [
      { stem: 'वाल्मीकि', gender: 'm', paradigm: 'hari-m', en: 'x', source: 'test' },
      { stem: 'राक्षस', gender: 'f', paradigm: 'deva-m', en: 'x', source: 'test' },
      { stem: 'राक्षस', gender: 'm', paradigm: 'no-such', en: 'x', source: 'test' },
    ],
  });
  assert.equal(m.modelErrors.length, 3, m.modelErrors.join('\n'));
  assert.ok(/muni-m/.test(m.modelErrors[0] ?? ''), 'ṇatva error names a fitting paradigm');
});

test('sambhashana: verifying 1,000 lines takes < 1 s', () => {
  const o = getOracle();
  const lines = ['रामः सीतया सह वनं गतवान्।', 'भवान् कुत्र गच्छति?', 'अहं श्वः आगमिष्यामि।', 'हनुमान् लङ्कां गतवान्।'];
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) o.verifyLine(lines[i % lines.length] ?? '');
  const ms = performance.now() - t0;
  assert.ok(ms < 1000, `1,000 lines took ${ms.toFixed(0)} ms`);
});

test('sambhashana: sa-verify.ts stays out of the browser bundle (imported only by tests)', () => {
  const dir = new URL('./', import.meta.url);
  for (const name of readdirSync(dir)) {
    if (!/\.(ts|tsx)$/.test(name) || /\.(test|spec)\.ts$/.test(name) || name === 'sa-verify.ts') continue;
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(!/from\s+['"]\.\/sa-verify/.test(src), `${name} imports ./sa-verify — the oracle must not reach the bundle`);
  }
});

test('sambhashana: {g:masc|fem} — both variants must verify; the view picks one by avatar', () => {
  const o = getOracle();
  assert.ok(o.verifyLine('{g:वत्स|वत्से}, अत्र आगच्छ।').ok, 'gendered vocative should verify');
  assert.ok(!o.verifyLine('{g:वत्स|}, अत्र आगच्छ।').ok, 'missing feminine form must fail');
  assert.ok(!o.verifyLine('{g:वत्स|वत्सक्षे}, अत्र आगच्छ।').ok, 'an unverifiable variant must fail');
  assert.ok(!o.verifyLine('{g:वत्स|वत्स}, अत्र आगच्छ।').ok, 'identical variants must fail');
});

test('sambhashana: labels (speaker titles) need no final ।; {n:…} only in labels', () => {
  const o = getOracle();
  assert.ok(o.verifyLine('ऋषिः', { label: true }).ok, 'a bare noun label verifies');
  assert.ok(!o.verifyLine('ऋषिः').ok, 'the same text as a sentence needs ।');
  assert.ok(o.verifyLine('{n:person.vanara} सैनिकः', { label: true, en: '{n:person.vanara} sentinel' }).ok, '{n:…} is allowed in a label');
  assert.ok(!o.verifyLine('{n:person.vanara} सैनिकः।', { en: '{n:person.vanara} sentinel.' }).ok, '{n:…} is refused in a sentence');
  assert.ok(!o.verifyLine('ऋषिक्षः', { label: true }).ok, 'an unknown word still fails in a label');
});
