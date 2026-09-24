import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Trash2 } from 'lucide-react';
import { useEvent } from '../../../features/events/hooks/useEvent.js';
import { EventStatusBadge } from '../../../features/events/components/EventStatusBadge.jsx';
import { RegisterButton } from '../../../features/events/components/RegisterButton.jsx';
import { AttendeesList } from '../../../features/events/components/AttendeesList.jsx';
import { EventAnalyticsPanel } from '../../../features/analytics/components/EventAnalyticsPanel.jsx';
import { CancelEventDialog } from '../../../features/events/components/CancelEventDialog.jsx';
import { DeleteEventDialog } from '../../../features/events/components/DeleteEventDialog.jsx';
import { DuplicateEventDialog } from '../../../features/events/components/DuplicateEventDialog.jsx';
import { usePublishEvent } from '../../../features/events/hooks/useEventMutations.js';
import { Button } from '../../../components/ui/Button.jsx';
import { Tabs, tabId, panelId } from '../../../components/ui/Tabs.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { useEventPermissions } from '../../../hooks/useEventPermissions.js';
import { ROUTES } from '../../../utils/constants.js';
import { extractErrorMessage } from '../../../lib/axios.js';
import { formatEventWhen } from '../../../features/events/utils/eventTime.js';

export function EventDetailPage() {
  const { eventId } = useParams();
  const { organizationId, organizationSlug } = useActiveOrganization();
  const { data: event, isLoading, isError, error } = useEvent(eventId);
  const perms = useEventPermissions(event);
  const publishEvent = usePublishEvent(organizationId, eventId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  if (isLoading) return <Spinner />;
  if (isError) return <Alert tone="error">{extractErrorMessage(error, 'Could not load event')}</Alert>;

  const { canManage, canPublish, canDelete, canViewAttendees, canViewAnalytics, canDuplicate, canCancel } = perms;

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

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-2">
        <p className="text-meta text-(--color-text)/50">EVENT</p>
        <EventStatusBadge event={event} />
      </div>
      <h1 className="text-3xl font-semibold leading-tight mb-4">{event.title}</h1>

      <div className="flex flex-wrap gap-5 text-sm text-(--color-text)/60 mb-6">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-4" aria-hidden="true" />
          {formatEventWhen(event, { weekday: true, year: true })}
        </span>
        {event.venue?.name && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden="true" />
            {event.venue.name}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Users className="size-4" aria-hidden="true" />
          {event.registeredCount} / {event.capacity} registered
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8 pb-8 border-b border-(--color-border)">
        <RegisterButton event={event} />
        {canManage && (
          <Button as={Link} to={ROUTES.orgEventEdit(organizationSlug, event._id)} variant="outline" size="sm">
            Edit
          </Button>
        )}
        {canPublish && (
          <Button variant="outline" size="sm" loading={publishEvent.isPending} onClick={() => publishEvent.mutate()}>
            Publish
          </Button>
        )}
        {canDuplicate && (
          <Button variant="outline" size="sm" onClick={() => setDuplicateOpen(true)}>
            Duplicate
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
            Cancel
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" size="sm" aria-label="Delete event" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <Tabs id="event-detail" tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'about' && (
        <div id={panelId('event-detail', 'about')} role="tabpanel" aria-labelledby={tabId('event-detail', 'about')} className="space-y-4">
          <p className="text-meta text-(--color-text)/50">{event.category}</p>
          <p className="text-(--color-text)/80 whitespace-pre-line">{event.description || 'No description provided.'}</p>
        </div>
      )}

      {tab === 'venue' && (
        <div id={panelId('event-detail', 'venue')} role="tabpanel" aria-labelledby={tabId('event-detail', 'venue')} className="space-y-2 text-sm">
          <p>{event.venue?.name || 'No venue specified.'}</p>
          {event.venue?.address && <p className="text-(--color-text)/60">{event.venue.address}</p>}
          {event.venue?.room && <p className="text-(--color-text)/60">Room: {event.venue.room}</p>}
          {event.venue?.mapUrl && (
            <a href={event.venue.mapUrl} target="_blank" rel="noreferrer" className="text-(--color-accent) underline">
              View on map →
            </a>
          )}
        </div>
      )}

      {tab === 'organizers' && (
        <div id={panelId('event-detail', 'organizers')} role="tabpanel" aria-labelledby={tabId('event-detail', 'organizers')} className="text-sm text-(--color-text)/70">
          {event.organizers?.length ? `${event.organizers.length} organizer(s) assigned.` : 'No organizers assigned yet.'}
        </div>
      )}

      {tab === 'attendees' && canViewAttendees && (
        <div id={panelId('event-detail', 'attendees')} role="tabpanel" aria-labelledby={tabId('event-detail', 'attendees')}>
          <AttendeesList eventId={event._id} canManage={canManage} />
        </div>
      )}

      {tab === 'analytics' && canViewAnalytics && (
        <div id={panelId('event-detail', 'analytics')} role="tabpanel" aria-labelledby={tabId('event-detail', 'analytics')}>
          <EventAnalyticsPanel eventId={event._id} />
        </div>
      )}

      {cancelOpen && (
        <CancelEventDialog orgId={event.organization} event={event} open={cancelOpen} onClose={() => setCancelOpen(false)} />
      )}
      {deleteOpen && (
        <DeleteEventDialog orgId={event.organization} event={event} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      )}
      {duplicateOpen && (
        <DuplicateEventDialog orgId={event.organization} event={event} open={duplicateOpen} onClose={() => setDuplicateOpen(false)} />
      )}
    </div>
  );
}
