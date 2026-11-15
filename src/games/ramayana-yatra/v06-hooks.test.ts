/**
 * v0.6 WP0 (notes/v06-plan.md §1, notes/v06-wp0.md): the groundwork the four packages build on.
 *  - content: v0.6 verses / lexicon / anvaya / names load and merge (lexicon BY ID: forms deduplicated, lemma / pos /
 *    gender / meaning agree), new verses join their book in story order; the Kathā-only filter gives the practice game
 *    exactly the v0.5 content, and the practice hash (V05A_PRACTICE) is unchanged with synthetic v0.6 content loaded
 *  - the effects kit (fx, topple / rise incl. the player, grow, glow, prop place / move / carry / remove, arrow): stage
 *    state + 'kit' fx, cleared when the script ends; Kathā only (world.test refuses it outside a Kathā block)
 *  - hotspots (found / passed), hidden spots on maps, told cutscenes (start, done with found / answers, verses heard,
 *    flags, stubs and practice skipped, timeline, stage), verse echoes; shrines never recite a v0.6 verse
 *  - the bots finish scripts with all of these (and find the hidden moments with `hidden`)
 *  - registrations: dialogue files 10–13, interface files v06*, art / prop / painter / 3D registries, e2e spec files
 * Packages add their own test files (notes/v06-ownership.md); this one is WP0's.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { Level } from '@sdk';
import { CUTSCENE_FILES, DIALOGUE_FILES, UI_FILE_NAMES, type ContentParts, assembleContent, bookOrder, bundledParts, lexiconConflicts, loadContent } from './content';
import {
  type EventCmd,
  type GameContent,
  type GameState,
  type LexEntry,
  type NameEntry,
  type Shloka,
  type ToldCutscene,
  type ToldStep,
  applyToldStep,
  checkTold,
  echoesOf,
  isRestorable,
  journeyContent,
  newGame,
  practiceContent,
  reduce,
  restorableIds,
  stageOf,
  toldBeatAt,
  toldDone,
  toldPath,
  toldSeen,
  toldStageAt,
  toldTimeline,
  toldVerses,
  visibleNpcs,
} from './logic';
import { startScript } from './logic-events';
import { autoplay, runWalkthrough } from './logic-sim';
import { PROP_IDS, SPRITE_IDS, isPropSprite } from './catalog';
import { PROP_DRAW } from './art';
import { CHARS } from './art-sprites';
import { PAINTERS } from './cutscene-paint';
import { SCENES_3D } from './cutscene3d-scenes';

const REAL = loadContent();
const DIR = new URL('./', import.meta.url);

// ───────────────────────── synthetic v0.6 content (test data only; Devanagari copied from real verses) ─────────────────────────

const base = REAL.shlokas.find((s) => s.id === 's-tapah-svadhyaya')!;
// (the practice view of REAL is the v0.5 content whatever the packages have written: the synthetic parts replace theirs)
/** A Kathā-only verse of Book 1 (sarga 30: after every v0.5 verse of the book) — the text of 1.1.1 under a test id. */
const V1: Shloka = { ...base, id: 's-v06-test', sarga: 30, verse: 1, kathaOnly: true };
/** One between two v0.5 verses (1.22.12 sorts before 1.23.2 s-kausalya-supraja). */
const V2: Shloka = { ...base, id: 's-v06-test-b', sarga: 22, verse: 12 };
const rama = practiceContent(REAL).lexicon.find((e) => e.id === 'rama')!;
const tapasvin = practiceContent(REAL).lexicon.find((e) => e.id === 'tapasvin')!;
const LEX3: LexEntry[] = [
  // an existing id: one form already there (its shlokaIds merge), one new form (Kathā-only)
  { ...rama, tags: ['person', 'v06-tag-ignored'], forms: [{ form: 'रामः', grammar: 'nom. sg. m.', shlokaIds: ['s-v06-test'] }, { form: 'रामेण', grammar: 'instr. sg. m.', shlokaIds: ['s-v06-test'] }] },
  // a new id (Kathā-only, whole)
  { ...tapasvin, id: 'v06-test-word', forms: [{ form: 'तपस्वी', grammar: 'nom. sg. m.', shlokaIds: ['s-v06-test', 's-v06-test-b'] }] },
];
const NAME3: NameEntry = { ...REAL.names.find((n) => n.id === 'person.rama')!, id: 'person.v06test' };
const KV3 = [{ ...REAL.katha!.verses.find((v) => v.shlokaId === 's-tapah-svadhyaya')!, shlokaId: 's-v06-test' }];

