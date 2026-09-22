import { useActiveOrganization } from '../../hooks/useActiveOrganization.js';
import { RequirePermission } from '../../components/RequirePermission.jsx';
import { MembersTable } from '../../features/members/components/MembersTable.jsx';
import { InviteMemberForm } from '../../features/invites/components/InviteMemberForm.jsx';
import { InvitesTable } from '../../features/invites/components/InvitesTable.jsx';
import { PERMISSIONS } from '../../utils/permissions.js';

export function MembersPage() {
  const { organizationId } = useActiveOrganization();

  return (
    <div className="space-y-12 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold mb-6">Members</h1>
        <RequirePermission permission={PERMISSIONS.MEMBER_CREATE}>
          <div className="mb-8">
            <InviteMemberForm orgId={organizationId} />
          </div>
        </RequirePermission>
        <MembersTable />
      </div>

      <RequirePermission permission={PERMISSIONS.MEMBER_READ}>
        <div>
          <h2 className="text-lg font-semibold mb-4">Pending invites</h2>
          <InvitesTable orgId={organizationId} />
        </div>
      </RequirePermission>
    </div>
  );
}
