import { useState } from 'react';
import { QueryError } from '../../../components/ui/QueryError.jsx';
import { useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useEvents } from '../hooks/useEvents.js';
import { EventCard } from './EventCard.jsx';
import { EventsFilterBar, STATUS_OPTIONS } from './EventsFilterBar.jsx';
import { Pagination } from '../../../components/ui/Pagination.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';

export function EventsList({ organizationId, emptyAction }) {
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  // The status filter lives in the URL (?status=UPCOMING) so dashboard links can deep-link into a
  // filtered list. Only a known value is honoured — an unknown one would make the server 400.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStatus = searchParams.get('status') ?? '';
  const status = STATUS_OPTIONS.some(([value]) => value === requestedStatus) ? requestedStatus : '';
  function setStatus(value) {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        if (value) next.set('status', value);
        else next.delete('status');
        return next;
      },
      { replace: true }
    );
  }

  const search = useDebouncedValue(searchInput);
  const filters = { page, limit: 20, search: search || undefined, category: category || undefined, status: status || undefined };

  const { data, isLoading, isError, error, isPlaceholderData, refetch, isFetching } = useEvents(organizationId, filters);
  const hasFilters = Boolean(search || category || status);
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

      {isError && <QueryError error={error} title="We couldn't load the events" onRetry={refetch} isRetrying={isFetching} />}
      {isLoading && <Spinner />}

      {data && data.data.length === 0 && (
        hasFilters ? (
          <EmptyState title="No events match these filters." description="Try a different status, category or search term." />
        ) : (
          <EmptyState
            title="No events yet."
            description="Your organization's next event starts with one decision."
            action={emptyAction}
          />
        )
      )}

      {data && data.data.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          // keepPreviousData keeps the old filter's cards on screen while the new ones load; dim
          // them so they aren't mistaken for the new results.
          aria-busy={isPlaceholderData}
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
        >
          {data.data.map((event) => (
            <EventCard key={event._id} event={event} showActions />
          ))}
        </motion.div>
      )}

      {data && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
