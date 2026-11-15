/**
 * Content registry loader. OWNER: orchestrator.
 * All game-local content is JSON under ./content (human-auditable, separate from engine code).
 * Sanskrit inside it is Devanagari only and is validated by content.test.ts / world.test.ts.
 *
 * v0.6 (WP0, notes/v06-ownership.md): the content is assembled from parts (`assembleContent`, tests pass synthetic
 * parts) — v0.6 verses (shlokas-3/4/5, every one `kathaOnly`), lexicon-3/4/5 merged BY ID (an existing id only adds
 * forms, deduplicated by form + grammar; lemma / pos / gender / meaning must agree: v06-hooks.test), anvaya +
 * सरलार्थः (katha-verses-3/4/5 → katha.verses), names-3/4/5/6, told cutscenes and verse echoes. Everything v0.6 adds is
 * marked Kathā-only, and the new verses join their book's `shlokaIds` in story order (`bookOrder`). The practice game
 * sees none of it (logic-journey `journeyContent`).
 */
import type { AllyDef, ChainContent, ChapterDef, CutsceneContent, DialogueEntry, EnemyDef, EventDef, GameContent, ItemDef, KathaContent, KathaVerse, LexEntry, MapDef, MoveDef, NameEntry, Shloka, ToldCutscene, UiEntry, UiFile, VerseEcho, WalkStep } from './types';
import shlokas1 from './content/shlokas-1.json';
import shlokas2 from './content/shlokas-2.json';
import lexicon1 from './content/lexicon-1.json';
import lexicon2 from './content/lexicon-2.json';
import names from './content/names.json';
import defs from './content/defs.json';
import common from './content/story-common.json';
import ch1 from './content/story-ch1.json';
import ch2 from './content/story-ch2.json';
import ch3 from './content/story-ch3.json';
import ch4 from './content/story-ch4.json';
import ch5 from './content/story-ch5.json';
import ch6 from './content/story-ch6.json';
import sa1 from './content/sa-dialogue-1.json';
import sa2 from './content/sa-dialogue-2.json';
import sa3 from './content/sa-dialogue-3.json';
import sa4 from './content/sa-dialogue-4.json';
import uiCommon from './content/sa-ui-common.json';
import uiA from './content/sa-ui-a.json';
import uiB from './content/sa-ui-b.json';
import uiKatha from './content/sa-ui-katha.json';
import kathaJson from './content/katha.json';
import sa5 from './content/sa-dialogue-5.json';
// v0.5b (notes/v05b-ownership.md): one file per package — new Kathā lines of ch1–3 → 6 (WP-A), ch4 → 7 (WP-C), ch5 → 8 (WP-B), ch6 → 9 (WP-D)
import sa6 from './content/sa-dialogue-6.json';
import sa7 from './content/sa-dialogue-7.json';
import sa8 from './content/sa-dialogue-8.json';
import sa9 from './content/sa-dialogue-9.json';
import uiScene from './content/sa-ui-scene.json';
import uiSetu from './content/sa-ui-setu.json';
import uiChain from './content/sa-ui-chain.json';
import kathaChain from './content/katha-chain.json';
// v0.5b WP-E: the Āditya-hṛdayam cutscene (Yuddha 6.105.1–31, sources and variants; logic-cutscene.ts)
import aditya from './content/aditya-hridayam.json';
// ── v0.6 (notes/v06-ownership.md): one file per package — A Bāla/Ayodhyā, B Araṇya/Kiṣkindhā, C Sundara/Yuddha, D the herbs ──
import shlokas3 from './content/shlokas-3.json';
import shlokas4 from './content/shlokas-4.json';
import shlokas5 from './content/shlokas-5.json';
import lexicon3 from './content/lexicon-3.json';
import lexicon4 from './content/lexicon-4.json';
import lexicon5 from './content/lexicon-5.json';
import kathaVerses3 from './content/katha-verses-3.json';
import kathaVerses4 from './content/katha-verses-4.json';
import kathaVerses5 from './content/katha-verses-5.json';
import names3 from './content/names-3.json';
import names4 from './content/names-4.json';
import names5 from './content/names-5.json';
import names6 from './content/names-6.json';
import sa10 from './content/sa-dialogue-10.json';
import sa11 from './content/sa-dialogue-11.json';
import sa12 from './content/sa-dialogue-12.json';
import sa13 from './content/sa-dialogue-13.json';
import uiV06 from './content/sa-ui-v06.json';
import uiV06a from './content/sa-ui-v06-a.json';
import uiV06b from './content/sa-ui-v06-b.json';
import uiV06c from './content/sa-ui-v06-c.json';
import uiV06d from './content/sa-ui-v06-d.json';
import cutsceneMithila from './content/cutscene-mithila.json';
import cutsceneKumbhakarna from './content/cutscene-kumbhakarna.json';
import cutsceneHerbs from './content/cutscene-herbs.json';
import kathaEchoes from './content/katha-echoes.json';

