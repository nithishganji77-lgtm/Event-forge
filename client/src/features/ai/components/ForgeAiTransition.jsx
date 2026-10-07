import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Always the dark palette, whatever the app theme: this is a deliberate brand moment, so it uses
// the dark-theme values directly instead of the theme tokens (which are light in light mode).
const INK = '#F4F1EA';
const BASE = '#111111';
const ACCENT = '#FF5A1F';
const HAIRLINE = '#34322C';

const EASE = [0.22, 1, 0.36, 1];

// Purely presentational copy. It does not track what the server is doing.
const LINES = [
  'Understanding your event…',
  'Shaping the format…',
  'Building the agenda…',
  'Sizing the room…',
  'Almost there…',
];
const LINE_MS = 1800;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// The layer ForgeAI hands off through while a draft is being written. Decorative (aria-hidden): the
// Plan tab's own status line announces the work. While active it swallows Escape and Tab so the
// dialog underneath can't be closed or tabbed into mid-request; there is no way to cancel the
// request, so it doesn't pretend to offer one.
export function ForgeAiTransition({ active, origin }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!active) return undefined;
    document.activeElement?.blur?.();

    function block(event) {
      if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener('keydown', block, true);
    return () => window.removeEventListener('keydown', block, true);
  }, [active]);

  const wipe = origin && !reduceMotion;
  const from = wipe ? `circle(0px at ${origin.x}px ${origin.y}px)` : undefined;
  const to = wipe ? `circle(${origin.radius}px at ${origin.x}px ${origin.y}px)` : undefined;

  return createPortal(
    <AnimatePresence>
      {active && (
        <motion.div
          data-forge-transition=""
          aria-hidden="true"
          className="fixed inset-0 z-[60] flex h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center"
          style={{
            color: INK,
            backgroundColor: BASE,
            backgroundImage: `radial-gradient(circle at 50% 45%, rgba(255, 90, 31, 0.1), transparent 55%)`,
          }}
          initial={wipe ? { clipPath: from } : { opacity: 0 }}
          animate={wipe ? { clipPath: to } : { opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.15 : 0.42, delay: reduceMotion ? 0 : 0.12, ease: 'easeOut' } }}
          transition={{ duration: reduceMotion ? 0.15 : 0.52, ease: EASE }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: GRAIN }} />

          <motion.div
            className="relative flex flex-col items-center"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: reduceMotion ? 0 : 0.18, duration: 0.45, ease: EASE } }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.9, transition: { duration: 0.26, ease: 'easeIn' } }}
          >
            <ForgeMark />
            <p className="mt-10 pl-[0.42em] text-sm font-medium tracking-[0.42em] sm:text-base">FORGEAI</p>
            <ProcessingLine reduceMotion={reduceMotion} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ForgeMark() {
  return (
    <div className="relative size-24 sm:size-32">
      <div
        className="absolute -inset-[45%] rounded-full animate-forge-breathe"
        style={{ backgroundImage: `radial-gradient(circle, rgba(255, 90, 31, 0.32), transparent 62%)` }}
      />
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        <circle cx="50" cy="50" r="46" fill="none" stroke={HAIRLINE} strokeWidth="1" />
      </svg>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full animate-spin [animation-duration:3.2s]">
        <circle cx="50" cy="50" r="46" fill="none" stroke={ACCENT} strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="190 99" />
      </svg>
      <div className="absolute inset-0 animate-spin [animation-direction:reverse] [animation-duration:4.8s]">
        <span className="absolute left-1/2 top-[4%] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ backgroundColor: INK }} />
      </div>
      <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto size-10 animate-forge-breathe sm:size-12">
        <path
          fill={ACCENT}
          d="M12 0C12.6 6.6 17.4 11.4 24 12C17.4 12.6 12.6 17.4 12 24C11.4 17.4 6.6 12.6 0 12C6.6 11.4 11.4 6.6 12 0Z"
        />
      </svg>
    </div>
  );
}

// Mounted fresh with each activation, so it always starts from the first line.
function ProcessingLine({ reduceMotion }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => Math.min(i + 1, LINES.length - 1)), LINE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    // A fixed width: the column it sits in shrinks to the mark, which would wrap every line.
    <div className="relative mt-3 h-6 w-72 max-w-[calc(100vw-3rem)]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={index}
          className="absolute inset-x-0 text-sm"
          style={{ color: INK }}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
          animate={{ opacity: 0.6, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {LINES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
