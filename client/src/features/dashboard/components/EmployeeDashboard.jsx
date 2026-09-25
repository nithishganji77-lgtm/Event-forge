import { Link } from 'react-router-dom';
import { CalendarRange } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader.jsx';
import { DiscoverEventsGrid } from './DiscoverEventsGrid.jsx';
import { MyEventsList } from './MyEventsList.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

export function EmployeeDashboard() {
  const { organizationId, organizationName, organizationSlug } = useActiveOrganization();

  return (
    <div className="space-y-10">
      <DashboardHeader
        subtitle={`Here's what's happening at ${organizationName} today.`}
        actions={
          <Button as={Link} to={ROUTES.orgCalendar(organizationSlug)} variant="outline">
            <CalendarRange className="size-4" aria-hidden="true" />
            View Calendar
          </Button>
        }
      />
      <section aria-labelledby="discover-heading">
        <h2 id="discover-heading" className="mb-4 text-lg font-semibold">
          Open for registration
        </h2>
        <DiscoverEventsGrid organizationId={organizationId} />
      </section>
      <section aria-labelledby="my-events-heading">
        <h2 id="my-events-heading" className="mb-4 text-lg font-semibold">
          My events
        </h2>
        <MyEventsList organizationId={organizationId} />
      </section>
    </div>
  );
}
