import { StatTile, formatRate } from '../../../components/ui/StatTile.jsx';

export function OrgAnalyticsGrid({ analytics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatTile label="Total Events" value={analytics.totalEvents} />
      <StatTile label="Registrations" value={analytics.totalRegistrations} />
      <StatTile label="Attendance Rate" value={formatRate(analytics.attendanceRate)} />
      <StatTile label="Cancellation Rate" value={formatRate(analytics.cancellationRate)} />
    </div>
  );
}
