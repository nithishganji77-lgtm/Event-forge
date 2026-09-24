// Light / dark / system theme. "system" means no data-theme attribute at all, which lets the
// prefers-color-scheme media query in globals.css decide; "light"/"dark" force it. The choice is
// persisted in localStorage and re-applied before first paint by the inline script in index.html
// (this module then keeps the attribute, storage and subscribers in sync after that).

const STORAGE_KEY = 'ef-theme';
const listeners = new Set();
let preference = readStoredPreference();

function readStoredPreference() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system'; // storage blocked (private mode, disabled) — the choice just won't persist
  }
}

function systemPrefersDark() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getThemePreference() {
  return preference;
}

// What is actually on screen: the forced theme, or whatever the OS says for "system".
export function getResolvedTheme() {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemPrefersDark() ? 'dark' : 'light';
}

export function setThemePreference(next) {
  preference = next === 'light' || next === 'dark' ? next : 'system';

  const root = document.documentElement;
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);

  try {
    if (preference === 'system') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // see readStoredPreference
  }

  listeners.forEach((listener) => listener());
}

// useSyncExternalStore-compatible. Also fires when the OS theme flips, so anything that reads the
// resolved theme while the preference is "system" re-renders.
export function subscribeTheme(listener) {
  listeners.add(listener);
  const media =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  media?.addEventListener?.('change', listener);

  return () => {
    listeners.delete(listener);
    media?.removeEventListener?.('change', listener);
  };
}
