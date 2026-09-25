import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useEvents } from '../../events/hooks/useEvents.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

// Shown only while something is actually running. An event that has started is in none of the
// Upcoming / Drafts / Completed tabs, so without this it would drop off the dashboard at exactly
// the moment an organizer most wants to see it. `organizer` scopes it to an organizer's own events.
export function LiveNow({ organizationId, organizer }) {
  const { organizationSlug } = useActiveOrganization();
  const { data } = useEvents(organizationId, { status: 'ONGOING', limit: 3, sort: 'startsAt_asc', organizer });
  const events = data?.data ?? [];

  if (events.length === 0) return null;

  return (
    <section
      aria-labelledby="live-now-heading"
      className="rounded-(--ef-radius) border border-(--color-accent) bg-(--color-surface) p-4"
    >
      <h2 id="live-now-heading" className="text-meta mb-3 flex items-center gap-2 text-(--color-accent)">
        <Radio className="size-4" aria-hidden="true" />
        Live now
      </h2>
      <ul className="divide-y divide-(--color-border)">
        {events.map((event) => (
          <li key={event._id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 first:pt-0 last:pb-0">
            <Link
              to={ROUTES.orgEventDetail(organizationSlug, event._id)}
              className="font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
            >
              {event.title}
            </Link>
            <span className="text-sm text-(--color-text)/60">
              {event.registeredCount} / {event.capacity} registered
              {event.venue?.name ? ` · ${event.venue.name}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
