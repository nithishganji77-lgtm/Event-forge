import { useActiveOrganization } from '../../hooks/useActiveOrganization.js';
import { ManagerDashboard } from '../../features/dashboard/components/ManagerDashboard.jsx';
import { EmployeeDashboard } from '../../features/dashboard/components/EmployeeDashboard.jsx';
import { ROLES } from '../../utils/permissions.js';

// Two dashboards, split by whether the person runs events or attends them. Each renders its own
// header (the actions differ).
export function DashboardPage() {
  const { role } = useActiveOrganization();
  const runsEvents = role === ROLES.SUPER_ADMIN || role === ROLES.ORG_ADMIN || role === ROLES.ORGANIZER;
  return runsEvents ? <ManagerDashboard /> : <EmployeeDashboard />;
}
