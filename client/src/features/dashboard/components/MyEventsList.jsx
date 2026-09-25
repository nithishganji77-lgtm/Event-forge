import { useMyEvents } from '../../events/hooks/useMyEvents.js';
import { EventCard } from '../../events/components/EventCard.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Ticket } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner.jsx';

// useMyEvents() returns registrations across every org the user belongs to (GET /me/events isn't
// org-scoped) — filtered here to just this org's, since this list renders inside one org's
// dashboard. Consolidates the spec's separate "My Events" and "Upcoming" sections into one: the
// hook already only returns active (REGISTERED/WAITLISTED) registrations, so a second "Upcoming"
// section would show nearly the same data twice.
export function MyEventsList({ organizationId }) {
  const { data, isLoading } = useMyEvents();

  if (isLoading) return <Spinner />;

  const registrations = (data || [])
    .filter((r) => r.organization === organizationId && r.event)
    .sort((a, b) => new Date(a.event.startDate) - new Date(b.event.startDate));

  if (registrations.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="You haven't registered for anything yet"
        description="Register for an event above and it will show up here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {registrations.map((r) => (
        <EventCard key={r._id} event={r.event} />
      ))}
    </div>
  );
}
