import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn.js';

// One slide of the carousel. The parent works out where it sits (`animate`, `initial`, `transition`
// come from its slot maths) and this component just moves there: a spring on transform and opacity
// only, so it never triggers layout. Memoised, so a hover or a progress tick in the parent does not
// re-render six cards; every prop is a primitive or a stable object.
//
// Every card is portrait and image-only. The active event's title, date and description are the
// caption below the stage, so a card carries a category and a city and nothing else.
export const EventCard = memo(function EventCard({
  event,
  index,
  total,
  cardWidth,
  isActive,
  isHidden,
  labelAtEnd,
  zIndex,
  initial,
  animate,
  transition,
  eager,
  onSelect,
}) {
  const Surface = isActive ? 'div' : 'button';

  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}`}
      // A slide that is off-stage must not be reachable by Tab or a screen reader.
      aria-hidden={isHidden || undefined}
      inert={isHidden || undefined}
      className="absolute inset-x-0 top-2 mx-auto will-change-transform"
      style={{ width: cardWidth, zIndex }}
      initial={initial}
      animate={animate}
      transition={transition}
    >
      <Surface
        {...(isActive ? {} : { type: 'button', onClick: () => onSelect(index), 'aria-label': `Show ${event.title}` })}
        className={cn(
          'relative block aspect-[3/4] w-full overflow-hidden rounded-[24px] bg-(--color-bg-secondary) text-left',
          !isActive &&
            'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-accent)'
        )}
      >
        <img
          src={event.image}
          alt={isActive ? event.imageAlt : ''}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          // The browser's own image drag would fight the carousel's pointer drag.
          draggable={false}
          className="size-full select-none object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(to top, rgb(0 0 0 / 0.62), rgb(0 0 0 / 0) 55%)' }}
        />
        <div className={cn('absolute inset-x-0 bottom-0 p-5', labelAtEnd && 'text-right')}>
          <p className="text-meta text-white/90">{event.category}</p>
          <p className="mt-1 text-sm text-white/70">{event.location}</p>
        </div>
      </Surface>
    </motion.div>
  );
});