function parts(extra: Partial<ContentParts> = {}): ContentParts {
  return { ...bundledParts(), shlokasV06: [[V1, V2], [], []], lexiconV06: [LEX3, [], []], namesV06: [[NAME3], [], [], []], kathaVersesV06: [KV3, [], []], ...extra };
}
const SYN = assembleContent(parts());

// ───────────────────────── content loading and merging ─────────────────────────

test('v0.6 content: the files load, the v0.6 verses are Kathā-only and join their book in story order', () => {
  assert.equal(SYN.shlokas.length, REAL.shlokas.filter((x) => !x.kathaOnly).length + 2);
  assert.ok(SYN.shlokas.filter((s) => s.id.startsWith('s-v06')).every((s) => s.kathaOnly), 'every v0.6 verse is kathaOnly (set by the loader)');
  const book1 = SYN.chapters.find((c) => c.kanda === 1)!.shlokaIds;
  const v05 = practiceContent(REAL).chapters.find((c) => c.kanda === 1)!.shlokaIds;
  assert.deepEqual(book1.filter((id) => !id.startsWith('s-v06')), v05, 'the v0.5 order is kept');
  assert.equal(book1.indexOf('s-v06-test-b'), v05.indexOf('s-kausalya-supraja'), '1.22.12 comes right before 1.23.2');
  assert.equal(book1[book1.length - 1], 's-v06-test', '1.30.1 after every v0.5 verse of the book');
  assert.equal(SYN.katha!.verses.at(-1)!.shlokaId, 's-v06-test', 'katha-verses-3 joins katha.verses');
  assert.ok(SYN.names.some((n) => n.id === 'person.v06test' && n.kathaOnly), 'names-3 joins the names, Kathā-only');
  // storyAfter places a verse explicitly
  const all = new Map(SYN.shlokas.map((s) => [s.id, s]));
  const after = bookOrder(v05, [{ ...V1, storyAfter: 's-ko-nvasmin' }], all);
  assert.equal(after[after.indexOf('s-ko-nvasmin') + 1], 's-v06-test');
  // the bundled content: every verse of shlokas-3/4/5 is in its book, Kathā-only, and the books keep the v0.5 order
  for (const s of REAL.shlokas.filter((x) => x.kathaOnly)) assert.ok(REAL.chapters.find((c) => c.kanda === s.kanda)?.shlokaIds.includes(s.id), `${s.id} is in book ${s.kanda}`);
});

test('v0.6 content: lexicon-3/4/5 merge BY ID (forms deduplicated by form + grammar, shlokaIds merged; tags ignored; new ids and forms Kathā-only)', () => {
  const r = SYN.lexicon.find((e) => e.id === 'rama')!;
  const v05 = practiceContent(REAL).lexicon.find((e) => e.id === 'rama')!;
  const isNom = (f: LexEntry['forms'][number]): boolean => f.form === 'रामः' && f.grammar === 'nom. sg. m.';
  const nom = r.forms.filter(isNom);
  assert.equal(nom.length, v05.forms.filter(isNom).length, 'the same form + grammar adds no form');
  assert.deepEqual(nom[0]!.shlokaIds, [...v05.forms.find(isNom)!.shlokaIds, 's-v06-test'], 'its shlokaIds are merged into the first such form (v0.5 ids first)');
  assert.ok(!nom[0]!.kathaOnly, 'a merged form stays a v0.5 form');
  assert.equal(r.forms.length, v05.forms.length + 1, 'one new form');
  assert.ok(r.forms.find((f) => f.form === 'रामेण')?.kathaOnly, 'a new form is Kathā-only');
  assert.deepEqual(r.tags, v05.tags, 'a later file adds forms only (its tags are not used)');
  assert.ok(!r.kathaOnly);
  const w = SYN.lexicon.find((e) => e.id === 'v06-test-word')!;
  assert.ok(w.kathaOnly && w.forms.every((f) => f.kathaOnly), 'a new id is Kathā-only, entry and forms');
  assert.equal(SYN.lexicon.at(-1)!.id, 'v06-test-word', 'new ids come after the v0.5 entries');
});

