import { useEffect, useState } from 'react';

/** Hash routing keeps the app a pure static site (works from any sub-path, file wrappers and Capacitor). */
export interface Route {
  /** Path segments after `#/`, e.g. ['play', 'pada-wordle']. */
  path: string[];
  query: Record<string, string>;
}

/** decodeURIComponent that keeps an undecodable segment verbatim instead of throwing (a hand-edited link must not blank the app). */
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [p = '', q = ''] = raw.split('?');
  const query: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(q)) query[k] = v;
  return { path: p.split('/').filter(Boolean).map(safeDecode), query };
}

export function buildHash(path: string[], query: Record<string, string | number | undefined> = {}): string {
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `#/${path.map(encodeURIComponent).join('/')}${qs ? `?${qs}` : ''}`;
}

// The current route is kept in memory as well as in location.hash, so the app still navigates in
// hosts that freeze or sanitise the hash (embedded frames, some webviews).
let current: Route | null = null;
const listeners = new Set<(r: Route) => void>();

function readLocation(): Route {
  try {
    return parseHash(window.location.hash);
  } catch {
    return { path: [], query: {} };
  }
}

function setRoute(route: Route): void {
  current = route;
  for (const l of listeners) l(route);
}

export function currentRoute(): Route {
  return (current ??= readLocation());
}

export function navigate(path: string[], query: Record<string, string | number | undefined> = {}, replace = false): void {
  const hash = buildHash(path, query);
  setRoute(parseHash(hash));
  try {
    if (replace) window.history.replaceState(null, '', hash);
    else window.location.hash = hash;
  } catch {
    /* hash is not writable here — in-memory routing still works */
  }
}

let wired = false;
function wire(): void {
  if (wired) return;
  wired = true;
  window.addEventListener('hashchange', () => {
    const next = readLocation();
    if (buildHash(next.path, next.query) !== buildHash(currentRoute().path, currentRoute().query)) setRoute(next);
  });
  // In-app links (<a href="#/...">) route in memory first, so they work even where the hash cannot change.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href^="#/"]');
    if (!a) return;
    e.preventDefault();
    const r = parseHash(a.getAttribute('href') ?? '');
    navigate(r.path, r.query);
  });
}

export function useRoute(): Route {
  const [route, setLocal] = useState<Route>(() => currentRoute());
  useEffect(() => {
    wire();
    listeners.add(setLocal);
    setLocal(currentRoute());
    return () => {
      listeners.delete(setLocal);
    };
  }, []);
  return route;
}
