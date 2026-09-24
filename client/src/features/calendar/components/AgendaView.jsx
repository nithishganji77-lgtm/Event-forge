import { motion, useReducedMotion } from 'framer-motion';
import { EventCard } from '../../events/components/EventCard.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { formatEventDay } from '../../events/utils/eventTime.js';

// Groups the exact same fetched month's events by day — no separate fetch/pagination logic, just
// a client-side grouping of data the month grid already has.
export function AgendaView({ events }) {
  const reduceMotion = useReducedMotion();

  if (events.length === 0) {
    return <EmptyState title="No events this month" />;
  }

  // An event's day is its stored calendar date, which is UTC midnight — grouping by the viewer's
  // local day (toDateString) put evening-west-of-UTC events under the previous day.
  const sorted = [...events].sort(
    (a, b) => new Date(a.startsAt ?? a.startDate) - new Date(b.startsAt ?? b.startDate)
  );
  const groups = [];
  for (const event of sorted) {
    const dateKey = new Date(event.startDate).toISOString().slice(0, 10);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.dateKey === dateKey) {
      lastGroup.events.push(event);
    } else {
      groups.push({ dateKey, events: [event] });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      className="space-y-8"
    >
      {groups.map((group) => (
        <div key={group.dateKey}>
          <p className="text-meta text-(--color-text)/50 mb-3">
            {formatEventDay(group.dateKey, { weekday: true, year: true })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.events.map((event) => (
              <EventCard key={event._id} event={event} variant="compact" />
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