test('v0.6 content: a v0.6 lexicon entry agrees with the entry of the same id before it (lemma, pos, gender, meaning) — bundled files and the check itself', () => {
  const p = bundledParts();
  const files = [['lexicon-1.json', p.lexicon[0]], ['lexicon-2.json', p.lexicon[1]], ['lexicon-3.json', p.lexiconV06[0]], ['lexicon-4.json', p.lexiconV06[1]], ['lexicon-5.json', p.lexiconV06[2]]] as const;
  // (lexicon-1/2 may repeat an id with a different gloss: content.test owns those; v0.6 files must agree with what came first)
  const v06Only = lexiconConflicts(files.map(([file, lexicon]) => ({ file, lexicon: lexicon ?? [] }))).filter((l) => /^lexicon-[345]\.json/.test(l));
  assert.deepEqual(v06Only, [], v06Only.join('\n'));
  const bad = lexiconConflicts([
    { file: 'lexicon-1.json', lexicon: [rama] },
    { file: 'lexicon-3.json', lexicon: [{ ...rama, meaning: 'another gloss', pos: 'noun' }] },
  ]);
  assert.equal(bad.length, 2, bad.join('\n'));
  assert.ok(bad.some((l) => /meaning/.test(l)) && bad.some((l) => /pos/.test(l)));
  // and every v0.6 verse id a lexicon form names exists
  const ids = new Set(REAL.shlokas.map((s) => s.id));
  const dangling = REAL.lexicon.flatMap((e) => e.forms.filter((f) => f.kathaOnly).flatMap((f) => f.shlokaIds.filter((id) => !ids.has(id)).map((id) => `${e.id} ${f.form}: ${id}`)));
  assert.deepEqual(dangling, []);
});

test('v0.6 content: without v0.6 parts the content is exactly the v0.5 content; the practice view of the v0.6 content is exactly the v0.5 content', () => {
  const v05 = assembleContent({ ...bundledParts(), shlokasV06: [[], [], []], lexiconV06: [[], [], []], namesV06: [[], [], [], []], kathaVersesV06: [[], [], []] });
  const p = practiceContent(SYN);
  assert.deepEqual(p.shlokas, v05.shlokas);
  assert.deepEqual(p.lexicon, v05.lexicon, 'entries, forms and shlokaIds in v0.5 order');
  assert.deepEqual(p.names, v05.names);
  assert.deepEqual(p.chapters, v05.chapters);
  assert.equal(practiceContent(v05), v05, 'content with nothing Kathā-only is its own practice view');
  assert.equal(practiceContent(p), p);
  assert.equal(journeyContent(SYN, { style: 'katha' }), SYN, 'Kathā sees everything');
  assert.equal(journeyContent(SYN, { style: 'abhyasa' }), p);
  assert.equal(journeyContent(SYN, null), p);
});

/** The projection of logic.test's V05A_PRACTICE ("v0.5b guard"), Sanskrit text fields excluded. */
const NO_SANSKRIT_TEXT = (k: string, v: unknown): unknown => (k === 'textSa' || k === 'sa' || k === 'nameSa' ? undefined : v);
/** logic.test.ts V05A_PRACTICE: the practice journey on the real content, computed on v0.5a. */
const V05A_PRACTICE = '9c766bd8c21a0c909c7c0070';

/** logic.test's "v0.5b guard" hash of the practice journey (seeds 1–3 × levels 2–4) on `content`. */
function practiceHash(content: GameContent): string {
  const h = createHash('sha256');
  const proj = (s: GameState): string => JSON.stringify({ save: s.save, session: s.session, battle: s.battle, pending: s.pending, mode: s.mode, tick: s.tick, recital: s.recital, fx: s.fx, script: s.script }, NO_SANSKRIT_TEXT);
  for (const level of [2, 3, 4] as Level[]) {
    for (const seed of [1, 2, 3]) {
      const r = runWalkthrough(content, seed, level, { onStep: (_i, s) => h.update(proj(s)) });
      h.update(proj(r.state));
      h.update(`${r.actions}/${r.battles}/${r.defeats}/${r.losses}/${r.retries}/${r.failedAt}/${r.error ?? ''}`);
    }
  }
  return h.digest('hex').slice(0, 24);
}

test('v0.6 guard: with synthetic v0.6 content loaded (Kathā-only verses, lexicon merges, names), the practice journey hashes exactly as without any v0.6 content', (t) => {
  // the same stories with no v0.6 parts at all: the v0.6 parts must change nothing a practice save sees. (Whether the
  // stories themselves still give V05A_PRACTICE is logic.test's "v0.5b guard"; the plan's one sanctioned practice change
  // — C removes Nala's name-stones line — re-baselines it there.)
  const none = assembleContent({ ...bundledParts(), shlokasV06: [[], [], []], lexiconV06: [[], [], []], namesV06: [[], [], [], []], kathaVersesV06: [[], [], []] });
  const base = practiceHash(none);
  assert.equal(practiceHash(SYN), base);
  if (base !== V05A_PRACTICE) t.diagnostic(`the stories' practice hash is ${base}, not V05A_PRACTICE (${V05A_PRACTICE}): see logic.test "v0.5b guard"`);
});

