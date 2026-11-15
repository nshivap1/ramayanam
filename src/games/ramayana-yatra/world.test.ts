/**
 * Content integrity for the story files (content/story-*.json) and battle defs (content/defs.json).
 * OWNER: core. Story/battle agents: run `node tools/test.mjs unit games/ramayana-yatra/world.test`.
 * Checks skip gracefully while files are empty; reference checks against verses/lexicon/names/defs
 * switch on as soon as those files have content.
 * v0.5b (WP0): the Kathā-only commands {smarana} {book} {setu} must sit inside a Kathā block; avoid-triggers must
 * require style.katha; a walkthrough step's `style` is 'katha' or absent.
 * v0.6 (WP0): so must the effects kit ({fx} {topple} {rise} {grow} {glow} {prop} {arrow}), {hotspot} (its `then` is
 * walked), {cutscene} (a cutscene of content/cutscene-*.json) and {echo} (content/katha-echoes.json); a map's hidden
 * spots require style.katha. References (verses, lexicon, names) are checked against the merged content (v0.6 files).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import common from './content/story-common.json';
import ch1 from './content/story-ch1.json';
import ch2 from './content/story-ch2.json';
import ch3 from './content/story-ch3.json';
import ch4 from './content/story-ch4.json';
import ch5 from './content/story-ch5.json';
import ch6 from './content/story-ch6.json';
import defsJson from './content/defs.json';
import { loadContent } from './content';
import { ALLY_IDS, BATTLE_BG_IDS, BATTLER_IDS, ENEMY_IDS, SPRITE_IDS, TILE_IDS, TRACK_IDS, isPropSprite } from './catalog';
import { KIT_FX, TINTS } from './logic-stage';
import { toldAsks, toldFlag, toldHotspotFlag, toldHotspots } from './logic-told';
import type { AllyDef, ChapterDef, EnemyDef, EventCmd, EventDef, ItemDef, MapDef, MoveDef, WalkStep } from './types';
import { isSolidTile, tileAt } from './logic-world';
import { isKathaCond, isPracticeCond } from './sa-verify';

// ───────────────────────── inputs ─────────────────────────

export interface StoryFile {
  file: string;
  chapters: ChapterDef[];
  maps: MapDef[];
  events: EventDef[];
  walkthrough: WalkStep[];
}
export interface Defs {
  moves: MoveDef[];
  allies: AllyDef[];
  enemies: EnemyDef[];
  items: ItemDef[];
}
export interface Refs {
  defs: Defs;
  shlokaIds: Set<string>;
  lexIds: Set<string>;
  nameIds: Set<string>;
  /** v0.6: told cutscene ids (content/cutscene-*.json, stubs included) */
  cutscenes?: Set<string>;
  /** v0.6: verse echo ids (content/katha-echoes.json) */
  echoes?: Set<string>;
}

function story(file: string, json: unknown): StoryFile {
  const j = (json ?? {}) as Partial<StoryFile>;
  return { file, chapters: j.chapters ?? [], maps: j.maps ?? [], events: j.events ?? [], walkthrough: j.walkthrough ?? [] };
}

const FILES: StoryFile[] = [
  story('story-common.json', common),
  story('story-ch1.json', ch1),
  story('story-ch2.json', ch2),
  story('story-ch3.json', ch3),
  story('story-ch4.json', ch4),
  story('story-ch5.json', ch5),
  story('story-ch6.json', ch6),
];
const DEFS: Defs = { moves: [], allies: [], enemies: [], items: [], ...(defsJson as unknown as Partial<Defs>) };
const ids = (xs: unknown[] | undefined): Set<string> => new Set((xs ?? []).map((x) => (x as { id: string }).id));
// v0.6: the merged content (shlokas-1…5, lexicon-1…5, names + names-3…6), told cutscenes and verse echoes
const CONTENT = loadContent();
const REFS: Refs = {
  defs: DEFS,
  shlokaIds: ids(CONTENT.shlokas),
  lexIds: ids(CONTENT.lexicon),
  nameIds: ids(CONTENT.names),
  cutscenes: new Set((CONTENT.cutscenes ?? []).map((c) => c.id)),
  echoes: new Set((CONTENT.echoes ?? []).map((e) => e.id)),
};

// ───────────────────────── helpers ─────────────────────────

const TILES = new Set<string>(TILE_IDS);
const SPRITES = new Set<string>(SPRITE_IDS);
const TRACKS = new Set<string>(TRACK_IDS);
const BGS = new Set<string>(BATTLE_BG_IDS);
const BATTLERS = new Set<string>(BATTLER_IDS);
const ALLIES = new Set<string>(ALLY_IDS);
const ENEMIES = new Set<string>(ENEMY_IDS);
const KINDS = new Set(['artha', 'lipi', 'purana', 'krama', 'viccheda', 'vibhakti']);
const SFX = new Set(['tap', 'correct', 'wrong', 'win', 'lose', 'merge', 'tick', 'levelup']);
const LIGHTS = new Set(['day', 'dusk', 'night', 'dawn', 'interior']);
const DIRS = new Set(['up', 'down', 'left', 'right']);
const ELEMENTS = new Set(['agni', 'jala', 'vayu', 'bhumi', 'divya', 'maya', 'none']);
const CMD_KEYS = [
  'say', 'shloka', 'choice', 'label', 'goto', 'if', 'set', 'unset', 'give', 'take', 'niska', 'learn', 'quiz', 'battle', 'join', 'leave', 'heal', 'rest',
  'shrine', 'warp', 'move', 'face', 'wait', 'fade', 'music', 'sfx', 'shop', 'save', 'chapter', 'objective', 'end',
  // v0.5b (notes/v05b-plan.md §1): Kathā-only commands — P1 story recitation, P2 book review, P5 Nala's bridge
  'smarana', 'book', 'setu',
  // v0.6 (notes/v06-wp0.md): the effects kit, hidden moments, told cutscenes, verse echoes — Kathā only
  'fx', 'topple', 'rise', 'grow', 'glow', 'prop', 'arrow', 'hotspot', 'cutscene', 'echo',
] as const;
/** v0.5b: commands that may only run inside a Kathā block (`then` of `if: style.katha…`, `else` of `if: !style.katha…`). v0.6: the kit and friends too. */
const KATHA_ONLY_CMDS = new Set(['smarana', 'book', 'setu', 'fx', 'topple', 'rise', 'grow', 'glow', 'prop', 'arrow', 'hotspot', 'cutscene', 'echo']);
/** Devanagari (incl. extended) and IAST/romanisation diacritics, including combining marks. */
const DEVA = /[\u0900-\u097F\uA8E0-\uA8FF\u1CD0-\u1CFF]/;
const IAST = /[\u0101\u012B\u016B\u1E5B\u1E5D\u1E37\u1E39\u1E45\u00F1\u1E6D\u1E0D\u1E47\u015B\u1E63\u1E25\u1E43\u1E41\u0100\u012A\u016A\u1E5A\u1E5C\u1E36\u1E38\u1E44\u00D1\u1E6C\u1E0C\u1E46\u015A\u1E62\u1E24\u1E42\u1E40\u0300-\u036F]/;

const isInt = (n: unknown): n is number => Number.isInteger(n);
/**
 * Prefix for problems caused by content another agent has not written yet (a verse, a lexicon/name id,
 * a defs entry, a map in a later chapter file). They are diagnostics while the story is incomplete and
 * failures in strict mode (every chapter file has maps, or RY_STRICT=1).
 */
