/**
 * Content registry loader. OWNER: orchestrator.
 * All game-local content is JSON under ./content (human-auditable, separate from engine code).
 * Sanskrit inside it is Devanagari only and is validated by content.test.ts / world.test.ts.
 */
import type { AllyDef, ChapterDef, DialogueEntry, EnemyDef, EventDef, GameContent, ItemDef, KathaContent, LexEntry, MapDef, MoveDef, NameEntry, Shloka, UiEntry, UiFile, WalkStep } from './types';
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

/**
 * All Sambhāṣaṇa dialogue entries in file order (translators own one file each): 1–3 story lines,
 * 4 content strings (NPC titles, chapter summaries, move / ally / enemy / item descriptions, move origins).
 */
export const DIALOGUE_FILES = [sa1, sa2, sa3, sa4, sa5] as unknown as { entries: DialogueEntry[] }[];

/** English → Sanskrit map of translated story text (entries with an empty `sa` are skipped). */
export function dialogueMap(files: { entries: DialogueEntry[] }[] = DIALOGUE_FILES): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of files) for (const e of f.entries) if (e.sa && e.sa.trim() && !(e.en in out)) out[e.en] = e.sa.trim();
  return out;
}

/** Interface-string files (common: orchestrator · a: screens & menus · b: battle, challenges, cards, toasts · katha: Kathā mode). */
export const UI_FILES = [uiCommon, uiA, uiB, uiKatha] as unknown as UiFile[];

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

let cached: GameContent | null = null;

/** The full game content (cached). Pure: no I/O beyond the bundled JSON. */
export function loadContent(): GameContent {
  if (cached) return cached;
  const d = defs as unknown as DefsFile;
  cached = {
    shlokas: [...(shlokas1 as unknown as { shlokas: Shloka[] }).shlokas, ...(shlokas2 as unknown as { shlokas: Shloka[] }).shlokas],
    lexicon: mergeLexicons([(lexicon1 as unknown as { lexicon: LexEntry[] }).lexicon, (lexicon2 as unknown as { lexicon: LexEntry[] }).lexicon]),
    names: (names as unknown as { names: NameEntry[] }).names,
    moves: d.moves,
    allies: d.allies,
    enemies: d.enemies,
    items: d.items,
    chapters: STORIES.flatMap((s) => s.chapters),
    maps: STORIES.flatMap((s) => s.maps),
    events: STORIES.flatMap((s) => s.events),
    walkthrough: STORIES.flatMap((s) => s.walkthrough),
    dialogueSa: dialogueMap(),
    ui: uiMap(),
    katha: kathaJson as unknown as KathaContent,
  };
  return cached;
}
