/**
 * Interface strings in English and Sambhāṣaṇa-Saṃskṛtam (OWNER: orchestrator). PURE: no DOM, no I/O.
 *
 * Every button, label, hint and toast has a stable key in content/sa-ui-*.json:
 *   "entries": { "shop.title": { "en": "Market stall", "sa": "आपणः", "label": true, "ctx": "shop heading" } }
 * Slots are written {$name} in both languages and filled by fillSlots():
 *   number           → "12" in English, "१२" in Sanskrit (SaText turns Devanagari digits back for Roman script)
 *   string           → inserted as-is in both languages (story markup is fine: "{w:rama}", "{player}")
 *   { en, sa }       → the matching language (sa: Devanagari, may use {g:masc|fem})
 * Views use view-ui.tsx (useUi / <Ui>); logic uses uiToast() so a toast carries `textSa`.
 * sa-ui.test.ts verifies every Sanskrit word with the oracle (sa-verify.ts) and checks slots match.
 * Rules and glossary: notes/sa-ui.md.
 */
import { toDevaDigits } from '@sanskrit';
import type { Fx, GameContent, UiEntry } from './types';

export type UiSlot = number | string | { en: string; sa: string };
export type UiSlots = Record<string, UiSlot>;

export const SLOT_RE = /\{\$([A-Za-z0-9_]+)\}/g;

/** Fill {$name} slots of one language's template (a missing slot becomes ''). */
export function fillSlots(tpl: string, slots: UiSlots | undefined, lang: 'en' | 'sa'): string {
  if (!tpl.includes('{$')) return tpl;
  return tpl.replace(SLOT_RE, (_m, name: string) => {
    const v = slots?.[name];
    if (v === undefined) return '';
    if (typeof v === 'number') return lang === 'sa' ? toDevaDigits(String(v)) : String(v);
    if (typeof v === 'string') return v;
    return lang === 'sa' ? v.sa : v.en;
  });
}

/** Slot names used by a template, sorted (for the en/sa consistency check). */
export function slotNames(tpl: string): string[] {
  return [...new Set([...tpl.matchAll(SLOT_RE)].map((m) => m[1] ?? ''))].sort();
}

export function uiEntry(content: GameContent, key: string): UiEntry | undefined {
  return content.ui?.[key];
}

/** English text of a key with its slots filled (the key itself when unknown, so a gap is visible in tests). */
export function uiEn(content: GameContent, key: string, slots?: UiSlots): string {
  const e = uiEntry(content, key);
  return e ? fillSlots(e.en, slots, 'en') : key;
}

/** Sanskrit text of a key with its slots filled, or undefined when it has no translation. */
export function uiSa(content: GameContent, key: string, slots?: UiSlots): string | undefined {
  const e = uiEntry(content, key);
  const sa = e?.sa?.trim();
  return sa ? fillSlots(sa, slots, 'sa') : undefined;
}

/** A toast Fx in both languages: `text` English (unchanged for tests), `textSa` the Sambhāṣaṇa version. */
export function uiToast(content: GameContent, key: string, slots?: UiSlots): Extract<Fx, { kind: 'toast' }> {
  const textSa = uiSa(content, key, slots);
  return textSa ? { kind: 'toast', text: uiEn(content, key, slots), textSa } : { kind: 'toast', text: uiEn(content, key, slots) };
}