export const PENDING = 'pending: ';

function cmdKey(c: EventCmd): string | undefined {
  return CMD_KEYS.find((k) => k in (c as object));
}

/**
 * Walk every command (depth-first) with its path, the label sets of all enclosing blocks and whether it runs only in
 * the Kathā journey (v0.5b: inside the `then` of `{ "if": "style.katha…" }` or the `else` of `{ "if": "!style.katha…" }`).
 */
function walkCmds(cmds: EventCmd[] | undefined, path: string, labels: Set<string>[], visit: (c: EventCmd, path: string, labels: Set<string>[], katha: boolean) => void, katha = false): void {
  if (!Array.isArray(cmds)) return;
  const here = new Set(cmds.filter((c) => c && typeof c === 'object' && 'label' in c).map((c) => (c as { label: string }).label));
  const stack = [...labels, here];
  cmds.forEach((c, i) => {
    const p = `${path}[${i}]`;
    if (!c || typeof c !== 'object') return visit(c, p, stack, katha);
    visit(c, p, stack, katha);
    if ('if' in c) {
      walkCmds(c.then, `${p}.then`, stack, visit, katha || isKathaCond(c.if));
      walkCmds(c.else, `${p}.else`, stack, visit, katha || isPracticeCond(c.if));
    }
    if ('quiz' in c) {
      walkCmds(c.onCorrect, `${p}.onCorrect`, stack, visit, katha);
      walkCmds(c.onWrong, `${p}.onWrong`, stack, visit, katha);
    }
    if ('battle' in c) {
      walkCmds(c.onWin, `${p}.onWin`, stack, visit, katha);
      walkCmds(c.onLose, `${p}.onLose`, stack, visit, katha);
    }
    // v0.6: a hidden moment's `then` (pushed as a frame when found)
    if ('hotspot' in c) walkCmds(c.then, `${p}.then`, stack, visit, katha);
  });
}

/** Every string value in a JSON tree with its path. */
function strings(v: unknown, path: string, out: { path: string; text: string }[] = []): { path: string; text: string }[] {
  if (typeof v === 'string') out.push({ path, text: v });
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, `${path}.${k}`, out);
  return out;
}

function allMaps(files: StoryFile[]): Map<string, MapDef> {
  const m = new Map<string, MapDef>();
  for (const f of files) for (const map of f.maps) if (!m.has(map.id)) m.set(map.id, map);
  return m;
}

function hasShrine(map: MapDef): boolean {
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const t = tileAt(map, x, y);
    if (t.ground === 'shrine' || t.overlay === 'shrine') return true;
  }
  return false;
}

/** NPCs that are always present (no showIf) and solid. */
function fixedNpcAt(map: MapDef, x: number, y: number): string | undefined {
  return map.npcs.find((n) => !n.showIf && n.solid !== false && n.x === x && n.y === y)?.id;
}

// ───────────────────────── validators (each returns precise problems) ─────────────────────────

export function checkMaps(files: StoryFile[], refs: Refs): string[] {
  const out: string[] = [];
  const seen = new Map<string, string>();
  for (const f of files) {
    for (const m of f.maps) {
      const where = `${f.file} map ${m.id}`;
      if (seen.has(m.id)) out.push(`${where}: duplicate map id (also in ${seen.get(m.id)})`);
      seen.set(m.id, f.file);
      if (!isInt(m.width) || !isInt(m.height) || m.width < 1 || m.height < 1) {
        out.push(`${where}: width/height must be positive integers`);
        continue;
      }
      if (![1, 2, 3, 4, 5, 6].includes(m.kanda)) out.push(`${where}: kanda ${String(m.kanda)} must be 1..6`);
      const legend = m.legend ?? {};
      for (const [ch, tile] of Object.entries(legend)) {
        if (ch.length !== 1) out.push(`${where}: legend key "${ch}" must be exactly one character`);
        if (!TILES.has(tile)) out.push(`${where}: legend "${ch}" → "${tile}" is not a TILE_ID`);
      }
      const layers: [string, string[] | undefined][] = [['ground', m.ground], ['overlay', m.overlay]];
      for (const [layer, rows] of layers) {
        if (rows === undefined) {
          if (layer === 'ground') out.push(`${where}: missing ground`);
          continue;
        }
        if (!Array.isArray(rows)) {
          out.push(`${where}: ${layer} must be an array of strings`);
          continue;
        }
        const lp = layer === 'ground' ? '' : `${layer} `;
        if (rows.length !== m.height) out.push(`${where} ${lp}has ${rows.length} rows, expected ${m.height}`);
        rows.forEach((row, r) => {
          if (typeof row !== 'string') return void out.push(`${where} ${lp}row ${r} is not a string`);
          if (row.length !== m.width) out.push(`${f.file} map ${m.id} ${lp}row ${r} has ${row.length} chars, expected ${m.width}`);
          for (let x = 0; x < row.length; x++) {
            const ch = row[x]!;
            if (layer === 'overlay' && ch === ' ') continue;
            if (!(ch in legend)) out.push(`${where} ${lp}row ${r} col ${x}: char "${ch}" is not in the legend`);
          }
        });
      }
      if (!TRACKS.has(m.music)) out.push(`${where}: music "${m.music}" is not a TRACK_ID`);
      if (!BGS.has(m.battleBg)) out.push(`${where}: battleBg "${m.battleBg}" is not a BATTLE_BG_ID`);
      if (m.light !== undefined && !LIGHTS.has(m.light)) out.push(`${where}: light "${m.light}" must be one of ${[...LIGHTS].join('/')}`);
      if (typeof m.nameId !== 'string' || !m.nameId.startsWith('place.')) out.push(`${where}: nameId "${m.nameId}" must be a place.* name id`);
      else if (refs.nameIds.size > 0 && !refs.nameIds.has(m.nameId)) out.push(`${PENDING}${where}: nameId "${m.nameId}" is not in names.json`);
      if (!Array.isArray(m.npcs) || !Array.isArray(m.warps) || !Array.isArray(m.triggers)) out.push(`${where}: npcs, warps and triggers must be arrays (may be empty)`);
      if (m.encounters) {
        if (!(m.encounters.rate > 0 && m.encounters.rate <= 1)) out.push(`${where}: encounters.rate ${m.encounters.rate} must be in (0, 1]`);
        for (const e of m.encounters.table ?? []) {
          if (!ENEMIES.has(e.enemyId)) out.push(`${where}: encounter enemy "${e.enemyId}" is not in ENEMY_IDS`);
          else if (refs.defs.enemies.length > 0 && !refs.defs.enemies.some((d) => d.id === e.enemyId)) out.push(`${PENDING}${where}: encounter enemy "${e.enemyId}" is not in defs.json enemies`);
          if (!(e.weight > 0) || !isInt(e.minLevel) || !isInt(e.maxLevel) || e.minLevel < 1 || e.maxLevel < e.minLevel) out.push(`${where}: encounter "${e.enemyId}" needs weight > 0 and 1 ≤ minLevel ≤ maxLevel`);
        }
      }
    }
  }
  return out;
}

