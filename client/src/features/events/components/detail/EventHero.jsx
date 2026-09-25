import { MapPin } from 'lucide-react';
import { EventCover } from '../EventCover.jsx';
import { EventStatusBadge } from '../EventStatusBadge.jsx';
import { formatEventWhen } from '../../utils/eventTime.js';

// The event's cover (or the generated category banner) with a dark fade at the bottom so the
// title and details stay readable over any image. The status sits top-right; it is the same badge
// the cards use, so LIVE / STARTS IN / COMPLETED mean the same thing everywhere.
export function EventHero({ event }) {
  return (
    <EventCover
      coverImage={event.coverImage}
      category={event.category}
      variant="hero"
      aspectClassName="h-64 sm:h-72 lg:h-80"
      className="rounded-(--ef-radius)"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(to top, rgb(0 0 0 / 0.8), rgb(0 0 0 / 0.3) 55%, rgb(0 0 0 / 0.05))' }}
      />
      <EventStatusBadge event={event} className="absolute right-4 top-4 bg-(--color-surface)" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
        <p className="text-meta text-white/80">{event.category}</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight sm:text-4xl">{event.title}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/80">
          <span>{formatEventWhen(event, { weekday: true, year: true })}</span>
          {event.venue?.name && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden="true" />
              {event.venue.name}
            </span>
          )}
        </p>
      </div>
    </EventCover>
  );
}
