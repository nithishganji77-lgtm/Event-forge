import { Link } from 'react-router-dom';
import { CircleSlash, MapPin, Users } from 'lucide-react';
import { EventStatusBadge } from './EventStatusBadge.jsx';
import { EventCover } from './EventCover.jsx';
import { CapacityBar } from './CapacityBar.jsx';
import { EventCardMenu } from './EventCardMenu.jsx';
import { RegisterButton } from './RegisterButton.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { getPresentationStatus } from '../utils/presentationStatus.js';
import { formatEventWhen } from '../utils/eventTime.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { useNow } from '../../../hooks/useNow.js';
import { ROUTES } from '../../../utils/constants.js';
import { cn } from '../../../lib/cn.js';

// variant "default": a banner card (cover image, or a generated category banner), status, when,
// where, a registration bar, and either the register control (showRegisterButton, employees) or
// View + the ⋯ menu (showActions, managers). variant "compact": the dense text card used inside
// the calendar's agenda, where a banner per row would be far too tall.
//
// The register control and the menu are siblings of the info Link, never children of it —
// they're interactive, and interactive content inside <a> is invalid HTML and a click-handling
// conflict (the Link would also navigate).
export function EventCard({ event, showRegisterButton = false, showActions = false, variant = 'default' }) {
  const { organizationSlug } = useActiveOrganization();
  const now = useNow();
  const status = getPresentationStatus(event, now);
  const detailPath = ROUTES.orgEventDetail(organizationSlug, event._id);
  const when = formatEventWhen(event);

  if (variant === 'compact') {
    return (
      <div className="rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-4 transition-colors hover:border-(--color-text)/25">
        <Link to={detailPath} className="block">
          <div className="mb-2 flex items-start justify-between gap-3">
            <span className="text-meta text-(--color-text)/50">{event.category}</span>
            <EventStatusBadge event={event} />
          </div>
          <h3 className="mb-2 text-base font-semibold leading-tight">{event.title}</h3>
          <div className="space-y-1 text-sm text-(--color-text)/60">
            <div>{when}</div>
            {event.venue?.name && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden="true" />
                {event.venue.name}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden="true" />
              {event.registeredCount} / {event.capacity} registered
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    // hover/focus-within raise the whole card above its neighbours, or the next card in the grid
    // would paint over an open "⋯" menu that hangs below this one.
    <article
      className={cn(
        'group relative flex flex-col rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface)',
        // Tailwind v4 lifts with the `translate` property, not `transform`, so that's what must be
        // listed here or the hover lift snaps instead of easing.
        'transition-[translate,border-color,background-color] duration-150',
        'hover:z-10 hover:-translate-y-0.5 hover:border-(--color-text)/25 hover:bg-(--color-surface-hover) focus-within:z-10'
      )}
    >
      <Link
        to={detailPath}
        className="block rounded-t-(--ef-radius) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--color-accent)"
      >
        <EventCover
          coverImage={event.coverImage}
          category={event.category}
          className="rounded-t-[calc(var(--ef-radius)-1px)]"
        >
          <EventStatusBadge event={event} className="absolute left-3 top-3 bg-(--color-surface)" />
        </EventCover>
        <div className="p-4 pb-3">
          <p className="text-meta mb-1.5 text-(--color-text)/50">{event.category}</p>
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug">{event.title}</h3>
          <div className="mt-2 space-y-1 text-sm text-(--color-text)/60">
            <div>{when}</div>
            {event.venue?.name && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{event.venue.name}</span>
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-auto space-y-3 px-4 pb-4">
        <CapacityBar registered={event.registeredCount} capacity={event.capacity} waitlisted={event.waitlistedCount} />
        {status.registrationClosed && (
          <p className="flex items-center gap-1.5 text-xs text-(--color-text)/60">
            <CircleSlash className="size-3.5" aria-hidden="true" />
            Registration closed
          </p>
        )}
        {showRegisterButton ? (
          <RegisterButton event={event} className="w-full" />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <Button as={Link} to={detailPath} variant="outline" size="sm" aria-label={`View ${event.title}`}>
              View event
            </Button>
            {showActions && <EventCardMenu event={event} />}
          </div>
        )}
      </div>
    </article>
  );
}