/**
 * All Sambhāṣaṇa dialogue entries in file order (translators own one file each): 1–3 story lines,
 * 4 content strings (NPC titles, chapter summaries, move / ally / enemy / item descriptions, move origins),
 * 5 Kathā lines up to v0.5a, 6–9 the Kathā lines v0.5b adds (6: ch1–3, 7: ch4 + new moveText, 8: ch5, 9: ch6),
 * 10–13 the Kathā lines v0.6 adds (10: A, ch1–2 + cutscene-mithila; 11: B, ch3–4; 12: C, ch5–6 + cutscene-kumbhakarna;
 * 13: D, cutscene-herbs). The rule is sa-verify collectStoryStrings.
 */
export const DIALOGUE_FILES = [sa1, sa2, sa3, sa4, sa5, sa6, sa7, sa8, sa9, sa10, sa11, sa12, sa13] as unknown as { entries: DialogueEntry[] }[];

/** English → Sanskrit map of translated story text (entries with an empty `sa` are skipped). */
export function dialogueMap(files: { entries: DialogueEntry[] }[] = DIALOGUE_FILES): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of files) for (const e of f.entries) if (e.sa && e.sa.trim() && !(e.en in out)) out[e.en] = e.sa.trim();
  return out;
}

/**
 * Interface-string files (common: orchestrator · a: screens & menus · b: battle, challenges, cards, toasts · katha: Kathā
 * mode · v0.5b: scene (WP-A, keys scene.*), setu (WP-D, keys setu.*), chain (WP-C, keys chain.*) · v0.6: v06 (WP0,
 * keys v06.*), v06-a … v06-d (packages, keys v06a.* … v06d.*)).
 */
export const UI_FILES = [uiCommon, uiA, uiB, uiKatha, uiScene, uiSetu, uiChain, uiV06, uiV06a, uiV06b, uiV06c, uiV06d] as unknown as UiFile[];
/** File names of UI_FILES, same order (tests report by name). */
export const UI_FILE_NAMES = ['sa-ui-common.json', 'sa-ui-a.json', 'sa-ui-b.json', 'sa-ui-katha.json', 'sa-ui-scene.json', 'sa-ui-setu.json', 'sa-ui-chain.json', 'sa-ui-v06.json', 'sa-ui-v06-a.json', 'sa-ui-v06-b.json', 'sa-ui-v06-c.json', 'sa-ui-v06-d.json'] as const;

/** Merged interface strings; the first file that defines a key wins (sa-ui.test.ts forbids duplicates). */
export function uiMap(files: UiFile[] = UI_FILES): Record<string, UiEntry> {
  const out: Record<string, UiEntry> = {};
  for (const f of files) for (const [k, e] of Object.entries(f.entries)) if (!(k in out)) out[k] = e;
  return out;
}

interface StoryFile {
  chapters: ChapterDef[];
  maps: MapDef[];
  events: EventDef[];
  walkthrough: WalkStep[];
}
interface DefsFile {
  moves: MoveDef[];
  allies: AllyDef[];
  enemies: EnemyDef[];
  items: ItemDef[];
}

/** Story files in play order (walkthrough steps are concatenated in this order). */
const STORIES = [common, ch1, ch2, ch3, ch4, ch5, ch6] as unknown as StoryFile[];

/**
 * Lexicon files are written by two research agents (kāṇḍas 1–3 and 4–6). Entries with the same id
 * are merged: forms are concatenated, everything else must agree (content.test.ts checks this).
 */
export function mergeLexicons(lists: LexEntry[][]): LexEntry[] {
  const out = new Map<string, LexEntry>();
  for (const list of lists) {
    for (const e of list) {
      const prev = out.get(e.id);
      if (!prev) out.set(e.id, { ...e, forms: [...e.forms] });
      else out.set(e.id, { ...prev, forms: [...prev.forms, ...e.forms], tags: [...new Set([...prev.tags, ...e.tags])] });
    }
  }
  return [...out.values()];
}

/**
 * v0.6: the lexicon with the v0.6 files merged BY ID onto the v0.5 lexicon (`base`, merged as before). A v0.6 entry
 * whose id exists already only ADDS FORMS: a form with the same form + grammar as one present merges its shlokaIds,
 * any other form is appended and marked `kathaOnly`; its tags, provenance and notes are not used (its lemma / pos /
 * gender / meaning must agree: `lexiconConflicts`). A new id is appended whole, marked `kathaOnly` (entry and forms).
 * Entry order, form order and the v0.5 shlokaIds order are kept, so the practice view (logic-journey) gets the v0.5
 * lexicon back exactly.
 */
