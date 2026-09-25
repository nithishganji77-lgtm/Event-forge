import { Link } from 'react-router-dom';
import { CalendarRange, Plus } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader.jsx';
import { DashboardKpiRow } from './DashboardKpiRow.jsx';
import { EventsSection } from './EventsSection.jsx';
import { LiveNow } from './LiveNow.jsx';
import { UpcomingSchedule } from './UpcomingSchedule.jsx';
import { QuickActions } from './QuickActions.jsx';
import { RecentActivityFeed } from './RecentActivityFeed.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { PERMISSIONS, ROLES } from '../../../utils/permissions.js';
import { ROUTES } from '../../../utils/constants.js';

// One dashboard for everyone who runs events: admins see the whole organization, an organizer sees
// the same layout scoped to events they created or organize (the summary endpoint scopes its
// numbers server-side; the event lists are scoped here with the `organizer` filter). What differs
// by permission is only the recent-activity feed and which quick actions appear.
//
// Mobile order falls out of the DOM order: header, KPIs, events, then the rail (schedule, quick
// actions, activity).
export function ManagerDashboard() {
  const { user } = useAuth();
  const { organizationId, organizationName, organizationSlug, role, permissions } = useActiveOrganization();
  const isAdmin = role === ROLES.SUPER_ADMIN || role === ROLES.ORG_ADMIN;
  const organizer = isAdmin ? undefined : user?.id;

  return (
    <div>
      <DashboardHeader
        subtitle={`Here's what's happening at ${organizationName} today.`}
        actions={
          <>
            {permissions.has(PERMISSIONS.EVENT_CREATE) && (
              <Button as={Link} to={ROUTES.orgEventNew(organizationSlug)} variant="accent">
                <Plus className="size-4" aria-hidden="true" />
                Create Event
              </Button>
            )}
            <Button as={Link} to={ROUTES.orgCalendar(organizationSlug)} variant="outline">
              <CalendarRange className="size-4" aria-hidden="true" />
              View Calendar
            </Button>
          </>
        }
      />

      <DashboardKpiRow organizationId={organizationId} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <LiveNow organizationId={organizationId} organizer={organizer} />
          <EventsSection organizationId={organizationId} organizer={organizer} />
        </div>
        <div className="space-y-8">
          <UpcomingSchedule organizationId={organizationId} organizer={organizer} />
          <QuickActions organizationId={organizationId} />
          {permissions.has(PERMISSIONS.AUDIT_READ) && <RecentActivityFeed organizationId={organizationId} />}
        </div>
      </div>
    </div>
  );
}
