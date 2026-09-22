import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Traps Tab within containerRef while active, moves focus in on activation, and restores focus to
// whatever was focused beforehand once active flips back to false (or the component unmounts).
export function useFocusTrap(containerRef, active) {
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current = document.activeElement;

    function onKeyDown(event) {
      if (event.key !== 'Tab') return;
      const focusable = containerRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    containerRef.current?.querySelector(FOCUSABLE_SELECTOR)?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [active, containerRef]);
}
