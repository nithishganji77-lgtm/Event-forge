import { OrgMetricsRow } from './OrgMetricsRow.jsx';
import { UpcomingEventsTable } from './UpcomingEventsTable.jsx';
import { RecentActivityFeed } from './RecentActivityFeed.jsx';

export function AdminDashboard({ organizationId }) {
  return (
    <div>
      <OrgMetricsRow organizationId={organizationId} />

      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
        <UpcomingEventsTable organizationId={organizationId} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <RecentActivityFeed organizationId={organizationId} />
      </div>
    </div>
  );
}
