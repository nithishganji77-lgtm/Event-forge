import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebarCollapsed } from './useSidebarCollapsed.js';

// See lib/theme.test.js: Node's experimental built-in localStorage shadows jsdom's here, so tests
// install a plain in-memory Storage.
function installStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  const storage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
  vi.stubGlobal('localStorage', storage);
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
  return storage;
}

let storage;
beforeEach(() => {
  storage = installStorage();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useSidebarCollapsed', () => {
  it('starts expanded when nothing is saved', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current[0]).toBe(false);
  });

  it('toggles and remembers the choice', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(storage.getItem('ef-sidebar-collapsed')).toBe('1');

    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    expect(storage.getItem('ef-sidebar-collapsed')).toBe('0');
  });

  it('restores a saved collapsed state on the next visit', () => {
    installStorage({ 'ef-sidebar-collapsed': '1' });
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current[0]).toBe(true);
  });

  it('still toggles when storage is unavailable', () => {
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(() => act(() => result.current[1]())).not.toThrow();
    expect(result.current[0]).toBe(true);
  });
});
