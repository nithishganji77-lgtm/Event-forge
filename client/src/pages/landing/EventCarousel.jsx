import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { Reveal } from './Reveal.jsx';
import { SectionEyebrow } from './SectionEyebrow.jsx';
import { EventCard } from './EventCard.jsx';
import { useCarouselDrag } from '../../hooks/useCarouselDrag.js';

const EVENTS = [
  {
    id: 'tech-summit-2026',
    title: 'TECH SUMMIT 2026',
    category: 'Conference',
    date: 'Sep 28, 2026',
    time: '6:00 PM',
    location: 'Hyderabad',
    description: 'Annual technology conference bringing together 500+ engineers, founders, and investors.',
    image: '/images/events/1.svg',
    imageAlt: 'Tech Summit 2026 main stage with keynote speaker',
  },
  {
    id: 'design-week-2026',
    title: 'DESIGN WEEK 2026',
    category: 'Workshop',
    date: 'Oct 15, 2026',
    time: '10:00 AM',
    location: 'Bangalore',
    description: 'Hands-on design sprints with industry leaders. Limited to 50 participants.',
    image: '/images/events/2.svg',
    imageAlt: 'Design Week 2026 collaborative workshop session',
  },
  {
    id: 'startup-demo-day',
    title: 'STARTUP DEMO DAY',
    category: 'Pitch Event',
    date: 'Nov 3, 2026',
    time: '2:00 PM',
    location: 'Mumbai',
    description: '15 early-stage startups pitch to top VCs. Networking reception follows.',
    image: '/images/events/3.svg',
    imageAlt: 'Startup Demo Day founder presenting on stage',
  },
  {
    id: 'ai-ethics-forum',
    title: 'AI ETHICS FORUM',
    category: 'Summit',
    date: 'Nov 20, 2026',
    time: '9:00 AM',
    location: 'Delhi',
    description: 'Cross-disciplinary dialogue on responsible AI. Policy makers, researchers, builders.',
    image: '/images/events/4.svg',
    imageAlt: 'AI Ethics Forum panel discussion with experts',
  },
  {
    id: 'devops-converge',
    title: 'DEVOPS CONVERGE',
    category: 'Conference',
    date: 'Dec 5, 2026',
    time: '8:30 AM',
    location: 'Pune',
    description: 'Platform engineering, observability, and developer experience. Two tracks, one day.',
    image: '/images/events/5.svg',
    imageAlt: 'DevOps Converge technical keynote presentation',
  },
  {
    id: 'product-leadership-retreat',
    title: 'PRODUCT LEADERSHIP RETREAT',
    category: 'Retreat',
    date: 'Jan 12, 2027',
    time: '4:00 PM',
    location: 'Goa',
    description: 'Intimate offsite for product leaders. Strategy, org design, and peer coaching.',
    image: '/images/events/6.svg',
    imageAlt: 'Product Leadership Retreat beachside venue',
  },
];
const COUNT = EVENTS.length;

const AUTOPLAY_MS = 3600;
const SETTLE_MS = 1300; // how long the entrance takes; autoplay waits for it

// Spring-like, and gentle: the slides glide into place rather than snap or bounce.
const SPRING = { type: 'spring', stiffness: 130, damping: 20, mass: 1 };
const INSTANT = { duration: 0 };

// Where the slides sit. The active one is `center`; each step outward is smaller, lower, fainter and
// tilted away from the middle. Depth comes from scale, opacity and stacking, not shadows. `visible`
// is how many slides show on each side of the active one: 2 (five on stage) on desktop, 1 (three)
// on tablet and on mobile, where the neighbours only peek out from behind the main card.
const DESKTOP = {
  name: 'desktop', cardW: 300, visible: 2,
  slots: { 1: { x: 250, y: 14, scale: 0.84, rotate: 4, opacity: 0.95 }, 2: { x: 430, y: 36, scale: 0.68, rotate: 8, opacity: 0.7 } },
};
const TABLET = {
  name: 'tablet', cardW: 240, visible: 1,
  slots: { 1: { x: 210, y: 14, scale: 0.82, rotate: 4, opacity: 0.9 } },
};

function readLayout() {
  const width = window.innerWidth;
  if (width >= 1024) return { ...DESKTOP, key: DESKTOP.name };
  if (width >= 640) return { ...TABLET, key: TABLET.name };
  const cardW = Math.round(Math.min(280, Math.max(200, width * 0.6)));
  return {
    name: 'mobile', cardW, visible: 1, key: `mobile-${cardW}`,
    slots: { 1: { x: Math.round(cardW * 0.8), y: 12, scale: 0.84, rotate: 4, opacity: 0.9 } },
  };
}

const CENTER = { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 };

