import { motion, useReducedMotion } from 'framer-motion';
import { useEvents } from '../../events/hooks/useEvents.js';
import { EventCard } from '../../events/components/EventCard.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';

// Bucketed client-side from displayStatus — no backend change needed, reuses the existing
// `organizer` filter on listEvents. CANCELLED events are deliberately omitted from this board
// (still visible via the full Events list) rather than adding a 5th column for a terminal state.
const COLUMNS = [
  { key: 'draft', label: 'Draft', match: (e) => e.status === 'DRAFT' },
  { key: 'published', label: 'Published', match: (e) => e.displayStatus === 'REGISTRATION_OPEN' },
  { key: 'upcoming', label: 'Upcoming', match: (e) => ['REGISTRATION_CLOSED', 'ONGOING'].includes(e.displayStatus) },
  { key: 'completed', label: 'Completed', match: (e) => e.displayStatus === 'COMPLETED' },
];

export function MyEventsBoard() {
  const { user } = useAuth();
  const { organizationId } = useActiveOrganization();
  const reduceMotion = useReducedMotion();
  // Unpaginated by design, same "bounded dashboard widget" class as DiscoverEventsGrid's limit:12
  // and UpcomingEventsTable's limit:5 — just with more headroom since one query fans out across 4
  // Kanban columns. Not a paginated list page; don't "fix" this into a one-off paginated widget.
  const { data, isLoading } = useEvents(organizationId, { organizer: user?.id, limit: 100 });

  if (isLoading) return <Spinner />;

  const events = data?.data || [];
  if (events.length === 0) {
    return <EmptyState title="No events yet" description="Events you create or organize will show up here." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {COLUMNS.map((col) => {
        const colEvents = events.filter(col.match);
        return (
          <div key={col.key}>
            <p className="text-meta text-(--color-text)/50 mb-3">
              {col.label} ({colEvents.length})
            </p>
            <div className="space-y-3">
              {colEvents.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
              {colEvents.length === 0 && <p className="text-sm text-(--color-text)/40">—</p>}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
