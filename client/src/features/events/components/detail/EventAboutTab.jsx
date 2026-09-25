import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Tag, Ticket, Users } from 'lucide-react';
import { Panel } from './Panel.jsx';
import { formatTimeRange, registrationSummary } from '../../utils/eventDetails.js';
import { formatEventDates } from '../../utils/eventTime.js';
import { useActiveOrganization } from '../../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../../utils/constants.js';

function DetailRow({ icon: Icon, label, children, note }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-(--ef-radius-sm) bg-(--color-bg-secondary)">
        <Icon className="size-4 text-(--color-text)/60" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-(--color-text)/50">{label}</dt>
        <dd className="text-sm font-medium">{children}</dd>
        {note && <dd className="text-xs text-(--color-text)/50">{note}</dd>}
      </div>
    </div>
  );
}

// Two columns: what the event is, and its facts at a glance.
export function EventAboutTab({ event, canManage }) {
  const { organizationSlug } = useActiveOrganization();
  const registration = registrationSummary(event);
  const venue = event.venue ?? {};

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Panel title="About this event">
        {event.description ? (
          <p className="whitespace-pre-line leading-relaxed text-(--color-text)/80">{event.description}</p>
        ) : (
          <p className="text-(--color-text)/50">
            No description yet.{' '}
            {canManage && (
              <Link to={ROUTES.orgEventEdit(organizationSlug, event._id)} className="underline underline-offset-4 hover:text-(--color-text)">
                Add one
              </Link>
            )}
          </p>
        )}
      </Panel>

      <Panel title="Event details">
        <dl className="space-y-4">
          <DetailRow icon={CalendarDays} label="Date">
            {formatEventDates(event, { weekday: true, year: true })}
          </DetailRow>
          <DetailRow icon={Clock} label="Time" note={event.startTime ? event.timezone : undefined}>
            {formatTimeRange(event)}
          </DetailRow>
          <DetailRow icon={MapPin} label="Venue" note={venue.address || undefined}>
            {venue.name || 'Not set'}
          </DetailRow>
          <DetailRow icon={Users} label="Capacity">
            {event.capacity} attendees
          </DetailRow>
          <DetailRow icon={Tag} label="Category">
            {event.category}
          </DetailRow>
          <DetailRow icon={Ticket} label="Registration" note={registration.detail}>
            {registration.label}
          </DetailRow>
        </dl>
      </Panel>
    </div>
  );
}
