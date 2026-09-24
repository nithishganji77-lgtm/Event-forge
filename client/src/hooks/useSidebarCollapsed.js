import { useCallback, useState } from 'react';

const STORAGE_KEY = 'ef-sidebar-collapsed';

function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false; // storage blocked — start expanded, the choice just won't persist
  }
}

// Desktop-only icon-rail mode for the sidebar, remembered across visits. The mobile drawer never
// uses it (it's an overlay, there is nothing to reclaim).
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readStored);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // see readStored
      }
      return next;
    });
  }, []);

  return [collapsed, toggle];
}