export function mergeLexiconsV06(base: LexEntry[], v06: LexEntry[][]): LexEntry[] {
  const out = new Map<string, LexEntry>(base.map((e) => [e.id, e]));
  for (const list of v06) {
    for (const e of list) {
      const prev = out.get(e.id);
      if (!prev) {
        out.set(e.id, { ...e, kathaOnly: true, forms: e.forms.map((f) => ({ ...f, shlokaIds: [...f.shlokaIds], kathaOnly: true as const })) });
        continue;
      }
      const forms = [...prev.forms];
      for (const f of e.forms) {
        const i = forms.findIndex((g) => g.form === f.form && g.grammar === f.grammar);
        const old = i >= 0 ? forms[i] : undefined;
        if (old) {
          const ids = [...old.shlokaIds, ...f.shlokaIds.filter((id) => !old.shlokaIds.includes(id))];
          if (ids.length !== old.shlokaIds.length) forms[i] = { ...old, shlokaIds: ids };
        } else forms.push({ ...f, shlokaIds: [...f.shlokaIds], kathaOnly: true });
      }
      out.set(e.id, { ...prev, forms });
    }
  }
  return [...out.values()];
}

/**
 * v0.6: where a v0.6 lexicon entry disagrees with the entry of the same id before it (lemma, pos, gender or meaning),
 * one line per field. `lists` in merge order (lexicon-1, -2, -3, -4, -5). The test (v06-hooks) wants none.
 */
export function lexiconConflicts(lists: { file: string; lexicon: LexEntry[] }[]): string[] {
  const first = new Map<string, { e: LexEntry; file: string }>();
  const out: string[] = [];
  for (const { file, lexicon } of lists) {
    for (const e of lexicon) {
      const p = first.get(e.id);
      if (!p) {
        first.set(e.id, { e, file });
        continue;
      }
      for (const k of ['lemma', 'pos', 'gender', 'meaning'] as const) {
        if ((p.e[k] ?? '') !== (e[k] ?? '')) out.push(`${file} "${e.id}": ${k} "${e[k] ?? ''}" differs from ${p.file} "${p.e[k] ?? ''}"`);
      }
    }
  }
  return out;
}

/**
 * v0.6: a book's verses in story order — its chapter's `shlokaIds` (v0.5), with every v0.6 verse of the book placed
 * after its `storyAfter` verse when it names one in the list, else before the first listed verse with a higher
 * sarga.verse, else at the end (v0.6 verses among themselves by sarga.verse).
 */
export function bookOrder(listed: string[], added: Shloka[], all: ReadonlyMap<string, Shloka>): string[] {
  const out = [...listed];
  const key = (s: Shloka): number => s.sarga * 10000 + s.verse;
  for (const s of [...added].sort((a, b) => key(a) - key(b))) {
    if (out.includes(s.id)) continue;
    const after = s.storyAfter ? out.indexOf(s.storyAfter) : -1;
    if (after >= 0) {
      // after the named verse and after any v0.6 verse already placed right behind it with a lower sarga.verse
      let i = after + 1;
      while (i < out.length && added.some((x) => x.id === out[i] && x.storyAfter === s.storyAfter)) i++;
      out.splice(i, 0, s.id);
      continue;
    }
    const before = out.findIndex((id) => {
      const o = all.get(id);
      return !!o && !o.kathaOnly && key(o) > key(s);
    });
    if (before >= 0) out.splice(before, 0, s.id);
    else out.push(s.id);
  }
  return out;
}

/** The raw parts the content is built from (the bundled JSON; tests may pass their own). */
export interface ContentParts {
  shlokas: Shloka[][];
  /** v0.6 verse files (shlokas-3/4/5): every verse becomes kathaOnly */
  shlokasV06: Shloka[][];
  lexicon: LexEntry[][];
  /** v0.6 lexicon files (lexicon-3/4/5): merged by id, Kathā-only */
  lexiconV06: LexEntry[][];
  names: NameEntry[];
  /** v0.6 name files (names-3/4/5/6): Kathā-only */
  namesV06: NameEntry[][];
  defs: DefsFile;
  stories: StoryFile[];
  katha: KathaContent;
  /** v0.6 anvaya + सरलार्थः files (katha-verses-3/4/5) */
  kathaVersesV06: KathaVerse[][];
  chain: ChainContent;
  aditya: CutsceneContent;
  cutscenes: ToldCutscene[];
  echoes: VerseEcho[];
  dialogue: { entries: DialogueEntry[] }[];
  ui: UiFile[];
}

