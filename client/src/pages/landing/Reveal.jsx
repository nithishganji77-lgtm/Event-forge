import { motion, useReducedMotion } from 'framer-motion';

// Every section on this scroll-cinematic page needs the same scroll-triggered fade+slide-up,
// gated by reduced motion — shared here rather than repeated per section (6+ real consumers).
// `once: false` — the reveal replays every time a section re-enters the viewport, including
// scrolling back up past it, not just the first time it's seen.
export function Reveal({ children, className, delay = 0, y = 20, as = 'div' }) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      initial={{ opacity: 0, y: reduceMotion ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-80px' }}
      transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : delay }}
      className={className}
    >
      {children}
    </Component>
  );
}
