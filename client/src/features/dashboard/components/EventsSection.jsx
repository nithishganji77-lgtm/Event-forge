import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, CheckCheck, FileEdit, Plus } from 'lucide-react';
import { useEvents } from '../../events/hooks/useEvents.js';
import { EventCard } from '../../events/components/EventCard.jsx';
import { Tabs, tabId, panelId } from '../../../components/ui/Tabs.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { PERMISSIONS } from '../../../utils/permissions.js';
import { ROUTES } from '../../../utils/constants.js';
import { extractErrorMessage } from '../../../lib/axios.js';

const TAB_ID = 'dashboard-events';

// `status` is the same filter value the Events page understands, so "View all" lands on the full
// list already filtered the same way. Completed reads newest-first, the others soonest-first.
const TABS = [
  {
    key: 'upcoming',
    label: 'UPCOMING',
    status: 'UPCOMING',
    sort: 'startsAt_asc',
    icon: CalendarClock,
    emptyTitle: 'Nothing scheduled yet',
    emptyDescription: 'Publish a draft or create a new event and it will show up here.',
  },
  {
    key: 'drafts',
    label: 'DRAFTS',
    status: 'DRAFT',
    sort: 'startsAt_asc',
    icon: FileEdit,
    emptyTitle: 'No drafts waiting',
    emptyDescription: "Events you're still working on are kept here until you publish them.",
  },
  {
    key: 'completed',
    label: 'COMPLETED',
    status: 'COMPLETED',
    sort: 'startsAt_desc',
    icon: CheckCheck,
    emptyTitle: 'No completed events yet',
    emptyDescription: 'Once an event has run, it lands here with its final numbers.',
  },
];

// The dashboard's main column. The active tab lives in the URL (?tab=drafts) so the greeting's
// "you have 2 drafts" style links, and a reload, land on the right one.
export function EventsSection({ organizationId, organizer }) {
  const { organizationSlug, permissions } = useActiveOrganization();
  const [searchParams, setSearchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();

  const requested = searchParams.get('tab');
  const active = TABS.find((tab) => tab.key === requested) ?? TABS[0];

  function setTab(key) {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        if (key === TABS[0].key) next.delete('tab');
        else next.set('tab', key);
        return next;
      },
      { replace: true }
    );
  }

  // 4 = a 2x2 grid in the main column: enough to read at a glance, and "View all" is one click away.
  const { data, isLoading, isError, error, isPlaceholderData } = useEvents(organizationId, {
    status: active.status,
    sort: active.sort,
    limit: 4,
    organizer,
  });
  const events = data?.data ?? [];

  const canCreate = permissions.has(PERMISSIONS.EVENT_CREATE);
  const EmptyIcon = active.icon;

  return (
    <section aria-labelledby="events-heading">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="events-heading" className="text-lg font-semibold">
          Events
        </h2>
        {events.length > 0 && (
          <Link
            to={`${ROUTES.orgEvents(organizationSlug)}?status=${active.status}`}
            className="text-sm text-(--color-text)/60 underline-offset-4 hover:text-(--color-text) hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
          >
            View all
          </Link>
        )}
      </div>

      <Tabs id={TAB_ID} tabs={TABS} active={active.key} onChange={setTab} />

      <div id={panelId(TAB_ID, active.key)} role="tabpanel" aria-labelledby={tabId(TAB_ID, active.key)}>
        {isError && <Alert tone="error">{extractErrorMessage(error, 'Could not load events')}</Alert>}
        {isLoading && <Spinner />}

        {data && events.length === 0 && (
          <EmptyState
            icon={EmptyIcon}
            title={active.emptyTitle}
            description={active.emptyDescription}
            action={
              canCreate && active.key !== 'completed' ? (
                <Button as={Link} to={ROUTES.orgEventNew(organizationSlug)} variant="accent">
                  <Plus className="size-4" aria-hidden="true" />
                  Create Event
                </Button>
              ) : undefined
            }
          />
        )}

        {events.length > 0 && (
          <motion.div
            key={active.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            // Old tab's cards stay up while the new tab loads (keepPreviousData) — dim them so they
            // aren't read as this tab's events.
            aria-busy={isPlaceholderData}
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}
          >
            {events.map((event) => (
              <EventCard key={event._id} event={event} showActions />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