export function checkPlacement(files: StoryFile[], refs: Refs): string[] {
  void refs;
  const out: string[] = [];
  const maps = allMaps(files);
  for (const f of files) {
    for (const m of f.maps) {
      const where = `${f.file} map ${m.id}`;
      const inb = (x: number, y: number): boolean => isInt(x) && isInt(y) && x >= 0 && y >= 0 && x < m.width && y < m.height;
      const npcIds = new Set<string>();
      for (const n of m.npcs ?? []) {
        const w = `${where} npc ${n.id} at (${n.x},${n.y})`;
        if (npcIds.has(n.id)) out.push(`${where}: duplicate npc id "${n.id}"`);
        npcIds.add(n.id);
        if (!inb(n.x, n.y)) out.push(`${w} is out of bounds (${m.width}x${m.height})`);
        else if (isSolidTile(m, n.x, n.y)) out.push(`${w} stands on a solid tile (${tileAt(m, n.x, n.y).ground}/${tileAt(m, n.x, n.y).overlay ?? '-'})`);
        if (!SPRITES.has(n.sprite)) out.push(`${w}: sprite "${n.sprite}" is not a SPRITE_ID`);
        if (!DIRS.has(n.facing)) out.push(`${w}: facing "${n.facing}" is not a direction`);
        if (m.warps?.some((wp) => wp.x === n.x && wp.y === n.y)) out.push(`${w} stands on a warp tile`);
        if (!n.showIf) {
          const other = (m.npcs ?? []).find((o) => o !== n && !o.showIf && o.x === n.x && o.y === n.y);
          if (other && other.id > n.id) out.push(`${w} overlaps npc ${other.id} (both always visible)`);
        }
      }
      for (const wp of m.warps ?? []) {
        const w = `${where} warp at (${wp.x},${wp.y}) → ${wp.to} (${wp.tx},${wp.ty})`;
        if (!inb(wp.x, wp.y)) out.push(`${w}: source is out of bounds`);
        else if (isSolidTile(m, wp.x, wp.y)) out.push(`${w}: source tile is solid, so the player can never step on it`);
        const t = maps.get(wp.to);
        if (!t) out.push(`${PENDING}${w}: target map "${wp.to}" does not exist`);
        else if (!(isInt(wp.tx) && isInt(wp.ty) && wp.tx >= 0 && wp.ty >= 0 && wp.tx < t.width && wp.ty < t.height)) out.push(`${w}: target is out of bounds (${t.width}x${t.height})`);
        else if (isSolidTile(t, wp.tx, wp.ty)) out.push(`${w}: target tile is solid`);
        else if (fixedNpcAt(t, wp.tx, wp.ty)) out.push(`${w}: target tile is occupied by npc ${fixedNpcAt(t, wp.tx, wp.ty)}`);
        if (wp.facing !== undefined && !DIRS.has(wp.facing)) out.push(`${w}: facing "${wp.facing}" is not a direction`);
      }
      for (const tr of m.triggers ?? []) {
        const w = `${where} trigger ${tr.event} at (${tr.x},${tr.y}) ${tr.w}x${tr.h}`;
        if (!isInt(tr.w) || !isInt(tr.h) || tr.w < 1 || tr.h < 1) out.push(`${w}: w and h must be integers ≥ 1`);
        else if (!inb(tr.x, tr.y) || !inb(tr.x + tr.w - 1, tr.y + tr.h - 1)) out.push(`${w} is out of bounds (${m.width}x${m.height})`);
        // v0.5b P3: a guard's line of sight is Kathā only (the practice journey must not change)
        if (tr.avoid !== undefined && typeof tr.avoid !== 'boolean') out.push(`${w}: avoid must be true or false`);
        if (tr.avoid === true && !isKathaCond(tr.requires)) out.push(`${w}: an avoid-trigger (a guard's line of sight) is Kathā only — its requires must include style.katha`);
      }
      for (const s of m.signs ?? []) if (!inb(s.x, s.y)) out.push(`${where} sign at (${s.x},${s.y}) is out of bounds`);
      // v0.6: hidden spots are Kathā only, in bounds, never on another sign
      for (const sp of m.spots ?? []) {
        const w = `${where} spot at (${sp.x},${sp.y})`;
        if (!inb(sp.x, sp.y)) out.push(`${w} is out of bounds`);
        if (!isKathaCond(sp.requires)) out.push(`${w}: a hidden spot is Kathā only — its requires must include style.katha`);
        if (sp.glow !== undefined && typeof sp.glow !== 'boolean') out.push(`${w}: glow must be true or false`);
        if (m.signs?.some((sg) => sg.x === sp.x && sg.y === sp.y)) out.push(`${w} is on a sign`);
      }
    }
  }
  return out;
}

