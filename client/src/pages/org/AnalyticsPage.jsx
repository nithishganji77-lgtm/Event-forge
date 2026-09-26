import { useOrgAnalytics } from '../../features/analytics/hooks/useOrgAnalytics.js';
import { QueryError } from '../../components/ui/QueryError.jsx';
import { OrgAnalyticsGrid } from '../../features/analytics/components/OrgAnalyticsGrid.jsx';
import { RegistrationsChart } from '../../features/analytics/components/RegistrationsChart.jsx';
import { MostPopularEventsList } from '../../features/analytics/components/MostPopularEventsList.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { useActiveOrganization } from '../../hooks/useActiveOrganization.js';

// Trusts its gate rather than re-implementing role scoping client-side (matches AttendeesList's
// existing pattern) — ORGANIZER sees this page too since they hold scoped ANALYTICS_READ, and the
// API response already only reflects their own events.
export function AnalyticsPage() {
  const { organizationId } = useActiveOrganization();
  const { data, isLoading, isError, error, refetch, isFetching } = useOrgAnalytics(organizationId);

  if (isLoading) return <Spinner />;
  if (isError) return <QueryError error={error} title="We couldn't load analytics" onRetry={refetch} isRetrying={isFetching} />;

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <OrgAnalyticsGrid analytics={data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegistrationsChart mostPopularEvents={data.mostPopularEvents} />
        <div>
          <p className="text-meta text-(--color-text)/50 mb-4">Ranked</p>
          <MostPopularEventsList mostPopularEvents={data.mostPopularEvents} />
        </div>
      </div>
    </div>
  );
}
