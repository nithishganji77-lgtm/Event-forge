import { DiscoverEventsGrid } from './DiscoverEventsGrid.jsx';
import { MyEventsList } from './MyEventsList.jsx';

export function EmployeeDashboard({ organizationId }) {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold mb-4">Discover Events</h2>
        <DiscoverEventsGrid organizationId={organizationId} />
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-4">My Events</h2>
        <MyEventsList organizationId={organizationId} />
      </div>
    </div>
  );
}
