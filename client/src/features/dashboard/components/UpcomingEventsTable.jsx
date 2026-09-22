import { Link } from 'react-router-dom';
import { useEvents } from '../../events/hooks/useEvents.js';
import { EventStatusBadge } from '../../events/components/EventStatusBadge.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

// Event/Date/Registrations/Capacity/Status per the spec's table — Organizer is swapped for
// Category (list responses don't populate creator names; adding that just for this table would
// mean touching the already-signed-off Phase 3 event-list response shape for a cosmetic column).
export function UpcomingEventsTable({ organizationId }) {
  const { organizationSlug } = useActiveOrganization();
  const { data, isLoading } = useEvents(organizationId, { status: 'REGISTRATION_OPEN', limit: 5 });

  if (isLoading) return <Spinner />;
  if (!data || data.data.length === 0) {
    return <EmptyState title="No upcoming events" description="Published events with open registration will show up here." />;
  }

  return (
    <div className="border border-(--color-border) overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-meta text-(--color-text)/50 border-b border-(--color-border)">
            <th className="text-left px-4 py-3 font-medium">Event</th>
            <th className="text-left px-4 py-3 font-medium">Date</th>
            <th className="hidden sm:table-cell text-left px-4 py-3 font-medium">Category</th>
            <th className="text-left px-4 py-3 font-medium">Registrations</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((event) => (
            <tr key={event._id} className="border-b border-(--color-border) last:border-0">
              <td className="px-4 py-3">
                <Link to={ROUTES.orgEventDetail(organizationSlug, event._id)} className="hover:text-(--color-accent)">
                  {event.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-(--color-text)/70">
                {new Date(event.startDate).toLocaleDateString()}
              </td>
              <td className="hidden sm:table-cell px-4 py-3 text-(--color-text)/70">{event.category}</td>
              <td className="px-4 py-3 text-(--color-text)/70">
                {event.registeredCount} / {event.capacity}
              </td>
              <td className="px-4 py-3">
                <EventStatusBadge status={event.displayStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
