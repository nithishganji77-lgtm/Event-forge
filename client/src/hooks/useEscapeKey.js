import { useEffect } from 'react';

export function useEscapeKey(active, onEscape) {
  useEffect(() => {
    if (!active) return;

    function onKeyDown(event) {
      if (event.key === 'Escape') onEscape();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, onEscape]);
}
