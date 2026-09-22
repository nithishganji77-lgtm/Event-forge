import { Link } from 'react-router-dom';
import { MapPin, Users } from 'lucide-react';
import { EventStatusBadge } from './EventStatusBadge.jsx';
import { RegisterButton } from './RegisterButton.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// showRegisterButton defaults false so every existing call site (Events management list) renders
// byte-identical to before. When true, the register control is a sibling of the info Link, not
// nested inside it — RegisterButton is itself interactive, and interactive content inside <a> is
// both invalid HTML and a click-handling conflict (the outer Link would also navigate on click).
export function EventCard({ event, showRegisterButton = false }) {
  const { organizationSlug } = useActiveOrganization();

  return (
    <div className="border border-(--color-border) p-5 hover:border-(--color-accent) transition-colors">
      <Link to={ROUTES.orgEventDetail(organizationSlug, event._id)} className="block">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-meta text-(--color-text)/50">{event.category}</span>
          <EventStatusBadge status={event.displayStatus} />
        </div>
        <h3 className="text-lg font-semibold mb-3 leading-tight">{event.title}</h3>
        <div className="space-y-1.5 text-sm text-(--color-text)/60">
          <div>{formatDate(event.startDate)}</div>
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
      {showRegisterButton && (
        <div className="mt-4 pt-4 border-t border-(--color-border)">
          <RegisterButton event={event} className="w-full" />
        </div>
      )}
    </div>
  );
}