test('v0.6: restorable verses — a v0.6 verse is heard only (no shrine recital); the v0.5 verses stay restorable', () => {
  assert.ok(!isRestorable(SYN, 's-v06-test'));
  assert.ok(isRestorable(SYN, 's-ma-nishada'));
  assert.deepEqual(restorableIds(SYN), REAL.shlokas.filter((s) => !s.kathaOnly).map((s) => s.id));
  // a Kathā save that heard the v0.6 verse cannot recite it at a shrine
  let s = calm('katha', SYN);
  s = { ...s, save: { ...s.save, shlokas: { ...s.save.shlokas, 's-v06-test': { heard: true, restored: false, best: 0 }, 's-ma-nishada': { heard: true, restored: false, best: 0 } } } };
  s = startScript(s, SYN, 'test.shrine', [{ shrine: true }]);
  assert.equal(s.pending?.kind, 'shrine');
  assert.equal(reduce(s, SYN, { type: 'recite', shlokaId: 's-v06-test' }), s, 'refused');
  assert.notEqual(reduce(s, SYN, { type: 'recite', shlokaId: 's-ma-nishada' }), s, 'a v0.5 verse is recited');
});

// ───────────────────────── the effects kit ─────────────────────────

/** A calm state (explore, nothing pending) on the start map, Kathā or practice. */
function calm(style: 'katha' | 'abhyasa' = 'katha', content: GameContent = REAL): GameState {
  const s = newGame(1, 3, content, { name: 'Kit', avatar: 'a', style });
  return { ...s, mode: 'explore', script: null, pending: null, fx: [] };
}
const play = (s: GameState, cmds: unknown[], content: GameContent = REAL): GameState => startScript(s, content, 'test.v06', cmds as EventCmd[]);
const katha = (cmds: unknown[]): unknown[] => [{ if: 'style.katha', then: cmds }];

test('v0.6 kit: topple / rise (npcs and the player; allBut; "all"), grow, tint — stage state while the script runs, cleared when it ends', () => {
  const s0 = calm();
  const npcs = visibleNpcs(s0, REAL).map((n) => n.id);
  assert.ok(npcs.length >= 3, 'npcs on the start map');
  const keep = npcs.slice(0, 2);
  let s = play(s0, katha([{ topple: { allBut: keep } }, { grow: npcs[0], scale: 2.5 }, { fx: 'tint', color: 'gold' }, { say: 'held' }]));
  assert.equal(s.pending?.kind, 'say');
  const st = stageOf(s);
  assert.deepEqual(new Set(st.down), new Set(['player', ...npcs.slice(2)]), 'everyone but the two fell — the player too');
  assert.equal(st.scale[npcs[0]!], 2.5);
  assert.equal(st.tint, 'gold');
  s = reduce(s, REAL, { type: 'advance' });
  assert.equal(s.mode, 'explore');
  assert.equal(s.stage, undefined, 'the stage is cleared when the script ends');
  s = play(s0, katha([{ topple: ['player', npcs[1]] }, { rise: ['player'] }, { say: 'a' }]));
  assert.deepEqual(stageOf(s).down, [npcs[1]]);
  s = play(s0, katha([{ topple: { allBut: [] } }, { rise: 'all' }, { grow: 'player', scale: 9 }, { fx: 'tint', color: 'night' }, { fx: 'tint', color: 'none' }, { say: 'b' }]));
  assert.deepEqual(stageOf(s).down, []);
  assert.equal(stageOf(s).scale['player'], 4, 'scale is clamped to 0.5–4');
  assert.equal(stageOf(s).tint, undefined);
});