export function checkEvents(files: StoryFile[], refs: Refs): string[] {
  const out: string[] = [];
  const maps = allMaps(files);
  const npcIds = new Set<string>();
  for (const m of maps.values()) for (const n of m.npcs ?? []) npcIds.add(n.id);
  const events = new Map<string, string>();
  for (const f of files) {
    for (const e of f.events) {
      if (events.has(e.id)) out.push(`${f.file} event ${e.id}: duplicate event id (also in ${events.get(e.id)})`);
      events.set(e.id, f.file);
      if (!/^(common|ch[1-6])\.[a-z0-9_]+$/.test(e.id)) out.push(`${f.file} event ${e.id}: id must look like ch<N>.<snake> or common.<snake>`);
    }
  }
  const needEvent = (id: string | undefined, where: string): void => {
    if (id !== undefined && !events.has(id)) out.push(`${where} references event "${id}", which does not exist`);
  };
  const { defs } = refs;
  const items = new Set(defs.items.map((i) => i.id));
  const markup = (text: unknown, where: string): void => {
    if (typeof text !== 'string') return;
    for (const mm of text.matchAll(/\{w:([^}]*)\}/g)) if (refs.lexIds.size > 0 && !refs.lexIds.has(mm[1]!)) out.push(`${PENDING}${where}: {w:${mm[1]}} is not a lexicon id`);
    for (const mm of text.matchAll(/\{n:([^}]*)\}/g)) if (refs.nameIds.size > 0 && !refs.nameIds.has(mm[1]!)) out.push(`${PENDING}${where}: {n:${mm[1]}} is not a names.json id`);
    for (const mm of text.matchAll(/\{([^}]*)\}/g)) if (!/^(w:|n:|b:|player$)/.test(mm[1]!)) out.push(`${where}: unknown markup "{${mm[1]}}" (use {w:…} {n:…} {b:…} {player})`);
    if ((text.match(/\{/g) ?? []).length !== (text.match(/\}/g) ?? []).length) out.push(`${where}: unbalanced braces in text`);
  };
  for (const f of files) {
    for (const m of f.maps) {
      for (const n of m.npcs ?? []) needEvent(n.event, `${f.file} map ${m.id} npc ${n.id}`);
      for (const t of m.triggers ?? []) needEvent(t.event, `${f.file} map ${m.id} trigger at (${t.x},${t.y})`);
      for (const w of m.warps ?? []) needEvent(w.lockedEvent, `${f.file} map ${m.id} warp at (${w.x},${w.y}) lockedEvent`);
      needEvent(m.onEnter, `${f.file} map ${m.id} onEnter`);
      for (const s of m.signs ?? []) markup(s.text, `${f.file} map ${m.id} sign at (${s.x},${s.y})`);
      for (const sp of m.spots ?? []) needEvent(sp.event, `${f.file} map ${m.id} spot at (${sp.x},${sp.y})`);
    }
    for (const e of f.events) {
      if (!Array.isArray(e.cmds)) {
        out.push(`${f.file} event ${e.id}: cmds must be an array`);
        continue;
      }
      walkCmds(e.cmds, `${f.file} event ${e.id} cmds`, [], (c, where, labels, katha) => {
        if (!c || typeof c !== 'object') return void out.push(`${where}: not a command object`);
        const key = cmdKey(c);
        if (!key) return void out.push(`${where}: unknown command ${JSON.stringify(c).slice(0, 60)}`);
        // v0.5b: P1 / P2 / P5 run in the Kathā journey only (the practice journey is unchanged)
        if (KATHA_ONLY_CMDS.has(key) && !katha) out.push(`${where}: {${key}} is Kathā only — put it inside { "if": "style.katha", "then": [...] }`);
        const hasLabel = (l: string): boolean => labels.some((s) => s.has(l));
        if ('say' in c && typeof c.say !== 'string') out.push(`${where}: say must be a string`);
        if ('objective' in c && typeof c.objective !== 'string') out.push(`${where}: objective must be a string`);
        if ('say' in c) {
          markup(c.say, where);
          if (c.portrait !== undefined && !SPRITES.has(c.portrait)) out.push(`${where}: portrait "${c.portrait}" is not a SPRITE_ID`);
        }
        if ('objective' in c) markup(c.objective, where);
        if ('goto' in c && !hasLabel(c.goto)) out.push(`${where}: goto "${c.goto}" has no matching {label} in this block or an enclosing one`);
        if ('choice' in c) {
          markup(c.choice, where);
          if (!Array.isArray(c.options) || c.options.length === 0) out.push(`${where}: choice needs at least one option`);
          for (const [i, o] of (c.options ?? []).entries()) {
            markup(o.label, `${where}.options[${i}]`);
            if (o.goto !== undefined && !hasLabel(o.goto)) out.push(`${where}.options[${i}]: goto "${o.goto}" has no matching {label}`);
          }
        }
        if ('battle' in c) {
          const b = c.battle;
          if (!b || !Array.isArray(b.enemies) || b.enemies.length === 0) out.push(`${where}: battle needs enemies`);
          for (const en of b?.enemies ?? []) {
            if (!ENEMIES.has(en.id)) out.push(`${where}: enemy "${en.id}" is not in ENEMY_IDS`);
            else if (defs.enemies.length > 0 && !defs.enemies.some((d) => d.id === en.id)) out.push(`${PENDING}${where}: enemy "${en.id}" is not in defs.json enemies`);
            if (!isInt(en.level) || en.level < 1) out.push(`${where}: enemy "${en.id}" level must be an integer ≥ 1`);
          }
          if (b && !BGS.has(b.bg)) out.push(`${where}: battle bg "${b?.bg}" is not a BATTLE_BG_ID`);
          if (b && !TRACKS.has(b.music)) out.push(`${where}: battle music "${b?.music}" is not a TRACK_ID`);
          if (b && !['wild', 'boss', 'duel'].includes(b.kind)) out.push(`${where}: battle kind "${b.kind}" must be wild/boss/duel`);
          if (b && (typeof b.canRun !== 'boolean' || typeof b.canLose !== 'boolean')) out.push(`${where}: battle needs canRun and canLose booleans`);
          if (b?.intro) markup(b.intro, where);
        }
        for (const k of ['give', 'take'] as const) {
          if (k in c) {
            const id = (c as Record<string, string>)[k]!;
            if (items.size > 0 && !items.has(id)) out.push(`${PENDING}${where}: ${k} item "${id}" is not in defs.json items`);
          }
        }
        if ('shop' in c) {
          if (!Array.isArray(c.shop) || c.shop.length === 0) out.push(`${where}: shop needs at least one item`);
          for (const id of c.shop ?? []) if (items.size > 0 && !items.has(id)) out.push(`${PENDING}${where}: shop item "${id}" is not in defs.json items`);
        }
        for (const k of ['join', 'leave'] as const) {
          if (k in c) {
            const id = (c as Record<string, string>)[k]!;
            if (!ALLIES.has(id) || id === 'player') out.push(`${where}: ${k} "${id}" is not a joinable ALLY_ID`);
            else if (defs.allies.length > 0 && !defs.allies.some((a) => a.id === id)) out.push(`${PENDING}${where}: ${k} "${id}" is not in defs.json allies`);
          }
        }
        if ('shloka' in c) {
          if (refs.shlokaIds.size > 0 && !refs.shlokaIds.has(c.shloka)) out.push(`${PENDING}${where}: shloka "${c.shloka}" is not in shlokas-*.json`);
          if (c.mode !== undefined && c.mode !== 'hear' && c.mode !== 'restore') out.push(`${where}: shloka mode must be hear/restore`);
        }
        if ('quiz' in c) {
          if (!KINDS.has(c.quiz)) out.push(`${where}: quiz kind "${c.quiz}" is not a ChallengeKind`);
          if (c.shlokaId !== undefined && refs.shlokaIds.size > 0 && !refs.shlokaIds.has(c.shlokaId)) out.push(`${PENDING}${where}: quiz shlokaId "${c.shlokaId}" is not in shlokas-*.json`);
          for (const id of c.lexIds ?? []) if (refs.lexIds.size > 0 && !refs.lexIds.has(id)) out.push(`${PENDING}${where}: quiz lexId "${id}" is not in the lexicon`);
        }
        if ('learn' in c) {
          if (!Array.isArray(c.learn) || c.learn.length === 0) out.push(`${where}: learn needs lexIds`);
          for (const id of c.learn ?? []) if (refs.lexIds.size > 0 && !refs.lexIds.has(id)) out.push(`${PENDING}${where}: learn lexId "${id}" is not in the lexicon`);
        }
        if ('music' in c && !TRACKS.has(c.music)) out.push(`${where}: music "${c.music}" is not a TRACK_ID`);
        if ('sfx' in c && !SFX.has(c.sfx)) out.push(`${where}: sfx "${c.sfx}" must be one of ${[...SFX].join('/')}`);
        if ('warp' in c) {
          const t = maps.get(c.warp);
          if (!t) out.push(`${PENDING}${where}: warp target map "${c.warp}" does not exist`);
          else if (isSolidTile(t, c.x, c.y)) out.push(`${where}: warp target (${c.x},${c.y}) on ${c.warp} is out of bounds or solid`);
        }
        if ('move' in c) {
          if (c.move !== 'player' && !npcIds.has(c.move)) out.push(`${where}: move "${c.move}" is not "player" or an npc id`);
          if (!Array.isArray(c.path) || c.path.length === 0 || !c.path.every((d) => DIRS.has(d))) out.push(`${where}: move path must be a non-empty list of directions`);
        }
        if ('face' in c) {
          if (c.face !== 'player' && !npcIds.has(c.face)) out.push(`${where}: face "${c.face}" is not "player" or an npc id`);
          if (!DIRS.has(c.dir)) out.push(`${where}: face dir "${c.dir}" is not a direction`);
        }
        if ('chapter' in c && ![1, 2, 3, 4, 5, 6].includes(c.chapter)) out.push(`${where}: chapter must be 1..6`);
        if ('fade' in c && c.fade !== 'in' && c.fade !== 'out') out.push(`${where}: fade must be in/out`);
        if ('wait' in c && !(typeof c.wait === 'number' && c.wait >= 0 && c.wait <= 10000)) out.push(`${where}: wait must be 0..10000 ms`);
        if ('niska' in c && !isInt(c.niska)) out.push(`${where}: niska must be an integer`);
        // ── v0.5b (notes/v05b-plan.md §1) ──
        if ('smarana' in c) {
          if (typeof c.smarana !== 'string' || !c.smarana) out.push(`${where}: smarana needs a verse id`);
          else if (refs.shlokaIds.size > 0 && !refs.shlokaIds.has(c.smarana)) out.push(`${PENDING}${where}: smarana "${c.smarana}" is not in shlokas-*.json`);
          if (c.pada !== 'least' && !(isInt(c.pada) && c.pada >= 0 && c.pada <= 3)) out.push(`${where}: smarana pada must be 0..3 or "least"`);
        }
        if ('book' in c && !(isInt(c.book) && c.book >= 1 && c.book <= 6)) out.push(`${where}: book must be 1..6`);
        if ('setu' in c && (typeof c.setu !== 'string' || !c.setu.trim())) out.push(`${where}: setu needs a tag (a non-empty string)`);
        // ── v0.6 (notes/v06-wp0.md): the effects kit, hidden moments, told cutscenes, echoes ──
        out.push(...checkKitCmd(c, where, npcIds, refs));
      });
      // duplicate labels in one block
      const dupLabels = (cmds: EventCmd[], where: string): void => {
        const seenL = new Set<string>();
        for (const c of cmds) if (c && typeof c === 'object' && 'label' in c) {
          if (seenL.has(c.label)) out.push(`${where}: duplicate label "${c.label}"`);
          seenL.add(c.label);
        }
      };
      dupLabels(e.cmds, `${f.file} event ${e.id}`);
    }
  }
  return out;
}

