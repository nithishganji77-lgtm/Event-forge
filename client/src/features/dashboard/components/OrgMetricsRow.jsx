import { StatTile, formatRate } from '../../../components/ui/StatTile.jsx';
import { useOrgDashboardMetrics } from '../hooks/useOrgDashboardMetrics.js';
import { Spinner } from '../../../components/ui/Spinner.jsx';

export function OrgMetricsRow({ organizationId }) {
  const { isLoading, totalMembers, upcomingEventsCount, totalRegistrations, attendanceRate } =
    useOrgDashboardMetrics(organizationId);

  if (isLoading) return <Spinner />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
      <StatTile label="Total Members" value={totalMembers ?? '—'} />
      <StatTile label="Upcoming Events" value={upcomingEventsCount ?? '—'} />
      <StatTile label="Registrations" value={totalRegistrations ?? '—'} />
      <StatTile label="Attendance Rate" value={formatRate(attendanceRate)} />
    </div>
  );
}