function slotFor(offset, layout) {
  if (offset === 0) return CENTER;
  const slot = layout.slots[Math.abs(offset)];
  const side = Math.sign(offset);
  return { x: side * slot.x, y: slot.y, scale: slot.scale, rotate: side * slot.rotate, opacity: slot.opacity };
}

// Just off-stage on one side, invisible: where slides wait, and where they come in from.
function hiddenFor(side, layout) {
  const outer = layout.slots[layout.visible];
  return { x: side * (outer.x + layout.cardW * 0.35), y: outer.y + 16, scale: outer.scale * 0.85, rotate: side * (outer.rotate + 2), opacity: 0 };
}

// The entrance's starting point: an even, flat row of small, faint slides.
function looseFor(offset, layout) {
  return { x: offset * layout.slots[1].x * 1.7, y: 0, scale: 0.7, rotate: 0, opacity: 0 };
}

// Signed circular distance from the active slide, in [-COUNT/2 + 1, COUNT/2]: 0 is the active one,
// negative is to its left. Circular, so autoplay loops without a slide flying the long way round.
function signedOffset(index, active) {
  let distance = (index - active + COUNT) % COUNT;
  if (distance > COUNT / 2) distance -= COUNT;
  return distance;
}

// Works out each slide's target for the current state, given where every slide was last time.
// Kept pure (the previous snapshot is passed in) so it can live in a useMemo.
function buildCards({ active, layout, before, entered, settled, reduceMotion }) {
  const offsets = EVENTS.map((_, i) => signedOffset(i, active));
  const sides = [];

  const cards = EVENTS.map((event, i) => {
    const offset = offsets[i];
    const visible = Math.abs(offset) <= layout.visible;
    const previous = before?.offsets[i];
    const wasVisible = previous !== undefined && Math.abs(previous) <= layout.visible;

    // A slide that leaves the stage keeps going the way it was heading and waits there.
    const side = visible ? 0 : wasVisible ? Math.sign(previous) : before?.sides[i] || 1;
    sides.push(side);

    const rest = visible ? slotFor(offset, layout) : hiddenFor(side, layout);
    let animate = rest;
    let transition = SPRING;

    if (reduceMotion) {
      transition = INSTANT;
    } else if (!entered) {
      animate = looseFor(offset, layout);
    } else if (!settled) {
      transition = { ...SPRING, delay: Math.abs(offset) * 0.07 };
    } else if (visible && !wasVisible && before) {
      // Coming on stage: start from off-stage on its own side, so it slides in instead of sweeping
      // across the stage from wherever it was waiting.
      const from = hiddenFor(Math.sign(offset), layout);
      animate = {
        x: [from.x, rest.x], y: [from.y, rest.y], scale: [from.scale, rest.scale],
        rotate: [from.rotate, rest.rotate], opacity: [0, rest.opacity],
      };
    } else if (!visible && wasVisible) {
      transition = { ...SPRING, opacity: { duration: 0.25, ease: 'easeOut' } }; // fade while still moving out
    }

    return {
      key: event.id,
      event,
      index: i,
      total: COUNT,
      cardWidth: layout.cardW,
      isActive: offset === 0,
      isHidden: !visible,
      // The inner edge of a slide is tucked behind the active one, so its label hugs the outer edge.
      labelAtEnd: offset > 0,
      zIndex: visible ? 10 - Math.abs(offset) : 0,
      initial: reduceMotion ? rest : looseFor(offset, layout),
      animate,
      transition,
      eager: i === 0,
    };
  });

  return { cards, snapshot: { offsets, sides } };
}

const pad = (n) => String(n).padStart(2, '0');