const list = <T>(j: unknown, k: string): T[] => ((j as Record<string, unknown> | null)?.[k] as T[] | undefined) ?? [];

/** The bundled parts. */
export function bundledParts(): ContentParts {
  return {
    shlokas: [list<Shloka>(shlokas1, 'shlokas'), list<Shloka>(shlokas2, 'shlokas')],
    shlokasV06: [list<Shloka>(shlokas3, 'shlokas'), list<Shloka>(shlokas4, 'shlokas'), list<Shloka>(shlokas5, 'shlokas')],
    lexicon: [list<LexEntry>(lexicon1, 'lexicon'), list<LexEntry>(lexicon2, 'lexicon')],
    lexiconV06: [list<LexEntry>(lexicon3, 'lexicon'), list<LexEntry>(lexicon4, 'lexicon'), list<LexEntry>(lexicon5, 'lexicon')],
    names: list<NameEntry>(names, 'names'),
    namesV06: [list<NameEntry>(names3, 'names'), list<NameEntry>(names4, 'names'), list<NameEntry>(names5, 'names'), list<NameEntry>(names6, 'names')],
    defs: defs as unknown as DefsFile,
    stories: STORIES,
    katha: kathaJson as unknown as KathaContent,
    kathaVersesV06: [list<KathaVerse>(kathaVerses3, 'verses'), list<KathaVerse>(kathaVerses4, 'verses'), list<KathaVerse>(kathaVerses5, 'verses')],
    chain: kathaChain as unknown as ChainContent,
    aditya: aditya as unknown as CutsceneContent,
    cutscenes: [cutsceneMithila, cutsceneKumbhakarna, cutsceneHerbs] as unknown as ToldCutscene[],
    echoes: list<VerseEcho>(kathaEchoes, 'echoes'),
    dialogue: DIALOGUE_FILES,
    ui: UI_FILES,
  };
}

/** Told-cutscene files in content.ts order with the package that owns each (sa-verify: the dialogue file of its lines). */
export const CUTSCENE_FILES: readonly { file: string; pkg: 'a' | 'b' | 'c' | 'd' }[] = [
  { file: 'cutscene-mithila.json', pkg: 'a' },
  { file: 'cutscene-kumbhakarna.json', pkg: 'c' },
  { file: 'cutscene-herbs.json', pkg: 'd' },
];

/**
 * Build the game content from its parts. Pure. With no v0.6 parts (empty lists) the result is exactly the v0.5 content
 * (same arrays in the same order).
 */
export function assembleContent(p: ContentParts): GameContent {
  const shlokasV05 = p.shlokas.flat();
  const v06 = p.shlokasV06.flat().map((s) => (s.kathaOnly ? s : { ...s, kathaOnly: true as const }));
  const shlokas = v06.length ? [...shlokasV05, ...v06] : shlokasV05;
  const byId = new Map(shlokas.map((s) => [s.id, s]));
  const base = mergeLexicons(p.lexicon);
  const lexicon = p.lexiconV06.some((l) => l.length) ? mergeLexiconsV06(base, p.lexiconV06) : base;
  const namesV06 = p.namesV06.flat().map((n) => ({ ...n, kathaOnly: true as const }));
  const chaptersV05 = p.stories.flatMap((s) => s.chapters);
  const chapters = v06.length
    ? chaptersV05.map((c) => {
        const added = v06.filter((s) => s.kanda === c.kanda);
        return added.length ? { ...c, shlokaIds: bookOrder(c.shlokaIds, added, byId) } : c;
      })
    : chaptersV05;
  const kv = p.kathaVersesV06.flat();
  return {
    shlokas,
    lexicon,
    names: namesV06.length ? [...p.names, ...namesV06] : p.names,
    moves: p.defs.moves,
    allies: p.defs.allies,
    enemies: p.defs.enemies,
    items: p.defs.items,
    chapters,
    maps: p.stories.flatMap((s) => s.maps),
    events: p.stories.flatMap((s) => s.events),
    walkthrough: p.stories.flatMap((s) => s.walkthrough),
    dialogueSa: dialogueMap(p.dialogue),
    ui: uiMap(p.ui),
    katha: kv.length ? { ...p.katha, verses: [...p.katha.verses, ...kv] } : p.katha,
    chain: p.chain,
    aditya: p.aditya, // v0.5b WP-E
    cutscenes: p.cutscenes, // v0.6 WP0 (stubs included: logic-told skips them)
    echoes: p.echoes,
  };
}

let cached: GameContent | null = null;

/** The full game content (cached). Pure: no I/O beyond the bundled JSON. */
export function loadContent(): GameContent {
  if (cached) return cached;
  cached = assembleContent(bundledParts());
  return cached;
}
