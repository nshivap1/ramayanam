import { createContext, useContext } from 'react';
import type { Settings } from '@sdk';
import { DEFAULT_SETTINGS } from '@sdk';

/** Current user settings (script, sound, motion…). Provided by the shell; safe default for tests. */
export const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);

export function useSettings(): Settings {
  return useContext(SettingsContext);
}

/**
 * True while the shell has covered the game (help sheet, "leave?" sheet) or the page is hidden.
 * `useRafLoop`, `useCountdown` and `useInterval` honour it automatically; read it with
 * {@link usePaused} if you run your own timers.
 */
export const PauseContext = createContext<boolean>(false);

export function usePaused(): boolean {
  return useContext(PauseContext);
}
