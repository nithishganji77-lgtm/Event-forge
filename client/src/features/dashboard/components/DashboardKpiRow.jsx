import { CalendarClock, CalendarDays, ListChecks, Users } from 'lucide-react';
import { StatTile } from '../../../components/ui/StatTile.jsx';
import { QueryError } from '../../../components/ui/QueryError.jsx';
import { useDashboardSummary } from '../hooks/useDashboardSummary.js';
import { formatDelta, formatPendingHint } from '../utils/dashboardFormat.js';

const GRID = 'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4';

function KpiPlaceholder({ label }) {
  return (
    <div className="rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-4">
      <p className="text-meta mb-2 text-(--color-text)/50">{label}</p>
      <div className="h-8 w-14 animate-pulse rounded-(--ef-radius-sm) bg-(--color-bg-secondary)" />
    </div>
  );
}

// Four numbers, each one an answer to "what needs my attention": what's coming, how many people,
// how busy this month, and what's waiting on me. Every delta is one the server can back with a real
// previous window (formatDelta returns null, and the tile shows a plain fact instead, when it can't).
export function DashboardKpiRow({ organizationId }) {
  const { data: summary, isLoading, isError, error, refetch, isFetching } = useDashboardSummary(organizationId);

  if (isError) {
    return <QueryError error={error} title="We couldn't load your summary" onRetry={refetch} isRetrying={isFetching} />;
  }

  if (isLoading || !summary) {
    return (
      <div className={GRID} aria-busy="true">
        {['Upcoming events', 'Registered attendees', 'Events this month', 'Pending actions'].map((label) => (
          <KpiPlaceholder key={label} label={label} />
        ))}
      </div>
    );
  }

  const signUpTrend = formatDelta(summary.newRegistrationsThisMonth, summary.newRegistrationsLastMonth, {
    noun: 'new sign-ups',
  });
  const eventsTrend = formatDelta(summary.eventsThisMonth, summary.eventsLastMonth);

  return (
    <div className={GRID}>
      <StatTile
        compact
        label="Upcoming events"
        icon={CalendarClock}
        value={summary.upcomingEvents}
        hint={
          summary.startingNext7Days > 0
            ? `${summary.startingNext7Days} in the next 7 days`
            : 'None in the next 7 days'
        }
      />
      <StatTile
        compact
        label="Registered attendees"
        icon={Users}
        value={summary.registeredAttendees}
        trend={signUpTrend ?? undefined}
        hint={
          !signUpTrend && summary.newRegistrationsThisMonth > 0
            ? `${summary.newRegistrationsThisMonth} new this month`
            : undefined
        }
      />
      <StatTile
        compact
        label="Events this month"
        icon={CalendarDays}
        value={summary.eventsThisMonth}
        trend={eventsTrend ?? undefined}
      />
      <StatTile
        compact
        label="Pending actions"
        icon={ListChecks}
        value={summary.pendingActions.total}
        hint={formatPendingHint(summary.pendingActions)}
      />
    </div>
  );
}