test('v0.6 kit: props — placed at a tile or a figure, moved, carried (follows the carrier), put down, removed; a prop can fall', () => {
  const s0 = calm();
  const n = visibleNpcs(s0, REAL)[0]!;
  let s = play(s0, katha([{ prop: 'sandals', sprite: 'log', at: { x: 3, y: 4 } }, { prop: 'sandals', to: n.id }, { say: 'x' }]));
  assert.deepEqual(stageOf(s).props['sandals'], { sprite: 'log', x: n.x, y: n.y });
  s = play(s0, katha([{ prop: 'sandals', sprite: 'flowers_red', at: 'player' }, { prop: 'sandals', carry: n.id }, { topple: ['sandals'] }, { say: 'x' }]));
  assert.deepEqual(stageOf(s).props['sandals'], { sprite: 'flowers_red', x: s0.save.x, y: s0.save.y, carry: n.id });
  assert.deepEqual(stageOf(s).down, ['sandals']);
  s = play(s0, katha([{ prop: 'sandals', sprite: 'log', at: { x: 3, y: 4 } }, { prop: 'sandals', carry: n.id }, { prop: 'sandals', carry: null }, { say: 'x' }]));
  assert.deepEqual(stageOf(s).props['sandals'], { sprite: 'log', x: n.x, y: n.y }, 'put down where the carrier stands');
  s = play(s0, katha([{ prop: 'sandals', sprite: 'log', at: { x: 3, y: 4 } }, { prop: 'sandals', remove: true }, { prop: 'ghost', to: { x: 1, y: 1 } }, { say: 'x' }]));
  assert.deepEqual(stageOf(s).props, {}, 'removed; a prop never placed is not moved');
  s = play(s0, katha([{ prop: 'p', sprite: 'log', at: { x: 3, y: 4 } }, { topple: ['player'] }, { warp: s0.save.mapId, x: s0.save.x, y: s0.save.y }, { say: 'x' }]));
  assert.equal(s.stage, undefined, 'a warp starts the map with no stage');
  assert.ok(isPropSprite('log') && isPropSprite('rama') && !isPropSprite('nothing'), 'a prop is a PROP_ID, a TileId or a SpriteId');
});

test('v0.6 kit: one-shot fx (shake, flash, petals, rain, glow, arrow) are kit fx with their ms; nothing waits', () => {
  const s0 = calm();
  const n = visibleNpcs(s0, REAL)[0]!;
  const s = play(s0, katha([{ fx: 'shake', ms: 900 }, { fx: 'flash' }, { fx: 'petals', ms: 5000 }, { fx: 'rain' }, { glow: { x: 5, y: 6, w: 2 }, ms: 1200 }, { arrow: { from: 'player', to: { x: 25, y: 7 }, through: [n.id] } }, { say: 'after' }]));
  assert.equal(s.pending?.kind, 'say', 'the kit never waits');
  const kit = s.fx.filter((f) => f.kind === 'kit');
  assert.deepEqual(kit.map((f) => f.kind === 'kit' && f.name), ['shake', 'flash', 'petals', 'rain', 'glow', 'arrow']);
  assert.deepEqual(kit.map((f) => f.kind === 'kit' && f.ms), [900, 450, 5000, 4000, 1200, 700]);
  const glow = kit[4]!;
  assert.ok(glow.kind === 'kit' && glow.at && glow.at.w === 2 && glow.at.h === 1);
  const arrow = kit[5]!;
  assert.ok(arrow.kind === 'kit' && arrow.path);
  assert.deepEqual(arrow.kind === 'kit' && arrow.path, [{ x: s0.save.x, y: s0.save.y }, { x: n.x, y: n.y }, { x: 25, y: 7 }]);
});

test('v0.6 kit: the practice journey runs none of it (same state, no stage, no fx)', () => {
  const s0 = calm('abhyasa');
  const s = play(s0, [{ topple: ['player'] }, { fx: 'shake' }, { prop: 'p', sprite: 'log', at: { x: 1, y: 1 } }, { hotspot: { x: 1, y: 1 }, then: [{ set: 'x' }] }, { cutscene: 'mithila' }, { echo: 'any' }, { say: 'end' }]);
  assert.equal(s.pending?.kind, 'say');
  assert.equal(s.stage, undefined);
  assert.deepEqual(s.fx, []);
});

// ───────────────────────── hotspots and hidden spots ─────────────────────────

test('v0.6 hotspot: a hidden moment — choose 0 finds it (flag, then its lines), advance passes; default flag found.<event>', () => {
  const s0 = calm();
  const cmds = katha([{ hotspot: { x: 4, y: 5 }, ms: 3000, then: [{ say: 'found!' }] }, { say: 'after' }]);
  let s = play(s0, cmds);
  assert.deepEqual(s.pending, { kind: 'hotspot', x: 4, y: 5, ms: 3000 });
  const found = reduce(s, REAL, { type: 'choose', index: 0 });
  assert.equal(found.pending?.kind === 'say' && found.pending.text, 'found!');
  assert.ok(found.save.flags['found.test.v06']);
  const passed = reduce(s, REAL, { type: 'advance' });
  assert.equal(passed.pending?.kind === 'say' && passed.pending.text, 'after');
  assert.ok(!passed.save.flags['found.test.v06']);
  assert.equal(reduce(s, REAL, { type: 'choose', index: 1 }), s, 'other input is ignored');
  s = play(s0, katha([{ hotspot: { x: 4, y: 5 }, flag: 'found.mine', then: [{ say: 'y' }] }]));
  assert.equal(s.pending?.kind === 'hotspot' && s.pending.ms, 4000, 'default window');
  assert.ok(reduce(s, REAL, { type: 'choose', index: 0 }).save.flags['found.mine']);
});

