import { useRef, useState } from 'react';
import { Users, CalendarPlus, CheckCircle2, ChartColumn } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { SectionEyebrow } from './SectionEyebrow.jsx';
import { cn } from '../../lib/cn.js';

const STEPS = [
  {
    key: 'organize',
    icon: Users,
    label: 'Organize',
    headline: 'Stand up your organization.',
    body: "Invite your team, assign roles, and decide who can create events, manage members, or just show up and register.",
  },
  {
    key: 'publish',
    icon: CalendarPlus,
    label: 'Publish',
    headline: 'Turn an idea into an event.',
    body: "A five-step wizard carries you from a blank form to a published event — save a draft, come back later, publish when it's ready.",
  },
  {
    key: 'register',
    icon: CheckCircle2,
    label: 'Register',
    headline: 'Fill the room, automatically.',
    body: 'Capacity and waitlists manage themselves. A cancellation promotes the next person in line — no one has to notice.',
  },
  {
    key: 'track',
    icon: ChartColumn,
    label: 'Track',
    headline: 'See what actually happened.',
    body: 'Role-aware dashboards, notifications for the people who need them, and a full audit trail for everything else.',
  },
];

// Beat 2: a sticky, scroll-driven stepper — the section pins for STEPS.length viewport-heights
// of scroll while scrollYProgress (0->1 across that whole span) drives which step is "active"
// and how far the connecting line has illuminated. Replaces the earlier static paragraph +
// diagram with the same four real product stages, now told as a scroll narrative.
export function OurWorkSection() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // The line spans the middle 75% of the row's width (12.5% clear on each side, half a
  // step-column, so it visually starts/ends at the first/last circle's own center) —
  // percentage-based so it stays aligned to the circles at any viewport width without
  // measuring pixels.
  //
  // Not a plain linear map of scrollYProgress: with 4 steps there are only 3 gaps to fill, and a
  // naive 0->75% linear map starts illuminating the very first gap the instant you enter step 0's
  // own quarter — before you've actually "left" it. Each keyframe pair below holds the line flat
  // for the first 40% of a step's dwell (so arriving at a step never shows a premature sliver),
  // then ramps it to the next gap's full width by the time the next step activates. The final
  // quarter (the last step's own dwell) has nothing left to fill and stays flat at 75%.
  const lineWidth = useTransform(
    scrollYProgress,
    [0, 0.1, 0.25, 0.35, 0.5, 0.6, 0.75, 1],
    ['0%', '0%', '25%', '25%', '50%', '50%', '75%', '75%']
  );

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActiveStep(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length)));
  });

  const step = STEPS[activeStep];

  return (
    <section ref={containerRef} className="relative" style={{ height: `${STEPS.length * 100}vh` }}>
      <div className="sticky top-0 h-screen flex flex-col px-6 sm:px-12 py-16">
        <SectionEyebrow label="OUR WORK" />

        <div className="mt-8 sm:mt-12 max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -16 }}
              transition={{ duration: reduceMotion ? 0 : 0.4 }}
            >
              <h3 className="text-4xl sm:text-6xl font-semibold tracking-tight mb-5 max-w-xl">
                {step.headline}
              </h3>
              <p className="text-lg text-(--color-text)/60 max-w-md">{step.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-auto max-w-3xl w-full mx-auto">
          <div className="relative flex items-start">
            <div className="absolute left-[12.5%] top-7 sm:top-8 h-px w-3/4 bg-(--color-border)" aria-hidden="true" />
            <motion.div
              className="absolute left-[12.5%] top-7 sm:top-8 h-px bg-(--color-accent) z-10"
              style={{ width: lineWidth }}
              aria-hidden="true"
            />

            {STEPS.map((s, index) => {
              const state = index < activeStep ? 'done' : index === activeStep ? 'active' : 'upcoming';
              return (
                <div key={s.key} className="flex-1 flex flex-col items-center gap-3 relative z-20">
                  <div
                    className={cn(
                      // Every state gets an opaque circle fill (including "upcoming", which has
                      // none of the accent/text tones to fall back on) — otherwise the connector
                      // line, which sits underneath, would show through the circle's middle
                      // instead of disappearing behind it.
                      'size-14 sm:size-16 rounded-full border flex items-center justify-center transition-colors duration-300',
                      state === 'active' && 'border-(--color-accent) bg-(--color-accent) text-(--color-text)',
                      state === 'done' && 'border-(--color-text) bg-(--color-text) text-(--color-bg)',
                      state === 'upcoming' && 'border-(--color-text)/20 bg-(--color-bg) text-(--color-text)/25'
                    )}
                  >
                    <s.icon className="size-5 sm:size-6" aria-hidden="true" />
                  </div>
                  <span
                    className={cn(
                      'text-meta transition-colors duration-300',
                      state === 'upcoming' ? 'text-(--color-text)/30' : 'text-(--color-text)/70'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
