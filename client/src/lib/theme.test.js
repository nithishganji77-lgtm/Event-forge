import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Node's experimental built-in localStorage (printed as "--localstorage-file was provided without
// a valid path" on every run) shadows jsdom's and has no clear()/working methods here, so tests
// install a plain in-memory Storage instead of relying on whichever one the runtime exposes.
function installStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  const storage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
  vi.stubGlobal('localStorage', storage);
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
  return storage;
}

// The module keeps its preference in module state read from localStorage at import time, so each
// test sets storage first and imports a fresh copy.
async function loadTheme() {
  vi.resetModules();
  return import('./theme.js');
}

function mockSystemDark(matches) {
  const listeners = new Set();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: (_event, cb) => listeners.add(cb),
    removeEventListener: (_event, cb) => listeners.delete(cb),
  }));
  return listeners;
}

let storage;

beforeEach(() => {
  storage = installStorage();
  document.documentElement.removeAttribute('data-theme');
  mockSystemDark(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('theme preference', () => {
  it('defaults to "system" when nothing is saved and follows the OS', async () => {
    const theme = await loadTheme();
    expect(theme.getThemePreference()).toBe('system');
    expect(theme.getResolvedTheme()).toBe('light');

    mockSystemDark(true);
    expect(theme.getResolvedTheme()).toBe('dark');
  });

  it('restores a saved choice at load', async () => {
    storage.setItem('ef-theme', 'dark');
    const theme = await loadTheme();
    expect(theme.getThemePreference()).toBe('dark');
    expect(theme.getResolvedTheme()).toBe('dark');
  });

  it('ignores a corrupt saved value', async () => {
    storage.setItem('ef-theme', 'purple');
    const theme = await loadTheme();
    expect(theme.getThemePreference()).toBe('system');
  });

  it('forcing a theme sets data-theme, persists it, and beats the OS setting', async () => {
    mockSystemDark(true);
    const theme = await loadTheme();

    theme.setThemePreference('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(storage.getItem('ef-theme')).toBe('light');
    expect(theme.getResolvedTheme()).toBe('light'); // OS says dark, the choice wins
  });

  it('"system" removes the attribute and the saved value', async () => {
    const theme = await loadTheme();
    theme.setThemePreference('dark');
    theme.setThemePreference('system');

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(storage.getItem('ef-theme')).toBeNull();
  });

  it('still applies the theme when storage is unavailable', async () => {
    const theme = await loadTheme();
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(() => theme.setThemePreference('dark')).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('subscribeTheme', () => {
  it('notifies on a preference change and stops after unsubscribe', async () => {
    const theme = await loadTheme();
    const listener = vi.fn();
    const unsubscribe = theme.subscribeTheme(listener);

    theme.setThemePreference('dark');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    theme.setThemePreference('light');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies when the OS theme flips', async () => {
    const osListeners = mockSystemDark(false);
    const theme = await loadTheme();
    const listener = vi.fn();
    theme.subscribeTheme(listener);

    osListeners.forEach((cb) => cb());
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
