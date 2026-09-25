import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange } from 'lucide-react';
import { useEvents } from '../../events/hooks/useEvents.js';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { formatEventDay, formatTimeOfDay } from '../../events/utils/eventTime.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { useNow } from '../../../hooks/useNow.js';
import { ROUTES } from '../../../utils/constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 7;

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

// An event's day is the calendar date its organizer picked, stored at UTC midnight (see
// features/events/utils/eventTime.js). "Today" is therefore the viewer's local calendar date
// re-expressed as a UTC midnight, so the two compare like for like.
function localTodayAsUtcMidnight(nowMs) {
  const now = new Date(nowMs);
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

// "Today" and "Tomorrow" get the date beside them; any other day's heading already is the date.
function dayHeading(dayKey, todayMs) {
  if (dayKey === isoDay(todayMs)) return { label: 'Today', date: formatEventDay(dayKey) };
  if (dayKey === isoDay(todayMs + DAY_MS)) return { label: 'Tomorrow', date: formatEventDay(dayKey) };
  return { label: formatEventDay(dayKey, { weekday: true }), date: null };
}

// The next seven days, grouped by day. Events that have already started are not "upcoming" (they
// show in Live now), so a today-evening event appears here until it begins.
export function UpcomingSchedule({ organizationId, organizer }) {
  const { organizationSlug } = useActiveOrganization();
  const now = useNow();
  const todayMs = localTodayAsUtcMidnight(now);

  // Stable across the minute ticks: the request only changes when the local date does.
  const range = useMemo(
    () => ({ dateFrom: new Date(todayMs).toISOString(), dateTo: new Date(todayMs + (WINDOW_DAYS - 1) * DAY_MS).toISOString() }),
    [todayMs]
  );
  const { data, isLoading } = useEvents(organizationId, {
    status: 'UPCOMING',
    sort: 'startsAt_asc',
    limit: 20,
    organizer,
    ...range,
  });

  const groups = [];
  for (const event of data?.data ?? []) {
    const dayKey = isoDay(new Date(event.startDate).getTime());
    const last = groups[groups.length - 1];
    if (last?.dayKey === dayKey) last.events.push(event);
    else groups.push({ dayKey, events: [event] });
  }

  return (
    <section aria-labelledby="schedule-heading">
      <h2 id="schedule-heading" className="text-meta mb-3 text-(--color-text)/50">
        Next 7 days
      </h2>

      {isLoading && <Spinner />}

      {data && groups.length === 0 && (
        <EmptyState compact icon={CalendarRange} title="A clear week" description="Nothing starts in the next 7 days." />
      )}

      {groups.length > 0 && (
        <div className="rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-4">
          <div className="space-y-4">
            {groups.map((group) => {
              const heading = dayHeading(group.dayKey, todayMs);
              return (
              <div key={group.dayKey}>
                <p className="mb-1.5 text-sm font-medium">
                  {heading.label}
                  {heading.date && <span className="ml-2 font-normal text-(--color-text)/50">{heading.date}</span>}
                </p>
                <ul className="space-y-1">
                  {group.events.map((event) => (
                    <li key={event._id}>
                      <Link
                        to={ROUTES.orgEventDetail(organizationSlug, event._id)}
                        className="flex items-baseline gap-3 rounded-(--ef-radius-sm) px-2 py-1.5 -mx-2 text-sm hover:bg-(--color-bg-secondary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--color-accent)"
                      >
                        <span className="w-[4.75rem] shrink-0 whitespace-nowrap tabular-nums text-(--color-text)/50">
                          {formatTimeOfDay(event.startTime) || 'All day'}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{event.title}</span>
                          {event.venue?.name && (
                            <span className="block truncate text-(--color-text)/50">{event.venue.name}</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              );
            })}
          </div>
          <Link
            to={ROUTES.orgCalendar(organizationSlug)}
            className="mt-4 inline-block text-sm text-(--color-text)/60 underline-offset-4 hover:text-(--color-text) hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
          >
            Open calendar
          </Link>
        </div>
      )}
    </section>
  );
}