// Beat 2: a horizontal, layered carousel. Slides are absolutely positioned at the centre and moved
// with transforms only (x, y, scale, rotate, opacity), so every move is a spring on the compositor
// and nothing reflows. It plays once the stage scrolls into view: the slides fan out from a loose
// row into the layered arrangement, then autoplay takes over. Autoplay pauses on hover, while
// dragging, on keyboard focus, off-screen and in a background tab, and never runs under
// prefers-reduced-motion (which also makes every move instant; the controls still work).
export function EventCarousel() {
  const reduceMotion = useReducedMotion();
  const stageWrapRef = useRef(null);
  const [active, setActive] = useState(0);
  const [layout, setLayout] = useState(readLayout);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [settled, setSettled] = useState(false);

  const enteredView = useInView(stageWrapRef, { once: true, amount: 0.4 });
  const onScreen = useInView(stageWrapRef, { amount: 0.25 });
  const entered = enteredView || Boolean(reduceMotion);

  const step = useCallback((direction) => setActive((current) => (current + direction + COUNT) % COUNT), []);
  const { dragX, dragging, bind, shouldSuppressClick } = useCarouselDrag({ onSwipe: step });
  const select = useCallback(
    (index) => {
      if (!shouldSuppressClick()) setActive(index);
    },
    [shouldSuppressClick]
  );

  useEffect(() => {
    function onResize() {
      const next = readLayout();
      setLayout((current) => (current.key === next.key ? current : next));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!entered) return undefined;
    const timer = setTimeout(() => setSettled(true), reduceMotion ? 0 : SETTLE_MS);
    return () => clearTimeout(timer);
  }, [entered, reduceMotion]);

  // A timeout re-armed by every change of `active`, so a manual move (click, swipe, arrow key)
  // restarts the full interval instead of the next slide arriving a moment later.
  const autoplaying = settled && onScreen && pageVisible && !hovered && !focused && !dragging && !reduceMotion;
  useEffect(() => {
    if (!autoplaying) return undefined;
    const timer = setTimeout(() => step(1), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [autoplaying, active, step]);

  // Each slide's target depends on where it was last render (a slide leaving the stage vs one
  // arriving), so the previous snapshot lives in a ref written after commit.
  const previous = useRef(null);
  const { cards, snapshot } = useMemo(
    () => buildCards({ active, layout, before: previous.current, entered, settled, reduceMotion }),
    [active, layout, entered, settled, reduceMotion]
  );
  useEffect(() => {
    previous.current = snapshot;
  }, [snapshot]);

  const current = EVENTS[active];
  const stageHeight = Math.round((layout.cardW * 4) / 3) + 40;

  return (
    <section
      aria-labelledby="carousel-heading"
      className="overflow-hidden px-6 py-20 sm:px-12 sm:py-28"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') step(1);
        else if (event.key === 'ArrowLeft') step(-1);
      }}
      onFocus={(event) => {
        // Only keyboard focus pauses. Clicking a slide leaves focus on it, which must not stop the show.
        if (event.target.matches(':focus-visible')) setFocused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <Reveal className="mb-10 sm:mb-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <SectionEyebrow label="FEATURED EVENTS" />
            <h2 id="carousel-heading" className="text-section max-w-2xl font-semibold tracking-tight">
              Events you don&apos;t want to miss
            </h2>
          </div>
          <p aria-hidden="true" className="text-meta shrink-0 pb-3 tabular-nums text-(--color-text)/50">
            {pad(active + 1)} / {pad(COUNT)}
          </p>
        </div>
      </Reveal>

      <div ref={stageWrapRef} className="group relative">
        <motion.div
          role="group"
          aria-roledescription="carousel"
          aria-label="Featured events"
          {...bind}
          onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          style={{ height: stageHeight, x: dragX }}
          // pan-y leaves vertical page scrolling to the browser; sideways swipes are the carousel's.
          className={cn('relative mx-auto w-full max-w-[1200px] touch-pan-y select-none', dragging ? 'cursor-grabbing' : 'cursor-grab')}
        >
          {cards.map(({ key, ...card }) => (
            <EventCard key={key} {...card} onSelect={select} />
          ))}
        </motion.div>

        {[
          { label: 'Previous event', direction: -1, icon: ChevronLeft, side: 'left-0' },
          { label: 'Next event', direction: 1, icon: ChevronRight, side: 'right-0' },
        ].map(({ label, direction, icon: Icon, side }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={() => step(direction)}
            className={cn(
              'absolute top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full md:grid',
              'border border-(--color-border) bg-(--color-bg)/80 text-(--color-text) backdrop-blur-sm',
              // Out of the way until the stage is hovered or a control has keyboard focus.
              'opacity-0 transition-[opacity,border-color,color] duration-200 group-hover:opacity-100 focus-visible:opacity-100',
              'hover:border-(--color-accent) hover:text-(--color-accent)',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
              side
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </button>
        ))}
      </div>

      {/* Announce the change only when nothing is auto-advancing: a slide read out every 3.6s would
          talk over the person. */}
      <div className="mt-8 min-h-44 text-center" aria-live={autoplaying ? 'off' : 'polite'}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
          >
            <p className="text-meta text-(--color-accent)">{current.category}</p>
            <h3 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{current.title}</h3>
            <p className="mt-2 text-(--color-text)/60">
              {current.date} · {current.time} · {current.location}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-(--color-text)/50">{current.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-1 flex items-center justify-center">
        {EVENTS.map((event, index) => (
          <button
            key={event.id}
            type="button"
            aria-label={`Show ${event.title}`}
            aria-current={index === active || undefined}
            onClick={() => setActive(index)}
            // The visible dot is small; the button around it is a comfortable tap target.
            className="group/dot grid h-8 min-w-6 place-items-center px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--color-accent)"
          >
            <span
              className={cn(
                'block h-2 rounded-full transition-[width,background-color] duration-300',
                index === active ? 'w-6 bg-(--color-accent)' : 'w-2 bg-(--color-text)/20 group-hover/dot:bg-(--color-text)/40'
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
