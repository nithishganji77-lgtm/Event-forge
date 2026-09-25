import { useEventAnalytics } from '../hooks/useEventAnalytics.js';
import { RegistrationTimelineChart } from './RegistrationTimelineChart.jsx';
import { StatTile, formatRate } from '../../../components/ui/StatTile.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';

export function EventAnalyticsPanel({ eventId }) {
  const { data, isLoading } = useEventAnalytics(eventId);

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <RegistrationTimelineChart timeline={data.registrationTimeline} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile compact label="Registered" value={data.registeredCount} />
        <StatTile compact label="Waitlisted" value={data.waitlistedCount} />
        <StatTile compact label="Capacity Utilization" value={formatRate(data.capacityUtilization)} />
        <StatTile compact label="Cancellation Rate" value={formatRate(data.cancellationRate)} />
        <StatTile
          compact
          label="Attendance Rate"
          value={formatRate(data.attendanceRate)}
          hint={data.attendanceRate === null || data.attendanceRate === undefined ? 'Not enough data yet' : undefined}
        />
      </div>
    </div>
  );
}
