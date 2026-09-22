import { useEffect, useRef } from 'react';
import { LottieLight } from 'lottie-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn.js';
import loadingAnimation from '../../assets/loading.json';

// LottieLight, not the full Lottie build — this animation is a plain shape tween with no AE
// expressions (confirmed: zero "expression" references in loading.json), so the light SVG-only
// renderer is a strict downgrade in bundle size with no feature loss, and matters here specifically
// because Spinner loads on nearly every route's Suspense fallback.
//
// autoplay is a load-time prop for this component (per its own docs) — it's read once at mount,
// not reactively, so `autoplay={!reduceMotion}` looks right but silently does nothing once
// useReducedMotion() resolves after that first render (it starts as null pre-mount, framer-motion's
// SSR-safe default). Confirmed via a throttled-network Playwright check: the animation kept playing
// under prefers-reduced-motion with the naive prop-only version. Fixed by always autoplaying
// declaratively, then imperatively stopping via lottieRef the moment reduceMotion resolves true —
// same "freeze, don't remove" convention as every other animation in the app. Note: the imperative
// handle comes through the `lottieRef` prop specifically, not the standard `ref` (which this
// component instead forwards to the rendered DOM element) — passing the handle as `ref` compiles
// fine but throws at runtime the moment anything calls a method on it, since a DOM node has no
// `.stop()`. That crashed the whole app under reduced motion (React Router's error boundary took
// over every route) until caught by testing this specific path, not just the happy one.
export function Spinner({ className, label = 'Loading' }) {
  const reduceMotion = useReducedMotion();
  const lottieRef = useRef(null);

  useEffect(() => {
    if (reduceMotion) lottieRef.current?.stop();
  }, [reduceMotion]);

  return (
    <div role="status" className={cn('flex items-center justify-center py-12', className)}>
      <LottieLight
        lottieRef={lottieRef}
        src={loadingAnimation}
        loop
        autoplay
        className="size-16"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