test('v0.6 hidden spots: facing a spot and A runs its event in Kathā while its requires holds; never in the practice game', () => {
  const s0 = calm();
  const map = REAL.maps.find((m) => m.id === s0.save.mapId)!;
  const fx = s0.save.x;
  const fy = s0.save.y + 1;
  const content: GameContent = {
    ...REAL,
    maps: REAL.maps.map((m) => (m.id === map.id ? { ...m, spots: [{ x: fx, y: fy, event: 'common.v06_spot', requires: 'style.katha&!v06.spot', glow: true }] } : m)),
    events: [...REAL.events, { id: 'common.v06_spot', cmds: [{ set: 'v06.spot' }, { say: 'the tree remembers' }] }],
  };
  const face = (s: GameState): GameState => ({ ...s, save: { ...s.save, facing: 'down' } });
  const k = reduce(face(s0), content, { type: 'interact' });
  assert.equal(k.pending?.kind === 'say' && k.pending.text, 'the tree remembers');
  const again = reduce(face({ ...s0, save: { ...s0.save, flags: { ...s0.save.flags, 'v06.spot': true } } }), content, { type: 'interact' });
  assert.notEqual(again.pending?.kind === 'say' && again.pending.text, 'the tree remembers', 'inactive once its requires fails');
  const p = reduce(face(calm('abhyasa')), content, { type: 'interact' });
  assert.notEqual(p.pending?.kind === 'say' && p.pending.text, 'the tree remembers', 'the practice game never sees it');
});

// ───────────────────────── told cutscenes ─────────────────────────

const VERSE_A = 's-ma-nishada';
const VERSE_B = 's-kausalya-supraja';
const TOLD: ToldCutscene = {
  version: 1,
  id: 'testscene',
  chapter: 1,
  title: 'A test scene',
  painter: 'plain',
  source: 'test',
  steps: [
    { scene: 'palace' },
    { cast: 'rama', sprite: 'rama', at: { x: 8, y: 7 }, face: 'right' },
    { cast: 'crowd', sprite: 'villager_m', at: { x: 12, y: 7 } },
    { say: 'Narration one.' },
    { hotspot: 'secret', at: [10, 5, 2, 2], ms: 5000, then: [{ say: 'Found it.' }, { verse: VERSE_B, padas: [0, 1] }] },
    { verse: VERSE_A },
    { fx: 'flash' },
    { topple: { allBut: ['rama'] } },
    { wait: 800 },
    { rise: 'all' },
    { cast: 'rama', to: { x: 10, y: 7 }, ms: 600 },
    { ask: 'Which way?', options: [{ label: 'North' }, { label: 'South', set: 'v06.south', then: [{ say: 'South it is.' }] }] },
    { fx: 'petals', ms: 3000 },
  ],
};
const TOLD_CONTENT: GameContent = { ...REAL, cutscenes: [...(REAL.cutscenes ?? []), TOLD, { version: 1, id: 'stubbed', chapter: 1, title: '', source: '', stub: true, steps: [] }] };