/** v0.6: one kit / hotspot / cutscene / echo command (empty = fine). Positions: tiles; ids: npcs, "player" or props. */
export function checkKitCmd(c: EventCmd, where: string, npcIds: Set<string>, refs: Refs): string[] {
  const out: string[] = [];
  const pos = (p: unknown, what: string): void => {
    if (typeof p === 'string') return;
    if (!p || typeof p !== 'object' || !isInt((p as { x?: unknown }).x) || !isInt((p as { y?: unknown }).y)) out.push(`${where}: ${what} must be a tile {x, y} or a figure id`);
  };
  const target = (t: unknown, what: string, all: boolean): void => {
    if (all && t === 'all') return;
    const ok = (Array.isArray(t) && t.length > 0 && t.every((x) => typeof x === 'string')) || (!!t && typeof t === 'object' && !Array.isArray(t) && Array.isArray((t as { allBut?: unknown }).allBut) && (t as { allBut: unknown[] }).allBut.every((x) => typeof x === 'string'));
    if (!ok) out.push(`${where}: ${what} must be a list of ids or {"allBut": [ids]}${all ? ' or "all"' : ''}`);
  };
  const ms = (v: unknown): void => {
    if (v !== undefined && !(typeof v === 'number' && v >= 0 && v <= 20000)) out.push(`${where}: ms must be 0..20000`);
  };
  if ('fx' in c) {
    if (!KIT_FX.includes(c.fx)) out.push(`${where}: fx must be one of ${KIT_FX.join('/')}`);
    if (c.fx === 'tint' && !TINTS.includes(c.color ?? 'none')) out.push(`${where}: tint color must be one of ${TINTS.join('/')}`);
    if (c.fx !== 'tint' && c.color !== undefined) out.push(`${where}: only a tint has a color`);
    ms(c.ms);
  }
  if ('topple' in c) target(c.topple, 'topple', false);
  if ('rise' in c) target(c.rise, 'rise', true);
  if ('grow' in c) {
    if (typeof c.grow !== 'string' || (c.grow !== 'player' && !npcIds.has(c.grow))) out.push(`${where}: grow "${String(c.grow)}" is not "player" or an npc id`);
    if (!(typeof c.scale === 'number' && c.scale >= 0.5 && c.scale <= 4)) out.push(`${where}: grow scale must be 0.5..4`);
  }
  if ('glow' in c) {
    const g = c.glow;
    if (!g || !isInt(g.x) || !isInt(g.y) || (g.w !== undefined && !(isInt(g.w) && g.w >= 1)) || (g.h !== undefined && !(isInt(g.h) && g.h >= 1))) out.push(`${where}: glow must be {x, y, w?, h?} in tiles`);
    ms(c.ms);
  }
  if ('prop' in c) {
    if (typeof c.prop !== 'string' || !c.prop) out.push(`${where}: prop needs an id`);
    if (c.sprite !== undefined && !isPropSprite(c.sprite)) out.push(`${where}: prop sprite "${c.sprite}" is not a PROP_ID, TileId or SpriteId`);
    if (c.at !== undefined) pos(c.at, 'prop at');
    if (c.to !== undefined) pos(c.to, 'prop to');
    if (c.carry !== undefined && c.carry !== null && typeof c.carry !== 'string') out.push(`${where}: prop carry must be a figure id or null`);
    if (c.at === undefined && c.to === undefined && c.carry === undefined && !c.remove && c.sprite === undefined) out.push(`${where}: prop needs at, to, carry, sprite or remove`);
    ms(c.ms);
  }
  if ('arrow' in c) {
    const a = c.arrow;
    if (!a || typeof a !== 'object') out.push(`${where}: arrow needs {from, to, through?}`);
    else {
      pos(a.from, 'arrow from');
      pos(a.to, 'arrow to');
      if (a.through !== undefined && !Array.isArray(a.through)) out.push(`${where}: arrow through must be a list`);
      for (const t of a.through ?? []) pos(t, 'arrow through');
    }
    ms(c.ms);
  }
  if ('hotspot' in c) {
    if (!c.hotspot || !isInt(c.hotspot.x) || !isInt(c.hotspot.y)) out.push(`${where}: hotspot must be a tile {x, y}`);
    if (!Array.isArray(c.then) || c.then.length === 0) out.push(`${where}: a hotspot needs its "then" commands`);
    if (c.flag !== undefined && (typeof c.flag !== 'string' || !c.flag)) out.push(`${where}: hotspot flag must be a flag name`);
    ms(c.ms);
  }
  if ('cutscene' in c && refs.cutscenes && !refs.cutscenes.has(c.cutscene)) out.push(`${where}: cutscene "${c.cutscene}" is not a content/cutscene-*.json`);
  if ('echo' in c && refs.echoes && !refs.echoes.has(c.echo)) out.push(`${where}: echo "${c.echo}" is not in content/katha-echoes.json`);
  return out;
}

export function checkChapters(files: StoryFile[], refs: Refs): string[] {
  const out: string[] = [];
  const maps = allMaps(files);
  const kandas = new Map<number, string>();
  for (const f of files) {
    for (const c of f.chapters) {
      const where = `${f.file} chapter ${c.kanda}`;
      if (kandas.has(c.kanda)) out.push(`${where}: chapter defined twice (also in ${kandas.get(c.kanda)})`);
      kandas.set(c.kanda, f.file);
      if (c.nameId !== `kanda.${c.kanda}`) out.push(`${where}: nameId must be "kanda.${c.kanda}"`);
      const m = maps.get(c.startMap);
      if (!m) out.push(`${where}: startMap "${c.startMap}" does not exist`);
      else if (isSolidTile(m, c.startX, c.startY)) out.push(`${where}: start (${c.startX},${c.startY}) on ${c.startMap} is out of bounds or solid`);
      else if (fixedNpcAt(m, c.startX, c.startY)) out.push(`${where}: start (${c.startX},${c.startY}) is occupied by npc ${fixedNpcAt(m, c.startX, c.startY)}`);
      if (refs.shlokaIds.size > 0) {
        for (const id of [...(c.shlokaIds ?? []), c.keyShloka]) if (!refs.shlokaIds.has(id)) out.push(`${PENDING}${where}: shloka "${id}" is not in shlokas-*.json`);
      }
      if (!(c.shlokaIds ?? []).includes(c.keyShloka)) out.push(`${where}: keyShloka "${c.keyShloka}" must also be listed in shlokaIds`);
      const chMaps = [...maps.values()].filter((mm) => mm.kanda === c.kanda);
      if (chMaps.length > 0 && !chMaps.some(hasShrine)) out.push(`${where}: no map of kanda ${c.kanda} has a "shrine" tile (every chapter needs one)`);
      const shop = files.some((ff) =>
        ff.events.some((e) => {
          if (!e.id.startsWith(`ch${c.kanda}.`)) return false;
          let found = false;
          walkCmds(e.cmds, '', [], (cmd) => {
            if (cmd && typeof cmd === 'object' && 'shop' in cmd) found = true;
          });
          return found;
        }),
      );
      if (!shop) out.push(`${where}: no ch${c.kanda}.* event contains a {shop} command (every chapter needs a market)`);
    }
  }
  return out;
}

