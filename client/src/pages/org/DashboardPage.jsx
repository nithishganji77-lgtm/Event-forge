import { useActiveOrganization } from '../../hooks/useActiveOrganization.js';
import { MemberRoleBadge } from '../../features/members/components/MemberRoleBadge.jsx';
import { AdminDashboard } from '../../features/dashboard/components/AdminDashboard.jsx';
import { OrganizerDashboard } from '../../features/dashboard/components/OrganizerDashboard.jsx';
import { EmployeeDashboard } from '../../features/dashboard/components/EmployeeDashboard.jsx';
import { ROLES } from '../../utils/permissions.js';

export function DashboardPage() {
  const { organizationId, organizationName, role } = useActiveOrganization();

  function renderBody() {
    if (role === ROLES.SUPER_ADMIN || role === ROLES.ORG_ADMIN) {
      return <AdminDashboard organizationId={organizationId} />;
    }
    if (role === ROLES.ORGANIZER) {
      return <OrganizerDashboard />;
    }
    return <EmployeeDashboard organizationId={organizationId} />;
  }

  return (
    <div>
      <p className="text-meta text-(--color-text)/50 mb-2">GOOD MORNING</p>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-semibold">{organizationName}</h1>
        {role && <MemberRoleBadge role={role} />}
      </div>
      {renderBody()}
    </div>
  );
}
