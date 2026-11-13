/**
 * Storage abstraction. Everything persisted goes through a {@link KV} so the same code runs in
 * the browser (localStorage), in tests (memory) and later in a native wrapper or a synced backend.
 */
import type { GameStore } from './types';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export function memoryKV(initial: Record<string, string> = {}): KV {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    keys: () => [...map.keys()],
  };
}

/** localStorage-backed KV that silently degrades to memory when storage is unavailable (private mode, quota). */
export function browserKV(): KV {
  const fallback = memoryKV();
  let ls: Storage | null = null;
  try {
    ls = globalThis.localStorage ?? null;
    if (ls) {
      ls.setItem('samskuru:probe', '1');
      ls.removeItem('samskuru:probe');
    }
  } catch {
    ls = null;
  }
  if (!ls) return fallback;
  const store = ls;
  // `fallback` holds values whose write to localStorage failed after start-up (quota). They take
  // precedence on read, otherwise a failed write would silently hand back the older stored value.
  return {
    getItem: (k) => {
      const pending = fallback.getItem(k);
      if (pending !== null) return pending;
      try {
        return store.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      try {
        store.setItem(k, v);
        fallback.removeItem(k);
      } catch {
        fallback.setItem(k, v);
      }
    },
    removeItem: (k) => {
      fallback.removeItem(k);
      try {
        store.removeItem(k);
      } catch {
        /* nothing more to do: the in-memory copy is already gone */
      }
    },
    keys: () => {
      const out = new Set<string>(fallback.keys());
      try {
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (k !== null) out.add(k);
        }
      } catch {
        /* enumeration blocked: report what we hold in memory */
      }
      return [...out];
    },
  };
}

export const ROOT_PREFIX = 'samskuru:v1:';

export function readJson<T>(kv: KV, key: string, fallback: T): T {
  const raw = kv.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(kv: KV, key: string, value: unknown): void {
  kv.setItem(key, JSON.stringify(value));
}

/** Per-game namespaced store handed to games as `ctx.store`. */
export function gameStore(kv: KV, gameId: string): GameStore {
  const prefix = `${ROOT_PREFIX}game:${gameId}:`;
  return {
    get: <T>(key: string, fallback: T): T => readJson(kv, prefix + key, fallback),
    set: <T>(key: string, value: T): void => writeJson(kv, prefix + key, value),
    remove: (key: string): void => kv.removeItem(prefix + key),
  };
}