export function checkWalkthrough(files: StoryFile[], refs: Refs): string[] {
  const out: string[] = [];
  const maps = allMaps(files);
  const settable = new Set<string>();
  for (const f of files) {
    for (const m of f.maps) for (const t of m.triggers ?? []) if (t.once !== false) settable.add(`trig.${m.id}.${t.event}`);
    for (const e of f.events)
      walkCmds(e.cmds, '', [], (c) => {
        if (!c || typeof c !== 'object') return;
        if ('set' in c) settable.add(c.set);
        if ('shloka' in c) {
          settable.add(`heard.${c.shloka}`);
          settable.add(`restored.${c.shloka}`);
        }
        if ('choice' in c) for (const o of c.options ?? []) if (o.set) settable.add(o.set);
        // v0.6: a hidden moment's flag (default found.<event>) and an echo's flag
        if ('hotspot' in c) settable.add(c.flag ?? `found.${e.id}`);
        if ('echo' in c) settable.add(`echo.${c.echo}`);
      });
  }
  // v0.6: the flags a told cutscene sets (seen, its hotspots, its options)
  for (const t of CONTENT.cutscenes ?? []) {
    settable.add(toldFlag(t));
    for (const h of toldHotspots(t)) settable.add(toldHotspotFlag(t, h));
    for (const a of toldAsks(t)) for (const o of a.options) if (o.set) settable.add(o.set);
  }
  for (const f of files) {
    f.walkthrough.forEach((w, i) => {
      const where = `${f.file} walkthrough[${i}] (${JSON.stringify(w.action)} on ${w.map})`;
      const m = maps.get(w.map);
      if (!m) return void out.push(`${where}: map "${w.map}" does not exist`);
      const a = w.action as Record<string, unknown>;
      if ('talk' in a) {
        if (!(m.npcs ?? []).some((n) => n.id === a['talk'])) out.push(`${where}: npc "${String(a['talk'])}" is not on map ${w.map}`);
      } else if ('reach' in a) {
        const r = a['reach'] as { x: number; y: number };
        if (!r || isSolidTile(m, r.x, r.y)) out.push(`${where}: reach target is out of bounds or solid`);
      } else if ('recite' in a) {
        if (refs.shlokaIds.size > 0 && !refs.shlokaIds.has(String(a['recite']))) out.push(`${PENDING}${where}: recite "${String(a['recite'])}" is not in shlokas-*.json`);
        if (!hasShrine(m)) out.push(`${where}: map ${w.map} has no shrine tile to recite at`);
      } else out.push(`${where}: action must be {talk}, {reach} or {recite}`);
      if (w.style !== undefined && w.style !== 'katha') out.push(`${where}: style must be "katha" (a Kathā-only step) or absent (both journeys)`);
      if (typeof w.expectFlag !== 'string' || !w.expectFlag) out.push(`${where}: expectFlag is required`);
      else if (!settable.has(w.expectFlag)) out.push(`${where}: expectFlag "${w.expectFlag}" is never set by any {set}, choice option or once-trigger`);
      if (![1, 2, 3, 4, 5, 6].includes(w.chapter)) out.push(`${where}: chapter must be 1..6`);
    });
  }
  return out;
}

export function checkText(files: StoryFile[]): string[] {
  const out: string[] = [];
  for (const f of files) {
    for (const s of strings({ chapters: f.chapters, maps: f.maps, events: f.events, walkthrough: f.walkthrough }, f.file)) {
      if (DEVA.test(s.text)) out.push(`${s.path}: Devanagari in story text ("${s.text.slice(0, 40)}"). Use {w:lexId} / {n:nameId} markup instead`);
      else if (IAST.test(s.text)) out.push(`${s.path}: IAST diacritics in story text ("${s.text.slice(0, 40)}"). Write plain English (Rama, ashrama) or use {n:…}/{w:…} markup`);
    }
  }
  return out;
}

export function checkDefs(defs: Defs, refs: Refs): string[] {
  const out: string[] = [];
  const dup = (xs: { id: string }[], what: string): void => {
    const s = new Set<string>();
    for (const x of xs) {
      if (s.has(x.id)) out.push(`defs.json ${what} "${x.id}": duplicate id`);
      s.add(x.id);
    }
  };
  dup(defs.moves, 'move');
  dup(defs.allies, 'ally');
  dup(defs.enemies, 'enemy');
  dup(defs.items, 'item');
  const moves = new Set(defs.moves.map((m) => m.id));
  const items = new Set(defs.items.map((i) => i.id));
  const name = (id: string, where: string): void => {
    if (refs.nameIds.size > 0 && !refs.nameIds.has(id)) out.push(`${PENDING}${where}: nameId "${id}" is not in names.json`);
  };
  for (const m of defs.moves) {
    const w = `defs.json move ${m.id}`;
    name(m.nameId, w);
    if (!KINDS.has(m.challenge)) out.push(`${w}: challenge "${m.challenge}" is not a ChallengeKind`);
    if (!ELEMENTS.has(m.element)) out.push(`${w}: element "${m.element}" is not an Element`);
    if (!(m.pp > 0)) out.push(`${w}: pp must be > 0`);
    if (m.unlockShloka && refs.shlokaIds.size > 0 && !refs.shlokaIds.has(m.unlockShloka)) out.push(`${PENDING}${w}: unlockShloka "${m.unlockShloka}" is not in shlokas-*.json`);
  }
  for (const [list, what, canon] of [[defs.allies, 'ally', ALLIES], [defs.enemies, 'enemy', ENEMIES]] as const) {
    for (const c of list) {
      const w = `defs.json ${what} ${c.id}`;
      if (!canon.has(c.id)) out.push(`${w}: id is not in ${what === 'ally' ? 'ALLY_IDS' : 'ENEMY_IDS'}`);
      name(c.nameId, w);
      if (!BATTLERS.has(c.battler)) out.push(`${w}: battler "${c.battler}" is not a BATTLER_ID`);
      if (!ELEMENTS.has(c.element)) out.push(`${w}: element "${c.element}" is not an Element`);
      for (const mv of c.moves ?? []) if (!moves.has(mv.moveId)) out.push(`${w}: move "${mv.moveId}" is not in defs.json moves`);
      if (!(c.moves ?? []).some((mv) => mv.level <= 1 || (what === 'ally' && mv.level <= 3))) out.push(`${w}: needs at least one move at level ≤ ${what === 'ally' ? 3 : 1}`);
    }
  }
  for (const a of defs.allies) if (!SPRITES.has(a.overworld)) out.push(`defs.json ally ${a.id}: overworld "${a.overworld}" is not a SPRITE_ID`);
  for (const e of defs.enemies) {
    for (const d of e.drops ?? []) if (!items.has(d.itemId)) out.push(`defs.json enemy ${e.id}: drop "${d.itemId}" is not in defs.json items`);
    for (const id of e.restoresWords ?? []) if (refs.lexIds.size > 0 && !refs.lexIds.has(id)) out.push(`${PENDING}defs.json enemy ${e.id}: restoresWords "${id}" is not in the lexicon`);
  }
  for (const t of strings(defs, 'defs.json')) {
    if (DEVA.test(t.text) || IAST.test(t.text)) out.push(`${t.path}: Devanagari/IAST in defs text ("${t.text.slice(0, 40)}"). Use {n:…}/{w:…} markup`);
    for (const mm of t.text.matchAll(/\{n:([^}]*)\}/g)) if (refs.nameIds.size > 0 && !refs.nameIds.has(mm[1]!)) out.push(`${PENDING}${t.path}: {n:${mm[1]}} is not a names.json id`);
    for (const mm of t.text.matchAll(/\{w:([^}]*)\}/g)) if (refs.lexIds.size > 0 && !refs.lexIds.has(mm[1]!)) out.push(`${PENDING}${t.path}: {w:${mm[1]}} is not a lexicon id`);
  }
  for (const i of defs.items) {
    name(i.nameId, `defs.json item ${i.id}`);
    if (!['heal', 'pp', 'revive', 'buff', 'key'].includes(i.kind)) out.push(`defs.json item ${i.id}: kind "${i.kind}" is not valid`);
    if (!(i.price >= 0)) out.push(`defs.json item ${i.id}: price must be ≥ 0`);
  }
  return out;
}

