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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Registered" value={data.registeredCount} />
        <StatTile label="Waitlisted" value={data.waitlistedCount} />
        <StatTile label="Capacity Utilization" value={formatRate(data.capacityUtilization)} />
        <StatTile label="Cancellation Rate" value={formatRate(data.cancellationRate)} />
      </div>
      <StatTile label="Attendance Rate" value={formatRate(data.attendanceRate)} />
      <RegistrationTimelineChart timeline={data.registrationTimeline} />
    </div>
  );
}
