import { useSyncExternalStore } from 'react';
import {
  getThemePreference,
  getResolvedTheme,
  setThemePreference,
  subscribeTheme,
} from '../lib/theme.js';

// 'light' | 'dark' | 'system' — what the user picked.
export function useThemePreference() {
  return [useSyncExternalStore(subscribeTheme, getThemePreference), setThemePreference];
}

// 'light' | 'dark' — what is actually showing. Use this for anything that can't follow CSS
// variables on its own (chart marks, the toast library).
export function useResolvedTheme() {
  return useSyncExternalStore(subscribeTheme, getResolvedTheme);
}