// ───────────────────────── tests ─────────────────────────

const hasStory = FILES.some((f) => f.maps.length > 0 || f.events.length > 0 || f.chapters.length > 0);
const STRICT = process.env['RY_STRICT'] === '1' || FILES.filter((f) => f.file !== 'story-common.json').every((f) => f.maps.length > 0);
type T = { diagnostic: (msg: string) => void };
const report = (t: T, all: string[]): void => {
  const problems = STRICT ? all.map((p) => p.replace(PENDING, '')) : all.filter((p) => !p.startsWith(PENDING));
  if (!STRICT) for (const p of all.filter((x) => x.startsWith(PENDING)).slice(0, 40)) t.diagnostic(p);
  assert.ok(problems.length === 0, `${problems.length} problem(s):\n  - ${problems.slice(0, 60).join('\n  - ')}${problems.length > 60 ? `\n  … and ${problems.length - 60} more` : ''}`);
};

test('story maps: ids, rows, legend, tiles, music, names', (t) => {
  if (!hasStory) return void t.skip('no story content yet');
  report(t, checkMaps(FILES, REFS));
});

test('story placement: npcs, warps, triggers, signs in bounds and walkable', (t) => {
  if (!hasStory) return void t.skip('no story content yet');
  report(t, checkPlacement(FILES, REFS));
});

test('story events: ids, references, labels, commands and their ids', (t) => {
  if (!hasStory) return void t.skip('no story content yet');
  report(t, checkEvents(FILES, REFS));
});

test('story chapters: start positions, verses, a shrine and a market per chapter', (t) => {
  if (!FILES.some((f) => f.chapters.length > 0)) return void t.skip('no chapters yet');
  report(t, checkChapters(FILES, REFS));
});

test('story walkthrough: maps, npcs, targets and expectFlags exist', (t) => {
  if (!FILES.some((f) => f.walkthrough.length > 0)) return void t.skip('no walkthrough yet');
  report(t, checkWalkthrough(FILES, REFS));
});

test('story text: English only (no Devanagari / IAST; Sanskrit only via markup)', (t) => {
  if (!hasStory) return void t.skip('no story content yet');
  report(t, checkText(FILES));
});

test('defs.json: ids, moves, battlers, items, names', (t) => {
  if (DEFS.moves.length + DEFS.allies.length + DEFS.enemies.length + DEFS.items.length === 0) return void t.skip('defs.json is empty');
  report(t, checkDefs(DEFS, REFS));
});

test('validator self-test (v0.5b): P1/P2/P5 commands outside a Kathā block, bad arguments, open avoid-triggers and step styles are reported', () => {
  const map: MapDef = {
    id: 'm1', nameId: 'place.m1', kanda: 1, width: 4, height: 3, legend: { '.': 'grass', S: 'shrine' }, ground: ['S...', '....', '....'], music: 'ashrama', battleBg: 'ashrama',
    npcs: [], warps: [],
    triggers: [
      { x: 1, y: 1, w: 1, h: 1, event: 'ch1.e', once: false, avoid: true },
      { x: 2, y: 1, w: 1, h: 1, event: 'ch1.e', once: false, avoid: true, requires: 'style.katha&!ch1.done' },
    ],
  };
  const cmds = [
    { smarana: 's-x', pada: 0 },
    { book: 1 },
    { setu: 'nala' },
    { if: 'style.katha', then: [{ smarana: 's-x', pada: 'least' }, { book: 2 }, { setu: '6.22' }, { smarana: 's-x', pada: 7 }, { book: 9 }, { setu: '' }] },
    { if: '!style.katha', then: [{ book: 3 }], else: [{ book: 4 }] },
    { if: 'style.katha&ch1.x', then: [{ if: 'ch1.y', then: [{ setu: 'deep' }] }] },
    { shop: ['phala'] },
  ] as unknown as EventCmd[];
  const f: StoryFile = {
    file: 'story-v05b.json',
    chapters: [],
    maps: [map],
    events: [{ id: 'ch1.e', cmds }],
    walkthrough: [
      { chapter: 1, map: 'm1', action: { reach: { x: 3, y: 2 } }, expectFlag: 'trig.m1.ch1.e', style: 'katha' },
      { chapter: 1, map: 'm1', action: { reach: { x: 3, y: 2 } }, expectFlag: 'trig.m1.ch1.e', style: 'practice' as never },
    ],
  };
  const refs: Refs = { defs: { moves: [], allies: [], enemies: [], items: [] }, shlokaIds: new Set(['s-x']), lexIds: new Set(), nameIds: new Set() };
  const all = [...checkPlacement([f], refs), ...checkEvents([f], refs), ...checkWalkthrough([f], refs)];
  const at = (path: string, what: string): boolean => all.some((p) => p.includes(path) && p.includes(what));
  for (const [i, k] of [[0, 'smarana'], [1, 'book'], [2, 'setu']] as const) assert.ok(at(`cmds[${i}]:`, `{${k}} is Kathā only`), `cmds[${i}] {${k}} outside a Kathā block: ${all.join('\n')}`);
  assert.ok(at('cmds[4].then[0]', '{book} is Kathā only'), 'the then of a practice-only block is the practice journey');
  assert.ok(!at('cmds[4].else[0]', 'Kathā only'), 'the else of a practice-only block is Kathā');
  for (const i of [0, 1, 2]) assert.ok(!at(`cmds[3].then[${i}]`, ''), `a well-formed Kathā command is fine (then[${i}])`);
  assert.ok(!at('cmds[5].then[0].then[0]', ''), 'a Kathā block nested in another if is still Kathā');
  assert.ok(at('cmds[3].then[3]', 'smarana pada must be 0..3 or "least"'));
  assert.ok(at('cmds[3].then[4]', 'book must be 1..6'));
  assert.ok(at('cmds[3].then[5]', 'setu needs a tag'));
  assert.ok(at('trigger ch1.e at (1,1)', 'its requires must include style.katha'), 'an avoid-trigger outside Kathā');
  assert.ok(!at('trigger ch1.e at (2,1)', 'style.katha'), 'a Kathā avoid-trigger is fine');
  assert.ok(at('walkthrough[1]', 'style must be "katha"'));
  assert.ok(!at('walkthrough[0]', 'style'), 'style: katha is a valid step');
});