test('v0.6 told cutscene: { cutscene } waits on a pending; cutscene-done sets seen, found and option flags, hears the verses on the path, and the script goes on', () => {
  const s0 = calm('katha', TOLD_CONTENT);
  const s = play(s0, katha([{ say: 'before' }, { cutscene: 'testscene' }, { say: 'after' }]), TOLD_CONTENT);
  const at = reduce(s, TOLD_CONTENT, { type: 'advance' });
  assert.deepEqual(at.pending, { kind: 'cutscene', id: 'testscene' });
  // nothing found, the first option
  const plain = reduce(at, TOLD_CONTENT, { type: 'cutscene-done', id: 'testscene', found: [], answers: [0] });
  assert.equal(plain.pending?.kind === 'say' && plain.pending.text, 'after');
  assert.ok(plain.save.flags['seen.testscene']);
  assert.ok(!plain.save.flags['found.testscene.secret'] && !plain.save.flags['v06.south']);
  assert.ok(plain.save.shlokas[VERSE_A]?.heard && plain.save.flags[`heard.${VERSE_A}`] && plain.session.shlokasHeard.includes(VERSE_A), 'the verse on the main path is heard');
  assert.ok(!plain.save.shlokas[VERSE_B]?.heard, "a hotspot's verse is heard only when found");
  // found + the second option
  const all = reduce(at, TOLD_CONTENT, { type: 'cutscene-done', id: 'testscene', found: ['secret'], answers: [1] });
  assert.ok(all.save.flags['found.testscene.secret'] && all.save.flags['v06.south']);
  assert.ok(all.save.shlokas[VERSE_B]?.heard);
  // advance ends it too (nothing found)
  assert.equal(reduce(at, TOLD_CONTENT, { type: 'advance' }).pending?.kind, 'say');
  // invalid reports are refused
  for (const bad of [{ id: 'other' }, { id: 'testscene', found: ['nope'] }, { id: 'testscene', answers: [5] }, { id: 'testscene', answers: [0, 0] }]) assert.equal(reduce(at, TOLD_CONTENT, { type: 'cutscene-done', ...bad } as never), at, JSON.stringify(bad));
  assert.deepEqual(toldSeen(TOLD_CONTENT, all.save.flags).map((c) => c.id), ['testscene'], 'the verse book offers the replay once seen');
});

test('v0.6 told cutscene: a stub, an unknown id and the practice journey skip it; toldDone ignores other pendings', () => {
  for (const id of ['stubbed', 'nope']) {
    const s = play(calm('katha', TOLD_CONTENT), katha([{ cutscene: id }, { say: 'next' }]), TOLD_CONTENT);
    assert.equal(s.pending?.kind === 'say' && s.pending.text, 'next', id);
  }
  const p = play(calm('abhyasa', TOLD_CONTENT), [{ cutscene: 'testscene' }, { say: 'next' }], TOLD_CONTENT);
  assert.equal(p.pending?.kind === 'say' && p.pending.text, 'next');
  const s = calm('katha', TOLD_CONTENT);
  assert.equal(toldDone(s, TOLD_CONTENT, { type: 'cutscene-done', id: 'testscene' }), s);
});

test('v0.6 told cutscene: the path (options spliced in), the timeline (narration, pādas at the recitation pace, the clock stops on a question), the stage after n steps', () => {
  assert.deepEqual(toldPath(TOLD, [1]).slice(-3), [TOLD.steps[11], { say: 'South it is.' }, TOLD.steps[12]]);
  assert.deepEqual(toldVerses(TOLD.steps), [VERSE_A]);
  assert.deepEqual(toldVerses(TOLD.steps, new Set(['secret'])), [VERSE_B, VERSE_A]);
  const beats = toldTimeline(REAL, toldPath(TOLD, [0]));
  const padas = beats.filter((b) => b.kind === 'pada');
  assert.equal(padas.length, 4, 'one beat per pāda');
  assert.ok(padas.every((b) => b.ms >= 1500));
  const ask = beats.findIndex((b) => b.kind === 'ask');
  assert.ok(ask > 0);
  const end = beats.slice(0, ask).reduce((a, b) => a + b.ms, 0);
  assert.equal(toldBeatAt(beats, end + 99999).index, ask, 'the clock stops on the question');
  assert.equal(beats.find((b) => b.kind === 'cue' && b.ms === 800)?.step, 8, 'a wait holds');
  const st = toldStageAt(TOLD.steps, 8);
  assert.equal(st.scene, 'palace');
  assert.deepEqual(st.down, ['crowd'], 'all but Rāma fell');
  const st2 = toldStageAt(TOLD.steps);
  assert.deepEqual(st2.down, []);
  assert.deepEqual(st2.cast['rama'], { sprite: 'rama', x: 10, y: 7, facing: 'right' });
  assert.equal(applyToldStep(st2, { say: 'no change' } as ToldStep), st2);
});

test('v0.6 told cutscene: checkTold — the test scene and every bundled cutscene are well formed; painters and 3D scenes are registered', () => {
  const known = { shlokas: new Set(REAL.shlokas.map((s) => s.id)), painters: new Set(Object.keys(PAINTERS)), scenes3d: new Set(Object.keys(SCENES_3D)) };
  assert.deepEqual(checkTold(TOLD, known), []);
  for (const c of REAL.cutscenes ?? []) assert.deepEqual(checkTold(c, known), [], c.id);
  assert.equal((REAL.cutscenes ?? []).length, CUTSCENE_FILES.length, 'every cutscene file is bundled');
  const bad: ToldCutscene = { ...TOLD, id: 'Bad Id', steps: [{ verse: 'nope' }, { ask: 'x', options: [{ label: 'y', then: [{ ask: 'z', options: [{ label: 'w' }] }] }] }, { hotspot: 'h', at: [1, 2], then: [] } as unknown as ToldStep, { say: 'x', wait: 1 } as unknown as ToldStep] };
  const problems = checkTold(bad, known);
  for (const re of [/id must be/, /verse "nope"/, /no question inside an option/, /hotspot at/, /needs its "then"/, /exactly one kind/]) assert.ok(problems.some((p) => re.test(p)), `${re}: ${problems.join(' | ')}`);
  assert.ok(checkTold({ ...TOLD, painter: 'nobody' }, known).some((p) => /painter "nobody"/.test(p)));
});

