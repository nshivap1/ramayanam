/**
 * SLP1 helpers used only by the nominal content generators / verifiers (never shipped to the app).
 * All oracle data is normalised into one comparable SLP1 spelling before set comparison.
 */

const VOWELS = 'aAiIuUfFxXeEoO';
/** Sounds that may stand between the trigger (r f F z) and n without blocking ṇatva: aṭ (vowels, h y v r), ku, pu, anusvāra (8.4.2). */
const NATVA_TRANSPARENT = new Set([...VOWELS, ...'hyvr', ...'kKgGN', ...'pPbBm', 'M']);
const NATVA_TRIGGER = new Set(['r', 'f', 'F', 'z']);
/** n is retroflexed only when followed by a vowel or n m y v (it is never changed word-finally or before a stop; 8.4.37). */
const NATVA_FOLLOW = new Set([...VOWELS, ...'nmyv']);

/** Does position `i` (an `n`) in `w` satisfy the ṇatva condition (raṣābhyāṃ no ṇaḥ samānapade, aṭkupvāṅnumvyavāye'pi)? */
export function natvaApplies(w: string, i: number): boolean {
  const next = w.charAt(i + 1);
  if (next === '' || !NATVA_FOLLOW.has(next)) return false;
  for (let j = i - 1; j >= 0; j--) {
    const c = w.charAt(j);
    if (NATVA_TRIGGER.has(c)) return true;
    if (!NATVA_TRANSPARENT.has(c)) return false;
  }
  return false;
}

/** Applies ṇatva left to right to every dental n of an SLP1 word. */
export function natva(w: string): string {
  let out = w;
  for (let i = 0; i < out.length; i++) {
    if (out.charAt(i) === 'n' && natvaApplies(out, i)) out = out.slice(0, i) + 'R' + out.slice(i + 1);
  }
  return out;
}

/** Applies ṇatva only to dental n at index >= `from` (i.e. inside the inflectional part), leaving the stem untouched. */
export function natvaFrom(w: string, from: number): string {
  let out = w;
  for (let i = Math.max(0, from); i < out.length; i++) {
    if (out.charAt(i) === 'n' && natvaApplies(out, i)) out = out.slice(0, i) + 'R' + out.slice(i + 1);
  }
  return out;
}

/** Would an inflectional `n` directly after this stem (e.g. -ena, -AnAm, -inA) be retroflexed? */
export function stemTriggersNatva(stem: string): boolean {
  const probe = stem.replace(/[aAiIuUfF]$/, '') + 'ena';
  return natvaApplies(probe, probe.length - 2);
}

const CLASS_NASAL: Record<string, string> = {
  k: 'N', K: 'N', g: 'N', G: 'N',
  c: 'Y', C: 'Y', j: 'Y', J: 'Y',
  w: 'R', W: 'R', q: 'R', Q: 'R',
  t: 'n', T: 'n', d: 'n', D: 'n',
  p: 'm', P: 'm', b: 'm', B: 'm',
};

/** anusvāra before a stop → class nasal (parasavarṇa spelling used throughout Samskuru). */
export function classNasal(w: string): string {
  return w.replace(/M(?=([kKgGcCjJwWqQtTdDpPbB]))/g, (_m, stop: string) => CLASS_NASAL[stop] ?? 'M');
}

/** Pausa spelling of a word-final s / r: visarga. */
export function finalVisarga(w: string): string {
  return w.replace(/[sr]$/, 'H');
}

/** Canonical comparable spelling of one inflected form (SLP1). */
export function canon(w: string): string {
  return classNasal(finalVisarga(w.trim()));
}

/** A word-final voiced stop that is merely the pre-voiced sandhi variant of the listed pausa form (रामाद् ~ रामात्, वाग् ~ वाक्). */
export function devoicedFinal(w: string): string | undefined {
  const map: Record<string, string> = { d: 't', g: 'k', b: 'p', q: 'w' };
  const last = w.slice(-1);
  const r = map[last];
  return r ? w.slice(0, -1) + r : undefined;
}