test('validator self-test (v0.6): the effects kit, hotspots, cutscenes and echoes outside a Kathā block, bad arguments, unknown cutscene / echo ids and open hidden spots are reported', () => {
  const map: MapDef = {
    id: 'm1', nameId: 'place.m1', kanda: 1, width: 4, height: 3, legend: { '.': 'grass', S: 'shrine' }, ground: ['S...', '....', '....'], music: 'ashrama', battleBg: 'ashrama',
    npcs: [{ id: 'sage', sprite: 'rishi', x: 2, y: 2, facing: 'down', event: 'ch1.e' }], warps: [], triggers: [],
    spots: [
      { x: 1, y: 1, event: 'ch1.e', requires: 'ch1.x', glow: true },
      { x: 3, y: 1, event: 'ch1.e', requires: 'style.katha&!ch1.spot' },
    ],
  };
  const good = [
    { fx: 'shake', ms: 900 }, { fx: 'tint', color: 'gold' }, { topple: { allBut: ['sage'] } }, { rise: 'all' }, { grow: 'sage', scale: 2 },
    { glow: { x: 1, y: 1, w: 2 } }, { prop: 'p', sprite: 'log', at: { x: 1, y: 1 } }, { prop: 'p', carry: 'sage' }, { arrow: { from: 'player', to: { x: 3, y: 0 }, through: ['sage'] } },
    { hotspot: { x: 1, y: 1 }, then: [{ say: 'found' }], flag: 'ch1.found' }, { cutscene: 'mithila' }, { echo: 'twice' },
  ];
  const bad = [
    { fx: 'boom' }, { fx: 'tint', color: 'pink' }, { topple: 'sage' }, { grow: 'nobody', scale: 9 }, { glow: { x: 'a', y: 1 } },
    { prop: 'p', sprite: 'not-a-sprite', at: { x: 1, y: 1 } }, { prop: 'p' }, { arrow: { from: 7, to: { x: 1, y: 1 } } }, { hotspot: { x: 1, y: 1 }, then: [] }, { cutscene: 'nope' }, { echo: 'nope' },
  ];
  const cmds = [{ topple: ['player'] }, { cutscene: 'mithila' }, { if: 'style.katha', then: [...good, ...bad] }] as unknown as EventCmd[];
  const f: StoryFile = { file: 'story-v06.json', chapters: [], maps: [map], events: [{ id: 'ch1.e', cmds }], walkthrough: [] };
  const refs: Refs = { defs: { moves: [], allies: [], enemies: [], items: [] }, shlokaIds: new Set(), lexIds: new Set(), nameIds: new Set(), cutscenes: new Set(['mithila']), echoes: new Set(['twice']) };
  const all = [...checkPlacement([f], refs), ...checkEvents([f], refs)];
  const at = (path: string, what: string): boolean => all.some((p) => p.includes(path) && p.includes(what));
  assert.ok(at('cmds[0]:', '{topple} is Kathā only'), all.join('\n'));
  assert.ok(at('cmds[1]:', '{cutscene} is Kathā only'));
  for (let i = 0; i < good.length; i++) assert.ok(!at(`cmds[2].then[${i}]:`, ''), `a well-formed Kathā command is fine (then[${i}] ${JSON.stringify(good[i])}): ${all.filter((p) => p.includes(`then[${i}]:`)).join(' | ')}`);
  assert.ok(!at('cmds[2].then[9].then[0]', ''), "a hotspot's then is walked (and Kathā)");
  const n = good.length;
  for (const [k, what] of [[0, 'fx must be'], [1, 'tint color'], [2, 'topple must be'], [3, 'grow "nobody"'], [3, 'scale must be'], [4, 'glow must be'], [5, 'not a PROP_ID'], [6, 'prop needs'], [7, 'arrow from'], [8, 'needs its "then"'], [9, 'cutscene "nope"'], [10, 'echo "nope"']] as const) assert.ok(at(`cmds[2].then[${n + k}]`, what), `${what}: ${all.join('\n')}`);
  assert.ok(at('spot at (1,1)', 'requires must include style.katha'), 'an open hidden spot');
  assert.ok(!at('spot at (3,1)', 'style.katha'), 'a Kathā spot is fine');
});

test('validator self-test: a broken fixture yields precise messages', () => {
  const bad: StoryFile = {
    file: 'story-test.json',
    chapters: [{ kanda: 1, nameId: 'kanda.1', summary: 'x', startMap: 'm1', startX: 0, startY: 0, shlokaIds: [], keyShloka: 's-x' }],
    maps: [
      {
        id: 'm1',
        nameId: 'place.m1',
        kanda: 1,
        width: 4,
        height: 3,
        legend: { '.': 'grass', '#': 'tree', 'q': 'nope' as never },
        ground: ['#...', '.....', '..Z.'],
        music: 'ashrama',
        battleBg: 'ashrama',
        npcs: [{ id: 'a', sprite: 'valmiki', x: 9, y: 0, facing: 'down', event: 'ch1.missing' }],
        warps: [{ x: 1, y: 0, to: 'nowhere', tx: 0, ty: 0 }],
        triggers: [],
      },
    ],
    events: [{ id: 'ch1.e', cmds: [{ goto: 'nolabel' }, { say: 'Hello R\u0101ma' }, { if: 'f', then: [{ label: 'in' }] }, { goto: 'in' }] }],
    walkthrough: [{ chapter: 1, map: 'm1', action: { talk: 'zz' }, expectFlag: 'never.set' }],
  };
  const refs: Refs = { defs: { moves: [], allies: [], enemies: [], items: [] }, shlokaIds: new Set(), lexIds: new Set(), nameIds: new Set() };
  const all = [...checkMaps([bad], refs), ...checkPlacement([bad], refs), ...checkEvents([bad], refs), ...checkChapters([bad], refs), ...checkWalkthrough([bad], refs), ...checkText([bad])];
  const expect = [
    'story-test.json map m1 row 1 has 5 chars, expected 4',
    'story-test.json map m1 row 2 col 2: char "Z" is not in the legend',
    'legend "q" → "nope" is not a TILE_ID',
    'npc a at (9,0) is out of bounds',
    'target map "nowhere" does not exist',
    'references event "ch1.missing", which does not exist',
    'goto "nolabel" has no matching {label}',
    'cmds[3]: goto "in" has no matching {label}',
    'IAST diacritics in story text',
    'start (0,0) on m1 is out of bounds or solid',
    'no ch1.* event contains a {shop} command',
    'npc "zz" is not on map m1',
    'expectFlag "never.set" is never set',
  ];
  for (const e of expect) assert.ok(all.some((p) => p.includes(e)), `expected a problem containing: ${e}\n got:\n  ${all.join('\n  ')}`);
});
