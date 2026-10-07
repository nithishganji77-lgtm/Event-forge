import { useCallback, useEffect, useRef, useState } from 'react';

// Long enough that a cached answer (~50 ms) doesn't flash the AI layer on and off; never used to
// decide when a result exists. That is still the request's own settle.
export const MIN_VISIBLE_MS = 1000;

// Visual state for the draft hand-off, kept apart from the request state on purpose: the mutation
// owns data and errors, this only owns whether the AI layer is up.
//
//   idle -> processing (begin) -> done (settle, after at least MIN_VISIBLE_MS)
//
// `origin` is where the layer opens from: the centre of the button that started it, plus the radius
// that reaches the farthest viewport corner, so the wipe always covers the screen.
export function useForgeTransition() {
  const [phase, setPhase] = useState('idle');
  const [outcome, setOutcome] = useState(null);
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
    setOutcome(null);
    startedAt.current = performance.now();
    setPhase('processing');
  }, []);

  const settle = useCallback((result) => {
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt.current));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setOutcome(result);
      setPhase('done');
    }, wait);
  }, []);

  return { phase, outcome, origin, processing: phase === 'processing', begin, settle };
}
