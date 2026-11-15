/**
 * v0.6 WP0: the content each journey sees (plan §0.1, notes/v06-ownership.md). OWNER: WP0 / orchestrator. Pure.
 *
 * v0.6 verses (shlokas-3/4/5, `kathaOnly`), the forms and entries only lexicon-3/4/5 add and the names of names-3…6
 * are Kathā-only content. The practice game must stay byte-identical (V03_SNAPSHOT, V05A_PRACTICE), so everything it
 * reads — challenge pools, distractors, chapter fallbacks, the verse book, totals — comes from `practiceContent`, the
 * content without them: exactly the v0.5 content (same arrays, same order, the v0.5 shlokaIds of every form).
 *
 *   journeyContent(content, save)   the content a save's journey sees (Kathā: all of it; practice: practiceContent)
 *   practiceContent(content)        the content without the Kathā-only parts (cached per content object; the same
 *                                   object when there are none, so fixtures and v0.5 content are untouched)
 *   isRestorable(content, id)       a verse that can be restored at a shrine (v0.5 verses; v0.6 verses are heard only)
 *   restorableIds(content, ids?)    the restorable verse ids among `ids` (default: all)
 *
 * reduce / newGame / loadGame / sessionResult apply journeyContent themselves; the view (Game.tsx) gives every panel
 * the journey's content through env.content.
 */
import type { GameContent, LexEntry, SaveData } from './types';

const cache = new WeakMap<GameContent, GameContent>();

/** Does this content carry Kathā-only parts? */
function hasKathaOnly(c: GameContent): boolean {
  return c.shlokas.some((s) => s.kathaOnly) || c.lexicon.some((e) => e.kathaOnly || e.forms.some((f) => f.kathaOnly)) || c.names.some((n) => n.kathaOnly);
}

/** The content without its Kathā-only parts (see the file comment). */
export function practiceContent(c: GameContent): GameContent {
  const hit = cache.get(c);
  if (hit) return hit;
  if (!hasKathaOnly(c)) {
    cache.set(c, c);
    return c;
  }
  const keep = new Set(c.shlokas.filter((s) => !s.kathaOnly).map((s) => s.id));
  const gone = new Set(c.shlokas.filter((s) => s.kathaOnly).map((s) => s.id));
  const lexicon: LexEntry[] = [];
  for (const e of c.lexicon) {
    if (e.kathaOnly) continue;
    let changed = false;
    const forms: LexEntry['forms'] = [];
    for (const f of e.forms) {
      if (f.kathaOnly) {
        changed = true;
        continue;
      }
      if (f.shlokaIds.some((id) => gone.has(id))) {
        changed = true;
        forms.push({ ...f, shlokaIds: f.shlokaIds.filter((id) => !gone.has(id)) });
      } else forms.push(f);
    }
    lexicon.push(changed ? { ...e, forms } : e);
  }
  const out: GameContent = {
    ...c,
    shlokas: c.shlokas.filter((s) => keep.has(s.id)),
    lexicon,
    names: c.names.filter((n) => !n.kathaOnly),
    chapters: c.chapters.map((ch) => (ch.shlokaIds.some((id) => gone.has(id)) ? { ...ch, shlokaIds: ch.shlokaIds.filter((id) => !gone.has(id)) } : ch)),
  };
  cache.set(c, out);
  cache.set(out, out);
  return out;
}

/** The content a save's journey sees: all of it in Kathā, the practice view otherwise. */
export function journeyContent(c: GameContent, save: Pick<SaveData, 'style'> | { style?: string | undefined } | null | undefined): GameContent {
  return save?.style === 'katha' ? c : practiceContent(c);
}

/** v0.6: a verse that can be restored (recited at a shrine): every v0.5 verse; a v0.6 verse is heard only (§0.2). */
export function isRestorable(c: GameContent, shlokaId: string): boolean {
  const s = c.shlokas.find((x) => x.id === shlokaId);
  return !!s && !s.kathaOnly;
}

/** The restorable verse ids among `ids` (default: every verse of the content), order kept. */
export function restorableIds(c: GameContent, ids?: readonly string[]): string[] {
  const ok = new Set(c.shlokas.filter((s) => !s.kathaOnly).map((s) => s.id));
  return (ids ?? c.shlokas.map((s) => s.id)).filter((id) => ok.has(id));
}
