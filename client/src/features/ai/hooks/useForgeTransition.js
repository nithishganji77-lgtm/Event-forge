import { useCallback, useEffect, useRef, useState } from 'react';

// Long enough that an instant answer (the status is cached for minutes) doesn't flash the AI layer
// on and off; never used to decide anything. The request's own settle does that.
export const MIN_VISIBLE_MS = 1000;

// Whether ForgeAI's opening layer is up, kept apart from request state on purpose: the query owns
// the answer, this only owns the visual.
//
//   begin(element) -> processing, until settle() and at least MIN_VISIBLE_MS have both passed
//
// `origin` is where the layer opens from: the centre of the element that started it, plus the
// radius that reaches the farthest viewport corner, so the wipe always covers the screen.
export function useForgeTransition() {
  const [processing, setProcessing] = useState(false);
  const [origin, setOrigin] = useState(null);
  const startedAt = useRef(0);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const begin = useCallback((element) => {
    clearTimeout(timer.current);
    const rect = element?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const radius = Math.max(
      Math.hypot(x, y),
      Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(window.innerWidth - x, window.innerHeight - y)
    );
    setOrigin({ x, y, radius });
    startedAt.current = performance.now();
    setProcessing(true);
  }, []);

  const settle = useCallback(() => {
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt.current));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setProcessing(false), wait);
  }, []);

  return { processing, origin, begin, settle };
}