// ───────────────────────── verse echoes ─────────────────────────

test('v0.6 echoes: { echo } sets echo.<id> once with a toast (Kathā only); the verse book reads the echoes found per verse', () => {
  const content: GameContent = { ...REAL, echoes: [{ id: 'twice', title: 'common.verse', shlokaIds: [VERSE_A, VERSE_B], source: 'test' }] };
  let s = play(calm('katha', content), katha([{ echo: 'twice' }, { say: 'x' }]), content);
  assert.ok(s.save.flags['echo.twice']);
  assert.ok(s.fx.some((f) => f.kind === 'toast'));
  assert.deepEqual(echoesOf(content, s.save.flags, VERSE_A).map((e) => e.id), ['twice']);
  assert.deepEqual(echoesOf(content, s.save.flags, 's-tapah-svadhyaya'), []);
  s = play({ ...s, mode: 'explore', script: null, pending: null, fx: [] }, katha([{ echo: 'twice' }, { say: 'x' }]), content);
  assert.ok(!s.fx.some((f) => f.kind === 'toast'), 'once');
  const p = play(calm('abhyasa', content), [{ echo: 'twice' }, { say: 'x' }], content);
  assert.ok(!p.save.flags['echo.twice']);
});

// ───────────────────────── bots ─────────────────────────

test('v0.6 bots: autoplay finishes a script with the kit, a hotspot and a told cutscene (passing the hidden moments, or finding them with `hidden`)', () => {
  const cmds = katha([{ topple: ['player'] }, { hotspot: { x: 1, y: 1 }, flag: 'found.bot', then: [{ say: 'hidden' }] }, { cutscene: 'testscene' }, { rise: 'all' }, { say: 'done' }]);
  const pass = autoplay(play(calm('katha', TOLD_CONTENT), cmds, TOLD_CONTENT), TOLD_CONTENT);
  assert.equal(pass.mode, 'explore');
  assert.ok(pass.save.flags['seen.testscene'] && !pass.save.flags['found.bot'] && !pass.save.flags['found.testscene.secret']);
  const find = autoplay(play(calm('katha', TOLD_CONTENT), cmds, TOLD_CONTENT), TOLD_CONTENT, { hidden: true });
  assert.ok(find.save.flags['found.bot'] && find.save.flags['found.testscene.secret']);
});

// ───────────────────────── registrations ─────────────────────────

test('v0.6 registrations: dialogue files 10–13, interface files v06 / v06-a…d, art (sprites with names and drawings, props with drawings), painters, 3D scenes, e2e spec files', () => {
  assert.equal(DIALOGUE_FILES.length, 13);
  for (const n of ['sa-ui-v06.json', 'sa-ui-v06-a.json', 'sa-ui-v06-b.json', 'sa-ui-v06-c.json', 'sa-ui-v06-d.json']) assert.ok((UI_FILE_NAMES as readonly string[]).includes(n), n);
  assert.deepEqual(Object.keys(PROP_DRAW).sort(), [...PROP_IDS].sort(), 'every prop id has a drawing');
  for (const id of SPRITE_IDS) assert.ok(CHARS[id], `sprite ${id} has a character spec`);
  // (every new sprite's person.<id> name: content.test REQUIRED_NAME_IDS, on the merged names)
  for (const x of ['a', 'b', 'c', 'd']) {
    for (const f of [`art-v06-${x}.ts`, `cutscene-paint-${x}.ts`, `e2e-v06-${x}.spec.ts`]) assert.ok(existsSync(new URL(f, DIR)), f);
  }
  const e2e = readFileSync(new URL('e2e.spec.ts', DIR), 'utf8');
  for (const X of ['A', 'B', 'C', 'D']) assert.ok(e2e.includes(`V06_${X}`), `e2e.spec registers V06_${X}`);
  assert.ok(existsSync(new URL('cutscene3d-herbs.ts', DIR)));
});
