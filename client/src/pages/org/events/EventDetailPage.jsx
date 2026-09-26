import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useEvent } from '../../../features/events/hooks/useEvent.js';
import { usePublishEvent } from '../../../features/events/hooks/useEventMutations.js';
import { EventHero } from '../../../features/events/components/detail/EventHero.jsx';
import { EventActions } from '../../../features/events/components/detail/EventActions.jsx';
import { EventStatsRow } from '../../../features/events/components/detail/EventStatsRow.jsx';
import { EventAboutTab } from '../../../features/events/components/detail/EventAboutTab.jsx';
import { EventVenueTab } from '../../../features/events/components/detail/EventVenueTab.jsx';
import { EventOrganizersTab } from '../../../features/events/components/detail/EventOrganizersTab.jsx';
import { AttendeesList } from '../../../features/events/components/AttendeesList.jsx';
import { EventAnalyticsPanel } from '../../../features/analytics/components/EventAnalyticsPanel.jsx';
import { Tabs, tabId, panelId } from '../../../components/ui/Tabs.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { QueryError } from '../../../components/ui/QueryError.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { useEventPermissions } from '../../../hooks/useEventPermissions.js';
import { ROUTES } from '../../../utils/constants.js';

const TAB_ID = 'event-detail';

// A workspace for one event: hero, actions, three numbers, then tabs. The rhythm is deliberate
// (one large image, one row of actions, one row of stats, one tab bar) rather than a page of
// boxes.
export function EventDetailPage() {
  const { eventId } = useParams();
  const { organizationId, organizationSlug } = useActiveOrganization();
  const { data: event, isLoading, isError, error, refetch, isFetching } = useEvent(eventId);
  const perms = useEventPermissions(event);
  const publishEvent = usePublishEvent(organizationId, eventId);
  const [searchParams, setSearchParams] = useSearchParams();

  if (isLoading) return <Spinner />;
  if (isError) {
    return (
      <QueryError
        error={error}
        title="We couldn't open this event"
        onRetry={refetch}
        isRetrying={isFetching}
        backTo={{ to: ROUTES.orgEvents(organizationSlug), label: 'Back to events' }}
      />
    );
  }

  const { canManage, canViewAttendees, canViewAnalytics } = perms;

  const tabs = [
    { key: 'about', label: 'ABOUT' },
    { key: 'venue', label: 'VENUE' },
    { key: 'organizers', label: 'ORGANIZERS' },
    ...(canViewAttendees ? [{ key: 'attendees', label: 'ATTENDEES' }] : []),
    ...(canViewAnalytics ? [{ key: 'analytics', label: 'ANALYTICS' }] : []),
  ];

  // The active tab lives in the URL (?tab=attendees) so a card menu / dashboard link can land on it
  // and a reload keeps it. A tab the caller can't see (or a typo) falls back to About.
  const requestedTab = searchParams.get('tab');
  const tab = tabs.some((t) => t.key === requestedTab) ? requestedTab : 'about';
  function setTab(key) {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        if (key === 'about') next.delete('tab');
        else next.set('tab', key);
        return next;
      },
      { replace: true }
    );
  }

  const panelProps = (key) => ({ id: panelId(TAB_ID, key), role: 'tabpanel', 'aria-labelledby': tabId(TAB_ID, key) });

  return (
    <div className="max-w-[1200px] space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm text-(--color-text)/60">
          <li>
            <Link to={ROUTES.orgEvents(organizationSlug)} className="hover:text-(--color-text) hover:underline">
              Events
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="truncate text-(--color-text)">
            {event.title}
          </li>
        </ol>
      </nav>

      <EventHero event={event} />
      <EventActions event={event} perms={perms} onPublish={() => publishEvent.mutate()} publishing={publishEvent.isPending} />
      <EventStatsRow event={event} />

      <div>
        <Tabs id={TAB_ID} tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'about' && (
          <div {...panelProps('about')}>
            <EventAboutTab event={event} canManage={canManage} />
          </div>
        )}
        {tab === 'venue' && (
          <div {...panelProps('venue')}>
            <EventVenueTab event={event} canManage={canManage} />
          </div>
        )}
        {tab === 'organizers' && (
          <div {...panelProps('organizers')}>
            <EventOrganizersTab people={event.people} />
          </div>
        )}
        {tab === 'attendees' && canViewAttendees && (
          <div {...panelProps('attendees')}>
            <AttendeesList event={event} canManage={canManage} />
          </div>
        )}
        {tab === 'analytics' && canViewAnalytics && (
          <div {...panelProps('analytics')}>
            <EventAnalyticsPanel eventId={event._id} />
          </div>
        )}
      </div>
    </div>
  );
}
