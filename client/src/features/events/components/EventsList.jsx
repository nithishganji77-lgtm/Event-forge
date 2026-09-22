import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEvents } from '../hooks/useEvents.js';
import { EventCard } from './EventCard.jsx';
import { EventsFilterBar } from './EventsFilterBar.jsx';
import { Pagination } from '../../../components/ui/Pagination.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import { extractErrorMessage } from '../../../lib/axios.js';

export function EventsList({ organizationId, emptyAction }) {
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const search = useDebouncedValue(searchInput);
  const filters = { page, limit: 20, search: search || undefined, category: category || undefined, status: status || undefined };

  const { data, isLoading, isError, error } = useEvents(organizationId, filters);
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-4">
      <EventsFilterBar
        search={searchInput}
        onSearchChange={(v) => { setSearchInput(v); setPage(1); }}
        category={category}
        onCategoryChange={(v) => { setCategory(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
      />

      {isError && <Alert tone="error">{extractErrorMessage(error, 'Could not load events')}</Alert>}
      {isLoading && <Spinner />}

      {data && data.data.length === 0 && (
        <EmptyState
          title="No events yet."
          description="Your organization's next event starts with one decision."
          action={emptyAction}
        />
      )}

      {data && data.data.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {data.data.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </motion.div>
      )}

      {data && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
