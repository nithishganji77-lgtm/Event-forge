import { motion, useReducedMotion } from 'framer-motion';
import { useEvents } from '../../events/hooks/useEvents.js';
import { EventCard } from '../../events/components/EventCard.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';

export function DiscoverEventsGrid({ organizationId }) {
  const { data, isLoading } = useEvents(organizationId, { status: 'REGISTRATION_OPEN', limit: 12 });
  const reduceMotion = useReducedMotion();

  if (isLoading) return <Spinner />;
  if (!data || data.data.length === 0) {
    return <EmptyState title="No events open for registration right now" description="Check back soon." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {data.data.map((event) => (
        <EventCard key={event._id} event={event} showRegisterButton />
      ))}
    </motion.div>
  );
}
